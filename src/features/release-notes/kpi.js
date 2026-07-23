// BF-1087 릴리스 노트 요약 보드 — KPI 측정 (기획 §6, AC-5)
// 전체 카드 기준 매번 재계산. 0-division 방지: 전체 0건이면 모든 비율 0.

import { IMPORTANCE_VALUES, USER_IMPACT_VALUES, RECENT_WINDOW_MS } from './constants.js';

/**
 * count/total 백분율(소수점 1자리). total 0이면 0 (0-division 방지, 기획 §6).
 * @param {number} count
 * @param {number} total
 * @returns {number}
 */
export function toRatio(count, total) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((count / total) * 1000) / 10;
}

/**
 * enum 값별 {count, ratio} 분포 계산.
 * @param {ReadonlyArray<Record<string, unknown>>} cards
 * @param {string} key
 * @param {readonly string[]} values
 * @param {number} total
 */
function distributionOf(cards, key, values, total) {
  /** @type {Record<string, { count: number, ratio: number }>} */
  const dist = {};
  for (const value of values) {
    const count = cards.filter((card) => card[key] === value).length;
    dist[value] = { count, ratio: toRatio(count, total) };
  }
  return dist;
}

/**
 * 요약 카드 KPI 집계 (기획 §6). 검증 전용 라우트 호출은 카드를 만들지 않으므로 반영되지 않는다.
 * @param {ReadonlyArray<Record<string, unknown>>} cards
 * @param {Date} [now]
 */
export function computeKpi(cards, now = new Date()) {
  const total = cards.length;
  const breakingCount = cards.filter((card) => card.userImpact === 'breaking').length;
  const urgentCount = cards.filter(
    (card) => card.importance === 'high' || card.importance === 'critical',
  ).length;

  const nowMs = now.getTime();
  const recent24hCount = cards.filter((card) => {
    const createdMs = new Date(String(card.createdAt)).getTime();
    if (!Number.isFinite(createdMs)) {
      return false;
    }
    const delta = nowMs - createdMs;
    return delta >= 0 && delta <= RECENT_WINDOW_MS;
  }).length;

  return {
    total,
    importanceDist: distributionOf(cards, 'importance', IMPORTANCE_VALUES, total),
    userImpactDist: distributionOf(cards, 'userImpact', USER_IMPACT_VALUES, total),
    breakingRatio: toRatio(breakingCount, total),
    urgentCount,
    recent24hCount,
  };
}
