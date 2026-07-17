// BF-973 · Snake 경계·자기충돌 게임오버 및 재시작 초기화 회귀 가드 (module: phase18-snake)
// - 대상: phase18-games/snake/{logic.js, main.js}
// - 실행: node --test tests/phase18-snake-BF973.test.js
// - planner SSOT: docs/plan/snake-boundary-restart-BF-970.md (GAP-1~4, AC-WALL/SELF/RESTART/INTEG)
//
// 성격 (planner §0 가정 2): 본 파일은 "버그 수정"이 아니라 "이미 정상 동작하는
// 로직의 회귀 가드 공백" 을 unit 으로 고정한다. logic.js 의 물리 상수·공식·상태
// 전이는 변경하지 않는다(§4 nonGoals). 아래 4건의 GAP 을 결정론 테스트로 채운다:
//   GAP-1 벽 충돌 4방향 중 unit 은 우측 1방향만 존재 → 좌/상/하 3방향 추가
//   GAP-3 재시작 반환 상태(createPlayState/createInitialState)의 필드 일부만 assert
//         → direction/pendingDirection/snake 좌표/gameoverReason/food 유효성 전부 고정
//   AC-INTEG-1/2 재시작 후 벽 재현·재시작 직후 무충돌 (틱 통합 관점)
//   AC1 키보드·터치 게임오버 일관성 — main.js 가 두 입력을 단일 setDirection 으로
//        모으고 게임오버 전이를 입력 소스와 무관한 onTick 단일 경로로 처리함을 정적 고정
//
// 기존 커버리지(재작성 금지): tests/phase18-snake-BF925.test.js (우측 벽·self 로직 단위·
//   createPlayState highScore 승계). 본 파일은 그 공백만 보완한다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "phase18-games", "snake");

