// tests/e2e/phase18-snake/restart-selfcollision-BF973.test.js
// BF-973 · Snake 자기 충돌 게임오버 UI + 재시작 DOM 동기화 E2E 회귀 가드
//
// planner SSOT: docs/plan/snake-boundary-restart-BF-970.md
//   §2.2 AC-SELF-3 자기 충돌 게임오버 UI 계약(오버레이 문구·btn-pause disabled·틱 정지)
//   §2.2 AC-SELF-4 wall/self 사유 문구 상호 배타(교차 노출 없음)
//   §2.3 AC-RESTART-3 "다시하기"(#btn-again) 클릭 시 스코어보드·오버레이 DOM 동기화
//   §2.3 AC-RESTART-4 하단 컨트롤 바 "재시작"(#btn-restart) 클릭 시 초기화 + 틱 재개
//
// 본 파일이 채우는 공백(reviewer BF-974 지적, planner GAP-2/GAP-4):
//   기존 e2e(render-play-direction-gameover.test.js)는 STEP 6에서 wall 사유만
//   exercise 하고 self 사유·재시작 버튼 DOM 흐름은 검증하지 않았다. 이 파일은
//   그 미검증 사용자 여정만 추가로 고정하며, logic.js/main.js 코드는 변경하지 않는다.
//
// 자기 충돌 유도(실제 로직 사용 — 재구현 아님):
//   결정론 훅으로 먹이를 "머리 앞 칸"에 둬 길이 6까지 성장시킨 뒤, 먹이를 뱀
//   동선에서 먼 코너(0,0)로 치워 더 이상 먹지 않게 하고 down→left→up 을 입력한다.
//   머리가 자기 몸 셀로 진입 → logic.js isSelfCollision 이 gameoverReason='self' 를
//   반환한다(먹이 위치만 결정론화, 충돌 판정 자체는 원본 로직 그대로).
//
// 재시작 DOM 동기화 검증 원칙(구현 준수 — main.js 미수정):
//   main.js syncUi 는 playing 전환 시 overlay.hidden=true 만 설정하고 data-state
//   속성은 갱신하지 않는다(재시작 후 data-state 는 'gameover' 잔존). 따라서 본
//   가드는 "오버레이가 실제로 숨겨졌는가(hidden 속성)·스코어보드 0 복귀·btn-pause
//   재활성·내부 상태 초기화" 라는 실제 시각/상태 계약을 검증한다(data-state 잔존은
//   overlay 가 hidden 이므로 화면에 노출되지 않음 — 코드 변경은 §4 nonGoals).
//
// 실행: node --test tests/e2e/phase18-snake/restart-selfcollision-BF973.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/e2e/phase18-snake/restart-selfcollision-BF973.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// 루트 /snake(다수 snake-BF*.test.js)와 네임스페이스가 다름(phase18-snake).
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "phase18-snake";
const TEST_MODULE = process.env.BRIX_TEST_MODULE;
const MODULE_SKIP =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  TEST_MODULE != null &&
  TEST_MODULE !== _BRIX_MY_MODULE;
const E2E_SKIP = process.env.BRIX_E2E_SKIP === "1";

