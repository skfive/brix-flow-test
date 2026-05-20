// BF-504 · Snake 게임 순수 로직 유틸 (no DOM, no canvas)
// - DOM/Canvas 의존성 없음 → node:test 단위 테스트 가능 (ES module export)
// - 명세: BF-504 acceptance criteria
//
// BF-530 · CPU 지렁이 AI + 경쟁 게임 로직 추가
// - s1 명세(BF-527): chooseCpuDirection 스코어 기반 AI (safeLen + foodScore)
// - s2 명세(BF-529): tickFull — T1~T4 충돌 검사 + 승패 판정 + deathCause 기록
//
// BF-533 · 배수 아이템 spawn·길이 증가·상단 통계 UI 구현
// - 명세(BF-531): 확률 기반 배수 선택, pendingGrowth, multiplierStats

/** 기본 셀 크기 (px). 렌더러에서 사용. */
export const CELL = 20;

/** localStorage 키 */
export const LS_HIGH_SCORE_KEY = "bf-snake-high-score";

// ─────────────────────────────────────────────────────────────
// 방향 상수
// ─────────────────────────────────────────────────────────────
export const DIR = {
  UP:    { x:  0, y: -1 },
  DOWN:  { x:  0, y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x:  1, y:  0 },
};

// ─────────────────────────────────────────────────────────────
// 난이도 파라미터 (s1 §2)
// ─────────────────────────────────────────────────────────────
export const DIFFICULTY_PARAMS = {
  normal: {
    tickIntervalMs:       120,
    visionRange:          8,
    avoidanceThreshold:   5,
    respawnDelayTicks:    20,
    foodPriorityWeight:   0.7,
    // BF-629: 적 AI v2 추가 파라미터 (명세 §4.2)
    contestRadius: 6, threatRadius: 4, threatWeight: 0.5, contestFoodBoost: 0.18, itemSeekWeight: 0.6,
  },
  easy: {
    tickIntervalMs:       240,
    visionRange:          3,
    avoidanceThreshold:   2,
    respawnDelayTicks:    10,
    foodPriorityWeight:   0.4,
    // BF-629: 적 AI v2 추가 파라미터 (명세 §4.2)
    contestRadius: 3, threatRadius: 2, threatWeight: 0.2, contestFoodBoost: 0.10, itemSeekWeight: 0.3,
  },
};

// ─────────────────────────────────────────────────────────────
// BF-629: 적 AI v2 — Feature Flags & 상수 (명세 §2.3)
// ─────────────────────────────────────────────────────────────

/** Feature Flag — 적 AI v2 활성화. false → 기존 greedy 폴백 (BF-584). */
export let ENEMY_AI_V2_ENABLED = true;
/** Feature Flag — extras 전용 먹이/아이템 풀. false → extraFoods=[] (cpuCount≤1 과 동일). */
export let MULTI_FOOD_ENABLED = true;
/** extras 1마리당 동시 먹이 수 (명세 §5.3) */
export const FOOD_PER_EXTRA_ENEMY = 2.25;
/** 동시 먹이 상한 (≈단일 1개의 10배) */
export const FOOD_POOL_CAP = 10;
/** extras 1마리당 동시 아이템 수 */
export const ITEM_PER_EXTRA_ENEMY = 1.0;
/** 동시 아이템 상한 */
export const ITEM_POOL_CAP = 5;
/** 틱당 풀 보충 최대 개수 */
export const POOL_MAX_SPAWN_PER_TICK = 1;
/** 적 AI 타깃 가치 — 아이템별 (명세 §4.3) */
export const ENEMY_TARGET_VALUE_ITEM = {
  SPEED_UP:     3,
  SHIELD:       3,
  SLOW_DOWN:    1,
  LENGTH_BURST: 2,
  REVERSE:      1,
};

// ─────────────────────────────────────────────────────────────
// 게임 설정 — BF-579 (planner 명세 §2, §5)
// ─────────────────────────────────────────────────────────────

/** 설정 localStorage 키 (명세 §5-1) */
export const SNAKE_SETTINGS_LS_KEY = "bf-snake-settings";

/** 설정 스키마 버전 (명세 §5-2) */
export const SNAKE_SETTINGS_SCHEMA_VERSION = 1;

/** 기본 설정값 (명세 §2-1) */
export const SNAKE_SETTINGS_DEFAULTS = Object.freeze({
  schemaVersion:     SNAKE_SETTINGS_SCHEMA_VERSION,
  difficulty:        "normal",
  cpuCount:          1,
  itemsEnabled:      false,
  itemSpawnRate:     0.5,
  multiplierEnabled: true,
  timeLimitSec:      null,
  initialLength:     3,
});

/** 허용 범위 (명세 §2-1, §2-2 — BF-584: cpuCount 0~5 확장) */
export const SNAKE_SETTINGS_LIMITS = Object.freeze({
  difficulty:    ["easy", "normal"],
  cpuCount:      [0, 1, 2, 3, 4, 5],
  itemSpawnRate: { min: 0.0, max: 1.0 },
  timeLimitSec:  { min: 60,  max: 600 },
  initialLength: [3, 5, 7],
});

/**
 * 입력 객체를 §2-1 기본값과 병합 + §9 EC 정책으로 검증.
 *
 * - 모르는 필드는 무시
 * - 허용 범위 외 값은 기본값으로 폴백 + console.warn
 * - cpuCount === 2 는 1 로 폴백 (EC-1: 본 스토리에서 코드 미준비)
 *
 * @param {unknown} raw  parse 된 localStorage 객체 (null/undefined/non-object 도 허용)
 * @returns {typeof SNAKE_SETTINGS_DEFAULTS}
 */
export function validateAndMergeSettings(raw) {
  const out = { ...SNAKE_SETTINGS_DEFAULTS };
  if (raw === null || raw === undefined || typeof raw !== "object") return out;

  // difficulty (enum)
  if (typeof raw.difficulty === "string" && SNAKE_SETTINGS_LIMITS.difficulty.includes(raw.difficulty)) {
    out.difficulty = raw.difficulty;
  } else if (raw.difficulty !== undefined) {
    warn("[BF-579] settings.difficulty 잘못된 값 — 기본값으로 폴백:", raw.difficulty);
  }

  // cpuCount (BF-584: 0~5 모두 허용. 범위 외/비정수는 기본값 폴백)
  if (typeof raw.cpuCount === "number" && Number.isInteger(raw.cpuCount)) {
    if (SNAKE_SETTINGS_LIMITS.cpuCount.includes(raw.cpuCount)) {
      out.cpuCount = raw.cpuCount;
    } else {
      warn("[BF-584] settings.cpuCount 범위 외 — 기본값으로 폴백:", raw.cpuCount);
    }
  } else if (raw.cpuCount !== undefined) {
    warn("[BF-584] settings.cpuCount 비정수 — 기본값으로 폴백:", raw.cpuCount);
  }

  // itemsEnabled (boolean)
  if (typeof raw.itemsEnabled === "boolean") {
    out.itemsEnabled = raw.itemsEnabled;
  }

  // itemSpawnRate (0.0~1.0, clamp)
  if (typeof raw.itemSpawnRate === "number" && Number.isFinite(raw.itemSpawnRate)) {
    const { min, max } = SNAKE_SETTINGS_LIMITS.itemSpawnRate;
    if (raw.itemSpawnRate < min || raw.itemSpawnRate > max) {
      warn("[BF-579] settings.itemSpawnRate clamp:", raw.itemSpawnRate);
      out.itemSpawnRate = Math.max(min, Math.min(max, raw.itemSpawnRate));
    } else {
      out.itemSpawnRate = raw.itemSpawnRate;
    }
  }

  // multiplierEnabled (boolean)
  if (typeof raw.multiplierEnabled === "boolean") {
    out.multiplierEnabled = raw.multiplierEnabled;
  }

  // timeLimitSec (null | 60..600)
  if (raw.timeLimitSec === null) {
    out.timeLimitSec = null;
  } else if (typeof raw.timeLimitSec === "number" && Number.isInteger(raw.timeLimitSec)) {
    const { min, max } = SNAKE_SETTINGS_LIMITS.timeLimitSec;
    if (raw.timeLimitSec < min || raw.timeLimitSec > max) {
      warn("[BF-579] settings.timeLimitSec 범위 외 — 폴백:", raw.timeLimitSec);
      out.timeLimitSec = Math.max(min, Math.min(max, raw.timeLimitSec));
    } else {
      out.timeLimitSec = raw.timeLimitSec;
    }
  } else if (raw.timeLimitSec !== undefined) {
    warn("[BF-579] settings.timeLimitSec 타입 오류 — null 폴백");
  }

  // initialLength (3/5/7)
  if (typeof raw.initialLength === "number" && Number.isInteger(raw.initialLength)) {
    if (SNAKE_SETTINGS_LIMITS.initialLength.includes(raw.initialLength)) {
      out.initialLength = raw.initialLength;
    } else {
      warn("[BF-579] settings.initialLength 허용 외 — 기본값으로 폴백:", raw.initialLength);
    }
  }

  // schemaVersion — 현재 v1 만 정의. 미래 값(2+) 은 알려진 필드만 추출하고 schemaVersion=1 로 정규화.
  if (typeof raw.schemaVersion === "number" && raw.schemaVersion > SNAKE_SETTINGS_SCHEMA_VERSION) {
    info("[BF-579] settings.schemaVersion 이 미래 값:", raw.schemaVersion, "— 알려진 필드만 사용");
  }
  out.schemaVersion = SNAKE_SETTINGS_SCHEMA_VERSION;

  return out;
}

/** logic.js 단위 테스트에서도 console 호출은 OK — node 환경 호환 */
function warn(...args) {
  if (typeof console !== "undefined" && console.warn) console.warn(...args);
}
function info(...args) {
  if (typeof console !== "undefined" && console.info) console.info(...args);
}

/**
 * 격자 폭·높이 조건에 맞춰 initialLength 를 안전한 홀수로 보정 (EC-3).
 * - 격자 최소 가로폭은 length 칸을 모두 담을 수 있어야 함 (head 가 cols/2 → 왼쪽 length-1 칸).
 *
 * @param {number} length  요청 길이 (3/5/7)
 * @param {number} cols
 * @returns {number}
 */
