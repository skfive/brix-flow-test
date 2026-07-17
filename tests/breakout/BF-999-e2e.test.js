// BF-999 · /demo/breakout-canary 실 브라우저 E2E 회귀 가드 (tester 소유)
//
// 관련: docs/planning/breakout-BF-988.md(기획) · docs/design/breakout-BF-988.md(디자인) ·
//       demo/breakout-canary/{index.html,styles.css,logic.js,main.js}(구현, BF-994).
// 본 파일은 리뷰 통과 후 머지된 최종 코드 기준으로 e2e-runner 실 브라우저 호출을 통해
// "페이지 렌더 · 패들 조작(포인터 드래그 + 키보드) · 벽돌 파괴(점수) ·
//  승리/패배 경로 전이"를 직접 구동해 검증한다. epic 마커에 따라 related(관련 module
// 회귀 검증) 범위로 수행하되, 본 canary 는 phase18-games/breakout 계약을 그대로
// 승계했으므로 그 물리/전이 계약이 이 route 에서도 동일하게 동작하는지를 본 파일이 직접 확인한다.
//
// ── 중복 금지 (dev 가 이미 커버 — 재작성 X) ──────────────────────────────
//   demo/breakout-canary/logic.test.js:
//     - vanilla-static file:// 안전 가드(fetch/XHR/외부 URL·import/export/module script 0건)
//     - 마크업 계약(canvas#board 360x480, data-role=score/lives, id=overlay/serve-hint,
//       btn-start/btn-resume/btn-again/btn-menu/btn-start-bar/btn-pause/btn-restart,
//       canary 라우트 타이틀, logic.js·main.js 비-module script 로드)
//     - CSS 토큰 존재(--board-bg/--paddle-fill/--brick-row-1, aspect-ratio 3/4, touch-action:none)
//     - logic.js 순수 함수 전수(벽/패들/벽돌 반사·점수·생명 감소·게임오버/승리 전이·
//       패들 클램프·델타타임 클램프·키 상쇄·발사 벡터 결정론)
//   → 본 파일은 이 항목들을 정적으로 다시 검증하지 않는다. logic.js 물리 공식의 정확성
//     자체는 이미 node:vm 단위 테스트로 전수 검증됨 — 여기서는 "실 브라우저에서 그 물리가
//     실제 사용자 입력(포인터/키보드)에 반응해 DOM/HUD 를 갱신하는가"만 관찰한다.
//
// ── 본 파일이 보호하는 대상 (작업 AC) ─────────────────────────────────────
//   AC-render : `/demo/breakout-canary/` 진입 시 타이틀·캔버스·HUD(점수 0·생명 3)·
//               시작 오버레이가 실제 DOM 으로 렌더된다.
//   AC-input  : 포인터 드래그(§Test A)·키보드(§Test B) 두 조작 경로 모두 실제
//               패들 이동/발사에 반영된다(dev canary 스모크는 1건만 확인했음).
//   AC-brick  : 벽돌 파괴 시 점수가 실제로 누적된다.
//   AC-win    : 마지막 벽돌 파괴 시 승리 오버레이(타이틀·아이콘·최종 점수·버튼)로
//               전이하고 루프가 정지한다.
//   AC-lose   : 생명 소진(3→2→1→0) 시 게임오버 오버레이로 전이하고 루프가 정지하며,
//               "다시하기"로 점수/생명/보드가 초기화된다.
//
// 결정론 확보 기법 (물리/충돌 로직 재검증 아님 — 순수 E2E 타이밍 제어용, BF-933 과 동일 기법 승계):
//   page.addInitScript 으로 logic.js 가 window.BreakoutLogic 을 할당하는 시점을 가로채
//   L.launch() 를 감싼다. 원본 launch() 를 그대로 호출해 상태 전이(serve→playing)는
//   dev 코드 그대로 실행하고, 결과 발사 벡터만 "정확히 수직(vx=0)"으로 덮어써 매 실행마다
//   동일한 컬럼으로 공이 왕복하게 만든다. §Test A 는 추가로 L.update() 를 감싸 "최초 1회
//   벽돌 파괴가 일어난 그 다음"에만 bricksAlive/status 를 승리로 단축시킨다(40개를 실제로
//   다 깨는 데 필요한 수십 회 왕복을 피하기 위함) — 이 단축은 update() 가 반환한 이후의
//   결과값만 덮어쓸 뿐, 벽/패들/벽돌 반사 공식이나 스캔 로직 자체는 전혀 손대지 않는다.
//
// 실행: node --test tests/breakout/BF-999-e2e.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/breakout/BF-999-e2e.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 breakout 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "breakout";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MODULE_DIR = path.join(REPO_ROOT, "demo", "breakout-canary");

