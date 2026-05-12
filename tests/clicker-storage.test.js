// BF-443 · 클릭 카운터 SPA storage 추상 단위 테스트
// 명세: docs/design/clicker-BF-441.md §6.5 (bf-theme 공유)
// 작업 AC (BF-443):
//   - 클릭 5회 시 점수 5 + best 5
//   - 리셋 (현재 점수만 0, best 유지)
//   - 전체 초기화 (score + best 모두 0)
//   - 새로고침 후 복원
//   - prefix "clicker:" 격리 (다른 SPA 와 충돌 0)
//
// clicker/ 는 비-module (UMD) — createRequire 로 로드 (pomodoro/weather 와 동일 패턴).
// non-strict node:assert — Node 22 strict deepEqual reference 이슈 회피 (weather-storage 패턴).

import { test } from "node:test";
import assert from "node:assert";
import { createRequire } from "node:module";

// brix-flow-test-scope-guard — focused scope 에서 자기 module 외 skip
const _BRIX_MY_MODULE = "clicker";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const require = createRequire(import.meta.url);
const Storage = require("../clicker/storage.js");

const {
  CLICKER_PREFIX,
  CLICKER_SCORE_KEY,
  CLICKER_BEST_KEY,
  CLICKER_THEME_KEY,
  createMemoryStorage,
  createClickerStore,
} = Storage;

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  test("상수 노출: prefix · key 들 명확 (테스트 contract)", () => {
    assert.equal(CLICKER_PREFIX, "clicker:");
    assert.equal(CLICKER_SCORE_KEY, "clicker:score");
    assert.equal(CLICKER_BEST_KEY, "clicker:best");
    // bf-theme 는 prefix 밖 — 다른 SPA 와 공유 (명세 §6.5)
    assert.equal(CLICKER_THEME_KEY, "bf-theme");
  });

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

  test("saveScore: clicker:score 키에 정수 저장 (prefix 격리)", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);
    store.saveScore(42);
    assert.equal(mem.getItem(CLICKER_SCORE_KEY), "42");
  });

  test("loadScore: 저장값 없으면 0 (default, idempotent)", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);
    assert.equal(store.loadScore(), 0);
  });

  test("loadScore: 저장 후 동일 값 반환", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);
    store.saveScore(7);
    assert.equal(store.loadScore(), 7);
  });

  test("loadScore: 깨진 값 (문자/음수/NaN) 은 0 으로 fallback (silent)", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);

    mem.setItem(CLICKER_SCORE_KEY, "abc");
    assert.equal(store.loadScore(), 0, "문자열은 0 fallback");

    mem.setItem(CLICKER_SCORE_KEY, "-5");
    assert.equal(store.loadScore(), 0, "음수는 0 fallback");

    mem.setItem(CLICKER_SCORE_KEY, "NaN");
    assert.equal(store.loadScore(), 0, "NaN 은 0 fallback");
  });

  test("saveScore: 음수·소수·NaN·문자열은 throw (런타임 방어)", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);
    assert.throws(() => store.saveScore(-1), /score/);
    assert.throws(() => store.saveScore(3.5), /score/);
    assert.throws(() => store.saveScore(NaN), /score/);
    assert.throws(() => store.saveScore("5"), /score/);
    assert.throws(() => store.saveScore(null), /score/);
  });

  test("clearScore: 삭제 후 loadScore() === 0 (default)", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);
    store.saveScore(42);
    store.clearScore();
    assert.equal(store.loadScore(), 0);
    assert.equal(mem.getItem(CLICKER_SCORE_KEY), null);
  });

  test("saveBest / loadBest: best score round-trip", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);
    store.saveBest(100);
    assert.equal(mem.getItem(CLICKER_BEST_KEY), "100");
    assert.equal(store.loadBest(), 100);
  });

  test("loadBest: 저장값 없으면 0 (default)", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);
    assert.equal(store.loadBest(), 0);
  });

  test("saveBest: 음수·소수 throw", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);
    assert.throws(() => store.saveBest(-1), /best/);
    assert.throws(() => store.saveBest(1.5), /best/);
  });

  test("clearBest: 삭제 후 loadBest() === 0", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);
    store.saveBest(50);
    store.clearBest();
    assert.equal(store.loadBest(), 0);
  });

  test("clearAll: score + best 동시 삭제 (theme 은 보존)", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);
    store.saveScore(7);
    store.saveBest(7);
    store.saveTheme("light");
    store.clearAll();
    // score / best 모두 0 (= 저장 없음 default)
    assert.equal(store.loadScore(), 0);
    assert.equal(store.loadBest(), 0);
    assert.equal(mem.getItem(CLICKER_SCORE_KEY), null);
    assert.equal(mem.getItem(CLICKER_BEST_KEY), null);
    // theme 은 보존 — 다른 SPA 와 공유 (명세 §6.5)
    assert.equal(store.loadTheme(), "light");
  });

  test("loadTheme / saveTheme: bf-theme 키로 공유 저장 (다른 SPA 와 공통)", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);

    assert.equal(store.loadTheme(), null);

    store.saveTheme("dark");
    assert.equal(mem.getItem("bf-theme"), "dark");
    assert.equal(store.loadTheme(), "dark");

    store.saveTheme("light");
    assert.equal(store.loadTheme(), "light");

    // 다른 페이지의 저장값 보호 — 잘못된 enum 은 reject
    assert.throws(() => store.saveTheme("auto"), /theme/);
    assert.throws(() => store.saveTheme(""), /theme/);
  });

  test("prefix 격리: 다른 SPA 의 키는 무시 (notepad/timer/stopwatch/pomodoro/kanban/weather 와 충돌 0)", () => {
    const mem = createMemoryStorage();
    mem.setItem("notepad:list", "[]");
    mem.setItem("timer:last", JSON.stringify({ minutes: 5, seconds: 0 }));
    mem.setItem("stopwatch:laps", "[]");
    mem.setItem("kanban:cards", "[]");
    mem.setItem("pomodoro:state", "{}");
    mem.setItem("weather:__sort__", "city-asc");
    mem.setItem("bf-theme", "dark");

    const store = createClickerStore(mem);
    // 다른 prefix 가 있어도 clicker default 는 0
    assert.equal(store.loadScore(), 0);
    assert.equal(store.loadBest(), 0);
    // bf-theme 는 공유 — 읽을 수 있어야 함
    assert.equal(store.loadTheme(), "dark");

    // 본 store 가 save 해도 다른 키는 건드리지 않음
    store.saveScore(3);
    store.saveBest(3);
    assert.equal(mem.getItem("notepad:list"), "[]");
    assert.equal(mem.getItem("timer:last"), JSON.stringify({ minutes: 5, seconds: 0 }));
    assert.equal(mem.getItem("stopwatch:laps"), "[]");
    assert.equal(mem.getItem("kanban:cards"), "[]");
    assert.equal(mem.getItem("pomodoro:state"), "{}");
    assert.equal(mem.getItem("weather:__sort__"), "city-asc");

    // clearAll 도 자기 prefix 만 — 다른 SPA / theme 보존
    store.clearAll();
    assert.equal(mem.getItem("notepad:list"), "[]");
    assert.equal(mem.getItem("timer:last"), JSON.stringify({ minutes: 5, seconds: 0 }));
    assert.equal(mem.getItem("stopwatch:laps"), "[]");
    assert.equal(mem.getItem("kanban:cards"), "[]");
    assert.equal(mem.getItem("pomodoro:state"), "{}");
    assert.equal(mem.getItem("weather:__sort__"), "city-asc");
    assert.equal(mem.getItem("bf-theme"), "dark");
  });

  // ─────────────────────────────────────────
  // AC 시나리오: BF-443 수용 기준 정확 매핑
  // ─────────────────────────────────────────

  test("AC §1 시나리오 (a): 클릭 5회 → score 5, best 5 (storage round-trip)", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);
    // 시뮬: 클릭마다 score++ 후 save, best 갱신 시 save
    let score = 0;
    let best = 0;
    for (let i = 0; i < 5; i++) {
      score += 1;
      if (score > best) best = score;
      store.saveScore(score);
      store.saveBest(best);
    }
    // "새로고침" — 새 store 로 같은 storage 읽기
    const store2 = createClickerStore(mem);
    assert.equal(store2.loadScore(), 5);
    assert.equal(store2.loadBest(), 5);
  });

  test("AC §1 시나리오 (b): 리셋 후 score 0 / best 5 유지", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);
    store.saveScore(5);
    store.saveBest(5);
    // 리셋 — 현재 점수만 0
    store.saveScore(0);
    // (best 는 그대로)
    assert.equal(store.loadScore(), 0);
    assert.equal(store.loadBest(), 5);

    // 새로고침 후에도 동일
    const store2 = createClickerStore(mem);
    assert.equal(store2.loadScore(), 0);
    assert.equal(store2.loadBest(), 5);
  });

  test("AC §1 시나리오 (c): 전체 초기화 → score 0 / best 0", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);
    store.saveScore(5);
    store.saveBest(5);
    store.clearAll();
    assert.equal(store.loadScore(), 0);
    assert.equal(store.loadBest(), 0);

    // 새로고침 후에도 동일
    const store2 = createClickerStore(mem);
    assert.equal(store2.loadScore(), 0);
    assert.equal(store2.loadBest(), 0);
  });

  test("AC §1 시나리오 (d): 새로고침 후 복원 — saveScore/saveBest round-trip", () => {
    const mem = createMemoryStorage();
    const store = createClickerStore(mem);
    store.saveScore(42);
    store.saveBest(100);
    // 새 store 인스턴스로 동일 storage 읽기 = page reload 시뮬
    const store2 = createClickerStore(mem);
    assert.equal(store2.loadScore(), 42);
    assert.equal(store2.loadBest(), 100);
  });

  test("createClickerStore: storage 인자 없으면 (브라우저 외 환경) throw", () => {
    // Node 환경: globalThis.localStorage 가 없음 → 기본 인자 호출 시 throw
    const originalLocalStorage = globalThis.localStorage;
    // 안전 — 혹시 모를 폴리필 제거
    delete globalThis.localStorage;
    try {
      assert.throws(() => createClickerStore(), /storage/);
    } finally {
      if (originalLocalStorage !== undefined) {
        globalThis.localStorage = originalLocalStorage;
      }
    }
  });
}
