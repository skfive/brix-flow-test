// BF-604 · 스네이크 사운드 음량 조절 (슬라이더 + GainNode + localStorage) 구현
//
// AC 매핑:
//   AC1: 설정 모달에 range 0~100·default 50·id/aria·data-key="soundVolume" 슬라이더
//   AC2: 슬라이더 값 변경 → 다음 효과음부터 GainNode 음량 즉시 반영
//   AC3: 음량 설정 후 새로고침 → localStorage 에서 복원
//   AC4: 음량 0 → 효과음 재생 skip (무음)
//
// 실행: node --test tests/snake-BF604.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = path.resolve(__dirname, "..");
const SNAKE_DIR  = path.join(REPO_ROOT, "snake");

const html   = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
const gameJs = readFileSync(path.join(SNAKE_DIR, "game.js"),    "utf-8");

// ───────────────────────────────────────────────────────────────
// §1. 설정 모달 UI — 음량 슬라이더 DOM (AC1)
// ───────────────────────────────────────────────────────────────

describe("BF-604 §1 설정 모달 음량 슬라이더 DOM 구조 (AC1)", () => {
  test("§1-1 (AC1): data-key=\"soundVolume\" range input 존재", () => {
    assert.ok(
      html.includes('data-key="soundVolume"'),
      'index.html 설정 모달에 data-key="soundVolume" range input 없음'
    );
  });

  test("§1-2 (AC1): 슬라이더 type=\"range\" 확인", () => {
    const keyIdx = html.indexOf('data-key="soundVolume"');
    assert.ok(keyIdx !== -1, 'data-key="soundVolume" 없음');
    const tagStart = html.lastIndexOf("<input", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes('type="range"'),
      '음량 슬라이더가 type="range" 아님'
    );
  });

  test("§1-3 (AC1): 슬라이더 min=\"0\" 확인", () => {
    const keyIdx = html.indexOf('data-key="soundVolume"');
    assert.ok(keyIdx !== -1, 'data-key="soundVolume" 없음');
    const tagStart = html.lastIndexOf("<input", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes('min="0"'),
      '음량 슬라이더에 min="0" 없음'
    );
  });

  test("§1-4 (AC1): 슬라이더 max=\"100\" 확인", () => {
    const keyIdx = html.indexOf('data-key="soundVolume"');
    assert.ok(keyIdx !== -1, 'data-key="soundVolume" 없음');
    const tagStart = html.lastIndexOf("<input", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes('max="100"'),
      '음량 슬라이더에 max="100" 없음'
    );
  });

  test("§1-5 (AC1): 슬라이더 step=\"1\" 확인", () => {
    const keyIdx = html.indexOf('data-key="soundVolume"');
    assert.ok(keyIdx !== -1, 'data-key="soundVolume" 없음');
    const tagStart = html.lastIndexOf("<input", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes('step="1"'),
      '음량 슬라이더에 step="1" 없음'
    );
  });

  test("§1-6 (AC1): 슬라이더 value=\"50\" (기본값) 확인", () => {
    const keyIdx = html.indexOf('data-key="soundVolume"');
    assert.ok(keyIdx !== -1, 'data-key="soundVolume" 없음');
    const tagStart = html.lastIndexOf("<input", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes('value="50"'),
      '음량 슬라이더 기본값이 50 아님'
    );
  });

  test("§1-7 (AC1): 슬라이더에 aria-label 속성 존재", () => {
    const keyIdx = html.indexOf('data-key="soundVolume"');
    assert.ok(keyIdx !== -1, 'data-key="soundVolume" 없음');
    const tagStart = html.lastIndexOf("<input", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes("aria-label"),
      '음량 슬라이더에 aria-label 없음'
    );
  });

  test("§1-8 (AC1): 슬라이더가 .ctrl-slider 컨테이너 안에 존재", () => {
    const keyIdx = html.indexOf('data-key="soundVolume"');
    assert.ok(keyIdx !== -1, 'data-key="soundVolume" 없음');
    // 슬라이더보다 앞쪽에 ctrl-slider div 존재 확인
    const snippetBefore = html.slice(Math.max(0, keyIdx - 200), keyIdx);
    assert.ok(
      snippetBefore.includes("ctrl-slider"),
      '음량 슬라이더가 .ctrl-slider 컨테이너 안에 없음'
    );
  });

  test("§1-9 (AC1): .ctrl-slider-value span 이 슬라이더 옆에 존재", () => {
    const keyIdx = html.indexOf('data-key="soundVolume"');
    assert.ok(keyIdx !== -1, 'data-key="soundVolume" 없음');
    const snippetAfter = html.slice(keyIdx, keyIdx + 200);
    assert.ok(
      snippetAfter.includes("ctrl-slider-value"),
      '음량 슬라이더 옆에 .ctrl-slider-value span 없음'
    );
  });

  test("§1-10 (AC1): 슬라이더가 효과음 섹션(settings-section) 안에 위치", () => {
    // 효과음 섹션 텍스트 이후에 soundVolume 슬라이더가 나타나야 함
    const soundSectionIdx = html.indexOf("효과음");
    const volSliderIdx    = html.indexOf('data-key="soundVolume"');
    assert.ok(soundSectionIdx !== -1, '효과음 섹션 텍스트 없음');
    assert.ok(volSliderIdx !== -1,    'soundVolume 슬라이더 없음');
    assert.ok(
      volSliderIdx > soundSectionIdx,
      '음량 슬라이더가 효과음 섹션 밖에 있음'
    );
  });
});

