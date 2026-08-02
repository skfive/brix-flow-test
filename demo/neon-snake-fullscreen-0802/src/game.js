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
