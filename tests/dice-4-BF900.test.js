// BF-900 · 주사위 통계 검증 페이지(dice-4) 단위 테스트 (focused scope · module: dice)
// - 대상: phase18-validation/dice-4/{index.html, styles.css, stats.js, main.js}
// - 실행: node --test tests/dice-4-BF900.test.js
// - 디자인 SSOT: docs/design/dice-4-BF-897.md (§5 컴포넌트, §6 dev 가이드)
//
// 검증 축:
//   1) vanilla-static file:// 안전 가드 — import/export·<script type="module">·
//      fetch/외부 URL 이 없어야 함(tech-stack 정책 · AC2 "fetch 성공·인증 가드 통과").
//   2) 마크업 계약 — main.js 가 의존하는 id + <title>/<h1> 고정, 제외 컴포넌트 부재.
//   3) 순수 로직 — stats.js 를 node:vm 샌드박스에서 로드해 rollOne/computeStats 검증.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "phase18-validation", "dice-4");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const STATS_JS = readFileSync(join(MODULE_DIR, "stats.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// ─────────── stats.js 를 샌드박스에서 로드해 Dice4Stats 전역 추출 ───────────
function loadStats() {
  const ctx = { globalThis: undefined, window: undefined, Math: Math };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(STATS_JS, ctx, { filename: "phase18-validation/dice-4/stats.js" });
  assert.ok(ctx.Dice4Stats, "stats.js 가 전역 Dice4Stats 를 노출하지 않음");
  return ctx.Dice4Stats;
}

