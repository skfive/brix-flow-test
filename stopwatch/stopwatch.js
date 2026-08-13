const CENTISECOND_MS = 10;

/**
 * ms -> "MM:SS.CC" (분은 100 이상이면 자연 확장, 음수/NaN은 0으로 방어)
 */
export function formatElapsed(ms) {
  const n = Number(ms);
  const safeMs = Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
  const totalCentiseconds = Math.floor(safeMs / CENTISECOND_MS);
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const pad2 = (value) => String(value).padStart(2, "0");
  return `${pad2(minutes)}:${pad2(seconds)}.${pad2(centiseconds)}`;
}

/**
 * 비교 기준은 lapMs. 동률(min===max 포함 완전 동률)이거나 랩이 2개 미만이면 null.
 * 최솟값/최댓값 동률 시 먼저 기록된 id를 채택한다.
 */
export function lapStats(laps) {
  if (!Array.isArray(laps) || laps.length < 2) {
    return { bestId: null, worstId: null };
  }

  let bestId = null;
  let worstId = null;
  let bestMs = Infinity;
  let worstMs = -Infinity;

  for (const lap of laps) {
    if (lap.lapMs < bestMs) {
      bestMs = lap.lapMs;
      bestId = lap.id;
    }
    if (lap.lapMs > worstMs) {
      worstMs = lap.lapMs;
      worstId = lap.id;
    }
  }

  if (bestId === worstId) {
    return { bestId: null, worstId: null };
  }
  return { bestId, worstId };
}

function initStopwatchUI() {
  const root = document.getElementById("stopwatch-root");
  if (!root) return;

  const displayEl = document.getElementById("stopwatch-display");
  const statusEl = document.getElementById("stopwatch-status");
  const startBtn = document.getElementById("btn-start");
  const pauseBtn = document.getElementById("btn-pause");
  const resetBtn = document.getElementById("btn-reset");
  const lapBtn = document.getElementById("btn-lap");
  const lapListEl = document.getElementById("lap-list");

  const STATE_LABEL = { idle: "대기", running: "진행 중", paused: "일시정지" };

  let state = "idle";
  let accumulatedMs = 0;
  let startedAt = null;
  let laps = [];
  let tickHandle = null;

  function currentElapsed() {
    if (state !== "running" || startedAt === null) return accumulatedMs;
    return accumulatedMs + (Date.now() - startedAt);
  }

  function renderLaps() {
    const { bestId, worstId } = lapStats(laps);
    lapListEl.textContent = "";
    for (let i = laps.length - 1; i >= 0; i--) {
      const lap = laps[i];
      const li = document.createElement("li");
      li.className = "lap-list__item";
      if (lap.id === bestId) li.classList.add("lap-list__item--best");
      if (lap.id === worstId) li.classList.add("lap-list__item--worst");

      const label = document.createElement("span");
      label.className = "lap-list__label";
      label.textContent = `#${lap.id} ${formatElapsed(lap.lapMs)}`;
      li.appendChild(label);

      if (lap.id === bestId) {
        const badge = document.createElement("span");
        badge.className = "lap-list__badge";
        badge.textContent = "최고 랩";
        li.appendChild(badge);
      }
      if (lap.id === worstId) {
        const badge = document.createElement("span");
        badge.className = "lap-list__badge";
        badge.textContent = "최저 랩";
        li.appendChild(badge);
      }
      lapListEl.appendChild(li);
    }
  }

  function render() {
    displayEl.textContent = formatElapsed(currentElapsed());
    if (statusEl) statusEl.textContent = `상태: ${STATE_LABEL[state]}`;

    startBtn.disabled = state === "running";
    pauseBtn.disabled = state !== "running";
    resetBtn.disabled = state !== "paused";
    lapBtn.disabled = state !== "running";

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
    tickHandle = setInterval(render, 30);
  }

  function start() {
    if (state === "running") return;
    state = "running";
    startedAt = Date.now();
    startTick();
    render();
  }

  function pause() {
    if (state !== "running") return;
    accumulatedMs += Date.now() - startedAt;
    startedAt = null;
    state = "paused";
    stopTick();
    render();
  }

  function reset() {
    if (state !== "paused") return;
    state = "idle";
    accumulatedMs = 0;
    startedAt = null;
    laps = [];
    stopTick();
    render();
  }

  function addLap() {
    if (state !== "running") return;
    const totalMs = currentElapsed();
    const previousTotal = laps.length > 0 ? laps[laps.length - 1].totalMs : 0;
    laps.push({ id: laps.length + 1, lapMs: totalMs - previousTotal, totalMs });
    render();
  }

  startBtn.addEventListener("click", start);
  pauseBtn.addEventListener("click", pause);
  resetBtn.addEventListener("click", reset);
  lapBtn.addEventListener("click", addLap);

  render();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStopwatchUI);
  } else {
    initStopwatchUI();
  }
}
