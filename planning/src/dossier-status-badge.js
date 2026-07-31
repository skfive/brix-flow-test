// BF-1342 · Planning Dossier 근거 상태 배지
// frozen ui-contract@v1 (docs/plans/planning-dossier-status-plan.md §2·§3) 을 재정의 없이 구현한다.
// 브라우저가 직접 import 하는 build-step 없는 ESM 런타임 파일이다.
//
// 불변식(additive·rollback):
//   - 기존 Planning Dossier GET 계약/데이터 구조를 변경하지 않고 파생 표시만 수행한다.
//   - 이 모듈을 로드하지 않거나 #dossier-status-badge 노드를 제거하면 기존 빈 상태로 되돌아간다.
//   - loading/error 이후 refresh() 로 상태·진행 표시가 초기값으로 복원되고 상세 링크가 재활성화된다.

/** 배지 상태 식별자 (frozen §2 상태 모델). */
export const STATUS = Object.freeze({
  LOADING: 'loading',
  SUFFICIENT: 'sufficient',
  INSUFFICIENT: 'insufficient',
  EMPTY: 'empty',
  ERROR: 'error',
});

/** 상태별 화면 텍스트 = 접근성 이름 (frozen §2 표). empty 는 의도적 숨김이라 텍스트 없음. */
export const STATUS_TEXT = Object.freeze({
  [STATUS.LOADING]: '근거 상태 확인 중',
  [STATUS.SUFFICIENT]: '근거 충족',
  [STATUS.INSUFFICIENT]: '근거 부족',
  [STATUS.ERROR]: '상태를 불러오지 못했습니다',
});

/** KPI 이벤트 이름. */
export const KPI_EVENT = Object.freeze({
  BADGE_SHOWN: 'dossier_status_badge_shown',
  DETAIL_NAVIGATE: 'dossier_status_detail_navigate',
});

/**
 * 기존 Planning Dossier 응답 데이터에서 배지 상태를 파생한다 (읽기 전용, 구조 변경 없음).
 * 데이터가 없으면 EMPTY 를 반환해 기존 빈 상태를 유지한다.
 * @param {unknown} dossier 기존 GET 응답 데이터 (형태 불명시 → 방어적으로 읽음)
 * @returns {string} STATUS 값 중 하나
 */
export function deriveStatus(dossier) {
  if (dossier == null || typeof dossier !== 'object') return STATUS.EMPTY;
  const data = /** @type {Record<string, unknown>} */ (dossier);
  const evidence = Array.isArray(data.evidence) ? data.evidence : null;

  // 명시적 충족 플래그가 있으면 그것이 권위.
  if (typeof data.evidenceSufficient === 'boolean') {
    return data.evidenceSufficient ? STATUS.SUFFICIENT : STATUS.INSUFFICIENT;
  }
  // 근거 배열이 있으면 항목 유무로 판단.
  if (evidence) {
    return evidence.length > 0 ? STATUS.INSUFFICIENT : STATUS.EMPTY;
  }
  // 판단 근거가 없으면 기존 빈 상태 유지.
  return STATUS.EMPTY;
}

/**
 * 배지 DOM refs 를 상태에 맞게 갱신한다. 실제 Element 와 테스트용 stub 모두에서 동작하도록
 * 표준 DOM 속성/메서드만 사용한다.
 * @param {{container:any,label:any,detailLink:any}} refs
 * @param {string} status STATUS 값
 * @param {{detailHref?:string}} [options]
 */
export function applyStatus(refs, status, options = {}) {
  const { container, label, detailLink } = refs;
  if (!container) return;

  container.setAttribute('data-state', status);

  if (status === STATUS.EMPTY) {
    // 배지 숨김 + 기존 빈 상태 유지, 상세 링크 비활성.
    container.hidden = true;
    container.removeAttribute('aria-label');
    container.setAttribute('aria-busy', 'false');
    if (label) label.textContent = '';
    deactivateDetailLink(detailLink);
    return;
  }

  const text = STATUS_TEXT[status] ?? '';
  container.hidden = false;
  // 색상과 무관하게 현재 상태 텍스트를 담은 aria-label (frozen §3.5).
  container.setAttribute('aria-label', text);
  container.setAttribute('aria-busy', status === STATUS.LOADING ? 'true' : 'false');
  if (label) label.textContent = text;

  if (status === STATUS.INSUFFICIENT) {
    activateDetailLink(detailLink, options.detailHref);
  } else {
    deactivateDetailLink(detailLink);
  }
}

