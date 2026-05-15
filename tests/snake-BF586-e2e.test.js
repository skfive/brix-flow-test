// BF-586 · 지렁이게임 설정 동작 E2E 회귀 가드
//
// 목적: BF-584 (설정 클릭/적용 버그 수정 + 적 지렁이 수 2~5 확장) 기준으로
//       설정 뷰 인터랙션 · 옵션 적용 · 게임 진행 흐름의 E2E 회귀 가드 작성.
//       본 버그와 같은 클래스 (이벤트 바인딩 누락, 옵션 미반영) 의 재발 차단.
//
// AC 매핑:
//   AC1 — 설정 뷰 항목 클릭 시 선택 상태 토글 (aria-pressed / aria-checked) + 내부 상태 반영
//   AC2 — cpuCount 2/3/4/5 선택 후 저장 → 게임 시작 시 해당 수만큼 적 지렁이 등장
//   AC3 — 전체 회귀 스위트 (기존 + 신규 가드 모두 통과)
//
// dev snake-BF584.test.js 와 중복 금지 항목:
//   - §1 LIMITS/validateAndMergeSettings 단위 로직 검증
//   - §2 createInitialState extraCpus Node.js 단위 검증
//   - §3 restartGame cpuCount 단위 검증
//   - §4 DOM 정적 가드 (cpuCount 라디오 옵션 0~5 존재 확인, disabled 박제)
//   - §5 game.js 이벤트 바인딩 정적 패턴 (settingsModalEl.addEventListener 코드 존재)
//
// 이 파일이 추가하는 고유 가드:
//   §1. HTML 마크업 contract — 설정 뷰 selector 존재 박제 (fact 박제)
//   §2. CORS 안전 가드 — file:// 호환 (BF-522 회귀 보호)
//   §3. game.js 설정 함수 정적 가드 — openSettingsModal / closeSettingsModal / saveSettingsModal 존재
//   §4. E2E — 설정 모달 열기/닫기 + 라디오 클릭 → aria-pressed 토글 (AC1 인터랙션)
//   §5. E2E — ctrl-toggle 클릭 → aria-checked 반전 (AC1 토글 인터랙션)
//   §6. E2E — cpuCount=N 선택 + 저장 → localStorage + createInitialState extraCpus 검증 (AC2)
//
// 실행: node --test tests/snake-BF586-e2e.test.js

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
const gameJs = readFileSync(path.join(SNAKE_DIR, "game.js"),   "utf-8");

// ─────────────────────────────────────────────────────────────
// E2E scope guard — BRIX_E2E_SKIP=1 이면 §4~§6 전체 skip
// ─────────────────────────────────────────────────────────────
const E2E_SKIP = process.env.BRIX_E2E_SKIP === "1";

// ═══════════════════════════════════════════════════════════════
// §1. HTML 마크업 contract — 설정 뷰 selector 존재 박제
// ═══════════════════════════════════════════════════════════════
// dev §4 는 cpuCount 라디오 데이터값과 disabled 속성을 검증.
// tester 는 E2E 가 의존하는 selector 자체의 존재를 박제 — silent rename 방지.

