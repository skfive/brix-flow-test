/* BF-995 · 스네이크 캐너리 순수 로직 단위 테스트 (dev 자체 커버리지)
 * 기획 SSOT: docs/planning/snake-canary-BF-989.md §3(규칙)·§4(점수)·§5(상태)
 * co-located: owned_paths(demo/snake-canary/**) 안. tester(BF-998)의 tests/snake-canary-*.test.js 와 별개.
 * 실행: node --test demo/snake-canary/logic.test.js
 * repo 관례(root package.json "type":"module") — ESM import + UMD 로직은 new Function 샌드박스 로드.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGIC_JS = readFileSync(join(__dirname, "logic.js"), "utf8");

// logic.js(UMD)를 같은 realm 에서 로드해 SnakeCanaryLogic API 추출
const L = (() => {
  const mod = { exports: {} };
  const g = {};
  const fn = new Function("module", "exports", "globalThis", LOGIC_JS);
  fn(mod, mod.exports, g);
  return mod.exports.createInitialState ? mod.exports : g.SnakeCanaryLogic;
})();

assert.ok(L && L.createInitialState, "logic.js 가 SnakeCanaryLogic API 를 노출하지 않음");

test("상수·방향 벡터가 기획 §3.1 값과 일치", () => {
  assert.equal(L.BOARD_COLS, 20);
  assert.equal(L.BOARD_ROWS, 20);
  assert.equal(L.CELL_SIZE, 20);
  assert.equal(L.TICK_INTERVAL_MS, 150);
  assert.equal(L.INITIAL_SNAKE_LENGTH, 3);
  assert.equal(L.SCORE_PER_FOOD, 10);
  assert.deepEqual(L.DIRECTION_VECTORS.up, { dx: 0, dy: -1 });
  assert.deepEqual(L.DIRECTION_VECTORS.down, { dx: 0, dy: 1 });
  assert.deepEqual(L.DIRECTION_VECTORS.left, { dx: -1, dy: 0 });
  assert.deepEqual(L.DIRECTION_VECTORS.right, { dx: 1, dy: 0 });
});

test("createInitialState: idle·초기 뱀·score 0·먹이는 뱀 밖 (기획 §3.2·§5.1)", () => {
  const s = L.createInitialState();
  assert.equal(s.status, "idle");
  assert.equal(s.score, 0);
  assert.equal(s.direction, "right");
  assert.equal(s.pendingDirection, null);
  assert.equal(s.gameoverReason, null);
  assert.deepEqual(s.snake, [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  assert.equal(s.snake.length, 3);
  const occ = new Set(s.snake.map((c) => `${c.x},${c.y}`));
  assert.ok(!occ.has(`${s.food.x},${s.food.y}`));
});

test("startGame: idle/gameover → playing 전체 초기화·score 0 (기획 §5.2)", () => {
  const s = L.startGame();
  assert.equal(s.status, "playing");
  assert.equal(s.score, 0);
  assert.equal(s.direction, "right");
  assert.equal(s.snake.length, 3);
  assert.equal(s.gameoverReason, null);
});

test("isWallCollision: 경계 밖 true, 안쪽 false (기획 §3.4)", () => {
  assert.equal(L.isWallCollision({ x: -1, y: 5 }), true);
  assert.equal(L.isWallCollision({ x: 20, y: 5 }), true);
  assert.equal(L.isWallCollision({ x: 5, y: -1 }), true);
  assert.equal(L.isWallCollision({ x: 5, y: 20 }), true);
  assert.equal(L.isWallCollision({ x: 0, y: 0 }), false);
  assert.equal(L.isWallCollision({ x: 19, y: 19 }), false);
});

test("isSelfCollision: growing 아니면 꼬리 vacate 제외 (기획 §12.3)", () => {
  const snake = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
  ];
  assert.equal(L.isSelfCollision(snake, { x: 4, y: 5 }, false), true);
  assert.equal(L.isSelfCollision(snake, { x: 3, y: 5 }, false), false);
  assert.equal(L.isSelfCollision(snake, { x: 3, y: 5 }, true), true);
});

test("isValidTurn: 길이2+ 정반대 금지, 길이1 반전 허용 (기획 §3.5)", () => {
  assert.equal(L.isValidTurn(null, "right", 3), false);
  assert.equal(L.isValidTurn("left", "right", 3), false);
  assert.equal(L.isValidTurn("up", "right", 3), true);
  assert.equal(L.isValidTurn("left", "right", 1), true);
});

test("spawnFood: 항상 빈 셀·경계 내 (대량 반복, 기획 §3.4)", () => {
  const snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  const board = { cols: 20, rows: 20 };
  const occ = new Set(snake.map((c) => `${c.x},${c.y}`));
  for (let i = 0; i < 500; i++) {
    const f = L.spawnFood(snake, board);
    assert.ok(f.x >= 0 && f.x < 20 && f.y >= 0 && f.y < 20);
    assert.ok(!occ.has(`${f.x},${f.y}`));
  }
});

test("spawnFood: 보드 가득 차면 null (기획 §12.4)", () => {
  const full = [];
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 20; x++) full.push({ x, y });
  assert.equal(L.spawnFood(full, { cols: 20, rows: 20 }), null);
});

test("tick: 이동 — 머리 1칸 전진·꼬리 제거·원본 불변 (기획 AC-RULE-01)", () => {
  const state = {
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
    gameoverReason: null,
  };
  const s = L.tick(state);
  assert.equal(s.status, "playing");
  assert.deepEqual(s.snake[0], { x: 11, y: 10 });
  assert.equal(s.snake.length, 3);
  assert.equal(s.score, 0);
  assert.equal(state.snake.length, 3);
  assert.deepEqual(state.snake[0], { x: 10, y: 10 });
});

test("tick: 먹이 섭취 — 길이+1·점수+10·먹이 재스폰 (기획 AC-RULE-02)", () => {
  const state = {
    status: "playing",
    board: { cols: 20, rows: 20 },
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ],
    direction: "right",
    pendingDirection: null,
    food: { x: 11, y: 10 },
    score: 30,
    gameoverReason: null,
  };
  const s = L.tick(state);
  assert.equal(s.status, "playing");
  assert.equal(s.snake.length, 4);
  assert.equal(s.score, 40);
  const occ = new Set(s.snake.map((c) => `${c.x},${c.y}`));
  assert.ok(!occ.has(`${s.food.x},${s.food.y}`));
});

test("tick: 벽 충돌 → gameover reason wall·점수 유지 (기획 AC-RULE-03)", () => {
  const state = {
    status: "playing",
    board: { cols: 20, rows: 20 },
    snake: [
      { x: 19, y: 10 },
      { x: 18, y: 10 },
      { x: 17, y: 10 },
    ],
    direction: "right",
    pendingDirection: null,
    food: { x: 0, y: 0 },
    score: 50,
    gameoverReason: null,
  };
  const s = L.tick(state);
  assert.equal(s.status, "gameover");
  assert.equal(s.gameoverReason, "wall");
  assert.equal(s.score, 50);
});

test("tick: 자기 충돌 → gameover reason self (기획 AC-RULE-04)", () => {
  const state = {
    status: "playing",
    board: { cols: 20, rows: 20 },
    snake: [
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
    ],
    direction: "right",
    pendingDirection: "right",
    food: { x: 0, y: 0 },
    score: 0,
    gameoverReason: null,
  };
  // right 이동 시 새 머리 (6,5) — 몸통과 충돌
  const s = L.tick(state);
  assert.equal(s.status, "gameover");
  assert.equal(s.gameoverReason, "self");
});

test("tick: 정반대 입력 무시 (기획 AC-RULE-05·§12.1)", () => {
  const state = {
    status: "playing",
    board: { cols: 20, rows: 20 },
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ],
    direction: "right",
    pendingDirection: "left",
    food: { x: 0, y: 0 },
    score: 0,
    gameoverReason: null,
  };
  const s = L.tick(state);
  assert.equal(s.direction, "right");
  assert.deepEqual(s.snake[0], { x: 11, y: 10 });
});

test("tick: playing 아니면 no-op (기획 §5.2 AC-STATE-04)", () => {
  const idle = L.createInitialState();
  const s = L.tick(idle);
  assert.equal(s.status, "idle");
  assert.deepEqual(s.snake, idle.snake);
});
