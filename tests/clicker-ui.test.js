// BF-443 · 클릭 카운터 SPA UI 회귀 가드 (정적 + sandbox)
//
// 본 파일은 dev 산출물 (clicker/index.html · main.js · styles.css · storage.js) 의
// UI 표면 사실 (DOM 구조 · CSS 토큰 · main.js 분기) 이 silent break 되지 않도록
// 정적 회귀 가드를 둔다. 실 브라우저 인터랙션 (worker-host E2E) 은 tester 담당 —
// 본 파일은 tester 와 중복을 피하고 dev 가 책임지는 표면만 다룬다:
//   - 마크업 fact: topbar / score / click button / reset / clear-all / modal / toast / kbd-hint
//   - 명세 §9.2 복제 fact: head 인라인 다크 init / non-module <script> / <link rel="stylesheet">
//   - file:// 안전 fact: type="module" 미사용, fetch / import / export / 외부 CDN 0건
//   - CSS 토큰 fact: AC §1 정량 (--color-bg-canvas #0d1117, --color-accent #a78bfa,
//     --scale-press 0.95, --motion-press 150ms, click-button 180px, score 5rem/4rem)
//   - sandbox 시뮬: storage round-trip (다른 storage 테스트가 더 깊게 다룸 — 본 파일은 main.js
//     이벤트 와이어링이 누락되지 않았는지만 정적 grep)
//
// CI 결정성: focused scope 외 module 일 때 placeholder skip (pomodoro/weather/kanban 패턴).

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const _BRIX_MY_MODULE = "clicker";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const HERE = dirname(fileURLToPath(import.meta.url));
const CLICKER_DIR = join(HERE, "..", "clicker");
const HTML_PATH = join(CLICKER_DIR, "index.html");
const CSS_PATH = join(CLICKER_DIR, "styles.css");
const MAIN_PATH = join(CLICKER_DIR, "main.js");
const STORAGE_PATH = join(CLICKER_DIR, "storage.js");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  const HTML_SRC = readFileSync(HTML_PATH, "utf8");
  const CSS_SRC = readFileSync(CSS_PATH, "utf8");
  const MAIN_SRC = readFileSync(MAIN_PATH, "utf8");
  const STORAGE_SRC = readFileSync(STORAGE_PATH, "utf8");

  // ─────────────────────────────────────────────────────────────
  // 1. 명세 §9.2 — 기존 페이지 head/footer 공통 요소 복제 fact
  //   BF-197 회귀 (식별자 누락 silent break) 방지
  // ─────────────────────────────────────────────────────────────
  test("HTML fact: <html lang='ko' data-theme='dark'> — 다크 default 명시 (명세 §6.5)", () => {
    assert.match(
      HTML_SRC,
      /<html[^>]*lang=["']ko["'][^>]*data-theme=["']dark["']/i,
      "html lang=ko + data-theme=dark 가 누락 (FOUC 방지)",
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
      "styles.css link 누락 (file:// 안전 상대 경로)",
    );
  });

  test("HTML fact: head 인라인 다크 init script — bf-theme localStorage 읽고 data-theme 즉시 적용 (FOUC 방지)", () => {
    // pomodoro/index.html 의 패턴 그대로 복제 (명세 §6.5, §9.2)
    assert.match(
      HTML_SRC,
      /localStorage\.getItem\(["']bf-theme["']\)/,
      "bf-theme localStorage 키 읽기 누락 — 다크 init script",
    );
    assert.match(
      HTML_SRC,
      /document\.documentElement\.setAttribute\(["']data-theme["']/,
      "data-theme 속성 적용 누락 — 다크 init script",
    );
    // 저장값 없으면 default "dark" — BF-441 명세 §6.5
    assert.match(
      HTML_SRC,
      /saved\s*===\s*["']light["']\s*\|\|\s*saved\s*===\s*["']dark["']\s*\?\s*saved\s*:\s*["']dark["']/,
      "다크 default fallback 누락 (저장값 없을 때 'dark')",
    );
  });

  test("HTML fact: non-module <script src='./storage.js'> + <script src='./main.js'> 순서 (file:// 안전)", () => {
    // AC §3: ES module / fetch / 외부 CDN 금지 — 명세 §6.7, §9.4
    const storageIdx = HTML_SRC.indexOf('src="./storage.js"');
    const mainIdx = HTML_SRC.indexOf('src="./main.js"');
    assert.ok(storageIdx >= 0, "storage.js script 누락");
    assert.ok(mainIdx >= 0, "main.js script 누락");
    assert.ok(
      storageIdx < mainIdx,
      "storage.js 가 main.js 보다 먼저 로드돼야 함 (의존 순서)",
    );
    // type="module" 사용 금지
    assert.doesNotMatch(
      HTML_SRC,
      /<script[^>]+type=["']module["']/i,
      "type='module' 사용 금지 — file:// CORS 안전 (AC §3)",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 2. file:// 안전 — fetch / import / export / 외부 CDN 0건 (AC §3)
  // ─────────────────────────────────────────────────────────────
  test("file:// 안전 fact: HTML 에 외부 CDN (https://) <link> / <script> 0건", () => {
    // <link href="https://..."> 검사
    const linkHttp = HTML_SRC.match(/<link[^>]+href=["']https?:\/\//gi);
    assert.equal(linkHttp, null, "외부 CDN <link> 존재 — file:// 정책 위반");
    // <script src="https://..."> 검사
    const scriptHttp = HTML_SRC.match(/<script[^>]+src=["']https?:\/\//gi);
    assert.equal(scriptHttp, null, "외부 CDN <script> 존재 — file:// 정책 위반");
  });

  test("file:// 안전 fact: main.js / storage.js 에 fetch / import / export 키워드 0건", () => {
    // 단어 경계로 정확히 매칭 (변수명 'imported' 같은 false-positive 회피)
    for (const [label, src] of [
      ["main.js", MAIN_SRC],
      ["storage.js", STORAGE_SRC],
    ]) {
      assert.doesNotMatch(src, /\bfetch\s*\(/, `${label} 에 fetch() 호출`);
      assert.doesNotMatch(
        src,
        /^\s*import\s+[^=]/m,
        `${label} 에 import 문 사용`,
      );
      // export default / export const 등
      assert.doesNotMatch(src, /^\s*export\s+/m, `${label} 에 export 문 사용`);
    }
  });

  test("file:// 안전 fact: CSS 에 @import url / external font CDN 0건", () => {
    assert.doesNotMatch(
      CSS_SRC,
      /@import\s+url\s*\(/i,
      "@import url(...) — 외부 폰트 CDN 정책 위반",
    );
    assert.doesNotMatch(
      CSS_SRC,
      /https?:\/\//,
      "CSS 에 외부 URL — file:// 정책 위반",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 3. DOM 마크업 fact (이후 reviewer/tester 가 의존하는 식별자)
  // ─────────────────────────────────────────────────────────────
  test("마크업 fact: topbar — h1.topbar__title '클릭 카운터' + #theme-toggle + #best-score-value", () => {
    assert.match(HTML_SRC, /<h1[^>]*class=["'][^"']*topbar__title/, "topbar__title 누락");
    assert.match(HTML_SRC, /클릭 카운터/, "topbar 제목 '클릭 카운터' 누락");
    assert.match(
      HTML_SRC,
      /id=["']theme-toggle["']/,
      "theme-toggle 버튼 id 누락",
    );
    assert.match(
      HTML_SRC,
      /id=["']best-score-value["']/,
      "best-score-value 식별자 누락 — best score 표시 불가",
    );
  });

  test("마크업 fact: score display — #score-value + role='status' + aria-live='off' + .is-zero default", () => {
    assert.match(HTML_SRC, /id=["']score-value["']/, "score-value id 누락");
    // 점수 영역 role=status (명세 §5.1)
    assert.match(
      HTML_SRC,
      /class=["']score["'][^>]*role=["']status["']/,
      "score role=status 누락",
    );
    // aria-live="off" — 매 클릭마다 SR 안 읽도록 (명세 §5.1)
    assert.match(HTML_SRC, /aria-live=["']off["']/, "aria-live=off 누락");
    // 초기 점수 0 + is-zero 클래스 (속성 순서 무관 — class 와 id 둘 다 동일 element 안)
    const scoreSpanMatch = HTML_SRC.match(
      /<span\b[^>]*\bid=["']score-value["'][^>]*>/i,
    );
    assert.ok(scoreSpanMatch, "<span id='score-value'> 누락");
    assert.match(
      scoreSpanMatch[0],
      /class=["'][^"']*\bis-zero\b/,
      "is-zero default 클래스 누락",
    );
  });

  test("마크업 fact: 원형 클릭 버튼 — #btn-click + class='click-button' + aria-label + Click! 텍스트", () => {
    assert.match(HTML_SRC, /id=["']btn-click["']/, "btn-click id 누락");
    assert.match(
      HTML_SRC,
      /class=["']click-button["']/,
      "click-button 클래스 누락 — 명세 §4.4 핵심 마크업",
    );
    assert.match(
      HTML_SRC,
      /aria-label=["']클릭하여 점수 \+1["']/,
      "click 버튼 aria-label 누락",
    );
    // type="button" 명시 (form 안에 없어도 명시 — 명세 §5.2)
    assert.match(
      HTML_SRC,
      /<button[^>]+type=["']button["'][^>]+id=["']btn-click["']/,
      "btn-click type=button 누락",
    );
  });

  test("마크업 fact: 보조 컨트롤 — #btn-reset + #btn-clear-all (둘 다 default disabled, ghost variant)", () => {
    assert.match(HTML_SRC, /id=["']btn-reset["']/, "btn-reset 누락");
    assert.match(HTML_SRC, /id=["']btn-clear-all["']/, "btn-clear-all 누락");
    // 둘 다 default disabled (점수 0 / best 0 시작)
    assert.match(
      HTML_SRC,
      /<button[^>]+id=["']btn-reset["'][^>]*\bdisabled\b/,
      "btn-reset default disabled 누락",
    );
    assert.match(
      HTML_SRC,
      /<button[^>]+id=["']btn-clear-all["'][^>]*\bdisabled\b/,
      "btn-clear-all default disabled 누락",
    );
  });

  test("마크업 fact: 전체 초기화 확인 모달 — backdrop + dialog + confirm/cancel + hidden default", () => {
    assert.match(
      HTML_SRC,
      /id=["']modal-backdrop["'][^>]*hidden/,
      "modal-backdrop 누락 또는 default hidden 누락",
    );
    assert.match(
      HTML_SRC,
      /role=["']dialog["']/,
      "role=dialog 누락 (a11y)",
    );
    assert.match(
      HTML_SRC,
      /aria-modal=["']true["']/,
      "aria-modal=true 누락",
    );
    assert.match(HTML_SRC, /id=["']modal-confirm["']/, "modal-confirm 누락");
    assert.match(HTML_SRC, /id=["']modal-cancel["']/, "modal-cancel 누락");
  });

  test("마크업 fact: toast-stack 컨테이너 + role='status' + aria-live='polite' (best 갱신 축하)", () => {
    assert.match(
      HTML_SRC,
      /id=["']toast-stack["'][^>]*role=["']status["'][^>]*aria-live=["']polite["']/,
      "toast-stack 누락 또는 a11y 속성 누락",
    );
  });

  test("마크업 fact: kbd-hint — <kbd>Space</kbd> 클릭 · <kbd>R</kbd> 리셋 · <kbd>T</kbd> 테마", () => {
    assert.match(HTML_SRC, /<kbd>Space<\/kbd>/, "Space kbd 누락");
    assert.match(HTML_SRC, /<kbd>R<\/kbd>/, "R kbd 누락");
    assert.match(HTML_SRC, /<kbd>T<\/kbd>/, "T kbd 누락");
  });

  // ─────────────────────────────────────────────────────────────
  // 4. CSS 토큰 fact (AC §1 정량 일치 — 명세 §7.6)
  // ─────────────────────────────────────────────────────────────
  test("CSS 토큰: 다크 default `--color-bg-canvas: #0d1117` (AC §1 매핑)", () => {
    assert.match(
      CSS_SRC,
      /--color-bg-canvas:\s*#0d1117/i,
      "다크 canvas 토큰 #0d1117 누락 — AC §1 직접 매핑",
    );
  });

  test("CSS 토큰: 다크 default `--color-accent: #a78bfa` (AC §1 매핑)", () => {
    assert.match(
      CSS_SRC,
      /--color-accent:\s*#a78bfa/i,
      "다크 accent 토큰 #a78bfa 누락 — AC §1 직접 매핑",
    );
  });

  test("CSS 토큰: 라이트 `[data-theme='light']` 블록 + 라이트 페어 정의", () => {
    assert.match(
      CSS_SRC,
      /\[data-theme=["']light["']\]\s*\{/,
      "[data-theme='light'] override 블록 누락",
    );
    // 라이트 accent 토큰 한 줄만 sanity check (명세 §2.1)
    assert.match(
      CSS_SRC,
      /--color-accent:\s*#7[Bb]5[Bb][Ee]8/,
      "라이트 accent #7B5BE8 누락",
    );
  });

  test("CSS 토큰: `--scale-press: 0.95` + `--motion-press: 150ms` (AC §1 매핑)", () => {
    assert.match(
      CSS_SRC,
      /--scale-press:\s*0\.95/,
      "--scale-press 토큰 (0.95) 누락 — AC §1",
    );
    assert.match(
      CSS_SRC,
      /--motion-press:\s*150ms/,
      "--motion-press 토큰 (150ms) 누락 — AC §1",
    );
  });

  test("CSS 토큰: click 버튼 — width/height 180px + border-radius 50% + transform scale(var(--scale-press))", () => {
    // .click-button width/height 180px (명세 §4.4 / §7.6 정량 표)
    assert.match(
      CSS_SRC,
      /\.click-button\s*\{[^}]*width:\s*180px/s,
      ".click-button width: 180px 누락 — AC §1",
    );
    assert.match(
      CSS_SRC,
      /\.click-button\s*\{[^}]*height:\s*180px/s,
      ".click-button height: 180px 누락 — AC §1",
    );
    // border-radius via --radius-circle (50%)
    assert.match(
      CSS_SRC,
      /--radius-circle:\s*50%/,
      "--radius-circle: 50% 누락",
    );
    // active 시 transform: scale(var(--scale-press))
    assert.match(
      CSS_SRC,
      /transform:\s*scale\(var\(--scale-press\)\)/,
      "click-button active scale(var(--scale-press)) 누락 — AC §1",
    );
  });

  test("CSS 토큰: 점수 typo — desktop `--text-score: 300 5rem` + mobile `--text-score-sm: 300 4rem` (AC §1 매핑)", () => {
    assert.match(
      CSS_SRC,
      /--text-score:\s*300\s+5rem/,
      "--text-score (desktop 5rem) 누락 — AC §1 (4rem+)",
    );
    assert.match(
      CSS_SRC,
      /--text-score-sm:\s*300\s+4rem/,
      "--text-score-sm (mobile 4rem) 누락 — AC §1",
    );
    // mobile breakpoint < 640px 에서 적용
    assert.match(
      CSS_SRC,
      /@media\s*\(max-width:\s*639px\)/,
      "반응형 breakpoint 639px 누락",
    );
    // score__value 가 tabular-nums (자릿수 떨림 0)
    assert.match(
      CSS_SRC,
      /font-variant-numeric:\s*tabular-nums/,
      "tabular-nums 누락 — 자릿수 떨림 방지 (명세 §3)",
    );
  });

  test("CSS: prefers-reduced-motion 가드 — scale 인터랙션 비활성 (명세 §7.5)", () => {
    assert.match(
      CSS_SRC,
      /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
      "prefers-reduced-motion 가드 누락",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 5. main.js 분기 fact — 이벤트 와이어링 / 핸들러 / 단축키
  // ─────────────────────────────────────────────────────────────
  test("main.js fact: IIFE 패턴 (file:// 안전 — 전역 오염 0, ES module 미사용)", () => {
    // (function () { "use strict"; ... })();
    assert.match(
      MAIN_SRC,
      /^\(function\s*\(\)\s*\{/m,
      "IIFE 시작 패턴 누락",
    );
    assert.match(MAIN_SRC, /\}\)\(\);?\s*$/, "IIFE 끝 패턴 누락");
    assert.match(MAIN_SRC, /"use strict"/, "use strict 누락");
  });

  test("main.js fact: globalThis.ClickerStorage 의존 (storage.js 미리 로드 가드)", () => {
    assert.match(
      MAIN_SRC,
      /globalThis\.ClickerStorage/,
      "ClickerStorage 의존 참조 누락",
    );
    assert.match(
      MAIN_SRC,
      /createClickerStore/,
      "createClickerStore 호출 누락",
    );
  });

  test("main.js fact: 클릭 핸들러 — score++ + best 갱신 분기 + persist + 150ms press 클래스", () => {
    // score += 1
    assert.match(MAIN_SRC, /state\.score\s*\+=\s*1/, "score++ 분기 누락");
    // best 갱신: score > best 조건
    assert.match(
      MAIN_SRC,
      /state\.score\s*>\s*state\.best/,
      "best 갱신 조건 (score > best) 누락",
    );
    // persistScore / persistBest 호출
    assert.match(MAIN_SRC, /persistScore\(\)/, "persistScore 호출 누락");
    assert.match(MAIN_SRC, /persistBest\(\)/, "persistBest 호출 누락");
    // .is-pressed 토글 + 150ms setTimeout (AC §1)
    assert.match(
      MAIN_SRC,
      /classList\.add\(["']is-pressed["']\)/,
      "is-pressed 클래스 추가 누락",
    );
    assert.match(
      MAIN_SRC,
      /setTimeout\([^,]+,\s*150\s*\)/,
      "150ms setTimeout 누락 — AC §1",
    );
  });

  test("main.js fact: handleReset — score 만 0, best 보존 (AC §1 시나리오 b)", () => {
    // handleReset 함수 안에서 state.score = 0 명시
    const resetMatch = MAIN_SRC.match(
      /function\s+handleReset\s*\(\s*\)\s*\{([\s\S]*?)\n\s*\}/,
    );
    assert.ok(resetMatch, "handleReset 함수 정의 누락");
    const body = resetMatch[1];
    assert.match(body, /state\.score\s*=\s*0/, "handleReset 에서 score=0 누락");
    // best 는 건드리지 말 것 (assignment 자체가 없어야 함)
    assert.doesNotMatch(
      body,
      /state\.best\s*=/,
      "handleReset 에서 best 를 건드림 — AC 위반 (best 유지)",
    );
  });

  test("main.js fact: 전체 초기화 — 확인 모달 경유 후 score=0 + best=0 + clearAll() 호출", () => {
    // openClearAllModal 함수 정의 (모달 경유)
    assert.match(
      MAIN_SRC,
      /function\s+openClearAllModal/,
      "openClearAllModal 함수 누락 — 확인 모달 경유 정책",
    );
    // confirmClearAll 함수 안에서 score=0 + best=0 + clearAll() 호출
    const confirmMatch = MAIN_SRC.match(
      /function\s+confirmClearAll\s*\(\s*\)\s*\{([\s\S]*?)\n\s*\}/,
    );
    assert.ok(confirmMatch, "confirmClearAll 함수 정의 누락");
    const body = confirmMatch[1];
    assert.match(body, /state\.score\s*=\s*0/, "confirmClearAll score=0 누락");
    assert.match(body, /state\.best\s*=\s*0/, "confirmClearAll best=0 누락");
    assert.match(body, /store\.clearAll\(\)/, "store.clearAll() 호출 누락");
  });

  test("main.js fact: 키보드 단축 — Space / R / T (명세 §6.2)", () => {
    // keydown 리스너 등록
    assert.match(
      MAIN_SRC,
      /addEventListener\(["']keydown["']/,
      "keydown 리스너 누락",
    );
    // r 키 → handleReset
    assert.match(MAIN_SRC, /key\s*===\s*["']r["']/, "R 키 분기 누락");
    // t 키 → toggleTheme
    assert.match(MAIN_SRC, /key\s*===\s*["']t["']/, "T 키 분기 누락");
    // Space → handleClick (브라우저 기본 click 우선 — 버튼 focused 시 skip)
    assert.match(
      MAIN_SRC,
      /e\.key\s*===\s*["'] ["']|e\.code\s*===\s*["']Space["']/,
      "Space 키 분기 누락",
    );
  });

  test("main.js fact: 테마 토글 — data-theme attr + bf-theme localStorage 저장 (다른 SPA 와 공유)", () => {
    assert.match(
      MAIN_SRC,
      /setAttribute\(["']data-theme["']/,
      "data-theme setAttribute 누락",
    );
    // saveTheme 호출 (storage 추상 경유 — bf-theme 키)
    assert.match(MAIN_SRC, /saveTheme\(/, "store.saveTheme 호출 누락");
  });

  // ─────────────────────────────────────────────────────────────
  // 6. main.js 부팅 fact — 새로고침 복원 (AC §1 시나리오 d)
  // ─────────────────────────────────────────────────────────────
  test("main.js fact: 부팅 시 loadScore() + loadBest() 로 복원 (새로고침 후 복원)", () => {
    assert.match(MAIN_SRC, /store\.loadScore\(\)/, "store.loadScore 호출 누락");
    assert.match(MAIN_SRC, /store\.loadBest\(\)/, "store.loadBest 호출 누락");
  });

  test("main.js fact: best < score corrupt 방어 (best 보정)", () => {
    // 부팅 시 best < score 면 best = score 로 보정
    assert.match(
      MAIN_SRC,
      /state\.best\s*<\s*state\.score/,
      "best < score corrupt 방어 분기 누락",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 7. sandbox 시뮬: storage round-trip (storage.js 가 UMD 로 globalThis 노출)
  //   — main.js 의 store 결합 + clearAll 동작이 storage 와 정합한지 검증.
  //   (storage.js 자체의 단위 테스트는 clicker-storage.test.js 에서 깊게 다룸 —
  //    본 테스트는 main.js 가 의존하는 contract 만 sanity check)
  // ─────────────────────────────────────────────────────────────
  test("sandbox: AC §1 4 시나리오 round-trip (5회 클릭 → 리셋 → 전체 초기화 → 새로고침)", async () => {
    // dynamic import — node:vm 보다 createRequire 가 단순 (다른 storage 테스트도 동일 패턴).
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const CS = require("../clicker/storage.js");

    const mem = CS.createMemoryStorage();
    const store = CS.createClickerStore(mem);

    // (a) 5회 클릭 (main.js handleClick 의 핵심 동작 모사)
    let score = 0;
    let best = 0;
    for (let i = 0; i < 5; i++) {
      score += 1;
      if (score > best) {
        best = score;
        store.saveBest(best);
      }
      store.saveScore(score);
    }
    // 새 store 인스턴스 (= page reload)
    let reloaded = CS.createClickerStore(mem);
    assert.equal(reloaded.loadScore(), 5, "AC (a): 5회 클릭 후 score=5");
    assert.equal(reloaded.loadBest(), 5, "AC (a): 5회 클릭 후 best=5");

    // (b) 리셋 — score 만 0
    store.saveScore(0);
    reloaded = CS.createClickerStore(mem);
    assert.equal(reloaded.loadScore(), 0, "AC (b): 리셋 후 score=0");
    assert.equal(reloaded.loadBest(), 5, "AC (b): 리셋 후 best=5 유지");

    // (c) 전체 초기화 — score + best 모두 0
    store.clearAll();
    reloaded = CS.createClickerStore(mem);
    assert.equal(reloaded.loadScore(), 0, "AC (c): 전체 초기화 후 score=0");
    assert.equal(reloaded.loadBest(), 0, "AC (c): 전체 초기화 후 best=0");

    // (d) 새로고침 후 복원 (이미 위 reloaded 들이 검증)
    // 추가: theme 보존 — clearAll 후에도 bf-theme 는 살아있어야 함
    // (다른 SPA 와 공유되는 키이므로 clicker 의 전체 초기화가 다른 페이지의 테마를 깨면 안 됨)
    store.saveTheme("light");
    store.clearAll();
    // reloaded 도 같은 mem 을 공유하므로 light 가 읽혀야 함
    assert.equal(
      reloaded.loadTheme(),
      "light",
      "clearAll 후에도 bf-theme 는 보존 (공유 키)",
    );
    assert.equal(
      mem.getItem("bf-theme"),
      "light",
      "clearAll 후에도 bf-theme 는 mem 에 보존",
    );
    // clicker prefix 만 삭제됐는지 확인
    assert.equal(mem.getItem("clicker:score"), null);
    assert.equal(mem.getItem("clicker:best"), null);
  });
}
