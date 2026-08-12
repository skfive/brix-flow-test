// typing/typing.js
// BF-2031: 타이핑 속도 테스트 — 순수 산식 함수 + DOM 바인딩
//
// 외부 의존성 0. file:// 로 <script> classic 태그 로드(브라우저)와
// `node --test`(ESM 부수효과 import) 양쪽에서 동일하게 동작해야 하므로
// import/export 문을 쓰지 않고 IIFE 로 globalThis.Typing 에 노출한다.
(function (global) {
  'use strict';

  var TIMER_DURATION_MS = 60000;

  var SENTENCES = [
    'The quick brown fox jumps over the lazy dog.',
    'Pack my box with five dozen liquor jugs.',
    'Sphinx of black quartz, judge my vow.',
    'The five boxing wizards jump quickly.',
    'Bright vixens jump; dozy fowl quack.'
  ];

  // ---- calcWpm(charCount, elapsedMs) — 정확히 일치한 문자 수 기준, 5글자 = 1단어 ----
  function calcWpm(charCount, elapsedMs) {
    if (!elapsedMs) return 0;
    var words = charCount / 5;
    var minutes = elapsedMs / 60000;
    var wpm = Math.round(words / minutes);
    return wpm < 0 ? 0 : wpm;
  }

  // ---- 같은 인덱스 비교로 일치 문자 수를 센다 (오버타이핑 구간은 비교 대상 밖) ----
  function countCorrectChars(typed, target) {
    var len = Math.min(typed.length, target.length);
    var correct = 0;
    for (var i = 0; i < len; i++) {
      if (typed[i] === target[i]) correct++;
    }
    return correct;
  }

  // ---- calcAccuracy(typed, target) — typed.length 기준, 오버타이핑도 오타로 포함 ----
  function calcAccuracy(typed, target) {
    if (typed.length === 0) return 100;
    var correct = countCorrectChars(typed, target);
    return Math.round((correct / typed.length) * 100);
  }

  // ---- calcTypoCount(typed, target) — 불일치 문자 수 총합(오버타이핑 포함) ----
  function calcTypoCount(typed, target) {
    if (typed.length === 0) return 0;
    var correct = countCorrectChars(typed, target);
    return typed.length - correct;
  }

  var Typing = {
    SENTENCES: SENTENCES,
    TIMER_DURATION_MS: TIMER_DURATION_MS,
    calcWpm: calcWpm,
    calcAccuracy: calcAccuracy,
    calcTypoCount: calcTypoCount,
    countCorrectChars: countCorrectChars
  };

  global.Typing = Typing;

  // ---- DOM 바인딩 (브라우저 전용, node --test 환경에서는 document 없음) ----
  if (typeof document !== 'undefined' && document.getElementById('typing-app')) {
    (function bindTypingUI() {
      var STATE_LABEL = {
        idle: '대기',
        running: '진행 중',
        finished: '완료'
      };

      var root = document.getElementById('typing-app');
      var statusText = document.getElementById('status-text');
      var targetSentenceEl = document.getElementById('target-sentence');
      var typedInput = document.getElementById('typed-input');
      var timerValueEl = document.getElementById('timer-value');
      var wpmValueEl = document.getElementById('wpm-value');
      var accuracyValueEl = document.getElementById('accuracy-value');
      var typoCountValueEl = document.getElementById('typo-count-value');
      var resultPanel = document.getElementById('result-panel');
      var restartButton = document.getElementById('restart-button');

      var sentenceIndex = 0;
      var targetSentence = SENTENCES[sentenceIndex];
      var state = 'idle';
      var startTime = null;
      var intervalId = null;
      var timeoutId = null;

      function renderSentence() {
        var typed = typedInput.value;
        var html = '';
        for (var i = 0; i < targetSentence.length; i++) {
          var ch = targetSentence[i];
          var cls;
          if (i < typed.length) {
            cls = typed[i] === ch ? 'char-correct' : 'char-incorrect';
          } else if (i === typed.length) {
            cls = 'char-current';
          } else {
            cls = 'char-pending';
          }
          html += '<span class="' + cls + '">' + escapeHtml(ch) + '</span>';
        }
        targetSentenceEl.innerHTML = html;
      }

      function escapeHtml(ch) {
        if (ch === '&') return '&amp;';
        if (ch === '<') return '&lt;';
        if (ch === '>') return '&gt;';
        return ch;
      }

      function updateTimerDisplay(remainingMs) {
        var remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
        timerValueEl.textContent = String(remainingSeconds);
      }

      function render() {
        root.setAttribute('data-state', state);
        root.setAttribute('aria-label', '타이핑 속도 테스트 - ' + STATE_LABEL[state]);
        if (statusText) {
          statusText.textContent = '상태: ' + STATE_LABEL[state];
        }
        typedInput.disabled = state === 'finished';
        if (resultPanel) {
          resultPanel.classList.toggle('result-panel--visible', state === 'finished');
        }
        renderSentence();
      }

      function clearTimers() {
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }

      function startRun() {
        state = 'running';
        startTime = Date.now();
        updateTimerDisplay(TIMER_DURATION_MS);
        intervalId = setInterval(function () {
          var elapsed = Date.now() - startTime;
          updateTimerDisplay(TIMER_DURATION_MS - elapsed);
        }, 250);
        timeoutId = setTimeout(function () {
          finishRun();
        }, TIMER_DURATION_MS);
        render();
      }

      function finishRun() {
        if (state !== 'running') return;
        clearTimers();
        var elapsedMs = Math.min(TIMER_DURATION_MS, Date.now() - startTime);
        var typed = typedInput.value;
        var correctChars = countCorrectChars(typed, targetSentence);
        var wpm = calcWpm(correctChars, elapsedMs);
        var accuracy = calcAccuracy(typed, targetSentence);
        var typoCount = calcTypoCount(typed, targetSentence);

        wpmValueEl.textContent = String(wpm);
        accuracyValueEl.textContent = String(accuracy);
        typoCountValueEl.textContent = String(typoCount);
        updateTimerDisplay(0);

        state = 'finished';
        render();
      }

      function restart() {
        clearTimers();
        sentenceIndex = (sentenceIndex + 1) % SENTENCES.length;
        targetSentence = SENTENCES[sentenceIndex];
        startTime = null;
        typedInput.value = '';
        wpmValueEl.textContent = '0';
        accuracyValueEl.textContent = '0';
        typoCountValueEl.textContent = '0';
        updateTimerDisplay(TIMER_DURATION_MS);
        state = 'idle';
        render();
        typedInput.focus();
      }

      typedInput.addEventListener('input', function () {
        if (state === 'idle') {
          startRun();
        }
        if (state !== 'running') return;
        renderSentence();
        if (typedInput.value.length === targetSentence.length) {
          finishRun();
        }
      });

      restartButton.addEventListener('click', restart);

      updateTimerDisplay(TIMER_DURATION_MS);
      render();
    })();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
