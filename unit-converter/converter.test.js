'use strict';

// BF-2167 · docs/plans/BF-2165/implementation-plan.md §9 Acceptance Criteria 기반 테스트.

var test = require('node:test');
var assert = require('node:assert/strict');
var converter = require('./converter.js');

var convert = converter.convert;
var formatResult = converter.formatResult;

test('AC-1 길이: km -> mi, 1 입력 시 0.621371', function () {
  var outcome = convert('length', 'km', 'mi', '1');
  assert.equal(outcome.ok, true);
  assert.equal(formatResult(outcome.value), '0.621371');
});

test('길이: ft -> m, 1 입력 시 0.3048', function () {
  var outcome = convert('length', 'ft', 'm', '1');
  assert.equal(outcome.ok, true);
  assert.equal(formatResult(outcome.value), '0.3048');
});

test('AC-2 무게: lb -> kg, 10 입력 시 4.53592', function () {
  var outcome = convert('weight', 'lb', 'kg', '10');
  assert.equal(outcome.ok, true);
  assert.equal(formatResult(outcome.value), '4.53592');
});

test('무게: kg -> g, 1 입력 시 1000', function () {
  var outcome = convert('weight', 'kg', 'g', '1');
  assert.equal(outcome.ok, true);
  assert.equal(formatResult(outcome.value), '1000');
});

test('AC-3 온도: C -> F, 100 입력 시 212', function () {
  var outcome = convert('temperature', 'C', 'F', '100');
  assert.equal(outcome.ok, true);
  assert.equal(formatResult(outcome.value), '212');
});

test('온도: F -> C, 32 입력 시 0', function () {
  var outcome = convert('temperature', 'F', 'C', '32');
  assert.equal(outcome.ok, true);
  assert.equal(formatResult(outcome.value), '0');
});

test('온도: C -> K, 0 입력 시 273.15', function () {
  var outcome = convert('temperature', 'C', 'K', '0');
  assert.equal(outcome.ok, true);
  assert.equal(formatResult(outcome.value), '273.15');
});

test('온도: 절대영도 경계값(-273.15C)은 오류가 아니라 0K로 변환된다', function () {
  var outcome = convert('temperature', 'C', 'K', '-273.15');
  assert.equal(outcome.ok, true);
  assert.equal(formatResult(outcome.value), '0');
});

test('AC-6 온도: 절대영도 미만(-300C)은 error-below-absolute-zero', function () {
  var outcome = convert('temperature', 'C', 'F', '-300');
  assert.equal(outcome.ok, false);
  assert.equal(outcome.state, 'error-below-absolute-zero');
  assert.equal(outcome.message, '절대영도(-273.15°C) 미만은 변환할 수 없습니다.');
});

test('AC-4 빈 값 입력은 error-invalid-input', function () {
  var outcome = convert('length', 'm', 'km', '');
  assert.equal(outcome.ok, false);
  assert.equal(outcome.state, 'error-invalid-input');
  assert.equal(outcome.message, '값을 입력해 주세요.');
});

test('공백만 있는 입력도 error-invalid-input', function () {
  var outcome = convert('length', 'm', 'km', '   ');
  assert.equal(outcome.ok, false);
  assert.equal(outcome.state, 'error-invalid-input');
  assert.equal(outcome.message, '값을 입력해 주세요.');
});

test('AC-5 비숫자 입력(abc)은 error-invalid-input', function () {
  var outcome = convert('weight', 'g', 'kg', 'abc');
  assert.equal(outcome.ok, false);
  assert.equal(outcome.state, 'error-invalid-input');
  assert.equal(outcome.message, '숫자를 입력해 주세요.');
});

test('AC-7 오류 이후 유효값 재입력 시 바로 result-ready', function () {
  var errorOutcome = convert('length', 'm', 'km', 'abc');
  assert.equal(errorOutcome.ok, false);

  var retryOutcome = convert('length', 'm', 'km', '1000');
  assert.equal(retryOutcome.ok, true);
  assert.equal(retryOutcome.state, 'result-ready');
  assert.equal(formatResult(retryOutcome.value), '1');
});

test('formatResult(0)은 "0"을 반환한다', function () {
  assert.equal(formatResult(0), '0');
});

test('formatResult는 정수를 소수점 없이 표기한다', function () {
  assert.equal(formatResult(100), '100');
});

test('formatResult는 유효숫자 6자리로 반올림한다 (1/3 -> 0.333333)', function () {
  assert.equal(formatResult(1 / 3), '0.333333');
});

test('formatResult는 6자리 이하 소수는 그대로 표기한다 (0.3048)', function () {
  assert.equal(formatResult(0.3048), '0.3048');
});

test('formatResult는 1609.344를 6자리로 반올림해 1609.34를 반환한다', function () {
  assert.equal(formatResult(1609.344), '1609.34');
});
