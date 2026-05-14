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
  MULTIPLIER_COLORS,
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

/** localStorage 키 — BF-533 배수 통계 KPI (명세 §9-1) */
const MULT_KPI_KEY   = "bf-snake-multiplier-kpi";
const MULT_STATS_KEY = "bf-snake-multiplier-stats";

/** localStorage 키 — BF-537 이팩트 트리거 KPI */
const EFFECT_KPI_KEY = "bf-snake-effect-kpi";

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

  // ── BF-537 이팩트 트리거 KPI ──────────────────────────────
  const fxTotal = Object.values(effectTriggerCount).reduce((s, v) => s + v, 0);
  const fxStr   = [1, 2, 4, 8].map(m => `${m}×:${effectTriggerCount[String(m)]}회`).join(" ");
  console.log(`[BF-537 KPI] 이팩트 트리거 — ${fxStr} | 총합:${fxTotal}회`);

  // ── BF-531 배수 통계 KPI (명세 §9-1~§9-2) ────────────────
  const mStats = state.multiplierStats;
  if (mStats) {
    const totalSpawned = Object.values(mStats).reduce((s, v) => s + v.spawned, 0);

    // 직전 게임 KPI 저장 (bf-snake-multiplier-kpi)
    const perMultiplier = {};
    for (const m of [1, 2, 4, 8]) {
      const k = String(m);
      const eatRate = mStats[k].spawned > 0
        ? Math.round(mStats[k].eaten / mStats[k].spawned * 100) / 100
        : 0;
      perMultiplier[k] = {
        spawned: mStats[k].spawned,
        eaten:   mStats[k].eaten,
        eatRate,
      };
    }
    const multKpiEntry = {
      timestamp:    Date.now(),
      totalSpawned,
      perMultiplier,
      playerScore:  state.score,
      cpuScore:     state.cpuScore,
    };
    try { localStorage.setItem(MULT_KPI_KEY, JSON.stringify(multKpiEntry)); } catch (_) { /* EC-5 */ }

    // 누적 통계 (bf-snake-multiplier-stats)
    let multStats;
    try {
      const v = localStorage.getItem(MULT_STATS_KEY);
      multStats = v ? JSON.parse(v) : null;
    } catch (_) { multStats = null; }
    if (!multStats) {
      multStats = {
        totalGames:   0,
        totalSpawned: { "1": 0, "2": 0, "4": 0, "8": 0 },
        totalEaten:   { "1": 0, "2": 0, "4": 0, "8": 0 },
      };
    }
    multStats.totalGames++;
    for (const m of [1, 2, 4, 8]) {
      const k = String(m);
      multStats.totalSpawned[k] += mStats[k].spawned;
      multStats.totalEaten[k]   += mStats[k].eaten;
    }
    try { localStorage.setItem(MULT_STATS_KEY, JSON.stringify(multStats)); } catch (_) { /* EC-5 */ }

    // console 출력 (명세 §9-2)
    const probStr = [1, 2, 4, 8].map(m => {
      const k = String(m);
      const pct = totalSpawned > 0
        ? (mStats[k].spawned / totalSpawned * 100).toFixed(1)
        : "0.0";
      return `${m}×:${mStats[k].spawned}건(${pct}%)`;
    }).join(" ");
    console.log(`[BF-531 KPI] 배수 통계 — ${probStr} | 총합:${totalSpawned}건`);

    const eatRateStr = [1, 2, 4, 8].map(m => {
      const k = String(m);
      const rate = mStats[k].spawned > 0
        ? (mStats[k].eaten / mStats[k].spawned * 100).toFixed(1)
        : "0.0";
      return `${m}×:${rate}%`;
    }).join(" ");
    console.log(`[BF-531 KPI] 수집률 — ${eatRateStr}`);
  }
}

// ─────────────────────────────────────────────────────────────
// 이팩트 렌더링 — BF-537
// ─────────────────────────────────────────────────────────────

/** 이팩트 on/off 토글 플래그.
 *  false 로 설정하면 triggerEffect 가 완전히 무효화되어 기존 게임 동작과 동일 (롤백 가능).
 *  브라우저 콘솔에서 EFFECTS_ENABLED = false 로 즉시 비활성화 가능. */
let EFFECTS_ENABLED = true;

/** 세션 내 이팩트 트리거 카운트 (배수별 누적, localStorage 동기화) */
const effectTriggerCount = { "1": 0, "2": 0, "4": 0, "8": 0 };

const effectLayer = document.getElementById("effect-layer");

