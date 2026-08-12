'use strict';

// calc.js는 브라우저에서 file:// 로 <script> classic 태그 로드가 가능해야 하므로
// import/export 문 없이 IIFE + globalThis.Calculator 로 노출한다.
// 여기서는 부수효과 import 로 로드한 뒤 globalThis.Calculator 에서 꺼내 쓴다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../calc.js';

const {
  evaluate,
  formatNumber,
  createInitialState,
  handleInput,
  DIVIDE_BY_ZERO_MESSAGE
} = globalThis.Calculator;

// ---- evaluate() 순수함수: 좌결합, 연산자 우선순위 없음 (AC-2) ----

test('evaluate: 좌결합 사칙연산 — evaluate([2,"+",3,"×",4]) === 20', () => {
  assert.equal(evaluate([2, '+', 3, '×', 4]), 20);
});

test('evaluate: 뺄셈/나눗셈 좌결합 — (10-4)/3 = 2', () => {
  assert.equal(evaluate([10, '-', 4, '/', 3]), 2);
});

test('evaluate: 0으로 나누면 예외를 던진다', () => {
  assert.throws(() => evaluate([5, '÷', 0]), (err) => {
    assert.equal(err.message, DIVIDE_BY_ZERO_MESSAGE);
    return true;
  });
});

// ---- formatNumber(): 소수 8자리, 후행 0 제거, 12자 초과 시 지수 표기 ----

test('formatNumber: 정수는 후행 0 없이 표시된다', () => {
  assert.equal(formatNumber(20), '20');
});

test('formatNumber: 소수 8자리까지 반올림하고 후행 0을 제거한다', () => {
  assert.equal(formatNumber(0.1 + 0.2), '0.3');
});

test('formatNumber: 표시 길이가 12자를 초과하면 지수 표기로 전환한다', () => {
  const result = formatNumber(1234567890123);
  assert.ok(result.includes('e'), `지수 표기가 아님: ${result}`);
  assert.ok(result.length <= 12, `지수 표기 길이 초과: ${result}`);
});

// ---- 상태 전이: idle → entering → result (AC-1) ----

test('상태 전이: idle 상태에서 숫자 입력 시 entering 으로 전이한다', () => {
  const state = handleInput(createInitialState(), { type: 'digit', value: '3' });
  assert.equal(state.state, 'entering');
  assert.equal(state.displayValue, '3');
});

test('AC-1: 3 + 5 = 을 순서대로 입력하면 결과 8, 상태 result', () => {
  let state = createInitialState();
  state = handleInput(state, { type: 'digit', value: '3' });
  state = handleInput(state, { type: 'operator', value: '+' });
  state = handleInput(state, { type: 'digit', value: '5' });
  state = handleInput(state, { type: 'equals' });
  assert.equal(state.state, 'result');
  assert.equal(state.displayValue, '8');
});

// ---- AC-2: 좌결합 연속 연산 ----

test('AC-2: 3 + 5 × 2 = 는 좌결합으로 계산되어 16 이다', () => {
  let state = createInitialState();
  state = handleInput(state, { type: 'digit', value: '3' });
  state = handleInput(state, { type: 'operator', value: '+' });
  state = handleInput(state, { type: 'digit', value: '5' });
  state = handleInput(state, { type: 'operator', value: '*' }); // 대기 연산 즉시 수행: 3+5=8
  assert.equal(state.firstOperand, 8);
  state = handleInput(state, { type: 'digit', value: '2' });
  state = handleInput(state, { type: 'equals' });
  assert.equal(state.state, 'result');
  assert.equal(state.displayValue, '16');
});

// ---- AC-3: 소수점 입력 ----

test('AC-3: 이미 소수점이 있으면 추가 입력을 무시한다', () => {
  let state = createInitialState();
  state = handleInput(state, { type: 'digit', value: '1' });
  state = handleInput(state, { type: 'decimal' });
  state = handleInput(state, { type: 'digit', value: '2' });
  state = handleInput(state, { type: 'decimal' });
  assert.equal(state.displayValue, '1.2');
});

// ---- AC-4: 0으로 나누기 오류 및 복구 ----

