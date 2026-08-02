// 네온 스네이크 · 랭킹 API·표현 단위/통합 테스트 (node --test, DOM/네트워크 비의존)
// 검증 기준: docs/plans/snake-ranking-plan-BF-1548.md §9 (TS-API, TS-RANKING)
//            work packet acceptance-criteria — POST/GET /api/snake/scores 검증·멱등성.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCORES_API_PATH,
  NICKNAME_PATTERN,
  isValidNickname as apiIsValidNickname,
  isValidScore,
  createScoresStore,
} from '../src/scores-api.js';
import {
  statusText,
  topEntries,
  isValidNickname,
  createLocalClient,
} from '../src/ranking.js';

// 결정론적 시각 주입 — 호출마다 단조 증가하는 ISO 문자열을 반환한다.
function fakeClock(start = 0) {
  let t = start;
  return () => `2026-01-01T00:00:${String(t++).padStart(2, '0')}.000Z`;
}

// ---- frozen 상수 ----
test('SCORES_API_PATH 는 /api/snake/scores 로 동결', () => {
  assert.equal(SCORES_API_PATH, '/api/snake/scores');
});

// ---- TS-API: 닉네임 검증 (한글/영문/숫자 2~12자) ----
test('isValidNickname: 유효한 닉네임(한글/영문/숫자 2~12자)', () => {
  assert.equal(isValidNickname('플레이어1'), true);
  assert.equal(isValidNickname('ab'), true);
  assert.equal(isValidNickname('a1b2c3d4e5f6'), true); // 12자
  assert.equal(isValidNickname('한글Mix12'), true);
  // ranking.js 는 scores-api.js 의 검증을 재사용(동일 규칙)
  assert.equal(isValidNickname('플레이어1'), apiIsValidNickname('플레이어1'));
});

