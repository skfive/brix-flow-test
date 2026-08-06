// phaser-brick-blitz/tests/logic.test.js
// src/logic.js 순수 로직의 상태 전이·충돌·점수·목숨·재시작을 결정론적으로 검증한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATES,
  EVENTS,
  DEFAULT_CONFIG,
  ROW_COLOR_TOKENS,
  ROW_SCORE,
  scoreForRow,
  nextStatus,
  createBricks,
  createBall,
  createPaddle,
  createInitialState,
  aabbIntersects,
  ballRectIntersects,
  reflectWalls,
  isBelowFloor,
  paddleReflection,
  resolveBrickCollisions,
  countAliveBricks,
  loseLife,
  applyBrickResult,
  resetGame,
} from '../src/logic.js';

/** 고정 시퀀스를 반환하는 결정론적 rng. */
function seededRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

test('상태 전이: ready --START--> playing', () => {
  assert.equal(nextStatus(STATES.READY, EVENTS.START), STATES.PLAYING);
});

test('상태 전이: playing --PAUSE--> paused, paused --RESUME--> playing', () => {
  assert.equal(nextStatus(STATES.PLAYING, EVENTS.PAUSE), STATES.PAUSED);
  assert.equal(nextStatus(STATES.PAUSED, EVENTS.RESUME), STATES.PLAYING);
  assert.equal(nextStatus(STATES.PAUSED, EVENTS.START), STATES.PLAYING);
});

test('상태 전이: playing --목숨0--> gameover, --전부파괴--> cleared', () => {
  assert.equal(nextStatus(STATES.PLAYING, EVENTS.LOSE_LAST_LIFE), STATES.GAMEOVER);
  assert.equal(nextStatus(STATES.PLAYING, EVENTS.CLEAR_ALL), STATES.CLEARED);
});

test('상태 전이: gameover/cleared --RESET--> ready', () => {
  assert.equal(nextStatus(STATES.GAMEOVER, EVENTS.RESET), STATES.READY);
  assert.equal(nextStatus(STATES.CLEARED, EVENTS.RESET), STATES.READY);
});

test('상태 전이: 유효하지 않은 이벤트는 현재 상태 유지', () => {
  assert.equal(nextStatus(STATES.READY, EVENTS.PAUSE), STATES.READY);
  assert.equal(nextStatus(STATES.GAMEOVER, EVENTS.PAUSE), STATES.GAMEOVER);
  assert.equal(nextStatus(STATES.PLAYING, 'UNKNOWN'), STATES.PLAYING);
});

test('점수: 행별 가중치, 상단 행이 더 높음', () => {
  assert.equal(scoreForRow(0), ROW_SCORE[0]);
  assert.equal(scoreForRow(1), ROW_SCORE[1]);
  assert.equal(scoreForRow(2), ROW_SCORE[2]);
  assert.ok(scoreForRow(0) > scoreForRow(2));
  assert.equal(scoreForRow(99), ROW_SCORE[ROW_SCORE.length - 1]);
  assert.equal(scoreForRow(-1), 0);
});

test('벽돌 배치: 3행 이상, 행별 색상 토큰이 exact', () => {
  const bricks = createBricks({ rows: 3, cols: 4 });
  assert.equal(bricks.length, 12);
  const rows = new Set(bricks.map((b) => b.row));
  assert.ok(rows.size >= 3);
  assert.equal(bricks.find((b) => b.row === 0).colorToken, ROW_COLOR_TOKENS[0]);
  assert.equal(bricks.find((b) => b.row === 1).colorToken, ROW_COLOR_TOKENS[1]);
  assert.equal(bricks.find((b) => b.row === 2).colorToken, ROW_COLOR_TOKENS[2]);
  assert.ok(bricks.every((b) => b.alive === true));
});

test('무작위 주입: rng 로 초기 공 방향이 결정론적', () => {
  const left = createBall({}, seededRng([0.1]));
  const right = createBall({}, seededRng([0.9]));
  assert.ok(left.vx < 0, '0.1 이면 좌향');
  assert.ok(right.vx > 0, '0.9 이면 우향');
  assert.ok(left.vy < 0 && right.vy < 0, '항상 위로 향함');
  // 같은 시드는 같은 결과(결정론)
  const a = createBall({}, seededRng([0.42]));
  const b = createBall({}, seededRng([0.42]));
  assert.deepEqual(a, b);
});

