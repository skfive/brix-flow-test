// 네온 스네이크 · 랭킹 API·표현 단위/통합 테스트 (node --test, DOM 비의존)
// 검증 기준: docs/plans/snake-ranking-plan-BF-1548.md §9 (TS-API, TS-RANKING)
//            work packet acceptance-criteria — 검증(400)·멱등 저장소·상위 10 조회.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCORES_API_BASE,
  DEFAULT_LIMIT,
  NICKNAME_PATTERN,
  isValidNicknameStrict,
  isValidScore,
  fetchScores,
  submitScore,
  createScoresStore,
  createStoreFetch,
} from '../src/scores-api.js';
import { statusText, topEntries, isValidNickname } from '../src/ranking.js';

// 결정론적 시각 주입 — 호출마다 단조 증가하는 ISO 문자열을 반환한다.
function fakeClock(start = 0) {
  let t = start;
  return () => `2026-01-01T00:00:${String(t++).padStart(2, '0')}.000Z`;
}

// Response 유사 객체 페이크(성공/비2xx).
function fakeResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

// ---- frozen §3.1/§5 상수 ----
test('SCORES_API_BASE 는 /api/scores 로 동결(frozen §3.1)', () => {
  assert.equal(SCORES_API_BASE, '/api/scores');
  assert.equal(DEFAULT_LIMIT, 10);
});

