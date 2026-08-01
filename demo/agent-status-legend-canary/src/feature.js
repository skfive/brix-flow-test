export const STATUSES = [
  {
    key: 'running',
    label: '실행 중',
    meaning: '에이전트가 현재 작업을 수행하고 있다',
    nextAction: '진행 상황을 계속 지켜본다',
  },
  {
    key: 'waiting',
    label: '대기 중',
    meaning: '에이전트가 선행 작업이나 리소스를 기다리고 있다',
    nextAction: '차단 요인이 해소될 때까지 기다린다',
  },
  {
    key: 'action-needed',
    label: '조치 필요',
    meaning: '운영자의 확인·승인이 필요하다',
    nextAction: '지금 확인하고 필요한 조치를 취한다',
  },
  {
    key: 'stalled',
    label: '정체됨',
    meaning: '예상보다 오래 진행 없이 멈춰 있다',
    nextAction: '원인을 점검하고 필요하면 재시작한다',
  },
  {
    key: 'done',
    label: '완료',
    meaning: '작업이 정상적으로 종료되었다',
    nextAction: '결과를 검토하고 다음 단계로 진행한다',
  },
];

export const DETAIL_PLACEHOLDER = '상태를 선택하면 상태명·의미·다음 행동이 여기에 표시됩니다.';

export function findStatus(key) {
  return STATUSES.find((status) => status.key === key) || null;
}

export function nextSelection(currentKey, clickedKey) {
  return currentKey === clickedKey ? null : clickedKey;
}

export function renderDetailContent(selectedKey) {
  const status = findStatus(selectedKey);
  if (!status) {
    return { placeholder: true, text: DETAIL_PLACEHOLDER };
  }
  return {
    placeholder: false,
    label: status.label,
    meaning: status.meaning,
    nextAction: status.nextAction,
  };
}

function buildBadge(status, doc) {
  const item = doc.createElement('li');
  item.className = 'legend__item';
  item.dataset.status = status.key;

  const badge = doc.createElement('button');
  badge.type = 'button';
  badge.className = 'legend__badge';
  badge.dataset.status = status.key;
  badge.setAttribute('aria-pressed', 'false');

  const dot = doc.createElement('span');
  dot.className = 'legend__badge-dot';
  dot.setAttribute('aria-hidden', 'true');

  const labelEl = doc.createElement('span');
  labelEl.className = 'legend__badge-label';
  labelEl.textContent = status.label;

  badge.appendChild(dot);
  badge.appendChild(labelEl);
  item.appendChild(badge);
  return item;
}

function renderDetailPanel(panelEl, selectedKey, doc) {
  const content = renderDetailContent(selectedKey);
  panelEl.textContent = '';

  if (content.placeholder) {
    const placeholder = doc.createElement('p');
    placeholder.textContent = content.text;
    panelEl.appendChild(placeholder);
    return;
  }

  const dl = doc.createElement('dl');

  const labelTerm = doc.createElement('dt');
  labelTerm.textContent = '상태명';
  const labelDesc = doc.createElement('dd');
  labelDesc.textContent = content.label;

  const meaningTerm = doc.createElement('dt');
  meaningTerm.textContent = '의미';
  const meaningDesc = doc.createElement('dd');
  meaningDesc.textContent = content.meaning;

  const actionTerm = doc.createElement('dt');
  actionTerm.textContent = '다음 행동';
  const actionDesc = doc.createElement('dd');
  actionDesc.textContent = content.nextAction;

  dl.appendChild(labelTerm);
  dl.appendChild(labelDesc);
  dl.appendChild(meaningTerm);
  dl.appendChild(meaningDesc);
  dl.appendChild(actionTerm);
  dl.appendChild(actionDesc);
  panelEl.appendChild(dl);
}

export function initLegend(doc) {
  const root = doc.getElementById('legend-root');
  const listEl = doc.getElementById('legend-status-list');
  const panelEl = doc.getElementById('legend-detail-panel');
  const resetEl = doc.getElementById('legend-reset');

  if (!root || !listEl || !panelEl || !resetEl) {
    return null;
  }

  let selectedKey = null;

  STATUSES.forEach((status) => {
    listEl.appendChild(buildBadge(status, doc));
  });

  function render() {
    listEl.querySelectorAll('.legend__item').forEach((item) => {
      const isMatch = selectedKey === null || item.dataset.status === selectedKey;
      item.classList.toggle('legend__item--hidden', !isMatch);
    });
    listEl.querySelectorAll('.legend__badge').forEach((badge) => {
      badge.setAttribute('aria-pressed', String(badge.dataset.status === selectedKey));
    });
    renderDetailPanel(panelEl, selectedKey, doc);
  }

  function select(key) {
    selectedKey = nextSelection(selectedKey, key);
    render();
  }

  function reset() {
    selectedKey = null;
    render();
  }

  listEl.addEventListener('click', (event) => {
    const badge = event.target.closest('.legend__badge');
    if (!badge) {
      return;
    }
    select(badge.dataset.status);
  });

  resetEl.addEventListener('click', () => {
    reset();
  });

  render();

  return { select, reset, getSelectedKey: () => selectedKey };
}

if (typeof document !== 'undefined' && document.getElementById('legend-root')) {
  initLegend(document);
}
