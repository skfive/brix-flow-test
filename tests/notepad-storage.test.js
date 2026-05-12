// BF-402 · localStorage 추상 utility 단위 테스트
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  NOTE_PREFIX,
  createMemoryStorage,
  createNoteStore,
} from "../notepad/storage.js";

test("storage: notepad: prefix 로 저장 (Web Storage 키 검증)", () => {
  const mem = createMemoryStorage();
  const store = createNoteStore(mem);
  const note = {
    id: "01HXYZ",
    title: "제목",
    body: "본문",
    createdAt: 1,
    updatedAt: 1,
  };
  store.save(note);
  assert.equal(mem.getItem(NOTE_PREFIX + "01HXYZ"), JSON.stringify(note));
});

test("storage.list: notepad: prefix 만 다루고 다른 키는 무시", () => {
  const mem = createMemoryStorage();
  mem.setItem("other:key", "irrelevant");
  mem.setItem("bf-theme", "dark");
  const store = createNoteStore(mem);
  store.save({ id: "A", title: "A", body: "a", createdAt: 1, updatedAt: 1 });
  const list = store.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, "A");
});

test("storage.list: updatedAt 내림차순 (최신순)", () => {
  const mem = createMemoryStorage();
  const store = createNoteStore(mem);
  store.save({ id: "old", title: "오래된", body: "", createdAt: 1, updatedAt: 1 });
  store.save({ id: "new", title: "최신", body: "", createdAt: 3, updatedAt: 3 });
  store.save({ id: "mid", title: "중간", body: "", createdAt: 2, updatedAt: 2 });
  const ids = store.list().map((n) => n.id);
  assert.deepEqual(ids, ["new", "mid", "old"]);
});

test("storage.get: 존재 / 비존재 처리", () => {
  const mem = createMemoryStorage();
  const store = createNoteStore(mem);
  store.save({ id: "1", title: "t", body: "b", createdAt: 1, updatedAt: 1 });
  assert.equal(store.get("1").title, "t");
  assert.equal(store.get("missing"), null);
});

test("storage.remove: 항목 삭제 후 list/get 모두 반영", () => {
  const mem = createMemoryStorage();
  const store = createNoteStore(mem);
  store.save({ id: "1", title: "t", body: "b", createdAt: 1, updatedAt: 1 });
  store.remove("1");
  assert.equal(store.get("1"), null);
  assert.equal(store.list().length, 0);
});

test("storage.list: 깨진 JSON 항목은 건너뛰고 유효 항목만 반환", () => {
  const mem = createMemoryStorage();
  mem.setItem(NOTE_PREFIX + "broken", "{not-json");
  const store = createNoteStore(mem);
  store.save({ id: "ok", title: "t", body: "b", createdAt: 1, updatedAt: 1 });
  const list = store.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, "ok");
});

test("memoryStorage: Web Storage API 와 호환 (length / key / getItem / setItem / removeItem)", () => {
  const mem = createMemoryStorage();
  mem.setItem("a", "1");
  mem.setItem("b", "2");
  assert.equal(mem.length, 2);
  assert.equal(mem.getItem("a"), "1");
  const keys = new Set([mem.key(0), mem.key(1)]);
  assert.deepEqual([...keys].sort(), ["a", "b"]);
  mem.removeItem("a");
  assert.equal(mem.length, 1);
  assert.equal(mem.getItem("a"), null);
});
