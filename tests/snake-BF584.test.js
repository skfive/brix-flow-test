// BF-584 · 지렁이게임 설정 클릭/적용 버그 수정 + 적 지렁이 수 옵션 확장 (2/3/4/5)
//
// AC 매핑:
//   AC1 — 설정 항목 클릭 시 시각 상태 (aria-pressed/aria-checked) 변경 + draft 반영
//   AC2 — cpuCount 2/3/4/5 선택 가능 + 해당 수만큼 적 지렁이 등장
//   AC3 — 저장한 설정값이 게임 시작 시 (createInitialState/restartGame) 실제 반영
//
// 회귀 가드 클래스:
//   - 이벤트 바인딩 누락 — 라디오/토글 click delegated handler 가 game.js 에 존재
//   - 상태 미반영      — handleRadioClick 이 draftSettings 를 갱신
//   - cpuCount=2 disabled 박제 회피 — disabled 속성이 더 이상 존재하지 않아야 함
//
// 실행: node --test tests/snake-BF584.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SNAKE_SETTINGS_DEFAULTS,
  SNAKE_SETTINGS_LIMITS,
  validateAndMergeSettings,
  createInitialState,
  restartGame,
} from "../snake/logic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SNAKE_DIR = path.join(REPO_ROOT, "snake");
const html   = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
const gameJs = readFileSync(path.join(SNAKE_DIR, "game.js"),   "utf-8");

// ═══════════════════════════════════════════════════════════════
// §1. 로직 — LIMITS / validateAndMergeSettings (AC2, AC3 기반)
// ═══════════════════════════════════════════════════════════════

describe("BF-584 §1 logic — cpuCount 2/3/4/5 허용", () => {
  test("§1-1 SNAKE_SETTINGS_LIMITS.cpuCount 가 [0,1,2,3,4,5] 를 모두 포함", () => {
    const expected = [0, 1, 2, 3, 4, 5];
    for (const v of expected) {
      assert.ok(
        SNAKE_SETTINGS_LIMITS.cpuCount.includes(v),
        `LIMITS.cpuCount 에 ${v} 누락 — 현재값=${JSON.stringify(SNAKE_SETTINGS_LIMITS.cpuCount)}`,
      );
    }
  });

  test("§1-2 validateAndMergeSettings({cpuCount: 2}) — 2 그대로 보존 (BF-579 EC-1 폴백 회귀)", () => {
    const out = validateAndMergeSettings({ cpuCount: 2 });
    assert.equal(out.cpuCount, 2, "cpuCount=2 가 1 로 폴백되면 안 됨 (BF-584 확장)");
  });

  test("§1-3 validateAndMergeSettings({cpuCount: 3/4/5}) — 모두 보존", () => {
    for (const n of [3, 4, 5]) {
      const out = validateAndMergeSettings({ cpuCount: n });
      assert.equal(out.cpuCount, n, `cpuCount=${n} 가 보존되지 않음`);
    }
  });

  test("§1-4 validateAndMergeSettings({cpuCount: 6}) — 범위 외 → 기본값(1) 폴백", () => {
    const out = validateAndMergeSettings({ cpuCount: 6 });
    assert.equal(out.cpuCount, SNAKE_SETTINGS_DEFAULTS.cpuCount);
  });

  test("§1-5 validateAndMergeSettings({cpuCount: -1}) — 범위 외 → 기본값 폴백", () => {
    const out = validateAndMergeSettings({ cpuCount: -1 });
    assert.equal(out.cpuCount, SNAKE_SETTINGS_DEFAULTS.cpuCount);
  });

  test("§1-6 validateAndMergeSettings({cpuCount: 1.5}) — 비정수 → 기본값 폴백", () => {
    const out = validateAndMergeSettings({ cpuCount: 1.5 });
    assert.equal(out.cpuCount, SNAKE_SETTINGS_DEFAULTS.cpuCount);
  });
});

// ═══════════════════════════════════════════════════════════════
// §2. createInitialState — extraCpus 로 N-1 추가 CPU 등장 (AC2)
// ═══════════════════════════════════════════════════════════════

