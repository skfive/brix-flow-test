// BF-526 · snake 게임 스페이스바 멈춤/재개 토글 + KPI 측정 — 단위/구조 테스트
//
// 수용 기준 매핑:
//   AC §1 — 진행 중 스페이스바 → 게임 루프 즉시 정지 + PAUSED 시각 피드백 (BF-524 회귀 가드)
//   AC §2 — 멈춤 중 스페이스바 → 게임 재개 + 상태 보존 (BF-524 회귀 가드)
//   AC §3 — 멈춤 중 방향키 → 방향 변경 불가 + PAUSED 유지 (BF-524 회귀 가드)
//   AC §4 — 토글 횟수 + 누적 멈춤 시간 → sessionStorage 또는 console 기록 (신규)
//
// 실행: node --test tests/snake-BF526.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { tick, createInitialState, changeDirection, DIR } from "../snake/logic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SNAKE_DIR = path.join(REPO_ROOT, "snake");

// ─────────────────────────────────────────────────────────────
// AC §1~§3 회귀 가드 — logic.js 순수 로직
// ─────────────────────────────────────────────────────────────

test("BF-526 AC1/AC2 회귀: tick() — paused 상태에서 게임 상태 완전 불변", () => {
  const s0 = createInitialState(10, 10, 0);
  const snakeSnapshot = JSON.stringify(s0.snake);
  const foodSnapshot  = JSON.stringify(s0.food);
  const paused = { ...s0, status: "paused" };
  const s1 = tick(paused);

  assert.strictEqual(s1.status, "paused",           "paused 상태에서 tick() 후 status 그대로 유지");
  assert.strictEqual(JSON.stringify(s1.snake), snakeSnapshot, "paused 상태에서 snake 위치 불변");
  assert.strictEqual(JSON.stringify(s1.food),  foodSnapshot,  "paused 상태에서 food 위치 불변");
  assert.strictEqual(s1.score, 0,                   "paused 상태에서 score 불변");
});

test("BF-526 AC2 회귀: tick() — paused → playing 전환 후 정상 이동 (상태 보존)", () => {
  const s0 = createInitialState(10, 10, 0);
  const headX = s0.snake[0].x;

  const paused  = { ...s0, status: "paused" };
  const sStill  = tick(paused);
  assert.strictEqual(sStill.snake[0].x, headX, "paused 중 tick() → 위치 유지");

  const resumed = { ...sStill, status: "playing" };
  const sMoved  = tick(resumed);
  assert.strictEqual(sMoved.snake[0].x, headX + 1, "재개 후 tick() → 오른쪽 1칸 이동");
  assert.strictEqual(sMoved.status, "playing",      "재개 후 status=playing 유지");
});

test("BF-526 AC3 회귀: changeDirection() — paused 상태에서도 nextDir 변경은 state 반환하지만 tick 미진행", () => {
  // paused 상태에서 changeDirection 자체는 nextDir 를 바꾸지만,
  // 방향키 가드는 game.js keydown 핸들러에서 처리. logic.js 는 변경만 허용.
  // tick() 이 paused 상태에서 이동 안 함을 확인 — 방향 변경 가드는 game.js 구조 테스트로 검증.
  const s0      = createInitialState(10, 10, 0);
  const paused  = { ...s0, status: "paused" };
  // changeDirection 자체는 nextDir 업데이트
  const changed = changeDirection(paused, DIR.DOWN);
  // tick 해도 paused 이므로 위치 이동 없음
  const s1 = tick(changed);
  assert.strictEqual(s1.status, "paused");
  assert.deepStrictEqual(s1.snake, paused.snake, "paused 상태에서 방향 변경 후 tick() 해도 위치 불변");
});

// ─────────────────────────────────────────────────────────────
// AC §4: game.js 구조 테스트 — KPI 측정 로직 존재 여부
// ─────────────────────────────────────────────────────────────

test("BF-526 AC4: game.js — 토글 횟수 카운터 변수 선언", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  // pauseToggleCount / kpiToggleCount / toggleCount 중 하나 존재
  const hasPauseCounter =
    js.includes("pauseToggleCount") ||
    js.includes("kpiToggleCount")   ||
    js.includes("toggleCount");
  assert.ok(hasPauseCounter, "game.js 에 멈춤/재개 토글 횟수 카운터 변수 없음 (AC §4)");
});

test("BF-526 AC4: game.js — 누적 멈춤 시간 추적 변수 선언", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  // totalPausedMs / pausedDurationMs / accPausedMs 중 하나 존재
  const hasDurationVar =
    js.includes("totalPausedMs")    ||
    js.includes("pausedDurationMs") ||
    js.includes("accPausedMs");
  assert.ok(hasDurationVar, "game.js 에 누적 멈춤 시간 추적 변수 없음 (AC §4)");
});

