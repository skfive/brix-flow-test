const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hexToHsl, hslToHex, buildPalette } = require('./palette.js');

test('hexToHsl(#ff0000) 기본 변환', () => {
  assert.deepEqual(hexToHsl('#ff0000'), { h: 0, s: 100, l: 50 });
});

test('hexToHsl 접두사 없이도 정상 파싱 (대소문자 무관)', () => {
  const result = hexToHsl('3b82f6');
  assert.equal(typeof result.h, 'number');
  assert.equal(typeof result.s, 'number');
  assert.equal(typeof result.l, 'number');
});

test('hexToHsl 잘못된 hex 입력 시 Error throw', () => {
  assert.throws(() => hexToHsl('#zzzzzz'));
});

test('hslToHex 기본 변환', () => {
  assert.equal(hslToHex({ h: 0, s: 100, l: 50 }), '#ff0000');
});

test('hslToHex h=360 정규화 (0과 360 동일 처리)', () => {
  assert.equal(hslToHex({ h: 360, s: 100, l: 50 }), '#ff0000');
});

test('왕복 변환: hslToHex(hexToHsl(hex)) === 원본 hex', () => {
  const hex = '#ff0000';
  assert.equal(hslToHex(hexToHsl(hex)), hex);
});

test('buildPalette는 길이 5의 유효한 #rrggbb 배열을 반환', () => {
  const palette = buildPalette('#3b82f6');
  assert.equal(palette.length, 5);
  for (const { hex } of palette) {
    assert.match(hex, /^#[0-9a-f]{6}$/);
  }
});

test('buildPalette complementary 원소는 기준색과 hue 180도 차이', () => {
  const base = hexToHsl('#3b82f6');
  const palette = buildPalette('#3b82f6');
  const complementary = palette.find((p) => p.role === 'complementary');
  const compHsl = hexToHsl(complementary.hex);
  const diff = Math.abs(compHsl.h - base.h);
  assert.ok(Math.abs(diff - 180) <= 1);
});

test('buildPalette lighter/darker는 lightness 상/하한(95/5)으로 clamp', () => {
  const lightPalette = buildPalette('#ffffff');
  const lighter = hexToHsl(lightPalette.find((p) => p.role === 'lighter').hex);
  assert.ok(lighter.l <= 95);

  const darkPalette = buildPalette('#000000');
  const darker = hexToHsl(darkPalette.find((p) => p.role === 'darker').hex);
  assert.ok(darker.l >= 5);
});

test('buildPalette 잘못된 기준색 입력 시 Error throw', () => {
  assert.throws(() => buildPalette('invalid'));
});
