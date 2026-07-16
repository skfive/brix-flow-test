// BF-850 · /demo/dice 주사위 굴리기 SPA 회귀 가드 (focused scope · module: dice)
//
// ── 범위 정정 (이전 사이클 리뷰 CHANGES_REQUESTED 반영) ──────────────────────
// upstream 명세가 본 티켓의 성격을 명확히 규정한다:
//   - docs/spec/dice-roll-BF-848.md §1  : "본 문서 성격: 신규 기능 추가가 아님."
//     §1-1 배경 : "/demo/dice(리포지토리 경로 dice/) 주사위 굴리기 SPA 는 ... 이미 동작 중"
//   - docs/design/dice-spa-BF-849.md §0 : "현재 dice/ 구현이 정답(source of truth)이다.
//     dev 는 본 명세와 mockup 을 회귀 기준선으로 사용하되 새 구현을 만들 필요가 없다
//     — 잘림/포커스 회귀가 발견될 때만 수정한다."
//
// 즉 `/demo/dice` 는 **기존 dice/ 앱의 URL 진입점**이며, 별도 축소 데모를 신설하는
// 티켓이 아니다. 이전 사이클은 dice/demo/dice/ 에 개수선택·통계·히스토리·모달이 빠진
// 단일 주사위 데모를 신설하여 plan_coverage 결함(MAJOR)을 유발했다 → 본 사이클에서
// 해당 신규 앱을 제거하고, 본 가드를 **기존 dice/ 앱의 회귀 검증**으로 정정한다.
//
// ── 본 가드가 닫는 gap (BF-848 §9 이 후속 dev/tester 발견사항으로 명시한 항목) ──
// 기존 tests/dice-ui.test.js / dice-storage.test.js / dice-e2e-worker-host.test.js 가
// 이미 커버하는 마크업·스토리지·핵심 인터랙션은 **중복하지 않는다**. 본 파일은 §9 이
// "gap" 으로 지목한, 정적 회귀 가드가 없던 JS/CSS 거동만 다룬다:
//   AC-2/§4-4 : reduced-motion 동등성 — 애니메이션 생략 + 즉시 commitRoll (JS 경로)
//   AC-2/§5-2 : 버튼 포커스 시 전역 Space 중복 발동 방지 (tagName === "BUTTON" 스킵)
//   AC-2/§4-2 : 굴림 진행 중(isRolling) 재진입 차단
//   AC-3/§6-3 : dice-box flex-wrap 줄바꿈 (모바일 잘림 방지 기전)
//   §5(849)   : 인터랙티브 4종 :focus-visible 시각 상태 (포커스 회귀 방지)
//   AC-1/§3-4 : rollOne 1~6 균등 산식 (1 + Math.floor(Math.random()*6))
//
// vanilla-static: file:// 안전(import/export/fetch/type=module/외부 CDN 0건) 가드 포함.
// 런타임 거동(실제 굴림 결과·375px 잘림)은 e2e-runner 스모크로 별도 검증 (PR 본문 참조).

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ── focused scope guard — 자기 module 외 skip ──
const _BRIX_MY_MODULE = "dice";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const HERE = dirname(fileURLToPath(import.meta.url));
const DICE_DIR = join(HERE, "..", "dice");
const HTML_PATH = join(DICE_DIR, "index.html");
const MAIN_PATH = join(DICE_DIR, "main.js");
const CSS_PATH = join(DICE_DIR, "styles.css");
const STORAGE_PATH = join(DICE_DIR, "storage.js");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  const HTML_SRC = readFileSync(HTML_PATH, "utf8");
  const MAIN_SRC = readFileSync(MAIN_PATH, "utf8");
  const CSS_SRC = readFileSync(CSS_PATH, "utf8");
  const STORAGE_SRC = readFileSync(STORAGE_PATH, "utf8");

  // ─────────────────────────────────────────────────────────
  // AC-1 (BF-848 §3) — 진입 시 초기 숫자 + 굴리기 버튼, 유효 산식
  // ─────────────────────────────────────────────────────────
  test("AC-1: 진입 시 초기 숫자 렌더 — renderEmptyDice 가 diceCount 만큼 placeholder", () => {
    assert.match(
      MAIN_SRC,
      /function\s+renderEmptyDice[\s\S]{0,240}renderDice\(/,
      "renderEmptyDice → renderDice 초기 표시 경로 누락 (진입 시 초기 숫자)",
    );
    assert.match(HTML_SRC, /id=["']dice-box["']/i, "#dice-box 누락");
    assert.match(
      HTML_SRC,
      /<button[^>]*id=["']btn-roll["']/i,
      "굴리기 버튼 #btn-roll 누락",
    );
  });

  test("AC-1 (§3-4): rollOne 은 1~6 균등 산식 (1 + Math.floor(Math.random()*6))", () => {
    assert.match(
      MAIN_SRC,
      /1\s*\+\s*Math\.floor\(\s*Math\.random\(\)\s*\*\s*6\s*\)/,
      "rollOne 1~6 폐구간 균등분포 산식 누락 (0/7+/음수 발생 방지)",
    );
  });

  // ─────────────────────────────────────────────────────────
  // AC-2 (BF-848 §4·§5) — 굴리기 버튼·키보드 거동 (§9 gap)
  // ─────────────────────────────────────────────────────────
  test("AC-2: 굴리기 클릭 배선 (#btn-roll → handleRoll)", () => {
    assert.match(
      MAIN_SRC,
      /rollBtn\.addEventListener\(\s*["']click["']\s*,\s*handleRoll\s*\)/,
      "#btn-roll click → handleRoll 배선 누락",
    );
  });

  test("AC-2 (§4-2): 굴림 진행 중(isRolling) 재진입 차단 — 연타/중복 트리거 방지", () => {
    assert.match(
      MAIN_SRC,
      /function\s+handleRoll[\s\S]{0,80}if\s*\(\s*state\.isRolling\s*\)\s*return/,
      "handleRoll 진입부 isRolling 가드 누락 (연타 방지)",
    );
  });

  test("AC-2 (§5-1): 전역 Space keydown → preventDefault + handleRoll", () => {
    assert.match(MAIN_SRC, /addEventListener\(\s*["']keydown["']/i, "keydown 핸들러 누락");
    assert.match(
      MAIN_SRC,
      /(e\.key === " "|e\.code === "Space")[\s\S]{0,160}handleRoll\(\)/,
      "Space → handleRoll 트리거 경로 누락",
    );
  });

  // §9 gap: 버튼 포커스 시 전역 Space 가 네이티브 click 과 중복 발동하지 않도록 스킵
  test("AC-2 (§5-2, gap): 버튼 포커스 시 전역 Space 중복 발동 방지 (tagName BUTTON 스킵)", () => {
    assert.match(
      MAIN_SRC,
      /target\s*&&\s*target\.tagName\s*===\s*["']BUTTON["']\s*\)\s*return/,
      "Space 분기에서 focused BUTTON 스킵 누락 — 굴림 2회 중복 발동 회귀 위험",
    );
  });

  // §9 gap: reduced-motion 사용자는 스와핑 애니메이션 생략하고 즉시 최종 결과 commit
  test("AC-2 (§4-4, gap): reduced-motion 동등성 — 애니메이션 생략 + 즉시 commitRoll", () => {
    assert.match(
      MAIN_SRC,
      /matchMedia\(\s*["']\(prefers-reduced-motion: reduce\)["']\s*\)/,
      "prefers-reduced-motion 감지 누락",
    );
    assert.match(
      MAIN_SRC,
      /if\s*\(\s*prefersReducedMotion\s*\)\s*\{\s*commitRoll\([\s\S]{0,40}return;/,
      "reduced-motion 시 setInterval 스킵 후 즉시 commitRoll(finalRolls) 경로 누락",
    );
  });

  // ─────────────────────────────────────────────────────────
  // AC-3 (BF-848 §6) — 모바일 잘림 없음 (기전 회귀 가드)
  // ─────────────────────────────────────────────────────────
  test("AC-3: viewport meta (width=device-width) — 모바일 렌더 근간", () => {
    assert.match(
      HTML_SRC,
      /<meta\s+name=["']viewport["'][^>]*width=device-width/i,
      "viewport meta 누락 (모바일 잘림 방지 근간)",
    );
  });

  test("AC-3 (§6-3, gap): .dice-box flex-wrap — 5개 굴림 시 줄바꿈으로 가로 잘림 방지", () => {
    assert.match(
      CSS_SRC,
      /\.dice-box\s*\{[^}]*flex-wrap:\s*wrap/s,
      ".dice-box flex-wrap:wrap 누락 — 다수 주사위 가로 넘침(잘림) 회귀 위험",
    );
  });

  // ─────────────────────────────────────────────────────────
  // BF-849 §5 — 인터랙티브 4종 :focus-visible 시각 상태 (포커스 회귀 방지)
  // ─────────────────────────────────────────────────────────
  test("§5(849): 굴리기 CTA·개수·히스토리·ghost 버튼 :focus-visible 상태 존재", () => {
    for (const sel of [
      "\\.roll-button:focus-visible",
      "\\.dice-count__btn:focus-visible",
      "\\.history-row:focus-visible",
      "\\.btn:focus-visible",
    ]) {
      assert.match(
        CSS_SRC,
        new RegExp(sel),
        `${sel.replace(/\\/g, "")} 포커스 상태 누락 — 키보드 포커스 링 회귀 위험`,
      );
    }
  });

  // ─────────────────────────────────────────────────────────
  // vanilla-static file:// 안전 (stack 필수 가드)
  // ─────────────────────────────────────────────────────────
  test("file:// 안전: index.html 에 type=module / 외부 CDN(link·script) 0건", () => {
    assert.doesNotMatch(HTML_SRC, /<script[^>]+type=["']module["']/i, "type=module 금지");
    assert.equal(HTML_SRC.match(/<link[^>]+href=["']https?:\/\//gi), null, "외부 CDN link 금지");
    assert.equal(HTML_SRC.match(/<script[^>]+src=["']https?:\/\//gi), null, "외부 CDN script 금지");
  });

  test("file:// 안전: main.js / storage.js 에 fetch·import·export 문 0건", () => {
    for (const [label, src] of [
      ["main.js", MAIN_SRC],
      ["storage.js", STORAGE_SRC],
    ]) {
      assert.doesNotMatch(src, /\bfetch\s*\(/, `${label} fetch() 호출`);
      assert.doesNotMatch(src, /^\s*import\s+[^=]/m, `${label} import 문`);
      assert.doesNotMatch(src, /^\s*export\s+/m, `${label} export 문`);
    }
  });
}
