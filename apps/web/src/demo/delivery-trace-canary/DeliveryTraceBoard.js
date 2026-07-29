// delivery-trace-canary 상태 보드 — 순수 렌더/상태 로직 (BF-1235)
// frozen UI 계약(§6/§7)의 domId·cssClass·상태 텍스트·접근성 이름을 그대로 구현한다.
// DOM 비의존 순수 함수로 유지해 node --test 로 단위 검증 가능하게 한다.

import { TRACE_STAGES } from './fixtures.js';

/** TraceStage → 화면 텍스트 (§7) */
export const STAGE_LABEL = {
  requirement: '요구사항',
  design: '설계',
  implementation: '구현',
  review: '검토',
  test: '테스트',
};

/** status → 화면 텍스트 (한국어 primary, §7) */
export const STATUS_TEXT = {
  complete: '완료',
  pending: '진행 중',
  missing: '누락',
};

/** status → 접근성 이름 (한국어(English), §7) */
export const STATUS_ARIA = {
  complete: '완료(Complete)',
  pending: '진행 중(Pending)',
  missing: '누락(Missing)',
};

/** board state → 화면 텍스트/접근성 이름 (§7) */
export const STATE_TEXT = {
  ready: '준비됨',
  'stage-selected': '선택됨',
  'evidence-missing': '누락 evidence 있음',
  empty: '추적 항목 없음',
};

export const STATE_ARIA = {
  ready: '준비됨(Ready)',
  'stage-selected': '선택됨(Selected)',
  'evidence-missing': '누락 evidence 있음',
  empty: '추적 항목 없음(Empty)',
};

/** 필터 옵션 (전체 + status 별) */
export const FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'complete', label: STATUS_TEXT.complete },
  { value: 'pending', label: STATUS_TEXT.pending },
  { value: 'missing', label: STATUS_TEXT.missing },
];

/** HTML 특수문자 이스케이프 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 셀의 실효 status. evidenceHref===null 이면 missing 으로 취급(EC6).
 * @returns {'complete'|'pending'|'missing'}
 */
export function effectiveStatus(cell) {
  if (cell.status === 'missing' || cell.evidenceHref === null) return 'missing';
  return cell.status;
}

/**
 * fixture 전체에서 누락(missing) evidence 를 가진 단계명을 §5 고정 순서로 반환.
 * @returns {string[]} TraceStage 배열 (중복 제거, TRACE_STAGES 순서)
 */
export function collectMissingStages(fixture) {
  const missing = new Set();
  for (const row of fixture.rows) {
    for (const stageCell of row.stages) {
      if (effectiveStatus(stageCell) === 'missing') missing.add(stageCell.stage);
    }
  }
  return TRACE_STAGES.filter((stage) => missing.has(stage));
}

/** 경고 배너 텍스트 (§7): "누락 evidence: 단계명 나열" */
export function bannerText(missingStages) {
  const names = missingStages.map((stage) => STAGE_LABEL[stage]).join(', ');
  return `누락 evidence: ${names}`;
}

/**
 * 현재 board state 결정 (§4 상태 모델).
 * empty > stage-selected > evidence-missing > ready 우선순위.
 * @param {object} fixture
 * @param {string|null} selectedId  선택된 셀 id (`${rowId}:${stage}`) 또는 null
 */
export function resolveState(fixture, selectedId) {
  if (!fixture.rows.length) return 'empty';
  if (selectedId) return 'stage-selected';
  if (collectMissingStages(fixture).length > 0) return 'evidence-missing';
  return 'ready';
}

/** 셀 고유 id */
export function cellId(rowId, stage) {
  return `${rowId}:${stage}`;
}

/** selectedId 로 셀 찾기 */
export function findCell(fixture, selectedId) {
  if (!selectedId) return null;
  for (const row of fixture.rows) {
    for (const stageCell of row.stages) {
      if (cellId(row.id, stageCell.stage) === selectedId) {
        return { row, cell: stageCell };
      }
    }
  }
  return null;
}

/** 필터 적용 여부 — 화면에 표시할 셀인지 */
export function isCellVisible(cell, filter) {
  if (!filter || filter === 'all') return true;
  return effectiveStatus(cell) === filter;
}

function renderStageCard(row, stageCell, selectedId) {
  const status = effectiveStatus(stageCell);
  const id = cellId(row.id, stageCell.stage);
  const selected = id === selectedId;
  const modifier =
    status === 'complete'
      ? ' delivery-trace__stage--complete'
      : status === 'missing'
        ? ' delivery-trace__stage--missing'
        : '';
  const stageName = STAGE_LABEL[stageCell.stage];
  const ariaLabel = `${stageName} ${STATUS_ARIA[status]}`;
  const currentAttr = selected ? ' aria-current="step"' : '';
  return [
    `<button type="button" class="delivery-trace__stage${modifier}"`,
    ` data-cell-id="${escapeHtml(id)}" data-stage="${escapeHtml(stageCell.stage)}"`,
    ` data-status="${status}" aria-label="${escapeHtml(ariaLabel)}"${currentAttr}>`,
    `<span class="delivery-trace__stage-name">${escapeHtml(stageName)}</span>`,
    `<span class="delivery-trace__stage-status">${escapeHtml(STATUS_TEXT[status])}</span>`,
    `</button>`,
  ].join('');
}

