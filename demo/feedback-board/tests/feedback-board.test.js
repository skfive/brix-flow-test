'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const FB = require(path.join(__dirname, '..', 'app.js'));

// ── 고정 시각 헬퍼 (테스트 결정성) ──
const T0 = '2026-07-20T00:00:00.000Z';
const T1 = '2026-07-21T00:00:00.000Z';
const T2 = '2026-07-22T04:00:00.000Z';

// 유효 레코드 생성 헬퍼
function makeRecord(overrides) {
  return Object.assign(
    {
      id: 'id-1',
      title: '제목',
      content: '내용',
      category: 'bug',
      status: 'open',
      createdAt: T0,
      updatedAt: T0,
      statusHistory: [{ status: 'open', at: T0 }],
    },
    overrides || {}
  );
}

// ── AC-1: 데이터 등록 ──
test('AC-1: createFeedback 는 open 상태 + createdAt/updatedAt + statusHistory 로 레코드를 만든다', () => {
  const rec = FB.createFeedback(
    { title: ' 로그인 버그 ', content: ' 대시보드 비어보임 ', category: 'bug' },
    T0
  );
  assert.strictEqual(rec.status, 'open');
  assert.strictEqual(rec.title, '로그인 버그'); // trim
  assert.strictEqual(rec.content, '대시보드 비어보임');
  assert.strictEqual(rec.category, 'bug');
  assert.strictEqual(rec.createdAt, T0);
  assert.strictEqual(rec.updatedAt, T0);
  assert.deepStrictEqual(rec.statusHistory, [{ status: 'open', at: T0 }]);
  assert.match(rec.id, /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
});

test('AC-1: 클라이언트가 status 를 전달해도 항상 open 으로 강제', () => {
  const rec = FB.createFeedback(
    { title: 't', content: 'c', category: 'feature', status: 'done' },
    T0
  );
  assert.strictEqual(rec.status, 'open');
});

// ── AC-2: 필수값 누락 등록 거부 ──
test('AC-2: validateInput 은 제목/내용 공백·잘못된 카테고리를 거부', () => {
  const r1 = FB.validateInput({ title: '   ', content: 'c', category: 'bug' });
  assert.strictEqual(r1.valid, false);
  assert.ok(r1.errors.title);

  const r2 = FB.validateInput({ title: 't', content: '   ', category: 'bug' });
  assert.strictEqual(r2.valid, false);
  assert.ok(r2.errors.content);

  const r3 = FB.validateInput({ title: 't', content: 'c', category: 'nope' });
  assert.strictEqual(r3.valid, false);
  assert.ok(r3.errors.category);

  const r4 = FB.validateInput({ title: 't', content: 'c', category: '' });
  assert.strictEqual(r4.valid, false);
  assert.ok(r4.errors.category);
});

test('AC-2: 유효 입력은 valid true', () => {
  const r = FB.validateInput({ title: 't', content: 'c', category: 'other' });
  assert.strictEqual(r.valid, true);
  assert.deepStrictEqual(r.errors, {});
});

test('AC-2: title 100자 초과 / content 2000자 초과 거부', () => {
  const longTitle = 'a'.repeat(101);
  const longContent = 'a'.repeat(2001);
  assert.strictEqual(FB.validateInput({ title: longTitle, content: 'c', category: 'bug' }).valid, false);
  assert.strictEqual(FB.validateInput({ title: 't', content: longContent, category: 'bug' }).valid, false);
});

test('AC-2: createFeedback 은 잘못된 입력에 대해 throw (저장소 미반영)', () => {
  assert.throws(() => FB.createFeedback({ title: ' ', content: 'c', category: 'bug' }, T0));
});

// ── AC-3 / AC-4: 상태 전이 ──
test('AC-3: transitionsFor 는 허용 전이만 반환', () => {
  assert.deepStrictEqual(FB.transitionsFor('open'), ['planned', 'done']);
  assert.deepStrictEqual(FB.transitionsFor('planned'), ['done']);
  assert.deepStrictEqual(FB.transitionsFor('done'), []);
});

test('AC-3: applyTransition 은 status/updatedAt 갱신 + statusHistory append', () => {
  const rec = makeRecord({ status: 'open', createdAt: T0, updatedAt: T0 });
  const next = FB.applyTransition(rec, 'planned', T1);
  assert.strictEqual(next.status, 'planned');
  assert.strictEqual(next.updatedAt, T1);
  assert.strictEqual(next.statusHistory.length, 2);
  assert.deepStrictEqual(next.statusHistory[1], { status: 'planned', at: T1 });
  // 원본 불변(immutability)
  assert.strictEqual(rec.status, 'open');
  assert.strictEqual(rec.statusHistory.length, 1);
});

test('§4.4: 동일 상태 전이는 no-op (이력 미추가, 원본 반환)', () => {
  const rec = makeRecord({ status: 'open' });
  const next = FB.applyTransition(rec, 'open', T1);
  assert.strictEqual(next.statusHistory.length, 1);
  assert.strictEqual(next.updatedAt, T0);
});

test('AC-4: 금지된 역행 전이는 throw (planned→open, done→planned)', () => {
  assert.throws(() => FB.applyTransition(makeRecord({ status: 'planned' }), 'open', T1));
  assert.throws(() => FB.applyTransition(makeRecord({ status: 'done' }), 'planned', T1));
  assert.throws(() => FB.applyTransition(makeRecord({ status: 'done' }), 'open', T1));
});

// ── AC-5: 필터 결합 ──
test('AC-5: filterItems 는 상태·카테고리 AND 결합 + createdAt 내림차순', () => {
  const items = [
    makeRecord({ id: 'a', status: 'open', category: 'bug', createdAt: '2026-07-01T00:00:00.000Z' }),
    makeRecord({ id: 'b', status: 'open', category: 'feature', createdAt: '2026-07-02T00:00:00.000Z' }),
    makeRecord({ id: 'c', status: 'done', category: 'bug', createdAt: '2026-07-03T00:00:00.000Z' }),
  ];
  const r = FB.filterItems(items, 'open', 'bug');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].id, 'a');

  // all/all → 전체, 최신순
  const all = FB.filterItems(items, 'all', 'all');
  assert.deepStrictEqual(all.map((x) => x.id), ['c', 'b', 'a']);

  // 0건
  assert.strictEqual(FB.filterItems(items, 'planned', 'all').length, 0);
});

