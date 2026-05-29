// BF-660 · 2048 게임 단위 테스트
// 명세: docs/design/2048-BF-657.md
// AC:
//   - AC1: 4×4 보드·타일 합치기·점수 계산 (slideLeft, moveBoard)
//   - AC2: 승리 판정 (hasValue), 게임오버 판정 (canMove)
//   - AC3: 빈 셀 탐색 (getEmptyCells)
//
// game-2048/logic.js — UMD / CommonJS exports

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Logic = require("../game-2048/logic.js");

const { slideLeft, moveBoard, canMove, hasValue, getEmptyCells } = Logic;

// ──────────────────────────────────────────────────────────
// 헬퍼
// ──────────────────────────────────────────────────────────

/** 4×4 빈 보드 생성 */
function emptyBoard() {
  return [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
}

/** 4×4 꽉 찬 보드 (합칠 수 없는 패턴) — 체스판 형태 */
function fullNoMoveBoard() {
  return [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ];
}

// ══════════════════════════════════════════════════════════
// 1. slideLeft — AC1: 한 행 왼쪽 슬라이드 + 합치기
// ══════════════════════════════════════════════════════════

test("slideLeft: 모두 0 → [0,0,0,0], gained=0", () => {
  const r = slideLeft([0, 0, 0, 0]);
  assert.deepEqual(r.row, [0, 0, 0, 0]);
  assert.equal(r.gained, 0);
});

test("slideLeft: 이미 왼쪽 정렬 [2,4,8,16] → 그대로, gained=0", () => {
  const r = slideLeft([2, 4, 8, 16]);
  assert.deepEqual(r.row, [2, 4, 8, 16]);
  assert.equal(r.gained, 0);
});

test("slideLeft: 0 제거 후 이동 [0,2,0,4] → [2,4,0,0]", () => {
  const r = slideLeft([0, 2, 0, 4]);
  assert.deepEqual(r.row, [2, 4, 0, 0]);
  assert.equal(r.gained, 0);
});

test("slideLeft: 인접 동일 합치기 [2,2,0,0] → [4,0,0,0], gained=4", () => {
  const r = slideLeft([2, 2, 0, 0]);
  assert.deepEqual(r.row, [4, 0, 0, 0]);
  assert.equal(r.gained, 4);
});

test("slideLeft: 두 쌍 합치기 [2,2,2,2] → [4,4,0,0], gained=8", () => {
  const r = slideLeft([2, 2, 2, 2]);
  assert.deepEqual(r.row, [4, 4, 0, 0]);
  assert.equal(r.gained, 8);
});

test("slideLeft: 0 사이 동일 합치기 [2,0,2,0] → [4,0,0,0], gained=4", () => {
  const r = slideLeft([2, 0, 2, 0]);
  assert.deepEqual(r.row, [4, 0, 0, 0]);
  assert.equal(r.gained, 4);
});

test("slideLeft: 1+2 연속 합치기 [2,2,4,4] → [4,8,0,0], gained=12", () => {
  const r = slideLeft([2, 2, 4, 4]);
  assert.deepEqual(r.row, [4, 8, 0, 0]);
  assert.equal(r.gained, 12);
});

test("slideLeft: 세 개 중 앞 두 개만 합침 [2,2,2,0] → [4,2,0,0], gained=4", () => {
  const r = slideLeft([2, 2, 2, 0]);
  assert.deepEqual(r.row, [4, 2, 0, 0]);
  assert.equal(r.gained, 4);
});

test("slideLeft: 고값 합치기 [1024,1024,0,0] → [2048,0,0,0], gained=2048", () => {
  const r = slideLeft([1024, 1024, 0, 0]);
  assert.deepEqual(r.row, [2048, 0, 0, 0]);
  assert.equal(r.gained, 2048);
});

test("slideLeft: 반환값 row 길이는 항상 4", () => {
  const cases = [
    [2, 0, 0, 0],
    [2, 2, 2, 2],
    [0, 0, 0, 0],
    [4, 8, 16, 32],
  ];
  for (const c of cases) {
    assert.equal(slideLeft(c).row.length, 4);
  }
});

// ══════════════════════════════════════════════════════════
// 2. moveBoard — AC1: 4방향 이동 + 점수
// ══════════════════════════════════════════════════════════

test("moveBoard left: 이동 발생, score·moved 반환", () => {
  const b = [
    [0, 2, 0, 2],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const { board: nb, score, moved } = moveBoard(b, "left");
  assert.equal(moved, true);
  assert.equal(score, 4);
  assert.equal(nb[0][0], 4);
  assert.equal(nb[0][1], 0);
});

test("moveBoard right: 타일 오른쪽으로 이동", () => {
  const b = [
    [2, 0, 0, 2],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const { board: nb, score, moved } = moveBoard(b, "right");
  assert.equal(moved, true);
  assert.equal(score, 4);
  assert.equal(nb[0][3], 4);
  assert.equal(nb[0][2], 0);
});

test("moveBoard up: 타일 위쪽으로 이동 + 합치기", () => {
  const b = [
    [2, 0, 0, 0],
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const { board: nb, score, moved } = moveBoard(b, "up");
  assert.equal(moved, true);
  assert.equal(score, 4);
  assert.equal(nb[0][0], 4);
  assert.equal(nb[1][0], 0);
});

test("moveBoard down: 타일 아래로 이동 + 합치기", () => {
  const b = [
    [2, 0, 0, 0],
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const { board: nb, score, moved } = moveBoard(b, "down");
  assert.equal(moved, true);
  assert.equal(score, 4);
  assert.equal(nb[3][0], 4);
  assert.equal(nb[2][0], 0);
});

test("moveBoard: 변화 없으면 moved=false, score=0", () => {
  const b = [
    [2, 4, 8, 16],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const { moved, score } = moveBoard(b, "left");
  assert.equal(moved, false);
  assert.equal(score, 0);
});

test("moveBoard: 입력 board 불변 (side-effect 없음)", () => {
  const b = [
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const original = JSON.stringify(b);
  moveBoard(b, "left");
  assert.equal(JSON.stringify(b), original, "원본 board가 변경되었습니다");
});

test("moveBoard: 전체 합치기 시 score 정확히 누적", () => {
  // 4방향 모두 합칠 수 있는 경우
  const b = [
    [2, 2, 4, 4],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const { score } = moveBoard(b, "left");
  // [2,2,4,4] → [4,8,0,0] gained = 4+8=12
  assert.equal(score, 12);
});

test("moveBoard: 알 수 없는 direction → moved=false, score=0", () => {
  const { moved, score } = moveBoard(emptyBoard(), "diagonal");
  assert.equal(moved, false);
  assert.equal(score, 0);
});

// ══════════════════════════════════════════════════════════
// 3. canMove — AC2: 이동 가능 여부 판정
// ══════════════════════════════════════════════════════════

test("canMove: 빈 보드 → true", () => {
  assert.equal(canMove(emptyBoard()), true);
});

test("canMove: 빈 셀 1개 → true", () => {
  const b = fullNoMoveBoard();
  b[0][0] = 0;
  assert.equal(canMove(b), true);
});

test("canMove: 꽉 찼지만 인접 동일값 → true", () => {
  const b = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 4], // 마지막 두 셀 동일
  ];
  assert.equal(canMove(b), true);
});

test("canMove: 꽉 차고 인접 동일값 없음 → false", () => {
  assert.equal(canMove(fullNoMoveBoard()), false);
});

test("canMove: 수직 인접 동일값 → true", () => {
  const b = [
    [2, 4, 2, 4],
    [2, 2, 4, 2], // [0][0]===[1][0] → 수직 인접
    [4, 4, 2, 4],
    [2, 8, 4, 2],
  ];
  assert.equal(canMove(b), true);
});

// ══════════════════════════════════════════════════════════
// 4. hasValue — AC2: 승리 조건 판정
// ══════════════════════════════════════════════════════════

test("hasValue: 2048 타일 있음 → true", () => {
  const b = emptyBoard();
  b[2][3] = 2048;
  assert.equal(hasValue(b, 2048), true);
});

test("hasValue: 2048 타일 없음 → false", () => {
  const b = [
    [2, 4, 8,  16],
    [32, 64, 128, 256],
    [512, 1024, 4, 2],
    [8, 16, 32, 64],
  ];
  assert.equal(hasValue(b, 2048), false);
});

test("hasValue: 빈 보드에서 0 확인 → true", () => {
  assert.equal(hasValue(emptyBoard(), 0), true);
});

test("hasValue: 빈 보드에서 2 확인 → false", () => {
  assert.equal(hasValue(emptyBoard(), 2), false);
});

test("hasValue: 슈퍼 타일 (4096) 감지", () => {
  const b = emptyBoard();
  b[0][0] = 4096;
  assert.equal(hasValue(b, 4096), true);
  assert.equal(hasValue(b, 2048), false);
});

// ══════════════════════════════════════════════════════════
// 5. getEmptyCells — AC3: 빈 셀 탐색
// ══════════════════════════════════════════════════════════

test("getEmptyCells: 빈 보드 → 16개", () => {
  assert.equal(getEmptyCells(emptyBoard()).length, 16);
});

test("getEmptyCells: 꽉 찬 보드 → 0개", () => {
  assert.equal(getEmptyCells(fullNoMoveBoard()).length, 0);
});

test("getEmptyCells: 타일 1개 → 15개", () => {
  const b = emptyBoard();
  b[1][2] = 2;
  const cells = getEmptyCells(b);
  assert.equal(cells.length, 15);
});

test("getEmptyCells: 반환값은 {row, col} 형식", () => {
  const b = emptyBoard();
  b[0][0] = 2;
  b[1][1] = 4;
  const cells = getEmptyCells(b);
  assert.equal(cells.length, 14);
  for (const c of cells) {
    assert.ok("row" in c, "row 필드 없음");
    assert.ok("col" in c, "col 필드 없음");
    assert.ok(c.row >= 0 && c.row < 4, `row 범위 초과: ${c.row}`);
    assert.ok(c.col >= 0 && c.col < 4, `col 범위 초과: ${c.col}`);
  }
});

test("getEmptyCells: 빈 셀 좌표 정확성 검증", () => {
  const b = emptyBoard();
  // (0,0), (1,1), (2,2), (3,3) 에만 타일
  b[0][0] = 2; b[1][1] = 4; b[2][2] = 8; b[3][3] = 16;
  const cells = getEmptyCells(b);
  assert.equal(cells.length, 12);
  // 대각선 셀은 없어야 함
  for (const c of cells) {
    assert.ok(!(c.row === c.col && [0,1,2,3].includes(c.row)),
      `대각선 위치 ${c.row},${c.col}이 빈 셀로 반환됨`);
  }
});
