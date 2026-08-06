// svg-puzzle-slider/src/puzzle.js
// 순수 게임 로직 (렌더링/DOM/타이머/window 의존 없음).
// 보드는 길이 16의 1차원 배열: 값 1..15 는 타일 번호, 0 은 빈 칸.
// 목표(solved) 배열: [1..15, 0].
//
// 주의: 이 파일은 순수 함수 집합이다. 모든 상태 전이 함수는 원본을 변형하지 않고
// 새 배열을 반환한다. 무작위(shuffle)는 주입된 rng 로 결정적 테스트가 가능하다.

export const SIZE = 4; // 한 변의 타일 수 (4x4 = 15-퍼즐)
export const TILE_COUNT = SIZE * SIZE; // 16
export const EMPTY = 0; // 빈 칸 값

// 목표(정렬 완료) 보드를 반환한다: [1,2,...,15,0]
export function solvedBoard() {
  const board = [];
  for (let i = 1; i < TILE_COUNT; i++) board.push(i);
  board.push(EMPTY);
  return board;
}

// 승리 판정: board 가 solvedBoard() 와 완전히 동일하면 true
export function isSolved(board) {
  const goal = solvedBoard();
  if (board.length !== goal.length) return false;
  for (let i = 0; i < goal.length; i++) {
    if (board[i] !== goal[i]) return false;
  }
  return true;
}

// 빈 칸(0)의 인덱스를 반환 (없으면 -1)
export function emptyIndex(board) {
  return board.indexOf(EMPTY);
}

// index 타일이 빈 칸과 상하좌우로 인접해 이동 가능하면 true.
// 좌우 이동은 같은 행일 때만 유효(행을 넘어간 잘못된 인접 판정을 방지).
export function canMove(board, index) {
  if (index < 0 || index >= board.length) return false;
  const empty = emptyIndex(board);
  if (index === empty) return false;
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  const erow = Math.floor(empty / SIZE);
  const ecol = empty % SIZE;
  const sameRowAdjacent = row === erow && Math.abs(col - ecol) === 1;
  const sameColAdjacent = col === ecol && Math.abs(row - erow) === 1;
  return sameRowAdjacent || sameColAdjacent;
}

// index 타일을 빈 칸으로 이동한 "새 배열"을 반환 (순수 — 원본 불변).
// 이동 불가면 원본과 동일한 새 배열을 반환하고 상태를 바꾸지 않는다.
export function move(board, index) {
  const next = board.slice();
  if (!canMove(board, index)) return next;
  const empty = emptyIndex(board);
  [next[empty], next[index]] = [next[index], next[empty]];
  return next;
}

// 역위 수(inversion count): 빈 칸(0)을 제외한 순서쌍 중 앞이 뒤보다 큰 개수.
export function countInversions(board) {
  const tiles = board.filter((v) => v !== EMPTY);
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (tiles[i] > tiles[j]) inversions++;
    }
  }
  return inversions;
}

// solvable 판정.
// 짝수 폭(SIZE=4) 퍼즐 규칙: (역위 수 + 빈 칸의 아래에서부터 센 행 번호[1-index])가 홀수이면 solvable.
//   - 빈 칸의 행(위=0) blankRow0 = floor(emptyIndex/SIZE)
//   - 아래에서부터의 행 번호 rowFromBottom = SIZE - blankRow0
export function isSolvable(board) {
  const inversions = countInversions(board);
  const blankRow0 = Math.floor(emptyIndex(board) / SIZE);
  const rowFromBottom = SIZE - blankRow0;
  return (inversions + rowFromBottom) % 2 === 1;
}

// 주입된 rng 로 solvable 하고 아직 solved 가 아닌 보드를 생성한다.
//   - rng: () => number, [0,1) 난수. Fisher–Yates 로 섞는다.
//   - solvable 이 아니면 두 타일을 swap 해 패리티를 보정한다.
//   - 우연히 solved 이면 3-cycle(짝수 순열)로 흐트러뜨려 solvable 을 유지한 채 unsolved 로 만든다.
export function shuffle(rng) {
  const board = solvedBoard();
  // Fisher–Yates (rng 호출 횟수는 고정 → 같은 시드면 결정적)
  for (let i = board.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [board[i], board[j]] = [board[j], board[i]];
  }

  // 비-빈 칸 인덱스 목록
  const nonEmpty = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== EMPTY) nonEmpty.push(i);
  }

  // 패리티 보정: 두 타일 swap 은 역위 수 패리티를 반전시켜 solvable 로 만든다.
  if (!isSolvable(board)) {
    const [a, b] = nonEmpty;
    [board[a], board[b]] = [board[b], board[a]];
  }

  // solved 배제: 3-cycle 은 짝수 순열이라 solvable 을 보존하면서 반드시 unsolved 로 만든다.
  if (isSolved(board)) {
    const [a, b, c] = nonEmpty;
    const tmp = board[a];
    board[a] = board[b];
    board[b] = board[c];
    board[c] = tmp;
  }

  return board;
}
