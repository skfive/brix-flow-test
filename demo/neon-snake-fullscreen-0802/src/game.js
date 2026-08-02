// 네온 스네이크 전체화면 — 순수 게임 규칙 (DOM/window/localStorage 비의존)
// 실행 설계: docs/plans/neon-snake-fullscreen-0802-BF-1489.md §4~§6
// 모든 함수는 입력 state를 변경하지 않고 새 state를 반환한다(불변성).

// §4 상수 (frozen 실행 설계 수치)
export const GRID_COLS = 28;
export const GRID_ROWS = 28;
export const INITIAL_SNAKE_LENGTH = 3;
export const INITIAL_DIRECTION = 'right';
export const INITIAL_STEP_MS = 140;
export const SPEED_STEP_MS_DECREMENT = 8;
export const MIN_STEP_MS = 60;
export const SPEED_UP_EVERY_N_FOODS = 3;
export const SCORE_PER_FOOD = 10;
export const HIGH_SCORE_STORAGE_KEY = 'neon-snake-fullscreen-0802:highscore';

// 방향 벡터 (격자 좌표계: x→오른쪽 증가, y→아래 증가)
export const DIRECTION_VECTORS = {
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

// 역방향 쌍: left↔right, up↔down
const OPPOSITE = {
  right: 'left',
  left: 'right',
  up: 'down',
  down: 'up',
};

function cellKey(cell) {
  return `${cell.x},${cell.y}`;
}

/**
 * §5 createInitialState — status 'ready', 중앙 수평 3칸 뱀(머리가 배열 첫 요소),
 * direction/nextDirection 'right', food null, 점수·속도 초기값.
 */
export function createInitialState(options = {}) {
  const cols = options.cols ?? GRID_COLS;
  const rows = options.rows ?? GRID_ROWS;
  const highScore = options.highScore ?? 0;
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const snake = [];
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i += 1) {
    snake.push({ x: cx - i, y: cy });
  }
  return {
    status: 'ready',
    cols,
    rows,
    snake,
    direction: INITIAL_DIRECTION,
    nextDirection: INITIAL_DIRECTION,
    food: null,
    score: 0,
    highScore,
    foodsEaten: 0,
    speedLevel: 0,
    stepMs: INITIAL_STEP_MS,
  };
}

/**
 * §5 spawnFood — 뱀이 점유하지 않은 빈 칸 중 하나를 rng로 선택.
 * 빈 칸이 없으면 null 반환.
 */
export function spawnFood(snake, rng = Math.random, cols = GRID_COLS, rows = GRID_ROWS) {
  const occupied = new Set(snake.map(cellKey));
  const empties = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cell = { x, y };
      if (!occupied.has(cellKey(cell))) {
        empties.push(cell);
      }
    }
  }
  if (empties.length === 0) {
    return null;
  }
  const idx = Math.floor(rng() * empties.length);
  return empties[idx];
}

/**
 * §5 startGame — ready → running. 첫 먹이를 spawnFood로 배치.
 * ready가 아니면 no-op.
 */
export function startGame(state, rng = Math.random) {
  if (state.status !== 'ready') {
    return state;
  }
  const food = spawnFood(state.snake, rng, state.cols, state.rows);
  return { ...state, status: 'running', food };
}

/**
 * §5 setDirection — running에서만: dir가 커밋된 direction의 반대가 아니면
 * nextDirection = dir. 반대이거나 running이 아니면 no-op.
 */
export function setDirection(state, dir) {
  if (state.status !== 'running') {
    return state;
  }
  if (!DIRECTION_VECTORS[dir]) {
    return state;
  }
  if (dir === OPPOSITE[state.direction]) {
    return state;
  }
  return { ...state, nextDirection: dir };
}

function toGameOver(state) {
  const highScore = state.score > state.highScore ? state.score : state.highScore;
  return { ...state, status: 'gameover', highScore };
}

