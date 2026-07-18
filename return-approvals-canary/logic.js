// BF-1039 반품 승인 워크벤치 — 순수 상태 전이 로직 (DOM/브라우저 의존 없음, node --test 가능)
// 전이 규칙 근거: docs/planning/return-approvals-canary-BF-1037.md §4
//   pending --승인--> approved (approvedAt/approvedBy 기록)
//   pending --보류(reason 필수)--> held (holdReason 저장)
//   held    --승인(재검토)--> approved (holdReason 이력 유지)
//   held    --보류 해제--> pending (holdReason → null)
//   approved: terminal (역방향 전이 없음)

/** localStorage 오버레이 스토리지 키 */
export const OVERLAY_STORAGE_KEY = 'brix:return-approvals-canary:overlay:v1';

/** 오버레이에 반영되는 전이 결과 필드만 추출한다 (fixture 원본은 불변). */
const OVERLAY_FIELDS = ['status', 'holdReason', 'approvedAt', 'approvedBy'];

/**
 * 보류 사유 유효성 — 공백 제외 1자 이상.
 * @param {unknown} reason
 * @returns {boolean}
 */
export function isValidHoldReason(reason) {
  return typeof reason === 'string' && reason.trim().length > 0;
}

/**
 * 승인 전이. approved 는 terminal 이므로 이미 approved 면 변경 없이 원본 반환(중복 액션 무시).
 * held → approved 시 holdReason 은 이력용으로 유지한다.
 * @param {import('./fixtures.js').ReturnRequest} req
 * @param {{ at: string, by: string }} meta
 * @returns {import('./fixtures.js').ReturnRequest}
 */
export function approveRequest(req, meta) {
  if (req.status === 'approved') return req;
  return { ...req, status: 'approved', approvedAt: meta.at, approvedBy: meta.by };
}

/**
 * 보류 전이. holdReason 공백이면 전이하지 않고 원본 반환. approved(terminal)도 전이하지 않음.
 * @param {import('./fixtures.js').ReturnRequest} req
 * @param {string} reason
 * @returns {import('./fixtures.js').ReturnRequest}
 */
export function holdRequest(req, reason) {
  if (req.status === 'approved') return req;
  if (!isValidHoldReason(reason)) return req;
  return { ...req, status: 'held', holdReason: reason.trim() };
}

/**
 * 보류 해제 전이. held 가 아니면 원본 반환.
 * @param {import('./fixtures.js').ReturnRequest} req
 * @returns {import('./fixtures.js').ReturnRequest}
 */
export function releaseHoldRequest(req) {
  if (req.status !== 'held') return req;
  return { ...req, status: 'pending', holdReason: null };
}

/**
 * 오버레이(Record<id, Partial>)를 base 목록에 병합해 새 목록을 만든다. base 는 변형하지 않는다.
 * @param {ReadonlyArray<import('./fixtures.js').ReturnRequest>} base
 * @param {Record<string, Partial<import('./fixtures.js').ReturnRequest>>} overlay
 * @returns {import('./fixtures.js').ReturnRequest[]}
 */
export function mergeOverlay(base, overlay) {
  const ov = overlay ?? {};
  return base.map((req) => (ov[req.id] ? { ...req, ...ov[req.id] } : { ...req }));
}

/**
 * 전이 결과 request 에서 오버레이에 저장할 필드만 뽑는다.
 * @param {import('./fixtures.js').ReturnRequest} req
 * @returns {Partial<import('./fixtures.js').ReturnRequest>}
 */
export function toOverlayEntry(req) {
  /** @type {Record<string, unknown>} */
  const entry = {};
  for (const key of OVERLAY_FIELDS) entry[key] = req[key];
  return entry;
}

/**
 * 상태 필터 적용. 'all' 이면 전체 반환.
 * @param {ReadonlyArray<import('./fixtures.js').ReturnRequest>} list
 * @param {"all"|"pending"|"approved"|"held"} filter
 * @returns {import('./fixtures.js').ReturnRequest[]}
 */
export function filterByStatus(list, filter) {
  if (filter === 'all') return list.slice();
  return list.filter((req) => req.status === filter);
}

/**
 * 상태별 건수 집계 (필터 뱃지용).
 * @param {ReadonlyArray<import('./fixtures.js').ReturnRequest>} list
 * @returns {{ all: number, pending: number, approved: number, held: number }}
 */
export function computeCounts(list) {
  const counts = { all: list.length, pending: 0, approved: 0, held: 0 };
  for (const req of list) {
    if (req.status === 'pending') counts.pending += 1;
    else if (req.status === 'approved') counts.approved += 1;
    else if (req.status === 'held') counts.held += 1;
  }
  return counts;
}
