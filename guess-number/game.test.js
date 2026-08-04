import { test } from 'node:test';
import assert from 'node:assert/strict';

import { judge } from './game.js';

// judge(guess, answer) 는 부수효과 없는 순수함수여야 한다.
// 반환값은 frozen UI 계약의 상태명(guess-higher | guess-lower | win)과 일치한다.

test('guess < answer → guess-higher (더 큰 수 필요)', () => {
  assert.equal(judge(30, 50), 'guess-higher');
});

test('guess > answer → guess-lower (더 작은 수 필요)', () => {
  assert.equal(judge(70, 50), 'guess-lower');
});

test('guess === answer → win (정답)', () => {
  assert.equal(judge(50, 50), 'win');
});

test('경계값: guess=1, answer=1 → win', () => {
  assert.equal(judge(1, 1), 'win');
});

test('경계값: guess=1, answer=100 → guess-higher', () => {
  assert.equal(judge(1, 100), 'guess-higher');
});

test('경계값: guess=100, answer=100 → win', () => {
  assert.equal(judge(100, 100), 'win');
});

test('경계값: guess=100, answer=1 → guess-lower', () => {
  assert.equal(judge(100, 1), 'guess-lower');
});

test('judge 는 순수함수 — 같은 입력에 항상 같은 출력', () => {
  assert.equal(judge(42, 77), judge(42, 77));
  assert.equal(judge(42, 77), 'guess-higher');
});