/** 이팩트 KPI — localStorage 에 누적 카운트 저장 */
function saveEffectKPI() {
  try {
    localStorage.setItem(EFFECT_KPI_KEY, JSON.stringify(effectTriggerCount));
  } catch (_) { /* EC-5: private mode 등 — 무시 */ }
}

// ── 헬퍼 ──────────────────────────────────────────────────────

/** 스크린 플래시 오버레이 (4×/8× 공용) */
function triggerScreenFlash(color, durationMs) {
  const el = document.createElement("div");
  el.className = "fx-flash";
  el.style.cssText = `
    position: fixed; inset: 0;
    background: ${color};
    pointer-events: none;
    z-index: 16;
    animation: fx-screen-flash ${durationMs}ms ease-out forwards;
  `;
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
}

/** 화면 흔들림 (8× 전용) — body 에 적용, canvas 좌표 영향 없음 */
function triggerScreenShake() {
  document.body.style.animation = "fx-screen-shake 200ms ease-in-out";
  setTimeout(() => { document.body.style.animation = ""; }, 200);
}

// ── 배수별 이팩트 함수 ────────────────────────────────────────

/** 1× — 골든 스파클 (명세 §5-1) */
function triggerSparkle(cx, cy) {
  // 중심 플래시 (8px, 120ms)
  const center = document.createElement("div");
  center.className = "fx-particle fx-1x";
  center.style.cssText = `
    position: absolute;
    left: ${cx}px; top: ${cy}px;
    width: 8px; height: 8px;
    background: #ffcc00;
    border-radius: 50%;
    pointer-events: none;
    animation: fx-sparkle-center 120ms ease-out forwards;
  `;
  effectLayer.appendChild(center);
  center.addEventListener("animationend", () => center.remove(), { once: true });

  // 6개 방사형 파티클 — 60° 간격, travel 28px
  const colors = ["#ffcc00", "#fff3a0"];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 28);
    const ty    = Math.round(Math.sin(angle) * 28);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-1x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 3}px; top: ${cy - 3}px;
      width: 6px; height: 6px;
      background: ${colors[i % 2]};
      border-radius: 50%;
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-sparkle-particle 380ms cubic-bezier(0.2,0.6,0.4,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}

/** 2× — 사이언 다이아몬드 (명세 §5-2) */
function triggerPop(cx, cy) {
  // 중심 플래시 (#fff, 10px, 150ms)
  const center = document.createElement("div");
  center.className = "fx-particle fx-2x";
  center.style.cssText = `
    position: absolute;
    left: ${cx}px; top: ${cy}px;
    width: 10px; height: 10px;
    background: #ffffff;
    border-radius: 50%;
    pointer-events: none;
    animation: fx-sparkle-center 150ms ease-out forwards;
  `;
  effectLayer.appendChild(center);
  center.addEventListener("animationend", () => center.remove(), { once: true });

  // 8개 다이아몬드 파티클 — 45° 간격, travel 44px
  const colors = ["#00cfff", "#80e8ff"];
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 44);
    const ty    = Math.round(Math.sin(angle) * 44);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-2x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 3.5}px; top: ${cy - 3.5}px;
      width: 7px; height: 7px;
      background: ${colors[i % 2]};
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-pop-particle 480ms cubic-bezier(0.1,0.7,0.3,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}

/** 4× — 퍼플 버스트 (명세 §5-3) */
function triggerBurst(cx, cy) {
  // 스크린 플래시 (rgba(180,60,255,0.15), 60ms)
  triggerScreenFlash("rgba(180,60,255,0.15)", 60);

  // 중심 링 확장 (border: 2px solid #cc44ff, 0→44px 반지름, 350ms)
  const ring = document.createElement("div");
  ring.className = "fx-ring fx-4x";
  ring.style.cssText = `
    position: absolute;
    left: ${cx}px; top: ${cy}px;
    width: 0; height: 0;
    border: 2px solid #cc44ff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    animation: fx-burst-ring 350ms cubic-bezier(0.05,0.7,0.25,1) forwards;
  `;
  effectLayer.appendChild(ring);
  ring.addEventListener("animationend", () => ring.remove(), { once: true });

  const starClip = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

  // 내부 링 — 6개 별, 60° 간격, travel 30px
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 30);
    const ty    = Math.round(Math.sin(angle) * 30);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-4x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 5}px; top: ${cy - 5}px;
      width: 10px; height: 10px;
      background: #cc44ff;
      clip-path: ${starClip};
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-burst-inner 620ms cubic-bezier(0.05,0.7,0.25,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  // 외부 링 — 6개 별, 30° 오프셋, travel 62px, 50ms 딜레이
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 + 30) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 62);
    const ty    = Math.round(Math.sin(angle) * 62);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-4x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 5}px; top: ${cy - 5}px;
      width: 10px; height: 10px;
      background: #e080ff;
      clip-path: ${starClip};
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-burst-inner 620ms cubic-bezier(0.05,0.7,0.25,1) 50ms forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  // 위성 원 — 4개, 90° 간격, travel 42px
  for (let i = 0; i < 4; i++) {
    const angle = (i * 90) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 42);
    const ty    = Math.round(Math.sin(angle) * 42);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-4x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 4}px; top: ${cy - 4}px;
      width: 8px; height: 8px;
      background: #ffaaff;
      border-radius: 50%;
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-burst-inner 620ms cubic-bezier(0.05,0.7,0.25,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}

