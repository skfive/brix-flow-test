// BF-520 · snake file:// 실행 E2E 회귀 가드
//
// 보호 대상 (BF-520 수용 기준):
//   AC §1 — file:// 환경: JavaScript 런타임 오류 0건 + canvas 렌더 + 키 조작 이동 검증
//   AC §3 — 향후 fetch() 재도입 차단 (CORS 안전 가드 — 재발 시 fail)
//
// E2E 전략 (file:// CORS 차단 시뮬레이션):
//   - HTTP 서버 기동, logic.js 라우트를 403 으로 차단 (file:// CORS 차단과 동일한 폴백 경로 유도)
//   - game.js: dynamic import('./logic.js') 실패 → catch → globalThis 폴백 활성화
//   - canvas 렌더 확인 + 키 조작 후 게임 진행 확인 (BF-518 fix 실제 효과 검증)
//
// note — e2e-runner 는 보안상 file:// 프로토콜 직접 불허 ("protocol-not-allowed: file:")
//   → 403 차단 서버로 동일한 폴백 경로를 실브라우저에서 검증
//
// 이미 dev/tester 가 검증한 항목 (중복 금지):
//   - static import 제거, dynamic import+catch+globalThis 코드 패턴 (snake-BF518.test.js)
//   - 인라인 IIFE 로직 정합성, createInitialState/tick/changeDirection (snake-BF518.test.js)
//   - DOM 구조 (#game-canvas/#hud/#gameover-overlay), type=module (snake-BF518.test.js)
//   - HTTP 서버 E2E 시나리오 (canvas 렌더, 벽 충돌, localStorage 복원) (snake-BF516-e2e.test.js)
//
// 실행: node --test tests/snake-BF520-file-e2e.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readFile } from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = path.resolve(__dirname, "..");

// ─────────────────────────────────────────────────────────────
// AC §3 — CORS 안전 가드 (fetch() 미사용 확인)
//
// 회귀 보호: 향후 누군가 snake/ 에 fetch() 를 도입하면 이 가드가 fail 하여 재발 차단.
// fetch() 는 file:// 환경에서 CORS 로 차단 → 게임 동작 불가.
// ─────────────────────────────────────────────────────────────

test("BF-520 AC3: snake/game.js — fetch() 미사용 (file:// CORS 안전 가드)", () => {
  const js = readFileSync(path.join(REPO_ROOT, "snake", "game.js"), "utf-8");
  // 코드 라인 (주석 제외) 에서 fetch( 호출 여부 검사
  const codeLines = js
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("//"))
    .join("\n");
  assert.ok(
    !codeLines.includes("fetch("),
    "snake/game.js 코드에 fetch() 발견 — file:// CORS 차단 원인. " +
      "fetch() 를 제거하거나 globalThis 폴백 패턴으로 교체하세요.",
  );
});

test("BF-520 AC3: snake/logic.js — fetch() 미사용 (file:// CORS 안전 가드)", () => {
  const js = readFileSync(path.join(REPO_ROOT, "snake", "logic.js"), "utf-8");
  const codeLines = js
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("//"))
    .join("\n");
  assert.ok(
    !codeLines.includes("fetch("),
    "snake/logic.js 코드에 fetch() 발견 — file:// CORS 차단 원인.",
  );
});

test("BF-520 AC3: snake/index.html — fetch() 미사용 (file:// CORS 안전 가드)", () => {
  const html = readFileSync(path.join(REPO_ROOT, "snake", "index.html"), "utf-8");
  // HTML 주석 외 실제 코드 부분에서 fetch( 검사
  const withoutHtmlComments = html.replace(/<!--[\s\S]*?-->/g, "");
  // JS 주석도 제거
  const codeLines = withoutHtmlComments
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("//"))
    .join("\n");
  assert.ok(
    !codeLines.includes("fetch("),
    "snake/index.html 코드에 fetch() 발견 — file:// CORS 차단 원인.",
  );
});

