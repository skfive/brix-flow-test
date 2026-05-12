// BF-450 · 주사위 SPA UI 회귀 가드 (정적 + sandbox)
//
// 본 파일은 BF-448 의 dev 산출물 (dice/index.html · main.js · storage.js · styles.css) 의
// UI 표면 사실 (DOM 마크업 · CSS 토큰 · 이모지 · 모달) 이 silent break 되지
// 않도록 정적 회귀 가드를 둔다. 실 브라우저 인터랙션 (굴리기 → 통계 → 히스토리
// 재표시 → 삭제 모달 → 키보드 단축) 은 tests/dice-e2e-worker-host.test.js 가 담당.
//
// dev 의 dice-storage.test.js 는 이미 다음을 검증 (재작성 금지 — A-tester 중복 차단):
//   - DICE_HISTORY_CAP=10, DICE_COUNT_MIN/MAX/DEFAULT
//   - createMemoryStorage Web Storage API 호환
//   - saveDiceCount / loadDiceCount round-trip · 범위 검증
//   - pushRoll cap 10 · 1~5 가변 dice · 잘못된 entry throw
//   - loadHistory JSON 파괴 / 배열 아님 / 깨진 entry silent fallback
//   - clearHistory / clearAll · bf-theme 공유 보존
//   - 다른 SPA prefix 격리
//
// 본 파일은 그 외 — tester 만이 책임지는 UI 표면 — 만 다룬다:
//   1. HTML 마크업 fact: 다크 default · viewport · 다크 init script · non-module script
//   2. file:// 안전 fact: type=module / fetch / import / export / 외부 CDN 0건
//   3. 주사위 박스 + 1~5 개수 radiogroup + 굴리기 CTA DOM fact
//   4. 통계 카드 (sum / avg / max) + history-list + clear-history btn DOM fact
//   5. 전체 삭제 확인 모달 (backdrop + dialog role + confirm/cancel) DOM fact
//   6. kbd-hint (Space / 1~5 / T) 마크업 fact
//   7. CSS 토큰 정량 fact: AC §1 매핑 (#0d1117, #fb7185 dark / #e11d48 light,
//      --motion-roll 360ms, --radius-dice 16px, --text-dice 5rem/4rem, 5rem emoji)
//   8. main.js 분기 fact: IIFE · DiceStorage 의존 · rollOne 1~6 · 모달 confirm 분기 ·
//      키보드 Space/1~5/T 단축 · 재표시 분기 · 다크 init
//   9. 이모지 fact: DICE_GLYPHS ["⚀","⚁","⚂","⚃","⚄","⚅"] 6 종 (주사위면 1~6)
//  10. sandbox 시뮬: AC 1~5 가변 · 10건 cap · 재표시 → diceCount 동기화 round-trip
//
// CI 결정성: focused scope 외 module 일 때 placeholder skip (pomodoro/weather/clicker 패턴).

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "dice";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const HERE = dirname(fileURLToPath(import.meta.url));
const DICE_DIR = join(HERE, "..", "dice");
const HTML_PATH = join(DICE_DIR, "index.html");
const CSS_PATH = join(DICE_DIR, "styles.css");
const MAIN_PATH = join(DICE_DIR, "main.js");
const STORAGE_PATH = join(DICE_DIR, "storage.js");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  const HTML_SRC = readFileSync(HTML_PATH, "utf8");
  const CSS_SRC = readFileSync(CSS_PATH, "utf8");
  const MAIN_SRC = readFileSync(MAIN_PATH, "utf8");
  const STORAGE_SRC = readFileSync(STORAGE_PATH, "utf8");

  // ─────────────────────────────────────────────────────────────
  // 1. 명세 §9.2 — 다크 default + viewport + non-module script (BF-197 회귀 방지)
  // ─────────────────────────────────────────────────────────────
  test("HTML fact: <html lang='ko' data-theme='dark'> — 다크 default 명시 (명세 §6.5)", () => {
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
      "styles.css link 누락 (file:// 안전 상대 경로)",
    );
  });

  test("HTML fact: head 인라인 다크 init script — bf-theme localStorage 읽고 data-theme 즉시 적용 (FOUC 방지)", () => {
    // notepad / clicker / pomodoro 의 패턴 복제 (명세 §6.5, §9.2)
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
    // 저장값 없으면 default "dark"
    assert.match(
      HTML_SRC,
      /saved\s*===\s*["']light["']\s*\|\|\s*saved\s*===\s*["']dark["']\s*\?\s*saved\s*:\s*["']dark["']/,
      "다크 default fallback 누락 (저장값 없을 때 'dark')",
    );
  });

  test("HTML fact: non-module <script src='./storage.js'> + <script src='./main.js'> 순서 (file:// 안전)", () => {
    const storageIdx = HTML_SRC.indexOf('src="./storage.js"');
    const mainIdx = HTML_SRC.indexOf('src="./main.js"');
    assert.ok(storageIdx >= 0, "storage.js script 누락");
    assert.ok(mainIdx >= 0, "main.js script 누락");
    assert.ok(
      storageIdx < mainIdx,
      "storage.js 가 main.js 보다 먼저 로드돼야 함 (의존 순서)",
    );
    assert.doesNotMatch(
      HTML_SRC,
      /<script[^>]+type=["']module["']/i,
      "type='module' 사용 금지 — file:// CORS 안전",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 2. file:// 안전 — fetch / import / export / 외부 CDN 0건
  // ─────────────────────────────────────────────────────────────
  test("file:// 안전 fact: HTML 에 외부 CDN (https://) <link> / <script> 0건", () => {
    const linkHttp = HTML_SRC.match(/<link[^>]+href=["']https?:\/\//gi);
    assert.equal(linkHttp, null, "외부 CDN <link> 존재 — file:// 정책 위반");
    const scriptHttp = HTML_SRC.match(/<script[^>]+src=["']https?:\/\//gi);
    assert.equal(scriptHttp, null, "외부 CDN <script> 존재 — file:// 정책 위반");
  });

  test("file:// 안전 fact: main.js / storage.js 에 fetch / import / export 키워드 0건", () => {
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
      // export default / export const 등 (storage 는 UMD 패턴 — module.exports 는 허용)
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
  // 3. 주사위 박스 + 1~5 가변 개수 radiogroup + 굴리기 CTA DOM fact (작업 AC)
  // ─────────────────────────────────────────────────────────────
  test("마크업 fact: topbar — h1.topbar__title '주사위' + #theme-toggle", () => {
    assert.match(HTML_SRC, /<h1[^>]*class=["'][^"']*topbar__title/, "topbar__title 누락");
    assert.match(HTML_SRC, />주사위</, "topbar 제목 '주사위' 누락");
    assert.match(HTML_SRC, /id=["']theme-toggle["']/, "theme-toggle 버튼 id 누락");
  });

  test("마크업 fact: 주사위 박스 #dice-box + role='group' + aria-label='주사위 결과'", () => {
    assert.match(HTML_SRC, /id=["']dice-box["']/, "dice-box id 누락");
    // role + aria-label
    const boxMatch = HTML_SRC.match(/<div\b[^>]*\bid=["']dice-box["'][^>]*>/i);
    assert.ok(boxMatch, "<div id='dice-box'> 누락");
    assert.match(boxMatch[0], /role=["']group["']/, "dice-box role=group 누락");
    assert.match(
      boxMatch[0],
      /aria-label=["']주사위 결과["']/,
      "dice-box aria-label='주사위 결과' 누락",
    );
  });

  test("마크업 fact: 주사위 개수 radiogroup 1~5 — data-count 5 entry 모두 존재 (작업 AC: 1~5 가변)", () => {
    // fieldset.dice-count > div[role=radiogroup]
    assert.match(
      HTML_SRC,
      /<fieldset[^>]+class=["']dice-count["']/,
      "dice-count fieldset 누락",
    );
    assert.match(
      HTML_SRC,
      /role=["']radiogroup["']/,
      "dice-count__group role=radiogroup 누락",
    );
    // 1~5 button data-count 모두 존재
    for (const n of [1, 2, 3, 4, 5]) {
      const re = new RegExp(
        `<button[^>]+class=["']dice-count__btn["'][^>]+data-count=["']${n}["']`,
        "i",
      );
      assert.match(HTML_SRC, re, `dice-count 버튼 data-count=${n} 누락`);
    }
    // role=radio 마크업
    const radioMatches = HTML_SRC.match(/role=["']radio["']/g);
    assert.ok(
      radioMatches && radioMatches.length === 5,
      `role=radio 가 5건이어야 함 — 실제 ${radioMatches ? radioMatches.length : 0}건`,
    );
    // default 2 — aria-checked="true" 가 data-count="2" 와 같은 button 안
    const defaultBtnMatch = HTML_SRC.match(
      /<button[^>]+data-count=["']2["'][^>]*aria-checked=["']true["']|<button[^>]+aria-checked=["']true["'][^>]*data-count=["']2["']/i,
    );
    assert.ok(defaultBtnMatch, "default 2 개 (aria-checked=true · data-count=2) 누락");
  });

  test("마크업 fact: 굴리기 CTA #btn-roll + class='roll-button' + aria-label + 🎲 이모지", () => {
    assert.match(HTML_SRC, /id=["']btn-roll["']/, "btn-roll id 누락");
    assert.match(
      HTML_SRC,
      /class=["']roll-button["']/,
      "roll-button 클래스 누락 — 명세 §4.4 핵심 마크업",
    );
    assert.match(
      HTML_SRC,
      /aria-label=["']주사위 굴리기["']/,
      "굴리기 CTA aria-label 누락",
    );
    // type="button" 명시
    assert.match(
      HTML_SRC,
      /<button[^>]+type=["']button["'][^>]+id=["']btn-roll["']/,
      "btn-roll type=button 누락",
    );
    // 🎲 이모지 (작업 AC — 굴리기 시그널)
    assert.match(HTML_SRC, /🎲/, "🎲 굴리기 이모지 누락");
  });

  // ─────────────────────────────────────────────────────────────
  // 4. 통계 카드 + 히스토리 + 전체 삭제 버튼 마크업 fact
  // ─────────────────────────────────────────────────────────────
  test("마크업 fact: 통계 카드 — #stat-sum + #stat-avg + #stat-max + 단일 굴림 기준", () => {
    assert.match(HTML_SRC, /id=["']stat-sum["']/, "stat-sum id 누락");
    assert.match(HTML_SRC, /id=["']stat-avg["']/, "stat-avg id 누락");
    assert.match(HTML_SRC, /id=["']stat-max["']/, "stat-max id 누락");
    // 합계 강조 — .stat-row__value--sum 변종 클래스 (작업 AC: 합계 강조)
    assert.match(
      HTML_SRC,
      /class=["'][^"']*\bstat-row__value--sum\b/,
      "stat-row__value--sum modifier 클래스 누락 — 합계 강조 (명세 §4.5)",
    );
    // 초기값 "--" 플레이스홀더 (rolls 없을 때) — 단일 굴림 기준
    // dice/index.html 은 다중 라인 attribute 포맷 사용 → s 플래그 필요.
    const sumSpanMatch = HTML_SRC.match(
      /<span\b[^>]*\bid=["']stat-sum["'][^>]*>([\s\S]*?)<\/span\s*>/i,
    );
    assert.ok(sumSpanMatch, "<span id='stat-sum'> 누락");
    assert.match(sumSpanMatch[1], /--/, "stat-sum 초기 플레이스홀더 '--' 누락");
  });

  test("마크업 fact: 히스토리 — #history-list + #history-empty + #btn-clear-history default disabled", () => {
    assert.match(HTML_SRC, /id=["']history-list["']/, "history-list 누락");
    assert.match(HTML_SRC, /id=["']history-empty["']/, "history-empty 누락 (초기 빈 상태)");
    // 빈 상태 메시지 텍스트
    assert.match(
      HTML_SRC,
      /아직 굴림 기록 없음/,
      "히스토리 빈 상태 메시지 누락",
    );
    // 전체 삭제 버튼 — default disabled (작업 AC: 히스토리 없으면 비활성)
    assert.match(HTML_SRC, /id=["']btn-clear-history["']/, "btn-clear-history id 누락");
    assert.match(
      HTML_SRC,
      /<button[^>]+id=["']btn-clear-history["'][^>]*\bdisabled\b/,
      "btn-clear-history default disabled 누락 (히스토리 비어있음)",
    );
  });

  test("마크업 fact: 전체 삭제 확인 모달 — backdrop + dialog + confirm/cancel + hidden default (작업 AC)", () => {
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
    // 모달 body 가 "10건" + "되돌릴 수 없" 텍스트 포함 (작업 AC 의 cap 10 명시)
    assert.match(
      HTML_SRC,
      /10건[^<]*되돌릴 수 없/,
      "모달 body 의 '최근 10건' + '되돌릴 수 없' 안내 텍스트 누락",
    );
  });

  test("마크업 fact: kbd-hint — <kbd>Space</kbd> 굴리기 · <kbd>1</kbd>–<kbd>5</kbd> 개수 · <kbd>T</kbd> 테마", () => {
    assert.match(HTML_SRC, /<kbd>Space<\/kbd>/, "Space kbd 누락");
    assert.match(HTML_SRC, /<kbd>1<\/kbd>/, "1 kbd 누락");
    assert.match(HTML_SRC, /<kbd>5<\/kbd>/, "5 kbd 누락");
    assert.match(HTML_SRC, /<kbd>T<\/kbd>/, "T kbd 누락");
  });

  // ─────────────────────────────────────────────────────────────
  // 5. CSS 토큰 fact — AC §1 정량 (명세 §7.6) + 작업 AC 의 1~5 가변 / 모달
  // ─────────────────────────────────────────────────────────────
  test("CSS 토큰: 다크 default `--color-bg-canvas: #0d1117` (AC §1 매핑)", () => {
    assert.match(
      CSS_SRC,
      /--color-bg-canvas:\s*#0d1117/i,
      "다크 canvas 토큰 #0d1117 누락 — AC §1 직접 매핑",
    );
  });

  test("CSS 토큰: 다크 default `--color-accent: #fb7185` (rose-400 — AC §1 매핑)", () => {
    assert.match(
      CSS_SRC,
      /--color-accent:\s*#fb7185/i,
      "다크 accent 토큰 #fb7185 누락 — AC §1 직접 매핑",
    );
  });

  test("CSS 토큰: 라이트 `[data-theme='light']` 블록 + `--color-accent: #e11d48`", () => {
    assert.match(
      CSS_SRC,
      /\[data-theme=["']light["']\]\s*\{/,
      "[data-theme='light'] override 블록 누락",
    );
    assert.match(
      CSS_SRC,
      /--color-accent:\s*#e11d48/i,
      "라이트 accent 토큰 #e11d48 누락 — AC §1 매핑",
    );
  });

  test("CSS 토큰: `--motion-roll: 360ms` + `--radius-dice: 16px` (주사위 전용)", () => {
    assert.match(
      CSS_SRC,
      /--motion-roll:\s*360ms/,
      "--motion-roll 360ms 누락 — AC §1",
    );
    assert.match(
      CSS_SRC,
      /--radius-dice:\s*16px/,
      "--radius-dice 16px 누락 — AC §1",
    );
  });

  test("CSS 토큰: --text-dice 5rem (desktop) + --text-dice-sm 4rem (mobile <640px)", () => {
    // --text-dice: 400 5rem/1 var(--font-emoji)
    assert.match(
      CSS_SRC,
      /--text-dice:\s*[^;]*\b5rem\b[^;]*var\(--font-emoji\)/,
      "--text-dice 5rem (desktop) 누락 — AC §1",
    );
    assert.match(
      CSS_SRC,
      /--text-dice-sm:\s*[^;]*\b4rem\b[^;]*var\(--font-emoji\)/,
      "--text-dice-sm 4rem (mobile) 누락 — AC §1",
    );
    // mobile breakpoint 639px
    assert.match(
      CSS_SRC,
      /@media\s*\(max-width:\s*639px\)/,
      "반응형 breakpoint 639px 누락",
    );
  });

  test("CSS 토큰: .dice 96×96px (desktop) + dice-wiggle keyframes (굴리기 시각 효과)", () => {
    // .dice 의 width / height 96px
    assert.match(
      CSS_SRC,
      /\.dice\s*\{[^}]*width:\s*96px/s,
      ".dice width:96px 누락",
    );
    assert.match(
      CSS_SRC,
      /\.dice\s*\{[^}]*height:\s*96px/s,
      ".dice height:96px 누락",
    );
    // 굴림 애니메이션 keyframes
    assert.match(
      CSS_SRC,
      /@keyframes\s+dice-wiggle/,
      "@keyframes dice-wiggle 누락 — 굴림 시각 효과",
    );
  });

  test("CSS 토큰: 합계 강조 — .stat-row__value--sum + var(--color-sum-accent) (명세 §4.5)", () => {
    // .stat-row__value--sum 셀렉터
    assert.match(
      CSS_SRC,
      /\.stat-row__value--sum/,
      ".stat-row__value--sum 셀렉터 누락 — 합계 강조 (명세 §4.5)",
    );
    // --color-sum-accent 토큰 정의
    assert.match(
      CSS_SRC,
      /--color-sum-accent:/,
      "--color-sum-accent 토큰 정의 누락",
    );
  });

  test("CSS 토큰: 모달 z-index 1100 + backdrop rgba(0,0,0,0.6) + .modal-backdrop[hidden] display:none (작업 AC)", () => {
    // .modal-backdrop z-index
    assert.match(
      CSS_SRC,
      /\.modal-backdrop\s*\{[^}]*z-index:\s*1100/s,
      "modal-backdrop z-index 1100 누락 (모달 위 계층)",
    );
    // backdrop 색 rgba(0,0,0,0.6) — 다크 외 토큰 의존 없이 직접
    assert.match(
      CSS_SRC,
      /\.modal-backdrop\s*\{[^}]*rgba\(0,\s*0,\s*0,\s*0\.6\)/s,
      "modal-backdrop background rgba(0,0,0,0.6) 누락",
    );
    // [hidden] 일 때 display:none
    assert.match(
      CSS_SRC,
      /\.modal-backdrop\[hidden\]\s*\{[^}]*display:\s*none/s,
      ".modal-backdrop[hidden] display:none 누락 — hidden 속성 적용 보장",
    );
  });

  test("CSS: prefers-reduced-motion 가드 — dice-wiggle 비활성 (명세 §7.5)", () => {
    assert.match(
      CSS_SRC,
      /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
      "prefers-reduced-motion 가드 누락",
    );
    // 가드 안에 .dice-box.is-rolling .dice 의 animation: none
    assert.match(
      CSS_SRC,
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.dice-box\.is-rolling\s+\.dice\s*\{[^}]*animation:\s*none/s,
      "reduced-motion 가드 안의 dice-wiggle animation:none 누락",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 6. main.js 분기 fact — 와이어링 / 핸들러 / 단축키 / 재표시 (작업 AC)
  // ─────────────────────────────────────────────────────────────
  test("main.js fact: IIFE 패턴 (file:// 안전 — 전역 오염 0, ES module 미사용)", () => {
    assert.match(
      MAIN_SRC,
      /^\(function\s*\(\)\s*\{/m,
      "IIFE 시작 패턴 누락",
    );
    assert.match(MAIN_SRC, /\}\)\(\);?\s*$/, "IIFE 끝 패턴 누락");
    assert.match(MAIN_SRC, /"use strict"/, "use strict 누락");
  });

  test("main.js fact: globalThis.DiceStorage 의존 (storage.js 미리 로드 가드)", () => {
    assert.match(
      MAIN_SRC,
      /globalThis\.DiceStorage/,
      "DiceStorage 의존 참조 누락",
    );
    assert.match(
      MAIN_SRC,
      /createDiceStore/,
      "createDiceStore 호출 누락",
    );
  });

  test("main.js fact: rollOne — 1 + Math.floor(Math.random() * 6) (1~6 균등)", () => {
    // function rollOne / arrow rollOne — 1 + floor(random * 6) 정확히
    assert.match(
      MAIN_SRC,
      /1\s*\+\s*Math\.floor\(\s*Math\.random\(\)\s*\*\s*6\s*\)/,
      "rollOne 1~6 균등 분포 식 누락",
    );
  });

  test("main.js fact: DICE_GLYPHS = 6 이모지 (⚀⚁⚂⚃⚄⚅) — 주사위면 1~6 매핑", () => {
    // 배열 리터럴 ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"]
    const glyphs = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    for (const g of glyphs) {
      assert.ok(
        MAIN_SRC.includes(g),
        `DICE_GLYPHS 에 ${g} 누락 (1~6 매핑)`,
      );
    }
    // DICE_GLYPHS 식별자 자체 존재 (배열로 보관)
    assert.match(MAIN_SRC, /DICE_GLYPHS/, "DICE_GLYPHS 식별자 누락");
  });

  test("main.js fact: 굴림 핸들러 — finalRolls 미리 결정 + 3 swap × 120ms + commitRoll(finalRolls)", () => {
    // handleRoll 함수 정의 + state.isRolling 가드
    assert.match(
      MAIN_SRC,
      /function\s+handleRoll/,
      "handleRoll 함수 정의 누락",
    );
    assert.match(
      MAIN_SRC,
      /state\.isRolling/,
      "isRolling 가드 누락 (중복 굴림 차단)",
    );
    // 3 swap × 120ms (ROLL_STEP_MS / ROLL_STEPS)
    assert.match(
      MAIN_SRC,
      /ROLL_STEP_MS\s*=\s*120/,
      "ROLL_STEP_MS 120ms 누락 — AC §1 (360ms / 3 step)",
    );
    assert.match(
      MAIN_SRC,
      /ROLL_STEPS\s*=\s*3/,
      "ROLL_STEPS 3 step 누락 — AC §1 (360ms / 3 step)",
    );
    // commitRoll 호출
    assert.match(MAIN_SRC, /commitRoll\(/, "commitRoll 호출 누락");
  });

  test("main.js fact: 통계 계산 — sum / avg / max + 평균은 소수 1자리 표시 (명세 §4.5)", () => {
    // computeStats 함수 정의 또는 sum/avg/max 산출
    assert.match(
      MAIN_SRC,
      /function\s+computeStats/,
      "computeStats 함수 정의 누락",
    );
    // 평균 표시 .toFixed(1) — 명세 §4.5
    assert.match(
      MAIN_SRC,
      /\.toFixed\(1\)/,
      "평균 표시 .toFixed(1) 누락 — 명세 §4.5 (소수 1자리)",
    );
  });

  test("main.js fact: 키보드 단축 — Space (굴리기) + 1~5 (개수) + T (테마) — 작업 AC", () => {
    assert.match(
      MAIN_SRC,
      /addEventListener\(["']keydown["']/,
      "keydown 리스너 누락",
    );
    // 1~5 분기 — key >= "1" && key <= "5"
    assert.match(
      MAIN_SRC,
      /key\s*>=\s*["']1["']\s*&&\s*key\s*<=\s*["']5["']/,
      "1~5 키 분기 누락 — 작업 AC (1~5 가변 단축)",
    );
    // T 키 → toggleTheme
    assert.match(MAIN_SRC, /key\s*===\s*["']t["']/, "T 키 분기 누락");
    // Space → handleRoll
    assert.match(
      MAIN_SRC,
      /e\.key\s*===\s*["'] ["']|e\.code\s*===\s*["']Space["']/,
      "Space 키 분기 누락",
    );
  });

  test("main.js fact: 모달 confirm 분기 — store.clearHistory() + state.history=[] + state.rolls=null + closeClearModal()", () => {
    // confirmClear 함수 정의 자체
    assert.match(
      MAIN_SRC,
      /function\s+confirmClear/,
      "confirmClear 함수 정의 누락",
    );
    // 함수 body 의 핵심 fact (IIFE 안의 다른 함수가 같은 사실을 갖지 않으므로 grep 으로 충분)
    assert.match(MAIN_SRC, /store\.clearHistory\(\)/, "store.clearHistory() 호출 누락");
    assert.match(MAIN_SRC, /state\.history\s*=\s*\[\]/, "state.history=[] 갱신 누락");
    assert.match(MAIN_SRC, /state\.rolls\s*=\s*null/, "state.rolls=null 갱신 누락");
    assert.match(MAIN_SRC, /closeClearModal\(\)/, "closeClearModal() 호출 누락");
  });

  test("main.js fact: 히스토리 row 클릭 재표시 (작업 AC: 클릭 → dice/stat/active 갱신 + diceCount 동기화)", () => {
    // handleHistoryClick 함수 정의 + 재표시 분기 핵심 fact
    assert.match(
      MAIN_SRC,
      /function\s+handleHistoryClick/,
      "handleHistoryClick 함수 정의 누락 — 작업 AC: 클릭 재표시",
    );
    // entry.rolls 를 state.rolls 로 복원 (재표시)
    assert.match(
      MAIN_SRC,
      /state\.rolls\s*=\s*entry\.rolls/,
      "재표시 state.rolls 갱신 누락",
    );
    // activeEntryId 갱신 (히스토리에서 강조용)
    assert.match(
      MAIN_SRC,
      /state\.activeEntryId\s*=\s*entry\.id/,
      "activeEntryId 갱신 누락 — 재표시 강조",
    );
    // diceCount 동기화 분기 (옛 굴림의 개수와 현재 선택 다르면 동기화)
    assert.match(
      MAIN_SRC,
      /entry\.rolls\.length\s*!==\s*state\.diceCount/,
      "재표시 diceCount 동기화 분기 누락",
    );
  });

  test("main.js fact: 부팅 복원 — store.loadHistory() + store.loadDiceCount() + head 굴림 dice-box 표시 (새로고침 복원)", () => {
    assert.match(MAIN_SRC, /store\.loadHistory\(\)/, "store.loadHistory 호출 누락");
    assert.match(MAIN_SRC, /store\.loadDiceCount\(\)/, "store.loadDiceCount 호출 누락");
    // 새로고침 복원 — head = state.history[0]; state.rolls = head.rolls.slice()
    assert.match(
      MAIN_SRC,
      /state\.history\[0\]/,
      "새로고침 복원: history head 참조 누락",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 7. sandbox 시뮬: storage round-trip (AC 1~5 + cap 10 + 재표시 분기 정합)
  //   storage 단위 테스트가 더 깊게 다룸 — 본 테스트는 main.js 의 contract
  //   (1~5 가변 dice + cap 10 + 재표시 diceCount 동기화) 가 storage 와
  //   정합한지 sanity check.
  // ─────────────────────────────────────────────────────────────
  test("sandbox: AC 1~5 시나리오 — 1·3·5개 굴림 누적 + cap 10 + 재표시 시 diceCount 동기화 가능", async () => {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const DS = require("../dice/storage.js");

    const mem = DS.createMemoryStorage();
    const store = DS.createDiceStore(mem);

    // (a) 1개 / 3개 / 5개 가변 굴림 — 모두 허용
    let nextId = 1;
    for (const count of [1, 3, 5]) {
      const rolls = [];
      for (let i = 0; i < count; i++) rolls.push(1 + Math.floor(Math.random() * 6));
      const sum = rolls.reduce((a, b) => a + b, 0);
      const max = Math.max(...rolls);
      store.pushRoll({
        id: nextId++,
        rolls,
        sum,
        avg: Number((sum / rolls.length).toFixed(2)),
        max,
        ts: Date.now() + nextId,
      });
    }
    let reloaded = DS.createDiceStore(mem);
    const hist1 = reloaded.loadHistory();
    assert.equal(hist1.length, 3, "AC: 1·3·5개 굴림 누적 시 history.length=3");
    // head 가 가장 최신 (5개 굴림)
    assert.equal(hist1[0].rolls.length, 5, "AC: head 가 마지막 push 한 5개 굴림");

    // (b) 누적 12건 → cap 10 (작업 AC)
    for (let i = 0; i < 9; i++) {
      const rolls = [1 + Math.floor(Math.random() * 6)];
      store.pushRoll({
        id: nextId++,
        rolls,
        sum: rolls[0],
        avg: rolls[0],
        max: rolls[0],
        ts: Date.now() + nextId,
      });
    }
    reloaded = DS.createDiceStore(mem);
    const hist2 = reloaded.loadHistory();
    assert.equal(hist2.length, 10, "AC: cap 10 (12 push 후에도 10건)");

    // (c) 재표시 분기 contract — entry.rolls.length 가 state.diceCount 와 다른 케이스
    //     main.js 는 entry.rolls.length 가 다르면 diceCount 동기화 후 saveDiceCount.
    //     storage 가 1~5 정수만 받음을 확인 (재표시 동기화 가능 보장).
    for (const n of [1, 2, 3, 4, 5]) {
      store.saveDiceCount(n);
      assert.equal(
        DS.createDiceStore(mem).loadDiceCount(),
        n,
        `재표시 동기화 contract: saveDiceCount(${n}) round-trip`,
      );
    }

    // (d) 전체 삭제 후 bf-theme 는 보존 (다른 SPA 와 공유)
    store.saveTheme("light");
    store.clearHistory();
    assert.equal(
      DS.createDiceStore(mem).loadHistory().length,
      0,
      "clearHistory 후 빈 배열",
    );
    assert.equal(
      mem.getItem("bf-theme"),
      "light",
      "clearHistory 후에도 bf-theme 보존 (공유 키)",
    );
  });
}