/** 상세 보기 링크를 활성화(키보드 focus 가능)한다. */
function activateDetailLink(detailLink, detailHref) {
  if (!detailLink) return;
  detailLink.hidden = false;
  if (detailHref) detailLink.setAttribute('href', detailHref);
  detailLink.setAttribute('tabindex', '0');
  detailLink.removeAttribute('aria-disabled');
}

/** 상세 보기 링크를 숨기고 비활성화한다. */
function deactivateDetailLink(detailLink) {
  if (!detailLink) return;
  detailLink.hidden = true;
  detailLink.setAttribute('tabindex', '-1');
  detailLink.setAttribute('aria-disabled', 'true');
}

/** 기본 KPI reporter: DOM CustomEvent 로 관측 가능하게 노출하고 sendBeacon 이 있으면 전송. */
function defaultReportKpi(event, detail) {
  const payload = { event, ...detail };
  if (typeof document !== 'undefined' && typeof CustomEvent === 'function') {
    document.dispatchEvent(new CustomEvent('dossier-status-kpi', { detail: payload }));
  }
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      navigator.sendBeacon('/kpi/dossier-status', JSON.stringify(payload));
    } catch {
      /* KPI 전송 실패는 배지 표시를 막지 않는다. */
    }
  }
}

/** 기본 데이터 로더: 페이지가 이미 보유한 기존 Dossier 데이터를 읽는다 (신규 GET 추가 없음). */
function defaultLoadStatus() {
  if (typeof window !== 'undefined' && window.__PLANNING_DOSSIER__ !== undefined) {
    return window.__PLANNING_DOSSIER__;
  }
  return null;
}

/**
 * 배지 컨트롤러를 생성한다. #dossier-status-badge 노드가 없으면 null 을 반환해
 * rollback(노드 제거) 시 no-op 이 되도록 한다.
 * @param {{
 *   document?: any,
 *   root?: any,
 *   loadStatus?: () => unknown | Promise<unknown>,
 *   reportKpi?: (event:string, detail:object) => void,
 *   detailHref?: string,
 * }} [config]
 * @returns {{refresh:()=>Promise<string>, destroy:()=>void, refs:object}|null}
 */
export function createDossierStatusBadge(config = {}) {
  const doc = config.document ?? (typeof document !== 'undefined' ? document : null);
  if (!doc) throw new Error('createDossierStatusBadge: document 가 필요합니다');

  const root = config.root ?? doc.getElementById('dossier-status-badge');
  if (!root) return null; // rollback-safe: 노드 없으면 아무 것도 하지 않음.

  const refs = {
    container: root,
    label: doc.getElementById('dossier-status-label'),
    detailLink: doc.getElementById('dossier-status-detail-link'),
  };
  const loadStatus = config.loadStatus ?? defaultLoadStatus;
  const reportKpi = config.reportKpi ?? defaultReportKpi;
  const detailHref =
    config.detailHref ?? refs.detailLink?.getAttribute?.('href') ?? '#';

  let disposed = false;

  function onDetailClick() {
    reportKpi(KPI_EVENT.DETAIL_NAVIGATE, { status: STATUS.INSUFFICIENT });
  }
  refs.detailLink?.addEventListener?.('click', onDetailClick);

  async function refresh() {
    // 초기값 복원: 항상 loading 진행 표시부터 재진입.
    applyStatus(refs, STATUS.LOADING, { detailHref });
    let status;
    try {
      const dossier = await loadStatus();
      if (disposed) return STATUS.EMPTY;
      status = deriveStatus(dossier);
    } catch {
      if (disposed) return STATUS.ERROR;
      applyStatus(refs, STATUS.ERROR, { detailHref });
      return STATUS.ERROR;
    }
    applyStatus(refs, status, { detailHref });
    if (status !== STATUS.EMPTY) {
      reportKpi(KPI_EVENT.BADGE_SHOWN, { status });
    }
    return status;
  }

  function destroy() {
    disposed = true;
    refs.detailLink?.removeEventListener?.('click', onDetailClick);
  }

  return { refresh, destroy, refs };
}

// 브라우저 자동 초기화 (node/test import 시에는 document 가 없어 실행되지 않음).
if (typeof document !== 'undefined') {
  const start = () => {
    const badge = createDossierStatusBadge();
    if (badge) badge.refresh();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
