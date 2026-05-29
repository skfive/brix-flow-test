/* baseball/logic.js — 숫자 야구 순수 로직
 * BF-654 · docs/design/baseball-BF-651.md §8.5
 * UMD 패턴 — 브라우저: globalThis.BaseballLogic, Node: module.exports
 * file:// CORS 안전 — 외부 CDN·fetch 0건
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.BaseballLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DIGITS = 4;
  var MAX_TRIES = 9;

  /* ─── 비밀번호 생성 (명세 §8.5) ─── */
  /**
   * 중복 없는 4자리 숫자 배열 생성
   * @returns {number[]} 길이 4, 각 원소 0~9, 중복 없음
   */
  function generateSecret() {
    var digits = [];
    while (digits.length < DIGITS) {
      var d = Math.floor(Math.random() * 10);
      if (digits.indexOf(d) === -1) digits.push(d);
    }
    return digits;
  }

  /* ─── 판정 (명세 §8.5) ─── */
  /**
   * 스트라이크 / 볼 계산
   * @param {number[]} secret - 4자리 정답 배열
   * @param {number[]} guess  - 4자리 추리 배열
   * @returns {{strike: number, ball: number}}
   */
  function judge(secret, guess) {
    var s = 0, b = 0;
    for (var i = 0; i < DIGITS; i++) {
      if (guess[i] === secret[i]) {
        s++;
      } else if (secret.indexOf(guess[i]) !== -1) {
        b++;
      }
    }
    return { strike: s, ball: b };
  }

  /* ─── 입력 유효성 검사 ─── */
  /**
   * 4자리 추리 입력의 유효성을 검사한다.
   * @param {Array} digits - 4개 칸의 값 (number 또는 null/undefined)
   * @returns {{valid: boolean, errorMessage: string}}
   */
  function validateGuess(digits) {
    /* 배열 길이 검사 */
    if (!Array.isArray(digits) || digits.length !== DIGITS) {
      return { valid: false, errorMessage: "4자리를 모두 입력해주세요" };
    }
    /* 각 자리 숫자 범위 검사 */
    for (var i = 0; i < DIGITS; i++) {
      var raw = digits[i];
      if (raw === null || raw === undefined) {
        return { valid: false, errorMessage: "4자리를 모두 입력해주세요" };
      }
      var n = Number(raw);
      if (isNaN(n) || n < 0 || n > 9 || Math.floor(n) !== n) {
        return { valid: false, errorMessage: "0~9 숫자만 입력 가능합니다" };
      }
    }
    /* 중복 검사 */
    var seen = {};
    for (var j = 0; j < DIGITS; j++) {
      var d = Number(digits[j]);
      if (seen[d]) {
        return { valid: false, errorMessage: "중복된 숫자가 있습니다" };
      }
      seen[d] = true;
    }
    return { valid: true, errorMessage: "" };
  }

  return {
    DIGITS: DIGITS,
    MAX_TRIES: MAX_TRIES,
    generateSecret: generateSecret,
    judge: judge,
    validateGuess: validateGuess,
  };
});
