// 업무 인수인계 보드 — 인증 가드 + 데이터 의존성 로더 (BF-1158).
// 기존 공용 인증 가드를 보존하는 형태로, 인증된 세션에서만 데이터를 fetch 한다.
// fetch 구현을 주입 가능하게 하여 브라우저/테스트 모두에서 결정론적으로 동작한다.

import { createBoard } from './domain.js';

/** 데모 환경의 기본 인증 세션(운영자 개입 없이 인증된 사용자로 진입). */
export const DEMO_SESSION = Object.freeze({
  token: 'demo-canary-session',
  user: '데모 운영자',
  roles: Object.freeze(['handoff.viewer', 'handoff.editor']),
});

/** 데이터 의존성 URL(같은 오리진의 정적 픽스처). */
export const BOARD_DATA_URL = new URL('./data/board.json', import.meta.url).href;

/**
 * 공용 인증 가드. 유효한 세션이 아니면 UNAUTHENTICATED 로 차단한다.
 * @param {{token?: string, user?: string, roles?: ReadonlyArray<string>}|null|undefined} session
 * @returns {{user: string, roles: ReadonlyArray<string>}}
 */
export function requireAuth(session) {
  if (!session || typeof session.token !== 'string' || session.token.length === 0) {
    const err = new Error('인증이 필요합니다.');
    /** @type {Error & {code?: string}} */ (err).code = 'UNAUTHENTICATED';
    throw err;
  }
  return { user: session.user ?? '알 수 없음', roles: session.roles ?? [] };
}

/**
 * 응답 페이로드를 검증해 보드로 변환한다.
 * @param {unknown} payload
 * @returns {{items: ReadonlyArray<object>}}
 */
function toBoard(payload) {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('보드 데이터 형식이 올바르지 않습니다.');
  }
  const items = /** @type {{items?: unknown}} */ (payload).items;
  return createBoard(Array.isArray(items) ? items : []);
}

/**
 * 인증 가드를 통과한 뒤 데이터 의존성을 fetch 해 초기 보드를 반환한다.
 * @param {{fetch: typeof globalThis.fetch, url?: string, session?: object}} deps
 * @returns {Promise<{items: ReadonlyArray<object>}>}
 */
export async function loadBoardData(deps) {
  const { fetch: fetchImpl, url = BOARD_DATA_URL, session = DEMO_SESSION } = deps ?? {};
  requireAuth(session);
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch 구현이 필요합니다.');
  }
  const res = await fetchImpl(url);
  if (!res || res.ok !== true) {
    throw new Error(`데이터 요청 실패: ${res ? res.status : 'no-response'}`);
  }
  const payload = await res.json();
  return toBoard(payload);
}
