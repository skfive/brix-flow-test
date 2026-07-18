/* delivery-exceptions-canary/tests/render.test.js — 진입 렌더 contract·CORS 안전·토큰 정합 정적 가드
 * BF-1033 · 기획 §8(라우트 진입/렌더) / 디자인 §4·§8 (마크업·토큰 contract)
 * vanilla-static — node --test 로만 실행. 실 브라우저 인터랙션은 e2e-runner 로 별도 스모크.
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf-8");

test("index.html — 2-pane 구조 및 핵심 id 존재 (진입 렌더 contract, AC1)", () => {
  const html = read("index.html");
  ['id="dxc-summary"', 'id="dxc-filter-tabs"', 'id="dxc-list"', 'id="dxc-detail"'].forEach((needle) =>
    assert.ok(html.includes(needle), "누락: " + needle)
  );
  assert.ok(html.includes('role="tablist"'), "tablist role 누락");
  assert.ok(html.includes('role="listbox"'), "listbox role 누락");
  assert.ok(html.includes('aria-live="polite"'), "상세 aria-live 누락");
});

test("index.html — CORS 안전(외부 CDN·fetch·type=module 0건, 기획 §8.2)", () => {
  const html = read("index.html");
  assert.ok(!/https?:\/\//.test(html.replace(/lang="ko"/g, "")), "외부 URL 참조 발견");
  assert.ok(!html.includes('type="module"'), "type=module 사용 금지");
  assert.ok(!/\bfetch\s*\(/.test(html), "fetch 사용 금지");
  // 로드 순서 = 의존 순서
  ["./fixtures.js", "./domain.js", "./notes-storage.js", "./main.js"].forEach((src) =>
    assert.ok(html.includes('src="' + src + '"'), "script 누락: " + src)
  );
});

test("소스 파일 — import/export ESM 구문 0건(UMD, file:// 안전)", () => {
  ["fixtures.js", "domain.js", "notes-storage.js", "main.js"].forEach((f) => {
    const src = read(f);
    assert.ok(!/^\s*import\s/m.test(src), f + ": import 구문 발견");
    assert.ok(!/^\s*export\s/m.test(src), f + ": export 구문 발견");
  });
});

// 주석(블록/라인)을 제거해 실제 코드만 남긴다 — 주석 내 토큰 오탐 방지.
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

test("결정성 — fixtures.js 에 Date.now()/Math.random() 0건 (기획 §7.1)", () => {
  const code = stripComments(read("fixtures.js"));
  assert.ok(!code.includes("Date.now"), "fixtures Date.now 사용");
  assert.ok(!code.includes("Math.random"), "fixtures Math.random 사용");
});

test("styles.css — --dxc-* 토큰 정의 및 상태별 뱃지 매핑 존재 (디자인 §2·§8.3)", () => {
  const css = read("styles.css");
  [
    "--dxc-color-bg: #fafaf9",
    "--dxc-color-accent: #3563e9",
    "--dxc-color-open",
    "--dxc-color-investigating",
    "--dxc-color-hold",
    "--dxc-color-resolved",
  ].forEach((tok) => assert.ok(css.includes(tok), "토큰 누락: " + tok));
  ["open", "investigating", "on_hold", "resolved"].forEach((s) =>
    assert.ok(css.includes('data-status="' + s + '"'), "뱃지 매핑 누락: " + s)
  );
});

test("styles.css — 컴포넌트 규칙은 하드코딩 HEX 없이 var(--dxc-*) 참조 (디자인 §0 정책)", () => {
  const css = read("styles.css");
  // :root 정의 블록 이후(컴포넌트 규칙 영역)에는 색상 리터럴이 없어야 한다.
  const rootEnd = css.indexOf("}", css.indexOf(":root"));
  const componentCss = css.slice(rootEnd);
  const hexInComponent = componentCss.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
  // 예외: 흰색(#ffffff)은 버튼 텍스트에 직접 사용(디자인 §5.4 primary 흰 텍스트)
  const disallowed = hexInComponent.filter((h) => h.toLowerCase() !== "#ffffff");
  assert.deepEqual(disallowed, [], "컴포넌트 규칙에 하드코딩 HEX: " + disallowed.join(", "));
});

test("main.js — require 시 top-level DOM 부작용 없이 init 노출", () => {
  const app = require("../main.js");
  assert.equal(typeof app.init, "function");
  assert.equal(typeof app.nowIsoKst, "function");
});
