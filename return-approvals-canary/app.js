// BF-1039 반품 승인 워크벤치 — DOM 앱 (vanilla ESM)
// 순수 상태 전이는 ./logic.js 재사용, fixture 는 ./fixtures.js. 외부 API 없음.
import { RETURN_REQUESTS, REASON_LABELS, STATUS_LABELS } from './fixtures.js';
import {
  OVERLAY_STORAGE_KEY,
  isValidHoldReason,
  approveRequest,
  holdRequest,
  releaseHoldRequest,
  mergeOverlay,
  toOverlayEntry,
  filterByStatus,
  computeCounts,
} from './logic.js';

const OPERATOR_ID = 'operator-09'; // mock 처리자 (외부 인증 미연동, 기획 §3 approvedBy)
const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'approved', label: '승인' },
  { key: 'held', label: '보류' },
];
const BADGE_ICON = { pending: '◌', approved: '✔', held: '⏸' };

// ── 로컬 상태 ────────────────────────────────────────────
const state = {
  /** @type {Record<string, object>} */ overlay: loadOverlay(),
  filter: 'all',
  /** @type {string|null} */ selectedId: null,
  holdFormOpen: false,
  loadError: false,
};

// ── DOM 참조 ────────────────────────────────────────────
const $filters = document.getElementById('rw-filters');
const $tbody = document.getElementById('rw-tbody');
const $empty = document.getElementById('rw-empty');
const $loadError = document.getElementById('rw-load-error');
const $detail = document.getElementById('rw-detail');
const $toastRegion = document.getElementById('rw-toast-region');
const $approveBackdrop = document.getElementById('rw-approve-backdrop');
const $approveDesc = document.getElementById('rw-dlg-desc');
const $approveConfirm = document.getElementById('rw-approve-confirm');
const $approveCancel = document.getElementById('rw-approve-cancel');

/** 다이얼로그 열기 전 포커스 요소(복귀용) */
let dialogReturnFocus = null;
let pendingApproveId = null;

// ── localStorage 오버레이 (접근 불가 시 안전 폴백) ─────────
function loadOverlay() {
  try {
    const raw = window.localStorage.getItem(OVERLAY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {}; // 사생활 보호 모드 등 — 세션 메모리 상태로만 동작
  }
}
function saveOverlay() {
  try {
    window.localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(state.overlay));
  } catch {
    /* 저장 실패해도 화면·세션 전이는 정상 동작 (새로고침 유지만 안 됨) */
  }
}

// ── 데이터 파생 ──────────────────────────────────────────
function getMerged() {
  return mergeOverlay(RETURN_REQUESTS, state.overlay);
}
function getSelected() {
  if (!state.selectedId) return null;
  return getMerged().find((r) => r.id === state.selectedId) ?? null;
}

// ── 포맷 헬퍼 ────────────────────────────────────────────
function formatAmount(won) {
  return `₩${Number(won).toLocaleString('ko-KR')}`;
}
function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

// ── DOM 빌더 ─────────────────────────────────────────────
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function statusBadge(status) {
  return el('span', { class: `badge badge--${status}`, role: 'status' }, [
    el('span', { class: 'ico', 'aria-hidden': 'true', text: BADGE_ICON[status] }),
    STATUS_LABELS[status],
  ]);
}

// ── 렌더: 상태 필터 ──────────────────────────────────────
function renderFilters() {
  const counts = computeCounts(getMerged());
  $filters.textContent = '';
  FILTERS.forEach((f) => {
    const selected = state.filter === f.key;
    const btn = el('button', {
      class: 'rw-filter', type: 'button', role: 'tab',
      'aria-selected': selected ? 'true' : 'false',
      tabindex: selected ? '0' : '-1',
      dataset: { filter: f.key },
    }, [
      f.label,
      el('span', { class: 'count', text: String(counts[f.key]) }),
    ]);
    btn.addEventListener('click', () => setFilter(f.key));
    btn.addEventListener('keydown', onFilterKeydown);
    $filters.appendChild(btn);
  });
}

function onFilterKeydown(e) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault();
  const idx = FILTERS.findIndex((f) => f.key === state.filter);
  const delta = e.key === 'ArrowRight' ? 1 : -1;
  const nextIdx = (idx + delta + FILTERS.length) % FILTERS.length;
  setFilter(FILTERS[nextIdx].key);
  const nextBtn = $filters.querySelector(`[data-filter="${FILTERS[nextIdx].key}"]`);
  if (nextBtn) nextBtn.focus();
}

function setFilter(key) {
  state.filter = key;
  renderFilters();
  renderList();
}

