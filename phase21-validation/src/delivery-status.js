// 전달 상태 배지 (Delivery status badge) — 브라우저 직접 import용 vanilla JavaScript (ESM)
// frozen ui-contract@v1 / api-contract@v1: docs/plans/delivery-status-BF-1370.md §3~6
//   DOM ID:  delivery-status-root / delivery-status-badge / delivery-status-timestamp
//   states:  loading | ready | error | forbidden
//   selector·token·상태 계약을 재정의하지 않는다 (additive).

/** 계약 상태 키 (§3.3). loading은 초기/재조회 중 클라이언트 상태. */
const STATUS_KEYS = ['loading', 'ready', 'error', 'forbidden'];

/** 상태별 화면 텍스트 라벨 — 색상 비의존, 접근성 이름과 동일 (§3.3, AC-5). */
export const STATUS_LABEL = Object.freeze({
  loading: '진행 중',
  ready: '전달 완료',
  error: '오류',
  forbidden: '권한 없음',
});

/** read-only 데이터 소스 (§4.1, root-relative static serve_root `.`). */
const DEFAULT_URL = './data/delivery-status.json';

/** 계약 밖 status 값은 안전하게 error로 폴백한다 (E3). */
export function normalizeStatus(raw) {
  return STATUS_KEYS.includes(raw) ? raw : 'error';
}

/** 상태 → 화면 텍스트 라벨. */
export function statusLabel(status) {
  return STATUS_LABEL[normalizeStatus(status)];
}

/**
 * 배지 색상 토큰 매핑용 상태 값 (badge의 data-status 속성).
 * 색상은 CSS 토큰(--color-status-*)으로만 표현하고 selector/class는 추가하지 않는다.
 */
export function badgeStatus(status) {
  return normalizeStatus(status);
}

/** 컴포넌트 초기값 (§3.3: 초기 상태 loading). */
export function initialResult() {
  return { status: 'loading', updatedAt: null };
}

/**
 * 갱신 시각을 표시 모델로 변환한다 (§4.5).
 * @returns {{iso:string, display:string}|null} null이면 갱신 시각 영역 미표시 (E1, E7).
 */
export function formatUpdatedAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const iso = date.toISOString(); // 접근성 이름/datetime 근거로 보존
  const p = (n) => String(n).padStart(2, '0');
  const display =
    `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())} ` +
    `${p(date.getUTCHours())}:${p(date.getUTCMinutes())} UTC`;
  return { iso, display };
}

/**
 * fetch 결과(순수 데이터)를 상태 결과로 해석한다. 네트워크 비의존이라 단위 테스트가 쉽다.
 * @param {{httpStatus:number, ok:boolean, body:any}} res
 * @returns {{status:string, updatedAt:string|null}}
 */
export function resolveResponse(res) {
  if (res.httpStatus === 403) {
    return { status: 'forbidden', updatedAt: null }; // §4.4 (E4)
  }
  if (!res.ok) {
    return { status: 'error', updatedAt: null }; // §4.3 (E5)
  }
  const body = res.body || {};
  const status = normalizeStatus(body.status); // E3 폴백
  if (status === 'forbidden') return { status, updatedAt: null };
  if (status === 'error') return { status, updatedAt: body.updatedAt ?? null };
  return { status, updatedAt: body.updatedAt ?? null };
}

/**
 * 전달 상태를 read-only JSON에서 조회한다 (§4).
 * 네트워크/파싱 실패는 error로 정규화하되 AbortError는 재던진다(취소 복원용, AC-7).
 * @returns {Promise<{status:string, updatedAt:string|null}>}
 */
export async function fetchDeliveryStatus(url = DEFAULT_URL, { fetchImpl, signal } = {}) {
  const doFetch = fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!doFetch) throw new Error('fetch 구현을 사용할 수 없습니다.');

  let res;
  try {
    res = await doFetch(url, { signal });
  } catch (err) {
    if (err && err.name === 'AbortError') throw err; // 취소 → 컨트롤러가 초기값 복원
    return { status: 'error', updatedAt: null }; // 네트워크 오류 (E5)
  }

  if (res.status === 403) return { status: 'forbidden', updatedAt: null }; // E4
  if (!res.ok) return { status: 'error', updatedAt: null }; // E5

  let body;
  try {
    body = await res.json();
  } catch {
    return { status: 'error', updatedAt: null }; // JSON 파싱 실패 (E2)
  }
  return resolveResponse({ httpStatus: res.status, ok: res.ok, body });
}

/**
 * 상태 결과 → 렌더링 뷰 모델. 색상은 badgeStatus(data-status)로만 노출한다.
 */
export function deriveView(result) {
  const status = normalizeStatus(result && result.status);
  const ts = formatUpdatedAt(result && result.updatedAt);
  return {
    status,
    label: statusLabel(status),
    badgeStatus: badgeStatus(status),
    timestamp: ts ? { visible: true, iso: ts.iso, display: ts.display } : { visible: false, iso: '', display: '' },
  };
}

/**
 * DOM 컨트롤러 (브라우저 전용, 얇은 어댑터).
 * 초기화/취소/실패 뒤에는 상태·진행 표시를 초기값(loading)으로 되돌리고
 * 주 실행 control을 다시 사용할 수 있게 한다 (AC-7 / frozen invariant).
 */
export function createController(root, { url = DEFAULT_URL, fetchImpl } = {}) {
  const badge = root.querySelector('#delivery-status-badge');
  const timestampEl = root.querySelector('#delivery-status-timestamp');
  const control = root.querySelector('[data-role="delivery-status-refresh"]');
  let inflight = null;

  function render(result) {
    const view = deriveView(result);
    badge.textContent = view.label;
    badge.setAttribute('data-status', view.badgeStatus);
    if (view.timestamp.visible) {
      timestampEl.hidden = false;
      timestampEl.textContent = view.timestamp.display;
      timestampEl.setAttribute('datetime', view.timestamp.iso);
    } else {
      timestampEl.hidden = true;
      timestampEl.textContent = '';
      timestampEl.removeAttribute('datetime');
    }
  }

  async function load() {
    if (inflight) return; // 재조회 중 중복 요청 방지
    inflight = new AbortController();
    if (control) control.disabled = true;
    render(initialResult()); // loading→ready 진행 표시 복원
    try {
      const result = await fetchDeliveryStatus(url, { fetchImpl, signal: inflight.signal });
      render(result);
    } catch (err) {
      if (err && err.name === 'AbortError') {
        render(initialResult()); // 취소 → 초기값 복원 (AC-7)
      } else {
        render({ status: 'error', updatedAt: null });
      }
    } finally {
      inflight = null;
      if (control) control.disabled = false; // 성공/실패/취소 무관하게 control 재활성화
    }
  }

  function cancel() {
    if (inflight) inflight.abort();
  }

  render(initialResult());
  if (control) control.addEventListener('click', load);
  return { load, cancel, render };
}

// 브라우저 자동 초기화 (node --test 환경에는 document가 없어 건너뛴다).
if (typeof document !== 'undefined') {
  const start = () => {
    const root = document.getElementById('delivery-status-root');
    if (!root) return;
    createController(root).load();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
