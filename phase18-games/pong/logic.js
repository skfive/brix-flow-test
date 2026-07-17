/* BF-913 · Pong 아케이드 순수 로직 (물리·AI·득점·승리·서브)
 * 기획 SSOT: docs/planning/pong-BF-910.md §3~§4 (상수·공식 단일 진실)
 * 디자인 SSOT: docs/design/pong-BF-910.md §6 (시각 계약)
 * file:// CORS 안전 — ES module / fetch / 외부 CDN 0건
 * UMD 패턴 — 브라우저: globalThis.PongLogic, Node: module.exports (node --test 대상)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.PongLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ── 상수 (planner §3.1) ─────────────────────────────────
  var COURT_WIDTH = 800; // W
  var COURT_HEIGHT = 400; // H
  var PADDLE_WIDTH = 12;
  var PADDLE_HEIGHT = 80;
  var PADDLE_MARGIN_X = 24;
  var PADDLE_SPEED_KEYBOARD = 480; // px/s
  var CPU_SPEED = 360; // px/s
  var CPU_RETURN_SPEED = 180; // px/s
  var BALL_RADIUS = 8;
  var BALL_SPEED_INIT = 300; // px/s
  var BALL_SPEED_INCREMENT = 1.05; // 반사 1회당 배수
  var BALL_SPEED_MAX = 600; // px/s 상한
  var SERVE_ANGLE_MIN_DEG = 10;
  var SERVE_ANGLE_MAX_DEG = 45;
  var WIN_SCORE = 11;
  var POINT_PAUSE_MS = 800;

  // 패들 반사 (planner §3.4)
  var MAX_BOUNCE_ANGLE_DEG = 60;
  var MAX_BOUNCE_ANGLE = (MAX_BOUNCE_ANGLE_DEG * Math.PI) / 180; // 라디안
  var MIN_VX_RATIO = 0.4;

  // 델타타임 상한 (planner §10.5) — 백그라운드 복귀 시 물리 폭주 방지
  var MAX_DT = 1 / 30;

  // 파생: 패들 X 좌표 (planner §3.2)
  var PLAYER_X = PADDLE_MARGIN_X; // 24
  var CPU_X = COURT_WIDTH - PADDLE_MARGIN_X - PADDLE_WIDTH; // 764
  var PADDLE_Y_MAX = COURT_HEIGHT - PADDLE_HEIGHT; // 320
  var PADDLE_CENTER_Y = (COURT_HEIGHT - PADDLE_HEIGHT) / 2; // 160

  // ── 유틸 순수 함수 ──────────────────────────────────────
  function clamp(v, min, max) {
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  // planner §3.5 — target 과의 차가 maxDelta 보다 크면 maxDelta 만큼만, 아니면 스냅
  function moveTowards(current, target, maxDelta) {
    var diff = target - current;
    if (Math.abs(diff) <= maxDelta) return target;
    return current + (diff > 0 ? maxDelta : -maxDelta);
  }

  function degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  // ── 초기 상태 (planner §6.1) ────────────────────────────
  function createInitialState() {
    return {
      status: "start", // start | playing | point-paused | paused | gameover
      score: { player: 0, cpu: 0 },
      ball: { x: COURT_WIDTH / 2, y: COURT_HEIGHT / 2, vx: 0, vy: 0 },
      paddles: {
        player: { y: PADDLE_CENTER_Y },
        cpu: { y: PADDLE_CENTER_Y },
      },
      winner: null,
      pointPausedAt: null,
    };
  }

  // ── 서브 (planner §4.1-3, §3.1 SERVE_ANGLE_RANGE) ───────
  // rand: () => [0,1) 주입 → 결정론 테스트 가능. 미주입 시 Math.random.
  function makeServe(rand) {
    var r = typeof rand === "function" ? rand : Math.random;
    var dirX = r() < 0.5 ? -1 : 1; // 좌/우 50:50
    var dirY = r() < 0.5 ? -1 : 1; // 상/하 부호 무작위
    var span = SERVE_ANGLE_MAX_DEG - SERVE_ANGLE_MIN_DEG;
    var angleDeg = SERVE_ANGLE_MIN_DEG + r() * span; // 10°~45°
    var angle = degToRad(angleDeg);
    return {
      vx: dirX * BALL_SPEED_INIT * Math.cos(angle),
      vy: dirY * BALL_SPEED_INIT * Math.sin(angle),
    };
  }

  // 득점 후 공을 중앙 리셋 + 새 서브 벡터 부여 (planner §4.1)
  function serveBall(rand) {
    var v = makeServe(rand);
    return { x: COURT_WIDTH / 2, y: COURT_HEIGHT / 2, vx: v.vx, vy: v.vy };
  }

  // ── 델타타임 클램프 (planner §10.5) ─────────────────────
  function clampDt(rawDt) {
    if (!(rawDt > 0)) return 0; // NaN/음수/0 방어
    return Math.min(rawDt, MAX_DT);
  }

  // ── 벽 반사 (planner §3.3) ──────────────────────────────
  // ball 을 변형하지 않고 새 {y, vy} 반영된 결과를 반환(순수).
  function reflectWall(ball) {
    var y = ball.y;
    var vy = ball.vy;
    if (y <= BALL_RADIUS) {
      y = BALL_RADIUS; // 벽 안쪽 보정
      vy = Math.abs(vy);
    } else if (y >= COURT_HEIGHT - BALL_RADIUS) {
      y = COURT_HEIGHT - BALL_RADIUS;
      vy = -Math.abs(vy);
    }
    return { x: ball.x, y: y, vx: ball.vx, vy: vy };
  }

  // ── 패들 충돌 판정 (planner §3.4) ───────────────────────
  // paddleX: 패들 좌측 X, paddle: {y}
  function ballHitsPaddle(ball, paddleX, paddle) {
    var withinX =
      ball.x + BALL_RADIUS >= paddleX &&
      ball.x - BALL_RADIUS <= paddleX + PADDLE_WIDTH;
    var withinY =
      ball.y >= paddle.y && ball.y <= paddle.y + PADDLE_HEIGHT;
    return withinX && withinY;
  }

  // ── 패들 반사각 보정 (planner §3.4 공식 그대로) ─────────
  // 반환: 반사된 {vx, vy}. 위치 보정은 호출측(main)에서 패들 표면 밖으로 밀어냄.
  function paddleBounce(ball, paddle) {
    var relativeIntersectY =
      (ball.y - (paddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2); // -1~1
    var rel = clamp(relativeIntersectY, -1, 1);
    var speed = Math.min(
      Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * BALL_SPEED_INCREMENT,
      BALL_SPEED_MAX
    );
    var bounce = rel * MAX_BOUNCE_ANGLE;
    var vxSign = ball.vx > 0 ? -1 : 1; // sign(-vx)
    var newVx = vxSign * speed * Math.max(Math.cos(bounce), MIN_VX_RATIO);
    var newVy = speed * Math.sin(bounce);
    return { vx: newVx, vy: newVy };
  }

  // ── CPU AI (planner §3.5 결정론) ────────────────────────
  function updateCpu(cpuY, ball, dt) {
    var next;
    if (ball.vx > 0) {
      // 공이 CPU(우측) 쪽으로 이동 중 — 추적
      var targetY = ball.y - PADDLE_HEIGHT / 2;
      next = moveTowards(cpuY, targetY, CPU_SPEED * dt);
    } else {
      // 공이 플레이어 쪽으로 이동 중 — 중앙 복귀
      var centerY = COURT_HEIGHT / 2 - PADDLE_HEIGHT / 2;
      next = moveTowards(cpuY, centerY, CPU_RETURN_SPEED * dt);
    }
    return clamp(next, 0, PADDLE_Y_MAX);
  }

  // ── 득점 판정 (planner §4.1) ────────────────────────────
  // 반환: 'player' | 'cpu' | null (누가 득점했는가)
  function checkScore(ball) {
    if (ball.x < 0) return "cpu"; // 좌측 경계 벗어남 = 플레이어가 놓침 → CPU 득점
    if (ball.x > COURT_WIDTH) return "player"; // 우측 경계 벗어남 → 플레이어 득점
    return null;
  }

  // ── 승리 판정 (planner §4.2) ────────────────────────────
  function checkWinner(score) {
    if (score.player >= WIN_SCORE) return "player";
    if (score.cpu >= WIN_SCORE) return "cpu";
    return null;
  }

  return {
    // 상수
    COURT_WIDTH: COURT_WIDTH,
    COURT_HEIGHT: COURT_HEIGHT,
    PADDLE_WIDTH: PADDLE_WIDTH,
    PADDLE_HEIGHT: PADDLE_HEIGHT,
    PADDLE_MARGIN_X: PADDLE_MARGIN_X,
    PADDLE_SPEED_KEYBOARD: PADDLE_SPEED_KEYBOARD,
    CPU_SPEED: CPU_SPEED,
    CPU_RETURN_SPEED: CPU_RETURN_SPEED,
    BALL_RADIUS: BALL_RADIUS,
    BALL_SPEED_INIT: BALL_SPEED_INIT,
    BALL_SPEED_INCREMENT: BALL_SPEED_INCREMENT,
    BALL_SPEED_MAX: BALL_SPEED_MAX,
    SERVE_ANGLE_MIN_DEG: SERVE_ANGLE_MIN_DEG,
    SERVE_ANGLE_MAX_DEG: SERVE_ANGLE_MAX_DEG,
    WIN_SCORE: WIN_SCORE,
    POINT_PAUSE_MS: POINT_PAUSE_MS,
    MAX_BOUNCE_ANGLE: MAX_BOUNCE_ANGLE,
    MIN_VX_RATIO: MIN_VX_RATIO,
    MAX_DT: MAX_DT,
    PLAYER_X: PLAYER_X,
    CPU_X: CPU_X,
    PADDLE_Y_MAX: PADDLE_Y_MAX,
    PADDLE_CENTER_Y: PADDLE_CENTER_Y,
    // 함수
    clamp: clamp,
    moveTowards: moveTowards,
    degToRad: degToRad,
    createInitialState: createInitialState,
    makeServe: makeServe,
    serveBall: serveBall,
    clampDt: clampDt,
    reflectWall: reflectWall,
    ballHitsPaddle: ballHitsPaddle,
    paddleBounce: paddleBounce,
    updateCpu: updateCpu,
    checkScore: checkScore,
    checkWinner: checkWinner,
  };
});
