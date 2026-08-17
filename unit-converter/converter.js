'use strict';

// BF-2167 · docs/plans/BF-2165/implementation-plan.md §2~§6 frozen 계약 구현.

(function () {
  var UNIT_TABLES = {
    length: { m: 1, km: 1000, mi: 1609.344, ft: 0.3048 },
    weight: { g: 1, kg: 1000, lb: 453.59237, oz: 28.349523125 }
  };

  var CATEGORY_UNITS = {
    length: ['m', 'km', 'mi', 'ft'],
    weight: ['g', 'kg', 'lb', 'oz'],
    temperature: ['C', 'F', 'K']
  };

  var UNIT_LABELS = {
    m: '미터 (m)',
    km: '킬로미터 (km)',
    mi: '마일 (mi)',
    ft: '피트 (ft)',
    g: '그램 (g)',
    kg: '킬로그램 (kg)',
    lb: '파운드 (lb)',
    oz: '온스 (oz)',
    C: '섭씨 (°C)',
    F: '화씨 (°F)',
    K: '켈빈 (K)'
  };

  var ABSOLUTE_ZERO_CELSIUS = -273.15;

  var ERROR_EMPTY = '값을 입력해 주세요.';
  var ERROR_NOT_A_NUMBER = '숫자를 입력해 주세요.';
  var ERROR_BELOW_ABSOLUTE_ZERO = '절대영도(-273.15°C) 미만은 변환할 수 없습니다.';

  function toCelsius(value, unit) {
    if (unit === 'F') {
      return (value - 32) * 5 / 9;
    }
    if (unit === 'K') {
      return value - 273.15;
    }
    return value;
  }

  function fromCelsius(celsius, unit) {
    if (unit === 'F') {
      return celsius * 9 / 5 + 32;
    }
    if (unit === 'K') {
      return celsius + 273.15;
    }
    return celsius;
  }

  /**
   * 6장 formatResult 반올림 규칙: 유효숫자 6자리 반올림 + 정수 표기.
   * @param {number} value
   * @returns {string}
   */
  function formatResult(value) {
    if (value === 0) {
      return '0';
    }
    var rounded = Number(value.toPrecision(6));
    return String(rounded);
  }

  /**
   * @param {'length'|'weight'|'temperature'} category
   * @param {string} from
   * @param {string} to
   * @param {number|string} rawValue
   * @returns {{ok: true, state: 'result-ready', value: number} | {ok: false, state: string, message: string}}
   */
  function convert(category, from, to, rawValue) {
    var trimmed = String(rawValue).trim();

    if (trimmed === '') {
      return { ok: false, state: 'error-invalid-input', message: ERROR_EMPTY };
    }

    var value = Number(trimmed);
    if (!Number.isFinite(value)) {
      return { ok: false, state: 'error-invalid-input', message: ERROR_NOT_A_NUMBER };
    }

    if (category === 'temperature') {
      var celsius = toCelsius(value, from);
      if (celsius < ABSOLUTE_ZERO_CELSIUS) {
        return { ok: false, state: 'error-below-absolute-zero', message: ERROR_BELOW_ABSOLUTE_ZERO };
      }
      return { ok: true, state: 'result-ready', value: fromCelsius(celsius, to) };
    }

    var table = UNIT_TABLES[category];
    return { ok: true, state: 'result-ready', value: value * table[from] / table[to] };
  }

  var api = {
    convert: convert,
    formatResult: formatResult,
    CATEGORY_UNITS: CATEGORY_UNITS,
    UNIT_LABELS: UNIT_LABELS
  };

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
    var tabButtons = {
      length: document.getElementById('tab-length'),
      weight: document.getElementById('tab-weight'),
      temperature: document.getElementById('tab-temperature')
    };
    var valueInput = document.getElementById('value-input');
    var fromSelect = document.getElementById('from-unit-select');
    var toSelect = document.getElementById('to-unit-select');
    var swapButton = document.getElementById('swap-button');
    var resultOutput = document.getElementById('result-output');
    var errorMessage = document.getElementById('error-message');

    if (!valueInput || !fromSelect || !toSelect || !swapButton || !resultOutput || !errorMessage) {
      return;
    }

    var currentCategory = 'length';

    function populateUnitSelect(select, units, selectedUnit) {
      select.innerHTML = '';
      units.forEach(function (unit) {
        var option = document.createElement('option');
        option.value = unit;
        option.textContent = UNIT_LABELS[unit];
        if (unit === selectedUnit) {
          option.selected = true;
        }
        select.appendChild(option);
      });
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
      resultOutput.textContent = '';
      resultOutput.classList.remove('result--error');
      errorMessage.textContent = '';
    }

    function showError(message) {
      resultOutput.textContent = '';
      resultOutput.classList.add('result--error');
      errorMessage.textContent = message;
    }

    function showResult(formatted) {
      resultOutput.textContent = formatted;
      resultOutput.classList.remove('result--error');
      errorMessage.textContent = '';
    }

    function recalculate() {
      var outcome = convert(currentCategory, fromSelect.value, toSelect.value, valueInput.value);
      if (!outcome.ok) {
        showError(outcome.message);
        return;
      }
      showResult(formatResult(outcome.value));
    }

    function setCategory(category) {
      currentCategory = category;
      var units = CATEGORY_UNITS[category];
      populateUnitSelect(fromSelect, units, units[0]);
      populateUnitSelect(toSelect, units, units[1]);
      setTabState();
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
      var fromValue = fromSelect.value;
      var toValue = toSelect.value;
      fromSelect.value = toValue;
      toSelect.value = fromValue;
      recalculate();
    });

    valueInput.addEventListener('input', recalculate);
    fromSelect.addEventListener('change', recalculate);
    toSelect.addEventListener('change', recalculate);

    populateUnitSelect(fromSelect, CATEGORY_UNITS[currentCategory], CATEGORY_UNITS[currentCategory][0]);
    populateUnitSelect(toSelect, CATEGORY_UNITS[currentCategory], CATEGORY_UNITS[currentCategory][1]);
    setTabState();
    showIdle();
  }
})();
