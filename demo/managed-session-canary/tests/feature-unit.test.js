// developer 단위 테스트 (BF-1417) — feature.js 순수 로직 검증.
// browser/DOM/E2E 검증은 downstream tester(BF-1420) 소유이므로 여기서는 다루지 않는다.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  FILTER_ALL,
  STATE_TEXT,
  STATUS_LABEL,
  SAMPLE_PERSONAS,
  filterPersonas,
  summarize,
  statusModifierClass,
  initialState,
  reduce,
  derive,
  defaultLoader,
} from '../src/feature.js';

const personas = [
  { personaId: 'p-active', personaName: '알파', status: 'active' },
  { personaId: 'p-idle', personaName: '베타', status: 'idle' },
  { personaId: 'p-error', personaName: '감마', status: 'error' },
  { personaId: 'p-active-2', personaName: '델타', status: 'active' },
];

test('filterPersonas: FILTER_ALL 은 전체를 복사 반환(원본 불변)', () => {
  const out = filterPersonas(personas, FILTER_ALL);
  assert.equal(out.length, 4);
  assert.notEqual(out, personas);
});

test('filterPersonas: 특정 상태만 선별', () => {
  assert.deepEqual(
    filterPersonas(personas, 'active').map((p) => p.personaId),
    ['p-active', 'p-active-2'],
  );
  assert.equal(filterPersonas(personas, 'idle').length, 1);
});

test('filterPersonas: 해당 상태 0건이면 빈 배열', () => {
  const onlyIdle = [{ personaId: 'x', personaName: 'x', status: 'idle' }];
  assert.deepEqual(filterPersonas(onlyIdle, 'error'), []);
});

test('summarize: 상태별 합계 텍스트', () => {
  assert.equal(summarize(personas), '활성 2 · 유휴 1 · 오류 1');
  assert.equal(summarize([]), '활성 0 · 유휴 0 · 오류 0');
});

test('statusModifierClass: frozen 변형 class 매핑', () => {
  assert.equal(statusModifierClass('active'), 'persona-card--active');
  assert.equal(statusModifierClass('idle'), 'persona-card--idle');
  assert.equal(statusModifierClass('error'), 'persona-card--error');
});

test('STATE_TEXT / STATUS_LABEL: frozen 화면 텍스트', () => {
  assert.equal(STATE_TEXT.loading, '세션 상태를 불러오는 중…');
  assert.equal(STATE_TEXT.empty, '해당 상태의 페르소나가 없습니다');
  assert.equal(STATE_TEXT.error, '상태를 불러오지 못했습니다');
  assert.equal(STATUS_LABEL.active, '활성');
  assert.equal(STATUS_LABEL.idle, '유휴');
  assert.equal(STATUS_LABEL.error, '오류');
});

test('reduce/derive: loading 상태 — 필터 비활성', () => {
  const s = reduce(initialState(), { type: 'LOAD_START' });
  assert.equal(s.phase, 'loading');
  const v = derive(s);
  assert.equal(v.view, 'loading');
  assert.equal(v.statusText, STATE_TEXT.loading);
  assert.equal(v.filterEnabled, false);
});

test('reduce/derive: loaded 상태 — 카드/요약/필터 활성', () => {
  const s = reduce(initialState(), { type: 'LOAD_SUCCESS', personas });
  assert.equal(s.phase, 'loaded');
  const v = derive(s);
  assert.equal(v.view, 'loaded');
  assert.equal(v.filterEnabled, true);
  assert.equal(v.cards.length, 4);
  assert.equal(v.summaryText, '활성 2 · 유휴 1 · 오류 1');
});

test('reduce/derive: 필터 선택 → 해당 상태 카드만', () => {
  let s = reduce(initialState(), { type: 'LOAD_SUCCESS', personas });
  s = reduce(s, { type: 'SET_FILTER', filter: 'idle' });
  const v = derive(s);
  assert.equal(v.view, 'loaded');
  assert.equal(v.cards.length, 1);
  assert.equal(v.cards[0].status, 'idle');
});

test('reduce/derive: 필터 0건 → empty + 전체 보기 복원 control', () => {
  let s = reduce(initialState(), {
    type: 'LOAD_SUCCESS',
    personas: [{ personaId: 'x', personaName: 'x', status: 'idle' }],
  });
  s = reduce(s, { type: 'SET_FILTER', filter: 'error' });
  const v = derive(s);
  assert.equal(v.view, 'empty');
  assert.equal(v.emptyText, STATE_TEXT.empty);
  assert.equal(v.restoreEnabled, true);
  assert.equal(v.filterEnabled, true);
});

test('reduce: 전체 보기 → 필터 초기값 복원', () => {
  let s = reduce(initialState(), { type: 'LOAD_SUCCESS', personas });
  s = reduce(s, { type: 'SET_FILTER', filter: 'error' });
  s = reduce(s, { type: 'RESET_FILTER' });
  assert.equal(s.filter, FILTER_ALL);
  assert.equal(derive(s).cards.length, 4);
});

test('reduce/derive: error 상태 — 다시 시도 control 노출, 필터 비활성', () => {
  let s = reduce(initialState(), { type: 'LOAD_START' });
  s = reduce(s, { type: 'LOAD_ERROR', error: new Error('boom') });
  const v = derive(s);
  assert.equal(v.view, 'error');
  assert.equal(v.statusText, STATE_TEXT.error);
  assert.equal(v.retryVisible, true);
  assert.equal(v.filterEnabled, false);
});

test('reduce: error 재시도 → loading 으로 복원(카드/필터 초기화)', () => {
  let s = reduce(initialState(), { type: 'LOAD_SUCCESS', personas });
  s = reduce(s, { type: 'SET_FILTER', filter: 'error' });
  s = reduce(s, { type: 'LOAD_ERROR', error: new Error('x') });
  s = reduce(s, { type: 'LOAD_START' }); // 다시 시도
  assert.equal(s.phase, 'loading');
  assert.equal(s.filter, FILTER_ALL);
  assert.deepEqual(s.personas, []);
  assert.equal(s.error, null);
  assert.equal(derive(s).filterEnabled, false);
});

test('reduce: 알 수 없는 event 는 상태 불변', () => {
  const s = reduce(initialState(), { type: 'LOAD_START' });
  assert.equal(reduce(s, { type: 'NOPE' }), s);
});

test('SAMPLE_PERSONAS: 유효한 카드 데이터 형태', () => {
  assert.ok(SAMPLE_PERSONAS.length > 0);
  for (const p of SAMPLE_PERSONAS) {
    assert.ok(typeof p.personaId === 'string' && p.personaId.length > 0);
    assert.ok(typeof p.personaName === 'string' && p.personaName.length > 0);
    assert.ok(['active', 'idle', 'error'].includes(p.status));
  }
});

test('defaultLoader: 카드 목록 Promise 반환', async () => {
  const data = await defaultLoader();
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0);
});
