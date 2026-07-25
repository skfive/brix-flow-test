// BF-1185 — 리뷰 head 전환 타임라인 로직 단위 테스트
// 실행: node --test demo/review-head-timeline/tests/*.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATE_META,
  STEP_STATUS_META,
  statusPhrase,
  judgeState,
  formatRelative,
  buildTimeline,
  computeSegments,
  buildTransitionSteps,
  moveSelection,
  SAMPLE_GENERATIONS,
  REFERENCE_NOW,
} from '../timeline.js';

const NOW = Date.parse(REFERENCE_NOW);

test('statusPhrase: 상태 3종 고정 문구(명세 §1)', () => {
  assert.equal(statusPhrase('same'), '직전 세대와 동일 — 재검토 불필요');
  assert.equal(statusPhrase('new'), '새 head로 전환됨 — 새 세대 시작');
  assert.equal(statusPhrase('review'), 'head 전환 + 미해결 존재 — 사람 확인 필요');
});

test('STATE_META: 색맹 접근성용 아이콘+라벨 3중 코드', () => {
  assert.deepEqual(STATE_META.same, { icon: '✓', label: '동일 세대' });
  assert.deepEqual(STATE_META.new, { icon: '↑', label: '새 세대' });
  assert.deepEqual(STATE_META.review, { icon: '⚠', label: '검토 필요' });
});

test('judgeState: origin 은 새 세대', () => {
  assert.equal(judgeState({ sha: 'x', unresolvedThreads: 0 }, null), 'new');
});

test('judgeState: 직전과 SHA 동일 → same', () => {
  assert.equal(judgeState({ sha: 'aaa', unresolvedThreads: 0 }, { sha: 'aaa' }), 'same');
});

test('judgeState: SHA 변경 + 미해결 없음 → new', () => {
  assert.equal(judgeState({ sha: 'bbb', unresolvedThreads: 0 }, { sha: 'aaa' }), 'new');
});

test('judgeState: SHA 변경 + 미해결 존재 → review', () => {
  assert.equal(judgeState({ sha: 'bbb', unresolvedThreads: 3 }, { sha: 'aaa' }), 'review');
});

test('formatRelative: 버킷 경계', () => {
  assert.equal(formatRelative(0), '방금 전');
  assert.equal(formatRelative(20 * 1000), '방금 전'); // 0.33분 → 반올림 0
  assert.equal(formatRelative(5 * 60000), '5분 전');
  assert.equal(formatRelative(59 * 60000), '59분 전');
  assert.equal(formatRelative(90 * 60000), '2시간 전'); // 1.5시간 반올림
});

test('buildTimeline: 샘플 세대 상태가 same/new/review 를 모두 커버', () => {
  const nodes = buildTimeline(SAMPLE_GENERATIONS, NOW);
  assert.equal(nodes.length, 4);
  assert.equal(nodes[0].state, 'new'); // G0 origin
  assert.equal(nodes[1].state, 'new'); // G1 새 head
  assert.equal(nodes[2].state, 'same'); // G2 동일 SHA
  assert.equal(nodes[3].state, 'review'); // G3 미해결 존재
});

test('buildTimeline: shortSha 7자, isHead 는 마지막만 true', () => {
  const nodes = buildTimeline(SAMPLE_GENERATIONS, NOW);
  for (const n of nodes) {
    assert.equal(n.shortSha.length, 7);
    assert.ok(n.sha.startsWith(n.shortSha));
  }
  assert.equal(nodes[0].isHead, false);
  assert.equal(nodes[3].isHead, true);
});

test('buildTimeline: 결정론 — 같은 입력이면 동일 relative 문구', () => {
  const a = buildTimeline(SAMPLE_GENERATIONS, NOW);
  const b = buildTimeline(SAMPLE_GENERATIONS, NOW);
  assert.deepEqual(a.map((n) => n.relative), b.map((n) => n.relative));
  assert.equal(a[3].relative, '7분 전');
});

test('computeSegments: 세그먼트 수 = 노드-1, 변경 지점만 강조', () => {
  const nodes = buildTimeline(SAMPLE_GENERATIONS, NOW);
  const segs = computeSegments(nodes);
  assert.equal(segs.length, 3);
  assert.equal(segs[0].changeState, 'new'); // G0→G1
  assert.equal(segs[1].changeState, null); // G1→G2 same
  assert.equal(segs[2].changeState, 'review'); // G2→G3
});

test('buildTransitionSteps: 4단계 · 순번·키 순서', () => {
  const nodes = buildTimeline(SAMPLE_GENERATIONS, NOW);
  const steps = buildTransitionSteps(nodes[1], nodes[0]);
  assert.equal(steps.length, 4);
  assert.deepEqual(
    steps.map((s) => s.stepKey),
    ['detected', 'diffed', 'judged', 'applied'],
  );
  assert.deepEqual(steps.map((s) => s.index), [1, 2, 3, 4]);
});

test('buildTransitionSteps: new 전환 → 전 단계 done', () => {
  const nodes = buildTimeline(SAMPLE_GENERATIONS, NOW);
  const steps = buildTransitionSteps(nodes[1], nodes[0]);
  assert.ok(steps.every((s) => s.status === 'done'));
  assert.equal(steps[3].detail, '새 세대 반영');
});

test('buildTransitionSteps: review 전환 → 반영 단계 blocked', () => {
  const nodes = buildTimeline(SAMPLE_GENERATIONS, NOW);
  const steps = buildTransitionSteps(nodes[3], nodes[2]);
  assert.equal(steps[3].status, 'blocked');
  assert.equal(steps[3].detail, '사람 확인 대기');
  assert.equal(steps[2].detail, STATE_META.review.label);
});

test('buildTransitionSteps: same 전환 → 반영 단계 세대 유지', () => {
  const nodes = buildTimeline(SAMPLE_GENERATIONS, NOW);
  const steps = buildTransitionSteps(nodes[2], nodes[1]);
  assert.equal(steps[3].status, 'done');
  assert.equal(steps[3].detail, '세대 유지');
});

test('buildTransitionSteps: 기준 세대(prev 없음) → 전 단계 pending', () => {
  const nodes = buildTimeline(SAMPLE_GENERATIONS, NOW);
  const steps = buildTransitionSteps(nodes[0], null);
  assert.ok(steps.every((s) => s.status === 'pending'));
  assert.equal(steps[0].detail, '기준 세대 — 이전 head 없음');
});

test('STEP_STATUS_META: 4종 상태 아이콘', () => {
  assert.equal(STEP_STATUS_META.done.icon, '✓');
  assert.equal(STEP_STATUS_META.current.icon, '●');
  assert.equal(STEP_STATUS_META.blocked.icon, '⚠');
  assert.equal(STEP_STATUS_META.pending.icon, '○');
});

test('moveSelection: 화살표/Home/End 이동과 경계 클램프', () => {
  const len = 4;
  assert.equal(moveSelection(0, 'ArrowRight', len), 1);
  assert.equal(moveSelection(0, 'ArrowDown', len), 1);
  assert.equal(moveSelection(3, 'ArrowRight', len), 3); // 끝에서 클램프
  assert.equal(moveSelection(2, 'ArrowLeft', len), 1);
  assert.equal(moveSelection(2, 'ArrowUp', len), 1);
  assert.equal(moveSelection(0, 'ArrowLeft', len), 0); // 시작에서 클램프
  assert.equal(moveSelection(2, 'Home', len), 0);
  assert.equal(moveSelection(1, 'End', len), 3);
  assert.equal(moveSelection(2, 'Escape', len), 2); // 무관 키 → 유지
});
