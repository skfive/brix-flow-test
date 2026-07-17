// BF-949 · Simon Says 접근성·세션복구·최고기록 단위 테스트 (focused scope · module: simon-says)
// - 대상: phase18-games/simon-says/{index.html, styles.css, main.js, storage.js}
// - 실행: node --test tests/simon-says-BF949.test.js
// - 명세 SSOT: docs/design/simon-says-maintenance-BF-948.md (§5.2·§5.3·§5.4·§5.5·§5.6)
//
// 검증 축:
//   1) 최고기록 storage.js (SimonStore) — 저장/비교/복원 + 접근 실패 시 게임 유지(AC-C1~C5).
//   2) 신규 마크업/스타일 계약 — .best-score chip · .status--paused · reduced-motion append.
//   3) main.js 배선 — visibility 일시정지/재개 · 라운드 능동 공지 · 최고기록 연동.
//   4) 파일 단위 localStorage 정책 — storage.js 만 허용, 나머지 4파일은 0건(가드 개정).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "phase18-games", "simon-says");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");
const STORAGE_JS = readFileSync(join(MODULE_DIR, "storage.js"), "utf8");

// storage.js(UMD) 를 현재 realm 에서 로드해 SimonStore 추출 (logic 로더와 동일 패턴).
function loadStorage() {
  const mod = { exports: {} };
  const fn = new Function("module", "exports", "globalThis", STORAGE_JS);
  fn(mod, mod.exports, {});
  return mod.exports;
}

const S = loadStorage();
assert.ok(S && S.createSimonStore, "storage.js 가 SimonStore API 를 노출하지 않음");

// ══════════════════════════════════════════════════════════
// 1) 최고기록 저장소 (AC-C1~C5)
// ══════════════════════════════════════════════════════════
test("createMemoryStorage: Web Storage 호환 어댑터", () => {
  const m = S.createMemoryStorage();
  assert.equal(m.getItem("x"), null);
  m.setItem("x", 7);
  assert.equal(m.getItem("x"), "7"); // 문자열로 저장
  m.removeItem("x");
  assert.equal(m.getItem("x"), null);
});

test("AC-C1/C4: 초기(빈 저장소) loadBestRound → 0", () => {
  const store = S.createSimonStore(S.createMemoryStorage());
  assert.equal(store.loadBestRound(), 0);
});

test("AC-C1/C2/C3: 더 높은 라운드만 저장·복원", () => {
  const mem = S.createMemoryStorage();
  const store = S.createSimonStore(mem);
  assert.equal(store.saveBestRoundIfHigher(3), 3, "첫 기록 3 저장");
  assert.equal(store.loadBestRound(), 3, "복원 3");
  assert.equal(store.saveBestRoundIfHigher(2), 3, "더 낮은 값은 미갱신");
  assert.equal(store.loadBestRound(), 3);
  assert.equal(store.saveBestRoundIfHigher(5), 5, "더 높은 값 갱신");
  assert.equal(store.loadBestRound(), 5);
  // 새 store 인스턴스로도 복원(영속) — 같은 storage 재사용
  assert.equal(S.createSimonStore(mem).loadBestRound(), 5);
});

test("AC-C2: 동일 값은 미갱신(> 비교)", () => {
  const store = S.createSimonStore(S.createMemoryStorage());
  store.saveBestRoundIfHigher(4);
  assert.equal(store.saveBestRoundIfHigher(4), 4, "동일 값은 저장 시도 없이 현재값");
});

test("손상된 저장값은 0 폴백 (NaN·음수·비정수)", () => {
  for (const bad of ["abc", "-5", "", "NaN", "1.9"]) {
    const mem = S.createMemoryStorage();
    mem.setItem(S.SIMON_BEST_KEY, bad);
    const got = S.createSimonStore(mem).loadBestRound();
    assert.ok(got === 0 || Number.isInteger(got), `손상값 '${bad}' → ${got}`);
    if (bad === "abc" || bad === "" || bad === "NaN" || bad === "-5") {
      assert.equal(got, 0, `손상값 '${bad}' 은 0 폴백`);
    }
  }
});