export function clampInitialLength(length, cols) {
  const allowed = SNAKE_SETTINGS_LIMITS.initialLength;
  let best = allowed[0];
  for (const candidate of allowed) {
    if (candidate <= length && candidate < cols) best = candidate;
  }
  if (best > length) best = length;
  return best;
}

// ─────────────────────────────────────────────────────────────
// 상태 생성
// ─────────────────────────────────────────────────────────────

/**
 * 게임 초기 상태 생성.
 * BF-530: CPU 지렁이 필드(cpu, cpuDir, cpuScore, result, deathCause) 추가.
 * BF-579: 4번째 인자 settings 로 게임 파라미터 주입 (initialLength, cpuCount, timeLimitSec 등).
 *         미전달 시 SNAKE_SETTINGS_DEFAULTS 사용 — 기존 호출부 시그니처 호환.
 * player snake 는 중앙에서 오른쪽 향해 length 칸, CPU 는 우하단 3/4 영역에서 왼쪽 향해 3칸.
 *
 * @param {number} cols  격자 열 수
 * @param {number} rows  격자 행 수
 * @param {number} [highScore=0]  유지할 high score
 * @param {Partial<typeof SNAKE_SETTINGS_DEFAULTS>} [settings]  BF-579 게임 설정
 * @returns {GameState}
 */
export function createInitialState(cols, rows, highScore = 0, settings = SNAKE_SETTINGS_DEFAULTS) {
  // settings 가 부분 객체면 기본값과 머지
  const eff = { ...SNAKE_SETTINGS_DEFAULTS, ...(settings || {}) };
  const length = clampInitialLength(eff.initialLength, cols);

  const midX = Math.floor(cols / 2);
  const midY = Math.floor(rows / 2);
  const snake = [];
  for (let i = 0; i < length; i++) {
    snake.push({ x: midX - i, y: midY });
  }

  // CPU 시작 위치: 오른쪽 하단 3/4 영역 (player 와 겹치지 않도록)
  // head(cpuX), body(cpuX+1), tail(cpuX+2) — cpuDir=LEFT 이므로 tail 이 오른쪽
  const cpuX = Math.max(0, Math.min(cols - 3, Math.floor(cols * 3 / 4) - 1));
  const cpuY = Math.max(0, Math.min(rows - 1, Math.floor(rows * 3 / 4)));
  // BF-579 §2-2: cpuCount=0 → 솔로 모드 (cpu 빈 배열)
  const cpu = eff.cpuCount <= 0 ? [] : [
    { x: cpuX,     y: cpuY },
    { x: cpuX + 1, y: cpuY },
    { x: cpuX + 2, y: cpuY },
  ].filter(c => c.x >= 0 && c.x < cols && c.y >= 0 && c.y < rows);

  // BF-584: cpuCount > 1 일 때 추가 CPU 지렁이 (extraCpus) 스폰
  // - 격자의 네 모서리 부근에 분산 배치 (head/body/tail 3칸, LEFT 방향)
  // - 점유 충돌 시 해당 위치 스킵 — 작은 격자에서는 일부 누락될 수 있음
  const extraCpus = spawnExtraCpus(cols, rows, eff.cpuCount, snake, cpu);

  const initialFood = spawnFoodWithMultiplier(
    cols, rows,
    [...snake, ...cpu, ...extraCpus.flatMap(e => e.body)],
  );
  const initialStats = createMultiplierStats();
  // 첫 번째 food 스폰 카운트 (명세 §7-4: 스폰 직후 카운트)
  if (initialFood !== null) {
    initialStats[String(initialFood.multiplier)].spawned++;
  }

  const enmStats = createEnemyStats();
  enmStats.enemiesSpawned = extraCpus.length; // 초기 스폰 카운트

  return {
    cols,
    rows,
    snake,
    dir:              DIR.RIGHT,
    nextDir:          DIR.RIGHT,
    cpu,
    cpuDir:           DIR.LEFT,
    food:             initialFood,
    score:            0,
    cpuScore:         0,
    highScore,
    status:           "playing", // 'playing' | 'paused' | 'gameover'
    result:           null,      // null | 'player_win' | 'cpu_win' | 'draw'
    deathCause:       null,      // null | 'wall' | 'self' | 'cpu_body' | 'head_on' | 'timeout'
    // BF-576: CPU 방문 이력 — 루프 감지용 (최근 15 틱)
    cpuRecentPositions: [],
    // BF-533: 배수 아이템 상태 필드 (명세 §6-2)
    pendingGrowth:    0,
    cpuPendingGrowth: 0,
    multiplierStats:  initialStats,
    // BF-545: 아이템 시스템 상태 필드 (명세 부록 A)
    item:                 null,   // 보드 위 아이템 { type, x, y, spawnedAt, expiresAt }
    heldItem:             null,   // 보유 슬롯 { type, acquiredAt, expiresAt }
    shieldActive:         false,
    cpuReverseTicksLeft:  0,
    speedStack:           [],     // [{ type, target, expiresAtMs }]
    lengthBurstActive:    false,
    lengthBeforeBurst:    0,
    lengthBurstEndMs:     0,
    cpuLengthBurstActive: false,
    cpuLengthBeforeBurst: 0,
    cpuLengthBurstEndMs:  0,
    itemStats:            createItemStats(),
    // BF-579: 게임 진행 중 참조용 effective settings (불변 — 변경 시 재시작 필요)
    settings:             eff,
    // BF-584: 추가 CPU 지렁이 (cpuCount > 1 일 때 N-1 개)
    extraCpus,
    // BF-629: 경쟁 레인 풀 + 적 통계
    extraFoods: [],
    extraItems: [],
    enemyStats: enmStats,
  };
}

/**
 * BF-584: 추가 CPU 지렁이 스폰 (cpuCount > 1 일 때 N-1 개).
 *
 * 배치 전략 — 격자의 네 모서리 부근 + 상단 중앙 (총 4개 후보 슬롯):
 *   slot 0: 우상 (cpuX, rows/4)
 *   slot 1: 좌하 (cols/4, cpuY)
 *   slot 2: 좌상 (cols/4, rows/4)
 *   slot 3: 상단 중앙 (midX, rows/8)
 *
 * 각 슬롯은 (x, y), (x+1, y), (x+2, y) 3칸 LEFT 방향 body.
 * 격자가 너무 작아 일부 슬롯이 점유되면 해당 슬롯은 skip (graceful 폴백).
 *
 * @param {number} cols
 * @param {number} rows
 * @param {number} cpuCount
 * @param {Array<{x:number,y:number}>} snake     점유된 player 셀
 * @param {Array<{x:number,y:number}>} mainCpu   점유된 main CPU 셀
 * @returns {Array<{body: Array<{x:number,y:number}>, dir: {x:number,y:number}, recentPositions: string[]}>}
 */
export function spawnExtraCpus(cols, rows, cpuCount, snake, mainCpu) {
  if (cpuCount <= 1) return [];

  const cpuX = Math.max(0, Math.min(cols - 3, Math.floor(cols * 3 / 4) - 1));
  const cpuY = Math.max(0, Math.min(rows - 1, Math.floor(rows * 3 / 4)));
  const midX = Math.floor(cols / 2);

  // 후보 슬롯 (head 시작 좌표)
  const slots = [
    { x: cpuX,                          y: Math.max(0, Math.floor(rows / 4)) },
    { x: Math.max(0, Math.floor(cols / 4) - 1), y: cpuY },
    { x: Math.max(0, Math.floor(cols / 4) - 1), y: Math.max(0, Math.floor(rows / 4)) },
    { x: Math.max(0, midX - 1),         y: Math.max(0, Math.floor(rows / 8)) },
  ];

  const occupied = new Set([
    ...snake.map(s   => `${s.x},${s.y}`),
    ...mainCpu.map(s => `${s.x},${s.y}`),
  ]);

  const extras = [];
  const need   = cpuCount - 1;

  for (let i = 0; i < slots.length && extras.length < need; i++) {
    const { x, y } = slots[i];
    const body = [
      { x: x,     y: y },
      { x: x + 1, y: y },
      { x: x + 2, y: y },
    ].filter(c => c.x >= 0 && c.x < cols && c.y >= 0 && c.y < rows);
    if (body.length !== 3) continue; // 격자 밖 → skip
    const overlap = body.some(c => occupied.has(`${c.x},${c.y}`));
    if (overlap) continue;
    extras.push({
      body,
      dir:               DIR.LEFT,
      recentPositions:   [],
      id:                `e${extras.length}`,  // BF-629: 안정 식별자
      score:             0,                    // BF-629: 누적 점수 (KPI 전용)
      pendingGrowth:     0,                    // BF-629: 성장 카운터
      dead:              false,                // BF-629: 사망 플래그
      respawnTicksLeft:  0,                    // BF-629: 재생성 대기 틱
    });
    body.forEach(c => occupied.add(`${c.x},${c.y}`));
  }
  return extras;
}

// ─────────────────────────────────────────────────────────────
// 배수 아이템 — BF-533 (명세 BF-531 §3)
// ─────────────────────────────────────────────────────────────

/** 배수별 색상 정의 (캔버스 렌더링용) */
export const MULTIPLIER_COLORS = {
  1: { fill: "#ffcc00", glow: "rgba(255,200,0,0.3)" },
  2: { fill: "#00cfff", glow: "rgba(0,200,255,0.4)" },
  4: { fill: "#cc44ff", glow: "rgba(180,60,255,0.5)" },
  8: { fill: "#ff4444", glow: "rgba(255,50,50,0.6)" },
};

/** 배수 가중치 테이블 (명세 §3-1) */
const MULTIPLIER_WEIGHTS = [
  { m: 1, weight: 55 },
  { m: 2, weight: 28 },
  { m: 4, weight: 13 },
  { m: 8, weight:  4 },
];
const TOTAL_WEIGHT = 100;

/**
 * 가중치 기반 배수 선택 (명세 §3-2).
 *
 * @returns {1|2|4|8}
 */
