/* delivery-exceptions-canary/domain.js — 상태 필터·집계·메모 검증·시각 포맷 순수 함수
 * BF-1033 · 기획 §4(상태 필터)·§6.2(입력 규칙)·§5.2(D7/D8) / 디자인 §5.1·§5.4·§6.3
 * UMD 패턴 — 브라우저: globalThis.DxcDomain / Node: module.exports
 * 순수 함수만 — DOM·localStorage·네트워크·Date.now()/Math.random() 0건 (단위 테스트 대상)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.DxcDomain = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var STATUS_ENUM = ["open", "investigating", "on_hold", "resolved"];
  var MEMO_MAX = 300; // 기획 §6.2 — trim 후 최대 300자

  /**
   * status 필터 적용 — 클라이언트 사이드 부분집합 뷰(기획 §4.2).
   * 원본 배열/순서를 변경하지 않는다(§3.3 정의 순서 유지).
   * @param {Array} exceptions
   * @param {'all'|'open'|'investigating'|'on_hold'|'resolved'} filter
   * @returns {Array} 필터 결과(알 수 없는 값이면 빈 배열 — EC-02 방어)
   */
  function filterByStatus(exceptions, filter) {
    var list = exceptions || [];
    if (filter === "all") {
      return list.slice();
    }
    if (STATUS_ENUM.indexOf(filter) === -1) {
      return [];
    }
    return list.filter(function (e) {
      return e.status === filter;
    });
  }

  /**
   * 필터 탭 건수(all + 상태별) — 디자인 §5.1 필터 탭 count 뱃지.
   * @returns {{all:number, open:number, investigating:number, on_hold:number, resolved:number}}
   */
  function countByStatus(exceptions) {
    var list = exceptions || [];
    var c = { all: list.length, open: 0, investigating: 0, on_hold: 0, resolved: 0 };
    list.forEach(function (e) {
      if (Object.prototype.hasOwnProperty.call(c, e.status)) {
        c[e.status] += 1;
      }
    });
    return c;
  }

  /**
   * 헤더 집계 요약(총·미해결·해결) — 디자인 §6.3.
   * 미해결 = status !== 'resolved' 합(open+investigating+on_hold).
   * @returns {{total:number, unresolved:number, resolved:number}}
   */
  function summarize(exceptions) {
    var list = exceptions || [];
    var resolved = list.filter(function (e) {
      return e.status === "resolved";
    }).length;
    return { total: list.length, resolved: resolved, unresolved: list.length - resolved };
  }

  /**
   * 해결 메모 입력 검증(기획 §6.2 / EC-05·EC-08).
   * - 공백/빈 문자열 → delete 액션(오류 아님, 메모 삭제)
   * - trim 후 1~300자 → save 액션
   * - trim 후 300자 초과 → reject 액션(저장 거부, 입력값 유지)
   * @param {string} rawText
   * @returns {{ok:boolean, action:'save'|'delete'|'reject', trimmed:string, length:number, error:(string|null)}}
   */
  function validateMemo(rawText) {
    var raw = typeof rawText === "string" ? rawText : "";
    var trimmed = raw.trim();
    var length = trimmed.length;
    if (length === 0) {
      return { ok: true, action: "delete", trimmed: "", length: 0, error: null };
    }
    if (length > MEMO_MAX) {
      return {
        ok: false,
        action: "reject",
        trimmed: raw, // 자르지 않고 입력값 유지(EC-05)
        length: length,
        error: "메모는 " + MEMO_MAX + "자 이하여야 합니다 (현재 " + length + "자)",
      };
    }
    return { ok: true, action: "save", trimmed: trimmed, length: length, error: null };
  }

  /**
   * ISO8601(+09:00) → 'YYYY-MM-DD HH:mm (KST)' 표시 포맷(기획 §5.2 D7/D8 / 디자인 §5.3).
   * fixture 는 모두 +09:00 KST 이므로 문자열에서 직접 추출(타임존 재계산 없음 — 결정적).
   * 형식 불명/빈 값은 안전 폴백(크래시 금지).
   * @param {string} iso
   * @returns {string}
   */
  function formatKst(iso) {
    if (typeof iso !== "string" || iso.length === 0) {
      return "";
    }
    var m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso);
    if (!m) {
      return iso;
    }
    return m[1] + " " + m[2] + " (KST)";
  }

  return {
    MEMO_MAX: MEMO_MAX,
    STATUS_ENUM: STATUS_ENUM,
    filterByStatus: filterByStatus,
    countByStatus: countByStatus,
    summarize: summarize,
    validateMemo: validateMemo,
    formatKst: formatKst,
  };
});
