// feedback-pulse HTTP 라우트 계약 매핑 (기획 §5)
// 프레임워크 비의존 라우터: { method, path, query, body } → { status, body }.
// Express/Fastify 등 실제 서버 어댑터가 이 순수 라우터를 감싸 사용할 수 있다.
import { createFeedbackPulseService } from '../../features/feedback-pulse/service.js';

const BASE = '/feedback-pulse';

/**
 * 라우터를 생성한다. service 를 주입하지 않으면 자체 인메모리 인스턴스를 사용한다.
 * @param {ReturnType<typeof createFeedbackPulseService>} [service]
 */
export function createRouter(service = createFeedbackPulseService()) {
  /**
   * @param {{ method?: string, path?: string, query?: Record<string, string>, body?: unknown }} [req]
   * @returns {{ status: number, body: unknown }}
   */
  return function handle(req = {}) {
    const method = req.method;
    const path = req.path ?? BASE;
    const query = req.query ?? {};

    // 접수: POST /feedback-pulse
    if (method === 'POST' && path === BASE) {
      let parsed = req.body;
      if (typeof req.body === 'string') {
        const raw = req.body.trim();
        if (raw === '') {
          parsed = undefined; // 빈 본문 → validate 가 400 처리
        } else {
          try {
            parsed = JSON.parse(raw);
          } catch {
            service.metrics.record({ type: 'submit_rejected', field: 'body' });
            return { status: 400, body: { error: { field: 'body', message: '요청 본문이 올바른 JSON 형식이 아닙니다.' } } };
          }
        }
      }
      return service.submit(parsed);
    }

    // KPI: GET /feedback-pulse/kpi  (목록 매칭보다 먼저 검사)
    if (method === 'GET' && path === `${BASE}/kpi`) {
      return service.kpi();
    }

    // 목록: GET /feedback-pulse?sentiment=&urgency=
    if (method === 'GET' && path === BASE) {
      return service.list({ sentiment: query.sentiment, urgency: query.urgency });
    }

    return { status: 404, body: { error: { message: '요청한 경로를 찾을 수 없습니다.' } } };
  };
}
