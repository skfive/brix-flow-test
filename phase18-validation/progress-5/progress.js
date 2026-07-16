/* BF-906 · 진행률 체크리스트 검증 페이지(progress-5) — 순수 로직
 * 디자인 SSOT: docs/design/progress-5-BF-905.md §6.1-4 (progress.js)
 *
 * 원본 incident-command/command.js 의 calculateChecklistProgress(§9.4) +
 * toggleChecklistItem(§9.5) 산식을 그대로 재작성(command.js 는 로드 시 원본 전용
 * DOM 을 전제로 init() 자동 실행하므로 import 금지 — 명세 §5/§6.1-4).
 * file:// CORS 안전(import/export·fetch·외부 URL 0건). UMD: node=module.exports, 브라우저=globalThis.Progress5Logic.
 */
(function (global) {
  "use strict";

  /* §9.4 / §7.1 — 진행률 계산 (percent 는 반올림 정수) */
  function calculateProgress(checklist) {
    if (!Array.isArray(checklist)) {
      return { total: 0, done: 0, percent: 0 };
    }
    var total = checklist.length;
    var done = checklist.filter(function (item) {
      return Boolean(item) && item.done === true;
    }).length;
    var percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total: total, done: done, percent: percent };
  }

  /**
   * §9.5 — itemId 항목의 done 토글 + completedAt 일관성 유지. 새 배열 반환(원본 mutate 없음).
   * done=true ⟺ completedAt=nowIso, done=false ⟺ completedAt=null.
   * @throws {TypeError} itemId 가 checklist 에 없으면
   */
  function toggleItem(checklist, itemId, nowIso) {
    if (!Array.isArray(checklist)) {
      throw new TypeError("checklist 는 배열이어야 합니다.");
    }
    var found = checklist.some(function (item) {
      return Boolean(item) && item.id === itemId;
    });
    if (!found) {
      throw new TypeError("체크리스트에 존재하지 않는 itemId 입니다: " + String(itemId));
    }
    return checklist.map(function (item) {
      if (item.id !== itemId) {
        return { id: item.id, text: item.text, done: item.done, completedAt: item.completedAt };
      }
      var nextDone = !item.done;
      return {
        id: item.id,
        text: item.text,
        done: nextDone,
        completedAt: nextDone ? nowIso : null
      };
    });
  }

  /* 완료 시각 표기 — 원본 command.js formatShortDateTime 동일(문자열 슬라이스만, new Date() 파싱 금지) */
  function formatShortDateTime(iso) {
    return iso.slice(5, 10) + " " + iso.slice(11, 16); // 07-16 02:20
  }

  var api = {
    calculateProgress: calculateProgress,
    toggleItem: toggleItem,
    formatShortDateTime: formatShortDateTime
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Progress5Logic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
