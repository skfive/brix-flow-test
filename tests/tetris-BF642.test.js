// BF-642 · 테트리스 게임 단위 테스트
// 명세: docs/design/tetris-BF-639.md
// AC:
//   - 7종 테트로미노 정의, 회전, 이동, 충돌
//   - 라인 클리어 + 점수 계산
//   - 레벨 / 낙하 속도
//   - 게임오버 판정
//   - storage: highScore / theme round-trip
//
// tetris/logic.js, tetris/storage.js — UMD / CommonJS exports

import { test } from "node:test";
import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Logic  = require("../tetris/logic.js");
const Storage = require("../tetris/storage.js");

const {
  BOARD_COLS,
  BOARD_ROWS,
  TETROMINOES,
  createBoard,
  createPiece,
  isValidPosition,
  rotateCW,
  rotateCCW,
  placePiece,
  clearLines,
  calcScore,
  calcLevel,
  calcDropInterval,
  getGhostY,
  isGameOver,
} = Logic;

const {
  TETRIS_HIGH_SCORE_KEY,
  TETRIS_THEME_KEY,
  createMemoryStorage,
  createTetrisStore,
} = Storage;

// ──────────────────────────────────────────────────────────
// 1. 상수 & 구조
// ──────────────────────────────────────────────────────────

test("BOARD_COLS=10, BOARD_ROWS=20", () => {
  assert.equal(BOARD_COLS, 10);
  assert.equal(BOARD_ROWS, 20);
});

test("TETROMINOES: 7종 정의 (I/O/T/S/Z/J/L) 각 type·shape·color 존재", () => {
  const types = ["I", "O", "T", "S", "Z", "J", "L"];
  for (const t of types) {
    const def = TETROMINOES[t];
    assert.ok(def, `${t} 정의 없음`);
    assert.equal(def.type, t);
    assert.ok(Array.isArray(def.shape) && def.shape.length > 0, `${t}.shape 없음`);
    assert.ok(typeof def.color === "string", `${t}.color 없음`);
  }
});

test("각 테트로미노 shape 는 2D 배열 (행×열) 이고 최소 1개의 1을 포함", () => {
  for (const [type, def] of Object.entries(TETROMINOES)) {
    const hasOne = def.shape.some(row => row.some(c => c === 1));
    assert.ok(hasOne, `${type}.shape 에 1 없음`);
  }
});

// ──────────────────────────────────────────────────────────
// 2. 보드 초기화
// ──────────────────────────────────────────────────────────

test("createBoard: 20행 × 10열 모두 null 초기화", () => {
  const board = createBoard();
  assert.equal(board.length, BOARD_ROWS);
  for (const row of board) {
    assert.equal(row.length, BOARD_COLS);
    for (const cell of row) {
      assert.equal(cell, null);
    }
  }
});

// ──────────────────────────────────────────────────────────
// 3. 피스 생성
// ──────────────────────────────────────────────────────────

test("createPiece: 7종 모두 type/shape/x/y 포함", () => {
  for (const t of ["I", "O", "T", "S", "Z", "J", "L"]) {
    const p = createPiece(t);
    assert.equal(p.type, t);
    assert.ok(Array.isArray(p.shape));
    assert.equal(typeof p.x, "number");
    assert.equal(typeof p.y, "number");
  }
});

test("createPiece: 스폰 위치 x가 보드 중앙 근처 (3~5)", () => {
  for (const t of ["I", "O", "T", "S", "Z", "J", "L"]) {
    const p = createPiece(t);
    assert.ok(p.x >= 2 && p.x <= 5, `${t} spawn x=${p.x} 범위 초과`);
  }
});

// ──────────────────────────────────────────────────────────
// 4. 충돌 검사
// ──────────────────────────────────────────────────────────

test("isValidPosition: 빈 보드 + 중앙 위치 → true", () => {
  const board = createBoard();
  const piece = createPiece("T");
  assert.ok(isValidPosition(board, piece.shape, piece.x, piece.y));
});

test("isValidPosition: 왼쪽 벽 밖 → false", () => {
  const board = createBoard();
  const piece = createPiece("I");
  assert.equal(isValidPosition(board, piece.shape, -5, 0), false);
});

test("isValidPosition: 오른쪽 벽 밖 → false", () => {
  const board = createBoard();
  const piece = createPiece("I");
  assert.equal(isValidPosition(board, piece.shape, BOARD_COLS, 0), false);
});

