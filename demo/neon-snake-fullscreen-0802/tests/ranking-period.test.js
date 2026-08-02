// 네온 스네이크 · 랭킹 기간 필터(period) 단위/통합 테스트 (node --test, DOM 비의존)
// 검증 기준: docs/plans/snake-ranking-period-filter-BF-1554.md §3(API)·§6(AC)·§8(edge)
//            work packet acceptance-criteria — period=all|7d 허용, 미지정 all 호환,
//            잘못된 값 400, 7d 는 7일 이내(<=) 상위 10 score 내림차순, 응답 형식 유지.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCORES_API_BASE,
  RANKING_PERIODS,
  PERIOD_WINDOW_MS,
  normalizePeriod,
  fetchScores,
  createScoresStore,
  createStoreFetch,
} from '../src/scores-api.js';
import { periodStatusText } from '../src/ranking.js';

// 조회 시점(now)과 post 기록 시점(recordedAt)을 함께 통제하는 가변 시계.
function mutableClock(initialIso) {
  let current = initialIso;
  const fn = () => current;
  fn.set = (iso) => {
    current = iso;
  };
  return fn;
}

// Response 유사 객체 페이크.
function fakeResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

// ---- 상수·정규화 ----
test('RANKING_PERIODS / PERIOD_WINDOW_MS 동결값', () => {
  assert.deepEqual(RANKING_PERIODS, ['all', '7d']);
  assert.equal(PERIOD_WINDOW_MS, 7 * 24 * 60 * 60 * 1000);
});

test('normalizePeriod: 미지정은 all, all|7d 허용, 그 외는 null(→400)', () => {
  assert.equal(normalizePeriod(undefined), 'all'); // 미지정 → all 호환(AC-1)
  assert.equal(normalizePeriod('all'), 'all');
  assert.equal(normalizePeriod('7d'), '7d');
  assert.equal(normalizePeriod('30d'), null); // 잘못된 값(AC-4)
  assert.equal(normalizePeriod(''), null); // 빈 문자열
  assert.equal(normalizePeriod('xyz'), null); // 오타
});

// ---- fetchScores: period 쿼리는 additive(미지정이면 URL 불변, 기존 호환) ----
test('fetchScores: period 지정 시에만 &period= 추가(미지정이면 기존 URL 동일)', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return fakeResponse(200, { entries: [] });
  };
  await fetchScores(fetchImpl, { mode: 'local', limit: 10, period: '7d' });
  assert.equal(calls[0], `${SCORES_API_BASE}?mode=local&limit=10&period=7d`);
  await fetchScores(fetchImpl, { mode: 'local', limit: 10 });
  assert.equal(calls[1], `${SCORES_API_BASE}?mode=local&limit=10`); // period 미지정 → 미포함
});

// ---- 저장소 GET: period 검증 400 (AC-4) ----
test('저장소 GET: 잘못된 period 는 400', () => {
  const store = createScoresStore({ now: mutableClock('2026-08-08T00:00:00.000Z') });
  assert.equal(store.get({ mode: 'local', period: '30d' }).status, 400);
  assert.equal(store.get({ mode: 'local', period: '' }).status, 400);
  assert.equal(store.get({ mode: 'local', period: 'xyz' }).status, 400);
});

// ---- 저장소 GET: period 미지정/all 은 전체 (AC-1, AC-2) ----
test('저장소 GET: period 미지정과 all 은 전체 상위 10 score 내림차순, 형식 유지', () => {
  const clock = mutableClock('2026-08-08T00:00:00.000Z');
  const store = createScoresStore({ now: clock });
  store.post({ nickname: 'goat', score: 320, mode: 'local' });
  store.post({ nickname: 'ace', score: 210, mode: 'local' });

  const omitted = store.get({ mode: 'local' });
  const all = store.get({ mode: 'local', period: 'all' });
  assert.equal(omitted.status, 200);
  assert.equal(all.status, 200);
  assert.deepEqual(omitted.body.entries, all.body.entries); // 미지정 == all(호환)
  assert.equal(all.body.entries.length, 2);
  assert.equal(all.body.entries[0].nickname, 'goat'); // 내림차순
  // 응답 형식 { rank, nickname, score, recordedAt } 유지
  assert.deepEqual(Object.keys(all.body.entries[0]).sort(), [
    'nickname',
    'rank',
    'recordedAt',
    'score',
  ]);
});

