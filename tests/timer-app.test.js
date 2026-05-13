// BF-476 · 타이머 SPA app.js 정적 계약 테스트
//
// 검증 목표:
//   AC1 — index.html 이 file:// 로 열렸을 때 dark default 렌더 (기존 BF-470 계약 유지)
//   AC2 — app.js 가 IIFE 패턴 + vanilla-static 계약 준수 (no import/export/fetch/CDN)
//   AC3 — localStorage key "bf-timer-last-config" 사용 (BF-473 §7)
//   AC4 — index.html 이 app.js 를 비-module script 로 로드 (type=module 금지)
//
// 작성 방침: fs.readFileSync + includes — DOM 없이 파일 내용만 검사.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const TIMER_HTML = path.join(REPO_ROOT, "timer", "index.html");
const TIMER_APP = path.join(REPO_ROOT, "timer", "app.js");

// ─── AC1: dark default + index.html 구조 ────────────────────────────

test("BF-476 AC1: index.html 초기 data-theme 이 dark (dark default)", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(
    html.includes('data-theme="dark"'),
    'index.html 에 data-theme="dark" 가 없음 — dark default 위반',
  );
});

test("BF-476 AC1: index.html head IIFE 가 bf-theme 키로 flicker 방지 (/head 이전)", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  const iifePos = html.indexOf('localStorage.getItem("bf-theme")');
  assert.ok(iifePos !== -1, 'head IIFE 에 bf-theme 키 조회 없음 — flicker 방지 IIFE 미삽입');
  const headEndPos = html.indexOf("</head>");
  assert.ok(iifePos < headEndPos, "bf-theme IIFE 가 </head> 이후에 위치함 — paint 전 실행 불가");
});

test("BF-476 AC1: index.html 에 #theme-toggle 버튼 존재", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(html.includes('id="theme-toggle"'), 'id="theme-toggle" 없음');
});

test("BF-476 AC1: index.html 에 카운트다운 display + input + 컨트롤 id 계약 존재", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  const requiredIds = [
    "disp-m", "disp-s", "display",
    "input-m", "input-s", "input-pair",
    "btn-primary", "btn-reset",
    "ended-banner", "btn-banner-close",
    "hint",
  ];
  for (const id of requiredIds) {
    assert.ok(
      html.includes(`id="${id}"`),
      `index.html 에 id="${id}" 없음 — selector contract 위반`,
    );
  }
});

// ─── AC2: vanilla-static 계약 (app.js 구조) ────────────────────────

test("BF-476 AC2: app.js 가 IIFE 패턴 — 파일 상단 (function () { 또는 (function() {", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  const hasIIFE =
    js.includes("(function ()") ||
    js.includes("(function() ") ||
    js.includes("(function(){");
  assert.ok(hasIIFE, "app.js 에 IIFE 패턴이 없음 — vanilla-static IIFE 규칙 위반");
});

test("BF-476 AC2: app.js 에 import 구문 없음 (vanilla-static — file:// CORS 안전)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  // 주석·문자열 안의 import 는 허용 — 실제 구문 패턴만 검사
  const hasImport = /^\s*import\s+/m.test(js);
  assert.ok(!hasImport, "app.js 에 import 구문이 있음 — vanilla-static 위반 (file:// CORS 오류)");
});

test("BF-476 AC2: app.js 에 export 구문 없음 (vanilla-static)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  const hasExport = /^\s*export\s+/m.test(js);
  assert.ok(!hasExport, "app.js 에 export 구문이 있음 — vanilla-static 위반");
});

test("BF-476 AC2: app.js 에 fetch() 호출 없음 (외부 API 금지)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  // fetch( 패턴 — 주석 제외 실용 검사
  assert.ok(
    !js.includes("fetch("),
    "app.js 에 fetch() 호출이 있음 — 외부 API 금지 (vanilla-static)",
  );
});

test("BF-476 AC2: app.js 에 외부 CDN script/link 없음", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    !js.includes("https://"),
    "app.js 에 외부 CDN URL(https://)이 있음 — 외부 CDN 금지",
  );
});

test("BF-476 AC2: index.html 이 app.js 또는 script.js 를 type=module 없이 로드", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  // app.js(BF-476) 또는 script.js(BF-482) 중 하나를 비-module script 로 로드해야 함
  assert.ok(
    html.includes('src="app.js"') || html.includes("src='app.js'") ||
    html.includes('src="script.js"') || html.includes("src='script.js'"),
    "index.html 이 app.js / script.js 를 로드하지 않음",
  );
  // type=module 금지
  assert.ok(
    !html.includes('type="module"'),
    'index.html 에 type="module" 이 있음 — file:// CORS 오류 유발 (vanilla-static 위반)',
  );
});

// ─── AC3: bf-timer-last-config localStorage 키 ───────────────────────

test("BF-476 AC3: app.js 가 bf-timer-last-config 키를 사용 (BF-473 §7)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes('"bf-timer-last-config"') || js.includes("'bf-timer-last-config'"),
    "app.js 에 'bf-timer-last-config' 키가 없음 — BF-473 §7 localStorage 계약 위반",
  );
});

test("BF-476 AC3: app.js 가 localStorage.setItem 과 getItem 을 사용 (영속 + 복원)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes("localStorage.setItem"),
    "app.js 에 localStorage.setItem 없음 — 마지막 설정값 영속 불가",
  );
  assert.ok(
    js.includes("localStorage.getItem"),
    "app.js 에 localStorage.getItem 없음 — 재방문 복원 불가",
  );
});

// ─── AC4: 종료 알림 + 카운트다운 로직 정적 확인 ───────────────────────

test("BF-476 AC4: app.js 가 ended 상태와 배너 제어 포함 (bannerEl.hidden 갱신)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes('"ended"'),
    "app.js 에 'ended' 상태 전이가 없음 — 종료 알림 구현 누락",
  );
  assert.ok(
    js.includes("bannerEl.hidden"),
    "app.js 에 bannerEl.hidden 갱신 없음 — 종료 배너 표시 불가",
  );
});

test("BF-476 AC4: app.js 가 requestAnimationFrame 기반 tick 루프를 가짐", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes("requestAnimationFrame"),
    "app.js 에 requestAnimationFrame 없음 — rAF tick 루프 구현 누락",
  );
});

test("BF-476 AC4: app.js 가 T 키 단축키 핸들러를 포함 (테마 토글 §6.2)", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  const hasTKey =
    (js.includes(".toLowerCase()") &&
      (js.includes('"t"') || js.includes("'t'")));
  assert.ok(hasTKey, "app.js 에 T 키 단축키 핸들러가 없음 — §6.2 T 단축키 미구현");
});

test("BF-476 AC4: app.js 가 Space / Escape 단축키 핸들러를 포함", () => {
  const js = fs.readFileSync(TIMER_APP, "utf-8");
  assert.ok(
    js.includes('"Escape"') || js.includes("'Escape'"),
    "app.js 에 Escape 키 핸들러가 없음",
  );
  assert.ok(
    js.includes('" "') || js.includes("' '") || js.includes('"Space"') || js.includes("'Space'"),
    "app.js 에 Space 키 핸들러가 없음",
  );
});