test('초기 상태: 목숨 3, 점수 0, ready, 벽돌 생존', () => {
  const s = createInitialState({}, seededRng([0.5]));
  assert.equal(s.status, STATES.READY);
  assert.equal(s.score, 0);
  assert.equal(s.lives, DEFAULT_CONFIG.initialLives);
  assert.equal(s.lives, 3);
  assert.equal(countAliveBricks(s.bricks), DEFAULT_CONFIG.rows * DEFAULT_CONFIG.cols);
  assert.ok(s.paddle.width > 0);
});

test('AABB 충돌 판정', () => {
  const a = { x: 0, y: 0, width: 10, height: 10 };
  assert.equal(aabbIntersects(a, { x: 5, y: 5, width: 10, height: 10 }), true);
  assert.equal(aabbIntersects(a, { x: 20, y: 20, width: 10, height: 10 }), false);
});

test('원-사각형 충돌 판정', () => {
  const rect = { x: 10, y: 10, width: 20, height: 20 };
  assert.equal(ballRectIntersects({ x: 20, y: 20, radius: 5 }, rect), true, '내부');
  assert.equal(ballRectIntersects({ x: 6, y: 20, radius: 5 }, rect), true, '왼쪽 경계 접촉');
  assert.equal(ballRectIntersects({ x: 0, y: 0, radius: 3 }, rect), false, '멀리 떨어짐');
});

test('벽 반사: 좌/우/상단에서 속도 부호 반전', () => {
  const bounds = { width: 100, height: 200 };
  const left = reflectWalls({ x: 2, y: 50, vx: -10, vy: 5, radius: 8 }, bounds);
  assert.ok(left.bouncedX && left.ball.vx > 0);
  const right = reflectWalls({ x: 96, y: 50, vx: 10, vy: 5, radius: 8 }, bounds);
  assert.ok(right.bouncedX && right.ball.vx < 0);
  const top = reflectWalls({ x: 50, y: 4, vx: 3, vy: -10, radius: 8 }, bounds);
  assert.ok(top.bouncedY && top.ball.vy > 0);
  // 중앙에서는 반사 없음
  const none = reflectWalls({ x: 50, y: 100, vx: 3, vy: 4, radius: 8 }, bounds);
  assert.ok(!none.bouncedX && !none.bouncedY);
});

test('바닥 이탈 판정(목숨 소진 트리거)', () => {
  const bounds = { width: 100, height: 200 };
  assert.equal(isBelowFloor({ y: 210, radius: 8 }, bounds), true);
  assert.equal(isBelowFloor({ y: 150, radius: 8 }, bounds), false);
});

test('패들 반사: 접촉 지점에 따라 반사각이 달라진다', () => {
  const paddle = { x: 0, width: 100 };
  const cfg = { maxBounceAngleDeg: 60 };
  const center = paddleReflection({ x: 50, vx: 0, vy: 100 }, paddle, cfg);
  const rightEdge = paddleReflection({ x: 100, vx: 0, vy: 100 }, paddle, cfg);
  const leftEdge = paddleReflection({ x: 0, vx: 0, vy: 100 }, paddle, cfg);
  // 중앙은 거의 수직(vx≈0)
  assert.ok(Math.abs(center.vx) < 1e-6, '중앙 접촉은 수직 반사');
  // 가장자리는 수평 성분이 커짐 + 좌/우 방향이 반대
  assert.ok(rightEdge.vx > center.vx, '오른쪽 접촉은 오른쪽으로');
  assert.ok(leftEdge.vx < center.vx, '왼쪽 접촉은 왼쪽으로');
  // 항상 위로 튕김
  assert.ok(center.vy < 0 && rightEdge.vy < 0 && leftEdge.vy < 0);
});

test('패들 반사: 속도 크기(speed) 보존', () => {
  const paddle = { x: 0, width: 100 };
  const r = paddleReflection({ x: 70, vx: 30, vy: 40 }, paddle, { maxBounceAngleDeg: 60 });
  assert.ok(Math.abs(Math.hypot(r.vx, r.vy) - 50) < 1e-6);
});

