// BF-654 · 숫자 야구 게임 단위 테스트
// 명세: docs/design/baseball-BF-651.md
// AC:
//   - AC1: generateSecret — 중복 없는 4자리 정답 생성
//   - AC2: judge — 스트라이크/볼 정확 계산
//   - AC3: validateGuess — 잘못된 입력 거부 (중복·비숫자·자릿수 불일치)
//
// baseball/logic.js — UMD / CommonJS exports

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Logic = require("../baseball/logic.js");

const { DIGITS, MAX_TRIES, generateSecret, judge, validateGuess } = Logic;

// ──────────────────────────────────────────────────────────
// 1. 상수 검증
// ──────────────────────────────────────────────────────────

test("상수: DIGITS=4, MAX_TRIES=9", () => {
  assert.equal(DIGITS, 4);
  assert.equal(MAX_TRIES, 9);
});

// ──────────────────────────────────────────────────────────
// 2. generateSecret — AC1: 중복 없는 4자리 정답 생성
// ──────────────────────────────────────────────────────────

test("generateSecret: 길이 4인 배열 반환", () => {
  const s = generateSecret();
  assert.equal(s.length, 4);
});

test("generateSecret: 모든 원소가 0~9 정수 (50회 샘플)", () => {
  for (let i = 0; i < 50; i++) {
    const s = generateSecret();
    for (const d of s) {
      assert.ok(
        Number.isInteger(d) && d >= 0 && d <= 9,
        `유효하지 않은 digit: ${d}`
      );
    }
  }
});

test("generateSecret: 중복 없음 (100회 샘플)", () => {
  for (let i = 0; i < 100; i++) {
    const s = generateSecret();
    const set = new Set(s);
    assert.equal(set.size, 4, `중복 발생: [${s}]`);
  }
});

test("generateSecret: 다양한 값 생성 (난수성 — 1000회, 첫 자리 5종 이상)", () => {
  const firsts = new Set();
  for (let i = 0; i < 1000; i++) {
    firsts.add(generateSecret()[0]);
  }
  assert.ok(firsts.size >= 5, `첫 자리 다양성 부족: [${[...firsts]}]`);
});

// ──────────────────────────────────────────────────────────
// 3. judge — AC2: 스트라이크/볼 정확 계산
// ──────────────────────────────────────────────────────────

test("judge: 4S 0B — 완전 일치", () => {
  assert.deepEqual(judge([1, 2, 3, 4], [1, 2, 3, 4]), { strike: 4, ball: 0 });
});

test("judge: 0S 0B — 아웃 (공통 숫자 없음)", () => {
  assert.deepEqual(judge([1, 2, 3, 4], [5, 6, 7, 8]), { strike: 0, ball: 0 });
});

test("judge: 0S 4B — 모든 숫자 있으나 위치 전부 불일치", () => {
  // secret=[1,2,3,4], guess=[2,1,4,3]
  // i=0: 2≠1, 2 in [1,2,3,4] → B
  // i=1: 1≠2, 1 in [1,2,3,4] → B
  // i=2: 4≠3, 4 in [1,2,3,4] → B
  // i=3: 3≠4, 3 in [1,2,3,4] → B
  assert.deepEqual(judge([1, 2, 3, 4], [2, 1, 4, 3]), { strike: 0, ball: 4 });
});

test("judge: 2S 1B — 혼합 케이스", () => {
  // secret=[1,2,3,4], guess=[1,2,4,5]
  // i=0: 1=1 → S
  // i=1: 2=2 → S
  // i=2: 4≠3, 4 in [1,2,3,4] → B
  // i=3: 5≠4, 5 not in → O
  assert.deepEqual(judge([1, 2, 3, 4], [1, 2, 4, 5]), { strike: 2, ball: 1 });
});

test("judge: 1S 0B — 1자리만 위치+숫자 일치", () => {
  // secret=[1,2,3,4], guess=[1,5,6,7]
  assert.deepEqual(judge([1, 2, 3, 4], [1, 5, 6, 7]), { strike: 1, ball: 0 });
});