// ─────────────────────────────────────────────────────────────
// E2E AC1 — file:// CORS 차단 시뮬레이션 (logic.js 403 차단)
//
// 시나리오:
//   1. logic.js 를 403 으로 차단하는 HTTP 서버 기동
//   2. game.js: dynamic import('./logic.js') 실패 → catch → globalThis 폴백
//   3. 게임 렌더 확인: canvas.width > 0, canvas.height > 0
//   4. 게임 초기화 확인: score=0, gameover-overlay hidden
//   5. 키 조작 후 진행 확인: ArrowDown 입력 → 게임 계속 실행
//
// fail 조건 (회귀 발생 케이스):
//   - globalThis 폴백 미설정 → game.js throw → #game-canvas 미노출 → waitForSelector timeout
//   - canvas.width = 0 → resizeCanvas() 로 호출하지 않음 → 렌더 실패
//   - gameover-overlay 초기 노출 → createInitialState() 오류 → status='gameover'
//   - ArrowDown 후 gameover → changeDirection() 오류 또는 즉시 벽 충돌
// ─────────────────────────────────────────────────────────────

test(
  "BF-520 E2E AC1: logic.js CORS 차단 → globalThis 폴백 → canvas 렌더 + 키 조작 정상 (file:// 시뮬레이션)",
  async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    // logic.js 를 403 으로 차단하는 서버 (file:// CORS 차단 시뮬레이션)
    const server = await startServerWithLogicBlocked(REPO_ROOT);
    const port   = server.address().port;
    const host   = personaHost();

    try {
      const url = `http://${host}:${port}/snake/`;

      // scriptText: e2e-runner 가 url 로 이미 navigate 한 상태에서 실행됨
      // (reload 없음 — 403 로드 중 page.reload() 가 브라우저 컨텍스트를 불안정하게 만들 수 있음)
      const scriptText = `
        // 1. e2e-runner 가 이미 url 로 navigate 함
        //    game.js: dynamic import('./logic.js') → 403 → catch → globalThis 폴백 → initGame()
        //    page 에 도착했을 때 이미 게임이 초기화 중이거나 완료된 상태

        // 2. #game-canvas 가 DOM 에 나타날 때까지 대기 (game.js 모듈 실행 완료 신호)
        await page.waitForSelector('#game-canvas', { timeout: 5000 });
        console.log('[step1] #game-canvas DOM 존재 확인 OK');

        // canvas.width > 0 이 될 때까지 대기 (resizeCanvas() 완료 = game loop 준비)
        // waitForTimeout 고정 대기 대신 결정적 조건 확인 — 브라우저 컨텍스트 닫힘 방지
        await page.waitForFunction(
          () => {
            const c = document.getElementById('game-canvas');
            return c && c.width > 0 && c.height > 0;
          },
          { timeout: 5000 }
        );
        console.log('[step1b] canvas.width > 0 확인 OK (resizeCanvas 완료)');

        // 3. canvas 렌더 확인 — width > 0, height > 0 (waitForFunction 에서 이미 보장됨)
        const canvasInfo = await page.evaluate(() => {
          const c = document.getElementById('game-canvas');
          if (!c) return { exists: false, width: 0, height: 0 };
          return { exists: true, width: c.width, height: c.height };
        });
        if (!canvasInfo.exists) {
          throw new Error('#game-canvas 가 DOM 에 없음 — globalThis 폴백 후 game.js 실행 실패');
        }
        if (canvasInfo.width <= 0 || canvasInfo.height <= 0) {
          throw new Error(
            'canvas 크기 0 — resizeCanvas() 미실행 또는 globalThis 폴백 오류. ' +
            'width=' + canvasInfo.width + ' height=' + canvasInfo.height
          );
        }
        console.log('[step2] canvas 렌더 확인 — width=' + canvasInfo.width + ' height=' + canvasInfo.height + ' OK');

        // 4. 초기 HUD 상태 확인 (globalThis 폴백 후 createInitialState 정상 호출 증거)
        const hudScore = await page.evaluate(() =>
          document.getElementById('hud-score-value')?.textContent?.trim() ?? 'N/A'
        );
        if (hudScore !== '0') {
          throw new Error(
            '#hud-score-value 초기값이 "0" 이 아님 — globalThis 폴백 후 score 초기화 실패: "' + hudScore + '"'
          );
        }

        const goHidden = await page.evaluate(() =>
          document.getElementById('gameover-overlay')?.hasAttribute('hidden')
        );
        if (!goHidden) {
          throw new Error(
            '#gameover-overlay 가 초기에 hidden 이 아님 — globalThis 폴백 후 게임 미시작 (status!=playing)'
          );
        }
        console.log('[step3] HUD score=0, gameover-overlay hidden — 게임 정상 시작 OK');

        // 5. 키 조작 확인 — ArrowDown 입력 후 게임 계속 진행
        //    game.js keydown: keyMap[e.code] → changeDirection(state, DIR.DOWN)
        //    DIR.DOWN = {x:0, y:1}, 현재 dir=RIGHT → 역방향 아님 → nextDir=DOWN 적용
        //    waitForTimeout 대신 즉시 DOM 상태 확인 (브라우저 컨텍스트 닫힘 방지)
        await page.keyboard.press('ArrowDown');

        // 키 이벤트 처리 후 즉시 상태 확인 (동기 keydown 핸들러 = page.evaluate 에서 반영)
        const goAfterKey = await page.evaluate(() =>
          document.getElementById('gameover-overlay')?.hasAttribute('hidden')
        );
        if (!goAfterKey) {
          throw new Error(
            'ArrowDown 입력 직후 gameover-overlay 노출 — ' +
            '예상치 못한 즉시 충돌 또는 changeDirection() 오류 (globalThis 폴백 경로)'
          );
        }
        console.log('[step4] ArrowDown 입력 + gameover-overlay hidden 유지 — 키 조작 OK');

        // cleanup
        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-520 AC1 — globalThis 폴백 경로 전체 검증 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type":    "application/json",
          "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-520",
        },
        body: JSON.stringify({
          url,
          label:     "Snake file:// CORS 차단 시뮬레이션 — globalThis 폴백 canvas 렌더 + 키 조작 (BF-520 AC1)",
          scriptText,
          timeoutMs: 30_000,
        }),
      });

      const json = await res.json();
      assert.ok(
        json.ok,
        `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 600)}`,
      );
      assert.ok(
        json.passed,
        `E2E AC1 시나리오 실패 (globalThis 폴백 경로) — stdout 끝:\n${String(json.stdout ?? "").slice(-1400)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  },
);

