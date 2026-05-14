// BF-504 · Snake 게임 DOM/Canvas 컨트롤러
// - logic.js 의 순수 로직을 이용해 캔버스 렌더링 + 이벤트 처리
// - localStorage High Score 영속
//
// BF-518: index.html 인라인 IIFE 가 globalThis(window) 에 로직 변수 주입
// BF-522: type="module" + dynamic import 완전 제거 → file:// CORS 오류 수정.
//   <script src="./game.js"> (type 속성 없음) 로 로드.
//   CELL / LS_HIGH_SCORE_KEY / DIR / 로직 함수들은 index.html 인라인 IIFE 가
//   globalThis 에 설정 → 아래 구조 분해로 참조. file:// / http:// 모두 동일하게 동작.

const {
  CELL,
  LS_HIGH_SCORE_KEY,
  DIR,
  createInitialState,
  changeDirection,
  tick,
  restartGame,
} = globalThis;

// ─────────────────────────────────────────────────────────────
// DOM 참조
// ─────────────────────────────────────────────────────────────
const canvas = document.getElementById("game-canvas");
const ctx    = canvas.getContext("2d");

const hudScoreEl    = document.getElementById("hud-score-value");
const hudHighEl     = document.getElementById("hud-high-value");
const goOverlay     = document.getElementById("gameover-overlay");
const goScoreEl     = document.getElementById("go-score");
const pausedOverlay = document.getElementById("paused-overlay");

// ─────────────────────────────────────────────────────────────
// 게임 상태
// ─────────────────────────────────────────────────────────────
let state;
let rafId = null;
let lastTs = 0;

/** 틱 간격 (ms) — 이 값마다 게임 로직 1 스텝 */
const TICK_MS = 120;

// ─────────────────────────────────────────────────────────────
// KPI 측정 변수 — BF-526 AC §4
// ─────────────────────────────────────────────────────────────
/** 이번 게임 세션의 멈춤/재개 토글 횟수 */
let pauseToggleCount = 0;
/** 현재 멈춤 구간 시작 타임스탬프 (ms, performance.now()) */
let pauseStartTs = 0;
/** 이번 게임 세션의 누적 멈춤 시간 (ms) */
let totalPausedMs = 0;

/** sessionStorage 키 */
const SS_PAUSE_KPI_KEY = "bf-snake-pause-kpi";

// ─────────────────────────────────────────────────────────────
// localStorage 헬퍼
// ─────────────────────────────────────────────────────────────
function loadHighScore() {
  try {
    const v = localStorage.getItem(LS_HIGH_SCORE_KEY);
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch (_) {
    return 0;
  }
}

function saveHighScore(score) {
  try {
    localStorage.setItem(LS_HIGH_SCORE_KEY, String(score));
  } catch (_) {
    // private mode 등 — 무시
  }
}

// ─────────────────────────────────────────────────────────────
// 캔버스 크기 조정
// ─────────────────────────────────────────────────────────────
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function getGridSize() {
  return {
    cols: Math.floor(canvas.width  / CELL),
    rows: Math.floor(canvas.height / CELL),
  };
}

// ─────────────────────────────────────────────────────────────
// 렌더링
// ─────────────────────────────────────────────────────────────

/** 배경 격자 */
function drawBackground() {
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth   = 0.5;
  for (let x = 0; x <= state.cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, state.rows * CELL);
    ctx.stroke();
  }
  for (let y = 0; y <= state.rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(state.cols * CELL, y * CELL);
    ctx.stroke();
  }
}

/** 지렁이 */
function drawSnake() {
  state.snake.forEach((seg, i) => {
    const alpha = i === 0 ? 1 : 0.85 - (i / state.snake.length) * 0.4;
    ctx.fillStyle = i === 0 ? "#4cff80" : `rgba(60,210,100,${alpha})`;
    ctx.beginPath();
    ctx.roundRect(
      seg.x * CELL + 1,
      seg.y * CELL + 1,
      CELL - 2,
      CELL - 2,
      4,
    );
    ctx.fill();

    // 머리 눈 표시
    if (i === 0) {
      ctx.fillStyle = "#0d0d0d";
      const eyeSize = 3;
      const dir = state.dir;
      // 방향에 따라 눈 위치 결정
      let e1x, e1y, e2x, e2y;
      if (dir.x === 1) {
        // 오른쪽
        e1x = seg.x * CELL + CELL - 6; e1y = seg.y * CELL + 4;
        e2x = seg.x * CELL + CELL - 6; e2y = seg.y * CELL + CELL - 4 - eyeSize;
      } else if (dir.x === -1) {
        // 왼쪽
        e1x = seg.x * CELL + 3;        e1y = seg.y * CELL + 4;
        e2x = seg.x * CELL + 3;        e2y = seg.y * CELL + CELL - 4 - eyeSize;
      } else if (dir.y === -1) {
        // 위
        e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + 3;
        e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + 3;
      } else {
        // 아래
        e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + CELL - 6;
        e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + CELL - 6;
      }
      ctx.fillRect(e1x, e1y, eyeSize, eyeSize);
      ctx.fillRect(e2x, e2y, eyeSize, eyeSize);
    }
  });
}

/** 먹이 */
function drawFood() {
  if (!state.food) return;
  const { x, y } = state.food;
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  const r  = CELL / 2 - 3;

  // 빛나는 원
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grd.addColorStop(0,   "#fff0aa");
  grd.addColorStop(0.5, "#ffcc00");
  grd.addColorStop(1,   "#ff8800");

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  // 광채 링
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,200,0,0.3)";
  ctx.lineWidth   = 2;
  ctx.stroke();
}

/** HUD 업데이트 */
function updateHUD() {
  hudScoreEl.textContent = state.score;
  hudHighEl.textContent  = state.highScore;
}

