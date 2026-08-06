// Line Defense — 순수 게임 로직 단위 테스트 (BF-1750)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PHASES,
  DEFAULT_CONFIG,
  createInitialState,
  setPhase,
  placeTower,
  step,
  reset,
  enemyCountForWave,
  enemyHpForWave,
  pathLength,
  positionAlong,
  mulberry32,
} from '../src/game.js';

// 결정적 rng: 항상 0.5 → 스폰 지터가 spawnInterval 그대로가 되도록.
const rngHalf = () => 0.5;
// 결정적 rng: 항상 0 → 스폰 지터 최소.
const rngZero = () => 0;

test('createInitialState: planner 동결 초기값', () => {
  const s = createInitialState();
  assert.equal(s.phase, PHASES.START);
  assert.equal(s.resource, 100);
  assert.equal(s.lives, 20);
  assert.equal(s.score, 0);
  assert.equal(s.wave, 1);
  assert.deepEqual(s.towers, []);
  assert.deepEqual(s.enemies, []);
  assert.equal(s.spawnRemaining, enemyCountForWave(1));
});

test('enemyCountForWave: 5 + (N-1)*3 규칙', () => {
  assert.equal(enemyCountForWave(1), 5);
  assert.equal(enemyCountForWave(2), 8);
  assert.equal(enemyCountForWave(3), 11);
});

test('enemyHpForWave: 웨이브별 체력 증가', () => {
  assert.equal(enemyHpForWave(1, DEFAULT_CONFIG), 30);
  assert.equal(enemyHpForWave(2, DEFAULT_CONFIG), 40);
  assert.equal(enemyHpForWave(3, DEFAULT_CONFIG), 50);
});

test('pathLength / positionAlong: 경로 기하', () => {
  const path = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ];
  assert.equal(pathLength(path), 10);
  assert.deepEqual(positionAlong(path, 0), { x: 0, y: 0 });
  assert.deepEqual(positionAlong(path, 4), { x: 4, y: 0 });
  // 전체 길이 이상이면 마지막 지점.
  assert.deepEqual(positionAlong(path, 99), { x: 10, y: 0 });
});

test('setPhase: 화면 상태 전이(순수)', () => {
  const s = createInitialState();
  const p = setPhase(s, PHASES.PLAYING);
  assert.equal(p.phase, PHASES.PLAYING);
  assert.equal(s.phase, PHASES.START, '원본 불변');
});

test('placeTower: 자원 충분 시 배치·차감', () => {
  const s = createInitialState();
  const next = placeTower(s, { col: 3, row: 3 });
  assert.equal(next.towers.length, 1);
  assert.equal(next.resource, 50); // 100 - 50
  assert.equal(s.towers.length, 0, '원본 불변');
});

test('placeTower: 자원 부족 시 배치 거부(상태 불변)', () => {
  const s = createInitialState({ startResource: 40 });
  const next = placeTower(s, { col: 1, row: 1 });
  assert.equal(next, s, '동일 참조(불변)');
  assert.equal(next.towers.length, 0);
});

test('placeTower: 같은 셀 중복 배치 거부', () => {
  let s = createInitialState({ startResource: 200 });
  s = placeTower(s, { col: 2, row: 2 });
  const dup = placeTower(s, { col: 2, row: 2 });
  assert.equal(dup.towers.length, 1);
  assert.equal(dup.resource, s.resource, '중복은 자원 미차감');
});

test('step: phase 가 playing 이 아니면 상태 불변', () => {
  const s = createInitialState();
  assert.equal(step(s, 1, rngHalf), s);
});

test('step: 적이 base 도달 시 생명 감소', () => {
  // 길이 2 경로, 속도 5, dt 1 → 한 tick 에 base 도달.
  // spawnInterval 을 크게 두어 이 tick 에는 정확히 1기만 스폰되게 격리.
  let s = createInitialState({
    path: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ],
    enemySpeed: 5,
    spawnInterval: 100,
    spawnJitter: 0,
    startWave: 1,
  });
  s = setPhase(s, PHASES.PLAYING);
  const next = step(s, 1, rngHalf);
  assert.equal(next.lives, 19, '적 1기 누출 → 생명 -1');
  assert.equal(next.enemies.length, 0, 'base 도달 적 제거');
});

test('step: 생명 0 도달 시 gameover 전이', () => {
  let s = createInitialState({
    path: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ],
    enemySpeed: 5,
    startLives: 1,
  });
  s = setPhase(s, PHASES.PLAYING);
  const next = step(s, 1, rngHalf);
  assert.equal(next.lives, 0);
  assert.equal(next.phase, PHASES.GAMEOVER);
});

test('step: 타워가 적 처치 시 자원·점수 획득', () => {
  // 데미지 100 >= 체력 30 → 한 방 처치. 속도 0 으로 base 도달 방지.
  let s = createInitialState({
    path: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
    enemySpeed: 0,
    enemyBaseHp: 30,
    towerDamage: 100,
    towerRange: 3,
    towerCooldown: 1,
    startResource: 100,
  });
  s = placeTower(s, { col: 0, row: 0 }); // 자원 100 → 50
  s = setPhase(s, PHASES.PLAYING);
  const next = step(s, 0.1, rngHalf);
  assert.equal(next.enemies.length, 0, '처치되어 제거');
  assert.equal(next.resource, 60, '50 + 처치보상 10');
  assert.equal(next.score, 100, '처치 점수 100');
});

