// BF-1971 기간 변환기 회귀 테스트
// frozen 설계: docs/plans/BF-1969/implementation-plan.md

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// duration.js는 file://로 열어도 동작해야 하므로 import/export(ESM)를 쓰지 않는 classic script다.
// (type="module" 스크립트는 file:// 오픈 시 브라우저 CORS 정책으로 차단됨.)
// side-effect import로 실행시킨 뒤 globalThis.DurationConverter에서 공개 API를 꺼내 쓴다.
import '../src/duration.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexHtmlPath = join(__dirname, '..', 'index.html');

const {
  DEBOUNCE_MS,
  canonicalizeSeconds,
  parseSecondsInput,
  parseDurationInput,
  formatDuration,
  createDurationConverter,
  _durationCacheSizeForTest,
  _resetDurationCacheForTest,
} = globalThis.DurationConverter;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class FakeClassList {
  constructor() {
    this._set = new Set();
  }
  add(...classes) {
    for (const c of classes) this._set.add(c);
  }
  remove(...classes) {
    for (const c of classes) this._set.delete(c);
  }
  contains(c) {
    return this._set.has(c);
  }
}

// 실제 DOM처럼 el.value = x 는 기본적으로 input 이벤트를 발생시키지 않는다.
// autoFireInput=true 인 경우에만 예외적으로 값 대입 시 input 이벤트를 재발화해
// §5 무한루프 가드(isProgrammaticUpdate)를 적극적으로 스트레스 테스트한다.
class FakeElement {
  constructor({ value = '', autoFireInput = false } = {}) {
    this._value = value;
    this._autoFireInput = autoFireInput;
    this._listeners = {};
    this.textContent = '';
    this.classList = new FakeClassList();
    this.setCallCount = 0;
  }
  get value() {
    return this._value;
  }
  set value(v) {
    this._value = v;
    this.setCallCount += 1;
    if (this._autoFireInput) this.dispatch('input');
  }
  addEventListener(type, handler) {
    (this._listeners[type] ||= []).push(handler);
  }
  dispatch(type) {
    for (const handler of this._listeners[type] || []) handler({ target: this });
  }
}

function buildController(overrides = {}) {
  const secondsInput = overrides.secondsInput || new FakeElement();
  const durationInput = overrides.durationInput || new FakeElement();
  const elements = {
    secondsInput,
    durationInput,
    secondsField: new FakeElement(),
    durationField: new FakeElement(),
    errorMessage: new FakeElement(),
    statusText: new FakeElement(),
    quickSelectButtons: {
      '30s': new FakeElement(),
      '5m': new FakeElement(),
      '1h': new FakeElement(),
      '1d': new FakeElement(),
    },
  };
  const controller = createDurationConverter(elements, overrides.options);
  return { elements, controller };
}

// ---------------------------------------------------------------------------
// canonicalizeSeconds — F4(소수점 초 반올림) / 음수·NaN 방어
// ---------------------------------------------------------------------------

test('canonicalizeSeconds: 소수는 반올림한다 (F4)', () => {
  assert.equal(canonicalizeSeconds(65.4), 65);
  assert.equal(canonicalizeSeconds(65.5), 66);
});

test('canonicalizeSeconds: 음수는 0으로, NaN은 0으로 정규화한다', () => {
  assert.equal(canonicalizeSeconds(-5), 0);
  assert.equal(canonicalizeSeconds(NaN), 0);
});

// ---------------------------------------------------------------------------
// parseSecondsInput — F1/F2, 빈 문자열/음수 오류 처리
// ---------------------------------------------------------------------------

test('parseSecondsInput: 유효한 정수는 통과한다', () => {
  assert.deepEqual(parseSecondsInput('5400'), { ok: true, seconds: 5400 });
  assert.deepEqual(parseSecondsInput('0'), { ok: true, seconds: 0 });
});

test('parseSecondsInput: 빈 문자열은 오류다', () => {
  const result = parseSecondsInput('');
  assert.equal(result.ok, false);
  assert.equal(result.error, '값을 입력하세요');
});

test('parseSecondsInput: 음수/소수/비숫자는 오류다', () => {
  assert.equal(parseSecondsInput('-5').ok, false);
  assert.equal(parseSecondsInput('5.5').ok, false);
  assert.equal(parseSecondsInput('abc').ok, false);
});

test('parseSecondsInput: 안전 정수 범위를 넘으면 오류다', () => {
  const result = parseSecondsInput('99999999999999999999');
  assert.equal(result.ok, false);
  assert.equal(result.error, '값이 너무 큽니다');
});

// ---------------------------------------------------------------------------
// parseDurationInput — F1(지원 단위 일/시/분/초) / 고정 순서 문법 / 오류 처리
// ---------------------------------------------------------------------------

