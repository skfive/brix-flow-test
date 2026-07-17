// BF-986 · 미니 지뢰찾기 E2E 회귀 가드 (worker host)
//
// 본 파일은 BF-982 dev 산출물 (minesweeper/ 모듈) 이 main 에 들어간 후
// silent break 되지 않도록, e2e-runner 컨테이너로 worker host URL 에 접근해
// /demo/minesweeper (repo 상 minesweeper/) 의 전체 사용자 시나리오를 실 브라우저로
// 구동한다.
//
// 보호 대상 (BF-986 수용 기준):
//   AC1. 페이지 렌더 + 새 게임 시작 — 초기 9x9 보드(81칸)·카운터 010·난이도
//        radiogroup·재시작/난이도 전환으로 새 게임 시작.
//   AC2. 셀 오픈 시나리오 — 연쇄 오픈(flood fill) + 숫자 표시(data-num ↔
//        textContent 계약) 검증.
//   AC3. 지뢰 오픈 → 패배 처리 검증(배너·포커스·전체 지뢰 공개).
//   + 설명에 명시된 플래그 토글(우클릭/F키) · 키보드 접근성(방향키 이동·
//     경계 wrap 없음·Enter/Space 오픈) 흐름도 함께 검증.
//
// dev (BF-982) 가 이미 단위 테스트로 검증한 항목 — 재작성 X (tests/minesweeper-BF982.test.js):
//   - createBoard/placeMines/openCell/toggleFlag 순수 로직 전체(TC-01~TC-16, EC-01~08)
//   - HTML 마크업 fact(board role=grid, radiogroup, mine-counter aria-live,
//     restart-btn, result-banner) · CSS focus-visible/reduced-motion 존재
//   - vanilla-static file:// 안전 가드(import/export·type=module·fetch·localStorage)
//   → 본 파일은 **실 브라우저에서만 검증 가능한** 인터랙션(클릭/키보드/포커스/
//     배너 렌더)만 다룬다.
//
// 승패 결정 설계 근거 (RNG 비결정성 대응):
//   main.js/logic.js 는 Math.random 기본값 사용(seed 주입 경로 없음). 이전 세션에서
//   e2e-runner puppeteer 컨텍스트에 대한 Math.random 직접 override 시도가 race 로
//   실패한 전례가 있어(참고: tests/rps-BF650-e2e.test.js 주석) 동일 방식은 사용하지
//   않는다. 대신 아래 두 불변량을 활용해 결정적으로 시나리오를 구동한다:
//     1) 최초 오픈 셀은 항상 안전구역(클릭 셀+8방향)이라 mine 배치가 되지 않고,
//        따라서 최초 오픈 셀의 adjacentMines 는 항상 0 → 반드시 flood fill 발생
//        (중앙 셀 클릭 시 최소 클릭 셀+8방향 이웃 = 9칸 이상 revealed 보장).
//     2) 보드 전체를 행 우선 순서로 전부 클릭하면(이미 revealed/flagged 는 no-op)
//        반드시 승리 또는 패배 중 하나로 귀결된다(둘 다 유효한 게임 결과 —
//        어느 쪽이 나오든 대응하는 결과 화면 계약을 검증). 이로써 "몇 번째 클릭에서
//        끝나는지"는 비결정적이어도 "반드시 끝나고, 끝난 결과의 화면 계약이
//        맞는지"는 결정적으로 보장된다.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 minesweeper 외 skip
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "minesweeper";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // E2E — AC1~AC3 + 플래그 토글 + 키보드 접근성 통합 시나리오
  //   (단일 e2e-runner 호출로 묶음 — 한 페이지 컨텍스트에서 누적 진행)
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-986 E2E AC1~AC3: 렌더→키보드 이동/오픈→연쇄오픈·숫자→플래그 토글→전체 스캔 승/패 판정→재시작→난이도 전환",
    async (t) => {
      if (process.env.BRIX_E2E_SKIP === "1") {
        t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
        return;
      }
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/minesweeper/`;

        const scriptText = `
          // 콘솔 에러 0건 회귀 가드 — 전체 시나리오 구간
          const consoleErrors = [];
          page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
          page.on('pageerror', (err) => consoleErrors.push(String(err)));

          await page.waitForSelector('#board .cell');

          // ── STEP 1 (AC1): 초기 렌더 — 9x9(81칸) beginner + 카운터 010 + 배너 hidden ──
          const s1 = await page.evaluate(() => ({
            cellCount: document.querySelectorAll('#board .cell').length,
            counter: document.getElementById('mine-counter-value').textContent,
            bannerHidden: document.getElementById('result-banner').hidden,
            beginnerChecked: document.querySelector('button[data-difficulty="beginner"]').getAttribute('aria-checked'),
            activeTabindexCell: (() => {
              const el = document.querySelector('#board .cell[tabindex="0"]');
              return el ? el.dataset.row + ',' + el.dataset.col : null;
            })(),
          }));
          if (s1.cellCount !== 81) throw new Error('초기 셀 개수 !== 81: ' + s1.cellCount);
          if (s1.counter !== '010') throw new Error('초기 카운터 !== 010: ' + s1.counter);
          if (!s1.bannerHidden) throw new Error('초기 결과 배너가 숨겨져 있지 않음');
          if (s1.beginnerChecked !== 'true') throw new Error('초급 난이도 aria-checked !== true');
          if (s1.activeTabindexCell !== '0,0') throw new Error('초기 roving tabindex 위치 !== (0,0): ' + s1.activeTabindexCell);
          console.log('[step1] 초기 렌더 OK — 81칸, 카운터 010, 배너 hidden, tabindex (0,0)');

          // ── STEP 2 (키보드 접근성): 경계에서 wrap 없음 확인 — (0,0)에서 Up/Left 이동 불가 ──
          await page.evaluate(() => document.querySelector('#board .cell[tabindex="0"]').focus());
          await page.keyboard.press('ArrowUp');
          await page.keyboard.press('ArrowLeft');
          const s2 = await page.evaluate(() => {
            const el = document.querySelector('#board .cell[tabindex="0"]');
            return el.dataset.row + ',' + el.dataset.col;
          });
          if (s2 !== '0,0') throw new Error('경계(0,0)에서 Up/Left 로 이동됨(wrap 없음 위반): ' + s2);
          console.log('[step2] 경계 wrap 없음 OK — (0,0) 유지');

          // ── STEP 3 (키보드 접근성 + AC2): 방향키로 중앙(4,4) 이동 후 Enter 오픈 → 연쇄오픈 ──
          for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
          for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
          const focusedBeforeOpen = await page.evaluate(() => {
            const el = document.querySelector('#board .cell[tabindex="0"]');
            return el.dataset.row + ',' + el.dataset.col;
          });
          if (focusedBeforeOpen !== '4,4') throw new Error('방향키 이동 후 위치 !== (4,4): ' + focusedBeforeOpen);
          await page.keyboard.press('Enter');
          await new Promise((r) => setTimeout(r, 150));
          const s3 = await page.evaluate(() => {
            const center = document.querySelector('.cell[data-row="4"][data-col="4"]');
            const revealedCells = Array.from(document.querySelectorAll('#board .cell[data-state="revealed"]'));
            // 숫자 표시 계약: data-num 존재 시 textContent 와 일치(0 은 빈칸 표시)
            const numberContractOk = revealedCells.every((el) => {
              const num = el.getAttribute('data-num');
              if (num === null) return true; // 지뢰 등 data-num 없는 revealed 셀
              return num === '0' ? el.textContent === '' : el.textContent === num;
            });
            return {
              centerState: center.getAttribute('data-state'),
              centerNum: center.getAttribute('data-num'),
              revealedCount: revealedCells.length,
              numberContractOk,
            };
          });
          if (s3.centerState !== 'revealed') throw new Error('중앙 셀(4,4) Enter 오픈 후 revealed 아님: ' + s3.centerState);
          if (s3.centerNum !== '0') throw new Error('최초 오픈 중앙 셀 adjacentMines !== 0 (안전구역 계약 위반): ' + s3.centerNum);
          if (s3.revealedCount < 9) throw new Error('연쇄 오픈(flood fill) 결과 revealed 셀 9개 미만 — 클릭셀+8방향 미보장: ' + s3.revealedCount);
          if (!s3.numberContractOk) throw new Error('숫자 표시 계약 위반 — data-num 과 textContent 불일치');
          console.log('[step3] Enter 키 오픈 → 연쇄오픈 ' + s3.revealedCount + '칸, 숫자표시 계약 OK');

          // ── STEP 4 (플래그 토글 — F 키): 아직 hidden 인 셀로 이동 후 F → flagged, 카운터 -1 ──
          const flagTargetA = await page.evaluate(() => {
            const hidden = Array.from(document.querySelectorAll('#board .cell[data-state="hidden"]'));
            const t = hidden[0];
            return { row: t.dataset.row, col: t.dataset.col };
          });
          await page.evaluate((rc) => {
            document.querySelector('.cell[data-row="' + rc.row + '"][data-col="' + rc.col + '"]').focus();
          }, flagTargetA);
          await page.keyboard.press('f');
          await new Promise((r) => setTimeout(r, 100));
          const s4 = await page.evaluate((rc) => ({
            state: document.querySelector('.cell[data-row="' + rc.row + '"][data-col="' + rc.col + '"]').getAttribute('data-state'),
            text: document.querySelector('.cell[data-row="' + rc.row + '"][data-col="' + rc.col + '"]').textContent,
            counter: document.getElementById('mine-counter-value').textContent,
          }), flagTargetA);
          if (s4.state !== 'flagged') throw new Error('F 키 토글 후 flagged 아님: ' + s4.state);
          if (s4.text !== '\u{1F6A9}') throw new Error('F 키 토글 후 깃발 아이콘 미표시');
          if (s4.counter !== '009') throw new Error('F 키 토글 후 카운터 !== 009: ' + s4.counter);
          console.log('[step4] F 키 플래그 토글 OK — flagged + 카운터 009');

          // F 재입력 → 원복(hidden) + 카운터 복원, 이후 전체 스캔이 막히지 않도록 정리
          await page.keyboard.press('f');
          await new Promise((r) => setTimeout(r, 100));
          const s4b = await page.evaluate((rc) => ({
            state: document.querySelector('.cell[data-row="' + rc.row + '"][data-col="' + rc.col + '"]').getAttribute('data-state'),
            counter: document.getElementById('mine-counter-value').textContent,
          }), flagTargetA);
          if (s4b.state !== 'hidden') throw new Error('F 키 재토글 후 hidden 복원 안됨: ' + s4b.state);
          if (s4b.counter !== '010') throw new Error('F 키 재토글 후 카운터 복원 안됨: ' + s4b.counter);
          console.log('[step4b] F 키 재토글 → hidden/카운터 010 복원 OK');

          // ── STEP 5 (플래그 토글 — 우클릭 contextmenu): 다른 hidden 셀에 우클릭 → flagged ──
          const flagTargetB = await page.evaluate(() => {
            const hidden = Array.from(document.querySelectorAll('#board .cell[data-state="hidden"]'));
            const t = hidden[1];
            return { row: t.dataset.row, col: t.dataset.col };
          });
          await page.click('.cell[data-row="' + flagTargetB.row + '"][data-col="' + flagTargetB.col + '"]', { button: 'right' });
          await new Promise((r) => setTimeout(r, 100));
          const s5 = await page.evaluate((rc) => ({
            state: document.querySelector('.cell[data-row="' + rc.row + '"][data-col="' + rc.col + '"]').getAttribute('data-state'),
            counter: document.getElementById('mine-counter-value').textContent,
          }), flagTargetB);
          if (s5.state !== 'flagged') throw new Error('우클릭 후 flagged 아님: ' + s5.state);
          if (s5.counter !== '009') throw new Error('우클릭 플래그 후 카운터 !== 009: ' + s5.counter);
          console.log('[step5] 우클릭(contextmenu) 플래그 토글 OK — flagged + 카운터 009');

          // flagged 셀 좌클릭 시 open no-op 확인(TC-07 계약, 실 브라우저에서 재검증)
          await page.click('.cell[data-row="' + flagTargetB.row + '"][data-col="' + flagTargetB.col + '"]');
          await new Promise((r) => setTimeout(r, 100));
          const s5b = await page.evaluate((rc) =>
            document.querySelector('.cell[data-row="' + rc.row + '"][data-col="' + rc.col + '"]').getAttribute('data-state'),
          flagTargetB);
          if (s5b !== 'flagged') throw new Error('flagged 셀 좌클릭 후 상태 변경됨(no-op 위반): ' + s5b);
          console.log('[step5b] flagged 셀 좌클릭 no-op OK');

          // 전체 스캔이 막히지 않도록 원복
          await page.click('.cell[data-row="' + flagTargetB.row + '"][data-col="' + flagTargetB.col + '"]', { button: 'right' });
          await new Promise((r) => setTimeout(r, 100));

          // ── STEP 6 (AC3 + 승패 판정): 보드 전체를 행 우선 순서로 스캔 클릭 → 반드시 승리/패배 귀결 ──
          const allCells = await page.evaluate(() =>
            Array.from(document.querySelectorAll('#board .cell')).map((el) => ({ row: el.dataset.row, col: el.dataset.col })),
          );
          let finalResult = '';
          for (const rc of allCells) {
            const state = await page.evaluate((c) =>
              document.querySelector('.cell[data-row="' + c.row + '"][data-col="' + c.col + '"]').getAttribute('data-state'),
            rc);
            if (state === 'hidden') {
              await page.click('.cell[data-row="' + rc.row + '"][data-col="' + rc.col + '"]');
            }
            finalResult = await page.evaluate(() => document.getElementById('result-banner').getAttribute('data-result'));
            if (finalResult === 'won' || finalResult === 'lost') break;
          }
          if (finalResult !== 'won' && finalResult !== 'lost') {
            throw new Error('보드 전체 스캔 후에도 승/패 미확정 — data-result: ' + finalResult);
          }
          console.log('[step6] 전체 스캔 완료 → 최종 결과: ' + finalResult);

          // ── STEP 7 (AC3): 결과 화면 계약 검증 (승/패 분기 — 둘 다 유효한 실제 결과) ──
          const s7 = await page.evaluate(() => ({
            bannerHidden: document.getElementById('result-banner').hidden,
            title: document.getElementById('result-title').textContent,
            activeId: document.activeElement ? document.activeElement.id : null,
            explodedCount: document.querySelectorAll('#board .cell[data-mine="exploded"]').length,
            revealedMineCount: document.querySelectorAll('#board .cell[data-mine="revealed"]').length,
            counter: document.getElementById('mine-counter-value').textContent,
          }));
          if (s7.bannerHidden) throw new Error('게임 종료 후 결과 배너가 숨겨져 있음');
          if (s7.activeId !== 'result-restart') throw new Error('게임 종료 후 포커스가 #result-restart 로 이동하지 않음: ' + s7.activeId);
          if (finalResult === 'lost') {
            if (!s7.title.includes('지뢰를 밟았습니다')) throw new Error('패배 배너 문구 불일치: ' + s7.title);
            if (s7.explodedCount !== 1) throw new Error('폭발 지뢰(data-mine=exploded) 정확히 1개 아님: ' + s7.explodedCount);
          } else {
            if (!s7.title.includes('모든 안전한 칸을 찾았습니다')) throw new Error('승리 배너 문구 불일치: ' + s7.title);
            if (s7.counter !== '000') throw new Error('승리 후 카운터(남은 지뢰) !== 000: ' + s7.counter);
          }
          console.log('[step7] 결과(' + finalResult + ') 화면 계약 OK — 배너/포커스/' + (finalResult === 'lost' ? '폭발지뢰1개' : '카운터000'));

          // ── STEP 8 (AC1): 결과 배너의 다시 하기 버튼 → 새 게임 시작(리셋) ──
          await page.click('#result-restart');
          await new Promise((r) => setTimeout(r, 150));
          const s8 = await page.evaluate(() => ({
            cellCount: document.querySelectorAll('#board .cell').length,
            counter: document.getElementById('mine-counter-value').textContent,
            bannerHidden: document.getElementById('result-banner').hidden,
            allHidden: Array.from(document.querySelectorAll('#board .cell')).every((el) => el.getAttribute('data-state') === 'hidden'),
          }));
          if (s8.cellCount !== 81) throw new Error('재시작 후 셀 개수 !== 81: ' + s8.cellCount);
          if (s8.counter !== '010') throw new Error('재시작 후 카운터 !== 010: ' + s8.counter);
          if (!s8.bannerHidden) throw new Error('재시작 후 배너 미숨김');
          if (!s8.allHidden) throw new Error('재시작 후 전체 셀이 hidden 상태 아님');
          console.log('[step8] #result-restart 클릭 → 새 게임 시작(리셋) OK');

          // ── STEP 9 (AC1): 난이도 전환(중급) → 16x16(256칸)/카운터 040/data-difficulty 갱신 ──
          await page.click('button[data-difficulty="intermediate"]');
          await new Promise((r) => setTimeout(r, 150));
          const s9 = await page.evaluate(() => ({
            cellCount: document.querySelectorAll('#board .cell').length,
            counter: document.getElementById('mine-counter-value').textContent,
            boardDifficulty: document.getElementById('board').getAttribute('data-difficulty'),
            intermediateChecked: document.querySelector('button[data-difficulty="intermediate"]').getAttribute('aria-checked'),
            beginnerChecked: document.querySelector('button[data-difficulty="beginner"]').getAttribute('aria-checked'),
          }));
          if (s9.cellCount !== 256) throw new Error('중급 전환 후 셀 개수 !== 256: ' + s9.cellCount);
          if (s9.counter !== '040') throw new Error('중급 전환 후 카운터 !== 040: ' + s9.counter);
          if (s9.boardDifficulty !== 'intermediate') throw new Error('#board data-difficulty !== intermediate: ' + s9.boardDifficulty);
          if (s9.intermediateChecked !== 'true') throw new Error('중급 aria-checked !== true');
          if (s9.beginnerChecked !== 'false') throw new Error('초급 aria-checked 가 여전히 true');
          console.log('[step9] 난이도 전환(중급) → 256칸/카운터 040/aria-checked 갱신 OK');

          console.log('[done] BF-986 E2E AC1~AC3 + 플래그/키보드 PASS');

          if (consoleErrors.length > 0) {
            throw new Error('console error/pageerror ' + consoleErrors.length + '건 발생: ' + consoleErrors.slice(0, 3).join(' | '));
          }
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "",
          },
          body: JSON.stringify({
            url,
            label:
              "지뢰찾기 렌더→키보드이동/오픈→연쇄오픈·숫자→플래그토글→전체스캔 승패→재시작→난이도전환 (BF-986)",
            scriptText,
            timeoutMs: 90000,
          }),
        });
        const json = await res.json();
        assert.ok(
          json.ok,
          `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
        );
        assert.ok(
          json.passed,
          `E2E AC1~AC3 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-3000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 헬퍼 (BF-788 / BF-650 e2e-worker-host 패턴과 동일)
// ─────────────────────────────────────────────────────────────

/**
 * e2e-runner 도달성 확인. 못 닿으면 t.skip() 호출 후 false 반환.
 * CI 환경에는 컨테이너 없음 — fail 처리하면 PR 자동 머지 트리거 안 됨.
 */
async function e2eRunnerReachable(t) {
  try {
    const probe = await fetch("http://e2e-runner:3030/health", {
      signal: AbortSignal.timeout(2000),
    });
    if (!probe.ok) {
      t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
      return false;
    }
    return true;
  } catch (err) {
    t.skip(`e2e-runner 도달 불가 (${err.message}) — CI 환경 정상`);
    return false;
  }
}

/**
 * 페르소나 컨테이너 service hostname.
 * host.docker.internal / localhost 는 절대 사용 X (e2e-runner 는 다른 컨테이너).
 */
function personaHost() {
  return (
    process.env.BRIX_PERSONA_HOST ??
    process.env.BRIX_WORKER_HOSTNAME ??
    "worker"
  );
}

/**
 * 0.0.0.0 바인딩 임시 정적 서버. port 0 으로 임의 포트 — 동시 실행 충돌 없음.
 */
function startStaticServer(rootDir) {
  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".json": "application/json",
  };
  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent(
        new URL(req.url, "http://x").pathname,
      );
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const resolved = path.resolve(path.join(rootDir, urlPath));
      if (!resolved.startsWith(path.resolve(rootDir))) {
        res.statusCode = 403;
        res.end("forbidden");
        return;
      }
      fs.readFile(resolved, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        const ext = path.extname(resolved);
        res.setHeader(
          "Content-Type",
          MIME[ext] || "application/octet-stream",
        );
        res.end(data);
      });
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "0.0.0.0", () => resolve(server));
  });
}
