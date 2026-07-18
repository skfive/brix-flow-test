// 교대 인수인계 누락 점검 — DOM 렌더 + 인터랙션 (BF-1050 명세).
// 도메인/판정은 domain.js 순수 함수에 위임하고, 여기서는 데이터→DOM 매핑과
// 키보드/필터/저장 인터랙션, KPI 계측만 담당한다.

import { HANDOFF_FIXTURE, REFERENCE_NOW } from './fixtures.js';
import {
  STATUS_LABELS,
  RISK_LABELS,
  REQUIRED_FIELD_LABELS,
  computeItems,
  summarize,
  filterItems,
} from './domain.js';
import {
  readOverrides,
  writeOverrides,
  validateFollowUp,
  applyOverride,
  MAX_FOLLOWUP_LEN,
} from './overrides-storage.js';
import { computeHandoffKpis, createKpiTracker } from './kpi.js';

/** 위험 등급 글리프 (색맹 안전 3중 인코딩의 글리프 채널). */
const RISK_GLYPH = {
  normal: '●',
  data_gap: '▲',
  deadline_exceeded: '◷',
  critical: '◆',
};

/** 필터 탭 순서 (F0~F4). */
const FILTER_ORDER = ['all', 'normal', 'data_gap', 'deadline_exceeded', 'critical'];
const FILTER_LABELS = { all: '전체', ...RISK_LABELS };

/**
 * ISO8601(+09:00) → 'YYYY-MM-DD HH:mm (KST)' 표시 변환(원본 불변).
 * fixture 기한은 모두 +09:00 이므로 문자열 파싱으로 결정론적 변환한다.
 * @param {string|null} iso
 * @returns {string|null}
 */
