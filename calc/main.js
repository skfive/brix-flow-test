// BF-412 · 계산기 SPA 엔트리
// - 명세: docs/design/calculator-BF-410.md
// - 의존: calc/calc.js (안전 parser/evaluator), calc/storage.js (localStorage 추상)
// - 범위:
//     · 수식 문자열 누적 + 결과 표시
//     · 키패드 클릭 + 물리 키보드 (0–9, +, -, *, /, ., Enter, =, Escape, Backspace, Delete)
//     · C/Escape → 전체 초기화 / ←/Backspace → 마지막 1글자 제거
//     · `=`/Enter → 안전 parser 로 평가 → 결과 표시 + localStorage `calc:last` 저장
//     · 새로고침 시 `calc:last` 가 있으면 결과 영역에 복원 (AC2)
//     · 다크 토글 — notepad/timer 와 `bf-theme` localStorage 키 공유

import { evaluate } from "./calc.js";
import { createCalcStore } from "./storage.js";

const store = createCalcStore();

const $ = (id) => document.getElementById(id);
const exprEl = $("expr");
const resultEl = $("result");
const keypadEl = $("keypad");
const btnTheme = $("btn-theme");

// phase: "empty" | "entering" | "evaluated" | "error"
const state = {
  expression: "",
  result: "0",
  phase: "empty",
};

const OPS = new Set(["+", "-", "*", "/"]);
const OP_DISPLAY = { "*": "×", "/": "÷", "-": "−", "+": "+" };

