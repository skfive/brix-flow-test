/* BF-949 · Simon Says 최고기록 localStorage 영속 유틸 (접근 실패 방어)
 * 명세: docs/design/simon-says-maintenance-BF-948.md §5.6 (저장 실패 시 게임 유지)
 * planner: docs/plan/simon-says-maintenance-BF-947.md §5.1~5.3 (파일 분리·시그니처)
 * 선례: dice/storage.js UMD 패턴 (createXxxStore/createMemoryStorage/silent fallback)
 *
 * 설계 원칙 — 저장/조회는 게임을 절대 중단시키지 않는다:
 *   loadBestRound()           → number. 없음/손상/접근 실패 시 0 반환 (예외 던지지 않음).
 *   saveBestRoundIfHigher(n)  → number. n > 기존 최고일 때만 저장, 저장 후 최고값 반환.
 *                               접근 실패 시 기존값(또는 0) 반환, 예외 던지지 않음.
 *
 * key: "simon-says:best-round" → 문자열 정수(최고 도달 라운드 = 게임오버 시점 round).
 *
 * UMD 패턴 — 브라우저: globalThis.SimonStore, Node: module.exports (node --test 대상).
 * file:// CORS 안전: ES module / fetch / 외부 CDN 0건. localStorage 는 본 파일에만 격리.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SimonStore = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var PREFIX = "simon-says:";
  var BEST_KEY = PREFIX + "best-round";

  /**
   * Web Storage API 호환 in-memory adapter (테스트 격리용 — dice/storage.js 동일 패턴).
   */
  function createMemoryStorage() {
    var map = new Map();
    return {
      get length() {
        return map.size;
      },
      key: function (i) {
        var keys = Array.from(map.keys());
        return i >= 0 && i < keys.length ? keys[i] : null;
      },
      getItem: function (k) {
        return map.has(k) ? map.get(k) : null;
      },
      setItem: function (k, v) {
        map.set(k, String(v));
      },
      removeItem: function (k) {
        map.delete(k);
      },
      clear: function () {
        map.clear();
      },
    };
  }

  // 저장값 정규화: 유한한 0 이상 정수만 유효, 그 외(손상·음수·NaN)는 0.
  function normalizeRound(raw) {
    if (raw == null) return 0;
    var n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    var t = Math.trunc(n);
    return t > 0 ? t : 0;
  }

  /**
   * @param {Storage} [storage]  Web Storage API 호환 객체. 기본 globalThis.localStorage.
   *   비공개 모드 등에서 globalThis.localStorage 접근 자체가 throw 할 수 있으므로 try/catch 로 방어.
   *   storage 가 없으면(null) 모든 조회는 0, 저장은 no-op — 게임은 정상 동작(§5.6).
   */
  function createSimonStore(storage) {
    var resolved = storage;
    if (!resolved) {
      try {
        resolved =
          typeof globalThis !== "undefined" ? globalThis.localStorage : null;
      } catch (_e) {
        resolved = null; // SecurityError(비공개 모드) 등 — 게임 유지, 기록 없음 폴백
      }
    }

    /**
     * @returns {number} 저장된 최고 라운드. 없음/손상/접근 실패 시 0 (예외 없음).
     */
    function loadBestRound() {
      if (!resolved) return 0;
      try {
        return normalizeRound(resolved.getItem(BEST_KEY));
      } catch (_e) {
        return 0;
      }
    }

    /**
     * round 가 기존 최고보다 클 때만 저장.
     * @param {number} round  게임오버 시점 라운드.
     * @returns {number} 저장 후(또는 미변경 시) 최고값. 접근 실패 시 기존값/0 (예외 없음).
     */
    function saveBestRoundIfHigher(round) {
      var current = loadBestRound();
      if (typeof round !== "number" || !Number.isFinite(round)) return current;
      var r = Math.trunc(round);
      if (r <= current) return current;
      if (!resolved) return current; // 영속 불가 — 게임은 계속, 폴백은 호출측 처리
      try {
        resolved.setItem(BEST_KEY, String(r));
        return r;
      } catch (_e) {
        return current; // quota 초과 등 — 저장 실패해도 게임 유지
      }
    }

    return {
      loadBestRound: loadBestRound,
      saveBestRoundIfHigher: saveBestRoundIfHigher,
    };
  }

  return {
    SIMON_PREFIX: PREFIX,
    SIMON_BEST_KEY: BEST_KEY,
    createMemoryStorage: createMemoryStorage,
    createSimonStore: createSimonStore,
  };
});