/**
 * §5 step — running에서만: nextDirection 커밋 → 이동 → 벽/자기충돌 시 gameover,
 * 먹이 섭취 시 성장·점수·속도·새 먹이, 아니면 꼬리 제거. 그 외 상태면 no-op.
 */
export function step(state, rng = Math.random) {
  if (state.status !== 'running') {
    return state;
  }
  // nextDirection을 direction으로 커밋 (항상 커밋된 방향 기준 판정)
  const direction = state.nextDirection;
  const vec = DIRECTION_VECTORS[direction];
  const head = state.snake[0];
  const newHead = { x: head.x + vec.x, y: head.y + vec.y };

  // 벽 충돌
  if (newHead.x < 0 || newHead.x >= state.cols || newHead.y < 0 || newHead.y >= state.rows) {
    return toGameOver({ ...state, direction, nextDirection: direction });
  }

  const willEat = state.food != null && newHead.x === state.food.x && newHead.y === state.food.y;

  // 자기충돌 판정: 먹지 않는 tick에는 꼬리가 비므로 꼬리를 제외한 몸과 비교.
  // willEat이면 성장하므로 전체 몸과 비교.
  const body = willEat ? state.snake : state.snake.slice(0, state.snake.length - 1);
  const hitSelf = body.some((seg) => seg.x === newHead.x && seg.y === newHead.y);
  if (hitSelf) {
    return toGameOver({ ...state, direction, nextDirection: direction });
  }

  const grownSnake = [newHead, ...state.snake];

  if (willEat) {
    const score = state.score + SCORE_PER_FOOD;
    const foodsEaten = state.foodsEaten + 1;
    let speedLevel = state.speedLevel;
    let stepMs = state.stepMs;
    if (foodsEaten % SPEED_UP_EVERY_N_FOODS === 0) {
      speedLevel = state.speedLevel + 1;
      stepMs = Math.max(MIN_STEP_MS, INITIAL_STEP_MS - speedLevel * SPEED_STEP_MS_DECREMENT);
    }
    const food = spawnFood(grownSnake, rng, state.cols, state.rows);
    const nextState = {
      ...state,
      snake: grownSnake,
      direction,
      nextDirection: direction,
      score,
      foodsEaten,
      speedLevel,
      stepMs,
      food,
    };
    if (food === null) {
      // 격자 만석 → 클리어성 종료
      return toGameOver(nextState);
    }
    return nextState;
  }

  // 먹지 않은 tick: 머리 추가 + 꼬리 제거 (길이 유지)
  const movedSnake = grownSnake.slice(0, grownSnake.length - 1);
  return { ...state, snake: movedSnake, direction, nextDirection: direction };
}

/**
 * §5 pauseGame — running → paused. 그 외 no-op.
 */
export function pauseGame(state) {
  if (state.status !== 'running') {
    return state;
  }
  return { ...state, status: 'paused' };
}

/**
 * §5 resumeGame — paused → running. 그 외 no-op.
 */
export function resumeGame(state) {
  if (state.status !== 'paused') {
    return state;
  }
  return { ...state, status: 'running' };
}

/**
 * §5 restartGame — 모든 status에서 ready로 전이, 초기값 리셋(최고 점수 보존).
 */
export function restartGame(state) {
  return createInitialState({
    highScore: state.highScore,
    cols: state.cols,
    rows: state.rows,
  });
}

// ===========================================================================
// BF-1497 · 뷰포트 실시간 확장 · DPR 리렌더 · 상태 보존 (frozen plan §5~§6)
// 아래 함수는 순수(입력 state 불변)하며 DOM/window에 의존하지 않는다.
// ===========================================================================

// 뷰포트 → grid 파생 상수 (실시간 확장: 뷰포트가 커지면 grid 열/행 수가 증가)
export const MIN_GRID_COLS = 12;
export const MIN_GRID_ROWS = 12;
export const TARGET_CELL_PX = 26; // 목표 CSS 셀 크기(px). cols/rows는 여기서 파생.

