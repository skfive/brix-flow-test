// BF-504 · Snake 게임 단위 테스트
// 검증 목표 (Acceptance Criteria 매핑):
//   AC §2 — 방향 이동 + 반대 방향 무시 (changeDirection)
//   AC §3 — 먹이 수집 → 점수 +10, 길이 +1, 새 먹이 배치 (tick + food collision)
//   AC §4 — 벽 충돌 → gameover (isWallCollision + tick)
//   AC §4 — 자기 몸 충돌 → gameover (isSelfCollision + tick)
//   AC §5 — High Score: gameover 시 state.highScore 갱신
//   AC §2 — 반대 방향 무시 (changeDirection)
//
// 실행: node --test tests/snake-BF504.test.js

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createInitialState,
  changeDirection,
  tick,
  restartGame,
  isWallCollision,
  isSelfCollision,
  spawnFoodCell,
  DIR,
} from "../snake/logic.js";

// ─────────────────────────────────────────────────────────────
// § 헬퍼: 작은 10×10 테스트용 그리드
// ─────────────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 10;

function makeState(overrides = {}) {
  const base = createInitialState(COLS, ROWS, 0);
  return { ...base, ...overrides };
}

// ─────────────────────────────────────────────────────────────
// §1. 초기 상태 생성
// ─────────────────────────────────────────────────────────────
test("BF-504 §1: createInitialState — 격자 크기·방향·점수·상태 기본값", () => {
  const s = createInitialState(COLS, ROWS);
  assert.equal(s.cols,    COLS,       "cols 설정 오류");
  assert.equal(s.rows,    ROWS,       "rows 설정 오류");
  assert.equal(s.score,   0,          "초기 점수 0 이어야 함");
  assert.equal(s.status,  "playing",  "초기 status 는 playing");
  assert.deepEqual(s.dir, DIR.RIGHT,  "초기 방향 오른쪽");
  assert.ok(s.snake.length >= 3,      "초기 지렁이 길이 3 이상");
  assert.ok(s.food !== null,          "초기 먹이 존재");
});

// ─────────────────────────────────────────────────────────────
// §2. 이동 — tick() 한 스텝 후 머리 위치
// ─────────────────────────────────────────────────────────────
test("BF-504 §2 (AC §2): tick — 오른쪽 방향으로 1 스텝 이동", () => {
  const s0 = makeState({ dir: DIR.RIGHT, nextDir: DIR.RIGHT });
  const head0 = s0.snake[0];
  const s1 = tick(s0);

  assert.equal(s1.snake[0].x, head0.x + 1, "x 좌표 +1 이어야 함 (오른쪽 이동)");
  assert.equal(s1.snake[0].y, head0.y,     "y 좌표 변화 없어야 함");
});

test("BF-504 §2 (AC §2): tick — 위쪽 방향으로 1 스텝 이동", () => {
  // 초기 방향이 RIGHT → UP 으로 변경 (역방향 아니므로 허용)
  const s0 = makeState({ dir: DIR.RIGHT, nextDir: DIR.UP });
  const head0 = s0.snake[0];
  const s1 = tick(s0);

  assert.equal(s1.snake[0].x, head0.x,     "x 좌표 변화 없어야 함");
  assert.equal(s1.snake[0].y, head0.y - 1, "y 좌표 -1 이어야 함 (위쪽 이동)");
});

// ─────────────────────────────────────────────────────────────
// §3. 방향 전환 — 반대 방향(180°) 무시 (AC §2 자살 방지)
// ─────────────────────────────────────────────────────────────
test("BF-504 §3 (AC §2): changeDirection — 현재 오른쪽일 때 왼쪽 입력 무시", () => {
  const s0 = makeState({ dir: DIR.RIGHT, nextDir: DIR.RIGHT });
  const s1 = changeDirection(s0, DIR.LEFT);
  assert.deepEqual(s1.nextDir, DIR.RIGHT, "반대 방향 입력 시 nextDir 변경 금지");
});

test("BF-504 §3 (AC §2): changeDirection — 현재 위쪽일 때 아래쪽 입력 무시", () => {
  const s0 = makeState({ dir: DIR.UP, nextDir: DIR.UP });
  const s1 = changeDirection(s0, DIR.DOWN);
  assert.deepEqual(s1.nextDir, DIR.UP, "반대 방향 입력 시 nextDir 변경 금지");
});