// ── 렌더: 목록 테이블 ────────────────────────────────────
function renderList() {
  $tbody.textContent = '';
  if (state.loadError) {
    $loadError.hidden = false;
    $empty.hidden = true;
    return;
  }
  $loadError.hidden = true;

  const rows = filterByStatus(getMerged(), state.filter);
  $empty.hidden = rows.length > 0;

  rows.forEach((r) => {
    const selected = r.id === state.selectedId;
    const tr = el('tr', {
      class: 'rw-row', role: 'row', tabindex: '0',
      'aria-selected': selected ? 'true' : 'false',
      dataset: { id: r.id },
    }, [
      el('td', {}, [statusBadge(r.status)]),
      el('td', { text: r.orderId }),
      el('td', { text: r.customerName }),
      el('td', { text: r.productName }),
      el('td', { text: REASON_LABELS[r.reason] }),
      el('td', { class: 'caption', text: formatDateTime(r.requestedAt) }),
    ]);
    tr.addEventListener('click', () => selectRequest(r.id));
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectRequest(r.id);
      }
    });
    $tbody.appendChild(tr);
  });
}

function selectRequest(id) {
  state.selectedId = id;
  state.holdFormOpen = false;
  renderList();
  renderDetail();
}

// ── 렌더: 상세·액션 패널 ─────────────────────────────────
function renderDetail() {
  const req = getSelected();
  $detail.textContent = '';

  if (!req) {
    $detail.appendChild(el('div', { class: 'placeholder', text: '요청을 선택하세요' }));
    return;
  }

  $detail.appendChild(statusBadge(req.status));
  $detail.appendChild(el('h2', { text: req.productName }));
  $detail.appendChild(el('div', {
    class: 'caption',
    text: `${req.id} · SKU ${req.sku} · 주문 ${req.orderId}`,
  }));

  const meta = el('dl', { class: 'detail-meta' });
  const addMeta = (label, valueNode) => {
    meta.appendChild(el('dt', { text: label }));
    meta.appendChild(typeof valueNode === 'string' ? el('dd', { text: valueNode }) : valueNode);
  };
  const reasonText = req.reasonDetail
    ? `${REASON_LABELS[req.reason]} — "${req.reasonDetail}"`
    : REASON_LABELS[req.reason];
  addMeta('고객명', req.customerName);
  addMeta('반품 사유', reasonText);
  addMeta('반품 수량', el('dd', { class: 'num', text: String(req.quantity) }));
  addMeta('환불 예정 금액', el('dd', { class: 'detail-amount', text: formatAmount(req.refundAmount) }));
  if (req.notes) addMeta('운영자 메모', el('dd', { class: 'caption', text: req.notes }));
  if (req.status === 'held' && req.holdReason) addMeta('보류 사유', req.holdReason);
  if (req.status === 'approved') {
    addMeta('승인 시각', req.approvedAt ? formatDateTime(req.approvedAt) : '-');
    addMeta('처리자', req.approvedBy ?? '-');
  }
  $detail.appendChild(meta);
  $detail.appendChild(el('hr', { class: 'divider' }));

  $detail.appendChild(renderActions(req));
}

function renderActions(req) {
  const actions = el('div', { class: 'rw-actions' });

  if (req.status === 'approved') {
    const approveBtn = el('button', {
      class: 'btn btn--primary', type: 'button',
      disabled: 'disabled', 'aria-disabled': 'true',
      'aria-label': '승인 완료 — 추가 액션 불가',
      text: '승인',
    });
    const holdBtn = el('button', {
      class: 'btn btn--secondary', type: 'button',
      disabled: 'disabled', 'aria-disabled': 'true', text: '보류',
    });
    actions.appendChild(approveBtn);
    actions.appendChild(holdBtn);
    const wrap = el('div', {}, [actions,
      el('p', { class: 'caption', style: 'margin-top:8px;', text: '승인 완료 — 추가 액션 불가 (terminal)' })]);
    return wrap;
  }

  // pending / held 공통: 승인 버튼
  const approveBtn = el('button', {
    class: 'btn btn--primary', type: 'button',
    text: req.status === 'held' ? '승인(재검토)' : '승인',
  });
  approveBtn.addEventListener('click', () => openApproveDialog(req.id));
  actions.appendChild(approveBtn);

  if (req.status === 'pending') {
    const holdBtn = el('button', {
      class: 'btn btn--secondary', type: 'button',
      'aria-expanded': state.holdFormOpen ? 'true' : 'false', text: '보류',
    });
    holdBtn.addEventListener('click', () => toggleHoldForm(req.id));
    actions.appendChild(holdBtn);
  } else if (req.status === 'held') {
    const releaseBtn = el('button', { class: 'btn btn--secondary', type: 'button', text: '보류 해제' });
    releaseBtn.addEventListener('click', () => doReleaseHold(req.id));
    actions.appendChild(releaseBtn);
  }

  const wrap = el('div', {}, [actions]);
  if (req.status === 'pending' && state.holdFormOpen) {
    wrap.appendChild(renderHoldForm(req.id));
  }
  return wrap;
}

