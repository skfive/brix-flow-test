// Space Defender — 순수 로직 단위 테스트 (BF-1718)
// 실행: node --test phaser-space-defender/tests/logic.test.js
// 렌더링·DOM 제외, src/logic.js 순수 함수만 검증(focused scope).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialState,
  transition,
  difficultyFor,
  spawnIntervalFor,
  enemySpeedFor,
  moveEnemy,
  spawnEnemy,
  moveShip,
  fireBullet,
  stepPhysics,
  detectCollisions,
  applyScore,
  resolveCollisions,
  INITIAL_LIVES,
  FIRE_COOLDOWN,
  SHIP_Y,
  SCORE_PER_KILL,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../src/logic.js';

/** 고정 시퀀스를 순차 반환하는 결정적 rng stub */
function seqRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

// --- 초기 상태 ---
test('createInitialState: 시작 목숨 3, 점수 0, 함선 중앙, start 상태', () => {
  const s = createInitialState(0);
  assert.equal(s.status, 'start');
  assert.equal(s.score, 0);
  assert.equal(s.lives, 3);
  assert.equal(s.lives, INITIAL_LIVES);
  assert.equal(s.ship.x, GAME_WIDTH / 2);
  assert.deepEqual(s.bullets, []);
  assert.deepEqual(s.enemies, []);
});

test('createInitialState: 최고 점수는 인자로 보존', () => {
  assert.equal(createInitialState(250).highScore, 250);
});

// --- 상태 전이 ---
test('transition: start -> playing', () => {
  const s = createInitialState(0);
  assert.equal(transition(s, 'start').status, 'playing');
});

test('transition: playing <-> paused 토글(진행 상태 보존)', () => {
  const playing = { ...createInitialState(0), status: 'playing', score: 40, lives: 2 };
  const paused = transition(playing, 'togglePause');
  assert.equal(paused.status, 'paused');
  assert.equal(paused.score, 40);
  assert.equal(paused.lives, 2);
  const resumed = transition(paused, 'togglePause');
  assert.equal(resumed.status, 'playing');
  assert.equal(resumed.score, 40);
});

test('transition: gameover 전이 시 최고 점수 갱신', () => {
  const s = { ...createInitialState(100), status: 'playing', score: 300 };
  const over = transition(s, 'gameover');
  assert.equal(over.status, 'gameover');
  assert.equal(over.highScore, 300);
});

test('transition: restart -> 초기값 복귀(최고 점수만 보존)', () => {
  const over = { ...createInitialState(100), status: 'gameover', score: 500, lives: 0, highScore: 500 };
  const restarted = transition(over, 'restart');
  assert.equal(restarted.status, 'start');
  assert.equal(restarted.score, 0);
  assert.equal(restarted.lives, INITIAL_LIVES);
  assert.equal(restarted.highScore, 500);
  assert.equal(restarted.ship.x, GAME_WIDTH / 2);
});

// --- 발사 연사 간격 제한 ---
test('fireBullet: 쿨다운 내 연속 발사는 무시된다', () => {
  const base = { ...createInitialState(0), status: 'playing' };
  const first = fireBullet(base, 1000);
  assert.equal(first.bullets.length, 1);
  assert.equal(first.lastFireTime, 1000);

  // 쿨다운 미만 -> 무시
  const tooSoon = fireBullet(first, 1000 + FIRE_COOLDOWN - 1);
  assert.equal(tooSoon.bullets.length, 1);

  // 쿨다운 경과 -> 발사
  const later = fireBullet(first, 1000 + FIRE_COOLDOWN);
  assert.equal(later.bullets.length, 2);
});

test('fireBullet: 탄은 함선 위치에서 생성', () => {
  const base = { ...createInitialState(0), status: 'playing', ship: { x: 123 } };
  const fired = fireBullet(base, 0);
  assert.equal(fired.bullets[0].x, 123);
  assert.equal(fired.bullets[0].y, SHIP_Y);
});

