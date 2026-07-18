/* tests/booking-approval-phase18-BF1016.test.js — 팀 예약·승인 서비스 단위 테스트 (BF-1016)
 * 기획 docs/plan/booking-approval-phase18-BF-1014.md §10.3 필수 테스트 케이스를 1:1 구현.
 * 실행: node --test tests/booking-approval-phase18-BF1016.test.js
 * 로딩: 루트 package.json 이 "type":"module" 이므로 ESM 테스트 + new Function 으로 UMD 로드
 *       (team-reservation-canary 테스트 관례 계승 — booking.js 는 CommonJS-UMD)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "booking-approval-phase18");
const BOOKING_JS = readFileSync(join(MODULE_DIR, "booking.js"), "utf8");

// UMD(booking.js)를 테스트와 동일 realm 에서 로드해 API 추출.
// new Function 실행 → 반환 객체/배열이 테스트 realm 소속 → deepStrictEqual prototype 일치.
function loadApi() {
  const module = { exports: {} };
  const fn = new Function("module", "globalThis", BOOKING_JS);
  fn(module, globalThis);
  const api = module.exports;
  assert.ok(api && api.decideBooking, "booking.js 가 BookingApproval API 를 노출하지 않음");
  return api;
}

const {
  hasTimeOverlap,
  findApprovedConflicts,
  decideBooking,
  createBooking,
  loadBookingState,
  saveBookingState,
} = loadApi();

/* 기획 §4.2 seed 5건 (테스트 자료용 리터럴 — 모듈 seed 와 동일해야 함) */
const SEED_BOOKINGS = [
  { id: "bkg-01", resourceId: "room-01", requesterName: "오세훈", startAt: "2026-07-25T02:00:00.000Z", endAt: "2026-07-25T03:00:00.000Z", status: "approved", createdAt: "2026-07-18T00:00:00.000Z", decidedAt: "2026-07-18T01:00:00.000Z", reason: null },
  { id: "bkg-02", resourceId: "room-01", requesterName: "유지민", startAt: "2026-07-25T03:00:00.000Z", endAt: "2026-07-25T04:00:00.000Z", status: "requested", createdAt: "2026-07-18T00:10:00.000Z", decidedAt: null, reason: null },
  { id: "bkg-03", resourceId: "room-01", requesterName: "배수아", startAt: "2026-07-25T02:30:00.000Z", endAt: "2026-07-25T03:30:00.000Z", status: "rejected", createdAt: "2026-07-18T00:05:00.000Z", decidedAt: "2026-07-18T01:00:00.000Z", reason: "동일 시간대 선접수 건과 중복" },
  { id: "bkg-04", resourceId: "room-02", requesterName: "강민준", startAt: "2026-07-26T06:00:00.000Z", endAt: "2026-07-26T07:00:00.000Z", status: "requested", createdAt: "2026-07-18T00:20:00.000Z", decidedAt: null, reason: null },
  { id: "bkg-05", resourceId: "room-03", requesterName: "문서연", startAt: "2026-07-26T06:00:00.000Z", endAt: "2026-07-26T07:00:00.000Z", status: "approved", createdAt: "2026-07-18T00:15:00.000Z", decidedAt: "2026-07-18T00:30:00.000Z", reason: null },
];

/* in-memory localStorage mock */
function makeStorage(initial) {
  const store = Object.assign({}, initial);
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
  };
}

