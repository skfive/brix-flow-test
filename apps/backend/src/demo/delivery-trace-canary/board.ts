// 납품 추적 상태 보드 (delivery-trace-canary) — 읽기 전용 상태 보드 로직.
// frozen ui-contract@v1 (docs/plans/delivery-trace-canary-BF-1240.md §2) 를 구현한다.
// selector/token/상태 텍스트는 계약값 그대로이며 재정의하지 않는다.
//
// 이 모듈은 순수 로직(상태 전이 · 렌더 문자열 생성)과 브라우저 mount 를 함께 노출한다.
// 순수 함수는 DOM 없이 node --test 로 검증 가능하고, mountBoard 는 브라우저에서만 DOM 을 만진다.

// ─────────────────────────────────────────────────────────────
// 공개 타입 (index.d.ts 공개 계약과 동일 shape)
// ─────────────────────────────────────────────────────────────

export type StageId =
  | 'requirement'
  | 'design'
  | 'implementation'
  | 'review'
  | 'test';

export type StageStatus = 'complete' | 'pending' | 'missing';

/** 보드 데이터 로드 단계(진행 표시의 근원). */
export type BoardPhase = 'loading' | 'ready' | 'error';

/**
 * frozen ui-contract §2.2 의 6-상태 UI 계약값.
 * DOM 에 `data-state` 로 노출된다(색상 외 화면 텍스트와 함께 접근성 이름으로도 전달).
 */
export type UiState =
  | 'loading'
  | 'ready'
  | 'filtered'
  | 'missing-evidence'
  | 'detail-open'
  | 'error';

/** 상태 필터 값. 'all' + 3개 상태. */
export type StageFilter = 'all' | StageStatus;

export interface StageCell {
  readonly stage: StageId;
  readonly status: StageStatus;
  /** evidence 상세 텍스트. status 가 'missing' 이면 null. */
  readonly evidence: string | null;
}

export interface TraceRow {
  readonly id: string;
  readonly requirement: string;
  /** Requirement→Design→Implementation→Review→Test 순서의 5단계 연결. */
  readonly stages: readonly StageCell[];
}

export interface TraceData {
  readonly rows: readonly TraceRow[];
}

export interface BoardState {
  readonly phase: BoardPhase;
  readonly filter: StageFilter;
  readonly selectedCellId: string | null;
  readonly data: TraceData | null;
  readonly error: string | null;
}

export interface MissingEvidenceItem {
  readonly rowId: string;
  readonly requirement: string;
  readonly stage: StageId;
  readonly stageLabelKo: string;
}

// ─────────────────────────────────────────────────────────────
// 표시 용어 / 텍스트 상수 (색상 외 화면 텍스트 — 접근성 이름 포함)
// ─────────────────────────────────────────────────────────────

export const STAGE_ORDER: readonly StageId[] = [
  'requirement',
  'design',
  'implementation',
  'review',
  'test',
];

export const STAGE_LABELS: Readonly<Record<StageId, { ko: string; en: string }>> = {
  requirement: { ko: '요구사항', en: 'Requirement' },
  design: { ko: '설계', en: 'Design' },
  implementation: { ko: '구현', en: 'Implementation' },
  review: { ko: '검토', en: 'Review' },
  test: { ko: '테스트', en: 'Test' },
};

export const STATUS_LABELS: Readonly<Record<StageStatus, string>> = {
  complete: '완료 (Complete)',
  pending: '진행 중 (Pending)',
  missing: '누락 (Missing)',
};

export const FILTER_LABELS: Readonly<Record<StageFilter, string>> = {
  all: '전체 (All)',
  complete: '완료 (Complete)',
  pending: '진행 중 (Pending)',
  missing: '누락 (Missing)',
};

export const TEXT = {
  loading: '추적 데이터를 불러오는 중',
  ready: '추적 데이터 준비 완료 · Requirement→Design→Implementation→Review→Test 5단계 연결',
  error: '추적 데이터를 표시할 수 없습니다',
  errorRetryHint: '잠시 후 다시 시도해 주세요.',
  warningPrefix: '누락된 evidence — 보완 대상',
  detailEmpty: '단계 카드를 선택하면 상세 evidence 가 표시됩니다.',
  filterLabel: '단계 상태 필터',
  detailLabel: '단계 상세 evidence',
  warningLabel: '누락 evidence 경고',
} as const;

