/* number-guess/game.js — 숫자 맞추기 게임 로직 + DOM 인터랙션
 * BF-786 · docs/plan/number-guess-BF-783.md §5 · docs/design/number-guess-BF-783.md §7.3
 * UMD 패턴 — 브라우저: globalThis.NumberGuessGame (DOM 자동 초기화)
 *           Node: module.exports (순수 함수만 테스트)
 * file:// CORS 안전 — 외부 CDN·fetch·import/export 0건
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    // Node (단위 테스트) — 순수 함수만 사용, DOM 초기화 안 함
    module.exports = api;
  }
  if (root) {
    root.NumberGuessGame = api;
    // 브라우저에서만 DOM 와이어링
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", api.init);
      } else {
        api.init();
      }
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MIN = 1;
  var MAX = 100;

  var MSG = {
    idle: "1부터 100 사이의 숫자를 입력하세요",
    low: "더 큰 숫자입니다 ⬆",
    high: "더 작은 숫자입니다 ⬇",
    error: "1~100 사이의 정수를 입력하세요",
  };

  /* ─── 순수 함수: 판정 (명세 §5) ─── */
  /**
   * 숫자 추리 판정 순수 함수
   * @param {number} secret - 비밀 숫자 (1~100 정수)
   * @param {number} guess  - 입력 숫자 (1~100 정수)
   * @returns {{ result: 'too-low' | 'too-high' | 'correct' }}
   */
  function evaluateGuess(secret, guess) {
    if (guess < secret) return { result: "too-low" };
    if (guess > secret) return { result: "too-high" };
    return { result: "correct" };
  }

  /* ─── 순수 함수: 입력 유효성 검사 (명세 §2.2 / EC-02~06) ─── */
  /**
   * 입력값을 검증하고 정수로 변환한다.
   * @param {*} raw - input.value (문자열) 또는 임의 입력
   * @returns {{ valid: true, value: number } | { valid: false, error: string }}
   */
  function validateGuess(raw) {
    if (raw === null || raw === undefined) {
      return { valid: false, error: MSG.error };
    }
    var s = String(raw).trim();
    if (s === "") {
      return { valid: false, error: MSG.error };
    }
    var n = Number(s);
    if (!Number.isInteger(n)) {
      return { valid: false, error: MSG.error };
    }
    if (n < MIN || n > MAX) {
      return { valid: false, error: MSG.error };
    }
    return { valid: true, value: n };
  }

  /* ─── 난수 (부작용 — 순수 함수와 분리) ─── */
  function generateSecret() {
    return Math.floor(Math.random() * MAX) + MIN;
  }

  /* ─── DOM 인터랙션 (브라우저 전용) ─── */
  function init() {
    var gameEl = document.getElementById("game");
    var inputEl = document.getElementById("guess-input");
    var submitEl = document.getElementById("submit-btn");
    var restartEl = document.getElementById("restart-btn");
    var messageEl = document.getElementById("message");
    var countEl = document.getElementById("attempt-count");

    if (!gameEl || !inputEl || !submitEl || !restartEl || !messageEl || !countEl) {
      return; // 마크업 누락 시 안전 종료
    }

    var secret = generateSecret();
    var attempts = 0;
    var won = false;

    function setMessage(text, modifier) {
      messageEl.textContent = text;
      messageEl.className = "message" + (modifier ? " " + modifier : "");
    }

    function setState(state) {
      gameEl.setAttribute("data-state", state);
    }

    function reset() {
      secret = generateSecret();
      attempts = 0;
      won = false;
      countEl.textContent = "0";
      inputEl.value = "";
      inputEl.disabled = false;
      submitEl.disabled = false;
      setMessage(MSG.idle, "");
      setState("idle");
      inputEl.focus();
    }

    function submit() {
      if (won) return;
      var check = validateGuess(inputEl.value);
      if (!check.valid) {
        // 입력 내용 유지, 카운터 증가 없음 (명세 AC-06)
        setMessage(check.error, "is-error");
        setState("error");
        return;
      }
      attempts += 1;
      countEl.textContent = String(attempts);
      var outcome = evaluateGuess(secret, check.value).result;
      if (outcome === "correct") {
        won = true;
        setMessage("🎉 정답입니다! " + attempts + "번 만에 맞혔어요", "is-won");
        setState("won");
        inputEl.disabled = true;
        submitEl.disabled = true;
        restartEl.focus();
      } else if (outcome === "too-low") {
        setMessage(MSG.low, "is-low");
        setState("playing");
        inputEl.select();
      } else {
        setMessage(MSG.high, "is-high");
        setState("playing");
        inputEl.select();
      }
    }

    submitEl.addEventListener("click", submit);
    restartEl.addEventListener("click", reset);

    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    });

    // 정답 후 재시작 버튼 포커스 상태에서 Enter → 재시작 (EC-07)
    restartEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        reset();
      }
    });

    // 초기 상태
    reset();
  }

  return {
    MIN: MIN,
    MAX: MAX,
    evaluateGuess: evaluateGuess,
    validateGuess: validateGuess,
    generateSecret: generateSecret,
    init: init,
  };
});
