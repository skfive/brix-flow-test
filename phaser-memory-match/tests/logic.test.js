import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSeededRng,
  buildDeck,
  shuffle,
  createInitialState,
  flipCard,
  resolveTurn,
  isCleared,
  resetGame,
  formatTime,
} from '../src/logic.js';

test('createSeededRng: 같은 seed 는 같은 수열, 다른 seed 는 다른 수열', () => {
  const a = createSeededRng(42);
  const b = createSeededRng(42);
  const seqA = [a(), a(), a(), a()];
  const seqB = [b(), b(), b(), b()];
  assert.deepEqual(seqA, seqB);
  seqA.forEach((n) => assert.ok(n >= 0 && n < 1, '0..1 범위'));

  const c = createSeededRng(43);
  const seqC = [c(), c(), c(), c()];
  assert.notDeepEqual(seqA, seqC);
});

test('createSeededRng: 유효하지 않은 seed 도 결정적으로 동작', () => {
  const a = createSeededRng(NaN);
  const b = createSeededRng(undefined);
  assert.equal(a(), b());
});

test('buildDeck: 기본 8쌍 → 16장, 각 value 정확히 2개, id 고유', () => {
  const deck = buildDeck();
  assert.equal(deck.length, 16);
  const counts = new Map();
  deck.forEach((card) => {
    assert.equal(card.faceUp, false);
    assert.equal(card.matched, false);
    counts.set(card.value, (counts.get(card.value) ?? 0) + 1);
  });
  assert.equal(counts.size, 8);
  for (const [, n] of counts) assert.equal(n, 2);
  const ids = new Set(deck.map((c) => c.id));
  assert.equal(ids.size, 16);
});

test('buildDeck: 잘못된 pairCount(0/음수/실수)는 기본 8쌍으로 방어', () => {
  assert.equal(buildDeck(0).length, 16);
  assert.equal(buildDeck(-3).length, 16);
  assert.equal(buildDeck(2.5).length, 16);
  assert.equal(buildDeck(3).length, 6);
});

test('shuffle: 같은 rng(seed) 는 항상 같은 순서, 원본 불변', () => {
  const deck = buildDeck(4);
  const s1 = shuffle(deck, createSeededRng(7));
  const s2 = shuffle(deck, createSeededRng(7));
  assert.deepEqual(
    s1.map((c) => c.id),
    s2.map((c) => c.id)
  );
  // 원본 배열/카드 불변
  assert.deepEqual(
    deck.map((c) => c.id),
    buildDeck(4).map((c) => c.id)
  );
  assert.equal(deck.length, s1.length);
});

test('createInitialState: 초기 상태 계약(start/moves 0/elapsed 0/faceUp false)', () => {
  const state = createInitialState({ seed: 1 });
  assert.equal(state.status, 'start');
  assert.equal(state.moves, 0);
  assert.equal(state.elapsedMs, 0);
  assert.deepEqual(state.flippedIndices, []);
  assert.equal(state.cards.length, 16);
  assert.ok(state.cards.every((c) => !c.faceUp && !c.matched));
});

test('createInitialState: 같은 seed 는 결정적으로 같은 배치', () => {
  const a = createInitialState({ seed: 123 });
  const b = createInitialState({ seed: 123 });
  assert.deepEqual(
    a.cards.map((c) => c.id),
    b.cards.map((c) => c.id)
  );
});

test('flipCard: 뒤집으면 faceUp+playing, flippedIndices 반영', () => {
  const state = createInitialState({ seed: 1 });
  const next = flipCard(state, 0);
  assert.equal(next.status, 'playing');
  assert.equal(next.cards[0].faceUp, true);
  assert.deepEqual(next.flippedIndices, [0]);
  // 원본 불변
  assert.equal(state.cards[0].faceUp, false);
  assert.equal(state.status, 'start');
});

test('flipCard: 이미 뒤집힌/2장 초과/잘못된 인덱스는 무시', () => {
  let state = createInitialState({ seed: 1 });
  state = flipCard(state, 0);
  // 같은 카드 재선택 무시
  assert.equal(flipCard(state, 0), state);
  state = flipCard(state, 1);
  // 세 번째 카드 차단
  assert.equal(flipCard(state, 2), state);
});

test('flipCard: 범위 밖 인덱스는 동일 상태 반환', () => {
  const state = createInitialState({ seed: 1 });
  assert.equal(flipCard(state, 99), state);
  assert.equal(flipCard(state, -1), state);
});

