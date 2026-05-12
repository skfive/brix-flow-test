// BF-432 · 뽀모도로 순수 로직 단위 테스트
// 명세: docs/design/pomodoro-BF-430.md §6.1 (상태 전이), §7.9 (DURATIONS)
//
// pomodoro/ 디렉토리는 비-module (UMD) 패턴이므로 createRequire 로 로드.
// (작업 AC: pomodoro/ 코드베이스에 import/export/fetch 0건)

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Timer = require("../pomodoro/timer.js");

test("DURATIONS: FOCUS 25분 / SHORT_BREAK 5분 / LONG_BREAK 15분 (§7.9)", () => {
  assert.equal(Timer.DURATIONS.FOCUS, 25 * 60 * 1000);
  assert.equal(Timer.DURATIONS.SHORT_BREAK, 5 * 60 * 1000);
  assert.equal(Timer.DURATIONS.LONG_BREAK, 15 * 60 * 1000);
  assert.equal(Timer.CYCLES_PER_LONG_BREAK, 4);
});

test("MODES: 3종 enum 노출 (FOCUS / SHORT_BREAK / LONG_BREAK)", () => {
  assert.equal(Timer.MODES.FOCUS, "FOCUS");
  assert.equal(Timer.MODES.SHORT_BREAK, "SHORT_BREAK");
  assert.equal(Timer.MODES.LONG_BREAK, "LONG_BREAK");
});

test("pad2: 0~99 zero-pad, 음수·NaN 은 00", () => {
  assert.equal(Timer.pad2(0), "00");
  assert.equal(Timer.pad2(5), "05");
  assert.equal(Timer.pad2(59), "59");
  assert.equal(Timer.pad2(-1), "00");
  assert.equal(Timer.pad2(NaN), "00");
});

test("formatMmSs: 항상 MM:SS 2자리 zero-pad (명세 §4.5)", () => {
  assert.equal(Timer.formatMmSs(0, 0), "00:00");
  assert.equal(Timer.formatMmSs(25, 0), "25:00");
  assert.equal(Timer.formatMmSs(5, 0), "05:00");
  assert.equal(Timer.formatMmSs(15, 30), "15:30");
  assert.equal(Timer.formatMmSs(0, 5), "00:05");
});

test("msToMmSs: ceil 표시 — 1ms 라도 남으면 1초 (마지막 1초 안 사라짐)", () => {
  assert.deepEqual(Timer.msToMmSs(0), { minutes: 0, seconds: 0 });
  assert.deepEqual(Timer.msToMmSs(1), { minutes: 0, seconds: 1 });
  assert.deepEqual(Timer.msToMmSs(1000), { minutes: 0, seconds: 1 });
  assert.deepEqual(Timer.msToMmSs(1001), { minutes: 0, seconds: 2 });
  assert.deepEqual(Timer.msToMmSs(60_000), { minutes: 1, seconds: 0 });
  // FOCUS 25분 = 25:00
  assert.deepEqual(Timer.msToMmSs(Timer.DURATIONS.FOCUS), {
    minutes: 25,
    seconds: 0,
  });
  // FOCUS - 1초 = 24:59
  assert.deepEqual(Timer.msToMmSs(Timer.DURATIONS.FOCUS - 1000), {
    minutes: 24,
    seconds: 59,
  });
});

test("msToMmSs: 음수·NaN 방어 → 0:00", () => {
  assert.deepEqual(Timer.msToMmSs(-1000), { minutes: 0, seconds: 0 });
  assert.deepEqual(Timer.msToMmSs(NaN), { minutes: 0, seconds: 0 });
  assert.deepEqual(Timer.msToMmSs("abc"), { minutes: 0, seconds: 0 });
});

test("durationFor: 모드별 초기 ms 반환, 미지원 모드는 throw", () => {
  assert.equal(Timer.durationFor("FOCUS"), 25 * 60 * 1000);
  assert.equal(Timer.durationFor("SHORT_BREAK"), 5 * 60 * 1000);
  assert.equal(Timer.durationFor("LONG_BREAK"), 15 * 60 * 1000);
  assert.throws(() => Timer.durationFor("BOGUS"), /모드/);
});

