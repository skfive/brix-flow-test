import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STATUS,
  createGameState,
  startGame,
  pauseGame,
  resumeGame,
  update,
  countActive,
} from '../src/logic/gameLogic.js';

function makeRng(sequence) {
  let i = 0;
  return () => {
    const value = sequence[i % sequence.length];
    i += 1;
    return value;
  };
}

test('이동 경계 클램프 - 플레이어는 플레이 영역(HUD 아래)을 벗어나지 않는다', () => {
  const state = createGameState();
  startGame(state);

  for (let i = 0; i < 50; i += 1) {
    update(state, 0.1, { left: true, up: true }, () => 0.9);
  }
  assert.equal(state.player.x, 0);
  assert.equal(state.player.y, state.config.hudHeight);

  for (let i = 0; i < 50; i += 1) {
    update(state, 0.1, { right: true, down: true }, () => 0.9);
  }
  assert.equal(state.player.x, state.config.playAreaWidth - state.player.width);
  assert.equal(state.player.y, state.config.playAreaHeight - state.player.height);
});

test('발사 간격 제한 - 쿨다운 내 연속 입력은 탄환을 추가로 생성하지 않는다', () => {
  const state = createGameState();
  startGame(state);

  update(state, 0, { fire: true }, () => 0.9);
  assert.equal(countActive(state.bullets), 1);

  update(state, 0.05, { fire: true }, () => 0.9);
  assert.equal(countActive(state.bullets), 1, '쿨다운 중에는 추가 발사되지 않는다');

  update(state, state.config.fireCooldown, { fire: true }, () => 0.9);
  assert.equal(countActive(state.bullets), 2, '쿨다운 경과 후에는 재발사된다');
});

test('탄환-적 충돌 - 겹치면 탄환/적이 모두 비활성화되고 점수가 오른다', () => {
  const state = createGameState();
  startGame(state);

  const enemy = state.enemies[0];
  Object.assign(enemy, { active: true, type: 'linear', x: 100, y: 100, vy: 0, fireTimer: 999 });

  const bullet = state.bullets[0];
  Object.assign(bullet, { active: true, x: 100, y: 100, vy: 0 });

  update(state, 0, {}, () => 0.99);

  assert.equal(bullet.active, false);
  assert.equal(enemy.active, false);
  assert.equal(state.score, state.config.scorePerLinearKill);
});

test('점수 가산 - 적 종류(직진형/지그재그형)별로 다른 점수가 누적된다', () => {
  const state = createGameState();
  startGame(state);

  const linear = state.enemies[0];
  Object.assign(linear, { active: true, type: 'linear', x: 50, y: 50, vy: 0, fireTimer: 999 });
  const zigzag = state.enemies[1];
  Object.assign(zigzag, { active: true, type: 'zigzag', x: 150, y: 150, baseX: 150, vy: 0, fireTimer: 999 });

  const bulletA = state.bullets[0];
  Object.assign(bulletA, { active: true, x: 50, y: 50, vy: 0 });
  const bulletB = state.bullets[1];
  Object.assign(bulletB, { active: true, x: 150, y: 150, vy: 0 });

  update(state, 0, {}, () => 0.99);

  assert.equal(state.score, state.config.scorePerLinearKill + state.config.scorePerZigzagKill);
});

test('플레이어 피격/라이프 감소 - 적 탄환에 맞으면 라이프가 줄고 탄환은 사라진다', () => {
  const state = createGameState();
  startGame(state);
  const initialLives = state.lives;

  const enemyBullet = state.enemyBullets[0];
  Object.assign(enemyBullet, { active: true, x: state.player.x, y: state.player.y, vy: 0 });

  update(state, 0, {}, () => 0.99);

  assert.equal(state.lives, initialLives - 1);
  assert.equal(enemyBullet.active, false);
  assert.equal(state.status, STATUS.PLAYING);
});

