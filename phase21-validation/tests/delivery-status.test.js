import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  STATUS_TEXT,
  normalizeStatus,
  statusText,
  badgeClassName,
  formatUpdatedAt,
  fetchDeliveryStatus,
} from '../src/delivery-status.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');

function fakeResponse({ ok = true, httpStatus = 200, body } = {}) {
  return {
    ok,
    status: httpStatus,
    json: async () => body,
  };
}

// --- normalizeStatus -------------------------------------------------------
test('normalizeStatus: 계약 상태 4종은 그대로 통과', () => {
  for (const s of ['idle', 'loading', 'success', 'error']) {
    assert.equal(normalizeStatus(s), s);
  }
});

test('normalizeStatus: 계약 밖 값은 안전하게 error로 폴백 (E2)', () => {
  assert.equal(normalizeStatus('weird'), 'error');
  assert.equal(normalizeStatus(undefined), 'error');
  assert.equal(normalizeStatus(null), 'error');
});

// --- statusText (색상 비의존 화면 텍스트) ----------------------------------
test('statusText: 각 상태의 화면 텍스트가 계약과 일치 (AC-1~4, AC-6)', () => {
  assert.equal(statusText('idle'), '대기 중');
  assert.equal(statusText('loading'), '불러오는 중');
  assert.equal(statusText('success'), '정상');
  assert.equal(statusText('error'), '오류');
  assert.deepEqual(STATUS_TEXT, {
    idle: '대기 중',
    loading: '불러오는 중',
    success: '정상',
    error: '오류',
  });
});

// --- badgeClassName (exact class 계약) -------------------------------------
test('badgeClassName: 상태별 exact class 계약 (REQ-DS-2)', () => {
  assert.equal(badgeClassName('idle'), 'delivery-status__badge');
  assert.equal(badgeClassName('loading'), 'delivery-status__badge');
  assert.equal(
    badgeClassName('success'),
    'delivery-status__badge delivery-status__badge--success',
  );
  assert.equal(
    badgeClassName('error'),
    'delivery-status__badge delivery-status__badge--error',
  );
});

// --- formatUpdatedAt (ISO 8601) --------------------------------------------
test('formatUpdatedAt: 유효 시각은 ISO 8601로 반환 (AC-3, REQ-DS-3)', () => {
  const out = formatUpdatedAt('2026-07-30T09:00:00Z');
  assert.match(out, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
  assert.equal(out, '2026-07-30T09:00:00.000Z');
});

test('formatUpdatedAt: 누락/파싱 불가 시 빈 문자열 폴백 (E3)', () => {
  assert.equal(formatUpdatedAt(''), '');
  assert.equal(formatUpdatedAt(undefined), '');
  assert.equal(formatUpdatedAt('not-a-date'), '');
});

// --- fetchDeliveryStatus ---------------------------------------------------
test('fetchDeliveryStatus: 성공 응답을 정규화해 반환 (AC-3)', async () => {
  const result = await fetchDeliveryStatus('./api/delivery-status.json', {
    fetchImpl: async () =>
      fakeResponse({ body: { status: 'success', updatedAt: '2026-07-30T09:00:00Z' } }),
  });
  assert.equal(result.status, 'success');
  assert.equal(result.updatedAt, '2026-07-30T09:00:00Z');
  assert.equal(result.message, '');
});

test('fetchDeliveryStatus: HTTP 오류는 error 상태 + 화면 텍스트 (AC-4, E1)', async () => {
  const result = await fetchDeliveryStatus('./api/delivery-status.json', {
    fetchImpl: async () => fakeResponse({ ok: false, httpStatus: 500 }),
  });
  assert.equal(result.status, 'error');
  assert.ok(result.message.length > 0);
});

test('fetchDeliveryStatus: 403 권한 거부는 전용 화면 텍스트로 노출', async () => {
  const result = await fetchDeliveryStatus('./api/delivery-status.json', {
    fetchImpl: async () => fakeResponse({ ok: false, httpStatus: 403 }),
  });
  assert.equal(result.status, 'error');
  assert.equal(result.permissionDenied, true);
  assert.match(result.message, /권한/);
});

test('fetchDeliveryStatus: signal을 fetch 구현으로 전달(취소 배관, E5)', async () => {
  let seenSignal = 'unset';
  const signal = { aborted: false };
  await fetchDeliveryStatus('./api/delivery-status.json', {
    signal,
    fetchImpl: async (_url, opts) => {
      seenSignal = opts?.signal;
      return fakeResponse({ body: { status: 'success', updatedAt: '2026-07-30T09:00:00Z' } });
    },
  });
  assert.equal(seenSignal, signal);
});

// --- 정적 계약 가드 (owned 파일의 selector/token 준수) ----------------------
test('index.html: exact DOM ID / 접근성 속성 계약 (REQ-DS-2, REQ-DS-5)', () => {
  const html = read('index.html');
  for (const id of [
    'delivery-status-root',
    'delivery-status-badge',
    'delivery-status-updated-at',
    'delivery-status-refresh',
  ]) {
    assert.ok(html.includes(`id="${id}"`), `missing id ${id}`);
  }
  assert.ok(html.includes('aria-live="polite"'), 'badge aria-live 누락');
  assert.ok(html.includes('aria-label="전달 상태 새로고침"'), 'refresh aria-label 누락');
  assert.ok(/<button[^>]*id="delivery-status-refresh"/.test(html), 'refresh는 키보드 실행 가능한 button이어야 함');
});

test('styles.css: exact 디자인 토큰 & class 계약 (REQ-DS-2, REQ-DS-6)', () => {
  const css = read('styles.css');
  assert.match(css, /--color-status-success:\s*#16a34a/);
  assert.match(css, /--color-status-error:\s*#dc2626/);
  assert.match(css, /--color-status-neutral:\s*#64748b/);
  assert.match(css, /--space-badge-gap:\s*8px/);
  for (const cls of [
    '.delivery-status',
    '.delivery-status__badge',
    '.delivery-status__badge--success',
    '.delivery-status__badge--error',
    '.delivery-status__updated-at',
    '.delivery-status__refresh',
  ]) {
    assert.ok(css.includes(cls), `missing class ${cls}`);
  }
});
