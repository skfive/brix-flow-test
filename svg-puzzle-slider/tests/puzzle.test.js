// svg-puzzle-slider/tests/puzzle.test.js
// 순수 게임 로직 단위 테스트 (node --test).
// 렌더링(DOM/SVG/타이머) 의존 없이 puzzle.js 순수 함수만 검증한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SIZE,
  TILE_COUNT,
  EMPTY,
  solvedBoard,
  isSolved,
  emptyIndex,
  canMove,
  move,
  countInversions,
  isSolvable,
  shuffle,
} from '../src/puzzle.js';

// 시드 기반 결정적 rng (선형합동 생성기 클로저).
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('상수: 3x3 = 8-퍼즐', () => {
  assert.equal(SIZE, 3);
  assert.equal(TILE_COUNT, 9);
  assert.equal(EMPTY, 0);
});

test('solvedBoard(): 1..8 뒤 빈 칸(0)', () => {
  assert.deepEqual(solvedBoard(), [1, 2, 3, 4, 5, 6, 7, 8, 0]);
});

test('isSolved(): 목표 배열만 true', () => {
  assert.equal(isSolved(solvedBoard()), true);
  const almost = solvedBoard();
  [almost[6], almost[7]] = [almost[7], almost[6]];
  assert.equal(isSolved(almost), false);
});

test('emptyIndex(): 빈 칸 위치 반환', () => {
  assert.equal(emptyIndex(solvedBoard()), 8);
  const b = solvedBoard();
  [b[8], b[5]] = [b[5], b[8]];
  assert.equal(emptyIndex(b), 5);
});

test('canMove(): 빈 칸에 상하좌우 인접 타일만 이동 가능', () => {
  // 빈 칸을 중앙(index 4, row1 col1)으로 옮긴 보드
  const b = solvedBoard();
  [b[8], b[4]] = [b[4], b[8]]; // empty at 4
  assert.equal(emptyIndex(b), 4);
  assert.equal(canMove(b, 1), true); // 위
  assert.equal(canMove(b, 7), true); // 아래
  assert.equal(canMove(b, 3), true); // 왼쪽
  assert.equal(canMove(b, 5), true); // 오른쪽
  assert.equal(canMove(b, 0), false); // 대각(비인접)
  assert.equal(canMove(b, 2), false); // 멀리
  assert.equal(canMove(b, 4), false); // 빈 칸 자신
});

test('canMove(): 행을 넘어가는 좌우 오판을 차단(E2)', () => {
  const b = solvedBoard();
  [b[8], b[3]] = [b[3], b[8]]; // empty at index 3 (row1 col0)
  assert.equal(emptyIndex(b), 3);
  // index 2 는 row0 col2 — 1차원상 인접(3-1=2)이지만 다른 행이므로 좌우 이동 불가
  assert.equal(canMove(b, 2), false);
  assert.equal(canMove(b, 4), true); // 같은 행 오른쪽은 가능
  assert.equal(canMove(b, 0), true); // 위쪽은 가능
});

test('move(): 인접 타일 이동은 새 배열 반환, 원본 불변(순수)', () => {
  const b = solvedBoard();
  [b[8], b[7]] = [b[7], b[8]]; // empty at 7, tile 8 at index 8
  const before = b.slice();
  const next = move(b, 8); // 8번 타일을 빈 칸(7)으로
  assert.deepEqual(b, before, '원본 불변');
  assert.notEqual(next, b, '새 배열');
  assert.equal(next[7], 8);
  assert.equal(next[8], EMPTY);
});

test('move(): 이동 불가 타일은 상태 변화 없음(E1)', () => {
  const b = solvedBoard();
  [b[8], b[4]] = [b[4], b[8]]; // empty at 4
  const before = b.slice();
  const next = move(b, 0); // 비인접
  assert.deepEqual(next, before, '변화 없음');
  assert.deepEqual(b, before, '원본 불변');
});

test('countInversions(): 빈 칸 제외 역순 쌍 개수', () => {
  assert.equal(countInversions(solvedBoard()), 0);
  const b = solvedBoard();
  [b[6], b[7]] = [b[7], b[6]]; // 8,7 순서 뒤집힘 → inversion 1
  assert.equal(countInversions(b), 1);
});

test('isSolvable(): 홀수 폭(3) 규칙 — 역위 수 짝수만 solvable', () => {
  assert.equal(isSolvable(solvedBoard()), true); // inversions 0 (짝수)
  const b = solvedBoard();
  [b[6], b[7]] = [b[7], b[6]]; // 인접 두 타일 swap → 역위 수 1(홀수) → unsolvable
  assert.equal(isSolvable(b), false);
  // 빈 칸의 행 위치는 판정에 영향 없음(폭이 홀수): 빈 칸을 위로 옮겨도 solvable 유지
  const c = solvedBoard();
  [c[8], c[2]] = [c[2], c[8]]; // 8번 타일과 빈 칸 자리만 이동(역위 수는 그대로 짝수)
  assert.equal(isSolvable(c), true);
});

test('shuffle(rng): 항상 solvable 하고 solved 가 아니다(E3/E4)', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const board = shuffle(makeRng(seed));
    assert.equal(board.length, TILE_COUNT);
    // 값 집합 검증: 0..8 각 1회
    const sorted = board.slice().sort((a, z) => a - z);
    assert.deepEqual(sorted, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(isSolvable(board), true, `seed ${seed} solvable`);
    assert.equal(isSolved(board), false, `seed ${seed} not solved`);
  }
});

test('shuffle(rng): 같은 시드는 결정적으로 동일 보드 생성', () => {
  const a = shuffle(makeRng(12345));
  const b = shuffle(makeRng(12345));
  assert.deepEqual(a, b);
});

test('shuffle → move 반복으로 solvable 유지(로직 정합성)', () => {
  // solved 에서 임의 합법 이동을 적용해도 solvable 이 유지되는지 스모크
  let b = solvedBoard();
  const seq = [5, 4, 7, 8]; // 각 단계에서 인접하면 이동
  for (const idx of seq) {
    if (canMove(b, idx)) b = move(b, idx);
    assert.equal(isSolvable(b), true);
  }
});
