// SLA 위반 대응 큐 — 순수 로직 단위 테스트 (BF-1057)
// 실행: node --test sla-breach-triage-canary/queue.test.js
// 기획 §7 AC-1~AC-8 중 순수 로직으로 검증 가능한 항목을 커버.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SEVERITY_RANK,
  isValidRequest,
  filterValidRequests,
  compareQueue,
  sortQueue,
  assignRequest,
  resolveRequest,
  unassignRequest,
} from "./queue.js";
import { SLA_FIXTURES, cloneFixtures } from "./fixtures.js";

const NOW = "2026-07-18T10:00:00+09:00";

function pending(over) {
  const { id, ...rest } = over;
  return {
    id: `P-${id}`,
    title: "t",
    customer: "c",
    severity: rest.severity ?? "medium",
    breachedAt: rest.breachedAt ?? "2026-07-18T08:00:00+09:00",
    slaMinutesOverdue: rest.slaMinutesOverdue ?? 10,
    status: "pending",
    assignee: null,
    assignedAt: null,
    resolutionNote: null,
    resolvedAt: null,
    ...rest,
  };
}

// ── AC-1: 스키마/무결성 ──────────────────────────────────────────
test("AC-1: fixture 는 모두 무결성 규칙을 통과한다", () => {
  for (const r of SLA_FIXTURES) {
    assert.equal(isValidRequest(r), true, `${r.id} 유효해야 함`);
  }
});

test("cloneFixtures 는 원본을 변경하지 않는 복제본을 반환한다", () => {
  const a = cloneFixtures();
  a[0].title = "변경됨";
  assert.notEqual(SLA_FIXTURES[0].title, "변경됨");
});

// ── AC-8: 무결성 위반/중복 제외 ──────────────────────────────────
test("AC-8: pending 인데 assignee 가 채워지면 유효하지 않다", () => {
  assert.equal(isValidRequest({ ...pending({ id: "x" }), assignee: "홍길동" }), false);
});

test("AC-8: assigned 인데 assignedAt 이 null 이면 유효하지 않다", () => {
  const bad = { ...pending({ id: "x" }), status: "assigned", assignee: "홍길동", assignedAt: null };
  assert.equal(isValidRequest(bad), false);
});

test("AC-8: resolved 는 4개 필드가 모두 non-null 이어야 유효하다", () => {
  const base = {
    id: "R1", title: "t", customer: "c", severity: "low",
    breachedAt: "2026-07-18T06:00:00+09:00", slaMinutesOverdue: 5, status: "resolved",
    assignee: "김", assignedAt: "2026-07-18T06:10:00+09:00",
    resolutionNote: "완료", resolvedAt: "2026-07-18T06:30:00+09:00",
  };
  assert.equal(isValidRequest(base), true);
  assert.equal(isValidRequest({ ...base, resolutionNote: null }), false);
});

test("AC-8: slaMinutesOverdue 음수는 무효, 잘못된 severity/status 무효", () => {
  assert.equal(isValidRequest(pending({ id: "n", slaMinutesOverdue: -1 })), false);
  assert.equal(isValidRequest(pending({ id: "s", severity: "urgent" })), false);
});

test("AC-8: filterValidRequests 는 위반 항목과 중복 id 를 제외한다", () => {
  const dup = pending({ id: "dup" });
  const list = [
    pending({ id: "ok" }),
    { ...pending({ id: "bad" }), assignee: "채워짐" }, // 무결성 위반
    dup,
    { ...dup }, // 중복 id
  ];
  const valid = filterValidRequests(list);
  assert.deepEqual(valid.map((r) => r.id).sort(), ["P-dup", "P-ok"]);
});

test("filterValidRequests 는 배열이 아니면 빈 배열", () => {
  assert.deepEqual(filterValidRequests(null), []);
  assert.deepEqual(filterValidRequests(undefined), []);
});

