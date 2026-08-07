// Addiction Mini — 게임 로직 + 카드 이동 클릭 상태 전이 (DOM 비의존, ESM).
// BF-1861 · 카드 선택 → 목표 빈 칸 클릭 시 규칙에 맞게 이동/교체되도록 수정.
// 브라우저가 직접 import 하는 runtime 파일이다. document/window 접근 금지.
//
// 순수 보드 규칙(makeCard/requirement/canMove/checkWin/computeScore 등)은
// iteration-check3/src/game.js 의 frozen planning-contract 시그니처와 동일하며,
// 이 파일에는 BF-1861 의 2단계 클릭 상태 전이(resolveClick)가 추가된다.

export const ROWS = 4;
export const COLS = 7;
export const CELL_COUNT = ROWS * COLS; // 28
export const MAX_RANK = 6;

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_CODE = { hearts: 'H', diamonds: 'D', clubs: 'C', spades: 'S' };
const RED_SUITS = new Set(['hearts', 'diamonds']);

// Card = { id, suit, color, rank }
export function makeCard(suit, rank) {
  return {
    id: `${SUIT_CODE[suit]}${rank}`,
    suit,
    color: RED_SUITS.has(suit) ? 'red' : 'black',
    rank,
  };
}

function colOf(index) {
  return index % COLS;
}

// col0 Ace 앵커 셀 여부.
export function isAnchorCell(index) {
  return colOf(index) === 0;
}

// 빈 칸 toIndex 가 요구하는 카드. 이동 불가(dead gap/비어있지 않음)면 null.
// col0 빈 칸: 임의 무늬 Ace → { suit:null, rank:1 }.
// 그 외: 왼쪽 이웃(같은 행) rank+1 같은 무늬.
export function requirement(board, toIndex) {
  if (board[toIndex] !== null && board[toIndex] !== undefined) return null;
  const col = colOf(toIndex);
  if (col === 0) return { suit: null, rank: 1 };
  const left = board[toIndex - 1];
  if (!left || left.rank >= MAX_RANK) return null; // 왼쪽 빈칸 또는 rank6 → dead gap
  return { suit: left.suit, rank: left.rank + 1 };
}

// fromIndex 카드를 빈 칸 toIndex 로 옮길 수 있는지 판정.
export function canMove(board, fromIndex, toIndex) {
  const card = board[fromIndex];
  if (!card) return false;
  if (board[toIndex] !== null && board[toIndex] !== undefined) return false;
  const req = requirement(board, toIndex);
  if (!req) return false;
  if (req.suit === null) return card.rank === req.rank; // col0 → any Ace
  return card.suit === req.suit && card.rank === req.rank;
}

// 한 상태의 가능한 이동 목록. 각 빈 칸이 요구하는 카드는 최대 1장뿐이라 분기 ≤ 4.
function legalMoves(board) {
  const moves = [];
  for (let to = 0; to < CELL_COUNT; to++) {
    const req = requirement(board, to);
    if (!req) continue;
    for (let from = 0; from < CELL_COUNT; from++) {
      const c = board[from];
      if (!c) continue;
      const match = req.suit === null
        ? c.rank === req.rank
        : (c.suit === req.suit && c.rank === req.rank);
      if (match) {
        moves.push({ from, to });
        break;
      }
    }
  }
  return moves;
}

function applyMove(board, from, to) {
  const nb = board.slice();
  nb[to] = nb[from];
  nb[from] = null;
  return nb;
}

function serialize(board) {
  return board.map((c) => (c ? c.id : '.')).join(',');
}

// 각 행 0~5열 같은 무늬 A→6 + 6열 빈 칸이면 true.
export function checkWin(board) {
  for (let r = 0; r < ROWS; r++) {
    const base = r * COLS;
    const first = board[base];
    if (!first || first.rank !== 1) return false;
    const suit = first.suit;
    for (let c = 0; c < MAX_RANK; c++) {
      const card = board[base + c];
      if (!card || card.suit !== suit || card.rank !== c + 1) return false;
    }
    if (board[base + MAX_RANK] !== null) return false; // col6 은 빈 칸
  }
  return true;
}

// 제한 상한의 DFS + visited 로 승리 도달 가능 여부 판정. 분기 ≤4 라 유계.
export function isSolvable(board) {
  const SEARCH_CAP = 500000;
  const visited = new Set([serialize(board)]);
  const stack = [board];
  let nodes = 0;
  while (stack.length) {
    if (++nodes > SEARCH_CAP) return false;
    const b = stack.pop();
    if (checkWin(b)) return true;
    for (const m of legalMoves(b)) {
      const nb = applyMove(b, m.from, m.to);
      const key = serialize(nb);
      if (!visited.has(key)) {
        visited.add(key);
        stack.push(nb);
      }
    }
  }
  return false;
}

// 행 r 의 올바른 접두(col0 Ace 시작, 같은 무늬 오름차순 연속) 길이.
export function correctPrefixLength(board, r) {
  const base = r * COLS;
  const first = board[base];
  if (!first || first.rank !== 1) return 0;
  const suit = first.suit;
  let len = 1;
  for (let c = 1; c < MAX_RANK; c++) {
    const card = board[base + c];
    if (card && card.suit === suit && card.rank === c + 1) len++;
    else break;
  }
  return len;
}

// SCORE = 고정 앵커(col0 Ace) 를 제외한, 올바르게 놓인 카드 수. 초기 0, 승리 20.
export function computeScore(board) {
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    const len = correctPrefixLength(board, r);
    if (len > 0) score += len - 1;
  }
  return score;
}

