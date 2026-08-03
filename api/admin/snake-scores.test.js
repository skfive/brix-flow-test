// GET /api/admin/snake-scores 계약 검증 (docs/plans/implementation-plan.md §3)
// node --test api/admin/snake-scores.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ADMIN_SCORES_API_PATH,
  ADMIN_SCORE_MODES,
  DEFAULT_ADMIN_MODE,
  ADMIN_SCORE_LIMITS,
  DEFAULT_ADMIN_LIMIT,
  ERROR_CODES,
  normalizeMode,
  normalizeLimit,
  rankScores,
  createAdminScoresFetch,
  createAdminScoresStore,
} from './snake-scores.js';

// 기존 점수 데이터 스키마: { nickname, score, mode(single|versus), recordedAt }
const SAMPLE_ROWS = [
  { nickname: 'ALPHA', score: 900, mode: 'single', recordedAt: '2026-07-31T09:30:00.000Z' },
  { nickname: 'BRAVO', score: 1200, mode: 'versus', recordedAt: '2026-08-01T12:00:00.000Z' },
  { nickname: 'CHARLIE', score: 1200, mode: 'single', recordedAt: '2026-07-30T08:00:00.000Z' },
  { nickname: 'DELTA', score: 500, mode: 'versus', recordedAt: '2026-08-02T10:00:00.000Z' },
];

// ── 계약 상수 ────────────────────────────────────────────────────────────────
test('endpoint 경로·허용 값 상수는 §3 계약과 일치한다', () => {
  assert.equal(ADMIN_SCORES_API_PATH, '/api/admin/snake-scores');
  assert.deepEqual(ADMIN_SCORE_MODES, ['all', 'single', 'duo']);
  assert.equal(DEFAULT_ADMIN_MODE, 'all');
  assert.deepEqual(ADMIN_SCORE_LIMITS, [10, 25, 50, 100]);
  assert.equal(DEFAULT_ADMIN_LIMIT, 25);
});

// ── normalizeMode (§3.2 / E-1) ───────────────────────────────────────────────
test('normalizeMode: 미지정/빈 값은 기본값 all', () => {
  assert.equal(normalizeMode(undefined), 'all');
  assert.equal(normalizeMode(null), 'all');
  assert.equal(normalizeMode(''), 'all');
});

test('normalizeMode: 허용 값은 그대로, 그 외는 null', () => {
  assert.equal(normalizeMode('all'), 'all');
  assert.equal(normalizeMode('single'), 'single');
  assert.equal(normalizeMode('duo'), 'duo');
  assert.equal(normalizeMode('versus'), null); // 데이터 값이지 API 값 아님
  assert.equal(normalizeMode('triple'), null);
});

// ── normalizeLimit (§3.2 / E-2) ──────────────────────────────────────────────
test('normalizeLimit: 미지정/빈 값은 기본값 25', () => {
  assert.equal(normalizeLimit(undefined), 25);
  assert.equal(normalizeLimit(null), 25);
  assert.equal(normalizeLimit(''), 25);
});

test('normalizeLimit: 허용 값만 통과, 그 외는 null', () => {
  assert.equal(normalizeLimit('10'), 10);
  assert.equal(normalizeLimit('25'), 25);
  assert.equal(normalizeLimit('50'), 50);
  assert.equal(normalizeLimit('100'), 100);
  assert.equal(normalizeLimit(50), 50);
});

test('normalizeLimit: 범위 밖·비정수는 null', () => {
  assert.equal(normalizeLimit('20'), null); // 열거 값 아님
  assert.equal(normalizeLimit('0'), null);
  assert.equal(normalizeLimit('1'), null);
  assert.equal(normalizeLimit('101'), null);
  assert.equal(normalizeLimit('abc'), null);
  assert.equal(normalizeLimit('25.5'), null);
  assert.equal(normalizeLimit('-25'), null);
});

// ── rankScores (§3.3 / §5 불변식) ────────────────────────────────────────────
test('rankScores: score 내림차순, 동점은 먼저 달성이 상위, rank 1부터 연속', () => {
  const ranked = rankScores(SAMPLE_ROWS, { mode: 'all', limit: 25 });
  assert.deepEqual(ranked.map((r) => r.nickname), ['CHARLIE', 'BRAVO', 'ALPHA', 'DELTA']);
  assert.deepEqual(ranked.map((r) => r.rank), [1, 2, 3, 4]);
  // 동점(1200) CHARLIE(07-30) 가 BRAVO(08-01) 보다 상위
  assert.equal(ranked[0].nickname, 'CHARLIE');
  assert.equal(ranked[1].nickname, 'BRAVO');
});

test('rankScores: 데이터 mode versus → API 노출 mode duo, recordedAt → playedAt', () => {
  const ranked = rankScores(SAMPLE_ROWS, { mode: 'all', limit: 25 });
  const bravo = ranked.find((r) => r.nickname === 'BRAVO');
  assert.equal(bravo.mode, 'duo');
  assert.equal(bravo.playedAt, '2026-08-01T12:00:00.000Z');
  assert.ok(ranked.every((r) => r.mode === 'single' || r.mode === 'duo'));
});

