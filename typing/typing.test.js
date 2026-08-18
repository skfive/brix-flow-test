'use strict';

// typing.js는 브라우저에서 file:// 로 <script> classic 태그 로드가 가능해야 하므로
// import/export 문 없이 IIFE + globalThis.TypingPractice 로 노출한다.
// 여기서는 부수효과 import 로 로드한 뒤 globalThis.TypingPractice 에서 꺼내 쓴다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './typing.js';

const { evaluateInput, computeStats } = globalThis.TypingPractice;

// ---- evaluateInput(target, typed) — docs/plans/BF-2178/implementation-plan.md §6 ----

test('evaluateInput: typed가 빈 문자열이면 모든 글자가 pending, done=false, errorCount=0', () => {
  const result = evaluateInput('abc', '');
  assert.deepEqual(
    result.chars,
    [
      { char: 'a', status: 'pending' },
      { char: 'b', status: 'pending' },
      { char: 'c', status: 'pending' }
    ]
  );
  assert.equal(result.done, false);
  assert.equal(result.errorCount, 0);
});

test('evaluateInput: 부분 입력 중 정타/오타/미입력이 섞이면 각 글자 상태가 정확히 매핑된다', () => {
  const result = evaluateInput('abcde', 'abx');
  assert.deepEqual(
    result.chars,
    [
      { char: 'a', status: 'correct' },
      { char: 'b', status: 'correct' },
      { char: 'c', status: 'incorrect' },
      { char: 'd', status: 'pending' },
      { char: 'e', status: 'pending' }
    ]
  );
  assert.equal(result.done, false);
  assert.equal(result.errorCount, 1);
});

test('evaluateInput: 입력 길이가 target 길이에 도달하면 done=true', () => {
  const result = evaluateInput('abc', 'abc');
  assert.equal(result.done, true);
  assert.equal(result.errorCount, 0);
});

test('evaluateInput: 전부 오타로 완료된 경우 done=true이고 errorCount가 전체 글자 수와 같다', () => {
  const result = evaluateInput('abc', 'xyz');
  assert.equal(result.done, true);
  assert.equal(result.errorCount, 3);
  assert.deepEqual(result.chars.map((c) => c.status), ['incorrect', 'incorrect', 'incorrect']);
});

test('evaluateInput: 원본 target/typed 문자열을 변경하지 않는다', () => {
  const target = 'abc';
  const typed = 'ab';
  evaluateInput(target, typed);
  assert.equal(target, 'abc');
  assert.equal(typed, 'ab');
});

test('evaluateInput: 호출마다 새 배열을 반환하며 이전 결과가 공유되지 않는다', () => {
  const first = evaluateInput('abc', 'a');
  const second = evaluateInput('abc', 'ab');
  assert.notEqual(first.chars, second.chars);
  assert.equal(first.chars[1].status, 'pending');
  assert.equal(second.chars[1].status, 'correct');
});

// ---- computeStats(target, typed, elapsedMs) — 5글자 = 1단어 기준 WPM/정확도 ----

test('computeStats: 10글자 전부 정타, 60000ms(1분) === wpm 2, accuracy 100', () => {
  const stats = computeStats('abcdefghij', 'abcdefghij', 60000);
  assert.equal(stats.wpm, 2);
  assert.equal(stats.accuracy, 100);
  assert.equal(stats.errorCount, 0);
});

test('computeStats: 10글자 중 8글자 정타 === accuracy 80', () => {
  const stats = computeStats('abcdefghij', 'abcdefghxx', 60000);
  assert.equal(stats.accuracy, 80);
  assert.equal(stats.errorCount, 2);
});

test('computeStats: elapsedMs === 0이면 0으로 나눔 없이 wpm 0을 반환한다', () => {
  const stats = computeStats('abcdefghij', 'abcdefghij', 0);
  assert.equal(stats.wpm, 0);
});

test('computeStats: typed가 빈 문자열이면 accuracy 0, wpm 0', () => {
  const stats = computeStats('abcdefghij', '', 60000);
  assert.equal(stats.accuracy, 0);
  assert.equal(stats.wpm, 0);
  assert.equal(stats.errorCount, 0);
});

test('computeStats: 30000ms(0.5분), 10글자 정타 === wpm 4 (분수 환산)', () => {
  const stats = computeStats('abcdefghij', 'abcdefghij', 30000);
  assert.equal(stats.wpm, 4);
});

