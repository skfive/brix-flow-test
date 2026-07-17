// tests/e2e/breakout-lite/start-control-outcome-restart.test.js
// BF-945 · /phase18-games/breakout-lite 실 브라우저 E2E 회귀 가드 (테스터 소유)
//
// 관련: docs/design/breakout-lite-BF-942.md(디자인) ·
//       phase18-games/breakout-lite/{index.html,styles.css,logic.js,main.js}(구현, BF-943).
// 본 파일은 머지된 최종 코드 기준으로 e2e-runner 실 브라우저 호출을 통해
// "시작 → 조작(키보드+터치) → 승리 → 재시작(키보드 R) → 조작 → 패배 → 재시작(버튼)"
// 흐름을 직접 구동해 검증한다.
//
// ── 중복 금지 (dev 가 이미 커버 — 재작성 X) ──────────────────────────────
//   tests/breakout-lite-BF943.test.js:
//     - vanilla-static file:// 안전 가드(type=module·import/export·fetch/localStorage 0건)
//     - 마크업 계약(title/h1, canvas#board 360x480+touch-action, HUD data-role=score/lives+aria-live,
//       board-overlay/serve-hint class, btn-start/btn-pause/btn-restart id, noscript, CSS 토큰)
//     - logic.js 순수 함수 전수(상수, 벽돌 배치, 벽 반사, 벽돌 충돌·점수, 패들 반사, 발사 벡터,
//       상태 전이 idle/serve/playing/paused/win/lose, 생명 손실·재부착·패배, 승리 우선순위,
//       좌우 키 상쇄, 패들 클램프, 재시작 리셋, 델타 클램프)
//   → 본 파일은 이 항목들을 정적으로 다시 검증하지 않는다. 상태 전이 공식·충돌 판정 자체의
//     정확성은 이미 node:test 로 전수 검증됨 — 여기서는 "실 브라우저에서 그 로직이 실제
//     키보드/터치 입력에 반응해 게임이 시작·조작·종료·재시작되는가"만 관찰한다.
//
// ── 본 파일이 보호하는 대상 (작업 AC) ─────────────────────────────────────
//   AC-시작   : idle 화면(시작 버튼 노출) → "시작" 클릭 시 serve 상태(발사 힌트 노출)로 전이한다.
//   AC-조작   : 화살표 키보드로 패들이 좌우 이동하고, Space 로 발사되며(serve→playing),
//               포인터(터치) 드래그로도 패들이 즉시 추종한다.
//   AC-승리   : 벽돌을 모두 격파하면 승리 화면("클리어!")이 노출된다.
//   AC-패배   : 생명을 모두 소진하면 패배 화면("게임 오버")이 노출된다.
//   AC-재시작 : 승리/패배 화면에서 키보드(R) 또는 버튼("다시하기") 로 재시작하면 serve 상태로
//               자동 복귀하고 점수/생명/벽돌이 초기화된다.
//
// 결정론 확보 기법 (상태 전이 공식 재검증 아님 — 순수 E2E 타이밍 제어용):
//   page.addInitScript 으로 window.BreakoutLiteLogic 할당을 가로채 두 지점만 감싼다.
//   (logic.js 는 resolveBrickHit/ballHitsPaddle 을 update() 내부에서 클로저 지역 참조로
//   직접 호출한다 — pong 의 ballHitsPaddle 오버라이드처럼 API 객체 프로퍼티만 바꿔서는
//   가로채지지 않는다는 것을 로컬 실측으로 확인했다. 따라서 main.js 가 실제로 "객체를 통해"
//   호출하는 가장 바깥쪽 함수인 update() 자체를 감싼다):
//     - createInitialState: 반환 객체 참조를 window.__brixBreakoutState 에 저장 — canvas
//       렌더 픽셀 대신 내부 상태(phase/paddleX/score/lives/bricksRemaining)를 직접 읽는다.
//     - update: window.__brixForceBrickWin 이 true 고 phase==='playing' 이면, 미리
//       1개만 남겨둔(bricksRemaining=1) 벽돌을 그 자리에서 파괴 처리(score+10,
//       bricksRemaining-1)하고 0 이 되면 phase='win' 으로 전이한다. window.__brixForcePaddleMiss
//       가 true 고 phase==='playing' 이면 lives 를 1 감소시키고(미리 lives=1 로 낮춰둠)
//       0 이면 phase='lose'+loseReason, 아니면 phase='serve'로 재부착한다. 두 경우 모두
//       원본 update() 는 호출하지 않고 즉시 return 한다 — 그 외(강제 플래그 꺼짐)에는 원본
//       update() 를 그대로 호출해 실제 물리를 그대로 실행한다.
//   이 훅은 "마지막 벽돌 파괴 시 즉시 win", "마지막 생명 손실 시 lose"라는 승패 판정
//   자체(이미 dev 단위 테스트가 전수 검증)를 재검증하지 않는다 — main.js 의 rAF 루프가
//   실제로 호출하는 L.update() 를 통해 phase 가 바뀌어야만 main.js 의 전이 감지
//   (`state.phase !== prevPhase` → syncUi()) 가 실행되므로, 이 경로를 그대로 타게 해
//   "phase 전이 시 실 브라우저가 승리/패배 UI 를 정확히 렌더하는가"만 관찰한다(state.phase
//   를 loop() 바깥에서 직접 대입하면 프레임 조건문(`serve`/`playing` 아니면 통째로 skip)에
//   걸려 syncUi() 가 영영 호출되지 않는다는 것도 로컬 실측으로 확인해 배제했다).
//
// 실행: node --test tests/e2e/breakout-lite/start-control-outcome-restart.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/e2e/breakout-lite/start-control-outcome-restart.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const MODULE_DIR = path.join(REPO_ROOT, "phase18-games", "breakout-lite");

