// BF-614 · snake 사운드 피치(음역) 옵션 구현 — 설정 모달 슬라이더 + playSound 적용
//
// AC 매핑:
//   AC1: 설정 모달에 range min=0.5 max=2.0 step=0.1 default=1.0, data-key/ctrl-slider-value 동기
//   AC2: 슬라이더 값 변경 후 다음 playSound() → osc.frequency 에 피치 배수 곱 반영
//   AC3: 피치 변경 저장 후 새로고침 → snake.settings.soundPitch localStorage 복원
//   AC4: 음량 0 또는 사운드 off → 피치 값과 무관하게 무음 (BF-602/603 회귀 가드)
//   AC5: 음량 슬라이더(BF-604)와 피치가 서로 독립 동작
//   AC6: 외부 의존성 추가 없이 console.error 0건
//
// 실행: node --test tests/snake-BF614.test.js

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
// §1. 설정 모달 UI — 피치 슬라이더 DOM (AC1)
// ───────────────────────────────────────────────────────────────

describe("BF-614 §1 설정 모달 피치 슬라이더 DOM 구조 (AC1)", () => {
  test("§1-1 (AC1): data-key=\"soundPitch\" range input 존재", () => {
    assert.ok(
      html.includes('data-key="soundPitch"'),
      'index.html 설정 모달에 data-key="soundPitch" range input 없음'
    );
  });

  test("§1-2 (AC1): 슬라이더 type=\"range\" 확인", () => {
    const keyIdx = html.indexOf('data-key="soundPitch"');
    assert.ok(keyIdx !== -1, 'data-key="soundPitch" 없음');
    const tagStart = html.lastIndexOf("<input", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes('type="range"'),
      '피치 슬라이더가 type="range" 아님'
    );
  });

  test("§1-3 (AC1): 슬라이더 min=\"0.5\" 확인", () => {
    const keyIdx = html.indexOf('data-key="soundPitch"');
    assert.ok(keyIdx !== -1, 'data-key="soundPitch" 없음');
    const tagStart = html.lastIndexOf("<input", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes('min="0.5"'),
      '피치 슬라이더에 min="0.5" 없음'
    );
  });

  test("§1-4 (AC1): 슬라이더 max=\"2.0\" 확인", () => {
    const keyIdx = html.indexOf('data-key="soundPitch"');
    assert.ok(keyIdx !== -1, 'data-key="soundPitch" 없음');
    const tagStart = html.lastIndexOf("<input", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes('max="2.0"'),
      '피치 슬라이더에 max="2.0" 없음'
    );
  });

  test("§1-5 (AC1): 슬라이더 step=\"0.1\" 확인", () => {
    const keyIdx = html.indexOf('data-key="soundPitch"');
    assert.ok(keyIdx !== -1, 'data-key="soundPitch" 없음');
    const tagStart = html.lastIndexOf("<input", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes('step="0.1"'),
      '피치 슬라이더에 step="0.1" 없음'
    );
  });

  test("§1-6 (AC1): 슬라이더 value=\"1.0\" (기본값) 확인", () => {
    const keyIdx = html.indexOf('data-key="soundPitch"');
    assert.ok(keyIdx !== -1, 'data-key="soundPitch" 없음');
    const tagStart = html.lastIndexOf("<input", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes('value="1.0"'),
      '피치 슬라이더 기본값이 1.0 아님'
    );
  });

  test("§1-7 (AC1): 슬라이더에 aria-label 속성 존재", () => {
    const keyIdx = html.indexOf('data-key="soundPitch"');
    assert.ok(keyIdx !== -1, 'data-key="soundPitch" 없음');
    const tagStart = html.lastIndexOf("<input", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes("aria-label"),
      '피치 슬라이더에 aria-label 없음'
    );
  });

  test("§1-8 (AC1): 슬라이더가 .ctrl-slider 컨테이너 안에 존재", () => {
    const keyIdx = html.indexOf('data-key="soundPitch"');
    assert.ok(keyIdx !== -1, 'data-key="soundPitch" 없음');
    const snippetBefore = html.slice(Math.max(0, keyIdx - 200), keyIdx);
    assert.ok(
      snippetBefore.includes("ctrl-slider"),
      '피치 슬라이더가 .ctrl-slider 컨테이너 안에 없음'
    );
  });

  test("§1-9 (AC1): .ctrl-slider-value span 이 슬라이더 옆에 존재", () => {
    const keyIdx = html.indexOf('data-key="soundPitch"');
    assert.ok(keyIdx !== -1, 'data-key="soundPitch" 없음');
    const snippetAfter = html.slice(keyIdx, keyIdx + 200);
    assert.ok(
      snippetAfter.includes("ctrl-slider-value"),
      '피치 슬라이더 옆에 .ctrl-slider-value span 없음'
    );
  });

  test("§1-10 (AC1): 피치 슬라이더가 효과음 섹션 안에, 음량 슬라이더 이후에 위치", () => {
    const volSliderIdx   = html.indexOf('data-key="soundVolume"');
    const pitchSliderIdx = html.indexOf('data-key="soundPitch"');
    assert.ok(volSliderIdx   !== -1, 'soundVolume 슬라이더 없음');
    assert.ok(pitchSliderIdx !== -1, 'soundPitch 슬라이더 없음');
    assert.ok(
      pitchSliderIdx > volSliderIdx,
      '피치 슬라이더가 음량 슬라이더보다 앞에 있음'
    );
    // 같은 효과음 섹션 내에 있어야 함 (효과음 텍스트 이후)
    const soundSectionIdx = html.indexOf("효과음");
    assert.ok(soundSectionIdx !== -1, '효과음 섹션 텍스트 없음');
    assert.ok(
      pitchSliderIdx > soundSectionIdx,
      '피치 슬라이더가 효과음 섹션 밖에 있음'
    );
  });
});

