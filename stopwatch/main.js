// BF-417 · 스톱워치 SPA 엔트리
// - 명세: docs/design/stopwatch-BF-415.md
// - 의존: stopwatch/stopwatch.js (순수 로직), stopwatch/storage.js (localStorage)
// - 범위: 시작·정지·랩·리셋, requestAnimationFrame tick, 키보드 단축 (Space/L/Esc),
//   `stopwatch:` prefix localStorage 영구화 (laps + elapsed), max-cap 자동 정지,
//   다크 토글 (`bf-theme` 키 — notepad/timer 와 공유)
//
// 명세 §6.8 (비저장 정책) 은 BF-417 의 acceptance criteria
// (localStorage 영구화 + 새로고침 시 복원) 에 의해 override 됨. PR 본문 참조.

import { createStopwatchStore } from "./storage.js";
import {
  formatStopwatchMs,
  formatStopwatchMsStr,
  addLap,
  findFastestSlowest,
  isMaxCap,
  clampElapsed,
  MAX_ELAPSED_MS,
} from "./stopwatch.js";

const store = createStopwatchStore();

// ─────────── DOM 캐싱 ───────────
const $ = (id) => document.getElementById(id);
const displayEl = $("display");
const dispMEl = $("disp-m");
const dispSEl = $("disp-s");
const dispXEl = $("disp-x");
const btnStart = $("btn-start");
const btnStop = $("btn-stop");
const btnLap = $("btn-lap");
const btnReset = $("btn-reset");
const btnTheme = $("btn-theme");
const lapCardEl = $("lap-card");
const lapCountEl = $("lap-count");
const lapListEl = $("lap-list");
const btnClearLaps = $("btn-clear-laps");
const srAnnounceEl = $("sr-announce");

// ─────────── 상태 ───────────
// state: "idle" | "running" | "stopped" | "max-cap"
const state = {
  phase: "idle",
  elapsedMs: 0,
  /** running 중에만 사용: performance.now() - elapsedMs (drift 보정 anchor) */
  startTimestamp: 0,
  rafId: null,
  /** Array<{ index, cumulativeMs, deltaMs }> */
  laps: [],
};

// ─────────── 테마 토글 (notepad/timer 와 키 공유) ───────────
const THEME_KEY = "bf-theme";
function initTheme() {
  let theme = null;
  try {
    theme = localStorage.getItem(THEME_KEY);
  } catch {
    // private mode 등 — silent fallback
  }
  if (!theme) {
    theme = window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  applyTheme(theme);
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (btnTheme) btnTheme.textContent = theme === "dark" ? "☀" : "🌙";
}
function toggleTheme() {
  const next =
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "light"
      : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // silent
  }
}

// ─────────── display 갱신 ───────────
function paintDisplay(ms) {
  const { mm, ss, xx } = formatStopwatchMs(ms);
  dispMEl.textContent = mm;
  dispSEl.textContent = ss;
  dispXEl.textContent = xx;
}

function renderDisplayState() {
  const isEmpty = state.phase === "idle" && state.elapsedMs === 0;
  displayEl.classList.toggle("is-empty", isEmpty);
  displayEl.classList.toggle("is-max-cap", state.phase === "max-cap");
}

// ─────────── 컨트롤 버튼 매트릭스 (§4.4) ───────────
function renderControls() {
  const p = state.phase;
  // 시작
  btnStart.disabled = !(p === "idle" || p === "stopped");
  // 정지
  btnStop.disabled = p !== "running";
  // 랩
  btnLap.disabled = p !== "running";
  // 리셋: idle & elapsed 0 일 때만 disabled. running/stopped/max-cap 에서는 enabled.
  btnReset.disabled = p === "idle" && state.elapsedMs === 0;
}

