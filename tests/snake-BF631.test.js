// BF-631 · Snake PixiJS 마이그레이션 정리: Canvas 2D 잔재 제거 + debug 오버레이 추가
//
// AC 매핑:
//   AC1 — snake/ 모듈에서 getContext('2d') 호출 0건 (vendor 제외)
//   AC2 — debug 오버레이 요소 (#debug-overlay) 가 index.html 에 존재
//   AC3 — debug 오버레이가 기본적으로 hidden 속성을 가짐 (off by default)
//   AC4 — render() 에 Canvas 2D 폴백 브랜치 없음
//
// 실행: node --test tests/snake-BF631.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAKE_DIR = path.join(__dirname, "..", "snake");

function readSnakeFile(name) {
  return readFileSync(path.join(SNAKE_DIR, name), "utf-8");
}

// ─────────────────────────────────────────────────────────────
// AC1: getContext('2d') grep 0건 (snake/*.js — vendor 제외)
// ─────────────────────────────────────────────────────────────
describe("AC1 — Canvas 2D 잔재 제거", () => {
  test("game.js 에 getContext('2d') 호출이 없어야 한다", () => {
    const src = readSnakeFile("game.js");
    const matchSingle = (src.match(/getContext\('2d'\)/g) || []).length;
    const matchDouble = (src.match(/getContext\("2d"\)/g) || []).length;
    assert.equal(matchSingle + matchDouble, 0,
      "game.js 에 getContext('2d') 또는 getContext(\"2d\") 가 남아 있습니다");
  });

  test("logic.js 에 getContext('2d') 호출이 없어야 한다", () => {
    const src = readSnakeFile("logic.js");
    const matchSingle = (src.match(/getContext\('2d'\)/g) || []).length;
    const matchDouble = (src.match(/getContext\("2d"\)/g) || []).length;
    assert.equal(matchSingle + matchDouble, 0,
      "logic.js 에 getContext('2d') 또는 getContext(\"2d\") 가 남아 있습니다");
  });

  test("RENDER_BACKEND 분기가 render() 함수 내에 없어야 한다", () => {
    const src = readSnakeFile("game.js");
    // render() 함수만 추출 (단순 문자열 범위)
    const renderStart = src.indexOf("function render()");
    assert.ok(renderStart >= 0, "render() 함수를 찾을 수 없습니다");
    // render() 종료 — 다음 빈줄 + function 키워드까지
    const nextFn = src.indexOf("\nfunction ", renderStart + 1);
    const renderBody = nextFn >= 0 ? src.slice(renderStart, nextFn) : src.slice(renderStart, renderStart + 2000);
    // Canvas2D draw* 함수 직접 호출이 없어야 함
    assert.ok(!renderBody.includes("drawBackground("), "render() 에 drawBackground() 호출이 남아 있습니다");
    assert.ok(!renderBody.includes("drawFood("),       "render() 에 drawFood() 호출이 남아 있습니다");
    assert.ok(!renderBody.includes("drawSnake("),      "render() 에 drawSnake() 호출이 남아 있습니다");
    assert.ok(!renderBody.includes("drawCpuSnake("),   "render() 에 drawCpuSnake() 호출이 남아 있습니다");
  });
});

// ─────────────────────────────────────────────────────────────
// AC2: debug 오버레이 요소가 index.html 에 존재
// ─────────────────────────────────────────────────────────────
describe("AC2 — debug 오버레이 HTML 요소 존재", () => {
  test("index.html 에 id=\"debug-overlay\" 요소가 있어야 한다", () => {
    const html = readSnakeFile("index.html");
    assert.ok(
      html.includes('id="debug-overlay"'),
      "index.html 에 id=\"debug-overlay\" 요소가 없습니다",
    );
  });

  test("game.js 에 updateDebugOverlay 함수가 정의되어 있어야 한다", () => {
    const src = readSnakeFile("game.js");
    assert.ok(
      src.includes("function updateDebugOverlay()"),
      "game.js 에 updateDebugOverlay() 함수가 없습니다",
    );
  });

  test("game.js 에 toggleDebugOverlay 함수가 정의되어 있어야 한다", () => {
    const src = readSnakeFile("game.js");
    assert.ok(
      src.includes("function toggleDebugOverlay()"),
      "game.js 에 toggleDebugOverlay() 함수가 없습니다",
    );
  });

  test("game.js 에 getDebugInfo 함수가 SnakeRenderer 에 노출되어 있어야 한다", () => {
    const src = readSnakeFile("game.js");
    // return { init, resize, renderFrame, destroy, getDebugInfo }
    const retMatch = src.match(/return\s*\{[^}]*getDebugInfo[^}]*\}/);
    assert.ok(retMatch, "SnakeRenderer 의 return 에 getDebugInfo 가 없습니다");
  });
});

