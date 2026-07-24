// 릴리스 준비도 순수 상태 파생 로직 (BF-1146)
// 부수효과 없음 — 입력 fixture 로부터 완료율/차단 항목/영역 요약을 결정론적으로 파생.

/** @typedef {import('./fixture.js').ReadinessItem} ReadinessItem */
/** @typedef {import('./fixture.js').ReadinessArea} ReadinessArea */

/**
 * 항목이 완료 상태인지 여부.
 * @param {ReadinessItem} item
 * @returns {boolean}
 */
export function isComplete(item) {
  return item.status === 'done';
}

/**
 * 항목이 릴리스를 차단하는지 여부.
 * blocking 필수 항목이면서 아직 완료되지 않은 경우 차단으로 집계.
 * @param {ReadinessItem} item
 * @returns {boolean}
 */
export function isBlocking(item) {
  return item.blocking === true && !isComplete(item);
}

/**
 * 완료율(%) 계산. total 이 0 이면 0 을 반환하고 반올림한 정수를 돌려준다.
 * @param {number} done
 * @param {number} total
 * @returns {number}
 */
export function completionRate(done, total) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

/**
 * 단일 영역 요약 파생.
 * @param {ReadinessArea} area
 * @returns {{
 *   id: string,
 *   name: string,
 *   total: number,
 *   done: number,
 *   completionRate: number,
 *   blockingCount: number,
 *   items: Array<ReadinessItem & { complete: boolean, blocks: boolean }>,
 * }}
 */
export function deriveAreaSummary(area) {
  const items = area.items.map((item) => ({
    ...item,
    complete: isComplete(item),
    blocks: isBlocking(item),
  }));
  const total = items.length;
  const done = items.filter((item) => item.complete).length;
  const blockingCount = items.filter((item) => item.blocks).length;
  return {
    id: area.id,
    name: area.name,
    total,
    done,
    completionRate: completionRate(done, total),
    blockingCount,
    items,
  };
}

/**
 * 전체 릴리스 준비도 파생 — 영역별 요약, 전체 완료율, 차단 항목 목록, 릴리스 가능 여부.
 * @param {ReadinessArea[]} areas
 * @returns {{
 *   areas: ReturnType<typeof deriveAreaSummary>[],
 *   totalItems: number,
 *   doneItems: number,
 *   completionRate: number,
 *   blockingItems: Array<{ areaId: string, areaName: string, id: string, label: string, status: string }>,
 *   releaseReady: boolean,
 * }}
 */
export function deriveReadiness(areas) {
  const summaries = areas.map(deriveAreaSummary);
  const totalItems = summaries.reduce((sum, a) => sum + a.total, 0);
  const doneItems = summaries.reduce((sum, a) => sum + a.done, 0);

  const blockingItems = summaries.flatMap((area) =>
    area.items
      .filter((item) => item.blocks)
      .map((item) => ({
        areaId: area.id,
        areaName: area.name,
        id: item.id,
        label: item.label,
        status: item.status,
      })),
  );

  return {
    areas: summaries,
    totalItems,
    doneItems,
    completionRate: completionRate(doneItems, totalItems),
    blockingItems,
    releaseReady: blockingItems.length === 0,
  };
}
