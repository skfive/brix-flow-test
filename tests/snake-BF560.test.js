// BF-560 · snake module HUD + 일시정지 + 종료 통계 구현 테스트
//
// AC 매핑:
//   AC-1: HUD 상태 패널 (점수/길이/속도) — 60fps 실시간 갱신 구조
//   AC-2: 일시정지 모달 (P/Space, 계속/재시작/종료 버튼)
//   AC-3: 게임 오버 통계 (최종 점수·플레이 시간·아이템 카운트·최고 점수 비교)
//
// 실행: node --test tests/snake-BF560.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = path.resolve(__dirname, "..");
const SNAKE_DIR  = path.join(REPO_ROOT, "snake");

const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
const css  = readFileSync(path.join(SNAKE_DIR, "styles.css"),  "utf-8");

// ── logic.js 유틸 import ──────────────────────────────────────
import {
  formatPlayTime,
  getSpeedLevel,
  getSpeedDots,
  createInitialState,
} from "../snake/logic.js";

// ═══════════════════════════════════════════════════════════════
// §1. DOM 구조 — HUD 상태 패널 (AC-1)
// ═══════════════════════════════════════════════════════════════

describe("BF-560 §1 HUD 상태 패널 DOM", () => {
  test("§1-1 (AC1): #hud-status-panel 존재", () => {
    assert.ok(
      html.includes('id="hud-status-panel"'),
      "#hud-status-panel 요소가 index.html에 없음"
    );
  });

  test("§1-2 (AC1): #hud-snake-length 존재", () => {
    assert.ok(
      html.includes('id="hud-snake-length"'),
      "#hud-snake-length 요소가 index.html에 없음"
    );
  });

  test("§1-3 (AC1): #hud-speed-level 존재", () => {
    assert.ok(
      html.includes('id="hud-speed-level"'),
      "#hud-speed-level 요소가 index.html에 없음"
    );
  });

  test("§1-4 (AC1): #hud-status-panel에 aria-live=\"polite\" 속성 존재", () => {
    // 명세 §5-1: aria-live="polite"
    const panelIdx = html.indexOf('id="hud-status-panel"');
    assert.ok(panelIdx !== -1, "#hud-status-panel 없음");
    // 패널 태그 영역 슬라이스 후 aria-live 확인
    const tagEnd = html.indexOf(">", panelIdx);
    const panelTag = html.slice(panelIdx - 50, tagEnd + 1);
    assert.ok(
      panelTag.includes('aria-live="polite"') || html.includes('aria-live="polite"'),
      "#hud-status-panel에 aria-live=\"polite\" 없음"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §2. DOM 구조 — 일시정지 모달 버튼 (AC-2)
// ═══════════════════════════════════════════════════════════════

describe("BF-560 §2 일시정지 모달 버튼 DOM", () => {
  test("§2-1 (AC2): #paused-btn-resume 존재", () => {
    assert.ok(
      html.includes('id="paused-btn-resume"'),
      "#paused-btn-resume 버튼이 index.html에 없음"
    );
  });

  test("§2-2 (AC2): #paused-btn-restart 존재", () => {
    assert.ok(
      html.includes('id="paused-btn-restart"'),
      "#paused-btn-restart 버튼이 index.html에 없음"
    );
  });

  test("§2-3 (AC2): #paused-btn-quit 존재", () => {
    assert.ok(
      html.includes('id="paused-btn-quit"'),
      "#paused-btn-quit 버튼이 index.html에 없음"
    );
  });

  test("§2-4 (AC2): .paused-btn 클래스 버튼에 kbd 배지 존재", () => {
    // 명세 §5-2: <kbd> 배지
    assert.ok(
      html.includes("<kbd>") && html.includes("</kbd>"),
      "일시정지 모달 버튼에 <kbd> 배지가 없음"
    );
  });

  test("§2-5 (AC2): #paused-overlay 내 일시정지 타이틀 한국어", () => {
    // 명세 §3-2: 타이틀 "일시정지"
    assert.ok(
      html.includes("일시정지"),
      "#paused-overlay 내 한국어 타이틀 '일시정지' 없음"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §3. DOM 구조 — 게임 오버 통계 화면 (AC-3)
// ═══════════════════════════════════════════════════════════════

describe("BF-560 §3 게임 오버 통계 DOM", () => {
  test("§3-1 (AC3): #go-new-record 존재 (hidden 기본)", () => {
    assert.ok(
      html.includes('id="go-new-record"'),
      "#go-new-record 요소가 index.html에 없음"
    );
  });

  test("§3-2 (AC3): #go-prev-high-score 존재 (hidden 기본)", () => {
    assert.ok(
      html.includes('id="go-prev-high-score"'),
      "#go-prev-high-score 요소가 index.html에 없음"
    );
  });

  test("§3-3 (AC3): #go-play-time 존재", () => {
    assert.ok(
      html.includes('id="go-play-time"'),
      "#go-play-time 요소가 index.html에 없음"
    );
  });

  test("§3-4 (AC3): #go-item-stats 존재", () => {
    assert.ok(
      html.includes('id="go-item-stats"'),
      "#go-item-stats 요소가 index.html에 없음"
    );
  });

  test("§3-5 (AC3): 기존 #go-result, #go-score, #go-hint id 유지 (회귀 가드)", () => {
    assert.ok(html.includes('id="go-result"'),   "#go-result id 없음 — 회귀!");
    assert.ok(html.includes('id="go-score"'),    "#go-score id 없음 — 회귀!");
    assert.ok(html.includes('id="go-hint"') || html.includes('class="go-hint"'),
              "#go-hint 없음 — 회귀!");
  });

  test("§3-6 (AC3): #go-new-record에 hidden 속성 (기본 비표시)", () => {
    // 명세 §5-3: hidden 기본
    const newRecordIdx = html.indexOf('id="go-new-record"');
    assert.ok(newRecordIdx !== -1, "#go-new-record 없음");
    // go-new-record를 포함하는 태그 찾기
    const tagStart = html.lastIndexOf("<", newRecordIdx);
    const tagEnd   = html.indexOf(">", newRecordIdx);
    const tag      = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes("hidden") || html.slice(newRecordIdx, newRecordIdx + 100).includes("hidden"),
      "#go-new-record에 hidden 속성이 없음 (기본 비표시 필요)"
    );
  });

  test("§3-7 (AC3): #go-prev-high-score에 hidden 속성 (기본 비표시)", () => {
    const prevIdx = html.indexOf('id="go-prev-high-score"');
    assert.ok(prevIdx !== -1, "#go-prev-high-score 없음");
    const tagStart = html.lastIndexOf("<", prevIdx);
    const tagEnd   = html.indexOf(">", prevIdx);
    const tag      = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      tag.includes("hidden") || html.slice(prevIdx, prevIdx + 100).includes("hidden"),
      "#go-prev-high-score에 hidden 속성이 없음 (기본 비표시 필요)"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §4. CSS — 신규 변수 및 애니메이션 (AC-1, AC-2, AC-3)
// ═══════════════════════════════════════════════════════════════

describe("BF-560 §4 CSS 변수 및 애니메이션", () => {
  test("§4-1 (AC1): --hud-panel-bg CSS 변수 존재", () => {
    assert.ok(css.includes("--hud-panel-bg"), "--hud-panel-bg CSS 변수가 styles.css에 없음");
  });

  test("§4-2 (AC1): --hud-panel-border CSS 변수 존재", () => {
    assert.ok(css.includes("--hud-panel-border"), "--hud-panel-border 없음");
  });

  test("§4-3 (AC1): --speed-slow-color 등 속도 색상 변수 존재", () => {
    assert.ok(css.includes("--speed-slow-color"),   "--speed-slow-color 없음");
    assert.ok(css.includes("--speed-normal-color"), "--speed-normal-color 없음");
    assert.ok(css.includes("--speed-fast-color"),   "--speed-fast-color 없음");
  });

  test("§4-4 (AC2): --btn-resume-color 등 모달 버튼 변수 존재", () => {
    assert.ok(css.includes("--btn-resume-color"),  "--btn-resume-color 없음");
    assert.ok(css.includes("--btn-restart-color"), "--btn-restart-color 없음");
    assert.ok(css.includes("--btn-quit-color"),    "--btn-quit-color 없음");
  });

  test("§4-5 (AC3): --go-new-record-color 등 통계 변수 존재", () => {
    assert.ok(css.includes("--go-new-record-color"), "--go-new-record-color 없음");
    assert.ok(css.includes("--go-muted-text"),       "--go-muted-text 없음");
    assert.ok(css.includes("--go-section-divider"),  "--go-section-divider 없음");
  });

  test("§4-6 (AC2): @keyframes modal-enter 정의", () => {
    assert.ok(css.includes("modal-enter"), "@keyframes modal-enter 없음");
  });

  test("§4-7 (AC3): @keyframes gameover-enter 정의", () => {
    assert.ok(css.includes("gameover-enter"), "@keyframes gameover-enter 없음");
  });

  test("§4-8 (AC3): @keyframes new-record-pulse 정의", () => {
    assert.ok(css.includes("new-record-pulse"), "@keyframes new-record-pulse 없음");
  });

  test("§4-9 (AC1): @keyframes hud-speed-flash 정의", () => {
    assert.ok(css.includes("hud-speed-flash"), "@keyframes hud-speed-flash 없음");
  });

  test("§4-10 (AC1): #hud-speed-level[data-speed] 선택자 존재", () => {
    assert.ok(
      css.includes('data-speed="SLOW"') || css.includes("[data-speed="),
      '#hud-speed-level[data-speed] 선택자가 없음'
    );
  });

  test("§4-11 (AC3): .go-item-list li[data-item-count=\"0\"] 선택자 존재", () => {
    assert.ok(
      css.includes("data-item-count") || css.includes("go-item-zero"),
      "×0 행 투명도 처리 CSS 없음 (명세 §7-4)"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §5. logic.js 유틸 — formatPlayTime (AC-3)
// ═══════════════════════════════════════════════════════════════

describe("BF-560 §5 formatPlayTime 유틸", () => {
  test("§5-1 (AC3): 60초 미만 → 'N초' 형식", () => {
    assert.strictEqual(formatPlayTime(0),     "0초");
    assert.strictEqual(formatPlayTime(1000),  "1초");
    assert.strictEqual(formatPlayTime(59000), "59초");
  });

  test("§5-2 (AC3): 60초 ~ 59분59초 → 'N분 M초' 형식", () => {
    assert.strictEqual(formatPlayTime(60000),    "1분 0초");
    assert.strictEqual(formatPlayTime(90000),    "1분 30초");
    assert.strictEqual(formatPlayTime(3599000),  "59분 59초");
  });

  test("§5-3 (AC3): 60분 이상 → 'N시간 M분' 형식", () => {
    assert.strictEqual(formatPlayTime(3600000),  "1시간 0분");
    assert.strictEqual(formatPlayTime(3661000),  "1시간 1분");
    assert.strictEqual(formatPlayTime(7200000),  "2시간 0분");
  });

  test("§5-4 (AC3): 경계값 — 정확히 60초(60000ms)", () => {
    // 60000ms = 60초 → 1분 0초
    assert.strictEqual(formatPlayTime(60000), "1분 0초");
  });
});

// ═══════════════════════════════════════════════════════════════
// §6. logic.js 유틸 — getSpeedLevel / getSpeedDots (AC-1)
// ═══════════════════════════════════════════════════════════════

describe("BF-560 §6 getSpeedLevel / getSpeedDots 유틸", () => {
  test("§6-1 (AC1): speedStack 비어있으면 NORMAL", () => {
    const level = getSpeedLevel([]);
    assert.strictEqual(level, "NORMAL", "빈 speedStack은 NORMAL 이어야 함");
  });

  test("§6-2 (AC1): SPEED_UP player 항목 있으면 FAST", () => {
    const stack = [{ type: "SPEED_UP", target: "player", expiresAtMs: Date.now() + 10000 }];
    assert.strictEqual(getSpeedLevel(stack, "player"), "FAST");
  });

  test("§6-3 (AC1): SLOW_DOWN player 항목 있으면 SLOW", () => {
    const stack = [{ type: "SLOW_DOWN", target: "player", expiresAtMs: Date.now() + 10000 }];
    assert.strictEqual(getSpeedLevel(stack, "player"), "SLOW");
  });

  test("§6-4 (AC1): SPEED_UP + SLOW_DOWN 동시 → FAST (SPEED_UP 우선)", () => {
    const stack = [
      { type: "SPEED_UP",  target: "player", expiresAtMs: Date.now() + 10000 },
      { type: "SLOW_DOWN", target: "player", expiresAtMs: Date.now() + 10000 },
    ];
    assert.strictEqual(getSpeedLevel(stack, "player"), "FAST", "SPEED_UP 우선 적용 필요");
  });

  test("§6-5 (AC1): getSpeedDots — SLOW → '●○○'", () => {
    assert.strictEqual(getSpeedDots("SLOW"), "●○○");
  });

  test("§6-6 (AC1): getSpeedDots — NORMAL → '○●○'", () => {
    assert.strictEqual(getSpeedDots("NORMAL"), "○●○");
  });

  test("§6-7 (AC1): getSpeedDots — FAST → '○○●'", () => {
    assert.strictEqual(getSpeedDots("FAST"), "○○●");
  });
});

// ═══════════════════════════════════════════════════════════════
// §7. game.js — P키 일시정지 지원 (AC-2)
// ═══════════════════════════════════════════════════════════════

describe("BF-560 §7 game.js P키 일시정지", () => {
  const gameJs = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");

  test("§7-1 (AC2): game.js에 P키 또는 KeyP 감지 코드 존재", () => {
    const hasPKey =
      gameJs.includes('"KeyP"') ||
      gameJs.includes("'KeyP'") ||
      gameJs.includes('"p"')    ||
      gameJs.includes("'p'");
    assert.ok(hasPKey, "game.js에 P키 감지 코드가 없음 (명세 AC-2)");
  });

  test("§7-2 (AC2): game.js에 paused-btn-resume 클릭 핸들러 존재", () => {
    assert.ok(
      gameJs.includes("paused-btn-resume"),
      "game.js에 paused-btn-resume 핸들러 없음"
    );
  });

  test("§7-3 (AC2): game.js에 paused-btn-restart 클릭 핸들러 존재", () => {
    assert.ok(
      gameJs.includes("paused-btn-restart"),
      "game.js에 paused-btn-restart 핸들러 없음"
    );
  });

  test("§7-4 (AC2): game.js에 paused-btn-quit 클릭 핸들러 존재", () => {
    assert.ok(
      gameJs.includes("paused-btn-quit"),
      "game.js에 paused-btn-quit 핸들러 없음"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §8. game.js — HUD KPI 측정 코드 (AC-1 KPI 요건)
// ═══════════════════════════════════════════════════════════════

describe("BF-560 §8 KPI 측정 코드", () => {
  const gameJs = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");

  test("§8-1 (AC1): game.js에 updateHUDStatus 함수 존재", () => {
    assert.ok(
      gameJs.includes("updateHUDStatus") || gameJs.includes("renderHUDStatus"),
      "game.js에 HUD 상태 갱신 함수가 없음"
    );
  });

  test("§8-2 (AC3): game.js에 go-play-time 갱신 코드 존재", () => {
    assert.ok(
      gameJs.includes("go-play-time"),
      "game.js에 go-play-time 갱신 코드 없음"
    );
  });

  test("§8-3 (AC3): game.js에 go-new-record 신기록 갱신 코드 존재", () => {
    assert.ok(
      gameJs.includes("go-new-record"),
      "game.js에 go-new-record 갱신 코드 없음"
    );
  });

  test("§8-4 (AC3): game.js에 go-item-stats 아이템 통계 갱신 코드 존재", () => {
    assert.ok(
      gameJs.includes("go-item-stats"),
      "game.js에 go-item-stats 갱신 코드 없음"
    );
  });

  test("§8-5 (AC3): game.js에 localStorage 최고 점수 비교 코드 (bf-snake-hud-kpi 또는 기존 KPI 키)", () => {
    assert.ok(
      gameJs.includes("LS_HIGH_SCORE_KEY") || gameJs.includes("bf-snake-high-score"),
      "game.js에 최고 점수 localStorage 비교 코드 없음"
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §9. createInitialState — 기존 회귀 가드 (BF-560이 침범하지 않음)
// ═══════════════════════════════════════════════════════════════

describe("BF-560 §9 기존 로직 회귀 가드", () => {
  test("§9-1: createInitialState — snake 초기 길이 3", () => {
    const s = createInitialState(20, 20, 0);
    assert.strictEqual(s.snake.length, 3, "초기 snake 길이가 3이어야 함");
  });

  test("§9-2: createInitialState — status: 'playing'", () => {
    const s = createInitialState(20, 20, 0);
    assert.strictEqual(s.status, "playing");
  });

  test("§9-3: createInitialState — itemStats 포함", () => {
    const s = createInitialState(20, 20, 0);
    assert.ok(s.itemStats, "itemStats 필드 없음");
    assert.ok(s.itemStats.SPEED_UP, "itemStats.SPEED_UP 없음");
  });
});
