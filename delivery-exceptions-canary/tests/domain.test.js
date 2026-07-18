/* delivery-exceptions-canary/tests/domain.test.js — 필터·요약·메모 검증·시각 포맷 순수 함수 단위 테스트
 * BF-1033 · 기획 §4(상태 필터)·§6.2(입력 규칙)·§5.2(D7/D8) / 디자인 §5.1·§5.4·§6.3
 * vanilla-static — node --test 로만 실행, DOM 미실행
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Domain = require("../domain.js");
const Fixtures = require("../fixtures.js");

const LIST = Fixtures.getExceptions();

/* ── filterByStatus (기획 §4.2 F0~F4) ── */

test("filter 'all' 은 전체 7건 (기획 §4.2 F0)", () => {
  const r = Domain.filterByStatus(LIST, "all");
  assert.equal(r.length, 7);
});

test("filter 'open' 은 접수 2건만 (기획 §4.2 F1)", () => {
  const r = Domain.filterByStatus(LIST, "open");
  assert.equal(r.length, 2);
  assert.ok(r.every((e) => e.status === "open"));
});

test("filter 'resolved' 은 해결 2건만", () => {
  const r = Domain.filterByStatus(LIST, "resolved");
  assert.equal(r.length, 2);
  assert.ok(r.every((e) => e.status === "resolved"));
});

test("filter 는 fixture 정의 순서를 유지 (기획 §4.2 · §3.3)", () => {
  const r = Domain.filterByStatus(LIST, "investigating").map((e) => e.id);
  assert.deepEqual(r, ["EXC-5002", "EXC-5007"]);
});

test("알 수 없는 필터 값은 빈 배열 (방어적 — EC-02)", () => {
  assert.deepEqual(Domain.filterByStatus(LIST, "nope"), []);
});

test("filter 는 원본 배열을 변경하지 않음 (부분집합 뷰 — 기획 §4.2)", () => {
  const before = LIST.length;
  Domain.filterByStatus(LIST, "open");
  assert.equal(LIST.length, before);
});

/* ── countByStatus / summarize (디자인 §5.1·§6.3) ── */

test("countByStatus 는 all + 상태별 건수 (디자인 §5.1)", () => {
  const c = Domain.countByStatus(LIST);
  assert.equal(c.all, 7);
  assert.equal(c.open, 2);
  assert.equal(c.investigating, 2);
  assert.equal(c.on_hold, 1);
  assert.equal(c.resolved, 2);
});

test("summarize 는 총·미해결·해결 집계 (디자인 §6.3)", () => {
  const s = Domain.summarize(LIST);
  assert.equal(s.total, 7);
  assert.equal(s.resolved, 2);
  assert.equal(s.unresolved, 5); // open+investigating+on_hold
});

/* ── validateMemo (기획 §6.2 / EC-05·EC-08) ── */

test("정상 1~300자는 save 액션 (기획 §6.2)", () => {
  const r = Domain.validateMemo("재배송 예정");
  assert.equal(r.ok, true);
  assert.equal(r.action, "save");
  assert.equal(r.trimmed, "재배송 예정");
  assert.equal(r.length, 6);
  assert.equal(r.error, null);
});

test("앞뒤 공백은 trim 후 저장 (기획 §6.2 trim 기준)", () => {
  const r = Domain.validateMemo("  메모  ");
  assert.equal(r.action, "save");
  assert.equal(r.trimmed, "메모");
  assert.equal(r.length, 2);
});

test("빈 문자열/공백만은 delete 액션 (EC-08 — 오류 아님)", () => {
  for (const v of ["", "   ", "\n\t "]) {
    const r = Domain.validateMemo(v);
    assert.equal(r.ok, true);
    assert.equal(r.action, "delete");
    assert.equal(r.length, 0);
    assert.equal(r.error, null);
  }
});

test("300자 경계는 저장 허용", () => {
  const r = Domain.validateMemo("가".repeat(300));
  assert.equal(r.action, "save");
  assert.equal(r.length, 300);
});

test("300자 초과는 reject + 오류 문구, 입력값 유지 (EC-05)", () => {
  const text = "가".repeat(301);
  const r = Domain.validateMemo(text);
  assert.equal(r.ok, false);
  assert.equal(r.action, "reject");
  assert.equal(r.length, 301);
  assert.match(r.error, /300자 이하/);
  assert.match(r.error, /301/);
  assert.equal(r.trimmed, text); // 자르지 않음
});

/* ── formatKst (기획 §5.2 D7/D8 / 디자인 §5.3) ── */

test("ISO8601 +09:00 을 'YYYY-MM-DD HH:mm (KST)' 로 포맷", () => {
  assert.equal(Domain.formatKst("2026-07-10T09:15:00+09:00"), "2026-07-10 09:15 (KST)");
  assert.equal(Domain.formatKst("2026-07-11T14:30:00+09:00"), "2026-07-11 14:30 (KST)");
});

test("형식 불명 값은 원본 그대로 반환 (크래시 금지)", () => {
  assert.equal(Domain.formatKst("bad-date"), "bad-date");
  assert.equal(Domain.formatKst(""), "");
  assert.equal(Domain.formatKst(null), "");
});
