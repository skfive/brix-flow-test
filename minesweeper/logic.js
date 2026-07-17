/* BF-982 · 지뢰찾기 순수 로직 (보드 생성·지뢰 배치·인접수·오픈·flood fill·플래그)
 * 기획 SSOT: docs/plan/minesweeper-BF-978.md §2~§6 (게임 규칙·상태 모델·순수 함수 contract)
 * 디자인 SSOT: docs/design/minesweeper-BF-980.md (시각 계약)
 * file:// CORS 안전 — ES module / fetch / 외부 CDN / 영속 저장 0건
 * UMD 패턴 — 브라우저: globalThis.MinesweeperLogic, Node: module.exports (node --test 대상)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MinesweeperLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // 난이도 프리셋 — planner §2.1 (고전 Windows 지뢰찾기 표준값)
  var DIFFICULTIES = {
    beginner: { cols: 9, rows: 9, mineCount: 10 },
    intermediate: { cols: 16, rows: 16, mineCount: 40 },
    expert: { cols: 30, rows: 16, mineCount: 99 },
  };

  // (row, col) → 1차원 인덱스
  function idx(cols, row, col) {
    return row * cols + col;
  }

  // 8방향 인접 좌표(보드 내에 실재하는 셀만) — planner §2.2 (wrap 없음)
  function neighborIndices(cols, rows, row, col) {
    var out = [];
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var r = row + dr;
        var c = col + dc;
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
        out.push(idx(cols, r, c));
      }
    }
    return out;
  }

  // 상태 객체 깊은 복제(순수 함수 불변성 보장 — planner §6.3)
  function cloneState(state) {
    return {
      status: state.status,
      difficulty: state.difficulty,
      cols: state.cols,
      rows: state.rows,
      mineCount: state.mineCount,
      minesPlaced: state.minesPlaced,
      cells: state.cells.map(function (cell) {
        return {
          row: cell.row,
          col: cell.col,
          isMine: cell.isMine,
          adjacentMines: cell.adjacentMines,
          state: cell.state,
        };
      }),
      revealedSafeCount: state.revealedSafeCount,
      flaggedCount: state.flaggedCount,
      explodedCellIndex: state.explodedCellIndex,
    };
  }

  /**
   * 지뢰 미배치 초기 보드 생성 — planner §6.1
   * @param {'beginner'|'intermediate'|'expert'} difficulty
   * @returns {object} status:'ready', minesPlaced:false, 전체 cell.state='hidden'
   */
  function createBoard(difficulty) {
    var preset = DIFFICULTIES[difficulty];
    if (!preset) {
      throw new Error("알 수 없는 난이도: " + difficulty);
    }
    var cells = [];
    for (var row = 0; row < preset.rows; row++) {
      for (var col = 0; col < preset.cols; col++) {
        cells.push({
          row: row,
          col: col,
          isMine: false,
          adjacentMines: 0,
          state: "hidden",
        });
      }
    }
    return {
      status: "ready",
      difficulty: difficulty,
      cols: preset.cols,
      rows: preset.rows,
      mineCount: preset.mineCount,
      minesPlaced: false,
      cells: cells,
      revealedSafeCount: 0,
      flaggedCount: 0,
      explodedCellIndex: null,
    };
  }

  // 전체 셀의 adjacentMines 재계산 — planner §2.3
  function computeAdjacency(state) {
    for (var i = 0; i < state.cells.length; i++) {
      var cell = state.cells[i];
      if (cell.isMine) {
        cell.adjacentMines = 0;
        continue;
      }
      var neighbors = neighborIndices(state.cols, state.rows, cell.row, cell.col);
      var count = 0;
      for (var n = 0; n < neighbors.length; n++) {
        if (state.cells[neighbors[n]].isMine) count++;
      }
      cell.adjacentMines = count;
    }
  }

  /**
   * 안전구역(클릭 셀 + 8방향 인접 셀)을 제외하고 지뢰 배치 + adjacentMines 계산 — planner §6.1
   * @param {object} state createBoard() 반환값(minesPlaced:false)
   * @param {number} row 최초 클릭 셀 행
   * @param {number} col 최초 클릭 셀 열
   * @param {() => number} [rng] 0~1 난수 생성기(테스트 시 결정적 함수 주입, 기본 Math.random)
   * @returns {object} 새 상태(불변) — minesPlaced:true, isMine/adjacentMines 확정
   */
  function placeMines(state, row, col, rng) {
    var random = typeof rng === "function" ? rng : Math.random;
    var next = cloneState(state);
    var clickedIdx = idx(next.cols, row, col);

    // 안전구역 = 클릭 셀 + 8방향 인접(실재 셀만) — planner §2.3, §0 가정 4
    var safe = {};
    safe[clickedIdx] = true;
    var neighbors = neighborIndices(next.cols, next.rows, row, col);
    for (var s = 0; s < neighbors.length; s++) {
      safe[neighbors[s]] = true;
    }

    // 배치 후보 = 안전구역 제외 전체
    var candidates = [];
    for (var i = 0; i < next.cells.length; i++) {
      if (!safe[i]) candidates.push(i);
    }

    // 폴백(EC-02): 안전구역 확보 불가 시 클릭 셀 1칸만 제외 — planner §2.3, §6.2
    if (candidates.length < next.mineCount) {
      candidates = [];
      for (var j = 0; j < next.cells.length; j++) {
        if (j !== clickedIdx) candidates.push(j);
      }
    }

    // Fisher-Yates 부분 셔플로 mineCount개 무작위 선택
    for (var k = candidates.length - 1; k > 0; k--) {
      var pick = Math.floor(random() * (k + 1));
      var tmp = candidates[k];
      candidates[k] = candidates[pick];
      candidates[pick] = tmp;
    }
    var mineIndices = candidates.slice(0, next.mineCount);
    for (var m = 0; m < mineIndices.length; m++) {
      next.cells[mineIndices[m]].isMine = true;
    }

    computeAdjacency(next);
    next.minesPlaced = true;
    return next;
  }

  // flood fill / 단일 오픈 — 시작 셀부터 스택 순회(§2.5). flagged/revealed 셀은 제외.
  function revealFrom(state, startIdx) {
    var stack = [startIdx];
    while (stack.length) {
      var i = stack.pop();
      var cell = state.cells[i];
      if (cell.state !== "hidden") continue; // flagged/revealed 보존(EC-07)
      cell.state = "revealed";
      state.revealedSafeCount += 1; // flood 대상은 항상 비지뢰
      if (cell.adjacentMines === 0) {
        var neighbors = neighborIndices(state.cols, state.rows, cell.row, cell.col);
        for (var n = 0; n < neighbors.length; n++) {
          if (state.cells[neighbors[n]].state === "hidden") {
            stack.push(neighbors[n]);
          }
        }
      }
    }
  }

  /**
   * 셀 열기(open) — 최초 open 시 지뢰 배치 트리거, flood fill·승패 판정까지 처리 — planner §6.1
   * @param {object} state 현재 게임 상태
   * @param {number} row
   * @param {number} col
   * @param {() => number} [rng] placeMines에 전달할 난수 생성기(최초 open일 때만 사용)
   * @returns {object} 새 게임 상태(불변). no-op 조건은 원본 상태를 그대로 반환.
   */
  function openCell(state, row, col, rng) {
    // 종료 상태 입력 잠금(§2.6, AC-11)
    if (state.status === "won" || state.status === "lost") return state;
    var i = idx(state.cols, row, col);
    var target = state.cells[i];
    if (!target) return state;
    // flagged/revealed no-op(§2.4, AC-09)
    if (target.state === "flagged" || target.state === "revealed") return state;

    // 최초 open 이면 지뢰 배치 후 진행(§2.3)
    var next = state.minesPlaced ? cloneState(state) : placeMines(state, row, col, rng);
    next.status = "playing"; // ready→playing (이미 playing이면 유지)
    var cell = next.cells[i];

    // 지뢰 open → 패배(§2.6, AC-07)
    if (cell.isMine) {
      next.status = "lost";
      next.explodedCellIndex = i;
      for (var m = 0; m < next.cells.length; m++) {
        if (next.cells[m].isMine) next.cells[m].state = "revealed";
      }
      return next;
    }

    // 안전 셀 → flood fill 또는 단일 오픈(§2.5)
    revealFrom(next, i);

    // 승리 판정: 비지뢰 셀 전부 revealed(§2.6, AC-06)
    var safeTotal = next.cols * next.rows - next.mineCount;
    if (next.revealedSafeCount === safeTotal) {
      next.status = "won";
      for (var w = 0; w < next.cells.length; w++) {
        if (next.cells[w].isMine && next.cells[w].state === "hidden") {
          next.cells[w].state = "flagged";
          next.flaggedCount += 1;
        }
      }
    }
    return next;
  }

  /**
   * 셀 플래그 토글 — planner §6.1
   * @param {object} state 현재 게임 상태
   * @param {number} row
   * @param {number} col
   * @returns {object} 새 게임 상태(불변). no-op 조건은 원본 상태를 그대로 반환.
   */
  function toggleFlag(state, row, col) {
    // 종료 상태 입력 잠금(§2.7, AC-11)
    if (state.status === "won" || state.status === "lost") return state;
    var i = idx(state.cols, row, col);
    var target = state.cells[i];
    if (!target) return state;
    // revealed no-op(§2.7, EC-03)
    if (target.state === "revealed") return state;

    var next = cloneState(state);
    var cell = next.cells[i];
    if (cell.state === "hidden") {
      cell.state = "flagged";
      next.flaggedCount += 1;
    } else {
      cell.state = "hidden";
      next.flaggedCount -= 1;
    }
    return next;
  }

  return {
    DIFFICULTIES: DIFFICULTIES,
    createBoard: createBoard,
    placeMines: placeMines,
    openCell: openCell,
    toggleFlag: toggleFlag,
    // 내부 헬퍼(테스트·UI 편의 노출)
    idx: idx,
    neighborIndices: neighborIndices,
  };
});