export function formatKst(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso ?? '');
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]} (KST)`;
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('data-') || key.startsWith('aria-') || key === 'role')
      node.setAttribute(key, value);
    else node[key] = value;
  }
  for (const child of [].concat(children)) {
    if (child != null) node.append(child);
  }
  return node;
}

/**
 * 앱을 초기화한다.
 * @param {HTMLElement} root 마운트 대상
 * @param {Storage|{getItem:Function,setItem:Function}} storage
 * @returns {object} 앱 API(테스트/e2e 용)
 */
export function initApp(root, storage) {
  const knownIds = HANDOFF_FIXTURE.map((i) => i.id);
  const tracker = createKpiTracker();

  const state = {
    overrides: readOverrides(storage, knownIds),
    selectedId: null,
    filter: 'all',
    persistOk: true, // localStorage 저장 성공 여부(false 면 in-memory 안내)
  };

  // ---- 정적 골격 생성 ----
  const app = el('div', { class: 'hgc-app', 'data-view': 'list' });

  const header = el('header', { class: 'hgc-header', role: 'banner' });
  const titlebar = el('div', { class: 'hgc-header__titlebar' }, [
    el('h1', { class: 'hgc-header__title', text: '교대 인수인계 누락 점검' }),
    el('span', {
      class: 'hgc-header__ref',
      text: `기준 시각 ${formatKst(REFERENCE_NOW)}`,
    }),
  ]);
  const summaryEl = el('div', {
    class: 'hgc-summary',
    role: 'group',
    'aria-label': '위험 요약',
    'aria-live': 'polite',
  });
  const tabsEl = el('div', {
    class: 'hgc-filter-tabs',
    role: 'tablist',
    'aria-label': '위험 유형 필터',
  });
  header.append(titlebar, summaryEl, tabsEl);

  const listEl = el('nav', {
    class: 'hgc-list',
    role: 'listbox',
    'aria-label': '인수인계 목록',
  });
  const detailEl = el('main', {
    class: 'hgc-detail',
    role: 'main',
    'aria-label': '인수인계 상세',
    'aria-live': 'polite',
  });
  const mainEl = el('div', { class: 'hgc-main' }, [listEl, detailEl]);

  app.append(header, mainEl);
  root.replaceChildren(app);

  // ---- 파생 계산 헬퍼 ----
  function computed() {
    return computeItems(HANDOFF_FIXTURE, state.overrides, REFERENCE_NOW);
  }

  // ---- 렌더 ----
  function renderSummary(items) {
    const counts = summarize(items);
    summaryEl.replaceChildren();
    for (const level of ['normal', 'data_gap', 'deadline_exceeded', 'critical']) {
      const card = el('div', {
        class: 'hgc-summary__card',
        'data-risk': level,
        'aria-label': `${RISK_LABELS[level]} ${counts[level]}건`,
      }, [
        el('div', { class: 'hgc-summary__label' }, [
          el('span', { 'aria-hidden': 'true', text: RISK_GLYPH[level] }),
          document.createTextNode(RISK_LABELS[level]),
        ]),
        el('div', { class: 'hgc-summary__num', text: String(counts[level]) }),
      ]);
      summaryEl.append(card);
    }
    summaryEl.append(
      el('div', { class: 'hgc-summary__total' }, [
        el('div', { class: 'hgc-summary__label', text: '총계' }),
        el('div', { class: 'hgc-summary__total-num', text: `${counts.total}건` }),
      ]),
    );
  }

  function renderTabs(items) {
    const counts = summarize(items);
    tabsEl.replaceChildren();
    FILTER_ORDER.forEach((value) => {
      const count = value === 'all' ? counts.total : counts[value];
      const selected = state.filter === value;
      const tab = el('button', {
        class: 'hgc-filter-tab',
        type: 'button',
        role: 'tab',
        'data-filter': value,
        'aria-selected': String(selected),
        tabIndex: selected ? 0 : -1,
      }, [
        document.createTextNode(FILTER_LABELS[value]),
        el('span', { class: 'hgc-filter-tab__count', text: String(count) }),
      ]);
      tab.addEventListener('click', () => selectFilter(value));
      tab.addEventListener('keydown', (e) => onTabKeydown(e, value));
      tabsEl.append(tab);
    });
  }

  function renderList(items) {
    const visible = filterItems(items, state.filter);
    listEl.replaceChildren();

    if (visible.length === 0) {
      listEl.append(
        el('div', { class: 'hgc-empty-list' }, [
          el('div', { text: '해당 위험 등급의 항목 없음' }),
          el('div', { class: 'hgc-followup__hint', text: '다른 위험 유형 탭을 선택해 보세요' }),
        ]),
      );
      return;
    }

    visible.forEach((item) => {
      const selected = item.id === state.selectedId;
      const assigneeMissing = item.missingFields.includes('assignee');
      const bottom = el('div', { class: 'hgc-list-item__bottom' }, [
        el('span', {
          class: assigneeMissing ? 'hgc-list-item__assignee hgc-missing-text' : 'hgc-list-item__assignee',
        }, assigneeMissing
          ? [el('span', { class: 'hgc-missing-dot', 'aria-hidden': 'true', text: '▲ ' }), document.createTextNode('미배정')]
          : [document.createTextNode(item.assignee)]),
        riskBadge(item.riskLevel),
      ]);
      const row = el('button', {
        class: 'hgc-list-item',
        type: 'button',
        role: 'option',
        'data-id': item.id,
        'aria-selected': String(selected),
        tabIndex: selected ? 0 : -1,
      }, [
        el('div', { class: 'hgc-list-item__top' }, [
          el('span', { class: 'hgc-list-item__id mono', text: item.id }),
          el('span', { class: 'hgc-list-item__name', text: item.taskName }),
        ]),
        bottom,
      ]);
      row.addEventListener('click', () => selectItem(item.id, false));
      row.addEventListener('keydown', (e) => onListKeydown(e, item.id));
      listEl.append(row);
    });

    // roving tabindex: 선택 항목이 필터로 안 보이면 첫 행을 tab stop 으로
    if (!visible.some((i) => i.id === state.selectedId)) {
      const first = listEl.querySelector('.hgc-list-item');
      if (first) first.tabIndex = 0;
    }
  }

  function riskBadge(level) {
    return el('span', {
      class: 'hgc-badge',
      'data-risk': level,
      'aria-label': `위험 등급: ${RISK_LABELS[level]}`,
    }, [
      el('span', { 'aria-hidden': 'true', text: RISK_GLYPH[level] }),
      document.createTextNode(RISK_LABELS[level]),
    ]);
  }

  function renderDetail(items) {
    detailEl.replaceChildren();
    if (state.selectedId == null) {
      detailEl.append(
        el('div', { class: 'hgc-empty-detail' }, [
          el('div', { class: 'hgc-empty-detail__icon', 'aria-hidden': 'true', text: '▤' }),
          el('div', { class: 'hgc-empty-detail__title', text: '항목을 선택하세요' }),
          el('div', {
            text: '왼쪽 목록에서 인수인계 항목을 선택하면 상세 정보와 후속 액션 보완을 볼 수 있습니다',
          }),
        ]),
      );
      return;
    }

    const item = items.find((i) => i.id === state.selectedId);
    if (!item) return;

    // 헤더 + 모바일 복귀 버튼
    const backBtn = el('button', {
      class: 'hgc-back',
      type: 'button',
      text: '← 목록',
    });
    backBtn.addEventListener('click', () => {
      app.setAttribute('data-view', 'list');
      const prev = listEl.querySelector(`.hgc-list-item[data-id="${state.selectedId}"]`);
      if (prev) prev.focus();
    });

    const nameHeading = el('h2', {
      class: 'hgc-detail__name',
      tabIndex: -1,
    }, [
      el('span', { class: 'hgc-detail__id mono', text: `${item.id} · ` }),
      document.createTextNode(item.taskName),
    ]);

    const header2 = el('div', { class: 'hgc-detail__header' }, [
      backBtn,
      nameHeading,
      riskBadge(item.riskLevel),
    ]);
    detailEl.append(header2);

    // D8 누락 안내 바
    if (item.missingFields.length > 0) {
      const labels = item.missingFields.map((f) => REQUIRED_FIELD_LABELS[f]).join(', ');
      detailEl.append(
        el('div', { class: 'hgc-gap-notice', text: `누락된 필수 값: ${labels}` }),
      );
    }

    // 필드 그리드 D1~D5
    const overdue = item.hasDeadlineExceeded;
    const dueText = formatKst(item.dueAt);
    const statusValid = STATUS_LABELS[item.status] != null;
    const grid = el('div', { class: 'hgc-field-grid' }, [
      field('항목 ID', item.id, false, true),
      field('담당자', item.missingFields.includes('assignee') ? '미배정' : item.assignee,
        item.missingFields.includes('assignee')),
      dueField('기한', dueText, item.missingFields.includes('dueAt'), overdue),
      field('상태', statusValid ? STATUS_LABELS[item.status] : '상태 미지정',
        item.missingFields.includes('status')),
    ]);
    detailEl.append(grid);

    // 후속 액션 편집기 D6
    detailEl.append(renderFollowUp(item));

    if (!state.persistOk) {
      detailEl.append(
        el('div', { class: 'hgc-followup__hint', text: '이 세션에서만 유지됩니다(로컬 저장 불가 환경)' }),
      );
    }
  }

  function field(label, value, missing, mono = false) {
    return el('div', { class: 'hgc-field' }, [
      el('div', { class: 'hgc-field__label', text: label }),
      el('div', {
        class: mono ? 'hgc-field__value mono' : 'hgc-field__value',
        'data-missing': String(Boolean(missing)),
        text: value,
      }),
    ]);
  }

  function dueField(label, value, missing, overdue) {
    const valNode = el('div', {
      class: 'hgc-field__value mono',
      'data-missing': String(Boolean(missing)),
    }, [document.createTextNode(missing ? '기한 미정' : value)]);
    if (overdue) {
      valNode.append(el('span', { class: 'hgc-inline-overdue', text: '◷ 기한 초과' }));
    }
    return el('div', { class: 'hgc-field' }, [
      el('div', { class: 'hgc-field__label', text: label }),
      valNode,
    ]);
  }

  function renderFollowUp(item) {
    const section = el('section', { class: 'hgc-followup', 'aria-label': '후속 액션 보완' });

    const origin = el('span', {
      class: 'hgc-followup__origin',
      'data-overridden': String(item.isOverridden),
      text: item.isOverridden ? '로컬 보완됨' : '원본값',
    });
    section.append(
      el('div', { class: 'hgc-followup__head' }, [
        el('h3', { class: 'hgc-followup__title', text: '후속 액션 보완' }),
        origin,
      ]),
    );

    const initial = item.followUpAction ?? '';
    const textarea = el('textarea', {
      class: 'hgc-followup__textarea',
      'aria-label': '후속 액션 텍스트',
      value: initial,
    });

    const counter = el('span', { class: 'hgc-followup__counter', 'aria-live': 'polite' });
    const saveBtn = el('button', {
      class: 'hgc-followup__save',
      type: 'button',
      text: '저장',
    });
    const errorBox = el('div', { class: 'hgc-followup__error', role: 'alert' });
    errorBox.style.display = 'none';
    const savedAtBox = el('div', { class: 'hgc-followup__saved-at' });
    savedAtBox.style.display = 'none';

    function refreshControls() {
      const len = textarea.value.trim().length;
      const over = len > MAX_FOLLOWUP_LEN;
      counter.textContent = `${len}/${MAX_FOLLOWUP_LEN}`;
      counter.setAttribute('data-over', String(over));
      textarea.setAttribute('data-error', String(over));
      // 저장값과 동일하면 disabled(변경 없음)
      saveBtn.disabled = textarea.value === initial;
    }

    textarea.addEventListener('input', () => {
      errorBox.style.display = 'none';
      refreshControls();
    });

    function doSave() {
      const result = validateFollowUp(textarea.value);
      if (!result.ok) {
        tracker.track('validationError');
        errorBox.textContent = result.error;
        errorBox.style.display = '';
        counter.setAttribute('data-over', 'true');
        textarea.setAttribute('data-error', 'true');
        return; // 입력값 유지(자르지 않음)
      }
      state.overrides = applyOverride(
        state.overrides,
        item.id,
        result.value,
        REFERENCE_NOW,
      );
      state.persistOk = writeOverrides(storage, state.overrides);
      tracker.track(result.isRemoval ? 'followUpRemove' : 'followUpSave');
      tracker.track('recompute');
      renderAll(); // 전체 재계산 (요약·목록·상세 갱신)
    }

    saveBtn.addEventListener('click', doSave);
    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        doSave();
      }
    });

    const bar = el('div', { class: 'hgc-followup__bar' }, [
      el('div', { class: 'hgc-followup__meta' }, [
        counter,
        el('span', {
          class: 'hgc-followup__hint',
          text: '빈 값 저장 시 로컬 보완이 삭제되고 원본값으로 되돌아갑니다',
        }),
      ]),
      saveBtn,
    ]);
    section.append(textarea, bar, errorBox, savedAtBox);

    if (item.isOverridden && item.savedAt) {
      savedAtBox.textContent = `마지막 보완 저장: ${formatKst(item.savedAt) ?? item.savedAt}`;
      savedAtBox.style.display = '';
    }

    refreshControls();
    return section;
  }

  // ---- 인터랙션 ----
  function selectFilter(value) {
    if (state.filter === value) return;
    state.filter = value;
    tracker.track('filterChange');
    // 필터는 목록 표시에만 영향 — 선택/요약 불변(EC-03, §5.4)
    renderTabs(computed());
    renderList(computed());
    const active = tabsEl.querySelector('.hgc-filter-tab[aria-selected="true"]');
    if (active) active.focus();
  }

  function onTabKeydown(e, value) {
    const idx = FILTER_ORDER.indexOf(value);
    let next = null;
    if (e.key === 'ArrowRight') next = FILTER_ORDER[(idx + 1) % FILTER_ORDER.length];
    else if (e.key === 'ArrowLeft') next = FILTER_ORDER[(idx - 1 + FILTER_ORDER.length) % FILTER_ORDER.length];
    else if (e.key === 'Home') next = FILTER_ORDER[0];
    else if (e.key === 'End') next = FILTER_ORDER[FILTER_ORDER.length - 1];
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectFilter(value);
      return;
    }
    if (next) {
      e.preventDefault();
      selectFilter(next);
    }
  }

  function selectItem(id, viaKeyboard) {
    state.selectedId = id;
    tracker.track('itemSelect');
    renderList(computed());
    renderDetail(computed());
    app.setAttribute('data-view', 'detail');
    // 모바일/키보드: 상세 헤더로 포커스 이동(스크린리더 컨텍스트 유지)
    if (viaKeyboard || window.matchMedia('(max-width: 767px)').matches) {
      const name = detailEl.querySelector('.hgc-detail__name');
      if (name) name.focus();
    }
  }

  function onListKeydown(e, id) {
    const rows = Array.from(listEl.querySelectorAll('.hgc-list-item'));
    const idx = rows.findIndex((r) => r.getAttribute('data-id') === id);
    let target = null;
    if (e.key === 'ArrowDown') target = rows[Math.min(idx + 1, rows.length - 1)];
    else if (e.key === 'ArrowUp') target = rows[Math.max(idx - 1, 0)];
    else if (e.key === 'Home') target = rows[0];
    else if (e.key === 'End') target = rows[rows.length - 1];
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectItem(id, true);
      return;
    }
    if (target) {
      e.preventDefault();
      rows.forEach((r) => (r.tabIndex = -1));
      target.tabIndex = 0;
      target.focus();
    }
  }

  function renderAll() {
    const items = computed();
    renderSummary(items);
    renderTabs(items);
    renderList(items);
    renderDetail(items);
  }

  renderAll();

  const api = {
    getState: () => ({ ...state }),
    getKpis: () => computeHandoffKpis(computed()),
    getTrackerSnapshot: () => tracker.snapshot(),
    selectItem,
    selectFilter,
  };
  return api;
}

// 브라우저 자동 부트스트랩 (Node 테스트 환경에서는 document 없음 → skip)
if (typeof document !== 'undefined') {
  const boot = () => {
    const root = document.getElementById('app');
    if (!root) return;
    let storage;
    try {
      storage = window.localStorage;
      // 접근 가능성 확인(프라이빗 모드 차단 대비)
      storage.getItem('__hgc_probe__');
    } catch {
      storage = null;
    }
    if (!storage) {
      // in-memory 폴백
      const map = new Map();
      storage = {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
      };
    }
    window.__hgc = initApp(root, storage);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