test('플레이어 피격 - 적 몸체와 직접 충돌해도 라이프가 줄어든다', () => {
  const state = createGameState();
  startGame(state);
  const initialLives = state.lives;

  const enemy = state.enemies[0];
  Object.assign(enemy, { active: true, type: 'linear', x: state.player.x, y: state.player.y, vy: 0, fireTimer: 999 });

  update(state, 0, {}, () => 0.99);

  assert.equal(state.lives, initialLives - 1);
  assert.equal(enemy.active, false);
});

test('게임오버 판정 - 라이프가 0이 되면 상태가 gameover로 전환된다', () => {
  const state = createGameState();
  startGame(state);
  state.lives = 1;

  const enemyBullet = state.enemyBullets[0];
  Object.assign(enemyBullet, { active: true, x: state.player.x, y: state.player.y, vy: 0 });

  update(state, 0, {}, () => 0.99);

  assert.equal(state.lives, 0);
  assert.equal(state.status, STATUS.GAMEOVER);
});

test('게임오버 이후 재시작하면 점수/라이프/엔티티가 초기화되고 다시 조작 가능하다', () => {
  const state = createGameState();
  startGame(state);
  state.lives = 1;
  const enemyBullet = state.enemyBullets[0];
  Object.assign(enemyBullet, { active: true, x: state.player.x, y: state.player.y, vy: 0 });
  update(state, 0, {}, () => 0.99);
  assert.equal(state.status, STATUS.GAMEOVER);

  startGame(state);

  assert.equal(state.status, STATUS.PLAYING);
  assert.equal(state.lives, state.config.maxLives);
  assert.equal(state.score, 0);
  assert.equal(countActive(state.enemyBullets), 0);

  update(state, 0, { fire: true }, () => 0.9);
  assert.equal(countActive(state.bullets), 1, '재시작 후 발사 입력이 다시 활성화된다');
});

test('적 스폰 규칙 - rng < 0.5면 직진형이 스폰되고 위치는 rng로 결정된다', () => {
  const state = createGameState();
  startGame(state);
  assert.equal(countActive(state.enemies), 0);

  const rng = makeRng([0.2, 0.5]);
  update(state, state.config.enemySpawnInterval, {}, rng);

  assert.equal(countActive(state.enemies), 1);
  const spawned = state.enemies.find((enemy) => enemy.active);
  assert.equal(spawned.type, 'linear');
  assert.equal(spawned.x, 0.5 * (state.config.playAreaWidth - state.config.enemyWidth));
});

test('적 스폰 규칙 - rng >= 0.5면 지그재그형이 스폰된다', () => {
  const state = createGameState();
  startGame(state);

  const rng = makeRng([0.8, 0.1]);
  update(state, state.config.enemySpawnInterval, {}, rng);

  const spawned = state.enemies.find((enemy) => enemy.active);
  assert.equal(spawned.type, 'zigzag');
});

test('적 스폰 규칙 - 스폰 주기 이전에는 스폰되지 않는다', () => {
  const state = createGameState();
  startGame(state);

  update(state, state.config.enemySpawnInterval - 0.01, {}, () => 0.1);

  assert.equal(countActive(state.enemies), 0);
});

test('일시정지 상태에서는 update가 진행 상태를 변경하지 않고, 재개하면 정상 복귀한다', () => {
  const state = createGameState();
  startGame(state);
  pauseGame(state);

  const snapshotX = state.player.x;
  const snapshotScore = state.score;
  update(state, 1, { right: true, fire: true }, () => 0.1);

  assert.equal(state.player.x, snapshotX);
  assert.equal(state.score, snapshotScore);
  assert.equal(state.status, STATUS.PAUSED);

  resumeGame(state);
  assert.equal(state.status, STATUS.PLAYING);

  update(state, 0.1, { right: true }, () => 0.9);
  assert.ok(state.player.x > snapshotX, '재개 후에는 다시 이동이 반영된다');
});
