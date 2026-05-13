// BF-488 · 타이머 SPA 정적 계약 테스트 (timer/app.js + index.html + styles.css)
// 명세: docs/design/timer-BF-485.md / timer-BF-486.md
//
// 검증 목표 (Epic AC 매핑):
//   AC1 — /timer/ 진입 시 분/초 입력 폼 + 카운트다운 영역 + 컨트롤 버튼 표시 + dark default
//   AC2 — 시작/일시정지/재개/리셋 상태 전이 + 0:00 종료 알림 로직
//   AC3 — localStorage 영속 (bf-timer-last-config) + bf-theme 복원
//
// 작성 방침: fs.readFileSync + includes/regex — DOM 없이 파일 내용 정적 검사.
// tech-stack: vanilla-static (IIFE, no import/export/fetch/CDN)

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const TIMER_HTML = path.join(REPO_ROOT, "timer", "index.html");
const TIMER_APP = path.join(REPO_ROOT, "timer", "app.js");
const TIMER_CSS = path.join(REPO_ROOT, "timer", "styles.css");

// ─────────────────────────────────────────────────────────────────────────────
// AC1-A: index.html — dark default + flicker 방지 IIFE
// ─────────────────────────────────────────────────────────────────────────────

test("BF-488 AC1: index.html 초기 data-theme 이 dark (dark default)", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(
    html.includes('data-theme="dark"'),
    'index.html 에 data-theme="dark" 없음 — BF-485 §6.1 dark default 위반',
  );
});

test("BF-488 AC1: index.html head IIFE 에 bf-theme 키 + </head> 이전 배치", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  const iifePos = html.indexOf('localStorage.getItem("bf-theme")');
  assert.ok(
    iifePos !== -1,
    "head IIFE 에 bf-theme 조회 없음 — flicker 방지 IIFE 미삽입",
  );
  assert.ok(
    iifePos < html.indexOf("</head>"),
    "bf-theme IIFE 가 </head> 이후에 위치 — paint 전 실행 불가 (flicker 방지 실패)",
  );
});

test("BF-488 AC1: index.html 에 외부 CDN <script src='https://...'> 없음 (vanilla-static)", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(
    !/<script[^>]+src=["']https?:\/\//i.test(html),
    "index.html 에 외부 CDN script 있음 — vanilla-static 위반",
  );
});

test("BF-488 AC1: index.html 이 app.js 를 type=module 없이 로드 (file:// 안전)", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(
    html.includes('src="app.js"') || html.includes("src='app.js'"),
    'index.html 이 src="app.js" 로 로드하지 않음 — BF-488 출력 artifact 미반영',
  );
  assert.ok(
    !html.includes('type="module"'),
    'index.html 에 type="module" 있음 — file:// CORS 오류 유발 (vanilla-static 위반)',
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC1-B: index.html — BF-485 §5 컴포넌트 DOM ID 계약
// ─────────────────────────────────────────────────────────────────────────────

test("BF-488 AC1: index.html 에 BF-485 §5 필수 DOM ID 전체 존재", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  const requiredIds = [
    // §5.1 TimerDisplay
    "display",          // role="timer", aria-live="off"
    "disp-m",           // 분 span
    "disp-s",           // 초 span
    // §5.2 TimeInputPair
    "input-pair",       // idle 전용 (hidden attr)
    "input-m",          // 분 input (0–99)
    "input-s",          // 초 input (0–59)
    // §5.3 ControlButtons
    "btn-primary",      // 시작/일시정지/재개
    "btn-reset",        // 리셋
    // §5.4 EndedBanner
    "ended-banner",     // role="status", aria-live="polite"
    "btn-banner-close", // 배너 닫기
    // §4.7 hint
    "hint",
    // §5.5 theme-toggle
    "theme-toggle",
  ];
  for (const id of requiredIds) {
    assert.ok(
      html.includes(`id="${id}"`),
      `index.html 에 id="${id}" 없음 — BF-485 §5 selector 계약 위반`,
    );
  }
});

test("BF-488 AC1: index.html #ended-banner 에 role='status' + aria-live='polite' + hidden", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(
    html.includes('role="status"'),
    "ended-banner 에 role='status' 없음 — §5.4 위반",
  );
  assert.ok(
    html.includes('aria-live="polite"'),
    "ended-banner 에 aria-live='polite' 없음 — §5.4 위반",
  );
});