// ── AC-2: 정렬 comparator + 누락 없음 ────────────────────────────
test("AC-2: severity 랭크가 critical<high<medium<low 순으로 정의된다", () => {
  assert.ok(SEVERITY_RANK.critical < SEVERITY_RANK.high);
  assert.ok(SEVERITY_RANK.high < SEVERITY_RANK.medium);
  assert.ok(SEVERITY_RANK.medium < SEVERITY_RANK.low);
});

test("AC-2: 위험도 우선 정렬", () => {
  const list = [
    pending({ id: "c", severity: "low" }),
    pending({ id: "a", severity: "critical" }),
    pending({ id: "b", severity: "high" }),
  ];
  const { pendingQueue } = sortQueue(list);
  assert.deepEqual(pendingQueue.map((r) => r.severity), ["critical", "high", "low"]);
});

test("AC-2: 같은 위험도면 slaMinutesOverdue 내림차순", () => {
  const list = [
    pending({ id: "a", severity: "high", slaMinutesOverdue: 10 }),
    pending({ id: "b", severity: "high", slaMinutesOverdue: 99 }),
  ];
  const { pendingQueue } = sortQueue(list);
  assert.deepEqual(pendingQueue.map((r) => r.id), ["P-b", "P-a"]);
});

test("AC-2: 위험도·초과시간 동률이면 breachedAt 오름차순(오래된 것 먼저)", () => {
  const list = [
    pending({ id: "new", severity: "high", slaMinutesOverdue: 50, breachedAt: "2026-07-18T09:00:00+09:00" }),
    pending({ id: "old", severity: "high", slaMinutesOverdue: 50, breachedAt: "2026-07-18T07:00:00+09:00" }),
  ];
  const { pendingQueue } = sortQueue(list);
  assert.deepEqual(pendingQueue.map((r) => r.id), ["P-old", "P-new"]);
});

test("AC-2: 3기준 모두 동률이면 id 오름차순으로 결정적 정렬", () => {
  const common = { severity: "high", slaMinutesOverdue: 50, breachedAt: "2026-07-18T08:00:00+09:00" };
  const list = [pending({ id: "zzz", ...common }), pending({ id: "aaa", ...common })];
  const { pendingQueue } = sortQueue(list);
  assert.deepEqual(pendingQueue.map((r) => r.id), ["P-aaa", "P-zzz"]);
});