test("BF-504 §3 (AC §2): changeDirection — 수직 전환은 정상 적용 (오른쪽 → 위)", () => {
  const s0 = makeState({ dir: DIR.RIGHT, nextDir: DIR.RIGHT });
  const s1 = changeDirection(s0, DIR.UP);
  assert.deepEqual(s1.nextDir, DIR.UP, "직각 방향 전환은 정상 적용되어야 함");
});

// ─────────────────────────────────────────────────────────────
// §4. 먹이 수집 → 점수 +10, 길이 +1 (AC §3)
// ─────────────────────────────────────────────────────────────
test("BF-504 §4 (AC §3): 먹이 수집 → 점수 +10", () => {
  const s0 = createInitialState(COLS, ROWS);
  const head = s0.snake[0];
  // 먹이를 다음 이동 위치(오른쪽 한 칸)에 강제 배치
  const nextHead = { x: head.x + 1, y: head.y };
  const s0WithFood = { ...s0, food: nextHead, dir: DIR.RIGHT, nextDir: DIR.RIGHT };

  const s1 = tick(s0WithFood);

  assert.equal(s1.score,  10, "먹이 수집 시 점수 +10 이어야 함");
  assert.equal(s1.status, "playing", "먹이 수집 후 상태는 playing");
});

test("BF-504 §4 (AC §3): 먹이 수집 → 길이 +1 (꼬리 제거 안 함)", () => {
  const s0 = createInitialState(COLS, ROWS);
  const head = s0.snake[0];
  const nextHead = { x: head.x + 1, y: head.y };
  const prevLen = s0.snake.length;
  const s0WithFood = { ...s0, food: nextHead, dir: DIR.RIGHT, nextDir: DIR.RIGHT };

  const s1 = tick(s0WithFood);

  assert.equal(s1.snake.length, prevLen + 1, "먹이 수집 시 snake 길이 +1 이어야 함");
});

test("BF-504 §4 (AC §3): 먹이 미수집 → 길이 유지 (꼬리 제거)", () => {
  const s0 = createInitialState(COLS, ROWS);
  const head = s0.snake[0];
  // 먹이를 다음 위치가 아닌 곳에 배치
  const elsewhere = { x: 0, y: 0 };
  const s0WithFood = { ...s0, food: elsewhere, dir: DIR.RIGHT, nextDir: DIR.RIGHT };
  // head.x + 1 !== 0 이면 먹이 미수집
  if (head.x + 1 === 0) return; // edge case skip

  const s1 = tick(s0WithFood);
  assert.equal(s1.snake.length, s0.snake.length, "먹이 미수집 시 snake 길이 변화 없음");
});

// ─────────────────────────────────────────────────────────────
// §5. 벽 충돌 → gameover (AC §4)
// ─────────────────────────────────────────────────────────────
test("BF-504 §5 (AC §4): isWallCollision — 경계 초과 시 true", () => {
  assert.ok(isWallCollision({ x: -1, y: 0 }, COLS, ROWS),  "x < 0 는 벽 충돌");
  assert.ok(isWallCollision({ x: COLS, y: 0 }, COLS, ROWS), "x >= cols 는 벽 충돌");
  assert.ok(isWallCollision({ x: 0, y: -1 }, COLS, ROWS),  "y < 0 는 벽 충돌");
  assert.ok(isWallCollision({ x: 0, y: ROWS }, COLS, ROWS), "y >= rows 는 벽 충돌");
});

test("BF-504 §5 (AC §4): isWallCollision — 경계 안쪽은 false", () => {
  assert.ok(!isWallCollision({ x: 0, y: 0 }, COLS, ROWS),            "좌상단 코너는 충돌 아님");
  assert.ok(!isWallCollision({ x: COLS-1, y: ROWS-1 }, COLS, ROWS),  "우하단 코너는 충돌 아님");
});

test("BF-504 §5 (AC §4): tick — 머리가 오른쪽 벽에 부딪히면 gameover", () => {
  // 오른쪽 끝 셀에 머리를 위치시키고 오른쪽으로 이동
  const headAtEdge = { x: COLS - 1, y: 5 };
  const snake = [
    headAtEdge,
    { x: COLS - 2, y: 5 },
    { x: COLS - 3, y: 5 },
  ];
  const s0 = makeState({
    snake,
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food:    { x: 0, y: 0 },
  });

  const s1 = tick(s0);
  assert.equal(s1.status, "gameover", "벽 충돌 시 status = gameover");
});

// ─────────────────────────────────────────────────────────────
// §6. 자기 몸 충돌 → gameover (AC §4)
// ─────────────────────────────────────────────────────────────
test("BF-504 §6 (AC §4): isSelfCollision — 머리가 몸에 겹치면 true", () => {
  const body = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
  ];
  assert.ok( isSelfCollision({ x: 4, y: 5 }, body), "몸 세그먼트와 겹치면 true");
  assert.ok(!isSelfCollision({ x: 9, y: 9 }, body), "빈 셀은 false");
});