if (MODULE_SKIP) {
  describe("BF-973 (module scope skip)", () => {
    test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) =>
      t.skip(`BRIX_TEST_MODULE=${TEST_MODULE} ≠ phase18-snake — BF-973 가드 스킵`));
  });
} else {
  // ─────────────────────────────────────────────────────────────
  // E2E 헬퍼 (기존 e2e 가드와 동일 패턴 — render-play-direction-gameover.test.js 참고)
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
    test("[E2E] BF-973 BRIX_E2E_SKIP=1 — 전체 E2E skip (CI 결정성)", (t) =>
      t.skip("BRIX_E2E_SKIP=1"));
  } else {
    // ═══════════════════════════════════════════════════════════
    // E2E — 자기 충돌 게임오버(UI 계약) → "다시하기" 재시작 → "재시작" 버튼 재시작
    // ═══════════════════════════════════════════════════════════
    test("BF-973 E2E: 자기충돌 게임오버 UI(AC-SELF-3/4) → 다시하기/재시작 DOM 동기화(AC-RESTART-3/4)", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/phase18-games/snake/`;
        const scriptText = `
          const consoleErrors = [];
          page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });

          // ── STEP 0: 결정론 훅 — 먹이 위치만 제어(충돌 판정은 원본 로직) ──
          // 길이 GROW_TARGET(6) 도달 전: 먹이를 머리 바로 앞 칸에 둬 계속 성장.
          // 도달 후: 뱀 동선에서 먼 코너(0,0)로 치워 더 이상 먹지 않게 한 뒤
          //          down→left→up 입력으로 머리를 자기 몸으로 유도한다.
          // spawnFood 무작위 계산은 원본대로 호출 후 결과만 교체 → 스폰 로직 재검증 아님.
          await page.addInitScript(() => {
            const GROW_TARGET = 6;
            let real;
            Object.defineProperty(window, 'SnakeLogic', {
              configurable: true,
              get() { return real; },
              set(v) {
                function foodAhead(snake, direction) {
                  var vec = v.DIRECTION_VECTORS[direction];
                  var head = snake[0];
                  return { x: head.x + vec.dx, y: head.y + vec.dy };
                }
                function placeFood(state) {
                  if (state.snake.length < GROW_TARGET) {
                    return foodAhead(state.snake, state.direction);
                  }
                  return { x: 0, y: 0 }; // 뱀 동선(우/하/좌/상, x8~17·y10~11)에서 먼 코너 → 미섭취
                }
                var origCreateInitialState = v.createInitialState;
                v.createInitialState = function (rand) {
                  var s = origCreateInitialState.call(v, rand);
                  s.food = placeFood(s);
                  window.__brixSnakeState = s;
                  return s;
                };
                var origCreatePlayState = v.createPlayState;
                v.createPlayState = function (highScore, rand) {
                  var s = origCreatePlayState.call(v, highScore, rand);
                  s.food = placeFood(s);
                  window.__brixSnakeState = s;
                  return s;
                };
                var origTick = v.tick;
                v.tick = function (state, rand) {
                  var next = origTick.call(v, state, rand);
                  if (next.status === 'playing' && next.food) {
                    next.food = placeFood(next);
                  }
                  window.__brixSnakeState = next;
                  return next;
                };
                real = v;
              },
            });
          });

          // ── STEP 1: 360px 진입 + 시작 오버레이 ──
          await page.setViewportSize({ width: 360, height: 740 });
          await page.reload();
          await page.waitForSelector('#overlay[data-state="start"]', { timeout: 8000 });
          console.log('[step1] 로드 + 시작 오버레이 OK');

          // ── STEP 2: 시작 → 길이 6까지 성장(우측 이동) ──
          await page.click('#btn-start');
          await page.waitForFunction(
            () => document.getElementById('overlay').hasAttribute('hidden'),
            { timeout: 5000 }
          );
          await page.waitForFunction(
            () => window.__brixSnakeState && window.__brixSnakeState.snake.length >= 6,
            { timeout: 8000 }
          );
          console.log('[step2] 길이 6 성장 완료 — 자기충돌 유도 준비');

          // ── STEP 3 (AC-SELF-3): down→left→up 으로 자기 몸 진입 → gameover/self ──
          await page.keyboard.press('ArrowDown');
          await page.waitForFunction(
            () => window.__brixSnakeState && window.__brixSnakeState.direction === 'down',
            { timeout: 3000 }
          );
          await page.keyboard.press('ArrowLeft');
          await page.waitForFunction(
            () => window.__brixSnakeState && window.__brixSnakeState.direction === 'left',
            { timeout: 3000 }
          );
          await page.keyboard.press('ArrowUp');
          await page.waitForFunction(
            () => window.__brixSnakeState && window.__brixSnakeState.status === 'gameover',
            { timeout: 3000 }
          );

          const selfOver = await page.evaluate(() => ({
            reason: window.__brixSnakeState.gameoverReason,
            overlayHidden: document.getElementById('overlay').hasAttribute('hidden'),
            overlayState: document.getElementById('overlay').getAttribute('data-state'),
            overlayReason: document.getElementById('overlay-reason').textContent,
            btnPauseDisabled: document.getElementById('btn-pause').disabled,
            btnAgainHidden: document.getElementById('btn-again').hasAttribute('hidden'),
            head: { ...window.__brixSnakeState.snake[0] },
          }));
          console.log('[step3] 자기충돌 게임오버:', JSON.stringify(selfOver));
          if (selfOver.reason !== 'self') {
            throw new Error('AC-SELF-3 전제 붕괴: 자기충돌이 아닌 사유로 게임오버 — reason=' + selfOver.reason);
          }
          if (selfOver.overlayHidden || selfOver.overlayState !== 'gameover') {
            throw new Error('AC-SELF-3 회귀: 자기충돌 게임오버 시 오버레이 미표시(hidden=' + selfOver.overlayHidden + ', data-state=' + selfOver.overlayState + ')');
          }
          // AC-SELF-3: 자기충돌 문구 "몸" 노출 (main.js REASON_TEXT.self="몸에 부딪혔어요")
          if (!selfOver.overlayReason || selfOver.overlayReason.indexOf('몸') === -1) {
            throw new Error('AC-SELF-3 회귀: 자기충돌 사유 텍스트에 "몸" 이 없음: "' + selfOver.overlayReason + '"');
          }
          // AC-SELF-4: wall 문구("벽")가 self 사유에 교차 노출되지 않음
          if (selfOver.overlayReason.indexOf('벽') !== -1) {
            throw new Error('AC-SELF-4 회귀: self 사유인데 wall 문구("벽")가 교차 노출됨: "' + selfOver.overlayReason + '"');
          }
          if (!selfOver.btnPauseDisabled) {
            throw new Error('AC-SELF-3 회귀: 자기충돌 게임오버 후에도 일시정지 버튼이 활성 — 틱 루프 미정지 의심');
          }
          if (selfOver.btnAgainHidden) {
            throw new Error('AC-SELF-3 회귀: 게임오버 시 "다시하기" 버튼이 노출되지 않음');
          }

          // 틱 루프 정지 확인 — 400ms 후에도 머리 좌표 불변
          const headBefore = JSON.stringify(selfOver.head);
          await new Promise(r => setTimeout(r, 400));
          const headAfter = await page.evaluate(() => JSON.stringify(window.__brixSnakeState.snake[0]));
          if (headBefore !== headAfter) {
            throw new Error('AC-SELF-3 회귀: 자기충돌 게임오버 후에도 머리가 계속 이동 — 틱 루프 미정지');
          }
          console.log('[step3] AC-SELF-3/4 OK — self 문구("몸")·btn-pause disabled·틱 정지·wall 문구 미노출');

          // ── STEP 4 (AC-RESTART-3): "다시하기"(#btn-again) → DOM/상태 초기화 ──
          // click→read 를 단일 evaluate 로 수행(startGame 은 동기 실행 — 틱 개입 전 관측).
          const afterAgain = await page.evaluate(() => {
            document.getElementById('btn-again').click();
            const s = window.__brixSnakeState;
            return {
              domScore: document.querySelector('[data-role="score"]').textContent,
              overlayHidden: document.getElementById('overlay').hasAttribute('hidden'),
              btnPauseDisabled: document.getElementById('btn-pause').disabled,
              status: s.status,
              score: s.score,
              snakeLength: s.snake.length,
              head: { ...s.snake[0] },
              direction: s.direction,
              pendingDirection: s.pendingDirection,
              gameoverReason: s.gameoverReason,
            };
          });
          console.log('[step4] 다시하기 직후:', JSON.stringify(afterAgain));
          if (afterAgain.domScore !== '0') {
            throw new Error('AC-RESTART-3 회귀: 다시하기 후 스코어보드가 "0" 으로 복귀하지 않음: "' + afterAgain.domScore + '"');
          }
          if (!afterAgain.overlayHidden) {
            throw new Error('AC-RESTART-3 회귀: 다시하기 후 오버레이가 hidden 되지 않음(게임오버 카드 잔존)');
          }
          if (afterAgain.btnPauseDisabled) {
            throw new Error('AC-RESTART-3 회귀: 다시하기 후 일시정지 버튼이 비활성 — 재생 재개 실패');
          }
          if (afterAgain.status !== 'playing' || afterAgain.score !== 0 || afterAgain.snakeLength !== 3) {
            throw new Error('AC-RESTART-3 회귀: 재시작 상태 초기화 실패 — ' + JSON.stringify(afterAgain));
          }
          if (afterAgain.head.x !== 10 || afterAgain.head.y !== 10 || afterAgain.direction !== 'right' || afterAgain.pendingDirection !== null || afterAgain.gameoverReason !== null) {
            throw new Error('AC-RESTART-3 회귀: 뱀 좌표/방향/대기방향/사유 초기화 실패 — ' + JSON.stringify(afterAgain));
          }
          // 틱 재개 확인 — 머리가 진행 방향(right)으로 전진
          await page.waitForFunction(
            () => window.__brixSnakeState && window.__brixSnakeState.snake[0].x > 10,
            { timeout: 3000 }
          );
          console.log('[step4] AC-RESTART-3 OK — 스코어 0·오버레이 hidden·pause 재활성·상태 초기화·틱 재개');

          // ── STEP 5 (AC-RESTART-4): 하단 "재시작"(#btn-restart) → playing 중 초기화 ──
          const afterRestart = await page.evaluate(() => {
            document.getElementById('btn-restart').click();
            const s = window.__brixSnakeState;
            return {
              domScore: document.querySelector('[data-role="score"]').textContent,
              overlayHidden: document.getElementById('overlay').hasAttribute('hidden'),
              status: s.status,
              score: s.score,
              snakeLength: s.snake.length,
              head: { ...s.snake[0] },
              direction: s.direction,
              pendingDirection: s.pendingDirection,
              gameoverReason: s.gameoverReason,
            };
          });
          console.log('[step5] 재시작 버튼 직후:', JSON.stringify(afterRestart));
          if (afterRestart.domScore !== '0' || afterRestart.status !== 'playing' || afterRestart.score !== 0 || afterRestart.snakeLength !== 3) {
            throw new Error('AC-RESTART-4 회귀: 재시작 버튼 후 초기화 실패 — ' + JSON.stringify(afterRestart));
          }
          if (afterRestart.head.x !== 10 || afterRestart.head.y !== 10 || afterRestart.direction !== 'right' || afterRestart.pendingDirection !== null || afterRestart.gameoverReason !== null) {
            throw new Error('AC-RESTART-4 회귀: 재시작 버튼 후 뱀/방향/사유 초기화 실패 — ' + JSON.stringify(afterRestart));
          }
          // 틱 재개 확인
          await page.waitForFunction(
            () => window.__brixSnakeState && window.__brixSnakeState.snake[0].x > 10,
            { timeout: 3000 }
          );
          console.log('[step5] AC-RESTART-4 OK — 재시작 버튼 초기화 + 틱 재개');

          // ── STEP 6: 콘솔 에러 없음 ──
          console.log('[step6] 수집된 콘솔 에러:', JSON.stringify(consoleErrors));
          if (consoleErrors.length > 0) {
            throw new Error('콘솔 에러 ' + consoleErrors.length + '건:\\n' + consoleErrors.slice(0, 3).join('\\n'));
          }

          console.log('[OK] BF-973: 자기충돌 UI(AC-SELF-3/4) + 다시하기/재시작 DOM 동기화(AC-RESTART-3/4) 통과');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-973",
          },
          body: JSON.stringify({
            url,
            label: "자기충돌 게임오버 UI + 다시하기/재시작 DOM 동기화 [BF-973]",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `BF-973 E2E 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });
  } // end else (E2E_SKIP)
} // end else (MODULE_SKIP)