export function pickMultiplier() {
  const r = Math.random() * TOTAL_WEIGHT;
  let cumulative = 0;
  for (const { m, weight } of MULTIPLIER_WEIGHTS) {
    cumulative += weight;
    if (r < cumulative) return m;
  }
  return 1; // fallback
}

// ─────────────────────────────────────────────────────────────
// 먹이 생성
// ─────────────────────────────────────────────────────────────

/**
 * 격자 내 빈 셀 중 무작위 1개를 반환.
 * 빈 셀이 없으면 null 반환 (만점 상태).
 * 하위 호환성 유지 — {x, y} 만 반환 (multiplier 없음).
 *
 * @param {number} cols
 * @param {number} rows
 * @param {Array<{x:number,y:number}>} snake  점유된 셀 목록 (player + CPU 포함 가능)
 * @returns {{x:number,y:number}|null}
 */
export function spawnFoodCell(cols, rows, snake) {
  const occupied = new Set(snake.map((c) => `${c.x},${c.y}`));
  const empty = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!occupied.has(`${x},${y}`)) empty.push({ x, y });
    }
  }
  if (empty.length === 0) return null;
  return empty[Math.floor(Math.random() * empty.length)];
}

/**
 * 배수 포함 먹이 스폰 (명세 §3-3, §6-1).
 * 빈 셀이 없으면 null 반환 (EC-1).
 *
 * @param {number} cols
 * @param {number} rows
 * @param {Array<{x:number,y:number}>} occupiedCells
 * @returns {{x:number, y:number, multiplier:1|2|4|8}|null}
 */
export function spawnFoodWithMultiplier(cols, rows, occupiedCells) {
  const cell = spawnFoodCell(cols, rows, occupiedCells);
  if (cell === null) return null;
  return { ...cell, multiplier: pickMultiplier() };
}

/**
 * multiplierStats 초기 구조 (명세 §6-2).
 *
 * @returns {Object}
 */
export function createMultiplierStats() {
  return {
    "1": { spawned: 0, eaten: 0 },
    "2": { spawned: 0, eaten: 0 },
    "4": { spawned: 0, eaten: 0 },
    "8": { spawned: 0, eaten: 0 },
  };
}

// ─────────────────────────────────────────────────────────────
// 방향 전환 (반대 방향 무시)
// ─────────────────────────────────────────────────────────────

/**
 * 새 방향 적용. 현재 방향의 정반대이면 무시 (자살 방지).
 *
 * @param {GameState} state
 * @param {{x:number,y:number}} newDir
 * @returns {GameState}
 */
export function changeDirection(state, newDir) {
  const cur = state.dir;
  if (cur.x + newDir.x === 0 && cur.y + newDir.y === 0) return state;
  return { ...state, nextDir: newDir };
}

// ─────────────────────────────────────────────────────────────
// 충돌 검사 (순수 함수)
// ─────────────────────────────────────────────────────────────

/**
 * 머리가 벽(격자 경계 밖)에 충돌했는지 반환.
 *
 * @param {{x:number,y:number}} head
 * @param {number} cols
 * @param {number} rows
 * @returns {boolean}
 */
export function isWallCollision(head, cols, rows) {
  return head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows;
}

/**
 * 머리가 자기 몸(snake 배열의 임의 세그먼트)과 충돌했는지 반환.
 *
 * @param {{x:number,y:number}} head  새 머리 위치
 * @param {Array<{x:number,y:number}>} body  현재 snake 전체 (꼬리 포함)
 * @returns {boolean}
 */
export function isSelfCollision(head, body) {
  return body.some((seg) => seg.x === head.x && seg.y === head.y);
}

// ─────────────────────────────────────────────────────────────
// 게임 틱 — 플레이어 단독 (하위 호환성 유지, BF-504~BF-526)
// ─────────────────────────────────────────────────────────────

/**
 * 1 프레임 게임 로직 진행 (플레이어만, CPU 제외).
 * - BF-504~BF-526 테스트 하위 호환성 유지.
 * - BF-530 경쟁 모드에서는 tickFull() 을 사용한다.
 *
 * @param {GameState} state
 * @returns {GameState}
 */
export function tick(state) {
  if (state.status !== "playing") return state;

  const dir = state.nextDir;
  const head = state.snake[0];
  const newHead = { x: head.x + dir.x, y: head.y + dir.y };

  // 벽 충돌
  if (isWallCollision(newHead, state.cols, state.rows)) {
    const newHighScore = Math.max(state.highScore, state.score);
    return { ...state, dir, status: "gameover", highScore: newHighScore };
  }

  // 자기 몸 충돌
  if (isSelfCollision(newHead, state.snake)) {
    const newHighScore = Math.max(state.highScore, state.score);
    return { ...state, dir, status: "gameover", highScore: newHighScore };
  }

  // 먹이 수집 여부
  const ateFood =
    state.food !== null &&
    newHead.x === state.food.x &&
    newHead.y === state.food.y;

  // BF-533: pendingGrowth 카운터 방식 (명세 §4-2)
  const M = ateFood ? (state.food?.multiplier ?? 1) : 0;
  let newPendingGrowth = (state.pendingGrowth ?? 0) + M;

  let newSnake;
  if (newPendingGrowth > 0) {
    // 꼬리 유지 → 길이 +1
    newSnake = [newHead, ...state.snake];
    newPendingGrowth--;
  } else {
    // 꼬리 제거 → 길이 유지
    newSnake = [newHead, ...state.snake.slice(0, -1)];
  }

  // 점수: M × 10 (명세 §5-1), 기존 1x 동작: 1×10 = +10 그대로
  const newScore = ateFood ? state.score + M * 10 : state.score;

  // BF-533: multiplierStats eaten 카운트 + 새 food 스폰
  let newFood = state.food;
  let newMultiplierStats = state.multiplierStats ?? createMultiplierStats();
  if (ateFood) {
    // eaten 카운트
    newMultiplierStats = {
      ...newMultiplierStats,
      [String(M)]: {
        ...newMultiplierStats[String(M)],
        eaten: newMultiplierStats[String(M)].eaten + 1,
      },
    };
    // 새 food 스폰
    const spawned = spawnFoodWithMultiplier(state.cols, state.rows, newSnake);
    newFood = spawned;
    if (spawned !== null) {
      newMultiplierStats = {
        ...newMultiplierStats,
        [String(spawned.multiplier)]: {
          ...newMultiplierStats[String(spawned.multiplier)],
          spawned: newMultiplierStats[String(spawned.multiplier)].spawned + 1,
        },
      };
    }
  }

  return {
    ...state,
    snake:           newSnake,
    dir,
    food:            newFood,
    score:           newScore,
    highScore:       Math.max(state.highScore, newScore),
    status:          "playing",
    pendingGrowth:   newPendingGrowth,
    multiplierStats: newMultiplierStats,
  };
}

// ─────────────────────────────────────────────────────────────
// CPU AI — 전방 시야 탐색 (s1 §3.3)
// ─────────────────────────────────────────────────────────────

/**
 * 주어진 방향으로 최대 maxDepth 칸을 직선 탐색해 안전한 거리(safeLen)를 반환.
 * 장애물(벽·점유 셀)을 만나면 즉시 멈춘다.
 *
 * @param {{x:number,y:number}} cpuHead
 * @param {{x:number,y:number}} dir
 * @param {number} maxDepth
 * @param {number} cols
 * @param {number} rows
 * @param {Set<string>} occupiedSet
 * @returns {number}
 */
function lookAhead(cpuHead, dir, maxDepth, cols, rows, occupiedSet) {
  let pos = cpuHead;
  let count = 0;
  while (count < maxDepth) {
    pos = { x: pos.x + dir.x, y: pos.y + dir.y };
    if (isWallCollision(pos, cols, rows) || occupiedSet.has(`${pos.x},${pos.y}`)) break;
    count++;
  }
  return count;
}

// ─────────────────────────────────────────────────────────────
// CPU AI — 음식 방향 점수 (s1 §3.4)
// ─────────────────────────────────────────────────────────────

/**
 * 후보 방향 선택 시 음식에 가까워지는 정도를 점수로 반환.
 * 가까워지면 1.0, 같은 거리 0.5, 멀어지면 0.0.
 *
 * @param {{x:number,y:number}} cpuHead
 * @param {{x:number,y:number}} candidateDir
 * @param {{x:number,y:number}|null} food
 * @returns {number}
 */
function computeFoodScore(cpuHead, candidateDir, food) {
  if (!food) return 0;
  const nextPos = { x: cpuHead.x + candidateDir.x, y: cpuHead.y + candidateDir.y };
  const distBefore = Math.abs(cpuHead.x - food.x) + Math.abs(cpuHead.y - food.y);
  const distAfter  = Math.abs(nextPos.x - food.x) + Math.abs(nextPos.y - food.y);
  if (distAfter < distBefore) return 1.0;
  if (distAfter === distBefore) return 0.5;
  return 0.0;
}

// ─────────────────────────────────────────────────────────────
// CPU AI — 방향 결정 (s1 §3.1~§3.2)
// ─────────────────────────────────────────────────────────────

/**
 * CPU 지렁이의 다음 이동 방향 결정 (스코어 기반 greedy — s1 §3 normal 난이도 기본).
 *
 * 알고리즘:
 * 1. getValidDirections: 반대 방향 + 즉시 벽/점유 셀 제거 (s1 §3.2)
 * 2. 각 후보에 lookAhead(safeLen) + computeFoodScore 계산 (s1 §3.3~§3.4)
 * 3. avoidanceThreshold 미만이면 대폭 감점, 이상이면 생존·음식 가중치 합산
 * 4. 최고 점수 방향 반환 (동점 시 배열 앞 항목 우선)
 * 5. 후보 없으면 현재 방향 유지 (s1 §5.1)
 *
 * @param {GameState} state
 * @param {"normal"|"easy"} [difficulty="normal"]
 * @returns {{x:number,y:number}}
 */
