import test from 'node:test';
import assert from 'node:assert/strict';

import { judge } from '../game.js';

// §4 반환 계약: guess<answer → 'higher', guess>answer → 'lower', guess===answer → 'win'
test('judge: guess < answer 이면 higher 를 반환한다', () => {
  assert.equal(judge(30, 50), 'higher');
});

test('judge: guess > answer 이면 lower 를 반환한다', () => {
  assert.equal(judge(70, 50), 'lower');
});

test('judge: guess === answer 이면 win 을 반환한다', () => {
  assert.equal(judge(50, 50), 'win');
});

// §4 경계값
test('judge: 경계값 49/50 은 higher', () => {
  assert.equal(judge(49, 50), 'higher');
});

test('judge: 경계값 51/50 은 lower', () => {
  assert.equal(judge(51, 50), 'lower');
});

test('judge: 경계값 1/1 은 win', () => {
  assert.equal(judge(1, 1), 'win');
});

test('judge: 경계값 100/100 은 win', () => {
  assert.equal(judge(100, 100), 'win');
});

// judge 는 부수효과 없는 순수함수 — 같은 입력에 항상 같은 결과
test('judge: 순수함수 — 반복 호출이 동일 결과', () => {
  assert.equal(judge(30, 50), judge(30, 50));
  assert.equal(judge(50, 50), 'win');
});
