// BF-464 · palette SPA storage 추상 단위 테스트
// 작업 AC (BF-464):
//   - 5개 컬러 슬롯 영속 (bf-palette 키 — JSON 배열)
//   - 다크 default + bf-theme 키 (다른 SPA 와 공유)
//   - HEX ↔ HSL 변환 유틸 정확성
//   - prefix "bf-palette" 격리 (다른 SPA 와 충돌 0)
//
// palette/ 는 비-module (UMD) — createRequire 로 로드 (clicker/weather 와 동일 패턴).

import { test } from "node:test";
import assert from "node:assert";
import { createRequire } from "node:module";

// brix-flow-test-scope-guard — focused scope 에서 자기 module 외 skip
const _BRIX_MY_MODULE = "palette";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const require = createRequire(import.meta.url);
const PS = require("../palette/storage.js");

const {
  PALETTE_KEY,
  THEME_KEY,
  DEFAULT_COLORS,
  SLOT_COUNT,
  isValidHex,
  hexToHsl,
  hexToHslString,
  createMemoryStorage,
  createPaletteStore,
} = PS;

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────
  // 1. 상수 노출 fact
  // ─────────────────────────────────────────

  test("상수 노출: PALETTE_KEY === 'bf-palette' (AC: bf-palette 키)", () => {
    assert.equal(PALETTE_KEY, "bf-palette");
  });

  test("상수 노출: THEME_KEY === 'bf-theme' (다른 SPA 와 공유 키)", () => {
    assert.equal(THEME_KEY, "bf-theme");
  });

  test("상수 노출: DEFAULT_COLORS — 5개 유효 HEX 배열", () => {
    assert.equal(Array.isArray(DEFAULT_COLORS), true, "DEFAULT_COLORS 가 배열이 아님");
    assert.equal(DEFAULT_COLORS.length, 5, "DEFAULT_COLORS 길이가 5 가 아님");
    for (let i = 0; i < DEFAULT_COLORS.length; i++) {
      assert.match(
        DEFAULT_COLORS[i],
        /^#[0-9a-fA-F]{6}$/,
        "DEFAULT_COLORS[" + i + "] 유효한 HEX 형식 아님: " + DEFAULT_COLORS[i],
      );
    }
  });

  test("상수 노출: SLOT_COUNT === 5", () => {
    assert.equal(SLOT_COUNT, 5);
  });

  // ─────────────────────────────────────────
  // 2. isValidHex 유틸
  // ─────────────────────────────────────────

  test("isValidHex: 유효한 HEX 문자열 → true", () => {
    assert.equal(isValidHex("#a78bfa"), true);
    assert.equal(isValidHex("#000000"), true);
    assert.equal(isValidHex("#ffffff"), true);
    assert.equal(isValidHex("#ABCDEF"), true);
    assert.equal(isValidHex("#123456"), true);
  });

  test("isValidHex: 유효하지 않은 값 → false", () => {
    assert.equal(isValidHex("a78bfa"), false, "# 없음");
    assert.equal(isValidHex("#a78bf"), false, "5자리");
    assert.equal(isValidHex("#a78bfab"), false, "7자리");
    assert.equal(isValidHex(""), false, "빈 문자열");
    assert.equal(isValidHex(null), false, "null");
    assert.equal(isValidHex(undefined), false, "undefined");
    assert.equal(isValidHex(123), false, "숫자");
    assert.equal(isValidHex("#xyz123"), false, "비 16진수 문자");
  });

  // ─────────────────────────────────────────
  // 3. hexToHsl 변환 정확성
  // ─────────────────────────────────────────

  test("hexToHsl: #000000 (검정) → {h:0, s:0, l:0}", () => {
    const result = hexToHsl("#000000");
    assert.equal(result.h, 0, "h");
    assert.equal(result.s, 0, "s");
    assert.equal(result.l, 0, "l");
  });

  test("hexToHsl: #ffffff (흰색) → {h:0, s:0, l:100}", () => {
    const result = hexToHsl("#ffffff");
    assert.equal(result.h, 0, "h");
    assert.equal(result.s, 0, "s");
    assert.equal(result.l, 100, "l");
  });

  test("hexToHsl: #ff0000 (순수 빨강) → {h:0, s:100, l:50}", () => {
    const result = hexToHsl("#ff0000");
    assert.equal(result.h, 0, "h");
    assert.equal(result.s, 100, "s");
    assert.equal(result.l, 50, "l");
  });

  test("hexToHsl: #00ff00 (순수 초록) → {h:120, s:100, l:50}", () => {
    const result = hexToHsl("#00ff00");
    assert.equal(result.h, 120, "h");
    assert.equal(result.s, 100, "s");
    assert.equal(result.l, 50, "l");
  });

  test("hexToHsl: #0000ff (순수 파랑) → {h:240, s:100, l:50}", () => {
    const result = hexToHsl("#0000ff");
    assert.equal(result.h, 240, "h");
    assert.equal(result.s, 100, "s");
    assert.equal(result.l, 50, "l");
  });

  test("hexToHsl: 대문자 #FF0000 도 동일 결과", () => {
    const result = hexToHsl("#FF0000");
    assert.equal(result.h, 0);
    assert.equal(result.s, 100);
    assert.equal(result.l, 50);
  });

  test("hexToHsl: 반환 객체는 h/s/l 를 정수(Math.round)로 포함", () => {
    // DEFAULT_COLORS 전체를 변환해도 예외 없고 정수 반환
    for (const hex of DEFAULT_COLORS) {
      const hsl = hexToHsl(hex);
      assert.equal(typeof hsl.h, "number", hex + " h 는 number");
      assert.equal(typeof hsl.s, "number", hex + " s 는 number");
      assert.equal(typeof hsl.l, "number", hex + " l 는 number");
      assert.equal(Number.isInteger(hsl.h), true, hex + " h 는 정수");
      assert.equal(Number.isInteger(hsl.s), true, hex + " s 는 정수");
      assert.equal(Number.isInteger(hsl.l), true, hex + " l 는 정수");
      assert.ok(hsl.h >= 0 && hsl.h <= 360, hex + " h 범위 0~360");
      assert.ok(hsl.s >= 0 && hsl.s <= 100, hex + " s 범위 0~100");
      assert.ok(hsl.l >= 0 && hsl.l <= 100, hex + " l 범위 0~100");
    }
  });

  test("hexToHsl: 유효하지 않은 HEX → throw", () => {
    assert.throws(() => hexToHsl("a78bfa"), /hexToHsl/);
    assert.throws(() => hexToHsl(""), /hexToHsl/);
    assert.throws(() => hexToHsl(null), /hexToHsl/);
  });

  // ─────────────────────────────────────────
  // 4. hexToHslString 형식
  // ─────────────────────────────────────────

  test("hexToHslString: 'hsl(H, S%, L%)' 형식 반환", () => {
    const result = hexToHslString("#ff0000");
    assert.match(result, /^hsl\(\d+, \d+%, \d+%\)$/, "형식 불일치: " + result);
  });

  test("hexToHslString: #000000 → 'hsl(0, 0%, 0%)'", () => {
    assert.equal(hexToHslString("#000000"), "hsl(0, 0%, 0%)");
  });

  test("hexToHslString: #ffffff → 'hsl(0, 0%, 100%)'", () => {
    assert.equal(hexToHslString("#ffffff"), "hsl(0, 0%, 100%)");
  });

  test("hexToHslString: DEFAULT_COLORS 전체를 변환해도 예외 없음", () => {
    for (const hex of DEFAULT_COLORS) {
      assert.doesNotThrow(() => hexToHslString(hex), hex + " 변환 예외");
    }
  });

  // ─────────────────────────────────────────
  // 5. createMemoryStorage — Web Storage API 호환
  // ─────────────────────────────────────────

  test("memoryStorage: Web Storage API 호환 (length / key / getItem / setItem / removeItem / clear)", () => {
    const mem = createMemoryStorage();
    assert.equal(mem.length, 0);
    mem.setItem("a", "1");
    mem.setItem("b", "2");
    assert.equal(mem.length, 2);
    assert.equal(mem.getItem("a"), "1");
    const keys = new Set([mem.key(0), mem.key(1)]);
    assert.deepEqual([...keys].sort(), ["a", "b"]);
    mem.removeItem("a");
    assert.equal(mem.length, 1);
    assert.equal(mem.getItem("a"), null);
    mem.clear();
    assert.equal(mem.length, 0);
  });

  test("memoryStorage: 범위 외 key index → null", () => {
    const mem = createMemoryStorage();
    mem.setItem("x", "v");
    assert.equal(mem.key(0), "x");
    assert.equal(mem.key(99), null);
    assert.equal(mem.key(-1), null);
  });

  test("memoryStorage: setItem 은 값을 문자열로 강제 변환", () => {
    const mem = createMemoryStorage();
    mem.setItem("n", 42);
    assert.equal(mem.getItem("n"), "42");
  });

  // ─────────────────────────────────────────
  // 6. createPaletteStore — loadColors / saveColors
  // ─────────────────────────────────────────

  test("loadColors: 빈 storage → DEFAULT_COLORS 복사본 반환 (참조 분리)", () => {
    const mem = createMemoryStorage();
    const store = createPaletteStore(mem);
    const colors = store.loadColors();
    assert.deepEqual(colors, DEFAULT_COLORS, "기본값 불일치");
    // 새 배열 (참조 분리 — 외부 변경이 DEFAULT_COLORS 를 오염시키지 않음)
    assert.notStrictEqual(colors, DEFAULT_COLORS, "DEFAULT_COLORS 참조를 직접 반환하면 안 됨");
  });

  test("loadColors: 저장된 유효한 배열 → 동일 배열 반환", () => {
    const mem = createMemoryStorage();
    const store = createPaletteStore(mem);
    const input = ["#111111", "#222222", "#333333", "#444444", "#555555"];
    store.saveColors(input);
    const loaded = store.loadColors();
    assert.deepEqual(loaded, input);
  });

  test("loadColors: 깨진 JSON → DEFAULT_COLORS fallback", () => {
    const mem = createMemoryStorage();
    mem.setItem(PALETTE_KEY, "not-json{{{");
    const store = createPaletteStore(mem);
    assert.deepEqual(store.loadColors(), DEFAULT_COLORS);
  });

  test("loadColors: 5개가 아닌 배열 → DEFAULT_COLORS fallback", () => {
    const mem = createMemoryStorage();
    // 4개
    mem.setItem(PALETTE_KEY, JSON.stringify(["#111111", "#222222", "#333333", "#444444"]));
    const store = createPaletteStore(mem);
    assert.deepEqual(store.loadColors(), DEFAULT_COLORS, "4개 배열");

    // 6개
    mem.setItem(
      PALETTE_KEY,
      JSON.stringify(["#111111", "#222222", "#333333", "#444444", "#555555", "#666666"]),
    );
    assert.deepEqual(store.loadColors(), DEFAULT_COLORS, "6개 배열");
  });

  test("loadColors: 유효하지 않은 HEX 포함 배열 → DEFAULT_COLORS fallback", () => {
    const mem = createMemoryStorage();
    mem.setItem(
      PALETTE_KEY,
      JSON.stringify(["#111111", "invalid", "#333333", "#444444", "#555555"]),
    );
    const store = createPaletteStore(mem);
    assert.deepEqual(store.loadColors(), DEFAULT_COLORS);
  });

  test("loadColors: null 값 포함 배열 → DEFAULT_COLORS fallback", () => {
    const mem = createMemoryStorage();
    mem.setItem(
      PALETTE_KEY,
      JSON.stringify(["#111111", null, "#333333", "#444444", "#555555"]),
    );
    const store = createPaletteStore(mem);
    assert.deepEqual(store.loadColors(), DEFAULT_COLORS);
  });

  test("saveColors: 유효한 5개 HEX 배열 → bf-palette 키에 JSON 저장", () => {
    const mem = createMemoryStorage();
    const store = createPaletteStore(mem);
    const colors = ["#aaaaaa", "#bbbbbb", "#cccccc", "#dddddd", "#eeeeee"];
    store.saveColors(colors);
    const raw = mem.getItem(PALETTE_KEY);
    assert.ok(raw != null, "bf-palette 키에 값 없음");
    const parsed = JSON.parse(raw);
    assert.deepEqual(parsed, colors);
  });

  test("saveColors: 배열이 아닌 값 → throw", () => {
    const mem = createMemoryStorage();
    const store = createPaletteStore(mem);
    assert.throws(() => store.saveColors(null), /colors/);
    assert.throws(() => store.saveColors("string"), /colors/);
    assert.throws(() => store.saveColors(42), /colors/);
  });

  test("saveColors: 5개가 아닌 배열 → throw", () => {
    const mem = createMemoryStorage();
    const store = createPaletteStore(mem);
    assert.throws(() => store.saveColors(["#111111", "#222222"]), /colors/);
    assert.throws(
      () =>
        store.saveColors([
          "#111111",
          "#222222",
          "#333333",
          "#444444",
          "#555555",
          "#666666",
        ]),
      /colors/,
    );
  });

  test("saveColors: 유효하지 않은 HEX 포함 → throw", () => {
    const mem = createMemoryStorage();
    const store = createPaletteStore(mem);
    assert.throws(
      () => store.saveColors(["#111111", "bad", "#333333", "#444444", "#555555"]),
      /colors\[1\]|HEX/,
    );
  });

  // ─────────────────────────────────────────
  // 7. saveColor — 단일 슬롯 변경
  // ─────────────────────────────────────────

  test("saveColor: 단일 슬롯 변경 후 loadColors 에 반영됨", () => {
    const mem = createMemoryStorage();
    const store = createPaletteStore(mem);
    // 초기 저장
    store.saveColors(["#111111", "#222222", "#333333", "#444444", "#555555"]);
    // 슬롯 2 변경
    store.saveColor(2, "#aabbcc");
    const loaded = store.loadColors();
    assert.equal(loaded[2], "#aabbcc", "슬롯 2 변경 미반영");
    // 나머지는 그대로
    assert.equal(loaded[0], "#111111");
    assert.equal(loaded[1], "#222222");
    assert.equal(loaded[3], "#444444");
    assert.equal(loaded[4], "#555555");
  });

  test("saveColor: 슬롯 0 + 슬롯 4 경계 변경", () => {
    const mem = createMemoryStorage();
    const store = createPaletteStore(mem);
    store.saveColor(0, "#010101");
    assert.equal(store.loadColors()[0], "#010101");
    store.saveColor(4, "#fefefe");
    assert.equal(store.loadColors()[4], "#fefefe");
  });

  test("saveColor: index 범위 밖 → throw", () => {
    const mem = createMemoryStorage();
    const store = createPaletteStore(mem);
    assert.throws(() => store.saveColor(-1, "#111111"), /index/);
    assert.throws(() => store.saveColor(5, "#111111"), /index/);
    assert.throws(() => store.saveColor(2.5, "#111111"), /index/);
    assert.throws(() => store.saveColor("2", "#111111"), /index/);
  });

  test("saveColor: 유효하지 않은 HEX → throw", () => {
    const mem = createMemoryStorage();
    const store = createPaletteStore(mem);
    assert.throws(() => store.saveColor(0, "bad"), /HEX|hex/i);
    assert.throws(() => store.saveColor(0, ""), /HEX|hex/i);
    assert.throws(() => store.saveColor(0, null), /HEX|hex/i);
  });

  // ─────────────────────────────────────────
  // 8. loadTheme / saveTheme
  // ─────────────────────────────────────────

  test("loadTheme: 저장값 없으면 null", () => {
    const mem = createMemoryStorage();
    const store = createPaletteStore(mem);
    assert.equal(store.loadTheme(), null);
  });

  test("loadTheme / saveTheme: bf-theme 키로 공유 저장", () => {
    const mem = createMemoryStorage();
    const store = createPaletteStore(mem);
    store.saveTheme("dark");
    assert.equal(mem.getItem("bf-theme"), "dark");
    assert.equal(store.loadTheme(), "dark");

    store.saveTheme("light");
    assert.equal(store.loadTheme(), "light");
  });

  test("saveTheme: 유효하지 않은 값 → throw", () => {
    const mem = createMemoryStorage();
    const store = createPaletteStore(mem);
    assert.throws(() => store.saveTheme("auto"), /theme/);
    assert.throws(() => store.saveTheme(""), /theme/);
    assert.throws(() => store.saveTheme(null), /theme/);
  });

  // ─────────────────────────────────────────
  // 9. prefix 격리
  // ─────────────────────────────────────────

  test("prefix 격리: 다른 SPA 의 키는 무시 / 침범하지 않음", () => {
    const mem = createMemoryStorage();
    mem.setItem("clicker:score", "42");
    mem.setItem("notepad:items", "[]");
    mem.setItem("timer:last", "{}");
    mem.setItem("pomodoro:state", "{}");
    mem.setItem("weather:__sort__", "city-asc");
    mem.setItem("kanban:cards", "[]");
    mem.setItem("bf-theme", "dark");

    const store = createPaletteStore(mem);

    // 다른 prefix 가 있어도 palette default
    assert.deepEqual(store.loadColors(), DEFAULT_COLORS, "다른 SPA 키가 있어도 default 반환");

    // bf-theme 는 공유 — 읽을 수 있어야 함
    assert.equal(store.loadTheme(), "dark");

    // saveColors 해도 다른 키 보존
    store.saveColors(["#111111", "#222222", "#333333", "#444444", "#555555"]);
    assert.equal(mem.getItem("clicker:score"), "42", "clicker:score 침범");
    assert.equal(mem.getItem("notepad:items"), "[]", "notepad:items 침범");
    assert.equal(mem.getItem("timer:last"), "{}", "timer:last 침범");
    assert.equal(mem.getItem("pomodoro:state"), "{}", "pomodoro:state 침범");
    assert.equal(mem.getItem("weather:__sort__"), "city-asc", "weather:__sort__ 침범");
    assert.equal(mem.getItem("kanban:cards"), "[]", "kanban:cards 침범");
    assert.equal(mem.getItem("bf-theme"), "dark", "bf-theme 침범");
  });

  test("bf-palette 키는 clicker/notepad/pomodoro 등 다른 SPA 키와 겹치지 않음", () => {
    assert.notEqual(PALETTE_KEY, "clicker:score");
    assert.notEqual(PALETTE_KEY, "notepad:items");
    assert.notEqual(PALETTE_KEY, "pomodoro:state");
    assert.notEqual(PALETTE_KEY, "timer:last");
    assert.notEqual(PALETTE_KEY, "bf-theme");
  });

  // ─────────────────────────────────────────
  // 10. AC 시나리오 — 수용 기준 정확 매핑
  // ─────────────────────────────────────────

  test("AC: 컬러 변경 후 새 store 인스턴스 (= 새로고침) 에서 복원 (bf-palette round-trip)", () => {
    const mem = createMemoryStorage();
    const store1 = createPaletteStore(mem);

    // 사용자가 슬롯 1 을 변경
    store1.saveColor(1, "#ff6b6b");
    store1.saveColor(3, "#4ecdc4");

    // 새 store (= 새로고침 시뮬)
    const store2 = createPaletteStore(mem);
    const colors = store2.loadColors();
    assert.equal(colors[1], "#ff6b6b", "슬롯 1 복원 실패");
    assert.equal(colors[3], "#4ecdc4", "슬롯 3 복원 실패");
  });

  test("AC: 전체 팔레트 저장 후 새로고침 복원", () => {
    const mem = createMemoryStorage();
    const store1 = createPaletteStore(mem);
    const custom = ["#aaa111", "#bbb222", "#ccc333", "#ddd444", "#eee555"];
    store1.saveColors(custom);

    // 새 store = 새로고침
    const store2 = createPaletteStore(mem);
    assert.deepEqual(store2.loadColors(), custom);
  });

  test("AC: bf-theme 새로고침 후 유지 (다른 SPA 와 공유 키 확인)", () => {
    const mem = createMemoryStorage();
    const store1 = createPaletteStore(mem);
    store1.saveTheme("light");

    // 새 store = 새로고침
    const store2 = createPaletteStore(mem);
    assert.equal(store2.loadTheme(), "light");
  });

  test("createPaletteStore: storage 인자 없으면 (브라우저 외 환경) throw", () => {
    const originalLS = globalThis.localStorage;
    delete globalThis.localStorage;
    try {
      assert.throws(() => createPaletteStore(), /storage/);
    } finally {
      if (originalLS !== undefined) globalThis.localStorage = originalLS;
    }
  });
}
