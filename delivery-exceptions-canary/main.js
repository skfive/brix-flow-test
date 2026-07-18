/* delivery-exceptions-canary/main.js — 2-pane 배송 예외 콘솔 DOM 렌더·인터랙션
 * BF-1033 · 기획 §4·§5·§6·§8 / 디자인 §4·§5·§6·§7 (그대로 채택 — 재해석 금지)
 * UMD 패턴 — 브라우저: globalThis.DxcApp + DOMContentLoaded init / Node: module.exports(init 함수)
 * DOM/localStorage 접근은 함수 내부에서만 — Node require 시 top-level 부작용 0건.
 */
(function (root, factory) {
  "use strict";
  var isNode = typeof module === "object" && module && module.exports;
  var deps = isNode
    ? {
        Fixtures: require("./fixtures.js"),
        Domain: require("./domain.js"),
        Storage: require("./notes-storage.js"),
      }
    : {
        Fixtures: root && root.DxcFixtures,
        Domain: root && root.DxcDomain,
        Storage: root && root.DxcNotesStorage,
      };
  var api = factory(deps);
  if (isNode) {
    module.exports = api;
  }
  if (root) {
    root.DxcApp = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (deps) {
  "use strict";

  var Fixtures = deps.Fixtures;
  var Domain = deps.Domain;
  var Storage = deps.Storage;

  var FILTER_OPTIONS = [
    { value: "all", label: "전체" },
    { value: "open", label: "접수" },
    { value: "investigating", label: "조사중" },
    { value: "on_hold", label: "보류" },
    { value: "resolved", label: "해결" },
  ];

  /** 저장 시각용 KST ISO8601 문자열 생성(+09:00). 브라우저 런타임 전용(테스트는 nowIso 주입). */
  function nowIsoKst() {
    var d = new Date();
    var utc = d.getTime() + d.getTimezoneOffset() * 60000;
    var kst = new Date(utc + 9 * 3600000);
    function p(n) {
      return String(n).padStart(2, "0");
    }
    return (
      kst.getFullYear() +
      "-" +
      p(kst.getMonth() + 1) +
      "-" +
      p(kst.getDate()) +
      "T" +
      p(kst.getHours()) +
      ":" +
      p(kst.getMinutes()) +
      ":" +
      p(kst.getSeconds()) +
      "+09:00"
    );
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") {
          node.textContent = attrs[k];
        } else if (k === "dataset") {
          Object.keys(attrs[k]).forEach(function (d) {
            node.dataset[d] = attrs[k][d];
          });
        } else {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    (children || []).forEach(function (c) {
      if (c) node.appendChild(c);
    });
    return node;
  }

  function statusBadge(status) {
    var label = Fixtures.statusLabel(status);
    var badge = el("span", {
      class: "dxc-badge",
      "aria-label": "상태: " + label,
      dataset: { status: status },
    });
    badge.appendChild(el("span", { class: "dxc-badge__dot", "aria-hidden": "true" }));
    badge.appendChild(document.createTextNode(label));
    return badge;
  }

  /**
   * 앱 초기화 — 진입 시 1회(기획 §8.3). fixture 로드 → 메모 envelope 로드 → 렌더.
   * @param {Document} [doc] 미지정 시 전역 document(브라우저).
   * @returns {object} 앱 컨트롤러(테스트/디버그용)
   */
  function init() {
    var exceptions = Fixtures.getExceptions();
    var store = Storage.createStore(null, Fixtures.getValidIds());

    var state = {
      filter: "all", // 기획 §4.2 기본 all
      selectedId: null, // EC-01 초기 미선택
      draft: "", // 편집 중 메모(미저장)
    };

    var refs = {
      tabs: document.getElementById("dxc-filter-tabs"),
      summary: document.getElementById("dxc-summary"),
      list: document.getElementById("dxc-list"),
      detail: document.getElementById("dxc-detail"),
    };

    function findException(id) {
      for (var i = 0; i < exceptions.length; i++) {
        if (exceptions[i].id === id) return exceptions[i];
      }
      return null;
    }

    /* ─── 헤더 요약(디자인 §6.3) ─── */
    function renderSummary() {
      var s = Domain.summarize(exceptions);
      refs.summary.textContent = "";
      var frag = [
        document.createTextNode("총 "),
        el("strong", { text: String(s.total) }),
        document.createTextNode(" · 미해결 "),
        el("strong", { text: String(s.unresolved) }),
        document.createTextNode(" · 해결 "),
        el("strong", { text: String(s.resolved) }),
      ];
      frag.forEach(function (n) {
        refs.summary.appendChild(n);
      });
    }

    /* ─── 필터 탭(디자인 §5.1) ─── */
    function renderTabs() {
      var counts = Domain.countByStatus(exceptions);
      refs.tabs.textContent = "";
      FILTER_OPTIONS.forEach(function (opt) {
        var selected = state.filter === opt.value;
        var tab = el("button", {
          type: "button",
          class: "dxc-filter-tab",
          role: "tab",
          "aria-selected": selected ? "true" : "false",
          tabindex: selected ? "0" : "-1",
          dataset: { value: opt.value },
        });
        tab.appendChild(document.createTextNode(opt.label));
        tab.appendChild(el("span", { class: "dxc-filter-tab__count", text: String(counts[opt.value]) }));
        tab.addEventListener("click", function () {
          selectFilter(opt.value);
        });
        tab.addEventListener("keydown", onTabKeydown);
        refs.tabs.appendChild(tab);
      });
    }

    function onTabKeydown(ev) {
      var idx = FILTER_OPTIONS.findIndex(function (o) {
        return o.value === state.filter;
      });
      var next = null;
      if (ev.key === "ArrowRight" || ev.key === "ArrowDown") next = (idx + 1) % FILTER_OPTIONS.length;
      else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") next = (idx - 1 + FILTER_OPTIONS.length) % FILTER_OPTIONS.length;
      else if (ev.key === "Home") next = 0;
      else if (ev.key === "End") next = FILTER_OPTIONS.length - 1;
      if (next === null) return;
      ev.preventDefault();
      selectFilter(FILTER_OPTIONS[next].value);
      var tabs = refs.tabs.querySelectorAll(".dxc-filter-tab");
      if (tabs[next]) tabs[next].focus();
    }

    function selectFilter(value) {
      if (state.filter === value) return;
      state.filter = value;
      renderTabs();
      renderList(); // 필터는 목록 표시에만 영향(기획 §4.3 / EC-03) — 선택 상태 유지
    }

    /* ─── 목록(디자인 §5.2·§5.6) ─── */
    function renderList() {
      var visible = Domain.filterByStatus(exceptions, state.filter);
      refs.list.textContent = "";
      if (visible.length === 0) {
        // EC-02 방어적 빈 상태
        var empty = el("li", { class: "dxc-empty-list" });
        empty.appendChild(el("p", { class: "dxc-empty-list__desc", text: "해당 상태의 예외 없음" }));
        empty.appendChild(el("p", { class: "dxc-empty-list__desc", text: "다른 상태 탭을 선택해 보세요" }));
        refs.list.appendChild(empty);
        return;
      }
      visible.forEach(function (exc) {
        var selected = state.selectedId === exc.id;
        var item = el("li", {
          class: "dxc-list-item",
          role: "option",
          "aria-selected": selected ? "true" : "false",
          tabindex: "0",
          dataset: { id: exc.id },
        });
        var row1 = el("div", { class: "dxc-list-item__row1" }, [
          el("span", { class: "dxc-list-item__id", text: exc.id }),
          el("span", { class: "dxc-list-item__name", text: exc.recipientName }),
        ]);
        var row2 = el("div", { class: "dxc-list-item__row2" }, [
          el("span", { class: "dxc-list-item__cause", text: Fixtures.causeLabel(exc.cause) }),
          statusBadge(exc.status),
        ]);
        item.appendChild(row1);
        item.appendChild(row2);
        item.addEventListener("click", function () {
          selectException(exc.id);
        });
        item.addEventListener("keydown", function (ev) {
          onListKeydown(ev, visible);
        });
        refs.list.appendChild(item);
      });
    }

    function onListKeydown(ev, visible) {
      var ids = visible.map(function (e) {
        return e.id;
      });
      var cur = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.id : null;
      var idx = ids.indexOf(cur);
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        if (cur) selectException(cur);
        return;
      }
      var next = null;
      if (ev.key === "ArrowDown") next = idx < 0 ? 0 : Math.min(idx + 1, ids.length - 1);
      else if (ev.key === "ArrowUp") next = idx < 0 ? 0 : Math.max(idx - 1, 0);
      else if (ev.key === "Home") next = 0;
      else if (ev.key === "End") next = ids.length - 1;
      if (next === null) return;
      ev.preventDefault();
      var items = refs.list.querySelectorAll(".dxc-list-item");
      if (items[next]) items[next].focus();
    }

    function selectException(id) {
      state.selectedId = id;
      var note = store.getNote(id);
      state.draft = note ? note.text : "";
      // 선택 표시 갱신(목록 재렌더 없이 aria-selected 토글)
      var items = refs.list.querySelectorAll(".dxc-list-item");
      items.forEach(function (it) {
        it.setAttribute("aria-selected", it.dataset.id === id ? "true" : "false");
      });
      renderDetail();
    }

    /* ─── 상세 패널(디자인 §5.3·§5.4·§5.5) ─── */
    function renderDetail() {
      refs.detail.textContent = "";
      if (!state.selectedId) {
        refs.detail.appendChild(renderEmptyDetail());
        return;
      }
      var exc = findException(state.selectedId);
      if (!exc) {
        refs.detail.appendChild(renderEmptyDetail());
        return;
      }

      var header = el("div", { class: "dxc-detail__header" }, [
        el("h2", { class: "dxc-detail__name", tabindex: "-1", text: exc.recipientName }),
        statusBadge(exc.status),
      ]);
      refs.detail.appendChild(header);

      var grid = el("div", { class: "dxc-field-grid" });
      grid.appendChild(field("예외 ID", exc.id, "mono"));
      grid.appendChild(field("주문 참조", exc.orderId, "mono"));
      grid.appendChild(field("수취인", exc.recipientName, "text"));
      grid.appendChild(field("예외 원인", Fixtures.causeLabel(exc.cause), "text"));
      grid.appendChild(field("배송지", exc.deliveryAddress, "text", true));
      grid.appendChild(field("발생 시각", Domain.formatKst(exc.occurredAt), "text"));
      grid.appendChild(field("갱신 시각", Domain.formatKst(exc.updatedAt), "text"));
      grid.appendChild(field("설명", exc.description, "multiline", true));
      refs.detail.appendChild(grid);

      refs.detail.appendChild(renderMemo(exc));
    }

    function field(label, value, variant, full) {
      var wrap = el("div", { class: "dxc-field" + (full ? " dxc-field--full" : "") });
      wrap.appendChild(el("span", { class: "dxc-field__label", text: label }));
      wrap.appendChild(el("span", { class: "dxc-field__value", dataset: { variant: variant }, text: value }));
      return wrap;
    }

    function renderEmptyDetail() {
      var box = el("div", { class: "dxc-empty-detail" });
      box.appendChild(el("div", { class: "dxc-empty-detail__icon", "aria-hidden": "true", text: "📦" }));
      box.appendChild(el("p", { class: "dxc-empty-detail__title", text: "예외를 선택하세요" }));
      box.appendChild(
        el("p", {
          class: "dxc-empty-detail__desc",
          text: "왼쪽 목록에서 배송 예외를 선택하면 상세 정보와 해결 메모를 볼 수 있습니다",
        })
      );
      return box;
    }

    /* ─── 해결 메모 에디터(디자인 §5.4) ─── */
    function renderMemo(exc) {
      var saved = store.getNote(exc.id);
      var savedText = saved ? saved.text : "";

      var memo = el("section", { class: "dxc-memo", "aria-label": "해결 메모" });
      memo.appendChild(el("h3", { class: "dxc-memo__title", text: "해결 메모" }));

      var textarea = el("textarea", {
        class: "dxc-memo__textarea",
        "aria-label": "해결 메모 입력",
        placeholder: "이 배송 예외에 대한 해결 메모를 입력하세요",
      });
      textarea.value = state.draft;
      memo.appendChild(textarea);

      memo.appendChild(el("p", { class: "dxc-memo__hint", text: "빈 메모를 저장하면 삭제됩니다" }));

      var counter = el("span", { class: "dxc-memo__counter", "aria-live": "polite" });
      var saveBtn = el("button", { type: "button", class: "dxc-memo__save", text: "저장" });
      var bar = el("div", { class: "dxc-memo__bar" }, [counter, saveBtn]);
      memo.appendChild(bar);

      var savedAtLine = el("p", { class: "dxc-memo__saved-at" });
      memo.appendChild(savedAtLine);

      var errorBox = el("div", { class: "dxc-memo__error", role: "alert" });
      errorBox.style.display = "none";
      memo.appendChild(errorBox);

      function currentLen() {
        return textarea.value.trim().length;
      }

      function refreshMemoUi() {
        var len = currentLen();
        counter.textContent = len + "/" + Domain.MEMO_MAX;
        var over = len > Domain.MEMO_MAX;
        memo.classList.toggle("dxc-memo--over", over);
        // 저장 버튼: 저장값과 동일하면 비활성(변경 없음)
        var changed = textarea.value.trim() !== savedText.trim();
        saveBtn.disabled = !changed;
        // 저장 시각 / 미저장 힌트
        savedAtLine.textContent = "";
        if (changed && !over) {
          savedAtLine.appendChild(
            el("span", { class: "dxc-memo__unsaved", text: "저장되지 않은 변경이 있습니다" })
          );
        } else if (saved && saved.savedAt) {
          savedAtLine.appendChild(
            document.createTextNode(Domain.formatKst(saved.savedAt) + " 저장됨")
          );
        } else {
          savedAtLine.appendChild(document.createTextNode("저장된 메모 없음"));
        }
      }

      function doSave() {
        state.draft = textarea.value;
        var res = store.saveNote(exc.id, textarea.value, nowIsoKst());
        if (!res.ok) {
          // EC-05 — 300자 초과: 거부, 입력값 유지
          errorBox.textContent = res.error;
          errorBox.style.display = "";
          return;
        }
        errorBox.style.display = "none";
        // 저장/삭제 성공 → 상세 재렌더로 최신 savedAt 반영
        state.draft = res.action === "delete" ? "" : textarea.value.trim();
        renderDetail();
      }

      textarea.addEventListener("input", function () {
        state.draft = textarea.value;
        errorBox.style.display = "none";
        refreshMemoUi();
      });
      textarea.addEventListener("keydown", function (ev) {
        if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
          ev.preventDefault();
          if (!saveBtn.disabled) doSave();
        }
      });
      saveBtn.addEventListener("click", doSave);

      refreshMemoUi();
      return memo;
    }

    /* ─── 초기 렌더(기획 §8.3 — 동기, loading 없음) ─── */
    renderSummary();
    renderTabs();
    renderList();
    renderDetail();

    return {
      getState: function () {
        return { filter: state.filter, selectedId: state.selectedId };
      },
      selectException: selectException,
      selectFilter: selectFilter,
    };
  }

  // 브라우저: DOM 준비 후 자동 초기화 (Node require 시에는 실행 안 함)
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", function () {
      init();
    });
  }

  return { init: init, nowIsoKst: nowIsoKst };
});
