'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(__dirname, 'tictactoe.js'), 'utf8');
vm.runInThisContext(source, { filename: 'tictactoe.js' });
const { checkWinner, isDraw } = globalThis.TicTacToe;

test('checkWinner: 전부 null인 빈 보드는 승자 없음', () => {
  assert.deepEqual(checkWinner(new Array(9).fill(null)), { winner: null, lines: [] });
});

test('checkWinner: 가로 한 줄 X 완성([0,1,2])', () => {
  const board = ['X', 'X', 'X', null, null, null, null, null, null];
  assert.deepEqual(checkWinner(board), { winner: 'X', lines: [[0, 1, 2]] });
});

test('checkWinner: 세로 한 줄 O 완성([0,3,6])', () => {
  const board = ['O', null, null, 'O', null, null, 'O', null, null];
  assert.deepEqual(checkWinner(board), { winner: 'O', lines: [[0, 3, 6]] });
});

test('checkWinner: 대각선 X 완성([0,4,8])', () => {
  const board = ['X', null, null, null, 'X', null, null, null, 'X'];
  assert.deepEqual(checkWinner(board), { winner: 'X', lines: [[0, 4, 8]] });
});

test('checkWinner: 반대각선 O 완성([2,4,6])', () => {
  const board = [null, null, 'O', null, 'O', null, 'O', null, null];
  assert.deepEqual(checkWinner(board), { winner: 'O', lines: [[2, 4, 6]] });
});

test('checkWinner: 두 줄 동시 완성(가로+대각선)은 두 줄 모두 lines에 포함', () => {
  const board = ['X', 'X', 'X', null, 'X', null, null, null, 'X'];
  const result = checkWinner(board);
  assert.equal(result.winner, 'X');
  assert.deepEqual(result.lines, [[0, 1, 2], [0, 4, 8]]);
});

test('checkWinner: 길이가 9가 아니면 throw 없이 winner null, lines 빈 배열 반환', () => {
  assert.deepEqual(checkWinner([]), { winner: null, lines: [] });
  assert.deepEqual(checkWinner(['X', 'O']), { winner: null, lines: [] });
});

test('isDraw: 전부 null인 빈 보드는 false', () => {
  const board = new Array(9).fill(null);
  assert.equal(isDraw(board, checkWinner(board)), false);
});

test('isDraw: 가득 찼고 승자 있으면 false(승자 우선)', () => {
  const board = ['X', 'X', 'X', 'O', 'O', 'X', 'O', 'X', 'O'];
  const result = checkWinner(board);
  assert.equal(result.winner, 'X');
  assert.equal(isDraw(board, result), false);
});

test('isDraw: 가득 찼고 승자 없으면 true(무승부)', () => {
  const board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
  const result = checkWinner(board);
  assert.equal(result.winner, null);
  assert.equal(isDraw(board, result), true);
});

test('isDraw: 일부만 채워지고 승자 없으면 false(진행 중)', () => {
  const board = ['X', 'O', null, null, null, null, null, null, null];
  const result = checkWinner(board);
  assert.equal(isDraw(board, result), false);
});

test('isDraw: 길이가 9가 아니면 false', () => {
  assert.equal(isDraw([], { winner: null, lines: [] }), false);
});
