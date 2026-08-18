'use strict';

// typing.js는 브라우저에서 file:// 로 <script> classic 태그 로드가 가능해야 하므로
// import/export 문 없이 IIFE + globalThis.TypingPractice 로 노출한다.
// 여기서는 부수효과 import 로 로드한 뒤 globalThis.TypingPractice 에서 꺼내 쓴다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './typing.js';

const { evaluateInput, computeStats } = globalThis.TypingPractice;

// ---- evaluateInput(target, typed) — docs/plans/BF-2178/implementation-plan.md §6 ----

test('evaluateInput: typed가 빈 문자열이면 모든 글자가 pending, done=false, errorCount=0', () => {
  const result = evaluateInput('abc', '');
  assert.deepEqual(
    result.chars,
    [
      { char: 'a', status: 'pending' },
      { char: 'b', status: 'pending' },
      { char: 'c', status: 'pending' }
    ]
  );
  assert.equal(result.done, false);
  assert.equal(result.errorCount, 0);
});

test('evaluateInput: 부분 입력 중 정타/오타/미입력이 섞이면 각 글자 상태가 정확히 매핑된다', () => {
  const result = evaluateInput('abcde', 'abx');
  assert.deepEqual(
    result.chars,
    [
      { char: 'a', status: 'correct' },
      { char: 'b', status: 'correct' },
      { char: 'c', status: 'incorrect' },
      { char: 'd', status: 'pending' },
      { char: 'e', status: 'pending' }
    ]
  );
  assert.equal(result.done, false);
  assert.equal(result.errorCount, 1);
});

test('evaluateInput: 입력 길이가 target 길이에 도달하면 done=true', () => {
  const result = evaluateInput('abc', 'abc');
  assert.equal(result.done, true);
  assert.equal(result.errorCount, 0);
});

test('evaluateInput: 전부 오타로 완료된 경우 done=true이고 errorCount가 전체 글자 수와 같다', () => {
  const result = evaluateInput('abc', 'xyz');
  assert.equal(result.done, true);
  assert.equal(result.errorCount, 3);
  assert.deepEqual(result.chars.map((c) => c.status), ['incorrect', 'incorrect', 'incorrect']);
});

test('evaluateInput: 원본 target/typed 문자열을 변경하지 않는다', () => {
  const target = 'abc';
  const typed = 'ab';
  evaluateInput(target, typed);
  assert.equal(target, 'abc');
  assert.equal(typed, 'ab');
});

test('evaluateInput: 호출마다 새 배열을 반환하며 이전 결과가 공유되지 않는다', () => {
  const first = evaluateInput('abc', 'a');
  const second = evaluateInput('abc', 'ab');
  assert.notEqual(first.chars, second.chars);
  assert.equal(first.chars[1].status, 'pending');
  assert.equal(second.chars[1].status, 'correct');
});

// ---- computeStats(target, typed, elapsedMs) — 5글자 = 1단어 기준 WPM/정확도 ----

test('computeStats: 10글자 전부 정타, 60000ms(1분) === wpm 2, accuracy 100', () => {
  const stats = computeStats('abcdefghij', 'abcdefghij', 60000);
  assert.equal(stats.wpm, 2);
  assert.equal(stats.accuracy, 100);
  assert.equal(stats.errorCount, 0);
});

test('computeStats: 10글자 중 8글자 정타 === accuracy 80', () => {
  const stats = computeStats('abcdefghij', 'abcdefghxx', 60000);
  assert.equal(stats.accuracy, 80);
  assert.equal(stats.errorCount, 2);
});

test('computeStats: elapsedMs === 0이면 0으로 나눔 없이 wpm 0을 반환한다', () => {
  const stats = computeStats('abcdefghij', 'abcdefghij', 0);
  assert.equal(stats.wpm, 0);
});

test('computeStats: typed가 빈 문자열이면 accuracy 0, wpm 0', () => {
  const stats = computeStats('abcdefghij', '', 60000);
  assert.equal(stats.accuracy, 0);
  assert.equal(stats.wpm, 0);
  assert.equal(stats.errorCount, 0);
});

test('computeStats: 30000ms(0.5분), 10글자 정타 === wpm 4 (분수 환산)', () => {
  const stats = computeStats('abcdefghij', 'abcdefghij', 30000);
  assert.equal(stats.wpm, 4);
});

test('computeStats: typed가 target보다 길어도 target 길이만큼만 비교해 정확도를 계산한다', () => {
  const stats = computeStats('abc', 'abcxx', 60000);
  assert.equal(stats.errorCount, 2);
  assert.equal(stats.accuracy, 60);
});

test('computeStats: elapsedMs가 전달된 값 그대로 결과에 포함된다', () => {
  const stats = computeStats('abcde', 'abcde', 12345);
  assert.equal(stats.elapsedMs, 12345);
});
