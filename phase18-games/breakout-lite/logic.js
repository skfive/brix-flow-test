/* BF-943 · 브레이크아웃 라이트(Breakout Lite) 순수 게임 로직
 * (물리·충돌·점수·생명·상태 전이 — 렌더와 분리된 결정론적 함수)
 * 기획 SSOT: docs/plan/breakout-lite-BF-941.md §3~§6 (상수·규칙·상태 전이 단일 진실)
 * 디자인 SSOT: docs/design/breakout-lite-BF-942.md §5 (시각 계약·픽셀 좌표)
 * file:// CORS 안전 — ES module / fetch / 외부 CDN 0건 (planner §9)
 * UMD 패턴 — 브라우저: globalThis.BreakoutLiteLogic, Node: module.exports (node --test 대상)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.BreakoutLiteLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ── 상수 (planner §3.1 / designer §5.1 픽셀 좌표) ────────
  var BOARD_WIDTH = 360;
  var BOARD_HEIGHT = 480;

  // 벽돌 격자: 4행×6열=24개 (planner §3.2 — 기존 breakout 대비 축소)
  var BRICK_ROWS = 4;
  var BRICK_COLS = 6;
  var BRICK_WIDTH = 50; // designer §5.1: 6열에 맞춰 폭 확대
  var BRICK_HEIGHT = 16;
  var BRICK_GAP = 4;
  var BRICK_SIDE_MARGIN = 18; // designer §5.1 확정
  var BRICK_TOP_MARGIN = 48; // designer §5.1 확정

  var PADDLE_WIDTH = 64;
  var PADDLE_HEIGHT = 10;
  var PADDLE_Y = 440;
  var PADDLE_SPEED_KEYBOARD = 300; // px/s

  var BALL_RADIUS = 6;
  var BALL_SPEED = 240; // px/s — 고정(가속/감속 없음, planner §3.1)

  // Lite 발사각: 수평 기준 고정 60° (단순화 — 반사각 보정 없음, planner §8)
  var LAUNCH_ANGLE_DEG = 60;

  var LIVES_INITIAL = 3;
  var SCORE_PER_BRICK = 10;

  var MAX_DT = 1 / 30; // 델타타임 상한 (planner §7-8 — 백그라운드 복귀 터널링 방지)

  // 파생값 (planner §3.3 — 패들 하단 중앙 시작)
  var PADDLE_START_X = (BOARD_WIDTH - PADDLE_WIDTH) / 2; // 148
  var BALL_START_X = PADDLE_START_X + PADDLE_WIDTH / 2; // 180
  var BALL_START_Y = PADDLE_Y - BALL_RADIUS; // 434
  var BRICK_TOTAL = BRICK_ROWS * BRICK_COLS; // 24

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
  // 상태 형태: { phase, score, lives, bricksRemaining, paddleX, ball, bricks, loseReason }
  function createInitialState() {
    return {
      phase: "idle", // idle | serve | playing | paused | win | lose
      score: 0,
      lives: LIVES_INITIAL,
      bricksRemaining: BRICK_TOTAL,
      paddleX: PADDLE_START_X, // y 는 PADDLE_Y 고정
      ball: { x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0 },
      bricks: createBricks(),
      loseReason: null, // 'out-of-lives' | null
    };
  }

  // ── 공을 패들 중앙 위에 부착 (serve, planner §3.6) ───────
  function attachBall(state) {
    state.ball.x = state.paddleX + PADDLE_WIDTH / 2;
    state.ball.y = BALL_START_Y;
    state.ball.vx = 0;
    state.ball.vy = 0;
    return state;
  }

  // ── idle → serve (첫 서브 대기 진입, planner §6.2) ──────
  // 벽돌·점수·생명은 유지(리셋은 restart 담당). idle 에서만 유효.
  function startGame(state) {
    if (state.phase !== "idle") return state;
    state.phase = "serve";
    attachBall(state);
    return state;
  }

  // ── 재시작 (임의 phase → idle, 전체 초기화, planner §6.2·§6.3) ─
  function restart(state) {
    state.phase = "idle";
    state.score = 0;
    state.lives = LIVES_INITIAL;
    state.bricksRemaining = BRICK_TOTAL;
    state.paddleX = PADDLE_START_X;
    state.bricks = createBricks();
    state.loseReason = null;
    attachBall(state);
    return state;
  }

  // ── 발사 벡터 (planner §3.6) — 고정 속도·고정각, 좌/우만 rand ─
  // rand: () => [0,1) 주입 → 결정론 테스트. 미주입 시 Math.random.
  function launchVector(rand) {
    var r = typeof rand === "function" ? rand : Math.random;
    var dirX = r() < 0.5 ? -1 : 1; // 좌/우 50:50
    var angle = degToRad(LAUNCH_ANGLE_DEG);
    return {
      vx: dirX * BALL_SPEED * Math.cos(angle),
      vy: -BALL_SPEED * Math.sin(angle), // 항상 위쪽(음수)
    };
  }

  // ── serve → playing 발사 (planner §6.2) ─────────────────
  function launch(state, rand) {
    if (state.phase !== "serve") return state;
    var v = launchVector(rand);
    state.ball.vx = v.vx;
    state.ball.vy = v.vy;
    state.phase = "playing";
    return state;
  }

  // ── 일시정지 토글 (playing ↔ paused, planner §6.2·§7-3) ─
  function togglePause(state) {
    if (state.phase === "playing") {
      state.phase = "paused";
    } else if (state.phase === "paused") {
      state.phase = "playing";
    }
    return state;
  }

  // ── 델타타임 클램프 (planner §7-8) ──────────────────────
  function clampDt(rawDt) {
    if (!(rawDt > 0)) return 0; // NaN/음수/0 방어
    return Math.min(rawDt, MAX_DT);
  }

  // ── 키보드 순이동 속도 (planner §5.2 — 좌우 동시=상쇄) ──
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
    // 하단은 반사하지 않음 — 생명 손실 판정 대상(planner §3.4·§4.2)
    return { x: x, y: y, vx: vx, vy: vy };
  }

  // ── 벽돌 충돌 판정·반사 (planner §3.4 — 원-사각 최근접점, 단순 반사) ─
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

  // ── 패들 충돌 AABB (planner §3.4) ───────────────────────
  function ballHitsPaddle(ball, paddleX) {
    return (
      ball.x + BALL_RADIUS >= paddleX &&
      ball.x - BALL_RADIUS <= paddleX + PADDLE_WIDTH &&
      ball.y + BALL_RADIUS >= PADDLE_Y &&
      ball.y - BALL_RADIUS <= PADDLE_Y + PADDLE_HEIGHT
    );
  }

  // ── 패들 반사: 단순 대칭 반사만 (planner §3.4·§8) ───────
  // 기존 breakout 의 "패들 위치별 각도 보정"은 Lite 범위 밖.
  // vy 만 위쪽으로 반전, vx(수평 성분)는 보존한다.
  function paddleBounce(ball) {
    return {
      vx: ball.vx,
      vy: -Math.abs(ball.vy), // 항상 위쪽(음수)
    };
  }

  // ── 게임 루프 1프레임 (planner §3.5) — state 를 in-place 갱신 후 반환 ─
  // 순서: ① 입력(패들) → ② 공 이동 → ③ 충돌(벽→벽돌→패들) → ④ 점수/생명/벽돌 → ⑤ 종료 판정
  // inputVX: 이번 프레임 패들 순이동 속도(px/s) 또는 (state)=>number
  function update(state, dt, inputVX) {
    var phase = state.phase;

    // step 1 — 정지 상태는 no-op (planner §6.3: lose/win/paused/idle 는 입력 무반영)
    if (
      phase === "paused" ||
      phase === "idle" ||
      phase === "win" ||
      phase === "lose"
    ) {
      return state;
    }

    // step 2 — 패들 이동 (serve/playing 공통, 벽 클램프 planner §3.3)
    var vx = typeof inputVX === "function" ? inputVX(state) : inputVX || 0;
    state.paddleX = clamp(state.paddleX + vx * dt, 0, BOARD_WIDTH - PADDLE_WIDTH);

    // step 3 — serve: 공은 패들 위에 부착되어 함께 이동(물리 없음, planner §3.6)
    if (phase === "serve") {
      state.ball.x = state.paddleX + PADDLE_WIDTH / 2;
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

    // step 5 — 벽돌 충돌 스캔(행 우선, 첫 겹침 1개만) + 점수/승리 판정
    var bricks = state.bricks;
    for (var i = 0; i < bricks.length; i += 1) {
      var brick = bricks[i];
      if (!brick.alive) continue;
      if (resolveBrickHit(ball, brick)) {
        brick.alive = false;
        state.score += SCORE_PER_BRICK;
        state.bricksRemaining -= 1;
        if (state.bricksRemaining === 0) {
          state.phase = "win"; // planner §4.3 — 즉시 확정(생명 손실보다 우선)
          return state;
        }
        break; // 첫 벽돌만 처리
      }
    }

    // step 6 — 패들 충돌·단순 반사(하강 중일 때만, planner §3.4)
    if (ball.vy > 0 && ballHitsPaddle(ball, state.paddleX)) {
      var pb = paddleBounce(ball);
      ball.vx = pb.vx;
      ball.vy = pb.vy;
      ball.y = PADDLE_Y - BALL_RADIUS; // 같은 프레임 재충돌 방지
    }

    // step 7 — 하단 이탈 판정 → 생명 손실 (planner §4.2·§4.3)
    if (ball.y - BALL_RADIUS > BOARD_HEIGHT) {
      state.lives -= 1;
      if (state.lives > 0) {
        state.phase = "serve";
        attachBall(state); // 패들 현재 위치 유지, 공만 재부착(planner §7-7)
      } else {
        state.phase = "lose";
        state.loseReason = "out-of-lives";
      }
    }

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
    LAUNCH_ANGLE_DEG: LAUNCH_ANGLE_DEG,
    LIVES_INITIAL: LIVES_INITIAL,
    SCORE_PER_BRICK: SCORE_PER_BRICK,
    MAX_DT: MAX_DT,
    // 함수
    clamp: clamp,
    degToRad: degToRad,
    createBricks: createBricks,
    createInitialState: createInitialState,
    attachBall: attachBall,
    startGame: startGame,
    restart: restart,
    launchVector: launchVector,
    launch: launch,
    togglePause: togglePause,
    clampDt: clampDt,
    keyboardInputVX: keyboardInputVX,
    reflectWalls: reflectWalls,
    resolveBrickHit: resolveBrickHit,
    ballHitsPaddle: ballHitsPaddle,
    paddleBounce: paddleBounce,
    update: update,
  };
});