describe("BF-584 §2 createInitialState — extraCpus", () => {
  test("§2-1 cpuCount=0 → cpu 빈 + extraCpus 빈 (회귀)", () => {
    const s = createInitialState(30, 30, 0, { cpuCount: 0 });
    assert.equal(s.cpu.length, 0);
    assert.ok(Array.isArray(s.extraCpus), "extraCpus 필드가 존재해야 함 (배열)");
    assert.equal(s.extraCpus.length, 0);
  });

  test("§2-2 cpuCount=1 → cpu 채움 + extraCpus 빈 (회귀)", () => {
    const s = createInitialState(30, 30, 0, { cpuCount: 1 });
    assert.ok(s.cpu.length > 0, "main CPU 가 채워져야 함");
    assert.equal(s.extraCpus.length, 0);
  });

  test("§2-3 cpuCount=2 → main + extraCpus.length === 1 (총 2 마리)", () => {
    const s = createInitialState(30, 30, 0, { cpuCount: 2 });
    assert.ok(s.cpu.length > 0, "main CPU body 가 비어 있음");
    assert.equal(s.extraCpus.length, 1);
    const extra = s.extraCpus[0];
    assert.ok(Array.isArray(extra.body), "extraCpu.body 가 배열이 아님");
    assert.ok(extra.body.length > 0, "extraCpu.body 가 비어 있음");
    assert.ok(extra.dir, "extraCpu.dir 누락");
  });

  test("§2-4 cpuCount=3/4/5 → extraCpus.length === N-1", () => {
    for (const n of [3, 4, 5]) {
      const s = createInitialState(40, 40, 0, { cpuCount: n });
      assert.equal(s.extraCpus.length, n - 1, `cpuCount=${n} → extraCpus.length 불일치`);
      for (const e of s.extraCpus) {
        assert.ok(e.body && e.body.length > 0, `cpuCount=${n} 의 extra body 비어 있음`);
      }
    }
  });

  test("§2-5 모든 CPU body 셀이 격자 내", () => {
    const cols = 30, rows = 30;
    const s = createInitialState(cols, rows, 0, { cpuCount: 5 });
    const allCells = [...s.cpu, ...s.extraCpus.flatMap(e => e.body)];
    for (const c of allCells) {
      assert.ok(c.x >= 0 && c.x < cols, `x=${c.x} 가 격자 외`);
      assert.ok(c.y >= 0 && c.y < rows, `y=${c.y} 가 격자 외`);
    }
  });

  test("§2-6 모든 CPU 와 player snake 셀이 서로 겹치지 않음 (스폰 충돌 방지)", () => {
    const s = createInitialState(40, 40, 0, { cpuCount: 5 });
    const seen = new Set();
    const all = [
      ...s.snake,
      ...s.cpu,
      ...s.extraCpus.flatMap(e => e.body),
    ];
    for (const c of all) {
      const key = `${c.x},${c.y}`;
      assert.ok(!seen.has(key), `중복 좌표 ${key} — CPU/player 스폰 겹침`);
      seen.add(key);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// §3. restartGame 도 cpuCount > 1 적용 (AC3)
// ═══════════════════════════════════════════════════════════════

describe("BF-584 §3 restartGame — cpuCount 적용", () => {
  test("§3-1 restartGame(state, {cpuCount: 4}) → extraCpus.length === 3", () => {
    const s1 = createInitialState(30, 30, 100, { cpuCount: 1 });
    const s2 = restartGame(s1, { cpuCount: 4 });
    assert.equal(s2.extraCpus.length, 3);
    assert.equal(s2.highScore, 100);
  });

  test("§3-2 restartGame(state) state.settings 재사용 — cpuCount=3 보존", () => {
    const s1 = createInitialState(30, 30, 0, { cpuCount: 3 });
    const s2 = restartGame(s1);
    assert.equal(s2.extraCpus.length, 2);
  });
});

// ═══════════════════════════════════════════════════════════════
// §4. DOM static gates — index.html 의 radio 옵션 + inline IIFE LIMITS
// ═══════════════════════════════════════════════════════════════

describe("BF-584 §4 DOM static — cpuCount 라디오 + 인라인 LIMITS", () => {
  test("§4-1 cpuCount 라디오 그룹에 0/1/2/3/4/5 6개 모두 존재", () => {
    // 마크업: <button class="ctrl-radio" data-value="N">
    // data-key="cpuCount" 그룹 안에서 0~5 까지
    const groupMatch = html.match(/data-key="cpuCount"[\s\S]*?<\/div>/);
    assert.ok(groupMatch, 'data-key="cpuCount" 라디오 그룹을 찾을 수 없음');
    const groupHtml = groupMatch[0];
    for (const v of ["0", "1", "2", "3", "4", "5"]) {
      const re = new RegExp(`data-value="${v}"`);
      assert.ok(
        re.test(groupHtml),
        `cpuCount 라디오 그룹에 data-value="${v}" 누락`,
      );
    }
  });

  test("§4-2 cpuCount=2 라디오에 disabled 속성 제거 (BF-582 EC-1 박제 회피)", () => {
    const groupMatch = html.match(/data-key="cpuCount"[\s\S]*?<\/div>/);
    const groupHtml  = groupMatch[0];
    // data-value="2" 가 들어 있는 <button> 태그를 추출해 disabled 검사
    const btn2Match = groupHtml.match(/<button[^>]*data-value="2"[^>]*>[\s\S]*?<\/button>/);
    assert.ok(btn2Match, 'cpuCount=2 버튼을 찾을 수 없음');
    const btn2Html = btn2Match[0];
    assert.ok(
      !/\bdisabled\b/.test(btn2Html),
      `cpuCount=2 버튼에 disabled 가 남아 있음: ${btn2Html}`,
    );
    assert.ok(
      !/aria-disabled="true"/.test(btn2Html),
      `cpuCount=2 버튼에 aria-disabled="true" 가 남아 있음: ${btn2Html}`,
    );
  });

  test("§4-3 인라인 IIFE 의 SNAKE_SETTINGS_LIMITS.cpuCount 도 [0..5] 포함", () => {
    // index.html 안의 var SNAKE_SETTINGS_LIMITS = ... cpuCount: [0, 1, 2, ...]
    const m = html.match(/SNAKE_SETTINGS_LIMITS\s*=\s*Object\.freeze\(\{[\s\S]*?cpuCount:\s*\[([^\]]*)\]/);
    assert.ok(m, '인라인 IIFE 의 SNAKE_SETTINGS_LIMITS.cpuCount 를 찾을 수 없음');
    const list = m[1].split(",").map(s => Number(s.trim())).filter(Number.isFinite);
    for (const v of [0, 1, 2, 3, 4, 5]) {
      assert.ok(list.includes(v), `인라인 LIMITS.cpuCount 에 ${v} 누락 — 현재=${JSON.stringify(list)}`);
    }
  });

  test("§4-4 인라인 IIFE 의 validateAndMergeSettings 가 cpuCount=2 를 1 로 폴백하지 않음", () => {
    // 'settings.cpuCount=2 미지원' 경고 메시지가 인라인 IIFE 에 남아 있으면 안 됨
    const m = html.match(/cpuCount\s*===\s*2[\s\S]{0,120}out\.cpuCount\s*=\s*1/);
    assert.ok(
      !m,
      '인라인 IIFE 에 cpuCount===2 → 1 폴백 코드가 남아 있음 (BF-584 회귀)',
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §5. game.js 핸들러 정적 가드 — 이벤트 바인딩 누락 회귀 방지
// ═══════════════════════════════════════════════════════════════

describe("BF-584 §5 game.js — 이벤트 바인딩 정적 가드", () => {
  test("§5-1 settingsModalEl.addEventListener('click', ...) delegated handler 존재", () => {
    assert.ok(
      /settingsModalEl\.addEventListener\(\s*["']click["']/.test(gameJs),
      'settingsModalEl 의 click delegated handler 가 누락됨 — 클릭이 안 되는 회귀',
    );
  });

  test("§5-2 settingsModalEl.addEventListener('input', ...) (slider/number) handler 존재", () => {
    assert.ok(
      /settingsModalEl\.addEventListener\(\s*["']input["']/.test(gameJs),
      'settingsModalEl 의 input handler 가 누락됨 — 슬라이더 / 숫자 입력 미반응',
    );
  });

  test("§5-3 handleRadioClick 가 draftSettings[key] 를 실제로 갱신", () => {
    const idx = gameJs.indexOf("function handleRadioClick");
    assert.ok(idx !== -1, "handleRadioClick 함수가 없음");
    const body = gameJs.slice(idx, idx + 1500);
    assert.ok(
      /draftSettings\s*\[\s*key\s*\]\s*=\s*value/.test(body),
      "handleRadioClick 본문에 draftSettings[key] = value 할당이 없음 — 상태 미반영 회귀",
    );
  });

  test("§5-4 handleToggleClick 가 draftSettings[key] 를 toggle", () => {
    const idx = gameJs.indexOf("function handleToggleClick");
    assert.ok(idx !== -1, "handleToggleClick 함수가 없음");
    const body = gameJs.slice(idx, idx + 600);
    assert.ok(
      /draftSettings\s*\[\s*key\s*\]\s*=/.test(body),
      "handleToggleClick 본문에 draftSettings[key] 할당이 없음",
    );
  });

  test("§5-5 doRestart 가 pendingSettings 를 currentSettings 에 적용", () => {
    const idx = gameJs.indexOf("function doRestart");
    assert.ok(idx !== -1, "doRestart 함수가 없음");
    const body = gameJs.slice(idx, idx + 1500);
    assert.ok(
      /pendingSettings/.test(body) && /currentSettings\s*=\s*pendingSettings/.test(body),
      "doRestart 가 pendingSettings 를 currentSettings 로 적용하지 않음 — 게임 시작 시 미반영 회귀",
    );
  });

  test("§5-6 initGame 도 pendingSettings 를 currentSettings 에 적용", () => {
    const idx = gameJs.indexOf("function initGame");
    assert.ok(idx !== -1, "initGame 함수가 없음");
    const body = gameJs.slice(idx, idx + 1500);
    assert.ok(
      /pendingSettings/.test(body) && /currentSettings\s*=\s*pendingSettings/.test(body),
      "initGame 이 pendingSettings 를 currentSettings 로 적용하지 않음",
    );
  });

  test("§5-7 createInitialState 호출 시 currentSettings 인자 전달", () => {
    // initGame 또는 doRestart 어디든 createInitialState(..., currentSettings) 또는 restartGame(state, currentSettings) 가 있어야 함
    assert.ok(
      /createInitialState\([^)]*,\s*currentSettings\s*\)/.test(gameJs)
        || /restartGame\(\s*state\s*,\s*currentSettings\s*\)/.test(gameJs),
      "createInitialState/restartGame 에 currentSettings 가 전달되지 않음 — 설정 미반영",
    );
  });
});
