/* BF-995 · 스네이크 캐너리 그리드 게임 — 순수 상태 전이 로직
 * 기획 SSOT: docs/planning/snake-canary-BF-989.md §3(규칙)·§4(점수)·§5(상태)
 * file:// CORS 안전 — ES module / fetch / 외부 CDN / localStorage 0건 (상태는 메모리 전용).
 * UMD 패턴 — 브라우저: globalThis.SnakeCanaryLogic, Node: module.exports (node --test 대상)
 * module: snake-canary
 *
 * 모든 전이 함수는 순수하다 — 입력 state 를 변형하지 않고 새 객체를 반환한다.
 *   status: 'idle'     — 시작 전 대기
 *           'playing'  — 진행 중 (틱 루프 동작)
 *           'gameover' — 충돌로 종료 (재시작 가능)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SnakeCanaryLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ── 상수 (기획 §3.1) ─────────────────────────────────
  var BOARD_COLS = 20;
  var BOARD_ROWS = 20;
  var CELL_SIZE = 20; // 논리 px — BOARD_COLS * CELL_SIZE = 400 (canvas 400x400)
  var TICK_INTERVAL_MS = 150;
  var INITIAL_SNAKE_LENGTH = 3;
  var INITIAL_HEAD = { x: 10, y: 10 };
  var INITIAL_DIRECTION = "right";
  var SCORE_PER_FOOD = 10;

  var DIRECTION_VECTORS = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
  };

  // ── 초기 뱀 구성 (기획 §3.2) — 항상 새 배열/객체 반환 ────
  function makeInitialSnake() {
    return [
      { x: INITIAL_HEAD.x, y: INITIAL_HEAD.y }, // head
      { x: INITIAL_HEAD.x - 1, y: INITIAL_HEAD.y },
      { x: INITIAL_HEAD.x - 2, y: INITIAL_HEAD.y }, // tail
    ];
  }

  // ── 충돌 판정 (기획 §3.4) ────────────────────────────
  function isWallCollision(head) {
    return (
      head.x < 0 ||
      head.x >= BOARD_COLS ||
      head.y < 0 ||
      head.y >= BOARD_ROWS
    );
  }

  function isSelfCollision(snake, newHead, growing) {
    // growing 이 아니면 꼬리 셀은 이번 틱에 비워지므로 충돌 대상에서 제외 (기획 §12.3)
    var bodyToCheck = growing ? snake : snake.slice(0, -1);
    return bodyToCheck.some(function (seg) {
      return seg.x === newHead.x && seg.y === newHead.y;
    });
  }

  // ── 먹이 스폰 (기획 §3.4) — 빈 셀 전수 후 무작위 1개 ────
  function spawnFood(snake, board) {
    var occupied = new Set(
      snake.map(function (s) {
        return s.x + "," + s.y;
      })
    );
    var freeCells = [];
    for (var y = 0; y < board.rows; y++) {
      for (var x = 0; x < board.cols; x++) {
        if (!occupied.has(x + "," + y)) freeCells.push({ x: x, y: y });
      }
    }
    if (freeCells.length === 0) return null; // 보드 가득 참 (기획 §12.4)
    return freeCells[Math.floor(Math.random() * freeCells.length)];
  }

  // ── 방향 전환 유효성 (기획 §3.5) ─────────────────────
  function isOpposite(a, b) {
    return (
      (a === "up" && b === "down") ||
      (a === "down" && b === "up") ||
      (a === "left" && b === "right") ||
      (a === "right" && b === "left")
    );
  }

  function isValidTurn(pendingDirection, currentDirection, snakeLength) {
    if (pendingDirection == null) return false;
    if (snakeLength === 1) return true; // 몸이 없으면 즉시 반전 허용
    return !isOpposite(pendingDirection, currentDirection);
  }

  // ── 초기/시작 상태 (기획 §5.1·§5.2) ──────────────────
  function createInitialState() {
    var snake = makeInitialSnake();
    var board = { cols: BOARD_COLS, rows: BOARD_ROWS };
    return {
      status: "idle",
      board: board,
      snake: snake,
      direction: INITIAL_DIRECTION,
      pendingDirection: null,
      food: spawnFood(snake, board),
      score: 0,
      gameoverReason: null,
    };
  }

  // idle→playing / gameover→playing 모두 동일한 전체 초기화 (기획 §5.2)
  function startGame() {
    var s = createInitialState();
    s.status = "playing";
    return s;
  }

  // ── 게임 루프 틱 (기획 §3.3) — 순수 함수 ─────────────
  function tick(state) {
    if (state.status !== "playing") return state; // no-op 가드 (기획 §5.2·§12.5)

    // 1. 방향 확정 — 틱 적용 시점의 direction 과 비교 (기획 §3.3 step1·§12.1)
    var effectiveDirection = isValidTurn(
      state.pendingDirection,
      state.direction,
      state.snake.length
    )
      ? state.pendingDirection
      : state.direction;

    // 2. 새 머리 위치
    var vec = DIRECTION_VECTORS[effectiveDirection];
    var newHead = { x: state.snake[0].x + vec.dx, y: state.snake[0].y + vec.dy };

    // 3. 벽 충돌
    if (isWallCollision(newHead)) {
      return Object.assign({}, state, {
        status: "gameover",
        gameoverReason: "wall",
        direction: effectiveDirection,
        pendingDirection: null,
      });
    }

    // 4. 성장 여부
    var growing = newHead.x === state.food.x && newHead.y === state.food.y;

    // 5. 자기 충돌 (꼬리 vacate 규칙 §12.3)
    if (isSelfCollision(state.snake, newHead, growing)) {
      return Object.assign({}, state, {
        status: "gameover",
        gameoverReason: "self",
        direction: effectiveDirection,
        pendingDirection: null,
      });
    }

    // 6. 머리 추가 + (성장 아니면) 꼬리 제거
    var newSnake = [newHead].concat(
      state.snake.map(function (seg) {
        return { x: seg.x, y: seg.y };
      })
    );
    if (!growing) newSnake.pop();

    // 7. 점수·먹이 재스폰
    var newScore = state.score;
    var newFood = state.food;
    if (growing) {
      newScore = state.score + SCORE_PER_FOOD;
      newFood = spawnFood(newSnake, state.board);
      if (newFood === null) {
        return Object.assign({}, state, {
          status: "gameover",
          gameoverReason: "board-full",
          snake: newSnake,
          direction: effectiveDirection,
          pendingDirection: null,
          score: newScore,
        });
      }
    }

    // 8. 다음 상태
    return Object.assign({}, state, {
      snake: newSnake,
      direction: effectiveDirection,
      pendingDirection: null,
      food: newFood,
      score: newScore,
    });
  }

  return {
    // 상수
    BOARD_COLS: BOARD_COLS,
    BOARD_ROWS: BOARD_ROWS,
    CELL_SIZE: CELL_SIZE,
    TICK_INTERVAL_MS: TICK_INTERVAL_MS,
    INITIAL_SNAKE_LENGTH: INITIAL_SNAKE_LENGTH,
    INITIAL_HEAD: INITIAL_HEAD,
    INITIAL_DIRECTION: INITIAL_DIRECTION,
    SCORE_PER_FOOD: SCORE_PER_FOOD,
    DIRECTION_VECTORS: DIRECTION_VECTORS,
    // 순수 함수
    isWallCollision: isWallCollision,
    isSelfCollision: isSelfCollision,
    spawnFood: spawnFood,
    isValidTurn: isValidTurn,
    createInitialState: createInitialState,
    startGame: startGame,
    tick: tick,
  };
});
