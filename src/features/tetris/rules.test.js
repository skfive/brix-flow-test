/**
 * 테트리스 결정론적 규칙 단위 테스트 — BF-836 (AC1)
 * tests/ (테스터 소유) 와 겹치지 않도록 기능 폴더 내 구현 보조 테스트로 배치.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BOARD_COLS,
  BOARD_ROWS,
  PIECE_TYPES,
  createBoard,
  createPiece,
  createRandomPiece,
  isValidPosition,
  rotateCW,
  rotateCCW,
  tryRotate,
  placePiece,
  clearLines,
  calcScore,
  calcLevel,
  calcDropInterval,
  getGhostY,
  isGameOver,
  softDrop,
  hardDrop,
  movePiece,
} from './rules.js';

/** 특정 셀만 채운 보드를 만든다(테스트 헬퍼). */
function boardWith(cells) {
  const board = createBoard();
  for (const [r, c, v = 'X'] of cells) board[r][c] = v;
  return board;
}

describe('createBoard', () => {
  it('10×20 전부 null 보드를 만든다', () => {
    const b = createBoard();
    assert.equal(b.length, BOARD_ROWS);
    assert.equal(b[0].length, BOARD_COLS);
    assert.ok(b.every((row) => row.every((c) => c === null)));
  });
});

describe('createPiece', () => {
  it('스폰 x = floor((10 - width)/2), y = 0', () => {
    const t = createPiece('T'); // width 3 → x=3
    assert.equal(t.x, 3);
    assert.equal(t.y, 0);
    assert.equal(t.rotation, 0);
    const o = createPiece('O'); // width 2 → x=4
    assert.equal(o.x, 4);
  });
  it('알 수 없는 타입은 RangeError', () => {
    assert.throws(() => createPiece(/** @type {any} */ ('Q')), RangeError);
  });
  it('원본 shape 를 변형하지 않는다(깊은 복사)', () => {
    const p = createPiece('L');
    p.shape[0][0] = 9;
    const p2 = createPiece('L');
    assert.equal(p2.shape[0][0], 0);
  });
});

describe('isValidPosition', () => {
  const shape = [[1, 1], [1, 1]];
  it('보드 내부는 유효', () => {
    assert.equal(isValidPosition(createBoard(), shape, 0, 0), true);
  });
  it('좌/우/바닥 경계를 벗어나면 무효', () => {
    assert.equal(isValidPosition(createBoard(), shape, -1, 0), false);
    assert.equal(isValidPosition(createBoard(), shape, BOARD_COLS - 1, 0), false);
    assert.equal(isValidPosition(createBoard(), shape, 0, BOARD_ROWS - 1), false);
  });
  it('보드 위(행<0)로 넘치는 것은 충돌 아님', () => {
    assert.equal(isValidPosition(createBoard(), shape, 0, -1), true);
  });
  it('이미 블록이 있는 칸은 무효', () => {
    assert.equal(isValidPosition(boardWith([[0, 0]]), shape, 0, 0), false);
  });
});

describe('movePiece', () => {
  it('유효하면 이동, 벽이면 원위치 유지', () => {
    const p = createPiece('O');
    const moved = movePiece(createBoard(), p, 1);
    assert.equal(moved.x, p.x + 1);
    const atWall = { ...p, x: 0 };
    assert.equal(movePiece(createBoard(), atWall, -1).x, 0);
  });
});

describe('rotate helpers', () => {
  it('CW 후 CCW 는 원형 복원', () => {
    const s = createPiece('T').shape;
    assert.deepEqual(rotateCCW(rotateCW(s)), s);
  });
});

describe('tryRotate (SRS)', () => {
  it('빈 보드에서 T 회전 성공 + rotation 증가', () => {
    const p = createPiece('T');
    const rotated = tryRotate(createBoard(), p, true);
    assert.ok(rotated);
    assert.equal(rotated.rotation, 1);
  });
  it('O 피스는 월킥 없이도 항상 성공(형태 불변)', () => {
    const o = createPiece('O');
    const r = tryRotate(createBoard(), o, true);
    assert.ok(r);
  });
  it('회전 결과가 항상 유효 위치다', () => {
    const p = { ...createPiece('I'), x: 0 };
    const r = tryRotate(createBoard(), p, true);
    if (r) assert.equal(isValidPosition(createBoard(), r.shape, r.x, r.y), true);
  });
  it('같은 입력은 항상 같은 결과(결정론)', () => {
    const p = createPiece('J');
    assert.deepEqual(tryRotate(createBoard(), p, true), tryRotate(createBoard(), p, true));
  });
});

