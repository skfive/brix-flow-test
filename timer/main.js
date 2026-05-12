// BF-407 · 타이머 SPA 엔트리
// - 명세: docs/design/timer-BF-405.md
// - 의존: timer/storage.js (localStorage), timer/timer.js (순수 로직)
// - 범위: 카운트다운, 시작/일시정지/리셋, 키보드 (Space/Esc), 종료 알림, 마지막 설정값 복원
//   notepad 와 bf-theme localStorage 키 공유 (§6.5)

import { createTimerStore } from "./storage.js";
import {
  formatMmSs,
  clampMinutes,
  clampSeconds,
  toTotalMs,
  msToMmSs,
} from "./timer.js";

const store = createTimerStore();

// ─────────── DOM 캐싱 ───────────
const $ = (id) => document.getElementById(id);
const dispMEl = $("disp-m");
const dispSEl = $("disp-s");
const displayEl = $("display");
const inputPairEl = $("input-pair");
const inputMEl = $("input-m");
const inputSEl = $("input-s");
const hintEl = $("hint");
const btnPrimary = $("btn-primary");
const btnReset = $("btn-reset");
const btnTheme = $("btn-theme");
const bannerEl = $("ended-banner");
const btnBannerClose = $("btn-banner-close");

// ─────────── 상태 ───────────
// state: "idle" | "running" | "paused" | "ended"
const state = {
  phase: "idle",
  // 마지막 사용자가 설정한 값 (리셋·복원의 기준)
  configMinutes: 0,
  configSeconds: 0,
  // running/paused 중 남은 밀리초
  remainingMs: 0,
  // running 중 마지막 tick 의 performance.now()
  tickStart: 0,
  rafId: null,
};

