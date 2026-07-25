// BF-1180 · 리뷰 head 전환 타임라인 — 순수 판정/타임라인 로직 focused 테스트
// 저장소 규약: vanilla-static / ESM / node --test. 외부 의존성 0건.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STATE_META,
  isValidSha,
  shortSha,
  judgeGeneration,
  statusPhrase,
  relativeTime,
  buildTimeline,
  computeSegments,
  moveSelection,
  SAMPLE_GENERATIONS,
  REFERENCE_NOW,
} from '../timeline.js';

const SHA_A = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const SHA_B = '9f8e7d6c5b4a39281706f5e4d3c2b1a098765432';
const NOW = Date.parse(REFERENCE_NOW);

// ---- 상태 판정 (AC2: head 전환 상태 판정 결정론) ----

test('judgeGeneration: 이전==현재 SHA → same (미해결 있어도 동일 세대)', () => {
  assert.equal(judgeGeneration({ prevHeadSha: SHA_A, currHeadSha: SHA_A }), 'same');
  assert.equal(
    judgeGeneration({ prevHeadSha: SHA_A, currHeadSha: SHA_A, unresolvedThreads: 5, hasConflict: true }),
    'same',
  );
});

test('judgeGeneration: SHA 변경 + 신호 없음 → new / 신호 존재 → review', () => {
  assert.equal(judgeGeneration({ prevHeadSha: SHA_A, currHeadSha: SHA_B }), 'new');
  assert.equal(judgeGeneration({ prevHeadSha: SHA_A, currHeadSha: SHA_B, unresolvedThreads: 1 }), 'review');
  assert.equal(judgeGeneration({ prevHeadSha: SHA_A, currHeadSha: SHA_B, hasConflict: true }), 'review');
  assert.equal(judgeGeneration({ prevHeadSha: SHA_A, currHeadSha: SHA_B, isStale: true }), 'review');
});

test('judgeGeneration: 결정론적 — 동일 입력 10회 동일 출력', () => {
  const input = { prevHeadSha: SHA_A, currHeadSha: SHA_B, unresolvedThreads: 2 };
  const first = judgeGeneration(input);
  for (let i = 0; i < 10; i += 1) assert.equal(judgeGeneration(input), first);
});

test('judgeGeneration: 잘못된 입력 → 예외', () => {
  assert.throws(() => judgeGeneration({ prevHeadSha: '', currHeadSha: SHA_B }));
  assert.throws(() => judgeGeneration({ prevHeadSha: SHA_A }));
  assert.throws(() => judgeGeneration(null));
});

// ---- SHA 표현 ----

test('shortSha: 7자 축약, 공백 제거', () => {
  assert.equal(shortSha(SHA_A), 'a1b2c3d');
  assert.equal(shortSha('  ' + SHA_B + ' '), '9f8e7d6');
  assert.equal(shortSha('abcd'), 'abcd', '7자 이하는 원본 유지');
});

test('isValidSha: hex 4~40자만 허용', () => {
  assert.equal(isValidSha(SHA_A), true);
  assert.equal(isValidSha('a1b2'), true);
  assert.equal(isValidSha('xyz'), false);
  assert.equal(isValidSha('abc'), false, '4자 미만 거부');
  assert.equal(isValidSha(''), false);
});

// ---- 상태 메타/문구 (배지·aria-live 3중 표기) ----

test('STATE_META: 3종 모두 label/icon/phrase 보유 + 고정 문구 일치', () => {
  for (const key of ['same', 'new', 'review']) {
    assert.ok(STATE_META[key], `${key} 메타 존재`);
    assert.ok(STATE_META[key].label.length > 0);
    assert.ok(STATE_META[key].icon.length > 0);
  }
  assert.equal(STATE_META.same.icon, '✓');
  assert.equal(STATE_META.new.icon, '↑');
  assert.equal(STATE_META.review.icon, '⚠');
});

test('statusPhrase: §1 고정 상태 문구 반환', () => {
  assert.equal(statusPhrase('same'), '직전 세대와 동일 — 재검토 불필요');
  assert.equal(statusPhrase('new'), '새 head로 전환됨 — 새 세대 시작');
  assert.equal(statusPhrase('review'), 'head 전환 + 미해결 존재 — 사람 확인 필요');
  assert.throws(() => statusPhrase('bogus'));
});

