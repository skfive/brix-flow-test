// Star Collector — 순수 게임 로직 모듈 (렌더링/DOM/Phaser 비의존)
//
// 이 모듈은 상태 전이(start/playing/paused/gameover), 물리(좌우 이동·중력·접지 점프),
// 충돌 판정, 점수 계산, 웨이브 생성을 담당한다. 무작위 요소(별/장애물 배치)는
// 주입된 rng 함수로 전달받아 테스트에서 결정적으로 재현할 수 있다.
//
// 모든 export 함수는 순수 함수다: 입력 상태를 변형하지 않고 새 상태를 반환한다.

/** 게임 상태 이름 (frozen UI 계약) */
export const STATES = Object.freeze({
  START: 'start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
});

/** 상태별 화면 텍스트 (색상만으로 구분하지 않도록 상태명을 텍스트로 노출) */
export const STATUS_TEXT = Object.freeze({
  start: '시작 — 방향키 이동 · 스페이스 점프',
  playing: '플레이 중',
  paused: '일시정지',
  gameover: '게임 오버',
});

/** 월드/물리 상수 (4:3 종횡비: 800x600) */
export const WORLD = Object.freeze({
  WIDTH: 800,
  HEIGHT: 600,
  GRAVITY: 0.8,
  MOVE_SPEED: 5,
  JUMP_VELOCITY: -15,
  PLAYER_SIZE: 30,
  STAR_SIZE: 20,
  HAZARD_SIZE: 28,
  HAZARD_SPEED: 3,
  GROUND_Y: 560,
});