test('isValidNickname: 위반(1자/13자/공백/특수문자/비문자열)은 false', () => {
  assert.equal(isValidNickname('a'), false); // 1자
  assert.equal(isValidNickname('a1b2c3d4e5f6g'), false); // 13자
  assert.equal(isValidNickname(''), false);
  assert.equal(isValidNickname('   '), false);
  assert.equal(isValidNickname('ab cd'), false); // 공백 포함
  assert.equal(isValidNickname('hi!'), false); // 특수문자
  assert.equal(isValidNickname('닉😀'), false); // 이모지
  assert.equal(isValidNickname(null), false);
  assert.equal(isValidNickname(12), false);
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
test('POST: 닉네임 위반 시 400', () => {
  const store = createScoresStore({ now: fakeClock() });
  assert.equal(store.post({ nickname: 'a', score: 10, mode: 'single' }).status, 400);
  assert.equal(store.post({ nickname: 'hi!', score: 10, mode: 'single' }).status, 400);
  assert.equal(store.post({ nickname: '', score: 10, mode: 'single' }).status, 400);
});

test('POST: score 음수/비정수 시 400', () => {
  const store = createScoresStore({ now: fakeClock() });
  assert.equal(store.post({ nickname: 'ace', score: -1, mode: 'single' }).status, 400);
  assert.equal(store.post({ nickname: 'ace', score: 1.5, mode: 'single' }).status, 400);
  assert.equal(store.post({ nickname: 'ace', score: Number.NaN, mode: 'single' }).status, 400);
});

// ---- TS-API: POST 정상 저장 → 순위 반환 ----
test('POST: 정상 저장 시 200 과 내 순위를 반환', () => {
  const store = createScoresStore({ now: fakeClock() });
  store.post({ nickname: 'goat', score: 320, mode: 'single' });
  store.post({ nickname: 'ace', score: 210, mode: 'single' });
  const res = store.post({ nickname: 'me', score: 120, mode: 'single' });
  assert.equal(res.status, 200);
  assert.equal(res.body.rank, 3); // 320 > 210 > 120
  assert.equal(res.body.entries[0].nickname, 'goat');
  assert.equal(res.body.entries[2].nickname, 'me');
});

// ---- TS-API: GET 상위 10개 점수 내림차순 { rank, nickname, score, recordedAt } ----
test('GET mode=single: 상위 10개를 점수 내림차순 { rank, nickname, score, recordedAt } 로 반환', () => {
  const store = createScoresStore({ now: fakeClock() });
  // 12명 등록(상위 10 절삭 확인)
  for (let i = 0; i < 12; i += 1) {
    store.post({ nickname: `p${i}`, score: i * 10, mode: 'single' });
  }
  const res = store.get({ mode: 'single' });
  assert.equal(res.status, 200);
  assert.equal(res.body.entries.length, 10); // 상위 10 절삭
  // 내림차순
  for (let i = 1; i < res.body.entries.length; i += 1) {
    assert.ok(res.body.entries[i - 1].score >= res.body.entries[i].score);
  }
  // 스키마 { rank, nickname, score, recordedAt }
  const top = res.body.entries[0];
  assert.equal(top.rank, 1);
  assert.equal(top.nickname, 'p11'); // 110점
  assert.equal(top.score, 110);
  assert.equal(typeof top.recordedAt, 'string');
});

test('GET: 저장 전 빈 모드는 빈 배열', () => {
  const store = createScoresStore({ now: fakeClock() });
  assert.deepEqual(store.get({ mode: 'single' }).body.entries, []);
});

test('GET: 모드 격리 — 다른 모드 등록은 조회에 영향 없음', () => {
  const store = createScoresStore({ now: fakeClock() });
  store.post({ nickname: 'solo', score: 50, mode: 'single' });
  store.post({ nickname: 'duo', score: 90, mode: 'versus' });
  assert.equal(store.get({ mode: 'single' }).body.entries.length, 1);
  assert.equal(store.get({ mode: 'single' }).body.entries[0].nickname, 'solo');
});

// ---- TS-API: 저장소 멱등성 ----
test('저장소 멱등성: 동일 { nickname, score, mode } 반복 등록은 상태가 동일', () => {
  const store = createScoresStore({ now: fakeClock() });
  const first = store.post({ nickname: 'ace', score: 100, mode: 'single' });
  const second = store.post({ nickname: 'ace', score: 100, mode: 'single' });
  const third = store.post({ nickname: 'ace', score: 100, mode: 'single' });
  // 중복 행 없음
  assert.equal(store.get({ mode: 'single' }).body.entries.length, 1);
  // recordedAt 이 첫 등록 시각으로 고정(멱등)
  assert.equal(
    second.body.entries[0].recordedAt,
    first.body.entries[0].recordedAt,
  );
  assert.equal(third.body.entries[0].recordedAt, first.body.entries[0].recordedAt);
  assert.equal(second.body.rank, 1);
});

test('저장소: 더 높은 점수만 갱신, 낮은 점수 재등록은 no-op', () => {
  const store = createScoresStore({ now: fakeClock() });
  store.post({ nickname: 'ace', score: 100, mode: 'single' });
  store.post({ nickname: 'ace', score: 50, mode: 'single' }); // 낮음 → 무시
  assert.equal(store.get({ mode: 'single' }).body.entries[0].score, 100);
  store.post({ nickname: 'ace', score: 200, mode: 'single' }); // 높음 → 갱신
  assert.equal(store.get({ mode: 'single' }).body.entries[0].score, 200);
  assert.equal(store.get({ mode: 'single' }).body.entries.length, 1); // 여전히 1행
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

// ---- TS-API: 클라이언트 throw-on-error (error 상태 유도) ----
test('createLocalClient: 2xx 는 body 반환, 비 2xx 는 throw', async () => {
  const store = createScoresStore({ now: fakeClock() });
  const client = createLocalClient(store);
  const ok = await client.submitScore({ nickname: 'ace', score: 10, mode: 'single' });
  assert.equal(ok.rank, 1);
  await assert.rejects(
    () => client.submitScore({ nickname: 'a', score: 10, mode: 'single' }), // 400
  );
});

test('createLocalClient: 저장소 예외(네트워크 오류 유사)는 전파되어 error 상태로 이어진다', async () => {
  const throwingStore = {
    get() {
      throw new Error('network down');
    },
    post() {
      throw new Error('network down');
    },
  };
  const client = createLocalClient(throwingStore);
  await assert.rejects(() => client.fetchScores({ mode: 'single' }));
});
