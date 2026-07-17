// tests/e2e/pong/keyboard-pause-focus.test.js
// BF-963 · /phase18-games/pong 키보드·일시정지 E2E 회귀 가드 (테스터 소유)
//
// 보호 대상 (BF-963 수용 기준):
//   AC1-E2E — 키보드만으로 시작(Enter)·패들 이동(↑/↓ 홀드)·일시정지(P)·재개(P)·
//             재시작(R)이 실 브라우저에서 회귀 없이 동작한다.
//   AC2-E2E — 일시정지 유지 중 공 좌표·점수가 실제 경과 시간(setTimeout) 동안
//             동결되고, 재개하면 다시 움직인다.
//   AC3-E2E — 오버레이(일시정지) 등장 시 카드 타이틀(#overlay-title)에 실제 DOM
//             포커스가 이동하고 :focus-visible 포커스 링이 렌더된다(design
//             BF-960 §5.1 GAP-1 — outline:none 제거 후 실제 반영 확인).
//
// dev(BF-961) 가 이미 검증한 항목 (재작성 금지 — tests/pong-BF961.test.js):
//   node:vm DOM 하니스로 키보드 시작/이동/일시정지/재개/재시작 상태 전이,
//   일시정지 중 공·점수 동결(가짜 rAF 프레임 구동), 터치 경로 보존,
//   logic.js 상수(WIN_SCORE/PADDLE_SPEED_KEYBOARD/POINT_PAUSE_MS) 무변경,
//   .pong-overlay__title 의 outline:none 제거·:focus-visible CSS 규칙 존재(정규식),
//   하단 hint·오버레이 문구의 키 세트 완전성.
//   → 이 파일은 그 상태 전이 로직을 재검증하지 않고, "실 브라우저에서 실제로
//     그렇게 동작하는가"(진짜 keydown 이벤트·진짜 rAF 타이밍·진짜 focus-visible
//     렌더)만 블랙박스로 관찰한다.
//
// dev(BF-915) 가 이미 검증한 항목 (재작성 금지 — tests/e2e/pong/render-play-touch.test.js):
//   마우스 클릭 시작·득점 집계(내부 상태-DOM 일치)·360px 터치 드래그(Pointer Events)·
//   콘솔 에러 부재. id="overlay" 정적 가드.
//   → 이 파일은 키보드 입력 경로만 다루며 클릭/터치/득점 집계는 다루지 않는다.
//
// tester 고유 영역 (본 파일):
//   1. 실제 브라우저 keydown/keyup(Playwright page.keyboard)으로 시작·이동·
//      일시정지·재개·재시작 전체 흐름이 이어지는지(다른 파일들은 클릭/터치 또는
//      가짜 rAF 하니스만 검증했음).
//   2. #overlay-title 실 DOM 포커스 이동 + :focus-visible 포커스 링 렌더
//      (dev 는 CSS 규칙 "존재"만 정규식으로 확인했고, 실제 focus() 호출 결과
//      브라우저가 포커스 링을 그리는지는 검증하지 않음).
//   3. id="overlay-title"/tabindex="-1" 정적 가드 — 본 E2E 스크립트가
//      getElementById("overlay-title") + 포커스 이동에 직접 의존하는 대상.
//
// 결정론 확보 기법 (물리/득점 로직 재검증 아님 — 순수 E2E 타이밍 제어용):
//   page.addInitScript 으로 logic.js 가 window.PongLogic 을 할당하는 시점을
//   가로채 ballHitsPaddle 판정에서 패들의 수직(y) 위치만 무시한다(X축 근접
//   판정은 원본 그대로 유지) → 공이 court 를 실제로 가로지르며 이동하되
//   양쪽 패들 X 위치에서는 항상 반사되어 득점(status: point-paused/gameover
//   전이)이 절대 발생하지 않는다. 본 시나리오는 키보드 조작·일시정지 흐름만
//   검증하므로 득점 판정 자체(dev BF-915/BF-913 영역)를 결정론화 대상에서
//   제외하기 위한 장치다. 같은 훅으로 createInitialState() 반환 객체 참조를
//   window.__brixPongState 에 저장해 실제 내부 상태(공 좌표·패들 y·점수)를
//   관찰한다.
//
// 실행: node --test tests/e2e/pong/keyboard-pause-focus.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/e2e/pong/keyboard-pause-focus.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const PONG_DIR = path.join(REPO_ROOT, "phase18-games", "pong");

function readPongFile(name) {
  return readFileSync(path.join(PONG_DIR, name), "utf-8");
}

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "pong";
const TEST_MODULE = process.env.BRIX_TEST_MODULE;
const MODULE_SKIP =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  TEST_MODULE != null &&
  TEST_MODULE !== _BRIX_MY_MODULE;
