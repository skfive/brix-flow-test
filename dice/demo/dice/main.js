/* BF-850 · /demo/dice SPA 엔트리 (렌더 + 클릭/키보드 굴림 + 테마 토글)
 *
 * 의존: ./roll.js (globalThis.DiceDemoRoll — 순수 rollOne/glyph)
 * file:// CORS 안전 (vanilla-static): IIFE — import/export/fetch/외부 CDN 0건.
 * 스타일/토큰은 ../../styles.css (기존 dice/styles.css) 재사용.
 */
(function () {
  "use strict";

  var Roll = globalThis.DiceDemoRoll;
  if (!Roll) {
    console.error("[demo/dice] roll.js 가 main.js 보다 먼저 로드돼야 합니다.");
    return;
  }

  var THEME_KEY = "bf-theme"; /* 다른 SPA 와 공유 */

  var $ = function (id) {
    return document.getElementById(id);
  };
  var diceBoxEl = $("dice-box");
  var resultEl = $("roll-result");
  var rollBtn = $("btn-roll");
  var themeBtn = $("theme-toggle");

  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ROLL_STEP_MS = 120;
  var ROLL_STEPS = 3; /* 3 swap × 120ms — 시각 시그널 */

  var state = {
    value: 1, /* 현재 표시 중인 주사위 눈 (초기 1) */
    isRolling: false,
  };

  /* ── render ── */
  function renderDie(value) {
    diceBoxEl.innerHTML = "";
    var span = document.createElement("span");
    span.className = "dice";
    span.setAttribute("role", "img");
    span.setAttribute("aria-label", "주사위 " + value);
    span.textContent = Roll.glyph(value);
    diceBoxEl.appendChild(span);
    resultEl.textContent = String(value);
  }

  /* ── 굴림 ── */
  function commitRoll(finalValue) {
    state.value = finalValue;
    state.isRolling = false;
    diceBoxEl.classList.remove("is-rolling");
    rollBtn.disabled = false;
    renderDie(finalValue);
  }

  function handleRoll() {
    if (state.isRolling) return;
    state.isRolling = true;
    rollBtn.disabled = true;
    diceBoxEl.classList.add("is-rolling");

    var finalValue = Roll.rollOne();

    if (prefersReducedMotion) {
      commitRoll(finalValue);
      return;
    }

    var step = 0;
    var ticker = setInterval(function () {
      step += 1;
      if (step < ROLL_STEPS) {
        renderDie(Roll.rollOne()); /* preview */
      } else {
        clearInterval(ticker);
        commitRoll(finalValue);
      }
    }, ROLL_STEP_MS);
  }

  /* ── 테마 토글 (dice/main.js 와 동일 패턴) ── */
  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeBtn.textContent = theme === "dark" ? "🌙" : "☀";
    themeBtn.setAttribute(
      "aria-label",
      theme === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환",
    );
  }
  function toggleTheme() {
    var next = getTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (_e) {
      /* silent — private mode 등 */
    }
  }

  /* ── 이벤트 배선 ── */
  rollBtn.addEventListener("click", handleRoll);
  themeBtn.addEventListener("click", toggleTheme);

  /* 전역 키보드: Space/Enter 굴리기 · T 테마 (버튼 focus 시 중복 방지) */
  document.addEventListener("keydown", function (e) {
    var target = e.target;
    if (
      target &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
    ) {
      return;
    }

    if (
      e.key === " " ||
      e.key === "Spacebar" ||
      e.code === "Space" ||
      e.key === "Enter"
    ) {
      /* 버튼이 이미 focused 면 브라우저 기본 click 발동 → 중복 방지 */
      if (target && target.tagName === "BUTTON") return;
      e.preventDefault();
      handleRoll();
    } else if (e.key && e.key.toLowerCase() === "t") {
      e.preventDefault();
      toggleTheme();
    }
  });

  /* ── 부팅 ── */
  applyTheme(getTheme());
  renderDie(state.value); /* 초기 숫자 1 표시 (AC-1) */
})();
