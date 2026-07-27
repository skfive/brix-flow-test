// 우선순위 매트릭스 SPA (아이젠하워 4분면) — BF-1214
// ui-contract@v1 준수: localStorage 'brix.priority-matrix.v1', task 배열 JSON 직렬화.
// 순수 로직은 export 하여 node --test 로 검증하고, DOM 부트스트랩은 브라우저에서만 실행한다.

export const STORAGE_KEY = 'brix.priority-matrix.v1';

/** 4분면 정의: (urgency, importance) 조합으로 결정 */
export const QUADRANTS = [
  { key: 'high-high', urgency: 'high', importance: 'high', title: '지금 하기', subtitle: '긴급 · 중요' },
  { key: 'low-high', urgency: 'low', importance: 'high', title: '계획하기', subtitle: '비긴급 · 중요' },
  { key: 'high-low', urgency: 'high', importance: 'low', title: '위임하기', subtitle: '긴급 · 비중요' },
  { key: 'low-low', urgency: 'low', importance: 'low', title: '정리하기', subtitle: '비긴급 · 비중요' },
];

const LEVELS = new Set(['high', 'low']);
const FILTERS = new Set(['all', 'active', 'done']);

/** (urgency,importance) → 분면 key */
export function quadrantKey(task) {
  const urgency = LEVELS.has(task?.urgency) ? task.urgency : 'low';
  const importance = LEVELS.has(task?.importance) ? task.importance : 'low';
  return `${urgency}-${importance}`;
}

/** task 가 속한 분면 서술자 반환 */
export function quadrantOf(task) {
  const key = quadrantKey(task);
  return QUADRANTS.find((q) => q.key === key) ?? QUADRANTS[QUADRANTS.length - 1];
}

function normLevel(value) {
  return LEVELS.has(value) ? value : 'low';
}

let genIdCounter = 0;

function genId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // crypto.randomUUID 미제공(비보안 컨텍스트 등) 시 브라우저·Node 양쪽에서 안전한 대체값 사용.
  // process 같은 Node 전용 전역은 브라우저에서 ReferenceError 를 던지므로 참조하지 않는다.
  const rand = Math.floor(Math.random() * 1e9).toString(36);
  return `t_${Date.now().toString(36)}_${(genIdCounter++).toString(36)}_${rand}`;
}

/**
 * 입력으로 스키마에 맞는 새 task 를 만든다.
 * @throws 제목이 비어 있으면 예외
 */
export function createTask(input, now) {
  const title = String(input?.title ?? '').trim();
  if (!title) {
    throw new Error('제목은 필수입니다.');
  }
  return {
    id: input?.id ? String(input.id) : genId(),
    title,
    description: String(input?.description ?? '').trim(),
    urgency: normLevel(input?.urgency),
    importance: normLevel(input?.importance),
    done: false,
    createdAt: typeof now === 'number' ? now : Number(now) || 0,
  };
}

/** 저장된 raw 값을 스키마 필드만 갖는 task 로 정제. 유효하지 않으면 null */
export function sanitizeTask(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
  if (typeof raw.title !== 'string' || raw.title.trim().length === 0) return null;
  return {
    id: raw.id,
    title: raw.title,
    description: typeof raw.description === 'string' ? raw.description : '',
    urgency: normLevel(raw.urgency),
    importance: normLevel(raw.importance),
    done: raw.done === true,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Number(raw.createdAt) || 0,
  };
}

/** 상태 필터: all(전체) / active(진행) / done(완료) */
export function filterTasks(tasks, filter) {
  const mode = FILTERS.has(filter) ? filter : 'all';
  if (mode === 'active') return tasks.filter((t) => !t.done);
  if (mode === 'done') return tasks.filter((t) => t.done);
  return tasks.slice();
}

