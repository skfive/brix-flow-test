// 고객 온보딩 체크리스트 — 브라우저 앱 (BF-1069)
// 로컬 fixture(JSON)와 브라우저 상태만 사용한다. 외부 API 호출 없음.
import {
  getCustomerChecklistView,
  applyLocalCompletion,
  resolveDemoCustomerId,
} from './checklist.js';

const FIXTURES_URL = new URL('./fixtures.json', import.meta.url);

const READINESS_LABEL = {
  not_started: '시작 전',
  in_progress: '진행 중',
  blocked: '차단됨',
  ready: '준비 완료',
};

const STATUS_LABEL = {
  complete: '완료',
  incomplete: '미완료',
  blocked: '차단',
};

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    el.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return el;
}

// 화면 상태: 데모 상호작용에 따라 갱신되는 고객 목록(로컬 사본)
const state = {
  catalog: [],
  customers: [],
  customerId: null,
};

function render(root) {
  root.replaceChildren();

  // 데모 인증/세션 가드: 선택 고객이 fixture에 없으면 진입 차단 안내
  if (state.customerId === null) {
    root.append(
      h('section', { class: 'onboarding-empty', role: 'alert' }, [
        h('h2', {}, '고객 정보를 찾을 수 없음'),
        h('p', {}, '선택된 데모 고객이 존재하지 않습니다.'),
      ]),
    );
    return;
  }

  const view = getCustomerChecklistView(state.customerId, state.catalog, state.customers);
  if (!view) {
    root.append(
      h('section', { class: 'onboarding-empty', role: 'alert' }, [
        h('h2', {}, '고객 정보를 찾을 수 없음'),
      ]),
    );
    return;
  }

  // 상단: 고객명 + 종합 준비 상태 + 진행률
  const { requiredCompleted, requiredTotal } = view.progress;
  root.append(
    h('header', { class: 'onboarding-summary' }, [
      h('div', { class: 'onboarding-customer-picker' }, [
        h('label', { for: 'customer-select' }, '데모 고객: '),
        h(
          'select',
          {
            id: 'customer-select',
            onchange: (e) => selectCustomer(root, e.target.value),
          },
          state.customers.map((c) =>
            h('option', c.customerId === view.customerId ? { value: c.customerId, selected: 'selected' } : { value: c.customerId }, c.displayName),
          ),
        ),
      ]),
      h('h1', {}, view.displayName),
      h(
        'p',
        { class: 'onboarding-readiness', dataset: { status: view.readinessStatus } },
        `준비 상태: ${READINESS_LABEL[view.readinessStatus] ?? view.readinessStatus}`,
      ),
      h(
        'p',
        {
          class: 'onboarding-progress',
          // design §5.2 ProgressBar 접근성 요구: 진행률 시맨틱 노출 (BF-1069 리뷰 반영)
          role: 'progressbar',
          'aria-valuenow': String(requiredCompleted),
          'aria-valuemin': '0',
          'aria-valuemax': String(requiredTotal),
          'aria-label': '필수 항목 진행률',
        },
        `${requiredCompleted}/${requiredTotal} 필수 항목 완료`,
      ),
    ]),
  );

  // 체크리스트 항목 목록
  root.append(
    h(
      'ul',
      { class: 'onboarding-checklist', id: 'checklist' },
      view.items.map((item) => renderItem(root, item)),
    ),
  );

  // 하단: 다음 액션 추천
  root.append(
    h('footer', { class: 'onboarding-next-action', dataset: { type: view.nextAction.type } }, [
      h('h2', {}, '다음 액션'),
      h('p', { id: 'next-action-message' }, view.nextAction.message),
    ]),
  );
}

function renderItem(root, item) {
  const canComplete = item.status === 'incomplete' && item.required !== undefined;
  const children = [
    h('span', { class: 'item-label' }, item.label),
    h('span', { class: 'item-status', dataset: { status: item.status } }, STATUS_LABEL[item.status] ?? item.status),
    item.required ? h('span', { class: 'item-required' }, '필수') : h('span', { class: 'item-optional' }, '선택'),
  ];
  if (item.status === 'blocked' && item.blockedReason) {
    children.push(h('span', { class: 'item-blocked-reason' }, item.blockedReason));
  }
  if (item.status === 'incomplete') {
    children.push(
      h(
        'button',
        {
          type: 'button',
          class: 'item-complete-btn',
          dataset: { itemId: item.itemId },
          onclick: () => completeItem(root, item.itemId),
        },
        '완료 처리',
      ),
    );
  } else if (item.status === 'blocked') {
    // 차단 항목은 완료 처리 액션 비활성화
    children.push(h('button', { type: 'button', class: 'item-complete-btn', disabled: 'disabled' }, '완료 처리'));
  }
  return h('li', { class: 'checklist-item', dataset: { itemId: item.itemId, status: item.status } }, children);
}

function completeItem(root, itemId) {
  const idx = state.customers.findIndex((c) => c.customerId === state.customerId);
  if (idx === -1) return;
  const updated = applyLocalCompletion(
    state.customers[idx],
    itemId,
    new Date().toISOString(),
  );
  state.customers = state.customers.map((c, i) => (i === idx ? updated : c));
  render(root);
}

function selectCustomer(root, customerId) {
  state.customerId = resolveDemoCustomerId(customerId, state.customers);
  render(root);
}

export async function init(root, { search = window.location.search } = {}) {
  const res = await fetch(FIXTURES_URL);
  const data = await res.json();
  state.catalog = data.checklistCatalog;
  state.customers = data.customers.map((c) => ({ ...c, checklist: c.checklist.map((e) => ({ ...e })) }));

  const selected = new URLSearchParams(search).get('customer');
  state.customerId = resolveDemoCustomerId(selected, state.customers);
  render(root);
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('app');
  if (root) init(root);
}
