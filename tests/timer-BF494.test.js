// BF-494 · 타이머 SPA BF-491 디자인 명세 계약 테스트
// 검증 대상: timer/styles.css, timer/app.js, timer/index.html
//
// 검증 목표 (BF-491 Epic AC 매핑):
//   AC-4 — --color-timer-ended-flash 토큰 + @keyframes timer-flash + .display.is-ended 복합 애니메이션
//   AC-6 — dark default (file:// FOUC 없음), bf-theme localStorage 영속
//   AC-9 — bf-timer-last-config localStorage 저장·복원
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
const TIMER_CSS  = path.join(REPO_ROOT, "timer", "styles.css");
const TIMER_APP  = path.join(REPO_ROOT, "timer", "app.js");
const TIMER_HTML = path.join(REPO_ROOT, "timer", "index.html");

// ─────────────────────────────────────────────────────────────────────────────
// AC-4: --color-timer-ended-flash 신규 토큰 (BF-491 §2.1 · §2.2)
// ─────────────────────────────────────────────────────────────────────────────

test("BF-494 AC4: styles.css :root 에 --color-timer-ended-flash dark 토큰 존재 (BF-491 §2.1)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(
    css.includes("--color-timer-ended-flash"),
    "styles.css 에 --color-timer-ended-flash 없음 — BF-491 §2.1 신규 flash 토큰 누락",
  );
  // :root 섹션(light 오버라이드 이전)에 dark 값 #ff6b6b 존재 확인
  const lightIdx =
    css.indexOf('[data-theme="light"]') !== -1
      ? css.indexOf('[data-theme="light"]')
      : css.indexOf("[data-theme='light']");
  assert.ok(lightIdx !== -1, "styles.css 에 [data-theme='light'] 섹션 없음");
  const rootSection = css.slice(0, lightIdx);
  assert.ok(
    rootSection.includes("#ff6b6b"),
    "styles.css :root 에 flash dark 값 #ff6b6b 없음 — BF-491 §2.1 위반",
  );
});

test("BF-494 AC4: styles.css [data-theme='light'] 에 --color-timer-ended-flash light 오버라이드 존재 (BF-491 §2.2)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  const lightIdx =
    css.indexOf('[data-theme="light"]') !== -1
      ? css.indexOf('[data-theme="light"]')
      : css.indexOf("[data-theme='light']");
  assert.ok(lightIdx !== -1, "styles.css 에 [data-theme='light'] 섹션 없음");
  const lightSection = css.slice(lightIdx);
  assert.ok(
    lightSection.includes("--color-timer-ended-flash"),
    "styles.css light 오버라이드 에 --color-timer-ended-flash 없음 — BF-491 §2.2 위반",
  );
  assert.ok(
    lightSection.includes("#e53e3e"),
    "styles.css light 오버라이드 에 flash light 값 #e53e3e 없음 — BF-491 §2.2 위반",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4: @keyframes timer-flash 정의 (BF-491 §4.6)
// ─────────────────────────────────────────────────────────────────────────────

test("BF-494 AC4: styles.css 에 @keyframes timer-flash 정의 존재 (BF-491 §4.6)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(
    css.includes("@keyframes timer-flash"),
    "styles.css 에 @keyframes timer-flash 없음 — BF-491 §4.6 flash 애니메이션 미구현",
  );
});

