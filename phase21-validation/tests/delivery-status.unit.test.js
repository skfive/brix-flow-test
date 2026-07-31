// 전달 상태 배지 unit/integration 테스트 (BF-1372)
// frozen ui-contract@v1 / api-contract@v1 (docs/plans/delivery-status-BF-1370.md §3~6)
// 브라우저/DOM 렌더링·E2E 검증은 downstream tester(BF-1375) 권한 — 여기서는 순수 로직만 검증한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STATUS_LABEL,
  normalizeStatus,
  statusLabel,
  badgeStatus,
  formatUpdatedAt,
  resolveResponse,
  deriveView,
  initialResult,
  fetchDeliveryStatus,
} from '../src/delivery-status.js';

// --- 상태 정규화 (AC-1~4, E3) ---------------------------------------------

test('normalizeStatus: 계약 상태는 그대로 유지한다', () => {
  assert.equal(normalizeStatus('loading'), 'loading');
  assert.equal(normalizeStatus('ready'), 'ready');
  assert.equal(normalizeStatus('error'), 'error');
  assert.equal(normalizeStatus('forbidden'), 'forbidden');
});

test('normalizeStatus: 알 수 없는 값은 error로 폴백한다 (E3)', () => {
  assert.equal(normalizeStatus('unknown'), 'error');
  assert.equal(normalizeStatus(undefined), 'error');
  assert.equal(normalizeStatus(null), 'error');
  assert.equal(normalizeStatus(''), 'error');
});

// --- 상태 텍스트 라벨 (AC-5: 색상 비의존 텍스트) ---------------------------

test('statusLabel: 4개 상태 화면 텍스트 라벨 계약', () => {
  assert.equal(statusLabel('loading'), '진행 중');
  assert.equal(statusLabel('ready'), '전달 완료');
  assert.equal(statusLabel('error'), '오류');
  assert.equal(statusLabel('forbidden'), '권한 없음');
});

test('STATUS_LABEL: 라벨 맵은 불변(frozen)이다', () => {
  assert.throws(() => {
    STATUS_LABEL.ready = '변경';
  }, TypeError);
});

// --- 갱신 시각 (ISO 8601, §4.5 / E1, E7) -----------------------------------

test('formatUpdatedAt: 유효 ISO 8601은 datetime(iso) + 사람이 읽는 표시를 반환한다 (AC-2)', () => {
  const out = formatUpdatedAt('2026-07-31T09:15:00Z');
  assert.equal(out.iso, '2026-07-31T09:15:00.000Z');
  assert.equal(out.display, '2026-07-31 09:15 UTC');
});

test('formatUpdatedAt: null은 표시하지 않는다 (E7, forbidden)', () => {
  assert.equal(formatUpdatedAt(null), null);
  assert.equal(formatUpdatedAt(undefined), null);
  assert.equal(formatUpdatedAt(''), null);
});

test('formatUpdatedAt: 파싱 불가 값은 표시하지 않는다 (E1)', () => {
  assert.equal(formatUpdatedAt('not-a-date'), null);
  assert.equal(formatUpdatedAt('2026-13-99'), null);
});

// --- 응답 해석 (순수, 네트워크 비의존) -------------------------------------

test('resolveResponse: 403은 forbidden + 갱신 시각 미표시 (AC-4, E4)', () => {
  const r = resolveResponse({ httpStatus: 403, ok: false, body: null });
  assert.equal(r.status, 'forbidden');
  assert.equal(r.updatedAt, null);
});

test('resolveResponse: 5xx는 error (AC-3, E5)', () => {
  const r = resolveResponse({ httpStatus: 500, ok: false, body: null });
  assert.equal(r.status, 'error');
  assert.equal(r.updatedAt, null);
});

test('resolveResponse: 200 + ready는 ready + 갱신 시각 유지 (AC-2)', () => {
  const r = resolveResponse({
    httpStatus: 200,
    ok: true,
    body: { status: 'ready', label: '전달 완료', updatedAt: '2026-07-31T09:15:00Z' },
  });
  assert.equal(r.status, 'ready');
  assert.equal(r.updatedAt, '2026-07-31T09:15:00Z');
});

test('resolveResponse: 200 + 알 수 없는 status는 error 폴백 (E3)', () => {
  const r = resolveResponse({ httpStatus: 200, ok: true, body: { status: 'weird' } });
  assert.equal(r.status, 'error');
});