test('computeStats: typed가 target보다 길어도 target 길이만큼만 비교해 정확도를 계산한다', () => {
  const stats = computeStats('abc', 'abcxx', 60000);
  assert.equal(stats.errorCount, 2);
  assert.equal(stats.accuracy, 60);
});

test('computeStats: elapsedMs가 전달된 값 그대로 결과에 포함된다', () => {
  const stats = computeStats('abcde', 'abcde', 12345);
  assert.equal(stats.elapsedMs, 12345);
});

// ---- DOM 바인딩 — docs/plans/BF-2178/implementation-plan.md §2(상태 전이표)·§3(재시작)·§4(입력 규칙) ----
//
// jsdom 등 외부 의존성 없이(vanilla-static 제약) 최소 fake DOM으로 typing.js의
// bindTypingUI 이벤트 핸들러 동작을 검증한다. 매 테스트마다 캐시버스팅 쿼리로
// typing.js를 다시 import해 상태를 격리한다(모듈 top-level에서 document 존재 시
// 즉시 바인딩되므로, import 시점에 fake document가 global에 있어야 한다).

function createFakeElement() {
  const listeners = new Map();
  return {
    _attrs: {},
    className: '',
    textContent: '',
    _innerHTML: '',
    value: '',
    disabled: false,
    hidden: true,
    children: [],
    focused: false,
    setAttribute(name, val) {
      this._attrs[name] = val;
    },
    getAttribute(name) {
      return this._attrs[name];
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    dispatch(type, event) {
      (listeners.get(type) || []).forEach((handler) => handler(event));
    },
    appendChild(child) {
      this.children.push(child);
    },
    focus() {
      this.focused = true;
    },
    set innerHTML(value) {
      this._innerHTML = value;
      if (value === '') this.children = [];
    },
    get innerHTML() {
      return this._innerHTML;
    }
  };
}

function createFakeDocument() {
  const ids = [
    'typing-root',
    'status-text',
    'prompt-text',
    'typed-input',
    'paste-warning',
    'restart-button',
    'wpm-value',
    'accuracy-value',
    'error-count-value'
  ];
  const elements = new Map();
  ids.forEach((id) => elements.set(id, createFakeElement()));
  return {
    getElementById(id) {
      return elements.get(id) || null;
    },
    createElement() {
      return createFakeElement();
    }
  };
}

let domTestCounter = 0;

// typing.js는 이벤트 핸들러 안에서도 (renderPrompt의 document.createElement 등)
// 전역 document를 직접 참조하므로, import 시점뿐 아니라 핸들러 호출 시점까지
// globalThis.document가 유지돼야 한다. 다음 loadTypingUI 호출이 새 fake document로
// 덮어쓰므로 테스트 간 상태는 격리된다.
async function loadTypingUI() {
  const fakeDocument = createFakeDocument();
  globalThis.document = fakeDocument;
  domTestCounter += 1;
  await import(`./typing.js?domtest=${domTestCounter}`);
  return fakeDocument;
}

test('DOM: 초기 로드 시 idle 상태이고 typed-input이 비어있고 활성화되어 있다', async () => {
  const doc = await loadTypingUI();
  const root = doc.getElementById('typing-root');
  const statusText = doc.getElementById('status-text');
  const typedInput = doc.getElementById('typed-input');
  assert.equal(root.getAttribute('data-state'), 'idle');
  assert.equal(statusText.textContent, '대기 중 — 입력을 시작하세요');
  assert.equal(typedInput.value, '');
  assert.equal(typedInput.disabled, false);
});

test('DOM: 첫 글자를 입력하면 typing 상태로 전환되고 상태 문구가 바뀐다', async () => {
  const doc = await loadTypingUI();
  const typedInput = doc.getElementById('typed-input');
  const statusText = doc.getElementById('status-text');
  const root = doc.getElementById('typing-root');
  typedInput.value = 'T';
  typedInput.dispatch('input', {});
  assert.equal(root.getAttribute('data-state'), 'typing');
  assert.equal(statusText.textContent, '입력 중');
});

test('DOM: typing 상태에서 백스페이스로 입력을 모두 지우면 idle로 되돌아간다', async () => {
  const doc = await loadTypingUI();
  const typedInput = doc.getElementById('typed-input');
  const root = doc.getElementById('typing-root');
  typedInput.value = 'T';
  typedInput.dispatch('input', {});
  typedInput.value = '';
  typedInput.dispatch('input', {});
  assert.equal(root.getAttribute('data-state'), 'idle');
});

test('DOM: 목표 문장을 모두 입력하면 done 상태가 되고 typed-input이 비활성화되며 통계가 표시된다', async () => {
  const doc = await loadTypingUI();
  const typedInput = doc.getElementById('typed-input');
  const root = doc.getElementById('typing-root');
  const statusText = doc.getElementById('status-text');
  const wpmValue = doc.getElementById('wpm-value');
  const target = globalThis.TypingPractice.TARGET_TEXT;

  typedInput.value = target;
  typedInput.dispatch('input', {});

  assert.equal(root.getAttribute('data-state'), 'done');
  assert.equal(statusText.textContent, '완료되었습니다');
  assert.equal(typedInput.disabled, true);
  assert.equal(typeof wpmValue.textContent, 'string');
});

test('DOM: typed-input에서 Enter는 preventDefault되고 값과 상태가 바뀌지 않는다', async () => {
  const doc = await loadTypingUI();
  const typedInput = doc.getElementById('typed-input');
  const root = doc.getElementById('typing-root');

  typedInput.value = 'T';
  typedInput.dispatch('input', {});

  let prevented = false;
  typedInput.dispatch('keydown', {
    key: 'Enter',
    preventDefault() {
      prevented = true;
    }
  });

  assert.equal(prevented, true);
  assert.equal(typedInput.value, 'T');
  assert.equal(root.getAttribute('data-state'), 'typing');
});

test('DOM: 붙여넣기를 시도하면 preventDefault되고 paste-warning이 노출된다', async () => {
  const doc = await loadTypingUI();
  const typedInput = doc.getElementById('typed-input');
  const pasteWarning = doc.getElementById('paste-warning');
  assert.equal(pasteWarning.hidden, true);

  let prevented = false;
  typedInput.dispatch('paste', {
    preventDefault() {
      prevented = true;
    }
  });

  assert.equal(prevented, true);
  assert.equal(pasteWarning.hidden, false);
});

test('DOM: 드래그앤드롭으로 텍스트를 삽입하려 하면 preventDefault되고 paste-warning이 노출된다', async () => {
  const doc = await loadTypingUI();
  const typedInput = doc.getElementById('typed-input');
  const pasteWarning = doc.getElementById('paste-warning');

  let prevented = false;
  typedInput.dispatch('drop', {
    preventDefault() {
      prevented = true;
    }
  });

  assert.equal(prevented, true);
  assert.equal(pasteWarning.hidden, false);
});

test('DOM: done 상태에서 다시 시작을 누르면 idle로 초기화되고 typed-input이 재활성화된다', async () => {
  const doc = await loadTypingUI();
  const typedInput = doc.getElementById('typed-input');
  const root = doc.getElementById('typing-root');
  const restartButton = doc.getElementById('restart-button');
  const statusText = doc.getElementById('status-text');
  const wpmValue = doc.getElementById('wpm-value');
  const target = globalThis.TypingPractice.TARGET_TEXT;

  typedInput.value = target;
  typedInput.dispatch('input', {});
  assert.equal(root.getAttribute('data-state'), 'done');

  restartButton.dispatch('click', {});

  assert.equal(root.getAttribute('data-state'), 'idle');
  assert.equal(statusText.textContent, '대기 중 — 입력을 시작하세요');
  assert.equal(typedInput.value, '');
  assert.equal(typedInput.disabled, false);
  assert.equal(wpmValue.textContent, '0');
});

test('DOM: typing 상태에서도 다시 시작을 누르면 idle로 초기화된다', async () => {
  const doc = await loadTypingUI();
  const typedInput = doc.getElementById('typed-input');
  const root = doc.getElementById('typing-root');
  const restartButton = doc.getElementById('restart-button');

  typedInput.value = 'T';
  typedInput.dispatch('input', {});
  assert.equal(root.getAttribute('data-state'), 'typing');

  restartButton.dispatch('click', {});

  assert.equal(root.getAttribute('data-state'), 'idle');
  assert.equal(typedInput.value, '');
});

test('DOM: paste-warning이 표시된 상태에서 다시 시작하면 숨겨진다', async () => {
  const doc = await loadTypingUI();
  const typedInput = doc.getElementById('typed-input');
  const pasteWarning = doc.getElementById('paste-warning');
  const restartButton = doc.getElementById('restart-button');

  typedInput.dispatch('paste', { preventDefault() {} });
  assert.equal(pasteWarning.hidden, false);

  restartButton.dispatch('click', {});
  assert.equal(pasteWarning.hidden, true);
});
