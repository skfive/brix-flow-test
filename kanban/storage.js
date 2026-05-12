/* BF-427 · 칸반 보드 localStorage 어댑터 + ULID 생성기
 * 명세: docs/design/kanban-BF-425.md §6.1, §6.6, §9.4
 *
 * 정책 (Task 본문 AC):
 * - non-module `<script src>` 로 로드 (ES module / import / export / fetch 금지)
 * - 전역 namespace: window.KanbanStorage
 * - localStorage key: `kanban:<ulid>` prefix — 카드 1건 = 1 entry
 * - 컬럼 순서: `kanban:__order__` 단일 entry (cardIds per column)
 * - 테마: `bf-theme` (notepad/timer/stopwatch 와 공유)
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

  // ─────────────────── storage 추상 (테스트 in-memory adapter 가능) ───────────────────
  var CARD_PREFIX = "kanban:";
  var ORDER_KEY = "kanban:__order__";
  var THEME_KEY = "bf-theme";
  var DEFAULT_COLUMNS = ["todo", "in-progress", "done"];

  function isCardKey(key) {
    return (
      typeof key === "string" &&
      key.indexOf(CARD_PREFIX) === 0 &&
      key !== ORDER_KEY
    );
  }

  /** Web Storage 호환 in-memory adapter (테스트용). */
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
   * 칸반 store factory.
   * @param {Storage} [storage] Web Storage 호환 객체. 기본 globalThis.localStorage.
   */
  function createKanbanStore(storage) {
    if (storage == null) {
      try {
        storage = global.localStorage;
      } catch (_) {
        storage = null;
      }
    }
    if (!storage) {
      // file:// + 일부 환경에서 localStorage 미가용 → no-op fallback (메모리 모드)
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
      try {
        storage.setItem(cardKey(card.id), JSON.stringify(card));
      } catch (_) {
        /* quota 등 — silent (UI 는 in-memory 로 계속 동작) */
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
        if (parsed && typeof parsed.id === "string") out.push(parsed);
      }
      return out;
    }

    function saveOrder(order) {
      // order: { todo: [...ids], "in-progress": [...], done: [...] }
      try {
        storage.setItem(ORDER_KEY, JSON.stringify(order));
      } catch (_) {
        /* silent */
      }
    }

    function loadOrder() {
      var parsed = safeParse(storage.getItem(ORDER_KEY));
      if (!parsed || typeof parsed !== "object") return null;
      // schema 가드 — 누락된 컬럼은 빈 배열로
      var out = {};
      for (var i = 0; i < DEFAULT_COLUMNS.length; i++) {
        var col = DEFAULT_COLUMNS[i];
        out[col] = Array.isArray(parsed[col]) ? parsed[col].slice() : [];
      }
      return out;
    }

    /**
     * 보드 전체 상태 로드.
     * 반환: { cards: {id: Card}, order: {col: [ids]} }
     * - order 가 없으면 listCards 의 모든 카드를 To Do 에 createdAt 오름차순으로 배치
     * - order 에 있지만 카드 entry 가 사라진 id 는 제거
     * - 카드 entry 는 있지만 어떤 column 에도 없는 id 는 To Do 끝에 부착
     */
    function loadBoard() {
      var allCards = listCards();
      var cardMap = {};
      for (var i = 0; i < allCards.length; i++) {
        cardMap[allCards[i].id] = allCards[i];
      }
      var order = loadOrder();
      if (!order) {
        order = { todo: [], "in-progress": [], done: [] };
        allCards
          .slice()
          .sort(function (a, b) {
            return (a.createdAt || 0) - (b.createdAt || 0);
          })
          .forEach(function (c) {
            order.todo.push(c.id);
          });
        return { cards: cardMap, order: order };
      }
      // sanitize: 누락 card 제거
      for (var ci = 0; ci < DEFAULT_COLUMNS.length; ci++) {
        var col = DEFAULT_COLUMNS[ci];
        order[col] = order[col].filter(function (id) {
          return Object.prototype.hasOwnProperty.call(cardMap, id);
        });
      }
      // 미배치 card 는 To Do 끝에
      var seen = {};
      DEFAULT_COLUMNS.forEach(function (col) {
        order[col].forEach(function (id) {
          seen[id] = true;
        });
      });
      Object.keys(cardMap).forEach(function (id) {
        if (!seen[id]) order.todo.push(id);
      });
      return { cards: cardMap, order: order };
    }

    function clearAll() {
      // kanban: prefix 만 정리 (다른 SPA 의 키 보호)
      var keysToRemove = [];
      for (var i = 0; i < storage.length; i++) {
        var k = storage.key(i);
        if (typeof k === "string" && k.indexOf(CARD_PREFIX) === 0) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(function (k) {
        try {
          storage.removeItem(k);
        } catch (_) {
          /* silent */
        }
      });
    }

    return {
      saveCard: saveCard,
      getCard: getCard,
      removeCard: removeCard,
      listCards: listCards,
      saveOrder: saveOrder,
      loadOrder: loadOrder,
      loadBoard: loadBoard,
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
    try {
      global.localStorage && global.localStorage.setItem(THEME_KEY, theme);
    } catch (_) {
      /* silent */
    }
  }

  // ─────────────────── public surface ───────────────────
  global.KanbanStorage = {
    CARD_PREFIX: CARD_PREFIX,
    ORDER_KEY: ORDER_KEY,
    THEME_KEY: THEME_KEY,
    DEFAULT_COLUMNS: DEFAULT_COLUMNS,
    ulid: ulid,
    createMemoryStorage: createMemoryStorage,
    createKanbanStore: createKanbanStore,
    readTheme: readTheme,
    writeTheme: writeTheme,
  };
})(typeof window !== "undefined" ? window : globalThis);
