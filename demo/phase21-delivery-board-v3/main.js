// 전달 상태 보드 v3 — 브라우저에서 직접 실행되는 vanilla ESM 컨트롤러.
// frozen ui-contract@v1(sha256:359cf76…)의 selector·상태 모델·design token을 재정의 없이 소비한다.

// 보드 상태 모델 (idle|loading|loaded|empty|error) — 고정, 새 상태 추가 금지
export const STATES = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  LOADED: 'loaded',
  EMPTY: 'empty',
  ERROR: 'error',
});

// board-status 화면 텍스트 = 접근성 이름(role=status). 색상만이 아닌 상태명을 텍스트로 노출.
export const STATE_LABELS = Object.freeze({
  idle: '대기 중 (idle)',
  loading: '불러오는 중… (loading)',
  loaded: '불러옴 (loaded)',
  empty: '표시할 역할이 없습니다 (empty)',
  error: '불러오기 실패 (error)',
});

// 역할별 전달 상태 배지 라벨 — 색상(design token) 외 화면 텍스트 라벨
export const STATUS_LABELS = Object.freeze({
  verified: '검증됨',
  pending: '대기',
  failed: '실패',
});

export function statusLabel(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_LABELS, status)
    ? STATUS_LABELS[status]
    : String(status);
}

// 기본 데이터 소스(delivery-status-source 경계). 브라우저 자동 실행 시 사용할 샘플 조회.
export function defaultFetchStatus() {
  return Promise.resolve({
    revision: 'v3-2026.07',
    roles: [
      { role: 'planner', status: 'verified' },
      { role: 'designer', status: 'verified' },
      { role: 'developer', status: 'pending' },
      { role: 'reviewer', status: 'pending' },
      { role: 'tester', status: 'failed' },
    ],
  });
}

// delivery-board-controller — 상태 전이·이벤트 바인딩. document/fetchStatus 주입으로 단위 테스트 가능.
export function createController({ document: doc, fetchStatus = defaultFetchStatus } = {}) {
  if (!doc) throw new Error('createController: document 가 필요합니다');

  const root = doc.getElementById('delivery-board-root');
  const refreshBtn = doc.getElementById('board-refresh');
  const statusEl = doc.getElementById('board-status');
  const listEl = doc.getElementById('board-role-list');
  const revisionEl = doc.getElementById('board-revision');
  if (!root || !refreshBtn || !statusEl || !listEl || !revisionEl) {
    throw new Error('createController: frozen selector 를 찾을 수 없습니다');
  }

  let state = STATES.IDLE;
  let requestToken = 0;
  let lastSnapshot = null; // 마지막 loaded 스냅샷 { revision, roles }

  function applyState(next) {
    state = next;
    root.setAttribute('data-state', next);
    statusEl.textContent = STATE_LABELS[next];
  }

  function setBusy(isBusy) {
    // 진행 표시: 주 실행 control 비활성 + aria-busy (loading 시각 표시는 [data-state=loading] CSS)
    refreshBtn.disabled = isBusy;
    statusEl.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }

  function renderRoles(roles) {
    listEl.replaceChildren();
    for (const item of roles) {
      const li = doc.createElement('li');
      li.className = 'delivery-board__role';

      const name = doc.createElement('span');
      name.className = 'delivery-board__role-name';
      name.textContent = item.role;

      const badge = doc.createElement('span');
      badge.className = 'delivery-board__badge';
      badge.setAttribute('data-status', item.status);
      badge.textContent = statusLabel(item.status); // 색상 외 텍스트 라벨

      li.appendChild(name);
      li.appendChild(badge);
      listEl.appendChild(li);
    }
  }

  function renderView({ revision, roles }) {
    revisionEl.textContent = revision != null && String(revision).length > 0 ? String(revision) : '—';
    if (roles.length === 0) {
      listEl.replaceChildren();
      applyState(STATES.EMPTY);
    } else {
      renderRoles(roles);
      applyState(STATES.LOADED);
    }
  }

  function restore() {
    // 취소 시: 직전 loaded 스냅샷 복원, 없으면 초기값(idle)으로 복귀
    if (lastSnapshot) {
      renderView(lastSnapshot);
    } else {
      listEl.replaceChildren();
      revisionEl.textContent = '—';
      applyState(STATES.IDLE);
    }
  }

  async function refresh() {
    const token = ++requestToken;
    applyState(STATES.LOADING);
    setBusy(true);
    try {
      const data = await fetchStatus();
      if (token !== requestToken) return; // 취소/중첩 요청 — stale 응답 무시
      const roles = Array.isArray(data && data.roles) ? data.roles : [];
      lastSnapshot = { revision: data ? data.revision : '', roles: roles.slice() };
      renderView({ revision: lastSnapshot.revision, roles });
    } catch (_err) {
      if (token !== requestToken) return; // stale 실패 무시
      applyState(STATES.ERROR); // 실패: 상태명 텍스트·접근성 이름 노출, board-refresh로 재시도 가능
    } finally {
      if (token === requestToken) setBusy(false); // 종료(성공/실패) 후 재활성화
    }
  }

  function cancel() {
    requestToken++; // 진행 중 응답을 stale 처리
    restore(); // 직전 loaded(또는 idle) 복원
    setBusy(false); // 진행 표시 해제 + board-refresh 재활성화
  }

  function getState() {
    return state;
  }

  refreshBtn.addEventListener('click', () => {
    refresh();
  });

  // 초기 상태 idle, board-refresh 활성
  applyState(STATES.IDLE);
  setBusy(false);

  return {
    refresh,
    cancel,
    getState,
    get lastSnapshot() {
      return lastSnapshot;
    },
  };
}

// 브라우저 자동 초기화 (node --test import 시 document 미정의 → 실행되지 않음)
if (typeof document !== 'undefined' && document.getElementById('delivery-board-root')) {
  const controller = createController({ document });
  controller.refresh();
}
