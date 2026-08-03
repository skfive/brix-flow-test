// 네온 스네이크 · 닉네임 검색 프런트 로직 (BF-1562, additive)
// frozen: docs/plans/snake-ranking-search-BF-1560.md §4 (UI 계약 — selector/token/state)
//
// 표현·상태 로직(searchStatusText/formatSearchResult)은 DOM/window/네트워크/시간에 의존하지
// 않는 순수 함수다. createRankingSearch 는 주입된 fetchImpl 과 DOM 요소로 배선되며 페이크를
// 주입하면 결정론적으로 검증된다. 검색은 기존 랭킹 조회/등록·게임 루프·localStorage 를 손대지
// 않는 순수 조회 UI 다(additive).

import { SEARCH_API_PATH, DEFAULT_SEARCH_MODE } from '../../api/snake/scores/search.js';

// frozen §4.3 · 상태(states): idle · searching · found · not-found · error.
export const SEARCH_STATES = ['idle', 'searching', 'found', 'not-found', 'error'];

// frozen §4.3/§4.5 · 상태별 화면 텍스트. 색상 외 텍스트로 상태를 노출한다.
// found 는 결과 한 줄(formatSearchResult)로 표현하므로 여기서는 빈 문자열을 돌려준다.
export function searchStatusText(state) {
  switch (state) {
    case 'searching':
      return '검색 중…';
    case 'not-found':
      return '해당 닉네임의 기록이 없습니다';
    case 'error':
      return '검색 중 오류가 발생했습니다';
    case 'found':
    case 'idle':
    default:
      return '';
  }
}

// ISO 시각을 좁은 화면에서도 넘치지 않게 'YYYY-MM-DD HH:MM' 으로 축약한다. 파싱 불가하면 원문 유지.
export function formatRecordedAt(recordedAt) {
  if (typeof recordedAt !== 'string') return '';
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(recordedAt);
  return match ? `${match[1]} ${match[2]}` : recordedAt;
}

// frozen §4.3 found · 결과 한 줄: 순위·닉네임·점수·기록 시각.
export function formatSearchResult(result) {
  const r = result || {};
  return `${r.rank}위 · ${r.nickname} · ${r.score}점 · ${formatRecordedAt(r.recordedAt)}`;
}

// 검색 요청 URL(frozen §3): GET /api/snake/scores/search?nickname=&mode=.
export function buildSearchUrl({ nickname, mode }) {
  return `${SEARCH_API_PATH}?nickname=${encodeURIComponent(nickname)}&mode=${encodeURIComponent(mode)}`;
}

// 주입된 fetchImpl 로 검색 요청을 보내고 상태 종류로 정규화한다. 상태 코드에 따라 found(200)/
// not-found(404)/error(그 외) 로 분기한다(비2xx 를 throw 하지 않고 상태로 다룬다).
async function requestSearch(fetchImpl, { nickname, mode }) {
  const res = await fetchImpl(buildSearchUrl({ nickname, mode }), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (res.status === 200 && res.ok) {
    return { kind: 'found', data: await res.json() };
  }
  if (res.status === 404) {
    return { kind: 'not-found' };
  }
  return { kind: 'error' };
}

// 닉네임 검색 DOM 컨트롤러 (frozen ui-contract §4).
// elements: { inputEl(#rank-search-input), submitEl(#rank-search-submit),
//             resultEl(#rank-search-result) }
// fetchImpl: 주입할 fetch 구현(브라우저는 정적 데모용 createSearchFetch, 테스트는 페이크 fetch).
// mode: 조회 대상 게임 모드(single/versus). 기본 single.
// 상태: idle → searching → found/not-found/error. searching 중 중복 submit 은 무시하며,
//       응답·실패·취소 뒤에는 진행 표시(searching)를 해제하고 submit control 을 재활성화한다.
//       reset() 은 상태·결과를 idle 초기값으로 되돌린다.
export function createRankingSearch({ inputEl, submitEl, resultEl, fetchImpl, mode = DEFAULT_SEARCH_MODE }) {
  let searchMode = mode;
  let searching = false;
  let requestId = 0; // 경쟁/취소 방지: 최신 요청 결과만 반영

  // 상태 전이: 화면 텍스트/결과를 렌더하고, 상태명을 data-state 로 노출(색상 외 접근성 이름).
  // searching 에서만 submit 을 비활성화 → 그 외 상태에서는 재활성(control 재사용 후조건).
  function setState(state, data) {
    resultEl.dataset.state = state;
    resultEl.textContent = state === 'found' ? formatSearchResult(data) : searchStatusText(state);
    submitEl.disabled = state === 'searching';
    searching = state === 'searching';
  }

  async function submit() {
    if (searching) return; // 중복 submit 방지(진행 중 추가 클릭 무시)
    const nickname = 'value' in inputEl ? String(inputEl.value).trim() : '';
    setState('searching');
    const myId = (requestId += 1);
    try {
      const result = await requestSearch(fetchImpl, { nickname, mode: searchMode });
      if (myId !== requestId) return; // 더 최신 요청/취소가 있으면 이 결과는 무시
      if (result.kind === 'found') {
        setState('found', result.data);
      } else if (result.kind === 'not-found') {
        setState('not-found');
      } else {
        setState('error');
      }
    } catch {
      if (myId !== requestId) return;
      // 네트워크/타임아웃 오류 → error 텍스트 표시 + submit 재활성(control 재사용).
      setState('error');
    }
  }

  // 조회 대상 모드 갱신(종료 화면 진입 시 실제 게임 모드 바인딩용).
  function setMode(next) {
    if (SEARCH_API_PATH && (next === 'single' || next === 'versus')) {
      searchMode = next;
    }
  }

  // 초기화·취소·재시작: 진행 중 요청을 무효화하고 idle 초기값으로 복원한다(후조건 복원).
  function reset() {
    requestId += 1; // 진행 중 검색 취소
    searching = false;
    if ('value' in inputEl) {
      inputEl.value = '';
    }
    setState('idle');
  }

  submitEl.addEventListener('click', submit);
  setState('idle');

  return { submit, setMode, reset };
}
