// BF-1575 · 운영자용 랭킹 조회 API 계약 검증 (node --test)
// 유일 권위: docs/plans/implementation-plan.md §3 (GET /api/admin/snake/scores)

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  handleAdminScores,
  adminScoresRoute,
  ALLOWED_MODES,
  ALLOWED_LIMITS,
  DEFAULT_MODE,
  DEFAULT_LIMIT,
} from '../api/admin-scores.js';

// 고정 픽스처 — score 내림차순 아님(핸들러가 정렬하는지 확인용), 두 모드 혼재
const SAMPLE = Object.freeze([
  { nickname: 'PLAYER_TWO', score: 900, mode: 'single', playedAt: '2026-07-31T09:30:00.000Z' },
  { nickname: 'PLAYER_ONE', score: 1200, mode: 'duo', playedAt: '2026-08-01T12:00:00.000Z' },
  { nickname: 'PLAYER_THREE', score: 500, mode: 'single', playedAt: '2026-07-30T08:00:00.000Z' },
  { nickname: 'PLAYER_FOUR', score: 1100, mode: 'duo', playedAt: '2026-07-29T07:00:00.000Z' },
]);

const allow = () => true;
const deny = () => false;
const readSample = () => SAMPLE.map((r) => ({ ...r }));

function ok(query, extraDeps = {}) {
  return handleAdminScores(
    { method: 'GET', query, headers: {} },
    { authorize: allow, readScores: readSample, ...extraDeps },
  );
}

test('상수 계약: mode/limit 허용 값과 기본값이 §3.2와 일치', () => {
  assert.deepEqual([...ALLOWED_MODES], ['all', 'single', 'duo']);
  assert.deepEqual([...ALLOWED_LIMITS], [10, 25, 50, 100]);
  assert.equal(DEFAULT_MODE, 'all');
  assert.equal(DEFAULT_LIMIT, 25);
});

test('성공: 200 + { total, items } 최상위 키만, score 내림차순, rank 1부터 연속', async () => {
  const res = await ok({ mode: 'all', limit: 25 });
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.body), ['total', 'items']);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.equal(res.body.total, 4);
  assert.deepEqual(
    res.body.items.map((i) => i.score),
    [1200, 1100, 900, 500],
  );
  assert.deepEqual(
    res.body.items.map((i) => i.rank),
    [1, 2, 3, 4],
  );
  // item 필드 exact (§3.3)
  assert.deepEqual(res.body.items[0], {
    rank: 1,
    nickname: 'PLAYER_ONE',
    score: 1200,
    mode: 'duo',
    playedAt: '2026-08-01T12:00:00.000Z',
  });
});

test('기본값: mode/limit 생략 시 all/25 적용', async () => {
  const res = await ok({});
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 4);
  assert.equal(res.body.items.length, 4);
});

test('모드 필터: mode=single 은 single 기록만, total 도 필터 후 개수', async () => {
  const res = await ok({ mode: 'single' });
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 2);
  assert.ok(res.body.items.every((i) => i.mode === 'single'));
  assert.deepEqual(
    res.body.items.map((i) => i.score),
    [900, 500],
  );
});

test('모드 필터: mode=duo 는 duo 기록만', async () => {
  const res = await ok({ mode: 'duo' });
  assert.equal(res.body.total, 2);
  assert.ok(res.body.items.every((i) => i.mode === 'duo'));
});

test('limit: total 은 표시 개수와 무관한 전체 수, items 는 limit 로 절단', async () => {
  const res = await ok({ mode: 'all', limit: 10 });
  assert.equal(res.body.total, 4); // 전체 수 유지
  // 데이터가 10개 미만이라 전부 반환되지만, 절단 로직 확인을 위해 많은 데이터로 재검증
  const many = Array.from({ length: 40 }, (_, n) => ({
    nickname: `P${n}`,
    score: n,
    mode: 'single',
    playedAt: '2026-08-01T00:00:00.000Z',
  }));
  const res2 = await handleAdminScores(
    { method: 'GET', query: { mode: 'single', limit: 25 }, headers: {} },
    { authorize: allow, readScores: () => many },
  );
  assert.equal(res2.body.total, 40);
  assert.equal(res2.body.items.length, 25);
  assert.equal(res2.body.items[0].score, 39); // 내림차순 최상위
  assert.equal(res2.body.items[0].rank, 1);
  assert.equal(res2.body.items[24].rank, 25);
});

