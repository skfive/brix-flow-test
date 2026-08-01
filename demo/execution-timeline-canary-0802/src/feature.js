// execution-timeline-canary-0802 — 읽기 전용 타임라인 카드
// frozen ui-contract@v1 (docs/plans/execution-timeline-canary-plan.md §3, §4) 구현.

export const STATUS_LABELS = Object.freeze({
  done: '완료',
  'in-progress': '진행',
  waiting: '대기',
});

const COMPONENT_STATUS_TEXT = Object.freeze({
  loading: '타임라인을 불러오는 중입니다…',
  empty: '표시할 타임라인 단계가 없습니다.',
  error: '타임라인을 불러오지 못했습니다. 새로고침을 눌러 다시 시도하세요.',
});

export function getStatusLabel(status) {
  const label = STATUS_LABELS[status];
  if (!label) {
    throw new Error(`알 수 없는 status 값: ${status}`);
  }
  return label;
}

export function getComponentStatusText(componentState) {
  return COMPONENT_STATUS_TEXT[componentState] ?? '';
}

export function validateFixture(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.steps)) {
    throw new Error('fixture 형식이 올바르지 않습니다: steps 배열이 필요합니다.');
  }
  data.steps.forEach((step, index) => {
    if (!step || typeof step.id !== 'string' || typeof step.label !== 'string') {
      throw new Error(`fixture steps[${index}] 형식이 올바르지 않습니다.`);
    }
    if (!STATUS_LABELS[step.status]) {
      throw new Error(`fixture steps[${index}].status 값이 올바르지 않습니다: ${step.status}`);
    }
    if (step.timestamp !== null && typeof step.timestamp !== 'string') {
      throw new Error(`fixture steps[${index}].timestamp 형식이 올바르지 않습니다.`);
    }
  });
  return data;
}

export function deriveComponentState(fixture) {
  return fixture.steps.length === 0 ? 'empty' : 'ready';
}

export const DEFAULT_FIXTURE = Object.freeze({
  steps: [
    { id: 'step-plan', label: '계획 수립', status: 'done', timestamp: '2026-08-01T00:00:00Z' },
    { id: 'step-design', label: '설계 검토', status: 'done', timestamp: '2026-08-01T01:30:00Z' },
    { id: 'step-develop', label: '기능 구현', status: 'in-progress', timestamp: '2026-08-01T02:00:00Z' },
    { id: 'step-review', label: '코드 리뷰', status: 'waiting', timestamp: null },
    { id: 'step-release', label: '배포', status: 'waiting', timestamp: null },
  ],
  updatedAt: '2026-08-01T02:00:00Z',
});

export function createFixtureLoader(fixture = DEFAULT_FIXTURE) {
  return function loadFixture() {
    return Promise.resolve().then(() => validateFixture(fixture));
  };
}

// loading -> (ready | empty | error), timeline-refresh 재활성화 불변식(§3.2)을 보장하는 상태 머신.
// 생성 시 최초 로드를 자동 트리거한다(AC-1: 최초 진입 -> loading).
export function createTimelineController({ fetchFixture, onChange } = {}) {
  const fetcher = typeof fetchFixture === 'function' ? fetchFixture : createFixtureLoader();
  let state = { status: 'idle', fixture: null, error: null, controlEnabled: false };
  let requestToken = 0;
  let inFlight = null;

  function emit() {
    if (typeof onChange === 'function') onChange(state);
  }

  function setState(patch) {
    state = { ...state, ...patch };
    emit();
  }

  function getState() {
    return state;
  }

  function load() {
    if (inFlight) {
      return inFlight;
    }
    const token = ++requestToken;
    setState({ status: 'loading', error: null, controlEnabled: false });
    inFlight = Promise.resolve()
      .then(fetcher)
      .then((fixture) => {
        if (token === requestToken) {
          const nextStatus = deriveComponentState(fixture);
          setState({ status: nextStatus, fixture, error: null, controlEnabled: true });
        }
        return state;
      })
      .catch((error) => {
        if (token === requestToken) {
          setState({ status: 'error', fixture: null, error, controlEnabled: true });
        }
        return state;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  }

  function refresh() {
    return load();
  }

  load();

  return { getState, load, refresh };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function renderCards(root, fixture) {
  const cardsHtml = fixture.steps
    .map((step) => {
      const label = getStatusLabel(step.status);
      return `
        <li class="timeline__card" data-status="${step.status}">
          <span class="timeline__card-label">${escapeHtml(step.label)}</span>
          <span class="timeline__card-status">${label}</span>
        </li>
      `;
    })
    .join('');
  root.innerHTML = `<ul class="timeline__list">${cardsHtml}</ul>`;
}

function bootstrap() {
  if (typeof document === 'undefined') return;

  const root = document.getElementById('timeline-root');
  const statusEl = document.getElementById('timeline-status');
  const refreshButton = document.getElementById('timeline-refresh');
  if (!root || !statusEl || !refreshButton) return;

  function render(state) {
    root.classList.remove('timeline--loading', 'timeline--ready', 'timeline--empty', 'timeline--error');
    root.classList.add(`timeline--${state.status}`);
    refreshButton.disabled = !state.controlEnabled;

    if (state.status === 'ready') {
      statusEl.textContent = '';
      renderCards(root, state.fixture);
    } else {
      const list = root.querySelector('.timeline__list');
      if (list) list.remove();
      statusEl.textContent = getComponentStatusText(state.status);
    }
  }

  const controller = createTimelineController({ onChange: render });

  refreshButton.addEventListener('click', () => {
    controller.refresh();
  });
}

bootstrap();
