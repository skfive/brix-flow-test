/* BF-438 · 날씨 카드 SPA 엔트리
 * 명세: docs/design/weather-BF-435.md (디자인 토큰·hover lift·fade-in 차용)
 * Task: 도시 카드 CRUD + 인라인 메모 편집 + 삭제 모달 + 정렬 토글 + 빈 상태
 * 의존 (전역, non-module 로 선행 로드): window.WeatherStorage
 *
 * file:// CORS 안전 — ES module import / export / fetch 0건 (Task AC).
 * 모든 의존은 비-module <script src> 로 미리 로드된 globalThis.WeatherStorage 참조.
 */
(function (global) {
  "use strict";

  var WeatherStorage = global.WeatherStorage;
  if (!WeatherStorage) {
    // 페이지 부팅 실패 — script 순서 오류
    if (typeof console !== "undefined" && console.error) {
      console.error(
        "[weather] storage.js 가 main.js 보다 먼저 로드되어야 합니다.",
      );
    }
    return;
  }

  // ─────────── 상수 ───────────
  var CITY_MAX = 60;
  var MEMO_MAX = 140;
  var EMOJI_TO_STATE = {
    "☀️": "sunny",
    "☁️": "cloudy",
    "🌧️": "rainy",
    "❄️": "snowy",
    "⛈️": "thunder",
    "💨": "windy",
  };

  // ─────────── store ───────────
  var store;
  try {
    store = WeatherStorage.createWeatherStore();
  } catch (_e) {
    // localStorage 미가용 — memory adapter fallback (영속성만 포기, UX 유지)
    store = WeatherStorage.createWeatherStore(
      WeatherStorage.createMemoryStorage(),
    );
  }

  // ─────────── 상태 ───────────
  /** 인라인 메모 편집 중인 카드 id (단일 활성) */
  var editingMemoId = null;
  /** 삭제 모달이 표시 중인 카드 id (null = 닫힘) */
  var pendingDeleteId = null;
  /** 현재 정렬 모드 — store.loadSort() 와 동기 */
  var currentSort = WeatherStorage.DEFAULT_SORT;

  // ─────────── DOM 캐시 ───────────
  var gridEl = null;
  var emptyStateEl = null;
  var formEl = null;
  var cityInputEl = null;
  var emojiSelectEl = null;
  var memoInputEl = null;
  var submitBtn = null;
  var countLabelEl = null;
  var sortToggleEl = null;
  var sortLabelEl = null;
  var themeToggleEl = null;
  var modalBackdropEl = null;
  var modalConfirmEl = null;
  var modalCancelEl = null;
  var modalBodyEl = null;
  var srAnnounceEl = null;

  // ─────────── 부팅 ───────────
  function boot() {
    gridEl = document.getElementById("grid");
    emptyStateEl = document.getElementById("empty-state");
    formEl = document.getElementById("add-form");
    cityInputEl = document.getElementById("add-city");
    emojiSelectEl = document.getElementById("add-emoji");
    memoInputEl = document.getElementById("add-memo");
    submitBtn = document.getElementById("add-submit");
    countLabelEl = document.getElementById("count-label");
    sortToggleEl = document.getElementById("sort-toggle");
    sortLabelEl = document.getElementById("sort-toggle-label");
    themeToggleEl = document.getElementById("theme-toggle");
    modalBackdropEl = document.getElementById("modal-backdrop");
    modalConfirmEl = document.getElementById("modal-confirm");
    modalCancelEl = document.getElementById("modal-cancel");
    modalBodyEl = document.getElementById("modal-body");
    srAnnounceEl = document.getElementById("sr-announce");

    if (!gridEl || !formEl) return; // 안전 가드

    initTheme();
    currentSort = store.loadSort();
    updateSortLabel();
    render();

    if (formEl) {
      formEl.addEventListener("submit", function (e) {
        e.preventDefault();
        commitAddForm();
      });
    }
    if (themeToggleEl) {
      themeToggleEl.addEventListener("click", toggleTheme);
    }
    if (sortToggleEl) {
      sortToggleEl.addEventListener("click", toggleSort);
    }
    if (modalConfirmEl) {
      modalConfirmEl.addEventListener("click", confirmDelete);
    }
    if (modalCancelEl) {
      modalCancelEl.addEventListener("click", closeModal);
    }
    if (modalBackdropEl) {
      modalBackdropEl.addEventListener("click", function (e) {
        // backdrop 클릭 (모달 외부) 시 닫기
        if (e.target === modalBackdropEl) closeModal();
      });
    }

    setupKeyboardShortcuts();
  }

  // ─────────── 테마 (명세 §6.5) ───────────
  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  }
  function initTheme() {
    // head 인라인 스크립트가 이미 data-theme 설정 (FOUC 방지)
    // 여기선 토글 버튼 라벨 동기화만
    applyThemeButton(getTheme());
  }
  function applyThemeButton(theme) {
    if (!themeToggleEl) return;
    themeToggleEl.textContent = theme === "dark" ? "🌙" : "☀";
    themeToggleEl.setAttribute(
      "aria-label",
      theme === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환",
    );
  }
  function toggleTheme() {
    var next = getTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    applyThemeButton(next);
    try {
      WeatherStorage.writeTheme(next);
    } catch (_e) {
      /* silent */
    }
    announce("테마: " + (next === "dark" ? "다크" : "라이트"));
  }

  // ─────────── 정렬 토글 ───────────
  function toggleSort() {
    currentSort =
      currentSort === "updated-desc" ? "city-asc" : "updated-desc";
    try {
      store.saveSort(currentSort);
    } catch (_e) {
      /* silent */
    }
    updateSortLabel();
    render();
    announce("정렬: " + sortLabelText());
  }
  function sortLabelText() {
    return currentSort === "city-asc" ? "도시명 가나다" : "최신순";
  }
  function updateSortLabel() {
    if (sortLabelEl) sortLabelEl.textContent = sortLabelText();
  }

  // ─────────── render ───────────
  function render() {
    if (!gridEl) return;
    var cards = store.listSorted(currentSort);
    gridEl.innerHTML = "";

    if (cards.length === 0) {
      if (emptyStateEl) emptyStateEl.hidden = false;
      gridEl.hidden = true;
    } else {
      if (emptyStateEl) emptyStateEl.hidden = true;
      gridEl.hidden = false;
      for (var i = 0; i < cards.length; i++) {
        gridEl.appendChild(renderCard(cards[i]));
      }
    }

    if (countLabelEl) {
      countLabelEl.textContent = cards.length + "개 도시";
    }
  }

  function renderCard(card) {
    var article = document.createElement("article");
    article.className = "card";
    article.dataset.cardId = card.id;
    var state = card.state || EMOJI_TO_STATE[card.emoji] || "";
    if (state) article.dataset.state = state;
    article.setAttribute("aria-label", card.city + " 날씨 카드");

    // 삭제 버튼
    var del = document.createElement("button");
    del.type = "button";
    del.className = "card__delete";
    del.setAttribute("aria-label", "카드 삭제: " + card.city);
    del.textContent = "×";
    del.addEventListener("click", function (e) {
      e.stopPropagation();
      openDeleteModal(card.id);
    });
    article.appendChild(del);

    // head — 이모지 + 도시명
    var head = document.createElement("header");
    head.className = "card__head";
    var emoji = document.createElement("span");
    emoji.className = "card__emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = card.emoji || "🌥️";
    var cityEl = document.createElement("h2");
    cityEl.className = "card__city";
    cityEl.textContent = card.city;
    head.appendChild(emoji);
    head.appendChild(cityEl);
    article.appendChild(head);

    // memo (인라인 편집 가능)
    if (editingMemoId === card.id) {
      var ta = document.createElement("textarea");
      ta.className = "card__memo-edit";
      ta.value = card.memo || "";
      ta.maxLength = MEMO_MAX;
      ta.setAttribute("aria-label", card.city + " 메모 편집");
      ta.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commitMemoEdit(card.id, ta.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelMemoEdit();
        }
      });
      ta.addEventListener("blur", function () {
        if (editingMemoId === card.id) {
          commitMemoEdit(card.id, ta.value);
        }
      });
      // 다음 frame 에서 focus + caret 끝으로
      setTimeout(function () {
        ta.focus();
        try {
          ta.setSelectionRange(ta.value.length, ta.value.length);
        } catch (_e) {
          /* silent */
        }
      }, 0);
      article.appendChild(ta);
    } else {
      var memoEl = document.createElement("p");
      memoEl.className = "card__memo";
      if (!card.memo) {
        memoEl.classList.add("card__memo--empty");
        memoEl.textContent = "메모를 추가하려면 여기를 클릭";
      } else {
        memoEl.textContent = card.memo;
      }
      memoEl.setAttribute("role", "button");
      memoEl.setAttribute("tabindex", "0");
      memoEl.setAttribute("aria-label", "메모 편집 — " + card.city);
      memoEl.addEventListener("click", function () {
        startMemoEdit(card.id);
      });
      memoEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          startMemoEdit(card.id);
        }
      });
      article.appendChild(memoEl);
    }

    // meta (생성/수정 시각)
    var meta = document.createElement("div");
    meta.className = "card__meta";
    var created = document.createElement("span");
    created.className = "card__created";
    created.textContent = formatTimestamp(card.updatedAt || card.createdAt);
    meta.appendChild(created);
    article.appendChild(meta);

    return article;
  }

  // ─────────── 카드 CRUD ───────────
  function commitAddForm() {
    var city = (cityInputEl.value || "").trim();
    var emoji = (emojiSelectEl.value || "").trim();
    var memo = (memoInputEl.value || "").trim();

    if (!city) {
      cityInputEl.focus();
      return;
    }
    if (city.length > CITY_MAX) city = city.slice(0, CITY_MAX);
    if (memo.length > MEMO_MAX) memo = memo.slice(0, MEMO_MAX);

    var now = Date.now();
    var id = WeatherStorage.ulid(now);
    var state = EMOJI_TO_STATE[emoji] || "";
    var card = {
      id: id,
      city: city,
      emoji: emoji || "🌥️",
      memo: memo,
      state: state,
      createdAt: now,
      updatedAt: now,
    };

    try {
      store.saveCard(card);
    } catch (_e) {
      // 유효성 실패 — 사용자에게 silent (이미 위에서 trim/슬라이스)
      return;
    }

    // form reset (도시명·메모만 — 이모지는 마지막 선택 유지)
    cityInputEl.value = "";
    memoInputEl.value = "";

    render();
    announce(city + " 카드를 추가했습니다");
    cityInputEl.focus();
  }

  function startMemoEdit(cardId) {
    if (pendingDeleteId) return; // 모달 열린 동안 무시
    editingMemoId = cardId;
    render();
  }
  function cancelMemoEdit() {
    editingMemoId = null;
    render();
  }
  function commitMemoEdit(cardId, rawMemo) {
    var existing = store.getCard(cardId);
    if (!existing) {
      editingMemoId = null;
      render();
      return;
    }
    var memo = (rawMemo || "").trim();
    if (memo.length > MEMO_MAX) memo = memo.slice(0, MEMO_MAX);
    if (memo === (existing.memo || "")) {
      // 변경 없음 — 그냥 닫기
      editingMemoId = null;
      render();
      return;
    }
    existing.memo = memo;
    existing.updatedAt = Date.now();
    try {
      store.saveCard(existing);
    } catch (_e) {
      /* silent */
    }
    editingMemoId = null;
    render();
    announce(existing.city + " 메모를 저장했습니다");
  }

  // ─────────── 삭제 모달 ───────────
  function openDeleteModal(cardId) {
    var card = store.getCard(cardId);
    if (!card) return;
    pendingDeleteId = cardId;
    if (modalBodyEl) {
      modalBodyEl.textContent =
        "[" + card.city + "] 카드를 정말 삭제할까요? 이 동작은 되돌릴 수 없습니다.";
    }
    if (modalBackdropEl) modalBackdropEl.hidden = false;
    // confirm 버튼에 focus (default 액션 명시 — Esc 로 취소 보장)
    setTimeout(function () {
      if (modalConfirmEl) modalConfirmEl.focus();
    }, 0);
  }
  function closeModal() {
    pendingDeleteId = null;
    if (modalBackdropEl) modalBackdropEl.hidden = true;
  }
  function confirmDelete() {
    if (!pendingDeleteId) {
      closeModal();
      return;
    }
    var card = store.getCard(pendingDeleteId);
    var name = card ? card.city : "";
    store.removeCard(pendingDeleteId);
    if (editingMemoId === pendingDeleteId) editingMemoId = null;
    pendingDeleteId = null;
    if (modalBackdropEl) modalBackdropEl.hidden = true;
    render();
    if (name) announce(name + " 카드를 삭제했습니다");
  }

  // ─────────── 키보드 단축 ───────────
  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", function (e) {
      var target = e.target;
      var tag = target && target.tagName;
      var inEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (target && target.isContentEditable);

      // 전역 Esc — 모달 / 인라인 편집 모두 취소
      if (e.key === "Escape") {
        if (pendingDeleteId) {
          e.preventDefault();
          closeModal();
          return;
        }
        if (editingMemoId) {
          // textarea 의 keydown 핸들러에서 이미 처리되지만, focus 가 빠진 경우 fallback
          e.preventDefault();
          cancelMemoEdit();
          return;
        }
        // form 입력 중 Esc → form 입력 초기화 (light)
        if (inEditable && formEl && formEl.contains(target)) {
          e.preventDefault();
          if (target.value) target.value = "";
        }
        return;
      }

      // T — 테마 토글 (input/textarea/select 안에서는 비활성)
      if (!inEditable && (e.key === "t" || e.key === "T")) {
        // 모달 안에서는 비활성
        if (pendingDeleteId) return;
        e.preventDefault();
        toggleTheme();
        return;
      }

      // 모달 표시 중 Enter → 확정 (focus 가 다른 곳에 있을 때 대비)
      if (pendingDeleteId && e.key === "Enter" && !inEditable) {
        e.preventDefault();
        confirmDelete();
        return;
      }
    });
  }

  // ─────────── a11y SR ───────────
  function announce(text) {
    if (!srAnnounceEl) return;
    srAnnounceEl.textContent = text;
  }

  // ─────────── 유틸 ───────────
  function formatTimestamp(ts) {
    if (!ts || typeof ts !== "number") return "";
    try {
      var d = new Date(ts);
      var yyyy = d.getFullYear();
      var mm = String(d.getMonth() + 1).padStart(2, "0");
      var dd = String(d.getDate()).padStart(2, "0");
      var hh = String(d.getHours()).padStart(2, "0");
      var mi = String(d.getMinutes()).padStart(2, "0");
      return yyyy + "-" + mm + "-" + dd + " " + hh + ":" + mi;
    } catch (_e) {
      return "";
    }
  }

  // ─────────── 부팅 트리거 ───────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
