// BF-582 · 지렁이게임 설정 모달 및 게임 파라미터 적용 — 단위 테스트
//
// 본 task 의 범위(planner 명세 BF-579 §2, §5, §6, §9 + 본 task AC):
//   AC1 — 설정 값이 createInitialState 로 주입되어 cpuCount / initialLength / timeLimitSec 등이 게임 동작에 반영
//   AC2 — localStorage load 가 직전 저장값 복원 (validateAndMergeSettings)
//   AC3 — 잘못된 값(범위 외 / 타입 오류)은 폴백 + 검증 결과 객체로 차단
//   AC4 — 회귀: settings 미전달 시 기본값으로 동작 (기존 호출부 호환)
//
// 본 테스트는 logic.js 의 ES module export 만 사용 — DOM/canvas 의존 없음.
// 실행: node --test tests/snake-BF582.test.js

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SNAKE_SETTINGS_DEFAULTS,
  SNAKE_SETTINGS_LIMITS,
  SNAKE_SETTINGS_LS_KEY,
  SNAKE_SETTINGS_SCHEMA_VERSION,
  validateAndMergeSettings,
  clampInitialLength,
  createInitialState,
  restartGame,
} from "../snake/logic.js";

// ─────────────────────────────────────────────────────────────
// DEFAULTS / LIMITS 정합성
// ─────────────────────────────────────────────────────────────
test("BF-582 · SNAKE_SETTINGS_DEFAULTS — planner §2-1 표와 일치", () => {
  assert.equal(SNAKE_SETTINGS_DEFAULTS.schemaVersion, 1);
  assert.equal(SNAKE_SETTINGS_DEFAULTS.difficulty, "normal");
  assert.equal(SNAKE_SETTINGS_DEFAULTS.cpuCount, 1);
  assert.equal(SNAKE_SETTINGS_DEFAULTS.itemsEnabled, false);
  assert.equal(SNAKE_SETTINGS_DEFAULTS.itemSpawnRate, 0.5);
  assert.equal(SNAKE_SETTINGS_DEFAULTS.multiplierEnabled, true);
  assert.equal(SNAKE_SETTINGS_DEFAULTS.timeLimitSec, null);
  assert.equal(SNAKE_SETTINGS_DEFAULTS.initialLength, 3);
});

test("BF-582 · localStorage 키 + schemaVersion 상수", () => {
  assert.equal(SNAKE_SETTINGS_LS_KEY, "bf-snake-settings"); // planner §5-1
  assert.equal(SNAKE_SETTINGS_SCHEMA_VERSION, 1);
});

