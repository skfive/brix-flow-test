// Line Defense — Canvas 2D 렌더링 + 입력 처리 (BF-1750)
//
// 이 모듈은 타이밍(requestAnimationFrame)·입력 이벤트·rng 시드 주입을 소유하고,
// game.js 순수 함수의 결과만 canvas/#hud-*/#overlay-* 에 반영한다.
// 게임 규칙 계산은 하지 않는다.

import {
  PHASES,
  createInitialState,
  setPhase,
  placeTower,
  step,
  reset,
  positionAlong,
  mulberry32,
} from './game.js';

const CANVAS_W = 800;
const CANVAS_H = 480;
const CELL = 40; // 800/20 = 40, 480/12 = 40 → 20x12 그리드, 정사각 셀
const SEED = 0x1a2b3c; // 고정 seed → 매 실행 결정적

const PHASE_LABEL = {
  [PHASES.START]: '시작 대기',
  [PHASES.PLAYING]: '진행 중',
  [PHASES.PAUSED]: '일시정지',
  [PHASES.GAMEOVER]: '게임 오버',
};

// 토큰 색상(§6 동결값)을 canvas 그리기에 사용.
const COLOR = {
  bg: '#0f172a',
  surface: '#1e293b',
  path: '#475569',
  tower: '#38bdf8',
  enemy: '#f43f5e',
  primary: '#22c55e',
  danger: '#ef4444',
  text: '#e2e8f0',
};

let state = createInitialState();
let rng = mulberry32(SEED);
let lastTs = 0;

/** 셀 좌표(x=col, y=row) → canvas 픽셀 중심 */
function cellCenter(cx, cy) {
  return { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 };
}

// ---- DOM 참조 ----
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const hud = {
  resource: document.getElementById('hud-resource'),
  lives: document.getElementById('hud-lives'),
  score: document.getElementById('hud-score'),
  wave: document.getElementById('hud-wave'),
};
const btnPause = document.getElementById('btn-pause');
const btnRestart = document.getElementById('btn-restart');
const overlayStart = document.getElementById('overlay-start');
const overlayGameover = document.getElementById('overlay-gameover');
const btnStart = document.getElementById('btn-start');
const btnGameoverRestart = document.getElementById('btn-gameover-restart');
const gameoverSummary = document.getElementById('gameover-summary');

/** HUD stat 텍스트 갱신(값은 <strong> 안에 표시) */
function setStat(el, value) {
  const strong = el.querySelector('strong');
  if (strong) strong.textContent = String(value);
}

/** 현재 상태를 HUD·오버레이·컨트롤·canvas aria 에 반영 */
function syncDom() {
  setStat(hud.resource, state.resource);
  setStat(hud.lives, state.lives);
  setStat(hud.score, state.score);
  setStat(hud.wave, state.wave);

  const playing = state.phase === PHASES.PLAYING;
  const paused = state.phase === PHASES.PAUSED;

  // 오버레이 표시(상태명 화면 텍스트 노출)
  overlayStart.hidden = state.phase !== PHASES.START;
  overlayGameover.hidden = state.phase !== PHASES.GAMEOVER;
  if (state.phase === PHASES.GAMEOVER) {
    gameoverSummary.textContent = `게임 오버 — 최종 점수: ${state.score}, 도달 웨이브: ${state.wave}`;
  }

  // 일시정지 버튼: 진행/일시정지일 때만 사용 가능, 라벨/aria 토글
  btnPause.disabled = !(playing || paused);
  btnPause.textContent = paused ? '재개' : '일시정지';
  btnPause.setAttribute('aria-label', paused ? '게임 재개' : '게임 일시정지');

  // 재시작 버튼은 항상 사용 가능(주 실행 control 재활성화 보장)
  btnRestart.disabled = false;

  // canvas 접근성: 상태명을 aria-label 로 노출
  canvas.setAttribute(
    'aria-label',
    `타워 디펜스 게임 화면. 상태: ${PHASE_LABEL[state.phase]}. ` +
      `자원 ${state.resource}, 생명 ${state.lives}, 점수 ${state.score}, 웨이브 ${state.wave}.`,
  );
}

