// BF-482 · 타이머 SPA 정적 계약 테스트 (timer/script.js)
// 명세: docs/design/timer-BF-479.md
//
// 검증 목표 (Epic AC 매핑):
//   E1 — 카운트다운 display: mm:ss large display, 상태별 class, rAF tick
//   E2 — 분/초 입력 폼: idle 전용, 입력 즉시 display 동기
//   E3 — 시작/일시정지/재개/리셋: 상태별 라벨·활성화
//   E4 — 종료 시각적 알림: 배너 + display 펄스 + 종료 색상
//   + dark default (bf-theme IIFE, §7.1)
//   + localStorage bf-timer-last-config 영속 (§7.2)
//   + vanilla-static 규칙 (file:// 호환, import/export/fetch 금지)
//
// 작성 방침: fs.readFileSync + includes/regex — DOM 없이 파일 내용 정적 검사.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const TIMER_HTML   = path.join(REPO_ROOT, "timer", "index.html");
const TIMER_SCRIPT = path.join(REPO_ROOT, "timer", "script.js");
const TIMER_CSS    = path.join(REPO_ROOT, "timer", "styles.css");

// ──────────────────────────────────────────────────────────────
// §7.1 Dark default + flicker 방지 (index.html)
// ──────────────────────────────────────────────────────────────

test("BF-482 §7.1: index.html 초기 data-theme=\"dark\" (dark default, BF-479 명세)", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(
    html.includes('data-theme="dark"'),
    'index.html 에 data-theme="dark" 없음 — dark default 위반 (BF-479 §7.1)',
  );
});

test("BF-482 §7.1: head 인라인 IIFE 가 bf-theme 키 조회 + </head> 이전 배치 (flicker 방지)", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  const iifePos = html.indexOf('localStorage.getItem("bf-theme")');
  assert.ok(iifePos !== -1, "head IIFE 에 bf-theme 조회 없음 — flicker 방지 IIFE 미삽입");
  assert.ok(
    iifePos < html.indexOf("</head>"),
    "bf-theme IIFE 가 </head> 이후에 위치 — paint 전 실행 불가",
  );
});

// ──────────────────────────────────────────────────────────────
// vanilla-static 규칙: index.html 이 script.js 를 비-module 로 로드
// ──────────────────────────────────────────────────────────────

test("BF-482 vanilla-static: index.html 이 script.js 를 type=module 없이 로드", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(
    html.includes('src="script.js"') || html.includes("src='script.js'"),
    'index.html 에 src="script.js" 없음 — BF-482 출력 artifact 미반영',
  );
  assert.ok(
    !html.includes('type="module"'),
    'index.html 에 type="module" 있음 — file:// CORS 오류 유발 (vanilla-static 위반)',
  );
});

test("BF-482 vanilla-static: index.html 에 외부 CDN <script src=\"https://...\"> 없음", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  const cdnPattern = /<script[^>]+src=["']https?:\/\//i;
  assert.ok(
    !cdnPattern.test(html),
    "index.html 에 외부 CDN script 있음 — vanilla-static 위반",
  );
});

// ──────────────────────────────────────────────────────────────
// §4 DOM 구조 계약 (E1~E4 기반 selector 계약)
// ──────────────────────────────────────────────────────────────

test("BF-482 §4: index.html 에 BF-479 명세 필수 DOM ID 전체 존재", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  // §4.3 display / §4.4 input / §4.5 controls / §4.6 banner / §4.7 hint / §5.5 theme
  const required = [
    "display",       // §4.3 카운트다운 display 컨테이너
    "disp-m",        // §4.3 분 span
    "disp-s",        // §4.3 초 span
    "input-pair",    // §4.4 input 래퍼 (idle 전용)
    "input-m",       // §4.4 분 input
    "input-s",       // §4.4 초 input
    "hint",          // §4.7 빈 상태 hint
    "btn-primary",   // §4.5 시작/일시정지/재개
    "btn-reset",     // §4.5 리셋
    "ended-banner",  // §4.6 종료 배너
    "btn-banner-close", // §4.6 배너 닫기
    "theme-toggle",  // §5.5 테마 토글
  ];
  for (const id of required) {
    assert.ok(
      html.includes(`id="${id}"`),
      `index.html 에 id="${id}" 없음 — BF-479 §4 selector 계약 위반`,
    );
  }
});

