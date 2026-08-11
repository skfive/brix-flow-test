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

// --- DOM 상호작용 경로(F2 오류 표시/직전 결과 초기화/복구 후 재활성화) 검증용 최소 fake DOM ---
//
// index.html의 setFieldError/clearResultDisplay/performRecalculation/clearFieldError는
// initApp() 클로저 내부에 있어 __contrastChecker로 노출되지 않는다. 이 함수들을
// 실제로 구동해 검증하려면 브라우저(jsdom 등 외부 의존성) 없이도 최소한의
// getElementById/addEventListener/classList/style 인터페이스를 흉내 낸 fake
// document를 vm 컨텍스트에 주입해 인라인 <script>가 initApp()을 그대로 실행하게
// 한다(vanilla-static 스택은 외부 의존성 0건이므로 jsdom을 추가하지 않는다).
function createFakeElement() {
  const listeners = Object.create(null);
  return {
    value: '',
    textContent: '',
    disabled: false,
    style: {},
    classList: {
      set: new Set(),
      add(...names) {
        names.forEach((n) => this.set.add(n));
      },
      remove(...names) {
        names.forEach((n) => this.set.delete(n));
      },
      contains(n) {
        return this.set.has(n);
      },
    },
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    trigger(type) {
      (listeners[type] || []).forEach((fn) => fn());
    },
  };
}

const FAKE_DOM_IDS = [
  'fg-color-hex',
  'fg-color-picker',
  'bg-color-hex',
  'bg-color-picker',
  'swap-colors-btn',
  'contrast-ratio-value',
  'badge-aa',
  'badge-aa-large',
  'badge-aaa',
  'preview-sample',
  'input-error-message',
];

function mountFakeApp() {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'index.html 안에 인라인 <script>가 있어야 합니다.');

  const elements = {};
  FAKE_DOM_IDS.forEach((id) => {
    elements[id] = createFakeElement();
  });

  const fakeDocument = {
    // readyState를 'loading'으로 두지 않으므로 index.html의 초기화 분기가
    // DOMContentLoaded를 기다리지 않고 initApp()을 동기 실행한다.
    getElementById: (id) => elements[id],
  };

  const sandbox = { document: fakeDocument, setTimeout, clearTimeout };
  vm.createContext(sandbox);
  vm.runInContext(match[1], sandbox, { filename: 'contrast-checker-inline-script.js' });

  return elements;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

test('AC3/F2: 잘못된 hex 입력 시 디바운스를 우회해 즉시 오류 문구를 표시하고 직전 유효 결과(대비율/배지/미리보기)를 지운다', () => {
  const el = mountFakeApp();

  // 마운트 시 기본값(#000000/#ffffff)은 디바운스 없이 즉시 계산되어 있어야 한다.
  assert.equal(el['contrast-ratio-value'].textContent, '21.00:1');
  assert.ok(el['badge-aa'].classList.contains('contrast-badge--pass'));
  assert.equal(el['input-error-message'].textContent, '');

  el['fg-color-hex'].value = 'zzz';
  el['fg-color-hex'].trigger('input');

  // input 이벤트 핸들러가 동기적으로 오류 처리를 수행하므로, 디바운스 타이머를
  // 기다리지 않고(F2 "즉시" 요구) 바로 단언해도 반영되어 있어야 한다.
  assert.notEqual(
    el['input-error-message'].textContent,
    '',
    '오류 문구가 즉시 표시되어야 한다'
  );
  assert.equal(el['contrast-ratio-value'].textContent, '–', '직전 대비율 값이 지워져야 한다');
  assert.equal(
    el['badge-aa'].classList.contains('contrast-badge--pass'),
    false,
    '직전 AA 배지의 pass 상태가 지워져야 한다'
  );
  assert.equal(el['badge-aa'].classList.contains('contrast-badge--fail'), false);
  assert.equal(el['badge-aa'].textContent, 'AA: –');
  assert.equal(el['badge-aa-large'].textContent, 'AA (large): –');
  assert.equal(el['badge-aaa'].textContent, 'AAA: –');
  assert.equal(el['preview-sample'].style.backgroundColor, '', '미리보기 배경이 지워져야 한다');
  assert.equal(el['preview-sample'].style.color, '');
});

test('AC3: 잘못된 입력이 있는 동안 swap-colors-btn(주 실행 control)이 비활성화된다', () => {
  const el = mountFakeApp();
  assert.equal(el['swap-colors-btn'].disabled, false, '유효 상태에서는 활성화되어 있어야 한다');

  el['fg-color-hex'].value = '#12345';
  el['fg-color-hex'].trigger('input');

  assert.equal(
    el['swap-colors-btn'].disabled,
    true,
    '잘못된 입력 동안에는 swap-colors-btn이 비활성화되어야 한다'
  );
});

test('AC3: 잘못된 입력 뒤 유효한 값으로 복구되면(P2: 150ms 이내) input-error-message가 제거되고 결과/swap-colors-btn이 재표시·재활성화된다', async () => {
  const el = mountFakeApp();

  el['fg-color-hex'].value = 'zzz';
  el['fg-color-hex'].trigger('input');
  assert.notEqual(el['input-error-message'].textContent, '');
  assert.equal(el['swap-colors-btn'].disabled, true);

  el['fg-color-hex'].value = '#123456';
  el['fg-color-hex'].trigger('input');

  // P1(디바운스)과 P2(150ms 상한)를 동시에 만족하는지 확인하기 위해 150ms까지
  // 기다린 뒤(디바운스 지연 100ms + 여유) 갱신 결과를 단언한다.
  await wait(150);

  assert.equal(
    el['input-error-message'].textContent,
    '',
    '복구 후 오류 문구가 제거되어야 한다'
  );
  assert.notEqual(
    el['contrast-ratio-value'].textContent,
    '–',
    '복구 후 대비율이 재표시되어야 한다'
  );
  assert.ok(
    el['badge-aa'].classList.contains('contrast-badge--pass') ||
      el['badge-aa'].classList.contains('contrast-badge--fail'),
    '복구 후 배지가 재표시되어야 한다'
  );
  assert.equal(
    el['swap-colors-btn'].disabled,
    false,
    '복구 후 swap-colors-btn이 재활성화되어야 한다'
  );
});

test('F4(DOM): swap-colors-btn 클릭으로 전경/배경을 교환해도 표시되는 대비율 값은 동일하다', async () => {
  const el = mountFakeApp();

  el['fg-color-hex'].value = '#123456';
  el['fg-color-hex'].trigger('input');
  el['bg-color-hex'].value = '#fedcba';
  el['bg-color-hex'].trigger('input');
  await wait(150);

  const before = el['contrast-ratio-value'].textContent;
  assert.notEqual(before, '–');

  el['swap-colors-btn'].trigger('click');
  await wait(150);

  assert.equal(el['contrast-ratio-value'].textContent, before);
  assert.equal(el['fg-color-hex'].value, '#fedcba');
  assert.equal(el['bg-color-hex'].value, '#123456');
});