describe('getGhostY / hardDrop', () => {
  it('빈 보드에서 고스트 Y 는 바닥에 닿는 위치', () => {
    const p = createPiece('O'); // 2행 높이 → 바닥 y = 20-2 = 18
    assert.equal(getGhostY(createBoard(), p), BOARD_ROWS - 2);
  });
  it('hardDrop 은 고스트 위치로 이동하고 cellsDropped 반환', () => {
    const p = createPiece('O');
    const { piece, cellsDropped } = hardDrop(createBoard(), p);
    assert.equal(piece.y, BOARD_ROWS - 2);
    assert.equal(cellsDropped, BOARD_ROWS - 2);
  });
});

describe('softDrop', () => {
  it('내려갈 수 있으면 y+1, locked=false', () => {
    const p = createPiece('O');
    const r = softDrop(createBoard(), p);
    assert.equal(r.locked, false);
    assert.equal(r.piece.y, 1);
  });
  it('바닥이면 locked=true, 피스 유지', () => {
    const p = { ...createPiece('O'), y: BOARD_ROWS - 2 };
    const r = softDrop(createBoard(), p);
    assert.equal(r.locked, true);
    assert.equal(r.piece.y, BOARD_ROWS - 2);
  });
});

describe('placePiece / clearLines', () => {
  it('가득 찬 한 행을 제거하고 cleared=1, 20행 유지', () => {
    const board = createBoard();
    for (let c = 0; c < BOARD_COLS; c += 1) board[BOARD_ROWS - 1][c] = 'I';
    const { board: next, cleared } = clearLines(board);
    assert.equal(cleared, 1);
    assert.equal(next.length, BOARD_ROWS);
    assert.ok(next[BOARD_ROWS - 1].every((c) => c === null));
  });
  it('4행 동시 클리어(Tetris)', () => {
    const board = createBoard();
    for (let r = BOARD_ROWS - 4; r < BOARD_ROWS; r += 1) {
      for (let c = 0; c < BOARD_COLS; c += 1) board[r][c] = 'I';
    }
    assert.equal(clearLines(board).cleared, 4);
  });
  it('placePiece 는 원본 보드를 변형하지 않는다', () => {
    const board = createBoard();
    placePiece(board, createPiece('O'));
    assert.ok(board.every((row) => row.every((c) => c === null)));
  });
});

describe('calcScore', () => {
  it('라인별 기본 점수 × 레벨', () => {
    assert.equal(calcScore(0, 5), 0);
    assert.equal(calcScore(1, 1), 100);
    assert.equal(calcScore(2, 1), 300);
    assert.equal(calcScore(3, 1), 500);
    assert.equal(calcScore(4, 3), 2400); // 800*3
  });
});

describe('calcLevel', () => {
  it('10줄마다 레벨업, 하한 1', () => {
    assert.equal(calcLevel(0), 1);
    assert.equal(calcLevel(9), 1);
    assert.equal(calcLevel(10), 2);
    assert.equal(calcLevel(29), 3);
  });
});

describe('calcDropInterval', () => {
  it('레벨별 간격, 10 이상은 100ms 캡', () => {
    assert.equal(calcDropInterval(1), 800);
    assert.equal(calcDropInterval(10), 100);
    assert.equal(calcDropInterval(50), 100);
  });
});

describe('isGameOver', () => {
  it('스폰 위치가 기존 블록과 겹치면 true', () => {
    const board = createBoard();
    for (let c = 0; c < BOARD_COLS; c += 1) board[1][c] = 'X';
    assert.equal(isGameOver(board, createPiece('I')), true);
  });
  it('빈 보드에서는 false', () => {
    assert.equal(isGameOver(createBoard(), createPiece('T')), false);
  });
});

describe('createRandomPiece (결정론적 rng 주입)', () => {
  it('rng 값에 따라 결정론적으로 타입 선택', () => {
    const first = createRandomPiece(() => 0);
    assert.equal(first.type, PIECE_TYPES[0]);
    const last = createRandomPiece(() => 0.999);
    assert.equal(last.type, PIECE_TYPES[PIECE_TYPES.length - 1]);
  });
  it('경계값(1 이상) 도 인덱스 범위를 벗어나지 않는다', () => {
    const p = createRandomPiece(() => 1);
    assert.ok(PIECE_TYPES.includes(p.type));
  });
});
