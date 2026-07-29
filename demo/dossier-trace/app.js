// 실행 계약 상태 대시보드 — 필터/상세/상태 전환 로직 (BF-1248)
// 순수 로직은 export 하여 node --test 로 검증하고, DOM 배선은 document 가 있을 때만 실행한다.

import { loadDossier } from './fixtures.js';

/** 앱 상태(states) — 계약 §3.3 */
export const APP_STATES = Object.freeze(['loading', 'empty', 'ready', 'error']);

/** 상태별 화면 텍스트(색상만이 아닌 텍스트 구분) — 계약 §3.5 */
export const STATE_TEXT = Object.freeze({
  loading: '불러오는 중…',
  empty: '표시할 항목이 없습니다',
  ready: '준비 완료',
  error: '불러오기에 실패했습니다',
});

/**
 * 카드 상태 → badge 메타(아이콘 + 텍스트 + 색상 토큰). 계약 §3.5 / §4 매핑.
 * @type {Record<string,{key:string,label:string,icon:string,token:string}>}
 */
export const STATUS_META = Object.freeze({
  done: { key: 'done', label: '완료', icon: '✓', token: '--color-status-ready' },
  progress: { key: 'progress', label: '진행', icon: '◐', token: '--color-status-progress' },
  pending: { key: 'pending', label: '대기', icon: '○', token: '--color-status-muted' },
});

/** 필터 정의 — 계약 §3.1 DOM ID 매핑 */
export const FILTERS = Object.freeze([
  { id: 'dossier-filter-all', key: 'all', label: '전체' },
  { id: 'dossier-filter-progress', key: 'progress', label: '진행' },
  { id: 'dossier-filter-done', key: 'done', label: '완료' },
]);

/** 카드 종류 → CSS 변형 class. 계약 §4 매핑. */
export function cardVariantClass(kind) {
  const map = {
    requirement: 'dossier__card--requirement',
    role: 'dossier__card--role',
    test: 'dossier__card--test',
  };
  return map[kind] || '';
}

/** 상태 메타 조회(미지정 상태는 대기로 폴백). */
export function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.pending;
}

/**
 * 필터 적용. all→전체, progress→진행중, done→완료.
 * @param {ReadonlyArray<{status:string}>} items
 * @param {string} filter
 */
export function filterItems(items, filter) {
  if (filter === 'progress') return items.filter((it) => it.status === 'progress');
  if (filter === 'done') return items.filter((it) => it.status === 'done');
  return items.slice();
}

/**
 * 표시 상태 파생. loading/error 플래그 우선, 그 다음 가시 항목 수로 empty/ready 결정.
 * @param {{items:ReadonlyArray<{status:string}>, filter:string, loading?:boolean, error?:boolean}} ctx
 * @returns {'loading'|'empty'|'ready'|'error'}
 */
export function deriveDisplayState(ctx) {
  const { items = [], filter = 'all', loading = false, error = false } = ctx;
  if (error) return 'error';
  if (loading) return 'loading';
  const visible = filterItems(items, filter);
  if (visible.length === 0) return 'empty';
  return 'ready';
}

/** 진행 요약 텍스트(초기화/실패 후 복원 대상). */
export function progressSummary(items) {
  const count = (s) => items.filter((it) => it.status === s).length;
  return `완료 ${count('done')} · 진행 ${count('progress')} · 대기 ${count('pending')}`;
}

