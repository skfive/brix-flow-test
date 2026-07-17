/* BF-931 · 벽돌깨기(Breakout) DOM 바인딩·게임 루프·입력·렌더
 * 기획 SSOT: docs/plan/breakout-BF-928.md (§5 입력·§6 상태·§7 화면)
 * 디자인 SSOT: docs/design/breakout-BF-928.md (§5 컴포넌트·§6 dev 가이드)
 * file:// CORS 안전 — ES module / fetch / 외부 CDN 0건. IIFE 전역 함수.
 */
(function () {
  "use strict";

  var L = globalThis.BreakoutLogic;
  if (!L) return; // logic.js 로드 실패 방어

  // ── DOM 참조 ────────────────────────────────────────────
  var canvas = document.getElementById("board");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var overlay = document.getElementById("overlay");
  var overlayIcon = document.getElementById("overlay-icon");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayDesc = document.getElementById("overlay-desc");
  var overlayStat = document.getElementById("overlay-stat");
  var serveHint = document.getElementById("serve-hint");

  var scoreEl = document.querySelector('[data-role="score"]');
  var livesEl = document.querySelector('[data-role="lives"]');

  var btnStart = document.getElementById("btn-start");
  var btnResume = document.getElementById("btn-resume");
  var btnAgain = document.getElementById("btn-again");
  var btnMenu = document.getElementById("btn-menu");
  var btnStartBar = document.getElementById("btn-start-bar");
  var btnPause = document.getElementById("btn-pause");
  var btnRestart = document.getElementById("btn-restart");

  // ── 색상 토큰 캐시 (design §6.4 — 1회 읽어 캐시) ─────────
  function token(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  var COLORS = {
    boardBg: token("--board-bg"),
    boardWall: token("--board-wall"),
    paddleFill: token("--paddle-fill"),
    paddleEdge: token("--paddle-edge"),
    paddleGlow: token("--paddle-glow"),
    ballFill: token("--ball-fill"),
    ballEdge: token("--ball-edge"),
    ballGlow: token("--ball-glow"),
    brickTop: token("--brick-top-highlight"),
    brickBottom: token("--brick-bottom-shade"),
    gameoverTint: token("--gameover-tint"),
    winTint: token("--win-tint"),
  };
  // 벽돌 행별 색 (row 0~4 → --brick-row-1~5, design §5.1)
  var BRICK_ROW_COLORS = [
    token("--brick-row-1"),
    token("--brick-row-2"),
    token("--brick-row-3"),
    token("--brick-row-4"),
    token("--brick-row-5"),
  ];

  // ── 게임 상태 (in-memory 전용, planner §6.1) ────────────
  var state = L.createInitialState();

  // 입력 상태
  var keys = { left: false, right: false };
  var activePointerId = null;

  // ── 상태 전이 헬퍼 (planner §6.2) ───────────────────────
  function beginServe() {
    // start / gameover / win → serve (새 라운드 전체 초기화)
    L.resetToServe(state);
    syncUi();
  }

  function launchBall() {
    L.launch(state, Math.random);
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

  // start/serve/gameover/win 에서의 주 발사·시작 입력 통합 (planner §5.1·§5.3)
  function primaryAction() {
    var s = state.status;
    if (s === "start" || s === "gameover" || s === "win") {
      beginServe();
    } else if (s === "serve") {
      launchBall();
    }
  }

  // ── UI 동기화 (design §5.4·§6.5) ────────────────────────
  function setHidden(el, hidden) {
    if (hidden) el.setAttribute("hidden", "");
    else el.removeAttribute("hidden");
  }

  function syncUi() {
    var s = state.status;

    // 오버레이 표시 여부 — playing·serve 는 숨김 (§5.3·§5.4)
    overlay.classList.remove("is-gameover", "is-win");
    if (s === "playing" || s === "serve") {
      overlay.hidden = true;
    } else {
      overlay.hidden = false;
      overlay.setAttribute("data-state", s);
    }

    // serve 힌트 배너
    setHidden(serveHint, s !== "serve");

    // 오버레이 카드 내용
    overlayTitle.removeAttribute("data-result");
    overlayStat.removeAttribute("data-result");
    overlayStat.hidden = true;
    overlayIcon.textContent = "";
    if (s === "start") {
      overlayTitle.textContent = "벽돌깨기";
      overlayDesc.textContent =
        "← → 또는 드래그로 패들을 움직이고, 공으로 벽돌 40개를 모두 깨세요";
    } else if (s === "paused") {
      overlayTitle.textContent = "일시정지";
      overlayDesc.textContent = "계속하려면 계속하기를 누르세요";
    } else if (s === "gameover") {
      overlay.classList.add("is-gameover");
      overlayIcon.textContent = "✕";
      overlayTitle.textContent = "게임 오버";
      overlayTitle.setAttribute("data-result", "gameover");
      overlayDesc.textContent = "생명을 모두 소진했어요";
      overlayStat.textContent = "점수 " + state.score;
      overlayStat.hidden = false;
    } else if (s === "win") {
      overlay.classList.add("is-win");
      overlayIcon.textContent = "🎉";
      overlayTitle.textContent = "클리어!";
      overlayTitle.setAttribute("data-result", "win");
      overlayDesc.textContent = "모든 벽돌을 깼어요";
      overlayStat.textContent = "점수 " + state.score;
      overlayStat.setAttribute("data-result", "win");
      overlayStat.hidden = false;
    }

    // 오버레이 액션 버튼 노출 (§5.5)
    setHidden(btnStart, s !== "start");
    setHidden(btnResume, s !== "paused");
    setHidden(btnAgain, s === "gameover" || s === "win" ? false : true);
    setHidden(btnMenu, !(s === "paused" || s === "gameover" || s === "win"));

    // 하단 컨트롤 바
    btnStartBar.disabled = s !== "start";
    btnPause.disabled = s !== "playing";

    // 오버레이 등장 시 카드 타이틀 포커스
    if (s === "start" || s === "paused" || s === "gameover" || s === "win") {
      overlayTitle.focus();
    }

    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = String(state.score);

    // 생명 하트 렌더 (남은=full, 소진=empty, design §5.2)
    var html = "";
    for (var i = 0; i < L.LIVES_INITIAL; i += 1) {
      if (i < state.lives) {
        html += '<span class="life life--full" aria-hidden="true">♥</span>';
      } else {
        html += '<span class="life life--empty" aria-hidden="true">♡</span>';
      }
    }
    livesEl.innerHTML = html;
    livesEl.setAttribute("aria-label", "생명 " + state.lives);

    canvas.setAttribute(
      "aria-label",
      "벽돌깨기 보드, 점수 " + state.score + ", 생명 " + state.lives
    );
  }

  // ── 이번 프레임 패들 순이동 속도 (planner §5.2·§10.12) ──
  function currentInputVX() {
    return L.keyboardInputVX(keys.left, keys.right);
  }

  // ── 렌더 (design §5.1 오브젝트 규칙·§6.4 순서) ──────────
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

  function render() {
    var W = L.BOARD_WIDTH;
    var H = L.BOARD_HEIGHT;

    // ① 보드 배경
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = COLORS.boardBg;
    ctx.fillRect(0, 0, W, H);

    // ② 상/좌/우 벽 하이라이트 (반사면 암시)
    ctx.strokeStyle = COLORS.boardWall;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0.5, H);
    ctx.lineTo(0.5, 0.5);
    ctx.lineTo(W - 0.5, 0.5);
    ctx.lineTo(W - 0.5, H);
    ctx.stroke();

    // ③ 살아있는 벽돌 (행별 색 + 상/하 베벨)
    for (var i = 0; i < state.bricks.length; i += 1) {
      var b = state.bricks[i];
      if (!b.alive) continue;
      ctx.fillStyle = BRICK_ROW_COLORS[b.row] || BRICK_ROW_COLORS[0];
      roundRect(b.x, b.y, b.width, b.height, 3);
      ctx.fill();
      // 상단 하이라이트 베벨
      ctx.fillStyle = COLORS.brickTop;
      ctx.fillRect(b.x + 2, b.y + 1, b.width - 4, 2);
      // 하단 그림자 베벨
      ctx.fillStyle = COLORS.brickBottom;
      ctx.fillRect(b.x + 2, b.y + b.height - 3, b.width - 4, 2);
    }

    // ④ 패들 (둥근 사각 + 베벨 + 글로우)
    var px = state.paddle.x;
    var py = L.PADDLE_Y;
    ctx.save();
    ctx.shadowColor = COLORS.paddleGlow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = COLORS.paddleFill;
    roundRect(px, py, L.PADDLE_WIDTH, L.PADDLE_HEIGHT, 4);
    ctx.fill();
    ctx.restore();
    // 하단 베벨
    ctx.fillStyle = COLORS.paddleEdge;
    ctx.fillRect(px + 3, py + L.PADDLE_HEIGHT - 2, L.PADDLE_WIDTH - 6, 2);

    // ⑤ 공 (원 + 외곽 링/halo) — start 외 상태에서 표시
    if (state.status !== "start") {
      ctx.save();
      ctx.shadowColor = COLORS.ballGlow;
      ctx.shadowBlur = 8;
      ctx.fillStyle = COLORS.ballFill;
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, L.BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = COLORS.ballEdge;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, L.BALL_RADIUS - 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // gameover/win 보드 틴트 (§5.4)
    if (state.status === "gameover") {
      ctx.fillStyle = COLORS.gameoverTint;
      ctx.fillRect(0, 0, W, H);
    } else if (state.status === "win") {
      ctx.fillStyle = COLORS.winTint;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ── 게임 루프 (planner §3.7·§12) ────────────────────────
  var lastTime = null;
  var prevStatus = state.status;

  function loop(now) {
    if (lastTime === null) lastTime = now;
    var dt = L.clampDt((now - lastTime) / 1000);
    lastTime = now;

    if (state.status === "serve" || state.status === "playing") {
      L.update(state, dt, currentInputVX(), Math.random);
      // 상태가 프레임 내부에서 전이되면(win/gameover/serve 복귀) UI 동기화
      if (state.status !== prevStatus) syncUi();
      else updateHud();
    }
    prevStatus = state.status;

    render();
    requestAnimationFrame(loop);
  }

  // ── 입력: 키보드 (planner §5.2) ─────────────────────────
  function onKeyDown(e) {
    var k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") {
      keys.left = true;
      if (state.status === "playing" || state.status === "serve") e.preventDefault();
    } else if (k === "ArrowRight" || k === "d" || k === "D") {
      keys.right = true;
      if (state.status === "playing" || state.status === "serve") e.preventDefault();
    } else if (k === "Enter" || k === " ") {
      primaryAction();
      e.preventDefault();
    } else if (k === "p" || k === "P" || k === "Escape") {
      togglePause();
    }
  }

  function onKeyUp(e) {
    var k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") keys.left = false;
    else if (k === "ArrowRight" || k === "d" || k === "D") keys.right = false;
  }

  // ── 입력: 포인터 드래그 (planner §5.3) ──────────────────
  function pointerToPaddleX(clientX) {
    var rect = canvas.getBoundingClientRect();
    var logicalX = ((clientX - rect.left) / rect.width) * L.BOARD_WIDTH;
    return L.clamp(logicalX - L.PADDLE_WIDTH / 2, 0, L.BOARD_WIDTH - L.PADDLE_WIDTH);
  }

  function onPointerDown(e) {
    if (activePointerId !== null) return; // 멀티터치 무시 (§10.11)
    // start/serve/playing 에서만 포인터 조작 유효
    var s = state.status;
    if (s !== "start" && s !== "serve" && s !== "playing") return;

    activePointerId = e.pointerId;
    if (canvas.setPointerCapture) {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_err) {
        /* 캡처 불가 무시 */
      }
    }

    if (s === "start") {
      // 시작 → serve (발사 대기)
      beginServe();
    } else if (s === "serve") {
      // 패들 위치 먼저 맞춘 뒤 발사 (드래그 시작 통합, §5.3)
      state.paddle.x = pointerToPaddleX(e.clientX);
      launchBall();
    } else {
      // playing — 패들 추종
      state.paddle.x = pointerToPaddleX(e.clientX);
    }
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (e.pointerId !== activePointerId) return;
    if (state.status !== "playing" && state.status !== "serve") return;
    state.paddle.x = pointerToPaddleX(e.clientX);
    if (state.status === "serve") {
      // serve 중엔 공도 패들 추종
      state.ball.x = state.paddle.x + L.PADDLE_WIDTH / 2;
    }
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
    btnStart.addEventListener("click", beginServe);
    btnStartBar.addEventListener("click", beginServe);
    btnResume.addEventListener("click", togglePause);
    btnPause.addEventListener("click", togglePause);
    btnAgain.addEventListener("click", beginServe);
    btnMenu.addEventListener("click", toMenu);
    btnRestart.addEventListener("click", function () {
      if (state.status !== "start") beginServe();
    });
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
