// number-guess — evaluateGuess / validateGuess 단위 테스트
// 명세: docs/plan/number-guess-BF-783.md §5·§6 · docs/design/number-guess-BF-783.md
// AC-08: evaluateGuess 순수 함수 — too-low / too-high / correct 판정
// task AC2: 정답·too-high·too-low·범위 밖 입력 케이스 모두 통과
//
// number-guess/game.js — UMD / CommonJS exports (file:// CORS 안전)
// .mjs(ESM) 에서 CJS 모듈을 로드하기 위해 createRequire 사용 (baseball 패턴 동일)

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Game = require("../game.js");

const { evaluateGuess, validateGuess } = Game;

// ──────────────────────────────────────────────────────────
// 1. evaluateGuess — 판정 순수 함수 (명세 §5 / §6.3 TC-01~TC-09)
// ──────────────────────────────────────────────────────────

test("TC-01: guess < secret → too-low", () => {
  assert.deepStrictEqual(evaluateGuess(50, 30), { result: "too-low" });
});

test("TC-02: guess > secret → too-high", () => {
  assert.deepStrictEqual(evaluateGuess(50, 70), { result: "too-high" });
});

test("TC-03: guess === secret → correct", () => {
  assert.deepStrictEqual(evaluateGuess(50, 50), { result: "correct" });
});

test("TC-04: 최솟값 경계 정답 (1,1)", () => {
  assert.deepStrictEqual(evaluateGuess(1, 1), { result: "correct" });
});

test("TC-05: 최댓값 경계 정답 (100,100)", () => {
  assert.deepStrictEqual(evaluateGuess(100, 100), { result: "correct" });
});

test("TC-06: 최솟값 추리 (secret=100, guess=1) → too-low", () => {
  assert.deepStrictEqual(evaluateGuess(100, 1), { result: "too-low" });
});

test("TC-07: 최댓값 추리 (secret=1, guess=100) → too-high", () => {
  assert.deepStrictEqual(evaluateGuess(1, 100), { result: "too-high" });
});

test("TC-08: 정답 바로 아래 (50,49) → too-low", () => {
  assert.deepStrictEqual(evaluateGuess(50, 49), { result: "too-low" });
});

test("TC-09: 정답 바로 위 (50,51) → too-high", () => {
  assert.deepStrictEqual(evaluateGuess(50, 51), { result: "too-high" });
});

// ──────────────────────────────────────────────────────────
// 2. validateGuess — 입력 유효성 순수 함수 (명세 §2.2 / EC-02~06)
//    task AC2 "범위 밖 입력 케이스" 검증
// ──────────────────────────────────────────────────────────

test("유효한 정수(1~100)는 valid + 정수 값 반환", () => {
  assert.deepStrictEqual(validateGuess("42"), { valid: true, value: 42 });
  assert.deepStrictEqual(validateGuess("1"), { valid: true, value: 1 });
  assert.deepStrictEqual(validateGuess("100"), { valid: true, value: 100 });
});

test("EC-02: 빈 값 → invalid", () => {
  assert.equal(validateGuess("").valid, false);
  assert.equal(validateGuess("   ").valid, false);
  assert.equal(validateGuess(null).valid, false);
  assert.equal(validateGuess(undefined).valid, false);
});

test("EC-03: 소수 입력 → invalid", () => {
  assert.equal(validateGuess("3.5").valid, false);
  assert.equal(validateGuess("50.0001").valid, false);
});

test("EC-04: 문자열 입력 → invalid", () => {
  assert.equal(validateGuess("abc").valid, false);
  assert.equal(validateGuess("12a").valid, false);
});

test("EC-05: 범위 밖 (0 이하) → invalid", () => {
  assert.equal(validateGuess("0").valid, false);
  assert.equal(validateGuess("-5").valid, false);
});

test("EC-06: 범위 밖 (101 이상) → invalid", () => {
  assert.equal(validateGuess("101").valid, false);
  assert.equal(validateGuess("999").valid, false);
});

test("invalid 결과는 안내용 error 메시지를 포함한다", () => {
  const r = validateGuess("0");
  assert.equal(r.valid, false);
  assert.equal(typeof r.error, "string");
  assert.ok(r.error.length > 0);
});
