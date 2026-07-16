// BF-856 · /demo/status 정적 상태 배지 순수 데이터/파생 로직
// - DOM·네트워크 의존성 없음 → node:test 단위 테스트 가능
// - 기획 SSOT: docs/planning/status-badge-BF-854.md (§3 fixture, §3.3 요약 파생, §5 접근성)
// - 디자인: docs/design/status-badge-BF-855.md (§4.2 라벨/아이콘, §5 컴포넌트)
//
// 값은 하드코딩된 fixture 스냅샷이며 로드 후 변하지 않는다(polling·API·DB 없음, 기획 §6).

/** 상태값 리터럴 (기획 §3.2) */
export const STATUS_OPERATIONAL = "operational";
export const STATUS_DEGRADED = "degraded";
export const STATUS_OUTAGE = "outage";

/** 상태 → 한글 라벨 (디자인 §4.2) */
export const STATUS_LABELS = Object.freeze({
  operational: "정상",
  degraded: "저하",
  outage: "장애",
});

/** 상태 → 장식 아이콘 (디자인 §4.2 · aria-hidden 처리 대상) */
export const STATUS_ICONS = Object.freeze({
  operational: "●",
  degraded: "▲",
  outage: "✕",
});

/** 심각도 우선순위 — outage > degraded > operational (기획 §3.3/§9.1) */
export const STATUS_SEVERITY = Object.freeze({
  operational: 0,
  degraded: 1,
  outage: 2,
});

/** 전체 요약 문구 (기획 §3.3) */
export const SUMMARY_TEXT = Object.freeze({
  operational: "모든 서비스가 정상 작동 중입니다.",
  degraded: "일부 서비스에서 지연이 발생하고 있습니다.",
  outage: "일부 서비스에 장애가 발생했습니다.",
});

/** 미정의 status 폴백 표시 (기획 §9.3, 디자인 §5.1) */
export const UNKNOWN_STATUS = Object.freeze({
  label: "알 수 없음",
  icon: "?",
});

/**
 * 서비스 상태 fixture (정적 스냅샷, 기획 §3.1 · §0 가정 2).
 * 3가지 상태값을 모두 최소 1회 포함한다(디자인/접근성 검증 목적).
 * @type {ReadonlyArray<{id:string,name:string,status:string,description:string}>}
 */
export const SERVICES = Object.freeze([
  {
    id: "web",
    name: "웹 서버",
    status: STATUS_OPERATIONAL,
    description: "모든 페이지가 정상적으로 응답하고 있습니다.",
  },
  {
    id: "api",
    name: "API 게이트웨이",
    status: STATUS_OPERATIONAL,
    description: "모든 요청이 정상 처리되고 있습니다.",
  },
  {
    id: "database",
    name: "데이터베이스",
    status: STATUS_DEGRADED,
    description: "일부 쿼리 응답 지연이 관측되고 있습니다.",
  },
  {
    id: "auth",
    name: "인증 서비스",
    status: STATUS_OUTAGE,
    description: "로그인 요청이 일시적으로 실패하고 있습니다.",
  },
]);

/**
 * 정의된 3개 상태 리터럴인지 여부 (기획 §3.2).
 * @param {unknown} status
 * @returns {boolean}
 */
export function isKnownStatus(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_LABELS, status);
}

/**
 * 상태 → 한글 라벨. 미정의 값은 폴백 라벨(기획 §9.3).
 * @param {unknown} status
 * @returns {string}
 */
export function statusLabel(status) {
  return isKnownStatus(status) ? STATUS_LABELS[status] : UNKNOWN_STATUS.label;
}

/**
 * 상태 → 장식 아이콘. 미정의 값은 폴백 아이콘(기획 §9.3).
 * @param {unknown} status
 * @returns {string}
 */
export function statusIcon(status) {
  return isKnownStatus(status) ? STATUS_ICONS[status] : UNKNOWN_STATUS.icon;
}

/**
 * 배지 접근성 이름 — "{서비스명} 상태: {라벨}" (기획 §5.1, AC-2).
 * @param {string} serviceName
 * @param {unknown} status
 * @returns {string}
 */
export function badgeAriaLabel(serviceName, status) {
  return `${serviceName} 상태: ${statusLabel(status)}`;
}

/**
 * 서비스 목록에서 가장 심각한 상태를 파생 (기획 §3.3/§9.1 — 다수결 아님).
 * 미정의 status 는 심각도 계산에서 제외한다.
 * @param {ReadonlyArray<{status:unknown}>} services
 * @returns {string} operational | degraded | outage
 */
export function deriveWorstStatus(services) {
  let worst = STATUS_OPERATIONAL;
  let worstSeverity = STATUS_SEVERITY[STATUS_OPERATIONAL];
  for (const svc of services) {
    if (!isKnownStatus(svc.status)) continue;
    const severity = STATUS_SEVERITY[svc.status];
    if (severity > worstSeverity) {
      worstSeverity = severity;
      worst = svc.status;
    }
  }
  return worst;
}

/**
 * worst 상태 → 요약 문구 (기획 §3.3).
 * @param {string} worst
 * @returns {string}
 */
export function summaryText(worst) {
  return isKnownStatus(worst) ? SUMMARY_TEXT[worst] : SUMMARY_TEXT.operational;
}

/**
 * 상태별 개수 집계 (미정의 status 는 집계 제외).
 * @param {ReadonlyArray<{status:unknown}>} services
 * @returns {{operational:number,degraded:number,outage:number}}
 */
export function countByStatus(services) {
  const counts = { operational: 0, degraded: 0, outage: 0 };
  for (const svc of services) {
    if (isKnownStatus(svc.status)) counts[svc.status] += 1;
  }
  return counts;
}

/**
 * 요약 배너 파생값 묶음 (기획 §3.3).
 * @param {ReadonlyArray<{status:unknown}>} services
 * @returns {{status:string,text:string,counts:{operational:number,degraded:number,outage:number},total:number}}
 */
export function summarize(services) {
  const worst = deriveWorstStatus(services);
  return {
    status: worst,
    text: summaryText(worst),
    counts: countByStatus(services),
    total: services.length,
  };
}

/**
 * 요약 배너 서브라벨 문구 (디자인 §4.4).
 * 예: "전체 서비스 4개 중 장애 1 · 저하 1 · 정상 2"
 * @param {ReadonlyArray<{status:unknown}>} services
 * @returns {string}
 */
export function summarySubline(services) {
  const c = countByStatus(services);
  return `전체 서비스 ${services.length}개 중 장애 ${c.outage} · 저하 ${c.degraded} · 정상 ${c.operational}`;
}
