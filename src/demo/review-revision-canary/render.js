// 리뷰 재작업 자동수렴 상태 패널 — 순수 렌더 함수 (브라우저·node 공용, ESM)
// BF-1195: 정적 카나리 데이터를 받아 상태 패널 마크업 문자열을 생성한다.

/**
 * HTML 특수문자를 이스케이프한다.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, (ch) => map[ch]);
}

/**
 * 현재 검증 단계 목록을 렌더한다.
 * @param {{ current: string, activeIndex: number, stages: string[] }} stage
 * @returns {string}
 */
export function renderStagePanel(stage) {
  const items = stage.stages
    .map((name, i) => {
      const state = i < stage.activeIndex ? 'done' : i === stage.activeIndex ? 'active' : 'todo';
      return `<li class="stage-item" data-state="${state}">${escapeHtml(name)}</li>`;
    })
    .join('');
  return `<ol class="stage-list" data-current="${escapeHtml(stage.current)}">${items}</ol>`;
}

/**
 * 최신 revision 메타데이터를 렌더한다.
 * @param {{ latest: number, requestedChanges: number, updatedAt: string }} revision
 * @returns {string}
 */
export function renderRevisionPanel(revision) {
  return [
    '<dl class="revision-meta">',
    `<dt>최신 revision</dt><dd data-field="latest">${escapeHtml(revision.latest)}</dd>`,
    `<dt>수정 요청 수</dt><dd data-field="requested-changes">${escapeHtml(revision.requestedChanges)}</dd>`,
    `<dt>갱신 시각</dt><dd data-field="updated-at">${escapeHtml(revision.updatedAt)}</dd>`,
    '</dl>',
  ].join('');
}

/**
 * 검토 결과를 렌더한다.
 * @param {{ verdict: string, reviewer: string, comment: string }} review
 * @returns {string}
 */
export function renderReviewResult(review) {
  return [
    `<div class="review-result" data-verdict="${escapeHtml(review.verdict)}">`,
    `<p class="review-reviewer">${escapeHtml(review.reviewer)}</p>`,
    `<p class="review-comment">${escapeHtml(review.comment)}</p>`,
    '</div>',
  ].join('');
}

/**
 * 상태 패널 전체를 렌더한다.
 *
 * 통제된 검증 프로토콜(1차 PR): 상태 변경 영역(data-region="review-status")에
 * data-review-cycle="pending" 표식을 남기고 aria-live 를 의도적으로 누락한다.
 * revision 단계에서 pending 표식을 제거하고 aria-live="polite" 를 추가한다.
 *
 * @param {{ stage: object, revision: object, review: object }} data
 * @returns {string}
 */
export function renderStatusPanel({ stage, revision, review }) {
  return [
    '<section class="review-revision-panel" aria-labelledby="rrc-title">',
    '<h1 id="rrc-title">리뷰 재작업 자동수렴 상태</h1>',
    '<div class="status-region" data-region="review-status" data-review-cycle="pending">',
    '<h2>현재 검증 단계</h2>',
    renderStagePanel(stage),
    '<h2>최신 revision</h2>',
    renderRevisionPanel(revision),
    '<h2>검토 결과</h2>',
    renderReviewResult(review),
    '</div>',
    '</section>',
  ].join('');
}
