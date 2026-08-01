// BF-1455 — 실행 이력 필터 프리셋 SPA 회귀 가드
// 계약: docs/plans/run-filter-presets-BF-1453.md §3~4

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RUN_FILTER_PRESETS_KEY,
  PRESET_STATUS_TEXT,
  loadPresets,
  savePresets,
  buildPreset,
  createPresetPanel,
} from '../src/feature.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = path.resolve(__dirname, '..');

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'demo';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// ---------------------------------------------------------------------------
// 정적 마크업 contract 가드 — frozen id/class/aria-label/토큰이 silent break 안 되게 fact 박제
// ---------------------------------------------------------------------------

test('AC — index.html frozen DOM id contract', { skip: _brixOutOfScope }, () => {
  const html = fs.readFileSync(path.join(MODULE_ROOT, 'index.html'), 'utf-8');
  assert.ok(html.includes('id="preset-root"'), '#preset-root 존재');
  assert.ok(html.includes('id="preset-name-input"'), '#preset-name-input 존재');
  assert.ok(html.includes('id="preset-save-button"'), '#preset-save-button 존재');
  assert.ok(html.includes('id="preset-reset-button"'), '#preset-reset-button 존재');
  assert.ok(html.includes('id="preset-list"'), '#preset-list 존재');
  assert.ok(html.includes('id="preset-status"'), '#preset-status 존재');
  assert.ok(html.includes('src="./src/feature.js"'), 'feature.js module script 연결');
});

test('AC — frozen CSS class / 디자인 토큰 / 접근성 contract', { skip: _brixOutOfScope }, () => {
  const html = fs.readFileSync(path.join(MODULE_ROOT, 'index.html'), 'utf-8');
  assert.ok(html.includes('class="preset-panel"'), 'preset-panel 클래스 존재');
  assert.ok(html.includes('preset-panel__save'), 'preset-panel__save 클래스 존재');
  assert.ok(html.includes('preset-panel__reset'), 'preset-panel__reset 클래스 존재');
  assert.ok(html.includes('preset-panel__item'), 'preset-panel__item 클래스 존재');
  assert.ok(html.includes('--color-surface-dark: #0f172a'), 'surface-dark 토큰');
  assert.ok(html.includes('--color-action-primary: #2563eb'), 'action-primary 토큰');
  assert.ok(html.includes('--color-text-primary: #e2e8f0'), 'text-primary 토큰');
  assert.ok(html.includes('--space-control-gap: 12px'), 'control-gap 토큰');
  assert.ok(html.includes('aria-label="프리셋 저장"'), 'save 버튼 aria-label');
  assert.ok(html.includes('aria-label="필터 초기화"'), 'reset 버튼 aria-label');
});

// ---------------------------------------------------------------------------
// 순수 함수 — localStorage 스키마 (계약 §4)
// ---------------------------------------------------------------------------

function makeFakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

test('loadPresets — 빈 storage는 빈 배열 반환', { skip: _brixOutOfScope }, () => {
  assert.deepEqual(loadPresets(makeFakeStorage()), []);
});

test('loadPresets — 손상된 JSON은 빈 배열로 안전 처리', { skip: _brixOutOfScope }, () => {
  const storage = makeFakeStorage({ [RUN_FILTER_PRESETS_KEY]: '{broken' });
  assert.deepEqual(loadPresets(storage), []);
});

test('savePresets/loadPresets — 단일 키 왕복 저장', { skip: _brixOutOfScope }, () => {
  const storage = makeFakeStorage();
  const preset = buildPreset(
    { name: '내 프리셋', statusFilter: ['success'], personaFilter: ['developer'] },
    { idFactory: () => 'p-1', now: () => '2026-08-01T00:00:00.000Z' },
  );
  savePresets(storage, [preset]);
  assert.deepEqual(loadPresets(storage), [preset]);
  assert.equal(
    storage.getItem(RUN_FILTER_PRESETS_KEY),
    JSON.stringify([preset]),
  );
});

test('buildPreset — RunFilterPreset 스키마 필드 구성', { skip: _brixOutOfScope }, () => {
  const preset = buildPreset(
    { name: '주말 점검', statusFilter: ['warning', 'failed'], personaFilter: ['reviewer'] },
    { idFactory: () => 'p-2', now: () => '2026-08-01T01:00:00.000Z' },
  );
  assert.deepEqual(preset, {
    id: 'p-2',
    name: '주말 점검',
    statusFilter: ['warning', 'failed'],
    personaFilter: ['reviewer'],
    savedAt: '2026-08-01T01:00:00.000Z',
  });
});

