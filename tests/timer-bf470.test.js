// BF-470 · 타이머 SPA dark-default + #theme-toggle 정적 계약 테스트
// AC1: index.html 로드 시 dark 테마로 렌더 + 분/초 입력 UI + 시작 버튼 (BF-467 명세 반영)
// AC2: #theme-toggle ID + bf-theme localStorage 키 + T 단축키
// AC3: 종료 시 localStorage 저장 (기존 logic 계약 유지)
// AC4: 재진입 시 localStorage 복원 (기존 logic 계약 유지)

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const TIMER_HTML = path.join(REPO_ROOT, "timer", "index.html");
const TIMER_CSS = path.join(REPO_ROOT, "timer", "styles.css");
const TIMER_MAIN = path.join(REPO_ROOT, "timer", "main.js");

// ──────────────────────────────────────────────────────────
// AC1: dark default 렌더 계약
// ──────────────────────────────────────────────────────────

test("BF-470 AC1: index.html 초기 data-theme 이 dark 이어야 함 (BF-467 §6.5)", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(
    html.includes('data-theme="dark"'),
    'index.html 에 data-theme="dark" 가 없음 — dark default 위반',
  );
  assert.ok(
    !html.includes('data-theme="light"'),
    'index.html 에 data-theme="light" 가 여전히 존재 — light default 잔존',
  );
});

test("BF-470 AC1: head 인라인 IIFE (flicker 방지) 가 </head> 이전에 위치해야 함 (BF-467 §6.5)", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  const keyDouble = 'localStorage.getItem("bf-theme")';
  const keySingle = "localStorage.getItem('bf-theme')";
  const iifePos =
    html.indexOf(keyDouble) !== -1
      ? html.indexOf(keyDouble)
      : html.indexOf(keySingle);
  assert.ok(iifePos !== -1, "head IIFE 에서 bf-theme 키 조회 없음 — flicker 방지 IIFE 미삽입");
  const headEndPos = html.indexOf("</head>");
  assert.ok(
    iifePos < headEndPos,
    "bf-theme IIFE 가 </head> 이후에 있음 — head 인라인 아님 (paint 전 실행 불가)",
  );
});

test("BF-470 AC1: index.html 에 #theme-toggle 버튼이 있어야 함 (BF-467 §5.5)", () => {
  const html = fs.readFileSync(TIMER_HTML, "utf-8");
  assert.ok(
    html.includes('id="theme-toggle"'),
    'index.html 에 id="theme-toggle" 가 없음 — BF-467 §5.5 ID 계약 위반',
  );
  assert.ok(
    !html.includes('id="btn-theme"'),
    'index.html 에 id="btn-theme" 가 아직 남아 있음 — 구버전 ID 잔존',
  );
});

test("BF-470 AC1: styles.css :root 가 dark 토큰이어야 함 (BF-467 §2.1)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  // :root 블록에서 dark 대표 토큰 확인
  assert.ok(
    css.includes("--color-bg-canvas: #0f1115"),
    "styles.css :root 에 --color-bg-canvas: #0f1115 없음 — dark default 토큰 미반영",
  );
  assert.ok(
    css.includes("--color-bg-surface: #171a21"),
    "styles.css :root 에 --color-bg-surface: #171a21 없음 — dark default 토큰 미반영",
  );
  assert.ok(
    css.includes("--color-text-primary: #e8e8e4"),
    "styles.css :root 에 --color-text-primary: #e8e8e4 없음 — dark default 토큰 미반영",
  );
  assert.ok(
    css.includes("--color-accent: #5b82f0"),
    "styles.css :root 에 --color-accent: #5b82f0 없음 — dark accent 토큰 미반영",
  );
});

test("BF-470 AC1: styles.css 에 [data-theme=\"light\"] 오버라이드가 있어야 함 (CSS 구조 반전 §2.2)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  assert.ok(
    css.includes('[data-theme="light"]'),
    'styles.css 에 [data-theme="light"] 선택자가 없음 — CSS 구조 반전 미완료',
  );
  // :root = dark 이면 [data-theme="dark"] 추가 오버라이드 블록은 제거돼야 함
  assert.ok(
    !css.includes('[data-theme="dark"]'),
    'styles.css 에 [data-theme="dark"] 오버라이드 블록이 아직 존재 — 구조 반전 미완료',
  );
});

