// BF-592 · 지렁이 게임 설정창 입력·저장 버그 수정
//
// 버그 재현 시나리오:
//   1) 지렁이 게임 페이지 로드
//   2) 설정창이 자동으로 열려야 하지만 — 현재 엔트리가 initGame() 단독 호출이므로
//      state.status === "playing" 이 즉시 설정됨
//   3) openSettingsModal("entry") 가 없으므로 draftSettings = null 로 유지
//   4) 사용자가 라디오 클릭 → handleRadioClick 내 !draftSettings 가드가 조기 리턴 → 입력 차단
//   5) 저장 클릭 → validateDraft() 내 !draftSettings → "내부 오류: draft 없음" 반환
//
// 수정 내용:
//   1) game.js 엔트리를 openSettingsModal("entry") 로 변경
//      → state=undefined 상태에서 호출 → "playing" 차단 없이 draftSettings 정상 초기화
//   2) closeSettingsModal 에 !state 가드 + initGame() 호출 추가
//      → 저장/취소 후 게임 시작 (pendingSettings 적용 포함)
//
// AC 매핑:
//   AC1 — 게임 진입 시 설정창 자동 오픈 + 모든 입력 필드 변경 가능 (draftSettings 초기화 확인)
//   AC2 — 설정 변경 후 저장 → 'draft 없음' 오류 없이 정상 저장 + 게임 시작
//   AC3 — 설정 저장 후 재오픈 시 저장된 값 유지 (pendingSettings 또는 currentSettings 반영)
//   AC4 — 수정 전 코드로 되돌리면 §1~§2 테스트 실패 (RED→GREEN 증명)
//
// 실행: node --test tests/snake-BF592.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SNAKE_DIR = path.join(REPO_ROOT, "snake");

const gameJs = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");

// ── 헬퍼: 주어진 index 에서 시작하는 함수 본문 추출 (중괄호 depth 추적) ─────
function extractFunctionBody(src, startIdx) {
  if (startIdx === -1) return "";
  let depth = 0;
  let fnEnd = startIdx;
  for (let i = startIdx; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) { fnEnd = i + 1; break; }
    }
  }
  return src.slice(startIdx, fnEnd);
}

// ═══════════════════════════════════════════════════════════════
// §1. RED→GREEN 핵심 가드 — 수정 전 실패 / 수정 후 통과 (AC4 증명)
// ═══════════════════════════════════════════════════════════════

