// BF-906 · 진행률 체크리스트 검증 페이지(progress-5) 단위 테스트 (focused scope · module: phase18-validation)
// - 대상: phase18-validation/progress-5/{index.html, styles.css, fixtures.js, progress.js, main.js}
// - 실행: node --test tests/progress-5-BF906.test.js
// - 디자인 SSOT: docs/design/progress-5-BF-905.md (§4 레이아웃, §5 컴포넌트, §6 dev 가이드)
//
// 검증 축:
//   1) vanilla-static file:// 안전 가드 — import/export·<script type=module>·
//      fetch/외부 URL 이 없어야 함(tech-stack 정책 · AC2 "fetch 성공·인증 가드 통과").
//   2) 마크업/CSS 계약 — main.js 가 의존하는 id·클래스·진행률 바 ARIA·고정 문구 존재.
//   3) 순수 로직 — fixtures.js / progress.js 를 node:vm 샌드박스에서 로드해
//      calculateProgress / toggleItem / formatShortDateTime 검증.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "phase18-validation", "progress-5");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const FIXTURES_JS = readFileSync(join(MODULE_DIR, "fixtures.js"), "utf8");
const PROGRESS_JS = readFileSync(join(MODULE_DIR, "progress.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// ─────────── UMD 파일을 샌드박스에서 로드해 전역 API 추출 ───────────
function loadGlobal(src, globalName, filename) {
  const ctx = { globalThis: undefined, window: undefined, Math, Array, Boolean, String };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename });
  assert.ok(ctx[globalName], `${filename} 가 전역 ${globalName} 를 노출하지 않음`);
  return ctx[globalName];
}
const Fixtures = loadGlobal(FIXTURES_JS, "Progress5Fixtures", "phase18-validation/progress-5/fixtures.js");
const Logic = loadGlobal(PROGRESS_JS, "Progress5Logic", "phase18-validation/progress-5/progress.js");

