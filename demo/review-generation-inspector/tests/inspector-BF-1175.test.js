// BF-1175 · 리뷰 세대 전환 인스펙터 — 순수 판정 로직 focused 테스트
// 저장소 규약: vanilla-static / ESM / node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  judgeGeneration,
  shortSha,
  STATE_META,
  describeState,
  relativeTime,
  isValidSha,
} from '../inspector.js';

const SHA_A = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const SHA_B = '9f8e7d6c5b4a39281706f5e4d3c2b1a098765432';

test('judgeGeneration: 이전==현재 SHA → same (미해결 있어도 동일 세대)', () => {
  assert.equal(judgeGeneration({ prevHeadSha: SHA_A, currHeadSha: SHA_A }), 'same');
  assert.equal(
    judgeGeneration({ prevHeadSha: SHA_A, currHeadSha: SHA_A, unresolvedThreads: 5, hasConflict: true }),
    'same',
    '동일 SHA면 미해결/충돌이 있어도 재검토 불필요',
  );
});

test('judgeGeneration: SHA 변경 + 미해결/충돌/stale 없음 → new', () => {
  assert.equal(judgeGeneration({ prevHeadSha: SHA_A, currHeadSha: SHA_B }), 'new');
  assert.equal(
    judgeGeneration({ prevHeadSha: SHA_A, currHeadSha: SHA_B, unresolvedThreads: 0, hasConflict: false, isStale: false }),
    'new',
  );
});

test('judgeGeneration: SHA 변경 + 미해결 스레드 존재 → review', () => {
  assert.equal(judgeGeneration({ prevHeadSha: SHA_A, currHeadSha: SHA_B, unresolvedThreads: 1 }), 'review');
});

test('judgeGeneration: SHA 변경 + 충돌 → review', () => {
  assert.equal(judgeGeneration({ prevHeadSha: SHA_A, currHeadSha: SHA_B, hasConflict: true }), 'review');
});

test('judgeGeneration: SHA 변경 + stale → review', () => {
  assert.equal(judgeGeneration({ prevHeadSha: SHA_A, currHeadSha: SHA_B, isStale: true }), 'review');
});

test('judgeGeneration: 결정론적 — 동일 입력은 동일 출력', () => {
  const input = { prevHeadSha: SHA_A, currHeadSha: SHA_B, unresolvedThreads: 2 };
  const first = judgeGeneration(input);
  for (let i = 0; i < 10; i += 1) {
    assert.equal(judgeGeneration(input), first);
  }
});

test('judgeGeneration: 잘못된 입력 → 예외', () => {
  assert.throws(() => judgeGeneration({ prevHeadSha: '', currHeadSha: SHA_B }));
  assert.throws(() => judgeGeneration({ prevHeadSha: SHA_A }));
  assert.throws(() => judgeGeneration(null));
});

test('shortSha: 7자 축약, 공백 제거', () => {
  assert.equal(shortSha(SHA_A), 'a1b2c3d');
  assert.equal(shortSha('  ' + SHA_B + ' '), '9f8e7d6');
  assert.equal(shortSha('abc'), 'abc', '7자 미만은 원본 유지');
});

test('isValidSha: hex 4~40자만 허용', () => {
  assert.equal(isValidSha(SHA_A), true);
  assert.equal(isValidSha('a1b2'), true);
  assert.equal(isValidSha('xyz'), false);
  assert.equal(isValidSha('abc'), false, '4자 미만 거부');
  assert.equal(isValidSha(''), false);
  assert.equal(isValidSha('  a1b2c3d  '), true, '주변 공백 허용');
});

test('STATE_META: 3종 상태 모두 label/icon/색 토큰 보유', () => {
  for (const key of ['same', 'new', 'review']) {
    assert.ok(STATE_META[key], `${key} 메타 존재`);
    assert.equal(typeof STATE_META[key].label, 'string');
    assert.ok(STATE_META[key].label.length > 0);
    assert.ok(STATE_META[key].icon, `${key} 아이콘`);
  }
  assert.equal(STATE_META.same.label, '동일 세대');
  assert.equal(STATE_META.new.label, '새 세대');
  assert.equal(STATE_META.review.label, '검토 필요');
});

test('describeState: 상태별 명확한 문구 반환', () => {
  const same = describeState('same', { prevHeadSha: SHA_A, currHeadSha: SHA_A });
  const neu = describeState('new', { prevHeadSha: SHA_A, currHeadSha: SHA_B });
  const rev = describeState('review', { prevHeadSha: SHA_A, currHeadSha: SHA_B, unresolvedThreads: 3 });
  assert.match(same, /동일/);
  assert.match(neu, /새 세대|갱신/);
  assert.match(rev, /검토|미해결|3/);
});

test('relativeTime: nowMs 기준 결정론적 한국어 표현', () => {
  const base = Date.parse('2026-07-25T12:00:00Z');
  assert.equal(relativeTime('2026-07-25T12:00:00Z', base), '방금');
  assert.equal(relativeTime('2026-07-25T11:30:00Z', base), '30분 전');
  assert.equal(relativeTime('2026-07-25T10:00:00Z', base), '2시간 전');
  assert.equal(relativeTime('2026-07-23T12:00:00Z', base), '2일 전');
});
