// BF-417 · 스톱워치 localStorage 추상 utility 단위 테스트
// - 명세: docs/design/stopwatch-BF-415.md
// - key prefix: "stopwatch:"
// - 랩 리스트: "stopwatch:laps" → JSON.stringify(Array<{ index, cumulativeMs, deltaMs }>)
// - 정지 경과: "stopwatch:elapsed" → JSON.stringify(number)
//
// 명세 §6.8 은 "localStorage 미사용" 정책이나 BF-417 의 acceptance criteria
// ("랩 리스트 localStorage 영구화 + 정지 후 새로고침 시 복원") 가 그 정책을
// override 합니다. PR 본문 Implementation Notes 에 해당 사유 명시.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  STOPWATCH_PREFIX,
  STOPWATCH_LAPS_KEY,
  STOPWATCH_ELAPSED_KEY,
  createMemoryStorage,
  createStopwatchStore,
} from "../stopwatch/storage.js";

test("storage: 상수 노출 검증 — stopwatch: prefix, laps/elapsed 키", () => {
  assert.equal(STOPWATCH_PREFIX, "stopwatch:");
  assert.equal(STOPWATCH_LAPS_KEY, "stopwatch:laps");
  assert.equal(STOPWATCH_ELAPSED_KEY, "stopwatch:elapsed");
});

test("storage.saveLaps / loadLaps: 빈 배열 round-trip", () => {
  const mem = createMemoryStorage();
  const store = createStopwatchStore(mem);
  store.saveLaps([]);
  assert.deepEqual(store.loadLaps(), []);
});

test("storage.saveLaps: stopwatch:laps 키로 JSON 저장", () => {
  const mem = createMemoryStorage();
  const store = createStopwatchStore(mem);
  const laps = [
    { index: 1, cumulativeMs: 12_210, deltaMs: 12_210 },
    { index: 2, cumulativeMs: 15_310, deltaMs: 3_100 },
  ];
  store.saveLaps(laps);
  assert.equal(mem.getItem(STOPWATCH_LAPS_KEY), JSON.stringify(laps));
});

test("storage.loadLaps: 저장 후 동일 배열 반환", () => {
  const mem = createMemoryStorage();
  const store = createStopwatchStore(mem);
  const laps = [
    { index: 1, cumulativeMs: 1000, deltaMs: 1000 },
    { index: 2, cumulativeMs: 3000, deltaMs: 2000 },
  ];
  store.saveLaps(laps);
  const got = store.loadLaps();
  assert.deepEqual(got, laps);
});

test("storage.loadLaps: 저장값 없으면 빈 배열 반환 (null 아님 — 호출 측 간소화)", () => {
  const mem = createMemoryStorage();
  const store = createStopwatchStore(mem);
  assert.deepEqual(store.loadLaps(), []);
});

test("storage.loadLaps: 깨진 JSON → 빈 배열 (다른 데이터 보호)", () => {
  const mem = createMemoryStorage();
  mem.setItem(STOPWATCH_LAPS_KEY, "{not-json");
  const store = createStopwatchStore(mem);
  assert.deepEqual(store.loadLaps(), []);
});

test("storage.loadLaps: 배열이 아닌 값 → 빈 배열 (방어)", () => {
  const mem = createMemoryStorage();
  mem.setItem(STOPWATCH_LAPS_KEY, JSON.stringify({ not: "array" }));
  const store = createStopwatchStore(mem);
  assert.deepEqual(store.loadLaps(), []);
});

test("storage.saveLaps: 배열이 아닌 값은 reject", () => {
  const mem = createMemoryStorage();
  const store = createStopwatchStore(mem);
  assert.throws(() => store.saveLaps(null), /배열|array/);
  assert.throws(() => store.saveLaps("oops"), /배열|array/);
  assert.throws(() => store.saveLaps({ index: 1 }), /배열|array/);
});

test("storage.saveElapsed / loadElapsed: 숫자 round-trip", () => {
  const mem = createMemoryStorage();
  const store = createStopwatchStore(mem);
  store.saveElapsed(72_490);
  assert.equal(store.loadElapsed(), 72_490);
});

test("storage.loadElapsed: 저장값 없으면 null", () => {
  const mem = createMemoryStorage();
  const store = createStopwatchStore(mem);
  assert.equal(store.loadElapsed(), null);
});

test("storage.loadElapsed: 깨진 JSON → null", () => {
  const mem = createMemoryStorage();
  mem.setItem(STOPWATCH_ELAPSED_KEY, "{nope");
  const store = createStopwatchStore(mem);
  assert.equal(store.loadElapsed(), null);
});

test("storage.saveElapsed: 숫자 외 입력 reject", () => {
  const mem = createMemoryStorage();
  const store = createStopwatchStore(mem);
  assert.throws(() => store.saveElapsed("abc"), /숫자|number/);
  assert.throws(() => store.saveElapsed(NaN), /숫자|number/);
  assert.throws(() => store.saveElapsed(null), /숫자|number/);
});

test("storage.clearAll: laps + elapsed 모두 제거", () => {
  const mem = createMemoryStorage();
  const store = createStopwatchStore(mem);
  store.saveLaps([{ index: 1, cumulativeMs: 1000, deltaMs: 1000 }]);
  store.saveElapsed(2000);
  store.clearAll();
  assert.deepEqual(store.loadLaps(), []);
  assert.equal(store.loadElapsed(), null);
  assert.equal(mem.getItem(STOPWATCH_LAPS_KEY), null);
  assert.equal(mem.getItem(STOPWATCH_ELAPSED_KEY), null);
});

test("storage: 다른 prefix(notepad: / timer: / bf-theme)는 영향 X", () => {
  const mem = createMemoryStorage();
  mem.setItem("notepad:foo", JSON.stringify({ x: 1 }));
  mem.setItem("timer:last", JSON.stringify({ minutes: 5, seconds: 0 }));
  mem.setItem("bf-theme", "dark");
  const store = createStopwatchStore(mem);

  store.saveLaps([{ index: 1, cumulativeMs: 1000, deltaMs: 1000 }]);
  store.clearAll();

  // 본인 키만 지워야 함
  assert.equal(mem.getItem("notepad:foo"), JSON.stringify({ x: 1 }));
  assert.equal(
    mem.getItem("timer:last"),
    JSON.stringify({ minutes: 5, seconds: 0 }),
  );
  assert.equal(mem.getItem("bf-theme"), "dark");
});

test("memoryStorage: Web Storage API 호환 — length/key/getItem/setItem/removeItem/clear", () => {
  const mem = createMemoryStorage();
  mem.setItem("a", "1");
  mem.setItem("b", "2");
  assert.equal(mem.length, 2);
  assert.equal(mem.getItem("a"), "1");
  const keys = new Set([mem.key(0), mem.key(1)]);
  assert.deepEqual([...keys].sort(), ["a", "b"]);
  mem.removeItem("a");
  assert.equal(mem.length, 1);
  mem.clear();
  assert.equal(mem.length, 0);
});