export function cpuChooseDir(state, difficulty = "normal") {
  const { cpu, cpuDir, snake, food, cols, rows } = state;
  if (!cpu || cpu.length === 0) return cpuDir;

  const params  = DIFFICULTY_PARAMS[difficulty] ?? DIFFICULTY_PARAMS.normal;
  const cpuHead = cpu[0];
  const allDirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];

  // 점유 셀: player 전체 + CPU 몸통(머리 제외 — 머리는 이동 후 위치)
  const occupiedSet = new Set([
    ...snake.map(s => `${s.x},${s.y}`),
    ...cpu.slice(1).map(s => `${s.x},${s.y}`),
  ]);

  // §3.2 유효 방향 후보: 반대 방향 제거 + 즉시 충돌 제거
  const candidates = allDirs.filter(d => {
    // 반대 방향 (자살) 제거
    if (d.x + cpuDir.x === 0 && d.y + cpuDir.y === 0) return false;
    const nx = cpuHead.x + d.x;
    const ny = cpuHead.y + d.y;
    if (isWallCollision({ x: nx, y: ny }, cols, rows)) return false;
    if (occupiedSet.has(`${nx},${ny}`)) return false;
    return true;
  });

  // §5.1 탈출 불가 → 현재 방향 유지
  if (candidates.length === 0) return cpuDir;

  // BF-576 §AC2: 루프 감지 — 동일 좌표 3회 이상 재방문 시 음식 방향 강제
  // cpuRecentPositions 에 현재 head 좌표가 3회 이상 나타나면 루프로 판단해
  // safeLen 스코어링을 우회하고 Manhattan 거리 최소 방향으로 즉시 전환.
  const recentPositions = state.cpuRecentPositions || [];
  const headKey = `${cpuHead.x},${cpuHead.y}`;
  const visitCount = recentPositions.filter(p => p === headKey).length;
  if (visitCount >= 3 && food !== null) {
    const foodPriority = [...candidates].sort((a, b) => {
      const posA = { x: cpuHead.x + a.x, y: cpuHead.y + a.y };
      const posB = { x: cpuHead.x + b.x, y: cpuHead.y + b.y };
      const distA = Math.abs(posA.x - food.x) + Math.abs(posA.y - food.y);
      const distB = Math.abs(posB.x - food.x) + Math.abs(posB.y - food.y);
      return distA - distB;
    });
    return foodPriority[0];
  }

  // §3.1 각 후보 점수 계산
  // BF-576: safeLen 을 visionRange 로 정규화 (0~1) — foodScore(0~1) 와 스케일 통일.
  // 기존 비정규화 공식에서는 safeLen(0~8) 이 foodScore(0~1) 를 압도해
  // 개방 공간 방향이 음식 방향보다 항상 높은 점수를 받는 결함이 발생했음.
  const scored = candidates.map(dir => {
    const safeLen   = lookAhead(cpuHead, dir, params.visionRange, cols, rows, occupiedSet);
    const foodScore = computeFoodScore(cpuHead, dir, food);
    let score;
    if (safeLen < params.avoidanceThreshold) {
      // BF-576: 위험 패널티 + foodScore 가중치 보존.
      // 구 공식 (safeLen*0.1 만) 은 음식이 벽 근처에 있을 때
      // "안전한 비음식 방향" 에 역전되는 문제가 있었음.
      // → foodScore 항목을 유지해 "위험하지만 음식으로 가는 방향" 이
      //   "안전한 비음식 방향" 보다 높은 점수를 받을 수 있도록 함.
      score = safeLen * 0.1 + foodScore * params.foodPriorityWeight;
    } else {
      // BF-576: safeLen 을 visionRange 로 정규화 (0~1 스케일 통일)
      score = (safeLen / params.visionRange) * (1 - params.foodPriorityWeight)
            + foodScore * params.foodPriorityWeight;
    }
    return { dir, score };
  });

  // 최고 점수 방향 선택 (내림차순, 동점 시 배열 앞 항목 우선)
  scored.sort((a, b) => b.score - a.score);
  return scored[0].dir;
}

// ─────────────────────────────────────────────────────────────
// 경쟁 게임 틱 — player + CPU 동시 처리 (BF-530, s2 §2~§3)
// ─────────────────────────────────────────────────────────────

/**
 * 1 프레임 경쟁 게임 로직 진행 (player + CPU 동시 처리).
 *
 * 충돌 검사 순서 (s2 §2 주의):
 *   T4 (head-on) → T1 (벽) → T2 (자기 몸) → T3 (상대방 몸통)
 *
 * 승패 판정 (s2 §3):
 *   player 사망 & CPU 생존 → result: "cpu_win"
 *   CPU 사망 & player 생존 → result: "player_win"
 *   동시 사망               → result: "draw"
 *
 * KPI 지원 (s2 §6-1):
 *   deathCause: "wall" | "self" | "cpu_body" | "head_on" | null
 *
 * @param {GameState} state
 * @param {"normal"|"easy"} [difficulty="normal"]
 * @returns {GameState}
 */
export function tickFull(state, difficulty = "normal") {
  if (state.status !== "playing") return state;

  // ── 1. CPU 방향 결정 ─────────────────────────────────────
  const newCpuDir = cpuChooseDir(state, difficulty);
  const cpuHead   = state.cpu[0];
  // BF-576: 방문 이력 갱신 (최근 15 틱) — 다음 틱에서 루프 감지에 사용
  const newCpuRecentPositions = [
    ...(state.cpuRecentPositions || []),
    `${cpuHead.x},${cpuHead.y}`,
  ].slice(-15);
  const newCpuHead = { x: cpuHead.x + newCpuDir.x, y: cpuHead.y + newCpuDir.y };

  // ── 2. 플레이어 이동 방향 ─────────────────────────────────
  const dir    = state.nextDir;
  const head   = state.snake[0];
  const newHead = { x: head.x + dir.x, y: head.y + dir.y };

  // ── 3. 충돌 검사 (T4 우선 — s2 §2 주의) ──────────────────
  // T4: 두 머리가 동일 셀로 이동 (head-on, BF-572)
  const headOnNormal =
    newHead.x === newCpuHead.x && newHead.y === newCpuHead.y;

  // T4-SWAP: 교차 이동 — 두 머리가 서로 위치를 교환 (BF-572)
  const headOnSwap =
    newHead.x === cpuHead.x  && newHead.y === cpuHead.y &&
    newCpuHead.x === head.x  && newCpuHead.y === head.y;

  const headOn = headOnNormal || headOnSwap;

  // T1: 벽 충돌
  const playerHitWall = isWallCollision(newHead,    state.cols, state.rows);
  const cpuHitWall    = isWallCollision(newCpuHead, state.cols, state.rows);

  // T2: 자기 몸 충돌
  const playerHitSelf = isSelfCollision(newHead,    state.snake);
  const cpuHitSelf    = isSelfCollision(newCpuHead, state.cpu);

  // T3 제거 — 상대방 몸통 통과 허용 (BF-572)
  const playerDead = headOn || playerHitWall || playerHitSelf;
  const cpuDead    = headOn || cpuHitWall    || cpuHitSelf;

  // ── 4. 게임 종료 처리 ─────────────────────────────────────
  if (playerDead || cpuDead) {
    let result;
    let deathCause = null;

    if (playerDead && cpuDead) {
      result = "draw";
      deathCause = headOn ? "head_on" : (playerHitWall ? "wall" : "self");
    } else if (playerDead) {
      result = "cpu_win";
      if (headOn)              deathCause = "head_on";
      else if (playerHitWall)  deathCause = "wall";
      else if (playerHitSelf)  deathCause = "self";
    } else {
      result = "player_win";
      deathCause = null; // 플레이어는 생존
    }

    const newHighScore = Math.max(state.highScore, state.score);
    return {
      ...state,
      dir,
      cpuDir:     newCpuDir,
      status:     "gameover",
      highScore:  newHighScore,
      result,
      deathCause,
    };
  }

  // ── 5. 먹이 처리 ─────────────────────────────────────────
  // player 가 먼저 수집, CPU 는 player 가 먹지 않은 경우만 수집 (s2 §4-1)
  const playerAteFood =
    state.food !== null &&
    newHead.x === state.food.x &&
    newHead.y === state.food.y;

  const cpuAteFood =
    state.food !== null &&
    !playerAteFood &&
    newCpuHead.x === state.food.x &&
    newCpuHead.y === state.food.y;

  // BF-533: 배수 적용 (명세 §4-2, §5)
  const foodM = state.food?.multiplier ?? 1;
  const playerM = playerAteFood ? foodM : 0;
  const cpuM    = cpuAteFood    ? foodM : 0;

  // pendingGrowth 카운터 방식 (명세 §4-2)
  let newPlayerPending = (state.pendingGrowth    ?? 0) + playerM;
  let newCpuPending    = (state.cpuPendingGrowth ?? 0) + cpuM;

  let newSnake;
  if (newPlayerPending > 0) {
    newSnake = [newHead, ...state.snake];
    newPlayerPending--;
  } else {
    newSnake = [newHead, ...state.snake.slice(0, -1)];
  }

  let newCPU;
  if (newCpuPending > 0) {
    newCPU = [newCpuHead, ...state.cpu];
    newCpuPending--;
  } else {
    newCPU = [newCpuHead, ...state.cpu.slice(0, -1)];
  }

  // 점수: M × 10 (명세 §5-1, §5-2)
  const newScore    = playerAteFood ? state.score    + playerM * 10 : state.score;
  const newCPUScore = cpuAteFood    ? state.cpuScore + cpuM    * 10 : state.cpuScore;

  // BF-533: multiplierStats 카운트 + 새 food 스폰
  let newMultiplierStats = state.multiplierStats ?? createMultiplierStats();
  if (playerAteFood || cpuAteFood) {
    // eaten 카운트 (명세 §6-2: eaten = player+CPU 합산)
    newMultiplierStats = {
      ...newMultiplierStats,
      [String(foodM)]: {
        ...newMultiplierStats[String(foodM)],
        eaten: newMultiplierStats[String(foodM)].eaten + 1,
      },
    };
  }

  // 새 food: 두 지렁이 모두 피해서 스폰 (s2 EC-1)
  let newFood = state.food;
  if (playerAteFood || cpuAteFood) {
    const spawned = spawnFoodWithMultiplier(state.cols, state.rows, [...newSnake, ...newCPU]);
    newFood = spawned;
    if (spawned !== null) {
      newMultiplierStats = {
        ...newMultiplierStats,
        [String(spawned.multiplier)]: {
          ...newMultiplierStats[String(spawned.multiplier)],
          spawned: newMultiplierStats[String(spawned.multiplier)].spawned + 1,
        },
      };
    }
  }

  return {
    ...state,
    snake:               newSnake,
    dir,
    cpu:                 newCPU,
    cpuDir:              newCpuDir,
    food:                newFood,
    score:               newScore,
    cpuScore:            newCPUScore,
    highScore:           Math.max(state.highScore, newScore),
    status:              "playing",
    result:              null,
    deathCause:          null,
    pendingGrowth:       newPlayerPending,
    cpuPendingGrowth:    newCpuPending,
    multiplierStats:     newMultiplierStats,
    cpuRecentPositions:  newCpuRecentPositions, // BF-576
  };
}

