import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STATUS_IDS,
  STATUS_LABELS,
  DEFAULT_STATUS,
  createBoard,
  addItem,
  groupByStatus,
  filterByStatus,
  countsByStatus,
} from '../domain.js';

test('STATUS_IDS 는 대기/진행/완료 3개 컬럼', () => {
  assert.deepEqual(STATUS_IDS, ['waiting', 'in_progress', 'done']);
  assert.equal(STATUS_LABELS.waiting, '대기');
  assert.equal(STATUS_LABELS.in_progress, '진행');
  assert.equal(STATUS_LABELS.done, '완료');
});

test('createBoard 는 빈 보드를 만들고 입력을 검증한다', () => {
  const board = createBoard();
  assert.deepEqual(board.items, []);
  assert.throws(() => createBoard([{ title: '', status: 'waiting', id: 'x' }]), /제목/);
});

test('addItem: 항목이 해당 상태 컬럼에 추가된다(AC2)', () => {
  let board = createBoard();
  board = addItem(board, { title: '배포 인수', status: 'waiting' });
  board = addItem(board, { title: '장애 이관', status: 'in_progress', assignee: '이서연' });

  assert.equal(board.items.length, 2);
  assert.equal(board.items[0].status, 'waiting');
  assert.equal(board.items[1].assignee, '이서연');
});

test('addItem 은 불변 — 원본 보드를 변경하지 않는다', () => {
  const board = createBoard();
  const next = addItem(board, { title: '작업', status: 'done' });
  assert.equal(board.items.length, 0);
  assert.equal(next.items.length, 1);
});

test('addItem: status 미지정 시 기본 상태(대기)', () => {
  const board = addItem(createBoard(), { title: '기본상태 작업' });
  assert.equal(board.items[0].status, DEFAULT_STATUS);
  assert.equal(board.items[0].status, 'waiting');
});

test('addItem: id 미지정 시 결정론적 id 부여', () => {
  let board = createBoard();
  board = addItem(board, { title: 'A' });
  board = addItem(board, { title: 'B' });
  assert.equal(board.items[0].id, 'item-1');
  assert.equal(board.items[1].id, 'item-2');
});

test('addItem: 알 수 없는 상태는 거부', () => {
  assert.throws(() => addItem(createBoard(), { title: 'X', status: 'nope' }), /알 수 없는 상태/);
});

test('groupByStatus: 상태별로 등장 순서를 보존해 그룹핑', () => {
  let board = createBoard();
  board = addItem(board, { title: 'W1', status: 'waiting' });
  board = addItem(board, { title: 'D1', status: 'done' });
  board = addItem(board, { title: 'W2', status: 'waiting' });

  const groups = groupByStatus(board);
  assert.deepEqual(groups.waiting.map((i) => i.title), ['W1', 'W2']);
  assert.deepEqual(groups.in_progress, []);
  assert.deepEqual(groups.done.map((i) => i.title), ['D1']);
});

test('filterByStatus: 상태별 구분 조회(AC2)', () => {
  let board = createBoard();
  board = addItem(board, { title: 'W', status: 'waiting' });
  board = addItem(board, { title: 'P', status: 'in_progress' });

  assert.equal(filterByStatus(board, 'all').length, 2);
  assert.deepEqual(filterByStatus(board, 'waiting').map((i) => i.title), ['W']);
  assert.deepEqual(filterByStatus(board, 'in_progress').map((i) => i.title), ['P']);
  assert.deepEqual(filterByStatus(board, 'done'), []);
});

test('filterByStatus: 알 수 없는 필터는 거부', () => {
  assert.throws(() => filterByStatus(createBoard(), 'bogus'), /알 수 없는 필터/);
});

test('countsByStatus: 전체 및 상태별 카운트', () => {
  let board = createBoard();
  board = addItem(board, { title: 'W', status: 'waiting' });
  board = addItem(board, { title: 'P', status: 'in_progress' });
  board = addItem(board, { title: 'P2', status: 'in_progress' });

  assert.deepEqual(countsByStatus(board), { all: 3, waiting: 1, in_progress: 2, done: 0 });
});
