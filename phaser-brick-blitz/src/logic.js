// phaser-brick-blitz/src/logic.js
// 렌더링/DOM에 의존하지 않는 순수 게임 로직 모듈.
// 상태 전이·충돌·점수 계산을 좌표/속도/이벤트 입력만으로 반환한다.
// 무작위성은 주입된 rng(: () => number) 로만 사용하며 전역 Math.random 을 직접 호출하지 않는다.
// 모든 함수는 입력을 변형(mutate)하지 않고 새 객체를 반환한다(immutability).

/** 게임 상태(States) — UI 계약과 exact 하게 일치. */
export const STATES = Object.freeze({
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
  CLEARED: 'cleared',
});

/** 상태 전이 이벤트. */
export const EVENTS = Object.freeze({
  START: 'START',
  PAUSE: 'PAUSE',
  RESUME: 'RESUME',
  LOSE_LAST_LIFE: 'LOSE_LAST_LIFE',
  CLEAR_ALL: 'CLEAR_ALL',
  RESET: 'RESET',
});

/** 기본 설정값. */
export const DEFAULT_CONFIG = Object.freeze({
  width: 480,
  height: 640,
  rows: 3,
  cols: 8,
  brickWidth: 52,
  brickHeight: 20,
  brickGap: 6,
  brickTop: 60,
  brickLeft: 8,
  paddleWidth: 96,
  paddleHeight: 14,
  paddleBottomGap: 32,
  ballRadius: 8,
  ballSpeed: 320,
  maxBounceAngleDeg: 60,
  initialLives: 3,
});

/** 행(row)별 벽돌 색상 토큰 이름 — UI 계약과 exact. */
export const ROW_COLOR_TOKENS = Object.freeze(['--color-brick-r1', '--color-brick-r2', '--color-brick-r3']);

/** 행별 점수 가중치(위쪽 행이 더 높음). */
export const ROW_SCORE = Object.freeze([30, 20, 10]);

/**
 * 파괴된 벽돌 행(0-based)의 점수를 반환한다.
 * 정의되지 않은 행은 마지막 가중치를 사용한다.
 * @param {number} row
 * @returns {number}
 */
export function scoreForRow(row) {
  if (!Number.isInteger(row) || row < 0) return 0;
  return ROW_SCORE[row] ?? ROW_SCORE[ROW_SCORE.length - 1];
}

/**
 * 순수 상태 전이 함수: (status, event) -> nextStatus.
 * 유효하지 않은 전이는 현재 상태를 그대로 반환한다.
 * @param {string} status
 * @param {string} event
 * @returns {string}
 */
export function nextStatus(status, event) {
  switch (status) {
    case STATES.READY:
      return event === EVENTS.START ? STATES.PLAYING : status;
    case STATES.PLAYING:
      if (event === EVENTS.PAUSE) return STATES.PAUSED;
      if (event === EVENTS.LOSE_LAST_LIFE) return STATES.GAMEOVER;
      if (event === EVENTS.CLEAR_ALL) return STATES.CLEARED;
      return status;
    case STATES.PAUSED:
      if (event === EVENTS.RESUME || event === EVENTS.START) return STATES.PLAYING;
      return status;
    case STATES.GAMEOVER:
    case STATES.CLEARED:
      return event === EVENTS.RESET ? STATES.READY : status;
    default:
      return status;
  }
}

/**
 * 벽돌 격자를 생성한다(순수). 색상 토큰은 행에 따라 결정론적.
 * @param {object} config
 * @returns {Array<{id:string,row:number,col:number,x:number,y:number,width:number,height:number,colorToken:string,alive:boolean}>}
 */
export function createBricks(config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const bricks = [];
  for (let row = 0; row < cfg.rows; row += 1) {
    for (let col = 0; col < cfg.cols; col += 1) {
      bricks.push({
        id: `b-${row}-${col}`,
        row,
        col,
        x: cfg.brickLeft + col * (cfg.brickWidth + cfg.brickGap),
        y: cfg.brickTop + row * (cfg.brickHeight + cfg.brickGap),
        width: cfg.brickWidth,
        height: cfg.brickHeight,
        colorToken: ROW_COLOR_TOKENS[row] ?? ROW_COLOR_TOKENS[ROW_COLOR_TOKENS.length - 1],
        alive: true,
      });
    }
  }
  return bricks;
}

