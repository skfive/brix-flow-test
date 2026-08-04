// game.js — 숫자 맞히기 게임 오케스트레이션 (docs/plans/number-guess-plan-BF-1594.md §5·§6, frozen 계약)
//
// judge 는 judge.js 가 globalThis 에 노출한 단일 순수함수를 그대로 사용한다(중복 구현 금지).
// 브라우저에서 plain <script defer> 로 로드되므로 import/export 를 쓰지 않는다.
(function () {
  'use strict';

  var BEST_KEY = 'number-guess:best-score';
  var MIN = 1;
  var MAX = 100;

  // localStorage 접근 실패(비활성/quota)해도 게임 진행을 막지 않는다 — best score 는 세션 한정으로 폴백.
  var memoryBest = null;

  function getBest() {
    try {
      var raw = window.localStorage.getItem(BEST_KEY);
      if (raw === null) return memoryBest;
      var n = Number(raw);
      return Number.isInteger(n) ? n : memoryBest;
    } catch (e) {
      return memoryBest;
    }
  }

  function setBest(n) {
    memoryBest = n;
    try {
      window.localStorage.setItem(BEST_KEY, String(n));
    } catch (e) {
      // 저장 실패 시에도 memoryBest 로 세션 내 표시는 유지된다.
    }
  }

  function randomAnswer() {
    return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('guess-input');
    var submit = document.getElementById('guess-submit');
    var feedback = document.getElementById('guess-feedback');
    var attemptCount = document.getElementById('attempt-count');
    var bestScore = document.getElementById('best-score');
    var newGame = document.getElementById('new-game');

    var answer = randomAnswer();
    var attempts = 0;
    var status = 'idle';

    function renderAttempts() {
      attemptCount.textContent = '시도: ' + attempts + '회';
    }

    function renderBest() {
      var b = getBest();
      bestScore.textContent = b === null ? '최고 기록: 기록 없음' : '최고 기록: ' + b + '회';
    }

    // 상태와 피드백 텍스트를 함께 갱신한다. 색상만이 아니라 상태명을 화면 텍스트로 노출(접근성).
    function setState(next, message) {
      status = next;
      feedback.dataset.state = next;
      feedback.textContent = message;
    }

    function reset() {
      answer = randomAnswer();
      attempts = 0;
      input.value = '';
      input.disabled = false;
      submit.disabled = false;
      renderAttempts();
      setState('idle', '1부터 100 사이의 숫자를 추측해 보세요.');
      input.focus();
      // best score 는 유지(§5) — renderBest 는 값 변화 없이 현재 기록을 계속 표시.
    }

    function handleSubmit() {
      // win 이후에는 새 게임 전까지 승리 상태를 유지한다(재판정 안내, 시도 미증가).
      if (status === 'win') {
        setState('win', '이미 정답을 맞혔습니다! 새 게임을 눌러 다시 시작하세요.');
        return;
      }

      var raw = input.value.trim();
      if (raw === '') {
        setState('idle', '1부터 100 사이의 정수를 입력하세요.');
        return;
      }

      var guess = Number(raw);
      if (!Number.isInteger(guess)) {
        setState('idle', '정수만 입력할 수 있습니다. 1부터 100 사이의 정수를 입력하세요.');
        return;
      }
      if (guess < MIN || guess > MAX) {
        setState('idle', '1부터 100 사이의 숫자만 입력할 수 있습니다.');
        return;
      }

      attempts += 1;
      renderAttempts();

      var result = judge(guess, answer);
      if (result === 'too-high') {
        setState('too-high', '더 낮게! 정답은 ' + guess + '보다 작습니다.');
      } else if (result === 'too-low') {
        setState('too-low', '더 높게! 정답은 ' + guess + '보다 큽니다.');
      } else {
        setState('win', '정답입니다! ' + attempts + '번 만에 맞혔습니다.');
        var best = getBest();
        if (best === null || attempts < best) {
          setBest(attempts);
        }
        renderBest();
        // 승리 확정 — 새 게임 전까지 주 실행 control 비활성화.
        input.disabled = true;
        submit.disabled = true;
      }
    }

    submit.addEventListener('click', handleSubmit);
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSubmit();
      }
    });
    newGame.addEventListener('click', reset);

    // 초기 렌더
    renderAttempts();
    renderBest();
    setState('idle', '1부터 100 사이의 숫자를 추측해 보세요.');
  });
})();
