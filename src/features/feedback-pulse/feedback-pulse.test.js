// feedback-pulse 백엔드 서비스 단위 테스트 (BF-1081)
// 저장소 규약: vanilla-static / ESM / node --test
// tests/ 는 read-only(tester 영역)이라 소유 경로 src/features/feedback-pulse 에 co-locate.
import test from 'node:test';
import assert from 'node:assert/strict';

import { validateSubmission, SENTIMENTS, URGENCIES } from './validate.js';
import { createStore } from './store.js';
import { computeKpi, DEFAULT_PULSE_WINDOW_MS } from './kpi.js';
import { createMetrics } from './metrics.js';
import { createFeedbackPulseService } from './service.js';
import { createRouter } from '../../routes/feedback-pulse/handler.js';

const validInput = () => ({ sentiment: 'negative', urgency: 'high', opinion: '배송이 너무 느립니다.' });

// ── validate ────────────────────────────────────────────────
test('validate: 유효 입력은 trim 된 값으로 통과', () => {
  const r = validateSubmission({ sentiment: 'positive', urgency: 'low', opinion: '  좋아요  ' });
  assert.equal(r.ok, true);
  assert.equal(r.value.opinion, '좋아요');
  assert.equal(r.value.sentiment, 'positive');
});

test('validate: enum·필드 상수 노출', () => {
  assert.deepEqual(SENTIMENTS, ['positive', 'neutral', 'negative']);
  assert.deepEqual(URGENCIES, ['low', 'medium', 'high', 'critical']);
});

test('validate: 비객체/누락/enum 위반/공백/초과 거부', () => {
  assert.equal(validateSubmission(null).ok, false);
  assert.equal(validateSubmission('x').ok, false);
  assert.equal(validateSubmission([]).ok, false);
  assert.equal(validateSubmission({ urgency: 'low', opinion: 'a' }).error.field, 'sentiment');
  assert.equal(validateSubmission({ sentiment: 'bad', urgency: 'low', opinion: 'a' }).error.field, 'sentiment');
  assert.equal(validateSubmission({ sentiment: 'positive', urgency: 'bad', opinion: 'a' }).error.field, 'urgency');
  assert.equal(validateSubmission({ sentiment: 'positive', urgency: 'low', opinion: '   ' }).error.field, 'opinion');
  assert.equal(validateSubmission({ sentiment: 'positive', urgency: 'low', opinion: 'a'.repeat(1001) }).error.field, 'opinion');
});

test('validate: 경계값 1자·1000자 통과', () => {
  assert.equal(validateSubmission({ sentiment: 'neutral', urgency: 'low', opinion: 'a' }).ok, true);
  assert.equal(validateSubmission({ sentiment: 'neutral', urgency: 'low', opinion: 'a'.repeat(1000) }).ok, true);
});

// ── store ────────────────────────────────────────────────────
test('store: add 시 uuid·submittedAt 부여, FIFO 유지', () => {
  const store = createStore();
  const a = store.add({ sentiment: 'positive', urgency: 'low', opinion: 'first' }, { now: 1_000 });
  const b = store.add({ sentiment: 'negative', urgency: 'high', opinion: 'second' }, { now: 2_000 });
  assert.match(a.id, /[0-9a-f-]{36}/);
  assert.notEqual(a.id, b.id);
  assert.equal(a.submittedAt, new Date(1_000).toISOString());
  assert.deepEqual(store.list().map((i) => i.opinion), ['first', 'second']);
  assert.equal(store.size(), 2);
});

test('store: reset 시 초기화 (인메모리 재시작 전제)', () => {
  const store = createStore();
  store.add(validInput());
  store.reset();
  assert.equal(store.size(), 0);
  assert.deepEqual(store.list(), []);
});

// ── kpi ──────────────────────────────────────────────────────
test('kpi: 0건이면 모든 비율 0.0% (0-division 방지)', () => {
  const k = computeKpi([], { now: 10_000 });
  assert.equal(k.total, 0);
  assert.equal(k.negativeRatio, '0.0%');
  assert.equal(k.urgentCount, 0);
  assert.equal(k.pulseRate, 0);
  assert.ok(k.sentimentDistribution.every((d) => d.percent === '0.0%' && d.count === 0));
  assert.equal(k.sentimentDistribution.length, 3);
  assert.equal(k.urgencyDistribution.length, 4);
});

test('kpi: 분포·부정비율·긴급건수·펄스율 계산', () => {
  const now = 10 * 60 * 1000; // 10분
  const items = [
    { sentiment: 'negative', urgency: 'high', submittedAt: new Date(now - 60_000).toISOString() }, // 1분 전 (창 내)
    { sentiment: 'negative', urgency: 'critical', submittedAt: new Date(now - 2 * 60_000).toISOString() }, // 2분 전 (창 내)
    { sentiment: 'positive', urgency: 'low', submittedAt: new Date(now - 10 * 60_000).toISOString() }, // 10분 전 (창 밖)
    { sentiment: 'neutral', urgency: 'medium', submittedAt: new Date(now - 30_000).toISOString() }, // 창 내
  ];
  const k = computeKpi(items, { now });
  assert.equal(k.total, 4);
  assert.equal(k.negativeRatio, '50.0%'); // 2/4
  assert.equal(k.urgentCount, 2); // high + critical
  assert.equal(k.pulseRate, 3); // 5분 창 내 3건
  const neg = k.sentimentDistribution.find((d) => d.key === 'negative');
  assert.equal(neg.count, 2);
  assert.equal(neg.percent, '50.0%');
  assert.equal(DEFAULT_PULSE_WINDOW_MS, 5 * 60 * 1000);
});

