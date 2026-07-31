// 전달 상태 배지 — 상태 계약 재현/회귀 테스트 (node:test, focused)
// 계약 외 응답의 idle 안전 복귀 + refresh 재활성화 재현, 기존 delivered/failed/cancel 흐름 보존을 검증한다.
// 러너: node --test apps/delivery-status-badge/tests/badge.contract.test.js

import test from 'node:test';
import assert from 'node:assert/strict';

import { createBadgeController } from '../src/badge.js';

// 브라우저 없이 refs 를 주입하기 위한 최소 fake element stub.
function makeElement() {
  const attrs = {};
  return {
    textContent: '',
    disabled: false,
    setAttribute(name, value) {
      attrs[name] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
  };
}

function makeRefs() {
  return { root: makeElement(), status: makeElement(), refresh: makeElement() };
}

// 외부에서 resolve 시점을 제어하기 위한 deferred (resolve 는 즉시 정의됨).
function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// idle 안전 복귀 후조건 (계획 §2.2) 공통 단언.
function assertIdle(controller, refs) {
  assert.equal(controller.getState(), 'idle');
  assert.equal(refs.status.textContent, '대기 중');
  assert.equal(refs.root.getAttribute('data-state'), 'idle');
  assert.equal(refs.status.getAttribute('aria-busy'), 'false');
  assert.equal(refs.refresh.disabled, false);
}

// --- RT: 재현(수정 전 실패 → 수정 후 통과) ---

test('RT-1: 계약 외 status(unknown)는 delivered 로 승격하지 않고 idle 로 복귀한다', async () => {
  const refs = makeRefs();
  const controller = createBadgeController(refs, { fetchStatus: () => Promise.resolve('unknown') });
  await controller.refresh();
  assertIdle(controller, refs);
});

test('RT-2: null/undefined 응답은 idle 로 안전 복귀한다', async () => {
  for (const value of [null, undefined]) {
    const refs = makeRefs();
    const controller = createBadgeController(refs, { fetchStatus: () => Promise.resolve(value) });
    await controller.refresh();
    assertIdle(controller, refs);
  }
});

test('RT-3: loading 응답은 loading 으로 오인하지 않고 idle 로 복귀하며 refresh 가 재활성화된다', async () => {
  const refs = makeRefs();
  const controller = createBadgeController(refs, { fetchStatus: () => Promise.resolve('loading') });
  await controller.refresh();
  assertIdle(controller, refs);
});

// --- RG: 회귀(기존 흐름 보존) ---

test('RG-1: delivered 흐름 보존 — 전달 완료 + control 활성', async () => {
  const refs = makeRefs();
  const controller = createBadgeController(refs, { fetchStatus: () => Promise.resolve('delivered') });
  await controller.refresh();
  assert.equal(controller.getState(), 'delivered');
  assert.equal(refs.status.textContent, '전달 완료');
  assert.equal(refs.root.getAttribute('data-state'), 'delivered');
  assert.equal(refs.refresh.disabled, false);
});

test('RG-2: failed 흐름 보존 — reject 시 전달 실패 + control 활성', async () => {
  const refs = makeRefs();
  const controller = createBadgeController(refs, {
    fetchStatus: () => Promise.reject(new Error('boom')),
  });
  await controller.refresh();
  assert.equal(controller.getState(), 'failed');
  assert.equal(refs.status.textContent, '전달 실패');
  assert.equal(refs.root.getAttribute('data-state'), 'failed');
  assert.equal(refs.refresh.disabled, false);
});

test('RG-3: cancel 흐름 보존 — 진행 중 cancel 후 지연 응답 도착해도 idle 유지', async () => {
  const refs = makeRefs();
  const d = deferred();
  const controller = createBadgeController(refs, { fetchStatus: () => d.promise });
  const pending = controller.refresh();
  controller.cancel();
  d.resolve('delivered'); // 무효화된 stale 응답
  await pending;
  assertIdle(controller, refs);
});

test('RG-4: loading 중 control 비활성 — refresh 직후 응답 전 disabled=true', async () => {
  const refs = makeRefs();
  const d = deferred();
  const controller = createBadgeController(refs, { fetchStatus: () => d.promise });
  const pending = controller.refresh();
  assert.equal(controller.getState(), 'loading');
  assert.equal(refs.status.textContent, '조회 중…');
  assert.equal(refs.refresh.disabled, true);
  d.resolve('delivered'); // 정리
  await pending;
});