// ─────────────────────────────────────────────────────────────
// AC3: 오버레이 기본값 off — hidden 속성 존재
// ─────────────────────────────────────────────────────────────
describe("AC3 — debug 오버레이 기본 off", () => {
  test("index.html 의 #debug-overlay 에 hidden 속성이 있어야 한다", () => {
    const html = readSnakeFile("index.html");
    // <div id="debug-overlay" hidden ...> 패턴 검색
    const match = html.match(/id="debug-overlay"[^>]*>/);
    assert.ok(match, "index.html 에 id=\"debug-overlay\" 요소를 파싱할 수 없습니다");
    assert.ok(
      match[0].includes("hidden"),
      "#debug-overlay 요소에 hidden 속성이 없습니다 (기본 off 조건 미충족)",
    );
  });

  test("game.js 의 _debugVisible 초기값이 false 여야 한다", () => {
    const src = readSnakeFile("game.js");
    assert.ok(
      src.includes("let _debugVisible = false;"),
      "game.js 에 `let _debugVisible = false;` 선언이 없습니다",
    );
  });

  test("updateDebugOverlay() 가 _debugVisible false 일 때 early return 해야 한다", () => {
    const src = readSnakeFile("game.js");
    const fnStart = src.indexOf("function updateDebugOverlay()");
    assert.ok(fnStart >= 0, "updateDebugOverlay() 함수를 찾을 수 없습니다");
    const fnBody = src.slice(fnStart, fnStart + 400);
    // if (!_debugVisible) return; 패턴
    assert.ok(
      fnBody.includes("if (!_debugVisible) return;"),
      "updateDebugOverlay() 에 early-return 가드가 없습니다 (렌더 비용 발생 위험)",
    );
  });
});

// ─────────────────────────────────────────────────────────────
// AC4: 단일 PixiJS 렌더 경로
// ─────────────────────────────────────────────────────────────
describe("AC4 — 단일 PixiJS 렌더 경로 보장", () => {
  test("game.js 에 drawFood 함수 정의가 없어야 한다", () => {
    const src = readSnakeFile("game.js");
    // "function drawFood(" 패턴 검색
    assert.ok(
      !src.includes("function drawFood("),
      "game.js 에 drawFood() Canvas 2D 함수가 남아 있습니다",
    );
  });

  test("game.js 에 drawBackground 함수 정의가 없어야 한다", () => {
    const src = readSnakeFile("game.js");
    assert.ok(
      !src.includes("function drawBackground("),
      "game.js 에 drawBackground() Canvas 2D 함수가 남아 있습니다",
    );
  });

  test("game.js 에 drawSnake 함수 정의가 없어야 한다", () => {
    const src = readSnakeFile("game.js");
    assert.ok(
      !src.includes("function drawSnake("),
      "game.js 에 drawSnake() Canvas 2D 함수가 남아 있습니다",
    );
  });

  test("SnakeRenderer 가 getDebugInfo 를 통해 렌더러 타입을 반환해야 한다", () => {
    const src = readSnakeFile("game.js");
    // getDebugInfo 내부에 rendererType 할당
    const fnStart = src.indexOf("function getDebugInfo()");
    assert.ok(fnStart >= 0, "getDebugInfo() 함수를 찾을 수 없습니다");
    const fnBody = src.slice(fnStart, fnStart + 600);
    assert.ok(
      fnBody.includes("rendererType"),
      "getDebugInfo() 가 rendererType 을 반환하지 않습니다",
    );
    assert.ok(
      fnBody.includes("WebGL") || fnBody.includes("renderer.type"),
      "getDebugInfo() 가 WebGL/WebGPU/Canvas 판별 로직을 포함하지 않습니다",
    );
  });

  test("game.js 에 updateDebugOverlay 호출이 render() 내에 있어야 한다", () => {
    const src = readSnakeFile("game.js");
    const renderStart = src.indexOf("function render()");
    assert.ok(renderStart >= 0, "render() 함수를 찾을 수 없습니다");
    const nextFn = src.indexOf("\nfunction ", renderStart + 1);
    const renderBody = nextFn >= 0 ? src.slice(renderStart, nextFn) : src.slice(renderStart, renderStart + 2000);
    assert.ok(
      renderBody.includes("updateDebugOverlay()"),
      "render() 내에 updateDebugOverlay() 호출이 없습니다",
    );
  });
});