// ───────────────────────────────────────────────────────────────
// §2. game.js — localStorage 헬퍼 함수 (AC3)
// ───────────────────────────────────────────────────────────────

describe("BF-604 §2 game.js localStorage 헬퍼 (AC3)", () => {
  test("§2-1 (AC3): snake.settings.soundVolume localStorage 키 상수 존재", () => {
    assert.ok(
      gameJs.includes('"snake.settings.soundVolume"'),
      'game.js 에 "snake.settings.soundVolume" 키 없음'
    );
  });

  test("§2-2 (AC3): loadSoundVolume 함수 정의", () => {
    assert.ok(
      gameJs.includes("function loadSoundVolume"),
      "game.js 에 loadSoundVolume 함수 없음"
    );
  });

  test("§2-3 (AC3): saveSoundVolume 함수 정의", () => {
    assert.ok(
      gameJs.includes("function saveSoundVolume"),
      "game.js 에 saveSoundVolume 함수 없음"
    );
  });

  test("§2-4 (AC3): loadSoundVolume 기본값 50 (null 케이스)", () => {
    const fnIdx = gameJs.indexOf("function loadSoundVolume");
    assert.ok(fnIdx !== -1, "loadSoundVolume 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("null") && body.includes("50"),
      "loadSoundVolume 에서 null → 50 기본값 처리 없음"
    );
  });

  test("§2-5 (AC3): loadSoundVolume try-catch 존재 (private mode 대응)", () => {
    const fnIdx = gameJs.indexOf("function loadSoundVolume");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("try") && body.includes("catch"),
      "loadSoundVolume 에 try-catch 없음 (localStorage 예외 처리 필요)"
    );
  });

  test("§2-6 (AC3): saveSoundVolume 가 snake.settings.soundVolume 키에 저장", () => {
    const fnIdx = gameJs.indexOf("function saveSoundVolume");
    assert.ok(fnIdx !== -1, "saveSoundVolume 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("snake.settings.soundVolume") || body.includes("LS_SOUND_VOLUME_KEY"),
      "saveSoundVolume 가 올바른 키로 저장하지 않음"
    );
  });

  test("§2-7 (AC3): _soundVolume 모듈 변수 선언 존재", () => {
    assert.ok(
      gameJs.includes("_soundVolume"),
      "game.js 에 _soundVolume 변수 없음"
    );
  });

  test("§2-8 (AC3): _soundVolume 이 loadSoundVolume() 으로 초기화", () => {
    const idx = gameJs.indexOf("_soundVolume");
    assert.ok(idx !== -1, "_soundVolume 없음");
    // _soundVolume = loadSoundVolume() 패턴 확인
    const snippet = gameJs.slice(idx - 10, idx + 100);
    assert.ok(
      snippet.includes("loadSoundVolume"),
      "_soundVolume 이 loadSoundVolume() 으로 초기화되지 않음"
    );
  });
});

// ───────────────────────────────────────────────────────────────
// §3. game.js — playSound() GainNode 음량 반영 (AC2, AC4)
// ───────────────────────────────────────────────────────────────