test("AC-2: 대응 대기열 + 해결됨 건수 == 전체 유효 항목 수(누락 없음)", () => {
  const { pendingQueue, resolvedQueue } = sortQueue(SLA_FIXTURES);
  const validCount = filterValidRequests(SLA_FIXTURES).length;
  assert.equal(pendingQueue.length + resolvedQueue.length, validCount);
  // 모든 유효 항목이 정확히 한 섹션에만
  const ids = [...pendingQueue, ...resolvedQueue].map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("AC-2: 해결됨 섹션은 resolvedAt 내림차순", () => {
  const mk = (id, resolvedAt) => ({
    id, title: "t", customer: "c", severity: "low", breachedAt: "2026-07-18T06:00:00+09:00",
    slaMinutesOverdue: 5, status: "resolved", assignee: "김", assignedAt: "2026-07-18T06:10:00+09:00",
    resolutionNote: "n", resolvedAt,
  });
  const { resolvedQueue } = sortQueue([
    mk("r-old", "2026-07-18T05:00:00+09:00"),
    mk("r-new", "2026-07-18T09:00:00+09:00"),
  ]);
  assert.deepEqual(resolvedQueue.map((r) => r.id), ["r-new", "r-old"]);
});

test("sortQueue/compareQueue 는 입력 배열을 변경하지 않는다(순수)", () => {
  const list = [pending({ id: "a", severity: "low" }), pending({ id: "b", severity: "critical" })];
  const before = list.map((r) => r.id);
  sortQueue(list);
  compareQueue(list[0], list[1]);
  assert.deepEqual(list.map((r) => r.id), before);
});

// ── AC-1/4장: 상태 전이 ──────────────────────────────────────────
test("담당 지정: pending → assigned, assignee/assignedAt 설정", () => {
  const res = assignRequest(SLA_FIXTURES, "SLA-1001", "이담당", NOW);
  assert.equal(res.ok, true);
  assert.equal(res.data.status, "assigned");
  assert.equal(res.data.assignee, "이담당");
  assert.equal(res.data.assignedAt, NOW);
});

test("담당 지정: 원본 항목을 변경하지 않는다(순수)", () => {
  assignRequest(SLA_FIXTURES, "SLA-1001", "이담당", NOW);
  assert.equal(SLA_FIXTURES[0].status, "pending");
  assert.equal(SLA_FIXTURES[0].assignee, null);
});

// ── AC-3 ─────────────────────────────────────────────────────────
test("AC-3: 담당자 공백이면 에러, 상태 전이 없음", () => {
  const res = assignRequest(SLA_FIXTURES, "SLA-1001", "   ", NOW);
  assert.equal(res.ok, false);
  assert.equal(res.error, "담당자를 입력하세요");
});

test("담당 지정: pending 이 아니면 차단", () => {
  const res = assignRequest(SLA_FIXTURES, "SLA-1002", "이담당", NOW); // assigned
  assert.equal(res.ok, false);
});

// ── AC-4 ─────────────────────────────────────────────────────────
test("해결 처리: assigned → resolved, note/resolvedAt 설정", () => {
  const res = resolveRequest(SLA_FIXTURES, "SLA-1002", "핫픽스 배포 완료", NOW);
  assert.equal(res.ok, true);
  assert.equal(res.data.status, "resolved");
  assert.equal(res.data.resolutionNote, "핫픽스 배포 완료");
  assert.equal(res.data.resolvedAt, NOW);
});

test("AC-4: 해결 메모 공백이면 에러, 상태 전이 없음", () => {
  const res = resolveRequest(SLA_FIXTURES, "SLA-1002", "  ", NOW);
  assert.equal(res.ok, false);
  assert.equal(res.error, "해결 메모를 입력하세요");
});

test("해결 처리: assigned 가 아니면 차단(AC-5 종단 보호 포함)", () => {
  assert.equal(resolveRequest(SLA_FIXTURES, "SLA-1001", "메모", NOW).ok, false); // pending
  assert.equal(resolveRequest(SLA_FIXTURES, "SLA-1004", "메모", NOW).ok, false); // resolved
});

// ── AC-6: 담당 해제 ──────────────────────────────────────────────
test("AC-6: 담당 해제 → pending 복귀, assignee/assignedAt null", () => {
  const res = unassignRequest(SLA_FIXTURES, "SLA-1002");
  assert.equal(res.ok, true);
  assert.equal(res.data.status, "pending");
  assert.equal(res.data.assignee, null);
  assert.equal(res.data.assignedAt, null);
});

test("담당 해제: assigned 가 아니면 차단", () => {
  assert.equal(unassignRequest(SLA_FIXTURES, "SLA-1001").ok, false); // pending
  assert.equal(unassignRequest(SLA_FIXTURES, "SLA-1004").ok, false); // resolved
});

// ── 공통: 없는 id ────────────────────────────────────────────────
test("없는 requestId 는 모든 액션에서 에러", () => {
  assert.equal(assignRequest(SLA_FIXTURES, "NOPE", "a", NOW).ok, false);
  assert.equal(resolveRequest(SLA_FIXTURES, "NOPE", "n", NOW).ok, false);
  assert.equal(unassignRequest(SLA_FIXTURES, "NOPE").ok, false);
});

// ── AC-7: 빈 대기열 ──────────────────────────────────────────────
test("AC-7: 모든 항목이 resolved 면 대응 대기열은 비고 해결됨만 채워진다", () => {
  const allResolved = SLA_FIXTURES.filter((r) => r.status === "resolved");
  const { pendingQueue, resolvedQueue } = sortQueue(allResolved);
  assert.equal(pendingQueue.length, 0);
  assert.ok(resolvedQueue.length >= 1);
});
