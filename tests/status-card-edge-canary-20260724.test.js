// BF-1138 · status-card 미정의 상태·빈 서비스 목록 파생 로직 회귀 canary
// - 대상: status-card/status.js 의 순수 파생 로직(전역 StatusCard API).
// - 목적: 미정의(알 수 없는) status 의 라벨·아이콘 폴백 계약과, 빈 서비스 목록의
//   전체 요약 계약을 현재 동작 그대로 고정한다(회귀 방지). production 로직 변경 없음.
// - 실행: node --test tests/status-card-edge-canary-20260724.test.js
// - 로딩: status.js 는 IIFE 로 전역(StatusCard)에 노출되는 vanilla-static 스크립트
//   (ESM import/export 없음). BF-882 관례를 따라 node:vm 샌드박스에서 로드해
//   file:// 계약(ESM/CJS 충돌 없음)을 유지한 채 전역 API 를 추출한다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATUS_JS = readFileSync(
  join(__dirname, "..", "status-card", "status.js"),
  "utf8",
);

// status.js 를 격리된 vm 컨텍스트에서 로드해 전역 StatusCard API 를 추출.
// IIFE 는 globalThis(=샌드박스 전역)에 StatusCard 를 대입하므로 sandbox.StatusCard 로 회수된다.
function loadStatusCard() {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(STATUS_JS, sandbox);
  return sandbox.StatusCard;
}

const StatusCard = loadStatusCard();

// 로더 자체 계약 — 전역 API 가 실제로 추출되는지 먼저 확정(로딩 회귀 조기 탐지).
test("StatusCard 전역 API 가 vm 샌드박스에서 로드된다", () => {
  assert.ok(StatusCard, "StatusCard 전역이 노출되어야 함");
  assert.equal(typeof StatusCard.statusLabel, "function");
  assert.equal(typeof StatusCard.statusIcon, "function");
  assert.equal(typeof StatusCard.summarize, "function");
});

// ─────────── AC1: 미정의(알 수 없는) status 폴백 계약 ───────────
// 정의된 3개 리터럴(operational/degraded/outage) 이 아닌 모든 입력은
// UNKNOWN_STATUS 폴백(label="알 수 없음", icon="?") 으로 귀결되어야 한다.
const UNKNOWN_INPUTS = [
  "maintenance", // 그럴듯하지만 미정의인 상태 문자열
  "OPERATIONAL", // 대소문자 불일치 → 미정의 취급
  "unknown",
  "",
  undefined,
  null,
  123,
];

test("AC1: isKnownStatus 는 미정의 status 에 false 를 반환한다", () => {
  for (const input of UNKNOWN_INPUTS) {
    assert.equal(
      StatusCard.isKnownStatus(input),
      false,
      `isKnownStatus(${JSON.stringify(input)}) 는 false 여야 함`,
    );
  }
  // 정의된 리터럴은 대비군으로 true 확인.
  for (const known of ["operational", "degraded", "outage"]) {
    assert.equal(StatusCard.isKnownStatus(known), true);
  }
});

test("AC1: statusLabel 은 미정의 status 에 폴백 라벨을 반환한다", () => {
  assert.equal(StatusCard.UNKNOWN_STATUS.label, "알 수 없음");
  for (const input of UNKNOWN_INPUTS) {
    assert.equal(
      StatusCard.statusLabel(input),
      "알 수 없음",
      `statusLabel(${JSON.stringify(input)}) 는 폴백 라벨이어야 함`,
    );
  }
});

test("AC1: statusIcon 은 미정의 status 에 폴백 아이콘을 반환한다", () => {
  assert.equal(StatusCard.UNKNOWN_STATUS.icon, "?");
  for (const input of UNKNOWN_INPUTS) {
    assert.equal(
      StatusCard.statusIcon(input),
      "?",
      `statusIcon(${JSON.stringify(input)}) 는 폴백 아이콘이어야 함`,
    );
  }
});

test("AC1: badgeAriaLabel 은 미정의 status 에 폴백 라벨을 포함한다", () => {
  assert.equal(
    StatusCard.badgeAriaLabel("결제 서비스", "maintenance"),
    "결제 서비스 상태: 알 수 없음",
  );
});

test("AC1: summaryText 는 미정의 worst 를 operational 문구로 폴백한다", () => {
  assert.equal(
    StatusCard.summaryText("maintenance"),
    StatusCard.SUMMARY_TEXT.operational,
  );
  assert.equal(
    StatusCard.summaryText("maintenance"),
    "모든 서비스가 정상 작동 중입니다.",
  );
});

test("AC1: 알려진 status 라벨·아이콘 매핑은 그대로 유지된다(대비군)", () => {
  assert.equal(StatusCard.statusLabel("operational"), "정상");
  assert.equal(StatusCard.statusLabel("degraded"), "저하");
  assert.equal(StatusCard.statusLabel("outage"), "장애");
  assert.equal(StatusCard.statusIcon("operational"), "●");
  assert.equal(StatusCard.statusIcon("degraded"), "▲");
  assert.equal(StatusCard.statusIcon("outage"), "✕");
});

// ─────────── AC2: 빈 서비스 목록 전체 요약 계약 ───────────
// 서비스가 하나도 없을 때 요약은 "정상(operational)" 기준선으로 파생되어야 한다.
test("AC2: deriveWorstStatus([]) 는 operational 기준선을 반환한다", () => {
  assert.equal(StatusCard.deriveWorstStatus([]), "operational");
});

// status.js 는 node:vm 샌드박스 realm 에서 실행되므로 반환 객체의 [[Prototype]] 이
// 메인 realm 과 달라 deepStrictEqual 이 실패한다. 계약(값)만 필드별로 고정한다.
test("AC2: countByStatus([]) 는 모든 상태 0 집계를 반환한다", () => {
  const c = StatusCard.countByStatus([]);
  assert.equal(c.operational, 0);
  assert.equal(c.degraded, 0);
  assert.equal(c.outage, 0);
});

test("AC2: summarize([]) 는 계약된 빈 요약 객체를 반환한다", () => {
  const s = StatusCard.summarize([]);
  assert.equal(s.status, "operational");
  assert.equal(s.text, "모든 서비스가 정상 작동 중입니다.");
  assert.equal(s.total, 0);
  assert.equal(s.counts.operational, 0);
  assert.equal(s.counts.degraded, 0);
  assert.equal(s.counts.outage, 0);
});

test("AC2: summarySubline([]) 는 0개 기준 서브라벨 문구를 반환한다", () => {
  assert.equal(
    StatusCard.summarySubline([]),
    "전체 서비스 0개 중 장애 0 · 저하 0 · 정상 0",
  );
});

test("AC2: 미정의 status 만 든 목록도 empty 와 동일하게 operational 로 파생된다", () => {
  // 미정의 status 는 심각도·집계에서 제외되므로 빈 목록과 같은 요약(단, total 은 항목 수).
  const onlyUnknown = [
    { id: "x", name: "미정의A", status: "maintenance" },
    { id: "y", name: "미정의B", status: "unknown" },
  ];
  const s = StatusCard.summarize(onlyUnknown);
  assert.equal(s.status, "operational");
  assert.equal(s.text, "모든 서비스가 정상 작동 중입니다.");
  assert.equal(s.total, 2);
  assert.equal(s.counts.operational, 0);
  assert.equal(s.counts.degraded, 0);
  assert.equal(s.counts.outage, 0);
});