/** 전체 프레임 렌더 */
function render() {
  drawBackground();
  drawFood();
  drawSnake();
  updateHUD();
}

// ─────────────────────────────────────────────────────────────
// Game Over 처리
// ─────────────────────────────────────────────────────────────
function showGameOver() {
  goScoreEl.textContent = state.score;
  goOverlay.removeAttribute("hidden");
  saveHighScore(state.highScore);
}

function hideGameOver() {
  goOverlay.setAttribute("hidden", "");
}

// ─────────────────────────────────────────────────────────────
// PAUSED 오버레이 처리 — BF-524
// ─────────────────────────────────────────────────────────────
function showPaused() {
  pausedOverlay.removeAttribute("hidden");
}

function hidePaused() {
  pausedOverlay.setAttribute("hidden", "");
}

/** 멈춤/재개 토글 — playing ↔ paused.
 *  playing 이 아닌 상태 (gameover 등) 에서는 동작 안 함 (AC §3).
 *  BF-526 AC §4: 토글 횟수 · 누적 멈춤 시간 KPI 를 sessionStorage + console 에 기록.
 */
function togglePause() {
  if (state.status === "playing") {
    // 게임 루프 즉시 중단
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    // KPI: 멈춤 시작 타임스탬프 기록 + 토글 횟수 증가
    pauseToggleCount++;
    pauseStartTs = performance.now();

    state = Object.assign({}, state, { status: "paused" });
    render();      // 현재 프레임 유지 (지렁이·먹이 고정)
    showPaused();
  } else if (state.status === "paused") {
    // KPI: 누적 멈춤 시간 계산 → sessionStorage 저장 + console 기록
    const pausedMs = performance.now() - pauseStartTs;
    totalPausedMs += pausedMs;
    try {
      sessionStorage.setItem(
        SS_PAUSE_KPI_KEY,
        JSON.stringify({ toggleCount: pauseToggleCount, totalPausedMs: Math.round(totalPausedMs) }),
      );
    } catch (_) {
      // private mode 등 — 무시
    }
    console.log(
      `[BF-526 KPI] 멈춤/재개 토글 ${pauseToggleCount}회, 누적 멈춤 ${Math.round(totalPausedMs)}ms`,
    );

    hidePaused();
    state = Object.assign({}, state, { status: "playing" });
    startLoop();   // lastTs 리셋 후 RAF 재시작 → 위치·방향·점수 보존
  }
}

// ─────────────────────────────────────────────────────────────
// 게임 루프 (rAF + 틱 타이머)
// ─────────────────────────────────────────────────────────────
function loop(ts) {
  if (state.status !== "playing") return;

  rafId = requestAnimationFrame(loop);

  const elapsed = ts - lastTs;
  if (elapsed < TICK_MS) {
    render();
    return;
  }
  lastTs = ts - (elapsed % TICK_MS);

  state = tick(state);
  render();

  if (state.status === "gameover") {
    cancelAnimationFrame(rafId);
    rafId = null;
    render(); // 최종 프레임
    showGameOver();
  }
}

function startLoop() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  lastTs = performance.now();
  rafId  = requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────────────────────
// 게임 초기화 / 재시작
// ─────────────────────────────────────────────────────────────
function initGame() {
  resizeCanvas();
  const { cols, rows } = getGridSize();
  const hs = loadHighScore();
  state = createInitialState(cols, rows, hs);
  hideGameOver();
  render();
  startLoop();
}

function doRestart() {
  hideGameOver();
  // KPI 초기화 — 새 게임마다 리셋 (BF-526 AC §4)
  pauseToggleCount = 0;
  pauseStartTs     = 0;
  totalPausedMs    = 0;
  state = restartGame(state);
  saveHighScore(state.highScore);
  startLoop();
}

// ─────────────────────────────────────────────────────────────
// 키보드 이벤트
// ─────────────────────────────────────────────────────────────
const KEY_DIR = {
  ArrowUp:    DIR.UP,
  ArrowDown:  DIR.DOWN,
  ArrowLeft:  DIR.LEFT,
  ArrowRight: DIR.RIGHT,
  // WASD 지원 — BF-514 AC §2
  w: DIR.UP,    W: DIR.UP,
  s: DIR.DOWN,  S: DIR.DOWN,
  a: DIR.LEFT,  A: DIR.LEFT,
  d: DIR.RIGHT, D: DIR.RIGHT,
};

window.addEventListener("keydown", (e) => {
  // ① 게임 오버 상태: Space → 재시작 (AC §3 — 멈춤/재개와 충돌 없음, early-return)
  if (state.status === "gameover") {
    if (e.code === "Space") {
      e.preventDefault();
      doRestart();
    }
    return;
  }

  // ② 멈춤/재개 토글 — playing 또는 paused 상태에서만 (AC §1, §2)
  if (e.code === "Space") {
    e.preventDefault();
    togglePause();
    return;
  }

  // ③ 방향키는 playing 상태에서만 허용 (paused 중 방향 변경 불가)
  if (state.status === "playing") {
    const dir = KEY_DIR[e.key];
    if (dir) {
      e.preventDefault();
      state = changeDirection(state, dir);
    }
  }
});

// ─────────────────────────────────────────────────────────────
// 창 크기 변경 — 격자 재계산 후 재시작
// ─────────────────────────────────────────────────────────────
window.addEventListener("resize", () => {
  resizeCanvas();
  const { cols, rows } = getGridSize();
  const hs = Math.max(state.highScore, loadHighScore());
  state = createInitialState(cols, rows, hs);
  if (rafId !== null) cancelAnimationFrame(rafId);
  hideGameOver();
  startLoop();
});

// ─────────────────────────────────────────────────────────────
// 엔트리
// ─────────────────────────────────────────────────────────────
initGame();
