// incident-command/fixtures.js — 정적 fixture 데이터 (UMD, 외부 fetch/API 없음)
// BF-824 · 기획 docs/plan/incident-command-BF-821.md §5~§6 (코드 블록 그대로 — 재해석 금지)
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api; // Node 단위 테스트
  }
  if (root) {
    root.IncidentCommandFixtures = api; // 브라우저 전역
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SEVERITIES = ["P1", "P2", "P3", "P4"];
  var STATUSES = ["detected", "investigating", "mitigating", "monitoring", "resolved"];
  var SEVERITY_LABELS = { P1: "치명", P2: "높음", P3: "보통", P4: "낮음" };
  var STATUS_LABELS = { detected: "감지됨", investigating: "조사중", mitigating: "조치중", monitoring: "모니터링", resolved: "해결됨" };
  var EVENT_TYPE_LABELS = { detected: "감지", update: "진행 갱신", escalated: "에스컬레이션", resolved: "해결" };

  var INCIDENTS = [
    {
      id: "INC-3001",
      title: "결제 게이트웨이 타임아웃 급증",
      severity: "P1",
      status: "investigating",
      owner: { name: "김온콜", team: "Payments" },
      detectedAt: "2026-07-14T02:10:00+09:00",
      updatedAt: "2026-07-14T02:45:00+09:00",
      timeline: [
        { timestamp: "2026-07-14T02:10:00+09:00", actor: "모니터링 시스템", eventType: "detected", note: "결제 승인 API 5xx 비율 12% 초과 — 자동 알림 발생" },
        { timestamp: "2026-07-14T02:15:00+09:00", actor: "김온콜", eventType: "update", note: "온콜 확인, 게이트웨이 사이드카 로그 조사 착수" },
        { timestamp: "2026-07-14T02:30:00+09:00", actor: "김온콜", eventType: "update", note: "업스트림 PG사 응답 지연 확인, PG사 상태 페이지 확인 중" },
        { timestamp: "2026-07-14T02:45:00+09:00", actor: "김온콜", eventType: "update", note: "PG사 측 부분 장애 공지 확인, 재시도 큐 우회 조치 검토" }
      ],
      checklist: [
        { id: "chk-3001-1", text: "결제 게이트웨이 사이드카 재시작", done: true, completedAt: "2026-07-14T02:20:00+09:00" },
        { id: "chk-3001-2", text: "PG사 상태 페이지 확인", done: true, completedAt: "2026-07-14T02:32:00+09:00" },
        { id: "chk-3001-3", text: "재시도 큐 우회 라우팅 활성화", done: false, completedAt: null },
        { id: "chk-3001-4", text: "결제 실패 고객 목록 집계", done: false, completedAt: null }
      ]
    },
    {
      id: "INC-3002",
      title: "정적 자산 CDN 5xx 스파이크",
      severity: "P2",
      status: "mitigating",
      owner: { name: "이인프라", team: "Platform" },
      detectedAt: "2026-07-14T01:05:00+09:00",
      updatedAt: "2026-07-14T01:40:00+09:00",
      timeline: [
        { timestamp: "2026-07-14T01:05:00+09:00", actor: "모니터링 시스템", eventType: "detected", note: "CDN 엣지 노드 5xx 비율 8% 초과" },
        { timestamp: "2026-07-14T01:20:00+09:00", actor: "이인프라", eventType: "update", note: "특정 리전 엣지 노드 장애로 확인, 트래픽 우회 준비" },
        { timestamp: "2026-07-14T01:40:00+09:00", actor: "이인프라", eventType: "update", note: "해당 리전 트래픽 우회 적용, 5xx 비율 하락 관찰 중" }
      ],
      checklist: [
        { id: "chk-3002-1", text: "장애 리전 트래픽 우회", done: true, completedAt: "2026-07-14T01:40:00+09:00" },
        { id: "chk-3002-2", text: "엣지 노드 재기동 요청", done: false, completedAt: null },
        { id: "chk-3002-3", text: "캐시 무효화 재검증", done: false, completedAt: null }
      ]
    },
    {
      id: "INC-3003",
      title: "로그인 세션 만료 오탐",
      severity: "P3",
      status: "monitoring",
      owner: { name: "박인증", team: "Identity" },
      detectedAt: "2026-07-13T22:00:00+09:00",
      updatedAt: "2026-07-13T23:10:00+09:00",
      timeline: [
        { timestamp: "2026-07-13T22:00:00+09:00", actor: "모니터링 시스템", eventType: "detected", note: "비정상 세션 만료율 증가 알림" },
        { timestamp: "2026-07-13T22:30:00+09:00", actor: "박인증", eventType: "update", note: "세션 토큰 클럭 스큐 이슈로 원인 확인, 시각 동기화 조치 완료" },
        { timestamp: "2026-07-13T23:10:00+09:00", actor: "박인증", eventType: "update", note: "재발 여부 1시간 모니터링 중, 추가 오탐 없음" }
      ],
      checklist: [
        { id: "chk-3003-1", text: "인증 서버 NTP 동기화 확인", done: true, completedAt: "2026-07-13T22:35:00+09:00" },
        { id: "chk-3003-2", text: "세션 만료율 대시보드 1시간 관찰", done: true, completedAt: "2026-07-13T23:10:00+09:00" }
      ]
    },
    {
      id: "INC-3004",
      title: "배치 작업 지연 경고",
      severity: "P4",
      status: "detected",
      owner: { name: "최데이터", team: "Data" },
      detectedAt: "2026-07-14T03:00:00+09:00",
      updatedAt: "2026-07-14T03:00:00+09:00",
      timeline: [
        { timestamp: "2026-07-14T03:00:00+09:00", actor: "모니터링 시스템", eventType: "detected", note: "야간 정산 배치 예상 종료 시각 20분 초과 — 경고 수준 알림" }
      ],
      checklist: []
    },
    {
      id: "INC-3005",
      title: "인증 토큰 발급 실패",
      severity: "P2",
      status: "resolved",
      owner: { name: "정보안", team: "Security" },
      detectedAt: "2026-07-13T09:00:00+09:00",
      updatedAt: "2026-07-13T10:15:00+09:00",
      timeline: [
        { timestamp: "2026-07-13T09:00:00+09:00", actor: "모니터링 시스템", eventType: "detected", note: "OAuth 토큰 발급 실패율 15% 초과" },
        { timestamp: "2026-07-13T09:20:00+09:00", actor: "정보안", eventType: "update", note: "서명 키 순환(rotation) 중 캐시 미갱신 확인" },
        { timestamp: "2026-07-13T09:45:00+09:00", actor: "정보안", eventType: "update", note: "전 노드 키 캐시 강제 갱신 배포" },
        { timestamp: "2026-07-13T10:00:00+09:00", actor: "정보안", eventType: "update", note: "실패율 정상 범위로 복귀 확인, 30분 관찰" },
        { timestamp: "2026-07-13T10:15:00+09:00", actor: "정보안", eventType: "resolved", note: "정상 범위 유지 확인, 장애 종결" }
      ],
      checklist: [
        { id: "chk-3005-1", text: "서명 키 캐시 강제 갱신 배포", done: true, completedAt: "2026-07-13T09:45:00+09:00" },
        { id: "chk-3005-2", text: "실패율 대시보드 30분 관찰", done: true, completedAt: "2026-07-13T10:15:00+09:00" },
        { id: "chk-3005-3", text: "사후 보고서(postmortem) 초안 작성", done: true, completedAt: "2026-07-13T10:15:00+09:00" }
      ]
    },
    {
      id: "INC-3006",
      title: "알림 발송 지연 (심각도 상향)",
      severity: "P1",
      status: "investigating",
      owner: { name: "한온콜", team: "Notifications" },
      detectedAt: "2026-07-14T00:10:00+09:00",
      updatedAt: "2026-07-14T00:50:00+09:00",
      timeline: [
        { timestamp: "2026-07-14T00:10:00+09:00", actor: "모니터링 시스템", eventType: "detected", note: "푸시 알림 발송 지연 평균 4분 초과" },
        { timestamp: "2026-07-14T00:20:00+09:00", actor: "한온콜", eventType: "update", note: "발송 큐 적체 확인, 원인 조사 중" },
        { timestamp: "2026-07-14T00:35:00+09:00", actor: "한온콜", eventType: "escalated", note: "결제 알림까지 지연 확산 확인 — 심각도 P2→P1 상향, 추가 담당자 투입" },
        { timestamp: "2026-07-14T00:50:00+09:00", actor: "한온콜", eventType: "update", note: "큐 워커 스케일아웃 진행 중" }
      ],
      checklist: [
        { id: "chk-3006-1", text: "발송 큐 적체량 확인", done: true, completedAt: "2026-07-14T00:20:00+09:00" },
        { id: "chk-3006-2", text: "결제 알림 우선순위 큐 분리", done: true, completedAt: "2026-07-14T00:40:00+09:00" },
        { id: "chk-3006-3", text: "큐 워커 스케일아웃", done: true, completedAt: "2026-07-14T00:50:00+09:00" },
        { id: "chk-3006-4", text: "지연된 알림 재발송", done: false, completedAt: null },
        { id: "chk-3006-5", text: "사용자 공지 문구 게시", done: false, completedAt: null }
      ]
    }
  ];

  return {
    SEVERITIES: SEVERITIES,
    STATUSES: STATUSES,
    SEVERITY_LABELS: SEVERITY_LABELS,
    STATUS_LABELS: STATUS_LABELS,
    EVENT_TYPE_LABELS: EVENT_TYPE_LABELS,
    INCIDENTS: INCIDENTS
  };
});
