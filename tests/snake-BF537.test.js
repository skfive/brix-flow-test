// BF-537 · 지렁이게임 이팩트 효과 구현 — 회귀 가드 테스트
//
// AC 매핑:
//   AC-1: 배수 아이템 섭취 시 종류별 이팩트 재생 → triggerEffect 디스패처 + 각 배수별 함수 존재
//   AC-2: 이팩트 off 시 기존 동작 완전 동일 → EFFECTS_ENABLED 플래그 + 조건 분기 존재
//   AC-3: KPI 측정 → effectTriggerCount + EFFECT_KPI_KEY + saveEffectKPI + logKPI 통합
//   AC-4: 회귀 가드 통과 → 기존 HTML/CSS/JS 필수 요소 보존 + #effect-layer 추가
//
// 실행: node --test tests/snake-BF537.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SNAKE_DIR = path.join(REPO_ROOT, "snake");

const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
const css  = readFileSync(path.join(SNAKE_DIR, "styles.css"), "utf-8");
const js   = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");

// ─────────────────────────────────────────────────────────────
// AC-1: 이팩트 레이어 HTML 구조 (명세 §6-1)
// ─────────────────────────────────────────────────────────────

test("BF-537 §1-1 (AC1): index.html — #effect-layer 요소 존재 (명세 §6-1)", () => {
  assert.ok(html.includes('id="effect-layer"'), "#effect-layer div 없음 (명세 §6-1)");
});

test("BF-537 §1-2 (AC1): index.html — #effect-layer 에 aria-hidden='true' 존재", () => {
  assert.ok(
    html.includes('id="effect-layer"') && html.includes('aria-hidden="true"'),
    "#effect-layer aria-hidden 없음 (명세 §6-1)"
  );
});

test("BF-537 §1-3 (AC1): index.html — #effect-layer 가 <canvas> 뒤에 위치", () => {
  const canvasIdx = html.indexOf('id="game-canvas"');
  const layerIdx  = html.indexOf('id="effect-layer"');
  assert.ok(canvasIdx !== -1, "#game-canvas 없음");
  assert.ok(layerIdx  !== -1, "#effect-layer 없음");
  assert.ok(layerIdx > canvasIdx, "#effect-layer 가 <canvas> 뒤에 있어야 함 (명세 §6-1)");
});

// ─────────────────────────────────────────────────────────────
// AC-1: 이팩트 레이어 CSS (명세 §6-2 + §4-2)
// ─────────────────────────────────────────────────────────────

test("BF-537 §2-1 (AC1): styles.css — #effect-layer 스타일 존재", () => {
  assert.ok(css.includes("#effect-layer"), "#effect-layer CSS 없음 (명세 §6-2)");
});

test("BF-537 §2-2 (AC1): styles.css — #effect-layer z-index: 15 설정", () => {
  assert.ok(css.includes("z-index: 15"), "#effect-layer z-index:15 없음 (명세 §4-1)");
});

test("BF-537 §2-3 (AC1): styles.css — #effect-layer pointer-events: none 설정", () => {
  // #effect-layer 섹션에 pointer-events 포함
  assert.ok(css.includes("pointer-events: none"), "pointer-events: none 없음");
});

test("BF-537 §2-4 (AC1): styles.css — 이팩트 CSS 변수 토큰 존재 (명세 §6-2)", () => {
  assert.ok(css.includes("--fx-1x-primary"), "--fx-1x-primary CSS 변수 없음");
  assert.ok(css.includes("--fx-2x-primary"), "--fx-2x-primary CSS 변수 없음");
  assert.ok(css.includes("--fx-4x-primary"), "--fx-4x-primary CSS 변수 없음");
  assert.ok(css.includes("--fx-8x-primary"), "--fx-8x-primary CSS 변수 없음");
  assert.ok(css.includes("--fx-core-white"), "--fx-core-white CSS 변수 없음");
});

