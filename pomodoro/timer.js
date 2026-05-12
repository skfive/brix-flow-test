/* BF-432 · 뽀모도로 순수 로직 utility
 * 명세: docs/design/pomodoro-BF-430.md §6 / §7.9
 *
 * 본 파일은 file:// CORS 안전을 위해 ES module 키워드 (import/export) 를
 * 사용하지 않습니다. UMD 패턴 — 브라우저에서는 globalThis.PomodoroTimer 에,
 * Node (테스트) 에서는 module.exports 에 같은 객체를 노출합니다.
 *
 * DOM 의존성 0 → node:test 단위 테스트 가능.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.PomodoroTimer = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // §7.9 v1 하드코딩 상수 — 후속 Epic 에서 settings UI 도입 시 override 예정
  var DURATIONS = Object.freeze({
    FOCUS: 25 * 60 * 1000,
    SHORT_BREAK: 5 * 60 * 1000,
    LONG_BREAK: 15 * 60 * 1000,
  });

  var CYCLES_PER_LONG_BREAK = 4;

  var MODES = Object.freeze({
    FOCUS: "FOCUS",
    SHORT_BREAK: "SHORT_BREAK",
    LONG_BREAK: "LONG_BREAK",
  });

  /**
   * 0 이상 정수로 zero-pad (2자리).
   */
  function pad2(n) {
    var v = Number(n);
    if (!Number.isFinite(v) || v < 0) v = 0;
    return String(Math.trunc(v)).padStart(2, "0");
  }

  /**
   * "MM:SS" 항상 2자리 zero-pad (FOCUS 25:00 / SHORT 05:00 / LONG 15:00).
   * timer/timer.js 는 분 1자리도 허용했지만 pomodoro 명세 §4.5 는 항상 2자리.
   */
  function formatMmSs(minutes, seconds) {
    return pad2(minutes) + ":" + pad2(seconds);
  }

  /**
   * 남은 밀리초 → { minutes, seconds }.
   * ceil 표시 (1ms 라도 남으면 1초로 노출) — "사라지는 마지막 1초" 인상 방지.
   * 음수/NaN 은 0:00 으로 안전 처리.
   */
  function msToMmSs(remainingMs) {
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
      return { minutes: 0, seconds: 0 };
    }
    var totalSeconds = Math.ceil(remainingMs / 1000);
    return {
      minutes: Math.floor(totalSeconds / 60),
      seconds: totalSeconds % 60,
    };
  }

  /**
   * 모드별 초기 ms.
   */
  function durationFor(mode) {
    if (mode === MODES.FOCUS) return DURATIONS.FOCUS;
    if (mode === MODES.SHORT_BREAK) return DURATIONS.SHORT_BREAK;
    if (mode === MODES.LONG_BREAK) return DURATIONS.LONG_BREAK;
    throw new Error("알 수 없는 모드: " + mode);
  }

  /**
   * 모드 라벨 (UI 노출용 — underscore 제거, 공백).
   */
  function labelFor(mode) {
    if (mode === MODES.FOCUS) return "FOCUS";
    if (mode === MODES.SHORT_BREAK) return "SHORT BREAK";
    if (mode === MODES.LONG_BREAK) return "LONG BREAK";
    return String(mode);
  }

  /**
   * 명세 §6.1 상태 머신 — 현재 모드 종료 후 다음 모드/사이클 계산.
   *
   * 규칙:
   *  - FOCUS 종료
   *    - currentCycle < CYCLES_PER_LONG_BREAK → SHORT_BREAK (cycle 유지)
   *    - currentCycle === CYCLES_PER_LONG_BREAK → LONG_BREAK (cycle 유지)
   *  - SHORT_BREAK 종료 → FOCUS, cycle +1
   *  - LONG_BREAK 종료 → FOCUS, cycle = 1 (사이클 wrap)
   *
   * @param {"FOCUS"|"SHORT_BREAK"|"LONG_BREAK"} currentMode
   * @param {number} currentCycle  1..CYCLES_PER_LONG_BREAK 범위 가정
   * @returns {{ mode: string, currentCycle: number }}
   */
  function nextPhase(currentMode, currentCycle) {
    var cycle = Number(currentCycle);
    if (!Number.isFinite(cycle) || cycle < 1) cycle = 1;
    if (cycle > CYCLES_PER_LONG_BREAK) cycle = CYCLES_PER_LONG_BREAK;

    if (currentMode === MODES.FOCUS) {
      if (cycle >= CYCLES_PER_LONG_BREAK) {
        return { mode: MODES.LONG_BREAK, currentCycle: cycle };
      }
      return { mode: MODES.SHORT_BREAK, currentCycle: cycle };
    }
    if (currentMode === MODES.SHORT_BREAK) {
      return { mode: MODES.FOCUS, currentCycle: cycle + 1 };
    }
    if (currentMode === MODES.LONG_BREAK) {
      return { mode: MODES.FOCUS, currentCycle: 1 };
    }
    throw new Error("알 수 없는 모드: " + currentMode);
  }

  /**
   * 로컬 시간 기준 "YYYY-MM-DD" — 누적 집중 시간의 자정 리셋 기준.
   *
   * @param {number} epochMs
   * @returns {string}
   */
  function localDateKey(epochMs) {
    var d = new Date(epochMs);
    if (Number.isNaN(d.getTime())) {
      throw new Error("유효하지 않은 epoch ms: " + epochMs);
    }
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  /**
   * 두 epoch ms 가 같은 로컬 날짜인지.
   */
  function isSameLocalDay(a, b) {
    return localDateKey(a) === localDateKey(b);
  }

  /**
   * 누적 집중 시간 누가 — 같은 날이면 누적, 다른 날이면 새 ms 로 리셋.
   *
   * @param {{date:string,focusMsToday:number}|null} prev  기존 stats (or null)
   * @param {number} addMs  추가할 ms (>= 0)
   * @param {number} nowMs  현재 epoch ms
   * @returns {{date:string,focusMsToday:number}}
   */
  function accumulateFocusMs(prev, addMs, nowMs) {
    var add = Number(addMs);
    if (!Number.isFinite(add) || add < 0) add = 0;
    add = Math.trunc(add);
    var today = localDateKey(nowMs);
    if (prev && prev.date === today && Number.isFinite(prev.focusMsToday)) {
      return { date: today, focusMsToday: prev.focusMsToday + add };
    }
    return { date: today, focusMsToday: add };
  }

  /**
   * 누적 ms → "Hh Mm" 또는 "Mm" 표시 문자열 (오늘 누적 집중 시간 라벨용).
   * 0 → "0분".
   */
  function formatFocusTotal(ms) {
    var v = Number(ms);
    if (!Number.isFinite(v) || v <= 0) return "0분";
    var totalMin = Math.floor(v / 60000);
    if (totalMin <= 0) return "0분";
    var h = Math.floor(totalMin / 60);
    var m = totalMin % 60;
    if (h > 0 && m > 0) return h + "시간 " + m + "분";
    if (h > 0) return h + "시간";
    return m + "분";
  }

  return {
    DURATIONS: DURATIONS,
    CYCLES_PER_LONG_BREAK: CYCLES_PER_LONG_BREAK,
    MODES: MODES,
    pad2: pad2,
    formatMmSs: formatMmSs,
    msToMmSs: msToMmSs,
    durationFor: durationFor,
    labelFor: labelFor,
    nextPhase: nextPhase,
    localDateKey: localDateKey,
    isSameLocalDay: isSameLocalDay,
    accumulateFocusMs: accumulateFocusMs,
    formatFocusTotal: formatFocusTotal,
  };
});
