import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  STATUS_META,
  normalizeStatus,
  statusLabel,
  badgeModifierClass,
  formatUpdatedAt,
  fetchDeliveryStatus,
  initDeliveryStatus,
} from '../src/delivery-status.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

function fakeResponse({ ok = true, httpStatus = 200, body } = {}) {
  return {
    ok,
    status: httpStatus,
    json: async () => body,
  };
}

function createFakeElement() {
  const classes = new Set();
  const attributes = {};
  const listeners = {};
  return {
    classList: {
      add: (...cls) => cls.forEach((c) => classes.add(c)),
      remove: (...cls) => cls.forEach((c) => classes.delete(c)),
      contains: (c) => classes.has(c),
    },
    textContent: '',
    disabled: false,
    listeners,
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
    },
    removeAttribute(name) {
      delete attributes[name];
    },
  };
}

function createFakeDom() {
  const elements = {
    'delivery-status-root': createFakeElement(),
    'delivery-status-badge': createFakeElement(),
    'delivery-status-label': createFakeElement(),
    'delivery-status-updated': createFakeElement(),
    'delivery-status-refresh': createFakeElement(),
  };
  const doc = { getElementById: (id) => elements[id] || null };
  return { doc, elements };
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const flushAll = async () => {
  await flush();
  await flush();
};

// --- STATUS_META / normalizeStatus / statusLabel / badgeModifierClass ------
test('STATUS_META: normal/warning/failed 한글 라벨이 계약과 일치 (AC1, AC2)', () => {
  assert.equal(STATUS_META.normal.label, '정상');
  assert.equal(STATUS_META.warning.label, '경고');
  assert.equal(STATUS_META.failed.label, '실패');
});

test('normalizeStatus: 계약 상태 3종은 그대로 통과', () => {
  for (const s of ['normal', 'warning', 'failed']) {
    assert.equal(normalizeStatus(s), s);
  }
});

test('normalizeStatus: 계약 밖 값은 error로 안전 폴백 (§8 edge case)', () => {
  assert.equal(normalizeStatus('delivered'), 'error');
  assert.equal(normalizeStatus('weird'), 'error');
  assert.equal(normalizeStatus(undefined), 'error');
  assert.equal(normalizeStatus(null), 'error');
});

test('statusLabel: 정의되지 않은 state는 error 라벨로 폴백', () => {
  assert.equal(statusLabel('normal'), '정상');
  assert.equal(statusLabel('unknown-state'), STATUS_META.error.label);
});

test('badgeModifierClass: normal/warning/failed만 modifier class를 가진다 (frozen UI 계약)', () => {
  assert.equal(badgeModifierClass('normal'), 'delivery-status__badge--normal');
  assert.equal(badgeModifierClass('warning'), 'delivery-status__badge--warning');
  assert.equal(badgeModifierClass('failed'), 'delivery-status__badge--failed');
  assert.equal(badgeModifierClass('loading'), null);
  assert.equal(badgeModifierClass('error'), null);
});

// --- formatUpdatedAt (ISO 8601) ---------------------------------------------
test('formatUpdatedAt: 유효 시각은 ISO 8601로 반환', () => {
  const out = formatUpdatedAt('2026-08-01T09:00:00Z');
  assert.match(out, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
});

test('formatUpdatedAt: 누락/파싱 불가 값은 빈 문자열로 폴백', () => {
  assert.equal(formatUpdatedAt(''), '');
  assert.equal(formatUpdatedAt(undefined), '');
  assert.equal(formatUpdatedAt('not-a-date'), '');
});

// --- fetchDeliveryStatus -----------------------------------------------------
test('fetchDeliveryStatus: normal/warning/failed 응답을 그대로 정규화 (AC1, AC2)', async () => {
  for (const status of ['normal', 'warning', 'failed']) {
    const result = await fetchDeliveryStatus('x', {
      fetchImpl: async () =>
        fakeResponse({ body: { status, updatedAt: '2026-08-01T09:00:00Z' } }),
    });
    assert.equal(result.status, status);
    assert.equal(result.updatedAt, '2026-08-01T09:00:00.000Z');
  }
});

test('fetchDeliveryStatus: 응답이 ok가 아니면 error로 정규화 (AC4)', async () => {
  const result = await fetchDeliveryStatus('x', {
    fetchImpl: async () => fakeResponse({ ok: false, httpStatus: 500 }),
  });
  assert.equal(result.status, 'error');
});

test('fetchDeliveryStatus: 네트워크 오류(non-abort)는 error로 정규화 (AC4)', async () => {
  const result = await fetchDeliveryStatus('x', {
    fetchImpl: async () => {
      throw new Error('network down');
    },
  });
  assert.equal(result.status, 'error');
});

test('fetchDeliveryStatus: JSON 파싱 실패는 error로 정규화', async () => {
  const result = await fetchDeliveryStatus('x', {
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('bad json');
      },
    }),
  });
  assert.equal(result.status, 'error');
});

