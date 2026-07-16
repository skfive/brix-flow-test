// BF-882 · status-card SPA 단위 테스트 (focused scope · module: status-card)
// - 대상: status-card/{index.html, styles.css, status.js, main.js}
// - 실행: node --test tests/status-card-BF882.test.js
// - 디자인 SSOT: docs/design/status-card-BF-879.md (§2 팔레트, §4 레이아웃, §5 컴포넌트, §6 dev 가이드)
//
// 검증 축:
//   1) vanilla-static file:// 안전 가드 — import/export·<script type="module">·
//      fetch/타이머/외부 URL 이 없어야 함(tech-stack 정책).
//   2) 마크업 계약 — main.js 가 의존하는 id + §4.4 문구(<title>/<h1>) 고정.
//   3) 순수 파생 로직 — status.js 를 node:vm 샌드박스에서 로드해 StatusCard
//      전역 API(fixture·라벨·아이콘·요약)를 검증(ESM/CJS 충돌 없이 file:// 계약 유지).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "status-card");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const STATUS_JS = readFileSync(join(MODULE_DIR, "status.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// ─────────── status.js 를 샌드박스에서 로드해 StatusCard 전역 추출 ───────────
function loadStatusCard() {
  const ctx = { globalThis: undefined, window: undefined };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(STATUS_JS, ctx, { filename: "status-card/status.js" });
  assert.ok(ctx.StatusCard, "status.js 가 전역 StatusCard 를 노출하지 않음");
  return ctx.StatusCard;
}

