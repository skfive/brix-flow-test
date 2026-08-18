'use strict';

// BF-2173 · docs/plans/BF-2171/implementation-plan.md §5~§6 frozen 계약 테스트.

var test = require('node:test');
var assert = require('node:assert/strict');
var radix = require('./radix.js');

var parseInBase = radix.parseInBase;
var formatInBase = radix.formatInBase;

test('#1 parseInBase("1010", 2) -> value 10', function () {
  var outcome = parseInBase('1010', 2);
  assert.deepEqual(outcome, { ok: true, value: 10, isNegative: false });
});

test('#2 parseInBase("777", 8) -> value 511', function () {
  var outcome = parseInBase('777', 8);
  assert.deepEqual(outcome, { ok: true, value: 511, isNegative: false });
});

test('#3 parseInBase("2F", 16) -> value 47', function () {
  var outcome = parseInBase('2F', 16);
  assert.deepEqual(outcome, { ok: true, value: 47, isNegative: false });
});

test('#4 parseInBase("2f", 16) -> 소문자 허용, value 47', function () {
  var outcome = parseInBase('2f', 16);
  assert.deepEqual(outcome, { ok: true, value: 47, isNegative: false });
});

test('#5 parseInBase("-101", 2) -> 음수 value -5', function () {
  var outcome = parseInBase('-101', 2);
  assert.deepEqual(outcome, { ok: true, value: -5, isNegative: true });
});

test('#6 parseInBase("", 10) -> empty 오류', function () {
  var outcome = parseInBase('', 10);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, 'empty');
  assert.equal(outcome.message, '값을 입력해 주세요.');
});

test('#6b parseInBase("   ", 10) -> trim 후 빈 값도 empty 오류', function () {
  var outcome = parseInBase('   ', 10);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, 'empty');
});

test('#7 parseInBase("1 0", 2) -> whitespace 오류', function () {
  var outcome = parseInBase('1 0', 2);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, 'whitespace');
  assert.equal(outcome.message, '공백은 사용할 수 없습니다.');
});

test('#8 parseInBase("1.5", 10) -> decimal-point 오류', function () {
  var outcome = parseInBase('1.5', 10);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, 'decimal-point');
  assert.equal(outcome.message, '정수만 입력할 수 있습니다.');
});

test('#9 parseInBase("--1", 2) -> invalid-sign 오류', function () {
  var outcome = parseInBase('--1', 2);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, 'invalid-sign');
  assert.equal(outcome.message, '숫자 형식이 올바르지 않습니다.');
});

test('#9b parseInBase("-", 2) -> 부호만 있는 경우 invalid-sign 오류', function () {
  var outcome = parseInBase('-', 2);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, 'invalid-sign');
});

test('#10 parseInBase("2", 2) -> invalid-char 오류 (2진수에 2는 허용 안됨)', function () {
  var outcome = parseInBase('2', 2);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, 'invalid-char');
  assert.equal(outcome.message, '2진수에서 허용되지 않는 문자가 포함되어 있습니다.');
});

test('#11 parseInBase("G", 16) -> invalid-char 오류', function () {
  var outcome = parseInBase('G', 16);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, 'invalid-char');
});

test('#12 parseInBase("1".repeat(60), 2) -> overflow 오류(안전 정수 범위 초과)', function () {
  var outcome = parseInBase('1'.repeat(60), 2);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, 'overflow');
  assert.equal(outcome.message, '표현 가능한 범위를 초과했습니다.');
});

test('#13 formatInBase(47, 16) -> "2F" (대문자 정규화)', function () {
  var outcome = formatInBase(47, 16);
  assert.deepEqual(outcome, { ok: true, text: '2F' });
});

test('#14 formatInBase(-5, 2) -> "-101"', function () {
  var outcome = formatInBase(-5, 2);
  assert.deepEqual(outcome, { ok: true, text: '-101' });
});

test('#15 formatInBase(0, 8) -> "0"', function () {
  var outcome = formatInBase(0, 8);
  assert.deepEqual(outcome, { ok: true, text: '0' });
});

test('formatInBase: 정수가 아닌 값은 invalid-value 오류', function () {
  var outcome = formatInBase(1.5, 10);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, 'invalid-value');
});

test('parseInBase: 10진수 정상 파싱', function () {
  var outcome = parseInBase('42', 10);
  assert.deepEqual(outcome, { ok: true, value: 42, isNegative: false });
});

test('parseInBase: 8진수 허용 문자 밖(8) 입력 시 invalid-char', function () {
  var outcome = parseInBase('8', 8);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, 'invalid-char');
});
