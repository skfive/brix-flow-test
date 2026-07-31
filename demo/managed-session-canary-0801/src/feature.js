// 관리형 세션 상태 카드 캔버스 — 정적 fixture 기반 상태 렌더링 로직 (BF-1423)
// frozen UI 계약: docs/plans/managed-session-canary-BF-1421.md §3~7
// selector(session-status-root / persona-card-list / session-refresh)와
// 상태 텍스트·디자인 토큰은 재정의하지 않는다.
//
// 브라우저에서 <script type="module">로 직접 실행되며, node 테스트에서는
// document/fetch/root를 주입해 순수 로직과 DOM 컨트롤러를 함께 검증할 수 있다.

// ── frozen 화면 텍스트 (계약 §4) ────────────────────────────────────
export const STATE_TEXT = Object.freeze({
  loading: '세션 데이터를 불러오는 중…',
  empty: '표시할 세션이 없습니다',
  error: '데이터를 불러오지 못했습니다. 다시 시도하세요',
});

// 상태값 → 표시 라벨(색상 외에 항상 노출되는 상태명).
export const STATUS_LABEL = Object.freeze({
  pass: '정상',
  pending: '대기',
  fail: '오류',
});

// ── 순수 로직 ───────────────────────────────────────────────────────

// fixture 응답을 정규화한다 — 배열이 아니거나 알 수 없는 status는 제외.
export function normalizeItems(raw) {
  const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.items) ? raw.items : [];
  return list.filter((item) => item && STATUS_LABEL[item.status]);
}

export function statusLabelFor(status) {
  return STATUS_LABEL[status] || status;
}

// ── DOM 컨트롤러 ────────────────────────────────────────────────────
// options로 document/fetch/root/fixtureUrl 주입 가능(테스트용).
export function createSessionCanary(options = {}) {
  const doc = options.document
    ?? (typeof document !== 'undefined' ? document : undefined);
  if (!doc) {
    throw new Error('createSessionCanary: document를 사용할 수 없습니다.');
  }

  const root = options.root ?? doc.getElementById('session-status-root');
  if (!root) {
    throw new Error('createSessionCanary: #session-status-root를 찾을 수 없습니다.');
  }

  const listEl = options.list ?? doc.getElementById('persona-card-list');
  const refreshBtn = options.refreshButton ?? doc.getElementById('session-refresh');
  const messageEl = options.messageEl ?? root.querySelector('[data-role="status-message"]');

  const fetchImpl = options.fetch
    ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
  const fixtureUrl = options.fixtureUrl
    ?? new URL('./session-fixture.json', import.meta.url).href;

  // 재시도 경합 방지 — 최신 요청 결과만 반영.
  let requestSeq = 0;

  function setStatusMessage(text) {
    if (messageEl) messageEl.textContent = text;
  }

  function setControlEnabled(enabled) {
    // 초기화·취소·실패 이후에도 session-refresh는 항상 재사용 가능해야 한다(계약 §4.1).
    if (refreshBtn) refreshBtn.disabled = !enabled;
  }

  function renderLoading() {
    root.dataset.state = 'loading';
    setStatusMessage(STATE_TEXT.loading);
    if (listEl) listEl.replaceChildren();
    setControlEnabled(false);
  }

  function renderReady(items) {
    root.dataset.state = 'ready';
    setStatusMessage('');
    if (listEl) {
      const cards = items.map((item) => {
        const li = doc.createElement('li');
        li.className = `session-card session-card--${item.status}`;
        li.dataset.personaId = item.personaId;

        const persona = doc.createElement('span');
        persona.className = 'session-card__persona';
        persona.textContent = item.personaName;

        const label = statusLabelFor(item.status);
        const status = doc.createElement('span');
        status.className = `session-card__status session-card__status--${item.status}`;
        status.textContent = label;
        status.setAttribute('aria-label', `상태: ${label}`);

        li.append(persona, status);
        return li;
      });
      listEl.replaceChildren(...cards);
    }
    setControlEnabled(true);
  }

  function renderEmpty() {
    root.dataset.state = 'empty';
    setStatusMessage(STATE_TEXT.empty);
    if (listEl) listEl.replaceChildren();
    setControlEnabled(true);
  }

  function renderError() {
    root.dataset.state = 'error';
    setStatusMessage(STATE_TEXT.error);
    if (listEl) listEl.replaceChildren();
    setControlEnabled(true);
  }

  // loading부터 다시 조회. 성공 시 ready/empty, 실패 시 error로 전이하며
  // 완료 시점에는 항상 session-refresh를 재활성화한다(계약 §4.1).
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
      const items = normalizeItems(data);
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

// ── 브라우저 자동 init (node import 시에는 실행되지 않음) ────────────
if (typeof document !== 'undefined') {
  const boot = () => {
    const root = document.getElementById('session-status-root');
    if (root) {
      createSessionCanary().refresh();
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
