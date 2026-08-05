// pixi-breakout/tests/game-logic.test.js
//
// game-logic.js 순수 함수에 대한 결정적 단위 테스트.
// PixiJS/DOM에 의존하지 않으며 node:test + node:assert만 사용한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  createBrick,
  createBall,
  startGame,
  togglePause,
  restartGame,
  update,
} from '../src/game-logic.js';

const BOARD = { width: 800, height: 600 };

test('벽 반사: 좌측 벽 충돌 시 vx 부호가 반전되고 위치가 클램프된다', () => {
  const state = createInitialState({
    board: BOARD,
    status: 'playing',
    ball: { x: 10, y: 300, vx: -100, vy: 50, radius: 8 },
    bricks: [],
  });

  const next = update(state, 0.1);

  assert.ok(next.ball.vx > 0, 'left wall 충돌 후 vx는 양수여야 한다');
  assert.ok(next.ball.x >= next.ball.radius, '공은 벽 안쪽으로 클램프되어야 한다');
});

test('벽 반사: 우측 벽 충돌 시 vx 부호가 반전된다', () => {
  const state = createInitialState({
    board: BOARD,
    status: 'playing',
    ball: { x: BOARD.width - 10, y: 300, vx: 100, vy: 50, radius: 8 },
    bricks: [],
  });

  const next = update(state, 0.1);

  assert.ok(next.ball.vx < 0, 'right wall 충돌 후 vx는 음수여야 한다');
  assert.ok(next.ball.x <= BOARD.width - next.ball.radius);
});

test('벽 반사: 상단 벽 충돌 시 vy 부호가 반전된다', () => {
  const state = createInitialState({
    board: BOARD,
    status: 'playing',
    ball: { x: 400, y: 5, vx: 0, vy: -50, radius: 8 },
    bricks: [],
  });

  const next = update(state, 0.1);

  assert.ok(next.ball.vy > 0, '천장 충돌 후 vy는 양수(아래로)여야 한다');
});

test('패들 반사각: 패들 중앙에 맞으면 거의 수직으로 튕긴다', () => {
  const paddle = { x: 350, y: 560, width: 100, height: 14, speed: 300 };
  const paddleCenterX = paddle.x + paddle.width / 2;
  const state = createInitialState({
    board: BOARD,
    status: 'playing',
    paddle,
    ball: { x: paddleCenterX, y: paddle.y - 10, vx: 0, vy: 10, radius: 8 },
    bricks: [],
  });

  const next = update(state, 1);

  assert.ok(Math.abs(next.ball.vx) < 1e-9, '중앙 히트는 수평 속도가 거의 0이어야 한다');
  assert.ok(next.ball.vy < 0, '패들에 튕긴 뒤 vy는 음수(위로)여야 한다');
});

test('패들 반사각: 패들 좌측 끝에 맞으면 왼쪽으로 튕긴다', () => {
  const paddle = { x: 350, y: 560, width: 100, height: 14, speed: 300 };
  const state = createInitialState({
    board: BOARD,
    status: 'playing',
    paddle,
    ball: { x: paddle.x + 5, y: paddle.y - 10, vx: 0, vy: 10, radius: 8 },
    bricks: [],
  });

  const next = update(state, 1);

  assert.ok(next.ball.vx < 0, '좌측 끝 히트는 왼쪽(음수 vx)으로 튕겨야 한다');
  assert.ok(next.ball.vy < 0);
});

test('패들 반사각: 패들 우측 끝에 맞으면 오른쪽으로 튕긴다', () => {
  const paddle = { x: 350, y: 560, width: 100, height: 14, speed: 300 };
  const state = createInitialState({
    board: BOARD,
    status: 'playing',
    paddle,
    ball: { x: paddle.x + paddle.width - 5, y: paddle.y - 10, vx: 0, vy: 10, radius: 8 },
    bricks: [],
  });

  const next = update(state, 1);

  assert.ok(next.ball.vx > 0, '우측 끝 히트는 오른쪽(양수 vx)으로 튕겨야 한다');
  assert.ok(next.ball.vy < 0);
});

test('벽돌 내구도 감소: tier2(hits=2) 벽돌에 맞으면 hits가 줄고 아직 살아있다', () => {
  const brick = createBrick({ id: 'b1', tier: 2, x: 100, y: 100, width: 60, height: 20 });
  const state = createInitialState({
    board: BOARD,
    status: 'playing',
    ball: { x: 130, y: 110, vx: 0, vy: -10, radius: 8 },
    bricks: [brick],
  });

  const next = update(state, 0.001);
  const updatedBrick = next.bricks.find((b) => b.id === 'b1');

  assert.equal(updatedBrick.hits, 1);
  assert.equal(updatedBrick.alive, true);
  assert.equal(next.score, 0, '완전히 파괴되지 않으면 점수가 오르지 않는다');
});

