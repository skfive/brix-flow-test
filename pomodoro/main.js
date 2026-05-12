/* BF-432 · 뽀모도로 SPA 엔트리
 * 명세: docs/design/pomodoro-BF-430.md
 * 의존: pomodoro/storage.js, pomodoro/timer.js (globalThis 에 노출됨)
 *
 * file:// CORS 안전을 위해 IIFE — ES module import/export 키워드, 외부 CDN,
 * fetch self-load 0건. 모든 의존 모듈은 비-module <script> 로 미리 로드된
 * globalThis.PomodoroStorage / globalThis.PomodoroTimer 를 참조.
 */
(function () {
  "use strict";

  // ─────────── 의존 모듈 (비-module 로 미리 로드됨) ───────────
  var Storage = globalThis.PomodoroStorage;
  var Timer = globalThis.PomodoroTimer;
  if (!Storage || !Timer) {
    // 페이지 부팅 실패 — script 순서 오류
    console.error(
      "[pomodoro] storage.js / timer.js 가 main.js 보다 먼저 로드돼야 합니다.",
    );
    return;
  }

  var MODES = Timer.MODES;
  var DURATIONS = Timer.DURATIONS;
  var CYCLES_PER_LONG_BREAK = Timer.CYCLES_PER_LONG_BREAK;

  // ─────────── DOM 캐싱 ───────────
  var $ = function (id) {
    return document.getElementById(id);
  };
  var cardEl = $("pomodoro-card");
  var modeBadgeEl = $("mode-badge");
  var modeLabelEl = $("mode-label");
  var cycleDotsEl = $("cycle-dots");
  var dispMEl = $("disp-m");
  var dispSEl = $("disp-s");
  var countdownEl = $("countdown");
  var btnPrimary = $("btn-primary");
  var btnReset = $("btn-reset");
  var btnSkip = $("btn-skip");
  var btnTheme = $("theme-toggle");
  var cycleNEl = $("cycle-n");
  var cycleCounterEl = $("cycle-counter");
  var focusTotalValueEl = $("focus-total-value");
  var toastStackEl = $("toast-stack");

  // ─────────── store ───────────
  var store;
  try {
    store = Storage.createPomodoroStore();
  } catch (_e) {
    // localStorage 사용 불가 — memory adapter 로 fallback (영속성만 포기, UX 유지)
    store = Storage.createPomodoroStore(Storage.createMemoryStorage());
  }

  // ─────────── 상태 ───────────
  /**
   * phase: "idle" | "running" | "paused"
   * mode: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK"
   * currentCycle: 1..CYCLES_PER_LONG_BREAK
   * remainingMs: 남은 ms (running 중 tick 시 차감)
   */
  var state = {
    phase: "idle",
    mode: MODES.FOCUS,
    currentCycle: 1,
    remainingMs: DURATIONS.FOCUS,
    tickStart: 0,
    rafId: null,
  };

  var debugSpeed = 1;
  try {
    debugSpeed = store.loadDebugSpeed();
  } catch (_e) {
    debugSpeed = 1;
  }

  var stats = null; // { date, focusMsToday }

  // ─────────── 테마 ───────────
  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    btnTheme.textContent = theme === "dark" ? "☀" : "🌙";
    btnTheme.setAttribute(
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
      // silent
    }
  }

  // ─────────── 사이클 dot 렌더 ───────────
  function renderCycleDots() {
    var nodes = cycleDotsEl.querySelectorAll(".dot");
    var done = 0;
    for (var i = 0; i < nodes.length; i++) {
      var idx = i + 1; // 1..4
      var node = nodes[i];
      node.classList.remove("dot--done", "dot--current", "dot--empty");
      if (state.mode === MODES.LONG_BREAK) {
        // 4개 모두 채움 (사이클 완료 상태)
        node.classList.add("dot--done");
        done = CYCLES_PER_LONG_BREAK;
        continue;
      }
      if (state.mode === MODES.SHORT_BREAK) {
        // 직전 FOCUS 완료 분까지 채움
        if (idx <= state.currentCycle) {
          node.classList.add("dot--done");
          done++;
        } else {
          node.classList.add("dot--empty");
        }
        continue;
      }
      // FOCUS
      if (idx < state.currentCycle) {
        node.classList.add("dot--done");
        done++;
      } else if (idx === state.currentCycle) {
        node.classList.add("dot--current");
      } else {
        node.classList.add("dot--empty");
      }
    }
    cycleDotsEl.setAttribute(
      "aria-label",
      "사이클 진행: " + CYCLES_PER_LONG_BREAK + "개 중 " + done + "개 완료",
    );
  }

  // ─────────── display 렌더 ───────────
  function renderDisplay() {
    var out = Timer.msToMmSs(state.remainingMs);
    dispMEl.textContent = Timer.pad2(out.minutes);
    dispSEl.textContent = Timer.pad2(out.seconds);
    countdownEl.classList.toggle("is-paused", state.phase === "paused");
  }

  // ─────────── 컨트롤 렌더 ───────────
  function renderControls() {
    if (state.phase === "running") {
      btnPrimary.textContent = "⏸ Pause";
      btnPrimary.setAttribute("aria-label", "일시정지");
    } else if (state.phase === "paused") {
      btnPrimary.textContent = "▶ Resume";
      btnPrimary.setAttribute("aria-label", "재개");
    } else {
      btnPrimary.textContent = "▶ Start";
      btnPrimary.setAttribute("aria-label", "시작");
    }
  }

  // ─────────── 사이클 카운터 ───────────
  function renderCycleCounter() {
    if (state.mode === MODES.LONG_BREAK) {
      cycleCounterEl.innerHTML =
        '<span class="cycle-counter__n" id="cycle-n">사이클 완료</span> · LONG BREAK';
    } else {
      cycleCounterEl.innerHTML =
        '사이클 <span class="cycle-counter__n" id="cycle-n">' +
        state.currentCycle +
        "</span> / " +
        CYCLES_PER_LONG_BREAK;
    }
  }

  // ─────────── 모드 배지 ───────────
  function renderModeBadge() {
    modeLabelEl.textContent = Timer.labelFor(state.mode);
  }

  // ─────────── 누적 집중 시간 (자정 리셋) ───────────
  function ensureStatsForToday(nowMs) {
    var today = Timer.localDateKey(nowMs);
    if (!stats || stats.date !== today) {
      stats = { date: today, focusMsToday: 0 };
      try {
        store.saveStats(stats);
      } catch (_e) {
        // silent
      }
    }
    return stats;
  }

  function renderFocusTotal() {
    var nowMs = Date.now();
    var s = ensureStatsForToday(nowMs);
    focusTotalValueEl.textContent = Timer.formatFocusTotal(s.focusMsToday);
  }

  function addFocusMs(addMs) {
    var nowMs = Date.now();
    stats = Timer.accumulateFocusMs(stats, addMs, nowMs);
    try {
      store.saveStats(stats);
    } catch (_e) {
      // silent
    }
    renderFocusTotal();
  }

  // ─────────── card / 전체 렌더 ───────────
  function render() {
    cardEl.setAttribute("data-mode", state.mode);
    renderModeBadge();
    renderCycleDots();
    renderDisplay();
    renderControls();
    renderCycleCounter();
    renderFocusTotal();
  }

  // ─────────── persist (새로고침 복원) ───────────
  function persist() {
    try {
      // running 중에는 marker 만 저장하고, 복원 시 paused 로 전환 (백그라운드 동작 정확성 보장 불가)
      store.saveState({
        mode: state.mode,
        phase: state.phase === "running" ? "paused" : state.phase,
        currentCycle: state.currentCycle,
        remainingMs: Math.max(0, Math.trunc(state.remainingMs)),
        savedAtMs: Date.now(),
      });
    } catch (_e) {
      // silent
    }
  }

  // ─────────── toast ───────────
  function showToast(message, modeForColor) {
    var toast = document.createElement("div");
    toast.className = "toast";
    if (modeForColor) toast.setAttribute("data-mode", modeForColor);
    toast.textContent = message;
    toastStackEl.appendChild(toast);
    // mount → 다음 frame 에 is-visible 토글 (transition 트리거)
    requestAnimationFrame(function () {
      toast.classList.add("is-visible");
    });
    setTimeout(function () {
      toast.classList.remove("is-visible");
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 3500);
  }

  // ─────────── 모드 전환 (자동 / Skip 공통) ───────────
  function transitionToNext(opts) {
    opts = opts || {};
    var prevMode = state.mode;
    var prevCycle = state.currentCycle;
    var next = Timer.nextPhase(prevMode, prevCycle);

    // §6.4 fade+scale: 220ms 동안 .mode-zone 의 opacity/scale 0 → DOM 교체 → 1
    cardEl.setAttribute("data-transitioning", "true");

    var swap = function () {
      state.mode = next.mode;
      state.currentCycle = next.currentCycle;
      state.remainingMs = Timer.durationFor(state.mode);
      // 자동 진행 (§6.1): skip / 0:00 도달 모두 즉시 running
      state.phase = opts.startNewMode === false ? "idle" : "running";
      render();
      // 1프레임 뒤에 transitioning 해제 → 새 색·라벨이 fade-in
      requestAnimationFrame(function () {
        cardEl.removeAttribute("data-transitioning");
        if (state.phase === "running") {
          state.tickStart = performance.now();
          scheduleTick();
        }
      });
      // toast 알림 (Notification API 금지 — 명세 §1.3)
      if (prevMode !== next.mode) {
        showToast(toastMessage(prevMode, next.mode), next.mode);
      }
      persist();
    };

    // prefers-reduced-motion 시 transition 0ms — 그래도 1프레임만 기다림 (DOM 갱신 안정)
    setTimeout(swap, 220);
  }

  function toastMessage(prevMode, nextMode) {
    if (prevMode === MODES.FOCUS && nextMode === MODES.SHORT_BREAK) {
      return "집중 완료! 5분 휴식하세요.";
    }
    if (prevMode === MODES.FOCUS && nextMode === MODES.LONG_BREAK) {
      return "4사이클 완료! 15분 긴 휴식하세요.";
    }
    if (prevMode === MODES.SHORT_BREAK && nextMode === MODES.FOCUS) {
      return "휴식 종료. 다음 집중 시작!";
    }
    if (prevMode === MODES.LONG_BREAK && nextMode === MODES.FOCUS) {
      return "긴 휴식 종료. 새 사이클 시작!";
    }
    return Timer.labelFor(nextMode) + " 시작";
  }

  // ─────────── 액션 ───────────
  function startOrToggle() {
    if (state.phase === "running") {
      pause();
      return;
    }
    if (state.phase === "paused" || state.phase === "idle") {
      state.phase = "running";
      state.tickStart = performance.now();
      persist();
      render();
      scheduleTick();
    }
  }

  function pause() {
    if (state.phase !== "running") return;
    var now = performance.now();
    var elapsed = (now - state.tickStart) * debugSpeed;
    // FOCUS 중 일시정지 → 그 동안 흐른 시간만큼 누적 집중 시간 증가
    if (state.mode === MODES.FOCUS) {
      addFocusMs(Math.min(elapsed, state.remainingMs));
    }
    state.remainingMs = Math.max(0, state.remainingMs - elapsed);
    state.tickStart = 0;
    cancelTick();
    state.phase = "paused";
    persist();
    render();
  }

  function reset() {
    cancelTick();
    // 명세 §6.1: Reset 은 현재 모드 시간만 리셋, 사이클 유지
    state.remainingMs = Timer.durationFor(state.mode);
    state.phase = "idle";
    state.tickStart = 0;
    persist();
    render();
  }

  function skip() {
    cancelTick();
    // FOCUS 도중 skip → 그동안 흐른 시간 누적 (남은 시간만큼 빼고 나머지)
    if (state.phase === "running" && state.mode === MODES.FOCUS) {
      var now = performance.now();
      var elapsed = (now - state.tickStart) * debugSpeed;
      addFocusMs(Math.min(elapsed, state.remainingMs));
    }
    state.remainingMs = 0;
    transitionToNext();
  }

  // ─────────── tick loop (§6.5) ───────────
  function scheduleTick() {
    cancelTick();
    state.rafId = requestAnimationFrame(tick);
  }
  function cancelTick() {
    if (state.rafId != null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
  }
  function tick() {
    if (state.phase !== "running") return;
    var now = performance.now();
    var elapsed = (now - state.tickStart) * debugSpeed;
    state.tickStart = now;

    var consumed = Math.min(elapsed, state.remainingMs);
    if (state.mode === MODES.FOCUS && consumed > 0) {
      addFocusMs(consumed);
    }
    state.remainingMs = Math.max(0, state.remainingMs - elapsed);

    if (state.remainingMs <= 0) {
      cancelTick();
      transitionToNext();
      return;
    }
    // 매 frame textContent 만 갱신 (re-render 비용 최소)
    var out = Timer.msToMmSs(state.remainingMs);
    dispMEl.textContent = Timer.pad2(out.minutes);
    dispSEl.textContent = Timer.pad2(out.seconds);
    state.rafId = requestAnimationFrame(tick);
  }

  // ─────────── 이벤트 ───────────
  btnPrimary.addEventListener("click", startOrToggle);
  btnReset.addEventListener("click", reset);
  btnSkip.addEventListener("click", skip);
  btnTheme.addEventListener("click", toggleTheme);

  document.addEventListener("keydown", function (e) {
    // 입력 요소 focus 가 없는 페이지이므로 충돌 0 — 명세 §6.3
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      startOrToggle();
      return;
    }
    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      reset();
      return;
    }
    if (e.key === "s" || e.key === "S") {
      e.preventDefault();
      skip();
      return;
    }
    if (e.key === "t" || e.key === "T") {
      e.preventDefault();
      toggleTheme();
      return;
    }
  });

  // 페이지 닫힘/탭 전환 시 상태 저장 (복원 정확성)
  window.addEventListener("beforeunload", persist);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") persist();
  });

  // 매 분 자정 경계 체크 (자정 리셋)
  setInterval(function () {
    var nowMs = Date.now();
    if (stats && !Timer.isSameLocalDay(stats.savedAtMs || nowMs, nowMs)) {
      stats = { date: Timer.localDateKey(nowMs), focusMsToday: 0 };
      try {
        store.saveStats(stats);
      } catch (_e) {
        // silent
      }
      renderFocusTotal();
    } else if (!stats) {
      ensureStatsForToday(nowMs);
      renderFocusTotal();
    } else {
      // 같은 날이지만 라벨 신선도 유지 (시간 단위 변환)
      renderFocusTotal();
    }
  }, 30_000);

  // ─────────── 부팅 ───────────
  applyTheme(getTheme());

  // 누적 집중 시간 로드 + 자정 리셋 적용
  try {
    var loadedStats = store.loadStats();
    var nowMsBoot = Date.now();
    if (loadedStats && loadedStats.date === Timer.localDateKey(nowMsBoot)) {
      stats = loadedStats;
    } else {
      stats = { date: Timer.localDateKey(nowMsBoot), focusMsToday: 0 };
      store.saveStats(stats);
    }
  } catch (_e) {
    stats = { date: Timer.localDateKey(Date.now()), focusMsToday: 0 };
  }

  // 상태 복원 (새로고침)
  try {
    var saved = store.loadState();
    if (saved) {
      state.mode = saved.mode;
      state.currentCycle = saved.currentCycle;
      // 명세상 백그라운드 정확성 보장 불가 — 복원 시 paused / idle 유지
      state.phase = saved.phase === "running" ? "paused" : saved.phase;
      state.remainingMs = saved.remainingMs;
      if (state.remainingMs <= 0) {
        // 만료 상태였다면 현재 모드 초기값으로 리셋
        state.remainingMs = Timer.durationFor(state.mode);
        state.phase = "idle";
      }
    }
  } catch (_e) {
    // 복원 실패 → default state 유지
  }

  render();
})();
