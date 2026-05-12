// BF-432 · 뽀모도로 localStorage 추상 utility 단위 테스트
// 명세: docs/design/pomodoro-BF-430.md §6.5 / §6.6
//
// - prefix "pomodoro:" 격리 (작업 요구사항)
// - state / stats 검증·복원
// - bf-theme 는 본 prefix 밖, 다른 SPA 와 공유
//
// pomodoro/ 는 비-module (UMD) — createRequire 로 로드.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Storage = require("../pomodoro/storage.js");

const {
  POMODORO_PREFIX,
  POMODORO_STATE_KEY,
  POMODORO_STATS_KEY,
  POMODORO_DEBUG_SPEED_KEY,
  POMODORO_THEME_KEY,
  createMemoryStorage,
  createPomodoroStore,
} = Storage;

test("상수 노출: prefix · key 들 명확 (테스트 contract)", () => {
  assert.equal(POMODORO_PREFIX, "pomodoro:");
  assert.equal(POMODORO_STATE_KEY, "pomodoro:state");
  assert.equal(POMODORO_STATS_KEY, "pomodoro:stats");
  assert.equal(POMODORO_DEBUG_SPEED_KEY, "pomodoro:debug:speed");
  assert.equal(POMODORO_THEME_KEY, "bf-theme"); // notepad/timer/stopwatch 와 공유
});

test("memoryStorage: Web Storage API 호환 (length / key / getItem / setItem / removeItem / clear)", () => {
  const mem = createMemoryStorage();
  assert.equal(mem.length, 0);
  mem.setItem("a", "1");
  mem.setItem("b", "2");
  assert.equal(mem.length, 2);
  assert.equal(mem.getItem("a"), "1");
  const keys = new Set([mem.key(0), mem.key(1)]);
  assert.deepEqual([...keys].sort(), ["a", "b"]);
  mem.removeItem("a");
  assert.equal(mem.length, 1);
  assert.equal(mem.getItem("a"), null);
  mem.clear();
  assert.equal(mem.length, 0);
});

test("memoryStorage: 범위 외 key index → null", () => {
  const mem = createMemoryStorage();
  mem.setItem("x", "v");
  assert.equal(mem.key(0), "x");
  assert.equal(mem.key(99), null);
  assert.equal(mem.key(-1), null);
});

test("saveState: pomodoro:state 키에 JSON 저장 (prefix 격리)", () => {
  const mem = createMemoryStorage();
  const store = createPomodoroStore(mem);
  store.saveState({
    mode: "FOCUS",
    phase: "running",
    currentCycle: 2,
    remainingMs: 24 * 60 * 1000,
    savedAtMs: 1_700_000_000_000,
  });
  const raw = mem.getItem(POMODORO_STATE_KEY);
  assert.ok(raw, "값이 저장돼야 함");
  const parsed = JSON.parse(raw);
  assert.equal(parsed.mode, "FOCUS");
  assert.equal(parsed.phase, "running");
  assert.equal(parsed.currentCycle, 2);
  assert.equal(parsed.remainingMs, 24 * 60 * 1000);
  assert.equal(parsed.savedAtMs, 1_700_000_000_000);
});

test("loadState: 저장 후 동일 값 반환", () => {
  const mem = createMemoryStorage();
  const store = createPomodoroStore(mem);
  const payload = {
    mode: "SHORT_BREAK",
    phase: "paused",
    currentCycle: 3,
    remainingMs: 120_000,
    savedAtMs: 1_700_000_000_000,
  };
  store.saveState(payload);
  assert.deepEqual(store.loadState(), payload);
});

test("loadState: 저장값 없으면 null", () => {
  const mem = createMemoryStorage();
  const store = createPomodoroStore(mem);
  assert.equal(store.loadState(), null);
});

test("loadState: 깨진 JSON 은 null (조용히 실패)", () => {
  const mem = createMemoryStorage();
  mem.setItem(POMODORO_STATE_KEY, "{not-json");
  const store = createPomodoroStore(mem);
  assert.equal(store.loadState(), null);
});

test("loadState: 스키마 위반 (잘못된 mode) → null", () => {
  const mem = createMemoryStorage();
  mem.setItem(
    POMODORO_STATE_KEY,
    JSON.stringify({
      mode: "BOGUS",
      phase: "idle",
      currentCycle: 1,
      remainingMs: 0,
      savedAtMs: 0,
    }),
  );
  const store = createPomodoroStore(mem);
  assert.equal(store.loadState(), null);
});

test("saveState: 잘못된 값은 throw (런타임 방어)", () => {
  const mem = createMemoryStorage();
  const store = createPomodoroStore(mem);
  assert.throws(
    () =>
      store.saveState({
        mode: "FOCUS",
        phase: "bogus",
        currentCycle: 1,
        remainingMs: 0,
        savedAtMs: 0,
      }),
    /phase/,
  );
  assert.throws(
    () =>
      store.saveState({
        mode: "FOCUS",
        phase: "idle",
        currentCycle: 99,
        remainingMs: 0,
        savedAtMs: 0,
      }),
    /currentCycle/,
  );
  assert.throws(
    () =>
      store.saveState({
        mode: "FOCUS",
        phase: "idle",
        currentCycle: 1,
        remainingMs: -1,
        savedAtMs: 0,
      }),
    /remainingMs/,
  );
});

test("clearState: 삭제 후 loadState() === null", () => {
  const mem = createMemoryStorage();
  const store = createPomodoroStore(mem);
  store.saveState({
    mode: "FOCUS",
    phase: "idle",
    currentCycle: 1,
    remainingMs: 0,
    savedAtMs: 0,
  });
  store.clearState();
  assert.equal(store.loadState(), null);
});