// ─────────── 테마 토글 (§6.5, notepad 와 키 공유) ───────────
const THEME_KEY = "bf-theme";
function initTheme() {
  let theme = null;
  try {
    theme = localStorage.getItem(THEME_KEY);
  } catch {
    // localStorage 사용 불가 환경 (private mode 등) — silent fallback
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
  btnTheme.textContent = theme === "dark" ? "☀" : "🌙";
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

// ─────────── 렌더 ───────────
function updateDisplay(minutes, seconds) {
  dispMEl.textContent = String(minutes);
  dispSEl.textContent = String(seconds).padStart(2, "0");
}

function render() {
  const { phase, configMinutes, configSeconds, remainingMs } = state;

  // 1) display 값 결정
  let dispM, dispS;
  if (phase === "running" || phase === "paused") {
    const out = msToMmSs(remainingMs);
    dispM = out.minutes;
    dispS = out.seconds;
  } else if (phase === "ended") {
    dispM = 0;
    dispS = 0;
  } else {
    // idle
    dispM = configMinutes;
    dispS = configSeconds;
  }
  updateDisplay(dispM, dispS);

  // 2) display 상태 클래스 (§4.3)
  const isEmpty = phase === "idle" && configMinutes === 0 && configSeconds === 0;
  displayEl.classList.toggle("is-empty", isEmpty);
  displayEl.classList.toggle("is-ended", phase === "ended");

  // 3) input pair 노출 (idle 만)
  inputPairEl.hidden = phase !== "idle";
  // 4) hint 노출 (idle + 빈 상태만)
  hintEl.hidden = !(phase === "idle" && isEmpty);

  // 5) 컨트롤 버튼 (§4.5)
  const hasValue = configMinutes > 0 || configSeconds > 0;

  if (phase === "idle") {
    btnPrimary.textContent = "▶ 시작";
    btnPrimary.disabled = !hasValue;
    btnPrimary.setAttribute("aria-label", "타이머 시작");
    btnReset.textContent = "⟲ 리셋";
    btnReset.disabled = !hasValue;
  } else if (phase === "running") {
    btnPrimary.textContent = "⏸ 일시정지";
    btnPrimary.disabled = false;
    btnPrimary.setAttribute("aria-label", "타이머 일시정지");
    btnReset.textContent = "⟲ 리셋";
    btnReset.disabled = false;
  } else if (phase === "paused") {
    btnPrimary.textContent = "▶ 재개";
    btnPrimary.disabled = false;
    btnPrimary.setAttribute("aria-label", "타이머 재개");
    btnReset.textContent = "⟲ 리셋";
    btnReset.disabled = false;
  } else if (phase === "ended") {
    btnPrimary.textContent = "▶ 시작";
    btnPrimary.disabled = true;
    btnPrimary.setAttribute("aria-label", "타이머 시작 (시간을 입력하세요)");
    btnReset.textContent = "⟲ 새 타이머";
    btnReset.disabled = false;
  }

  // 6) 종료 배너
  bannerEl.hidden = phase !== "ended";
}

// ─────────── 액션 ───────────
function applyInputsToConfig() {
  state.configMinutes = clampMinutes(inputMEl.value);
  state.configSeconds = clampSeconds(inputSEl.value);
  // input 시각도 정규화 값으로 동기
  inputMEl.value = String(state.configMinutes);
  inputSEl.value = String(state.configSeconds);
}

function persistLast() {
  if (state.configMinutes === 0 && state.configSeconds === 0) {
    // 빈 설정은 저장하지 않음 (clean default)
    store.clearLast();
    return;
  }
  try {
    store.saveLast({
      minutes: state.configMinutes,
      seconds: state.configSeconds,
    });
  } catch {
    // 범위 외 값은 위에서 clamp 되므로 도달 X — 안전 fallback
  }
}

function startOrResume() {
  if (state.phase === "idle") {
    applyInputsToConfig();
    if (state.configMinutes === 0 && state.configSeconds === 0) return;
    state.remainingMs = toTotalMs(state.configMinutes, state.configSeconds);
    persistLast();
  }
  if (state.phase === "ended") return;

  state.phase = "running";
  state.tickStart = performance.now();
  render();
  scheduleTick();
}

function pause() {
  if (state.phase !== "running") return;
  // 마지막 tick 시점까지의 잔여시간 갱신
  const now = performance.now();
  state.remainingMs = Math.max(0, state.remainingMs - (now - state.tickStart));
  state.tickStart = 0;
  cancelTick();
  state.phase = "paused";
  render();
}

function reset() {
  cancelTick();
  // AC2: 리셋 시 "입력값으로 복귀" — 마지막 설정값(configMinutes/Seconds) 으로 복원
  // (running/paused/ended 모두 동일하게 마지막 설정값으로 돌아감 — §6.4 의 ended 정책을 확장)
  state.phase = "idle";
  state.remainingMs = 0;
  state.tickStart = 0;
  // input 도 마지막 설정값으로 동기
  inputMEl.value = String(state.configMinutes);
  inputSEl.value = String(state.configSeconds);
  render();
}

function dismissBanner() {
  // §4.6: 배너 닫기 → idle 복귀 (display 0:00 자리에 마지막 설정값 복원)
  state.phase = "idle";
  render();
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
  const elapsed = now - state.tickStart;
  state.tickStart = now;
  state.remainingMs = Math.max(0, state.remainingMs - elapsed);

  if (state.remainingMs <= 0) {
    state.remainingMs = 0;
    cancelTick();
    state.phase = "ended";
    render();
    return;
  }
  // display 갱신 (재 render 없이 textContent 만 — 매 raf 호출 비용 최소화)
  const { minutes, seconds } = msToMmSs(state.remainingMs);
  updateDisplay(minutes, seconds);

  state.rafId = requestAnimationFrame(tick);
}

// ─────────── 이벤트 ───────────
btnPrimary.addEventListener("click", () => {
  if (state.phase === "running") {
    pause();
  } else if (state.phase === "paused" || state.phase === "idle") {
    startOrResume();
  }
});

btnReset.addEventListener("click", reset);

btnBannerClose.addEventListener("click", dismissBanner);

btnTheme.addEventListener("click", toggleTheme);

// 입력값 변경 → idle 상태에서만 display 동기 (§4.4)
function onInputChange() {
  if (state.phase !== "idle") return;
  applyInputsToConfig();
  persistLast();
  render();
}
inputMEl.addEventListener("input", onInputChange);
inputSEl.addEventListener("input", onInputChange);
// onBlur clamp (§4.4) — 잘못된 값 정규화 (input 이벤트로 이미 clamp 되지만 명확성 위해 한 번 더)
inputMEl.addEventListener("blur", onInputChange);
inputSEl.addEventListener("blur", onInputChange);

// 키보드 단축키 (§6.2)
document.addEventListener("keydown", (e) => {
  // Esc — 항상 리셋 (input focus 에서는 blur 후 리셋)
  if (e.key === "Escape") {
    e.preventDefault();
    if (state.phase === "ended") {
      // 배너 표시 중 Esc → 배너 닫기 + idle 복귀
      dismissBanner();
    } else {
      reset();
    }
    return;
  }
  // Space — input focus 시에는 양보 (§6.2)
  if (e.key === " " || e.code === "Space") {
    const focused = document.activeElement;
    const isInput = focused === inputMEl || focused === inputSEl;
    if (isInput) return;
    e.preventDefault();
    if (state.phase === "running") {
      pause();
    } else if (state.phase === "idle" || state.phase === "paused") {
      startOrResume();
    }
  }
});

// ─────────── 부팅 ───────────
initTheme();

// 새로고침 시 마지막 설정값 복원 (AC3)
const last = store.loadLast();
if (last && (last.minutes > 0 || last.seconds > 0)) {
  state.configMinutes = clampMinutes(last.minutes);
  state.configSeconds = clampSeconds(last.seconds);
  inputMEl.value = String(state.configMinutes);
  inputSEl.value = String(state.configSeconds);
}
render();