const E2E_SKIP = process.env.BRIX_E2E_SKIP === "1";

if (MODULE_SKIP) {
  describe("BF-963 (module scope skip)", () => {
    test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) =>
      t.skip(`BRIX_TEST_MODULE=${TEST_MODULE} ≠ pong — BF-963 가드 스킵`));
  });
} else {
  // ═══════════════════════════════════════════════════════════
  // §0. 정적 가드 — 본 E2E 스크립트가 직접 의존하는 selector (dev 미검증분만)
  // ═══════════════════════════════════════════════════════════
  describe("BF-963 §0 정적 가드 — E2E 스크립트 의존 selector", () => {
    test('§0-1 index.html — id="overlay-title" + tabindex="-1" 존재 (본 E2E 의 실 DOM 포커스 검증이 직접 의존)', () => {
      const html = readPongFile("index.html");
      assert.ok(
        html.includes('id="overlay-title"'),
        'index.html 에 id="overlay-title" 가 없습니다 — BF-963 E2E 가 getElementById("overlay-title") 로 의존합니다',
      );
      assert.match(
        html,
        /id="overlay-title"[^>]*tabindex="-1"|tabindex="-1"[^>]*id="overlay-title"/,
        'overlay-title 에 tabindex="-1" 가 없으면 overlayTitle.focus() 가 포커스를 이동시키지 못합니다',
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // E2E 헬퍼 (기존 e2e 가드와 동일 패턴 — tests/e2e/pong/render-play-touch.test.js 참고)
  // ─────────────────────────────────────────────────────────────
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

  function personaHost() {
    return (
      process.env.BRIX_PERSONA_HOST ??
      process.env.BRIX_WORKER_HOSTNAME ??
      "worker"
    );
  }

  function startStaticServer(rootDir) {
    const MIME = {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
    };
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
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
          res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
          res.end(data);
        });
      } catch (err) {
        res.statusCode = 500;
        res.end(String(err));
      }
    });
    return new Promise((resolve) => server.listen(0, "0.0.0.0", () => resolve(server)));
  }

  // ─────────────────────────────────────────────────────────────
  // E2E skip 분기
  // ─────────────────────────────────────────────────────────────
  if (E2E_SKIP) {
    test("[E2E] BF-963 BRIX_E2E_SKIP=1 — 전체 E2E skip (CI 결정성)", (t) =>
      t.skip("BRIX_E2E_SKIP=1"));
  } else {
    // ═══════════════════════════════════════════════════════════
    // §1. E2E — 키보드 시작→패들 이동→일시정지 동결→재개→재시작→포커스 표시
    // ═══════════════════════════════════════════════════════════
    test("BF-963 E2E §1: 키보드 시작→↑/↓ 패들 이동→일시정지(동결)→재개→재시작, 오버레이 포커스 링", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/phase18-games/pong/`;
        const scriptText = `
          const consoleErrors = [];
          page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });

          // ── STEP 0: 결정론 훅 — 양쪽 패들 판정에서 패들 y 위치만 무시(득점 절대 미발생) ──
          // 본 시나리오는 키보드/일시정지 흐름만 다루므로, 득점으로 인한
          // point-paused/gameover 전이가 타이밍을 흔들지 않도록 고정한다
          // (물리/득점 판정 자체는 dev BF-915/BF-913 영역 — 재검증 아님).
          // 주의: paddleX 근접(X축)만 실제로 검사하고 paddle.y(수직 위치)만
          // 무시한다 — 매 프레임 무조건 true 로 만들면 공이 실제로 court 를
          // 가로지르지 못하고 패들 표면에 즉시 고정돼(핑퐁) 정지 오검출을
          // 유발하므로(관찰됨), X축 근접 검사는 반드시 유지해야 한다.
          // createInitialState() 반환 객체 참조를 window.__brixPongState 에
          // 저장해 실제 내부 상태(공 좌표·패들 y·점수)를 관찰한다.
          await page.addInitScript(() => {
            let real;
            Object.defineProperty(window, 'PongLogic', {
              configurable: true,
              get() { return real; },
              set(v) {
                const origCreate = v.createInitialState;
                v.createInitialState = function () {
                  const s = origCreate.call(v);
                  window.__brixPongState = s;
                  return s;
                };
                v.ballHitsPaddle = function (ball, paddleX) {
                  return (
                    ball.x + v.BALL_RADIUS >= paddleX &&
                    ball.x - v.BALL_RADIUS <= paddleX + v.PADDLE_WIDTH
                  );
                };
                real = v;
              },
            });
          });

          await page.reload();
          await page.waitForSelector('#overlay[data-state="start"]', { timeout: 8000 });
          console.log('[step0] 초기 로드 + 시작 오버레이 노출 OK');

          // ── STEP 1 (AC1-E2E): Enter 키로 시작 ──────────────────────────
          await page.keyboard.press('Enter');
          await page.waitForFunction(
            () => window.__brixPongState && window.__brixPongState.status === 'playing',
            { timeout: 5000 }
          );
          const overlayHiddenAfterStart = await page.evaluate(() => document.getElementById('overlay').hasAttribute('hidden'));
          if (!overlayHiddenAfterStart) {
            throw new Error('AC1 회귀: Enter 로 시작해도 오버레이가 숨겨지지 않음');
          }
          console.log('[step1] Enter 키 시작 OK — status=playing, 오버레이 hidden');

          // ── STEP 2 (AC1-E2E): ↑ 키 홀드로 패들 위로 이동 ─────────────────
          const y0 = await page.evaluate(() => window.__brixPongState.paddles.player.y);
          if (y0 !== 160) {
            throw new Error('AC1 회귀: 시작 직후 플레이어 패들 y 가 중앙(160)이 아님: ' + y0);
          }
          await page.keyboard.down('ArrowUp');
          await new Promise(r => setTimeout(r, 300));
          await page.keyboard.up('ArrowUp');
          const y1 = await page.evaluate(() => window.__brixPongState.paddles.player.y);
          console.log('[step2] ↑ 홀드 300ms: y0=' + y0 + ' -> y1=' + y1);
          if (!(y1 < y0 - 20)) {
            throw new Error('AC1 회귀: ↑ 키 홀드로 패들이 충분히 위로 이동하지 않음 (y0=' + y0 + ', y1=' + y1 + ')');
          }

          // ── STEP 3 (AC1-E2E): ↓ 키 홀드로 패들 아래로 이동 ───────────────
          await page.keyboard.down('ArrowDown');
          await new Promise(r => setTimeout(r, 300));
          await page.keyboard.up('ArrowDown');
          const y2 = await page.evaluate(() => window.__brixPongState.paddles.player.y);
          console.log('[step3] ↓ 홀드 300ms: y1=' + y1 + ' -> y2=' + y2);
          if (!(y2 > y1 + 20)) {
            throw new Error('AC1 회귀: ↓ 키 홀드로 패들이 충분히 아래로 이동하지 않음 (y1=' + y1 + ', y2=' + y2 + ')');
          }
          console.log('[step2-3] AC1(키보드 패들 이동) OK — ↑/↓ 홀드가 실제로 패들을 반대 방향으로 이동시킴');

          // ── STEP 4 (AC1/AC2-E2E): P 키로 일시정지 → 공·점수 동결 ─────────
          await page.keyboard.press('p');
          await page.waitForFunction(
            () => window.__brixPongState && window.__brixPongState.status === 'paused',
            { timeout: 3000 }
          );
          const frozen = await page.evaluate(() => ({
            ball: { x: window.__brixPongState.ball.x, y: window.__brixPongState.ball.y },
            score: { ...window.__brixPongState.score },
          }));
          console.log('[step4] 일시정지 진입 OK — 동결 스냅샷:', JSON.stringify(frozen));

          await new Promise(r => setTimeout(r, 400));
          const afterWait = await page.evaluate(() => ({
            status: window.__brixPongState.status,
            ball: { x: window.__brixPongState.ball.x, y: window.__brixPongState.ball.y },
            score: { ...window.__brixPongState.score },
          }));
          console.log('[step4] 400ms 대기 후:', JSON.stringify(afterWait));
          if (afterWait.status !== 'paused') {
            throw new Error('AC1 회귀: 일시정지 상태가 유지되지 않음(status=' + afterWait.status + ')');
          }
          if (afterWait.ball.x !== frozen.ball.x || afterWait.ball.y !== frozen.ball.y) {
            throw new Error('AC2 회귀: 일시정지 중 공 좌표가 동결되지 않음 — 이전(' + JSON.stringify(frozen.ball) + ') vs 400ms 후(' + JSON.stringify(afterWait.ball) + ')');
          }
          if (afterWait.score.player !== frozen.score.player || afterWait.score.cpu !== frozen.score.cpu) {
            throw new Error('AC2 회귀: 일시정지 중 점수가 동결되지 않음');
          }
          console.log('[step4] AC2(일시정지 동결) OK — 400ms 경과해도 공·점수 불변');

          // ── STEP 5 (AC3-E2E): 오버레이 타이틀 실 포커스 + :focus-visible 링 ──
          const focusState = await page.evaluate(() => {
            const el = document.getElementById('overlay-title');
            const cs = getComputedStyle(el);
            return {
              activeId: document.activeElement ? document.activeElement.id : null,
              focusVisible: el.matches(':focus-visible'),
              outlineStyle: cs.outlineStyle,
              outlineWidth: cs.outlineWidth,
              dataState: document.getElementById('overlay').getAttribute('data-state'),
            };
          });
          console.log('[step5] 일시정지 오버레이 포커스 상태:', JSON.stringify(focusState));
          if (focusState.activeId !== 'overlay-title') {
            throw new Error('AC3 회귀: 일시정지 시 #overlay-title 로 포커스가 이동하지 않음 (activeElement=' + focusState.activeId + ')');
          }
          if (focusState.dataState !== 'paused') {
            throw new Error('AC3 회귀: 일시정지 오버레이 data-state 가 paused 가 아님(' + focusState.dataState + ')');
          }
          if (!focusState.focusVisible) {
            throw new Error('AC3 회귀: #overlay-title 이 :focus-visible 상태가 아님 — 포커스 링이 렌더되지 않을 수 있음');
          }
          if (focusState.outlineStyle === 'none' || focusState.outlineWidth === '0px') {
            throw new Error('AC3 회귀: #overlay-title 의 computed outline 이 없음(outlineStyle=' + focusState.outlineStyle + ', outlineWidth=' + focusState.outlineWidth + ') — 포커스 링 미표시(BF-960 GAP-1 재발 의심)');
          }
          console.log('[step5] AC3(포커스 표시) OK — #overlay-title 실 DOM 포커스 + :focus-visible 링 렌더 확인');

          // ── STEP 6 (AC1/AC2-E2E): P 키로 재개 → 공 재이동 ────────────────
          await page.keyboard.press('p');
          await page.waitForFunction(
            () => window.__brixPongState && window.__brixPongState.status === 'playing',
            { timeout: 3000 }
          );
          await new Promise(r => setTimeout(r, 300));
          const resumedBall = await page.evaluate(() => ({ x: window.__brixPongState.ball.x, y: window.__brixPongState.ball.y }));
          console.log('[step6] 재개 후 300ms 공 위치:', JSON.stringify(resumedBall), '(동결 스냅샷과 비교:', JSON.stringify(frozen.ball) + ')');
          if (resumedBall.x === frozen.ball.x && resumedBall.y === frozen.ball.y) {
            throw new Error('AC1/AC2 회귀: P 로 재개해도 공이 다시 움직이지 않음(동결 해제 실패)');
          }
          console.log('[step6] AC1/AC2(재개) OK — 재개 후 공이 다시 이동함');

          // ── STEP 7 (AC1-E2E): R 키로 재시작 → 패들 중앙 복귀·오버레이 유지 hidden ──
          await page.keyboard.press('r');
          await page.waitForFunction(
            () => window.__brixPongState && window.__brixPongState.paddles.player.y === 160,
            { timeout: 3000 }
          );
          const afterRestart = await page.evaluate(() => ({
            status: window.__brixPongState.status,
            playerY: window.__brixPongState.paddles.player.y,
            overlayHidden: document.getElementById('overlay').hasAttribute('hidden'),
            playerScore: document.querySelector('[data-role="player-score"]').textContent,
            cpuScore: document.querySelector('[data-role="cpu-score"]').textContent,
          }));
          console.log('[step7] R 재시작 후 상태:', JSON.stringify(afterRestart));
          if (afterRestart.status !== 'playing') {
            throw new Error('AC1 회귀: R 재시작 후 status 가 playing 이 아님(' + afterRestart.status + ')');
          }
          if (!afterRestart.overlayHidden) {
            throw new Error('AC1 회귀: R 재시작 후에도 오버레이가 표시됨(플레이 유지되어야 함)');
          }
          if (afterRestart.playerScore !== '0' || afterRestart.cpuScore !== '0') {
            throw new Error('AC1 회귀: R 재시작 후 스코어보드가 0:0 이 아님 — player=' + afterRestart.playerScore + ' cpu=' + afterRestart.cpuScore);
          }
          console.log('[step7] AC1(키보드 재시작) OK — 패들 중앙 복귀·플레이 유지·점수 0:0');

          // ── STEP 8: 콘솔 에러 없음 확인 ──────────────────────────────
          console.log('[step8] 수집된 콘솔 에러:', JSON.stringify(consoleErrors));
          if (consoleErrors.length > 0) {
            throw new Error('콘솔 에러 ' + consoleErrors.length + '건 발생:\\n' + consoleErrors.slice(0, 3).join('\\n'));
          }

          console.log('[OK] BF-963: 키보드 시작->패들 이동->일시정지 동결->오버레이 포커스 링->재개->재시작 전체 흐름 통과');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-963",
          },
          body: JSON.stringify({
            url,
            label: "키보드 시작·↑/↓ 패들·일시정지 동결·재개·재시작·포커스 링 [BF-963]",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `E2E §1 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });
  } // end else (E2E_SKIP)
} // end else (MODULE_SKIP)
