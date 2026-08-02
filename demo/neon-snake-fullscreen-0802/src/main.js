// 네온 스네이크 전체화면 — 브라우저 실행 코드 (canvas 렌더·입력·HUD·localStorage)
// 순수 규칙(game.js)에 DOM 이벤트/requestAnimationFrame/localStorage를 위임한다.
// 실행 설계: docs/plans/neon-snake-fullscreen-0802-BF-1489.md §7~§8
import {
  createInitialState,
  startGame,
  setDirection,
  step,
  pauseGame,
  resumeGame,
  restartGame,
  GRID_COLS,
  GRID_ROWS,
  HIGH_SCORE_STORAGE_KEY,
} from './game.js';

// ---- DOM 참조 (frozen §3.1 selector) ----
const stage = document.getElementById('snake-stage');
const canvas = document.getElementById('snake-canvas');
const ctx = canvas.getContext('2d');
const hudScore = document.getElementById('hud-score');
const hudHighscore = document.getElementById('hud-highscore');
const hudSpeed = document.getElementById('hud-speed');
const screenStart = document.getElementById('screen-start');
const screenPause = document.getElementById('screen-pause');
const screenGameover = document.getElementById('screen-gameover');
const gameoverSummary = document.getElementById('gameover-summary');
const actionStart = document.getElementById('action-start');
const actionRestart = document.getElementById('action-restart');
const srStatus = document.getElementById('sr-status');

const reducedMotion =
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- localStorage 최고 점수 (side-effect는 main.js 소관, §4) ----
function loadHighScore() {
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    const n = raw == null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(value) {
  try {
    window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(value));
  } catch {
    /* localStorage 접근 불가 시 무시 (게임 진행에는 영향 없음) */
  }
}

// ---- 상태 ----
let state = createInitialState({ highScore: loadHighScore() });
let announcedHighScore = state.highScore;

// ---- canvas 해상도 (DPR/resize 대응, §8) ----
let cssWidth = 0;
let cssHeight = 0;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = stage.getBoundingClientRect();
  cssWidth = Math.max(1, Math.floor(rect.width));
  cssHeight = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render();
}

// 논리 격자를 정사각 셀로 중앙 배치 (레터박스) — §8
function gridMetrics() {
  const cell = Math.floor(Math.min(cssWidth, cssHeight) / GRID_COLS);
  const boardW = cell * GRID_COLS;
  const boardH = cell * GRID_ROWS;
  const offsetX = Math.floor((cssWidth - boardW) / 2);
  const offsetY = Math.floor((cssHeight - boardH) / 2);
  return { cell, offsetX, offsetY, boardW, boardH };
}

// ---- 렌더링 ----
function render() {
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  // 배경
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  const { cell, offsetX, offsetY, boardW, boardH } = gridMetrics();
  if (cell <= 0) {
    return;
  }

  // 보드 테두리
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(offsetX + 0.5, offsetY + 0.5, boardW, boardH);

  // 먹이
  if (state.food) {
    drawCell(state.food, '#ff2d95', cell, offsetX, offsetY, !reducedMotion);
  }

  // 뱀 (머리는 시안, 몸통은 그린)
  for (let i = state.snake.length - 1; i >= 0; i -= 1) {
    const color = i === 0 ? '#00e5ff' : '#39ff14';
    drawCell(state.snake[i], color, cell, offsetX, offsetY, !reducedMotion && i === 0);
  }
}

function drawCell(cellPos, color, cell, offsetX, offsetY, glow) {
  const pad = Math.max(1, Math.floor(cell * 0.08));
  const x = offsetX + cellPos.x * cell + pad;
  const y = offsetY + cellPos.y * cell + pad;
  const size = cell - pad * 2;
  ctx.save();
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(4, cell * 0.6);
  }
  ctx.fillStyle = color;
  const r = Math.max(2, Math.floor(cell * 0.2));
  roundRect(ctx, x, y, size, size, r);
  ctx.fill();
  ctx.restore();
}

