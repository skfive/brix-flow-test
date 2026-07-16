/* BF-900 · 주사위 통계 검증 페이지(dice-4) — 순수 로직
 * 디자인 SSOT: docs/design/dice-4-BF-897.md §6.4 (dice/main.js 동일 산식 복제)
 *
 * 원본 dice/main.js 는 IIFE 클로저로 rollOne/computeStats 를 export 하지 않으므로
 * import 불가 — 동일 산식을 재작성(명세 §6.4). file:// CORS 안전(import/export·fetch 0건).
 * UMD 패턴: node --test 는 module.exports, 브라우저는 globalThis.Dice4Stats 로 노출.
 */
(function (global) {
  "use strict";

  /* 1~6 정수 (dice/main.js 동일 산식) */
  function rollOne() {
    return 1 + Math.floor(Math.random() * 6);
  }

  /* 합계/평균/최대 — 평균 표시 변환(toFixed(1))은 호출부(main.js)가 처리 */
  function computeStats(rolls) {
    var sum = 0;
    var max = rolls[0];
    for (var i = 0; i < rolls.length; i += 1) {
      sum += rolls[i];
      if (rolls[i] > max) max = rolls[i];
    }
    return { sum: sum, avg: sum / rolls.length, max: max };
  }

  var api = { rollOne: rollOne, computeStats: computeStats };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Dice4Stats = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
