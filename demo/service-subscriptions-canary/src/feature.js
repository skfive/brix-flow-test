const STORAGE_KEY = 'service-subscriptions-canary:v1';

const SERVICES = [
  { id: 'svc-email-digest', name: '이메일 다이제스트' },
  { id: 'svc-sms-alert', name: 'SMS 알림' },
  { id: 'svc-push-notice', name: '푸시 알림' },
  { id: 'svc-newsletter', name: '뉴스레터' },
];

const STATUS_LABEL = {
  active: '활성',
  inactive: '비활성',
};

const STATE_TEXT = {
  idle: '',
  adding: '추가 중…',
  subscribed: '구독이 추가되었습니다',
  removed: '구독이 해제되었습니다',
  empty: '표시할 구독이 없습니다',
  error: '구독을 저장하지 못했습니다',
};

function defaultIdFactory() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatSubscribedAt(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR');
}

function loadSubscriptions(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSubscriptions(storage, list) {
  storage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function initSubscriptionApp(root, options = {}) {
  const storage = options.storage || window.localStorage;
  const idFactory = options.idFactory || defaultIdFactory;

  const form = root.querySelector('#subscription-add-form');
  const select = root.querySelector('#subscription-service-select');
  const submit = root.querySelector('#subscription-add-submit');
  const filterSelect = root.querySelector('#subscription-filter-status');
  const list = root.querySelector('#subscription-list');
  const empty = root.querySelector('#subscription-empty');
  const statusText = root.querySelector('#subscription-status');

  let subscriptions = loadSubscriptions(storage);
  let filterValue = 'all';

  SERVICES.forEach((service) => {
    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = service.name;
    select.append(option);
  });

  function announce(state) {
    submit.textContent = state === 'adding' ? STATE_TEXT.adding : '구독 추가';
    if (statusText) statusText.textContent = STATE_TEXT[state] || '';
  }

  function visibleSubscriptions() {
    if (filterValue === 'all') return subscriptions;
    return subscriptions.filter((item) => item.status === filterValue);
  }

  function render() {
    list.innerHTML = '';

    visibleSubscriptions().forEach((item) => {
      const li = document.createElement('li');
      li.className = 'subscription__item';
      li.dataset.id = item.id;
      li.tabIndex = 0;

      const name = document.createElement('span');
      name.textContent = item.serviceName;

      const statusLabel = document.createElement('span');
      statusLabel.textContent = STATUS_LABEL[item.status] || item.status;
      statusLabel.className = `subscription__status--${item.status}`;

      const subscribedAt = document.createElement('span');
      subscribedAt.className = 'subscription__subscribed-at';
      subscribedAt.textContent = formatSubscribedAt(item.subscribedAt);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.textContent = '해제';
      removeButton.setAttribute('aria-label', `${item.serviceName} 구독 해제`);
      removeButton.addEventListener('click', () => removeSubscription(item.id));

      li.append(name, statusLabel, subscribedAt, removeButton);
      list.append(li);
    });

    const isEmpty = visibleSubscriptions().length === 0;
    empty.hidden = !isEmpty;
    empty.textContent = isEmpty ? STATE_TEXT.empty : '';
    list.hidden = isEmpty;
  }

  function removeSubscription(id) {
    subscriptions = subscriptions.filter((item) => item.id !== id);
    try {
      saveSubscriptions(storage, subscriptions);
    } catch {
      // localStorage 쓰기 실패는 로컬 상태에 이미 반영된 해제를 되돌리지 않는다.
    }
    render();
    announce(visibleSubscriptions().length === 0 ? 'empty' : 'removed');
  }

  function handleSubmit(event) {
    event.preventDefault();
    const serviceId = select.value;
    if (!serviceId) return;

    const service = SERVICES.find((item) => item.id === serviceId);
    if (!service) return;

    submit.disabled = true;
    announce('adding');

    const alreadySubscribed = subscriptions.some((item) => item.serviceId === serviceId);
    const nextList = alreadySubscribed
      ? subscriptions
      : [
          ...subscriptions,
          {
            id: idFactory(),
            serviceId: service.id,
            serviceName: service.name,
            status: 'active',
            subscribedAt: new Date().toISOString(),
          },
        ];

    try {
      saveSubscriptions(storage, nextList);
      subscriptions = nextList;
      submit.disabled = false;
      render();
      announce('subscribed');
    } catch {
      submit.disabled = false;
      announce('error');
    }

    form.reset();
  }

  function handleFilterChange() {
    filterValue = filterSelect.value;
    render();
  }

  form.addEventListener('submit', handleSubmit);
  filterSelect.addEventListener('change', handleFilterChange);

  render();
  announce('idle');

  return {
    getSubscriptions: () => subscriptions.slice(),
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.SubscriptionCanary = { initSubscriptionApp, SERVICES };
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('subscription-root');
  if (root) initSubscriptionApp(root);
}
