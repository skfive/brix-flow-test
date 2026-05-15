// BF-588 · 지렁이게임 게임 설정 UI 마우스 클릭 버그 수정
//
// 버그 (재현 시나리오):
//   1) 지렁이게임 페이지 로드 (기본값 cpuCount=1, status="playing")
//   2) Space 키로 일시정지 → #paused-overlay 표시
//   3) 사용자가 일시정지 모달의 [설정 S] 버튼 (#paused-btn-settings) 을 마우스로 클릭
//   4) 기대: 게임 설정 모달 (#settings-modal) 이 열려야 함
//      실제: 아무 일도 일어나지 않음 — 클릭 이벤트가 핸들러까지 도달하지 못함
//
// 원인:
//   #paused-overlay 에 `pointer-events: none` 이 박혀 있어 (오버레이 배경 자체는 클릭
//   투과가 필요하므로 의도된 선언) 자손 .paused-box / .paused-btn 이 모두 상속받아
//   클릭 비활성. 따라서 일시정지 화면의 [계속하기] / [재시작] / [설정] / [종료] 버튼이
//   모두 마우스로 클릭 불가능.
//   (#settings-trigger 코그 아이콘은 #paused-overlay 외부 형제이므로 영향 없음 → 일부
//    경로는 동작해 회귀가 늦게 드러남.)
//
// AC 매핑:
//   AC1 — 설정 패널 진입 클릭이 즉시 모달을 띄워야 한다 (mouse-driven 진입 경로 회복)
//   AC2 — 수정 전 코드에서 RED, 수정 후 GREEN — §1 정적 CSS 가드가 가장 명확한 신호
//   AC3 — 기존 동작 유지: 키보드 / 코그 아이콘 진입 경로 + #settings-modal 의 클릭 위임
//         핸들러 바인딩 정적 가드 회귀 없음
//
// 회귀 가드 클래스:
//   - CSS 상속 회귀 — #paused-overlay { pointer-events:none } 자손이 재활성화돼야 함
//   - HTML 박제   — #paused-btn-settings selector 존재
//   - JS 바인딩   — pausedBtnSettingsEl click 핸들러 + openSettingsModal("pause") 호출 흔적
//
// 실행: node --test tests/snake-BF588.test.js
//       (E2E §4 는 e2e-runner 도달 가능 시에만 실행; CI 에선 자동 skip)

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

const html   = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
const css    = readFileSync(path.join(SNAKE_DIR, "styles.css"), "utf-8");
const gameJs = readFileSync(path.join(SNAKE_DIR, "game.js"),   "utf-8");

const E2E_SKIP = process.env.BRIX_E2E_SKIP === "1";

// ═══════════════════════════════════════════════════════════════
// §1. 정적 CSS 가드 — pointer-events 상속 차단 (RED→GREEN 핵심)
// ═══════════════════════════════════════════════════════════════

