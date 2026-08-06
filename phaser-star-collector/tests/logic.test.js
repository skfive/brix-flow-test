// Star Collector 순수 로직 결정적 단위 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STATES,
  STATUS_TEXT,
  WORLD,
  collides,
  buildPlatforms,
  createPlayer,
  createInitialState,
  spawnWave,
  stepPlayer,
  stepHazards,
  stepGame,
  startGame,
  pauseGame,
  resumeGame,
  restartGame,
} from '../src/logic.js';

/** 고정 시퀀스를 반환하는 결정적 rng (순환) */
function seededRng(sequence) {
  let i = 0;
  return () => {
    const v = sequence[i % sequence.length];
    i += 1;
    return v;
  };
}

test('createInitialState: start 상태·점수 0·엔티티 없음', () => {
  const s = createInitialState();
  assert.equal(s.status, STATES.START);
  assert.equal(s.score, 0);
  assert.equal(s.stars.length, 0);
  assert.equal(s.hazards.length, 0);
  assert.ok(s.player.grounded);
});

test('buildPlatforms: 서로 다른 높이 플랫폼 최소 4개(+바닥)', () => {
  const platforms = buildPlatforms();
  const elevated = platforms.filter((p) => !p.isGround);
  assert.ok(elevated.length >= 4, '고지대 플랫폼 4개 이상');
  const distinctHeights = new Set(elevated.map((p) => p.y));
  assert.ok(distinctHeights.size >= 4, '서로 다른 높이 4개 이상');
  assert.ok(platforms.some((p) => p.isGround), '바닥 존재');
});

test('STATUS_TEXT: 모든 상태에 화면 텍스트 존재', () => {
  for (const key of Object.values(STATES)) {
    assert.equal(typeof STATUS_TEXT[key], 'string');
    assert.ok(STATUS_TEXT[key].length > 0);
  }
});

test('collides: AABB 겹침/비겹침 판정', () => {
  const a = { x: 0, y: 0, width: 10, height: 10 };
  assert.ok(collides(a, { x: 5, y: 5, width: 10, height: 10 }));
  assert.ok(!collides(a, { x: 20, y: 0, width: 10, height: 10 }));
});

test('stepPlayer: 좌우 이동으로 x가 변한다', () => {
  const p = createPlayer();
  const right = stepPlayer(p, { right: true }, buildPlatforms());
  assert.equal(right.x, p.x + WORLD.MOVE_SPEED);
  const left = stepPlayer(p, { left: true }, buildPlatforms());
  assert.equal(left.x, p.x - WORLD.MOVE_SPEED);
});

test('stepPlayer: 중력으로 공중 플레이어가 낙하한다(vy 증가)', () => {
  const airborne = {
    ...createPlayer(),
    y: 100,
    vy: 0,
    grounded: false,
  };
  const next = stepPlayer(airborne, {}, buildPlatforms());
  assert.equal(next.vy, WORLD.GRAVITY);
  assert.ok(next.y > 100, '아래로 이동');
});

test('stepPlayer: 접지 상태에서만 점프 가능, 공중 2단 점프 불가', () => {
  const grounded = createPlayer();
  const jumped = stepPlayer(grounded, { jump: true }, buildPlatforms());
  assert.equal(jumped.vy, WORLD.JUMP_VELOCITY + WORLD.GRAVITY);
  assert.equal(jumped.grounded, false);

  // 공중에서 다시 점프 시도 → 점프 속도로 리셋되지 않고 중력만 누적
  const doubleJump = stepPlayer(jumped, { jump: true }, buildPlatforms());
  assert.equal(doubleJump.vy, jumped.vy + WORLD.GRAVITY);
  assert.notEqual(doubleJump.vy, WORLD.JUMP_VELOCITY + WORLD.GRAVITY);
});

test('stepPlayer: 낙하 중 플랫폼 윗면에 접지한다', () => {
  const platforms = buildPlatforms();
  const p1 = platforms.find((p) => p.y === 460);
  const falling = {
    ...createPlayer(),
    x: p1.x + 10,
    y: 420,
    vy: 30,
    grounded: false,
  };
  const landed = stepPlayer(falling, {}, platforms);
  assert.equal(landed.grounded, true);
  assert.equal(landed.y, p1.y - WORLD.PLAYER_SIZE);
  assert.equal(landed.vy, 0);
});

test('stepHazards: 경계에서 방향 반전, 내부에서는 그대로 이동', () => {
  const [moved] = stepHazards([
    { x: 100, y: 0, width: 28, height: 28, vx: 3, minX: 0, maxX: 772 },
  ]);
  assert.equal(moved.x, 103);
  assert.equal(moved.vx, 3);

  const [bounced] = stepHazards([
    { x: 771, y: 0, width: 28, height: 28, vx: 3, minX: 0, maxX: 772 },
  ]);
  assert.equal(bounced.x, 772);
  assert.equal(bounced.vx, -3);
});

test('startGame: start → playing, 첫 웨이브 생성, 점수 0', () => {
  const rng = seededRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
  const started = startGame(createInitialState(), rng);
  assert.equal(started.status, STATES.PLAYING);
  assert.equal(started.score, 0);
  assert.equal(started.wave, 1);
  assert.ok(started.stars.length > 0);
  assert.ok(started.hazards.length > 0);
});