test('parseDurationInput: 일부 단위만 있어도 파싱된다', () => {
  assert.deepEqual(parseDurationInput('30분'), { ok: true, seconds: 1800 });
  assert.deepEqual(parseDurationInput('1시간 30분'), { ok: true, seconds: 5400 });
  assert.deepEqual(parseDurationInput('90분'), { ok: true, seconds: 5400 });
});

test('parseDurationInput: 0초는 오류가 아니라 seconds=0으로 처리한다 (F2)', () => {
  assert.deepEqual(parseDurationInput('0초'), { ok: true, seconds: 0 });
});

test('parseDurationInput: 빈 문자열은 오류다', () => {
  const result = parseDurationInput('   ');
  assert.equal(result.ok, false);
  assert.equal(result.error, '값을 입력하세요');
});

test('parseDurationInput: 순서가 뒤바뀌면 오류다 (frozen §9)', () => {
  assert.equal(parseDurationInput('30분 1시간').ok, false);
});

test('parseDurationInput: 문법 밖 단위/음수/소수는 오류다', () => {
  assert.equal(parseDurationInput('1주').ok, false);
  assert.equal(parseDurationInput('-5분').ok, false);
  assert.equal(parseDurationInput('1.5시간').ok, false);
});

test('parseDurationInput: 안전 정수 범위를 넘으면 오류다', () => {
  const result = parseDurationInput('99999999999999999999일');
  assert.equal(result.ok, false);
  assert.equal(result.error, '값이 너무 큽니다');
});

// ---------------------------------------------------------------------------
// formatDuration — F2(0초 표시) / F3(동치 표현 정규화) / P3(메모이제이션)
// ---------------------------------------------------------------------------

test('formatDuration: 0초는 "0초"로 표시한다', () => {
  assert.equal(formatDuration(0), '0초');
});

test('formatDuration: 동치 표현은 항상 같은 정규화 결과를 낸다 (F3)', () => {
  const a = parseDurationInput('90분');
  const b = parseDurationInput('1시간 30분');
  assert.equal(formatDuration(a.seconds), formatDuration(b.seconds));
  assert.equal(formatDuration(a.seconds), '1시간 30분');
});

test('왕복 검증: seconds -> duration -> seconds', () => {
  const original = 90061; // 1일 1시간 1분 1초
  const text = formatDuration(original);
  assert.equal(text, '1일 1시간 1분 1초');
  const parsed = parseDurationInput(text);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.seconds, original);
});

test('formatDuration: 동일 canonical seconds는 캐시를 재사용한다 (P3)', () => {
  _resetDurationCacheForTest();
  const before = _durationCacheSizeForTest();
  formatDuration(parseDurationInput('90분').seconds);
  formatDuration(parseDurationInput('1시간 30분').seconds); // 같은 key(5400) → 캐시 재사용
  const after = _durationCacheSizeForTest();
  assert.equal(after, before + 1);
});

// ---------------------------------------------------------------------------
// createDurationConverter — 상태 전이 / 디바운스(P1·P2) / 즉시 오류(F2)
// ---------------------------------------------------------------------------

test('P1/P2: 유효 입력은 디바운스 후에만 상대 필드를 갱신한다 (150ms 이내)', async () => {
  assert.ok(DEBOUNCE_MS <= 150, 'DEBOUNCE_MS는 P2 상한(150ms)을 넘지 않아야 한다');

  const { elements } = buildController();
  elements.secondsInput.value = '90';
  elements.secondsInput.dispatch('input');

  // 디바운스 유예 기간 동안에는 아직 갱신되지 않는다
  assert.equal(elements.durationInput.value, '');

  await delay(DEBOUNCE_MS + 130); // 여유를 두고 대기 (CI 스케줄링 지연 허용)
  assert.equal(elements.durationInput.value, '1분 30초');
});

test('F2: 무효 입력은 디바운스 없이 즉시 오류로 반영된다', () => {
  const { elements, controller } = buildController();
  elements.secondsInput.value = '-5';
  elements.secondsInput.dispatch('input');

  assert.equal(controller.getState(), 'error');
  assert.equal(elements.errorMessage.textContent, '0 이상의 정수를 입력하세요');
  assert.ok(elements.secondsField.classList.contains('field--error'));
});