function renderRow(row, selectedId, filter) {
  const cards = row.stages
    .filter((stageCell) => isCellVisible(stageCell, filter))
    .map((stageCell) => renderStageCard(row, stageCell, selectedId))
    .join('');
  return [
    `<li class="delivery-trace__row" data-row-id="${escapeHtml(row.id)}">`,
    `<p class="delivery-trace__requirement">${escapeHtml(row.id)}. ${escapeHtml(row.requirement)}</p>`,
    `<div class="delivery-trace__stages">${cards}</div>`,
    `</li>`,
  ].join('');
}

function renderFilter(filter, disabled) {
  const options = FILTER_OPTIONS.map((opt) => {
    const selected = opt.value === filter ? ' selected' : '';
    return `<option value="${opt.value}"${selected}>${escapeHtml(opt.label)}</option>`;
  }).join('');
  const disabledAttr = disabled ? ' disabled' : '';
  return [
    `<label class="delivery-trace__filter-label" for="trace-stage-filter">단계 상태 필터</label>`,
    `<select id="trace-stage-filter" aria-label="단계 상태 필터"${disabledAttr}>${options}</select>`,
  ].join('');
}

function renderBanner(missingStages) {
  if (!missingStages.length) return '';
  return [
    `<div id="evidence-warning-banner" role="alert" aria-label="누락 evidence 경고">`,
    escapeHtml(bannerText(missingStages)),
    `</div>`,
  ].join('');
}

function renderDetail(selected) {
  if (!selected) {
    return [
      `<aside id="trace-detail-panel" class="delivery-trace__detail" tabindex="-1"`,
      ` aria-label="단계 상세" data-empty="true">`,
      `<p>단계 카드를 선택하면 상세 evidence 가 표시됩니다.</p>`,
      `</aside>`,
    ].join('');
  }
  const { row, cell } = selected;
  const status = effectiveStatus(cell);
  const stageName = STAGE_LABEL[cell.stage];
  const evidence =
    cell.evidenceHref === null
      ? `<p class="delivery-trace__detail-status">${escapeHtml(STATUS_TEXT.missing)} — evidence 링크 없음</p>`
      : `<p><a href="${escapeHtml(cell.evidenceHref)}">${escapeHtml(cell.evidenceLabel)}</a></p>`;
  return [
    `<aside id="trace-detail-panel" class="delivery-trace__detail" tabindex="-1"`,
    ` aria-label="단계 상세" data-empty="false">`,
    `<h3 class="delivery-trace__detail-heading">${escapeHtml(row.id)} · ${escapeHtml(stageName)} — ${escapeHtml(STATUS_TEXT[status])}</h3>`,
    `<p class="delivery-trace__detail-requirement">${escapeHtml(row.requirement)}</p>`,
    evidence,
    `<button type="button" id="trace-detail-close" class="delivery-trace__detail-close">닫기</button>`,
    `</aside>`,
  ].join('');
}

/**
 * 보드 전체 마크업(HTML 문자열)을 생성한다. DOM 비의존.
 * @param {object} fixture
 * @param {{ selectedId?: string|null, filter?: string }} [options]
 */
export function renderBoard(fixture, options = {}) {
  const selectedId = options.selectedId || null;
  const filter = options.filter || 'all';
  const state = resolveState(fixture, selectedId);
  const missingStages = collectMissingStages(fixture);
  const selected = findCell(fixture, selectedId);
  // 상세 패널이 열려 있으면 주 실행 control(필터) 비활성; 닫히면 재활성(§4 후조건/AC).
  const filterDisabled = state === 'stage-selected';

  const header = [
    `<header class="delivery-trace__header">`,
    `<p class="delivery-trace__status" data-state="${state}">상태: ${escapeHtml(STATE_TEXT[state])}</p>`,
    `<div class="delivery-trace__controls">${renderFilter(filter, filterDisabled)}</div>`,
    `</header>`,
  ].join('');

  const banner = renderBanner(missingStages);

  let body;
  if (!fixture.rows.length) {
    body = [
      `<div class="delivery-trace__body">`,
      `<p class="delivery-trace__empty" aria-label="${escapeHtml(STATE_ARIA.empty)}">${escapeHtml(STATE_TEXT.empty)}</p>`,
      renderDetail(null),
      `</div>`,
    ].join('');
  } else {
    const rows = fixture.rows.map((row) => renderRow(row, selectedId, filter)).join('');
    body = [
      `<div class="delivery-trace__body">`,
      `<ol class="delivery-trace__rows">${rows}</ol>`,
      renderDetail(selected),
      `</div>`,
    ].join('');
  }

  return [
    `<section id="delivery-trace-board" class="delivery-trace" data-state="${state}">`,
    header,
    banner,
    body,
    `</section>`,
  ].join('');
}
