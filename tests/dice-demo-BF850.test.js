// BF-850 · /demo/dice 주사위 굴리기 SPA 단위/회귀 가드 (focused scope · module: dice)
//
// 대상: dice/demo/dice/ (index.html · roll.js · main.js) — 최소 데모 SPA.
//  - 순차 라우트 `/demo/dice` (파일 소유권 dice/** 제약상 dice/demo/dice/ 배치)
//  - 스타일은 기존 dice/styles.css 재사용 (../../styles.css 링크 — 토큰·공용 버튼 재사용)
//
// 수용 기준 (BF-850):
//  AC-1: /demo/dice 진입 시 초기 숫자 + 굴리기 버튼 표시
//  AC-2: 굴리기 버튼 클릭/키보드 활성화 시 1~6 유효 무작위 숫자 표시
//  AC-3: 모바일 뷰포트에서 콘텐츠 잘림 없이 표시
//
// vanilla-static: file:// 안전 (import/export/fetch/type=module/외부 CDN 0건) 가드 포함.

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

// ── focused scope guard — 자기 module 외 skip ──
const _BRIX_MY_MODULE = "dice";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = join(HERE, "..", "dice", "demo", "dice");
const HTML_PATH = join(DEMO_DIR, "index.html");
const ROLL_PATH = join(DEMO_DIR, "roll.js");
const MAIN_PATH = join(DEMO_DIR, "main.js");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  const HTML_SRC = readFileSync(HTML_PATH, "utf8");
  const ROLL_SRC = readFileSync(ROLL_PATH, "utf8");
  const MAIN_SRC = readFileSync(MAIN_PATH, "utf8");

  const require = createRequire(import.meta.url);
  const Roll = require(ROLL_PATH);

  // ─────────────────────────────────────────────────────────
  // 1. 순수 로직 — rollOne 1~6 · glyph 매핑 (AC-2 근간)
  // ─────────────────────────────────────────────────────────
  test("roll.js: rollOne 은 항상 1~6 정수 (10000회 표본)", () => {
    for (let i = 0; i < 10000; i += 1) {
      const v = Roll.rollOne();
      assert.ok(Number.isInteger(v), `정수 아님: ${v}`);
      assert.ok(v >= 1 && v <= 6, `1~6 범위 이탈: ${v}`);
    }
  });

  test("roll.js: rollOne 은 rng 주입 시 경계값 매핑 (0→1, 0.999→6)", () => {
    assert.equal(Roll.rollOne(() => 0), 1, "rng 0 → 1");
    assert.equal(Roll.rollOne(() => 0.9999), 6, "rng ~1 → 6");
    assert.equal(Roll.rollOne(() => 0.5), 4, "rng 0.5 → 4");
  });

  test("roll.js: rollOne 은 6면 전부 도달 가능 (분포 커버리지)", () => {
    const seen = new Set();
    for (let i = 0; i < 5000 && seen.size < 6; i += 1) seen.add(Roll.rollOne());
    assert.equal(seen.size, 6, `1~6 전면 미도달: ${[...seen].sort()}`);
  });

  test("roll.js: glyph 은 1~6 을 유니코드 주사위면으로 매핑", () => {
    const GLYPHS = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    for (let n = 1; n <= 6; n += 1) {
      assert.equal(Roll.glyph(n), GLYPHS[n - 1], `glyph(${n}) mismatch`);
    }
  });

  test("roll.js: glyph 은 범위 밖(0·7·NaN·소수)에 빈 문자열 반환 (0/7+ 표시 금지)", () => {
    for (const bad of [0, 7, -1, 1.5, NaN, "3"]) {
      assert.equal(Roll.glyph(bad), "", `glyph(${bad}) 은 "" 이어야 함`);
    }
  });

  // ─────────────────────────────────────────────────────────
  // 2. AC-1 — 초기 숫자 + 굴리기 버튼 마크업
  // ─────────────────────────────────────────────────────────
  test("HTML fact: 굴리기 버튼 #btn-roll (type=button, aria-label) 존재 (AC-1)", () => {
    assert.match(
      HTML_SRC,
      /<button[^>]*id=["']btn-roll["'][^>]*>/i,
      "#btn-roll 버튼 누락",
    );
    assert.match(HTML_SRC, /id=["']btn-roll["'][^>]*type=["']button["']|type=["']button["'][^>]*id=["']btn-roll["']/i, "type=button 누락");
    assert.match(HTML_SRC, /class=["'][^"']*roll-button/i, "공용 .roll-button 클래스 미사용");
  });

  test("HTML fact: 주사위 표시 박스 #dice-box + 초기 숫자 결과 #roll-result 존재 (AC-1)", () => {
    assert.match(HTML_SRC, /id=["']dice-box["']/i, "#dice-box 누락");
    assert.match(HTML_SRC, /id=["']roll-result["']/i, "#roll-result (초기 숫자) 누락");
  });

  test("HTML fact: 결과 영역은 aria-live 로 SR 갱신 통지 (AC-2 접근성)", () => {
    assert.match(
      HTML_SRC,
      /id=["']roll-result["'][^>]*aria-live=|aria-live=[^>]*id=["']roll-result["']/i,
      "#roll-result 에 aria-live 누락",
    );
  });

  // ─────────────────────────────────────────────────────────
  // 3. main.js 배선 fact — 클릭 + 키보드 (AC-2)
  // ─────────────────────────────────────────────────────────
  test("main.js: 굴리기 클릭 핸들러 배선 (addEventListener click)", () => {
    assert.match(MAIN_SRC, /addEventListener\(\s*["']click["']/i, "click 핸들러 누락");
  });

  test("main.js: 키보드 굴리기 배선 (Space/Enter keydown 처리) (AC-2)", () => {
    assert.match(MAIN_SRC, /addEventListener\(\s*["']keydown["']/i, "keydown 핸들러 누락");
    assert.match(MAIN_SRC, /["'] ["']|Spacebar|Space|Enter/i, "Space/Enter 키 분기 누락");
  });

  test("main.js: DiceDemoRoll (순수 로직) 을 사용 (rollOne 재사용)", () => {
    assert.match(MAIN_SRC, /DiceDemoRoll|rollOne/i, "roll 로직 참조 누락");
  });

  // ─────────────────────────────────────────────────────────
  // 4. file:// 안전 (vanilla-static 정책) — AC-3 무관하나 stack 필수
  // ─────────────────────────────────────────────────────────
  test("file:// 안전: HTML 에 type=module / 외부 CDN(link·script) 0건", () => {
    assert.doesNotMatch(HTML_SRC, /<script[^>]+type=["']module["']/i, "type=module 금지");
    assert.equal(HTML_SRC.match(/<link[^>]+href=["']https?:\/\//gi), null, "외부 CDN link 금지");
    assert.equal(HTML_SRC.match(/<script[^>]+src=["']https?:\/\//gi), null, "외부 CDN script 금지");
  });

  test("file:// 안전: roll.js / main.js 에 fetch·import·export 문 0건", () => {
    for (const [label, src] of [["roll.js", ROLL_SRC], ["main.js", MAIN_SRC]]) {
      assert.doesNotMatch(src, /\bfetch\s*\(/, `${label} fetch() 호출`);
      assert.doesNotMatch(src, /^\s*import\s+[^=]/m, `${label} import 문`);
      // UMD 의 module.exports 는 허용 — 라인 시작 export 만 금지
      assert.doesNotMatch(src, /^\s*export\s+/m, `${label} export 문`);
    }
  });

  // ─────────────────────────────────────────────────────────
  // 5. AC-3 — 반응형/잘림 없음 (스타일 재사용 + 뷰포트)
  // ─────────────────────────────────────────────────────────
  test("HTML fact: viewport meta (width=device-width) — 모바일 렌더 (AC-3)", () => {
    assert.match(
      HTML_SRC,
      /<meta\s+name=["']viewport["'][^>]*width=device-width/i,
      "viewport meta 누락 (모바일 잘림 방지 근간)",
    );
  });

  test("HTML fact: 기존 dice/styles.css 재사용 링크 (../../styles.css) — 토큰·반응형 재사용", () => {
    assert.match(
      HTML_SRC,
      /<link[^>]+href=["']\.\.\/\.\.\/styles\.css["']/i,
      "기존 dice/styles.css (../../styles.css) 링크 누락",
    );
  });

  test("HTML fact: 다크 default (data-theme='dark') + 테마 init script (FOUC 방지)", () => {
    assert.match(
      HTML_SRC,
      /<html[^>]*data-theme=["']dark["']/i,
      "data-theme=dark 누락",
    );
    assert.match(HTML_SRC, /localStorage\.getItem\(["']bf-theme["']\)/, "테마 init script 누락");
  });
}
