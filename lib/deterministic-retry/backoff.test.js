// computeBackoffDelay 단위 테스트 (BF-1387)
// 계약: docs/plans/implementation-plan.md §3~§4 (planning-contract@v1).
// node:test 기반, 외부 의존성 없음.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBackoffDelay } from './backoff.js';

// ── §4 Edge / 경계 케이스 (E-1 ~ E-7) ──────────────────────────────

test('E-1: attempt=0 → baseDelayMs 반환 (최초 시도는 base 지연)', () => {
  assert.equal(computeBackoffDelay({ baseDelayMs: 100, attempt: 0, maxDelayMs: 10000 }), 100);
});

test('E-2: baseDelayMs=0 → 모든 attempt 에서 0', () => {
  assert.equal(computeBackoffDelay({ baseDelayMs: 0, attempt: 0, maxDelayMs: 1000 }), 0);
  assert.equal(computeBackoffDelay({ baseDelayMs: 0, attempt: 5, maxDelayMs: 1000 }), 0);
  assert.equal(computeBackoffDelay({ baseDelayMs: 0, attempt: 30, maxDelayMs: 1000 }), 0);
});

test('E-3: cap 직전 (지수값 < maxDelayMs) → 지수값 그대로', () => {
  // 100 * 2**3 = 800 < 10000
  assert.equal(computeBackoffDelay({ baseDelayMs: 100, attempt: 3, maxDelayMs: 10000 }), 800);
  // 1 * 2**4 = 16 < 100
  assert.equal(computeBackoffDelay({ baseDelayMs: 1, attempt: 4, maxDelayMs: 100 }), 16);
});

test('E-4: cap 경계 (지수값 === maxDelayMs) → maxDelayMs', () => {
  // 100 * 2**3 = 800 === 800
  assert.equal(computeBackoffDelay({ baseDelayMs: 100, attempt: 3, maxDelayMs: 800 }), 800);
});

test('E-5: cap 초과 (지수값 > maxDelayMs) → maxDelayMs 로 포화', () => {
  // 100 * 2**10 = 102400 > 5000
  assert.equal(computeBackoffDelay({ baseDelayMs: 100, attempt: 10, maxDelayMs: 5000 }), 5000);
});

test('E-6: 매우 큰 attempt (지수값 안전범위 초과/Infinity) → maxDelayMs, 예외 없음', () => {
  assert.equal(computeBackoffDelay({ baseDelayMs: 100, attempt: 1024, maxDelayMs: 30000 }), 30000);
  // 2**1024 === Infinity 이지만 base>0 이므로 Infinity → Math.min 으로 포화
  assert.equal(computeBackoffDelay({ baseDelayMs: 1, attempt: 2000, maxDelayMs: 60000 }), 60000);
  // base=0 + huge attempt: 0 * Infinity 회귀 방지 확인 (0 반환, NaN 아님)
  assert.equal(computeBackoffDelay({ baseDelayMs: 0, attempt: 1024, maxDelayMs: 60000 }), 0);
});

test('E-7: maxDelayMs === baseDelayMs → 모든 attempt 에서 baseDelayMs 로 포화', () => {
  assert.equal(computeBackoffDelay({ baseDelayMs: 500, attempt: 0, maxDelayMs: 500 }), 500);
  assert.equal(computeBackoffDelay({ baseDelayMs: 500, attempt: 10, maxDelayMs: 500 }), 500);
});

// ── §3.3 불변식 ────────────────────────────────────────────────────

test('불변식 1: 입력 객체를 mutate 하지 않는다', () => {
  const input = { baseDelayMs: 100, attempt: 5, maxDelayMs: 3000 };
  const snapshot = { ...input };
  computeBackoffDelay(input);
  assert.deepEqual(input, snapshot);
});