function readModuleFile(name) {
  return fs.readFileSync(path.join(MODULE_DIR, name), "utf-8");
}

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ═══════════════════════════════════════════════════════════
  // §0. 정적 가드 — 본 E2E 스크립트가 직접 의존하는 selector 중 dev 가
  //     명시 검증하지 않은 것만 고정한다(dev 테스트 범위는 파일 상단 주석 참고).
  // ═══════════════════════════════════════════════════════════
  test('§0-1 index.html — id="overlay-title"/id="overlay-stat"/id="overlay-icon" 존재 (승리·게임오버 문구를 getElementById 로 직접 읽음)', () => {
    const html = readModuleFile("index.html");
    assert.ok(html.includes('id="overlay-title"'), 'index.html 에 id="overlay-title" 가 없습니다');
    assert.ok(html.includes('id="overlay-stat"'), 'index.html 에 id="overlay-stat" 가 없습니다');
    assert.ok(html.includes('id="overlay-icon"'), 'index.html 에 id="overlay-icon" 가 없습니다');
  });

  test('§0-2 index.html — data-state="start" 초기값 존재 (오버레이 상태를 attribute selector 로 직접 대기)', () => {
    const html = readModuleFile("index.html");
    assert.ok(html.includes('data-state="start"'), 'index.html 에 data-state="start" 초기값이 없습니다');
  });

  test('§0-3 index.html — class="life life--full" 초기 하트 마크업 존재 (초기 생명 3 렌더를 클래스로 직접 카운트)', () => {
    const html = readModuleFile("index.html");
    assert.ok(html.includes("life life--full"), 'index.html 에 초기 "life life--full" 하트 마크업이 없습니다');
  });

  // ─────────────────────────────────────────────────────────────
  // §Test A — 렌더 → 포인터 드래그 발사(패들 조작 경로 1) → 벽돌 파괴(점수) → 승리 전이
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-999 E2E(A): /demo/breakout-canary/ 렌더 + 포인터 드래그 발사 + 벽돌 파괴(점수 누적) + 승리 전이",
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
        const url = `http://${selfHost}:${port}/demo/breakout-canary/`;
        const scriptText = `
          const consoleErrors = [];
          page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });
          page.on('pageerror', (err) => {
            consoleErrors.push('pageerror: ' + (err && err.message ? err.message : String(err)));
          });

          // ── STEP 0: 결정론 훅 등록 (페이지 스크립트 실행 전, addInitScript) ──
          // launch(): 원본 그대로 호출 후 발사 벡터만 수직(vx=0)으로 고정 — 반사 공식 불변.
          // update(): 원본 그대로 호출 후 "최초 1회 벽돌 파괴 직후"만 승리로 단축 —
          //           40개를 전부 깨는 수십 회 왕복을 피하기 위한 테스트 전용 단축.
          await page.addInitScript(() => {
            let real;
            Object.defineProperty(window, 'BreakoutLogic', {
              configurable: true,
              get() { return real; },
              set(v) {
                var origLaunch = v.launch;
                v.launch = function (state, rand) {
                  var out = origLaunch.call(v, state, rand);
                  if (state.status === 'playing') {
                    state.ball.vx = 0;
                    state.ball.vy = -v.BALL_SPEED;
                  }
                  return out;
                };
                var origUpdate = v.update;
                v.update = function (state, dt, inputVX, rand) {
                  var beforeAlive = state.bricksAlive;
                  var out = origUpdate.call(v, state, dt, inputVX, rand);
                  if (beforeAlive === v.BRICK_TOTAL && state.bricksAlive < beforeAlive && state.bricksAlive > 0) {
                    state.bricksAlive = 0;
                    state.status = 'win';
                  }
                  return out;
                };
                real = v;
              },
            });
          });

          // ── STEP 1 (AC-render): 진입 ──
          await page.setViewportSize({ width: 360, height: 740 });
          await page.reload();
          await page.waitForSelector('#overlay[data-state="start"]', { timeout: 8000 });

          const initial = await page.evaluate(() => ({
            title: document.title,
            h1: document.querySelector('h1') ? document.querySelector('h1').textContent : '',
            canvasExists: !!document.getElementById('board'),
            score: document.querySelector('[data-role="score"]').textContent,
            livesLabel: document.querySelector('[data-role="lives"]').getAttribute('aria-label'),
            fullHearts: document.querySelectorAll('.life--full').length,
            emptyHearts: document.querySelectorAll('.life--empty').length,
            overlayHidden: document.getElementById('overlay').hidden,
          }));
          if (!initial.title.includes('벽돌깨기') || !initial.h1.includes('벽돌깨기')) {
            throw new Error('AC-render 회귀: title/h1 에 "벽돌깨기" 없음 — title="' + initial.title + '" h1="' + initial.h1 + '"');
          }
          if (!initial.canvasExists) {
            throw new Error('AC-render 회귀: #board 캔버스가 렌더되지 않음');
          }
          if (initial.score !== '0' || initial.livesLabel !== '생명 3') {
            throw new Error('AC-render 회귀: 초기 HUD 가 점수 0/생명 3 이 아님 — score=' + initial.score + ' lives="' + initial.livesLabel + '"');
          }
          if (initial.fullHearts !== 3 || initial.emptyHearts !== 0) {
            throw new Error('AC-render 회귀: 초기 하트가 3 full/0 empty 가 아님 — full=' + initial.fullHearts + ' empty=' + initial.emptyHearts);
          }
          if (initial.overlayHidden) {
            throw new Error('AC-render 회귀: 시작 오버레이가 hidden 상태(노출되어야 함)');
          }
          console.log('[A-step1] AC-render OK — 타이틀/캔버스/HUD(0/생명3)/오버레이');

          // ── STEP 2: "시작" 클릭 → start→serve 전이 ──
          await page.click('#btn-start');
          await new Promise((r) => setTimeout(r, 80));
          const afterStart = await page.evaluate(() => ({
            overlayHidden: document.getElementById('overlay').hidden,
            serveHintHidden: document.getElementById('serve-hint').hidden,
          }));
          if (!afterStart.overlayHidden || afterStart.serveHintHidden) {
            throw new Error('AC-input 회귀: "시작" 클릭 후 start→serve 전이 실패(오버레이/serve-hint 상태 불일치)');
          }
          console.log('[A-step2] start→serve 전이 OK');

          // ── STEP 3 (AC-input, 포인터 드래그): 캔버스 좌측 끝으로 포인터 이동 후 down ──
          // serve 상태에서 canvas pointerdown 은 "패들 위치 지정 + 즉시 발사"를 한 번에
          // 수행한다(main.js onPointerDown). 좌측 끝(paddleX=0)에 정렬하면 공이 벽돌
          // 1열(col0) 컬럼에 정확히 정렬되어 결정론적으로 명중한다.
          const rect = await page.evaluate(() => {
            const r = document.getElementById('board').getBoundingClientRect();
            return { left: r.left, top: r.top, width: r.width, height: r.height };
          });
          const px = rect.left + 1;
          const py = rect.top + rect.height / 2;
          await page.mouse.move(px, py);
          await page.mouse.down();
          await new Promise((r) => setTimeout(r, 80));
          await page.mouse.up();
          const afterPointerLaunch = await page.evaluate(() => ({
            overlayHidden: document.getElementById('overlay').hidden,
            serveHintHidden: document.getElementById('serve-hint').hidden,
          }));
          if (!afterPointerLaunch.overlayHidden || !afterPointerLaunch.serveHintHidden) {
            throw new Error('AC-input 회귀(포인터): 포인터 down 으로 serve→playing 전이 실패(오버레이/serve-hint 여전히 노출)');
          }
          console.log('[A-step3] AC-input(포인터 드래그 패들 위치 지정 + 발사) OK — serve→playing 전이');

          // ── STEP 4 (AC-brick): 벽돌 1개 파괴 → 점수 증가 ──
          await page.waitForFunction(
            () => {
              const n = parseInt(document.querySelector('[data-role="score"]').textContent, 10);
              return Number.isInteger(n) && n > 0;
            },
            { timeout: 15000 },
          );
          const scoreAfterBrick = parseInt(await page.evaluate(() => document.querySelector('[data-role="score"]').textContent), 10);
          if (scoreAfterBrick !== 10) {
            throw new Error('AC-brick 회귀: 벽돌 1개 파괴 후 점수가 10 이 아님(SCORE_PER_BRICK 불일치 의심) — score=' + scoreAfterBrick);
          }
          console.log('[A-step4] AC-brick OK — 벽돌 파괴 후 score=' + scoreAfterBrick);

          // ── STEP 5 (AC-win): 승리 전이 대기 (결정론 훅으로 최초 1회 파괴 직후 단축) ──
          await page.waitForFunction(
            () => document.getElementById('overlay').getAttribute('data-state') === 'win',
            { timeout: 10000 },
          );
          const win = await page.evaluate(() => ({
            overlayHidden: document.getElementById('overlay').hidden,
            overlayClass: document.getElementById('overlay').className,
            overlayTitle: document.getElementById('overlay-title').textContent,
            overlayIcon: document.getElementById('overlay-icon').textContent,
            overlayStatHidden: document.getElementById('overlay-stat').hidden,
            overlayStat: document.getElementById('overlay-stat').textContent,
            score: document.querySelector('[data-role="score"]').textContent,
            btnAgainHidden: document.getElementById('btn-again').hidden,
            btnMenuHidden: document.getElementById('btn-menu').hidden,
            btnPauseDisabled: document.getElementById('btn-pause').disabled,
          }));
          if (win.overlayHidden) {
            throw new Error('AC-win 회귀: 승리 오버레이가 노출되지 않음');
          }
          if (win.overlayClass.indexOf('is-win') === -1) {
            throw new Error('AC-win 회귀: 오버레이에 is-win 클래스가 없음 — class="' + win.overlayClass + '"');
          }
          if (!win.overlayTitle.includes('클리어')) {
            throw new Error('AC-win 회귀: 오버레이 타이틀에 "클리어" 없음 — "' + win.overlayTitle + '"');
          }
          if (win.overlayIcon !== '🎉') {
            throw new Error('AC-win 회귀: 승리 아이콘이 🎉 가 아님 — "' + win.overlayIcon + '"');
          }
          if (win.overlayStatHidden || win.overlayStat.indexOf(win.score) === -1) {
            throw new Error('AC-win 회귀: 최종 점수 텍스트가 HUD 점수(' + win.score + ')와 불일치 — "' + win.overlayStat + '"');
          }
          if (win.btnAgainHidden || win.btnMenuHidden) {
            throw new Error('AC-win 회귀: 승리 시 "다시하기"/"메뉴로" 버튼이 노출되지 않음');
          }
          if (!win.btnPauseDisabled) {
            throw new Error('AC-win 회귀: 승리 후에도 일시정지 버튼이 활성 상태(루프 정지 안 됨으로 의심)');
          }
          console.log('[A-step5] AC-win OK — 승리 오버레이(타이틀/아이콘/최종점수)/버튼 노출 + pause disabled');

          // ── STEP 6: 루프 정지 확인 — 대기 후에도 HUD 불변 ──
          const beforeWait = await page.evaluate(() => document.querySelector('[data-role="score"]').textContent);
          await new Promise((r) => setTimeout(r, 500));
          const afterWait = await page.evaluate(() => document.querySelector('[data-role="score"]').textContent);
          if (beforeWait !== afterWait) {
            throw new Error('AC-win 회귀: 승리 후에도 HUD 가 계속 변함 — 루프가 정지하지 않음');
          }
          console.log('[A-step6] 루프 정지 OK — 승리 후 HUD 불변');

          if (consoleErrors.length > 0) {
            throw new Error('콘솔/페이지 에러 ' + consoleErrors.length + '건 발생:\\n' + consoleErrors.slice(0, 5).join('\\n'));
          }

          console.log('[A-OK] BF-999(A): 렌더->포인터 드래그 발사->벽돌 파괴(점수)->승리 전이->루프 정지 전체 통과');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-999",
          },
          body: JSON.stringify({
            url,
            label: "벽돌깨기 canary 렌더→포인터 드래그 발사→벽돌 파괴→승리 전이",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `BF-999(A) E2E 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ─────────────────────────────────────────────────────────────
  // §Test B — 키보드 조작(패들 조작 경로 2) → 생명 순차 감소(3→2→1→0) →
  //           게임오버 전이 → "다시하기" 리셋
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-999 E2E(B): /demo/breakout-canary/ 키보드 조작 + 생명 순차 감소(3→2→1→0) → 게임오버 전이 → 다시하기 리셋",
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
        const url = `http://${selfHost}:${port}/demo/breakout-canary/`;
        const scriptText = `
          const consoleErrors = [];
          page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });
          page.on('pageerror', (err) => {
            consoleErrors.push('pageerror: ' + (err && err.message ? err.message : String(err)));
          });

          // ── STEP 0: 결정론 훅 — 발사 벡터만 수직(vx=0) 고정 (반사 공식 불변) ──
          await page.addInitScript(() => {
            let real;
            Object.defineProperty(window, 'BreakoutLogic', {
              configurable: true,
              get() { return real; },
              set(v) {
                var origLaunch = v.launch;
                v.launch = function (state, rand) {
                  var out = origLaunch.call(v, state, rand);
                  if (state.status === 'playing') {
                    state.ball.vx = 0;
                    state.ball.vy = -v.BALL_SPEED;
                  }
                  return out;
                };
                real = v;
              },
            });
          });

          await page.setViewportSize({ width: 360, height: 740 });
          await page.reload();
          await page.waitForSelector('#overlay[data-state="start"]', { timeout: 8000 });

          // ── STEP 1: "시작" 클릭 → start→serve ──
          await page.click('#btn-start');
          await new Promise((r) => setTimeout(r, 80));

          // ── STEP 2 (AC-input, 키보드): ← 홀드로 패들 정렬 후 Space 발사 ──
          await page.keyboard.down('ArrowLeft');
          await new Promise((r) => setTimeout(r, 700));
          await page.keyboard.up('ArrowLeft');
          await page.keyboard.press(' ');
          await new Promise((r) => setTimeout(r, 100));
          const afterLaunch1 = await page.evaluate(() => ({
            overlayHidden: document.getElementById('overlay').hidden,
            serveHintHidden: document.getElementById('serve-hint').hidden,
          }));
          if (!afterLaunch1.overlayHidden || !afterLaunch1.serveHintHidden) {
            throw new Error('AC-input 회귀(키보드): Space 발사 후 serve→playing 전이 실패');
          }
          console.log('[B-step2] AC-input(키보드 ← 정렬 + Space 발사) OK — serve→playing 전이');

          // ── STEP 3 (AC-lose #1): 공이 돌아오기 전 패들을 반대쪽 끝으로 이동 → 미스 ──
          await page.keyboard.down('ArrowRight');
          await new Promise((r) => setTimeout(r, 700));
          await page.keyboard.up('ArrowRight');
          await page.waitForFunction(
            () => document.querySelector('[data-role="lives"]').getAttribute('aria-label') === '생명 2',
            { timeout: 10000 },
          );
          const afterMiss1 = await page.evaluate(() => ({
            serveHintHidden: document.getElementById('serve-hint').hidden,
            overlayHidden: document.getElementById('overlay').hidden,
          }));
          if (afterMiss1.serveHintHidden) {
            throw new Error('AC-lose 회귀: 생명 손실 후 serve 재부착(serve-hint 노출) 실패');
          }
          if (!afterMiss1.overlayHidden) {
            throw new Error('AC-lose 회귀: 생명 손실 후(lives>0) 오버레이가 노출됨(serve 는 숨김이어야 함)');
          }
          console.log('[B-step3] AC-lose(생명 3->2) OK — serve 재부착');

          // ── STEP 4 (AC-lose #2): 재발사 후 반대쪽으로 이동 → 두 번째 미스 ──
          await page.keyboard.press(' ');
          await new Promise((r) => setTimeout(r, 100));
          await page.keyboard.down('ArrowLeft');
          await new Promise((r) => setTimeout(r, 700));
          await page.keyboard.up('ArrowLeft');
          await page.waitForFunction(
            () => document.querySelector('[data-role="lives"]').getAttribute('aria-label') === '생명 1',
            { timeout: 10000 },
          );
          console.log('[B-step4] AC-lose(생명 2->1) OK');

          // ── STEP 5 (AC-lose #3, 게임오버): 세 번째 미스 → lives=0 → gameover ──
          await page.keyboard.press(' ');
          await new Promise((r) => setTimeout(r, 100));
          await page.keyboard.down('ArrowRight');
          await new Promise((r) => setTimeout(r, 700));
          await page.keyboard.up('ArrowRight');
          await page.waitForFunction(
            () => document.getElementById('overlay').getAttribute('data-state') === 'gameover',
            { timeout: 10000 },
          );
          const gameover = await page.evaluate(() => ({
            livesLabel: document.querySelector('[data-role="lives"]').getAttribute('aria-label'),
            overlayHidden: document.getElementById('overlay').hidden,
            overlayClass: document.getElementById('overlay').className,
            overlayTitle: document.getElementById('overlay-title').textContent,
            overlayIcon: document.getElementById('overlay-icon').textContent,
            overlayStatHidden: document.getElementById('overlay-stat').hidden,
            overlayStat: document.getElementById('overlay-stat').textContent,
            score: document.querySelector('[data-role="score"]').textContent,
            btnAgainHidden: document.getElementById('btn-again').hidden,
            btnMenuHidden: document.getElementById('btn-menu').hidden,
            btnPauseDisabled: document.getElementById('btn-pause').disabled,
          }));
          if (gameover.livesLabel !== '생명 0') {
            throw new Error('AC-lose 회귀: 게임오버 시점 생명 표시가 "생명 0" 이 아님 — ' + gameover.livesLabel);
          }
          if (gameover.overlayHidden) {
            throw new Error('AC-lose 회귀: 게임오버 오버레이가 노출되지 않음');
          }
          if (gameover.overlayClass.indexOf('is-gameover') === -1) {
            throw new Error('AC-lose 회귀: 오버레이에 is-gameover 클래스가 없음 — class="' + gameover.overlayClass + '"');
          }
          if (!gameover.overlayTitle.includes('게임 오버')) {
            throw new Error('AC-lose 회귀: 오버레이 타이틀에 "게임 오버" 없음 — "' + gameover.overlayTitle + '"');
          }
          if (gameover.overlayIcon !== '✕') {
            throw new Error('AC-lose 회귀: 게임오버 아이콘이 ✕ 가 아님 — "' + gameover.overlayIcon + '"');
          }
          if (gameover.overlayStatHidden || gameover.overlayStat.indexOf(gameover.score) === -1) {
            throw new Error('AC-lose 회귀: 최종 점수 텍스트가 HUD 점수(' + gameover.score + ')와 불일치 — "' + gameover.overlayStat + '"');
          }
          if (gameover.btnAgainHidden || gameover.btnMenuHidden) {
            throw new Error('AC-lose 회귀: 게임오버 시 "다시하기"/"메뉴로" 버튼이 노출되지 않음');
          }
          if (!gameover.btnPauseDisabled) {
            throw new Error('AC-lose 회귀: 게임오버 후에도 일시정지 버튼이 활성 상태(루프 정지 안 됨으로 의심)');
          }
          console.log('[B-step5] AC-lose(게임오버) OK — 생명 0 + 오버레이(타이틀/아이콘/최종점수)/버튼 노출 + pause disabled');

          // ── STEP 6: 루프 정지 확인 — 대기 후에도 HUD 불변 ──
          const beforeWait = await page.evaluate(() => ({
            score: document.querySelector('[data-role="score"]').textContent,
            lives: document.querySelector('[data-role="lives"]').getAttribute('aria-label'),
          }));
          await new Promise((r) => setTimeout(r, 500));
          const afterWait = await page.evaluate(() => ({
            score: document.querySelector('[data-role="score"]').textContent,
            lives: document.querySelector('[data-role="lives"]').getAttribute('aria-label'),
          }));
          if (beforeWait.score !== afterWait.score || beforeWait.lives !== afterWait.lives) {
            throw new Error('AC-lose 회귀: 게임오버 후에도 HUD 가 계속 변함 — 루프가 정지하지 않음');
          }
          console.log('[B-step6] 루프 정지 OK — 게임오버 후 HUD 불변');

          // ── STEP 7 (AC-lose, 리셋): "다시하기" 클릭 → gameover→serve, 점수/생명 초기화 ──
          await page.click('#btn-again');
          await new Promise((r) => setTimeout(r, 80));
          const afterReset = await page.evaluate(() => ({
            overlayHidden: document.getElementById('overlay').hidden,
            serveHintHidden: document.getElementById('serve-hint').hidden,
            score: document.querySelector('[data-role="score"]').textContent,
            livesLabel: document.querySelector('[data-role="lives"]').getAttribute('aria-label'),
            fullHearts: document.querySelectorAll('.life--full').length,
          }));
          if (!afterReset.overlayHidden || afterReset.serveHintHidden) {
            throw new Error('AC-lose 회귀(리셋): "다시하기" 클릭 후 gameover→serve 전이 실패');
          }
          if (afterReset.score !== '0') {
            throw new Error('AC-lose 회귀(리셋): "다시하기" 후 점수가 0 으로 초기화되지 않음 — score=' + afterReset.score);
          }
          if (afterReset.livesLabel !== '생명 3' || afterReset.fullHearts !== 3) {
            throw new Error('AC-lose 회귀(리셋): "다시하기" 후 생명이 3 으로 초기화되지 않음 — label="' + afterReset.livesLabel + '" fullHearts=' + afterReset.fullHearts);
          }
          console.log('[B-step7] AC-lose(다시하기 리셋) OK — 점수0/생명3/serve 전이');

          if (consoleErrors.length > 0) {
            throw new Error('콘솔/페이지 에러 ' + consoleErrors.length + '건 발생:\\n' + consoleErrors.slice(0, 5).join('\\n'));
          }

          console.log('[B-OK] BF-999(B): 키보드 조작->생명 감소(3->2->1->0)->게임오버->루프 정지->다시하기 리셋 전체 통과');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-999",
          },
          body: JSON.stringify({
            url,
            label: "벽돌깨기 canary 키보드 조작→생명 감소→게임오버→다시하기 리셋",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `BF-999(B) E2E 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (tests/breakout/BF-933-e2e.test.js 와 동일 패턴)
// ─────────────────────────────────────────────────────────────

/**
 * e2e-runner 도달성 확인. 못 닿으면 test.skip() 호출 후 false 반환.
 * (CI 환경에는 컨테이너 없음 — fail 처리하면 PR 자동 머지 트리거 안 됨.)
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
 * 페르소나 컨테이너의 service hostname. e2e-runner 가 정적 서버로 도달할 때 사용.
 * host.docker.internal / localhost 는 절대 사용 X (다른 컨테이너).
 */
function personaHost() {
  return (
    process.env.BRIX_PERSONA_HOST ?? process.env.BRIX_WORKER_HOSTNAME ?? "worker"
  );
}

/**
 * 0.0.0.0 바인딩 임시 정적 서버. 임의 포트로 동시 실행 충돌 회피.
 */
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
  return new Promise((resolve) => {
    server.listen(0, "0.0.0.0", () => resolve(server));
  });
}
