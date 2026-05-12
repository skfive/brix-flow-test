/* BF-427 · 칸반 DnD 헬퍼 (HTML5 Drag-and-Drop + 모바일 tap-and-select fallback)
 * 명세: docs/design/kanban-BF-425.md §4.6, §6.2, §7.7
 *
 * 정책:
 * - non-module — 전역 namespace: window.KanbanDrag
 * - ES module / import / export / fetch 사용 금지
 * - dragenter / dragleave 자식 진출 false-positive 차단 (enter counter 패턴)
 * - 모바일: 카드를 tap → is-selected → 컬럼 또는 다른 카드 tap → 이동 확정
 *
 * 사용:
 *   KanbanDrag.attachCardDrag(cardEl, cardId, { onDragStart, onDragEnd })
 *   KanbanDrag.attachColumnDrop(columnEl, columnId, { onDrop })
 *   KanbanDrag.attachTapSelect(boardEl, { isSelected, onSelectCard, onCommitTo })
 */
(function (global) {
  "use strict";

  /**
   * 카드 element 에 HTML5 drag 이벤트 부착.
   * @param {HTMLElement} cardEl
   * @param {string} cardId
   * @param {{onDragStart?: Function, onDragEnd?: Function}} hooks
   */
  function attachCardDrag(cardEl, cardId, hooks) {
    hooks = hooks || {};
    cardEl.setAttribute("draggable", "true");

    cardEl.addEventListener("dragstart", function (e) {
      if (e.dataTransfer) {
        try {
          e.dataTransfer.setData("text/plain", cardId);
          e.dataTransfer.effectAllowed = "move";
        } catch (_) {
          /* 일부 브라우저 quirks — silent */
        }
      }
      cardEl.classList.add("is-dragging");
      if (typeof hooks.onDragStart === "function") hooks.onDragStart(cardId);
    });

    cardEl.addEventListener("dragend", function () {
      cardEl.classList.remove("is-dragging");
      if (typeof hooks.onDragEnd === "function") hooks.onDragEnd(cardId);
    });
  }

  /**
   * 컬럼 element 에 drop target 이벤트 부착 (enter counter 패턴).
   * @param {HTMLElement} columnEl
   * @param {string} columnId
   * @param {{onDrop: (cardId: string, toIndex: number) => void}} hooks
   */
  function attachColumnDrop(columnEl, columnId, hooks) {
    hooks = hooks || {};
    var enterCount = 0;

    columnEl.addEventListener("dragenter", function (e) {
      // text/plain payload 만 허용 (외부 드래그 차단)
      enterCount++;
      columnEl.classList.add("is-drop-target");
      e.preventDefault();
    });

    columnEl.addEventListener("dragleave", function () {
      enterCount--;
      if (enterCount <= 0) {
        enterCount = 0;
        columnEl.classList.remove("is-drop-target");
      }
    });

    columnEl.addEventListener("dragover", function (e) {
      e.preventDefault();
      if (e.dataTransfer) {
        try {
          e.dataTransfer.dropEffect = "move";
        } catch (_) {
          /* silent */
        }
      }
    });

    columnEl.addEventListener("drop", function (e) {
      e.preventDefault();
      enterCount = 0;
      columnEl.classList.remove("is-drop-target");
      var cardId = "";
      if (e.dataTransfer) {
        try {
          cardId = e.dataTransfer.getData("text/plain") || "";
        } catch (_) {
          cardId = "";
        }
      }
      if (!cardId) return;
      var toIndex = computeDropIndex(columnEl, e.clientY);
      if (typeof hooks.onDrop === "function") {
        hooks.onDrop(cardId, columnId, toIndex);
      }
    });
  }

  /**
   * column 내 카드들 중 마우스 Y 좌표 기준 드롭 index 계산.
   * 드래그 중인 source 카드 (.is-dragging) 는 제외.
   * @param {HTMLElement} columnEl
   * @param {number} clientY
   * @returns {number}
   */
  function computeDropIndex(columnEl, clientY) {
    var cards = columnEl.querySelectorAll(".card:not(.is-dragging)");
    for (var i = 0; i < cards.length; i++) {
      var rect = cards[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return cards.length;
  }

  /**
   * 모바일 tap-and-select fallback.
   * 1) 카드 tap → 선택 (is-selected). 같은 카드 다시 tap → 선택 해제.
   * 2) 선택된 상태에서 컬럼 (또는 다른 카드) tap → onCommitTo(targetColumnId, beforeCardId?)
   *
   * touch 환경에서만 활성 — pointer down 이 mouse 일 땐 일반 DnD 가 우선.
   *
   * @param {HTMLElement} boardEl
   * @param {{
   *   getSelected: () => string | null,
   *   onSelectCard: (cardId: string | null) => void,
   *   onCommitTo: (columnId: string, beforeCardId: string | null) => void
   * }} hooks
   */
  function attachTapSelect(boardEl, hooks) {
    hooks = hooks || {};
    // touchend 가 click 보다 먼저 발화 → tap 으로 간주
    boardEl.addEventListener("click", function (e) {
      var target = e.target;
      if (!(target instanceof Element)) return;
      // 삭제 / 추가 / 편집 input 클릭은 무시
      if (
        target.closest(".card__delete") ||
        target.closest(".column-add") ||
        target.closest(".column-add-form") ||
        target.closest(".card__edit")
      ) {
        return;
      }

      var cardEl = target.closest(".card");
      var columnEl = target.closest(".column");
      var selectedId =
        typeof hooks.getSelected === "function" ? hooks.getSelected() : null;

      // 1. 카드 클릭
      if (cardEl) {
        var cardId = cardEl.getAttribute("data-card-id");
        if (!cardId) return;
        if (selectedId && selectedId !== cardId) {
          // 선택된 카드가 있고, 다른 카드를 클릭 → 그 카드 앞에 삽입
          var targetColumnEl = cardEl.closest(".column");
          var targetColumnId = targetColumnEl
            ? targetColumnEl.getAttribute("data-column-id")
            : null;
          if (targetColumnId && typeof hooks.onCommitTo === "function") {
            hooks.onCommitTo(targetColumnId, cardId);
          }
          return;
        }
        // 자기 자신 또는 첫 선택 → toggle
        if (typeof hooks.onSelectCard === "function") {
          hooks.onSelectCard(selectedId === cardId ? null : cardId);
        }
        return;
      }

      // 2. 컬럼 빈 영역 / footer 클릭 → 선택된 카드를 그 컬럼 끝으로 이동
      if (columnEl && selectedId) {
        var columnId = columnEl.getAttribute("data-column-id");
        if (columnId && typeof hooks.onCommitTo === "function") {
          hooks.onCommitTo(columnId, null);
        }
      }
    });
  }

  global.KanbanDrag = {
    attachCardDrag: attachCardDrag,
    attachColumnDrop: attachColumnDrop,
    attachTapSelect: attachTapSelect,
    computeDropIndex: computeDropIndex,
  };
})(typeof window !== "undefined" ? window : globalThis);