// ─────────── 랩 리스트 렌더링 ───────────
function renderLapList() {
  // 카드 표시 여부
  if (state.laps.length === 0) {
    lapCardEl.hidden = true;
    lapListEl.innerHTML = "";
    if (btnClearLaps) btnClearLaps.hidden = true;
    return;
  }
  lapCardEl.hidden = false;
  lapCountEl.textContent = String(state.laps.length);
  if (btnClearLaps) btnClearLaps.hidden = false;

  const fs = findFastestSlowest(state.laps);
  const fastestIdx = fs?.fastestIndex ?? null;
  const slowestIdx = fs?.slowestIndex ?? null;

  // 최신 상단 — 역순 렌더링
  const fragment = document.createDocumentFragment();
  for (let i = state.laps.length - 1; i >= 0; i--) {
    const lap = state.laps[i];
    const li = document.createElement("li");
    li.className = "lap-row";
    if (lap.index === fastestIdx) li.classList.add("is-fastest");
    if (lap.index === slowestIdx) li.classList.add("is-slowest");

    const labelText =
      lap.index === fastestIdx
        ? "최단"
        : lap.index === slowestIdx
          ? "최장"
          : "";
    const cumText = formatStopwatchMsStr(lap.cumulativeMs);
    const deltaText = "+" + formatStopwatchMsStr(lap.deltaMs);

    li.setAttribute(
      "aria-label",
      `랩 ${lap.index}, 누적 ${cumText}, 직전 대비 ${deltaText}${labelText ? `, ${labelText}` : ""}`,
    );

    const numSpan = document.createElement("span");
    numSpan.className = "lap-row__num";
    numSpan.textContent = `#${lap.index}`;

    const cumSpan = document.createElement("span");
    cumSpan.className = "lap-row__cumulative";
    cumSpan.textContent = cumText;

    const deltaSpan = document.createElement("span");
    deltaSpan.className = "lap-row__delta";
    deltaSpan.textContent = deltaText;
    // mobile 용 inline tag (desktop CSS 에서 hidden)
    if (labelText) {
      const tag = document.createElement("span");
      tag.className = "lap-row__inline-tag";
      tag.textContent = labelText;
      deltaSpan.appendChild(document.createTextNode(" "));
      deltaSpan.appendChild(tag);
    }

    const labelSpan = document.createElement("span");
    labelSpan.className = "lap-row__label";
    labelSpan.textContent = labelText;

    li.append(numSpan, cumSpan, deltaSpan, labelSpan);
    fragment.appendChild(li);
  }
  lapListEl.innerHTML = "";
  lapListEl.appendChild(fragment);
}

function render() {
  renderDisplayState();
  paintDisplay(state.elapsedMs);
  renderControls();
  renderLapList();
}

// ─────────── SR 알림 ───────────
function srAnnounce(text) {
  if (!srAnnounceEl) return;
  srAnnounceEl.textContent = text;
}

// ─────────── 영구화 ───────────
function persistLaps() {
  try {
    store.saveLaps(state.laps);
  } catch {
    // 방어 — saveLaps 는 배열일 때만 호출됨
  }
}
function persistElapsed() {
  try {
    store.saveElapsed(state.elapsedMs);
  } catch {
    // silent
  }
}
function clearPersisted() {
  try {
    store.clearAll();
  } catch {
    // silent
  }
}

// ─────────── 액션 (§6.1 상태 전이) ───────────
function start() {
  if (state.phase === "running" || state.phase === "max-cap") return;
  // idle 또는 stopped 에서 시작/재개
  state.phase = "running";
  state.startTimestamp = performance.now() - state.elapsedMs;
  render();
  scheduleTick();
  srAnnounce("스톱워치 시작");
}

function stop() {
  if (state.phase !== "running") return;
  const now = performance.now();
  state.elapsedMs = clampElapsed(now - state.startTimestamp);
  cancelTick();
  state.phase = "stopped";
  persistElapsed();
  render();
  srAnnounce(`현재 기록 ${formatStopwatchMsStr(state.elapsedMs)} 에서 정지됨`);
}

function lap() {
  if (state.phase !== "running") return;
  // 클릭 시점의 정확한 elapsed (rAF tick 과 별개 — §6.4 step 2)
  const now = performance.now();
  const currentElapsed = clampElapsed(now - state.startTimestamp);
  state.laps = addLap(state.laps, currentElapsed);
  persistLaps();
  render();
  const last = state.laps[state.laps.length - 1];
  srAnnounce(`랩 ${last.index} 기록 ${formatStopwatchMsStr(last.cumulativeMs)}`);
}