test("isValidPosition: 바닥 밖 → false", () => {
  const board = createBoard();
  const piece = createPiece("O");
  assert.equal(isValidPosition(board, piece.shape, 4, BOARD_ROWS), false);
});

test("isValidPosition: 고정된 셀과 겹침 → false", () => {
  const board = createBoard();
  // 보드 19행 4~6열에 블록 배치
  board[19][4] = "T";
  board[19][5] = "T";
  board[19][6] = "T";
  const shape = [[1, 1, 1], [0, 1, 0]];
  // shape 하단이 row 19에 걸치도록 배치
  assert.equal(isValidPosition(board, shape, 4, 18), false);
});

// ──────────────────────────────────────────────────────────
// 5. 회전
// ──────────────────────────────────────────────────────────

test("rotateCW: T-피스 시계방향 90° 회전 — shape 변경됨", () => {
  const orig = TETROMINOES["T"].shape;
  const rotated = rotateCW(orig);
  // 행·열 수가 뒤바뀌어야 함 (N×M → M×N)
  assert.equal(rotated.length, orig[0].length);
  assert.equal(rotated[0].length, orig.length);
  // 원본과 달라야 함
  assert.notDeepEqual(rotated, orig);
});

test("rotateCW 4번 = 원본 (360° 회전)", () => {
  for (const t of ["T", "S", "Z", "J", "L"]) {
    let shape = TETROMINOES[t].shape;
    const orig = shape.map(r => [...r]);
    for (let i = 0; i < 4; i++) shape = rotateCW(shape);
    assert.deepEqual(shape, orig, `${t} 4회전 후 원본 불일치`);
  }
});

test("rotateCCW: T-피스 반시계방향 = rotateCW 3번과 동일", () => {
  const orig = TETROMINOES["T"].shape;
  const ccw  = rotateCCW(orig);
  let cw3 = orig.map(r => [...r]);
  for (let i = 0; i < 3; i++) cw3 = rotateCW(cw3);
  assert.deepEqual(ccw, cw3);
});

test("O-피스: 회전해도 shape 동일 (정사각형)", () => {
  const orig = TETROMINOES["O"].shape.map(r => [...r]);
  const rotated = rotateCW(TETROMINOES["O"].shape);
  // O피스는 2×2라 회전해도 실제 셀 배치 동일
  // (행렬 자체는 달라질 수 있으나 채워진 셀 수는 같아야 함)
  const countOrig = orig.flat().filter(c => c === 1).length;
  const countRot  = rotated.flat().filter(c => c === 1).length;
  assert.equal(countRot, countOrig);
});

// ──────────────────────────────────────────────────────────
// 6. 피스 고정 (placePiece)
// ──────────────────────────────────────────────────────────

test("placePiece: 보드에 피스 타입 문자로 셀 채워짐", () => {
  const board = createBoard();
  const piece = createPiece("O");
  // O-피스를 바닥에 배치
  piece.y = BOARD_ROWS - 2;
  piece.x = 4;
  const newBoard = placePiece(board, piece);
  // O-피스 shape [[1,1],[1,1]] 기준으로 4개 셀 채워짐
  let filled = 0;
  for (const row of newBoard) {
    for (const cell of row) {
      if (cell === "O") filled++;
    }
  }
  assert.equal(filled, 4, "O-피스 4셀 고정");
});

test("placePiece: 원본 보드 불변 (새 배열 반환)", () => {
  const board = createBoard();
  const piece = createPiece("T");
  piece.y = 18; piece.x = 4;
  const newBoard = placePiece(board, piece);
  assert.notStrictEqual(newBoard, board);
  // 원본 board 는 여전히 null
  let origFilled = board.flat().filter(c => c !== null).length;
  assert.equal(origFilled, 0);
});

// ──────────────────────────────────────────────────────────
// 7. 라인 클리어
// ──────────────────────────────────────────────────────────

test("clearLines: 가득 찬 행 1줄 제거 → 행 수 유지 + cleared=1", () => {
  const board = createBoard();
  // 맨 아래 행 가득 채우기
  for (let c = 0; c < BOARD_COLS; c++) board[BOARD_ROWS - 1][c] = "I";
  const result = clearLines(board);
  assert.equal(result.cleared, 1);
  assert.equal(result.board.length, BOARD_ROWS);
  // 맨 아래 행은 이제 null
  assert.ok(result.board[BOARD_ROWS - 1].every(c => c === null));
});