// ══════════════════════════════════════════════════════════
// 1) vanilla-static file:// 안전 가드 (AC2 — fetch/인증 코드 0건)
// ══════════════════════════════════════════════════════════
test("AC2(가드): JS 파일에 import/export 구문이 없다 (file:// CORS 안전)", () => {
  for (const [name, src] of [
    ["fixtures.js", FIXTURES_JS],
    ["progress.js", PROGRESS_JS],
    ["main.js", MAIN_JS],
  ]) {
    assert.ok(
      !/^\s*import\s|^\s*export\s|\bimport\s*\(/m.test(src),
      `${name} 에 import/export 구문이 있으면 안 됨`,
    );
  }
});

test("AC2(가드): index.html 에 <script type=module> 이 없고 command.js 를 로드하지 않는다", () => {
  assert.ok(!/type\s*=\s*["']module["']/.test(HTML), "type=module 스크립트는 file:// 에서 CORS 로 막힘");
  assert.ok(
    !/<script[^>]*src=["'][^"']*command\.js["']/.test(HTML),
    "command.js 는 로드 금지(원본 전용 DOM 전제로 init 자동 실행 · 명세 §5)",
  );
});

test("AC2(가드): fetch/XHR/WebSocket/외부 URL 을 사용하지 않는다 (네트워크 요청 0건 · 인증 불필요)", () => {
  for (const [name, src] of [
    ["fixtures.js", FIXTURES_JS],
    ["progress.js", PROGRESS_JS],
    ["main.js", MAIN_JS],
    ["index.html", HTML],
  ]) {
    assert.ok(!/\bfetch\s*\(/.test(src), `${name}: fetch 사용 금지`);
    assert.ok(!/XMLHttpRequest/.test(src), `${name}: XMLHttpRequest 사용 금지`);
    assert.ok(!/WebSocket|EventSource/.test(src), `${name}: 소켓/SSE 사용 금지`);
    assert.ok(!/https?:\/\//.test(src), `${name}: 외부 http(s) URL 사용 금지(CDN 포함)`);
  }
});

// ══════════════════════════════════════════════════════════
// 2) 마크업/CSS 계약
// ══════════════════════════════════════════════════════════
test("AC1(마크업): <title>/<h1> 이 진행률 체크리스트 검증 맥락을 반영한다", () => {
  assert.ok(/<title>[^<]*진행률 체크리스트 검증/.test(HTML), "title 에 '진행률 체크리스트 검증' 포함");
  assert.ok(/<h1>\s*진행률 체크리스트 검증/.test(HTML), "h1 에 '진행률 체크리스트 검증' 포함");
});

test("AC1(마크업): main.js 가 의존하는 체크리스트 컨테이너 + 상단바 마크업이 존재한다", () => {
  assert.ok(HTML.includes('id="progress-5-checklist"'), 'id="progress-5-checklist" 누락');
  assert.ok(/data-checklist-state="has-items"/.test(HTML), "초기 data-checklist-state=has-items 누락");
  assert.ok(/class="ic-topbar"/.test(HTML), ".ic-topbar 상단바 누락");
  assert.ok(/ic-topbar__count[^>]*>[^<]*phase18-validation/.test(HTML), "검증 맥락 캡션 누락");
});

test("AC1(마크업): <noscript> JS 필요 안내 폴백이 존재한다(§5.6)", () => {
  assert.ok(/<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/.test(HTML), "noscript 폴백 누락");
});

test("AC1(마크업): 스크립트 로드 순서가 fixtures → progress → main 이다", () => {
  // 주석에도 파일명이 등장하므로 <script src="..."> 태그 위치만 비교
  const order = ["fixtures.js", "progress.js", "main.js"].map((f) =>
    HTML.search(new RegExp(`<script[^>]*src=["'][^"']*${f.replace(".", "\\.")}["']`)),
  );
  assert.ok(order.every((i) => i >= 0), "3개 스크립트 태그 모두 존재해야 함");
  assert.ok(order[0] < order[1] && order[1] < order[2], "로드 순서 fixtures→progress→main 위반");
});

test("AC1(CSS): 진행률 바·체크리스트·상단바 원본 시각 언어 클래스가 재사용된다", () => {
  for (const cls of [
    "ic-topbar",
    "ic-panel",
    "ic-progress",
    "ic-progress__fill",
    "ic-progress__text",
    "ic-check-list",
    "ic-check",
    "ic-check__box",
    "ic-check__label",
    "ic-check__at",
    "ic-note",
  ]) {
    assert.ok(CSS.includes(`.${cls}`), `.${cls} 규칙 누락(원본 시각 언어 재사용)`);
  }
});

test("AC3(재사용): 진행률 fill/track 토큰 복제 + 단일 컬럼 720px 축소", () => {
  assert.ok(CSS.includes("--ic-progress-fill: #4ADE80"), "진행률 fill 토큰(#4ADE80) 복제 누락");
  assert.ok(CSS.includes("--ic-progress-track: #212C3B"), "진행률 track 토큰 복제 누락");
  assert.ok(/max-width:\s*720px/.test(CSS), "단일 컬럼 720px 레이아웃 축소 누락(§4.1)");
});

test("AC3(재사용): styles.css 에 심각도/상태/이벤트 등 미사용 색 토큰을 복제하지 않았다", () => {
  // §2 — 사용 토큰만 발췌 복제. 아래는 progress-5 미사용 토큰(원본 존재하나 복제 대상 아님)
  for (const token of ["--ic-sev-1-fg", "--ic-status-resolved-fg", "--ic-evt-detected", "--ic-danger"]) {
    assert.ok(!CSS.includes(token), `${token} 은 progress-5 미사용 — 복제 금지(§2)`);
  }
});

// ══════════════════════════════════════════════════════════
// 3) 순수 로직 — fixtures / calculateProgress / toggleItem / formatShortDateTime
// ══════════════════════════════════════════════════════════
test("AC1(fixture): 체크리스트가 5건이고 done 2 / 미done 3 → 초기 40% 다", () => {
  const list = Fixtures.getChecklist();
  assert.equal(list.length, 5, "fixture 5건이어야 함");
  const p = Logic.calculateProgress(list);
  assert.equal(p.total, 5);
  assert.equal(p.done, 2);
  assert.equal(p.percent, 40);
});

test("AC1(fixture): done=true 항목만 completedAt(ISO) 을 갖고 done=false 는 null 이다(§5.4)", () => {
  for (const item of Fixtures.getChecklist()) {
    if (item.done) {
      assert.match(item.completedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, `${item.id} done=true 는 ISO completedAt`);
    } else {
      assert.equal(item.completedAt, null, `${item.id} done=false 는 completedAt=null`);
    }
  }
});

test("AC1(fixture): getChecklist 는 매번 새 배열/객체를 반환한다(원본 mutate 방지)", () => {
  const a = Fixtures.getChecklist();
  const b = Fixtures.getChecklist();
  assert.notEqual(a, b, "새 배열이어야 함");
  a[0].done = !a[0].done;
  assert.notEqual(a[0].done, b[0].done, "복제본 수정이 원본에 전파되면 안 됨");
});

test("AC2(로직): calculateProgress percent 는 반올림 정수다", () => {
  const mk = (done, total) =>
    Array.from({ length: total }, (_, i) => ({ id: "x" + i, text: "t", done: i < done, completedAt: null }));
  assert.equal(Logic.calculateProgress(mk(1, 3)).percent, 33); // 33.33 → 33
  assert.equal(Logic.calculateProgress(mk(2, 3)).percent, 67); // 66.66 → 67
  assert.equal(Logic.calculateProgress(mk(0, 5)).percent, 0);
  assert.equal(Logic.calculateProgress(mk(5, 5)).percent, 100);
});

test("AC1(로직): 빈 배열/비배열은 {total:0,done:0,percent:0} 로 방어된다(§5.5)", () => {
  for (const bad of [[], null, undefined, "x"]) {
    const p = Logic.calculateProgress(bad);
    assert.deepEqual({ total: p.total, done: p.done, percent: p.percent }, { total: 0, done: 0, percent: 0 });
  }
});

test("AC1(로직): toggleItem 은 done 토글 + completedAt 일관성을 유지하고 새 배열을 반환한다", () => {
  const list = Fixtures.getChecklist();
  const before = list.find((i) => i.id === "chk-p5-3"); // done=false
  assert.equal(before.done, false);

  const now = "2026-07-16T14:30:00+09:00";
  const next = Logic.toggleItem(list, "chk-p5-3", now);
  assert.notEqual(next, list, "새 배열 반환(원본 불변)");
  const toggled = next.find((i) => i.id === "chk-p5-3");
  assert.equal(toggled.done, true, "false→true 토글");
  assert.equal(toggled.completedAt, now, "done=true 면 completedAt=nowIso");
  // 원본 불변 확인
  assert.equal(list.find((i) => i.id === "chk-p5-3").done, false, "원본 배열은 변하면 안 됨");

  // 다시 토글 → done=false, completedAt=null
  const back = Logic.toggleItem(next, "chk-p5-3", now);
  const undone = back.find((i) => i.id === "chk-p5-3");
  assert.equal(undone.done, false);
  assert.equal(undone.completedAt, null, "done=false 면 completedAt=null");
});

test("AC1(로직): toggleItem 은 진행률과 정합한다 (40% → 60% → 40%)", () => {
  const list = Fixtures.getChecklist();
  const on = Logic.toggleItem(list, "chk-p5-3", "2026-07-16T14:30:00+09:00");
  assert.equal(Logic.calculateProgress(on).percent, 60, "미done 1건 완료 → 3/5=60%");
  const off = Logic.toggleItem(on, "chk-p5-3", "2026-07-16T14:30:00+09:00");
  assert.equal(Logic.calculateProgress(off).percent, 40, "다시 해제 → 2/5=40%");
});

test("AC1(로직): 존재하지 않는 itemId toggle 은 TypeError 를 던진다", () => {
  // vm 샌드박스(다른 realm)의 에러는 호스트 TypeError prototype 과 불일치 — name 으로 검증
  assert.throws(
    () => Logic.toggleItem(Fixtures.getChecklist(), "no-such-id", "2026-07-16T00:00:00+09:00"),
    (err) => err && err.name === "TypeError" && /존재하지 않는 itemId/.test(err.message),
  );
});

test("AC1(로직): formatShortDateTime 은 원본 슬라이스 포맷(MM-DD HH:MM)이다", () => {
  assert.equal(Logic.formatShortDateTime("2026-07-16T02:20:00+09:00"), "07-16 02:20");
});