/**
 * §5 computeGrid — 뷰포트 크기·DPR로부터 grid(cols/rows/cellPx)와 canvas backing 크기를 파생.
 * 상태 보존과 무관하게 언제든 재계산 가능한 순수 함수.
 * 셀은 정사각(cellPx 단일 값을 두 축에 공유)이며, cols/rows는 최소 하한을 보장한다.
 */
export function computeGrid(viewportWidth, viewportHeight, dpr = 1, cellTarget = TARGET_CELL_PX) {
  const w = Math.max(1, Math.floor(viewportWidth));
  const h = Math.max(1, Math.floor(viewportHeight));
  const cols = Math.max(MIN_GRID_COLS, Math.floor(w / cellTarget));
  const rows = Math.max(MIN_GRID_ROWS, Math.floor(h / cellTarget));
  const cellPx = Math.min(w / cols, h / rows);
  const ratio = dpr > 0 ? dpr : 1;
  return {
    cols,
    rows,
    cellPx,
    dpr: ratio,
    cssWidth: w,
    cssHeight: h,
    backingWidth: Math.max(1, Math.round(cols * cellPx * ratio)),
    backingHeight: Math.max(1, Math.round(rows * cellPx * ratio)),
  };
}

/**
 * 좌표를 [0, cols) × [0, rows) 유효 범위로 클램프한다.
 */
export function clampCell(cell, cols, rows) {
  return {
    x: Math.min(Math.max(0, Math.round(cell.x)), cols - 1),
    y: Math.min(Math.max(0, Math.round(cell.y)), rows - 1),
  };
}

/**
 * 한 축(x 또는 y)에 대한 강체 이동 offset을 구한다.
 * 축소된 축에서는 뱀을 grid 안으로 밀어 넣되, 진행 방향(dv) 쪽 벽 앞에 한 칸의
 * 여유를 남겨 재투영 직후 step이 즉시 벽 충돌하지 않게 한다(E1: 전환은 gameover 아님).
 * 축소되지 않은 축은 offset 0으로 좌표를 그대로 보존한다(RG-2).
 * @param {number} min 뱀 좌표 최소값
 * @param {number} max 뱀 좌표 최대값
 * @param {number} head 머리 좌표
 * @param {number} dv 진행 방향 성분(-1/0/1)
 * @param {number} size 새 grid 크기(cols 또는 rows)
 * @param {boolean} shrunk 이 축이 축소되었는지
 */
function axisOffset(min, max, head, dv, size, shrunk) {
  const lo = -min; // min + off >= 0
  const hi = size - 1 - max; // max + off <= size - 1
  const fits = lo <= hi; // 강체가 새 grid 축에 통째로 담기는가
  // 기본: 현재 위치를 최대한 유지(0에 가장 가까운 offset). 담기지 않으면 0에서 시작해
  // 아래 여유 로직이 머리를 grid 안으로 당긴다(꼬리는 이후 clamp로 접힘).
  let off = fits ? Math.min(Math.max(0, lo), hi) : 0;
  if (shrunk) {
    if (dv > 0) {
      // 오른/아래로 진행: 머리를 벽(size-1)에서 한 칸 앞(size-2)까지만 허용
      off = Math.min(off, size - 2 - head);
      if (fits) off = Math.max(off, lo);
    } else if (dv < 0) {
      // 왼/위로 진행: 머리를 벽(0)에서 한 칸 뒤(1)까지만 허용
      off = Math.max(off, 1 - head);
      if (fits) off = Math.min(off, hi);
    }
  }
  return off;
}

