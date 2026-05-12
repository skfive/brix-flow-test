/* BF-448 · 주사위 SPA 엔트리
 * 명세: docs/design/dice-BF-446.md (시각/토큰) + task description (1~5개·10건·재표시·삭제 모달)
 *
 * 의존: dice/storage.js (globalThis.DiceStorage 로 노출됨)
 * file:// CORS 안전 (명세 §6.7 / §9.4): IIFE — import/export, fetch, 외부 CDN 0건.
 */
(function () {
  "use strict";

  /* ── 의존 모듈 ── */
  var Storage = globalThis.DiceStorage;
  if (!Storage) {
    console.error("[dice] storage.js 가 main.js 보다 먼저 로드돼야 합니다.");
    return;
  }

  /* ── 상수 ── */
  var DICE_GLYPHS = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  var ROLL_STEP_MS = 120;
  var ROLL_STEPS = 3; /* total 360ms — 명세 §6.3 */

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
  var historyListEl = $("history-list");
  var historyEmptyEl = $("history-empty");
  var clearHistoryBtn = $("btn-clear-history");
  var diceCountBtns = document.querySelectorAll(".dice-count__btn");

  var modalBackdropEl = $("modal-backdrop");
  var modalConfirmEl = $("modal-confirm");
  var modalCancelEl = $("modal-cancel");

  /* ── store (localStorage 사용 불가 시 memory fallback) ── */
  var store;
  try {
    store = Storage.createDiceStore();
  } catch (_e) {
    store = Storage.createDiceStore(Storage.createMemoryStorage());
  }

  /* reduced motion 감지 */
  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── 상태 ── */
  var state = {
    diceCount: Storage.DICE_COUNT_DEFAULT, /* 1~5 */
    rolls: null, /* 현재 표시 중인 굴림 결과 [n, ...] 또는 null (초기) */
    activeEntryId: null, /* 히스토리에서 선택된 entry id (재표시 강조) */
    history: [], /* 최신이 head, cap 10 */
    isRolling: false,
    nextId: 1, /* pushRoll 시 부여할 id (history 와 무관한 누적 카운터) */
  };

  /* ── helpers ── */
  function rollOne() {
    return 1 + Math.floor(Math.random() * 6);
  }
  function glyph(n) {
    return DICE_GLYPHS[n - 1];
  }
  function computeStats(rolls) {
    var sum = 0;
    var max = rolls[0];
    for (var i = 0; i < rolls.length; i += 1) {
      sum += rolls[i];
      if (rolls[i] > max) max = rolls[i];
    }
    /* 평균은 소수 첫째 자리까지 (명세 §4.5) — 단 표시 변환은 renderStats 가 처리 */
    var avg = sum / rolls.length;
    return { sum: sum, avg: avg, max: max };
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
    var stats = computeStats(state.rolls);
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

  function renderHistory() {
    /* clear (header 와 빈 placeholder li 제외 — list 자체만 갱신) */
    historyListEl.innerHTML = "";

    if (state.history.length === 0) {
      var empty = document.createElement("li");
      empty.className = "history-empty";
      empty.id = "history-empty";
      empty.textContent = "아직 굴림 기록 없음";
      historyListEl.appendChild(empty);
      clearHistoryBtn.disabled = true;
      return;
    }

    clearHistoryBtn.disabled = false;

    for (var i = 0; i < state.history.length; i += 1) {
      var r = state.history[i];
      var li = document.createElement("li");
      li.className = "history-row";
      if (r.id === state.activeEntryId) {
        li.classList.add("is-active");
      }
      li.setAttribute("role", "button");
      li.setAttribute("tabindex", "0");
      li.setAttribute("data-entry-id", String(r.id));
      var rollText = r.rolls.join(", ");
      li.setAttribute(
        "aria-label",
        "#" +
          r.id +
          " · " +
          r.rolls.length +
          "개 굴림: " +
          rollText +
          " · 합 " +
          r.sum +
          " · 클릭하면 다시 표시",
      );

      var glyphs = "";
      for (var g = 0; g < r.rolls.length; g += 1) {
        glyphs += "<span>" + glyph(r.rolls[g]) + "</span>";
      }
      li.innerHTML =
        '<span class="history-row__index">#' +
        r.id +
        "</span>" +
        '<span class="history-row__dice">' +
        glyphs +
        "</span>" +
        '<span class="history-row__sum">합 ' +
        r.sum +
        "</span>";
      historyListEl.appendChild(li);
    }
  }

  function render() {
    renderDiceCountButtons();
    if (state.rolls) {
      renderDice(state.rolls);
    } else {
      renderEmptyDice();
    }
    renderStats();
    renderHistory();
  }

  /* ── 굴림 행위 ── */
  function commitRoll(rolls) {
    var stats = computeStats(rolls);
    var entry = {
      id: state.nextId,
      rolls: rolls.slice(),
      sum: stats.sum,
      avg: Number(stats.avg.toFixed(2)), /* 저장은 소수 2자리까지 (round-trip 안정) */
      max: stats.max,
      ts: Date.now(),
    };
    state.nextId += 1;

    try {
      state.history = store.pushRoll(entry);
    } catch (e) {
      /* validation 실패 시 in-memory 만 갱신 */
      console.error("[dice] storage.pushRoll 실패", e);
      state.history = [entry].concat(state.history).slice(0, Storage.DICE_HISTORY_CAP);
    }
    state.rolls = rolls.slice();
    state.activeEntryId = entry.id;
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

    /* 최종 결과를 미리 결정 (명세 §6.3 패턴) */
    var finalRolls = [];
    for (var i = 0; i < state.diceCount; i += 1) {
      finalRolls.push(rollOne());
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
        for (var j = 0; j < state.diceCount; j += 1) preview.push(rollOne());
        renderDice(preview);
      } else {
        clearInterval(ticker);
        commitRoll(finalRolls);
      }
    }, ROLL_STEP_MS);
  }

  /* ── 주사위 개수 변경 ── */
  function setDiceCount(n) {
    if (n < Storage.DICE_COUNT_MIN || n > Storage.DICE_COUNT_MAX) return;
    if (n === state.diceCount) return;
    state.diceCount = n;
    try {
      store.saveDiceCount(n);
    } catch (_e) {
      /* silent — private mode 등 */
    }
    /* 개수 변경 시 현재 표시는 초기화 (옛 굴림과 개수 mismatch 방지) */
    state.rolls = null;
    state.activeEntryId = null;
    render();
  }

  /* ── 히스토리 row 클릭 재표시 (작업 AC) ── */
  function handleHistoryClick(target) {
    var row = target.closest(".history-row");
    if (!row) return;
    var id = Number(row.getAttribute("data-entry-id"));
    var entry = state.history.find(function (e) {
      return e.id === id;
    });
    if (!entry) return;
    /* 재표시: dice / stats / activeEntryId 갱신 */
    state.rolls = entry.rolls.slice();
    state.activeEntryId = entry.id;
    /* 표시 dice 개수와 selected diceCount 동기화 — 옛 굴림의 개수에 맞춤 */
    if (entry.rolls.length !== state.diceCount) {
      state.diceCount = entry.rolls.length;
      try {
        store.saveDiceCount(entry.rolls.length);
      } catch (_e) {
        /* silent */
      }
    }
    render();
  }

  /* ── 전체 삭제 (확인 모달 경유) ── */
  function openClearModal() {
    if (state.history.length === 0) return;
    modalBackdropEl.hidden = false;
    requestAnimationFrame(function () {
      if (modalConfirmEl) modalConfirmEl.focus();
    });
  }
  function closeClearModal() {
    modalBackdropEl.hidden = true;
    if (clearHistoryBtn && !clearHistoryBtn.disabled) {
      clearHistoryBtn.focus();
    }
  }
  function confirmClear() {
    try {
      store.clearHistory();
    } catch (_e) {
      /* silent */
    }
    state.history = [];
    state.rolls = null;
    state.activeEntryId = null;
    render();
    closeClearModal();
  }

  /* ── 테마 토글 (clicker §6.5 와 동일 패턴) ── */
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
      store.saveTheme(next);
    } catch (_e) {
      /* silent */
    }
  }

  /* ── 이벤트 와이어링 ── */
  rollBtn.addEventListener("click", handleRoll);
  themeBtn.addEventListener("click", toggleTheme);
  clearHistoryBtn.addEventListener("click", openClearModal);

  diceCountBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var n = Number(btn.getAttribute("data-count"));
      setDiceCount(n);
    });
  });

  historyListEl.addEventListener("click", function (e) {
    handleHistoryClick(e.target);
  });
  historyListEl.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
    var row =
      e.target && e.target.closest && e.target.closest(".history-row");
    if (!row) return;
    /* row 재표시 — document 의 전역 Space (handleRoll) 트리거 차단 */
    e.preventDefault();
    e.stopPropagation();
    handleHistoryClick(e.target);
  });

  if (modalCancelEl) modalCancelEl.addEventListener("click", closeClearModal);
  if (modalConfirmEl) modalConfirmEl.addEventListener("click", confirmClear);
  if (modalBackdropEl) {
    modalBackdropEl.addEventListener("click", function (e) {
      if (e.target === modalBackdropEl) closeClearModal();
    });
  }

  /* 키보드 단축 (명세 §6.2 + 작업 AC: 1~5 개수 단축) */
  document.addEventListener("keydown", function (e) {
    var target = e.target;
    if (
      target &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
    ) {
      return;
    }

    /* 모달 열림 시: Esc → 취소, Enter → confirm */
    if (modalBackdropEl && !modalBackdropEl.hidden) {
      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        closeClearModal();
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirmClear();
      }
      return;
    }

    var key = e.key.toLowerCase();
    if (e.key === " " || e.key === "Spacebar" || e.code === "Space") {
      /* 버튼이 이미 focused 면 브라우저 기본 click 발동 → 중복 방지 */
      if (target && target.tagName === "BUTTON") return;
      e.preventDefault();
      handleRoll();
    } else if (key >= "1" && key <= "5") {
      e.preventDefault();
      setDiceCount(Number(key));
    } else if (key === "t") {
      e.preventDefault();
      toggleTheme();
    }
  });

  /* ── 부팅 ── */
  applyTheme(getTheme());

  try {
    state.diceCount = store.loadDiceCount();
    state.history = store.loadHistory();
  } catch (_e) {
    state.diceCount = Storage.DICE_COUNT_DEFAULT;
    state.history = [];
  }

  /* nextId 는 history 의 최대 id + 1 (collision 회피) */
  if (state.history.length > 0) {
    var maxId = 0;
    for (var i = 0; i < state.history.length; i += 1) {
      if (state.history[i].id > maxId) maxId = state.history[i].id;
    }
    state.nextId = maxId + 1;
    /* 새로고침 복원: 가장 최근 굴림 (history[0]) 을 dice-box 와 통계에 표시 */
    var head = state.history[0];
    state.rolls = head.rolls.slice();
    state.activeEntryId = head.id;
    /* diceCount 와 head 의 rolls 길이가 다르면 head 기준으로 동기화 (모순 회피) */
    if (head.rolls.length !== state.diceCount) {
      state.diceCount = head.rolls.length;
    }
  }

  render();
})();