// ---------------------------------------------------------------------------
// fake DOM — 최소 요소만 구현해 createPresetPanel 의 상태 전이 회귀 가드
// ---------------------------------------------------------------------------

function makeFakeDocument() {
  return {
    createElement(tag) {
      return {
        tagName: tag,
        className: '',
        textContent: '',
        _attrs: {},
        _listeners: {},
        setAttribute(name, value) {
          this._attrs[name] = value;
        },
        addEventListener(type, handler) {
          this._listeners[type] = handler;
        },
        removeEventListener(type) {
          delete this._listeners[type];
        },
      };
    },
  };
}

function makeFakeCheckbox(value, checked = false) {
  return { value, checked };
}

function makeFakePanelDom() {
  const root = { dataset: {} };
  const list = {
    _children: [],
    replaceChildren(...nodes) {
      this._children = nodes;
    },
  };
  const nameInput = { value: '' };
  const statusEl = { textContent: '' };
  const saveButton = {
    disabled: false,
    addEventListener() {},
    removeEventListener() {},
  };
  const resetButton = {
    disabled: false,
    addEventListener() {},
    removeEventListener() {},
  };
  const statusFilterInputs = [
    makeFakeCheckbox('success'),
    makeFakeCheckbox('warning'),
    makeFakeCheckbox('failed'),
  ];
  const personaFilterInputs = [
    makeFakeCheckbox('planner'),
    makeFakeCheckbox('designer'),
    makeFakeCheckbox('developer'),
  ];
  return {
    root,
    list,
    nameInput,
    statusEl,
    saveButton,
    resetButton,
    statusFilterInputs,
    personaFilterInputs,
  };
}

function buildPanel(overrides = {}) {
  const doc = makeFakeDocument();
  const dom = makeFakePanelDom();
  const storage = overrides.storage ?? makeFakeStorage();
  let seq = 0;
  const panel = createPresetPanel({
    document: doc,
    root: dom.root,
    list: dom.list,
    nameInput: dom.nameInput,
    statusEl: dom.statusEl,
    saveButton: dom.saveButton,
    resetButton: dom.resetButton,
    statusFilterInputs: dom.statusFilterInputs,
    personaFilterInputs: dom.personaFilterInputs,
    storage,
    idFactory: overrides.idFactory ?? (() => `p-${++seq}`),
    now: overrides.now ?? (() => '2026-08-01T00:00:00.000Z'),
  });
  return { panel, storage, ...dom };
}

test('AC — init() 직후 idle 상태 + empty 목록 텍스트', { skip: _brixOutOfScope }, () => {
  const { panel, list, statusEl, root } = buildPanel();
  panel.init();
  assert.equal(root.dataset.state, 'idle');
  assert.equal(statusEl.textContent, PRESET_STATUS_TEXT.idle);
  assert.equal(list._children.length, 1);
  assert.equal(list._children[0].className, 'preset-panel__item preset-panel__item--empty');
  assert.equal(list._children[0].textContent, PRESET_STATUS_TEXT.empty);
});

test('AC — save() 호출 직후 saving 상태 진입 + 저장 버튼 비활성화', { skip: _brixOutOfScope }, async () => {
  const { panel, nameInput, statusEl, saveButton, root } = buildPanel();
  nameInput.value = '내 프리셋';
  const pending = panel.save();
  assert.equal(root.dataset.state, 'saving');
  assert.equal(statusEl.textContent, PRESET_STATUS_TEXT.saving);
  assert.equal(saveButton.disabled, true);
  await pending;
});