test("labelFor: UI 노출 라벨 — underscore 제거 + 공백", () => {
  assert.equal(Timer.labelFor("FOCUS"), "FOCUS");
  assert.equal(Timer.labelFor("SHORT_BREAK"), "SHORT BREAK");
  assert.equal(Timer.labelFor("LONG_BREAK"), "LONG BREAK");
});

test("nextPhase: FOCUS(1) → SHORT_BREAK(1) — cycle 유지", () => {
  assert.deepEqual(Timer.nextPhase("FOCUS", 1), {
    mode: "SHORT_BREAK",
    currentCycle: 1,
  });
  assert.deepEqual(Timer.nextPhase("FOCUS", 2), {
    mode: "SHORT_BREAK",
    currentCycle: 2,
  });
  assert.deepEqual(Timer.nextPhase("FOCUS", 3), {
    mode: "SHORT_BREAK",
    currentCycle: 3,
  });
});

test("nextPhase: 4번째 FOCUS 종료 → LONG_BREAK (AC2 핵심 시나리오)", () => {
  assert.deepEqual(Timer.nextPhase("FOCUS", 4), {
    mode: "LONG_BREAK",
    currentCycle: 4,
  });
});

test("nextPhase: SHORT_BREAK 종료 → FOCUS, cycle +1", () => {
  assert.deepEqual(Timer.nextPhase("SHORT_BREAK", 1), {
    mode: "FOCUS",
    currentCycle: 2,
  });
  assert.deepEqual(Timer.nextPhase("SHORT_BREAK", 3), {
    mode: "FOCUS",
    currentCycle: 4,
  });
});

test("nextPhase: LONG_BREAK 종료 → FOCUS, cycle = 1 (사이클 wrap)", () => {
  assert.deepEqual(Timer.nextPhase("LONG_BREAK", 4), {
    mode: "FOCUS",
    currentCycle: 1,
  });
});

test("nextPhase: cycle 범위 외 입력 방어 (음수·0·>4 → clamp)", () => {
  assert.deepEqual(Timer.nextPhase("FOCUS", 0), {
    mode: "SHORT_BREAK",
    currentCycle: 1,
  });
  assert.deepEqual(Timer.nextPhase("FOCUS", -5), {
    mode: "SHORT_BREAK",
    currentCycle: 1,
  });
  assert.deepEqual(Timer.nextPhase("FOCUS", 99), {
    mode: "LONG_BREAK",
    currentCycle: 4,
  });
});

test("nextPhase: 알 수 없는 모드는 throw", () => {
  assert.throws(() => Timer.nextPhase("BOGUS", 1), /모드/);
});

test("AC2 핵심 시나리오: FOCUS×4 한 사이클 진행 검증", () => {
  // FOCUS(1) → SHORT_BREAK(1) → FOCUS(2) → SHORT_BREAK(2)
  // → FOCUS(3) → SHORT_BREAK(3) → FOCUS(4) → LONG_BREAK(4) → FOCUS(1)
  let cur = { mode: "FOCUS", currentCycle: 1 };
  const expected = [
    { mode: "SHORT_BREAK", currentCycle: 1 },
    { mode: "FOCUS", currentCycle: 2 },
    { mode: "SHORT_BREAK", currentCycle: 2 },
    { mode: "FOCUS", currentCycle: 3 },
    { mode: "SHORT_BREAK", currentCycle: 3 },
    { mode: "FOCUS", currentCycle: 4 },
    { mode: "LONG_BREAK", currentCycle: 4 }, // ← 4번째 FOCUS 종료 후 LONG_BREAK
    { mode: "FOCUS", currentCycle: 1 }, // ← LONG_BREAK 후 다시 처음
  ];
  for (const step of expected) {
    cur = Timer.nextPhase(cur.mode, cur.currentCycle);
    assert.deepEqual(cur, step);
  }
});

