/* BF-906 · 진행률 체크리스트 검증 페이지(progress-5) — 정적 fixture
 * 디자인 SSOT: docs/design/progress-5-BF-905.md §6.1-3 (fixtures.js)
 *
 * 원본 incident-command/ 의 다중 체크리스트 중 단일 복구 체크리스트만 축소 재현.
 * done 2 / 미done 3 → 초기 진행률 40% (§1.3 초기 렌더).
 * completedAt: done=true 일 때만 KST ISO 문자열, done=false 면 null (§5.4 계약).
 * file:// CORS 안전 — import/export·fetch·외부 URL 0건. UMD: node=module.exports, 브라우저=globalThis.Progress5Fixtures.
 */
(function (global) {
  "use strict";

  /* 단일 복구 체크리스트 (원본 incident-command/fixtures.js 항목 형태 승계) */
  var CHECKLIST = [
    { id: "chk-p5-1", text: "결제 게이트웨이 사이드카 재시작", done: true, completedAt: "2026-07-16T02:20:00+09:00" },
    { id: "chk-p5-2", text: "PG사 상태 페이지 확인", done: true, completedAt: "2026-07-16T02:32:00+09:00" },
    { id: "chk-p5-3", text: "재시도 큐 우회 라우팅 활성화", done: false, completedAt: null },
    { id: "chk-p5-4", text: "결제 실패 고객 목록 집계", done: false, completedAt: null },
    { id: "chk-p5-5", text: "사용자 공지 문구 게시", done: false, completedAt: null }
  ];

  /* 호출부가 원본 배열을 mutate 하지 않도록 매번 새 배열/새 객체 복제본 반환 */
  function getChecklist() {
    return CHECKLIST.map(function (item) {
      return { id: item.id, text: item.text, done: item.done, completedAt: item.completedAt };
    });
  }

  var api = { getChecklist: getChecklist };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Progress5Fixtures = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
