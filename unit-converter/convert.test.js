'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { convert, formatNumber } = require('./convert.js');

// convert() — 길이

test('convert: 길이 m -> cm', () => {
  assert.equal(convert(1, 'm', 'cm'), 100);
});

test('convert: 길이 km -> m', () => {
  assert.equal(convert(2, 'km', 'm'), 2000);
});

test('convert: 길이 inch -> cm', () => {
  assert.ok(Math.abs(convert(1, 'inch', 'cm') - 2.54) < 1e-9);
});

test('convert: 길이 ft -> m', () => {
  assert.ok(Math.abs(convert(1, 'ft', 'm') - 0.3048) < 1e-9);
});

// convert() — 무게

test('convert: 무게 kg -> g', () => {
  assert.equal(convert(1, 'kg', 'g'), 1000);
});

test('convert: 무게 lb -> kg', () => {
  assert.ok(Math.abs(convert(1, 'lb', 'kg') - 0.45359237) < 1e-9);
});

test('convert: 무게 oz -> g', () => {
  assert.ok(Math.abs(convert(1, 'oz', 'g') - 28.349523125) < 1e-9);
});

// convert() — 공통 규칙

test('convert: 같은 단위는 값 그대로 반환', () => {
  assert.equal(convert(5, 'm', 'm'), 5);
});

test('convert: 0 값은 허용된다', () => {
  assert.equal(convert(0, 'm', 'cm'), 0);
});

test('convert: 음수 값은 예외를 던진다', () => {
  assert.throws(() => convert(-1, 'm', 'cm'));
});

test('convert: 숫자가 아닌 값은 예외를 던진다', () => {
  assert.throws(() => convert(NaN, 'm', 'cm'));
  assert.throws(() => convert('1', 'm', 'cm'));
});

test('convert: 길이-무게 등 다른 카테고리 간 변환은 예외를 던진다', () => {
  assert.throws(() => convert(1, 'm', 'g'));
});

test('convert: 알 수 없는 단위는 예외를 던진다', () => {
  assert.throws(() => convert(1, 'm', 'xyz'));
  assert.throws(() => convert(1, 'xyz', 'm'));
});

// formatNumber()

test('formatNumber: 정수는 소수점 없이 표시', () => {
  assert.equal(formatNumber(100), '100');
});

test('formatNumber: 소수점은 최대 4자리까지 표시', () => {
  assert.equal(formatNumber(1 / 3), '0.3333');
});

test('formatNumber: 불필요한 trailing 0을 제거한다', () => {
  assert.equal(formatNumber(0.30000000000000004), '0.3');
});

test('formatNumber: 0은 "0"으로 표시', () => {
  assert.equal(formatNumber(0), '0');
});

test('formatNumber: 정수형 변환 결과 예시(AC-3)', () => {
  assert.equal(formatNumber(convert(1, 'm', 'cm')), '100');
});

test('formatNumber: 매우 작은 값의 반올림 경계(4자리 초과분 버림)', () => {
  assert.equal(formatNumber(0.00005), '0.0001');
  assert.equal(formatNumber(0.00004), '0');
});

test('formatNumber: 1e21 이상의 매우 큰 값도 지수 표기 없이 표시', () => {
  assert.equal(formatNumber(1e21), '1000000000000000000000');
  assert.equal(formatNumber(1.23456e21), '1234560000000000000000');
});