test("BF-504 §6 (AC §4): tick — 뱀이 자기 몸에 돌아오면 gameover", () => {
  // U자형 뱀: 머리(5,5), (5,4), (6,4), (6,5) — 오른쪽으로 이동 시 (6,5) 충돌
  const snake = [
    { x: 5, y: 5 },
    { x: 5, y: 4 },
    { x: 6, y: 4 },
    { x: 6, y: 5 },
  ];
  const s0 = makeState({
    snake,
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food:    { x: 0, y: 0 },
  });

  const s1 = tick(s0);
  assert.equal(s1.status, "gameover", "자기 몸 충돌 시 status = gameover");
});

// ─────────────────────────────────────────────────────────────
// §7. High Score 갱신 — gameover 시 highScore 업데이트 (AC §5)
// ─────────────────────────────────────────────────────────────
test("BF-504 §7 (AC §5): gameover 시 highScore 가 현재 점수로 갱신", () => {
  // 오른쪽 끝 셀에서 충돌 유발, 점수 50점 설정
  const headAtEdge = { x: COLS - 1, y: 5 };
  const snake = [
    headAtEdge,
    { x: COLS - 2, y: 5 },
    { x: COLS - 3, y: 5 },
  ];
  const s0 = makeState({
    snake,
    dir:       DIR.RIGHT,
    nextDir:   DIR.RIGHT,
    food:      { x: 0, y: 0 },
    score:     50,
    highScore: 30,
  });

  const s1 = tick(s0);
  assert.equal(s1.status,    "gameover", "gameover 상태여야 함");
  assert.equal(s1.highScore, 50,          "highScore 가 현재 점수 50 으로 갱신");
});

test("BF-504 §7 (AC §5): 기존 highScore 가 더 높으면 유지", () => {
  const headAtEdge = { x: COLS - 1, y: 5 };
  const snake = [
    headAtEdge,
    { x: COLS - 2, y: 5 },
    { x: COLS - 3, y: 5 },
  ];
  const s0 = makeState({
    snake,
    dir:       DIR.RIGHT,
    nextDir:   DIR.RIGHT,
    food:      { x: 0, y: 0 },
    score:     20,
    highScore: 100,
  });

  const s1 = tick(s0);
  assert.equal(s1.highScore, 100, "기존 highScore 100 이 유지되어야 함");
});

// ─────────────────────────────────────────────────────────────
// §8. restartGame — 점수 초기화 + highScore 유지
// ─────────────────────────────────────────────────────────────
test("BF-504 §8: restartGame — 점수 0 으로 초기화, highScore 유지", () => {
  const s0 = makeState({ score: 40, highScore: 80, status: "gameover" });
  const s1 = restartGame(s0);

  assert.equal(s1.score,     0,         "재시작 후 점수 0 이어야 함");
  assert.equal(s1.highScore, 80,        "재시작 후 highScore 유지");
  assert.equal(s1.status,    "playing", "재시작 후 status = playing");
  assert.ok(s1.snake.length >= 3,       "재시작 후 뱀 길이 3 이상");
});

// ─────────────────────────────────────────────────────────────
// §9. spawnFoodCell — 빈 셀에만 배치
// ─────────────────────────────────────────────────────────────
test("BF-504 §9: spawnFoodCell — 뱀이 없는 빈 셀에 먹이 배치", () => {
  const snake = [{ x: 5, y: 5 }];
  const food  = spawnFoodCell(COLS, ROWS, snake);
  assert.ok(food !== null, "빈 셀이 있으면 먹이 배치 가능");
  assert.ok(
    !(food.x === 5 && food.y === 5),
    "뱀이 있는 셀에 먹이 배치 금지",
  );
});

test("BF-504 §9: spawnFoodCell — 격자 범위 내 배치 (0 ≤ x < cols, 0 ≤ y < rows)", () => {
  const snake = createInitialState(COLS, ROWS).snake;
  const food  = spawnFoodCell(COLS, ROWS, snake);
  assert.ok(food !== null, "먹이가 null 이면 안 됨");
  assert.ok(food.x >= 0 && food.x < COLS, `x=${food.x} 는 [0, ${COLS}) 범위여야 함`);
  assert.ok(food.y >= 0 && food.y < ROWS, `y=${food.y} 는 [0, ${ROWS}) 범위여야 함`);
});