test('resolveTurn: 일치 시 두 카드 matched 고정, moves 증가', () => {
  let state = createInitialState({ seed: 1 });
  // 같은 value 를 가진 두 인덱스 찾기
  const idxA = 0;
  const idxB = state.cards.findIndex(
    (c, i) => i !== idxA && c.value === state.cards[idxA].value
  );
  state = flipCard(state, idxA);
  state = flipCard(state, idxB);
  const resolved = resolveTurn(state);
  assert.equal(resolved.moves, 1);
  assert.equal(resolved.cards[idxA].matched, true);
  assert.equal(resolved.cards[idxB].matched, true);
  assert.equal(resolved.cards[idxA].faceUp, true);
  assert.deepEqual(resolved.flippedIndices, []);
  assert.equal(resolved.status, 'playing');
});

test('resolveTurn: 불일치 시 두 카드 뒷면 복귀, moves 증가', () => {
  let state = createInitialState({ seed: 1 });
  const idxA = 0;
  const idxB = state.cards.findIndex(
    (c, i) => i !== idxA && c.value !== state.cards[idxA].value
  );
  state = flipCard(state, idxA);
  state = flipCard(state, idxB);
  const resolved = resolveTurn(state);
  assert.equal(resolved.moves, 1);
  assert.equal(resolved.cards[idxA].faceUp, false);
  assert.equal(resolved.cards[idxB].faceUp, false);
  assert.equal(resolved.cards[idxA].matched, false);
  assert.deepEqual(resolved.flippedIndices, []);
});

test('resolveTurn: 뒤집힌 카드가 2장이 아니면 무시', () => {
  let state = createInitialState({ seed: 1 });
  assert.equal(resolveTurn(state), state);
  state = flipCard(state, 0);
  assert.equal(resolveTurn(state), state);
});

test('isCleared / cleared 전이: 모든 쌍 매칭 시 true + status cleared', () => {
  let state = createInitialState({ seed: 5, pairCount: 8 });
  assert.equal(isCleared(state), false);
  // value 별 인덱스 그룹핑 후 순서대로 매칭
  const byValue = new Map();
  state.cards.forEach((c, i) => {
    const arr = byValue.get(c.value) ?? [];
    arr.push(i);
    byValue.set(c.value, arr);
  });
  for (const [, [a, b]] of byValue) {
    state = flipCard(state, a);
    state = flipCard(state, b);
    state = resolveTurn(state);
  }
  assert.equal(isCleared(state), true);
  assert.equal(state.status, 'cleared');
  assert.equal(state.moves, 8);
});

test('flipCard: cleared 상태에서 입력 무시', () => {
  let state = createInitialState({ seed: 5 });
  const byValue = new Map();
  state.cards.forEach((c, i) => {
    const arr = byValue.get(c.value) ?? [];
    arr.push(i);
    byValue.set(c.value, arr);
  });
  for (const [, [a, b]] of byValue) {
    state = flipCard(state, a);
    state = flipCard(state, b);
    state = resolveTurn(state);
  }
  assert.equal(state.status, 'cleared');
  assert.equal(flipCard(state, 0), state);
});

test('resetGame: 어느 상태에서든 start 초기값으로 복귀', () => {
  let state = createInitialState({ seed: 1 });
  state = flipCard(state, 0);
  state = flipCard(state, 1);
  state = resolveTurn(state);
  const reset = resetGame(state);
  assert.equal(reset.status, 'start');
  assert.equal(reset.moves, 0);
  assert.equal(reset.elapsedMs, 0);
  assert.deepEqual(reset.flippedIndices, []);
  assert.ok(reset.cards.every((c) => !c.faceUp && !c.matched));
});

test('resetGame: seed 재사용 시 같은 배치, 신규 seed 시 다른 배치 가능', () => {
  const state = createInitialState({ seed: 1 });
  const sameSeed = resetGame(state);
  assert.deepEqual(
    sameSeed.cards.map((c) => c.id),
    state.cards.map((c) => c.id)
  );
  const newSeed = resetGame(state, { seed: 999 });
  assert.equal(newSeed.cards.length, state.cards.length);
});

test('formatTime: mm:ss 포맷', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(5), '00:05');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(600), '10:00');
  assert.equal(formatTime(3599), '59:59');
  // 방어: 실수/음수
  assert.equal(formatTime(65.9), '01:05');
  assert.equal(formatTime(-10), '00:00');
  assert.equal(formatTime(NaN), '00:00');
});
