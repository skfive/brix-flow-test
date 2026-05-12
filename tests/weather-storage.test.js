// BF-438 · weather/storage.js (non-module IIFE) 단위 검증
// - weather/storage.js 는 `<script src>` 로 브라우저에 로드되도록 IIFE 로 작성됨.
// - node 에서는 import 불가 → fs 로 읽고 vm sandbox 평가 후 sandbox.window.WeatherStorage 추출.
// - sandbox 에는 in-memory storage 를 localStorage 로 주입하여 영속화 동작 검증.

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORAGE_PATH = join(HERE, "..", "weather", "storage.js");
const STORAGE_SRC = readFileSync(STORAGE_PATH, "utf8");

/** weather/storage.js 를 fresh sandbox 에 로드하고 WeatherStorage 반환. */
function loadWeatherStorage() {
  const sandbox = { window: {}, globalThis: {} };
  vm.createContext(sandbox);
  vm.runInContext(STORAGE_SRC, sandbox);
  return sandbox.window.WeatherStorage;
}

test("WeatherStorage namespace 가 노출되고 필수 export 가 모두 존재", () => {
  const WS = loadWeatherStorage();
  assert.ok(WS, "WeatherStorage 가 노출되어야 함");
  assert.equal(typeof WS.ulid, "function");
  assert.equal(typeof WS.createMemoryStorage, "function");
  assert.equal(typeof WS.createWeatherStore, "function");
  assert.equal(typeof WS.readTheme, "function");
  assert.equal(typeof WS.writeTheme, "function");
  assert.equal(WS.CARD_PREFIX, "weather:");
  assert.equal(WS.SORT_KEY, "weather:__sort__");
  assert.equal(WS.THEME_KEY, "bf-theme");
  assert.equal(WS.DEFAULT_SORT, "updated-desc");
  assert.deepEqual(WS.VALID_SORTS, ["updated-desc", "city-asc"]);
  assert.deepEqual(WS.VALID_STATES, [
    "sunny",
    "cloudy",
    "rainy",
    "snowy",
    "thunder",
    "windy",
  ]);
});

test("ulid: 26자 + Crockford base32 + 시간 prefix 정렬 가능", () => {
  const { ulid } = loadWeatherStorage();
  const a = ulid(1000);
  const b = ulid(2000);
  assert.equal(a.length, 26);
  assert.equal(b.length, 26);
  assert.match(a, /^[0-9A-HJKMNP-TV-Z]{26}$/);
  assert.ok(b.slice(0, 10) > a.slice(0, 10));
});

test("createWeatherStore: saveCard / getCard / removeCard / listCards 라운드트립", () => {
  const WS = loadWeatherStorage();
  const mem = WS.createMemoryStorage();
  const store = WS.createWeatherStore(mem);

  const c1 = {
    id: "C1",
    city: "서울",
    emoji: "☀️",
    memo: "아침 공기 맑음",
    state: "sunny",
    createdAt: 100,
    updatedAt: 100,
  };
  const c2 = {
    id: "C2",
    city: "Tokyo",
    emoji: "☁️",
    memo: "",
    state: "cloudy",
    createdAt: 200,
    updatedAt: 200,
  };
  store.saveCard(c1);
  store.saveCard(c2);

  assert.deepEqual(store.getCard("C1"), c1);
  assert.deepEqual(store.getCard("C2"), c2);
  assert.equal(store.getCard("nope"), null);

  const list = store.listCards();
  assert.equal(list.length, 2);
  const ids = list.map((c) => c.id).sort();
  assert.deepEqual(ids, ["C1", "C2"]);

  store.removeCard("C1");
  assert.equal(store.getCard("C1"), null);
  assert.equal(store.listCards().length, 1);
});

test("saveCard: id 누락 또는 city 누락 시 throw", () => {
  const WS = loadWeatherStorage();
  const mem = WS.createMemoryStorage();
  const store = WS.createWeatherStore(mem);

  assert.throws(() => store.saveCard({ city: "x" }), /card\.id/);
  assert.throws(
    () => store.saveCard({ id: "X", city: "   " }),
    /card\.city/,
  );
  assert.throws(() => store.saveCard(null), /card\.id/);
});

test("saveSort / loadSort: 기본은 updated-desc, 유효값만 허용", () => {
  const WS = loadWeatherStorage();
  const mem = WS.createMemoryStorage();
  const store = WS.createWeatherStore(mem);

  assert.equal(store.loadSort(), "updated-desc"); // default
  store.saveSort("city-asc");
  assert.equal(store.loadSort(), "city-asc");
  store.saveSort("updated-desc");
  assert.equal(store.loadSort(), "updated-desc");

  assert.throws(() => store.saveSort("invalid"), /sort/);
});

test("loadSort: 깨진 raw 값은 default 로 복원 (silent recovery)", () => {
  const WS = loadWeatherStorage();
  const mem = WS.createMemoryStorage();
  mem.setItem("weather:__sort__", "garbage");
  const store = WS.createWeatherStore(mem);
  assert.equal(store.loadSort(), "updated-desc");
});

test("listSorted(updated-desc): updatedAt 내림차순 (없으면 createdAt fallback)", () => {
  const WS = loadWeatherStorage();
  const mem = WS.createMemoryStorage();
  const store = WS.createWeatherStore(mem);

  store.saveCard({ id: "A", city: "서울", createdAt: 100, updatedAt: 100 });
  store.saveCard({ id: "B", city: "Tokyo", createdAt: 200, updatedAt: 300 });
  store.saveCard({ id: "C", city: "London", createdAt: 150 }); // updatedAt 누락

  const sorted = store.listSorted("updated-desc");
  assert.deepEqual(
    sorted.map((c) => c.id),
    ["B", "C", "A"], // 300 > 150 > 100
  );
});

