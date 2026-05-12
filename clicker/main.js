/* BF-443 · 클릭 카운터 SPA 엔트리
 * 명세: docs/design/clicker-BF-441.md
 * 작업 AC (BF-443):
 *  - 클릭 5회 시 점수 5 + best 5 + 리셋 후 점수 0/best 5 유지 + 전체 초기화 시 0/0 + 새로고침 후 복원
 *  - file:// 직접 열기 (ES module/fetch/외부 CDN 금지)
 *
 * 의존: clicker/storage.js (globalThis.ClickerStorage 로 노출됨)
 * file:// CORS 안전을 위해 IIFE — import/export 키워드, fetch, 외부 CDN 0건.
 */
(function () {
  "use strict";

  // ─── 의존 모듈 (비-module 로 미리 로드됨) ───
  var Storage = globalThis.ClickerStorage;
  if (!Storage) {
    console.error(
      "[clicker] storage.js 가 main.js 보다 먼저 로드돼야 합니다.",
    );
    return;
  }

  // ─── DOM 캐싱 ───
  var $ = function (id) {
    return document.getElementById(id);
  };
  var scoreEl = $("score-value");
  var bestEl = $("best-score-value");
  var clickBtn = $("btn-click");
  var resetBtn = $("btn-reset");
  var clearAllBtn = $("btn-clear-all");
  var themeBtn = $("theme-toggle");
  var toastStackEl = $("toast-stack");
  var modalBackdropEl = $("modal-backdrop");
  var modalConfirmEl = $("modal-confirm");
  var modalCancelEl = $("modal-cancel");

  // ─── store (localStorage 사용 불가 시 memory fallback) ───
  var store;
  try {
    store = Storage.createClickerStore();
  } catch (_e) {
    store = Storage.createClickerStore(Storage.createMemoryStorage());
  }

  // ─── 상태 ───
  var state = { score: 0, best: 0 };

  // ─── render ───
  function renderScore() {
    scoreEl.textContent = String(state.score);
    scoreEl.setAttribute(
      "aria-label",
      "현재 점수 " + state.score + " 점",
    );
    scoreEl.classList.toggle("is-zero", state.score === 0);
  }

  function renderBest() {
    bestEl.textContent = String(state.best);
  }

  function renderControls() {
    // reset: 현재 점수만 0 — 점수가 이미 0 이면 의미 없음
    resetBtn.disabled = state.score === 0;
    // 전체 초기화: score 와 best 모두 0 — 둘 다 이미 0 이면 의미 없음
    clearAllBtn.disabled = state.score === 0 && state.best === 0;
  }

  function render() {
    renderScore();
    renderBest();
    renderControls();
  }

  // ─── persist ───
  function persistScore() {
    try {
      store.saveScore(state.score);
    } catch (_e) {
      /* silent — private mode 등 */
    }
  }
  function persistBest() {
    try {
      store.saveBest(state.best);
    } catch (_e) {
      /* silent */
    }
  }

  // ─── toast (best 갱신 축하 — 명세 §1.3 비목표였으나 BF-443 AC 로 승격) ───
  function showToast(message) {
    var toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastStackEl.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add("is-visible");
    });
    setTimeout(function () {
      toast.classList.remove("is-visible");
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 3500);
  }

  // ─── 클릭 핸들러 ───
  function handleClick() {
    state.score += 1;
    var isBestUpdated = state.score > state.best;
    if (isBestUpdated) {
      state.best = state.score;
      persistBest();
    }
    persistScore();
    render();

    // press 시각 동기 (마우스 :active 보강 + 키보드 트리거 케이스 — 명세 §6.3)
    clickBtn.classList.add("is-pressed");
    setTimeout(function () {
      clickBtn.classList.remove("is-pressed");
    }, 150); /* AC §1: 150ms */

    // 점수 일시 강조 색 (§5.1 옵션 — 운영자 §13.1 default 채택)
    scoreEl.classList.add("is-pulse");
    setTimeout(function () {
      scoreEl.classList.remove("is-pulse");
    }, 220); /* --motion-mid */

    // best 갱신 축하 toast — 1, 10, 50, 100 등 milestone 에서만 SR 알림 (성가심 회피)
    if (isBestUpdated && shouldCelebrate(state.best)) {
      showToast("🎉 최고 점수 갱신! " + state.best);
    }
  }

  /**
   * milestone 판정 — 매 클릭마다 toast 가 떠 성가시지 않도록 의미 있는 시점만 알림.
   *  - 1 (첫 점수), 10, 50, 100, 500, 1000, 그 이후 1000 의 배수
   */
  function shouldCelebrate(best) {
    if (best === 1 || best === 10 || best === 50 || best === 100) return true;
    if (best >= 500 && best % 500 === 0) return true;
    return false;
  }

  // ─── reset (현재 점수만 0, best 유지) ───
  function handleReset() {
    if (state.score === 0) return;
    state.score = 0;
    persistScore();
    render();
  }

  // ─── 전체 초기화 (확인 모달 경유) ───
  function openClearAllModal() {
    if (state.score === 0 && state.best === 0) return;
    modalBackdropEl.hidden = false;
    // confirm 버튼에 focus (Esc 키 취소 보장)
    requestAnimationFrame(function () {
      if (modalConfirmEl) modalConfirmEl.focus();
    });
  }
  function closeClearAllModal() {
    modalBackdropEl.hidden = true;
    // 닫을 때 trigger 로 focus 복귀
    if (clearAllBtn && !clearAllBtn.disabled) {
      clearAllBtn.focus();
    }
  }
  function confirmClearAll() {
    state.score = 0;
    state.best = 0;
    try {
      store.clearAll();
    } catch (_e) {
      /* silent */
    }
    render();
    closeClearAllModal();
  }

  // ─── 테마 토글 ───
  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeBtn.textContent = theme === "dark" ? "🌙" : "☀";
    themeBtn.setAttribute(
      "aria-label",
      theme === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환",
    );
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

  // ─── 이벤트 와이어링 ───
  clickBtn.addEventListener("click", handleClick);
  resetBtn.addEventListener("click", handleReset);
  clearAllBtn.addEventListener("click", openClearAllModal);
  themeBtn.addEventListener("click", toggleTheme);

  if (modalCancelEl) modalCancelEl.addEventListener("click", closeClearAllModal);
  if (modalConfirmEl) modalConfirmEl.addEventListener("click", confirmClearAll);
  if (modalBackdropEl) {
    modalBackdropEl.addEventListener("click", function (e) {
      // backdrop 직접 클릭만 닫음 (모달 내부 클릭은 무시)
      if (e.target === modalBackdropEl) closeClearAllModal();
    });
  }

  // 키보드 단축 (명세 §6.2)
  document.addEventListener("keydown", function (e) {
    var target = e.target;
    if (
      target &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
    )
      return;

    // 모달 열림 시: Esc 만 취소, Enter 는 confirm
    if (modalBackdropEl && !modalBackdropEl.hidden) {
      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        closeClearAllModal();
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirmClearAll();
      }
      return;
    }

    var key = e.key.toLowerCase();
    if (e.key === " " || e.key === "Spacebar" || e.code === "Space") {
      // 버튼이 이미 focused 면 브라우저 기본 click 발동 → 중복 방지 (§6.2)
      if (
        target === clickBtn ||
        target === resetBtn ||
        target === clearAllBtn ||
        target === themeBtn
      )
        return;
      e.preventDefault();
      handleClick();
    } else if (key === "r") {
      e.preventDefault();
      handleReset();
    } else if (key === "t") {
      e.preventDefault();
      toggleTheme();
    }
  });

  // ─── 부팅: 새로고침 복원 ───
  applyTheme(getTheme());

  try {
    state.score = store.loadScore();
    state.best = store.loadBest();
  } catch (_e) {
    state.score = 0;
    state.best = 0;
  }
  // best 가 score 보다 작은 corrupt 상태 방어 — 한 번 보정 후 저장
  if (state.best < state.score) {
    state.best = state.score;
    persistBest();
  }

  render();
})();