// ---- 저장소 GET: period=7d 시간 경계(<= 7일 포함, 초과 제외) (AC-3, §3.2) ----
test('저장소 GET: 7d 는 요청 시점 기준 7일 이내(정확히 7일 포함, 초과 제외)만 반환', () => {
  const clock = mutableClock('2026-08-01T00:00:00.000Z');
  const store = createScoresStore({ now: clock });

  clock.set('2026-08-01T00:00:00.000Z'); // 정확히 7일 전
  store.post({ nickname: 'boundary', score: 100, mode: 'local' });
  clock.set('2026-07-31T23:59:59.000Z'); // 7일 + 1초 전 → 제외
  store.post({ nickname: 'tooOld', score: 90, mode: 'local' });
  clock.set('2026-08-07T00:00:00.000Z'); // 1일 전 → 포함
  store.post({ nickname: 'recent', score: 80, mode: 'local' });

  clock.set('2026-08-08T00:00:00.000Z'); // 조회 시점(now)
  const res = store.get({ mode: 'local', period: '7d' });
  assert.equal(res.status, 200);
  const names = res.body.entries.map((e) => e.nickname);
  assert.deepEqual(names, ['boundary', 'recent']); // score 내림차순, tooOld 제외

  // all 은 3건 전부
  assert.equal(store.get({ mode: 'local', period: 'all' }).body.entries.length, 3);
});

// ---- 저장소 GET: 7일 이내 0건이면 빈 배열 + 200 (§8 edge) ----
test('저장소 GET: 7d 이내 기록 0건이면 빈 배열, 200', () => {
  const clock = mutableClock('2026-08-08T00:00:00.000Z');
  const store = createScoresStore({ now: clock });
  clock.set('2026-01-01T00:00:00.000Z'); // 아주 오래 전
  store.post({ nickname: 'old', score: 100, mode: 'local' });
  clock.set('2026-08-08T00:00:00.000Z');
  const res = store.get({ mode: 'local', period: '7d' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.entries, []);
});

// ---- 통합: createStoreFetch 로 §3.1 네트워크 계층을 period 필터에 백킹 ----
test('createStoreFetch: period=all/7d 왕복 동작, 잘못된 period 는 400 → fetchScores throw', async () => {
  const clock = mutableClock('2026-08-08T00:00:00.000Z');
  const store = createScoresStore({ now: clock });
  clock.set('2026-08-07T00:00:00.000Z'); // 1일 전
  store.post({ nickname: 'ace', score: 100, mode: 'cpu' });
  clock.set('2026-01-01T00:00:00.000Z'); // 오래 전
  store.post({ nickname: 'old', score: 90, mode: 'cpu' });
  clock.set('2026-08-08T00:00:00.000Z');

  const fetchImpl = createStoreFetch(store);
  const all = await fetchScores(fetchImpl, { mode: 'cpu', limit: 10, period: 'all' });
  assert.equal(all.entries.length, 2);
  const seven = await fetchScores(fetchImpl, { mode: 'cpu', limit: 10, period: '7d' });
  assert.equal(seven.entries.length, 1);
  assert.equal(seven.entries[0].nickname, 'ace');

  // 잘못된 값 → 저장소 400 → fetchScores throw(→ UI error 상태 유도)
  await assert.rejects(() =>
    fetchScores(fetchImpl, { mode: 'cpu', limit: 10, period: '30d' }),
  );
});

// ---- UI: 기간 필터 상태 텍스트(색상 외 텍스트로 상태 노출) ----
test('periodStatusText: 상태별 화면 텍스트(error 는 명시 문구)', () => {
  assert.equal(periodStatusText('idle'), '');
  assert.equal(periodStatusText('loading'), '랭킹 불러오는 중…');
  assert.equal(periodStatusText('success'), '');
  assert.equal(periodStatusText('error'), '랭킹을 불러올 수 없습니다');
  assert.equal(periodStatusText('unknown'), ''); // 미지 상태는 idle 취급
});
