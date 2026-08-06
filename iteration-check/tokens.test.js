import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  nextTheme,
  normalizeTheme,
  labelForTheme,
  ariaPressedForTheme,
  applyTheme,
  resetTheme,
} from './tokens.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(join(here, name), 'utf8');

// 계약된 디자인 토큰 (ui-contract@v1 — 이름·값 exact)
const TOKENS = {
  '--color-bg': '#ffffff',
  '--color-fg': '#1a1a1a',
  '--color-accent': '#2563eb',
  '--space-sm': '8px',
  '--space-md': '16px',
  '--space-lg': '24px',
  '--font-family-base': 'system-ui, sans-serif',
  '--font-size-base': '16px',
  '--font-size-lg': '20px',
};

// 테스트용 최소 fake element (setAttribute/removeAttribute/getAttribute + disabled/textContent)
function fakeElement() {
  const attrs = new Map();
  return {
    attrs,
    disabled: false,
    textContent: '',
    setAttribute(name, value) {
      attrs.set(name, String(value));
    },
    removeAttribute(name) {
      attrs.delete(name);
    },
    getAttribute(name) {
      return attrs.has(name) ? attrs.get(name) : null;
    },
  };
}

test('nextTheme은 light↔dark를 토글한다', () => {
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'light');
});

test('두 번 토글하면 초기 light 상태로 복원된다', () => {
  assert.equal(nextTheme(nextTheme('light')), 'light');
});

test('normalizeTheme은 알 수 없는/누락 상태를 light로 폴백한다', () => {
  assert.equal(normalizeTheme('dark'), 'dark');
  assert.equal(normalizeTheme('light'), 'light');
  assert.equal(normalizeTheme('bogus'), 'light');
  assert.equal(normalizeTheme(undefined), 'light');
  assert.equal(normalizeTheme(null), 'light');
});

test('상태명 화면 텍스트가 상태와 일치한다', () => {
  assert.equal(labelForTheme('light'), '라이트 모드');
  assert.equal(labelForTheme('dark'), '다크 모드');
});

test('aria-pressed가 상태와 일치한다 (light=false, dark=true)', () => {
  assert.equal(ariaPressedForTheme('light'), false);
  assert.equal(ariaPressedForTheme('dark'), true);
});

test('applyTheme은 상태를 반영하고 control을 항상 재활성화한다', () => {
  const root = fakeElement();
  const button = fakeElement();
  button.disabled = true; // 이전에 disabled 되었다고 가정

  const dark = applyTheme('dark', { root, button });
  assert.equal(dark, 'dark');
  assert.equal(root.getAttribute('data-theme'), 'dark');
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(button.textContent, '다크 모드');
  assert.equal(button.disabled, false); // 후조건: 항상 재활성화

  const light = applyTheme('light', { root, button });
  assert.equal(light, 'light');
  assert.equal(root.getAttribute('data-theme'), null); // light는 스코프 해제
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.equal(button.textContent, '라이트 모드');
  assert.equal(button.disabled, false);
});

test('resetTheme은 상태를 초기값(light)으로 되돌리고 control을 재활성화한다', () => {
  const root = fakeElement();
  const button = fakeElement();
  applyTheme('dark', { root, button });
  button.disabled = true;

  const state = resetTheme({ root, button });
  assert.equal(state, 'light');
  assert.equal(root.getAttribute('data-theme'), null);
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.equal(button.textContent, '라이트 모드');
  assert.equal(button.disabled, false);
});

test('알 수 없는 상태로 applyTheme하면 light로 폴백한다', () => {
  const root = fakeElement();
  const button = fakeElement();
  const state = applyTheme('bogus', { root, button });
  assert.equal(state, 'light');
  assert.equal(button.textContent, '라이트 모드');
  assert.equal(button.disabled, false);
});

test('tokens.css의 :root에 계약된 토큰이 exact 값으로 정의된다', () => {
  const css = read('tokens.css');
  assert.match(css, /:root\s*{/, ':root 블록이 있어야 한다');
  for (const [name, value] of Object.entries(TOKENS)) {
    const re = new RegExp(
      `${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*;`,
    );
    assert.match(css, re, `${name}: ${value} 가 정의되어야 한다`);
  }
});

test('tokens.css는 dark 스코프에서 색상 토큰을 오버라이드한다', () => {
  const css = read('tokens.css');
  assert.match(css, /\[data-theme="dark"\]/, 'dark 테마 스코프가 있어야 한다');
});

test('tokens.css의 token-grid는 320px에서 wrap된다', () => {
  const css = read('tokens.css');
  assert.match(css, /\.token-grid\s*{[^}]*flex-wrap\s*:\s*wrap/s);
});

test('tokens.html에 계약된 DOM 식별자·클래스가 있다', () => {
  const html = read('tokens.html');
  assert.match(html, /id="token-showcase"/);
  assert.match(html, /id="theme-toggle"/);
  assert.match(html, /aria-label="테마 전환"/);
  assert.match(html, /class="token-grid"/);
  assert.match(html, /class="swatch"/);
  assert.match(html, /class="swatch__label"/);
});

test('tokens.html은 JS 없이도 각 토큰 견본과 라벨을 정적으로 렌더한다', () => {
  const html = read('tokens.html');
  for (const [name, value] of Object.entries(TOKENS)) {
    assert.ok(
      html.includes(name),
      `${name} 견본 라벨이 마크업에 있어야 한다`,
    );
    assert.ok(html.includes(value), `${value} 값이 마크업에 있어야 한다`);
  }
});

test('tokens.html은 tokens.js를 module로 로드한다', () => {
  const html = read('tokens.html');
  assert.match(html, /<script[^>]*type="module"[^>]*src="tokens\.js"/);
});
