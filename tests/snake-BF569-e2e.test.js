// BF-569 · 회귀 가드 — 효과음 토글 동작 + localStorage 영속화 E2E
//
// AC 매핑 (BF-567 구현 기준):
//   AC-1: #sound-toggle 클릭 → aria-pressed 반전 + 🔊/🔇 아이콘 전환
//   AC-3: OFF 시 어떤 소리도 재생 안 됨 (soundEnabled 조기 반환 패턴 보장)
//   AC-4: localStorage 영속화 — ON→OFF→reload→OFF 유지, OFF→reload→OFF 유지
//   EC-04: doRestart 시 진행 중인 gameover oscillator 즉시 중단 (회귀 보호)
//
// dev snake-BF567.test.js 와 중복 금지 항목:
//   - DOM id/aria 속성 존재 (§1)
//   - CSS 변수·셀렉터 존재 (§2)
//   - game.js 함수명·상수명 존재 (§3)
//   - loadSoundEnabled null→true / "true" 비교 / try-catch (§4)
//   - 효과음 파형·주파수 파라미터 (§5)
//   - soundEnabled 변수 이름 참조 여부 (§5-5, §5-6)
//
// 이 파일이 추가하는 가드:
//   §1. CORS 안전 — file:// 호환 (type="module" 미사용, fetch() 미사용)
//   §2. OFF 무음 조기 반환 패턴 (if (!soundEnabled) return) — AC-3 강화
//   §3. EC-04 doRestart oscillator 중단 회귀 가드
//   §4. E2E — 토글 클릭 → aria-pressed/아이콘 반전 (AC-1 인터랙션)
//   §5. E2E — localStorage 영속화 시나리오 (AC-4 복원 흐름)
//
// 실행 (changed-only): node --test tests/snake-BF569-e2e.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = path.resolve(__dirname, "..");
const SNAKE_DIR  = path.join(REPO_ROOT, "snake");

const html   = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
const gameJs = readFileSync(path.join(SNAKE_DIR, "game.js"),   "utf-8");

// ─────────────────────────────────────────────────────────────
// E2E scope guard — BRIX_E2E_SKIP=1 이면 E2E 섹션 전체 skip
// ─────────────────────────────────────────────────────────────
const E2E_SKIP = process.env.BRIX_E2E_SKIP === "1";

// ═══════════════════════════════════════════════════════════════
// §1. CORS 안전 가드 — file:// 호환 (BF-522 요구사항 유지)
// ═══════════════════════════════════════════════════════════════
// BF-522: type="module" + dynamic import 완전 제거 → file:// CORS 오류 수정.
// BF-567 구현이 이 요구사항을 재도입하지 않았는지 보호.

