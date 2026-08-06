// Space Defender — 순수 게임 로직 (BF-1718)
// 렌더링(game.js)·DOM·전역 상태·Math.random 에 의존하지 않는 순수 함수 모듈.
// 무작위 요소는 rng 파라미터(0~1 반환 함수) 주입으로 처리해 테스트 재현성을 보장한다.

// --- 게임 상수 (frozen 설계 §4 기반) ---
export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 600;
export const INITIAL_LIVES = 3;
export const SHIP_Y = 560; // 함선의 고정 y 좌표
export const SHIP_SPEED = 0.35; // px/ms
export const BULLET_SPEED = 0.5; // px/ms (위로 이동)
export const BULLET_MARGIN = 10;
export const FIRE_COOLDOWN = 300; // ms — 발사 연사 간격 제한
export const ENEMY_BASE_SPEED = 0.08; // px/ms (난도 1 기준)
export const SCORE_PER_KILL = 10;
export const HIT_X = 20; // 충돌 판정 x 반경
export const HIT_Y = 24; // 충돌 판정 y 반경
export const DIFFICULTY_INTERVAL = 10000; // ms — 이 간격마다 난도 +1
export const BASE_SPAWN_INTERVAL = 1200; // ms
export const SPAWN_INTERVAL_STEP = 150; // ms, 난도당 감소량
export const MIN_SPAWN_INTERVAL = 350; // ms 하한
export const ZIGZAG_AMP = 40;
export const ZIGZAG_FREQ = 0.02;

/**
 * start 상태의 초기값을 생성한다. (점수 0 / 목숨 초기 / 함선 중앙)
 * @param {number} highScore 이전까지 최고 점수
 */
export function createInitialState(highScore = 0) {
  return {
    status: 'start',
    score: 0,
    lives: INITIAL_LIVES,
    highScore,
    ship: { x: GAME_WIDTH / 2 },
    bullets: [],
    enemies: [],
    elapsed: 0,
    difficulty: 1,
    spawnTimer: 0,
    lastFireTime: -Infinity,
  };
}

/**
 * 상태 전이: start→playing→paused↔playing→gameover, gameover→start(초기값 복귀)
 * @param {object} state
 * @param {'start'|'togglePause'|'gameover'|'restart'} event
 */
export function transition(state, event) {
  switch (event) {
    case 'start':
      if (state.status === 'start') {
        return { ...state, status: 'playing' };
      }
      return state;
    case 'togglePause':
      if (state.status === 'playing') {
        return { ...state, status: 'paused' };
      }
      if (state.status === 'paused') {
        return { ...state, status: 'playing' };
      }
      return state;
    case 'gameover':
      return {
        ...state,
        status: 'gameover',
        highScore: Math.max(state.highScore, state.score),
      };
    case 'restart':
      // 초기값 복귀 — 최고 점수만 보존
      return createInitialState(Math.max(state.highScore, state.score));
    default:
      return state;
  }
}

/**
 * 경과 시간에 따른 난도. 시간 경과 규칙: DIFFICULTY_INTERVAL 마다 +1.
 * @param {number} elapsed ms
 */
export function difficultyFor(elapsed) {
  return 1 + Math.floor(elapsed / DIFFICULTY_INTERVAL);
}

/**
 * 난도에 따른 적 스폰 간격 — 난도가 오를수록 짧아진다(하한 존재).
 * @param {number} difficulty
 */
export function spawnIntervalFor(difficulty) {
  return Math.max(
    MIN_SPAWN_INTERVAL,
    BASE_SPAWN_INTERVAL - (difficulty - 1) * SPAWN_INTERVAL_STEP,
  );
}

/**
 * 난도에 따른 적 낙하 속도 — 난도가 오를수록 빨라진다.
 * @param {number} difficulty
 */
export function enemySpeedFor(difficulty) {
  return ENEMY_BASE_SPEED * difficulty;
}

/**
 * 적 하나를 이동 패턴에 따라 갱신한다. (순수)
 * 2종 패턴: 'straight'(x 고정 낙하), 'zigzag'(x 사인 진동 낙하)
 * @param {object} enemy
 * @param {number} delta ms
 * @param {number} difficulty
 */
export function moveEnemy(enemy, delta, difficulty) {
  const y = enemy.y + enemySpeedFor(difficulty) * delta;
  let x = enemy.x;
  if (enemy.pattern === 'zigzag') {
    x = enemy.baseX + ZIGZAG_AMP * Math.sin(y * ZIGZAG_FREQ);
  }
  return { ...enemy, x, y };
}

/**
 * 적 스폰 — rng 로 x 위치와 이동 패턴을 결정적으로 주입.
 * @param {() => number} rng 0~1 반환 함수
 */
