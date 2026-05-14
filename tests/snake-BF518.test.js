// BF-518 · snake SPA file:// 로컬 실행 CORS / 모듈 로딩 문제 수정 — 단위 테스트
//
// 수용 기준 매핑:
//   AC §1 — file:// 로드 시 CORS 에러 0건 (static import 제거, dynamic import + 폴백 확인)
//   AC §2 — file:// 환경에서 게임 동작 (인라인 글로벌 로직 정합성 검증)
//   AC §3 — http:// 회귀 없음 (type=module + src=game.js 유지 확인)
//
// 실행: node --test tests/snake-BF518.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = path.resolve(__dirname, "..");
const INDEX_HTML = path.join(REPO_ROOT, "snake", "index.html");
const GAME_JS    = path.join(REPO_ROOT, "snake", "game.js");

// ─────────────────────────────────────────────────────────────
// AC §1 — static import 제거 확인 (file:// CORS 차단 원인 제거)
// ─────────────────────────────────────────────────────────────

test("BF-518 AC1: game.js — static `import { } from './logic.js'` 제거됨", () => {
  const js = readFileSync(GAME_JS, "utf-8");
  // 정적 top-level import 가 있으면 file:// 환경에서 모듈 자체가 실행 불가
  const hasStaticImport = /^import\s+\{[^}]*\}\s+from\s+['"]\.\/logic\.js['"]/m.test(js);
  assert.ok(
    !hasStaticImport,
    "game.js 에 logic.js 의 static import 가 남아있음 — file:// CORS 차단 원인",
  );
});

// BF-522 갱신: dynamic import() 방식 → globalThis 직접 참조 방식으로 교체됨.
// type="module" 자체가 file:// CORS 차단 원인이었으므로 dynamic import 도 함께 제거.
// 이 가드는 BF-522 의 새 구현을 반영: import() 없음 + globalThis 직접 참조 확인.
test("BF-518 AC1 (BF-522 갱신): game.js — dynamic import 제거 + globalThis 직접 참조 (type=module 없음)", () => {
  const js = readFileSync(GAME_JS, "utf-8");
  // BF-522: dynamic import 완전 제거 — type="module" 없는 일반 스크립트는 import() 불필요
  assert.ok(
    !js.includes("import("),
    "game.js 에 dynamic import() 존재 — BF-522 에서 제거되어야 함 (type=module 미사용)",
  );
  // game.js 는 globalThis 구조 분해로 직접 로직 함수 참조 (BF-522 접근)
  assert.ok(
    js.includes("globalThis"),
    "game.js 에 globalThis 참조 없음 — index.html 인라인 IIFE 변수를 globalThis 에서 구조 분해해야 함",
  );
});

// ─────────────────────────────────────────────────────────────
// AC §1 — index.html 인라인 글로벌 스크립트 확인
// ─────────────────────────────────────────────────────────────

test("BF-518 AC1: index.html — 인라인 로직 글로벌 스크립트 존재 (file:// 폴백)", () => {
  const html = readFileSync(INDEX_HTML, "utf-8");
  // 주요 로직 식별자들이 인라인 스크립트에 정의되어 있어야 함
  assert.ok(html.includes("createInitialState"), "index.html 인라인에 createInitialState 없음");
  assert.ok(html.includes("changeDirection"),    "index.html 인라인에 changeDirection 없음");
  assert.ok(html.includes("tick"),               "index.html 인라인에 tick 없음");
  assert.ok(html.includes("restartGame"),        "index.html 인라인에 restartGame 없음");
  assert.ok(html.includes("spawnFoodCell"),      "index.html 인라인에 spawnFoodCell 없음");
});

test("BF-518 AC1: index.html — 인라인 스크립트가 globalThis 에 로직 주입", () => {
  const html = readFileSync(INDEX_HTML, "utf-8");
  // Object.assign(globalThis, {...}) 패턴 확인
  assert.ok(
    html.includes("Object.assign(globalThis") || html.includes("Object.assign( globalThis"),
    "index.html 인라인 스크립트에 Object.assign(globalThis, ...) 없음",
  );
  assert.ok(html.includes("CELL"),              "globalThis 주입 블록에 CELL 없음");
  assert.ok(html.includes("LS_HIGH_SCORE_KEY"), "globalThis 주입 블록에 LS_HIGH_SCORE_KEY 없음");
  assert.ok(html.includes("DIR"),               "globalThis 주입 블록에 DIR 없음");
});