test('빈 결과: 200 + total 0 + items 빈 배열', async () => {
  const res = await handleAdminScores(
    { method: 'GET', query: {}, headers: {} },
    { authorize: allow, readScores: () => [] },
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 0);
  assert.deepEqual(res.body.items, []);
});

test('400 invalid_mode: 허용 값 외 mode', async () => {
  const res = await ok({ mode: 'triple' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'invalid_mode');
  assert.equal(typeof res.body.error.message, 'string');
});

test('400 invalid_limit: 허용 값 외 정수', async () => {
  const res = await ok({ limit: 30 });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'invalid_limit');
});

test('400 invalid_limit: 정수가 아닌 값', async () => {
  for (const bad of ['abc', '25.5', ' ', '1e2', '-25']) {
    const res = await ok({ limit: bad });
    assert.equal(res.status, 400, `limit=${JSON.stringify(bad)} 는 400 이어야 함`);
    assert.equal(res.body.error.code, 'invalid_limit');
  }
});

test('빈 문자열 query: mode/limit 가 빈 문자열이면 미지정으로 보고 기본값 적용', async () => {
  const res = await ok({ mode: '', limit: '' });
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 4);
});

test('403 forbidden: 권한 없는 요청은 검증 이전에 거부', async () => {
  const res = await handleAdminScores(
    { method: 'GET', query: { mode: 'nope', limit: 999 }, headers: {} },
    { authorize: deny, readScores: readSample },
  );
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'forbidden');
});

test('기본 인증(env 토큰): Bearer 토큰 일치 시 허용, 불일치 시 403', async () => {
  const prev = process.env.SNAKE_ADMIN_API_TOKEN;
  process.env.SNAKE_ADMIN_API_TOKEN = 'secret-token';
  try {
    const okRes = await handleAdminScores(
      { method: 'GET', query: {}, headers: { authorization: 'Bearer secret-token' } },
      { readScores: () => [] },
    );
    assert.equal(okRes.status, 200);

    const badRes = await handleAdminScores(
      { method: 'GET', query: {}, headers: { authorization: 'Bearer wrong' } },
      { readScores: () => [] },
    );
    assert.equal(badRes.status, 403);

    const noneRes = await handleAdminScores(
      { method: 'GET', query: {}, headers: {} },
      { readScores: () => [] },
    );
    assert.equal(noneRes.status, 403);
  } finally {
    if (prev === undefined) delete process.env.SNAKE_ADMIN_API_TOKEN;
    else process.env.SNAKE_ADMIN_API_TOKEN = prev;
  }
});

test('기본 인증: 토큰 미설정(env 없음) 시 관리 API 접근 거부', async () => {
  const prev = process.env.SNAKE_ADMIN_API_TOKEN;
  delete process.env.SNAKE_ADMIN_API_TOKEN;
  try {
    const res = await handleAdminScores(
      { method: 'GET', query: {}, headers: { authorization: 'Bearer anything' } },
      { readScores: () => [] },
    );
    assert.equal(res.status, 403);
  } finally {
    if (prev !== undefined) process.env.SNAKE_ADMIN_API_TOKEN = prev;
  }
});

test('통합(HTTP 어댑터): adminScoresRoute 가 url query 를 파싱해 JSON 응답', async () => {
  const chunks = [];
  const res = {
    statusCode: null,
    headers: null,
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
    },
    end(body) {
      chunks.push(body);
    },
  };
  await adminScoresRoute(
    { method: 'GET', url: '/api/admin/snake/scores?mode=duo&limit=10', headers: {} },
    res,
    { authorize: allow, readScores: readSample },
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  const parsed = JSON.parse(chunks.join(''));
  assert.equal(parsed.total, 2);
  assert.ok(parsed.items.every((i) => i.mode === 'duo'));
});

test('통합(HTTP 어댑터): 잘못된 limit 은 400 JSON', async () => {
  const chunks = [];
  const res = {
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
    },
    end(body) {
      chunks.push(body);
    },
  };
  await adminScoresRoute(
    { method: 'GET', url: '/api/admin/snake/scores?limit=7', headers: {} },
    res,
    { authorize: allow, readScores: readSample },
  );
  assert.equal(res.statusCode, 400);
  assert.equal(JSON.parse(chunks.join('')).error.code, 'invalid_limit');
});
