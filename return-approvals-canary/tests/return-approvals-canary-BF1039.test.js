// BF-1039 반품 승인 워크벤치 — 순수 로직 단위 테스트 (node --test)
// 실행: node --test return-approvals-canary/tests/return-approvals-canary-BF1039.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RETURN_REQUESTS, REASON_LABELS, STATUS_LABELS } from '../fixtures.js';
import {
  isValidHoldReason,
  approveRequest,
  holdRequest,
  releaseHoldRequest,
  mergeOverlay,
  toOverlayEntry,
  filterByStatus,
  computeCounts,
} from '../logic.js';

const find = (id) => RETURN_REQUESTS.find((r) => r.id === id);

test('fixture: 총 12건 + 상태 분포(대기5/승인4/보류3) + 모든 reason enum 커버', () => {
  assert.equal(RETURN_REQUESTS.length, 12);
  const counts = computeCounts(RETURN_REQUESTS);
  assert.deepEqual(counts, { all: 12, pending: 5, approved: 4, held: 3 });
  const reasons = new Set(RETURN_REQUESTS.map((r) => r.reason));
  for (const enumKey of Object.keys(REASON_LABELS)) {
    assert.ok(reasons.has(enumKey), `reason ${enumKey} 최소 1건 존재해야 함`);
  }
  // pending 이 최소 1건
  assert.ok(RETURN_REQUESTS.some((r) => r.status === 'pending'));
});

test('fixture: 필수 필드 및 불변 규칙(pending 은 holdReason/approved 필드 null)', () => {
  for (const r of RETURN_REQUESTS) {
    assert.equal(typeof r.id, 'string');
    assert.equal(typeof r.refundAmount, 'number');
    assert.ok(r.refundAmount >= 0);
    assert.ok(Number.isInteger(r.quantity) && r.quantity >= 1);
    assert.ok(STATUS_LABELS[r.status], `알 수 없는 status: ${r.status}`);
    if (r.status !== 'held') assert.equal(r.holdReason, null);
    if (r.status !== 'approved') {
      assert.equal(r.approvedAt, null);
      assert.equal(r.approvedBy, null);
    }
  }
});

test('isValidHoldReason: 공백/빈 문자열/비문자열 거부, 유효 텍스트 허용', () => {
  assert.equal(isValidHoldReason(''), false);
  assert.equal(isValidHoldReason('   '), false);
  assert.equal(isValidHoldReason('\n\t '), false);
  assert.equal(isValidHoldReason(null), false);
  assert.equal(isValidHoldReason(undefined), false);
  assert.equal(isValidHoldReason(123), false);
  assert.equal(isValidHoldReason('사유'), true);
  assert.equal(isValidHoldReason('  사유  '), true);
});

test('approveRequest: pending → approved, approvedAt/approvedBy 기록, 원본 불변', () => {
  const req = find('RTN-1001');
  const before = { ...req };
  const next = approveRequest(req, { at: '2026-07-18T10:00:00+09:00', by: 'operator-09' });
  assert.equal(next.status, 'approved');
  assert.equal(next.approvedAt, '2026-07-18T10:00:00+09:00');
  assert.equal(next.approvedBy, 'operator-09');
  assert.deepEqual(req, before, '원본은 변형되지 않아야 함(immutability)');
});

test('approveRequest: approved 는 terminal — 중복 승인 시 원본 그대로 반환', () => {
  const req = find('RTN-1003'); // approved
  const next = approveRequest(req, { at: '2026-07-18T10:00:00+09:00', by: 'operator-09' });
  assert.equal(next, req, '전이 없음(동일 참조 반환)');
  assert.equal(next.approvedBy, 'operator-02', '기존 처리자 유지');
});

test('holdRequest: pending → held(사유 저장), 사유 공백이면 전이 차단', () => {
  const req = find('RTN-1001');
  const blocked = holdRequest(req, '   ');
  assert.equal(blocked, req, '공백 사유는 전이하지 않고 원본 반환');

  const next = holdRequest(req, '  추가 검수 필요  ');
  assert.equal(next.status, 'held');
  assert.equal(next.holdReason, '추가 검수 필요', 'trim 후 저장');
  assert.equal(req.status, 'pending', '원본 불변');
});

