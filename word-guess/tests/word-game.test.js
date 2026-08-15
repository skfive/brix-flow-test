const { test } = require('node:test');
const assert = require('node:assert/strict');
const { revealState, judgeGame } = require('../word-game.js');

test('revealState: 미시도 초기 상태는 전부 밑줄', () => {
  assert.deepStrictEqual(revealState('APPLE', []), ['_', '_', '_', '_', '_']);
});

test('revealState: 단일 정답 부분 공개', () => {
  assert.deepStrictEqual(revealState('APPLE', ['A']), ['A', '_', '_', '_', '_']);
});

test('revealState: 중복 글자(P가 2개) 모두 공개', () => {
  assert.deepStrictEqual(revealState('APPLE', ['P']), ['_', 'P', 'P', '_', '_']);
});

test('revealState: 전체 공개(승리 직전)', () => {
  assert.deepStrictEqual(revealState('APPLE', ['A', 'P', 'L', 'E']), ['A', 'P', 'P', 'L', 'E']);
});

test('judgeGame: 오답 없음, 미완성 -> playing', () => {
  assert.strictEqual(judgeGame('APPLE', ['A'], 6), 'playing');
});

test('judgeGame: 중복 글자 포함 전체 정답 커버 -> won', () => {
  assert.strictEqual(judgeGame('APPLE', ['A', 'P', 'L', 'E'], 6), 'won');
});

test('judgeGame: 오답 수가 maxMiss에 도달 -> lost', () => {
  assert.strictEqual(judgeGame('APPLE', ['X', 'Y', 'Z'], 3), 'lost');
});

test('judgeGame: 오답 수가 maxMiss 미만 -> playing', () => {
  assert.strictEqual(judgeGame('APPLE', ['X', 'Y'], 3), 'playing');
});

test('judgeGame: 중복 글자 정답(P) + 오답(X) 혼합, 아직 미완성/미탈락 -> playing', () => {
  assert.strictEqual(judgeGame('APPLE', ['P', 'X'], 6), 'playing');
});