// ---- TS-API(§3.1): 네트워크 계층 fetchScores — 주입 fetch 로 GET 호출·파싱·throw ----
test('fetchScores: GET URL·헤더로 fetchImpl 호출하고 2xx body 를 반환', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return fakeResponse(200, { entries: [{ nickname: 'goat', score: 320, rank: 1 }] });
  };
  const out = await fetchScores(fetchImpl, { mode: 'cpu', limit: 10 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${SCORES_API_BASE}?mode=cpu&limit=10`);
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(out.entries[0].nickname, 'goat');
});

test('fetchScores: 비 2xx 응답은 throw(REQ-RESILIENCE error 유도)', async () => {
  const fetchImpl = async () => fakeResponse(500, {});
  await assert.rejects(() => fetchScores(fetchImpl, { mode: 'local', limit: 10 }));
});

test('fetchScores: fetch reject(네트워크 오류)는 전파되어 throw', async () => {
  const fetchImpl = async () => {
    throw new Error('network down');
  };
  await assert.rejects(() => fetchScores(fetchImpl, { mode: 'local', limit: 10 }));
});

// ---- TS-API(§3.1): submitScore — POST body·헤더·파싱·throw ----
test('submitScore: POST 로 §5.1 body 를 전송하고 { rank, entries } 반환', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return fakeResponse(200, { rank: 3, entries: [] });
  };
  const out = await submitScore(fetchImpl, { nickname: '플레이어1', score: 120, mode: 'cpu' });
  assert.equal(calls[0].url, SCORES_API_BASE);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    nickname: '플레이어1',
    score: 120,
    mode: 'cpu',
  });
  assert.equal(out.rank, 3);
});

test('submitScore: 비 2xx(400 등)·네트워크 오류는 throw', async () => {
  await assert.rejects(() =>
    submitScore(async () => fakeResponse(400, { error: 'bad' }), {
      nickname: 'a',
      score: 10,
      mode: 'local',
    }),
  );
  await assert.rejects(() =>
    submitScore(
      async () => {
        throw new Error('network down');
      },
      { nickname: 'ace', score: 10, mode: 'local' },
    ),
  );
});

// ---- TS-RANKING(§3.2): isValidNickname — trim 후 비어있지 않은가(클라이언트 방어) ----
test('isValidNickname(frozen §3.2): trim 후 비어있으면 false, 아니면 true', () => {
  assert.equal(isValidNickname('ace'), true);
  assert.equal(isValidNickname('a'), true); // 클라이언트 방어는 길이 규칙이 아님
  assert.equal(isValidNickname(''), false);
  assert.equal(isValidNickname('   '), false);
  assert.equal(isValidNickname(null), false);
  assert.equal(isValidNickname(12), false);
});

// ---- TS-API: 서버측 닉네임 검증(한글/영문/숫자 2~12자) ----
test('isValidNicknameStrict: 한글/영문/숫자 2~12자만 유효', () => {
  assert.equal(isValidNicknameStrict('플레이어1'), true);
  assert.equal(isValidNicknameStrict('ab'), true);
  assert.equal(isValidNicknameStrict('a1b2c3d4e5f6'), true); // 12자
  assert.equal(isValidNicknameStrict('한글Mix12'), true);
  assert.equal(isValidNicknameStrict('a'), false); // 1자
  assert.equal(isValidNicknameStrict('a1b2c3d4e5f6g'), false); // 13자
  assert.equal(isValidNicknameStrict('ab cd'), false); // 공백
  assert.equal(isValidNicknameStrict('hi!'), false); // 특수문자
  assert.equal(isValidNicknameStrict('닉😀'), false); // 이모지
});

test('NICKNAME_PATTERN 은 앵커된 2~12자 규칙', () => {
  assert.equal(NICKNAME_PATTERN.test('ab'), true);
  assert.equal(NICKNAME_PATTERN.test('a'), false);
});

// ---- TS-API: 점수 검증 ----
test('isValidScore: 비음수 정수만 유효', () => {
  assert.equal(isValidScore(0), true);
  assert.equal(isValidScore(120), true);
  assert.equal(isValidScore(-1), false);
  assert.equal(isValidScore(3.14), false);
  assert.equal(isValidScore(Number.NaN), false);
  assert.equal(isValidScore('10'), false);
});

// ---- TS-API: POST 검증 400 ----
test('저장소 POST: 닉네임 위반 시 400', () => {
  const store = createScoresStore({ now: fakeClock() });
  assert.equal(store.post({ nickname: 'a', score: 10, mode: 'local' }).status, 400);
  assert.equal(store.post({ nickname: 'hi!', score: 10, mode: 'local' }).status, 400);
  assert.equal(store.post({ nickname: '', score: 10, mode: 'local' }).status, 400);
});

test('저장소 POST: score 음수/비정수 시 400', () => {
  const store = createScoresStore({ now: fakeClock() });
  assert.equal(store.post({ nickname: 'ace', score: -1, mode: 'local' }).status, 400);
  assert.equal(store.post({ nickname: 'ace', score: 1.5, mode: 'local' }).status, 400);
  assert.equal(store.post({ nickname: 'ace', score: Number.NaN, mode: 'local' }).status, 400);
});

// ---- TS-API: POST 정상 저장 → 순위 반환 ----
test('저장소 POST: 정상 저장 시 200 과 내 순위를 반환', () => {
  const store = createScoresStore({ now: fakeClock() });
  store.post({ nickname: 'goat', score: 320, mode: 'local' });
  store.post({ nickname: 'ace', score: 210, mode: 'local' });
  const res = store.post({ nickname: 'me', score: 120, mode: 'local' });
  assert.equal(res.status, 200);
  assert.equal(res.body.rank, 3); // 320 > 210 > 120
  assert.equal(res.body.entries[0].nickname, 'goat');
  assert.equal(res.body.entries[2].nickname, 'me');
});

// ---- TS-API: GET 상위 10개 점수 내림차순 { rank, nickname, score, recordedAt } ----
test('저장소 GET: 상위 10개를 점수 내림차순 { rank, nickname, score, recordedAt } 로 반환', () => {
  const store = createScoresStore({ now: fakeClock() });
  for (let i = 0; i < 12; i += 1) {
    store.post({ nickname: `p${i}`, score: i * 10, mode: 'local' });
  }
  const res = store.get({ mode: 'local' });
  assert.equal(res.status, 200);
  assert.equal(res.body.entries.length, 10); // 상위 10 절삭
  for (let i = 1; i < res.body.entries.length; i += 1) {
    assert.ok(res.body.entries[i - 1].score >= res.body.entries[i].score);
  }
  const top = res.body.entries[0];
  assert.equal(top.rank, 1);
  assert.equal(top.nickname, 'p11'); // 110점
  assert.equal(top.score, 110);
  assert.equal(typeof top.recordedAt, 'string');
});

test('저장소 GET: 저장 전 빈 모드는 빈 배열', () => {
  const store = createScoresStore({ now: fakeClock() });
  assert.deepEqual(store.get({ mode: 'local' }).body.entries, []);
});

// ---- frozen §4: 모드 격리('local'/'cpu') ----
test('모드 격리(frozen §4): local 등록은 cpu 조회에 영향 없음', () => {
  const store = createScoresStore({ now: fakeClock() });
  store.post({ nickname: 'solo', score: 50, mode: 'local' });
  store.post({ nickname: 'duo', score: 90, mode: 'cpu' });
  assert.equal(store.get({ mode: 'local' }).body.entries.length, 1);
  assert.equal(store.get({ mode: 'local' }).body.entries[0].nickname, 'solo');
  assert.equal(store.get({ mode: 'cpu' }).body.entries.length, 1);
  assert.equal(store.get({ mode: 'cpu' }).body.entries[0].nickname, 'duo');
});

// ---- TS-API: 저장소 멱등성 ----
test('저장소 멱등성: 동일 { nickname, score, mode } 반복 등록은 상태가 동일', () => {
  const store = createScoresStore({ now: fakeClock() });
  const first = store.post({ nickname: 'ace', score: 100, mode: 'local' });
  const second = store.post({ nickname: 'ace', score: 100, mode: 'local' });
  const third = store.post({ nickname: 'ace', score: 100, mode: 'local' });
  assert.equal(store.get({ mode: 'local' }).body.entries.length, 1); // 중복 행 없음
  assert.equal(second.body.entries[0].recordedAt, first.body.entries[0].recordedAt);
  assert.equal(third.body.entries[0].recordedAt, first.body.entries[0].recordedAt);
  assert.equal(second.body.rank, 1);
});

test('저장소: 더 높은 점수만 갱신, 낮은 점수 재등록은 no-op', () => {
  const store = createScoresStore({ now: fakeClock() });
  store.post({ nickname: 'ace', score: 100, mode: 'local' });
  store.post({ nickname: 'ace', score: 50, mode: 'local' }); // 낮음 → 무시
  assert.equal(store.get({ mode: 'local' }).body.entries[0].score, 100);
  store.post({ nickname: 'ace', score: 200, mode: 'local' }); // 높음 → 갱신
  assert.equal(store.get({ mode: 'local' }).body.entries[0].score, 200);
  assert.equal(store.get({ mode: 'local' }).body.entries.length, 1); // 여전히 1행
});

// ---- 통합: createStoreFetch 로 §3.1 네트워크 계층을 저장소에 백킹(정적 데모 경로) ----
test('createStoreFetch: submitScore→fetchScores 왕복이 저장소를 통해 동작', async () => {
  const store = createScoresStore({ now: fakeClock() });
  const fetchImpl = createStoreFetch(store);
  const submitted = await submitScore(fetchImpl, { nickname: 'ace', score: 100, mode: 'cpu' });
  assert.equal(submitted.rank, 1);
  const fetched = await fetchScores(fetchImpl, { mode: 'cpu', limit: 10 });
  assert.equal(fetched.entries.length, 1);
  assert.equal(fetched.entries[0].nickname, 'ace');
  // 검증 실패는 저장소 400 → submitScore throw
  await assert.rejects(() =>
    submitScore(fetchImpl, { nickname: 'a', score: 10, mode: 'cpu' }),
  );
});

// ---- TS-RANKING: statusText (frozen 상태 텍스트) ----
test('statusText: 상태별 frozen 텍스트', () => {
  assert.equal(statusText('idle'), '');
  assert.equal(statusText('submitting'), '등록 중…');
  assert.equal(statusText('success', 3), '등록 완료 · 내 순위 3위');
  assert.equal(statusText('error'), '랭킹을 불러올 수 없습니다');
  assert.equal(statusText('unknown'), ''); // 미지 상태는 idle 취급
});

// ---- TS-RANKING: topEntries ----
test('topEntries: 내림차순 정렬·상위 10 절삭·1-based rank 부여', () => {
  const raw = Array.from({ length: 12 }, (_, i) => ({ nickname: `p${i}`, score: i }));
  const top = topEntries(raw, 10);
  assert.equal(top.length, 10);
  assert.equal(top[0].score, 11);
  assert.equal(top[0].rank, 1);
  assert.equal(top[9].rank, 10);
});

test('topEntries: 비배열/빈 배열은 []', () => {
  assert.deepEqual(topEntries(null), []);
  assert.deepEqual(topEntries(undefined), []);
  assert.deepEqual(topEntries([]), []);
});