function readModuleFile(name) {
  return readFileSync(path.join(MODULE_DIR, name), "utf-8");
}

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 breakout-lite 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "breakout-lite";
const TEST_MODULE = process.env.BRIX_TEST_MODULE;
const MODULE_SKIP =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  TEST_MODULE != null &&
  TEST_MODULE !== _BRIX_MY_MODULE;
const E2E_SKIP = process.env.BRIX_E2E_SKIP === "1";

if (MODULE_SKIP) {
  describe("BF-945 (module scope skip)", () => {
    test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) =>
      t.skip(`BRIX_TEST_MODULE=${TEST_MODULE} ≠ breakout-lite — BF-945 가드 스킵`));
  });
} else {
  // ═══════════════════════════════════════════════════════════
  // §0. 정적 가드 — 본 E2E 스크립트가 직접 의존하는 selector (dev 미검증분만)
  //     dev(BF-943) 테스트는 class="board-overlay"/"serve-hint" 존재만 정규식으로 확인했고
  //     id="overlay"/id="serve-hint"/id="overlay-title"/id="btn-again" 자체는 미확인.
  //     본 스크립트가 각각 getElementById 로 직접 의존하므로 여기서 고정한다.
  // ═══════════════════════════════════════════════════════════
  describe("BF-945 §0 정적 가드 — E2E 스크립트 의존 selector", () => {
    test('§0-1 index.html — id="overlay" 존재 (본 스크립트가 getElementById 로 직접 의존)', () => {
      const html = readModuleFile("index.html");
      assert.ok(html.includes('id="overlay"'), 'index.html 에 id="overlay" 가 없습니다');
    });

    test('§0-2 index.html — id="overlay-title" 존재 (승리/패배 문구를 직접 읽음)', () => {
      const html = readModuleFile("index.html");
      assert.ok(html.includes('id="overlay-title"'), 'index.html 에 id="overlay-title" 가 없습니다');
    });

    test('§0-3 index.html — id="serve-hint" 존재 (dev 는 class 만 확인)', () => {
      const html = readModuleFile("index.html");
      assert.ok(html.includes('id="serve-hint"'), 'index.html 에 id="serve-hint" 가 없습니다');
    });

    test('§0-4 index.html — id="btn-again" 존재 (승리/패배 화면 재시작 버튼)', () => {
      const html = readModuleFile("index.html");
      assert.ok(html.includes('id="btn-again"'), 'index.html 에 id="btn-again" 가 없습니다');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // E2E 헬퍼 (기존 e2e 가드와 동일 패턴 — tests/e2e/pong/render-play-touch.test.js,
  // tests/e2e/simon-says/round-progress-gameover-keyboard.test.js 참고)
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

  if (E2E_SKIP) {
    test("[E2E] BF-945 BRIX_E2E_SKIP=1 — 전체 E2E skip (CI 결정성)", (t) =>
      t.skip("BRIX_E2E_SKIP=1"));
  } else {
    test(
      "BF-945 E2E: 시작→조작(키보드+터치)→승리→재시작(R)→조작→패배→재시작(버튼) 전체 여정",
      async (t) => {
        if (!(await e2eRunnerReachable(t))) return;

        const server = await startStaticServer(REPO_ROOT);
        const port = server.address().port;
        const selfHost = personaHost();

        try {
          const url = `http://${selfHost}:${port}/phase18-games/breakout-lite/`;
          const scriptText = `
            const consoleErrors = [];
            page.on('console', (msg) => {
              if (msg.type() === 'error') consoleErrors.push(msg.text());
            });
            page.on('pageerror', (err) => {
              consoleErrors.push('pageerror: ' + (err && err.message ? err.message : String(err)));
            });

            // ── STEP 0: 결정론 훅 등록 (페이지 스크립트 실행 전, addInitScript) ──
            await page.addInitScript(() => {
              let real;
              window.__brixForceBrickWin = false;
              window.__brixForcePaddleMiss = false;
              Object.defineProperty(window, 'BreakoutLiteLogic', {
                configurable: true,
                get() { return real; },
                set(v) {
                  const origCreateInitialState = v.createInitialState;
                  v.createInitialState = function () {
                    const s = origCreateInitialState.call(v);
                    window.__brixBreakoutState = s;
                    return s;
                  };
                  const origUpdate = v.update;
                  v.update = function (state, dt, inputVX) {
                    if (window.__brixForceBrickWin && state.phase === 'playing') {
                      for (var i = 0; i < state.bricks.length; i += 1) {
                        if (state.bricks[i].alive) {
                          state.bricks[i].alive = false;
                          state.score += 10;
                          state.bricksRemaining -= 1;
                          break;
                        }
                      }
                      if (state.bricksRemaining <= 0) state.phase = 'win';
                      return state;
                    }
                    if (window.__brixForcePaddleMiss && state.phase === 'playing') {
                      state.lives -= 1;
                      if (state.lives > 0) {
                        state.phase = 'serve';
                        state.ball.x = state.paddleX + 32;
                        state.ball.y = 434;
                        state.ball.vx = 0;
                        state.ball.vy = 0;
                      } else {
                        state.phase = 'lose';
                        state.loseReason = 'out-of-lives';
                      }
                      return state;
                    }
                    return origUpdate.call(v, state, dt, inputVX);
                  };
                  real = v;
                },
              });
            });

            await page.reload();
            await page.waitForSelector('#btn-start', { timeout: 8000 });

            // ── STEP 1 (AC-시작): 초기 idle 화면 — overlay data-state=idle, 시작 버튼 노출 ──
            const initial = await page.evaluate(() => ({
              dataState: document.getElementById('overlay').getAttribute('data-state'),
              overlayHidden: document.getElementById('overlay').hidden,
              btnStartHidden: document.getElementById('btn-start').hidden,
              phase: window.__brixBreakoutState.phase,
            }));
            if (initial.dataState !== 'idle' || initial.phase !== 'idle') {
              throw new Error('AC-시작 회귀: 초기 상태가 idle 이 아님 — dataState=' + initial.dataState + ' phase=' + initial.phase);
            }
            if (initial.overlayHidden) {
              throw new Error('AC-시작 회귀: idle 오버레이가 숨겨져 있음');
            }
            if (initial.btnStartHidden) {
              throw new Error('AC-시작 회귀: idle 화면에 시작 버튼이 노출되지 않음');
            }
            console.log('[step1] AC-시작(초기 idle) OK');

            // ── STEP 2 (AC-시작): "시작" 클릭 → serve 상태 + 발사 힌트 노출 ──
            await page.click('#btn-start');
            await page.waitForFunction(() => window.__brixBreakoutState.phase === 'serve', { timeout: 3000 });
            const afterStart = await page.evaluate(() => ({
              overlayHidden: document.getElementById('overlay').hidden,
              serveHintHidden: document.getElementById('serve-hint').hidden,
            }));
            if (!afterStart.overlayHidden) {
              throw new Error('AC-시작 회귀: serve 진입 후 오버레이가 여전히 노출됨');
            }
            if (afterStart.serveHintHidden) {
              throw new Error('AC-시작 회귀: serve 진입 후 발사 힌트 배너가 노출되지 않음');
            }
            console.log('[step2] AC-시작(idle->serve) OK — 발사 힌트 노출');

            // ── STEP 3 (AC-조작/키보드): 화살표 키로 패들 좌우 이동 ──
            const paddleBeforeKey = await page.evaluate(() => window.__brixBreakoutState.paddleX);
            await page.keyboard.down('ArrowRight');
            await new Promise((r) => setTimeout(r, 300));
            await page.keyboard.up('ArrowRight');
            const paddleAfterRight = await page.evaluate(() => window.__brixBreakoutState.paddleX);
            if (!(paddleAfterRight > paddleBeforeKey)) {
              throw new Error('AC-조작 회귀: ArrowRight 입력 후 패들이 오른쪽으로 이동하지 않음 — before=' + paddleBeforeKey + ' after=' + paddleAfterRight);
            }
            await page.keyboard.down('ArrowLeft');
            await new Promise((r) => setTimeout(r, 300));
            await page.keyboard.up('ArrowLeft');
            const paddleAfterLeft = await page.evaluate(() => window.__brixBreakoutState.paddleX);
            if (!(paddleAfterLeft < paddleAfterRight)) {
              throw new Error('AC-조작 회귀: ArrowLeft 입력 후 패들이 왼쪽으로 이동하지 않음 — before=' + paddleAfterRight + ' after=' + paddleAfterLeft);
            }
            console.log('[step3] AC-조작(키보드 좌우) OK — paddleX ' + paddleBeforeKey + ' -> ' + paddleAfterRight + ' -> ' + paddleAfterLeft);

            // ── STEP 4 (AC-조작): Space 로 발사 → playing 전이 ──
            await page.keyboard.press('Space');
            await page.waitForFunction(() => window.__brixBreakoutState.phase === 'playing', { timeout: 3000 });
            console.log('[step4] AC-조작(Space 발사, serve->playing) OK');

            // ── STEP 5 (AC-조작/터치): 캔버스 포인터 드래그 → 패들 즉시 추종 ──
            const rect = await page.evaluate(() => {
              const r = document.getElementById('board').getBoundingClientRect();
              return { left: r.left, top: r.top, width: r.width, height: r.height };
            });
            const targetLogicalX = 260; // 논리 좌표(0~360)
            const targetClientX = rect.left + (targetLogicalX / 360) * rect.width;
            const clientY = rect.top + rect.height / 2;
            await page.mouse.move(rect.left + rect.width / 2, clientY);
            await page.mouse.down();
            await page.mouse.move(targetClientX, clientY, { steps: 5 });
            const paddleAfterDrag = await page.evaluate(() => window.__brixBreakoutState.paddleX);
            await page.mouse.up();
            const expectedPaddleX = Math.max(0, Math.min(360 - 64, targetLogicalX - 32));
            if (Math.abs(paddleAfterDrag - expectedPaddleX) > 6) {
              throw new Error('AC-조작 회귀: 포인터 드래그 후 paddleX=' + paddleAfterDrag + ' — 기대값(' + expectedPaddleX + ')과 6px 초과 오차. 좌표 변환식(pointerToPaddleX) 회귀 의심');
            }
            console.log('[step5] AC-조작(터치/포인터 드래그) OK — paddleX=' + paddleAfterDrag + ' (기대~' + expectedPaddleX + ')');

            // ── STEP 6 (AC-승리): 벽돌 1개만 남기고 강제격파 훅 → win 상태 결정론적 도달 ──
            await page.evaluate(() => {
              const s = window.__brixBreakoutState;
              for (const b of s.bricks) b.alive = false;
              s.bricks[0].alive = true;
              s.bricksRemaining = 1;
              s.score = 230;
              window.__brixForceBrickWin = true;
            });
            await page.waitForFunction(() => window.__brixBreakoutState.phase === 'win', { timeout: 3000 });
            const winState = await page.evaluate(() => ({
              dataState: document.getElementById('overlay').getAttribute('data-state'),
              title: document.getElementById('overlay-title').textContent,
              domScore: document.querySelector('[data-role="score"]').textContent,
              internalScore: window.__brixBreakoutState.score,
              bricksRemaining: window.__brixBreakoutState.bricksRemaining,
              btnAgainHidden: document.getElementById('btn-again').hidden,
            }));
            if (winState.dataState !== 'win') {
              throw new Error('AC-승리 회귀: 마지막 벽돌 파괴 후 overlay data-state 가 win 이 아님 — ' + winState.dataState);
            }
            if (!winState.title.includes('클리어')) {
              throw new Error('AC-승리 회귀: 승리 문구("클리어!")가 노출되지 않음 — title="' + winState.title + '"');
            }
            if (winState.bricksRemaining !== 0) {
              throw new Error('AC-승리 회귀: bricksRemaining 이 0 이 아님 — ' + winState.bricksRemaining);
            }
            if (String(winState.internalScore) !== winState.domScore) {
              throw new Error('AC-승리 회귀: 내부 score(' + winState.internalScore + ') 와 HUD DOM("' + winState.domScore + '") 불일치');
            }
            if (winState.btnAgainHidden) {
              throw new Error('AC-승리 회귀: 승리 화면에 "다시하기" 버튼이 노출되지 않음');
            }
            console.log('[step6] AC-승리 OK — win 상태 + "클리어!" 문구 + score=' + winState.internalScore + ' 노출');

            // ── STEP 7 (AC-재시작/키보드 R): R 키로 재시작 → serve 로 자동 복귀 + 초기화 ──
            await page.evaluate(() => { window.__brixForceBrickWin = false; });
            await page.keyboard.press('r');
            await page.waitForFunction(() => window.__brixBreakoutState.phase === 'serve', { timeout: 3000 });
            const afterRestart1 = await page.evaluate(() => ({
              score: window.__brixBreakoutState.score,
              lives: window.__brixBreakoutState.lives,
              bricksRemaining: window.__brixBreakoutState.bricksRemaining,
              overlayHidden: document.getElementById('overlay').hidden,
            }));
            if (afterRestart1.score !== 0 || afterRestart1.lives !== 3 || afterRestart1.bricksRemaining !== 24) {
              throw new Error('AC-재시작 회귀(R키): 재시작 후 초기화 실패 — ' + JSON.stringify(afterRestart1));
            }
            if (!afterRestart1.overlayHidden) {
              throw new Error('AC-재시작 회귀(R키): 재시작 후 serve 상태인데 오버레이가 노출됨');
            }
            console.log('[step7] AC-재시작(키보드 R, win->serve) OK — score/lives/bricksRemaining 초기화 확인');

            // ── STEP 8 (AC-패배): 패들 항상 miss 훅 + lives=1 강제 → 발사 1회로 생명 소진 결정론적 도달 ──
            await page.evaluate(() => {
              window.__brixForcePaddleMiss = true;
              window.__brixBreakoutState.lives = 1;
            });
            await page.keyboard.press('Space'); // serve -> playing
            await page.waitForFunction(() => window.__brixBreakoutState.phase === 'playing', { timeout: 2000 });
            await page.waitForFunction(() => window.__brixBreakoutState.phase === 'lose', { timeout: 20000 });
            const loseState = await page.evaluate(() => ({
              dataState: document.getElementById('overlay').getAttribute('data-state'),
              title: document.getElementById('overlay-title').textContent,
              lives: window.__brixBreakoutState.lives,
              btnAgainHidden: document.getElementById('btn-again').hidden,
            }));
            if (loseState.dataState !== 'lose') {
              throw new Error('AC-패배 회귀: 생명 소진 후 overlay data-state 가 lose 가 아님 — ' + loseState.dataState);
            }
            if (!loseState.title.includes('게임 오버')) {
              throw new Error('AC-패배 회귀: 패배 문구("게임 오버")가 노출되지 않음 — title="' + loseState.title + '"');
            }
            if (loseState.lives !== 0) {
              throw new Error('AC-패배 회귀: lives 가 0 이 아닌 상태에서 lose 로 전이함 — lives=' + loseState.lives);
            }
            if (loseState.btnAgainHidden) {
              throw new Error('AC-패배 회귀: 패배 화면에 "다시하기" 버튼이 노출되지 않음');
            }
            console.log('[step8] AC-패배 OK — lose 상태 + "게임 오버" 문구 노출(lives=0)');

            // ── STEP 9 (AC-재시작/버튼): "다시하기" 클릭 → serve 로 자동 복귀 + 초기화 ──
            await page.evaluate(() => { window.__brixForcePaddleMiss = false; });
            await page.click('#btn-again');
            await page.waitForFunction(() => window.__brixBreakoutState.phase === 'serve', { timeout: 3000 });
            const afterRestart2 = await page.evaluate(() => ({
              score: window.__brixBreakoutState.score,
              lives: window.__brixBreakoutState.lives,
              bricksRemaining: window.__brixBreakoutState.bricksRemaining,
              overlayHidden: document.getElementById('overlay').hidden,
            }));
            if (afterRestart2.score !== 0 || afterRestart2.lives !== 3 || afterRestart2.bricksRemaining !== 24) {
              throw new Error('AC-재시작 회귀(버튼): 재시작 후 초기화 실패 — ' + JSON.stringify(afterRestart2));
            }
            if (!afterRestart2.overlayHidden) {
              throw new Error('AC-재시작 회귀(버튼): 재시작 후 serve 상태인데 오버레이가 노출됨');
            }
            console.log('[step9] AC-재시작(버튼, lose->serve) OK — score/lives/bricksRemaining 초기화 확인');

            // ── STEP 10: 콘솔/페이지 에러 0건 ──
            if (consoleErrors.length > 0) {
              throw new Error('콘솔/페이지 에러 ' + consoleErrors.length + '건 발생:\\n' + consoleErrors.slice(0, 5).join('\\n'));
            }

            console.log('[OK] BF-945: 시작->조작(키보드+터치)->승리->재시작(R)->조작->패배->재시작(버튼) 전체 여정 통과');
          `;

          const res = await fetch("http://e2e-runner:3030/run", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
              "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-945",
            },
            body: JSON.stringify({
              url,
              label: "Breakout Lite 시작→조작(키보드+터치)→승리→재시작→패배→재시작 [BF-945]",
              scriptText,
              timeoutMs: 60000,
            }),
          });
          const json = await res.json();
          assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
          assert.ok(
            json.passed,
            `BF-945 E2E 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2500)}`,
          );
        } finally {
          await new Promise((resolve) => server.close(resolve));
        }
      },
    );
  } // end else (E2E_SKIP)
} // end else (MODULE_SKIP)