test('AC-4: 0으로 나누면 error 상태로 전이하고 오류 메시지를 표시한다', () => {
  let state = createInitialState();
  state = handleInput(state, { type: 'digit', value: '5' });
  state = handleInput(state, { type: 'operator', value: '/' });
  state = handleInput(state, { type: 'digit', value: '0' });
  state = handleInput(state, { type: 'equals' });
  assert.equal(state.state, 'error');
  assert.equal(state.displayValue, DIVIDE_BY_ZERO_MESSAGE);
});

test('AC-4: error 상태에서는 숫자/연산자 입력이 모두 무시된다', () => {
  let state = createInitialState();
  state = handleInput(state, { type: 'digit', value: '5' });
  state = handleInput(state, { type: 'operator', value: '/' });
  state = handleInput(state, { type: 'digit', value: '0' });
  state = handleInput(state, { type: 'equals' });
  const errored = state;
  state = handleInput(state, { type: 'digit', value: '9' });
  assert.equal(state.state, 'error');
  assert.equal(state.displayValue, errored.displayValue);
});

test('AC-4: error 상태에서 clear(AC) 입력 시 idle 로 복구되고 디스플레이가 0 이 된다', () => {
  let state = createInitialState();
  state = handleInput(state, { type: 'digit', value: '5' });
  state = handleInput(state, { type: 'operator', value: '/' });
  state = handleInput(state, { type: 'digit', value: '0' });
  state = handleInput(state, { type: 'equals' });
  state = handleInput(state, { type: 'clear' });
  assert.equal(state.state, 'idle');
  assert.equal(state.displayValue, '0');
  assert.equal(state.pendingOperator, null);
  assert.equal(state.errorMessage, null);
});

// ---- AC-6: 초기화(AC)·Backspace ----

test('AC-6: clear 입력 시 상태와 디스플레이가 초기화된다', () => {
  let state = createInitialState();
  state = handleInput(state, { type: 'digit', value: '7' });
  state = handleInput(state, { type: 'clear' });
  assert.equal(state.state, 'idle');
  assert.equal(state.displayValue, '0');
});

test('AC-6: backspace 로 마지막 문자를 삭제한다', () => {
  let state = createInitialState();
  state = handleInput(state, { type: 'digit', value: '1' });
  state = handleInput(state, { type: 'digit', value: '2' });
  state = handleInput(state, { type: 'backspace' });
  assert.equal(state.displayValue, '1');
});

test('AC-6: backspace 로 마지막 한 자리를 지우면 디스플레이는 0 이 된다', () => {
  let state = createInitialState();
  state = handleInput(state, { type: 'digit', value: '7' });
  state = handleInput(state, { type: 'backspace' });
  assert.equal(state.displayValue, '0');
});

// ---- AC-7: result 상태에서의 재입력 ----

test('AC-7: result 상태에서 숫자 입력 시 이전 결과를 폐기하고 새 계산을 시작한다', () => {
  let state = createInitialState();
  state = handleInput(state, { type: 'digit', value: '3' });
  state = handleInput(state, { type: 'operator', value: '+' });
  state = handleInput(state, { type: 'digit', value: '5' });
  state = handleInput(state, { type: 'equals' }); // result: 8
  state = handleInput(state, { type: 'digit', value: '9' });
  assert.equal(state.state, 'entering');
  assert.equal(state.displayValue, '9');
  assert.equal(state.pendingOperator, null);
});

test('AC-7: result 상태에서 연산자 입력 시 이전 결과로 연속 계산을 이어간다', () => {
  let state = createInitialState();
  state = handleInput(state, { type: 'digit', value: '3' });
  state = handleInput(state, { type: 'operator', value: '+' });
  state = handleInput(state, { type: 'digit', value: '5' });
  state = handleInput(state, { type: 'equals' }); // result: 8
  state = handleInput(state, { type: 'operator', value: '+' });
  state = handleInput(state, { type: 'digit', value: '2' });
  state = handleInput(state, { type: 'equals' });
  assert.equal(state.state, 'result');
  assert.equal(state.displayValue, '10');
});
