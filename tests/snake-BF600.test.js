// BF-600 · 스네이크 게임 사운드 효과 + 설정 토글 구현
//
// AC 매핑:
//   AC-1: 사운드 on 상태에서 먹이 먹기 → 880Hz sine 100ms ding 재생
//   AC-2: 사운드 on 상태에서 게임 오버 → 220Hz square 300ms fail 재생
//   AC-3: 설정 모달 사운드 off + 저장 → 모든 효과음 무음 + localStorage 저장
//   AC-4: 페이지 새로고침 후 localStorage 에서 off 상태 복원
//
// 실행: node --test tests/snake-BF600.test.js

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
// §1. 설정 모달 UI — 사운드 토글 (AC-3)
// ───────────────────────────────────────────────────────────────

describe("BF-600 §1 설정 모달 사운드 토글 DOM 구조", () => {
  test("§1-1 (AC3): 설정 모달 내 data-key=\"soundEnabled\" 토글 버튼 존재", () => {
    assert.ok(
      html.includes('data-key="soundEnabled"'),
      'index.html 설정 모달에 data-key="soundEnabled" 토글 없음'
    );
  });

  test("§1-2 (AC3): 토글 버튼이 role=\"switch\" 를 가짐", () => {
    const keyIdx = html.indexOf('data-key="soundEnabled"');
    assert.ok(keyIdx !== -1, 'data-key="soundEnabled" 없음');
    const tagStart = html.lastIndexOf("<button", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes('role="switch"'),
      '사운드 토글 버튼에 role="switch" 없음'
    );
  });

  test("§1-3 (AC3): 토글 버튼이 aria-checked=\"true\" 기본값 (소리 ON)", () => {
    const keyIdx = html.indexOf('data-key="soundEnabled"');
    assert.ok(keyIdx !== -1, 'data-key="soundEnabled" 없음');
    const tagStart = html.lastIndexOf("<button", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes('aria-checked="true"'),
      '사운드 토글 버튼의 aria-checked 기본값이 true 가 아님'
    );
  });

  test("§1-4 (AC3): 토글 버튼에 ctrl-toggle 클래스 존재 (기존 UI 패턴 재사용)", () => {
    const keyIdx = html.indexOf('data-key="soundEnabled"');
    assert.ok(keyIdx !== -1, 'data-key="soundEnabled" 없음');
    const tagStart = html.lastIndexOf("<button", keyIdx);
    const tagEnd   = html.indexOf(">", keyIdx);
    const tag = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes("ctrl-toggle"),
      '사운드 토글 버튼에 ctrl-toggle 클래스 없음'
    );
  });

  test("§1-5 (AC3): 효과음 섹션 타이틀 텍스트 존재 (설정 모달 내)", () => {
    // 효과음 또는 사운드 관련 텍스트가 settings-section 내에 있어야 함
    const settingsStart = html.indexOf('id="settings-modal"');
    const settingsEnd   = html.indexOf('<!-- BF-518', settingsStart);
    const settingsHtml  = settingsStart !== -1 && settingsEnd !== -1
      ? html.slice(settingsStart, settingsEnd)
      : html;
    assert.ok(
      settingsHtml.includes("효과음") || settingsHtml.includes("사운드"),
      '설정 모달 내 효과음/사운드 관련 텍스트 없음'
    );
  });
});

// ───────────────────────────────────────────────────────────────
// §2. game.js — localStorage 관리 (AC-3, AC-4)
// ───────────────────────────────────────────────────────────────

describe("BF-600 §2 game.js localStorage 관리", () => {
  test("§2-1 (AC3): snake.settings.soundEnabled localStorage 키 상수 존재", () => {
    assert.ok(
      gameJs.includes('"snake.settings.soundEnabled"'),
      'game.js 에 "snake.settings.soundEnabled" 키 없음'
    );
  });

  test("§2-2 (AC4): loadSettingsSoundEnabled 함수 정의", () => {
    assert.ok(
      gameJs.includes("function loadSettingsSoundEnabled"),
      "game.js 에 loadSettingsSoundEnabled 함수 없음"
    );
  });

  test("§2-3 (AC3): saveSettingsSoundEnabled 함수 정의", () => {
    assert.ok(
      gameJs.includes("function saveSettingsSoundEnabled"),
      "game.js 에 saveSettingsSoundEnabled 함수 없음"
    );
  });

  test("§2-4 (AC4): loadSettingsSoundEnabled 기본값 true (null 케이스)", () => {
    const fnIdx = gameJs.indexOf("function loadSettingsSoundEnabled");
    assert.ok(fnIdx !== -1, "loadSettingsSoundEnabled 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("null") && body.includes("true"),
      "loadSettingsSoundEnabled 에서 null → true 기본값 처리 없음"
    );
  });

  test("§2-5 (AC4): loadSettingsSoundEnabled 엄격 문자열 비교 (\"true\")", () => {
    const fnIdx = gameJs.indexOf("function loadSettingsSoundEnabled");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes('"true"') || body.includes("'true'"),
      "loadSettingsSoundEnabled 에서 엄격 문자열 비교 없음"
    );
  });

  test("§2-6 (AC4): loadSettingsSoundEnabled try-catch 존재", () => {
    const fnIdx = gameJs.indexOf("function loadSettingsSoundEnabled");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("try") && body.includes("catch"),
      "loadSettingsSoundEnabled 에 try-catch 없음 (localStorage 예외 처리 필요)"
    );
  });

  test("§2-7 (AC3): saveSettingsSoundEnabled 가 snake.settings.soundEnabled 키에 저장", () => {
    const fnIdx = gameJs.indexOf("function saveSettingsSoundEnabled");
    assert.ok(fnIdx !== -1, "saveSettingsSoundEnabled 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("snake.settings.soundEnabled") || body.includes("LS_SETTINGS_SOUND_KEY"),
      "saveSettingsSoundEnabled 가 올바른 키로 저장하지 않음"
    );
  });
});

