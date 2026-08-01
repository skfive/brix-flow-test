export const STATUS = Object.freeze({
  IDLE: 'idle',
  STREAMING: 'streaming',
  COMPLETE: 'complete',
  ERROR: 'error',
});

export const STATUS_TEXT = Object.freeze({
  [STATUS.IDLE]: '대기 중',
  [STATUS.STREAMING]: '실행 중 — tool 활동 수신',
  [STATUS.COMPLETE]: '완료',
  [STATUS.ERROR]: '실패 — 다시 시도',
});

const SIMULATED_ACTIVITIES = Object.freeze([
  Object.freeze({ tool: 'Read', detail: 'config.json 읽는 중' }),
  Object.freeze({ tool: 'Grep', detail: '패턴 검색 중' }),
  Object.freeze({ tool: 'Bash', detail: '빌드 스크립트 실행 중' }),
  Object.freeze({ tool: 'Edit', detail: '변경 사항 적용 중' }),
]);

export function createInitialState() {
  return { status: STATUS.IDLE, progress: 0, activities: [] };
}

export function startStreaming() {
  return { status: STATUS.STREAMING, progress: 0, activities: [] };
}

export function clampProgress(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function receiveActivity(state, activity, progress) {
  if (state.status !== STATUS.STREAMING) return state;
  return {
    status: STATUS.STREAMING,
    progress: clampProgress(progress),
    activities: [...state.activities, activity],
  };
}

export function completeStreaming(state) {
  if (state.status !== STATUS.STREAMING) return state;
  return { ...state, status: STATUS.COMPLETE, progress: 100 };
}

export function failStreaming(state) {
  if (state.status !== STATUS.STREAMING) return state;
  return { ...state, status: STATUS.ERROR };
}

export function retry() {
  return createInitialState();
}

export function isRetryActive(state) {
  return state.status === STATUS.ERROR;
}

export function getStatusText(state) {
  return STATUS_TEXT[state.status];
}

function isStartActive(state) {
  return state.status === STATUS.IDLE || state.status === STATUS.COMPLETE;
}

function mount(doc) {
  const root = doc.getElementById('activity-stream-root');
  const list = doc.getElementById('activity-list');
  const progressEl = doc.getElementById('token-progress');
  const progressBar = progressEl ? progressEl.querySelector('.token-progress__bar') : null;
  const statusEl = doc.getElementById('activity-status');
  const startBtn = doc.getElementById('activity-start');
  const retryBtn = doc.getElementById('activity-retry');

  if (!root || !list || !progressEl || !statusEl || !startBtn || !retryBtn) return null;

  let state = createInitialState();
  let attempt = 0;
  let timers = [];
  let renderedCount = 0;

  function clearTimers() {
    timers.forEach((id) => clearTimeout(id));
    timers = [];
  }

  function schedule(fn, delay) {
    const id = setTimeout(fn, delay);
    timers.push(id);
    return id;
  }

  function render() {
    statusEl.textContent = getStatusText(state);
    statusEl.classList.toggle('activity-status--error', state.status === STATUS.ERROR);

    progressEl.setAttribute('aria-valuenow', String(state.progress));
    if (progressBar) progressBar.style.width = `${state.progress}%`;

    if (state.activities.length < renderedCount) {
      list.innerHTML = '';
      renderedCount = 0;
    }
    for (let index = renderedCount; index < state.activities.length; index += 1) {
      const activity = state.activities[index];
      const item = doc.createElement('li');
      item.className = 'activity-stream__item';
      item.textContent = `${activity.tool} — ${activity.detail}`;
      list.appendChild(item);
    }
    renderedCount = state.activities.length;

    startBtn.disabled = !isStartActive(state);
    retryBtn.disabled = !isRetryActive(state);
  }

  function runStream() {
    clearTimers();
    state = startStreaming();
    render();

    const failAtStep = attempt === 0 ? 2 : Infinity;

    SIMULATED_ACTIVITIES.forEach((activity, index) => {
      schedule(() => {
        if (index === failAtStep) {
          state = failStreaming(state);
          render();
          clearTimers();
          return;
        }

        state = receiveActivity(state, activity, ((index + 1) / SIMULATED_ACTIVITIES.length) * 100);
        if (index === SIMULATED_ACTIVITIES.length - 1) {
          state = completeStreaming(state);
        }
        render();
      }, (index + 1) * 500);
    });
  }

  startBtn.addEventListener('click', () => {
    if (!isStartActive(state)) return;
    clearTimers();
    attempt = 0;
    runStream();
  });

  retryBtn.addEventListener('click', () => {
    if (!isRetryActive(state)) return;
    clearTimers();
    state = retry();
    attempt += 1;
    render();
    schedule(runStream, 300);
  });

  render();

  return { render, runStream };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mount(document));
  } else {
    mount(document);
  }
}