/** 8× — 메가 블라스트 (명세 §5-4) */
function triggerMegaBlast(cx, cy) {
  // 스크린 플래시 (rgba(255,68,68,0.25), 100ms)
  triggerScreenFlash("rgba(255,68,68,0.25)", 100);
  // 화면 흔들림 ±4px / 200ms
  triggerScreenShake();

  // 쇼크웨이브 링 1 — border: 2px solid #ff4444, 0→60px 반지름, 400ms
  const sw1 = document.createElement("div");
  sw1.className = "fx-ring fx-8x";
  sw1.style.cssText = `
    position: absolute;
    left: ${cx}px; top: ${cy}px;
    width: 0; height: 0;
    border: 2px solid #ff4444;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    animation: fx-shock1 400ms cubic-bezier(0,0.9,0.2,1) forwards;
  `;
  effectLayer.appendChild(sw1);
  sw1.addEventListener("animationend", () => sw1.remove(), { once: true });

  // 쇼크웨이브 링 2 — rgba(255,136,0,0.6), 0→90px, 600ms, 100ms 딜레이
  const sw2 = document.createElement("div");
  sw2.className = "fx-ring fx-8x";
  sw2.style.cssText = `
    position: absolute;
    left: ${cx}px; top: ${cy}px;
    width: 0; height: 0;
    border: 2px solid rgba(255,136,0,0.6);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    animation: fx-shock2 600ms cubic-bezier(0,0.9,0.2,1) 100ms forwards;
  `;
  effectLayer.appendChild(sw2);
  sw2.addEventListener("animationend", () => sw2.remove(), { once: true });

  // 내부 불꽃 파티클 — 8개, 45° 간격, travel 52px, 840ms
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 52);
    const ty    = Math.round(Math.sin(angle) * 52);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-8x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 5}px; top: ${cy - 7}px;
      width: 10px; height: 14px;
      background: linear-gradient(to bottom, #ff4444, #ff8800);
      border-radius: 80% 20% 80% 20%;
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-mega-main 840ms cubic-bezier(0,0.9,0.2,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  // 외부 원 파티클 — 8개, 22.5° 오프셋, travel 96px, 840ms
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45 + 22.5) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 96);
    const ty    = Math.round(Math.sin(angle) * 96);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-8x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 4}px; top: ${cy - 4}px;
      width: 8px; height: 8px;
      background: #ff8800;
      border-radius: 50%;
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-mega-main 840ms cubic-bezier(0,0.9,0.2,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  // 드리프트 별 — 4개, 위쪽 방향 중심, travel 80px, 1100ms (linear)
  const driftAngles = [-90, -60, -120, -75];
  for (let i = 0; i < 4; i++) {
    const angle = driftAngles[i] * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 80);
    const ty    = Math.round(Math.sin(angle) * 80);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-8x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 6}px; top: ${cy - 6}px;
      width: 12px; height: 12px;
      background: #ffcc00;
      clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-mega-drift 1100ms linear forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  // 스파크 — 4방향, 직선 (2×16px), travel 36px, 840ms
  for (let i = 0; i < 4; i++) {
    const angle = (i * 90) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 36);
    const ty    = Math.round(Math.sin(angle) * 36);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-8x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 1}px; top: ${cy - 8}px;
      width: 2px; height: 16px;
      background: #ffffff;
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-mega-main 840ms cubic-bezier(0,0.9,0.2,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}