// ── metrics ──────────────────────────────────────────────────
test('metrics: record 로 이벤트 누적·로거 호출', () => {
  const logged = [];
  const metrics = createMetrics({ logger: { log: (...a) => logged.push(a) } });
  metrics.record({ type: 'kpi_query', total: 3 });
  assert.equal(metrics.events().length, 1);
  assert.equal(metrics.events()[0].type, 'kpi_query');
  assert.ok(metrics.events()[0].at);
  assert.equal(logged.length, 1);
});

// ── service (AC 통합) ─────────────────────────────────────────
test('service AC-1: 유효 접수 → 201 + 저장 반영', () => {
  const svc = createFeedbackPulseService();
  const res = svc.submit(validInput());
  assert.equal(res.status, 201);
  assert.match(res.body.id, /[0-9a-f-]{36}/);
  assert.equal(svc.store.size(), 1);
  assert.ok(svc.metrics.events().some((e) => e.type === 'submit_accepted'));
});

test('service AC-2: 무효 접수 → 400 + 미반영 + 측정 로그', () => {
  const svc = createFeedbackPulseService();
  const res = svc.submit({ sentiment: 'bad', urgency: 'low', opinion: 'x' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.field, 'sentiment');
  assert.equal(svc.store.size(), 0);
  assert.ok(svc.metrics.events().some((e) => e.type === 'submit_rejected'));
});

test('service AC-3: 필터 AND 조회 + 0건이면 빈 배열(에러 아님)', () => {
  const svc = createFeedbackPulseService();
  svc.submit({ sentiment: 'negative', urgency: 'high', opinion: 'a' });
  svc.submit({ sentiment: 'negative', urgency: 'low', opinion: 'b' });
  svc.submit({ sentiment: 'positive', urgency: 'high', opinion: 'c' });
  const both = svc.list({ sentiment: 'negative', urgency: 'high' });
  assert.equal(both.status, 200);
  assert.equal(both.body.length, 1);
  assert.equal(both.body[0].opinion, 'a');
  // 필터 결과 0건
  const none = svc.list({ sentiment: 'neutral', urgency: 'critical' });
  assert.equal(none.status, 200);
  assert.deepEqual(none.body, []);
  // 정의되지 않은 필터 값도 에러 아님 → 빈 배열
  const weird = svc.list({ sentiment: 'nonsense' });
  assert.equal(weird.status, 200);
  assert.deepEqual(weird.body, []);
  // all/미지정은 전체
  assert.equal(svc.list().body.length, 3);
  assert.equal(svc.list({ sentiment: 'all', urgency: 'all' }).body.length, 3);
});

test('service: 조회는 FIFO(접수 순) 유지', () => {
  const svc = createFeedbackPulseService();
  svc.submit({ sentiment: 'positive', urgency: 'low', opinion: '1' });
  svc.submit({ sentiment: 'positive', urgency: 'low', opinion: '2' });
  assert.deepEqual(svc.list().body.map((i) => i.opinion), ['1', '2']);
});

test('service AC-4: KPI 조회 → 200 + 집계 + 측정 로그', () => {
  const svc = createFeedbackPulseService();
  svc.submit({ sentiment: 'negative', urgency: 'critical', opinion: 'a' });
  const res = svc.kpi();
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.urgentCount, 1);
  assert.ok(svc.metrics.events().some((e) => e.type === 'kpi_query'));
});

test('service AC-5: 빈 상태(재시작 직후)에서 KPI 0·목록 빈 배열', () => {
  const svc = createFeedbackPulseService();
  assert.deepEqual(svc.list().body, []);
  const k = svc.kpi().body;
  assert.equal(k.total, 0);
  assert.equal(k.negativeRatio, '0.0%');
  assert.equal(k.pulseRate, 0);
});

test('service AC-6: 다건 접수 시 고유 id·유실 없음', () => {
  const svc = createFeedbackPulseService();
  const ids = new Set();
  for (let n = 0; n < 50; n++) {
    const r = svc.submit({ sentiment: 'neutral', urgency: 'medium', opinion: `op-${n}` });
    ids.add(r.body.id);
  }
  assert.equal(ids.size, 50);
  assert.equal(svc.store.size(), 50);
});

// ── router (HTTP 계약 매핑) ───────────────────────────────────
test('router: POST /feedback-pulse 유효 → 201', () => {
  const handle = createRouter();
  const res = handle({ method: 'POST', path: '/feedback-pulse', body: JSON.stringify(validInput()) });
  assert.equal(res.status, 201);
  assert.match(res.body.id, /[0-9a-f-]{36}/);
});

test('router: malformed JSON → 400', () => {
  const handle = createRouter();
  const res = handle({ method: 'POST', path: '/feedback-pulse', body: '{ not json ' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.field, 'body');
});

test('router: GET /feedback-pulse?sentiment=&urgency= 필터 매핑', () => {
  const handle = createRouter();
  handle({ method: 'POST', path: '/feedback-pulse', body: JSON.stringify({ sentiment: 'negative', urgency: 'high', opinion: 'a' }) });
  handle({ method: 'POST', path: '/feedback-pulse', body: JSON.stringify({ sentiment: 'positive', urgency: 'low', opinion: 'b' }) });
  const res = handle({ method: 'GET', path: '/feedback-pulse', query: { sentiment: 'negative', urgency: 'high' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 1);
});

test('router: GET /feedback-pulse/kpi → 200 KPI', () => {
  const handle = createRouter();
  const res = handle({ method: 'GET', path: '/feedback-pulse/kpi' });
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 0);
});

test('router: 알 수 없는 경로 → 404', () => {
  const handle = createRouter();
  assert.equal(handle({ method: 'GET', path: '/nope' }).status, 404);
});
