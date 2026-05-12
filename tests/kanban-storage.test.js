// BF-427 · kanban/storage.js (non-module IIFE) 단위 검증
// - kanban/storage.js 는 `<script src>` 로 브라우저에 로드되도록 IIFE 로 작성됨.
// - node 에서는 import 불가 → fs 로 읽고 vm sandbox 평가 후 sandbox.window.KanbanStorage 추출.
// - sandbox 에는 in-memory storage 를 localStorage 로 주입하여 영속화 동작 검증.

import { test } from "node:test";
import assert from "node:assert";
// non-strict assert 사용 — vm sandbox 가 별 realm 이라
// Array / Object prototype 이 호스트와 달라 deepStrictEqual 에서 reference-equal fail 발생.
// deepEqual (loose) 은 구조 동등성만 검사.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORAGE_PATH = join(HERE, "..", "kanban", "storage.js");
const STORAGE_SRC = readFileSync(STORAGE_PATH, "utf8");

/** kanban/storage.js 를 fresh sandbox 에 로드하고 KanbanStorage 반환. */
function loadKanbanStorage() {
  const sandbox = { window: {}, globalThis: {} };
  vm.createContext(sandbox);
  // IIFE 는 window 를 global 로 받음 — sandbox.window 가 그 역할
  vm.runInContext(STORAGE_SRC, sandbox);
  return sandbox.window.KanbanStorage;
}

test("KanbanStorage namespace 가 노출되고 필수 export 가 모두 존재", () => {
  const KS = loadKanbanStorage();
  assert.ok(KS, "KanbanStorage 가 노출되어야 함");
  assert.equal(typeof KS.ulid, "function");
  assert.equal(typeof KS.createMemoryStorage, "function");
  assert.equal(typeof KS.createKanbanStore, "function");
  assert.equal(typeof KS.readTheme, "function");
  assert.equal(typeof KS.writeTheme, "function");
  assert.equal(KS.CARD_PREFIX, "kanban:");
  assert.equal(KS.THEME_KEY, "bf-theme");
  assert.deepEqual(KS.DEFAULT_COLUMNS, ["todo", "in-progress", "done"]);
});

test("ulid: 26자 + Crockford base32 만 사용 + 시간 prefix 정렬 가능", () => {
  const { ulid } = loadKanbanStorage();
  const a = ulid(1000);
  const b = ulid(2000);
  assert.equal(a.length, 26);
  assert.equal(b.length, 26);
  assert.match(a, /^[0-9A-HJKMNP-TV-Z]{26}$/);
  // 시간이 더 늦으면 사전순으로 더 큼 (앞 10자 비교)
  assert.ok(b.slice(0, 10) > a.slice(0, 10));
});