// ─────────────────────────────────────────────────────────────
// 순수 상태 로직 (immutable — spread 로 새 상태 반환)
// ─────────────────────────────────────────────────────────────

/** 초기 상태: 로딩 · 필터 all · 미선택. 초기화/후조건의 기준값. */
export function initialState(): BoardState {
  return {
    phase: 'loading',
    filter: 'all',
    selectedCellId: null,
    data: null,
    error: null,
  };
}

export function toReady(state: BoardState, data: TraceData): BoardState {
  return { ...state, phase: 'ready', data, error: null, filter: 'all', selectedCellId: null };
}

export function toLoading(state: BoardState): BoardState {
  return { ...state, phase: 'loading', selectedCellId: null };
}

export function toError(state: BoardState, message: string): BoardState {
  return { ...state, phase: 'error', error: message, data: null, selectedCellId: null };
}

export function applyFilter(state: BoardState, filter: StageFilter): BoardState {
  return { ...state, filter };
}

export function openDetail(state: BoardState, cellId: string): BoardState {
  return { ...state, selectedCellId: cellId };
}

/** 상세 패널 취소 → 선택 해제(초기값 복귀). */
export function closeDetail(state: BoardState): BoardState {
  return { ...state, selectedCellId: null };
}

/** 필터 초기화 + 상세 취소 → 화면 상태를 초기값으로 되돌린다(데이터는 유지). */
export function resetView(state: BoardState): BoardState {
  return { ...state, filter: 'all', selectedCellId: null };
}

export function findCell(data: TraceData | null, cellId: string | null): StageCell | null {
  if (data === null || cellId === null) return null;
  for (const row of data.rows) {
    for (const cell of row.stages) {
      if (`${row.id}:${cell.stage}` === cellId) return cell;
    }
  }
  return null;
}

/** 누락 evidence(보완 대상) 목록을 결정론적 순서로 산출. */
export function computeMissingEvidence(data: TraceData | null): readonly MissingEvidenceItem[] {
  if (data === null) return [];
  const items: MissingEvidenceItem[] = [];
  for (const row of data.rows) {
    for (const cell of row.stages) {
      if (cell.status === 'missing') {
        items.push({
          rowId: row.id,
          requirement: row.requirement,
          stage: cell.stage,
          stageLabelKo: STAGE_LABELS[cell.stage].ko,
        });
      }
    }
  }
  return items;
}

/** 필터 기준 셀 강조 여부. 'all' 이면 모두 강조(비흐림). */
export function isCellFocused(cell: StageCell, filter: StageFilter): boolean {
  return filter === 'all' || cell.status === filter;
}

/**
 * 현재 BoardState 를 6-상태 UI 계약값(§2.2)으로 결정론적 precedence 로 산출한다.
 * precedence: loading → error → detail-open → filtered → missing-evidence → ready.
 * (진행 표시 phase 가 우선, 그 다음 가장 구체적인 사용자 인터랙션 상태 순.)
 */
export function resolveUiState(state: BoardState): UiState {
  if (state.phase === 'loading') return 'loading';
  if (state.phase === 'error') return 'error';
  if (state.selectedCellId !== null) return 'detail-open';
  if (state.filter !== 'all') return 'filtered';
  if (computeMissingEvidence(state.data).length > 0) return 'missing-evidence';
  return 'ready';
}

