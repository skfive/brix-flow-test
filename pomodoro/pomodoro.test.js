/* BF-2085 · 뽀모도로 타이머 — nextPhase / formatTime / tick / createTimerEngine 단위 테스트
 * 명세: docs/plans/BF-2083/implementation-plan.md §1(상태 전이표) / §2(순수 함수 시그니처)
 *
 * pomodoro/package.json 이 "type": "commonjs" 를 지정하므로 require() 로 로드한다.
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { nextPhase, formatTime, tick, createTimerEngine } = require("./pomodoro.js");

// ─────────────────────── §2.1 nextPhase ───────────────────────

test("nextPhase: focus 완료(1회차) → short-break, cycleCount=1, 300초", () => {
  const next = nextPhase({ phase: "focus", cycleCount: 0 });
  assert.deepEqual(next, { phase: "short-break", cycleCount: 1, remainingSeconds: 300 });
});

test("nextPhase: focus 완료(4회차) → long-break, cycleCount=4, 900초", () => {
  const next = nextPhase({ phase: "focus", cycleCount: 3 });
  assert.deepEqual(next, { phase: "long-break", cycleCount: 4, remainingSeconds: 900 });
});

test("nextPhase: short-break 완료 → focus, cycleCount 변화 없음, 1500초", () => {
  const next = nextPhase({ phase: "short-break", cycleCount: 1 });
  assert.deepEqual(next, { phase: "focus", cycleCount: 1, remainingSeconds: 1500 });
});

test("nextPhase: long-break 완료 → focus, cycleCount 변화 없음, 1500초", () => {
  const next = nextPhase({ phase: "long-break", cycleCount: 4 });
  assert.deepEqual(next, { phase: "focus", cycleCount: 4, remainingSeconds: 1500 });
});

test("nextPhase: focus 완료(8회차) → long-break, cycleCount=8, 900초", () => {
  const next = nextPhase({ phase: "focus", cycleCount: 7 });
  assert.deepEqual(next, { phase: "long-break", cycleCount: 8, remainingSeconds: 900 });
});

// ─────────────────────── §2.2 formatTime ───────────────────────

test("formatTime(1500)은 25:00을 반환한다", () => {
  assert.equal(formatTime(1500), "25:00");
});

test("formatTime(300)은 05:00을 반환한다", () => {
  assert.equal(formatTime(300), "05:00");
});

test("formatTime(900)은 15:00을 반환한다", () => {
  assert.equal(formatTime(900), "15:00");
});

test("formatTime(65)는 01:05를 반환한다", () => {
  assert.equal(formatTime(65), "01:05");
});

test("formatTime(0)은 00:00을 반환한다", () => {
  assert.equal(formatTime(0), "00:00");
});

// ─────────────────────── tick — nextPhase 합성 ───────────────────────

test("tick: 정지 상태(isRunning=false)에서는 remainingSeconds를 그대로 반환한다", () => {
  const state = { phase: "focus", cycleCount: 0, remainingSeconds: 10, isRunning: false };
  const next = tick(state);
  assert.deepEqual(next, state);
});

test("tick: remainingSeconds가 1보다 크면 1 감소시킨다", () => {
  const state = { phase: "focus", cycleCount: 0, remainingSeconds: 10, isRunning: true };
  const next = tick(state);
  assert.equal(next.remainingSeconds, 9);
  assert.equal(next.phase, "focus");
});

test("tick: remainingSeconds가 1이면 만료되어 nextPhase로 전이한다", () => {
  const state = { phase: "focus", cycleCount: 0, remainingSeconds: 1, isRunning: true };
  const next = tick(state);
  assert.equal(next.phase, "short-break");
  assert.equal(next.cycleCount, 1);
  assert.equal(next.remainingSeconds, 300);
  assert.equal(next.isRunning, true);
});

// ─────────────────────── createTimerEngine — 주입 가능한 clock ───────────────────────

function createFakeClock() {
  let scheduled = null;
  return {
    setInterval(fn) {
      scheduled = fn;
      return 1;
    },
    clearInterval() {
      scheduled = null;
    },
    advance() {
      if (scheduled) scheduled();
    },
    isScheduled() {
      return scheduled !== null;
    },
  };
}

test("createTimerEngine: start 후 clock.advance() 로 결정적으로 1초씩 감소시킬 수 있다", () => {
  const clock = createFakeClock();
  const engine = createTimerEngine({ setInterval: clock.setInterval, clearInterval: clock.clearInterval });

  engine.start();
  assert.equal(engine.getState().remainingSeconds, 1500);
  assert.equal(engine.getState().isRunning, true);

  clock.advance();
  assert.equal(engine.getState().remainingSeconds, 1499);
});

test("createTimerEngine: pause는 clock 스케줄을 해제하고 isRunning을 false로 만든다", () => {
  const clock = createFakeClock();
  const engine = createTimerEngine({ setInterval: clock.setInterval, clearInterval: clock.clearInterval });

  engine.start();
  engine.pause();

  assert.equal(engine.getState().isRunning, false);
  assert.equal(clock.isScheduled(), false);
});

test("createTimerEngine: reset은 초기 상태(focus/1500초/cycleCount=0)로 복원하고 시작을 재사용할 수 있게 한다", () => {
  const clock = createFakeClock();
  const engine = createTimerEngine({ setInterval: clock.setInterval, clearInterval: clock.clearInterval });

  engine.start();
  clock.advance();
  clock.advance();
  engine.reset();

  assert.deepEqual(engine.getState(), {
    phase: "focus",
    cycleCount: 0,
    remainingSeconds: 1500,
    isRunning: false,
  });
  assert.equal(clock.isScheduled(), false);
});