// ══════════════════════════════════════════════════════════
// 1) vanilla-static file:// 안전 가드 (AC2 — fetch/인증 코드 0건)
// ══════════════════════════════════════════════════════════
test("AC2(가드): JS 파일에 import/export 구문이 없다 (file:// CORS 안전)", () => {
  for (const [name, src] of [
    ["stats.js", STATS_JS],
    ["main.js", MAIN_JS],
  ]) {
    assert.ok(
      !/^\s*import\s|^\s*export\s|\bimport\s*\(/m.test(src),
      `${name} 에 import/export 구문이 있으면 안 됨`,
    );
  }
});

test("AC2(가드): index.html 에 <script type=module> 이 없다", () => {
  assert.ok(
    !/type\s*=\s*["']module["']/.test(HTML),
    "type=module 스크립트는 file:// 에서 CORS 로 막힘",
  );
});

test("AC2(가드): fetch/XHR/WebSocket/외부 URL 을 사용하지 않는다 (네트워크 요청 0건 · 인증 불필요)", () => {
  for (const [name, src] of [
    ["stats.js", STATS_JS],
    ["main.js", MAIN_JS],
    ["index.html", HTML],
  ]) {
    assert.ok(!/\bfetch\s*\(/.test(src), `${name}: fetch 사용 금지`);
    assert.ok(!/XMLHttpRequest/.test(src), `${name}: XMLHttpRequest 사용 금지`);
    assert.ok(!/WebSocket|EventSource/.test(src), `${name}: 소켓/SSE 사용 금지`);
    assert.ok(
      !/https?:\/\//.test(src),
      `${name}: 외부 http(s) URL 사용 금지(CDN 포함)`,
    );
  }
});

// ══════════════════════════════════════════════════════════
// 2) 마크업 계약 — main.js 가 의존하는 id + 문구 + 제외 컴포넌트 부재
// ══════════════════════════════════════════════════════════
test("AC1(마크업): <title>/<h1> 이 주사위 통계 검증 맥락을 반영한다", () => {
  assert.ok(/<title>[^<]*주사위 통계 검증/.test(HTML), "title 에 '주사위 통계 검증' 포함");
  assert.ok(
    /topbar__title[^>]*>\s*주사위 통계 검증/.test(HTML),
    "h1 에 '주사위 통계 검증' 포함",
  );
});

test("AC1(마크업): main.js 가 의존하는 갱신 대상 id 가 모두 존재한다", () => {
  for (const id of ["dice-box", "btn-roll", "theme-toggle", "stat-sum", "stat-avg", "stat-max"]) {
    assert.ok(HTML.includes(`id="${id}"`), `id="${id}" 누락`);
  }
});

test("AC1(마크업): 주사위 개수 선택 버튼 1~5 (default 2 선택) 가 있다", () => {
  for (let n = 1; n <= 5; n += 1) {
    assert.ok(HTML.includes(`data-count="${n}"`), `data-count="${n}" 누락`);
  }
  // default 2 선택 (aria-checked="true" 가 data-count="2" 버튼에)
  assert.ok(
    /data-count="2"[^>]*aria-checked="true"|aria-checked="true"[^>]*data-count="2"/.test(
      HTML.replace(/\s+/g, " "),
    ),
    "default 개수 2 가 aria-checked=true 여야 함",
  );
});

test("AC1(마크업): 통계 카드 초기 상태가 is-empty + placeholder(--) 다", () => {
  assert.ok(/stats-card[^"]*is-empty|is-empty[^"]*stats-card/.test(HTML), "초기 is-empty 클래스 누락");
  const sumMatch = HTML.match(/id="stat-sum"[^>]*>\s*([^<]*)</);
  assert.ok(sumMatch && sumMatch[1].includes("--"), "stat-sum 초기값이 -- 여야 함");
});

test("AC1(마크업): 테마 토글(#theme-toggle) + FOUC 방지 인라인 다크 부트스트랩", () => {
  assert.ok(HTML.includes('id="theme-toggle"'), "테마 토글 버튼 누락");
  assert.ok(
    /localStorage\.getItem\(["']bf-theme["']\)/.test(HTML),
    "head 인라인 테마 복원 스크립트 누락",
  );
  // 다크 default 승계
  assert.ok(/data-theme="dark"/.test(HTML), "다크 default 부트스트랩 누락");
});

test("AC1(제외): 히스토리 카드·전체삭제 모달 마크업이 없다 (검증 범위 축소)", () => {
  assert.ok(!/history-card/.test(HTML), "history-card 는 제외 대상");
  assert.ok(!/modal-backdrop/.test(HTML), "modal-backdrop 는 제외 대상");
  assert.ok(!/history-list/.test(HTML), "history-list 는 제외 대상");
});

test("AC3(보존): 원본 시각 언어 클래스/토큰을 재사용한다", () => {
  for (const cls of [
    "topbar",
    "card",
    "dice-card",
    "dice-count",
    "dice-box",
    "roll-button",
    "stats-card",
    "stat-row",
    "stat-row__value--sum",
  ]) {
    assert.ok(CSS.includes(`.${cls}`), `.${cls} 규칙 누락(원본 시각 언어 재사용)`);
  }
  // 원본 rose accent 토큰 복제 (신규 색 0건 근거)
  assert.ok(CSS.includes("--color-accent: #fb7185"), "다크 accent rose-400 토큰 누락");
  assert.ok(CSS.includes("--color-sum-accent"), "합계 accent 토큰 누락");
});

test("AC3(제외): 히스토리/모달 CSS 규칙을 복제하지 않았다", () => {
  assert.ok(!/\.history-card/.test(CSS), "history-card 규칙은 복제 제외");
  assert.ok(!/\.modal-backdrop/.test(CSS), "modal-backdrop 규칙은 복제 제외");
});

// ══════════════════════════════════════════════════════════
// 3) 순수 로직 — rollOne / computeStats 결정론 검증
// ══════════════════════════════════════════════════════════
test("AC2(로직): rollOne 은 항상 1~6 정수를 반환한다", () => {
  const { rollOne } = loadStats();
  for (let i = 0; i < 500; i += 1) {
    const v = rollOne();
    assert.ok(Number.isInteger(v), "정수여야 함");
    assert.ok(v >= 1 && v <= 6, `1~6 범위여야 함(got ${v})`);
  }
});

test("AC2(로직): computeStats 가 합계/평균/최대를 정확히 계산한다", () => {
  const { computeStats } = loadStats();
  // 주: computeStats 반환 객체는 vm 샌드박스(다른 realm) 라 deepStrictEqual 이
  // prototype 불일치로 실패 — 필드별로 비교한다.
  const expectFields = (rolls, sum, avg, max) => {
    const s = computeStats(rolls);
    assert.equal(s.sum, sum, `sum(${rolls})`);
    assert.equal(s.avg, avg, `avg(${rolls})`);
    assert.equal(s.max, max, `max(${rolls})`);
  };
  expectFields([5, 3], 8, 4, 5);
  expectFields([2, 4, 6], 12, 4, 6);
  expectFields([1, 2], 3, 1.5, 2);
});

test("AC2(로직): 개수=1 굴림은 합계=평균=최대가 rolls[0] 와 같다 (§5.5)", () => {
  const { computeStats } = loadStats();
  const s = computeStats([4]);
  assert.equal(s.sum, 4);
  assert.equal(s.avg, 4);
  assert.equal(s.max, 4);
});

test("AC2(로직): 평균은 toFixed(1) 표시 규칙과 정합한다", () => {
  const { computeStats } = loadStats();
  // [3,4] → avg 3.5 → "3.5", [1,1,2] → avg 1.333.. → "1.3"
  assert.equal(computeStats([3, 4]).avg.toFixed(1), "3.5");
  assert.equal(computeStats([1, 1, 2]).avg.toFixed(1), "1.3");
});
