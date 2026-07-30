// 전달 상태 배지 — 상태 전이·렌더링 로직 (ESM, 브라우저 직접 로드용)
// frozen UI 계약(docs/plans/implementation-plan.md §3)의 상태 텍스트/selector/후조건을 그대로 구현한다.

// 계약된 4개 state 와 화면 텍스트 (유일 권위 — 변경 금지)
export const STATE_LABELS = Object.freeze({
  idle: '대기 중',
  loading: '조회 중…',
  delivered: '전달 완료',
  failed: '전달 실패',
});

export const INITIAL_STATE = 'idle';

// 계약된 4개 값만 유효. 그 외 값은 렌더하지 않고 idle 초기값을 유지한다 (E-6).
export function isValidState(state) {
  return Object.prototype.hasOwnProperty.call(STATE_LABELS, state);
}

export function labelFor(state) {
  return isValidState(state) ? STATE_LABELS[state] : STATE_LABELS[INITIAL_STATE];
}

const SELECTORS = Object.freeze({
  root: 'delivery-badge-root',
  status: 'delivery-badge-status',
  refresh: 'delivery-badge-refresh',
});

// 기본 상태 조회기: 성공 응답을 흉내내 delivered 를 반환한다.
// 실패 케이스(E-1)는 reject/throw 로 failed 로 귀결된다.
function defaultFetchStatus() {
  return Promise.resolve('delivered');
}

/**
 * 배지 컨트롤러 생성.
 * @param {object} refs - { root, status, refresh } DOM element
 * @param {object} [options]
 * @param {() => Promise<string>} [options.fetchStatus] - 상태 조회기(성공 시 state 문자열 반환, 실패 시 reject)
 * @returns 컨트롤러 { getState, render, refresh, reset, cancel }
 */
export function createBadgeController(refs, options = {}) {
  const { root, status, refresh } = refs;
  const fetchStatus =
    typeof options.fetchStatus === 'function' ? options.fetchStatus : defaultFetchStatus;

  let currentState = INITIAL_STATE;
  // 진행 중 요청 식별자. refresh/cancel 마다 증가시켜 stale 응답을 무시한다 (E-2).
  let requestToken = 0;

  function setRefreshEnabled(enabled) {
    if (!refresh) return;
    refresh.disabled = !enabled;
  }

  function render(state) {
    // 계약 외 값은 무시하고 idle 초기값을 유지한다 (E-6).
    const nextState = isValidState(state) ? state : INITIAL_STATE;
    currentState = nextState;

    if (status) {
      status.textContent = STATE_LABELS[nextState];
    }
    if (root && root.setAttribute) {
      root.setAttribute('data-state', nextState);
    }

    const loading = nextState === 'loading';
    if (status && status.setAttribute) {
      status.setAttribute('aria-busy', loading ? 'true' : 'false');
    }
    // 진행 중(loading)에만 control 비활성화. 그 외 상태에서는 재활성화(후조건 §3.8).
    setRefreshEnabled(!loading);
    return nextState;
  }

  function getState() {
    return currentState;
  }

  // 초기화/취소: 진행 중 응답을 무효화하고 idle 로 되돌린 뒤 control 재활성화 (E-2/E-3).
  function reset() {
    requestToken += 1;
    return render(INITIAL_STATE);
  }

  const cancel = reset;

  function refreshStatus() {
    // 이미 진행 중이면 중복 실행하지 않는다.
    if (currentState === 'loading') {
      return Promise.resolve(currentState);
    }
    const token = (requestToken += 1);
    render('loading');

    return Promise.resolve()
      .then(() => fetchStatus())
      .then((result) => {
        if (token !== requestToken) return currentState; // 취소/재실행으로 무효화된 응답
        const resolved = isValidState(result) && result !== 'loading' ? result : 'delivered';
        return render(resolved);
      })
      .catch(() => {
        if (token !== requestToken) return currentState; // 무효화된 응답
        return render('failed');
      });
  }

  // 초기 렌더 (US-1: idle/대기 중 + control 사용 가능)
  render(INITIAL_STATE);

  return {
    getState,
    render,
    refresh: refreshStatus,
    reset,
    cancel,
  };
}

// 브라우저 환경에서만 자동 초기화. node --test 로 import 시에는 DOM 이 없으므로 건너뛴다.
export function mountFromDocument(doc) {
  if (!doc || typeof doc.getElementById !== 'function') return null;
  const root = doc.getElementById(SELECTORS.root);
  const status = doc.getElementById(SELECTORS.status);
  const refresh = doc.getElementById(SELECTORS.refresh);
  if (!root || !status || !refresh) return null;

  const controller = createBadgeController({ root, status, refresh });
  refresh.addEventListener('click', () => {
    controller.refresh();
  });
  return controller;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountFromDocument(document));
  } else {
    mountFromDocument(document);
  }
}
