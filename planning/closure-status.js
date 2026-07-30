// planning/closure-status.js
// 종료 준비 상태 안내 영역 — 상태 모델 · 렌더링 · 기존 Planning Dossier GET(additive) 소비
//
// 계약 권위: docs/plans/implementation-plan-BF-1328.md §3(UI 계약)·§4(Dossier 소비)·§5(recovery)
// - 브라우저가 <script type="module"> 로 직접 import 하는 build-step 없는 vanilla ESM.
// - DOM 접근은 모두 함수 내부에서 guard 하므로 node --test 환경에서도 부작용 없이 import 된다.
// - 새 schema / endpoint / 외부 의존성을 추가하지 않고 기존 Dossier 응답을 읽기 전용으로만 소비한다.

// §3.3 상태 모델 (정확값 · 6개)
export const CLOSURE_STATES = Object.freeze([
  'loading',
  'ready',
  'blocked',
  'needs-operator-action',
  'empty',
  'error',
]);

// §3.3 배지 텍스트 — 상태는 색상만이 아니라 화면 텍스트로 노출한다.
const BADGE_TEXT = Object.freeze({
  loading: '상태 확인 중',
  ready: '종료 준비 완료',
  blocked: '종료 불가 — blocker {count}건',
  'needs-operator-action': '운영자 조치 필요',
  empty: '표시할 항목 없음',
  error: '상태를 불러오지 못함',
});

// 접근성 이름(상태명) — 색상 비의존 요구(§3.5.3)를 위해 각 상태의 텍스트 이름을 노출한다.
const STATE_ARIA_LABEL = Object.freeze({
  loading: '종료 준비 상태: 상태 확인 중',
  ready: '종료 준비 상태: 종료 준비 완료',
  blocked: '종료 준비 상태: 종료 불가',
  'needs-operator-action': '종료 준비 상태: 운영자 조치 필요',
  empty: '종료 준비 상태: 표시할 항목 없음',
  error: '종료 준비 상태: 상태를 불러오지 못함',
});

/**
 * 배지 텍스트를 상태·blocker 수 기준으로 생성한다.
 * @param {string} state
 * @param {number} count blocker 수
 * @returns {string}
 */
export function badgeText(state, count = 0) {
  const template = BADGE_TEXT[state] ?? BADGE_TEXT.error;
  return template.replace('{count}', String(count));
}

/**
 * Dossier 응답에서 blocker 수를 도출한다. (기존 필드만 읽는다 — additive)
 * @param {unknown} dossier
 * @returns {number}
 */
export function blockerCountOf(dossier) {
  if (!dossier || typeof dossier !== 'object') return 0;
  const d = /** @type {Record<string, unknown>} */ (dossier);
  if (Array.isArray(d.blockers)) return d.blockers.length;
  if (typeof d.blockerCount === 'number' && Number.isFinite(d.blockerCount)) {
    return Math.max(0, Math.trunc(d.blockerCount));
  }
  return 0;
}

/**
 * 운영자 조치 필요 여부를 도출한다. (기존 플래그 필드만 읽는다 — additive)
 * @param {unknown} dossier
 * @returns {boolean}
 */
export function needsOperatorAction(dossier) {
  if (!dossier || typeof dossier !== 'object') return false;
  const d = /** @type {Record<string, unknown>} */ (dossier);
  if (d.needsOperatorAction === true || d.operatorActionRequired === true) return true;
  if (Array.isArray(d.operatorActions) && d.operatorActions.length > 0) return true;
  return false;
}

/**
 * Dossier 가 종료 상태 판정에 쓸 유의미한 필드를 하나도 갖고 있지 않으면 비어있는 것으로 본다.
 * @param {unknown} dossier
 * @returns {boolean}
 */
export function isEmptyDossier(dossier) {
  if (!dossier || typeof dossier !== 'object') return true;
  const d = /** @type {Record<string, unknown>} */ (dossier);
  const hasBlockerField =
    Array.isArray(d.blockers) || typeof d.blockerCount === 'number';
  const hasActionField =
    'needsOperatorAction' in d ||
    'operatorActionRequired' in d ||
    Array.isArray(d.operatorActions);
  const hasReadyField = 'closureReady' in d || 'ready' in d;
  return !(hasBlockerField || hasActionField || hasReadyField);
}

