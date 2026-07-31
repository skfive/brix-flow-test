// 전달 상태 요약 패널 — 정적 fixture 기반 상태 렌더링 로직 (BF-1410)
// frozen UI 계약: docs/plans/delivery-health-BF-1398.md §6
// 브라우저에서 <script type="module">로 직접 실행되며, node 테스트에서는 순수 함수와
// createPanel(document/fetch 주입)을 통해 검증한다.

// 상태값 → 배지 라벨/클래스 매핑 (계약 §7)
export const STATUS_META = {
  progress: { label: '진행', badgeClass: 'status-badge--progress' },
  waiting: { label: '대기', badgeClass: 'status-badge--waiting' },
  action: { label: '조치 필요', badgeClass: 'status-badge--action' },
};

// 상태별 화면 텍스트 (계약 §6.5)
export const PANEL_TEXT = {
  loading: '상태를 불러오는 중',
  empty: '표시할 전달 상태가 없습니다',
  error: '상태를 불러오지 못했습니다',
  errorRetryHint: '다시 시도하려면 상태 새로고침을 눌러 주세요.',
};

// 상태값에 대응하는 배지 클래스 반환 (미지정 status는 null)
export function badgeClassFor(status) {
  const meta = STATUS_META[status];
  return meta ? meta.badgeClass : null;
}

// fixture 항목 정규화 — 배열이 아니거나 미지정 status는 파괴적 처리 없이 제외 (계약 §8)
export function normalizeItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => item && STATUS_META[item.status]);
}

// 패널 컨트롤러 생성. options로 document/fetch/fixtureUrl 주입 가능(테스트용).
export function createPanel(options = {}) {
  const doc = options.document
    ?? (typeof document !== 'undefined' ? document : undefined);
  if (!doc) {
    throw new Error('createPanel: document를 사용할 수 없습니다.');
  }

  const root = options.root ?? doc.getElementById('delivery-health-root');
  if (!root) {
    throw new Error('createPanel: #delivery-health-root를 찾을 수 없습니다.');
  }

  const list = options.list ?? doc.getElementById('status-summary-list');
  const statusEl = options.statusEl ?? doc.getElementById('delivery-health-status');
  const refreshBtn = options.refreshButton ?? doc.getElementById('status-refresh');

  const fetchImpl = options.fetch
    ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
  const fixtureUrl = options.fixtureUrl
    ?? new URL('./status-fixture.json', import.meta.url).href;

  // 재시도/취소 경합 방지용 요청 시퀀스 — 최신 요청 결과만 반영
  let requestSeq = 0;

  function setState(state) {
    root.dataset.state = state;
  }

  function setStatusText(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function clearList() {
    if (list) list.replaceChildren();
  }

  // 주 실행 control(#status-refresh) 재활성화/비활성화 (계약 §6.9 후조건)
  function setControlEnabled(enabled) {
    if (refreshBtn) refreshBtn.disabled = !enabled;
  }

  function renderLoading() {
    setState('loading');
    setStatusText(PANEL_TEXT.loading);
    clearList();
    setControlEnabled(false);
  }

  function renderReady(items) {
    setState('ready');
    setStatusText('');
    if (list) {
      const nodes = items.map((item) => {
        const meta = STATUS_META[item.status];
        const li = doc.createElement('li');
        li.className = 'status-summary-item';
        li.setAttribute('tabindex', '0');

        const badge = doc.createElement('span');
        badge.className = `status-badge ${meta.badgeClass}`;
        // 색상 외 텍스트 라벨을 함께 노출 (계약 §6.7 / AC-6)
        badge.textContent = meta.label;

        const title = doc.createElement('span');
        title.className = 'status-summary-item__title';
        title.textContent = item.title ?? '';

        const next = doc.createElement('span');
        next.className = 'status-summary-item__next';
        next.textContent = item.nextAction ?? '';

        li.append(badge, title, next);
        return li;
      });
      list.replaceChildren(...nodes);
    }
    setControlEnabled(true);
  }

  function renderEmpty() {
    setState('empty');
    setStatusText('');
    if (list) {
      const empty = doc.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = PANEL_TEXT.empty;
      list.replaceChildren(empty);
    }
    setControlEnabled(true);
  }

  function renderError() {
    setState('error');
    // "상태를 불러오지 못했습니다" 오류 안내 + 재시도 안내 (계약 §6.5 / AC-4)
    setStatusText(`${PANEL_TEXT.error} ${PANEL_TEXT.errorRetryHint}`);
    clearList();
    setControlEnabled(true);
  }

  // loading부터 다시 조회. 성공→ready/empty, 실패→error. 종료 시 control 재활성화.
  async function refresh() {
    const seq = ++requestSeq;
    renderLoading();
    try {
      if (!fetchImpl) {
        throw new Error('fetch를 사용할 수 없습니다.');
      }
      const response = await fetchImpl(fixtureUrl);
      if (!response || !response.ok) {
        throw new Error(`fixture 응답 오류: ${response ? response.status : 'no-response'}`);
      }
      const data = await response.json();
      if (seq !== requestSeq) return; // 더 최신 요청이 있으면 폐기
      const items = normalizeItems(Array.isArray(data) ? data : data && data.items);
      if (items.length === 0) {
        renderEmpty();
      } else {
        renderReady(items);
      }
    } catch (_err) {
      if (seq !== requestSeq) return;
      renderError();
    }
  }

  function handleRefreshClick() {
    refresh();
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', handleRefreshClick);
  }

  function destroy() {
    if (refreshBtn) {
      refreshBtn.removeEventListener('click', handleRefreshClick);
    }
  }

  return {
    refresh,
    destroy,
    getState: () => root.dataset.state,
  };
}

// 브라우저 자동 부트스트랩 (node import 시에는 실행되지 않음)
if (typeof document !== 'undefined') {
  const boot = () => {
    const root = document.getElementById('delivery-health-root');
    if (root) {
      createPanel().refresh();
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
