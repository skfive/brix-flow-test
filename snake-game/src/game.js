// FIXME(BF-1696): none — 초기 구현
// 순수 게임 로직 모듈. DOM/window/requestAnimationFrame 등 브라우저 API에 의존하지 않는다.
// Node 환경에서 단독 import/실행이 가능해야 한다 (snake-game/tests/game.test.js 참고).

const OPPOSITE_DIRECTION = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const DIRECTION_VECTOR = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/**
 * 뱀이 차지하지 않은 칸 목록을 행 우선(y 오름차순 → x 오름차순) 순서로 반환한다.
 * @param {number} columns
 * @param {number} rows
 * @param {{x:number,y:number}[]} snake
 */
function listFreeCells(columns, rows, snake) {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const free = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        free.push({ x, y });
      }
    }
  }
  return free;
}

/**
 * 주입된 rng를 사용해 뱀 몸과 겹치지 않는 빈 칸에 먹이를 배치한다.
 * rng는 이 호출에서 정확히 1회만 소비된다.
 * @param {number} columns
 * @param {number} rows
 * @param {{x:number,y:number}[]} snake
 * @param {() => number} rng
 */
function placeFood(columns, rows, snake, rng) {
  const freeCells = listFreeCells(columns, rows, snake);
  if (freeCells.length === 0) {
    return null;
  }
  const index = Math.floor(rng() * freeCells.length);
  const clampedIndex = Math.min(Math.max(index, 0), freeCells.length - 1);
  return { ...freeCells[clampedIndex] };
}

function createInitialSnake(columns, rows) {
  const startY = Math.floor(rows / 2);
  const startX = Math.floor(columns / 2);
  return [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
}

/**
 * Snake 게임 인스턴스를 생성한다.
 * @param {{rng?: () => number, columns?: number, rows?: number}} [options]
 */
export function createGame(options = {}) {
  const columns = options.columns ?? 20;
  const rows = options.rows ?? 20;
  const rng = options.rng ?? Math.random;

  let status;
  let snake;
  let direction;
  let food;
  let score;

  function initialize() {
    snake = createInitialSnake(columns, rows);
    direction = 'right';
    score = 0;
    food = placeFood(columns, rows, snake, rng);
    status = 'idle';
  }

  initialize();

  function setDirection(nextDirection) {
    if (!(nextDirection in DIRECTION_VECTOR)) {
      return;
    }
    if (status !== 'idle' && status !== 'playing') {
      return;
    }
    if (OPPOSITE_DIRECTION[direction] === nextDirection) {
      return;
    }
    direction = nextDirection;
    if (status === 'idle') {
      status = 'playing';
    }
  }

  function tick() {
    if (status !== 'playing') {
      return;
    }

    const { dx, dy } = DIRECTION_VECTOR[direction];
    const head = snake[0];
    const newHead = { x: head.x + dx, y: head.y + dy };

    const hitWall =
      newHead.x < 0 || newHead.x >= columns || newHead.y < 0 || newHead.y >= rows;
    if (hitWall) {
      status = 'game-over';
      return;
    }

    const willEat = food !== null && newHead.x === food.x && newHead.y === food.y;
    const bodyToCheck = willEat ? snake : snake.slice(0, -1);
    const hitSelf = bodyToCheck.some(
      (segment) => segment.x === newHead.x && segment.y === newHead.y
    );
    if (hitSelf) {
      status = 'game-over';
      return;
    }

    const nextSnake = [newHead, ...snake];
    if (!willEat) {
      nextSnake.pop();
    } else {
      score += 1;
    }
    snake = nextSnake;

    if (willEat) {
      food = placeFood(columns, rows, snake, rng);
    }
  }

  function pause() {
    if (status === 'playing') {
      status = 'paused';
    }
  }

  function resume() {
    if (status === 'paused') {
      status = 'playing';
    }
  }

  function reset() {
    initialize();
  }

  function getState() {
    return {
      status,
      columns,
      rows,
      direction,
      score,
      snake: snake.map((segment) => ({ ...segment })),
      food: food ? { ...food } : null,
    };
  }

  return { setDirection, tick, pause, resume, reset, getState };
}
