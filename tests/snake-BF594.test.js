// BF-594 · 지렁이 게임 설정창 입력·저장 버그 수정 (draft 없음 오류 + 설정 닫힘)
//
// 버그 재현 시나리오:
//   1) 지렁이 게임 진입 → 설정창 자동 오픈 (openSettingsModal("entry") 호출)
//   2) 사용자가 라디오·토글·슬라이더 값을 변경
//      → draftSettings[key] 에 실제 값이 저장되어야 함
//      → 핸들러가 !draftSettings 가드만 있고 실제 할당이 없으면 변경값이 누락됨
//   3) 저장 버튼 클릭
//      → validateDraft() 통과 (draftSettings 가 null 이면 '내부 오류: draft 없음' 반환)
//      → pendingSettings 업데이트 → 설정창 닫힘 → initGame() 에서 설정값 적용
//
// BF-592 와의 관계 (방어선 분리):
//   BF-592 — 각 함수가 '존재하는지' 구조 검사 (정적 가드 방어선 1층)
//   BF-594 — 각 함수가 '올바른 동작을 하는지' 행위 검사 (정적 가드 방어선 2층)
//     * 핸들러가 draftSettings[key] 에 값을 실제 할당하는지 (단순 guard 체크와 별개)
//     * saveSettingsModal 이 validateDraft → pendingSettings → closeSettingsModal 체인을 완주하는지
//     * 저장된 설정값이 createInitialState 에 전달되는지 (logic.js 행위 시뮬레이션)
//     * openSettingsModal 에서 draftSettings 초기화 순서가 모달 show 보다 선행하는지
//
// AC 매핑:
//   AC1 — 입력 핸들러가 draftSettings[key] 에 실제 값 할당
//         (값 변경이 draft 에 정상 반영되지 않는 회귀 감지)
//   AC2 — saveSettingsModal 체인 완주:
//         validateDraft → pendingSettings = merged → closeSettingsModal("save")
//         + 저장 설정값이 createInitialState 에 반영 (logic.js 시뮬레이션)
//   AC3 — 회귀 가드: 이 테스트가 실패하면 draft 흐름이 깨진 것
//
// 실행: node --test tests/snake-BF594.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// styles.css 도 읽어서 CSS 회귀 가드에 사용

import {
  validateAndMergeSettings,
  SNAKE_SETTINGS_DEFAULTS,
  SNAKE_SETTINGS_LIMITS,
  createInitialState,
} from "../snake/logic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SNAKE_DIR = path.join(REPO_ROOT, "snake");
const gameJs   = readFileSync(path.join(SNAKE_DIR, "game.js"),    "utf-8");
const stylesCs = readFileSync(path.join(SNAKE_DIR, "styles.css"), "utf-8");

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
// §1. handleRadioClick — draft 값 실제 할당 (AC1 핵심)
// ═══════════════════════════════════════════════════════════════