// ─────────────────────────────────────────────────────────────
// 재시작
// ─────────────────────────────────────────────────────────────

/**
 * 게임 재시작 (highScore 유지, CPU 상태도 초기화).
 * BF-579: 두 번째 인자 settings 를 전달하면 새 게임에 적용. 미전달 시 state.settings 재사용.
 *
 * @param {GameState} state  현재 상태 (cols/rows/highScore 참조)
 * @param {Partial<typeof SNAKE_SETTINGS_DEFAULTS>} [settings]
 * @returns {GameState}
 */
export function restartGame(state, settings) {
  const next = settings ?? state.settings ?? SNAKE_SETTINGS_DEFAULTS;
  return createInitialState(state.cols, state.rows, state.highScore, next);
}

// ─────────────────────────────────────────────────────────────
// 아이템 시스템 — BF-545 (명세 BF-538 §2~§10, BF-544 §6)
// ─────────────────────────────────────────────────────────────

/**
 * Feature Flag — 기본값 false (기존 사용자 영향 0, 명세 §9-1).
 * true 로 변경 시 아이템 스폰 타이머 활성화.
 */
export const ITEMS_ENABLED = false;

/**
 * 스폰 비율 파라미터 — 0: 비활성, 1: 정상 (명세 §9-2).
 * ITEMS_ENABLED=true & ITEM_SPAWN_RATE > 0 일 때 아이템 등장.
 */
export const ITEM_SPAWN_RATE = 0;

/** 아이템 가중치 테이블 (명세 §6-2). 합계 100. */
export const ITEM_WEIGHTS = [
  { type: "SPEED_UP",     weight: 25 },
  { type: "SLOW_DOWN",    weight: 25 },
  { type: "LENGTH_BURST", weight: 15 },
  { type: "SHIELD",       weight: 20 },
  { type: "REVERSE",      weight: 15 },
];
export const ITEM_TOTAL_WEIGHT = 100;

/** 아이템 카테고리 (명세 §1-2). */
export const ITEM_CATEGORY = {
  SPEED_UP:     "INSTANT",
  SLOW_DOWN:    "INSTANT",
  LENGTH_BURST: "INSTANT",
  SHIELD:       "HOLDABLE",
  REVERSE:      "HOLDABLE",
};

/** 아이템 효과 지속 시간 ms (명세 §2). */
export const ITEM_DURATION_MS = {
  SPEED_UP:     5000,   // 5초
  SLOW_DOWN:    5000,   // 5초
  LENGTH_BURST: 5000,   // 5초
  SHIELD:       30000,  // 보유 후 30초
  REVERSE:      3000,   // 발동 후 3초
};

/** 보드 위 아이템 수명 ms — 10초 경과 시 자동 소멸 (명세 §6-1). */
export const ITEM_LIFESPAN_MS = 10000;

/** 보유형 아이템 자동 소멸 시간 ms (명세 §4-1). */
export const HOLDABLE_EXPIRE_MS = 30000;

// ─────────────────────────────────────────────────────────────
// 아이템 KPI 통계 구조 생성 (명세 §10-1)
// ─────────────────────────────────────────────────────────────

/**
 * 아이템별 누적 통계 초기 구조 (명세 §10-1).
 *
 * @returns {Object}
 */
export function createItemStats() {
  return {
    SPEED_UP: {
      spawned: 0, acquired: 0, expired: 0, durationCompleted: 0,
    },
    SLOW_DOWN: {
      spawned: 0, acquired: 0, expired: 0, durationCompleted: 0,
    },
    LENGTH_BURST: {
      spawned: 0, acquired: 0, expired: 0, durationCompleted: 0,
      selfDeathDuringBurst: 0,
    },
    SHIELD: {
      spawned: 0, acquired: 0, expired: 0, used: 0,
      shieldTriggered: 0, dropped: 0,
    },
    REVERSE: {
      spawned: 0, acquired: 0, expired: 0, used: 0,
      cpuConsumed: 0, dropped: 0,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// 아이템 스폰 (명세 §6-2)
// ─────────────────────────────────────────────────────────────

/**
 * 가중치 기반 아이템 타입 선택 (명세 §6-2).
 *
 * @returns {string} "SPEED_UP" | "SLOW_DOWN" | "LENGTH_BURST" | "SHIELD" | "REVERSE"
 */
export function pickItemType() {
  const r = Math.random() * ITEM_TOTAL_WEIGHT;
  let cumulative = 0;
  for (const { type, weight } of ITEM_WEIGHTS) {
    cumulative += weight;
    if (r < cumulative) return type;
  }
  return "SPEED_UP"; // fallback
}

/**
 * 아이템 스폰 셀 선택 — snake/cpu/food 셀 제외 (명세 §6-1, EC-10).
 *
 * @param {number} cols
 * @param {number} rows
 * @param {Array<{x:number,y:number}>} snake
 * @param {Array<{x:number,y:number}>} cpu
 * @param {{x:number,y:number}|null} food
 * @returns {{x:number,y:number}|null}
 */
export function spawnItemCell(cols, rows, snake, cpu, food) {
  const occupied = new Set([...snake, ...cpu].map(c => `${c.x},${c.y}`));
  if (food !== null && food !== undefined) occupied.add(`${food.x},${food.y}`);
  const empty = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!occupied.has(`${x},${y}`)) empty.push({ x, y });
    }
  }
  if (empty.length === 0) return null;
  return empty[Math.floor(Math.random() * empty.length)];
}

// ─────────────────────────────────────────────────────────────
// 아이템 효과 적용 (내부 헬퍼)
// ─────────────────────────────────────────────────────────────

/**
 * INSTANT 아이템 효과를 state에 적용 (내부 헬퍼).
 * lengthBurst: 즉시 세그먼트 추가, speedStack에 항목 추가.
 *
 * @param {GameState} state
 * @param {string} itemType  아이템 타입
 * @param {"player"|"cpu"} target  획득 주체
 * @param {number} nowMs  현재 시각 (ms)
 * @returns {GameState}
 */
function applyInstantEffect(state, itemType, target, nowMs) {
  const expiresAtMs = nowMs + ITEM_DURATION_MS[itemType];

  if (itemType === "SPEED_UP" || itemType === "SLOW_DOWN") {
    const newEntry = { type: itemType, target, expiresAtMs };
    // 동일 target 의 동일 type 재획득 → 타이머 리셋 (명세 §7-1)
    const filtered = (state.speedStack || []).filter(
      e => !(e.type === itemType && e.target === target)
    );
    return { ...state, speedStack: [...filtered, newEntry] };
  }

  if (itemType === "LENGTH_BURST") {
    const isPlayer = target === "player";
    const snake    = isPlayer ? state.snake : state.cpu;
    const maxCells = Math.floor(state.cols * state.rows * 0.8);
    const newLen   = Math.min(snake.length * 10, maxCells);
    const addCount = Math.max(0, newLen - snake.length);
    const tail     = snake[snake.length - 1];
    const extraSegs = Array.from({ length: addCount }, () => ({ ...tail }));

    if (isPlayer) {
      return {
        ...state,
        snake:              [...state.snake, ...extraSegs],
        lengthBurstActive:  true,
        lengthBeforeBurst:  state.snake.length,
        lengthBurstEndMs:   expiresAtMs,
      };
    } else {
      return {
        ...state,
        cpu:                  [...state.cpu, ...extraSegs],
        cpuLengthBurstActive: true,
        cpuLengthBeforeBurst: state.cpu.length,
        cpuLengthBurstEndMs:  expiresAtMs,
      };
    }
  }

  return state;
}

// ─────────────────────────────────────────────────────────────
// 아이템 타이머 업데이트 (명세 §5-1, §5-4)
// ─────────────────────────────────────────────────────────────

/**
 * 매 틱 호출 — 아이템 타이머 만료 체크 및 효과 복원.
 *
 * 처리 항목:
 * 1. speedStack 만료 항목 제거 + durationCompleted KPI
 * 2. lengthBurst 만료 → 길이 복원 (명세 §3-3)
 * 3. cpuLengthBurst 만료 → CPU 길이 복원
 * 4. heldItem 만료 → null + expired KPI (명세 §5-4)
 * 5. 보드 위 item 만료 → null + expired KPI (명세 §6-1)
 * 6. cpuReverseTicksLeft 감소
 *
 * @param {GameState} state
 * @param {number} nowMs
 * @returns {GameState}
 */
