// BF-1087 릴리스 노트 요약 보드 — 단위 테스트 (기획 §4~§6, AC-1~AC-6)
// 실행: node --test tests/release-notes-BF1087.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validateSummaryInput } from '../src/features/release-notes/validation.js';
import { computeKpi, toRatio } from '../src/features/release-notes/kpi.js';
import { createReleaseNotesService } from '../src/features/release-notes/service.js';
import { createInMemoryStore } from '../src/features/release-notes/store.js';
import {
  renderImpBadge,
  renderImpactChip,
  renderSummaryCard,
  renderValidateResult,
  renderEmptyState,
  renderKpiBar,
  renderCardList,
} from '../src/features/release-notes/render.js';

/** 유효한 기본 입력 팩토리. */
function validInput(overrides = {}) {
  return {
    title: '2026.07 릴리스',
    changes: ['로그인 속도 개선', '결제 버그 수정'],
    importance: 'high',
    userImpact: 'minor',
    ...overrides,
  };
}

// ─────────────────────────── 검증 (기획 §4, AC-2) ───────────────────────────

test('validateSummaryInput: 유효 입력은 valid=true, 오류 없음', () => {
  const result = validateSummaryInput(validInput());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('validateSummaryInput: 제목 공백만이면 title 오류', () => {
  const result = validateSummaryInput(validInput({ title: '   ' }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.field === 'title'));
});

test('validateSummaryInput: 제목 200자 초과 거부', () => {
  const result = validateSummaryInput(validInput({ title: 'a'.repeat(201) }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.field === 'title' && /200/.test(e.reason)));
});

test('validateSummaryInput: changes 빈 배열 거부', () => {
  const result = validateSummaryInput(validInput({ changes: [] }));
  assert.ok(result.errors.some((e) => e.field === 'changes'));
});

test('validateSummaryInput: changes 항목 공백은 인덱스 명시', () => {
  const result = validateSummaryInput(validInput({ changes: ['정상', '  '] }));
  assert.ok(result.errors.some((e) => e.field === 'changes[1]'));
});

test('validateSummaryInput: changes 51개 초과 거부', () => {
  const result = validateSummaryInput(validInput({ changes: Array(51).fill('x') }));
  assert.ok(result.errors.some((e) => e.field === 'changes'));
});

test('validateSummaryInput: changes 항목 300자 초과 거부', () => {
  const result = validateSummaryInput(validInput({ changes: ['a'.repeat(301)] }));
  assert.ok(result.errors.some((e) => e.field === 'changes[0]'));
});

test('validateSummaryInput: importance 미선택 거부', () => {
  const result = validateSummaryInput(validInput({ importance: '' }));
  assert.ok(result.errors.some((e) => e.field === 'importance'));
});

test('validateSummaryInput: importance 허용 enum 외 거부(대소문자 상이 포함)', () => {
  const result = validateSummaryInput(validInput({ importance: 'HIGH' }));
  assert.ok(result.errors.some((e) => e.field === 'importance'));
});

test('validateSummaryInput: userImpact 허용 enum 외 거부', () => {
  const result = validateSummaryInput(validInput({ userImpact: 'catastrophic' }));
  assert.ok(result.errors.some((e) => e.field === 'userImpact'));
});

test('validateSummaryInput: 다중 실패 필드를 한 번에 모두 반환 (기획 §4)', () => {
  const result = validateSummaryInput({ title: '', changes: [], importance: 'x', userImpact: 'y' });
  const fields = result.errors.map((e) => e.field);
  assert.ok(fields.includes('title'));
  assert.ok(fields.includes('changes'));
  assert.ok(fields.includes('importance'));
  assert.ok(fields.includes('userImpact'));
});

test('validateSummaryInput: 객체가 아닌 본문은 요청 레벨 오류로 구분', () => {
  const result = validateSummaryInput('malformed');
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].field, '_request');
});

// ─────────────────────── 서비스 create (기획 §5.1, AC-1) ───────────────────

test('create: 유효 입력은 201 + id/createdAt 부여, title/changes trim', () => {
  const service = createReleaseNotesService({
    now: () => new Date('2026-07-23T00:00:00.000Z'),
    generateId: () => 'fixed-id',
  });
  const res = service.create(validInput({ title: '  제목  ', changes: [' a ', 'b'] }));
  assert.equal(res.status, 201);
  assert.equal(res.body.id, 'fixed-id');
  assert.equal(res.body.title, '제목');
  assert.deepEqual(res.body.changes, ['a', 'b']);
  assert.equal(res.body.createdAt, '2026-07-23T00:00:00.000Z');
});

