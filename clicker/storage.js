/* BF-443 · 클리커 SPA localStorage 추상 utility
 * 명세: docs/design/clicker-BF-441.md
 * 작업 AC (BF-443):
 *  - 클릭 5회 시 점수 5 + best 5
 *  - 리셋 (현재 점수만) → score 0, best 유지
 *  - 전체 초기화 → score 0, best 0
 *  - 새로고침 후 복원
 *
 * key prefix: "clicker:"
 *  - "clicker:score" → 현재 점수 (정수 ≥ 0)
 *  - "clicker:best"  → 최고 점수 (정수 ≥ 0)
 *
 * "bf-theme" 는 본 prefix 밖 — notepad/timer/stopwatch/pomodoro/weather 와 공유.
 *
 * UMD 패턴 — 브라우저는 globalThis.ClickerStorage, Node 는 module.exports.
 * file:// CORS 안전 (명세 §6.7 / §9.4): ES module / fetch / 외부 CDN 0건.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.ClickerStorage = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var PREFIX = "clicker:";
  var SCORE_KEY = PREFIX + "score";
  var BEST_KEY = PREFIX + "best";
  var THEME_KEY = "bf-theme";

  /**
   * Web Storage API 호환 in-memory adapter (테스트·서버사이드용).
   * notepad/timer/stopwatch/pomodoro 의 동일 패턴 (테스트 격리 보장).
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

  function isNonNegativeInteger(n) {
    return (
      typeof n === "number" && Number.isFinite(n) && n >= 0 && Math.trunc(n) === n
    );
  }

  function validateScore(n, label) {
    if (!isNonNegativeInteger(n)) {
      throw new Error(
        label + " 는 0 이상의 정수여야 합니다 (받은 값: " + String(n) + ")",
      );
    }
  }

  /**
   * @param {Storage} [storage]  Web Storage API 호환 객체. 기본 globalThis.localStorage.
   */
  function createClickerStore(storage) {
    if (!storage) {
      storage =
        typeof globalThis !== "undefined" ? globalThis.localStorage : null;
    }
    if (!storage) {
      throw new Error("storage 가 제공되지 않았습니다 (브라우저 외 환경).");
    }

    function parseNonNegInt(raw) {
      if (raw == null) return null;
      var n = Number(raw);
      if (!Number.isFinite(n)) return null;
      var t = Math.trunc(n);
      if (t < 0) return null;
      // "abc" → NaN 으로 걸러진 후 위에서 null. 부동 소수점은 truncate.
      return t;
    }

    function saveScore(score) {
      validateScore(score, "score");
      storage.setItem(SCORE_KEY, String(score));
    }

    /**
     * @returns {number}  저장값이 없거나 깨졌으면 0 반환 (idempotent default).
     */
    function loadScore() {
      var v = parseNonNegInt(storage.getItem(SCORE_KEY));
      return v == null ? 0 : v;
    }

    function clearScore() {
      storage.removeItem(SCORE_KEY);
    }

    function saveBest(best) {
      validateScore(best, "best");
      storage.setItem(BEST_KEY, String(best));
    }

    /**
     * @returns {number}  저장값이 없거나 깨졌으면 0 반환.
     */
    function loadBest() {
      var v = parseNonNegInt(storage.getItem(BEST_KEY));
      return v == null ? 0 : v;
    }

    function clearBest() {
      storage.removeItem(BEST_KEY);
    }

    /**
     * 전체 초기화 — score + best 모두 0 으로 (작업 AC: "전체 초기화 시 0/0").
     * theme 은 건드리지 않음 (다른 SPA 와 공유 — 페이지 간 일관성 유지).
     */
    function clearAll() {
      storage.removeItem(SCORE_KEY);
      storage.removeItem(BEST_KEY);
    }

    function loadTheme() {
      return storage.getItem(THEME_KEY);
    }

    function saveTheme(theme) {
      if (theme !== "dark" && theme !== "light") {
        throw new Error("theme 는 'dark' 또는 'light' 만 허용: " + theme);
      }
      storage.setItem(THEME_KEY, theme);
    }

    return {
      saveScore: saveScore,
      loadScore: loadScore,
      clearScore: clearScore,
      saveBest: saveBest,
      loadBest: loadBest,
      clearBest: clearBest,
      clearAll: clearAll,
      loadTheme: loadTheme,
      saveTheme: saveTheme,
    };
  }

  return {
    CLICKER_PREFIX: PREFIX,
    CLICKER_SCORE_KEY: SCORE_KEY,
    CLICKER_BEST_KEY: BEST_KEY,
    CLICKER_THEME_KEY: THEME_KEY,
    createMemoryStorage: createMemoryStorage,
    createClickerStore: createClickerStore,
  };
});