function renderHoldForm(id) {
  const errorNode = el('p', {
    class: 'field-error', id: 'rw-hold-err', role: 'alert', 'aria-live': 'assertive', hidden: 'hidden',
    text: '보류 사유를 입력해 주세요.',
  });
  const textarea = el('textarea', {
    id: 'rw-hold-reason', 'aria-describedby': 'rw-hold-err',
    placeholder: '예) 추가 검수 필요 — 파손 부위 재확인 요청',
  });
  const confirmBtn = el('button', { class: 'btn btn--primary', type: 'button', text: '보류 확정' });
  const cancelBtn = el('button', { class: 'btn btn--secondary', type: 'button', text: '취소' });

  confirmBtn.addEventListener('click', () => {
    const reason = textarea.value;
    if (!isValidHoldReason(reason)) {
      textarea.setAttribute('aria-invalid', 'true');
      errorNode.hidden = false;
      textarea.focus();
      return;
    }
    doHold(id, reason);
  });
  cancelBtn.addEventListener('click', () => {
    state.holdFormOpen = false;
    renderDetail();
    focusAction('보류');
  });
  textarea.addEventListener('input', () => {
    if (textarea.getAttribute('aria-invalid') === 'true' && isValidHoldReason(textarea.value)) {
      textarea.removeAttribute('aria-invalid');
      errorNode.hidden = true;
    }
  });

  const form = el('div', { class: 'hold-form' }, [
    el('label', { for: 'rw-hold-reason', text: '보류 사유 (필수)' }),
    textarea,
    errorNode,
    el('div', { class: 'row' }, [cancelBtn, confirmBtn]),
  ]);
  // 폼 등장 시 입력으로 포커스 이동 (design §5.1)
  window.requestAnimationFrame(() => textarea.focus());
  return form;
}

function toggleHoldForm() {
  state.holdFormOpen = !state.holdFormOpen;
  renderDetail();
}

// ── 전이 실행 ────────────────────────────────────────────
function applyTransition(nextReq) {
  const current = getSelected();
  if (!current || nextReq === current) return false; // 전이 없음(guard/terminal/중복)
  state.overlay = { ...state.overlay, [nextReq.id]: toOverlayEntry(nextReq) };
  saveOverlay();
  state.holdFormOpen = false;
  renderFilters();
  renderList();
  renderDetail();
  return true;
}

function doHold(id, reason) {
  const req = getSelected();
  if (!req || req.id !== id) return;
  const next = holdRequest(req, reason);
  if (applyTransition(next)) showToast(`${id} 보류 처리되었습니다`);
}

function doReleaseHold(id) {
  const req = getSelected();
  if (!req || req.id !== id) return;
  const next = releaseHoldRequest(req);
  if (applyTransition(next)) showToast(`${id} 보류가 해제되었습니다`);
}

// ── 승인 확인 다이얼로그 ─────────────────────────────────
function openApproveDialog(id) {
  const req = getSelected();
  if (!req || req.id !== id) return;
  pendingApproveId = id;
  dialogReturnFocus = document.activeElement;
  $approveDesc.textContent =
    `${req.id} · ${req.productName} · 환불 ${formatAmount(req.refundAmount)} — 승인 후에는 되돌릴 수 없습니다.`;
  $approveBackdrop.hidden = false;
  $approveConfirm.focus();
}
function closeApproveDialog() {
  $approveBackdrop.hidden = true;
  pendingApproveId = null;
  if (dialogReturnFocus && typeof dialogReturnFocus.focus === 'function') dialogReturnFocus.focus();
  dialogReturnFocus = null;
}
function confirmApprove() {
  const id = pendingApproveId;
  const req = getSelected();
  $approveBackdrop.hidden = true; // 다이얼로그 먼저 닫고 전이
  if (req && req.id === id) {
    const next = approveRequest(req, { at: new Date().toISOString(), by: OPERATOR_ID });
    if (applyTransition(next)) showToast(`${id} 승인 처리되었습니다`);
  }
  pendingApproveId = null;
  dialogReturnFocus = null;
}

$approveConfirm.addEventListener('click', confirmApprove);
$approveCancel.addEventListener('click', closeApproveDialog);
$approveBackdrop.addEventListener('click', (e) => { if (e.target === $approveBackdrop) closeApproveDialog(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$approveBackdrop.hidden) closeApproveDialog();
});

// ── 토스트 (aria-live polite) ────────────────────────────
function showToast(message) {
  const toast = el('span', { class: 'toast' }, [
    el('span', { 'aria-hidden': 'true', text: '✔' }), ` ${message}`,
  ]);
  $toastRegion.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

// ── 포커스 헬퍼 ──────────────────────────────────────────
function focusAction(label) {
  const btns = $detail.querySelectorAll('.rw-actions .btn');
  for (const b of btns) {
    if (b.textContent.trim() === label) { b.focus(); return; }
  }
}

// ── 초기 렌더 ────────────────────────────────────────────
function init() {
  try {
    renderFilters();
    renderList();
    renderDetail();
  } catch {
    state.loadError = true;
    renderList();
  }
}
init();
