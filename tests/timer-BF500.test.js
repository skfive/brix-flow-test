// BF-500 · 타이머 SPA 구현 검증 (BF-497 명세 기반)
// 검증 대상: timer/index.html, timer/styles.css, timer/main.js
//
// BF-497 신규 항목 (기존 BF-494/496 미커버):
//   - --color-timer-ended-glow 토큰 (dark/light) + .display.is-ended text-shadow 글로우
//   - timer/main.js IIFE 구현 (이전 ES module 위반 수정, vanilla-static 정책)
//   - FOUC IIFE 가 <link rel="stylesheet"> 앞에 배치 (BF-497 §5.2 — 기존 테스트는 </head> 이전만 검증)
//   - bf-timer-last-config localStorage 키 (main.js)
//
// 중복 제외 (기존 테스트가 커버):
//   - @keyframes timer-flash/banner-in, --color-timer-ended-flash: timer-BF494.test.js
//   - dark default, bf-theme IIFE </head> 이전: timer-BF494.test.js, timer-BF488.test.js
//   - src="app.js" 진입점, #btn-primary/reset disabled, #ended-banner hidden: timer-BF496-e2e.test.js
//   - role="status" + aria-live="polite" on #ended-banner: timer-BF488.test.js
//   - id="btn-banner-close" 존재: timer-BF488.test.js
//
// 작성 방침: fs.readFileSync + includes/regex — DOM 없이 파일 내용 정적 검사.
// tech-stack: vanilla-static (IIFE, no import/export/fetch/CDN)

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "timer";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = path.resolve(__dirname, "..");
const TIMER_CSS  = path.join(REPO_ROOT, "timer", "styles.css");
const TIMER_HTML = path.join(REPO_ROOT, "timer", "index.html");
const TIMER_MAIN = path.join(REPO_ROOT, "timer", "main.js");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {

  // ══════════════════════════════════════════════════════════════
  // timer/main.js 존재 및 vanilla-static 정책 검증
  // ══════════════════════════════════════════════════════════════

  test("BF-500: timer/main.js 파일 존재 (BF-500 산출물 필수)", () => {
    assert.ok(
      fs.existsSync(TIMER_MAIN),
      "timer/main.js 파일 없음 — BF-500 산출물 누락",
    );
  });

  test("BF-500: timer/main.js 에 top-level import/export 없음 (vanilla-static IIFE 필수)", () => {
    const js = fs.readFileSync(TIMER_MAIN, "utf-8");
    // ES module 키워드: 줄 시작에 import/export 금지
    assert.ok(
      !js.match(/^\s*(import\s|export\s)/m),
      "timer/main.js 에 import 또는 export 존재 — vanilla-static 위반 (IIFE 필수, ES module 금지)\n" +
      "file:// 로 직접 열 때 CORS 오류 발생",
    );
  });

  test("BF-500: timer/main.js 에 fetch() 없음 (vanilla-static, file:// CORS 차단)", () => {
    const js = fs.readFileSync(TIMER_MAIN, "utf-8");
    assert.ok(
      !js.includes("fetch("),
      "timer/main.js 에 fetch() 있음 — vanilla-static 위반 (file:// 환경에서 CORS 장벽으로 동작 불가)",
    );
  });

  test("BF-500: timer/main.js 에 bf-timer-last-config localStorage 키 사용 (AC3 마지막 설정 영속)", () => {
    const js = fs.readFileSync(TIMER_MAIN, "utf-8");
    assert.ok(
      js.includes("bf-timer-last-config"),
      "timer/main.js 에 bf-timer-last-config 키 없음 — AC3 localStorage 영속 계약 위반",
    );
  });

  test("BF-500: timer/main.js 에 bf-theme localStorage 키 사용 (다크 default + 테마 영속)", () => {
    const js = fs.readFileSync(TIMER_MAIN, "utf-8");
    assert.ok(
      js.includes("bf-theme"),
      "timer/main.js 에 bf-theme 키 없음 — §5.1 테마 영속 계약 위반",
    );
  });

  test("BF-500: timer/main.js 에 requestAnimationFrame 또는 setInterval 사용 (카운트다운 구현)", () => {
    const js = fs.readFileSync(TIMER_MAIN, "utf-8");
    assert.ok(
      js.includes("requestAnimationFrame") || js.includes("setInterval"),
      "timer/main.js 에 requestAnimationFrame/setInterval 없음 — AC1 카운트다운 미구현",
    );
  });

  test("BF-500: timer/main.js 에 JSON.parse + try/catch (bf-timer-last-config 파싱 실패 안전 처리)", () => {
    const js = fs.readFileSync(TIMER_MAIN, "utf-8");
    assert.ok(
      js.includes("JSON.parse"),
      "timer/main.js 에 JSON.parse 없음 — bf-timer-last-config 파싱 로직 누락",
    );
    assert.ok(
      js.includes("try") && js.includes("catch"),
      "timer/main.js 에 try/catch 없음 — §6 파싱 실패 안전 처리 누락 (빈 값 fallback 불가)",
    );
  });

  // ══════════════════════════════════════════════════════════════
  // styles.css — --color-timer-ended-glow 신규 토큰 (BF-497 §2.1/§2.2)
  // ══════════════════════════════════════════════════════════════

  test("BF-500: styles.css :root 에 --color-timer-ended-glow dark 토큰 존재 (BF-497 §2.1 신규)", () => {
    const css = fs.readFileSync(TIMER_CSS, "utf-8");
    const lightIdx =
      css.indexOf('[data-theme="light"]') !== -1
        ? css.indexOf('[data-theme="light"]')
        : css.indexOf("[data-theme='light']");
    const rootSection = lightIdx !== -1 ? css.slice(0, lightIdx) : css;
    assert.ok(
      rootSection.includes("--color-timer-ended-glow"),
      "styles.css :root 에 --color-timer-ended-glow 없음 — BF-497 §2.1 신규 글로우 토큰 누락",
    );
  });

  test("BF-500: styles.css :root 의 --color-timer-ended-glow 가 rgba(255, 107, 107, ...) dark 값 (BF-497 §2.1)", () => {
    const css = fs.readFileSync(TIMER_CSS, "utf-8");
    const lightIdx =
      css.indexOf('[data-theme="light"]') !== -1
        ? css.indexOf('[data-theme="light"]')
        : css.indexOf("[data-theme='light']");
    const rootSection = lightIdx !== -1 ? css.slice(0, lightIdx) : css;
    assert.ok(
      rootSection.includes("rgba(255") || rootSection.includes("rgba(255,"),
      "styles.css :root --color-timer-ended-glow 에 rgba(255,...) dark 글로우 값 없음 — BF-497 §2.1 위반",
    );
  });

  test("BF-500: styles.css [data-theme='light'] 에 --color-timer-ended-glow 오버라이드 존재 (BF-497 §2.2 신규)", () => {
    const css = fs.readFileSync(TIMER_CSS, "utf-8");
    const lightIdx =
      css.indexOf('[data-theme="light"]') !== -1
        ? css.indexOf('[data-theme="light"]')
        : css.indexOf("[data-theme='light']");
    assert.ok(lightIdx !== -1, "styles.css 에 [data-theme='light'] 섹션 없음");
    const lightSection = css.slice(lightIdx);
    assert.ok(
      lightSection.includes("--color-timer-ended-glow"),
      "styles.css [data-theme='light'] 에 --color-timer-ended-glow 없음 — BF-497 §2.2 light 오버라이드 누락",
    );
  });

  // ══════════════════════════════════════════════════════════════
  // styles.css — .display.is-ended 글로우 text-shadow (BF-497 §4.3 신규)
  // ══════════════════════════════════════════════════════════════

  test("BF-500: styles.css .display.is-ended 에 text-shadow 글로우 선언 (BF-497 §4.3 신규)", () => {
    const css = fs.readFileSync(TIMER_CSS, "utf-8");
    const isEndedIdx = css.indexOf(".display.is-ended");
    assert.ok(isEndedIdx !== -1, "styles.css 에 .display.is-ended 없음");
    // is-ended 블록 시작부터 약 500자 내에 text-shadow 존재 확인
    const endedBlock = css.slice(isEndedIdx, isEndedIdx + 500);
    assert.ok(
      endedBlock.includes("text-shadow"),
      ".display.is-ended 에 text-shadow 없음 — BF-497 §4.3 글로우 효과 미구현",
    );
  });

  test("BF-500: styles.css .display.is-ended text-shadow 가 --color-timer-ended-glow 참조 (BF-497 §4.3)", () => {
    const css = fs.readFileSync(TIMER_CSS, "utf-8");
    const isEndedIdx = css.indexOf(".display.is-ended");
    assert.ok(isEndedIdx !== -1, "styles.css 에 .display.is-ended 없음");
    const endedBlock = css.slice(isEndedIdx, isEndedIdx + 500);
    assert.ok(
      endedBlock.includes("--color-timer-ended-glow"),
      ".display.is-ended text-shadow 에 --color-timer-ended-glow 미참조 — BF-497 §4.3: 신규 글로우 토큰 미사용",
    );
  });

  // ══════════════════════════════════════════════════════════════
  // index.html — FOUC IIFE 가 <link rel="stylesheet"> 앞에 배치 (BF-497 §5.2)
  // 기존 테스트는 </head> 이전 여부만 확인 — FOUC 방지의 핵심인 stylesheet 앞 배치 미검증
  // ══════════════════════════════════════════════════════════════

  test("BF-500: index.html FOUC IIFE 가 <link rel='stylesheet'> 앞에 위치 (BF-497 §5.2 FOUC 방지)", () => {
    const html = fs.readFileSync(TIMER_HTML, "utf-8");
    const iifePos  = html.indexOf('localStorage.getItem("bf-theme")');
    const linkPos  = html.indexOf('<link rel="stylesheet"');
    assert.ok(iifePos !== -1,  "index.html 에 bf-theme IIFE 없음");
    assert.ok(linkPos !== -1,  "index.html 에 <link rel='stylesheet'> 없음");
    assert.ok(
      iifePos < linkPos,
      "FOUC IIFE 가 <link rel='stylesheet'> 뒤에 배치됨 — BF-497 §5.2 위반\n" +
      "stylesheet 로드 전 data-theme 설정이 안 되면 dark/light 깜빡임(FOUC) 발생",
    );
  });

  // ══════════════════════════════════════════════════════════════
  // index.html — 배너 CSS 클래스 (BF-497 §4.6)
  // ══════════════════════════════════════════════════════════════

  test("BF-500: index.html #ended-banner 요소가 class='ended-banner' 사용 (BF-497 §4.6 HTML 구조)", () => {
    const html = fs.readFileSync(TIMER_HTML, "utf-8");
    const bannerIdx = html.indexOf('id="ended-banner"');
    assert.ok(bannerIdx !== -1, 'index.html 에 id="ended-banner" 없음');
    // opened div tag 추출: id 기준 앞 <div 부터 첫 > 까지
    const tagStart = html.lastIndexOf("<div", bannerIdx);
    const tagEnd   = html.indexOf(">", bannerIdx);
    const divTag   = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      divTag.includes('class="ended-banner"'),
      '#ended-banner 태그에 class="ended-banner" 없음 — BF-497 §4.6 CSS BEM 구조 미반영\n' +
      '(이전: class="banner banner--ended" — BF-497 §4.6 명세에서 class="ended-banner" 로 확정)',
    );
  });

}