/**
 * §5.3~§5.4 reprojectState — 새 grid(cols/rows)로 상태를 재투영한다.
 * status·score·direction·속도 등 게임 상태는 **보존**하고 좌표만 새 grid에 맞춘다.
 * - grid가 줄지 않으면 좌표는 그대로 유지된다(RG-2).
 * - grid 축소 시 뱀을 **강체로 이동**해 형태(상대 위치)를 보존하고, 진행 방향 쪽 벽 앞에
 *   한 칸의 여유를 남겨 재투영 직후 step이 즉시 벽 충돌(gameover)하지 않게 한다(E1).
 * - 뱀이 grid 축보다 길어 담기지 않는 극단에서는 clampCell로 접고 머리 우선으로
 *   중복 셀을 제거하며, 먹이가 뱀과 겹치면 유효 빈 칸으로 재배치한다(RG-3, E1).
 * 재초기화 함수가 아니며 이벤트 경로에서 상태를 재생성하지 않는다(RG-1).
 */
export function reprojectState(state, cols, rows, rng = Math.random) {
  const vec = DIRECTION_VECTORS[state.direction] ?? { x: 0, y: 0 };
  const head = state.snake[0] ?? { x: 0, y: 0 };
  const xs = state.snake.map((c) => c.x);
  const ys = state.snake.map((c) => c.y);
  const offX = axisOffset(Math.min(...xs), Math.max(...xs), head.x, vec.x, cols, cols < state.cols);
  const offY = axisOffset(Math.min(...ys), Math.max(...ys), head.y, vec.y, rows, rows < state.rows);

  // 강체 이동으로 형태를 보존하며 새 grid 안으로 재배치한다. 담기지 않는 극단은
  // clampCell + 머리 우선 중복 제거로 안전 처리한다.
  const seen = new Set();
  const snake = [];
  for (const cell of state.snake) {
    const moved = clampCell({ x: cell.x + offX, y: cell.y + offY }, cols, rows);
    const key = cellKey(moved);
    if (!seen.has(key)) {
      seen.add(key);
      snake.push(moved);
    }
  }
  let food = state.food;
  if (food != null) {
    const clampedFood = clampCell(food, cols, rows);
    const overlaps = snake.some((seg) => seg.x === clampedFood.x && seg.y === clampedFood.y);
    food = overlaps ? spawnFood(snake, rng, cols, rows) : clampedFood;
  }
  return { ...state, cols, rows, snake, food };
}

/**
 * §5 resizeGame — 뷰포트 변경(resize/orientationchange/fullscreenchange) 진입점.
 * grid를 재계산하고 상태를 그 grid로 재투영해 { state, grid }를 반환한다.
 * 상태(뱀/먹이/점수/status)는 보존되고 DPR/새 grid에 맞춰 렌더 메타(grid)만 갱신된다.
 */
export function resizeGame(state, viewportWidth, viewportHeight, dpr = 1, rng = Math.random) {
  const grid = computeGrid(viewportWidth, viewportHeight, dpr);
  const next = reprojectState(state, grid.cols, grid.rows, rng);
  return { state: next, grid };
}

// ===========================================================================
// 브라우저 런타임 (frozen UI 계약: game-stage/game-canvas/hud-*/game-overlay/
// restart-button/touch-controls, states ready/playing/paused/gameover).
// DOM/window/localStorage 부작용은 이 부트스트랩에만 격리한다.
// node(테스트/import) 환경에서는 실행되지 않도록 하단에서 가드한다.
// ===========================================================================

// frozen §4.4: 상태별 화면/overlay 텍스트 (playing은 overlay 숨김)
const STATUS_TEXT = {
  ready: '준비',
  running: '',
  paused: '일시정지',
  gameover: '게임오버',
};

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

const SWIPE_THRESHOLD = 24;

/**
 * initSnakeGame — frozen DOM에 게임을 부착한다.
 * 뷰포트 확장·DPR 리렌더·상태 보존(resize/orientationchange/fullscreenchange)과
 * 기존 조작(방향키/WASD·일시정지·스와이프·역방향 방지·먹이/속도·localStorage·재시작)을 배선한다.
 */
