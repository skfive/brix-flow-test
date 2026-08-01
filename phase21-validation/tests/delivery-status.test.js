import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  STATUS_TEXT,
  normalizeStatus,
  statusText,
  modifierClass,
  formatUpdatedAt,
  fetchDeliveryStatus,
  initDeliveryStatus,
} from '../app.js';

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
  return {
    classList: {
      add: (...cls) => cls.forEach((c) => classes.add(c)),
      remove: (...cls) => cls.forEach((c) => classes.delete(c)),
      contains: (c) => classes.has(c),
    },
    textContent: '',
    hidden: true,
    disabled: false,
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    setAttribute() {},
    removeAttribute() {},
  };
}

function createFakeDom() {
  const elements = {
    'delivery-status-root': createFakeElement(),
    'delivery-status-badge': createFakeElement(),
    'delivery-status-timestamp': createFakeElement(),
    'delivery-status-refresh': createFakeElement(),
  };
  const doc = { getElementById: (id) => elements[id] || null };
  return { doc, elements };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// --- normalizeStatus / statusText / modifierClass ---------------------------
test('normalizeStatus: 계약 상태 4종은 그대로 통과', () => {
  for (const s of ['idle', 'loading', 'delivered', 'error']) {
    assert.equal(normalizeStatus(s), s);
  }
});

test('normalizeStatus: 계약 밖 값은 안전하게 error로 폴백 (E2)', () => {
  assert.equal(normalizeStatus('weird'), 'error');
  assert.equal(normalizeStatus(undefined), 'error');
  assert.equal(normalizeStatus(null), 'error');
});

test('statusText: 각 상태의 화면 텍스트가 계약과 일치 (§3.3)', () => {
  assert.equal(statusText('idle'), '상태 확인 대기');
  assert.equal(statusText('loading'), '전달 상태 확인 중…');
  assert.equal(statusText('delivered'), '전달 완료');
  assert.equal(statusText('error'), '전달 상태를 불러오지 못했습니다');
  assert.deepEqual(STATUS_TEXT, {
    idle: '상태 확인 대기',
    loading: '전달 상태 확인 중…',
    delivered: '전달 완료',
    error: '전달 상태를 불러오지 못했습니다',
  });
});

test('modifierClass: 상태별 root modifier class 계약 (§3.2)', () => {
  assert.equal(modifierClass('idle'), 'delivery-status--pending');
  assert.equal(modifierClass('loading'), 'delivery-status--pending');
  assert.equal(modifierClass('delivered'), 'delivery-status--delivered');
  assert.equal(modifierClass('error'), 'delivery-status--error');
});

// --- formatUpdatedAt (ISO 8601) ---------------------------------------------
test('formatUpdatedAt: 유효 시각은 ISO 8601로 반환 (§4.5)', () => {
  const out = formatUpdatedAt('2026-08-01T03:12:00Z');
  assert.match(out, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
  assert.equal(out, '2026-08-01T03:12:00.000Z');
});

test('formatUpdatedAt: 누락/파싱 불가 시 빈 문자열 폴백 (E3)', () => {
  assert.equal(formatUpdatedAt(''), '');
  assert.equal(formatUpdatedAt(undefined), '');
  assert.equal(formatUpdatedAt('not-a-date'), '');
});

// --- fetchDeliveryStatus -----------------------------------------------------
test('fetchDeliveryStatus: 성공 응답을 delivered로 정규화 (AC-3)', async () => {
  const result = await fetchDeliveryStatus('/api/phase21-validation/delivery-status', {
    fetchImpl: async () =>
      fakeResponse({ body: { status: 'delivered', updatedAt: '2026-08-01T03:12:00Z' } }),
  });
  assert.equal(result.state, 'delivered');
  assert.equal(result.updatedAt, '2026-08-01T03:12:00.000Z');
});

test('fetchDeliveryStatus: 5xx 오류는 error로 정규화 (AC-4, E1)', async () => {
  const result = await fetchDeliveryStatus('/api/phase21-validation/delivery-status', {
    fetchImpl: async () => fakeResponse({ ok: false, httpStatus: 500 }),
  });
  assert.equal(result.state, 'error');
});

test('fetchDeliveryStatus: 네트워크 오류는 error로 정규화 (AC-4, E1)', async () => {
  const result = await fetchDeliveryStatus('/api/phase21-validation/delivery-status', {
    fetchImpl: async () => {
      throw new Error('network down');
    },
  });
  assert.equal(result.state, 'error');
});

test('fetchDeliveryStatus: 403 권한 거부는 공통 error 상태로 정규화 (AC-4, E4)', async () => {
  const result = await fetchDeliveryStatus('/api/phase21-validation/delivery-status', {
    fetchImpl: async () => fakeResponse({ ok: false, httpStatus: 403 }),
  });
  assert.equal(result.state, 'error');
});

test('fetchDeliveryStatus: 계약 밖 status 문자열은 error로 안전 폴백 (E2)', async () => {
  const result = await fetchDeliveryStatus('/api/phase21-validation/delivery-status', {
    fetchImpl: async () => fakeResponse({ body: { status: 'weird' } }),
  });
  assert.equal(result.state, 'error');
});

test('fetchDeliveryStatus: 취소(abort)는 idle로 복귀 (E5)', async () => {
  const result = await fetchDeliveryStatus('/api/phase21-validation/delivery-status', {
    fetchImpl: async () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    },
  });
  assert.equal(result.state, 'idle');
});

test('fetchDeliveryStatus: signal을 fetchImpl에 그대로 전달 (E5)', async () => {
  let seenSignal = 'unset';
  const signal = { aborted: false };
  await fetchDeliveryStatus('/api/phase21-validation/delivery-status', {
    signal,
    fetchImpl: async (_url, opts) => {
      seenSignal = opts?.signal;
      return fakeResponse({ body: { status: 'delivered', updatedAt: '2026-08-01T03:12:00Z' } });
    },
  });
  assert.equal(seenSignal, signal);
});

// --- initDeliveryStatus (DOM wiring, fake DOM) -------------------------------
test('initDeliveryStatus: 성공 시 delivered 텍스트와 갱신 시각 렌더 (AC-3)', async () => {
  const { doc, elements } = createFakeDom();
  const fetchImpl = async () =>
    fakeResponse({ body: { status: 'delivered', updatedAt: '2026-08-01T03:12:00Z' } });

  initDeliveryStatus(doc, fetchImpl);
  await flush();

  assert.equal(elements['delivery-status-badge'].textContent, '전달 완료');
  assert.ok(elements['delivery-status-root'].classList.contains('delivery-status--delivered'));
  assert.equal(elements['delivery-status-timestamp'].hidden, false);
  assert.match(elements['delivery-status-timestamp'].textContent, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(elements['delivery-status-refresh'].disabled, false);
});

test('initDeliveryStatus: 실패 시 error 텍스트 표시 + refresh 즉시 재활성 (AC-4)', async () => {
  const { doc, elements } = createFakeDom();
  const fetchImpl = async () => fakeResponse({ ok: false, httpStatus: 500 });

  initDeliveryStatus(doc, fetchImpl);
  await flush();

  assert.equal(elements['delivery-status-badge'].textContent, '전달 상태를 불러오지 못했습니다');
  assert.ok(elements['delivery-status-root'].classList.contains('delivery-status--error'));
  assert.equal(elements['delivery-status-timestamp'].hidden, true);
  assert.equal(elements['delivery-status-refresh'].disabled, false);
});

test('initDeliveryStatus: 재시도 클릭 시 진행 표시 복원 후 refresh 재활성화 (AC-4)', async () => {
  const { doc, elements } = createFakeDom();
  let callCount = 0;
  const fetchImpl = async () => {
    callCount += 1;
    if (callCount === 1) {
      return fakeResponse({ ok: false, httpStatus: 500 });
    }
    return fakeResponse({ body: { status: 'delivered', updatedAt: '2026-08-01T03:12:00Z' } });
  };

  initDeliveryStatus(doc, fetchImpl);
  await flush();
  assert.equal(elements['delivery-status-refresh'].disabled, false);

  elements['delivery-status-refresh'].listeners.click();
  assert.equal(elements['delivery-status-badge'].textContent, '전달 상태 확인 중…');
  assert.equal(elements['delivery-status-refresh'].disabled, true);

  await flush();
  assert.equal(elements['delivery-status-badge'].textContent, '전달 완료');
  assert.equal(elements['delivery-status-refresh'].disabled, false);
});

test('initDeliveryStatus: delivery-status.json 고정 응답을 상대 경로로 fetch (AC-2, plan §4)', async () => {
  const { doc } = createFakeDom();
  let seenUrl = '';
  const fetchImpl = async (url) => {
    seenUrl = String(url);
    return fakeResponse({ body: { status: 'delivered', updatedAt: '2026-08-01T03:12:00Z' } });
  };

  initDeliveryStatus(doc, fetchImpl);
  await flush();

  assert.ok(
    seenUrl.endsWith('/delivery-status.json'),
    `ENDPOINT는 delivery-status.json 고정 응답을 가리켜야 함 (got: ${seenUrl})`,
  );
  assert.ok(
    !seenUrl.includes('/api/'),
    'ENDPOINT는 존재하지 않는 절대 API 경로를 사용하면 안 됨 (AC-2)',
  );
});

test('initDeliveryStatus: 필수 DOM 요소 누락 시 안전하게 null 반환', () => {
  const doc = { getElementById: () => null };
  assert.equal(initDeliveryStatus(doc, async () => fakeResponse({})), null);
});

// --- 정적 계약 가드 (owned 파일의 selector/token 준수) ----------------------
test('index.html: exact DOM ID / 접근성 속성 계약 (§3.1, §3.5)', () => {
  for (const id of [
    'delivery-status-root',
    'delivery-status-badge',
    'delivery-status-timestamp',
    'delivery-status-refresh',
  ]) {
    assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
  }
  assert.ok(html.includes('aria-live="polite"'), 'aria-live 누락');
  assert.ok(html.includes('aria-label="전달 상태 새로고침"'), 'refresh aria-label 누락');
  assert.ok(/<button[^>]*id="delivery-status-refresh"/.test(html), 'refresh는 id를 가진 button이어야 함');
  assert.ok(html.includes('src="./app.js"'), 'runtime script는 app.js를 참조해야 함');
});

test('index.html: exact 디자인 토큰 & class 계약 (§3.2, §3.4)', () => {
  assert.match(html, /--color-status-delivered:\s*#16a34a/);
  assert.match(html, /--color-status-pending:\s*#f59e0b/);
  assert.match(html, /--color-status-error:\s*#dc2626/);
  assert.match(html, /--space-badge-gap:\s*8px/);
  for (const cls of [
    'delivery-status',
    'delivery-status__badge',
    'delivery-status__timestamp',
    'delivery-status--delivered',
    'delivery-status--pending',
    'delivery-status--error',
  ]) {
    assert.ok(html.includes(cls), `missing class ${cls}`);
  }
});
