// BF-407 · timer localStorage 추상 utility 단위 테스트
// 명세: docs/design/timer-BF-405.md
// - key prefix: "timer:"
// - 마지막 설정값: "timer:last" → { minutes, seconds }

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TIMER_PREFIX,
  TIMER_LAST_KEY,
  createMemoryStorage,
  createTimerStore,
} from "../timer/storage.js";

test("storage: timer: prefix 로 저장 (Web Storage 키 검증)", () => {
  const mem = createMemoryStorage();
  const store = createTimerStore(mem);
  store.saveLast({ minutes: 5, seconds: 0 });
  assert.equal(
    mem.getItem(TIMER_PREFIX + "last"),
    JSON.stringify({ minutes: 5, seconds: 0 }),
  );
});

test("storage: TIMER_LAST_KEY = timer:last (상수 노출 검증)", () => {
  assert.equal(TIMER_LAST_KEY, "timer:last");
  assert.equal(TIMER_PREFIX, "timer:");
});

test("storage.loadLast: 저장 후 동일 값 반환", () => {
  const mem = createMemoryStorage();
  const store = createTimerStore(mem);
  store.saveLast({ minutes: 25, seconds: 30 });
  const got = store.loadLast();
  assert.deepEqual(got, { minutes: 25, seconds: 30 });
});

test("storage.loadLast: 저장값 없으면 null 반환", () => {
  const mem = createMemoryStorage();
  const store = createTimerStore(mem);
  assert.equal(store.loadLast(), null);
});

test("storage.loadLast: 깨진 JSON 은 null 반환 (다른 데이터 보호)", () => {
  const mem = createMemoryStorage();
  mem.setItem(TIMER_LAST_KEY, "{not-json");
  const store = createTimerStore(mem);
  assert.equal(store.loadLast(), null);
});

test("storage.loadLast: 다른 prefix 키는 무시", () => {
  const mem = createMemoryStorage();
  mem.setItem("other:key", "irrelevant");
  mem.setItem("notepad:foo", JSON.stringify({ x: 1 }));
  mem.setItem("bf-theme", "dark");
  const store = createTimerStore(mem);
  assert.equal(store.loadLast(), null);

  store.saveLast({ minutes: 1, seconds: 2 });
  assert.deepEqual(store.loadLast(), { minutes: 1, seconds: 2 });
});

test("storage.saveLast: 잘못된 값(음수·null)은 reject", () => {
  const mem = createMemoryStorage();
  const store = createTimerStore(mem);
  assert.throws(() => store.saveLast(null), /minutes|seconds|값/);
  assert.throws(() => store.saveLast({ minutes: -1, seconds: 0 }), /범위|range/);
  assert.throws(() => store.saveLast({ minutes: 0, seconds: 60 }), /범위|range/);
});

test("storage.clearLast: 항목 삭제 후 loadLast() === null", () => {
  const mem = createMemoryStorage();
  const store = createTimerStore(mem);
  store.saveLast({ minutes: 3, seconds: 0 });
  store.clearLast();
  assert.equal(store.loadLast(), null);
});

test("memoryStorage: Web Storage API 호환 (length / key / getItem / setItem / removeItem)", () => {
  const mem = createMemoryStorage();
  mem.setItem("a", "1");
  mem.setItem("b", "2");
  assert.equal(mem.length, 2);
  assert.equal(mem.getItem("a"), "1");
  const keys = new Set([mem.key(0), mem.key(1)]);
  assert.deepEqual([...keys].sort(), ["a", "b"]);
  mem.removeItem("a");
  assert.equal(mem.length, 1);
  assert.equal(mem.getItem("a"), null);
});
