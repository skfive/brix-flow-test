/**
 * 테트리스 결정론적 게임 규칙 (순수 함수) — BF-836
 *
 * planner SSOT: docs/planning/tetris-BF-833.md §3~§4
 * 기존 프론트 구현 SSOT: tetris/logic.js (BF-642) 를 렌더링과 분리된 순수 함수로 이식.
 *
 * 설계 원칙
 * - 모든 함수는 입력 상태를 변경하지 않고(불변) 새 값을 반환한다.
 * - 렌더링/DOM/타이머 의존이 전혀 없다 — 브라우저와 node 양쪽에서 동일 동작.
 * - 랜덤 요소(피스 생성)는 주입 가능한 rng 로 분리하여 테스트에서 결정론적으로 재현한다.
 *
 * 브라우저는 `<script type="module">` 로, node 는 `node --test` 로 그대로 import 한다.
 * (이 저장소에는 번들러/빌드 스텝이 없으므로 브라우저가 직접 로드할 수 있도록
 *  ESM + JSDoc 로 작성한다 — 타입은 JSDoc 으로 명시하며 any 를 쓰지 않는다.)
 */

/** @typedef {"I"|"O"|"T"|"S"|"Z"|"J"|"L"} PieceType */
/** @typedef {(PieceType|null)[][]} Board 셀 값은 피스 타입 문자열 또는 빈칸(null) */
/** @typedef {number[][]} Shape 0=빈칸, 1=블록 */
/**
 * @typedef {Object} Piece
 * @property {PieceType} type
 * @property {Shape} shape
 * @property {number} x 좌상단 열 좌표
 * @property {number} y 좌상단 행 좌표(음수 = 보드 위)
 * @property {number} rotation 0~3 회전 상태
 */

/** 보드 크기 (고정). */
export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;