test('벽돌 제거: 마지막 hits가 0이 되면 제거되고 점수가 가산된다', () => {
  const brick = createBrick({ id: 'b1', tier: 2, hits: 1, x: 100, y: 100, width: 60, height: 20 });
  const state = createInitialState({
    board: BOARD,
    status: 'playing',
    score: 5,
    ball: { x: 130, y: 110, vx: 0, vy: -10, radius: 8 },
    bricks: [brick],
  });

  const next = update(state, 0.001);
  const updatedBrick = next.bricks.find((b) => b.id === 'b1');

  assert.equal(updatedBrick.alive, false);
  assert.equal(updatedBrick.hits, 0);
  assert.equal(next.score, 5 + brick.score);
});

test('라이프 감소: 공을 놓치면 lives가 줄고 공/패들이 재설정된다', () => {
  const paddle = { x: 0, y: 560, width: 100, height: 14, speed: 300 };
  const state = createInitialState({
    board: BOARD,
    status: 'playing',
    lives: 3,
    score: 42,
    paddle,
    ball: { x: 700, y: BOARD.height - 5, vx: 0, vy: 50, radius: 8 },
    bricks: [],
  });

  const next = update(state, 1);

  assert.equal(next.status, 'playing', '라이프가 남아있으면 playing 상태를 유지한다');
  assert.equal(next.lives, 2);
  assert.equal(next.score, 42, '라이프 손실이 점수를 바꾸지 않는다');
  assert.ok(next.ball.y < BOARD.height, '공은 재설정되어 보드 안쪽에 있어야 한다');
});

test('게임 오버 판정: 마지막 라이프를 잃으면 game-over 상태가 된다', () => {
  const paddle = { x: 0, y: 560, width: 100, height: 14, speed: 300 };
  const state = createInitialState({
    board: BOARD,
    status: 'playing',
    lives: 1,
    score: 10,
    paddle,
    ball: { x: 700, y: BOARD.height - 5, vx: 0, vy: 50, radius: 8 },
    bricks: [],
  });

  const next = update(state, 1);

  assert.equal(next.status, 'game-over');
  assert.equal(next.lives, 0);
});

test('클리어 판정: 마지막 벽돌이 파괴되면 clear 상태로 전이된다', () => {
  const brick = createBrick({ id: 'last', tier: 1, hits: 1, x: 100, y: 100, width: 60, height: 20 });
  const state = createInitialState({
    board: BOARD,
    status: 'playing',
    score: 0,
    ball: { x: 130, y: 110, vx: 0, vy: -10, radius: 8 },
    bricks: [brick],
  });

  const next = update(state, 0.001);

  assert.equal(next.status, 'clear');
  assert.equal(next.bricks.every((b) => !b.alive), true);
});

test('일시정지/재개: paused 동안 update가 공/패들/점수를 변경하지 않는다', () => {
  const playing = createInitialState({
    board: BOARD,
    status: 'playing',
    score: 77,
    ball: { x: 400, y: 300, vx: 20, vy: 20, radius: 8 },
    bricks: [],
  });

  const paused = togglePause(playing);
  assert.equal(paused.status, 'paused');

  const afterUpdate = update(paused, 1);
  assert.deepEqual(afterUpdate.ball, paused.ball, 'paused 동안 공 위치가 보존되어야 한다');
  assert.deepEqual(afterUpdate.paddle, paused.paddle, 'paused 동안 패들 위치가 보존되어야 한다');
  assert.equal(afterUpdate.score, paused.score);

  const resumed = togglePause(afterUpdate);
  assert.equal(resumed.status, 'playing');
  assert.deepEqual(resumed.ball, playing.ball, '재개 시 공 위치가 정확히 복원되어야 한다');
  assert.deepEqual(resumed.paddle, playing.paddle, '재개 시 패들 위치가 정확히 복원되어야 한다');
  assert.equal(resumed.score, playing.score, '재개 시 점수가 정확히 복원되어야 한다');
});

test('재시작: game-over 이후 restartGame은 점수/라이프/보드를 초기값으로 되돌린다', () => {
  const brick = createBrick({ id: 'b1', tier: 1, hits: 0, alive: false, x: 0, y: 0 });
  const gameOverState = createInitialState({
    board: BOARD,
    status: 'game-over',
    score: 120,
    bestScore: 120,
    lives: 0,
    ball: { x: 999, y: 999, vx: 5, vy: 5, radius: 8 },
    bricks: [brick],
  });

  const restarted = restartGame(gameOverState);

  assert.equal(restarted.status, 'start');
  assert.equal(restarted.score, 0);
  assert.equal(restarted.lives, 3);
  assert.equal(restarted.bestScore, 120, 'bestScore는 재시작 후에도 보존되어야 한다');
  assert.ok(restarted.bricks.length > 0, '기본 벽돌 배치로 복원되어야 한다');
  assert.equal(restarted.bricks.every((b) => b.alive), true, '모든 벽돌이 다시 살아있어야 한다');

  const freshBall = createBall(restarted.board, restarted.paddle);
  assert.deepEqual(restarted.ball, freshBall, '공 위치가 초기 위치로 복원되어야 한다');
});

test('상태 전이: start에서 startGame 호출 시 playing으로 전이된다', () => {
  const state = createInitialState({ board: BOARD });
  assert.equal(state.status, 'start');

  const next = startGame(state);
  assert.equal(next.status, 'playing');

  const noop = startGame(next);
  assert.equal(noop.status, 'playing', 'playing 상태에서 startGame은 아무 효과가 없다');
});
