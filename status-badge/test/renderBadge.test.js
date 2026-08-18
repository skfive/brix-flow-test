import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderBadge } from '../lib/renderBadge.js';

test('renders an up-status badge with the frozen up color token', () => {
  const svg = renderBadge({ label: 'auth-api', status: 'up' });
  assert.match(svg, /#4c1/);
  assert.match(svg, /badge--up/);
  assert.match(svg, />auth-api</);
  assert.match(svg, />up</);
});

test('renders a degraded-status badge with the frozen degraded color token', () => {
  const svg = renderBadge({ label: 'worker', status: 'degraded' });
  assert.match(svg, /#dfb317/);
  assert.match(svg, /badge--degraded/);
});

test('renders a down-status badge with the frozen down color token', () => {
  const svg = renderBadge({ label: 'database', status: 'down' });
  assert.match(svg, /#e05d44/);
  assert.match(svg, /badge--down/);
});

test('renders an invalid-status badge reusing the down color and badge--down class', () => {
  const svg = renderBadge({ label: 'unknown-svc', status: 'invalid' });
  assert.match(svg, /#e05d44/);
  assert.match(svg, /badge--down/);
  assert.match(svg, />invalid</);
});

test('root svg exposes accessibility attributes per the frozen contract', () => {
  const svg = renderBadge({ label: 'auth-api', status: 'up' });
  assert.match(svg, /id="badge-svg-root"/);
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-label="auth-api: up"/);
  assert.match(svg, /<title>auth-api: up<\/title>/);
});

test('label and status text nodes carry the frozen dom ids', () => {
  const svg = renderBadge({ label: 'auth-api', status: 'up' });
  assert.match(svg, /id="badge-label-text"/);
  assert.match(svg, /id="badge-status-text"/);
  assert.match(svg, /class="badge__label"/);
  assert.match(svg, /class="badge__status"/);
});

test('total svg width follows the frozen width formula', () => {
  const svg = renderBadge({ label: 'auth-api', status: 'degraded' });
  // labelSegmentWidth = 12 + 6*8 = 60, statusSegmentWidth = 12 + 6*8 = 60, total = 120
  assert.match(svg, /width="120"/);
  assert.match(svg, /height="20"/);
});

test('throws an explicit Error for an empty label', () => {
  assert.throws(() => renderBadge({ label: '', status: 'up' }), Error);
});

test('throws an explicit Error for a non-string label', () => {
  assert.throws(() => renderBadge({ label: null, status: 'up' }), Error);
});

test('throws an explicit Error for an unsupported status', () => {
  assert.throws(() => renderBadge({ label: 'auth-api', status: 'unknown' }), Error);
});

test('remains usable after a thrown error — a later valid call still renders', () => {
  assert.throws(() => renderBadge({ label: 'auth-api', status: 'bogus' }), Error);
  const svg = renderBadge({ label: 'auth-api', status: 'up' });
  assert.match(svg, /#4c1/);
  assert.match(svg, />auth-api</);
});

test('escapes special characters in the label to keep the svg well-formed', () => {
  const svg = renderBadge({ label: '<script>&"', status: 'up' });
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;&amp;&quot;/);
});