// ---- 상대 시각 (결정론) ----

test('relativeTime: nowMs 기준 결정론적 한국어', () => {
  const base = Date.parse('2026-07-25T12:00:00Z');
  assert.equal(relativeTime('2026-07-25T12:00:00Z', base), '방금');
  assert.equal(relativeTime('2026-07-25T11:30:00Z', base), '30분 전');
  assert.equal(relativeTime('2026-07-25T10:00:00Z', base), '2시간 전');
  assert.equal(relativeTime('2026-07-23T12:00:00Z', base), '2일 전');
  assert.equal(relativeTime('not-a-date', base), '');
});

// ---- 타임라인 구성 (AC1: 로컬 상태 기반 데이터 준비 / AC2: 세대 순서·검토 위치) ----

test('buildTimeline: 세대 순서·상태·head 여부를 결정론적으로 계산', () => {
  const nodes = buildTimeline(SAMPLE_GENERATIONS, NOW);
  assert.equal(nodes.length, 4);
  // 세대 인덱스 오름차순 G0..G3
  assert.deepEqual(nodes.map((n) => n.gen), [0, 1, 2, 3]);
  // 상태: G0 기준선 same, G1 동일 SHA same, G2 새 세대 new, G3 미해결 → review
  assert.deepEqual(nodes.map((n) => n.state), ['same', 'same', 'new', 'review']);
  // head 는 마지막 세대 하나뿐
  assert.deepEqual(nodes.map((n) => n.isHead), [false, false, false, true]);
  assert.equal(nodes[0].isFirst, true);
  // 축약 SHA 7자
  assert.equal(nodes[3].shortSha, '4c5d6e7');
  assert.equal(nodes[3].shortSha.length, 7);
});

test('buildTimeline: 동일 입력 → 동일 출력(결정론)', () => {
  const a = buildTimeline(SAMPLE_GENERATIONS, NOW);
  const b = buildTimeline(SAMPLE_GENERATIONS, NOW);
  assert.deepEqual(a, b);
});

test('buildTimeline: 빈/무효 입력 → 예외', () => {
  assert.throws(() => buildTimeline([], NOW));
  assert.throws(() => buildTimeline(null, NOW));
  assert.throws(() => buildTimeline([{ sha: 'zzzz', timestamp: REFERENCE_NOW }], NOW));
});

test('computeSegments: SHA 변경 구간만 changeState 강조', () => {
  const nodes = buildTimeline(SAMPLE_GENERATIONS, NOW);
  const segs = computeSegments(nodes);
  assert.equal(segs.length, 3);
  // G0→G1 동일 SHA → 변경 없음
  assert.equal(segs[0].changed, false);
  assert.equal(segs[0].changeState, null);
  // G1→G2 새 세대
  assert.equal(segs[1].changed, true);
  assert.equal(segs[1].changeState, 'new');
  // G2→G3 검토 필요
  assert.equal(segs[2].changed, true);
  assert.equal(segs[2].changeState, 'review');
});

test('computeSegments: 노드 2개 미만 → 빈 배열', () => {
  assert.deepEqual(computeSegments([]), []);
  assert.deepEqual(computeSegments(buildTimeline([SAMPLE_GENERATIONS[0]], NOW)), []);
});

// ---- 키보드 네비게이션 (AC2: 키보드 head 전환 조작) ----

test('moveSelection: 화살표/Home/End 이동 + 범위 clamp', () => {
  assert.equal(moveSelection(0, 'ArrowRight', 4), 1);
  assert.equal(moveSelection(0, 'ArrowDown', 4), 1);
  assert.equal(moveSelection(3, 'ArrowRight', 4), 3, '끝에서 오른쪽 → clamp');
  assert.equal(moveSelection(2, 'ArrowLeft', 4), 1);
  assert.equal(moveSelection(2, 'ArrowUp', 4), 1);
  assert.equal(moveSelection(0, 'ArrowLeft', 4), 0, '처음에서 왼쪽 → clamp');
  assert.equal(moveSelection(2, 'Home', 4), 0);
  assert.equal(moveSelection(1, 'End', 4), 3);
  assert.equal(moveSelection(1, 'Enter', 4), 1, '미처리 키 → no-op');
});

test('moveSelection: total<=0 방어', () => {
  assert.equal(moveSelection(3, 'ArrowRight', 0), 0);
});
