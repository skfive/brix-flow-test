/**
 * sync-status/status.test.js — 순수 함수 자체 검증 (developer BF-1164)
 *
 * planner 명세(BF-1162) §9 필수 케이스 TC-01~18 을 커버한다.
 * 권위 있는 회귀 가드(tests/sync-status-*.test.js)는 downstream tester(BF-1166)가 소유하며,
 * 본 파일은 developer 가 commit 전 순수 함수 계약을 결정론적으로 자체 검증하기 위한 것이다.
 *
 * 실행: node --test src/features/sync-status/status.test.js
 *
 * 이 디렉토리는 nested package.json 으로 CommonJS 스코프이므로 require 를 사용한다.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const S = require('./status.js');

test('TC-01~04 startSync check 허용 상태 → syncing', () => {
  assert.strictEqual(S.startSync('idle', 'check'), 'syncing');
  assert.strictEqual(S.startSync('up_to_date', 'check'), 'syncing');
  assert.strictEqual(S.startSync('behind', 'check'), 'syncing');
});

test('TC-05~06 startSync retry 허용 상태 → syncing', () => {
  assert.strictEqual(S.startSync('failed', 'retry'), 'syncing');
  assert.strictEqual(S.startSync('conflict', 'retry'), 'syncing');
});

test('TC-07~08 startSync 허용되지 않는 조합 → TypeError', () => {
  assert.throws(() => S.startSync('idle', 'retry'), TypeError);
  assert.throws(() => S.startSync('failed', 'check'), TypeError);
  assert.throws(() => S.startSync('syncing', 'check'), TypeError);
});

test('TC-09~12 resolveSync outcome → 최종 상태', () => {
  assert.strictEqual(S.resolveSync('clean'), 'up_to_date');
  assert.strictEqual(S.resolveSync('stale'), 'behind');
  assert.strictEqual(S.resolveSync('conflict'), 'conflict');
  assert.strictEqual(S.resolveSync('error'), 'failed');
});

test('TC-13 resolveSync 잘못된 outcome → TypeError', () => {
  assert.throws(() => S.resolveSync('invalid'), TypeError);
});

test('TC-14 nextOutcome 순환', () => {
  const fx = { outcomes: ['clean', 'stale'] };
  assert.strictEqual(S.nextOutcome(fx, 0), 'clean');
  assert.strictEqual(S.nextOutcome(fx, 1), 'stale');
  assert.strictEqual(S.nextOutcome(fx, 2), 'clean');
  assert.strictEqual(S.nextOutcome(fx, 3), 'stale');
});

test('TC-15 recordCheckCost 소요시간 누적 (불변 갱신)', () => {
  const m0 = { checkDurationsMs: [] };
  const m1 = S.recordCheckCost(m0, 100, 340);
  assert.deepStrictEqual(m1.checkDurationsMs, [240]);
  assert.deepStrictEqual(m0.checkDurationsMs, [], '원본 불변');
});

test('TC-16 recordRetryOutcome 성공 집계', () => {
  const m = S.recordRetryOutcome({ retryAttempts: 0, retrySuccesses: 0 }, 'up_to_date');
  assert.strictEqual(m.retryAttempts, 1);
  assert.strictEqual(m.retrySuccesses, 1);
});

test('TC-17~18 recordRetryOutcome 실패/충돌은 성공 미집계', () => {
  const f = S.recordRetryOutcome({ retryAttempts: 0, retrySuccesses: 0 }, 'failed');
  assert.strictEqual(f.retryAttempts, 1);
  assert.strictEqual(f.retrySuccesses, 0);
  const c = S.recordRetryOutcome({ retryAttempts: 2, retrySuccesses: 1 }, 'conflict');
  assert.strictEqual(c.retryAttempts, 3);
  assert.strictEqual(c.retrySuccesses, 1);
});

test('파생 헬퍼: triggerFor / summarize / sortBySeverity', () => {
  assert.strictEqual(S.triggerFor('idle'), 'check');
  assert.strictEqual(S.triggerFor('failed'), 'retry');
  assert.strictEqual(S.triggerFor('syncing'), null);

  const repos = [
    { name: 'a', state: 'up_to_date' },
    { name: 'b', state: 'failed' },
    { name: 'c', state: 'behind' },
  ];
  const s = S.summarize(repos);
  assert.strictEqual(s.total, 3);
  assert.strictEqual(s.counts.failed, 1);
  assert.strictEqual(s.counts.up_to_date, 1);

  const sorted = S.sortBySeverity(repos).map((r) => r.state);
  assert.deepStrictEqual(sorted, ['failed', 'behind', 'up_to_date'], '급한 것 위로');
});

test('KPI 집계값: averageCheckCost / retrySuccessRate (0건 → null)', () => {
  assert.strictEqual(S.averageCheckCost({ checkDurationsMs: [] }), null);
  assert.strictEqual(S.averageCheckCost({ checkDurationsMs: [100, 300] }), 200);
  assert.strictEqual(S.retrySuccessRate({ retryAttempts: 0, retrySuccesses: 0 }), null);
  assert.strictEqual(S.retrySuccessRate({ retryAttempts: 4, retrySuccesses: 3 }), 0.75);
});
