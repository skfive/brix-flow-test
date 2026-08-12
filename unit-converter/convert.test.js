'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { convert } = require('./convert.js');

// convert(category, direction, value) — docs/plans/BF-1999/implementation-plan.md §4 TC-01..TC-10

test('TC-01: length forward(m->ft) 1 -> 3.2808', () => {
  assert.equal(convert('length', 'forward', 1), '3.2808');
});

test('TC-02: length reverse(ft->m) 1 -> 0.3048', () => {
  assert.equal(convert('length', 'reverse', 1), '0.3048');
});

test('TC-03: length forward(m->ft) 0.3048 -> 1 (반올림/후행 0 제거)', () => {
  assert.equal(convert('length', 'forward', 0.3048), '1');
});

test('TC-04: weight forward(kg->lb) 1 -> 2.2046', () => {
  assert.equal(convert('weight', 'forward', 1), '2.2046');
});

test('TC-05: weight reverse(lb->kg) 1 -> 0.4536', () => {
  assert.equal(convert('weight', 'reverse', 1), '0.4536');
});

test('TC-06: temperature forward(C->F) 0 -> 32', () => {
  assert.equal(convert('temperature', 'forward', 0), '32');
});

test('TC-07: temperature forward(C->F) -40 -> -40 (교차점 경계값)', () => {
  assert.equal(convert('temperature', 'forward', -40), '-40');
});

test('TC-08: temperature reverse(F->C) 98.6 -> 37 (체온, 왕복 확인)', () => {
  assert.equal(convert('temperature', 'reverse', 98.6), '37');
});

test('TC-09: length forward(m->ft) 0 -> 0', () => {
  assert.equal(convert('length', 'forward', 0), '0');
});

test('TC-10: 알 수 없는 category는 TypeError', () => {
  assert.throws(() => convert('volume', 'forward', 1), TypeError);
});

test('알 수 없는 direction은 TypeError', () => {
  assert.throws(() => convert('length', 'sideways', 1), TypeError);
});
