// Line Defense — 순수 게임 로직 (BF-1750)
//
// 이 모듈은 렌더링/DOM 과 완전히 분리된 순수 함수 집합이다.
// window·document·canvas·Date.now·Math.random 을 참조하지 않으며,
// 모든 무작위성은 호출자가 주입한 rng: () => number([0,1)) 로만 발생한다.
// state 는 직렬화 가능한 순수 데이터(함수·DOM 핸들 미포함)다.

/** 화면 상태 집합 */
export const PHASES = Object.freeze({
  START: 'start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
});

/** planner(§3, §6) 가 동결한 기본 규칙/수치 */
export const DEFAULT_CONFIG = Object.freeze({
  startLives: 20,
  startResource: 100,
  startWave: 1,
  killReward: 10, // 처치 시 자원 보상
  killScore: 100, // 처치 시 점수
  waveClearBonus: 500, // 웨이브 전멸 클리어 보너스
  towerCost: 50, // 타워 1기 배치 비용
  towerRange: 2.5, // 타워 사거리(셀 단위)
  towerDamage: 15, // 타워 1회 공격 데미지
  towerCooldown: 0.4, // 공격 간격(초)
  enemyBaseHp: 30, // 웨이브 1 적 체력
  enemyHpPerWave: 10, // 웨이브당 체력 증가량
  enemySpeed: 1.5, // 적 이동 속도(셀/초)
  spawnInterval: 1.0, // 적 스폰 간격(초)
  spawnJitter: 0.3, // rng 기반 스폰 지연 지터(0~1)
  // 고정 경로(셀 좌표 x=col, y=row). 적은 이 경로를 따라 이동한다.
  path: [
    { x: 0, y: 2 },
    { x: 14, y: 2 },
    { x: 14, y: 8 },
    { x: 4, y: 8 },
    { x: 4, y: 5 },
    { x: 19, y: 5 },
  ],
});

/**
 * 웨이브 N 의 적 수 = 5 + (N-1) * 3
 * @param {number} wave
 * @returns {number}
 */
export function enemyCountForWave(wave) {
  return 5 + (wave - 1) * 3;
}

/**
 * 웨이브 N 적의 체력 = baseHp + (N-1) * hpPerWave
 * @param {number} wave
 * @param {typeof DEFAULT_CONFIG} config
 * @returns {number}
 */
export function enemyHpForWave(wave, config) {
  return config.enemyBaseHp + (wave - 1) * config.enemyHpPerWave;
}

/**
 * 경로 각 세그먼트 길이의 합(셀 단위).
 * @param {{x:number,y:number}[]} path
 * @returns {number}
 */
export function pathLength(path) {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  }
  return total;
}

/**
 * 경로 시작점에서 dist 만큼 진행한 지점의 좌표(셀 단위).
 * dist 가 전체 길이 이상이면 마지막 waypoint 를 반환한다.
 * @param {{x:number,y:number}[]} path
 * @param {number} dist
 * @returns {{x:number,y:number}}
 */
export function positionAlong(path, dist) {
  if (dist <= 0) return { x: path[0].x, y: path[0].y };
  let remaining = dist;
  for (let i = 1; i < path.length; i += 1) {
    const seg = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    if (remaining <= seg) {
      const t = seg === 0 ? 0 : remaining / seg;
      return {
        x: path[i - 1].x + (path[i].x - path[i - 1].x) * t,
        y: path[i - 1].y + (path[i].y - path[i - 1].y) * t,
      };
    }
    remaining -= seg;
  }
  const last = path[path.length - 1];
  return { x: last.x, y: last.y };
}

/**
 * 초기 상태 생성.
 * @param {Partial<typeof DEFAULT_CONFIG>} [overrides]
 * @returns {object} state
 */
export function createInitialState(overrides = {}) {
  const config = { ...DEFAULT_CONFIG, ...overrides };
  const wave = config.startWave;
  return {
    phase: PHASES.START,
    resource: config.startResource,
    lives: config.startLives,
    score: config.startScore ?? 0,
    wave,
    towers: [],
    enemies: [],
    spawnRemaining: enemyCountForWave(wave), // 이번 웨이브에서 아직 스폰할 적 수
    spawnTimer: 0, // 다음 스폰까지 남은 시간(초). 0 이면 즉시 스폰
    nextEnemyId: 1,
    pathLength: pathLength(config.path),
    config,
  };
}

/**
 * 화면 상태 전이(순수).
 * @param {object} state
 * @param {string} phase
 * @returns {object}
 */
export function setPhase(state, phase) {
  return { ...state, phase };
}

/**
 * 타워 배치(순수). 자원이 충분하고 같은 셀이 비어 있으면 배치 후 비용 차감,
 * 그렇지 않으면 상태를 변경하지 않는다.
 * @param {object} state
 * @param {{col:number,row:number}} cell
 * @returns {object}
 */
