(function () {
  'use strict';

  var CENTISECOND_MS = 10;
  var TICK_INTERVAL_MS = 30;
  var STATE_LABEL = { idle: '대기', running: '진행 중', paused: '일시정지' };

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function formatElapsed(ms) {
    var n = Number(ms);
    var safeMs = Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
    var totalCentiseconds = Math.floor(safeMs / CENTISECOND_MS);
    var centiseconds = totalCentiseconds % 100;
    var totalSeconds = Math.floor(totalCentiseconds / 100);
    var seconds = totalSeconds % 60;
    var minutes = Math.floor(totalSeconds / 60);
    return pad2(minutes) + ':' + pad2(seconds) + '.' + pad2(centiseconds);
  }

  function currentElapsedMs(state, nowMs) {
    if (state.status === 'running' && state.startedAt !== null) {
      return state.accumulatedMs + (nowMs - state.startedAt);
    }
    return state.accumulatedMs;
  }

  function markFastestSlowest(laps) {
    if (laps.length < 2) {
      return laps.map(function (lap) {
        return Object.assign({}, lap, { isFastest: false, isSlowest: false });
      });
    }

    var fastestId = null;
    var slowestId = null;
    var fastestMs = Infinity;
    var slowestMs = -Infinity;

    laps.forEach(function (lap) {
      if (lap.lapMs < fastestMs) {
        fastestMs = lap.lapMs;
        fastestId = lap.id;
      }
      if (lap.lapMs > slowestMs) {
        slowestMs = lap.lapMs;
        slowestId = lap.id;
      }
    });

    if (fastestId === slowestId) {
      fastestId = null;
      slowestId = null;
    }

    return laps.map(function (lap) {
      return Object.assign({}, lap, {
        isFastest: lap.id === fastestId,
        isSlowest: lap.id === slowestId
      });
    });
  }

  function addLap(state, nowMs) {
    var totalMs = currentElapsedMs(state, nowMs);
    var previousTotal = state.laps.length > 0 ? state.laps[state.laps.length - 1].totalMs : 0;
    var newLap = { id: state.laps.length + 1, lapMs: totalMs - previousTotal, totalMs: totalMs };
    var newLaps = markFastestSlowest(state.laps.concat([newLap]));
    return Object.assign({}, state, { laps: newLaps });
  }

  function getControlsState(status) {
    var isRunning = status === 'running';
    var isPaused = status === 'paused';
    return {
      startDisabled: isRunning,
      startLabel: isPaused ? '재개' : '시작',
      pauseDisabled: !isRunning,
      resetDisabled: !isPaused,
      lapDisabled: !isRunning
    };
  }

  function initStopwatchUI() {
    var displayEl = document.getElementById('stopwatch-display');
    var statusEl = document.getElementById('stopwatch-state');
    var startBtn = document.getElementById('stopwatch-start');
    var pauseBtn = document.getElementById('stopwatch-pause');
    var resetBtn = document.getElementById('stopwatch-reset');
    var lapBtn = document.getElementById('stopwatch-lap');
    var lapListEl = document.getElementById('stopwatch-lap-list');

    if (!displayEl || !startBtn || !pauseBtn || !resetBtn || !lapBtn || !lapListEl) return;

    var state = { status: 'idle', accumulatedMs: 0, startedAt: null, laps: [] };
    var tickHandle = null;

    function renderLaps() {
      lapListEl.textContent = '';
      for (var i = state.laps.length - 1; i >= 0; i--) {
        var lap = state.laps[i];
        var li = document.createElement('li');
        li.className = 'stopwatch__lap-item';
        if (lap.isFastest) li.classList.add('lap--fastest');
        if (lap.isSlowest) li.classList.add('lap--slowest');

        var label = document.createElement('span');
        label.textContent = '#' + lap.id + ' ' + formatElapsed(lap.lapMs);
        li.appendChild(label);

        if (lap.isFastest) {
          var fastestBadge = document.createElement('span');
          fastestBadge.textContent = '최단랩';
          li.appendChild(fastestBadge);
        }
        if (lap.isSlowest) {
          var slowestBadge = document.createElement('span');
          slowestBadge.textContent = '최장랩';
          li.appendChild(slowestBadge);
        }
        lapListEl.appendChild(li);
      }
    }

    function render() {
      displayEl.textContent = formatElapsed(currentElapsedMs(state, Date.now()));
      if (statusEl) statusEl.textContent = '상태: ' + STATE_LABEL[state.status];

      var controls = getControlsState(state.status);
      startBtn.disabled = controls.startDisabled;
      startBtn.textContent = controls.startLabel;
      startBtn.setAttribute('aria-label', controls.startLabel);

      pauseBtn.disabled = controls.pauseDisabled;
      resetBtn.disabled = controls.resetDisabled;

      lapBtn.disabled = controls.lapDisabled;
      lapBtn.setAttribute('aria-disabled', controls.lapDisabled ? 'true' : 'false');

      renderLaps();
    }

    function stopTick() {
      if (tickHandle !== null) {
        clearInterval(tickHandle);
        tickHandle = null;
      }
    }

    function startTick() {
      stopTick();
      tickHandle = setInterval(render, TICK_INTERVAL_MS);
    }

    function handleStart() {
      if (state.status === 'running') return;
      state = Object.assign({}, state, { status: 'running', startedAt: Date.now() });
      startTick();
      render();
    }

    function handlePause() {
      if (state.status !== 'running') return;
      var elapsed = currentElapsedMs(state, Date.now());
      state = Object.assign({}, state, { status: 'paused', accumulatedMs: elapsed, startedAt: null });
      stopTick();
      render();
    }

    function handleReset() {
      if (state.status !== 'paused') return;
      state = { status: 'idle', accumulatedMs: 0, startedAt: null, laps: [] };
      stopTick();
      render();
    }

    function handleLap() {
      if (state.status !== 'running') return;
      state = addLap(state, Date.now());
      render();
    }

    startBtn.addEventListener('click', handleStart);
    pauseBtn.addEventListener('click', handlePause);
    resetBtn.addEventListener('click', handleReset);
    lapBtn.addEventListener('click', handleLap);

    render();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initStopwatchUI);
    } else {
      initStopwatchUI();
    }
  }

  var api = {
    formatElapsed: formatElapsed,
    addLap: addLap,
    getControlsState: getControlsState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.Stopwatch = api;
  }
})();