test("BF-470 AC1: styles.css [data-theme=\"light\"] 블록에 light 토큰이 있어야 함 (BF-467 §2.2)", () => {
  const css = fs.readFileSync(TIMER_CSS, "utf-8");
  const lightIdx = css.indexOf('[data-theme="light"]');
  assert.ok(lightIdx !== -1, '[data-theme="light"] 블록 없음');
  // 블록 내용 검사 (최대 600자 슬라이스)
  const lightBlock = css.slice(lightIdx, lightIdx + 600);
  assert.ok(
    lightBlock.includes("--color-bg-canvas: #fafaf9"),
    '[data-theme="light"] 블록에 --color-bg-canvas: #fafaf9 없음 — light 토큰 미반영',
  );
  assert.ok(
    lightBlock.includes("--color-bg-surface: #ffffff"),
    '[data-theme="light"] 블록에 --color-bg-surface: #ffffff 없음 — light 토큰 미반영',
  );
  assert.ok(
    lightBlock.includes("--color-accent: #3563e9"),
    '[data-theme="light"] 블록에 --color-accent: #3563e9 없음 — light accent 토큰 미반영',
  );
});

// ──────────────────────────────────────────────────────────
// AC2: #theme-toggle ID + T 단축키 JS 계약
// ──────────────────────────────────────────────────────────

test("BF-470 AC2: main.js 가 theme-toggle ID 를 참조해야 함 (btn-theme 제거 확인)", () => {
  const mainJs = fs.readFileSync(TIMER_MAIN, "utf-8");
  assert.ok(
    mainJs.includes('"theme-toggle"') || mainJs.includes("'theme-toggle'"),
    'main.js 에 "theme-toggle" ID 참조가 없음 — BF-467 §6.5 JS 계약 위반',
  );
  assert.ok(
    !mainJs.includes('"btn-theme"') && !mainJs.includes("'btn-theme'"),
    'main.js 에 구버전 "btn-theme" ID 가 아직 남아 있음',
  );
});

test("BF-470 AC2: main.js 가 T 키 단축키 핸들러를 포함해야 함 (BF-467 §6.5)", () => {
  const mainJs = fs.readFileSync(TIMER_MAIN, "utf-8");
  // §6.5 코드 블록 패턴: .key.toLowerCase() === "t"
  const hasTKey =
    (mainJs.includes(".toLowerCase()") &&
      (mainJs.includes('"t"') || mainJs.includes("'t'"))) ||
    mainJs.includes('e.key === "T"') ||
    mainJs.includes("e.key === 'T'");
  assert.ok(hasTKey, "main.js 에 T 키 단축키 핸들러가 없음 — §6.5 T 단축키 미구현");
});

test("BF-470 AC2: main.js applyTheme 가 dark 시 ☀ 아이콘을 설정해야 함 (BF-467 §6.5)", () => {
  const mainJs = fs.readFileSync(TIMER_MAIN, "utf-8");
  // applyTheme 내에서 dark → "☀" 설정 확인
  assert.ok(
    mainJs.includes('"☀"') || mainJs.includes("'☀'"),
    'main.js applyTheme 에 dark 모드 ☀ 아이콘이 없음 — §6.5 아이콘 방향 미수정',
  );
});

// ──────────────────────────────────────────────────────────
// AC3: 종료 시 localStorage 저장 (기존 logic 계약 — 회귀 방지)
// ──────────────────────────────────────────────────────────

test("BF-470 AC3: main.js 가 store.saveLast 를 호출해야 함 (종료 시 설정 영속)", () => {
  const mainJs = fs.readFileSync(TIMER_MAIN, "utf-8");
  assert.ok(
    mainJs.includes("store.saveLast"),
    "main.js 가 saveLast 호출을 잃음 — '시작 시 마지막 설정값 저장' 흐름 깨짐",
  );
});

// ──────────────────────────────────────────────────────────
// AC4: 재진입 시 localStorage 복원 (기존 logic 계약 — 회귀 방지)
// ──────────────────────────────────────────────────────────

test("BF-470 AC4: main.js 가 store.loadLast 를 호출해야 함 (재진입 복원)", () => {
  const mainJs = fs.readFileSync(TIMER_MAIN, "utf-8");
  assert.ok(
    mainJs.includes("store.loadLast"),
    "main.js 가 loadLast 호출을 잃음 — '새로고침 후 복원' 흐름 깨짐",
  );
});
