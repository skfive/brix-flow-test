// BF-1408 — 회귀 가드: 재시도 지연 계산기 (computeRetryDelay)
//
// 계약 출처: docs/plans/retry-delay-BF-1399.md (frozen), IF-RETRY-DELAY.json
// 목적: dev(BF-1405)가 이미 검증한 정상 케이스(AC-1/AC-2)의 핵심 로직 재검증이 아니라,
//       - 상한 clamp 경계(직전/정확/초과)
//       - attempt=0 하한
//       - 음수/NaN/비정수/비-number 오류 케이스
//       - 역전된 상한(maxDelayMs < baseDelayMs)
//       - 입력 불변성
//       - 정수 밀리초 반환 계약
//       이 향후 silent 하게 깨지지 않도록 회귀 가드로 고정한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRetryDelay } from '../../src/retry-delay/retry-delay.js';

test('회귀 가드 — 재시도 지연 계산기', async (t) => {
  await t.test('attempt=0 하한 — baseDelayMs 그대로 반환 (E1/AC-1)', () => {
    assert.equal(computeRetryDelay(0, 100, 10000), 100);
  });

  await t.test('상한 도달 직전 — 계산값이 상한 미만 (E2/AC-3 인접)', () => {
    // 100 * 2^2 = 400 < 800 (아직 clamp 없음)
    assert.equal(computeRetryDelay(2, 100, 800), 400);
  });

  await t.test('상한 정확히 도달 — clamp 없이 동일값 (E3/AC-3)', () => {
    // 100 * 2^3 = 800 === maxDelayMs
    assert.equal(computeRetryDelay(3, 100, 800), 800);
  });

  await t.test('상한 초과 — maxDelayMs로 clamp (E4/AC-4)', () => {
    // 100 * 2^4 = 1600 > 800
    assert.equal(computeRetryDelay(4, 100, 800), 800);
  });

  await t.test('초대형 attempt — 2^attempt가 Infinity여도 상한으로 안전 clamp (E5/AC-5)', () => {
    assert.equal(computeRetryDelay(1000, 100, 10000), 10000);
  });

  await t.test('attempt 음수 — RangeError throw (E6)', () => {
    assert.throws(() => computeRetryDelay(-1, 100, 10000), RangeError);
  });

  await t.test('attempt 비정수 — RangeError throw (E7)', () => {
    assert.throws(() => computeRetryDelay(1.5, 100, 10000), RangeError);
  });

  await t.test('attempt NaN — TypeError throw (E8)', () => {
    assert.throws(() => computeRetryDelay(NaN, 100, 10000), TypeError);
  });

  await t.test('attempt 비-number 타입("2") — TypeError throw (E9)', () => {
    assert.throws(() => computeRetryDelay('2', 100, 10000), TypeError);
  });

  await t.test('baseDelayMs<=0 — RangeError throw (E10)', () => {
    assert.throws(() => computeRetryDelay(0, 0, 10000), RangeError);
  });

  await t.test('baseDelayMs 비정수 — RangeError throw (E11)', () => {
    assert.throws(() => computeRetryDelay(0, 1.5, 10000), RangeError);
  });

  await t.test('baseDelayMs NaN — TypeError throw (E11)', () => {
    assert.throws(() => computeRetryDelay(0, NaN, 10000), TypeError);
  });

  await t.test('역전된 상한(maxDelayMs < baseDelayMs) — RangeError throw (E12)', () => {
    assert.throws(() => computeRetryDelay(0, 1000, 500), RangeError);
  });

  await t.test('maxDelayMs 비정수 — RangeError throw (E13)', () => {
    assert.throws(() => computeRetryDelay(0, 100, 1.5), RangeError);
  });

  await t.test('maxDelayMs NaN — TypeError throw (E13)', () => {
    assert.throws(() => computeRetryDelay(0, 100, NaN), TypeError);
  });

  await t.test('Infinity 인자 — TypeError throw (E14)', () => {
    assert.throws(() => computeRetryDelay(Infinity, 100, 10000), TypeError);
  });

  await t.test('입력 불변성 — 호출 후 인자 원본값 보존 (AC-6)', () => {
    const attempt = 2;
    const baseDelayMs = 100;
    const maxDelayMs = 10000;
    computeRetryDelay(attempt, baseDelayMs, maxDelayMs);
    assert.equal(attempt, 2);
    assert.equal(baseDelayMs, 100);
    assert.equal(maxDelayMs, 10000);
  });

  await t.test('정수 밀리초 반환 계약 — 모든 결과가 Number.isInteger이며 [base, max] 범위 내', () => {
    const cases = [
      [0, 100, 10000],
      [1, 100, 10000],
      [3, 100, 800],
      [4, 100, 800],
      [1000, 100, 10000],
    ];
    for (const [attempt, baseDelayMs, maxDelayMs] of cases) {
      const result = computeRetryDelay(attempt, baseDelayMs, maxDelayMs);
      assert.equal(Number.isInteger(result), true, `attempt=${attempt} 결과가 정수가 아님: ${result}`);
      assert.ok(result >= baseDelayMs && result <= maxDelayMs, `attempt=${attempt} 결과가 [${baseDelayMs}, ${maxDelayMs}] 범위 밖: ${result}`);
    }
  });
});
