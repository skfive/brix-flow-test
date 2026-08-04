// number-guess/judge.test.js — judge 순수 함수 단위 테스트
// 계약: docs/plans/number-guess-BF-1588.md §4·§6 (frozen UI 계약)
// judge(guess, answer) → 상태명('hint-higher'|'hint-lower'|'won'|'invalid') 순수 판정
//
// number-guess/package.json 이 type:commonjs 이므로 .js 는 CommonJS 로 해석된다.
// judge.js 는 CommonJS export 가드를 가지므로 require 로 로드한다 (file:// 브라우저에서는 classic script).

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { judge } = require("./judge.js");

// ──────────────────────────────────────────────────────────
// 1. 비교 판정 (§4 상태 텍스트 매핑)
//    guess < answer → 더 큰 수 입력 유도(hint-higher)
//    guess > answer → 더 작은 수 입력 유도(hint-lower)
// ──────────────────────────────────────────────────────────

test("guess < answer → hint-higher", () => {
  assert.equal(judge(30, 50), "hint-higher");
});

test("guess > answer → hint-lower", () => {
  assert.equal(judge(70, 50), "hint-lower");
});

test("guess === answer → won", () => {
  assert.equal(judge(50, 50), "won");
});

// ──────────────────────────────────────────────────────────
// 2. 경계값 (1~100)
// ──────────────────────────────────────────────────────────

test("최솟값 정답 (1,1) → won", () => {
  assert.equal(judge(1, 1), "won");
});

test("최댓값 정답 (100,100) → won", () => {
  assert.equal(judge(100, 100), "won");
});

test("guess=1, answer=100 → hint-higher", () => {
  assert.equal(judge(1, 100), "hint-higher");
});

test("guess=100, answer=1 → hint-lower", () => {
  assert.equal(judge(100, 1), "hint-lower");
});

test("정답 바로 아래 (49,50) → hint-higher", () => {
  assert.equal(judge(49, 50), "hint-higher");
});

test("정답 바로 위 (51,50) → hint-lower", () => {
  assert.equal(judge(51, 50), "hint-lower");
});

// ──────────────────────────────────────────────────────────
// 3. 유효하지 않은 입력 → invalid (AC-5 / §11 Edge case)
// ──────────────────────────────────────────────────────────

test("범위 밖 0 → invalid", () => {
  assert.equal(judge(0, 50), "invalid");
});

test("범위 밖 101 → invalid", () => {
  assert.equal(judge(101, 50), "invalid");
});

test("음수 → invalid", () => {
  assert.equal(judge(-5, 50), "invalid");
});

test("소수 → invalid", () => {
  assert.equal(judge(3.5, 50), "invalid");
});

test("NaN(숫자 아님) → invalid", () => {
  assert.equal(judge(NaN, 50), "invalid");
});

test("문자열은 정수가 아니므로 → invalid", () => {
  assert.equal(judge("50", 50), "invalid");
});