/**
 * 파티클 이팩트 트리거 — 메인 디스패처 (명세 §6-3)
 * @param {number} cx  이팩트 원점 X (px, 뷰포트 기준)
 * @param {number} cy  이팩트 원점 Y (px, 뷰포트 기준)
 * @param {1|2|4|8} multiplier
 */
function triggerEffect(cx, cy, multiplier) {
  if (!EFFECTS_ENABLED) return;                 // on/off 토글 — off 시 기존 동작 완전 동일

  // KPI 트리거 카운트 누적 (AC-3)
  const k = String(multiplier);
  effectTriggerCount[k] = (effectTriggerCount[k] || 0) + 1;
  saveEffectKPI();

  switch (multiplier) {
    case 1: triggerSparkle(cx, cy);    break;
    case 2: triggerPop(cx, cy);        break;
    case 4: triggerBurst(cx, cy);      break;
    case 8: triggerMegaBlast(cx, cy);  break;
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

/** 먹이 — BF-533: 배수별 색상·레이블 렌더링 (명세 §2-1) */
function drawFood() {
  if (!state.food) return;
  const { x, y, multiplier = 1 } = state.food;
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  const r  = CELL / 2 - 3;

  // 배수별 색상 (MULTIPLIER_COLORS || fallback)
  const colorDef = (MULTIPLIER_COLORS && MULTIPLIER_COLORS[multiplier])
    || { fill: "#ffcc00", glow: "rgba(255,200,0,0.3)" };
  const fillColor = colorDef.fill;
  const glowColor = colorDef.glow;

  // 빛나는 원 (배수별 색상)
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grd.addColorStop(0,   "#ffffff");
  grd.addColorStop(0.4, fillColor);
  grd.addColorStop(1,   fillColor);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  // 광채 링 (배수별 색상)
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = glowColor;
  ctx.lineWidth   = 2;
  ctx.stroke();

  // 배수 레이블 (명세 §2-1: 흰색 굵은 폰트, 원 중앙)
  const fontSize = Math.round(CELL * 0.55);
  ctx.fillStyle    = "#ffffff";
  ctx.font         = `bold ${fontSize}px 'Courier New', monospace`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${multiplier}×`, cx, cy);
}

/** HUD 업데이트 — BF-530 s2 §5-3 양쪽 점수 */
function updateHUD() {
  hudPlayerScoreEl.textContent = state.score;
  if (hudScoreValueEl) hudScoreValueEl.textContent = state.score; // BF-504 하위 호환
  hudCPUScoreEl.textContent    = state.cpuScore;
  hudHighEl.textContent        = state.highScore;
}

// ─────────────────────────────────────────────────────────────
// 배수 통계 패널 업데이트 — BF-533 (명세 §7-3, §7-4)
// ─────────────────────────────────────────────────────────────

/** 배수별 실제 등장 확률 계산 (명세 §7-3) */
function calcSpawnProb(multiplierStats, m) {
  const total = Object.values(multiplierStats).reduce((s, v) => s + v.spawned, 0);
  if (total === 0) return "—";
  const prob = (multiplierStats[String(m)].spawned / total * 100).toFixed(1);
  return `${prob}%`;
}

/** 통계 패널 DOM 갱신 (명세 §7-4: 스폰 직후 즉시 갱신) */
function updateMultiplierStatsUI() {
  const stats = state.multiplierStats;
  if (!stats) return;
  for (const m of [1, 2, 4, 8]) {
    const countEl = document.getElementById(`ms-count-${m}`);
    const probEl  = document.getElementById(`ms-prob-${m}`);
    if (!countEl || !probEl) continue;
    countEl.textContent = stats[String(m)].spawned;
    probEl.textContent  = `(${calcSpawnProb(stats, m)})`;
  }
}

/** 전체 프레임 렌더 */
function render() {
  drawBackground();
  drawFood();
  drawSnake();
  drawCpuSnake();
  updateHUD();
  updateMultiplierStatsUI();
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
  const prevFood = state.food;            // BF-537: 수집 감지용 스냅샷
  state = tickFull(state);

  // BF-537: 먹이 수집 감지 → 이팩트 트리거 (명세 §6-4)
  // prevFood !== null && state.food !== prevFood → 수집 발생 (새 food 스폰 또는 null)
  if (prevFood !== null && state.food !== prevFood) {
    const { x, y, multiplier } = prevFood;
    triggerEffect(x * CELL + CELL / 2, y * CELL + CELL / 2, multiplier);
  }

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
  // BF-537: 이팩트 카운트 리셋
  for (const k of ["1", "2", "4", "8"]) effectTriggerCount[k] = 0;
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
