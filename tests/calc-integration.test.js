// BF-412 · 계산기 통합 시나리오 (calc.js + storage.js)
// AC 매핑:
//   AC1 — "2+3" 평가 → 5, localStorage calc:last 에 "5" 저장
//   AC2 — calc:last="5" 저장 후 새 인스턴스가 loadLast() === "5"
//   AC4 — 자체 parser, eval/Function 호출 없이 우선순위 처리

import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluate, ParseError, EvalError } from "../calc/calc.js";
import {
  CALC_LAST_KEY,
  createMemoryStorage,
  createCalcStore,
} from "../calc/storage.js";

test("AC1: '2+3' 평가 후 결과 5 가 calc:last 에 '5' 로 저장", () => {
  const mem = createMemoryStorage();
  const store = createCalcStore(mem);
  const result = evaluate("2+3");
  assert.equal(result, 5);
  store.saveLast(String(result));
  assert.equal(mem.getItem(CALC_LAST_KEY), "5");
  assert.equal(mem.getItem("calc:last"), "5");
});

test("AC2: '5' 저장 후 새 인스턴스가 loadLast() === '5'", () => {
  const mem = createMemoryStorage();
  const writer = createCalcStore(mem);
  writer.saveLast(5);
  const reader = createCalcStore(mem);
  assert.equal(reader.loadLast(), "5");
});

test("AC1 + AC4 합성: '2+3*4' = 14 (우선순위) → calc:last='14'", () => {
  const mem = createMemoryStorage();
  const store = createCalcStore(mem);
  const result = evaluate("2+3*4");
  assert.equal(result, 14);
  store.saveLast(String(result));
  assert.equal(store.loadLast(), "14");
});

test("AC4: 위험 입력은 ParseError → 저장 안 됨", () => {
  const mem = createMemoryStorage();
  const store = createCalcStore(mem);
  assert.throws(() => evaluate("alert(1)"), ParseError);
  assert.equal(store.loadLast(), null);
});

test("0 나눗셈 → EvalError → 저장값 보존", () => {
  const mem = createMemoryStorage();
  const store = createCalcStore(mem);
  store.saveLast(7);
  assert.equal(store.loadLast(), "7");
  assert.throws(() => evaluate("5/0"), EvalError);
  assert.equal(store.loadLast(), "7");
});

test("AC2 의 깨진 storage 데이터는 loadLast() null", () => {
  const mem = createMemoryStorage();
  mem.setItem(CALC_LAST_KEY, "not-a-number");
  const store = createCalcStore(mem);
  assert.equal(store.loadLast(), null);
});

test("소수 결과 보존: '1+0.5' = 1.5 → calc:last='1.5'", () => {
  const mem = createMemoryStorage();
  const store = createCalcStore(mem);
  const result = evaluate("1+0.5");
  assert.equal(result, 1.5);
  store.saveLast(String(result));
  assert.equal(store.loadLast(), "1.5");
});

test("clearLast: 저장값 제거 후 새 인스턴스는 null", () => {
  const mem = createMemoryStorage();
  const store = createCalcStore(mem);
  store.saveLast(42);
  store.clearLast();
  const reader = createCalcStore(mem);
  assert.equal(reader.loadLast(), null);
});
