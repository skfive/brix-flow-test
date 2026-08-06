// pixi-breakout/src/game-logic.js
//
// 순수 게임 로직 계층 (BF-1702).
// - PixiJS와 DOM API(document/window/canvas 등)를 import하지 않는다.
// - 모든 함수는 이전 state(POJO)와 입력을 받아 새 state(POJO)를 반환하는 순수 함수다.
// - 부수효과가 없고 결정론적이다(Math.random 등 비결정적 API를 사용하지 않는다).

export const DEFAULT_BOARD = { width: 800, height: 600 };

const DEFAULT_PADDLE = { width: 100, height: 14, speed: 300 };
const DEFAULT_BALL = { radius: 8, speed: 260 };
const DEFAULT_LIVES = 3;

// 벽돌 tier별 내구도(hits)/점수/접근성 spot 개수.
// 접근성 요구: 색상뿐 아니라 spot count로도 내구도를 구분한다.
export const BRICK_TIERS = {
  1: { hits: 1, score: 10 },
  2: { hits: 2, score: 20 },
  3: { hits: 3, score: 30 },
};

const MAX_PADDLE_BOUNCE_ANGLE = Math.PI / 3; // 60도

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// 원(공)과 사각형(패들/벽돌)의 충돌 판정. rect는 { x, y, width, height } (x,y는 좌상단 기준).
function circleRectIntersect(cx, cy, radius, rect) {
  const nearestX = clamp(cx, rect.x, rect.x + rect.width);
  const nearestY = clamp(cy, rect.y, rect.y + rect.height);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= radius * radius;
}

export function createPaddle(board, overrides = {}) {
  const width = overrides.width ?? DEFAULT_PADDLE.width;
  const height = overrides.height ?? DEFAULT_PADDLE.height;
  return {
    width,
    height,
    speed: overrides.speed ?? DEFAULT_PADDLE.speed,
    x: overrides.x ?? (board.width - width) / 2,
    y: overrides.y ?? board.height - height - 20,
  };
}

export function createBall(board, paddle, overrides = {}) {
  const radius = overrides.radius ?? DEFAULT_BALL.radius;
  return {
    radius,
    x: overrides.x ?? board.width / 2,
    y: overrides.y ?? paddle.y - radius - 1,
    vx: overrides.vx ?? DEFAULT_BALL.speed * 0.5,
    vy: overrides.vy ?? -DEFAULT_BALL.speed,
  };
}

export function createBrick(overrides = {}) {
  const tier = overrides.tier ?? 1;
  const tierInfo = BRICK_TIERS[tier];
  return {
    id: overrides.id ?? `brick-${tier}-${overrides.x ?? 0}-${overrides.y ?? 0}`,
    tier,
    hits: overrides.hits ?? tierInfo.hits,
    maxHits: overrides.maxHits ?? tierInfo.hits,
    score: overrides.score ?? tierInfo.score,
    alive: overrides.alive ?? true,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 60,
    height: overrides.height ?? 20,
  };
}

export function createDefaultBricks(board) {
  // design.md §5.1: 8열 × 5행. 위쪽 행일수록 내구도가 높은 tier로 난이도 그라데이션을 준다.
  const rowTiers = [3, 3, 2, 2, 1];
  const cols = 8;
  const marginTop = 60;
  const marginX = 20;
  const gap = 6;
  const brickWidth = (board.width - marginX * 2 - gap * (cols - 1)) / cols;
  const brickHeight = 22;
  const bricks = [];

  rowTiers.forEach((tier, rowIndex) => {
    for (let col = 0; col < cols; col += 1) {
      bricks.push(
        createBrick({
          id: `r${rowIndex}c${col}`,
          tier,
          x: marginX + col * (brickWidth + gap),
          y: marginTop + rowIndex * (brickHeight + gap),
          width: brickWidth,
          height: brickHeight,
        }),
      );
    }
  });

  return bricks;
}

export function createInitialState(overrides = {}) {
  const board = { ...DEFAULT_BOARD, ...overrides.board };
  const paddle = createPaddle(board, overrides.paddle ?? {});
  const ball = createBall(board, paddle, overrides.ball ?? {});
  const bricks = overrides.bricks ?? createDefaultBricks(board);

  return {
    status: overrides.status ?? 'start',
    score: overrides.score ?? 0,
    bestScore: overrides.bestScore ?? 0,
    lives: overrides.lives ?? DEFAULT_LIVES,
    board,
    paddle,
    ball,
    bricks,
  };
}