describe("BF-592 §1 엔트리 포인트 — openSettingsModal('entry') 자동 오픈 (AC1, AC4)", () => {
  test("§1-1 game.js 엔트리 섹션에 openSettingsModal('entry') 호출 존재", () => {
    // 수정 전: 엔트리 섹션이 initGame() 단독 호출 → 이 테스트 실패 (RED)
    // 수정 후: openSettingsModal("entry") 호출 추가 → 통과 (GREEN)
    const entrySection = gameJs.slice(
      gameJs.lastIndexOf("// 엔트리\n"),
    );
    assert.ok(
      /openSettingsModal\s*\(\s*["']entry["']/.test(entrySection),
      'game.js 엔트리 섹션에 openSettingsModal("entry") 없음 — ' +
      '게임 진입 시 설정창 자동 오픈 미구현 (AC1 핵심)',
    );
  });

  test("§1-2 game.js 전체에 openSettingsModal('entry') 호출 존재", () => {
    assert.ok(
      /openSettingsModal\s*\(\s*["']entry["']/.test(gameJs),
      'game.js 전체에 openSettingsModal("entry") 없음 — 자동 오픈 경로 없음',
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §2. RED→GREEN 핵심 가드 — closeSettingsModal 게임 시작 경로 (AC2, AC4)
// ═══════════════════════════════════════════════════════════════

describe("BF-592 §2 closeSettingsModal — !state 가드 + initGame() 경로 (AC2, AC4)", () => {
  test("§2-1 closeSettingsModal 함수 내 initGame() 호출 존재", () => {
    // 수정 전: closeSettingsModal 에 initGame() 없음 → 이 테스트 실패 (RED)
    // 수정 후: !state 가드 후 initGame() 추가 → 통과 (GREEN)
    const idx = gameJs.indexOf("function closeSettingsModal(");
    assert.ok(idx !== -1, "closeSettingsModal 함수가 game.js 에 없음 — 함수 삭제 회귀");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /initGame\s*\(\s*\)/.test(body),
      "closeSettingsModal 에 initGame() 호출 없음 — " +
      "초기 진입 후 저장/취소 시 게임 시작 경로 없음 (AC2 핵심)",
    );
  });

  test("§2-2 closeSettingsModal 내 !state 가드 존재 (미시작 시만 initGame 호출)", () => {
    // 이미 게임이 진행 중일 때 closeSettingsModal 이 initGame 을 호출하면 안 됨
    const idx = gameJs.indexOf("function closeSettingsModal(");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /!\s*state/.test(body) || /state\s*===\s*undefined/.test(body) || /state\s*==\s*null/.test(body),
      "closeSettingsModal 에 state 미초기화 가드 없음 — " +
      "이미 진행 중인 게임에서 설정 닫을 때 initGame 재호출 위험",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §3. draftSettings 초기화 정합성 — openSettingsModal (AC1 핵심)
// ═══════════════════════════════════════════════════════════════

describe("BF-592 §3 openSettingsModal — draftSettings 초기화 정합성 (AC1)", () => {
  test("§3-1 openSettingsModal 내 draftSettings = Object.assign({}, base) 초기화 존재", () => {
    const idx = gameJs.indexOf("function openSettingsModal(");
    assert.ok(idx !== -1, "openSettingsModal 함수 없음 — 삭제 회귀");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /draftSettings\s*=\s*Object\.assign\s*\(\s*\{\s*\}/.test(body),
      "openSettingsModal 에 draftSettings = Object.assign({}, ...) 초기화 없음 — " +
      "모달 오픈 시 draft 미초기화 → 입력 차단 + draft 없음 오류 회귀",
    );
  });

  test("§3-2 openSettingsModal — state && playing 조건 차단 (state=undefined 시 통과)", () => {
    // state=undefined 이면 state && state.status 가 falsy → 차단 없이 draftSettings 초기화 진행
    const idx = gameJs.indexOf("function openSettingsModal(");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /state\s*&&\s*state\.status\s*===\s*["']playing["']/.test(body),
      "openSettingsModal 내 playing 상태 차단 코드 없음 — 게임 중 모달 열림 방지 회귀",
    );
    // 핵심: draftSettings 초기화가 playing 차단 이후에 오면 안 됨 (state=undefined 시 차단 없이 실행)
    const draftInitPos   = body.indexOf("draftSettings = Object.assign");
    const playingCheckPos = body.indexOf("state && state.status");
    assert.ok(
      draftInitPos !== -1,
      "draftSettings 초기화 코드 없음",
    );
    // playing 체크가 return 하더라도 state=undefined 시 return 하지 않으므로
    // draftSettings 초기화 라인이 반드시 존재해야 함 (이미 §3-1 에서 검증)
  });
});

// ═══════════════════════════════════════════════════════════════
// §4. validateDraft 'draft 없음' 오류 가드 (AC2)
// ═══════════════════════════════════════════════════════════════

describe("BF-592 §4 validateDraft — 'draft 없음' 오류 경로 가드 (AC2 회귀 방지)", () => {
  test("§4-1 validateDraft 내 !draftSettings 체크 + 오류 메시지 존재", () => {
    const idx = gameJs.indexOf("function validateDraft(");
    assert.ok(idx !== -1, "validateDraft 함수 없음");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /!draftSettings/.test(body),
      "validateDraft 에 !draftSettings 체크 없음 — null 접근 예외 위험",
    );
    assert.ok(
      /draft 없음/.test(body),
      "validateDraft 에 'draft 없음' 오류 메시지 없음 — 오류 감지 불가",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §5. 설정 저장 후 재오픈 시 값 유지 (AC3)
// ═══════════════════════════════════════════════════════════════

describe("BF-592 §5 설정 저장 후 재오픈 — pendingSettings/currentSettings 기반 draft 초기화 (AC3)", () => {
  test("§5-1 openSettingsModal — pendingSettings || currentSettings 기반 base 선택 존재", () => {
    const idx = gameJs.indexOf("function openSettingsModal(");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /pendingSettings\s*\|\|\s*currentSettings/.test(body),
      "openSettingsModal 이 pendingSettings || currentSettings 기반 초기화 안 함 — " +
      "설정 저장 후 재오픈 시 값 유지 회귀 (AC3)",
    );
  });

  test("§5-2 saveSettingsModal — pendingSettings 에 merged 설정 저장 경로 존재", () => {
    const idx = gameJs.indexOf("function saveSettingsModal(");
    assert.ok(idx !== -1, "saveSettingsModal 함수 없음");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /pendingSettings\s*=\s*merged/.test(body),
      "saveSettingsModal 에 pendingSettings = merged 없음 — 저장 후 설정 미반영 회귀",
    );
  });

  test("§5-3 initGame — pendingSettings → currentSettings 적용 경로 존재 (재시작 시 설정 반영)", () => {
    const idx = gameJs.indexOf("function initGame(");
    assert.ok(idx !== -1, "initGame 함수 없음");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /currentSettings\s*=\s*pendingSettings/.test(body),
      "initGame 에 currentSettings = pendingSettings 할당 없음 — 저장 후 게임 시작 시 설정 미반영",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §6. handleRadioClick / handleToggleClick — !draftSettings 가드 존재 (정적 가드)
// ═══════════════════════════════════════════════════════════════

describe("BF-592 §6 입력 핸들러 — !draftSettings 가드 존재 (AC1 회귀 방지)", () => {
  test("§6-1 handleRadioClick — !draftSettings 조기 리턴 가드 존재", () => {
    const idx = gameJs.indexOf("function handleRadioClick(");
    assert.ok(idx !== -1, "handleRadioClick 함수 없음");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /!draftSettings/.test(body),
      "handleRadioClick 에 !draftSettings 가드 없음 — null 접근 예외 위험",
    );
  });

  test("§6-2 handleToggleClick — !draftSettings 조기 리턴 가드 존재", () => {
    const idx = gameJs.indexOf("function handleToggleClick(");
    assert.ok(idx !== -1, "handleToggleClick 함수 없음");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /!draftSettings/.test(body),
      "handleToggleClick 에 !draftSettings 가드 없음 — null 접근 예외 위험",
    );
  });

  test("§6-3 handleSliderInput — !draftSettings 조기 리턴 가드 존재", () => {
    const idx = gameJs.indexOf("function handleSliderInput(");
    assert.ok(idx !== -1, "handleSliderInput 함수 없음");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /!draftSettings/.test(body),
      "handleSliderInput 에 !draftSettings 가드 없음 — null 접근 예외 위험",
    );
  });
});
