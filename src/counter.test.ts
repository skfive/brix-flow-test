import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createCounter,
  increment,
  decrement,
  reset,
  type Counter,
} from './counter.ts';

describe('createCounter', () => {
  it('기본값 0 으로 카운터를 생성한다', () => {
    const counter = createCounter();
    assert.equal(counter.value, 0);
  });

  it('명시한 초기값으로 카운터를 생성한다', () => {
    const counter = createCounter(5);
    assert.equal(counter.value, 5);
  });

  it('음수 초기값은 명시적 에러를 던진다', () => {
    assert.throws(() => createCounter(-1), RangeError);
  });

  it('정수가 아닌 초기값은 명시적 에러를 던진다', () => {
    assert.throws(() => createCounter(1.5), RangeError);
  });

  it('유한하지 않은 초기값은 명시적 에러를 던진다', () => {
    assert.throws(() => createCounter(Number.NaN), TypeError);
    assert.throws(() => createCounter(Number.POSITIVE_INFINITY), TypeError);
  });
});

describe('increment', () => {
  it('인자 없이 호출하면 1 증가한다', () => {
    const counter = createCounter(0);
    assert.equal(increment(counter).value, 1);
  });

  it('지정한 step 만큼 증가한다', () => {
    const counter = createCounter(2);
    assert.equal(increment(counter, 3).value, 5);
  });

  it('원본 카운터를 변경하지 않는다 (immutable)', () => {
    const counter = createCounter(0);
    const next = increment(counter, 4);
    assert.equal(counter.value, 0);
    assert.equal(next.value, 4);
    assert.notEqual(counter, next);
  });

  it('연속 호출이 누적된다', () => {
    let counter = createCounter(0);
    counter = increment(counter);
    counter = increment(counter, 2);
    counter = increment(counter);
    assert.equal(counter.value, 4);
  });

  it('양의 정수가 아닌 step 은 명시적 에러를 던진다', () => {
    const counter = createCounter(0);
    assert.throws(() => increment(counter, 0), RangeError);
    assert.throws(() => increment(counter, -2), RangeError);
    assert.throws(() => increment(counter, 1.5), RangeError);
    assert.throws(() => increment(counter, Number.NaN), TypeError);
  });
});

describe('decrement', () => {
  it('인자 없이 호출하면 1 감소한다', () => {
    const counter = createCounter(3);
    assert.equal(decrement(counter).value, 2);
  });

  it('지정한 step 만큼 감소한다', () => {
    const counter = createCounter(10);
    assert.equal(decrement(counter, 4).value, 6);
  });

  it('0 미만으로 내려가면 0 으로 클램프한다 (음수 방지)', () => {
    const counter = createCounter(2);
    assert.equal(decrement(counter, 5).value, 0);
  });

  it('이미 0 인 카운터를 감소시켜도 0 을 유지한다', () => {
    const counter = createCounter(0);
    assert.equal(decrement(counter).value, 0);
  });

  it('원본 카운터를 변경하지 않는다 (immutable)', () => {
    const counter = createCounter(5);
    const next = decrement(counter, 2);
    assert.equal(counter.value, 5);
    assert.equal(next.value, 3);
    assert.notEqual(counter, next);
  });

  it('연속 호출이 누적되며 0 에서 멈춘다', () => {
    let counter = createCounter(3);
    counter = decrement(counter);
    counter = decrement(counter);
    counter = decrement(counter, 5);
    assert.equal(counter.value, 0);
  });

  it('양의 정수가 아닌 step 은 명시적 에러를 던진다', () => {
    const counter = createCounter(10);
    assert.throws(() => decrement(counter, 0), RangeError);
    assert.throws(() => decrement(counter, -1), RangeError);
    assert.throws(() => decrement(counter, 2.5), RangeError);
    assert.throws(() => decrement(counter, Number.NaN), TypeError);
  });
});

describe('reset', () => {
  it('값 0 인 새 카운터를 반환한다', () => {
    const counter: Counter = reset();
    assert.equal(counter.value, 0);
  });

  it('호출마다 동일한 값(0)의 카운터를 반환한다', () => {
    assert.equal(reset().value, 0);
    assert.equal(reset().value, 0);
  });
});
