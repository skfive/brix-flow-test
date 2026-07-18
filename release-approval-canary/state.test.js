// 릴리스 변경 승인 큐 — 순수 상태 로직 dev 단위 테스트 (BF-1063)
// 실행: node --test release-approval-canary/state.test.js
// 기획 §3.2(전이 T1~T5)·§5(정렬 tie-breaker)·§6(edge case) 커버.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseApprovalFixture } from './fixtures.js';
import {
  loadInitialState,
  selectQueue,
  decide,
  countByStatus,
  riskBand,
} from './state.js';

function initial() {
  return loadInitialState(releaseApprovalFixture);
}

test('loadInitialState: fixture 를 깊은 복사하며 원본을 변형하지 않는다', () => {
  const state = initial();
  assert.equal(state.length, releaseApprovalFixture.candidates.length);
  state[0].riskFactors.push('오염');
  state[0].decisionHistory.push({ candidateId: 'x' });
  // 원본 fixture 는 그대로여야 한다(재현성 보장).
  assert.equal(releaseApprovalFixture.candidates[0].riskFactors.includes('오염'), false);
  assert.equal(releaseApprovalFixture.candidates[0].decisionHistory.length, 0);
});

test('riskBand: §2.3 구간 경계(90/60)를 정확히 분류한다', () => {
  assert.equal(riskBand(100), 'high');
  assert.equal(riskBand(90), 'high');
  assert.equal(riskBand(89), 'mid');
  assert.equal(riskBand(60), 'mid');
  assert.equal(riskBand(59), 'low');
  assert.equal(riskBand(0), 'low');
});

test('selectQueue: §5 정렬 키(riskScore desc → submittedAt asc → id asc)를 순서대로 적용', () => {
  const queue = selectQueue(initial(), 'all');
  const ids = queue.map((c) => c.id);
  // 92 동률: submittedAt 이 이른 0002 가 0001 보다 앞. 그다음 63 동률 → id asc(0003 < 0005). 마지막 41(0004).
  assert.deepEqual(ids, ['rc-2026-0002', 'rc-2026-0001', 'rc-2026-0003', 'rc-2026-0005', 'rc-2026-0004']);
});

test('selectQueue: 동일 입력에 항상 동일한 순서(결정성)를 산출한다', () => {
  const a = selectQueue(initial(), 'all').map((c) => c.id);
  const b = selectQueue(initial(), 'all').map((c) => c.id);
  assert.deepEqual(a, b);
});

test('selectQueue: status 2번 키 — 위험도 동률이면 held 후보가 pending_review 보다 먼저', () => {
  // 0001 을 held 로 전이하면 92 동률 두 후보 중 held(0001)가 pending(0002)보다 앞서야 한다.
  const held = decide(initial(), 'rc-2026-0001', 'hold', 'ops-hana');
  const ids = selectQueue(held, 'all').map((c) => c.id);
  assert.deepEqual(ids.slice(0, 2), ['rc-2026-0001', 'rc-2026-0002']);
});

test('selectQueue: "all" 은 approved 종결 후보를 제외한다(디자인 §4.3)', () => {
  const approved = decide(initial(), 'rc-2026-0001', 'approve', 'ops-hana');
  const allIds = selectQueue(approved, 'all').map((c) => c.id);
  assert.equal(allIds.includes('rc-2026-0001'), false);
  // approved 필터에서만 노출.
  const approvedIds = selectQueue(approved, 'approved').map((c) => c.id);
  assert.deepEqual(approvedIds, ['rc-2026-0001']);
});

test('selectQueue: 빈 후보 목록이면 빈 배열(에러 아님, §6)', () => {
  assert.deepEqual(selectQueue([], 'all'), []);
  assert.deepEqual(selectQueue([], 'pending_review'), []);
});

test('decide T1: pending_review → approve → approved, 이력 1건 추가', () => {
  const before = initial();
  const after = decide(before, 'rc-2026-0001', 'approve', 'ops-hana');
  const target = after.find((c) => c.id === 'rc-2026-0001');
  assert.equal(target.status, 'approved');
  assert.equal(target.decisionHistory.length, 1);
  assert.deepEqual(
    { from: target.decisionHistory[0].from, to: target.decisionHistory[0].to, action: target.decisionHistory[0].action },
    { from: 'pending_review', to: 'approved', action: 'approve' },
  );
  // 순수 함수 — 원본 불변.
  assert.equal(before.find((c) => c.id === 'rc-2026-0001').status, 'pending_review');
});

