// 요청 우선순위 분류 순수 로직 (BF-1105)
// 기준: docs/planning/request-priority-BF-1102.md (BF-1103) §3 매트릭스 / §3.1 다음 조치
// 규약: vanilla-static / esm. 네트워크·영속화·부수효과 없음. 근사 로직 금지(§6).

/** 영향도 등급 코드 (기획 §2.1) */
export const IMPACTS = ["critical", "high", "medium", "low"];

/** 긴급도 등급 코드 (기획 §2.2) */
export const URGENCIES = ["immediate", "high", "medium", "low"];

// 기획 §3 우선순위 매트릭스 [impact][urgency] → P1~P4 (1:1 확정 매핑, 재해석 금지)
const MATRIX = {
  critical: { immediate: "P1", high: "P1", medium: "P2", low: "P2" },
  high: { immediate: "P1", high: "P2", medium: "P2", low: "P3" },
  medium: { immediate: "P2", high: "P3", medium: "P3", low: "P4" },
  low: { immediate: "P3", high: "P4", medium: "P4", low: "P4" },
};

/** 우선순위별 라벨·다음 조치·목표 착수 시간 (기획 §3.1, 재해석 금지) */
export const PRIORITY_META = {
  P1: {
    label: "긴급(Critical)",
    nextAction:
      "즉시 담당자 배정 + 실시간 모니터링 채널 개설, 필요 시 경영진/책임자 에스컬레이션",
    targetTime: "15분 이내",
  },
  P2: {
    label: "높음(High)",
    nextAction: "당일 내 담당자 배정 및 착수, 2시간 주기 진행 상황 업데이트",
    targetTime: "4시간 이내",
  },
  P3: {
    label: "보통(Medium)",
    nextAction: "익영업일 이내 착수, 정기(일 단위) 업데이트",
    targetTime: "1영업일 이내",
  },
  P4: {
    label: "낮음(Low)",
    nextAction: "백로그에 등록, 다음 스프린트 계획 시 우선순위 재검토",
    targetTime: "스프린트 계획 반영",
  },
};

/** 매트릭스에 없는 등급 코드가 유입될 때 던지는 에러 (기획 §4 — 폴백 추정 금지) */
export class UndefinedGradeError extends Error {
  constructor(impact, urgency) {
    super(`정의되지 않은 등급: impact=${String(impact)}, urgency=${String(urgency)}`);
    this.name = "UndefinedGradeError";
    this.impact = impact;
    this.urgency = urgency;
  }
}

/**
 * 영향도 × 긴급도 → 우선순위/다음 조치 순수 분류 함수 (기획 §6 계약).
 * @param {string} impact  영향도 등급 코드
 * @param {string} urgency 긴급도 등급 코드
 * @returns {{ priority: string, nextAction: string }}
 * @throws {UndefinedGradeError} union 밖 등급이면 계산 거부 (근사 금지)
 */
export function classifyRequestPriority(impact, urgency) {
  const row = MATRIX[impact];
  if (!row || !Object.prototype.hasOwnProperty.call(row, urgency)) {
    throw new UndefinedGradeError(impact, urgency);
  }
  const priority = row[urgency];
  return { priority, nextAction: PRIORITY_META[priority].nextAction };
}