test("BF-537 §2-5 (AC1): styles.css — 배수별 키프레임 존재 (명세 §5-1~§5-4)", () => {
  assert.ok(css.includes("@keyframes fx-sparkle-particle"), "fx-sparkle-particle 없음 (1×, 명세 §5-1)");
  assert.ok(css.includes("@keyframes fx-sparkle-center"),   "fx-sparkle-center 없음 (1×/2×)");
  assert.ok(css.includes("@keyframes fx-pop-particle"),     "fx-pop-particle 없음 (2×, 명세 §5-2)");
  assert.ok(css.includes("@keyframes fx-burst-inner"),      "fx-burst-inner 없음 (4×, 명세 §5-3)");
  assert.ok(css.includes("@keyframes fx-burst-ring"),       "fx-burst-ring 없음 (4×, 명세 §5-3)");
  assert.ok(css.includes("@keyframes fx-screen-flash"),     "fx-screen-flash 없음 (공용)");
  assert.ok(css.includes("@keyframes fx-screen-shake"),     "fx-screen-shake 없음 (8×, 명세 §5-4)");
  assert.ok(css.includes("@keyframes fx-mega-main"),        "fx-mega-main 없음 (8×, 명세 §5-4)");
  assert.ok(css.includes("@keyframes fx-mega-drift"),       "fx-mega-drift 없음 (8×, 명세 §5-4)");
  assert.ok(css.includes("@keyframes fx-shock1"),           "fx-shock1 없음 (8× 쇼크웨이브)");
  assert.ok(css.includes("@keyframes fx-shock2"),           "fx-shock2 없음 (8× 쇼크웨이브2)");
});

test("BF-537 §2-6 (AC1): styles.css — fx-screen-shake ±4px 값 존재 (명세 §5-4)", () => {
  assert.ok(css.includes("fx-screen-shake"), "fx-screen-shake keyframe 없음");
  assert.ok(css.includes("-4px"), "fx-screen-shake -4px 없음 (명세 §5-4 ±4px)");
});

// ─────────────────────────────────────────────────────────────
// AC-1: triggerEffect 디스패처 + 배수별 함수 (명세 §6-3)
// ─────────────────────────────────────────────────────────────

test("BF-537 §3-1 (AC1): game.js — triggerEffect 함수 존재 (명세 §6-3)", () => {
  assert.ok(js.includes("function triggerEffect"), "triggerEffect 함수 없음 (명세 §6-3)");
});

test("BF-537 §3-2 (AC1): game.js — 배수별 이팩트 함수 4종 존재", () => {
  assert.ok(js.includes("function triggerSparkle"),   "triggerSparkle 없음 (1×, 명세 §5-1)");
  assert.ok(js.includes("function triggerPop"),       "triggerPop 없음 (2×, 명세 §5-2)");
  assert.ok(js.includes("function triggerBurst"),     "triggerBurst 없음 (4×, 명세 §5-3)");
  assert.ok(js.includes("function triggerMegaBlast"), "triggerMegaBlast 없음 (8×, 명세 §5-4)");
});

test("BF-537 §3-3 (AC1): game.js — triggerEffect 내 switch 분기 (1/2/4/8× 전부)", () => {
  assert.ok(js.includes("case 1:"), "switch case 1 없음");
  assert.ok(js.includes("case 2:"), "switch case 2 없음");
  assert.ok(js.includes("case 4:"), "switch case 4 없음");
  assert.ok(js.includes("case 8:"), "switch case 8 없음");
});

test("BF-537 §3-4 (AC1): game.js — 스크린 플래시 헬퍼 존재 (4×/8×)", () => {
  assert.ok(js.includes("function triggerScreenFlash"), "triggerScreenFlash 없음 (명세 §6-6)");
});

test("BF-537 §3-5 (AC1): game.js — 화면 흔들림 헬퍼 존재 (8× 전용)", () => {
  assert.ok(js.includes("function triggerScreenShake"), "triggerScreenShake 없음 (명세 §6-7)");
});

test("BF-537 §3-6 (AC1): game.js — loop() 내 먹이 수집 감지 + triggerEffect 호출", () => {
  assert.ok(js.includes("prevFood"), "prevFood 스냅샷 없음 (명세 §6-4)");
  assert.ok(js.includes("triggerEffect("), "loop() 내 triggerEffect 호출 없음 (명세 §6-4)");
  assert.ok(
    js.includes("state.food !== prevFood"),
    "food 변경 감지 로직 없음 (state.food !== prevFood)"
  );
});

