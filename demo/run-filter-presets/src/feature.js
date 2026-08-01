// 실행 이력 필터 프리셋 — localStorage 기반 저장/적용/초기화 로직 (BF-1455)
// frozen UI 계약: docs/plans/run-filter-presets-BF-1453.md §3~4
// 브라우저에서 <script type="module">로 직접 실행되며, node 테스트에서는 순수 함수와
// createPresetPanel(document/storage 주입)을 통해 검증한다.

export const RUN_FILTER_PRESETS_KEY = 'runFilterPresets.v1';

// crypto.randomUUID()는 secure context(HTTPS/localhost)에서만 노출된다.
// plain HTTP로 서빙되는 환경에서도 저장이 항상 동작하도록 폴백 id를 사용한다.
function defaultIdFactory() {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// 상태별 화면 텍스트 (계약 §3.3) — preset-status 영역, empty는 preset-list 영역에 노출
export const PRESET_STATUS_TEXT = {
  idle: '저장된 프리셋을 선택하거나 새로 저장하세요',
  saving: '프리셋 저장 중…',
  applied: '프리셋이 적용되었습니다',
  empty: '저장된 프리셋이 없습니다',
  error: '프리셋 저장에 실패했습니다. 다시 시도하세요',
};

// RUN_FILTER_PRESETS_KEY 하나의 배열을 읽는다 (계약 §4 — 개별 키 분산 저장 금지)
export function loadPresets(storage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(RUN_FILTER_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

export function savePresets(storage, presets) {
  storage.setItem(RUN_FILTER_PRESETS_KEY, JSON.stringify(presets));
}

// RunFilterPreset 생성 (계약 §4 타입)
export function buildPreset({ name, statusFilter, personaFilter }, options = {}) {
  const idFactory = options.idFactory ?? defaultIdFactory;
  const now = options.now ?? (() => new Date().toISOString());
  return {
    id: idFactory(),
    name,
    statusFilter: [...statusFilter],
    personaFilter: [...personaFilter],
    savedAt: now(),
  };
}

// 패널 컨트롤러 생성. options로 document/storage/각 element/idFactory/now 주입 가능(테스트용).
export function createPresetPanel(options = {}) {
  const doc = options.document
    ?? (typeof document !== 'undefined' ? document : undefined);
  if (!doc) {
    throw new Error('createPresetPanel: document를 사용할 수 없습니다.');
  }

  const root = options.root ?? doc.getElementById('preset-root');
  if (!root) {
    throw new Error('createPresetPanel: #preset-root를 찾을 수 없습니다.');
  }

  const nameInput = options.nameInput ?? doc.getElementById('preset-name-input');
  const saveButton = options.saveButton ?? doc.getElementById('preset-save-button');
  const resetButton = options.resetButton ?? doc.getElementById('preset-reset-button');
  const list = options.list ?? doc.getElementById('preset-list');
  const statusEl = options.statusEl ?? doc.getElementById('preset-status');

  const statusFilterInputs = options.statusFilterInputs
    ?? Array.from(root.querySelectorAll('[name="status-filter"]'));
  const personaFilterInputs = options.personaFilterInputs
    ?? Array.from(root.querySelectorAll('[name="persona-filter"]'));

  const storage = options.storage
    ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (!storage) {
    throw new Error('createPresetPanel: storage를 사용할 수 없습니다.');
  }

  const idFactory = options.idFactory ?? defaultIdFactory;
  const now = options.now ?? (() => new Date().toISOString());

  function setState(state) {
    root.dataset.state = state;
  }

  function setStatusText(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function setSaveEnabled(enabled) {
    if (saveButton) saveButton.disabled = !enabled;
  }

  function getCheckedValues(inputs) {
    return inputs.filter((el) => el.checked).map((el) => el.value);
  }

  function setCheckedValues(inputs, values) {
    const set = new Set(values);
    inputs.forEach((el) => {
      el.checked = set.has(el.value);
    });
  }

  function renderList(presets) {
    if (!list) return;
    if (presets.length === 0) {
      const empty = doc.createElement('li');
      empty.className = 'preset-panel__item preset-panel__item--empty';
      empty.textContent = PRESET_STATUS_TEXT.empty;
      list.replaceChildren(empty);
      return;
    }
    const items = presets.map((preset) => {
      const li = doc.createElement('li');
      li.className = 'preset-panel__item';
      li.textContent = preset.name;
      li.setAttribute('tabindex', '0');
      li.setAttribute('role', 'button');
      const handleApply = () => applyPreset(preset.id);
      li.addEventListener('click', handleApply);
      li.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleApply();
        }
      });
      return li;
    });
    list.replaceChildren(...items);
  }

  function refreshList() {
    renderList(loadPresets(storage));
  }

  // idle → saving → (applied | error) (계약 §3.3 전이 규칙)
  async function handleSaveClick() {
    const name = (nameInput?.value ?? '').trim();
    setState('saving');
    setStatusText(PRESET_STATUS_TEXT.saving);
    setSaveEnabled(false);
    await Promise.resolve();
    try {
      if (!name) throw new Error('프리셋 이름을 입력하세요.');
      const preset = buildPreset(
        {
          name,
          statusFilter: getCheckedValues(statusFilterInputs),
          personaFilter: getCheckedValues(personaFilterInputs),
        },
        { idFactory, now },
      );
      const presets = loadPresets(storage);
      presets.push(preset);
      savePresets(storage, presets);
      renderList(presets);
      if (nameInput) nameInput.value = '';
      setState('applied');
      setStatusText(PRESET_STATUS_TEXT.applied);
    } catch (_err) {
      setState('error');
      setStatusText(PRESET_STATUS_TEXT.error);
    } finally {
      setSaveEnabled(true);
    }
  }

  function applyPreset(id) {
    const preset = loadPresets(storage).find((p) => p.id === id);
    if (!preset) return;
    setCheckedValues(statusFilterInputs, preset.statusFilter);
    setCheckedValues(personaFilterInputs, preset.personaFilter);
    setState('applied');
    setStatusText(PRESET_STATUS_TEXT.applied);
  }

  // 초기화 후 상태·주 실행 control 재활성화 (계약 §3.3 / AC)
  function handleResetClick() {
    setCheckedValues(statusFilterInputs, []);
    setCheckedValues(personaFilterInputs, []);
    if (nameInput) nameInput.value = '';
    setState('idle');
    setStatusText(PRESET_STATUS_TEXT.idle);
    setSaveEnabled(true);
  }

  if (saveButton) saveButton.addEventListener('click', handleSaveClick);
  if (resetButton) resetButton.addEventListener('click', handleResetClick);

  function init() {
    setState('idle');
    setStatusText(PRESET_STATUS_TEXT.idle);
    refreshList();
  }

  function destroy() {
    if (saveButton) saveButton.removeEventListener('click', handleSaveClick);
    if (resetButton) resetButton.removeEventListener('click', handleResetClick);
  }

  return {
    init,
    destroy,
    save: handleSaveClick,
    applyPreset,
    reset: handleResetClick,
    getState: () => root.dataset.state,
  };
}

// 브라우저 자동 부트스트랩 (node import 시에는 실행되지 않음)
if (typeof document !== 'undefined') {
  const boot = () => {
    const root = document.getElementById('preset-root');
    if (root) {
      createPresetPanel().init();
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
