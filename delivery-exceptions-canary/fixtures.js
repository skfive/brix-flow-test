/* delivery-exceptions-canary/fixtures.js — 배송 예외 결정적(deterministic) fixture + 라벨 매핑
 * BF-1033 · 기획 docs/planning/delivery-exceptions-canary-BF-1030.md §3·§7 (그대로 채택 — 재해석 금지)
 * 디자인 docs/design/delivery-exceptions-canary-BF-1032.md §6.1·§6.2 라벨
 * UMD 패턴 (support-inbox-canary/fixtures.js 관례 계승) — 브라우저: globalThis.DxcFixtures / Node: module.exports
 * 순수 데이터 상수 모듈 — DOM 접근·렌더링·네트워크·Date.now()/Math.random() 0건 (기획 §7.1)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.DxcFixtures = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* 메모 저장 envelope 스키마 버전 (기획 §6.1) — 구조가 바뀌면 증가 */
  var SCHEMA_VERSION = 1;

  /* Status enum → 한글 라벨 (기획 §4.1 / 디자인 §6.1) */
  var STATUS_LABEL = {
    open: "접수",
    investigating: "조사중",
    on_hold: "보류",
    resolved: "해결",
  };

  /* Cause enum → 한글 라벨 (기획 §3.2 / 디자인 §6.2) */
  var CAUSE_LABEL = {
    address_unreachable: "배송지 접근 불가",
    recipient_absent: "수취인 부재",
    package_damaged: "상품 파손",
    customs_hold: "통관 보류",
    weather_delay: "기상 지연",
  };

  /* ─── fixture 7건 (기획 §7.2) — status 4종 + cause 5종 전부 커버
   * 배열 순서 = 화면 표시 순서 (런타임 재정렬 없음, 기획 §3.3)
   * 모든 시각은 ISO8601 +09:00 고정 (실행마다 동일 — 난수/현재시각 미사용, 기획 §7.1)
   * occurredAt <= updatedAt 항상 성립 (기획 §3.1)
   */
  var EXCEPTIONS = [
    {
      id: "EXC-5001",
      orderId: "ORD-880101",
      recipientName: "김도윤",
      deliveryAddress: "서울시 강남구 테헤란로 105",
      cause: "address_unreachable",
      status: "open",
      occurredAt: "2026-07-10T09:15:00+09:00",
      updatedAt: "2026-07-10T09:15:00+09:00",
      description: "배송지 상세 주소 누락으로 배송지 확인 불가",
    },
    {
      id: "EXC-5002",
      orderId: "ORD-880132",
      recipientName: "이하윤",
      deliveryAddress: "부산시 해운대구 센텀중앙로 55",
      cause: "recipient_absent",
      status: "investigating",
      occurredAt: "2026-07-11T11:00:00+09:00",
      updatedAt: "2026-07-11T14:30:00+09:00",
      description: "2회 방문 시도, 수취인 부재로 조사 중",
    },
    {
      id: "EXC-5003",
      orderId: "ORD-880144",
      recipientName: "박서준",
      deliveryAddress: "대구시 수성구 동대구로 200",
      cause: "package_damaged",
      status: "on_hold",
      occurredAt: "2026-07-12T08:20:00+09:00",
      updatedAt: "2026-07-13T10:00:00+09:00",
      description: "상품 파손 확인, 재발송 여부 고객 회신 대기",
    },
    {
      id: "EXC-5004",
      orderId: "ORD-880159",
      recipientName: "최지아",
      deliveryAddress: "인천시 연수구 컨벤시아대로 15",
      cause: "customs_hold",
      status: "resolved",
      occurredAt: "2026-07-08T07:00:00+09:00",
      updatedAt: "2026-07-09T16:45:00+09:00",
      description: "통관 보류 후 서류 보완 완료, 배송 재개",
    },
    {
      id: "EXC-5005",
      orderId: "ORD-880170",
      recipientName: "정우진",
      deliveryAddress: "광주시 서구 상무대로 60",
      cause: "weather_delay",
      status: "open",
      occurredAt: "2026-07-14T06:30:00+09:00",
      updatedAt: "2026-07-14T06:30:00+09:00",
      description: "폭우로 인한 배송 지연 예상",
    },
    {
      id: "EXC-5006",
      orderId: "ORD-880188",
      recipientName: "한소율",
      deliveryAddress: "대전시 유성구 대학로 99",
      cause: "recipient_absent",
      status: "resolved",
      occurredAt: "2026-07-09T13:10:00+09:00",
      updatedAt: "2026-07-10T09:00:00+09:00",
      description: "재방문 후 수취 완료",
    },
    {
      id: "EXC-5007",
      orderId: "ORD-880199",
      recipientName: "오하준",
      deliveryAddress: "울산시 남구 삼산로 45",
      cause: "address_unreachable",
      status: "investigating",
      occurredAt: "2026-07-15T10:05:00+09:00",
      updatedAt: "2026-07-15T15:20:00+09:00",
      description: "주소지 재확인 요청, 고객 응답 대기 중 조사 지속",
    },
  ];

  /** fixture 방어적 복제본 반환 — 원본 상수는 런타임에 변경되지 않는다(기획 §1.2·§7.1). */
  function getExceptions() {
    return EXCEPTIONS.map(function (e) {
      return {
        id: e.id,
        orderId: e.orderId,
        recipientName: e.recipientName,
        deliveryAddress: e.deliveryAddress,
        cause: e.cause,
        status: e.status,
        occurredAt: e.occurredAt,
        updatedAt: e.updatedAt,
        description: e.description,
      };
    });
  }

  /** 현재 fixture 의 유효 id 집합 — notes-storage orphan 검증(기획 §6.3 V5)용. */
  function getValidIds() {
    return EXCEPTIONS.map(function (e) {
      return e.id;
    });
  }

  function statusLabel(status) {
    return Object.prototype.hasOwnProperty.call(STATUS_LABEL, status)
      ? STATUS_LABEL[status]
      : status;
  }

  function causeLabel(cause) {
    return Object.prototype.hasOwnProperty.call(CAUSE_LABEL, cause)
      ? CAUSE_LABEL[cause]
      : cause;
  }

  return {
    SCHEMA_VERSION: SCHEMA_VERSION,
    STATUS_LABEL: STATUS_LABEL,
    CAUSE_LABEL: CAUSE_LABEL,
    getExceptions: getExceptions,
    getValidIds: getValidIds,
    statusLabel: statusLabel,
    causeLabel: causeLabel,
  };
});
