// feedback-pulse 서비스 오케스트레이션 (기획 §5, 디자인 §5)
// store + validate + kpi + metrics 를 묶어 접수/조회/집계 유스케이스를 제공한다.
// 프레임워크 비의존: HTTP 상태코드와 body 만 반환하고, 전송은 route 계층이 담당한다.
import { createStore } from './store.js';
import { createMetrics } from './metrics.js';
import { validateSubmission } from './validate.js';
import { computeKpi } from './kpi.js';

/**
 * @param {{
 *   store?: ReturnType<typeof createStore>,
 *   metrics?: ReturnType<typeof createMetrics>,
 *   now?: () => number,
 *   pulseWindowMs?: number,
 * }} [deps]
 */
export function createFeedbackPulseService(deps = {}) {
  const store = deps.store ?? createStore();
  const metrics = deps.metrics ?? createMetrics();
  const now = deps.now ?? (() => Date.now());
  const pulseWindowMs = deps.pulseWindowMs;

  /** 피드백 접수 (AC-1 / AC-2 / AC-6). */
  function submit(input) {
    const result = validateSubmission(input);
    if (!result.ok) {
      metrics.record({ type: 'submit_rejected', field: result.error.field });
      return { status: 400, body: { error: result.error } };
    }
    const record = store.add(result.value, { now: now() });
    metrics.record({ type: 'submit_accepted', id: record.id });
    return { status: 201, body: record };
  }

  /**
   * 펄스 보드 목록 조회 (AC-3 / AC-5). 두 필터 AND 결합, 접수 순(FIFO) 반환.
   * 정의되지 않은 필터 값도 에러 아님 → 빈 배열.
   * @param {{ sentiment?: string, urgency?: string }} [filter]
   */
  function list(filter = {}) {
    const sentiment = filter.sentiment ?? 'all';
    const urgency = filter.urgency ?? 'all';
    let items = store.list();
    if (sentiment !== 'all') items = items.filter((i) => i.sentiment === sentiment);
    if (urgency !== 'all') items = items.filter((i) => i.urgency === urgency);
    metrics.record({ type: 'board_query', sentiment, urgency, resultCount: items.length });
    return { status: 200, body: items };
  }

  /** KPI 조회 (AC-4 / AC-5). 전체 데이터 기준 재계산, 0-division 방지. */
  function kpi() {
    const data = computeKpi(store.list(), { now: now(), pulseWindowMs });
    metrics.record({ type: 'kpi_query', total: data.total });
    return { status: 200, body: data };
  }

  return { submit, list, kpi, store, metrics };
}
