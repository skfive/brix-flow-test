/* support-inbox-phase18/tests/domain.test.js — 상태 전이·가드·이력 순수 함수 + fixture 무결성 테스트
 * BF-1021 · 기획 §3(스키마)·§4(전이표·가드 G1~G5)·§6(fixture)·§9(EC-01~EC-12)
 * vanilla-static — node --test 로만 실행, DOM 미실행
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Inbox = require("../inbox.js");
const Fixtures = require("../fixtures.js");

const AGT_01 = { id: "agt-01", name: "박운영" };
const OPTS = (over) => Object.assign(
  { actor: AGT_01, at: "2026-07-18T12:00:00+09:00", note: null, eventId: "EVT-700999" }, over
);
const byId = (id) => Fixtures.getFixtureTickets().find((t) => t.id === id);

/* ── getAllowedTransitions (§4.3 가드 · 시안 §5.4) ── */

test("received + 미배정: '진행 시작' 은 G1 로 비활성(사유 포함) — INQ-4001", () => {
  const trs = Inbox.getAllowedTransitions(byId("INQ-4001"));
  const start = trs.find((x) => x.to === "in_progress");
  assert.ok(start);
  assert.equal(start.enabled, false);
  assert.match(start.reason, /담당자 미배정/);
});

test("received + 배정됨: '진행 시작' 활성 — INQ-4002", () => {
  const start = Inbox.getAllowedTransitions(byId("INQ-4002")).find((x) => x.to === "in_progress");
  assert.equal(start.enabled, true);
});

test("in_progress: 보류·해결 전이 활성 — INQ-4003", () => {
  const trs = Inbox.getAllowedTransitions(byId("INQ-4003"));
  assert.equal(trs.find((x) => x.to === "on_hold").enabled, true);
  assert.equal(trs.find((x) => x.to === "resolved").enabled, true);
});

test("on_hold: '재개' 활성, '해결' 은 G4 로 비활성 — INQ-4005", () => {
  const trs = Inbox.getAllowedTransitions(byId("INQ-4005"));
  assert.equal(trs.find((x) => x.to === "in_progress").enabled, true);
  const resolve = trs.find((x) => x.to === "resolved");
  assert.equal(resolve.enabled, false);
  assert.match(resolve.reason, /직접 전이 불가/);
});

test("resolved: '재오픈'(→in_progress) 활성 — INQ-4006", () => {
  const reopen = Inbox.getAllowedTransitions(byId("INQ-4006")).find((x) => x.to === "in_progress");
  assert.equal(reopen.enabled, true);
});

/* ── transition (§4.2 전이 + §5.4) ── */

test("received→in_progress 성공 시 status/updatedAt 갱신 + STATUS_CHANGED append — INQ-4002", () => {
  const t = byId("INQ-4002");
  const before = t.history.length;
  const res = Inbox.transition(t, "in_progress", OPTS({ note: "처리 시작" }));
  assert.equal(res.ok, true);
  assert.equal(res.inquiry.status, "in_progress");
  assert.equal(res.inquiry.updatedAt, "2026-07-18T12:00:00+09:00");
  assert.equal(res.inquiry.history.length, before + 1);
  const last = res.inquiry.history[res.inquiry.history.length - 1];
  assert.equal(last.type, "STATUS_CHANGED");
  assert.equal(last.from, "received");
  assert.equal(last.to, "in_progress");
  assert.equal(last.note, "처리 시작");
});

test("transition 은 원본 티켓을 변형하지 않는다(순수)", () => {
  const t = byId("INQ-4002");
  const beforeStatus = t.status;
  const beforeLen = t.history.length;
  Inbox.transition(t, "in_progress", OPTS());
  assert.equal(t.status, beforeStatus);
  assert.equal(t.history.length, beforeLen);
});

test("동일 상태 전이는 no-op(EC-01) — 이력 미기록", () => {
  const t = byId("INQ-4003"); // in_progress
  const res = Inbox.transition(t, "in_progress", OPTS());
  assert.equal(res.ok, true);
  assert.equal(res.noop, true);
  assert.equal(res.inquiry.history.length, t.history.length);
});

