// 서비스 요청 우선순위 분류 — 순수 함수 (기획 BF-1121 §3·§6 계약).
// 저장소 관측 규약: vanilla-static / esm. 부수효과·네트워크·영속화 없음.
// 매트릭스는 기획 §3 표를 그대로 상수로 옮긴 룩업이며, 근사/가중치 합산 로직을 쓰지 않는다(§6).

/**
 * @typedef {'incident'|'security'|'bug'|'change_request'|'inquiry'} RequestType
 * @typedef {'critical'|'high'|'medium'|'low'} Impact
 * @typedef {'P1'|'P2'|'P3'|'P4'} Priority
 * @typedef {{ priority: Priority, label: string, nextAction: string, targetTime: string }} PriorityResult
 */

// 유형(범주형 5종). 글리프는 시각 보조이며, 라벨이 접근성 기준 식별자다(설계 §2.2).
export const REQUEST_TYPES = [
  { code: 'incident', label: '장애', glyph: '⛔' },
  { code: 'security', label: '보안', glyph: '🔒' },
  { code: 'bug', label: '버그', glyph: '🐛' },
  { code: 'change_request', label: '변경요청', glyph: '⚙' },
  { code: 'inquiry', label: '문의', glyph: '❓' },
];

// 영향도(서열형 4단계). segments = 강도 미터 채움 칸 수(설계 §5.4).
export const IMPACTS = [
  { code: 'critical', label: 'Critical', segments: 4 },
  { code: 'high', label: 'High', segments: 3 },
  { code: 'medium', label: 'Medium', segments: 2 },
  { code: 'low', label: 'Low', segments: 1 },
];

// 기획 §3 매트릭스 (Type × Impact → P1~P4). 5×4 = 20 조합 1:1 확정.
export const PRIORITY_MATRIX = Object.freeze({
  incident: Object.freeze({ critical: 'P1', high: 'P1', medium: 'P2', low: 'P3' }),
  security: Object.freeze({ critical: 'P1', high: 'P1', medium: 'P2', low: 'P3' }),
  bug: Object.freeze({ critical: 'P1', high: 'P2', medium: 'P3', low: 'P4' }),
  change_request: Object.freeze({ critical: 'P2', high: 'P2', medium: 'P3', low: 'P4' }),
  inquiry: Object.freeze({ critical: 'P2', high: 'P3', medium: 'P4', low: 'P4' }),
});

// 기획 §3.1 우선순위별 다음 조치(재해석 금지 — 원문 고정) + 라벨/목표 착수 시간.
export const PRIORITY_META = Object.freeze({
  P1: Object.freeze({ label: '긴급', nextAction: '즉시 담당자 배정 + 실시간 모니터링 채널 개설, 필요 시 책임자 에스컬레이션', targetTime: '15분 이내' }),
  P2: Object.freeze({ label: '높음', nextAction: '당일 내 담당자 배정 및 착수, 2시간 주기 진행 상황 업데이트', targetTime: '4시간 이내' }),
  P3: Object.freeze({ label: '보통', nextAction: '익영업일 이내 착수, 정기(일 단위) 업데이트', targetTime: '1영업일 이내' }),
  P4: Object.freeze({ label: '낮음', nextAction: '백로그에 등록, 다음 스프린트 계획 시 우선순위 재검토', targetTime: '스프린트 계획 반영' }),
});

// 정의되지 않은 유형/영향도 코드 유입 시 던지는 오류(§4 — 폴백 추정 금지, 계산 거부).
export class UndefinedTriageCodeError extends Error {
  constructor(type, impact) {
    super(`정의되지 않은 유형/등급입니다: type=${String(type)}, impact=${String(impact)}`);
    this.name = 'UndefinedTriageCodeError';
    this.inputType = type;
    this.inputImpact = impact;
  }
}

/**
 * 유형·영향도 조합으로 우선순위와 다음 조치를 결정론적으로 산출한다.
 * @param {RequestType} type
 * @param {Impact} impact
 * @returns {PriorityResult}
 * @throws {UndefinedTriageCodeError} 매트릭스에 없는 코드(오타/미정의/미선택)일 때
 */
export function classifyServiceRequestPriority(type, impact) {
  const row = PRIORITY_MATRIX[type];
  const priority = row ? row[impact] : undefined;
  if (!priority) {
    throw new UndefinedTriageCodeError(type, impact);
  }
  const meta = PRIORITY_META[priority];
  return { priority, label: meta.label, nextAction: meta.nextAction, targetTime: meta.targetTime };
}