// ───────────────────────────────────────────────────────────────
// §2. game.js — localStorage 헬퍼 함수 (AC3)
// ───────────────────────────────────────────────────────────────

describe("BF-614 §2 game.js localStorage 헬퍼 (AC3)", () => {
  test("§2-1 (AC3): snake.settings.soundPitch localStorage 키 상수 존재", () => {
    assert.ok(
      gameJs.includes('"snake.settings.soundPitch"'),
      'game.js 에 "snake.settings.soundPitch" 키 없음'
    );
  });

  test("§2-2 (AC3): loadSoundPitch 함수 정의", () => {
    assert.ok(
      gameJs.includes("function loadSoundPitch"),
      "game.js 에 loadSoundPitch 함수 없음"
    );
  });

  test("§2-3 (AC3): saveSoundPitch 함수 정의", () => {
    assert.ok(
      gameJs.includes("function saveSoundPitch"),
      "game.js 에 saveSoundPitch 함수 없음"
    );
  });

  test("§2-4 (AC3): loadSoundPitch 기본값 1.0 (null 케이스)", () => {
    const fnIdx = gameJs.indexOf("function loadSoundPitch");
    assert.ok(fnIdx !== -1, "loadSoundPitch 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("null") && (body.includes("1.0") || body.includes("1,")),
      "loadSoundPitch 에서 null → 1.0 기본값 처리 없음"
    );
  });

  test("§2-5 (AC3): loadSoundPitch try-catch 존재 (private mode 대응)", () => {
    const fnIdx = gameJs.indexOf("function loadSoundPitch");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("try") && body.includes("catch"),
      "loadSoundPitch 에 try-catch 없음 (localStorage 예외 처리 필요)"
    );
  });

  test("§2-6 (AC3): saveSoundPitch 가 snake.settings.soundPitch 키에 저장", () => {
    const fnIdx = gameJs.indexOf("function saveSoundPitch");
    assert.ok(fnIdx !== -1, "saveSoundPitch 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("snake.settings.soundPitch") || body.includes("LS_SOUND_PITCH_KEY"),
      "saveSoundPitch 가 올바른 키로 저장하지 않음"
    );
  });

  test("§2-7 (AC3): _soundPitch 모듈 변수 선언 존재", () => {
    assert.ok(
      gameJs.includes("_soundPitch"),
      "game.js 에 _soundPitch 변수 없음"
    );
  });

  test("§2-8 (AC3): _soundPitch 이 loadSoundPitch() 으로 초기화", () => {
    const idx = gameJs.indexOf("_soundPitch");
    assert.ok(idx !== -1, "_soundPitch 없음");
    const snippet = gameJs.slice(idx - 10, idx + 100);
    assert.ok(
      snippet.includes("loadSoundPitch"),
      "_soundPitch 이 loadSoundPitch() 으로 초기화되지 않음"
    );
  });
});

