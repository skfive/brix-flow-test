// BF-888 · a11y-counter SPA 단위 + 정적 계약 가드 (focused scope · module: a11y-counter)
// - 대상: a11y-counter/{index.html, styles.css, counter.js, main.js}
// - 실행: node --test tests/a11y-counter-BF888.test.js
// - 디자인 SSOT: docs/design/a11y-counter-BF-885.md (§2 팔레트, §5 컴포넌트, §6 접근성 토큰, §7 dev 가이드)
//
// 검증 축:
//   1) vanilla-static file:// 안전 가드 — import/export·<script type="module">·
//      fetch/외부 URL 이 없어야 함(tech-stack 정책).
//   2) 마크업 계약 — main.js 가 의존하는 id(#counter-value/#btn-*) + ARIA + §1.1 문구 고정.
//   3) 접근성 토큰 — 포커스 링(:focus-visible)·터치 타깃(min-height:48px)·감소 모션.
//   4) 순수 로직 — counter.js 를 node:vm 샌드박스에서 로드해 Counter 전역 API 검증.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "a11y-counter");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const COUNTER_JS = readFileSync(join(MODULE_DIR, "counter.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// ─────────── counter.js 를 샌드박스에서 로드해 Counter 전역 추출 ───────────
function loadCounter() {
  const ctx = { globalThis: undefined, window: undefined };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(COUNTER_JS, ctx, { filename: "a11y-counter/counter.js" });
  assert.ok(ctx.Counter, "counter.js 가 전역 Counter 를 노출하지 않음");
  return ctx.Counter;
}

