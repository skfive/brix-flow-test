/* support-inbox-canary/tests/domain.test.js — 상태 전이·가드·배정·이력 순수 함수 단위 테스트
 * BF-1007 · 기획 §4 (전이표·가드) · §5 (배정) · §6 (이력) · §11 (EC-01~EC-11)
 * vanilla-static — node --test 로만 실행, DOM 미실행
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Inbox = require("../inbox.js");
const Fixtures = require("../fixtures.js");

const AGT_01 = { id: "agt-01", name: "박운영" };
const AGT_02 = { id: "agt-02", name: "정지원" };
const OPTS = (over) => Object.assign({ actor: AGT_01, at: "2026-07-17T12:00:00+09:00", note: null, eventId: "EVT-000999" }, over);
const seedById = (id) => Fixtures.getSeedTickets().find((t) => t.id === id);

/* ── getAllowedTransitions (§4.3 가드 · §5.4) ── */

test("received + 미배정: '진행 시작' 은 G1 로 비활성(사유 포함)", () => {
  const t = seedById("INQ-3001"); // received, null
  const trs = Inbox.getAllowedTransitions(t);
  const start = trs.find((x) => x.to === "in_progress");
  assert.ok(start);
  assert.equal(start.enabled, false);
  assert.match(start.reason, /담당자 미배정/);
});

test("received + 배정됨: '진행 시작' 활성", () => {
  const t = seedById("INQ-3002"); // received, agt-01
  const start = Inbox.getAllowedTransitions(t).find((x) => x.to === "in_progress");
  assert.equal(start.enabled, true);
});

test("in_progress: 보류·해결 전이 활성", () => {
  const t = seedById("INQ-3003");
  const trs = Inbox.getAllowedTransitions(t);
  assert.equal(trs.find((x) => x.to === "on_hold").enabled, true);
  assert.equal(trs.find((x) => x.to === "resolved").enabled, true);
});

test("on_hold: '재개' 활성, '해결' 은 G4 로 비활성", () => {
  const t = seedById("INQ-3004"); // on_hold
  const trs = Inbox.getAllowedTransitions(t);
  assert.equal(trs.find((x) => x.to === "in_progress").enabled, true);
  const resolved = trs.find((x) => x.to === "resolved");
  assert.equal(resolved.enabled, false);
  assert.match(resolved.reason, /G4/);
});

test("resolved: '재오픈'(→진행) 활성", () => {
  const t = seedById("INQ-3005"); // resolved
  const trs = Inbox.getAllowedTransitions(t);
  assert.equal(trs.find((x) => x.to === "in_progress").enabled, true);
});

/* ── transition (§4.2) ── */

test("transition 성공: 상태 변경 + STATUS_CHANGED append(오래된 순 유지)", () => {
  const t = seedById("INQ-3003"); // in_progress
  const before = t.history.length;
  const res = Inbox.transition(t, "on_hold", OPTS({ note: "고객 회신 대기" }));
  assert.equal(res.ok, true);
  assert.equal(res.inquiry.status, "on_hold");
  assert.equal(res.inquiry.history.length, before + 1);
  const last = res.inquiry.history[res.inquiry.history.length - 1];
  assert.equal(last.type, "STATUS_CHANGED");
  assert.equal(last.from, "in_progress");
  assert.equal(last.to, "on_hold");
  assert.equal(last.note, "고객 회신 대기");
  // 원본 불변(append-only, immutability)
  assert.equal(t.history.length, before);
});

test("transition 거부: EC-02 미배정 received→in_progress (G1)", () => {
  const t = seedById("INQ-3001");
  const res = Inbox.transition(t, "in_progress", OPTS());
  assert.equal(res.ok, false);
  assert.match(res.error, /담당자 미배정/);
});

test("transition 거부: EC-03 on_hold→resolved 직접 전이 (G4)", () => {
  const t = seedById("INQ-3004");
  const res = Inbox.transition(t, "resolved", OPTS());
  assert.equal(res.ok, false);
  assert.match(res.error, /G4/);
});

