// BF-464 · palette SPA UI 회귀 가드 (정적 + sandbox)
//
// 본 파일은 dev 산출물 (palette/index.html · app.js · styles.css · storage.js) 의
// UI 표면 사실 (DOM 구조 · CSS 토큰 · app.js 분기) 이 silent break 되지 않도록
// 정적 회귀 가드를 둔다.
//   - 마크업 fact: topbar / 5 슬롯 (HEX + HSL 레이블, 복사 버튼, 컬러 입력) / toast / theme-toggle
//   - 명세 복제 fact: head 인라인 다크 init / non-module <script> / <link rel="stylesheet">
//   - file:// 안전 fact: type="module" 미사용, fetch / import / export / 외부 CDN 0건
//   - CSS 토큰 fact: --color-bg-canvas #0d1117 / [data-theme="light"] / prefers-reduced-motion

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const _BRIX_MY_MODULE = "palette";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const HERE = dirname(fileURLToPath(import.meta.url));
const PALETTE_DIR = join(HERE, "..", "palette");
const HTML_PATH = join(PALETTE_DIR, "index.html");
const CSS_PATH = join(PALETTE_DIR, "styles.css");
const APP_PATH = join(PALETTE_DIR, "app.js");
const STORAGE_PATH = join(PALETTE_DIR, "storage.js");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  const HTML_SRC = readFileSync(HTML_PATH, "utf8");
  const CSS_SRC = readFileSync(CSS_PATH, "utf8");
  const APP_SRC = readFileSync(APP_PATH, "utf8");
  const STORAGE_SRC = readFileSync(STORAGE_PATH, "utf8");

  // ─────────────────────────────────────────────────────────────
  // 1. 공통 head/footer 사실 (다크 init + non-module scripts)
  // ─────────────────────────────────────────────────────────────

  test("HTML fact: <html lang='ko' data-theme='dark'> — 다크 default 명시", () => {
    assert.match(
      HTML_SRC,
      /<html[^>]*lang=["']ko["'][^>]*data-theme=["']dark["']/i,
      "html lang=ko + data-theme=dark 누락 (FOUC 방지)",
    );
  });

  test("HTML fact: <meta charset='UTF-8'> + viewport 명시", () => {
    assert.match(HTML_SRC, /<meta\s+charset=["']UTF-8["']/i, "charset 누락");
    assert.match(
      HTML_SRC,
      /<meta\s+name=["']viewport["'][^>]*width=device-width/i,
      "viewport meta 누락",
    );
  });

  test("HTML fact: <link rel='stylesheet' href='./styles.css'> — file:// 안전 상대 경로", () => {
    assert.match(
      HTML_SRC,
      /<link\s+rel=["']stylesheet["']\s+href=["']\.\/styles\.css["']/i,
      "styles.css link 누락",
    );
  });

  test("HTML fact: head 인라인 다크 init — bf-theme localStorage + data-theme 즉시 적용 + dark fallback", () => {
    assert.match(
      HTML_SRC,
      /localStorage\.getItem\(["']bf-theme["']\)/,
      "bf-theme localStorage 읽기 누락",
    );
    assert.match(
      HTML_SRC,
      /document\.documentElement\.setAttribute\(["']data-theme["']/,
      "data-theme 속성 적용 누락",
    );
    assert.match(
      HTML_SRC,
      /saved\s*===\s*["']light["']\s*\|\|\s*saved\s*===\s*["']dark["']\s*\?\s*saved\s*:\s*["']dark["']/,
      "다크 default fallback 누락 ('dark')",
    );
  });

  test("HTML fact: non-module <script src='./storage.js'> 가 <script src='./app.js'> 보다 먼저", () => {
    const storageIdx = HTML_SRC.indexOf('src="./storage.js"');
    const appIdx = HTML_SRC.indexOf('src="./app.js"');
    assert.ok(storageIdx >= 0, "storage.js script 누락");
    assert.ok(appIdx >= 0, "app.js script 누락");
    assert.ok(storageIdx < appIdx, "storage.js 가 app.js 보다 먼저여야 함 (의존 순서)");
    assert.doesNotMatch(
      HTML_SRC,
      /<script[^>]+type=["']module["']/i,
      "type='module' 금지 — file:// CORS 안전",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 2. file:// 안전 확인
  // ─────────────────────────────────────────────────────────────

  test("file:// 안전: HTML 에 외부 CDN (https://) <link> / <script> 0건", () => {
    const linkHttp = HTML_SRC.match(/<link[^>]+href=["']https?:\/\//gi);
    assert.equal(linkHttp, null, "외부 CDN <link> 존재 — file:// 정책 위반");
    const scriptHttp = HTML_SRC.match(/<script[^>]+src=["']https?:\/\//gi);
    assert.equal(scriptHttp, null, "외부 CDN <script> 존재 — file:// 정책 위반");
  });

  test("file:// 안전: app.js / storage.js 에 fetch / import / export 0건", () => {
    for (const [label, src] of [
      ["app.js", APP_SRC],
      ["storage.js", STORAGE_SRC],
    ]) {
      assert.doesNotMatch(src, /\bfetch\s*\(/, `${label} 에 fetch() 호출`);
      assert.doesNotMatch(src, /^\s*import\s+[^=]/m, `${label} 에 import 문 사용`);
      assert.doesNotMatch(src, /^\s*export\s+/m, `${label} 에 export 문 사용`);
    }
  });

  test("file:// 안전: CSS 에 @import url / 외부 URL 0건", () => {
    assert.doesNotMatch(CSS_SRC, /@import\s+url\s*\(/i, "@import url(...) 금지");
    assert.doesNotMatch(CSS_SRC, /https?:\/\//, "CSS 에 외부 URL 금지");
  });

  // ─────────────────────────────────────────────────────────────
  // 3. DOM 마크업 fact
  // ─────────────────────────────────────────────────────────────

  test("마크업 fact: topbar — h1 제목 '컬러 팔레트' + id='theme-toggle' 버튼", () => {
    assert.match(HTML_SRC, /컬러 팔레트/, "topbar 제목 '컬러 팔레트' 누락");
    assert.match(HTML_SRC, /id=["']theme-toggle["']/, "theme-toggle 버튼 id 누락 (AC §3)");
  });

  test("마크업 fact: id='slots' 컨테이너 존재", () => {
    assert.match(HTML_SRC, /id=["']slots["']/, "id='slots' 컨테이너 누락");
  });

  test("마크업 fact: 5개 슬롯 (id='slot-0' ~ 'slot-4')", () => {
    for (let i = 0; i < 5; i++) {
      assert.match(
        HTML_SRC,
        new RegExp(`id=["']slot-${i}["']`),
        `id='slot-${i}' 누락`,
      );
    }
  });

  test("마크업 fact: 각 슬롯에 .slot__copy-btn + data-index + .slot__hex + .slot__hsl 포함", () => {
    // slot__copy-btn with data-index
    assert.match(HTML_SRC, /class=["'][^"']*slot__copy-btn/, "slot__copy-btn 클래스 누락");
    assert.match(HTML_SRC, /data-index=["']0["']/, "data-index=0 누락");
    // HEX + HSL 레이블 클래스
    assert.match(HTML_SRC, /class=["'][^"']*slot__hex/, "slot__hex 클래스 누락 (AC: HEX 표시)");
    assert.match(HTML_SRC, /class=["'][^"']*slot__hsl/, "slot__hsl 클래스 누락 (AC: HSL 표시)");
  });

  test("마크업 fact: 각 슬롯에 input[type='color'].slot__color-input 포함 (컬러 변경)", () => {
    assert.match(
      HTML_SRC,
      /type=["']color["'][^>]*class=["'][^"']*slot__color-input/,
      "slot__color-input type=color 누락",
    );
  });

  test("마크업 fact: .slot__swatch 요소 존재 (색상 시각 표시)", () => {
    assert.match(HTML_SRC, /class=["'][^"']*slot__swatch/, "slot__swatch 클래스 누락");
  });

  test("마크업 fact: id='copy-toast' 요소 존재 (복사 시각 피드백 AC §4)", () => {
    assert.match(HTML_SRC, /id=["']copy-toast["']/, "copy-toast 누락 — 복사 피드백 AC §4");
  });

  // ─────────────────────────────────────────────────────────────
  // 4. CSS 토큰 fact
  // ─────────────────────────────────────────────────────────────

  test("CSS 토큰: 다크 default `--color-bg-canvas: #0d1117`", () => {
    assert.match(
      CSS_SRC,
      /--color-bg-canvas:\s*#0d1117/i,
      "다크 canvas 토큰 #0d1117 누락",
    );
  });

  test("CSS 토큰: `[data-theme='light']` override 블록 존재", () => {
    assert.match(
      CSS_SRC,
      /\[data-theme=["']light["']\]\s*\{/,
      "[data-theme='light'] override 블록 누락",
    );
  });

  test("CSS 토큰: prefers-reduced-motion 가드 존재", () => {
    assert.match(
      CSS_SRC,
      /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
      "prefers-reduced-motion 가드 누락",
    );
  });

  test("CSS: .slot__swatch + .slot__copy-btn 스타일 정의 존재", () => {
    assert.match(CSS_SRC, /\.slot__swatch/, ".slot__swatch 스타일 없음");
    assert.match(CSS_SRC, /\.slot__copy-btn/, ".slot__copy-btn 스타일 없음");
  });

  test("CSS: is-copied 피드백 클래스 정의 존재 (복사 시각 피드백 AC §4)", () => {
    assert.match(CSS_SRC, /\.is-copied|is-copied/, ".is-copied 피드백 클래스 없음");
  });

  // ─────────────────────────────────────────────────────────────
  // 5. app.js 분기 fact
  // ─────────────────────────────────────────────────────────────

  test("app.js fact: IIFE 패턴 (file:// 안전 — ES module 미사용)", () => {
    assert.match(APP_SRC, /^\(function\s*\(\)\s*\{/m, "IIFE 시작 패턴 누락");
    assert.match(APP_SRC, /\}\)\(\);?\s*$/, "IIFE 끝 패턴 누락");
    assert.match(APP_SRC, /"use strict"/, "use strict 누락");
  });

  test("app.js fact: globalThis.PaletteStorage 의존 (storage.js 미리 로드 가드)", () => {
    assert.match(
      APP_SRC,
      /globalThis\.PaletteStorage/,
      "PaletteStorage 의존 참조 누락",
    );
    assert.match(APP_SRC, /createPaletteStore/, "createPaletteStore 호출 누락");
  });

  test("app.js fact: store.loadColors() 호출 — 새로고침 복원 (AC §2)", () => {
    assert.match(APP_SRC, /store\.loadColors\(\)/, "store.loadColors 호출 누락 — AC §2");
  });

  test("app.js fact: store.saveColor 호출 — 컬러 변경 후 저장 (AC §2)", () => {
    assert.match(APP_SRC, /store\.saveColor\(/, "store.saveColor 호출 누락 — AC §2");
  });

  test("app.js fact: store.saveTheme 호출 — theme toggle 저장 (AC §3)", () => {
    assert.match(APP_SRC, /store\.saveTheme\(/, "store.saveTheme 호출 누락 — AC §3");
  });

  test("app.js fact: 복사 피드백 — .is-copied 클래스 토글 (AC §4)", () => {
    assert.match(
      APP_SRC,
      /classList\.add\(["']is-copied["']\)/,
      "is-copied 클래스 추가 누락 — AC §4",
    );
  });

  test("app.js fact: 테마 토글 — data-theme setAttribute + saveTheme", () => {
    assert.match(
      APP_SRC,
      /setAttribute\(["']data-theme["']/,
      "data-theme setAttribute 누락",
    );
    assert.match(APP_SRC, /saveTheme\(/, "saveTheme 호출 누락 — AC §3");
  });

  test("app.js fact: HEX 복사 — slot__copy-btn click 핸들러 + copyText / clipboard", () => {
    assert.match(
      APP_SRC,
      /slot__copy-btn/,
      "slot__copy-btn 참조 누락 (복사 핸들러)",
    );
    // clipboard write 또는 fallback execCommand
    const hasClipboard =
      /clipboard/i.test(APP_SRC) || /execCommand/i.test(APP_SRC);
    assert.ok(hasClipboard, "clipboard write 또는 execCommand fallback 없음 — AC §4");
  });

  // ─────────────────────────────────────────────────────────────
  // 6. storage.js fact
  // ─────────────────────────────────────────────────────────────

  test("storage.js fact: UMD 패턴 (globalThis.PaletteStorage 노출)", () => {
    assert.match(
      STORAGE_SRC,
      /root\.PaletteStorage\s*=/,
      "PaletteStorage UMD globalThis 노출 누락",
    );
    assert.match(STORAGE_SRC, /module\.exports\s*=\s*api/, "module.exports 할당 누락");
  });

  test("storage.js fact: hexToHsl 함수 정의 + hexToHslString 함수 정의 (export)", () => {
    assert.match(STORAGE_SRC, /hexToHsl\s*:/, "hexToHsl export 누락");
    assert.match(STORAGE_SRC, /hexToHslString\s*:/, "hexToHslString export 누락");
  });

  test("storage.js fact: PALETTE_KEY 'bf-palette' + THEME_KEY 'bf-theme' (AC 키 명세)", () => {
    assert.match(STORAGE_SRC, /["']bf-palette["']/, "bf-palette 키 누락 — AC §2");
    assert.match(STORAGE_SRC, /["']bf-theme["']/, "bf-theme 키 누락 — AC §3");
  });
}
