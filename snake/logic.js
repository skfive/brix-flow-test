// BF-504 · Snake 게임 순수 로직 유틸 (no DOM, no canvas)
// - DOM/Canvas 의존성 없음 → node:test 단위 테스트 가능 (ES module export)
// - 명세: BF-504 acceptance criteria

/** 기본 셀 크기 (px). 렌더러에서 사용. */
export const CELL = 20;

/** localStorage 키 */
export const LS_HIGH_SCORE_KEY = "bf-snake-high-score";

// ─────────────────────────────────────────────────────────────
// 방향 상수
// ─────────────────────────────────────────────────────────────
export const DIR = {
  UP:    { x:  0, y: -1 },
  DOWN:  { x:  0, y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x:  1, y:  0 },
};

// ─────────────────────────────────────────────────────────────
// 상태 생성
// ─────────────────────────────────────────────────────────────

/**
 * 게임 초기 상태 생성.
 * snake 는 중앙에서 오른쪽을 향해 3칸으로 시작.
 * @param {number} cols  격자 열 수
 * @param {number} rows  격자 행 수
 * @param {number} [highScore=0]  유지할 high score
 * @returns {GameState}
 */
export function createInitialState(cols, rows, highScore = 0) {
  const midX = Math.floor(cols / 2);
  const midY = Math.floor(rows / 2);
  const snake = [
    { x: midX,     y: midY },
    { x: midX - 1, y: midY },
    { x: midX - 2, y: midY },
  ];
  return {
    cols,
    rows,
    snake,
    dir:      DIR.RIGHT,
    nextDir:  DIR.RIGHT,
    food:     spawnFoodCell(cols, rows, snake),
    score:    0,
    highScore,
    status:   "playing", // 'playing' | 'gameover'
  };
}

// ─────────────────────────────────────────────────────────────
// 먹이 생성
// ─────────────────────────────────────────────────────────────

/**
 * 격자 내 빈 셀 중 무작위 1개를 반환.
 * 빈 셀이 없으면 null 반환 (만점 상태).
 *
 * @param {number} cols
 * @param {number} rows
 * @param {Array<{x:number,y:number}>} snake
 * @returns {{x:number,y:number}|null}
 */
export function spawnFoodCell(cols, rows, snake) {
  const occupied = new Set(snake.map((c) => `${c.x},${c.y}`));
  const empty = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!occupied.has(`${x},${y}`)) empty.push({ x, y });
    }
  }
  if (empty.length === 0) return null;
  return empty[Math.floor(Math.random() * empty.length)];
}

// ─────────────────────────────────────────────────────────────
// 방향 전환 (반대 방향 무시)
// ─────────────────────────────────────────────────────────────

/**
 * 새 방향 적용. 현재 방향의 정반대이면 무시 (자살 방지).
 *
 * @param {GameState} state
 * @param {{x:number,y:number}} newDir
 * @returns {GameState}
 */
export function changeDirection(state, newDir) {
  const cur = state.dir;
  if (cur.x + newDir.x === 0 && cur.y + newDir.y === 0) return state;
  return { ...state, nextDir: newDir };
}

// ─────────────────────────────────────────────────────────────
// 충돌 검사 (순수 함수)
// ─────────────────────────────────────────────────────────────

/**
 * 머리가 벽(격자 경계 밖)에 충돌했는지 반환.
 *
 * @param {{x:number,y:number}} head
 * @param {number} cols
 * @param {number} rows
 * @returns {boolean}
 */
export function isWallCollision(head, cols, rows) {
  return head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows;
}

/**
 * 머리가 자기 몸(snake 배열의 임의 세그먼트)과 충돌했는지 반환.
 * snake 는 이미 새 머리가 추가되기 전 상태를 전달해야 함.
 *
 * @param {{x:number,y:number}} head  새 머리 위치
 * @param {Array<{x:number,y:number}>} body  현재 snake 전체 (꼬리 포함)
 * @returns {boolean}
 */
export function isSelfCollision(head, body) {
  return body.some((seg) => seg.x === head.x && seg.y === head.y);
}

// ─────────────────────────────────────────────────────────────
// 게임 틱 (1 스텝 진행)
// ─────────────────────────────────────────────────────────────

/**
 * 1 프레임 게임 로직 진행.
 * - status !== 'playing' 이면 그대로 반환.
 * - 이동 → 벽 충돌 → 자기 몸 충돌 → 먹이 수집 → 꼬리 제거 순으로 처리.
 *
 * @param {GameState} state
 * @returns {GameState}
 */
export function tick(state) {
  if (state.status !== "playing") return state;

  const dir = state.nextDir;
  const head = state.snake[0];
  const newHead = { x: head.x + dir.x, y: head.y + dir.y };

  // 벽 충돌
  if (isWallCollision(newHead, state.cols, state.rows)) {
    const newHighScore = Math.max(state.highScore, state.score);
    return { ...state, dir, status: "gameover", highScore: newHighScore };
  }

  // 자기 몸 충돌 — 전체 body 검사 (머리가 꼬리 위치로 이동하는 경우도 충돌 처리)
  if (isSelfCollision(newHead, state.snake)) {
    const newHighScore = Math.max(state.highScore, state.score);
    return { ...state, dir, status: "gameover", highScore: newHighScore };
  }

  // 먹이 수집 여부
  const ateFood =
    state.food !== null &&
    newHead.x === state.food.x &&
    newHead.y === state.food.y;

  let newSnake;
  if (ateFood) {
    // 꼬리를 제거하지 않아 길이 +1
    newSnake = [newHead, ...state.snake];
  } else {
    // 꼬리 제거 → 길이 유지
    newSnake = [newHead, ...state.snake.slice(0, -1)];
  }

  const newScore = ateFood ? state.score + 10 : state.score;
  const newFood = ateFood
    ? spawnFoodCell(state.cols, state.rows, newSnake)
    : state.food;

  return {
    ...state,
    snake:     newSnake,
    dir,
    food:      newFood,
    score:     newScore,
    highScore: Math.max(state.highScore, newScore),
    status:    "playing",
  };
}

// ─────────────────────────────────────────────────────────────
// 재시작
// ─────────────────────────────────────────────────────────────

/**
 * 게임 재시작 (highScore 유지).
 *
 * @param {GameState} state  현재 상태 (cols/rows/highScore 참조)
 * @returns {GameState}
 */
export function restartGame(state) {
  return createInitialState(state.cols, state.rows, state.highScore);
}
