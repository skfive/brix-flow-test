// BF-1087 릴리스 노트 요약 보드 — 클라이언트 부트스트랩 (브라우저 전용)
// 서비스(라우트 계약)를 인메모리로 구동하고 폼/필터/KPI/목록을 렌더한다.
// 검증 전용 흐름(사전 검증)은 저장 없이 안내만 갱신한다(기획 §5.2·§9).

import { createReleaseNotesService } from './service.js';
import {
  IMPORTANCE_VALUES,
  USER_IMPACT_VALUES,
  IMPORTANCE_LABELS,
  USER_IMPACT_LABELS,
} from './constants.js';
import {
  renderKpiBar,
  renderCardList,
  renderValidateResult,
} from './render.js';

/**
 * 보드 앱을 지정 루트 요소에 초기화한다.
 * @param {HTMLElement} root
 * @param {ReturnType<typeof createReleaseNotesService>} [service]
 */
export function initReleaseNotesBoard(root, service = createReleaseNotesService()) {
  const filter = { importance: 'all', userImpact: 'all' };

  const $ = (sel) => /** @type {HTMLElement} */ (root.querySelector(sel));
  const kpiHost = $('[data-kpi]');
  const listHost = $('[data-list]');
  const resultHost = $('[data-validate-result]');
  const form = /** @type {HTMLFormElement} */ ($('[data-form]'));
  const changesHost = $('[data-changes]');
  const addChangeBtn = $('[data-add-change]');

  function readInput() {
    const changes = Array.from(changesHost.querySelectorAll('input')).map((el) => el.value);
    return {
      title: /** @type {HTMLInputElement} */ ($('[name="title"]')).value,
      changes,
      importance: /** @type {HTMLSelectElement} */ ($('[name="importance"]')).value,
      userImpact: /** @type {HTMLSelectElement} */ ($('[name="userImpact"]')).value,
    };
  }

  function paintFieldErrors(errors) {
    root.querySelectorAll('.summary-form__field').forEach((field) => {
      field.classList.remove('summary-form__field--error');
      const msg = field.querySelector('.summary-form__error');
      if (msg) msg.textContent = '';
    });
    for (const error of errors) {
      const base = error.field.replace(/\[\d+\]$/, '');
      const field = root.querySelector(`[data-field="${base}"]`);
      if (!field) continue;
      field.classList.add('summary-form__field--error');
      const msg = field.querySelector('.summary-form__error');
      if (msg) msg.textContent = error.reason;
    }
  }

  function refreshBoard() {
    const hasData = service.list().body.length > 0;
    const cards = service.list(filter).body;
    kpiHost.innerHTML = renderKpiBar(service.kpi().body);
    listHost.innerHTML = renderCardList(cards, { hasData });
  }

  function addChangeRow(value = '') {
    const row = document.createElement('div');
    row.className = 'changes-list__row';
    const idx = changesHost.children.length;
    row.innerHTML =
      `<input type="text" aria-label="변경 항목 ${idx + 1}" placeholder="변경 항목을 입력하세요" />` +
      '<button type="button" class="changes-list__remove" aria-label="항목 삭제">×</button>';
    /** @type {HTMLInputElement} */ (row.querySelector('input')).value = value;
    row.querySelector('.changes-list__remove').addEventListener('click', () => {
      if (changesHost.children.length > 1) {
        row.remove();
        syncChangeControls();
      }
    });
    changesHost.appendChild(row);
    syncChangeControls();
  }

  function syncChangeControls() {
    const rows = changesHost.querySelectorAll('.changes-list__row');
    rows.forEach((row) => {
      const removeBtn = row.querySelector('.changes-list__remove');
      if (removeBtn) removeBtn.disabled = rows.length <= 1;
    });
    addChangeBtn.disabled = rows.length >= 50;
  }

  function resetForm() {
    form.reset();
    changesHost.innerHTML = '';
    addChangeRow();
    resultHost.innerHTML = '';
    paintFieldErrors([]);
  }

  // 검증 전용(사전 검증): 저장 없이 안내만
  $('[data-validate]').addEventListener('click', () => {
    const res = service.validate(readInput());
    if (res.body.valid) {
      resultHost.innerHTML = renderValidateResult('validate-pass');
      paintFieldErrors([]);
    } else {
      resultHost.innerHTML = renderValidateResult('validate-fail', res.body.errors);
      paintFieldErrors(res.body.errors);
    }
  });

  // 생성: 검증 통과 시 저장·리렌더
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const res = service.create(readInput());
    if (res.status === 201) {
      resultHost.innerHTML = '';
      resetForm();
      refreshBoard();
    } else {
      resultHost.innerHTML = renderValidateResult('create-error', res.body.errors);
      paintFieldErrors(res.body.errors);
    }
  });

  addChangeBtn.addEventListener('click', () => addChangeRow());

  // 필터 세그먼트
  root.querySelectorAll('[data-segment]').forEach((seg) => {
    const axis = seg.getAttribute('data-segment');
    seg.querySelectorAll('.segmented__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        filter[axis] = btn.getAttribute('data-value');
        seg.querySelectorAll('.segmented__btn').forEach((b) => {
          const active = b === btn;
          b.classList.toggle('segmented__btn--active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        refreshBoard();
      });
    });
  });

  addChangeRow();
  refreshBoard();
  return { refreshBoard, service };
}

/** enum → 세그먼트 옵션 목록(‘전체’ 포함). 정적 HTML 생성 보조. */
export function segmentOptions(kind) {
  const labels = kind === 'importance' ? IMPORTANCE_LABELS : USER_IMPACT_LABELS;
  const values = kind === 'importance' ? IMPORTANCE_VALUES : USER_IMPACT_VALUES;
  return [{ value: 'all', label: '전체' }, ...values.map((v) => ({ value: v, label: labels[v] }))];
}

if (typeof document !== 'undefined') {
  const mount = document.querySelector('[data-release-notes-board]');
  if (mount) {
    initReleaseNotesBoard(/** @type {HTMLElement} */ (mount));
  }
}
