// BF-1229 · delivery-status 배지 UI + delivery-status API 단위·통합 테스트
// vanilla-static(ESM) 저장소: node --test + node:assert, node의 .ts 타입 스트리핑으로 실행.
// DOM 의존은 element/fetch 주입으로 격리하여 jsdom 없이 상태·텍스트·control 재활성을 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDeliveryStatusBadge,
  mountDeliveryStatusBadge,
  requestDeliveryStatus,
} from './badge.ts';
import { handleDeliveryStatusRequest } from '../../routes/phase21-validation.ts';

const LOADING_TEXT = '전달 상태 확인 중…';
const ERROR_TEXT = '전달 상태를 불러오지 못했습니다';
const FORBIDDEN_TEXT = '전달 상태 접근 권한이 없습니다';

function makeEl() {
  return {
    textContent: '',
    attrs: /** @type {Record<string, string>} */ ({}),
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    getAttribute(name) {
      return this.attrs[name] ?? null;
    },
  };
}

function makeControl() {
  const listeners = /** @type {Record<string, Array<() => void>>} */ ({});
  return {
    textContent: '',
    disabled: false,
    attrs: /** @type {Record<string, string>} */ ({}),
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    getAttribute(name) {
      return this.attrs[name] ?? null;
    },
    addEventListener(type, handler) {
      (listeners[type] ??= []).push(handler);
    },
    click() {
      for (const handler of listeners.click ?? []) handler();
    },
  };
}

function makeElements() {
  return {
    root: makeEl(),
    label: makeEl(),
    timestamp: makeEl(),
    refresh: makeControl(),
  };
}

const okData = {
  status: 'delivered',
  label: '전달 완료',
  updatedAt: '2026-07-28T12:00:00.000Z',
};

// ── AC-1 · 로딩 초기 상태 ──────────────────────────────────────────────
test('AC-1: 생성 직후 loading 텍스트 표시 + 새로고침 control 비활성', () => {
  const elements = makeElements();
  const badge = createDeliveryStatusBadge({
    elements,
    fetchStatus: async () => ({ kind: 'success', data: okData }),
  });
  assert.equal(badge.getState(), 'loading');
  assert.equal(elements.label.textContent, LOADING_TEXT);
  assert.equal(elements.refresh.disabled, true);
});

// ── AC-6 · 접근성 (초기 배선) ─────────────────────────────────────────
test('AC-6: root aria-live=polite, refresh aria-label 설정', () => {
  const elements = makeElements();
  createDeliveryStatusBadge({
    elements,
    fetchStatus: async () => ({ kind: 'success', data: okData }),
  });
  assert.equal(elements.root.getAttribute('aria-live'), 'polite');
  assert.equal(elements.refresh.getAttribute('aria-label'), '전달 상태 새로고침');
});

// ── AC-2 · 성공 응답 렌더링 ───────────────────────────────────────────
test('AC-2: success 시 라벨 + ISO8601 갱신 시각 표시, control 재활성', async () => {
  const elements = makeElements();
  const badge = createDeliveryStatusBadge({
    elements,
    fetchStatus: async () => ({ kind: 'success', data: okData }),
  });
  await badge.refresh();
  assert.equal(badge.getState(), 'success');
  assert.equal(elements.label.textContent, '전달 완료');
  assert.equal(elements.timestamp.textContent, '2026-07-28T12:00:00.000Z');
  assert.equal(elements.refresh.disabled, false);
});

// ── AC-3 · 조회 실패 처리 ─────────────────────────────────────────────
test('AC-3: error 시 실패 텍스트 표시, 이전 상태(갱신 시각) 복원, control 재활성', async () => {
  const elements = makeElements();
  let result = { kind: 'success', data: okData };
  const badge = createDeliveryStatusBadge({
    elements,
    fetchStatus: async () => result,
  });
  await badge.refresh(); // 먼저 success 로 이전 상태 확보
  result = { kind: 'error' };
  await badge.refresh();
  assert.equal(badge.getState(), 'error');
  assert.equal(elements.label.textContent, ERROR_TEXT);
  // 이전 상태 복원: 마지막 성공 갱신 시각 유지
  assert.equal(elements.timestamp.textContent, '2026-07-28T12:00:00.000Z');
  assert.equal(elements.refresh.disabled, false);
});

