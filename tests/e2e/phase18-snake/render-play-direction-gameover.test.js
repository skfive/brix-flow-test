// tests/e2e/phase18-snake/render-play-direction-gameover.test.js
// BF-927 · /phase18-games/snake 실 브라우저 E2E 회귀 가드 (테스터 소유)
//
// 보호 대상 (BF-927 수용 기준):
//   AC1-E2E — 진입 렌더: 360px 뷰포트에서 타이틀·캔버스·시작 오버레이·스코어보드
//             (점수 0 · 최고 0)가 표시되고 가로 스크롤이 발생하지 않는다.
//   AC2-E2E — 뱀 이동·먹이 획득·점수 증가: "시작" 클릭 후 틱 루프가 실제로 뱀을
//             전진시키고, 먹이를 먹으면 길이·점수가 "누적" 갱신되며 DOM 텍스트와
//             내부 게임 상태가 일치한다(1개째·2개째 모두 확인).
//   AC3-E2E — 방향 컨트롤: D-pad(pointerdown) 클릭과 키보드(방향키) 입력 모두로
//             방향이 전환되고, 전환된 방향으로 실제 이동이 이어진다.
//   AC4-E2E — 게임오버: 벽 충돌로 게임오버 전이 시 오버레이가 사유·최종 점수를
//             표시하고 "다시하기"/"메뉴로" 버튼이 노출되며 틱 루프가 멈춘다.
//
// 관련 module 회귀 범위 (Epic AC2 — 기존 페이지 회귀 미탐지):
//   본 모듈은 planner(BF-923)가 루트 /snake 테스트 네임스페이스와의 충돌을 피하려고
//   "phase18-snake" 로 명명했다(tests/snake-BF*.test.js 다수 존재 — 루트 /snake 전용).
//   아래 module-scope 가드의 _BRIX_MY_MODULE 을 "phase18-snake" 로 고정해 focused
//   scope 실행 시 루트 snake·다른 phase18-games 모듈의 회귀 스위트와 상호 간섭 없이
//   독립적으로 skip/실행되도록 한다.
//
// dev(BF-925) 가 이미 검증한 항목 (재작성 금지 — tests/phase18-snake-BF925.test.js):
//   BOARD/CELL/TICK 등 상수, DIRECTION_VECTORS, createInitialSnake/spawnFood/
//   isWallCollision/isSelfCollision/isOpposite/isValidTurn/tick/createPlayState 등
//   logic.js 순수 함수 정확성(node:vm 없이 같은 realm 로드), index.html 마크업
//   (board/overlay/overlay-title/btn-*/data-dir/data-role/aria-live), styles.css
//   토큰 존재, file:// CORS 안전 가드(module/import-export/fetch/외부 URL 0건).
//   → 이 파일은 그 로직을 "블랙박스 입력"으로만 사용하고 재검증하지 않는다.
//
// tester 고유 영역 (본 파일):
//   1. 실 브라우저 DOM/canvas 레벨에서 "렌더 → 시작 → 이동/먹이/점수 누적 →
//      방향 컨트롤(D-pad + 키보드) → 게임오버" 가 실제로 이어지는지(dev PR 은 이
//      통합 사용자 흐름을 검증하지 않음 — 순수 함수 단위로만 검증했음).
//   2. id="overlay-reason" / id="overlay-stat" 존재 — dev 테스트는 id="overlay-title"
//      만 정규식으로 확인했고 이 둘은 미확인. 본 E2E 스크립트가 게임오버 사유·최종
//      점수 텍스트를 getElementById 로 직접 읽으므로 별도 정적 가드로 고정한다(§0).
//
// 결정론 확보 기법 (물리/충돌 로직 재검증 아님 — 순수 E2E 타이밍 제어용):
//   page.addInitScript 으로 logic.js 가 window.SnakeLogic 을 할당하는 시점을 가로채
//   createInitialState/createPlayState/tick 의 반환 food 를 "현재 머리 바로 앞 칸"으로
//   덮어쓴다. spawnFood 의 무작위 위치 계산(dev 검증 영역)은 원본 그대로 호출한 뒤
//   결과만 교체하므로 스폰 로직 자체를 재검증하지 않는다 — "언제 먹이를 먹는가"만
//   결정론화해 무작위 대기 없이 이동/성장/점수 누적/방향전환/벽충돌을 관찰한다.
//   같은 훅으로 매 상태 전이 결과를 window.__brixSnakeState 에 저장해 스코어보드·
//   오버레이 DOM 텍스트와 내부 상태를 상호 대조한다.
//
// 실행: node --test tests/e2e/phase18-snake/render-play-direction-gameover.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/e2e/phase18-snake/render-play-direction-gameover.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SNAKE_DIR = path.join(REPO_ROOT, "phase18-games", "snake");