test('create: 검증 실패는 400 + errors, 저장 안 됨 (AC-2)', () => {
  const service = createReleaseNotesService();
  const res = service.create(validInput({ title: '' }));
  assert.equal(res.status, 400);
  assert.ok(Array.isArray(res.body.errors) && res.body.errors.length > 0);
  assert.equal(service.store.size(), 0);
  assert.deepEqual(service.list().body, []);
});

test('create: importance/userImpact 독립 조합 저장 (AC-4)', () => {
  const service = createReleaseNotesService();
  const a = service.create(validInput({ importance: 'critical', userImpact: 'none' }));
  const b = service.create(validInput({ importance: 'low', userImpact: 'breaking' }));
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.equal(a.body.importance, 'critical');
  assert.equal(a.body.userImpact, 'none');
  assert.equal(b.body.importance, 'low');
  assert.equal(b.body.userImpact, 'breaking');
});

// ───────────────── 서비스 validate 무부작용 (기획 §5.2·§9, AC-3) ─────────────

test('validate: 유효 입력 → 200 {valid:true}, 저장 없음', () => {
  const service = createReleaseNotesService();
  const res = service.validate(validInput());
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { valid: true });
  assert.equal(service.store.size(), 0);
});

test('validate: 무효 입력도 200 {valid:false, errors}, 카드/KPI 불변 (AC-3)', () => {
  const service = createReleaseNotesService();
  const before = service.kpi().body;
  const res = service.validate(validInput({ importance: 'nope' }));
  assert.equal(res.status, 200);
  assert.equal(res.body.valid, false);
  assert.ok(res.body.errors.length > 0);
  assert.equal(service.store.size(), 0);
  assert.deepEqual(service.kpi().body, before);
});

test('validate: 반복 호출 idempotent (같은 입력 같은 결과, 부작용 0)', () => {
  const service = createReleaseNotesService();
  const first = service.validate(validInput());
  const second = service.validate(validInput());
  assert.deepEqual(first.body, second.body);
  assert.equal(service.store.size(), 0);
});

// ─────────────────── 서비스 list 필터 (기획 §5.3, AC-5) ────────────────────

test('list: importance × userImpact AND 필터, 생성 순서 유지', () => {
  const service = createReleaseNotesService();
  service.create(validInput({ title: 'A', importance: 'critical', userImpact: 'breaking' }));
  service.create(validInput({ title: 'B', importance: 'low', userImpact: 'none' }));
  service.create(validInput({ title: 'C', importance: 'critical', userImpact: 'none' }));

  const all = service.list();
  assert.equal(all.body.length, 3);
  assert.deepEqual(all.body.map((c) => c.title), ['A', 'B', 'C']);

  const filtered = service.list({ importance: 'critical', userImpact: 'breaking' });
  assert.equal(filtered.body.length, 1);
  assert.equal(filtered.body[0].title, 'A');
});

