// BF-514 · Snake 게임 SPA 단위 테스트
// 검증 목표 (Acceptance Criteria 매핑):
//   AC §1 — /snake 진입 시 전체 viewport 캔버스 + 우측 상단 HUD
//   AC §2 — 화살표 키 및 WASD 방향 전환 + 충돌 시 게임오버
//   AC §3 — localStorage 최고점수 영속 (새로고침 후 복원)
//   AC §4 — 보존: 기존 모듈(kanban/notepad/pomodoro/stopwatch/timer) 파일 변경 없음
//
// 실행: node --test tests/snake-BF514.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  createInitialState,
  changeDirection,
  tick,
  restartGame,
  DIR,
  LS_HIGH_SCORE_KEY,
} from "../snake/logic.js";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = path.resolve(__dirname, "..");

// ─────────────────────────────────────────────────────────────
// § 헬퍼
// ─────────────────────────────────────────────────────────────
const COLS = 20;
const ROWS = 15;

function makeState(overrides = {}) {
  return { ...createInitialState(COLS, ROWS, 0), ...overrides };
}

// ─────────────────────────────────────────────────────────────
// AC §1 — HTML 구조: 전체 viewport 캔버스 + HUD
// ─────────────────────────────────────────────────────────────
test("BF-514 AC1: index.html — <canvas id=game-canvas> 존재 (전체 화면)", () => {
  const html = readFileSync(path.join(REPO_ROOT, "snake", "index.html"), "utf-8");
  assert.ok(html.includes('<canvas'), "index.html 에 <canvas> 태그 없음");
  assert.ok(html.includes('id="game-canvas"'), 'canvas id="game-canvas" 없음');
});

test("BF-514 AC1: styles.css — 캔버스 100vw × 100vh 정의", () => {
  const css = readFileSync(path.join(REPO_ROOT, "snake", "styles.css"), "utf-8");
  assert.ok(css.includes("100vw"), "styles.css 에 width:100vw 없음");
  assert.ok(css.includes("100vh"), "styles.css 에 height:100vh 없음");
});

test("BF-514 AC1: index.html — 우측 상단 HUD (점수 + 최고점수) 요소 존재", () => {
  const html = readFileSync(path.join(REPO_ROOT, "snake", "index.html"), "utf-8");
  assert.ok(html.includes('id="hud"'),             "#hud 컨테이너 없음");
  assert.ok(html.includes('id="hud-score-value"'), "#hud-score-value 없음");
  assert.ok(html.includes('id="hud-high-value"'),  "#hud-high-value 없음");
  assert.ok(html.includes("Best:"),                "HUD 최고점수 레이블(Best:) 없음");
});

test("BF-514 AC1: styles.css — HUD 우측 상단 고정 위치 (position:fixed)", () => {
  const css = readFileSync(path.join(REPO_ROOT, "snake", "styles.css"), "utf-8");
  assert.ok(css.includes("#hud"), "#hud 스타일 없음");
  assert.ok(css.includes("position: fixed") || css.includes("position:fixed"), "HUD position:fixed 없음");
  assert.ok(css.includes("right:") || css.includes("right: "), "HUD right 위치 없음");
  assert.ok(css.includes("top:") || css.includes("top: "),     "HUD top 위치 없음");
});

// ─────────────────────────────────────────────────────────────
// AC §2 — 화살표 키 + WASD 방향 전환
// ─────────────────────────────────────────────────────────────
test("BF-514 AC2 (화살표키): 오른쪽 이동 — 1 tick 후 x+1", () => {
  const s0 = makeState({ dir: DIR.RIGHT, nextDir: DIR.RIGHT });
  const headX = s0.snake[0].x;
  const s1 = tick(s0);
  assert.equal(s1.snake[0].x, headX + 1, "오른쪽 이동 후 x+1 이어야 함");
});

test("BF-514 AC2 (화살표키): 위쪽 이동 — 1 tick 후 y-1", () => {
  const s0 = makeState({ dir: DIR.RIGHT, nextDir: DIR.UP });
  const headY = s0.snake[0].y;
  const s1 = tick(s0);
  assert.equal(s1.snake[0].y, headY - 1, "위쪽 이동 후 y-1 이어야 함");
});

