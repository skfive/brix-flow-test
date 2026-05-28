/* BF-642 · 테트리스 localStorage 추상 utility
 * 명세: docs/design/tetris-BF-639.md §8
 *
 * key prefix: "tetris:"
 *  - "tetris:highScore" → 숫자 (역대 최고 점수)
 *  - "tetris:theme"     → "light" | "dark" (기본 "dark")
 *
 * UMD 패턴 — 브라우저: globalThis.TetrisStorage, Node: module.exports
 * file:// CORS 안전
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.TetrisStorage = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var HIGH_SCORE_KEY = "tetris:highScore";
  var THEME_KEY      = "tetris:theme";
  var THEME_DEFAULT  = "dark"; // 게임 모듈은 dark 기본 (명세 §9.2)

  /**
   * Web Storage API 호환 in-memory adapter (테스트·서버사이드용)
   */
  function createMemoryStorage() {
    var map = new Map();
    return {
      get length() { return map.size; },
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
      key: function (index) {
        var keys = Array.from(map.keys());
        return index >= 0 && index < keys.length ? keys[index] : null;
      },
    };
  }

  /**
   * @param {Storage} storage  Web Storage 인스턴스 (브라우저: localStorage)
   */
  function createTetrisStore(storage) {
    if (!storage) {
      // 브라우저 환경에서 인자 없으면 globalThis.localStorage 사용
      if (typeof globalThis !== "undefined" && globalThis.localStorage) {
        storage = globalThis.localStorage;
      } else {
        throw new Error("[TetrisStorage] storage 인자 필요 (브라우저 외 환경)");
      }
    }

    // ── highScore ──────────────────────────────────────

    function loadHighScore() {
      try {
        var raw = storage.getItem(HIGH_SCORE_KEY);
        if (raw === null) return 0;
        var n = Number(raw);
        if (!isFinite(n) || n < 0) return 0;
        return Math.floor(n);
      } catch (_) {
        return 0;
      }
    }

    function saveHighScore(score) {
      if (typeof score !== "number" || !isFinite(score) || score < 0) {
        throw new Error("[TetrisStorage] score 는 0 이상 유한 숫자여야 합니다: " + score);
      }
      storage.setItem(HIGH_SCORE_KEY, String(Math.floor(score)));
    }

    // ── theme ──────────────────────────────────────────

    function loadTheme() {
      try {
        var raw = storage.getItem(THEME_KEY);
        if (raw === "light" || raw === "dark") return raw;
        return THEME_DEFAULT;
      } catch (_) {
        return THEME_DEFAULT;
      }
    }

    function saveTheme(theme) {
      if (theme !== "light" && theme !== "dark") {
        throw new Error("[TetrisStorage] theme 은 'light' 또는 'dark' 여야 합니다: " + theme);
      }
      storage.setItem(THEME_KEY, theme);
    }

    return {
      loadHighScore: loadHighScore,
      saveHighScore: saveHighScore,
      loadTheme:     loadTheme,
      saveTheme:     saveTheme,
    };
  }

  return {
    TETRIS_HIGH_SCORE_KEY: HIGH_SCORE_KEY,
    TETRIS_THEME_KEY:      THEME_KEY,
    createMemoryStorage:   createMemoryStorage,
    createTetrisStore:     createTetrisStore,
  };
});
