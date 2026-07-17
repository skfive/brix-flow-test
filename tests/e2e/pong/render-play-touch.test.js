// tests/e2e/pong/render-play-touch.test.js
// BF-915 · /phase18-games/pong 실 브라우저 E2E 회귀 가드 (테스터 소유)
//
// 보호 대상 (BF-915 수용 기준):
//   AC1-E2E — 페이지 렌더: 진입 시 타이틀·캔버스·시작 오버레이·스코어보드(0:0)가
//             표시되고, 360px 뷰포트에서 가로 스크롤이 발생하지 않는다.
//   AC2-E2E — 게임 루프 동작: "시작" 클릭 후 오버레이가 사라지고 공이 실제로
//             움직인다(requestAnimationFrame 물리 루프가 살아있음을 실측).
//   AC3-E2E — 점수 집계: 랠리 진행 중 득점 시 스코어보드 DOM 텍스트가 내부 게임
//             상태·aria-label 과 일치하게 "누적" 갱신된다(1점째·2점째 모두 확인).
//   AC4-E2E — 360px 터치 컨트롤: 캔버스 드래그(Pointer Events) 시 플레이어 패들이
//             planner §5.3 좌표 변환식대로 즉시 추종하고(AC-TOUCH-01), 캔버스
//             밖으로 나가도 setPointerCapture 로 추종이 끊기지 않는다(AC-TOUCH-02).
//
// dev(BF-913) 가 이미 검증한 항목 (재작성 금지 — tests/pong-BF913.test.js):
//   COURT/PADDLE/BALL 등 물리 상수, reflectWall/paddleBounce/updateCpu/checkScore/
//   checkWinner/makeServe/clampDt 등 logic.js 순수 함수 정확성(node:vm 샌드박스),
//   index.html 마크업 id/aria-live/data-role, styles.css 토큰 존재.
//   → 이 파일은 그 로직을 "블랙박스 입력"으로만 사용하고 재검증하지 않는다.
//
// tester 고유 영역 (본 파일):
//   1. 실 브라우저 DOM/canvas 레벨에서 "렌더 → 시작 → 게임 루프 → 득점 집계 →
//      360px 터치 드래그"가 실제로 이어지는지(dev PR 은 이 통합 사용자 흐름을
//      검증하지 않음 — 순수 함수 단위로만 검증했음).
//   2. id="overlay" 존재 — dev 테스트는 `class="pong-overlay"` 만 정규식으로
//      확인했고 id 는 미확인. 본 E2E 스크립트가 getElementById("overlay") 로
//      직접 의존하므로 별도 정적 가드로 고정한다(§0).
//
// 결정론 확보 기법 (물리 로직 재검증 아님 — 순수 E2E 타이밍 제어용, §0 코멘트 참고):
//   page.addInitScript 으로 logic.js 가 window.PongLogic 을 할당하는 시점을
//   가로채 ballHitsPaddle 만 다음과 같이 감싼다.
//     - CPU 패들(x=CPU_X) 판정은 항상 false → CPU 는 절대 막지 못함
//     - 플레이어 패들(x=PLAYER_X) 판정은 X 겹침만으로 항상 true → 플레이어는
//       절대 실점하지 않음
//   반사각 계산(paddleBounce)·CPU 추적(updateCpu) 등 물리 공식 자체는 원본
//   그대로 실행되므로 dev 가 이미 검증한 계산 로직을 재검증하지 않는다 —
//   "누가 득점하는가"만 결정론화해 무작위 대기 없이 득점 집계 UI를 관찰한다.
//   같은 훅으로 createInitialState 반환 객체 참조를 window.__brixPongState 에
//   저장해 스코어보드 DOM 텍스트와 내부 상태를 상호 대조한다(AC3-E2E).
//
// 실행: node --test tests/e2e/pong/render-play-touch.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/e2e/pong/render-play-touch.test.js

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
  describe("BF-915 (module scope skip)", () => {
    test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) =>
      t.skip(`BRIX_TEST_MODULE=${TEST_MODULE} ≠ pong — BF-915 가드 스킵`));
  });
} else {
  // ═══════════════════════════════════════════════════════════
  // §0. 정적 가드 — 본 E2E 스크립트가 직접 의존하는 selector (dev 미검증분만)
  // ═══════════════════════════════════════════════════════════
  describe("BF-915 §0 정적 가드 — E2E 스크립트 의존 selector", () => {
    test('§0-1 index.html — id="overlay" 존재 (dev 테스트는 class 만 확인, id 는 본 E2E 의 getElementById 직접 의존 대상)', () => {
      const html = readPongFile("index.html");
      assert.ok(
        html.includes('id="overlay"'),
        'index.html 에 id="overlay" 가 없습니다 — BF-915 E2E 스크립트가 getElementById("overlay") 로 의존합니다',
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // E2E 헬퍼 (기존 e2e 가드와 동일 패턴 — tests/snake-BF874-e2e.test.js 참고)
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
    test("[E2E] BF-915 BRIX_E2E_SKIP=1 — 전체 E2E skip (CI 결정성)", (t) =>
      t.skip("BRIX_E2E_SKIP=1"));
  } else {
    // ═══════════════════════════════════════════════════════════
    // §1. E2E — 렌더 → 시작(게임 루프) → 득점 집계(누적) → 360px 터치 드래그
    // ═══════════════════════════════════════════════════════════
    test("BF-915 E2E §1: 렌더→시작→게임루프→득점 집계(누적)→360px 터치 드래그 전체 여정", async (t) => {
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

          // ── STEP 0: 결정론 훅 등록 (페이지 스크립트 실행 전, addInitScript) ──
          // PongLogic 할당을 가로채 ballHitsPaddle 만 감싼다:
          //  - CPU 패들 판정은 항상 false → CPU 는 절대 막지 못함
          //  - 플레이어 패들 판정은 X 겹침만으로 항상 true → 플레이어는 절대 실점 안 함
          // paddleBounce/updateCpu 등 반사각·AI 계산 자체는 원본 그대로 유지한다
          // (dev 검증 영역 재검증 아님 — "누가 득점하는가"만 결정론화).
          // createInitialState 반환 객체 참조를 window.__brixPongState 에 저장해
          // DOM 텍스트와 내부 상태를 상호 대조하는 데 사용한다.
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
                const origHits = v.ballHitsPaddle;
                v.ballHitsPaddle = function (ball, paddleX, paddle) {
                  if (paddleX === v.CPU_X) return false;
                  if (paddleX === v.PLAYER_X) {
                    return ball.x + v.BALL_RADIUS >= paddleX && ball.x - v.BALL_RADIUS <= paddleX + v.PADDLE_WIDTH;
                  }
                  return origHits.call(v, ball, paddleX, paddle);
                };
                real = v;
              },
            });
          });

          // ── STEP 1: 360px 뷰포트로 진입 (Epic 명시 요구) ──────────────────
          await page.setViewportSize({ width: 360, height: 740 });
          await page.reload();
          await page.waitForSelector('#overlay[data-state="start"]', { timeout: 8000 });
          console.log('[step1] 360px 뷰포트 로드 + 시작 오버레이 노출 OK');

          // ── STEP 2 (AC1-E2E): 최초 렌더 — 타이틀·캔버스·스코어보드(0:0) ───
          const initial = await page.evaluate(() => ({
            title: document.querySelector('h1') ? document.querySelector('h1').textContent : '',
            canvasExists: !!document.getElementById('court'),
            playerScore: document.querySelector('[data-role="player-score"]').textContent,
            cpuScore: document.querySelector('[data-role="cpu-score"]').textContent,
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          }));
          console.log('[step2] 초기 렌더 상태:', JSON.stringify(initial));
          if (!initial.title.includes('Pong 아케이드')) {
            throw new Error('AC1 회귀: h1 타이틀에 "Pong 아케이드" 가 없음: "' + initial.title + '"');
          }
          if (!initial.canvasExists) {
            throw new Error('AC1 회귀: #court 캔버스가 렌더되지 않음');
          }
          if (initial.playerScore !== '0' || initial.cpuScore !== '0') {
            throw new Error('AC1 회귀: 초기 스코어보드가 0:0 이 아님 — player=' + initial.playerScore + ' cpu=' + initial.cpuScore);
          }
          if (initial.scrollWidth > initial.clientWidth + 1) {
            throw new Error('AC1 회귀(360px): 가로 스크롤 발생 — scrollWidth=' + initial.scrollWidth + ' clientWidth=' + initial.clientWidth);
          }
          console.log('[step2] AC1(렌더) OK — 타이틀/캔버스/스코어보드/360px 가로스크롤 없음 확인');

          // ── STEP 3 (AC2-E2E): 시작 클릭 → 오버레이 사라짐 → 게임 루프 동작 ──
          await page.click('#btn-start');
          await page.waitForFunction(
            () => document.getElementById('overlay').hasAttribute('hidden'),
            { timeout: 5000 }
          );
          console.log('[step3] 시작 클릭 → 오버레이 hidden 전환 OK');

          const ballAt0 = await page.evaluate(() => ({ x: window.__brixPongState.ball.x, y: window.__brixPongState.ball.y }));
          await new Promise(r => setTimeout(r, 300));
          const ballAt1 = await page.evaluate(() => ({ x: window.__brixPongState.ball.x, y: window.__brixPongState.ball.y }));
          console.log('[step3] 공 위치 변화:', JSON.stringify(ballAt0), '->', JSON.stringify(ballAt1));
          if (ballAt0.x === ballAt1.x && ballAt0.y === ballAt1.y) {
            throw new Error('AC2 회귀: 시작 후 300ms 가 지나도 공 위치가 전혀 바뀌지 않음 — 게임 루프(rAF 물리)가 동작하지 않는 것으로 의심됨');
          }
          console.log('[step3] AC2(게임 루프) OK — 공이 실제로 이동함');

          // ── STEP 4 (AC3-E2E): 득점 집계 — 내부 상태와 스코어보드 DOM 누적 일치 ──
          await page.waitForFunction(
            () => window.__brixPongState && window.__brixPongState.score.player >= 1,
            { timeout: 20000 }
          );
          const afterFirstScore = await page.evaluate(() => ({
            internalPlayer: window.__brixPongState.score.player,
            internalCpu: window.__brixPongState.score.cpu,
            domPlayer: document.querySelector('[data-role="player-score"]').textContent,
            domCpu: document.querySelector('[data-role="cpu-score"]').textContent,
            ariaLabel: document.querySelector('.pong-scoreboard').getAttribute('aria-label'),
          }));
          console.log('[step4] 1점째 득점 후 상태:', JSON.stringify(afterFirstScore));
          if (String(afterFirstScore.internalPlayer) !== afterFirstScore.domPlayer) {
            throw new Error('AC3 회귀: 내부 score.player(' + afterFirstScore.internalPlayer + ') 와 스코어보드 DOM("' + afterFirstScore.domPlayer + '") 불일치');
          }
          if (afterFirstScore.internalCpu !== 0 || afterFirstScore.domCpu !== '0') {
            throw new Error('AC3 회귀: CPU 패들을 항상 미스 처리했는데도 CPU 가 득점함 — 득점 판정 로직 회귀 의심 (internalCpu=' + afterFirstScore.internalCpu + ' domCpu=' + afterFirstScore.domCpu + ')');
          }
          if (!afterFirstScore.ariaLabel || afterFirstScore.ariaLabel.indexOf(String(afterFirstScore.internalPlayer)) === -1) {
            throw new Error('AC3 회귀: 스코어보드 aria-label 이 갱신된 점수를 반영하지 않음: "' + afterFirstScore.ariaLabel + '"');
          }
          console.log('[step4] AC3(1점째) OK — 내부 상태/DOM 텍스트/aria-label 모두 일치');

          await page.waitForFunction(
            () => window.__brixPongState && window.__brixPongState.score.player >= 2,
            { timeout: 20000 }
          );
          const afterSecondScore = await page.evaluate(() => ({
            internalPlayer: window.__brixPongState.score.player,
            domPlayer: document.querySelector('[data-role="player-score"]').textContent,
          }));
          console.log('[step4] 2점째 득점 후 상태:', JSON.stringify(afterSecondScore));
          if (String(afterSecondScore.internalPlayer) !== afterSecondScore.domPlayer || afterSecondScore.internalPlayer < 2) {
            throw new Error('AC3 회귀(누적): 2점째 집계 실패 — internal=' + afterSecondScore.internalPlayer + ' dom="' + afterSecondScore.domPlayer + '"');
          }
          console.log('[step4] AC3(누적 집계) OK — 2점째도 정확히 반영됨(단발성 갱신이 아님)');

          // ── STEP 5 (AC4-E2E / AC-TOUCH-01): 360px 캔버스 드래그 → 패들 즉시 추종 ──
          // 득점 직후 point-paused -> playing 자동 전환(POINT_PAUSE_MS=800ms)을 기다려
          // 드래그가 실제로 반영되는 상태(playing)를 보장한다.
          await page.waitForFunction(
            () => window.__brixPongState && window.__brixPongState.status === 'playing',
            { timeout: 3000 }
          );

          async function dragTo(targetLogicalY) {
            const rect = await page.evaluate(() => {
              const r = document.getElementById('court').getBoundingClientRect();
              return { left: r.left, top: r.top, width: r.width, height: r.height };
            });
            const clientX = rect.left + rect.width / 2;
            const startClientY = rect.top + rect.height / 2;
            const targetClientY = rect.top + (targetLogicalY / 400) * rect.height;
            await page.mouse.move(clientX, startClientY);
            await page.mouse.down();
            await page.mouse.move(clientX, targetClientY, { steps: 5 });
            const playerY = await page.evaluate(() => window.__brixPongState.paddles.player.y);
            await page.mouse.up();
            return playerY;
          }

          const dragTopY = await dragTo(60);
          const expectedTop = Math.max(0, Math.min(320, 60 - 40));
          console.log('[step5] 상단 드래그(logicalY=60) -> player.y=' + dragTopY + ' (기대~' + expectedTop + ')');
          if (Math.abs(dragTopY - expectedTop) > 4) {
            throw new Error('AC-TOUCH-01 회귀: 상단 드래그 후 player.y=' + dragTopY + ' — 기대값(' + expectedTop + ')과 4px 초과 오차. 좌표 변환식(planner §5.3) 회귀 의심');
          }

          const dragBottomY = await dragTo(340);
          const expectedBottom = Math.max(0, Math.min(320, 340 - 40));
          console.log('[step5] 하단 드래그(logicalY=340) -> player.y=' + dragBottomY + ' (기대~' + expectedBottom + ')');
          if (Math.abs(dragBottomY - expectedBottom) > 4) {
            throw new Error('AC-TOUCH-01 회귀: 하단 드래그 후 player.y=' + dragBottomY + ' — 기대값(' + expectedBottom + ')과 4px 초과 오차');
          }
          console.log('[step5] AC4/AC-TOUCH-01 OK — 360px 캔버스 드래그가 패들 위치를 즉시 추종함');

          // ── STEP 6 (AC-TOUCH-02): 포인터 캡처 — 캔버스 밖으로 나가도 추종 유지 ──
          const rectForCapture = await page.evaluate(() => {
            const r = document.getElementById('court').getBoundingClientRect();
            return { left: r.left, top: r.top, width: r.width, height: r.height };
          });
          const startX = rectForCapture.left + rectForCapture.width / 2;
          const startY = rectForCapture.top + rectForCapture.height / 2;
          await page.mouse.move(startX, startY);
          await page.mouse.down();
          const outsideY = rectForCapture.top + rectForCapture.height + 200;
          await page.mouse.move(startX, outsideY, { steps: 5 });
          const playerYOutside = await page.evaluate(() => window.__brixPongState.paddles.player.y);
          await page.mouse.up();
          console.log('[step6] 캔버스 밖(y=' + outsideY + ')으로 드래그 -> player.y=' + playerYOutside + ' (기대: 하단 클램프 320 근접)');
          if (playerYOutside < 300) {
            throw new Error('AC-TOUCH-02 회귀: 캔버스 경계 밖으로 드래그 시 패들이 하단 클램프(320)까지 추종하지 못함(player.y=' + playerYOutside + ') — setPointerCapture 로 pointermove 가 유실되는 것으로 의심됨');
          }
          console.log('[step6] AC-TOUCH-02 OK — setPointerCapture 로 캔버스 밖 드래그도 패들 추종 유지');

          // ── STEP 7: 콘솔 에러 없음 확인 ────────────────────────────────
          console.log('[step7] 수집된 콘솔 에러:', JSON.stringify(consoleErrors));
          if (consoleErrors.length > 0) {
            throw new Error('콘솔 에러 ' + consoleErrors.length + '건 발생:\\n' + consoleErrors.slice(0, 3).join('\\n'));
          }

          console.log('[OK] BF-915: 렌더->시작->게임루프->득점집계(누적)->360px 터치드래그(AC-TOUCH-01/02) 전체 여정 통과');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-915",
          },
          body: JSON.stringify({
            url,
            label: "렌더→시작→득점 집계(누적)→360px 터치 드래그 전체 여정 [BF-915]",
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
