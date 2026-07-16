// BF-856 · /demo/status 정적 상태 배지 순수 로직 단위 테스트 (focused scope · module: status-badge)
// - 대상: src/app/demo/status/status.js (fixture·라벨·아이콘·요약 파생 순수 함수)
// - 실행: node --test tests/status-badge-BF856.test.js
// - 기획 SSOT: docs/planning/status-badge-BF-854.md (§3 fixture, §3.3 요약 파생, §5 접근성)
// - 디자인: docs/design/status-badge-BF-855.md (§5 컴포넌트, §4.2 배지 라벨/아이콘)
//
// DOM/네트워크 미의존 로직만 검증한다. 실제 화면 렌더·배지 aria-label 은
// e2e-runner 브라우저 스모크로 별도 검증(PR 참조).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  SERVICES,
  STATUS_LABELS,
  STATUS_ICONS,
  STATUS_SEVERITY,
  SUMMARY_TEXT,
  UNKNOWN_STATUS,
  statusLabel,
  statusIcon,
  isKnownStatus,
  badgeAriaLabel,
  deriveWorstStatus,
  summaryText,
  countByStatus,
  summarize,
  summarySubline,
} from "../src/app/demo/status/status.js";

// ─────────── fixture 스키마 (기획 §3.1/§3.2) ───────────
test("SERVICES fixture 는 id·name·status·description 4필드를 모두 갖는다", () => {
  assert.ok(Array.isArray(SERVICES) && SERVICES.length > 0);
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

test("SERVICES fixture 는 3가지 상태값을 모두 최소 1회 포함한다(기획 §3.1)", () => {
  const statuses = new Set(SERVICES.map((s) => s.status));
  assert.ok(statuses.has("operational"));
  assert.ok(statuses.has("degraded"));
  assert.ok(statuses.has("outage"));
});

test("SERVICES 의 모든 status 는 정의된 3개 리터럴만 사용(기획 §3.2)", () => {
  for (const svc of SERVICES) {
    assert.ok(isKnownStatus(svc.status), `미정의 status: ${svc.status}`);
  }
});

test("SERVICES id 는 서로 유일하다", () => {
  const ids = SERVICES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

// ─────────── 라벨/아이콘 매핑 (디자인 §4.2) ───────────
test("statusLabel: 3상태 한글 라벨 매핑", () => {
  assert.equal(statusLabel("operational"), "정상");
  assert.equal(statusLabel("degraded"), "저하");
  assert.equal(statusLabel("outage"), "장애");
});

test("statusIcon: 3상태 장식 아이콘 매핑", () => {
  assert.equal(statusIcon("operational"), "●");
  assert.equal(statusIcon("degraded"), "▲");
  assert.equal(statusIcon("outage"), "✕");
});

test("STATUS_LABELS/ICONS 상수 노출", () => {
  assert.deepEqual(STATUS_LABELS, {
    operational: "정상",
    degraded: "저하",
    outage: "장애",
  });
  assert.deepEqual(STATUS_ICONS, {
    operational: "●",
    degraded: "▲",
    outage: "✕",
  });
});

test("미정의 status 는 폴백 라벨/아이콘(기획 §9.3, 디자인 §5.1)", () => {
  assert.equal(statusLabel("weird"), UNKNOWN_STATUS.label);
  assert.equal(statusIcon("weird"), UNKNOWN_STATUS.icon);
  assert.equal(statusLabel(undefined), UNKNOWN_STATUS.label);
  assert.equal(isKnownStatus("weird"), false);
  assert.equal(isKnownStatus("operational"), true);
});

// ─────────── 배지 접근성 이름 (기획 §5.1, AC-2) ───────────
test("badgeAriaLabel: '{서비스명} 상태: {라벨}' 형식(기획 §5.1)", () => {
  assert.equal(badgeAriaLabel("웹 서버", "operational"), "웹 서버 상태: 정상");
  assert.equal(badgeAriaLabel("데이터베이스", "degraded"), "데이터베이스 상태: 저하");
  assert.equal(badgeAriaLabel("인증 서비스", "outage"), "인증 서비스 상태: 장애");
});

// ─────────── 요약 파생 (기획 §3.3, §9.1) ───────────
test("STATUS_SEVERITY: outage > degraded > operational", () => {
  assert.ok(STATUS_SEVERITY.outage > STATUS_SEVERITY.degraded);
  assert.ok(STATUS_SEVERITY.degraded > STATUS_SEVERITY.operational);
});

test("deriveWorstStatus: 하나라도 outage 면 outage(기획 §3.3/§9.1)", () => {
  const svcs = [
    { status: "operational" },
    { status: "degraded" },
    { status: "outage" },
  ];
  assert.equal(deriveWorstStatus(svcs), "outage");
});

test("deriveWorstStatus: outage 없고 degraded 있으면 degraded", () => {
  const svcs = [{ status: "operational" }, { status: "degraded" }];
  assert.equal(deriveWorstStatus(svcs), "degraded");
});

test("deriveWorstStatus: 전부 operational 이면 operational", () => {
  const svcs = [{ status: "operational" }, { status: "operational" }];
  assert.equal(deriveWorstStatus(svcs), "operational");
});

test("deriveWorstStatus: 다수결이 아니라 가장 심각한 상태 우선(기획 §9.1)", () => {
  // degraded 2건 vs outage 1건 → outage 승 (다수결 아님)
  const svcs = [
    { status: "degraded" },
    { status: "degraded" },
    { status: "outage" },
  ];
  assert.equal(deriveWorstStatus(svcs), "outage");
});

test("summaryText: worst 상태별 문구(기획 §3.3)", () => {
  assert.equal(summaryText("operational"), SUMMARY_TEXT.operational);
  assert.equal(summaryText("degraded"), SUMMARY_TEXT.degraded);
  assert.equal(summaryText("outage"), SUMMARY_TEXT.outage);
  assert.equal(summaryText("operational"), "모든 서비스가 정상 작동 중입니다.");
});

test("countByStatus: 상태별 개수 집계", () => {
  const svcs = [
    { status: "operational" },
    { status: "operational" },
    { status: "degraded" },
    { status: "outage" },
  ];
  assert.deepEqual(countByStatus(svcs), {
    operational: 2,
    degraded: 1,
    outage: 1,
  });
});

test("summarize: 기본 fixture 는 outage 요약(auth 장애 포함)", () => {
  const s = summarize(SERVICES);
  assert.equal(s.status, "outage");
  assert.equal(s.text, SUMMARY_TEXT.outage);
  assert.equal(s.total, SERVICES.length);
  assert.equal(s.counts.operational, 2);
  assert.equal(s.counts.degraded, 1);
  assert.equal(s.counts.outage, 1);
});

test("summarySubline: '전체 서비스 N개 중 장애 x · 저하 y · 정상 z'(디자인 §4.4)", () => {
  assert.equal(
    summarySubline(SERVICES),
    "전체 서비스 4개 중 장애 1 · 저하 1 · 정상 2",
  );
});

// ─────────── 정적 제외 범위 자동 가드 (기획 §6.5) ───────────
// 수동 grep 이 아니라 자동 assertion 으로 health API·polling·네트워크 0건 강제.
test("status 소스에 네트워크/polling 진입점이 존재하지 않는다(기획 §6.1/§6.2/§6.4)", () => {
  const statusDir = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "src",
    "app",
    "demo",
    "status",
  );
  // fetch/XHR/WebSocket/EventSource/절대 URL/폴링 타이머 — 제외 범위 진입점
  const forbidden =
    /\b(fetch|XMLHttpRequest|WebSocket|EventSource|setInterval|setTimeout)\b|https?:\/\//;
  const sources = readdirSync(statusDir).filter(
    (f) => f.endsWith(".js") || f.endsWith(".html"),
  );
  assert.ok(sources.length > 0, "status 소스 파일이 존재해야 한다");
  for (const file of sources) {
    const content = readFileSync(join(statusDir, file), "utf8");
    const match = content.match(forbidden);
    assert.equal(
      match,
      null,
      `${file} 에 제외 범위 위반 패턴 발견: ${match?.[0]}`,
    );
  }
});

// 색상 하드코딩 금지 — 배지/카드 스타일은 var(--…) 토큰만 참조(디자인 §6.4)
test("styles.css 는 :root/[data-theme] 정의 외에 색상 리터럴을 하드코딩하지 않는다", () => {
  const cssPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "src",
    "app",
    "demo",
    "status",
    "styles.css",
  );
  const css = readFileSync(cssPath, "utf8");
  // :root {…} 와 [data-theme="dark"] {…} 토큰 정의 블록은 제외하고 검사
  const withoutTokenBlocks = css.replace(
    /(:root|\[data-theme="dark"\])\s*\{[^}]*\}/g,
    "",
  );
  // 남은 CSS 규칙에 hex/rgb 색상 리터럴이 없어야 한다(토큰 var() 참조만 허용)
  const colorLiteral = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(/;
  const match = withoutTokenBlocks.match(colorLiteral);
  assert.equal(
    match,
    null,
    `토큰 블록 밖에서 색상 리터럴 발견: ${match?.[0]}`,
  );
});
