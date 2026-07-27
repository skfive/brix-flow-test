import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STORAGE_KEY,
  QUADRANTS,
  quadrantKey,
  quadrantOf,
  createTask,
  sanitizeTask,
  filterTasks,
  loadTasks,
  saveTasks,
} from '../app.js';

// ---- 계약 상수 ----
test('STORAGE_KEY 는 고정 계약 키를 사용한다', () => {
  assert.equal(STORAGE_KEY, 'brix.priority-matrix.v1');
});

test('QUADRANTS 는 (urgency,importance) 4조합을 모두 정의한다', () => {
  const combos = QUADRANTS.map((q) => `${q.urgency}-${q.importance}`).sort();
  assert.deepEqual(combos, ['high-high', 'high-low', 'low-high', 'low-low']);
});

// ---- 4분면 배치 ----
test('quadrantKey 는 (urgency,importance) 조합을 반환한다', () => {
  assert.equal(quadrantKey({ urgency: 'high', importance: 'high' }), 'high-high');
  assert.equal(quadrantKey({ urgency: 'low', importance: 'high' }), 'low-high');
  assert.equal(quadrantKey({ urgency: 'high', importance: 'low' }), 'high-low');
  assert.equal(quadrantKey({ urgency: 'low', importance: 'low' }), 'low-low');
});

test('quadrantOf 는 해당 분면 서술자를 반환한다', () => {
  const q = quadrantOf({ urgency: 'high', importance: 'high' });
  assert.equal(q.key, 'high-high');
  assert.ok(typeof q.title === 'string' && q.title.length > 0);
});

// ---- createTask ----
test('createTask 는 스키마 필드만 가진 task 를 생성한다', () => {
  const t = createTask(
    { title: '  보고서 작성 ', description: '분기 요약', urgency: 'high', importance: 'high' },
    1000,
  );
  assert.deepEqual(Object.keys(t).sort(), [
    'createdAt',
    'description',
    'done',
    'id',
    'importance',
    'title',
    'urgency',
  ]);
  assert.equal(t.title, '보고서 작성'); // trim
  assert.equal(t.description, '분기 요약');
  assert.equal(t.urgency, 'high');
  assert.equal(t.importance, 'high');
  assert.equal(t.done, false);
  assert.equal(t.createdAt, 1000);
  assert.ok(typeof t.id === 'string' && t.id.length > 0);
});

test('createTask 는 제목이 비면 예외를 던진다', () => {
  assert.throws(() => createTask({ title: '   ', urgency: 'high', importance: 'high' }, 1));
});

test('createTask 는 잘못된 urgency/importance 를 low 로 기본 처리한다', () => {
  const t = createTask({ title: 'x', urgency: 'nope', importance: undefined }, 1);
  assert.equal(t.urgency, 'low');
  assert.equal(t.importance, 'low');
});

// ---- sanitizeTask ----
test('sanitizeTask 는 스키마 외 필드를 제거하고 유효하지 않으면 null', () => {
  const clean = sanitizeTask({
    id: 'a1',
    title: 'T',
    description: 'D',
    urgency: 'high',
    importance: 'low',
    done: true,
    createdAt: 5,
    hacked: 'x',
  });
  assert.deepEqual(Object.keys(clean).sort(), [
    'createdAt',
    'description',
    'done',
    'id',
    'importance',
    'title',
    'urgency',
  ]);
  assert.equal(clean.hacked, undefined);
  assert.equal(sanitizeTask({ title: 'no id' }), null);
  assert.equal(sanitizeTask(null), null);
  assert.equal(sanitizeTask('str'), null);
});

// ---- filterTasks ----
const sample = [
  { id: '1', title: 'a', description: '', urgency: 'high', importance: 'high', done: false, createdAt: 1 },
  { id: '2', title: 'b', description: '', urgency: 'low', importance: 'low', done: true, createdAt: 2 },
];

test('filterTasks all 은 전체를 반환한다', () => {
  assert.equal(filterTasks(sample, 'all').length, 2);
});
test('filterTasks active 는 진행중만 반환한다', () => {
  const r = filterTasks(sample, 'active');
  assert.equal(r.length, 1);
  assert.equal(r[0].id, '1');
});
test('filterTasks done 은 완료만 반환한다', () => {
  const r = filterTasks(sample, 'done');
  assert.equal(r.length, 1);
  assert.equal(r[0].id, '2');
});
test('filterTasks 는 알 수 없는 필터를 all 로 처리한다', () => {
  assert.equal(filterTasks(sample, 'weird').length, 2);
});

// ---- 저장/복원 (localStorage 스텁) ----
function fakeStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _dump: () => Object.fromEntries(map),
  };
}

test('saveTasks/loadTasks 라운드트립', () => {
  const store = fakeStorage();
  saveTasks(store, sample);
  const restored = loadTasks(store);
  assert.deepEqual(restored, sample);
  // 실제 저장 값은 JSON 직렬화된 배열
  assert.deepEqual(JSON.parse(store._dump()[STORAGE_KEY]), sample);
});

test('loadTasks 는 값이 없으면 빈 배열', () => {
  assert.deepEqual(loadTasks(fakeStorage()), []);
});

test('loadTasks 는 손상된 JSON 을 빈 배열로 복구한다', () => {
  assert.deepEqual(loadTasks(fakeStorage({ [STORAGE_KEY]: '{not json' })), []);
});

test('loadTasks 는 배열이 아니면 빈 배열', () => {
  assert.deepEqual(loadTasks(fakeStorage({ [STORAGE_KEY]: '{"a":1}' })), []);
});

test('loadTasks 는 유효하지 않은 항목을 걸러낸다', () => {
  const raw = JSON.stringify([
    sample[0],
    { junk: true },
    { id: '9', title: 'ok', description: '', urgency: 'low', importance: 'high', done: false, createdAt: 3 },
  ]);
  const r = loadTasks(fakeStorage({ [STORAGE_KEY]: raw }));
  assert.equal(r.length, 2);
  assert.deepEqual(r.map((t) => t.id).sort(), ['1', '9']);
});
