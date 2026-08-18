'use strict';

// BF-2173 · docs/plans/BF-2171/implementation-plan.md §2~§8 frozen 계약 구현.

(function () {
  var BASES = [2, 8, 10, 16];

  var ALLOWED_CHARS = {
    2: '01',
    8: '01234567',
    10: '0123456789',
    16: '0123456789ABCDEF'
  };

  var ERROR_MESSAGES = {
    empty: '값을 입력해 주세요.',
    whitespace: '공백은 사용할 수 없습니다.',
    'decimal-point': '정수만 입력할 수 있습니다.',
    'invalid-sign': '숫자 형식이 올바르지 않습니다.',
    overflow: '표현 가능한 범위를 초과했습니다.'
  };

  var BASE_LABELS = {
    2: '2진수',
    8: '8진수',
    10: '10진수',
    16: '16진수'
  };

  var STATE_LABELS = {
    idle: '대기 중',
    'invalid-input': '입력 오류',
    converted: '변환 완료',
    copied: '복사됨'
  };

  var COPY_FEEDBACK_MS = 1500;

  function invalidCharMessage(base) {
    return BASE_LABELS[base] + '에서 허용되지 않는 문자가 포함되어 있습니다.';
  }

  /**
   * @param {string} text
   * @param {2|8|10|16} base
   * @returns {{ok: true, value: number, isNegative: boolean} | {ok: false, error: string, message: string}}
   */
  function parseInBase(text, base) {
    var trimmed = String(text).trim();

    if (trimmed === '') {
      return { ok: false, error: 'empty', message: ERROR_MESSAGES.empty };
    }

    if (/\s/.test(trimmed)) {
      return { ok: false, error: 'whitespace', message: ERROR_MESSAGES.whitespace };
    }

    if (trimmed.indexOf('.') !== -1) {
      return { ok: false, error: 'decimal-point', message: ERROR_MESSAGES['decimal-point'] };
    }

    var isNegative = trimmed.charAt(0) === '-';
    var digits = isNegative ? trimmed.slice(1) : trimmed;

    if (digits.indexOf('-') !== -1 || digits === '') {
      return { ok: false, error: 'invalid-sign', message: ERROR_MESSAGES['invalid-sign'] };
    }

    var allowed = ALLOWED_CHARS[base];
    var upperDigits = digits.toUpperCase();
    for (var i = 0; i < upperDigits.length; i += 1) {
      if (allowed.indexOf(upperDigits.charAt(i)) === -1) {
        return { ok: false, error: 'invalid-char', message: invalidCharMessage(base) };
      }
    }

    var value = parseInt(upperDigits, base);
    if (isNegative) {
      value = -value;
    }

    if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      return { ok: false, error: 'overflow', message: ERROR_MESSAGES.overflow };
    }

    return { ok: true, value: value, isNegative: isNegative };
  }

  /**
   * @param {number} value
   * @param {2|8|10|16} base
   * @returns {{ok: true, text: string} | {ok: false, error: 'invalid-value', message: string}}
   */
  function formatInBase(value, base) {
    if (!Number.isInteger(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      return { ok: false, error: 'invalid-value', message: '표현 가능한 범위를 초과했습니다.' };
    }

    if (value === 0) {
      return { ok: true, text: '0' };
    }

    var isNegative = value < 0;
    var text = Math.abs(value).toString(base).toUpperCase();

    return { ok: true, text: isNegative ? '-' + text : text };
  }

  var api = {
    BASES: BASES,
    parseInBase: parseInBase,
    formatInBase: formatInBase
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.RadixConverter = api;
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      initRadixConverter();
    });
  }

  function $(id) {
    return document.getElementById(id);
  }

  function initRadixConverter() {
    var root = $('radix-root');
    if (!root) {
      return;
    }

    var input = $('radix-input');
    var errorEl = $('radix-error');
    var statusEl = $('radix-status');
    var resultEls = {
      2: $('radix-result-2'),
      8: $('radix-result-8'),
      10: $('radix-result-10'),
      16: $('radix-result-16')
    };
    var copyButtons = {
      2: $('radix-copy-2'),
      8: $('radix-copy-8'),
      10: $('radix-copy-10'),
      16: $('radix-copy-16')
    };
    var copyFeedbackEls = {};
    BASES.forEach(function (base) {
      var button = copyButtons[base];
      if (button && button.parentNode) {
        copyFeedbackEls[base] = button.parentNode.querySelector('.radix-converter__copy-feedback');
      }
    });
    var radioButtons = BASES.map(function (base) {
      return $('radix-base-' + base);
    });

    var copyTimers = {};
    var currentState = 'idle';

    function setState(state) {
      currentState = state;
      if (statusEl) {
        statusEl.textContent = STATE_LABELS[state];
      }
    }

    function currentBase() {
      for (var i = 0; i < radioButtons.length; i += 1) {
        var radio = radioButtons[i];
        if (radio && radio.checked) {
          return Number(radio.value);
        }
      }
      return 10;
    }

    function showIdle() {
      errorEl.textContent = '';
      errorEl.classList.remove('radix-converter__error--visible');
      BASES.forEach(function (base) {
        resultEls[base].textContent = '';
        resultEls[base].classList.add('radix-converter__result--hidden');
      });
      setState('idle');
    }

    function showError(message) {
      errorEl.textContent = message;
      errorEl.classList.add('radix-converter__error--visible');
      BASES.forEach(function (base) {
        resultEls[base].textContent = '';
        resultEls[base].classList.add('radix-converter__result--hidden');
      });
      setState('invalid-input');
    }

    function showConverted(value) {
      errorEl.textContent = '';
      errorEl.classList.remove('radix-converter__error--visible');
      BASES.forEach(function (base) {
        var formatted = formatInBase(value, base);
        if (formatted.ok) {
          resultEls[base].textContent = formatted.text;
        }
        resultEls[base].classList.remove('radix-converter__result--hidden');
      });
      setState('converted');
    }

    function recalculate() {
      var text = input.value;
      if (String(text).trim() === '') {
        showIdle();
        return;
      }

      var base = currentBase();
      var parsed = parseInBase(text, base);
      if (!parsed.ok) {
        showError(parsed.message);
        return;
      }

      showConverted(parsed.value);
    }

    function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        return;
      }
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    function handleCopyClick(base) {
      var button = copyButtons[base];
      var resultEl = resultEls[base];
      var feedbackEl = copyFeedbackEls[base];
      if (!button || !resultEl) {
        return;
      }

      copyText(resultEl.textContent);

      if (copyTimers[base]) {
        clearTimeout(copyTimers[base]);
      }

      if (feedbackEl) {
        feedbackEl.textContent = '복사됨';
      }
      var previousState = currentState === 'copied' ? 'converted' : currentState;
      setState('copied');

      copyTimers[base] = setTimeout(function () {
        if (feedbackEl) {
          feedbackEl.textContent = '';
        }
        copyTimers[base] = null;
        setState(previousState);
      }, COPY_FEEDBACK_MS);
    }

    input.addEventListener('input', recalculate);
    radioButtons.forEach(function (radio) {
      if (radio) {
        radio.addEventListener('change', recalculate);
      }
    });
    BASES.forEach(function (base) {
      var button = copyButtons[base];
      if (button) {
        button.addEventListener('click', function () {
          handleCopyClick(base);
        });
      }
    });

    showIdle();
  }
})();
