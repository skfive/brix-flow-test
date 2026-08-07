import { test } from 'node:test';
import assert from 'node:assert/strict';

import { INITIAL_STATE, selectTab, tabsMarkup } from './tabs.js';

test('INITIAL_STATE 는 first-selected 이다', () => {
  assert.equal(INITIAL_STATE, 'first-selected');
});

test('selectTab: tab-first → first-selected', () => {
  assert.equal(selectTab(INITIAL_STATE, 'tab-first'), 'first-selected');
});

test('selectTab: tab-second → second-selected', () => {
  assert.equal(selectTab(INITIAL_STATE, 'tab-second'), 'second-selected');
});

test('selectTab: 미지정/알 수 없는 tabId → first-selected 복원 (후조건)', () => {
  assert.equal(selectTab('second-selected', 'tab-unknown'), 'first-selected');
  assert.equal(selectTab('second-selected', undefined), 'first-selected');
  assert.equal(selectTab('second-selected', ''), 'first-selected');
});

test('tabsMarkup: 계약 DOM id 전체 포함', () => {
  const html = tabsMarkup();
  for (const id of ['tab-first', 'tab-second', 'panel-first', 'panel-second']) {
    assert.ok(html.includes(`id="${id}"`), `id="${id}" 누락`);
  }
});

test('tabsMarkup: 계약 CSS class 전체 포함', () => {
  const html = tabsMarkup();
  for (const cls of [
    'tabs',
    'tabs__tab',
    'tabs__tab--active',
    'tabs__panel',
    'tabs__panel--active',
  ]) {
    assert.ok(html.includes(cls), `class ${cls} 누락`);
  }
});

test('tabsMarkup: 접근성 속성 포함', () => {
  const html = tabsMarkup();
  assert.ok(html.includes('role="tablist"'), 'role="tablist" 누락');
  assert.ok(html.includes('role="tab"'), 'role="tab" 누락');
  assert.ok(html.includes('role="tabpanel"'), 'role="tabpanel" 누락');
  assert.ok(html.includes('aria-selected="true"'), 'aria-selected="true" 누락');
  assert.ok(html.includes('aria-selected="false"'), 'aria-selected="false" 누락');
  assert.ok(html.includes('aria-controls="panel-first"'), 'aria-controls 누락');
  assert.ok(html.includes('aria-labelledby="tab-first"'), 'aria-labelledby 누락');
});

test('tabsMarkup: 상태명이 색상 아닌 텍스트로 노출됨', () => {
  const html = tabsMarkup();
  assert.ok(html.includes('첫 번째 탭'), '첫 번째 탭 텍스트 누락');
  assert.ok(html.includes('두 번째 탭'), '두 번째 탭 텍스트 누락');
});

test('tabsMarkup: 탭 버튼이 disabled 되지 않음 (항상 재조작 가능)', () => {
  const html = tabsMarkup();
  assert.ok(!html.includes('disabled'), '탭 버튼에 disabled 존재');
});

test('tabsMarkup: 초기 활성 상태가 first-selected (tab-first 만 활성)', () => {
  const html = tabsMarkup();
  // tab-first 는 활성 class 를 가진다
  assert.ok(/id="tab-first"[^>]*tabs__tab--active/.test(html) ||
    /tabs__tab--active[^>]*id="tab-first"/.test(html) ||
    html.includes('class="tabs__tab tabs__tab--active"'), 'tab-first 초기 활성 class 누락');
  // panel-second 는 초기에 hidden
  assert.ok(/id="panel-second"[^>]*hidden/.test(html), 'panel-second 초기 hidden 누락');
});
