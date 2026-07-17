// BF-925 · Snake 아케이드 단위 테스트 (focused scope · module: phase18-snake)
// - 대상: phase18-games/snake/{index.html, styles.css, logic.js, main.js}
// - 실행: node --test tests/phase18-snake-BF925.test.js
// - 기획 SSOT: docs/planning/phase18-snake-BF-923.md (§3~§6 규칙·상태·§13 테스트 방침)
// - 디자인 SSOT: docs/design/snake-BF-922.md (§5 컴포넌트·§6 dev 가이드)
//
// 검증 축 (planner §13):
//   1) vanilla-static file:// 안전 가드 — import/export·<script type="module">·
//      fetch/외부 URL·localStorage 가 없어야 함(§9 외부 의존성 0건).
//   2) 마크업 계약 — main.js 가 의존하는 id/클래스 + <title>/<h1> 고정.
//   3) 순수 로직 — logic.js 를 node:vm 샌드박스에서 로드해 이동·성장·충돌·스폰·방향·점수 검증.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "phase18-games", "snake");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const LOGIC_JS = readFileSync(join(MODULE_DIR, "logic.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// ─────────── logic.js 를 같은 realm 에서 로드해 SnakeLogic 추출 ───────────
// UMD(module.exports) 패턴을 현재 realm 의 Function 으로 평가해 로드한다.
// 같은 realm 이므로 반환 객체 prototype 이 테스트와 일치 → deepStrictEqual 정상 동작.
// globalThis 파라미터를 더미로 주입해 실제 전역을 오염시키지 않는다.
function loadLogic() {
  const mod = { exports: {} };
  const fn = new Function("module", "exports", "globalThis", LOGIC_JS);
  fn(mod, mod.exports, {});
  return mod.exports;
}

const L = loadLogic();
assert.ok(L && L.createInitialState, "logic.js 가 SnakeLogic API 를 노출하지 않음");