test("judge: 0S 1B — 1자리 숫자는 있으나 위치 불일치", () => {
  // secret=[1,2,3,4], guess=[5,1,6,7]
  // i=1: 1≠2, 1 in [1,2,3,4] → B
  assert.deepEqual(judge([1, 2, 3, 4], [5, 1, 6, 7]), { strike: 0, ball: 1 });
});

test("judge: 3S 0B", () => {
  // secret=[1,2,3,4], guess=[1,2,3,8]
  assert.deepEqual(judge([1, 2, 3, 4], [1, 2, 3, 8]), { strike: 3, ball: 0 });
});

test("judge: 0으로 시작하는 정답도 정상 처리", () => {
  // secret=[0,1,2,3], guess=[0,2,1,4]
  // i=0: 0=0 → S
  // i=1: 2≠1, 2 in [0,1,2,3] → B
  // i=2: 1≠2, 1 in [0,1,2,3] → B
  // i=3: 4≠3, 4 not in → O
  assert.deepEqual(judge([0, 1, 2, 3], [0, 2, 1, 4]), { strike: 1, ball: 2 });
});

test("judge: 결과 객체에 strike·ball 필드 존재", () => {
  const r = judge([1, 2, 3, 4], [5, 6, 7, 8]);
  assert.ok("strike" in r, "strike 필드 없음");
  assert.ok("ball" in r, "ball 필드 없음");
});

test("judge: strike + ball <= 4 (항상)", () => {
  for (let i = 0; i < 200; i++) {
    const s = generateSecret();
    const g = generateSecret();
    const r = judge(s, g);
    assert.ok(r.strike + r.ball <= 4, `s+b > 4: ${JSON.stringify(r)}`);
  }
});

// ──────────────────────────────────────────────────────────
// 4. validateGuess — AC4: 잘못된 입력 거부
// ──────────────────────────────────────────────────────────

test("validateGuess: 유효한 입력 [1,2,3,4] → valid=true, errorMessage=''", () => {
  const r = validateGuess([1, 2, 3, 4]);
  assert.equal(r.valid, true);
  assert.equal(r.errorMessage, "");
});

test("validateGuess: 0 포함 유효 입력 [0,1,2,3] → valid=true", () => {
  const r = validateGuess([0, 1, 2, 3]);
  assert.equal(r.valid, true);
});

test("validateGuess: 중복 숫자 [1,1,2,3] → valid=false, '중복' 포함 메시지", () => {
  const r = validateGuess([1, 1, 2, 3]);
  assert.equal(r.valid, false);
  assert.ok(r.errorMessage.includes("중복"), `errorMessage: "${r.errorMessage}"`);
});

test("validateGuess: 전부 같은 숫자 [5,5,5,5] → valid=false", () => {
  assert.equal(validateGuess([5, 5, 5, 5]).valid, false);
});

test("validateGuess: null 포함 [1,null,3,4] → valid=false", () => {
  assert.equal(validateGuess([1, null, 3, 4]).valid, false);
});

test("validateGuess: undefined 포함 [1,undefined,3,4] → valid=false", () => {
  assert.equal(validateGuess([1, undefined, 3, 4]).valid, false);
});

test("validateGuess: 배열 길이 3 → valid=false (자릿수 불일치)", () => {
  assert.equal(validateGuess([1, 2, 3]).valid, false);
});

test("validateGuess: 빈 배열 [] → valid=false", () => {
  assert.equal(validateGuess([]).valid, false);
});

test("validateGuess: 비숫자 문자 포함 [1,2,'a',4] → valid=false", () => {
  assert.equal(validateGuess([1, 2, "a", 4]).valid, false);
});

test("validateGuess: 범위 초과 숫자 [10,2,3,4] → valid=false", () => {
  assert.equal(validateGuess([10, 2, 3, 4]).valid, false);
});

test("validateGuess: 음수 [-1,2,3,4] → valid=false", () => {
  assert.equal(validateGuess([-1, 2, 3, 4]).valid, false);
});

test("validateGuess: 결과 객체에 valid·errorMessage 필드 존재", () => {
  const r = validateGuess([1, 2, 3, 4]);
  assert.ok("valid" in r, "valid 필드 없음");
  assert.ok("errorMessage" in r, "errorMessage 필드 없음");
});
