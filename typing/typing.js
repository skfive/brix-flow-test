// typing/typing.js
// BF-2180: 타자 연습기 — 순수 산식 함수 + DOM 바인딩
//
// 외부 의존성 0. file:// 로 <script> classic 태그 로드(브라우저)와
// `node --test`(ESM 부수효과 import) 양쪽에서 동일하게 동작해야 하므로
// import/export 문을 쓰지 않고 IIFE 로 globalThis.TypingPractice 에 노출한다.
(function (global) {
  'use strict';

  var TARGET_TEXT = 'The quick brown fox jumps over the lazy dog.';

  var STATUS_TEXT = {
    idle: '대기 중 — 입력을 시작하세요',
    typing: '입력 중',
    done: '완료되었습니다'
  };

  // ---- evaluateInput(target, typed) — 글자별 상태 배열·완료 여부·오류 수. 원본 불변 ----
  function evaluateInput(target, typed) {
    var chars = [];
    for (var i = 0; i < target.length; i++) {
      var expected = target[i];
      var status = 'pending';
      if (i < typed.length) {
        status = typed[i] === expected ? 'correct' : 'incorrect';
      }
      chars.push({ char: expected, status: status });
    }

    var errorCount = 0;
    for (var j = 0; j < chars.length; j++) {
      if (chars[j].status === 'incorrect') {
        errorCount++;
      }
    }

    return {
      chars: chars,
      done: typed.length >= target.length,
      errorCount: errorCount
    };
  }

  // ---- computeStats(target, typed, elapsedMs) — 5글자 = 1단어 기준 WPM, 정확도 ----
  function computeStats(target, typed, elapsedMs) {
    var typedLength = typed.length;
    var limit = Math.min(typedLength, target.length);
    var correctCount = 0;
    for (var i = 0; i < limit; i++) {
      if (typed[i] === target[i]) {
        correctCount++;
      }
    }

    var accuracy = typedLength === 0 ? 0 : Math.round((correctCount / typedLength) * 100);
    var minutes = elapsedMs > 0 ? elapsedMs / 60000 : 0;
    var words = typedLength / 5;
    var wpm = minutes > 0 ? Math.round(words / minutes) : 0;

    return {
      wpm: wpm,
      accuracy: accuracy,
      errorCount: typedLength - correctCount,
      elapsedMs: elapsedMs
    };
  }

  global.TypingPractice = {
    TARGET_TEXT: TARGET_TEXT,
    evaluateInput: evaluateInput,
    computeStats: computeStats
  };

  // ---- DOM 바인딩 (브라우저 전용, node --test 환경에서는 document 없음) ----
  if (typeof document !== 'undefined' && document.getElementById('typing-root')) {
    (function bindTypingUI(clock) {
      var typingRoot = document.getElementById('typing-root');
      var statusText = document.getElementById('status-text');
      var promptText = document.getElementById('prompt-text');
      var typedInput = document.getElementById('typed-input');
      var pasteWarning = document.getElementById('paste-warning');
      var restartButton = document.getElementById('restart-button');
      var wpmValueEl = document.getElementById('wpm-value');
      var accuracyValueEl = document.getElementById('accuracy-value');
      var errorCountValueEl = document.getElementById('error-count-value');

      var state = 'idle';
      var startTime = null;

      typedInput.setAttribute('maxlength', String(TARGET_TEXT.length));

      function renderPrompt(typed) {
        var result = evaluateInput(TARGET_TEXT, typed);
        promptText.innerHTML = '';
        for (var i = 0; i < result.chars.length; i++) {
          var span = document.createElement('span');
          span.className = 'char--' + result.chars[i].status;
          span.textContent = result.chars[i].char;
          promptText.appendChild(span);
        }
        return result;
      }

      function renderStats(stats) {
        wpmValueEl.textContent = String(stats.wpm);
        accuracyValueEl.textContent = String(stats.accuracy);
        errorCountValueEl.textContent = String(stats.errorCount);
      }

      function resetStats() {
        wpmValueEl.textContent = '0';
        accuracyValueEl.textContent = '0';
        errorCountValueEl.textContent = '0';
      }

      function setState(next) {
        state = next;
        typingRoot.setAttribute('data-state', state);
        typingRoot.setAttribute('aria-label', '타자 연습기 - ' + STATUS_TEXT[state]);
        statusText.textContent = STATUS_TEXT[state];
      }

      function handleInput() {
        if (state === 'done') return;

        var value = typedInput.value;

        if (state === 'idle' && value.length > 0) {
          startTime = clock();
          setState('typing');
        } else if (state === 'typing' && value.length === 0) {
          startTime = null;
          setState('idle');
        }

        var result = renderPrompt(value);

        if (result.done) {
          var elapsedMs = startTime === null ? 0 : clock() - startTime;
          var stats = computeStats(TARGET_TEXT, value, elapsedMs);
          renderStats(stats);
          typedInput.disabled = true;
          setState('done');
          restartButton.focus();
        }
      }

      function handleKeydown(event) {
        if (event.key === 'Enter') {
          event.preventDefault();
        }
      }

      function handlePaste(event) {
        event.preventDefault();
        pasteWarning.hidden = false;
      }

      function handleRestart() {
        typedInput.value = '';
        typedInput.disabled = false;
        startTime = null;
        renderPrompt('');
        resetStats();
        pasteWarning.hidden = true;
        setState('idle');
        typedInput.focus();
      }

      typedInput.addEventListener('input', handleInput);
      typedInput.addEventListener('keydown', handleKeydown);
      typedInput.addEventListener('paste', handlePaste);
      typedInput.addEventListener('drop', handlePaste);
      restartButton.addEventListener('click', handleRestart);

      renderPrompt('');
      resetStats();
      setState('idle');
    })(function () {
      return Date.now();
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
