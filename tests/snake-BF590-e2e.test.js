// BF-590 · 지렁이게임 설정 클릭 시나리오 E2E 회귀 가드
//
// 목적: BF-588 (일시정지 모달 [설정] 버튼 마우스 클릭 회복) 기준으로
//       "마우스 클릭 → 설정 값 변경 → 변경된 설정으로 게임 시작" 흐름 전체를 검증.
//       같은 클래스 버그 (pointer-events 상속, 이벤트 바인딩 누락, pendingSettings 미적용) 재발 차단.
//
// AC 매핑:
//   AC1 — 설정 패널의 각 항목을 마우스 클릭 → 클릭마다 DOM·state 가 기대대로 변경된다
//   AC2 — 설정 변경 후 게임 시작 → 변경된 설정 값으로 게임이 동작하는지 확인
//   AC3 — snake module 테스트만 실행 (focused scope)
//
// 기존 테스트와 중복 금지 항목 (BF-586-e2e / BF-588):
//   - #settings-trigger 클릭 → 모달 열기/닫기 (BF-586 §4-a)
//   - cpuCount 라디오 클릭 → aria-pressed 토글 (BF-586 §4-b)
//   - itemsEnabled ctrl-toggle 클릭 → aria-checked 반전 (BF-586 §5)
//   - cpuCount=N 저장 → localStorage + createInitialState extraCpus (BF-586 §6)
//   - pause → [설정] 마우스 클릭 → 모달 표시 (BF-588 §4)
//   - HTML selector 박제: #settings-modal, #settings-trigger, #paused-btn-settings 등 (BF-586 §1, BF-588 §2)
//   - pointer-events 상속 가드 (BF-588 §1)
//   - openSettingsModal / closeSettingsModal / saveSettingsModal 함수 존재 (BF-586 §3)
//
// 이 파일이 추가하는 고유 가드:
//   §1. HTML 마크업 — difficulty/initialLength/multiplierEnabled UI 박제 + #paused-btn-restart
//   §2. game.js 정적 가드 — doRestart() pendingSettings 적용 경로 (재시작 후 설정 반영 핵심 경로)
//   §3. E2E AC1 — difficulty 라디오 클릭 → aria-pressed 토글 (easy/normal)
//   §4. E2E AC1 — initialLength 라디오 클릭 → aria-pressed 토글 (3/5/7)
//   §5. E2E AC1 — multiplierEnabled ctrl-toggle 클릭 → aria-checked 반전
//   §6. E2E AC2 — 완전한 흐름: pause → 설정 변경 → 저장 → [재시작] 클릭 → pendingSettings 반영 확인
//
// 실행: node --test tests/snake-BF590-e2e.test.js

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

// E2E scope guard
const E2E_SKIP = process.env.BRIX_E2E_SKIP === "1";

// ═══════════════════════════════════════════════════════════════
// §1. HTML 마크업 정적 가드 — 미커버 설정 UI selector 박제
// ═══════════════════════════════════════════════════════════════
// BF-586 §1 은 data-key 그룹 존재만 확인.
// 이 섹션은 AC1 E2E 가 의존하는 구체적 data-value 버튼들과
// AC2 재시작 경로에 필요한 #paused-btn-restart 를 박제.

