'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createDeck,
  shuffle,
  isMatch,
  formatTime,
  isWon,
  shuffledDeck,
  judgeFlip
} = require('../memory.js');

function sequenceRng(values) {
  let i = 0;
  return function () {
    const value = values[i % values.length];
    i += 1;
    return value;
  };
}

test('createDeck: 빈 배열 입력 시 빈 배열 반환', () => {
  assert.deepEqual(createDeck([]), []);
});

test('createDeck: symbol 1개 입력 시 2장, 동일 symbol, id 0/1', () => {
  const deck = createDeck(['a']);
  assert.equal(deck.length, 2);
  assert.deepEqual(deck.map((c) => c.symbol), ['a', 'a']);
  assert.deepEqual(deck.map((c) => c.id), [0, 1]);
});

test('createDeck: 8개 symbol 입력 시 16장, 각 symbol 정확히 2회 등장', () => {
  const symbols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const deck = createDeck(symbols);
  assert.equal(deck.length, 16);
  const counts = {};
  deck.forEach((c) => {
    counts[c.symbol] = (counts[c.symbol] || 0) + 1;
  });
  symbols.forEach((s) => assert.equal(counts[s], 2));
});

test('createDeck: null/undefined 입력 시 빈 배열 반환 (방어적 처리)', () => {
  assert.deepEqual(createDeck(null), []);
  assert.deepEqual(createDeck(undefined), []);
});

test('createDeck: 생성 직후 모든 카드 state는 hidden', () => {
  const deck = createDeck(['x', 'y']);
  deck.forEach((c) => assert.equal(c.state, 'hidden'));
});

test('createDeck: 카드 id는 0부터 유일하게 증가', () => {
  const deck = createDeck(['x', 'y', 'z']);
  const ids = deck.map((c) => c.id);
  assert.deepEqual(ids, [0, 1, 2, 3, 4, 5]);
  assert.equal(new Set(ids).size, ids.length);
});

test('shuffle: 빈 배열 입력 시 빈 배열 반환', () => {
  assert.deepEqual(shuffle([], Math.random), []);
});

test('shuffle: 1장 배열 입력 시 순서 불변', () => {
  const deck = createDeck(['a']);
  const shuffled = shuffle([deck[0]], Math.random);
  assert.deepEqual(shuffled, [deck[0]]);
});

test('shuffle: 동일 rng 시퀀스면 결정적으로 동일 순서를 반환한다', () => {
  const deck = createDeck(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  const rngValues = [0.9, 0.1, 0.5, 0.2, 0.8, 0.3, 0.6, 0.4, 0.7, 0.05, 0.95, 0.15, 0.55, 0.25, 0.65];
  const shuffledA = shuffle(deck, sequenceRng(rngValues));
  const shuffledB = shuffle(deck, sequenceRng(rngValues));
  assert.deepEqual(
    shuffledA.map((c) => c.id),
    shuffledB.map((c) => c.id)
  );
  assert.equal(shuffledA.length, deck.length);
  const symbolsA = shuffledA.map((c) => c.symbol).sort();
  const symbolsB = deck.map((c) => c.symbol).sort();
  assert.deepEqual(symbolsA, symbolsB);
});

test('shuffle: 원본 배열은 mutate하지 않는다', () => {
  const deck = createDeck(['a', 'b', 'c']);
  const originalOrder = deck.map((c) => c.id);
  shuffle(deck, sequenceRng([0.9, 0.1, 0.5]));
  assert.deepEqual(
    deck.map((c) => c.id),
    originalOrder
  );
});

test('isMatch: 동일 symbol, 서로 다른 id면 true', () => {
  assert.equal(isMatch({ id: 0, symbol: 'a' }, { id: 1, symbol: 'a' }), true);
});

test('isMatch: 서로 다른 symbol이면 false', () => {
  assert.equal(isMatch({ id: 0, symbol: 'a' }, { id: 1, symbol: 'b' }), false);
});

test('isMatch: 동일 id(자기 자신)면 false', () => {
  assert.equal(isMatch({ id: 0, symbol: 'a' }, { id: 0, symbol: 'a' }), false);
});

test('formatTime: 0초는 "00:00"', () => {
  assert.equal(formatTime(0), '00:00');
});

test('formatTime: 5초는 "00:05"', () => {
  assert.equal(formatTime(5), '00:05');
});

test('formatTime: 59초는 "00:59"', () => {
  assert.equal(formatTime(59), '00:59');
});

test('formatTime: 60초는 "01:00"', () => {
  assert.equal(formatTime(60), '01:00');
});

test('formatTime: 3599초는 "59:59"', () => {
  assert.equal(formatTime(3599), '59:59');
});

test('formatTime: 음수/NaN은 "00:00" (방어적 처리)', () => {
  assert.equal(formatTime(-1), '00:00');
  assert.equal(formatTime(NaN), '00:00');
});

test('isWon: 빈 배열이면 false', () => {
  assert.equal(isWon([]), false);
});

test('isWon: 16장 전부 matched면 true', () => {
  const cards = createDeck(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']).map((c) => ({ ...c, state: 'matched' }));
  assert.equal(isWon(cards), true);
});

test('isWon: 15장 matched + 1장 hidden이면 false', () => {
  const cards = createDeck(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']).map((c) => ({ ...c, state: 'matched' }));
  cards[0].state = 'hidden';
  assert.equal(isWon(cards), false);
});

test('isWon: null/undefined면 false (방어적 처리)', () => {
  assert.equal(isWon(null), false);
  assert.equal(isWon(undefined), false);
});

test('shuffledDeck: pairCount=8, 고정 rng로 16장·8쌍을 결정적으로 반환한다', () => {
  const rngValues = [0.9, 0.1, 0.5, 0.2, 0.8, 0.3, 0.6, 0.4, 0.7, 0.05, 0.95, 0.15, 0.55, 0.25, 0.65];
  const deckA = shuffledDeck(8, sequenceRng(rngValues));
  const deckB = shuffledDeck(8, sequenceRng(rngValues));
  assert.equal(deckA.length, 16);
  const counts = {};
  deckA.forEach((c) => {
    counts[c.symbol] = (counts[c.symbol] || 0) + 1;
  });
  assert.equal(Object.keys(counts).length, 8);
  Object.values(counts).forEach((count) => assert.equal(count, 2));
  assert.deepEqual(
    deckA.map((c) => c.id),
    deckB.map((c) => c.id)
  );
});

test('judgeFlip: isMatch와 동일하게 짝/비짝을 판정한다', () => {
  assert.equal(judgeFlip({ id: 0, symbol: 'a' }, { id: 1, symbol: 'a' }), true);
  assert.equal(judgeFlip({ id: 0, symbol: 'a' }, { id: 1, symbol: 'b' }), false);
});
