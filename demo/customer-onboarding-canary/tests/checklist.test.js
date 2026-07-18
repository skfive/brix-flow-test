// BF-1069 고객 온보딩 체크리스트 — 순수 로직 결정적 단위 테스트.
// 기획 명세 BF-1067 §4.2의 4개 고객 기대 판정값을 그대로 검증한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  READINESS,
  buildItems,
  computeReadiness,
  computeProgress,
  computeNextAction,
  getCustomerChecklistView,
  applyLocalCompletion,
  resolveDemoCustomerId,
} from '../../../src/demo/customer-onboarding-canary/checklist.js';

const fixtures = JSON.parse(
  readFileSync(
    new URL('../../../src/demo/customer-onboarding-canary/fixtures.json', import.meta.url),
    'utf8',
  ),
);
const { checklistCatalog, customers } = fixtures;

const viewOf = (id) => getCustomerChecklistView(id, checklistCatalog, customers);

test('fixture 스키마: catalog 6개 항목·고객 4명이 모두 로드된다', () => {
  assert.equal(checklistCatalog.length, 6);
  assert.equal(customers.length, 4);
  // 모든 고객 항목의 itemId는 catalog와 1:1 매칭된다.
  const catalogIds = new Set(checklistCatalog.map((c) => c.itemId));
  for (const cust of customers) {
    for (const entry of cust.checklist) {
      assert.ok(catalogIds.has(entry.itemId), `미정의 itemId: ${entry.itemId}`);
    }
  }
});

test('cust-001 → in_progress (필수 5개 중 2개 완료, blocked 없음)', () => {
  const v = viewOf('cust-001');
  assert.equal(v.readinessStatus, READINESS.IN_PROGRESS);
  assert.deepEqual(v.progress, {
    requiredCompleted: 2,
    requiredTotal: 4,
    optionalCompleted: 0,
    optionalTotal: 2,
  });
  // 다음 액션: 미완료 필수 중 우선순위 최상위 = payment_method(priority 3)
  assert.equal(v.nextAction.type, 'complete_item');
  assert.equal(v.nextAction.itemId, 'payment_method');
});

test('cust-002 → blocked (payment_method blocked; blocked 최우선 판정)', () => {
  const v = viewOf('cust-002');
  assert.equal(v.readinessStatus, READINESS.BLOCKED);
  assert.equal(v.nextAction.type, 'resolve_block');
  assert.equal(v.nextAction.itemId, 'payment_method');
  assert.equal(v.nextAction.message, '카드 인증 실패 — 고객센터 확인 필요');
  const blockedItem = v.items.find((i) => i.itemId === 'payment_method');
  assert.equal(blockedItem.blockedReason, '카드 인증 실패 — 고객센터 확인 필요');
});

test('cust-003 → ready (필수 전부 complete; 선택 미완료 무관)', () => {
  const v = viewOf('cust-003');
  assert.equal(v.readinessStatus, READINESS.READY);
  assert.equal(v.nextAction.type, 'completed');
  // 선택 항목: team_invite complete, security_2fa incomplete
  assert.deepEqual(v.progress, {
    requiredCompleted: 4,
    requiredTotal: 4,
    optionalCompleted: 1,
    optionalTotal: 2,
  });
});

test('cust-004 → not_started (필수 완료 0개)', () => {
  const v = viewOf('cust-004');
  assert.equal(v.readinessStatus, READINESS.NOT_STARTED);
  // 다음 액션: 미완료 필수 중 우선순위 최상위 = email_verification(priority 1)
  assert.equal(v.nextAction.type, 'complete_item');
  assert.equal(v.nextAction.itemId, 'email_verification');
});

test('존재하지 않는 customerId → null (고객 정보를 찾을 수 없음)', () => {
  assert.equal(viewOf('does-not-exist'), null);
});

test('§3.2 fallback: requiredItems가 비면 not_started + next_action not_ready', () => {
  const emptyRequiredCatalog = checklistCatalog.map((c) => ({ ...c, required: false }));
  const items = buildItems(emptyRequiredCatalog, customers[3]);
  const readiness = computeReadiness(items);
  assert.equal(readiness, READINESS.NOT_STARTED);
  assert.equal(computeNextAction(items, readiness).type, 'not_ready');
});

test('진행률: 선택 항목은 ready 판정에 영향을 주지 않는다', () => {
  const v = viewOf('cust-003');
  // security_2fa(선택) 미완료지만 readiness는 ready 유지
  const optional2fa = v.items.find((i) => i.itemId === 'security_2fa');
  assert.equal(optional2fa.status, 'incomplete');
  assert.equal(v.readinessStatus, READINESS.READY);
});

test('applyLocalCompletion: 미완료 항목을 로컬 완료 처리(불변) 후 재판정', () => {
  const before = customers.find((c) => c.customerId === 'cust-001');
  const after = applyLocalCompletion(before, 'payment_method', '2026-07-18T00:00:00Z');
  // 원본 불변
  assert.equal(
    before.checklist.find((e) => e.itemId === 'payment_method').status,
    'incomplete',
  );
  const view = getCustomerChecklistView('cust-001', checklistCatalog, [after, ...customers]);
  const item = view.items.find((i) => i.itemId === 'payment_method');
  assert.equal(item.status, 'complete');
  assert.equal(item.completedAt, '2026-07-18T00:00:00Z');
  assert.equal(view.progress.requiredCompleted, 3);
});

test('applyLocalCompletion: blocked 항목은 완료 처리되지 않는다', () => {
  const before = customers.find((c) => c.customerId === 'cust-002');
  const after = applyLocalCompletion(before, 'payment_method', '2026-07-18T00:00:00Z');
  const entry = after.checklist.find((e) => e.itemId === 'payment_method');
  assert.equal(entry.status, 'blocked');
});

test('resolveDemoCustomerId: 데모 세션 가드(선택 고객 확정/미존재 차단)', () => {
  assert.equal(resolveDemoCustomerId('cust-002', customers), 'cust-002');
  assert.equal(resolveDemoCustomerId(null, customers), 'cust-001'); // 기본 선택
  assert.equal(resolveDemoCustomerId('cust-999', customers), null); // 미존재 → 가드
});
