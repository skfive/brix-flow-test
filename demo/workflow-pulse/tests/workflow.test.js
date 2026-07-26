// 워크플로 펄스 — 상태 전이 순수 로직 단위 테스트 (BF-1209)
// 기획 §2.3 전이 테이블 + §5 시드 + §7 엣지 케이스 검증.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WORKFLOW_STATES,
  STATE_META,
  createInitialWorkflowItems,
  transitionWorkflowItem,
  applyAction,
  countByState,
} from '../../../src/demo/workflow-pulse/workflow.js';

test('WORKFLOW_STATES: 6단계 순서 고정 (§2.1)', () => {
  assert.deepEqual(WORKFLOW_STATES, [
    'requested', 'planning', 'in_development', 'in_review', 'testing', 'done',
  ]);
});

test('createInitialWorkflowItems: §5 시드 8개, 6개 상태 모두 ≥1개', () => {
  const items = createInitialWorkflowItems();
  assert.equal(items.length, 8);
  const counts = countByState(items);
  for (const state of WORKFLOW_STATES) {
    assert.ok(counts[state] >= 1, `${state} 상태 항목이 최소 1개 존재해야 함`);
  }
});

test('createInitialWorkflowItems: 결정론적 — 매 호출 동일 결과, 독립 복사본', () => {
  const a = createInitialWorkflowItems();
  const b = createInitialWorkflowItems();
  assert.deepEqual(a, b);
  assert.notEqual(a, b);
  assert.notEqual(a[0], b[0]);
  // 변형이 다음 호출에 누출되지 않음
  a[0].state = 'done';
  assert.equal(createInitialWorkflowItems()[0].state, 'requested');
});

test('createInitialWorkflowItems: history 는 [초기 state] 하나로 시작', () => {
  for (const item of createInitialWorkflowItems()) {
    assert.deepEqual(item.history, [item.state]);
  }
});

test('시드 항목의 id/title/assignee/state 가 §5 표와 정확히 일치', () => {
  const items = createInitialWorkflowItems();
  assert.deepEqual(items.map((i) => i.id), ['wf-1', 'wf-2', 'wf-3', 'wf-4', 'wf-5', 'wf-6', 'wf-7', 'wf-8']);
  assert.equal(items[0].title, '로그인 실패 알림 문구 개선 요청');
  assert.equal(items[0].assignee, '박기획');
  assert.equal(items[7].state, 'done');
});

// §2.3 유효 전이 6개
const VALID = [
  ['requested', 'ADVANCE', 'planning'],
  ['planning', 'ADVANCE', 'in_development'],
  ['in_development', 'ADVANCE', 'in_review'],
  ['in_review', 'ADVANCE', 'testing'],
  ['in_review', 'REJECT', 'in_development'],
  ['testing', 'ADVANCE', 'done'],
];

for (const [from, action, to] of VALID) {
  test(`transition: ${from} --(${action})--> ${to}`, () => {
    const item = { id: 'x', title: 't', assignee: 'a', state: from, history: [from] };
    const next = transitionWorkflowItem(item, action);
    assert.equal(next.state, to);
    assert.deepEqual(next.history, [from, to]);
    // 순수성: 원본 불변
    assert.equal(item.state, from);
    assert.deepEqual(item.history, [from]);
  });
}

test('transition: done 은 터미널 — ADVANCE/REJECT 모두 no-op (§7)', () => {
  const item = { id: 'x', title: 't', assignee: 'a', state: 'done', history: ['done'] };
  assert.equal(transitionWorkflowItem(item, 'ADVANCE'), item);
  assert.equal(transitionWorkflowItem(item, 'REJECT'), item);
});

test('transition: in_review 이외 상태의 REJECT 는 no-op (§7)', () => {
  for (const state of ['requested', 'planning', 'in_development', 'testing', 'done']) {
    const item = { id: 'x', title: 't', assignee: 'a', state, history: [state] };
    assert.equal(transitionWorkflowItem(item, 'REJECT'), item, `${state}:REJECT 는 no-op`);
  }
});