/** localStorage 호환 store 에서 task 배열 복원 (손상 시 빈 배열) */
export function loadTasks(store) {
  let raw;
  try {
    raw = store?.getItem?.(STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map(sanitizeTask).filter((t) => t !== null);
}

/** task 배열을 JSON 직렬화하여 저장 */
export function saveTasks(store, tasks) {
  try {
    store?.setItem?.(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    /* 저장 실패는 무시 (프라이빗 모드 등) */
  }
}

// ----------------------------------------------------------------------------
// DOM 부트스트랩 — 브라우저 환경에서만 실행 (node --test 에서는 스킵)
// ----------------------------------------------------------------------------

export function mount(root, options = {}) {
  const doc = options.document ?? (typeof document !== 'undefined' ? document : null);
  const store = options.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  const nowFn = options.now ?? (() => Date.now());
  if (!root || !doc) return null;

  let tasks = loadTasks(store);
  let filter = 'all';

  const els = {
    form: root.querySelector('#pm-form'),
    title: root.querySelector('#pm-title'),
    description: root.querySelector('#pm-description'),
    urgency: root.querySelector('#pm-urgency'),
    importance: root.querySelector('#pm-importance'),
    error: root.querySelector('#pm-form-error'),
    filters: root.querySelector('#pm-filters'),
    matrix: root.querySelector('#pm-matrix'),
    matrixWrap: root.querySelector('.pm-matrix-wrap'),
    count: root.querySelector('#pm-count'),
    announce: root.querySelector('#pm-announce'),
  };

  const FILTER_LABELS = { all: '전체', active: '진행', done: '완료' };

  function persist() {
    saveTasks(store, tasks);
  }

  /** 스크린리더 assertive 알림 (§6.6) */
  function announce(msg) {
    if (els.announce) els.announce.textContent = msg;
  }

  function emptyMessage() {
    if (tasks.length === 0) return '아직 등록된 작업이 없습니다. 위 폼에서 첫 작업을 추가해 보세요.';
    if (filter === 'active') return '진행 중인 작업이 없습니다.';
    if (filter === 'done') return '완료된 작업이 없습니다.';
    return '표시할 작업이 없습니다.';
  }

  function render() {
    const visible = filterTasks(tasks, filter);

    if (els.count) {
      const total = tasks.length;
      const doneCount = tasks.filter((t) => t.done).length;
      els.count.textContent = `전체 ${total}개 · 완료 ${doneCount}개 · 진행 ${total - doneCount}개`;
    }

    if (els.filters) {
      els.filters.querySelectorAll('[data-filter]').forEach((btn) => {
        const active = btn.getAttribute('data-filter') === filter;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.classList.toggle('is-active', active);
      });
    }

    if (!els.matrix) return;
    els.matrix.textContent = '';

    for (const quad of QUADRANTS) {
      const section = doc.createElement('section');
      section.className = 'pm-quadrant';
      section.dataset.quadrant = quad.key;
      section.setAttribute('aria-labelledby', `pm-quad-${quad.key}`);

      const header = doc.createElement('header');
      header.className = 'pm-quadrant__head';
      const h = doc.createElement('h3');
      h.id = `pm-quad-${quad.key}`;
      h.className = 'pm-quadrant__title';
      h.textContent = quad.title;
      const sub = doc.createElement('span');
      sub.className = 'pm-quadrant__subtitle';
      sub.textContent = quad.subtitle;
      header.append(h, sub);
      section.append(header);

      const list = doc.createElement('ul');
      list.className = 'pm-list';
      list.setAttribute('role', 'list');

      const items = visible.filter((t) => quadrantKey(t) === quad.key);
      if (items.length === 0) {
        const empty = doc.createElement('li');
        empty.className = 'pm-quadrant__empty';
        empty.textContent = '아직 이 분면에 등록된 작업이 없습니다.';
        list.append(empty);
      } else {
        for (const task of items) {
          list.append(renderCard(task));
        }
      }
      section.append(list);
      els.matrix.append(section);
    }

    // 전역 빈 상태 문구
    let banner = root.querySelector('#pm-empty');
    if (visible.length === 0) {
      if (!banner) {
        banner = doc.createElement('p');
        banner.id = 'pm-empty';
        banner.className = 'pm-empty';
        banner.setAttribute('role', 'status');
        (els.matrixWrap ?? els.matrix).before(banner);
      }
      banner.textContent = emptyMessage();
      banner.hidden = false;
    } else if (banner) {
      banner.hidden = true;
    }
  }

  function renderCard(task) {
    const li = doc.createElement('li');
    li.className = 'pm-card' + (task.done ? ' pm-card--done' : '');
    li.dataset.id = task.id;

    const main = doc.createElement('div');
    main.className = 'pm-card__main';

    const title = doc.createElement('p');
    title.className = 'pm-card__title';
    title.textContent = task.title;
    main.append(title);

    if (task.description) {
      const desc = doc.createElement('p');
      desc.className = 'pm-card__desc';
      desc.textContent = task.description;
      main.append(desc);
    }

    // 긴급/중요 배지 (§6.4)
    const badges = doc.createElement('div');
    badges.className = 'pm-card__badges';
    const urgencyBadge = doc.createElement('span');
    urgencyBadge.className = `pm-badge pm-badge--urgency pm-badge--${task.urgency}`;
    urgencyBadge.textContent = task.urgency === 'high' ? '긴급' : '비긴급';
    const importanceBadge = doc.createElement('span');
    importanceBadge.className = `pm-badge pm-badge--importance pm-badge--${task.importance}`;
    importanceBadge.textContent = task.importance === 'high' ? '중요' : '비중요';
    badges.append(urgencyBadge, importanceBadge);
    main.append(badges);

    li.append(main);

    const actions = doc.createElement('div');
    actions.className = 'pm-card__actions';

    const toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'pm-btn pm-btn--toggle';
    toggle.textContent = task.done ? '되돌리기' : '완료';
    toggle.setAttribute('aria-pressed', task.done ? 'true' : 'false');
    toggle.setAttribute('aria-label', `${task.title} ${task.done ? '완료 취소' : '완료 처리'}`);
    toggle.addEventListener('click', () => {
      task.done = !task.done;
      persist();
      announce(`${task.title} ${task.done ? '완료 처리됨' : '진행 상태로 되돌림'}`);
      render();
    });

    const del = doc.createElement('button');
    del.type = 'button';
    del.className = 'pm-btn pm-btn--delete';
    del.textContent = '삭제';
    del.setAttribute('aria-label', `${task.title} 삭제`);
    del.addEventListener('click', () => {
      tasks = tasks.filter((t) => t.id !== task.id);
      persist();
      announce(`${task.title} 삭제됨`);
      render();
    });

    actions.append(toggle, del);
    li.append(actions);
    return li;
  }

  function showError(msg) {
    if (!els.error) return;
    els.error.textContent = msg;
    els.error.hidden = !msg;
  }

  if (els.form) {
    els.form.addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        const task = createTask(
          {
            title: els.title?.value ?? '',
            description: els.description?.value ?? '',
            urgency: els.urgency?.value ?? 'low',
            importance: els.importance?.value ?? 'low',
          },
          nowFn(),
        );
        tasks.push(task);
        persist();
        announce(`${task.title} 작업이 추가되었습니다`);
        showError('');
        els.form.reset();
        if (els.title) els.title.focus();
        render();
      } catch (err) {
        showError(err instanceof Error ? err.message : '작업을 추가할 수 없습니다.');
        els.title?.focus();
      }
    });
  }

  if (els.filters) {
    els.filters.addEventListener('click', (event) => {
      const btn = event.target?.closest?.('[data-filter]');
      if (!btn) return;
      filter = btn.getAttribute('data-filter');
      announce(`${FILTER_LABELS[filter] ?? '전체'} 필터로 변경됨`);
      render();
    });
  }

  render();
  return { render, getState: () => ({ tasks: tasks.slice(), filter }) };
}

if (typeof document !== 'undefined') {
  const boot = () => {
    const root = document.getElementById('pm-app');
    if (root) mount(root);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
