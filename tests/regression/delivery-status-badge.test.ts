// BF-1232 · delivery-status 배지 회귀 검증
// node --test + node:assert. badge.test.ts(단위) 와 달리 route → fetch 매핑 → badge 상태
// 전체 경로를 실제로 연결해 "frozen ui-contract@v1" 이 회귀하지 않는지 확인한다.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDeliveryStatusBadge,
  requestDeliveryStatus,
} from '../../src/features/delivery-status-badge/badge.ts';
import { handleDeliveryStatusRequest } from '../../src/routes/phase21-validation.ts';

const LOADING_TEXT = '전달 상태 확인 중…';
const ERROR_TEXT = '전달 상태를 불러오지 못했습니다';
const FORBIDDEN_TEXT = '전달 상태 접근 권한이 없습니다';

function makeEl() {
  return {
    textContent: '',
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    getAttribute(name) {
      return this.attrs[name] ?? null;
    },
  };
}

function makeControl() {
  const listeners = {};
  return {
    textContent: '',
    disabled: false,
    attrs: {},
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

// 라우트 응답을 fetch Response-shape 로 감싸 requestDeliveryStatus 에 그대로 주입한다.
function fetchImplFromRoute(routeDeps = {}, authorized = true) {
  return async () => {
    const res = handleDeliveryStatusRequest({ method: 'GET', authorized }, routeDeps);
    return {
      status: res.status,
      ok: res.status === 200,
      json: async () => res.body,
    };
  };
}

// ── 회귀: 성공 응답 → 배지 success 렌더 + control 재활성 ──────────────
test('회귀: route 200 성공 응답이 배지에 success 로 반영되고 control 이 재활성된다', async () => {
  const elements = makeElements();
  const fetchImpl = fetchImplFromRoute(
    {
      loadDeliveryStatus: () => ({
        status: 'delivered',
        label: '전달 완료',
        updatedAt: '2026-07-28T12:00:00.000Z',
      }),
    },
    true,
  );
  const badge = createDeliveryStatusBadge({
    elements,
    fetchStatus: () => requestDeliveryStatus({ fetchImpl }),
  });
  assert.equal(badge.getState(), 'loading');
  assert.equal(elements.refresh.disabled, true);

  await badge.refresh();

  assert.equal(badge.getState(), 'success');
  assert.equal(elements.label.textContent, '전달 완료');
  assert.equal(elements.timestamp.textContent, '2026-07-28T12:00:00.000Z');
  assert.equal(elements.refresh.disabled, false);
});

// ── 회귀: 권한 거부(403) → forbidden 렌더 + control 재활성 ─────────────
test('회귀: route 403 권한 거부 응답이 배지에 forbidden 으로 반영되고 control 이 재활성된다', async () => {
  const elements = makeElements();
  const fetchImpl = fetchImplFromRoute({}, false);
  const badge = createDeliveryStatusBadge({
    elements,
    fetchStatus: () => requestDeliveryStatus({ fetchImpl }),
  });

  await badge.refresh();

  assert.equal(badge.getState(), 'forbidden');
  assert.equal(elements.label.textContent, FORBIDDEN_TEXT);
  assert.equal(elements.refresh.disabled, false);
});

// ── 회귀: 조회 실패(503) → error 렌더, 이전 성공 상태(갱신 시각) 복원, control 재활성 ──
test('회귀: route 503 실패 응답이 배지에 error 로 반영되고 이전 갱신 시각을 복원하며 control 이 재활성된다', async () => {
  const elements = makeElements();
  let authorized = true;
  let shouldFail = false;
  const fetchImpl = async () => {
    const res = handleDeliveryStatusRequest(
      { method: 'GET', authorized },
      shouldFail
        ? {
            loadDeliveryStatus: () => {
              throw new Error('source down');
            },
          }
        : {
            loadDeliveryStatus: () => ({
              status: 'delivered',
              label: '전달 완료',
              updatedAt: '2026-07-28T12:00:00.000Z',
            }),
          },
    );
    return { status: res.status, ok: res.status === 200, json: async () => res.body };
  };
  const badge = createDeliveryStatusBadge({
    elements,
    fetchStatus: () => requestDeliveryStatus({ fetchImpl }),
  });

  await badge.refresh(); // 먼저 success 로 이전 상태(갱신 시각) 확보
  assert.equal(badge.getState(), 'success');

  shouldFail = true;
  await badge.refresh();

  assert.equal(badge.getState(), 'error');
  assert.equal(elements.label.textContent, ERROR_TEXT);
  assert.equal(elements.timestamp.textContent, '2026-07-28T12:00:00.000Z');
  assert.equal(elements.refresh.disabled, false);
});

// ── 회귀: 잘못된 메서드(405) → error 로 안전하게 매핑, control 재활성 ──
test('회귀: route 405(허용되지 않은 메서드) 응답도 배지에서 error 로 안전하게 처리된다', async () => {
  const elements = makeElements();
  const fetchImpl = async () => {
    const res = handleDeliveryStatusRequest({ method: 'POST', authorized: true });
    return { status: res.status, ok: false, json: async () => res.body };
  };
  const badge = createDeliveryStatusBadge({
    elements,
    fetchStatus: () => requestDeliveryStatus({ fetchImpl }),
  });

  await badge.refresh();

  assert.equal(badge.getState(), 'error');
  assert.equal(elements.label.textContent, ERROR_TEXT);
  assert.equal(elements.refresh.disabled, false);
});

// ── 회귀: 새로고침 사이클 반복 시 loading → 결과 텍스트가 매번 정확히 갱신 ──
test('회귀: 성공→실패→성공 반복 새로고침에도 상태·텍스트·control 이 매번 정확히 갱신된다', async () => {
  const elements = makeElements();
  let mode = 'success';
  const fetchImpl = async () => {
    const routeDeps =
      mode === 'success'
        ? {
            loadDeliveryStatus: () => ({
              status: 'delivered',
              label: '전달 완료',
              updatedAt: '2026-07-28T12:00:00.000Z',
            }),
          }
        : { loadDeliveryStatus: () => {
            throw new Error('down');
          } };
    const res = handleDeliveryStatusRequest({ method: 'GET', authorized: true }, routeDeps);
    return { status: res.status, ok: res.status === 200, json: async () => res.body };
  };
  const badge = createDeliveryStatusBadge({
    elements,
    fetchStatus: () => requestDeliveryStatus({ fetchImpl }),
  });

  await badge.refresh();
  assert.equal(badge.getState(), 'success');
  assert.equal(elements.refresh.disabled, false);

  mode = 'fail';
  await badge.refresh();
  assert.equal(badge.getState(), 'error');
  assert.equal(elements.label.textContent, ERROR_TEXT);
  assert.equal(elements.refresh.disabled, false);

  mode = 'success';
  await badge.refresh();
  assert.equal(badge.getState(), 'success');
  assert.equal(elements.label.textContent, '전달 완료');
  assert.equal(elements.refresh.disabled, false);
  assert.equal(badge.getState() === 'loading', false);
});