export function updateItemTimers(state, nowMs) {
  let ns = state;

  // ── 1. speedStack 만료 ──────────────────────────────────
  const expiredSpeed  = (ns.speedStack || []).filter(e => nowMs >= e.expiresAtMs);
  const activeSpeed   = (ns.speedStack || []).filter(e => nowMs < e.expiresAtMs);
  let newItemStats = ns.itemStats ? { ...ns.itemStats } : createItemStats();

  for (const e of expiredSpeed) {
    const t = e.type;
    newItemStats[t] = {
      ...newItemStats[t],
      durationCompleted: newItemStats[t].durationCompleted + 1,
    };
  }
  ns = { ...ns, speedStack: activeSpeed, itemStats: newItemStats };

  // ── 2. player LENGTH_BURST 만료 ─────────────────────────
  if (ns.lengthBurstActive && nowMs >= ns.lengthBurstEndMs) {
    const restoreLen = Math.min(ns.lengthBeforeBurst, ns.snake.length);
    const updStats   = {
      ...ns.itemStats,
      LENGTH_BURST: {
        ...ns.itemStats.LENGTH_BURST,
        durationCompleted: ns.itemStats.LENGTH_BURST.durationCompleted + 1,
      },
    };
    ns = {
      ...ns,
      snake:             ns.snake.slice(0, restoreLen),
      lengthBurstActive: false,
      lengthBeforeBurst: 0,
      lengthBurstEndMs:  0,
      itemStats:         updStats,
    };
  }

  // ── 3. CPU LENGTH_BURST 만료 ─────────────────────────────
  if (ns.cpuLengthBurstActive && nowMs >= ns.cpuLengthBurstEndMs) {
    const restoreLen = Math.min(ns.cpuLengthBeforeBurst, ns.cpu.length);
    ns = {
      ...ns,
      cpu:                  ns.cpu.slice(0, restoreLen),
      cpuLengthBurstActive: false,
      cpuLengthBeforeBurst: 0,
      cpuLengthBurstEndMs:  0,
    };
  }

  // ── 4. heldItem 만료 ────────────────────────────────────
  if (ns.heldItem !== null && nowMs >= ns.heldItem.expiresAt) {
    const t = ns.heldItem.type;
    const updStats = {
      ...ns.itemStats,
      [t]: { ...ns.itemStats[t], expired: ns.itemStats[t].expired + 1 },
    };
    ns = { ...ns, heldItem: null, itemStats: updStats };
  }

  // ── 5. 보드 위 item 만료 ────────────────────────────────
  if (ns.item !== null && nowMs >= ns.item.expiresAt) {
    const t = ns.item.type;
    const updStats = {
      ...ns.itemStats,
      [t]: { ...ns.itemStats[t], expired: ns.itemStats[t].expired + 1 },
    };
    ns = { ...ns, item: null, itemStats: updStats };
  }

  // ── 6. cpuReverseTicksLeft 감소 ─────────────────────────
  if (ns.cpuReverseTicksLeft > 0) {
    ns = { ...ns, cpuReverseTicksLeft: ns.cpuReverseTicksLeft - 1 };
  }

  return ns;
}

// ─────────────────────────────────────────────────────────────
// 보유형 아이템 발동 (명세 §5-3)
// ─────────────────────────────────────────────────────────────

/**
 * Z 키 입력 시 보유 아이템 발동.
 * playing 상태 + heldItem 존재 시에만 처리.
 *
 * @param {GameState} state
 * @returns {GameState}
 */
export function useHeldItem(state) {
  if (state.status !== "playing") return state;
  if (!state.heldItem) return state;

  const { type } = state.heldItem;
  const updStats = {
    ...state.itemStats,
    [type]: { ...state.itemStats[type], used: (state.itemStats[type].used || 0) + 1 },
  };

  let ns = { ...state, heldItem: null, itemStats: updStats };

  if (type === "SHIELD") {
    ns = { ...ns, shieldActive: true };
  } else if (type === "REVERSE") {
    ns = { ...ns, cpuReverseTicksLeft: 25 };  // 명세 §4-3 (25틱)
  }

  return ns;
}

// ─────────────────────────────────────────────────────────────
// 경쟁 게임 틱 — 아이템 시스템 포함 (BF-545)
// ─────────────────────────────────────────────────────────────

/**
 * 아이템 시스템을 포함한 1 프레임 경쟁 게임 로직.
 *
 * tickFull 을 확장하여 아이템 획득·효과·방패 인터셉트·역전탄을 처리.
 * ITEMS_ENABLED=false 또는 아이템이 없는 경우에도 안전하게 동작
 * (기존 tickFull 하위 호환 보장 — AC-3).
 *
 * @param {GameState} state
 * @param {number} [nowMs=Date.now()]
 * @param {boolean} [movePlayer=true]  이번 틱에 player 이동 여부 (속도 효과 지원)
 * @param {boolean} [moveCpu=true]     이번 틱에 CPU 이동 여부
 * @returns {GameState}
 */