test("BF-514 AC2 (WASD 지원): game.js 에 WASD 키 매핑 존재", () => {
  const js = readFileSync(path.join(REPO_ROOT, "snake", "game.js"), "utf-8");
  // 'w', 'a', 's', 'd' (또는 'W', 'A', 'S', 'D') 매핑이 KEY_DIR 객체에 있어야 함
  assert.ok(
    js.includes("w:") || js.includes("'w'") || js.includes('"w"'),
    "game.js 에 WASD 'w' 키 매핑 없음 (BF-514 AC §2)",
  );
  assert.ok(
    js.includes("a:") || js.includes("'a'") || js.includes('"a"'),
    "game.js 에 WASD 'a' 키 매핑 없음",
  );
  assert.ok(
    js.includes("s:") || js.includes("'s'") || js.includes('"s"'),
    "game.js 에 WASD 's' 키 매핑 없음",
  );
  assert.ok(
    js.includes("d:") || js.includes("'d'") || js.includes('"d"'),
    "game.js 에 WASD 'd' 키 매핑 없음",
  );
});

test("BF-514 AC2: changeDirection — WASD 방향 로직 (위 = DIR.UP)", () => {
  // W → UP : 현재 방향이 RIGHT일 때 UP으로 전환 가능
  const s0 = makeState({ dir: DIR.RIGHT, nextDir: DIR.RIGHT });
  const s1 = changeDirection(s0, DIR.UP);   // W 키
  assert.deepEqual(s1.nextDir, DIR.UP,   "W(UP) 전환 실패");
});

test("BF-514 AC2: changeDirection — WASD 역방향 무시 (S가 UP 상태일 때)", () => {
  // 현재 위쪽 이동 중 S(DOWN) 입력은 무시
  const s0 = makeState({ dir: DIR.UP, nextDir: DIR.UP });
  const s1 = changeDirection(s0, DIR.DOWN); // S 키
  assert.deepEqual(s1.nextDir, DIR.UP, "역방향 무시 실패 (S vs UP)");
});

test("BF-514 AC2: 벽 충돌 → gameover 오버레이 지원 — index.html gameover-overlay 존재", () => {
  const html = readFileSync(path.join(REPO_ROOT, "snake", "index.html"), "utf-8");
  assert.ok(html.includes('id="gameover-overlay"'), "gameover-overlay 요소 없음");
  assert.ok(html.includes("Game Over"),              "Game Over 텍스트 없음");
  assert.ok(
    html.includes("Press Space to restart"),
    '"Press Space to restart" 힌트 없음',
  );
});

test("BF-514 AC2: 벽 충돌 시 status=gameover (로직 검증)", () => {
  const rightEdge = { x: COLS - 1, y: 5 };
  const s0 = makeState({
    snake:   [rightEdge, { x: COLS - 2, y: 5 }, { x: COLS - 3, y: 5 }],
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food:    { x: 0, y: 0 },
  });
  const s1 = tick(s0);
  assert.equal(s1.status, "gameover", "우측 벽 충돌 → gameover 아님");
});

test("BF-514 AC2: 자기 몸 충돌 시 status=gameover (로직 검증)", () => {
  // U자형: 오른쪽 이동하면 몸(마지막 세그먼트)에 충돌
  const s0 = makeState({
    snake:   [
      { x: 5, y: 5 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 6, y: 5 },
    ],
    dir:     DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food:    { x: 0, y: 0 },
  });
  const s1 = tick(s0);
  assert.equal(s1.status, "gameover", "자기 몸 충돌 → gameover 아님");
});

// ─────────────────────────────────────────────────────────────
// AC §3 — localStorage 최고점수 영속
// ─────────────────────────────────────────────────────────────
test("BF-514 AC3: LS_HIGH_SCORE_KEY 상수 존재 및 올바른 키 값", () => {
  assert.equal(
    LS_HIGH_SCORE_KEY,
    "bf-snake-high-score",
    "LS_HIGH_SCORE_KEY 값이 'bf-snake-high-score' 이어야 함",
  );
});

test("BF-514 AC3: gameover 시 highScore 가 현재 score 로 갱신", () => {
  const rightEdge = { x: COLS - 1, y: 5 };
  const s0 = makeState({
    snake:     [rightEdge, { x: COLS - 2, y: 5 }, { x: COLS - 3, y: 5 }],
    dir:       DIR.RIGHT,
    nextDir:   DIR.RIGHT,
    food:      { x: 0, y: 0 },
    score:     70,
    highScore: 30,
  });
  const s1 = tick(s0);
  assert.equal(s1.highScore, 70, "highScore 가 현재 점수 70 으로 갱신되어야 함");
});