function roundRect(context, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

// ---- HUD / overlay / sr-status 갱신 ----
function overlayFor(status) {
  return {
    ready: screenStart,
    paused: screenPause,
    gameover: screenGameover,
  }[status];
}

function syncView() {
  hudScore.textContent = `점수 ${state.score}`;
  hudHighscore.textContent = `최고 ${state.highScore}`;
  hudSpeed.textContent = `속도 ${state.speedLevel + 1}`;

  // 상태별 overlay 노출 (§3.2)
  const active = overlayFor(state.status);
  for (const el of [screenStart, screenPause, screenGameover]) {
    el.classList.toggle('is-hidden', el !== active);
  }

  if (state.status === 'gameover') {
    gameoverSummary.textContent = `점수 ${state.score} · 최고 점수 ${state.highScore}`;
  }
}

function announce(text) {
  srStatus.textContent = text;
}

// ---- 상태 전이 헬퍼 (side-effect: 렌더·announce·localStorage) ----
function applyStart() {
  if (state.status !== 'ready') {
    return;
  }
  state = startGame(state);
  syncView();
  render();
  announce('게임 시작');
  focusStageForPlay();
}

function applyRestart() {
  state = restartGame(state);
  announcedHighScore = state.highScore;
  syncView();
  render();
  announce('준비됨, 시작을 눌러 플레이하세요');
  // 재시작 후 주 실행 control(action-start) 즉시 재사용 가능
  actionStart.focus();
}

function togglePause() {
  if (state.status === 'running') {
    state = pauseGame(state);
    announce('일시정지');
  } else if (state.status === 'paused') {
    state = resumeGame(state);
    announce('게임 재개');
  }
  syncView();
  render();
}

function handleGameoverTransition(prevStatus) {
  if (prevStatus !== 'gameover' && state.status === 'gameover') {
    if (state.highScore > announcedHighScore) {
      saveHighScore(state.highScore);
      announcedHighScore = state.highScore;
    }
    announce(`게임 오버, 점수 ${state.score}, 최고 점수 ${state.highScore}`);
    // 게임오버 시 주 실행 control(action-restart) 재활성·포커스
    syncView();
    render();
    actionRestart.focus();
  }
}

function focusStageForPlay() {
  // 방향키 입력을 stage가 받도록 (버튼 포커스에서 벗어남)
  if (typeof canvas.focus === 'function') {
    canvas.setAttribute('tabindex', '-1');
    canvas.focus();
  }
}

// ---- 게임 루프 (accumulator + requestAnimationFrame) ----
let lastTime = null;
let accumulator = 0;

function loop(now) {
  if (lastTime == null) {
    lastTime = now;
  }
  const dt = now - lastTime;
  lastTime = now;

  if (state.status === 'running') {
    accumulator += dt;
    while (accumulator >= state.stepMs && state.status === 'running') {
      accumulator -= state.stepMs;
      const prevScore = state.score;
      const prevStatus = state.status;
      state = step(state);
      if (state.score !== prevScore) {
        announce(`점수 ${state.score}`);
      }
      handleGameoverTransition(prevStatus);
    }
  } else {
    accumulator = 0;
  }

  syncView();
  render();
  window.requestAnimationFrame(loop);
}

// ---- 입력: 키보드 (§7) ----
const DIR_KEYS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
};

function onKeyDown(event) {
  const key = event.key;
  const lower = typeof key === 'string' ? key.toLowerCase() : key;

  // 일시정지 토글 (Space 또는 P) — running/paused에서만 게임 조작
  if (key === ' ' || key === 'Spacebar' || lower === 'p') {
    if (state.status === 'running' || state.status === 'paused') {
      event.preventDefault();
      togglePause();
    }
    return;
  }

  const dir = DIR_KEYS[key] ?? DIR_KEYS[lower];
  if (dir) {
    if (state.status === 'running') {
      event.preventDefault();
      state = setDirection(state, dir);
    }
  }
}

// ---- 입력: 모바일 스와이프 (§3.5-3) ----
let touchStart = null;
const SWIPE_THRESHOLD = 24;

function onTouchStart(event) {
  const t = event.changedTouches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}

function onTouchEnd(event) {
  if (!touchStart) {
    return;
  }
  const t = event.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
    return;
  }
  let dir;
  if (Math.abs(dx) > Math.abs(dy)) {
    dir = dx > 0 ? 'right' : 'left';
  } else {
    dir = dy > 0 ? 'down' : 'up';
  }
  if (state.status === 'running') {
    state = setDirection(state, dir);
  }
}

// ---- 바인딩 ----
actionStart.addEventListener('click', applyStart);
actionRestart.addEventListener('click', applyRestart);
window.addEventListener('keydown', onKeyDown);
stage.addEventListener('touchstart', onTouchStart, { passive: true });
stage.addEventListener('touchend', onTouchEnd, { passive: true });
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);

// ---- 초기화 ----
resizeCanvas();
syncView();
render();
announce('준비됨, 시작을 눌러 플레이하세요');
window.requestAnimationFrame(loop);