// ─────────────────────────────────────────── hasTimeOverlap
describe("hasTimeOverlap", () => {
  const A0 = "2026-07-25T02:00:00.000Z";
  const A1 = "2026-07-25T03:00:00.000Z";

  it("TC-OV-01: 경계만 맞닿으면 겹침 아님", () => {
    assert.strictEqual(
      hasTimeOverlap(A0, A1, "2026-07-25T03:00:00.000Z", "2026-07-25T04:00:00.000Z"),
      false
    );
  });
  it("TC-OV-02: 부분 겹침", () => {
    assert.strictEqual(
      hasTimeOverlap(A0, A1, "2026-07-25T02:30:00.000Z", "2026-07-25T03:30:00.000Z"),
      true
    );
  });
  it("TC-OV-03: 완전 포함", () => {
    assert.strictEqual(
      hasTimeOverlap(A0, "2026-07-25T04:00:00.000Z", "2026-07-25T02:30:00.000Z", "2026-07-25T03:00:00.000Z"),
      true
    );
  });
  it("TC-OV-04: 완전 동일", () => {
    assert.strictEqual(hasTimeOverlap(A0, A1, A0, A1), true);
  });
  it("TC-OV-05: 완전 분리", () => {
    assert.strictEqual(
      hasTimeOverlap(A0, A1, "2026-07-25T05:00:00.000Z", "2026-07-25T06:00:00.000Z"),
      false
    );
  });
  it("TC-OV-06: 역전 구간이면 RangeError", () => {
    assert.throws(
      () => hasTimeOverlap(A1, A0, "2026-07-25T05:00:00.000Z", "2026-07-25T06:00:00.000Z"),
      RangeError
    );
  });
  it("문자열이 아니거나 파싱 불가하면 TypeError", () => {
    assert.throws(() => hasTimeOverlap(42, A1, A0, A1), TypeError);
    assert.throws(() => hasTimeOverlap("not-a-date", A1, A0, A1), TypeError);
  });
});

// ─────────────────────────────────────────── findApprovedConflicts
describe("findApprovedConflicts", () => {
  it("TC-FC-01: 겹치는 approved 만 반환, rejected 제외", () => {
    const target = { id: "bkg-new", resourceId: "room-01", requesterName: "신규", startAt: "2026-07-25T02:30:00.000Z", endAt: "2026-07-25T03:30:00.000Z", status: "requested", createdAt: "2026-07-18T00:30:00.000Z", decidedAt: null, reason: null };
    const conflicts = findApprovedConflicts(target, SEED_BOOKINGS);
    assert.deepStrictEqual(conflicts.map((b) => b.id), ["bkg-01"]);
  });
  it("TC-FC-02: 자원이 다르면 겹쳐도 대상 아님, 같은 자원 requested 도 제외", () => {
    const target = { id: "bkg-new", resourceId: "room-02", requesterName: "신규", startAt: "2026-07-26T06:00:00.000Z", endAt: "2026-07-26T07:00:00.000Z", status: "requested", createdAt: "2026-07-18T00:30:00.000Z", decidedAt: null, reason: null };
    assert.deepStrictEqual(findApprovedConflicts(target, SEED_BOOKINGS), []);
  });
  it("TC-FC-03: 자기 자신은 결과에서 제외", () => {
    const conflicts = findApprovedConflicts(SEED_BOOKINGS[0], SEED_BOOKINGS);
    assert.strictEqual(conflicts.some((b) => b.id === "bkg-01"), false);
  });
  it("EC-10: 여러 approved 와 동시에 겹치면 전부 반환", () => {
    const extraApproved = { id: "bkg-06", resourceId: "room-01", requesterName: "추가", startAt: "2026-07-25T02:15:00.000Z", endAt: "2026-07-25T02:45:00.000Z", status: "approved", createdAt: "2026-07-18T00:00:00.000Z", decidedAt: "2026-07-18T01:00:00.000Z", reason: null };
    const all = SEED_BOOKINGS.concat([extraApproved]);
    const target = { id: "bkg-new", resourceId: "room-01", requesterName: "신규", startAt: "2026-07-25T02:20:00.000Z", endAt: "2026-07-25T02:50:00.000Z", status: "requested", createdAt: "2026-07-18T00:30:00.000Z", decidedAt: null, reason: null };
    const conflicts = findApprovedConflicts(target, all);
    assert.deepStrictEqual(conflicts.map((b) => b.id).sort(), ["bkg-01", "bkg-06"]);
  });
  it("TypeError: booking/allBookings 형식이 스키마에 맞지 않으면", () => {
    assert.throws(() => findApprovedConflicts({}, SEED_BOOKINGS), TypeError);
    assert.throws(() => findApprovedConflicts(SEED_BOOKINGS[0], "nope"), TypeError);
  });
});

