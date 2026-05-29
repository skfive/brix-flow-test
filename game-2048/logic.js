/* game-2048/logic.js — 2048 순수 게임 로직
 * BF-660 · docs/design/2048-BF-657.md §10.1
 * UMD 패턴 — 브라우저: globalThis.Game2048Logic, Node: module.exports
 * file:// CORS 안전 — 외부 의존성 0건, DOM 의존성 0건
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.Game2048Logic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /**
   * 한 행을 왼쪽 방향으로 슬라이드
   * @param {number[]} row - 길이 4 배열 (0 = 빈 셀)
   * @returns {{ row: number[], gained: number }}
   */
  function slideLeft(row) {
    // 0 제거
    var nonZero = row.filter(function (v) { return v !== 0; });
    var result = [];
    var gained = 0;
    var i = 0;

    while (i < nonZero.length) {
      if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
        var val = nonZero[i] * 2;
        result.push(val);
        gained += val;
        i += 2;
      } else {
        result.push(nonZero[i]);
        i++;
      }
    }

    // 0 패딩 (길이 4 유지)
    while (result.length < 4) result.push(0);
    return { row: result, gained: gained };
  }

  /**
   * 보드를 전치(transpose) — 행/열 교환
   * @param {number[][]} board
   * @returns {number[][]}
   */
  function transpose(board) {
    var t = [];
    for (var r = 0; r < 4; r++) {
      t.push([0, 0, 0, 0]);
    }
    for (var rr = 0; rr < 4; rr++) {
      for (var c = 0; c < 4; c++) {
        t[c][rr] = board[rr][c];
      }
    }
    return t;
  }

  /**
   * 보드 전체를 지정 방향으로 이동 (순수 함수 — 입력 board 불변)
   * @param {number[][]} board - 4×4 배열 (0 = 빈 셀)
   * @param {'left'|'right'|'up'|'down'} direction
   * @returns {{ board: number[][], score: number, moved: boolean }}
   */
  function moveBoard(board, direction) {
    var newBoard;
    var totalScore = 0;
    var t, processed;

    if (direction === "left") {
      newBoard = board.map(function (row) {
        var res = slideLeft(row);
        totalScore += res.gained;
        return res.row;
      });
    } else if (direction === "right") {
      newBoard = board.map(function (row) {
        var rev = row.slice().reverse();
        var res = slideLeft(rev);
        totalScore += res.gained;
        return res.row.reverse();
      });
    } else if (direction === "up") {
      t = transpose(board);
      processed = t.map(function (row) {
        var res = slideLeft(row);
        totalScore += res.gained;
        return res.row;
      });
      newBoard = transpose(processed);
    } else if (direction === "down") {
      t = transpose(board);
      processed = t.map(function (row) {
        var rev = row.slice().reverse();
        var res = slideLeft(rev);
        totalScore += res.gained;
        return res.row.reverse();
      });
      newBoard = transpose(processed);
    } else {
      return { board: board, score: 0, moved: false };
    }

    // 변화 여부 확인
    var moved = false;
    outer:
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        if (newBoard[r][c] !== board[r][c]) {
          moved = true;
          break outer;
        }
      }
    }

    return { board: newBoard, score: totalScore, moved: moved };
  }

  /**
   * 현재 보드에서 이동 가능한지 확인
   * @param {number[][]} board
   * @returns {boolean}
   */
  function canMove(board) {
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        if (board[r][c] === 0) return true;
        if (c < 3 && board[r][c] === board[r][c + 1]) return true;
        if (r < 3 && board[r][c] === board[r + 1][c]) return true;
      }
    }
    return false;
  }

  /**
   * 보드에 특정 값이 있는지 확인
   * @param {number[][]} board
   * @param {number} value
   * @returns {boolean}
   */
  function hasValue(board, value) {
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        if (board[r][c] === value) return true;
      }
    }
    return false;
  }

  /**
   * 빈 셀 목록 반환
   * @param {number[][]} board
   * @returns {{row: number, col: number}[]}
   */
  function getEmptyCells(board) {
    var cells = [];
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        if (board[r][c] === 0) cells.push({ row: r, col: c });
      }
    }
    return cells;
  }

  return {
    slideLeft: slideLeft,
    moveBoard: moveBoard,
    canMove: canMove,
    hasValue: hasValue,
    getEmptyCells: getEmptyCells,
  };
});
