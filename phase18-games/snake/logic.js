/* BF-925 · Snake 아케이드 순수 게임 로직 (이동·먹이·성장·충돌·게임오버·점수)
 * 기획 SSOT: docs/planning/phase18-snake-BF-923.md §3~§6 (상수·공식·상태 단일 진실)
 * 디자인 SSOT: docs/design/snake-BF-922.md §5 (시각 계약 — 렌더는 main.js)
 * file:// CORS 안전 — ES module / 네트워크 요청 / 외부 CDN / 영속 저장 0건
 * UMD 패턴 — 브라우저: globalThis.SnakeLogic, Node: module.exports (node --test 대상)
 * module: phase18-snake (루트 snake 와 네임스페이스 분리, 기획 §0 가정 2)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SnakeLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ── 상수 (planner §3.1) ─────────────────────────────────
  var BOARD_COLS = 20;
  var BOARD_ROWS = 20;
  var CELL_SIZE = 20; // 논리 px — BOARD_COLS × CELL_SIZE = 400 (canvas 400×400)
  var TICK_INTERVAL_MS = 150; // 고정 틱, 가속 없음 (planner §0 가정 7)
  var INITIAL_SNAKE_LENGTH = 3;
  var INITIAL_HEAD = { x: 10, y: 10 };
  var INITIAL_DIRECTION = "right";
  var SCORE_PER_FOOD = 10; // 먹이 1개당 점수 (planner §0 가정 6)

  // 방향 벡터 (planner §3.1)
  var DIRECTION_VECTORS = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
  };

  // ── 내부 유틸 ───────────────────────────────────────────
  function key(seg) {
    return seg.x + "," + seg.y;
  }

  // rand: () => [0,1) 주입 → 결정론 테스트 가능. 미주입 시 Math.random.
  function resolveRand(rand) {
    return typeof rand === "function" ? rand : Math.random;
  }

  // 초기 뱀: 머리 (10,10) 에서 왼쪽으로 이어진 일직선 (planner §3.2)
  // 시작 방향 right 는 몸에서 멀어지는 방향 → 시작 즉시 자기 충돌 없음.
  function createInitialSnake() {
    var snake = [];
    for (var i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
      snake.push({ x: INITIAL_HEAD.x - i, y: INITIAL_HEAD.y });
    }
    return snake;
  }

  // ── 먹이 스폰 (planner §3.5) ────────────────────────────
  // 빈 셀 전수 구성 후 무작위 1개 선택 → 보드가 거의 가득 차도 무한 루프 없이 종료.
  // 빈 셀이 없으면 null (보드 가득 참, §11.4).
  function spawnFood(snake, board, rand) {
    var r = resolveRand(rand);
    var occupied = {};
    for (var i = 0; i < snake.length; i++) {
      occupied[key(snake[i])] = true;
    }
    var freeCells = [];
    for (var y = 0; y < board.rows; y++) {
      for (var x = 0; x < board.cols; x++) {
        if (!occupied[x + "," + y]) freeCells.push({ x: x, y: y });
      }
    }
    if (freeCells.length === 0) return null;
    return freeCells[Math.floor(r() * freeCells.length)];
  }

  // ── 충돌 판정 (planner §3.4) ────────────────────────────
  // 벽 충돌 — 랩어라운드 없음 (planner §0 가정 5)
  function isWallCollision(head) {
    return (
      head.x < 0 ||
      head.x >= BOARD_COLS ||
      head.y < 0 ||
      head.y >= BOARD_ROWS
    );
  }

  // 자기 충돌 — 꼬리 vacate 규칙 포함 (planner §11.3)
  // growing 이 아니면 꼬리 셀은 이번 틱에 비워지므로 충돌 대상에서 제외.
  function isSelfCollision(snake, newHead, growing) {
    var bodyToCheck = growing ? snake : snake.slice(0, -1);
    for (var i = 0; i < bodyToCheck.length; i++) {
      if (bodyToCheck[i].x === newHead.x && bodyToCheck[i].y === newHead.y) {
        return true;
      }
    }
    return false;
  }

  // ── 방향 전환 유효성 (planner §3.6) ─────────────────────
  function isOpposite(a, b) {
    return (
      (a === "up" && b === "down") ||
      (a === "down" && b === "up") ||
      (a === "left" && b === "right") ||
      (a === "right" && b === "left")
    );
  }

  function isValidTurn(pendingDirection, currentDirection, snakeLength) {
    if (pendingDirection === null || pendingDirection === undefined) return false;
    if (!DIRECTION_VECTORS[pendingDirection]) return false;
    if (snakeLength === 1) return true; // 몸이 없으면 즉시 반전 허용
    return !isOpposite(pendingDirection, currentDirection);
  }

  // ── 초기 상태 (planner §6.1) ────────────────────────────
  // status='start' — 오버레이가 덮지만 보드에 뱀/먹이가 배치되어 있음.
  function createInitialState(rand) {
    var board = { cols: BOARD_COLS, rows: BOARD_ROWS };
    var snake = createInitialSnake();
    return {
      status: "start",
      board: board,
      snake: snake,
      direction: INITIAL_DIRECTION,
      pendingDirection: null,
      food: spawnFood(snake, board, rand),
      score: 0,
      highScore: 0,
      gameoverReason: null,
    };
  }

  // 새 게임 시작용 상태 (start→playing, gameover→playing 공통)
  // highScore 는 인자로 승계, score 는 0 리셋 (planner §6.2·§4.2).
  function createPlayState(highScore, rand) {
    var board = { cols: BOARD_COLS, rows: BOARD_ROWS };
    var snake = createInitialSnake();
    return {
      status: "playing",
      board: board,
      snake: snake,
      direction: INITIAL_DIRECTION,
      pendingDirection: null,
      food: spawnFood(snake, board, rand),
      score: 0,
      highScore: typeof highScore === "number" ? highScore : 0,
      gameoverReason: null,
    };
  }

  // ── 게임 루프 틱 (planner §3.3) ─────────────────────────
  // 순수 함수 tick(state, rand) → newState. status!=='playing' 이면 그대로 반환.
  function tick(state, rand) {
    if (state.status !== "playing") return state;

    // 1. 방향 확정 (틱 적용 시점 기준 — §11.1 즉시 반전 버그 방지)
    var effectiveDirection = isValidTurn(
      state.pendingDirection,
      state.direction,
      state.snake.length
    )
      ? state.pendingDirection
      : state.direction;

    // 2. 새 머리 위치
    var vec = DIRECTION_VECTORS[effectiveDirection];
    var newHead = {
      x: state.snake[0].x + vec.dx,
      y: state.snake[0].y + vec.dy,
    };

    // 3. 벽 충돌
    if (isWallCollision(newHead)) {
      return {
        status: "gameover",
        board: state.board,
        snake: state.snake,
        direction: effectiveDirection,
        pendingDirection: null,
        food: state.food,
        score: state.score,
        highScore: Math.max(state.highScore, state.score),
        gameoverReason: "wall",
      };
    }

    // 4. 성장 여부
    var growing =
      state.food !== null &&
      newHead.x === state.food.x &&
      newHead.y === state.food.y;

    // 5. 자기 충돌 (growing 여부에 따라 꼬리 포함/제외 — §11.3)
    if (isSelfCollision(state.snake, newHead, growing)) {
      return {
        status: "gameover",
        board: state.board,
        snake: state.snake,
        direction: effectiveDirection,
        pendingDirection: null,
        food: state.food,
        score: state.score,
        highScore: Math.max(state.highScore, state.score),
        gameoverReason: "self",
      };
    }

    // 6. 새 뱀 (머리 추가, 성장 아니면 꼬리 제거)
    var newSnake = [newHead];
    for (var i = 0; i < state.snake.length; i++) {
      newSnake.push(state.snake[i]);
    }
    if (!growing) newSnake.pop();

    // 7. 점수·먹이 갱신
    var newScore = state.score;
    var newFood = state.food;
    if (growing) {
      newScore = state.score + SCORE_PER_FOOD;
      newFood = spawnFood(newSnake, state.board, rand);
      if (newFood === null) {
        // 보드 가득 참 — 퍼펙트 클리어 (§11.4)
        return {
          status: "gameover",
          board: state.board,
          snake: newSnake,
          direction: effectiveDirection,
          pendingDirection: null,
          food: null,
          score: newScore,
          highScore: Math.max(state.highScore, newScore),
          gameoverReason: "board-full",
        };
      }
    }

    // 8. 최고 점수 갱신
    var newHighScore = Math.max(state.highScore, newScore);

    // 9. 다음 상태
    return {
      status: "playing",
      board: state.board,
      snake: newSnake,
      direction: effectiveDirection,
      pendingDirection: null,
      food: newFood,
      score: newScore,
      highScore: newHighScore,
      gameoverReason: null,
    };
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
    createInitialSnake: createInitialSnake,
    spawnFood: spawnFood,
    isWallCollision: isWallCollision,
    isSelfCollision: isSelfCollision,
    isOpposite: isOpposite,
    isValidTurn: isValidTurn,
    createInitialState: createInitialState,
    createPlayState: createPlayState,
    tick: tick,
  };
});
