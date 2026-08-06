// tests/game.test.js — src/game.js 순수 로직 단위 테스트 (node --test)
// frozen 계약(implementation-plan.md §6)의 순수 함수 시그니처를 검증한다.
// RNG는 결정적 시퀀스로 주입해 정답 생성이 재현 가능함을 확인한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateRound,
  scoreGuess,
  applyLife,
  createInitialState,
  randomColor,
} from '../src/game.js';

/**
 * 고정 시퀀스를 순환 반환하는 결정적 RNG 팩토리.
 * @param {number[]} values [0,1) 범위 값 시퀀스
 * @returns {() => number}
 */
function seqRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

test('createInitialState: 시작 상태는 playing·점수 0·목숨 3', () => {
  assert.deepEqual(createInitialState(), { status: 'playing', score: 0, lives: 3 });
});

test('createInitialState: 매 호출마다 새 객체를 반환한다(공유 상태 없음)', () => {
  const a = createInitialState();
  const b = createInitialState();
  assert.notEqual(a, b);
});

test('randomColor: rng를 소비해 유효한 #rrggbb 문자열을 만든다', () => {
  // rng() * 256 -> 0, 128, 255 채널
  const color = randomColor(seqRng([0, 128 / 256, 255 / 256]));
  assert.match(color, /^#[0-9a-f]{6}$/);
  assert.equal(color, '#0080ff');
});

test('generateRound: optionCount만큼 견본을 만들고 target은 correctIndex 견본과 같다', () => {
  const rng = seqRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.05]);
  const round = generateRound(rng, 4);
  assert.equal(round.options.length, 4);
  assert.ok(Number.isInteger(round.correctIndex));
  assert.ok(round.correctIndex >= 0 && round.correctIndex < 4);
  assert.equal(round.target, round.options[round.correctIndex]);
  round.options.forEach((c) => assert.match(c, /^#[0-9a-f]{6}$/));
});

test('generateRound: 동일한 rng 시퀀스는 항상 동일한 결과(결정적)', () => {
  const seq = [0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.88, 0.99, 0.01, 0.02, 0.03, 0.9];
  const a = generateRound(seqRng(seq), 4);
  const b = generateRound(seqRng(seq), 4);
  assert.deepEqual(a, b);
});

test('generateRound: rng가 함수가 아니면 TypeError', () => {
  assert.throws(() => generateRound(null, 4), TypeError);
});

test('generateRound: optionCount 미지정 시 기본 견본 수(4)를 사용한다', () => {
  const round = generateRound(seqRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]));
  assert.equal(round.options.length, 4);
});

test('scoreGuess: 선택 index가 correctIndex와 같으면 true', () => {
  const round = { correctIndex: 2, options: ['#000000', '#111111', '#222222'], target: '#222222' };
  assert.equal(scoreGuess(round, 2), true);
  assert.equal(scoreGuess(round, 0), false);
});

test('applyLife: 정답이면 목숨 유지·gameOver false', () => {
  assert.deepEqual(applyLife(3, true), { lives: 3, gameOver: false });
  assert.deepEqual(applyLife(1, true), { lives: 1, gameOver: false });
});

test('applyLife: 오답이면 목숨 -1', () => {
  assert.deepEqual(applyLife(3, false), { lives: 2, gameOver: false });
  assert.deepEqual(applyLife(2, false), { lives: 1, gameOver: false });
});

test('applyLife: 목숨 1에서 오답이면 0 도달·gameOver true', () => {
  assert.deepEqual(applyLife(1, false), { lives: 0, gameOver: true });
});