test("BF-582 · LIMITS 표 — planner §2-1 / §2-2 매핑 (BF-584: cpuCount 0~5 확장)", () => {
  assert.deepEqual(SNAKE_SETTINGS_LIMITS.difficulty, ["easy", "normal"]);
  // BF-584 supersedes BF-582: cpuCount 옵션이 0~5 까지 확장됨
  assert.deepEqual(SNAKE_SETTINGS_LIMITS.cpuCount, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(SNAKE_SETTINGS_LIMITS.itemSpawnRate, { min: 0.0, max: 1.0 });
  assert.deepEqual(SNAKE_SETTINGS_LIMITS.timeLimitSec, { min: 60, max: 600 });
  assert.deepEqual(SNAKE_SETTINGS_LIMITS.initialLength, [3, 5, 7]);
});

// ─────────────────────────────────────────────────────────────
// validateAndMergeSettings — AC2/AC3
// ─────────────────────────────────────────────────────────────
test("BF-582 · validateAndMergeSettings(null/undefined) — DEFAULTS 반환 (planner §5-4)", () => {
  assert.deepEqual(
    validateAndMergeSettings(null),
    { ...SNAKE_SETTINGS_DEFAULTS },
  );
  assert.deepEqual(
    validateAndMergeSettings(undefined),
    { ...SNAKE_SETTINGS_DEFAULTS },
  );
});

test("BF-582 · validateAndMergeSettings — 유효한 전체 객체 복원", () => {
  const raw = {
    schemaVersion: 1,
    difficulty: "easy",
    cpuCount: 0,
    itemsEnabled: true,
    itemSpawnRate: 0.7,
    multiplierEnabled: false,
    timeLimitSec: 180,
    initialLength: 5,
  };
  const out = validateAndMergeSettings(raw);
  assert.deepEqual(out, raw);
});

test("BF-582 EC-1 supersedes — BF-584: cpuCount=2 는 더 이상 폴백되지 않음 (그대로 보존)", () => {
  // BF-584 가 cpuCount 옵션을 0~5 로 확장하면서 본 EC-1 (cpuCount=2 → 1 폴백) 은 폐기됨.
  // 가드는 유지하되 "보존" 으로 의미 반전.
  const out = validateAndMergeSettings({ cpuCount: 2 });
  assert.equal(out.cpuCount, 2);
});

test("BF-582 · EC-2 — itemSpawnRate clamp 0..1 (planner §9 EC-2)", () => {
  const high = validateAndMergeSettings({ itemSpawnRate: 1.5 });
  assert.equal(high.itemSpawnRate, 1.0);
  const low = validateAndMergeSettings({ itemSpawnRate: -0.4 });
  assert.equal(low.itemSpawnRate, 0.0);
});

test("BF-582 · EC-4 — timeLimitSec 0 입력은 범위 clamp 60 (planner §9 EC-4)", () => {
  const out = validateAndMergeSettings({ timeLimitSec: 0 });
  assert.equal(out.timeLimitSec, 60);
});

test("BF-582 · timeLimitSec=null — 무제한 보존", () => {
  const out = validateAndMergeSettings({ timeLimitSec: null });
  assert.equal(out.timeLimitSec, null);
});

test("BF-582 · timeLimitSec 범위 초과(700) 는 max(600) clamp", () => {
  const out = validateAndMergeSettings({ timeLimitSec: 700 });
  assert.equal(out.timeLimitSec, 600);
});

test("BF-582 · initialLength 홀수만 허용 (4/9 → 기본값 폴백)", () => {
  const out1 = validateAndMergeSettings({ initialLength: 4 });
  assert.equal(out1.initialLength, SNAKE_SETTINGS_DEFAULTS.initialLength);
  const out2 = validateAndMergeSettings({ initialLength: 9 });
  assert.equal(out2.initialLength, SNAKE_SETTINGS_DEFAULTS.initialLength);
});

test("BF-582 · difficulty 알 수 없는 값 — 기본값 폴백", () => {
  const out = validateAndMergeSettings({ difficulty: "hard" });
  assert.equal(out.difficulty, "normal");
});

test("BF-582 · 모르는 필드는 무시 (planner §9 EC-11)", () => {
  const out = validateAndMergeSettings({
    cpuCount: 0,
    unknownField: 123,
    extra: { nested: true },
  });
  assert.equal(out.cpuCount, 0);
  assert.equal("unknownField" in out, false);
  assert.equal("extra" in out, false);
});

test("BF-582 · 부분 객체 머지 — 기본값과 합쳐짐", () => {
  const out = validateAndMergeSettings({ difficulty: "easy" });
  assert.equal(out.difficulty, "easy");
  assert.equal(out.cpuCount, SNAKE_SETTINGS_DEFAULTS.cpuCount);
  assert.equal(out.timeLimitSec, SNAKE_SETTINGS_DEFAULTS.timeLimitSec);
});

// ─────────────────────────────────────────────────────────────
// clampInitialLength — EC-3
// ─────────────────────────────────────────────────────────────
test("BF-582 · clampInitialLength — 격자 폭 충분하면 그대로", () => {
  assert.equal(clampInitialLength(7, 20), 7);
  assert.equal(clampInitialLength(5, 20), 5);
  assert.equal(clampInitialLength(3, 20), 3);
});

test("BF-582 · clampInitialLength — 격자 폭 < length 면 안전 길이로 폴백 (EC-3)", () => {
  // cols=5 → length=7 불가 → 5 도 cols(5) 미만 조건 위반 → 3 으로
  assert.equal(clampInitialLength(7, 5), 3);
  // cols=6 → length=7 → 5 가능 (5 < 6)
  assert.equal(clampInitialLength(7, 6), 5);
});

// ─────────────────────────────────────────────────────────────
// createInitialState — AC1/AC4
// ─────────────────────────────────────────────────────────────
test("BF-582 · AC4 — createInitialState(cols, rows, hs) settings 없이 호출 (기존 호환)", () => {
  const s = createInitialState(20, 20, 100);
  // 기본 length=3
  assert.equal(s.snake.length, 3);
  // 기본 cpuCount=1 → cpu 배열 비어있지 않음
  assert.ok(s.cpu.length > 0);
  // settings 필드는 항상 채워져 있어야 함
  assert.equal(s.settings.initialLength, 3);
  assert.equal(s.settings.cpuCount, 1);
});

test("BF-582 · AC1 — initialLength=5 → snake 길이 5", () => {
  const s = createInitialState(20, 20, 0, { initialLength: 5 });
  assert.equal(s.snake.length, 5);
});

test("BF-582 · AC1 — initialLength=7 → snake 길이 7", () => {
  const s = createInitialState(20, 20, 0, { initialLength: 7 });
  assert.equal(s.snake.length, 7);
});

test("BF-582 · AC1 — cpuCount=0 → 솔로 모드 (cpu 빈 배열)", () => {
  const s = createInitialState(20, 20, 0, { cpuCount: 0 });
  assert.equal(s.cpu.length, 0);
});

test("BF-582 · AC1 — settings.timeLimitSec=180 이 state.settings 에 전달", () => {
  const s = createInitialState(20, 20, 0, { timeLimitSec: 180 });
  assert.equal(s.settings.timeLimitSec, 180);
});

test("BF-582 · AC1 — settings.itemSpawnRate=0.9 이 state.settings 에 전달", () => {
  const s = createInitialState(20, 20, 0, { itemSpawnRate: 0.9 });
  assert.equal(s.settings.itemSpawnRate, 0.9);
});

test("BF-582 · AC1 — settings.itemsEnabled=false 가 기본 보존 (회귀)", () => {
  const s = createInitialState(20, 20, 0);
  assert.equal(s.settings.itemsEnabled, false);
});

test("BF-582 · EC-3 — 격자 폭 5 + initialLength=7 → 안전 길이로 폴백", () => {
  const s = createInitialState(5, 20, 0, { initialLength: 7 });
  // clampInitialLength(7, 5) = 3 (5 < 6 이므로 5 도 불가)
  assert.equal(s.snake.length, 3);
});

// ─────────────────────────────────────────────────────────────
// restartGame — settings 전달 동작
// ─────────────────────────────────────────────────────────────
test("BF-582 · restartGame(state) — state.settings 재사용", () => {
  const s1 = createInitialState(20, 20, 50, { initialLength: 7, cpuCount: 0 });
  const s2 = restartGame(s1);
  assert.equal(s2.snake.length, 7);
  assert.equal(s2.cpu.length, 0);
  assert.equal(s2.highScore, 50);
});

test("BF-582 · restartGame(state, newSettings) — 새 설정 적용", () => {
  const s1 = createInitialState(20, 20, 0, { initialLength: 3 });
  const s2 = restartGame(s1, { initialLength: 5, cpuCount: 1 });
  assert.equal(s2.snake.length, 5);
  assert.ok(s2.cpu.length > 0);
});

// ─────────────────────────────────────────────────────────────
// JSON parse round-trip — localStorage 영속화 시뮬레이션 (AC2)
// ─────────────────────────────────────────────────────────────
test("BF-582 · AC2 — JSON.stringify → parse → validateAndMerge 라운드트립", () => {
  const original = {
    schemaVersion: 1,
    difficulty: "easy",
    cpuCount: 0,
    itemsEnabled: true,
    itemSpawnRate: 0.3,
    multiplierEnabled: false,
    timeLimitSec: 300,
    initialLength: 5,
  };
  const serialized = JSON.stringify(original);
  const restored   = validateAndMergeSettings(JSON.parse(serialized));
  assert.deepEqual(restored, original);
});

test("BF-582 · AC3 — JSON 손상 시뮬레이션 — invalid object → DEFAULTS 폴백", () => {
  // parse 실패 시뮬레이션: 호출자가 try-catch 로 잡고 null/{} 전달
  const out = validateAndMergeSettings({});
  assert.deepEqual(out, { ...SNAKE_SETTINGS_DEFAULTS });
});

test("BF-582 · EC-11 — schemaVersion=2 (미래값) 도 알려진 필드는 수용", () => {
  const out = validateAndMergeSettings({
    schemaVersion: 2,
    difficulty: "easy",
    cpuCount: 0,
  });
  assert.equal(out.difficulty, "easy");
  assert.equal(out.cpuCount, 0);
  // schemaVersion 은 현재 버전(1) 으로 정규화
  assert.equal(out.schemaVersion, SNAKE_SETTINGS_SCHEMA_VERSION);
});
