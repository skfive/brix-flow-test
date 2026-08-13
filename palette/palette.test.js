const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hexToRgb, rotateHue, contrastRatio } = require('./palette.js');

test('hexToRgb(#FFFFFF) → {r:255, g:255, b:255}', () => {
  assert.deepEqual(hexToRgb('#FFFFFF'), { r: 255, g: 255, b: 255 });
});

test('hexToRgb(#000000) → {r:0, g:0, b:0}', () => {
  assert.deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
});

test('hexToRgb(#2563EB) → {r:37, g:99, b:235}', () => {
  assert.deepEqual(hexToRgb('#2563EB'), { r: 37, g: 99, b: 235 });
});

test('hexToRgb(#f00) 3자리 축약형 확장 → {r:255, g:0, b:0}', () => {
  assert.deepEqual(hexToRgb('#f00'), { r: 255, g: 0, b: 0 });
});

test('rotateHue(#FF0000, 180) → #00FFFF (보색)', () => {
  assert.equal(rotateHue('#FF0000', 180), '#00FFFF');
});

test('rotateHue(#FF0000, 30) → #FF8000 (유사색 +30°)', () => {
  assert.equal(rotateHue('#FF0000', 30), '#FF8000');
});

test('rotateHue(#FF0000, -30) → #FF0080 (유사색 -30°)', () => {
  assert.equal(rotateHue('#FF0000', -30), '#FF0080');
});

test('rotateHue(#2563EB, 180) → #EBAD25 (±1 RGB 단위 허용)', () => {
  const result = rotateHue('#2563EB', 180);
  const { r, g, b } = hexToRgb(result);
  const expected = { r: 0xeb, g: 0xad, b: 0x25 };
  assert.ok(Math.abs(r - expected.r) <= 1);
  assert.ok(Math.abs(g - expected.g) <= 1);
  assert.ok(Math.abs(b - expected.b) <= 1);
});

test('contrastRatio(#FFFFFF, #000000) → 21 (최대 대비)', () => {
  assert.equal(contrastRatio('#FFFFFF', '#000000'), 21);
});

test('contrastRatio(#000000, #000000) → 1 (최소 대비)', () => {
  assert.equal(contrastRatio('#000000', '#000000'), 1);
});

test('contrastRatio(#2563EB, #FFFFFF) → ≈5.17 (허용 오차 ±0.01)', () => {
  const ratio = contrastRatio('#2563EB', '#FFFFFF');
  assert.ok(Math.abs(ratio - 5.17) <= 0.01);
});

test('contrastRatio(#2563EB, #000000) → ≈4.06이며 흰색(5.17) 대비가 더 높아 흰 텍스트가 권장됨', () => {
  const white = contrastRatio('#2563EB', '#FFFFFF');
  const black = contrastRatio('#2563EB', '#000000');
  assert.ok(Math.abs(black - 4.06) <= 0.01);
  assert.ok(white > black);
});
