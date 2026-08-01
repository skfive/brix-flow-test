import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  mountQueueLegend,
  QUEUE_LEGEND_STATE,
  QUEUE_LEGEND_STATE_TEXT,
  QUEUE_STATUS_ITEMS,
} from '../src/feature.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- 최소 fake DOM (외부 의존성 0건, vanilla-static 규약) ---

function createFakeElement(tag) {
  return {
    tagName: tag,
    className: '',
    textContent: '',
    disabled: false,
    attributes: {},
    style: {},
    children: [],
    listeners: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    click() {
      if (this.listeners.click) {
        this.listeners.click();
      }
    },
  };
}

function createFakeRoot() {
  const refreshButton = createFakeElement('button');
  const statusText = createFakeElement('p');
  const itemsList = createFakeElement('ul');

  const byId = {
    '#queue-legend-refresh': refreshButton,
    '#queue-legend-status': statusText,
    '#queue-legend-items': itemsList,
  };

  return {
    querySelector(selector) {
      return byId[selector] || null;
    },
    refreshButton,
    statusText,
    itemsList,
  };
}

const fakeDocument = {
  createElement: createFakeElement,
};

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test('초기 mount 시 idle 상태 텍스트를 표시하고 refresh control이 사용 가능하다', () => {
  const root = createFakeRoot();
  const legend = mountQueueLegend(root, { documentRef: fakeDocument });

  assert.equal(legend.getState(), QUEUE_LEGEND_STATE.IDLE);
  assert.equal(root.statusText.textContent, QUEUE_LEGEND_STATE_TEXT[QUEUE_LEGEND_STATE.IDLE]);
  assert.equal(root.refreshButton.disabled, false);
  assert.equal(root.itemsList.children.length, 0);
});

test('조회 성공 시 loading을 거쳐 loaded로 전이하고 3개 legend__item을 순서대로 렌더링한다', async () => {
  const root = createFakeRoot();
  const legend = mountQueueLegend(root, {
    documentRef: fakeDocument,
    fetchStatus: () => Promise.resolve(QUEUE_STATUS_ITEMS),
  });

  const refreshPromise = legend.refresh();

  assert.equal(legend.getState(), QUEUE_LEGEND_STATE.LOADING);
  assert.equal(root.statusText.textContent, QUEUE_LEGEND_STATE_TEXT[QUEUE_LEGEND_STATE.LOADING]);
  assert.equal(root.refreshButton.disabled, true);

  await refreshPromise;

  assert.equal(legend.getState(), QUEUE_LEGEND_STATE.LOADED);
  assert.equal(root.refreshButton.disabled, false);
  assert.equal(root.itemsList.children.length, 3);

  const expected = [
    { key: 'waiting', label: '대기 중', token: '--color-status-waiting' },
    { key: 'running', label: '실행 중', token: '--color-status-running' },
    { key: 'action-needed', label: '조치 필요', token: '--color-status-action' },
  ];

  root.itemsList.children.forEach((item, index) => {
    assert.equal(item.className, 'legend__item');
    const [dot, label] = item.children;
    assert.equal(dot.getAttribute('aria-hidden'), 'true');
    assert.equal(dot.style.backgroundColor, `var(${expected[index].token})`);
    assert.equal(label.textContent, expected[index].label);
  });
});

test('조회 실패 시 error 텍스트를 표시하고 refresh control을 재활성화하여 재조회할 수 있다', async () => {
  const root = createFakeRoot();
  let shouldFail = true;
  const legend = mountQueueLegend(root, {
    documentRef: fakeDocument,
    fetchStatus: () => (shouldFail ? Promise.reject(new Error('요청 실패')) : Promise.resolve(QUEUE_STATUS_ITEMS)),
  });

  await legend.refresh();

  assert.equal(legend.getState(), QUEUE_LEGEND_STATE.ERROR);
  assert.equal(root.statusText.textContent, QUEUE_LEGEND_STATE_TEXT[QUEUE_LEGEND_STATE.ERROR]);
  assert.equal(root.refreshButton.disabled, false);
  assert.equal(root.itemsList.children.length, 0);

  // refresh control로 재조회 → 상태와 진행 표시가 복원되고 refresh control이 재활성화된다.
  shouldFail = false;
  root.refreshButton.click();

  assert.equal(legend.getState(), QUEUE_LEGEND_STATE.LOADING);
  assert.equal(root.refreshButton.disabled, true);

  await flushMicrotasks();

  assert.equal(legend.getState(), QUEUE_LEGEND_STATE.LOADED);
  assert.equal(root.statusText.textContent, '');
  assert.equal(root.refreshButton.disabled, false);
  assert.equal(root.itemsList.children.length, 3);
});

test('refresh control 클릭으로도 조회를 트리거할 수 있다', async () => {
  const root = createFakeRoot();
  const legend = mountQueueLegend(root, {
    documentRef: fakeDocument,
    fetchStatus: () => Promise.resolve(QUEUE_STATUS_ITEMS),
  });

  root.refreshButton.click();
  assert.equal(legend.getState(), QUEUE_LEGEND_STATE.LOADING);

  await flushMicrotasks();

  assert.equal(legend.getState(), QUEUE_LEGEND_STATE.LOADED);
});

test('index.html은 frozen DOM ID/class/aria-label/token을 그대로 포함한다', () => {
  const html = readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.match(html, /id="queue-legend-root"/);
  assert.match(html, /class="legend"/);
  assert.match(html, /id="queue-legend-refresh"/);
  assert.match(html, /class="legend__refresh"/);
  assert.match(html, /aria-label="상태 범례 새로고침"/);
  assert.match(html, /새로고침을 눌러 상태를 불러오세요/);
  assert.match(html, /--color-status-waiting:\s*#f59e0b/);
  assert.match(html, /--color-status-running:\s*#2563eb/);
  assert.match(html, /--color-status-action:\s*#dc2626/);
  assert.match(html, /--space-legend-gap:\s*12px/);
  assert.match(html, /from '\.\/src\/feature\.js'/);
});