// ─────────────────────────────────────────────────────────────
// §10. 점수 누적 — 연속 먹이 수집 시 10씩 합산
// ─────────────────────────────────────────────────────────────
test("BF-504 §10 (AC §3): 연속 2번 먹이 수집 → 점수 20", () => {
  // 먹이를 2번 연속 정확한 위치에 설정하여 테스트
  const base = createInitialState(COLS, ROWS);
  const head0 = base.snake[0];

  // 1차 수집
  const food1 = { x: head0.x + 1, y: head0.y };
  const s1 = tick({ ...base, food: food1, dir: DIR.RIGHT, nextDir: DIR.RIGHT });
  assert.equal(s1.score, 10, "1차 수집 후 점수 10");

  // 2차 수집: 새 머리는 head0.x+1, y=head0.y → 다음은 head0.x+2
  const head1 = s1.snake[0];
  const food2 = { x: head1.x + 1, y: head1.y };
  const s2 = tick({ ...s1, food: food2, dir: DIR.RIGHT, nextDir: DIR.RIGHT });
  assert.equal(s2.score, 20, "2차 수집 후 점수 20 (연속 +10)");
});

// ─────────────────────────────────────────────────────────────
// §11. index.html 정적 검사 — 캔버스 + HUD + Game Over 요소 존재
// ─────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT   = path.resolve(__dirname, "..");
const INDEX_HTML  = path.join(REPO_ROOT, "snake", "index.html");
const GAME_JS     = path.join(REPO_ROOT, "snake", "game.js");
const LOGIC_JS    = path.join(REPO_ROOT, "snake", "logic.js");

test("BF-504 §11: index.html — <canvas id=\"game-canvas\"> 존재 (AC §1 전체 화면 캔버스)", () => {
  const html = readFileSync(INDEX_HTML, "utf-8");
  assert.ok(
    html.includes('id="game-canvas"'),
    'index.html 에 id="game-canvas" 없음',
  );
  assert.ok(
    html.includes("<canvas"),
    "index.html 에 <canvas> 태그 없음",
  );
});

test("BF-504 §11: index.html — HUD score/high 요소 존재 (AC §1 우측 상단 점수 표시)", () => {
  const html = readFileSync(INDEX_HTML, "utf-8");
  assert.ok(html.includes('id="hud-score-value"'), 'hud-score-value 요소 없음');
  assert.ok(html.includes('id="hud-high-value"'),  'hud-high-value 요소 없음');
});

test("BF-504 §11: index.html — Game Over 오버레이 존재 (AC §4)", () => {
  const html = readFileSync(INDEX_HTML, "utf-8");
  assert.ok(html.includes('id="gameover-overlay"'), 'gameover-overlay 요소 없음');
  assert.ok(html.includes("Game Over"),              '"Game Over" 텍스트 없음');
  assert.ok(html.includes("Press Space to restart"), '"Press Space to restart" 텍스트 없음');
});

// BF-522 갱신: type="module" 이 file:// CORS 차단 원인 → 제거됨.
// game.js 는 일반 <script src="./game.js"> 로 로드.
test("BF-504 §11 (BF-522 갱신): index.html — game.js 를 일반 script 태그로 로드 (type=module 없음)", () => {
  const html = readFileSync(INDEX_HTML, "utf-8");
  assert.ok(
    html.includes('src="./game.js"') || html.includes("src='./game.js'"),
    'game.js 로드 없음',
  );
  // BF-522: type=module 제거 — file:// CORS 오류 수정
  assert.ok(
    !html.includes('<script type="module" src="./game.js"'),
    'game.js 스크립트에 type="module" 존재 — BF-522 에서 제거되어야 함',
  );
});

test("BF-504 §11: game.js — localStorage High Score 키 사용 (AC §5)", () => {
  const js = readFileSync(GAME_JS, "utf-8");
  assert.ok(
    js.includes("bf-snake-high-score") || js.includes("LS_HIGH_SCORE_KEY"),
    "game.js 에 high score localStorage 키 참조 없음",
  );
});

test("BF-504 §11: logic.js — LS_HIGH_SCORE_KEY export 존재 (AC §5)", () => {
  const js = readFileSync(LOGIC_JS, "utf-8");
  assert.ok(
    js.includes("LS_HIGH_SCORE_KEY"),
    "logic.js 에 LS_HIGH_SCORE_KEY 없음",
  );
  assert.ok(
    js.includes("bf-snake-high-score"),
    "logic.js 에 'bf-snake-high-score' 키 값 없음",
  );
});