test("transition 거부: 전이표에 없는 전이(received→resolved)", () => {
  const t = seedById("INQ-3002");
  const res = Inbox.transition(t, "resolved", OPTS());
  assert.equal(res.ok, false);
});

test("transition no-op: EC-01 동일 상태는 이력 미기록", () => {
  const t = seedById("INQ-3003"); // in_progress
  const res = Inbox.transition(t, "in_progress", OPTS());
  assert.equal(res.ok, true);
  assert.equal(res.noop, true);
  assert.equal(res.inquiry.history.length, t.history.length);
});

test("transition: EC-07 재오픈(resolved→in_progress) 허용", () => {
  const t = seedById("INQ-3005"); // resolved
  const res = Inbox.transition(t, "in_progress", OPTS({ note: "재발 신고" }));
  assert.equal(res.ok, true);
  assert.equal(res.inquiry.status, "in_progress");
});

/* ── changeAssignee (§5 · EC-10/EC-11) ── */

test("changeAssignee: EC-10 received 에서 해제 허용 + ASSIGNEE_CHANGED", () => {
  const t = seedById("INQ-3002"); // received, agt-01
  const res = Inbox.changeAssignee(t, null, OPTS());
  assert.equal(res.ok, true);
  assert.equal(res.inquiry.assignee, null);
  const last = res.inquiry.history[res.inquiry.history.length - 1];
  assert.equal(last.type, "ASSIGNEE_CHANGED");
  assert.equal(last.from, "박운영");
  assert.equal(last.to, null);
});

test("changeAssignee 거부: in_progress 에서 해제 불가(항상 담당자 필요)", () => {
  const t = seedById("INQ-3003"); // in_progress
  const res = Inbox.changeAssignee(t, null, OPTS());
  assert.equal(res.ok, false);
});

test("changeAssignee 거부: EC-11 resolved 재배정 불가", () => {
  const t = seedById("INQ-3005"); // resolved
  const res = Inbox.changeAssignee(t, AGT_01, OPTS());
  assert.equal(res.ok, false);
});

test("changeAssignee 재배정: in_progress 에서 다른 운영자로 변경", () => {
  const t = seedById("INQ-3003"); // agt-02
  const res = Inbox.changeAssignee(t, AGT_01, OPTS());
  assert.equal(res.ok, true);
  assert.equal(res.inquiry.assignee.id, "agt-01");
  const last = res.inquiry.history[res.inquiry.history.length - 1];
  assert.equal(last.from, "정지원");
  assert.equal(last.to, "박운영");
});

test("changeAssignee no-op: 동일 담당자는 이력 미기록", () => {
  const t = seedById("INQ-3003"); // agt-02
  const res = Inbox.changeAssignee(t, AGT_02, OPTS());
  assert.equal(res.ok, true);
  assert.equal(res.noop, true);
});

/* ── nextEventId / summarize / formatAt ── */

test("nextEventId: 전체 history 최대값 +1 을 6자리로 생성", () => {
  const tickets = Fixtures.getSeedTickets(); // 최대 EVT-000013
  assert.equal(Inbox.nextEventId(tickets), "EVT-000014");
  assert.equal(Inbox.nextEventId([]), "EVT-000001");
});

test("summarize: 총·미배정·진행·보류 집계(seed 기준)", () => {
  const s = Inbox.summarize(Fixtures.getSeedTickets());
  assert.equal(s.total, 6);
  assert.equal(s.unassigned, 1); // INQ-3001
  assert.equal(s.in_progress, 2); // INQ-3003, INQ-3006
  assert.equal(s.on_hold, 1); // INQ-3004
  assert.equal(s.resolved, 1); // INQ-3005
});

test("formatAt: ISO8601 → 'YYYY-MM-DD HH:MM (+09:00)' (Date 객체 미사용)", () => {
  assert.equal(Inbox.formatAt("2026-07-12T10:35:00+09:00"), "2026-07-12 10:35 (+09:00)");
  assert.equal(Inbox.formatAt("2026-07-12T10:35:00Z"), "2026-07-12 10:35 (UTC)");
  assert.equal(Inbox.formatAt(""), "");
});
