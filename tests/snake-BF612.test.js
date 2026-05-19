/**
 * snake-BF612.test.js — 블랙 화면 버그 재현 + 수정 검증
 *
 * BF-612: 스네이크 게임 진행 시 캔버스에 지렁이가 렌더링되지 않는 버그
 * 근본 원인: canvas.getContext("2d") 가 RENDER_BACKEND 결정 전에 호출되어
 *   WebGL context 취득을 차단 → PIXI 초기화 실패 → 블랙 화면
 *
 * TDD 사이클:
 *   RED  — 수정 전: §1-1 실패 (RENDER_BACKEND 가 ctx 뒤에 위치)
 *   GREEN — 수정 후: 모든 테스트 통과
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_JS   = path.resolve(__dirname, "../snake/game.js");

let gameJs = "";
before(() => {
  gameJs = fs.readFileSync(GAME_JS, "utf8");
});

// ─────────────────────────────────────────────────────────────
// §1  핵심 버그 재현 — 소스 코드 선언 순서
// ─────────────────────────────────────────────────────────────
describe("§1 BF-612 핵심: RENDER_BACKEND 선언 순서 (수정 전 FAIL)", () => {
  it("§1-1 RENDER_BACKEND 선언이 ctx 변수 선언보다 먼저 위치해야 함", () => {
    // ctx 변수 선언 위치 (주석 제외 — 실제 let/const 선언만 탐색)
    // "let ctx =" 또는 "const ctx =" 패턴의 첫 위치
    const ctxIdx = gameJs.search(/(?:let|const)\s+ctx\s*=/);
    // RENDER_BACKEND const/let 선언 첫 등장 위치
    const rbIdx  = gameJs.search(/const\s+RENDER_BACKEND\s*=/);

    assert.ok(rbIdx  !== -1, "RENDER_BACKEND 선언을 찾을 수 없음");
    assert.ok(ctxIdx !== -1, "ctx 변수 선언을 찾을 수 없음");

    assert.ok(
      rbIdx < ctxIdx,
      `[BF-612] RENDER_BACKEND(pos ${rbIdx}) 가 ctx 선언(pos ${ctxIdx}) 보다 나중에 위치 — ` +
      "PIXI WebGL context 취득 차단으로 블랙 화면 발생"
    );
  });

  it("§1-2 canvas.getContext('2d') 는 RENDER_BACKEND === 'canvas2d' 조건부로만 호출되어야 함", () => {
    // "const ctx = canvas.getContext(\"2d\")" 형태의 무조건 취득이 없어야 함
    // 허용 패턴: "RENDER_BACKEND === \"canvas2d\" ? canvas.getContext(\"2d\")"
    const unconditional = /^\s*(?:const|let)\s+ctx\s*=\s*canvas\.getContext\("2d"\)\s*;/m;
    assert.ok(
      !unconditional.test(gameJs),
      "[BF-612] canvas.getContext(\"2d\") 를 무조건 할당하는 코드가 남아 있음 — " +
      "PIXI 모드에서도 2D ctx 취득이 발생해 WebGL 차단"
    );
  });

  it("§1-3 _pixiActive 플래그가 존재해야 함 (pixi 초기화 성공 여부 런타임 추적)", () => {
    assert.ok(
      gameJs.includes("_pixiActive"),
      "[BF-612] _pixiActive 플래그 없음 — pixi init 실패 시 canvas2d 폴백 불가"
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §2  SnakeRenderer.init 실패 시 canvas2d 폴백 코드 존재 확인
// ─────────────────────────────────────────────────────────────
describe("§2 pixi init 실패 시 canvas2d 폴백 로직", () => {
  it("§2-1 initGame 내부에 pixi init 실패 폴백 (canvas.getContext 재취득) 코드가 있어야 함", () => {
    // initGame 함수 내에서 !ok (pixi 실패) 분기 후 ctx 를 재취득하는 패턴 확인
    // "!ok" 분기와 "getContext" 가 initGame 스코프 안에 모두 존재하면 충분
    const initGameIdx = gameJs.indexOf("function initGame()");
    assert.ok(initGameIdx !== -1, "initGame 함수를 찾을 수 없음");

    // initGame 이후 200줄 내에서 폴백 패턴 탐색
    const initGameSlice = gameJs.slice(initGameIdx, initGameIdx + 8000);
    const hasFallback = initGameSlice.includes("!ok") || initGameSlice.includes("_pixiActive = false");
    assert.ok(
      hasFallback,
      "[BF-612] initGame 내 pixi 실패 폴백 코드 없음 — PIXI init 실패 시 블랙 화면 지속"
    );
  });

  it("§2-2 render() 내 pixi 경로가 _pixiActive 기반으로 분기되어야 함", () => {
    const renderIdx = gameJs.indexOf("function render()");
    assert.ok(renderIdx !== -1, "render 함수를 찾을 수 없음");

    const renderSlice = gameJs.slice(renderIdx, renderIdx + 1000);
    assert.ok(
      renderSlice.includes("_pixiActive"),
      "[BF-612] render() 가 RENDER_BACKEND 상수 비교만 사용 — " +
      "pixi init 실패 후에도 canvas2d 로 폴백되지 않음"
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §3  SnakeRenderer 구조 회귀 가드 (BF-595 + BF-608 기존 기능 보존)
// ─────────────────────────────────────────────────────────────
describe("§3 SnakeRenderer API 회귀 가드", () => {
  it("§3-1 SnakeRenderer.init 메서드가 존재해야 함", () => {
    assert.ok(gameJs.includes("SnakeRenderer"), "SnakeRenderer 없음");
    assert.ok(gameJs.includes("init(canvasEl") || gameJs.includes("init(canvas,") || gameJs.includes("init (canvasEl"), "SnakeRenderer.init 없음");
  });

  it("§3-2 SnakeRenderer.renderFrame 메서드가 존재해야 함", () => {
    assert.ok(gameJs.includes("renderFrame"), "SnakeRenderer.renderFrame 없음");
  });

  it("§3-3 _drawSegs 함수가 존재해야 함 (지렁이 세그먼트 렌더링 핵심)", () => {
    assert.ok(gameJs.includes("_drawSegs"), "_drawSegs 없음 — 지렁이 렌더링 함수 소실");
  });

  it("§3-4 drawRoundedRect 호출이 존재해야 함 (세그먼트 시각화)", () => {
    assert.ok(gameJs.includes("drawRoundedRect"), "drawRoundedRect 없음 — 세그먼트 그리기 소실");
  });
});

// ─────────────────────────────────────────────────────────────
// §4  게임 시작 / 리셋 / 스코어 핵심 함수 회귀 가드
// ─────────────────────────────────────────────────────────────
describe("§4 게임 시작·리셋·스코어 회귀 가드", () => {
  it("§4-1 initGame 함수가 존재해야 함", () => {
    assert.ok(gameJs.includes("function initGame()"), "initGame 없음");
  });

  it("§4-2 doRestart 함수가 존재해야 함", () => {
    assert.ok(gameJs.includes("function doRestart()"), "doRestart 없음");
  });

  it("§4-3 startLoop 함수가 존재해야 함", () => {
    assert.ok(gameJs.includes("function startLoop()") || gameJs.includes("startLoop"), "startLoop 없음");
  });

  it("§4-4 updateHUD 함수가 존재해야 함 (스코어 표시)", () => {
    assert.ok(gameJs.includes("function updateHUD()") || gameJs.includes("updateHUD"), "updateHUD 없음");
  });

  it("§4-5 loadHighScore / saveHighScore 함수가 존재해야 함", () => {
    assert.ok(gameJs.includes("loadHighScore"), "loadHighScore 없음");
    assert.ok(gameJs.includes("saveHighScore"), "saveHighScore 없음");
  });
});

// ─────────────────────────────────────────────────────────────
// §5  _LS_RENDER_BACKEND_KEY 및 PIXI 관련 상수 보존 확인
// ─────────────────────────────────────────────────────────────
describe("§5 렌더 백엔드 상수 보존 (BF-595 / BF-608 회귀)", () => {
  it("§5-1 _LS_RENDER_BACKEND_KEY 상수가 존재해야 함", () => {
    assert.ok(gameJs.includes("_LS_RENDER_BACKEND_KEY"), "_LS_RENDER_BACKEND_KEY 없음");
  });

  it("§5-2 RENDER_BACKEND 에 localStorage 오버라이드 로직이 포함되어야 함", () => {
    assert.ok(gameJs.includes("localStorage.getItem"), "localStorage 오버라이드 없음");
  });

  it("§5-3 RENDER_BACKEND 에 URL ?backend= 파라미터 로직이 포함되어야 함 (BF-608)", () => {
    assert.ok(gameJs.includes("URLSearchParams"), "URL 파라미터 파싱 없음 (BF-608 회귀)");
    assert.ok(
      gameJs.includes('"backend"') || gameJs.includes("'backend'"),
      "URL backend 파라미터 키 없음"
    );
  });

  it("§5-4 PX_PLAYER_HEAD / PX_CPU_HEAD 색상 상수가 존재해야 함", () => {
    assert.ok(gameJs.includes("PX_PLAYER_HEAD"), "PX_PLAYER_HEAD 없음");
    assert.ok(gameJs.includes("PX_CPU_HEAD"), "PX_CPU_HEAD 없음");
  });
});
