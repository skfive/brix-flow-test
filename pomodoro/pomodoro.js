/* BF-2007 · 뽀모도로 타이머
 * 명세: docs/plans/BF-2005/implementation-plan.md §4(상태 전이표) / §5(순수 함수) / §6(설정 검증) / §7(UI 계약)
 *
 * tick(state) / formatTime(seconds) 는 부수효과 없는 순수 함수다 (§5).
 * 이 파일은 file:// CORS 안전을 위해 <script type="module"> / import·export
 * 키워드를 사용하지 않는다 (pomodoro/timer.js, pomodoro/storage.js 의 기존 관례와 동일한 이유,
 * AC: "index.html을 file://로 열면 외부 의존성 없이 동작한다"). Node 단위 테스트에서는
 * module.exports 로 로드한다 (pomodoro/package.json: "type": "commonjs").
 */

"use strict";

// ─────────────────────── §5.2 formatTime ───────────────────────
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

// ─────────────────────── §5.1 tick ───────────────────────
function tick(state) {
  if (state.mode !== "focus" && state.mode !== "break") {
    // 계약 위반(idle/paused 상태에서 호출) — 방어적으로 입력을 그대로 반환한다.
    return state;
  }

  if (state.remainingSeconds > 0) {
    return Object.assign({}, state, {
      remainingSeconds: state.remainingSeconds - 1,
    });
  }

  // remainingSeconds === 0 → §4.2 자동 완료 전이
  if (state.mode === "focus") {
    return Object.assign({}, state, {
      mode: "break",
      remainingSeconds: state.breakDurationMinutes * 60,
      sessionCount: state.sessionCount + 1,
    });
  }

  // mode === "break" → focus 로 복귀, sessionCount 불변
  return Object.assign({}, state, {
    mode: "focus",
    remainingSeconds: state.focusDurationMinutes * 60,
  });
}

// ─────────────────────── §6 설정 값 검증 ───────────────────────
// 순수 함수 — DOM 접근 없이 원시 입력값을 검증한다. 1~60 사이 정수만 유효.
function validateDurationInput(rawValue) {
  var trimmed = typeof rawValue === "string" ? rawValue.trim() : rawValue;
  if (trimmed === "" || trimmed === null || typeof trimmed === "undefined") {
    return { valid: false, error: "1~60 사이의 정수를 입력하세요." };
  }
  var n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > 60) {
    return { valid: false, error: "1~60 사이의 정수를 입력하세요." };
  }
  return { valid: true, value: n };
}

// Node(node --test)에서 require() 로 로드할 수 있도록 export.
// 브라우저에서는 module 이 정의되지 않으므로 이 블록은 실행되지 않는다.
if (typeof module === "object" && module && module.exports) {
  module.exports = { tick: tick, formatTime: formatTime, validateDurationInput: validateDurationInput };
}

