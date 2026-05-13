// BF-476 · 타이머 SPA 앱 진입점
// tech-stack: vanilla-static — IIFE, 외부 CDN 0건, import/export/fetch 금지
// localStorage: bf-timer-last-config (BF-473 §7 키 통일)
// 명세: docs/design/timer-BF-473.md
// 의존: timer/index.html (DOM), timer/styles.css

(function () {
  "use strict";

  // ───────────── 순수 로직 (인라인) ─────────────────────────────────

  /**
   * "M:SS" 형식 — 분은 자연수, 초는 항상 2자리 zero-pad.
   * 명세 §4.3: tabular-nums + font-mono 로 가로폭 안정.
   */
  function formatMmSs(minutes, seconds) {
    var m = Number.isFinite(+minutes) ? Math.max(0, Math.trunc(+minutes)) : 0;
    var s = Number.isFinite(+seconds) ? Math.max(0, Math.trunc(+seconds)) : 0;
    return m + ":" + String(s).padStart(2, "0");
  }

  /** 분 입력 정규화: [0, 99] clamp, 유효하지 않은 값 → 0 */
  function clampMinutes(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 0;
    if (n < 0) return 0;
    if (n > 99) return 99;
    return Math.trunc(n);
  }

  /** 초 입력 정규화: [0, 59] clamp, 유효하지 않은 값 → 0 */
  function clampSeconds(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 0;
    if (n < 0) return 0;
    if (n > 59) return 59;
    return Math.trunc(n);
  }

  /** 분/초 → 총 밀리초 */
  function toTotalMs(minutes, seconds) {
    return clampMinutes(minutes) * 60000 + clampSeconds(seconds) * 1000;
  }

  /**
   * 남은 밀리초 → 분/초 표시값 (ceil 표시).
   * 1ms 라도 남아 있으면 "1초" 로 노출 — 마지막 1초 사라지는 인상 방지.
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

  // ───────────── localStorage (BF-473 §7) ──────────────────────────

  var LAST_CONFIG_KEY = "bf-timer-last-config";
  var THEME_KEY = "bf-theme";

  function saveLast(minutes, seconds) {
    try {
      localStorage.setItem(
        LAST_CONFIG_KEY,
        JSON.stringify({ minutes: minutes, seconds: seconds })
      );
    } catch (_e) {
      // private mode 등 — silent
    }
  }

  function loadLast() {
    try {
      var raw = localStorage.getItem(LAST_CONFIG_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !Number.isFinite(parsed.minutes) ||
        !Number.isFinite(parsed.seconds)
      ) {
        return null;
      }
      return { minutes: parsed.minutes, seconds: parsed.seconds };
    } catch (_e) {
      return null;
    }
  }

  function clearLast() {
    try {
      localStorage.removeItem(LAST_CONFIG_KEY);
    } catch (_e) {}
  }

  // ───────────── DOM 캐싱 ──────────────────────────────────────────

  var dispMEl = document.getElementById("disp-m");
  var dispSEl = document.getElementById("disp-s");
  var displayEl = document.getElementById("display");
  var inputPairEl = document.getElementById("input-pair");
  var inputMEl = document.getElementById("input-m");
  var inputSEl = document.getElementById("input-s");
  var hintEl = document.getElementById("hint");
  var btnPrimary = document.getElementById("btn-primary");
  var btnReset = document.getElementById("btn-reset");
  var btnTheme = document.getElementById("theme-toggle");
  var bannerEl = document.getElementById("ended-banner");
  var btnBannerClose = document.getElementById("btn-banner-close");

  // ───────────── 상태 ──────────────────────────────────────────────
  // phase: "idle" | "running" | "paused" | "ended"

  var phase = "idle";
  var configMinutes = 0;
  var configSeconds = 0;
  var remainingMs = 0;
  var tickStart = 0;
  var rafId = null;

  // ───────────── 테마 (BF-473 §5.5, bf-theme 공유 키) ─────────────

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    btnTheme.textContent = theme === "dark" ? "☀" : "🌙";
    btnTheme.setAttribute(
      "aria-label",
      theme === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환"
    );
  }

  function toggleTheme() {
    var next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (_e) {}
  }

  // ───────────── 렌더 ──────────────────────────────────────────────

  function updateDisplay(minutes, seconds) {
    dispMEl.textContent = String(minutes);
    dispSEl.textContent = String(seconds).padStart(2, "0");
  }

  function render() {
    var dispM, dispS;

    // 1) display 값 결정
    if (phase === "running" || phase === "paused") {
      var out = msToMmSs(remainingMs);
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

    // 2) display 상태 클래스 (명세 §4.3)
    var isEmpty =
      phase === "idle" && configMinutes === 0 && configSeconds === 0;
    displayEl.classList.toggle("is-empty", isEmpty);
    displayEl.classList.toggle("is-ended", phase === "ended");

    // 3) input pair 노출 (idle 만)
    inputPairEl.hidden = phase !== "idle";

    // 4) hint 노출 (idle + 빈 상태만)
    hintEl.hidden = !(phase === "idle" && isEmpty);

    // 5) 컨트롤 버튼 상태 (명세 §4.5)
    var hasValue = configMinutes > 0 || configSeconds > 0;

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

    // 6) 종료 배너 (명세 §4.6)
    bannerEl.hidden = phase !== "ended";
  }

  // ───────────── 액션 ──────────────────────────────────────────────

  function applyInputsToConfig() {
    configMinutes = clampMinutes(inputMEl.value);
    configSeconds = clampSeconds(inputSEl.value);
    // input 시각도 정규화 값으로 동기
    inputMEl.value = String(configMinutes);
    inputSEl.value = String(configSeconds);
  }

  function persistLast() {
    if (configMinutes === 0 && configSeconds === 0) {
      // 빈 설정은 저장하지 않음 (clean default)
      clearLast();
      return;
    }
    saveLast(configMinutes, configSeconds);
  }

  function startOrResume() {
    if (phase === "idle") {
      applyInputsToConfig();
      if (configMinutes === 0 && configSeconds === 0) return;
      remainingMs = toTotalMs(configMinutes, configSeconds);
      persistLast();
    }
    if (phase === "ended") return;

    phase = "running";
    tickStart = performance.now();
    render();
    scheduleTick();
  }

  function pause() {
    if (phase !== "running") return;
    // 마지막 tick 시점까지의 잔여시간 갱신
    var now = performance.now();
    remainingMs = Math.max(0, remainingMs - (now - tickStart));
    tickStart = 0;
    cancelTick();
    phase = "paused";
    render();
  }

  function reset() {
    cancelTick();
    // 리셋 → idle 전이 + 마지막 설정값으로 input 복원 (명세 §6.1)
    phase = "idle";
    remainingMs = 0;
    tickStart = 0;
    inputMEl.value = String(configMinutes);
    inputSEl.value = String(configSeconds);
    render();
  }

  function dismissBanner() {
    // 배너 닫기 → idle 복귀 + 마지막 설정값 표시 (명세 §4.6, §6.4)
    phase = "idle";
    render();
  }

  // ───────────── tick 루프 (rAF + performance.now drift-correction) ──

  function scheduleTick() {
    cancelTick();
    rafId = requestAnimationFrame(tick);
  }

  function cancelTick() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function tick() {
    if (phase !== "running") return;
    var now = performance.now();
    var elapsed = now - tickStart;
    tickStart = now;
    remainingMs = Math.max(0, remainingMs - elapsed);

    if (remainingMs <= 0) {
      remainingMs = 0;
      cancelTick();
      phase = "ended";
      render();
      return;
    }

    // display 최소 갱신 (full render 없이 textContent 만 — rAF 비용 최소화)
    var r = msToMmSs(remainingMs);
    updateDisplay(r.minutes, r.seconds);

    rafId = requestAnimationFrame(tick);
  }

  // ───────────── 이벤트 ────────────────────────────────────────────

  btnPrimary.addEventListener("click", function () {
    if (phase === "running") {
      pause();
    } else if (phase === "paused" || phase === "idle") {
      startOrResume();
    }
  });

  btnReset.addEventListener("click", reset);

  btnBannerClose.addEventListener("click", dismissBanner);

  btnTheme.addEventListener("click", toggleTheme);

  // 입력값 변경 → idle 상태에서만 display 동기 (명세 §4.4)
  function onInputChange() {
    if (phase !== "idle") return;
    applyInputsToConfig();
    persistLast();
    render();
  }

  inputMEl.addEventListener("input", onInputChange);
  inputSEl.addEventListener("input", onInputChange);
  inputMEl.addEventListener("blur", onInputChange);
  inputSEl.addEventListener("blur", onInputChange);

  // 키보드 단축키 (명세 §6.2)
  document.addEventListener("keydown", function (e) {
    // Esc — 리셋 or 배너 닫기
    if (e.key === "Escape") {
      e.preventDefault();
      if (phase === "ended") {
        dismissBanner();
      } else {
        reset();
      }
      return;
    }

    // Space — input focus 시 양보
    if (e.key === " " || e.code === "Space") {
      var focused = document.activeElement;
      var isInput = focused === inputMEl || focused === inputSEl;
      if (isInput) return;
      e.preventDefault();
      if (phase === "running") {
        pause();
      } else if (phase === "idle" || phase === "paused") {
        startOrResume();
      }
      return;
    }

    // T — 테마 토글 (input focus 제외)
    if (e.key && e.key.toLowerCase() === "t") {
      var activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")
      ) {
        return;
      }
      e.preventDefault();
      toggleTheme();
    }
  });

  // ───────────── 부팅 ──────────────────────────────────────────────

  // head IIFE 가 이미 data-theme 속성 설정 → 아이콘 동기
  var currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(currentTheme);

  // 새로고침 시 마지막 설정값 복원 (bf-timer-last-config, 명세 §7.2)
  var last = loadLast();
  if (last && (last.minutes > 0 || last.seconds > 0)) {
    configMinutes = clampMinutes(last.minutes);
    configSeconds = clampSeconds(last.seconds);
    inputMEl.value = String(configMinutes);
    inputSEl.value = String(configSeconds);
  }

  render();
})();