/** canvas 렌더링 */
function draw() {
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const path = state.config.path;

  // 경로
  ctx.strokeStyle = COLOR.path;
  ctx.lineWidth = CELL * 0.6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  path.forEach((p, i) => {
    const c = cellCenter(p.x, p.y);
    if (i === 0) ctx.moveTo(c.x, c.y);
    else ctx.lineTo(c.x, c.y);
  });
  ctx.stroke();

  // base(경로 끝) 표시
  const end = path[path.length - 1];
  const endC = cellCenter(end.x, end.y);
  ctx.fillStyle = COLOR.danger;
  ctx.fillRect(endC.x - CELL / 2, endC.y - CELL / 2, CELL, CELL);

  // 타워
  ctx.fillStyle = COLOR.tower;
  for (const t of state.towers) {
    const c = cellCenter(t.col, t.row);
    ctx.fillRect(c.x - CELL * 0.35, c.y - CELL * 0.35, CELL * 0.7, CELL * 0.7);
  }

  // 적 + 체력바
  for (const e of state.enemies) {
    const pos = positionAlong(path, e.dist);
    const c = cellCenter(pos.x, pos.y);
    ctx.fillStyle = COLOR.enemy;
    ctx.beginPath();
    ctx.arc(c.x, c.y, CELL * 0.28, 0, Math.PI * 2);
    ctx.fill();
    // 체력바
    const w = CELL * 0.7;
    const ratio = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = COLOR.surface;
    ctx.fillRect(c.x - w / 2, c.y - CELL * 0.5, w, 4);
    ctx.fillStyle = COLOR.primary;
    ctx.fillRect(c.x - w / 2, c.y - CELL * 0.5, w * ratio, 4);
  }

  // 일시정지 상태 화면 텍스트(색상 외 텍스트 노출)
  if (state.phase === PHASES.PAUSED) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = COLOR.text;
    ctx.font = '32px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('일시정지 (PAUSED)', CANVAS_W / 2, CANVAS_H / 2);
  }
}

/** rAF 루프: playing 일 때만 step 진행 */
function frame(ts) {
  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
  lastTs = ts;
  if (state.phase === PHASES.PLAYING) {
    state = step(state, dt, rng);
  }
  syncDom();
  draw();
  requestAnimationFrame(frame);
}

// ---- 입력 처리 ----

/** 새 게임 시작: 초기화 + 시드 재설정 + playing 전이 */
function startGame() {
  state = setPhase(reset(state), PHASES.PLAYING);
  rng = mulberry32(SEED);
  syncDom();
}

/** 재시작: 초기값 복귀(start 오버레이 + 주 control 재활성화) */
function restartGame() {
  state = reset(state);
  rng = mulberry32(SEED);
  syncDom();
}

function togglePause() {
  if (state.phase === PHASES.PLAYING) state = setPhase(state, PHASES.PAUSED);
  else if (state.phase === PHASES.PAUSED) state = setPhase(state, PHASES.PLAYING);
  syncDom();
}

btnStart.addEventListener('click', startGame);
btnGameoverRestart.addEventListener('click', restartGame);
btnRestart.addEventListener('click', restartGame);
btnPause.addEventListener('click', togglePause);

// 캔버스 클릭 → 해당 셀에 타워 배치(진행 중일 때만)
canvas.addEventListener('click', (ev) => {
  if (state.phase !== PHASES.PLAYING) return;
  const rect = canvas.getBoundingClientRect();
  // 표시 크기가 축소되어도 내부 좌표(800x480) 기준으로 환산
  const px = ((ev.clientX - rect.left) / rect.width) * CANVAS_W;
  const py = ((ev.clientY - rect.top) / rect.height) * CANVAS_H;
  const col = Math.floor(px / CELL);
  const row = Math.floor(py / CELL);
  state = placeTower(state, { col, row });
  syncDom();
});

// 초기 표시
syncDom();
requestAnimationFrame(frame);
