/* number-guess/game.js — 숫자 맞히기 DOM 로직 + 상태·localStorage 처리
 * 계약: docs/plans/number-guess-BF-1588.md §3·§4·§6·§10 (frozen UI 계약)
 * 판정은 judge.js 순수 함수(judge)에 위임하고, game.js 는 DOM 값 읽기·렌더링·상태만 담당.
 * vanilla-static · 외부 의존성 0 · file:// classic script (judge.js 다음에 로드)
 *
 * 브라우저: <script src="game.js"> → DOM 자동 초기화 (globalThis.NumberGuessGame)
 * Node(단위 테스트): module.exports — evaluateGuess/validateGuess legacy 호환 export
 *   (tests/evaluateGuess.test.mjs, BF-786) 유지. DOM 은 초기화하지 않음.
 */
(function (root, factory) {
  "use strict";
  var api = factory(root);
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root && typeof document !== "undefined") {
    root.NumberGuessGame = api;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", api.init);
    } else {
      api.init();
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var MIN = 1;
  var MAX = 100;
  var BEST_SCORE_KEY = "number-guess:best-score";

  /* frozen 상태 텍스트 (§4) — N 은 실제 시도 횟수로 치환 */
  var FEEDBACK = {
    idle: "1부터 100 사이의 숫자를 입력하세요",
    "hint-higher": "더 큰 수를 입력하세요",
    "hint-lower": "더 작은 수를 입력하세요",
    invalid: "1부터 100 사이의 숫자를 입력하세요",
  };

  function wonText(attempts) {
    return "정답입니다! " + attempts + "번 만에 맞혔습니다";
  }

  /* judge 순수 함수 확보 — 브라우저는 전역, Node 는 require */
  function resolveJudge() {
    if (root && root.NumberGuessJudge && root.NumberGuessJudge.judge) {
      return root.NumberGuessJudge.judge;
    }
    if (typeof require === "function") {
      return require("./judge.js").judge;
    }
    return null;
  }

  /* 난수 정답 (부작용 — 순수 판정과 분리) */
  function generateAnswer() {
    return Math.floor(Math.random() * MAX) + MIN;
  }

  /* localStorage best score 읽기/쓰기 (접근 불가 환경 안전 가드) */
  function readBestScore() {
    try {
      var raw = root && root.localStorage && root.localStorage.getItem(BEST_SCORE_KEY);
      var n = Number(raw);
      return Number.isInteger(n) && n > 0 ? n : null;
    } catch (e) {
      return null;
    }
  }

  function writeBestScore(value) {
    try {
      if (root && root.localStorage) {
        root.localStorage.setItem(BEST_SCORE_KEY, String(value));
      }
    } catch (e) {
      /* localStorage 사용 불가(file:// 일부 환경) — 무시 */
    }
  }

  /* ─── DOM 인터랙션 (브라우저 전용) ─── */
  function init() {
    var judge = resolveJudge();
    var feedbackEl = document.getElementById("guess-feedback");
    var inputEl = document.getElementById("guess-input");
    var submitEl = document.getElementById("guess-submit");
    var formEl = document.getElementById("guess-form");
    var attemptsEl = document.getElementById("guess-attempts");
    var bestEl = document.getElementById("best-score");
    var newGameEl = document.getElementById("new-game");

    if (!judge || !feedbackEl || !inputEl || !submitEl || !attemptsEl || !bestEl || !newGameEl) {
      return; // 마크업/judge 누락 시 안전 종료
    }

    var answer = generateAnswer();
    var attempts = 0;
    var won = false;
    var bestScore = readBestScore();

    function renderBest() {
      bestEl.textContent = bestScore === null ? "—" : String(bestScore);
    }

    function setFeedback(state, text) {
      feedbackEl.textContent = text;
      feedbackEl.setAttribute("data-state", state);
    }

    function reset() {
      answer = generateAnswer();
      attempts = 0;
      won = false;
      attemptsEl.textContent = "0";
      inputEl.value = "";
      inputEl.disabled = false;
      submitEl.disabled = false;
      setFeedback("idle", FEEDBACK.idle);
      renderBest();
      inputEl.focus();
    }

    function submit() {
      if (won) return; // 정답 후 new-game 전까지 상태 유지 (§11)
      var guess = Number(String(inputEl.value).trim());
      var state = judge(guess, answer);

      if (state === "invalid") {
        setFeedback("invalid", FEEDBACK.invalid); // 시도 횟수 미증가 (AC-5)
        return;
      }

      attempts += 1;
      attemptsEl.textContent = String(attempts);

      if (state === "won") {
        won = true;
        setFeedback("won", wonText(attempts));
        inputEl.disabled = true;
        submitEl.disabled = true;
        if (bestScore === null || attempts < bestScore) {
          bestScore = attempts;
          writeBestScore(bestScore);
          renderBest();
        }
        newGameEl.focus();
        return;
      }

      // hint-higher / hint-lower
      setFeedback(state, FEEDBACK[state]);
      inputEl.select();
    }

    if (formEl) {
      // Enter 키 제출 (form submit) + 버튼 클릭 모두 처리
      formEl.addEventListener("submit", function (e) {
        e.preventDefault();
        submit();
      });
    } else {
      submitEl.addEventListener("click", submit);
    }

    newGameEl.addEventListener("click", reset);

    // 초기 상태
    reset();
  }

  /* ─── legacy 순수 함수 (tests/evaluateGuess.test.mjs, BF-786 호환) ───
   * 신규 계약 판정은 judge.js 의 judge() 를 사용한다. 아래는 이전 사이클
   * 단위 테스트가 참조하는 export 로, DOM 로직에서는 사용하지 않는다. */
  function evaluateGuess(secret, guess) {
    if (guess < secret) return { result: "too-low" };
    if (guess > secret) return { result: "too-high" };
    return { result: "correct" };
  }

  function validateGuess(raw) {
    var invalid = { valid: false, error: FEEDBACK.invalid };
    if (raw === null || raw === undefined) return invalid;
    var s = String(raw).trim();
    if (s === "") return invalid;
    var n = Number(s);
    if (!Number.isInteger(n) || n < MIN || n > MAX) return invalid;
    return { valid: true, value: n };
  }

  return {
    MIN: MIN,
    MAX: MAX,
    init: init,
    generateAnswer: generateAnswer,
    evaluateGuess: evaluateGuess,
    validateGuess: validateGuess,
  };
});
