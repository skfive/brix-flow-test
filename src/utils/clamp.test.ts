import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { clamp } from './clamp.ts';

describe('clamp', () => {
  it('n < min 이면 min 을 반환한다', () => {
    assert.equal(clamp(-5, 0, 10), 0);
  });

  it('n > max 이면 max 를 반환한다', () => {
    assert.equal(clamp(15, 0, 10), 10);
  });

  it('min <= n <= max 이면 n 을 그대로 반환한다', () => {
    assert.equal(clamp(5, 0, 10), 5);
  });

  it('min === max 이면 항상 그 값(min=max)을 반환한다', () => {
    assert.equal(clamp(5, 3, 3), 3);
    assert.equal(clamp(1, 3, 3), 3);
    assert.equal(clamp(9, 3, 3), 3);
  });

  it('n 이 경계값(min, max)과 같으면 그 값을 반환한다', () => {
    assert.equal(clamp(0, 0, 10), 0);
    assert.equal(clamp(10, 0, 10), 10);
  });

  it('음수 범위에서도 동작한다', () => {
    assert.equal(clamp(-20, -10, -1), -10);
    assert.equal(clamp(0, -10, -1), -1);
    assert.equal(clamp(-5, -10, -1), -5);
  });

  it('소수(실수)도 클램프한다', () => {
    assert.equal(clamp(2.5, 0, 1), 1);
    assert.equal(clamp(0.5, 0, 1), 0.5);
    assert.equal(clamp(-0.5, 0, 1), 0);
  });

  it('유한하지 않은 입력은 명시적 TypeError 를 던진다', () => {
    assert.throws(() => clamp(Number.NaN, 0, 10), TypeError);
    assert.throws(() => clamp(5, Number.NaN, 10), TypeError);
    assert.throws(() => clamp(5, 0, Number.POSITIVE_INFINITY), TypeError);
  });

  it('min > max 인 잘못된 범위는 명시적 RangeError 를 던진다', () => {
    assert.throws(() => clamp(5, 10, 0), RangeError);
  });
});