test('step: 타워는 사거리 내 가장 앞선 적을 공격', () => {
  let s = createInitialState({
    path: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
    enemySpeed: 0,
    enemyBaseHp: 50,
    towerDamage: 10,
    towerRange: 20, // 둘 다 사거리 내
    towerCooldown: 1,
  });
  // 수동으로 앞뒤 적 2기 배치.
  s = {
    ...s,
    towers: [{ col: 5, row: 0, range: 20, damage: 10, cooldown: 1, cooldownLeft: 0 }],
    enemies: [
      { id: 1, hp: 50, maxHp: 50, dist: 2 }, // 뒤
      { id: 2, hp: 50, maxHp: 50, dist: 8 }, // 앞
    ],
    spawnRemaining: 0,
    phase: PHASES.PLAYING,
  };
  const next = step(s, 0.1, rngHalf);
  const front = next.enemies.find((e) => e.id === 2);
  const back = next.enemies.find((e) => e.id === 1);
  assert.equal(front.hp, 40, '앞선 적이 피격');
  assert.equal(back.hp, 50, '뒤 적은 무피해');
});

test('step: 웨이브 전멸 시 다음 웨이브 전이 + 클리어 보너스', () => {
  // 웨이브 1 을 1기로 축소, 처치되면 wave 2 전이.
  let s = createInitialState({
    path: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
    enemySpeed: 0,
    enemyBaseHp: 10,
    towerDamage: 100,
    towerRange: 20,
    towerCooldown: 1,
  });
  s = {
    ...s,
    towers: [{ col: 0, row: 0, range: 20, damage: 100, cooldown: 1, cooldownLeft: 0 }],
    enemies: [{ id: 1, hp: 10, maxHp: 10, dist: 1 }],
    spawnRemaining: 0, // 더 스폰할 적 없음
    phase: PHASES.PLAYING,
    wave: 1,
    score: 0,
  };
  const next = step(s, 0.1, rngHalf);
  assert.equal(next.wave, 2, '다음 웨이브 전이');
  assert.equal(next.spawnRemaining, enemyCountForWave(2), '웨이브2 적 수 재설정');
  // 처치 점수 100 + 클리어 보너스 500
  assert.equal(next.score, 600);
});

test('step: 동일 seed rng 주입 시 결정적으로 재현', () => {
  const cfg = { startWave: 1 };
  const runA = () => {
    let s = setPhase(createInitialState(cfg), PHASES.PLAYING);
    const rng = mulberry32(42);
    for (let i = 0; i < 30; i += 1) s = step(s, 0.1, rng);
    return s;
  };
  const runB = () => {
    let s = setPhase(createInitialState(cfg), PHASES.PLAYING);
    const rng = mulberry32(42);
    for (let i = 0; i < 30; i += 1) s = step(s, 0.1, rng);
    return s;
  };
  assert.deepEqual(runA(), runB());
});

test('step: 서로 다른 seed 는 (지터로 인해) 스폰 타이밍이 갈릴 수 있다', () => {
  // 결정성 검증의 negative 대조: 최소한 오류 없이 진행되어야 한다.
  let a = setPhase(createInitialState(), PHASES.PLAYING);
  const rng = mulberry32(1);
  for (let i = 0; i < 5; i += 1) a = step(a, 0.2, rng);
  assert.ok(a.phase === PHASES.PLAYING || a.phase === PHASES.GAMEOVER);
});

test('reset: 초기값으로 복귀(HUD·control 재사용 가능 상태)', () => {
  let s = createInitialState();
  s = setPhase(s, PHASES.PLAYING);
  s = placeTower(s, { col: 1, row: 1 });
  s = { ...s, score: 999, lives: 3, wave: 4, resource: 5 };
  const r = reset(s);
  assert.equal(r.phase, PHASES.START);
  assert.equal(r.resource, 100);
  assert.equal(r.lives, 20);
  assert.equal(r.score, 0);
  assert.equal(r.wave, 1);
  assert.deepEqual(r.towers, []);
  assert.deepEqual(r.enemies, []);
});

test('reset: config 객체를 직접 받아도 동작', () => {
  const r = reset({ startLives: 10 });
  assert.equal(r.lives, 10);
  assert.equal(r.phase, PHASES.START);
});

test('step: 적 스폰이 spawnRemaining 을 소진', () => {
  // 스폰 간격 0.1, dt 1 → 첫 tick 에 여러 기 스폰(길이 큰 경로로 누출 방지).
  let s = createInitialState({
    path: [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
    ],
    enemySpeed: 0,
    spawnInterval: 0.1,
    spawnJitter: 0,
    startWave: 1,
  });
  s = setPhase(s, PHASES.PLAYING);
  const next = step(s, 1, rngZero);
  assert.equal(next.enemies.length + next.spawnRemaining, enemyCountForWave(1));
  assert.ok(next.enemies.length > 0, '적이 스폰됨');
});