test('fetchDeliveryStatus: 계약 밖 status 문자열은 error로 안전 폴백 (§8 edge case)', async () => {
  const result = await fetchDeliveryStatus('x', {
    fetchImpl: async () => fakeResponse({ body: { status: 'weird' } }),
  });
  assert.equal(result.status, 'error');
});

test('fetchDeliveryStatus: AbortError는 status null로 반환되어 호출부가 무시할 수 있다', async () => {
  const result = await fetchDeliveryStatus('x', {
    fetchImpl: async () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    },
  });
  assert.equal(result.status, null);
});

// --- initDeliveryStatus (DOM 통합) ------------------------------------------
test('initDeliveryStatus: 필수 element 누락 시 null 반환', () => {
  const doc = { getElementById: () => null };
  assert.equal(initDeliveryStatus(doc, { fetchImpl: async () => fakeResponse({}) }), null);
});

test('initDeliveryStatus: 최초 로드 시 normal 상태가 배지/라벨/갱신시각에 렌더된다 (AC1)', async () => {
  const { doc, elements } = createFakeDom();
  const fetchImpl = async () =>
    fakeResponse({ body: { status: 'normal', updatedAt: '2026-08-01T09:00:00Z' } });
  initDeliveryStatus(doc, { fetchImpl, endpoint: 'x' });
  await flushAll();

  const badge = elements['delivery-status-badge'];
  assert.equal(badge.classList.contains('delivery-status__badge--normal'), true);
  assert.equal(elements['delivery-status-label'].textContent, '정상');
  assert.equal(elements['delivery-status-updated'].textContent, '2026-08-01T09:00:00.000Z');
  assert.equal(elements['delivery-status-updated'].getAttribute('datetime'), '2026-08-01T09:00:00.000Z');
  assert.equal(elements['delivery-status-refresh'].disabled, false);
});

test('initDeliveryStatus: warning/failed 상태도 대응 modifier class와 한글 라벨로 렌더된다 (AC2)', async () => {
  for (const [status, label, cls] of [
    ['warning', '경고', 'delivery-status__badge--warning'],
    ['failed', '실패', 'delivery-status__badge--failed'],
  ]) {
    const { doc, elements } = createFakeDom();
    const fetchImpl = async () =>
      fakeResponse({ body: { status, updatedAt: '2026-08-01T09:00:00Z' } });
    initDeliveryStatus(doc, { fetchImpl, endpoint: 'x' });
    await flushAll();

    assert.equal(elements['delivery-status-badge'].classList.contains(cls), true);
    assert.equal(elements['delivery-status-label'].textContent, label);
  }
});

test('initDeliveryStatus: loading 중에도 새로고침 버튼은 disabled 되지 않는다 (frozen 계약: 즉시 재사용 가능, plan §3.6/§6-7)', async () => {
  const { doc, elements } = createFakeDom();
  let resolveFetch;
  const pending = new Promise((r) => {
    resolveFetch = r;
  });
  const fetchImpl = async () => pending;
  initDeliveryStatus(doc, { fetchImpl, endpoint: 'x' });
  await flushAll();

  assert.equal(elements['delivery-status-label'].textContent, STATUS_META.loading.label);
  assert.equal(elements['delivery-status-refresh'].disabled, false);

  resolveFetch(fakeResponse({ body: { status: 'normal', updatedAt: '2026-08-01T09:00:00Z' } }));
  await flushAll();

  assert.equal(elements['delivery-status-refresh'].disabled, false);
});

test('initDeliveryStatus: 새로고침 클릭 시 loading으로 리셋 후 새 응답으로 갱신된다 (AC3)', async () => {
  const { doc, elements } = createFakeDom();
  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    const status = call === 1 ? 'normal' : 'failed';
    return fakeResponse({ body: { status, updatedAt: `2026-08-01T0${call}:00:00Z` } });
  };
  initDeliveryStatus(doc, { fetchImpl, endpoint: 'x' });
  await flushAll();
  assert.equal(elements['delivery-status-badge'].classList.contains('delivery-status__badge--normal'), true);

  elements['delivery-status-refresh'].listeners.click();
  await flushAll();

  assert.equal(elements['delivery-status-badge'].classList.contains('delivery-status__badge--normal'), false);
  assert.equal(elements['delivery-status-badge'].classList.contains('delivery-status__badge--failed'), true);
  assert.equal(elements['delivery-status-label'].textContent, '실패');
  assert.equal(call, 2);
});