test('spawnWave: 동일 rng 시퀀스는 동일 웨이브를 결정적으로 생성', () => {
  const platforms = buildPlatforms();
  const a = spawnWave(platforms, seededRng([0.1, 0.5, 0.9, 0.3]));
  const b = spawnWave(platforms, seededRng([0.1, 0.5, 0.9, 0.3]));
  assert.deepEqual(a, b);
  assert.ok(a.stars.every((s) => s.collected === false));
});

test('stepGame: 별 수집 시 점수 증가, 충돌한 별만 collected', () => {
  const base = createInitialState();
  const player = { ...createPlayer() }; // 바닥 접지, y=530
  const collectible = {
    x: player.x,
    y: player.y + 5,
    width: WORLD.STAR_SIZE,
    height: WORLD.STAR_SIZE,
    collected: false,
  };
  const faraway = {
    x: 10,
    y: 10,
    width: WORLD.STAR_SIZE,
    height: WORLD.STAR_SIZE,
    collected: false,
  };
  const state = {
    ...base,
    status: STATES.PLAYING,
    player,
    stars: [collectible, faraway],
    hazards: [],
  };
  const next = stepGame(state, {}, seededRng([0.1]));
  assert.equal(next.score, 1);
  assert.equal(next.stars[0].collected, true);
  assert.equal(next.stars[1].collected, false);
  assert.ok(next.score >= 0);
});

test('stepGame: 모든 별 수집 시 다음 웨이브 재생성(wave 증가·새 별)', () => {
  const base = createInitialState();
  const player = { ...createPlayer() };
  const onlyStar = {
    x: player.x,
    y: player.y + 5,
    width: WORLD.STAR_SIZE,
    height: WORLD.STAR_SIZE,
    collected: false,
  };
  const state = {
    ...base,
    status: STATES.PLAYING,
    wave: 1,
    player,
    stars: [onlyStar],
    hazards: [],
  };
  const next = stepGame(state, {}, seededRng([0.2, 0.4, 0.6, 0.8, 0.1, 0.3, 0.5, 0.7]));
  assert.equal(next.wave, 2);
  assert.ok(next.stars.length > 0);
  assert.ok(next.stars.every((s) => s.collected === false), '새 웨이브 별은 미수집');
});

test('stepGame: 장애물 접촉 시 gameover로 전이', () => {
  const base = createInitialState();
  const player = { ...createPlayer() };
  const hazard = {
    x: player.x,
    y: player.y + 2,
    width: WORLD.HAZARD_SIZE,
    height: WORLD.HAZARD_SIZE,
    vx: 0,
    minX: 0,
    maxX: WORLD.WIDTH - WORLD.HAZARD_SIZE,
  };
  const state = {
    ...base,
    status: STATES.PLAYING,
    player,
    stars: [],
    hazards: [hazard],
  };
  const next = stepGame(state, {}, seededRng([0.1]));
  assert.equal(next.status, STATES.GAMEOVER);
});

test('stepGame: 별·장애물 동시 충돌 시 gameover 우선(점수 미증가)', () => {
  const base = createInitialState();
  const player = { ...createPlayer() };
  const star = {
    x: player.x,
    y: player.y + 2,
    width: WORLD.STAR_SIZE,
    height: WORLD.STAR_SIZE,
    collected: false,
  };
  const hazard = {
    x: player.x,
    y: player.y + 2,
    width: WORLD.HAZARD_SIZE,
    height: WORLD.HAZARD_SIZE,
    vx: 0,
    minX: 0,
    maxX: WORLD.WIDTH - WORLD.HAZARD_SIZE,
  };
  const state = {
    ...base,
    status: STATES.PLAYING,
    player,
    stars: [star],
    hazards: [hazard],
  };
  const next = stepGame(state, {}, seededRng([0.1]));
  assert.equal(next.status, STATES.GAMEOVER);
  assert.equal(next.score, 0);
});

test('pause/resume: paused 중 입력은 진행에 영향 없음', () => {
  const base = createInitialState();
  const playing = { ...base, status: STATES.PLAYING, player: createPlayer() };
  const paused = pauseGame(playing);
  assert.equal(paused.status, STATES.PAUSED);

  const afterInput = stepGame(paused, { jump: true, right: true }, seededRng([0.1]));
  assert.deepEqual(afterInput, paused, 'paused는 stepGame no-op');

  const resumed = resumeGame(paused);
  assert.equal(resumed.status, STATES.PLAYING);
});

test('restartGame: gameover → start, 점수 0 복원·엔티티 초기화', () => {
  const dirty = {
    ...createInitialState(),
    status: STATES.GAMEOVER,
    score: 42,
    wave: 5,
    stars: [{ x: 1, y: 1, width: 10, height: 10, collected: true }],
    hazards: [{ x: 1, y: 1, width: 10, height: 10, vx: 3 }],
  };
  const reset = restartGame(dirty);
  assert.equal(reset.status, STATES.START);
  assert.equal(reset.score, 0);
  assert.equal(reset.stars.length, 0);
  assert.equal(reset.hazards.length, 0);
  assert.ok(reset.player.grounded);
});

test('stepGame: start/gameover 상태에서는 진행하지 않는다', () => {
  const start = createInitialState();
  assert.deepEqual(stepGame(start, { right: true }, seededRng([0.1])), start);
  const over = { ...start, status: STATES.GAMEOVER };
  assert.deepEqual(stepGame(over, { right: true }, seededRng([0.1])), over);
});