// ══════════════════════════════════════════════════════════
// 1) vanilla-static file:// 안전 가드 (tech-stack 정책)
// ══════════════════════════════════════════════════════════
test("AC3(가드): JS 파일에 import/export 구문이 없다 (file:// CORS 안전)", () => {
  for (const [name, src] of [
    ["counter.js", COUNTER_JS],
    ["main.js", MAIN_JS],
  ]) {
    assert.doesNotMatch(
      src,
      /^\s*import\s|^\s*export\s|\bimport\s*\(/m,
      `${name} 에 import/export 가 있음 — vanilla-static 위반`,
    );
  }
});

test('AC3(가드): index.html 에 <script type="module"> 이 없다', () => {
  assert.doesNotMatch(
    HTML,
    /<script[^>]*type=["']module["']/i,
    "type=module 스크립트는 file:// 에서 CORS 로 깨짐",
  );
});

test("AC3(가드): 네트워크 진입점이 없다 (완전 정적, 브라우저 메모리만 사용)", () => {
  const all = `${HTML}\n${COUNTER_JS}\n${MAIN_JS}`;
  assert.doesNotMatch(
    all,
    /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage/,
    "네트워크/스토리지 호출 금지(브라우저 메모리만, 명세 §1.2·AC3)",
  );
});

test("AC3(가드): 외부 CDN/절대 URL 리소스가 없다", () => {
  assert.doesNotMatch(
    HTML,
    /(?:src|href)=["']https?:\/\//i,
    "외부 CDN <link>/<script src> 금지(vanilla-static)",
  );
});

// ══════════════════════════════════════════════════════════
// 2) 마크업 계약 (§7.1 골격 · §1.1 문구)
// ══════════════════════════════════════════════════════════
test("AC2: index.html 에 main.js 의존 id(#counter-value/#btn-increment/#btn-decrement/#btn-reset) 존재", () => {
  assert.match(HTML, /id=["']counter-value["']/, "#counter-value 누락");
  assert.match(HTML, /id=["']btn-increment["']/, "#btn-increment 누락");
  assert.match(HTML, /id=["']btn-decrement["']/, "#btn-decrement 누락");
  assert.match(HTML, /id=["']btn-reset["']/, "#btn-reset 누락");
});

test("AC2: 값 표시는 <output aria-live=polite> 계약(§5.1 고정)을 지킨다", () => {
  assert.match(
    HTML,
    /<output[^>]*id=["']counter-value["'][^>]*aria-live=["']polite["']/,
    "counter-value 가 output+aria-live=polite 계약 위반(기획 §7.1)",
  );
});

test("AC2: 세 버튼은 네이티브 <button type=button> 이다 (role=button div 금지)", () => {
  for (const id of ["btn-increment", "btn-decrement", "btn-reset"]) {
    assert.match(
      HTML,
      new RegExp(`<button[^>]*type=["']button["'][^>]*id=["']${id}["']`),
      `${id} 가 <button type=button> 이 아님(기획 §5.2)`,
    );
  }
});

test("AC1: <title>/<h1> 문구가 검증 맥락(§1.1)을 반영한다", () => {
  assert.match(
    HTML,
    /<title>\s*접근성 카운터 검증 · \/phase18-validation\/counter-2\s*<\/title>/,
    "title 문구가 §1.1 과 불일치",
  );
  assert.match(
    HTML,
    /<h1[^>]*id=["']counter-title["'][^>]*>\s*카운터 \(Phase 18 검증 2\/5 · 접근성\)\s*<\/h1>/,
    "h1(counter-title) 문구가 §1.1 과 불일치",
  );
});

test("AC2: 단축키 힌트가 <kbd> 로 ↑/↓/R 을 시맨틱하게 안내한다(§5.4)", () => {
  assert.match(HTML, /class=["']counter-hint["']/, ".counter-hint 누락");
  assert.match(HTML, /<kbd>↑<\/kbd>/, "↑ kbd 누락");
  assert.match(HTML, /<kbd>↓<\/kbd>/, "↓ kbd 누락");
  assert.match(HTML, /<kbd>R<\/kbd>/, "R kbd 누락");
});

test("AC3: 자체 styles.css/counter.js/main.js 를 상대경로로 참조한다", () => {
  assert.match(HTML, /href=["']\.?\/?styles\.css["']/, "styles.css 링크 누락");
  assert.match(HTML, /src=["']\.?\/?counter\.js["']/, "counter.js 스크립트 누락");
  assert.match(HTML, /src=["']\.?\/?main\.js["']/, "main.js 스크립트 누락");
});

// ══════════════════════════════════════════════════════════
// 3) 접근성 토큰 (§6 — 포커스 링·터치 타깃·감소 모션)
// ══════════════════════════════════════════════════════════
test("AC2: 포커스 링이 :focus-visible 로 정의되고 outline:none 단독 사용이 없다(§6.2)", () => {
  const focusRule = CSS.match(/\.counter-btn:focus-visible\s*\{[^}]*\}/);
  assert.ok(focusRule, ".counter-btn:focus-visible 규칙 누락");
  assert.match(focusRule[0], /outline:\s*2px solid var\(--color-accent\)/, "포커스 outline 누락");
  assert.match(focusRule[0], /box-shadow:\s*0 0 0 4px var\(--color-focus-ring\)/, "포커스 링 box-shadow 누락");
  // 대응 커스텀 링 없는 outline:none 단독 사용 금지(§6.2 정적 검사)
  assert.doesNotMatch(CSS, /outline:\s*none\s*;/, "outline:none 단독 사용 금지(§6.2)");
});

test("AC2: 버튼 최소 터치 타깃 min-height:48px 이 정의돼 있다(§6.3)", () => {
  const btnRule = CSS.match(/\.counter-btn\s*\{[^}]*\}/);
  assert.ok(btnRule, ".counter-btn 규칙 누락");
  assert.match(btnRule[0], /min-height:\s*48px/, "min-height:48px 누락");
});

test("AC3: 감소 모션 선호(prefers-reduced-motion)와 다크 테마(prefers-color-scheme) 대응이 있다(§6.4)", () => {
  assert.match(CSS, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, "감소 모션 미디어쿼리 누락");
  assert.match(CSS, /@media\s*\(prefers-color-scheme:\s*dark\)/, "다크 테마 미디어쿼리 누락");
});

test("AC1: styles.css 에 원본 승계 토큰(accent/focus-ring)이 정의돼 있다(§2)", () => {
  assert.match(CSS, /--color-accent:\s*#3563e9/, "accent light 토큰 불일치");
  assert.match(CSS, /--color-focus-ring:\s*rgba\(53,\s*99,\s*233,\s*0\.45\)/, "focus-ring light 토큰 불일치");
});

// ══════════════════════════════════════════════════════════
// 4) 순수 로직 (counter.js — Counter 전역 API)
// ══════════════════════════════════════════════════════════
test("AC2: INITIAL_VALUE 는 0 (초기 표시값)", () => {
  const { INITIAL_VALUE } = loadCounter();
  assert.equal(INITIAL_VALUE, 0);
});

test("AC2: increment 는 +1 (상한 없음)", () => {
  const { increment } = loadCounter();
  assert.equal(increment(0), 1);
  assert.equal(increment(41), 42);
  assert.equal(increment(9999), 10000);
});

test("AC2: decrement 는 -1 이되 0 미만으로 내려가지 않는다(0-플로어 무음 클램프)", () => {
  const { decrement } = loadCounter();
  assert.equal(decrement(5), 4);
  assert.equal(decrement(1), 0);
  assert.equal(decrement(0), 0);
});

test("AC2: reset 은 상태 무관 항상 0 을 반환한다", () => {
  const { reset } = loadCounter();
  assert.equal(reset(), 0);
});

test("AC2: increment/decrement 는 순수 함수 — 입력을 변형하지 않는다", () => {
  const { increment, decrement } = loadCounter();
  const v = 5;
  assert.equal(increment(v), 6);
  assert.equal(decrement(v), 4);
  assert.equal(v, 5);
});
