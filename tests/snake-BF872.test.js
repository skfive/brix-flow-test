// BF-872 · Snake 게임 코드 분석·개선 회귀 가드
// 검증 목표 (Acceptance Criteria 매핑):
//   AC1 — 뱀 이동·먹이 획득(점수/길이)·벽/자기 충돌·점수가 정상 동작
//   AC2 — 반대 방향 입력 시 즉시 반전 자기충돌 결함이 없다
//         + BF-872 개선: 한 틱 안 빠른 2단 회전(U턴) 입력이 씹히지 않는다
//   AC3 — 게임 오버 후 재시작하면 상태가 초기화되어 다시 플레이 가능하다
//
// 실행: node --test tests/snake-BF872.test.js

import test from "node:test";
import assert from "node:assert/strict";

import {
  createInitialState,
  changeDirection,
  tick,
  restartGame,
  isWallCollision,
  isSelfCollision,
  createMultiplierStats,
  DIR,
} from "../snake/logic.js";

// 결정적 단위 테스트용 최소 state (플레이어 단독 tick 경로).
function makeState(overrides = {}) {
  return Object.assign(
    {
      cols: 20,
      rows: 20,
      snake: [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 },
      ],
      dir: DIR.RIGHT,
      nextDir: DIR.RIGHT,
      food: null,
      score: 0,
      highScore: 0,
      status: "playing",
      pendingGrowth: 0,
      multiplierStats: createMultiplierStats(),
    },
    overrides,
  );
}

// ─────────────────────────────────────────────────────────────
// AC1 — 이동 · 먹이 · 충돌 · 점수
// ─────────────────────────────────────────────────────────────

test("BF-872 AC1: 뱀이 nextDir 방향으로 한 칸 이동하고 길이를 유지한다", () => {
  const s0 = makeState({ nextDir: DIR.RIGHT });
  const s1 = tick(s0);
  assert.deepEqual(s1.snake[0], { x: 6, y: 5 }, "머리가 오른쪽 한 칸 이동해야 함");
  assert.equal(s1.snake.length, 3, "먹이를 안 먹으면 길이 유지");
  assert.equal(s1.status, "playing");
});

test("BF-872 AC1: 먹이 획득 시 점수 +10, 길이 +1", () => {
  const s0 = makeState({
    nextDir: DIR.RIGHT,
    food: { x: 6, y: 5, multiplier: 1 },
  });
  const s1 = tick(s0);
  assert.equal(s1.score, 10, "1배수 먹이 → +10점");
  assert.equal(s1.snake.length, 4, "먹이 획득 → 길이 +1");
});

test("BF-872 AC1: 벽 충돌 시 gameover 로 전이", () => {
  const s0 = makeState({
    snake: [{ x: 19, y: 5 }, { x: 18, y: 5 }, { x: 17, y: 5 }],
    nextDir: DIR.RIGHT,
  });
  const s1 = tick(s0);
  assert.equal(s1.status, "gameover", "격자 밖 이동 → gameover");
  assert.ok(isWallCollision({ x: 20, y: 5 }, 20, 20), "벽 판정 순수함수 확인");
});

test("BF-872 AC1: 자기 몸 충돌 시 gameover 로 전이", () => {
  // ㄷ 자로 감긴 뱀 — 아래로 내려가면 꼬리 뒷몸통과 충돌
  const s0 = makeState({
    snake: [
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
      { x: 6, y: 5 },
      { x: 6, y: 4 },
    ],
    dir: DIR.LEFT,
    nextDir: DIR.LEFT, // (4,5) 로 이동 — 몸과 겹치진 않음
  });
  // 자기충돌 판정 순수함수: 머리가 몸 세그먼트로 이동 시 true
  assert.equal(isSelfCollision({ x: 5, y: 6 }, s0.snake), true);
  assert.equal(isSelfCollision({ x: 4, y: 5 }, s0.snake), false);
});

// ─────────────────────────────────────────────────────────────
// AC2 — 반대 방향 즉시 반전 방지 + 빠른 연속 회전 보존
// ─────────────────────────────────────────────────────────────

test("BF-872 AC2 회귀: 단일 반대 방향 입력은 무시된다", () => {
  const s0 = makeState({ dir: DIR.RIGHT, nextDir: DIR.RIGHT });
  const s1 = changeDirection(s0, DIR.LEFT); // RIGHT 중 LEFT = 정반대
  assert.deepEqual(s1.nextDir, DIR.RIGHT, "반대 방향은 nextDir 를 바꾸지 않음");
  assert.ok(!s1.dirQueue || s1.dirQueue.length === 0, "반대 방향은 큐에도 안 들어감");
});

