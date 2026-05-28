/* BF-642 · 테트리스 게임 루프 + 입력 처리 + 렌더링
 * 명세: docs/design/tetris-BF-639.md §6, §7, §9.4
 * 의존: tetris/logic.js (TetrisLogic), tetris/storage.js (TetrisStorage)
 * file:// CORS 안전 — ES module / fetch / 외부 CDN 0건
 */
(function () {
  "use strict";

  var L = window.TetrisLogic;
  var S = window.TetrisStorage;

  if (!L || !S) {
    console.error("[BF-642] TetrisLogic 또는 TetrisStorage 로드 실패");
    return;
  }

  // ── storage ─────────────────────────────────────────────
  var store = S.createTetrisStore(localStorage);

  // ── 게임 상태 ────────────────────────────────────────────
  var state = {
    board:       null,
    current:     null,  // 현재 낙하 중인 피스
    hold:        null,  // 홀드 피스
    holdUsed:    false, // 이번 피스에서 홀드 사용 여부 (연속 홀드 방지)
    nextType:    null,  // 다음 피스 타입
    score:       0,
    lines:       0,
    level:       1,
    highScore:   0,
    status:      "start", // start | playing | paused | gameover
    lastDrop:    0,       // 마지막 낙하 timestamp
    softDropping: false,
  };

  // ── DOM 요소 ─────────────────────────────────────────────
  var boardEl         = document.getElementById("game-board");
  var scoreEl         = document.getElementById("score-value");
  var bestEl          = document.getElementById("best-value");
  var levelEl         = document.getElementById("level-value");
  var linesEl         = document.getElementById("lines-value");
  var nextPreviewEl   = document.getElementById("next-piece-grid");
  var holdPreviewEl   = document.getElementById("hold-piece-grid");
  var holdPanelEl     = document.querySelector(".hud-hold");

  // 오버레이
  var startOverlay    = document.getElementById("overlay-start");
  var pauseOverlay    = document.getElementById("overlay-pause");
  var gameoverOverlay = document.getElementById("overlay-gameover");
  var boardWrapper    = document.querySelector(".board-wrapper");

  // 게임오버 오버레이 통계 요소
  var goScoreEl  = document.getElementById("go-score");
  var goBestEl   = document.getElementById("go-best");
  var goLevelEl  = document.getElementById("go-level");
  var goLinesEl  = document.getElementById("go-lines");
  var goRecordEl = document.getElementById("go-new-record");

  // 시작 화면 최고점
  var startBestEl = document.getElementById("start-best");

  // 스피드 바
  var speedBars = document.querySelectorAll(".speed-bar");

  // 모바일 HUD
  var mobileScoreEl = document.getElementById("m-score-value");
  var mobileLevelEl = document.getElementById("m-level-value");
  var mobileLinesEl = document.getElementById("m-lines-value");

  // 우측 HUD (Tablet 대비)
  var rScoreEl = document.getElementById("r-score-value");
  var rLevelEl = document.getElementById("r-level-value");
  var rLinesEl = document.getElementById("r-lines-value");

  // ── 보드 셀 배열 ──────────────────────────────────────────
  var cells = []; // cells[row][col] = div element

  // ── 초기화 ──────────────────────────────────────────────
  function init() {
    state.highScore = store.loadHighScore();
    var theme = store.loadTheme();
    document.body.dataset.theme = theme;
    document.getElementById("theme-toggle").textContent = theme === "dark" ? "🌙" : "☀️";

    // 보드 셀 생성
    boardEl.innerHTML = "";
    cells = [];
    for (var r = 0; r < L.BOARD_ROWS; r++) {
      cells[r] = [];
      for (var c = 0; c < L.BOARD_COLS; c++) {
        var div = document.createElement("div");
        div.className = "board-cell";
        boardEl.appendChild(div);
        cells[r][c] = div;
      }
    }

    // next 미리보기 셀 생성
    nextPreviewEl.innerHTML = "";
    for (var i = 0; i < 16; i++) {
      var nd = document.createElement("div");
      nd.className = "preview-cell";
      nextPreviewEl.appendChild(nd);
    }

    // hold 미리보기 셀 생성
    holdPreviewEl.innerHTML = "";
    for (var j = 0; j < 16; j++) {
      var hd = document.createElement("div");
      hd.className = "preview-cell";
      holdPreviewEl.appendChild(hd);
    }

    // 이벤트 바인딩
    document.addEventListener("keydown", onKeyDown);
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

    // 버튼 바인딩
    bindBtn("btn-start",         startGame);
    bindBtn("btn-pause-resume",  resumeGame);
    bindBtn("btn-pause-restart", confirmRestart);
    bindBtn("btn-pause-quit",    goToStart);
    bindBtn("btn-go-newgame",    startGame);
    bindBtn("btn-go-quit",       goToStart);

    setStatus("start");
    updateHUD();

    if (startBestEl) {
      startBestEl.innerHTML = "BEST: <span>" + formatScore(state.highScore) + "</span>";
    }
  }

  function bindBtn(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  }

  // ── 게임 시작 ────────────────────────────────────────────
  function startGame() {
    state.board      = L.createBoard();
    state.score      = 0;
    state.lines      = 0;
    state.level      = 1;
    state.hold       = null;
    state.holdUsed   = false;
    state.nextType   = L.PIECE_TYPES[Math.floor(Math.random() * L.PIECE_TYPES.length)];
    spawnNext();
    setStatus("playing");
    state.lastDrop   = performance.now();
    state.softDropping = false;
    requestAnimationFrame(gameLoop);
  }

  function spawnNext() {
    var type = state.nextType;
    state.current  = L.createPiece(type);
    state.current.rotation = 0;
    state.nextType = L.PIECE_TYPES[Math.floor(Math.random() * L.PIECE_TYPES.length)];
    state.holdUsed = false;

    // holdUsed 해제 → 잠김 표시 제거
    if (holdPanelEl) holdPanelEl.classList.remove("hold-locked");

    if (L.isGameOver(state.board, state.current)) {
      triggerGameOver();
    }
  }

  // ── 게임 루프 ────────────────────────────────────────────
  function gameLoop(now) {
    if (state.status !== "playing") return;

    var interval = state.softDropping
      ? Math.min(50, L.calcDropInterval(state.level))
      : L.calcDropInterval(state.level);

    if (now - state.lastDrop >= interval) {
      state.lastDrop = now;
      doGravity();
    }

    render();
    requestAnimationFrame(gameLoop);
  }

  function doGravity() {
    var result = L.softDrop(state.board, state.current);
    if (result.locked) {
      lockPiece();
    } else {
      state.current = result.piece;
    }
  }

  function lockPiece() {
    state.board = L.placePiece(state.board, state.current);
    var cleared = checkAndClearLines();
    spawnNext();
    if (state.status !== "playing") return; // gameover 처리됨
    updateHUD();
    renderPreview(nextPreviewEl, state.nextType);
  }

  function checkAndClearLines() {
    var result = L.clearLines(state.board);
    var cleared = result.cleared;
    if (cleared > 0) {
      // 플래시 애니메이션 — 바로 클리어 (단순성 우선)
      flashLines(state.board, cleared);
      state.board = result.board;
      var gained = L.calcScore(cleared, state.level);
      state.score += gained;
      state.lines += cleared;
      state.level  = L.calcLevel(state.lines);

      // 점수 팝업
      showScorePopup(cleared, gained);

      // 최고점 갱신
      if (state.score > state.highScore) {
        state.highScore = state.score;
        store.saveHighScore(state.highScore);
      }
    }
    return cleared;
  }

  function flashLines(board, cleared) {
    // 아직 클리어 되기 전 보드에서 가득 찬 행 찾기
    var flashRows = [];
    for (var r = 0; r < L.BOARD_ROWS; r++) {
      if (board[r].every(function (c) { return c !== null; })) {
        flashRows.push(r);
      }
    }
    for (var i = 0; i < flashRows.length; i++) {
      var row = flashRows[i];
      for (var c = 0; c < L.BOARD_COLS; c++) {
        cells[row][c].dataset.state = "flash";
        cells[row][c].removeAttribute("data-piece");
      }
    }
    // 플래시 후 클리어 (180ms)
    setTimeout(function () {
      for (var fi = 0; fi < flashRows.length; fi++) {
        for (var fc = 0; fc < L.BOARD_COLS; fc++) {
          cells[flashRows[fi]][fc].dataset.state = "";
        }
      }
    }, 180);
  }

  function showScorePopup(cleared, gained) {
    var popup = document.createElement("div");
    popup.className = "score-popup";
    var texts = ["", "+100", "+300", "+500", "🎉 TETRIS! +800"];
    popup.textContent = cleared === 4
      ? "🎉 TETRIS! +" + gained
      : "+" + gained;
    popup.style.top = "40%";
    boardWrapper.appendChild(popup);
    setTimeout(function () {
      if (popup.parentNode) popup.parentNode.removeChild(popup);
    }, 1000);
  }

  // ── 게임오버 ─────────────────────────────────────────────
  function triggerGameOver() {
    setStatus("gameover");
    if (goScoreEl)  goScoreEl.textContent  = formatScore(state.score);
    if (goBestEl)   goBestEl.textContent   = formatScore(state.highScore);
    if (goLevelEl)  goLevelEl.textContent  = state.level;
    if (goLinesEl)  goLinesEl.textContent  = state.lines;
    if (goRecordEl) {
      goRecordEl.style.display = state.score >= state.highScore && state.score > 0
        ? "inline-block" : "none";
    }
    // 최종 렌더
    render();
  }

  // ── 일시정지 ─────────────────────────────────────────────
  function pauseGame() {
    if (state.status !== "playing") return;
    setStatus("paused");
    var btn = document.getElementById("btn-pause-resume");
    if (btn) btn.focus();
  }

  function resumeGame() {
    if (state.status !== "paused") return;
    setStatus("playing");
    state.lastDrop = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function confirmRestart() {
    startGame();
  }

  function goToStart() {
    setStatus("start");
    if (startBestEl) {
      startBestEl.innerHTML = "BEST: <span>" + formatScore(state.highScore) + "</span>";
    }
  }

  // ── 홀드 ─────────────────────────────────────────────────
  function doHold() {
    if (state.holdUsed) return; // 연속 홀드 금지
    state.holdUsed = true;

    var curType = state.current.type;
    if (state.hold === null) {
      // 홀드가 비어 있으면 현재 피스를 홀드로
      state.hold   = curType;
      spawnNext(); // 새 피스 스폰
    } else {
      // 홀드와 현재 피스 교체
      var tmp      = state.hold;
      state.hold   = curType;
      state.current = L.createPiece(tmp);
      state.current.rotation = 0;
    }
    renderPreview(holdPreviewEl, state.hold);
    if (holdPanelEl) {
      // holdUsed=true이면 잠김 표시
      holdPanelEl.classList.add("hold-locked");
    }
  }

  // ── 렌더링 ─────────────────────────────────────────────
  function render() {
    // 보드 고정 블록
    for (var r = 0; r < L.BOARD_ROWS; r++) {
      for (var c = 0; c < L.BOARD_COLS; c++) {
        var cell = cells[r][c];
        var val  = state.board[r][c];
        if (val) {
          cell.dataset.state = "filled";
          cell.dataset.piece = val;
        } else {
          if (cell.dataset.state !== "flash") {
            cell.dataset.state = "";
            cell.removeAttribute("data-piece");
          }
        }
      }
    }

    if (state.current && state.status === "playing") {
      // 고스트 블록
      var ghostY = L.getGhostY(state.board, state.current);
      renderPieceCells(state.current.shape, state.current.x, ghostY, "ghost", state.current.type);

      // 현재 피스 (active — filled 와 동일 스타일이지만 덮어쓰기)
      renderPieceCells(state.current.shape, state.current.x, state.current.y, "active", state.current.type);
    }
  }

  function renderPieceCells(shape, px, py, stateName, type) {
    for (var r = 0; r < shape.length; r++) {
      for (var c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        var br = py + r;
        var bc = px + c;
        if (br < 0 || br >= L.BOARD_ROWS || bc < 0 || bc >= L.BOARD_COLS) continue;
        cells[br][bc].dataset.state = stateName;
        cells[br][bc].dataset.piece = type;
      }
    }
  }

  // ── 미리보기 렌더링 ─────────────────────────────────────
  function renderPreview(container, type) {
    var previewCells = container.querySelectorAll(".preview-cell");
    for (var i = 0; i < previewCells.length; i++) {
      previewCells[i].removeAttribute("data-piece");
    }
    if (!type) return;

    var def   = L.TETROMINOES[type];
    var shape = def.shape;
    // 4×4 그리드에서 shape 를 중앙에 배치
    var offR  = Math.floor((4 - shape.length) / 2);
    var offC  = Math.floor((4 - shape[0].length) / 2);

    for (var r = 0; r < shape.length; r++) {
      for (var c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        var idx = (offR + r) * 4 + (offC + c);
        if (idx >= 0 && idx < previewCells.length) {
          previewCells[idx].dataset.piece = type;
        }
      }
    }
  }

  // ── HUD 업데이트 ─────────────────────────────────────────
  function updateHUD() {
    if (scoreEl)  scoreEl.textContent  = formatScore(state.score);
    if (bestEl)   bestEl.textContent   = formatScore(state.highScore);
    if (levelEl)  levelEl.textContent  = state.level;
    if (linesEl)  linesEl.textContent  = state.lines;

    // 모바일 HUD
    if (mobileScoreEl) mobileScoreEl.textContent = formatScore(state.score);
    if (mobileLevelEl) mobileLevelEl.textContent = state.level;
    if (mobileLinesEl) mobileLinesEl.textContent = state.lines;

    // 우측 HUD
    if (rScoreEl) rScoreEl.textContent = formatScore(state.score);
    if (rLevelEl) rLevelEl.textContent = state.level;
    if (rLinesEl) rLinesEl.textContent = state.lines;

    updateSpeedBars();
  }

  function updateSpeedBars() {
    var lv = state.level;
    var color = lv <= 3 ? "slow" : lv <= 7 ? "mid" : "fast";
    var active = lv <= 3 ? 1 : lv <= 7 ? 2 : 3;
    for (var i = 0; i < speedBars.length; i++) {
      speedBars[i].dataset.active = i < active ? color : "";
    }
  }

  // ── 숫자 포맷 ────────────────────────────────────────────
  function formatScore(n) {
    return String(n).padStart(6, "0");
  }

  // ── 오버레이 상태 관리 ───────────────────────────────────
  function setStatus(newStatus) {
    state.status = newStatus;
    document.body.dataset.status = newStatus;

    var overlays = [startOverlay, pauseOverlay, gameoverOverlay];
    for (var i = 0; i < overlays.length; i++) {
      if (overlays[i]) {
        overlays[i].classList.remove("overlay--active");
        overlays[i].setAttribute("aria-hidden", "true");
      }
    }

    var active = null;
    if (newStatus === "start")    active = startOverlay;
    if (newStatus === "paused")   active = pauseOverlay;
    if (newStatus === "gameover") active = gameoverOverlay;

    if (active) {
      active.classList.add("overlay--active");
      active.setAttribute("aria-hidden", "false");
    }
  }

  // ── 테마 토글 ────────────────────────────────────────────
  function toggleTheme() {
    var cur = document.body.dataset.theme || "dark";
    var next = cur === "dark" ? "light" : "dark";
    document.body.dataset.theme = next;
    store.saveTheme(next);
    document.getElementById("theme-toggle").textContent = next === "dark" ? "🌙" : "☀️";
  }

  // ── 키보드 입력 (명세 §7) ────────────────────────────────
  function onKeyDown(e) {
    // 일시정지 / 재개
    if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      if (state.status === "playing") pauseGame();
      else if (state.status === "paused") resumeGame();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (state.status === "playing") pauseGame();
      else if (state.status === "paused") resumeGame();
      return;
    }

    // 재시작 (R) — 게임오버 / 일시정지 상태에서만
    if (e.key === "r" || e.key === "R") {
      if (state.status === "gameover" || state.status === "paused") {
        e.preventDefault();
        startGame();
      }
      return;
    }

    // 시작 화면에서 Enter
    if (state.status === "start") {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        startGame();
      }
      return;
    }

    if (state.status !== "playing") return;

    switch (e.key) {
      case "ArrowLeft":
      case "a": case "A":
        e.preventDefault();
        state.current = L.movePiece(state.board, state.current, -1);
        break;

      case "ArrowRight":
      case "d": case "D":
        e.preventDefault();
        state.current = L.movePiece(state.board, state.current, 1);
        break;

      case "ArrowDown":
      case "s": case "S":
        e.preventDefault();
        state.softDropping = true;
        var dr = L.softDrop(state.board, state.current);
        if (dr.locked) {
          lockPiece();
        } else {
          state.current = dr.piece;
          state.score += 1; // 소프트 드롭 1점/셀
          updateHUD();
        }
        break;

      case "ArrowUp":
      case "w": case "W":
      case "x": case "X":
        e.preventDefault();
        var rCW = L.tryRotate(state.board, state.current, true);
        if (rCW) {
          state.current = Object.assign({}, state.current, rCW);
        }
        break;

      case "z": case "Z":
      case "Control":
        e.preventDefault();
        var rCCW = L.tryRotate(state.board, state.current, false);
        if (rCCW) {
          state.current = Object.assign({}, state.current, rCCW);
        }
        break;

      case " ": // 하드 드롭
        e.preventDefault();
        var hd = L.hardDrop(state.board, state.current);
        state.current = hd.piece;
        state.score += hd.cellsDropped * 2; // 2점/셀
        lockPiece();
        updateHUD();
        break;

      case "c": case "C":
      case "Shift":
        e.preventDefault();
        doHold();
        break;

      default:
        break;
    }
  }

  // ── keyup (소프트 드롭 해제) ─────────────────────────────
  document.addEventListener("keyup", function (e) {
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      state.softDropping = false;
    }
  });

  // ── DOMContentLoaded 후 초기화 ───────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