export function tickWithItems(state, nowMs = Date.now(), movePlayer = true, moveCpu = true) {
  if (state.status !== "playing") return state;

  // ── 0. 타이머 업데이트 (이동 전) ─────────────────────────
  let s = updateItemTimers(state, nowMs);

  // ── 1. CPU 방향 결정 (REVERSE 오버라이드 포함) ────────────
  let newCpuDir = moveCpu ? cpuChooseDir(s) : s.cpuDir;
  if (moveCpu && s.cpuReverseTicksLeft > 0) {
    // 역전탄: CPU 이동 방향 180도 반전 (명세 §4-3)
    newCpuDir = { x: -newCpuDir.x, y: -newCpuDir.y };
  }

  // ── 2. 새 헤드 위치 계산 ─────────────────────────────────
  const dir     = s.nextDir;
  const head    = s.snake[0];
  // BF-635: cpu=[] (솔로 모드) 시 cpuHead 가 undefined → 좌표 접근 TypeError 방지
  const cpuHead = s.cpu.length > 0 ? s.cpu[0] : null;
  // BF-635: cpu 가 없으면 CPU 이동/충돌 처리 전체 비활성화
  const canMoveCpu = moveCpu && cpuHead !== null;
  // BF-576: 방문 이력 갱신 (최근 15 틱)
  const newCpuRecentPositions = cpuHead
    ? [...(s.cpuRecentPositions || []), `${cpuHead.x},${cpuHead.y}`].slice(-15)
    : (s.cpuRecentPositions || []);
  const newHead    = movePlayer
    ? { x: head.x    + dir.x,       y: head.y    + dir.y       }
    : { x: head.x,                  y: head.y                  };  // 이동 없음
  const newCpuHead = canMoveCpu
    ? { x: cpuHead.x + newCpuDir.x, y: cpuHead.y + newCpuDir.y }
    : cpuHead
      ? { x: cpuHead.x,             y: cpuHead.y               }  // moveCpu=false 이동 없음
      : { x: 0,                     y: 0                       }; // 솔로 모드 더미값

  // ── 3. 충돌 검사 ──────────────────────────────────────────
  // T4: head-on (양쪽 모두 이동할 때만 가능)
  const headOnNormal = movePlayer && canMoveCpu &&
    newHead.x === newCpuHead.x && newHead.y === newCpuHead.y;

  // T4-SWAP: 교차 이동 — 두 머리가 서로 위치를 교환 (BF-572)
  const headOnSwap = movePlayer && canMoveCpu &&
    newHead.x === cpuHead.x  && newHead.y === cpuHead.y &&
    newCpuHead.x === head.x  && newCpuHead.y === head.y;

  const headOn = headOnNormal || headOnSwap;

  const playerHitWall = movePlayer  && isWallCollision(newHead,    s.cols, s.rows);
  const cpuHitWall    = canMoveCpu  && isWallCollision(newCpuHead, s.cols, s.rows);
  const playerHitSelf = movePlayer  && isSelfCollision(newHead,    s.snake);
  const cpuHitSelf    = canMoveCpu  && isSelfCollision(newCpuHead, s.cpu);
  // T3 제거 — 상대방 몸통 통과 허용 (BF-572)

  let playerDead = headOn || playerHitWall || playerHitSelf;
  const cpuDead  = headOn || cpuHitWall    || cpuHitSelf;

  // ── 4. SHIELD 인터셉트 (명세 §4-2) ───────────────────────
  let shieldTriggered = false;
  if (playerDead && s.shieldActive) {
    playerDead      = false;
    shieldTriggered = true;
  }

  // ── 5. 게임 종료 처리 ─────────────────────────────────────
  if (playerDead || cpuDead) {
    let result, deathCause = null;

    if (playerDead && cpuDead) {
      result     = "draw";
      deathCause = headOn ? "head_on"
        : playerHitWall ? "wall"
        : "self";
    } else if (playerDead) {
      result = "cpu_win";
      if      (headOn)          deathCause = "head_on";
      else if (playerHitWall)   deathCause = "wall";
      else if (playerHitSelf)   deathCause = "self";
    } else {
      result     = "player_win";
      deathCause = null;
    }

    // LENGTH_BURST 중 자멸 KPI (명세 §10-1)
    let endStats = { ...s.itemStats };
    if (playerDead && s.lengthBurstActive) {
      endStats = {
        ...endStats,
        LENGTH_BURST: {
          ...endStats.LENGTH_BURST,
          selfDeathDuringBurst: endStats.LENGTH_BURST.selfDeathDuringBurst + 1,
        },
      };
    }

    const newHighScore = Math.max(s.highScore, s.score);
    return {
      ...s,
      dir,
      cpuDir:      newCpuDir,
      status:      "gameover",
      highScore:   newHighScore,
      result,
      deathCause,
      shieldActive: false,
      itemStats:   endStats,
    };
  }

  // ── 6. 방패 소멸 처리 ─────────────────────────────────────
  let newShieldActive = shieldTriggered ? false : s.shieldActive;
  let afterShieldStats = s.itemStats;
  if (shieldTriggered) {
    afterShieldStats = {
      ...afterShieldStats,
      SHIELD: {
        ...afterShieldStats.SHIELD,
        shieldTriggered: afterShieldStats.SHIELD.shieldTriggered + 1,
      },
    };
  }

  // ── 7. 먹이 처리 ─────────────────────────────────────────
  const playerAteFood = movePlayer &&
    s.food !== null &&
    newHead.x === s.food.x && newHead.y === s.food.y;
  const cpuAteFood    = canMoveCpu && !playerAteFood &&  // BF-635: canMoveCpu (null 가드)
    s.food !== null &&
    newCpuHead.x === s.food.x && newCpuHead.y === s.food.y;

  const foodM     = s.food?.multiplier ?? 1;
  const playerM   = playerAteFood ? foodM : 0;
  const cpuM      = cpuAteFood    ? foodM : 0;

  let newPlayerPending = (s.pendingGrowth    ?? 0) + playerM;
  let newCpuPending    = (s.cpuPendingGrowth ?? 0) + cpuM;

  // ── 8. 뱀 이동 (pendingGrowth 적용) ─────────────────────
  let newSnake;
  if (movePlayer) {
    if (newPlayerPending > 0) {
      newSnake = [newHead, ...s.snake];
      newPlayerPending--;
    } else {
      newSnake = [newHead, ...s.snake.slice(0, -1)];
    }
  } else {
    newSnake = s.snake; // player 이동 없음
  }

  let newCPU;
  if (canMoveCpu) {  // BF-635: canMoveCpu (cpu=[] 솔로 모드 guard)
    if (newCpuPending > 0) {
      newCPU = [newCpuHead, ...s.cpu];
      newCpuPending--;
    } else {
      newCPU = [newCpuHead, ...s.cpu.slice(0, -1)];
    }
  } else {
    newCPU = s.cpu; // CPU 이동 없음 (또는 솔로 모드)
  }

  // ── 9. 점수 + multiplierStats ────────────────────────────
  const newScore    = playerAteFood ? s.score    + playerM * 10 : s.score;
  const newCPUScore = cpuAteFood    ? s.cpuScore + cpuM    * 10 : s.cpuScore;

  let newMultiplierStats = s.multiplierStats ?? createMultiplierStats();
  if (playerAteFood || cpuAteFood) {
    newMultiplierStats = {
      ...newMultiplierStats,
      [String(foodM)]: {
        ...newMultiplierStats[String(foodM)],
        eaten: newMultiplierStats[String(foodM)].eaten + 1,
      },
    };
  }

  // 새 food 스폰
  let newFood = s.food;
  if (playerAteFood || cpuAteFood) {
    const spawned = spawnFoodWithMultiplier(s.cols, s.rows, [...newSnake, ...newCPU]);
    newFood = spawned;
    if (spawned !== null) {
      newMultiplierStats = {
        ...newMultiplierStats,
        [String(spawned.multiplier)]: {
          ...newMultiplierStats[String(spawned.multiplier)],
          spawned: newMultiplierStats[String(spawned.multiplier)].spawned + 1,
        },
      };
    }
  }

  // ── 10. 아이템 획득 처리 ────────────────────────────────
  let curItem     = s.item;
  let curHeld     = s.heldItem;
  let curStats    = { ...afterShieldStats };
  // snake/cpu 는 이동 후 위치를 포함해야 LENGTH_BURST 가 올바른 길이를 기준으로 10배 적용
  let stateAfterItem = {
    ...s,
    snake:        newSnake,
    cpu:          newCPU,
    shieldActive: newShieldActive,
    itemStats:    curStats,
  };

  if (curItem !== null) {
    const playerHitItem = movePlayer && newHead.x === curItem.x && newHead.y === curItem.y;
    const cpuHitItem    = canMoveCpu && !playerHitItem &&  // BF-635: canMoveCpu (null 가드)
      newCpuHead.x === curItem.x && newCpuHead.y === curItem.y;

    if (playerHitItem) {
      const itype = curItem.type;
      curStats = {
        ...curStats,
        [itype]: { ...curStats[itype], acquired: curStats[itype].acquired + 1 },
      };

      if (ITEM_CATEGORY[itype] === "INSTANT") {
        // 즉시발동 효과 적용
        stateAfterItem = applyInstantEffect(
          { ...stateAfterItem, itemStats: curStats },
          itype, "player", nowMs
        );
      } else {
        // 보유형: 슬롯에 보관 (명세 §5-2)
        if (curHeld !== null && curHeld.type !== itype) {
          // 다른 종류 교체 → 기존 드롭 KPI (명세 §7-3)
          curStats = {
            ...curStats,
            [curHeld.type]: {
              ...curStats[curHeld.type],
              dropped: curStats[curHeld.type].dropped + 1,
            },
          };
        }
        const newExpiry = curHeld !== null && curHeld.type === itype
          ? nowMs + HOLDABLE_EXPIRE_MS  // 동일 종류 → 만료 갱신
          : nowMs + HOLDABLE_EXPIRE_MS;
        curHeld = { type: itype, acquiredAt: nowMs, expiresAt: newExpiry };
        stateAfterItem = { ...stateAfterItem, heldItem: curHeld, itemStats: curStats };
      }
      curItem = null;

    } else if (cpuHitItem) {
      // CPU가 보유형 아이템 밟음 → 소멸 (명세 §4-1, EC-05)
      if (ITEM_CATEGORY[curItem.type] === "HOLDABLE") {
        curStats = {
          ...curStats,
          [curItem.type]: {
            ...curStats[curItem.type],
            cpuConsumed: (curStats[curItem.type].cpuConsumed || 0) + 1,
          },
        };
      } else {
        // CPU가 INSTANT 아이템 획득
        curStats = {
          ...curStats,
          [curItem.type]: { ...curStats[curItem.type], acquired: curStats[curItem.type].acquired + 1 },
        };
        stateAfterItem = applyInstantEffect(
          { ...stateAfterItem, itemStats: curStats },
          curItem.type, "cpu", nowMs
        );
        curStats = stateAfterItem.itemStats;
      }
      curItem = null;
      stateAfterItem = { ...stateAfterItem, itemStats: curStats };
    }
  }

  return {
    ...stateAfterItem,
    // snake, cpu 는 stateAfterItem 에 포함 (이동 후 위치 + LENGTH_BURST 등 아이템 효과 반영)
    dir,
    cpuDir:              newCpuDir,
    food:                newFood,
    item:                curItem,
    score:               newScore,
    cpuScore:            newCPUScore,
    highScore:           Math.max(s.highScore, newScore),
    status:              "playing",
    result:              null,
    deathCause:          null,
    pendingGrowth:       newPlayerPending,
    cpuPendingGrowth:    newCpuPending,
    multiplierStats:     newMultiplierStats,
    cpuRecentPositions:  newCpuRecentPositions, // BF-576
  };
}

// ─────────────────────────────────────────────────────────────
// BF-560: HUD 상태 유틸 — 속도 레벨 계산 + 도트 표시
// ─────────────────────────────────────────────────────────────

/**
 * speedStack 으로부터 플레이어(또는 지정 target)의 현재 속도 레벨을 계산.
 * SPEED_UP 이 있으면 FAST, SLOW_DOWN 이 있으면 SLOW, 없으면 NORMAL.
 * SPEED_UP 과 SLOW_DOWN 이 동시에 있으면 FAST 우선 (명세 §5-1).
 *
 * @param {Array}  speedStack  state.speedStack 배열
 * @param {string} [target="player"]  "player" | "cpu"
 * @returns {"SLOW"|"NORMAL"|"FAST"}
 */
export function getSpeedLevel(speedStack, target = "player") {
  const entries = (speedStack || []).filter((e) => e.target === target);
  const hasUp   = entries.some((e) => e.type === "SPEED_UP");
  const hasDown = entries.some((e) => e.type === "SLOW_DOWN");
  if (hasUp)   return "FAST";
  if (hasDown) return "SLOW";
  return "NORMAL";
}

/**
 * 속도 레벨에 대응하는 도트 문자열 반환 (명세 §5-1 도트 아이콘 규칙).
 * 활성 도트: ● (U+25CF), 비활성 도트: ○ (U+25CB)
 *
 * @param {"SLOW"|"NORMAL"|"FAST"} level
 * @returns {string}  예) "●○○" | "○●○" | "○○●"
 */
export function getSpeedDots(level) {
  switch (level) {
    case "SLOW":   return "●○○";
    case "FAST":   return "○○●";
    default:       return "○●○"; // NORMAL
  }
}

// ─────────────────────────────────────────────────────────────
// BF-560: 플레이 시간 포맷 유틸 (명세 §5-3)
// ─────────────────────────────────────────────────────────────

/**
 * 플레이 시간(ms)을 한국어 문자열로 포맷 (명세 §5-3).
 *
 * | 범위         | 표시 형식   |
 * |-------------|------------|
 * | < 60초      | `N초`       |
 * | 60초 ~ 59분 | `N분 M초`   |
 * | ≥ 60분      | `N시간 M분` |
 *
 * @param {number} ms  경과 시간(ms)
 * @returns {string}
 */
export function formatPlayTime(ms) {
  const totalSec  = Math.floor(ms / 1000);
  const totalMin  = Math.floor(totalSec / 60);
  const totalHour = Math.floor(totalMin  / 60);

  if (totalHour >= 1) {
    const remainMin = totalMin % 60;
    return `${totalHour}시간 ${remainMin}분`;
  }
  if (totalMin >= 1) {
    const remainSec = totalSec % 60;
    return `${totalMin}분 ${remainSec}초`;
  }
  return `${totalSec}초`;
}

// ─────────────────────────────────────────────────────────────
// BF-629: 적 스네이크 통계 구조 (명세 §8.1)
// ─────────────────────────────────────────────────────────────

/**
 * 적 스네이크 KPI 누적 통계 초기 구조 (명세 §8.1, createItemStats 패턴 차용).
 *
 * @returns {Object}
 */
export function createEnemyStats() {
  return {
    enemiesSpawned:    0,
    respawned:         0,
    died:              { wall: 0, self: 0, head_on: 0 },
    foodEaten:         0,
    foodMultSum:       0,
    itemAcquired:      { SPEED_UP: 0, SLOW_DOWN: 0, LENGTH_BURST: 0, SHIELD: 0, REVERSE: 0 },
    itemConsumed:      { LENGTH_BURST: 0, SHIELD: 0, REVERSE: 0 },
    itemExpired:       0,
    tickMode:          { FORAGE: 0, CONTEST: 0, EVADE: 0 },
    contestWins:       0,
    maxScore:          0,
    poolStarvedTicks:  0,
    avgConcurFoodSum:  0,
    avgConcurFoodN:    0,
  };
}

// ─────────────────────────────────────────────────────────────
// BF-629: 적 AI v2 — 순수 함수 (no DOM, 단위 테스트 가능)
// ─────────────────────────────────────────────────────────────

