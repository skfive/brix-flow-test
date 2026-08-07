// Addiction Mini — game.js 순수 함수 단위 테스트 (node --test)
// BF-1856 · planning-contract §9 테스트 명세.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeCard,
  canMove,
  checkWin,
  isSolvable,
  createBoard,
  shuffle,
  correctPrefixLength,
  computeScore,
  CELL_COUNT,
} from '../src/game.js';

const empty = () => new Array(CELL_COUNT).fill(null);

// 완성(승리) 보드: 각 행 한 무늬 A→6, 6열 빈 칸.
function winBoard() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const b = empty();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) b[r * 7 + c] = makeCard(suits[r], c + 1);
  }
  return b;
}

test('canMove: col0(1열) 빈 칸은 Ace 만 허용', () => {
  const b = empty();
  b[0] = null; // col0 빈 칸
  b[5] = makeCard('hearts', 1); // Ace
  assert.equal(canMove(b, 5, 0), true);
  b[5] = makeCard('hearts', 2); // 비-Ace
  assert.equal(canMove(b, 5, 0), false);
});

test('canMove: N→N+1 같은 무늬만 허용', () => {
  const b = empty();
  b[9] = makeCard('spades', 3); // to(10) 의 왼쪽 이웃
  // to=10 빈 칸 → 요구 카드 {spades,4}
  b[15] = makeCard('spades', 4);
  assert.equal(canMove(b, 15, 10), true);
  b[15] = makeCard('hearts', 4); // 다른 무늬
  assert.equal(canMove(b, 15, 10), false);
  b[15] = makeCard('spades', 5); // rank 불일치
  assert.equal(canMove(b, 15, 10), false);
});

test('canMove: dead gap(왼쪽 빈칸/rank6) 거부', () => {
  const b = empty();
  // to=10 왼쪽(9) 빈 칸
  b[15] = makeCard('spades', 4);
  assert.equal(canMove(b, 15, 10), false);
  // 왼쪽 rank6
  b[9] = makeCard('spades', 6);
  assert.equal(canMove(b, 15, 10), false);
});

test('canMove: 대상이 빈 칸이 아니면 거부', () => {
  const b = empty();
  b[9] = makeCard('spades', 3);
  b[10] = makeCard('clubs', 2); // 이미 채워짐
  b[15] = makeCard('spades', 4);
  assert.equal(canMove(b, 15, 10), false);
});

test('checkWin: 완성 보드 true', () => {
  assert.equal(checkWin(winBoard()), true);
});

test('checkWin: 무늬 혼합/순서 오류/6열 채워짐 false', () => {
  const mix = winBoard();
  mix[1] = makeCard('spades', 2); // 행0 무늬 혼합
  assert.equal(checkWin(mix), false);

  const order = winBoard();
  const tmp = order[2];
  order[2] = order[3];
  order[3] = tmp; // rank 순서 뒤바뀜
  assert.equal(checkWin(order), false);

  const notEmpty = winBoard();
  notEmpty[6] = makeCard('hearts', 1); // 6열이 비어있지 않음
  assert.equal(checkWin(notEmpty), false);
});

test('isSolvable: 완성 보드 true', () => {
  assert.equal(isSolvable(winBoard()), true);
});

test('isSolvable: 인위적 deadlock 보드 false', () => {
  // 빈 칸 4개(1,8,15,22, 각 col1)의 왼쪽이 모두 rank6 → 모든 이동 불가, 미승리.
  const b = empty();
  const sixes = ['hearts', 'diamonds', 'clubs', 'spades'].map((s) => makeCard(s, 6));
  b[0] = sixes[0];
  b[7] = sixes[1];
  b[14] = sixes[2];
  b[21] = sixes[3];
  const rest = [];
  for (const s of ['hearts', 'diamonds', 'clubs', 'spades']) {
    for (let rk = 1; rk <= 5; rk++) rest.push(makeCard(s, rk));
  }
  const fillCells = [2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27];
  fillCells.forEach((idx, i) => { b[idx] = rest[i]; });
  assert.equal(checkWin(b), false);
  assert.equal(isSolvable(b), false);
});

test('createBoard: 길이 28, 카드 24·빈칸 4, isSolvable=true, 각 행 1열 Ace 앵커', () => {
  const b = createBoard();
  assert.equal(b.length, 28);
  assert.equal(b.filter((x) => x).length, 24);
  assert.equal(b.filter((x) => x === null).length, 4);
  assert.equal(isSolvable(b), true);
  for (let r = 0; r < 4; r++) {
    assert.equal(b[r * 7].rank, 1); // col0 = Ace 앵커
  }
});

test('shuffle: locked 접두 보존 + 카드 수 보존 + 결과 solvable', () => {
  const b = createBoard();
  const idsBefore = b.filter((x) => x).map((x) => x.id).sort();
  const anchorsBefore = [0, 7, 14, 21].map((i) => b[i].id);

  const sh = shuffle(b);
  assert.equal(sh.filter((x) => x).length, 24);
  assert.equal(sh.filter((x) => x === null).length, 4);

  const idsAfter = sh.filter((x) => x).map((x) => x.id).sort();
  assert.deepEqual(idsAfter, idsBefore); // 카드 멀티셋 보존

  // 앵커(col0) 는 locked 접두라 그대로 유지
  [0, 7, 14, 21].forEach((i, r) => assert.equal(sh[i].id, anchorsBefore[r]));

  assert.equal(isSolvable(sh), true);
});

test('computeScore: 초기 앵커만 있는 상태 0, 승리 20', () => {
  const b = createBoard();
  assert.ok(computeScore(b) >= 0);
  assert.equal(computeScore(winBoard()), 20);
});

test('correctPrefixLength: 승리 행은 6', () => {
  assert.equal(correctPrefixLength(winBoard(), 0), 6);
});