test("BF-482 §4.3: index.html display 에 role=\"timer\" aria-live=\"off\" aria-label 존재", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(html.includes('role="timer"'),   "display 에 role=\"timer\" 없음 (§4.3)");
  assert.ok(html.includes('aria-live="off"'), "display 에 aria-live=\"off\" 없음 (§4.3)");
  assert.ok(html.includes('"남은 시간"'),     "display 에 aria-label 남은 시간 없음 (§4.3)");
});

test("BF-482 §4.6: index.html ended-banner 에 role=\"status\" aria-live=\"polite\" 존재", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(html.includes('role="status"'),       'ended-banner 에 role="status" 없음 (§4.6)');
  assert.ok(html.includes('aria-live="polite"'),  'ended-banner 에 aria-live="polite" 없음 (§4.6)');
});

test("BF-482 §4.4: index.html input-m inputmode=\"numeric\" + aria-label=\"분\" 존재", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(html.includes('inputmode="numeric"'), 'input 에 inputmode="numeric" 없음 (§4.4)');
  assert.ok(html.includes('aria-label="분"'),     '분 input 에 aria-label 없음 (§4.4)');
  assert.ok(html.includes('aria-label="초"'),     '초 input 에 aria-label 없음 (§4.4)');
});

// ──────────────────────────────────────────────────────────────
// vanilla-static 규칙: script.js 파일 내용
// ──────────────────────────────────────────────────────────────

test("BF-482 vanilla-static: script.js 가 IIFE 패턴 — (function () { 또는 (function(){", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  const hasIIFE =
    js.includes("(function ()") ||
    js.includes("(function() ") ||
    js.includes("(function(){");
  assert.ok(hasIIFE, "script.js 에 IIFE 패턴 없음 — vanilla-static IIFE 규칙 위반");
});

test("BF-482 vanilla-static: script.js 에 import 구문 없음 (file:// CORS 안전)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    !/^\s*import\s+/m.test(js),
    "script.js 에 import 구문 있음 — vanilla-static 위반 (file:// CORS 오류)",
  );
});

test("BF-482 vanilla-static: script.js 에 export 구문 없음", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    !/^\s*export\s+/m.test(js),
    "script.js 에 export 구문 있음 — vanilla-static 위반",
  );
});

test("BF-482 vanilla-static: script.js 에 fetch() 호출 없음 (외부 API 금지)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(!js.includes("fetch("), "script.js 에 fetch() 있음 — 외부 API 금지 위반");
});

test("BF-482 vanilla-static: script.js 에 외부 CDN URL(https://) 없음", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(!js.includes("https://"), "script.js 에 외부 CDN URL 있음 — 외부 의존성 금지");
});

// ──────────────────────────────────────────────────────────────
// E1 — 카운트다운 display (§4.3, §6.3)
// ──────────────────────────────────────────────────────────────

test("BF-482 E1: script.js 가 requestAnimationFrame 기반 tick 루프를 포함", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes("requestAnimationFrame"),
    "script.js 에 requestAnimationFrame 없음 — rAF tick 루프 미구현 (§6.3)",
  );
});

test("BF-482 E1: script.js 가 performance.now() drift-correction 포함 (§6.3)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes("performance.now"),
    "script.js 에 performance.now 없음 — drift-correction 미구현 (§6.3)",
  );
});

test("BF-482 E1: styles.css 에 .is-empty / .is-ended 상태 클래스 정의 (§4.3)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(css.includes(".is-empty"),  "styles.css 에 .is-empty 클래스 없음 (§4.3)");
  assert.ok(css.includes(".is-ended"),  "styles.css 에 .is-ended 클래스 없음 (§4.3)");
});

test("BF-482 E1: styles.css 에 timer-pulse @keyframes 정의 (§4.3 ended 펄스)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(
    css.includes("timer-pulse"),
    "styles.css 에 timer-pulse keyframes 없음 — ended 펄스 animation 미구현 (§4.3)",
  );
});

test("BF-482 E1: styles.css 에 prefers-reduced-motion 가드 (§4.3)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(
    css.includes("prefers-reduced-motion"),
    "styles.css 에 prefers-reduced-motion 미디어 쿼리 없음 — 접근성 요구사항 위반 (§4.3)",
  );
});

