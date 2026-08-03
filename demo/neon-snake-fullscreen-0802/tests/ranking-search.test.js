// 네온 스네이크 · 닉네임 검색 프런트 로직 회귀 테스트 (node --test, DOM 페이크)
// 검증 기준: docs/plans/snake-ranking-search-BF-1560.md §4·§5·§6
//   상태 전이(idle→searching→found/not-found/error)·중복 submit 방지·control 재활성·reset 복원.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SEARCH_STATES,
  searchStatusText,
  formatRecordedAt,
  formatSearchResult,
  buildSearchUrl,
  createRankingSearch,
} from '../ranking-search.js';
import { SEARCH_API_PATH, createSearchStore, createSearchFetch } from '../../../api/snake/scores/search.js';

// ---- 경량 DOM 페이크 (브라우저 비의존) ----
function fakeInput(value = '') {
  return { value };
}
function fakeResult() {
  return { dataset: {}, textContent: '' };
}
function fakeSubmit() {
  const handlers = [];
  return {
    disabled: false,
    addEventListener(type, fn) {
      if (type === 'click') handlers.push(fn);
    },
    click() {
      return handlers.reduce((p, fn) => p.then(() => fn()), Promise.resolve());
    },
  };
}

// 상태 코드를 돌려주는 페이크 fetch. calls 로 요청 URL 을 관찰한다.
function fakeFetch(status, body, calls = []) {
  return async (url, init) => {
    calls.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      async json() {
        return body;
      },
    };
  };
}

function wire(fetchImpl, opts = {}) {
  const inputEl = fakeInput(opts.value ?? '박기획');
  const submitEl = fakeSubmit();
  const resultEl = fakeResult();
  const controller = createRankingSearch({ inputEl, submitEl, resultEl, fetchImpl, ...opts });
  return { inputEl, submitEl, resultEl, controller };
}

// ---- 순수 함수: 상태 텍스트 ----
test('SEARCH_STATES 는 frozen 5개 상태', () => {
  assert.deepEqual(SEARCH_STATES, ['idle', 'searching', 'found', 'not-found', 'error']);
});

test('searchStatusText: 상태별 frozen 화면 텍스트', () => {
  assert.equal(searchStatusText('idle'), '');
  assert.equal(searchStatusText('searching'), '검색 중…');
  assert.equal(searchStatusText('not-found'), '해당 닉네임의 기록이 없습니다');
  assert.equal(searchStatusText('error'), '검색 중 오류가 발생했습니다');
  assert.equal(searchStatusText('found'), ''); // found 는 결과 한 줄로 표현
});

test('formatRecordedAt: ISO 를 YYYY-MM-DD HH:MM 으로 축약', () => {
  assert.equal(formatRecordedAt('2026-08-03T12:34:56.000Z'), '2026-08-03 12:34');
  assert.equal(formatRecordedAt('not-a-date'), 'not-a-date');
  assert.equal(formatRecordedAt(null), '');
});

test('formatSearchResult: 순위·닉네임·점수·기록 시각 한 줄', () => {
  const line = formatSearchResult({ rank: 2, nickname: '박기획', score: 1234, recordedAt: '2026-08-03T12:00:00.000Z' });
  assert.equal(line, '2위 · 박기획 · 1234점 · 2026-08-03 12:00');
});

test('buildSearchUrl: frozen 경로·쿼리 인코딩', () => {
  const url = buildSearchUrl({ nickname: '박기획', mode: 'single' });
  assert.ok(url.startsWith(`${SEARCH_API_PATH}?`));
  assert.equal(url, `${SEARCH_API_PATH}?nickname=${encodeURIComponent('박기획')}&mode=single`);
});

// ---- 초기 상태 idle ----
test('생성 직후 idle: 결과 비움, submit 활성', () => {
  const { submitEl, resultEl } = wire(fakeFetch(200, {}));
  assert.equal(resultEl.dataset.state, 'idle');
  assert.equal(resultEl.textContent, '');
  assert.equal(submitEl.disabled, false);
});

// ---- AC-1 found ----
test('submit(found): 200 이면 found 상태·결과 한 줄·submit 재활성', async () => {
  const found = { rank: 2, nickname: '박기획', score: 1234, recordedAt: '2026-08-03T12:00:00.000Z' };
  const { submitEl, resultEl, controller } = wire(fakeFetch(200, found));
  await controller.submit();
  assert.equal(resultEl.dataset.state, 'found');
  assert.equal(resultEl.textContent, '2위 · 박기획 · 1234점 · 2026-08-03 12:00');
  assert.equal(submitEl.disabled, false); // 응답 후 control 재활성
});

