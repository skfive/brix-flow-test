// tests/e2e/breakout-lite/keyboard-pause-resume-focus.test.js
// BF-971 · /phase18-games/breakout-lite 키보드 일시정지·재개·재시작 E2E 회귀 가드 (테스터 소유)
//
// 배경: dev(BF-968) 가 .board-wrap tabindex=-1 + focus-visible 링, 재개/시작/재시작
// 전이 시 boardWrap.focus() 이동, .overlay__title:focus-visible 링, 일시정지 안내
// 문구 정제를 구현했다(commit 70e98d0). dev 테스트(tests/breakout-lite-BF968.test.js)는
// node:vm 샌드박스 + 정규식으로 "소스에 그 로직/CSS 가 존재하는가"만 확인했다 —
// 실 브라우저에서 keydown → rAF 루프 → 실제 DOM 포커스 이동 → focus-visible 렌더가
// 회귀 없이 이어지는지는 아직 아무도 관찰하지 않았다. 본 파일이 그 간극을 메운다.
//
// dev(BF-968) 가 이미 검증한 항목 (재작성 금지 — tests/breakout-lite-BF968.test.js):
//   node:vm 하니스로 일시정지 중 dt/입력 반복 적용해도 공·패들·점수·벽돌 동결(로직 자체),
//   phase 전이 공식(togglePause/restart/startGame), main.js 키 핸들러 소스 정규식
//   (ArrowLeft/Right, A/D, Space→togglePause, R→재시작), .overlay__title:focus-visible /
//   .board-wrap:focus-visible CSS 규칙 존재, .board-wrap tabindex="-1" 속성 존재,
//   boardWrap.focus()/overlayTitle.focus() 호출 소스 존재, 일시정지 안내 문구 정규식,
//   --color-accent/--color-focus-ring 토큰 값 불변, file:// 안전 가드.
//   → 이 파일은 그 로직·CSS 규칙의 "존재"를 재검증하지 않고, 실 브라우저가 그것을
//     실제로 적용해 관찰 가능한 결과(진짜 focus, 진짜 focus-visible, 진짜 rAF 동결)를
//     만들어내는가만 블랙박스로 확인한다.
//
// dev(BF-943/945) 가 이미 검증한 항목 (재작성 금지 — tests/e2e/breakout-lite/start-control-outcome-restart.test.js):
//   실 브라우저 시작(클릭)→키보드/터치 패들 이동→Space 발사→승리→재시작(R/버튼)→패배→재시작 전체 여정,
//   내부 상태-HUD DOM 일치, 콘솔 에러 0건, id="overlay"/"overlay-title"/"serve-hint"/"btn-again" 정적 가드.
//   → 이 파일은 승리/패배 경로·터치 조작을 다루지 않으며, 키보드 이동은 일시정지 흐름
//     진입을 위한 최소 확인(방향 부호만)으로 가볍게만 다룬다 — 정밀 좌표 검증은 BF-945 영역.
//
// ── 본 파일이 보호하는 대상 (BF-971 AC) ─────────────────────────────────────
//   AC-시작        : "시작" 클릭 → idle→serve 전이 + board-wrap 실 포커스 이동(BF-968 §6.2 신규).
//   AC-이동        : serve 상태에서 ArrowRight 홀드로 패들이 실제로 이동한다(회귀 확인).
//   AC-일시정지 동결: playing 중 Space → paused, 실 시간(rAF) 400ms 경과해도 공 좌표/속도·
//                     점수·패들 위치가 완전히 동결된다(main.js loop() 가 paused 에서
//                     L.update() 를 실제로 건너뛰는지 실 타이밍으로 확인).
//   AC-포커스(신규) : 일시정지 진입 시 #overlay-title 로 실 DOM 포커스 + :focus-visible 링
//                     렌더(computed outline). 재개/재시작으로 오버레이가 숨겨지면
//                     .board-wrap 으로 포커스가 돌아온다(hidden 오버레이 포커스 고립 방지).
//   AC-재개        : paused 중 Space → playing 복귀 + 동결 해제(공 재이동) + board-wrap 포커스 복귀.
//   AC-재시작      : paused 상태에서 R → serve 로 자동 복귀 + 점수/생명/벽돌 초기화 +
//                     board-wrap 포커스 이동(BF-945 은 win/lose 화면에서의 재시작만 다룸 —
//                     "일시정지 중 재시작" 경로는 BF-968 로 새로 이어지는 경로라 여기서 다룬다).
//
// 결정론 확보 기법 (물리/전이 공식 재검증 아님 — 순수 E2E 상태 관찰용):
//   page.addInitScript 으로 window.BreakoutLiteLogic 할당을 가로채 createInitialState()
//   반환 객체 참조를 window.__brixBreakoutState 에 저장한다. 강제 승패 훅은 쓰지 않는다 —
//   본 시나리오는 승패 판정을 거치지 않고 시작→이동→발사→일시정지→재개→일시정지 중
//   재시작만 왕복하므로 실제 물리 update() 를 그대로 타도 결정론이 깨지지 않는다.
//
// 실행: node --test tests/e2e/breakout-lite/keyboard-pause-resume-focus.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/e2e/breakout-lite/keyboard-pause-resume-focus.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

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
  describe("BF-971 (module scope skip)", () => {
    test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) =>
      t.skip(`BRIX_TEST_MODULE=${TEST_MODULE} ≠ breakout-lite — BF-971 가드 스킵`));
  });
} else {
  // ─────────────────────────────────────────────────────────────
  // E2E 헬퍼 — request-local static 서버 + request-local BrowserContext(e2e-runner 격리).
  // 서버는 매 테스트 실행마다 새 임시 포트로 뜨고 finally 에서 반드시 close 된다 —
  // 병렬 Epic tester 실행 시 포트/컨텍스트 충돌 없음(기존 breakout-lite/pong e2e 와 동일 패턴).
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
    // 0 포트 = OS 가 매 실행마다 빈 임시 포트 할당 → 병렬 실행 시 포트 충돌 없음.
    return new Promise((resolve) => server.listen(0, "0.0.0.0", () => resolve(server)));
  }

  if (E2E_SKIP) {
    test("[E2E] BF-971 BRIX_E2E_SKIP=1 — 전체 E2E skip (CI 결정성)", (t) =>
      t.skip("BRIX_E2E_SKIP=1"));
  } else {
    test(
      "BF-971 E2E: 시작→이동→Space 일시정지(동결)→포커스 링→Space 재개→일시정지 중 R 재시작",
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

            // ── STEP 0: 결정론 훅 — createInitialState 반환 참조를 window.__brixBreakoutState 에 저장 ──
            await page.addInitScript(() => {
              let real;
              Object.defineProperty(window, 'BreakoutLiteLogic', {
                configurable: true,
                get() { return real; },
                set(v) {
                  const origCreate = v.createInitialState;
                  v.createInitialState = function () {
                    const s = origCreate.call(v);
                    window.__brixBreakoutState = s;
                    return s;
                  };
                  real = v;
                },
              });
            });

            await page.reload();
            await page.waitForSelector('#btn-start', { timeout: 8000 });

            // ── STEP 1 (AC-시작 + BF-968 §6.2 신규 포커스): "시작" 클릭 → idle→serve, board-wrap 실 포커스 ──
            await page.click('#btn-start');
            await page.waitForFunction(() => window.__brixBreakoutState.phase === 'serve', { timeout: 3000 });
            const afterStart = await page.evaluate(() => ({
              overlayHidden: document.getElementById('overlay').hidden,
              activeClass: document.activeElement ? document.activeElement.className : null,
            }));
            if (!afterStart.overlayHidden) {
              throw new Error('AC-시작 회귀: serve 진입 후 오버레이가 여전히 노출됨');
            }
            if (!afterStart.activeClass || !afterStart.activeClass.includes('board-wrap')) {
              throw new Error('BF-968 §6.2 회귀: 시작 후 포커스가 board-wrap 으로 이동하지 않음 — activeElement.className=' + afterStart.activeClass);
            }
            console.log('[step1] AC-시작 + board-wrap 실 포커스 이동 OK');

            // ── STEP 2 (AC-이동, 회귀 확인용 가벼운 터치): ArrowRight 홀드 → 패들 우측 이동 ──
            const paddleBefore = await page.evaluate(() => window.__brixBreakoutState.paddleX);
            await page.keyboard.down('ArrowRight');
            await new Promise((r) => setTimeout(r, 250));
            await page.keyboard.up('ArrowRight');
            const paddleAfter = await page.evaluate(() => window.__brixBreakoutState.paddleX);
            if (!(paddleAfter > paddleBefore)) {
              throw new Error('AC-이동 회귀: ArrowRight 홀드 후 패들이 이동하지 않음 — before=' + paddleBefore + ' after=' + paddleAfter);
            }
            console.log('[step2] AC-이동(키보드 우측) OK — paddleX ' + paddleBefore + ' -> ' + paddleAfter);

            // ── STEP 3: Space 로 발사 → serve→playing ──
            await page.keyboard.press('Space');
            await page.waitForFunction(() => window.__brixBreakoutState.phase === 'playing', { timeout: 3000 });
            await new Promise((r) => setTimeout(r, 200)); // 공이 실제로 움직일 시간 확보
            console.log('[step3] Space 발사(serve->playing) OK');

            // ── STEP 4 (AC-일시정지 동결 — BF-968 신규 회귀 대상): Space → playing→paused, 실시간 400ms 동결 ──
            await page.keyboard.press('Space');
            await page.waitForFunction(() => window.__brixBreakoutState.phase === 'paused', { timeout: 3000 });
            const frozen = await page.evaluate(() => ({
              ball: {
                x: window.__brixBreakoutState.ball.x,
                y: window.__brixBreakoutState.ball.y,
                vx: window.__brixBreakoutState.ball.vx,
                vy: window.__brixBreakoutState.ball.vy,
              },
              score: window.__brixBreakoutState.score,
              paddleX: window.__brixBreakoutState.paddleX,
            }));
            console.log('[step4] 일시정지 진입 OK — 동결 스냅샷: ' + JSON.stringify(frozen));

            await new Promise((r) => setTimeout(r, 400));
            const afterWait = await page.evaluate(() => ({
              phase: window.__brixBreakoutState.phase,
              ball: { x: window.__brixBreakoutState.ball.x, y: window.__brixBreakoutState.ball.y },
              score: window.__brixBreakoutState.score,
              paddleX: window.__brixBreakoutState.paddleX,
            }));
            if (afterWait.phase !== 'paused') {
              throw new Error('AC-일시정지 회귀: 일시정지 상태가 유지되지 않음 — phase=' + afterWait.phase);
            }
            if (afterWait.ball.x !== frozen.ball.x || afterWait.ball.y !== frozen.ball.y) {
              throw new Error('AC-일시정지 동결 회귀: 실시간 400ms 경과에도 공 좌표가 변함 — 이전(' + JSON.stringify(frozen.ball) + ') vs 이후(' + JSON.stringify(afterWait.ball) + ') — main.js loop() 가 paused 중 L.update() 를 건너뛰지 않을 가능성');
            }
            if (afterWait.score !== frozen.score) {
              throw new Error('AC-일시정지 동결 회귀: 일시정지 중 점수가 변함(' + frozen.score + ' -> ' + afterWait.score + ')');
            }
            if (afterWait.paddleX !== frozen.paddleX) {
              throw new Error('AC-일시정지 동결 회귀: 일시정지 중 패들 위치가 변함(입력이 차단되지 않음)');
            }
            console.log('[step4] AC-일시정지 동결 OK — 실시간 400ms 경과해도 공/점수/패들 완전 불변');

            // ── STEP 5 (BF-968 §6.1 신규 포커스 계약): overlay-title 실 포커스 + :focus-visible 링 + 안내 문구 ──
            const pauseFocus = await page.evaluate(() => {
              const el = document.getElementById('overlay-title');
              const cs = getComputedStyle(el);
              return {
                activeId: document.activeElement ? document.activeElement.id : null,
                focusVisible: el.matches(':focus-visible'),
                outlineStyle: cs.outlineStyle,
                outlineWidth: cs.outlineWidth,
                dataState: document.getElementById('overlay').getAttribute('data-state'),
                desc: document.getElementById('overlay-desc').textContent,
              };
            });
            console.log('[step5] 일시정지 오버레이 포커스 상태: ' + JSON.stringify(pauseFocus));
            if (pauseFocus.activeId !== 'overlay-title') {
              throw new Error('BF-968 §6.1 회귀: 일시정지 시 #overlay-title 로 실 포커스가 이동하지 않음 — activeElement=' + pauseFocus.activeId);
            }
            if (pauseFocus.dataState !== 'paused') {
              throw new Error('회귀: 일시정지 오버레이 data-state 가 paused 가 아님(' + pauseFocus.dataState + ')');
            }
            if (!pauseFocus.focusVisible) {
              throw new Error('BF-968 §6.1 회귀: #overlay-title 이 :focus-visible 상태가 아님 — 포커스 링이 렌더되지 않을 수 있음');
            }
            if (pauseFocus.outlineStyle === 'none' || pauseFocus.outlineWidth === '0px') {
              throw new Error('BF-968 §6.1 회귀: overlay-title computed outline 없음(outlineStyle=' + pauseFocus.outlineStyle + ', outlineWidth=' + pauseFocus.outlineWidth + ')');
            }
            if (!pauseFocus.desc.includes('Space') || !pauseFocus.desc.includes('R')) {
              throw new Error('BF-968 §6.3 회귀: 일시정지 안내 문구에 재개(Space)/재시작(R) 경로 안내 누락 — desc="' + pauseFocus.desc + '"');
            }
            console.log('[step5] BF-968 포커스 링 + 안내 문구 OK');

            // ── STEP 6 (AC-재개 + BF-968 §6.2): Space → paused→playing, board-wrap 포커스 복귀 + 동결 해제 ──
            await page.keyboard.press('Space');
            await page.waitForFunction(() => window.__brixBreakoutState.phase === 'playing', { timeout: 3000 });
            const resumeFocusClass = await page.evaluate(() => (document.activeElement ? document.activeElement.className : null));
            if (!resumeFocusClass || !resumeFocusClass.includes('board-wrap')) {
              throw new Error('BF-968 §6.2 회귀: 재개 후 포커스가 board-wrap 으로 이동하지 않음 — activeElement.className=' + resumeFocusClass);
            }
            await new Promise((r) => setTimeout(r, 300));
            const resumedBall = await page.evaluate(() => ({ x: window.__brixBreakoutState.ball.x, y: window.__brixBreakoutState.ball.y }));
            console.log('[step6] 재개 후 300ms 공 위치: ' + JSON.stringify(resumedBall) + ' (동결 스냅샷: ' + JSON.stringify(frozen.ball) + ')');
            if (resumedBall.x === frozen.ball.x && resumedBall.y === frozen.ball.y) {
              throw new Error('AC-재개 회귀: Space 로 재개해도 공이 다시 움직이지 않음(동결 해제 실패)');
            }
            console.log('[step6] AC-재개 OK — board-wrap 포커스 복귀 + 공 재이동');

            // ── STEP 7 (AC-재시작 — 일시정지 중 R, BF-945 미커버 경로): 다시 일시정지 → R → serve 자동 복귀 + 초기화 ──
            await page.keyboard.press('Space'); // playing -> paused
            await page.waitForFunction(() => window.__brixBreakoutState.phase === 'paused', { timeout: 3000 });
            await page.keyboard.press('r');
            await page.waitForFunction(() => window.__brixBreakoutState.phase === 'serve', { timeout: 3000 });
            const afterRestart = await page.evaluate(() => ({
              score: window.__brixBreakoutState.score,
              lives: window.__brixBreakoutState.lives,
              bricksRemaining: window.__brixBreakoutState.bricksRemaining,
              overlayHidden: document.getElementById('overlay').hidden,
              activeClass: document.activeElement ? document.activeElement.className : null,
            }));
            console.log('[step7] 일시정지 중 R 재시작 후 상태: ' + JSON.stringify(afterRestart));
            if (afterRestart.score !== 0 || afterRestart.lives !== 3 || afterRestart.bricksRemaining !== 24) {
              throw new Error('AC-재시작 회귀(일시정지 중 R): 초기화 실패 — ' + JSON.stringify(afterRestart));
            }
            if (!afterRestart.overlayHidden) {
              throw new Error('AC-재시작 회귀(일시정지 중 R): 재시작 후 serve 상태인데 오버레이가 노출됨');
            }
            if (!afterRestart.activeClass || !afterRestart.activeClass.includes('board-wrap')) {
              throw new Error('BF-968 §6.2 회귀: 일시정지 중 R 재시작 후 포커스가 board-wrap 으로 이동하지 않음 — ' + afterRestart.activeClass);
            }
            console.log('[step7] AC-재시작(일시정지 중 키보드 R) OK — 점수/생명/벽돌 초기화 + board-wrap 포커스');

            // ── STEP 8: 콘솔/페이지 에러 0건 ──
            if (consoleErrors.length > 0) {
              throw new Error('콘솔/페이지 에러 ' + consoleErrors.length + '건 발생:\\n' + consoleErrors.slice(0, 5).join('\\n'));
            }

            console.log('[OK] BF-971: 시작->이동->Space 일시정지(동결)->포커스 링->Space 재개->일시정지 중 R 재시작 전체 흐름 통과');
          `;

          const res = await fetch("http://e2e-runner:3030/run", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
              "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-971",
            },
            body: JSON.stringify({
              url,
              label: "Breakout Lite 키보드 시작·이동·일시정지 동결·포커스·재개·재시작 [BF-971]",
              scriptText,
              timeoutMs: 60000,
            }),
          });
          const json = await res.json();
          assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
          assert.ok(
            json.passed,
            `BF-971 E2E 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2500)}`,
          );
        } finally {
          await new Promise((resolve) => server.close(resolve));
        }
      },
    );
  } // end else (E2E_SKIP)
} // end else (MODULE_SKIP)
