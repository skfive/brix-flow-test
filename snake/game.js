// BF-504 · Snake 게임 DOM/Canvas 컨트롤러
// - logic.js 의 순수 로직을 이용해 캔버스 렌더링 + 이벤트 처리
// - localStorage High Score 영속
//
// BF-518: index.html 인라인 IIFE 가 globalThis(window) 에 로직 변수 주입
// BF-522: type="module" + dynamic import 완전 제거 → file:// CORS 오류 수정.
//   <script src="./game.js"> (type 속성 없음) 로 로드.
//   CELL / LS_HIGH_SCORE_KEY / DIR / 로직 함수들은 index.html 인라인 IIFE 가
//   globalThis 에 설정 → 아래 구조 분해로 참조. file:// / http:// 모두 동일하게 동작.
//
// BF-530: CPU 지렁이 렌더링 + 경쟁 게임 KPI (s2 §5, §6) 추가

const {
  CELL,
  LS_HIGH_SCORE_KEY,
  DIR,
  createInitialState,
  changeDirection,
  tick,
  tickFull,
  cpuChooseDir,
  restartGame,
} = globalThis;

// ─────────────────────────────────────────────────────────────
// DOM 참조
// ─────────────────────────────────────────────────────────────
const canvas    = document.getElementById("game-canvas");
const ctx       = canvas.getContext("2d");

// HUD — BF-530 s2 §5-3 (PLAYER / CPU 이중 점수판)
const hudPlayerScoreEl = document.getElementById("hud-player-score");
const hudCPUScoreEl    = document.getElementById("hud-cpu-score");
const hudHighEl        = document.getElementById("hud-high-value");
// BF-504/514/518 하위 호환 별칭 (hidden, hud-player-score 와 동기화)
const hudScoreValueEl  = document.getElementById("hud-score-value");

// 게임 결과 오버레이 — BF-530 s2 §5-4
const goOverlay    = document.getElementById("gameover-overlay");
const goResultEl   = document.getElementById("go-result");
const goScoreEl    = document.getElementById("go-score");
const goCPUScoreEl = document.getElementById("go-cpu-score");

// PAUSED 오버레이 — BF-524
const pausedOverlay = document.getElementById("paused-overlay");

// ─────────────────────────────────────────────────────────────
// 게임 상태
// ─────────────────────────────────────────────────────────────
let state;
let rafId  = null;
let lastTs = 0;

/** 틱 간격 (ms) — 이 값마다 게임 로직 1 스텝 */
const TICK_MS = 120;

/** 제한 시간 (ms) — s2 §1 T5 */
const GAME_DURATION_MS = 120000;

// ─────────────────────────────────────────────────────────────
// KPI 측정 변수 — BF-526 (pause) + BF-530 (competition)
// ─────────────────────────────────────────────────────────────
/** 이번 게임 세션의 멈춤/재개 토글 횟수 */
let pauseToggleCount = 0;
/** 현재 멈춤 구간 시작 타임스탬프 (ms, performance.now()) */
let pauseStartTs = 0;
/** 이번 게임 세션의 누적 멈춤 시간 (ms) */
let totalPausedMs = 0;
/** 이번 게임 시작 타임스탬프 (멈춤 구간 제외 생존시간 측정용) */
let gameStartTs = 0;

/** sessionStorage 키 (BF-526) */
const SS_PAUSE_KPI_KEY = "bf-snake-pause-kpi";

/** localStorage 키 — BF-530 KPI (s2 §6-2) */
const COMP_KPI_KEY   = "bf-snake-comp-kpi";
const COMP_STATS_KEY = "bf-snake-comp-stats";

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

/** KPI 누적 통계 로드 (s2 §6-2-2) */
function loadCompStats() {
  try {
    const v = localStorage.getItem(COMP_STATS_KEY);
    if (v) return JSON.parse(v);
  } catch (_) { /* ignore */ }
  return { totalGames: 0, wins: 0, losses: 0, draws: 0, totalDeaths: 0, cpuCollisionDeaths: 0 };
}