/**
 * 적이 노릴 최우선 타깃 선택 (extraFoods + extraItems 통합, 명세 §4.6).
 *
 * @param {{x:number,y:number}} head
 * @param {Array<{x:number,y:number,multiplier:number}>} foods  extraFoods
 * @param {Array<{type:string,x:number,y:number}>} items        extraItems
 * @param {Object} params  DIFFICULTY_PARAMS 엔트리
 * @returns {{pos:{x:number,y:number}, kind:"food"|"item", value:number}|null}
 */
export function pickEnemyTarget(head, foods, items, params) {
  let best = null;
  let bestKey = Infinity;
  const itemSeekWeight = params.itemSeekWeight ?? 0.6;

  for (const f of foods) {
    const v = f.multiplier || 1;
    const dist = Math.abs(head.x - f.x) + Math.abs(head.y - f.y);
    const key = dist / Math.max(1, v);
    if (key < bestKey) {
      best = { pos: f, kind: "food", value: v };
      bestKey = key;
    }
  }

  for (const it of items) {
    const v = ENEMY_TARGET_VALUE_ITEM[it.type] ?? 1;
    const dist = Math.abs(head.x - it.x) + Math.abs(head.y - it.y);
    const key = dist / Math.max(1, v) / Math.max(0.01, itemSeekWeight);
    if (key < bestKey) {
      best = { pos: it, kind: "item", value: v };
      bestKey = key;
    }
  }

  return best;
}

/**
 * 방향 d 로 이동했을 때 타깃에 가까워지는 점수 (명세 §4.7, computeFoodScore 일반화).
 *
 * @param {{x:number,y:number}} head
 * @param {{x:number,y:number}} dir
 * @param {{pos:{x:number,y:number}}|null} target
 * @returns {number}  0.0 | 0.5 | 1.0
 */
export function computeEnemyTargetScore(head, dir, target) {
  if (!target) return 0;
  const nextPos   = { x: head.x + dir.x, y: head.y + dir.y };
  const distBefore = Math.abs(head.x - target.pos.x) + Math.abs(head.y - target.pos.y);
  const distAfter  = Math.abs(nextPos.x - target.pos.x) + Math.abs(nextPos.y - target.pos.y);
  if (distAfter < distBefore) return 1.0;
  if (distAfter === distBefore) return 0.5;
  return 0.0;
}

/**
 * 다음 위치가 상대 머리 인접 → head-on 위험 점수 (명세 §4.8).
 *
 * @param {{x:number,y:number}} nextPos
 * @param {Array<{x:number,y:number}>} opponentHeads
 * @returns {number}  0.0 | 0.5 | 1.0
 */
export function computeEnemyThreatScore(nextPos, opponentHeads) {
  let risk = 0;
  for (const h of opponentHeads) {
    if (!h) continue;
    const d = Math.abs(nextPos.x - h.x) + Math.abs(nextPos.y - h.y);
    if (d <= 1) risk = Math.max(risk, 1.0);
    else if (d === 2) risk = Math.max(risk, 0.5);
  }
  return risk;
}

/**
 * 행동 모드 결정 (FORAGE / CONTEST / EVADE, 명세 §4.1).
 * 우선순위: EVADE > CONTEST > FORAGE.
 *
 * @param {{x:number,y:number}} enemyHead
 * @param {{x:number,y:number}|null} playerHead
 * @param {{pos:{x:number,y:number}}|null} bestTarget
 * @param {Object} params
 * @returns {"FORAGE"|"CONTEST"|"EVADE"}
 */
export function decideEnemyMode(enemyHead, playerHead, bestTarget, params) {
  const threatRadius  = params.threatRadius  ?? 4;
  const contestRadius = params.contestRadius ?? 6;

  // EVADE: 플레이어 머리가 가까이 있음
  if (playerHead) {
    const playerDist = Math.abs(enemyHead.x - playerHead.x) + Math.abs(enemyHead.y - playerHead.y);
    if (playerDist <= threatRadius) return "EVADE";
  }

  // CONTEST: 타깃에 플레이어보다 적이 더 가깝거나 같고, 플레이어도 타깃에 가까이 있음
  if (bestTarget && playerHead) {
    const enemyDist  = Math.abs(enemyHead.x - bestTarget.pos.x) + Math.abs(enemyHead.y - bestTarget.pos.y);
    const playerDist = Math.abs(playerHead.x - bestTarget.pos.x) + Math.abs(playerHead.y - bestTarget.pos.y);
    if (enemyDist <= playerDist && playerDist <= contestRadius) return "CONTEST";
  }

  return "FORAGE";
}

/**
 * 모드별 가중치 반환 (명세 §4.9).
 *
 * @param {"FORAGE"|"CONTEST"|"EVADE"} mode
 * @param {Object} params
 * @returns {{wSafe:number, wTgt:number, wThreat:number}}
 */
export function getEnemyWeights(mode, params) {
  const wSafeBase = 1 - params.foodPriorityWeight;
  const wTgtBase  = params.foodPriorityWeight;
  const tw        = params.threatWeight ?? 0.5;

  switch (mode) {
    case "CONTEST":
      return { wSafe: wSafeBase * 0.8, wTgt: wTgtBase + (params.contestFoodBoost ?? 0.18), wThreat: tw * 0.7 };
    case "EVADE":
      return { wSafe: wSafeBase * 1.3, wTgt: wTgtBase * 0.4, wThreat: tw * 1.5 };
    default: // FORAGE
      return { wSafe: wSafeBase,       wTgt: wTgtBase,        wThreat: tw * 0.5 };
  }
}

/**
 * 적 스네이크 방향 결정 — 통합 AI (명세 §4.4).
 * ENEMY_AI_V2_ENABLED=false → 단순 greedy(맨해튼 거리 최소) 폴백.
 *
 * @param {Object} enemy  EnemyUnit (body, dir, recentPositions, ...)
 * @param {Object} world  { cols, rows, snake, cpu, otherEnemies, extraFoods, extraItems }
 * @param {"normal"|"easy"} [difficulty="normal"]
 * @returns {{x:number,y:number}}
 */
export function chooseEnemyDir(enemy, world, difficulty = "normal") {
  const params  = DIFFICULTY_PARAMS[difficulty] ?? DIFFICULTY_PARAMS.normal;
  const { body, dir: curDir, recentPositions } = enemy;
  if (!body || body.length === 0) return curDir || DIR.LEFT;

  const head    = body[0];
  const { cols, rows } = world;
  const allDirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];

  // 점유 셀: player + mainCpu + 다른 enemy 몸통 + 자기 몸통(머리 제외)
  const occupied = new Set([
    ...(world.snake        || []).map(s => `${s.x},${s.y}`),
    ...(world.cpu          || []).map(s => `${s.x},${s.y}`),
    ...(world.otherEnemies || []).flatMap(e => e.body || []).map(s => `${s.x},${s.y}`),
    ...body.slice(1).map(s => `${s.x},${s.y}`),
  ]);

  // 유효 방향 후보 (반대방향 + 즉시 충돌 제거, §4.5)
  const candidates = allDirs.filter(d => {
    if (d.x + curDir.x === 0 && d.y + curDir.y === 0) return false;
    const nx = head.x + d.x;
    const ny = head.y + d.y;
    if (isWallCollision({ x: nx, y: ny }, cols, rows)) return false;
    if (occupied.has(`${nx},${ny}`)) return false;
    return true;
  });

  if (candidates.length === 0) return curDir; // 탈출 불가 → 현 방향 유지

  // ENEMY_AI_V2_ENABLED=false → 단순 greedy 폴백 (기존 tickExtraCpus 로직)
  if (!ENEMY_AI_V2_ENABLED) {
    const foods = world.extraFoods || [];
    if (foods.length === 0) return candidates[0];
    const target = foods[0];
    let chosen = candidates[0];
    let bestDist = Infinity;
    for (const d of candidates) {
      const dist = Math.abs((head.x + d.x) - target.x) + Math.abs((head.y + d.y) - target.y);
      if (dist < bestDist) { bestDist = dist; chosen = d; }
    }
    return chosen;
  }

  // 타깃 선택
  const bestTarget = pickEnemyTarget(head, world.extraFoods || [], world.extraItems || [], params);

  // BF-576 동일: 루프 감지 → 타깃 최단거리 강제
  const headKey    = `${head.x},${head.y}`;
  const visitCount = (recentPositions || []).filter(p => p === headKey).length;
  if (visitCount >= 3 && bestTarget !== null) {
    const sorted = [...candidates].sort((a, b) => {
      const da = Math.abs((head.x + a.x) - bestTarget.pos.x) + Math.abs((head.y + a.y) - bestTarget.pos.y);
      const db = Math.abs((head.x + b.x) - bestTarget.pos.x) + Math.abs((head.y + b.y) - bestTarget.pos.y);
      return da - db;
    });
    return sorted[0];
  }

  // 행동 모드 결정
  const playerHead = (world.snake || []).length > 0 ? world.snake[0] : null;
  const mode       = decideEnemyMode(head, playerHead, bestTarget, params);
  const weights    = getEnemyWeights(mode, params);

  // 위협 머리 목록 (head-on 위험 계산용)
  const opponentHeads = [
    playerHead,
    (world.cpu || []).length > 0 ? world.cpu[0] : null,
    ...(world.otherEnemies || []).filter(e => !e.dead && e.body && e.body.length > 0).map(e => e.body[0]),
  ].filter(Boolean);

  // 각 후보 점수 계산
  const scored = candidates.map(d => {
    const safeLen   = lookAhead(head, d, params.visionRange, cols, rows, occupied);
    const tgtScore  = computeEnemyTargetScore(head, d, bestTarget);
    const nextPos   = { x: head.x + d.x, y: head.y + d.y };
    const threat    = computeEnemyThreatScore(nextPos, opponentHeads);

    let score;
    if (safeLen < params.avoidanceThreshold) {
      score = safeLen * 0.1 + tgtScore * weights.wTgt - threat * weights.wThreat;
    } else {
      score = (safeLen / params.visionRange) * weights.wSafe
            + tgtScore * weights.wTgt
            - threat * weights.wThreat;
    }
    return { d, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].d;
}
