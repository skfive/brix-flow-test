// BF-533 · snake-game 배수 아이템 spawn·길이 증가·상단 통계 UI 구현 — 단위 테스트
//
// AC 매핑:
//   AC-1: 확률 분포 — pickMultiplier / spawnFoodWithMultiplier
//   AC-2: 길이 증가 — pendingGrowth, tick/tickFull M 배수
//   AC-3: 상단 통계 UI — index.html #multiplier-stats 요소 + multiplierStats 필드
//   AC-4: 기존 1x 동작 회귀 무결
//
// 실행: node --test tests/snake-BF533.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  createInitialState,
  pickMultiplier,
  spawnFoodWithMultiplier,
  spawnFoodCell,
  createMultiplierStats,
  MULTIPLIER_COLORS,
  tick,
  tickFull,
  restartGame,
  DIR,
} from "../snake/logic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SNAKE_DIR = path.join(REPO_ROOT, "snake");

const COLS = 20;
const ROWS = 15;

/** 기본 state 생성 헬퍼 */
function makeState(overrides = {}) {
  const base = createInitialState(COLS, ROWS);
  return { ...base, ...overrides };
}

/** 경쟁 state 생성 헬퍼 */
function makeCompState(overrides = {}) {
  const base = createInitialState(COLS, ROWS);
  return { ...base, ...overrides };
}

// ─────────────────────────────────────────────────────────────
// AC-1: pickMultiplier — 확률 분포 (명세 §3-1)
// ─────────────────────────────────────────────────────────────

test("BF-533 §1-1 (AC1): pickMultiplier — 1/2/4/8 중 하나를 반환한다", () => {
  const validValues = new Set([1, 2, 4, 8]);
  for (let i = 0; i < 100; i++) {
    const m = pickMultiplier();
    assert.ok(validValues.has(m), `유효하지 않은 배수 값: ${m}`);
  }
});

test("BF-533 §1-2 (AC1): pickMultiplier — 1000번 샘플에서 1x 비율이 가장 높다 (이론값 55%)", () => {
  const counts = { 1: 0, 2: 0, 4: 0, 8: 0 };
  const N = 1000;
  for (let i = 0; i < N; i++) {
    counts[pickMultiplier()]++;
  }
  // 1x 가 55%, 오차 허용 ±10%p
  const ratio1 = counts[1] / N;
  assert.ok(ratio1 >= 0.40, `1x 비율 ${(ratio1*100).toFixed(1)}% — 40% 이상이어야 함 (이론값 55%)`);
  assert.ok(ratio1 <= 0.70, `1x 비율 ${(ratio1*100).toFixed(1)}% — 70% 이하이어야 함`);
});

test("BF-533 §1-3 (AC1): pickMultiplier — 배수가 높을수록 빈도가 낮다 (count(1x) > count(2x) > count(4x) > count(8x))", () => {
  const counts = { 1: 0, 2: 0, 4: 0, 8: 0 };
  for (let i = 0; i < 2000; i++) {
    counts[pickMultiplier()]++;
  }
  assert.ok(counts[1] > counts[2], `1x(${counts[1]}) > 2x(${counts[2]}) 이어야 함`);
  assert.ok(counts[2] > counts[4], `2x(${counts[2]}) > 4x(${counts[4]}) 이어야 함`);
  assert.ok(counts[4] > counts[8], `4x(${counts[4]}) > 8x(${counts[8]}) 이어야 함`);
});

// ─────────────────────────────────────────────────────────────
// AC-1: spawnFoodWithMultiplier (명세 §3-3, §6-1)
// ─────────────────────────────────────────────────────────────

test("BF-533 §1-4 (AC1): spawnFoodWithMultiplier — multiplier 필드 포함 반환", () => {
  const result = spawnFoodWithMultiplier(COLS, ROWS, []);
  assert.ok(result !== null, "빈 셀이 있으면 null 이 아님");
  assert.ok(typeof result.x === "number", "x 좌표 존재");
  assert.ok(typeof result.y === "number", "y 좌표 존재");
  assert.ok([1, 2, 4, 8].includes(result.multiplier), `multiplier 유효값: ${result.multiplier}`);
});

