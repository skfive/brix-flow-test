// tests/integration/tetris/scores-api-gateway.test.js
// BF-838 · /demo/tetris 점수 API 통합 회귀 가드 (테스터 소유)
//
// 범위 판단 (중복 금지 원칙 적용):
//   - dev(BF-836) 의 src/routes/api/tetris/handlers.test.ts 가
//     handlePostScore/handleGetLeaderboard 를 "이미 파싱된 JS 객체" 로 직접
//     호출해 성공 201·필드별 400·정렬·500 을 22건으로 촘촘히 검증함
//     → 같은 케이스를 다시 검증하지 않는다.
//   - src/pages/demo/tetris/leaderboard-gateway.js 의 HttpLeaderboardGateway
//     (실 fetch 로 JSON 직렬화/역직렬화 · Content-Type · !res.ok → Error 변환)
//     는 dev 테스트에서 전혀 다뤄지지 않음 → 본 파일은 "클라이언트 게이트웨이
//     ↔ API 핸들러" 의 실 HTTP 왕복(wire contract) 을 검증한다.
//
// 서버 관련 참고:
//   이 저장소에는 아직 프로덕션 HTTP 라우팅(app.ts 등)이 없다 — handlers 는
//   프레임워크 비의존 함수만 export 한다(§ scores.ts/leaderboard.ts 주석).
//   아래 `createTestServer` 는 테스트 전용 최소 라우터로 handlePostScore /
//   handleGetLeaderboard 를 node:http 위에 얹어, HttpLeaderboardGateway 가
//   fetch 로 실제 왕복하는 경로를 그대로 재현한다. 프로덕션 라우팅 코드가
//   아니므로 실제 서버 구현을 대신 검증하지 않는다 — 오직 게이트웨이 계약만.
//
// e2e-runner 미사용 사유: 본 작업 [TECH_STACK_POLICY] 가 typescript-monorepo
// 로 지정되어 e2e-runner curl 호출이 비활성화되어 있다(레포에 vitest/playwright
// 미설치·미구성이라 node:test 기반 실 HTTP round-trip 으로 대체).

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { handlePostScore } from '../../../src/routes/api/tetris/scores.ts';
import { handleGetLeaderboard } from '../../../src/routes/api/tetris/leaderboard.ts';
import { InMemoryTetrisScoreRepository } from '../../../src/routes/api/tetris/repository.ts';
import { HttpLeaderboardGateway } from '../../../src/pages/demo/tetris/leaderboard-gateway.js';

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = 'tetris';
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

