// BF-576 · CPU 지렁이 AI 로직 개선 — 아이템 추적·회피 복구 단위 테스트
//
// 수용 기준 매핑:
//   AC1 — 보드 위에 CPU 지렁이와 아이템 1개만 있을 때, 매 tick 마다
//          아이템 방향과 일치하거나 가까워지는 셀로 이동 (Manhattan 거리 단조 감소)
//   AC2 — 동일 좌표를 3 tick 이상 재방문하면 루프 감지 → 아이템 방향 재계산
//   AC3 — 기존 결함 케이스 회귀: 가까운 아이템 + 적 없음 → 수정 전 fail → 수정 후 pass
//
// 결함 원인 (BF-576):
//   cpuChooseDir 스코어 = safeLen(0~visionRange) * weight + foodScore(0~1) * weight
//   safeLen 스케일(최대 8)이 foodScore 스케일(최대 1)을 압도 →
//   개방 공간 방향이 가까운 음식 방향보다 항상 높은 점수를 받음.
//
// 수정:
//   1) safeLen 을 visionRange 로 정규화 (0~1) → 스케일 통일
//   2) cpuRecentPositions 에 동일 좌표 3회 이상 시 루프 감지 → 음식 방향 강제
//
// 실행: node --test tests/snake-BF576.test.js

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  cpuChooseDir,
  tickFull,
  createInitialState,
  createMultiplierStats,
  DIR,
} from "../snake/logic.js";

// ─────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────

/**
 * cpuChooseDir 테스트용 최소 상태 생성.
 * cpuChooseDir 는 cols/rows/snake/cpu/cpuDir/food/cpuRecentPositions 만 사용.
 */
function makeCpuState(overrides = {}) {
  return {
    cols: 20,
    rows: 20,
    snake: [{ x: 1, y: 15 }, { x: 2, y: 15 }],   // 플레이어 멀리
    cpu:   [{ x: 5, y: 5  }, { x: 6, y: 5  }],   // CPU 머리 (5,5), 몸 (6,5)
    cpuDir: DIR.LEFT,
    food: null,
    cpuRecentPositions: [],
    ...overrides,
  };
}

/**
 * tickFull 테스트용 최소 상태 생성 (CPU 관련 필드 포함).
 */
