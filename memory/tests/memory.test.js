'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDeck, applyFlip } = require('../memory.js');

function identityShuffle(cards) {
  return cards.slice();
}

function reverseShuffle(cards) {
  return cards.slice().reverse();
}

function baseState(symbols) {
  return {
    deck: createDeck(symbols, identityShuffle),
    flippedIndices: [],
    moveCount: 0,
    phase: 'idle'
  };
}

test('createDeck: 8개 symbol 입력 시 16장, 각 symbol 정확히 2회 등장', () => {
  const symbols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const deck = createDeck(symbols, identityShuffle);
  assert.equal(deck.length, 16);
  const counts = {};
  deck.forEach((c) => {
    counts[c.symbol] = (counts[c.symbol] || 0) + 1;
  });
  symbols.forEach((s) => assert.equal(counts[s], 2));
});

test('createDeck: 카드 id는 0부터 유일하게 부여된다', () => {
  const deck = createDeck(['a', 'b', 'c'], identityShuffle);
  const ids = deck.map((c) => c.id);
  assert.deepEqual(ids, [0, 1, 2, 3, 4, 5]);
  assert.equal(new Set(ids).size, ids.length);
});

test('createDeck: 초기 카드 상태는 모두 flipped:false, matched:false', () => {
  const deck = createDeck(['x', 'y'], identityShuffle);
  deck.forEach((c) => {
    assert.equal(c.flipped, false);
    assert.equal(c.matched, false);
  });
});

test('createDeck: 원본 symbols 배열을 변경하지 않는다', () => {
  const symbols = ['a', 'b', 'c'];
  const snapshot = symbols.slice();
  createDeck(symbols, identityShuffle);
  assert.deepEqual(symbols, snapshot);
});

test('createDeck: shuffleFn 주입 시 지정한 순서로 결정적으로 배치된다', () => {
  const symbols = ['a', 'b', 'c', 'd'];
  const ordered = createDeck(symbols, identityShuffle);
  const reversed = createDeck(symbols, reverseShuffle);
  assert.deepEqual(
    reversed.map((c) => c.id),
    ordered.map((c) => c.id).slice().reverse()
  );
});

test('createDeck: 매 호출마다 새 배열과 새 카드 객체를 반환한다', () => {
  const symbols = ['a', 'b'];
  const deckA = createDeck(symbols, identityShuffle);
  const deckB = createDeck(symbols, identityShuffle);
  assert.notEqual(deckA, deckB);
  assert.notEqual(deckA[0], deckB[0]);
});

test('applyFlip: idle 상태에서 카드 클릭 시 해당 카드만 flipped, phase는 one-flipped', () => {
  const state = baseState(['a', 'b']);
  const next = applyFlip(state, 0);
  assert.equal(next.deck[0].flipped, true);
  assert.equal(next.flippedIndices.length, 1);
  assert.equal(next.flippedIndices[0], 0);
  assert.equal(next.phase, 'one-flipped');
});

test('applyFlip: one-flipped 상태에서 두 번째 카드가 매치되면 두 카드 matched, moveCount 증가, phase idle로 복귀', () => {
  // symbols ['a','b','c'] -> deck: a,a,b,b,c,c (identityShuffle 순서 유지)
  const state = baseState(['a', 'b', 'c']);
  const afterFirst = applyFlip(state, 0);
  const afterSecond = applyFlip(afterFirst, 1);
  assert.equal(afterSecond.deck[0].matched, true);
  assert.equal(afterSecond.deck[1].matched, true);
  assert.equal(afterSecond.moveCount, 1);
  assert.equal(afterSecond.flippedIndices.length, 0);
  assert.equal(afterSecond.phase, 'idle');
});

test('applyFlip: 매치 실패 시 flippedIndices에 두 index 보관, phase comparing, moveCount 증가', () => {
  // deck: a,a,b,b -> index 0(a) vs index 2(b) 불일치
  const state = baseState(['a', 'b']);
  const afterFirst = applyFlip(state, 0);
  const afterSecond = applyFlip(afterFirst, 2);
  assert.deepEqual(afterSecond.flippedIndices, [0, 2]);
  assert.equal(afterSecond.moveCount, 1);
  assert.equal(afterSecond.phase, 'comparing');
  assert.equal(afterSecond.deck[0].flipped, true);
  assert.equal(afterSecond.deck[2].flipped, true);
});

test('applyFlip: comparing 상태에서 클릭은 무시(no-op, 동일 state 반환)', () => {
  const state = baseState(['a', 'b']);
  const afterFirst = applyFlip(state, 0);
  const comparing = applyFlip(afterFirst, 2);
  const next = applyFlip(comparing, 1);
  assert.equal(next, comparing);
});

test('applyFlip: done 상태에서 클릭은 무시', () => {
  const state = baseState(['a']);
  const afterFirst = applyFlip(state, 0);
  const done = applyFlip(afterFirst, 1);
  assert.equal(done.phase, 'done');
  const next = applyFlip(done, 0);
  assert.equal(next, done);
});

test('applyFlip: 이미 flipped된 카드 재클릭은 무시', () => {
  const state = baseState(['a', 'b']);
  const afterFirst = applyFlip(state, 0);
  const next = applyFlip(afterFirst, 0);
  assert.equal(next, afterFirst);
});

test('applyFlip: 이미 matched된 카드 재클릭은 무시', () => {
  const state = baseState(['a', 'b', 'c']);
  const afterFirst = applyFlip(state, 0);
  const matched = applyFlip(afterFirst, 1);
  assert.equal(matched.phase, 'idle');
  const next = applyFlip(matched, 0);
  assert.equal(next, matched);
});

test('applyFlip: index가 범위를 벗어나면 무시 (음수/초과)', () => {
  const state = baseState(['a', 'b']);
  assert.equal(applyFlip(state, -1), state);
  assert.equal(applyFlip(state, 99), state);
});

test('applyFlip: 원본 state와 하위 객체를 mutate하지 않는다', () => {
  const state = baseState(['a', 'b']);
  const snapshot = JSON.parse(JSON.stringify(state));
  applyFlip(state, 0);
  assert.deepEqual(state, snapshot);
});

test('applyFlip: 마지막 쌍까지 매치되면 comparing을 거치지 않고 done으로 전이', () => {
  const state = baseState(['a']);
  const afterFirst = applyFlip(state, 0);
  const afterSecond = applyFlip(afterFirst, 1);
  assert.equal(afterSecond.phase, 'done');
  assert.equal(afterSecond.deck.every((c) => c.matched), true);
});