test("BF-514 AC3: 기존 highScore 가 현재 점수보다 높으면 유지", () => {
  const rightEdge = { x: COLS - 1, y: 5 };
  const s0 = makeState({
    snake:     [rightEdge, { x: COLS - 2, y: 5 }, { x: COLS - 3, y: 5 }],
    dir:       DIR.RIGHT,
    nextDir:   DIR.RIGHT,
    food:      { x: 0, y: 0 },
    score:     20,
    highScore: 150,
  });
  const s1 = tick(s0);
  assert.equal(s1.highScore, 150, "기존 highScore 150 이 유지되어야 함");
});

test("BF-514 AC3: restartGame — 점수 초기화, highScore 유지", () => {
  const s0 = makeState({ score: 60, highScore: 120, status: "gameover" });
  const s1 = restartGame(s0);
  assert.equal(s1.score,     0,         "재시작 후 점수 0");
  assert.equal(s1.highScore, 120,       "재시작 후 highScore 유지");
  assert.equal(s1.status,    "playing", "재시작 후 status=playing");
});

test("BF-514 AC3: game.js — localStorage 저장/로드 함수 존재", () => {
  const js = readFileSync(path.join(REPO_ROOT, "snake", "game.js"), "utf-8");
  assert.ok(
    js.includes("localStorage.getItem") || js.includes("loadHighScore"),
    "game.js 에 localStorage.getItem / loadHighScore 없음",
  );
  assert.ok(
    js.includes("localStorage.setItem") || js.includes("saveHighScore"),
    "game.js 에 localStorage.setItem / saveHighScore 없음",
  );
});

// ─────────────────────────────────────────────────────────────
// AC §4 — 보존: 기존 모듈 파일 무변경
// ─────────────────────────────────────────────────────────────
const PRESERVED_MODULES = ["kanban", "notepad", "pomodoro", "stopwatch", "timer"];

for (const mod of PRESERVED_MODULES) {
  test(`BF-514 AC4: ${mod}/ 모듈 index.html 존재 (보존 확인)`, () => {
    const filePath = path.join(REPO_ROOT, mod, "index.html");
    assert.ok(existsSync(filePath), `${mod}/index.html 이 존재하지 않음 — 파일 삭제 여부 확인`);
  });
}

// ─────────────────────────────────────────────────────────────
// 추가: 게임 로직 커버리지 보완
// ─────────────────────────────────────────────────────────────
test("BF-514: 먹이 수집 → 점수 +10, 길이 +1", () => {
  const s0 = createInitialState(COLS, ROWS);
  const head = s0.snake[0];
  const nextHead = { x: head.x + 1, y: head.y };
  const sWithFood = { ...s0, food: nextHead, dir: DIR.RIGHT, nextDir: DIR.RIGHT };
  const s1 = tick(sWithFood);

  assert.equal(s1.score,        10,              "먹이 수집 시 점수 +10 이어야 함");
  assert.equal(s1.snake.length, s0.snake.length + 1, "먹이 수집 시 길이 +1 이어야 함");
  assert.equal(s1.status,       "playing",       "먹이 수집 후 playing 유지");
});

test("BF-514: 반대 방향 (LEFT vs RIGHT) 전환 무시", () => {
  const s0 = makeState({ dir: DIR.RIGHT, nextDir: DIR.RIGHT });
  const s1 = changeDirection(s0, DIR.LEFT);
  assert.deepEqual(s1.nextDir, DIR.RIGHT, "역방향 LEFT 입력 무시 실패");
});

test("BF-514: createInitialState — 초기 highScore 전달 보존", () => {
  const s = createInitialState(COLS, ROWS, 200);
  assert.equal(s.highScore, 200, "전달된 highScore 200 이 보존되어야 함");
  assert.equal(s.score,     0,   "초기 score 는 0 이어야 함");
  assert.equal(s.status,    "playing", "초기 status 는 playing");
});

test("BF-514: game.js — ES module type 로 로드 (type=module)", () => {
  const html = readFileSync(path.join(REPO_ROOT, "snake", "index.html"), "utf-8");
  assert.ok(
    html.includes('type="module"'),
    "game.js 가 type=module 로 로드되지 않음 — ES import 필요",
  );
});