test("BF-537 §3-7 (AC1): game.js — 4× 스크린 플래시 rgba(180,60,255,0.15) / 60ms 호출", () => {
  assert.ok(
    js.includes("rgba(180,60,255,0.15)"),
    "4× 스크린 플래시 색상 rgba(180,60,255,0.15) 없음 (명세 §5-3)"
  );
  assert.ok(
    js.includes("triggerScreenFlash(\"rgba(180,60,255,0.15)\", 60)"),
    "4× 플래시 60ms 호출 없음 (명세 §5-3)"
  );
});

test("BF-537 §3-8 (AC1): game.js — 8× 스크린 플래시 rgba(255,68,68,0.25) / 100ms 호출", () => {
  assert.ok(
    js.includes("rgba(255,68,68,0.25)"),
    "8× 스크린 플래시 색상 없음 (명세 §5-4)"
  );
  assert.ok(
    js.includes("triggerScreenFlash(\"rgba(255,68,68,0.25)\", 100)"),
    "8× 플래시 100ms 호출 없음 (명세 §5-4)"
  );
});

test("BF-537 §3-9 (AC1): game.js — 4× 별 clip-path polygon 존재 (명세 §5-3)", () => {
  assert.ok(
    js.includes("polygon(50% 0%, 61% 35%, 98% 35%"),
    "4×/8× 별 clip-path polygon 없음 (명세 §5-3)"
  );
});

// ─────────────────────────────────────────────────────────────
// AC-2: EFFECTS_ENABLED 롤백 토글 (명세 §6-3 + AC-2)
// ─────────────────────────────────────────────────────────────

test("BF-537 §4-1 (AC2): game.js — EFFECTS_ENABLED 플래그 선언", () => {
  assert.ok(
    js.includes("EFFECTS_ENABLED"),
    "EFFECTS_ENABLED 플래그 없음 — off 시 기존 동작 보장 불가 (AC-2)"
  );
});

test("BF-537 §4-2 (AC2): game.js — triggerEffect 내 EFFECTS_ENABLED 체크", () => {
  assert.ok(
    js.includes("if (!EFFECTS_ENABLED)"),
    "triggerEffect 에 EFFECTS_ENABLED 조건 없음 (AC-2 롤백 원칙)"
  );
});

test("BF-537 §4-3 (AC2): game.js — EFFECTS_ENABLED 초기값 true", () => {
  assert.ok(
    js.includes("EFFECTS_ENABLED = true"),
    "EFFECTS_ENABLED 초기값 true 아님 (기본은 이팩트 활성화)"
  );
});

// ─────────────────────────────────────────────────────────────
// AC-3: KPI 측정 (localStorage 누적 카운트)
// ─────────────────────────────────────────────────────────────

test("BF-537 §5-1 (AC3): game.js — bf-snake-effect-kpi localStorage 키 존재", () => {
  assert.ok(
    js.includes("bf-snake-effect-kpi"),
    "EFFECT_KPI_KEY 'bf-snake-effect-kpi' 없음 (AC-3)"
  );
});

test("BF-537 §5-2 (AC3): game.js — effectTriggerCount 통계 객체 존재", () => {
  assert.ok(
    js.includes("effectTriggerCount"),
    "effectTriggerCount 객체 없음 (AC-3)"
  );
});

test("BF-537 §5-3 (AC3): game.js — saveEffectKPI 함수 존재 (localStorage 저장)", () => {
  assert.ok(
    js.includes("function saveEffectKPI"),
    "saveEffectKPI 함수 없음 (AC-3)"
  );
});

test("BF-537 §5-4 (AC3): game.js — triggerEffect 내 effectTriggerCount 누적 + saveEffectKPI 호출", () => {
  assert.ok(
    js.includes("effectTriggerCount[k]"),
    "effectTriggerCount[k] 누적 없음 (AC-3)"
  );
  assert.ok(
    js.includes("saveEffectKPI()"),
    "saveEffectKPI() 호출 없음 (AC-3)"
  );
});

