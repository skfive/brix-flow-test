// 전달 상태 보드 — 상태 모델 렌더링과 상태 전이 (ESM, 브라우저 직접 import)
//
// frozen ui-contract@v1 준수:
// - DOM ID: board-root, board-revision, board-role-list, board-refresh
// - CSS class: board, board__role, board__status, board__refresh
// - 화면 상태(state): idle, loading, ready, error
// - 역할 상태 라벨(텍스트 + 접근성 이름): done→완료, active→진행 중, pending→대기
// - 초기화/실패 후조건: 상태·진행 표시를 초기값으로 되돌리고 board-refresh를 재활성화한다.

// 역할별 상태 모델 (정적) — 색상만이 아니라 텍스트 라벨을 함께 노출한다.
export const ROLE_MODEL = [
  { id: 'planner', name: '기획', status: 'done' },
  { id: 'designer', name: '디자인', status: 'done' },
  { id: 'developer', name: '개발', status: 'active' },
  { id: 'reviewer', name: '리뷰', status: 'pending' },
  { id: 'tester', name: '테스트', status: 'pending' },
];

// 상태 토큰 → 화면 텍스트/접근성 라벨
export const STATUS_LABELS = {
  done: '완료',
  active: '진행 중',
  pending: '대기',
};

// 현재 리비전 표시 값
export const REVISION = 'rev-1';

// 보드 화면(데이터) 상태
export const BOARD_STATES = ['idle', 'loading', 'ready', 'error'];

const REVISION_PLACEHOLDER = '리비전: —';

// 기본 로더: 정적 상태 모델을 비동기로 반환한다(백엔드 없음).
function defaultLoader() {
  return Promise.resolve({ revision: REVISION, roles: ROLE_MODEL });
}

/**
 * 보드를 초기화하고 새로고침 동작을 배선한다.
 *
 * @param {Document} documentRef 대상 document (테스트에서 주입 가능)
 * @param {{ loader?: () => Promise<{revision: string, roles: Array}> }} [options]
 * @returns {{ refresh: () => Promise<void>, reset: () => void, root: Element } | null}
 */
export function initBoard(documentRef = document, options = {}) {
  const loader = options.loader ?? defaultLoader;

  const root = documentRef.getElementById('board-root');
  if (!root) return null;

  const revisionEl = documentRef.getElementById('board-revision');
  const roleListEl = documentRef.getElementById('board-role-list');
  const refreshEl = documentRef.getElementById('board-refresh');
  const messageEl = root.querySelector('[data-role="status-message"]');

  function setState(state) {
    root.dataset.state = state;
  }

  function showMessage(text) {
    if (!messageEl) return;
    if (text) {
      messageEl.textContent = text;
      messageEl.hidden = false;
    } else {
      messageEl.textContent = '';
      messageEl.hidden = true;
    }
  }

  function clearProgress() {
    roleListEl.replaceChildren();
    revisionEl.textContent = REVISION_PLACEHOLDER;
  }

  function renderRoles(roles) {
    roleListEl.replaceChildren();
    for (const role of roles) {
      const label = STATUS_LABELS[role.status] ?? role.status;

      const item = documentRef.createElement('li');
      item.className = 'board__role';
      item.dataset.status = role.status;

      const nameEl = documentRef.createElement('span');
      nameEl.className = 'board__role-name';
      nameEl.textContent = role.name;

      const statusEl = documentRef.createElement('span');
      statusEl.className = 'board__status';
      statusEl.dataset.status = role.status;
      // 색상만으로 구분하지 않도록 텍스트 라벨을 화면 + 접근성 이름으로 노출
      statusEl.textContent = label;
      statusEl.setAttribute('aria-label', `${role.name}: ${label}`);

      item.append(nameEl, statusEl);
      roleListEl.append(item);
    }
  }

  // 초기값(idle)으로 되돌린다: 상태·진행 표시 초기화 + control 재활성화
  function reset() {
    clearProgress();
    showMessage('');
    refreshEl.disabled = false;
    setState('idle');
  }

  async function refresh() {
    setState('loading');
    refreshEl.disabled = true;
    showMessage('상태를 불러오는 중…');

    try {
      const data = await loader();
      renderRoles(data.roles);
      revisionEl.textContent = `리비전: ${data.revision}`;
      showMessage('');
      setState('ready');
    } catch (err) {
      // 실패 후조건: 진행 표시를 초기값으로 되돌리고 재시도 안내
      clearProgress();
      showMessage('상태를 불러오지 못했습니다. 다시 시도해 주세요.');
      setState('error');
    } finally {
      // 초기화/완료/실패 뒤 주 실행 control을 다시 사용할 수 있게 한다
      refreshEl.disabled = false;
    }
  }

  refreshEl.addEventListener('click', refresh);
  reset();

  return { refresh, reset, root };
}

// 브라우저 자동 초기화 (테스트 환경에서는 중복 초기화되지 않도록 가드)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const start = () => {
    const root = document.getElementById('board-root');
    if (root && root.dataset.initialized !== 'true') {
      root.dataset.initialized = 'true';
      initBoard(document);
    }
  };
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
