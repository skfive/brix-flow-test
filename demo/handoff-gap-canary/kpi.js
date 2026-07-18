// KPI 측정 코드 (task AC-3). 두 축:
//  1) computeHandoffKpis: 계산된 항목에서 파생하는 결정론적 운영 KPI(순수 함수·테스트 가능).
//  2) createKpiTracker: 런타임 인터랙션 계수기(선택/필터/저장 이벤트). 판정 로직에 영향 없음.
// 난수/현재시각을 판정에 쓰지 않으므로 실행마다 동일한 KPI 가 나온다(결정론적 fixture 요구 충족).

import { summarize } from './domain.js';

/**
 * 계산된 항목 배열에서 운영 KPI 를 도출한다(결정론적, 순수 함수).
 * @param {ReadonlyArray<{riskLevel:string,hasDataGap:boolean,hasDeadlineExceeded:boolean,missingFields:string[]}>} computedItems
 * @returns {{
 *   total:number,
 *   riskCounts:{normal:number,data_gap:number,deadline_exceeded:number,critical:number},
 *   atRiskCount:number,
 *   atRiskRate:number,
 *   dataGapCount:number,
 *   deadlineExceededCount:number,
 *   criticalCount:number,
 *   locallyResolvableCount:number
 * }}
 */
export function computeHandoffKpis(computedItems) {
  const summary = summarize(computedItems);
  const total = summary.total;
  const atRiskCount = total - summary.normal;

  // 로컬 보완으로 normal 전환 가능한 건수: 유일 누락이 후속 액션이고 기한 초과가 없는 경우.
  let locallyResolvableCount = 0;
  for (const item of computedItems) {
    if (
      item.hasDataGap &&
      !item.hasDeadlineExceeded &&
      item.missingFields.length === 1 &&
      item.missingFields[0] === 'followUpAction'
    ) {
      locallyResolvableCount += 1;
    }
  }

  return {
    total,
    riskCounts: {
      normal: summary.normal,
      data_gap: summary.data_gap,
      deadline_exceeded: summary.deadline_exceeded,
      critical: summary.critical,
    },
    atRiskCount,
    atRiskRate: total === 0 ? 0 : atRiskCount / total,
    dataGapCount: summary.data_gap,
    deadlineExceededCount: summary.deadline_exceeded,
    criticalCount: summary.critical,
    locallyResolvableCount,
  };
}

/** 추적 가능한 인터랙션 이벤트 목록. */
export const KPI_EVENTS = Object.freeze([
  'itemSelect',
  'filterChange',
  'followUpSave',
  'followUpRemove',
  'validationError',
  'recompute',
]);

/**
 * 런타임 인터랙션 계수기. Date.now/난수 미사용(계수만) → 결정론 유지.
 * @returns {{track:(event:string)=>void,snapshot:()=>{[event:string]:number},reset:()=>void}}
 */
export function createKpiTracker() {
  /** @type {{[event:string]:number}} */
  const counts = {};
  for (const event of KPI_EVENTS) counts[event] = 0;

  return {
    track(event) {
      if (Object.prototype.hasOwnProperty.call(counts, event)) {
        counts[event] += 1;
      }
    },
    snapshot() {
      return { ...counts };
    },
    reset() {
      for (const event of KPI_EVENTS) counts[event] = 0;
    },
  };
}
