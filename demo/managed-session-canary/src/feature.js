// 관리형 세션 상태 카드 — 상태 카드 렌더링 + 상태 필터 (BF-1417)
// planning-contract@v1 / ui-contract@v1 (frozen) 을 그대로 구현한다.
// selector·token·상태 텍스트는 재정의하지 않으며, 인증·공용 레이아웃·DB 에 의존하지 않는다.
//
// 이 모듈은 브라우저가 <script type="module"> 로 직접 실행하는 runtime 파일이며,
// 동시에 node --test 가 import 할 수 있도록 순수 로직과 DOM 결선을 분리한다.
// (DOM 자동 init 은 document 존재 시에만 동작한다.)

// ── frozen 화면 텍스트 ──────────────────────────────────────────────
export const STATE_TEXT = Object.freeze({
  loading: '세션 상태를 불러오는 중…',
  empty: '해당 상태의 페르소나가 없습니다',
  error: '상태를 불러오지 못했습니다',
});

// 상태 색상 토큰과 무관하게 항상 노출되는 상태명(접근성 이름/화면 텍스트).
export const STATUS_LABEL = Object.freeze({
  active: '활성',
  idle: '유휴',
  error: '오류',
});

export const FILTER_ALL = 'all';

// 데모용 페르소나 상태 카드 데이터 ({ personaId, personaName, status }).
export const SAMPLE_PERSONAS = Object.freeze([
  { personaId: 'planner-01', personaName: '기획자-베타', status: 'active' },
  { personaId: 'developer-01', personaName: '개발자-알파', status: 'active' },
  { personaId: 'reviewer-01', personaName: '리뷰어-감마', status: 'idle' },
  { personaId: 'tester-01', personaName: '테스터-델타', status: 'idle' },
  { personaId: 'designer-01', personaName: '디자이너-엡실론', status: 'error' },
]);

// ── 순수 로직 ───────────────────────────────────────────────────────

// 선택 필터에 따라 카드 목록을 선별한다. 원본은 변경하지 않는다.
export function filterPersonas(personas, filter) {
  if (!filter || filter === FILTER_ALL) return [...personas];
  return personas.filter((p) => p.status === filter);
}

// 현재 로드된 카드의 상태별 합계 텍스트.
export function summarize(personas) {
  const counts = { active: 0, idle: 0, error: 0 };
  for (const p of personas) {
    if (counts[p.status] !== undefined) counts[p.status] += 1;
  }
  return `활성 ${counts.active} · 유휴 ${counts.idle} · 오류 ${counts.error}`;
}

export function statusModifierClass(status) {
  return `persona-card--${status}`;
}

export function initialState() {
  return { phase: 'idle', personas: [], filter: FILTER_ALL, error: null };
}

// 상태 전이 reducer. loading → loaded → (empty|error), error 재시도 → loading.
export function reduce(state, event) {
  switch (event.type) {
    case 'LOAD_START':
      // 초기화/재시도 후조건: 카드·필터·오류를 초기값으로 되돌린다.
      return { phase: 'loading', personas: [], filter: FILTER_ALL, error: null };
    case 'LOAD_SUCCESS':
      return {
        phase: 'loaded',
        personas: [...event.personas],
        filter: FILTER_ALL,
        error: null,
      };
    case 'LOAD_ERROR':
      return { ...state, phase: 'error', error: event.error ?? true };
    case 'SET_FILTER':
      return { ...state, filter: event.filter };
    case 'RESET_FILTER':
      return { ...state, filter: FILTER_ALL };
    default:
      return state;
  }
}