test('fireBullet: playing 아닐 때는 발사 불가', () => {
  const s = createInitialState(0); // start
  assert.equal(fireBullet(s, 5000).bullets.length, 0);
});

// --- 2종 이상 서로 다른 적 이동 패턴 ---
test('moveEnemy: straight 는 x 고정 낙하', () => {
  const e = { x: 100, y: 0, baseX: 100, pattern: 'straight' };
  const moved = moveEnemy(e, 100, 1);
  assert.equal(moved.x, 100); // x 불변
  assert.ok(moved.y > 0); // y 증가(낙하)
});

test('moveEnemy: zigzag 는 x 가 진동한다', () => {
  const e = { x: 100, y: 0, baseX: 100, pattern: 'zigzag' };
  const moved = moveEnemy(e, 100, 1);
  assert.notEqual(moved.x, 100); // x 변화
  assert.ok(moved.y > 0);
});

test('moveEnemy: 두 패턴의 이동 결과가 서로 다르다', () => {
  const straight = moveEnemy({ x: 100, y: 0, baseX: 100, pattern: 'straight' }, 200, 1);
  const zigzag = moveEnemy({ x: 100, y: 0, baseX: 100, pattern: 'zigzag' }, 200, 1);
  assert.notEqual(straight.x, zigzag.x);
});

test('spawnEnemy: rng 로 패턴/위치가 결정적', () => {
  const straight = spawnEnemy(seqRng([0.5, 0.2])); // 두 번째 <0.5 -> straight
  assert.equal(straight.pattern, 'straight');
  const zigzag = spawnEnemy(seqRng([0.5, 0.9])); // 두 번째 >=0.5 -> zigzag
  assert.equal(zigzag.pattern, 'zigzag');
});

// --- 피격 파괴 및 점수 증가 ---
test('detectCollisions: 탄이 적 명중 시 적·탄 제거', () => {
  const state = {
    ...createInitialState(0),
    status: 'playing',
    bullets: [{ x: 100, y: 200 }],
    enemies: [{ x: 100, y: 200, baseX: 100, pattern: 'straight' }],
  };
  const { bullets, enemies, hits } = detectCollisions(state);
  assert.equal(enemies.length, 0);
  assert.equal(bullets.length, 0);
  assert.equal(hits.kills, 1);
  assert.equal(hits.shipHits, 0);
});

test('applyScore: 명중 시 점수 증가, 최고 점수 갱신', () => {
  const state = { ...createInitialState(0), status: 'playing', score: 0 };
  const scored = applyScore(state, { kills: 2, shipHits: 0 });
  assert.equal(scored.score, 2 * SCORE_PER_KILL);
  assert.equal(scored.highScore, 2 * SCORE_PER_KILL);
});

test('resolveCollisions: 명중으로 점수 증가 + 적 제거', () => {
  const state = {
    ...createInitialState(0),
    status: 'playing',
    bullets: [{ x: 50, y: 100 }],
    enemies: [{ x: 50, y: 100, baseX: 50, pattern: 'straight' }],
  };
  const next = resolveCollisions(state);
  assert.equal(next.enemies.length, 0);
  assert.equal(next.score, SCORE_PER_KILL);
});

// --- 피격 목숨 감소 ---
test('detectCollisions: 적이 함선에 닿으면 목숨 차감 집계', () => {
  const state = {
    ...createInitialState(0),
    status: 'playing',
    ship: { x: 200 },
    enemies: [{ x: 200, y: SHIP_Y, baseX: 200, pattern: 'straight' }],
  };
  const { hits } = detectCollisions(state);
  assert.equal(hits.shipHits, 1);
});

test('detectCollisions: 적이 화면 하단 이탈 시에도 목숨 차감', () => {
  const state = {
    ...createInitialState(0),
    status: 'playing',
    enemies: [{ x: 10, y: GAME_HEIGHT + 5, baseX: 10, pattern: 'straight' }],
  };
  assert.equal(detectCollisions(state).hits.shipHits, 1);
});

