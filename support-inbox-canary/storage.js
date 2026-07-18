/* support-inbox-canary/storage.js — localStorage 영속화 어댑터 (버전·검증·손상 복구)
 * BF-1007 · 기획 docs/planning/support-inbox-canary-BF-1000.md §8 (그대로 채택 — 재해석 금지)
 * UMD 패턴 (tetris/storage.js 관례 계승) — 브라우저: globalThis.SupportInboxStorage / Node: module.exports
 * file:// CORS 안전 — 외부 CDN·fetch·import/export 0건. localStorage 접근은 try/catch 로 방어.
 */
(function (root, factory) {
  "use strict";
  var api = factory(
    typeof module === "object" && module && module.exports
      ? require("./fixtures.js")
      : (root && root.SupportInboxFixtures)
  );
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SupportInboxStorage = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Fixtures) {
  "use strict";

  var STORAGE_KEY = "support-inbox-canary:state";
  var SCHEMA_VERSION = Fixtures.SCHEMA_VERSION; // 기획 §8.1 — 현재 1
  var SEED_VERSION = Fixtures.SEED_VERSION;

  var STATUS_ENUM = ["received", "in_progress", "on_hold", "resolved"];
  var EVENT_TYPE_ENUM = ["STATUS_CHANGED", "ASSIGNEE_CHANGED"];

  /* ─── Web Storage API 호환 in-memory adapter (테스트·저장 불가 환경 폴백, 기획 §8.3 R3) ─── */
  function createMemoryStorage() {
    var map = new Map();
    return {
      get length() { return map.size; },
      getItem: function (key) { return map.has(key) ? map.get(key) : null; },
      setItem: function (key, value) { map.set(key, String(value)); },
      removeItem: function (key) { map.delete(key); },
      clear: function () { map.clear(); },
      key: function (i) { var ks = Array.from(map.keys()); return i >= 0 && i < ks.length ? ks[i] : null; }
    };
  }

  /* ─── 검증 순수 함수 (기획 §8.2 V3~V6) — Node 단위 테스트 대상 ─── */

  function isPlainObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  /** HistoryEvent 필수 필드·타입 검증 (기획 §6.1) */
  function isValidHistoryEvent(e) {
    if (!isPlainObject(e)) return false;
    if (typeof e.id !== "string" || typeof e.ticketId !== "string") return false;
    if (EVENT_TYPE_ENUM.indexOf(e.type) === -1) return false;
    if (typeof e.at !== "string") return false;
    if (!isPlainObject(e.actor) || typeof e.actor.id !== "string" || typeof e.actor.name !== "string") return false;
    // from/to 는 string | null (필드 존재 필수)
    if (!("from" in e) || !("to" in e)) return false;
    if (e.from !== null && typeof e.from !== "string") return false;
    if (e.to !== null && typeof e.to !== "string") return false;
    if (!("note" in e)) return false;
    if (e.note !== null && typeof e.note !== "string") return false;
    return true;
  }

  /** Inquiry 필수 필드·타입·enum 검증 (기획 §3.1 · §8.2 V5) */
  function isValidInquiry(t) {
    if (!isPlainObject(t)) return false;
    if (typeof t.id !== "string" || typeof t.subject !== "string") return false;
    if (!isPlainObject(t.requester) || typeof t.requester.name !== "string" || typeof t.requester.email !== "string") return false;
    if (STATUS_ENUM.indexOf(t.status) === -1) return false;
    // assignee: {id,name} | null (필드 존재 필수)
    if (!("assignee" in t)) return false;
    if (t.assignee !== null && (!isPlainObject(t.assignee) || typeof t.assignee.id !== "string" || typeof t.assignee.name !== "string")) return false;
    if (typeof t.createdAt !== "string" || typeof t.updatedAt !== "string") return false;
    if (!Array.isArray(t.history)) return false;
    for (var i = 0; i < t.history.length; i++) {
      if (!isValidHistoryEvent(t.history[i])) return false;
    }
    return true;
  }

  /**
   * status ↔ history 일관성 검증 (기획 §6.3 · §8.2 V6).
   * - 마지막 STATUS_CHANGED 이벤트가 있으면 status 는 그 to 와 일치해야 한다.
   * - STATUS_CHANGED 이벤트가 하나도 없으면 status 는 'received' 여야 한다
   *   (history 가 비었거나 ASSIGNEE_CHANGED 만 있는 경우 포함).
   * @returns {boolean}
   */
  function isStatusHistoryConsistent(t) {
    var lastStatusTo = null;
    var found = false;
    for (var i = 0; i < t.history.length; i++) {
      if (t.history[i].type === "STATUS_CHANGED") {
        lastStatusTo = t.history[i].to;
        found = true;
      }
    }
    if (!found) return t.status === "received"; // EC-08 방지
    return t.status === lastStatusTo;
  }

  /** envelope 전체 검증 (기획 §8.2 V3~V6). V1/V2 는 loadTickets 에서 처리. */
  function isValidEnvelope(obj) {
    if (!isPlainObject(obj)) return false;                              // V3
    if (obj.schemaVersion !== SCHEMA_VERSION) return false;             // V4 (정확히 일치)
    if (!Array.isArray(obj.tickets)) return false;                      // V5
    for (var i = 0; i < obj.tickets.length; i++) {
      if (!isValidInquiry(obj.tickets[i])) return false;               // V5
      if (!isStatusHistoryConsistent(obj.tickets[i])) return false;    // V6
    }
    return true;
  }

  /* ─── envelope 조립 ─── */
  function buildEnvelope(tickets, updatedAt) {
    return {
      schemaVersion: SCHEMA_VERSION,
      seedVersion: SEED_VERSION,
      updatedAt: updatedAt || null,
      tickets: tickets
    };
  }

  /* ─── Store 팩토리 ─── */

  /**
   * @param {Storage} [storage] Web Storage 인스턴스. 미지정 시 브라우저 localStorage,
   *                            접근 불가 환경이면 in-memory 폴백(기획 §8.3 R3).
   */
  function createStore(storage) {
    var usingMemoryFallback = false;
    if (!storage) {
      try {
        if (typeof globalThis !== "undefined" && globalThis.localStorage) {
          // 접근 자체가 예외를 던지는 환경(일부 프라이빗 모드) 방어
          globalThis.localStorage.getItem(STORAGE_KEY);
          storage = globalThis.localStorage;
        }
      } catch (_) { storage = null; }
      if (!storage) { storage = createMemoryStorage(); usingMemoryFallback = true; }
    }

    /**
     * 저장된 상태를 로드한다. 손상/최초 실행 시 seed 로 안전 복구(기획 §8.2·§8.3).
     * @returns {{tickets: Array, source: 'stored'|'seed', recovered: boolean}}
     *   - source 'seed' + recovered false → 최초 실행(V1, EC-04)
     *   - source 'seed' + recovered true  → 손상 감지 후 복구(R1~R2, EC-05/EC-08)
     *   - source 'stored'                 → 검증 통과, 저장값 사용
     */
    function load() {
      var raw = null;
      try {
        raw = storage.getItem(STORAGE_KEY); // V1
      } catch (_) {
        return fallbackToSeed(false); // 읽기 자체 불가 → seed (in-memory)
      }
      if (raw === null) {
        // V1 — 최초 실행: 손상 아님. seed 사용 + 최초 저장(EC-04)
        return fallbackToSeed(false);
      }
      var parsed;
      try {
        parsed = JSON.parse(raw); // V2
      } catch (_) {
        return fallbackToSeed(true); // 파싱 실패 → 손상(EC-05)
      }
      if (!isValidEnvelope(parsed)) {
        return fallbackToSeed(true); // V3~V6 실패 → 손상(EC-05/EC-08)
      }
      return { tickets: parsed.tickets, source: "stored", recovered: false };
    }

    /** seed 로 폴백하고 즉시 재기록(R2). @param {boolean} recovered 손상 복구 여부 */
    function fallbackToSeed(recovered) {
      var tickets = Fixtures.getSeedTickets();
      save(tickets, null); // R2 — 즉시 재기록(실패해도 크래시 없음, R3)
      return { tickets: tickets, source: "seed", recovered: recovered };
    }

    /**
     * tickets 전체 스냅샷을 envelope 로 원자적 기록(기획 §8.4).
     * setItem 예외(quota·프라이빗 모드) 시 재시도 없이 false 반환(R3, 크래시 금지).
     * @returns {boolean} 저장 성공 여부
     */
    function save(tickets, updatedAt) {
      var envelope = buildEnvelope(tickets, updatedAt);
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
        return true;
      } catch (_) {
        return false; // R3 — in-memory 상태로만 동작, 유실 가능(EC-06 정상)
      }
    }

    return {
      load: load,
      save: save,
      isMemoryFallback: function () { return usingMemoryFallback; }
    };
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    SEED_VERSION: SEED_VERSION,
    createStore: createStore,
    createMemoryStorage: createMemoryStorage,
    buildEnvelope: buildEnvelope,
    // 검증 순수 함수 (테스트 노출)
    isValidEnvelope: isValidEnvelope,
    isValidInquiry: isValidInquiry,
    isValidHistoryEvent: isValidHistoryEvent,
    isStatusHistoryConsistent: isStatusHistoryConsistent
  };
});