describe("BF-569 §1 CORS 안전 가드 — file:// 호환", () => {
  test("§1-1 (BF-522 회귀): snake/index.html에 type=\"module\" 미사용", () => {
    // <script type="module"> 가 없어야 file:// 프로토콜에서 CORS 오류 없이 동작
    assert.ok(
      !html.includes('type="module"'),
      'snake/index.html에 type="module" 이 존재함 — BF-522 CORS 회귀'
    );
  });

  test("§1-2 (EC-CORS): snake/game.js에 fetch() 미사용", () => {
    // 정적 파일 기반 game.js 는 fetch() 로 외부 리소스를 로드하지 않아야 함
    assert.ok(
      !gameJs.includes("fetch("),
      "game.js에 fetch() 호출 존재 — file:// 환경에서 CORS 오류 발생 가능"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §2. OFF 무음 조기 반환 패턴 — AC-3 강화 회귀 가드
// ═══════════════════════════════════════════════════════════════
// dev §5-5/§5-6 은 함수 body 에 "soundEnabled" 문자열 존재만 검증.
// tester 는 "if (!soundEnabled) return" 조기 반환 패턴 자체를 박제.
// 이 패턴이 사라지면 soundEnabled 는 존재하지만 음소거가 동작하지 않을 수 있음.

describe("BF-569 §2 OFF 무음 조기 반환 패턴 (AC-3 강화)", () => {
  test("§2-1 (AC3): playEatSound — if (!soundEnabled) return 조기 반환 존재", () => {
    const fnIdx = gameJs.indexOf("function playEatSound");
    assert.ok(fnIdx !== -1, "playEatSound 함수 없음");
    // 중괄호 매칭으로 함수 body 추출
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const fnBody = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      fnBody.includes("if (!soundEnabled) return"),
      "playEatSound에 'if (!soundEnabled) return' 조기 반환 없음 — AC-3 OFF 무음 회귀"
    );
  });

  test("§2-2 (AC3): playGameOverSound — if (!soundEnabled) return 조기 반환 존재", () => {
    const fnIdx = gameJs.indexOf("function playGameOverSound");
    assert.ok(fnIdx !== -1, "playGameOverSound 함수 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const fnBody = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      fnBody.includes("if (!soundEnabled) return"),
      "playGameOverSound에 'if (!soundEnabled) return' 조기 반환 없음 — AC-3 OFF 무음 회귀"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §3. EC-04 doRestart oscillator 중단 회귀 가드
// ═══════════════════════════════════════════════════════════════
// doRestart() 호출 시 진행 중인 gameover oscillator 를 중단하지 않으면
// 재시작 후에도 gameover 효과음이 계속 재생되는 버그 발생.

describe("BF-569 §3 EC-04 doRestart oscillator 중단 회귀 가드", () => {
  test("§3-1 (EC04): doRestart 함수 내에 _gameoverOsc 중단 코드 존재", () => {
    const fnIdx = gameJs.indexOf("function doRestart");
    assert.ok(fnIdx !== -1, "doRestart 함수 없음");
    // 중괄호 매칭으로 함수 body 추출
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const fnBody = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      fnBody.includes("_gameoverOsc"),
      "doRestart에 _gameoverOsc 참조 없음 — EC-04 gameover oscillator 중단 회귀"
    );
  });

  test("§3-2 (EC04): doRestart 내에서 _gameoverOsc.stop() 호출 코드 존재", () => {
    const fnIdx = gameJs.indexOf("function doRestart");
    assert.ok(fnIdx !== -1, "doRestart 함수 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const fnBody = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      fnBody.includes("_gameoverOsc.stop()"),
      "doRestart에 _gameoverOsc.stop() 없음 — EC-04 oscillator 중단 불완전"
    );
  });

  test("§3-3 (EC04): doRestart 내에서 _gameoverOsc = null 초기화 존재", () => {
    const fnIdx = gameJs.indexOf("function doRestart");
    assert.ok(fnIdx !== -1, "doRestart 함수 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const fnBody = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      fnBody.includes("_gameoverOsc = null"),
      "doRestart에 _gameoverOsc = null 초기화 없음 — EC-04 oscillator 참조 누수"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §4. E2E — 토글 클릭 동작 (AC-1 인터랙션)
// ═══════════════════════════════════════════════════════════════

if (E2E_SKIP) {
  test("[E2E] §4 + §5 BRIX_E2E_SKIP=1 — CI 결정성 가드로 전체 skip", (t) =>
    t.skip("BRIX_E2E_SKIP=1"));
} else {
  // ─────────────────────────────────────────────────────────────
  // E2E AC1: 토글 클릭 → aria-pressed 반전 + 🔊/🔇 아이콘 전환
  // ─────────────────────────────────────────────────────────────
  test("BF-569 E2E §4 (AC1): #sound-toggle 클릭 → aria-pressed 반전 + 아이콘 전환", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        // 0. clean start — localStorage 초기화 후 reload (기본 ON 상태 보장)
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#sound-toggle');
        console.log('[step0] #sound-toggle 존재 확인 OK');

        // 1. 초기 상태 확인 — 기본값 ON (aria-pressed="true", 🔊)
        const init = await page.evaluate(() => {
          const btn = document.getElementById('sound-toggle');
          return { pressed: btn.getAttribute('aria-pressed'), text: btn.textContent.trim() };
        });
        if (init.pressed !== 'true') {
          throw new Error('초기 aria-pressed 가 "true" 가 아님: "' + init.pressed + '"');
        }
        if (!init.text.includes('🔊')) {
          throw new Error('초기 아이콘이 🔊 가 아님: "' + init.text + '"');
        }
        console.log('[step1] 초기 aria-pressed="true", 🔊 OK');

        // 2. 클릭 1회 → OFF (aria-pressed="false", 🔇)
        await page.click('#sound-toggle');
        const afterFirst = await page.evaluate(() => {
          const btn = document.getElementById('sound-toggle');
          return {
            pressed: btn.getAttribute('aria-pressed'),
            text: btn.textContent.trim(),
            ls: localStorage.getItem('bf-snake-sound-enabled'),
          };
        });
        if (afterFirst.pressed !== 'false') {
          throw new Error('클릭 1회 후 aria-pressed 가 "false" 가 아님: "' + afterFirst.pressed + '"');
        }
        if (!afterFirst.text.includes('🔇')) {
          throw new Error('클릭 1회 후 아이콘이 🔇 가 아님: "' + afterFirst.text + '"');
        }
        if (afterFirst.ls !== 'false') {
          throw new Error('클릭 1회 후 localStorage 값이 "false" 가 아님: "' + afterFirst.ls + '"');
        }
        console.log('[step2] 클릭 1회 → aria-pressed="false", 🔇, localStorage="false" OK');

        // 3. 클릭 2회 → ON 복원 (aria-pressed="true", 🔊)
        await page.click('#sound-toggle');
        const afterSecond = await page.evaluate(() => {
          const btn = document.getElementById('sound-toggle');
          return {
            pressed: btn.getAttribute('aria-pressed'),
            text: btn.textContent.trim(),
            ls: localStorage.getItem('bf-snake-sound-enabled'),
          };
        });
        if (afterSecond.pressed !== 'true') {
          throw new Error('클릭 2회 후 aria-pressed 가 "true" 가 아님: "' + afterSecond.pressed + '"');
        }
        if (!afterSecond.text.includes('🔊')) {
          throw new Error('클릭 2회 후 아이콘이 🔊 가 아님: "' + afterSecond.text + '"');
        }
        if (afterSecond.ls !== 'true') {
          throw new Error('클릭 2회 후 localStorage 값이 "true" 가 아님: "' + afterSecond.ls + '"');
        }
        console.log('[step3] 클릭 2회 → aria-pressed="true", 🔊, localStorage="true" OK');

        // cleanup
        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-569 §4 E2E AC1 시나리오 전체 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-569",
        },
        body: JSON.stringify({
          url,
          label: "Snake 효과음 토글 클릭 → aria-pressed 반전 + 🔊/🔇 아이콘 전환 (BF-569 AC1)",
          scriptText,
          timeoutMs: 30000,
        }),
      });
      const json = await res.json();
      assert.ok(
        json.ok,
        `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`
      );
      assert.ok(
        json.passed,
        `E2E §4 AC1 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1200)}`
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // E2E AC4: ON→OFF→reload→OFF 영속화 시나리오
  // ─────────────────────────────────────────────────────────────
  test("BF-569 E2E §5-a (AC4): ON→OFF 클릭 후 reload → OFF 상태 복원 (aria-pressed=\"false\")", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        // 0. clean start — ON 상태에서 시작
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#sound-toggle');

        // 1. ON 확인 (기본값)
        const initPressed = await page.evaluate(() =>
          document.getElementById('sound-toggle').getAttribute('aria-pressed')
        );
        if (initPressed !== 'true') {
          throw new Error('clean start 후 초기 상태가 ON(true) 이 아님: "' + initPressed + '"');
        }
        console.log('[step1] 초기 ON 확인 OK');

        // 2. 클릭 → OFF
        await page.click('#sound-toggle');
        const lsVal = await page.evaluate(() =>
          localStorage.getItem('bf-snake-sound-enabled')
        );
        if (lsVal !== 'false') {
          throw new Error('OFF 클릭 후 localStorage 가 "false" 가 아님: "' + lsVal + '"');
        }
        console.log('[step2] OFF 클릭 → localStorage="false" OK');

        // 3. reload
        await page.reload();
        await page.waitForSelector('#sound-toggle');
        console.log('[step3] reload 완료');

        // 4. OFF 상태 복원 확인
        const restored = await page.evaluate(() => {
          const btn = document.getElementById('sound-toggle');
          return {
            pressed: btn.getAttribute('aria-pressed'),
            text: btn.textContent.trim(),
            ls: localStorage.getItem('bf-snake-sound-enabled'),
          };
        });
        if (restored.pressed !== 'false') {
          throw new Error(
            'reload 후 aria-pressed 가 "false" 가 아님: "' + restored.pressed +
            '" — loadSoundEnabled() / updateSoundToggleUI() 초기화 흐름 깨짐'
          );
        }
        if (!restored.text.includes('🔇')) {
          throw new Error('reload 후 아이콘이 🔇 가 아님: "' + restored.text + '"');
        }
        if (restored.ls !== 'false') {
          throw new Error('reload 후 localStorage 값이 "false" 가 아님: "' + restored.ls + '"');
        }
        console.log('[step4] reload 후 OFF 복원 (aria-pressed="false", 🔇) OK');

        // cleanup
        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-569 §5-a E2E AC4 ON→OFF→reload→OFF 전체 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-569",
        },
        body: JSON.stringify({
          url,
          label: "Snake 효과음 ON→OFF 클릭 후 reload → OFF 상태 복원 (BF-569 AC4)",
          scriptText,
          timeoutMs: 30000,
        }),
      });
      const json = await res.json();
      assert.ok(
        json.ok,
        `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`
      );
      assert.ok(
        json.passed,
        `E2E §5-a AC4 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1200)}`
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // E2E AC4: localStorage 직접 "false" 세팅 → reload → OFF UI 복원
  // (loadSoundEnabled() 가 외부 세팅 값을 정확히 읽는지 검증)
  // ─────────────────────────────────────────────────────────────
  test("BF-569 E2E §5-b (AC4): localStorage \"false\" 직접 세팅 후 reload → 🔇 OFF UI 복원", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        // 0. 초기 로드 (UI 초기화 완료 대기)
        await page.waitForSelector('#sound-toggle');

        // 1. localStorage 에 직접 "false" 세팅 → reload
        await page.evaluate(() =>
          localStorage.setItem('bf-snake-sound-enabled', 'false')
        );
        await page.reload();
        await page.waitForSelector('#sound-toggle');
        console.log('[step1] localStorage="false" 세팅 후 reload 완료');

        // 2. OFF 복원 확인
        const offState = await page.evaluate(() => {
          const btn = document.getElementById('sound-toggle');
          return {
            pressed: btn.getAttribute('aria-pressed'),
            label: btn.getAttribute('aria-label'),
            text: btn.textContent.trim(),
          };
        });
        if (offState.pressed !== 'false') {
          throw new Error(
            'localStorage="false" reload 후 aria-pressed 가 "false" 가 아님: "' + offState.pressed + '"'
          );
        }
        if (!offState.text.includes('🔇')) {
          throw new Error('localStorage="false" reload 후 아이콘이 🔇 가 아님: "' + offState.text + '"');
        }
        if (!offState.label.includes('꺼짐')) {
          throw new Error('localStorage="false" reload 후 aria-label 에 "꺼짐" 없음: "' + offState.label + '"');
        }
        console.log('[step2] OFF 복원 (aria-pressed="false", 🔇, aria-label 꺼짐) OK');

        // 3. localStorage 에 "true" 세팅 → reload → ON 복원 확인
        await page.evaluate(() =>
          localStorage.setItem('bf-snake-sound-enabled', 'true')
        );
        await page.reload();
        await page.waitForSelector('#sound-toggle');
        console.log('[step3] localStorage="true" 세팅 후 reload 완료');

        const onState = await page.evaluate(() => {
          const btn = document.getElementById('sound-toggle');
          return {
            pressed: btn.getAttribute('aria-pressed'),
            text: btn.textContent.trim(),
          };
        });
        if (onState.pressed !== 'true') {
          throw new Error(
            'localStorage="true" reload 후 aria-pressed 가 "true" 가 아님: "' + onState.pressed + '"'
          );
        }
        if (!onState.text.includes('🔊')) {
          throw new Error('localStorage="true" reload 후 아이콘이 🔊 가 아님: "' + onState.text + '"');
        }
        console.log('[step4] ON 복원 (aria-pressed="true", 🔊) OK');

        // cleanup
        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-569 §5-b E2E AC4 localStorage 직접 세팅 복원 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-569",
        },
        body: JSON.stringify({
          url,
          label: "Snake localStorage 직접 세팅 → reload → OFF/ON UI 복원 (BF-569 AC4 §5-b)",
          scriptText,
          timeoutMs: 30000,
        }),
      });
      const json = await res.json();
      assert.ok(
        json.ok,
        `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`
      );
      assert.ok(
        json.passed,
        `E2E §5-b AC4 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1200)}`
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (snake-BF516-e2e.test.js 패턴 재사용)
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
 * 0.0.0.0 바인딩 임시 정적 서버 (임의 포트 — 동시 실행 충돌 방지).
 * snake/game.js 는 type="module" 미사용 (BF-522) 이지만
 * e2e-runner 컨테이너가 worker 의 filesystem 에 직접 접근 불가하므로 HTTP 서버 필요.
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
