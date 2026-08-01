const STATUS_TEXT = Object.freeze({
  idle: '상태 확인 대기',
  loading: '전달 상태 확인 중…',
  delivered: '전달 완료',
  error: '전달 상태를 불러오지 못했습니다',
});

const MODIFIER_CLASS = Object.freeze({
  idle: 'delivery-status--pending',
  loading: 'delivery-status--pending',
  delivered: 'delivery-status--delivered',
  error: 'delivery-status--error',
});

const ROOT_MODIFIER_CLASSES = Object.freeze([
  'delivery-status--pending',
  'delivery-status--delivered',
  'delivery-status--error',
]);

// vanilla-static 환경: 실제 API 서버가 없으므로 plan §4 지시대로
// delivery-status.json 고정 응답 fixture를 app.js 기준 상대 경로로 fetch한다.
const ENDPOINT = new URL('./delivery-status.json', import.meta.url).href;

export { STATUS_TEXT };

export function normalizeStatus(state) {
  return Object.prototype.hasOwnProperty.call(STATUS_TEXT, state) ? state : 'error';
}

export function statusText(state) {
  return STATUS_TEXT[normalizeStatus(state)];
}

export function modifierClass(state) {
  return MODIFIER_CLASS[normalizeStatus(state)];
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
      return { state: 'idle', updatedAt: '' };
    }
    return { state: 'error', updatedAt: '' };
  }

  if (!response.ok) {
    return { state: 'error', updatedAt: '' };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return { state: 'error', updatedAt: '' };
  }

  if (!body || body.status !== 'delivered') {
    return { state: 'error', updatedAt: '' };
  }

  return { state: 'delivered', updatedAt: formatUpdatedAt(body.updatedAt) };
}

function renderState(elements, state, updatedAt = '') {
  const normalized = normalizeStatus(state);

  elements.root.classList.remove(...ROOT_MODIFIER_CLASSES);
  elements.root.classList.add(modifierClass(normalized));

  elements.badge.textContent = statusText(normalized);

  if (normalized === 'delivered' && updatedAt) {
    elements.timestamp.textContent = updatedAt;
    elements.timestamp.setAttribute('datetime', updatedAt);
    elements.timestamp.hidden = false;
  } else {
    elements.timestamp.textContent = '';
    elements.timestamp.removeAttribute('datetime');
    elements.timestamp.hidden = true;
  }

  elements.refresh.disabled = normalized === 'loading';
}

async function loadDeliveryStatus(elements, fetchImpl) {
  renderState(elements, 'loading');
  const result = await fetchDeliveryStatus(ENDPOINT, { fetchImpl });
  renderState(elements, result.state, result.updatedAt);
}

export function initDeliveryStatus(doc = document, fetchImpl = fetch) {
  const elements = {
    root: doc.getElementById('delivery-status-root'),
    badge: doc.getElementById('delivery-status-badge'),
    timestamp: doc.getElementById('delivery-status-timestamp'),
    refresh: doc.getElementById('delivery-status-refresh'),
  };

  if (!elements.root || !elements.badge || !elements.timestamp || !elements.refresh) {
    return null;
  }

  renderState(elements, 'idle');
  elements.refresh.addEventListener('click', () => {
    loadDeliveryStatus(elements, fetchImpl);
  });
  loadDeliveryStatus(elements, fetchImpl);

  return elements;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initDeliveryStatus());
  } else {
    initDeliveryStatus();
  }
}