test('resolveResponse: 200 + status error (AC-3)', () => {
  const r = resolveResponse({ httpStatus: 200, ok: true, body: { status: 'error', updatedAt: '2026-07-31T09:15:00Z' } });
  assert.equal(r.status, 'error');
});

// --- 뷰 모델 (deriveView) --------------------------------------------------

test('deriveView: ready는 라벨 + 갱신 시각 표시 (AC-2)', () => {
  const v = deriveView({ status: 'ready', updatedAt: '2026-07-31T09:15:00Z' });
  assert.equal(v.status, 'ready');
  assert.equal(v.label, '전달 완료');
  assert.equal(v.badgeStatus, 'ready');
  assert.equal(v.timestamp.visible, true);
  assert.equal(v.timestamp.iso, '2026-07-31T09:15:00.000Z');
  assert.equal(v.timestamp.display, '2026-07-31 09:15 UTC');
});

test('deriveView: forbidden은 갱신 시각 숨김 (AC-4, E7)', () => {
  const v = deriveView({ status: 'forbidden', updatedAt: null });
  assert.equal(v.label, '권한 없음');
  assert.equal(v.timestamp.visible, false);
});

test('deriveView: 초기값(loading)은 진행 중 + 갱신 시각 숨김 (AC-1, AC-7)', () => {
  const v = deriveView(initialResult());
  assert.equal(v.status, 'loading');
  assert.equal(v.label, '진행 중');
  assert.equal(v.timestamp.visible, false);
});

test('badgeStatus: 색상 토큰은 상태 데이터 속성으로 매핑된다', () => {
  assert.equal(badgeStatus('ready'), 'ready');
  assert.equal(badgeStatus('unknown'), 'error');
});

// --- fetch 통합 (주입 fetchImpl, 네트워크 비의존) --------------------------

function fakeFetch(spec) {
  return async () => {
    if (spec.throws) throw spec.throws;
    return {
      status: spec.httpStatus,
      ok: spec.httpStatus >= 200 && spec.httpStatus < 300,
      async json() {
        if (spec.jsonThrows) throw spec.jsonThrows;
        return spec.body;
      },
    };
  };
}

test('fetchDeliveryStatus: 200 ready (AC-2)', async () => {
  const r = await fetchDeliveryStatus('./data/delivery-status.json', {
    fetchImpl: fakeFetch({ httpStatus: 200, body: { status: 'ready', updatedAt: '2026-07-31T09:15:00Z' } }),
  });
  assert.equal(r.status, 'ready');
  assert.equal(r.updatedAt, '2026-07-31T09:15:00Z');
});

test('fetchDeliveryStatus: 403 forbidden (AC-4)', async () => {
  const r = await fetchDeliveryStatus('./data/delivery-status.json', {
    fetchImpl: fakeFetch({ httpStatus: 403, body: { status: 'forbidden', updatedAt: null } }),
  });
  assert.equal(r.status, 'forbidden');
  assert.equal(r.updatedAt, null);
});

test('fetchDeliveryStatus: 5xx error (AC-3)', async () => {
  const r = await fetchDeliveryStatus('./data/delivery-status.json', {
    fetchImpl: fakeFetch({ httpStatus: 503, body: null }),
  });
  assert.equal(r.status, 'error');
});

test('fetchDeliveryStatus: 네트워크 오류는 error (E5)', async () => {
  const r = await fetchDeliveryStatus('./data/delivery-status.json', {
    fetchImpl: fakeFetch({ throws: new Error('network down') }),
  });
  assert.equal(r.status, 'error');
});

test('fetchDeliveryStatus: JSON 파싱 실패는 error (E2)', async () => {
  const r = await fetchDeliveryStatus('./data/delivery-status.json', {
    fetchImpl: fakeFetch({ httpStatus: 200, jsonThrows: new SyntaxError('bad json') }),
  });
  assert.equal(r.status, 'error');
});

test('fetchDeliveryStatus: AbortError는 재던져 컨트롤러가 초기값 복원하도록 한다 (AC-7)', async () => {
  const abort = new Error('aborted');
  abort.name = 'AbortError';
  await assert.rejects(
    () => fetchDeliveryStatus('./data/delivery-status.json', { fetchImpl: fakeFetch({ throws: abort }) }),
    (e) => e.name === 'AbortError',
  );
});