test("BF-526 AC4: game.js — 멈춤 시작 타임스탬프 기록 (pauseStartTs 등)", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  // pauseStartTs / pauseStartTime / kpiPauseStart 중 하나
  const hasStartTs =
    js.includes("pauseStartTs")   ||
    js.includes("pauseStartTime") ||
    js.includes("kpiPauseStart");
  assert.ok(hasStartTs, "game.js 에 멈춤 시작 타임스탬프 변수 없음 (AC §4)");
});

test("BF-526 AC4: game.js — performance.now() 로 멈춤 시간 측정", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  assert.ok(
    js.includes("performance.now()"),
    "game.js 에 performance.now() 호출 없음 — 누적 멈춤 시간 측정에 필요 (AC §4)",
  );
});

test("BF-526 AC4: game.js — sessionStorage 또는 console 에 KPI 기록", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  const hasSessionStorage = js.includes("sessionStorage");
  const hasConsoleLog     = js.includes("console.log");
  assert.ok(
    hasSessionStorage || hasConsoleLog,
    "game.js 에 sessionStorage 또는 console.log KPI 기록 없음 (AC §4)",
  );
});

test("BF-526 AC4: game.js — togglePause 내에서 카운터 증가 (++)", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  // togglePause 함수 내에 ++ 증감 연산 존재 여부 확인
  const togglePauseStart = js.indexOf("function togglePause");
  assert.ok(togglePauseStart !== -1, "game.js 에 togglePause 함수 없음");
  // 함수 블록 추출 (간단히 함수 시작~250자 범위)
  const fnSnippet = js.slice(togglePauseStart, togglePauseStart + 600);
  assert.ok(
    fnSnippet.includes("++") || fnSnippet.includes("+= 1"),
    "togglePause 함수 내 카운터 증가(++ 또는 += 1) 없음 (AC §4)",
  );
});

test("BF-526 AC4: game.js — doRestart 시 KPI 초기화 (재게임마다 리셋)", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  const doRestartStart = js.indexOf("function doRestart");
  assert.ok(doRestartStart !== -1, "game.js 에 doRestart 함수 없음");
  // doRestart 함수 내에서 카운터 리셋(= 0) 존재 여부
  const fnSnippet = js.slice(doRestartStart, doRestartStart + 500);
  assert.ok(
    fnSnippet.includes("= 0"),
    "doRestart 내 KPI 카운터 초기화(= 0) 없음 — 재시작 시 KPI 리셋 필요 (AC §4)",
  );
});

// ─────────────────────────────────────────────────────────────
// AC §3: game.js 구조 테스트 — 방향키 가드 (paused 상태 입력 무시)
// ─────────────────────────────────────────────────────────────

test("BF-526 AC3: game.js — keydown 핸들러에서 paused 상태 방향키 가드", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  const handlerStart = js.indexOf('window.addEventListener("keydown"');
  assert.ok(handlerStart !== -1, "game.js 에 keydown 이벤트 리스너 없음");

  const handlerText = js.slice(handlerStart, handlerStart + 600);
  // 방향키 처리 시 playing 상태 확인 로직 존재
  const hasPlayingGuard =
    handlerText.includes('"playing"') || handlerText.includes("'playing'");
  assert.ok(
    hasPlayingGuard,
    "keydown 핸들러에서 playing 상태 가드 없음 — paused 중 방향키 무시 필요 (AC §3)",
  );
});

// ─────────────────────────────────────────────────────────────
// 회귀 가드 — 기존 기능 손상 없음
// ─────────────────────────────────────────────────────────────

test("BF-526 회귀: index.html — 기존 DOM 구조 + PAUSED 오버레이 완전 보존", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
  assert.ok(html.includes('id="game-canvas"'),      "#game-canvas 없음 (회귀)");
  assert.ok(html.includes('id="hud"'),              "#hud 없음 (회귀)");
  assert.ok(html.includes('id="gameover-overlay"'), "#gameover-overlay 없음 (회귀)");
  assert.ok(html.includes('id="paused-overlay"'),   "#paused-overlay 없음 (BF-524 회귀)");
  assert.ok(html.includes("PAUSED"),                '"PAUSED" 텍스트 없음 (BF-524 회귀)');
  assert.ok(html.includes("Press Space to resume"), '"Press Space to resume" 힌트 없음 (BF-524 회귀)');
});

test("BF-526 회귀: game.js — 핵심 pause 구조 완전 보존 (BF-524 회귀 없음)", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");
  assert.ok(js.includes("togglePause"),        "togglePause 없음 (BF-524 회귀)");
  assert.ok(js.includes("showPaused"),         "showPaused 없음 (BF-524 회귀)");
  assert.ok(js.includes("hidePaused"),         "hidePaused 없음 (BF-524 회귀)");
  assert.ok(js.includes("paused-overlay"),     "paused-overlay DOM 참조 없음 (BF-524 회귀)");
  assert.ok(js.includes("cancelAnimationFrame"), "cancelAnimationFrame 없음 (BF-524 회귀)");
  assert.ok(js.includes("globalThis"),         "globalThis 참조 없음 (BF-522 회귀)");
});