// 상태로부터 렌더에 필요한 뷰 모델을 파생한다(순수).
export function derive(state) {
  if (state.phase === 'loading') {
    return {
      view: 'loading',
      statusText: STATE_TEXT.loading,
      summaryText: '',
      cards: [],
      filterEnabled: false,
      restoreEnabled: false,
      retryVisible: false,
    };
  }
  if (state.phase === 'error') {
    return {
      view: 'error',
      statusText: STATE_TEXT.error,
      summaryText: '',
      cards: [],
      filterEnabled: false,
      restoreEnabled: false,
      retryVisible: true,
    };
  }
  if (state.phase === 'loaded') {
    const cards = filterPersonas(state.personas, state.filter);
    if (cards.length === 0) {
      return {
        view: 'empty',
        statusText: '',
        emptyText: STATE_TEXT.empty,
        summaryText: summarize(state.personas),
        cards: [],
        filterEnabled: true,
        restoreEnabled: true,
        retryVisible: false,
      };
    }
    return {
      view: 'loaded',
      statusText: '',
      summaryText: summarize(state.personas),
      cards,
      filterEnabled: true,
      restoreEnabled: false,
      retryVisible: false,
    };
  }
  return {
    view: 'idle',
    statusText: '',
    summaryText: '',
    cards: [],
    filterEnabled: false,
    restoreEnabled: false,
    retryVisible: false,
  };
}

// 기본 데이터 로더(데모). 주입 가능하도록 분리.
export function defaultLoader() {
  return Promise.resolve(SAMPLE_PERSONAS.map((p) => ({ ...p })));
}

// ── DOM 컨트롤러 ────────────────────────────────────────────────────
// root 하위의 frozen selector 를 결선한다. 브라우저에서만 호출된다.
export function createCanary(root, options = {}) {
  const doc = root.ownerDocument;
  const loader = options.loader || defaultLoader;

  const filterEl = root.querySelector('#status-filter');
  const listEl = root.querySelector('#persona-card-list');
  const summaryEl = root.querySelector('#status-summary');
  const statusEl = root.querySelector('[data-role="status-text"]');
  const retryEl = root.querySelector('[data-role="retry"]');
  const restoreEl = root.querySelector('[data-role="restore"]');

  let state = initialState();

  function setState(next) {
    state = next;
    render();
  }

  function render() {
    const v = derive(state);

    // 상태/요약 텍스트
    if (statusEl) statusEl.textContent = v.statusText || (v.view === 'empty' ? v.emptyText : '');
    if (summaryEl) summaryEl.textContent = v.summaryText;

    // 필터 control 활성/비활성 (loading·error 시 비활성 → 경합 방지)
    if (filterEl) filterEl.disabled = !v.filterEnabled;

    // 다시 시도 / 전체 보기 control 노출
    if (retryEl) retryEl.hidden = !v.retryVisible;
    if (restoreEl) restoreEl.hidden = !v.restoreEnabled;

    // 카드 목록 렌더
    if (listEl) {
      listEl.textContent = '';
      for (const card of v.cards) {
        listEl.appendChild(renderCard(card));
      }
    }
  }

  function renderCard(card) {
    const el = doc.createElement('article');
    el.className = `persona-card ${statusModifierClass(card.status)}`;
    el.dataset.personaId = card.personaId;

    const name = doc.createElement('h3');
    name.className = 'persona-card__name';
    name.textContent = card.personaName;

    // 색상 외에 상태명 텍스트를 함께 노출(접근성).
    const status = doc.createElement('p');
    status.className = 'persona-card__status';
    const label = STATUS_LABEL[card.status] || card.status;
    status.textContent = label;
    status.setAttribute('aria-label', `상태: ${label}`);

    el.append(name, status);
    return el;
  }

  async function load() {
    setState(reduce(state, { type: 'LOAD_START' }));
    try {
      const personas = await loader();
      setState(reduce(state, { type: 'LOAD_SUCCESS', personas }));
    } catch (error) {
      setState(reduce(state, { type: 'LOAD_ERROR', error }));
    }
  }

  // 이벤트 결선
  if (filterEl) {
    filterEl.addEventListener('change', () => {
      setState(reduce(state, { type: 'SET_FILTER', filter: filterEl.value }));
    });
  }
  if (restoreEl) {
    restoreEl.addEventListener('click', () => {
      if (filterEl) filterEl.value = FILTER_ALL;
      setState(reduce(state, { type: 'RESET_FILTER' }));
    });
  }
  if (retryEl) {
    retryEl.addEventListener('click', () => {
      load();
    });
  }

  render();
  return { load, get state() { return state; }, render };
}

// ── 브라우저 자동 init (node import 시에는 실행되지 않음) ────────────
if (typeof document !== 'undefined') {
  const start = () => {
    const root = document.getElementById('session-canary-root');
    if (root) createCanary(root).load();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