/** KPI 기록 — 게임 종료 시 호출 (s2 §6-2) */
function logKPI() {
  const survivalMs = Math.round(performance.now() - gameStartTs - totalPausedMs);
  const result     = state.result; // "player_win" | "cpu_win" | "draw" | null
  const deathCause = state.deathCause;

  // ── 직전 게임 KPI (bf-snake-comp-kpi) ──────────────────
  const kpiEntry = {
    survivalMs,
    result:      result === "player_win" ? "win" : result === "cpu_win" ? "lose" : "draw",
    playerScore: state.score,
    cpuScore:    state.cpuScore,
    deathCause:  deathCause,
    cpuCollision: deathCause === "cpu_body" || deathCause === "head_on",
    timestamp:   Date.now(),
  };
  try { localStorage.setItem(COMP_KPI_KEY, JSON.stringify(kpiEntry)); } catch (_) { /* EC-5 */ }

  // ── 누적 통계 (bf-snake-comp-stats) ────────────────────
  const stats = loadCompStats();
  stats.totalGames++;
  if (result === "player_win")      stats.wins++;
  else if (result === "cpu_win")    stats.losses++;
  else                              stats.draws++;

  if (result !== "player_win" && deathCause && deathCause !== "timeout") {
    stats.totalDeaths++;
    if (kpiEntry.cpuCollision) stats.cpuCollisionDeaths++;
  }
  try { localStorage.setItem(COMP_STATS_KEY, JSON.stringify(stats)); } catch (_) { /* EC-5 */ }

  // ── console 출력 (s2 §6-2-3) ────────────────────────────
  const winRate =
    stats.totalGames > 0
      ? ((stats.wins / stats.totalGames) * 100).toFixed(1)
      : "0.0";
  console.log(
    `[BF-529 KPI] 결과: ${kpiEntry.result} | 생존시간: ${survivalMs}ms | P:${state.score} vs CPU:${state.cpuScore} | 사망원인: ${deathCause} | 승률: ${winRate}%(${stats.wins}/${stats.totalGames})`
  );

  // ── BF-526 멈춤 KPI console ──────────────────────────────
  console.log(
    `[BF-526 KPI] 멈춤/재개 토글 ${pauseToggleCount}회, 누적 멈춤 ${Math.round(totalPausedMs)}ms`,
  );
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

/** 플레이어 지렁이 — 초록 계열 (#4cff80 / #00cc44) */
function drawSnake() {
  state.snake.forEach((seg, i) => {
    const alpha = i === 0 ? 1 : 0.85 - (i / state.snake.length) * 0.4;
    ctx.fillStyle = i === 0 ? "#00cc44" : `rgba(60,210,100,${alpha})`;
    ctx.beginPath();
    ctx.roundRect(
      seg.x * CELL + 1,
      seg.y * CELL + 1,
      CELL - 2,
      CELL - 2,
      4,
    );
    ctx.fill();

    // 헤드 테두리 (2px) — s2 §5-1
    if (i === 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4);
      ctx.stroke();

      // 눈
      ctx.fillStyle = "#0d0d0d";
      const eyeSize = 3;
      const dir = state.dir;
      let e1x, e1y, e2x, e2y;
      if (dir.x === 1) {
        e1x = seg.x * CELL + CELL - 6; e1y = seg.y * CELL + 4;
        e2x = seg.x * CELL + CELL - 6; e2y = seg.y * CELL + CELL - 4 - eyeSize;
      } else if (dir.x === -1) {
        e1x = seg.x * CELL + 3;        e1y = seg.y * CELL + 4;
        e2x = seg.x * CELL + 3;        e2y = seg.y * CELL + CELL - 4 - eyeSize;
      } else if (dir.y === -1) {
        e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + 3;
        e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + 3;
      } else {
        e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + CELL - 6;
        e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + CELL - 6;
      }
      ctx.fillRect(e1x, e1y, eyeSize, eyeSize);
      ctx.fillRect(e2x, e2y, eyeSize, eyeSize);
    }
  });
}

