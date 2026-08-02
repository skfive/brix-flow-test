// 네온 스네이크 · 랭킹 점수 저장/조회 API 계층 (BF-1550)
// 설계 기준: docs/plans/snake-ranking-plan-BF-1548.md §3.1(네트워크 계층)·§4·§5 (frozen)
//
// 관심사 분리(frozen §8): 이 모듈은 두 층으로 구성된다.
//   (1) frozen §3.1 네트워크 계층 — 주입된 fetch(fetchImpl)로 실제 HTTP 호출을 수행하고
//       비 2xx 응답·네트워크 오류(reject)는 throw 한다. error → UI 상태 변환은 ranking.js 책임.
//   (2) additive 백엔드 참조(createScoresStore) — 정적 데모에는 원격 서버가 없으므로 동일한
//       §5 요청/응답 계약을 구현하는 인메모리 멱등 저장소를 둔다. createStoreFetch 로 (1)의
//       fetchImpl 을 정적 환경에서 백킹하며, 멱등성·검증(400) acceptance-criteria 도 여기서 만족한다.
// 이 모듈은 DOM/window 에 의존하지 않는다.

// frozen §3.1/§5 · 랭킹 API base 경로.
export const SCORES_API_BASE = '/api/scores';

// 보드 노출 상위 개수(기본).
export const DEFAULT_LIMIT = 10;

// 서버측 닉네임 규칙: 한글/영문/숫자 2~12자 (work packet acceptance-criteria).
// NB: 클라이언트 방어용 isValidNickname(trim 후 비어있지 않음, frozen §3.2)은 ranking.js 소유이며
//     이것과 별개다(2계층 방어: 클라이언트는 빈값 방어, 서버는 전체 규칙 검증 → 400).
export const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,12}$/;

// 서버측 닉네임 유효성: 한글/영문/숫자 2~12자인가.
export function isValidNicknameStrict(nickname) {
  return typeof nickname === 'string' && NICKNAME_PATTERN.test(nickname);
}

// 점수 유효성: 유한한 비음수 정수인가 (음수/실수/NaN 은 무효).
export function isValidScore(score) {
  return (
    typeof score === 'number' &&
    Number.isFinite(score) &&
    Number.isInteger(score) &&
    score >= 0
  );
}

// ---- (1) frozen §3.1 네트워크 계층 — 주입 가능한 fetch 클라이언트 ----

// 상위 랭킹 조회: GET ${SCORES_API_BASE}?mode=&limit=.
// response.ok 가 false 이거나 fetch 가 reject 하면 throw 한다. 성공 시 { entries } 반환.
export async function fetchScores(fetchImpl, { mode, limit = DEFAULT_LIMIT }) {
  const url = `${SCORES_API_BASE}?mode=${encodeURIComponent(mode)}&limit=${encodeURIComponent(
    limit,
  )}`;
  const res = await fetchImpl(url, { method: 'GET', headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`랭킹 조회 실패: ${res.status}`);
  }
  return res.json(); // { entries }
}

// 점수 등록: POST ${SCORES_API_BASE} (Content-Type: application/json, §5.1 body).
// response.ok 가 false 이거나 fetch 가 reject 하면 throw 한다. 성공 시 { rank, entries } 반환.
export async function submitScore(fetchImpl, { nickname, score, mode }) {
  const res = await fetchImpl(SCORES_API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ nickname, score, mode }),
  });
  if (!res.ok) {
    throw new Error(`랭킹 등록 실패: ${res.status}`);
  }
  return res.json(); // { rank, entries }
}

// ---- (2) additive 백엔드 참조 — 인메모리 멱등 저장소 (§5 계약 구현) ----

// 모드 정규화: 비어 있으면 기본 랭킹 모드('local').
function normalizeMode(mode) {
  return typeof mode === 'string' && mode.trim().length > 0 ? mode : 'local';
}

// 정렬·순위 부여: score 내림차순, 동점은 먼저 기록된 순(recordedAt asc), 그다음 닉네임 asc.
// 각 항목에 1-based rank 를 부여한다(결정론적 안정 정렬).
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