test('AC-3: fetchStatus 예외(네트워크 오류)도 error 로 처리', async () => {
  const elements = makeElements();
  const badge = createDeliveryStatusBadge({
    elements,
    fetchStatus: async () => {
      throw new Error('network down');
    },
  });
  await badge.refresh();
  assert.equal(badge.getState(), 'error');
  assert.equal(elements.label.textContent, ERROR_TEXT);
  assert.equal(elements.refresh.disabled, false);
});

// ── AC-4 · 권한 거부 처리 ─────────────────────────────────────────────
test('AC-4: forbidden 시 권한 없음 텍스트 표시, control 재활성', async () => {
  const elements = makeElements();
  const badge = createDeliveryStatusBadge({
    elements,
    fetchStatus: async () => ({ kind: 'forbidden' }),
  });
  await badge.refresh();
  assert.equal(badge.getState(), 'forbidden');
  assert.equal(elements.label.textContent, FORBIDDEN_TEXT);
  assert.equal(elements.refresh.disabled, false);
});

// ── AC-5 · 새로고침 재조회 ────────────────────────────────────────────
test('AC-5: 새로고침 클릭 시 loading 전이 후 응답 반영', async () => {
  const elements = makeElements();
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  let calls = 0;
  const badge = mountDeliveryStatusBadge({
    elements,
    fetchStatus: async () => {
      calls += 1;
      if (calls === 1) return { kind: 'forbidden' };
      await gate;
      return { kind: 'success', data: okData };
    },
  });
  await badge.ready; // 초기 로드(forbidden)
  assert.equal(badge.getState(), 'forbidden');

  elements.refresh.click();
  // click 직후 loading 전이 + control 비활성
  assert.equal(badge.getState(), 'loading');
  assert.equal(elements.label.textContent, LOADING_TEXT);
  assert.equal(elements.refresh.disabled, true);

  release();
  await badge.pending;
  assert.equal(badge.getState(), 'success');
  assert.equal(elements.label.textContent, '전달 완료');
  assert.equal(elements.refresh.disabled, false);
});

// ── Edge · 조회 취소(진행 중 새 요청이 이전 응답을 덮지 않음) ──────────
test('Edge: 앞선 요청이 뒤늦게 resolve 해도 최신 상태를 덮어쓰지 않음', async () => {
  const elements = makeElements();
  const gates = [];
  let idx = 0;
  const badge = createDeliveryStatusBadge({
    elements,
    fetchStatus: async () => {
      const my = idx++;
      await new Promise((r) => gates.push(r));
      return my === 0
        ? { kind: 'forbidden' }
        : { kind: 'success', data: okData };
    },
  });
  const first = badge.refresh();
  const second = badge.refresh();
  // 두 번째(최신)를 먼저 resolve
  gates[1]();
  await second;
  assert.equal(badge.getState(), 'success');
  // 뒤늦게 첫 번째 resolve — 최신 success 를 덮지 않아야 함
  gates[0]();
  await first;
  assert.equal(badge.getState(), 'success');
  assert.equal(elements.label.textContent, '전달 완료');
});

// ── mount: contract selector 배선 (tiny fake document) ────────────────
test('mountDeliveryStatusBadge: contract selector 로 요소 조회', async () => {
  const root = makeEl();
  const label = makeEl();
  const timestamp = makeEl();
  const refresh = makeControl();
  root.querySelector = (sel) => {
    if (sel === '.delivery-status__label') return label;
    if (sel === '.delivery-status__timestamp') return timestamp;
    return null;
  };
  const doc = {
    getElementById: (id) => {
      if (id === 'delivery-status-badge') return root;
      if (id === 'delivery-status-refresh') return refresh;
      return null;
    },
  };
  const badge = mountDeliveryStatusBadge({
    document: doc,
    fetchStatus: async () => ({ kind: 'success', data: okData }),
  });
  await badge.ready;
  assert.equal(label.textContent, '전달 완료');
  assert.equal(timestamp.textContent, '2026-07-28T12:00:00.000Z');
  assert.equal(refresh.getAttribute('aria-label'), '전달 상태 새로고침');
});

