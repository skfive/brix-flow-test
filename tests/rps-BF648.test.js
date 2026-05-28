// BF-648 · 가위바위보 게임 단위 테스트
// 명세: docs/design/rps-BF-645.md
// AC:
//   - AC1: 선택 → CPU 랜덤 비교 → 승/패/무 판정
//   - AC2: 점수 누적 + localStorage round-trip
//   - AC3: file:// 동작 (빌드 없이)
//
// rps/logic.js — CommonJS exports (UMD 패턴)

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Logic = require("../rps/logic.js");

const { CHOICES, RESULTS, judge, cpuPick, createScoreStore } = Logic;

// ──────────────────────────────────────────────────────────
// 1. 상수 검증
// ──────────────────────────────────────────────────────────

test("CHOICES 에 scissors/rock/paper 3종 정의됨", () => {
  assert.ok(CHOICES.scissors, "scissors 없음");
  assert.ok(CHOICES.rock,     "rock 없음");
  assert.ok(CHOICES.paper,    "paper 없음");
});

test("CHOICES 각 항목에 emoji·name 필드 존재", () => {
  for (const [key, val] of Object.entries(CHOICES)) {
    assert.ok(val.emoji, `${key}.emoji 없음`);
    assert.ok(val.name,  `${key}.name 없음`);
  }
});

test("RESULTS 에 win/draw/lose 3종 정의됨", () => {
  assert.ok(RESULTS.win,  "win 없음");
  assert.ok(RESULTS.draw, "draw 없음");
  assert.ok(RESULTS.lose, "lose 없음");
});

test("RESULTS 각 항목에 text·icon·dataResult 필드 존재", () => {
  for (const [key, val] of Object.entries(RESULTS)) {
    assert.ok(val.text,       `${key}.text 없음`);
    assert.ok(val.icon,       `${key}.icon 없음`);
    assert.ok(val.dataResult, `${key}.dataResult 없음`);
  }
});

// ──────────────────────────────────────────────────────────
// 2. judge() — 9가지 판정
// ──────────────────────────────────────────────────────────

test("judge: 가위 vs 가위 → draw", () => {
  assert.equal(judge("scissors", "scissors"), "draw");
});

test("judge: 가위 vs 바위 → lose", () => {
  assert.equal(judge("scissors", "rock"), "lose");
});

test("judge: 가위 vs 보 → win", () => {
  assert.equal(judge("scissors", "paper"), "win");
});

test("judge: 바위 vs 가위 → win", () => {
  assert.equal(judge("rock", "scissors"), "win");
});

test("judge: 바위 vs 바위 → draw", () => {
  assert.equal(judge("rock", "rock"), "draw");
});

test("judge: 바위 vs 보 → lose", () => {
  assert.equal(judge("rock", "paper"), "lose");
});

test("judge: 보 vs 가위 → lose", () => {
  assert.equal(judge("paper", "scissors"), "lose");
});

test("judge: 보 vs 바위 → win", () => {
  assert.equal(judge("paper", "rock"), "win");
});

test("judge: 보 vs 보 → draw", () => {
  assert.equal(judge("paper", "paper"), "draw");
});

// ──────────────────────────────────────────────────────────
// 3. cpuPick()
// ──────────────────────────────────────────────────────────

test("cpuPick: 유효한 선택지만 반환 (100회 샘플)", () => {
  const valid = new Set(["scissors", "rock", "paper"]);
  for (let i = 0; i < 100; i++) {
    const pick = cpuPick();
    assert.ok(valid.has(pick), `유효하지 않은 cpuPick 결과: ${pick}`);
  }
});

test("cpuPick: 3가지 선택지 모두 등장 (1000회 샘플 — 균형성)", () => {
  const counts = { scissors: 0, rock: 0, paper: 0 };
  for (let i = 0; i < 1000; i++) {
    counts[cpuPick()]++;
  }
  assert.ok(counts.scissors > 0, "scissors 한 번도 안 나옴");
  assert.ok(counts.rock     > 0, "rock 한 번도 안 나옴");
  assert.ok(counts.paper    > 0, "paper 한 번도 안 나옴");
});

// ──────────────────────────────────────────────────────────
// 4. createScoreStore() — localStorage round-trip
// ──────────────────────────────────────────────────────────

/**
 * 메모리 storage mock (Node.js 환경에서 localStorage 대체)
 */
function createMemoryStorage() {
  const store = {};
  return {
    getItem(key)        { return key in store ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key)     { delete store[key]; },
  };
}

test("createScoreStore: 초기 값 {win:0, draw:0, lose:0}", () => {
  const storage = createMemoryStorage();
  const ss = createScoreStore(storage);
  const s = ss.load();
  assert.deepEqual(s, { win: 0, draw: 0, lose: 0 });
});

test("createScoreStore: save 후 load 하면 동일 값 반환", () => {
  const storage = createMemoryStorage();
  const ss = createScoreStore(storage);
  ss.save({ win: 3, draw: 1, lose: 2 });
  const s = ss.load();
  assert.deepEqual(s, { win: 3, draw: 1, lose: 2 });
});

test("createScoreStore: reset 후 load 하면 0으로 초기화", () => {
  const storage = createMemoryStorage();
  const ss = createScoreStore(storage);
  ss.save({ win: 5, draw: 2, lose: 3 });
  ss.reset();
  const s = ss.load();
  assert.deepEqual(s, { win: 0, draw: 0, lose: 0 });
});

test("createScoreStore: 기존 storage 값을 올바르게 읽음", () => {
  const storage = createMemoryStorage();
  storage.setItem("rps:score", JSON.stringify({ win: 7, draw: 3, lose: 4 }));
  const ss = createScoreStore(storage);
  const s = ss.load();
  assert.deepEqual(s, { win: 7, draw: 3, lose: 4 });
});

test("createScoreStore: 손상된 storage 값이면 기본값 반환", () => {
  const storage = createMemoryStorage();
  storage.setItem("rps:score", "not-json{{{{");
  const ss = createScoreStore(storage);
  const s = ss.load();
  assert.deepEqual(s, { win: 0, draw: 0, lose: 0 });
});
