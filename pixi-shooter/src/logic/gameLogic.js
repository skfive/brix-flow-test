// pixi-shooter 순수 게임 로직 모듈.
// PixiJS/DOM을 import하지 않는다 — renderer.js/main.js가 이 모듈의 상태를 소비만 한다.
// 무작위 요소(스폰 위치/패턴)는 인자로 주입되는 rng()(0 이상 1 미만 실수 반환)를 사용해 결정적으로 테스트 가능하다.

export const STATUS = Object.freeze({
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
});

export const DEFAULT_CONFIG = Object.freeze({
  playAreaWidth: 360,
  playAreaHeight: 640,
  hudHeight: 64,

  maxLives: 3,

  playerWidth: 28,
  playerHeight: 28,
  playerSpeed: 220,

  fireCooldown: 0.25,
  bulletWidth: 4,
  bulletHeight: 12,
  bulletSpeed: 480,
  bulletPoolSize: 24,

  enemyWidth: 26,
  enemyHeight: 26,
  enemySpeed: 90,
  enemySpawnInterval: 1.2,
  enemyPoolSize: 16,
  enemyZigzagAmplitude: 60,
  enemyZigzagFrequency: 2.4,
  enemyFireInterval: 1.6,

  enemyBulletWidth: 4,
  enemyBulletHeight: 12,
  enemyBulletSpeed: 200,
  enemyBulletPoolSize: 16,

  explosionDuration: 0.25, // design.md §6 폭발(explosion) 모션 지속시간(250ms)과 일치
  explosionPoolSize: 12,

  scorePerLinearKill: 10,
  scorePerZigzagKill: 20,
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function createPool(size, factory) {
  return Array.from({ length: size }, factory);
}

function getInactive(pool) {
  for (const item of pool) {
    if (!item.active) return item;
  }
  return null;
}

function deactivateAll(pool) {
  for (const item of pool) item.active = false;
}

function makePlayer(config) {
  return {
    x: (config.playAreaWidth - config.playerWidth) / 2,
    y: config.playAreaHeight - config.playerHeight - 16,
    width: config.playerWidth,
    height: config.playerHeight,
  };
}

/**
 * 초기 게임 상태를 생성한다.
 * @param {object} [overrides]
 * @param {Partial<typeof DEFAULT_CONFIG>} [overrides.config]
 * @param {number} [overrides.bestScore] localStorage 등에서 불러온 최고 점수
 */
export function createGameState(overrides = {}) {
  const config = { ...DEFAULT_CONFIG, ...(overrides.config || {}) };

  return {
    status: STATUS.READY,
    config,
    score: 0,
    bestScore: overrides.bestScore || 0,
    lives: config.maxLives,
    fireCooldownTimer: 0,
    spawnTimer: config.enemySpawnInterval,
    player: makePlayer(config),
    bullets: createPool(config.bulletPoolSize, () => ({
      active: false,
      x: 0,
      y: 0,
      vy: 0,
      width: config.bulletWidth,
      height: config.bulletHeight,
    })),
    enemies: createPool(config.enemyPoolSize, () => ({
      active: false,
      x: 0,
      y: 0,
      baseX: 0,
      vy: 0,
      phase: 0,
      type: 'linear',
      fireTimer: 0,
      width: config.enemyWidth,
      height: config.enemyHeight,
    })),
    enemyBullets: createPool(config.enemyBulletPoolSize, () => ({
      active: false,
      x: 0,
      y: 0,
      vy: 0,
      width: config.enemyBulletWidth,
      height: config.enemyBulletHeight,
    })),
    explosions: createPool(config.explosionPoolSize, () => ({
      active: false,
      x: 0,
      y: 0,
      timer: 0,
      duration: config.explosionDuration,
    })),
  };
}

function resetRun(state) {
  const { config } = state;
  state.score = 0;
  state.lives = config.maxLives;
  state.fireCooldownTimer = 0;
  state.spawnTimer = config.enemySpawnInterval;
  Object.assign(state.player, makePlayer(config));
  deactivateAll(state.bullets);
  deactivateAll(state.enemies);
  deactivateAll(state.enemyBullets);
  deactivateAll(state.explosions);
}

/** ready/gameover 상태에서 (재)시작한다. 점수/라이프/엔티티가 초기화된다. */
export function startGame(state) {
  resetRun(state);
  state.status = STATUS.PLAYING;
  return state;
}

export function pauseGame(state) {
  if (state.status === STATUS.PLAYING) state.status = STATUS.PAUSED;
  return state;
}

export function resumeGame(state) {
  if (state.status === STATUS.PAUSED) state.status = STATUS.PLAYING;
  return state;
}

function updatePlayerMovement(state, dt, input) {
  const { config, player } = state;
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  player.x = clamp(player.x + dx * config.playerSpeed * dt, 0, config.playAreaWidth - player.width);
  player.y = clamp(
    player.y + dy * config.playerSpeed * dt,
    config.hudHeight,
    config.playAreaHeight - player.height
  );
}

function updateFiring(state, dt, input) {
  state.fireCooldownTimer = Math.max(0, state.fireCooldownTimer - dt);
  if (input.fire && state.fireCooldownTimer <= 0) {
    const bullet = getInactive(state.bullets);
    if (bullet) {
      bullet.active = true;
      bullet.x = state.player.x + state.player.width / 2 - bullet.width / 2;
      bullet.y = state.player.y - bullet.height;
      bullet.vy = -state.config.bulletSpeed;
    }
    state.fireCooldownTimer = state.config.fireCooldown;
  }
}

function spawnEnemy(state, rng) {
  const enemy = getInactive(state.enemies);
  if (!enemy) return null;
  const { config } = state;

  const typeRoll = rng();
  const type = typeRoll < 0.5 ? 'linear' : 'zigzag';
  const xRoll = rng();
  const x = xRoll * (config.playAreaWidth - config.enemyWidth);

  enemy.active = true;
  enemy.type = type;
  enemy.x = x;
  enemy.baseX = x;
  enemy.y = -config.enemyHeight;
  enemy.vy = config.enemySpeed;
  enemy.phase = 0;
  enemy.fireTimer = config.enemyFireInterval;
  return enemy;
}

function updateSpawning(state, dt, rng) {
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEnemy(state, rng);
    state.spawnTimer += state.config.enemySpawnInterval;
  }
}

function updateBullets(state, dt) {
  const { config } = state;
  for (const bullet of state.bullets) {
    if (!bullet.active) continue;
    bullet.y += bullet.vy * dt;
    if (bullet.y + bullet.height < 0 || bullet.y > config.playAreaHeight) {
      bullet.active = false;
    }
  }
}

function fireEnemyBullet(state, enemy) {
  const bullet = getInactive(state.enemyBullets);
  if (!bullet) return;
  bullet.active = true;
  bullet.x = enemy.x + enemy.width / 2 - bullet.width / 2;
  bullet.y = enemy.y + enemy.height;
  bullet.vy = state.config.enemyBulletSpeed;
}

function updateEnemies(state, dt) {
  const { config } = state;
  for (const enemy of state.enemies) {
    if (!enemy.active) continue;

    enemy.y += enemy.vy * dt;
    if (enemy.type === 'zigzag') {
      enemy.phase += dt;
      enemy.x = enemy.baseX + Math.sin(enemy.phase * config.enemyZigzagFrequency) * config.enemyZigzagAmplitude;
    }

    enemy.fireTimer -= dt;
    if (enemy.fireTimer <= 0) {
      fireEnemyBullet(state, enemy);
      enemy.fireTimer += config.enemyFireInterval;
    }

    if (enemy.y > config.playAreaHeight) enemy.active = false;
  }
}

function updateEnemyBullets(state, dt) {
  const { config } = state;
  for (const bullet of state.enemyBullets) {
    if (!bullet.active) continue;
    bullet.y += bullet.vy * dt;
    if (bullet.y > config.playAreaHeight || bullet.y + bullet.height < 0) {
      bullet.active = false;
    }
  }
}

function updateExplosions(state, dt) {
  for (const explosion of state.explosions) {
    if (!explosion.active) continue;
    explosion.timer -= dt;
    if (explosion.timer <= 0) explosion.active = false;
  }
}

function spawnExplosion(state, x, y) {
  const explosion = getInactive(state.explosions);
  if (!explosion) return;
  explosion.active = true;
  explosion.x = x;
  explosion.y = y;
  explosion.timer = state.config.explosionDuration;
}

function addScore(state, amount) {
  state.score += amount;
  if (state.score > state.bestScore) state.bestScore = state.score;
}

function applyPlayerDamage(state) {
  if (state.status !== STATUS.PLAYING) return;
  state.lives = Math.max(0, state.lives - 1);
  if (state.lives <= 0) {
    state.status = STATUS.GAMEOVER;
  }
}

function resolveCollisions(state) {
  // 플레이어 탄환 vs 적
  for (const bullet of state.bullets) {
    if (!bullet.active) continue;
    for (const enemy of state.enemies) {
      if (!enemy.active) continue;
      if (rectsOverlap(bullet, enemy)) {
        bullet.active = false;
        enemy.active = false;
        spawnExplosion(state, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        addScore(state, enemy.type === 'zigzag' ? state.config.scorePerZigzagKill : state.config.scorePerLinearKill);
        break;
      }
    }
  }

  // 적 탄환 vs 플레이어
  for (const bullet of state.enemyBullets) {
    if (!bullet.active) continue;
    if (rectsOverlap(bullet, state.player)) {
      bullet.active = false;
      applyPlayerDamage(state);
    }
  }

  // 적 몸체 vs 플레이어(직접 충돌)
  for (const enemy of state.enemies) {
    if (!enemy.active) continue;
    if (rectsOverlap(enemy, state.player)) {
      enemy.active = false;
      applyPlayerDamage(state);
    }
  }
}

/**
 * 1프레임 분량의 게임 로직을 진행한다. status가 playing이 아니면 아무 것도 하지 않는다(일시정지 시 진행 상태 보존).
 * @param {ReturnType<typeof createGameState>} state
 * @param {number} dt 초 단위 델타 타임
 * @param {{left?:boolean,right?:boolean,up?:boolean,down?:boolean,fire?:boolean}} input
 * @param {() => number} rng 0 이상 1 미만 실수를 반환하는 함수(기본 Math.random)
 */
export function update(state, dt, input = {}, rng = Math.random) {
  if (state.status !== STATUS.PLAYING) return state;

  updatePlayerMovement(state, dt, input);
  updateFiring(state, dt, input);
  updateSpawning(state, dt, rng);
  updateBullets(state, dt);
  updateEnemies(state, dt);
  updateEnemyBullets(state, dt);
  updateExplosions(state, dt);
  resolveCollisions(state);

  return state;
}

export function countActive(pool) {
  return pool.filter((item) => item.active).length;
}
