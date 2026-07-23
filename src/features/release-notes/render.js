// BF-1087 릴리스 노트 요약 보드 — 렌더 함수 (디자인 §5·§6·§7)
// 순수 함수: 입력 → HTML 문자열. DOM 비의존이라 Node 에서 단위 검증 가능.
// 중요도(채움 배지·좌측 보더)와 사용자 영향도(아웃라인 칩)를 형태·위치로 구분한다(디자인 §2.3).

import {
  IMPORTANCE_VALUES,
  USER_IMPACT_VALUES,
  IMPORTANCE_LABELS,
  USER_IMPACT_LABELS,
  IMPORTANCE_SEVERITY,
  USER_IMPACT_SEVERITY,
  IMPORTANCE_SYMBOL,
  USER_IMPACT_GLYPH,
} from './constants.js';

/** 필드 키 → 한국어 라벨 (검증 안내용). */
const FIELD_LABELS = Object.freeze({
  title: '제목',
  changes: '변경 항목',
  importance: '중요도',
  userImpact: '사용자 영향도',
  _request: '요청',
});

/**
 * HTML 특수문자를 이스케이프한다(XSS 방지). 사용자 입력을 innerHTML 로 넣기 전 항상 적용.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * ISO 8601 → `YYYY-MM-DD HH:mm` 표시용 포맷.
 * @param {string} iso
 * @returns {string}
 */
export function formatDateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(iso);
  }
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 중요도 채움 배지 (디자인 §5.1). 색 외 라벨·단계 기호 항상 병기(§7.4).
 * @param {string} importance
 * @returns {string}
 */
export function renderImpBadge(importance) {
  const label = IMPORTANCE_LABELS[importance] ?? importance;
  const severity = IMPORTANCE_SEVERITY[importance] ?? 'neutral';
  const symbol = IMPORTANCE_SYMBOL[importance] ?? '';
  return (
    `<span class="imp-badge imp-badge--${escapeHtml(importance)}" data-severity="${severity}">` +
    '<span class="imp-badge__dot" aria-hidden="true"></span>' +
    `<span class="imp-badge__symbol" aria-hidden="true">${symbol}</span>` +
    `<span class="imp-badge__label">중요도 ${escapeHtml(label)}</span>` +
    '</span>'
  );
}

/**
 * 사용자 영향도 아웃라인 칩 (디자인 §5.2). 선행 glyph + 라벨 항상 병기(§7.4).
 * @param {string} userImpact
 * @returns {string}
 */
export function renderImpactChip(userImpact) {
  const label = USER_IMPACT_LABELS[userImpact] ?? userImpact;
  const severity = USER_IMPACT_SEVERITY[userImpact] ?? 'neutral';
  const glyph = USER_IMPACT_GLYPH[userImpact] ?? '';
  return (
    `<span class="impact-chip impact-chip--${escapeHtml(userImpact)}" data-severity="${severity}">` +
    `<span class="impact-chip__glyph" aria-hidden="true">${glyph}</span>` +
    `<span class="impact-chip__label">사용자 영향 ${escapeHtml(label)}</span>` +
    '</span>'
  );
}

/**
 * 요약 카드 (디자인 §6.3). 좌측 accent 보더=중요도, 헤더=배지, 메타=칩.
 * @param {import('./store.js').SummaryCard} card
 * @returns {string}
 */
export function renderSummaryCard(card) {
  const changeItems = card.changes
    .map((change) => `<li class="summary-card__change">${escapeHtml(change)}</li>`)
    .join('');
  return (
    `<article class="summary-card summary-card--${escapeHtml(card.importance)}" data-id="${escapeHtml(card.id)}">` +
    '<header class="summary-card__header">' +
    `<h3 class="summary-card__title">${escapeHtml(card.title)}</h3>` +
    renderImpBadge(card.importance) +
    '</header>' +
    `<ul class="summary-card__changes">${changeItems}</ul>` +
    '<div class="summary-card__meta">' +
    renderImpactChip(card.userImpact) +
    `<time class="summary-card__date" datetime="${escapeHtml(card.createdAt)}">${formatDateTime(card.createdAt)}</time>` +
    '</div>' +
    '</article>'
  );
}

/**
 * 요약 카드 목록 또는 빈 상태 (디자인 §6.3·§6.6).
 * @param {ReadonlyArray<import('./store.js').SummaryCard>} cards
 * @param {{ hasData: boolean }} [context] hasData=전체 카드 존재 여부(no-data vs no-match 구분)
 * @returns {string}
 */
export function renderCardList(cards, context = { hasData: true }) {
  if (cards.length === 0) {
    return renderEmptyState(context.hasData ? 'no-match' : 'no-data');
  }
  return cards.map(renderSummaryCard).join('');
}

/**
 * 빈 상태 (디자인 §6.6).
 * @param {'no-data' | 'no-match'} variant
 * @returns {string}
 */
