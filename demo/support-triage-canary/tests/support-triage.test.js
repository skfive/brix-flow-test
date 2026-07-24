// 고객 문의 분류 SPA — 단위 테스트 (BF-1150)
// node:test + node:assert (ESM). 순수 로직 모듈만 검증한다(브라우저/DOM 없음).
// 실행: node --test demo/support-triage-canary/tests/*.test.js

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadInquiries,
  ensureAuthorized,
  matchesFilter,
  filterInquiries,
  normalizeFilter,
  countByAxis,
  summarizeStatus,
  UnknownFilterError,
  PRIORITY_KEYS,
  AREA_KEYS,
  STATUS_KEYS,
  DEFAULT_FILTER,
} from '../../../apps/demo/support-triage-canary/triage.js';

// ---- AC1: 라우트 진입 시 정적 fixture 가 모두 로드된다 ----------------------

test('AC1: loadInquiries 가 모든 fixture 를 로드한다', async () => {
  const list = await loadInquiries();
  assert.ok(Array.isArray(list));
  assert.ok(list.length >= 6, 'fixture 는 최소 6건 이상이어야 한다');
  for (const inquiry of list) {
    assert.ok(inquiry.ticketId, 'ticketId 필수');
    assert.ok(inquiry.title, 'title 필수');
    assert.ok(PRIORITY_KEYS.includes(inquiry.priority), `priority 축 유효: ${inquiry.priority}`);
    assert.ok(AREA_KEYS.includes(inquiry.area), `area 축 유효: ${inquiry.area}`);
    assert.ok(STATUS_KEYS.includes(inquiry.status), `status 축 유효: ${inquiry.status}`);
  }
});

test('AC1: loadInquiries 는 fixture 원본을 오염시키지 않는다(복제 반환)', async () => {
  const first = await loadInquiries();
  first[0].title = '변조됨';
  const second = await loadInquiries();
  assert.notEqual(second[0].title, '변조됨', '두 번째 로드는 원본을 유지해야 한다');
});

// ---- AC3: 인증 가드 (필요 시) --------------------------------------------

test('AC3: 기본 진입은 인증 가드를 통과한다', () => {
  assert.equal(ensureAuthorized(), true);
  assert.equal(ensureAuthorized({}), true);
  assert.equal(ensureAuthorized({ __TRIAGE_AUTH__: true }), true);
});

test('AC3: __TRIAGE_AUTH__ === false 일 때만 차단된다', () => {
  assert.equal(ensureAuthorized({ __TRIAGE_AUTH__: false }), false);
});

// ---- AC2: 우선순위·담당 영역 필터 (AND 결합) ------------------------------

test('AC2: 기본 필터(all/all)는 전체를 최신순으로 반환한다', async () => {
  const list = await loadInquiries();
  const result = filterInquiries(list, DEFAULT_FILTER);
  assert.equal(result.length, list.length);
  // 최신순(createdAt 내림차순) 검증
  for (let i = 1; i < result.length; i += 1) {
    assert.ok(result[i - 1].createdAt >= result[i].createdAt, '최신순 정렬이어야 한다');
  }
});

test('AC2: 우선순위 단일 필터 — urgent 만 반환', async () => {
  const list = await loadInquiries();
  const result = filterInquiries(list, { priority: 'urgent', area: 'all' });
  assert.ok(result.length > 0);
  assert.ok(result.every((i) => i.priority === 'urgent'));
});

test('AC2: 담당 영역 단일 필터 — billing 만 반환', async () => {
  const list = await loadInquiries();
  const result = filterInquiries(list, { priority: 'all', area: 'billing' });
  assert.ok(result.length > 0);
  assert.ok(result.every((i) => i.area === 'billing'));
});

test('AC2: 두 축 AND 결합 — urgent + billing', async () => {
  const list = await loadInquiries();
  const result = filterInquiries(list, { priority: 'urgent', area: 'billing' });
  assert.ok(result.every((i) => i.priority === 'urgent' && i.area === 'billing'));
  // fixture 상 INQ-2048 이 urgent+billing
  assert.ok(result.some((i) => i.ticketId === 'INQ-2048'));
});

test('AC2: matchesFilter 단일 판정이 AND 결합을 따른다', () => {
  const inquiry = { priority: 'urgent', area: 'billing' };
  assert.equal(matchesFilter(inquiry, { priority: 'urgent', area: 'billing' }), true);
  assert.equal(matchesFilter(inquiry, { priority: 'urgent', area: 'account' }), false);
  assert.equal(matchesFilter(inquiry, { priority: 'normal', area: 'billing' }), false);
  assert.equal(matchesFilter(inquiry, { priority: 'all', area: 'all' }), true);
});

test('AC2: filterInquiries 는 입력 배열을 변경하지 않는다(불변)', async () => {
  const list = await loadInquiries();
  const snapshot = list.map((i) => i.ticketId).join(',');
  filterInquiries(list, { priority: 'urgent', area: 'all' });
  assert.equal(list.map((i) => i.ticketId).join(','), snapshot, '원본 순서 보존');
});

test('AC2: 잘못된 필터 값은 UnknownFilterError 를 던진다', () => {
  assert.throws(() => normalizeFilter({ priority: 'critical', area: 'all' }), UnknownFilterError);
  assert.throws(() => normalizeFilter({ priority: 'all', area: 'unknown' }), UnknownFilterError);
});

// ---- 칩 count / 상태 집계 (배지 노출 근거) --------------------------------

test('countByAxis: priority 축 count 합이 all 과 일치', async () => {
  const list = await loadInquiries();
  const counts = countByAxis(list, 'priority', { priority: 'all', area: 'all' });
  const sum = PRIORITY_KEYS.reduce((acc, k) => acc + counts[k], 0);
  assert.equal(sum, counts.all);
  assert.equal(counts.all, list.length);
});

test('countByAxis: 반대 축 필터가 count 에 반영된다', async () => {
  const list = await loadInquiries();
  const counts = countByAxis(list, 'area', { priority: 'urgent', area: 'all' });
  // urgent 로 스코프된 상태에서 area 별 count 합 == urgent 전체 수
  const urgentTotal = list.filter((i) => i.priority === 'urgent').length;
  const sum = AREA_KEYS.reduce((acc, k) => acc + counts[k], 0);
  assert.equal(sum, urgentTotal);
  assert.equal(counts.all, urgentTotal);
});

test('summarizeStatus: 상태 배지 집계가 총합과 일치', async () => {
  const list = await loadInquiries();
  const summary = summarizeStatus(list);
  assert.equal(summary.new + summary.progress + summary.done, summary.total);
  assert.equal(summary.total, list.length);
});