// ──────────────────────────────────────────────────────────────
// E2 — 분/초 입력 폼 (§4.4)
// ──────────────────────────────────────────────────────────────

test("BF-482 E2: script.js 가 idle 상태에서만 input-pair 표시 (inputPairEl.hidden 제어)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes("inputPairEl") || js.includes("input-pair"),
    "script.js 에 input-pair 제어 로직 없음 (§4.4)",
  );
  assert.ok(
    js.includes(".hidden"),
    "script.js 에 .hidden 제어 없음 — idle 외 input-pair 숨김 미구현",
  );
});

test("BF-482 E2: script.js 가 input 이벤트에서 display 즉시 동기 (§4.4 debounce 없음)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes('"input"') || js.includes("'input'"),
    "script.js 에 input 이벤트 리스너 없음 — 입력 즉시 display 동기 미구현 (§4.4)",
  );
});

test("BF-482 E2: script.js 가 blur 이벤트에서 range clamp 수행 (§4.4)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes('"blur"') || js.includes("'blur'"),
    "script.js 에 blur 이벤트 리스너 없음 — range clamp 미구현 (§4.4)",
  );
});

// ──────────────────────────────────────────────────────────────
// E3 — 시작/일시정지/재개/리셋 상태 전이 (§4.5, §6.1)
// ──────────────────────────────────────────────────────────────

test("BF-482 E3: script.js 가 idle/running/paused/ended 4개 상태를 모두 포함 (§6.1)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(js.includes('"idle"'),    "script.js 에 idle 상태 없음");
  assert.ok(js.includes('"running"'), "script.js 에 running 상태 없음");
  assert.ok(js.includes('"paused"'),  "script.js 에 paused 상태 없음");
  assert.ok(js.includes('"ended"'),   "script.js 에 ended 상태 없음");
});

test("BF-482 E3: script.js 가 상태별 primary 버튼 라벨 갱신 (▶ 시작/⏸ 일시정지/▶ 재개)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(js.includes("▶ 시작"),    "script.js 에 '▶ 시작' 라벨 없음 (§4.5)");
  assert.ok(js.includes("⏸ 일시정지"), "script.js 에 '⏸ 일시정지' 라벨 없음 (§4.5)");
  assert.ok(js.includes("▶ 재개"),    "script.js 에 '▶ 재개' 라벨 없음 (§4.5)");
});

test("BF-482 E3: script.js 가 ended 상태에서 '⟲ 새 타이머' 리셋 라벨 사용 (§4.5)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes("새 타이머"),
    "script.js 에 '새 타이머' 라벨 없음 — ended 리셋 버튼 라벨 미구현 (§4.5)",
  );
});

test("BF-482 E3: script.js 가 primary 버튼 aria-label 갱신 (§5.3 접근성)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes("타이머 시작") || js.includes('"타이머 시작"'),
    "script.js 에 primary 버튼 aria-label 갱신 없음 (§5.3)",
  );
});

// ──────────────────────────────────────────────────────────────
// E4 — 종료 시각적 알림 (§4.6, §6.4)
// ──────────────────────────────────────────────────────────────

test("BF-482 E4: script.js 가 ended 전이 시 bannerEl.hidden = false (§4.6)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes("bannerEl.hidden") || js.includes("bannerEl"),
    "script.js 에 bannerEl 제어 없음 — 종료 배너 표시 미구현 (§4.6)",
  );
});

test("BF-482 E4: script.js 가 displayEl 에 is-ended 클래스 토글 (§4.3 ended 펄스)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes("is-ended"),
    "script.js 에 is-ended 클래스 토글 없음 — display ended 색·펄스 미구현 (§4.3)",
  );
});

test("BF-482 E4: styles.css 에 banner-in @keyframes + banner:not([hidden]) animation (§4.6)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(
    css.includes("banner-in"),
    "styles.css 에 banner-in keyframes 없음 — 배너 fade-in animation 미구현 (§4.6)",
  );
});

test("BF-482 E4: styles.css 에 --color-timer-ended-bg/border/text 토큰 정의 (§2.1)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(css.includes("--color-timer-ended-bg"),     "--color-timer-ended-bg 토큰 없음 (§2.1)");
  assert.ok(css.includes("--color-timer-ended-border"), "--color-timer-ended-border 토큰 없음 (§2.1)");
  assert.ok(css.includes("--color-timer-ended-text"),   "--color-timer-ended-text 토큰 없음 (§2.1)");
});

