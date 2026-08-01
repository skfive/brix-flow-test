const VALID_STATUSES = new Set(['normal', 'warning', 'failed']);

export const STATUS_META = Object.freeze({
  loading: Object.freeze({ label: '상태 확인 중…', icon: '⏳' }),
  normal: Object.freeze({ label: '정상', icon: '●' }),
  warning: Object.freeze({ label: '경고', icon: '▲' }),
  failed: Object.freeze({ label: '실패', icon: '✖' }),
  error: Object.freeze({ label: '전달 상태를 불러오지 못했습니다', icon: '⚠' }),
});

const BADGE_MODIFIER_CLASS = Object.freeze({
  normal: 'delivery-status__badge--normal',
  warning: 'delivery-status__badge--warning',
  failed: 'delivery-status__badge--failed',
});

const ALL_BADGE_MODIFIER_CLASSES = Object.values(BADGE_MODIFIER_CLASS);

// vanilla-static 환경: 실제 API 서버가 없으므로 plan §4 응답 계약(normal/warning/failed,
// updatedAt ISO 8601)을 만족하는 delivery-status.json 고정 응답을 모듈 기준 상대 경로로 fetch한다.
const DEFAULT_ENDPOINT = new URL('./delivery-status.json', import.meta.url).href;

export function normalizeStatus(status) {
  return VALID_STATUSES.has(status) ? status : 'error';
}

export function statusLabel(state) {
  return (STATUS_META[state] || STATUS_META.error).label;
}

export function badgeModifierClass(state) {
  return BADGE_MODIFIER_CLASS[state] || null;
}

export function formatUpdatedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

export async function fetchDeliveryStatus(url, { fetchImpl = fetch, signal } = {}) {
  let response;
  try {
    response = await fetchImpl(url, { signal });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return { status: null, updatedAt: '' };
    }
    return { status: 'error', updatedAt: '' };
  }

  if (!response.ok) {
    return { status: 'error', updatedAt: '' };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return { status: 'error', updatedAt: '' };
  }

  const normalized = normalizeStatus(body && body.status);
  if (normalized === 'error') {
    return { status: 'error', updatedAt: '' };
  }

  return { status: normalized, updatedAt: formatUpdatedAt(body.updatedAt) };
}

function renderState(elements, state, updatedAt = '') {
  const meta = STATUS_META[state] || STATUS_META.error;
  const modifierClass = badgeModifierClass(state);

  elements.badge.classList.remove(...ALL_BADGE_MODIFIER_CLASSES);
  if (modifierClass) {
    elements.badge.classList.add(modifierClass);
  }
  elements.badge.textContent = meta.icon;
  elements.badge.setAttribute('aria-label', meta.label);

  elements.label.textContent = meta.label;

  if (VALID_STATUSES.has(state) && updatedAt) {
    elements.updated.textContent = updatedAt;
    elements.updated.setAttribute('datetime', updatedAt);
  } else {
    elements.updated.textContent = '';
    elements.updated.removeAttribute('datetime');
  }
}

function createLoader(elements, fetchImpl, endpoint) {
  let activeController = null;

  return async function load() {
    if (activeController) {
      activeController.abort();
    }
    const controller = new AbortController();
    activeController = controller;

    renderState(elements, 'loading', '');
    elements.refresh.disabled = true;

    const result = await fetchDeliveryStatus(endpoint, { fetchImpl, signal: controller.signal });

    if (activeController !== controller || result.status === null) {
      return;
    }

    renderState(elements, result.status, result.updatedAt);
    elements.refresh.disabled = false;
  };
}

export function initDeliveryStatus(doc = document, { fetchImpl = fetch, endpoint = DEFAULT_ENDPOINT } = {}) {
  const elements = {
    root: doc.getElementById('delivery-status-root'),
    badge: doc.getElementById('delivery-status-badge'),
    label: doc.getElementById('delivery-status-label'),
    updated: doc.getElementById('delivery-status-updated'),
    refresh: doc.getElementById('delivery-status-refresh'),
  };

  if (!elements.root || !elements.badge || !elements.label || !elements.updated || !elements.refresh) {
    return null;
  }

  const load = createLoader(elements, fetchImpl, endpoint);
  elements.refresh.addEventListener('click', load);
  load();

  return elements;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initDeliveryStatus());
  } else {
    initDeliveryStatus();
  }
}
