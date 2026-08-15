/* BF-2085 · 뽀모도로 타이머
 * 명세: docs/plans/BF-2083/implementation-plan.md §1(상태 전이표) / §2(순수 함수 시그니처) / §3(UI 계약, frozen)
 *
 * nextPhase(state) / formatTime(seconds) 는 부수효과 없는 순수 함수다 (§2).
 * 이 파일은 file:// CORS 안전을 위해 <script type="module"> / import·export
 * 키워드를 사용하지 않는다 (pomodoro/package.json: "type": "commonjs").
 * Node 단위 테스트에서는 module.exports 로 로드한다.
 */

"use strict";

var PHASE_DURATIONS = {
  focus: 1500,
  "short-break": 300,
  "long-break": 900,
};

// ─────────────────────── §2.1 nextPhase ───────────────────────
function nextPhase(state) {
  if (state.phase === "focus") {
    var completedCount = state.cycleCount + 1;
    var isLongBreak = completedCount % 4 === 0;
    return {
      phase: isLongBreak ? "long-break" : "short-break",
      cycleCount: completedCount,
      remainingSeconds: isLongBreak ? PHASE_DURATIONS["long-break"] : PHASE_DURATIONS["short-break"],
    };
  }

  // short-break | long-break → focus로 복귀, cycleCount 불변
  return {
    phase: "focus",
    cycleCount: state.cycleCount,
    remainingSeconds: PHASE_DURATIONS.focus,
  };
}

// ─────────────────────── §2.2 formatTime ───────────────────────
function formatTime(seconds) {
  var safeSeconds = Number.isFinite(seconds) ? Math.trunc(seconds) : 0;
  if (safeSeconds < 0) {
    safeSeconds = 0;
  }
  var minutes = Math.floor(safeSeconds / 60);
  var secs = safeSeconds % 60;
  var pad = function (n) {
    return n < 10 ? "0" + n : String(n);
  };
  return pad(minutes) + ":" + pad(secs);
}

// ─────────────────────── tick — nextPhase 합성 (1초 경과) ───────────────────────
function tick(state) {
  if (!state.isRunning) {
    return state;
  }

  if (state.remainingSeconds > 1) {
    return Object.assign({}, state, { remainingSeconds: state.remainingSeconds - 1 });
  }

  var transitioned = nextPhase({ phase: state.phase, cycleCount: state.cycleCount });
  return Object.assign({}, state, transitioned);
}

function createInitialState() {
  return { phase: "focus", cycleCount: 0, remainingSeconds: PHASE_DURATIONS.focus, isRunning: false };
}

// ─────────────────────── createTimerEngine — 주입 가능한 clock ───────────────────────
function createTimerEngine(options) {
  options = options || {};
  var scheduleInterval = options.setInterval || setInterval;
  var cancelInterval = options.clearInterval || clearInterval;
  var onChange = options.onChange || function () {};

  var state = createInitialState();
  var intervalId = null;

  function emit() {
    onChange(state);
  }

  function start() {
    if (state.isRunning) {
      return;
    }
    state = Object.assign({}, state, { isRunning: true });
    intervalId = scheduleInterval(function () {
      state = tick(state);
      emit();
    }, 1000);
    emit();
  }

  function pause() {
    if (!state.isRunning) {
      return;
    }
    if (intervalId !== null) {
      cancelInterval(intervalId);
      intervalId = null;
    }
    state = Object.assign({}, state, { isRunning: false });
    emit();
  }

  function reset() {
    if (intervalId !== null) {
      cancelInterval(intervalId);
      intervalId = null;
    }
    state = createInitialState();
    emit();
  }

  function getState() {
    return state;
  }

  return { start: start, pause: pause, reset: reset, getState: getState };
}

// Node(node --test)에서 require() 로 로드할 수 있도록 export.
// 브라우저에서는 module 이 정의되지 않으므로 이 블록은 실행되지 않는다.
if (typeof module === "object" && module && module.exports) {
  module.exports = {
    nextPhase: nextPhase,
    formatTime: formatTime,
    tick: tick,
    createInitialState: createInitialState,
    createTimerEngine: createTimerEngine,
  };
}

// ─────────────────────── DOM 제어 로직 (브라우저 전용) ───────────────────────
if (typeof document !== "undefined") {
  (function () {
    var PHASE_LABEL = {
      focus: "집중",
      "short-break": "짧은 휴식",
      "long-break": "긴 휴식",
    };

    var PHASE_MODE_CLASS = {
      focus: "mode-focus",
      "short-break": "mode-short-break",
      "long-break": "mode-long-break",
    };

    var $ = function (id) {
      return document.getElementById(id);
    };

    var el = {
      timer: document.querySelector(".timer"),
      display: $("timer-display"),
      mode: $("timer-mode"),
      count: $("timer-count"),
      startButton: $("btn-start"),
      pauseButton: $("btn-pause"),
      resetButton: $("btn-reset"),
    };

    function render(state) {
      el.timer.classList.remove("mode-focus", "mode-short-break", "mode-long-break");
      el.timer.classList.add(PHASE_MODE_CLASS[state.phase]);

      el.mode.textContent = PHASE_LABEL[state.phase];
      el.display.textContent = formatTime(state.remainingSeconds);
      el.count.textContent = String(state.cycleCount);

      el.startButton.disabled = state.isRunning;
      el.pauseButton.disabled = !state.isRunning;
    }

    var engine = createTimerEngine({ onChange: render });

    el.startButton.addEventListener("click", engine.start);
    el.pauseButton.addEventListener("click", engine.pause);
    el.resetButton.addEventListener("click", engine.reset);

    render(engine.getState());
  })();
}
