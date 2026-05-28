/* BF-642 · 테트리스 게임 로직 (순수 함수)
 * 명세: docs/design/tetris-BF-639.md §9.5
 * file:// CORS 안전 — ES module / fetch / 외부 CDN 0건
 * UMD 패턴 — 브라우저: globalThis.TetrisLogic, Node: module.exports
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.TetrisLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ── 상수 ────────────────────────────────────────────────
  var BOARD_COLS = 10;
  var BOARD_ROWS = 20;

  // ── 테트로미노 정의 (명세 §2.2.2) ───────────────────────
  // shape: 0=빈칸, 1=블록 (초기 회전 0 상태)
  var TETROMINOES = {
    I: {
      type: "I",
      color: "#00C8D4",
      shape: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    },
    O: {
      type: "O",
      color: "#F5C400",
      shape: [
        [1, 1],
        [1, 1],
      ],
    },
    T: {
      type: "T",
      color: "#A020C8",
      shape: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
    },
    S: {
      type: "S",
      color: "#28C840",
      shape: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
      ],
    },
    Z: {
      type: "Z",
      color: "#E82828",
      shape: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
      ],
    },
    J: {
      type: "J",
      color: "#1468F0",
      shape: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
    },
    L: {
      type: "L",
      color: "#F07800",
      shape: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
      ],
    },
  };

  // 7종 배열 (랜덤 선택용)
  var PIECE_TYPES = ["I", "O", "T", "S", "Z", "J", "L"];

  // ── 낙하 간격 (명세 §9.5) ─────────────────────────────
  var DROP_INTERVALS = [800, 717, 633, 550, 467, 383, 300, 217, 133, 100];

  // ── 점수 기준 (명세 §5.2) ────────────────────────────
  var LINE_SCORES = [0, 100, 300, 500, 800];

  // ── 보드 초기화 ─────────────────────────────────────────
  function createBoard() {
    var board = [];
    for (var r = 0; r < BOARD_ROWS; r++) {
      var row = [];
      for (var c = 0; c < BOARD_COLS; c++) {
        row.push(null);
      }
      board.push(row);
    }
    return board;
  }

  // ── 피스 생성 ────────────────────────────────────────
  function createPiece(type) {
    var def = TETROMINOES[type];
    // shape 깊은 복사
    var shape = def.shape.map(function (row) { return row.slice(); });
    var width = shape[0].length;
    var spawnX = Math.floor((BOARD_COLS - width) / 2);
    return {
      type:  type,
      shape: shape,
      x:     spawnX,
      y:     0,
    };
  }

  // 랜덤 피스 생성
  function createRandomPiece() {
    var t = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    return createPiece(t);
  }

  // ── 충돌 검사 ────────────────────────────────────────
  function isValidPosition(board, shape, px, py) {
    for (var r = 0; r < shape.length; r++) {
      for (var c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        var br = py + r;
        var bc = px + c;
        if (bc < 0 || bc >= BOARD_COLS) return false;
        if (br >= BOARD_ROWS) return false;
        if (br < 0) continue; // 보드 위는 허용
        if (board[br][bc] !== null) return false;
      }
    }
    return true;
  }

  // ── 회전 (시계방향) ──────────────────────────────────
  function rotateCW(shape) {
    var rows = shape.length;
    var cols = shape[0].length;
    var result = [];
    for (var c = 0; c < cols; c++) {
      var newRow = [];
      for (var r = rows - 1; r >= 0; r--) {
        newRow.push(shape[r][c]);
      }
      result.push(newRow);
    }
    return result;
  }

  // ── 회전 (반시계방향) ────────────────────────────────
  function rotateCCW(shape) {
    var rows = shape.length;
    var cols = shape[0].length;
    var result = [];
    for (var c = cols - 1; c >= 0; c--) {
      var newRow = [];
      for (var r = 0; r < rows; r++) {
        newRow.push(shape[r][c]);
      }
      result.push(newRow);
    }
    return result;
  }

  // ── SRS 월킥 테이블 ──────────────────────────────────
  // 간소화 SRS — JLSTZ / I / O 각각 다름
  // [dx, dy] 킥 오프셋 목록 (시계방향 회전 기준)
  var WALL_KICKS_JLSTZ = [
    [ [0,0], [-1,0], [-1,1],  [0,-2], [-1,-2] ], // 0→1
    [ [0,0], [ 1,0], [ 1,-1], [0, 2], [ 1, 2] ], // 1→2
    [ [0,0], [ 1,0], [ 1,1],  [0,-2], [ 1,-2] ], // 2→3
    [ [0,0], [-1,0], [-1,-1], [0, 2], [-1, 2] ], // 3→0
  ];
  var WALL_KICKS_I = [
    [ [0,0], [-2,0], [ 1,0], [-2,-1], [ 1, 2] ], // 0→1
    [ [0,0], [-1,0], [ 2,0], [-1, 2], [ 2,-1] ], // 1→2
    [ [0,0], [ 2,0], [-1,0], [ 2, 1], [-1,-2] ], // 2→3
    [ [0,0], [ 1,0], [-2,0], [ 1,-2], [-2, 1] ], // 3→0
  ];

  /**
   * 회전 시도 (SRS 월킥 포함)
   * @returns {Object|null} 성공 시 {shape, x, y, rotation}, 실패 시 null
   */
  function tryRotate(board, piece, clockwise) {
    var newShape = clockwise ? rotateCW(piece.shape) : rotateCCW(piece.shape);
    var rotation = piece.rotation || 0;
    var fromRot  = clockwise ? rotation : ((rotation + 3) % 4);
    var kicks;
    if (piece.type === "I") {
      kicks = WALL_KICKS_I[fromRot];
    } else if (piece.type === "O") {
      // O는 월킥 없음
      kicks = [[0, 0]];
    } else {
      kicks = WALL_KICKS_JLSTZ[fromRot];
    }

    for (var i = 0; i < kicks.length; i++) {
      var dx = kicks[i][0];
      var dy = kicks[i][1];
      var nx = piece.x + dx;
      var ny = piece.y - dy; // y축 반전 (spec은 위=양수, 화면은 아래=양수)
      if (isValidPosition(board, newShape, nx, ny)) {
        var newRot = clockwise
          ? ((rotation + 1) % 4)
          : ((rotation + 3) % 4);
        return { shape: newShape, x: nx, y: ny, rotation: newRot };
      }
    }
    return null;
  }

  // ── 피스 고정 ────────────────────────────────────────
  function placePiece(board, piece) {
    // 보드 깊은 복사
    var newBoard = board.map(function (row) { return row.slice(); });
    for (var r = 0; r < piece.shape.length; r++) {
      for (var c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        var br = piece.y + r;
        var bc = piece.x + c;
        if (br >= 0 && br < BOARD_ROWS && bc >= 0 && bc < BOARD_COLS) {
          newBoard[br][bc] = piece.type;
        }
      }
    }
    return newBoard;
  }

  // ── 라인 클리어 ─────────────────────────────────────
  function clearLines(board) {
    var cleared = 0;
    var newBoard = [];
    for (var r = 0; r < board.length; r++) {
      if (board[r].every(function (c) { return c !== null; })) {
        cleared++;
      } else {
        newBoard.push(board[r].slice());
      }
    }
    // 제거된 행 수만큼 위에 빈 행 추가
    while (newBoard.length < BOARD_ROWS) {
      var emptyRow = [];
      for (var c = 0; c < BOARD_COLS; c++) emptyRow.push(null);
      newBoard.unshift(emptyRow);
    }
    return { board: newBoard, cleared: cleared };
  }

  // ── 점수 계산 (명세 §5.2) ────────────────────────────
  function calcScore(linesCleared, level) {
    var base = LINE_SCORES[linesCleared] || 0;
    return base * level;
  }

  // ── 레벨 계산 (10줄마다 1레벨 상승) ──────────────────
  function calcLevel(totalLines) {
    return Math.floor(totalLines / 10) + 1;
  }

  // ── 낙하 간격 계산 (명세 §9.5) ───────────────────────
  function calcDropInterval(level) {
    var idx = Math.min(level - 1, DROP_INTERVALS.length - 1);
    return DROP_INTERVALS[idx];
  }

  // ── 고스트 블록 Y 위치 ────────────────────────────────
  function getGhostY(board, piece) {
    var gy = piece.y;
    while (isValidPosition(board, piece.shape, piece.x, gy + 1)) {
      gy++;
    }
    return gy;
  }

  // ── 게임오버 판정 ────────────────────────────────────
  function isGameOver(board, piece) {
    return !isValidPosition(board, piece.shape, piece.x, piece.y);
  }

  // ── 소프트 드롭 (1칸 내리기) ─────────────────────────
  function softDrop(board, piece) {
    if (isValidPosition(board, piece.shape, piece.x, piece.y + 1)) {
      return { piece: Object.assign({}, piece, { y: piece.y + 1 }), locked: false };
    }
    return { piece: piece, locked: true };
  }

  // ── 하드 드롭 (즉시 착지) ────────────────────────────
  function hardDrop(board, piece) {
    var gy = getGhostY(board, piece);
    var dropped = Object.assign({}, piece, { y: gy });
    return { piece: dropped, cellsDropped: gy - piece.y };
  }

  // ── 피스 이동 ────────────────────────────────────────
  function movePiece(board, piece, dx) {
    var nx = piece.x + dx;
    if (isValidPosition(board, piece.shape, nx, piece.y)) {
      return Object.assign({}, piece, { x: nx });
    }
    return piece;
  }

  return {
    BOARD_COLS:        BOARD_COLS,
    BOARD_ROWS:        BOARD_ROWS,
    TETROMINOES:       TETROMINOES,
    PIECE_TYPES:       PIECE_TYPES,
    DROP_INTERVALS:    DROP_INTERVALS,
    createBoard:       createBoard,
    createPiece:       createPiece,
    createRandomPiece: createRandomPiece,
    isValidPosition:   isValidPosition,
    rotateCW:          rotateCW,
    rotateCCW:         rotateCCW,
    tryRotate:         tryRotate,
    placePiece:        placePiece,
    clearLines:        clearLines,
    calcScore:         calcScore,
    calcLevel:         calcLevel,
    calcDropInterval:  calcDropInterval,
    getGhostY:         getGhostY,
    isGameOver:        isGameOver,
    softDrop:          softDrop,
    hardDrop:          hardDrop,
    movePiece:         movePiece,
  };
});
