import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createDeliveryStatusBadge,
  ACCENT_SUCCESS,
  ACCENT_ERROR,
} from '../src/ui/delivery-status-badge.ts';

/**
 * BF-1257 — 전달 상태 회귀 가드.
 *
 * dev(BF-1254)가 src/ui/delivery-status-badge.test.ts 에서 이미 검증한
 * 순수 상태 함수(initialView/toLoading/applyResponse/applyNetworkError/
 * formatUpdatedAt/mapErrorMessage)와 API 응답(getDeliveryStatus) 단위 결과는
 * 재검증하지 않는다.
 *
 * 이 파일은 tester 고유 영역만 다룬다:
 * - frozen DOM selector(§4) 마크업 contract — id/class/aria 속성이 실제로 생성되는가
 * - createDeliveryStatusBadge 의 실제 인터랙션(refresh 클릭 → idle→loading→success/error 전이)
 *   — dev 테스트는 순수 함수만 개별 검증했고, DOM 바인딩 컨트롤러 자체는 검증하지 않았다.
 */

// ---------------------------------------------------------------------------
// 최소 DOM stub — headless 검증 프로필(browser_evidence_required=false)에 따라
// 실 브라우저/jsdom 없이 createDeliveryStatusBadge 가 실제로 호출하는 DOM API
// 표면(createElement/append/dataset/style.setProperty/addEventListener 등)만
// 흉내 낸다.
// ---------------------------------------------------------------------------

function makeFakeElement(tag: string) {
  const attrs: Record<string, string> = {};
  const listeners: Record<string, () => void> = {};
  return {
    tagName: tag,
    id: '',
    className: '',
    type: '',
    textContent: '',
    disabled: false,
    dataset: {} as Record<string, string | undefined>,
    style: {
      _props: {} as Record<string, string>,
      setProperty(name: string, value: string) {
        this._props[name] = value;
      },
    },
    children: [] as ReturnType<typeof makeFakeElement>[],
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    },
    getAttribute(name: string): string | undefined {
      return attrs[name];
    },
    removeAttribute(name: string) {
      delete attrs[name];
    },
    append(...nodes: ReturnType<typeof makeFakeElement>[]) {
      this.children.push(...nodes);
    },
    addEventListener(type: string, handler: () => void) {
      listeners[type] = handler;
    },
    click() {
      listeners.click?.();
    },
  };
}

function createFakeRoot() {
  const root = makeFakeElement('div');
  (root as any).ownerDocument = {
    createElement: (tag: string) => makeFakeElement(tag),
  };
  return root;
}