test("localDateKey: 로컬 날짜 YYYY-MM-DD 반환 (자정 리셋 기준)", () => {
  // 2026-05-12 12:00:00 (로컬) 의 epoch ms — 새 Date 로 생성해 환경 독립
  const noon = new Date(2026, 4, 12, 12, 0, 0, 0); // month: 0-indexed
  assert.equal(Timer.localDateKey(noon.getTime()), "2026-05-12");

  // 1월 1일 자정 (월·일 zero-pad)
  const newyear = new Date(2026, 0, 1, 0, 0, 0, 0);
  assert.equal(Timer.localDateKey(newyear.getTime()), "2026-01-01");

  // 12월 31일 23:59
  const yearend = new Date(2026, 11, 31, 23, 59, 0, 0);
  assert.equal(Timer.localDateKey(yearend.getTime()), "2026-12-31");
});

test("localDateKey: 유효하지 않은 입력은 throw", () => {
  assert.throws(() => Timer.localDateKey(NaN), /epoch/);
});

test("isSameLocalDay: 같은 로컬 날 → true, 다른 날 → false", () => {
  const morning = new Date(2026, 4, 12, 0, 1, 0, 0).getTime();
  const evening = new Date(2026, 4, 12, 23, 59, 0, 0).getTime();
  const nextDay = new Date(2026, 4, 13, 0, 1, 0, 0).getTime();
  assert.equal(Timer.isSameLocalDay(morning, evening), true);
  assert.equal(Timer.isSameLocalDay(evening, nextDay), false);
});

test("accumulateFocusMs: 같은 날이면 누적, 다른 날이면 리셋 (자정 리셋)", () => {
  const day1Noon = new Date(2026, 4, 12, 12, 0, 0, 0).getTime();
  const day1Eve = new Date(2026, 4, 12, 22, 0, 0, 0).getTime();
  const day2Morn = new Date(2026, 4, 13, 0, 5, 0, 0).getTime();

  // 첫 누적 (prev=null)
  let s = Timer.accumulateFocusMs(null, 25 * 60 * 1000, day1Noon);
  assert.deepEqual(s, { date: "2026-05-12", focusMsToday: 1500_000 });

  // 같은 날 또 누적 → 합산
  s = Timer.accumulateFocusMs(s, 5 * 60 * 1000, day1Eve);
  assert.deepEqual(s, { date: "2026-05-12", focusMsToday: 1800_000 });

  // 다음 날 → 리셋 (이전 값 무시, 새 add 만)
  s = Timer.accumulateFocusMs(s, 10 * 60 * 1000, day2Morn);
  assert.deepEqual(s, { date: "2026-05-13", focusMsToday: 600_000 });
});

test("accumulateFocusMs: 음수·NaN 추가는 0 처리 (방어)", () => {
  const t = new Date(2026, 4, 12, 12, 0, 0, 0).getTime();
  let s = Timer.accumulateFocusMs(null, -100, t);
  assert.deepEqual(s, { date: "2026-05-12", focusMsToday: 0 });

  s = Timer.accumulateFocusMs(s, NaN, t);
  assert.deepEqual(s, { date: "2026-05-12", focusMsToday: 0 });
});

test("formatFocusTotal: 분/시간 단위 라벨", () => {
  assert.equal(Timer.formatFocusTotal(0), "0분");
  assert.equal(Timer.formatFocusTotal(500), "0분"); // 1분 미만
  assert.equal(Timer.formatFocusTotal(60_000), "1분");
  assert.equal(Timer.formatFocusTotal(59 * 60_000), "59분");
  assert.equal(Timer.formatFocusTotal(60 * 60_000), "1시간");
  assert.equal(Timer.formatFocusTotal(90 * 60_000), "1시간 30분");
  assert.equal(Timer.formatFocusTotal(150 * 60_000), "2시간 30분");
});
