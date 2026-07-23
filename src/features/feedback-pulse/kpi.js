// KPI 집계 (기획 §6, 디자인 §5.2~§5.4 / §6.3)
// 조회 시점의 인메모리 전체 데이터 기준으로 매번 재계산. 0-division 방지.

export const SENTIMENT_KEYS = ['positive', 'neutral', 'negative'];
export const URGENCY_KEYS = ['low', 'medium', 'high', 'critical'];
export const DEFAULT_PULSE_WINDOW_MS = 5 * 60 * 1000; // 최근 5분 (기획 §6 기본값)

/** 비율 문자열(소수점 1자리). 전체 0건이면 "0.0%" (0-division 방지). */
export function percent(count, total) {
  return total === 0 ? '0.0%' : `${((count / total) * 100).toFixed(1)}%`;
}

function distribution(items, field, keys, total) {
  return keys.map((key) => {
    const count = items.filter((i) => i[field] === key).length;
    return { key, count, percent: percent(count, total) };
  });
}

function windowLabel(pulseWindowMs) {
  const minutes = pulseWindowMs / 60000;
  return Number.isInteger(minutes) ? `최근 ${minutes}분` : `최근 ${Math.round(pulseWindowMs / 1000)}초`;
}

/**
 * KPI 를 계산한다(필터 미적용, 전체 데이터 기준).
 * @param {Array<{sentiment:string,urgency:string,submittedAt:string}>} items
 * @param {{ now?: number, pulseWindowMs?: number }} [opts]
 */
export function computeKpi(items, opts = {}) {
  const now = typeof opts.now === 'number' ? opts.now : Date.now();
  const pulseWindowMs = typeof opts.pulseWindowMs === 'number' ? opts.pulseWindowMs : DEFAULT_PULSE_WINDOW_MS;
  const total = items.length;

  const negativeCount = items.filter((i) => i.sentiment === 'negative').length;
  const urgentCount = items.filter((i) => i.urgency === 'high' || i.urgency === 'critical').length;

  const windowStart = now - pulseWindowMs;
  const pulseRate = items.filter((i) => {
    const t = Date.parse(i.submittedAt);
    return !Number.isNaN(t) && t >= windowStart && t <= now;
  }).length;

  return {
    total,
    sentimentDistribution: distribution(items, 'sentiment', SENTIMENT_KEYS, total),
    urgencyDistribution: distribution(items, 'urgency', URGENCY_KEYS, total),
    negativeCount,
    negativeRatio: percent(negativeCount, total),
    urgentCount,
    pulseRate,
    pulseWindowMs,
    pulseWindowLabel: windowLabel(pulseWindowMs),
  };
}