test("BF-488 AC1: index.html #display 에 role='timer' + aria-live='off'", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(
    html.includes('role="timer"'),
    "display 에 role='timer' 없음 — §5.1 위반",
  );
  assert.ok(
    html.includes('aria-live="off"'),
    "display 에 aria-live='off' 없음 — §5.1 위반",
  );
});

test("BF-488 AC1: index.html #input-m 이 min=0 max=99, #input-s 가 min=0 max=59", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  // input-m: max=99
  const inputMBlock = html.slice(html.indexOf('id="input-m"') - 200, html.indexOf('id="input-m"') + 200);
  assert.ok(inputMBlock.includes('max="99"'), '#input-m 의 max="99" 없음 — §5.2 위반');
  // input-s: max=59
  const inputSBlock = html.slice(html.indexOf('id="input-s"') - 200, html.indexOf('id="input-s"') + 200);
  assert.ok(inputSBlock.includes('max="59"'), '#input-s 의 max="59" 없음 — §5.2 위반');
});

// ─────────────────────────────────────────────────────────────────────────────
// AC2: app.js — vanilla-static 계약 + 카운트다운 로직
// ─────────────────────────────────────────────────────────────────────────────

test("BF-488 AC2: app.js 가 IIFE 패턴 (no import/export/module)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes("(function ()") ||
      js.includes("(function() ") ||
      js.includes("(function(){"),
    "app.js 에 IIFE 패턴 없음 — vanilla-static IIFE 규칙 위반",
  );
});

test("BF-488 AC2: app.js 에 import 구문 없음 (vanilla-static — file:// CORS 안전)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    !/^\s*import\s+/m.test(js),
    "app.js 에 import 구문 있음 — vanilla-static 위반",
  );
});

test("BF-488 AC2: app.js 에 export 구문 없음 (vanilla-static)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    !/^\s*export\s+/m.test(js),
    "app.js 에 export 구문 있음 — vanilla-static 위반",
  );
});

test("BF-488 AC2: app.js 에 fetch() 없음 (외부 API 호출 금지)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(!js.includes("fetch("), "app.js 에 fetch() 호출 있음 — vanilla-static 위반");
});

test("BF-488 AC2: app.js 에 외부 CDN URL (https://) 없음", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(!js.includes("https://"), "app.js 에 외부 CDN URL 있음 — vanilla-static 위반");
});

test("BF-488 AC2: app.js 가 4가지 phase 상태 전이를 포함 (idle/running/paused/ended)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(js.includes('"idle"'), 'app.js 에 "idle" 상태 없음 — 상태 기계 위반');
  assert.ok(js.includes('"running"'), 'app.js 에 "running" 상태 없음');
  assert.ok(js.includes('"paused"'), 'app.js 에 "paused" 상태 없음');
  assert.ok(js.includes('"ended"'), 'app.js 에 "ended" 상태 없음 — 종료 알림 구현 누락');
});

test("BF-488 AC2: app.js 가 rAF + performance.now 기반 tick 루프 사용", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes("requestAnimationFrame"),
    "app.js 에 requestAnimationFrame 없음 — rAF tick 루프 미구현",
  );
  assert.ok(
    js.includes("performance.now"),
    "app.js 에 performance.now 없음 — drift-correction 미구현",
  );
});

test("BF-488 AC2: app.js 가 bannerEl.hidden 갱신으로 종료 배너 제어", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes("bannerEl.hidden"),
    "app.js 에 bannerEl.hidden 갱신 없음 — 종료 배너 표시 불가",
  );
});

test("BF-488 AC2: app.js 가 inputPairEl.hidden 갱신 (idle 전용 노출 §5.2)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes("inputPairEl.hidden"),
    "app.js 에 inputPairEl.hidden 갱신 없음 — idle 전용 input 노출 로직 미구현",
  );
});

test("BF-488 AC2: app.js 가 Space / Escape 단축키 핸들러 포함 (§7.2)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes('"Escape"') || js.includes("'Escape'"),
    "app.js 에 Escape 키 핸들러 없음 — §7.2 리셋 단축키 미구현",
  );
  assert.ok(
    js.includes('" "') || js.includes("' '") ||
      js.includes('"Space"') || js.includes("'Space'"),
    "app.js 에 Space 키 핸들러 없음 — §7.2 시작/정지 단축키 미구현",
  );
});