/** CPU 지렁이 — 주황-빨강 계열 (#ff6b4c / #cc2200) — s2 §5-1 */
function drawCpuSnake() {
  if (!state.cpu || state.cpu.length === 0) return;
  state.cpu.forEach((seg, i) => {
    const alpha = i === 0 ? 1 : 0.85 - (i / state.cpu.length) * 0.4;
    ctx.fillStyle = i === 0 ? "#cc2200" : `rgba(210,60,60,${alpha})`;
    ctx.beginPath();
    ctx.roundRect(
      seg.x * CELL + 1,
      seg.y * CELL + 1,
      CELL - 2,
      CELL - 2,
      4,
    );
    ctx.fill();

    // 헤드 테두리 (2px) — s2 §5-1
    if (i === 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4);
      ctx.stroke();

      // CPU 눈
      ctx.fillStyle = "#0d0d0d";
      const eyeSize = 3;
      const dir = state.cpuDir;
      let e1x, e1y, e2x, e2y;
      if (dir.x === 1) {
        e1x = seg.x * CELL + CELL - 6; e1y = seg.y * CELL + 4;
        e2x = seg.x * CELL + CELL - 6; e2y = seg.y * CELL + CELL - 4 - eyeSize;
      } else if (dir.x === -1) {
        e1x = seg.x * CELL + 3;        e1y = seg.y * CELL + 4;
        e2x = seg.x * CELL + 3;        e2y = seg.y * CELL + CELL - 4 - eyeSize;
      } else if (dir.y === -1) {
        e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + 3;
        e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + 3;
      } else {
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

/** HUD 업데이트 — BF-530 s2 §5-3 양쪽 점수 */
function updateHUD() {
  hudPlayerScoreEl.textContent = state.score;
  if (hudScoreValueEl) hudScoreValueEl.textContent = state.score; // BF-504 하위 호환
  hudCPUScoreEl.textContent    = state.cpuScore;
  hudHighEl.textContent        = state.highScore;
}

/** 전체 프레임 렌더 */
function render() {
  drawBackground();
  drawFood();
  drawSnake();
  drawCpuSnake();
  updateHUD();
}

// ─────────────────────────────────────────────────────────────
// Game Over / 결과 오버레이 처리 — BF-530 s2 §5-4
// ─────────────────────────────────────────────────────────────
function showGameOver() {
  // 결과 텍스트 + 색상 (s2 §5-4)
  const resultMap = {
    player_win: { text: "YOU WIN",  color: "#4cff80" },
    cpu_win:    { text: "YOU LOSE", color: "#ff4c4c" },
    draw:       { text: "DRAW",     color: "#ffcc44" },
  };
  const info = resultMap[state.result] || { text: "GAME OVER", color: "#ffffff" };
  goResultEl.textContent  = info.text;
  goResultEl.style.color  = info.color;
  goScoreEl.textContent    = state.score;
  goCPUScoreEl.textContent = state.cpuScore;
  goOverlay.removeAttribute("hidden");
  saveHighScore(state.highScore);
  logKPI();
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

    hidePaused();
    state = Object.assign({}, state, { status: "playing" });
    startLoop();   // lastTs 리셋 후 RAF 재시작 → 위치·방향·점수 보존
  }
}

// ─────────────────────────────────────────────────────────────
// 게임 루프 (rAF + 틱 타이머) — BF-530: tickFull + T5 제한 시간
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

  // T5: 제한 시간 초과 → 점수 비교 (s2 §2, §3-2)
  const survivedMs = performance.now() - gameStartTs - totalPausedMs;
  if (survivedMs >= GAME_DURATION_MS) {
    cancelAnimationFrame(rafId);
    rafId = null;
    let result;
    if      (state.score > state.cpuScore) result = "player_win";
    else if (state.score < state.cpuScore) result = "cpu_win";
    else                                    result = "draw";
    state = Object.assign({}, state, {
      status:     "gameover",
      result,
      deathCause: "timeout",
      highScore:  Math.max(state.highScore, state.score),
    });
    render();
    showGameOver();
    return;
  }

  // tickFull: player + CPU 동시 1 스텝 (BF-530)
  state = tickFull(state);
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
  // KPI 타이머 시작
  gameStartTs   = performance.now();
  totalPausedMs = 0;
  render();
  startLoop();
}

function doRestart() {
  hideGameOver();
  // KPI 초기화 — 새 게임마다 리셋 (BF-526 AC §4 + BF-530)
  pauseToggleCount = 0;
  pauseStartTs     = 0;
  totalPausedMs    = 0;
  gameStartTs      = performance.now();
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
  gameStartTs   = performance.now();
  totalPausedMs = 0;
  startLoop();
});

// ─────────────────────────────────────────────────────────────
// 엔트리
// ─────────────────────────────────────────────────────────────
initGame();