export function placeTower(state, cell) {
  const { config } = state;
  if (state.resource < config.towerCost) return state;
  const occupied = state.towers.some((t) => t.col === cell.col && t.row === cell.row);
  if (occupied) return state;
  const tower = {
    col: cell.col,
    row: cell.row,
    range: config.towerRange,
    damage: config.towerDamage,
    cooldown: config.towerCooldown,
    cooldownLeft: 0,
  };
  return {
    ...state,
    resource: state.resource - config.towerCost,
    towers: [...state.towers, tower],
  };
}

/**
 * 한 tick 진행(순수·결정적). phase 가 'playing' 이 아니면 상태를 그대로 반환한다.
 * 적 스폰·이동·타워 공격·자원/생명/점수/웨이브 갱신을 모두 계산한다.
 * @param {object} state
 * @param {number} dt 경과 시간(초)
 * @param {() => number} rng [0,1) 난수 공급자(주입)
 * @returns {object} nextState
 */
export function step(state, dt, rng) {
  if (state.phase !== PHASES.PLAYING) return state;

  const { config } = state;
  const path = config.path;
  let { resource, lives, score, wave, spawnRemaining, spawnTimer, nextEnemyId } = state;

  // 1) 스폰: 타이머를 소진하며 남은 적을 순차 스폰한다.
  let enemies = state.enemies.map((e) => ({ ...e }));
  spawnTimer -= dt;
  while (spawnTimer <= 0 && spawnRemaining > 0) {
    enemies.push({
      id: nextEnemyId,
      hp: enemyHpForWave(wave, config),
      maxHp: enemyHpForWave(wave, config),
      dist: 0,
    });
    nextEnemyId += 1;
    spawnRemaining -= 1;
    // rng 로 스폰 간격에 지터를 준다(결정적: 동일 rng → 동일 간격).
    const jitter = 1 - config.spawnJitter + rng() * 2 * config.spawnJitter;
    spawnTimer += config.spawnInterval * jitter;
  }

  // 2) 이동: 적을 경로를 따라 전진시킨다.
  for (const e of enemies) {
    e.dist += config.enemySpeed * dt;
  }

  // 3) 타워 공격: 각 타워는 쿨다운이 차면 사거리 내 '가장 앞선' 적을 공격한다.
  const towers = state.towers.map((t) => ({ ...t, cooldownLeft: t.cooldownLeft - dt }));
  for (const tower of towers) {
    if (tower.cooldownLeft > 0) continue;
    let target = null;
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const pos = positionAlong(path, e.dist);
      const d = Math.hypot(pos.x - tower.col, pos.y - tower.row);
      if (d <= tower.range && (target === null || e.dist > target.dist)) {
        target = e;
      }
    }
    if (target) {
      target.hp -= tower.damage;
      tower.cooldownLeft = tower.cooldown;
    }
  }

  // 4) 정리: 처치(hp<=0) → 자원/점수 보상, base 도달 → 생명 차감.
  const survivors = [];
  for (const e of enemies) {
    if (e.hp <= 0) {
      resource += config.killReward;
      score += config.killScore;
      continue;
    }
    if (e.dist >= state.pathLength) {
      lives -= 1;
      continue;
    }
    survivors.push(e);
  }
  enemies = survivors;

  // 5) 생명 소진 → 게임오버.
  let phase = state.phase;
  if (lives <= 0) {
    lives = 0;
    phase = PHASES.GAMEOVER;
  }

  // 6) 웨이브 클리어: 남은 스폰과 잔존 적이 모두 없으면 다음 웨이브로 전이(보너스 부여).
  if (phase === PHASES.PLAYING && spawnRemaining === 0 && enemies.length === 0) {
    wave += 1;
    score += config.waveClearBonus;
    spawnRemaining = enemyCountForWave(wave);
    spawnTimer = 0;
  }

  return {
    ...state,
    phase,
    resource,
    lives,
    score,
    wave,
    towers,
    enemies,
    spawnRemaining,
    spawnTimer,
    nextEnemyId,
  };
}

/**
 * 초기값으로 되돌림. state(또는 config 객체)를 받아 동일 config 로 재생성한다.
 * 생명·자원·점수·웨이브·진행 표시가 초기값으로 복귀한다.
 * @param {object} stateOrConfig
 * @returns {object}
 */
export function reset(stateOrConfig) {
  const config = stateOrConfig && stateOrConfig.config ? stateOrConfig.config : stateOrConfig;
  return createInitialState(config || {});
}

/**
 * 결정적 PRNG(mulberry32). render 루프와 테스트가 동일 seed 로 재현성을 확보한다.
 * game.js 는 이 함수를 소비만 하며 내부에서 생성하지 않는다.
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
