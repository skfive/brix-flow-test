/* rps/judge.js — 가위바위보 승패 판정 순수함수
 * BF-792 · docs/design/rps-BF-789.md §5.3, AC-03
 * UMD 패턴 — 브라우저: globalThis.RpsJudge, Node: module.exports
 * file:// CORS 안전 — import/export/fetch/CDN 0건
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.RpsJudge = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** 유효 선택지 — 가위 / 바위 / 보 */
  var CHOICES = ["scissors", "rock", "paper"];

  /**
   * 플레이어와 CPU 선택을 비교해 플레이어 기준 결과를 반환한다 (순수함수).
   * 판정 규칙: 가위>보, 바위>가위, 보>바위. 같으면 무승부.
   * @param {('scissors'|'rock'|'paper')} player - 플레이어 선택
   * @param {('scissors'|'rock'|'paper')} cpu    - CPU 선택
   * @returns {('win'|'lose'|'draw')} 플레이어 기준 판정 결과
   */
  function judge(player, cpu) {
    if (player === cpu) return "draw";
    if (
      (player === "scissors" && cpu === "paper") ||
      (player === "rock" && cpu === "scissors") ||
      (player === "paper" && cpu === "rock")
    ) {
      return "win";
    }
    return "lose";
  }

  return { judge: judge, CHOICES: CHOICES };
});
