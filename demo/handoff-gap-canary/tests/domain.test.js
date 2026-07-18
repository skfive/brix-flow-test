import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HANDOFF_FIXTURE, REFERENCE_NOW } from '../fixtures.js';
import {
  getMissingFields,
  hasDataGap,
  hasDeadlineExceeded,
  riskLevelOf,
  isDueAtValid,
  isStatusValid,
  computeItems,
  summarize,
  filterItems,
} from '../domain.js';

const byId = (id) => HANDOFF_FIXTURE.find((i) => i.id === id);

test('referenceNow 는 고정 상수 (결정론적 fixture)', () => {
  assert.equal(REFERENCE_NOW, '2026-07-18T09:00:00+09:00');
});

test('fixture 는 8건이고 표시 순서는 정의 순서', () => {
  assert.equal(HANDOFF_FIXTURE.length, 8);
  assert.deepEqual(
    HANDOFF_FIXTURE.map((i) => i.id),
    ['HO-2001', 'HO-2002', 'HO-2003', 'HO-2004', 'HO-2005', 'HO-2006', 'HO-2007', 'HO-2008'],
  );
});

// AC-U2: 필수값 누락 판정
test('getMissingFields — 빈/공백/null/비유효 status/파싱불가 dueAt 를 누락 처리', () => {
  assert.deepEqual(getMissingFields(byId('HO-2002')).sort(), ['assignee']); // 담당자 ""
  assert.deepEqual(getMissingFields(byId('HO-2003')).sort(), ['dueAt']); // 기한 null
  assert.deepEqual(getMissingFields(byId('HO-2004')).sort(), ['status']); // status "" 비유효
  assert.deepEqual(getMissingFields(byId('HO-2007')).sort(), ['followUpAction']); // 후속 ""
  assert.deepEqual(getMissingFields(byId('HO-2008')).sort(), ['assignee', 'followUpAction']);
  assert.deepEqual(getMissingFields(byId('HO-2005')), []); // 정상
});

test('공백만 있는 문자열도 누락', () => {
  assert.equal(hasDataGap({ assignee: '   ', dueAt: REFERENCE_NOW, status: 'pending', followUpAction: 'x' }), true);
});

test('isDueAtValid — 파싱 불가는 누락(false)', () => {
  assert.equal(isDueAtValid('2026-07-18T08:00:00+09:00'), true);
  assert.equal(isDueAtValid(null), false);
  assert.equal(isDueAtValid(''), false);
  assert.equal(isDueAtValid('not-a-date'), false);
});

test('isStatusValid — 3종만 유효', () => {
  assert.equal(isStatusValid('pending'), true);
  assert.equal(isStatusValid('in_progress'), true);
  assert.equal(isStatusValid('done'), true);
  assert.equal(isStatusValid(''), false);
  assert.equal(isStatusValid('archived'), false);
  assert.equal(isStatusValid(null), false);
});

// AC-U3: 기한 초과 규칙
test('hasDeadlineExceeded — 과거 기한 + 미완료만 true', () => {
  assert.equal(hasDeadlineExceeded(byId('HO-2001')), true); // 과거·in_progress
  assert.equal(hasDeadlineExceeded(byId('HO-2004')), true); // 과거·status 누락(=done아님)
  assert.equal(hasDeadlineExceeded(byId('HO-2008')), true); // 과거·pending
});

test('hasDeadlineExceeded — done 과거 기한은 제외', () => {
  assert.equal(hasDeadlineExceeded(byId('HO-2006')), false); // 과거지만 done
});

test('hasDeadlineExceeded — 미래 기한/누락 기한은 false', () => {
  assert.equal(hasDeadlineExceeded(byId('HO-2005')), false); // 미래
  assert.equal(hasDeadlineExceeded(byId('HO-2003')), false); // dueAt 누락 → false 고정
});

