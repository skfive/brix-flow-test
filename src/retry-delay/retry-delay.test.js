// src/retry-delay/retry-delay.test.js
// 단위 테스트 (node --test, ESM) — 계약 docs/plans/retry-delay-BF-1399.md §3 AC / §4 Edge case 커버.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRetryDelay } from './retry-delay.js';

// ── §3 Acceptance Criteria ───────────────────────────────────────────────
test('AC-1: attempt=0 → base (상한 미만)', () => {
  assert.equal(computeRetryDelay(0, 100, 10000), 100); // 100 * 2^0 = 100
});

test('AC-2: 지수 증가 (상한 미도달)', () => {
  assert.equal(computeRetryDelay(1, 100, 10000), 200);
  assert.equal(computeRetryDelay(2, 100, 10000), 400);
  assert.equal(computeRetryDelay(3, 100, 10000), 800);
});

test('AC-3/E3: 상한 정확 도달 (clamp 없이 동일)', () => {
  assert.equal(computeRetryDelay(3, 100, 800), 800); // 100 * 2^3 = 800
});

test('AC-4/E4: 상한 초과 → clamp', () => {
  assert.equal(computeRetryDelay(4, 100, 800), 800); // 1600 > 800 → 800
});

test('AC-5/E5: 초대형 attempt (2^attempt=Infinity) → 상한, O(1) 안전', () => {
  assert.equal(computeRetryDelay(1000, 100, 10000), 10000);
});

test('AC-6: 입력 불변 — 인자 값 보존 & side-effect 없음', () => {
  const attempt = 3;
  const base = 100;
  const max = 10000;
  computeRetryDelay(attempt, base, max);
  assert.equal(attempt, 3);
  assert.equal(base, 100);
  assert.equal(max, 10000);
});

// ── 반환값 일반 불변식 ────────────────────────────────────────────────────
test('반환값은 항상 정수이며 [base, max] 범위 내', () => {
  for (const a of [0, 1, 2, 5, 10, 50, 200, 1000]) {
    const v = computeRetryDelay(a, 100, 10000);
    assert.ok(Number.isInteger(v), `정수여야 함: ${v}`);
    assert.ok(v >= 100 && v <= 10000, `범위 내여야 함: ${v}`);
  }
});

test('base === max 인 경우 항상 그 값', () => {
  assert.equal(computeRetryDelay(0, 500, 500), 500);
  assert.equal(computeRetryDelay(10, 500, 500), 500);
});

// ── §4 Edge case / 오류 정책 ─────────────────────────────────────────────
test('E6: attempt 음수 → RangeError', () => {
  assert.throws(() => computeRetryDelay(-1, 100, 10000), RangeError);
});

test('E7: attempt 비정수 → RangeError', () => {
  assert.throws(() => computeRetryDelay(1.5, 100, 10000), RangeError);
});

test('E8: attempt NaN → TypeError', () => {
  assert.throws(() => computeRetryDelay(NaN, 100, 10000), TypeError);
});

test('E9: attempt 비-number 타입 → TypeError', () => {
  assert.throws(() => computeRetryDelay('2', 100, 10000), TypeError);
});

test('E10: baseDelayMs <= 0 → RangeError', () => {
  assert.throws(() => computeRetryDelay(0, 0, 10000), RangeError);
});

test('E11: baseDelayMs 비정수 → RangeError / NaN → TypeError', () => {
  assert.throws(() => computeRetryDelay(0, 1.5, 10000), RangeError);
  assert.throws(() => computeRetryDelay(0, NaN, 10000), TypeError);
});

test('E12: maxDelayMs < baseDelayMs (역전) → RangeError', () => {
  assert.throws(() => computeRetryDelay(0, 1000, 500), RangeError);
});

test('E13: maxDelayMs 비정수 → RangeError / NaN → TypeError', () => {
  assert.throws(() => computeRetryDelay(0, 100, 1.5), RangeError);
  assert.throws(() => computeRetryDelay(0, 100, NaN), TypeError);
});

test('E14: Infinity 입력 (어느 인자든) → TypeError', () => {
  assert.throws(() => computeRetryDelay(Infinity, 100, 10000), TypeError);
  assert.throws(() => computeRetryDelay(0, Infinity, 10000), TypeError);
  assert.throws(() => computeRetryDelay(0, 100, Infinity), TypeError);
});

test('에러 메시지에 위반 파라미터명 포함', () => {
  assert.throws(() => computeRetryDelay(-1, 100, 10000), /attempt/);
  assert.throws(() => computeRetryDelay(0, 0, 10000), /baseDelayMs/);
  assert.throws(() => computeRetryDelay(0, 1000, 500), /maxDelayMs/);
});