// ── AC-9: KPI ──
test('AC-9: computeKpis 전체/상태별/카테고리별/완료율/미처리 정확 계산', () => {
  const items = [
    makeRecord({ id: '1', status: 'open', category: 'bug' }),
    makeRecord({ id: '2', status: 'open', category: 'feature' }),
    makeRecord({ id: '3', status: 'planned', category: 'bug' }),
    makeRecord({ id: '4', status: 'done', category: 'improvement' }),
  ];
  const k = FB.computeKpis(items);
  assert.strictEqual(k.total, 4);
  assert.deepStrictEqual(k.countByStatus, { open: 2, planned: 1, done: 1 });
  assert.strictEqual(k.countByCategory.bug, 2);
  assert.strictEqual(k.openBacklog, 2);
  assert.strictEqual(k.completionRateLabel, '25.0%');
});

test('AC-9: 전체 0건이면 완료율 0%, 평균 처리 시간 "데이터 없음"', () => {
  const k = FB.computeKpis([]);
  assert.strictEqual(k.total, 0);
  assert.strictEqual(k.completionRateLabel, '0%');
  assert.strictEqual(k.avgLeadTimeLabel, '데이터 없음');
  assert.strictEqual(k.avgLeadTimeMs, null);
});

test('AC-9: 평균 처리 시간 = open 최초→done 최초 평균 (done 레코드만)', () => {
  const done1 = makeRecord({
    id: 'd1',
    status: 'done',
    statusHistory: [
      { status: 'open', at: '2026-07-20T00:00:00.000Z' },
      { status: 'done', at: '2026-07-22T00:00:00.000Z' }, // 2일
    ],
  });
  const done2 = makeRecord({
    id: 'd2',
    status: 'done',
    statusHistory: [
      { status: 'open', at: '2026-07-20T00:00:00.000Z' },
      { status: 'planned', at: '2026-07-21T00:00:00.000Z' },
      { status: 'done', at: '2026-07-24T00:00:00.000Z' }, // 4일
    ],
  });
  const openRec = makeRecord({ id: 'o', status: 'open' });
  const k = FB.computeKpis([done1, done2, openRec]);
  // 평균 (2일 + 4일)/2 = 3일
  assert.strictEqual(k.avgLeadTimeMs, 3 * 24 * 60 * 60 * 1000);
  assert.strictEqual(k.avgLeadTimeLabel, '3일');
});

