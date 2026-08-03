// BF-1575 · 운영자용 랭킹 조회 API — GET /api/admin/snake/scores
//
// 유일 권위: docs/plans/implementation-plan.md §3 (경로/query/응답/에러 동결 계약).
// 빌드 없이 실행 가능한 plain JavaScript(ESM). 기존 게임/점수 저장 경로는 건드리지 않고,
// 주입된(또는 env 로 구성된) 점수 데이터를 읽어 { total, items } 로 직렬화한다.

import fs from 'node:fs';

// §3.2 query 허용 값 (frozen)
export const ALLOWED_MODES = Object.freeze(['all', 'single', 'duo']);
export const ALLOWED_LIMITS = Object.freeze([10, 25, 50, 100]);
export const DEFAULT_MODE = 'all';
export const DEFAULT_LIMIT = 25;

const JSON_HEADERS = Object.freeze({ 'Content-Type': 'application/json; charset=utf-8' });

function errorResponse(status, code, message) {
  return { status, headers: { ...JSON_HEADERS }, body: { error: { code, message } } };
}

// --- 인증 (권한 거부 → §3.4 403 forbidden) ------------------------------------

// 운영자 API 토큰. 설정법: 환경 변수 SNAKE_ADMIN_API_TOKEN.
function configuredAdminToken() {
  const token = process.env.SNAKE_ADMIN_API_TOKEN;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

// 요청에서 제시된 토큰 추출: Authorization: Bearer <token> 또는 x-admin-token 헤더.
function presentedToken(headers = {}) {
  const auth = headers.authorization ?? headers.Authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    const value = auth.slice('Bearer '.length).trim();
    if (value.length > 0) return value;
  }
  const direct = headers['x-admin-token'] ?? headers['X-Admin-Token'];
  if (typeof direct === 'string' && direct.length > 0) return direct;
  return null;
}

// 기본 인증기: env 토큰이 설정돼 있고 요청 토큰이 일치할 때만 허용(secure by default).
// 토큰 미설정 시 관리 API 접근을 거부한다.
export function defaultAuthorize(request = {}) {
  const expected = configuredAdminToken();
  if (expected === null) return false;
  return presentedToken(request.headers) === expected;
}

// --- 점수 데이터 소스 ---------------------------------------------------------

// 기본 데이터 로더. 설정법: 환경 변수 SNAKE_SCORES_FILE 에 JSON 배열(또는 { items: [...] })
// 파일 경로를 지정하면 이를 읽는다. 미설정/오류 시 빈 목록으로 안전하게 fallback 한다.
// 기존 점수 저장(POST) 경로·스키마는 변경하지 않고 읽기만 한다.
export function defaultReadScores() {
  const file = process.env.SNAKE_SCORES_FILE;
  if (!file) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
    return [];
  } catch {
    return [];
  }
}

// --- query 정규화 (§3.2 / §3.4) ----------------------------------------------

function normalizeMode(raw) {
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: DEFAULT_MODE };
  if (ALLOWED_MODES.includes(raw)) return { ok: true, value: raw };
  return { ok: false };
}

function normalizeLimit(raw) {
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: DEFAULT_LIMIT };
  // 정수 표기만 허용 (소수/지수/문자 표기는 invalid_limit)
  if (!/^\d+$/.test(String(raw))) return { ok: false };
  const value = Number(raw);
  if (!ALLOWED_LIMITS.includes(value)) return { ok: false };
  return { ok: true, value };
}

// --- 핸들러 (§3.3 { total, items }) ------------------------------------------

// 순수 핸들러: request({ method, query, headers }) + deps({ authorize, readScores })
// 를 받아 { status, headers, body } 를 반환한다. HTTP 프레임워크에 의존하지 않아
// node --test 로 단위/통합 검증이 가능하다.
export async function handleAdminScores(request = {}, deps = {}) {
  const authorize = deps.authorize ?? defaultAuthorize;
  const readScores = deps.readScores ?? defaultReadScores;

  // 1) 권한 거부는 query 검증보다 먼저 (§3.4 403 forbidden)
  if (!authorize(request)) {
    return errorResponse(403, 'forbidden', 'operator authentication required');
  }

  const query = request.query ?? {};

  // 2) query 검증 (§3.4 400)
  const mode = normalizeMode(query.mode);
  if (!mode.ok) {
    return errorResponse(400, 'invalid_mode', 'mode must be one of all, single, duo');
  }
  const limit = normalizeLimit(query.limit);
  if (!limit.ok) {
    return errorResponse(400, 'invalid_limit', 'limit must be one of 10, 25, 50, 100');
  }

  // 3) 데이터 로드 → 필터 → 내림차순 정렬 → rank 부여 → limit 절단 (§3.3 / §7)
  const records = (await readScores()) ?? [];
  const filtered =
    mode.value === 'all' ? records.slice() : records.filter((r) => r.mode === mode.value);
  filtered.sort((a, b) => b.score - a.score);

  const items = filtered.slice(0, limit.value).map((r, index) => ({
    rank: index + 1,
    nickname: r.nickname,
    score: r.score,
    mode: r.mode,
    playedAt: r.playedAt,
  }));

  // total 은 표시 개수(limit)와 무관한 필터 전체 수 (§3.3)
  return { status: 200, headers: { ...JSON_HEADERS }, body: { total: filtered.length, items } };
}

// --- Node HTTP 어댑터 --------------------------------------------------------

// 실제 서버에서 route 로 연결할 얇은 어댑터. req.url 의 query 를 파싱해 순수 핸들러에
// 위임하고 결과를 JSON 으로 응답한다. (빌드 없이 http 서버에 바로 연결 가능)
export async function adminScoresRoute(req, res, deps = {}) {
  const url = new URL(req.url, 'http://localhost');
  const query = {
    mode: url.searchParams.get('mode') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  };
  const result = await handleAdminScores(
    { method: req.method, query, headers: req.headers ?? {} },
    deps,
  );
  res.writeHead(result.status, result.headers);
  res.end(JSON.stringify(result.body));
}

export default handleAdminScores;
