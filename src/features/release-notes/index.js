// BF-1087 릴리스 노트 요약 보드 — 공개 API barrel (기획 §5, 디자인 §8)
// 기존 라우트/데이터와 완전히 분리된 신규 additive 모듈(AC-6).

export * from './constants.js';
export { validateSummaryInput } from './validation.js';
export { createInMemoryStore } from './store.js';
export { computeKpi, toRatio } from './kpi.js';
export { createReleaseNotesService } from './service.js';
export {
  escapeHtml,
  formatDateTime,
  renderImpBadge,
  renderImpactChip,
  renderSummaryCard,
  renderCardList,
  renderEmptyState,
  renderValidateResult,
  renderKpiBar,
} from './render.js';