// ── AC-8: JSON 내보내기 ──
test('AC-8: buildExport 는 exportedAt/schemaVersion/items 구조 반환 (저장소 불변)', () => {
  const items = [makeRecord({ id: 'x' })];
  const exp = FB.buildExport(items, T2);
  assert.strictEqual(exp.exportedAt, T2);
  assert.strictEqual(exp.schemaVersion, 1);
  assert.deepStrictEqual(exp.items, items);
  // 빈 배열도 허용
  const empty = FB.buildExport([], T2);
  assert.deepStrictEqual(empty.items, []);
});

test('AC-8: exportFilename 은 feedback-board-export-<YYYYMMDD-HHmmss>.json 형식', () => {
  const name = FB.exportFilename('2026-07-22T04:05:06.000Z');
  assert.strictEqual(name, 'feedback-board-export-20260722-040506.json');
});

// ── AC-6 / AC-7: persist / 손상 복구 ──
test('parseContainer: 정상 컨테이너는 그대로 파싱', () => {
  const raw = JSON.stringify({ schemaVersion: 1, items: [makeRecord({ id: 'ok' })] });
  const r = FB.parseContainer(raw);
  assert.strictEqual(r.corrupted, false);
  assert.strictEqual(r.container.items.length, 1);
  assert.strictEqual(r.droppedCount, 0);
});

test('AC-7: parseContainer 파싱 실패 시 corrupted=true, 빈 컨테이너', () => {
  const r = FB.parseContainer('{not json');
  assert.strictEqual(r.corrupted, true);
  assert.deepStrictEqual(r.container, { schemaVersion: 1, items: [] });
});

test('AC-7: parseContainer 구조 손상(schemaVersion 비숫자/items 비배열) corrupted', () => {
  assert.strictEqual(FB.parseContainer(JSON.stringify({ schemaVersion: 'x', items: [] })).corrupted, true);
  assert.strictEqual(FB.parseContainer(JSON.stringify({ schemaVersion: 1, items: {} })).corrupted, true);
});

test('null/빈 값은 손상 아님 — 최초 방문 빈 컨테이너', () => {
  const r = FB.parseContainer(null);
  assert.strictEqual(r.corrupted, false);
  assert.deepStrictEqual(r.container.items, []);
});

test('§6.2-3: 일부 레코드만 손상 시 해당 레코드만 제외 (corrupted 아님)', () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    items: [
      makeRecord({ id: 'good' }),
      { id: 'bad', title: '', content: 'c', category: 'bug', status: 'open' }, // title 빈값
      { id: 'bad2', title: 't', content: 'c', category: 'unknown', status: 'open' }, // 잘못된 카테고리
    ],
  });
  const r = FB.parseContainer(raw);
  assert.strictEqual(r.corrupted, false);
  assert.strictEqual(r.container.items.length, 1);
  assert.strictEqual(r.container.items[0].id, 'good');
  assert.strictEqual(r.droppedCount, 2);
});

test('AC-7: loadState 는 손상 시 원본 백업 + 빈 컨테이너 재초기화 + recovery 플래그', () => {
  const store = new Map();
  store.set('feedback-board:v1', '{corrupted');
  const storage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  const state = FB.loadState(storage, T2);
  assert.strictEqual(state.recovery, true);
  assert.deepStrictEqual(state.items, []);
  // 백업 key 존재
  const backupKey = [...store.keys()].find((k) => k.startsWith('feedback-board:v1:corrupted:'));
  assert.ok(backupKey, '손상 원본 백업 key 가 있어야 함');
  assert.strictEqual(store.get(backupKey), '{corrupted');
  // 현재 key 는 빈 컨테이너로 재초기화
  assert.deepStrictEqual(JSON.parse(store.get('feedback-board:v1')), { schemaVersion: 1, items: [] });
});

test('saveState 는 컨테이너를 직렬화해 저장', () => {
  const store = new Map();
  const storage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  const items = [makeRecord({ id: 's' })];
  FB.saveState(storage, items);
  assert.deepStrictEqual(JSON.parse(store.get('feedback-board:v1')), { schemaVersion: 1, items });
});