// ─────────────────────────────────────────────────────────────
// AC §2 — 인라인 글로벌 로직 정합성 (vm으로 평가하여 실제 동작 검증)
// ─────────────────────────────────────────────────────────────

test("BF-518 AC2: 인라인 글로벌 createInitialState — 정상 초기 상태 생성", () => {
  const html = readFileSync(INDEX_HTML, "utf-8");
  // IIFE 블록 추출: (function() { ... })();
  const iife = html.match(/\(function\s*\(\s*\)\s*\{([\s\S]*?)\}\)\(\s*\);/);
  assert.ok(iife, "index.html 인라인 IIFE 블록 추출 실패");

  // globalThis 역할을 할 컨텍스트 객체
  const ctx = { Set, Object, Math, Array };
  // IIFE 내부를 함수로 감싸 실행 (globalThis 파라미터로 주입)
  // eslint-disable-next-line no-new-func
  new Function("globalThis", iife[1]).call(ctx, ctx);

  // createInitialState 글로벌 확인
  assert.strictEqual(typeof ctx.createInitialState, "function", "createInitialState 글로벌 없음");

  const state = ctx.createInitialState(10, 10, 0);
  assert.equal(state.status,   "playing", "createInitialState status=playing");
  assert.equal(state.score,    0,         "createInitialState score=0");
  assert.equal(state.cols,     10,        "createInitialState cols=10");
  assert.equal(state.rows,     10,        "createInitialState rows=10");
  assert.ok(Array.isArray(state.snake) && state.snake.length >= 3, "snake 길이 3 이상");
  assert.deepEqual(state.dir, ctx.DIR.RIGHT, "초기 방향 RIGHT");
});

test("BF-518 AC2: 인라인 글로벌 tick — 이동 + 벽 충돌 gameover", () => {
  const html = readFileSync(INDEX_HTML, "utf-8");
  const iife = html.match(/\(function\s*\(\s*\)\s*\{([\s\S]*?)\}\)\(\s*\);/);
  assert.ok(iife, "IIFE 블록 추출 실패");

  const ctx = { Set, Object, Math, Array };
  // eslint-disable-next-line no-new-func
  new Function("globalThis", iife[1]).call(ctx, ctx);

  const { createInitialState, tick, DIR } = ctx;

  // 1. 오른쪽 이동 1 스텝
  const s0 = createInitialState(10, 10, 0);
  const headX = s0.snake[0].x;
  const s1 = tick(s0);
  assert.equal(s1.snake[0].x, headX + 1, "오른쪽 1 스텝 후 x+1");
  assert.equal(s1.status, "playing", "이동 후 playing 유지");

  // 2. 벽 충돌 → gameover
  const edgeSnake = [
    { x: 9, y: 5 },
    { x: 8, y: 5 },
    { x: 7, y: 5 },
  ];
  const s2 = Object.assign({}, s0, {
    snake: edgeSnake,
    dir: DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food: { x: 0, y: 0 },
  });
  const s3 = tick(s2);
  assert.equal(s3.status, "gameover", "오른쪽 벽 충돌 → gameover");
});

test("BF-518 AC2: 인라인 글로벌 changeDirection — 역방향 무시", () => {
  const html = readFileSync(INDEX_HTML, "utf-8");
  const iife = html.match(/\(function\s*\(\s*\)\s*\{([\s\S]*?)\}\)\(\s*\);/);
  const ctx = { Set, Object, Math, Array };
  // eslint-disable-next-line no-new-func
  new Function("globalThis", iife[1]).call(ctx, ctx);

  const { createInitialState, changeDirection, DIR } = ctx;

  const s0 = createInitialState(10, 10, 0); // dir=RIGHT
  const s1 = changeDirection(s0, DIR.LEFT);
  assert.deepEqual(s1.nextDir, DIR.RIGHT, "RIGHT 상태에서 LEFT 입력 → 무시, nextDir=RIGHT 유지");
});