export function spawnEnemy(rng) {
  const baseX = rng() * GAME_WIDTH;
  const pattern = rng() < 0.5 ? 'straight' : 'zigzag';
  return { x: baseX, y: 0, baseX, pattern };
}

/**
 * 함선 좌우 이동. (순수)
 * @param {object} state
 * @param {-1|0|1} direction 좌(-1)/우(1)
 * @param {number} delta ms
 */
export function moveShip(state, direction, delta) {
  if (state.status !== 'playing' || direction === 0) {
    return state;
  }
  const nextX = state.ship.x + direction * SHIP_SPEED * delta;
  const clamped = Math.max(0, Math.min(GAME_WIDTH, nextX));
  return { ...state, ship: { ...state.ship, x: clamped } };
}

/**
 * 발사 — 연사 간격 제한(FIRE_COOLDOWN) 적용. 쿨다운 내면 상태 불변.
 * @param {object} state
 * @param {number} time 현재 시각(ms)
 */
export function fireBullet(state, time) {
  if (state.status !== 'playing') {
    return state;
  }
  if (time - state.lastFireTime < FIRE_COOLDOWN) {
    return state; // 연사 간격 제한
  }
  return {
    ...state,
    bullets: [...state.bullets, { x: state.ship.x, y: SHIP_Y }],
    lastFireTime: time,
  };
}

/**
 * 물리 진행: 탄·적 이동, 시간 경과에 따른 난도 갱신, 적 스폰(rng 주입).
 * playing 상태에서만 진행한다.
 * @param {object} state
 * @param {number} delta ms
 * @param {() => number} rng
 */
export function stepPhysics(state, delta, rng) {
  if (state.status !== 'playing') {
    return state;
  }
  const elapsed = state.elapsed + delta;
  const difficulty = difficultyFor(elapsed);

  const bullets = state.bullets
    .map((b) => ({ ...b, y: b.y - BULLET_SPEED * delta }))
    .filter((b) => b.y > -BULLET_MARGIN);

  let enemies = state.enemies.map((e) => moveEnemy(e, delta, difficulty));

  let spawnTimer = state.spawnTimer + delta;
  const interval = spawnIntervalFor(difficulty);
  if (spawnTimer >= interval) {
    spawnTimer -= interval;
    enemies = [...enemies, spawnEnemy(rng)];
  }

  return { ...state, elapsed, difficulty, bullets, enemies, spawnTimer };
}

/**
 * 충돌 판정: 탄–적 명중(적·탄 제거, kill), 적–함선 충돌/화면 이탈(목숨 차감).
 * 순수 — 갱신된 배열과 hits 집계를 반환하고 점수/목숨은 applyScore 가 반영.
 * @param {object} state
 * @returns {{ bullets: object[], enemies: object[], hits: { kills: number, shipHits: number } }}
 */
export function detectCollisions(state) {
  const bullets = [...state.bullets];
  const survivingEnemies = [];
  let kills = 0;
  let shipHits = 0;

  for (const enemy of state.enemies) {
    // 적–함선 충돌: 함선 라인 도달 + x 근접
    if (
      enemy.y >= SHIP_Y - HIT_Y &&
      Math.abs(enemy.x - state.ship.x) < HIT_X
    ) {
      shipHits += 1;
      continue; // 적 소멸
    }
    // 화면 하단 이탈(요격 실패)도 목숨 차감
    if (enemy.y > GAME_HEIGHT) {
      shipHits += 1;
      continue;
    }
    // 탄–적 명중
    const hitIndex = bullets.findIndex(
      (b) => Math.abs(b.x - enemy.x) < HIT_X && Math.abs(b.y - enemy.y) < HIT_Y,
    );
    if (hitIndex >= 0) {
      bullets.splice(hitIndex, 1);
      kills += 1;
      continue; // 적 파괴
    }
    survivingEnemies.push(enemy);
  }

  return { bullets, enemies: survivingEnemies, hits: { kills, shipHits } };
}

/**
 * 점수·목숨·최고점수 반영. 목숨 0 이하면 gameover 전이(시작 목숨 3).
 * @param {object} state
 * @param {{ kills: number, shipHits: number }} hits
 */
export function applyScore(state, hits) {
  const score = state.score + hits.kills * SCORE_PER_KILL;
  const rawLives = state.lives - hits.shipHits;
  const lives = Math.max(0, rawLives);
  const highScore = Math.max(state.highScore, score);
  const status = lives <= 0 ? 'gameover' : state.status;
  return { ...state, score, lives, highScore, status };
}

/**
 * 충돌 판정 + 점수 반영을 한 번에 수행하는 편의 함수(렌더 루프용).
 * @param {object} state
 */
export function resolveCollisions(state) {
  const { bullets, enemies, hits } = detectCollisions(state);
  return applyScore({ ...state, bullets, enemies }, hits);
}
