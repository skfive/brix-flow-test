// BF-882 · status-card SPA 정적 상태 데이터/파생 로직 (vanilla-static, file:// 안전)
// - DOM·네트워크 의존성 없음 → 로드 시 1회 렌더용 순수 fixture/파생 함수만 노출.
// - 원본 계약 승계: src/app/demo/status/status.js (BF-856) 의 fixture·파생 로직을
//   손실 없이 복제(디자인 §0/§6.1 — 신규 값 0건). ESM import 대신 전역(StatusCard)
//   으로 노출해 file:// 에서 <script src> 로 안전 로드(tech-stack vanilla-static).
// - 값은 하드코딩된 fixture 스냅샷이며 로드 후 변하지 않는다(polling·API·DB 없음).
(function (global) {
  "use strict";

  /** 상태값 리터럴 */
  var STATUS_OPERATIONAL = "operational";
  var STATUS_DEGRADED = "degraded";
  var STATUS_OUTAGE = "outage";

  /** 상태 → 한글 라벨 (디자인 §4.2) */
  var STATUS_LABELS = Object.freeze({
    operational: "정상",
    degraded: "저하",
    outage: "장애",
  });

  /** 상태 → 장식 아이콘 (디자인 §4.2 · aria-hidden 처리 대상) */
  var STATUS_ICONS = Object.freeze({
    operational: "●",
    degraded: "▲",
    outage: "✕",
  });

  /** 심각도 우선순위 — outage > degraded > operational (디자인 §5.3) */
  var STATUS_SEVERITY = Object.freeze({
    operational: 0,
    degraded: 1,
    outage: 2,
  });

  /** 전체 요약 문구 (디자인 §5.3) */
  var SUMMARY_TEXT = Object.freeze({
    operational: "모든 서비스가 정상 작동 중입니다.",
    degraded: "일부 서비스에서 지연이 발생하고 있습니다.",
    outage: "일부 서비스에 장애가 발생했습니다.",
  });

  /** 미정의 status 폴백 표시 (디자인 §5.1) */
  var UNKNOWN_STATUS = Object.freeze({
    label: "알 수 없음",
    icon: "?",
  });

  /**
   * 서비스 상태 fixture (정적 스냅샷).
   * 3가지 상태값을 모두 최소 1회 포함한다(디자인/접근성 검증 목적).
   */
  var SERVICES = Object.freeze([
    Object.freeze({
      id: "web",
      name: "웹 서버",
      status: STATUS_OPERATIONAL,
      description: "모든 페이지가 정상적으로 응답하고 있습니다.",
    }),
    Object.freeze({
      id: "api",
      name: "API 게이트웨이",
      status: STATUS_OPERATIONAL,
      description: "모든 요청이 정상 처리되고 있습니다.",
    }),
    Object.freeze({
      id: "database",
      name: "데이터베이스",
      status: STATUS_DEGRADED,
      description: "일부 쿼리 응답 지연이 관측되고 있습니다.",
    }),
    Object.freeze({
      id: "auth",
      name: "인증 서비스",
      status: STATUS_OUTAGE,
      description: "로그인 요청이 일시적으로 실패하고 있습니다.",
    }),
  ]);

  /** 정의된 3개 상태 리터럴인지 여부. */
  function isKnownStatus(status) {
    return Object.prototype.hasOwnProperty.call(STATUS_LABELS, status);
  }

  /** 상태 → 한글 라벨. 미정의 값은 폴백 라벨. */
  function statusLabel(status) {
    return isKnownStatus(status) ? STATUS_LABELS[status] : UNKNOWN_STATUS.label;
  }

  /** 상태 → 장식 아이콘. 미정의 값은 폴백 아이콘. */
  function statusIcon(status) {
    return isKnownStatus(status) ? STATUS_ICONS[status] : UNKNOWN_STATUS.icon;
  }

  /** 배지 접근성 이름 — "{서비스명} 상태: {라벨}" (디자인 §5.1). */
  function badgeAriaLabel(serviceName, status) {
    return serviceName + " 상태: " + statusLabel(status);
  }

  /**
   * 서비스 목록에서 가장 심각한 상태를 파생 (디자인 §5.3 — 다수결 아님).
   * 미정의 status 는 심각도 계산에서 제외한다.
   */
  function deriveWorstStatus(services) {
    var worst = STATUS_OPERATIONAL;
    var worstSeverity = STATUS_SEVERITY[STATUS_OPERATIONAL];
    for (var i = 0; i < services.length; i += 1) {
      var svc = services[i];
      if (!isKnownStatus(svc.status)) continue;
      var severity = STATUS_SEVERITY[svc.status];
      if (severity > worstSeverity) {
        worstSeverity = severity;
        worst = svc.status;
      }
    }
    return worst;
  }

  /** worst 상태 → 요약 문구. */
  function summaryText(worst) {
    return isKnownStatus(worst) ? SUMMARY_TEXT[worst] : SUMMARY_TEXT.operational;
  }

  /** 상태별 개수 집계 (미정의 status 는 집계 제외). */
  function countByStatus(services) {
    var counts = { operational: 0, degraded: 0, outage: 0 };
    for (var i = 0; i < services.length; i += 1) {
      var svc = services[i];
      if (isKnownStatus(svc.status)) counts[svc.status] += 1;
    }
    return counts;
  }

  /** 요약 배너 파생값 묶음 (디자인 §5.3). */
  function summarize(services) {
    var worst = deriveWorstStatus(services);
    return {
      status: worst,
      text: summaryText(worst),
      counts: countByStatus(services),
      total: services.length,
    };
  }

  /**
   * 요약 배너 서브라벨 문구 (디자인 §4.4/§5.3).
   * 예: "전체 서비스 4개 중 장애 1 · 저하 1 · 정상 2"
   */
  function summarySubline(services) {
    var c = countByStatus(services);
    return (
      "전체 서비스 " +
      services.length +
      "개 중 장애 " +
      c.outage +
      " · 저하 " +
      c.degraded +
      " · 정상 " +
      c.operational
    );
  }

  var api = {
    STATUS_OPERATIONAL: STATUS_OPERATIONAL,
    STATUS_DEGRADED: STATUS_DEGRADED,
    STATUS_OUTAGE: STATUS_OUTAGE,
    STATUS_LABELS: STATUS_LABELS,
    STATUS_ICONS: STATUS_ICONS,
    STATUS_SEVERITY: STATUS_SEVERITY,
    SUMMARY_TEXT: SUMMARY_TEXT,
    UNKNOWN_STATUS: UNKNOWN_STATUS,
    SERVICES: SERVICES,
    isKnownStatus: isKnownStatus,
    statusLabel: statusLabel,
    statusIcon: statusIcon,
    badgeAriaLabel: badgeAriaLabel,
    deriveWorstStatus: deriveWorstStatus,
    summaryText: summaryText,
    countByStatus: countByStatus,
    summarize: summarize,
    summarySubline: summarySubline,
  };

  // 브라우저(file:// 포함): 전역 StatusCard 로 노출. import/export·모듈 스크립트 없음.
  global.StatusCard = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
