// game-logic.js — Phaser 엔드리스 러너의 순수 게임 로직
//
// 이 모듈은 렌더링(Phaser)·DOM·전역 시간·전역 난수에 의존하지 않는다.
// 모든 무작위 동작은 주입된 rng()(=> [0,1) 실수)로만 결정되므로
// 스텁 RNG를 넣으면 완전히 결정론적으로 테스트할 수 있다.

export const STATUS = Object.freeze({
  START: 'start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
});

// 사람이 읽는 상태 라벨 — 상태를 색상만이 아니라 텍스트/접근성 이름으로 노출하기 위함
export const STATUS_LABEL = Object.freeze({
  [STATUS.START]: '시작 대기',
  [STATUS.PLAYING]: '진행 중',
  [STATUS.PAUSED]: '일시정지',
  [STATUS.GAMEOVER]: '게임 오버',
});

export const CONFIG = Object.freeze({
  worldWidth: 800,
  worldHeight: 450,
  groundY: 360,

  playerX: 120,
  playerWidth: 40,
  playerHeight: 64,
  duckHeight: 32,

  jumpSpeed: 780, // 점프 시작 수직 속도(위 방향, px/s)
  gravity: 2200, // 중력 가속도(px/s^2)

  baseSpeed: 320, // 시작 스크롤 속도(px/s)
  speedGrowth: 8, // 초당 속도 증가량(px/s per s)
  maxSpeed: 900,

  firstSpawn: 700, // 첫 장애물까지 진행 거리
  spawnMin: 300, // 장애물 최소 간격
  spawnMax: 560, // 장애물 최대 간격

  obstacleGround: Object.freeze({ width: 30, height: 48 }),
  obstacleAir: Object.freeze({ width: 44, height: 34, top: 270 }),

  distancePerPoint: 10, // 이 거리(px)마다 점수 1점
});

function overlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// 플레이어의 충돌 사각형. player: { offset, action }
// offset: 지면 위로 뜬 높이(px, 0=지면). action: 'run'|'jump'|'duck'
export function playerRect(player) {
  const height = player.action === 'duck' ? CONFIG.duckHeight : CONFIG.playerHeight;
  const bottom = CONFIG.groundY - Math.max(0, player.offset);
  const top = bottom - height;
  return {
    left: CONFIG.playerX,
    right: CONFIG.playerX + CONFIG.playerWidth,
    top,
    bottom,
  };
}

// 장애물의 충돌 사각형. obstacle: { x, width, height, y }
export function obstacleRect(obstacle) {
  return {
    left: obstacle.x,
    right: obstacle.x + obstacle.width,
    top: obstacle.y,
    bottom: obstacle.y + obstacle.height,
  };
}

// 플레이어 액션과 장애물의 겹침 판정.
// ground 장애물은 점프(offset 상승)로, air 장애물은 숙이기(높이 감소)로 회피한다.
export function checkCollision(player, obstacle) {
  return overlap(playerRect(player), obstacleRect(obstacle));
}

// rng() 결과값 하나로 다음 장애물 종류를 결정한다. 결정론적.
export function pickObstacleKind(rngValue) {
  return rngValue < 0.5 ? 'ground' : 'air';
}

// 화면 우측 끝에서 진입하는 새 장애물을 생성한다.
export function createObstacle(kind) {
  if (kind === 'air') {
    return {
      kind: 'air',
      x: CONFIG.worldWidth,
      width: CONFIG.obstacleAir.width,
      height: CONFIG.obstacleAir.height,
      y: CONFIG.obstacleAir.top,
    };
  }
  return {
    kind: 'ground',
    x: CONFIG.worldWidth,
    width: CONFIG.obstacleGround.width,
    height: CONFIG.obstacleGround.height,
    y: CONFIG.groundY - CONFIG.obstacleGround.height,
  };
}