// ── DOM 배선 (브라우저에서만 실행) ───────────────────────────────────────────
export function initDossier(doc) {
  const root = doc.getElementById('dossier-trace-root');
  if (!root) return null;

  const listEl = doc.getElementById('dossier-list');
  const detailPanel = doc.getElementById('dossier-detail-panel');
  const detailBody = detailPanel.querySelector('.dossier__detail');
  const detailClose = detailPanel.querySelector('.dossier__detail-close');
  const statusEl = doc.getElementById('dossier-status');
  const statusText = statusEl.querySelector('.dossier__status-text');
  const progressEl = doc.getElementById('dossier-progress');
  const runBtn = doc.getElementById('dossier-run');
  const failToggle = doc.getElementById('dossier-fail-toggle');
  const filterEls = FILTERS.map((f) => doc.getElementById(f.id));

  const state = {
    items: [],
    filter: 'all',
    loading: false,
    error: false,
    selectedId: null,
  };

  function setStatus(name) {
    root.dataset.state = name;
    statusText.textContent = STATE_TEXT[name];
    statusEl.dataset.state = name;
  }

  function closeDetail() {
    state.selectedId = null;
    detailPanel.hidden = true;
    detailPanel.setAttribute('aria-hidden', 'true');
    detailBody.textContent = '';
    listEl.querySelectorAll('.dossier__card').forEach((c) => c.setAttribute('aria-selected', 'false'));
  }

  function openDetail(item) {
    state.selectedId = item.id;
    const meta = statusMeta(item.status);
    detailPanel.hidden = false;
    detailPanel.setAttribute('aria-hidden', 'false');
    detailBody.innerHTML = '';
    const h = doc.createElement('h2');
    h.className = 'dossier__detail-title';
    h.textContent = item.title;
    const badge = doc.createElement('p');
    badge.className = 'dossier__detail-status';
    badge.textContent = `상태: ${meta.icon} ${meta.label}`;
    const p = doc.createElement('p');
    p.className = 'dossier__detail-body';
    p.textContent = item.detail;
    detailBody.append(h, badge, p);
    listEl.querySelectorAll('.dossier__card').forEach((c) => {
      c.setAttribute('aria-selected', String(c.dataset.id === item.id));
    });
  }

  function renderCards() {
    const visible = filterItems(state.items, state.filter);
    listEl.innerHTML = '';
    visible.forEach((item) => {
      const meta = statusMeta(item.status);
      const li = doc.createElement('li');
      li.className = `dossier__card ${cardVariantClass(item.kind)}`;
      li.dataset.id = item.id;
      li.setAttribute('role', 'option');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-selected', String(state.selectedId === item.id));

      const title = doc.createElement('span');
      title.className = 'dossier__card-title';
      title.textContent = item.title;

      const badge = doc.createElement('span');
      badge.className = 'dossier__status-badge';
      badge.style.setProperty('--badge-color', `var(${meta.token})`);
      badge.textContent = `${meta.icon} ${meta.label}`;

      const summary = doc.createElement('span');
      summary.className = 'dossier__card-summary';
      summary.textContent = item.summary;

      li.append(title, badge, summary);
      li.addEventListener('click', () => openDetail(item));
      li.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          openDetail(item);
        }
      });
      listEl.appendChild(li);
    });
  }

  function syncFilterButtons() {
    filterEls.forEach((el, i) => {
      if (!el) return;
      el.setAttribute('aria-selected', String(FILTERS[i].key === state.filter));
    });
  }

  function render() {
    const displayState = deriveDisplayState(state);
    setStatus(displayState);
    progressEl.textContent = progressSummary(state.items);
    syncFilterButtons();
    if (displayState === 'ready' || displayState === 'empty') {
      renderCards();
    } else {
      listEl.innerHTML = '';
    }
    if (displayState !== 'ready') closeDetail();
    runBtn.disabled = state.loading;
  }

  function run() {
    // 초기값 복원(후조건 불변식): 상태/진행/필터/상세 초기화
    state.loading = true;
    state.error = false;
    state.selectedId = null;
    render();
    try {
      state.items = loadDossier({ fail: failToggle && failToggle.checked });
      state.loading = false;
      state.error = false;
    } catch (_err) {
      state.items = [];
      state.loading = false;
      state.error = true;
    }
    render();
  }

  function setFilter(key) {
    state.filter = key;
    closeDetail();
    render();
  }

  // 필터 버튼: 클릭 + 화살표 키 탐색
  filterEls.forEach((el, i) => {
    if (!el) return;
    el.addEventListener('click', () => setFilter(FILTERS[i].key));
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        ev.preventDefault();
        const dir = ev.key === 'ArrowRight' ? 1 : -1;
        const next = filterEls[(i + dir + filterEls.length) % filterEls.length];
        if (next) next.focus();
      } else if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        setFilter(FILTERS[i].key);
      }
    });
  });

  // 카드 리스트: 화살표 상하 이동
  listEl.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
    const cards = Array.from(listEl.querySelectorAll('.dossier__card'));
    const idx = cards.indexOf(doc.activeElement);
    if (idx === -1) return;
    ev.preventDefault();
    const dir = ev.key === 'ArrowDown' ? 1 : -1;
    const next = cards[(idx + dir + cards.length) % cards.length];
    if (next) next.focus();
  });

  detailClose.addEventListener('click', closeDetail);
  runBtn.addEventListener('click', run);

  run();
  return { state, run, setFilter, render, openDetail, closeDetail };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initDossier(document));
  } else {
    initDossier(document);
  }
}
