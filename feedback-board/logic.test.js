// 순수 로직 단위 테스트 (BF-1170) — node --test feedback-board/logic.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFixture } from './fixtures.js';
import {
  sortFeedback,
  matchesFilters,
  matchesQuery,
  getVisibleFeedback,
  computeKpis,
  validateFeedbackForm,
  canTransition,
  applyTransition,
  nextStatusOf,
  nextFeedbackId,
  createFeedbackRecord,
} from './logic.js';

test('fixture 는 8건이며 status/severity/channel 전체 옵션을 커버한다', () => {
  const list = loadFixture();
  assert.equal(list.length, 8);
  assert.deepEqual([...new Set(list.map((f) => f.status))].sort(), ['done', 'pending_review', 'planned']);
  assert.deepEqual([...new Set(list.map((f) => f.severity))].sort(), ['critical', 'high', 'low', 'medium']);
  assert.deepEqual([...new Set(list.map((f) => f.channel))].sort(), ['email', 'in_app', 'social', 'web_form']);
});

test('sortFeedback: severity 내림차순 → createdAt 오름차순 → id 오름차순 (기획 §5.1)', () => {
  const ordered = sortFeedback(loadFixture()).map((f) => f.id);
  assert.deepEqual(ordered, ['FB-6007', 'FB-6002', 'FB-6003', 'FB-6005', 'FB-6001', 'FB-6008', 'FB-6006', 'FB-6004']);
});

test('sortFeedback 는 원본 배열을 변형하지 않는다', () => {
  const list = loadFixture();
  const before = list.map((f) => f.id);
  sortFeedback(list);
  assert.deepEqual(list.map((f) => f.id), before);
});

test('matchesFilters: 카테고리 내 OR, 카테고리 간 AND, 미선택 전체 통과', () => {
  const fb = loadFixture().find((f) => f.id === 'FB-6002'); // critical/web_form/pending
  assert.ok(matchesFilters(fb, { status: [], severity: [], channel: [] }));
  assert.ok(matchesFilters(fb, { status: ['pending_review'], severity: ['critical', 'high'], channel: [] }));
  assert.ok(!matchesFilters(fb, { status: ['planned'], severity: [], channel: [] }));
  assert.ok(!matchesFilters(fb, { status: [], severity: ['critical'], channel: ['email'] }));
});

test('matchesQuery: 대소문자 무관 substring, 공백만 입력은 전체 통과(EC-04)', () => {
  const fb6005 = loadFixture().find((f) => f.id === 'FB-6005'); // 영문 title
  assert.ok(matchesQuery(fb6005, 'payment'));
  assert.ok(matchesQuery(fb6005, 'PAYMENT'));
  assert.ok(matchesQuery(fb6005, 'fb-6005'));
  assert.ok(matchesQuery(fb6005, '   '));
  assert.ok(!matchesQuery(fb6005, '존재하지않는키워드'));
});

test('getVisibleFeedback 재현 매트릭스 (기획 §7)', () => {
  const list = loadFixture();
  const ids = (fs) => getVisibleFeedback(list, fs).map((f) => f.id);
  // 검색 다건: '요청' → 고정 fixture 제목(§6.2)상 "요청" 포함은 6003, 6006
  // (기획 §7 예시는 6003/6004 로 표기했으나 6004 제목엔 "요청" 미포함 — 제목은 계약상 불변이므로 결정론적 실제값을 따름)
  assert.deepEqual(ids({ query: '요청' }).sort(), ['FB-6003', 'FB-6006']);
  // 검색 단건: '다국어' → 6006
  assert.deepEqual(ids({ query: '다국어' }), ['FB-6006']);
  // 검색 0건
  assert.deepEqual(ids({ query: '존재하지않는키워드' }), []);
  // 필터 다건: severity critical → 6002, 6007 (정렬 순 6007 먼저)
  assert.deepEqual(ids({ selected: { severity: ['critical'] } }), ['FB-6007', 'FB-6002']);
  // 필터+검색 교집합 0건
  assert.deepEqual(ids({ selected: { status: ['done'] }, query: '다크모드' }), []);
});

test('computeKpis 결정론 검증값 (기획 §6.3)', () => {
  const kpi = computeKpis(loadFixture());
  assert.equal(kpi.total, 8);
  assert.deepEqual(kpi.byStatus, { pending_review: 3, planned: 3, done: 2 });
  assert.deepEqual(
    Object.fromEntries(Object.entries(kpi.bySeverity).map(([k, v]) => [k, v.count])),
    { critical: 2, high: 2, medium: 2, low: 2 },
  );
  assert.equal(kpi.bySeverity.critical.pct, 25.0);
  assert.equal(kpi.leadTimeAvg, 10.0); // 리드타임 고정값
});

test('computeKpis: done 0건이면 leadTimeAvg=null (EC-10)', () => {
  const list = loadFixture().filter((f) => f.status !== 'done');
  const kpi = computeKpis(list);
  assert.equal(kpi.doneCount, 0);
  assert.equal(kpi.leadTimeAvg, null);
});

test('validateFeedbackForm: 필수/길이 검증 (기획 §3.3)', () => {
  assert.ok(validateFeedbackForm({ title: '유효한 제목', description: '설명', severity: 'high', channel: 'email' }).valid);
  const empty = validateFeedbackForm({ title: '   ', description: '', severity: '', channel: '' });
  assert.ok(!empty.valid);
  assert.ok(empty.errors.title && empty.errors.description && empty.errors.severity && empty.errors.channel);
  assert.ok(!validateFeedbackForm({ title: 'a'.repeat(101), description: 'x', severity: 'low', channel: 'social' }).valid);
});

test('canTransition 가드 G1/G2/no-op (기획 §4)', () => {
  assert.deepEqual(canTransition('pending_review', 'planned'), { ok: true });
  assert.deepEqual(canTransition('planned', 'done'), { ok: true });
  assert.equal(canTransition('pending_review', 'done').ok, false); // G1
  assert.match(canTransition('pending_review', 'done').reason, /계획 단계/);
  assert.equal(canTransition('planned', 'pending_review').ok, false); // G2
  assert.equal(canTransition('done', 'planned').ok, false); // G2
  assert.deepEqual(canTransition('planned', 'planned'), { ok: false, noop: true }); // EC-01
  assert.equal(nextStatusOf('done'), null);
});

test('applyTransition: done 전환 시 completedAt/history 갱신, 불변', () => {
  const fb = loadFixture().find((f) => f.id === 'FB-6003'); // planned
  const next = applyTransition(fb, 'done', { atIso: '2026-07-20T09:00:00+09:00', eventId: 'EVT-900001' });
  assert.equal(next.status, 'done');
  assert.equal(next.completedAt, '2026-07-20T09:00:00+09:00');
  assert.equal(next.history.length, fb.history.length + 1);
  assert.equal(fb.status, 'planned'); // 원본 불변
  assert.throws(() => applyTransition(fb, 'pending_review', { atIso: 'x', eventId: 'y' }));
});

test('nextFeedbackId / createFeedbackRecord: 신규 등록은 pending_review 고정', () => {
  const list = loadFixture();
  assert.equal(nextFeedbackId(list), 'FB-6009');
  const rec = createFeedbackRecord(
    { title: '  새 피드백  ', description: '  내용  ', severity: 'high', channel: 'in_app' },
    { id: 'FB-6009', atIso: '2026-07-25T09:00:00+09:00' },
  );
  assert.equal(rec.status, 'pending_review');
  assert.equal(rec.title, '새 피드백'); // trim
  assert.equal(rec.completedAt, null);
  assert.deepEqual(rec.history, []);
});