function freshPlaying(state) {
  return {
    ...state,
    status: STATUS.PLAYING,
    score: 0,
    distance: 0,
    speed: CONFIG.baseSpeed,
    player: { offset: 0, vy: 0, action: 'run' },
    obstacles: [],
    spawnCountdown: CONFIG.firstSpawn,
  };
}

// 새 게임 상태를 만든다. rng는 필수로 주입한다.
export function createGame({ rng, highScore = 0 } = {}) {
  if (typeof rng !== 'function') {
    throw new Error('createGame requires an injected rng function');
  }
  return {
    status: STATUS.START,
    score: 0,
    distance: 0,
    highScore,
    speed: CONFIG.baseSpeed,
    player: { offset: 0, vy: 0, action: 'run' },
    obstacles: [],
    spawnCountdown: CONFIG.firstSpawn,
    rng,
  };
}

// 상태 전이 — 유효하지 않은 전이는 상태를 그대로 반환(무시)한다.
export function startGame(state) {
  return state.status === STATUS.START ? freshPlaying(state) : state;
}

export function pauseGame(state) {
  return state.status === STATUS.PLAYING ? { ...state, status: STATUS.PAUSED } : state;
}

export function resumeGame(state) {
  return state.status === STATUS.PAUSED ? { ...state, status: STATUS.PLAYING } : state;
}

// 재시작 — score/distance/speed를 초기값으로 복원하고 highScore는 보존한다.
export function restartGame(state) {
  return state.status === STATUS.GAMEOVER ? freshPlaying(state) : state;
}

function scoreFromDistance(distance) {
  return Math.floor(distance / CONFIG.distancePerPoint);
}

// 한 프레임 진행. dt: 초 단위 델타, input: { jump, duck } 불리언.
// playing 상태가 아니면 상태를 그대로 반환한다.
export function step(state, dt, input = {}) {
  if (state.status !== STATUS.PLAYING) {
    return state;
  }

  const jump = !!input.jump;
  const duck = !!input.duck;

  // 속도: 진행에 따라 단조 증가(최대치 제한). RNG와 무관하게 결정론적.
  const speed = Math.min(CONFIG.maxSpeed, state.speed + CONFIG.speedGrowth * dt);

  // 플레이어 물리
  let { offset, vy, action } = state.player;
  const airborne = action === 'jump';
  if (airborne) {
    offset = offset + vy * dt;
    vy = vy - CONFIG.gravity * dt;
    if (offset <= 0) {
      offset = 0;
      vy = 0;
      action = duck ? 'duck' : 'run';
    } else {
      action = 'jump';
    }
  } else if (jump) {
    vy = CONFIG.jumpSpeed;
    action = 'jump';
  } else {
    action = duck ? 'duck' : 'run';
  }
  const player = { offset, vy, action };

  // 장애물 이동 및 화면 밖 제거
  let obstacles = state.obstacles
    .map((o) => ({ ...o, x: o.x - speed * dt }))
    .filter((o) => o.x + o.width > 0);

  // 장애물 생성(주입 RNG로 결정)
  let spawnCountdown = state.spawnCountdown - speed * dt;
  if (spawnCountdown <= 0) {
    const kind = pickObstacleKind(state.rng());
    obstacles = [...obstacles, createObstacle(kind)];
    const gap = CONFIG.spawnMin + state.rng() * (CONFIG.spawnMax - CONFIG.spawnMin);
    spawnCountdown = gap;
  }

  // 거리/점수
  const distance = state.distance + speed * dt;
  const score = scoreFromDistance(distance);

  // 충돌 판정
  let status = STATUS.PLAYING;
  for (const o of obstacles) {
    if (checkCollision(player, o)) {
      status = STATUS.GAMEOVER;
      break;
    }
  }

  let highScore = state.highScore;
  if (status === STATUS.GAMEOVER) {
    highScore = Math.max(highScore, score);
  }

  return {
    ...state,
    status,
    score,
    distance,
    highScore,
    speed,
    player,
    obstacles,
    spawnCountdown,
  };
}
