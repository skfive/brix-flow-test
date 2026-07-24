// 업무 인수인계 보드 — DOM 렌더 + 인터랙션 (BF-1158).
// 공용 레이아웃(헤더/사이드바)을 보존하고, 인증 가드 통과 후 데이터 fetch → 렌더.
// 도메인/판정은 domain.js 순수 함수에 위임한다.

import {
  STATUSES,
  STATUS_LABELS,
  DEFAULT_STATUS,
  addItem,
  groupByStatus,
  countsByStatus,
} from './domain.js';
import { DEMO_SESSION, loadBoardData, requireAuth } from './board-data.js';

/** 필터 탭 순서(전체 + 상태들). */
const FILTER_ORDER = ['all', ...STATUSES.map((s) => s.id)];
const FILTER_LABELS = { all: '전체', ...STATUS_LABELS };

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('data-') || key.startsWith('aria-') || key === 'role')
      node.setAttribute(key, value);
    else node[key] = value;
  }
  for (const child of [].concat(children)) {
    if (child != null) node.append(child);
  }
  return node;
}

/**
 * 공용 레이아웃 골격(헤더 + 사이드바 + 콘텐츠 영역)을 만든다.
 * @returns {{root: HTMLElement, content: HTMLElement}}
 */
function buildLayout() {
  const header = el('header', { class: 'hb-header', role: 'banner' }, [
    el('h1', { class: 'hb-title', text: '업무 인수인계 보드' }),
    el('p', { class: 'hb-subtitle', text: '대기 · 진행 · 완료 상태별 인수인계 현황' }),
  ]);
  const sidebar = el('nav', { class: 'hb-sidebar', role: 'navigation', 'aria-label': '보드 메뉴' }, [
    el('ul', { class: 'hb-nav' }, [
      el('li', {}, el('span', { class: 'hb-nav-item hb-nav-item--active', text: '인수인계 보드' })),
      el('li', {}, el('span', { class: 'hb-nav-item', text: '팀 캘린더' })),
      el('li', {}, el('span', { class: 'hb-nav-item', text: '온콜 일정' })),
    ]),
  ]);
  const content = el('section', { class: 'hb-content', role: 'main' });
  const shell = el('div', { class: 'hb-shell' }, [sidebar, content]);
  const root = el('div', { class: 'hb-layout' }, [header, shell]);
  return { root, content };
}

/**
 * 앱을 초기화한다. 인증 가드 통과 후 데이터를 로드하고 렌더한다.
 * @param {HTMLElement} mount 마운트 대상
 * @param {{session?: object, loadData?: Function}} [options]
 * @returns {Promise<object>} 앱 API(테스트/e2e 용)
 */
export async function initApp(mount, options = {}) {
  const session = options.session ?? DEMO_SESSION;
  const auth = requireAuth(session);

  const load =
    options.loadData ??
    (() => loadBoardData({ fetch: globalThis.fetch.bind(globalThis), session }));

  mount.setAttribute('aria-busy', 'true');
  let board = await load();
  mount.setAttribute('aria-busy', 'false');

  let activeFilter = 'all';

  const { root, content } = buildLayout();
  mount.replaceChildren(root);

  function renderColumns() {
    const groups = groupByStatus(board);
    const columns = STATUSES.map((status) => {
      const items = groups[status.id];
      const cards = items.length
        ? items.map((item) =>
            el('article', { class: 'hb-card', 'data-status': item.status, 'data-id': item.id }, [
              el('h4', { class: 'hb-card-title', text: item.title }),
              item.assignee
                ? el('p', { class: 'hb-card-assignee', text: `담당: ${item.assignee}` })
                : null,
              item.note ? el('p', { class: 'hb-card-note', text: item.note }) : null,
            ]),
          )
        : [el('p', { class: 'hb-empty', text: '항목 없음' })];
      return el(
        'div',
        {
          class: 'hb-column',
          'data-status': status.id,
          hidden: activeFilter !== 'all' && activeFilter !== status.id,
        },
        [
          el('h3', { class: 'hb-column-title' }, [
            el('span', { text: status.label }),
            el('span', { class: 'hb-count', 'data-count': status.id, text: String(items.length) }),
          ]),
          el('div', { class: 'hb-cards' }, cards),
        ],
      );
    });
    return el('div', { class: 'hb-board', role: 'list' }, columns);
  }

  function renderFilters() {
    const counts = countsByStatus(board);
    const tabs = FILTER_ORDER.map((key) =>
      el('button', {
        type: 'button',
        class: `hb-tab${activeFilter === key ? ' hb-tab--active' : ''}`,
        'data-filter': key,
        'aria-pressed': String(activeFilter === key),
        text: `${FILTER_LABELS[key]} (${counts[key] ?? 0})`,
        onclick: () => {
          activeFilter = key;
          rerender();
        },
      }),
    );
    return el('div', { class: 'hb-filters', role: 'tablist', 'aria-label': '상태 필터' }, tabs);
  }

  function buildForm() {
    const titleInput = el('input', {
      type: 'text',
      class: 'hb-input',
      name: 'title',
      'aria-label': '업무 제목',
      placeholder: '인수인계할 업무',
      required: true,
    });
    const assigneeInput = el('input', {
      type: 'text',
      class: 'hb-input',
      name: 'assignee',
      'aria-label': '담당자',
      placeholder: '담당자(선택)',
    });
    const statusSelect = el(
      'select',
      { class: 'hb-select', name: 'status', 'aria-label': '상태' },
      STATUSES.map((s) => el('option', { value: s.id, text: s.label })),
    );
    statusSelect.value = DEFAULT_STATUS;

    const form = el('form', { class: 'hb-form' }, [
      titleInput,
      assigneeInput,
      statusSelect,
      el('button', { type: 'submit', class: 'hb-add', text: '추가' }),
    ]);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const title = titleInput.value.trim();
      if (!title) return;
      board = addItem(board, {
        title,
        assignee: assigneeInput.value,
        status: statusSelect.value,
      });
      titleInput.value = '';
      assigneeInput.value = '';
      statusSelect.value = DEFAULT_STATUS;
      rerender();
      titleInput.focus();
    });
    return form;
  }

  const form = buildForm();

  function rerender() {
    content.replaceChildren(form, renderFilters(), renderColumns());
  }

  rerender();

  return {
    /** @returns {object} 현재 보드 스냅샷 */
    getBoard: () => board,
    /** @returns {string} 현재 활성 필터 */
    getActiveFilter: () => activeFilter,
    /** @returns {object} 인증 결과 */
    getAuth: () => auth,
  };
}

// 브라우저 부트스트랩(테스트 환경에서는 document 가 없으면 skip).
if (typeof document !== 'undefined') {
  const mount = document.getElementById('app');
  if (mount) {
    initApp(mount).catch((err) => {
      mount.setAttribute('aria-busy', 'false');
      mount.replaceChildren(
        el('div', { class: 'hb-error', role: 'alert', text: `보드를 불러오지 못했습니다: ${err.message}` }),
      );
    });
  }
}
