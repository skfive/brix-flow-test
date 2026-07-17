/* BF-925 · Snake 아케이드 DOM 바인딩·틱 루프·입력·canvas 렌더
 * 기획 SSOT: docs/planning/phase18-snake-BF-923.md (§5 입력·§6 상태·§8 화면)
 * 디자인 SSOT: docs/design/snake-BF-922.md (§5.1 셀 렌더·§5.3 오버레이·§6 dev 가이드)
 * file:// CORS 안전 — ES module / fetch / 외부 CDN 0건. IIFE 전역 함수.
 */
(function () {
  "use strict";

  var L = globalThis.SnakeLogic;
  if (!L) {
    // logic.js 로드 실패 방어 (정상 흐름에서는 발생하지 않음)
    return;
  }

  // ── DOM 참조 ────────────────────────────────────────────
  var canvas = document.getElementById("board");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var overlay = document.getElementById("overlay");
  var overlayIcon = document.getElementById("overlay-icon");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayDesc = document.getElementById("overlay-desc");
  var overlayReason = document.getElementById("overlay-reason");
  var overlayStat = document.getElementById("overlay-stat");

  var scoreboard = document.querySelector(".scoreboard");
  var scoreEl = document.querySelector('[data-role="score"]');
  var highScoreEl = document.querySelector('[data-role="high-score"]');

  var btnStart = document.getElementById("btn-start");
  var btnResume = document.getElementById("btn-resume");
  var btnAgain = document.getElementById("btn-again");
  var btnMenu = document.getElementById("btn-menu");
  var btnPause = document.getElementById("btn-pause");
  var btnRestart = document.getElementById("btn-restart");

  // ── 색상 토큰 캐시 (design §6.4 — 1회 읽어 캐시) ─────────
  function token(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }
  var COLORS = {
    boardBg: token("--board-bg"),
    boardGrid: token("--board-grid"),
    snakeHead: token("--snake-head"),
    snakeHeadEye: token("--snake-head-eye"),
    snakeBody: token("--snake-body"),
    snakeBodyAlt: token("--snake-body-alt"),
    snakeBodyBorder: token("--snake-body-border"),
    foodFill: token("--food-fill"),
    foodGlow: token("--food-glow"),
    foodStem: token("--food-stem"),
    gameoverTint: token("--gameover-tint"),
  };

  var CELL = L.CELL_SIZE; // 20

  // 게임오버 사유 매핑 (design §5.3)
  var REASON_TEXT = {
    wall: "벽에 부딪혔어요",
    self: "몸에 부딪혔어요",
    "board-full": "보드를 가득 채웠어요! 🎉",
  };

  // ── 게임 상태 (in-memory 전용, planner §6.1) ────────────
  var state = L.createInitialState(Math.random);
  var tickTimer = null;
  var prevHighScore = state.highScore;

  // ── 틱 루프 제어 (planner §13 — setInterval 고정 틱) ────
  function startTicking() {
    if (tickTimer !== null) return;
    tickTimer = setInterval(onTick, L.TICK_INTERVAL_MS);
  }

  function stopTicking() {
    if (tickTimer === null) return;
    clearInterval(tickTimer);
    tickTimer = null;
  }

  function onTick() {
    if (state.status !== "playing") return;
    var prevScore = state.score;
    state = L.tick(state, Math.random);
    if (state.score !== prevScore) updateScoreboard();
    if (state.status !== "playing") {
      // 게임오버 전이 (§6.2) — 틱 정지 + UI 동기화
      stopTicking();
      syncUi();
    }
    render();
  }

  // ── 상태 전이 헬퍼 (planner §6.2) ───────────────────────
  function startGame() {
    state = L.createPlayState(state.highScore, Math.random);
    prevHighScore = state.highScore;
    syncUi();
    render();
    startTicking();
  }

  function toMenu() {
    stopTicking();
    var keepHigh = state.highScore;
    state = L.createInitialState(Math.random);
    state.highScore = keepHigh;
    prevHighScore = keepHigh;
    syncUi();
    render();
  }

  function togglePause() {
    if (state.status === "playing") {
      state.status = "paused";
      stopTicking();
      syncUi();
    } else if (state.status === "paused") {
      state.status = "playing";
      syncUi();
      startTicking();
    }
  }

  // ── 방향 입력 (키보드/D-pad 공통, planner §5.1) ─────────
  function setDirection(dir) {
    if (state.status !== "playing") return; // 정의 안 된 상태 no-op (§11.5)
    state.pendingDirection = dir;
  }

  // ── 오버레이·버튼 UI 동기화 (design §5.3) ───────────────
  function syncUi() {
    var s = state.status;

    // data-state 는 항상 현재 status 를 반영(재시작 시 gameover 잔존 제거,
    // design §6.6 R3-3: 재시작 후 data-state !== "gameover"). hidden 은
    // playing 일 때만 — [hidden]{display:none} 이 노출을 최종 제어(styles.css).
    overlay.setAttribute("data-state", s);
    overlay.hidden = s === "playing";

    // 오버레이 내용
    overlayIcon.textContent = "";
    setHidden(overlayReason, true);
    setHidden(overlayStat, true);
    setHidden(overlayDesc, false);

    if (s === "start") {
      overlayTitle.textContent = "Snake 아케이드";
      overlayDesc.textContent = "방향키/버튼으로 뱀을 조종해 먹이를 먹으세요";
    } else if (s === "paused") {
      overlayTitle.textContent = "일시정지";
      overlayDesc.textContent = "계속하려면 계속하기를 누르세요";
    } else if (s === "gameover") {
      overlayIcon.textContent = "✕";
      overlayTitle.textContent = "게임 오버";
      setHidden(overlayDesc, true);
      overlayReason.textContent =
        REASON_TEXT[state.gameoverReason] || "게임이 종료되었어요";
      setHidden(overlayReason, false);
      overlayStat.textContent =
        "점수 " + state.score + " · 최고 " + state.highScore;
      setHidden(overlayStat, false);
    }

    // 오버레이 액션 버튼 노출
    setHidden(btnStart, s !== "start");
    setHidden(btnResume, s !== "paused");
    setHidden(btnAgain, s !== "gameover");
    setHidden(btnMenu, !(s === "paused" || s === "gameover"));

    // 하단 컨트롤 바
    btnPause.disabled = s !== "playing";

    // 오버레이 등장 시 카드 타이틀에 포커스
    if (s === "start" || s === "paused" || s === "gameover") {
      overlayTitle.focus();
    }

    updateScoreboard();
  }

  function setHidden(el, hidden) {
    if (hidden) el.setAttribute("hidden", "");
    else el.removeAttribute("hidden");
  }

  function updateScoreboard() {
    scoreEl.textContent = String(state.score);
    highScoreEl.textContent = String(state.highScore);

    // 최고 점수 갱신 순간 강조 (design §5.2 — 선택)
    if (state.highScore > prevHighScore) {
      highScoreEl.setAttribute("data-highlight", "true");
    } else {
      highScoreEl.removeAttribute("data-highlight");
    }
    prevHighScore = state.highScore;

    var label = "점수 " + state.score + "점, 최고 " + state.highScore + "점";
    scoreboard.setAttribute("aria-label", label);
    canvas.setAttribute("aria-label", "Snake 게임 보드, 점수 " + state.score);
  }

  // ── canvas 렌더러 (design §5.1·§6.4) ────────────────────
  function render() {
    var size = L.BOARD_COLS * CELL; // 400

    // ① 보드 배경
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = COLORS.boardBg;
    ctx.fillRect(0, 0, size, size);

    // ② 격자선
    ctx.strokeStyle = COLORS.boardGrid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 1; i < L.BOARD_COLS; i++) {
      var p = i * CELL + 0.5;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
    }
    ctx.stroke();

    // ③ 먹이 (원 + 꼭지 + 글로우)
    if (state.food) drawFood(state.food);

    // ④ 몸 셀 (머리 제외, 뒤에서부터)
    for (var b = state.snake.length - 1; b >= 1; b--) {
      drawBody(state.snake[b], b, state.snake.length);
    }

    // ⑤ 머리 (둥근 사각 + 방향 눈)
    if (state.snake.length > 0) drawHead(state.snake[0], state.direction);

    // 게임오버 틴트
    if (state.status === "gameover") {
      ctx.fillStyle = COLORS.gameoverTint;
      ctx.fillRect(0, 0, size, size);
    }
  }

  function roundRect(x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawFood(food) {
    var cx = food.x * CELL + CELL / 2;
    var cy = food.y * CELL + CELL / 2;
    var r = (CELL * 0.78) / 2;

    ctx.save();
    ctx.shadowColor = COLORS.foodGlow;
    ctx.shadowBlur = 8;
    ctx.fillStyle = COLORS.foodFill;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 꼭지 (사과 모티프 — 형태 구분 보조)
    ctx.fillStyle = COLORS.foodStem;
    ctx.fillRect(cx - 1, food.y * CELL + 2, 2, 3);
  }

  function drawBody(seg, index, len) {
    var x = seg.x * CELL;
    var y = seg.y * CELL;
    var inset = 1;
    // 짝수/홀수 마디 그라데이션 표현 (design §5.1)
    ctx.fillStyle = index % 2 === 0 ? COLORS.snakeBody : COLORS.snakeBodyAlt;

    var scale = index === len - 1 ? 0.82 : 1; // 꼬리 셀 살짝 작게
    var pad = inset + ((CELL - inset * 2) * (1 - scale)) / 2;
    roundRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 3);
    ctx.fill();

    // 마디 경계선
    ctx.strokeStyle = COLORS.snakeBodyBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawHead(head, direction) {
    var x = head.x * CELL;
    var y = head.y * CELL;
    var inset = 1;

    ctx.fillStyle = COLORS.snakeHead;
    roundRect(x + inset, y + inset, CELL - inset * 2, CELL - inset * 2, 4);
    ctx.fill();

    // 방향 눈 2개 (design §5.1 — 진행 방향 인디케이터)
    var eyeR = 1.6;
    var near = 6; // 진행 방향 쪽 오프셋
    var far = CELL - 6;
    var side1 = 6;
    var side2 = CELL - 6;
    var e1, e2;
    if (direction === "right") {
      e1 = { x: x + far, y: y + side1 };
      e2 = { x: x + far, y: y + side2 };
    } else if (direction === "left") {
      e1 = { x: x + near, y: y + side1 };
      e2 = { x: x + near, y: y + side2 };
    } else if (direction === "up") {
      e1 = { x: x + side1, y: y + near };
      e2 = { x: x + side2, y: y + near };
    } else {
      // down
      e1 = { x: x + side1, y: y + far };
      e2 = { x: x + side2, y: y + far };
    }

    ctx.fillStyle = COLORS.snakeHeadEye;
    ctx.beginPath();
    ctx.arc(e1.x, e1.y, eyeR, 0, Math.PI * 2);
    ctx.arc(e2.x, e2.y, eyeR, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 입력: 키보드 (planner §5.2) ─────────────────────────
  function onKeyDown(e) {
    var k = e.key;
    if (k === "ArrowUp" || k === "w" || k === "W") {
      setDirection("up");
      if (state.status === "playing") e.preventDefault();
    } else if (k === "ArrowDown" || k === "s" || k === "S") {
      setDirection("down");
      if (state.status === "playing") e.preventDefault();
    } else if (k === "ArrowLeft" || k === "a" || k === "A") {
      setDirection("left");
      if (state.status === "playing") e.preventDefault();
    } else if (k === "ArrowRight" || k === "d" || k === "D") {
      setDirection("right");
      if (state.status === "playing") e.preventDefault();
    } else if (k === "p" || k === "P" || k === "Escape") {
      togglePause();
    } else if (k === "Enter" || k === " ") {
      if (state.status === "start" || state.status === "gameover") {
        startGame();
        e.preventDefault();
      }
    }
  }

  // ── 입력: D-pad (planner §5.3 — pointerdown) ────────────
  function bindDpad() {
    var buttons = document.querySelectorAll(".dpad__btn[data-dir]");
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        var dir = btn.getAttribute("data-dir");
        btn.addEventListener("pointerdown", function (e) {
          e.preventDefault();
          setDirection(dir);
        });
      })(buttons[i]);
    }
  }

  // ── 버튼 바인딩 ─────────────────────────────────────────
  function bindButtons() {
    btnStart.addEventListener("click", startGame);
    btnResume.addEventListener("click", togglePause);
    btnAgain.addEventListener("click", startGame);
    btnMenu.addEventListener("click", toMenu);
    btnPause.addEventListener("click", togglePause);
    btnRestart.addEventListener("click", function () {
      if (state.status !== "start") startGame();
    });
  }

  // ── 초기화 ──────────────────────────────────────────────
  function init() {
    bindButtons();
    bindDpad();
    document.addEventListener("keydown", onKeyDown);
    syncUi();
    render();
  }

  init();
})();