test("BF-533 §1-5 (AC1): spawnFoodWithMultiplier — 격자 꽉 찬 경우 null 반환 (EC-1)", () => {
  const allCells = [];
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) allCells.push({ x, y });
  const result = spawnFoodWithMultiplier(2, 2, allCells);
  assert.strictEqual(result, null, "빈 셀 없으면 null");
});

test("BF-533 §1-6 (AC1): spawnFoodWithMultiplier — 점유 셀 제외한 위치에 스폰", () => {
  const snake = [{ x: 0, y: 0 }];
  const result = spawnFoodWithMultiplier(COLS, ROWS, snake);
  assert.ok(result !== null, "스폰 가능");
  assert.ok(!(result.x === 0 && result.y === 0), "점유 셀(0,0)에 스폰 금지");
});

// ─────────────────────────────────────────────────────────────
// AC-1: createInitialState — multiplierStats 초기화 (명세 §6-3)
// ─────────────────────────────────────────────────────────────

test("BF-533 §2-1 (AC1): createInitialState — multiplierStats 필드 존재", () => {
  const s = createInitialState(COLS, ROWS);
  assert.ok(s.multiplierStats !== undefined, "multiplierStats 필드 없음");
  for (const k of ["1", "2", "4", "8"]) {
    assert.ok(s.multiplierStats[k] !== undefined, `multiplierStats["${k}"] 없음`);
    assert.ok(typeof s.multiplierStats[k].spawned === "number", `multiplierStats["${k}"].spawned 타입 오류`);
    assert.ok(typeof s.multiplierStats[k].eaten   === "number", `multiplierStats["${k}"].eaten 타입 오류`);
  }
});

test("BF-533 §2-2 (AC1): createInitialState — pendingGrowth/cpuPendingGrowth 초기값 0", () => {
  const s = createInitialState(COLS, ROWS);
  assert.equal(s.pendingGrowth,    0, "pendingGrowth 초기값 0");
  assert.equal(s.cpuPendingGrowth, 0, "cpuPendingGrowth 초기값 0");
});

test("BF-533 §2-3 (AC1): createInitialState — food.multiplier 필드 포함", () => {
  const s = createInitialState(COLS, ROWS);
  if (s.food !== null) {
    assert.ok([1, 2, 4, 8].includes(s.food.multiplier), `food.multiplier 유효값: ${s.food.multiplier}`);
  }
});

test("BF-533 §2-4 (AC1): createInitialState — 첫 스폰 시 multiplierStats.spawned 카운트 1 이상", () => {
  const s = createInitialState(COLS, ROWS);
  if (s.food !== null) {
    const totalSpawned = Object.values(s.multiplierStats).reduce((acc, v) => acc + v.spawned, 0);
    assert.equal(totalSpawned, 1, "초기화 시 스폰된 food 1건 카운트");
  }
});

// ─────────────────────────────────────────────────────────────
// AC-2: tick — pendingGrowth 방식 길이 증가 (명세 §4-2)
// ─────────────────────────────────────────────────────────────

