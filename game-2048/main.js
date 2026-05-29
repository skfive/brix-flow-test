/* game-2048/main.js — DOM 렌더링 + 게임 루프
 * BF-660 · docs/design/2048-BF-657.md §10.1, §10.3, §10.5
 * 의존성: logic.js (Game2048Logic) — 외부 CDN 0건
 * localStorage 키: game2048:bestScore, game2048:theme, game2048:board, game2048:score
 */
(function () {
  "use strict";

  var Logic = window.Game2048Logic;

  // ── 게임 상태 ──────────────────────────────────────────────
  var score = 0;
  var bestScore = 0;
  // 'playing' | 'gameover' | 'win' | 'won-continue'
  var gState = "playing";
  var winShown = false;
  var busy = false;
  var nextId = 0;

  // board[r][c] = tile id (1+) 또는 0
  var board = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  // tiles: id -> {id, value, row, col}
  var tiles = {};
  // DOM elements per tile id
  var els = {};

  // ── DOM 참조 ────────────────────────────────────────────────
  var tilesEl    = document.getElementById("tile-container");
  var cellsEl    = document.querySelector(".board__cells");
  var scoreValEl = document.getElementById("score-value");
  var bestValEl  = document.getElementById("best-value");
  var scoreBoxEl = document.getElementById("score-box");
  var finalScEl  = document.getElementById("final-score");
  var ovGO       = document.getElementById("overlay-gameover");
  var ovWin      = document.getElementById("overlay-win");
  var themeToggle = document.getElementById("theme-toggle");
  var btnNewGame = document.getElementById("btn-new-game");
  var btnRetry   = document.getElementById("btn-retry");
  var btnCont    = document.getElementById("btn-continue");
  var btnNewWin  = document.getElementById("btn-new-from-win");

  // ── 초기화 ─────────────────────────────────────────────────
  function init() {
    // 빈 셀 16개 생성
    cellsEl.innerHTML = "";
    for (var i = 0; i < 16; i++) {
      var c = document.createElement("div");
      c.className = "cell";
      cellsEl.appendChild(c);
    }

    // localStorage — 최고 점수 / 테마
    bestScore = parseInt(localStorage.getItem("game2048:bestScore"), 10) || 0;
    bestValEl.textContent = bestScore;

    var savedTheme = localStorage.getItem("game2048:theme") || "light";
    document.body.dataset.theme = savedTheme;
    updateThemeIcon();

    // 저장된 게임 상태 복구 시도
    var savedBoard = null;
    var savedScore = 0;
    try {
      var sb = localStorage.getItem("game2048:board");
      if (sb) savedBoard = JSON.parse(sb);
      savedScore = parseInt(localStorage.getItem("game2048:score"), 10) || 0;
    } catch (e) {
      savedBoard = null;
    }

    if (savedBoard && isValidSavedBoard(savedBoard)) {
      restoreGame(savedBoard, savedScore);
    } else {
      newGame();
    }

    setupEvents();

    // 페이지 이탈 시 자동 저장
    window.addEventListener("beforeunload", saveGame);
  }

  function isValidSavedBoard(b) {
    return (
      Array.isArray(b) && b.length === 4 &&
      b.every(function (row) { return Array.isArray(row) && row.length === 4; })
    );
  }

  // ── 게임 복구 ───────────────────────────────────────────────
  function restoreGame(savedBoard, savedScore) {
    clearBoard();
    score = savedScore;
    scoreValEl.textContent = score;
    gState = "playing";
    winShown = false;
    hideOverlays();
    updateGameState("playing");

    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        var v = savedBoard[r][c];
        if (v) {
          var id = ++nextId;
          tiles[id] = { id: id, value: v, row: r, col: c };
          board[r][c] = id;
          renderTile(id, false);
        }
      }
    }

    // 이미 2048 달성한 상태라면 winShown = true (계속 하기 상태)
    if (Logic.hasValue(getValueBoard(), 2048)) {
      winShown = true;
    }
  }

  // ── 새 게임 ─────────────────────────────────────────────────
  function newGame() {
    clearBoard();
    score = 0;
    scoreValEl.textContent = "0";
    gState = "playing";
    winShown = false;
    hideOverlays();
    updateGameState("playing");
    spawn();
    spawn();
    saveGame();
  }

  function clearBoard() {
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        board[r][c] = 0;
      }
    }
    tiles = {};
    els = {};
    nextId = 0;
    if (tilesEl) tilesEl.innerHTML = "";
  }

  // ── 타일 생성 ────────────────────────────────────────────────
  function spawn() {
    var empty = Logic.getEmptyCells(getValueBoard());
    if (!empty.length) return null;
    var pos = empty[Math.floor(Math.random() * empty.length)];
    var v = Math.random() < 0.9 ? 2 : 4;
    var id = ++nextId;
    tiles[id] = { id: id, value: v, row: pos.row, col: pos.col };
    board[pos.row][pos.col] = id;
    renderTile(id, true);
    return id;
  }

  // ── 타일 렌더 ────────────────────────────────────────────────
  function renderTile(id, isNew) {
    var t = tiles[id];
    var el = document.createElement("div");
    el.className = "tile" + (isNew ? " tile--new" : "");
    setTileValue(el, t.value);
    el.style.setProperty("--tx", t.col);
    el.style.setProperty("--ty", t.row);
    tilesEl.appendChild(el);
    els[id] = el;
  }

  function setTileValue(el, v) {
    el.dataset.value = v <= 2048 ? String(v) : "super";
    el.innerHTML = '<span class="tile__num">' + v + "</span>";
  }

  // ── 슬라이드 슬라이스 (ID 추적 — 애니메이션용) ─────────────
  // slice: [[r, c], ...] — 목적지 방향이 앞
  function slideSlice(slice) {
    var ids = [];
    var k;
    for (k = 0; k < slice.length; k++) {
      var tid = board[slice[k][0]][slice[k][1]];
      if (tid) ids.push(tid);
    }
    // 슬라이스 초기화
    for (k = 0; k < slice.length; k++) {
      board[slice[k][0]][slice[k][1]] = 0;
    }

    var result = [];
    var merges = [];
    var canMergeNext = true;
    var i = 0;

    while (i < ids.length) {
      var id = ids[i];
      var last = result.length ? result[result.length - 1] : 0;
      if (last && canMergeNext && tiles[last].value === tiles[id].value) {
        var destPos = slice[result.length - 1];
        merges.push({
          survivor: last,
          removed: id,
          destR: destPos[0],
          destC: destPos[1],
        });
        tiles[last].value *= 2;
        canMergeNext = false;
      } else {
        result.push(id);
        canMergeNext = true;
      }
      i++;
    }

    // 결과 타일 배치
    for (var j = 0; j < result.length; j++) {
      var rid = result[j];
      var pos = slice[j];
      tiles[rid].row = pos[0];
      tiles[rid].col = pos[1];
      board[pos[0]][pos[1]] = rid;
    }

    // 제거될 타일 — merge 목적지로 슬라이드
    for (var m = 0; m < merges.length; m++) {
      var remId = merges[m].removed;
      tiles[remId].row = merges[m].destR;
      tiles[remId].col = merges[m].destC;
    }

    return { result: result, merges: merges };
  }

  function getSlices(dir) {
    var s = [];
    for (var i = 0; i < 4; i++) {
      if (dir === "left")  s.push([[i,0],[i,1],[i,2],[i,3]]);
      if (dir === "right") s.push([[i,3],[i,2],[i,1],[i,0]]);
      if (dir === "up")    s.push([[0,i],[1,i],[2,i],[3,i]]);
      if (dir === "down")  s.push([[3,i],[2,i],[1,i],[0,i]]);
    }
    return s;
  }

  // ── 이동 (애니메이션 포함) ──────────────────────────────────
  function move(dir) {
    if (busy || (gState !== "playing" && gState !== "won-continue")) return;

    // 이동 전 위치 저장
    var prevPos = {};
    var id;
    for (id in tiles) {
      if (Object.prototype.hasOwnProperty.call(tiles, id)) {
        prevPos[id] = { row: tiles[id].row, col: tiles[id].col };
      }
    }

    var totalGained = 0;
    var allMerges = [];

    var slices = getSlices(dir);
    for (var s = 0; s < slices.length; s++) {
      var res = slideSlice(slices[s]);
      for (var m = 0; m < res.merges.length; m++) {
        totalGained += tiles[res.merges[m].survivor].value;
        allMerges.push(res.merges[m]);
      }
    }

    // 변화 여부 확인
    var anyMoved = false;
    for (id in tiles) {
      if (Object.prototype.hasOwnProperty.call(tiles, id)) {
        var p = prevPos[id];
        if (p && (tiles[id].row !== p.row || tiles[id].col !== p.col)) {
          anyMoved = true;
          break;
        }
      }
    }
    if (!anyMoved && !allMerges.length) return;

    busy = true;

    // Phase 1: transition 없이 이전 위치로 설정
    for (id in tiles) {
      if (!Object.prototype.hasOwnProperty.call(tiles, id)) continue;
      var el = els[id];
      if (!el) continue;
      el.style.transition = "none";
      var pp = prevPos[id] || { row: tiles[id].row, col: tiles[id].col };
      el.style.setProperty("--tx", pp.col);
      el.style.setProperty("--ty", pp.row);
    }
    for (var mi = 0; mi < allMerges.length; mi++) {
      var remId = allMerges[mi].removed;
      var remEl = els[remId];
      if (!remEl) continue;
      remEl.style.transition = "none";
      var prevR = prevPos[remId];
      if (prevR) {
        remEl.style.setProperty("--tx", prevR.col);
        remEl.style.setProperty("--ty", prevR.row);
      }
    }

    // reflow 강제
    tilesEl.getBoundingClientRect();

    // Phase 2: transition 복원 + 새 위치로 이동
    for (id in tiles) {
      if (!Object.prototype.hasOwnProperty.call(tiles, id)) continue;
      var el2 = els[id];
      if (!el2) continue;
      el2.style.transition = "";
      el2.style.setProperty("--tx", tiles[id].col);
      el2.style.setProperty("--ty", tiles[id].row);
    }
    for (var mj = 0; mj < allMerges.length; mj++) {
      var remId2 = allMerges[mj].removed;
      var remEl2 = els[remId2];
      if (!remEl2) continue;
      remEl2.style.transition = "";
      remEl2.style.setProperty("--tx", allMerges[mj].destC);
      remEl2.style.setProperty("--ty", allMerges[mj].destR);
      remEl2.style.zIndex = "0";
    }

    // slide 완료 후 처리 (§6.4 타임라인: 130ms)
    setTimeout(function () {
      // 제거 타일 DOM 삭제
      for (var ni = 0; ni < allMerges.length; ni++) {
        var rid = allMerges[ni].removed;
        if (els[rid]) { els[rid].remove(); delete els[rid]; }
        delete tiles[rid];
      }

      // 합치기 결과 타일 값 업데이트 + pop 애니
      for (var pi = 0; pi < allMerges.length; pi++) {
        var surv = allMerges[pi].survivor;
        var survEl = els[surv];
        if (!survEl) continue;
        setTileValue(survEl, tiles[surv].value);
        survEl.classList.remove("tile--merged");
        void survEl.offsetWidth; // reflow
        survEl.classList.add("tile--merged");
        // 애니 완료 후 클래스 제거
        (function (e) {
          setTimeout(function () { e.classList.remove("tile--merged"); }, 300);
        })(survEl);
      }

      // 점수 업데이트
      if (totalGained > 0) {
        score += totalGained;
        if (score > bestScore) {
          bestScore = score;
          localStorage.setItem("game2048:bestScore", bestScore);
          bestValEl.textContent = bestScore;
        }
        scoreValEl.textContent = score;
        showScorePopup(totalGained);
        // 점수 bump 애니
        var svEl = scoreBoxEl.querySelector(".score-box__value");
        svEl.classList.remove("score-bump");
        void svEl.offsetWidth;
        svEl.classList.add("score-bump");
      }

      // 새 타일 스폰
      spawn();

      // 게임 저장
      saveGame();

      // 게임 상태 체크
      var vb = getValueBoard();
      if (!winShown && Logic.hasValue(vb, 2048)) {
        winShown = true;
        gState = "win";
        updateGameState("win");
        setTimeout(function () { showOverlay(ovWin); }, 350);
      } else if (!Logic.canMove(vb)) {
        gState = "gameover";
        updateGameState("gameover");
        finalScEl.textContent = score;
        setTimeout(function () { showOverlay(ovGO); }, 350);
      }

      busy = false;
    }, 130);
  }

  // ── 보조 함수 ────────────────────────────────────────────────
  function getValueBoard() {
    return board.map(function (row) {
      return row.map(function (id) {
        return id ? tiles[id].value : 0;
      });
    });
  }

  function showScorePopup(v) {
    var p = document.createElement("span");
    p.className = "score-popup";
    p.textContent = "+" + v;
    scoreBoxEl.appendChild(p);
    setTimeout(function () { if (p.parentNode) p.remove(); }, 1000);
  }

  function showOverlay(el) {
    el.classList.add("active");
    el.removeAttribute("aria-hidden");
    var btn = el.querySelector("button");
    if (btn) btn.focus();
  }

  function hideOverlays() {
    [ovGO, ovWin].forEach(function (o) {
      o.classList.remove("active");
      o.setAttribute("aria-hidden", "true");
    });
  }

  function updateGameState(state) {
    document.body.dataset.gameState = state;
  }

  function updateThemeIcon() {
    themeToggle.textContent = document.body.dataset.theme === "dark" ? "☀️" : "🌙";
  }

  function saveGame() {
    try {
      localStorage.setItem("game2048:board", JSON.stringify(getValueBoard()));
      localStorage.setItem("game2048:score", String(score));
    } catch (e) { /* quota 등 오류 무시 */ }
  }

  // ── 이벤트 설정 ──────────────────────────────────────────────
  function setupEvents() {
    var dirMap = {
      ArrowLeft:  "left",  ArrowRight: "right",
      ArrowUp:    "up",    ArrowDown:  "down",
      a: "left",  d: "right",  w: "up",  s: "down",
      A: "left",  D: "right",  W: "up",  S: "down",
    };

    document.addEventListener("keydown", function (e) {
      if (dirMap[e.key]) {
        e.preventDefault();
        move(dirMap[e.key]);
      } else if (e.key === "r" || e.key === "R") {
        newGame();
      }
    });

    themeToggle.addEventListener("click", function () {
      var isDark = document.body.dataset.theme === "dark";
      document.body.dataset.theme = isDark ? "light" : "dark";
      localStorage.setItem("game2048:theme", document.body.dataset.theme);
      updateThemeIcon();
    });

    btnNewGame.addEventListener("click", newGame);
    btnRetry.addEventListener("click", newGame);
    btnCont.addEventListener("click", function () {
      hideOverlays();
      gState = "won-continue";
      updateGameState("won-continue");
    });
    btnNewWin.addEventListener("click", newGame);
  }

  // ── 시작 ──────────────────────────────────────────────────────
  init();

})();