test("saveStats / loadStats: 누적 집중 시간 영속 (자정 리셋 기록)", () => {
  const mem = createMemoryStorage();
  const store = createPomodoroStore(mem);
  store.saveStats({ date: "2026-05-12", focusMsToday: 1_500_000 });
  const raw = mem.getItem(POMODORO_STATS_KEY);
  assert.ok(raw, "stats 가 저장돼야 함");
  assert.deepEqual(store.loadStats(), {
    date: "2026-05-12",
    focusMsToday: 1_500_000,
  });
});

test("loadStats: 형식 위반 (잘못된 date) → null", () => {
  const mem = createMemoryStorage();
  mem.setItem(
    POMODORO_STATS_KEY,
    JSON.stringify({ date: "12-05-2026", focusMsToday: 0 }),
  );
  const store = createPomodoroStore(mem);
  assert.equal(store.loadStats(), null);
});

test("saveStats: 음수·NaN focusMsToday 는 throw", () => {
  const mem = createMemoryStorage();
  const store = createPomodoroStore(mem);
  assert.throws(
    () => store.saveStats({ date: "2026-05-12", focusMsToday: -1 }),
    /focusMsToday/,
  );
});

test("clearStats: 삭제 후 loadStats() === null", () => {
  const mem = createMemoryStorage();
  const store = createPomodoroStore(mem);
  store.saveStats({ date: "2026-05-12", focusMsToday: 100 });
  store.clearStats();
  assert.equal(store.loadStats(), null);
});

test("loadDebugSpeed: default 1, 유효한 양수 그대로, 그 외 1 로 fallback", () => {
  const mem = createMemoryStorage();
  const store = createPomodoroStore(mem);
  assert.equal(store.loadDebugSpeed(), 1);

  mem.setItem(POMODORO_DEBUG_SPEED_KEY, "60");
  assert.equal(store.loadDebugSpeed(), 60);

  mem.setItem(POMODORO_DEBUG_SPEED_KEY, "0");
  assert.equal(store.loadDebugSpeed(), 1);

  mem.setItem(POMODORO_DEBUG_SPEED_KEY, "-3");
  assert.equal(store.loadDebugSpeed(), 1);

  mem.setItem(POMODORO_DEBUG_SPEED_KEY, "abc");
  assert.equal(store.loadDebugSpeed(), 1);
});

test("loadTheme / saveTheme: bf-theme 키로 공유 저장 (notepad/timer 와 공통)", () => {
  const mem = createMemoryStorage();
  const store = createPomodoroStore(mem);

  // 초기 null
  assert.equal(store.loadTheme(), null);

  store.saveTheme("dark");
  assert.equal(mem.getItem("bf-theme"), "dark");
  assert.equal(store.loadTheme(), "dark");

  store.saveTheme("light");
  assert.equal(store.loadTheme(), "light");

  // 잘못된 값은 reject (다른 페이지의 저장값 보호)
  assert.throws(() => store.saveTheme("auto"), /theme/);
});

test("prefix 격리: 다른 SPA 의 키는 무시 (notepad·timer·stopwatch 와 충돌 0)", () => {
  const mem = createMemoryStorage();
  mem.setItem("notepad:list", "[]");
  mem.setItem("timer:last", JSON.stringify({ minutes: 5, seconds: 0 }));
  mem.setItem("stopwatch:laps", "[]");
  mem.setItem("kanban:cards", "[]");
  mem.setItem("bf-theme", "dark");

  const store = createPomodoroStore(mem);
  // 다른 prefix 키들이 있어도 pomodoro 의 state/stats 는 null
  assert.equal(store.loadState(), null);
  assert.equal(store.loadStats(), null);

  // bf-theme 는 공유 — 읽을 수 있어야 함
  assert.equal(store.loadTheme(), "dark");

  // 그리고 본 store 가 saveState 해도 다른 키는 건드리지 않음
  store.saveState({
    mode: "FOCUS",
    phase: "idle",
    currentCycle: 1,
    remainingMs: 25 * 60 * 1000,
    savedAtMs: 1,
  });
  assert.equal(mem.getItem("notepad:list"), "[]");
  assert.equal(mem.getItem("timer:last"), JSON.stringify({ minutes: 5, seconds: 0 }));
  assert.equal(mem.getItem("stopwatch:laps"), "[]");
  assert.equal(mem.getItem("kanban:cards"), "[]");
});

test("AC1 부분: 새로고침 복원 — saveState → loadState round-trip", () => {
  const mem = createMemoryStorage();
  const store = createPomodoroStore(mem);
  const snapshot = {
    mode: "LONG_BREAK",
    phase: "paused",
    currentCycle: 4,
    remainingMs: 12 * 60 * 1000 + 55 * 1000,
    savedAtMs: 1_700_000_000_000,
  };
  store.saveState(snapshot);

  // "새로고침" — 새 store 인스턴스로 같은 storage 읽기
  const store2 = createPomodoroStore(mem);
  assert.deepEqual(store2.loadState(), snapshot);
});

test("AC2 부분: stats 자정 리셋 — 다른 date 가 저장된 후 loadStats 는 그 값 그대로 (앱이 비교 책임)", () => {
  // storage 는 단순 영속 — 자정 비교는 main.js 가 담당 (timer.accumulateFocusMs).
  // 본 테스트는 영속성만 확인.
  const mem = createMemoryStorage();
  const store = createPomodoroStore(mem);
  store.saveStats({ date: "2026-05-11", focusMsToday: 3_600_000 });
  assert.deepEqual(store.loadStats(), {
    date: "2026-05-11",
    focusMsToday: 3_600_000,
  });
});
