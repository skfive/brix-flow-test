// BF-448 · 주사위 SPA storage 추상 단위 테스트
// 명세: docs/design/dice-BF-446.md
// 작업 AC (BF-448):
//   - dice: prefix get/set/clear 동작
//   - 1~5개 주사위 굴림 (각 1~6 랜덤)
//   - 합계 / 평균 / 최대값
//   - 최근 10건 히스토리 cap
//   - 클릭 재표시 (history entry 보존 형식)
//   - 전체 삭제 확인 모달 (storage 수준에서는 clearAll/clearHistory 호출 검증)
//   - bf-theme 공유 (prefix 밖)
//
// dice/ 는 비-module (UMD) — createRequire 로 로드 (clicker/weather/pomodoro 와 동일 패턴).

import { test } from "node:test";
import assert from "node:assert";
import { createRequire } from "node:module";

// brix-flow-test-scope-guard — focused scope 에서 자기 module 외 skip
const _BRIX_MY_MODULE = "dice";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const require = createRequire(import.meta.url);
const Storage = require("../dice/storage.js");

const {
  DICE_PREFIX,
  DICE_HISTORY_KEY,
  DICE_COUNT_KEY,
  DICE_THEME_KEY,
  DICE_HISTORY_CAP,
  DICE_COUNT_MIN,
  DICE_COUNT_MAX,
  DICE_COUNT_DEFAULT,
  createMemoryStorage,
  createDiceStore,
} = Storage;

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ──────────────────────────────────────────────────────────
  // contract: 상수 노출
  // ──────────────────────────────────────────────────────────

  test("상수 노출: prefix · key 들 · cap · range 명확 (테스트 contract)", () => {
    assert.equal(DICE_PREFIX, "dice:");
    assert.equal(DICE_HISTORY_KEY, "dice:history");
    assert.equal(DICE_COUNT_KEY, "dice:count");
    // bf-theme 는 prefix 밖 — 다른 SPA 와 공유 (명세 §6.5)
    assert.equal(DICE_THEME_KEY, "bf-theme");
    // 작업 AC: 최근 10건 cap
    assert.equal(DICE_HISTORY_CAP, 10);
    // 작업 description: 1~5개 가변
    assert.equal(DICE_COUNT_MIN, 1);
    assert.equal(DICE_COUNT_MAX, 5);
    // default 는 design spec §1.3 의 "2개 주사위" 와 호환되는 값
    assert.equal(DICE_COUNT_DEFAULT, 2);
  });

  // ──────────────────────────────────────────────────────────
  // memoryStorage (clicker/weather 와 동일 패턴)
  // ──────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────
  // diceCount (1~5 가변)
  // ──────────────────────────────────────────────────────────

  test("loadDiceCount: 저장값 없으면 default 2 (design spec §1.3 2개 주사위)", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    assert.equal(store.loadDiceCount(), DICE_COUNT_DEFAULT);
  });

  test("saveDiceCount: 정수 1~5 round-trip (prefix 격리)", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    for (let n = 1; n <= 5; n += 1) {
      store.saveDiceCount(n);
      assert.equal(mem.getItem(DICE_COUNT_KEY), String(n));
      assert.equal(store.loadDiceCount(), n);
    }
  });

  test("saveDiceCount: 범위 밖 (0 / 6 / 소수 / 문자열 / null) throw", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    assert.throws(() => store.saveDiceCount(0), /count/);
    assert.throws(() => store.saveDiceCount(6), /count/);
    assert.throws(() => store.saveDiceCount(2.5), /count/);
    assert.throws(() => store.saveDiceCount("3"), /count/);
    assert.throws(() => store.saveDiceCount(null), /count/);
    assert.throws(() => store.saveDiceCount(NaN), /count/);
  });

  test("loadDiceCount: 깨진 값 (범위 밖 · 문자) 는 default 2 로 fallback (silent)", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);

    mem.setItem(DICE_COUNT_KEY, "abc");
    assert.equal(store.loadDiceCount(), DICE_COUNT_DEFAULT);

    mem.setItem(DICE_COUNT_KEY, "0");
    assert.equal(store.loadDiceCount(), DICE_COUNT_DEFAULT);

    mem.setItem(DICE_COUNT_KEY, "6");
    assert.equal(store.loadDiceCount(), DICE_COUNT_DEFAULT);

    mem.setItem(DICE_COUNT_KEY, "-1");
    assert.equal(store.loadDiceCount(), DICE_COUNT_DEFAULT);
  });

  // ──────────────────────────────────────────────────────────
  // history (단일 굴림 entry — id / rolls / sum / avg / max / ts)
  // ──────────────────────────────────────────────────────────

  test("loadHistory: 저장값 없으면 빈 배열 (default)", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    assert.deepEqual(store.loadHistory(), []);
  });

  test("pushRoll: entry 1건 push 후 head 에 존재 + storage round-trip", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    const entry = { id: 1, rolls: [3, 5], sum: 8, avg: 4, max: 5, ts: 1000 };
    const after = store.pushRoll(entry);
    assert.equal(after.length, 1);
    assert.deepEqual(after[0], entry);

    // round-trip — 새 store 로 같은 storage 읽기
    const store2 = createDiceStore(mem);
    assert.deepEqual(store2.loadHistory(), [entry]);
  });

  test("pushRoll: 최신이 head — 시간순 내림차순 (history compact row 정렬 §4.6)", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    store.pushRoll({ id: 1, rolls: [1, 2], sum: 3, avg: 1.5, max: 2, ts: 1000 });
    store.pushRoll({ id: 2, rolls: [3, 4], sum: 7, avg: 3.5, max: 4, ts: 2000 });
    store.pushRoll({ id: 3, rolls: [5, 6], sum: 11, avg: 5.5, max: 6, ts: 3000 });
    const h = store.loadHistory();
    assert.equal(h.length, 3);
    assert.equal(h[0].id, 3, "최신 (id=3) 이 head");
    assert.equal(h[1].id, 2);
    assert.equal(h[2].id, 1);
  });

  test("pushRoll: 11번째 push 시 가장 오래된 1건 잘림 — 최근 10건 cap (작업 AC)", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    // 1~11 누적 push
    for (let i = 1; i <= 11; i += 1) {
      store.pushRoll({
        id: i,
        rolls: [1],
        sum: 1,
        avg: 1,
        max: 1,
        ts: 1000 * i,
      });
    }
    const h = store.loadHistory();
    assert.equal(h.length, DICE_HISTORY_CAP, "history 는 10건 cap");
    // 최신 (id=11) 이 head, 가장 오래된 (id=1) 은 잘려야 함
    assert.equal(h[0].id, 11);
    assert.equal(h[h.length - 1].id, 2);
    // id=1 은 잘렸음
    assert.equal(h.some((e) => e.id === 1), false, "id=1 잘림");
  });

  test("pushRoll: 50건 누적 push 해도 storage 는 10건만 (cap 지속)", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    for (let i = 1; i <= 50; i += 1) {
      store.pushRoll({
        id: i,
        rolls: [Math.min(6, i % 6 + 1)],
        sum: 1,
        avg: 1,
        max: 1,
        ts: 1000 * i,
      });
    }
    const h = store.loadHistory();
    assert.equal(h.length, DICE_HISTORY_CAP);
    assert.equal(h[0].id, 50, "최신이 head");
    assert.equal(h[9].id, 41, "10건 중 가장 오래된 것은 id=41");
  });

  test("pushRoll: 1~5개 가변 dice rolls 모두 허용 (작업 AC: 1~5개)", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    store.pushRoll({ id: 1, rolls: [3], sum: 3, avg: 3, max: 3, ts: 1 });
    store.pushRoll({
      id: 2,
      rolls: [1, 2, 3, 4, 5],
      sum: 15,
      avg: 3,
      max: 5,
      ts: 2,
    });
    const h = store.loadHistory();
    assert.equal(h[0].rolls.length, 5);
    assert.equal(h[1].rolls.length, 1);
  });

  test("pushRoll: 잘못된 entry (rolls 비배열·길이 0·6 초과·1~6 밖·정수 아님) throw", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    assert.throws(
      () => store.pushRoll({ id: 1, rolls: "not array", sum: 0, avg: 0, max: 0, ts: 0 }),
      /rolls/,
    );
    assert.throws(
      () => store.pushRoll({ id: 1, rolls: [], sum: 0, avg: 0, max: 0, ts: 0 }),
      /rolls/,
    );
    assert.throws(
      () =>
        store.pushRoll({
          id: 1,
          rolls: [1, 2, 3, 4, 5, 6],
          sum: 21,
          avg: 3.5,
          max: 6,
          ts: 0,
        }),
      /rolls/,
    );
    assert.throws(
      () => store.pushRoll({ id: 1, rolls: [0, 2], sum: 2, avg: 1, max: 2, ts: 0 }),
      /rolls/,
    );
    assert.throws(
      () => store.pushRoll({ id: 1, rolls: [7], sum: 7, avg: 7, max: 7, ts: 0 }),
      /rolls/,
    );
    assert.throws(
      () => store.pushRoll({ id: 1, rolls: [1.5], sum: 1.5, avg: 1.5, max: 1.5, ts: 0 }),
      /rolls/,
    );
  });

  test("pushRoll: 잘못된 id / ts (정수 아님 / 음수) throw", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    assert.throws(
      () => store.pushRoll({ id: 0, rolls: [1], sum: 1, avg: 1, max: 1, ts: 0 }),
      /id/,
      "id 는 양의 정수 (≥1)",
    );
    assert.throws(
      () => store.pushRoll({ id: -1, rolls: [1], sum: 1, avg: 1, max: 1, ts: 0 }),
      /id/,
    );
    assert.throws(
      () => store.pushRoll({ id: 1.5, rolls: [1], sum: 1, avg: 1, max: 1, ts: 0 }),
      /id/,
    );
    assert.throws(
      () => store.pushRoll({ id: 1, rolls: [1], sum: 1, avg: 1, max: 1, ts: -1 }),
      /ts/,
    );
  });

  test("loadHistory: 깨진 JSON (parse 실패) 은 빈 배열 fallback (silent)", () => {
    const mem = createMemoryStorage();
    mem.setItem(DICE_HISTORY_KEY, "{not valid json");
    const store = createDiceStore(mem);
    assert.deepEqual(store.loadHistory(), []);
  });

  test("loadHistory: 배열 아닌 JSON (객체·문자열·숫자) 도 빈 배열 fallback", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);

    mem.setItem(DICE_HISTORY_KEY, '{"a": 1}');
    assert.deepEqual(store.loadHistory(), []);

    mem.setItem(DICE_HISTORY_KEY, '"foo"');
    assert.deepEqual(store.loadHistory(), []);

    mem.setItem(DICE_HISTORY_KEY, "42");
    assert.deepEqual(store.loadHistory(), []);
  });

  test("loadHistory: 배열 내 깨진 entry 는 silent skip (전체 폐기 X)", () => {
    const mem = createMemoryStorage();
    const valid = { id: 2, rolls: [3, 5], sum: 8, avg: 4, max: 5, ts: 1000 };
    // 1번 entry 는 rolls 누락, 2번은 정상, 3번은 id 깨짐
    mem.setItem(
      DICE_HISTORY_KEY,
      JSON.stringify([
        { id: 1, sum: 0 },
        valid,
        { id: "x", rolls: [1], sum: 1, avg: 1, max: 1, ts: 1 },
      ]),
    );
    const store = createDiceStore(mem);
    const h = store.loadHistory();
    assert.equal(h.length, 1, "정상 entry 1건만 통과");
    assert.deepEqual(h[0], valid);
  });

  test("loadHistory: 저장 cap 초과 (악의·옛 버전) 도 load 시 10건으로 절단", () => {
    const mem = createMemoryStorage();
    const arr = [];
    for (let i = 1; i <= 20; i += 1) {
      arr.push({ id: i, rolls: [1], sum: 1, avg: 1, max: 1, ts: i });
    }
    // 큰 → 작은 순서로 저장 (head = 최신)
    arr.reverse();
    mem.setItem(DICE_HISTORY_KEY, JSON.stringify(arr));
    const store = createDiceStore(mem);
    assert.equal(store.loadHistory().length, DICE_HISTORY_CAP);
  });

  test("clearHistory: 삭제 후 loadHistory() === []", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    store.pushRoll({ id: 1, rolls: [3, 5], sum: 8, avg: 4, max: 5, ts: 1 });
    store.clearHistory();
    assert.deepEqual(store.loadHistory(), []);
    assert.equal(mem.getItem(DICE_HISTORY_KEY), null);
  });

  // ──────────────────────────────────────────────────────────
  // clearAll (history + count 모두 — theme 보존)
  // ──────────────────────────────────────────────────────────

  test("clearAll: history + count 동시 삭제 (theme 은 보존 — bf-theme 공유)", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    store.saveDiceCount(4);
    store.pushRoll({ id: 1, rolls: [1, 2, 3, 4], sum: 10, avg: 2.5, max: 4, ts: 1 });
    store.saveTheme("light");

    store.clearAll();

    assert.deepEqual(store.loadHistory(), []);
    assert.equal(store.loadDiceCount(), DICE_COUNT_DEFAULT, "count 도 default 로 복귀");
    assert.equal(mem.getItem(DICE_HISTORY_KEY), null);
    assert.equal(mem.getItem(DICE_COUNT_KEY), null);
    // theme 은 보존 — 다른 SPA 와 공유 (명세 §6.5)
    assert.equal(store.loadTheme(), "light");
  });

  // ──────────────────────────────────────────────────────────
  // theme (bf-theme 공유)
  // ──────────────────────────────────────────────────────────

  test("loadTheme / saveTheme: bf-theme 키 공유 (다른 SPA 와 공통)", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);

    assert.equal(store.loadTheme(), null);

    store.saveTheme("dark");
    assert.equal(mem.getItem("bf-theme"), "dark");
    assert.equal(store.loadTheme(), "dark");

    store.saveTheme("light");
    assert.equal(store.loadTheme(), "light");

    // 다른 페이지의 저장값 보호 — 잘못된 enum 은 reject
    assert.throws(() => store.saveTheme("auto"), /theme/);
    assert.throws(() => store.saveTheme(""), /theme/);
    assert.throws(() => store.saveTheme(null), /theme/);
  });

  // ──────────────────────────────────────────────────────────
  // prefix 격리 (다른 SPA 와 충돌 0)
  // ──────────────────────────────────────────────────────────

  test("prefix 격리: 다른 SPA 의 키는 무시 (notepad/timer/stopwatch/pomodoro/clicker/weather/kanban 와 충돌 0)", () => {
    const mem = createMemoryStorage();
    mem.setItem("notepad:list", "[]");
    mem.setItem("timer:last", JSON.stringify({ minutes: 5, seconds: 0 }));
    mem.setItem("stopwatch:laps", "[]");
    mem.setItem("kanban:cards", "[]");
    mem.setItem("pomodoro:state", "{}");
    mem.setItem("clicker:score", "42");
    mem.setItem("clicker:best", "100");
    mem.setItem("weather:__sort__", "city-asc");
    mem.setItem("bf-theme", "dark");

    const store = createDiceStore(mem);
    // 다른 prefix 가 있어도 dice default 는 빈 history / count default
    assert.deepEqual(store.loadHistory(), []);
    assert.equal(store.loadDiceCount(), DICE_COUNT_DEFAULT);
    // bf-theme 는 공유 — 읽을 수 있어야 함
    assert.equal(store.loadTheme(), "dark");

    // dice 가 save 해도 다른 키는 건드리지 않음
    store.saveDiceCount(3);
    store.pushRoll({ id: 1, rolls: [1, 2, 3], sum: 6, avg: 2, max: 3, ts: 1 });

    assert.equal(mem.getItem("notepad:list"), "[]");
    assert.equal(mem.getItem("timer:last"), JSON.stringify({ minutes: 5, seconds: 0 }));
    assert.equal(mem.getItem("stopwatch:laps"), "[]");
    assert.equal(mem.getItem("kanban:cards"), "[]");
    assert.equal(mem.getItem("pomodoro:state"), "{}");
    assert.equal(mem.getItem("clicker:score"), "42");
    assert.equal(mem.getItem("clicker:best"), "100");
    assert.equal(mem.getItem("weather:__sort__"), "city-asc");

    // clearAll 도 자기 prefix 만 — 다른 SPA / theme 보존
    store.clearAll();
    assert.equal(mem.getItem("notepad:list"), "[]");
    assert.equal(mem.getItem("timer:last"), JSON.stringify({ minutes: 5, seconds: 0 }));
    assert.equal(mem.getItem("stopwatch:laps"), "[]");
    assert.equal(mem.getItem("kanban:cards"), "[]");
    assert.equal(mem.getItem("pomodoro:state"), "{}");
    assert.equal(mem.getItem("clicker:score"), "42");
    assert.equal(mem.getItem("clicker:best"), "100");
    assert.equal(mem.getItem("weather:__sort__"), "city-asc");
    assert.equal(mem.getItem("bf-theme"), "dark");
  });

  // ──────────────────────────────────────────────────────────
  // AC 시나리오: BF-448 수용 기준 정확 매핑
  // ──────────────────────────────────────────────────────────

  test("AC §2 시나리오: 1~5개 가변 굴림 5회 누적 — 합계 / 평균 / 최대값 보존 + 새로고침 복원", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    store.saveDiceCount(3);

    const entries = [
      { id: 1, rolls: [1, 2, 3], sum: 6, avg: 2, max: 3, ts: 1000 },
      { id: 2, rolls: [4, 5, 6], sum: 15, avg: 5, max: 6, ts: 2000 },
      { id: 3, rolls: [6, 6, 6], sum: 18, avg: 6, max: 6, ts: 3000 },
      { id: 4, rolls: [1, 1, 1], sum: 3, avg: 1, max: 1, ts: 4000 },
      { id: 5, rolls: [2, 4, 6], sum: 12, avg: 4, max: 6, ts: 5000 },
    ];
    for (const e of entries) store.pushRoll(e);

    // "새로고침" — 새 store 인스턴스로 같은 storage 읽기
    const store2 = createDiceStore(mem);
    assert.equal(store2.loadDiceCount(), 3);
    const h = store2.loadHistory();
    assert.equal(h.length, 5);
    // 최신이 head — id=5
    assert.equal(h[0].id, 5);
    assert.deepEqual(h[0].rolls, [2, 4, 6]);
    assert.equal(h[0].sum, 12);
    assert.equal(h[0].avg, 4);
    assert.equal(h[0].max, 6);
  });

  test("AC §3 시나리오: 최근 10건 cap — 12건 push 시 2건 잘림 (오래된 것)", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    for (let i = 1; i <= 12; i += 1) {
      store.pushRoll({
        id: i,
        rolls: [(i % 6) + 1],
        sum: (i % 6) + 1,
        avg: (i % 6) + 1,
        max: (i % 6) + 1,
        ts: 1000 * i,
      });
    }
    const h = store.loadHistory();
    assert.equal(h.length, DICE_HISTORY_CAP);
    assert.equal(h[0].id, 12, "최신");
    assert.equal(h[9].id, 3, "10건 중 가장 오래된 = id=3 (1, 2 잘림)");
  });

  test("AC: 전체 삭제 (clearAll) → 모든 통계·히스토리 초기 (storage 수준)", () => {
    const mem = createMemoryStorage();
    const store = createDiceStore(mem);
    store.saveDiceCount(5);
    for (let i = 1; i <= 7; i += 1) {
      store.pushRoll({
        id: i,
        rolls: [1, 2, 3, 4, 5],
        sum: 15,
        avg: 3,
        max: 5,
        ts: 1000 * i,
      });
    }
    assert.equal(store.loadHistory().length, 7);

    store.clearAll();

    // 새로고침 후에도 동일
    const store2 = createDiceStore(mem);
    assert.deepEqual(store2.loadHistory(), []);
    assert.equal(store2.loadDiceCount(), DICE_COUNT_DEFAULT);
  });

  test("createDiceStore: storage 인자 없으면 (브라우저 외 환경) throw", () => {
    const originalLocalStorage = globalThis.localStorage;
    delete globalThis.localStorage;
    try {
      assert.throws(() => createDiceStore(), /storage/);
    } finally {
      if (originalLocalStorage !== undefined) {
        globalThis.localStorage = originalLocalStorage;
      }
    }
  });
}
