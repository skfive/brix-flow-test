/* BF-427 · 칸반 보드 SPA 엔트리
 * 명세: docs/design/kanban-BF-425.md
 * 의존 (전역, non-module 로 선행 로드): window.KanbanStorage, window.KanbanDrag
 *
 * 정책:
 * - non-module `<script src>` — ES module / import / export / fetch 0건 (Task AC)
 * - 다크 default + OS prefers-color-scheme fallback, localStorage `bf-theme` 공유
 * - 카드 추가·편집·삭제·드래그·테마 토글·빈 상태 안내·컬럼 카운터 전체 동작
 * - 카드 영구화: `kanban:<ulid>` prefix
 */
(function (global) {
  "use strict";

  var KanbanStorage = global.KanbanStorage;
  var KanbanDrag = global.KanbanDrag;
  if (!KanbanStorage || !KanbanDrag) {
    throw new Error(
      "KanbanStorage / KanbanDrag 가 로드되지 않았습니다. storage.js, drag.js 를 main.js 보다 먼저 로드하세요.",
    );
  }

  // ─────────────────── 상수 ───────────────────
  var COLUMNS = [
    { id: "todo", label: "TO DO", tone: "neutral" },
    { id: "in-progress", label: "IN PROGRESS", tone: "warning" },
    { id: "done", label: "DONE", tone: "success" },
  ];
  var TITLE_MAX = 140;
  var THEME_KEY = KanbanStorage.THEME_KEY;

  // ─────────────────── 상태 ───────────────────
  /** @type {Record<string, {id:string,title:string,tag?:string,createdAt:number}>} */
  var cards = {};
  /** @type {{todo:string[],"in-progress":string[],done:string[]}} */
  var order = { todo: [], "in-progress": [], done: [] };
  /** 모바일 tap-select 선택 카드 id */
  var selectedCardId = null;
  /** 인라인 추가 form 이 활성화된 컬럼 id (단일 활성) */
  var addFormColumnId = null;
  /** 인라인 편집 중인 카드 id (단일 활성) */
  var editingCardId = null;

  var store = KanbanStorage.createKanbanStore();

  // ─────────────────── DOM 캐시 ───────────────────
  var boardEl = null;
  var btnAddGlobal = null;
  var btnTheme = null;
  var srAnnounceEl = null;

  // ─────────────────── 부팅 ───────────────────
  function boot() {
    boardEl = document.getElementById("board");
    btnAddGlobal = document.getElementById("btn-add-global");
    btnTheme = document.getElementById("btn-theme");
    srAnnounceEl = document.getElementById("sr-announce");

    if (!boardEl) return; // 안전 가드 — DOM 미준비 시

    initTheme();
    restoreFromStorage();
    render();

    if (btnAddGlobal) {
      btnAddGlobal.addEventListener("click", function () {
        // 글로벌 추가 → TO DO 컬럼에 인라인 form 열기
        openAddForm("todo");
      });
    }
    if (btnTheme) {
      btnTheme.addEventListener("click", toggleTheme);
    }

    setupTapSelect();
    setupKeyboardShortcuts();
  }

  // ─────────────────── 테마 (§6.5) ───────────────────
  function initTheme() {
    var saved = KanbanStorage.readTheme();
    var theme;
    if (saved === "dark" || saved === "light") {
      theme = saved;
    } else {
      // OS prefers-color-scheme fallback — kanban default 는 dark
      var prefersLight =
        global.matchMedia &&
        global.matchMedia("(prefers-color-scheme: light)").matches;
      theme = prefersLight ? "light" : "dark";
    }
    applyTheme(theme);
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (btnTheme) {
      btnTheme.textContent = theme === "dark" ? "☀" : "🌙";
      btnTheme.setAttribute(
        "aria-label",
        theme === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환",
      );
    }
  }
  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    KanbanStorage.writeTheme(next);
  }

  // ─────────────────── 복원 ───────────────────
  function restoreFromStorage() {
    var board = store.loadBoard();
    cards = board.cards;
    order = board.order;
  }

  function persistOrder() {
    store.saveOrder(order);
  }

  // ─────────────────── render ───────────────────
  function render() {
    if (!boardEl) return;
    // 전체 재렌더 (카드 수가 적은 단일 사용자 SPA — 비용 무시)
    boardEl.innerHTML = "";
    for (var i = 0; i < COLUMNS.length; i++) {
      var col = COLUMNS[i];
      boardEl.appendChild(renderColumn(col));
    }
  }

  function renderColumn(col) {
    var section = document.createElement("section");
    section.className = "column";
    section.dataset.columnId = col.id;
    section.setAttribute("aria-label", col.label + " 컬럼");

    // header
    var header = document.createElement("header");
    header.className = "column-header";
    var labelGroup = document.createElement("div");
    labelGroup.className = "column-header__label";
    var dot = document.createElement("span");
    dot.className = "column-header__dot column-header__dot--" + col.tone;
    dot.setAttribute("aria-hidden", "true");
    var text = document.createElement("span");
    text.className = "column-header__text";
    text.textContent = col.label;
    labelGroup.appendChild(dot);
    labelGroup.appendChild(text);
    header.appendChild(labelGroup);

    var cardIds = order[col.id] || [];
    var badge = document.createElement("span");
    badge.className = "count-badge";
    badge.setAttribute("aria-label", cardIds.length + "개");
    badge.textContent = String(cardIds.length);
    header.appendChild(badge);
    section.appendChild(header);

    // body
    if (cardIds.length === 0) {
      var empty = document.createElement("div");
      empty.className = "column-empty";
      empty.textContent = "카드가 없습니다. + 카드 추가 로 시작하세요.";
      section.appendChild(empty);
    } else {
      var list = document.createElement("ol");
      list.className = "column-body";
      list.dataset.role = "card-list";
      for (var i = 0; i < cardIds.length; i++) {
        var c = cards[cardIds[i]];
        if (!c) continue;
        list.appendChild(renderCard(c));
      }
      section.appendChild(list);
    }

    // inline add form 또는 [+ 카드 추가] 푸터
    if (addFormColumnId === col.id) {
      section.appendChild(renderAddForm(col.id));
    } else {
      var addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "column-add";
      addBtn.dataset.action = "add-card";
      addBtn.textContent = "＋ 카드 추가";
      addBtn.addEventListener("click", function () {
        openAddForm(col.id);
      });
      section.appendChild(addBtn);
    }

    // DnD: 컬럼 drop target
    KanbanDrag.attachColumnDrop(section, col.id, { onDrop: handleDrop });

    return section;
  }

  function renderCard(card) {
    var li = document.createElement("li");
    li.className = "card";
    li.dataset.cardId = card.id;
    li.setAttribute("role", "listitem");
    li.setAttribute("tabindex", "0");
    li.setAttribute("aria-label", "카드: " + card.title);
    if (selectedCardId === card.id) li.classList.add("is-selected");

    if (editingCardId === card.id) {
      // 인라인 편집 textarea
      var ta = document.createElement("textarea");
      ta.className = "card__edit";
      ta.value = card.title;
      ta.maxLength = TITLE_MAX;
      ta.setAttribute("aria-label", "카드 제목 편집");
      ta.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commitEditCard(card.id, ta.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelEditCard();
        }
      });
      ta.addEventListener("blur", function () {
        // blur 도 commit (사용자가 다른 곳 클릭하면 자동 저장)
        if (editingCardId === card.id) {
          commitEditCard(card.id, ta.value);
        }
      });
      // 다음 frame 에서 focus + caret 끝으로
      setTimeout(function () {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }, 0);
      li.appendChild(ta);
      // editing 중에는 draggable 비활성
      return li;
    }

    // 삭제 버튼
    var del = document.createElement("button");
    del.type = "button";
    del.className = "card__delete";
    del.setAttribute("aria-label", "카드 삭제: " + card.title);
    del.textContent = "×";
    del.addEventListener("click", function (e) {
      e.stopPropagation();
      deleteCard(card.id);
    });
    li.appendChild(del);

    // title
    var h3 = document.createElement("h3");
    h3.className = "card__title";
    h3.textContent = card.title;
    li.appendChild(h3);

    // meta (tag — 선택)
    if (card.tag) {
      var meta = document.createElement("div");
      meta.className = "card__meta";
      var tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = card.tag;
      meta.appendChild(tag);
      li.appendChild(meta);
    }

    // 편집 진입 — double-click 또는 Enter (키보드)
    li.addEventListener("dblclick", function (e) {
      // 삭제 버튼 dblclick 은 무시
      if (
        e.target instanceof Element &&
        e.target.closest(".card__delete")
      ) {
        return;
      }
      startEditCard(card.id);
    });

    // DnD
    KanbanDrag.attachCardDrag(li, card.id, {});

    return li;
  }

  function renderAddForm(columnId) {
    var wrapper = document.createElement("div");
    wrapper.className = "column-add-form";

    var ta = document.createElement("textarea");
    ta.className = "column-add-form__input";
    ta.placeholder = "제목을 입력하세요…";
    ta.maxLength = TITLE_MAX;
    ta.setAttribute("aria-label", "새 카드 제목");

    var actions = document.createElement("div");
    actions.className = "column-add-form__actions";

    var confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "btn btn--primary";
    confirm.textContent = "추가";
    confirm.addEventListener("click", function () {
      commitAddForm(columnId, ta.value);
    });

    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn--ghost";
    cancel.textContent = "취소";
    cancel.addEventListener("click", function () {
      closeAddForm();
    });

    actions.appendChild(confirm);
    actions.appendChild(cancel);

    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commitAddForm(columnId, ta.value);
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeAddForm();
      }
    });

    wrapper.appendChild(ta);
    wrapper.appendChild(actions);

    // 다음 frame 에서 focus
    setTimeout(function () {
      ta.focus();
    }, 0);

    return wrapper;
  }

  // ─────────────────── 카드 CRUD ───────────────────
  function openAddForm(columnId) {
    addFormColumnId = columnId;
    editingCardId = null;
    render();
  }
  function closeAddForm() {
    addFormColumnId = null;
    render();
  }
  function commitAddForm(columnId, rawTitle) {
    var title = (rawTitle || "").trim();
    if (!title) {
      // 빈 제목 → form 닫고 종료
      closeAddForm();
      return;
    }
    var id = KanbanStorage.ulid();
    var card = { id: id, title: title, createdAt: Date.now() };
    cards[id] = card;
    if (!order[columnId]) order[columnId] = [];
    order[columnId].unshift(id); // prepend (§4.9)
    store.saveCard(card);
    persistOrder();
    addFormColumnId = null;
    render();
    announce(columnLabel(columnId) + " 에 카드 추가: " + title);
  }

  function startEditCard(cardId) {
    if (!cards[cardId]) return;
    editingCardId = cardId;
    addFormColumnId = null;
    render();
  }
  function cancelEditCard() {
    editingCardId = null;
    render();
  }
  function commitEditCard(cardId, rawTitle) {
    if (!cards[cardId]) {
      editingCardId = null;
      return;
    }
    var title = (rawTitle || "").trim();
    if (!title) {
      // 빈 제목으로 commit → 삭제
      deleteCard(cardId);
      return;
    }
    cards[cardId].title = title;
    store.saveCard(cards[cardId]);
    editingCardId = null;
    render();
    announce("카드 제목 수정: " + title);
  }

  function deleteCard(cardId) {
    var card = cards[cardId];
    if (!card) return;
    var fromCol = findCardColumn(cardId);
    delete cards[cardId];
    if (fromCol) {
      order[fromCol] = order[fromCol].filter(function (id) {
        return id !== cardId;
      });
    }
    if (selectedCardId === cardId) selectedCardId = null;
    if (editingCardId === cardId) editingCardId = null;
    store.removeCard(cardId);
    persistOrder();
    render();
    announce(columnLabel(fromCol) + " 에서 카드 삭제: " + card.title);
  }

  function findCardColumn(cardId) {
    for (var i = 0; i < COLUMNS.length; i++) {
      var col = COLUMNS[i].id;
      if ((order[col] || []).indexOf(cardId) >= 0) return col;
    }
    return null;
  }

  function columnLabel(columnId) {
    for (var i = 0; i < COLUMNS.length; i++) {
      if (COLUMNS[i].id === columnId) return COLUMNS[i].label;
    }
    return columnId || "";
  }

  // ─────────────────── DnD drop 처리 ───────────────────
  function handleDrop(cardId, toColumnId, toIndex) {
    if (!cards[cardId]) return;
    var fromCol = findCardColumn(cardId);
    if (!fromCol) return;
    // remove
    order[fromCol] = order[fromCol].filter(function (id) {
      return id !== cardId;
    });
    if (!order[toColumnId]) order[toColumnId] = [];
    // 같은 컬럼 내 이동 시 toIndex 가 self 이후를 가리킬 수 있음 — computeDropIndex 가
    // is-dragging 제외라서 안전하지만, clamp
    if (toIndex < 0) toIndex = 0;
    if (toIndex > order[toColumnId].length) toIndex = order[toColumnId].length;
    order[toColumnId].splice(toIndex, 0, cardId);
    persistOrder();
    render();
    // 드롭 settle 애니메이션 — 새로 그려진 카드 element 에 부착
    var newCardEl = boardEl.querySelector(
      '.card[data-card-id="' + cssEscape(cardId) + '"]',
    );
    if (newCardEl) {
      newCardEl.classList.add("is-dropped");
      setTimeout(function () {
        if (newCardEl) newCardEl.classList.remove("is-dropped");
      }, 220);
    }
    if (fromCol !== toColumnId) {
      announce(
        cards[cardId].title +
          " 카드를 " +
          columnLabel(fromCol) +
          " 에서 " +
          columnLabel(toColumnId) +
          " 으로 이동했습니다",
      );
    }
  }

  // ─────────────────── 모바일 tap-select ───────────────────
  function setupTapSelect() {
    KanbanDrag.attachTapSelect(boardEl, {
      getSelected: function () {
        return selectedCardId;
      },
      onSelectCard: function (id) {
        if (editingCardId) return; // 편집 중엔 무시
        selectedCardId = id;
        render();
      },
      onCommitTo: function (columnId, beforeCardId) {
        if (!selectedCardId) return;
        var cardId = selectedCardId;
        selectedCardId = null;
        var toIndex;
        if (beforeCardId) {
          toIndex = (order[columnId] || []).indexOf(beforeCardId);
          if (toIndex < 0) toIndex = (order[columnId] || []).length;
        } else {
          toIndex = (order[columnId] || []).length;
        }
        handleDrop(cardId, columnId, toIndex);
      },
    });
  }

  // ─────────────────── 키보드 단축키 (§6.4) ───────────────────
  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", function (e) {
      var target = e.target;
      var tag = target && target.tagName;
      var inEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (target && target.isContentEditable);

      // 카드 focus 시 Delete/Backspace → 삭제, Enter → 편집 진입
      if (
        !inEditable &&
        target instanceof Element &&
        target.classList.contains("card")
      ) {
        var cardId = target.getAttribute("data-card-id");
        if (!cardId) return;
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          deleteCard(cardId);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          startEditCard(cardId);
          return;
        }
      }

      // 전역 Esc — 인라인 form / 편집 / 선택 모두 취소
      if (e.key === "Escape") {
        var consumed = false;
        if (addFormColumnId) {
          addFormColumnId = null;
          consumed = true;
        }
        if (editingCardId) {
          editingCardId = null;
          consumed = true;
        }
        if (selectedCardId) {
          selectedCardId = null;
          consumed = true;
        }
        if (consumed) {
          e.preventDefault();
          render();
        }
      }
    });
  }

  // ─────────────────── a11y SR 알림 ───────────────────
  function announce(text) {
    if (!srAnnounceEl) return;
    srAnnounceEl.textContent = text;
  }

  // ─────────────────── 작은 유틸 ───────────────────
  function cssEscape(s) {
    // ULID 는 [0-9A-Z] 만 — escape 필요 없지만 방어
    if (global.CSS && typeof global.CSS.escape === "function") {
      return global.CSS.escape(s);
    }
    return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  // ─────────────────── 부팅 트리거 ───────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
