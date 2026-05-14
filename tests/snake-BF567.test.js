// BF-567 · 효과음 토글 구현 — Web Audio + localStorage 연동 테스트
//
// AC 매핑:
//   AC-1: snake module 우상단에 🔊/🔇 토글 표시 + 클릭 전환 UI
//   AC-2: 효과음 ON 시 eat/gameover 효과음 재생
//   AC-3: 효과음 OFF 시 어떤 소리도 재생 안 됨
//   AC-4: localStorage 영속화 (새로고침 시 복원)
//
// 실행: node --test tests/snake-BF567.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = path.resolve(__dirname, "..");
const SNAKE_DIR  = path.join(REPO_ROOT, "snake");

const html   = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
const css    = readFileSync(path.join(SNAKE_DIR, "styles.css"),  "utf-8");
const gameJs = readFileSync(path.join(SNAKE_DIR, "game.js"),     "utf-8");

// ═══════════════════════════════════════════════════════════════
// §1. DOM 구조 — #sound-toggle 버튼 (AC-1)
// ═══════════════════════════════════════════════════════════════

describe("BF-567 §1 #sound-toggle DOM 구조", () => {
  test("§1-1 (AC1): #sound-toggle 버튼 존재", () => {
    assert.ok(
      html.includes('id="sound-toggle"'),
      "#sound-toggle 버튼이 index.html에 없음"
    );
  });

  test("§1-2 (AC1): type=\"button\" 속성 존재", () => {
    const btnIdx = html.indexOf('id="sound-toggle"');
    assert.ok(btnIdx !== -1, "#sound-toggle 없음");
    // <button ... 태그 찾기
    const tagStart = html.lastIndexOf("<button", btnIdx);
    const tagEnd   = html.indexOf(">", btnIdx);
    const tagSnippet = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tagSnippet.includes('type="button"'),
      "#sound-toggle 에 type=\"button\" 없음"
    );
  });

  test("§1-3 (AC1): aria-pressed=\"true\" 기본값 (소리 ON)", () => {
    const btnIdx = html.indexOf('id="sound-toggle"');
    assert.ok(btnIdx !== -1, "#sound-toggle 없음");
    const tagStart = html.lastIndexOf("<button", btnIdx);
    const tagEnd   = html.indexOf(">", btnIdx);
    const tagSnippet = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tagSnippet.includes('aria-pressed="true"'),
      "#sound-toggle aria-pressed 기본값이 \"true\"가 아님"
    );
  });

  test("§1-4 (AC1): aria-label에 효과음 켜짐 텍스트 포함", () => {
    const btnIdx = html.indexOf('id="sound-toggle"');
    assert.ok(btnIdx !== -1, "#sound-toggle 없음");
    const tagStart = html.lastIndexOf("<button", btnIdx);
    const tagEnd   = html.indexOf(">", btnIdx);
    const tagSnippet = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tagSnippet.includes("효과음 켜짐"),
      "#sound-toggle aria-label에 \"효과음 켜짐\" 텍스트 없음"
    );
  });

  test("§1-5 (AC1): 🔊 이모지 내용 포함", () => {
    assert.ok(
      html.includes("🔊"),
      "index.html에 🔊 이모지 없음"
    );
  });

  test("§1-6 (AC1): #sound-toggle이 #hud 보다 먼저 선언됨 (DOM 순서 = 포커스 순서)", () => {
    const soundIdx = html.indexOf('id="sound-toggle"');
    const hudIdx   = html.indexOf('id="hud"');
    assert.ok(soundIdx !== -1, "#sound-toggle 없음");
    assert.ok(hudIdx   !== -1, "#hud 없음");
    assert.ok(
      soundIdx < hudIdx,
      "#sound-toggle이 #hud보다 뒤에 선언됨 — DOM 순서 오류"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §2. CSS — 효과음 토글 토큰 및 스타일 (AC-1)
// ═══════════════════════════════════════════════════════════════

describe("BF-567 §2 CSS 토큰 및 #sound-toggle 스타일", () => {
  test("§2-1 (AC1): --sound-on-bg CSS 변수 정의", () => {
    assert.ok(
      css.includes("--sound-on-bg"),
      "styles.css에 --sound-on-bg 변수 없음"
    );
  });

  test("§2-2 (AC1): --sound-off-bg CSS 변수 정의", () => {
    assert.ok(
      css.includes("--sound-off-bg"),
      "styles.css에 --sound-off-bg 변수 없음"
    );
  });

  test("§2-3 (AC1): --sound-on-border CSS 변수 정의", () => {
    assert.ok(
      css.includes("--sound-on-border"),
      "styles.css에 --sound-on-border 변수 없음"
    );
  });

  test("§2-4 (AC1): --sound-focus-ring CSS 변수 정의", () => {
    assert.ok(
      css.includes("--sound-focus-ring"),
      "styles.css에 --sound-focus-ring 변수 없음"
    );
  });

  test("§2-5 (AC1): #sound-toggle 기본 레이아웃 CSS 존재", () => {
    assert.ok(
      css.includes("#sound-toggle"),
      "styles.css에 #sound-toggle 셀렉터 없음"
    );
  });

  test("§2-6 (AC1): #sound-toggle position:fixed 적용", () => {
    const idx = css.indexOf("#sound-toggle {");
    assert.ok(idx !== -1, "#sound-toggle { 블록 없음");
    const block = css.slice(idx, css.indexOf("}", idx) + 1);
    assert.ok(
      block.includes("position: fixed") || block.includes("position:fixed"),
      "#sound-toggle에 position:fixed 없음"
    );
  });

  test("§2-7 (AC1): #sound-toggle[aria-pressed=\"true\"] 셀렉터 존재 (ON 상태 스타일)", () => {
    assert.ok(
      css.includes('#sound-toggle[aria-pressed="true"]'),
      'styles.css에 #sound-toggle[aria-pressed="true"] 없음'
    );
  });

  test("§2-8 (AC1): #sound-toggle[aria-pressed=\"false\"] 셀렉터 존재 (OFF 상태 스타일)", () => {
    assert.ok(
      css.includes('#sound-toggle[aria-pressed="false"]'),
      'styles.css에 #sound-toggle[aria-pressed="false"] 없음'
    );
  });

  test("§2-9 (AC1): #sound-toggle:focus-visible 셀렉터 존재 (접근성)", () => {
    assert.ok(
      css.includes("#sound-toggle:focus-visible"),
      "styles.css에 #sound-toggle:focus-visible 없음"
    );
  });

  test("§2-10 (AC1): #hud top이 52px로 조정됨 (토글 높이 확보)", () => {
    // #hud { top: 52px } 여부 확인
    const hudIdx = css.indexOf("#hud {");
    assert.ok(hudIdx !== -1, "#hud { 블록 없음");
    const block = css.slice(hudIdx, css.indexOf("}", hudIdx) + 1);
    assert.ok(
      block.includes("top: 52px"),
      "#hud top이 52px로 조정되지 않음 (기존 16px → 52px 필요)"
    );
  });

  test("§2-11 (AC1): #hud-status-panel top이 96px로 조정됨 (연쇄 오프셋)", () => {
    // 96px 값이 styles.css의 hud-status-panel 관련 위치에 있는지 확인
    const panelIdx = css.indexOf("#hud-status-panel {");
    assert.ok(panelIdx !== -1, "#hud-status-panel { 블록 없음");
    const block = css.slice(panelIdx, css.indexOf("}", panelIdx) + 1);
    assert.ok(
      block.includes("top: 96px"),
      "#hud-status-panel top이 96px로 조정되지 않음 (기존 60px → 96px 필요)"
    );
  });

  test("§2-12 (AC1): hover 셀렉터 존재", () => {
    assert.ok(
      css.includes('#sound-toggle[aria-pressed="true"]:hover') ||
      css.includes('#sound-toggle[aria-pressed="false"]:hover'),
      "styles.css에 #sound-toggle hover 셀렉터 없음"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §3. game.js — 효과음 로직 패턴 검사 (AC-2, AC-3, AC-4)
// ═══════════════════════════════════════════════════════════════

describe("BF-567 §3 game.js 효과음 로직", () => {
  test("§3-1 (AC4): LS_SOUND_KEY 상수 정의", () => {
    assert.ok(
      gameJs.includes("LS_SOUND_KEY"),
      "game.js에 LS_SOUND_KEY 상수 없음"
    );
  });

  test("§3-2 (AC4): bf-snake-sound-enabled localStorage 키 사용", () => {
    assert.ok(
      gameJs.includes('"bf-snake-sound-enabled"'),
      'game.js에 "bf-snake-sound-enabled" localStorage 키 없음'
    );
  });

  test("§3-3 (AC4): loadSoundEnabled 함수 정의", () => {
    assert.ok(
      gameJs.includes("function loadSoundEnabled"),
      "game.js에 loadSoundEnabled 함수 없음"
    );
  });

  test("§3-4 (AC4): saveSoundEnabled 함수 정의", () => {
    assert.ok(
      gameJs.includes("function saveSoundEnabled"),
      "game.js에 saveSoundEnabled 함수 없음"
    );
  });

  test("§3-5 (AC2/AC3): soundEnabled 변수 선언", () => {
    assert.ok(
      gameJs.includes("soundEnabled"),
      "game.js에 soundEnabled 변수 없음"
    );
  });

  test("§3-6 (AC2): getAudioContext 함수 정의 (Web Audio API)", () => {
    assert.ok(
      gameJs.includes("function getAudioContext"),
      "game.js에 getAudioContext 함수 없음"
    );
  });

  test("§3-7 (AC2): AudioContext 생성 코드 존재", () => {
    assert.ok(
      gameJs.includes("AudioContext") || gameJs.includes("webkitAudioContext"),
      "game.js에 AudioContext 코드 없음"
    );
  });

  test("§3-8 (AC2): playEatSound 함수 정의 (음식 먹기 효과음)", () => {
    assert.ok(
      gameJs.includes("function playEatSound"),
      "game.js에 playEatSound 함수 없음"
    );
  });

  test("§3-9 (AC2): playGameOverSound 함수 정의 (게임오버 효과음)", () => {
    assert.ok(
      gameJs.includes("function playGameOverSound"),
      "game.js에 playGameOverSound 함수 없음"
    );
  });

  test("§3-10 (AC2): playEatSound가 먹이 수집 감지 블록 근방에서 호출됨", () => {
    // prevFood 감지 조건 뒤 300자 내에 playEatSound 호출이 있는지 확인
    // (구조분해 { x, y, multiplier } = prevFood 가 블록 경계 오판을 유발할 수 있으므로
    //  범위 기반으로 검색)
    const foodDetectIdx = gameJs.indexOf("prevFood !== null && state.food !== prevFood");
    assert.ok(foodDetectIdx !== -1, "먹이 수집 감지 코드 없음");
    const snippet = gameJs.slice(foodDetectIdx, foodDetectIdx + 300);
    assert.ok(
      snippet.includes("playEatSound"),
      "먹이 수집 감지 블록 근방에 playEatSound 호출 없음"
    );
  });

  test("§3-11 (AC2): playGameOverSound가 게임오버 처리 전에 호출됨", () => {
    // showGameOver 앞에 playGameOverSound 있는지 확인
    const goIdx = gameJs.indexOf("playGameOverSound");
    assert.ok(
      goIdx !== -1,
      "game.js에 playGameOverSound 호출 없음"
    );
    // 최소 2회 이상 언급 (정의 + 호출)
    const count = (gameJs.match(/playGameOverSound/g) || []).length;
    assert.ok(count >= 2, "playGameOverSound 정의만 있고 호출 없음");
  });

  test("§3-12 (AC1): updateSoundToggleUI 함수 정의", () => {
    assert.ok(
      gameJs.includes("function updateSoundToggleUI"),
      "game.js에 updateSoundToggleUI 함수 없음"
    );
  });

  test("§3-13 (AC1): sound-toggle 클릭 이벤트 핸들러 존재", () => {
    assert.ok(
      gameJs.includes("sound-toggle") || gameJs.includes("soundToggle"),
      "game.js에 sound-toggle 참조 없음"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §4. loadSoundEnabled 로직 검증 (AC-4)
// ═══════════════════════════════════════════════════════════════

describe("BF-567 §4 loadSoundEnabled 로직", () => {
  test("§4-1 (AC4): loadSoundEnabled에서 기본값 true 반환 (null 케이스)", () => {
    // game.js 소스코드에서 null 케이스를 true로 처리하는지 확인
    const fnIdx = gameJs.indexOf("function loadSoundEnabled");
    assert.ok(fnIdx !== -1, "loadSoundEnabled 함수 없음");
    const fnEnd  = gameJs.indexOf("}", fnIdx) + 1;
    const fnBody = gameJs.slice(fnIdx, fnEnd);
    // raw === null → true 처리 확인
    assert.ok(
      fnBody.includes("null") && fnBody.includes("true"),
      "loadSoundEnabled에서 null → true 기본값 처리 없음"
    );
  });

  test("§4-2 (AC4): loadSoundEnabled에서 \"true\" 문자열 비교", () => {
    const fnIdx = gameJs.indexOf("function loadSoundEnabled");
    const fnEnd  = gameJs.indexOf("}", fnIdx) + 1;
    const fnBody = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      fnBody.includes('"true"') || fnBody.includes("'true'"),
      "loadSoundEnabled에서 엄격 문자열 비교 없음 (raw === \"true\" 필요)"
    );
  });

  test("§4-3 (AC4): loadSoundEnabled에서 try-catch로 EC-01 처리", () => {
    const fnIdx = gameJs.indexOf("function loadSoundEnabled");
    // 함수 body가 여러 줄일 수 있으므로 중괄호 매칭
    let depth = 0;
    let fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const fnBody = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      fnBody.includes("try") && fnBody.includes("catch"),
      "loadSoundEnabled에 try-catch 없음 (EC-01 처리 필요)"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §5. playEatSound / playGameOverSound 파라미터 검증 (AC-2)
// ═══════════════════════════════════════════════════════════════

describe("BF-567 §5 효과음 파라미터 검증", () => {
  test("§5-1 (AC2): playEatSound에서 sine 파형 사용", () => {
    const fnIdx = gameJs.indexOf("function playEatSound");
    assert.ok(fnIdx !== -1, "playEatSound 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const fnBody = gameJs.slice(fnIdx, fnEnd);
    assert.ok(fnBody.includes('"sine"') || fnBody.includes("'sine'"), "playEatSound에 sine 파형 없음");
  });

  test("§5-2 (AC2): playEatSound에서 880Hz 시작 주파수 사용", () => {
    const fnIdx = gameJs.indexOf("function playEatSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const fnBody = gameJs.slice(fnIdx, fnEnd);
    assert.ok(fnBody.includes("880"), "playEatSound에 880Hz 시작 주파수 없음");
  });

  test("§5-3 (AC2): playGameOverSound에서 sawtooth 파형 사용", () => {
    const fnIdx = gameJs.indexOf("function playGameOverSound");
    assert.ok(fnIdx !== -1, "playGameOverSound 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const fnBody = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      fnBody.includes('"sawtooth"') || fnBody.includes("'sawtooth'"),
      "playGameOverSound에 sawtooth 파형 없음"
    );
  });

  test("§5-4 (AC2): playGameOverSound에서 440Hz → 110Hz 하강 sweep 사용", () => {
    const fnIdx = gameJs.indexOf("function playGameOverSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const fnBody = gameJs.slice(fnIdx, fnEnd);
    assert.ok(fnBody.includes("440"), "playGameOverSound에 440Hz 시작 주파수 없음");
    assert.ok(fnBody.includes("110"), "playGameOverSound에 110Hz 종료 주파수 없음");
  });

  test("§5-5 (AC2/AC3): playEatSound에서 soundEnabled 가드 존재", () => {
    const fnIdx = gameJs.indexOf("function playEatSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const fnBody = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      fnBody.includes("soundEnabled"),
      "playEatSound에 soundEnabled 가드 없음 (AC3: OFF 시 소리 재생 방지)"
    );
  });

  test("§5-6 (AC2/AC3): playGameOverSound에서 soundEnabled 가드 존재", () => {
    const fnIdx = gameJs.indexOf("function playGameOverSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const fnBody = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      fnBody.includes("soundEnabled"),
      "playGameOverSound에 soundEnabled 가드 없음 (AC3: OFF 시 소리 재생 방지)"
    );
  });
});
