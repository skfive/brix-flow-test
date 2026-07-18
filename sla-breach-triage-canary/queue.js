// SLA 위반 대응 큐 — 순수 로직 모듈 (BF-1057)
// 기획 명세 §3(스키마)·§4(상태 전이)·§5(정렬)·§6.1(액션 인터페이스) 구현.
// 외부 의존성 0건. 브라우저/Node 공용 ESM. 모든 함수는 입력 배열을 변경하지 않는 순수 함수.

/** @typedef {"critical"|"high"|"medium"|"low"} SlaSeverity */
/** @typedef {"pending"|"assigned"|"resolved"} SlaStatus */

export const SEVERITY_VALUES = ["critical", "high", "medium", "low"];
export const STATUS_VALUES = ["pending", "assigned", "resolved"];

// 위험도 랭크: 숫자가 작을수록 우선(먼저). 기획 §5.
export const SEVERITY_RANK = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const isNull = (v) => v === null;

/**
 * fixture 무결성 규칙(기획 §3) 검증. 유효하지 않으면 false.
 * @param {any} req
 * @returns {boolean}
 */
export function isValidRequest(req) {
  if (req === null || typeof req !== "object") return false;

  if (!isNonEmptyString(req.id)) return false;
  if (!isNonEmptyString(req.title)) return false;
  if (!isNonEmptyString(req.customer)) return false;
  if (!SEVERITY_VALUES.includes(req.severity)) return false;
  if (!STATUS_VALUES.includes(req.status)) return false;
  if (typeof req.slaMinutesOverdue !== "number" || Number.isNaN(req.slaMinutesOverdue)) return false;
  if (req.slaMinutesOverdue < 0) return false;
  if (!isNonEmptyString(req.breachedAt)) return false;

  if (req.status === "pending") {
    return isNull(req.assignee) && isNull(req.assignedAt) && isNull(req.resolutionNote) && isNull(req.resolvedAt);
  }
  if (req.status === "assigned") {
    return (
      isNonEmptyString(req.assignee) &&
      isNonEmptyString(req.assignedAt) &&
      isNull(req.resolutionNote) &&
      isNull(req.resolvedAt)
    );
  }
  // resolved
  return (
    isNonEmptyString(req.assignee) &&
    isNonEmptyString(req.assignedAt) &&
    isNonEmptyString(req.resolutionNote) &&
    isNonEmptyString(req.resolvedAt)
  );
}

/**
 * 무결성 위반 항목과 중복 id 를 제외한 유효 항목만 반환(순수). 위반은 콘솔 경고만(AC-8).
 * @param {any[]} requests
 * @returns {any[]}
 */
export function filterValidRequests(requests) {
  if (!Array.isArray(requests)) return [];
  const seen = new Set();
  const valid = [];
  for (const req of requests) {
    if (!isValidRequest(req)) {
      warn("무결성 위반 항목을 렌더에서 제외합니다", req);
      continue;
    }
    if (seen.has(req.id)) {
      warn(`중복 id 항목을 렌더에서 제외합니다: ${req.id}`, req);
      continue;
    }
    seen.add(req.id);
    valid.push(req);
  }
  return valid;
}

function warn(message, detail) {
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(`[sla-breach-triage] ${message}`, detail);
  }
}

/**
 * 대응 대기열 comparator(기획 §5, 4단계 결정적 tie-break).
 * 1) severity 랭크 오름차순 → 2) slaMinutesOverdue 내림차순 → 3) breachedAt 오름차순 → 4) id 오름차순.
 * @returns {number}
 */
export function compareQueue(a, b) {
  const rankDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (rankDiff !== 0) return rankDiff;

  const overdueDiff = b.slaMinutesOverdue - a.slaMinutesOverdue;
  if (overdueDiff !== 0) return overdueDiff;

  if (a.breachedAt < b.breachedAt) return -1;
  if (a.breachedAt > b.breachedAt) return 1;

  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

/**
 * 유효 항목을 대응 대기열/해결됨 두 섹션으로 분리·정렬(순수, 입력 불변).
 * @param {any[]} requests
 * @returns {{ pendingQueue: any[], resolvedQueue: any[] }}
 */
export function sortQueue(requests) {
  const valid = filterValidRequests(requests);
  const pendingQueue = valid
    .filter((r) => r.status === "pending" || r.status === "assigned")
    .slice()
    .sort(compareQueue);
  const resolvedQueue = valid
    .filter((r) => r.status === "resolved")
    .slice()
    .sort((a, b) => (a.resolvedAt < b.resolvedAt ? 1 : a.resolvedAt > b.resolvedAt ? -1 : 0));
  return { pendingQueue, resolvedQueue };
}

function findRequest(requests, requestId) {
  if (!Array.isArray(requests)) return undefined;
  return requests.find((r) => r && r.id === requestId);
}

/**
 * 담당 지정(pending → assigned). 기획 §4.1.
 * @returns {{ok:true,data:any}|{ok:false,error:string}}
 */
export function assignRequest(requests, requestId, assignee, now) {
  const req = findRequest(requests, requestId);
  if (!req) return { ok: false, error: "요청을 찾을 수 없습니다" };
  if (req.status !== "pending") return { ok: false, error: "대기 상태에서만 담당을 지정할 수 있습니다" };
  if (typeof assignee !== "string" || assignee.trim().length === 0) {
    return { ok: false, error: "담당자를 입력하세요" };
  }
  return {
    ok: true,
    data: { ...req, status: "assigned", assignee: assignee.trim(), assignedAt: now },
  };
}

/**
 * 해결 처리(assigned → resolved). 기획 §4.2.
 * @returns {{ok:true,data:any}|{ok:false,error:string}}
 */
export function resolveRequest(requests, requestId, resolutionNote, now) {
  const req = findRequest(requests, requestId);
  if (!req) return { ok: false, error: "요청을 찾을 수 없습니다" };
  if (req.status !== "assigned") return { ok: false, error: "담당지정 상태에서만 해결 처리할 수 있습니다" };
  if (typeof resolutionNote !== "string" || resolutionNote.trim().length === 0) {
    return { ok: false, error: "해결 메모를 입력하세요" };
  }
  return {
    ok: true,
    data: { ...req, status: "resolved", resolutionNote: resolutionNote.trim(), resolvedAt: now },
  };
}

/**
 * 담당 해제(assigned → pending). 기획 §4.3.
 * @returns {{ok:true,data:any}|{ok:false,error:string}}
 */
export function unassignRequest(requests, requestId) {
  const req = findRequest(requests, requestId);
  if (!req) return { ok: false, error: "요청을 찾을 수 없습니다" };
  if (req.status !== "assigned") return { ok: false, error: "담당지정 상태에서만 담당을 해제할 수 있습니다" };
  return {
    ok: true,
    data: { ...req, status: "pending", assignee: null, assignedAt: null },
  };
}
