/* 온콜 인수인계 현황 — 로컬 fixture (BF-1140)
 * UMD 패턴: 브라우저 globalThis.OncallFixtures / Node module.exports
 * vanilla-static: fetch/import/export/외부 URL 0건 — file:// 직접 실행 호환.
 * 4개 상태(정상 healthy / 저하 degraded / 장애 outage / 빈 empty)를 정적으로 제공.
 * posture 는 데이터에서 파생(handoff.computePosture)하며 여기서 하드코딩하지 않는다.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api; // Node 단위 테스트
  }
  if (root) {
    root.OncallFixtures = api; // 브라우저 전역
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SCHEDULE = {
    outgoing: { name: "김온콜", handle: "@kim.oncall" },
    incoming: { name: "이당직", handle: "@lee.duty" }
  };

  // 장애 outage — 활성 SEV1/SEV2 존재
  var OUTAGE = {
    schedule: SCHEDULE,
    notes: [],
    incidents: [
      {
        id: "pay-timeout",
        severity: 1,
        title: "결제 API 응답 지연 → 타임아웃",
        services: [
          { name: "결제 API", status: "outage" },
          { name: "체크아웃", status: "outage" },
          { name: "주문 이력", status: "degraded" }
        ],
        lastAction: {
          at: "2026-07-24T08:12",
          text: "결제 서비스 v2.14.1 롤백 배포 완료, 오류율 관찰 중"
        },
        nextOwner: { name: "이당직", handle: "@lee.duty", ack: false },
        actions: [
          { label: "런북 열기", variant: "primary", glyph: "▶" },
          { label: "상태 페이지", glyph: "◱" },
          { label: "에스컬레이션", variant: "danger", glyph: "↑" }
        ]
      },
      {
        id: "cdn-cache",
        severity: 2,
        title: "이미지 CDN 캐시 적중률 하락",
        services: [
          { name: "이미지 CDN", status: "degraded" },
          { name: "상품 상세", status: "degraded" }
        ],
        lastAction: {
          at: "2026-07-24T07:48",
          text: "엣지 노드 2대 수동 캐시 워밍, 적중률 61%→79% 회복"
        },
        nextOwner: { name: "이당직", handle: "@lee.duty", ack: true },
        actions: [
          { label: "런북 열기", variant: "primary", glyph: "▶" },
          { label: "대시보드", glyph: "◱" }
        ]
      }
    ]
  };

  // 저하 degraded — 활성 인시던트가 SEV3(모니터링)만
  var DEGRADED = {
    schedule: SCHEDULE,
    notes: [],
    incidents: [
      {
        id: "search-index",
        severity: 3,
        title: "검색 색인 지연 (backfill 진행)",
        services: [{ name: "검색", status: "degraded" }],
        lastAction: {
          at: "2026-07-24T06:30",
          text: "backfill 워커 3→5 증설, 색인 지연 22분→9분"
        },
        nextOwner: { name: "이당직", handle: "@lee.duty", ack: true },
        actions: [{ label: "색인 대시보드", glyph: "◱" }]
      }
    ]
  };

  // 정상 healthy — 활성 장애 0건, 인계는 존재(주의 노트)
  var HEALTHY = {
    schedule: SCHEDULE,
    incidents: [],
    notes: [
      "결제 v2.14.1 롤백 후 오류율 정상. 17:00 재배포 예정 — 로그 주시.",
      "검색 backfill 완료 예상 11:00, 이후 워커 원복."
    ],
    clearActions: [
      { label: "인계 확인", variant: "primary", glyph: "✓" },
      { label: "전체 상태 페이지", glyph: "◱" }
    ]
  };

  // 빈 empty — 교대 스케줄에 담당자 미배정
  var EMPTY = {
    schedule: null,
    incidents: [],
    notes: []
  };

  return {
    FIXTURES: {
      outage: OUTAGE,
      degraded: DEGRADED,
      healthy: HEALTHY,
      empty: EMPTY
    }
  };
});