// ──────────────────────────────────────────────────────────────
// §7 localStorage 영속
// ──────────────────────────────────────────────────────────────

test("BF-482 §7.2: script.js 가 bf-timer-last-config 키로 마지막 설정값 저장 (§7.2)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes('"bf-timer-last-config"') || js.includes("'bf-timer-last-config'"),
    "script.js 에 bf-timer-last-config 키 없음 — localStorage 영속 계약 위반 (§7.2)",
  );
});

test("BF-482 §7.2: script.js 가 localStorage.setItem + getItem 양방향 사용 (영속 + 복원)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(js.includes("localStorage.setItem"), "script.js 에 setItem 없음 — 마지막 설정값 저장 불가");
  assert.ok(js.includes("localStorage.getItem"), "script.js 에 getItem 없음 — 재방문 복원 불가");
});

test("BF-482 §7.1: script.js 가 bf-theme 키 사용 (전 SPA 공유 테마 키)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes('"bf-theme"') || js.includes("'bf-theme'"),
    "script.js 에 bf-theme 키 없음 — 전 SPA 테마 공유 계약 위반 (§7.1)",
  );
});

// ──────────────────────────────────────────────────────────────
// §6.2 키보드 단축키
// ──────────────────────────────────────────────────────────────

test("BF-482 §6.2: script.js 가 Space 키 핸들러 포함 (시작/일시정지 토글)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes('" "') || js.includes("' '") || js.includes('"Space"') || js.includes("'Space'"),
    "script.js 에 Space 키 핸들러 없음 (§6.2)",
  );
});

test("BF-482 §6.2: script.js 가 Esc 키 핸들러 포함 (리셋 / 배너 닫기)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes('"Escape"') || js.includes("'Escape'"),
    "script.js 에 Escape 키 핸들러 없음 (§6.2)",
  );
});

test("BF-482 §6.2: script.js 가 T 키 핸들러 포함 (테마 토글, input focus 제외)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  const hasTKey =
    js.includes(".toLowerCase()") &&
    (js.includes('"t"') || js.includes("'t'"));
  assert.ok(hasTKey, "script.js 에 T 키 핸들러 없음 (§6.2)");
});

// ──────────────────────────────────────────────────────────────
// §5.5 테마 토글 패턴 (§7.1 코드 패턴)
// ──────────────────────────────────────────────────────────────

test("BF-482 §5.5: script.js applyTheme 가 dark 시 ☀ 아이콘 설정", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes('"☀"') || js.includes("'☀'"),
    "script.js 에 dark 모드 ☀ 아이콘 없음 (§5.5)",
  );
});

test("BF-482 §5.5: script.js applyTheme 가 aria-label 갱신 (라이트/다크 테마로 전환)", () => {
  const js = fs.readFileSync(TIMER_SCRIPT, "utf-8");
  assert.ok(
    js.includes("라이트 테마로 전환") && js.includes("다크 테마로 전환"),
    "script.js 에 테마 토글 aria-label 갱신 없음 (§5.5)",
  );
});

// ──────────────────────────────────────────────────────────────
// styles.css 디자인 토큰 + 반응형 (§2, §4.8)
// ──────────────────────────────────────────────────────────────

test("BF-482 §2.3: styles.css 에 spacing 토큰 --space-1 ~ --space-7 정의", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  for (let i = 1; i <= 7; i++) {
    assert.ok(css.includes(`--space-${i}`), `styles.css 에 --space-${i} 없음 (§2.3)`);
  }
});

test("BF-482 §4.8: styles.css 에 반응형 브레이크포인트 (640px, 960px) 정의", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(css.includes("640") || css.includes("639"), "styles.css 에 640px breakpoint 없음 (§4.8)");
  assert.ok(css.includes("960") || css.includes("959"), "styles.css 에 960px breakpoint 없음 (§4.8)");
});

test("BF-482 §4.8: styles.css 에 128px/96px/72px display font-size 단계 정의 (§3)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(css.includes("128px"), "styles.css 에 display 128px (≥960px) 없음 (§3)");
  assert.ok(css.includes("96px"),  "styles.css 에 display 96px (640–959px) 없음 (§3)");
  assert.ok(css.includes("72px"),  "styles.css 에 display 72px (<640px) 없음 (§3)");
});
