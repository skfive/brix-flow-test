/* number-guess/judge.js — 숫자 맞히기 판정 순수 함수 (DOM 비의존)
 * 계약: docs/plans/number-guess-BF-1588.md §4·§6 (frozen UI 계약)
 * vanilla-static · 외부 의존성 0 · file:// classic script + CommonJS export 가드
 *
 * 브라우저: <script src="judge.js"> → globalThis.NumberGuessJudge
 * Node(단위 테스트): module.exports (judge.test.js 에서 require)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.NumberGuessJudge = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MIN = 1;
  var MAX = 100;

  /**
   * 추측값을 판정해 상태명을 반환하는 순수 함수.
   * DOM·전역 상태·부작용에 의존하지 않는다.
   *
   * @param {number} guess  - 사용자가 입력한 추측(정수 1~100 기대)
   * @param {number} answer - 현재 라운드 정답(정수 1~100)
   * @returns {'hint-higher'|'hint-lower'|'won'|'invalid'} 상태명
   *   - 'invalid'      : guess 가 1~100 범위의 정수가 아님
   *   - 'hint-higher'  : guess < answer (더 큰 수를 입력해야 함)
   *   - 'hint-lower'   : guess > answer (더 작은 수를 입력해야 함)
   *   - 'won'          : guess === answer (정답)
   */
  function judge(guess, answer) {
    if (!Number.isInteger(guess) || guess < MIN || guess > MAX) {
      return "invalid";
    }
    if (guess < answer) return "hint-higher";
    if (guess > answer) return "hint-lower";
    return "won";
  }

  return {
    MIN: MIN,
    MAX: MAX,
    judge: judge,
  };
});
