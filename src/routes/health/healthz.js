// BF-734 · /healthz 라우트 핸들러 (Node 내장 http 모듈 기반, 프레임워크 비의존)
//
// infra 의 readiness/liveness probe 가 호출하는 운영 헬스체크 엔드포인트.
//   - 정상:   200 OK  + {"status":"ok"}
//   - 비정상: 503     + {"status":"error", "checks": {...}}  (실패 사유 포함)

import { createServer } from "node:http";
import { runHealthChecks } from "../../health/check.js";

const DEFAULT_PATH = "/healthz";

/**
 * /healthz 요청을 처리하고 응답을 기록한다.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {{checks?: Array<{name: string, check: Function}>}} options
 * @returns {Promise<number>} 응답 상태 코드
 */
export async function handleHealthz(req, res, { checks = [] } = {}) {
  const { healthy, checks: results } = await runHealthChecks(checks);
  const code = healthy ? 200 : 503;
  const body = healthy ? { status: "ok" } : { status: "error", checks: results };

  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
  return code;
}

/**
 * /healthz 만 처리하는 경량 http 서버를 생성한다 (테스트·standalone 운영용).
 * 다른 경로는 404 JSON 으로 응답한다.
 * @param {{checks?: Array, path?: string}} options
 * @returns {import('node:http').Server}
 */
export function createHealthzServer({ checks = [], path = DEFAULT_PATH } = {}) {
  return createServer(async (req, res) => {
    if (req.method === "GET" && req.url === path) {
      await handleHealthz(req, res, { checks });
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ status: "not_found" }));
  });
}

export { DEFAULT_PATH };