describe("BF-594 §1 handleRadioClick — draftSettings[key] 실제 값 할당 (AC1)", () => {
  test("§1-1 handleRadioClick 함수 본문에 draftSettings[key] = value 할당 존재", () => {
    // 수정 전 회귀: !draftSettings 가드만 있고 draftSettings[key] = value 가 없으면
    // 라디오 버튼을 클릭해도 draft 에 값이 저장되지 않아 저장 시 기존 값으로 게임 시작됨 (AC1 핵심).
    const idx = gameJs.indexOf("function handleRadioClick(");
    assert.ok(idx !== -1, "handleRadioClick 함수가 game.js 에 없음 — 삭제 회귀");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /draftSettings\s*\[\s*key\s*\]\s*=\s*value/.test(body),
      "handleRadioClick 에 draftSettings[key] = value 할당이 없음 — " +
      "라디오 버튼 변경이 draft 에 반영되지 않아 저장 시 기존값으로 게임 시작됨 (AC1 회귀)",
    );
  });

  test("§1-2 handleRadioClick — reflectDraftToControls() 호출로 UI 동기화", () => {
    const idx = gameJs.indexOf("function handleRadioClick(");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /reflectDraftToControls\s*\(\s*\)/.test(body),
      "handleRadioClick 에 reflectDraftToControls() 호출 없음 — " +
      "라디오 변경 후 UI 컨트롤(aria-pressed) 미동기화 회귀",
    );
  });

  test("§1-3 handleRadioClick — cpuCount/initialLength 를 Number 로 변환 (문자열 raw 값 오염 방지)", () => {
    // data-value 속성은 문자열. Number(raw) 변환 없으면 cpuCount="1" (문자열) 로 저장 →
    // validateAndMergeSettings 의 typeof raw.cpuCount === "number" 체크 통과 실패 → 기본값 폴백.
    const idx = gameJs.indexOf("function handleRadioClick(");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /Number\s*\(\s*raw\s*\)/.test(body),
      "handleRadioClick 에 Number(raw) 변환 없음 — " +
      "cpuCount/initialLength 가 문자열로 저장되어 validateAndMergeSettings 타입 체크 실패 → 기본값 폴백 (AC1 회귀)",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §2. handleToggleClick — draft 토글 로직 (AC1)
// ═══════════════════════════════════════════════════════════════

describe("BF-594 §2 handleToggleClick — draftSettings[key] 토글 로직 (AC1)", () => {
  test("§2-1 handleToggleClick 함수 본문에 draftSettings[key] 토글 할당 존재", () => {
    // !(draftSettings[key] === true) 또는 !draftSettings[key] 패턴 확인.
    const idx = gameJs.indexOf("function handleToggleClick(");
    assert.ok(idx !== -1, "handleToggleClick 함수가 game.js 에 없음");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /draftSettings\s*\[\s*key\s*\]\s*=\s*!/.test(body),
      "handleToggleClick 에 draftSettings[key] = ! 토글 할당이 없음 — " +
      "토글 스위치 클릭이 draft 에 반영되지 않아 itemsEnabled/multiplierEnabled 변경 누락 (AC1 회귀)",
    );
  });

  test("§2-2 handleToggleClick — reflectDraftToControls() 호출로 UI 동기화", () => {
    const idx = gameJs.indexOf("function handleToggleClick(");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /reflectDraftToControls\s*\(\s*\)/.test(body),
      "handleToggleClick 에 reflectDraftToControls() 호출 없음 — UI 미동기화 회귀",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §3. handleSliderInput — draft 슬라이더 값 반영 (AC1)
// ═══════════════════════════════════════════════════════════════

describe("BF-594 §3 handleSliderInput / handleCustomTimeInput — draft 값 할당 (AC1)", () => {
  test("§3-1 handleSliderInput — draftSettings[key] 에 슬라이더 결과 할당 존재", () => {
    const idx = gameJs.indexOf("function handleSliderInput(");
    assert.ok(idx !== -1, "handleSliderInput 함수가 game.js 에 없음");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /draftSettings\s*\[\s*key\s*\]\s*=/.test(body),
      "handleSliderInput 에 draftSettings[key] = 할당이 없음 — " +
      "itemSpawnRate 슬라이더 변경이 draft 에 저장되지 않음 (AC1 회귀)",
    );
  });

  test("§3-2 handleCustomTimeInput — draftSettings.timeLimitSec 에 직접 입력값 저장 존재", () => {
    const idx = gameJs.indexOf("function handleCustomTimeInput(");
    assert.ok(idx !== -1, "handleCustomTimeInput 함수가 game.js 에 없음");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /draftSettings\s*\.timeLimitSec\s*=/.test(body),
      "handleCustomTimeInput 에 draftSettings.timeLimitSec 할당이 없음 — " +
      "직접 입력 시간값이 draft 에 저장되지 않음 (AC1 회귀)",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §4. saveSettingsModal 체인 완주 (AC2)
// ═══════════════════════════════════════════════════════════════

describe("BF-594 §4 saveSettingsModal — validateDraft → pendingSettings → closeSettingsModal 체인 (AC2)", () => {
  test("§4-1 saveSettingsModal — validateDraft() 호출 후 !v.ok 가드로 조기 리턴 존재", () => {
    // !v.ok 가드 없으면 'draft 없음' 오류가 showValidationMsg 를 거치지 않고 체인이 계속 진행됨.
    const idx = gameJs.indexOf("function saveSettingsModal(");
    assert.ok(idx !== -1, "saveSettingsModal 함수가 game.js 에 없음");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /validateDraft\s*\(\s*\)/.test(body),
      "saveSettingsModal 에 validateDraft() 호출 없음 — draft 검증 없이 저장 진행됨 (AC2 회귀)",
    );
    assert.ok(
      /!v\.ok/.test(body) || /v\.ok\s*===\s*false/.test(body) || /!v\[["']ok["']\]/.test(body),
      "saveSettingsModal 에 !v.ok 가드 없음 — validateDraft 실패 시에도 저장 진행됨 (AC2 회귀)",
    );
  });

  test("§4-2 saveSettingsModal — validateAndMergeSettings(draftSettings) 호출 존재", () => {
    // validateDraft 통과 후 draftSettings 를 병합·정규화하지 않으면 범위 초과 값이 그대로 저장됨.
    const idx = gameJs.indexOf("function saveSettingsModal(");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /validateAndMergeSettings\s*\(\s*draftSettings\s*\)/.test(body),
      "saveSettingsModal 에 validateAndMergeSettings(draftSettings) 없음 — " +
      "draftSettings 값이 정규화 없이 raw 로 저장됨 (AC2 회귀)",
    );
  });

  test("§4-3 saveSettingsModal — pendingSettings = merged 로 설정 갱신 존재", () => {
    // pendingSettings 에 저장하지 않으면 initGame 에서 currentSettings = pendingSettings 가
    // null 을 적용해 기본값으로 게임 시작됨 — 설정이 다음 게임에 반영되지 않음.
    const idx = gameJs.indexOf("function saveSettingsModal(");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /pendingSettings\s*=\s*merged/.test(body),
      "saveSettingsModal 에 pendingSettings = merged 없음 — " +
      "저장한 설정이 다음 게임 시작 시 반영되지 않음 (AC2 회귀)",
    );
  });

  test("§4-4 saveSettingsModal — closeSettingsModal('save') 호출 존재 (모달 닫힘)", () => {
    // closeSettingsModal('save') 가 없으면 저장 후에도 모달이 닫히지 않음.
    const idx = gameJs.indexOf("function saveSettingsModal(");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /closeSettingsModal\s*\(\s*["']save["']\s*\)/.test(body),
      "saveSettingsModal 에 closeSettingsModal('save') 없음 — " +
      "저장 성공 후 모달이 닫히지 않음 (AC2 회귀: '설정 닫힘' 불가)",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §5. openSettingsModal — draftSettings 초기화 순서 가드 (AC3)
// ═══════════════════════════════════════════════════════════════

describe("BF-594 §5 openSettingsModal — draftSettings 초기화가 모달 show 이전 (AC3 핵심 순서 가드)", () => {
  test("§5-1 draftSettings = Object.assign({}, base) 가 removeAttribute('hidden') 이전에 위치", () => {
    // 순서가 바뀌면 모달이 먼저 표시된 뒤에 draftSettings 가 초기화되는 짧은 창이 생길 수 있음.
    // 더 중요한 것은: removeAttribute('hidden') 이 draftSettings 초기화 이전에 오면
    // 사용자가 매우 빠르게 저장을 누르는 타이밍에 draftSettings = null 인 상태로
    // saveSettingsModal → validateDraft → '내부 오류: draft 없음' 경로에 진입할 가능성 차단.
    const idx = gameJs.indexOf("function openSettingsModal(");
    assert.ok(idx !== -1, "openSettingsModal 함수 없음 — 삭제 회귀");
    const body = extractFunctionBody(gameJs, idx);
    const draftInitPos  = body.indexOf("draftSettings = Object.assign");
    const modalShowPos  = body.indexOf('removeAttribute("hidden")');
    assert.ok(draftInitPos !== -1, "openSettingsModal 에 draftSettings 초기화 코드 없음");
    assert.ok(modalShowPos !== -1, "openSettingsModal 에 removeAttribute('hidden') 없음");
    assert.ok(
      draftInitPos < modalShowPos,
      "openSettingsModal 에서 draftSettings 초기화가 모달 show 이후에 위치 — " +
      "모달이 먼저 열려 !draftSettings 상태에서 저장 버튼 클릭 시 '내부 오류: draft 없음' 가능 (AC3 회귀)",
    );
  });

  test("§5-2 openSettingsModal — reflectDraftToControls() 가 draftSettings 초기화 이후에 위치", () => {
    // reflectDraftToControls() 는 draftSettings 를 읽어 UI 에 반영.
    // draftSettings = null 상태에서 호출 시 !(key in null) TypeError.
    const idx = gameJs.indexOf("function openSettingsModal(");
    const body = extractFunctionBody(gameJs, idx);
    const draftInitPos   = body.indexOf("draftSettings = Object.assign");
    const reflectCallPos = body.indexOf("reflectDraftToControls()");
    assert.ok(reflectCallPos !== -1, "openSettingsModal 에 reflectDraftToControls() 없음");
    assert.ok(
      draftInitPos < reflectCallPos,
      "openSettingsModal 에서 reflectDraftToControls() 가 draftSettings 초기화 이전에 위치 — " +
      "null 참조 오류 가능 (AC3 회귀)",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §6. validateDraft — 'draft 없음' 오류 경로 & 정상 경로 (AC2, AC3)
// ═══════════════════════════════════════════════════════════════

describe("BF-594 §6 validateDraft — 'draft 없음' 오류 경로 가드 및 정상 통과 (AC2, AC3)", () => {
  test("§6-1 validateDraft — !draftSettings 체크 + '내부 오류: draft 없음' 메시지 존재", () => {
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

  test("§6-2 validateDraft — { ok: false } 반환으로 saveSettingsModal 체인 차단 가능", () => {
    // ok: false 가 없으면 saveSettingsModal 이 !v.ok 가드로 차단 불가.
    const idx = gameJs.indexOf("function validateDraft(");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /ok\s*:\s*false/.test(body),
      "validateDraft 에 { ok: false } 반환 패턴 없음 — saveSettingsModal 의 !v.ok 가드 무력화",
    );
    assert.ok(
      /ok\s*:\s*true/.test(body),
      "validateDraft 에 { ok: true } 반환 패턴 없음 — 정상 케이스에서 저장 진행 불가",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §7. logic.js 행위 시뮬레이션 — 저장값이 createInitialState 에 반영 (AC2)
// ═══════════════════════════════════════════════════════════════

describe("BF-594 §7 logic.js 행위 시뮬레이션 — 설정 저장 → 게임 상태 반영 (AC2)", () => {
  test("§7-1 기본 draft → validateAndMergeSettings → SNAKE_SETTINGS_DEFAULTS 와 동일", () => {
    // openSettingsModal 에서 draftSettings = Object.assign({}, base) 로 초기화 시
    // 사용자가 아무것도 변경하지 않고 저장하면 기본값이 유지되어야 함.
    const draft = { ...SNAKE_SETTINGS_DEFAULTS };
    const merged = validateAndMergeSettings(draft);
    assert.deepEqual(
      merged,
      { ...SNAKE_SETTINGS_DEFAULTS },
      "기본 draft 가 validateAndMergeSettings 를 통과 후 DEFAULTS 와 다름 — 기본값 직렬화 회귀",
    );
  });

  test("§7-2 cpuCount=0 draft → validateAndMergeSettings → createInitialState → cpu.length=0", () => {
    // AC2: 사용자가 cpuCount=0 으로 변경 → draft 저장 → initGame 에서 적용 시
    // 실제 게임 상태에 CPU 지렁이가 없어야 함 (솔로 모드).
    const draft = { ...SNAKE_SETTINGS_DEFAULTS, cpuCount: 0 };
    const merged = validateAndMergeSettings(draft);
    assert.equal(merged.cpuCount, 0, "cpuCount=0 draft 가 validateAndMergeSettings 후 0 이 아님");
    const gameState = createInitialState(20, 20, 0, merged);
    assert.equal(
      gameState.cpu.length,
      0,
      "cpuCount=0 설정으로 게임 시작 시 cpu 배열이 비어있지 않음 — 설정값이 게임에 반영 안 됨 (AC2 회귀)",
    );
  });

  test("§7-3 initialLength=5 draft → validateAndMergeSettings → createInitialState → snake.length=5", () => {
    // AC2: 사용자가 시작 길이 5 로 변경 → 게임 시작 시 snake.length === 5.
    const draft = { ...SNAKE_SETTINGS_DEFAULTS, initialLength: 5 };
    const merged = validateAndMergeSettings(draft);
    assert.equal(merged.initialLength, 5, "initialLength=5 draft 가 validateAndMergeSettings 후 5 이 아님");
    const gameState = createInitialState(20, 20, 0, merged);
    assert.equal(
      gameState.snake.length,
      5,
      "initialLength=5 설정으로 게임 시작 시 snake.length 가 5 가 아님 — 설정값이 게임에 반영 안 됨 (AC2 회귀)",
    );
  });

  test("§7-4 difficulty='easy' draft → createInitialState → state.settings.difficulty='easy'", () => {
    // AC2: 사용자가 난이도 easy 로 변경 → 게임 상태에 반영.
    const draft = { ...SNAKE_SETTINGS_DEFAULTS, difficulty: "easy" };
    const merged = validateAndMergeSettings(draft);
    assert.equal(merged.difficulty, "easy", "difficulty='easy' draft 가 validateAndMergeSettings 후 'easy' 가 아님");
    const gameState = createInitialState(20, 20, 0, merged);
    assert.equal(
      gameState.settings.difficulty,
      "easy",
      "difficulty='easy' 설정으로 게임 시작 시 state.settings.difficulty 가 'easy' 가 아님 (AC2 회귀)",
    );
  });

  test("§7-5 timeLimitSec=180 draft → validateAndMergeSettings → state.settings.timeLimitSec=180", () => {
    // AC2: 사용자가 시간 제한 3분(180초) 설정 → 게임 상태에 반영.
    const draft = { ...SNAKE_SETTINGS_DEFAULTS, timeLimitSec: 180 };
    const merged = validateAndMergeSettings(draft);
    assert.equal(merged.timeLimitSec, 180, "timeLimitSec=180 draft 가 validateAndMergeSettings 후 180 이 아님");
    const gameState = createInitialState(20, 20, 0, merged);
    assert.equal(
      gameState.settings.timeLimitSec,
      180,
      "timeLimitSec=180 설정으로 게임 시작 시 state.settings.timeLimitSec 가 180 이 아님 (AC2 회귀)",
    );
  });

  test("§7-6 timeLimitSec=null draft → validateAndMergeSettings → state.settings.timeLimitSec=null (무제한)", () => {
    // AC2: 무제한 선택 시 null 이 유지되어야 함 (시간 제한 HUD 미표시 조건).
    const draft = { ...SNAKE_SETTINGS_DEFAULTS, timeLimitSec: null };
    const merged = validateAndMergeSettings(draft);
    assert.equal(merged.timeLimitSec, null, "timeLimitSec=null draft 가 validateAndMergeSettings 후 null 이 아님");
    const gameState = createInitialState(20, 20, 0, merged);
    assert.equal(
      gameState.settings.timeLimitSec,
      null,
      "timeLimitSec=null(무제한) 설정이 게임 상태에 반영되지 않음 (AC2 회귀)",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §8. 회귀 가드 — 전체 draft 흐름 연결성 (AC3)
// ═══════════════════════════════════════════════════════════════

describe("BF-594 §8 회귀 가드 — 전체 draft 흐름 연결성 (AC3)", () => {
  test("§8-1 settingsModalEl 이벤트 위임 — .ctrl-radio 클릭 시 handleRadioClick 호출 경로 존재", () => {
    // settingsModalEl click 위임 핸들러 내에 handleRadioClick 호출이 없으면
    // 라디오 버튼 클릭이 handleRadioClick 까지 도달하지 않음.
    const delegatedHandlerIdx = gameJs.indexOf("settingsModalEl.addEventListener");
    assert.ok(delegatedHandlerIdx !== -1, "settingsModalEl 이벤트 위임 핸들러 없음 — 삭제 회귀");
    const slice = gameJs.slice(delegatedHandlerIdx, delegatedHandlerIdx + 800);
    assert.ok(
      /handleRadioClick/.test(slice),
      "settingsModalEl 이벤트 위임 핸들러에서 handleRadioClick 호출 없음 — " +
      "라디오 버튼 클릭이 draft 에 도달 안 됨 (AC1 + AC3 회귀)",
    );
    assert.ok(
      /handleToggleClick/.test(slice),
      "settingsModalEl 이벤트 위임 핸들러에서 handleToggleClick 호출 없음 — " +
      "토글 스위치 클릭이 draft 에 도달 안 됨 (AC1 + AC3 회귀)",
    );
  });

  test("§8-2 settingsBtnSaveEl click 핸들러 → saveSettingsModal() 호출 바인딩 존재", () => {
    // 저장 버튼이 saveSettingsModal 에 바인딩되지 않으면 클릭해도 아무 일도 일어나지 않음.
    assert.ok(
      /settingsBtnSaveEl\.addEventListener\(\s*["']click["']/.test(gameJs),
      "settingsBtnSaveEl click 핸들러 바인딩 없음 — 저장 버튼 클릭 무반응 (AC2 회귀)",
    );
    // saveSettingsModal 이 실제로 호출되는지 확인 (화살표 함수 안에서)
    const bindIdx = gameJs.indexOf("settingsBtnSaveEl.addEventListener");
    const slice = gameJs.slice(bindIdx, bindIdx + 200);
    assert.ok(
      /saveSettingsModal\s*\(\s*\)/.test(slice),
      "settingsBtnSaveEl click 핸들러가 saveSettingsModal() 를 호출하지 않음 (AC2 회귀)",
    );
  });

  test("§8-3 initGame — pendingSettings 가 있으면 currentSettings 로 promote 경로 존재 (설정 반영 완주)", () => {
    // initGame 에서 pendingSettings → currentSettings promote 가 없으면
    // saveSettingsModal → pendingSettings = merged 까지는 됐지만
    // 게임 시작 시 currentSettings 가 갱신되지 않아 기존 설정으로 게임이 시작됨.
    const idx = gameJs.indexOf("function initGame(");
    assert.ok(idx !== -1, "initGame 함수 없음");
    const body = extractFunctionBody(gameJs, idx);
    assert.ok(
      /currentSettings\s*=\s*pendingSettings/.test(body),
      "initGame 에 currentSettings = pendingSettings promote 없음 — " +
      "저장 후 게임 시작 시 설정 미반영 (AC2 회귀)",
    );
    assert.ok(
      /pendingSettings\s*=\s*null/.test(body),
      "initGame 에 pendingSettings = null 초기화 없음 — " +
      "pendingSettings 가 잔류해 재시작마다 동일 설정 강제 적용됨 (AC3 회귀)",
    );
  });

  test("§8-4 closeSettingsModal — 'save' outcome 로 닫힌 후에도 pendingSettings 보존 (draftSettings=null 이후)", () => {
    // closeSettingsModal 이 draftSettings = null 로 초기화하더라도
    // pendingSettings 는 그 이전 saveSettingsModal 에서 이미 설정됐으므로 유지되어야 함.
    // → closeSettingsModal 내부에서 pendingSettings 를 건드리지 않아야 함.
    const idx = gameJs.indexOf("function closeSettingsModal(");
    assert.ok(idx !== -1, "closeSettingsModal 함수 없음");
    const body = extractFunctionBody(gameJs, idx);
    // closeSettingsModal 이 pendingSettings 를 리셋하면 안 됨 (saveSettingsModal 이 설정한 값 보존)
    assert.ok(
      !/pendingSettings\s*=\s*null/.test(body),
      "closeSettingsModal 내부에서 pendingSettings = null 재설정 중 — " +
      "saveSettingsModal 이 설정한 pendingSettings 가 소멸되어 게임 설정 미반영 (AC2 회귀)",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §9. CSS 회귀 가드 — #settings-modal[hidden] { display: none } 규칙 존재 (AC2 + AC3)
// ═══════════════════════════════════════════════════════════════
//
// 근본 원인 (BF-594 재수정):
//   #settings-modal 에 CSS display:flex 가 있으면
//   HTML [hidden] attribute 가 UA stylesheet 의 [hidden]{display:none} 에 의존하는데
//   author stylesheet 의 display:flex (specificity 더 높음) 가 이를 덮어써서
//   hidden attribute 를 설정해도 모달이 화면에 그대로 남음.
//
//   closeSettingsModal("save") 호출 → hidden 설정 → 모달 여전히 표시 →
//   draftSettings = null → 사용자가 저장 재시도 → "draft 없음" 오류.
//
//   #gameover-overlay / #paused-overlay 는 이미 동일 패턴의 [hidden]{display:none} 보유.
//   #settings-modal 만 누락 → 이 회귀 가드로 재발 방지.
//
// 실패 = CSS [hidden] 규칙이 삭제됨 → 모달이 닫히지 않는 동일 버그 재발.

describe("BF-594 §9 CSS 회귀 가드 — #settings-modal[hidden]{display:none} 규칙 존재 (AC2 + AC3)", () => {
  test("§9-1 styles.css 에 #settings-modal[hidden] { display: none } 규칙 존재", () => {
    // display:flex 가 UA [hidden]{display:none} 을 덮으므로 author stylesheet 에 명시 필요.
    // 이 규칙이 없으면 closeSettingsModal 이 hidden attribute 를 설정해도 모달이 닫히지 않음
    // → draftSettings=null 이 된 후 사용자가 다시 저장 시도 → "draft 없음" 오류 재발.
    assert.ok(
      /#settings-modal\s*\[hidden\]/.test(stylesCs),
      "styles.css 에 #settings-modal[hidden] 선택자 없음 — " +
      "display:flex 가 [hidden] attribute 를 무력화하여 모달이 닫히지 않음 (AC2 + AC3 회귀)",
    );
    assert.ok(
      // #settings-modal[hidden] 블록 안에 display: none 이 있는지 확인
      /#settings-modal\s*\[hidden\][^}]*display\s*:\s*none/.test(stylesCs),
      "styles.css 의 #settings-modal[hidden] 블록에 display:none 없음 — " +
      "모달이 hidden 설정 후에도 화면에 표시되어 게임 진행 불가 (AC2 회귀)",
    );
  });

  test("§9-2 #gameover-overlay / #paused-overlay 와 동일한 패턴 적용 확인", () => {
    // 기존 오버레이들이 이미 [hidden]{display:none} 을 보유한 이유와 동일 원인.
    // settings-modal 만 이 패턴이 누락되어 있었음.
    assert.ok(
      /#gameover-overlay\s*\[hidden\][^}]*display\s*:\s*none/.test(stylesCs),
      "#gameover-overlay[hidden]{display:none} 패턴 없음 — 기준 패턴 자체가 제거된 이상 상태",
    );
    assert.ok(
      /#paused-overlay\s*\[hidden\][^}]*display\s*:\s*none/.test(stylesCs),
      "#paused-overlay[hidden]{display:none} 패턴 없음 — 기준 패턴 자체가 제거된 이상 상태",
    );
    assert.ok(
      /#settings-modal\s*\[hidden\][^}]*display\s*:\s*none/.test(stylesCs),
      "#settings-modal[hidden]{display:none} 패턴이 다른 오버레이들과 같이 존재해야 함 (AC3 회귀)",
    );
  });
});