function solvedBoard() {
  const b = new Array(CELL_COUNT).fill(null);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < MAX_RANK; c++) {
      b[r * COLS + c] = makeCard(SUITS[r], c + 1);
    }
    // col6 = null
  }
  return b;
}

function fisherYates(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// 역이동 후보: 카드 e 를 빈 칸 p 로 되돌려도 (정방향 이동이 존재해) 여전히 solvable.
// col0 앵커(Ace)는 소스에서 제외해 각 행 1열에 고정 유지.
function reverseMoves(board) {
  const res = [];
  const empties = [];
  for (let i = 0; i < CELL_COUNT; i++) if (board[i] === null) empties.push(i);
  for (let e = 0; e < CELL_COUNT; e++) {
    const c = board[e];
    if (!c) continue;
    if (colOf(e) === 0) continue; // 앵커 고정
    const left = board[e - 1];
    if (!left || left.suit !== c.suit || left.rank !== c.rank - 1) continue;
    for (const p of empties) {
      if (p === e || p === e - 1) continue;
      res.push({ e, p });
    }
  }
  return res;
}

function reverseScramble(board, steps, rand) {
  const b = board.slice();
  for (let i = 0; i < steps; i++) {
    const moves = reverseMoves(b);
    if (moves.length === 0) break;
    const { e, p } = moves[Math.floor(rand() * moves.length)];
    b[p] = b[e];
    b[e] = null;
  }
  return b;
}

// 24장 + 빈칸 4 배치이며 isSolvable=true 인 보드 반환.
// 풀린 상태(solved)에서 앵커 보존 역이동으로 섞어 solvable 을 보장.
export function createBoard() {
  const solved = solvedBoard();
  let board = solved;
  for (let attempt = 0; attempt < 50; attempt++) {
    const b = reverseScramble(solved, 90, Math.random);
    if (!checkWin(b) && isSolvable(b)) return b;
    board = b;
  }
  return board;
}

// 올바른 접두(locked)를 보존한 채 나머지를 재배치. 결과는 isSolvable=true 보장.
export function shuffle(board) {
  const locked = new Set();
  for (let r = 0; r < ROWS; r++) {
    const len = correctPrefixLength(board, r);
    for (let c = 0; c < len; c++) locked.add(board[r * COLS + c].id);
  }
  const free = [];
  for (const cell of board) if (cell && !locked.has(cell.id)) free.push(cell);

  for (let attempt = 0; attempt < 200; attempt++) {
    const pool = fisherYates(free.slice(), Math.random);
    const nb = new Array(CELL_COUNT).fill(null);
    let idx = 0;
    for (let r = 0; r < ROWS; r++) {
      const base = r * COLS;
      const len = correctPrefixLength(board, r);
      for (let c = 0; c < len; c++) nb[base + c] = board[base + c]; // locked 접두
      // col `len` → 빈 칸, 그 뒤를 섞인 카드로 채움
      for (let c = len + 1; c < COLS; c++) nb[base + c] = pool[idx++];
    }
    if (!checkWin(nb) && isSolvable(nb)) return nb;
  }
  return createBoard(); // 유한 재시도 실패 시 새 solvable 보드로 대체
}

// --- BF-1861: 2단계 카드 이동 클릭 상태 전이 (버그 수정 핵심) ---------------
//
// 인터랙션 상태: { board, status, selected, moves, score }.
// 기존 버그: 카드 클릭이 곧바로 "첫 번째 유효 빈 칸"으로 자동 이동하고,
//   목표 빈 칸 클릭은 처리 경로가 없어 무시되었다(선택→목표 2단계 미구현).
// 수정: 카드 클릭 → 선택, 빈 칸 클릭 → 선택 카드를 그 목표 칸으로 이동.
//
// 순수 함수(DOM 비의존)이므로 UI 층은 반환된 state 를 렌더에만 반영한다.

// 선택 카드를 목표 빈 칸으로 이동한 새 state 를 반환.
function applyMoveState(state, from, to) {
  const board = state.board.slice();
  board[to] = board[from];
  board[from] = null;
  const won = checkWin(board);
  return {
    ...state,
    board,
    selected: null,
    moves: state.moves + 1,
    score: computeScore(board),
    status: won ? 'won' : state.status,
  };
}

/**
 * 보드 셀 클릭에 대한 상태 전이 (순수).
 * - status !== 'playing' 이면 무변.
 * - 앵커(col0 Ace) 클릭 → 무시(선택 불가).
 * - 그 외 카드 클릭 → selected = index (하이라이트용, 이동 없음).
 * - 빈 칸 클릭 + selected 존재 + canMove(...) → 이동 적용(moves+1, score 재계산, selected 해제).
 * - 빈 칸 클릭 + 유효하지 않음/미선택 → 무변(선택 유지).
 * @param {{board: Array, status: string, selected: number|null, moves: number, score: number}} state
 * @param {number} index 클릭한 셀 인덱스
 * @returns 새 state (입력 state 는 변경하지 않음)
 */
export function resolveClick(state, index) {
  if (state.status !== 'playing') return state;

  const target = state.board[index];

  // 카드 클릭 → 선택 (앵커 제외).
  if (target !== null && target !== undefined) {
    if (isAnchorCell(index) && target.rank === 1) return state; // 앵커 이동/선택 불가
    return { ...state, selected: index };
  }

  // 빈 칸 클릭 → 선택 카드를 목표 칸으로 이동.
  if (state.selected === null) return state; // 선택 없음 → 무반응
  if (!canMove(state.board, state.selected, index)) return state; // 유효하지 않은 목표 → 선택 유지
  return applyMoveState(state, state.selected, index);
}