// ---- AC-2 not-found ----
test('submit(not-found): 404 이면 not-found 텍스트·submit 재활성', async () => {
  const { submitEl, resultEl, controller } = wire(fakeFetch(404, { error: 'x' }));
  await controller.submit();
  assert.equal(resultEl.dataset.state, 'not-found');
  assert.equal(resultEl.textContent, '해당 닉네임의 기록이 없습니다');
  assert.equal(submitEl.disabled, false);
});

// ---- AC-3 error (400) ----
test('submit(error): 400 이면 error 텍스트·submit 재활성', async () => {
  const { submitEl, resultEl, controller } = wire(fakeFetch(400, { error: 'x' }));
  await controller.submit();
  assert.equal(resultEl.dataset.state, 'error');
  assert.equal(resultEl.textContent, '검색 중 오류가 발생했습니다');
  assert.equal(submitEl.disabled, false);
});

// ---- 네트워크 오류 → error ----
test('submit(error): fetch reject(네트워크 오류)면 error·submit 재활성', async () => {
  const rejectFetch = async () => {
    throw new Error('network down');
  };
  const { submitEl, resultEl, controller } = wire(rejectFetch);
  await controller.submit();
  assert.equal(resultEl.dataset.state, 'error');
  assert.equal(submitEl.disabled, false);
});

// ---- AC-4 mode 기본값·요청 URL ----
test('submit: 기본 mode single 로 요청 URL 을 구성', async () => {
  const calls = [];
  const { controller } = wire(fakeFetch(404, {}, calls));
  await controller.submit();
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.includes('mode=single'));
});

test('setMode(versus): 이후 요청은 versus 모드로 조회', async () => {
  const calls = [];
  const { controller } = wire(fakeFetch(404, {}, calls));
  controller.setMode('versus');
  await controller.submit();
  assert.ok(calls[0].url.includes('mode=versus'));
});

// ---- AC-5 중복 submit 방지 ----
test('submit: searching 중 추가 submit 은 무시(중복 요청 방지)', async () => {
  const calls = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const slowFetch = async (url, init) => {
    calls.push({ url, init });
    await gate;
    return { ok: false, status: 404, async json() { return {}; } };
  };
  const { submitEl, controller } = wire(slowFetch);
  const first = controller.submit(); // searching 진입 후 대기
  assert.equal(submitEl.disabled, true); // 진행 표시(비활성)
  await controller.submit(); // 중복 → 무시(추가 요청 없음)
  assert.equal(calls.length, 1);
  release();
  await first;
  assert.equal(submitEl.disabled, false); // 응답 후 재활성
});

// ---- AC-5 reset 복원 ----
test('reset: 진행 중 요청을 취소하고 idle 초기값으로 복원', async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const slowFetch = async () => {
    await gate;
    return { ok: true, status: 200, async json() { return { rank: 1, nickname: 'x', score: 1, recordedAt: '2026-08-03T00:00:00.000Z' }; } };
  };
  const { inputEl, submitEl, resultEl, controller } = wire(slowFetch);
  inputEl.value = '박기획';
  const pending = controller.submit();
  controller.reset(); // 진행 중 취소 → idle 복원
  assert.equal(resultEl.dataset.state, 'idle');
  assert.equal(resultEl.textContent, '');
  assert.equal(inputEl.value, ''); // 입력 초기화
  assert.equal(submitEl.disabled, false);
  release();
  await pending;
  // 취소된(오래된) 응답은 상태를 덮어쓰지 않는다.
  assert.equal(resultEl.dataset.state, 'idle');
});

// ---- 통합: 실제 검색 저장소(createSearchFetch)와 왕복 ----
test('통합: createSearchFetch 백킹으로 found/not-found/error 왕복', async () => {
  const store = createSearchStore();
  store.add({ nickname: '박기획', score: 1234, mode: 'single', recordedAt: '2026-08-03T12:00:00.000Z' });
  const fetchImpl = createSearchFetch(store);

  const foundUi = wire(fetchImpl, { value: '박기획' });
  await foundUi.controller.submit();
  assert.equal(foundUi.resultEl.dataset.state, 'found');
  assert.equal(foundUi.resultEl.textContent, '1위 · 박기획 · 1234점 · 2026-08-03 12:00');

  const missUi = wire(fetchImpl, { value: '없는사람' });
  await missUi.controller.submit();
  assert.equal(missUi.resultEl.dataset.state, 'not-found');

  const badUi = wire(fetchImpl, { value: 'a' }); // 1자 → 400
  await badUi.controller.submit();
  assert.equal(badUi.resultEl.dataset.state, 'error');
});
