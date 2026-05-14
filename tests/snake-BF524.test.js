// BF-524 · snake 게임 멈춤/재개 기능 (스페이스바 토글) — 단위/구조 테스트
//
// 수용 기준 매핑:
//   AC §1 — 진행 중 스페이스바 → 게임 멈춤 + PAUSED 오버레이 표시
//   AC §2 — 멈춤 중 스페이스바 → 게임 재개 + PAUSED 오버레이 숨김 (상태 보존)
//   AC §3 — 게임 오버 / 시작 전 스페이스바 → 멈춤/재개 미트리거
//
// 실행: node --test tests/snake-BF524.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { tick, createInitialState } from "../snake/logic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SNAKE_DIR = path.join(REPO_ROOT, "snake");

// ─────────────────────────────────────────────────────────────
// 순수 로직 테스트 — paused 상태에서 tick() 동작 검증 (AC §1, §2 핵심)
// ─────────────────────────────────────────────────────────────

test("BF-524 AC1/AC2 (logic): tick() — paused 상태에서 게임 상태 불변", () => {
  const s0 = createInitialState(10, 10, 0);
  const paused = { ...s0, status: "paused" };
  const s1 = tick(paused);

  assert.strictEqual(s1.status, "paused", "paused 상태에서 tick() 후 status 그대로 유지되어야 함");
  assert.deepStrictEqual(s1.snake, paused.snake, "paused 상태에서 tick() 후 snake 위치 불변");
  assert.strictEqual(s1.score, 0, "paused 상태에서 tick() 후 score 불변");
});

test("BF-524 AC2 (logic): tick() — paused → playing 상태에서 정상 이동 (상태 보존 후 재개 가능)", () => {
  const s0 = createInitialState(10, 10, 0);
  const headX = s0.snake[0].x;

  // paused 상태에서 tick() 하면 위치 불변
  const paused = { ...s0, status: "paused" };
  const sStill = tick(paused);
  assert.strictEqual(sStill.snake[0].x, headX, "paused 중 tick() → 위치 유지");

  // status 를 playing 으로 바꾸면 정상 이동
  const resumed = { ...sStill, status: "playing" };
  const sMoved = tick(resumed);
  assert.strictEqual(sMoved.snake[0].x, headX + 1, "재개 후 tick() → 오른쪽 1칸 이동");
  assert.strictEqual(sMoved.status, "playing", "재개 후 status=playing");
});

test("BF-524 AC1/AC2 (logic): tick() — playing 상태 정상 이동 회귀 없음", () => {
  const s0 = createInitialState(10, 10, 0);
  const headX = s0.snake[0].x;
  const s1 = tick(s0);
  assert.strictEqual(s1.status, "playing", "playing → tick() 후 status=playing 유지");
  assert.strictEqual(s1.snake[0].x, headX + 1, "playing → 오른쪽 1칸 이동 확인");
});

// ─────────────────────────────────────────────────────────────
// HTML 구조 테스트 — PAUSED 오버레이 요소 존재 (AC §1 시각 피드백)
// ─────────────────────────────────────────────────────────────

test("BF-524 AC1: index.html — paused-overlay 요소 존재 (hidden 기본값)", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");

  assert.ok(
    html.includes('id="paused-overlay"'),
    'index.html 에 id="paused-overlay" 요소 없음',
  );
  // hidden 속성이 요소에 함께 있어야 함 (게임 시작 시 비표시)
  const hasHidden =
    /id="paused-overlay"[^>]*hidden/.test(html) ||
    /hidden[^>]*id="paused-overlay"/.test(html);
  assert.ok(hasHidden, "paused-overlay 의 초기 hidden 속성 없음");
});

test("BF-524 AC1: index.html — PAUSED 오버레이에 'PAUSED' 텍스트 포함", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
  assert.ok(html.includes("PAUSED"), "index.html 에 'PAUSED' 텍스트 없음");
});

test("BF-524 AC1: index.html — PAUSED 오버레이에 재개 힌트 포함", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
  // "Space to resume" 또는 동등한 힌트
  const hasHint =
    html.includes("Space to resume") ||
    html.includes("스페이스로 재개") ||
    html.includes("resume");
  assert.ok(hasHint, "PAUSED 오버레이에 재개 힌트 없음 (Space to resume 등)");
});

// ─────────────────────────────────────────────────────────────
// CSS 구조 테스트 — PAUSED 오버레이 스타일 존재
// ─────────────────────────────────────────────────────────────

test("BF-524 AC1: styles.css — #paused-overlay 스타일 정의", () => {
  const css = readFileSync(path.join(SNAKE_DIR, "styles.css"), "utf-8");
  assert.ok(
    css.includes("#paused-overlay"),
    "styles.css 에 #paused-overlay 스타일 없음",
  );
});

