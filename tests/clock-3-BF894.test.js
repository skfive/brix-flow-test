// BF-894 · 세계시계 clock-3 SPA 단위 테스트 (focused scope · module: clock-3)
// - 대상: phase18-validation/clock-3/{index.html, styles.css, regions.js, main.js}
// - 실행: node --test tests/clock-3-BF894.test.js
// - 계약 SSOT: docs/planning/clock-3-BF-891.md (§3 REGIONS, §4 Intl, §5 표시, §6 tick)
// - 디자인 SSOT: docs/design/clock-3-BF-891.md (§5 컴포넌트, §6 dev 가이드)
//
// 검증 축:
//   1) vanilla-static file:// 안전 가드 — import/export·<script type="module">·
//      fetch/외부 URL 이 없어야 함(tech-stack 정책).
//   2) 마크업 계약 — main.js 가 의존하는 id + <title>/<h1> 고정.
//   3) 순수 로직 — regions.js 를 node:vm 샌드박스에서 로드해 Clock3 전역 API
//      (REGIONS·Intl 투영 결과)를 결정론적으로 검증.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "phase18-validation", "clock-3");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const REGIONS_JS = readFileSync(join(MODULE_DIR, "regions.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// ─────────── regions.js 를 샌드박스에서 로드해 Clock3 전역 추출 ───────────
function loadClock3() {
  const ctx = { globalThis: undefined, window: undefined };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  // Intl 을 샌드박스에 노출 (tzdata 는 Node 내장)
  ctx.Intl = Intl;
  ctx.Date = Date;
  vm.createContext(ctx);
  vm.runInContext(REGIONS_JS, ctx, { filename: "phase18-validation/clock-3/regions.js" });
  assert.ok(ctx.Clock3, "regions.js 가 전역 Clock3 를 노출하지 않음");
  return ctx.Clock3;
}