test('transition: 정의되지 않은/알 수 없는 상태는 no-op (폴백 추정 금지)', () => {
  const bogus = { id: 'x', title: 't', assignee: 'a', state: 'archived', history: ['archived'] };
  assert.equal(transitionWorkflowItem(bogus, 'ADVANCE'), bogus);
});

test('transition: 임의 스킵 금지 — requested 는 ADVANCE 로 한 단계(planning)만', () => {
  const item = { id: 'x', title: 't', assignee: 'a', state: 'requested', history: ['requested'] };
  const next = transitionWorkflowItem(item, 'ADVANCE');
  assert.equal(next.state, 'planning');
  assert.notEqual(next.state, 'testing');
});

test('applyAction: 지정 id 만 전이, 다른 항목 불변 (§3 시나리오2)', () => {
  const items = createInitialWorkflowItems();
  const next = applyAction(items, 'wf-3', 'ADVANCE'); // planning → in_development
  const moved = next.find((i) => i.id === 'wf-3');
  assert.equal(moved.state, 'in_development');
  // 다른 항목은 참조까지 그대로
  for (const item of items) {
    if (item.id !== 'wf-3') assert.equal(next.find((i) => i.id === item.id), item);
  }
});

test('applyAction: 존재하지 않는 id 는 전체 변경 없음 (§7)', () => {
  const items = createInitialWorkflowItems();
  const next = applyAction(items, 'nope', 'ADVANCE');
  assert.deepEqual(next, items);
});

test('applyAction: in_review 반려 → in_development 로 되돌림 (§3 시나리오3)', () => {
  const items = createInitialWorkflowItems();
  const next = applyAction(items, 'wf-6', 'REJECT');
  assert.equal(next.find((i) => i.id === 'wf-6').state, 'in_development');
});

test('연타 방어: 매 클릭 현재 상태 기준 한 단계씩만 전진 (§7)', () => {
  let item = { id: 'x', title: 't', assignee: 'a', state: 'requested', history: ['requested'] };
  item = transitionWorkflowItem(item, 'ADVANCE');
  item = transitionWorkflowItem(item, 'ADVANCE');
  item = transitionWorkflowItem(item, 'ADVANCE');
  assert.equal(item.state, 'in_review');
  assert.deepEqual(item.history, ['requested', 'planning', 'in_development', 'in_review']);
});

test('STATE_META: 상태별 버튼 노출 규칙이 §6.1 과 일치', () => {
  assert.deepEqual(STATE_META.requested.buttons.map((b) => b.label), ['기획 시작']);
  assert.deepEqual(STATE_META.planning.buttons.map((b) => b.label), ['구현 시작']);
  assert.deepEqual(STATE_META.in_development.buttons.map((b) => b.label), ['리뷰 요청']);
  assert.deepEqual(STATE_META.in_review.buttons.map((b) => b.action), ['ADVANCE', 'REJECT']);
  assert.deepEqual(STATE_META.testing.buttons.map((b) => b.label), ['테스트 완료']);
  assert.deepEqual(STATE_META.done.buttons, []);
});

test('STATE_META: 활성(pulse 후보) 상태는 planning/in_development/in_review/testing (§2.3)', () => {
  assert.equal(STATE_META.requested.active, false);
  assert.equal(STATE_META.planning.active, true);
  assert.equal(STATE_META.in_development.active, true);
  assert.equal(STATE_META.in_review.active, true);
  assert.equal(STATE_META.testing.active, true);
  assert.equal(STATE_META.done.active, false);
});

test('countByState: 초기 시드 분포 (§8 커버리지)', () => {
  const counts = countByState(createInitialWorkflowItems());
  assert.deepEqual(counts, {
    requested: 2, planning: 1, in_development: 2, in_review: 1, testing: 1, done: 1,
  });
});