test('오류 복귀: 유효 값을 입력하면 error-message가 즉시 사라지고 두 입력란이 갱신 가능한 상태로 복원된다', async () => {
  const { elements, controller } = buildController();

  elements.secondsInput.value = '-5';
  elements.secondsInput.dispatch('input');
  assert.equal(controller.getState(), 'error');

  elements.secondsInput.value = '42';
  elements.secondsInput.dispatch('input');

  // 즉시(디바운스 대기 없이) 오류 표시가 사라진다
  assert.equal(elements.errorMessage.textContent, '');
  assert.equal(elements.secondsField.classList.contains('field--error'), false);

  await delay(DEBOUNCE_MS + 130);
  assert.equal(elements.durationInput.value, '42초');

  // 두 입력란 모두 다시 갱신 가능한 상태(주 입력 control 재활성화) — 이어지는 입력이 정상 반영되는지로 검증
  elements.durationInput.value = '2분';
  elements.durationInput.dispatch('input');
  await delay(DEBOUNCE_MS + 130);
  assert.equal(elements.secondsInput.value, '120');
});

test('T6: 활성 필드와 상대 필드가 모두 비면 idle로 복귀한다', async () => {
  const { elements, controller } = buildController();

  elements.secondsInput.value = '5';
  elements.secondsInput.dispatch('input');
  await delay(DEBOUNCE_MS + 130);
  assert.equal(elements.durationInput.value, '5초');

  // 초 입력란만 비우면 상대 필드가 비어있지 않으므로 오류
  elements.secondsInput.value = '';
  elements.secondsInput.dispatch('input');
  assert.equal(controller.getState(), 'error');
  assert.equal(elements.errorMessage.textContent, '값을 입력하세요');

  // 상대 필드도 비우면 idle로 복귀
  elements.durationInput.value = '';
  elements.durationInput.dispatch('input');
  assert.equal(controller.getState(), 'idle');
  assert.equal(elements.errorMessage.textContent, '');
  assert.equal(elements.secondsField.classList.contains('field--error'), false);
  assert.equal(elements.durationField.classList.contains('field--error'), false);
});

test('T5: quick-select는 디바운스 없이 즉시 두 필드를 갱신한다', () => {
  const { elements, controller } = buildController();
  elements.quickSelectButtons['5m'].dispatch('click');

  assert.equal(elements.secondsInput.value, '300');
  assert.equal(elements.durationInput.value, '5분');
  assert.equal(controller.getState(), 'seconds-active');
  assert.equal(elements.errorMessage.textContent, '');
});

test('P3: 이미 반영된 것과 동일한 정규화 값이면 대상 필드를 재작성하지 않는다', async () => {
  const { elements } = buildController();

  elements.secondsInput.value = '5400';
  elements.secondsInput.dispatch('input');
  await delay(DEBOUNCE_MS + 130);
  assert.equal(elements.durationInput.value, '1시간 30분');
  const writesAfterFirstSync = elements.durationInput.setCallCount;

  // 다른 텍스트 표현이지만 동일한 canonical seconds(5400)로 수렴
  elements.secondsInput.value = '5400';
  elements.secondsInput.dispatch('input');
  await delay(DEBOUNCE_MS + 130);

  assert.equal(elements.durationInput.value, '1시간 30분');
  assert.equal(elements.durationInput.setCallCount, writesAfterFirstSync); // 재작성 skip
});

test('무한 루프 가드: 프로그램적 대입이 상대 필드 핸들러를 재유발해도 되돌아오지 않는다', async () => {
  // durationInput은 값 대입 시 input 이벤트를 재발화하는 방어적 스트레스 시나리오
  const secondsInput = new FakeElement();
  const durationInput = new FakeElement({ autoFireInput: true });
  const { elements } = buildController({ secondsInput, durationInput });

  elements.secondsInput.value = '42';
  elements.secondsInput.dispatch('input');
  await delay(DEBOUNCE_MS + 130);

  assert.equal(elements.durationInput.value, '42초');
  assert.equal(elements.secondsInput.value, '42'); // 되돌아와 덮어써지지 않음
});

// ---------------------------------------------------------------------------
// index.html — bootstrapFromDocument()가 실제로 찾는 7개 frozen id 존재 여부(오타 회귀 가드)
// ---------------------------------------------------------------------------

test('index.html: 7개 frozen id가 정확히 1회씩 존재한다 (bootstrap 스모크)', () => {
  const html = readFileSync(indexHtmlPath, 'utf8');
  const requiredIds = [
    'seconds-input',
    'duration-input',
    'error-message',
    'quick-select-30s',
    'quick-select-5m',
    'quick-select-1h',
    'quick-select-1d',
  ];
  for (const id of requiredIds) {
    const matches = html.match(new RegExp(`id="${id}"`, 'g')) || [];
    assert.equal(matches.length, 1, `id="${id}" 는 정확히 1회 존재해야 한다`);
  }
});

test('index.html: duration.js를 classic script(비-module)로 로드한다 (file:// 호환)', () => {
  const html = readFileSync(indexHtmlPath, 'utf8');
  assert.match(html, /<script\s+src="\.\/src\/duration\.js"><\/script>/);
  assert.doesNotMatch(html, /<script[^>]*type=["']module["']/);
});
