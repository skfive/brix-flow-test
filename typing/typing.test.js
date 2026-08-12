'use strict';

// typing.js는 브라우저에서 file:// 로 <script> classic 태그 로드가 가능해야 하므로
// import/export 문 없이 IIFE + globalThis.Typing 로 노출한다.
// 여기서는 부수효과 import 로 로드한 뒤 globalThis.Typing 에서 꺼내 쓴다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './typing.js';

const { calcWpm, calcAccuracy, calcTypoCount } = globalThis.Typing;

// ---- calcWpm(charCount, elapsedMs) — docs/plans/BF-2029/implementation-plan.md §3.1 ----

test('calcWpm: 300자 / 60000ms === 60 (AC 고정 케이스)', () => {
  assert.equal(calcWpm(300, 60000), 60);
});

test('calcWpm: 0자 / 60000ms === 0', () => {
  assert.equal(calcWpm(0, 60000), 0);
});

test('calcWpm: 250자 / 60000ms === 50', () => {
  assert.equal(calcWpm(250, 60000), 50);
});

test('calcWpm: 125자 / 30000ms === 50 (0.5분 환산)', () => {
  assert.equal(calcWpm(125, 30000), 50);
});

test('calcWpm: 1자 / 60000ms === 0 (0.2단어 반올림)', () => {
  assert.equal(calcWpm(1, 60000), 0);
});

test('calcWpm: elapsedMs === 0 이면 0으로 나눔 없이 0을 반환한다', () => {
  assert.equal(calcWpm(250, 0), 0);
});

// ---- calcAccuracy(typed, target) — docs/plans/BF-2029/implementation-plan.md §3.2 ----

test('calcAccuracy: "abcde" vs "abcxe" === 80 (AC 고정 케이스)', () => {
  assert.equal(calcAccuracy('abcde', 'abcxe'), 80);
});

test('calcAccuracy: typed가 빈 문자열이면 100 (0 나눗셈 가드)', () => {
  assert.equal(calcAccuracy('', 'the quick'), 100);
});

test('calcAccuracy: typed === target 이면 100', () => {
  assert.equal(calcAccuracy('the', 'the'), 100);
});

test('calcAccuracy: "thw" vs "the" === 67 (2/3 반올림)', () => {
  assert.equal(calcAccuracy('thw', 'the'), 67);
});

test('calcAccuracy: "thereX" vs "there" === 83 (오버타이핑 포함, 5/6 반올림)', () => {
  assert.equal(calcAccuracy('thereX', 'there'), 83);
});

test('calcAccuracy: "th" vs "the" === 100 (입력 중, 남은 글자는 미평가)', () => {
  assert.equal(calcAccuracy('th', 'the'), 100);
});

// ---- calcTypoCount(typed, target) — §3.2 오타 수 규칙 ----

test('calcTypoCount: "thw" vs "the" === 1', () => {
  assert.equal(calcTypoCount('thw', 'the'), 1);
});

test('calcTypoCount: "thereX" vs "there" === 1 (오버타이핑 문자도 오타로 센다)', () => {
  assert.equal(calcTypoCount('thereX', 'there'), 1);
});

test('calcTypoCount: typed가 빈 문자열이면 0', () => {
  assert.equal(calcTypoCount('', 'the'), 0);
});
