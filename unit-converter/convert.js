'use strict';

// BF-2001 · docs/plans/BF-1999/implementation-plan.md §1, §2 frozen 계약 구현.

(function () {
  var CONVERSION_TABLE = {
    length: {
      forward: function (value) { return value / 0.3048; }, // m -> ft
      reverse: function (value) { return value * 0.3048; } // ft -> m
    },
    weight: {
      forward: function (value) { return value / 0.45359237; }, // kg -> lb
      reverse: function (value) { return value * 0.45359237; } // lb -> kg
    },
    temperature: {
      forward: function (value) { return (value * 9 / 5) + 32; }, // C -> F
      reverse: function (value) { return (value - 32) * 5 / 9; } // F -> C
    }
  };

  var UNIT_LABELS = {
    length: { forward: 'm → ft', reverse: 'ft → m' },
    weight: { forward: 'kg → lb', reverse: 'lb → kg' },
    temperature: { forward: '°C → °F', reverse: '°F → °C' }
  };

  /**
   * 1.2 반올림 · 표시 포맷 규칙: 소수 4자리 반올림 + 후행 0 제거.
   * @param {number} raw
   * @returns {string}
   */
  function formatResult(raw) {
    var rounded = Math.round(raw * 10000) / 10000;
    if (Object.is(rounded, -0)) {
      rounded = 0;
    }
    var str = rounded.toFixed(4);
    if (str.indexOf('.') !== -1) {
      str = str.replace(/0+$/, '');
      str = str.replace(/\.$/, '');
    }
    return str;
  }

  /**
   * @param {'length'|'weight'|'temperature'} category
   * @param {'forward'|'reverse'} direction
   * @param {number} value - 유한수 (Number.isFinite(value) === true)
   * @returns {string} 1.2 규칙이 적용된 변환 결과 문자열
   * @throws {TypeError} category 또는 direction 값이 유효하지 않을 때
   */
  function convert(category, direction, value) {
    var categoryFns = CONVERSION_TABLE[category];
    if (!categoryFns) {
      throw new TypeError('unknown category: ' + category);
    }
    var fn = categoryFns[direction];
    if (!fn) {
      throw new TypeError('unknown direction: ' + direction);
    }
    return formatResult(fn(value));
  }

  var api = { convert: convert };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.UnitConverter = api;
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      initUnitConverter();
    });
  }

  function initUnitConverter() {
    var root = document.getElementById('unit-converter-root');
    var tabs = document.getElementById('category-tabs');
    var input = document.getElementById('input-value');
    var output = document.getElementById('output-value');
    var swapButton = document.getElementById('swap-direction');
    var errorMessage = document.getElementById('error-message');
    var directionLabel = document.getElementById('direction-label');

    if (!root || !tabs || !input || !output || !swapButton || !errorMessage) {
      return;
    }

    var tabButtons = {
      length: document.getElementById('tab-length'),
      weight: document.getElementById('tab-weight'),
      temperature: document.getElementById('tab-temperature')
    };

    var currentCategory = 'length';
    var currentDirection = 'forward';

    function updateDirectionLabel() {
      if (directionLabel) {
        directionLabel.textContent = UNIT_LABELS[currentCategory][currentDirection];
      }
    }

    function setTabState() {
      Object.keys(tabButtons).forEach(function (category) {
        var button = tabButtons[category];
        if (!button) {
          return;
        }
        var isActive = category === currentCategory;
        button.classList.toggle('tab--active', isActive);
        button.setAttribute('aria-selected', String(isActive));
      });
    }

    function showIdle() {
      output.textContent = '';
      errorMessage.textContent = '';
    }

    function showError(message) {
      output.textContent = '';
      errorMessage.textContent = message;
    }

    function showValid(value) {
      errorMessage.textContent = '';
      output.textContent = convert(currentCategory, currentDirection, value);
    }

    function recalculate() {
      var raw = input.value.trim();
      if (raw === '') {
        showIdle();
        return;
      }
      var value = Number(raw);
      if (!Number.isFinite(value)) {
        showError('숫자를 입력하세요');
        return;
      }
      showValid(value);
    }

    function setCategory(category) {
      currentCategory = category;
      currentDirection = 'forward';
      setTabState();
      updateDirectionLabel();
      recalculate();
    }

    Object.keys(tabButtons).forEach(function (category) {
      var button = tabButtons[category];
      if (!button) {
        return;
      }
      button.addEventListener('click', function () {
        setCategory(category);
      });
    });

    swapButton.addEventListener('click', function () {
      currentDirection = currentDirection === 'forward' ? 'reverse' : 'forward';
      updateDirectionLabel();
      recalculate();
    });

    input.addEventListener('input', recalculate);

    setTabState();
    updateDirectionLabel();
    showIdle();
  }
})();