const DEFAULT_STAR_COUNT = 3;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** 축 정렬 사각형(AABB) 충돌 판정 */
export function collides(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** 서로 다른 높이의 플랫폼 최소 4개 + 바닥. (정적·결정적) */
export function buildPlatforms() {
  return [
    { x: 0, y: WORLD.GROUND_Y, width: WORLD.WIDTH, height: 40, isGround: true },
    { x: 100, y: 460, width: 150, height: 20, isGround: false },
    { x: 330, y: 380, width: 150, height: 20, isGround: false },
    { x: 550, y: 300, width: 150, height: 20, isGround: false },
    { x: 220, y: 200, width: 150, height: 20, isGround: false },
  ];
}

/** 바닥 위 중앙에 선 초기 플레이어 */
export function createPlayer() {
  return {
    x: Math.round((WORLD.WIDTH - WORLD.PLAYER_SIZE) / 2),
    y: WORLD.GROUND_Y - WORLD.PLAYER_SIZE,
    vx: 0,
    vy: 0,
    grounded: true,
    width: WORLD.PLAYER_SIZE,
    height: WORLD.PLAYER_SIZE,
  };
}

/** start 상태의 새 게임 상태 */
export function createInitialState() {
  return {
    status: STATES.START,
    score: 0,
    wave: 0,
    player: createPlayer(),
    platforms: buildPlatforms(),
    stars: [],
    hazards: [],
  };
}

/**
 * 웨이브(별 + 움직이는 장애물)를 rng로 결정적으로 생성한다.
 * @param {Array} platforms
 * @param {() => number} rng - [0,1) 난수 함수 (주입)
 * @param {{starCount?: number}} [options]
 */
export function spawnWave(platforms, rng, options = {}) {
  const starCount = options.starCount ?? DEFAULT_STAR_COUNT;
  const elevated = platforms.filter((p) => !p.isGround);
  const surfaces = elevated.length > 0 ? elevated : platforms;

  const stars = [];
  for (let i = 0; i < starCount; i += 1) {
    const p = surfaces[Math.floor(rng() * surfaces.length) % surfaces.length];
    const maxOffset = Math.max(1, p.width - WORLD.STAR_SIZE);
    const x = p.x + Math.floor(rng() * maxOffset);
    const y = p.y - WORLD.STAR_SIZE - 4;
    stars.push({
      x,
      y,
      width: WORLD.STAR_SIZE,
      height: WORLD.STAR_SIZE,
      collected: false,
    });
  }

  const ground = platforms.find((p) => p.isGround) ?? platforms[0];
  const hazardX = Math.floor(rng() * (WORLD.WIDTH - WORLD.HAZARD_SIZE));
  const hazards = [
    {
      x: hazardX,
      y: ground.y - WORLD.HAZARD_SIZE,
      width: WORLD.HAZARD_SIZE,
      height: WORLD.HAZARD_SIZE,
      vx: WORLD.HAZARD_SPEED,
      minX: 0,
      maxX: WORLD.WIDTH - WORLD.HAZARD_SIZE,
    },
  ];

  return { stars, hazards };
}

/**
 * 입력·중력·접지 점프를 적용해 다음 플레이어 상태를 계산한다.
 * 점프는 grounded(바닥/플랫폼 접지)일 때만 가능하다 — 공중 2단 점프 불가.
 * @param {object} player
 * @param {{left?: boolean, right?: boolean, jump?: boolean}} input
 * @param {Array} platforms
 */
export function stepPlayer(player, input, platforms) {
  let vx = 0;
  if (input.left) vx -= WORLD.MOVE_SPEED;
  if (input.right) vx += WORLD.MOVE_SPEED;

  let vy = player.vy;
  // 접지 상태에서만 점프 (2단 점프 방지)
  if (input.jump && player.grounded) {
    vy = WORLD.JUMP_VELOCITY;
  }
  vy += WORLD.GRAVITY;

  const x = clamp(player.x + vx, 0, WORLD.WIDTH - WORLD.PLAYER_SIZE);
  let y = player.y + vy;

  const prevBottom = player.y + WORLD.PLAYER_SIZE;
  let grounded = false;

  // 하강 중(vy >= 0)일 때만 플랫폼 윗면 접지 판정
  if (vy >= 0) {
    for (const p of platforms) {
      const newBottom = y + WORLD.PLAYER_SIZE;
      const horizontallyOverlaps =
        x + WORLD.PLAYER_SIZE > p.x && x < p.x + p.width;
      if (horizontallyOverlaps && prevBottom <= p.y && newBottom >= p.y) {
        y = p.y - WORLD.PLAYER_SIZE;
        vy = 0;
        grounded = true;
        break;
      }
    }
  }

  return { ...player, x, y, vx, vy, grounded };
}

/** 움직이는 장애물: 경계에서 방향을 반전한다. (순수) */
export function stepHazards(hazards) {
  return hazards.map((h) => {
    const minX = h.minX ?? 0;
    const maxX = h.maxX ?? WORLD.WIDTH - h.width;
    let vx = h.vx;
    let x = h.x + vx;
    if (x <= minX) {
      x = minX;
      vx = Math.abs(vx);
    } else if (x >= maxX) {
      x = maxX;
      vx = -Math.abs(vx);
    }
    return { ...h, x, vx };
  });
}

/**
 * playing 상태에서 한 프레임을 진행한다.
 * 진행 순서: 플레이어 이동 → 장애물 이동 → (장애물 충돌: gameover 우선) →
 * 별 수집(점수 증가) → 모든 별 수집 시 다음 웨이브 재생성.
 * playing이 아니면(paused/start/gameover) 상태를 그대로 반환한다.
 * @param {object} state
 * @param {{left?: boolean, right?: boolean, jump?: boolean}} input
 * @param {() => number} rng - 웨이브 재생성용 주입 rng
 */
export function stepGame(state, input, rng) {
  if (state.status !== STATES.PLAYING) return state;

  const player = stepPlayer(state.player, input, state.platforms);
  const hazards = stepHazards(state.hazards);

  // 동시 충돌 시 장애물(gameover)이 별 수집보다 우선한다.
  if (hazards.some((h) => collides(player, h))) {
    return { ...state, player, hazards, status: STATES.GAMEOVER };
  }

  let score = state.score;
  const stars = state.stars.map((s) => {
    if (!s.collected && collides(player, s)) {
      score += 1;
      return { ...s, collected: true };
    }
    return s;
  });

  // 모든 별을 모으면 다음 웨이브 재생성
  if (stars.length > 0 && stars.every((s) => s.collected)) {
    const spawned = spawnWave(state.platforms, rng);
    return {
      ...state,
      player,
      score,
      wave: state.wave + 1,
      stars: spawned.stars,
      hazards: spawned.hazards,
    };
  }

  return { ...state, player, score, stars, hazards };
}

/** start → playing: 첫 웨이브 생성, 점수 0. */
export function startGame(state, rng) {
  if (state.status !== STATES.START) return state;
  const { stars, hazards } = spawnWave(state.platforms, rng);
  return {
    ...state,
    status: STATES.PLAYING,
    score: 0,
    wave: 1,
    player: createPlayer(),
    stars,
    hazards,
  };
}

/** playing → paused (그 외 상태는 변화 없음) */
export function pauseGame(state) {
  return state.status === STATES.PLAYING
    ? { ...state, status: STATES.PAUSED }
    : state;
}

/** paused → playing (그 외 상태는 변화 없음) */
export function resumeGame(state) {
  return state.status === STATES.PAUSED
    ? { ...state, status: STATES.PLAYING }
    : state;
}

/**
 * 재시작: 상태·점수·엔티티·플레이어를 초기값(start)으로 완전 복원한다.
 * 잔여 점수/엔티티가 남지 않는다.
 */
export function restartGame() {
  return createInitialState();
}
