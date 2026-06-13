import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { clamp } from './clamp.ts';

describe('clamp', () => {
  it('n 이 min 보다 작으면 min 을 반환한다', () => {
    assert.equal(clamp(-5, 0, 10), 0);
    assert.equal(clamp(2, 3, 9), 3);
  });

  it('n 이 max 보다 크면 max 를 반환한다', () => {
    assert.equal(clamp(15, 0, 10), 10);
    assert.equal(clamp(100, 3, 9), 9);
  });

  it('min <= n <= max 이면 n 을 그대로 반환한다', () => {
    assert.equal(clamp(5, 0, 10), 5);
    assert.equal(clamp(0, 0, 10), 0);
    assert.equal(clamp(10, 0, 10), 10);
  });

  it('min === max 엣지에서는 항상 그 값을 반환한다', () => {
    assert.equal(clamp(7, 5, 5), 5);
    assert.equal(clamp(5, 5, 5), 5);
    assert.equal(clamp(3, 5, 5), 5);
  });

  it('음수 범위에서도 올바르게 클램프한다', () => {
    assert.equal(clamp(-20, -10, -1), -10);
    assert.equal(clamp(0, -10, -1), -1);
    assert.equal(clamp(-5, -10, -1), -5);
  });

  it('소수도 올바르게 클램프한다', () => {
    assert.equal(clamp(1.5, 0, 1), 1);
    assert.equal(clamp(0.5, 0, 1), 0.5);
    assert.equal(clamp(-0.5, 0, 1), 0);
  });
});
