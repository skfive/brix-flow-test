// BF-842 · /demo/clock SPA 엔트리 (렌더·입력·타이머 컨트롤러)
// - 기획 SSOT: docs/planning/clock-BF-839.md (§4 상태, §5 형식, §6 네트워크 미사용)
// - 디자인: docs/design/clock-BF-839.md (§7 dev 가이드)
// - 의존: ./clock.js (순수 로직), ./storage.js (형식 영속화)
// - 외부 네트워크·신규 패키지 0건 (기획 §6) — new Date() 로컬 시각만 사용
// - 언마운트(pagehide) 시 setInterval 정리 (task 요구)

import {
  formatDate,
  formatTime,
  normalizeHourFormat,
  toggleHourFormat,
  HOUR_FORMAT_12,
} from "./clock.js";
import { createClockStore } from "./storage.js";

const store = createClockStore();

// ─────────── DOM 캐싱 ───────────
const $ = (id) => document.getElementById(id);
const dateEl = $("clock-date");
const prefixEl = $("clock-prefix");
const dispHEl = $("disp-h");
const dispMEl = $("disp-m");
const dispSEl = $("disp-s");
const statusEl = $("clock-status");
const statusTextEl = $("clock-status-text");
const btnToggle = $("btn-toggle");
const btnFormat = $("btn-format");
const btnTheme = $("btn-theme");
const srAnnounceEl = $("sr-announce");

// ─────────── 상태 (기획 §4.1) ───────────
const state = {
  /** true=running(매 tick 갱신), false=stopped(화면 고정) */
  running: true,
  /** "24" | "12" — 표시 형식 (기획 §5) */
  format: normalizeHourFormat(store.loadFormat()),
  /** setInterval 핸들 (running 중에만 non-null) */
  intervalId: null,
};

// ─────────── 테마 토글 (notepad/timer/stopwatch 와 키 공유) ───────────
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

// ─────────── SR 알림 (상태 변화 시 1회) ───────────
function srAnnounce(text) {
  if (srAnnounceEl) srAnnounceEl.textContent = text;
}

// ─────────── 시각 렌더 ───────────
/**
 * 단일 Date 원천에서 날짜+시각을 함께 파생해 렌더한다(기획 §3.3).
 * @param {Date} now
 */
function renderClock(now) {
  dateEl.textContent = formatDate(now);
  const { prefix, hh, mm, ss } = formatTime(now, state.format);
  if (prefix) {
    prefixEl.textContent = prefix;
    prefixEl.hidden = false;
  } else {
    prefixEl.hidden = true;
  }
  dispHEl.textContent = hh;
  dispMEl.textContent = mm;
  dispSEl.textContent = ss;
}

/** 지금 시각으로 1회 즉시 렌더 (기획 §4.2 즉시 렌더) */
function renderNow() {
  renderClock(new Date());
}

// ─────────── 정지/재개 컨트롤 UI ───────────
function renderToggleButton() {
  if (state.running) {
    btnToggle.textContent = "⏸ 정지";
    btnToggle.setAttribute("aria-label", "시계 정지");
    btnToggle.setAttribute("aria-pressed", "false");
    statusEl.classList.add("is-running");
    statusTextEl.textContent = "동작 중";
  } else {
    btnToggle.textContent = "▶ 재개";
    btnToggle.setAttribute("aria-label", "시계 재개");
    btnToggle.setAttribute("aria-pressed", "true");
    statusEl.classList.remove("is-running");
    statusTextEl.textContent = "정지됨";
  }
}

// ─────────── 형식 전환 컨트롤 UI (기획 §5, 디자인 §6.3) ───────────
function renderFormatButton() {
  if (state.format === HOUR_FORMAT_12) {
    btnFormat.textContent = "12시간";
    btnFormat.setAttribute("aria-label", "24시간 형식으로 전환");
    btnFormat.setAttribute("aria-pressed", "true");
  } else {
    btnFormat.textContent = "24시간";
    btnFormat.setAttribute("aria-label", "12시간 형식으로 전환");
    btnFormat.setAttribute("aria-pressed", "false");
  }
}

// ─────────── tick loop (기획 §4.3 — 매 tick new Date() 재호출) ───────────
function tick() {
  renderClock(new Date());
}
function startTick() {
  stopTick(); // 중복 방지
  state.intervalId = setInterval(tick, 1000);
}
function stopTick() {
  if (state.intervalId != null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

// ─────────── 액션 (기획 §4.2 상태 전이) ───────────
function stopClock() {
  if (!state.running) return;
  state.running = false;
  stopTick(); // 화면은 정지 시점 값에 고정
  renderToggleButton();
  srAnnounce("정지됨");
}
function resumeClock() {
  if (state.running) return;
  state.running = true;
  renderNow(); // 재개 시점 실제 시각으로 즉시 재동기화(기획 §4.2)
  startTick();
  renderToggleButton();
  srAnnounce("동작 중");
}
function toggleRunning() {
  if (state.running) stopClock();
  else resumeClock();
}

/** 형식 전환 — running/stopped 무관 즉시 재포맷 (기획 §4.2 단서 / §5.1) */
function toggleFormat() {
  state.format = toggleHourFormat(state.format);
  store.saveFormat(state.format);
  renderFormatButton();
  renderNow(); // 다음 tick 을 기다리지 않고 즉시 재렌더
}

// ─────────── 이벤트 ───────────
btnToggle.addEventListener("click", toggleRunning);
btnFormat.addEventListener("click", toggleFormat);
if (btnTheme) btnTheme.addEventListener("click", toggleTheme);

// 키보드 단축키 (기획 §4.2/§5.1, 디자인 §6.6)
document.addEventListener("keydown", (e) => {
  const target = e.target;
  const tag = target?.tagName;
  const isEditable =
    tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
  if (isEditable) return;

  // Space — 정지/재개. 버튼 포커스 시 네이티브 클릭과 중복 방지(디자인 §6.6).
  if (e.key === " " || e.code === "Space") {
    if (tag === "BUTTON") return; // 네이티브 활성화에 위임
    e.preventDefault();
    toggleRunning();
    return;
  }
  // H — 형식 전환 (버튼과 충돌하는 네이티브 동작 없음)
  if (e.key === "h" || e.key === "H") {
    e.preventDefault();
    toggleFormat();
    return;
  }
});

// 언마운트/이탈 시 타이머 정리 (task 요구 — 누수 방지)
window.addEventListener("pagehide", stopTick);

// ─────────── 부팅 (기획 §4.2 초기 로드 전이) ───────────
initTheme();
renderFormatButton();
renderToggleButton();
renderNow(); // 로드 즉시 현재 날짜/시각 1회 렌더
startTick(); // running 시작