// ── requestDeliveryStatus: HTTP 상태 → fetch result 매핑 ──────────────
test('requestDeliveryStatus: 200 → success', async () => {
  const fetchImpl = async () => ({
    status: 200,
    ok: true,
    json: async () => okData,
  });
  const result = await requestDeliveryStatus({ fetchImpl });
  assert.deepEqual(result, { kind: 'success', data: okData });
});

test('requestDeliveryStatus: 403 → forbidden', async () => {
  const fetchImpl = async () => ({
    status: 403,
    ok: false,
    json: async () => ({ error: 'forbidden', message: FORBIDDEN_TEXT }),
  });
  const result = await requestDeliveryStatus({ fetchImpl });
  assert.equal(result.kind, 'forbidden');
});

test('requestDeliveryStatus: 5xx/네트워크 → error', async () => {
  const fetchImpl = async () => ({
    status: 503,
    ok: false,
    json: async () => ({ error: 'delivery_status_unavailable', message: ERROR_TEXT }),
  });
  const result = await requestDeliveryStatus({ fetchImpl });
  assert.equal(result.kind, 'error');

  const throwing = async () => {
    throw new Error('offline');
  };
  const result2 = await requestDeliveryStatus({ fetchImpl: throwing });
  assert.equal(result2.kind, 'error');
});

// ── API 라우트 · GET /api/phase21-validation/delivery-status ──────────
test('route: 성공 시 200 + status/label/ISO8601 updatedAt', () => {
  const res = handleDeliveryStatusRequest(
    { method: 'GET', authorized: true },
    {
      loadDeliveryStatus: () => ({
        status: 'delivered',
        label: '전달 완료',
        updatedAt: '2026-07-28T12:00:00.000Z',
      }),
    },
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'delivered');
  assert.equal(res.body.label, '전달 완료');
  assert.match(
    res.body.updatedAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
  );
});

test('route: 기본 loader 도 ISO8601 updatedAt 을 반환', () => {
  const res = handleDeliveryStatusRequest({ method: 'GET', authorized: true });
  assert.equal(res.status, 200);
  assert.equal(Number.isNaN(Date.parse(res.body.updatedAt)), false);
});

test('route: 권한 거부 시 403 forbidden', () => {
  const res = handleDeliveryStatusRequest({ method: 'GET', authorized: false });
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'forbidden');
  assert.equal(res.body.message, FORBIDDEN_TEXT);
});

test('route: 잘못된 요청(GET 아님) 시 안정된 오류 코드', () => {
  const res = handleDeliveryStatusRequest({ method: 'POST', authorized: true });
  assert.equal(res.status, 405);
  assert.equal(res.body.error, 'method_not_allowed');
});

test('route: loader 실패/비 ISO8601 시 503 delivery_status_unavailable', () => {
  const thrown = handleDeliveryStatusRequest(
    { method: 'GET', authorized: true },
    {
      loadDeliveryStatus: () => {
        throw new Error('source down');
      },
    },
  );
  assert.equal(thrown.status, 503);
  assert.equal(thrown.body.error, 'delivery_status_unavailable');
  assert.equal(thrown.body.message, ERROR_TEXT);

  const badIso = handleDeliveryStatusRequest(
    { method: 'GET', authorized: true },
    {
      loadDeliveryStatus: () => ({
        status: 'delivered',
        label: '전달 완료',
        updatedAt: 'not-a-date',
      }),
    },
  );
  assert.equal(badIso.status, 503);
  assert.equal(badIso.body.error, 'delivery_status_unavailable');
});