if (_scopeSkip) {
  it(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  /** createdAt 을 결정론적으로 증가시키는 저장소(정렬 검증용, dev seededRepo 패턴 준용). */
  function seededRepo() {
    let tick = 0;
    let seq = 0;
    return new InMemoryTetrisScoreRepository({
      now: () => `2026-07-16T00:00:${String(tick++).padStart(2, '0')}.000Z`,
      newId: () => `gw-${String(seq++).padStart(3, '0')}`,
    });
  }

  /**
   * handlePostScore / handleGetLeaderboard 를 얹은 최소 테스트 전용 HTTP 서버.
   * planner 계약 경로(POST /demo/tetris/api/scores, GET /demo/tetris/api/leaderboard)
   * 그대로 라우팅한다.
   */
  function createTestServer(repo) {
    return http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const send = (status, body) => {
        const json = JSON.stringify(body);
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(json);
      };

      if (req.method === 'POST' && url.pathname === '/demo/tetris/api/scores') {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', async () => {
          let parsed;
          try {
            parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          } catch {
            send(400, { error: { code: 'VALIDATION_ERROR', message: '잘못된 JSON' } });
            return;
          }
          const { status, body } = await handlePostScore(parsed, repo);
          send(status, body);
        });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/demo/tetris/api/leaderboard') {
        const query = {
          limit: url.searchParams.get('limit') ?? undefined,
          offset: url.searchParams.get('offset') ?? undefined,
        };
        handleGetLeaderboard(query, repo).then(({ status, body }) => send(status, body));
        return;
      }

      send(404, { error: { code: 'NOT_FOUND', message: 'no route' } });
    });
  }

  /**
   * globalThis.fetch 를 테스트 서버 origin 으로 리졸브하는 얇은 래퍼를 설치한다.
   * HttpLeaderboardGateway 는 상대경로(`/demo/tetris/api/...`)로 fetch 하도록
   * 작성되어 있는데(브라우저 document origin 기준), Node 의 fetch 는 origin 이
   * 없어 상대경로를 그대로 던지면 실패한다. 게이트웨이 코드는 그대로 두고,
   * 이 테스트 파일 안에서만 fetch 를 감싸 절대경로로 바꿔준다 — 게이트웨이가
   * 실제로 호출하는 method/headers/body 는 원본 그대로 전달되므로 왕복 계약은
   * 그대로 검증된다.
   */
  function installFetchBase(origin) {
    const original = globalThis.fetch;
    globalThis.fetch = (input, init) => {
      const resolved = typeof input === 'string' ? new URL(input, origin) : input;
      return original(resolved, init);
    };
    return () => {
      globalThis.fetch = original;
    };
  }

  describe('BF-838 · HttpLeaderboardGateway ↔ /demo/tetris/api 실 HTTP 왕복', () => {
    let server;
    let restoreFetch;
    let gateway;
    let repo;

    before(async () => {
      repo = seededRepo();
      server = createTestServer(repo);
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const { port } = server.address();
      restoreFetch = installFetchBase(`http://127.0.0.1:${port}`);
      gateway = new HttpLeaderboardGateway();
    });

    after(async () => {
      restoreFetch();
      await new Promise((resolve) => server.close(resolve));
    });

    it('성공 — submitScore 가 201 을 SubmitResult 계약대로(id/rank/playerName/score/level/lines/createdAt) 반환한다', async () => {
      const result = await gateway.submitScore({
        playerName: '박기획',
        score: 4500,
        level: 3,
        lines: 24,
        durationMs: 60000,
      });
      assert.equal(typeof result.id, 'string');
      assert.equal(result.rank, 1);
      assert.equal(result.playerName, '박기획');
      assert.equal(result.score, 4500);
      assert.equal(result.level, 3);
      assert.equal(result.lines, 24);
      assert.equal(typeof result.createdAt, 'string');
    });

    it('필드별 검증 오류 — playerName 누락 시 gateway 가 status=400 Error 를 던진다', async () => {
      await assert.rejects(
        () =>
          gateway.submitScore({
            score: 100,
            level: 1,
            lines: 0,
            durationMs: null,
          }),
        (err) => {
          assert.equal(err.status, 400);
          assert.match(err.message, /400/);
          return true;
        },
      );
    });

    it('필드별 검증 오류 — level 이 lines 와 불일치하면 status=400 Error 를 던진다', async () => {
      await assert.rejects(
        () =>
          gateway.submitScore({
            playerName: '검증',
            score: 100,
            level: 5, // lines=0 이면 서버 기대값은 calcLevel(0)=1
            lines: 0,
            durationMs: null,
          }),
        (err) => {
          assert.equal(err.status, 400);
          return true;
        },
      );
    });

    it('정렬 — fetchLeaderboard 가 score DESC, createdAt ASC 순서로 rank 를 매겨 반환한다', async () => {
      await gateway.submitScore({ playerName: 'A', score: 100, level: 1, lines: 0, durationMs: null });
      await gateway.submitScore({ playerName: 'B', score: 900, level: 1, lines: 0, durationMs: null });
      await gateway.submitScore({ playerName: 'C', score: 500, level: 1, lines: 0, durationMs: null });

      const page = await gateway.fetchLeaderboard(10, 0);
      const names = page.items.map((it) => it.playerName);
      // 앞서 제출한 '박기획'(4500) 이 최상위, 이후 B(900) > C(500) > A(100) 순.
      assert.deepEqual(names.slice(0, 4), ['박기획', 'B', 'C', 'A']);
      assert.deepEqual(page.items.slice(0, 4).map((it) => it.rank), [1, 2, 3, 4]);
    });

    it('페이지네이션 — limit/offset 쿼리 파라미터가 실 querystring 으로 전달되어 반영된다', async () => {
      const page = await gateway.fetchLeaderboard(2, 1);
      assert.equal(page.items.length, 2);
      assert.equal(page.limit, 2);
      assert.equal(page.offset, 1);
      // offset=1 부터이므로 1등(박기획)은 제외되고 2위부터 시작한다.
      assert.equal(page.items[0].rank, 2);
    });
  });
}