function makeTickState(overrides = {}) {
  return {
    cols:                20,
    rows:                20,
    snake:               [{ x: 1, y: 15 }, { x: 2, y: 15 }],
    dir:                 DIR.RIGHT,
    nextDir:             DIR.RIGHT,
    cpu:                 [{ x: 5, y: 5 }, { x: 6, y: 5 }],
    cpuDir:              DIR.LEFT,
    food:                null,
    score:               0,
    cpuScore:            0,
    highScore:           0,
    status:              "playing",
    result:              null,
    deathCause:          null,
    pendingGrowth:       0,
    cpuPendingGrowth:    0,
    multiplierStats:     createMultiplierStats(),
    cpuRecentPositions:  [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// AC1 — cpuChooseDir: 음식 방향 선택 (정규화 스코어링 검증)
// ─────────────────────────────────────────────────────────────

test("BF-576 AC1-1: cpuChooseDir — 개방 그리드에서 음식 방향(UP) 선택", () => {
  // 결함 재현 시나리오:
  //   CPU (5,5) cpuDir=LEFT, food=(5,3) — 2칸 위
  //   Candidates: UP, DOWN, LEFT
  //   UP:   safeLen=5(y=0까지), foodScore=1.0
  //   DOWN: safeLen=8(개방), foodScore=0.0
  //   LEFT: safeLen=5, foodScore=0.0
  //
  //   OLD 공식 (비정규화):
  //     UP   = 5*0.3 + 1.0*0.7 = 2.2 → 2등
  //     DOWN = 8*0.3 + 0.0*0.7 = 2.4 → 1등 (BUG: 음식과 멀어짐)
  //
  //   NEW 공식 (정규화 safeLen/8):
  //     UP   = (5/8)*0.3 + 1.0*0.7 = 0.8875 → 1등 (PASS)
  //     DOWN = (8/8)*0.3 + 0.0*0.7 = 0.3    → 2등
  const s = makeCpuState({
    food: { x: 5, y: 3, multiplier: 1 },
  });
  const dir = cpuChooseDir(s, "normal");
  assert.deepEqual(dir, DIR.UP,
    "음식이 2칸 위에 있을 때 UP 방향 선택 (정규화 스코어링 수정 검증)");
});

test("BF-576 AC1-2: cpuChooseDir — 음식 방향이 RIGHT일 때 RIGHT 선택", () => {
  // CPU (10,10) cpuDir=UP (→ candidates: UP, LEFT, RIGHT), food=(12,10) 오른쪽 2칸
  // LEFT: foodScore=0.0 (멀어짐), RIGHT: foodScore=1.0 (가까워짐), UP: foodScore=0.5 (중립)
  const s = makeCpuState({
    cpu:    [{ x: 10, y: 10 }, { x: 10, y: 11 }],
    cpuDir: DIR.UP,
    food:   { x: 12, y: 10, multiplier: 1 },
  });
  const dir = cpuChooseDir(s, "normal");
  assert.deepEqual(dir, DIR.RIGHT,
    "음식이 오른쪽에 있을 때 RIGHT 방향 선택");
});

test("BF-576 AC1-3: cpuChooseDir — 음식 바로 옆(1칸)에서도 정확히 음식 방향 선택", () => {
  // CPU (5,5), food=(5,4) — UP 방향 1칸
  // cpuDir=RIGHT → candidates: UP, DOWN, RIGHT (LEFT 제외)
  const s = makeCpuState({
    cpu:    [{ x: 5, y: 5 }, { x: 4, y: 5 }],
    cpuDir: DIR.RIGHT,
    food:   { x: 5, y: 4, multiplier: 1 },
  });
  const dir = cpuChooseDir(s, "normal");
  assert.deepEqual(dir, DIR.UP,
    "음식이 바로 위(1칸)에 있을 때 UP 방향 선택");
});

// ─────────────────────────────────────────────────────────────
// AC1 — tickFull 연속 틱: Manhattan 거리 단조 감소
// ─────────────────────────────────────────────────────────────

test("BF-576 AC1-4: tickFull — 연속 tick 에서 CPU-음식 Manhattan 거리 단조 감소", () => {
  // CPU (5,5) cpuDir=LEFT, food=(5,0) — 5칸 위. 플레이어는 격자 우하단에 격리.
  // 각 tick 마다 CPU-음식 Manhattan 거리가 증가하지 않아야 함 (단조 감소 또는 동일).
  // 음식을 먹으면 food 가 재스폰(위치 변경)되므로 초기 food 위치가 유지되는 동안만 검사.
  let state = makeTickState({
    snake:   [{ x: 18, y: 18 }, { x: 19, y: 18 }],
    nextDir: DIR.LEFT,
    cpu:     [{ x: 5, y: 5 }, { x: 6, y: 5 }],
    cpuDir:  DIR.LEFT,
    food:    { x: 5, y: 0, multiplier: 1 },
  });

  const initialFoodKey = `${state.food.x},${state.food.y}`;
  const dist = (s) =>
    s.food ? Math.abs(s.cpu[0].x - s.food.x) + Math.abs(s.cpu[0].y - s.food.y) : 0;

  let checkedTicks = 0;
  for (let i = 0; i < 5 && state.status === "playing"; i++) {
    const distBefore = dist(state);
    state = tickFull(state, "normal");
    if (state.status !== "playing") break;
    // 음식이 먹혀서 재스폰된 경우(food 위치 변경 또는 null) 해당 틱은 검사 제외
    const currentFoodKey = state.food ? `${state.food.x},${state.food.y}` : null;
    if (currentFoodKey !== initialFoodKey) break;
    const distAfter = dist(state);
    assert.ok(
      distAfter <= distBefore,
      `tick ${i + 1}: Manhattan 거리 증가 (before=${distBefore}, after=${distAfter}) — CPU 가 음식에서 멀어짐`,
    );
    checkedTicks++;
  }
  // 최소 2 tick 은 검사했어야 함 (food 가 너무 가까워서 바로 먹히는 경우를 방지)
  assert.ok(checkedTicks >= 2, `검사된 tick 수 ${checkedTicks} — 최소 2 tick 검증 필요`);
});

// ─────────────────────────────────────────────────────────────
// AC1 — createInitialState: cpuRecentPositions 초기화 검증
// ─────────────────────────────────────────────────────────────

test("BF-576 AC1-5: createInitialState — cpuRecentPositions 빈 배열로 초기화", () => {
  const s = createInitialState(20, 15);
  assert.ok(
    Array.isArray(s.cpuRecentPositions),
    "cpuRecentPositions 가 배열이어야 함",
  );
  assert.equal(
    s.cpuRecentPositions.length,
    0,
    "초기 cpuRecentPositions 는 빈 배열",
  );
});

test("BF-576 AC1-6: tickFull — cpuRecentPositions 가 매 tick 갱신됨", () => {
  const s0 = makeTickState({
    cpu:  [{ x: 5, y: 5 }, { x: 6, y: 5 }],
    food: { x: 5, y: 0, multiplier: 1 },
    snake: [{ x: 18, y: 18 }, { x: 19, y: 18 }],
    nextDir: DIR.LEFT,
  });
  const s1 = tickFull(s0, "normal");
  if (s1.status === "playing") {
    assert.ok(
      Array.isArray(s1.cpuRecentPositions),
      "tickFull 후 cpuRecentPositions 가 배열이어야 함",
    );
    assert.equal(
      s1.cpuRecentPositions.length,
      1,
      "1 tick 후 cpuRecentPositions 길이 = 1",
    );
    assert.equal(
      s1.cpuRecentPositions[0],
      "5,5",
      "첫 번째 항목은 이번 틱 CPU 시작 위치 (5,5)",
    );
  }
});

// ─────────────────────────────────────────────────────────────
// AC2 — 루프 감지: 동일 좌표 3회 재방문 → 음식 방향 강제
// ─────────────────────────────────────────────────────────────

test("BF-576 AC2-1: cpuChooseDir — cpuRecentPositions 동일 좌표 3회 → 음식 방향(UP) 강제", () => {
  // CPU (10,10) cpuDir=LEFT, food=(10,7) — 3칸 위
  // cpuRecentPositions 에 "10,10" 이 3회 포함 → 루프 감지
  // 루프 감지 시: candidates [UP,DOWN,LEFT] 중 food 까지 Manhattan 거리 최소 = UP
  //   UP (10,9)   → dist to (10,7) = 2
  //   DOWN (10,11)→ dist to (10,7) = 4
  //   LEFT (9,10) → dist to (10,7) = 4
  const s = makeCpuState({
    cpu:    [{ x: 10, y: 10 }, { x: 11, y: 10 }],
    cpuDir: DIR.LEFT,
    food:   { x: 10, y: 7, multiplier: 1 },
    cpuRecentPositions: [
      "8,8", "10,10", "9,9", "10,10", "8,8", "10,10",  // "10,10" 3회 등장
    ],
  });
  const dir = cpuChooseDir(s, "normal");
  assert.deepEqual(dir, DIR.UP,
    "루프 감지(동일 좌표 3회) 시 음식 방향(UP)으로 강제 전환");
});

test("BF-576 AC2-2: cpuChooseDir — cpuRecentPositions 동일 좌표 2회는 루프 미감지", () => {
  // 2회는 루프 미감지 → 일반 스코어링 사용
  // 음식이 UP 방향에 있으면 어차피 정규화 공식으로도 UP 선택 — 결과 일치 확인
  const s = makeCpuState({
    cpu:    [{ x: 10, y: 10 }, { x: 11, y: 10 }],
    cpuDir: DIR.LEFT,
    food:   { x: 10, y: 7, multiplier: 1 },
    cpuRecentPositions: [
      "8,8", "10,10", "9,9", "10,10",  // "10,10" 2회만 — 루프 미감지
    ],
  });
  // 2회는 루프 미감지, 하지만 정규화 공식으로도 UP 이 선택되어야 함
  const dir = cpuChooseDir(s, "normal");
  // 스코어: UP=(5/8)*0.3+1.0*0.7≈0.89, DOWN=(8/8)*0.3=0.3, LEFT=(8/8)*0.3≈0.3
  assert.deepEqual(dir, DIR.UP,
    "2회는 루프 미감지이지만 정규화 공식으로도 UP(음식 방향) 선택됨");
});

test("BF-576 AC2-3: cpuChooseDir — food=null 이면 루프 감지 후 일반 스코어링 폴백", () => {
  // 루프 감지됐지만 food 가 null → 루프 모드 스킵 → 일반 스코어링
  const s = makeCpuState({
    cpu:    [{ x: 5, y: 5 }, { x: 6, y: 5 }],
    cpuDir: DIR.LEFT,
    food:   null,
    cpuRecentPositions: ["5,5", "5,5", "5,5"],  // 3회
  });
  // food 없으면 루프 모드 스킵, 유효한 방향 중 하나를 반환해야 함
  const dir = cpuChooseDir(s, "normal");
  const validDirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];
  assert.ok(
    validDirs.some(d => d.x === dir.x && d.y === dir.y),
    "food=null 루프 감지 시에도 유효한 방향 반환",
  );
  // 반대 방향(RIGHT) 은 선택하면 안 됨 (cpuDir=LEFT 의 반대)
  assert.ok(!(dir.x === 1 && dir.y === 0), "반대 방향(RIGHT) 선택 금지");
});

// ─────────────────────────────────────────────────────────────
// AC3 — 회귀 재현: 기존 결함 케이스 (가까운 아이템 + 적 없음)
// ─────────────────────────────────────────────────────────────

test("BF-576 AC3-1: cpuChooseDir 회귀 — safeLen 압도 버그 수정 (개방 공간 < 가까운 음식)", () => {
  // [기존 결함 재현]
  // CPU (5,5) cpuDir=LEFT, food=(5,3) 2칸 위 (UP 방향)
  // 개방 공간(DOWN): safeLen=8(최대), foodScore=0.0
  // 음식 방향(UP):   safeLen=5(벽 y=0까지), foodScore=1.0
  //
  // 구 공식(비정규화): DOWN=2.4 > UP=2.2 → DOWN 선택 → FAIL
  // 신 공식(정규화):  DOWN=(8/8)*0.3=0.3 < UP=(5/8)*0.3+0.7=0.8875 → UP 선택 → PASS
  const s = makeCpuState({
    food: { x: 5, y: 3, multiplier: 1 },
    // cpuRecentPositions 비어있음 → 루프 감지 없이 순수 스코어링만으로 테스트
  });
  const dir = cpuChooseDir(s, "normal");
  assert.deepEqual(dir, DIR.UP,
    "[회귀] 가까운 음식 방향(UP)이 개방 공간(DOWN)보다 우선되어야 함 — 구 공식은 이 테스트를 FAIL");
});

test("BF-576 AC3-2: cpuChooseDir 회귀 — easy 난이도에서도 음식 방향 우선", () => {
  // easy: visionRange=3, avoidanceThreshold=2, foodPriorityWeight=0.4
  // CPU (5,5) cpuDir=LEFT, food=(5,3) 2칸 위
  // UP: safeLen=min(5,3)=3 (visionRange=3), avoidanceThreshold=2 → 3>=2 → 정규화
  //     (3/3)*0.6 + 1.0*0.4 = 0.6+0.4 = 1.0
  // DOWN: safeLen=3(max), foodScore=0.0
  //     (3/3)*0.6 + 0.0*0.4 = 0.6
  // → UP(1.0) > DOWN(0.6) ✓
  const s = makeCpuState({
    food: { x: 5, y: 3, multiplier: 1 },
  });
  const dir = cpuChooseDir(s, "easy");
  assert.deepEqual(dir, DIR.UP,
    "[회귀 easy] easy 난이도에서도 가까운 음식 방향(UP) 우선");
});

test("BF-576 AC3-3: cpuChooseDir 회귀 — 기존 테스트 호환 (음식 바로 오른쪽)", () => {
  // BF-530 §2-4 회귀: 음식이 바로 옆(1칸)에 있으면 그 방향 선택
  // CPU (10,7) cpuDir=RIGHT, food=(11,7) — 바로 오른쪽 1칸
  const s = makeCpuState({
    cols:   20,
    rows:   15,
    snake:  [{ x: 1, y: 1 }, { x: 0, y: 1 }],
    cpu:    [{ x: 10, y: 7 }, { x: 9, y: 7 }],
    cpuDir: DIR.RIGHT,
    food:   { x: 11, y: 7, multiplier: 1 },
  });
  const dir = cpuChooseDir(s, "normal");
  assert.deepEqual(dir, DIR.RIGHT,
    "[회귀] 음식이 바로 오른쪽에 있을 때 RIGHT 선택 (BF-530 §2-4 호환)");
});

test("BF-576 AC3-4: cpuChooseDir 회귀 — 반대 방향(자살) 선택 금지", () => {
  // cpuDir=RIGHT → LEFT 선택 금지
  const s = makeCpuState({
    cpu:    [{ x: 10, y: 7 }, { x: 9, y: 7 }],
    cpuDir: DIR.RIGHT,
    food:   { x: 10, y: 0, multiplier: 1 },  // 위 방향 음식
  });
  for (let i = 0; i < 10; i++) {
    const dir = cpuChooseDir(s, "normal");
    assert.ok(
      !(dir.x === -1 && dir.y === 0),
      "반대 방향(LEFT) 선택 금지 (BF-530 §2-2 호환)",
    );
  }
});

test("BF-576 AC3-5: cpuChooseDir 회귀 — 벽 직전 방향 선택 금지", () => {
  // CPU 가 오른쪽 끝 (cols-1, 5), cpuDir=RIGHT → RIGHT 는 즉시 벽 → 선택 불가
  const s = makeCpuState({
    cols:   10,
    rows:   10,
    snake:  [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    cpu:    [{ x: 9, y: 5 }, { x: 8, y: 5 }],
    cpuDir: DIR.RIGHT,
    food:   { x: 5, y: 0, multiplier: 1 },
  });
  const dir = cpuChooseDir(s, "normal");
  assert.ok(
    !(dir.x === 1 && dir.y === 0),
    "오른쪽 벽 방향(RIGHT) 선택 금지 (BF-530 §2-3 호환)",
  );
});