test("BF-494 AC4: @keyframes timer-flash 가 --color-timer-ended-flash 변수를 사용 (BF-491 §4.6)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  const flashIdx = css.indexOf("@keyframes timer-flash");
  assert.ok(flashIdx !== -1, "styles.css 에 @keyframes timer-flash 없음");
  // keyframe 블록 이후 약 200자 내에 토큰 참조 확인
  const flashBlock = css.slice(flashIdx, flashIdx + 300);
  assert.ok(
    flashBlock.includes("--color-timer-ended-flash"),
    "@keyframes timer-flash 블록 에 --color-timer-ended-flash 참조 없음 — BF-491 §4.6 토큰 미사용",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4: .display.is-ended 에 timer-flash + timer-pulse 복합 애니메이션 (BF-491 §4.6)
// ─────────────────────────────────────────────────────────────────────────────

test("BF-494 AC4: styles.css .display.is-ended 애니메이션 에 timer-flash 포함 (BF-491 §4.6 플래시 2회)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  const isEndedIdx = css.indexOf(".display.is-ended");
  assert.ok(isEndedIdx !== -1, "styles.css 에 .display.is-ended 클래스 없음");
  // is-ended 블록 내부 (약 400자) 에서 timer-flash 참조 확인
  const endedBlock = css.slice(isEndedIdx, isEndedIdx + 400);
  assert.ok(
    endedBlock.includes("timer-flash"),
    ".display.is-ended animation 에 timer-flash 없음 — BF-491 §4.6 flash 시퀀스 미구현",
  );
});

test("BF-494 AC4: styles.css .display.is-ended 애니메이션 에 timer-pulse 포함 (BF-491 §4.6 펄스 2회)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  const isEndedIdx = css.indexOf(".display.is-ended");
  assert.ok(isEndedIdx !== -1, "styles.css 에 .display.is-ended 클래스 없음");
  const endedBlock = css.slice(isEndedIdx, isEndedIdx + 400);
  assert.ok(
    endedBlock.includes("timer-pulse"),
    ".display.is-ended animation 에 timer-pulse 없음 — BF-491 §4.6 pulse 시퀀스 미구현",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4: @keyframes banner-in 정의 (BF-491 §4.6 종료 배너 슬라이드인)
// ─────────────────────────────────────────────────────────────────────────────

test("BF-494 AC4: styles.css 에 @keyframes banner-in 정의 존재 (BF-491 §4.6 배너 슬라이드인)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(
    css.includes("@keyframes banner-in"),
    "styles.css 에 @keyframes banner-in 없음 — BF-491 §4.6 종료 배너 슬라이드인 미구현",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6: dark default + FOUC 방지 IIFE (BF-491 §5.2)
// ─────────────────────────────────────────────────────────────────────────────

test("BF-494 AC6: index.html 초기 data-theme 이 dark (dark default, BF-491 §1.2 · §5.4)", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(
    html.includes('data-theme="dark"'),
    'index.html 에 data-theme="dark" 없음 — BF-491 §1.2 dark 우선 렌더 위반',
  );
});

test("BF-494 AC6: index.html head IIFE 가 bf-theme 으로 FOUC 방지 (</head> 이전, BF-491 §5.2)", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  const iifePos = html.indexOf('localStorage.getItem("bf-theme")');
  assert.ok(
    iifePos !== -1,
    "index.html head IIFE 에 bf-theme 키 없음 — BF-491 §5.2 FOUC 방지 미구현",
  );
  assert.ok(
    iifePos < html.indexOf("</head>"),
    "bf-theme IIFE 가 </head> 이후 위치 — paint 전 실행 불가 (FOUC 방지 실패)",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-9: bf-timer-last-config localStorage 저장·복원 (BF-491 §6)
// ─────────────────────────────────────────────────────────────────────────────

test("BF-494 AC9: app.js 가 bf-timer-last-config 키로 마지막 설정 저장 (BF-491 §6)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes('"bf-timer-last-config"') || js.includes("'bf-timer-last-config'"),
    "app.js 에 bf-timer-last-config 키 없음 — BF-491 §6 localStorage 계약 위반",
  );
});

test("BF-494 AC9: app.js 가 localStorage.setItem + getItem 으로 설정 저장·복원 (BF-491 §6)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes("localStorage.setItem"),
    "app.js 에 localStorage.setItem 없음 — BF-491 §6 마지막 설정 저장 불가",
  );
  assert.ok(
    js.includes("localStorage.getItem"),
    "app.js 에 localStorage.getItem 없음 — BF-491 §6 재방문 복원 불가",
  );
});

test("BF-494 AC9: app.js 가 JSON.parse + try/catch 로 복원 오류를 안전 처리 (BF-491 §6 파싱 실패 시 {m:0,s:0})", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes("JSON.parse"),
    "app.js 에 JSON.parse 없음 — bf-timer-last-config 파싱 로직 누락",
  );
  assert.ok(
    js.includes("try") && js.includes("catch"),
    "app.js 에 try/catch 없음 — BF-491 §6 파싱 실패 안전 처리 누락",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// vanilla-static 정책 최종 확인 (tech-stack: vanilla-static)
// ─────────────────────────────────────────────────────────────────────────────

test("BF-494 static: index.html 에 외부 CDN link/script 없음 (vanilla-static, BF-491 §1.3)", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(
    !/<link[^>]+href=["']https?:\/\//i.test(html),
    "index.html 에 외부 CDN <link> 있음 — vanilla-static 위반",
  );
  assert.ok(
    !/<script[^>]+src=["']https?:\/\//i.test(html),
    "index.html 에 외부 CDN <script src> 있음 — vanilla-static 위반",
  );
});

test("BF-494 static: app.js 에 import/export/fetch 없음 (vanilla-static, file:// 호환)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    !/^\s*import\s+/m.test(js),
    "app.js 에 import 구문 있음 — vanilla-static 위반",
  );
  assert.ok(
    !/^\s*export\s+/m.test(js),
    "app.js 에 export 구문 있음 — vanilla-static 위반",
  );
  assert.ok(!js.includes("fetch("), "app.js 에 fetch() 있음 — 외부 API 금지 위반");
});