function readSnakeFile(name) {
  return readFileSync(path.join(SNAKE_DIR, name), "utf-8");
}

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// 루트 /snake(다수 snake-BF*.test.js)와 네임스페이스가 다름에 유의(§ 관련 module).
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "phase18-snake";
const TEST_MODULE = process.env.BRIX_TEST_MODULE;
const MODULE_SKIP =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  TEST_MODULE != null &&
  TEST_MODULE !== _BRIX_MY_MODULE;
const E2E_SKIP = process.env.BRIX_E2E_SKIP === "1";

if (MODULE_SKIP) {
  describe("BF-927 (module scope skip)", () => {
    test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) =>
      t.skip(`BRIX_TEST_MODULE=${TEST_MODULE} ≠ phase18-snake — BF-927 가드 스킵`));
  });
} else {
  // ═══════════════════════════════════════════════════════════
  // §0. 정적 가드 — 본 E2E 스크립트가 직접 의존하는 selector (dev 미검증분만)
  // ═══════════════════════════════════════════════════════════
  describe("BF-927 §0 정적 가드 — E2E 스크립트 의존 selector", () => {
    test('§0-1 index.html — id="overlay-reason" 존재 (게임오버 사유 텍스트를 getElementById 로 직접 읽음)', () => {
      const html = readSnakeFile("index.html");
      assert.ok(
        html.includes('id="overlay-reason"'),
        'index.html 에 id="overlay-reason" 가 없습니다 — BF-927 E2E 스크립트가 getElementById("overlay-reason") 로 의존합니다',
      );
    });

    test('§0-2 index.html — id="overlay-stat" 존재 (게임오버 최종 점수 텍스트를 getElementById 로 직접 읽음)', () => {
      const html = readSnakeFile("index.html");
      assert.ok(
        html.includes('id="overlay-stat"'),
        'index.html 에 id="overlay-stat" 가 없습니다 — BF-927 E2E 스크립트가 getElementById("overlay-stat") 로 의존합니다',
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
    test("[E2E] BF-927 BRIX_E2E_SKIP=1 — 전체 E2E skip (CI 결정성)", (t) =>
      t.skip("BRIX_E2E_SKIP=1"));
  } else {
    // ═══════════════════════════════════════════════════════════
    // §1. E2E — 렌더 → 시작(이동/먹이/점수 누적) → 방향 컨트롤(D-pad+키보드) → 게임오버
    // ═══════════════════════════════════════════════════════════
    test("BF-927 E2E §1: 렌더→시작→이동/먹이/점수 누적→방향 컨트롤(D-pad+키보드)→게임오버 전체 여정", async (t) => {
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

          // ── STEP 0: 결정론 훅 등록 (페이지 스크립트 실행 전, addInitScript) ──
          // SnakeLogic 할당을 가로채 createInitialState/createPlayState/tick 의
          // 반환 food 를 "현재 머리 바로 앞 칸"으로 덮어쓴다. spawnFood 의 무작위
          // 위치 계산(dev 검증 영역)은 원본 그대로 호출된 뒤 결과만 교체하므로
          // 스폰 로직 자체를 재검증하지 않는다 — "언제 먹이를 먹는가"만
          // 결정론화해 무작위 대기 없이 이동/성장/점수 누적을 관찰한다.
          // 매 상태 전이 결과를 window.__brixSnakeState 에 저장해 DOM 텍스트와
          // 내부 상태를 상호 대조하는 데 사용한다.
          await page.addInitScript(() => {
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
                var origCreateInitialState = v.createInitialState;
                v.createInitialState = function (rand) {
                  var s = origCreateInitialState.call(v, rand);
                  s.food = foodAhead(s.snake, s.direction);
                  window.__brixSnakeState = s;
                  return s;
                };
                var origCreatePlayState = v.createPlayState;
                v.createPlayState = function (highScore, rand) {
                  var s = origCreatePlayState.call(v, highScore, rand);
                  s.food = foodAhead(s.snake, s.direction);
                  window.__brixSnakeState = s;
                  return s;
                };
                var origTick = v.tick;
                v.tick = function (state, rand) {
                  var next = origTick.call(v, state, rand);
                  if (next.status === 'playing' && next.food) {
                    next.food = foodAhead(next.snake, next.direction);
                  }
                  window.__brixSnakeState = next;
                  return next;
                };
                real = v;
              },
            });
          });

          // ── STEP 1: 360px 뷰포트로 진입 (D-pad 는 360px 컨트롤로 설계됨) ──
          await page.setViewportSize({ width: 360, height: 740 });
          await page.reload();
          await page.waitForSelector('#overlay[data-state="start"]', { timeout: 8000 });
          console.log('[step1] 360px 뷰포트 로드 + 시작 오버레이 노출 OK');

          // ── STEP 2 (AC1-E2E): 최초 렌더 — 타이틀·캔버스·스코어보드(0/0) ───
          const initial = await page.evaluate(() => ({
            title: document.querySelector('h1') ? document.querySelector('h1').textContent : '',
            canvasExists: !!document.getElementById('board'),
            score: document.querySelector('[data-role="score"]').textContent,
            highScore: document.querySelector('[data-role="high-score"]').textContent,
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          }));
          console.log('[step2] 초기 렌더 상태:', JSON.stringify(initial));
          if (!initial.title.includes('Snake 아케이드')) {
            throw new Error('AC1 회귀: h1 타이틀에 "Snake 아케이드" 가 없음: "' + initial.title + '"');
          }
          if (!initial.canvasExists) {
            throw new Error('AC1 회귀: #board 캔버스가 렌더되지 않음');
          }
          if (initial.score !== '0' || initial.highScore !== '0') {
            throw new Error('AC1 회귀: 초기 스코어보드가 0/0 이 아님 — score=' + initial.score + ' highScore=' + initial.highScore);
          }
          if (initial.scrollWidth > initial.clientWidth + 1) {
            throw new Error('AC1 회귀(360px): 가로 스크롤 발생 — scrollWidth=' + initial.scrollWidth + ' clientWidth=' + initial.clientWidth);
          }
          console.log('[step2] AC1(렌더) OK — 타이틀/캔버스/스코어보드/360px 가로스크롤 없음 확인');

          // ── STEP 3 (AC2-E2E): 시작 클릭 → 오버레이 사라짐 → 이동/먹이/점수 누적 ──
          await page.click('#btn-start');
          await page.waitForFunction(
            () => document.getElementById('overlay').hasAttribute('hidden'),
            { timeout: 5000 }
          );
          console.log('[step3] 시작 클릭 → 오버레이 hidden 전환 OK');

          const headAt0 = await page.evaluate(() => ({ ...window.__brixSnakeState.snake[0] }));
          await page.waitForFunction(
            () => window.__brixSnakeState && window.__brixSnakeState.score >= 10,
            { timeout: 5000 }
          );
          const afterFirstFood = await page.evaluate(() => ({
            internalScore: window.__brixSnakeState.score,
            domScore: document.querySelector('[data-role="score"]').textContent,
            snakeLength: window.__brixSnakeState.snake.length,
            head: { ...window.__brixSnakeState.snake[0] },
          }));
          console.log('[step3] 1개째 먹이 섭취 후:', JSON.stringify(afterFirstFood), '(머리 시작:' + JSON.stringify(headAt0) + ')');
          if (String(afterFirstFood.internalScore) !== afterFirstFood.domScore) {
            throw new Error('AC2 회귀: 내부 score(' + afterFirstFood.internalScore + ') 와 스코어보드 DOM("' + afterFirstFood.domScore + '") 불일치');
          }
          if (afterFirstFood.snakeLength <= 3) {
            throw new Error('AC2 회귀: 먹이 섭취 후에도 뱀 길이가 늘지 않음(길이=' + afterFirstFood.snakeLength + ')');
          }
          if (afterFirstFood.head.x === headAt0.x && afterFirstFood.head.y === headAt0.y) {
            throw new Error('AC2 회귀: 시작 후 머리 위치가 전혀 바뀌지 않음 — 틱 루프(이동)가 동작하지 않는 것으로 의심됨');
          }
          console.log('[step3] AC2(이동/1개째 먹이) OK — 머리 이동 + 길이 증가 + 점수 DOM 일치');

          await page.waitForFunction(
            () => window.__brixSnakeState && window.__brixSnakeState.score >= 20,
            { timeout: 5000 }
          );
          const afterSecondFood = await page.evaluate(() => ({
            internalScore: window.__brixSnakeState.score,
            domScore: document.querySelector('[data-role="score"]').textContent,
            snakeLength: window.__brixSnakeState.snake.length,
            boardAriaLabel: document.getElementById('board').getAttribute('aria-label'),
          }));
          console.log('[step3] 2개째 먹이 섭취 후:', JSON.stringify(afterSecondFood));
          if (String(afterSecondFood.internalScore) !== afterSecondFood.domScore || afterSecondFood.internalScore < 20) {
            throw new Error('AC2 회귀(누적): 2개째 점수 집계 실패 — internal=' + afterSecondFood.internalScore + ' dom="' + afterSecondFood.domScore + '"');
          }
          if (afterSecondFood.snakeLength <= afterFirstFood.snakeLength) {
            throw new Error('AC2 회귀(누적): 2개째 먹이 섭취 후 길이가 추가로 늘지 않음(길이=' + afterSecondFood.snakeLength + ')');
          }
          if (!afterSecondFood.boardAriaLabel || afterSecondFood.boardAriaLabel.indexOf(String(afterSecondFood.internalScore)) === -1) {
            throw new Error('AC2 회귀: 캔버스 aria-label 이 갱신된 점수를 반영하지 않음: "' + afterSecondFood.boardAriaLabel + '"');
          }
          console.log('[step3] AC2(누적) OK — 2개째 먹이도 길이/점수/DOM/aria-label 모두 일치(단발성 갱신 아님)');

          // ── STEP 4 (AC3-E2E): 방향 컨트롤 — D-pad(pointerdown) 클릭 ──
          await page.click('[data-dir="down"]');
          await page.waitForFunction(
            () => window.__brixSnakeState && window.__brixSnakeState.direction === 'down',
            { timeout: 3000 }
          );
          const afterDpad = await page.evaluate(() => ({ ...window.__brixSnakeState.snake[0] }));
          console.log('[step4] D-pad(down) 클릭 → direction=down, head=' + JSON.stringify(afterDpad));
          if (afterDpad.y <= headAt0.y) {
            throw new Error('AC3 회귀: D-pad(down) 클릭 후에도 머리 y 좌표가 증가하지 않음 — D-pad 방향 전환이 실제 이동에 반영되지 않음');
          }
          console.log('[step4] AC3(D-pad) OK — 클릭한 방향(down)으로 실제 이동이 이어짐');

          // ── STEP 5 (AC3-E2E): 방향 컨트롤 — 키보드(ArrowLeft) ──
          await page.keyboard.press('ArrowLeft');
          await page.waitForFunction(
            () => window.__brixSnakeState && window.__brixSnakeState.direction === 'left',
            { timeout: 3000 }
          );
          const beforeLeftMove = await page.evaluate(() => ({ ...window.__brixSnakeState.snake[0] }));
          await page.waitForFunction(
            (prevX) => window.__brixSnakeState && window.__brixSnakeState.snake[0].x < prevX,
            beforeLeftMove.x,
            { timeout: 3000 }
          );
          console.log('[step5] 키보드(ArrowLeft) → direction=left, 머리 x 좌표 감소 확인');
          console.log('[step5] AC3(키보드) OK — 키보드 입력으로도 방향 전환 + 실제 이동이 이어짐');

          // ── STEP 6 (AC4-E2E): 게임오버 — 좌측 벽 충돌까지 진행 (틱 루프 자연 진행) ──
          await page.waitForFunction(
            () => window.__brixSnakeState && window.__brixSnakeState.status === 'gameover',
            { timeout: 20000 }
          );
          const gameover = await page.evaluate(() => ({
            reason: window.__brixSnakeState.gameoverReason,
            score: window.__brixSnakeState.score,
            overlayHidden: document.getElementById('overlay').hasAttribute('hidden'),
            overlayState: document.getElementById('overlay').getAttribute('data-state'),
            overlayTitle: document.getElementById('overlay-title').textContent,
            overlayReason: document.getElementById('overlay-reason').textContent,
            overlayStat: document.getElementById('overlay-stat').textContent,
            btnAgainHidden: document.getElementById('btn-again').hasAttribute('hidden'),
            btnMenuHidden: document.getElementById('btn-menu').hasAttribute('hidden'),
            btnPauseDisabled: document.getElementById('btn-pause').disabled,
          }));
          console.log('[step6] 게임오버 상태:', JSON.stringify(gameover));
          if (gameover.reason !== 'wall') {
            throw new Error('AC4 회귀(시나리오 전제 붕괴): 예상한 벽 충돌이 아닌 사유로 게임오버 — reason=' + gameover.reason);
          }
          if (gameover.overlayHidden || gameover.overlayState !== 'gameover') {
            throw new Error('AC4 회귀: 게임오버 시 오버레이가 표시되지 않음(hidden=' + gameover.overlayHidden + ', data-state=' + gameover.overlayState + ')');
          }
          if (!gameover.overlayTitle.includes('게임 오버')) {
            throw new Error('AC4 회귀: 오버레이 타이틀에 "게임 오버" 가 없음: "' + gameover.overlayTitle + '"');
          }
          if (!gameover.overlayReason || gameover.overlayReason.indexOf('벽') === -1) {
            throw new Error('AC4 회귀: 게임오버 사유 텍스트가 벽 충돌을 반영하지 않음: "' + gameover.overlayReason + '"');
          }
          if (!gameover.overlayStat || gameover.overlayStat.indexOf(String(gameover.score)) === -1) {
            throw new Error('AC4 회귀: 게임오버 최종 점수 텍스트가 내부 score(' + gameover.score + ') 와 불일치: "' + gameover.overlayStat + '"');
          }
          if (gameover.btnAgainHidden || gameover.btnMenuHidden) {
            throw new Error('AC4 회귀: 게임오버 시 "다시하기"/"메뉴로" 버튼이 노출되지 않음');
          }
          if (!gameover.btnPauseDisabled) {
            throw new Error('AC4 회귀: 게임오버 후에도 일시정지 버튼이 활성 상태 — 틱 루프가 멈추지 않은 것으로 의심됨');
          }

          // 틱 루프가 실제로 멈췄는지(추가 이동 없음) 추가 확인
          const stateAtGameover = await page.evaluate(() => JSON.stringify(window.__brixSnakeState.snake[0]));
          await new Promise(r => setTimeout(r, 400));
          const stateAfterWait = await page.evaluate(() => JSON.stringify(window.__brixSnakeState.snake[0]));
          if (stateAtGameover !== stateAfterWait) {
            throw new Error('AC4 회귀: 게임오버 후에도 머리 위치가 계속 바뀜 — 틱 루프가 정지하지 않음');
          }
          console.log('[step6] AC4(게임오버) OK — 오버레이(사유·점수)/다시하기·메뉴로 버튼/틱 루프 정지 모두 확인');

          // ── STEP 7: 콘솔 에러 없음 확인 ────────────────────────────────
          console.log('[step7] 수집된 콘솔 에러:', JSON.stringify(consoleErrors));
          if (consoleErrors.length > 0) {
            throw new Error('콘솔 에러 ' + consoleErrors.length + '건 발생:\\n' + consoleErrors.slice(0, 3).join('\\n'));
          }

          console.log('[OK] BF-927: 렌더->시작->이동/먹이/점수 누적->방향 컨트롤(D-pad+키보드)->게임오버 전체 여정 통과');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-927",
          },
          body: JSON.stringify({
            url,
            label: "렌더→시작→이동/먹이/점수 누적→방향 컨트롤(D-pad+키보드)→게임오버 전체 여정 [BF-927]",
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
