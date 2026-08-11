// BF-1965: 색상 대비 검사기 계산 로직 및 잘못된 입력 처리(F2) 테스트.
// index.html은 외부 모듈 시스템 없는 단일 파일이므로, 인라인 <script>를 추출해
// node:vm 컨텍스트에서 실행하고 globalThis.__contrastChecker로 노출된 순수
// 계산 함수를 검증한다(브라우저 DOM 없이도 동작 — document가 없으면 initApp
// 등록을 건너뛰도록 index.html에 가드되어 있다).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const htmlPath = path.join(__dirname, '..', 'index.html');
const html = readFileSync(htmlPath, 'utf8');

function loadContrastModule() {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'index.html 안에 인라인 <script>가 있어야 합니다.');

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(match[1], sandbox, { filename: 'contrast-checker-inline-script.js' });

  assert.ok(
    sandbox.__contrastChecker,
    '계산 함수가 globalThis.__contrastChecker로 노출되어야 합니다.'
  );
  return sandbox.__contrastChecker;
}

test('F1: hex 3자리/6자리, #유무, 대소문자를 동일한 6자리 소문자로 정규화한다', () => {
  const { normalizeHex } = loadContrastModule();
  assert.equal(normalizeHex('#abc'), 'aabbcc');
  assert.equal(normalizeHex('abc'), 'aabbcc');
  assert.equal(normalizeHex('#AABBCC'), 'aabbcc');
  assert.equal(normalizeHex('aabbcc'), 'aabbcc');
});

test('F1: hex 3자리 표기와 6자리 표기는 동일한 대비율을 계산한다(정규화 키 수렴)', () => {
  const { getContrastResult } = loadContrastModule();
  const short = getContrastResult('#abc', '#ffffff');
  const long = getContrastResult('#aabbcc', '#ffffff');
  assert.equal(short.ratio, long.ratio);
});

test('F2: 잘못된 hex 입력 형식을 판별한다(길이 불일치/16진수 아님/빈 값)', () => {
  const { isValidHex } = loadContrastModule();
  assert.equal(isValidHex('#gg1'), false, '16진수가 아닌 문자 포함');
  assert.equal(isValidHex(''), false, '빈 문자열');
  assert.equal(isValidHex('#1234'), false, '4자리');
  assert.equal(isValidHex('#12345'), false, '5자리');
  assert.equal(isValidHex('#1234567'), false, '7자리 이상');
  assert.equal(isValidHex('#a'), false, '1자리');
});

test('F2: 유효한 hex 형식은 #유무/대소문자와 무관하게 통과한다', () => {
  const { isValidHex } = loadContrastModule();
  assert.equal(isValidHex('#abc'), true);
  assert.equal(isValidHex('aabbcc'), true);
  assert.equal(isValidHex('#AABBCC'), true);
});

test('F3: 흑(#000000)/백(#ffffff) 조합의 대비율은 21.00:1이다', () => {
  const { getContrastResult } = loadContrastModule();
  const result = getContrastResult('#000000', '#ffffff');
  assert.equal(result.ratio.toFixed(2), '21.00');
  assert.equal(result.aa, true);
  assert.equal(result.aaLarge, true);
  assert.equal(result.aaa, true);
});

test('F3: 동일 색상 조합의 대비율은 1.00:1이며 모든 배지가 fail이다', () => {
  const { getContrastResult } = loadContrastModule();
  const result = getContrastResult('#ffffff', '#ffffff');
  assert.equal(result.ratio.toFixed(2), '1.00');
  assert.equal(result.aa, false);
  assert.equal(result.aaLarge, false);
  assert.equal(result.aaa, false);
});

test('F3: 임계값 경계 근접 케이스(#777777 on #ffffff)의 배지 판정이 정확하다', () => {
  const { getContrastResult } = loadContrastModule();
  const result = getContrastResult('#777777', '#ffffff');
  assert.equal(result.ratio.toFixed(2), '4.48');
  assert.equal(result.aa, false, 'AA(4.5) 미만이므로 fail');
  assert.equal(result.aaLarge, true, 'AA-large(3.0) 이상이므로 pass');
  assert.equal(result.aaa, false, 'AAA(7.0) 미만이므로 fail');
});

test('F4: swap-colors-btn과 동등한 전경/배경 교환에도 대비율 값은 동일하다', () => {
  const { getContrastResult } = loadContrastModule();
  const original = getContrastResult('#123456', '#fedcba');
  const swapped = getContrastResult('#fedcba', '#123456');
  assert.equal(original.ratio, swapped.ratio);
});

test('P3: 정규화 키가 같으면 메모이제이션 캐시를 재사용하고 새 항목을 만들지 않는다', () => {
  const { getContrastResult, cache } = loadContrastModule();
  const first = getContrastResult('#abc', '#ffffff');
  assert.equal(cache.size, 1);
  const second = getContrastResult('#aabbcc', '#ffffff');
  assert.equal(cache.size, 1, '#abc와 #aabbcc는 동일 캐시 키(aabbcc:ffffff)를 사용한다');
  assert.equal(first.ratio, second.ratio);
  assert.equal(cache.get('aabbcc:ffffff').ratio, first.ratio);
});
