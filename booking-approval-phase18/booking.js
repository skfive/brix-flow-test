/* booking-approval-phase18/booking.js — 팀 예약·승인 도메인 로직 + localStorage adapter
 * BF-1016 · 기획 docs/plan/booking-approval-phase18-BF-1014.md §3~§8 (재해석 없이 그대로 구현)
 * UMD 패턴(§7.6) — 브라우저: globalThis.BookingApproval / Node 단위 테스트: module.exports
 * 순수 함수(§7.5): DOM·localStorage 직접 접근·난수·현재시각 조회 0건. 시각은 호출자가 주입.
 * file:// CORS 안전 — 외부 CDN·fetch·import/export·네트워크 0건.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api; // Node 단위 테스트
  }
  if (root) {
    root.BookingApproval = api; // 브라우저 전역
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var STORAGE_KEY = "booking-approval-phase18:v1";
  var SCHEMA_VERSION = 1;

  /* ── 결정적 seed (기획 §4.1 / §4.2 — 유일한 source of truth) ── */
  var SEED_RESOURCES = [
    { id: "room-01", name: "3층 세미나실", capacity: 10 },
    { id: "room-02", name: "4층 소회의실 A", capacity: 4 },
    { id: "room-03", name: "4층 소회의실 B", capacity: 4 },
  ];

  var SEED_BOOKINGS = [
    { id: "bkg-01", resourceId: "room-01", requesterName: "오세훈", startAt: "2026-07-25T02:00:00.000Z", endAt: "2026-07-25T03:00:00.000Z", status: "approved", createdAt: "2026-07-18T00:00:00.000Z", decidedAt: "2026-07-18T01:00:00.000Z", reason: null },
    { id: "bkg-02", resourceId: "room-01", requesterName: "유지민", startAt: "2026-07-25T03:00:00.000Z", endAt: "2026-07-25T04:00:00.000Z", status: "requested", createdAt: "2026-07-18T00:10:00.000Z", decidedAt: null, reason: null },
    { id: "bkg-03", resourceId: "room-01", requesterName: "배수아", startAt: "2026-07-25T02:30:00.000Z", endAt: "2026-07-25T03:30:00.000Z", status: "rejected", createdAt: "2026-07-18T00:05:00.000Z", decidedAt: "2026-07-18T01:00:00.000Z", reason: "동일 시간대 선접수 건과 중복" },
    { id: "bkg-04", resourceId: "room-02", requesterName: "강민준", startAt: "2026-07-26T06:00:00.000Z", endAt: "2026-07-26T07:00:00.000Z", status: "requested", createdAt: "2026-07-18T00:20:00.000Z", decidedAt: null, reason: null },
    { id: "bkg-05", resourceId: "room-03", requesterName: "문서연", startAt: "2026-07-26T06:00:00.000Z", endAt: "2026-07-26T07:00:00.000Z", status: "approved", createdAt: "2026-07-18T00:15:00.000Z", decidedAt: "2026-07-18T00:30:00.000Z", reason: null },
  ];

  /* ── 내부 유틸 ── */
  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function freshSeedState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      resources: deepClone(SEED_RESOURCES),
      bookings: deepClone(SEED_BOOKINGS),
    };
  }

  /* ISO 8601 문자열을 ms 로 파싱. 문자열 아님/파싱 불가 → TypeError */
  function parseInstant(value, label) {
    if (typeof value !== "string") {
      throw new TypeError(label + " 은(는) ISO 8601 문자열이어야 합니다.");
    }
    var ms = Date.parse(value);
    if (Number.isNaN(ms)) {
      throw new TypeError(label + " 을(를) 시각으로 파싱할 수 없습니다: " + value);
    }
    return ms;
  }

  /* §3.2 필수 필드를 갖춘 Booking 형태인지 최소 검증 */
  function assertBookingShape(booking, label) {
    if (!booking || typeof booking !== "object") {
      throw new TypeError(label + " 은(는) 객체여야 합니다.");
    }
    if (typeof booking.resourceId !== "string" || booking.resourceId.length === 0) {
      throw new TypeError(label + ".resourceId 가 유효하지 않습니다.");
    }
    parseInstant(booking.startAt, label + ".startAt");
    parseInstant(booking.endAt, label + ".endAt");
  }

  /**
   * 두 시간 구간의 겹침 여부(반열린 구간 [start, end), §5.1)
   * @throws {TypeError} 문자열 아님/파싱 불가
   * @throws {RangeError} start >= end (0/음수 구간)
   */
  function hasTimeOverlap(aStart, aEnd, bStart, bEnd) {
    var aS = parseInstant(aStart, "aStart");
    var aE = parseInstant(aEnd, "aEnd");
    var bS = parseInstant(bStart, "bStart");
    var bE = parseInstant(bEnd, "bEnd");
    if (aS >= aE) {
      throw new RangeError("aStart 는 aEnd 보다 앞서야 합니다.");
    }
    if (bS >= bE) {
      throw new RangeError("bStart 는 bEnd 보다 앞서야 합니다.");
    }
    return aS < bE && bS < aE;
  }

  /**
   * 주어진 예약과 충돌하는(§5.2) 기존 approved 예약 목록 반환.
   * 자기 자신·다른 자원·requested/rejected 는 제외. 순서는 allBookings 순서 유지.
   */
  function findApprovedConflicts(booking, allBookings) {
    assertBookingShape(booking, "booking");
    if (!Array.isArray(allBookings)) {
      throw new TypeError("allBookings 는 배열이어야 합니다.");
    }
    var result = [];
    for (var i = 0; i < allBookings.length; i++) {
      var other = allBookings[i];
      if (!other || typeof other !== "object") {
        throw new TypeError("allBookings[" + i + "] 이 유효한 예약이 아닙니다.");
      }
      if (other.id === booking.id) continue;
      if (other.status !== "approved") continue;
      if (other.resourceId !== booking.resourceId) continue;
      if (hasTimeOverlap(booking.startAt, booking.endAt, other.startAt, other.endAt)) {
        result.push(other);
      }
    }
    return result;
  }

  /**
   * 예약 상태 전이(§6). 입력을 변경하지 않고 새 객체 반환(불변).
   * @returns {{ok:true,booking}|{ok:false,code:'CONFLICT'|'ALREADY_DECIDED',booking}}
   * @throws {TypeError} action 이 approve|reject 아님 / booking·decidedAt 형식 invalid
   */
  function decideBooking(booking, action, allBookings, decidedAt, reason) {
    if (action !== "approve" && action !== "reject") {
      throw new TypeError("action 은 'approve' 또는 'reject' 여야 합니다: " + action);
    }
    assertBookingShape(booking, "booking");
    parseInstant(decidedAt, "decidedAt");

    // 종료 상태(approved/rejected)는 전이 불가 — 상태 불변
    if (booking.status !== "requested") {
      return { ok: false, code: "ALREADY_DECIDED", booking: shallowClone(booking) };
    }

    if (action === "approve") {
      var conflicts = findApprovedConflicts(booking, Array.isArray(allBookings) ? allBookings : []);
      if (conflicts.length > 0) {
        return { ok: false, code: "CONFLICT", booking: shallowClone(booking) };
      }
      var approved = shallowClone(booking);
      approved.status = "approved";
      approved.decidedAt = decidedAt;
      approved.reason = null;
      return { ok: true, booking: approved };
    }

    // action === 'reject'
    var rejected = shallowClone(booking);
    rejected.status = "rejected";
    rejected.decidedAt = decidedAt;
    rejected.reason = reason == null ? "" : String(reason);
    return { ok: true, booking: rejected };
  }

  function shallowClone(obj) {
    var copy = {};
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) copy[k] = obj[k];
    }
    return copy;
  }

  /**
   * 신규 예약 요청(requested) 생성. §3.2 스키마 검증 통과해야 생성.
   * @throws {TypeError} 필드 누락/타입 불일치 (공백만 있는 requesterName 포함, EC-11)
   * @throws {RangeError} startAt >= endAt (§3.3)
   * @throws {Error} id 중복
   */
  function createBooking(input, existingBookings, createdAt) {
    if (!input || typeof input !== "object") {
      throw new TypeError("input 은 객체여야 합니다.");
    }
    if (typeof input.id !== "string" || input.id.length === 0) {
      throw new TypeError("input.id 가 유효하지 않습니다.");
    }
    if (typeof input.resourceId !== "string" || input.resourceId.length === 0) {
      throw new TypeError("input.resourceId 가 유효하지 않습니다.");
    }
    if (typeof input.requesterName !== "string" || input.requesterName.trim().length === 0) {
      throw new TypeError("input.requesterName 은 1자 이상이어야 합니다.");
    }
    var startMs = parseInstant(input.startAt, "input.startAt");
    var endMs = parseInstant(input.endAt, "input.endAt");
    parseInstant(createdAt, "createdAt");
    if (startMs >= endMs) {
      throw new RangeError("startAt 은 endAt 보다 앞서야 합니다.");
    }
    var existing = Array.isArray(existingBookings) ? existingBookings : [];
    for (var i = 0; i < existing.length; i++) {
      if (existing[i] && existing[i].id === input.id) {
        throw new Error("id 가 이미 존재합니다: " + input.id);
      }
    }
    return {
      id: input.id,
      resourceId: input.resourceId,
      requesterName: input.requesterName.trim(),
      startAt: input.startAt,
      endAt: input.endAt,
      status: "requested",
      createdAt: createdAt,
      decidedAt: null,
      reason: null,
    };
  }

  /* ── localStorage adapter (§8) — 부수효과 계층, 순수 함수와 분리 ── */

  /**
   * storage 에서 상태를 읽는다. 없음/파싱 실패/schemaVersion 불일치 시 §4 seed 반환(크래시 금지).
   */
  function loadBookingState(storageLike) {
    var raw = null;
    try {
      raw = storageLike && typeof storageLike.getItem === "function"
        ? storageLike.getItem(STORAGE_KEY)
        : null;
    } catch (e) {
      return freshSeedState();
    }
    if (raw == null) {
      return freshSeedState();
    }
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return freshSeedState();
    }
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION ||
        !Array.isArray(parsed.resources) || !Array.isArray(parsed.bookings)) {
      return freshSeedState();
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      resources: parsed.resources,
      bookings: parsed.bookings,
    };
  }

  /**
   * 상태를 storage 에 저장. state 형식 검증 후 setItem. setItem 예외는 흡수(§8.3, EC-08).
   * @throws {TypeError} state 형식이 §3 스키마에 맞지 않으면
   */
  function saveBookingState(storageLike, state) {
    if (!state || typeof state !== "object" ||
        state.schemaVersion !== SCHEMA_VERSION ||
        !Array.isArray(state.resources) || !Array.isArray(state.bookings)) {
      throw new TypeError("state 형식이 스키마에 맞지 않습니다.");
    }
    try {
      if (storageLike && typeof storageLike.setItem === "function") {
        storageLike.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (e) {
      // 프라이빗 모드 등에서 setItem 이 throw — 흡수하고 크래시하지 않음(§8.3)
    }
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    hasTimeOverlap: hasTimeOverlap,
    findApprovedConflicts: findApprovedConflicts,
    decideBooking: decideBooking,
    createBooking: createBooking,
    loadBookingState: loadBookingState,
    saveBookingState: saveBookingState,
    getSeedState: freshSeedState,
  };
});