// ───────────────────────────────────────────────────────────────
// §3. game.js — playSound() 피치 적용 (AC2, AC4, AC5)
// ───────────────────────────────────────────────────────────────

describe("BF-614 §3 playSound() 피치 적용 (AC2, AC4, AC5)", () => {
  test("§3-1 (AC2): playSound 내부에서 _soundPitch 를 osc.frequency 에 곱함 (ding)", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    assert.ok(fnIdx !== -1, "playSound 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    // 880 * _soundPitch 또는 880 곱 패턴
    assert.ok(
      body.includes("_soundPitch") && body.includes("880"),
      "playSound 내 ding(880Hz) 에 _soundPitch 배수 없음 (AC2)"
    );
  });

  test("§3-2 (AC2): playSound 내부 fail 사운드에도 _soundPitch 적용", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("_soundPitch") && body.includes("220"),
      "playSound 내 fail(220Hz) 에 _soundPitch 배수 없음 (AC2)"
    );
  });

  test("§3-3 (AC4): 무음 게이트(soundEnabled off)가 피치 경로보다 먼저 평가", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    assert.ok(fnIdx !== -1, "playSound 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    // soundEnabled 체크 위치가 _soundPitch 위치보다 앞에 있어야 함
    const soundEnabledIdx = body.indexOf("loadSettingsSoundEnabled");
    const pitchIdx        = body.indexOf("_soundPitch");
    assert.ok(soundEnabledIdx !== -1, "playSound 내 soundEnabled 게이트 없음");
    assert.ok(pitchIdx !== -1,        "playSound 내 _soundPitch 없음");
    assert.ok(
      soundEnabledIdx < pitchIdx,
      "soundEnabled 게이트가 _soundPitch 적용보다 나중에 평가됨 (AC4 위반)"
    );
  });

  test("§3-4 (AC4): 음량 0 게이트가 피치 경로보다 먼저 평가", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    // _soundVolume === 0 체크 위치가 _soundPitch 위치보다 앞에 있어야 함
    const volGateIdx = body.indexOf("_soundVolume");
    const pitchIdx   = body.indexOf("_soundPitch");
    assert.ok(volGateIdx !== -1, "playSound 내 _soundVolume 게이트 없음");
    assert.ok(pitchIdx !== -1,   "playSound 내 _soundPitch 없음");
    assert.ok(
      volGateIdx < pitchIdx,
      "음량 0 게이트가 _soundPitch 적용보다 나중에 평가됨 (AC4 위반)"
    );
  });

  test("§3-5 (AC5): gain.gain 경로와 osc.frequency 경로가 독립 — 각각 별도 변수로 설정", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    // gain.gain 은 _soundVolume 스케일, osc.frequency 는 _soundPitch 배수
    assert.ok(
      body.includes("gain.gain") && body.includes("_soundVolume"),
      "gain 경로에 _soundVolume 반영 없음 (AC5)"
    );
    assert.ok(
      body.includes("osc.frequency") && body.includes("_soundPitch"),
      "frequency 경로에 _soundPitch 반영 없음 (AC5)"
    );
  });

  test("§3-6 (AC2): handleSliderInput 에서 soundPitch 분기 처리", () => {
    const fnIdx = gameJs.indexOf("function handleSliderInput");
    assert.ok(fnIdx !== -1, "handleSliderInput 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("soundPitch"),
      "handleSliderInput 에 soundPitch 분기 없음 (AC2)"
    );
  });

  test("§3-7 (AC2): handleSliderInput 에서 soundPitch 변경 시 _soundPitch 즉시 갱신", () => {
    const fnIdx = gameJs.indexOf("function handleSliderInput");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("_soundPitch"),
      "handleSliderInput 에서 _soundPitch 즉시 갱신 없음 (AC2: 즉시 반영 불가)"
    );
  });
});

// ───────────────────────────────────────────────────────────────
// §4. game.js — 설정 모달 저장/열기에 soundPitch 연동 (AC3)
// ───────────────────────────────────────────────────────────────

