/* team-reservation-canary/reservation.js
 * 팀 회의실 예약·승인 — 순수 함수 4종 + localStorage adapter 2종
 * SSOT: docs/plan/team-reservation-canary/reservation-approval-spec-BF-1002.md (§2~§7)
 * UMD 패턴(§6.6) — 브라우저: globalThis.TeamReservation / Node: module.exports
 * file:// CORS 안전 — 외부 CDN·fetch·import/export 0건. 순수 함수엔 DOM/localStorage/Date.now 없음.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api; // Node 단위 테스트
  }
  if (root) {
    root.TeamReservation = api; // 브라우저 전역
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var STORAGE_KEY = "team-reservation-canary:v1";
  var SCHEMA_VERSION = 1;

  // ── 결정적 Resource Seed (§3.1, 3건) ─────────────────────
  var RESOURCE_SEED = [
    { id: "res-01", name: "1층 대회의실", capacity: 12 },
    { id: "res-02", name: "2층 소회의실 A", capacity: 4 },
    { id: "res-03", name: "2층 소회의실 B", capacity: 4 },
  ];

  // ── 결정적 Reservation Seed (§3.2, rsv-06 제외 5건) ──────
  var RESERVATION_SEED = [
    { id: "rsv-01", resourceId: "res-01", requesterName: "김도영", startAt: "2026-07-20T01:00:00.000Z", endAt: "2026-07-20T02:00:00.000Z", status: "approved", createdAt: "2026-07-17T00:00:00.000Z", decidedAt: "2026-07-17T01:00:00.000Z", reason: null },
    { id: "rsv-02", resourceId: "res-01", requesterName: "이서준", startAt: "2026-07-20T02:00:00.000Z", endAt: "2026-07-20T03:00:00.000Z", status: "pending", createdAt: "2026-07-17T00:10:00.000Z", decidedAt: null, reason: null },
    { id: "rsv-03", resourceId: "res-01", requesterName: "박하윤", startAt: "2026-07-20T01:30:00.000Z", endAt: "2026-07-20T02:30:00.000Z", status: "rejected", createdAt: "2026-07-17T00:05:00.000Z", decidedAt: "2026-07-17T01:00:00.000Z", reason: "동일 시간대 선접수 건과 중복" },
    { id: "rsv-04", resourceId: "res-02", requesterName: "최지안", startAt: "2026-07-21T05:00:00.000Z", endAt: "2026-07-21T06:00:00.000Z", status: "pending", createdAt: "2026-07-17T00:20:00.000Z", decidedAt: null, reason: null },
    { id: "rsv-05", resourceId: "res-03", requesterName: "정하은", startAt: "2026-07-21T05:00:00.000Z", endAt: "2026-07-21T06:00:00.000Z", status: "approved", createdAt: "2026-07-17T00:15:00.000Z", decidedAt: "2026-07-17T00:30:00.000Z", reason: null },
  ];

  // deep clone (외부 의존성 0건 — JSON round-trip 로 참조 공유 차단)
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function freshSeedState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      resources: clone(RESOURCE_SEED),
      reservations: clone(RESERVATION_SEED),
    };
  }

  // ── 내부 검증 헬퍼 ───────────────────────────────────────
  function parseIsoOrThrow(value, label) {
    if (typeof value !== "string") {
      throw new TypeError(label + " 는 ISO 8601 문자열이어야 합니다 (받은 타입: " + typeof value + ")");
    }
    var t = Date.parse(value);
    if (Number.isNaN(t)) {
      throw new TypeError(label + " 파싱 불가: " + value);
    }
    return t;
  }

  function assertPositiveInterval(startMs, endMs, label) {
    if (startMs >= endMs) {
      throw new RangeError(label + ": startAt 은 endAt 보다 이전이어야 합니다 (0/음수 구간 불가)");
    }
  }

  // ── §6.1 hasTimeOverlap ─────────────────────────────────
  function hasTimeOverlap(aStart, aEnd, bStart, bEnd) {
    var as = parseIsoOrThrow(aStart, "aStart");
    var ae = parseIsoOrThrow(aEnd, "aEnd");
    var bs = parseIsoOrThrow(bStart, "bStart");
    var be = parseIsoOrThrow(bEnd, "bEnd");
    assertPositiveInterval(as, ae, "A 구간");
    assertPositiveInterval(bs, be, "B 구간");
    // 반열린 구간 [start, end) — 경계 맞닿음은 겹침 아님 (§4.1)
    return as < be && bs < ae;
  }

  // ── §6.2 findApprovedConflicts ──────────────────────────
  function assertReservationShape(rsv, label) {
    if (!rsv || typeof rsv !== "object") {
      throw new TypeError(label + " 는 Reservation 객체여야 합니다");
    }
    if (typeof rsv.resourceId !== "string" || typeof rsv.id !== "string") {
      throw new TypeError(label + " 에 id/resourceId 가 없습니다");
    }
    parseIsoOrThrow(rsv.startAt, label + ".startAt");
    parseIsoOrThrow(rsv.endAt, label + ".endAt");
  }

  function findApprovedConflicts(reservation, allReservations) {
    assertReservationShape(reservation, "reservation");
    if (!Array.isArray(allReservations)) {
      throw new TypeError("allReservations 는 배열이어야 합니다");
    }
    var result = [];
    for (var i = 0; i < allReservations.length; i++) {
      var other = allReservations[i];
      if (!other || typeof other !== "object") continue;
      if (other.id === reservation.id) continue; // 자기 자신 제외 (§6.2)
      if (other.status !== "approved") continue; // approved 만 충돌 대상 (§4.2)
      if (other.resourceId !== reservation.resourceId) continue; // 자원별 독립
      if (hasTimeOverlap(reservation.startAt, reservation.endAt, other.startAt, other.endAt)) {
        result.push(other);
      }
    }
    return result;
  }

  // ── §6.3 decideReservation ──────────────────────────────
  function decideReservation(reservation, action, allReservations, decidedAt, reason) {
    if (action !== "approve" && action !== "reject") {
      throw new TypeError("action 은 'approve' 또는 'reject' 여야 합니다 (받음: " + action + ")");
    }
    assertReservationShape(reservation, "reservation");
    parseIsoOrThrow(decidedAt, "decidedAt");

    // 이미 종료 상태 → 상태 불변 + ALREADY_DECIDED (§5.2 #3,#4)
    if (reservation.status !== "pending") {
      return { ok: false, code: "ALREADY_DECIDED", reservation: reservation };
    }

    if (action === "approve") {
      var list = Array.isArray(allReservations) ? allReservations : [];
      var conflicts = findApprovedConflicts(reservation, list);
      if (conflicts.length > 0) {
        // Guard 위반 → pending 유지 + CONFLICT (§5.2 #1)
        return { ok: false, code: "CONFLICT", reservation: reservation };
      }
      var approved = {};
      for (var k in reservation) {
        if (Object.prototype.hasOwnProperty.call(reservation, k)) approved[k] = reservation[k];
      }
      approved.status = "approved";
      approved.decidedAt = decidedAt;
      approved.reason = null;
      return { ok: true, reservation: approved };
    }

    // action === 'reject' — 항상 허용 (§5.2 #2)
    var rejected = {};
    for (var j in reservation) {
      if (Object.prototype.hasOwnProperty.call(reservation, j)) rejected[j] = reservation[j];
    }
    rejected.status = "rejected";
    rejected.decidedAt = decidedAt;
    rejected.reason = reason == null ? "" : String(reason);
    return { ok: true, reservation: rejected };
  }

  // ── §6.4 createReservation ──────────────────────────────
  function createReservation(input, existingReservations, createdAt) {
    if (!input || typeof input !== "object") {
      throw new TypeError("input 은 객체여야 합니다");
    }
    var required = ["id", "resourceId", "requesterName", "startAt", "endAt"];
    for (var i = 0; i < required.length; i++) {
      if (typeof input[required[i]] !== "string" || input[required[i]].length === 0) {
        throw new TypeError("input." + required[i] + " 는 비어있지 않은 문자열이어야 합니다");
      }
    }
    parseIsoOrThrow(createdAt, "createdAt");
    var startMs = parseIsoOrThrow(input.startAt, "input.startAt");
    var endMs = parseIsoOrThrow(input.endAt, "input.endAt");
    assertPositiveInterval(startMs, endMs, "예약 구간"); // startAt >= endAt → RangeError (§2.3)

    var existing = Array.isArray(existingReservations) ? existingReservations : [];
    for (var j = 0; j < existing.length; j++) {
      if (existing[j] && existing[j].id === input.id) {
        throw new Error("id 중복: " + input.id);
      }
    }

    return {
      id: input.id,
      resourceId: input.resourceId,
      requesterName: input.requesterName,
      startAt: input.startAt,
      endAt: input.endAt,
      status: "pending",
      createdAt: createdAt,
      decidedAt: null,
      reason: null,
    };
  }

  // ── §7 localStorage Adapter ─────────────────────────────
  function loadReservationState(storageLike) {
    if (!storageLike || typeof storageLike.getItem !== "function") {
      return freshSeedState();
    }
    var raw;
    try {
      raw = storageLike.getItem(STORAGE_KEY);
    } catch (e) {
      return freshSeedState();
    }
    if (raw == null) {
      return freshSeedState(); // 최초 진입 (TC-LS-01)
    }
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return freshSeedState(); // 손상된 JSON → 폴백 (TC-LS-02)
    }
    if (!parsed || typeof parsed !== "object" || parsed.schemaVersion !== SCHEMA_VERSION ||
        !Array.isArray(parsed.resources) || !Array.isArray(parsed.reservations)) {
      return freshSeedState(); // 버전 불일치/형식 오류 → 완전 대체 (TC-LS-03)
    }
    return parsed;
  }

  function saveReservationState(storageLike, state) {
    if (!state || typeof state !== "object" ||
        typeof state.schemaVersion !== "number" ||
        !Array.isArray(state.resources) || !Array.isArray(state.reservations)) {
      throw new TypeError("state 형식이 §2 스키마에 맞지 않습니다");
    }
    if (!storageLike || typeof storageLike.setItem !== "function") {
      return; // storage 없음 — 조용히 무시 (임시 세션)
    }
    try {
      storageLike.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // 프라이빗 모드/쿼터 초과 등 → 흡수, 크래시 금지 (§7.3 / EC-08)
    }
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    // 매 접근 새 복사본 (참조 공유 방지)
    get SEED() {
      return freshSeedState();
    },
    hasTimeOverlap: hasTimeOverlap,
    findApprovedConflicts: findApprovedConflicts,
    decideReservation: decideReservation,
    createReservation: createReservation,
    loadReservationState: loadReservationState,
    saveReservationState: saveReservationState,
  };
});