// ══════════════════════════════════════════════════════════
// 1) vanilla-static file:// 안전 가드 (tech-stack 정책)
// ══════════════════════════════════════════════════════════
test("AC3(가드): JS 파일에 import/export 구문이 없다 (file:// CORS 안전)", () => {
  for (const [name, src] of [
    ["status.js", STATUS_JS],
    ["main.js", MAIN_JS],
  ]) {
    assert.doesNotMatch(
      src,
      /^\s*import\s|^\s*export\s|\bimport\s*\(/m,
      `${name} 에 import/export 가 있음 — vanilla-static 위반`,
    );
  }
});

test("AC3(가드): index.html 에 <script type=\"module\"> 이 없다", () => {
  assert.doesNotMatch(
    HTML,
    /<script[^>]*type=["']module["']/i,
    "type=module 스크립트는 file:// 에서 CORS 로 깨짐",
  );
});

test("AC3(가드): 네트워크/타이머 진입점이 없다 (완전 정적, 로드 시 1회 렌더)", () => {
  const all = `${HTML}\n${STATUS_JS}\n${MAIN_JS}`;
  assert.doesNotMatch(
    all,
    /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|setInterval\s*\(|setTimeout\s*\(/,
    "네트워크 호출/주기 갱신/타이머 금지(디자인 §6.2, 기획 §7)",
  );
});

test("AC3(가드): 외부 CDN/절대 URL 리소스가 없다", () => {
  // href/src 의 http(s) 절대 URL 만 잡는다(상대경로 리소스는 허용).
  assert.doesNotMatch(
    HTML,
    /(?:src|href)=["']https?:\/\//i,
    "외부 CDN <link>/<script src> 금지(vanilla-static)",
  );
});

// ══════════════════════════════════════════════════════════
// 2) 마크업 계약 (§4.1 골격 · §4.4 문구)
// ══════════════════════════════════════════════════════════
test("AC1: index.html 에 main.js 의존 컨테이너 id(#summary-banner, #status-list) 존재", () => {
  assert.match(HTML, /id=["']summary-banner["']/, "#summary-banner 누락");
  assert.match(HTML, /id=["']status-list["']/, "#status-list 누락");
});

test("AC1: <title>/<h1> 문구가 검증 맥락(§4.4)을 반영한다", () => {
  assert.match(
    HTML,
    /<title>\s*서비스 상태 카드 검증 · \/phase18-validation\/status-card-1\s*<\/title>/,
    "title 문구가 §4.4 와 불일치",
  );
  assert.match(
    HTML,
    /<h1[^>]*class=["']topbar__title["'][^>]*>\s*서비스 상태 카드 \(Phase 18 검증 1\/5\)\s*<\/h1>/,
    "h1(topbar__title) 문구가 §4.4 와 불일치",
  );
});

test("AC1: noscript 폴백 안내와 요약 배너 aria-label 이 존재한다", () => {
  assert.match(HTML, /<noscript>/, "noscript 폴백 누락(디자인 §5.4)");
  assert.match(
    HTML,
    /aria-label=["']전체 서비스 상태 요약["']/,
    "summary-banner aria-label 누락",
  );
});

test("AC1: 자체 styles.css/status.js/main.js 를 상대경로로 참조한다", () => {
  assert.match(HTML, /href=["']\.?\/?styles\.css["']/, "styles.css 링크 누락");
  assert.match(HTML, /src=["']\.?\/?status\.js["']/, "status.js 스크립트 누락");
  assert.match(HTML, /src=["']\.?\/?main\.js["']/, "main.js 스크립트 누락");
});

// ══════════════════════════════════════════════════════════
// 3) CSS 토큰 재사용 (§2 — 신규 색 0건, 상태 3색 kanban 값)
// ══════════════════════════════════════════════════════════
test("AC3: styles.css 에 상태 시맨틱 3색 토큰(원본 값)이 정의돼 있다", () => {
  assert.match(CSS, /--color-success:\s*#1a7f37/, "success light 토큰 불일치");
  assert.match(CSS, /--color-warning:\s*#9a6700/, "warning light 토큰 불일치");
  assert.match(CSS, /--color-danger:\s*#cf222e/, "danger light 토큰 불일치");
  assert.match(CSS, /\[data-theme=["']dark["']\]/, "dark 테마 블록 누락");
});

test("AC3: 컴포넌트 규칙은 색상 리터럴 대신 var(--…) 를 참조한다(§6.4)", () => {
  const badgeRule = CSS.match(
    /\.status-badge--operational\s*\{[^}]*\}/,
  );
  assert.ok(badgeRule, ".status-badge--operational 규칙 누락");
  assert.match(
    badgeRule[0],
    /background:\s*var\(--color-success\)/,
    "배지 배경이 토큰(var) 참조가 아님",
  );
});

// ══════════════════════════════════════════════════════════
// 4) 순수 파생 로직 (status.js — StatusCard 전역 API)
// ══════════════════════════════════════════════════════════
test("AC2: SERVICES fixture 는 id·name·status·description 4필드를 모두 갖는다", () => {
  const { SERVICES } = loadStatusCard();
  assert.ok(Array.isArray(SERVICES) && SERVICES.length === 4);
  for (const svc of SERVICES) {
    assert.equal(typeof svc.id, "string");
    assert.ok(svc.id.length > 0);
    assert.equal(typeof svc.name, "string");
    assert.ok(svc.name.length > 0);
    assert.equal(typeof svc.status, "string");
    assert.equal(typeof svc.description, "string");
    assert.ok(svc.description.length > 0);
  }
});

test("AC2: SERVICES 는 3가지 상태값을 모두 최소 1회 포함한다", () => {
  const { SERVICES, isKnownStatus } = loadStatusCard();
  const statuses = new Set(SERVICES.map((s) => s.status));
  assert.ok(statuses.has("operational"));
  assert.ok(statuses.has("degraded"));
  assert.ok(statuses.has("outage"));
  for (const svc of SERVICES) {
    assert.ok(isKnownStatus(svc.status), `미정의 status: ${svc.status}`);
  }
});

test("AC2: statusLabel/statusIcon 이 상태별 한글 라벨·아이콘을 반환한다", () => {
  const { statusLabel, statusIcon } = loadStatusCard();
  assert.equal(statusLabel("operational"), "정상");
  assert.equal(statusLabel("degraded"), "저하");
  assert.equal(statusLabel("outage"), "장애");
  assert.equal(statusIcon("operational"), "●");
  assert.equal(statusIcon("degraded"), "▲");
  assert.equal(statusIcon("outage"), "✕");
});

test("AC2: 미정의 status 는 unknown 폴백(알 수 없음 / ?)으로 처리한다", () => {
  const { statusLabel, statusIcon, isKnownStatus } = loadStatusCard();
  assert.equal(isKnownStatus("nope"), false);
  assert.equal(statusLabel("nope"), "알 수 없음");
  assert.equal(statusIcon("nope"), "?");
});

test("AC2: badgeAriaLabel 은 '{서비스명} 상태: {라벨}' 형식이다", () => {
  const { badgeAriaLabel } = loadStatusCard();
  assert.equal(badgeAriaLabel("웹 서버", "operational"), "웹 서버 상태: 정상");
  assert.equal(badgeAriaLabel("인증 서비스", "outage"), "인증 서비스 상태: 장애");
});

test("AC2: deriveWorstStatus/summarize 가 fixture 의 worst=outage 를 파생한다", () => {
  const { SERVICES, deriveWorstStatus, summarize } = loadStatusCard();
  assert.equal(deriveWorstStatus(SERVICES), "outage");
  const s = summarize(SERVICES);
  assert.equal(s.status, "outage");
  assert.equal(s.text, "일부 서비스에 장애가 발생했습니다.");
  assert.equal(s.total, 4);
  // 주: s.counts 는 vm 샌드박스(다른 realm) 객체라 deepStrictEqual 의 prototype
  // 검사에 걸린다 → 필드별로 값만 비교한다.
  assert.equal(s.counts.operational, 2);
  assert.equal(s.counts.degraded, 1);
  assert.equal(s.counts.outage, 1);
});

test("AC2: summarySubline 은 상태별 개수 문구를 만든다", () => {
  const { SERVICES, summarySubline } = loadStatusCard();
  assert.equal(
    summarySubline(SERVICES),
    "전체 서비스 4개 중 장애 1 · 저하 1 · 정상 2",
  );
});
