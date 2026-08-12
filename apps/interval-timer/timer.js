'use strict';

/*
 * 인터벌 타이머 상태 전이 로직 (BF-1983)
 *
 * 이 파일은 두 환경에서 그대로 로드된다:
 *   1) 브라우저 — index.html이 classic <script src="./timer.js">로 로드 (file:// 포함)
 *   2) node --test — tests/timer.test.js가 require('../timer.js')로 로드
 *
 * 두 환경 모두를 만족시키기 위해 ES module 문법(import/export)을 쓰지 않는다.
 * (type="module" 스크립트는 Chrome 등에서 file:// 프로토콜 CORS 제약으로 로드가 막힌다.)
 * 대신 함수를 IIFE 스코프 안에 선언하고, CommonJS 환경에서만 module.exports로 노출한다.
 * (classic <script>로 로드될 때 전역(window) 네임스페이스 오염을 막기 위해 IIFE로 감싼다.)
 */

(function () {
var DEFAULT_CONFIG = {
  workDuration: 1500, // 25:00
  restDuration: 300, // 05:00
  totalRounds: 4,
};

var RUNNING_PHASES = { work: true, rest: true };

function createInitialState(config) {
  var cfg = config || DEFAULT_CONFIG;
  return {
    phase: 'idle',
    remaining: cfg.workDuration,
    round: 1,
    totalRounds: cfg.totalRounds,
    workDuration: cfg.workDuration,
    restDuration: cfg.restDuration,
    pausedFrom: null,
    announcement: null,
  };
}

function formatTime(totalSeconds) {
  var safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.round(totalSeconds)) : 0;
  var minutes = Math.floor(safeSeconds / 60);
  var seconds = safeSeconds % 60;
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

function handleStartPause(state) {
  if (state.phase === 'idle') {
    return Object.assign({}, state, {
      phase: 'work',
      remaining: state.workDuration,
      pausedFrom: null,
      announcement: null,
    });
  }
  if (state.phase === 'work' || state.phase === 'rest') {
    return Object.assign({}, state, {
      phase: 'paused',
      pausedFrom: state.phase,
    });
  }
  if (state.phase === 'paused' && state.pausedFrom) {
    return Object.assign({}, state, {
      phase: state.pausedFrom,
      pausedFrom: null,
    });
  }
  return state;
}

function handleTick(state) {
  if (!RUNNING_PHASES[state.phase]) {
    return state;
  }

  var remaining = state.remaining - 1;
  if (remaining > 0) {
    return Object.assign({}, state, { remaining: remaining });
  }

  if (state.phase === 'work') {
    return Object.assign({}, state, {
      phase: 'rest',
      remaining: state.restDuration,
      announcement: null,
    });
  }

  // state.phase === 'rest'
  if (state.round < state.totalRounds) {
    return Object.assign({}, state, {
      phase: 'work',
      remaining: state.workDuration,
      round: state.round + 1,
      announcement: null,
    });
  }

  return Object.assign({}, state, {
    phase: 'idle',
    remaining: state.workDuration,
    round: 1,
    pausedFrom: null,
    announcement: '모든 라운드를 완료했습니다',
  });
}

function handleReset(state) {
  if (state.phase === 'idle') {
    return state;
  }
  return Object.assign({}, state, {
    phase: 'idle',
    remaining: state.workDuration,
    round: 1,
    pausedFrom: null,
    announcement: null,
  });
}

function nextPhase(state, event) {
  if (!event) {
    return state;
  }
  switch (event.type) {
    case 'START_PAUSE':
      return handleStartPause(state);
    case 'TICK':
      return handleTick(state);
    case 'RESET':
      return handleReset(state);
    default:
      return state;
  }
}

function displayPhase(state) {
  if (state.phase === 'paused') {
    return state.pausedFrom;
  }
  return state.phase;
}

function phaseLabel(state) {
  switch (state.phase) {
    case 'work':
      return '작업';
    case 'rest':
      return '휴식';
    case 'paused':
      return '일시정지';
    default:
      return '대기';
  }
}

function startPauseAriaLabel(state) {
  return RUNNING_PHASES[state.phase] ? '일시정지' : '시작';
}

// 탭 비활성화 등으로 setInterval 호출이 밀렸을 때, 실제 경과 시간(now - lastTickAt) 기준으로
// 몇 번의 TICK을 따라잡아야 하는지 계산하는 순수 함수 (drift 보정, Edge Case 3).
// lastTickAt이 없으면(최초 1회) 1틱만 진행한다. 항상 최소 1을 반환한다.
function computeElapsedTicks(lastTickAt, now) {
  if (lastTickAt === null || lastTickAt === undefined) {
    return 1;
  }
  var elapsed = Math.round((now - lastTickAt) / 1000);
  return elapsed < 1 ? 1 : elapsed;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    createInitialState: createInitialState,
    formatTime: formatTime,
    nextPhase: nextPhase,
    displayPhase: displayPhase,
    phaseLabel: phaseLabel,
    startPauseAriaLabel: startPauseAriaLabel,
    computeElapsedTicks: computeElapsedTicks,
  };
}

/*
 * ---- 브라우저 런타임 바인딩 ----
 * document가 있을 때만 실행 (node --test 환경에서는 스킵).
 */
function initRuntime() {
  var timerDisplayEl = document.getElementById('timer-display');
  var timerPhaseLabelEl = document.getElementById('timer-phase-label');
  var timerRoundCountEl = document.getElementById('timer-round-count');
  var startPauseBtn = document.getElementById('timer-start-pause');
  var resetBtn = document.getElementById('timer-reset');

  if (!timerDisplayEl || !timerPhaseLabelEl || !timerRoundCountEl || !startPauseBtn || !resetBtn) {
    return;
  }

  var state = createInitialState();
  var intervalId = null;
  var lastTickAt = null;
  var announcementTimeoutId = null;

  function render() {
    var phase = displayPhase(state);

    timerPhaseLabelEl.textContent = phaseLabel(state);
    timerPhaseLabelEl.classList.remove('timer__phase--work', 'timer__phase--rest');
    if (phase === 'work') {
      timerPhaseLabelEl.classList.add('timer__phase--work');
    } else if (phase === 'rest') {
      timerPhaseLabelEl.classList.add('timer__phase--rest');
    }

    timerRoundCountEl.textContent = state.round + ' / ' + state.totalRounds;

    var ariaLabel = startPauseAriaLabel(state);
    startPauseBtn.setAttribute('aria-label', ariaLabel);
    startPauseBtn.textContent = ariaLabel;

    if (announcementTimeoutId !== null) {
      clearTimeout(announcementTimeoutId);
      announcementTimeoutId = null;
    }

    if (state.announcement) {
      timerDisplayEl.textContent = state.announcement;
      announcementTimeoutId = setTimeout(function () {
        timerDisplayEl.textContent = formatTime(state.remaining);
        announcementTimeoutId = null;
      }, 3000);
    } else {
      timerDisplayEl.textContent = formatTime(state.remaining);
    }
  }

  function stopTicking() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    lastTickAt = null;
  }

  function onTick() {
    var now = Date.now();
    var elapsedSeconds = computeElapsedTicks(lastTickAt, now);
    lastTickAt = now;

    for (var i = 0; i < elapsedSeconds; i += 1) {
      state = nextPhase(state, { type: 'TICK' });
      if (!RUNNING_PHASES[state.phase]) {
        break;
      }
    }

    render();

    if (!RUNNING_PHASES[state.phase]) {
      stopTicking();
    }
  }

  function startTicking() {
    stopTicking();
    lastTickAt = Date.now();
    intervalId = setInterval(onTick, 1000);
  }

  function handleStartPauseClick() {
    state = nextPhase(state, { type: 'START_PAUSE' });
    render();
    if (RUNNING_PHASES[state.phase]) {
      startTicking();
    } else {
      stopTicking();
    }
  }

  function handleResetClick() {
    state = nextPhase(state, { type: 'RESET' });
    stopTicking();
    render();
  }

  startPauseBtn.addEventListener('click', handleStartPauseClick);
  resetBtn.addEventListener('click', handleResetClick);

  document.addEventListener('keydown', function (event) {
    // 키를 누르고 있으면 OS가 반복 keydown(repeat=true)을 발생시킨다.
    // Space/R은 1회 토글이어야 하므로 auto-repeat는 무시한다.
    if (event.repeat) {
      return;
    }
    if (event.code === 'Space' || event.key === ' ') {
      event.preventDefault();
      handleStartPauseClick();
    } else if (event.key === 'r' || event.key === 'R') {
      handleResetClick();
    }
  });

  render();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRuntime);
  } else {
    initRuntime();
  }
}
}());
