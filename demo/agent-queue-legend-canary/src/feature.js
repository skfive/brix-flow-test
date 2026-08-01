// 에이전트 큐 상태 범례 — 조회 상태 전이 로직 (frozen UI contract §3, docs/plans/implementation-plan.md)

export const QUEUE_LEGEND_STATE = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
});

export const QUEUE_LEGEND_STATE_TEXT = Object.freeze({
  [QUEUE_LEGEND_STATE.IDLE]: '새로고침을 눌러 상태를 불러오세요',
  [QUEUE_LEGEND_STATE.LOADING]: '불러오는 중…',
  [QUEUE_LEGEND_STATE.ERROR]: '상태를 불러오지 못했습니다',
});

export const QUEUE_STATUS_ITEMS = Object.freeze([
  Object.freeze({ key: 'waiting', token: '--color-status-waiting', label: '대기 중' }),
  Object.freeze({ key: 'running', token: '--color-status-running', label: '실행 중' }),
  Object.freeze({ key: 'action-needed', token: '--color-status-action', label: '조치 필요' }),
]);

function defaultFetchStatus() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(QUEUE_STATUS_ITEMS), 200);
  });
}

function createItemElement(doc, item) {
  const li = doc.createElement('li');
  li.className = 'legend__item';

  const dot = doc.createElement('span');
  dot.className = 'legend__item-dot';
  dot.setAttribute('aria-hidden', 'true');
  dot.style.backgroundColor = `var(${item.token})`;

  const label = doc.createElement('span');
  label.className = 'legend__item-label';
  label.textContent = item.label;

  li.appendChild(dot);
  li.appendChild(label);
  return li;
}

// root: `#queue-legend-root` 엘리먼트. options.fetchStatus: 조회 함수(Promise 반환, 테스트에서 주입 가능).
// options.documentRef: 엘리먼트 생성에 사용할 document(기본값: 전역 document).
export function mountQueueLegend(root, options = {}) {
  const fetchStatus = options.fetchStatus || defaultFetchStatus;
  const doc = options.documentRef || (typeof document !== 'undefined' ? document : null);

  const refreshButton = root.querySelector('#queue-legend-refresh');
  const statusText = root.querySelector('#queue-legend-status');
  const itemsList = root.querySelector('#queue-legend-items');

  let state = QUEUE_LEGEND_STATE.IDLE;

  function render() {
    if (statusText) {
      statusText.textContent = state === QUEUE_LEGEND_STATE.LOADED
        ? ''
        : QUEUE_LEGEND_STATE_TEXT[state];
    }

    if (itemsList) {
      itemsList.textContent = '';
      if (state === QUEUE_LEGEND_STATE.LOADED) {
        QUEUE_STATUS_ITEMS.forEach((item) => {
          itemsList.appendChild(createItemElement(doc, item));
        });
      }
    }

    if (refreshButton) {
      refreshButton.disabled = state === QUEUE_LEGEND_STATE.LOADING;
    }
  }

  function setState(next) {
    state = next;
    render();
  }

  async function refresh() {
    setState(QUEUE_LEGEND_STATE.LOADING);
    try {
      await fetchStatus();
      setState(QUEUE_LEGEND_STATE.LOADED);
    } catch (error) {
      setState(QUEUE_LEGEND_STATE.ERROR);
    }
    return state;
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      refresh();
    });
  }

  render();

  return {
    getState: () => state,
    refresh,
  };
}
