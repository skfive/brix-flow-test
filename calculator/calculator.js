// calculator/calculator.js — BF-2079 계산기 순수 함수 + DOM 바인딩
//
// classic script로 file://에서 직접 로드되어야 하므로 import/export를 쓰지 않는다.
// applyInput/evaluate는 top-level 함수 선언으로 두어 node:vm sandbox에서도
// 전역 프로퍼티로 추출할 수 있게 한다 (calculator.test.js 참고).

var OPERATORS = ["+", "-", "*", "/"];

function isDigitKey(key) {
  return key.length === 1 && key >= "0" && key <= "9";
}

function isOperatorKey(key) {
  return OPERATORS.indexOf(key) !== -1;
}

function isErrorResult(value) {
  return value !== null && typeof value === "object" && value.error === true;
}

function toggleDisplaySign(display) {
  if (display === "0") return display;
  return display.charAt(0) === "-" ? display.slice(1) : "-" + display;
}

function formatNumber(value) {
  if (value === null || value === undefined) return "0";
  var rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded);
}

function evaluate(left, operator, right) {
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      if (right === 0) return { error: true };
      return left / right;
    default:
      return { error: true };
  }
}

function finishCalculation(left, operator, right) {
  var value = evaluate(left, operator, right);
  if (isErrorResult(value)) {
    return { phase: "error", display: "Error", left: null, operator: null, overwrite: true };
  }
  return { phase: "result", display: formatNumber(value), left: value, operator: null, overwrite: true };
}

function applyDigit(state, key) {
  switch (state.phase) {
    case "input-entry": {
      var nextDisplay = state.overwrite
        ? key
        : state.display === "0"
          ? key
          : state.display + key;
      return Object.assign({}, state, { phase: "input-entry", display: nextDisplay, overwrite: false });
    }
    case "operator-pending":
      return Object.assign({}, state, { phase: "input-entry", display: key, overwrite: false });
    case "result":
      return { phase: "input-entry", display: key, left: null, operator: null, overwrite: false };
    default:
      return Object.assign({}, state);
  }
}

function applyDecimal(state) {
  if (state.phase === "input-entry") {
    if (state.overwrite) {
      return Object.assign({}, state, { display: "0.", overwrite: false });
    }
    if (state.display.indexOf(".") !== -1) {
      return Object.assign({}, state);
    }
    return Object.assign({}, state, { display: state.display + "." });
  }
  if (state.phase === "operator-pending") {
    return Object.assign({}, state, { phase: "input-entry", display: "0.", overwrite: false });
  }
  if (state.phase === "result") {
    return { phase: "input-entry", display: "0.", left: null, operator: null, overwrite: false };
  }
  return Object.assign({}, state);
}

function applySignToggle(state) {
  if (state.phase === "input-entry") {
    return Object.assign({}, state, { display: toggleDisplaySign(state.display) });
  }
  if (state.phase === "operator-pending" || state.phase === "result") {
    var toggledLeft = state.left === null ? null : -state.left;
    return Object.assign({}, state, { left: toggledLeft, display: formatNumber(toggledLeft) });
  }
  return Object.assign({}, state);
}

function applyOperator(state, key) {
  switch (state.phase) {
    case "input-entry": {
      if (state.left !== null && state.operator !== null) {
        var right = parseFloat(state.display);
        var value = evaluate(state.left, state.operator, right);
        if (isErrorResult(value)) {
          return { phase: "error", display: "Error", left: null, operator: null, overwrite: true };
        }
        return { phase: "operator-pending", display: formatNumber(value), left: value, operator: key, overwrite: true };
      }
      return { phase: "operator-pending", display: state.display, left: parseFloat(state.display), operator: key, overwrite: true };
    }
    case "operator-pending":
      return Object.assign({}, state, { operator: key });
    case "result":
      return { phase: "operator-pending", display: state.display, left: state.left, operator: key, overwrite: true };
    default:
      return Object.assign({}, state);
  }
}

function applyEquals(state) {
  switch (state.phase) {
    case "input-entry": {
      if (state.left === null || state.operator === null) {
        var value = parseFloat(state.display);
        return { phase: "result", display: formatNumber(value), left: value, operator: null, overwrite: true };
      }
      return finishCalculation(state.left, state.operator, parseFloat(state.display));
    }
    case "operator-pending":
      return finishCalculation(state.left, state.operator, state.left);
    case "result":
      return Object.assign({}, state);
    default:
      return Object.assign({}, state);
  }
}

function applyInput(state, key) {
  if (key === "C") {
    return { phase: "input-entry", display: "0", left: null, operator: null, overwrite: true };
  }
  if (state.phase === "error") {
    if (isDigitKey(key)) {
      return { phase: "input-entry", display: key, left: null, operator: null, overwrite: false };
    }
    return Object.assign({}, state);
  }
  if (isDigitKey(key)) {
    return applyDigit(state, key);
  }
  if (key === ".") {
    return applyDecimal(state);
  }
  if (key === "±") {
    return applySignToggle(state);
  }
  if (isOperatorKey(key)) {
    return applyOperator(state, key);
  }
  if (key === "=") {
    return applyEquals(state);
  }
  return Object.assign({}, state);
}

var PHASE_LABELS = {
  "input-entry": "입력중",
  "operator-pending": "연산자대기",
  result: "결과",
  error: "에러"
};

function mapKeyboardEvent(event) {
  if (event.key.length === 1 && event.key >= "0" && event.key <= "9") return event.key;
  if (event.key === ".") return ".";
  if (isOperatorKey(event.key)) return event.key;
  if (event.key === "Enter" || event.key === "=") return "=";
  if (event.key === "Escape") return "C";
  return null;
}

function initCalculator() {
  var state = { phase: "input-entry", display: "0", left: null, operator: null, overwrite: true };
  var appEl = document.getElementById("calculator-app");
  var displayEl = document.getElementById("calculator-display");
  var phaseEl = document.getElementById("calculator-phase");
  var keypadEl = document.getElementById("calculator-keypad");
  var buttons = keypadEl ? Array.prototype.slice.call(keypadEl.querySelectorAll("button[data-key]")) : [];

  function render() {
    displayEl.textContent = state.display;
    if (phaseEl) phaseEl.textContent = PHASE_LABELS[state.phase] || "";
    if (appEl) appEl.setAttribute("data-phase", state.phase);
    var isError = state.phase === "error";
    buttons.forEach(function (btn) {
      btn.disabled = isError && btn.getAttribute("data-key") !== "C";
    });
  }

  function handleKey(key) {
    state = applyInput(state, key);
    render();
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      handleKey(btn.getAttribute("data-key"));
    });
  });

  document.addEventListener("keydown", function (event) {
    var key = mapKeyboardEvent(event);
    if (key !== null) {
      event.preventDefault();
      handleKey(key);
    }
  });

  render();
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initCalculator);
}
