// BF-574 · 지렁이 충돌 판정 E2E 회귀 가드
//
// 목적: BF-572 (T3 제거, T4-SWAP 추가) 변경 기준으로
//       E2E + 정적 가드를 작성. index.html 인라인 폴백 검증 포함.
//
// AC 매핑:
//   AC-1: 머리-몸 통과 시나리오 → status="playing" 유지
//   AC-2: 머리-머리 충돌 시 deathCause="head_on" ("cpu_body" 제거 확인)
//   AC-3: 회귀 가드 전체 통과 (이 파일 + dev snake-BF572.test.js)
//
// dev snake-BF572.test.js 와 중복 금지 항목:
//   - Node.js 단위: tickFull/tickWithItems 반환값 직접 검증 (makeState 헬퍼)
//   - AC-1~AC-6 전 케이스 단위 검증 (logic.js ES module import 기반)
//
// 이 파일이 추가하는 고유 가드:
//   §1. 정적 코드 가드 — logic.js T3제거/T4-SWAP 코드 존재 박제
//   §2. index.html IIFE tickWithItems 변경 코드 박제 (인라인 폴백 검증)
//   §3. HTML 마크업 가드 — #gameover-overlay, #go-result, #game-canvas 존재
//   §4. CORS 안전 가드 — type="module" 미사용 (BF-522 회귀 보호)
//   §5. E2E 브라우저 — window.tickWithItems 호출 (게임이 실제 사용하는 경로)
//       §5-a: AC-1 몸통 통과 시나리오 → status="playing" (deterministic)
//       §5-b: AC-2 deathCause 허용 목록 확인 ("cpu_body" 제거)
//
// 주의: game.js 는 tickWithItems 를 사용 (line 1910). tickFull 은 window 에 노출되지만
//       game.js 게임 루프에서는 미사용. index.html IIFE tickFull 은 BF-572 미업데이트
//       (legacy) — gameplay 에 영향 없음. 이 가드는 실제 게임 경로 (tickWithItems) 를 검증.
//
// 실행: node --test tests/snake-BF574-e2e.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SNAKE_DIR = path.join(REPO_ROOT, "snake");

const logicJs = readFileSync(path.join(SNAKE_DIR, "logic.js"),    "utf-8");
const gameJs  = readFileSync(path.join(SNAKE_DIR, "game.js"),     "utf-8");
const html    = readFileSync(path.join(SNAKE_DIR, "index.html"),  "utf-8");

// ─────────────────────────────────────────────────────────────
// E2E scope guard — BRIX_E2E_SKIP=1 이면 §5 전체 skip
// ─────────────────────────────────────────────────────────────
const E2E_SKIP = process.env.BRIX_E2E_SKIP === "1";

// ═══════════════════════════════════════════════════════════════
// §1. 정적 코드 가드 — logic.js T3제거/T4-SWAP 코드 존재 박제
// ═══════════════════════════════════════════════════════════════
// dev 의 BF-572.test.js 는 로직 함수 반환값을 검증.
// tester 는 소스 코드 자체를 "fact 박제" — 핵심 라인 삭제 시 즉시 실패.

