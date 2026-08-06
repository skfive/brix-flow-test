// game-logic.test.js — 순수 게임 로직 결정론적 단위 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STATUS,
  CONFIG,
  createGame,
  startGame,
  pauseGame,
  resumeGame,
  restartGame,
  step,
  checkCollision,
  pickObstacleKind,
  createObstacle,
} from '../src/game-logic.js';

// 고정 시퀀스를 반환하는 스텁 RNG
function seq(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

test('createGame은 rng 없이 호출하면 예외를 던진다', () => {
  assert.throws(() => createGame({}), /rng/);
});

test('createGame은 start 상태와 초기값으로 시작한다', () => {
  const s = createGame({ rng: () => 0.5, highScore: 42 });
  assert.equal(s.status, STATUS.START);
  assert.equal(s.score, 0);
  assert.equal(s.distance, 0);
  assert.equal(s.highScore, 42);
  assert.equal(s.speed, CONFIG.baseSpeed);
  assert.deepEqual(s.obstacles, []);
});

test('상태 전이: start→playing→paused→playing→gameover', () => {
  let s = createGame({ rng: () => 0.5 });

  // start → playing
  s = startGame(s);
  assert.equal(s.status, STATUS.PLAYING);

  // 유효하지 않은 전이는 무시
  assert.equal(resumeGame(s).status, STATUS.PLAYING);

  // playing → paused
  s = pauseGame(s);
  assert.equal(s.status, STATUS.PAUSED);
  // paused 상태에서 step은 상태를 그대로 반환
  assert.equal(step(s, 0.016, {}).status, STATUS.PAUSED);

  // paused → playing
  s = resumeGame(s);
  assert.equal(s.status, STATUS.PLAYING);

  // 강제 gameover 후 재시작 초기화 확인
  s = { ...s, status: STATUS.GAMEOVER, score: 99, distance: 990, speed: 500, highScore: 99 };
  const r = restartGame(s);
  assert.equal(r.status, STATUS.PLAYING);
  assert.equal(r.score, 0);
  assert.equal(r.distance, 0);
  assert.equal(r.speed, CONFIG.baseSpeed);
  assert.equal(r.highScore, 99, '재시작 시 highScore는 보존된다');
  assert.deepEqual(r.obstacles, []);
});

test('start가 아닌 상태에서 startGame은 무시된다', () => {
  const s = createGame({ rng: () => 0.5 });
  const playing = startGame(s);
  assert.equal(startGame(playing), playing);
});

test('충돌: ground 장애물은 점프로 회피, 미점프면 충돌', () => {
  const ground = { ...createObstacle('ground'), x: CONFIG.playerX };
  // 지면에서 달리는 중 → 충돌
  assert.equal(checkCollision({ offset: 0, action: 'run' }, ground), true);
  // 충분히 높이 점프 → 회피
  assert.equal(checkCollision({ offset: 100, action: 'jump' }, ground), false);
  // 숙여도 ground 장애물은 회피되지 않는다
  assert.equal(checkCollision({ offset: 0, action: 'duck' }, ground), true);
});

test('충돌: air 장애물은 숙이기로 회피, 서 있으면 충돌', () => {
  const air = { ...createObstacle('air'), x: CONFIG.playerX };
  // 서 있음(run) → 충돌
  assert.equal(checkCollision({ offset: 0, action: 'run' }, air), true);
  // 숙임 → 회피
  assert.equal(checkCollision({ offset: 0, action: 'duck' }, air), false);
});

test('점수와 거리는 진행에 따라 증가하고 gameover 시 highScore가 갱신된다', () => {
  let s = startGame(createGame({ rng: () => 0.5, highScore: 0 }));
  const before = s.distance;
  s = step(s, 0.1, {});
  assert.ok(s.distance > before, '거리는 증가한다');
  assert.equal(s.score, Math.floor(s.distance / CONFIG.distancePerPoint));

  // 장애물을 플레이어 위치에 강제 배치해 다음 step에서 충돌 유발
  s = {
    ...s,
    score: 50,
    distance: 500,
    highScore: 10,
    obstacles: [{ ...createObstacle('ground'), x: CONFIG.playerX }],
    player: { offset: 0, vy: 0, action: 'run' },
  };
  s = step(s, 0.016, {});
  assert.equal(s.status, STATUS.GAMEOVER);
  assert.ok(s.highScore >= 50, 'gameover 시 highScore가 현재 점수로 갱신된다');
});

test('속도는 진행에 따라 단조 증가하며 최대치를 넘지 않는다', () => {
  let s = startGame(createGame({ rng: () => 0.9 }));
  let prev = s.speed;
  for (let i = 0; i < 5; i++) {
    // 장애물이 플레이어에 닿지 않도록 매 프레임 비운다
    s = step({ ...s, obstacles: [] }, 0.1, {});
    assert.ok(s.speed >= prev, '속도는 감소하지 않는다');
    prev = s.speed;
  }
  // 매우 오래 진행해도 maxSpeed 이하
  let t = createGame({ rng: () => 0.9 });
  t = startGame(t);
  for (let i = 0; i < 2000; i++) {
    t = step({ ...t, obstacles: [] }, 0.1, {});
  }
  assert.ok(t.speed <= CONFIG.maxSpeed);
  assert.equal(t.speed, CONFIG.maxSpeed);
});

test('장애물 생성: 스텁 RNG로 종류가 결정론적으로 재현된다', () => {
  assert.equal(pickObstacleKind(0.1), 'ground');
  assert.equal(pickObstacleKind(0.9), 'air');

  // rng 첫 호출이 종류를 결정 → air 강제
  let s = startGame(createGame({ rng: seq([0.9, 0.5]) }));
  s = { ...s, spawnCountdown: 0, obstacles: [] };
  s = step(s, 0.016, {});
  assert.equal(s.obstacles.length, 1);
  assert.equal(s.obstacles[0].kind, 'air');

  // ground 강제
  let g = startGame(createGame({ rng: seq([0.2, 0.5]) }));
  g = { ...g, spawnCountdown: 0, obstacles: [] };
  g = step(g, 0.016, {});
  assert.equal(g.obstacles.length, 1);
  assert.equal(g.obstacles[0].kind, 'ground');
});

test('점프 물리: 점프 시 떠올랐다가 지면으로 복귀한다', () => {
  let s = startGame(createGame({ rng: () => 0.5 }));
  s = { ...s, obstacles: [] };
  // 점프 시작
  s = step(s, 0.016, { jump: true });
  assert.equal(s.player.action, 'jump');
  // 몇 프레임 후 공중에 떠 있음
  let peak = 0;
  for (let i = 0; i < 20; i++) {
    s = step({ ...s, obstacles: [] }, 0.016, {});
    peak = Math.max(peak, s.player.offset);
  }
  assert.ok(peak > 48, '점프 최고점은 ground 장애물 높이를 넘는다');
  // 충분히 진행하면 지면 복귀
  for (let i = 0; i < 60; i++) {
    s = step({ ...s, obstacles: [] }, 0.016, {});
  }
  assert.equal(s.player.offset, 0);
  assert.notEqual(s.player.action, 'jump');
});

test('숙이기 입력은 지면에서 duck 액션이 된다', () => {
  let s = startGame(createGame({ rng: () => 0.5 }));
  s = step({ ...s, obstacles: [] }, 0.016, { duck: true });
  assert.equal(s.player.action, 'duck');
  // 입력 해제 시 run 복귀
  s = step({ ...s, obstacles: [] }, 0.016, {});
  assert.equal(s.player.action, 'run');
});
