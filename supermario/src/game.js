// 슈퍼마리오 1-1 — 게임 상태·물리·입력·렌더 루프 (BF-1878)
// vanilla ESM. 번들러 없이 브라우저가 직접 import 하며, node --test 로도 순수 로직을 검증한다.
// 물리·충돌·상태 로직은 DOM 의존 없이 export 되어 테스트 가능하고,
// DOM/렌더 부트스트랩은 파일 하단에서 브라우저 환경일 때만 실행한다.

import { LEVEL_1_1, LEGEND } from './level-1-1.js';

// ── 물리 상수 (docs/plans/BF-1876/implementation-plan.md §3) ────────────────
export const GRAVITY = 0.5;         // px/frame² — 매 프레임 vy 증가량
export const MOVE_SPEED = 2.0;      // px/frame — 좌우 이동 속도
export const JUMP_VELOCITY = -8.0;  // px/frame — 점프 시작 vy(위 방향 음수)
export const MAX_FALL_SPEED = 10;   // px/frame — 낙하 속도 상한
export const TILE = 16;             // px — 타일 한 칸 크기

// 점수 규칙(계약 아님 — developer 재량)
const SCORE_PER_TILE = 10;
const CLEAR_BONUS = 1000;

// ── 색상 토큰 (ui-contract §2.5) — 단일 상수에서만 참조, 헥사 재정의 금지 ──
export const COLORS = {
  sky: '#5c94fc',
  ground: '#c84c0c',
  brick: '#e45c10',
  mario: '#d82800',
  // 아래 두 색은 토큰 외 additive(블록/깃대 시각 구분용)
  block: '#f8b800',
  flag: '#00a800',
};

// solid 타일 종류 (§3.1)
const SOLID = new Set(['ground', 'brick', 'block']);
export function isSolid(type) {
  return SOLID.has(type);
}

// SCORE HUD 표기: 6자리 zero-pad
export function formatScore(score) {
  return String(Math.max(0, Math.floor(score))).padStart(6, '0');
}

// ── 레벨 파싱 ───────────────────────────────────────────────────────────────
export function parseLevel(level, legend = LEGEND) {
  const rows = level.rows;
  const height = rows.length;
  const width = rows[0].length;
  for (const row of rows) {
    if (row.length !== width) {
      throw new Error(`level rows must have equal width (expected ${width}, got ${row.length})`);
    }
  }
  const grid = rows.map((row) => Array.from(row, (ch) => legend[ch] ?? 'empty'));
  const tileSize = level.tileSize;
  return {
    grid,
    width,
    height,
    tileSize,
    spawn: level.spawn,
    pixelWidth: width * tileSize,
    pixelHeight: height * tileSize,
  };
}

function tileTypeAt(level, col, row) {
  if (row < 0 || row >= level.height || col < 0 || col >= level.width) return 'empty';
  return level.grid[row][col];
}

// AABB 와 겹치는 solid 타일 목록
function solidTilesOverlapping(box, level) {
  const t = level.tileSize;
  const c0 = Math.floor(box.x / t);
  const c1 = Math.floor((box.x + box.w - 1) / t);
  const r0 = Math.floor(box.y / t);
  const r1 = Math.floor((box.y + box.h - 1) / t);
  const out = [];
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (isSolid(tileTypeAt(level, c, r))) {
        out.push({ left: c * t, top: r * t, right: c * t + t, bottom: r * t + t });
      }
    }
  }
  return out;
}

function overlapsFlag(box, level) {
  const t = level.tileSize;
  const c0 = Math.floor(box.x / t);
  const c1 = Math.floor((box.x + box.w - 1) / t);
  const r0 = Math.floor(box.y / t);
  const r1 = Math.floor((box.y + box.h - 1) / t);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (tileTypeAt(level, c, r) === 'flag') return true;
    }
  }
  return false;
}

// ── 게임 상태 ────────────────────────────────────────────────────────────────
function makeMario(level) {
  return {
    x: level.spawn.x * TILE,
    y: level.spawn.y * TILE,
    w: TILE,
    h: TILE,
    vx: 0,
    vy: 0,
    onGround: false,
  };
}

