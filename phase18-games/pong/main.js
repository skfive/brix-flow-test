/* BF-913 · Pong 아케이드 DOM 바인딩·게임 루프·입력·렌더
 * 기획 SSOT: docs/planning/pong-BF-910.md (§5 입력·§6 상태·§7 화면)
 * 디자인 SSOT: docs/design/pong-BF-910.md (§6.2 렌더 순서·§6.4 상태 전환)
 * file:// CORS 안전 — ES module / fetch / 외부 CDN 0건. IIFE 전역 함수.
 */
(function () {
  "use strict";

  var L = globalThis.PongLogic;
  if (!L) {
    // logic.js 로드 실패 방어 (정상 흐름에서는 발생하지 않음)
    return;
  }

  // ── DOM 참조 ────────────────────────────────────────────
  var canvas = document.getElementById("court");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var overlay = document.getElementById("overlay");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayBody = document.getElementById("overlay-body");
  var scoreboard = document.querySelector(".pong-scoreboard");
  var playerScoreEl = document.querySelector('[data-role="player-score"]');
  var cpuScoreEl = document.querySelector('[data-role="cpu-score"]');

  var btnStart = document.getElementById("btn-start");
  var btnResume = document.getElementById("btn-resume");
  var btnAgain = document.getElementById("btn-again");
  var btnMenu = document.getElementById("btn-menu");
  var btnStartBar = document.getElementById("btn-start-bar");
  var btnPause = document.getElementById("btn-pause");
  var btnRestart = document.getElementById("btn-restart");

  // ── 색상 토큰 캐시 (design §6.2 — 1회 읽어 캐시) ─────────
  function token(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }
  var COLORS = {
    courtBg: token("--court-bg"),
    courtLine: token("--court-line"),
    courtNet: token("--court-net"),
    ball: token("--ball-color"),
    ballTrail: token("--ball-trail"),
    player: token("--paddle-player"),
    playerGlow: token("--paddle-player-glow"),
    cpu: token("--paddle-cpu"),
    cpuGlow: token("--paddle-cpu-glow"),
  };

  // ── 게임 상태 (in-memory 전용, planner §6.1) ────────────
  var state = L.createInitialState();

  // 키보드 눌림 상태 (holding)
  var keys = { up: false, down: false };
  // 포인터 드래그 상태
  var activePointerId = null;

  // ── 상태 전이 헬퍼 ──────────────────────────────────────
  function startGame() {
    state.status = "playing";
    state.score = { player: 0, cpu: 0 };
    state.paddles.player.y = L.PADDLE_CENTER_Y;
    state.paddles.cpu.y = L.PADDLE_CENTER_Y;
    state.winner = null;
    state.pointPausedAt = null;
    state.ball = L.serveBall(Math.random);
    syncUi();
  }

  function toMenu() {
    state = L.createInitialState();
    syncUi();
  }

  function togglePause() {
    if (state.status === "playing") {
      state.status = "paused";
    } else if (state.status === "paused") {
      state.status = "playing";
    }
    syncUi();
  }

  // ── 오버레이·버튼 UI 동기화 (design §6.4) ───────────────
  function syncUi() {
    var s = state.status;

    // 오버레이 표시 여부
    if (s === "playing") {
      overlay.hidden = true;
    } else {
      overlay.hidden = false;
      overlay.setAttribute("data-state", s);
    }

    // 오버레이 카드 내용
    overlayTitle.removeAttribute("data-winner");
    if (s === "start") {
      overlayTitle.textContent = "Pong 아케이드";
      overlayBody.textContent =
        "11점 먼저 내면 승리 · ↑ / ↓ 또는 코트를 드래그해 조작";
    } else if (s === "paused") {
      overlayTitle.textContent = "일시정지";
      overlayBody.textContent = "계속하려면 계속하기를 누르세요";
    } else if (s === "gameover") {
      var win = state.winner === "player";
      overlayTitle.textContent = win ? "플레이어 승리!" : "CPU 승리";
      overlayTitle.setAttribute("data-winner", state.winner);
      overlayBody.textContent =
        "최종 점수 " + state.score.player + " : " + state.score.cpu;
    } else if (s === "point-paused") {
      overlayTitle.textContent = "서브 준비…";
      overlayBody.textContent = "";
    }

    // 오버레이 액션 버튼 노출
    setHidden(btnStart, s !== "start");
    setHidden(btnResume, s !== "paused");
    setHidden(btnAgain, s !== "gameover");
    setHidden(btnMenu, !(s === "paused" || s === "gameover"));

    // 하단 컨트롤 바 (design §5.5)
    btnStartBar.disabled = s !== "start";
    btnPause.disabled = s !== "playing";

    // 오버레이 등장 시 카드 타이틀에 포커스 (playing/point-paused 제외)
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
    playerScoreEl.textContent = String(state.score.player);
    cpuScoreEl.textContent = String(state.score.cpu);
    var label =
      "플레이어 " + state.score.player + "점, CPU " + state.score.cpu + "점";
    scoreboard.setAttribute("aria-label", label);
    canvas.setAttribute(
      "aria-label",
      "Pong 코트, 플레이어 " +
        state.score.player +
        "점 CPU " +
        state.score.cpu +
        "점"
    );
  }

  // ── 물리 스텝 (planner §3~§4) ───────────────────────────
  function stepPhysics(dt) {
    var ball = state.ball;

    // 플레이어 패들 키보드 이동 (holding, §5.2)
    var dir = (keys.down ? 1 : 0) - (keys.up ? 1 : 0); // 동시 눌림 → 0 (§10.4)
    if (dir !== 0) {
      state.paddles.player.y = L.clamp(
        state.paddles.player.y + dir * L.PADDLE_SPEED_KEYBOARD * dt,
        0,
        L.PADDLE_Y_MAX
      );
    }

    // CPU AI (§3.5)
    state.paddles.cpu.y = L.updateCpu(state.paddles.cpu.y, ball, dt);

    // 공 이동
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // 상/하 벽 반사 (§3.3)
    var reflected = L.reflectWall(ball);
    ball.y = reflected.y;
    ball.vy = reflected.vy;

    // 패들 충돌·반사 (§3.4)
    // 플레이어 패들 (좌측, 공이 좌로 이동 중일 때만)
    if (ball.vx < 0 && L.ballHitsPaddle(ball, L.PLAYER_X, state.paddles.player)) {
      var pb = L.paddleBounce(ball, state.paddles.player);
      ball.vx = pb.vx;
      ball.vy = pb.vy;
      // 패들 표면 밖으로 위치 보정 (재충돌 방지)
      ball.x = L.PLAYER_X + L.PADDLE_WIDTH + L.BALL_RADIUS;
    }
    // CPU 패들 (우측, 공이 우로 이동 중일 때만)
    if (ball.vx > 0 && L.ballHitsPaddle(ball, L.CPU_X, state.paddles.cpu)) {
      var cb = L.paddleBounce(ball, state.paddles.cpu);
      ball.vx = cb.vx;
      ball.vy = cb.vy;
      ball.x = L.CPU_X - L.BALL_RADIUS;
    }

    // 득점 판정 (§4.1)
    var scorer = L.checkScore(ball);
    if (scorer) {
      state.score[scorer] += 1;
      updateScoreboard();

      var winner = L.checkWinner(state.score);
      if (winner) {
        // 승리 → gameover (§4.2, AC-STATE-03)
        state.winner = winner;
        state.status = "gameover";
        syncUi();
      } else {
        // 득점 → point-paused (§4.1-2, AC-STATE-02)
        state.ball = { x: L.COURT_WIDTH / 2, y: L.COURT_HEIGHT / 2, vx: 0, vy: 0 };
        state.status = "point-paused";
        state.pointPausedAt = pausedClock;
        syncUi();
      }
    }
  }

  // ── 렌더 (design §6.2 렌더 순서) ────────────────────────
  function render() {
    var W = L.COURT_WIDTH;
    var H = L.COURT_HEIGHT;

    // 1. 코트 배경
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = COLORS.courtBg;
    ctx.fillRect(0, 0, W, H);

    // 2. 상/하 경계선
    ctx.strokeStyle = COLORS.courtLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(W, 1);
    ctx.moveTo(0, H - 1);
    ctx.lineTo(W, H - 1);
    ctx.stroke();

    // 3. 중앙 세로 네트 (점선)
    ctx.strokeStyle = COLORS.courtNet;
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 12]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. 패들 (글로우 포함)
    drawPaddle(L.PLAYER_X, state.paddles.player.y, COLORS.player, COLORS.playerGlow);
    drawPaddle(L.CPU_X, state.paddles.cpu.y, COLORS.cpu, COLORS.cpuGlow);

    // 5. 공 (playing / paused 중에만 — point-paused/start/gameover 는 서브 대기)
    if (state.status === "playing" || state.status === "paused") {
      ctx.save();
      ctx.shadowColor = COLORS.ballTrail;
      ctx.shadowBlur = 8;
      ctx.fillStyle = COLORS.ball;
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, L.BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPaddle(x, y, color, glow) {
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    roundRect(x, y, L.PADDLE_WIDTH, L.PADDLE_HEIGHT, 3);
    ctx.fill();
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ── 게임 루프 (planner §12) ─────────────────────────────
  var lastTime = null;
  var pausedClock = 0; // rAF timestamp 누적 (Date 미사용, 결정론 타이머)

  function loop(now) {
    if (lastTime === null) lastTime = now;
    var rawDt = (now - lastTime) / 1000;
    lastTime = now;
    pausedClock = now;

    var dt = L.clampDt(rawDt);

    if (state.status === "playing") {
      stepPhysics(dt);
    } else if (state.status === "point-paused") {
      // POINT_PAUSE_MS 경과 후 자동 서브 (§6.2)
      if (now - state.pointPausedAt >= L.POINT_PAUSE_MS) {
        state.ball = L.serveBall(Math.random);
        state.status = "playing";
        state.pointPausedAt = null;
        syncUi();
      }
    }

    render();
    requestAnimationFrame(loop);
  }

  // ── 입력: 키보드 (planner §5.2) ─────────────────────────
  function onKeyDown(e) {
    var k = e.key;
    if (k === "ArrowUp" || k === "w" || k === "W") {
      keys.up = true;
      if (state.status === "playing") e.preventDefault();
    } else if (k === "ArrowDown" || k === "s" || k === "S") {
      keys.down = true;
      if (state.status === "playing") e.preventDefault();
    } else if (k === "p" || k === "P" || k === "Escape") {
      togglePause();
    } else if (k === "Enter" || k === " ") {
      if (state.status === "start" || state.status === "gameover") {
        startGame();
        e.preventDefault();
      }
    } else if (k === "r" || k === "R") {
      if (
        state.status === "playing" ||
        state.status === "paused" ||
        state.status === "gameover"
      ) {
        startGame();
      }
    }
  }

  function onKeyUp(e) {
    var k = e.key;
    if (k === "ArrowUp" || k === "w" || k === "W") keys.up = false;
    else if (k === "ArrowDown" || k === "s" || k === "S") keys.down = false;
  }

  // ── 입력: 포인터 드래그 (planner §5.3) ──────────────────
  function pointerToPaddleY(clientY) {
    var rect = canvas.getBoundingClientRect();
    var logicalY = ((clientY - rect.top) / rect.height) * L.COURT_HEIGHT;
    return L.clamp(logicalY - L.PADDLE_HEIGHT / 2, 0, L.PADDLE_Y_MAX);
  }

  function onPointerDown(e) {
    if (activePointerId !== null) return; // 멀티터치 무시 (§10.9)
    if (state.status !== "playing") return; // 정의 안 된 상태 no-op (§10.8)
    activePointerId = e.pointerId;
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    state.paddles.player.y = pointerToPaddleY(e.clientY);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (e.pointerId !== activePointerId) return;
    if (state.status !== "playing") return;
    state.paddles.player.y = pointerToPaddleY(e.clientY);
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    if (canvas.releasePointerCapture) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (_err) {
        /* 이미 해제됨 */
      }
    }
  }

  // ── 버튼 바인딩 ─────────────────────────────────────────
  function bindButtons() {
    btnStart.addEventListener("click", startGame);
    btnStartBar.addEventListener("click", startGame);
    btnResume.addEventListener("click", togglePause);
    btnPause.addEventListener("click", togglePause);
    btnAgain.addEventListener("click", startGame);
    btnRestart.addEventListener("click", function () {
      if (state.status !== "start") startGame();
    });
    btnMenu.addEventListener("click", toMenu);
  }

  // ── 초기화 ──────────────────────────────────────────────
  function init() {
    bindButtons();
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    syncUi();
    requestAnimationFrame(loop);
  }

  init();
})();