// ───────────────────────────────────────────────────────────────
// §3. game.js — playSound() 함수 (AC-1, AC-2, AC-3)
// ───────────────────────────────────────────────────────────────

describe("BF-600 §3 playSound() 함수", () => {
  test("§3-1 (AC1/AC2): playSound 함수 정의", () => {
    assert.ok(
      gameJs.includes("function playSound"),
      "game.js 에 playSound 함수 없음"
    );
  });

  test("§3-2 (AC3): playSound 내부에서 loadSettingsSoundEnabled() 또는 snake.settings.soundEnabled 체크", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    assert.ok(fnIdx !== -1, "playSound 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("loadSettingsSoundEnabled") || body.includes("SettingsSoundEnabled"),
      "playSound 내부에서 설정값 체크 없음 (AC3: off 시 무음 불가)"
    );
  });

  test("§3-3 (AC1): playSound 내 \"ding\" 케이스 처리", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes('"ding"') || body.includes("'ding'"),
      "playSound 내 ding 케이스 없음"
    );
  });

  test("§3-4 (AC2): playSound 내 \"fail\" 케이스 처리", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes('"fail"') || body.includes("'fail'"),
      "playSound 내 fail 케이스 없음"
    );
  });

  test("§3-5 (AC1): ding 은 880Hz 사용", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(body.includes("880"), "playSound ding 케이스에 880Hz 없음");
  });

  test("§3-6 (AC1): ding 은 sine 파형 사용", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes('"sine"') || body.includes("'sine'"),
      "playSound ding 케이스에 sine 파형 없음"
    );
  });

  test("§3-7 (AC2): fail 은 220Hz 사용", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(body.includes("220"), "playSound fail 케이스에 220Hz 없음");
  });

  test("§3-8 (AC2): fail 은 square 파형 사용", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes('"square"') || body.includes("'square'"),
      "playSound fail 케이스에 square 파형 없음"
    );
  });

  test("§3-9 (AC-2): fail 지속 시간 300ms 코드 존재", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("0.3") || body.includes("300"),
      "playSound fail 케이스에 300ms 지속 시간 코드 없음"
    );
  });

  test("§3-10 (AC1): ding 지속 시간 100ms 코드 존재", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("0.1") || body.includes("100"),
      "playSound ding 케이스에 100ms 지속 시간 코드 없음"
    );
  });

  test("§3-11 (AC1/AC2): AudioContext.resume() 자동재생 정책 대응 코드", () => {
    const fnIdx = gameJs.indexOf("function playSound");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("resume") || body.includes("suspended"),
      "playSound 에 AudioContext 자동재생 정책 대응 코드 없음"
    );
  });
});

// ───────────────────────────────────────────────────────────────
// §4. game.js — 게임 이벤트와 playSound 연결 (AC-1, AC-2)
// ───────────────────────────────────────────────────────────────

describe("BF-600 §4 게임 이벤트 → playSound 연결", () => {
  test("§4-1 (AC1): 먹이 수집 감지 블록 근방에 playSound(\"ding\") 또는 playEatSound 호출", () => {
    const foodIdx = gameJs.indexOf("prevFood !== null && state.food !== prevFood");
    assert.ok(foodIdx !== -1, "먹이 수집 감지 코드 없음");
    const snippet = gameJs.slice(foodIdx, foodIdx + 400);
    assert.ok(
      snippet.includes('playSound("ding")') ||
      snippet.includes("playSound('ding')") ||
      snippet.includes("playEatSound"),
      "먹이 수집 감지 블록에 사운드 호출 없음 (AC1)"
    );
  });

  test("§4-2 (AC2): playSound(\"fail\") 또는 playGameOverSound 가 게임오버 처리 위치에 존재", () => {
    const goIdx1 = gameJs.indexOf('playSound("fail")');
    const goIdx2 = gameJs.indexOf("playSound('fail')");
    const goIdx3 = gameJs.indexOf("playGameOverSound");
    assert.ok(
      goIdx1 !== -1 || goIdx2 !== -1 || goIdx3 !== -1,
      "게임오버 효과음 호출 없음 (AC2)"
    );
    // 최소 2번 언급 (정의 + 호출)
    const failCount = (gameJs.match(/playSound\("fail"\)|playSound\('fail'\)|playGameOverSound/g) || []).length;
    assert.ok(failCount >= 2, "fail 효과음 정의만 있고 호출 없음");
  });

  test("§4-3 (AC3): 설정 모달 저장 시 saveSettingsSoundEnabled 호출", () => {
    const fnIdx = gameJs.indexOf("function saveSettingsModal");
    assert.ok(fnIdx !== -1, "saveSettingsModal 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("saveSettingsSoundEnabled") || body.includes("LS_SETTINGS_SOUND_KEY"),
      "saveSettingsModal 에서 사운드 설정 저장 코드 없음 (AC3)"
    );
  });

  test("§4-4 (AC4): openSettingsModal 에서 soundEnabled 복원 코드 존재", () => {
    const fnIdx = gameJs.indexOf("function openSettingsModal");
    assert.ok(fnIdx !== -1, "openSettingsModal 없음");
    let depth = 0, fnEnd = fnIdx;
    for (let i = fnIdx; i < gameJs.length; i++) {
      if (gameJs[i] === "{") depth++;
      else if (gameJs[i] === "}") { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    const body = gameJs.slice(fnIdx, fnEnd);
    assert.ok(
      body.includes("loadSettingsSoundEnabled") || body.includes("soundEnabled"),
      "openSettingsModal 에서 soundEnabled 복원 코드 없음 (AC4)"
    );
  });
});
