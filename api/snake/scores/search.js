// 네온 스네이크 · 닉네임 검색 API — GET /api/snake/scores/search (BF-1562, additive)
// 설계 기준: docs/plans/snake-ranking-search-BF-1560.md §3 (검색 API 계약, frozen)
//
// 이 모듈은 기존 GET /api/snake/scores 조회·POST 저장 경로와 **분리된 신규 endpoint** 다.
// 기존 컬럼(nickname/score/recordedAt)만 조회하며 신규 스키마를 만들지 않는다(순수 조회 —
// 저장을 트리거하지 않는다). DOM/window 에 의존하지 않아 node --test 와 브라우저 양쪽에서
// build step 없이 import 가능한 순수 ESM 이다.
//
// 구성:
//   (1) 검증/정규화 순수 함수 — 닉네임(2~12자 한글/영문/숫자)·mode(single/versus, 기본 single).
//   (2) createSearchStore — mode 별 최고 기록을 보관하고 search 로 순위를 조회하는 인메모리 저장소.
//   (3) createSearchFetch — 정적 데모/테스트에서 프런트의 fetchImpl 로 백킹하는 어댑터.

// frozen §3 · 검색 endpoint 경로. 기존 랭킹 조회(/api/scores)와 별개다.
export const SEARCH_API_PATH = '/api/snake/scores/search';

// frozen §3 · mode 허용 값과 기본값. mode 생략 시 single 로 조회한다.
export const SEARCH_MODES = ['single', 'versus'];
export const DEFAULT_SEARCH_MODE = 'single';

// frozen §3 · 서버측 닉네임 규칙: 한글/영문/숫자 2~12자. 앵커되어 정확 길이만 허용한다.
export const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,12}$/;

// 닉네임 정규화: 문자열이면 앞뒤 공백 제거, 그 외는 빈 문자열(검증에서 400 유도).
export function normalizeNickname(nickname) {
  return typeof nickname === 'string' ? nickname.trim() : '';
}

// 닉네임 유효성: (정규화된) 값이 한글/영문/숫자 2~12자인가.
export function isValidSearchNickname(nickname) {
  return typeof nickname === 'string' && NICKNAME_PATTERN.test(nickname);
}

// mode 정규화: 미지정(undefined)은 기본값 single 로 호환한다. single/versus 만 정확 일치로
// 허용하고 그 외(빈 문자열·오타·대소문자 불일치 등)는 null 을 반환하여 400 으로 거부한다.
export function normalizeSearchMode(mode) {
  if (mode === undefined) return DEFAULT_SEARCH_MODE;
  return SEARCH_MODES.includes(mode) ? mode : null;
}

// 점수 유효성: 유한한 비음수 정수인가 (seed/add 방어용).
function isValidScore(score) {
  return (
    typeof score === 'number' &&
    Number.isFinite(score) &&
    Number.isInteger(score) &&
    score >= 0
  );
}

// 정렬·순위 부여: score 내림차순, 동점은 먼저 기록된 순(recordedAt asc), 그다음 닉네임 asc.
// 기존 랭킹(scores-api.js)과 동일한 결정론적 안정 정렬로 1-based rank 를 부여한다.
function rankEntries(rows) {
  return rows
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.recordedAt !== b.recordedAt) return a.recordedAt < b.recordedAt ? -1 : 1;
      return a.nickname < b.nickname ? -1 : a.nickname > b.nickname ? 1 : 0;
    })
    .map((row, index) => ({
      rank: index + 1,
      nickname: row.nickname,
      score: row.score,
      recordedAt: row.recordedAt,
    }));
}

// 닉네임 검색 저장소. mode 별로 (닉네임 → 최고 점수 엔트리) 를 upsert 하며, search 로 해당
// 닉네임의 순위를 조회한다. 원격 DB 가 없는 정적 데모에서 §3 계약을 그대로 구현한다.
// now 를 주입하면 결정론적으로 테스트된다.
export function createSearchStore({ now } = {}) {
  const clock = typeof now === 'function' ? now : () => new Date().toISOString();
  // Map<mode, Map<nickname, { nickname, score, recordedAt }>>
  const byMode = new Map();

  function bucket(mode) {
    if (!byMode.has(mode)) {
      byMode.set(mode, new Map());
    }
    return byMode.get(mode);
  }

  // 기록 추가(seed/테스트용). 더 높은 점수만 갱신하는 멱등 upsert — 저장 경로가 아니라
  // 검색 대상 데이터를 구성하기 위한 보조 API 다.
  function add({ nickname, score, mode, recordedAt } = {}) {
    const trimmed = normalizeNickname(nickname);
    if (!isValidSearchNickname(trimmed) || !isValidScore(score)) {
      return false;
    }
    const key = normalizeSearchMode(mode) || DEFAULT_SEARCH_MODE;
    const entries = bucket(key);
    const existing = entries.get(trimmed);
    if (!existing || score > existing.score) {
      entries.set(trimmed, {
        nickname: trimmed,
        score,
        recordedAt: typeof recordedAt === 'string' ? recordedAt : clock(),
      });
    }
    return true;
  }

  // GET /api/snake/scores/search?nickname=&mode= — 닉네임 순위 조회.
  //   - 닉네임 규칙 위반 또는 mode 규칙 위반 → { status: 400 }
  //   - 유효하지만 기록 없음 → { status: 404 }
  //   - found → { status: 200, body: { rank, nickname, score, recordedAt } }
  function search(query) {
    const q = query || {};
    const nickname = normalizeNickname(q.nickname);
    if (!isValidSearchNickname(nickname)) {
      return { status: 400, body: { error: '닉네임은 한글/영문/숫자 2~12자여야 합니다' } };
    }
    const mode = normalizeSearchMode(q.mode);
    if (mode === null) {
      return { status: 400, body: { error: 'mode 는 single 또는 versus 여야 합니다' } };
    }
    const rows = byMode.has(mode) ? Array.from(byMode.get(mode).values()) : [];
    const ranked = rankEntries(rows);
    const mine = ranked.find((row) => row.nickname === nickname);
    if (!mine) {
      return { status: 404, body: { error: '해당 닉네임의 기록이 없습니다' } };
    }
    return {
      status: 200,
      body: {
        rank: mine.rank,
        nickname: mine.nickname,
        score: mine.score,
        recordedAt: mine.recordedAt,
      },
    };
  }

  // 저장소 초기화(테스트·재시작용).
  function reset() {
    byMode.clear();
  }

  return { add, search, reset };
}

// URL query string 파서(정적 데모 fetch 어댑터용). nickname/mode 만 추출한다.
function parseQuery(url) {
  const qIndex = String(url).indexOf('?');
  const out = {};
  if (qIndex === -1) return out;
  for (const pair of String(url)
    .slice(qIndex + 1)
    .split('&')) {
    if (!pair) continue;
    const [rawKey, rawVal = ''] = pair.split('=');
    out[decodeURIComponent(rawKey)] = decodeURIComponent(rawVal);
  }
  return out;
}

// 저장소를 프런트의 fetchImpl 로 어댑트한다. 정적 데모/테스트에서 GET 검색 요청을 인메모리
// 저장소로 백킹하며 Response 유사 객체({ ok, status, json })를 반환한다.
export function createSearchFetch(store) {
  return async function searchFetch(url) {
    const result = store.search(parseQuery(url));
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      async json() {
        return result.body;
      },
    };
  };
}
