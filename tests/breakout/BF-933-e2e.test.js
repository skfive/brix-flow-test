// BF-933 · /phase18-games/breakout 실 브라우저 E2E 회귀 가드 (tester 소유)
//
// 관련: docs/plan/breakout-BF-928.md(기획) · docs/design/breakout-BF-928.md(디자인) ·
//       phase18-games/breakout/{index.html,styles.css,logic.js,main.js}(구현, BF-931).
// 본 파일은 머지된 최종 코드 기준으로 e2e-runner 실 브라우저 호출을 통해
// "페이지 렌더 · 입력에 따른 게임 상태 전이(점수·생명·게임오버) · 반응형 표시"
// 회귀를 직접 구동해 검증한다.
//
// ── 중복 금지 (dev 가 이미 커버 — 재작성 X) ──────────────────────────────
//   tests/breakout-BF931.test.js:
//     - vanilla-static file:// 안전 가드(import/export·type=module·fetch/외부 URL·
//       localStorage 0건)
//     - 마크업 계약(canvas#board 360x480 + touch-action:none, data-role=score/lives +
//       aria-live, board-overlay/serve-hint 클래스, btn-start/btn-pause/btn-menu id,
//       noscript, title/h1 "벽돌깨기")
//     - CSS 토큰 존재(--board-bg/--paddle-fill/--ball-fill/--brick-row-1~5/--color-accent,
//       aspect-ratio 3/4)
//     - logic.js 순수 함수 전수(벽/패들 반사각·벽돌 충돌·스캔 순서·점수·발사 벡터
//       범위·생명 손실/게임오버/승리 전이·동시 키 상쇄·델타타임 클램프·결정론)
//   → 본 파일은 이 항목들을 정적으로 다시 검증하지 않는다. logic.js 물리 공식의
//     정확성 자체는 이미 node:vm 단위 테스트로 전수 검증됨 — 여기서는 "실 브라우저에서
//     그 물리가 실제 사용자 입력에 반응해 DOM/HUD 를 갱신하는가"만 관찰한다.
//
// ── 본 파일이 보호하는 대상 (작업 AC) ─────────────────────────────────────
//   AC-render     : `/phase18-games/breakout/` 진입 시 타이틀·캔버스·HUD(점수 0·
//                   생명 3)·시작 오버레이가 실제 DOM 으로 렌더된다.
//   AC-responsive : 360px(모바일)·800px(데스크톱) 양쪽에서 가로 스크롤 없이 보드가
//                   표시되고, board-wrap 이 360px 상한을 유지한다.
//   AC-state      : 키보드 입력(← 이동 → Space 발사)에 따라 실제 충돌이 일어나
//                   점수가 누적 증가하고, 패들을 비켜 공을 놓치면 생명이 순차
//                   감소하며(3→2→1→0), 생명 소진 시 게임오버 오버레이(사유·최종
//                   점수·다시하기/메뉴로 버튼)로 전이하고 루프가 정지한다.
//
// 결정론 확보 기법 (물리/충돌 로직 재검증 아님 — 순수 E2E 타이밍 제어용):
//   page.addInitScript 으로 logic.js 가 window.BreakoutLogic 을 할당하는 시점을
//   가로채 L.launch() 를 감싼다. 원본 launch() 를 그대로 호출해 상태 전이
//   (serve→playing)는 dev 코드 그대로 실행하고, 그 결과로 나온 발사 각도(60~80°
//   무작위, dev AC-RULE-06 에서 이미 1000회 검증됨)만 "정확히 수직(vx=0)"으로
//   덮어써 매 실행마다 동일한 컬럼으로 공이 왕복하게 만든다. 벽/패들/벽돌 반사
//   공식 자체는 손대지 않으므로 실제 충돌 판정은 dev 코드 그대로 관찰된다.
//   패들을 왼쪽 끝(x=0)까지 붙이면 공이 브릭 1열(col0) 안쪽에 정확히 정렬되어
//   결정론적으로 벽돌에 명중한다(경계 4px 갭에 걸치는 좌표는 피함).
//
// 실행: node --test tests/breakout/BF-933-e2e.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/breakout/BF-933-e2e.test.js

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
const MODULE_DIR = path.join(REPO_ROOT, "phase18-games", "breakout");

