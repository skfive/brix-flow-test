// BF-1977: 색상 대비 검사기 — 상대 휘도·대비비 순수 함수 및 상태 판정 단위 테스트.
//
// [리뷰 수정 — file:// CORS 회귀 대응] contrast.js 는 더 이상 ES 모듈이 아니다.
// 브라우저가 file:// 로 열 때 <script type="module"> 이 CORS 정책상 차단되는
// 문제를 피하기 위해 contrast.js 를 import/export 없는 classic script 로
// 전환했다. 이 서브트리(contrast-checker/package.json, "type": "commonjs")
// 에서는 require() 로 동일 파일을 그대로 불러와 순수 함수를 검증한다.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidHex,
  normalizeHex,
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  evaluateThresholds,
  evaluateContrast,
} = require('../contrast.js');

test('relativeLuminance: #FFFFFF는 1.0, #000000은 0.0이다', () => {
  assert.equal(relativeLuminance(hexToRgb('ffffff')), 1);
  assert.equal(relativeLuminance(hexToRgb('000000')), 0);
});

test('contrastRatio: 검정(#000000)/흰색(#FFFFFF) 조합의 대비비는 21:1이다', () => {
  const ratio = contrastRatio('#000000', '#FFFFFF');
  assert.equal(ratio.toFixed(2), '21.00');
});

test('contrastRatio: 인자 순서(전경/배경)를 바꿔도 동일한 대비비를 계산한다', () => {
  const a = contrastRatio('#123456', '#fedcba');
  const b = contrastRatio('#fedcba', '#123456');
  assert.equal(a, b);
});

test('isValidHex: 3자리/6자리, #유무, 대소문자와 무관하게 유효한 hex를 통과시킨다', () => {
  assert.equal(isValidHex('#abc'), true);
  assert.equal(isValidHex('abc'), true);
  assert.equal(isValidHex('#AABBCC'), true);
  assert.equal(isValidHex('aabbcc'), true);
});

test('isValidHex: 잘못된 길이/16진수 아닌 문자/빈 문자열은 무효 처리한다', () => {
  assert.equal(isValidHex('#gg1'), false, '16진수가 아닌 문자 포함');
  assert.equal(isValidHex(''), false, '빈 문자열');
  assert.equal(isValidHex('#1234'), false, '4자리');
  assert.equal(isValidHex('#12345'), false, '5자리');
  assert.equal(isValidHex('#1234567'), false, '7자리 이상');
});

test('normalizeHex: 3자리 표기와 #유무/대소문자를 동일한 6자리 소문자로 정규화한다', () => {
  assert.equal(normalizeHex('#ABC'), 'aabbcc');
  assert.equal(normalizeHex('abc'), 'aabbcc');
  assert.equal(normalizeHex('#aabbcc'), 'aabbcc');
});

test('evaluateThresholds: AA(4.5)/AAA(7)/큰 텍스트 AA(3) 임계값과 정확히 일치하면 통과로 판정한다', () => {
  assert.equal(evaluateThresholds(4.5).aa, true);
  assert.equal(evaluateThresholds(7).aaa, true);
  assert.equal(evaluateThresholds(3).aaLarge, true);
});

test('evaluateThresholds: 임계값보다 근소하게 낮으면 실패로 판정한다', () => {
  assert.equal(evaluateThresholds(4.49).aa, false);
  assert.equal(evaluateThresholds(6.99).aaa, false);
  assert.equal(evaluateThresholds(2.99).aaLarge, false);
});

test('evaluateContrast: 두 입력이 모두 비어있으면 idle 상태이며 결과가 비어있다', () => {
  const result = evaluateContrast('', '  ');
  assert.equal(result.state, 'idle');
  assert.equal(result.ratio, null);
  assert.equal(result.aa, null);
  assert.equal(result.errorMessage, null);
});

test('evaluateContrast: 검정/흰색 기준값은 valid 상태이며 대비비 21:1, AA/AAA/큰 텍스트 AA 모두 통과한다', () => {
  const result = evaluateContrast('#000000', '#FFFFFF');
  assert.equal(result.state, 'valid');
  assert.equal(result.ratio.toFixed(2), '21.00');
  assert.equal(result.aa, true);
  assert.equal(result.aaa, true);
  assert.equal(result.aaLarge, true);
  assert.equal(result.foregroundHex, '#000000');
  assert.equal(result.backgroundHex, '#ffffff');
});

test('evaluateContrast: 잘못된 hex 입력은 error 상태로 계산을 중단하고 오류 메시지를 채운다', () => {
  const result = evaluateContrast('zzz', '#ffffff');
  assert.equal(result.state, 'error');
  assert.equal(result.ratio, null);
  assert.equal(result.aa, null);
  assert.ok(result.errorMessage && result.errorMessage.length > 0);
});

test('evaluateContrast: 배경색만 잘못된 형식이어도 error 상태가 된다', () => {
  const result = evaluateContrast('#000000', 'zz');
  assert.equal(result.state, 'error');
  assert.equal(result.ratio, null);
});

test('evaluateContrast: 한쪽만 입력되고 다른 쪽이 비어있어도 error 상태가 된다(idle 은 둘 다 빈 값일 때만)', () => {
  const result = evaluateContrast('#000000', '');
  assert.equal(result.state, 'error');
});

test('evaluateContrast: 잘못된 입력 뒤 올바른 값으로 고치면 error가 해제되고 valid 상태와 결과가 즉시 재계산된다', () => {
  const invalid = evaluateContrast('zzz', '#ffffff');
  assert.equal(invalid.state, 'error');

  const fixed = evaluateContrast('#000000', '#ffffff');
  assert.equal(fixed.state, 'valid');
  assert.equal(fixed.ratio.toFixed(2), '21.00');
  assert.equal(fixed.errorMessage, null);
});

test('evaluateContrast: 잘못된 입력 뒤 두 입력을 모두 지우면 idle 상태로 복귀한다', () => {
  const invalid = evaluateContrast('zzz', '#ffffff');
  assert.equal(invalid.state, 'error');

  const cleared = evaluateContrast('', '');
  assert.equal(cleared.state, 'idle');
  assert.equal(cleared.errorMessage, null);
});