/** 7종 테트로미노 초기(rotation=0) shape 정의. */
export const TETROMINOES = Object.freeze({
  I: { type: 'I', shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  O: { type: 'O', shape: [[1, 1], [1, 1]] },
  T: { type: 'T', shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  S: { type: 'S', shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  Z: { type: 'Z', shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
  J: { type: 'J', shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { type: 'L', shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
});

/** @type {readonly PieceType[]} 랜덤 선택용 7종 배열. */
export const PIECE_TYPES = Object.freeze(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);

/** 레벨별 낙하 간격(ms). index 0 = level 1, 레벨 10 이상은 마지막 값으로 캡. */
export const DROP_INTERVALS = Object.freeze([800, 717, 633, 550, 467, 383, 300, 217, 133, 100]);

/** 동시 클리어 라인 수(index)별 기본 점수. */
export const LINE_SCORES = Object.freeze([0, 100, 300, 500, 800]);

/** SRS 월킥 오프셋 — JLSTZ 공용(회전 상태 fromRot 별 5개). */
const WALL_KICKS_JLSTZ = [
  [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], // 0→1
  [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], // 1→2
  [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], // 2→3
  [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], // 3→0
];

/** SRS 월킥 오프셋 — I 전용. */
const WALL_KICKS_I = [
  [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], // 0→1
  [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], // 1→2
  [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], // 2→3
  [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], // 3→0
];

/**
 * 빈 보드(10×20, 전부 null)를 생성한다.
 * @returns {Board}
 */
export function createBoard() {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => /** @type {PieceType|null} */ (null)),
  );
}

/**
 * 지정 타입의 피스를 스폰 좌표에 생성한다. shape 는 깊은 복사한다.
 * @param {PieceType} type
 * @returns {Piece}
 */
export function createPiece(type) {
  const def = TETROMINOES[type];
  if (!def) {
    throw new RangeError(`알 수 없는 테트로미노 타입입니다: ${String(type)}`);
  }
  const shape = def.shape.map((row) => row.slice());
  const width = shape[0].length;
  return {
    type,
    shape,
    x: Math.floor((BOARD_COLS - width) / 2),
    y: 0,
    rotation: 0,
  };
}

/**
 * 균등 분포로 랜덤 피스를 생성한다(7-bag 아님 — SSOT §9.1).
 * rng 를 주입하면 결정론적으로 재현할 수 있다.
 * @param {() => number} [rng] 0 이상 1 미만 실수를 반환하는 함수. 기본 Math.random.
 * @returns {Piece}
 */
export function createRandomPiece(rng = Math.random) {
  const idx = Math.floor(rng() * PIECE_TYPES.length);
  const clamped = Math.min(PIECE_TYPES.length - 1, Math.max(0, idx));
  return createPiece(PIECE_TYPES[clamped]);
}

/**
 * (shape, px, py) 위치가 보드에서 유효한지(충돌 없는지) 검사한다.
 * 보드 위(행 < 0)로 넘치는 것은 스폰 허용 규칙상 충돌이 아니다.
 * @param {Board} board
 * @param {Shape} shape
 * @param {number} px
 * @param {number} py
 * @returns {boolean}
 */
export function isValidPosition(board, shape, px, py) {
  for (let r = 0; r < shape.length; r += 1) {
    for (let c = 0; c < shape[r].length; c += 1) {
      if (!shape[r][c]) continue;
      const br = py + r;
      const bc = px + c;
      if (bc < 0 || bc >= BOARD_COLS) return false;
      if (br >= BOARD_ROWS) return false;
      if (br < 0) continue; // 보드 위는 허용
      if (board[br][bc] !== null) return false;
    }
  }
  return true;
}

/**
 * shape 를 시계방향 90° 회전한 새 shape 를 반환한다.
 * @param {Shape} shape
 * @returns {Shape}
 */
export function rotateCW(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = [];
  for (let c = 0; c < cols; c += 1) {
    const newRow = [];
    for (let r = rows - 1; r >= 0; r -= 1) newRow.push(shape[r][c]);
    result.push(newRow);
  }
  return result;
}

/**
 * shape 를 반시계방향 90° 회전한 새 shape 를 반환한다.
 * @param {Shape} shape
 * @returns {Shape}
 */
export function rotateCCW(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = [];
  for (let c = cols - 1; c >= 0; c -= 1) {
    const newRow = [];
    for (let r = 0; r < rows; r += 1) newRow.push(shape[r][c]);
    result.push(newRow);
  }
  return result;
}

/**
 * SRS 월킥을 포함한 회전을 시도한다. 5개 오프셋을 순서대로 시도해
 * 첫 유효 위치를 채택하며, 모두 실패하면 null 을 반환한다(회전 실패).
 * @param {Board} board
 * @param {Piece} piece
 * @param {boolean} clockwise
 * @returns {Piece|null} 성공 시 회전 적용된 새 Piece, 실패 시 null
 */
export function tryRotate(board, piece, clockwise) {
  const newShape = clockwise ? rotateCW(piece.shape) : rotateCCW(piece.shape);
  const rotation = piece.rotation || 0;
  const fromRot = clockwise ? rotation : (rotation + 3) % 4;
  let kicks;
  if (piece.type === 'I') kicks = WALL_KICKS_I[fromRot];
  else if (piece.type === 'O') kicks = [[0, 0]];
  else kicks = WALL_KICKS_JLSTZ[fromRot];

  for (const [dx, dy] of kicks) {
    const nx = piece.x + dx;
    const ny = piece.y - dy; // spec: 위=양수, 화면: 아래=양수 → 반전
    if (isValidPosition(board, newShape, nx, ny)) {
      const newRot = clockwise ? (rotation + 1) % 4 : (rotation + 3) % 4;
      return { type: piece.type, shape: newShape, x: nx, y: ny, rotation: newRot };
    }
  }
  return null;
}

/**
 * 피스를 보드에 영구 고정한 새 보드를 반환한다.
 * @param {Board} board
 * @param {Piece} piece
 * @returns {Board}
 */
export function placePiece(board, piece) {
  const newBoard = board.map((row) => row.slice());
  for (let r = 0; r < piece.shape.length; r += 1) {
    for (let c = 0; c < piece.shape[r].length; c += 1) {
      if (!piece.shape[r][c]) continue;
      const br = piece.y + r;
      const bc = piece.x + c;
      if (br >= 0 && br < BOARD_ROWS && bc >= 0 && bc < BOARD_COLS) {
        newBoard[br][bc] = piece.type;
      }
    }
  }
  return newBoard;
}

/**
 * 꽉 찬 행을 제거하고 상단에 빈 행을 채워 20행을 유지한 결과를 반환한다.
 * @param {Board} board
 * @returns {{ board: Board, cleared: number }}
 */
export function clearLines(board) {
  let cleared = 0;
  const kept = [];
  for (const row of board) {
    if (row.every((cell) => cell !== null)) cleared += 1;
    else kept.push(row.slice());
  }
  while (kept.length < BOARD_ROWS) {
    kept.unshift(Array.from({ length: BOARD_COLS }, () => /** @type {PieceType|null} */ (null)));
  }
  return { board: kept, cleared };
}

/**
 * 라인 클리어 점수를 계산한다(결정론적). linesCleared*level 배수.
 * @param {number} linesCleared 0~4
 * @param {number} level 1 이상
 * @returns {number}
 */
export function calcScore(linesCleared, level) {
  const base = LINE_SCORES[linesCleared] || 0;
  return base * level;
}

/**
 * 누적 라인 수로부터 레벨을 파생한다: floor(totalLines/10)+1.
 * @param {number} totalLines 0 이상
 * @returns {number}
 */
export function calcLevel(totalLines) {
  return Math.floor(totalLines / 10) + 1;
}

/**
 * 레벨별 낙하 간격(ms)을 반환한다. 레벨 10 이상은 마지막 값으로 캡.
 * @param {number} level 1 이상
 * @returns {number}
 */
export function calcDropInterval(level) {
  const idx = Math.min(level - 1, DROP_INTERVALS.length - 1);
  return DROP_INTERVALS[Math.max(0, idx)];
}

/**
 * 현재 피스가 즉시 낙하했을 때 도달하는 최종 y(고스트 위치)를 계산한다.
 * @param {Board} board
 * @param {Piece} piece
 * @returns {number}
 */
export function getGhostY(board, piece) {
  let gy = piece.y;
  while (isValidPosition(board, piece.shape, piece.x, gy + 1)) gy += 1;
  return gy;
}

/**
 * 스폰된 피스가 기존 보드와 충돌하면(= 유효하지 않으면) 게임오버.
 * @param {Board} board
 * @param {Piece} piece
 * @returns {boolean}
 */
export function isGameOver(board, piece) {
  return !isValidPosition(board, piece.shape, piece.x, piece.y);
}

/**
 * 소프트 드롭 1칸. 내려갈 수 있으면 y+1 피스, 없으면 락 신호.
 * @param {Board} board
 * @param {Piece} piece
 * @returns {{ piece: Piece, locked: boolean }}
 */
export function softDrop(board, piece) {
  if (isValidPosition(board, piece.shape, piece.x, piece.y + 1)) {
    return { piece: { ...piece, y: piece.y + 1 }, locked: false };
  }
  return { piece, locked: true };
}

/**
 * 하드 드롭 — 고스트 위치까지 즉시 이동. 이동 칸 수도 반환(점수 계산용).
 * @param {Board} board
 * @param {Piece} piece
 * @returns {{ piece: Piece, cellsDropped: number }}
 */
export function hardDrop(board, piece) {
  const gy = getGhostY(board, piece);
  return { piece: { ...piece, y: gy }, cellsDropped: gy - piece.y };
}

/**
 * 좌/우 이동. 이동 후 유효하면 이동한 피스, 아니면 원래 피스(무시).
 * @param {Board} board
 * @param {Piece} piece
 * @param {number} dx -1 또는 +1
 * @returns {Piece}
 */
export function movePiece(board, piece, dx) {
  const nx = piece.x + dx;
  if (isValidPosition(board, piece.shape, nx, piece.y)) return { ...piece, x: nx };
  return piece;
}