test('벽돌 충돌: 첫 벽돌 파괴 + 반사 + 점수', () => {
  const bricks = [
    { id: 'b-0-0', row: 0, col: 0, x: 40, y: 40, width: 20, height: 10, colorToken: '--color-brick-r1', alive: true },
    { id: 'b-1-0', row: 1, col: 0, x: 200, y: 200, width: 20, height: 10, colorToken: '--color-brick-r2', alive: true },
  ];
  // 아래에서 위로 올라가다 아래 면과 충돌
  const ball = { x: 50, y: 52, vx: 0, vy: -100, radius: 6 };
  const res = resolveBrickCollisions(ball, bricks);
  assert.ok(res.hitBrick && res.hitBrick.id === 'b-0-0');
  assert.equal(res.gainedScore, scoreForRow(0));
  assert.equal(res.bricks.find((b) => b.id === 'b-0-0').alive, false);
  assert.equal(res.bricks.find((b) => b.id === 'b-1-0').alive, true, '나머지 벽돌은 유지');
  assert.ok(res.ball.vy > 0, '수직 반사로 방향 반전');
});

test('벽돌 충돌: 죽은 벽돌은 무시, 충돌 없으면 그대로', () => {
  const bricks = [
    { id: 'b-0-0', row: 0, col: 0, x: 40, y: 40, width: 20, height: 10, colorToken: '--color-brick-r1', alive: false },
  ];
  const ball = { x: 50, y: 45, vx: 0, vy: -100, radius: 6 };
  const res = resolveBrickCollisions(ball, bricks);
  assert.equal(res.hitBrick, null);
  assert.equal(res.gainedScore, 0);
});

test('목숨 소진: lives 감소, 0 이면 gameover', () => {
  const base = createInitialState({}, seededRng([0.5]));
  const playing = { ...base, status: STATES.PLAYING };
  const after1 = loseLife(playing);
  assert.equal(after1.lives, 2);
  assert.equal(after1.status, STATES.PLAYING);
  const after2 = loseLife(after1);
  const after3 = loseLife(after2);
  assert.equal(after3.lives, 0);
  assert.equal(after3.status, STATES.GAMEOVER);
});

test('벽돌 결과 반영: 점수 누적, 전부 파괴 시 cleared', () => {
  let state = createInitialState({ rows: 1, cols: 2 }, seededRng([0.5]));
  state = { ...state, status: STATES.PLAYING };
  // 첫 벽돌 파괴
  let r = resolveBrickCollisions(
    { x: state.bricks[0].x + 1, y: state.bricks[0].y + 1, vx: 0, vy: -100, radius: 6 },
    state.bricks,
  );
  state = applyBrickResult(state, r.gainedScore, r.bricks);
  assert.equal(state.score, scoreForRow(0));
  assert.equal(state.status, STATES.PLAYING, '아직 남은 벽돌 있음');
  // 두 번째(마지막) 벽돌 파괴
  const remaining = state.bricks.find((b) => b.alive);
  r = resolveBrickCollisions(
    { x: remaining.x + 1, y: remaining.y + 1, vx: 0, vy: -100, radius: 6 },
    state.bricks,
  );
  state = applyBrickResult(state, r.gainedScore, r.bricks);
  assert.equal(countAliveBricks(state.bricks), 0);
  assert.equal(state.status, STATES.CLEARED);
});

test('재시작: 점수·목숨·상태·엔티티가 초기값으로 복원', () => {
  let state = createInitialState({ rows: 3, cols: 4 }, seededRng([0.5]));
  state = { ...state, status: STATES.GAMEOVER, score: 999, lives: 0, bricks: state.bricks.map((b) => ({ ...b, alive: false })) };
  const reset = resetGame(state, seededRng([0.5]));
  assert.equal(reset.status, STATES.READY);
  assert.equal(reset.score, 0);
  assert.equal(reset.lives, 3);
  assert.equal(countAliveBricks(reset.bricks), 3 * 4);
  // 원본 config 유지
  assert.equal(reset.config.rows, 3);
  assert.equal(reset.config.cols, 4);
});

test('불변성: 함수가 입력을 변형하지 않는다', () => {
  const bricks = createBricks({ rows: 1, cols: 1 });
  const snapshot = JSON.stringify(bricks);
  resolveBrickCollisions({ x: bricks[0].x + 1, y: bricks[0].y + 1, vx: 0, vy: -100, radius: 6 }, bricks);
  assert.equal(JSON.stringify(bricks), snapshot, 'bricks 원본 불변');

  const ball = { x: 2, y: 50, vx: -10, vy: 5, radius: 8 };
  const ballSnap = JSON.stringify(ball);
  reflectWalls(ball, { width: 100, height: 200 });
  assert.equal(JSON.stringify(ball), ballSnap, 'ball 원본 불변');
});