test('rankScores: mode=single 은 single 만, mode=duo 는 versus(→duo) 만 필터', () => {
  const single = rankScores(SAMPLE_ROWS, { mode: 'single', limit: 25 });
  assert.deepEqual(single.map((r) => r.nickname), ['CHARLIE', 'ALPHA']);
  assert.ok(single.every((r) => r.mode === 'single'));

  const duo = rankScores(SAMPLE_ROWS, { mode: 'duo', limit: 25 });
  assert.deepEqual(duo.map((r) => r.nickname), ['BRAVO', 'DELTA']);
  assert.ok(duo.every((r) => r.mode === 'duo'));
});

test('rankScores: limit 으로 길이 제한', () => {
  const ranked = rankScores(SAMPLE_ROWS, { mode: 'all', limit: 2 });
  assert.equal(ranked.length, 2);
  assert.deepEqual(ranked.map((r) => r.rank), [1, 2]);
});

test('rankScores: 빈/비배열 입력은 빈 배열', () => {
  assert.deepEqual(rankScores([], { mode: 'all', limit: 25 }), []);
  assert.deepEqual(rankScores(undefined, { mode: 'all', limit: 25 }), []);
});

// ── fetch 통합: 성공 응답 (§3.3 / US-1~3) ────────────────────────────────────
test('GET 기본 query → mode=all limit=25, §3.3 형태 200', async () => {
  const fetchFn = createAdminScoresFetch(createAdminScoresStore(SAMPLE_ROWS));
  const res = await fetchFn(ADMIN_SCORES_API_PATH);
  assert.equal(res.status, 200);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.equal(res.body.mode, 'all');
  assert.equal(res.body.limit, 25);
  assert.equal(res.body.count, 4);
  assert.equal(res.body.count, res.body.scores.length);
  assert.deepEqual(Object.keys(res.body), ['mode', 'limit', 'count', 'scores']);
  assert.deepEqual(Object.keys(res.body.scores[0]), ['rank', 'nickname', 'score', 'mode', 'playedAt']);
});

test('GET mode=single&limit=10 → single 만, 적용된 query 반영', async () => {
  const fetchFn = createAdminScoresFetch(SAMPLE_ROWS);
  const res = await fetchFn(`${ADMIN_SCORES_API_PATH}?mode=single&limit=10`);
  assert.equal(res.status, 200);
  assert.equal(res.body.mode, 'single');
  assert.equal(res.body.limit, 10);
  assert.deepEqual(res.body.scores.map((r) => r.nickname), ['CHARLIE', 'ALPHA']);
});

test('GET mode=duo → versus 기록이 duo 로 노출', async () => {
  const fetchFn = createAdminScoresFetch(SAMPLE_ROWS);
  const res = await fetchFn(`${ADMIN_SCORES_API_PATH}?mode=duo&limit=50`);
  assert.equal(res.status, 200);
  assert.equal(res.body.mode, 'duo');
  assert.equal(res.body.limit, 50);
  assert.ok(res.body.scores.every((r) => r.mode === 'duo'));
});

// ── fetch 통합: 빈 결과 (§3.3 / E-5 / US-4) ──────────────────────────────────
test('조건에 맞는 기록 없음 → 200 count:0 scores:[]', async () => {
  const fetchFn = createAdminScoresFetch([]);
  const res = await fetchFn(`${ADMIN_SCORES_API_PATH}?mode=all&limit=25`);
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 0);
  assert.deepEqual(res.body.scores, []);
});

// ── fetch 통합: 에러 (§3.4 / E-1~E-4) ────────────────────────────────────────
test('E-1 mode 허용 값 외 → 400 invalid_mode', async () => {
  const fetchFn = createAdminScoresFetch(SAMPLE_ROWS);
  const res = await fetchFn(`${ADMIN_SCORES_API_PATH}?mode=versus`);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, ERROR_CODES.invalidMode);
  assert.equal(typeof res.body.error.message, 'string');
});

test('E-2 limit 허용 값 외/비정수 → 400 invalid_limit', async () => {
  const fetchFn = createAdminScoresFetch(SAMPLE_ROWS);
  for (const bad of ['20', '0', 'abc', '1000', '25.5']) {
    const res = await fetchFn(`${ADMIN_SCORES_API_PATH}?limit=${bad}`);
    assert.equal(res.status, 400, `limit=${bad}`);
    assert.equal(res.body.error.code, ERROR_CODES.invalidLimit, `limit=${bad}`);
  }
});

test('E-3 GET 이외 method → 405 method_not_allowed', async () => {
  const fetchFn = createAdminScoresFetch(SAMPLE_ROWS);
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    const res = await fetchFn(ADMIN_SCORES_API_PATH, { method });
    assert.equal(res.status, 405, method);
    assert.equal(res.body.error.code, ERROR_CODES.methodNotAllowed, method);
  }
});

test('E-4 조회/직렬화 실패 → 500 internal_error', async () => {
  const fetchFn = createAdminScoresFetch(() => {
    throw new Error('boom');
  });
  const res = await fetchFn(ADMIN_SCORES_API_PATH);
  assert.equal(res.status, 500);
  assert.equal(res.body.error.code, ERROR_CODES.internalError);
});

// ── read-only 보장: admin 조회가 소스를 변경하지 않는다 ───────────────────────
test('admin 조회는 소스 데이터를 변경하지 않는다(read-only)', async () => {
  const store = createAdminScoresStore(SAMPLE_ROWS);
  const before = store.list();
  const fetchFn = createAdminScoresFetch(store);
  await fetchFn(`${ADMIN_SCORES_API_PATH}?mode=single&limit=10`);
  assert.deepEqual(store.list(), before);
  assert.equal(store.list().length, SAMPLE_ROWS.length);
});