// 결정론 rand 헬퍼: 지정 인덱스를 뽑도록 [0,1) 반환값 시퀀스를 만든다.
function seqRand(values) {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

// ══════════════════════════════════════════════════════════
// 1) vanilla-static file:// 안전 가드 (planner §9 — 외부 의존성 0건)
// ══════════════════════════════════════════════════════════
test("가드: <script type=module> 미사용 (file:// CORS 안전)", () => {
  for (const [name, src] of [["index.html", HTML], ["logic.js", LOGIC_JS], ["main.js", MAIN_JS]]) {
    assert.ok(!/type\s*=\s*["']module["']/.test(src), `${name} 에 type="module" 존재`);
  }
});

test("가드: import/export 구문 미사용", () => {
  for (const [name, src] of [["logic.js", LOGIC_JS], ["main.js", MAIN_JS]]) {
    assert.ok(!/\bimport\s|\bexport\s|\bexport\{/.test(src), `${name} 에 import/export 존재`);
  }
});

test("가드: fetch/XHR/WebSocket/외부 URL/localStorage 0건 (§9)", () => {
  const re = /fetch\(|XMLHttpRequest|WebSocket|EventSource|https?:\/\/|localStorage|sessionStorage/;
  for (const [name, src] of [["index.html", HTML], ["logic.js", LOGIC_JS], ["main.js", MAIN_JS], ["styles.css", CSS]]) {
    assert.ok(!re.test(src), `${name} 에 외부 의존성/영속저장 흔적 존재`);
  }
});

test("가드: 외부 CDN link/script src 없음 (상대경로만)", () => {
  const srcs = [...HTML.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
  for (const s of srcs) {
    assert.ok(!/^https?:\/\//.test(s), `외부 URL 리소스 발견: ${s}`);
  }
});

// ══════════════════════════════════════════════════════════
// 2) 마크업 계약 (main.js 가 의존하는 id/클래스 + 타이틀)
// ══════════════════════════════════════════════════════════
test("마크업: <title> 과 <h1> 이 'Snake 아케이드' 를 담는다", () => {
  assert.ok(/<title>[^<]*Snake 아케이드/.test(HTML), "<title> 에 Snake 아케이드 없음");
  assert.ok(/<h1[^>]*>[\s\S]*?Snake 아케이드/.test(HTML), "<h1> 에 Snake 아케이드 없음");
});

test("마크업: canvas#board width/height 400 (20×20×CELL_SIZE)", () => {
  assert.ok(/id=["']board["']/.test(HTML), "canvas#board 없음");
  assert.ok(/width=["']400["']/.test(HTML), "canvas width=400 아님");
  assert.ok(/height=["']400["']/.test(HTML), "canvas height=400 아님");
});

test("마크업: main.js 가 참조하는 필수 id 존재", () => {
  const ids = [
    "board",
    "overlay",
    "overlay-title",
    "btn-start",
    "btn-resume",
    "btn-again",
    "btn-menu",
    "btn-pause",
    "btn-restart",
  ];
  for (const id of ids) {
    assert.ok(new RegExp(`id=["']${id}["']`).test(HTML), `id="${id}" 없음`);
  }
});

test("마크업: D-pad 4방향 버튼 (data-dir up/down/left/right)", () => {
  for (const dir of ["up", "down", "left", "right"]) {
    assert.ok(new RegExp(`data-dir=["']${dir}["']`).test(HTML), `data-dir="${dir}" D-pad 버튼 없음`);
  }
});

test("마크업: 점수/최고 점수 data-role + aria-live 스코어보드", () => {
  assert.ok(/data-role=["']score["']/.test(HTML), "data-role=score 없음");
  assert.ok(/data-role=["']high-score["']/.test(HTML), "data-role=high-score 없음");
  assert.ok(/aria-live=["']polite["']/.test(HTML), "aria-live=polite 없음");
});

test("마크업: <noscript> 폴백 존재", () => {
  assert.ok(/<noscript>/.test(HTML), "<noscript> 폴백 없음");
});

test("스타일: Snake 전용 토큰(:root) 정의 (design §2.2)", () => {
  for (const token of ["--board-bg", "--snake-head", "--snake-body", "--food-fill"]) {
    assert.ok(new RegExp(token + "\\s*:").test(CSS), `${token} 토큰 미정의`);
  }
});

// ══════════════════════════════════════════════════════════
// 3) 순수 로직 — 상수 (planner §3.1)
// ══════════════════════════════════════════════════════════
test("상수: 보드/셀/틱/점수 (planner §3.1)", () => {
  assert.equal(L.BOARD_COLS, 20);
  assert.equal(L.BOARD_ROWS, 20);
  assert.equal(L.CELL_SIZE, 20);
  assert.equal(L.TICK_INTERVAL_MS, 150);
  assert.equal(L.INITIAL_SNAKE_LENGTH, 3);
  assert.equal(L.SCORE_PER_FOOD, 10);
  assert.equal(L.INITIAL_DIRECTION, "right");
});

test("방향 벡터: up/down/left/right (planner §3.1)", () => {
  assert.deepEqual(L.DIRECTION_VECTORS.up, { dx: 0, dy: -1 });
  assert.deepEqual(L.DIRECTION_VECTORS.down, { dx: 0, dy: 1 });
  assert.deepEqual(L.DIRECTION_VECTORS.left, { dx: -1, dy: 0 });
  assert.deepEqual(L.DIRECTION_VECTORS.right, { dx: 1, dy: 0 });
});

test("초기 뱀: 머리 (10,10) 일직선 3칸, 시작 방향 right (planner §3.2)", () => {
  const snake = L.createInitialSnake();
  assert.deepEqual(snake, [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
});

test("초기 상태: status=start, score=0, highScore=0, food 는 뱀과 안 겹침", () => {
  const s = L.createInitialState(seqRand([0]));
  assert.equal(s.status, "start");
  assert.equal(s.score, 0);
  assert.equal(s.highScore, 0);
  assert.equal(s.pendingDirection, null);
  const occupied = new Set(s.snake.map((p) => `${p.x},${p.y}`));
  assert.ok(!occupied.has(`${s.food.x},${s.food.y}`), "먹이가 뱀 셀과 겹침");
});

// ── 충돌 판정 (planner §3.4) ─────────────────────────────
test("벽 충돌: 경계 밖 true, 안쪽 false (랩어라운드 없음, §3.4)", () => {
  assert.equal(L.isWallCollision({ x: -1, y: 5 }), true);
  assert.equal(L.isWallCollision({ x: 20, y: 5 }), true);
  assert.equal(L.isWallCollision({ x: 5, y: -1 }), true);
  assert.equal(L.isWallCollision({ x: 5, y: 20 }), true);
  assert.equal(L.isWallCollision({ x: 0, y: 0 }), false);
  assert.equal(L.isWallCollision({ x: 19, y: 19 }), false);
});

test("자기 충돌: growing=false 이면 꼬리 셀은 제외 (§11.3)", () => {
  const snake = [
    { x: 5, y: 5 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
    { x: 6, y: 5 }, // 꼬리
  ];
  // 새 머리가 현재 꼬리였던 (6,5) 로 이동 — 이동이므로 충돌 아님
  assert.equal(L.isSelfCollision(snake, { x: 6, y: 5 }, false), false);
  // 같은 틱에 성장하면 꼬리가 안 비워지므로 충돌
  assert.equal(L.isSelfCollision(snake, { x: 6, y: 5 }, true), true);
});

test("자기 충돌: 몸통 중간 셀로 이동하면 항상 충돌", () => {
  const snake = [
    { x: 5, y: 5 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
    { x: 6, y: 5 },
  ];
  assert.equal(L.isSelfCollision(snake, { x: 5, y: 6 }, false), true);
});

// ── 방향 유효성 (planner §3.6) ───────────────────────────
test("isOpposite: 정반대 쌍만 true", () => {
  assert.equal(L.isOpposite("up", "down"), true);
  assert.equal(L.isOpposite("left", "right"), true);
  assert.equal(L.isOpposite("up", "left"), false);
  assert.equal(L.isOpposite("up", "up"), false);
});

test("isValidTurn: 길이2+ 정반대 금지, null/invalid false", () => {
  assert.equal(L.isValidTurn("up", "right", 3), true);
  assert.equal(L.isValidTurn("left", "right", 3), false); // 반전 금지
  assert.equal(L.isValidTurn(null, "right", 3), false);
  assert.equal(L.isValidTurn("nope", "right", 3), false);
  assert.equal(L.isValidTurn("left", "right", 1), true); // 몸 없으면 반전 허용
});

// ── 먹이 스폰 (planner §3.5) ─────────────────────────────
test("먹이 스폰: 항상 빈 셀에서만 (대량 반복, §3.5)", () => {
  const board = { cols: 20, rows: 20 };
  for (let t = 0; t < 500; t++) {
    const snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    const food = L.spawnFood(snake, board, Math.random);
    assert.ok(food, "먹이가 null (빈 셀 있는데도)");
    const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
    assert.ok(!occupied.has(`${food.x},${food.y}`), "먹이가 뱀 셀과 겹침");
    assert.ok(food.x >= 0 && food.x < 20 && food.y >= 0 && food.y < 20, "먹이 보드 밖");
  }
});

test("먹이 스폰: 보드 가득 차면 null (§11.4)", () => {
  const board = { cols: 2, rows: 2 };
  const full = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ];
  assert.equal(L.spawnFood(full, board, Math.random), null);
});

// ── tick: 이동·성장·점수·충돌 (planner §3.3) ─────────────
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

test("tick 이동: 머리 1칸 전진, 꼬리 제거 (성장 아님, §3.3)", () => {
  const next = L.tick(playState(), Math.random);
  assert.equal(next.status, "playing");
  assert.deepEqual(next.snake[0], { x: 11, y: 10 });
  assert.equal(next.snake.length, 3, "성장 아닌데 길이 변함");
  assert.deepEqual(next.snake[next.snake.length - 1], { x: 9, y: 10 }, "꼬리 미제거");
  assert.equal(next.score, 0);
});

test("tick 성장: 먹이 섭취 시 길이+1, 점수+10, 먹이 재스폰 (§3.3, §4)", () => {
  const state = playState({ food: { x: 11, y: 10 } });
  const next = L.tick(state, seqRand([0]));
  assert.equal(next.snake.length, 4, "성장 안 함");
  assert.equal(next.score, 10);
  assert.equal(next.highScore, 10, "highScore 미갱신");
  assert.ok(next.food, "먹이 재스폰 안 됨");
  const occupied = new Set(next.snake.map((p) => `${p.x},${p.y}`));
  assert.ok(!occupied.has(`${next.food.x},${next.food.y}`), "재스폰 먹이가 뱀과 겹침");
});

test("tick 벽 충돌: gameover + reason=wall (§3.4)", () => {
  const state = playState({
    snake: [
      { x: 19, y: 10 },
      { x: 18, y: 10 },
      { x: 17, y: 10 },
    ],
    direction: "right",
  });
  const next = L.tick(state, Math.random);
  assert.equal(next.status, "gameover");
  assert.equal(next.gameoverReason, "wall");
});

test("tick 자기 충돌: gameover + reason=self (§3.4)", () => {
  // ㅁ자로 감긴 뱀이 자기 몸으로 진입
  const state = playState({
    snake: [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
      { x: 6, y: 5 },
    ],
    direction: "up",
    pendingDirection: "down", // 반전 → 무시됨(§11.1). 실제 self 는 아래 케이스로
  });
  // 위 케이스는 반전 무시라 up 유지 → (5,4) 로 이동, 충돌 아님. self 를 명확히 재구성:
  const state2 = playState({
    snake: [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
      { x: 4, y: 6 },
      { x: 4, y: 5 },
    ],
    direction: "up",
  });
  // 머리 (5,5) 가 up → (5,4)? 그건 빈칸. self 를 확실히: 머리 right 로 (6,5) 진입 = 몸
  const state3 = playState({
    snake: [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ],
    direction: "up",
    pendingDirection: "right", // (6,5) 는 몸통(꼬리 아님) → 충돌
  });
  const next = L.tick(state3, Math.random);
  assert.equal(next.status, "gameover");
  assert.equal(next.gameoverReason, "self");
  void state;
  void state2;
});

test("tick 반전 방지: pendingDirection 이 정반대면 무시 (§11.1, AC-RULE-05)", () => {
  const state = playState({ direction: "right", pendingDirection: "left" });
  const next = L.tick(state, Math.random);
  assert.equal(next.direction, "right", "반전이 적용됨");
  assert.deepEqual(next.snake[0], { x: 11, y: 10 }, "왼쪽으로 이동함(버그)");
});

test("tick 방향 전환: 유효한 수직 전환은 적용", () => {
  const state = playState({ direction: "right", pendingDirection: "up" });
  const next = L.tick(state, Math.random);
  assert.equal(next.direction, "up");
  assert.deepEqual(next.snake[0], { x: 10, y: 9 });
  assert.equal(next.pendingDirection, null, "pendingDirection 미소비");
});

test("tick 미진행 상태: playing 아니면 그대로 반환", () => {
  const state = playState({ status: "paused" });
  assert.equal(L.tick(state, Math.random), state);
});

test("tick highScore: score 초과 시 갱신, 미만이면 유지", () => {
  const state = playState({ food: { x: 11, y: 10 }, score: 0, highScore: 100 });
  const next = L.tick(state, seqRand([0]));
  assert.equal(next.score, 10);
  assert.equal(next.highScore, 100, "기존 최고 점수 하락");
});

test("createPlayState: highScore 승계, score 0, status playing", () => {
  const s = L.createPlayState(50, seqRand([0]));
  assert.equal(s.status, "playing");
  assert.equal(s.score, 0);
  assert.equal(s.highScore, 50);
  assert.equal(s.snake.length, 3);
  assert.ok(s.food, "먹이 없음");
});
