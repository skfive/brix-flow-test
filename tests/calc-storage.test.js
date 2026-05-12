// BF-412 · calc localStorage 추상 utility 단위 테스트
// - 명세: docs/design/calculator-BF-410.md, AC1 ("localStorage calc:last 에 5 가 저장됨")
// - key prefix: "calc:"

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CALC_PREFIX,
  CALC_LAST_KEY,
  createMemoryStorage,
  createCalcStore,
} from "../calc/storage.js";

test("storage: calc: prefix 로 저장", () => {
  const mem = createMemoryStorage();
  const store = createCalcStore(mem);
  store.saveLast(5);
  assert.equal(mem.getItem(CALC_PREFIX + "last"), "5");
  assert.equal(mem.getItem("calc:last"), "5");
});

test("storage: CALC_LAST_KEY = calc:last (상수 노출 검증)", () => {
  assert.equal(CALC_LAST_KEY, "calc:last");
  assert.equal(CALC_PREFIX, "calc:");
});

test("storage.loadLast: 저장 후 동일 문자열 반환", () => {
  const mem = createMemoryStorage();
  const store = createCalcStore(mem);
  store.saveLast(5);
  assert.equal(store.loadLast(), "5");
});

test("storage.loadLast: 소수 결과 보존", () => {
  const mem = createMemoryStorage();
  const store = createCalcStore(mem);
  store.saveLast(3.14);
  assert.equal(store.loadLast(), "3.14");
});

test("storage.loadLast: 저장값 없으면 null 반환", () => {
  const mem = createMemoryStorage();
  const store = createCalcStore(mem);
  assert.equal(store.loadLast(), null);
});

test("storage.loadLast: 깨진 값 (숫자 아님) 은 null 반환", () => {
  const mem = createMemoryStorage();
  mem.setItem(CALC_LAST_KEY, "not-a-number");
  const store = createCalcStore(mem);
  assert.equal(store.loadLast(), null);
});

test("storage.loadLast: 다른 prefix 키는 무시", () => {
  const mem = createMemoryStorage();
  mem.setItem("other:key", "irrelevant");
  mem.setItem("timer:last", JSON.stringify({ minutes: 5, seconds: 0 }));
  mem.setItem("bf-theme", "dark");
  const store = createCalcStore(mem);
  assert.equal(store.loadLast(), null);
  store.saveLast(42);
  assert.equal(store.loadLast(), "42");
});

test("storage.saveLast: 잘못된 값 (Infinity / NaN / 객체) 은 reject", () => {
  const mem = createMemoryStorage();
  const store = createCalcStore(mem);
  assert.throws(() => store.saveLast(Infinity), /Infinity|NaN|유한/);
  assert.throws(() => store.saveLast(-Infinity), /Infinity|NaN|유한/);
  assert.throws(() => store.saveLast(NaN), /Infinity|NaN|유한/);
  assert.throws(() => store.saveLast({}), /number|string/);
  assert.throws(() => store.saveLast(null), /number|string/);
  assert.throws(() => store.saveLast(""), /빈/);
});

test("storage.saveLast: 문자열도 저장 허용", () => {
  const mem = createMemoryStorage();
  const store = createCalcStore(mem);
  store.saveLast("3.14");
  assert.equal(store.loadLast(), "3.14");
});

test("storage.clearLast: 항목 삭제 후 loadLast() === null", () => {
  const mem = createMemoryStorage();
  const store = createCalcStore(mem);
  store.saveLast(5);
  store.clearLast();
  assert.equal(store.loadLast(), null);
});

test("AC2 시나리오: '5' 저장 → 새 인스턴스가 loadLast() === '5'", () => {
  const mem = createMemoryStorage();
  const storeA = createCalcStore(mem);
  storeA.saveLast(5);
  const storeB = createCalcStore(mem);
  assert.equal(storeB.loadLast(), "5");
});