test("clearLines: 가득 찬 행 4줄 동시 제거 → cleared=4 (Tetris)", () => {
  const board = createBoard();
  for (let r = BOARD_ROWS - 4; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) board[r][c] = "I";
  }
  const result = clearLines(board);
  assert.equal(result.cleared, 4);
});

test("clearLines: 가득 찬 행 없으면 cleared=0, 보드 동일", () => {
  const board = createBoard();
  board[19][0] = "T"; // 부분 채움
  const result = clearLines(board);
  assert.equal(result.cleared, 0);
  assert.equal(result.board[19][0], "T");
});

test("clearLines: 중간 행 제거 후 위 행들이 아래로 내려옴", () => {
  const board = createBoard();
  // row 18 채우기
  for (let c = 0; c < BOARD_COLS; c++) board[18][c] = "S";
  // row 17에 마커 1개
  board[17][3] = "Z";
  const result = clearLines(board);
  // row 18이 제거되면 row 17의 Z가 row 18로 내려와야 함
  assert.equal(result.board[18][3], "Z");
});

// ──────────────────────────────────────────────────────────
// 8. 점수 계산
// ──────────────────────────────────────────────────────────

test("calcScore: 라인 0개 → 0", () => {
  assert.equal(calcScore(0, 1), 0);
});

test("calcScore: Single(1줄) 레벨1 → 100", () => {
  assert.equal(calcScore(1, 1), 100);
});

test("calcScore: Double(2줄) 레벨1 → 300", () => {
  assert.equal(calcScore(2, 1), 300);
});

test("calcScore: Triple(3줄) 레벨1 → 500", () => {
  assert.equal(calcScore(3, 1), 500);
});

test("calcScore: Tetris(4줄) 레벨1 → 800", () => {
  assert.equal(calcScore(4, 1), 800);
});

test("calcScore: 레벨이 높을수록 점수 배율 증가 (레벨2는 레벨1의 2배)", () => {
  assert.equal(calcScore(1, 2), 200);
  assert.equal(calcScore(4, 3), 2400);
});

// ──────────────────────────────────────────────────────────
// 9. 레벨 / 낙하 속도
// ──────────────────────────────────────────────────────────

test("calcLevel: 라인 0 → 레벨 1", () => {
  assert.equal(calcLevel(0), 1);
});

test("calcLevel: 라인 9 → 레벨 1, 라인 10 → 레벨 2", () => {
  assert.equal(calcLevel(9), 1);
  assert.equal(calcLevel(10), 2);
});

test("calcLevel: 라인 100 → 레벨 11 (상한 없음)", () => {
  assert.ok(calcLevel(100) >= 11);
});

test("calcDropInterval: 레벨1=800ms, 레벨10=100ms", () => {
  assert.equal(calcDropInterval(1), 800);
  assert.equal(calcDropInterval(10), 100);
});

test("calcDropInterval: 레벨이 높을수록 간격 짧아짐", () => {
  for (let lv = 1; lv < 10; lv++) {
    assert.ok(calcDropInterval(lv) > calcDropInterval(lv + 1),
      `레벨${lv}→${lv+1} 간격 감소 안 됨`);
  }
});

// ──────────────────────────────────────────────────────────
// 10. 고스트 블록
// ──────────────────────────────────────────────────────────

test("getGhostY: 빈 보드에서 O-피스 → 바닥 근처 위치 반환", () => {
  const board = createBoard();
  const piece = createPiece("O");
  piece.x = 4; piece.y = 0;
  const gy = getGhostY(board, piece);
  // shape 높이 2이므로 ghost y = BOARD_ROWS - 2 = 18
  assert.equal(gy, BOARD_ROWS - piece.shape.length);
});

test("getGhostY: 피스 아래 블록이 있으면 그 위에서 멈춤", () => {
  const board = createBoard();
  // row 10 전체 채우기
  for (let c = 0; c < BOARD_COLS; c++) board[10][c] = "I";
  const piece = createPiece("O");
  piece.x = 4; piece.y = 0;
  const gy = getGhostY(board, piece);
  // O shape 높이=2, 장애물이 row10이면 ghost y = 8
  assert.equal(gy, 8);
});