describe("BF-604 §3 playSound() GainNode 음량 반영 (AC2, AC4)", () => {
  test("§3-1 (AC4): playSound 내부에서 _soundVolume === 0 이면 early return", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    assert.ok(fnIdx !== -1, "playSound 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    // _soundVolume === 0 또는 vol === 0 체크
    assert.ok(
      body.includes("_soundVolume") || body.includes("soundVolume"),
      "playSound 내부에서 음량 변수 참조 없음 (AC4: 음량 0 = 무음 불가)"
    );
  });

  test("§3-2 (AC4): playSound 내 음량 0 early return 코드 존재", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    // === 0 이면 return 패턴
    assert.ok(
      (body.includes("=== 0") && body.includes("return")) ||
      (body.includes("== 0")  && body.includes("return")),
      "playSound 내 음량 0 early return 없음 (AC4)"
    );
  });

  test("§3-3 (AC2): playSound 내 GainNode gain 값에 _soundVolume 스케일 적용", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    // _soundVolume / 100 또는 vol / 100 패턴
    assert.ok(
      body.includes("/ 100") || body.includes("/100"),
      "playSound 내 GainNode 에 음량 스케일(/ 100) 적용 없음 (AC2)"
    );
  });

  test("§3-4 (AC2): handleSliderInput 에서 soundVolume 분기 처리", () => {
    const fnIdx = gameJs.indexOf("function handleSliderInput");
    assert.ok(fnIdx !== -1, "handleSliderInput 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("soundVolume"),
      "handleSliderInput 에 soundVolume 분기 없음 (AC2)"
    );
  });

  test("§3-5 (AC2): handleSliderInput 에서 soundVolume 변경 시 _soundVolume 즉시 갱신", () => {
    const fnIdx = gameJs.indexOf("function handleSliderInput");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("_soundVolume"),
      "handleSliderInput 에서 _soundVolume 즉시 갱신 없음 (AC2: 즉시 반영 불가)"
    );
  });
});

// ───────────────────────────────────────────────────────────────
// §4. game.js — 설정 모달 저장/열기에 soundVolume 연동 (AC3)
// ───────────────────────────────────────────────────────────────

describe("BF-604 §4 설정 모달 soundVolume 연동 (AC3)", () => {
  test("§4-1 (AC3): saveSettingsModal 에서 saveSoundVolume 호출", () => {
    const fnIdx = gameJs.indexOf("function saveSettingsModal");
    assert.ok(fnIdx !== -1, "saveSettingsModal 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("saveSoundVolume") || body.includes("LS_SOUND_VOLUME_KEY"),
      "saveSettingsModal 에서 음량 저장 코드 없음 (AC3)"
    );
  });

  test("§4-2 (AC3): openSettingsModal 에서 soundVolume 복원 코드 존재", () => {
    const fnIdx = gameJs.indexOf("function openSettingsModal");
    assert.ok(fnIdx !== -1, "openSettingsModal 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("soundVolume"),
      "openSettingsModal 에서 soundVolume 복원 코드 없음 (AC3)"
    );
  });

  test("§4-3 (AC3): reflectDraftToControls 에서 soundVolume 슬라이더 반영", () => {
    const fnIdx = gameJs.indexOf("function reflectDraftToControls");
    assert.ok(fnIdx !== -1, "reflectDraftToControls 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("soundVolume"),
      "reflectDraftToControls 에서 soundVolume 슬라이더 반영 없음 (AC3)"
    );
  });

  test("§4-4 (AC3): saveSettingsModal 에서 _soundVolume 변수도 갱신 (즉시 반영 유지)", () => {
    const fnIdx = gameJs.indexOf("function saveSettingsModal");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("_soundVolume"),
      "saveSettingsModal 에서 _soundVolume 갱신 없음"
    );
  });
});

// ───────────────────────────────────────────────────────────────
// §5. file:// 환경 안전성 — console.error/CORS 회피 (CLAUDE.md 함정 4)
// ───────────────────────────────────────────────────────────────

describe("BF-604 §5 file:// 환경 안전성", () => {
  test("§5-1: 새 localStorage 함수에 fetch/XMLHttpRequest 사용 없음", () => {
    const fnStart1 = gameJs.indexOf("function loadSoundVolume");
    const fnStart2 = gameJs.indexOf("function saveSoundVolume");
    assert.ok(fnStart1 !== -1, "loadSoundVolume 없음");
    assert.ok(fnStart2 !== -1, "saveSoundVolume 없음");

    // 두 함수 본문 추출
    const extractFn = (start) => {
      let depth = 0, end = start;
      for (let i = start; i < gameJs.length; i++) {
        if (gameJs[i] === "{") depth++;
        else if (gameJs[i] === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
      }
      return gameJs.slice(start, end);
    };

    const body1 = extractFn(fnStart1);
    const body2 = extractFn(fnStart2);
    const combined = body1 + body2;

    assert.ok(
      !combined.includes("fetch(") && !combined.includes("XMLHttpRequest"),
      "음량 헬퍼 함수에 fetch/XHR 포함 — file:// 에서 CORS 오류 발생"
    );
  });

  test("§5-2: 음량 슬라이더 HTML 에 src/href 외부 URL 없음", () => {
    const keyIdx = html.indexOf('data-key="soundVolume"');
    assert.ok(keyIdx !== -1, 'data-key="soundVolume" 없음');
    // 슬라이더 주변 500자
    const snippet = html.slice(Math.max(0, keyIdx - 300), keyIdx + 300);
    assert.ok(
      !snippet.includes("http://") && !snippet.includes("https://"),
      "음량 슬라이더 주변에 외부 URL — file:// CORS 위험"
    );
  });
});
