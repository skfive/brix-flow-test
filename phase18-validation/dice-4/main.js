/* BF-900 · 주사위 통계 검증 페이지(dice-4) 엔트리
 * 디자인 SSOT: docs/design/dice-4-BF-897.md §5(컴포넌트)/§6(dev 가이드)
 *
 * 의존: phase18-validation/dice-4/stats.js (globalThis.Dice4Stats 로 노출)
 * file:// CORS 안전(§6.4): IIFE — import/export, fetch, 외부 CDN 0건.
 * 범위 축소: 히스토리·전체삭제 모달·localStorage 영속화 제외. bf-theme 테마 키만 예외.
 */
(function () {
  "use strict";

  /* ── 의존 모듈 ── */
  var Stats = globalThis.Dice4Stats;
  if (!Stats) {
    console.error("[dice-4] stats.js 가 main.js 보다 먼저 로드돼야 합니다.");
    return;
  }

  /* ── 상수 ── */
  var DICE_GLYPHS = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  var ROLL_STEP_MS = 120;
  var ROLL_STEPS = 3; /* total 360ms — §5.3 */
  var COUNT_MIN = 1;
  var COUNT_MAX = 5;
  var COUNT_DEFAULT = 2;
  var THEME_KEY = "bf-theme";

  /* ── DOM 캐싱 ── */
  var $ = function (id) {
    return document.getElementById(id);
  };
  var diceBoxEl = $("dice-box");
  var rollBtn = $("btn-roll");
  var themeBtn = $("theme-toggle");
  var statSumEl = $("stat-sum");
  var statAvgEl = $("stat-avg");
  var statMaxEl = $("stat-max");
  var statsCardEl = statSumEl.closest(".stats-card");
  var diceCountBtns = document.querySelectorAll(".dice-count__btn");

  /* reduced motion 감지 */
  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── 상태 ── */
  var state = {
    diceCount: COUNT_DEFAULT, /* 1~5 */
    rolls: null, /* 현재 표시 중인 굴림 결과 [n, ...] 또는 null(초기) */
    isRolling: false,
  };

  /* ── helpers ── */
  function glyph(n) {
    return DICE_GLYPHS[n - 1];
  }

  /* ── render ── */
  function renderDice(rolls) {
    diceBoxEl.innerHTML = "";
    for (var i = 0; i < rolls.length; i += 1) {
      var span = document.createElement("span");
      span.className = "dice";
      span.setAttribute("role", "img");
      span.setAttribute("aria-label", "주사위 " + rolls[i]);
      span.textContent = glyph(rolls[i]);
      diceBoxEl.appendChild(span);
    }
  }
  function renderEmptyDice() {
    /* 초기 표시 — 선택된 diceCount 만큼 ⚀ placeholder */
    var initial = [];
    for (var i = 0; i < state.diceCount; i += 1) initial.push(1);
    renderDice(initial);
  }

  function renderStats() {
    if (!state.rolls) {
      statSumEl.textContent = "--";
      statAvgEl.textContent = "--";
      statMaxEl.textContent = "--";
      statsCardEl.classList.add("is-empty");
      return;
    }
    var stats = Stats.computeStats(state.rolls);
    statSumEl.textContent = String(stats.sum);
    statAvgEl.textContent = stats.avg.toFixed(1);
    statMaxEl.textContent = String(stats.max);
    statsCardEl.classList.remove("is-empty");
  }

  function renderDiceCountButtons() {
    diceCountBtns.forEach(function (btn) {
      var n = Number(btn.getAttribute("data-count"));
      var checked = n === state.diceCount;
      btn.setAttribute("aria-checked", checked ? "true" : "false");
    });
  }

  function render() {
    renderDiceCountButtons();
    if (state.rolls) {
      renderDice(state.rolls);
    } else {
      renderEmptyDice();
    }
    renderStats();
  }

  /* ── 굴림 행위 ── */
  function commitRoll(rolls) {
    state.rolls = rolls.slice();
    state.isRolling = false;
    diceBoxEl.classList.remove("is-rolling");
    rollBtn.disabled = false;
    render();
  }

  function handleRoll() {
    if (state.isRolling) return;
    state.isRolling = true;
    rollBtn.disabled = true;
    diceBoxEl.classList.add("is-rolling");

    /* 최종 결과를 미리 결정 (§5.4) */
    var finalRolls = [];
    for (var i = 0; i < state.diceCount; i += 1) {
      finalRolls.push(Stats.rollOne());
    }

    if (prefersReducedMotion) {
      commitRoll(finalRolls);
      return;
    }

    /* 3 swap × 120ms — 시각 시그널 */
    var step = 0;
    var ticker = setInterval(function () {
      step += 1;
      if (step < ROLL_STEPS) {
        var preview = [];
        for (var j = 0; j < state.diceCount; j += 1) preview.push(Stats.rollOne());
        renderDice(preview);
      } else {
        clearInterval(ticker);
        commitRoll(finalRolls);
      }
    }, ROLL_STEP_MS);
  }

  /* ── 주사위 개수 변경 ── */
  function setDiceCount(n) {
    if (n < COUNT_MIN || n > COUNT_MAX) return;
    if (n === state.diceCount) return;
    state.diceCount = n;
    /* 개수 변경 시 현재 통계 초기화 (옛 굴림과 개수 mismatch 방지 · §5.2) */
    state.rolls = null;
    render();
  }

  /* ── 테마 토글 (원본 dice/ 동일 패턴) ── */
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

  /* ── 이벤트 와이어링 ── */
  rollBtn.addEventListener("click", handleRoll);
  themeBtn.addEventListener("click", toggleTheme);

  diceCountBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var n = Number(btn.getAttribute("data-count"));
      setDiceCount(n);
    });
  });

  /* ── 부팅 ── */
  applyTheme(getTheme());
  render();
})();