describe("BF-614 §4 설정 모달 soundPitch 연동 (AC3)", () => {
  test("§4-1 (AC3): saveSettingsModal 에서 saveSoundPitch 호출", () => {
    const fnIdx = gameJs.indexOf("function saveSettingsModal");
    assert.ok(fnIdx !== -1, "saveSettingsModal 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("saveSoundPitch") || body.includes("LS_SOUND_PITCH_KEY"),
      "saveSettingsModal 에서 피치 저장 코드 없음 (AC3)"
    );
  });

  test("§4-2 (AC3): openSettingsModal 에서 soundPitch 복원 코드 존재", () => {
    const fnIdx = gameJs.indexOf("function openSettingsModal");
    assert.ok(fnIdx !== -1, "openSettingsModal 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("soundPitch"),
      "openSettingsModal 에서 soundPitch 복원 코드 없음 (AC3)"
    );
  });

  test("§4-3 (AC3): reflectDraftToControls 에서 soundPitch 슬라이더 반영", () => {
    const fnIdx = gameJs.indexOf("function reflectDraftToControls");
    assert.ok(fnIdx !== -1, "reflectDraftToControls 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("soundPitch"),
      "reflectDraftToControls 에서 soundPitch 슬라이더 반영 없음 (AC3)"
    );
  });

  test("§4-4 (AC3): saveSettingsModal 에서 _soundPitch 변수도 갱신 (즉시 반영 유지)", () => {
    const fnIdx = gameJs.indexOf("function saveSettingsModal");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("_soundPitch"),
      "saveSettingsModal 에서 _soundPitch 갱신 없음 (AC3)"
    );
  });

  test("§4-5 (AC3): LS_SOUND_PITCH_KEY 가 \"snake.settings.soundPitch\" 값", () => {
    // 상수 선언 확인
    assert.ok(
      gameJs.includes('LS_SOUND_PITCH_KEY') && gameJs.includes('"snake.settings.soundPitch"'),
      'LS_SOUND_PITCH_KEY 또는 "snake.settings.soundPitch" 값 없음'
    );
    // dot 컨벤션 — hyphen bf-snake-* 아님
    assert.ok(
      !gameJs.includes('"bf-snake-soundPitch"') && !gameJs.includes('"bf-snake-sound-pitch"'),
      '피치 키가 bf-snake-* hyphen 컨벤션 사용 (dot 컨벤션이어야 함)'
    );
  });
});

// ───────────────────────────────────────────────────────────────
// §5. file:// 환경 안전성 — console.error/CORS 회피 (AC6)
// ───────────────────────────────────────────────────────────────

describe("BF-614 §5 file:// 환경 안전성 (AC6)", () => {
  test("§5-1: 새 localStorage 함수에 fetch/XMLHttpRequest 사용 없음", () => {
    const fnStart1 = gameJs.indexOf("function loadSoundPitch");
    const fnStart2 = gameJs.indexOf("function saveSoundPitch");
    assert.ok(fnStart1 !== -1, "loadSoundPitch 없음");
    assert.ok(fnStart2 !== -1, "saveSoundPitch 없음");

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
      "피치 헬퍼 함수에 fetch/XHR 포함 — file:// 에서 CORS 오류 발생"
    );
  });

  test("§5-2: 피치 슬라이더 HTML 에 src/href 외부 URL 없음", () => {
    const keyIdx = html.indexOf('data-key="soundPitch"');
    assert.ok(keyIdx !== -1, 'data-key="soundPitch" 없음');
    const snippet = html.slice(Math.max(0, keyIdx - 300), keyIdx + 300);
    assert.ok(
      !snippet.includes("http://") && !snippet.includes("https://"),
      "피치 슬라이더 주변에 외부 URL — file:// CORS 위험"
    );
  });

  test("§5-3: BF-604 회귀 가드 — soundVolume 슬라이더 여전히 존재 (AC4)", () => {
    // 피치 구현 후 음량 슬라이더가 사라지지 않아야 함
    assert.ok(
      html.includes('data-key="soundVolume"'),
      '음량 슬라이더(BF-604)가 사라짐 — BF-604 회귀 (AC4/AC5)'
    );
    assert.ok(
      gameJs.includes("_soundVolume"),
      "game.js 에서 _soundVolume 사라짐 — BF-604 회귀"
    );
  });
});