/**
 * §4.1 상태 도출 규칙 (fetch 실패는 별도 error 경로에서 처리한다).
 *   dossier 없음/필드 비어있음 -> empty
 *   operator-action 필요        -> needs-operator-action
 *   blocker 수 > 0             -> blocked
 *   그 외                      -> ready
 * @param {unknown} dossier
 * @returns {{ state: string, blockerCount: number }}
 */
export function deriveClosureState(dossier) {
  if (isEmptyDossier(dossier)) return { state: 'empty', blockerCount: 0 };
  if (needsOperatorAction(dossier)) {
    return { state: 'needs-operator-action', blockerCount: blockerCountOf(dossier) };
  }
  const blockerCount = blockerCountOf(dossier);
  if (blockerCount > 0) return { state: 'blocked', blockerCount };
  return { state: 'ready', blockerCount: 0 };
}

// ── KPI 측정 (acceptance criteria: KPI 측정 코드 포함) ────────────────────────
// 상태별 렌더 횟수와 first-status 도달 시간(loading -> 첫 확정 상태)을 기록한다.
// 브라우저에서는 performance.now(), 그 외 환경에서는 주입된 now 로 측정한다.

function defaultNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/**
 * @param {() => number} [now]
 */
export function createKpiRecorder(now = defaultNow) {
  /** @type {Record<string, number>} */
  const renderCounts = {};
  let startedAt = null;
  let firstStatusMs = null;

  return {
    /** 컨트롤러가 조회를 시작(loading)할 때 호출한다. */
    start() {
      startedAt = now();
    },
    /** 렌더될 때마다 호출한다. */
    recordRender(state) {
      renderCounts[state] = (renderCounts[state] || 0) + 1;
      if (
        firstStatusMs === null &&
        startedAt !== null &&
        state !== 'loading' &&
        state !== 'error'
      ) {
        firstStatusMs = now() - startedAt;
      }
    },
    snapshot() {
      return { renderCounts: { ...renderCounts }, firstStatusMs };
    },
    reset() {
      for (const key of Object.keys(renderCounts)) delete renderCounts[key];
      startedAt = null;
      firstStatusMs = null;
    },
  };
}

// ── DOM 렌더링 ────────────────────────────────────────────────────────────────

/**
 * 종료 상태 뷰를 초기화한다. root 는 index.html 이 마운트한 #planning-closure-status.
 * @param {Element} root
 * @returns {{
 *   render: (vm: { state: string, blockerCount?: number, actionHref?: string, actionLabel?: string }) => void,
 *   setLoading: () => void,
 *   getElements: () => { badge: Element|null, count: Element|null, action: Element|null },
 * }}
 */
export function createClosureStatusView(root) {
  if (!root) throw new Error('closure-status: root 요소가 필요합니다.');
  const badge = root.querySelector('.planning-closure__badge');
  const count = root.querySelector('#planning-closure-blocker-count');
  const action = root.querySelector('#planning-closure-action');

  /**
   * 조치 control 을 사용 가능/불가로 토글한다. (§5 recovery: 초기화/실패 후 재활성화)
   * @param {boolean} enabled
   */
  function setActionEnabled(enabled) {
    if (!action) return;
    if (enabled) {
      action.removeAttribute('aria-disabled');
      action.setAttribute('tabindex', '0');
    } else {
      action.setAttribute('aria-disabled', 'true');
      action.setAttribute('tabindex', '-1');
    }
  }

  function setLoading() {
    render({ state: 'loading', blockerCount: 0 });
  }

  /**
   * @param {{ state: string, blockerCount?: number, actionHref?: string, actionLabel?: string }} vm
   */
  function render(vm) {
    const state = CLOSURE_STATES.includes(vm.state) ? vm.state : 'error';
    const blockerCount = Math.max(0, Number(vm.blockerCount) || 0);

    root.setAttribute('data-state', state);
    root.setAttribute('aria-label', STATE_ARIA_LABEL[state] ?? STATE_ARIA_LABEL.error);

    if (badge) badge.textContent = badgeText(state, blockerCount);

    // blocker 수는 blocked 상태에서만 노출한다.
    if (count) {
      if (state === 'blocked' && blockerCount > 0) {
        count.textContent = String(blockerCount);
        count.removeAttribute('hidden');
      } else {
        count.textContent = '';
        count.setAttribute('hidden', '');
      }
    }

    if (action) {
      const isOperatorAction = state === 'needs-operator-action';
      const label = vm.actionLabel
        ? vm.actionLabel
        : isOperatorAction
          ? '운영자 조치 페이지 열기'
          : '종료 준비 상태 다시 확인';
      action.textContent = label;
      action.setAttribute('aria-label', label);

      if (isOperatorAction && vm.actionHref) {
        action.setAttribute('href', vm.actionHref);
        action.setAttribute('data-action-mode', 'navigate');
      } else {
        action.setAttribute('href', '#');
        action.setAttribute('data-action-mode', 'refresh');
      }
      // loading 중에는 비활성, 그 외에는 재활성화(§5 control 재사용).
      setActionEnabled(state !== 'loading');
    }
  }

  return {
    render,
    setLoading,
    getElements: () => ({ badge, count, action }),
  };
}