// ─────────────────────────────────────────── decideBooking
describe("decideBooking", () => {
  it("TC-DB-01: 경계만 닿는 approved 는 충돌 아님 → 승인 성공", () => {
    const r = decideBooking(SEED_BOOKINGS[1], "approve", SEED_BOOKINGS, "2026-07-18T02:00:00.000Z");
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.booking.status, "approved");
    assert.strictEqual(r.booking.decidedAt, "2026-07-18T02:00:00.000Z");
    assert.strictEqual(r.booking.reason, null);
  });
  it("TC-DB-02: 이미 승인된 예약과 겹치면 CONFLICT, 상태 불변", () => {
    const target = { id: "bkg-x", resourceId: "room-01", requesterName: "신규", startAt: "2026-07-25T02:00:00.000Z", endAt: "2026-07-25T02:30:00.000Z", status: "requested", createdAt: "2026-07-18T00:30:00.000Z", decidedAt: null, reason: null };
    const r = decideBooking(target, "approve", SEED_BOOKINGS, "2026-07-18T02:00:00.000Z");
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.code, "CONFLICT");
    assert.strictEqual(r.booking.status, "requested");
  });
  it("TC-DB-03: reject 성공 시 reason 기록", () => {
    const r = decideBooking(SEED_BOOKINGS[1], "reject", SEED_BOOKINGS, "2026-07-18T02:00:00.000Z", "회의실 정비");
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.booking.status, "rejected");
    assert.strictEqual(r.booking.reason, "회의실 정비");
    assert.strictEqual(r.booking.decidedAt, "2026-07-18T02:00:00.000Z");
  });
  it("TC-DB-03b: reason 미제공 시 빈 문자열", () => {
    const r = decideBooking(SEED_BOOKINGS[1], "reject", SEED_BOOKINGS, "2026-07-18T02:00:00.000Z");
    assert.strictEqual(r.booking.reason, "");
  });
  it("TC-DB-04: 이미 approved 면 ALREADY_DECIDED", () => {
    const r = decideBooking(SEED_BOOKINGS[0], "approve", SEED_BOOKINGS, "2026-07-18T02:00:00.000Z");
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.code, "ALREADY_DECIDED");
  });
  it("TC-DB-05: 허용 안 된 action 은 TypeError", () => {
    assert.throws(() => decideBooking(SEED_BOOKINGS[1], "cancel", SEED_BOOKINGS, "2026-07-18T02:00:00.000Z"), TypeError);
  });
  it("입력 booking 을 변경하지 않는다(불변)", () => {
    const before = JSON.stringify(SEED_BOOKINGS[1]);
    decideBooking(SEED_BOOKINGS[1], "approve", SEED_BOOKINGS, "2026-07-18T02:00:00.000Z");
    assert.strictEqual(JSON.stringify(SEED_BOOKINGS[1]), before);
  });
});

