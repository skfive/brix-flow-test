/* rps/judge.test.js — judge 순수함수 단위 테스트 (9가지 조합)
 * BF-792 · AC-03 — node --test rps/judge.test.js
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { judge, CHOICES } = require("./judge.js");

/* 9가지 (player × cpu) 조합 → 기대 결과 (플레이어 기준) */
const CASES = [
  // 무승부 (같은 선택)
  ["scissors", "scissors", "draw"],
  ["rock", "rock", "draw"],
  ["paper", "paper", "draw"],
  // 승리 (가위>보, 바위>가위, 보>바위)
  ["scissors", "paper", "win"],
  ["rock", "scissors", "win"],
  ["paper", "rock", "win"],
  // 패배
  ["scissors", "rock", "lose"],
  ["rock", "paper", "lose"],
  ["paper", "scissors", "lose"],
];

test("judge — 9가지 조합 판정이 모두 정확하다", () => {
  for (const [player, cpu, expected] of CASES) {
    assert.equal(
      judge(player, cpu),
      expected,
      `judge('${player}', '${cpu}') 는 '${expected}' 여야 한다`
    );
  }
});

test("judge — 같은 선택은 항상 무승부", () => {
  for (const c of CHOICES) {
    assert.equal(judge(c, c), "draw", `judge('${c}','${c}') === 'draw'`);
  }
});

test("judge — 9가지 조합 중 승 3 / 무 3 / 패 3 분포", () => {
  const tally = { win: 0, lose: 0, draw: 0 };
  for (const [player, cpu] of CASES) {
    tally[judge(player, cpu)] += 1;
  }
  assert.deepEqual(tally, { win: 3, lose: 3, draw: 3 });
});

test("CHOICES — 가위/바위/보 3종을 노출한다", () => {
  assert.deepEqual([...CHOICES].sort(), ["paper", "rock", "scissors"]);
});