test("AC-C5: storage 접근 실패해도 게임 유지 — 예외 없이 0/현재값 반환", () => {
  const throwing = {
    getItem() {
      throw new Error("blocked (private mode)");
    },
    setItem() {
      throw new Error("quota exceeded");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  const store = S.createSimonStore(throwing);
  assert.doesNotThrow(() => store.loadBestRound(), "load 는 예외를 던지지 않음");
  assert.equal(store.loadBestRound(), 0, "접근 실패 → 기록 없음(0)");
  assert.doesNotThrow(
    () => store.saveBestRoundIfHigher(9),
    "save 는 예외를 던지지 않음",
  );
  assert.equal(store.saveBestRoundIfHigher(9), 0, "저장 실패 → 현재값(0) 반환");
});

test("AC-C5: storage 미제공(null 환경)도 안전", () => {
  // createSimonStore(null) 은 globalThis.localStorage 를 시도 — Node 에는 없어 null 폴백.
  const store = S.createSimonStore(null);
  assert.doesNotThrow(() => store.loadBestRound());
  assert.equal(store.loadBestRound(), 0);
  assert.equal(store.saveBestRoundIfHigher(3), 0, "영속 불가 시 현재값 반환");
});

test("비정상 입력(round 가 숫자 아님)은 현재값 유지", () => {
  const store = S.createSimonStore(S.createMemoryStorage());
  store.saveBestRoundIfHigher(2);
  assert.equal(store.saveBestRoundIfHigher(NaN), 2);
  assert.equal(store.saveBestRoundIfHigher("5"), 2, "문자열은 무시");
  assert.equal(store.loadBestRound(), 2);
});

// ══════════════════════════════════════════════════════════
// 2) 신규 마크업 / 스타일 계약
// ══════════════════════════════════════════════════════════
test("마크업: .best-score chip (라벨·값·data-role) 존재, 초기 '기록 없음'", () => {
  assert.match(HTML, /class="best-score[^"]*"[^>]*data-role="best-score"/);
  assert.match(HTML, /class="best-score__label"[^>]*>\s*최고 기록\s*</);
  assert.match(HTML, /data-role="best-round"[^>]*>\s*기록 없음\s*</);
  // 초기 상태는 is-empty (기록 없음 색상)
  assert.match(HTML, /class="best-score is-empty"/);
});

test("마크업: chip 은 h1 직후·status 앞 (문서 순서 = 시각 순서)", () => {
  const h1 = HTML.indexOf('class="app__title"');
  const chip = HTML.indexOf('data-role="best-score"');
  const status = HTML.indexOf('class="status"');
  assert.ok(h1 >= 0 && chip >= 0 && status >= 0);
  assert.ok(h1 < chip && chip < status, "순서: h1 < best-score < status");
});

test("마크업: storage.js 를 logic.js 뒤·main.js 앞 비-module script 로 로드", () => {
  assert.match(HTML, /<script src="\.\/storage\.js"><\/script>/);
  const logic = HTML.indexOf('src="./logic.js"');
  const storage = HTML.indexOf('src="./storage.js"');
  const main = HTML.indexOf('src="./main.js"');
  assert.ok(logic < storage && storage < main, "로드 순서: logic < storage < main");
});

test("스타일: .best-score / .status--paused / .best-score--new 규칙 존재", () => {
  assert.match(CSS, /\.best-score\s*\{/);
  assert.match(CSS, /\.best-score__value/);
  assert.match(CSS, /\.best-score\.is-empty\s+\.best-score__value/);
  assert.match(CSS, /\.best-score--new/);
  assert.match(CSS, /\.status--paused\s*\{/);
  // 신규 색 토큰 0건 — 승계 토큰만 참조
  assert.match(CSS, /\.best-score--new[^}]*var\(--color-success\)/);
});

test("스타일: reduced-motion 회귀 가드 — 기존 규칙 보존 + 신규 셀렉터 append", () => {
  const mq = CSS.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/);
  assert.ok(mq, "reduced-motion media query 존재");
  const block = mq[0];
  // 기존 규칙 불변(§5.5 삭제 금지)
  assert.match(block, /\.pad\.is-lit\s*\{\s*transform:none;\s*box-shadow:0 0 0 3px var\(--color-text-primary\);\s*\}/);
  assert.match(block, /\.pad,\s*\.status,\s*\.btn\s*\{\s*transition:none;\s*\}/);
  // 신규 셀렉터 append
  assert.match(block, /\.best-score--new\s*\{\s*animation:none;/);
});

// ══════════════════════════════════════════════════════════
// 3) main.js 배선 (§5.2·§5.3·§5.4)
// ══════════════════════════════════════════════════════════
test("배선: visibilitychange 일시정지/재개 훅 존재 (§5.3)", () => {
  assert.match(MAIN_JS, /addEventListener\(\s*["']visibilitychange["']/);
  assert.match(MAIN_JS, /document\.hidden/);
  assert.match(MAIN_JS, /일시정지/); // 안내 문구
  assert.match(MAIN_JS, /status--paused|["']paused["']/);
});

test("배선: 라운드 능동 공지 — status 문구에 '라운드 N ·' 접두 (§5.2·AC-A1)", () => {
  assert.match(MAIN_JS, /"라운드 " \+ state\.round \+ " · 잘 보세요…"|라운드 " \+ state\.round/);
  assert.match(MAIN_JS, /당신 차례입니다/);
});

test("배선: 최고기록 저장소 연동 (SimonStore) + 새 기록 문구/강조 (§5.4)", () => {
  assert.match(MAIN_JS, /SimonStore/);
  assert.match(MAIN_JS, /saveBestRoundIfHigher/);
  assert.match(MAIN_JS, /loadBestRound/);
  assert.match(MAIN_JS, /새 최고 기록/);
  assert.match(MAIN_JS, /best-score--new/);
});

// ══════════════════════════════════════════════════════════
// 4) file:// 안전 가드 + 파일 단위 localStorage 정책 (planner §5.4 개정)
// ══════════════════════════════════════════════════════════
test("가드: storage.js file:// 안전 — type=module·import/export·fetch·외부 URL 0건", () => {
  assert.ok(!/type\s*=\s*["']module["']/.test(STORAGE_JS));
  assert.ok(!/\bimport\s|\bexport\s|\bexport\{/.test(STORAGE_JS), "storage.js import/export");
  assert.ok(
    !/fetch\(|XMLHttpRequest|WebSocket|EventSource|https?:\/\//.test(STORAGE_JS),
    "storage.js 외부 네트워크 의존",
  );
});

test("가드(정책): localStorage 는 storage.js 에만 — 나머지 4파일은 0건", () => {
  const re = /localStorage|sessionStorage/;
  // storage.js 는 최고점수 영속을 위해 localStorage 사용 허용
  assert.match(STORAGE_JS, /localStorage/, "storage.js 는 localStorage 를 사용해야 함");
  // 나머지 파일은 여전히 0건(관심사 분리 — main.js 는 SimonStore 경유)
  const LOGIC_JS = readFileSync(join(MODULE_DIR, "logic.js"), "utf8");
  for (const [name, src] of [
    ["index.html", HTML],
    ["logic.js", LOGIC_JS],
    ["main.js", MAIN_JS],
    ["styles.css", CSS],
  ]) {
    assert.ok(!re.test(src), `${name} 에 localStorage/sessionStorage 흔적 존재(정책 위반)`);
  }
});
