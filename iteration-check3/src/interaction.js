// Addiction Mini — 카드 클릭 전이 (2단계 선택→이동). DOM 비의존 순수 함수.
// BF-1861 · game.js 의 canMove/computeScore 만 호출한다.
// ui.js 가 이 결과를 module state/DOM 에 반영하며, 실제 클릭 경로가 여기를 거친다.
import { canMove, computeScore, COLS } from './game.js';

// col0(각 행 1열) 의 Ace 는 고정 앵커 → 선택/이동 대상이 아니다.
export function isAnchorCell(index) {
  return index % COLS === 0;
}

// 현재 state 에서 index 칸 클릭을 순수 계산해 다음 state 를 반환한다(입력 불변).
// state: { board, status, selected, moves, score, ... }
// 2단계 모델: ① 이동 가능한 카드 클릭 → 선택, ② 목표 빈 칸 클릭 → 유효하면 이동.
export function resolveClick(state, index) {
  if (state.status !== 'playing') return { ...state };

  const { board, selected } = state;
  const card = board[index];

  // 카드 칸 클릭 → 선택(앵커는 선택 불가). 자동 이동하지 않는다.
  if (card !== null && card !== undefined) {
    if (isAnchorCell(index) && card.rank === 1) return { ...state };
    return { ...state, selected: index };
  }

  // 빈 칸 클릭 → 선택된 카드가 없거나 목표가 유효하지 않으면 이동하지 않는다.
  if (selected === null || selected === undefined) return { ...state };
  if (!canMove(board, selected, index)) return { ...state }; // 선택 유지

  const nextBoard = board.slice();
  nextBoard[index] = board[selected];
  nextBoard[selected] = null;
  return {
    ...state,
    board: nextBoard,
    selected: null,
    moves: state.moves + 1,
    score: computeScore(nextBoard),
  };
}
