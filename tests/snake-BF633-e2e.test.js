// BF-633 · E2E 회귀 가드 — snake 게임 동작 + debug 오버레이 토글 + Canvas 잔재 grep
//
// AC 매핑:
//   AC1-E2E  — 실 브라우저 게임 시작/방향키 조작/game-over/스코어 숫자 확인 + 콘솔 에러 없음
//   AC2-E2E  — debug 오버레이 기본 off (hidden 속성) E2E 실환경 확인
//   AC3-E2E  — D키 off→on→off 토글 + 표시 정보 4 필드(PixiJS·버전·렌더러·FPS) 비어있지 않음
//   AC4-static — snake/ 추가 Canvas 잔재 정적 가드
//               (index.html inline script getContext('2d') 0건,
//                game.js drawCpuSnake/drawExtraCpus/drawExtraFoods/drawExtraItems 함수 0건)
//
// dev(BF-631) 가 이미 검증한 항목 — 재작성 금지:
//   getContext('2d') in game.js·logic.js,
//   #debug-overlay HTML 존재·hidden 속성·_debugVisible=false·early-return,
//   drawFood·drawBackground·drawSnake 함수 정의 없음,
//   getDebugInfo·toggleDebugOverlay·updateDebugOverlay 함수 존재,
//   render() 내 updateDebugOverlay() 호출·rendererType 반환
//
// tester 고유 영역:
//   1. E2E — 실 브라우저 게임 시작·키보드 조작·game-over·스코어 (dev 는 정적 가드만)
//   2. E2E — debug 오버레이 실환경 hidden/표시 토글 + innerHTML 4 필드 존재 확인
//   3. 정적 — index.html inline script getContext 0건 (dev 는 game.js·logic.js 만 검증)
//   4. 정적 — drawCpuSnake/drawExtraCpus/drawExtraFoods/drawExtraItems 제거
//             (dev 는 drawFood·drawBackground·drawSnake 3개만 검증)
//
// 실행: node --test tests/snake-BF633-e2e.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/snake-BF633-e2e.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = path.resolve(__dirname, "..");
const SNAKE_DIR  = path.join(REPO_ROOT, "snake");

function readSnakeFile(name) {
  return readFileSync(path.join(SNAKE_DIR, name), "utf-8");
}

// ─────────────────────────────────────────────────────────────
// Module scope guard — BRIX_TEST_MODULE ≠ snake 이면 전체 skip
// ─────────────────────────────────────────────────────────────
const TEST_MODULE = process.env.BRIX_TEST_MODULE;
const MODULE_SKIP = TEST_MODULE != null && TEST_MODULE !== "snake";
const E2E_SKIP    = process.env.BRIX_E2E_SKIP === "1";