test('list: 필터 결과 0건은 에러 아닌 빈 배열 (AC-5)', () => {
  const service = createReleaseNotesService();
  service.create(validInput({ importance: 'low', userImpact: 'none' }));
  const res = service.list({ importance: 'critical' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
});

test('list: all/생략은 필터 미적용', () => {
  const service = createReleaseNotesService();
  service.create(validInput());
  assert.equal(service.list({ importance: 'all', userImpact: 'all' }).body.length, 1);
  assert.equal(service.list().body.length, 1);
});

// ─────────────────────── KPI (기획 §6, AC-5) ───────────────────────────────

test('toRatio: 0-division 방지 → total 0이면 0', () => {
  assert.equal(toRatio(0, 0), 0);
  assert.equal(toRatio(1, 4), 25);
  assert.equal(toRatio(1, 3), 33.3);
});

test('computeKpi: 0건이면 총 0, 모든 비율 0, 최근 0 (0-division 방지)', () => {
  const kpi = computeKpi([]);
  assert.equal(kpi.total, 0);
  assert.equal(kpi.breakingRatio, 0);
  assert.equal(kpi.urgentCount, 0);
  assert.equal(kpi.recent24hCount, 0);
  assert.equal(kpi.importanceDist.low.ratio, 0);
});

test('computeKpi: 분포·breaking·urgent·recent24h 정확 계산', () => {
  const now = new Date('2026-07-23T12:00:00.000Z');
  const cards = [
    { importance: 'critical', userImpact: 'breaking', createdAt: '2026-07-23T11:00:00.000Z' }, // 최근
    { importance: 'high', userImpact: 'minor', createdAt: '2026-07-23T00:30:00.000Z' }, // 최근
    { importance: 'low', userImpact: 'none', createdAt: '2026-07-20T00:00:00.000Z' }, // 24h 밖
    { importance: 'medium', userImpact: 'breaking', createdAt: '2026-07-22T12:00:00.000Z' }, // 경계(정확히 24h)
  ];
  const kpi = computeKpi(cards, now);
  assert.equal(kpi.total, 4);
  assert.equal(kpi.urgentCount, 2); // critical + high
  assert.equal(kpi.breakingRatio, 50); // 2/4
  assert.equal(kpi.importanceDist.critical.count, 1);
  assert.equal(kpi.userImpactDist.breaking.count, 2);
  assert.equal(kpi.recent24hCount, 3); // 11:00, 00:30, 경계 12:00(정확히 24h) 포함
});

// ─────────────────────── 렌더 (디자인 §5·§6·§7) ────────────────────────────

test('renderImpBadge: 라벨·단계 기호 병기(색약 대응)', () => {
  const html = renderImpBadge('critical');
  assert.ok(html.includes('imp-badge--critical'));
  assert.ok(html.includes('긴급'));
  assert.ok(html.includes('▇'));
});

test('renderImpactChip: 라벨·glyph 병기', () => {
  const html = renderImpactChip('breaking');
  assert.ok(html.includes('impact-chip--breaking'));
  assert.ok(html.includes('호환성 깨짐'));
  assert.ok(html.includes('⚠'));
});

test('renderSummaryCard: 중요도 배지+영향도 칩 구분 표시, 좌측 보더 클래스', () => {
  const html = renderSummaryCard({
    id: 'x',
    title: '제목',
    changes: ['변경1'],
    importance: 'critical',
    userImpact: 'none',
    createdAt: '2026-07-23T00:00:00.000Z',
  });
  assert.ok(html.includes('summary-card--critical')); // 좌측 accent 보더
  assert.ok(html.includes('imp-badge--critical')); // 채움 배지(헤더)
  assert.ok(html.includes('impact-chip--none')); // 아웃라인 칩(메타)
});

test('renderSummaryCard: 사용자 입력 XSS 이스케이프', () => {
  const html = renderSummaryCard({
    id: 'x',
    title: '<script>alert(1)</script>',
    changes: ['<img src=x onerror=1>'],
    importance: 'low',
    userImpact: 'none',
    createdAt: '2026-07-23T00:00:00.000Z',
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('renderValidateResult: pass/fail 배너 구분', () => {
  const pass = renderValidateResult('validate-pass');
  assert.ok(pass.includes('validate-result--pass'));
  assert.ok(pass.includes('저장되지 않았습니다'));

  const fail = renderValidateResult('validate-fail', [{ field: 'title', reason: '릴리스 제목을 입력하세요.' }]);
  assert.ok(fail.includes('validate-result--fail'));
  assert.ok(fail.includes('제목')); // 필드 라벨
  assert.ok(fail.includes('릴리스 제목을 입력하세요.'));
});

test('renderEmptyState: no-data / no-match 구분', () => {
  assert.ok(renderEmptyState('no-data').includes('아직 생성된 요약 카드가 없습니다'));
  assert.ok(renderEmptyState('no-match').includes('조건에 맞는 요약 카드가 없습니다'));
});

test('renderCardList: hasData 여부로 빈 상태 구분', () => {
  assert.ok(renderCardList([], { hasData: false }).includes('empty-state--no-data'));
  assert.ok(renderCardList([], { hasData: true }).includes('empty-state--no-match'));
});

test('renderKpiBar: 0건도 안전 렌더(0%)', () => {
  const html = renderKpiBar(computeKpi([]));
  assert.ok(html.includes('kpi-bar'));
  assert.ok(html.includes('0%'));
});

test('createInMemoryStore: add/list/size 동작', () => {
  const store = createInMemoryStore();
  assert.equal(store.size(), 0);
  store.add({ id: '1' });
  assert.equal(store.size(), 1);
  assert.equal(store.list().length, 1);
  // list()는 방어적 복사본 반환
  store.list().push({ id: 'mutated' });
  assert.equal(store.size(), 1);
});