test('불변식 2: 결정론성 — 동일 입력 → 동일 출력', () => {
  const input = { baseDelayMs: 250, attempt: 7, maxDelayMs: 100000 };
  const first = computeBackoffDelay(input);
  const second = computeBackoffDelay(input);
  assert.equal(first, second);
  assert.equal(first, Math.min(100000, 250 * 2 ** 7));
});

test('불변식 5: 유효 입력에 대해 항상 0 <= result <= maxDelayMs 인 안전 정수', () => {
  for (const attempt of [0, 1, 2, 5, 10, 20, 40, 100]) {
    const result = computeBackoffDelay({ baseDelayMs: 20, attempt, maxDelayMs: 30000 });
    assert.ok(Number.isInteger(result), `result(${result})는 정수여야 함`);
    assert.ok(Number.isSafeInteger(result), `result(${result})는 안전 정수여야 함`);
    assert.ok(result >= 0 && result <= 30000, `result(${result})는 [0, 30000] 범위여야 함`);
  }
});

// ── §4 실패(예외) 케이스 (F-1 ~ F-6) ───────────────────────────────

test('F-1: 필드 음수 → RangeError', () => {
  assert.throws(() => computeBackoffDelay({ baseDelayMs: 100, attempt: -1, maxDelayMs: 1000 }), RangeError);
  assert.throws(() => computeBackoffDelay({ baseDelayMs: -5, attempt: 0, maxDelayMs: 1000 }), RangeError);
});

test('F-2: 필드 NaN → TypeError', () => {
  assert.throws(() => computeBackoffDelay({ baseDelayMs: NaN, attempt: 0, maxDelayMs: 1000 }), TypeError);
  assert.throws(() => computeBackoffDelay({ baseDelayMs: 100, attempt: NaN, maxDelayMs: 1000 }), TypeError);
  assert.throws(() => computeBackoffDelay({ baseDelayMs: 100, attempt: 0, maxDelayMs: NaN }), TypeError);
});

test('F-3: 필드 소수(비정수) → TypeError', () => {
  assert.throws(() => computeBackoffDelay({ baseDelayMs: 1.5, attempt: 0, maxDelayMs: 1000 }), TypeError);
  assert.throws(() => computeBackoffDelay({ baseDelayMs: 100, attempt: 2.7, maxDelayMs: 1000 }), TypeError);
  assert.throws(() => computeBackoffDelay({ baseDelayMs: 100, attempt: 0, maxDelayMs: 999.9 }), TypeError);
});

test('F-4: 필드가 number 아님 → TypeError', () => {
  assert.throws(() => computeBackoffDelay({ baseDelayMs: 100, attempt: '2', maxDelayMs: 1000 }), TypeError);
  assert.throws(() => computeBackoffDelay({ baseDelayMs: '100', attempt: 0, maxDelayMs: 1000 }), TypeError);
  assert.throws(() => computeBackoffDelay({ baseDelayMs: 100, attempt: undefined, maxDelayMs: 1000 }), TypeError);
  assert.throws(() => computeBackoffDelay({ baseDelayMs: 100, attempt: 0 /* maxDelayMs 누락 */ }), TypeError);
});

test('F-5: maxDelayMs < baseDelayMs → RangeError', () => {
  assert.throws(() => computeBackoffDelay({ baseDelayMs: 100, attempt: 0, maxDelayMs: 50 }), RangeError);
});

test('F-6: 필드 Infinity/-Infinity → TypeError', () => {
  assert.throws(() => computeBackoffDelay({ baseDelayMs: 100, attempt: Infinity, maxDelayMs: 1000 }), TypeError);
  assert.throws(() => computeBackoffDelay({ baseDelayMs: -Infinity, attempt: 0, maxDelayMs: 1000 }), TypeError);
});

test('input 자체가 객체 아님(null/비객체) → TypeError', () => {
  assert.throws(() => computeBackoffDelay(null), TypeError);
  assert.throws(() => computeBackoffDelay(undefined), TypeError);
  assert.throws(() => computeBackoffDelay(42), TypeError);
});
