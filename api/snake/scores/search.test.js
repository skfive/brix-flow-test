// 네온 스네이크 · 닉네임 검색 API 단위/통합 테스트 (node --test, DOM 비의존)
// 검증 기준: docs/plans/snake-ranking-search-BF-1560.md §3·§5·§6
//   AC-1 found(200) / AC-2 not-found(404) / AC-3 검증 오류(400, 길이·문자·mode) / AC-4 mode 기본값.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SEARCH_API_PATH,
  SEARCH_MODES,
  DEFAULT_SEARCH_MODE,
  NICKNAME_PATTERN,
  normalizeNickname,
  isValidSearchNickname,
  normalizeSearchMode,
  createSearchStore,
  createSearchFetch,
} from './search.js';

// 결정론적 시각 주입 — 호출마다 단조 증가하는 ISO 문자열을 반환한다.
function fakeClock(start = 0) {
  let t = start;
  return () => `2026-08-03T00:00:${String(t++).padStart(2, '0')}.000Z`;
}

// found 데이터가 있는 저장소를 구성한다(single/versus 모드에 결정론적 recordedAt 부여).
function seededStore() {
  const store = createSearchStore({ now: fakeClock() });
  store.add({ nickname: '박기획', score: 1234, mode: 'single', recordedAt: '2026-08-03T12:00:00.000Z' });
  store.add({ nickname: 'goat', score: 2000, mode: 'single', recordedAt: '2026-08-03T11:00:00.000Z' });
  store.add({ nickname: 'ace', score: 500, mode: 'single', recordedAt: '2026-08-03T10:00:00.000Z' });
  store.add({ nickname: '박기획', score: 999, mode: 'versus', recordedAt: '2026-08-03T09:00:00.000Z' });
  return store;
}

// ---- frozen §3 상수 ----
test('SEARCH_API_PATH·mode 상수는 frozen 계약값', () => {
  assert.equal(SEARCH_API_PATH, '/api/snake/scores/search');
  assert.deepEqual(SEARCH_MODES, ['single', 'versus']);
  assert.equal(DEFAULT_SEARCH_MODE, 'single');
});

// ---- 닉네임 정규화·검증 ----
test('normalizeNickname: 앞뒤 공백 제거, 비문자열은 빈 문자열', () => {
  assert.equal(normalizeNickname('  박기획  '), '박기획');
  assert.equal(normalizeNickname('ace'), 'ace');
  assert.equal(normalizeNickname(null), '');
  assert.equal(normalizeNickname(42), '');
});

test('isValidSearchNickname: 한글/영문/숫자 2~12자만 유효(경계 포함)', () => {
  assert.equal(isValidSearchNickname('박기획'), true);
  assert.equal(isValidSearchNickname('ab'), true); // 2자 경계
  assert.equal(isValidSearchNickname('a1b2c3d4e5f6'), true); // 12자 경계
  assert.equal(isValidSearchNickname('a'), false); // 1자
  assert.equal(isValidSearchNickname('a1b2c3d4e5f6g'), false); // 13자
  assert.equal(isValidSearchNickname('hi!'), false); // 특수문자
  assert.equal(isValidSearchNickname('닉 네임'), false); // 공백
  assert.equal(isValidSearchNickname('닉😀'), false); // 이모지
});

test('NICKNAME_PATTERN 은 앵커된 2~12자 규칙', () => {
  assert.equal(NICKNAME_PATTERN.test('ab'), true);
  assert.equal(NICKNAME_PATTERN.test('a'), false);
});

// ---- mode 정규화 (AC-4 기본값·§6 정확 일치) ----
test('normalizeSearchMode: 미지정은 single 기본, single/versus 만 허용, 그 외 null', () => {
  assert.equal(normalizeSearchMode(undefined), 'single'); // AC-4
  assert.equal(normalizeSearchMode('single'), 'single');
  assert.equal(normalizeSearchMode('versus'), 'versus');
  assert.equal(normalizeSearchMode('Single'), null); // 대소문자 정확 일치
  assert.equal(normalizeSearchMode('coop'), null);
  assert.equal(normalizeSearchMode(''), null);
});

