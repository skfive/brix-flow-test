'use strict';

(function () {
  var LENGTH_UNITS = {
    m: 1,
    km: 1000,
    cm: 0.01,
    inch: 0.0254,
    ft: 0.3048
  };

  var WEIGHT_UNITS = {
    g: 1,
    kg: 1000,
    lb: 453.59237,
    oz: 28.349523125
  };

  var CATEGORIES = {
    length: LENGTH_UNITS,
    weight: WEIGHT_UNITS
  };

  function categoryOf(unit) {
    if (Object.prototype.hasOwnProperty.call(LENGTH_UNITS, unit)) {
      return 'length';
    }
    if (Object.prototype.hasOwnProperty.call(WEIGHT_UNITS, unit)) {
      return 'weight';
    }
    return null;
  }

  /**
   * @param {number} value 변환할 값 (0 이상의 유한수)
   * @param {string} from 원본 단위 키
   * @param {string} to 대상 단위 키
   * @returns {number} 변환 결과 (반올림/자릿수 처리 없음)
   */
  function convert(value, from, to) {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      throw new Error('value must be a finite number');
    }
    if (value < 0) {
      throw new Error('value must be 0 or greater');
    }
    var fromCategory = categoryOf(from);
    var toCategory = categoryOf(to);
    if (!fromCategory) {
      throw new Error('unknown unit: ' + from);
    }
    if (!toCategory) {
      throw new Error('unknown unit: ' + to);
    }
    if (fromCategory !== toCategory) {
      throw new Error('from/to units must be in the same category');
    }
    var table = CATEGORIES[fromCategory];
    return (value * table[from]) / table[to];
  }

  /**
   * @param {number} n 표시할 숫자
   * @returns {string} 소수점 최대 4자리, 불필요한 trailing 0/소수점 제거된 문자열
   */
  function formatNumber(n) {
    // toFixed()는 |x| >= 1e21에서 스펙상 지수 표기로 되돌아가고, n * 10000 자체도 안전 정수
    // 범위를 벗어나 오차가 생기므로 별도 처리한다. 이 크기의 값은 소수점 4자리가 의미가 없다.
    if (Math.abs(n) >= 1e21) {
      return n.toLocaleString('en-US', { maximumFractionDigits: 0, useGrouping: false });
    }
    var rounded = Math.round(n * 10000) / 10000;
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

  var api = {
    convert: convert,
    formatNumber: formatNumber,
    CATEGORIES: CATEGORIES
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.UnitConverter = api;
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      initUnitConverter(api);
    });
  }

  function initUnitConverter(api) {
    var tabLength = document.getElementById('unit-converter-tab-length');
    var tabWeight = document.getElementById('unit-converter-tab-weight');
    var input = document.getElementById('unit-converter-input-value');
    var fromSelect = document.getElementById('unit-converter-from-unit');
    var toSelect = document.getElementById('unit-converter-to-unit');
    var swapButton = document.getElementById('unit-converter-swap-button');
    var result = document.getElementById('unit-converter-result');
    var error = document.getElementById('unit-converter-error');

    if (!tabLength || !tabWeight || !input || !fromSelect || !toSelect || !swapButton || !result || !error) {
      return;
    }

    var currentCategory = 'length';

    function unitsFor(category) {
      return Object.keys(api.CATEGORIES[category]);
    }

    function populateSelects(category, preserveFrom, preserveTo) {
      var units = unitsFor(category);
      [fromSelect, toSelect].forEach(function (select) {
        select.innerHTML = '';
        units.forEach(function (unit) {
          var option = document.createElement('option');
          option.value = unit;
          option.textContent = unit;
          select.appendChild(option);
        });
      });
      fromSelect.value = (preserveFrom && units.indexOf(preserveFrom) !== -1) ? preserveFrom : units[0];
      toSelect.value = (preserveTo && units.indexOf(preserveTo) !== -1) ? preserveTo : (units[1] || units[0]);
    }

    function setCategory(category) {
      currentCategory = category;
      var isLength = category === 'length';
      tabLength.classList.toggle('tab--active', isLength);
      tabWeight.classList.toggle('tab--active', !isLength);
      tabLength.setAttribute('aria-selected', String(isLength));
      tabWeight.setAttribute('aria-selected', String(!isLength));
      populateSelects(category);
      recalculate();
    }

    function clearOutputs() {
      result.textContent = '';
      error.textContent = '';
    }

    function showError(message) {
      result.textContent = '';
      error.textContent = message;
    }

    function showResult(value) {
      error.textContent = '';
      result.textContent = api.formatNumber(value);
    }

    function recalculate() {
      var raw = input.value.trim();
      if (raw === '') {
        clearOutputs();
        return;
      }
      var num = Number(raw);
      if (Number.isNaN(num) || !Number.isFinite(num)) {
        showError('숫자를 입력하세요');
        return;
      }
      if (num < 0) {
        showError('0 이상의 값을 입력하세요');
        return;
      }
      try {
        var converted = api.convert(num, fromSelect.value, toSelect.value);
        showResult(converted);
      } catch (e) {
        showError('숫자를 입력하세요');
      }
    }

    function handleTabKeydown(event) {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        var nextCategory = currentCategory === 'length' ? 'weight' : 'length';
        setCategory(nextCategory);
        (nextCategory === 'length' ? tabLength : tabWeight).focus();
      }
    }

    tabLength.addEventListener('click', function () {
      setCategory('length');
    });
    tabWeight.addEventListener('click', function () {
      setCategory('weight');
    });
    tabLength.addEventListener('keydown', handleTabKeydown);
    tabWeight.addEventListener('keydown', handleTabKeydown);
    input.addEventListener('input', recalculate);
    fromSelect.addEventListener('change', recalculate);
    toSelect.addEventListener('change', recalculate);
    swapButton.addEventListener('click', function () {
      var f = fromSelect.value;
      var t = toSelect.value;
      fromSelect.value = t;
      toSelect.value = f;
      recalculate();
    });

    populateSelects('length');
    clearOutputs();
  }
})();