test('AC — 저장 성공: applied 상태 + 목록 반영 + 버튼 재활성화', { skip: _brixOutOfScope }, async () => {
  const { panel, storage, nameInput, list, statusEl, saveButton, root, statusFilterInputs, personaFilterInputs } =
    buildPanel();
  nameInput.value = '내 프리셋';
  statusFilterInputs[0].checked = true; // success
  personaFilterInputs[2].checked = true; // developer
  await panel.save();
  assert.equal(root.dataset.state, 'applied');
  assert.equal(statusEl.textContent, PRESET_STATUS_TEXT.applied);
  assert.equal(saveButton.disabled, false);
  assert.equal(list._children.length, 1);
  assert.equal(list._children[0].textContent, '내 프리셋');
  assert.equal(nameInput.value, '');
  const stored = loadPresets(storage);
  assert.equal(stored.length, 1);
  assert.deepEqual(stored[0].statusFilter, ['success']);
  assert.deepEqual(stored[0].personaFilter, ['developer']);
});

test('AC — 저장 실패(이름 미입력): error 상태 표시 + 저장 버튼 재활성화', { skip: _brixOutOfScope }, async () => {
  const { panel, nameInput, statusEl, saveButton, root } = buildPanel();
  nameInput.value = '   ';
  await panel.save();
  assert.equal(root.dataset.state, 'error');
  assert.equal(statusEl.textContent, PRESET_STATUS_TEXT.error);
  assert.equal(saveButton.disabled, false, '저장 실패 후 주 실행 control 재활성화');
});

test('AC — 저장소 쓰기 실패: error 상태 표시 + 저장 버튼 재활성화', { skip: _brixOutOfScope }, async () => {
  const failingStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('quota exceeded');
    },
  };
  const { panel, nameInput, statusEl, saveButton, root } = buildPanel({ storage: failingStorage });
  nameInput.value = '내 프리셋';
  await panel.save();
  assert.equal(root.dataset.state, 'error');
  assert.equal(statusEl.textContent, PRESET_STATUS_TEXT.error);
  assert.equal(saveButton.disabled, false);
});

test('AC — 프리셋 목록 항목 적용(applyPreset): 필터 복원 + applied 상태', { skip: _brixOutOfScope }, async () => {
  const { panel, nameInput, statusFilterInputs, personaFilterInputs, root, statusEl, storage } = buildPanel();
  nameInput.value = '경고 감시';
  statusFilterInputs[1].checked = true; // warning
  personaFilterInputs[1].checked = true; // designer
  await panel.save();
  const [saved] = loadPresets(storage);

  // 다른 필터로 바꾼 뒤 저장했던 프리셋을 다시 적용
  statusFilterInputs.forEach((el) => (el.checked = false));
  personaFilterInputs.forEach((el) => (el.checked = false));
  panel.applyPreset(saved.id);

  assert.equal(root.dataset.state, 'applied');
  assert.equal(statusEl.textContent, PRESET_STATUS_TEXT.applied);
  assert.deepEqual(
    statusFilterInputs.filter((el) => el.checked).map((el) => el.value),
    ['warning'],
  );
  assert.deepEqual(
    personaFilterInputs.filter((el) => el.checked).map((el) => el.value),
    ['designer'],
  );
});

test('AC — reset(): 필터/이름 초기화 + idle 상태 + 저장 버튼 재활성화', { skip: _brixOutOfScope }, () => {
  const { panel, nameInput, statusFilterInputs, personaFilterInputs, saveButton, statusEl, root } = buildPanel();
  nameInput.value = '임시 값';
  statusFilterInputs[0].checked = true;
  personaFilterInputs[0].checked = true;
  saveButton.disabled = true;

  panel.reset();

  assert.equal(root.dataset.state, 'idle');
  assert.equal(statusEl.textContent, PRESET_STATUS_TEXT.idle);
  assert.equal(nameInput.value, '');
  assert.equal(saveButton.disabled, false, '초기화 후 주 실행 control 재활성화');
  assert.ok(statusFilterInputs.every((el) => !el.checked));
  assert.ok(personaFilterInputs.every((el) => !el.checked));
});

test('AC — 새로고침 후 복원: 동일 storage로 재생성한 패널이 기존 프리셋을 그대로 노출', { skip: _brixOutOfScope }, async () => {
  const storage = makeFakeStorage();
  const first = buildPanel({ storage });
  first.nameInput.value = '복원 확인';
  await first.panel.save();

  // 새로고침을 흉내: 같은 storage를 공유하는 새 패널 인스턴스 생성
  const second = buildPanel({ storage });
  second.panel.init();

  assert.equal(second.list._children.length, 1);
  assert.equal(second.list._children[0].textContent, '복원 확인');
});