test("listSorted(city-asc): 도시명 가나다/알파벳 순", () => {
  const WS = loadWeatherStorage();
  const mem = WS.createMemoryStorage();
  const store = WS.createWeatherStore(mem);

  store.saveCard({ id: "A", city: "서울", createdAt: 100 });
  store.saveCard({ id: "B", city: "Tokyo", createdAt: 200 });
  store.saveCard({ id: "C", city: "London", createdAt: 150 });
  store.saveCard({ id: "D", city: "부산", createdAt: 250 });

  const sorted = store.listSorted("city-asc");
  // localeCompare 결과 — 영문이 먼저 (London, Tokyo) 그 다음 한글 (부산, 서울)
  // 정확한 순서는 환경의 default locale 에 의존하지만, 알파벳끼리 / 한글끼리 인접은 보장
  const ids = sorted.map((c) => c.id);
  // London < Tokyo (알파벳 순)
  assert.ok(ids.indexOf("C") < ids.indexOf("B"));
  // 부산 < 서울 (가나다 순)
  assert.ok(ids.indexOf("D") < ids.indexOf("A"));
});

test("listSorted: 정렬 인자 없으면 저장된 sort 사용", () => {
  const WS = loadWeatherStorage();
  const mem = WS.createMemoryStorage();
  const store = WS.createWeatherStore(mem);

  store.saveCard({ id: "A", city: "서울", createdAt: 100, updatedAt: 100 });
  store.saveCard({ id: "B", city: "Tokyo", createdAt: 200, updatedAt: 50 });

  // default updated-desc → A (100) → B (50)
  let sorted = store.listSorted();
  assert.deepEqual(
    sorted.map((c) => c.id),
    ["A", "B"],
  );

  // city-asc 저장 후 → Tokyo (B) → 서울 (A)
  store.saveSort("city-asc");
  sorted = store.listSorted();
  assert.deepEqual(
    sorted.map((c) => c.id),
    ["B", "A"],
  );
});

test("clearAll: weather: prefix 만 삭제 (다른 SPA 키 보호)", () => {
  const WS = loadWeatherStorage();
  const mem = WS.createMemoryStorage();
  const store = WS.createWeatherStore(mem);

  store.saveCard({ id: "W1", city: "서울", createdAt: 1 });
  store.saveSort("city-asc");
  // 다른 SPA 의 키
  mem.setItem("notepad:N1", JSON.stringify({ id: "N1", body: "메모" }));
  mem.setItem("kanban:K1", JSON.stringify({ id: "K1", title: "kb" }));
  mem.setItem("bf-theme", "light");

  store.clearAll();

  assert.equal(mem.getItem("weather:W1"), null);
  assert.equal(mem.getItem("weather:__sort__"), null);
  assert.equal(
    mem.getItem("notepad:N1"),
    JSON.stringify({ id: "N1", body: "메모" }),
  );
  assert.equal(
    mem.getItem("kanban:K1"),
    JSON.stringify({ id: "K1", title: "kb" }),
  );
  assert.equal(mem.getItem("bf-theme"), "light");
});

test("listCards: 깨진 JSON entry 와 prefix 만 같은 다른 entry 는 건너뜀", () => {
  const WS = loadWeatherStorage();
  const mem = WS.createMemoryStorage();
  mem.setItem("weather:BROKEN", "{not-json");
  mem.setItem("weather:__sort__", "city-asc"); // SORT_KEY 는 card 아님
  mem.setItem(
    "weather:OK",
    JSON.stringify({ id: "OK", city: "서울", createdAt: 1 }),
  );

  const store = WS.createWeatherStore(mem);
  const list = store.listCards();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, "OK");
});

test("listCards: city 필드 누락된 entry 는 건너뜀 (방어)", () => {
  const WS = loadWeatherStorage();
  const mem = WS.createMemoryStorage();
  mem.setItem(
    "weather:NOCITY",
    JSON.stringify({ id: "NOCITY", emoji: "☀️" }),
  );
  mem.setItem(
    "weather:OK",
    JSON.stringify({ id: "OK", city: "서울", createdAt: 1 }),
  );

  const store = WS.createWeatherStore(mem);
  const list = store.listCards();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, "OK");
});

test("file:// 호환: storage.js 소스에 import / export / fetch / type=module / 외부 CDN 0건", () => {
  // Task AC — 소스 정적 검사
  const codeOnly = STORAGE_SRC.split("\n")
    .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
    .join("\n");
  assert.ok(
    !/(^|;|\n)\s*import\s+[\w*{]/.test(codeOnly),
    "import 키워드가 코드에서 사용됨",
  );
  assert.ok(
    !/(^|;|\n)\s*export\s+(default|{|const|let|var|function|class|async)/.test(
      codeOnly,
    ),
    "export 키워드가 코드에서 사용됨",
  );
  assert.ok(!/\bfetch\s*\(/.test(codeOnly), "fetch() 가 사용됨");
  assert.ok(!/type\s*=\s*["']module["']/.test(codeOnly));
  assert.ok(
    !/https?:\/\/(cdn|fonts|unpkg|jsdelivr|cdnjs)/i.test(codeOnly),
    "외부 CDN 호스트 참조 발견",
  );
});