export function initSnakeGame({ document: doc, window: win }) {
  const stage = doc.getElementById('game-stage');
  const canvas = doc.getElementById('game-canvas');
  const hudScore = doc.getElementById('hud-score');
  const hudHighscore = doc.getElementById('hud-highscore');
  const overlay = doc.getElementById('game-overlay');
  const restartButton = doc.getElementById('restart-button');
  const touchControls = doc.getElementById('touch-controls');
  const ctx = canvas.getContext('2d');

  const reducedMotion =
    typeof win.matchMedia === 'function' &&
    win.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function loadHighScore() {
    try {
      const raw = win.localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
      const n = raw == null ? 0 : Number.parseInt(raw, 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  }
  function saveHighScore(value) {
    try {
      win.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(value));
    } catch {
      /* localStorage 접근 불가 시 무시 */
    }
  }

  let state = createInitialState({ highScore: loadHighScore() });
  let grid = computeGrid(win.innerWidth || 1, win.innerHeight || 1, win.devicePixelRatio || 1);
  let announcedHighScore = state.highScore;

  // ---- 뷰포트 리렌더: grid 재계산 + 상태 보존(재초기화 아님) ----
  function applyViewport() {
    const result = resizeGame(
      state,
      win.innerWidth || 1,
      win.innerHeight || 1,
      win.devicePixelRatio || 1,
    );
    state = result.state;
    grid = result.grid;
    canvas.width = grid.backingWidth;
    canvas.height = grid.backingHeight;
    ctx.setTransform(grid.dpr, 0, 0, grid.dpr, 0, 0);
    render();
  }

  // ---- 렌더 ----
  function render() {
    const boardW = grid.cols * grid.cellPx;
    const boardH = grid.rows * grid.cellPx;
    ctx.clearRect(0, 0, boardW, boardH);
    ctx.fillStyle = '#050510'; // --neon-bg
    ctx.fillRect(0, 0, boardW, boardH);
    if (grid.cellPx <= 0) {
      return;
    }
    if (state.food) {
      drawCell(state.food, '#ff2d95', false);
    }
    for (let i = state.snake.length - 1; i >= 0; i -= 1) {
      const color = i === 0 ? '#00e5ff' : '#39ff14'; // --neon-primary
      drawCell(state.snake[i], color, !reducedMotion && i === 0);
    }
  }

  function drawCell(cellPos, color, glow) {
    const cell = grid.cellPx;
    const pad = Math.max(1, Math.floor(cell * 0.08));
    const x = cellPos.x * cell + pad;
    const y = cellPos.y * cell + pad;
    const size = cell - pad * 2;
    ctx.save();
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = Math.max(4, cell * 0.6);
    }
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
    ctx.restore();
  }

  // ---- HUD / overlay / 접근성 텍스트 ----
  function announce(text) {
    // #game-overlay(aria-live="polite")의 상태 텍스트 노드만 갱신 (자식 button 보존, §4.6)
    const node = overlay.querySelector('.overlay__text');
    if (node) {
      node.textContent = text;
    }
  }

  function syncView() {
    hudScore.textContent = `점수 ${state.score}`;
    hudHighscore.textContent = `최고 ${state.highScore}`;

    const playing = state.status === 'running';
    overlay.classList.toggle('is-hidden', playing);
    overlay.classList.toggle('overlay--gameover', state.status === 'gameover');
    // frozen §4.4 상태 어휘 노출(running → playing)
    overlay.setAttribute('data-status', playing ? 'playing' : state.status);

    if (!playing) {
      const label =
        state.status === 'gameover'
          ? `${STATUS_TEXT.gameover} · 점수 ${state.score} · 최고 ${state.highScore}`
          : STATUS_TEXT[state.status] || '';
      announce(label);
    }

    // AC-5: playing 동안 주 control 비활성, 그 외(ready/paused/gameover) 재활성
    restartButton.disabled = playing;
  }

  // ---- 상태 전이 ----
  function startPlaying() {
    if (state.status === 'gameover') {
      state = restartGame(state);
      announcedHighScore = state.highScore;
    }
    if (state.status === 'ready') {
      state = startGame(state);
      announce('게임 시작');
    } else if (state.status === 'paused') {
      state = resumeGame(state);
      announce('게임 재개');
    }
    syncView();
    render();
    focusStage();
  }

  function togglePause() {
    if (state.status === 'running') {
      state = pauseGame(state);
      announce(STATUS_TEXT.paused);
    } else if (state.status === 'paused') {
      state = resumeGame(state);
      announce('게임 재개');
    }
    syncView();
    render();
  }

  function handleGameover(prevStatus) {
    if (prevStatus !== 'gameover' && state.status === 'gameover') {
      if (state.highScore > announcedHighScore) {
        saveHighScore(state.highScore);
        announcedHighScore = state.highScore;
      }
      announce(`${STATUS_TEXT.gameover} · 점수 ${state.score} · 최고 ${state.highScore}`);
      syncView();
      render();
      // gameover 후 주 control(restart-button) 재활성 + 포커스 (AC-5)
      restartButton.disabled = false;
      if (typeof restartButton.focus === 'function') {
        restartButton.focus();
      }
    }
  }

  function focusStage() {
    if (typeof canvas.focus === 'function') {
      canvas.setAttribute('tabindex', '-1');
      canvas.focus();
    }
  }

  // ---- 게임 루프 ----
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
        handleGameover(prevStatus);
      }
    } else {
      accumulator = 0;
    }
    syncView();
    render();
    win.requestAnimationFrame(loop);
  }

  // ---- 입력 ----
  function onKeyDown(event) {
    const key = event.key;
    const lower = typeof key === 'string' ? key.toLowerCase() : key;
    if (key === ' ' || key === 'Spacebar' || lower === 'p') {
      if (state.status === 'running' || state.status === 'paused') {
        event.preventDefault();
        togglePause();
      }
      return;
    }
    const dir = DIR_KEYS[key] ?? DIR_KEYS[lower];
    if (dir) {
      if (state.status === 'ready') {
        event.preventDefault();
        startPlaying();
        state = setDirection(state, dir);
        return;
      }
      if (state.status === 'running') {
        event.preventDefault();
        state = setDirection(state, dir);
      }
    }
  }

  let touchStart = null;
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
    const dir =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    if (state.status === 'ready') {
      startPlaying();
    }
    if (state.status === 'running') {
      state = setDirection(state, dir);
    }
  }

  function onTouchPad(event) {
    const target = event.target.closest('[data-dir]');
    if (!target) {
      return;
    }
    event.preventDefault();
    const dir = target.getAttribute('data-dir');
    if (state.status === 'ready') {
      startPlaying();
    }
    if (state.status === 'running') {
      state = setDirection(state, dir);
    }
  }

  // ---- 배선 ----
  restartButton.addEventListener('click', startPlaying);
  win.addEventListener('keydown', onKeyDown);
  stage.addEventListener('touchstart', onTouchStart, { passive: true });
  stage.addEventListener('touchend', onTouchEnd, { passive: true });
  if (touchControls) {
    touchControls.addEventListener('click', onTouchPad);
  }
  win.addEventListener('resize', applyViewport);
  win.addEventListener('orientationchange', applyViewport);
  doc.addEventListener('fullscreenchange', applyViewport);

  // ---- 초기화 ----
  applyViewport();
  syncView();
  announce('준비');
  win.requestAnimationFrame(loop);

  return { get state() { return state; }, get grid() { return grid; } };
}

// node(import/테스트) 환경에서는 실행하지 않고, 브라우저에서 game-stage가 있을 때만 부착
if (
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  document.getElementById('game-stage')
) {
  initSnakeGame({ document, window });
}
