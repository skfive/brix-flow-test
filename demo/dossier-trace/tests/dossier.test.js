// focused 단위 테스트 — 순수 로직/fixture 결정론성 검증 (BF-1248)
// 실행: node --test demo/dossier-trace/tests/*.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DOSSIER_ITEMS, loadDossier } from '../fixtures.js';
import {
  APP_STATES,
  STATE_TEXT,
  STATUS_META,
  FILTERS,
  cardVariantClass,
  statusMeta,
  filterItems,
  deriveDisplayState,
  progressSummary,
} from '../app.js';

test('fixture는 결정론적이며 동일 입력에 동일 결과를 반환한다', () => {
  const a = loadDossier();
  const b = loadDossier();
  assert.deepEqual(a, b);
  assert.equal(a.length, DOSSIER_ITEMS.length);
  // deep copy: 원본과 분리되어야 한다
  a[0].title = 'mutated';
  assert.notEqual(loadDossier()[0].title, 'mutated');
});

test('loadDossier({fail:true})는 오류를 던진다 (AC-6 오류 재현)', () => {
  assert.throws(() => loadDossier({ fail: true }), /로드 실패/);
});

test('모든 fixture 항목은 유효한 kind/status를 갖는다', () => {
  const kinds = new Set(['requirement', 'role', 'test']);
  const statuses = new Set(['done', 'progress', 'pending']);
  for (const item of DOSSIER_ITEMS) {
    assert.ok(kinds.has(item.kind), `kind: ${item.kind}`);
    assert.ok(statuses.has(item.status), `status: ${item.status}`);
    assert.ok(item.title && item.detail && item.summary);
  }
});

test('cardVariantClass는 kind를 CSS 변형 class로 매핑한다', () => {
  assert.equal(cardVariantClass('requirement'), 'dossier__card--requirement');
  assert.equal(cardVariantClass('role'), 'dossier__card--role');
  assert.equal(cardVariantClass('test'), 'dossier__card--test');
  assert.equal(cardVariantClass('unknown'), '');
});

test('statusMeta는 아이콘+텍스트+색상 토큰을 병기한다 (접근성 §3.5)', () => {
  assert.equal(statusMeta('done').label, '완료');
  assert.equal(statusMeta('done').token, '--color-status-ready');
  assert.equal(statusMeta('progress').label, '진행');
  assert.equal(statusMeta('progress').token, '--color-status-progress');
  assert.equal(statusMeta('pending').label, '대기');
  // 미지정 상태는 대기로 폴백
  assert.equal(statusMeta('???').label, '대기');
  for (const meta of Object.values(STATUS_META)) {
    assert.ok(meta.icon && meta.label);
  }
});

test('filterItems: all/progress/done 필터가 올바른 부분집합을 반환한다 (AC-3)', () => {
  const items = loadDossier();
  assert.equal(filterItems(items, 'all').length, items.length);
  assert.ok(filterItems(items, 'progress').every((i) => i.status === 'progress'));
  assert.ok(filterItems(items, 'done').every((i) => i.status === 'done'));
  assert.ok(filterItems(items, 'progress').length > 0);
  assert.ok(filterItems(items, 'done').length > 0);
});

test('deriveDisplayState: 네 상태를 정확히 파생한다 (AC-1/2/6)', () => {
  const items = loadDossier();
  assert.equal(deriveDisplayState({ items, filter: 'all', loading: true }), 'loading');
  assert.equal(deriveDisplayState({ items, filter: 'all', error: true }), 'error');
  assert.equal(deriveDisplayState({ items, filter: 'all' }), 'ready');
  assert.equal(deriveDisplayState({ items: [], filter: 'all' }), 'empty');
  // 필터 결과 0건 → empty (AC-2)
  const onlyDone = items.filter((i) => i.status === 'done');
  assert.equal(deriveDisplayState({ items: onlyDone, filter: 'progress' }), 'empty');
  // error가 loading보다 우선
  assert.equal(deriveDisplayState({ items, loading: true, error: true }), 'error');
});

test('상태 상수/텍스트 계약이 유지된다', () => {
  assert.deepEqual(APP_STATES, ['loading', 'empty', 'ready', 'error']);
  for (const s of APP_STATES) {
    assert.ok(typeof STATE_TEXT[s] === 'string' && STATE_TEXT[s].length > 0);
  }
  assert.deepEqual(FILTERS.map((f) => f.id), [
    'dossier-filter-all',
    'dossier-filter-progress',
    'dossier-filter-done',
  ]);
});

test('progressSummary는 상태별 개수를 텍스트로 노출한다 (진행 표시 복원)', () => {
  const items = loadDossier();
  const done = items.filter((i) => i.status === 'done').length;
  const prog = items.filter((i) => i.status === 'progress').length;
  const pend = items.filter((i) => i.status === 'pending').length;
  assert.equal(progressSummary(items), `완료 ${done} · 진행 ${prog} · 대기 ${pend}`);
  assert.equal(progressSummary([]), '완료 0 · 진행 0 · 대기 0');
});
