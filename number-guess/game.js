/* number-guess/game.js — 숫자 맞히기 게임: judge 순수함수 + DOM 오케스트레이션 (BF-1614)
 * 계약: docs/plans/number-guess-plan-BF-1612.md §3·§4·§5·§6 (frozen UI 계약)
 * vanilla-static · 외부 의존성 0 · file:// 안전 classic script + CommonJS export 가드
 *
 * 브라우저: <script src="game.js"> → DOM 자동 초기화 (globalThis.NumberGuessGame)
 * Node(단위 테스트): module.exports.judge — game.test.js 가 require 로 로드. DOM 초기화 안 함.
 *
 * 판정 순수함수 judge(guess, answer) 는 별도 파일 없이 본 파일에서 export 한다(§2).
 * 레거시 evaluateGuess/validateGuess export 는 이전 사이클 테스트(tests/evaluateGuess.test.mjs)
 * 호환을 위해 유지한다 — 신규 계약 판정은 judge 를 사용한다.
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

  /* frozen 상태 텍스트(§3.4·§6) — 상태명을 화면 텍스트로 노출(색상 단독 구분 금지) */
  var FEEDBACK = {
    idle: "1부터 100 사이의 숫자를 입력하세요",
    higher: "더 높게! 정답은 더 큰 수예요",
    lower: "더 낮게! 정답은 더 작은 수예요",
    invalid: "1부터 100 사이의 정수를 입력하세요",
  };

  function winText(attempts) {
    return "정답입니다! " + attempts + "번 만에 맞혔습니다";
  }

  /**
   * 추측을 판정하는 순수함수(§4) — 부수효과·입력검증 없음.
   * 이미 정규화된 정수 두 개를 받아 상태 문자열만 반환한다.
   *
   * @param {number} guess  - 플레이어가 입력한 정수 추측
   * @param {number} answer - 비밀 정답 정수
   * @returns {'higher'|'lower'|'win'}
   *   - 'higher' : guess < answer (정답이 더 높다 → 더 높게)
   *   - 'lower'  : guess > answer (정답이 더 낮다 → 더 낮게)
   *   - 'win'    : guess === answer (정답)
   */
  function judge(guess, answer) {
    if (guess < answer) return "higher";
    if (guess > answer) return "lower";
    return "win";
  }

  /* 난수 정답(1~100 정수) 생성 — 부작용, 순수 판정과 분리 */
  function generateAnswer() {
    return Math.floor(Math.random() * MAX) + MIN;
  }

  /* localStorage best score 읽기/쓰기 — 접근 불가(비활성/quota) 환경 안전 가드(§5) */
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
      /* localStorage 사용 불가 — best score 는 세션 한정, 게임 진행은 유지(§5) */
    }
  }

  /* ─── DOM 인터랙션 (브라우저 전용) ─── */
  function init() {
    var inputEl = document.getElementById("guess-input");
    var submitEl = document.getElementById("submit-btn");
    var feedbackEl = document.getElementById("feedback");
    var attemptsEl = document.getElementById("attempts");
    var bestEl = document.getElementById("best-score");
    var newGameEl = document.getElementById("new-game-btn");

    if (!inputEl || !submitEl || !feedbackEl || !attemptsEl || !bestEl || !newGameEl) {
      return; // 마크업 누락 시 안전 종료
    }

    var answer = generateAnswer();
    var attempts = 0;
    var won = false;
    var bestScore = readBestScore(); // best score 는 새 게임에도 유지(§5)

    function renderBest() {
      bestEl.textContent = bestScore === null ? "기록 없음" : String(bestScore);
    }

    function setFeedback(state, text) {
      feedbackEl.textContent = text;
      feedbackEl.setAttribute("data-state", state);
    }

    // 새 게임: reset 전이 → 정답 재생성, 상태·시도·피드백 초기화, control 재활성화, best 유지(§3.4·§5·§6)
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
      if (won) {
        // 승리 후 새 게임 전까지 승리 상태 유지(§8)
        return;
      }
      var raw = String(inputEl.value).trim();
      var n = Number(raw);

      // 입력 검증은 호출부 책임(§4) — 실패 시 시도 미증가, idle 안내로 되돌리고 control 유지(§8)
      if (raw === "" || !Number.isInteger(n) || n < MIN || n > MAX) {
        setFeedback("idle", FEEDBACK.invalid);
        inputEl.select();
        return;
      }

      attempts += 1;
      attemptsEl.textContent = String(attempts);

      var result = judge(n, answer); // 'higher' | 'lower' | 'win'

      if (result === "win") {
        won = true;
        setFeedback("win", winText(attempts));
        inputEl.disabled = true;
        submitEl.disabled = true;
        if (bestScore === null || attempts < bestScore) {
          bestScore = attempts;
          writeBestScore(bestScore);
        }
        renderBest();
        newGameEl.focus();
        return;
      }

      // higher / lower 힌트
      setFeedback(result, FEEDBACK[result]);
      inputEl.select();
    }

    // Enter 제출: form submit 이 Enter·버튼 클릭을 모두 처리(§3.5 Enter 지원)
    var formEl = inputEl.form;
    if (formEl) {
      formEl.addEventListener("submit", function (e) {
        e.preventDefault();
        submit();
      });
    } else {
      submitEl.addEventListener("click", submit);
      inputEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      });
    }

    newGameEl.addEventListener("click", reset);

    reset(); // 초기 idle 상태
  }

  /* ─── legacy 순수 함수 (tests/evaluateGuess.test.mjs, BF-786 호환 유지) ───
   * 신규 계약 판정은 judge() 를 사용한다. 아래는 이전 사이클 단위 테스트가
   * 참조하는 export 로, 신규 DOM 로직에서는 사용하지 않는다. */
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
    judge: judge,
    init: init,
    generateAnswer: generateAnswer,
    evaluateGuess: evaluateGuess,
    validateGuess: validateGuess,
  };
});