// AC-U1 ~ AC-U3: 위험 등급 우선순위
test('riskLevelOf — fixture 8건 기대 등급', () => {
  const expected = {
    'HO-2001': 'deadline_exceeded',
    'HO-2002': 'data_gap',
    'HO-2003': 'data_gap',
    'HO-2004': 'critical',
    'HO-2005': 'normal',
    'HO-2006': 'normal',
    'HO-2007': 'data_gap',
    'HO-2008': 'critical',
  };
  for (const [id, level] of Object.entries(expected)) {
    assert.equal(riskLevelOf(byId(id)), level, `${id} 기대 등급 ${level}`);
  }
});

test('riskLevelOf — 누락+기한초과 동시 성립 시 critical 최우선', () => {
  const item = { assignee: '', dueAt: '2026-07-01T00:00:00+09:00', status: 'pending', followUpAction: 'x' };
  assert.equal(riskLevelOf(item), 'critical');
});

// AC-U1/AC-U4: 위험 요약 집계 (전체 기준)
test('summarize — 전체 fixture 집계', () => {
  const computed = computeItems(HANDOFF_FIXTURE);
  assert.deepEqual(summarize(computed), {
    normal: 2,
    data_gap: 3,
    deadline_exceeded: 1,
    critical: 2,
    total: 8,
  });
});

// AC-U4: 필터
test('filterItems — 등급별 부분집합, 순서 유지', () => {
  const computed = computeItems(HANDOFF_FIXTURE);
  assert.equal(filterItems(computed, 'all').length, 8);
  assert.deepEqual(filterItems(computed, 'critical').map((i) => i.id), ['HO-2004', 'HO-2008']);
  assert.deepEqual(filterItems(computed, 'data_gap').map((i) => i.id), ['HO-2002', 'HO-2003', 'HO-2007']);
  assert.deepEqual(filterItems(computed, 'deadline_exceeded').map((i) => i.id), ['HO-2001']);
});

test('filterItems — 위험 요약은 필터와 무관하게 전체 기준 불변', () => {
  const computed = computeItems(HANDOFF_FIXTURE);
  const summaryBefore = summarize(computed);
  filterItems(computed, 'critical'); // 필터는 요약 배열을 바꾸지 않음
  assert.deepEqual(summarize(computed), summaryBefore);
});

// AC-U5: 로컬 보완 재계산
test('computeItems — HO-2007 후속 액션 보완 시 normal 전환 + 요약 델타', () => {
  const before = computeItems(HANDOFF_FIXTURE);
  assert.equal(before.find((i) => i.id === 'HO-2007').riskLevel, 'data_gap');
  assert.deepEqual(summarize(before), { normal: 2, data_gap: 3, deadline_exceeded: 1, critical: 2, total: 8 });

  const overrides = {
    'HO-2007': { followUpAction: '창고 재고 태그 부착 완료, 익일 재검수', savedAt: '2026-07-18T10:00:00+09:00' },
  };
  const after = computeItems(HANDOFF_FIXTURE, overrides);
  const item = after.find((i) => i.id === 'HO-2007');
  assert.equal(item.riskLevel, 'normal');
  assert.equal(item.isOverridden, true);
  assert.deepEqual(summarize(after), { normal: 3, data_gap: 2, deadline_exceeded: 1, critical: 2, total: 8 });
});

test('computeItems — 다른 3필드 누락 항목은 후속 액션 보완으로 위험 해소 불가', () => {
  // HO-2008 은 담당자도 누락 → 후속 액션 보완해도 data_gap/critical 유지
  const overrides = { 'HO-2008': { followUpAction: '보완 텍스트', savedAt: '2026-07-18T10:00:00+09:00' } };
  const after = computeItems(HANDOFF_FIXTURE, overrides);
  const item = after.find((i) => i.id === 'HO-2008');
  assert.equal(item.hasDataGap, true);
  assert.equal(item.riskLevel, 'critical'); // 담당자 누락 + 기한 초과 유지
});
