// 클릭 카운터 focused 단위 테스트 (BF-1827)
// 검증 범위: 초기 텍스트(클릭 횟수: 0), 증가(1·3회), 초기화 복원 후 1부터 재개,
// 계약 selector(ID/class)·token·aria 속성 일치. DOM/브라우저 의존 없이 순수 로직만 검증한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  INITIAL_COUNT,
  counterText,
  reduce,
  counterMarkup,
} from './counter.js';

test('INITIAL_COUNT: 초기 카운트는 0', () => {
  assert.equal(INITIAL_COUNT, 0);
});

test('counterText: 화면 텍스트는 "클릭 횟수: N" 형식', () => {
  assert.equal(counterText(0), '클릭 횟수: 0');
  assert.equal(counterText(1), '클릭 횟수: 1');
  assert.equal(counterText(42), '클릭 횟수: 42');
});

test('reduce increment: 클릭마다 1씩 증가', () => {
  assert.equal(reduce(0, 'increment'), 1);
  assert.equal(reduce(reduce(reduce(0, 'increment'), 'increment'), 'increment'), 3);
});

test('reduce reset: 카운트를 0으로 복원', () => {
  assert.equal(reduce(5, 'reset'), 0);
  assert.equal(reduce(0, 'reset'), 0); // 이미 0이어도 오류 없이 0 유지
});

test('reduce reset 직후 increment: 1부터 재개', () => {
  const afterReset = reduce(3, 'reset');
  assert.equal(reduce(afterReset, 'increment'), 1);
});

test('reduce: 음수 카운트 없음 (감소 action 미존재)', () => {
  assert.equal(reduce(0, 'unknown'), 0); // 미지정 action은 상태 유지
  assert.equal(reduce(2, 'unknown'), 2);
});

test('counterMarkup: 계약 selector·초기 텍스트를 모두 포함', () => {
  const html = counterMarkup();
  assert.match(html, /id="counter-root"/);
  assert.match(html, /class="counter"/);
  assert.match(html, /id="counter-value"/);
  assert.match(html, /class="counter__value"/);
  assert.match(html, /id="counter-increment"/);
  assert.match(html, /class="counter__increment"/);
  assert.match(html, /id="counter-reset"/);
  assert.match(html, /class="counter__reset"/);
  assert.match(html, /클릭 횟수: 0/); // 초기 진행 표시
});

test('counterMarkup: 계약 aria 속성을 포함', () => {
  const html = counterMarkup();
  assert.match(html, /aria-live="polite"/); // counter-value
  assert.match(html, /aria-label="카운트 증가"/); // counter-increment
  assert.match(html, /aria-label="카운트 초기화"/); // counter-reset
});

test('counterMarkup: 증가 control은 disabled 되지 않는다 (항상 재활성 상태)', () => {
  const html = counterMarkup();
  const incrementTag = html.match(/<button[^>]*id="counter-increment"[^>]*>/)?.[0] ?? '';
  assert.doesNotMatch(incrementTag, /disabled/);
});