test("BF-518 AC2: 인라인 글로벌 restartGame — 점수 초기화 + highScore 유지", () => {
  const html = readFileSync(INDEX_HTML, "utf-8");
  const iife = html.match(/\(function\s*\(\s*\)\s*\{([\s\S]*?)\}\)\(\s*\);/);
  const ctx = { Set, Object, Math, Array };
  // eslint-disable-next-line no-new-func
  new Function("globalThis", iife[1]).call(ctx, ctx);

  const { createInitialState, restartGame } = ctx;
  const s0 = Object.assign(createInitialState(10, 10, 0), { score: 80, highScore: 150, status: "gameover" });
  const s1 = restartGame(s0);
  assert.equal(s1.score,     0,         "재시작 후 score=0");
  assert.equal(s1.highScore, 150,       "재시작 후 highScore 유지");
  assert.equal(s1.status,    "playing", "재시작 후 status=playing");
});

// ─────────────────────────────────────────────────────────────
// AC §3 — http:// 회귀 없음 (type=module + src=game.js 유지 확인)
// ─────────────────────────────────────────────────────────────

// BF-522 갱신: type="module" 이 file:// CORS 차단 원인이었으므로 제거됨.
// http:// 호환성은 globalThis 구조 분해 방식으로 그대로 유지 (인라인 IIFE → game.js).
// 이 가드는 BF-522 의 새 구현을 반영: game.js 스크립트에 type=module 없음 확인.
test("BF-518 AC3 (BF-522 갱신): index.html — game.js script 태그 type=module 없음 (file:// CORS 수정)", () => {
  const html = readFileSync(INDEX_HTML, "utf-8");
  // BF-522: game.js 로드 태그에 type="module" 없어야 함
  assert.ok(
    !html.includes('<script type="module" src="./game.js"'),
    'index.html game.js 스크립트에 type="module" 존재 — BF-522 에서 제거되어야 함',
  );
  // game.js 참조 자체는 유지
  assert.ok(
    html.includes('src="./game.js"') || html.includes("src='./game.js'"),
    "index.html 에서 game.js 참조 제거됨",
  );
});

test("BF-518 AC3: game.js — LS_HIGH_SCORE_KEY, WASD 매핑, localStorage 참조 보존", () => {
  const js = readFileSync(GAME_JS, "utf-8");
  assert.ok(
    js.includes("LS_HIGH_SCORE_KEY") || js.includes("bf-snake-high-score"),
    "game.js 에 LS_HIGH_SCORE_KEY 참조 없음",
  );
  assert.ok(
    js.includes("w:") || js.includes("'w'") || js.includes('"w"'),
    "game.js 에 WASD 'w' 키 매핑 없음 (BF-514 회귀)",
  );
  assert.ok(
    js.includes("localStorage.getItem") || js.includes("loadHighScore"),
    "game.js 에 localStorage 로드 로직 없음",
  );
});

test("BF-518 AC3: index.html — 기존 DOM 구조 완전 보존 (canvas + HUD + gameover-overlay)", () => {
  const html = readFileSync(INDEX_HTML, "utf-8");
  assert.ok(html.includes('id="game-canvas"'),      "#game-canvas 없음 (회귀)");
  assert.ok(html.includes('id="hud"'),              "#hud 없음 (회귀)");
  assert.ok(html.includes('id="hud-score-value"'),  "#hud-score-value 없음 (회귀)");
  assert.ok(html.includes('id="hud-high-value"'),   "#hud-high-value 없음 (회귀)");
  assert.ok(html.includes('id="gameover-overlay"'), "#gameover-overlay 없음 (회귀)");
  assert.ok(html.includes("Game Over"),             '"Game Over" 텍스트 없음 (회귀)');
  assert.ok(html.includes("Press Space to restart"),'재시작 힌트 없음 (회귀)');
});
