/* BF-982 · 지뢰찾기 DOM 바인딩 (렌더·이벤트·roving tabindex·접근성)
 * 순수 로직: globalThis.MinesweeperLogic (logic.js)
 * 기획 SSOT: docs/plan/minesweeper-BF-978.md §5.2, §7 · 디자인 SSOT: docs/design/minesweeper-BF-980.md §6
 * vanilla-static — IIFE / 전역, fetch·import·영속저장 0건 */
(function () {
  "use strict";

  var Logic = (typeof globalThis !== "undefined" ? globalThis : window).MinesweeperLogic;
  if (!Logic) return; // 로직 미로드 시 무동작(테스트 환경 방어)

  var boardEl = document.getElementById("board");
  var counterEl = document.getElementById("mine-counter-value");
  var restartBtn = document.getElementById("restart-btn");
  var difficultyEl = document.getElementById("difficulty");
  var bannerEl = document.getElementById("result-banner");
  var bannerTitleEl = document.getElementById("result-title");
  var bannerRestartBtn = document.getElementById("result-restart");

  var state = null;       // 현재 게임 상태
  var difficulty = "beginner";
  var focusRow = 0;       // roving tabindex 활성 셀
  var focusCol = 0;
  var cellEls = [];       // 인덱스 → button 요소 캐시

  // ── 유틸 ──
  function idxOf(r, c) { return r * state.cols + c; }

  function pad3(n) {
    var neg = n < 0;
    var s = String(Math.abs(n));
    while (s.length < 3) s = "0" + s;
    return (neg ? "-" : "") + s;
  }

  // 셀 상태 → 접근성 라벨(planner §7.2)
  function cellLabel(cell) {
    var pos = (cell.row + 1) + "행 " + (cell.col + 1) + "열, ";
    if (cell.state === "flagged") return pos + "깃발";
    if (cell.state === "hidden") return pos + "미확인";
    // revealed
    if (state.status === "lost" && state.explodedCellIndex === idxOf(cell.row, cell.col)) {
      return pos + "폭발한 지뢰";
    }
    if (cell.isMine) return pos + "지뢰";
    if (cell.adjacentMines === 0) return pos + "빈칸";
    return pos + "인접 지뢰 " + cell.adjacentMines + "개";
  }

  // 단일 셀 요소의 시각 속성 갱신
  function paintCell(el, cell) {
    var i = idxOf(cell.row, cell.col);
    el.removeAttribute("data-num");
    el.removeAttribute("data-mine");
    el.textContent = "";

    if (cell.state === "revealed" && cell.isMine) {
      // 공개된 지뢰(패배 시)
      if (state.explodedCellIndex === i) el.setAttribute("data-mine", "exploded");
      else el.setAttribute("data-mine", "revealed");
      el.setAttribute("data-state", "revealed");
      el.textContent = "💣";
    } else if (cell.state === "revealed") {
      el.setAttribute("data-state", "revealed");
      el.setAttribute("data-num", String(cell.adjacentMines));
      if (cell.adjacentMines > 0) el.textContent = String(cell.adjacentMines);
    } else if (cell.state === "flagged") {
      el.setAttribute("data-state", "flagged");
      el.textContent = "🚩";
    } else {
      el.setAttribute("data-state", "hidden");
    }
    el.setAttribute("aria-label", cellLabel(cell));
  }

  // roving tabindex — 활성 셀만 tabindex=0
  function applyTabindex() {
    var activeIdx = idxOf(focusRow, focusCol);
    for (var i = 0; i < cellEls.length; i++) {
      cellEls[i].setAttribute("tabindex", i === activeIdx ? "0" : "-1");
    }
  }

  // 보드 전체 마크업 재생성(난이도 전환·재시작)
  function buildBoard() {
    boardEl.innerHTML = "";
    cellEls = [];
    boardEl.style.setProperty("--cols", String(state.cols));
    boardEl.setAttribute("data-difficulty", difficulty);

    for (var r = 0; r < state.rows; r++) {
      var rowEl = document.createElement("div");
      rowEl.setAttribute("role", "row");
      rowEl.style.display = "contents";
      for (var c = 0; c < state.cols; c++) {
        var cell = state.cells[idxOf(r, c)];
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cell";
        btn.setAttribute("role", "gridcell");
        btn.dataset.row = String(r);
        btn.dataset.col = String(c);
        paintCell(btn, cell);
        rowEl.appendChild(btn);
        cellEls.push(btn);
      }
      boardEl.appendChild(rowEl);
    }
    applyTabindex();
  }

  // 전체 셀 시각 갱신(상태 변경 후)
  function repaint() {
    for (var i = 0; i < cellEls.length; i++) {
      paintCell(cellEls[i], state.cells[i]);
    }
  }

  function updateCounter() {
    var remaining = state.mineCount - state.flaggedCount;
    counterEl.textContent = pad3(remaining);
    if (remaining < 0) counterEl.classList.add("is-negative");
    else counterEl.classList.remove("is-negative");
  }

  function updateBanner() {
    if (state.status === "won" || state.status === "lost") {
      bannerEl.setAttribute("data-result", state.status);
      bannerTitleEl.textContent =
        state.status === "won" ? "🎉 모든 안전한 칸을 찾았습니다" : "💥 지뢰를 밟았습니다";
      bannerEl.hidden = false;
      // 결과를 즉시 인지하도록 다시 하기 버튼으로 포커스 이동(planner §7.1 권장)
      bannerRestartBtn.focus();
    } else {
      bannerEl.hidden = true;
      bannerEl.setAttribute("data-result", "");
    }
  }

  function render() {
    repaint();
    updateCounter();
    updateBanner();
  }

  // ── 게임 조작 ──
  function reset(newDifficulty) {
    difficulty = newDifficulty || difficulty;
    state = Logic.createBoard(difficulty);
    focusRow = 0;
    focusCol = 0;
    // 난이도 라디오 상태 갱신
    var btns = difficultyEl.querySelectorAll("button[data-difficulty]");
    for (var i = 0; i < btns.length; i++) {
      var checked = btns[i].dataset.difficulty === difficulty;
      btns[i].setAttribute("aria-checked", checked ? "true" : "false");
    }
    buildBoard();
    updateCounter();
    bannerEl.hidden = true;
    bannerEl.setAttribute("data-result", "");
  }

  function doOpen(r, c) {
    if (!state || state.status === "won" || state.status === "lost") return;
    state = Logic.openCell(state, r, c);
    render();
  }

  function doFlag(r, c) {
    if (!state || state.status === "won" || state.status === "lost") return;
    state = Logic.toggleFlag(state, r, c);
    render();
  }

  function moveFocus(dr, dc) {
    var nr = focusRow + dr;
    var nc = focusCol + dc;
    if (nr < 0 || nr >= state.rows || nc < 0 || nc >= state.cols) return; // wrap 없음(EC-10)
    focusRow = nr;
    focusCol = nc;
    applyTabindex();
    cellEls[idxOf(focusRow, focusCol)].focus();
  }

  // ── 이벤트 바인딩 ──
  boardEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".cell");
    if (!btn) return;
    doOpen(Number(btn.dataset.row), Number(btn.dataset.col));
  });

  boardEl.addEventListener("contextmenu", function (e) {
    var btn = e.target.closest(".cell");
    if (!btn) return;
    e.preventDefault(); // 기본 컨텍스트 메뉴 억제
    doFlag(Number(btn.dataset.row), Number(btn.dataset.col));
  });

  boardEl.addEventListener("keydown", function (e) {
    var btn = e.target.closest(".cell");
    if (!btn) return;
    var r = Number(btn.dataset.row);
    var c = Number(btn.dataset.col);
    switch (e.key) {
      case "ArrowUp": e.preventDefault(); moveFocus(-1, 0); break;
      case "ArrowDown": e.preventDefault(); moveFocus(1, 0); break;
      case "ArrowLeft": e.preventDefault(); moveFocus(0, -1); break;
      case "ArrowRight": e.preventDefault(); moveFocus(0, 1); break;
      case "Enter":
      case " ":
      case "Spacebar":
        e.preventDefault();
        doOpen(r, c);
        break;
      case "f":
      case "F":
      case "ㄹ": // 한글 IME 상태의 f 키 대응
        e.preventDefault();
        doFlag(r, c);
        break;
      default: break;
    }
  });

  difficultyEl.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-difficulty]");
    if (!btn) return;
    reset(btn.dataset.difficulty);
  });

  restartBtn.addEventListener("click", function () { reset(); });
  bannerRestartBtn.addEventListener("click", function () { reset(); });

  // 초기 게임 시작
  reset("beginner");
})();