test("BF-537 §5-5 (AC3): game.js — logKPI() 내 [BF-537 KPI] 이팩트 console 출력", () => {
  assert.ok(
    js.includes("[BF-537 KPI]"),
    "게임 종료 시 [BF-537 KPI] console 출력 없음 (AC-3)"
  );
});

test("BF-537 §5-6 (AC3): game.js — doRestart() 에서 effectTriggerCount 리셋", () => {
  assert.ok(
    js.includes("effectTriggerCount[k] = 0"),
    "doRestart() 에서 effectTriggerCount 리셋 없음 (AC-3)"
  );
});

// ─────────────────────────────────────────────────────────────
// AC-4: 기존 회귀 가드 — HTML/CSS/JS 필수 요소 보존
// ─────────────────────────────────────────────────────────────

test("BF-537 §6-1 (AC4): index.html — 기존 필수 DOM ID 모두 보존", () => {
  const required = [
    'id="game-canvas"',
    'id="hud"',
    'id="hud-player-score"',
    'id="hud-cpu-score"',
    'id="gameover-overlay"',
    'id="paused-overlay"',
    'id="competition-legend"',
    'id="multiplier-stats"',
  ];
  for (const id of required) {
    assert.ok(html.includes(id), `${id} 없음 — 회귀 (AC-4)`);
  }
});

test("BF-537 §6-2 (AC4): styles.css — 기존 HUD/오버레이 스타일 보존", () => {
  assert.ok(css.includes("#hud"),                "HUD 스타일 없음 (회귀)");
  assert.ok(css.includes("#gameover-overlay"),   "#gameover-overlay 스타일 없음 (회귀)");
  assert.ok(css.includes("#paused-overlay"),     "#paused-overlay 스타일 없음 (회귀)");
  assert.ok(css.includes("#multiplier-stats"),   "#multiplier-stats 스타일 없음 (회귀)");
});

test("BF-537 §6-3 (AC4): game.js — 기존 KPI 코드 보존 ([BF-531], [BF-526], [BF-529])", () => {
  assert.ok(js.includes("[BF-531 KPI]"), "[BF-531 KPI] 로그 없음 (회귀)");
  assert.ok(js.includes("[BF-526 KPI]"), "[BF-526 KPI] 로그 없음 (회귀)");
  assert.ok(js.includes("[BF-529 KPI]"), "[BF-529 KPI] 로그 없음 (회귀)");
});

test("BF-537 §6-4 (AC4): game.js — 기존 함수 보존 (tickFull, createInitialState, render 등)", () => {
  assert.ok(js.includes("tickFull(state)"),          "tickFull 호출 없음 (회귀)");
  assert.ok(js.includes("createInitialState("),      "createInitialState 없음 (회귀)");
  assert.ok(js.includes("function render"),          "render 함수 없음 (회귀)");
  assert.ok(js.includes("function showGameOver"),    "showGameOver 없음 (회귀)");
  assert.ok(js.includes("function togglePause"),     "togglePause 없음 (회귀)");
});

test("BF-537 §6-5 (AC4): index.html — IIFE globalThis 주입 보존", () => {
  assert.ok(html.includes("spawnFoodWithMultiplier"), "IIFE: spawnFoodWithMultiplier 없음 (회귀)");
  assert.ok(html.includes("MULTIPLIER_COLORS"),       "IIFE: MULTIPLIER_COLORS 없음 (회귀)");
  assert.ok(html.includes("tickFull"),                "IIFE: tickFull 없음 (회귀)");
  assert.ok(html.includes("cpuChooseDir"),            "IIFE: cpuChooseDir 없음 (회귀)");
});

test("BF-537 §6-6 (AC4): game.js — effectLayer DOM 참조 존재", () => {
  assert.ok(
    js.includes("document.getElementById(\"effect-layer\")"),
    "effectLayer DOM 참조 없음 — effect-layer 를 찾지 못함"
  );
});