/**
 * 초기 공을 생성한다. 초기 수평 방향만 주입 rng 로 결정(결정론적 테스트 가능).
 * @param {object} config
 * @param {() => number} rng 0..1 난수 공급자(기본 Math.random)
 * @returns {{x:number,y:number,vx:number,vy:number,radius:number}}
 */
export function createBall(config = {}, rng = Math.random) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const paddleY = cfg.height - cfg.paddleBottomGap - cfg.paddleHeight;
  // rng < 0.5 이면 좌상향, 아니면 우상향. 항상 위로 향한다.
  const dir = rng() < 0.5 ? -1 : 1;
  const angle = (30 * Math.PI) / 180; // 수직 기준 30도
  return {
    x: cfg.width / 2,
    y: paddleY - cfg.ballRadius - 1,
    vx: dir * cfg.ballSpeed * Math.sin(angle),
    vy: -cfg.ballSpeed * Math.cos(angle),
    radius: cfg.ballRadius,
  };
}

/**
 * 초기 패들을 생성한다(하단 중앙).
 * @param {object} config
 * @returns {{x:number,y:number,width:number,height:number}}
 */
export function createPaddle(config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  return {
    x: (cfg.width - cfg.paddleWidth) / 2,
    y: cfg.height - cfg.paddleBottomGap - cfg.paddleHeight,
    width: cfg.paddleWidth,
    height: cfg.paddleHeight,
  };
}

/**
 * 초기 게임 상태 전체를 생성한다(순수, rng 주입).
 * @param {object} config
 * @param {() => number} rng
 * @returns {object}
 */
export function createInitialState(config = {}, rng = Math.random) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  return {
    status: STATES.READY,
    score: 0,
    lives: cfg.initialLives,
    config: cfg,
    bricks: createBricks(cfg),
    ball: createBall(cfg, rng),
    paddle: createPaddle(cfg),
  };
}

/**
 * 사각형 AABB 충돌 여부.
 * @param {{x:number,y:number,width:number,height:number}} a
 * @param {{x:number,y:number,width:number,height:number}} b
 * @returns {boolean}
 */
export function aabbIntersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * 원(공)과 사각형의 충돌 여부.
 * @param {{x:number,y:number,radius:number}} ball 중심 좌표 + 반지름
 * @param {{x:number,y:number,width:number,height:number}} rect
 * @returns {boolean}
 */
export function ballRectIntersects(ball, rect) {
  const nearestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.height));
  const dx = ball.x - nearestX;
  const dy = ball.y - nearestY;
  return dx * dx + dy * dy <= ball.radius * ball.radius;
}

/**
 * 벽(좌/우/상단)에 대한 반사를 계산한다(순수). 바닥은 여기서 처리하지 않는다.
 * @param {{x:number,y:number,vx:number,vy:number,radius:number}} ball
 * @param {{width:number,height:number}} bounds
 * @returns {{ball:object, bouncedX:boolean, bouncedY:boolean}}
 */
export function reflectWalls(ball, bounds) {
  let { x, y, vx, vy } = ball;
  let bouncedX = false;
  let bouncedY = false;
  if (x - ball.radius <= 0 && vx < 0) {
    x = ball.radius;
    vx = -vx;
    bouncedX = true;
  } else if (x + ball.radius >= bounds.width && vx > 0) {
    x = bounds.width - ball.radius;
    vx = -vx;
    bouncedX = true;
  }
  if (y - ball.radius <= 0 && vy < 0) {
    y = ball.radius;
    vy = -vy;
    bouncedY = true;
  }
  return { ball: { ...ball, x, y, vx, vy }, bouncedX, bouncedY };
}

/**
 * 공이 바닥 아래로 빠졌는지(목숨 소진 트리거) 판정.
 * @param {{y:number,radius:number}} ball
 * @param {{height:number}} bounds
 * @returns {boolean}
 */
export function isBelowFloor(ball, bounds) {
  return ball.y - ball.radius > bounds.height;
}