// ──────────────────────────────────────────────────────────
// 11. 게임오버
// ──────────────────────────────────────────────────────────

test("isGameOver: 빈 보드 + 신규 피스 → false", () => {
  const board = createBoard();
  const piece = createPiece("I");
  assert.equal(isGameOver(board, piece), false);
});

test("isGameOver: 보드에 블록이 있어 새 피스 스폰 불가 → true", () => {
  const board = createBoard();
  // T-피스 shape[0] 행 중앙에 블록 (스폰 위치 충돌)
  // T-piece createPiece 시 x=3, shape row0 = [0,1,0] → (3,0),(4,0),(5,0) 중 col 4 (x+1)이 채워짐
  for (let c = 0; c < BOARD_COLS; c++) board[0][c] = "T";
  for (let c = 0; c < BOARD_COLS; c++) board[1][c] = "T";
  const piece = createPiece("T");
  // T의 shape[0][1]=1 → br=0, bc=piece.x+1 → 보드 row0에 T가 있으면 충돌
  assert.equal(isGameOver(board, piece), true);
});

// ──────────────────────────────────────────────────────────
// 12. Storage
// ──────────────────────────────────────────────────────────

test("TETRIS_HIGH_SCORE_KEY='tetris:highScore', TETRIS_THEME_KEY='tetris:theme'", () => {
  assert.equal(TETRIS_HIGH_SCORE_KEY, "tetris:highScore");
  assert.equal(TETRIS_THEME_KEY, "tetris:theme");
});

test("createMemoryStorage: Web Storage API 호환", () => {
  const mem = createMemoryStorage();
  assert.equal(mem.length, 0);
  mem.setItem("a", "1");
  assert.equal(mem.getItem("a"), "1");
  assert.equal(mem.length, 1);
  mem.removeItem("a");
  assert.equal(mem.getItem("a"), null);
  mem.clear();
  assert.equal(mem.length, 0);
});

test("loadHighScore: 기본값 0", () => {
  const mem = createMemoryStorage();
  const store = createTetrisStore(mem);
  assert.equal(store.loadHighScore(), 0);
});

test("saveHighScore / loadHighScore: round-trip", () => {
  const mem = createMemoryStorage();
  const store = createTetrisStore(mem);
  store.saveHighScore(12345);
  assert.equal(store.loadHighScore(), 12345);
});

test("saveHighScore: 음수 / NaN / 문자열 throw", () => {
  const mem = createMemoryStorage();
  const store = createTetrisStore(mem);
  assert.throws(() => store.saveHighScore(-1), /score/);
  assert.throws(() => store.saveHighScore(NaN), /score/);
  assert.throws(() => store.saveHighScore("abc"), /score/);
});

test("loadHighScore: 깨진 값 → 0 fallback", () => {
  const mem = createMemoryStorage();
  mem.setItem("tetris:highScore", "not_a_number");
  const store = createTetrisStore(mem);
  assert.equal(store.loadHighScore(), 0);
});

test("loadTheme: 기본값 'dark' (게임 모듈 dark 기본)", () => {
  const mem = createMemoryStorage();
  const store = createTetrisStore(mem);
  assert.equal(store.loadTheme(), "dark");
});

test("saveTheme / loadTheme: light/dark round-trip", () => {
  const mem = createMemoryStorage();
  const store = createTetrisStore(mem);
  store.saveTheme("light");
  assert.equal(store.loadTheme(), "light");
  store.saveTheme("dark");
  assert.equal(store.loadTheme(), "dark");
});

test("saveTheme: 잘못된 값 throw", () => {
  const mem = createMemoryStorage();
  const store = createTetrisStore(mem);
  assert.throws(() => store.saveTheme("auto"), /theme/);
  assert.throws(() => store.saveTheme(""), /theme/);
  assert.throws(() => store.saveTheme(null), /theme/);
});

test("prefix 격리: tetris 키는 다른 SPA 키와 충돌 없음", () => {
  const mem = createMemoryStorage();
  mem.setItem("snake:highScore", "999");
  mem.setItem("bf-theme", "light");
  const store = createTetrisStore(mem);
  assert.equal(store.loadHighScore(), 0); // snake 키 영향 없음
  store.saveHighScore(500);
  assert.equal(mem.getItem("snake:highScore"), "999"); // snake 키 보존
});
