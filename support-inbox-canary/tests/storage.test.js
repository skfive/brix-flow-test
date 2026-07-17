/* support-inbox-canary/tests/storage.test.js — localStorage 어댑터 검증·손상 복구 단위 테스트
 * BF-1007 · 기획 §8 (저장 스펙) · §11 (EC-04~EC-06/EC-08)
 * vanilla-static — node --test 로만 실행
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Storage = require("../storage.js");
const Fixtures = require("../fixtures.js");

const KEY = Storage.STORAGE_KEY;
const validEnvelope = () => Storage.buildEnvelope(Fixtures.getSeedTickets(), "2026-07-17T09:00:00+09:00");

/* ── 검증 순수 함수 ── */

test("isValidEnvelope: V3 최상위가 object 아니면 손상", () => {
  assert.equal(Storage.isValidEnvelope([]), false);
  assert.equal(Storage.isValidEnvelope(null), false);
  assert.equal(Storage.isValidEnvelope("x"), false);
});

test("isValidEnvelope: V4 schemaVersion 불일치(구·미래버전)는 손상", () => {
  const env = validEnvelope(); env.schemaVersion = 2;
  assert.equal(Storage.isValidEnvelope(env), false);
  const env0 = validEnvelope(); env0.schemaVersion = 0;
  assert.equal(Storage.isValidEnvelope(env0), false);
});

test("isValidEnvelope: V5 필수 필드 누락 / 잘못된 status enum 은 손상", () => {
  const env = validEnvelope(); delete env.tickets[0].subject;
  assert.equal(Storage.isValidEnvelope(env), false);
  const env2 = validEnvelope(); env2.tickets[0].status = "archived";
  assert.equal(Storage.isValidEnvelope(env2), false);
});

test("isStatusHistoryConsistent: V6 status↔마지막 STATUS_CHANGED 불일치는 손상", () => {
  // in_progress 인데 마지막 STATUS_CHANGED.to 가 다르면 손상
  const t = Fixtures.getSeedTickets()[2]; // INQ-3003 in_progress
  t.status = "resolved";
  assert.equal(Storage.isStatusHistoryConsistent(t), false);
});

test("isStatusHistoryConsistent: EC-08 status!=received 인데 history 비면 손상", () => {
  const t = { status: "in_progress", history: [] };
  assert.equal(Storage.isStatusHistoryConsistent(t), false);
  const ok = { status: "received", history: [] };
  assert.equal(Storage.isStatusHistoryConsistent(ok), true);
});

test("isValidHistoryEvent: from/to/note 필드 존재 필수, type enum 강제", () => {
  const base = { id: "EVT-000001", ticketId: "INQ-3001", type: "STATUS_CHANGED", at: "2026-07-10T09:00:00+09:00", actor: { id: "a", name: "b" }, from: "received", to: "in_progress", note: null };
  assert.ok(Storage.isValidHistoryEvent(base));
  const noFrom = Object.assign({}, base); delete noFrom.from;
  assert.equal(Storage.isValidHistoryEvent(noFrom), false);
  const badType = Object.assign({}, base, { type: "REOPENED" });
  assert.equal(Storage.isValidHistoryEvent(badType), false);
});

/* ── load / save (in-memory storage) ── */

test("load: EC-04 최초 실행(값 없음)은 손상 아님 — seed + 최초 저장", () => {
  const mem = Storage.createMemoryStorage();
  const store = Storage.createStore(mem);
  const res = store.load();
  assert.equal(res.source, "seed");
  assert.equal(res.recovered, false);
  assert.equal(res.tickets.length, 6);
  // R2 즉시 재기록 확인
  assert.notEqual(mem.getItem(KEY), null);
});

test("load: 검증 통과한 저장값은 그대로 사용(source=stored)", () => {
  const mem = Storage.createMemoryStorage();
  mem.setItem(KEY, JSON.stringify(validEnvelope()));
  const store = Storage.createStore(mem);
  const res = store.load();
  assert.equal(res.source, "stored");
  assert.equal(res.recovered, false);
});

test("load: EC-05 JSON.parse 실패는 손상 → seed 복구(recovered=true) + 재기록", () => {
  const mem = Storage.createMemoryStorage();
  mem.setItem(KEY, "{not-json");
  const store = Storage.createStore(mem);
  const res = store.load();
  assert.equal(res.source, "seed");
  assert.equal(res.recovered, true);
  // 재기록으로 다음 로드는 stored 정상
  const res2 = store.load();
  assert.equal(res2.source, "stored");
});

test("load: EC-05 schemaVersion 불일치는 손상 → seed 복구", () => {
  const mem = Storage.createMemoryStorage();
  const env = validEnvelope(); env.schemaVersion = 99;
  mem.setItem(KEY, JSON.stringify(env));
  const store = Storage.createStore(mem);
  const res = store.load();
  assert.equal(res.source, "seed");
  assert.equal(res.recovered, true);
});

test("save: 정상 저장은 true, 재로드 시 동일 tickets", () => {
  const mem = Storage.createMemoryStorage();
  const store = Storage.createStore(mem);
  const tickets = Fixtures.getSeedTickets();
  tickets[0].subject = "변경된 제목";
  assert.equal(store.save(tickets, "2026-07-17T10:00:00+09:00"), true);
  assert.equal(store.load().tickets[0].subject, "변경된 제목");
});

test("save: EC-06 setItem 예외(quota) 는 재시도 없이 false, 크래시 없음", () => {
  const throwing = Storage.createMemoryStorage();
  throwing.setItem = () => { throw new Error("QuotaExceeded"); };
  const store = Storage.createStore(throwing);
  assert.equal(store.save(Fixtures.getSeedTickets(), "2026-07-17T10:00:00+09:00"), false);
  // load 도 seed 로 동작(크래시 금지)
  assert.doesNotThrow(() => store.load());
});
