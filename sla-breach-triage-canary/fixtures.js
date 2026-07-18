// SLA 위반 대응 큐 — 정적 fixture (BF-1057)
// 기획 §3 스키마를 따르는 고정 초기 상태. 외부 네트워크/DB 없음(§6).
// 모든 항목은 무결성 규칙(§3)을 준수한다. 시각은 KST(+09:00) ISO 8601.

/** @type {Array<import("./queue.js").SlaBreachRequest>} */
export const SLA_FIXTURES = [
  {
    id: "SLA-1001",
    title: "결제 API 응답 지연",
    customer: "아크로뱅크",
    severity: "critical",
    breachedAt: "2026-07-18T09:12:00+09:00",
    slaMinutesOverdue: 132,
    status: "pending",
    assignee: null,
    assignedAt: null,
    resolutionNote: null,
    resolvedAt: null,
  },
  {
    id: "SLA-1002",
    title: "주문 조회 타임아웃 증가",
    customer: "한빛커머스",
    severity: "high",
    breachedAt: "2026-07-18T08:40:00+09:00",
    slaMinutesOverdue: 88,
    status: "assigned",
    assignee: "홍길동",
    assignedAt: "2026-07-18T09:05:00+09:00",
    resolutionNote: null,
    resolvedAt: null,
  },
  {
    id: "SLA-1003",
    title: "알림 발송 큐 적체",
    customer: "모아페이",
    severity: "medium",
    breachedAt: "2026-07-18T07:55:00+09:00",
    slaMinutesOverdue: 41,
    status: "pending",
    assignee: null,
    assignedAt: null,
    resolutionNote: null,
    resolvedAt: null,
  },
  {
    id: "SLA-1004",
    title: "대시보드 위젯 로딩 지연",
    customer: "브릭스랩",
    severity: "low",
    breachedAt: "2026-07-18T06:30:00+09:00",
    slaMinutesOverdue: 15,
    status: "resolved",
    assignee: "김담당",
    assignedAt: "2026-07-18T06:50:00+09:00",
    resolutionNote: "캐시 TTL 조정 후 로딩 정상화 확인.",
    resolvedAt: "2026-07-18T07:10:00+09:00",
  },
];

// 초기 상태 복제본을 반환(호출부가 자유롭게 변경해도 원본 fixture 불변).
export function cloneFixtures() {
  return SLA_FIXTURES.map((r) => ({ ...r }));
}
