// number-guess/game.test.js — judge 순수 함수 단위 테스트 (BF-1620)
// 계약: docs/plans/number-guess-BF-1618-plan.md §6.1 (frozen 순수함수 judge)
// judge(guess, answer) → 'higher' | 'lower' | 'correct'
//   - guess < answer → 'higher' (정답이 더 큼 → UI hint-higher '더 큼 ↑')
//   - guess > answer → 'lower'  (정답이 더 작음 → UI hint-lower '더 작음 ↓')
//   - guess === answer → 'correct' (UI win)
// 순수함수: 부수효과·DOM 접근 없음. 입력 검증(범위·정수)은 호출부 책임이며 judge 는 판정만 한다.
//
// number-guess/package.json 이 type:commonjs 이므로 .js 는 CommonJS 로 해석된다.
// game.js 는 UMD/CommonJS export 가드를 가지므로 require 로 judge 를 로드한다.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { judge } = require("./game.js");

// ──────────────────────────────────────────────────────────
// 1. 세 반환값 (§6.1 반환 계약)
// ──────────────────────────────────────────────────────────

test("guess < answer → higher (AC-2 더 큼)", () => {
  assert.equal(judge(30, 50), "higher");
});

test("guess > answer → lower (AC-3 더 작음)", () => {
  assert.equal(judge(70, 50), "lower");
});

test("guess === answer → correct (AC-4 정답)", () => {
  assert.equal(judge(50, 50), "correct");
});

// ──────────────────────────────────────────────────────────
// 2. 경계값 (정답 바로 위/아래, 1~100 범위 끝)
// ──────────────────────────────────────────────────────────

test("정답 바로 아래 (49,50) → higher", () => {
  assert.equal(judge(49, 50), "higher");
});

test("정답 바로 위 (51,50) → lower", () => {
  assert.equal(judge(51, 50), "lower");
});

test("최솟값 정답 (1,1) → correct", () => {
  assert.equal(judge(1, 1), "correct");
});

test("최댓값 정답 (100,100) → correct", () => {
  assert.equal(judge(100, 100), "correct");
});

test("guess=1, answer=100 → higher", () => {
  assert.equal(judge(1, 100), "higher");
});

test("guess=100, answer=1 → lower", () => {
  assert.equal(judge(100, 1), "lower");
});