test("createKanbanStore: saveCard / getCard / removeCard / listCards 라운드트립", () => {
  const KS = loadKanbanStorage();
  const mem = KS.createMemoryStorage();
  const store = KS.createKanbanStore(mem);

  const c1 = { id: "C1", title: "우유 사기", createdAt: 1 };
  const c2 = { id: "C2", title: "디자인 정리", createdAt: 2 };
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

test("createKanbanStore: saveOrder / loadOrder 라운드트립 + sanitize", () => {
  const KS = loadKanbanStorage();
  const mem = KS.createMemoryStorage();
  const store = KS.createKanbanStore(mem);

  // 누락된 컬럼은 빈 배열로 채워짐
  store.saveOrder({ todo: ["A", "B"] });
  const loaded = store.loadOrder();
  assert.deepEqual(loaded, { todo: ["A", "B"], "in-progress": [], done: [] });
});

test("loadBoard: order 없으면 모든 카드를 To Do 에 createdAt 오름차순으로 배치", () => {
  const KS = loadKanbanStorage();
  const mem = KS.createMemoryStorage();
  const store = KS.createKanbanStore(mem);

  store.saveCard({ id: "C-late", title: "나중", createdAt: 200 });
  store.saveCard({ id: "C-early", title: "먼저", createdAt: 100 });

  const board = store.loadBoard();
  assert.deepEqual(board.order.todo, ["C-early", "C-late"]);
  assert.deepEqual(board.order["in-progress"], []);
  assert.deepEqual(board.order.done, []);
  assert.equal(board.cards["C-early"].title, "먼저");
});

test("loadBoard: order 의 사라진 card id 는 제거되고, 미배치 card 는 To Do 끝에 부착", () => {
  const KS = loadKanbanStorage();
  const mem = KS.createMemoryStorage();
  const store = KS.createKanbanStore(mem);

  // card 2건 저장
  store.saveCard({ id: "X1", title: "A", createdAt: 1 });
  store.saveCard({ id: "X2", title: "B", createdAt: 2 });
  // order 에는 X1 만 + 존재하지 않는 GHOST + (X2 미배치)
  store.saveOrder({
    todo: ["X1", "GHOST"],
    "in-progress": [],
    done: ["GHOST2"],
  });

  const board = store.loadBoard();
  // X1 유지, GHOST 제거
  assert.deepEqual(board.order.todo, ["X1", "X2"]); // X2 가 To Do 끝에 부착
  assert.deepEqual(board.order["in-progress"], []);
  assert.deepEqual(board.order.done, []);
});

test("loadBoard: 컬럼 간 이동 시나리오 — 새로고침 후 카드가 정확한 컬럼에 복원 (AC2)", () => {
  const KS = loadKanbanStorage();
  const mem = KS.createMemoryStorage();
  const store = KS.createKanbanStore(mem);

  // 사용자 시나리오: "우유 사기" 카드를 To Do 에 추가 → In Progress 로 이동
  const milk = { id: "M1", title: "우유 사기", createdAt: 100 };
  store.saveCard(milk);
  store.saveOrder({ todo: [], "in-progress": ["M1"], done: [] });

  // 새로고침 시뮬레이션: 같은 storage 로 새 store 인스턴스 생성
  const store2 = KS.createKanbanStore(mem);
  const board = store2.loadBoard();
  assert.deepEqual(board.order["in-progress"], ["M1"]);
  assert.equal(board.cards["M1"].title, "우유 사기");
  assert.deepEqual(board.order.todo, []);
  assert.deepEqual(board.order.done, []);
});

test("clearAll: kanban: prefix 만 삭제 (다른 SPA 키 보호)", () => {
  const KS = loadKanbanStorage();
  const mem = KS.createMemoryStorage();
  const store = KS.createKanbanStore(mem);

  store.saveCard({ id: "K1", title: "kanban 카드", createdAt: 1 });
  store.saveOrder({ todo: ["K1"], "in-progress": [], done: [] });
  // 다른 SPA 의 키
  mem.setItem("notepad:N1", JSON.stringify({ id: "N1", body: "메모" }));
  mem.setItem("bf-theme", "light");

  store.clearAll();

  assert.equal(mem.getItem("kanban:K1"), null);
  assert.equal(mem.getItem("kanban:__order__"), null);
  assert.equal(
    mem.getItem("notepad:N1"),
    JSON.stringify({ id: "N1", body: "메모" }),
  );
  assert.equal(mem.getItem("bf-theme"), "light");
});

test("createKanbanStore: 깨진 JSON entry 는 listCards 에서 조용히 건너뜀", () => {
  const KS = loadKanbanStorage();
  const mem = KS.createMemoryStorage();
  // 직접 깨진 값 주입
  mem.setItem("kanban:BROKEN", "{not-json");
  mem.setItem(
    "kanban:OK",
    JSON.stringify({ id: "OK", title: "정상", createdAt: 1 }),
  );

  const store = KS.createKanbanStore(mem);
  const list = store.listCards();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, "OK");
});

test("file:// 호환: storage.js 소스에 import / export / fetch / type=module / 외부 CDN 0건", () => {
  // Task AC4 — 소스 정적 검사
  // 정책 명시용 주석 (// 또는 *  형식) 라인 제거 후 코드 라인만 검사
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
