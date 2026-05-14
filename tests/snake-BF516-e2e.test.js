// BF-516 · Snake SPA E2E 회귀 가드 — Playwright 시나리오
//
// 보호 대상 (BF-516 수용 기준):
//   AC §1. /snake 진입 시 — #game-canvas + HUD 렌더 + 초기 점수 0 표시
//   AC §2. 방향키 입력 → 지렁이 이동 + 벽 충돌 시 게임오버 오버레이 노출 + Space 재시작
//   AC §3. 게임오버 후 새 세션 — localStorage 최고점수가 HUD 에 복원
//
// 이미 dev 가 검증한 항목 (중복 금지):
//   - 단위 로직 (createInitialState/tick/changeDirection/isWallCollision/isSelfCollision)
//   - 정적 HTML id 존재 검사 (#game-canvas, #hud-score-value, #hud-high-value, #gameover-overlay)
//   - WASD 키 매핑 존재 / type="module" 로드 / LS_HIGH_SCORE_KEY 상수
//   — 위 항목들은 snake-BF504.test.js / snake-BF514.test.js 에서 커버됨
//
// E2E 전략:
//   - 정적 서버 (0.0.0.0 바인딩, 임의 포트) 를 inline 기동 → e2e-runner 컨테이너가 접근
//   - AC2: setViewportSize(120×120) → 6×6 격자 → 4 tick (~480ms) 만에 벽 충돌 보장
//   - BRIX_E2E_SKIP=1 / e2e-runner 도달 불가 시 t.skip() (fail 아님 — CI 결정성 가드)
//   - focused scope 정책: BRIX_TEST_MODULE 이 snake 아니면 전체 skip
//
// 실행: node --test tests/snake-BF516-e2e.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "snake";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // E2E AC1 — /snake 진입 → canvas + HUD 렌더 + 초기 점수 0
  // ─────────────────────────────────────────────────────────────
  test("BF-516 E2E AC1: /snake 진입 → #game-canvas + HUD 렌더 + score=0 · best=0 · gameover-overlay hidden", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        // 0. clean start — localStorage 초기화 후 reload
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#game-canvas');
        console.log('[step1] #game-canvas DOM 존재 확인 OK');

        // 1. #hud 가시성 확인 (position:fixed top/right 우측 상단 고정)
        const hudVisible = await page.evaluate(() => {
          const hud = document.getElementById('hud');
          if (!hud) return false;
          const rect = hud.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        if (!hudVisible) throw new Error('#hud 가 화면에 보이지 않음 (getBoundingClientRect width/height = 0)');
        console.log('[step2] #hud 가시성 OK');

        // 2. 초기 점수 0 확인 — game.js initGame() → createInitialState(cols, rows, hs=0)
        //    → updateHUD() 가 score=0 · highScore=0 을 DOM 에 반영
        const initScores = await page.evaluate(() => ({
          score: document.getElementById('hud-score-value').textContent.trim(),
          best:  document.getElementById('hud-high-value').textContent.trim(),
        }));
        if (initScores.score !== '0') {
          throw new Error('#hud-score-value 초기값이 "0" 이 아님: "' + initScores.score + '"');
        }
        if (initScores.best !== '0') {
          throw new Error('#hud-high-value 초기값이 "0" 이 아님: "' + initScores.best + '"');
        }
        console.log('[step3] 초기 score=0 / best=0 OK');

        // 3. gameover-overlay 초기 hidden 확인
        //    game.js: initGame() → hideGameOver() → goOverlay.setAttribute('hidden','')
        const goHidden = await page.evaluate(() =>
          document.getElementById('gameover-overlay').hasAttribute('hidden')
        );
        if (!goHidden) {
          throw new Error('#gameover-overlay 가 초기에 hidden 이 아님 — 게임 시작 전 오버레이 노출 버그');
        }
        console.log('[step4] #gameover-overlay hidden=true (초기 정상) OK');

        // cleanup
        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-516 AC1 시나리오 전체 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-516",
        },
        body: JSON.stringify({
          url,
          label: "Snake /snake 진입 → canvas + HUD 렌더 + 초기 점수 0 (BF-516 AC1)",
          scriptText,
          timeoutMs: 30000,
        }),
      });
      const json = await res.json();
      assert.ok(
        json.ok,
        `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
      );
      assert.ok(
        json.passed,
        `E2E AC1 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-1200)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // E2E AC2 — 방향키 입력 → 이동 + 벽 충돌 → gameover-overlay 노출 + Space 재시작
  //
  // 전략: setViewportSize(120×120) → 6×6 격자 (CELL=20px)
  //   resize 이벤트 → game.js 재시작 → snake at (3,3) dir=RIGHT
  //   ArrowUp 입력 → nextDir=UP → 4 tick × 120ms = ~480ms 후 y=-1 벽 충돌 → gameover
  //   Space → doRestart() → hideGameOver() → gameover-overlay hidden 복원
  // ─────────────────────────────────────────────────────────────
  test("BF-516 E2E AC2: ArrowUp 입력 → 이동 + 벽 충돌 → gameover-overlay 노출 + Space 재시작 → score 초기화", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        // 0. clean start
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#game-canvas');

        // 1. 뷰포트를 120×120 으로 축소 → CELL=20 기준 cols=6, rows=6 격자
        //    game.js resize 핸들러가 발화 → createInitialState(6,6,0) + startLoop() 재시작
        await page.setViewportSize({ width: 120, height: 120 });
        // canvas.width === 120 이 될 때까지 대기 (resize 핸들러 완료 보장)
        await page.waitForFunction(
          () => document.getElementById('game-canvas').width === 120,
          { timeout: 2000 }
        );
        console.log('[step1] 뷰포트 120×120 → canvas.width=120 확인 OK');

        // 2. ArrowUp 입력 — RIGHT(현재) → UP 으로 유효 전환
        //    changeDirection: cur.x+newDir.x = 1+0 ≠ 0 → 역방향 아님 → nextDir = UP
        //    다음 tick 에서 snake 가 위쪽으로 이동
        await page.keyboard.press('ArrowUp');
        console.log('[step2] ArrowUp 입력 OK (direction change RIGHT → UP)');

        // 3. gameover-overlay 가 노출될 때까지 대기 (최대 3000ms)
        //    6×6 격자, snake 초기 head y=3, UP 방향 → 4 tick × 120ms ≈ 480ms → y=-1 → 벽 충돌
        await page.waitForFunction(
          () => !document.getElementById('gameover-overlay').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        console.log('[step3] gameover-overlay 노출 확인 OK (벽 충돌 → 게임오버)');

        // 4. #go-score 가 0 이상 정수를 표시하는지 확인
        //    game.js showGameOver(): goScoreEl.textContent = state.score
        //    먹이 미수집 벽 충돌 시 score = 0 → goScoreEl.textContent = '0' (유효)
        const goScoreStr = await page.evaluate(() =>
          String(document.getElementById('go-score').textContent).trim()
        );
        const goScoreNum = parseInt(goScoreStr, 10);
        if (Number.isNaN(goScoreNum) || goScoreNum < 0) {
          throw new Error('#go-score 값이 0 이상 정수가 아님: "' + goScoreStr + '"');
        }
        console.log('[step4] #go-score 값 = "' + goScoreStr + '" (정수 파싱 성공) OK');

        // 5. Space → doRestart() → hideGameOver() → gameover-overlay 다시 hidden
        //    game.js keydown: if (state.status === 'gameover' && e.code === 'Space') doRestart()
        await page.keyboard.press('Space');
        await page.waitForFunction(
          () => document.getElementById('gameover-overlay').hasAttribute('hidden'),
          { timeout: 2000 }
        );
        console.log('[step5] Space → 재시작 → gameover-overlay hidden 복원 OK');

        // 6. 재시작 후 HUD score 0 으로 초기화
        //    restartGame(): createInitialState(cols, rows, highScore) → score=0
        const restartScore = await page.evaluate(() =>
          document.getElementById('hud-score-value').textContent.trim()
        );
        if (restartScore !== '0') {
          throw new Error('Space 재시작 후 #hud-score-value 가 "0" 이 아님: "' + restartScore + '"');
        }
        console.log('[step6] 재시작 후 score=0 초기화 OK');

        // cleanup
        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-516 AC2 시나리오 전체 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-516",
        },
        body: JSON.stringify({
          url,
          label: "Snake ArrowUp 입력 → 이동 + 벽 충돌 → gameover-overlay + Space 재시작 (BF-516 AC2)",
          scriptText,
          timeoutMs: 30000,
        }),
      });
      const json = await res.json();
      assert.ok(
        json.ok,
        `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
      );
      assert.ok(
        json.passed,
        `E2E AC2 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-1200)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // E2E AC3 — localStorage 최고점수 영속 → 재진입 시 HUD 복원
  //
  // 전략:
  //   ① localStorage.setItem('bf-snake-high-score', '50') 직접 기록
  //      (게임오버 saveHighScore 흐름 시뮬레이션)
  //   ② page.reload() → game.js initGame() → loadHighScore() → createInitialState(..., 50)
  //      → updateHUD() → #hud-high-value.textContent = '50'
  //   ③ waitForFunction 으로 '50' 표시 확인 (game.js 부트 순서 보호)
  // ─────────────────────────────────────────────────────────────
  test("BF-516 E2E AC3: localStorage best=50 사전 설정 → /snake 재진입 → #hud-high-value=50 복원", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        // 0. clean start
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#game-canvas');

        // 1. localStorage 에 최고점수 50 저장
        //    LS_HIGH_SCORE_KEY = 'bf-snake-high-score' (logic.js 상수)
        await page.evaluate(() => localStorage.setItem('bf-snake-high-score', '50'));
        const saved = await page.evaluate(() => localStorage.getItem('bf-snake-high-score'));
        if (saved !== '50') throw new Error('localStorage 쓰기 실패: ' + saved);
        console.log('[step1] localStorage bf-snake-high-score=50 저장 OK');

        // 2. 새 세션 — 페이지 재진입 (새로고침)
        await page.reload();
        await page.waitForSelector('#game-canvas');
        console.log('[step2] /snake 재진입 (reload) OK');

        // 3. #hud-high-value 가 '50' 으로 복원될 때까지 대기
        //    game.js initGame() → loadHighScore() → localStorage.getItem('bf-snake-high-score') → '50'
        //    → Number('50') = 50 → createInitialState(cols, rows, 50) → state.highScore = 50
        //    → render() → updateHUD() → hudHighEl.textContent = '50'
        await page.waitForFunction(
          () => document.getElementById('hud-high-value').textContent.trim() === '50',
          { timeout: 3000 }
        );
        const bestVal = await page.evaluate(() =>
          document.getElementById('hud-high-value').textContent.trim()
        );
        if (bestVal !== '50') {
          throw new Error(
            '#hud-high-value 가 "50" 이 아님: "' + bestVal +
            '" — loadHighScore() / updateHUD() 흐름 깨짐'
          );
        }
        console.log('[step3] #hud-high-value=50 복원 OK');

        // 4. 현재 점수는 0 이어야 함 (새 게임 시작)
        const curScore = await page.evaluate(() =>
          document.getElementById('hud-score-value').textContent.trim()
        );
        if (curScore !== '0') {
          throw new Error('재진입 후 현재 score 가 "0" 이 아님: "' + curScore + '"');
        }
        console.log('[step4] 재진입 후 현재 score=0 (새 게임 초기화) OK');

        // cleanup
        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-516 AC3 시나리오 전체 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-516",
        },
        body: JSON.stringify({
          url,
          label: "Snake localStorage best=50 → 재진입 → #hud-high-value 복원 (BF-516 AC3)",
          scriptText,
          timeoutMs: 30000,
        }),
      });
      const json = await res.json();
      assert.ok(
        json.ok,
        `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
      );
      assert.ok(
        json.passed,
        `E2E AC3 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-1200)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들
// ─────────────────────────────────────────────────────────────

/**
 * e2e-runner 도달성 확인. 못 닿으면 t.skip() 호출 후 false 반환.
 * CI 환경에는 e2e-runner 컨테이너 없음 — fail 처리하면 PR 자동 머지가 트리거 안 됨.
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
 * 페르소나 컨테이너의 service hostname.
 * e2e-runner 가 정적 서버로 도달할 때 사용. localhost / host.docker.internal 사용 금지.
 */
function personaHost() {
  return (
    process.env.BRIX_PERSONA_HOST ??
    process.env.BRIX_WORKER_HOSTNAME ??
    "worker"
  );
}

/**
 * 0.0.0.0 바인딩 임시 정적 서버 (임의 포트 — 동시 실행 충돌 방지).
 * game.js 가 type="module" 로 logic.js 를 import 하므로 HTTP 서버 필수.
 */
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