test('initDeliveryStatus: loading과 error는 서로 다른 additive 배지 class로 구분된다 (design §2.2/§5.3)', async () => {
  const { doc, elements } = createFakeDom();
  let resolveFetch;
  const pending = new Promise((r) => {
    resolveFetch = r;
  });
  const fetchImpl = async () => pending;
  initDeliveryStatus(doc, { fetchImpl, endpoint: 'x' });
  await flushAll();

  const badge = elements['delivery-status-badge'];
  assert.equal(badge.classList.contains('delivery-status__badge--loading'), true);
  assert.equal(badge.classList.contains('delivery-status__badge--error'), false);

  resolveFetch({ ok: false, status: 500, json: async () => ({}) });
  await flushAll();

  assert.equal(badge.classList.contains('delivery-status__badge--loading'), false);
  assert.equal(badge.classList.contains('delivery-status__badge--error'), true);
});

test('initDeliveryStatus: 조회 실패(error) 후에도 새로고침으로 재시도 가능하다 (AC4)', async () => {
  const { doc, elements } = createFakeDom();
  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    if (call === 1) {
      throw new Error('network down');
    }
    return fakeResponse({ body: { status: 'normal', updatedAt: '2026-08-01T09:00:00Z' } });
  };
  initDeliveryStatus(doc, { fetchImpl, endpoint: 'x' });
  await flushAll();

  assert.equal(elements['delivery-status-label'].textContent, STATUS_META.error.label);
  assert.equal(elements['delivery-status-refresh'].disabled, false);

  elements['delivery-status-refresh'].listeners.click();
  await flushAll();

  assert.equal(elements['delivery-status-label'].textContent, '정상');
});

test('initDeliveryStatus: 연속 새로고침 시 나중에 시작된 요청의 응답만 최종 반영된다 (§8 edge case)', async () => {
  const { doc, elements } = createFakeDom();
  const resolvers = [];
  const fetchImpl = async (url, opts) =>
    new Promise((resolve) => {
      resolvers.push({ resolve, signal: opts.signal });
    });

  initDeliveryStatus(doc, { fetchImpl, endpoint: 'x' });
  await flushAll();
  assert.equal(resolvers.length, 1);

  elements['delivery-status-refresh'].listeners.click();
  await flushAll();
  assert.equal(resolvers.length, 2);
  assert.equal(resolvers[0].signal.aborted, true);

  resolvers[0].resolve(fakeResponse({ body: { status: 'failed', updatedAt: '2026-08-01T09:00:00Z' } }));
  await flushAll();
  assert.equal(elements['delivery-status-badge'].classList.contains('delivery-status__badge--failed'), false);

  resolvers[1].resolve(fakeResponse({ body: { status: 'warning', updatedAt: '2026-08-01T10:00:00Z' } }));
  await flushAll();
  assert.equal(elements['delivery-status-badge'].classList.contains('delivery-status__badge--warning'), true);
  assert.equal(elements['delivery-status-label'].textContent, '경고');
});

// --- index.html 정적 계약 검증 ------------------------------------------------
test('index.html: frozen DOM id 5종이 모두 존재한다', () => {
  for (const id of [
    'delivery-status-root',
    'delivery-status-badge',
    'delivery-status-label',
    'delivery-status-updated',
    'delivery-status-refresh',
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('index.html: frozen CSS 클래스와 디자인 토큰이 존재한다', () => {
  for (const cls of [
    'delivery-status',
    'delivery-status__card',
    'delivery-status__badge',
    'delivery-status__badge--normal',
    'delivery-status__badge--warning',
    'delivery-status__badge--failed',
    'delivery-status__refresh',
  ]) {
    assert.match(html, new RegExp(cls.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')));
  }
  for (const token of [
    '--color-status-normal: #16a34a',
    '--color-status-warning: #d97706',
    '--color-status-failed: #dc2626',
    '--color-status-error: #6b7280',
    '--space-card-gap: 16px',
  ]) {
    assert.ok(html.includes(token), `missing token: ${token}`);
  }
});

test('index.html: additive --color-status-loading 토큰과 loading/error 배지 class가 존재한다 (design §2.2/§5.3)', () => {
  assert.ok(html.includes('--color-status-loading'), 'missing token: --color-status-loading');
  assert.match(html, /delivery-status__badge--loading/);
  assert.match(html, /delivery-status__badge--error/);
});

test('index.html: 접근성 속성과 runtime 모듈 진입점이 존재한다 (AC5)', () => {
  assert.match(html, /aria-label="전달 상태 새로고침"/);
  assert.match(html, /id="delivery-status-badge"[\s\S]*?aria-live="polite"/);
  assert.match(html, /<script type="module" src="\.\/src\/delivery-status\.js"><\/script>/);
});
