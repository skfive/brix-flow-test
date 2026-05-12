// BF-402 · storage + ulid 통합 시나리오
import { test } from "node:test";
import assert from "node:assert/strict";

import { createMemoryStorage, createNoteStore } from "../notepad/storage.js";
import { ulid } from "../notepad/ulid.js";

test("integration: 새 메모 3개 저장 → 최신순으로 list 반환", () => {
  const mem = createMemoryStorage();
  const store = createNoteStore(mem);

  const t0 = 1700000000000;
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const now = t0 + i * 1000;
    const id = ulid(now);
    store.save({ id, title: `m${i}`, body: `body${i}`, createdAt: now, updatedAt: now });
    ids.push(id);
  }

  const list = store.list();
  assert.deepEqual(
    list.map((n) => n.title),
    ["m2", "m1", "m0"],
  );
});

test("integration: save → remove 흐름이 list 에 반영", () => {
  const mem = createMemoryStorage();
  const store = createNoteStore(mem);
  const id = ulid();
  store.save({ id, title: "t", body: "b", createdAt: 1, updatedAt: 1 });
  assert.equal(store.list().length, 1);
  store.remove(id);
  assert.equal(store.list().length, 0);
});

test("integration: 같은 id 로 save 다시 호출 시 업데이트 (덮어쓰기)", () => {
  const mem = createMemoryStorage();
  const store = createNoteStore(mem);
  const id = ulid();
  store.save({ id, title: "old", body: "", createdAt: 1, updatedAt: 1 });
  store.save({ id, title: "new", body: "v2", createdAt: 1, updatedAt: 5 });
  const got = store.get(id);
  assert.equal(got.title, "new");
  assert.equal(got.body, "v2");
  assert.equal(got.updatedAt, 5);
  assert.equal(store.list().length, 1);
});
