/* delivery-exceptions-canary/tests/fixtures.test.js — 결정적 fixture·라벨 매핑 단위 테스트
 * BF-1033 · 기획 §3(데이터 모델)·§7(fixture 스펙) / 디자인 §6.2
 * vanilla-static — node --test 로만 실행, DOM 미실행
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Fixtures = require("../fixtures.js");

const STATUS_ENUM = ["open", "investigating", "on_hold", "resolved"];
const CAUSE_ENUM = [
  "address_unreachable",
  "recipient_absent",
  "package_damaged",
  "customs_hold",
  "weather_delay",
];

test("SCHEMA_VERSION 은 1 (기획 §6.1)", () => {
  assert.equal(Fixtures.SCHEMA_VERSION, 1);
});

test("fixture 는 7건이며 매 호출 동일 값 (결정적 — 기획 §7.1)", () => {
  const a = Fixtures.getExceptions();
  const b = Fixtures.getExceptions();
  assert.equal(a.length, 7);
  assert.deepEqual(a, b);
});

test("getExceptions 는 방어적 복제본 반환 (원본 불변)", () => {
  const a = Fixtures.getExceptions();
  a[0].recipientName = "변조";
  const b = Fixtures.getExceptions();
  assert.notEqual(b[0].recipientName, "변조");
});

test("모든 fixture 필수 필드·enum·순서 준수 (기획 §3.1·§7.2)", () => {
  const list = Fixtures.getExceptions();
  const ids = list.map((e) => e.id);
  assert.deepEqual(ids, [
    "EXC-5001",
    "EXC-5002",
    "EXC-5003",
    "EXC-5004",
    "EXC-5005",
    "EXC-5006",
    "EXC-5007",
  ]);
  for (const e of list) {
    assert.match(e.id, /^EXC-\d{4}$/);
    assert.match(e.orderId, /^ORD-\d{6}$/);
    assert.ok(typeof e.recipientName === "string" && e.recipientName.length > 0);
    assert.ok(typeof e.deliveryAddress === "string" && e.deliveryAddress.length > 0);
    assert.ok(CAUSE_ENUM.includes(e.cause), "cause enum: " + e.cause);
    assert.ok(STATUS_ENUM.includes(e.status), "status enum: " + e.status);
    assert.match(e.occurredAt, /\+09:00$/);
    assert.match(e.updatedAt, /\+09:00$/);
    assert.ok(e.occurredAt <= e.updatedAt, "occurredAt <= updatedAt: " + e.id);
    assert.ok(e.description.length >= 1 && e.description.length <= 200);
  }
});

test("status 4종·cause 5종 전부 최소 1건 커버 (기획 §7.1)", () => {
  const list = Fixtures.getExceptions();
  for (const s of STATUS_ENUM) {
    assert.ok(list.some((e) => e.status === s), "status 미커버: " + s);
  }
  for (const c of CAUSE_ENUM) {
    assert.ok(list.some((e) => e.cause === c), "cause 미커버: " + c);
  }
});

test("statusLabel / causeLabel 한글 매핑 (디자인 §6.1·§6.2)", () => {
  assert.equal(Fixtures.statusLabel("open"), "접수");
  assert.equal(Fixtures.statusLabel("investigating"), "조사중");
  assert.equal(Fixtures.statusLabel("on_hold"), "보류");
  assert.equal(Fixtures.statusLabel("resolved"), "해결");
  assert.equal(Fixtures.causeLabel("address_unreachable"), "배송지 접근 불가");
  assert.equal(Fixtures.causeLabel("recipient_absent"), "수취인 부재");
  assert.equal(Fixtures.causeLabel("package_damaged"), "상품 파손");
  assert.equal(Fixtures.causeLabel("customs_hold"), "통관 보류");
  assert.equal(Fixtures.causeLabel("weather_delay"), "기상 지연");
});

test("미지의 라벨 키는 원본 문자열로 폴백 (크래시 금지)", () => {
  assert.equal(Fixtures.statusLabel("unknown"), "unknown");
  assert.equal(Fixtures.causeLabel("unknown"), "unknown");
});
