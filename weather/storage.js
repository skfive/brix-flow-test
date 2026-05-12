/* BF-438 · 날씨 카드 SPA localStorage 어댑터 + inline ULID
 * 명세: docs/design/weather-BF-435.md (디자인 토큰·인터랙션 재사용)
 * Task: 도시 카드 CRUD + 정렬 토글 + 테마 공유
 *
 * 정책 (Task AC):
 * - non-module `<script src>` 로 로드 — ES module / import / export / fetch 0건
 * - 전역 namespace: window.WeatherStorage
 * - 카드 키: `weather:<ulid>` prefix — 카드 1건 = 1 entry
 * - 정렬 모드: `weather:__sort__` 단일 entry
 * - 테마: `bf-theme` (notepad/timer/stopwatch/kanban/pomodoro 와 공유)
 *
 * inline ULID: 외부 패키지·다른 파일 의존 없이 본 파일에 inline 포함 (Task AC).
 */
(function (global) {
  "use strict";

  // ─────────────────── ULID (inline, notepad/ulid.js 의 알고리즘 동일) ───────────────────
  var CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  var TIME_LEN = 10;
  var RAND_LEN = 16;

  function encodeTime(time, len) {
    var value = Math.floor(time);
    var out = "";
    for (var i = len - 1; i >= 0; i--) {
      var mod = value % 32;
      out = CROCKFORD_ALPHABET.charAt(mod) + out;
      value = Math.floor(value / 32);
    }
    return out;
  }
  function encodeRandom(len, rng) {
    var out = "";
    for (var i = 0; i < len; i++) {
      out += CROCKFORD_ALPHABET.charAt(Math.floor(rng() * 32));
    }
    return out;
  }
  /**
   * @param {number} [now] epoch ms
   * @param {() => number} [rng] 0 이상 1 미만 난수
   * @returns {string} 26자 ULID
   */
  function ulid(now, rng) {
    if (now == null) now = Date.now();
    if (rng == null) rng = Math.random;
    return encodeTime(now, TIME_LEN) + encodeRandom(RAND_LEN, rng);
  }

  // ─────────────────── 상수 ───────────────────
  var CARD_PREFIX = "weather:";
  var SORT_KEY = "weather:__sort__";
  var THEME_KEY = "bf-theme";
  var VALID_SORTS = ["updated-desc", "city-asc"];
  var DEFAULT_SORT = "updated-desc";
  var VALID_STATES = [
    "sunny",
    "cloudy",
    "rainy",
    "snowy",
    "thunder",
    "windy",
  ];

  function isCardKey(key) {
    return (
      typeof key === "string" &&
      key.indexOf(CARD_PREFIX) === 0 &&
      key !== SORT_KEY
    );
  }

  /** Web Storage 호환 in-memory adapter (테스트용 / private-mode fallback). */
  function createMemoryStorage() {
    var map = {};
    var order = [];
    return {
      get length() {
        return order.length;
      },
      key: function (i) {
        return order[i] != null ? order[i] : null;
      },
      getItem: function (k) {
        return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null;
      },
      setItem: function (k, v) {
        if (!Object.prototype.hasOwnProperty.call(map, k)) order.push(k);
        map[k] = String(v);
      },
      removeItem: function (k) {
        if (Object.prototype.hasOwnProperty.call(map, k)) {
          delete map[k];
          var idx = order.indexOf(k);
          if (idx >= 0) order.splice(idx, 1);
        }
      },
      clear: function () {
        map = {};
        order = [];
      },
    };
  }

  /**
   * 날씨 카드 store factory.
   * @param {Storage} [storage] Web Storage 호환 객체. 기본 globalThis.localStorage.
   */
  function createWeatherStore(storage) {
    if (storage == null) {
      try {
        storage = global.localStorage;
      } catch (_) {
        storage = null;
      }
    }
    if (!storage) {
      // file:// + 일부 환경에서 localStorage 미가용 → memory fallback
      storage = createMemoryStorage();
    }

    function cardKey(id) {
      return CARD_PREFIX + id;
    }

    function safeParse(raw) {
      if (raw == null) return null;
      try {
        return JSON.parse(raw);
      } catch (_) {
        return null;
      }
    }

    function saveCard(card) {
      if (!card || typeof card.id !== "string" || !card.id) {
        throw new Error("card.id (string) 가 필요합니다.");
      }
      if (typeof card.city !== "string" || !card.city.trim()) {
        throw new Error("card.city (string, non-empty) 가 필요합니다.");
      }
      try {
        storage.setItem(cardKey(card.id), JSON.stringify(card));
      } catch (_) {
        /* quota 등 — silent */
      }
    }

    function getCard(id) {
      return safeParse(storage.getItem(cardKey(id)));
    }

    function removeCard(id) {
      try {
        storage.removeItem(cardKey(id));
      } catch (_) {
        /* silent */
      }
    }

    function listCards() {
      var out = [];
      for (var i = 0; i < storage.length; i++) {
        var k = storage.key(i);
        if (!isCardKey(k)) continue;
        var parsed = safeParse(storage.getItem(k));
        if (
          parsed &&
          typeof parsed.id === "string" &&
          typeof parsed.city === "string"
        ) {
          out.push(parsed);
        }
      }
      return out;
    }

    function saveSort(mode) {
      if (VALID_SORTS.indexOf(mode) < 0) {
        throw new Error("sort 는 " + VALID_SORTS.join("/") + " 만 허용: " + mode);
      }
      try {
        storage.setItem(SORT_KEY, mode);
      } catch (_) {
        /* silent */
      }
    }

    function loadSort() {
      var raw = storage.getItem(SORT_KEY);
      return VALID_SORTS.indexOf(raw) >= 0 ? raw : DEFAULT_SORT;
    }

    /** 정렬 적용된 카드 배열 반환. */
    function listSorted(sort) {
      var mode = VALID_SORTS.indexOf(sort) >= 0 ? sort : loadSort();
      var arr = listCards();
      if (mode === "city-asc") {
        arr.sort(function (a, b) {
          // localeCompare 로 한/영/특수 문자 안전 정렬
          var cmp = String(a.city).localeCompare(String(b.city));
          if (cmp !== 0) return cmp;
          // tie-break: createdAt 오름차순 (안정 정렬 흉내)
          return (a.createdAt || 0) - (b.createdAt || 0);
        });
      } else {
        // updated-desc (default) — updatedAt 우선, 없으면 createdAt
        arr.sort(function (a, b) {
          var aU = a.updatedAt != null ? a.updatedAt : a.createdAt || 0;
          var bU = b.updatedAt != null ? b.updatedAt : b.createdAt || 0;
          return bU - aU;
        });
      }
      return arr;
    }

    function clearAll() {
      // weather: prefix 만 정리 (다른 SPA 키 보호)
      var keysToRemove = [];
      for (var i = 0; i < storage.length; i++) {
        var k = storage.key(i);
        if (typeof k === "string" && k.indexOf(CARD_PREFIX) === 0) {
          keysToRemove.push(k);
        }
      }
      for (var j = 0; j < keysToRemove.length; j++) {
        try {
          storage.removeItem(keysToRemove[j]);
        } catch (_) {
          /* silent */
        }
      }
    }

    return {
      saveCard: saveCard,
      getCard: getCard,
      removeCard: removeCard,
      listCards: listCards,
      saveSort: saveSort,
      loadSort: loadSort,
      listSorted: listSorted,
      clearAll: clearAll,
    };
  }

  // ─────────────────── theme storage (bf-theme 공유) ───────────────────
  function readTheme() {
    try {
      var v = global.localStorage && global.localStorage.getItem(THEME_KEY);
      return v === "dark" || v === "light" ? v : null;
    } catch (_) {
      return null;
    }
  }
  function writeTheme(theme) {
    if (theme !== "dark" && theme !== "light") {
      throw new Error("theme 는 'dark' 또는 'light' 만 허용: " + theme);
    }
    try {
      global.localStorage && global.localStorage.setItem(THEME_KEY, theme);
    } catch (_) {
      /* silent */
    }
  }

  // ─────────────────── public surface ───────────────────
  global.WeatherStorage = {
    CARD_PREFIX: CARD_PREFIX,
    SORT_KEY: SORT_KEY,
    THEME_KEY: THEME_KEY,
    VALID_SORTS: VALID_SORTS.slice(),
    DEFAULT_SORT: DEFAULT_SORT,
    VALID_STATES: VALID_STATES.slice(),
    ulid: ulid,
    createMemoryStorage: createMemoryStorage,
    createWeatherStore: createWeatherStore,
    readTheme: readTheme,
    writeTheme: writeTheme,
  };
})(typeof window !== "undefined" ? window : globalThis);