// ─────────────────────────────────────────────────────────────
// 헬퍼들
// ─────────────────────────────────────────────────────────────

/**
 * e2e-runner 도달성 확인.
 * 미도달 시 t.skip() 후 false 반환 (CI 환경에서 fail 방지).
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
    t.skip(`e2e-runner 도달 불가 (${err.message}) — CI 환경 정상 skip`);
    return false;
  }
}

/**
 * 페르소나 컨테이너의 service hostname.
 * e2e-runner 가 정적 서버로 도달할 때 사용.
 */
function personaHost() {
  return (
    process.env.BRIX_PERSONA_HOST ??
    process.env.BRIX_WORKER_HOSTNAME ??
    "worker"
  );
}

/**
 * logic.js 요청을 403 으로 차단하는 정적 HTTP 서버.
 *
 * 목적: file:// 환경에서 dynamic import('./logic.js') 가 CORS 로 차단되는 상황을 재현.
 * index.html (인라인 IIFE + game.js type=module) 과 game.js 는 정상 서빙.
 * logic.js → 403 반환 → game.js catch 블록 활성화 → globalThis 폴백 사용.
 *
 * @param {string} rootDir — repo 루트 경로
 * @returns {Promise<http.Server>} 0.0.0.0 랜덤 포트에 바인딩된 서버
 */
function startServerWithLogicBlocked(rootDir) {
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

      // logic.js 를 403 으로 차단 → dynamic import 실패 유도 (file:// CORS 시뮬레이션)
      if (/\/logic\.js$/.test(urlPath)) {
        res.statusCode = 403;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("403 — Access denied (simulating file:// CORS block for logic.js)");
        return;
      }

      const resolved = path.resolve(path.join(rootDir, urlPath));
      if (!resolved.startsWith(path.resolve(rootDir) + path.sep) &&
          resolved !== path.resolve(rootDir)) {
        res.statusCode = 403;
        res.end("forbidden");
        return;
      }

      readFile(resolved, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        const ext = path.extname(resolved);
        res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
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
