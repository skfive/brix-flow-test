/* BF-2007 · 뽀모도로 타이머 — tick / formatTime / validateDurationInput 단위 테스트
 * 명세: docs/plans/BF-2005/implementation-plan.md §5(순수 함수) / §6(설정 검증)
 *
 * pomodoro/package.json 이 "type": "commonjs" 를 지정하므로 require() 로 로드한다.
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { tick, formatTime, validateDurationInput } = require("../pomodoro.js");

// ─────────────────────── formatTime ───────────────────────

test("formatTime(0)은 00:00을 반환한다", () => {
  assert.equal(formatTime(0), "00:00");
});

test("formatTime(1500)은 25:00을 반환한다 (기본 focus 25분)", () => {
  assert.equal(formatTime(1500), "25:00");
});

test("formatTime(65)는 01:05를 반환한다", () => {
  assert.equal(formatTime(65), "01:05");
});

test("formatTime(3600)은 60:00을 반환한다", () => {
  assert.equal(formatTime(3600), "60:00");
});

test("formatTime은 음수를 0으로 clamp한다", () => {
  assert.equal(formatTime(-5), "00:00");
});

// ─────────────────────── tick — 상태 전이 ───────────────────────

function baseFocusState(overrides) {
  return Object.assign(
    {
      mode: "focus",
      remainingSeconds: 10,
      focusDurationMinutes: 25,
      breakDurationMinutes: 5,
      sessionCount: 0,
      resumeMode: null,
    },
    overrides,
  );
}

test("tick은 focus 상태에서 remainingSeconds를 1 감소시킨다", () => {
  const state = baseFocusState({ remainingSeconds: 10 });
  const next = tick(state);
  assert.equal(next.remainingSeconds, 9);
  assert.equal(next.mode, "focus");
});

test("tick은 focus 종료 시(remainingSeconds===0) break로 전이하고 sessionCount를 증가시킨다", () => {
  const state = baseFocusState({ remainingSeconds: 0, sessionCount: 2, breakDurationMinutes: 5 });
  const next = tick(state);
  assert.equal(next.mode, "break");
  assert.equal(next.remainingSeconds, 5 * 60);
  assert.equal(next.sessionCount, 3);
});

test("tick은 break 종료 시(remainingSeconds===0) focus로 전이하고 sessionCount는 변하지 않는다", () => {
  const state = baseFocusState({
    mode: "break",
    remainingSeconds: 0,
    sessionCount: 3,
    focusDurationMinutes: 25,
  });
  const next = tick(state);
  assert.equal(next.mode, "focus");
  assert.equal(next.remainingSeconds, 25 * 60);
  assert.equal(next.sessionCount, 3);
});

test("tick은 break 상태에서 remainingSeconds를 1 감소시킨다", () => {
  const state = baseFocusState({ mode: "break", remainingSeconds: 30 });
  const next = tick(state);
  assert.equal(next.remainingSeconds, 29);
  assert.equal(next.mode, "break");
});

test("tick은 idle 상태에서 호출되면 입력 state를 그대로 반환한다 (방어적)", () => {
  const state = baseFocusState({ mode: "idle", remainingSeconds: 1500 });
  const next = tick(state);
  assert.deepEqual(next, state);
});

test("tick은 paused 상태에서 호출되면 입력 state를 그대로 반환한다 (방어적)", () => {
  const state = baseFocusState({ mode: "paused", resumeMode: "focus", remainingSeconds: 100 });
  const next = tick(state);
  assert.deepEqual(next, state);
});

test("tick은 입력 state 객체를 변형하지 않는다 (불변성)", () => {
  const state = baseFocusState({ remainingSeconds: 10 });
  const snapshot = Object.assign({}, state);
  tick(state);
  assert.deepEqual(state, snapshot);
});

// ─────────────────────── validateDurationInput — AC-9 설정 값 검증 ───────────────────────

test("validateDurationInput은 0을 범위 밖으로 거부한다", () => {
  const result = validateDurationInput("0");
  assert.equal(result.valid, false);
  assert.ok(result.error);
});

test("validateDurationInput은 61을 범위 밖으로 거부한다", () => {
  const result = validateDurationInput("61");
  assert.equal(result.valid, false);
  assert.ok(result.error);
});

test("validateDurationInput은 숫자가 아닌 문자열을 거부한다", () => {
  const result = validateDurationInput("abc");
  assert.equal(result.valid, false);
  assert.ok(result.error);
});

test("validateDurationInput은 1~60 사이 정수를 허용한다", () => {
  const result = validateDurationInput("25");
  assert.equal(result.valid, true);
  assert.equal(result.value, 25);
});
