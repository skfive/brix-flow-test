// BF-412 · 계산기 수식 parser/evaluator 단위 테스트
// - 명세: docs/design/calculator-BF-410.md
// - AC4: eval / Function 호출 없이 자체 parser 로 사칙연산·소수점·연산자 우선순위 처리
// - 안전: 화이트리스트 토큰만 허용 (숫자·`.`·`+`·`-`·`*`·`/`·공백)
//
// 본 테스트는 명세 §1.3 / §6.2 의 "v1 순차 평가" 정책 대신 AC4 (연산자 우선순위) 를 채택.
// 사유: AC4 가 PR 머지 검증 기준 — `2 + 3 * 4 = 14` (일반 수학 우선순위).

import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluate, tokenize, ParseError, EvalError } from "../calc/calc.js";

test("tokenize: 단일 정수", () => {
  assert.deepEqual(tokenize("42"), [{ type: "num", value: 42 }]);
});

test("tokenize: 소수", () => {
  assert.deepEqual(tokenize("3.14"), [{ type: "num", value: 3.14 }]);
});

test("tokenize: 사칙연산 토큰", () => {
  assert.deepEqual(tokenize("1+2-3*4/5"), [
    { type: "num", value: 1 },
    { type: "op", value: "+" },
    { type: "num", value: 2 },
    { type: "op", value: "-" },
    { type: "num", value: 3 },
    { type: "op", value: "*" },
    { type: "num", value: 4 },
    { type: "op", value: "/" },
    { type: "num", value: 5 },
  ]);
});

test("tokenize: 공백 무시", () => {
  assert.deepEqual(tokenize("  1 +  2 "), [
    { type: "num", value: 1 },
    { type: "op", value: "+" },
    { type: "num", value: 2 },
  ]);
});

test("tokenize: 허용 외 문자는 ParseError", () => {
  assert.throws(() => tokenize("1+a"), ParseError);
  assert.throws(() => tokenize("alert(1)"), ParseError);
  assert.throws(() => tokenize("1;2"), ParseError);
  assert.throws(() => tokenize("1+(2)"), ParseError);
});

test("tokenize: 소수점 중복은 ParseError", () => {
  assert.throws(() => tokenize("1.2.3"), ParseError);
});

test("evaluate AC1: '2+3' = 5", () => {
  assert.equal(evaluate("2+3"), 5);
});

test("evaluate: 빼기", () => {
  assert.equal(evaluate("10-4"), 6);
});

test("evaluate: 곱하기", () => {
  assert.equal(evaluate("6*7"), 42);
});

test("evaluate: 나누기", () => {
  assert.equal(evaluate("20/4"), 5);
});

test("evaluate: 소수점 사칙 (간단 케이스)", () => {
  assert.equal(evaluate("1+0.5"), 1.5);
  assert.equal(evaluate("2*0.5"), 1);
});

test("evaluate AC4: 연산자 우선순위 — '2+3*4' = 14 (순차 평가 X)", () => {
  assert.equal(evaluate("2+3*4"), 14);
});

test("evaluate: 우선순위 더 — '10-2*3' = 4, '8/2+3' = 7", () => {
  assert.equal(evaluate("10-2*3"), 4);
  assert.equal(evaluate("8/2+3"), 7);
});

test("evaluate: 좌결합 — '8-3-2' = 3, '12/3/2' = 2", () => {
  assert.equal(evaluate("8-3-2"), 3);
  assert.equal(evaluate("12/3/2"), 2);
});

test("evaluate: 곱·나누기 좌결합 — '2*3/2' = 3", () => {
  assert.equal(evaluate("2*3/2"), 3);
});

test("evaluate: 빈 문자열 / 공백만은 ParseError", () => {
  assert.throws(() => evaluate(""), ParseError);
  assert.throws(() => evaluate("   "), ParseError);
});

test("evaluate: 연산자만은 ParseError", () => {
  assert.throws(() => evaluate("+"), ParseError);
  assert.throws(() => evaluate("1+"), ParseError);
});

test("evaluate: 연산자 중복은 ParseError", () => {
  assert.throws(() => evaluate("1++2"), ParseError);
});

test("evaluate: 0 나눗셈은 EvalError", () => {
  assert.throws(() => evaluate("5/0"), EvalError);
  assert.throws(() => evaluate("1/0"), EvalError);
  assert.throws(() => evaluate("0/0"), EvalError);
});

test("evaluate: 정상 동작 — Number 반환 보장", () => {
  assert.equal(typeof evaluate("2*3"), "number");
});

test("evaluate: eval / Function 우회 시도 차단", () => {
  const dangerous = [
    "alert(1)",
    "Function('return 1')()",
    "this.constructor",
    "1; alert(1)",
    "1+`2`",
    "0x10",
    "1e10",
  ];
  for (const expr of dangerous) {
    assert.throws(
      () => evaluate(expr),
      ParseError,
      `위험 입력이 차단되지 않음: ${expr}`,
    );
  }
});

test("evaluate: 정수 결과는 그대로 (소수점 부유 X)", () => {
  const r = evaluate("2+3");
  assert.equal(r, 5);
  assert.equal(String(r), "5");
});

test("AC4 종합", () => {
  assert.equal(evaluate("2+3*4-5/5"), 13);
  assert.equal(evaluate("1.5*2+0.5"), 3.5);
});