/**
 * 패들 반사(순수): 접촉 지점에 따라 반사각이 달라진다.
 * 중앙 접촉 = 수직, 가장자리 접촉 = 최대 반사각.
 * @param {{x:number,vx:number,vy:number}} ball 공 중심 x, 속도
 * @param {{x:number,width:number}} paddle
 * @param {object} config maxBounceAngleDeg 사용
 * @returns {{vx:number,vy:number}}
 */
export function paddleReflection(ball, paddle, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const paddleCenter = paddle.x + paddle.width / 2;
  const rawOffset = (ball.x - paddleCenter) / (paddle.width / 2);
  const offset = Math.max(-1, Math.min(1, rawOffset));
  const maxAngle = (cfg.maxBounceAngleDeg * Math.PI) / 180;
  const angle = offset * maxAngle;
  const speed = Math.hypot(ball.vx, ball.vy) || cfg.ballSpeed;
  return {
    vx: speed * Math.sin(angle),
    vy: -Math.abs(speed * Math.cos(angle)), // 항상 위로
  };
}

/**
 * 공과 벽돌들의 충돌을 판정하고, 첫 충돌 벽돌 파괴 + 반사 + 점수 가산 결과를 반환한다(순수).
 * @param {{x:number,y:number,vx:number,vy:number,radius:number}} ball
 * @param {Array<object>} bricks
 * @returns {{ball:object, bricks:Array<object>, hitBrick:(object|null), gainedScore:number}}
 */
export function resolveBrickCollisions(ball, bricks) {
  const hit = bricks.find((b) => b.alive && ballRectIntersects(ball, b));
  if (!hit) {
    return { ball: { ...ball }, bricks, hitBrick: null, gainedScore: 0 };
  }
  // 충돌 면 판정: 이전 위치 대비 침투 축을 골라 반사 방향 결정.
  const brickCenterX = hit.x + hit.width / 2;
  const brickCenterY = hit.y + hit.height / 2;
  const dx = ball.x - brickCenterX;
  const dy = ball.y - brickCenterY;
  const overlapX = hit.width / 2 + ball.radius - Math.abs(dx);
  const overlapY = hit.height / 2 + ball.radius - Math.abs(dy);
  let { vx, vy } = ball;
  if (overlapX < overlapY) {
    vx = dx >= 0 ? Math.abs(vx) : -Math.abs(vx);
  } else {
    vy = dy >= 0 ? Math.abs(vy) : -Math.abs(vy);
  }
  const nextBricks = bricks.map((b) => (b.id === hit.id ? { ...b, alive: false } : b));
  return {
    ball: { ...ball, vx, vy },
    bricks: nextBricks,
    hitBrick: hit,
    gainedScore: scoreForRow(hit.row),
  };
}

/**
 * 살아있는 벽돌 수.
 * @param {Array<{alive:boolean}>} bricks
 * @returns {number}
 */
export function countAliveBricks(bricks) {
  return bricks.reduce((n, b) => (b.alive ? n + 1 : n), 0);
}

/**
 * 목숨 1 감소를 적용하고 후속 상태를 반환한다(순수).
 * 0 이 되면 gameover 로 전이.
 * @param {object} state
 * @returns {object} 새 state
 */
export function loseLife(state) {
  const lives = Math.max(0, state.lives - 1);
  const status = lives === 0 ? nextStatus(STATES.PLAYING, EVENTS.LOSE_LAST_LIFE) : state.status;
  return { ...state, lives, status };
}

/**
 * 벽돌 파괴 결과를 상태에 반영한다(점수 가산, 전부 파괴 시 cleared 전이). 순수.
 * @param {object} state
 * @param {number} gainedScore
 * @param {Array<object>} nextBricks
 * @returns {object}
 */
export function applyBrickResult(state, gainedScore, nextBricks) {
  const score = state.score + gainedScore;
  const alive = countAliveBricks(nextBricks);
  const status = alive === 0 ? nextStatus(STATES.PLAYING, EVENTS.CLEAR_ALL) : state.status;
  return { ...state, score, bricks: nextBricks, status };
}

/**
 * 게임 오버/클리어 이후 재시작: 점수·목숨·상태·엔티티를 초기값으로 복원(순수, rng 주입).
 * @param {object} state
 * @param {() => number} rng
 * @returns {object} ready 상태의 새 초기 state
 */
export function resetGame(state, rng = Math.random) {
  return createInitialState(state.config ?? {}, rng);
}
