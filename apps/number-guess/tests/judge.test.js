// judge 순수함수 단위 테스트 — 실행 계약(docs/plans/number-guess-plan-BF-1594.md §4) 검증
//
// judge.js 는 브라우저(file://)에서 plain <script> 로도 로드되어야 하므로
// import/export(ES module) 를 쓰지 않고 globalThis.judge 에 순수함수를 노출한다.
// node --test 는 아래처럼 side-effect import 로 judge.js 를 실행한 뒤 globalThis 에서 읽는다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../judge.js';

const { judge } = globalThis;

test('judge 는 함수로 노출된다', () => {
  assert.equal(typeof judge, 'function');
});

test('guess > answer 이면 too-high 를 반환한다', () => {
  assert.equal(judge(70, 50), 'too-high');
});

test('guess < answer 이면 too-low 를 반환한다', () => {
  assert.equal(judge(30, 50), 'too-low');
});

test('guess === answer 이면 win 을 반환한다', () => {
  assert.equal(judge(50, 50), 'win');
});

test('경계값 answer+1 은 too-high', () => {
  assert.equal(judge(51, 50), 'too-high');
});

test('경계값 answer-1 은 too-low', () => {
  assert.equal(judge(49, 50), 'too-low');
});

test('범위 끝(1, 100) 도 계약대로 판정한다', () => {
  assert.equal(judge(1, 100), 'too-low');
  assert.equal(judge(100, 1), 'too-high');
  assert.equal(judge(1, 1), 'win');
  assert.equal(judge(100, 100), 'win');
});