function initialInput() {
  return { left: false, right: false, jump: false };
}

export function createGame(level = LEVEL_1_1) {
  const parsed = parseLevel(level);
  return {
    level: parsed,
    state: 'ready',
    score: 0,
    maxTileX: parsed.spawn.x,
    jumpLatched: false,
    input: initialInput(),
    mario: makeMario(parsed),
  };
}

// ready/gameover/cleared → playing 초기화 진입. playing 중 재조작은 무시(중복 루프 방지).
export function startGame(game) {
  if (game.state === 'playing') return game.state;
  game.state = 'playing';
  game.score = 0;
  game.maxTileX = game.level.spawn.x;
  game.jumpLatched = false;
  game.input = initialInput();
  game.mario = makeMario(game.level);
  return game.state;
}

// 초기화·취소·실패 후: 상태와 진행 표시를 초기값(ready/000000)으로 되돌린다.
export function resetGame(game) {
  game.state = 'ready';
  game.score = 0;
  game.maxTileX = game.level.spawn.x;
  game.jumpLatched = false;
  game.input = initialInput();
  game.mario = makeMario(game.level);
  return game.state;
}

export function setInput(game, partial) {
  Object.assign(game.input, partial);
}

export function togglePause(game) {
  if (game.state === 'playing') game.state = 'paused';
  else if (game.state === 'paused') game.state = 'playing';
  return game.state;
}

// 축 분리 이동+충돌 해소 (§3.1)
function resolveAxis(mario, level, axis) {
  if (axis === 'x') {
    mario.x += mario.vx;
    // 월드 경계
    if (mario.x < 0) { mario.x = 0; mario.vx = 0; }
    const maxX = level.pixelWidth - mario.w;
    if (mario.x > maxX) { mario.x = maxX; mario.vx = 0; }
    const tiles = solidTilesOverlapping(mario, level);
    for (const t of tiles) {
      if (mario.vx > 0) mario.x = t.left - mario.w;
      else if (mario.vx < 0) mario.x = t.right;
    }
    if (tiles.length) mario.vx = 0;
  } else {
    mario.y += mario.vy;
    mario.onGround = false;
    const tiles = solidTilesOverlapping(mario, level);
    for (const t of tiles) {
      if (mario.vy > 0) { mario.y = t.top - mario.h; mario.onGround = true; }
      else if (mario.vy < 0) { mario.y = t.bottom; }
    }
    if (tiles.length) mario.vy = 0;
  }
}

// 한 물리 스텝. playing 이 아니면 적분하지 않는다.
export function stepGame(game) {
  if (game.state !== 'playing') return game.state;
  const m = game.mario;
  const L = game.level;
  const inp = game.input;

  // 수평 입력 (좌+우 동시 → 상쇄)
  let vx = 0;
  if (inp.left) vx -= MOVE_SPEED;
  if (inp.right) vx += MOVE_SPEED;
  m.vx = vx;

  // 점프 — 접지 상태 + 새 입력(latch)일 때만. 공중 재점프 불가.
  if (inp.jump) {
    if (m.onGround && !game.jumpLatched) {
      m.vy = JUMP_VELOCITY;
      m.onGround = false;
      game.jumpLatched = true;
    }
  } else {
    game.jumpLatched = false;
  }

  // 중력 (접지 여부와 무관하게 적용 → 매 프레임 지면 접촉 재판정)
  m.vy = Math.min(m.vy + GRAVITY, MAX_FALL_SPEED);

  // 축 분리 충돌 해소
  resolveAxis(m, L, 'x');
  resolveAxis(m, L, 'y');

  // 우측 진행에 따른 점수
  const tileX = Math.floor(m.x / TILE);
  if (tileX > game.maxTileX) {
    game.score += (tileX - game.maxTileX) * SCORE_PER_TILE;
    game.maxTileX = tileX;
  }

  // 상태 전이: 깃대 도달 → cleared
  if (overlapsFlag(m, L)) {
    game.score += CLEAR_BONUS;
    game.state = 'cleared';
    return game.state;
  }
  // 낙사 → gameover
  if (m.y > L.pixelHeight) {
    game.state = 'gameover';
    return game.state;
  }
  return game.state;
}

