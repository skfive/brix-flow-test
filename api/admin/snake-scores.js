// 운영자(CMS) 스네이크 랭킹 조회 API — GET /api/admin/snake-scores
//
// docs/plans/implementation-plan.md §3(Backend API 계약)의 frozen 값을 유일 권위로
// 구현한다. build step 없이 import 가능한 순수 ESM 이며, 기존 점수 데이터
// (`{ nickname, score, mode, recordedAt }`, mode = single|versus)를 read-only 로 읽어
// §3.3 응답 형태로 직렬화한다. 기존 저장(POST)·조회(GET /api/snake/scores) 경로는
// 건드리지 않는다.

// §3.1 Endpoint 경로 (route_mapping = root-relative-static → 파일 경로가 곧 route)
export const ADMIN_SCORES_API_PATH = '/api/admin/snake-scores';

// §3.2 query 허용 값
export const ADMIN_SCORE_MODES = ['all', 'single', 'duo'];
export const DEFAULT_ADMIN_MODE = 'all';
export const ADMIN_SCORE_LIMITS = [10, 25, 50, 100];
export const DEFAULT_ADMIN_LIMIT = 25;

// §3.3 scores[].mode 노출 값 (데이터 소스 mode 를 API 값으로 고정 노출)
export const RESULT_MODES = ['single', 'duo'];

// §3.4 에러코드
export const ERROR_CODES = {
  invalidMode: 'invalid_mode',
  invalidLimit: 'invalid_limit',
  methodNotAllowed: 'method_not_allowed',
  internalError: 'internal_error',
};

// §3.2 가정(명시): 데이터 소스는 single/versus 를 쓰지만 API 노출 값은 single/duo 로 고정.
const DATA_MODE_TO_API = { single: 'single', versus: 'duo' };
const API_MODE_TO_DATA = { single: 'single', duo: 'versus' };

function toApiMode(dataMode) {
  return Object.prototype.hasOwnProperty.call(DATA_MODE_TO_API, dataMode)
    ? DATA_MODE_TO_API[dataMode]
    : dataMode;
}

// mode query 정규화. 미지정/빈 값은 기본값, 허용 값 외는 null(→ 400 invalid_mode).
export function normalizeMode(rawMode) {
  if (rawMode === undefined || rawMode === null || rawMode === '') {
    return DEFAULT_ADMIN_MODE;
  }
  const mode = String(rawMode);
  return ADMIN_SCORE_MODES.includes(mode) ? mode : null;
}

// limit query 정규화. 미지정/빈 값은 기본값, 정수 아님/허용 값 외는 null(→ 400 invalid_limit).
export function normalizeLimit(rawLimit) {
  if (rawLimit === undefined || rawLimit === null || rawLimit === '') {
    return DEFAULT_ADMIN_LIMIT;
  }
  if (!/^-?\d+$/.test(String(rawLimit).trim())) {
    return null;
  }
  const limit = Number(rawLimit);
  return ADMIN_SCORE_LIMITS.includes(limit) ? limit : null;
}

// §5 불변식: score 내림차순, 동점은 recordedAt 오름차순(먼저 달성이 상위),
// rank 는 1부터 연속, 길이 ≤ limit. mode=all 은 모드 무관, single/duo 는 해당 모드만.
export function rankScores(rows, { mode = DEFAULT_ADMIN_MODE, limit = DEFAULT_ADMIN_LIMIT } = {}) {
  const source = Array.isArray(rows) ? rows : [];
  const wantedDataMode = mode === 'all' ? null : API_MODE_TO_DATA[mode];
  const filtered = source.filter((row) => mode === 'all' || row.mode === wantedDataMode);
  const sorted = filtered.slice().sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return String(a.recordedAt).localeCompare(String(b.recordedAt));
  });
  return sorted.slice(0, limit).map((row, index) => ({
    rank: index + 1,
    nickname: row.nickname,
    score: row.score,
    mode: toApiMode(row.mode),
    playedAt: row.recordedAt,
  }));
}

// URL 에서 query string 을 파싱한다(기존 search.js parseQuery 와 동일 규약).
function parseQuery(url) {
  const raw = String(url);
  const qIndex = raw.indexOf('?');
  const out = {};
  if (qIndex === -1) {
    return out;
  }
  const qs = raw.slice(qIndex + 1);
  for (const pair of qs.split('&')) {
    if (!pair) {
      continue;
    }
    const [rawKey, rawVal = ''] = pair.split('=');
    const key = decodeURIComponent(rawKey);
    out[key] = decodeURIComponent(rawVal);
  }
  return out;
}

function jsonResponse(status, body) {
  return {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body,
  };
}

function errorResponse(status, code, message) {
  return jsonResponse(status, { error: { code, message } });
}

// 주입된 점수 소스에서 rows 를 얻는다. 함수 / { list() } / 배열 을 모두 허용한다.
function resolveList(source) {
  if (typeof source === 'function') {
    return source;
  }
  if (source && typeof source.list === 'function') {
    return () => source.list();
  }
  if (Array.isArray(source)) {
    return () => source;
  }
  return () => [];
}

// 운영자 랭킹 조회 fetch-like 핸들러. 기존 createSearchFetch 와 동일하게
// { status, headers, body } 를 반환한다. source 는 기존 점수 데이터를 노출하는
// read-only 소스(함수 / { list() } / 배열)이며, 이 핸들러는 소스를 변경하지 않는다.
export function createAdminScoresFetch(source) {
  const list = resolveList(source);
  return async function adminScoresFetch(url, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    if (method !== 'GET') {
      return errorResponse(405, ERROR_CODES.methodNotAllowed, 'only GET is supported');
    }

    const query = parseQuery(url);

    const mode = normalizeMode(query.mode);
    if (mode === null) {
      return errorResponse(400, ERROR_CODES.invalidMode, 'mode must be one of all, single, duo');
    }

    const limit = normalizeLimit(query.limit);
    if (limit === null) {
      return errorResponse(400, ERROR_CODES.invalidLimit, 'limit must be one of 10, 25, 50, 100');
    }

    try {
      const rows = list() || [];
      const scores = rankScores(rows, { mode, limit });
      return jsonResponse(200, { mode, limit, count: scores.length, scores });
    } catch {
      return errorResponse(500, ERROR_CODES.internalError, 'failed to load scores');
    }
  };
}

// 테스트·wiring 용 in-memory 소스. 기존 점수 레코드 스키마
// (`{ nickname, score, mode, recordedAt }`)를 그대로 담는다.
export function createAdminScoresStore(initial = []) {
  let rows = Array.isArray(initial) ? initial.map((row) => ({ ...row })) : [];
  return {
    add(entry) {
      rows.push({ ...entry });
      return entry;
    },
    list() {
      return rows.slice();
    },
    reset() {
      rows = [];
    },
  };
}
