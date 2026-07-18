/* delivery-exceptions-canary/tests/storage.test.js — 로컬 해결 메모 envelope 저장·검증·복구 단위 테스트
 * BF-1033 · 기획 §6(저장 스키마·검증·복구) / EC-04·EC-05·EC-07·EC-08·EC-09
 * vanilla-static — node --test 로만 실행, DOM 미실행
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Storage = require("../notes-storage.js");

const VALID_IDS = ["EXC-5001", "EXC-5002", "EXC-5003"];
const NOW = "2026-07-18T10:00:00+09:00";

function freshStore() {
  const mem = Storage.createMemoryStorage();
  return { mem, store: Storage.createStore(mem, VALID_IDS) };
}

test("STORAGE_KEY 는 기획 §6.1 단일 envelope 키", () => {
  assert.equal(Storage.STORAGE_KEY, "delivery-exceptions-canary:notes");
});

test("최초 실행(값 없음)은 손상 아님 — 빈 notes (기획 §6.3 V1 / EC-04)", () => {
  const { store } = freshStore();
  const loaded = store.load();
  assert.deepEqual(loaded.notes, {});
});

test("메모 저장 후 로드하면 text·savedAt 복원 (기획 §6.1)", () => {
  const { mem } = freshStore();
  const store = Storage.createStore(mem, VALID_IDS);
  const res = store.saveNote("EXC-5001", "재배송 조율 완료", NOW);
  assert.equal(res.ok, true);
  assert.equal(res.action, "save");
  assert.equal(res.savedAt, NOW);

  const store2 = Storage.createStore(mem, VALID_IDS);
  const loaded = store2.load();
  assert.equal(loaded.notes["EXC-5001"].text, "재배송 조율 완료");
  assert.equal(loaded.notes["EXC-5001"].savedAt, NOW);
});

test("공백만 저장 → 해당 키 삭제 (EC-08)", () => {
  const { mem } = freshStore();
  let store = Storage.createStore(mem, VALID_IDS);
  store.saveNote("EXC-5001", "임시 메모", NOW);
  const del = store.saveNote("EXC-5001", "   ", NOW);
  assert.equal(del.ok, true);
  assert.equal(del.action, "delete");
  assert.equal(del.savedAt, null);

  const loaded = Storage.createStore(mem, VALID_IDS).load();
  assert.equal(loaded.notes["EXC-5001"], undefined);
});

test("300자 초과 저장은 거부, 기존 값 보존 (EC-05)", () => {
  const { mem } = freshStore();
  const store = Storage.createStore(mem, VALID_IDS);
  store.saveNote("EXC-5002", "기존 메모", NOW);
  const res = store.saveNote("EXC-5002", "가".repeat(301), NOW);
  assert.equal(res.ok, false);
  assert.equal(res.action, "reject");
  assert.match(res.error, /300자 이하/);

  const loaded = Storage.createStore(mem, VALID_IDS).load();
  assert.equal(loaded.notes["EXC-5002"].text, "기존 메모"); // 덮어쓰지 않음
});

test("파싱 불가 원본은 빈 notes 폴백, 크래시 없음 (기획 §6.4 R1)", () => {
  const mem = Storage.createMemoryStorage();
  mem.setItem(Storage.STORAGE_KEY, "{not json");
  const loaded = Storage.createStore(mem, VALID_IDS).load();
  assert.deepEqual(loaded.notes, {});
});

test("schemaVersion 불일치 envelope 는 폴백 (기획 §6.3 V3)", () => {
  const mem = Storage.createMemoryStorage();
  mem.setItem(Storage.STORAGE_KEY, JSON.stringify({ schemaVersion: 99, notes: {} }));
  const loaded = Storage.createStore(mem, VALID_IDS).load();
  assert.deepEqual(loaded.notes, {});
});

test("엔트리 단위 스키마 위반은 그 키만 드롭, 나머지 유지 (기획 §6.4 R2 / EC-09)", () => {
  const mem = Storage.createMemoryStorage();
  mem.setItem(
    Storage.STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 1,
      notes: {
        "EXC-5001": { text: "정상 메모", savedAt: NOW },
        "EXC-5002": { text: "", savedAt: NOW }, // 빈 text — 위반
        "EXC-5003": { text: 123, savedAt: NOW }, // 타입 위반
      },
    })
  );
  const loaded = Storage.createStore(mem, VALID_IDS).load();
  assert.equal(loaded.notes["EXC-5001"].text, "정상 메모");
  assert.equal(loaded.notes["EXC-5002"], undefined);
  assert.equal(loaded.notes["EXC-5003"], undefined);
});

test("fixture 에 없는 orphan id 는 무시 (기획 §6.3 V5)", () => {
  const mem = Storage.createMemoryStorage();
  mem.setItem(
    Storage.STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 1,
      notes: {
        "EXC-5001": { text: "유효", savedAt: NOW },
        "EXC-9999": { text: "orphan", savedAt: NOW },
      },
    })
  );
  const loaded = Storage.createStore(mem, VALID_IDS).load();
  assert.equal(loaded.notes["EXC-5001"].text, "유효");
  assert.equal(loaded.notes["EXC-9999"], undefined);
});

test("setItem 예외 환경에서도 크래시 없이 in-memory 유지 (기획 §6.4 R3 / EC-07)", () => {
  const throwing = {
    getItem: () => null,
    setItem: () => {
      throw new Error("QuotaExceeded");
    },
    removeItem: () => {},
  };
  const store = Storage.createStore(throwing, VALID_IDS);
  const res = store.saveNote("EXC-5001", "메모", NOW);
  assert.equal(res.ok, true); // 저장 실패해도 세션 유지, 크래시 금지
  assert.equal(res.persisted, false);
  // 같은 store 인스턴스에서 세션 내 메모는 유지된다
  const loaded = store.load();
  assert.equal(loaded.notes["EXC-5001"].text, "메모");
});
