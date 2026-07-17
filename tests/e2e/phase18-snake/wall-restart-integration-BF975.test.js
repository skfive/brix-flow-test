// tests/e2e/phase18-snake/wall-restart-integration-BF975.test.js
// BF-975 · Snake 벽 충돌 경계·재시작 통합 E2E 회귀 가드
//
// planner SSOT: docs/plan/snake-boundary-restart-BF-970.md
//   §2.1 AC-WALL-5 벽 충돌 시 snake 좌표가 경계 밖으로 push 되지 않고 보존
//   §2.4 AC-INTEG-1 벽 충돌 게임오버 → 재시작 → 동일 방식 재도달 시 wall 사유 재현
//   §2.4 AC-INTEG-3 재시작 초기화 계약은 gameoverReason 값(wall/self)과 무관하게 동일
//
// 본 파일이 채우는 공백(§0 가정4 GAP-1/§6 참고 — 나머지는 이미 커버됨):
//   - tests/e2e/phase18-snake/render-play-direction-gameover.test.js 는 좌측 벽 1회
//     충돌만 exercise 하고 게임오버 이후 재시작을 진행하지 않는다(AC-INTEG-1 미검증).
//   - tests/e2e/phase18-snake/restart-selfcollision-BF973.test.js 는 자기충돌(self)
//     사유에 대해서만 재시작 DOM 동기화(AC-RESTART-3/4)를 검증했다 — wall 사유로
//     게임오버된 뒤에도 동일한 재시작 계약이 성립하는지(AC-INTEG-3)는 미검증이다.
//   - 벽 충돌 직후 snake 좌표가 보드 경계 밖(x=20)으로 밀려나지 않고 마지막 유효
//     좌표(x=19)에 보존되는지(AC-WALL-5)는 어느 e2e 파일도 확인한 적이 없다.
//   본 파일은 위 3개 공백만 메우며, wall 사유 자체의 게임오버 UI 계약
//   (오버레이 문구·틱 정지 등)은 render-play-direction-gameover.test.js STEP 6 이
//   이미 검증했으므로 재검증하지 않는다.
//
// dev(BF-925/BF-973) 가 이미 검증한 항목 (재작성 금지):
//   isWallCollision/isSelfCollision 등 logic.js 순수 함수 정확성, createPlayState/
//   createInitialState 반환 필드, index.html 마크업, styles.css 토큰, main.js syncUi
//   의 data-state 갱신 보강 로직 — 본 파일은 이를 "블랙박스 입력"으로만 사용한다.
//
// 결정론: 우측 벽 충돌은 별도 훅 없이도 결정적이다 — 시작 방향이 INITIAL_DIRECTION
//   ("right")이고 초기 머리가 (10,10)이므로, 아무 방향 입력 없이 틱 루프만 두면
//   먹이 섭취 여부와 무관하게(직선 경로라 자기충돌 없음) 항상 우측 벽(x=20)에
//   도달한다. render-play-direction-gameover.test.js(좌측 벽)와 겹치지 않도록
//   본 파일은 우측 벽을 사용해 "경계" 커버리지를 넓힌다.
//
// 실행: node --test tests/e2e/phase18-snake/wall-restart-integration-BF975.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/e2e/phase18-snake/wall-restart-integration-BF975.test.js

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
  describe("BF-975 (module scope skip)", () => {
    test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) =>
      t.skip(`BRIX_TEST_MODULE=${TEST_MODULE} ≠ phase18-snake — BF-975 가드 스킵`));
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
    test("[E2E] BF-975 BRIX_E2E_SKIP=1 — 전체 E2E skip (CI 결정성)", (t) =>
      t.skip("BRIX_E2E_SKIP=1"));
  } else {
    // ═══════════════════════════════════════════════════════════
    // E2E — 우측 벽 충돌(경계 보존) → 재시작(사유 무관 계약) → 동일 방식 재도달(재현)
    // ═══════════════════════════════════════════════════════════
    test("BF-975 E2E: 벽 충돌 경계 보존(AC-WALL-5) → 다시하기 재시작(AC-INTEG-3) → 벽 충돌 재현(AC-INTEG-1)", async (t) => {
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

          // ── STEP 0: 상태 관측 훅 — 결정론 조작 없음(입력 없이 방향='right' 자연 진행) ──
          // wall 충돌은 food 위치와 무관하게 결정적이므로(직선 경로, 자기충돌 불가)
          // 별도 food 결정론 훅 없이 window.__brixSnakeState 만 매 틱 저장한다.
          await page.addInitScript(() => {
            let real;
            Object.defineProperty(window, 'SnakeLogic', {
              configurable: true,
              get() { return real; },
              set(v) {
                var origCreateInitialState = v.createInitialState;
                v.createInitialState = function (rand) {
                  var s = origCreateInitialState.call(v, rand);
                  window.__brixSnakeState = s;
                  return s;
                };
                var origCreatePlayState = v.createPlayState;
                v.createPlayState = function (highScore, rand) {
                  var s = origCreatePlayState.call(v, highScore, rand);
                  window.__brixSnakeState = s;
                  return s;
                };
                var origTick = v.tick;
                v.tick = function (state, rand) {
                  var next = origTick.call(v, state, rand);
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

          // ── STEP 2: 시작 → 입력 없이 자연 진행 → 우측 벽 충돌(1차) ──
          await page.click('#btn-start');
          await page.waitForFunction(
            () => document.getElementById('overlay').hasAttribute('hidden'),
            { timeout: 5000 }
          );
          await page.waitForFunction(
            () => window.__brixSnakeState && window.__brixSnakeState.status === 'gameover',
            { timeout: 15000 }
          );
          const firstOver = await page.evaluate(() => ({
            reason: window.__brixSnakeState.gameoverReason,
            direction: window.__brixSnakeState.direction,
            head: { ...window.__brixSnakeState.snake[0] },
            score: window.__brixSnakeState.score,
          }));
          console.log('[step2] 1차 게임오버:', JSON.stringify(firstOver));
          if (firstOver.reason !== 'wall') {
            throw new Error('시나리오 전제 붕괴: 우측 벽 충돌이 아닌 사유로 게임오버 — reason=' + firstOver.reason);
          }
          // AC-WALL-5: 충돌 직전 유효 좌표(x=19) 보존 — 경계 밖(x=20)으로 push 되지 않음
          if (firstOver.head.x !== 19 || firstOver.head.y !== 10) {
            throw new Error('AC-WALL-5 회귀: 벽 충돌 후 머리 좌표가 경계 밖(또는 예상 외 값)으로 밀려남 — head=' + JSON.stringify(firstOver.head));
          }
          if (firstOver.direction !== 'right') {
            throw new Error('AC-WALL-5 회귀: 벽 충돌 후 direction 이 충돌 직전 진행 방향(right)으로 갱신되지 않음 — direction=' + firstOver.direction);
          }
          console.log('[step2] AC-WALL-5 OK — 우측 벽 충돌 시 머리 좌표(19,10) 보존 + direction=right 유지');

          // ── STEP 3 (AC-INTEG-3): "다시하기" 클릭 → wall 사유에서도 재시작 계약 성립 ──
          const afterAgain = await page.evaluate(() => {
            document.getElementById('btn-again').click();
            const s = window.__brixSnakeState;
            return {
              domScore: document.querySelector('[data-role="score"]').textContent,
              overlayHidden: document.getElementById('overlay').hasAttribute('hidden'),
              overlayState: document.getElementById('overlay').getAttribute('data-state'),
              btnPauseDisabled: document.getElementById('btn-pause').disabled,
              status: s.status,
              score: s.score,
              head: { ...s.snake[0] },
              direction: s.direction,
              pendingDirection: s.pendingDirection,
              gameoverReason: s.gameoverReason,
            };
          });
          console.log('[step3] 다시하기(wall 사유) 직후:', JSON.stringify(afterAgain));
          if (afterAgain.domScore !== '0' || !afterAgain.overlayHidden || afterAgain.overlayState === 'gameover' || afterAgain.btnPauseDisabled) {
            throw new Error('AC-INTEG-3 회귀: wall 사유 게임오버 후 다시하기가 self 사유와 동일한 재시작 계약을 만족하지 않음(스코어보드/오버레이/버튼) — ' + JSON.stringify(afterAgain));
          }
          if (afterAgain.status !== 'playing' || afterAgain.score !== 0 || afterAgain.gameoverReason !== null) {
            throw new Error('AC-INTEG-3 회귀: wall 사유 게임오버 후 재시작 상태 초기화 실패 — ' + JSON.stringify(afterAgain));
          }
          if (afterAgain.head.x !== 10 || afterAgain.head.y !== 10 || afterAgain.direction !== 'right' || afterAgain.pendingDirection !== null) {
            throw new Error('AC-INTEG-3 회귀: wall 사유 게임오버 후 뱀 좌표/방향/대기방향 초기화 실패 — ' + JSON.stringify(afterAgain));
          }
          console.log('[step3] AC-INTEG-3 OK — wall 사유 게임오버 후에도 다시하기가 self 와 동일한 재시작 계약을 만족');

          // ── STEP 4 (AC-INTEG-1): 재시작 후 동일 방식(입력 없음)으로 재도달 → wall 재현 ──
          await page.waitForFunction(
            () => window.__brixSnakeState && window.__brixSnakeState.status === 'gameover',
            { timeout: 15000 }
          );
          const secondOver = await page.evaluate(() => ({
            reason: window.__brixSnakeState.gameoverReason,
            head: { ...window.__brixSnakeState.snake[0] },
            domScore: document.querySelector('[data-role="score"]').textContent,
            overlayReason: document.getElementById('overlay-reason').textContent,
          }));
          console.log('[step4] 2차 게임오버(재현):', JSON.stringify(secondOver));
          if (secondOver.reason !== 'wall') {
            throw new Error('AC-INTEG-1 회귀: 재시작 후 동일 방식으로 재도달했으나 wall 사유가 재현되지 않음 — reason=' + secondOver.reason + '(이전 게임 상태 잔존으로 인한 오탐 의심)');
          }
          if (secondOver.head.x !== 19 || secondOver.head.y !== 10) {
            throw new Error('AC-INTEG-1/AC-WALL-5 회귀: 재현된 벽 충돌의 머리 좌표가 1차와 다름 — head=' + JSON.stringify(secondOver.head));
          }
          if (!secondOver.overlayReason || secondOver.overlayReason.indexOf('벽') === -1) {
            throw new Error('AC-INTEG-1 회귀: 재현된 게임오버 오버레이 문구에 "벽" 이 없음: "' + secondOver.overlayReason + '"');
          }
          console.log('[step4] AC-INTEG-1 OK — 재시작 후 동일 방식 재도달 시 wall 사유·경계 좌표가 그대로 재현됨(오탐·조기 게임오버 없음)');

          // ── STEP 5: 콘솔 에러 없음 ──
          console.log('[step5] 수집된 콘솔 에러:', JSON.stringify(consoleErrors));
          if (consoleErrors.length > 0) {
            throw new Error('콘솔 에러 ' + consoleErrors.length + '건:\\n' + consoleErrors.slice(0, 3).join('\\n'));
          }

          console.log('[OK] BF-975: 벽 충돌 경계 보존(AC-WALL-5) + 재시작 계약(AC-INTEG-3) + 재현(AC-INTEG-1) 통과');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-975",
          },
          body: JSON.stringify({
            url,
            label: "벽 충돌 경계 보존→다시하기 재시작→벽 충돌 재현 [BF-975]",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `BF-975 E2E 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });
  } // end else (E2E_SKIP)
} // end else (MODULE_SKIP)