// 점수 저장소. 모드별로 (닉네임 → 최고 점수 엔트리) 를 upsert 하여 멱등성을 보장한다:
// 같은 { nickname, score, mode } 를 반복 적용해도 상태가 동일하고, 더 낮거나 같은
// 점수 재등록은 no-op(기존 recordedAt 보존)이다. now 를 주입하면 결정론적으로 테스트된다.
export function createScoresStore({ now } = {}) {
  const clock = typeof now === 'function' ? now : () => new Date().toISOString();
  // Map<mode, Map<nickname, { nickname, score, recordedAt }>>
  const byMode = new Map();

  function bucket(mode) {
    const key = normalizeMode(mode);
    if (!byMode.has(key)) {
      byMode.set(key, new Map());
    }
    return byMode.get(key);
  }

  // POST /api/scores — 점수 등록.
  // 검증 실패 시 { status: 400 }, 성공 시 { status: 200, body: { rank, entries } }.
  function post(body) {
    const input = body || {};
    if (!isValidNicknameStrict(input.nickname)) {
      return { status: 400, body: { error: '닉네임은 한글/영문/숫자 2~12자여야 합니다' } };
    }
    if (!isValidScore(input.score)) {
      return { status: 400, body: { error: '점수는 0 이상의 정수여야 합니다' } };
    }

    const mode = normalizeMode(input.mode);
    const entries = bucket(mode);
    const existing = entries.get(input.nickname);
    // 멱등 upsert: 더 높은 점수만 기록을 갱신(recordedAt 갱신), 그 외는 기존 유지.
    if (!existing || input.score > existing.score) {
      entries.set(input.nickname, {
        nickname: input.nickname,
        score: input.score,
        recordedAt: existing && input.score === existing.score ? existing.recordedAt : clock(),
      });
    }

    const ranked = rankEntries(Array.from(entries.values()));
    const mine = ranked.find((row) => row.nickname === input.nickname);
    return {
      status: 200,
      body: { rank: mine ? mine.rank : ranked.length, entries: ranked.slice(0, DEFAULT_LIMIT) },
    };
  }

  // GET /api/scores?mode=&limit= — 상위 랭킹 조회.
  // { status: 200, body: { entries: Array<{ rank, nickname, score, recordedAt }> } }.
  function get(query) {
    const q = query || {};
    const mode = normalizeMode(q.mode);
    const limit = isValidScore(q.limit) && q.limit > 0 ? q.limit : DEFAULT_LIMIT;
    const entries = byMode.has(mode)
      ? rankEntries(Array.from(byMode.get(mode).values())).slice(0, limit)
      : [];
    return { status: 200, body: { entries } };
  }

  // 저장소 초기화(테스트·재시작용).
  function reset() {
    byMode.clear();
  }

  return { post, get, reset };
}

// URL query string 파서(정적 데모 fetch 어댑터용). base 없이 mode/limit 만 추출한다.
function parseQuery(url) {
  const qIndex = String(url).indexOf('?');
  const out = {};
  if (qIndex === -1) return out;
  for (const pair of String(url).slice(qIndex + 1).split('&')) {
    if (!pair) continue;
    const [rawKey, rawVal = ''] = pair.split('=');
    out[decodeURIComponent(rawKey)] = decodeURIComponent(rawVal);
  }
  if (out.limit !== undefined) {
    const n = Number(out.limit);
    if (Number.isFinite(n)) out.limit = n;
  }
  return out;
}

// 저장소를 frozen §3.1 fetchImpl 로 어댑트한다. 정적 데모/테스트에서 fetchScores/submitScore
// 네트워크 계층을 인메모리 저장소로 백킹하며, Response 유사 객체({ ok, status, json })를 반환한다.
export function createStoreFetch(store) {
  return async function storeFetch(url, init = {}) {
    const method = (init.method || 'GET').toUpperCase();
    const result =
      method === 'POST' ? store.post(JSON.parse(init.body || '{}')) : store.get(parseQuery(url));
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      async json() {
        return result.body;
      },
    };
  };
}
