/* delivery-exceptions-canary/notes-storage.js — 로컬 해결 메모 localStorage 어댑터(검증·손상 복구)
 * BF-1033 · 기획 docs/planning/delivery-exceptions-canary-BF-1030.md §6 (그대로 채택 — 재해석 금지)
 * UMD 패턴 (support-inbox-canary/storage.js 관례 계승) — 브라우저: globalThis.DxcNotesStorage / Node: module.exports
 * file:// CORS 안전 — 외부 CDN·fetch·import/export 0건. localStorage 접근은 try/catch 로 방어(§6.4 R1·R3).
 */
(function (root, factory) {
  "use strict";
  var api = factory(
    typeof module === "object" && module && module.exports
      ? require("./fixtures.js")
      : root && root.DxcFixtures
  );
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.DxcNotesStorage = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Fixtures) {
  "use strict";

  var STORAGE_KEY = "delivery-exceptions-canary:notes"; // 기획 §6.1 단일 envelope 키
  var SCHEMA_VERSION = Fixtures ? Fixtures.SCHEMA_VERSION : 1; // 현재 1
  var MEMO_MAX = 300; // 기획 §6.2 · §6.3 V4

  /* ─── Web Storage API 호환 in-memory adapter (테스트·저장 불가 환경 폴백, 기획 §6.4 R3) ─── */
  function createMemoryStorage() {
    var map = new Map();
    return {
      get length() {
        return map.size;
      },
      getItem: function (key) {
        return map.has(key) ? map.get(key) : null;
      },
      setItem: function (key, value) {
        map.set(key, String(value));
      },
      removeItem: function (key) {
        map.delete(key);
      },
      clear: function () {
        map.clear();
      },
      key: function (i) {
        var ks = Array.from(map.keys());
        return i >= 0 && i < ks.length ? ks[i] : null;
      },
    };
  }

  function isPlainObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  /** 메모 엔트리 검증(기획 §6.3 V4): text 1~300자 문자열 + savedAt 문자열. */
  function isValidEntry(e) {
    if (!isPlainObject(e)) return false;
    if (typeof e.text !== "string") return false;
    var len = e.text.trim().length;
    if (len < 1 || len > MEMO_MAX) return false;
    if (typeof e.savedAt !== "string" || e.savedAt.length === 0) return false;
    return true;
  }

  /**
   * 저장 원본(raw JSON) → 유효 notes 맵으로 파싱(기획 §6.3 V1~V5 · §6.4 R1~R2).
   * - null / 파싱 실패 / envelope 위반 → 빈 맵(전체 폴백, R1)
   * - 엔트리 위반·orphan id → 해당 키만 드롭(R2 / V5)
   * @param {string|null} raw
   * @param {string[]} validIds fixture 유효 id 집합
   * @returns {Object} notes 맵 { [id]: {text, savedAt} }
   */
  function parseNotes(raw, validIds) {
    if (raw === null || raw === undefined) return {};
    var parsed;
    try {
      parsed = JSON.parse(raw); // V2
    } catch (_) {
      return {}; // R1 — 파싱 실패 전체 폴백
    }
    if (!isPlainObject(parsed)) return {}; // V3
    if (parsed.schemaVersion !== SCHEMA_VERSION) return {}; // V3
    if (!isPlainObject(parsed.notes)) return {}; // V3
    var idSet = validIds || [];
    var out = {};
    Object.keys(parsed.notes).forEach(function (id) {
      if (idSet.indexOf(id) === -1) return; // V5 orphan 드롭
      var entry = parsed.notes[id];
      if (!isValidEntry(entry)) return; // V4 위반 엔트리만 드롭(R2)
      out[id] = { text: entry.text, savedAt: entry.savedAt };
    });
    return out;
  }

  /* ─── Store 팩토리 ─── */

  /**
   * @param {Storage} [storage] Web Storage 인스턴스. 미지정 시 브라우저 localStorage,
   *                            접근 불가 환경이면 in-memory 폴백(기획 §6.4 R3).
   * @param {string[]} [validIds] fixture 유효 id 집합. 미지정 시 Fixtures.getValidIds().
   */
  function createStore(storage, validIds) {
    var usingMemoryFallback = false;
    if (!storage) {
      try {
        if (typeof globalThis !== "undefined" && globalThis.localStorage) {
          globalThis.localStorage.getItem(STORAGE_KEY); // 접근 자체가 예외인 환경 방어
          storage = globalThis.localStorage;
        }
      } catch (_) {
        storage = null;
      }
      if (!storage) {
        storage = createMemoryStorage();
        usingMemoryFallback = true;
      }
    }
    var ids = validIds || (Fixtures ? Fixtures.getValidIds() : []);

    /* 세션 내 메모 상태 — setItem 실패(R3) 시에도 이 스냅샷으로 동작 유지 */
    var notes = readFromStorage();

    function readFromStorage() {
      var raw = null;
      try {
        raw = storage.getItem(STORAGE_KEY); // V1
      } catch (_) {
        return {}; // 읽기 불가 → 메모 없음(R1)
      }
      return parseNotes(raw, ids);
    }

    /** 현재 notes 스냅샷을 envelope 로 원자적 기록. 실패 시 false(R3, 크래시 금지). */
    function persist() {
      var envelope = { schemaVersion: SCHEMA_VERSION, notes: notes };
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
        return true;
      } catch (_) {
        return false; // R3 — in-memory 상태로만 유지, 유실 가능(EC-07 정상)
      }
    }

    /** 세션 메모 상태를 반환(로드). {notes} 형태. */
    function load() {
      return { notes: shallowCopyNotes() };
    }

    function shallowCopyNotes() {
      var copy = {};
      Object.keys(notes).forEach(function (id) {
        copy[id] = { text: notes[id].text, savedAt: notes[id].savedAt };
      });
      return copy;
    }

    /**
     * 메모 저장/삭제(기획 §6.2 / EC-05·EC-08).
     * - 공백/빈 → 해당 id 삭제(action 'delete')
     * - 1~300자 → 저장(action 'save', savedAt 기록)
     * - 300자 초과 → 거부(action 'reject', 기존 값 보존)
     * @param {string} id 예외 id
     * @param {string} rawText 입력 텍스트
     * @param {string} nowIso 저장 시각(ISO8601). 호출자가 주입(결정적 테스트 지원)
     * @returns {{ok:boolean, action:'save'|'delete'|'reject', savedAt:(string|null), persisted:boolean, error:(string|null)}}
     */
    function saveNote(id, rawText, nowIso) {
      var raw = typeof rawText === "string" ? rawText : "";
      var trimmed = raw.trim();
      var len = trimmed.length;
      if (len > MEMO_MAX) {
        return {
          ok: false,
          action: "reject",
          savedAt: null,
          persisted: false,
          error: "메모는 " + MEMO_MAX + "자 이하여야 합니다 (현재 " + len + "자)",
        };
      }
      if (len === 0) {
        delete notes[id]; // EC-08 삭제
        var okDel = persist();
        return { ok: true, action: "delete", savedAt: null, persisted: okDel, error: null };
      }
      var savedAt = typeof nowIso === "string" && nowIso.length > 0 ? nowIso : "";
      notes[id] = { text: trimmed, savedAt: savedAt };
      var okSave = persist();
      return { ok: true, action: "save", savedAt: savedAt, persisted: okSave, error: null };
    }

    function getNote(id) {
      return notes[id] ? { text: notes[id].text, savedAt: notes[id].savedAt } : null;
    }

    return {
      load: load,
      saveNote: saveNote,
      getNote: getNote,
      isMemoryFallback: function () {
        return usingMemoryFallback;
      },
    };
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    MEMO_MAX: MEMO_MAX,
    createStore: createStore,
    createMemoryStorage: createMemoryStorage,
    parseNotes: parseNotes,
    isValidEntry: isValidEntry,
  };
});