describe("BF-586 §1 HTML 마크업 contract — 설정 뷰 selector", () => {
  test("§1-1 #settings-trigger 존재 (설정 진입 버튼)", () => {
    assert.ok(
      html.includes('id="settings-trigger"'),
      '#settings-trigger 없음 — 설정 진입 버튼 회귀'
    );
  });

  test("§1-2 #settings-modal 존재 (설정 모달 루트)", () => {
    assert.ok(
      html.includes('id="settings-modal"'),
      '#settings-modal 없음 — 설정 모달 루트 회귀'
    );
  });

  test("§1-3 .settings-btn-save 존재 (저장 버튼)", () => {
    assert.ok(
      html.includes('settings-btn-save'),
      '.settings-btn-save 없음 — 설정 저장 버튼 회귀'
    );
  });

  test("§1-4 .settings-btn-cancel 존재 (취소 버튼)", () => {
    assert.ok(
      html.includes('settings-btn-cancel'),
      '.settings-btn-cancel 없음 — 설정 취소 버튼 회귀'
    );
  });

  test("§1-5 .settings-close 존재 (모달 닫기 ×버튼)", () => {
    assert.ok(
      html.includes('settings-close'),
      '.settings-close 없음 — 모달 닫기 버튼 회귀'
    );
  });

  test("§1-6 data-key=\"cpuCount\" 라디오 그룹 존재", () => {
    assert.ok(
      html.includes('data-key="cpuCount"'),
      'data-key="cpuCount" 라디오 그룹 없음 — 적 지렁이 수 선택 UI 회귀'
    );
  });

  test("§1-7 data-key=\"difficulty\" 라디오 그룹 존재", () => {
    assert.ok(
      html.includes('data-key="difficulty"'),
      'data-key="difficulty" 라디오 그룹 없음 — 난이도 선택 UI 회귀'
    );
  });

  test("§1-8 data-key=\"itemsEnabled\" ctrl-toggle 존재", () => {
    assert.ok(
      html.includes('data-key="itemsEnabled"'),
      'data-key="itemsEnabled" 토글 없음 — 아이템 등장 토글 UI 회귀'
    );
  });

  test("§1-9 #paused-btn-settings 존재 (일시정지에서 설정 진입)", () => {
    assert.ok(
      html.includes('id="paused-btn-settings"'),
      '#paused-btn-settings 없음 — 일시정지→설정 진입 버튼 회귀'
    );
  });

  test("§1-10 #settings-validation-msg 존재 (유효성 검사 메시지 영역)", () => {
    assert.ok(
      html.includes('id="settings-validation-msg"'),
      '#settings-validation-msg 없음 — 설정 유효성 메시지 영역 회귀'
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §2. CORS 안전 가드 — file:// 호환 (BF-522 회귀 보호)
// ═══════════════════════════════════════════════════════════════

describe("BF-586 §2 CORS 안전 가드 — file:// 호환", () => {
  test("§2-1 (BF-522 회귀): snake/index.html 에 type=\"module\" 미사용", () => {
    assert.ok(
      !html.includes('type="module"'),
      'snake/index.html 에 type="module" 존재 — file:// CORS 회귀 (BF-522)'
    );
  });

  test("§2-2 (EC-CORS): snake/game.js 에 fetch() 미사용", () => {
    assert.ok(
      !gameJs.includes("fetch("),
      "game.js 에 fetch() 호출 존재 — file:// 환경에서 CORS 오류 발생 가능"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §3. game.js 설정 함수 정적 가드 — openSettingsModal / closeSettingsModal
// ═══════════════════════════════════════════════════════════════
// dev §5 는 이벤트 바인딩 패턴을 검증.
// tester 는 모달 흐름 함수 자체의 존재와 핵심 동작을 fact 박제.

describe("BF-586 §3 game.js 설정 함수 정적 가드", () => {
  test("§3-1 openSettingsModal 함수 존재", () => {
    assert.ok(
      gameJs.includes("function openSettingsModal"),
      "openSettingsModal 함수 없음 — 설정 모달 진입 불가 회귀"
    );
  });

  test("§3-2 closeSettingsModal 함수 존재", () => {
    assert.ok(
      gameJs.includes("function closeSettingsModal"),
      "closeSettingsModal 함수 없음 — 설정 모달 닫기 불가 회귀"
    );
  });

  test("§3-3 saveSettingsModal 함수 존재 (저장 버튼 핸들러)", () => {
    assert.ok(
      gameJs.includes("function saveSettingsModal"),
      "saveSettingsModal 함수 없음 — 저장 버튼 동작 회귀"
    );
  });

  test("§3-4 openSettingsModal 이 settingsModalEl hidden 제거 (removeAttribute)", () => {
    const idx = gameJs.indexOf("function openSettingsModal");
    assert.ok(idx !== -1, "openSettingsModal 함수 없음");
    let depth = 0, fnEnd = idx;
    for (let i = idx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(idx, fnEnd);
    assert.ok(
      body.includes('removeAttribute("hidden")') || body.includes("removeAttribute('hidden')"),
      "openSettingsModal 에 hidden 제거 코드 없음 — 모달이 열리지 않는 회귀"
    );
  });

  test("§3-5 saveSettingsModal 이 pendingSettings 에 merged 할당", () => {
    const idx = gameJs.indexOf("function saveSettingsModal");
    assert.ok(idx !== -1, "saveSettingsModal 함수 없음");
    let depth = 0, fnEnd = idx;
    for (let i = idx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(idx, fnEnd);
    assert.ok(
      /pendingSettings\s*=\s*merged/.test(body),
      "saveSettingsModal 에 pendingSettings = merged 할당 없음 — 저장된 설정이 게임에 미반영 회귀"
    );
  });

  test("§3-6 reflectDraftToControls 함수 존재 (UI ↔ draftSettings 동기화)", () => {
    assert.ok(
      gameJs.includes("function reflectDraftToControls"),
      "reflectDraftToControls 함수 없음 — 설정 모달 UI 동기화 회귀"
    );
  });

  test("§3-7 draftSettings 초기화 — openSettingsModal 이 pendingSettings || currentSettings base 사용", () => {
    const idx = gameJs.indexOf("function openSettingsModal");
    assert.ok(idx !== -1, "openSettingsModal 함수 없음");
    let depth = 0, fnEnd = idx;
    for (let i = idx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(idx, fnEnd);
    assert.ok(
      body.includes("pendingSettings") && body.includes("currentSettings"),
      "openSettingsModal 이 pendingSettings/currentSettings 를 base 로 draftSettings 초기화하지 않음 — 설정값 초기화 회귀"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §4. E2E — 설정 모달 열기/닫기 + 라디오 클릭 → aria-pressed 토글 (AC1)
// ═══════════════════════════════════════════════════════════════

if (E2E_SKIP) {
  test("[E2E] §4~§6 BRIX_E2E_SKIP=1 — CI 결정성 가드로 전체 skip", (t) =>
    t.skip("BRIX_E2E_SKIP=1"));
} else {
  // ─────────────────────────────────────────────────────────────
  // §4-a: 설정 모달 열기 → #settings-modal hidden 제거 확인
  // ─────────────────────────────────────────────────────────────
  test("BF-586 E2E §4-a (AC1): #settings-trigger 클릭 → #settings-modal 표시 (hidden 제거)", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        // clean state
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#settings-trigger', { timeout: 5000 });
        console.log('[step0] #settings-trigger 존재 확인 OK');

        // 초기 상태: settings-modal 은 hidden
        const initHidden = await page.evaluate(() =>
          document.getElementById('settings-modal').hasAttribute('hidden')
        );
        if (!initHidden) {
          throw new Error('초기 #settings-modal 이 hidden 상태가 아님 (초기화 문제)');
        }
        console.log('[step1] 초기 #settings-modal hidden=true OK');

        // #settings-trigger 클릭 → 모달 열림
        await page.click('#settings-trigger');
        const afterOpen = await page.evaluate(() =>
          document.getElementById('settings-modal').hasAttribute('hidden')
        );
        if (afterOpen) {
          throw new Error(
            '#settings-trigger 클릭 후에도 #settings-modal 이 hidden 상태 — ' +
            'openSettingsModal 의 removeAttribute("hidden") 누락 또는 클릭 핸들러 미연결'
          );
        }
        console.log('[step2] #settings-trigger 클릭 → #settings-modal 표시 OK');

        // .settings-close 클릭 → 모달 닫힘
        await page.click('.settings-close');
        const afterClose = await page.evaluate(() =>
          document.getElementById('settings-modal').hasAttribute('hidden')
        );
        if (!afterClose) {
          throw new Error('.settings-close 클릭 후 #settings-modal 이 닫히지 않음');
        }
        console.log('[step3] .settings-close 클릭 → #settings-modal hidden 복원 OK');

        console.log('[done] BF-586 §4-a 설정 모달 열기/닫기 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-586",
        },
        body: JSON.stringify({
          url,
          label: "Snake 설정 모달 열기/닫기 회귀 가드 [BF-586 AC1 §4-a]",
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
        `E2E §4-a 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1200)}`
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // §4-b: cpuCount 라디오 클릭 → aria-pressed 토글 (AC1 핵심 회귀)
  // 이전 버그: 클릭해도 aria-pressed 가 변하지 않음 (이벤트 핸들러 미연결)
  // ─────────────────────────────────────────────────────────────
  test("BF-586 E2E §4-b (AC1): cpuCount 라디오 클릭 → aria-pressed 토글 (이벤트 바인딩 회귀)", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#settings-trigger', { timeout: 5000 });

        // 설정 모달 열기
        await page.click('#settings-trigger');
        await page.waitForFunction(
          () => !document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        console.log('[step1] 설정 모달 열림 OK');

        // 초기 상태 확인: cpuCount=1 이 aria-pressed="true" (기본값)
        const initState = await page.evaluate(() => {
          const group = document.querySelector('[data-key="cpuCount"]');
          const btn1 = group.querySelector('[data-value="1"]');
          const btn2 = group.querySelector('[data-value="2"]');
          return {
            btn1Pressed: btn1.getAttribute('aria-pressed'),
            btn2Pressed: btn2.getAttribute('aria-pressed'),
          };
        });
        if (initState.btn1Pressed !== 'true') {
          throw new Error(
            '초기 cpuCount=1 버튼이 aria-pressed="true" 가 아님: "' + initState.btn1Pressed + '"'
          );
        }
        if (initState.btn2Pressed !== 'false') {
          throw new Error(
            '초기 cpuCount=2 버튼이 aria-pressed="false" 가 아님: "' + initState.btn2Pressed + '"'
          );
        }
        console.log('[step2] 초기 상태 cpuCount=1 selected, cpuCount=2 unselected OK');

        // cpuCount=2 버튼 클릭
        await page.click('[data-key="cpuCount"] [data-value="2"]');
        const afterClick = await page.evaluate(() => {
          const group = document.querySelector('[data-key="cpuCount"]');
          const btn1 = group.querySelector('[data-value="1"]');
          const btn2 = group.querySelector('[data-value="2"]');
          return {
            btn1Pressed: btn1.getAttribute('aria-pressed'),
            btn2Pressed: btn2.getAttribute('aria-pressed'),
          };
        });

        // 핵심 회귀 검증: 클릭 후 aria-pressed 가 바뀌어야 함
        if (afterClick.btn2Pressed !== 'true') {
          throw new Error(
            'cpuCount=2 클릭 후 aria-pressed="true" 가 아님: "' + afterClick.btn2Pressed + '" — ' +
            'handleRadioClick 이 draftSettings 를 갱신하지 않거나 reflectDraftToControls 회귀'
          );
        }
        if (afterClick.btn1Pressed !== 'false') {
          throw new Error(
            'cpuCount=2 클릭 후 cpuCount=1 버튼이 aria-pressed="false" 로 해제되지 않음: "' + afterClick.btn1Pressed + '"'
          );
        }
        console.log('[step3] cpuCount=2 클릭 → aria-pressed 토글 OK (회귀 없음)');

        // cpuCount=3 클릭으로 추가 검증
        await page.click('[data-key="cpuCount"] [data-value="3"]');
        const afterClick3 = await page.evaluate(() => {
          const group = document.querySelector('[data-key="cpuCount"]');
          const btns = [...group.querySelectorAll('[data-value]')];
          return btns.map(b => ({ v: b.dataset.value, p: b.getAttribute('aria-pressed') }));
        });
        const selected3 = afterClick3.filter(b => b.p === 'true');
        if (selected3.length !== 1 || selected3[0].v !== '3') {
          throw new Error(
            'cpuCount=3 클릭 후 selected 상태 이상: ' + JSON.stringify(selected3)
          );
        }
        console.log('[step4] cpuCount=3 클릭 → 단일 선택 유지 OK');

        // 취소 (모달 닫기)
        await page.click('.settings-btn-cancel');
        console.log('[done] BF-586 §4-b cpuCount 라디오 클릭 → aria-pressed 토글 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-586",
        },
        body: JSON.stringify({
          url,
          label: "Snake cpuCount 라디오 클릭 → aria-pressed 토글 [BF-586 AC1 §4-b]",
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
        `E2E §4-b 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1200)}`
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // §5. E2E — ctrl-toggle 클릭 → aria-checked 반전 (AC1 토글 인터랙션)
  // ═══════════════════════════════════════════════════════════════

  test("BF-586 E2E §5 (AC1): itemsEnabled ctrl-toggle 클릭 → aria-checked 반전 (토글 이벤트 바인딩 회귀)", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#settings-trigger', { timeout: 5000 });

        // 설정 모달 열기
        await page.click('#settings-trigger');
        await page.waitForFunction(
          () => !document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        console.log('[step1] 설정 모달 열림 OK');

        // 초기 상태: itemsEnabled 기본값 false → aria-checked="false"
        const initChecked = await page.evaluate(() => {
          const tog = document.querySelector('.ctrl-toggle[data-key="itemsEnabled"]');
          return tog.getAttribute('aria-checked');
        });
        if (initChecked !== 'false') {
          throw new Error('itemsEnabled 토글 초기 aria-checked 가 "false" 가 아님: "' + initChecked + '"');
        }
        console.log('[step2] 초기 itemsEnabled aria-checked="false" OK');

        // 클릭 1회 → aria-checked 반전 (true)
        await page.click('.ctrl-toggle[data-key="itemsEnabled"]');
        const afterFirst = await page.evaluate(() => {
          const tog = document.querySelector('.ctrl-toggle[data-key="itemsEnabled"]');
          return tog.getAttribute('aria-checked');
        });
        if (afterFirst !== 'true') {
          throw new Error(
            'itemsEnabled 토글 클릭 1회 후 aria-checked 가 "true" 가 아님: "' + afterFirst + '" — ' +
            'handleToggleClick 의 draftSettings[key] toggle 또는 이벤트 바인딩 회귀'
          );
        }
        console.log('[step3] 토글 클릭 1회 → aria-checked="true" OK');

        // 클릭 2회 → 원래대로 복원 (false)
        await page.click('.ctrl-toggle[data-key="itemsEnabled"]');
        const afterSecond = await page.evaluate(() => {
          const tog = document.querySelector('.ctrl-toggle[data-key="itemsEnabled"]');
          return tog.getAttribute('aria-checked');
        });
        if (afterSecond !== 'false') {
          throw new Error(
            'itemsEnabled 토글 클릭 2회 후 aria-checked 가 "false" 로 복원되지 않음: "' + afterSecond + '"'
          );
        }
        console.log('[step4] 토글 클릭 2회 → aria-checked="false" 복원 OK');

        await page.click('.settings-btn-cancel');
        console.log('[done] BF-586 §5 ctrl-toggle 클릭 → aria-checked 반전 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-586",
        },
        body: JSON.stringify({
          url,
          label: "Snake ctrl-toggle 클릭 → aria-checked 반전 [BF-586 AC1 §5]",
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
        `E2E §5 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1200)}`
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // §6. E2E — cpuCount=N 선택 + 저장 → localStorage + createInitialState 검증 (AC2)
  // ═══════════════════════════════════════════════════════════════
  // 검증 체인: 설정 클릭 → draftSettings 갱신 → [저장] 클릭 → localStorage 기록
  //            → createInitialState 로 extraCpus.length === N-1 확인
  //
  // AC2 (적 지렁이 수) 의 전체 브라우저 경로를 검증.
  // Node.js 단위 테스트 (dev BF-584 §2) 와 달리 실 브라우저에서 window 함수 경로를 검증.

  test("BF-586 E2E §6-a (AC2): cpuCount=2 선택+저장 → localStorage cpuCount=2 + extraCpus.length=1", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#settings-trigger', { timeout: 5000 });

        // window.createInitialState 로드 대기
        await page.waitForFunction(
          () => typeof window.createInitialState === 'function',
          { timeout: 5000 }
        );
        console.log('[step0] window.createInitialState 로드 OK');

        // 설정 모달 열기
        await page.click('#settings-trigger');
        await page.waitForFunction(
          () => !document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        console.log('[step1] 설정 모달 열림 OK');

        // cpuCount=2 클릭
        await page.click('[data-key="cpuCount"] [data-value="2"]');
        const pressed2 = await page.evaluate(() =>
          document.querySelector('[data-key="cpuCount"] [data-value="2"]').getAttribute('aria-pressed')
        );
        if (pressed2 !== 'true') {
          throw new Error('cpuCount=2 클릭 후 aria-pressed="true" 가 아님: "' + pressed2 + '"');
        }
        console.log('[step2] cpuCount=2 선택 OK (aria-pressed="true")');

        // [저장] 클릭
        await page.click('.settings-btn-save');
        await page.waitForFunction(
          () => document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        console.log('[step3] [저장] 클릭 → 모달 닫힘 OK');

        // localStorage 검증
        const lsRaw = await page.evaluate(() =>
          localStorage.getItem('bf-snake-settings')
        );
        if (!lsRaw) {
          throw new Error('저장 후 localStorage["bf-snake-settings"] 가 null — saveSnakeSettings 회귀');
        }
        const saved = JSON.parse(lsRaw);
        if (saved.cpuCount !== 2) {
          throw new Error(
            'localStorage 의 cpuCount 가 2 가 아님: ' + saved.cpuCount +
            ' — pendingSettings 할당 또는 saveSnakeSettings 회귀'
          );
        }
        console.log('[step4] localStorage cpuCount=2 저장 확인 OK');

        // window.createInitialState 로 extraCpus 검증 (AC2: 2마리 → extraCpus.length=1)
        const result = await page.evaluate(() => {
          const s = window.createInitialState(30, 30, 0, { cpuCount: 2 });
          return {
            extraCpusLen: s.extraCpus ? s.extraCpus.length : -1,
            cpuBodyLen: s.cpu ? s.cpu.length : 0,
          };
        });
        if (result.extraCpusLen !== 1) {
          throw new Error(
            'cpuCount=2 → extraCpus.length 가 1 이어야 하는데 ' + result.extraCpusLen +
            ' — createInitialState extraCpus 스폰 로직 회귀'
          );
        }
        if (result.cpuBodyLen === 0) {
          throw new Error('cpuCount=2 → main CPU body 가 비어 있음 — cpu 스폰 회귀');
        }
        console.log('[step5] cpuCount=2 → extraCpus.length=1 (총 2마리) OK');

        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-586 §6-a cpuCount=2 선택+저장+extraCpus 검증 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-586",
        },
        body: JSON.stringify({
          url,
          label: "Snake cpuCount=2 선택+저장 → extraCpus.length=1 검증 [BF-586 AC2 §6-a]",
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
        `E2E §6-a 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1200)}`
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("BF-586 E2E §6-b (AC2): cpuCount=3/4/5 각각 저장 → extraCpus.length=N-1 확인", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#settings-trigger', { timeout: 5000 });

        await page.waitForFunction(
          () => typeof window.createInitialState === 'function',
          { timeout: 5000 }
        );
        console.log('[step0] window.createInitialState 로드 OK');

        // cpuCount 3, 4, 5 를 각각 선택+저장 후 extraCpus 검증
        for (const n of [3, 4, 5]) {
          // 모달 열기
          await page.click('#settings-trigger');
          await page.waitForFunction(
            () => !document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 3000 }
          );

          // cpuCount=n 클릭
          await page.click('[data-key="cpuCount"] [data-value="' + n + '"]');
          const pressed = await page.evaluate((val) =>
            document.querySelector('[data-key="cpuCount"] [data-value="' + val + '"]').getAttribute('aria-pressed'),
            n
          );
          if (pressed !== 'true') {
            throw new Error('cpuCount=' + n + ' 클릭 후 aria-pressed="true" 가 아님: "' + pressed + '"');
          }

          // 저장
          await page.click('.settings-btn-save');
          await page.waitForFunction(
            () => document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 3000 }
          );

          // localStorage 확인
          const lsRaw = await page.evaluate(() =>
            localStorage.getItem('bf-snake-settings')
          );
          const saved = lsRaw ? JSON.parse(lsRaw) : null;
          if (!saved || saved.cpuCount !== n) {
            throw new Error(
              'cpuCount=' + n + ' 저장 후 localStorage.cpuCount 가 ' + n + ' 이 아님: ' +
              (saved ? saved.cpuCount : 'null')
            );
          }
          console.log('[cpuCount=' + n + '] localStorage 저장 OK');

          // window.createInitialState 로 extraCpus 검증
          const result = await page.evaluate((cpuCount) => {
            const s = window.createInitialState(40, 40, 0, { cpuCount });
            return {
              extraCpusLen: s.extraCpus ? s.extraCpus.length : -1,
              cpuBodyLen: s.cpu ? s.cpu.length : 0,
            };
          }, n);

          const expectedExtra = n - 1;
          if (result.extraCpusLen !== expectedExtra) {
            throw new Error(
              'cpuCount=' + n + ' → extraCpus.length 기대=' + expectedExtra +
              ' 실제=' + result.extraCpusLen + ' — BF-584 extraCpus 스폰 회귀'
            );
          }
          console.log('[cpuCount=' + n + '] extraCpus.length=' + expectedExtra + ' OK');
        }

        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-586 §6-b cpuCount=3/4/5 extraCpus.length=N-1 전체 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-586",
        },
        body: JSON.stringify({
          url,
          label: "Snake cpuCount=3/4/5 저장 → extraCpus.length=N-1 검증 [BF-586 AC2 §6-b]",
          scriptText,
          timeoutMs: 60000,
        }),
      });
      const json = await res.json();
      assert.ok(
        json.ok,
        `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`
      );
      assert.ok(
        json.passed,
        `E2E §6-b 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1200)}`
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (snake-BF569-e2e.test.js / snake-BF574-e2e.test.js 패턴 재사용)
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
