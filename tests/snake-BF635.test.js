// BF-635 · snake 게임 아이템 먹기 버그 수정
//
// 버그 원인: tickWithItems 에서 cpuCount=0 (솔로 모드) 시
//   s.cpu = [] → cpuHead = s.cpu[0] = undefined
//   → cpuHead.x 접근 → TypeError (좌표 비교 전 크래시)
//   → state 업데이트 안 됨 → 음식 먹어도 점수/길이 불변
//
// AC 매핑:
//   AC1 — cpuCount=0(솔로) + cpuCount=1(경쟁) 모두 음식 충돌 시 점수+길이 증가
//   AC2 — 음식 먹은 직후 다음 틱에 새 음식 재배치
//   AC3 — 정수화 가드: cpuHead null 가드 + canMoveCpu 플래그로 TypeError 방지
//
// 실행: node --test tests/snake-BF635.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState,
  tickWithItems,
  SNAKE_SETTINGS_DEFAULTS,
  DIR,
} from "../snake/logic.js";

// ─────────────────────────────────────────────────────────────
// 헬퍼 — 음식 바로 옆에 뱀을 배치하고 food 위치를 확정
// ─────────────────────────────────────────────────────────────
function makeStateWithFoodAhead(cpuCount) {
  const settings = { ...SNAKE_SETTINGS_DEFAULTS, cpuCount };
  const base = createInitialState(20, 20, 0, settings);
  // 음식을 (5,5), 뱀 머리를 (4,5)로 강제 배치
  const forcedFood = { x: 5, y: 5, multiplier: 1 };
  const forcedSnake = [{ x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }];
  const forcedCpu = cpuCount > 0
    ? [{ x: 15, y: 15 }, { x: 16, y: 15 }, { x: 17, y: 15 }]
    : [];
  return {
    ...base,
    snake:   forcedSnake,
    nextDir: DIR.RIGHT, // 오른쪽 이동 → (5,5) 도달
    food:    forcedFood,
    cpu:     forcedCpu,
    cpuDir:  DIR.LEFT,
    pendingGrowth:    0,
    cpuPendingGrowth: 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// §1. AC1 — 솔로 모드(cpuCount=0): 음식 충돌 시 점수/길이 증가
// ═══════════════════════════════════════════════════════════════
describe("BF-635 §1 솔로 모드(cpuCount=0) 음식 충돌 — 점수/길이 증가", () => {
  test("§1-1 tickWithItems 가 TypeError 없이 완료된다", () => {
    const state = makeStateWithFoodAhead(0);
    assert.doesNotThrow(
      () => tickWithItems(state, Date.now(), true, false),
      "cpuCount=0 솔로 모드에서 tickWithItems 가 TypeError 를 던지면 안 됩니다",
    );
  });

  test("§1-2 음식 좌표에 도달했을 때 점수가 증가한다 (multiplier=1 → +10)", () => {
    const state = makeStateWithFoodAhead(0);
    const next = tickWithItems(state, Date.now(), true, false);
    assert.ok(
      next.score > state.score,
      `점수가 증가해야 합니다: before=${state.score}, after=${next.score}`,
    );
    assert.equal(next.score, state.score + 10, "multiplier=1 → score += 10");
  });

  test("§1-3 음식을 먹으면 뱀 길이가 1 늘어난다", () => {
    const state = makeStateWithFoodAhead(0);
    const next = tickWithItems(state, Date.now(), true, false);
    assert.equal(
      next.snake.length,
      state.snake.length + 1,
      `길이가 1 늘어야 합니다: before=${state.snake.length}, after=${next.snake.length}`,
    );
  });

  test("§1-4 moveCpu=true 전달 시에도 TypeError 없이 완료된다 (game loop 는 moveCpu 를 항상 누적)", () => {
    const state = makeStateWithFoodAhead(0);
    assert.doesNotThrow(
      () => tickWithItems(state, Date.now(), true, true),
      "cpu=[] 인 상태에서 moveCpu=true 로 호출 시 TypeError 금지",
    );
  });

  test("§1-5 moveCpu=true 전달 시도 점수가 정상 증가한다", () => {
    const state = makeStateWithFoodAhead(0);
    const next = tickWithItems(state, Date.now(), true, true);
    assert.ok(
      next.score > state.score,
      "cpu=[] + moveCpu=true 조합에서도 음식 충돌 점수 증가 필요",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §2. AC1 — 경쟁 모드(cpuCount=1): 기존 동작 보존
// ═══════════════════════════════════════════════════════════════
describe("BF-635 §2 경쟁 모드(cpuCount=1) 음식 충돌 — 점수/길이 증가", () => {
  test("§2-1 cpuCount=1 에서 tickWithItems 가 정상 완료된다", () => {
    const state = makeStateWithFoodAhead(1);
    assert.doesNotThrow(
      () => tickWithItems(state, Date.now(), true, true),
    );
  });

  test("§2-2 cpuCount=1 에서 음식 충돌 시 점수 증가", () => {
    const state = makeStateWithFoodAhead(1);
    const next = tickWithItems(state, Date.now(), true, true);
    assert.ok(
      next.score > state.score,
      `cpuCount=1 에서 점수 증가 필요: before=${state.score}, after=${next.score}`,
    );
  });

  test("§2-3 cpuCount=1 에서 음식 충돌 시 길이 증가", () => {
    const state = makeStateWithFoodAhead(1);
    const next = tickWithItems(state, Date.now(), true, true);
    assert.equal(
      next.snake.length,
      state.snake.length + 1,
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §3. AC2 — 음식 먹은 직후 새 음식 재배치
// ═══════════════════════════════════════════════════════════════
describe("BF-635 §3 음식 먹은 후 즉시 재배치", () => {
  test("§3-1 솔로 모드: 음식 먹은 후 새 음식이 보드 안에 배치된다", () => {
    const state = makeStateWithFoodAhead(0);
    const prev = state.food;
    const next = tickWithItems(state, Date.now(), true, false);
    // 음식이 새로 스폰됐거나 보드가 꽉 차서 null
    if (next.food !== null) {
      assert.ok(
        next.food !== prev,
        "음식 먹은 후 새 음식 객체가 생성돼야 합니다",
      );
      assert.ok(next.food.x >= 0 && next.food.x < state.cols, "새 음식 x 좌표 유효");
      assert.ok(next.food.y >= 0 && next.food.y < state.rows, "새 음식 y 좌표 유효");
      // 좌표 정수화 검증: x, y 는 항상 정수여야 한다
      assert.equal(next.food.x, Math.floor(next.food.x), "새 음식 x 좌표는 정수");
      assert.equal(next.food.y, Math.floor(next.food.y), "새 음식 y 좌표는 정수");
    }
  });

  test("§3-2 경쟁 모드: 음식 먹은 후 새 음식이 보드 안에 배치된다", () => {
    const state = makeStateWithFoodAhead(1);
    const prev = state.food;
    const next = tickWithItems(state, Date.now(), true, true);
    if (next.food !== null) {
      assert.ok(next.food !== prev, "새 음식 객체 생성 필요");
      assert.equal(next.food.x, Math.floor(next.food.x), "새 음식 x 좌표는 정수");
      assert.equal(next.food.y, Math.floor(next.food.y), "새 음식 y 좌표는 정수");
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// §4. AC3 — 정수화 좌표 비교 보장: snakeHead 좌표는 항상 정수
// ═══════════════════════════════════════════════════════════════
describe("BF-635 §4 좌표 정수화 보장", () => {
  test("§4-1 틱 후 뱀 머리 x,y 는 정수다 (cpuCount=0)", () => {
    const state = makeStateWithFoodAhead(0);
    const next = tickWithItems(state, Date.now(), true, false);
    const head = next.snake[0];
    assert.equal(head.x, Math.floor(head.x), "뱀 머리 x 가 정수여야 함");
    assert.equal(head.y, Math.floor(head.y), "뱀 머리 y 가 정수여야 함");
  });

  test("§4-2 틱 후 뱀 머리 x,y 는 정수다 (cpuCount=1)", () => {
    const state = makeStateWithFoodAhead(1);
    const next = tickWithItems(state, Date.now(), true, true);
    const head = next.snake[0];
    assert.equal(head.x, Math.floor(head.x), "뱀 머리 x 가 정수여야 함");
    assert.equal(head.y, Math.floor(head.y), "뱀 머리 y 가 정수여야 함");
  });

  test("§4-3 음식 좌표와 뱀 머리 좌표가 정확히 일치할 때만 음식을 먹는다", () => {
    // 뱀이 음식 옆에 있지 않을 때는 먹으면 안 됨
    const settings = { ...SNAKE_SETTINGS_DEFAULTS, cpuCount: 0 };
    const base = createInitialState(20, 20, 0, settings);
    const notEatingState = {
      ...base,
      snake:   [{ x: 4, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 4 }],
      nextDir: DIR.RIGHT, // → (5,4)
      food:    { x: 5, y: 5, multiplier: 1 }, // y가 다름 → 먹지 않아야 함
      cpu:     [],
      pendingGrowth: 0,
    };
    const next = tickWithItems(notEatingState, Date.now(), true, false);
    assert.equal(next.score, notEatingState.score, "음식 좌표 불일치 시 점수 불변");
    assert.equal(next.snake.length, notEatingState.snake.length, "음식 좌표 불일치 시 길이 불변");
  });
});
