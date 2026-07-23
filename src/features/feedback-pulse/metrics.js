// KPI 측정 로그 (기획 AC-3 / Task 수용기준: "KPI 측정 로그가 남는다")
// API 호출별 측정 이벤트를 인메모리로 누적하고 주입된 logger 로 출력한다.

/**
 * 측정 이벤트 레코더를 생성한다.
 * @param {{ logger?: { log?: Function, info?: Function } }} [opts]
 */
export function createMetrics(opts = {}) {
  const logger = opts.logger === undefined ? console : opts.logger;
  /** @type {Array<Record<string, unknown> & { at: string }>} */
  const events = [];

  return {
    /**
     * 측정 이벤트를 기록한다. 접수 수락/거부, 보드 조회, KPI 조회 등.
     * @param {Record<string, unknown>} event
     */
    record(event) {
      const entry = { ...event, at: new Date().toISOString() };
      events.push(entry);
      if (logger) {
        const sink = typeof logger.info === 'function' ? logger.info : logger.log;
        if (typeof sink === 'function') sink.call(logger, '[feedback-pulse:kpi]', JSON.stringify(entry));
      }
      return entry;
    },
    /** 누적 이벤트 스냅샷(외부 변형 방지). */
    events() {
      return events.slice();
    },
  };
}
