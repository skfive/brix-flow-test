/* support-inbox-phase18/tests/pipeline.test.js — 목록/검색/필터 파이프라인 순수 함수 단위 테스트
 * BF-1021 · 기획 §5.1(정렬)·§5.2(검색)·§5.3(필터)·§7(화면 상태 재현 매트릭스)
 * vanilla-static — node --test 로만 실행, DOM 미실행
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Inbox = require("../inbox.js");
const Fixtures = require("../fixtures.js");

const all = () => Fixtures.getFixtureTickets();
const idsOf = (arr) => arr.map((t) => t.id);

/* ── 정렬 (§5.1: priority 랭크 내림차순 → createdAt 오름차순 → id 오름차순) ── */

test("기본 정렬: urgent→high→normal→low, 동 priority 는 createdAt 오름차순", () => {
  const sorted = Inbox.sortTickets(all());
  // urgent(4002 07-11, 4007 07-16) → high(4003 07-12, 4005 07-14) → normal(4004 07-13, 4008 07-17) → low(4001 07-10, 4006 07-15)
  assert.deepEqual(idsOf(sorted), [
    "INQ-4002", "INQ-4007", "INQ-4003", "INQ-4005", "INQ-4004", "INQ-4008", "INQ-4001", "INQ-4006"
  ]);
});

test("정렬은 입력 배열을 변형하지 않는다(순수)", () => {
  const input = all();
  const before = idsOf(input);
  Inbox.sortTickets(input);
  assert.deepEqual(idsOf(input), before);
});

/* ── 검색 (§5.2: trim·소문자, id/subject/requester.name/email OR) ── */

test("빈 쿼리/공백만: 전체 반환(EC-04)", () => {
  assert.equal(Inbox.searchTickets(all(), "").length, 8);
  assert.equal(Inbox.searchTickets(all(), "   ").length, 8);
});

test("subject 매칭 단건: '환불' → INQ-4006", () => {
  assert.deepEqual(idsOf(Inbox.searchTickets(all(), "환불")), ["INQ-4006"]);
});

test("requester.name 매칭: '이' → 이서연(INQ-4002) 포함", () => {
  const ids = idsOf(Inbox.searchTickets(all(), "이"));
  assert.ok(ids.includes("INQ-4002"));
});

test("영문 subject 대소문자 무관 매칭: 'PAYMENT' → INQ-4005", () => {
  assert.deepEqual(idsOf(Inbox.searchTickets(all(), "PAYMENT")), ["INQ-4005"]);
});

test("id 매칭: 'inq-4003' (소문자) → INQ-4003", () => {
  assert.deepEqual(idsOf(Inbox.searchTickets(all(), "inq-4003")), ["INQ-4003"]);
});

test("email 매칭: 'haeun.oh' → INQ-4005", () => {
  assert.deepEqual(idsOf(Inbox.searchTickets(all(), "haeun.oh")), ["INQ-4005"]);
});

test("검색 0건(EC-05): 존재하지 않는 키워드 → 빈 배열", () => {
  assert.equal(Inbox.searchTickets(all(), "존재하지않는키워드").length, 0);
});

test("assignee 는 검색 대상이 아니다: '박운영' 은 매칭 0건", () => {
  assert.equal(Inbox.searchTickets(all(), "박운영").length, 0);
});

/* ── 필터 (§5.3: 카테고리 내 OR, 간 AND, unassigned 특수값) ── */

test("status 필터 다건: ['received'] → 4001,4002,4008", () => {
  const r = Inbox.filterTickets(all(), { status: ["received"] });
  assert.deepEqual(idsOf(r).sort(), ["INQ-4001", "INQ-4002", "INQ-4008"]);
});

test("priority 필터: ['urgent'] → 4002,4007", () => {
  const r = Inbox.filterTickets(all(), { priority: ["urgent"] });
  assert.deepEqual(idsOf(r).sort(), ["INQ-4002", "INQ-4007"]);
});

test("카테고리 내 OR: status ['on_hold','resolved'] → 4005,4006", () => {
  const r = Inbox.filterTickets(all(), { status: ["on_hold", "resolved"] });
  assert.deepEqual(idsOf(r).sort(), ["INQ-4005", "INQ-4006"]);
});

test("assignee unassigned(EC-08): assignee===null 만 → 4001,4008", () => {
  const r = Inbox.filterTickets(all(), { assignee: ["unassigned"] });
  assert.deepEqual(idsOf(r).sort(), ["INQ-4001", "INQ-4008"]);
});

test("assignee agt-02: 4003,4005,4007", () => {
  const r = Inbox.filterTickets(all(), { assignee: ["agt-02"] });
  assert.deepEqual(idsOf(r).sort(), ["INQ-4003", "INQ-4005", "INQ-4007"]);
});

test("카테고리 간 AND: status['in_progress'] ∩ priority['urgent'] → 4007", () => {
  const r = Inbox.filterTickets(all(), { status: ["in_progress"], priority: ["urgent"] });
  assert.deepEqual(idsOf(r), ["INQ-4007"]);
});

test("빈 필터(EC-06): 전체 통과 8건", () => {
  assert.equal(Inbox.filterTickets(all(), { status: [], priority: [], assignee: [] }).length, 8);
  assert.equal(Inbox.filterTickets(all(), {}).length, 8);
});

/* ── 파이프라인 합성 (§5: 필터 → 검색 → 정렬) ── */

test("buildList 기본: 정렬된 8건", () => {
  const r = Inbox.buildList(all(), {});
  assert.deepEqual(idsOf(r), [
    "INQ-4002", "INQ-4007", "INQ-4003", "INQ-4005", "INQ-4004", "INQ-4008", "INQ-4001", "INQ-4006"
  ]);
});

test("buildList 필터+검색 교집합 0건(EC-07): status['resolved'] + '로그인' → 빈 배열", () => {
  const r = Inbox.buildList(all(), { filters: { status: ["resolved"] }, query: "로그인" });
  assert.equal(r.length, 0);
});

test("buildList 검색+필터 AND 결합: priority['urgent'] + '계정' → INQ-4007", () => {
  const r = Inbox.buildList(all(), { filters: { priority: ["urgent"] }, query: "계정" });
  assert.deepEqual(idsOf(r), ["INQ-4007"]);
});

test("buildList 결과도 §5.1 정렬 유지: assignee['agt-02'] → 4007,4003,4005", () => {
  const r = Inbox.buildList(all(), { filters: { assignee: ["agt-02"] } });
  assert.deepEqual(idsOf(r), ["INQ-4007", "INQ-4003", "INQ-4005"]);
});

/* ── 집계 (시안 §4.2 헤더) ── */

test("summarize: 총8 · 미배정2 · 진행3 · 긴급2", () => {
  const s = Inbox.summarize(all());
  assert.equal(s.total, 8);
  assert.equal(s.unassigned, 2);
  assert.equal(s.in_progress, 3);
  assert.equal(s.urgent, 2);
});