test("BF-488 AC2: app.js 가 T 키 테마 단축키 핸들러 포함 (§7.2)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes(".toLowerCase()") && (js.includes('"t"') || js.includes("'t'")),
    "app.js 에 T 키 테마 단축키 없음 — §7.2 위반",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC3: localStorage 영속 (bf-timer-last-config + bf-theme)
// ─────────────────────────────────────────────────────────────────────────────

test("BF-488 AC3: app.js 가 bf-timer-last-config 키를 사용 (BF-485 §6)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes('"bf-timer-last-config"') || js.includes("'bf-timer-last-config'"),
    "app.js 에 'bf-timer-last-config' 키 없음 — §6 localStorage 계약 위반",
  );
});

test("BF-488 AC3: app.js 가 bf-theme 키를 사용 (전 SPA 공유 키)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes('"bf-theme"') || js.includes("'bf-theme'"),
    "app.js 에 'bf-theme' 키 없음 — §6.1 head IIFE + 테마 영속 계약 위반",
  );
});

test("BF-488 AC3: app.js 가 localStorage.setItem + getItem 사용 (저장 + 복원)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes("localStorage.setItem"),
    "app.js 에 localStorage.setItem 없음 — 마지막 설정값 저장 불가",
  );
  assert.ok(
    js.includes("localStorage.getItem"),
    "app.js 에 localStorage.getItem 없음 — 재방문 복원 불가",
  );
});

test("BF-488 AC3: app.js 가 data-theme attribute 설정 (bf-theme 복원)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes('setAttribute("data-theme"') ||
      js.includes("setAttribute('data-theme'"),
    "app.js 에 data-theme attribute 설정 없음 — bf-theme 복원 로직 미구현",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// styles.css — BF-485 §2 토큰 계약 검증
// ─────────────────────────────────────────────────────────────────────────────

test("BF-488 CSS: styles.css 에 dark 기본 토큰 색상 값 존재 (§2.1)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  const darkTokens = [
    "--color-bg-canvas",
    "--color-bg-surface",
    "--color-text-primary",
    "--color-accent",
    "--color-danger",
    "--color-timer-running",
    "--color-timer-paused",
    "--color-timer-ended-bg",
    "--color-timer-ended-text",
  ];
  for (const token of darkTokens) {
    assert.ok(
      css.includes(token),
      `styles.css 에 ${token} 없음 — BF-485 §2.1 dark 토큰 누락`,
    );
  }
});

test("BF-488 CSS: styles.css 에 [data-theme='light'] 오버라이드 섹션 존재 (§2.2)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(
    css.includes('[data-theme="light"]') || css.includes("[data-theme='light']"),
    "styles.css 에 light 테마 오버라이드 없음 — §2.2 위반",
  );
});

test("BF-488 CSS: styles.css 에 .display.is-ended + .display.is-empty 클래스 정의", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(
    css.includes(".display.is-ended") || css.includes(".is-ended"),
    "styles.css 에 .is-ended 클래스 없음 — §5.1 종료 상태 스타일 미구현",
  );
  assert.ok(
    css.includes(".display.is-empty") || css.includes(".is-empty"),
    "styles.css 에 .is-empty 클래스 없음 — §5.1 빈 상태(muted) 스타일 미구현",
  );
});

test("BF-488 CSS: styles.css 에 display font-size 128px (≥960px) 정의 (§3, §7.1)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(
    css.includes("128px"),
    "styles.css 에 128px display font-size 없음 — BF-485 §7.1 정량 기준 위반",
  );
});

test("BF-488 CSS: styles.css 에 반응형 breakpoint (<640px, <960px) 정의 (§4.2)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(
    css.includes("639px") || css.includes("640px"),
    "styles.css 에 640px breakpoint 없음 — §4.2 반응형 미구현",
  );
  assert.ok(
    css.includes("959px") || css.includes("960px"),
    "styles.css 에 960px breakpoint 없음 — §4.2 반응형 미구현",
  );
});

test("BF-488 CSS: styles.css 에 timer-pulse 애니메이션 정의 (§5.1 종료 펄스)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(
    css.includes("timer-pulse") || css.includes("pulse"),
    "styles.css 에 timer-pulse 애니메이션 없음 — §5.1 종료 펄스 미구현",
  );
});