function reset() {
  // idle 빈 상태에서는 no-op (버튼 disabled 라 도달 X)
  if (state.phase === "idle" && state.elapsedMs === 0) return;
  cancelTick();
  state.phase = "idle";
  state.elapsedMs = 0;
  state.startTimestamp = 0;
  state.laps = [];
  clearPersisted();
  render();
  srAnnounce("스톱워치 리셋됨");
}

function clearLaps() {
  if (state.laps.length === 0) return;
  state.laps = [];
  // 랩만 비우면 storage 에서도 laps 만 비움 (elapsed 는 유지)
  try {
    store.saveLaps([]);
  } catch {
    // silent
  }
  render();
  srAnnounce("랩 기록을 모두 지웠습니다");
}

// ─────────── tick loop (§6.3) ───────────
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
  const now = performance.now();
  const candidate = now - state.startTimestamp;

  if (isMaxCap(candidate)) {
    // max-cap 자동 정지 (§6.1)
    state.elapsedMs = MAX_ELAPSED_MS;
    cancelTick();
    state.phase = "max-cap";
    persistElapsed();
    render();
    srAnnounce("최대 시간 99:59.99 도달 — 자동 정지");
    return;
  }
  state.elapsedMs = clampElapsed(candidate);
  // display 만 부분 갱신 (전체 render 회피 — 매 raf 호출 비용 최소화)
  paintDisplay(state.elapsedMs);

  state.rafId = requestAnimationFrame(tick);
}

// ─────────── 이벤트 ───────────
btnStart.addEventListener("click", start);
btnStop.addEventListener("click", stop);
btnLap.addEventListener("click", lap);
btnReset.addEventListener("click", reset);
if (btnClearLaps) btnClearLaps.addEventListener("click", clearLaps);
if (btnTheme) btnTheme.addEventListener("click", toggleTheme);

// 키보드 단축키 (§6.2 + task AC5)
document.addEventListener("keydown", (e) => {
  // 입력 요소 focus 시 단축키 양보 (현 페이지엔 input 없음 — 방어)
  const target = e.target;
  const tag = target?.tagName;
  const isEditable =
    tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
  if (isEditable) return;

  // Esc — 리셋 (idle 빈 상태 외)
  if (e.key === "Escape") {
    if (state.phase === "idle" && state.elapsedMs === 0) return;
    e.preventDefault();
    reset();
    return;
  }
  // Space — 시작 ↔ 정지 토글
  if (e.key === " " || e.code === "Space") {
    if (state.phase === "max-cap") return;
    e.preventDefault();
    if (state.phase === "running") {
      stop();
    } else {
      // idle / stopped
      start();
    }
    return;
  }
  // L — 랩 (running 중에만)
  if (e.key === "l" || e.key === "L") {
    if (state.phase !== "running") return;
    e.preventDefault();
    lap();
    return;
  }
  // R — 리셋 (Esc 와 동일 — 명세 §6.2)
  if (e.key === "r" || e.key === "R") {
    if (state.phase === "idle" && state.elapsedMs === 0) return;
    e.preventDefault();
    reset();
    return;
  }
});

// ─────────── 부팅 ───────────
initTheme();

// localStorage 복원 (AC3: 정지 후 새로고침 → 마지막 랩 리스트 복원)
(function restoreFromStorage() {
  const savedLaps = store.loadLaps();
  const savedElapsed = store.loadElapsed();
  if (Array.isArray(savedLaps) && savedLaps.length > 0) {
    state.laps = savedLaps;
  }
  if (savedElapsed != null && savedElapsed > 0) {
    state.elapsedMs = clampElapsed(savedElapsed);
    if (isMaxCap(state.elapsedMs)) {
      state.phase = "max-cap";
    } else {
      state.phase = "stopped";
    }
  }
})();

render();
