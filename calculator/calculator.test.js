// BF-2079 · 계산기 applyInput/evaluate 단위 테스트
//
// calculator.js는 file://로 여는 브라우저에서 classic script로 로드되어야 하므로
// import/export를 쓰지 않는다. node:vm(runInThisContext)으로 현재 realm에서 소스를 실행해
// top-level 함수 선언(applyInput, evaluate)을 globalThis에서 추출해 테스트한다.
// (별도 realm(createContext)을 쓰면 { error: true } 같은 리터럴 객체의 prototype이
//  테스트 realm과 달라져 assert.deepEqual(strict)이 실패한다.)
//
// 실행: node --test calculator/calculator.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInThisContext } from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(__dirname, "calculator.js"), "utf-8");

runInThisContext(source, { filename: "calculator.js" });

const { applyInput, evaluate } = globalThis;

function initialState() {
  return { phase: "input-entry", display: "0", left: null, operator: null, overwrite: true };
}

function run(keys) {
  return keys.reduce((state, key) => applyInput(state, key), initialState());
}

describe("evaluate", () => {
  test("덧셈: 2 + 3 = 5", () => {
    assert.equal(evaluate(2, "+", 3), 5);
  });

  test("뺄셈: 5 - 3 = 2", () => {
    assert.equal(evaluate(5, "-", 3), 2);
  });

  test("곱셈: 4 * 3 = 12", () => {
    assert.equal(evaluate(4, "*", 3), 12);
  });

  test("나눗셈: 9 / 3 = 3", () => {
    assert.equal(evaluate(9, "/", 3), 3);
  });

  test("0으로 나누기는 { error: true }를 반환한다", () => {
    assert.deepEqual(evaluate(5, "/", 0), { error: true });
  });
});

describe("applyInput", () => {
  test("기본 사칙연산: 5 + 3 = 는 result phase, display '8'", () => {
    const state = run(["5", "+", "3", "="]);
    assert.equal(state.phase, "result");
    assert.equal(state.display, "8");
  });

  test("연속 연산 좌결합: 2 + 3 + 4 = 는 9 (좌항부터 순차 계산)", () => {
    const state = run(["2", "+", "3", "+", "4", "="]);
    assert.equal(state.display, "9");
  });

  test("연산자 대기 중에는 직전 결과 값을 그대로 유지한다", () => {
    const state = run(["5", "+"]);
    assert.equal(state.phase, "operator-pending");
    assert.equal(state.display, "5");
  });

  test("소수점 중복 입력은 무시되고 state가 변하지 않는다", () => {
    const state = run(["1", ".", "5"]);
    assert.equal(state.display, "1.5");
    const next = applyInput(state, ".");
    assert.equal(next.display, "1.5");
    assert.equal(next.phase, state.phase);
  });

  test("0으로 나누기 시 phase는 error, display는 'Error'", () => {
    const state = run(["5", "/", "0", "="]);
    assert.equal(state.phase, "error");
    assert.equal(state.display, "Error");
  });

  test("error 상태에서 숫자 입력 시 input-entry로 복구된다", () => {
    const errorState = run(["5", "/", "0", "="]);
    const next = applyInput(errorState, "7");
    assert.equal(next.phase, "input-entry");
    assert.equal(next.display, "7");
  });

  test("error 상태에서 C 이외의 입력은 무시된다", () => {
    const errorState = run(["5", "/", "0", "="]);
    const next = applyInput(errorState, "+");
    assert.equal(next.phase, "error");
    assert.equal(next.display, "Error");
  });

  test("C 입력 시 어떤 phase에서든 초기 state로 복원된다", () => {
    const phaseStates = [
      run(["5", "/", "0", "="]), // error
      run(["5", "+"]), // operator-pending
      run(["5", "+", "3", "="]), // result
      run(["7"]) // input-entry
    ];
    phaseStates.forEach((state) => {
      assert.deepEqual(applyInput(state, "C"), initialState());
    });
  });

  test("operator-pending에서 다른 연산자 입력 시 마지막 연산자로 교체된다 (누산하지 않음)", () => {
    const state = run(["5", "+", "*", "3", "="]);
    assert.equal(state.display, "15");
  });

  test("± 입력 시 input-entry에서 부호가 반전된다", () => {
    const afterFive = run(["5"]);
    const negated = applyInput(afterFive, "±");
    assert.equal(negated.display, "-5");
    const positive = applyInput(negated, "±");
    assert.equal(positive.display, "5");
  });

  test("± 입력 시 operator-pending에서 left 부호가 반전되고 display에 반영된다", () => {
    const pending = run(["5", "+"]);
    const negated = applyInput(pending, "±");
    assert.equal(negated.phase, "operator-pending");
    assert.equal(negated.left, -5);
    assert.equal(negated.display, "-5");
  });

  test("± 입력 시 result에서 결과 값의 부호가 반전된다", () => {
    const result = run(["5", "+", "3", "="]);
    const negated = applyInput(result, "±");
    assert.equal(negated.phase, "result");
    assert.equal(negated.left, -8);
    assert.equal(negated.display, "-8");
  });

  test("연산 도중 0으로 나누기가 발생하면 이후 연산자 입력도 무시된다", () => {
    const state = run(["5", "/", "0", "+"]);
    assert.equal(state.phase, "error");
    assert.equal(state.display, "Error");
  });

  test("applyInput은 인자로 받은 state를 변경하지 않는다 (불변성)", () => {
    const state = Object.freeze(initialState());
    const next = applyInput(state, "5");
    assert.notEqual(next, state);
    assert.equal(state.display, "0");
    assert.equal(next.display, "5");
  });
});
