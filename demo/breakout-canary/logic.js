/* BF-994 · 벽돌깨기(Breakout) canary — 순수 게임 로직 (물리·충돌·점수·생명·상태 전이)
 * 라우트: /demo/breakout-canary
 * SSOT 승계: 기획 docs/planning/breakout-BF-988.md §3~§6 · 디자인 docs/design/breakout-BF-988.md §5·§7
 *   (검증된 phase18-games/breakout 계약을 그대로 승계 — 상수·물리 공식·상태 전이 불변)
 * file:// CORS 안전 — ES module / fetch / 외부 CDN 0건
 * UMD 패턴 — 브라우저: globalThis.BreakoutLogic, Node: module.exports (node --test 대상)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.BreakoutLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ── 상수 (planner §3.1) ─────────────────────────────────
  var BOARD_WIDTH = 360;
  var BOARD_HEIGHT = 480;

  var BRICK_ROWS = 5;
  var BRICK_COLS = 8;
  var BRICK_WIDTH = 40;
  var BRICK_HEIGHT = 16;
  var BRICK_GAP = 4;
  var BRICK_SIDE_MARGIN = 6;
  var BRICK_TOP_MARGIN = 40;

  var PADDLE_WIDTH = 64;
  var PADDLE_HEIGHT = 10;
  var PADDLE_Y = 440;
  var PADDLE_SPEED_KEYBOARD = 300; // px/s

  var BALL_RADIUS = 6;
  var BALL_SPEED = 240; // px/s (증속 없음, §0 가정 4)

  var LAUNCH_ANGLE_MIN_DEG = 60; // 수평 기준 — 값이 클수록 수직에 가까움
  var LAUNCH_ANGLE_MAX_DEG = 80;
  var MAX_PADDLE_BOUNCE_ANGLE_DEG = 60; // 수직 기준 최대 반사각

  var LIVES_INITIAL = 3;
  var SCORE_PER_BRICK = 10;

  var MAX_DT = 1 / 30; // 델타타임 상한 (planner §10.5 — 백그라운드 복귀 폭주 방지)

  // 파생: 패들 중앙 X (planner §3.3)
  var PADDLE_START_X = (BOARD_WIDTH - PADDLE_WIDTH) / 2; // 148
  var BALL_START_X = PADDLE_START_X + PADDLE_WIDTH / 2; // 180
  var BALL_START_Y = PADDLE_Y - BALL_RADIUS; // 434
  var BRICK_TOTAL = BRICK_ROWS * BRICK_COLS; // 40

  // ── 유틸 순수 함수 ──────────────────────────────────────
  function clamp(v, min, max) {
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  function degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  // ── 벽돌 배치 (planner §3.2) — 행 우선(row-major) 순서 ───
  function createBricks() {
    var bricks = [];
    for (var row = 0; row < BRICK_ROWS; row += 1) {
      for (var col = 0; col < BRICK_COLS; col += 1) {
        bricks.push({
          row: row,
          col: col,
          x: BRICK_SIDE_MARGIN + col * (BRICK_WIDTH + BRICK_GAP),
          y: BRICK_TOP_MARGIN + row * (BRICK_HEIGHT + BRICK_GAP),
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          alive: true,
        });
      }
    }
    return bricks;
  }

  // ── 초기 상태 (planner §6.1, in-memory 전용) ────────────
  function createInitialState() {
    return {
      status: "start", // start | serve | playing | paused | gameover | win
      score: 0,
      lives: LIVES_INITIAL,
      paddle: { x: PADDLE_START_X }, // y 는 PADDLE_Y 고정
      ball: { x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0 },
      bricks: createBricks(),
      bricksAlive: BRICK_TOTAL,
      gameoverReason: null, // 'out-of-lives' | null
    };
  }

  // ── 공을 패들 중앙 위에 부착 (serve, planner §3.7 step 3) ─
  function attachBall(state) {
    state.ball.x = state.paddle.x + PADDLE_WIDTH / 2;
    state.ball.y = BALL_START_Y;
    state.ball.vx = 0;
    state.ball.vy = 0;
    return state;
  }

  // ── 새 라운드 전체 초기화 (start→serve, gameover/win→serve, §6.2) ─
  function resetToServe(state) {
    state.status = "serve";
    state.score = 0;
    state.lives = LIVES_INITIAL;
    state.paddle.x = PADDLE_START_X;
    state.bricks = createBricks();
    state.bricksAlive = BRICK_TOTAL;
    state.gameoverReason = null;
    attachBall(state);
    return state;
  }

  // ── 발사 벡터 (planner §3.6) ────────────────────────────
  // rand: () => [0,1) 주입 → 결정론 테스트. 미주입 시 Math.random.
  function launchVector(rand) {
    var r = typeof rand === "function" ? rand : Math.random;
    var dirX = r() < 0.5 ? -1 : 1; // 좌/우 50:50
    var span = LAUNCH_ANGLE_MAX_DEG - LAUNCH_ANGLE_MIN_DEG;
    var angleDeg = LAUNCH_ANGLE_MIN_DEG + r() * span; // 60°~80° (수평 기준)
    var angle = degToRad(angleDeg);
    return {
      vx: dirX * BALL_SPEED * Math.cos(angle),
      vy: -BALL_SPEED * Math.sin(angle), // 항상 위쪽(음수)
    };
  }

  // ── serve→playing 발사 (planner §6.2) ───────────────────
  function launch(state, rand) {
    if (state.status !== "serve") return state;
    var v = launchVector(rand);
    state.ball.vx = v.vx;
    state.ball.vy = v.vy;
    state.status = "playing";
    return state;
  }

  // ── 델타타임 클램프 (planner §10.5) ─────────────────────
  function clampDt(rawDt) {
    if (!(rawDt > 0)) return 0; // NaN/음수/0 방어
    return Math.min(rawDt, MAX_DT);
  }

  // ── 키보드 순이동 속도 (planner §5.2·§10.12) ────────────
  // 좌우 동시 눌림 → 상쇄(0). 결정론.
  function keyboardInputVX(leftHeld, rightHeld) {
    var dir = (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0);
    return dir * PADDLE_SPEED_KEYBOARD;
  }

  // ── 벽 반사 (planner §3.4) — 새 {x,y,vx,vy} 반환(순수) ──
  function reflectWalls(ball) {
    var x = ball.x;
    var y = ball.y;
    var vx = ball.vx;
    var vy = ball.vy;
    if (x - BALL_RADIUS <= 0) {
      x = BALL_RADIUS;
      vx = Math.abs(vx);
    } else if (x + BALL_RADIUS >= BOARD_WIDTH) {
      x = BOARD_WIDTH - BALL_RADIUS;
      vx = -Math.abs(vx);
    }
    if (y - BALL_RADIUS <= 0) {
      y = BALL_RADIUS;
      vy = Math.abs(vy);
    }
    // 하단은 반사하지 않음 — 생명 손실 판정 대상(§3.7 step 7)
    return { x: x, y: y, vx: vx, vy: vy };
  }

  // ── 벽돌 충돌 판정·반사 (planner §3.6, 원-사각 최근접점) ─
  // 겹치면 ball.vx 또는 vy 를 반전(mutate)하고 { hit:true } 반환, 아니면 null.
  function resolveBrickHit(ball, brick) {
    var closestX = clamp(ball.x, brick.x, brick.x + brick.width);
    var closestY = clamp(ball.y, brick.y, brick.y + brick.height);
    var dx = ball.x - closestX;
    var dy = ball.y - closestY;
    var overlapX = BALL_RADIUS - Math.abs(dx);
    var overlapY = BALL_RADIUS - Math.abs(dy);
    if (overlapX <= 0 || overlapY <= 0) return null; // 실제 겹침 없음
    if (overlapX < overlapY) {
      ball.vx = -ball.vx; // 좌/우 면
    } else {
      ball.vy = -ball.vy; // 상/하 면
    }
    return { hit: true };
  }

  // ── 패들 충돌 AABB (planner §3.5) ───────────────────────
  function ballHitsPaddle(ball, paddleX) {
    return (
      ball.x + BALL_RADIUS >= paddleX &&
      ball.x - BALL_RADIUS <= paddleX + PADDLE_WIDTH &&
      ball.y + BALL_RADIUS >= PADDLE_Y &&
      ball.y - BALL_RADIUS <= PADDLE_Y + PADDLE_HEIGHT
    );
  }

  // ── 패들 반사각 보정 (planner §3.5) — 새 {vx,vy} 반환 ───
  function paddleBounce(ball, paddleX) {
    var rel = clamp(
      (ball.x - (paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2),
      -1,
      1
    );
    var bounceAngle = rel * degToRad(MAX_PADDLE_BOUNCE_ANGLE_DEG);
    return {
      vx: BALL_SPEED * Math.sin(bounceAngle),
      vy: -BALL_SPEED * Math.cos(bounceAngle), // 항상 위쪽(음수)
    };
  }

  // ── 게임 루프 1프레임 (planner §3.7) — state 를 in-place 갱신 후 반환 ─
  // inputVX: 이번 프레임 패들 순이동 속도(px/s) 또는 (state)=>number
  function update(state, dt, inputVX, rand) {
    var status = state.status;

    // step 1 — 정지 상태는 no-op(패들도 정지)
    if (
      status === "paused" ||
      status === "start" ||
      status === "gameover" ||
      status === "win"
    ) {
      return state;
    }

    // step 2 — 패들 이동(serve/playing 공통)
    var vx = typeof inputVX === "function" ? inputVX(state) : inputVX || 0;
    state.paddle.x = clamp(
      state.paddle.x + vx * dt,
      0,
      BOARD_WIDTH - PADDLE_WIDTH
    );

    // step 3 — serve: 공은 패들을 추종(물리 없음)
    if (status === "serve") {
      state.ball.x = state.paddle.x + PADDLE_WIDTH / 2;
      state.ball.y = BALL_START_Y;
      return state;
    }

    // step 4 — (playing) 공 이동 + 벽 반사
    var ball = state.ball;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    var w = reflectWalls(ball);
    ball.x = w.x;
    ball.y = w.y;
    ball.vx = w.vx;
    ball.vy = w.vy;

    // step 5 — 벽돌 충돌 스캔(행 우선, 첫 겹침 1개만)
    var bricks = state.bricks;
    for (var i = 0; i < bricks.length; i += 1) {
      var brick = bricks[i];
      if (!brick.alive) continue;
      if (resolveBrickHit(ball, brick)) {
        brick.alive = false;
        state.score += SCORE_PER_BRICK;
        state.bricksAlive -= 1;
        if (state.bricksAlive === 0) {
          state.status = "win"; // §3.8 — 즉시 확정, 이후 단계 생략
          return state;
        }
        break; // 첫 벽돌만 처리
      }
    }

    // step 6 — 패들 충돌·반사(하강 중일 때만, §3.5·§10.2)
    if (ball.vy > 0 && ballHitsPaddle(ball, state.paddle.x)) {
      var pb = paddleBounce(ball, state.paddle.x);
      ball.vx = pb.vx;
      ball.vy = pb.vy;
      ball.y = PADDLE_Y - BALL_RADIUS; // 같은 프레임 재충돌 방지
    }

    // step 7 — 하단 이탈 판정
    if (ball.y - BALL_RADIUS > BOARD_HEIGHT) {
      state.lives -= 1;
      if (state.lives > 0) {
        state.status = "serve";
        attachBall(state); // 패들 현재 위치에 재부착
      } else {
        state.status = "gameover";
        state.gameoverReason = "out-of-lives";
      }
    }

    // step 8
    return state;
  }

  return {
    // 상수
    BOARD_WIDTH: BOARD_WIDTH,
    BOARD_HEIGHT: BOARD_HEIGHT,
    BRICK_ROWS: BRICK_ROWS,
    BRICK_COLS: BRICK_COLS,
    BRICK_WIDTH: BRICK_WIDTH,
    BRICK_HEIGHT: BRICK_HEIGHT,
    BRICK_GAP: BRICK_GAP,
    BRICK_SIDE_MARGIN: BRICK_SIDE_MARGIN,
    BRICK_TOP_MARGIN: BRICK_TOP_MARGIN,
    BRICK_TOTAL: BRICK_TOTAL,
    PADDLE_WIDTH: PADDLE_WIDTH,
    PADDLE_HEIGHT: PADDLE_HEIGHT,
    PADDLE_Y: PADDLE_Y,
    PADDLE_SPEED_KEYBOARD: PADDLE_SPEED_KEYBOARD,
    PADDLE_START_X: PADDLE_START_X,
    BALL_RADIUS: BALL_RADIUS,
    BALL_SPEED: BALL_SPEED,
    BALL_START_X: BALL_START_X,
    BALL_START_Y: BALL_START_Y,
    LAUNCH_ANGLE_MIN_DEG: LAUNCH_ANGLE_MIN_DEG,
    LAUNCH_ANGLE_MAX_DEG: LAUNCH_ANGLE_MAX_DEG,
    MAX_PADDLE_BOUNCE_ANGLE_DEG: MAX_PADDLE_BOUNCE_ANGLE_DEG,
    LIVES_INITIAL: LIVES_INITIAL,
    SCORE_PER_BRICK: SCORE_PER_BRICK,
    MAX_DT: MAX_DT,
    // 함수
    clamp: clamp,
    degToRad: degToRad,
    createBricks: createBricks,
    createInitialState: createInitialState,
    attachBall: attachBall,
    resetToServe: resetToServe,
    launchVector: launchVector,
    launch: launch,
    clampDt: clampDt,
    keyboardInputVX: keyboardInputVX,
    reflectWalls: reflectWalls,
    resolveBrickHit: resolveBrickHit,
    ballHitsPaddle: ballHitsPaddle,
    paddleBounce: paddleBounce,
    update: update,
  };
});