// ---- AC-1 정상 검색(found, 200) ----
test('search: 존재하는 닉네임은 200 과 { rank, nickname, score, recordedAt } 반환', () => {
  const res = seededStore().search({ nickname: '박기획', mode: 'single' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, {
    rank: 2, // goat(2000) > 박기획(1234) > ace(500)
    nickname: '박기획',
    score: 1234,
    recordedAt: '2026-08-03T12:00:00.000Z',
  });
});

test('search: 앞뒤 공백은 정규화 후 조회한다', () => {
  const res = seededStore().search({ nickname: '  박기획  ', mode: 'single' });
  assert.equal(res.status, 200);
  assert.equal(res.body.nickname, '박기획');
});

// ---- AC-4 mode 기본값 ----
test('search: mode 생략 시 single 로 조회한다(versus 기록은 매치되지 않음)', () => {
  const store = seededStore();
  const res = store.search({ nickname: 'goat' }); // mode 없음 → single
  assert.equal(res.status, 200);
  assert.equal(res.body.score, 2000);
});

test('search: 같은 닉네임이라도 mode 별로 격리된 순위를 반환', () => {
  const store = seededStore();
  const versus = store.search({ nickname: '박기획', mode: 'versus' });
  assert.equal(versus.status, 200);
  assert.equal(versus.body.rank, 1); // versus 모드엔 박기획 1건뿐
  assert.equal(versus.body.score, 999);
});

// ---- AC-2 기록 없음(not-found, 404) ----
test('search: 유효 닉네임이지만 기록 없으면 404', () => {
  const res = seededStore().search({ nickname: '없는사람', mode: 'single' });
  assert.equal(res.status, 404);
});

test('search: 해당 mode 에 기록 없으면 404 (goat 은 versus 에 없음)', () => {
  const res = seededStore().search({ nickname: 'goat', mode: 'versus' });
  assert.equal(res.status, 404);
});

// ---- AC-3 검증 오류(400) ----
test('search: 닉네임 길이/문자 위반은 400', () => {
  const store = seededStore();
  assert.equal(store.search({ nickname: 'a', mode: 'single' }).status, 400); // 1자
  assert.equal(store.search({ nickname: 'a1b2c3d4e5f6g', mode: 'single' }).status, 400); // 13자
  assert.equal(store.search({ nickname: 'hi!', mode: 'single' }).status, 400); // 특수문자
  assert.equal(store.search({ nickname: '', mode: 'single' }).status, 400); // 빈 값
  assert.equal(store.search({ nickname: '   ', mode: 'single' }).status, 400); // 공백만
});

test('search: mode 값 위반은 400', () => {
  const store = seededStore();
  assert.equal(store.search({ nickname: '박기획', mode: 'coop' }).status, 400);
  assert.equal(store.search({ nickname: '박기획', mode: 'Single' }).status, 400); // 대소문자
  assert.equal(store.search({ nickname: '박기획', mode: '' }).status, 400);
});

// ---- 통합: createSearchFetch 로 프런트 네트워크 계층을 저장소에 백킹 ----
test('createSearchFetch: URL 쿼리를 파싱해 저장소 검색 결과를 Response 유사 객체로 반환', async () => {
  const fetchImpl = createSearchFetch(seededStore());

  const found = await fetchImpl(`${SEARCH_API_PATH}?nickname=${encodeURIComponent('박기획')}&mode=single`);
  assert.equal(found.ok, true);
  assert.equal(found.status, 200);
  assert.equal((await found.json()).nickname, '박기획');

  const notFound = await fetchImpl(`${SEARCH_API_PATH}?nickname=${encodeURIComponent('없는사람')}&mode=single`);
  assert.equal(notFound.ok, false);
  assert.equal(notFound.status, 404);

  const badRequest = await fetchImpl(`${SEARCH_API_PATH}?nickname=a&mode=single`);
  assert.equal(badRequest.status, 400);

  // mode 미지정 → single 기본으로 조회(AC-4)
  const defaulted = await fetchImpl(`${SEARCH_API_PATH}?nickname=goat`);
  assert.equal(defaulted.status, 200);
  assert.equal((await defaulted.json()).score, 2000);
});

// ---- 순수 조회: search 는 저장소 상태를 변경하지 않는다(저장 트리거 없음) ----
test('search: 조회는 저장소를 변경하지 않는다', () => {
  const store = seededStore();
  store.search({ nickname: '박기획', mode: 'single' });
  store.search({ nickname: '없는사람', mode: 'single' });
  // 재조회 결과가 동일해야 한다(부작용 없음).
  assert.equal(store.search({ nickname: '박기획', mode: 'single' }).body.rank, 2);
  assert.equal(store.search({ nickname: 'goat', mode: 'single' }).body.rank, 1);
});
