// BF-482 · 타이머 SPA 런타임
// 명세: docs/design/timer-BF-479.md
// tech-stack: vanilla-static — IIFE, 외부 CDN 0건, import/export/fetch/ESM 금지
// localStorage:
//   bf-theme             — 전 SPA 공유 테마 키 (§7.1)
//   bf-timer-last-config — 마지막 타이머 설정값 (§7.2)

(function () {
  "use strict";

  // ───────────────────────────────────────────────────────────
  // § 순수 로직 (DOM 비의존, 테스트 가능)
  // ───────────────────────────────────────────────────────────

  /**
   * 분/초 → 표시 문자열 "M:SS"
   * §4.3: 분은 자연수(zero-pad 없음), 초는 항상 2자리 zero-pad.
   * @param {number} minutes
   * @param {number} seconds
   * @returns {string}
   */
  function formatMmSs(minutes, seconds) {
    var m = Number.isFinite(+minutes) ? Math.max(0, Math.trunc(+minutes)) : 0;
    var s = Number.isFinite(+seconds) ? Math.max(0, Math.trunc(+seconds)) : 0;
    return m + ":" + String(s).padStart(2, "0");
  }

  /**
   * 분 입력 정규화 — [0, 99] clamp, 유효하지 않은 값 → 0
   * §4.4: 초 overflow 시 carrying 안 함
   * @param {number|string} value
   * @returns {number}
   */
  function clampMinutes(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 0;
    if (n < 0) return 0;
    if (n > 99) return 99;
    return Math.trunc(n);
  }

  /**
   * 초 입력 정규화 — [0, 59] clamp, 유효하지 않은 값 → 0
   * §4.4: 60 이상 → 단순 clamp (분 carrying 없음)
   * @param {number|string} value
   * @returns {number}
   */
  function clampSeconds(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 0;
    if (n < 0) return 0;
    if (n > 59) return 59;
    return Math.trunc(n);
  }

  /**
   * 분/초 → 총 밀리초
   * @param {number} minutes
   * @param {number} seconds
   * @returns {number}
   */
  function toTotalMs(minutes, seconds) {
    return clampMinutes(minutes) * 60000 + clampSeconds(seconds) * 1000;
  }

  /**
   * 남은 밀리초 → 분/초 표시값 (ceil 표시)
   * §6.3: 1ms 라도 남아 있으면 "1초" 로 노출 — 마지막 1초가 사라지는 인상 방지
   * @param {number} remainingMs
   * @returns {{ minutes: number, seconds: number }}
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

  // ───────────────────────────────────────────────────────────
  // §7 localStorage (bf-theme + bf-timer-last-config)
  // ───────────────────────────────────────────────────────────

  var THEME_KEY       = "bf-theme";
  var LAST_CONFIG_KEY = "bf-timer-last-config";

  /** §7.2: 마지막 설정값 저장 */
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

  /** §7.2: 마지막 설정값 복원 — 없거나 잘못된 형식이면 null */
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

  /** §7.2: 마지막 설정값 삭제 (0:00 입력 시 clean default) */
  function clearLast() {
    try {
      localStorage.removeItem(LAST_CONFIG_KEY);
    } catch (_e) {}
  }

  // ───────────────────────────────────────────────────────────
  // DOM 캐싱
  // ───────────────────────────────────────────────────────────

  var dispMEl      = document.getElementById("disp-m");
  var dispSEl      = document.getElementById("disp-s");
  var displayEl    = document.getElementById("display");
  var inputPairEl  = document.getElementById("input-pair");
  var inputMEl     = document.getElementById("input-m");
  var inputSEl     = document.getElementById("input-s");
  var hintEl       = document.getElementById("hint");
  var btnPrimary   = document.getElementById("btn-primary");
  var btnReset     = document.getElementById("btn-reset");
  var btnTheme     = document.getElementById("theme-toggle");
  var bannerEl     = document.getElementById("ended-banner");
  var btnBannerClose = document.getElementById("btn-banner-close");

  // ───────────────────────────────────────────────────────────
  // 상태 (§6.1 상태 머신)
  // phase: "idle" | "running" | "paused" | "ended"
  // ───────────────────────────────────────────────────────────

  var phase         = "idle";
  var configMinutes = 0;    // 마지막 사용자 설정값 (리셋·복원의 기준)
  var configSeconds = 0;
  var remainingMs   = 0;    // running/paused 중 남은 밀리초
  var tickStart     = 0;    // 현재 tick 의 performance.now() 기준점
  var rafId         = null; // requestAnimationFrame 핸들

  // ───────────────────────────────────────────────────────────
  // §7.1 + §5.5: 테마 토글 (bf-theme 공유 키)
  // ───────────────────────────────────────────────────────────

  /**
   * 현재 data-theme attribute 를 source of truth 로 사용.
   * head IIFE 가 이미 localStorage 에서 읽어 attribute 를 설정했으므로
   * 이 시점에 attribute 가 확정돼 있음.
   * @param {string} theme "dark" | "light"
   */
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

  // ───────────────────────────────────────────────────────────
  // 렌더 (§4.3~§4.7 + §4.5 버튼 매트릭스)
  // ───────────────────────────────────────────────────────────

  /** display 텍스트 최소 갱신 — rAF 비용 최소화 */
  function updateDisplay(minutes, seconds) {
    dispMEl.textContent = String(minutes);
    dispSEl.textContent = String(seconds).padStart(2, "0");
  }

  /**
   * 전체 렌더: 상태에 따라 display·input·버튼·배너를 일관성 있게 갱신.
   * 명세 §4.3~§4.7, §4.5 버튼 매트릭스 참조.
   */
  function render() {
    var dispM, dispS;

    // 1) display 표시값 결정 (§4.3 상태별 색상)
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

    // 2) display 상태 클래스 (§4.3)
    var isEmpty = phase === "idle" && configMinutes === 0 && configSeconds === 0;
    displayEl.classList.toggle("is-empty", isEmpty);
    displayEl.classList.toggle("is-ended", phase === "ended");

    // 3) input-pair 노출 — idle 만 (§4.4)
    inputPairEl.hidden = phase !== "idle";

    // 4) hint 노출 — idle + 빈 상태 (§4.7)
    hintEl.hidden = !(phase === "idle" && isEmpty);

    // 5) 컨트롤 버튼 라벨·활성화 (§4.5 매트릭스)
    var hasValue = configMinutes > 0 || configSeconds > 0;

    if (phase === "idle") {
      btnPrimary.textContent = "▶ 시작";
      btnPrimary.disabled    = !hasValue;
      btnPrimary.setAttribute("aria-label", "타이머 시작");
      btnReset.textContent   = "⟲ 리셋";
      btnReset.disabled      = !hasValue;
    } else if (phase === "running") {
      btnPrimary.textContent = "⏸ 일시정지";
      btnPrimary.disabled    = false;
      btnPrimary.setAttribute("aria-label", "타이머 일시정지");
      btnReset.textContent   = "⟲ 리셋";
      btnReset.disabled      = false;
    } else if (phase === "paused") {
      btnPrimary.textContent = "▶ 재개";
      btnPrimary.disabled    = false;
      btnPrimary.setAttribute("aria-label", "타이머 재개");
      btnReset.textContent   = "⟲ 리셋";
      btnReset.disabled      = false;
    } else if (phase === "ended") {
      btnPrimary.textContent = "▶ 시작";
      btnPrimary.disabled    = true;
      btnPrimary.setAttribute("aria-label", "타이머 시작 (시간을 입력하세요)");
      btnReset.textContent   = "⟲ 새 타이머";
      btnReset.disabled      = false;
    }

    // 6) 종료 배너 (§4.6)
    bannerEl.hidden = phase !== "ended";
  }

  // ───────────────────────────────────────────────────────────
  // 액션 (§6.1 상태 전이)
  // ───────────────────────────────────────────────────────────

  /** idle 상태에서 input 값 → config 에 반영 + 시각 정규화 */
  function applyInputsToConfig() {
    configMinutes = clampMinutes(inputMEl.value);
    configSeconds = clampSeconds(inputSEl.value);
    inputMEl.value = String(configMinutes);
    inputSEl.value = String(configSeconds);
  }

  /** config → localStorage 영속 (0:00 은 clean default 유지) */
  function persistLast() {
    if (configMinutes === 0 && configSeconds === 0) {
      clearLast();
      return;
    }
    saveLast(configMinutes, configSeconds);
  }

  /**
   * idle → running 또는 paused → running (시작/재개 통합)
   * §6.1: idle 에서 hasValue=false 이면 무시.
   */
  function startOrResume() {
    if (phase === "idle") {
      applyInputsToConfig();
      if (configMinutes === 0 && configSeconds === 0) return;
      remainingMs = toTotalMs(configMinutes, configSeconds);
      persistLast();
    }
    if (phase === "ended") return;

    phase     = "running";
    tickStart = performance.now();
    render();
    scheduleTick();
  }

  /**
   * running → paused
   * §6.1: 마지막 tick 이후 경과 시간을 remainingMs 에서 차감 후 정지.
   */
  function pause() {
    if (phase !== "running") return;
    var now = performance.now();
    remainingMs = Math.max(0, remainingMs - (now - tickStart));
    tickStart   = 0;
    cancelTick();
    phase = "paused";
    render();
  }

  /**
   * any → idle (마지막 설정값으로 input 복원)
   * §6.1: 확인 modal 없음. configMinutes/Seconds 로 display/input 복원.
   */
  function reset() {
    cancelTick();
    phase       = "idle";
    remainingMs = 0;
    tickStart   = 0;
    inputMEl.value = String(configMinutes);
    inputSEl.value = String(configSeconds);
    render();
  }

  /**
   * ended → idle (배너 닫기 / Esc / ⟲ 새 타이머)
   * §6.4: idle 복귀 + 마지막 설정값 display.
   */
  function dismissBanner() {
    phase = "idle";
    render();
  }

  // ───────────────────────────────────────────────────────────
  // §6.3 rAF tick 루프 (requestAnimationFrame + performance.now drift-correction)
  // ───────────────────────────────────────────────────────────

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

  /**
   * 매 프레임 호출.
   * drift-correction: elapsed = now - tickStart (전 프레임 기준점)
   * remainingMs -= elapsed → 0 도달 시 ended 전이.
   */
  function tick() {
    if (phase !== "running") return;
    var now     = performance.now();
    var elapsed = now - tickStart;
    tickStart   = now;
    remainingMs = Math.max(0, remainingMs - elapsed);

    if (remainingMs <= 0) {
      remainingMs = 0;
      cancelTick();
      phase = "ended";
      render(); // ended 진입 → 배너 표시 + display is-ended + 버튼 갱신
      return;
    }

    // display 최소 갱신 (full render 없이 textContent 만 — rAF 비용 최소화)
    var r = msToMmSs(remainingMs);
    updateDisplay(r.minutes, r.seconds);

    rafId = requestAnimationFrame(tick);
  }

  // ───────────────────────────────────────────────────────────
  // 이벤트 바인딩
  // ───────────────────────────────────────────────────────────

  // primary 버튼 — 시작 / 일시정지 / 재개 토글
  btnPrimary.addEventListener("click", function () {
    if (phase === "running") {
      pause();
    } else if (phase === "idle" || phase === "paused") {
      startOrResume();
    }
  });

  // reset 버튼
  btnReset.addEventListener("click", reset);

  // 배너 닫기 버튼
  btnBannerClose.addEventListener("click", dismissBanner);

  // 테마 토글 버튼
  btnTheme.addEventListener("click", toggleTheme);

  // 분/초 입력 → idle 상태에서 display 즉시 동기 (§4.4, debounce 없음)
  function onInputChange() {
    if (phase !== "idle") return;
    applyInputsToConfig();
    persistLast();
    render();
  }
  inputMEl.addEventListener("input", onInputChange);
  inputSEl.addEventListener("input", onInputChange);
  inputMEl.addEventListener("blur", onInputChange); // §4.4 blur clamp
  inputSEl.addEventListener("blur", onInputChange);

  // §6.2 키보드 단축키
  document.addEventListener("keydown", function (e) {
    // Esc — 항상 리셋 or ended 배너 닫기
    if (e.key === "Escape") {
      e.preventDefault();
      if (phase === "ended") {
        dismissBanner();
      } else {
        reset();
      }
      return;
    }

    // Space — input focus 시 양보 (§6.2)
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

    // T — 테마 토글 (input focus 제외, §6.2)
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

  // ───────────────────────────────────────────────────────────
  // 부팅 시퀀스
  // ───────────────────────────────────────────────────────────

  // §7.1: head IIFE 가 이미 data-theme 설정 → attribute 를 source of truth 로 동기
  var currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(currentTheme);

  // §7.2: 재방문 시 마지막 설정값 복원 (bf-timer-last-config)
  var last = loadLast();
  if (last && (last.minutes > 0 || last.seconds > 0)) {
    configMinutes = clampMinutes(last.minutes);
    configSeconds = clampSeconds(last.seconds);
    inputMEl.value = String(configMinutes);
    inputSEl.value = String(configSeconds);
  }

  render();
})();