describe("BF-590 §1 HTML 마크업 — difficulty/initialLength/multiplierEnabled + 재시작 경로", () => {
  test("§1-1 difficulty easy 버튼 (data-value=\"easy\") 존재", () => {
    assert.ok(
      html.includes('data-value="easy"'),
      'difficulty easy 버튼 (data-value="easy") 없음 — easy 설정 클릭 경로 회귀',
    );
  });

  test("§1-2 difficulty normal 버튼 (data-value=\"normal\") 존재", () => {
    assert.ok(
      html.includes('data-value="normal"'),
      'difficulty normal 버튼 (data-value="normal") 없음 — normal 설정 클릭 경로 회귀',
    );
  });

  test("§1-3 data-key=\"initialLength\" 라디오 그룹 존재 (시작 길이 설정 UI)", () => {
    assert.ok(
      html.includes('data-key="initialLength"'),
      'data-key="initialLength" 없음 — 시작 길이 설정 UI 회귀',
    );
  });

  test("§1-4 initialLength=3 / 5 / 7 버튼 data-value 존재", () => {
    // initialLength 그룹 범위 추출
    const groupIdx = html.indexOf('data-key="initialLength"');
    assert.ok(groupIdx !== -1, 'data-key="initialLength" 그룹 없음');
    // 그룹 다음 닫히는 </div> 까지 슬라이싱
    const slice = html.slice(groupIdx, groupIdx + 600);
    assert.ok(slice.includes('data-value="3"'), 'initialLength=3 버튼 없음');
    assert.ok(slice.includes('data-value="5"'), 'initialLength=5 버튼 없음');
    assert.ok(slice.includes('data-value="7"'), 'initialLength=7 버튼 없음');
  });

  test("§1-5 data-key=\"multiplierEnabled\" ctrl-toggle 존재", () => {
    assert.ok(
      html.includes('data-key="multiplierEnabled"'),
      'data-key="multiplierEnabled" ctrl-toggle 없음 — 배수기 토글 UI 회귀',
    );
  });

  test("§1-6 #paused-btn-restart 존재 (설정 저장 후 재시작 경로 — AC2 핵심)", () => {
    assert.ok(
      html.includes('id="paused-btn-restart"'),
      '#paused-btn-restart 없음 — 설정 변경 후 게임 재시작 경로 회귀 (AC2)',
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §2. game.js 정적 가드 — doRestart() pendingSettings 적용 경로
// ═══════════════════════════════════════════════════════════════
// BF-586 §3 은 openSettingsModal/saveSettingsModal 함수 존재만 확인.
// 이 섹션은 "저장된 설정이 실제 게임 재시작에 반영"되는 경로를 fact 박제.
// doRestart() 가 pendingSettings → currentSettings 로 적용한 뒤 restartGame 을 호출하지
// 않으면 설정 저장이 게임에 무효화됨 (AC2 핵심 회귀).

describe("BF-590 §2 game.js — doRestart() pendingSettings 적용 경로 박제", () => {
  test("§2-1 doRestart 함수 내 pendingSettings → currentSettings 할당 존재", () => {
    // doRestart() 블록 추출 (중괄호 depth tracking)
    const idx = gameJs.indexOf("function doRestart(");
    assert.ok(idx !== -1, "doRestart 함수가 game.js 에 없음 — 재시작 핸들러 회귀");
    let depth = 0, fnEnd = idx;
    for (let i = idx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") {
        depth--;
        if (depth === 0) { fnEnd = i + 1; break; }
      }
    }
    const body = gameJs.slice(idx, fnEnd);
    assert.ok(
      body.includes("pendingSettings"),
      "doRestart() 에 pendingSettings 처리가 없음 — 설정 저장 후 재시작 시 설정 미반영 회귀",
    );
    assert.ok(
      /currentSettings\s*=\s*pendingSettings/.test(body),
      "doRestart() 에 currentSettings = pendingSettings 할당이 없음 — AC2 핵심 회귀",
    );
  });

  test("§2-2 doRestart() 가 restartGame 호출 — 설정 적용 후 실제 게임 상태 재초기화", () => {
    const idx = gameJs.indexOf("function doRestart(");
    assert.ok(idx !== -1, "doRestart 함수 없음");
    let depth = 0, fnEnd = idx;
    for (let i = idx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") {
        depth--;
        if (depth === 0) { fnEnd = i + 1; break; }
      }
    }
    const body = gameJs.slice(idx, fnEnd);
    assert.ok(
      /restartGame\(/.test(body),
      "doRestart() 에 restartGame 호출이 없음 — 설정 적용 후 게임 상태 재초기화 회귀",
    );
  });

  test("§2-3 initGame() 도 pendingSettings → currentSettings 할당 존재 (초기 시작 경로)", () => {
    const idx = gameJs.indexOf("function initGame(");
    assert.ok(idx !== -1, "initGame 함수가 game.js 에 없음");
    let depth = 0, fnEnd = idx;
    for (let i = idx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") {
        depth--;
        if (depth === 0) { fnEnd = i + 1; break; }
      }
    }
    const body = gameJs.slice(idx, fnEnd);
    assert.ok(
      /currentSettings\s*=\s*pendingSettings/.test(body),
      "initGame() 에 currentSettings = pendingSettings 할당 없음 — 초기 시작 경로 설정 미반영 회귀",
    );
  });

  test("§2-4 pausedBtnRestartEl.addEventListener('click', ...) 바인딩 존재", () => {
    assert.ok(
      /pausedBtnRestartEl\.addEventListener\(\s*["']click["']/.test(gameJs),
      "pausedBtnRestartEl 의 click 핸들러 바인딩이 없음 — [재시작] 버튼 동작 회귀",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §3~§6. E2E 가드 (e2e-runner)
// ═══════════════════════════════════════════════════════════════

if (E2E_SKIP) {
  test("[E2E] §3~§6 BRIX_E2E_SKIP=1 — CI 결정성 가드로 전체 skip", (t) =>
    t.skip("BRIX_E2E_SKIP=1"));
} else {
  // ─────────────────────────────────────────────────────────────
  // §3. E2E AC1 — difficulty 라디오 클릭 → aria-pressed 토글
  //
  // BF-586 §4-b 는 cpuCount 만 검증.
  // 이 가드는 difficulty easy/normal 선택 클릭을 처음 E2E 검증.
  // ─────────────────────────────────────────────────────────────
  test("BF-590 E2E §3 (AC1): difficulty easy/normal 라디오 클릭 → aria-pressed 토글", async (t) => {
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
        console.log('[step0] 페이지 로드 OK');

        // 설정 모달 열기 (#settings-trigger 클릭)
        // 게임이 playing 상태이면 settings-trigger 가 disabled → 먼저 pause
        await page.keyboard.press('Space');
        await page.waitForFunction(
          () => !document.getElementById('paused-overlay').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        console.log('[step1] Space → #paused-overlay 표시 OK');

        // 일시정지 모달에서 [설정] 버튼 클릭 (BF-588 회귀 경로)
        await page.click('#paused-btn-settings');
        await page.waitForFunction(
          () => !document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        console.log('[step2] [설정] 클릭 → #settings-modal 열림 OK');

        // 초기 상태 확인: difficulty normal=true, easy=false (기본값)
        const initState = await page.evaluate(() => {
          const group = document.querySelector('[data-key="difficulty"]');
          const btnEasy   = group.querySelector('[data-value="easy"]');
          const btnNormal = group.querySelector('[data-value="normal"]');
          return {
            easyPressed:   btnEasy.getAttribute('aria-pressed'),
            normalPressed: btnNormal.getAttribute('aria-pressed'),
          };
        });
        if (initState.normalPressed !== 'true') {
          throw new Error(
            '초기 difficulty=normal 버튼이 aria-pressed="true" 가 아님: "' + initState.normalPressed + '"'
          );
        }
        if (initState.easyPressed !== 'false') {
          throw new Error(
            '초기 difficulty=easy 버튼이 aria-pressed="false" 가 아님: "' + initState.easyPressed + '"'
          );
        }
        console.log('[step3] 초기 상태: difficulty=normal selected, easy=unselected OK');

        // difficulty=easy 클릭
        await page.click('[data-key="difficulty"] [data-value="easy"]');
        const afterEasy = await page.evaluate(() => {
          const group = document.querySelector('[data-key="difficulty"]');
          return {
            easyPressed:   group.querySelector('[data-value="easy"]').getAttribute('aria-pressed'),
            normalPressed: group.querySelector('[data-value="normal"]').getAttribute('aria-pressed'),
          };
        });
        if (afterEasy.easyPressed !== 'true') {
          throw new Error(
            'difficulty=easy 클릭 후 aria-pressed="true" 가 아님: "' + afterEasy.easyPressed + '" — ' +
            'handleRadioClick 이벤트 바인딩 또는 reflectDraftToControls 회귀'
          );
        }
        if (afterEasy.normalPressed !== 'false') {
          throw new Error(
            'difficulty=easy 클릭 후 normal 이 aria-pressed="false" 로 해제되지 않음: "' + afterEasy.normalPressed + '"'
          );
        }
        console.log('[step4] difficulty=easy 클릭 → aria-pressed 토글 OK');

        // difficulty=normal 재클릭 → 복원
        await page.click('[data-key="difficulty"] [data-value="normal"]');
        const afterNormal = await page.evaluate(() => {
          const group = document.querySelector('[data-key="difficulty"]');
          return {
            easyPressed:   group.querySelector('[data-value="easy"]').getAttribute('aria-pressed'),
            normalPressed: group.querySelector('[data-value="normal"]').getAttribute('aria-pressed'),
          };
        });
        if (afterNormal.normalPressed !== 'true') {
          throw new Error(
            'difficulty=normal 재클릭 후 aria-pressed="true" 가 아님: "' + afterNormal.normalPressed + '"'
          );
        }
        if (afterNormal.easyPressed !== 'false') {
          throw new Error(
            'difficulty=normal 재클릭 후 easy 가 "false" 로 해제되지 않음: "' + afterNormal.easyPressed + '"'
          );
        }
        console.log('[step5] difficulty=normal 재클릭 → 복원 OK');

        // 취소 닫기
        await page.click('.settings-btn-cancel');
        await page.waitForFunction(
          () => document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-590 §3 difficulty 라디오 클릭 → aria-pressed 토글 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-590",
        },
        body: JSON.stringify({
          url,
          label: "Snake difficulty 라디오 클릭 → aria-pressed 토글 [BF-590 AC1 §3]",
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
        `E2E §3 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // §4. E2E AC1 — initialLength 라디오 클릭 → aria-pressed 토글
  //
  // 시작 지렁이 길이 (3/5/7) 선택 클릭이 E2E 에서 처음 검증.
  // ─────────────────────────────────────────────────────────────
  test("BF-590 E2E §4 (AC1): initialLength 라디오 클릭 → aria-pressed 토글 (3/5/7)", async (t) => {
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
        console.log('[step0] 페이지 로드 OK');

        // pause → [설정] 클릭
        await page.keyboard.press('Space');
        await page.waitForFunction(
          () => !document.getElementById('paused-overlay').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        await page.click('#paused-btn-settings');
        await page.waitForFunction(
          () => !document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        console.log('[step1] 설정 모달 열림 OK');

        // 초기 상태: initialLength=3 이 기본값 (aria-pressed="true")
        const init = await page.evaluate(() => {
          const group = document.querySelector('[data-key="initialLength"]');
          if (!group) throw new Error('[data-key="initialLength"] 그룹 없음 — HTML 회귀');
          const btn3 = group.querySelector('[data-value="3"]');
          if (!btn3) throw new Error('initialLength=3 버튼 없음 — HTML 회귀');
          return btn3.getAttribute('aria-pressed');
        });
        if (init !== 'true') {
          throw new Error('초기 initialLength=3 이 aria-pressed="true" 가 아님: "' + init + '"');
        }
        console.log('[step2] 초기 initialLength=3 selected OK');

        // initialLength=5 클릭 → 토글
        await page.click('[data-key="initialLength"] [data-value="5"]');
        const after5 = await page.evaluate(() => {
          const group = document.querySelector('[data-key="initialLength"]');
          const btns = [...group.querySelectorAll('[data-value]')];
          return btns.map(b => ({ v: b.dataset.value, p: b.getAttribute('aria-pressed') }));
        });
        const sel5 = after5.filter(b => b.p === 'true');
        if (sel5.length !== 1 || sel5[0].v !== '5') {
          throw new Error(
            'initialLength=5 클릭 후 선택 상태 이상: ' + JSON.stringify(sel5) +
            ' — handleRadioClick 회귀 또는 reflectDraftToControls 미동작'
          );
        }
        console.log('[step3] initialLength=5 클릭 → 단일 선택 OK');

        // initialLength=7 클릭 → 토글
        await page.click('[data-key="initialLength"] [data-value="7"]');
        const after7 = await page.evaluate(() => {
          const group = document.querySelector('[data-key="initialLength"]');
          const btns = [...group.querySelectorAll('[data-value]')];
          return btns.map(b => ({ v: b.dataset.value, p: b.getAttribute('aria-pressed') }));
        });
        const sel7 = after7.filter(b => b.p === 'true');
        if (sel7.length !== 1 || sel7[0].v !== '7') {
          throw new Error(
            'initialLength=7 클릭 후 선택 상태 이상: ' + JSON.stringify(sel7)
          );
        }
        console.log('[step4] initialLength=7 클릭 → 단일 선택 OK');

        await page.click('.settings-btn-cancel');
        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-590 §4 initialLength 라디오 클릭 → aria-pressed 토글 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-590",
        },
        body: JSON.stringify({
          url,
          label: "Snake initialLength 라디오 클릭 → aria-pressed 토글 [BF-590 AC1 §4]",
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

  // ─────────────────────────────────────────────────────────────
  // §5. E2E AC1 — multiplierEnabled ctrl-toggle 클릭 → aria-checked 반전
  //
  // BF-586 §5 는 itemsEnabled(기본값=false) 만 검증.
  // multiplierEnabled 는 기본값=true 로 반전 방향이 반대 — 독립 검증 필요.
  // ─────────────────────────────────────────────────────────────
  test("BF-590 E2E §5 (AC1): multiplierEnabled ctrl-toggle 클릭 → aria-checked 반전 (기본값=true)", async (t) => {
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

        // pause → [설정] 클릭
        await page.keyboard.press('Space');
        await page.waitForFunction(
          () => !document.getElementById('paused-overlay').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        await page.click('#paused-btn-settings');
        await page.waitForFunction(
          () => !document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        console.log('[step1] 설정 모달 열림 OK');

        // 초기 상태: multiplierEnabled 기본값 true → aria-checked="true"
        const initChecked = await page.evaluate(() => {
          const tog = document.querySelector('.ctrl-toggle[data-key="multiplierEnabled"]');
          if (!tog) throw new Error('.ctrl-toggle[data-key="multiplierEnabled"] 없음 — HTML 회귀');
          return tog.getAttribute('aria-checked');
        });
        if (initChecked !== 'true') {
          throw new Error(
            'multiplierEnabled 초기 aria-checked 가 "true" 가 아님: "' + initChecked + '" — ' +
            'reflectDraftToControls 또는 초기값 회귀'
          );
        }
        console.log('[step2] 초기 multiplierEnabled aria-checked="true" OK');

        // 클릭 1회 → false (비활성화)
        await page.click('.ctrl-toggle[data-key="multiplierEnabled"]');
        const afterFirst = await page.evaluate(() =>
          document.querySelector('.ctrl-toggle[data-key="multiplierEnabled"]').getAttribute('aria-checked')
        );
        if (afterFirst !== 'false') {
          throw new Error(
            'multiplierEnabled 클릭 1회 후 aria-checked 가 "false" 가 아님: "' + afterFirst + '" — ' +
            'handleToggleClick 의 draftSettings[key] toggle 또는 이벤트 바인딩 회귀'
          );
        }
        console.log('[step3] 토글 클릭 1회 → aria-checked="false" (비활성화) OK');

        // 클릭 2회 → 원래대로 복원 (true)
        await page.click('.ctrl-toggle[data-key="multiplierEnabled"]');
        const afterSecond = await page.evaluate(() =>
          document.querySelector('.ctrl-toggle[data-key="multiplierEnabled"]').getAttribute('aria-checked')
        );
        if (afterSecond !== 'true') {
          throw new Error(
            'multiplierEnabled 클릭 2회 후 aria-checked 가 "true" 로 복원되지 않음: "' + afterSecond + '"'
          );
        }
        console.log('[step4] 토글 클릭 2회 → aria-checked="true" 복원 OK');

        await page.click('.settings-btn-cancel');
        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-590 §5 multiplierEnabled ctrl-toggle 클릭 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-590",
        },
        body: JSON.stringify({
          url,
          label: "Snake multiplierEnabled ctrl-toggle 클릭 → aria-checked 반전 [BF-590 AC1 §5]",
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
        `E2E §5 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // §6. E2E AC2 — 완전한 흐름: pause → 설정 변경 → 저장 → [재시작] → pendingSettings 반영
  //
  // BF-586 §6 은 window.createInitialState 직접 호출로 extraCpus 검증.
  // 이 가드는 실제 게임 재시작 버튼([재시작]) 클릭 경로 (doRestart()) 를 통해
  // pendingSettings → currentSettings 반영이 일어나는지 검증.
  //
  // 검증 체인:
  //   pause → [설정] 클릭 → difficulty=easy + cpuCount=2 선택 → [저장]
  //   → [재시작] 클릭 → #paused-overlay hidden (게임 재시작 확인)
  //   → localStorage 에 difficulty=easy, cpuCount=2 반영 확인
  //   → window.createInitialState({cpuCount:2}) extraCpus.length=1 확인
  // ─────────────────────────────────────────────────────────────
  test("BF-590 E2E §6 (AC2): 설정 변경 → 저장 → [재시작] 클릭 → pendingSettings 게임 반영 확인", async (t) => {
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

        // window.createInitialState 로드 대기 (AC2 검증에 사용)
        await page.waitForFunction(
          () => typeof window.createInitialState === 'function',
          { timeout: 5000 }
        );
        console.log('[step0] 페이지 로드 + createInitialState OK');

        // ① Space → 일시정지 (게임이 playing 상태이므로)
        await page.keyboard.press('Space');
        await page.waitForFunction(
          () => !document.getElementById('paused-overlay').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        console.log('[step1] Space → #paused-overlay 표시 OK');

        // ② [설정] 클릭 (마우스) — BF-588 수정된 경로
        await page.click('#paused-btn-settings');
        await page.waitForFunction(
          () => !document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        console.log('[step2] [설정] 마우스 클릭 → #settings-modal 열림 OK');

        // ③ difficulty=easy 선택
        await page.click('[data-key="difficulty"] [data-value="easy"]');
        const easyPressed = await page.evaluate(() =>
          document.querySelector('[data-key="difficulty"] [data-value="easy"]').getAttribute('aria-pressed')
        );
        if (easyPressed !== 'true') {
          throw new Error(
            'difficulty=easy 클릭 후 aria-pressed="true" 가 아님: "' + easyPressed + '"'
          );
        }
        console.log('[step3] difficulty=easy 선택 OK');

        // ④ cpuCount=2 선택
        await page.click('[data-key="cpuCount"] [data-value="2"]');
        const cpuPressed = await page.evaluate(() =>
          document.querySelector('[data-key="cpuCount"] [data-value="2"]').getAttribute('aria-pressed')
        );
        if (cpuPressed !== 'true') {
          throw new Error(
            'cpuCount=2 클릭 후 aria-pressed="true" 가 아님: "' + cpuPressed + '"'
          );
        }
        console.log('[step4] cpuCount=2 선택 OK');

        // ⑤ [저장] 클릭 → 모달 닫힘
        await page.click('.settings-btn-save');
        await page.waitForFunction(
          () => document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 3000 }
        );
        console.log('[step5] [저장] 클릭 → #settings-modal 닫힘 OK');

        // ⑥ [재시작] 버튼 클릭 (doRestart() 경로 — BF-590 AC2 핵심)
        //    #paused-overlay 가 여전히 표시 중이어야 함
        const overlayVisible = await page.evaluate(() =>
          !document.getElementById('paused-overlay').hasAttribute('hidden')
        );
        if (!overlayVisible) {
          throw new Error('#paused-overlay 가 [저장] 후 사라짐 — 재시작 버튼 클릭 불가 상태');
        }
        await page.click('#paused-btn-restart');

        // ⑦ 게임 재시작 확인: #paused-overlay 가 hidden 으로 전환
        await page.waitForFunction(
          () => document.getElementById('paused-overlay').hasAttribute('hidden'),
          { timeout: 5000 }
        );
        console.log('[step6] [재시작] 클릭 → #paused-overlay hidden (게임 재시작) OK');

        // ⑧ localStorage 에 저장된 설정 확인 (difficulty=easy, cpuCount=2)
        const lsRaw = await page.evaluate(() =>
          localStorage.getItem('bf-snake-settings')
        );
        if (!lsRaw) {
          throw new Error('localStorage["bf-snake-settings"] 없음 — saveSnakeSettings 또는 saveSettingsModal 회귀');
        }
        const saved = JSON.parse(lsRaw);
        if (saved.difficulty !== 'easy') {
          throw new Error(
            'localStorage difficulty 가 "easy" 가 아님: "' + saved.difficulty + '" — ' +
            'draftSettings 갱신 또는 saveSettingsModal 회귀'
          );
        }
        if (saved.cpuCount !== 2) {
          throw new Error(
            'localStorage cpuCount 가 2 가 아님: ' + saved.cpuCount
          );
        }
        console.log('[step7] localStorage difficulty=easy, cpuCount=2 확인 OK');

        // ⑨ window.createInitialState 로 새 설정 (cpuCount=2) 에 따른 extraCpus 검증
        //    doRestart() 가 currentSettings = pendingSettings 를 적용했다면
        //    게임 상태도 cpuCount=2 기준으로 초기화되어야 함.
        const result = await page.evaluate(() => {
          const s = window.createInitialState(30, 30, 0, { cpuCount: 2 });
          return {
            extraCpusLen: s.extraCpus ? s.extraCpus.length : -1,
            cpuBodyLen: s.cpu ? s.cpu.length : 0,
          };
        });
        if (result.extraCpusLen !== 1) {
          throw new Error(
            'cpuCount=2 → createInitialState extraCpus.length 기대=1, 실제=' + result.extraCpusLen +
            ' — createInitialState extraCpus 스폰 로직 회귀'
          );
        }
        if (result.cpuBodyLen === 0) {
          throw new Error('cpuCount=2 → main CPU body 가 비어 있음 — cpu 스폰 회귀');
        }
        console.log('[step8] createInitialState({cpuCount:2}) extraCpus.length=1 (총 2마리) OK');

        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-590 §6 완전한 흐름 (설정 변경 → 저장 → [재시작] → 반영 확인) PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-590",
        },
        body: JSON.stringify({
          url,
          label: "Snake 설정 변경 → 저장 → [재시작] → pendingSettings 게임 반영 [BF-590 AC2 §6]",
          scriptText,
          timeoutMs: 40000,
        }),
      });
      const json = await res.json();
      assert.ok(
        json.ok,
        `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
      );
      assert.ok(
        json.passed,
        `E2E §6 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (snake-BF586-e2e.test.js / snake-BF588.test.js 패턴 재사용)
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