test('decide T2: pending_review → hold → held, 이력 1건', () => {
  const after = decide(initial(), 'rc-2026-0001', 'hold', 'ops-jin', '롤백 스크립트 확인 필요');
  const target = after.find((c) => c.id === 'rc-2026-0001');
  assert.equal(target.status, 'held');
  assert.equal(target.decisionHistory.length, 1);
  assert.equal(target.decisionHistory[0].note, '롤백 스크립트 확인 필요');
});

test('decide T3/T4: held → reopen → pending_review → approve, 이력 누락 없이 누적', () => {
  let state = decide(initial(), 'rc-2026-0001', 'hold', 'ops-jin'); // T2
  state = decide(state, 'rc-2026-0001', 'reopen', 'ops-hana'); // T4
  state = decide(state, 'rc-2026-0001', 'approve', 'ops-hana'); // T1
  const target = state.find((c) => c.id === 'rc-2026-0001');
  assert.equal(target.status, 'approved');
  // 매 전이마다 1건씩 누적 — 중간 이력 유지(append-only).
  assert.equal(target.decisionHistory.length, 3);
  assert.deepEqual(
    target.decisionHistory.map((e) => e.action),
    ['hold', 'reopen', 'approve'],
  );
});

test('decide T5: approved 종결 후보는 어떤 액션도 no-op(이력 미추가)', () => {
  const approved = decide(initial(), 'rc-2026-0001', 'approve', 'ops-hana');
  for (const action of ['approve', 'hold', 'reopen']) {
    const after = decide(approved, 'rc-2026-0001', action, 'ops-hana');
    const target = after.find((c) => c.id === 'rc-2026-0001');
    assert.equal(target.status, 'approved');
    assert.equal(target.decisionHistory.length, 1); // 최초 approve 1건 그대로.
  }
});

test('decide: 불법 전이(held 상태에 hold, pending 상태에 reopen)는 no-op', () => {
  const held = decide(initial(), 'rc-2026-0001', 'hold', 'ops-jin');
  const reHold = decide(held, 'rc-2026-0001', 'hold', 'ops-jin');
  assert.equal(reHold.find((c) => c.id === 'rc-2026-0001').decisionHistory.length, 1);

  const reopenPending = decide(initial(), 'rc-2026-0001', 'reopen', 'ops-hana');
  assert.equal(reopenPending.find((c) => c.id === 'rc-2026-0001').decisionHistory.length, 0);
  assert.equal(reopenPending.find((c) => c.id === 'rc-2026-0001').status, 'pending_review');
});

test('decide: 존재하지 않는 후보 id 는 no-op(안전)', () => {
  const after = decide(initial(), 'rc-not-exist', 'approve', 'ops-hana');
  assert.deepEqual(after.map((c) => c.status), initial().map((c) => c.status));
});

test('decide: at 은 결정적 논리 클록(동일 시퀀스 → 동일 값), Date.now() 비의존', () => {
  const a = decide(initial(), 'rc-2026-0001', 'approve', 'ops-hana');
  const b = decide(initial(), 'rc-2026-0001', 'approve', 'ops-hana');
  const atA = a.find((c) => c.id === 'rc-2026-0001').decisionHistory[0].at;
  const atB = b.find((c) => c.id === 'rc-2026-0001').decisionHistory[0].at;
  assert.equal(atA, atB);
  assert.match(atA, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test('countByStatus: all 은 approved 제외 결정 대기 수, 상태별 개수 정확', () => {
  const state = initial();
  const counts = countByStatus(state);
  assert.deepEqual(counts, { all: 5, pending_review: 5, held: 0, approved: 0 });
  const approved = decide(state, 'rc-2026-0001', 'approve', 'ops-hana');
  assert.deepEqual(countByStatus(approved), { all: 4, pending_review: 4, held: 0, approved: 1 });
});
