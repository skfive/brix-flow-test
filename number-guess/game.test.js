// number-guess/game.test.js — judge 순수 함수 단위 테스트 (BF-1614)
// 계약: docs/plans/number-guess-plan-BF-1612.md §4 (frozen 순수함수 judge)
// judge(guess, answer) → 'higher' | 'lower' | 'win' (부수효과 없음, 입력 검증은 호출부 책임)
//
// number-guess/package.json 이 type:commonjs 이므로 .js 는 CommonJS 로 해석된다.
// game.js 는 UMD/CommonJS export 가드를 가지므로 require 로 judge 를 로드한다.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { judge } = require("./game.js");

// ──────────────────────────────────────────────────────────
// 1. 세 반환값 (§4 반환 계약)
//    guess < answer → 'higher' (정답이 더 높다)
//    guess > answer → 'lower'  (정답이 더 낮다)
//    guess === answer → 'win'
// ──────────────────────────────────────────────────────────

test("guess < answer → higher (AC1)", () => {
  assert.equal(judge(30, 50), "higher");
});

test("guess > answer → lower (AC2)", () => {
  assert.equal(judge(70, 50), "lower");
});

test("guess === answer → win (AC3)", () => {
  assert.equal(judge(50, 50), "win");
});

// ──────────────────────────────────────────────────────────
// 2. 경계값 (guess=answer, guess=answer±1, 1~100 범위 끝)
// ──────────────────────────────────────────────────────────

test("정답 바로 아래 (49,50) → higher", () => {
  assert.equal(judge(49, 50), "higher");
});

test("정답 바로 위 (51,50) → lower", () => {
  assert.equal(judge(51, 50), "lower");
});

test("최솟값 정답 (1,1) → win", () => {
  assert.equal(judge(1, 1), "win");
});

test("최댓값 정답 (100,100) → win", () => {
  assert.equal(judge(100, 100), "win");
});

test("guess=1, answer=100 → higher", () => {
  assert.equal(judge(1, 100), "higher");
});

test("guess=100, answer=1 → lower", () => {
  assert.equal(judge(100, 1), "lower");
});
