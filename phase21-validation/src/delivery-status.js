// 전달 상태 배지 (Delivery status badge) — vanilla JavaScript (ESM)
// frozen ui-contract@v1: DOM ID / CSS class / token / 상태 계약을 재정의하지 않는다.

const STATUS_KEYS = ['idle', 'loading', 'success', 'error'];

/** 상태별 화면 텍스트 (색상 비의존, 접근성 이름과 동일) */
export const STATUS_TEXT = Object.freeze({
  idle: '대기 중',
  loading: '불러오는 중',
  success: '정상',
  error: '오류',
});

const DEFAULT_URL = './api/delivery-status.json';

/** 계약 밖 값은 안전한 error 상태로 폴백한다 (Edge E2). */
export function normalizeStatus(raw) {
  return STATUS_KEYS.includes(raw) ? raw : 'error';
}

/** 상태 → 화면 텍스트. */
export function statusText(status) {
  return STATUS_TEXT[normalizeStatus(status)];
}

/** 상태 → exact 배지 class 문자열 (frozen class 계약). */
export function badgeClassName(status) {
  const base = 'delivery-status__badge';
  const s = normalizeStatus(status);
  if (s === 'success') return `${base} ${base}--success`;
  if (s === 'error') return `${base} ${base}--error`;
  return base;
}

/** 갱신 시각을 ISO 8601로 포맷. 누락/파싱 불가 시 빈 문자열 (Edge E3). */
export function formatUpdatedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

/**
 * 전달 상태를 read-only JSON에서 조회한다.
 * 성공/오류/권한 거부(403)를 화면 텍스트용 결과로 정규화한다.
 * @returns {Promise<{status:string, updatedAt:string, message:string, permissionDenied?:boolean}>}
 */
export async function fetchDeliveryStatus(url = DEFAULT_URL, { fetchImpl, signal } = {}) {
  const doFetch = fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!doFetch) throw new Error('fetch 구현을 사용할 수 없습니다.');

  const res = await doFetch(url, { signal });
  if (res.status === 403) {
    return {
      status: 'error',
      updatedAt: '',
      message: '접근 권한이 거부되었습니다.',
      permissionDenied: true,
    };
  }
  if (!res.ok) {
    return { status: 'error', updatedAt: '', message: '전달 상태를 불러오지 못했습니다.' };
  }
  const data = await res.json();
  return {
    status: normalizeStatus(data && data.status),
    updatedAt: (data && data.updatedAt) || '',
    message: '',
  };
}

/** 갱신 시각 표시 텍스트를 만든다 (없으면 안내 문구 폴백). */
function updatedAtText({ updatedAt = '', message = '' } = {}) {
  if (message) return message;
  const iso = formatUpdatedAt(updatedAt);
  return iso ? `마지막 갱신: ${iso}` : '갱신 시각 미확정';
}

/**
 * DOM 컨트롤러를 생성한다. 브라우저에서만 사용한다.
 * 초기화/취소/실패 뒤에는 진행 표시를 걷고 새로고침 control을 재활성화한다 (frozen invariant E5).
 */
export function createController(root, { url = DEFAULT_URL, fetchImpl } = {}) {
  const badge = root.querySelector('#delivery-status-badge');
  const updatedAtEl = root.querySelector('#delivery-status-updated-at');
  const refresh = root.querySelector('#delivery-status-refresh');
  let inflight = null;

  function paint(status, detail) {
    badge.textContent = statusText(status);
    badge.className = badgeClassName(status);
    updatedAtEl.textContent = updatedAtText(detail);
  }

  async function load() {
    if (inflight) return; // loading 중 중복 재조회 방지 (Edge E4)
    inflight = new AbortController();
    refresh.disabled = true;
    paint('loading');
    try {
      const result = await fetchDeliveryStatus(url, { fetchImpl, signal: inflight.signal });
      paint(result.status, { updatedAt: result.updatedAt, message: result.message });
    } catch (err) {
      if (err && err.name === 'AbortError') {
        paint('idle'); // 취소 후 초기값 복귀
      } else {
        paint('error', { message: '전달 상태를 불러오지 못했습니다.' });
      }
    } finally {
      inflight = null;
      refresh.disabled = false; // 실패/취소/성공 무관하게 control 재활성화
    }
  }

  function cancel() {
    if (inflight) inflight.abort();
  }

  paint('idle');
  refresh.addEventListener('click', load);
  return { load, cancel, paint };
}

// 브라우저 자동 초기화 (node --test 환경에서는 document가 없어 건너뛴다).
if (typeof document !== 'undefined') {
  const start = () => {
    const root = document.getElementById('delivery-status-root');
    if (!root) return;
    const controller = createController(root);
    controller.load();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
