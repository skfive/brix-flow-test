import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createCounter,
  increment,
  decrement,
  reset,
  type CounterState,
} from './counter.ts';

test('createCounter: 기본값은 count 0 인 상태를 반환한다', () => {
  const state = createCounter();
  assert.equal(state.count, 0);
});

test('createCounter: 초기값을 받아 해당 count 상태를 반환한다', () => {
  const state = createCounter(5);
  assert.equal(state.count, 5);
});

test('createCounter: 음수 초기값은 거부한다', () => {
  assert.throws(() => createCounter(-1), RangeError);
});

test('createCounter: 정수가 아닌 초기값은 거부한다', () => {
  assert.throws(() => createCounter(1.5), TypeError);
});

test('createCounter: NaN / Infinity 초기값은 거부한다', () => {
  assert.throws(() => createCounter(Number.NaN), TypeError);
  assert.throws(() => createCounter(Number.POSITIVE_INFINITY), TypeError);
});

test('increment: 기본 증가량 1 로 count 를 올린다', () => {
  const next = increment(createCounter(0));
  assert.equal(next.count, 1);
});

test('increment: 지정한 증가량만큼 올린다', () => {
  const next = increment(createCounter(2), 3);
  assert.equal(next.count, 5);
});

test('increment: 음수 증가량은 거부한다', () => {
  assert.throws(() => increment(createCounter(0), -1), RangeError);
});

test('increment: 정수가 아닌 증가량은 거부한다', () => {
  assert.throws(() => increment(createCounter(0), 0.5), TypeError);
});

test('decrement: 지정한 감소량만큼 내린다', () => {
  const next = decrement(createCounter(5), 2);
  assert.equal(next.count, 3);
});

test('decrement: 0 미만으로 내려가지 않도록 음수 진입을 차단한다', () => {
  const next = decrement(createCounter(1), 5);
  assert.equal(next.count, 0);
});

test('decrement: 음수 감소량은 거부한다', () => {
  assert.throws(() => decrement(createCounter(3), -2), RangeError);
});

test('reset: count 를 0 으로 되돌린 새 상태를 반환한다', () => {
  const next = reset(createCounter(9));
  assert.equal(next.count, 0);
});

test('immutability: 입력 상태를 변경하지 않고 새 객체를 반환한다', () => {
  const state = createCounter(4);
  const next = increment(state, 2);
  assert.equal(state.count, 4, '원본 상태는 변경되지 않아야 한다');
  assert.notEqual(next, state, '새 상태 객체를 반환해야 한다');
});

test('immutability: 반환된 상태는 동결되어 변경 시도가 차단된다', () => {
  const state: CounterState = createCounter(0);
  assert.ok(Object.isFrozen(state));
  assert.throws(() => {
    // @ts-expect-error readonly 속성 변경 시도 — 런타임에서도 차단되어야 한다
    state.count = 99;
  }, TypeError);
});