test("미배정 received→in_progress 거부(EC-02, G1) — INQ-4001", () => {
  const res = Inbox.transition(byId("INQ-4001"), "in_progress", OPTS());
  assert.equal(res.ok, false);
  assert.match(res.error, /담당자 미배정/);
});

test("on_hold→resolved 직접 전이 거부(EC-03, G4) — INQ-4005", () => {
  const res = Inbox.transition(byId("INQ-4005"), "resolved", OPTS());
  assert.equal(res.ok, false);
  assert.match(res.error, /직접 전이 불가/);
});

test("허용되지 않은 전이(received→resolved) 거부", () => {
  const res = Inbox.transition(byId("INQ-4002"), "resolved", OPTS());
  assert.equal(res.ok, false);
});

test("재오픈 후 다시 해결 정상 허용(EC-09) — INQ-4007 in_progress→resolved", () => {
  const t = byId("INQ-4007");
  const res = Inbox.transition(t, "resolved", OPTS());
  assert.equal(res.ok, true);
  assert.equal(res.inquiry.status, "resolved");
  assert.ok(res.inquiry.history.length >= 5);
});

test("빈 note('')는 null 로 정규화된다", () => {
  const res = Inbox.transition(byId("INQ-4002"), "in_progress", OPTS({ note: "" }));
  assert.equal(res.inquiry.history[res.inquiry.history.length - 1].note, null);
});

/* ── nextEventId (§3.2 EVT-######) ── */

test("nextEventId: fixture 최대 700015 → 다음 EVT-700016", () => {
  assert.equal(Inbox.nextEventId(Fixtures.getFixtureTickets()), "EVT-700016");
});

/* ── fixture 무결성 (§6) ── */

test("fixture 8건, id INQ-4001~4008", () => {
  const t = Fixtures.getFixtureTickets();
  assert.equal(t.length, 8);
  assert.deepEqual(t.map((x) => x.id), [
    "INQ-4001", "INQ-4002", "INQ-4003", "INQ-4004", "INQ-4005", "INQ-4006", "INQ-4007", "INQ-4008"
  ]);
});

test("각 status·priority 최소 1건 존재(§6.3 필터 옵션 커버리지)", () => {
  const t = Fixtures.getFixtureTickets();
  ["received", "in_progress", "on_hold", "resolved"].forEach((s) => {
    assert.ok(t.some((x) => x.status === s), `status ${s} 누락`);
  });
  ["urgent", "high", "normal", "low"].forEach((p) => {
    assert.ok(t.some((x) => x.priority === p), `priority ${p} 누락`);
  });
});

test("status 는 마지막 STATUS_CHANGED 의 to 와 일치(무결성)", () => {
  Fixtures.getFixtureTickets().forEach((t) => {
    const lastStatus = t.history.filter((e) => e.type === "STATUS_CHANGED").slice(-1)[0];
    if (lastStatus) assert.equal(t.status, lastStatus.to, `${t.id} status 불일치`);
  });
});

test("미배정은 received 상태에서만 허용(§3.1 assignee 규칙)", () => {
  Fixtures.getFixtureTickets().forEach((t) => {
    if (t.assignee === null) assert.equal(t.status, "received", `${t.id} 미배정인데 received 아님`);
  });
});

test("깊은 복제: getFixtureTickets 반환값 변경이 원본에 영향 없음", () => {
  const a = Fixtures.getFixtureTickets();
  a[0].status = "resolved";
  a[0].history.push({ x: 1 });
  const b = Fixtures.getFixtureTickets();
  assert.equal(b[0].status, "received");
  assert.equal(b[0].history.length, 0);
});

/* ── formatAt (Date 미사용 결정성) ── */

test("formatAt: ISO8601 +09:00 → 'YYYY-MM-DD HH:MM (+09:00)'", () => {
  assert.equal(Inbox.formatAt("2026-07-12T10:12:00+09:00"), "2026-07-12 10:12 (+09:00)");
});