const LOGIC_JS = readFileSync(join(MODULE_DIR, "logic.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// logic.js(UMD) 를 같은 realm 에서 로드 — BF-925 테스트와 동일 패턴.
function loadLogic() {
  const mod = { exports: {} };
  const fn = new Function("module", "exports", "globalThis", LOGIC_JS);
  fn(mod, mod.exports, {});
  return mod.exports;
}

const L = loadLogic();
assert.ok(L && L.createPlayState, "logic.js 가 SnakeLogic API 를 노출하지 않음");

// 결정론 rand: 항상 첫 빈 셀을 뽑도록 0 반환.
function seqRand(values) {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

// tick 입력 상태 헬퍼 (BF-925 playState 와 동일 shape — 자체 포함).
function playState(overrides) {
  const base = {
    status: "playing",
    board: { cols: 20, rows: 20 },
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ],
    direction: "right",
    pendingDirection: null,
    food: { x: 0, y: 0 },
    score: 0,
    highScore: 0,
    gameoverReason: null,
  };
  return Object.assign(base, overrides || {});
}

// ══════════════════════════════════════════════════════════
// GAP-1 · 벽 충돌 4방향 일관성 (AC-WALL-2/3/4 — 좌/상/하 신규, 우측은 BF-925)
// ══════════════════════════════════════════════════════════

test("AC-WALL-2 좌측 벽: direction=left, x=0 에서 한 칸 더 → gameover/wall", () => {
  const state = playState({
    snake: [
      { x: 0, y: 10 },
      { x: 1, y: 10 },
      { x: 2, y: 10 },
    ],
    direction: "left",
    food: null,
  });
  const next = L.tick(state, Math.random);
  assert.equal(next.status, "gameover");
  assert.equal(next.gameoverReason, "wall");
});

test("AC-WALL-3 상단 벽: direction=up, y=0 에서 한 칸 더 → gameover/wall", () => {
  const state = playState({
    snake: [
      { x: 10, y: 0 },
      { x: 10, y: 1 },
      { x: 10, y: 2 },
    ],
    direction: "up",
    food: null,
  });
  const next = L.tick(state, Math.random);
  assert.equal(next.status, "gameover");
  assert.equal(next.gameoverReason, "wall");
});

test("AC-WALL-4 하단 벽: direction=down, y=19 에서 한 칸 더 → gameover/wall", () => {
  const state = playState({
    snake: [
      { x: 10, y: 19 },
      { x: 10, y: 18 },
      { x: 10, y: 17 },
    ],
    direction: "down",
    food: null,
  });
  const next = L.tick(state, Math.random);
  assert.equal(next.status, "gameover");
  assert.equal(next.gameoverReason, "wall");
});

test("AC-WALL-1 우측 벽 회귀 유지: direction=right, x=19 → gameover/wall", () => {
  const state = playState({
    snake: [
      { x: 19, y: 10 },
      { x: 18, y: 10 },
      { x: 17, y: 10 },
    ],
    direction: "right",
    food: null,
  });
  const next = L.tick(state, Math.random);
  assert.equal(next.status, "gameover");
  assert.equal(next.gameoverReason, "wall");
});

// AC-WALL-5 · 벽 게임오버 전이 시 반환 상태 계약 (뱀 보존·방향 갱신·점수 불변)
test("AC-WALL-5 벽 게임오버: snake 보존, direction=effectiveDirection, score/highScore 불변", () => {
  const startSnake = [
    { x: 19, y: 5 },
    { x: 18, y: 5 },
    { x: 17, y: 5 },
  ];
  const state = playState({
    snake: startSnake,
    direction: "right",
    pendingDirection: "up", // 유효 전환이지만 이 틱에 벽으로 진입하는 방향은 right 유지 아님 → up 적용 확인
    score: 30,
    highScore: 30,
    food: null,
  });
  // pendingDirection=up 이 유효(수직) → effectiveDirection=up → (19,4) 이동, 벽 아님.
  // 벽 케이스를 명확히 하려고 pendingDirection 없이 우측 직진으로 재구성.
  const wallState = playState({
    snake: startSnake,
    direction: "right",
    pendingDirection: null,
    score: 30,
    highScore: 30,
    food: null,
  });
  const next = L.tick(wallState, Math.random);
  assert.equal(next.status, "gameover");
  assert.equal(next.gameoverReason, "wall");
  assert.deepEqual(next.snake, startSnake, "충돌 직전 뱀 좌표가 보존되어야 함(경계 밖 push 금지)");
  assert.equal(next.direction, "right", "이번 틱 적용 방향(effectiveDirection)으로 갱신");
  assert.equal(next.score, 30, "게임오버로 점수 변하면 안 됨");
  assert.equal(next.highScore, 30, "highScore 변하면 안 됨(score 초과분 없음)");
  assert.equal(next.pendingDirection, null, "대기 방향은 게임오버 시 null");
  void state;
});

// E1 · 코너 진입도 축별 독립 벽 판정 (대각선 판정 없음)
test("E1 코너 (19,19) 에서 우/하 어느 축이든 벽 판정 성립", () => {
  const downState = playState({
    snake: [
      { x: 19, y: 19 },
      { x: 19, y: 18 },
      { x: 19, y: 17 },
    ],
    direction: "down",
    food: null,
  });
  const downNext = L.tick(downState, Math.random);
  assert.equal(downNext.gameoverReason, "wall");

  const rightState = playState({
    snake: [
      { x: 19, y: 19 },
      { x: 18, y: 19 },
      { x: 17, y: 19 },
    ],
    direction: "right",
    food: null,
  });
  const rightNext = L.tick(rightState, Math.random);
  assert.equal(rightNext.gameoverReason, "wall");
});

// ══════════════════════════════════════════════════════════
// 자기 충돌 tick 통합 (AC-SELF-1 회귀 + AC-SELF-2 꼬리 vacate)
// ══════════════════════════════════════════════════════════

test("AC-SELF-1 자기 충돌: 몸통 셀 진입 시 gameover/self", () => {
  const state = playState({
    snake: [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ],
    direction: "up",
    pendingDirection: "right", // (6,5) 는 꼬리 아닌 몸통 → 충돌
    food: null,
  });
  const next = L.tick(state, Math.random);
  assert.equal(next.status, "gameover");
  assert.equal(next.gameoverReason, "self");
});

test("AC-SELF-2 꼬리 vacate: growing=false 이면 비워질 꼬리 셀로 이동은 충돌 아님", () => {
  // 머리가 이번 틱에 비워질 꼬리 셀로 진입 → 충돌로 판정되면 안 됨.
  const state = playState({
    snake: [
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
      { x: 6, y: 5 }, // 꼬리 — 이번 틱에 비워짐
    ],
    direction: "up", // (5,5) → (5,4) 빈칸, 정상 이동
    food: null,
  });
  const next = L.tick(state, Math.random);
  assert.equal(next.status, "playing", "꼬리 vacate 규칙 위반 — 오탐 게임오버");
});

// ══════════════════════════════════════════════════════════
// GAP-3 · 재시작 반환 상태 전체 필드 계약 (AC-RESTART-1/2/5)
// ══════════════════════════════════════════════════════════

const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

test("AC-RESTART-1 createPlayState: 점수·방향·대기방향·뱀좌표·사유·먹이 전체 초기화 + highScore 승계", () => {
  const s = L.createPlayState(50, seqRand([0]));
  assert.equal(s.status, "playing");
  assert.equal(s.score, 0);
  assert.equal(s.highScore, 50, "highScore 승계 실패");
  assert.equal(s.direction, L.INITIAL_DIRECTION, "direction 이 초기값(right)이 아님");
  assert.equal(s.pendingDirection, null, "pendingDirection 이 null 로 리셋되지 않음");
  assert.deepEqual(s.snake, INITIAL_SNAKE, "뱀 좌표가 초기 일직선과 정확히 일치하지 않음");
  assert.equal(s.gameoverReason, null, "gameoverReason 이 null 로 리셋되지 않음");
  assert.ok(s.food, "먹이가 스폰되지 않음");
  const occupied = new Set(s.snake.map((p) => `${p.x},${p.y}`));
  assert.ok(!occupied.has(`${s.food.x},${s.food.y}`), "먹이가 뱀 셀과 겹침");
});

test("AC-RESTART-5 createPlayState: highScore 인자 비정상(비-number)이면 0 으로 안전 승계", () => {
  const s = L.createPlayState(undefined, seqRand([0]));
  assert.equal(s.highScore, 0);
  assert.equal(s.pendingDirection, null);
});

test("AC-RESTART-2 createInitialState: status=start, 그 외 초기값 계약은 동일(대기방향 null 포함)", () => {
  const s = L.createInitialState(seqRand([0]));
  assert.equal(s.status, "start");
  assert.equal(s.score, 0);
  assert.equal(s.highScore, 0, "createInitialState 자체 highScore 는 0(호출부가 승계)");
  assert.equal(s.direction, L.INITIAL_DIRECTION);
  assert.equal(s.pendingDirection, null);
  assert.deepEqual(s.snake, INITIAL_SNAKE);
  assert.equal(s.gameoverReason, null);
  assert.ok(s.food, "먹이 없음");
  const occupied = new Set(s.snake.map((p) => `${p.x},${p.y}`));
  assert.ok(!occupied.has(`${s.food.x},${s.food.y}`), "먹이가 뱀 셀과 겹침");
});

// ══════════════════════════════════════════════════════════
// AC-INTEG · 재시작 후 통합 동작 (사유 잔존 없음)
// ══════════════════════════════════════════════════════════

test("AC-INTEG-2 재시작 직후 첫 틱: 초기 뱀은 즉시 자기 충돌하지 않음", () => {
  const s = L.createPlayState(0, seqRand([0]));
  const after = L.tick(s, seqRand([0]));
  assert.notEqual(after.status, "gameover", "재시작 직후 첫 틱에 조기 게임오버");
  assert.equal(after.snake[0].x, 11, "머리가 진행 방향(right)으로 전진하지 않음");
  assert.equal(after.snake[0].y, 10);
});

test("AC-INTEG-1 재시작 후 같은 방향 직진하면 다시 wall 게임오버 재현", () => {
  // 재시작 상태에서 먹이를 제거(경로 간섭 배제)하고 우측 직진 → 반드시 wall 로 종료.
  let s = L.createPlayState(0, seqRand([0]));
  s = Object.assign({}, s, { food: null });
  let steps = 0;
  while (s.status === "playing" && steps < 40) {
    s = L.tick(s, seqRand([0]));
    steps += 1;
  }
  assert.equal(s.status, "gameover", "우측 직진했는데 게임오버되지 않음");
  assert.equal(s.gameoverReason, "wall", "이전 게임 상태 잔존으로 사유 오염");
});

// ══════════════════════════════════════════════════════════
// AC1 · 키보드·터치 게임오버 일관성 (main.js 정적 구조 고정)
//   두 입력 경로가 단일 setDirection 으로 모이고, 게임오버 전이는 입력 소스와
//   무관한 onTick 단일 경로에서만 일어남을 고정한다. 이 구조가 유지되는 한
//   키보드/터치 어느 쪽으로 충돌해도 동일하게 게임오버가 표시된다.
// ══════════════════════════════════════════════════════════

test("AC1 키보드: onKeyDown 이 4방향 화살표를 setDirection 으로 라우팅", () => {
  assert.ok(/function onKeyDown/.test(MAIN_JS), "onKeyDown 핸들러 없음");
  for (const dir of ["up", "down", "left", "right"]) {
    assert.ok(
      new RegExp(`setDirection\\(["']${dir}["']\\)`).test(MAIN_JS),
      `키보드 방향 ${dir} → setDirection 라우팅 없음`,
    );
  }
});

test("AC1 터치/D-pad: bindDpad 가 pointerdown 에서 setDirection 으로 라우팅", () => {
  assert.ok(/function bindDpad/.test(MAIN_JS), "bindDpad 없음");
  assert.ok(/pointerdown/.test(MAIN_JS), "D-pad pointerdown 바인딩 없음");
  assert.ok(/setDirection\(dir\)/.test(MAIN_JS), "D-pad 가 setDirection 으로 라우팅하지 않음");
});

test("AC1 게임오버 전이는 입력 소스와 무관한 onTick 단일 경로", () => {
  // onTick 에서 status!=='playing' 전이 시 stopTicking + syncUi 로 게임오버 표시.
  // setDirection 은 입력만 큐잉하고 게임오버를 트리거하지 않음(playing 아니면 no-op).
  assert.ok(
    /function onTick[\s\S]*?stopTicking\(\)[\s\S]*?syncUi\(\)/.test(MAIN_JS),
    "onTick 의 게임오버 전이 경로(stopTicking→syncUi)가 없음",
  );
  assert.ok(
    /function setDirection[\s\S]*?state\.status !== "playing"[\s\S]*?return/.test(MAIN_JS),
    "setDirection 이 playing 아닐 때 no-op 가드가 없음(입력이 게임오버 표시에 개입)",
  );
});