// ─────────────────────── DOM 제어 로직 (브라우저 전용) ───────────────────────
if (typeof document !== "undefined") {
  (function () {
    var DEFAULT_FOCUS_MINUTES = 25;
    var DEFAULT_BREAK_MINUTES = 5;

    var STATUS_TEXT = {
      idle: "대기 중",
      focus: "집중 중",
      break: "휴식 중",
      paused: "일시정지됨",
    };

    var $ = function (id) {
      return document.getElementById(id);
    };

    var el = {
      app: $("pomodoro-app"),
      timerDisplay: $("timer-display"),
      progressRing: $("progress-ring"),
      startButton: $("start-button"),
      pauseButton: $("pause-button"),
      resetButton: $("reset-button"),
      statusLabel: $("status-label"),
      sessionCount: $("session-count"),
      focusDurationInput: $("focus-duration-input"),
      breakDurationInput: $("break-duration-input"),
      settingsError: $("settings-error"),
    };

    var state = {
      mode: "idle",
      remainingSeconds: DEFAULT_FOCUS_MINUTES * 60,
      focusDurationMinutes: DEFAULT_FOCUS_MINUTES,
      breakDurationMinutes: DEFAULT_BREAK_MINUTES,
      sessionCount: 0,
      resumeMode: null,
    };

    var intervalId = null;

    function totalSecondsForCurrentPhase() {
      if (state.mode === "focus") {
        return state.focusDurationMinutes * 60;
      }
      if (state.mode === "break") {
        return state.breakDurationMinutes * 60;
      }
      if (state.mode === "paused") {
        return state.resumeMode === "break"
          ? state.breakDurationMinutes * 60
          : state.focusDurationMinutes * 60;
      }
      return state.focusDurationMinutes * 60;
    }

    function render() {
      el.app.classList.remove("pomodoro-app--focus", "pomodoro-app--break");
      var activeMode = state.mode === "paused" ? state.resumeMode : state.mode;
      if (activeMode === "focus") {
        el.app.classList.add("pomodoro-app--focus");
      } else if (activeMode === "break") {
        el.app.classList.add("pomodoro-app--break");
      }

      el.timerDisplay.textContent = formatTime(state.remainingSeconds);
      el.statusLabel.textContent = STATUS_TEXT[state.mode];
      el.sessionCount.textContent = String(state.sessionCount);

      var total = totalSecondsForCurrentPhase();
      var progress = total > 0 ? 1 - state.remainingSeconds / total : 0;
      el.progressRing.style.setProperty("--progress", String(Math.min(1, Math.max(0, progress))));

      el.startButton.disabled = state.mode === "focus" || state.mode === "break";
      el.pauseButton.disabled = state.mode !== "focus" && state.mode !== "break";

      var settingsLocked = state.mode !== "idle";
      el.focusDurationInput.disabled = settingsLocked;
      el.breakDurationInput.disabled = settingsLocked;
    }

    function stopLoop() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function startLoop() {
      stopLoop();
      intervalId = setInterval(function () {
        state = tick(state);
        render();
      }, 1000);
    }

    function handleStart() {
      if (state.mode === "idle") {
        state = Object.assign({}, state, {
          mode: "focus",
          remainingSeconds: state.focusDurationMinutes * 60,
        });
        startLoop();
        render();
        return;
      }
      if (state.mode === "paused") {
        state = Object.assign({}, state, {
          mode: state.resumeMode,
          resumeMode: null,
        });
        startLoop();
        render();
      }
    }

    function handlePause() {
      if (state.mode !== "focus" && state.mode !== "break") {
        return;
      }
      stopLoop();
      state = Object.assign({}, state, {
        resumeMode: state.mode,
        mode: "paused",
      });
      render();
    }

    function handleReset() {
      stopLoop();
      state = {
        mode: "idle",
        remainingSeconds: state.focusDurationMinutes * 60,
        focusDurationMinutes: state.focusDurationMinutes,
        breakDurationMinutes: state.breakDurationMinutes,
        sessionCount: 0,
        resumeMode: null,
      };
      render();
    }

    function showSettingsError(message) {
      el.settingsError.textContent = message;
      el.settingsError.classList.add("settings-error--visible");
    }

    function clearSettingsError() {
      el.settingsError.textContent = "";
      el.settingsError.classList.remove("settings-error--visible");
    }

    function handleFocusDurationInput() {
      if (state.mode !== "idle") {
        return;
      }
      var result = validateDurationInput(el.focusDurationInput.value);
      if (!result.valid) {
        showSettingsError(result.error);
        return;
      }
      clearSettingsError();
      state = Object.assign({}, state, {
        focusDurationMinutes: result.value,
        remainingSeconds: result.value * 60,
      });
      render();
    }

    function handleBreakDurationInput() {
      if (state.mode !== "idle") {
        return;
      }
      var result = validateDurationInput(el.breakDurationInput.value);
      if (!result.valid) {
        showSettingsError(result.error);
        return;
      }
      clearSettingsError();
      state = Object.assign({}, state, { breakDurationMinutes: result.value });
      render();
    }

    el.startButton.addEventListener("click", handleStart);
    el.pauseButton.addEventListener("click", handlePause);
    el.resetButton.addEventListener("click", handleReset);
    el.focusDurationInput.addEventListener("input", handleFocusDurationInput);
    el.breakDurationInput.addEventListener("input", handleBreakDurationInput);

    render();
  })();
}
