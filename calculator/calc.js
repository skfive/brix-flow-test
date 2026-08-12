// calculator/calc.js
// BF-2019: 사칙연산 계산기 — 순수 상태 리듀서 + DOM 바인딩
//
// 외부 의존성 0. file:// 로 <script> classic 태그 로드(브라우저)와
// `node --test`(ESM side-effect import) 양쪽에서 동일하게 동작해야 하므로
// import/export 문을 쓰지 않고 IIFE 로 globalThis.Calculator 에 노출한다.
(function (global) {
  'use strict';

  var DIVIDE_BY_ZERO_MESSAGE = '0으로 나눌 수 없습니다';

  // ---- evaluate(): 좌결합, 연산자 우선순위 없는 순수 계산 함수 ----
  // tokens 예: [2, '+', 3, '×', 4] -> ((2+3)×4) = 20
  function applyOperator(a, operator, b) {
    switch (operator) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
      case '×':
        return a * b;
      case '/':
      case '÷': {
        if (b === 0) {
          var err = new Error(DIVIDE_BY_ZERO_MESSAGE);
          err.code = 'DIVIDE_BY_ZERO';
          throw err;
        }
        return a / b;
      }
      default:
        throw new Error('알 수 없는 연산자: ' + operator);
    }
  }

  function evaluate(tokens) {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      throw new Error('evaluate: tokens는 비어 있지 않은 배열이어야 합니다');
    }
    var result = tokens[0];
    for (var i = 1; i < tokens.length; i += 2) {
      var operator = tokens[i];
      var operand = tokens[i + 1];
      result = applyOperator(result, operator, operand);
    }
    return result;
  }

  // ---- formatNumber(): 소수 8자리, 후행 0 제거, 12자 초과 시 지수 표기 ----
  function trimTrailingZeros(str) {
    if (str.indexOf('.') === -1) return str;
    return str.replace(/0+$/, '').replace(/\.$/, '');
  }

  function formatNumber(num) {
    if (!Number.isFinite(num)) {
      return String(num);
    }
    if (num === 0) return '0';
    var rounded = Number(num.toFixed(8));
    var str = trimTrailingZeros(rounded.toFixed(8));
    if (str.length > 12) {
      var exp = rounded.toExponential(6);
      var parts = exp.split('e');
      str = trimTrailingZeros(parts[0]) + 'e' + parts[1];
    }
    return str;
  }

  // ---- 상태 리듀서 (idle / entering / result / error) ----
  function createInitialState() {
    return {
      state: 'idle',
      displayValue: '0',
      firstOperand: null,
      pendingOperator: null,
      errorMessage: null,
      startFresh: false
    };
  }

  function errorState() {
    return {
      state: 'error',
      displayValue: DIVIDE_BY_ZERO_MESSAGE,
      firstOperand: null,
      pendingOperator: null,
      errorMessage: DIVIDE_BY_ZERO_MESSAGE,
      startFresh: false
    };
  }

  function inputDigit(state, digit) {
    if (state.state === 'error') return state;
    if (state.state === 'result') {
      var fresh = createInitialState();
      fresh.state = 'entering';
      fresh.displayValue = digit;
      return fresh;
    }
    if (state.state === 'idle' || state.startFresh) {
      return Object.assign({}, state, {
        state: 'entering',
        displayValue: digit,
        startFresh: false
      });
    }
    var displayValue = state.displayValue === '0' ? digit : state.displayValue + digit;
    return Object.assign({}, state, { displayValue: displayValue });
  }

  function inputDecimal(state) {
    if (state.state === 'error') return state;
    if (state.state === 'result') {
      var fresh = createInitialState();
      fresh.state = 'entering';
      fresh.displayValue = '0.';
      return fresh;
    }
    if (state.state === 'idle' || state.startFresh) {
      return Object.assign({}, state, {
        state: 'entering',
        displayValue: '0.',
        startFresh: false
      });
    }
    if (state.displayValue.indexOf('.') !== -1) return state;
    return Object.assign({}, state, { displayValue: state.displayValue + '.' });
  }

  function inputOperator(state, operator) {
    if (state.state === 'error') return state;
    if (state.state === 'idle') return state;
    if (state.state === 'result') {
      return {
        state: 'entering',
        displayValue: state.displayValue,
        firstOperand: parseFloat(state.displayValue),
        pendingOperator: operator,
        errorMessage: null,
        startFresh: true
      };
    }
    // entering
    var currentValue = parseFloat(state.displayValue);
    if (state.pendingOperator === null) {
      return Object.assign({}, state, {
        firstOperand: currentValue,
        pendingOperator: operator,
        startFresh: true
      });
    }
    try {
      var resultValue = applyOperator(state.firstOperand, state.pendingOperator, currentValue);
      return {
        state: 'entering',
        displayValue: formatNumber(resultValue),
        firstOperand: resultValue,
        pendingOperator: operator,
        errorMessage: null,
        startFresh: true
      };
    } catch (e) {
      return errorState();
    }
  }

  function inputEquals(state) {
    if (state.state === 'error') return state;
    if (state.state === 'idle') return state;
    if (state.state === 'result') return state;
    if (state.pendingOperator === null) return state;
    var currentValue = parseFloat(state.displayValue);
    try {
      var resultValue = applyOperator(state.firstOperand, state.pendingOperator, currentValue);
      return {
        state: 'result',
        displayValue: formatNumber(resultValue),
        firstOperand: resultValue,
        pendingOperator: null,
        errorMessage: null,
        startFresh: false
      };
    } catch (e) {
      return errorState();
    }
  }

  function inputBackspace(state) {
    if (state.state !== 'entering') return state;
    if (state.startFresh) return state;
    if (state.displayValue.length <= 1) {
      return Object.assign({}, state, { displayValue: '0' });
    }
    return Object.assign({}, state, { displayValue: state.displayValue.slice(0, -1) });
  }

  function inputClear() {
    return createInitialState();
  }

  function handleInput(state, action) {
    switch (action.type) {
      case 'digit':
        return inputDigit(state, action.value);
      case 'decimal':
        return inputDecimal(state);
      case 'operator':
        return inputOperator(state, action.value);
      case 'equals':
        return inputEquals(state);
      case 'clear':
        return inputClear();
      case 'backspace':
        return inputBackspace(state);
      default:
        return state;
    }
  }

  var Calculator = {
    evaluate: evaluate,
    formatNumber: formatNumber,
    createInitialState: createInitialState,
    handleInput: handleInput,
    DIVIDE_BY_ZERO_MESSAGE: DIVIDE_BY_ZERO_MESSAGE
  };

  global.Calculator = Calculator;

  // ---- DOM 바인딩 (브라우저 전용, node --test 환경에서는 document 없음) ----
  if (typeof document !== 'undefined' && document.getElementById('calculator-root')) {
    (function bindCalculatorUI() {
      var STATE_LABEL = {
        idle: '대기',
        entering: '입력 중',
        result: '결과',
        error: '오류'
      };

      var root = document.getElementById('calculator-root');
      var display = document.getElementById('calculator-display');
      var status = document.getElementById('calculator-status');
      var btnClear = document.getElementById('btn-clear');
      var buttons = Array.prototype.slice.call(document.querySelectorAll('.calculator__button'));

      var state = createInitialState();

      function render() {
        display.textContent = state.displayValue;
        if (status) {
          status.textContent = STATE_LABEL[state.state] || state.state;
        }
        root.setAttribute('data-state', state.state);
        buttons.forEach(function (button) {
          button.disabled = state.state === 'error' && button !== btnClear;
        });
      }

      function dispatch(action) {
        state = handleInput(state, action);
        render();
      }

      buttons.forEach(function (button) {
        button.addEventListener('click', function () {
          if (button.id === 'btn-clear') {
            dispatch({ type: 'clear' });
            return;
          }
          if (button.id === 'btn-backspace') {
            dispatch({ type: 'backspace' });
            return;
          }
          if (button.id === 'btn-equals') {
            dispatch({ type: 'equals' });
            return;
          }
          if (button.dataset.decimal !== undefined) {
            dispatch({ type: 'decimal' });
            return;
          }
          if (button.dataset.operator !== undefined) {
            dispatch({ type: 'operator', value: button.dataset.operator });
            return;
          }
          if (button.dataset.digit !== undefined) {
            dispatch({ type: 'digit', value: button.dataset.digit });
          }
        });
      });

      var KEY_OPERATOR_MAP = { '+': '+', '-': '-', '*': '*', '/': '/' };

      document.addEventListener('keydown', function (event) {
        var key = event.key;
        if (key >= '0' && key <= '9') {
          event.preventDefault();
          dispatch({ type: 'digit', value: key });
          return;
        }
        if (key === '.') {
          event.preventDefault();
          dispatch({ type: 'decimal' });
          return;
        }
        if (Object.prototype.hasOwnProperty.call(KEY_OPERATOR_MAP, key)) {
          event.preventDefault();
          dispatch({ type: 'operator', value: KEY_OPERATOR_MAP[key] });
          return;
        }
        if (key === 'Enter') {
          event.preventDefault();
          dispatch({ type: 'equals' });
          return;
        }
        if (key === 'Escape') {
          event.preventDefault();
          dispatch({ type: 'clear' });
          return;
        }
        if (key === 'Backspace') {
          event.preventDefault();
          dispatch({ type: 'backspace' });
        }
      });

      render();
    })();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
