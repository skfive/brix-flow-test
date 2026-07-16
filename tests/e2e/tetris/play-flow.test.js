// tests/e2e/tetris/play-flow.test.js
// BF-838 · /demo/tetris 핵심 플레이 흐름 E2E 회귀 가드 (테스터 소유)
// 보호 대상 (BF-838 수용 기준 AC3):
//   시작 → 플레이 → 게임오버 → 닉네임 저장 → 리더보드(Top 10) 표시 시나리오.
//
// ⚠️ e2e-runner 미사용 사유 (가정 명시 — CLAUDE.md 원칙1):
//   본 작업의 [TECH_STACK_POLICY] 가 stack=typescript-monorepo 로 지정되어
//   "e2e-runner curl 호출 비활성" 이 명시적으로 지정되어 있다. 레포에는
//   실제로 vitest/playwright 도 설치·구성되어 있지 않다(package-lock 확인,
//   pnpm-workspace 없음, node_modules 미설치) — 따라서 실 브라우저 클릭
//   시뮬레이션은 이번 가드의 범위에서 제외하고, 프로덕션 모듈을 실제로
//   구동해 "저장 → 표시" 파이프라인과 UI 마크업 계약을 검증하는 방식으로
//   대체한다. (실 브라우저 인터랙션 검증이 필요해지면 이 파일을 e2e-runner
//   기반으로 교체 — .claude/skills/e2e-runner-ci-guard/SKILL.md 참고.)
//
// 범위 판단 (중복 금지 원칙 적용):
//   - 게임 로직 정확성(충돌/회전/라인클리어/점수/레벨) 은 dev(BF-836) 의
//     src/features/tetris/rules.test.js 가 28건으로 이미 검증 → 여기서는
//     그 결과를 "입력"으로만 사용하고 로직 자체를 재검증하지 않는다.
//   - src/pages/demo/tetris/leaderboard-gateway.js 의 LocalLeaderboardGateway
//     (실제 데모 페이지가 기본으로 쓰는 localStorage 백엔드, game.js:33 확인)
//     는 dev 테스트에서 전혀 다뤄지지 않음 → 이 파일의 핵심 검증 대상.
//   - index.html 의 마크업 id/class, styles.css 의 핵심 토큰은 game.js 가
//     런타임에 querySelector 로 의존하는 계약이므로 silent break 방지용
//     정적 가드로 고정한다.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  createBoard,
  createPiece,
  hardDrop,
  placePiece,
  clearLines,
  calcScore,
  calcLevel,
  isGameOver,
} from '../../../src/features/tetris/rules.js';
import { LocalLeaderboardGateway } from '../../../src/pages/demo/tetris/leaderboard-gateway.js';

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
  const HERE = dirname(fileURLToPath(import.meta.url));
  const PAGE_DIR = join(HERE, '..', '..', '..', 'src', 'pages', 'demo', 'tetris');
  const INDEX_HTML = readFileSync(join(PAGE_DIR, 'index.html'), 'utf8');
  const STYLES_CSS = readFileSync(join(PAGE_DIR, 'styles.css'), 'utf8');
  const GAME_JS = readFileSync(join(PAGE_DIR, 'game.js'), 'utf8');

  /** 브라우저 window.localStorage 최소 폴리필(Node 테스트 환경용, in-memory). */
  class MemoryLocalStorage {
    #map = new Map();
    getItem(key) {
      return this.#map.has(key) ? this.#map.get(key) : null;
    }
    setItem(key, value) {
      this.#map.set(key, String(value));
    }
    removeItem(key) {
      this.#map.delete(key);
    }
  }

  // ── UI 마크업 contract — game.js 가 의존하는 핵심 id/class 가 존재하는지 ──
  describe('AC · index.html 마크업 contract (game.js 의존 id/class)', () => {
    const requiredIds = [
      'btn-start',
      'btn-start-leaderboard',
      'overlay-start',
      'game-board',
      'score-value',
      'best-value',
      'level-value',
      'lines-value',
      'overlay-gameover',
      'go-score',
      'go-level',
      'go-lines',
      'score-submit',
      'nickname-input',
      'nickname-error',
      'btn-submit-score',
      'btn-submit-later',
      'save-status',
      'btn-newgame',
      'btn-open-leaderboard',
      'overlay-leaderboard',
      'lb-body',
      'lb-empty',
      'lb-loading',
      'lb-error',
      'btn-lb-retry',
      'btn-lb-close',
    ];

    for (const id of requiredIds) {
      it(`#${id} 존재`, () => {
        assert.match(INDEX_HTML, new RegExp(`id="${id}"`), `#${id} 마크업이 사라졌습니다`);
      });
    }

    it('게임오버 오버레이는 data-overlay="gameover" 계약을 유지한다', () => {
      assert.match(INDEX_HTML, /data-overlay="gameover"/);
    });

    it('리더보드 오버레이는 data-lb-state 계약을 유지한다(loading/empty/error 렌더 분기)', () => {
      assert.match(INDEX_HTML, /data-lb-state="loading"/);
    });

    it('body 는 data-status/data-submit 상태머신 attribute 를 유지한다', () => {
      assert.match(INDEX_HTML, /<body data-status="start" data-submit="idle">/);
    });
  });

  // ── CSS 토큰 contract — 마크업/게임 렌더가 의존하는 핵심 커스텀 프로퍼티 ──
  describe('AC · styles.css 토큰 contract', () => {
    const requiredTokens = [
      '--color-accent',
      '--color-danger',
      '--board-bg',
      '--cell',
      '--tetro-I',
      '--tetro-O',
      '--tetro-T',
      '--tetro-S',
      '--tetro-Z',
      '--tetro-J',
      '--tetro-L',
    ];
    for (const token of requiredTokens) {
      it(`${token} 토큰 정의`, () => {
        assert.match(STYLES_CSS, new RegExp(`${token}\\s*:`), `${token} 토큰이 사라졌습니다`);
      });
    }
  });

  // ── localStorage 키 계약 — 회귀 시 기존 사용자 데이터가 조용히 유실되는 것을 방지 ──
  describe('AC · game.js localStorage 키 contract', () => {
    it("최고점수 키 'tetris:highScore' 를 그대로 사용한다", () => {
      assert.match(GAME_JS, /tetris:highScore/);
    });
    it("테마 키 'tetris:theme' 를 그대로 사용한다", () => {
      assert.match(GAME_JS, /tetris:theme/);
    });
    it('데모 기본 게이트웨이로 LocalLeaderboardGateway 를 사용한다(백엔드 미기동 데모)', () => {
      assert.match(GAME_JS, /new LocalLeaderboardGateway\(\)/);
    });
  });

  // ── 핵심 플레이 흐름 — 시작 → 플레이 → 게임오버 → 저장 → 리더보드 표시 ──
  describe('AC · 시작→플레이→게임오버→닉네임 저장→리더보드 Top 10 표시', () => {
    /**
     * 결정론적으로 짧은 게임 세션을 진행해 { score, level, lines } 를 만든다.
     * 규칙 함수 자체의 정확성은 dev 가 이미 검증했으므로, 여기서는 "실행 결과"
     * 를 얻기 위한 용도로만 프로덕션 함수를 호출한다(개별 스텝 정확성 재검증 아님).
     */
    function playDeterministicSessionToGameOver() {
      // 시작: 빈 보드 + 마지막 줄을 2칸만 남기고 채워, 한 줄 클리어를 유도.
      let board = createBoard();
      for (let c = 0; c < 8; c += 1) board[19][c] = 'L';

      // 플레이: O 피스를 남은 두 칸(8,9) 열로 옮겨 하드드롭 → 마지막 줄 완성.
      const piece = { ...createPiece('O'), x: 8 };
      const { piece: dropped } = hardDrop(board, piece);
      board = placePiece(board, dropped);
      const { board: clearedBoard, cleared } = clearLines(board);
      board = clearedBoard;

      const totalLines = cleared;
      const level = calcLevel(totalLines);
      const score = calcScore(cleared, level);

      // 게임오버: 다음 스폰 위치를 미리 막아 즉시 게임오버를 트리거.
      const spawn = createPiece('T');
      for (let c = 0; c < board[0].length; c += 1) {
        if (spawn.shape[0][c - spawn.x] || spawn.shape[1][c - spawn.x]) board[0][c] = 'T';
      }
      const gameOver = isGameOver(board, spawn);

      return { score, level, lines: totalLines, gameOver };
    }

    it('시작→플레이 세션이 게임오버로 종료된다', () => {
      const session = playDeterministicSessionToGameOver();
      assert.equal(session.gameOver, true);
      assert.equal(session.lines, 1);
      assert.equal(session.level, 1);
      assert.equal(session.score, 100); // LINE_SCORES[1](100) * level(1)
    });

    it('게임오버 → 닉네임 저장(LocalLeaderboardGateway.submitScore) → localStorage 영속화', async () => {
      globalThis.localStorage = new MemoryLocalStorage();
      try {
        const session = playDeterministicSessionToGameOver();
        const gateway = new LocalLeaderboardGateway();

        const saved = await gateway.submitScore({
          playerName: '정테스트',
          score: session.score,
          level: session.level,
          lines: session.lines,
          durationMs: 12000,
        });

        assert.equal(saved.rank, 1);
        assert.equal(saved.playerName, '정테스트');
        assert.equal(typeof saved.id, 'string');
        assert.equal(typeof saved.createdAt, 'string');

        // "새로고침" 시뮬레이션: 새 게이트웨이 인스턴스로도 동일 localStorage 키에서
        // 그대로 조회되어야 한다(페이지 재진입 시 데이터 유실 방지 회귀 가드).
        const reloadedGateway = new LocalLeaderboardGateway();
        const page = await reloadedGateway.fetchLeaderboard(10, 0);
        assert.equal(page.items.length, 1);
        assert.equal(page.items[0].playerName, '정테스트');
        assert.equal(page.items[0].rank, 1);
      } finally {
        delete globalThis.localStorage;
      }
    });

    it('리더보드 Top 10 표시 — score DESC 정렬로 상위 10건만 노출되고 순위가 매겨진다', async () => {
      globalThis.localStorage = new MemoryLocalStorage();
      try {
        const gateway = new LocalLeaderboardGateway();
        const scores = [300, 900, 100, 700, 500, 1000, 200, 800, 600, 400, 50]; // 11건 제출
        for (const [i, score] of scores.entries()) {
          // eslint-disable-next-line no-await-in-loop
          await gateway.submitScore({
            playerName: `P${i}`,
            score,
            level: 1,
            lines: 0,
            durationMs: null,
          });
        }

        const page = await gateway.fetchLeaderboard(10, 0);
        assert.equal(page.items.length, 10, 'Top 10 만 노출되어야 한다');
        assert.equal(page.total, 11, '전체 건수는 11건이어야 한다');

        const orderedScores = page.items.map((it) => it.score);
        const expectedTop10 = [...scores].sort((a, b) => b - a).slice(0, 10);
        assert.deepEqual(orderedScores, expectedTop10);

        // rank 는 1..10 순차 부여.
        assert.deepEqual(
          page.items.map((it) => it.rank),
          Array.from({ length: 10 }, (_, i) => i + 1),
        );

        // 최하위 점수(50)는 11번째라 Top 10 에서 제외되어야 한다.
        assert.ok(!orderedScores.includes(50));
      } finally {
        delete globalThis.localStorage;
      }
    });
  });
}