function readModuleFile(name) {
  return fs.readFileSync(path.join(MODULE_DIR, name), "utf-8");
}

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ═══════════════════════════════════════════════════════════
  // §0. 정적 가드 — 본 E2E 스크립트가 직접 의존하는 selector (dev 미검증분만)
  //     dev(BF-931) 테스트는 board-overlay/serve-hint "클래스"·btn-start/pause/menu
  //     "id" 만 확인했다. 아래 id 들은 본 파일의 getElementById 호출이 직접
  //     의존하지만 dev 테스트가 확인하지 않은 것들이라 여기서 별도 고정한다.
  // ═══════════════════════════════════════════════════════════
  test("§0-1 index.html — id=\"overlay\" 존재 (오버레이 hidden/data-state 를 getElementById 로 직접 읽음)", () => {
    const html = readModuleFile("index.html");
    assert.ok(html.includes('id="overlay"'), 'index.html 에 id="overlay" 가 없습니다');
  });

  test("§0-2 index.html — id=\"overlay-title\"/id=\"overlay-stat\" 존재 (게임오버 타이틀·최종 점수 텍스트를 getElementById 로 직접 읽음)", () => {
    const html = readModuleFile("index.html");
    assert.ok(html.includes('id="overlay-title"'), 'index.html 에 id="overlay-title" 가 없습니다');
    assert.ok(html.includes('id="overlay-stat"'), 'index.html 에 id="overlay-stat" 가 없습니다');
  });

  test("§0-3 index.html — id=\"serve-hint\" 존재 (serve 대기 상태를 getElementById 로 직접 읽음)", () => {
    const html = readModuleFile("index.html");
    assert.ok(html.includes('id="serve-hint"'), 'index.html 에 id="serve-hint" 가 없습니다');
  });

  test("§0-4 index.html — id=\"btn-again\" 존재 (게임오버 시 재시작 버튼 노출을 getElementById 로 직접 읽음)", () => {
    const html = readModuleFile("index.html");
    assert.ok(html.includes('id="btn-again"'), 'index.html 에 id="btn-again" 가 없습니다');
  });

  test('§0-5 index.html — class="board-wrap" 존재 (반응형 가드가 boundingClientRect 를 직접 읽음)', () => {
    const html = readModuleFile("index.html");
    assert.ok(/class=["'][^"']*\bboard-wrap\b[^"']*["']/.test(html), 'index.html 에 class="board-wrap" 가 없습니다');
  });

  // ─────────────────────────────────────────────────────────────
  // 실 브라우저 E2E — 렌더 → 반응형 → 입력(이동+발사) → 점수 누적 →
  //                   생명 순차 감소(3→2→1→0) → 게임오버 → 루프 정지
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-933 E2E: /phase18-games/breakout/ 진입 렌더 + 반응형(360/800) + 입력→점수 누적→생명 감소→게임오버 전이",
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
        const url = `http://${selfHost}:${port}/phase18-games/breakout/`;
        const scriptText = `
          const consoleErrors = [];
          page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });
          page.on('pageerror', (err) => {
            consoleErrors.push('pageerror: ' + (err && err.message ? err.message : String(err)));
          });

          // ── STEP 0: 결정론 훅 등록 (페이지 스크립트 실행 전, addInitScript) ──
          // launch() 는 원본 그대로 호출(serve→playing 전이는 dev 코드 그대로)하고,
          // 결과 발사 벡터만 "정확히 수직(vx=0)"으로 덮어써 재현 가능한 컬럼 왕복을
          // 만든다. 벽/패들/벽돌 반사 공식은 전혀 건드리지 않는다.
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

          // ── STEP 1 (AC-render): 360px 뷰포트 진입 ──
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
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
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
          if (initial.scrollWidth > initial.clientWidth + 1) {
            throw new Error('AC-responsive 회귀(360px): 가로 스크롤 발생 — scrollWidth=' + initial.scrollWidth + ' clientWidth=' + initial.clientWidth);
          }
          console.log('[step1] AC-render OK — 타이틀/캔버스/HUD(0/생명3)/오버레이/360px 무-스크롤');

          // ── STEP 2 (AC-responsive): 800px 데스크톱 뷰포트 ──
          await page.setViewportSize({ width: 800, height: 900 });
          await new Promise((r) => setTimeout(r, 100));
          const wide = await page.evaluate(() => {
            const wrap = document.querySelector('.board-wrap');
            const rect = wrap.getBoundingClientRect();
            return {
              wrapWidth: rect.width,
              scrollWidth: document.documentElement.scrollWidth,
              clientWidth: document.documentElement.clientWidth,
            };
          });
          if (wide.wrapWidth > 360.5) {
            throw new Error('AC-responsive 회귀(800px): board-wrap 이 360px 상한을 넘음 — width=' + wide.wrapWidth);
          }
          if (wide.scrollWidth > wide.clientWidth + 1) {
            throw new Error('AC-responsive 회귀(800px): 가로 스크롤 발생 — scrollWidth=' + wide.scrollWidth + ' clientWidth=' + wide.clientWidth);
          }
          console.log('[step2] AC-responsive OK — 800px 에서도 board-wrap<=360px + 무-스크롤');

          // 이후 시나리오는 다시 모바일 뷰포트로 복귀
          await page.setViewportSize({ width: 360, height: 740 });

          // ── STEP 3: "시작" 클릭 → start→serve 전이 ──
          await page.click('#btn-start');
          await new Promise((r) => setTimeout(r, 80));
          const afterStart = await page.evaluate(() => ({
            overlayHidden: document.getElementById('overlay').hidden,
            serveHintHidden: document.getElementById('serve-hint').hidden,
          }));
          if (!afterStart.overlayHidden) {
            throw new Error('AC-state 회귀: "시작" 클릭 후 오버레이가 여전히 노출(serve 상태는 숨겨야 함)');
          }
          if (afterStart.serveHintHidden) {
            throw new Error('AC-state 회귀: "시작" 클릭 후 serve-hint 배너가 노출되지 않음');
          }
          console.log('[step3] start→serve 전이 OK — 오버레이 숨김 + serve-hint 노출');

          // ── STEP 4: 패들을 왼쪽 끝까지 이동(← 300px/s, 148px 이동에 충분한 700ms 홀드) ──
          // 패들 x=0 이면 공이 벽돌 1열(col0, x=6~46) 정중앙(x=32)에 정확히 정렬되어
          // 4px 경계 갭에 걸치지 않고 결정론적으로 명중한다.
          await page.keyboard.down('ArrowLeft');
          await new Promise((r) => setTimeout(r, 700));
          await page.keyboard.up('ArrowLeft');

          // ── STEP 5: Space 로 발사 (serve→playing, 훅으로 수직 고정) ──
          await page.keyboard.press(' ');
          await new Promise((r) => setTimeout(r, 100));
          const afterLaunch = await page.evaluate(() => ({
            overlayHidden: document.getElementById('overlay').hidden,
            serveHintHidden: document.getElementById('serve-hint').hidden,
          }));
          if (!afterLaunch.overlayHidden || !afterLaunch.serveHintHidden) {
            throw new Error('AC-state 회귀: Space 발사 후 playing 전이 실패(오버레이/serve-hint 여전히 노출)');
          }
          console.log('[step5] serve→playing 전이 OK (Space 발사)');

          // ── STEP 6 (AC-state 점수): 1번째 벽돌 파괴 — 점수가 0에서 증가 ──
          await page.waitForFunction(
            () => {
              const n = parseInt(document.querySelector('[data-role="score"]').textContent, 10);
              return Number.isInteger(n) && n > 0;
            },
            { timeout: 15000 },
          );
          const score1 = parseInt(await page.evaluate(() => document.querySelector('[data-role="score"]').textContent), 10);
          const livesAfterScore1 = await page.evaluate(() => document.querySelector('[data-role="lives"]').getAttribute('aria-label'));
          if (livesAfterScore1 !== '생명 3') {
            throw new Error('AC-state 회귀: 1번째 벽돌 파괴 시점에 생명이 이미 줄어듦 — ' + livesAfterScore1);
          }
          console.log('[step6] AC-state(점수 1) OK — score=' + score1 + ', lives 그대로(생명 3)');

          // ── STEP 7 (AC-state 점수 누적): 같은 컬럼에서 패들이 그대로 받아쳐 2번째 벽돌 파괴 ──
          await page.waitForFunction(
            (prev) => {
              const n = parseInt(document.querySelector('[data-role="score"]').textContent, 10);
              return Number.isInteger(n) && n > prev;
            },
            score1,
            { timeout: 15000 },
          );
          const score2 = parseInt(await page.evaluate(() => document.querySelector('[data-role="score"]').textContent), 10);
          if (score2 <= score1) {
            throw new Error('AC-state 회귀(누적): 2번째 벽돌 파괴 후 점수가 누적되지 않음 — score1=' + score1 + ' score2=' + score2);
          }
          console.log('[step7] AC-state(점수 누적) OK — score1=' + score1 + ' -> score2=' + score2);

          // ── STEP 8 (AC-state 생명 감소 #1): 패들을 비켜 공을 놓침 ──
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
            score: parseInt(document.querySelector('[data-role="score"]').textContent, 10),
          }));
          if (afterMiss1.serveHintHidden) {
            throw new Error('AC-state 회귀: 생명 손실 후 serve 재부착(serve-hint 노출) 실패');
          }
          if (!afterMiss1.overlayHidden) {
            throw new Error('AC-state 회귀: 생명 손실 후(lives>0) 오버레이가 노출됨(serve 는 숨김이어야 함)');
          }
          if (afterMiss1.score < score2) {
            throw new Error('AC-state 회귀: 생명 손실 후 점수가 감소함(보존되어야 함) — score2=' + score2 + ' 이후=' + afterMiss1.score);
          }
          console.log('[step8] AC-state(생명 3->2) OK — serve 재부착 + 점수 보존(score=' + afterMiss1.score + ')');

          // ── STEP 9 (AC-state 생명 감소 #2): 재발사 후 다시 패들을 비켜 놓침 ──
          await page.keyboard.press(' ');
          await new Promise((r) => setTimeout(r, 100));
          await page.keyboard.down('ArrowLeft');
          await new Promise((r) => setTimeout(r, 700));
          await page.keyboard.up('ArrowLeft');
          await page.waitForFunction(
            () => document.querySelector('[data-role="lives"]').getAttribute('aria-label') === '생명 1',
            { timeout: 10000 },
          );
          console.log('[step9] AC-state(생명 2->1) OK');

          // ── STEP 10 (AC-state 게임오버): 마지막 재발사 후 다시 놓쳐 lives=0 → gameover ──
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
            overlayStatHidden: document.getElementById('overlay-stat').hidden,
            overlayStat: document.getElementById('overlay-stat').textContent,
            score: document.querySelector('[data-role="score"]').textContent,
            btnAgainHidden: document.getElementById('btn-again').hidden,
            btnMenuHidden: document.getElementById('btn-menu').hidden,
            btnPauseDisabled: document.getElementById('btn-pause').disabled,
          }));
          if (gameover.livesLabel !== '생명 0') {
            throw new Error('AC-state 회귀: 게임오버 시점 생명 표시가 "생명 0" 이 아님 — ' + gameover.livesLabel);
          }
          if (gameover.overlayHidden) {
            throw new Error('AC-state 회귀: 게임오버 오버레이가 노출되지 않음');
          }
          if (gameover.overlayClass.indexOf('is-gameover') === -1) {
            throw new Error('AC-state 회귀: 오버레이에 is-gameover 클래스가 없음 — class="' + gameover.overlayClass + '"');
          }
          if (!gameover.overlayTitle.includes('게임 오버')) {
            throw new Error('AC-state 회귀: 오버레이 타이틀에 "게임 오버" 없음 — "' + gameover.overlayTitle + '"');
          }
          if (gameover.overlayStatHidden || gameover.overlayStat.indexOf(gameover.score) === -1) {
            throw new Error('AC-state 회귀: 게임오버 최종 점수 텍스트가 HUD 점수(' + gameover.score + ')와 불일치 — "' + gameover.overlayStat + '"');
          }
          if (gameover.btnAgainHidden || gameover.btnMenuHidden) {
            throw new Error('AC-state 회귀: 게임오버 시 "다시하기"/"메뉴로" 버튼이 노출되지 않음');
          }
          if (!gameover.btnPauseDisabled) {
            throw new Error('AC-state 회귀: 게임오버 후에도 일시정지 버튼이 활성 상태(루프 정지 안 됨으로 의심)');
          }
          console.log('[step10] AC-state(게임오버) OK — 생명 0 + 오버레이(타이틀/최종점수)/버튼 노출 + pause disabled');

          // ── STEP 11: 루프 정지 확인 — 대기 후에도 HUD 불변 ──
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
            throw new Error('AC-state 회귀: 게임오버 후에도 HUD 가 계속 변함 — 루프가 정지하지 않음');
          }
          console.log('[step11] 루프 정지 OK — 게임오버 후 HUD 불변');

          // ── STEP 12: 콘솔/페이지 에러 0건 ──
          if (consoleErrors.length > 0) {
            throw new Error('콘솔/페이지 에러 ' + consoleErrors.length + '건 발생:\\n' + consoleErrors.slice(0, 5).join('\\n'));
          }

          console.log('[OK] BF-933: 렌더->반응형(360/800)->입력(이동+발사)->점수 누적->생명 감소(3->2->1->0)->게임오버->루프 정지 전체 통과');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-933",
          },
          body: JSON.stringify({
            url,
            label: "벽돌깨기 렌더→반응형→입력→점수 누적→생명 감소→게임오버 전체 여정 [BF-933]",
            scriptText,
            timeoutMs: 120000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `BF-933 E2E 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (기존 e2e 가드와 동일 패턴 — tests/dice-e2e-worker-host.test.js /
// tests/e2e/phase18-snake/render-play-direction-gameover.test.js 참고)
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
