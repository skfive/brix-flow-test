// 납품 추적 상태 보드 공개 타입 계약 (delivery-trace-canary).
// frozen contract §3: "타입 계약은 index.d.ts 에 선언한다."
// board.ts / fixtures.ts 의 public 표면을 문서화하는 선언 파일이다(런타임 import 대상 아님).

/** 5단계 추적 연결 단계 식별자. */
export type StageId =
  | 'requirement'
  | 'design'
  | 'implementation'
  | 'review'
  | 'test';

/** 단계별 상태(색상 외 화면 텍스트로도 노출). */
export type StageStatus = 'complete' | 'pending' | 'missing';

/** 보드 데이터 로드 단계(진행 표시 근원). */
export type BoardPhase = 'loading' | 'ready' | 'error';

/** 상태 필터 값. */
export type StageFilter = 'all' | StageStatus;

export interface StageCell {
  readonly stage: StageId;
  readonly status: StageStatus;
  /** evidence 상세 텍스트. status='missing' 이면 null. */
  readonly evidence: string | null;
}

export interface TraceRow {
  readonly id: string;
  readonly requirement: string;
  /** Requirement→Design→Implementation→Review→Test 순서 5단계. */
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

export interface MountOptions {
  readonly loader: () => Promise<TraceData>;
}

export interface BoardHandle {
  getState: () => BoardState;
  destroy: () => void;
}

// ── board.ts 공개 함수/상수 계약 ──────────────────────────────
export function initialState(): BoardState;
export function toReady(state: BoardState, data: TraceData): BoardState;
export function toLoading(state: BoardState): BoardState;
export function toError(state: BoardState, message: string): BoardState;
export function applyFilter(state: BoardState, filter: StageFilter): BoardState;
export function openDetail(state: BoardState, cellId: string): BoardState;
export function closeDetail(state: BoardState): BoardState;
export function resetView(state: BoardState): BoardState;
export function findCell(data: TraceData | null, cellId: string | null): StageCell | null;
export function computeMissingEvidence(data: TraceData | null): readonly MissingEvidenceItem[];
export function isCellFocused(cell: StageCell, filter: StageFilter): boolean;
export function escapeHtml(value: string): string;
export function renderBoard(state: BoardState): string;
export function mountBoard(root: HTMLElement, options: MountOptions): BoardHandle;

export const STAGE_ORDER: readonly StageId[];
export const STAGE_LABELS: Readonly<Record<StageId, { ko: string; en: string }>>;
export const STATUS_LABELS: Readonly<Record<StageStatus, string>>;
export const FILTER_LABELS: Readonly<Record<StageFilter, string>>;
