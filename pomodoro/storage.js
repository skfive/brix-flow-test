/* BF-432 · 뽀모도로 localStorage 추상 utility
 * 명세: docs/design/pomodoro-BF-430.md (§6.5 새로고침 복원, §6.6 테마 공유)
 *
 * key prefix: "pomodoro:" (작업 요구사항)
 *  - "pomodoro:state"  → JSON { mode, currentCycle, remainingMs, phase, savedAtMs }
 *  - "pomodoro:stats"  → JSON { date:"YYYY-MM-DD", focusMsToday }
 *  - "pomodoro:debug:speed" → 숫자 문자열 (시뮬레이션용, 미설정 시 1)
 *
 * "bf-theme" 는 본 prefix 밖 — notepad/timer/stopwatch 와 공유 (명세 §6.6).
 *
 * UMD 패턴 — 브라우저는 globalThis.PomodoroStorage, Node 는 module.exports.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.PomodoroStorage = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var PREFIX = "pomodoro:";
  var STATE_KEY = PREFIX + "state";
  var STATS_KEY = PREFIX + "stats";
  var DEBUG_SPEED_KEY = PREFIX + "debug:speed";
  var THEME_KEY = "bf-theme";

  var VALID_MODES = ["FOCUS", "SHORT_BREAK", "LONG_BREAK"];
  var VALID_PHASES = ["idle", "running", "paused"];

  /**
   * Web Storage API 호환 in-memory adapter (테스트·서버사이드용).
   * notepad/timer/stopwatch 의 동일 패턴 (테스트 격리 보장).
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

  function isValidMode(mode) {
    return VALID_MODES.indexOf(mode) >= 0;
  }
  function isValidPhase(phase) {
    return VALID_PHASES.indexOf(phase) >= 0;
  }
  function isFiniteNumber(n) {
    return typeof n === "number" && Number.isFinite(n);
  }

  function validateState(value) {
    if (!value || typeof value !== "object") {
      throw new Error("state 객체가 필요합니다.");
    }
    if (!isValidMode(value.mode)) {
      throw new Error("state.mode 가 유효하지 않습니다: " + value.mode);
    }
    if (!isValidPhase(value.phase)) {
      throw new Error("state.phase 가 유효하지 않습니다: " + value.phase);
    }
    if (
      !isFiniteNumber(value.currentCycle) ||
      value.currentCycle < 1 ||
      value.currentCycle > 4
    ) {
      throw new Error(
        "state.currentCycle 이 1~4 범위가 아닙니다: " + value.currentCycle,
      );
    }
    if (!isFiniteNumber(value.remainingMs) || value.remainingMs < 0) {
      throw new Error(
        "state.remainingMs 가 음수이거나 유효하지 않습니다: " +
          value.remainingMs,
      );
    }
    if (!isFiniteNumber(value.savedAtMs) || value.savedAtMs < 0) {
      throw new Error(
        "state.savedAtMs 가 유효하지 않습니다: " + value.savedAtMs,
      );
    }
  }

  function validateStats(value) {
    if (!value || typeof value !== "object") {
      throw new Error("stats 객체가 필요합니다.");
    }
    if (typeof value.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) {
      throw new Error("stats.date 가 YYYY-MM-DD 형식이 아닙니다: " + value.date);
    }
    if (!isFiniteNumber(value.focusMsToday) || value.focusMsToday < 0) {
      throw new Error(
        "stats.focusMsToday 가 음수이거나 유효하지 않습니다: " +
          value.focusMsToday,
      );
    }
  }

  /**
   * @param {Storage} [storage]  Web Storage API 호환 객체. 기본 globalThis.localStorage.
   */
  function createPomodoroStore(storage) {
    if (!storage) {
      storage =
        typeof globalThis !== "undefined" ? globalThis.localStorage : null;
    }
    if (!storage) {
      throw new Error("storage 가 제공되지 않았습니다 (브라우저 외 환경).");
    }

    function saveState(value) {
      // 정규화 전 원본 검증 (음수·NaN 은 호출자 책임 — 명시적 throw)
      validateState(value);
      var payload = {
        mode: value.mode,
        phase: value.phase,
        currentCycle: value.currentCycle,
        remainingMs: Math.trunc(value.remainingMs),
        savedAtMs: Math.trunc(value.savedAtMs),
      };
      storage.setItem(STATE_KEY, JSON.stringify(payload));
    }

    function loadState() {
      var raw = storage.getItem(STATE_KEY);
      if (raw == null) return null;
      try {
        var parsed = JSON.parse(raw);
        validateState(parsed);
        return {
          mode: parsed.mode,
          phase: parsed.phase,
          currentCycle: parsed.currentCycle,
          remainingMs: parsed.remainingMs,
          savedAtMs: parsed.savedAtMs,
        };
      } catch (_e) {
        return null;
      }
    }

    function clearState() {
      storage.removeItem(STATE_KEY);
    }

    function saveStats(value) {
      // 정규화 전 원본 검증 (음수·NaN 은 호출자 책임)
      validateStats(value);
      var payload = {
        date: value.date,
        focusMsToday: Math.trunc(value.focusMsToday),
      };
      storage.setItem(STATS_KEY, JSON.stringify(payload));
    }

    function loadStats() {
      var raw = storage.getItem(STATS_KEY);
      if (raw == null) return null;
      try {
        var parsed = JSON.parse(raw);
        validateStats(parsed);
        return { date: parsed.date, focusMsToday: parsed.focusMsToday };
      } catch (_e) {
        return null;
      }
    }

    function clearStats() {
      storage.removeItem(STATS_KEY);
    }

    function loadDebugSpeed() {
      var raw = storage.getItem(DEBUG_SPEED_KEY);
      if (raw == null) return 1;
      var n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return 1;
      return n;
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
      saveState: saveState,
      loadState: loadState,
      clearState: clearState,
      saveStats: saveStats,
      loadStats: loadStats,
      clearStats: clearStats,
      loadDebugSpeed: loadDebugSpeed,
      loadTheme: loadTheme,
      saveTheme: saveTheme,
    };
  }

  return {
    POMODORO_PREFIX: PREFIX,
    POMODORO_STATE_KEY: STATE_KEY,
    POMODORO_STATS_KEY: STATS_KEY,
    POMODORO_DEBUG_SPEED_KEY: DEBUG_SPEED_KEY,
    POMODORO_THEME_KEY: THEME_KEY,
    VALID_MODES: VALID_MODES.slice(),
    VALID_PHASES: VALID_PHASES.slice(),
    createMemoryStorage: createMemoryStorage,
    createPomodoroStore: createPomodoroStore,
  };
});