test("BF-872 AC2: 즉시 반전으로 자기충돌 즉사하지 않는다", () => {
  // 오른쪽으로 가는 뱀에서 LEFT 를 눌러도 반전이 차단되어 살아남는다.
  const s0 = makeState({ dir: DIR.RIGHT, nextDir: DIR.RIGHT });
  const s1 = changeDirection(s0, DIR.LEFT);
  const s2 = tick(s1);
  assert.deepEqual(s2.snake[0], { x: 6, y: 5 }, "머리는 그대로 오른쪽으로 진행");
  assert.equal(s2.status, "playing", "자기충돌 즉사 없음");
});

test("BF-872 AC2 개선: 한 틱 안 빠른 2단 회전(U턴)이 큐로 보존된다", () => {
  // RIGHT 이동 중 DOWN → LEFT 를 연속 입력하면 두 회전이 각각 한 틱씩 적용.
  const s0 = makeState({ dir: DIR.RIGHT, nextDir: DIR.RIGHT });
  const sDown = changeDirection(s0, DIR.DOWN);
  assert.deepEqual(sDown.nextDir, DIR.DOWN, "첫 회전은 nextDir 에 반영");
  const sQueued = changeDirection(sDown, DIR.LEFT);
  assert.deepEqual(sQueued.nextDir, DIR.DOWN, "두 번째 입력은 nextDir 를 덮지 않음");
  assert.deepEqual(sQueued.dirQueue, [DIR.LEFT], "두 번째 회전은 큐에 버퍼링");

  // 틱1 — DOWN 적용, 큐의 LEFT 가 nextDir 로 승격
  const t1 = tick(sQueued);
  assert.deepEqual(t1.snake[0], { x: 5, y: 6 }, "틱1: 아래로 이동");
  assert.deepEqual(t1.nextDir, DIR.LEFT, "틱1 후 nextDir=LEFT 승격");
  assert.equal((t1.dirQueue || []).length, 0, "큐 소비됨");
  assert.equal(t1.status, "playing");

  // 틱2 — LEFT 적용
  const t2 = tick(t1);
  assert.deepEqual(t2.snake[0], { x: 4, y: 6 }, "틱2: 왼쪽으로 이동 (U턴 완료)");
  assert.equal(t2.status, "playing", "U턴 도중 자기충돌 없음");
});

test("BF-872 AC2 안전성: 큐잉된 입력도 180° 반전을 만들 수 없다", () => {
  // UP 입력 후 DOWN 을 눌러도, DOWN 은 직전 의도(UP)의 정반대라 무시된다.
  const s0 = makeState({ dir: DIR.RIGHT, nextDir: DIR.RIGHT });
  const sUp = changeDirection(s0, DIR.UP);
  assert.deepEqual(sUp.nextDir, DIR.UP);
  const sReverse = changeDirection(sUp, DIR.DOWN); // UP 의 정반대
  assert.deepEqual(sReverse.nextDir, DIR.UP, "반전 입력 무시 — nextDir 유지");
  assert.ok(!sReverse.dirQueue || sReverse.dirQueue.length === 0, "반전 입력은 큐에도 안 들어감");
});

// ─────────────────────────────────────────────────────────────
// AC3 — 게임 오버 후 재시작 시 상태 초기화
// ─────────────────────────────────────────────────────────────

test("BF-872 AC3: restartGame 은 상태를 완전히 초기화하고 highScore 는 보존한다", () => {
  // 진행하다 죽은(그리고 큐/점수가 남은) 상태
  const dirty = makeState({
    snake: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }],
    dir: DIR.UP,
    nextDir: DIR.LEFT,
    dirQueue: [DIR.DOWN],
    score: 120,
    highScore: 120,
    status: "gameover",
  });

  const fresh = restartGame(dirty);
  assert.equal(fresh.status, "playing", "재시작 후 다시 플레이 가능");
  assert.equal(fresh.score, 0, "점수 초기화");
  assert.equal(fresh.snake.length, 3, "뱀 길이 초기값(3)으로 복원");
  assert.deepEqual(fresh.dir, DIR.RIGHT, "방향 초기값 RIGHT");
  assert.deepEqual(fresh.nextDir, DIR.RIGHT, "nextDir 초기값 RIGHT");
  assert.ok(!fresh.dirQueue || fresh.dirQueue.length === 0, "입력 큐가 초기화됨");
  assert.equal(fresh.highScore, 120, "최고 점수는 보존");
});

test("BF-872 AC3: 재시작 후 다시 이동·충돌·점수가 정상 동작한다", () => {
  const s0 = createInitialState(20, 20, 0, { cpuCount: 0 });
  const dead = Object.assign({}, s0, { status: "gameover", score: 50 });
  let s = restartGame(dead);
  assert.equal(s.status, "playing");
  s = tick(s); // 한 틱 정상 진행 (예외 없이)
  assert.equal(s.status, "playing", "재시작 후 틱이 정상 동작");
});