export function startGame(state) {
  if (state.status !== 'start') return state;
  return { ...state, status: 'playing' };
}

export function togglePause(state) {
  if (state.status === 'playing') return { ...state, status: 'paused' };
  if (state.status === 'paused') return { ...state, status: 'playing' };
  return state;
}

export function restartGame(state) {
  return createInitialState({ board: state.board, bestScore: state.bestScore });
}

export function movePaddleTo(state, x) {
  const clampedX = clamp(x, 0, state.board.width - state.paddle.width);
  return { ...state, paddle: { ...state.paddle, x: clampedX } };
}

export function movePaddleByDirection(state, direction, dt) {
  if (state.status !== 'playing') return state;
  if (!direction) return state;
  const dx = direction * state.paddle.speed * dt;
  return movePaddleTo(state, state.paddle.x + dx);
}

// dt: 초 단위 델타 타임. status가 'playing'이 아니면 아무 변화도 없다(일시정지 시 위치/점수 보존).
export function update(state, dt) {
  if (state.status !== 'playing') return state;

  const { board, paddle } = state;
  let { x, y, vx, vy, radius } = state.ball;
  let { bricks, score, lives, bestScore } = state;

  x += vx * dt;
  y += vy * dt;

  // 벽 반사 (좌/우)
  if (x - radius < 0) {
    x = radius;
    vx = Math.abs(vx);
  } else if (x + radius > board.width) {
    x = board.width - radius;
    vx = -Math.abs(vx);
  }

  // 벽 반사 (상단)
  if (y - radius < 0) {
    y = radius;
    vy = Math.abs(vy);
  }

  // 패들 반사: 충돌 위치(중심 기준 -1..1)에 비례한 각도로 튕겨나간다.
  if (vy > 0 && circleRectIntersect(x, y, radius, paddle)) {
    y = paddle.y - radius;
    const paddleCenter = paddle.x + paddle.width / 2;
    const relativeHit = clamp((x - paddleCenter) / (paddle.width / 2), -1, 1);
    const angle = relativeHit * MAX_PADDLE_BOUNCE_ANGLE;
    const speed = Math.hypot(vx, vy);
    vx = speed * Math.sin(angle);
    vy = -Math.abs(speed * Math.cos(angle));
  }

  // 벽돌 충돌: 내구도 감소, 0이 되면 제거 + 점수 가산
  let nextBricks = bricks;
  const hitIndex = bricks.findIndex((brick) => brick.alive && circleRectIntersect(x, y, radius, brick));
  if (hitIndex !== -1) {
    const brick = bricks[hitIndex];
    vy = -vy;
    const remainingHits = brick.hits - 1;
    if (remainingHits <= 0) {
      score += brick.score;
      bestScore = Math.max(bestScore, score);
      nextBricks = bricks.map((b, i) => (i === hitIndex ? { ...b, hits: 0, alive: false } : b));
    } else {
      nextBricks = bricks.map((b, i) => (i === hitIndex ? { ...b, hits: remainingHits } : b));
    }
  }

  // 라이프 감소: 공이 패들 아래로 빠짐
  if (y - radius > board.height) {
    const nextLives = lives - 1;
    if (nextLives <= 0) {
      return {
        ...state,
        status: 'game-over',
        lives: 0,
        score,
        bestScore,
        bricks: nextBricks,
      };
    }
    return {
      ...state,
      status: 'playing',
      lives: nextLives,
      score,
      bestScore,
      bricks: nextBricks,
      ball: createBall(board, paddle),
    };
  }

  // 클리어 판정: 살아있는 벽돌이 없으면 clear
  const hasAliveBrick = nextBricks.some((brick) => brick.alive);
  if (!hasAliveBrick) {
    return {
      ...state,
      status: 'clear',
      score,
      bestScore,
      bricks: nextBricks,
      ball: { x, y, vx, vy, radius },
    };
  }

  return {
    ...state,
    score,
    bestScore,
    bricks: nextBricks,
    ball: { x, y, vx, vy, radius },
  };
}