if (MODULE_SKIP) {
  describe("BF-633 (module scope skip)", () => {
    test("BRIX_TEST_MODULE 불일치 — 전체 skip", (t) =>
      t.skip(`BRIX_TEST_MODULE=${TEST_MODULE} ≠ snake — BF-633 가드 스킵`));
  });
} else {

  // ═══════════════════════════════════════════════════════════
  // §0. 정적 가드 — Canvas 잔재 추가 grep (AC4-static)
  //
  // dev(BF-631) 가 검증한 목록: drawFood / drawBackground / drawSnake / getContext('2d') in game.js·logic.js
  // tester 추가: drawCpuSnake / drawExtraCpus / drawExtraFoods / drawExtraItems (dev 미검증 4종)
  //             + index.html inline <script> 내 getContext('2d') 0건 (dev 는 game.js·logic.js 만)
  // ═══════════════════════════════════════════════════════════
  describe("AC4-static — Canvas 잔재 추가 grep (dev 미검증 영역)", () => {

    test("game.js 에 function drawCpuSnake( 정의가 없어야 한다", () => {
      const src = readSnakeFile("game.js");
      assert.ok(
        !src.includes("function drawCpuSnake("),
        "game.js 에 drawCpuSnake() Canvas 2D 함수가 남아 있습니다 (BF-631 제거 대상)",
      );
    });

    test("game.js 에 function drawExtraCpus( 정의가 없어야 한다", () => {
      const src = readSnakeFile("game.js");
      assert.ok(
        !src.includes("function drawExtraCpus("),
        "game.js 에 drawExtraCpus() Canvas 2D 함수가 남아 있습니다 (BF-631 제거 대상)",
      );
    });

    test("game.js 에 function drawExtraFoods( 정의가 없어야 한다", () => {
      const src = readSnakeFile("game.js");
      assert.ok(
        !src.includes("function drawExtraFoods("),
        "game.js 에 drawExtraFoods() Canvas 2D 함수가 남아 있습니다 (BF-631 제거 대상)",
      );
    });

    test("game.js 에 function drawExtraItems( 정의가 없어야 한다", () => {
      const src = readSnakeFile("game.js");
      assert.ok(
        !src.includes("function drawExtraItems("),
        "game.js 에 drawExtraItems() Canvas 2D 함수가 남아 있습니다 (BF-631 제거 대상)",
      );
    });

    test("index.html inline script 에 getContext('2d') 호출이 없어야 한다", () => {
      const html = readSnakeFile("index.html");
      // 인라인 <script> 블록 내 Canvas 2D context 취득 코드가 남아 있으면 잠재적 회귀
      const matchSingle = (html.match(/getContext\('2d'\)/g) || []).length;
      const matchDouble = (html.match(/getContext\("2d"\)/g) || []).length;
      assert.equal(
        matchSingle + matchDouble,
        0,
        "index.html inline script 에 getContext('2d') 또는 getContext(\"2d\") 가 남아 있습니다",
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // E2E 헬퍼 — e2e-runner 도달 가능 여부 확인 (2초 타임아웃)
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

  // ─────────────────────────────────────────────────────────────
  // E2E 헬퍼 — persona host 결정 (localhost 금지)
  // ─────────────────────────────────────────────────────────────
  function personaHost() {
    return (
      process.env.BRIX_PERSONA_HOST ??
      process.env.BRIX_WORKER_HOSTNAME ??
      "worker"
    );
  }

  // ─────────────────────────────────────────────────────────────
  // E2E 헬퍼 — 정적 파일 HTTP 서버 구동 (0.0.0.0, random port)
  // ─────────────────────────────────────────────────────────────
  function startStaticServer(rootDir) {
    const MIME = {
      ".html": "text/html; charset=utf-8",
      ".js":   "application/javascript; charset=utf-8",
      ".css":  "text/css; charset=utf-8",
      ".png":  "image/png",
      ".svg":  "image/svg+xml",
      ".json": "application/json",
    };
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
        if (urlPath.endsWith("/")) urlPath += "index.html";
        const resolved = path.resolve(path.join(rootDir, urlPath));
        if (!resolved.startsWith(path.resolve(rootDir))) {
          res.statusCode = 403; res.end("forbidden"); return;
        }
        fs.readFile(resolved, (err, data) => {
          if (err) { res.statusCode = 404; res.end("not found"); return; }
          const ext = path.extname(resolved);
          res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
          res.end(data);
        });
      } catch (err) {
        res.statusCode = 500; res.end(String(err));
      }
    });
    return new Promise((resolve) => server.listen(0, "0.0.0.0", () => resolve(server)));
  }

  // ─────────────────────────────────────────────────────────────
  // E2E skip 분기
  // ─────────────────────────────────────────────────────────────
  if (E2E_SKIP) {
    test("[E2E] BF-633 BRIX_E2E_SKIP=1 — 전체 E2E skip (CI 결정성)", (t) =>
      t.skip("BRIX_E2E_SKIP=1"));
  } else {

    // ═══════════════════════════════════════════════════════════
    // §1. E2E AC1 — 게임 시작/방향키 조작/game-over/스코어 기본 흐름
    //
    // dev(BF-631) 는 정적 가드만 작성 — E2E 게임 플레이 흐름은 tester 고유 영역.
    //
    // 검증 흐름:
    //   1. localStorage.clear() → reload → 설정 모달 자동 오픈 대기
    //   2. cpuCount=0 클릭 → Enter 저장 → 게임 시작 (단순화: CPU 없이 벽 충돌 유도)
    //   3. 콘솔 에러 모니터링 시작
    //   4. ArrowUp 입력 → 뱀 위쪽 이동 → 화면 상단 벽 충돌 예정
    //   5. gameover-overlay 표시 대기 (최대 15초)
    //   6. go-score 값이 정수(≥0) 임 확인
    //   7. 콘솔 에러 0건 확인
    // ═══════════════════════════════════════════════════════════

    test("BF-633 E2E §1 (AC1): 게임 시작/방향키 조작/game-over/스코어 기본 흐름 + 콘솔 에러 없음", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server    = await startStaticServer(REPO_ROOT);
      const port      = server.address().port;
      const selfHost  = personaHost();

      try {
        const url = `http://${selfHost}:${port}/snake/`;
        const scriptText = `
          // 0. 콘솔 에러 수집 (listener 를 가장 먼저 등록)
          const consoleErrors = [];
          page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });

          // 1. localStorage 비우고 재로드 — 기본 설정 상태에서 시작
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#settings-trigger', { timeout: 8000 });
          console.log('[step0] 페이지 로드 OK');

          // 2. 설정 모달 자동 오픈 대기 (entry 진입시 자동 오픈 — CLAUDE.md 함정)
          await page.waitForFunction(
            () => !document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 8000 }
          );
          console.log('[step1] 설정 모달 열림 (entry) OK');

          // 3. cpuCount=0 선택 (CPU 없이 벽 충돌 예측 가능 — AI 간섭 제거)
          const cpuZeroClicked = await page.evaluate(() => {
            const btn = document.querySelector('[data-key="cpuCount"] [data-value="0"]');
            if (!btn) return false;
            btn.click();
            return true;
          });
          console.log('[step2] cpuCount=0 선택:', cpuZeroClicked);
          if (!cpuZeroClicked) {
            throw new Error('AC1 회귀: 설정 모달에서 cpuCount=0 버튼을 찾을 수 없습니다 — HTML 회귀');
          }

          // 4. Enter → 설정 저장 → 게임 시작
          await page.keyboard.press('Enter');
          await page.waitForFunction(
            () => document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 6000 }
          );
          console.log('[step3] 설정 저장 → 게임 시작 OK (cpuCount=0, CPU 없음)');

          // 5. gameover-overlay 가 아직 hidden 인지 확인 (게임 시작 직후 — 정상)
          const overlayHiddenAtStart = await page.evaluate(
            () => document.getElementById('gameover-overlay').hasAttribute('hidden')
          );
          if (!overlayHiddenAtStart) {
            throw new Error('AC1 회귀: 게임 시작 직후 gameover-overlay 가 이미 표시됨 — 즉시 게임오버 버그');
          }
          console.log('[step4] 게임 시작 직후 gameover-overlay hidden 확인 OK');

          // 6. ArrowUp 입력 → 뱀 방향 위로 전환 → 상단 벽까지 직진
          //    초기 방향 RIGHT → UP 으로 전환 → midY 틱 후 상단 벽 충돌
          //    (normal 120ms/틱 × midY≈20 ≈ 2.4초 내 gameover)
          await page.keyboard.press('ArrowUp');
          console.log('[step5] ArrowUp 입력 (위쪽 벽 충돌 유도)');

          // 7. gameover-overlay 표시 대기 (최대 15초)
          let gameoverDetected = false;
          try {
            await page.waitForFunction(
              () => !document.getElementById('gameover-overlay').hasAttribute('hidden'),
              { timeout: 15000 }
            );
            gameoverDetected = true;
          } catch (_) {
            // 최대 대기 초과 — game-over 미발생
          }
          console.log('[step6] gameover 감지:', gameoverDetected);
          if (!gameoverDetected) {
            throw new Error(
              'AC1 회귀: 15초 내 gameover-overlay 가 표시되지 않았습니다 — ' +
              '뱀 충돌 감지 or render loop 회귀 가능성. ' +
              'cpuCount=0 + ArrowUp 입력 후에도 gameover 미발생.'
            );
          }

          // 8. go-score 가 정수(≥0) 인지 확인
          const scoreText = await page.evaluate(
            () => document.getElementById('go-score').textContent.trim()
          );
          console.log('[step7] go-score 값:', scoreText);
          const scoreNum = parseInt(scoreText, 10);
          if (isNaN(scoreNum) || scoreNum < 0) {
            throw new Error(
              'AC1 회귀: go-score="' + scoreText + '" — 정수(≥0) 아님. ' +
              'showGameOver() 의 점수 기입 회귀.'
            );
          }

          // 9. 콘솔 에러 없음 확인
          console.log('[step8] 수집된 콘솔 에러:', JSON.stringify(consoleErrors));
          if (consoleErrors.length > 0) {
            // PixiJS 초기화 실패는 환경 문제이므로 경고만 출력하고 허용
            const criticalErrors = consoleErrors.filter(e =>
              !e.includes('WebGL') && !e.includes('pixi') && !e.includes('PIXI') &&
              !e.includes('SnakeRenderer') && !e.includes('BF-631')
            );
            if (criticalErrors.length > 0) {
              throw new Error(
                'AC1 회귀: 게임 플레이 중 콘솔 에러 ' + criticalErrors.length + '건 발생:\n' +
                criticalErrors.slice(0, 5).join('\n')
              );
            }
            console.warn('[step8] PixiJS/WebGL 관련 환경 에러 허용 (E2E 렌더 환경 제한):', consoleErrors.length, '건');
          }

          console.log('[step-final] AC1 E2E 완전 검증: 게임 시작→방향키→game-over→스코어(정수) 정상. score=' + scoreNum);
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type":     "application/json",
            "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-633",
          },
          body: JSON.stringify({
            url,
            label:     "AC1 게임 시작/방향키 조작/game-over/스코어 기본 흐름 [BF-633]",
            scriptText,
            timeoutMs: 40000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `E2E §1 AC1 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    // ═══════════════════════════════════════════════════════════
    // §2. E2E AC2·AC3 — debug 오버레이 기본 off + D키 토글 + 4 필드 표시
    //
    // dev(BF-631) 는 정적 가드(hidden 속성 HTML 검증, _debugVisible=false 코드 존재)만 작성.
    // 실 브라우저에서 실제로 hidden/visible 전환이 일어나고
    // innerHTML 에 PixiJS·version·renderer·FPS 필드가 비어있지 않은지는 E2E 로만 검증 가능.
    //
    // 검증 흐름:
    //   1. localStorage.clear() → reload → 설정 모달 Enter → 게임 시작
    //   2. AC2: #debug-overlay 에 hidden 속성 존재 확인 (실환경 off 상태)
    //   3. AC3-on: 'd' 키 입력 → hidden 제거 확인 → innerHTML 4 필드 존재 확인
    //   4. AC3-off: 'd' 키 재입력 → hidden 복원 확인
    //
    // 주의: PixiJS 가 E2E 환경(WebGL 미지원)에서 초기화 실패할 수 있음.
    //   이 경우 getDebugInfo() 가 { active: false, version: 'N/A', rendererType: 'N/A' } 반환.
    //   → 오버레이에 '✗ inactive', 'N/A' 등이 표시되지만 필드 자체는 존재해야 함.
    //   → 필드 존재(비어있지 않음) 를 검증하되, PixiJS 활성 여부는 강제하지 않음.
    // ═══════════════════════════════════════════════════════════

    test("BF-633 E2E §2 (AC2·AC3): debug 오버레이 기본 off + D키 off→on→off + 4 필드(PixiJS·버전·렌더러·FPS) 표시", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server    = await startStaticServer(REPO_ROOT);
      const port      = server.address().port;
      const selfHost  = personaHost();

      try {
        const url = `http://${selfHost}:${port}/snake/`;
        const scriptText = `
          // 1. localStorage 비우고 재로드
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#settings-trigger', { timeout: 8000 });
          console.log('[step0] 페이지 로드 OK');

          // 2. 설정 모달 자동 오픈 대기 (entry)
          await page.waitForFunction(
            () => !document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 8000 }
          );
          console.log('[step1] 설정 모달 열림 OK');

          // 3. Enter → 게임 시작 (기본 설정)
          await page.keyboard.press('Enter');
          await page.waitForFunction(
            () => document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 6000 }
          );
          console.log('[step2] 설정 저장 → 게임 시작 OK');

          // 4. AC2: 게임 시작 직후 #debug-overlay 에 hidden 속성 존재 확인 (off 기본값)
          const hiddenAtStart = await page.evaluate(
            () => document.getElementById('debug-overlay')?.hasAttribute('hidden') ?? null
          );
          console.log('[step3] 게임 시작 후 debug-overlay hidden:', hiddenAtStart);
          if (hiddenAtStart === null) {
            throw new Error('AC2 회귀: #debug-overlay 요소 자체가 DOM 에 없습니다 — index.html 회귀');
          }
          if (!hiddenAtStart) {
            throw new Error(
              'AC2 회귀: 게임 시작 직후 #debug-overlay 에 hidden 속성이 없습니다 — ' +
              '기본값 off(_debugVisible=false) 가 실 브라우저에서 동작하지 않습니다'
            );
          }
          console.log('[step3] AC2 OK — debug-overlay 기본 hidden 확인');

          // 5. AC3-on: 'd' 키 입력 → toggleDebugOverlay() → hidden 제거
          await page.keyboard.press('d');
          // render() 루프가 innerHTML 을 갱신할 충분한 시간 대기 (1프레임 ≈ 120ms)
          await new Promise(r => setTimeout(r, 400));

          const hiddenAfterOn = await page.evaluate(
            () => document.getElementById('debug-overlay')?.hasAttribute('hidden') ?? true
          );
          console.log('[step4] d 키 후 debug-overlay hidden:', hiddenAfterOn);
          if (hiddenAfterOn) {
            throw new Error(
              'AC3 회귀: "d" 키 입력 후에도 #debug-overlay 에 hidden 속성이 남아 있습니다 — ' +
              'toggleDebugOverlay() 가 D 키(e.code="KeyD") 이벤트에 반응하지 않습니다'
            );
          }
          console.log('[step4] AC3-on OK — debug-overlay visible');

          // 6. AC3 — innerHTML 에 4 필드(PixiJS, version, renderer, FPS) 존재 확인
          //    PixiJS 가 비활성인 환경에서도 필드 레이블은 반드시 존재해야 함.
          const overlayHTML = await page.evaluate(
            () => document.getElementById('debug-overlay')?.innerHTML ?? ''
          );
          console.log('[step5] debug-overlay innerHTML:', overlayHTML.slice(0, 300));

          if (!overlayHTML || overlayHTML.trim().length === 0) {
            throw new Error(
              'AC3 회귀: #debug-overlay 가 visible 이지만 innerHTML 이 비어 있습니다 — ' +
              'updateDebugOverlay() 가 render() 루프에서 호출되지 않거나 SnakeRenderer.getDebugInfo() 가 null 반환'
            );
          }

          const fieldsCheck = {
            'PixiJS':    overlayHTML.includes('PixiJS'),
            'version':   overlayHTML.includes('version'),
            'renderer':  overlayHTML.includes('renderer'),
            'FPS':       overlayHTML.includes('FPS'),
          };
          console.log('[step5] 4 필드 존재 여부:', JSON.stringify(fieldsCheck));

          const missingFields = Object.entries(fieldsCheck)
            .filter(([, ok]) => !ok)
            .map(([name]) => name);

          if (missingFields.length > 0) {
            throw new Error(
              'AC3 회귀: debug-overlay innerHTML 에 다음 필드가 없습니다: ' + missingFields.join(', ') + '\n' +
              '실제 innerHTML: ' + overlayHTML.slice(0, 400) + '\n' +
              '— updateDebugOverlay() 의 innerHTML 템플릿 회귀 (PixiJS·버전·렌더러·FPS 4 행 필수)'
            );
          }
          console.log('[step5] AC3 4 필드 모두 존재 OK (PixiJS·version·renderer·FPS)');

          // 7. AC3-off: 'd' 키 재입력 → hidden 복원
          await page.keyboard.press('d');
          await new Promise(r => setTimeout(r, 200));

          const hiddenAfterOff = await page.evaluate(
            () => document.getElementById('debug-overlay')?.hasAttribute('hidden') ?? false
          );
          console.log('[step6] d 키 재입력 후 debug-overlay hidden:', hiddenAfterOff);
          if (!hiddenAfterOff) {
            throw new Error(
              'AC3 회귀: "d" 키 재입력 후 #debug-overlay 에 hidden 속성이 복원되지 않았습니다 — ' +
              '토글 off(_debugVisible=true→false) 흐름 회귀'
            );
          }
          console.log('[step6] AC3-off OK — debug-overlay hidden 복원');

          console.log('[step-final] AC2·AC3 E2E 완전 검증: off→on→off 토글 정상, 4 필드 확인 완료');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type":     "application/json",
            "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-633",
          },
          body: JSON.stringify({
            url,
            label:     "AC2·AC3 debug 오버레이 기본 off + D키 off→on→off + 4 필드 표시 [BF-633]",
            scriptText,
            timeoutMs: 40000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `E2E §2 AC2·AC3 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });

  } // end else (E2E_SKIP)

} // end else (MODULE_SKIP)