test("BF-533 §3-1 (AC2): tick — 배수 1x 수집 시 length +1 (기존 동작과 동일)", () => {
  const s0 = makeState({
    snake:   [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food:    { x: 6, y: 5, multiplier: 1 },
    pendingGrowth: 0,
  });
  const prevLen = s0.snake.length;
  const s1 = tick(s0);
  if (s1.status === "playing") {
    assert.equal(s1.snake.length, prevLen + 1, "1x 수집 후 길이 +1");
  }
});

test("BF-533 §3-2 (AC2): tick — 배수 2x 수집 시 length +2 (2틱 성장)", () => {
  const s0 = makeState({
    snake:   [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food:    { x: 6, y: 5, multiplier: 2 },
    pendingGrowth: 0,
  });
  const prevLen = s0.snake.length;
  const s1 = tick(s0); // tick1: ateFood → pendingGrowth=2-1=1 → length+1
  if (s1.status !== "playing") return;
  assert.equal(s1.snake.length, prevLen + 1, "2x 수집 후 1틱: length+1");
  assert.equal(s1.pendingGrowth, 1, "pendingGrowth=1 남아있어야 함");

  // tick2: pendingGrowth=1>0 → 꼬리 유지 → length+1 (no food here)
  const s2 = tick({ ...s1, food: { x: 0, y: 0, multiplier: 1 } }); // food를 다른 곳으로
  if (s2.status !== "playing") return;
  assert.equal(s2.snake.length, prevLen + 2, "2x 수집 후 2틱: length+2 (총 +2)");
  assert.equal(s2.pendingGrowth, 0, "2틱 후 pendingGrowth=0 소진");
});

test("BF-533 §3-3 (AC2): tick — 배수 4x 수집 시 4틱 성장 → 최종 length+4", () => {
  const base = makeState({
    snake:   [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food:    { x: 6, y: 5, multiplier: 4 },
    pendingGrowth: 0,
  });
  const prevLen = base.snake.length;
  // 1틱: 수집 → pending=3
  let s = tick(base);
  if (s.status !== "playing") return;
  // 2~4틱: pending 소진 (food는 수집 안 함)
  for (let i = 0; i < 3; i++) {
    s = tick({ ...s, food: { x: 0, y: 9, multiplier: 1 } });
    if (s.status !== "playing") return;
  }
  assert.equal(s.snake.length, prevLen + 4, `4x 수집 후 4틱: length+4 (expected ${prevLen + 4}, got ${s.snake.length})`);
  assert.equal(s.pendingGrowth, 0, "4틱 후 pendingGrowth=0");
});

test("BF-533 §3-4 (AC2): tick — 배수 8x 수집 시 점수 +80", () => {
  const s0 = makeState({
    snake:   [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food:    { x: 6, y: 5, multiplier: 8 },
    score:   0,
    pendingGrowth: 0,
  });
  const s1 = tick(s0);
  if (s1.status === "playing") {
    assert.equal(s1.score, 80, "8x 수집 시 점수 +80 (8×10)");
  }
});

test("BF-533 §3-5 (AC2): tick — 먹이 미수집 시 pendingGrowth 유지", () => {
  // pendingGrowth=2 상태에서 먹이 미수집 → pending-1=1, 꼬리 유지
  const s0 = makeState({
    snake:   [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food:    { x: 0, y: 0, multiplier: 1 }, // 수집 안 함
    pendingGrowth: 2,
  });
  const prevLen = s0.snake.length;
  const s1 = tick(s0);
  if (s1.status === "playing") {
    assert.equal(s1.snake.length, prevLen + 1, "pendingGrowth>0 → 꼬리 유지 → length+1");
    assert.equal(s1.pendingGrowth, 1, "pendingGrowth 1 감소");
  }
});

// ─────────────────────────────────────────────────────────────
// AC-2: tickFull — 경쟁 모드 배수 처리 (명세 §4-2, §5)
// ─────────────────────────────────────────────────────────────

test("BF-533 §4-1 (AC2): tickFull — player 2x 수집 → score +20", () => {
  const s0 = makeCompState({
    snake:   [{ x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }],
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    cpu:     [{ x: 15, y: 12 }, { x: 14, y: 12 }],
    cpuDir:  DIR.RIGHT,
    food:    { x: 5, y: 5, multiplier: 2 },
    score:   0, cpuScore: 0, highScore: 0, status: "playing", result: null,
    pendingGrowth: 0, cpuPendingGrowth: 0,
    multiplierStats: createMultiplierStats(),
  });
  const s1 = tickFull(s0);
  if (s1.status === "playing") {
    assert.equal(s1.score, 20, "player 2x 수집 → score +20");
  }
});

test("BF-533 §4-2 (AC2): tickFull — CPU 4x 수집 → cpuScore +40", () => {
  const s0 = makeCompState({
    snake:   [{ x: 1, y: 1 }, { x: 0, y: 1 }],
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    cpu:     [{ x: 10, y: 7 }, { x: 9, y: 7 }],
    cpuDir:  DIR.RIGHT,
    food:    { x: 11, y: 7, multiplier: 4 },
    score:   0, cpuScore: 0, highScore: 0, status: "playing", result: null,
    pendingGrowth: 0, cpuPendingGrowth: 0,
    multiplierStats: createMultiplierStats(),
  });
  const s1 = tickFull(s0);
  if (s1.status === "playing") {
    assert.equal(s1.cpuScore, 40, "CPU 4x 수집 → cpuScore +40");
  }
});

test("BF-533 §4-3 (AC2): tickFull — player 2x 수집 후 pendingGrowth=1 남음", () => {
  const s0 = makeCompState({
    snake:   [{ x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }],
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    cpu:     [{ x: 15, y: 12 }, { x: 14, y: 12 }],
    cpuDir:  DIR.RIGHT,
    food:    { x: 5, y: 5, multiplier: 2 },
    score:   0, cpuScore: 0, highScore: 0, status: "playing", result: null,
    pendingGrowth: 0, cpuPendingGrowth: 0,
    multiplierStats: createMultiplierStats(),
  });
  const s1 = tickFull(s0);
  if (s1.status === "playing") {
    assert.equal(s1.pendingGrowth, 1, "2x 수집 후 pendingGrowth=1 남아야 함");
  }
});

// ─────────────────────────────────────────────────────────────
// AC-1: multiplierStats eaten/spawned 카운트 (명세 §6-2)
// ─────────────────────────────────────────────────────────────

test("BF-533 §5-1 (AC1): tick — 배수 수집 시 multiplierStats.eaten 증가", () => {
  const s0 = makeState({
    snake:   [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food:    { x: 6, y: 5, multiplier: 2 },
    pendingGrowth: 0,
    multiplierStats: createMultiplierStats(),
  });
  const s1 = tick(s0);
  if (s1.status === "playing") {
    assert.equal(s1.multiplierStats["2"].eaten, 1, "2x 수집 시 eaten +1");
  }
});

test("BF-533 §5-2 (AC1): tick — 새 food 스폰 후 multiplierStats.spawned 증가", () => {
  const s0 = makeState({
    snake:   [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food:    { x: 6, y: 5, multiplier: 1 },
    pendingGrowth: 0,
    multiplierStats: createMultiplierStats(),
  });
  const totalBefore = Object.values(s0.multiplierStats).reduce((s, v) => s + v.spawned, 0);
  const s1 = tick(s0);
  if (s1.status === "playing" && s1.food !== null) {
    const totalAfter = Object.values(s1.multiplierStats).reduce((s, v) => s + v.spawned, 0);
    assert.equal(totalAfter, totalBefore + 1, "새 food 스폰 후 spawned 총합 +1");
  }
});

test("BF-533 §5-3 (AC1): createMultiplierStats — 초기 구조 검증", () => {
  const stats = createMultiplierStats();
  for (const k of ["1", "2", "4", "8"]) {
    assert.equal(stats[k].spawned, 0, `stats["${k}"].spawned 초기값 0`);
    assert.equal(stats[k].eaten,   0, `stats["${k}"].eaten 초기값 0`);
  }
});

// ─────────────────────────────────────────────────────────────
// AC-3: 상단 통계 UI — index.html 구조 (명세 §7-2)
// ─────────────────────────────────────────────────────────────

test("BF-533 §6-1 (AC3): index.html — #multiplier-stats 요소 존재", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
  assert.ok(html.includes('id="multiplier-stats"'), "#multiplier-stats 요소 없음 (명세 §7-2)");
});

test("BF-533 §6-2 (AC3): index.html — 배수별 count/prob 요소 (ms-count-1~8, ms-prob-1~8)", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
  for (const m of [1, 2, 4, 8]) {
    assert.ok(html.includes(`id="ms-count-${m}"`), `ms-count-${m} 요소 없음`);
    assert.ok(html.includes(`id="ms-prob-${m}"`),  `ms-prob-${m} 요소 없음`);
  }
});

test("BF-533 §6-3 (AC3): index.html — aria-live 속성 존재 (접근성)", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
  assert.ok(html.includes('aria-live="polite"'), "#multiplier-stats aria-live 없음 (명세 §7-2)");
});

test("BF-533 §6-4 (AC3): index.html — IIFE 에 pickMultiplier / spawnFoodWithMultiplier 주입", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
  assert.ok(html.includes("pickMultiplier"),          "IIFE 에 pickMultiplier 없음");
  assert.ok(html.includes("spawnFoodWithMultiplier"), "IIFE 에 spawnFoodWithMultiplier 없음");
  assert.ok(html.includes("MULTIPLIER_COLORS"),       "IIFE 에 MULTIPLIER_COLORS 없음");
});

test("BF-533 §6-5 (AC3): styles.css — #multiplier-stats 스타일 존재", () => {
  const css = readFileSync(path.join(SNAKE_DIR, "styles.css"), "utf-8");
  assert.ok(css.includes("#multiplier-stats"), "#multiplier-stats 스타일 없음 (명세 §7-1)");
  assert.ok(css.includes(".ms-badge"),         ".ms-badge 스타일 없음");
  assert.ok(css.includes(".ms-1x"),            ".ms-1x 스타일 없음");
  assert.ok(css.includes(".ms-8x"),            ".ms-8x 스타일 없음");
});

// ─────────────────────────────────────────────────────────────
// AC-4: 기존 1x 동작 회귀 무결 (명세 §8-1)
// ─────────────────────────────────────────────────────────────

test("BF-533 §7-1 (AC4): tick — food.multiplier 없는 기존 state 도 동작 (backward compat)", () => {
  // BF-504~530 기존 테스트와 호환: food = { x, y } (multiplier 없음)
  const s0 = makeState({
    snake:   [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food:    { x: 6, y: 5 }, // multiplier 없음
    pendingGrowth: 0,
  });
  const s1 = tick(s0);
  // multiplier = 1 (fallback) → score +10, length +1
  if (s1.status === "playing") {
    assert.equal(s1.score, 10, "multiplier 없는 food 수집 시 점수 +10 (1x fallback)");
    assert.equal(s1.snake.length, s0.snake.length + 1, "multiplier 없는 food 수집 시 길이 +1");
  }
});

test("BF-533 §7-2 (AC4): restartGame — multiplierStats 초기화 (명세 §6-4)", () => {
  const s0 = createInitialState(COLS, ROWS);
  // 수동으로 카운트 쌓기
  const s1 = {
    ...s0,
    multiplierStats: {
      "1": { spawned: 30, eaten: 30 },
      "2": { spawned: 15, eaten: 14 },
      "4": { spawned:  6, eaten:  5 },
      "8": { spawned:  2, eaten:  1 },
    },
    status: "gameover",
  };
  const s2 = restartGame(s1);
  assert.equal(s2.status, "playing", "재시작 후 status playing");
  // multiplierStats 재초기화 → 초기 food 스폰 카운트 1건만
  const total = Object.values(s2.multiplierStats).reduce((s, v) => s + v.spawned, 0);
  assert.ok(total <= 1, `재시작 후 multiplierStats.spawned 총합은 0 or 1이어야 함: ${total}`);
  const eatenTotal = Object.values(s2.multiplierStats).reduce((s, v) => s + v.eaten, 0);
  assert.equal(eatenTotal, 0, "재시작 후 eaten 카운트 0");
});

test("BF-533 §7-3 (AC4): createInitialState — pendingGrowth 초기화 (EC-4)", () => {
  const s0 = createInitialState(COLS, ROWS);
  const s1 = { ...s0, pendingGrowth: 5, cpuPendingGrowth: 3, status: "gameover" };
  const s2 = restartGame(s1);
  assert.equal(s2.pendingGrowth,    0, "재시작 후 pendingGrowth=0 (EC-4)");
  assert.equal(s2.cpuPendingGrowth, 0, "재시작 후 cpuPendingGrowth=0 (EC-4)");
});

// ─────────────────────────────────────────────────────────────
// AC-1: MULTIPLIER_COLORS 색상 정의 (명세 §2)
// ─────────────────────────────────────────────────────────────

test("BF-533 §8-1 (AC1): MULTIPLIER_COLORS — 4가지 배수 색상 정의 존재", () => {
  assert.ok(MULTIPLIER_COLORS !== undefined, "MULTIPLIER_COLORS export 없음");
  for (const m of [1, 2, 4, 8]) {
    assert.ok(MULTIPLIER_COLORS[m] !== undefined, `MULTIPLIER_COLORS[${m}] 없음`);
    assert.ok(typeof MULTIPLIER_COLORS[m].fill === "string", `MULTIPLIER_COLORS[${m}].fill 없음`);
    assert.ok(typeof MULTIPLIER_COLORS[m].glow === "string", `MULTIPLIER_COLORS[${m}].glow 없음`);
  }
});

test("BF-533 §8-2 (AC1): MULTIPLIER_COLORS — 1x 는 기존 황금색 #ffcc00 (명세 §8-1)", () => {
  assert.equal(MULTIPLIER_COLORS[1].fill, "#ffcc00", "1x 색상이 기존 황금색 #ffcc00 이어야 함");
});

// ─────────────────────────────────────────────────────────────
// AC-3: game.js KPI 코드 존재 (명세 §9-4)
// ─────────────────────────────────────────────────────────────

test("BF-533 §9-1 (AC3): game.js — BF-531 KPI localStorage 키 존재", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  assert.ok(js.includes("bf-snake-multiplier-kpi"),   "bf-snake-multiplier-kpi 키 없음 (명세 §9-1)");
  assert.ok(js.includes("bf-snake-multiplier-stats"), "bf-snake-multiplier-stats 키 없음 (명세 §9-1)");
});

test("BF-533 §9-2 (AC3): game.js — BF-531 KPI console 출력 존재", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  assert.ok(js.includes("[BF-531 KPI]"), "game.js 에 [BF-531 KPI] console 출력 없음 (명세 §9-2)");
});

test("BF-533 §9-3 (AC3): game.js — updateMultiplierStatsUI 또는 calcSpawnProb 함수 존재", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  assert.ok(
    js.includes("updateMultiplierStatsUI") || js.includes("calcSpawnProb"),
    "game.js 에 통계 UI 업데이트 함수 없음"
  );
});

// ─────────────────────────────────────────────────────────────
// 기존 회귀 가드 — BF-504~BF-530 핵심 API 보존
// ─────────────────────────────────────────────────────────────

test("BF-533 회귀: logic.js — 기존 export 전부 보존 (spawnFoodCell, tick, tickFull 등)", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "logic.js"), "utf-8");
  assert.ok(js.includes("export function spawnFoodCell"),      "spawnFoodCell export 없음 (회귀)");
  assert.ok(js.includes("export function tick"),               "tick export 없음 (회귀)");
  assert.ok(js.includes("export function tickFull"),           "tickFull export 없음 (회귀)");
  assert.ok(js.includes("export function cpuChooseDir"),       "cpuChooseDir export 없음 (회귀)");
  assert.ok(js.includes("export function restartGame"),        "restartGame export 없음 (회귀)");
  // BF-533 신규 export
  assert.ok(js.includes("export function pickMultiplier"),          "pickMultiplier export 없음");
  assert.ok(js.includes("export function spawnFoodWithMultiplier"), "spawnFoodWithMultiplier export 없음");
  assert.ok(js.includes("export function createMultiplierStats"),   "createMultiplierStats export 없음");
  assert.ok(js.includes("export const MULTIPLIER_COLORS"),          "MULTIPLIER_COLORS export 없음");
});

test("BF-533 회귀: index.html — 기존 필수 DOM ID 보존", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
  assert.ok(html.includes('id="game-canvas"'),      "#game-canvas 없음 (회귀)");
  assert.ok(html.includes('id="hud"'),              "#hud 없음 (회귀)");
  assert.ok(html.includes('id="hud-player-score"'), "#hud-player-score 없음 (회귀)");
  assert.ok(html.includes('id="hud-cpu-score"'),    "#hud-cpu-score 없음 (회귀)");
  assert.ok(html.includes('id="gameover-overlay"'), "#gameover-overlay 없음 (회귀)");
  assert.ok(html.includes('id="paused-overlay"'),   "#paused-overlay 없음 (회귀)");
  assert.ok(html.includes('id="competition-legend"'), "#competition-legend 없음 (회귀)");
});

test("BF-533 회귀: index.html — globalThis 주입에 spawnFoodWithMultiplier 포함", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
  assert.ok(html.includes("spawnFoodWithMultiplier"), "globalThis 주입에 spawnFoodWithMultiplier 없음");
});
