/* BF-448 · 주사위 SPA localStorage 추상 utility
 * 명세: docs/design/dice-BF-446.md (designer 명세 — 시각/토큰 기준)
 * 작업 AC (BF-448 — task description 기준, design spec 과 일부 차이):
 *  - 1~5개 주사위 (각 1~6 랜덤) 가변
 *  - 합계 / 평균 / 최대값 통계 (단일 굴림 기준)
 *  - 최근 10건 히스토리 cap (design spec 의 50건은 본 task description 으로 override)
 *  - 전체 삭제 (clearAll) — main.js 에서 확인 modal 게이트
 *
 * key prefix: "dice:"
 *  - "dice:history" → JSON array of entries `{ id, rolls, sum, avg, max, ts }` (최신이 head, cap 10)
 *  - "dice:count"   → 1~5 정수 (마지막 사용한 주사위 개수)
 *
 * "bf-theme" 는 본 prefix 밖 — notepad/timer/stopwatch/pomodoro/clicker/weather 와 공유.
 *
 * UMD 패턴 — 브라우저는 globalThis.DiceStorage, Node 는 module.exports.
 * file:// CORS 안전 (명세 §6.7 / §9.4): ES module / fetch / 외부 CDN 0건.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.DiceStorage = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var PREFIX = "dice:";
  var HISTORY_KEY = PREFIX + "history";
  var COUNT_KEY = PREFIX + "count";
  var THEME_KEY = "bf-theme";

  /* 작업 AC: 최근 10건 cap (design spec §1.3 의 50건은 task description 으로 override) */
  var HISTORY_CAP = 10;
  /* 작업 description: 1~5개 가변 */
  var COUNT_MIN = 1;
  var COUNT_MAX = 5;
  /* design spec §1.3 / §5.1: default 2개 주사위 (기존 명세 호환) */
  var COUNT_DEFAULT = 2;

  /**
   * Web Storage API 호환 in-memory adapter (테스트·서버사이드용).
   * clicker/weather/pomodoro 와 동일 패턴 (테스트 격리 보장).
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

  function isPositiveInteger(n) {
    return (
      typeof n === "number" && Number.isFinite(n) && n >= 1 && Math.trunc(n) === n
    );
  }
  function isNonNegativeInteger(n) {
    return (
      typeof n === "number" && Number.isFinite(n) && n >= 0 && Math.trunc(n) === n
    );
  }
  function isIntegerInRange(n, lo, hi) {
    return (
      typeof n === "number" &&
      Number.isFinite(n) &&
      n >= lo &&
      n <= hi &&
      Math.trunc(n) === n
    );
  }

  function validateDiceCount(n) {
    if (!isIntegerInRange(n, COUNT_MIN, COUNT_MAX)) {
      throw new Error(
        "count 는 " +
          COUNT_MIN +
          "~" +
          COUNT_MAX +
          " 정수여야 합니다 (받은 값: " +
          String(n) +
          ")",
      );
    }
  }

  /**
   * entry validate — pushRoll 의 런타임 방어.
   *  - id: positive integer
   *  - rolls: 길이 1~5 정수 배열, 각 1~6
   *  - sum / avg / max: number (validate 는 rolls 우선, 합계는 main.js 에서 계산해 넣은 값 신뢰)
   *  - ts: non-negative integer
   */
  function validateRollEntry(entry) {
    if (!entry || typeof entry !== "object") {
      throw new Error("entry 는 객체여야 합니다");
    }
    if (!isPositiveInteger(entry.id)) {
      throw new Error("entry.id 는 양의 정수여야 합니다 (받은 값: " + String(entry.id) + ")");
    }
    if (!Array.isArray(entry.rolls)) {
      throw new Error("entry.rolls 는 배열이어야 합니다");
    }
    if (entry.rolls.length < COUNT_MIN || entry.rolls.length > COUNT_MAX) {
      throw new Error(
        "entry.rolls 길이는 " + COUNT_MIN + "~" + COUNT_MAX + " 여야 합니다 (받은 길이: " + entry.rolls.length + ")",
      );
    }
    for (var i = 0; i < entry.rolls.length; i += 1) {
      if (!isIntegerInRange(entry.rolls[i], 1, 6)) {
        throw new Error(
          "entry.rolls[" + i + "] 는 1~6 정수여야 합니다 (받은 값: " + String(entry.rolls[i]) + ")",
        );
      }
    }
    if (!isNonNegativeInteger(entry.ts)) {
      throw new Error("entry.ts 는 0 이상의 정수여야 합니다 (받은 값: " + String(entry.ts) + ")");
    }
    if (typeof entry.sum !== "number" || !Number.isFinite(entry.sum)) {
      throw new Error("entry.sum 은 숫자여야 합니다");
    }
    if (typeof entry.avg !== "number" || !Number.isFinite(entry.avg)) {
      throw new Error("entry.avg 는 숫자여야 합니다");
    }
    if (typeof entry.max !== "number" || !Number.isFinite(entry.max)) {
      throw new Error("entry.max 는 숫자여야 합니다");
    }
  }

  /**
   * 깨진 entry 는 silent skip — load 측에서 사용 (validate 와 분리).
   */
  function isValidEntryLoose(e) {
    if (!e || typeof e !== "object") return false;
    if (!isPositiveInteger(e.id)) return false;
    if (!Array.isArray(e.rolls)) return false;
    if (e.rolls.length < COUNT_MIN || e.rolls.length > COUNT_MAX) return false;
    for (var i = 0; i < e.rolls.length; i += 1) {
      if (!isIntegerInRange(e.rolls[i], 1, 6)) return false;
    }
    if (!isNonNegativeInteger(e.ts)) return false;
    if (typeof e.sum !== "number" || !Number.isFinite(e.sum)) return false;
    if (typeof e.avg !== "number" || !Number.isFinite(e.avg)) return false;
    if (typeof e.max !== "number" || !Number.isFinite(e.max)) return false;
    return true;
  }

  /**
   * @param {Storage} [storage]  Web Storage API 호환 객체. 기본 globalThis.localStorage.
   */
  function createDiceStore(storage) {
    if (!storage) {
      storage =
        typeof globalThis !== "undefined" ? globalThis.localStorage : null;
    }
    if (!storage) {
      throw new Error("storage 가 제공되지 않았습니다 (브라우저 외 환경).");
    }

    /* ── diceCount ── */

    function saveDiceCount(n) {
      validateDiceCount(n);
      storage.setItem(COUNT_KEY, String(n));
    }

    /**
     * @returns {number}  저장값이 없거나 깨졌으면 default 2 반환 (silent fallback).
     */
    function loadDiceCount() {
      var raw = storage.getItem(COUNT_KEY);
      if (raw == null) return COUNT_DEFAULT;
      var num = Number(raw);
      if (!Number.isFinite(num)) return COUNT_DEFAULT;
      var t = Math.trunc(num);
      if (t < COUNT_MIN || t > COUNT_MAX) return COUNT_DEFAULT;
      return t;
    }

    /* ── history ── */

    /**
     * @returns {Array<object>}  최신이 head, 길이 ≤ HISTORY_CAP. 깨진 값은 silent fallback ([] / skip).
     */
    function loadHistory() {
      var raw = storage.getItem(HISTORY_KEY);
      if (raw == null) return [];
      var parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (_e) {
        return [];
      }
      if (!Array.isArray(parsed)) return [];
      var out = [];
      for (var i = 0; i < parsed.length; i += 1) {
        if (isValidEntryLoose(parsed[i])) {
          out.push(parsed[i]);
          if (out.length >= HISTORY_CAP) break;
        }
      }
      return out;
    }

    /**
     * entry 1건을 head 에 추가 (최신 우선) + HISTORY_CAP 적용 후 저장.
     * @returns {Array<object>}  저장 후의 history (최신순, 최대 10개).
     */
    function pushRoll(entry) {
      validateRollEntry(entry);
      var current = loadHistory();
      var next = [entry].concat(current).slice(0, HISTORY_CAP);
      storage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    }

    function clearHistory() {
      storage.removeItem(HISTORY_KEY);
    }

    /**
     * 전체 초기화 — history + count 모두 삭제 (작업 AC: "확인 모달 → 전체 삭제").
     * theme 은 건드리지 않음 (다른 SPA 와 공유 — 페이지 간 일관성 유지).
     */
    function clearAll() {
      storage.removeItem(HISTORY_KEY);
      storage.removeItem(COUNT_KEY);
    }

    /* ── theme (bf-theme 공유) ── */

    function loadTheme() {
      return storage.getItem(THEME_KEY);
    }

    function saveTheme(theme) {
      if (theme !== "dark" && theme !== "light") {
        throw new Error("theme 는 'dark' 또는 'light' 만 허용: " + String(theme));
      }
      storage.setItem(THEME_KEY, theme);
    }

    return {
      saveDiceCount: saveDiceCount,
      loadDiceCount: loadDiceCount,
      loadHistory: loadHistory,
      pushRoll: pushRoll,
      clearHistory: clearHistory,
      clearAll: clearAll,
      loadTheme: loadTheme,
      saveTheme: saveTheme,
    };
  }

  return {
    DICE_PREFIX: PREFIX,
    DICE_HISTORY_KEY: HISTORY_KEY,
    DICE_COUNT_KEY: COUNT_KEY,
    DICE_THEME_KEY: THEME_KEY,
    DICE_HISTORY_CAP: HISTORY_CAP,
    DICE_COUNT_MIN: COUNT_MIN,
    DICE_COUNT_MAX: COUNT_MAX,
    DICE_COUNT_DEFAULT: COUNT_DEFAULT,
    createMemoryStorage: createMemoryStorage,
    createDiceStore: createDiceStore,
  };
});
