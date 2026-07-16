// BF-894 · 세계시계 clock-3 — 지역별 시각 계산 순수 로직 (vanilla-static, file:// 안전)
// - DOM·네트워크 의존성 없음 → node:test 단위 테스트 가능(전역 Clock3 노출).
// - 계약 SSOT: docs/planning/clock-3-BF-891.md (§3 REGIONS, §4 Intl, §5 표시 규칙, §6 tick)
// - 디자인: docs/design/clock-3-BF-891.md (§5 컴포넌트, §6 dev 가이드)
//
// 데이터 원천은 new Date() + Intl.DateTimeFormat 둘뿐. fetch/XHR/외부 API 0건(§4.1).
// ESM import/export·<script type="module"> 미사용 — 전역 Clock3 로 노출해 file:// 에서
// <script src> 로 안전 로드(tech-stack vanilla-static).
(function (global) {
  "use strict";

  // 표시 순서 = 배열 순서: 서울(기준) → 뉴욕 → 런던 (planner §3.1/§3.3)
  var REGIONS = [
    { id: "seoul", label: "서울", timeZone: "Asia/Seoul" },
    { id: "newyork", label: "뉴욕", timeZone: "America/New_York" },
    { id: "london", label: "런던", timeZone: "Europe/London" },
  ];

  // locale 을 명시 고정 — 생략 시 실행 환경 기본 로케일에 의존(비결정론). (planner §4.3)
  var LOCALE = "ko-KR";

  /**
   * 지역 timeZone 에 대한 Intl.DateTimeFormat 포매터 생성. (planner §4.3)
   * 24시간 고정(hour12:false), 날짜/요일/시각 파트를 2자리로 요청.
   * @param {string} timeZone IANA timezone id
   * @returns {Intl.DateTimeFormat}
   */
  function createFormatter(timeZone) {
    return new Intl.DateTimeFormat(LOCALE, {
      timeZone: timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  /**
   * REGIONS 순서대로 포매터를 1회 생성해 재사용용 배열로 반환. (planner §6.3)
   * @returns {Array<{id:string,label:string,timeZone:string,formatter:Intl.DateTimeFormat}>}
   */
  function createRegionFormatters() {
    return REGIONS.map(function (region) {
      return {
        id: region.id,
        label: region.label,
        timeZone: region.timeZone,
        formatter: createFormatter(region.timeZone),
      };
    });
  }

  /**
   * formatToParts() 결과 배열을 type→value 맵으로 변환. (planner §4.4)
   * @param {Array<{type:string,value:string}>} parts
   * @returns {Record<string,string>}
   */
  function partsToMap(parts) {
    var map = {};
    for (var i = 0; i < parts.length; i++) {
      map[parts[i].type] = parts[i].value;
    }
    return map;
  }

  /**
   * 포매터 + 단일 Date 로 한 지역의 표시 값을 조립. (planner §5.1, §6.2)
   * 고정 템플릿으로 직접 조립 — 로케일 기본 포맷 문자열에 의존하지 않음(§4.4).
   * @param {Intl.DateTimeFormat} formatter
   * @param {Date} date 매 tick 1회만 생성된 단일 Date 인스턴스(§6.2)
   * @returns {{date:string, hh:string, mm:string, ss:string}}
   */
  function formatWith(formatter, date) {
    var m = partsToMap(formatter.formatToParts(date));
    // 일부 엔진은 자정에 hour12:false 를 "24" 로 반환 — 00 으로 정규화(방어).
    var hh = m.hour === "24" ? "00" : m.hour;
    return {
      date: m.year + "-" + m.month + "-" + m.day + " (" + m.weekday + ")",
      hh: hh,
      mm: m.minute,
      ss: m.second,
    };
  }

  var api = {
    REGIONS: REGIONS,
    LOCALE: LOCALE,
    createFormatter: createFormatter,
    createRegionFormatters: createRegionFormatters,
    partsToMap: partsToMap,
    formatWith: formatWith,
  };

  // 브라우저(file:// 포함): 전역 Clock3 로 노출. import/export·모듈 스크립트 없음.
  global.Clock3 = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
