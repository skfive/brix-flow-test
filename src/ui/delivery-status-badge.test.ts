import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getDeliveryStatus } from '../api/phase21-validation/delivery-status.ts';
import {
  initialView,
  toLoading,
  applyResponse,
  applyNetworkError,
  formatUpdatedAt,
  mapErrorMessage,
  STATE_LABELS,
} from './delivery-status-badge.ts';

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

// ---------------------------------------------------------------------------
// API: GET /api/phase21-validation/delivery-status (read-only, deterministic)
// ---------------------------------------------------------------------------

test('API: 성공 시 200과 success 상태 + ISO 8601 updatedAt + label을 반환한다 (AC-1)', () => {
  const result = getDeliveryStatus();
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, 'success');
  assert.equal(result.body.state, 'success');
  assert.equal(result.body.label, '전달 완료');
  assert.ok('updatedAt' in result.body && result.body.updatedAt, 'updatedAt 필드 존재');
  assert.match(result.body.updatedAt as string, ISO_8601);
});

test('API: DB 변경 없이 결정적(deterministic) 응답을 제공한다', () => {
  const a = getDeliveryStatus();
  const b = getDeliveryStatus();
  assert.deepEqual(a, b);
});

test('API: 권한 거부 시 403과 delivery_status_forbidden을 반환한다 (AC-3)', () => {
  const result = getDeliveryStatus({ authorized: false });
  assert.equal(result.statusCode, 403);
  assert.equal(result.body.status, 'error');
  assert.equal(result.body.state, 'error');
  assert.equal(
    result.body.status === 'error' ? result.body.error.code : '',
    'delivery_status_forbidden',
  );
});

test('API: 내부 조회 실패 시 5xx와 delivery_status_unavailable을 반환한다 (AC-2)', () => {
  const result = getDeliveryStatus({
    source: () => {
      throw new Error('boom');
    },
  });
  assert.ok(result.statusCode >= 500 && result.statusCode < 600, '5xx 상태 코드');
  assert.equal(result.body.status, 'error');
  assert.equal(result.body.state, 'error');
  assert.equal(
    result.body.status === 'error' ? result.body.error.code : '',
    'delivery_status_unavailable',
  );
});

// ---------------------------------------------------------------------------
// UI 상태 머신 (순수 로직 — DOM 비의존)
// ---------------------------------------------------------------------------

test('UI: 초기 뷰는 idle이며 refresh 사용 가능, timestamp 비어 있음', () => {
  const view = initialView();
  assert.equal(view.state, 'idle');
  assert.equal(view.refreshEnabled, true);
  assert.equal(view.label, STATE_LABELS.idle);
  assert.equal(view.timestamp, '');
  assert.equal(view.accent, '');
});

test('UI: loading 진입 시 refresh 비활성(중복 요청 방지) + timestamp 유지 (Edge: 연속 클릭)', () => {
  const prev = applyResponse({
    status: 'success',
    state: 'success',
    updatedAt: '2026-07-29T12:34:56Z',
    label: '전달 완료',
  });
  const view = toLoading(prev);
  assert.equal(view.state, 'loading');
  assert.equal(view.refreshEnabled, false);
  assert.equal(view.label, STATE_LABELS.loading);
  assert.equal(view.timestamp, prev.timestamp); // 마지막 값 보존
});

test('UI: 200 성공 응답 → success 색상/라벨/갱신시각 표시 (AC-1)', () => {
  const view = applyResponse({
    status: 'success',
    state: 'success',
    updatedAt: '2026-07-29T12:34:56Z',
    label: '전달 완료',
  });
  assert.equal(view.state, 'success');
  assert.equal(view.refreshEnabled, true);
  assert.equal(view.label, '전달 완료');
  assert.ok(view.timestamp.length > 0, 'timestamp 표시됨');
  assert.equal(view.accent, 'var(--color-status-success)');
});

test('UI: 5xx 오류 응답 → error 색상/오류 상태명 + refresh 재활성 (AC-2)', () => {
  const view = applyResponse({
    status: 'error',
    state: 'error',
    updatedAt: '2026-07-29T12:34:56Z',
    error: { code: 'delivery_status_unavailable', message: '전달 상태를 조회할 수 없습니다.' },
  });
  assert.equal(view.state, 'error');
  assert.equal(view.refreshEnabled, true); // 재시도 가능
  assert.equal(view.label, '전달 상태를 조회할 수 없습니다.');
  assert.equal(view.accent, 'var(--color-status-error)');
});

test('UI: 403 권한 거부 응답 → error + 권한 오류 상태명 (AC-3)', () => {
  const view = applyResponse({
    status: 'error',
    state: 'error',
    error: { code: 'delivery_status_forbidden', message: '전달 상태 조회 권한이 없습니다.' },
  });
  assert.equal(view.state, 'error');
  assert.equal(view.refreshEnabled, true);
  assert.equal(view.label, '전달 상태 조회 권한이 없습니다.');
});

test('UI: 네트워크 실패 → error로 전이하고 control 재활성 (AC-6, Edge: 타임아웃/중단)', () => {
  const view = applyNetworkError();
  assert.equal(view.state, 'error');
  assert.equal(view.refreshEnabled, true);
  assert.ok(view.label.length > 0, '상태명 텍스트 노출');
});

test('UI: 실패 후 refresh 성공 시 success 텍스트·갱신시각 복원 + control 재활성 (AC-6)', () => {
  const errored = applyNetworkError();
  const loading = toLoading(errored);
  assert.equal(loading.refreshEnabled, false);
  const recovered = applyResponse({
    status: 'success',
    state: 'success',
    updatedAt: '2026-07-29T12:34:56Z',
    label: '전달 완료',
  });
  assert.equal(recovered.state, 'success');
  assert.equal(recovered.label, '전달 완료');
  assert.ok(recovered.timestamp.length > 0);
  assert.equal(recovered.refreshEnabled, true);
});

test('UI: formatUpdatedAt는 유효 ISO 8601을 표시하고, 누락/비 ISO는 방어적으로 빈 문자열 (Edge §9)', () => {
  assert.ok(formatUpdatedAt('2026-07-29T12:34:56Z').length > 0);
  assert.equal(formatUpdatedAt(''), '');
  assert.equal(formatUpdatedAt(undefined), '');
  assert.equal(formatUpdatedAt('not-a-date'), '');
});

test('UI: mapErrorMessage는 code별로 메시지를 분기한다', () => {
  assert.equal(mapErrorMessage('delivery_status_forbidden'), '전달 상태 조회 권한이 없습니다.');
  assert.equal(mapErrorMessage('delivery_status_unavailable'), '전달 상태를 조회할 수 없습니다.');
  assert.ok(mapErrorMessage('unknown_code').length > 0, '알 수 없는 code도 기본 메시지 제공');
});