describe("BF-588 §1 정적 CSS 가드 — pointer-events 상속 차단", () => {
  test("§1-1 #paused-overlay 에 pointer-events: none 선언이 그대로 유지 (오버레이 배경 투과)", () => {
    // #paused-overlay 의 pointer-events: none 은 게임 배경 클릭 투과를 위해 의도된 것.
    // 이 가드는 "오버레이 자체의 none 을 제거하지 말 것" 회귀 방지.
    const m = css.match(/#paused-overlay[^{]*\{[^}]*\}/);
    assert.ok(m, "#paused-overlay 룰 자체가 사라짐 — 일시정지 오버레이 회귀");
    assert.ok(
      /pointer-events\s*:\s*none/.test(m[0]),
      "#paused-overlay 의 pointer-events: none 선언이 사라짐 — 오버레이 배경 투과 회귀",
    );
  });

  test("§1-2 (RED 핵심) .paused-box / .paused-btn / .paused-btn-container 중 하나가 pointer-events: auto|all 로 재활성화", () => {
    // 부모 #paused-overlay 가 pointer-events: none 을 자손에 상속시키므로
    // 일시정지 화면의 어떤 자손이라도 명시적으로 pointer-events 를 재활성화하지 않으면
    // [계속하기] / [재시작] / [설정] / [종료] 모든 버튼이 마우스로 클릭 불가.
    //
    // 이 가드가 BF-588 회귀의 1차 신호 — 수정 전 fail (red), 수정 후 pass (green).
    const candidates = [
      /\.paused-box\b[^{]*\{[^}]*pointer-events\s*:\s*(auto|all)\s*;/,
      /\.paused-btn\b[^{]*\{[^}]*pointer-events\s*:\s*(auto|all)\s*;/,
      /\.paused-btn-container\b[^{]*\{[^}]*pointer-events\s*:\s*(auto|all)\s*;/,
    ];
    const matchedRule = candidates.find((re) => re.test(css));
    assert.ok(
      matchedRule,
      "#paused-overlay { pointer-events: none } 상속 차단용 .paused-box / .paused-btn / " +
        ".paused-btn-container 의 pointer-events: auto (또는 all) 규칙이 없음 — " +
        "일시정지 모달의 모든 버튼이 마우스로 클릭 불가 (BF-588 핵심 회귀).",
    );
  });

  test("§1-3 #settings-modal 자체에는 pointer-events: none 박힘 없음 (모달 내부 컨트롤 클릭 보장)", () => {
    // 설정 모달은 z-index: 30 로 paused-overlay (z-index: 20) 위에 떠야 하고,
    // 내부 라디오/토글 클릭이 도달하려면 pointer-events 가 활성이어야 함.
    const m = css.match(/#settings-modal\b[^{]*\{[^}]*\}/);
    assert.ok(m, "#settings-modal 룰을 찾을 수 없음");
    assert.ok(
      !/pointer-events\s*:\s*none/.test(m[0]),
      "#settings-modal 에 pointer-events: none 이 박힘 — 설정 모달 자체 클릭 회귀",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §2. 정적 HTML 가드 — 일시정지 진입 마크업 박제
// ═══════════════════════════════════════════════════════════════

describe("BF-588 §2 정적 HTML 가드 — 일시정지 진입 selector", () => {
  test("§2-1 #paused-overlay 존재 (일시정지 모달 루트)", () => {
    assert.ok(
      html.includes('id="paused-overlay"'),
      "#paused-overlay 없음 — 일시정지 모달 회귀",
    );
  });

  test("§2-2 #paused-btn-settings 존재 (설정 진입 버튼)", () => {
    assert.ok(
      html.includes('id="paused-btn-settings"'),
      "#paused-btn-settings 없음 — 일시정지에서 설정 모달 진입 경로 회귀",
    );
  });

  test("§2-3 #paused-btn-settings 가 .paused-btn 클래스 사용 (재활성화 셀렉터 매칭 보장)", () => {
    // §1-2 의 .paused-btn 가드가 의미를 가지려면 실제 버튼이 그 클래스를 써야 함.
    const m = html.match(/<button[^>]*id="paused-btn-settings"[^>]*>/);
    assert.ok(m, "#paused-btn-settings 버튼 태그를 찾을 수 없음");
    assert.ok(
      /class="[^"]*\bpaused-btn\b[^"]*"/.test(m[0]),
      "#paused-btn-settings 에 .paused-btn 클래스가 누락 — §1-2 가드의 재활성화 셀렉터가 무효화됨",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §3. 정적 JS 가드 — 핸들러 바인딩 + 진입 경로 무회귀
// ═══════════════════════════════════════════════════════════════

describe("BF-588 §3 정적 JS 가드 — 일시정지 → 설정 모달 핸들러", () => {
  test("§3-1 pausedBtnSettingsEl 참조 존재", () => {
    assert.ok(
      /pausedBtnSettingsEl\s*=\s*document\.getElementById\(\s*["']paused-btn-settings["']\s*\)/.test(gameJs),
      "pausedBtnSettingsEl = getElementById('paused-btn-settings') 참조가 없음",
    );
  });

  test("§3-2 pausedBtnSettingsEl.addEventListener('click', ...) 바인딩 존재", () => {
    assert.ok(
      /pausedBtnSettingsEl\.addEventListener\(\s*["']click["']/.test(gameJs),
      "pausedBtnSettingsEl 의 click 핸들러 바인딩이 없음 — 진입 경로 회귀",
    );
  });

  test("§3-3 click 핸들러가 paused 상태에서 openSettingsModal 호출", () => {
    // pausedBtnSettingsEl click 콜백이 status === "paused" 가드 + openSettingsModal 호출 포함.
    const idx = gameJs.indexOf("pausedBtnSettingsEl.addEventListener");
    assert.ok(idx !== -1, "pausedBtnSettingsEl click 핸들러를 찾을 수 없음");
    const slice = gameJs.slice(idx, idx + 400);
    assert.ok(
      /status\s*===\s*["']paused["']/.test(slice),
      "click 핸들러가 status === 'paused' 가드를 잃어버림 (개행 검증) — 회귀",
    );
    assert.ok(
      /openSettingsModal\(/.test(slice),
      "click 핸들러가 openSettingsModal 을 호출하지 않음 — 회귀",
    );
  });

  test("§3-4 (회귀 가드) settingsModalEl 의 click 위임 핸들러도 그대로 유지 — 모달 내부 라디오/토글 클릭 보존", () => {
    assert.ok(
      /settingsModalEl\.addEventListener\(\s*["']click["']/.test(gameJs),
      "settingsModalEl 의 click 위임 핸들러가 사라짐 — 모달 내부 클릭 회귀",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §4. E2E — 일시정지 → [설정] 마우스 클릭 → 모달 열림 (AC1 핵심)
// ═══════════════════════════════════════════════════════════════

if (E2E_SKIP) {
  test("[E2E] §4 BRIX_E2E_SKIP=1 — CI 결정성 가드로 skip", (t) =>
    t.skip("BRIX_E2E_SKIP=1"));
} else {
  test("BF-588 E2E §4 (AC1): pause → #paused-btn-settings 마우스 클릭 → #settings-modal 표시", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#paused-overlay', { timeout: 5000 });
        console.log('[step0] DOM 로드 OK');

        // ① 게임 시작 직후엔 status="playing" → Space 로 일시정지 진입
        await page.keyboard.press('Space');
        await page.waitForFunction(
          () => !document.getElementById('paused-overlay').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        console.log('[step1] Space → #paused-overlay 표시 OK');

        // ② #paused-btn-settings 가 화면에 존재 확인
        const btnExists = await page.evaluate(() =>
          !!document.getElementById('paused-btn-settings')
        );
        if (!btnExists) {
          throw new Error('#paused-btn-settings 가 DOM 에 없음');
        }

        // ③ 핵심: 마우스 클릭으로 설정 모달이 열려야 함 (BF-588 회귀)
        await page.click('#paused-btn-settings');
        try {
          await page.waitForFunction(
            () => !document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 3000 }
          );
        } catch (err) {
          // pointer-events: none 상속으로 클릭이 핸들러까지 도달하지 못한 경우
          throw new Error(
            '#paused-btn-settings 마우스 클릭 후에도 #settings-modal 이 hidden 상태 — ' +
            '#paused-overlay { pointer-events: none } 상속 차단 누락 (BF-588 회귀)'
          );
        }
        console.log('[step2] 마우스 클릭 → #settings-modal 표시 OK (회귀 없음)');

        // ④ 모달 내부 라디오 클릭도 정상 동작 확인 (AC1: 설정 항목 즉시 변경)
        await page.click('[data-key="cpuCount"] [data-value="3"]');
        const pressed3 = await page.evaluate(() =>
          document.querySelector('[data-key="cpuCount"] [data-value="3"]').getAttribute('aria-pressed')
        );
        if (pressed3 !== 'true') {
          throw new Error(
            'cpuCount=3 라디오 클릭 후 aria-pressed 가 "true" 가 아님: "' + pressed3 + '" — ' +
            '설정 모달 내부 클릭 회귀'
          );
        }
        console.log('[step3] cpuCount=3 라디오 클릭 → aria-pressed="true" OK');

        // ⑤ 닫기 (취소)
        await page.click('.settings-btn-cancel');
        await page.waitForFunction(
          () => document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        console.log('[step4] [취소] 클릭 → 모달 닫힘 OK');

        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-588 §4 일시정지 → [설정] 마우스 클릭 진입 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-588",
        },
        body: JSON.stringify({
          url,
          label: "Snake 일시정지 → [설정] 마우스 클릭 → 모달 표시 [BF-588 AC1 §4]",
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
        `E2E §4 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (snake-BF586-e2e.test.js 패턴 재사용)
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