describe("BF-574 §1 logic.js 충돌 판정 변경 코드 가드", () => {
  test("§1-1 (AC-3 회귀): T3 제거 주석 — logic.js 에 존재", () => {
    // tickFull + tickWithItems 양쪽에 이 주석 라인이 들어가야 함
    assert.ok(
      logicJs.includes("T3 제거 — 상대방 몸통 통과 허용"),
      "logic.js 에 'T3 제거 — 상대방 몸통 통과 허용' 주석 없음 — BF-572 T3 제거 회귀"
    );
  });

  test("§1-2 (AC-2 회귀): headOnSwap 선언 — logic.js 에 존재", () => {
    // T4-SWAP 판정: 두 머리가 서로 위치를 교환하는 교차 이동
    assert.ok(
      logicJs.includes("const headOnSwap ="),
      "logic.js 에 'const headOnSwap =' 없음 — T4-SWAP 구현 회귀"
    );
  });

  test("§1-3 (AC-2 회귀): headOnNormal || headOnSwap 조합 — logic.js 에 존재", () => {
    // headOnNormal (동일 셀) + headOnSwap (교차 이동) 결합
    assert.ok(
      logicJs.includes("headOnNormal || headOnSwap"),
      "logic.js 에 'headOnNormal || headOnSwap' 없음 — T4-SWAP 결합 로직 회귀"
    );
  });

  test("§1-4 (AC-1 회귀): tickFull playerDead — cpuBody 없이 headOn|wall|self 만", () => {
    // 수정 전: playerDead = headOn || playerHitWall || playerHitSelf || playerHitCPU
    // 수정 후: playerDead = headOn || playerHitWall || playerHitSelf  (T3 제거)
    assert.ok(
      logicJs.includes("const playerDead = headOn || playerHitWall || playerHitSelf;"),
      "logic.js tickFull playerDead 에 T3(cpuBody) 제거 코드 없음 — AC-1 몸통 통과 회귀"
    );
  });

  test("§1-5 (AC-6 회귀): logic.js 에 deathCause = \"cpu_body\" 할당 없음", () => {
    // BF-572: deathCause 분기에서 "cpu_body" 완전 제거
    const hasCpuBodyAssignment = /deathCause\s*=\s*["']cpu_body["']/.test(logicJs);
    assert.ok(
      !hasCpuBodyAssignment,
      'logic.js 에 deathCause = "cpu_body" 할당 존재 — BF-572 AC-6 회귀 (T3 재도입)'
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §2. index.html IIFE tickWithItems — T3제거/T4-SWAP 가드
// ═══════════════════════════════════════════════════════════════
// game.js 는 tickFull 이 아닌 tickWithItems 를 게임 루프에서 사용 (line 1910).
// index.html 인라인 폴백의 tickWithItems 에 BF-572 변경이 적용됐는지 박제.
// (tickFull IIFE 는 legacy — game.js 미사용, 변경 범위 밖)

describe("BF-574 §2 index.html IIFE tickWithItems 변경 코드 가드", () => {
  test("§2-1 (AC-3 인라인): tickWithItems — T3 제거 주석 존재", () => {
    // BF-571 명세 §6.1: 인라인 폴백에 동일 변경 적용
    assert.ok(
      html.includes("T3 제거 — 상대방 몸통 통과 허용"),
      "index.html IIFE 에 T3 제거 주석 없음 — 인라인 폴백 BF-572 변경 누락"
    );
  });

  test("§2-2 (AC-2 인라인): tickWithItems — headOnSwap 코드 존재", () => {
    // index.html IIFE tickWithItems 에 T4-SWAP 판정 var 선언
    assert.ok(
      html.includes("var headOnSwap     = movePlayer && moveCpu"),
      "index.html IIFE tickWithItems 에 headOnSwap 없음 — 인라인 폴백 T4-SWAP 회귀"
    );
  });

  test("§2-3 (AC-1 인라인): tickWithItems 내 deathCause = \"cpu_body\" 없음", () => {
    // tickWithItems 함수 body 에서 deathCause = "cpu_body" 할당 없어야 함
    const twStart = html.indexOf("function tickWithItems");
    assert.ok(twStart !== -1, "index.html 에 tickWithItems 함수 없음");
    // 중괄호 매칭으로 tickWithItems body 추출
    let depth = 0, twEnd = twStart;
    for (let i = twStart; i < html.length; i++) {
      if (html[i] === "{") depth++;
      else if (html[i] === "}") { depth--; if (depth === 0) { twEnd = i + 1; break; } }
    }
    const twBody = html.slice(twStart, twEnd);
    const hasCpuBodyInTW = /deathCause\s*=\s*["']cpu_body["']/.test(twBody);
    assert.ok(
      !hasCpuBodyInTW,
      'index.html tickWithItems 에 deathCause = "cpu_body" 할당 존재 — 인라인 폴백 T3 회귀'
    );
  });

  test("§2-4 (AC-1 인라인): tickWithItems — var playerDead cpuBody 없는 형태 존재", () => {
    // 인라인 폴백 tickWithItems 의 playerDead 에 playerHitCPU 없는 형태
    assert.ok(
      html.includes("var playerDead = headOn || playerHitWall || playerHitSelf;"),
      "index.html tickWithItems playerDead 에 T3 제거 코드 없음 — 인라인 폴백 AC-1 회귀"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §3. HTML 마크업 가드 — E2E 인프라 보호
// ═══════════════════════════════════════════════════════════════

describe("BF-574 §3 HTML 마크업 가드 (E2E 인프라 보호)", () => {
  test("§3-1: #gameover-overlay 존재", () => {
    // E2E 에서 gameover 상태를 확인하는 root element
    assert.ok(
      html.includes('id="gameover-overlay"'),
      '#gameover-overlay 없음 — E2E 결과 표시 인프라 회귀'
    );
  });

  test("§3-2: #go-result 존재 (DRAW/WIN/LOSE 표시)", () => {
    // 머리-머리 충돌 시 "DRAW" 텍스트가 표시되는 element
    assert.ok(
      html.includes('id="go-result"'),
      '#go-result 없음 — 게임 결과 표시 element 회귀'
    );
  });

  test("§3-3: #game-canvas 존재", () => {
    assert.ok(
      html.includes('id="game-canvas"'),
      '#game-canvas 없음 — 게임 렌더링 캔버스 회귀'
    );
  });

  test("§3-4: globalThis 에 tickWithItems 노출 — index.html IIFE Object.assign 존재", () => {
    // E2E 에서 window.tickWithItems 를 호출하기 위한 전제
    assert.ok(
      html.includes("tickWithItems:           tickWithItems"),
      "index.html IIFE 에서 tickWithItems 를 globalThis 에 노출하는 코드 없음 — E2E 접근 불가"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §4. CORS 안전 가드 (BF-522 회귀 보호)
// ═══════════════════════════════════════════════════════════════

describe("BF-574 §4 CORS 안전 가드 (BF-522 회귀 보호)", () => {
  test("§4-1 (BF-522 회귀): snake/index.html 에 type=\"module\" 미사용", () => {
    assert.ok(
      !html.includes('type="module"'),
      'snake/index.html 에 type="module" 존재 — file:// CORS 회귀 (BF-522)'
    );
  });

  test("§4-2: snake/game.js 에 fetch() 미사용", () => {
    assert.ok(
      !gameJs.includes("fetch("),
      "game.js 에 fetch() 존재 — file:// 환경에서 CORS 오류 발생 가능"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §5. E2E 브라우저 시뮬레이션 — window.tickWithItems 검증
// ═══════════════════════════════════════════════════════════════
// game.js 가 실제 사용하는 경로: index.html IIFE → window.tickWithItems → game.js 호출
// Node.js 단위 테스트 (dev BF-572.test.js) 와 달리 브라우저 전체 로딩 경로를 검증.

if (E2E_SKIP) {
  test("[E2E] §5 BRIX_E2E_SKIP=1 — CI 결정성 가드로 전체 skip", (t) =>
    t.skip("BRIX_E2E_SKIP=1"));
} else {
  // ─────────────────────────────────────────────────────────────
  // §5-a: AC-1 — 몸통 통과 시나리오 (deterministic)
  // 플레이어 머리가 CPU 몸통 셀로 진입해도 status="playing" 유지
  // CPU 머리가 멀리 있어 cpuChooseDir 방향 무관하게 결과 deterministic
  // ─────────────────────────────────────────────────────────────
  test("BF-574 E2E §5-a (AC-1): 플레이어 머리가 CPU 몸통 진입 → status='playing' 유지", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        // window.tickWithItems / createItemStats 로드 대기
        await page.waitForFunction(
          () => typeof window.tickWithItems === 'function' && typeof window.createItemStats === 'function',
          { timeout: 5000 }
        );
        console.log('[step0] window.tickWithItems, createItemStats 로드 OK');

        // AC-1 시나리오 (deterministic):
        //   플레이어: (2,5) →RIGHT→ (3,5)
        //   CPU 머리: (9,5) — 플레이어 다음 위치 (3,5) 에서 충분히 떨어짐
        //   CPU 몸통[1]: (3,5) — 플레이어가 통과할 셀 (T3 제거로 충돌 없음)
        //   cpuChooseDir 는 (9,5) 기준 어느 방향이든 플레이어와 무관 → deterministic
        const result = await page.evaluate(() => {
          const D = window.DIR;
          const state = {
            cols: 15, rows: 15,
            snake: [{ x: 2, y: 5 }, { x: 1, y: 5 }],
            dir: D.RIGHT, nextDir: D.RIGHT,
            cpu: [{ x: 9, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }],
            cpuDir: D.LEFT,
            food: null, score: 0, cpuScore: 0, highScore: 0,
            status: 'playing', result: null, deathCause: null,
            pendingGrowth: 0, cpuPendingGrowth: 0,
            multiplierStats: {
              '1': { spawned: 0, eaten: 0 },
              '2': { spawned: 0, eaten: 0 },
              '3': { spawned: 0, eaten: 0 },
            },
            item: null, heldItem: null, shieldActive: false,
            cpuReverseTicksLeft: 0, speedStack: [],
            lengthBurstActive: false, lengthBeforeBurst: 0, lengthBurstEndMs: 0,
            cpuLengthBurstActive: false, cpuLengthBeforeBurst: 0, cpuLengthBurstEndMs: 0,
            itemStats: window.createItemStats(),
          };
          const s2 = window.tickWithItems(state, 0, true, true);
          return { status: s2.status, result: s2.result, deathCause: s2.deathCause };
        });

        console.log('[AC1] tickWithItems 결과:', JSON.stringify(result));

        if (result.status !== 'playing') {
          throw new Error(
            'AC-1 실패: 몸통 진입 후 status="' + result.status + '" (기대: "playing")' +
            ' | deathCause="' + result.deathCause + '" — T3 제거 회귀'
          );
        }
        if (result.result !== null) {
          throw new Error(
            'AC-1 실패: 몸통 진입 후 result="' + result.result + '" (기대: null)'
          );
        }
        console.log('[done] AC-1 몸통 통과 → status=playing PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-574",
        },
        body: JSON.stringify({
          url,
          label: "Snake 몸통 통과 → status=playing 유지 [BF-574 AC-1]",
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
        `E2E §5-a AC-1 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1200)}`
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // §5-b: AC-2 — 머리-머리 충돌 deathCause 허용 목록 확인
  // T4-SWAP 시나리오: cpuChooseDir 결과에 따라 draw 또는 계속
  // 핵심 검증: deathCause 는 ["head_on", "wall", "self", null] 안에만 있어야 함
  //            ("cpu_body" 재도입 회귀 방지)
  // ─────────────────────────────────────────────────────────────
  test("BF-574 E2E §5-b (AC-2): 머리-머리 충돌 시 deathCause 허용 목록 확인 (cpu_body 제거)", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        await page.waitForFunction(
          () => typeof window.tickWithItems === 'function' && typeof window.createItemStats === 'function',
          { timeout: 5000 }
        );
        console.log('[step0] window.tickWithItems 로드 OK');

        // T4-SWAP 시나리오:
        //   플레이어 (3,5) →RIGHT→ (4,5),  CPU (4,5) →LEFT→ (3,5)
        //   cpuChooseDir 가 LEFT 유지 시: headOnSwap 성립 → draw + head_on
        //   cpuChooseDir 가 다른 방향 시: headOnSwap 불성립 → 게임 계속 (허용)
        //   핵심 검증: 어떤 경우든 deathCause 는 "cpu_body" 가 아닌 허용 목록 내 값
        const result = await page.evaluate(() => {
          const D = window.DIR;
          const state = {
            cols: 10, rows: 10,
            snake: [{ x: 3, y: 5 }, { x: 2, y: 5 }],
            dir: D.RIGHT, nextDir: D.RIGHT,
            cpu: [{ x: 4, y: 5 }, { x: 5, y: 5 }],
            cpuDir: D.LEFT,
            food: null, score: 0, cpuScore: 0, highScore: 0,
            status: 'playing', result: null, deathCause: null,
            pendingGrowth: 0, cpuPendingGrowth: 0,
            multiplierStats: {
              '1': { spawned: 0, eaten: 0 },
              '2': { spawned: 0, eaten: 0 },
              '3': { spawned: 0, eaten: 0 },
            },
            item: null, heldItem: null, shieldActive: false,
            cpuReverseTicksLeft: 0, speedStack: [],
            lengthBurstActive: false, lengthBeforeBurst: 0, lengthBurstEndMs: 0,
            cpuLengthBurstActive: false, cpuLengthBeforeBurst: 0, cpuLengthBurstEndMs: 0,
            itemStats: window.createItemStats(),
          };
          const s2 = window.tickWithItems(state, 0, true, true);
          return { status: s2.status, result: s2.result, deathCause: s2.deathCause };
        });

        console.log('[AC2] tickWithItems 결과:', JSON.stringify(result));

        // deathCause 허용 목록 확인 — "cpu_body" 재도입 회귀 검출
        const ALLOWED = ['head_on', 'wall', 'self', null];
        if (!ALLOWED.includes(result.deathCause)) {
          throw new Error(
            'AC-2 실패: deathCause "' + result.deathCause + '" 가 허용 목록에 없음 — cpu_body 재도입 회귀'
          );
        }

        // T4-SWAP 성립 시 (draw) — deathCause 반드시 "head_on"
        if (result.result === 'draw') {
          if (result.deathCause !== 'head_on') {
            throw new Error(
              'AC-2 실패: draw 결과인데 deathCause="' + result.deathCause + '" (기대: "head_on")'
            );
          }
          console.log('[AC2] T4-SWAP 성립 → draw + head_on PASS');
        } else {
          // cpuChooseDir 방향 변경으로 T4-SWAP 불성립 — 허용
          console.log('[AC2] cpuChooseDir 방향 변경으로 T4-SWAP 불성립 → status=' + result.status + ' (허용)');
        }

        console.log('[done] AC-2 deathCause 허용 목록 확인 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-574",
        },
        body: JSON.stringify({
          url,
          label: "Snake 머리-머리 충돌 deathCause 허용 목록 확인 [BF-574 AC-2]",
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
        `E2E §5-b AC-2 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1200)}`
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (snake-BF569-e2e.test.js 패턴 재사용)
// ─────────────────────────────────────────────────────────────

/**
 * e2e-runner 도달성 확인. 못 닿으면 t.skip() 호출 후 false 반환.
 * CI 환경에는 e2e-runner 컨테이너 없음.
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
 * 0.0.0.0 바인딩 임시 정적 서버 (임의 포트).
 * e2e-runner 컨테이너에서 worker 의 snake/ 디렉터리에 HTTP 로 접근 가능.
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