// ─────────────────────────────────────────── createBooking
describe("createBooking", () => {
  const valid = { id: "bkg-90", resourceId: "room-02", requesterName: "한도윤", startAt: "2026-07-27T09:00:00.000Z", endAt: "2026-07-27T10:00:00.000Z" };

  it("TC-CB-01: 유효 입력 → requested/decidedAt null/reason null", () => {
    const b = createBooking(valid, SEED_BOOKINGS, "2026-07-18T03:00:00.000Z");
    assert.strictEqual(b.status, "requested");
    assert.strictEqual(b.decidedAt, null);
    assert.strictEqual(b.reason, null);
    assert.strictEqual(b.createdAt, "2026-07-18T03:00:00.000Z");
    assert.strictEqual(b.requesterName, "한도윤");
  });
  it("TC-CB-02: id 중복이면 Error", () => {
    const dup = Object.assign({}, valid, { id: "bkg-01" });
    assert.throws(
      () => createBooking(dup, SEED_BOOKINGS, "2026-07-18T03:00:00.000Z"),
      (e) => e instanceof Error && !(e instanceof TypeError) && !(e instanceof RangeError)
    );
  });
  it("TC-CB-03: resourceId 누락이면 TypeError", () => {
    const bad = { id: "bkg-91", requesterName: "한도윤", startAt: "2026-07-27T09:00:00.000Z", endAt: "2026-07-27T10:00:00.000Z" };
    assert.throws(() => createBooking(bad, SEED_BOOKINGS, "2026-07-18T03:00:00.000Z"), TypeError);
  });
  it("TC-CB-04: startAt === endAt 이면 RangeError", () => {
    const bad = Object.assign({}, valid, { id: "bkg-06", startAt: "2026-07-27T09:00:00.000Z", endAt: "2026-07-27T09:00:00.000Z" });
    assert.throws(() => createBooking(bad, SEED_BOOKINGS, "2026-07-18T03:00:00.000Z"), RangeError);
  });
  it("EC-11: 공백만 있는 requesterName 은 TypeError", () => {
    const bad = Object.assign({}, valid, { id: "bkg-92", requesterName: "   " });
    assert.throws(() => createBooking(bad, SEED_BOOKINGS, "2026-07-18T03:00:00.000Z"), TypeError);
  });
});

// ─────────────────────────────────────────── load/save adapter
describe("loadBookingState / saveBookingState", () => {
  const KEY = "booking-approval-phase18:v1";

  it("TC-LS-01: 저장값 없으면 seed 반환(자원 3·예약 5)", () => {
    const state = loadBookingState(makeStorage());
    assert.strictEqual(state.schemaVersion, 1);
    assert.strictEqual(state.resources.length, 3);
    assert.strictEqual(state.bookings.length, 5);
    assert.strictEqual(state.bookings[0].id, "bkg-01");
  });
  it("TC-LS-02: 손상된 JSON 이면 예외 없이 seed 폴백", () => {
    const state = loadBookingState(makeStorage({ [KEY]: "{not-json" }));
    assert.strictEqual(state.bookings.length, 5);
  });
  it("TC-LS-03: schemaVersion 불일치면 seed 로 대체", () => {
    const stored = JSON.stringify({ schemaVersion: 2, resources: [], bookings: [] });
    const state = loadBookingState(makeStorage({ [KEY]: stored }));
    assert.strictEqual(state.schemaVersion, 1);
    assert.strictEqual(state.bookings.length, 5);
  });
  it("TC-LS-04: save 후 load round-trip 동일", () => {
    const storage = makeStorage();
    const next = loadBookingState(storage);
    next.bookings[1] = Object.assign({}, next.bookings[1], { status: "approved", decidedAt: "2026-07-18T05:00:00.000Z" });
    saveBookingState(storage, next);
    const loaded = loadBookingState(storage);
    assert.deepStrictEqual(loaded, next);
  });
  it("EC-08: setItem 이 throw 해도 크래시하지 않음", () => {
    const storage = { getItem() { return null; }, setItem() { throw new Error("private mode"); } };
    const state = loadBookingState(storage);
    assert.doesNotThrow(() => saveBookingState(storage, state));
  });
  it("saveBookingState: state 형식이 잘못되면 TypeError", () => {
    assert.throws(() => saveBookingState(makeStorage(), { schemaVersion: 1 }), TypeError);
  });
  it("loadBookingState 는 매번 독립 복제본을 반환(seed 공유 오염 방지)", () => {
    const s1 = loadBookingState(makeStorage());
    s1.bookings[0].status = "rejected";
    const s2 = loadBookingState(makeStorage());
    assert.strictEqual(s2.bookings[0].status, "approved");
  });
});