// ══════════════════════════════════════════════════════════
// 1) vanilla-static file:// 안전 가드 (tech-stack 정책)
// ══════════════════════════════════════════════════════════
test("AC2(가드): JS 파일에 import/export 구문이 없다 (file:// CORS 안전)", () => {
  for (const [name, src] of [
    ["regions.js", REGIONS_JS],
    ["main.js", MAIN_JS],
  ]) {
    // 문장 형태의 ESM 구문만 검출 (주석/문자열 내 단어는 오탐 제외)
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

test("AC2(가드): fetch/XHR/WebSocket/외부 URL 을 사용하지 않는다 (네트워크 요청 0건)", () => {
  for (const [name, src] of [
    ["regions.js", REGIONS_JS],
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

test("AC2(핵심): regions.js 가 Intl.DateTimeFormat 을 데이터 원천으로 사용한다", () => {
  assert.ok(
    /Intl\.DateTimeFormat/.test(REGIONS_JS),
    "지역별 시각은 Intl.DateTimeFormat 으로 계산해야 함(§4)",
  );
});

// ══════════════════════════════════════════════════════════
// 2) 마크업 계약 — main.js 가 의존하는 id + 문구
// ══════════════════════════════════════════════════════════
test("AC1(마크업): <title>/<h1> 이 세계시계 검증 맥락을 반영한다", () => {
  assert.ok(/<title>[^<]*세계시계 검증/.test(HTML), "title 에 '세계시계 검증' 포함");
  assert.ok(
    /topbar__title[^>]*>\s*세계시계 검증/.test(HTML),
    "h1 에 '세계시계 검증' 포함",
  );
});

test("AC1(마크업): 3개 지역 카드의 갱신 대상 id 가 모두 존재한다", () => {
  for (const id of ["seoul", "newyork", "london"]) {
    assert.ok(HTML.includes(`id="clock-${id}-date"`), `clock-${id}-date 누락`);
    assert.ok(HTML.includes(`id="clock-${id}-h"`), `clock-${id}-h 누락`);
    assert.ok(HTML.includes(`id="clock-${id}-m"`), `clock-${id}-m 누락`);
    assert.ok(HTML.includes(`id="clock-${id}-s"`), `clock-${id}-s 누락`);
    assert.ok(
      HTML.includes(`aria-label="${{ seoul: "서울", newyork: "뉴욕", london: "런던" }[id]} 현재 시각"`),
      `${id} 시각 aria-label 누락`,
    );
  }
});

test("AC1(마크업): 테마 전환 버튼(#btn-theme) + FOUC 방지 인라인 init 이 있다", () => {
  assert.ok(HTML.includes('id="btn-theme"'), "테마 전환 버튼 누락");
  assert.ok(
    /localStorage\.getItem\(["']bf-theme["']\)/.test(HTML),
    "head 인라인 테마 복원 스크립트 누락",
  );
});

test("AC3(보존): 원본 시각 언어 클래스(.card/.clock-date/.clock-display)를 재사용한다", () => {
  for (const cls of ["card", "clock-date", "clock-display", "clock-display__time"]) {
    assert.ok(CSS.includes(`.${cls}`), `${cls} 규칙 누락(원본 시각 언어 재사용)`);
  }
  // 신규는 배치용 클래스만
  assert.ok(CSS.includes(".region-grid"), "region-grid 배치 클래스 누락");
  assert.ok(CSS.includes(".region-clock"), "region-clock 배치 클래스 누락");
});

// ══════════════════════════════════════════════════════════
// 3) 순수 로직 — REGIONS 계약 + Intl 투영 결정론
// ══════════════════════════════════════════════════════════
test("AC1(로직): REGIONS 가 서울→뉴욕→런던 순서·계약 구조를 갖는다", () => {
  const { REGIONS } = loadClock3();
  // 주: REGIONS 는 vm 샌드박스(다른 realm) 배열이라 deepStrictEqual 이 prototype
  // 불일치로 실패한다 — Array.from 으로 테스트 realm 배열로 옮겨 비교.
  assert.deepEqual(
    Array.from(REGIONS, (r) => r.id),
    ["seoul", "newyork", "london"],
    "표시 순서 = 서울 → 뉴욕 → 런던(planner §3.1)",
  );
  assert.deepEqual(Array.from(REGIONS, (r) => r.timeZone), [
    "Asia/Seoul",
    "America/New_York",
    "Europe/London",
  ]);
  assert.deepEqual(Array.from(REGIONS, (r) => r.label), ["서울", "뉴욕", "런던"]);
});

test("AC1(로직): 동일 Date 를 3개 지역으로 투영하면 알려진 오프셋과 정합한다", () => {
  const Clock3 = loadClock3();
  const formatters = Clock3.createRegionFormatters();
  // 기준 시점: 2026-07-16 18:19:07 UTC (여름 → 뉴욕 EDT/UTC-4, 런던 BST/UTC+1)
  const date = new Date("2026-07-16T18:19:07Z");

  const byId = {};
  for (const f of formatters) byId[f.id] = Clock3.formatWith(f.formatter, date);

  // 서울(UTC+9): 다음 날 03:19:07
  assert.equal(byId.seoul.date, "2026-07-17 (금)");
  assert.equal(`${byId.seoul.hh}:${byId.seoul.mm}:${byId.seoul.ss}`, "03:19:07");
  // 뉴욕(EDT, UTC-4): 같은 날 14:19:07
  assert.equal(byId.newyork.date, "2026-07-16 (목)");
  assert.equal(`${byId.newyork.hh}:${byId.newyork.mm}:${byId.newyork.ss}`, "14:19:07");
  // 런던(BST, UTC+1): 같은 날 19:19:07
  assert.equal(byId.london.date, "2026-07-16 (목)");
  assert.equal(`${byId.london.hh}:${byId.london.mm}:${byId.london.ss}`, "19:19:07");
});

test("AC2(로직): 지역별 날짜가 서로 달라질 수 있다 (세계시계 정상 동작, §5.3)", () => {
  const Clock3 = loadClock3();
  const formatters = Clock3.createRegionFormatters();
  const seoulFmt = formatters.find((f) => f.id === "seoul").formatter;
  const nyFmt = formatters.find((f) => f.id === "newyork").formatter;
  // 서울 자정 직후 시점(2026-07-16 15:30 UTC → 서울 00:30 17일 / 뉴욕 11:30 16일)
  const date = new Date("2026-07-16T15:30:00Z");
  const seoul = Clock3.formatWith(seoulFmt, date);
  const ny = Clock3.formatWith(nyFmt, date);
  assert.notEqual(seoul.date, ny.date, "오프셋 차이로 날짜가 달라질 수 있어야 함");
});

test("AC2(로직): formatWith 결과 시/분/초가 2자리 zero-pad 문자열이다", () => {
  const Clock3 = loadClock3();
  const fmt = Clock3.createFormatter("Asia/Seoul");
  // 서울 09:05:03 → UTC 00:05:03
  const v = Clock3.formatWith(fmt, new Date("2026-01-01T00:05:03Z"));
  assert.match(v.hh, /^\d{2}$/);
  assert.match(v.mm, /^\d{2}$/);
  assert.match(v.ss, /^\d{2}$/);
  assert.equal(`${v.hh}:${v.mm}:${v.ss}`, "09:05:03");
});