function mountBadge(fetchStatus: () => Promise<any>) {
  const root = createFakeRoot();
  const controller = createDeliveryStatusBadge(root as any, fetchStatus);
  const badge = root.children[0];
  const [label, timestamp, refreshBtn] = badge.children;
  return { root, badge, label, timestamp, refreshBtn, controller };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// ---------------------------------------------------------------------------
// 마크업 contract (frozen §4 selector/§6 접근성) — silent break 가드
// ---------------------------------------------------------------------------

test('마크업: frozen DOM id/class/aria 속성이 그대로 생성된다 (§4, §6)', () => {
  const { badge, label, timestamp, refreshBtn } = mountBadge(async () => {
    throw new Error('unused');
  });

  assert.equal(badge.id, 'delivery-status-badge');
  assert.equal(badge.className, 'delivery-badge');
  assert.equal(badge.getAttribute('aria-live'), 'polite');

  assert.equal(label.className, 'delivery-badge__label');

  assert.equal(timestamp.id, 'delivery-status-updated-at');
  assert.equal(timestamp.className, 'delivery-badge__timestamp');

  assert.equal(refreshBtn.id, 'delivery-status-refresh');
  assert.equal(refreshBtn.className, 'delivery-badge__refresh');
  assert.equal(refreshBtn.type, 'button');
  assert.equal(refreshBtn.getAttribute('aria-label'), '전달 상태 새로고침');
});

test('마크업: 초기 렌더는 idle 상태를 화면에 반영한다', () => {
  const { badge, refreshBtn } = mountBadge(async () => {
    throw new Error('unused');
  });
  assert.equal(badge.dataset.state, 'idle');
  assert.equal(refreshBtn.disabled, false);
});

// ---------------------------------------------------------------------------
// 인터랙션: idle → loading → success (AC-1)
// ---------------------------------------------------------------------------

test('인터랙션: refresh 클릭 → loading 전이 → 200 응답 시 success 표시 (AC-1)', async () => {
  const d = deferred<any>();
  const { badge, label, timestamp, refreshBtn } = mountBadge(() => d.promise);

  refreshBtn.click();
  await flush();

  // loading: refresh 비활성 + 진행 표시
  assert.equal(badge.dataset.state, 'loading');
  assert.equal(refreshBtn.disabled, true);

  d.resolve({
    status: 'success',
    state: 'success',
    updatedAt: '2026-07-29T12:34:56Z',
    label: '전달 완료',
  });
  await flush();

  assert.equal(badge.dataset.state, 'success');
  assert.equal(label.textContent, '전달 완료');
  assert.ok(timestamp.textContent.length > 0, '갱신 시각 표시됨');
  assert.equal(timestamp.getAttribute('datetime'), timestamp.textContent);
  assert.equal(refreshBtn.disabled, false);
  assert.equal(badge.style._props['--badge-accent'], ACCENT_SUCCESS);
});

// ---------------------------------------------------------------------------
// 인터랙션: idle → loading → error, 5xx (AC-2)
// ---------------------------------------------------------------------------

test('인터랙션: refresh 실행 → 5xx 응답 시 error 표시 + control 재활성 (AC-2)', async () => {
  const d = deferred<any>();
  const { badge, label, refreshBtn, controller } = mountBadge(() => d.promise);

  void controller.refresh();
  await flush();
  assert.equal(badge.dataset.state, 'loading');

  d.resolve({
    status: 'error',
    state: 'error',
    updatedAt: '2026-07-29T12:34:56Z',
    error: { code: 'delivery_status_unavailable', message: '전달 상태를 조회할 수 없습니다.' },
  });
  await flush();

  assert.equal(badge.dataset.state, 'error');
  assert.equal(label.textContent, '전달 상태를 조회할 수 없습니다.');
  assert.equal(refreshBtn.disabled, false, '재시도 가능해야 한다');
  assert.equal(badge.style._props['--badge-accent'], ACCENT_ERROR);
});

// ---------------------------------------------------------------------------
// 인터랙션: idle → loading → error, 권한 거부 403 (AC-3)
// ---------------------------------------------------------------------------

test('인터랙션: refresh 실행 → 403 권한 거부 응답 시 error + 권한 메시지 (AC-3)', async () => {
  const d = deferred<any>();
  const { badge, label, refreshBtn, controller } = mountBadge(() => d.promise);

  void controller.refresh();
  await flush();

  d.resolve({
    status: 'error',
    state: 'error',
    error: { code: 'delivery_status_forbidden', message: '전달 상태 조회 권한이 없습니다.' },
  });
  await flush();

  assert.equal(badge.dataset.state, 'error');
  assert.equal(label.textContent, '전달 상태 조회 권한이 없습니다.');
  assert.equal(refreshBtn.disabled, false);
});

// ---------------------------------------------------------------------------
// 인터랙션: 네트워크 실패 → error → control 재활성 → 재조회 성공 (AC-6)
// ---------------------------------------------------------------------------

test('인터랙션: 네트워크 실패 시 error 전이 후 재조회로 success 복구된다 (AC-6)', async () => {
  let current = deferred<any>();
  const { badge, label, timestamp, refreshBtn, controller } = mountBadge(() => current.promise);

  // 1차 refresh — 네트워크 실패
  void controller.refresh();
  await flush();
  assert.equal(badge.dataset.state, 'loading');
  current.reject(new Error('network down'));
  await flush();

  assert.equal(badge.dataset.state, 'error');
  assert.equal(refreshBtn.disabled, false, '실패 후에도 재시도 가능해야 한다 (AC-6 불변식)');

  // 2차 refresh — 재시도 성공 시 success로 복구
  current = deferred<any>();
  void controller.refresh();
  await flush();
  assert.equal(badge.dataset.state, 'loading');
  current.resolve({
    status: 'success',
    state: 'success',
    updatedAt: '2026-07-29T12:34:56Z',
    label: '전달 완료',
  });
  await flush();

  assert.equal(badge.dataset.state, 'success');
  assert.equal(label.textContent, '전달 완료');
  assert.ok(timestamp.textContent.length > 0);
  assert.equal(refreshBtn.disabled, false);
});

// ---------------------------------------------------------------------------
// 회귀: loading 중 연속 클릭은 중복 요청을 만들지 않는다 (§9)
// ---------------------------------------------------------------------------

test('회귀: loading 중 refresh 재클릭은 무시된다 (중복 요청 방지, §9)', async () => {
  let callCount = 0;
  const d = deferred<any>();
  const { refreshBtn, badge } = mountBadge(() => {
    callCount += 1;
    return d.promise;
  });

  refreshBtn.click();
  await flush();
  assert.equal(badge.dataset.state, 'loading');

  // loading 중 재클릭 — refreshEnabled=false 이므로 fetchStatus 재호출되지 않아야 한다
  refreshBtn.click();
  refreshBtn.click();
  await flush();

  assert.equal(callCount, 1, 'loading 중 중복 요청이 발생하면 안 된다');

  d.resolve({
    status: 'success',
    state: 'success',
    updatedAt: '2026-07-29T12:34:56Z',
    label: '전달 완료',
  });
  await flush();
  assert.equal(badge.dataset.state, 'success');
});

// ---------------------------------------------------------------------------
// 회귀: reset()은 진행 중 상태와 무관하게 idle로 되돌리고 control을 재활성화한다
// ---------------------------------------------------------------------------

test('회귀: reset()은 항상 idle 상태와 refresh 활성으로 되돌린다', async () => {
  const d = deferred<any>();
  const { badge, refreshBtn, controller } = mountBadge(() => d.promise);

  void controller.refresh();
  await flush();
  assert.equal(badge.dataset.state, 'loading');

  controller.reset();
  assert.equal(badge.dataset.state, 'idle');
  assert.equal(refreshBtn.disabled, false);
});
