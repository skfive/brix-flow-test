/* BF-464 · palette SPA 엔트리
 * 작업 AC (BF-464):
 *  - 5개 컬러 슬롯 — HEX·HSL 동시 표시, 다크 default
 *  - 슬롯 클릭 → 클립보드 HEX 복사 + 시각 피드백 (.is-copied)
 *  - 컬러 입력 변경 → 슬롯 갱신 + localStorage bf-palette 저장
 *  - #theme-toggle → bf-theme 갱신 + 새로고침 후 유지
 *  - file:// 직접 열기 (ES module / fetch / 외부 CDN 금지)
 *
 * 의존: palette/storage.js (globalThis.PaletteStorage 로 노출됨)
 * file:// CORS 안전을 위해 IIFE — import/export/fetch/외부 CDN 0건.
 */
(function () {
  "use strict";

  /* ─── 의존 모듈 ─── */
  var PS = globalThis.PaletteStorage;
  if (!PS) {
    console.error(
      "[palette] storage.js 가 app.js 보다 먼저 로드돼야 합니다.",
    );
    return;
  }

  /* ─── DOM 캐싱 ─── */
  var themeBtn = document.getElementById("theme-toggle");
  var slotsContainer = document.getElementById("slots");
  var toastEl = document.getElementById("copy-toast");

  /* ─── store (localStorage 사용 불가 시 memory fallback) ─── */
  var store;
  try {
    store = PS.createPaletteStore();
  } catch (_e) {
    store = PS.createPaletteStore(PS.createMemoryStorage());
  }

  /* ─── 상태 ─── */
  var state = { colors: PS.DEFAULT_COLORS.slice() };

  /* ─── Toast (복사 피드백 — AC §4) ─── */
  var toastTimer = null;
  function showCopyToast(hex) {
    if (!toastEl) return;
    toastEl.textContent = hex + " 복사됨";
    toastEl.classList.remove("is-hidden");
    toastEl.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-visible");
      toastEl.classList.add("is-hidden");
    }, 1800);
  }

  /* ─── 클립보드 복사 ─── */
  function copyText(text) {
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard.writeText(text).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (_e) {
      /* silent */
    }
  }

  /* ─── 슬롯 렌더링 ─── */
  function renderSlot(index) {
    var hex = state.colors[index];
    var hslStr = PS.hexToHslString(hex);
    var slotEl = document.getElementById("slot-" + index);
    if (!slotEl) return;

    var swatchEl = slotEl.querySelector(".slot__swatch");
    if (swatchEl) swatchEl.style.backgroundColor = hex;

    var hexEl = slotEl.querySelector(".slot__hex");
    if (hexEl) hexEl.textContent = hex;

    var hslEl = slotEl.querySelector(".slot__hsl");
    if (hslEl) hslEl.textContent = hslStr;

    var copyBtn = slotEl.querySelector(".slot__copy-btn");
    if (copyBtn) {
      copyBtn.setAttribute(
        "aria-label",
        "슬롯 " + (index + 1) + " HEX 복사 (" + hex + ")",
      );
    }

    var colorInput = slotEl.querySelector(".slot__color-input");
    if (colorInput) colorInput.value = hex;
  }

  function renderAll() {
    for (var i = 0; i < PS.SLOT_COUNT; i++) {
      renderSlot(i);
    }
  }

  /* ─── 복사 핸들러 (AC §4) ─── */
  function handleCopy(index) {
    var hex = state.colors[index];
    copyText(hex);
    showCopyToast(hex);

    /* 슬롯 시각 피드백 */
    var slotEl = document.getElementById("slot-" + index);
    if (!slotEl) return;
    slotEl.classList.add("is-copied");
    setTimeout(function () {
      slotEl.classList.remove("is-copied");
    }, 1000);
  }

  /* ─── 컬러 변경 핸들러 (AC §2) ─── */
  function handleColorChange(index, hex) {
    if (!PS.isValidHex(hex)) return;
    state.colors[index] = hex;
    renderSlot(index);
    try {
      store.saveColor(index, hex);
    } catch (_e) {
      /* silent — private mode 등 */
    }
  }

  /* ─── 이벤트 위임 ─── */
  if (slotsContainer) {
    slotsContainer.addEventListener("click", function (e) {
      var copyBtn = e.target.closest
        ? e.target.closest(".slot__copy-btn")
        : null;
      /* closest 미지원 환경 대비 */
      if (!copyBtn) {
        var el = e.target;
        while (el && el !== slotsContainer) {
          if (
            el.classList &&
            el.classList.contains("slot__copy-btn")
          ) {
            copyBtn = el;
            break;
          }
          el = el.parentNode;
        }
      }
      if (copyBtn) {
        var idx = parseInt(copyBtn.getAttribute("data-index"), 10);
        if (!isNaN(idx)) handleCopy(idx);
      }
    });

    /* 컬러 입력 — input (실시간) + change (확정) 둘 다 처리 */
    function onColorInput(e) {
      if (
        e.target.classList &&
        e.target.classList.contains("slot__color-input")
      ) {
        var idx = parseInt(e.target.getAttribute("data-index"), 10);
        if (!isNaN(idx)) handleColorChange(idx, e.target.value);
      }
    }
    slotsContainer.addEventListener("input", onColorInput);
    slotsContainer.addEventListener("change", onColorInput);
  }

  /* ─── 테마 토글 (AC §3) ─── */
  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeBtn) {
      themeBtn.textContent = theme === "dark" ? "🌙" : "☀";
      themeBtn.setAttribute(
        "aria-label",
        theme === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환",
      );
    }
  }

  function toggleTheme() {
    var next = getTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      store.saveTheme(next);
    } catch (_e) {
      /* silent */
    }
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
  }

  /* ─── 키보드 단축키 (T → 테마 토글) ─── */
  document.addEventListener("keydown", function (e) {
    var target = e.target;
    if (
      target &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
    )
      return;
    if (e.key && e.key.toLowerCase() === "t") {
      e.preventDefault();
      toggleTheme();
    }
  });

  /* ─── 부팅: 새로고침 복원 ─── */
  applyTheme(getTheme());

  try {
    state.colors = store.loadColors();
  } catch (_e) {
    state.colors = PS.DEFAULT_COLORS.slice();
  }

  renderAll();
})();
