// 릴리스 준비도 렌더 헬퍼 (BF-1146)
// 순수 함수 — 파생 결과를 HTML 문자열로 변환. DOM 조작/부수효과 없음.

/** @typedef {import('./readiness.js').deriveReadiness} DeriveReadiness */

const STATUS_LABEL = {
  done: '완료',
  pending: '대기',
  failed: '실패',
};

/**
 * HTML 특수문자 escape — fixture 는 신뢰되지만 XSS 회귀 방지 차원에서 방어적으로 처리.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {{ status: string, label: string, blocks: boolean }} item
 * @returns {string}
 */
export function renderItem(item) {
  const statusText = STATUS_LABEL[item.status] ?? item.status;
  const blockingTag = item.blocks ? ' <span class="tag tag-blocking">차단</span>' : '';
  return (
    `<li class="item item-${escapeHtml(item.status)}" data-item-id="${escapeHtml(item.id)}">` +
    `<span class="item-status" aria-hidden="true"></span>` +
    `<span class="item-label">${escapeHtml(item.label)}</span>` +
    `<span class="item-status-text">${escapeHtml(statusText)}</span>` +
    `${blockingTag}` +
    `</li>`
  );
}

/**
 * @param {ReturnType<import('./readiness.js').deriveAreaSummary>} area
 * @returns {string}
 */
export function renderArea(area) {
  const itemsHtml = area.items.map(renderItem).join('');
  return (
    `<section class="area" data-area-id="${escapeHtml(area.id)}">` +
    `<header class="area-header">` +
    `<h2 class="area-name">${escapeHtml(area.name)}</h2>` +
    `<span class="area-rate" data-area-rate="${area.completionRate}">${area.done}/${area.total} · ${area.completionRate}%</span>` +
    `</header>` +
    `<ul class="item-list">${itemsHtml}</ul>` +
    `</section>`
  );
}

/**
 * @param {ReturnType<import('./readiness.js').deriveReadiness>} readiness
 * @returns {string}
 */
export function renderSummary(readiness) {
  const statusClass = readiness.releaseReady ? 'ready' : 'blocked';
  const statusText = readiness.releaseReady ? '릴리스 가능' : '릴리스 차단됨';
  return (
    `<div class="summary summary-${statusClass}">` +
    `<div class="summary-rate"><span class="summary-rate-value" data-completion-rate="${readiness.completionRate}">${readiness.completionRate}%</span><span class="summary-rate-label">전체 완료율</span></div>` +
    `<div class="summary-counts">` +
    `<span data-done-items="${readiness.doneItems}">${readiness.doneItems}/${readiness.totalItems} 항목 완료</span>` +
    `<span class="summary-status" data-release-ready="${readiness.releaseReady}">${statusText}</span>` +
    `<span class="summary-blocking" data-blocking-count="${readiness.blockingItems.length}">차단 항목 ${readiness.blockingItems.length}건</span>` +
    `</div>` +
    `</div>`
  );
}

/**
 * @param {ReturnType<import('./readiness.js').deriveReadiness>} readiness
 * @returns {string}
 */
export function renderBlockingList(readiness) {
  if (readiness.blockingItems.length === 0) {
    return `<p class="blocking-empty" data-blocking-empty="true">차단 항목이 없습니다. 릴리스 준비 완료.</p>`;
  }
  const rows = readiness.blockingItems
    .map(
      (item) =>
        `<li class="blocking-row" data-blocking-id="${escapeHtml(item.id)}">` +
        `<span class="blocking-area">${escapeHtml(item.areaName)}</span>` +
        `<span class="blocking-label">${escapeHtml(item.label)}</span>` +
        `<span class="blocking-status">${escapeHtml(STATUS_LABEL[item.status] ?? item.status)}</span>` +
        `</li>`,
    )
    .join('');
  return `<ul class="blocking-list">${rows}</ul>`;
}

/**
 * 전체 페이지 본문 렌더.
 * @param {ReturnType<import('./readiness.js').deriveReadiness>} readiness
 * @returns {string}
 */
export function renderReadinessView(readiness) {
  const areasHtml = readiness.areas.map(renderArea).join('');
  return (
    renderSummary(readiness) +
    `<section class="blocking-section"><h2 class="section-title">차단 항목</h2>${renderBlockingList(readiness)}</section>` +
    `<section class="areas-section"><h2 class="section-title">영역별 체크리스트</h2><div class="area-grid">${areasHtml}</div></section>`
  );
}

export { STATUS_LABEL };