// 테마 토글 — notepad/timer 와 키 공유 (§6.5)
const THEME_KEY = "bf-theme";
function initTheme() {
  let theme = null;
  try {
    theme = localStorage.getItem(THEME_KEY);
  } catch {}
  if (!theme) {
    theme = window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  applyTheme(theme);
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (btnTheme) btnTheme.textContent = theme === "dark" ? "☀" : "🌙";
}
function toggleTheme() {
  const next =
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "light"
      : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {}
}

function formatExpressionForDisplay(expr) {
  let out = "";
  for (const ch of expr) {
    out += OP_DISPLAY[ch] ?? ch;
  }
  return out;
}

function render() {
  exprEl.textContent = formatExpressionForDisplay(state.expression);
  resultEl.textContent = state.result;
  resultEl.classList.toggle(
    "is-empty",
    state.phase === "empty" && state.result === "0",
  );
  resultEl.classList.toggle("is-error", state.phase === "error");
}

function lastToken(expr) {
  if (expr.length === 0) return null;
  let i = expr.length - 1;
  const lastCh = expr[i];
  if (OPS.has(lastCh)) {
    return { kind: "op", value: lastCh, startIdx: i };
  }
  while (i >= 0) {
    const c = expr[i];
    if ((c >= "0" && c <= "9") || c === ".") {
      i -= 1;
    } else {
      break;
    }
  }
  const startIdx = i + 1;
  return { kind: "num", value: expr.slice(startIdx), startIdx };
}

function pushDigit(d) {
  if (state.phase === "evaluated" || state.phase === "error") {
    state.expression = "";
    state.phase = "empty";
  }
  const last = lastToken(state.expression);
  if (last && last.kind === "num" && last.value === "0") {
    if (d === "0") {
      return setEntering();
    }
    state.expression = state.expression.slice(0, last.startIdx) + d;
    return setEntering();
  }
  state.expression += d;
  setEntering();
}

function pushDot() {
  if (state.phase === "evaluated" || state.phase === "error") {
    state.expression = "";
    state.phase = "empty";
  }
  const last = lastToken(state.expression);
  if (!last || last.kind === "op") {
    state.expression += "0.";
  } else {
    if (last.value.includes(".")) return;
    state.expression += ".";
  }
  setEntering();
}

function pushOp(op) {
  if (state.phase === "error") {
    state.expression = "";
    state.phase = "empty";
    state.result = "0";
    render();
    return;
  }
  if (state.phase === "evaluated") {
    state.expression = state.result;
    state.phase = "entering";
  }
  if (state.expression.length === 0) {
    return;
  }
  const last = lastToken(state.expression);
  if (last && last.kind === "op") {
    state.expression =
      state.expression.slice(0, state.expression.length - 1) + op;
  } else if (last && last.kind === "num" && last.value.endsWith(".")) {
    state.expression += "0" + op;
  } else {
    state.expression += op;
  }
  setEntering();
}

function backspace() {
  if (state.phase === "evaluated") {
    return;
  }
  if (state.phase === "error") {
    clearAll();
    return;
  }
  if (state.expression.length === 0) {
    return;
  }
  state.expression = state.expression.slice(0, -1);
  if (state.expression.length === 0) {
    state.phase = "empty";
    state.result = "0";
    render();
    return;
  }
  setEntering();
}

function clearAll() {
  state.expression = "";
  state.result = "0";
  state.phase = "empty";
  try {
    store.clearLast();
  } catch {}
  render();
}

function equalsKey() {
  if (state.expression.length === 0) {
    return;
  }
  const last = lastToken(state.expression);
  if (!last || last.kind === "op") return;
  if (last.kind === "num" && last.value.endsWith(".")) {
    state.expression += "0";
  }
  let value;
  try {
    value = evaluate(state.expression);
  } catch {
    state.phase = "error";
    state.result = "Error";
    render();
    return;
  }
  if (!Number.isFinite(value)) {
    state.phase = "error";
    state.result = "Error";
    render();
    return;
  }
  const display = String(value);
  if (display.length > 16) {
    state.phase = "error";
    state.result = "Error";
    render();
    return;
  }
  state.result = display;
  state.phase = "evaluated";
  try {
    store.saveLast(display);
  } catch {}
  render();
}

function setEntering() {
  state.phase = "entering";
  const last = lastToken(state.expression);
  if (last && last.kind === "num" && last.value.length > 0) {
    state.result = last.value;
  } else {
    state.result = "0";
  }
  render();
}

function dispatch(key) {
  if (key == null) return;
  if (key >= "0" && key <= "9") {
    pushDigit(key);
    return;
  }
  if (key === ".") {
    pushDot();
    return;
  }
  if (OPS.has(key)) {
    pushOp(key);
    return;
  }
  if (key === "=") {
    equalsKey();
    return;
  }
  if (key === "backspace") {
    backspace();
    return;
  }
  if (key === "C") {
    clearAll();
    return;
  }
}

keypadEl.addEventListener("click", (e) => {
  const target = e.target.closest("[data-key]");
  if (!target) return;
  dispatch(target.dataset.key);
});

btnTheme?.addEventListener("click", toggleTheme);

function buttonForKey(key) {
  return keypadEl.querySelector(`[data-key="${key}"]`);
}
function flashKey(key) {
  const btn = buttonForKey(key);
  if (!btn) return;
  btn.classList.add("is-active");
  setTimeout(() => btn.classList.remove("is-active"), 100);
}

document.addEventListener("keydown", (e) => {
  const ae = document.activeElement;
  if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;

  let mapped = null;
  if (e.key >= "0" && e.key <= "9") mapped = e.key;
  else if (e.key === ".") mapped = ".";
  else if (e.key === "+") mapped = "+";
  else if (e.key === "-") mapped = "-";
  else if (e.key === "*") mapped = "*";
  else if (e.key === "/") mapped = "/";
  else if (e.key === "=" || e.key === "Enter") {
    mapped = "=";
    e.preventDefault();
  } else if (e.key === "Escape" || e.key === "Delete") {
    mapped = "C";
  } else if (e.key === "Backspace") {
    mapped = "backspace";
    e.preventDefault();
  }

  if (mapped == null) return;
  dispatch(mapped);
  flashKey(mapped);
});

initTheme();

// AC2: 새로고침 시 마지막 결과 복원
const lastRaw = store.loadLast();
if (lastRaw != null) {
  state.result = lastRaw;
  state.phase = "evaluated";
  state.expression = "";
}
render();