test('holdRequest: approved(terminal) 은 보류로 전이하지 않음', () => {
  const req = find('RTN-1003');
  const next = holdRequest(req, '되돌리기 시도');
  assert.equal(next, req);
});

test('releaseHoldRequest: held → pending, holdReason null 로 초기화', () => {
  const req = find('RTN-1004'); // held
  const next = releaseHoldRequest(req);
  assert.equal(next.status, 'pending');
  assert.equal(next.holdReason, null);
  assert.equal(req.status, 'held', '원본 불변');
});

test('releaseHoldRequest: held 아니면 전이 없음', () => {
  const pendingReq = find('RTN-1001');
  assert.equal(releaseHoldRequest(pendingReq), pendingReq);
});

test('held → approved 재검토 시 holdReason 이력 유지', () => {
  const req = find('RTN-1004'); // held, holdReason 존재
  const next = approveRequest(req, { at: '2026-07-18T11:00:00+09:00', by: 'operator-09' });
  assert.equal(next.status, 'approved');
  assert.equal(next.holdReason, req.holdReason, 'held 사유는 이력용으로 유지');
});

test('mergeOverlay: 오버레이가 있는 항목만 덮어쓰고 base 는 불변', () => {
  const overlay = {
    'RTN-1001': { status: 'approved', approvedAt: '2026-07-18T10:00:00+09:00', approvedBy: 'operator-09' },
  };
  const merged = mergeOverlay(RETURN_REQUESTS, overlay);
  const m1 = merged.find((r) => r.id === 'RTN-1001');
  assert.equal(m1.status, 'approved');
  assert.equal(m1.approvedBy, 'operator-09');
  // base 원본 불변
  assert.equal(find('RTN-1001').status, 'pending');
  // 오버레이 없는 항목은 값 동일(복제본)
  const m2 = merged.find((r) => r.id === 'RTN-1002');
  assert.deepEqual(m2, { ...find('RTN-1002') });
});

test('mergeOverlay: 빈/누락 오버레이도 안전하게 전체 복제 반환', () => {
  assert.equal(mergeOverlay(RETURN_REQUESTS, {}).length, 12);
  assert.equal(mergeOverlay(RETURN_REQUESTS, undefined).length, 12);
});

test('toOverlayEntry: 전이 결과에서 status/holdReason/approvedAt/approvedBy 만 추출', () => {
  const req = find('RTN-1001');
  const approved = approveRequest(req, { at: '2026-07-18T10:00:00+09:00', by: 'operator-09' });
  const entry = toOverlayEntry(approved);
  assert.deepEqual(Object.keys(entry).sort(), ['approvedAt', 'approvedBy', 'holdReason', 'status'].sort());
  assert.equal(entry.status, 'approved');
  assert.equal(entry.approvedBy, 'operator-09');
});

test('filterByStatus: all/pending/approved/held 각각 정확히 필터', () => {
  assert.equal(filterByStatus(RETURN_REQUESTS, 'all').length, 12);
  assert.equal(filterByStatus(RETURN_REQUESTS, 'pending').length, 5);
  assert.equal(filterByStatus(RETURN_REQUESTS, 'approved').length, 4);
  assert.equal(filterByStatus(RETURN_REQUESTS, 'held').length, 3);
  assert.ok(filterByStatus(RETURN_REQUESTS, 'held').every((r) => r.status === 'held'));
});

test('통합: 승인 전이 후 오버레이 병합 → 필터/카운트가 갱신 결과 반영', () => {
  const target = find('RTN-1001'); // pending
  const approved = approveRequest(target, { at: '2026-07-18T10:00:00+09:00', by: 'operator-09' });
  const overlay = { [target.id]: toOverlayEntry(approved) };
  const merged = mergeOverlay(RETURN_REQUESTS, overlay);
  const counts = computeCounts(merged);
  assert.deepEqual(counts, { all: 12, pending: 4, approved: 5, held: 3 });
  assert.ok(!filterByStatus(merged, 'pending').some((r) => r.id === 'RTN-1001'));
  assert.ok(filterByStatus(merged, 'approved').some((r) => r.id === 'RTN-1001'));
});
