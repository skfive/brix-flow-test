// Addiction Mini — 카드 이동 클릭 로직 재현 및 회귀 테스트 (BF-1861)
// 버그: 카드 선택 후 목표 빈 칸을 클릭해도 이동/교체되지 않는다.
// 재현/회귀 불변식은 docs/plans/BF-1860/implementation-plan.md §2 를 따른다.
//
// 브라우저가 실제로 실행하는 경로를 검증한다: iteration-check3/src/ui.js 의
// onBoardClick → applyClick → resolveClick(interaction.js). 순수 전이 함수
// resolveClick 을 직접 단언해 DOM 없이 클릭 핸들러의 상태 전이를 확인한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { makeCard, canMove, CELL_COUNT } from '../../iteration-check3/src/game.js';
import { resolveClick, isAnchorCell } from '../../iteration-check3/src/interaction.js';

// 결정적 테스트 보드 구성.
// index 0 = ♥A(앵커), index 1 = 빈 칸(목표 T), index 2 = ♥2(이동 카드 C).
// requirement(board, 1) = { suit:'hearts', rank:2 } 이므로 canMove(board, 2, 1) === true.
// index 5 는 왼쪽(index 4)이 빈 칸이라 dead gap → 유효하지 않은 목표.
function makeFixtureBoard() {
  const board = new Array(CELL_COUNT).fill(null);
  board[0] = makeCard('hearts', 1); // 앵커 Ace
  board[2] = makeCard('hearts', 2); // 이동 가능한 카드 C
  return board;
}

function makeState() {
  return {
    board: makeFixtureBoard(),
    status: 'playing',
    selected: null,
    moves: 0,
    score: 0,
  };
}

test('픽스처 전제: ♥2(idx2) → 빈 칸(idx1) 이동이 규칙상 유효하다', () => {
  const board = makeFixtureBoard();
  assert.equal(canMove(board, 2, 1), true);
  assert.equal(board[1], null); // 목표는 빈 칸
});

// §2 불변식 3 — 이동 가능한 카드 클릭 → selected 설정.
test('카드 클릭 시 해당 인덱스가 selected 로 설정된다', () => {
  const state = makeState();
  const next = resolveClick(state, 2);
  assert.equal(next.selected, 2);
  // 선택만으로는 보드/이동 카운트가 변하지 않는다.
  assert.equal(next.moves, 0);
  assert.deepEqual(next.board, state.board);
});

// §2 불변식 1 — (재현) 선택 + 유효 목표 빈 칸 클릭 → 이동, selected 해제, moves 증가.
// 버그 버전(빈 칸 클릭을 .card 가드로 무시)에서는 이 단언이 실패한다.
test('재현: 카드 선택 후 유효 빈 칸 클릭 시 카드가 이동/교체된다', () => {
  const selected = resolveClick(makeState(), 2); // ① ♥2 선택
  const moved = resolveClick(selected, 1); // ② 목표 빈 칸 클릭

  assert.equal(moved.board[1]?.id, 'H2'); // C 가 T 로 이동
  assert.equal(moved.board[2], null); // 원위치는 비었다
  assert.equal(moved.selected, null); // 선택 해제
  assert.equal(moved.moves, 1); // 이동 카운트 +1
  assert.equal(moved.score, 1); // ♥A→♥2 접두 1장 정렬 → score 1
});

// §2 불변식 2 — 선택 + 유효하지 않은 목표 클릭 → 보드 불변, 선택 유지.
test('선택 후 유효하지 않은 빈 칸 클릭 시 이동하지 않는다', () => {
  const selected = resolveClick(makeState(), 2);
  const invalid = resolveClick(selected, 5); // idx5 는 dead gap

  assert.equal(canMove(selected.board, 2, 5), false); // 전제: 유효하지 않은 목표
  assert.deepEqual(invalid.board, selected.board); // 보드 불변
  assert.equal(invalid.moves, 0); // 이동 없음
  assert.equal(invalid.selected, 2); // 선택 유지
});

// 회귀: 선택 없이 빈 칸을 클릭하면 아무 일도 없다.
test('selected 가 없을 때 빈 칸 클릭은 무반응이다', () => {
  const state = makeState();
  const next = resolveClick(state, 1);
  assert.deepEqual(next.board, state.board);
  assert.equal(next.selected, null);
  assert.equal(next.moves, 0);
});

// §2 불변식 4 — 앵커(col0 Ace)는 선택/이동 대상이 아니다.
test('앵커 카드 클릭은 선택되지 않는다', () => {
  const state = makeState();
  assert.equal(isAnchorCell(0), true);
  const next = resolveClick(state, 0);
  assert.equal(next.selected, null); // 앵커는 선택 불가
  assert.deepEqual(next.board, state.board);
});

// 회귀: 게임 종료(status !== 'playing') 상태에서는 클릭이 무시된다.
test('status 가 playing 이 아니면 클릭이 무시된다', () => {
  const state = { ...makeState(), status: 'won' };
  const afterSelect = resolveClick(state, 2);
  assert.equal(afterSelect.selected, null);
  const afterMove = resolveClick({ ...afterSelect, selected: 2 }, 1);
  assert.deepEqual(afterMove.board, state.board);
  assert.equal(afterMove.moves, 0);
});

// 회귀: 다른 카드를 다시 클릭하면 선택 대상이 갱신된다(자동 이동 없음).
test('선택 중 다른 카드 클릭 시 선택이 갱신된다', () => {
  const board = makeFixtureBoard();
  board[9] = makeCard('spades', 3); // 별도의 비앵커 카드
  const state = { board, status: 'playing', selected: null, moves: 0, score: 0 };

  const first = resolveClick(state, 2);
  assert.equal(first.selected, 2);
  const second = resolveClick(first, 9);
  assert.equal(second.selected, 9); // 선택 갱신
  assert.equal(second.moves, 0); // 이동은 일어나지 않는다
});