test('applyScore: 피격 시 목숨 감소', () => {
  const state = { ...createInitialState(0), status: 'playing', lives: 3 };
  assert.equal(applyScore(state, { kills: 0, shipHits: 1 }).lives, 2);
});

// --- 목숨 0 게임 오버 (시작 3) ---
test('applyScore: 목숨 0 이 되면 gameover 로 전이', () => {
  const state = { ...createInitialState(0), status: 'playing', lives: 1 };
  const next = applyScore(state, { kills: 0, shipHits: 1 });
  assert.equal(next.lives, 0);
  assert.equal(next.status, 'gameover');
});

test('applyScore: 목숨은 0 미만으로 내려가지 않는다', () => {
  const state = { ...createInitialState(0), status: 'playing', lives: 1 };
  const next = applyScore(state, { kills: 0, shipHits: 3 });
  assert.equal(next.lives, 0);
  assert.equal(next.status, 'gameover');
});

// --- 시간 경과 난도 상승 규칙 ---
test('difficultyFor: 시간 경과에 따라 난도 상승', () => {
  assert.equal(difficultyFor(0), 1);
  assert.equal(difficultyFor(9999), 1);
  assert.equal(difficultyFor(10000), 2);
  assert.equal(difficultyFor(25000), 3);
});

test('spawnIntervalFor: 난도가 오를수록 스폰 간격 단축(하한 존재)', () => {
  assert.ok(spawnIntervalFor(2) < spawnIntervalFor(1));
  assert.ok(spawnIntervalFor(100) >= 350);
});

test('enemySpeedFor: 난도가 오를수록 적 속도 증가', () => {
  assert.ok(enemySpeedFor(2) > enemySpeedFor(1));
});

test('stepPhysics: 경과 시간에 따라 난도가 갱신된다', () => {
  const state = { ...createInitialState(0), status: 'playing', elapsed: 9950 };
  const next = stepPhysics(state, 100, seqRng([0.5, 0.5]));
  assert.equal(next.elapsed, 10050);
  assert.equal(next.difficulty, 2);
});

// --- stepPhysics: 이동/스폰 ---
test('stepPhysics: 탄은 위로 이동한다', () => {
  const state = {
    ...createInitialState(0),
    status: 'playing',
    bullets: [{ x: 10, y: 300 }],
  };
  const next = stepPhysics(state, 100, seqRng([0.5, 0.5]));
  assert.ok(next.bullets[0].y < 300);
});

test('stepPhysics: 스폰 간격 도달 시 rng 로 적을 생성', () => {
  const state = { ...createInitialState(0), status: 'playing', spawnTimer: 1190 };
  const next = stepPhysics(state, 100, seqRng([0.25, 0.1])); // straight at x=100
  assert.equal(next.enemies.length, 1);
  assert.equal(next.enemies[0].pattern, 'straight');
  assert.equal(next.enemies[0].y, 0);
});

test('stepPhysics: playing 이 아니면 상태 불변', () => {
  const paused = { ...createInitialState(0), status: 'paused', bullets: [{ x: 1, y: 100 }] };
  assert.deepEqual(stepPhysics(paused, 100, seqRng([0.5])), paused);
});

// --- moveShip ---
test('moveShip: 좌우 이동 및 경계 클램프', () => {
  const state = { ...createInitialState(0), status: 'playing', ship: { x: 200 } };
  assert.ok(moveShip(state, 1, 100).ship.x > 200);
  assert.ok(moveShip(state, -1, 100).ship.x < 200);

  const atRight = { ...state, ship: { x: GAME_WIDTH } };
  assert.equal(moveShip(atRight, 1, 100).ship.x, GAME_WIDTH); // 오른쪽 경계
  const atLeft = { ...state, ship: { x: 0 } };
  assert.equal(moveShip(atLeft, -1, 100).ship.x, 0); // 왼쪽 경계
});

test('moveShip: playing 아니면 이동 불가', () => {
  const s = createInitialState(0);
  assert.equal(moveShip(s, 1, 100).ship.x, GAME_WIDTH / 2);
});
