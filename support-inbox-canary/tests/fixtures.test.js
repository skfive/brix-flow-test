/* support-inbox-canary/tests/fixtures.test.js — 결정적 seed 단위 테스트
 * BF-1007 · 기획 §7 (seed 스펙) · §6.3 (status↔history 일관성)
 * vanilla-static — node --test 로만 실행, DOM/네트워크 0건
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Fixtures = require("../fixtures.js");
const Storage = require("../storage.js");

test("seed 는 6건이며 4개 상태 + 재오픈을 모두 커버한다(§7.1)", () => {
  const tickets = Fixtures.getSeedTickets();
  assert.equal(tickets.length, 6);
  const statuses = tickets.map((t) => t.status);
  ["received", "in_progress", "on_hold", "resolved"].forEach((s) => {
    assert.ok(statuses.includes(s), `상태 ${s} 누락`);
  });
  // 재오픈(EC-07): resolved→in_progress STATUS_CHANGED 가 존재
  const reopened = tickets.some((t) =>
    t.history.some((e) => e.type === "STATUS_CHANGED" && e.from === "resolved" && e.to === "in_progress")
  );
  assert.ok(reopened, "재오픈 케이스 누락");
});

test("seed 는 결정적 — 두 호출이 값은 같고 참조는 다르다(오염 방지)", () => {
  const a = Fixtures.getSeedTickets();
  const b = Fixtures.getSeedTickets();
  assert.deepEqual(a, b);
  assert.notEqual(a, b);
  assert.notEqual(a[0], b[0]);
  a[0].subject = "MUTATED";
  assert.notEqual(Fixtures.getSeedTickets()[0].subject, "MUTATED", "seed 원본이 오염됨");
});

test("모든 seed ticket 이 §8.2 검증(V5/V6)을 통과한다", () => {
  Fixtures.getSeedTickets().forEach((t) => {
    assert.ok(Storage.isValidInquiry(t), `${t.id} 필드 검증 실패`);
    assert.ok(Storage.isStatusHistoryConsistent(t), `${t.id} status↔history 불일치`);
  });
});

test("INQ-3001 은 received·미배정·빈 이력(정상)", () => {
  const t = Fixtures.getSeedTickets()[0];
  assert.equal(t.id, "INQ-3001");
  assert.equal(t.status, "received");
  assert.equal(t.assignee, null);
  assert.equal(t.history.length, 0);
});

test("EVT ID 는 전역 유일하고 EVT-###### 패턴을 따른다", () => {
  const ids = [];
  Fixtures.getSeedTickets().forEach((t) => t.history.forEach((e) => ids.push(e.id)));
  ids.forEach((id) => assert.match(id, /^EVT-\d{6}$/));
  assert.equal(new Set(ids).size, ids.length, "중복 EVT ID 존재");
});

test("seed envelope 이 storage 검증을 통과한다", () => {
  const env = Storage.buildEnvelope(Fixtures.getSeedTickets(), "2026-07-17T09:00:00+09:00");
  assert.ok(Storage.isValidEnvelope(env));
});