test("BF-524 AC1: styles.css — #paused-overlay[hidden] display:none 처리", () => {
  const css = readFileSync(path.join(SNAKE_DIR, "styles.css"), "utf-8");
  assert.ok(
    css.includes("#paused-overlay[hidden]"),
    "styles.css 에 #paused-overlay[hidden] 규칙 없음 (hidden 속성으로 숨김 처리 필요)",
  );
});

// ─────────────────────────────────────────────────────────────
// game.js 구조 테스트 — 멈춤/재개 로직 (AC §1, §2, §3)
// ─────────────────────────────────────────────────────────────

test("BF-524 AC1/AC2: game.js — togglePause 함수 정의", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  assert.ok(
    js.includes("togglePause"),
    "game.js 에 togglePause 함수 없음",
  );
});

test("BF-524 AC1: game.js — showPaused / hidePaused 함수 정의", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  assert.ok(js.includes("showPaused"), "game.js 에 showPaused 함수 없음");
  assert.ok(js.includes("hidePaused"), "game.js 에 hidePaused 함수 없음");
});

test("BF-524 AC1/AC2: game.js — paused-overlay DOM 참조 존재", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  assert.ok(
    js.includes("paused-overlay"),
    "game.js 에 paused-overlay DOM 참조 없음",
  );
});

test("BF-524 AC1: game.js — Space 키 + togglePause 조합 (playing 상태 처리)", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  assert.ok(
    js.includes("Space") && js.includes("togglePause"),
    "game.js keydown 핸들러에 Space + togglePause 조합 없음",
  );
  // playing 상태 문자열 참조
  assert.ok(
    js.includes('"playing"') || js.includes("'playing'"),
    "game.js 에 playing 상태 문자열 참조 없음",
  );
});

test("BF-524 AC2: game.js — paused 상태 문자열 참조 (멈춤 상태 처리)", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  assert.ok(
    js.includes('"paused"') || js.includes("'paused'"),
    "game.js 에 paused 상태 문자열 참조 없음 — 멈춤 상태 처리 필요",
  );
});

test("BF-524 AC3: game.js — gameover 상태 Space → doRestart 유지 (togglePause X)", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  // gameover 처리와 doRestart 가 함께 존재해야 함
  assert.ok(js.includes('"gameover"'), "game.js 에 gameover 상태 참조 없음");
  assert.ok(js.includes("doRestart"),  "game.js 에 doRestart 없음 — gameover Space 재시작 처리 필요");

  // keydown 핸들러 범위 내에서 "gameover" 가 togglePause 보다 먼저 나와야 함 (early-return AC §3)
  const handlerStart = js.indexOf('window.addEventListener("keydown"');
  assert.ok(handlerStart !== -1, "game.js 에 keydown 이벤트 리스너 없음");
  const handlerText = js.slice(handlerStart);
  const gameoverInHandler    = handlerText.indexOf('"gameover"');
  const togglePauseInHandler = handlerText.indexOf("togglePause");
  assert.ok(
    gameoverInHandler !== -1 && togglePauseInHandler !== -1,
    "keydown 핸들러 내에 gameover 또는 togglePause 참조 없음",
  );
  assert.ok(
    gameoverInHandler < togglePauseInHandler,
    "keydown 핸들러에서 gameover early-return 이 togglePause 호출 이후에 있음 (AC §3 위반)",
  );
});

test("BF-524 AC1: game.js — togglePause 내 cancelAnimationFrame 호출 (즉시 정지)", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  assert.ok(
    js.includes("cancelAnimationFrame"),
    "game.js 에 cancelAnimationFrame 없음 — 게임 루프 즉시 중단 필요",
  );
});

// ─────────────────────────────────────────────────────────────
// 회귀 가드 — 기존 DOM 구조 및 game.js 핵심 참조 보존
// ─────────────────────────────────────────────────────────────

test("BF-524 회귀: index.html — 기존 DOM 구조 완전 보존", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
  assert.ok(html.includes('id="game-canvas"'),      "#game-canvas 없음 (회귀)");
  assert.ok(html.includes('id="hud"'),              "#hud 없음 (회귀)");
  assert.ok(html.includes('id="gameover-overlay"'), "#gameover-overlay 없음 (회귀)");
  assert.ok(html.includes("Game Over"),             '"Game Over" 텍스트 없음 (회귀)');
  assert.ok(html.includes("Press Space to restart"), "재시작 힌트 없음 (회귀)");
});

test("BF-524 회귀: index.html — file:// CORS 호환성 유지 (game.js type=module 없음)", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
  assert.ok(
    !html.includes('<script type="module" src="./game.js"'),
    'BF-522 회귀: game.js 스크립트에 type="module" 다시 추가됨',
  );
  assert.ok(
    html.includes('src="./game.js"') || html.includes("src='./game.js'"),
    "index.html 에서 game.js 참조 사라짐",
  );
});

test("BF-524 회귀: game.js — globalThis 구조 분해 유지 (BF-522 회귀 없음)", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  assert.ok(js.includes("globalThis"), "game.js globalThis 참조 사라짐 (BF-522 회귀)");
});