// ─────────────────────────────────────────────────────────────
// 렌더 (문자열) — DOM 없이 검증 가능
// ─────────────────────────────────────────────────────────────

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderStage(rowId: string, cell: StageCell, state: BoardState): string {
  const label = STAGE_LABELS[cell.stage];
  const statusText = STATUS_LABELS[cell.status];
  const cellId = `${rowId}:${cell.stage}`;
  const focused = isCellFocused(cell, state.filter);
  const selected = state.selectedCellId === cellId;
  const classes = [
    'trace-board__stage',
    `trace-board__stage--${cell.status}`,
    focused ? 'trace-board__stage--focus' : 'trace-board__stage--dim',
    selected ? 'trace-board__stage--selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const ariaLabel = `${label.ko} ${label.en} · ${STATUS_LABELS[cell.status]}`;
  return (
    `<button type="button" class="${classes}" data-cell-id="${escapeHtml(cellId)}" ` +
    `data-stage="${cell.stage}" data-status="${cell.status}" ` +
    `aria-pressed="${selected ? 'true' : 'false'}" aria-label="${escapeHtml(ariaLabel)}">` +
    `<span class="trace-board__stage-name">${escapeHtml(label.ko)} · ${escapeHtml(label.en)}</span>` +
    `<span class="trace-board__stage-status">${escapeHtml(statusText)}</span>` +
    `</button>`
  );
}

function renderRows(state: BoardState): string {
  const data = state.data;
  if (data === null || data.rows.length === 0) {
    return `<p class="trace-board__empty">표시할 추적 항목이 없습니다.</p>`;
  }
  const rows = data.rows
    .map((row) => {
      const stages = row.stages.map((cell) => renderStage(row.id, cell, state)).join('');
      return (
        `<li class="trace-board__row" data-row-id="${escapeHtml(row.id)}">` +
        `<p class="trace-board__requirement">${escapeHtml(row.id)}. ${escapeHtml(row.requirement)}</p>` +
        `<div class="trace-board__stages">${stages}</div>` +
        `</li>`
      );
    })
    .join('');
  return `<ol class="trace-board__rows">${rows}</ol>`;
}

function renderWarning(state: BoardState): string {
  const missing = state.phase === 'ready' ? computeMissingEvidence(state.data) : [];
  const attrs =
    `id="trace-evidence-warning" class="trace-board__warning" aria-live="polite" ` +
    `aria-label="${escapeHtml(TEXT.warningLabel)}"`;
  if (missing.length === 0) {
    return `<div ${attrs} data-empty="true" hidden></div>`;
  }
  const list = missing
    .map(
      (m) =>
        `<li class="trace-board__warning-item">${escapeHtml(m.requirement)} — ${escapeHtml(m.stageLabelKo)} 단계</li>`,
    )
    .join('');
  return (
    `<div ${attrs} data-empty="false">` +
    `<p class="trace-board__warning-text">${escapeHtml(TEXT.warningPrefix)}</p>` +
    `<ul class="trace-board__warning-list">${list}</ul>` +
    `</div>`
  );
}

function renderDetail(state: BoardState): string {
  const attrs =
    `id="trace-detail-panel" class="trace-board__detail" role="region" ` +
    `aria-label="${escapeHtml(TEXT.detailLabel)}" tabindex="-1"`;
  const cell = findCell(state.data, state.selectedCellId);
  if (cell === null) {
    return `<aside ${attrs} data-open="false"><p class="trace-board__detail-empty">${escapeHtml(TEXT.detailEmpty)}</p></aside>`;
  }
  const label = STAGE_LABELS[cell.stage];
  const evidence =
    cell.evidence === null ? `${TEXT.warningPrefix} · evidence 없음` : cell.evidence;
  return (
    `<aside ${attrs} data-open="true">` +
    `<h3 class="trace-board__detail-title">${escapeHtml(label.ko)} · ${escapeHtml(label.en)} — ${escapeHtml(STATUS_LABELS[cell.status])}</h3>` +
    `<p class="trace-board__detail-evidence">${escapeHtml(evidence)}</p>` +
    `</aside>`
  );
}

function renderStatusLine(state: BoardState): string {
  let text: string;
  if (state.phase === 'loading') text = TEXT.loading;
  else if (state.phase === 'error') text = TEXT.error;
  else if (state.filter !== 'all') text = `필터: ${FILTER_LABELS[state.filter]} 단계 강조`;
  else text = TEXT.ready;
  return `<p class="trace-board__status" role="status" data-phase="${state.phase}">${escapeHtml(text)}</p>`;
}

function renderControls(state: BoardState): string {
  const disabled = state.phase === 'ready' ? '' : ' disabled';
  const options = (Object.keys(FILTER_LABELS) as StageFilter[])
    .map(
      (value) =>
        `<option value="${value}"${state.filter === value ? ' selected' : ''}>${escapeHtml(FILTER_LABELS[value])}</option>`,
    )
    .join('');
  return (
    `<div class="trace-board__controls">` +
    `<label class="trace-board__filter-label" for="trace-stage-filter">${escapeHtml(TEXT.filterLabel)}</label>` +
    `<select id="trace-stage-filter" class="trace-board__filter" aria-label="${escapeHtml(TEXT.filterLabel)}"${disabled}>${options}</select>` +
    `</div>`
  );
}

function renderBody(state: BoardState): string {
  if (state.phase === 'loading') {
    return `<p class="trace-board__loading">${escapeHtml(TEXT.loading)}…</p>`;
  }
  if (state.phase === 'error') {
    return (
      `<div class="trace-board__error-box">` +
      `<p class="trace-board__error">${escapeHtml(state.error ?? TEXT.error)}</p>` +
      `<p class="trace-board__error-hint">${escapeHtml(TEXT.errorRetryHint)}</p>` +
      `<button type="button" class="trace-board__retry" data-action="retry">다시 시도</button>` +
      `</div>`
    );
  }
  return renderRows(state);
}

/** 보드 전체 markup 을 문자열로 렌더. mountBoard 와 정적 초기 markup 이 공유. */
export function renderBoard(state: BoardState): string {
  return (
    `<section id="delivery-trace-board" class="trace-board" data-state="${resolveUiState(state)}" data-phase="${state.phase}" data-filter="${state.filter}">` +
    `<header class="trace-board__header">${renderStatusLine(state)}${renderControls(state)}</header>` +
    renderWarning(state) +
    `<div class="trace-board__body">${renderBody(state)}${renderDetail(state)}</div>` +
    `</section>`
  );
}

// ─────────────────────────────────────────────────────────────
// 브라우저 mount (DOM) — node 로딩 시 top-level 부작용 없음
// ─────────────────────────────────────────────────────────────

export interface MountOptions {
  /** 결정론적 데이터 로더. reject 시 error 상태로 전이. */
  readonly loader: () => Promise<TraceData>;
}

export interface BoardHandle {
  getState: () => BoardState;
  destroy: () => void;
}

/**
 * root 엘리먼트에 보드를 mount 하고 인터랙션(필터·상세·재시도)을 연결한다.
 * 로딩→ready 전이, 실패→error, 재시도→ready 복원(필터 control 재활성화)을 처리한다.
 */
export function mountBoard(root: HTMLElement, options: MountOptions): BoardHandle {
  let state = initialState();

  const rerender = (): void => {
    root.innerHTML = renderBoard(state);
    wire();
    if (state.selectedCellId !== null) {
      const panel = root.querySelector<HTMLElement>('#trace-detail-panel');
      panel?.focus();
    }
  };

  const wire = (): void => {
    const filter = root.querySelector<HTMLSelectElement>('#trace-stage-filter');
    filter?.addEventListener('change', () => {
      state = applyFilter(state, filter.value as StageFilter);
      rerender();
    });
    root.querySelectorAll<HTMLButtonElement>('.trace-board__stage').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cellId = btn.getAttribute('data-cell-id');
        if (cellId === null) return;
        state = state.selectedCellId === cellId ? closeDetail(state) : openDetail(state, cellId);
        rerender();
      });
    });
    const retry = root.querySelector<HTMLButtonElement>('.trace-board__retry');
    retry?.addEventListener('click', () => {
      void load();
    });
  };

  const load = async (): Promise<void> => {
    state = toLoading(state);
    rerender();
    try {
      const data = await options.loader();
      state = toReady(state, data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : TEXT.error;
      state = toError(state, message);
    }
    rerender();
  };

  void load();

  return {
    getState: () => state,
    destroy: () => {
      root.innerHTML = '';
    },
  };
}