export function renderEmptyState(variant) {
  const copy = {
    'no-data': {
      icon: '🗒️',
      title: '아직 생성된 요약 카드가 없습니다',
      hint: '위 폼에서 첫 릴리스 요약을 생성해 보세요.',
    },
    'no-match': {
      icon: '🔍',
      title: '조건에 맞는 요약 카드가 없습니다',
      hint: '필터를 변경하면 다른 결과를 볼 수 있어요.',
    },
  }[variant] ?? { icon: 'ℹ️', title: '', hint: '' };
  return (
    `<div class="empty-state empty-state--${variant}">` +
    `<div class="empty-state__icon" aria-hidden="true">${copy.icon}</div>` +
    `<p class="empty-state__title">${escapeHtml(copy.title)}</p>` +
    `<p class="empty-state__hint">${escapeHtml(copy.hint)}</p>` +
    '</div>'
  );
}

/**
 * 폼 검증 안내 영역 (디자인 §6.7·§7). mode 별 배너 + 실패 필드 목록.
 * @param {'validate-pass' | 'validate-fail' | 'create-error'} mode
 * @param {ReadonlyArray<{ field: string, reason: string }>} [errors]
 * @returns {string}
 */
export function renderValidateResult(mode, errors = []) {
  if (mode === 'validate-pass') {
    return (
      '<div class="validate-result validate-result--pass" role="status">' +
      '<span class="validate-result__icon" aria-hidden="true">✓</span>' +
      '<p class="validate-result__message">검증 통과 — 저장되지 않았습니다 (사전 점검).</p>' +
      '</div>'
    );
  }
  const heading =
    mode === 'validate-fail'
      ? '검증 실패 — 저장되지 않았습니다. 아래 항목을 확인하세요.'
      : '요약 카드를 생성할 수 없습니다. 아래 항목을 확인하세요.';
  const items = errors
    .map(
      (error) =>
        `<li class="validate-result__item"><strong>${escapeHtml(FIELD_LABELS[error.field] ?? error.field)}</strong> — ${escapeHtml(error.reason)}</li>`,
    )
    .join('');
  return (
    '<div class="validate-result validate-result--fail" role="alert">' +
    '<span class="validate-result__icon" aria-hidden="true">⚠</span>' +
    `<p class="validate-result__message">${escapeHtml(heading)}</p>` +
    `<ul class="validate-result__list">${items}</ul>` +
    '</div>'
  );
}

/**
 * 4구간 stacked bar (중요도/영향도 분포 타일, 디자인 §6.1).
 * @param {Record<string, { count: number, ratio: number }>} dist
 * @param {readonly string[]} order
 * @param {Record<string, string>} severityMap
 * @returns {string}
 */
function renderDistBar(dist, order, severityMap) {
  const segments = order
    .map((key) => {
      const { count, ratio } = dist[key] ?? { count: 0, ratio: 0 };
      return `<span class="kpi-tile__seg kpi-tile__seg--${severityMap[key] ?? 'neutral'}" style="flex:${count}" title="${escapeHtml(key)}: ${count}건 (${ratio}%)"></span>`;
    })
    .join('');
  const caption = order
    .map((key) => `${escapeHtml(key)} ${dist[key]?.count ?? 0}`)
    .join(' · ');
  return (
    `<div class="kpi-tile__bar" role="img" aria-label="분포 ${escapeHtml(caption)}">${segments}</div>` +
    `<span class="kpi-tile__caption">${escapeHtml(caption)}</span>`
  );
}

/**
 * KPI 요약 바 (디자인 §6.1, 기획 §6). 6개 stat 타일. 0건도 안전 렌더(0%).
 * @param {ReturnType<import('./kpi.js').computeKpi>} kpi
 * @returns {string}
 */
export function renderKpiBar(kpi) {
  const tile = (value, label, extraClass = '') =>
    `<div class="kpi-tile ${extraClass}"><span class="kpi-tile__value">${escapeHtml(value)}</span><span class="kpi-tile__label">${escapeHtml(label)}</span></div>`;
  const distTile = (label, inner) =>
    `<div class="kpi-tile kpi-tile--dist"><span class="kpi-tile__label">${escapeHtml(label)}</span>${inner}</div>`;
  return (
    '<div class="kpi-bar" aria-label="요약 보드 KPI">' +
    tile(String(kpi.total), '총 카드 건수') +
    tile(String(kpi.urgentCount), '긴급 대응 필요', 'kpi-tile--warning') +
    tile(`${kpi.breakingRatio}%`, 'Breaking 비율', 'kpi-tile--danger') +
    distTile('중요도 분포', renderDistBar(kpi.importanceDist, IMPORTANCE_VALUES, IMPORTANCE_SEVERITY)) +
    distTile('영향도 분포', renderDistBar(kpi.userImpactDist, USER_IMPACT_VALUES, USER_IMPACT_SEVERITY)) +
    tile(String(kpi.recent24hCount), '최근 24h 등록') +
    '</div>'
  );
}

export { FIELD_LABELS };
