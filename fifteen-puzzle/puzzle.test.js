'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canMove, applyMove, isSolved } = require('./puzzle.js');

const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null];

function boardWithBlankAt(blankIndex) {
  // 1..15를 순서대로 채우고 blankIndex 위치만 null로 바꾼 보드.
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const board = [];
  let cursor = 0;
  for (let i = 0; i < 16; i++) {
    if (i === blankIndex) {
      board.push(null);
    } else {
      board.push(values[cursor]);
      cursor += 1;
    }
  }
  return board;
}

test('canMove: 빈 칸 왼쪽 타일은 이동 가능', () => {
  const board = boardWithBlankAt(5);
  assert.equal(canMove(board, 4), true);
});

test('canMove: 빈 칸 오른쪽 타일은 이동 가능', () => {
  const board = boardWithBlankAt(5);
  assert.equal(canMove(board, 6), true);
});

test('canMove: 빈 칸 위 타일은 이동 가능', () => {
  const board = boardWithBlankAt(5);
  assert.equal(canMove(board, 1), true);
});

test('canMove: 빈 칸 아래 타일은 이동 가능', () => {
  const board = boardWithBlankAt(5);
  assert.equal(canMove(board, 9), true);
});

test('canMove: 대각선 타일은 이동 불가', () => {
  const board = boardWithBlankAt(5);
  assert.equal(canMove(board, 0), false);
});

test('canMove: 행 경계를 넘어가는 인덱스는 인접으로 취급하지 않는다 (wrap-around 경계 케이스)', () => {
  // blank는 index 4 (2행 0열). index 3 (1행 3열)은 index상 4-1=3 이지만
  // 실제 그리드에서는 다른 행이므로 인접이 아니어야 한다.
  const board = boardWithBlankAt(4);
  assert.equal(canMove(board, 3), false);
});

test('canMove: 좌상단 모서리(index 0)에서는 오른쪽/아래만 인접', () => {
  const board = boardWithBlankAt(0);
  assert.equal(canMove(board, 1), true);
  assert.equal(canMove(board, 4), true);
});

test('canMove: 우하단 모서리(index 15)에서는 왼쪽/위만 인접', () => {
  const board = boardWithBlankAt(15);
  assert.equal(canMove(board, 11), true);
  assert.equal(canMove(board, 14), true);
  assert.equal(canMove(board, 10), false);
});

test('canMove: 빈 칸 자기 자신은 이동 불가', () => {
  const board = boardWithBlankAt(5);
  assert.equal(canMove(board, 5), false);
});

test('applyMove: 유효한 이동이면 원본을 변형하지 않고 새 배열을 반환한다', () => {
  const board = boardWithBlankAt(5);
  const originalSnapshot = board.slice();
  const next = applyMove(board, 4);

  assert.notEqual(next, board);
  assert.deepEqual(board, originalSnapshot);
  assert.equal(next[5], board[4]);
  assert.equal(next[4], null);
});

test('applyMove: 무효한 이동이면 원본과 동일한 참조를 반환한다', () => {
  const board = boardWithBlankAt(5);
  const next = applyMove(board, 0);
  assert.equal(next, board);
});

test('isSolved: 완성 상태 배열은 true를 반환한다', () => {
  assert.equal(isSolved(SOLVED), true);
});

test('isSolved: 섞인 보드는 false를 반환한다', () => {
  const shuffled = boardWithBlankAt(5);
  assert.equal(isSolved(shuffled), false);
});