// ── 브라우저 렌더/입력 부트스트랩 (node --test 에서는 실행되지 않음) ──────────
const STATUS_LABELS = {
  ready: { text: 'READY', aria: '준비 상태' },
  playing: { text: 'PLAYING', aria: '진행 중' },
  paused: { text: 'PAUSED', aria: '일시정지' },
  gameover: { text: 'GAME OVER', aria: '게임 오버' },
  cleared: { text: 'CLEARED', aria: '클리어' },
};

function render(ctx, canvas, game) {
  const L = game.level;
  const W = canvas.width;
  const H = canvas.height;
  const t = L.tileSize;
  const cam = Math.max(0, Math.min(game.mario.x + game.mario.w / 2 - W / 2, L.pixelWidth - W));

  ctx.fillStyle = COLORS.sky;
  ctx.fillRect(0, 0, W, H);

  const c0 = Math.floor(cam / t);
  const c1 = Math.ceil((cam + W) / t);
  for (let r = 0; r < L.height; r++) {
    for (let c = c0; c <= c1; c++) {
      const type = tileTypeAt(L, c, r);
      if (type === 'empty') continue;
      if (type === 'ground') ctx.fillStyle = COLORS.ground;
      else if (type === 'brick') ctx.fillStyle = COLORS.brick;
      else if (type === 'block') ctx.fillStyle = COLORS.block;
      else if (type === 'flag') ctx.fillStyle = COLORS.flag;
      ctx.fillRect(c * t - cam, r * t, t, t);
    }
  }

  ctx.fillStyle = COLORS.mario;
  ctx.fillRect(game.mario.x - cam, game.mario.y, game.mario.w, game.mario.h);

  if (game.state !== 'playing') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(STATUS_LABELS[game.state].text, W / 2, H / 2);
  }
}

function initBrowser() {
  const canvas = document.getElementById('game-canvas');
  const scoreEl = document.getElementById('game-score');
  const startBtn = document.getElementById('game-start');
  const statusEl = document.getElementById('game-status');
  if (!canvas || !scoreEl || !startBtn) return;

  let game;
  const ctx = canvas.getContext('2d');
  try {
    game = createGame(LEVEL_1_1);
  } catch (err) {
    // 로드 실패: ready 유지 + 오류 노출, start 사용 가능
    scoreEl.textContent = 'SCORE ' + formatScore(0);
    if (statusEl) {
      statusEl.textContent = 'ERROR';
      statusEl.setAttribute('aria-label', '레벨 로드 실패');
    }
    return;
  }

  function syncHud() {
    scoreEl.textContent = 'SCORE ' + formatScore(game.score);
    if (statusEl) {
      const label = STATUS_LABELS[game.state];
      statusEl.textContent = label.text;
      statusEl.setAttribute('aria-label', label.aria);
    }
  }

  const keymap = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'jump', Space: 'jump' };
  window.addEventListener('keydown', (e) => {
    const k = keymap[e.code];
    if (k) { e.preventDefault(); setInput(game, { [k]: true }); }
    else if (e.code === 'KeyP') { togglePause(game); syncHud(); }
  });
  window.addEventListener('keyup', (e) => {
    const k = keymap[e.code];
    if (k) { e.preventDefault(); setInput(game, { [k]: false }); }
  });
  startBtn.addEventListener('click', () => {
    if (game.state !== 'playing') { startGame(game); syncHud(); }
  });

  const STEP = 1000 / 60;
  let acc = 0;
  let last = null;
  function frame(ts) {
    if (last == null) last = ts;
    let dt = ts - last;
    last = ts;
    if (dt > 250) dt = 250; // 탭 비활성 후 물리 시간 점프 방지
    acc += dt;
    while (acc >= STEP) { stepGame(game); acc -= STEP; }
    syncHud();
    render(ctx, canvas, game);
    requestAnimationFrame(frame);
  }
  syncHud();
  render(ctx, canvas, game);
  requestAnimationFrame(frame);
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrowser);
  } else {
    initBrowser();
  }
}
