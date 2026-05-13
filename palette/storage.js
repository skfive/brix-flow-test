/* BF-464 · palette SPA localStorage 추상 utility
 * 작업 AC (BF-464):
 *  - 5개 컬러 슬롯 영속 (bf-palette 키 — JSON 배열)
 *  - 다크 default + bf-theme 키 (notepad/timer/clicker 등 다른 SPA 와 공유)
 *  - HEX → HSL 변환 유틸 (테스트 가능 export)
 *
 * key "bf-palette" → JSON 배열 5개 HEX 문자열 (예: ["#a78bfa", ...])
 * key "bf-theme"   → "dark" | "light" (공유, prefix 없음)
 *
 * UMD 패턴 — 브라우저는 globalThis.PaletteStorage, Node 는 module.exports.
 * file:// CORS 안전: ES module / fetch / 외부 CDN 0건.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.PaletteStorage = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var PALETTE_KEY = "bf-palette";
  var THEME_KEY = "bf-theme";
  var SLOT_COUNT = 5;

  /* 기본 5개 컬러 — 다크 테마에 어울리는 선명한 팔레트 */
  var DEFAULT_COLORS = ["#a78bfa", "#38bdf8", "#fb7185", "#34d399", "#fbbf24"];

  /* ─── HEX 유효성 ─── */
  var HEX_RE = /^#[0-9a-fA-F]{6}$/;

  function isValidHex(s) {
    return typeof s === "string" && HEX_RE.test(s);
  }

  /* ─── HEX → HSL 변환 ───
   * @param {string} hex  '#rrggbb' 형식 (대소문자 무관)
   * @returns {{h: number, s: number, l: number}}  각 값은 Math.round 정수
   */
  function hexToHsl(hex) {
    if (!isValidHex(hex)) {
      throw new Error("hexToHsl: 유효한 HEX 컬러가 아닙니다 — " + String(hex));
    }

    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;

    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var d = max - min;
    var l = (max + min) / 2;
    var s = 0;
    var h = 0;

    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) {
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      } else if (max === g) {
        h = ((b - r) / d + 2) / 6;
      } else {
        h = ((r - g) / d + 4) / 6;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  /**
   * HEX → "hsl(H, S%, L%)" 문자열
   * @param {string} hex
   * @returns {string}
   */
  function hexToHslString(hex) {
    var hsl = hexToHsl(hex);
    return "hsl(" + hsl.h + ", " + hsl.s + "%, " + hsl.l + "%)";
  }

  /* ─── in-memory storage adapter (테스트·서버사이드용) ─── */
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

  /* ─── Palette Store ─── */
  /**
   * @param {Storage} [storage]  Web Storage API 호환 객체. 기본 globalThis.localStorage.
   */
  function createPaletteStore(storage) {
    if (!storage) {
      storage =
        typeof globalThis !== "undefined" ? globalThis.localStorage : null;
    }
    if (!storage) {
      throw new Error("storage 가 제공되지 않았습니다 (브라우저 외 환경).");
    }

    /**
     * 저장된 5개 컬러 배열 반환.
     * 없거나 깨졌으면 DEFAULT_COLORS 복사본 반환 (항상 새 배열).
     * @returns {string[]}
     */
    function loadColors() {
      try {
        var raw = storage.getItem(PALETTE_KEY);
        if (raw == null) return DEFAULT_COLORS.slice();
        var arr = JSON.parse(raw);
        if (!Array.isArray(arr) || arr.length !== SLOT_COUNT) {
          return DEFAULT_COLORS.slice();
        }
        for (var i = 0; i < arr.length; i++) {
          if (!isValidHex(arr[i])) return DEFAULT_COLORS.slice();
        }
        return arr;
      } catch (_e) {
        return DEFAULT_COLORS.slice();
      }
    }

    /**
     * 5개 컬러 배열 저장.
     * @param {string[]} colors  '#rrggbb' HEX 5개
     */
    function saveColors(colors) {
      if (!Array.isArray(colors) || colors.length !== SLOT_COUNT) {
        throw new Error(
          "colors 는 HEX 문자열 " + SLOT_COUNT + "개 배열이어야 합니다.",
        );
      }
      for (var i = 0; i < colors.length; i++) {
        if (!isValidHex(colors[i])) {
          throw new Error(
            "colors[" + i + "] 는 유효한 HEX 값이어야 합니다: " + colors[i],
          );
        }
      }
      storage.setItem(PALETTE_KEY, JSON.stringify(colors));
    }

    /**
     * 단일 슬롯 컬러 변경 + 저장.
     * @param {number} index  0~4
     * @param {string} hex    '#rrggbb'
     */
    function saveColor(index, hex) {
      if (
        typeof index !== "number" ||
        !Number.isFinite(index) ||
        index < 0 ||
        index >= SLOT_COUNT ||
        Math.trunc(index) !== index
      ) {
        throw new Error(
          "index 는 0~" + (SLOT_COUNT - 1) + " 범위의 정수여야 합니다: " + index,
        );
      }
      if (!isValidHex(hex)) {
        throw new Error("hex 는 유효한 HEX 값이어야 합니다: " + String(hex));
      }
      var colors = loadColors();
      colors[index] = hex;
      saveColors(colors);
    }

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
      loadColors: loadColors,
      saveColors: saveColors,
      saveColor: saveColor,
      loadTheme: loadTheme,
      saveTheme: saveTheme,
    };
  }

  return {
    PALETTE_KEY: PALETTE_KEY,
    THEME_KEY: THEME_KEY,
    DEFAULT_COLORS: DEFAULT_COLORS,
    SLOT_COUNT: SLOT_COUNT,
    isValidHex: isValidHex,
    hexToHsl: hexToHsl,
    hexToHslString: hexToHslString,
    createMemoryStorage: createMemoryStorage,
    createPaletteStore: createPaletteStore,
  };
});
