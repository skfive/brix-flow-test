// BF-747 — 순수 라우팅 로직 (의존성 없음)
//
// route() 는 부수효과 없는 순수 함수다. 입력(메서드/경로/파싱된 body)을 받아
// { status, body } 응답 객체를 돌려준다. 실제 I/O(소켓 읽기/쓰기)는 server.js 담당.

import { name, version } from "./meta.js";

/** 프로세스 기동 시각 — uptime 계산 기준 */
const STARTED_AT_MS = Date.now();

/**
 * @typedef {Object} RouteRequest
 * @property {string} method      HTTP 메서드 (대문자 가정)
 * @property {string} path        경로 (쿼리스트링 제외)
 * @property {*} [body]           파싱된 요청 body (JSON)
 * @property {boolean} [bodyError] body JSON 파싱 실패 여부
 *
 * @typedef {Object} RouteResponse
 * @property {number} status
 * @property {Object} body
 */

/** 경로/메서드 → 핸들러 매핑. 경로별 허용 메서드를 명시해 405 를 구분한다. */
const ROUTES = {
  "/health": {
    GET: () => ({ status: 200, body: { status: "ok", uptimeMs: Date.now() - STARTED_AT_MS } }),
  },
  "/api/version": {
    GET: () => ({ status: 200, body: { name, version } }),
  },
  "/api/echo": {
    POST: (req) => {
      if (req.bodyError) {
        return { status: 400, body: { error: "invalid_json" } };
      }
      return { status: 200, body: { echo: req.body ?? null } };
    },
  },
};

/**
 * 요청을 응답으로 매핑하는 순수 함수.
 * @param {RouteRequest} req
 * @returns {RouteResponse}
 */
export function route(req) {
  const handlers = ROUTES[req.path];
  if (!handlers) {
    return { status: 404, body: { error: "not_found" } };
  }
  const handler = handlers[req.method];
  if (!handler) {
    return { status: 405, body: { error: "method_not_allowed", allow: Object.keys(handlers) } };
  }
  return handler(req);
}
