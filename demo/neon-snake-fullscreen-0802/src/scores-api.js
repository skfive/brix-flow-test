// 네온 스네이크 · 랭킹 점수 저장/조회 API 계층 (BF-1550)
// 설계 기준: docs/plans/snake-ranking-plan-BF-1548.md §3~§5 (planning-contract@v1)
// acceptance-criteria(권위): work packet — POST/GET /api/snake/scores 검증·저장소·멱등성.
//
// 이 모듈은 DOM/window/네트워크에 의존하지 않는 순수 로직이다. 저장소는 인메모리이며
// 시각(now)을 주입 가능해 결정론적으로 테스트된다. 브라우저에서는 in-process 로,
// 서버 환경에서는 HTTP 핸들러로 재사용 가능한 요청/응답({ status, body }) 형태로 반환한다.

// frozen API 경로 (work packet acceptance-criteria).
export const SCORES_API_PATH = '/api/snake/scores';

// 닉네임 규칙: 한글/영문/숫자 2~12자 (work packet acceptance-criteria).
export const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,12}$/;

// 보드 노출 상위 개수(기본).
export const DEFAULT_LIMIT = 10;

// 닉네임 유효성: 한글/영문/숫자 2~12자인가.
export function isValidNickname(nickname) {
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

// 모드 정규화: 비어 있으면 기본 랭킹 모드('single').
function normalizeMode(mode) {
  return typeof mode === 'string' && mode.trim().length > 0 ? mode : 'single';
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
// 점수 재등록은 no-op(기존 recordedAt 보존)이다.
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

  // POST /api/snake/scores — 점수 등록.
  // 검증 실패 시 { status: 400 }, 성공 시 { status: 200, body: { rank, entries } }.
  function post(body) {
    const input = body || {};
    if (!isValidNickname(input.nickname)) {
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

  // GET /api/snake/scores?mode=&limit= — 상위 랭킹 조회.
  // { status: 200, body: { entries: Array<{ rank, nickname, score, recordedAt }> } }.
  function get(query) {
    const q = query || {};
    const mode = normalizeMode(q.mode);
    const limit =
      isValidScore(q.limit) && q.limit > 0 ? q.limit : DEFAULT_LIMIT;
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