// ── 컨트롤러: 기존 Dossier GET 소비 + 상태 전이 + recovery ──────────────────────

/**
 * @param {{
 *   root: Element,
 *   fetchDossier: () => Promise<unknown>,
 *   kpi?: ReturnType<typeof createKpiRecorder>,
 * }} options
 */
export function createClosureController({ root, fetchDossier, kpi = createKpiRecorder() }) {
  if (typeof fetchDossier !== 'function') {
    throw new Error('closure-status: fetchDossier 함수가 필요합니다.');
  }
  const view = createClosureStatusView(root);
  let inFlight = false;

  async function refresh() {
    if (inFlight) return; // 중복 조회 방지
    inFlight = true;
    kpi.start();
    view.setLoading();
    kpi.recordRender('loading');
    try {
      const dossier = await fetchDossier();
      const { state, blockerCount } = deriveClosureState(dossier);
      const actionHref =
        dossier && typeof dossier === 'object'
          ? /** @type {Record<string, unknown>} */ (dossier).operatorActionUrl
          : undefined;
      view.render({
        state,
        blockerCount,
        actionHref: typeof actionHref === 'string' ? actionHref : undefined,
      });
      kpi.recordRender(state);
    } catch {
      // §4: fetch 실패(HTTP 오류/네트워크) -> error, 조치 control 재활성화(§5 recovery)
      view.render({ state: 'error', blockerCount: 0 });
      kpi.recordRender('error');
    } finally {
      inFlight = false;
    }
  }

  function bindAction() {
    const { action } = view.getElements();
    if (!action) return;
    const handler = (event) => {
      if (action.getAttribute('aria-disabled') === 'true') {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        return;
      }
      // refresh 모드에서만 재조회(navigate 모드는 anchor 기본 동작으로 이동).
      if (action.getAttribute('data-action-mode') !== 'navigate') {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        refresh();
      }
    };
    action.addEventListener('click', handler);
    // anchor 는 Enter 로 click 이 발화되지만, 안전하게 keydown Enter 도 처리한다.
    action.addEventListener('keydown', (event) => {
      if (event && event.key === 'Enter') handler(event);
    });
  }

  return {
    refresh,
    bindAction,
    getKpi: () => kpi.snapshot(),
    view,
  };
}

/**
 * 브라우저 부트스트랩: root(data-dossier-url) 를 읽어 컨트롤러를 만들고 최초 조회한다.
 * @param {Element} root
 * @returns {ReturnType<typeof createClosureController> | null}
 */
export function initClosureStatus(root) {
  if (!root) return null;
  const url = root.getAttribute('data-dossier-url');
  const fetchDossier = async () => {
    if (!url || typeof fetch !== 'function') {
      throw new Error('closure-status: Dossier URL 또는 fetch 를 사용할 수 없습니다.');
    }
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`closure-status: Dossier GET 실패 (${res.status})`);
    return res.json();
  };
  const controller = createClosureController({ root, fetchDossier });
  controller.bindAction();
  controller.refresh();
  return controller;
}

// 브라우저에서 직접 로드되면 자동 초기화한다. (node 환경에서는 document 가 없어 부작용 없음)
if (typeof document !== 'undefined' && document) {
  const boot = () => {
    const root = document.getElementById('planning-closure-status');
    if (root) initClosureStatus(root);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
