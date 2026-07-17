/* BF-995 · 스네이크 캐너리 — DOM 바인딩·틱 루프·입력·캔버스 렌더
 * 기획 SSOT: docs/planning/snake-canary-BF-989.md §3·§5·§6·§7 · 디자인: §5·§6
 * 순수 로직(logic.js SnakeCanaryLogic)과 분리 — 여기서는 state 를 들고 렌더/틱/입력만 담당.
 * 상태는 메모리 전용(영속 저장 없음, 외부 API 없음). file:// CORS 안전 — IIFE 전역 함수.
 * module: snake-canary
 */
(function () {
  "use strict";

  var L = globalThis.SnakeCanaryLogic;
  if (!L) return; // logic.js 로드 실패 방어 (정상 흐름에서는 발생하지 않음)

  // ── DOM 참조 ──────────────────────────────────────────
  var canvas = document.getElementById("board");
  var ctx = canvas.getContext("2d");
  var scoreEl = document.getElementById("score");
  var statusEl = document.getElementById("game-status");
  var btnStart = document.getElementById("btn-start");
  var btnRestart = document.getElementById("btn-restart");
  var btnRestartOverlay = document.getElementById("btn-restart-overlay");
  var overlayEl = document.querySelector('[data-role="overlay"]');
  var overlayResultEl = document.querySelector('[data-role="overlay-result"]');
  var dpad = {
    up: document.getElementById("dpad-up"),
    down: document.getElementById("dpad-down"),
    left: document.getElementById("dpad-left"),
    right: document.getElementById("dpad-right"),
  };

  var STATUS_TEXT = { idle: "대기 중", playing: "진행 중" };
  var REASON_TEXT = {
    wall: "벽 충돌",
    self: "자기 몸 충돌",
    "board-full": "보드 클리어",
  };

  // ── 게임 상태 (메모리 전용) ───────────────────────────
  var state = L.createInitialState();
  var tickTimer = null;

  // ── 캔버스 렌더 (기획 §3.1, 디자인 §5.1·§6.4) ─────────
  var CELL = L.CELL_SIZE; // 20
  var W = L.BOARD_COLS * CELL; // 400
  var H = L.BOARD_ROWS * CELL; // 400

  function cssVar(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  function roundedCell(x, y, inset, radius, color) {
    var px = x * CELL + inset;
    var py = y * CELL + inset;
    var size = CELL - inset * 2;
    ctx.fillStyle = color;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(px, py, size, size, radius);
      ctx.fill();
    } else {
      ctx.fillRect(px, py, size, size);
    }
  }

  function render() {
    // 그리기 순서: 배경 → 격자선 → 먹이 → 몸통 → 머리 (디자인 §6.4)
    ctx.fillStyle = cssVar("--sc-board-bg") || "#ffffff";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = cssVar("--sc-grid-line") || "#eceae7";
    ctx.lineWidth = 1;
    for (var i = 1; i < L.BOARD_COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL + 0.5, 0);
      ctx.lineTo(i * CELL + 0.5, H);
      ctx.stroke();
    }
    for (var j = 1; j < L.BOARD_ROWS; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * CELL + 0.5);
      ctx.lineTo(W, j * CELL + 0.5);
      ctx.stroke();
    }

    // 먹이 — 원형 (색-비의존: 뱀=체인, 먹이=원형)
    if (state.food) {
      var fcx = state.food.x * CELL + CELL / 2;
      var fcy = state.food.y * CELL + CELL / 2;
      ctx.fillStyle = cssVar("--sc-food") || "#c81e1e";
      ctx.beginPath();
      ctx.arc(fcx, fcy, CELL / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 뱀 몸통 → 머리
    var bodyColor = cssVar("--sc-snake-body") || "#15803d";
    var headColor = cssVar("--sc-snake-head") || "#14532d";
    for (var s = state.snake.length - 1; s >= 1; s--) {
      roundedCell(state.snake[s].x, state.snake[s].y, 1, 3, bodyColor);
    }
    roundedCell(state.snake[0].x, state.snake[0].y, 1, 3, headColor);
  }

  // ── HUD·오버레이·버튼 노출 갱신 (디자인 §5.2·§5.3·§5.4) ─
  function syncView() {
    scoreEl.textContent = String(state.score);

    if (state.status === "gameover") {
      var reason = REASON_TEXT[state.gameoverReason] || "";
      statusEl.textContent =
        "게임 오버 · 점수 " + state.score + (reason ? " · " + reason : "");
      overlayResultEl.textContent =
        "점수 " + state.score + (reason ? " · " + reason : "");
      overlayEl.hidden = false;
    } else {
      statusEl.textContent = STATUS_TEXT[state.status] || "";
      overlayEl.hidden = true;
    }

    // 상태별 버튼 노출 (디자인 §5.3): idle→시작, gameover→다시하기, playing→둘 다 숨김
    btnStart.hidden = state.status !== "idle";
    btnRestart.hidden = state.status !== "gameover";
  }

  // ── 틱 루프 (기획 §3.3·§14, setInterval 고정 틱) ───────
  function startLoop() {
    stopLoop();
    tickTimer = setInterval(step, L.TICK_INTERVAL_MS);
  }
  function stopLoop() {
    if (tickTimer !== null) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }
  function step() {
    if (state.status !== "playing") {
      stopLoop();
      return;
    }
    state = L.tick(state);
    render();
    if (state.status !== "playing") {
      // 진행 → 게임오버 전이 시점에만 HUD/announce 갱신 (기획 §12.7)
      stopLoop();
      syncView();
    }
  }

  // ── 상태 전이: 시작/재시작 (기획 §5.2) ────────────────
  function startGame() {
    if (state.status === "playing") return; // 연타 가드 (기획 §12.8)
    state = L.startGame();
    syncView();
    render();
    startLoop();
  }

  // ── 방향 입력 (기획 §6.1) — 두 경로 동일하게 pendingDirection 갱신 ─
  function setDirection(dir) {
    if (state.status !== "playing") return; // idle/gameover no-op (기획 §5.2·§12.5)
    state.pendingDirection = dir;
  }

  // ── 키보드 (기획 §6.2) ────────────────────────────────
  var KEY_DIR = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    W: "up",
    s: "down",
    S: "down",
    a: "left",
    A: "left",
    d: "right",
    D: "right",
  };
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      // 시작/재시작 (playing 에서는 무시)
      if (state.status !== "playing") {
        e.preventDefault();
        startGame();
      }
      return;
    }
    var dir = KEY_DIR[e.key];
    if (dir) {
      e.preventDefault(); // 방향키 기본 스크롤 차단 (기획 §6.2)
      setDirection(dir);
    }
  });

  // ── D-pad (기획 §6.3) — pointerdown 1회 반영, 눌림 피드백 ─
  Object.keys(dpad).forEach(function (dir) {
    var btn = dpad[dir];
    btn.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      setDirection(dir);
      btn.classList.add("is-pressed");
    });
    var clear = function () {
      btn.classList.remove("is-pressed");
    };
    btn.addEventListener("pointerup", clear);
    btn.addEventListener("pointerleave", clear);
    btn.addEventListener("pointercancel", clear);
  });

  // ── 시작/재시작 버튼 (기획 §6.4) ──────────────────────
  btnStart.addEventListener("click", startGame);
  btnRestart.addEventListener("click", startGame);
  btnRestartOverlay.addEventListener("click", startGame);

  // ── 초기 렌더 (자동 포커스 없음 — 기획 §7.1) ──────────
  syncView();
  render();
})();
