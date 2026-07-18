/* booking-approval-phase18/app.js — 화면 렌더 + 인터랙션 와이어링 (§9)
 * BF-1016 · 기획 §9.2 IA-01~06 / 시안 §5·§6.3·§6.4 그대로 구현.
 * IIFE 전역 함수 — 브라우저 전용. window.BookingApproval(순수 로직 + adapter)만 사용.
 * vanilla-static: type=module 금지, import/export/fetch 0건, localStorage 만 사용.
 */
(function () {
  "use strict";

  var API = window.BookingApproval;
  if (!API) return; // booking.js 미로드 방어

  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  var state = null;          // { schemaVersion, resources, bookings }
  var resourceNameById = {}; // resourceId → 표시명
  var storageOk = false;     // localStorage 저장 가능 여부(§8.3)

  /* 호출자가 주입하는 "현재 시각"(§1.3) — 순수 로직은 시각을 만들지 않고 여기서만 주입 */
  function injectedNow() { return new Date().toISOString(); }

  /* localStorage 사용 가능 여부 probe (프라이빗 모드 등에서 false) */
  function detectStorage() {
    try {
      var k = "__bk_probe__";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  function persist() {
    if (!storageOk) return;
    API.saveBookingState(window.localStorage, state); // 예외는 adapter 가 흡수(§8.3)
  }

  /* ISO(UTC) → "MM/DD HH:mm" (seed 리터럴과 표기 일치 위해 UTC 기준) */
  function fmtDateTime(iso) {
    var d = new Date(iso);
    var p = function (n) { return String(n).padStart(2, "0"); };
    return p(d.getUTCMonth() + 1) + "/" + p(d.getUTCDate()) + " " +
      p(d.getUTCHours()) + ":" + p(d.getUTCMinutes());
  }
  function fmtRange(startAt, endAt) {
    var s = fmtDateTime(startAt);
    var e = new Date(endAt);
    var p = function (n) { return String(n).padStart(2, "0"); };
    return s + " ~ " + p(e.getUTCHours()) + ":" + p(e.getUTCMinutes());
  }

  var BADGE = {
    requested: { icon: "⏳", label: "대기" }, // ⏳
    approved: { icon: "✓", label: "승인" },   // ✓
    rejected: { icon: "✕", label: "반려" },   // ✕
  };

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
      }
    }
    if (text != null) node.textContent = text;
    return node;
  }

  /* 상태 배지 (§5.3) — 아이콘 aria-hidden + 라벨 텍스트 */
  function statusBadge(status) {
    var meta = BADGE[status] || { icon: "", label: status };
    var badge = el("span", { class: "bk-badge", "data-status": status, role: "status" });
    var icon = el("span", { "aria-hidden": "true" }, meta.icon);
    badge.appendChild(icon);
    badge.appendChild(document.createTextNode(" " + meta.label));
    return badge;
  }

  /* 예약 카드 렌더 (시안 §6.3) */
  function renderCard(booking) {
    var card = el("article", {
      class: "bk-card",
      "data-testid": "booking-item",
      "data-booking-id": booking.id,
      "data-status": booking.status,
    });
    var main = el("div", { class: "bk-card__main" });

    var top = el("div", { class: "bk-card__top" });
    var headline = el("div", { class: "bk-card__headline" });
    headline.appendChild(el("span", { class: "bk-card__resource" }, resourceNameById[booking.resourceId] || booking.resourceId));
    headline.appendChild(statusBadge(booking.status));
    top.appendChild(headline);
    top.appendChild(el("span", { class: "bk-card__time" }, fmtRange(booking.startAt, booking.endAt)));
    main.appendChild(top);

    main.appendChild(el("p", { class: "bk-card__meta" }, "신청 · " + booking.requesterName));

    // 액션 행 — requested 상태에서만 노출 (§5.5 / IA-02)
    if (booking.status === "requested") {
      var actions = el("div", { class: "bk-card__actions" });
      var rejectBtn = el("button", { type: "button", class: "bk-btn bk-btn--reject", "data-testid": "reject-btn", "data-action": "reject" });
      rejectBtn.appendChild(el("span", { "aria-hidden": "true" }, "✕"));
      rejectBtn.appendChild(document.createTextNode(" 반려"));
      var approveBtn = el("button", { type: "button", class: "bk-btn bk-btn--approve", "data-testid": "approve-btn", "data-action": "approve" });
      approveBtn.appendChild(el("span", { "aria-hidden": "true" }, "✓"));
      approveBtn.appendChild(document.createTextNode(" 승인"));
      actions.appendChild(rejectBtn);
      actions.appendChild(approveBtn);
      main.appendChild(actions);
    }

    // 반려 사유 — rejected 상태에서만 (§5.5 / IA-04)
    if (booking.status === "rejected") {
      var reason = el("p", { class: "bk-card__reason", "data-testid": "reject-reason" });
      reason.appendChild(el("b", null, "반려 사유 ·"));
      reason.appendChild(document.createTextNode(" " + (booking.reason || "(사유 없음)")));
      main.appendChild(reason);
    }

    card.appendChild(main);
    return card;
  }

  /* 필터 적용 후 목록 렌더 (IA-05 — state 불변, 순수 뷰 필터) */
  function render() {
    var list = $('[data-testid="booking-list"]');
    if (!list) return;
    var resFilter = $('[data-field="filter-resource"]').value;
    var statusFilter = $('[data-field="filter-status"]').value;

    var visible = state.bookings.filter(function (b) {
      if (resFilter !== "all" && b.resourceId !== resFilter) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      return true;
    });

    list.textContent = "";
    if (visible.length === 0) {
      list.appendChild(el("p", { class: "bk-empty" }, "조건에 맞는 예약이 없습니다."));
      return;
    }
    visible.forEach(function (b) { list.appendChild(renderCard(b)); });
  }

  function findBooking(id) {
    for (var i = 0; i < state.bookings.length; i++) {
      if (state.bookings[i].id === id) return { idx: i, booking: state.bookings[i] };
    }
    return null;
  }

  /* ── 충돌 배너 (§5.4) ── */
  function showConflict(booking, conflicts) {
    var banner = $('[data-testid="conflict-banner"]');
    var detail = $('[data-testid="conflict-detail"]');
    if (detail) {
      if (conflicts && conflicts.length > 0) {
        var c = conflicts[0];
        detail.textContent = "충돌 대상 · " + (resourceNameById[c.resourceId] || c.resourceId) +
          " · " + fmtRange(c.startAt, c.endAt) + " (" + c.requesterName + ", 승인됨)";
      } else {
        detail.textContent = "";
      }
    }
    if (banner) banner.hidden = false;
  }
  function hideConflict() {
    var banner = $('[data-testid="conflict-banner"]');
    if (banner) banner.hidden = true;
  }

  /* ── 승인/반려 클릭 (이벤트 위임, §6.4) ── */
  function onListClick(ev) {
    var btn = ev.target.closest ? ev.target.closest("button[data-action]") : null;
    if (!btn) return;
    var card = btn.closest('[data-testid="booking-item"]');
    if (!card) return;
    var found = findBooking(card.getAttribute("data-booking-id"));
    if (!found) return;

    hideConflict();
    var action = btn.getAttribute("data-action");

    if (action === "approve") {
      var result = API.decideBooking(found.booking, "approve", state.bookings, injectedNow());
      if (result.ok === false && result.code === "CONFLICT") {
        var conflicts = API.findApprovedConflicts(found.booking, state.bookings);
        showConflict(found.booking, conflicts); // 카드 status 는 requested 유지(§6.2 #1)
        return;
      }
      if (result.ok === true) {
        state.bookings[found.idx] = result.booking;
        persist();
        render();
      }
      return;
    }

    if (action === "reject") {
      var reason = window.prompt("반려 사유를 입력하세요 (선택).", "");
      if (reason === null) return; // 사용자가 취소 → 상태 불변
      var rej = API.decideBooking(found.booking, "reject", state.bookings, injectedNow(), reason);
      if (rej.ok === true) {
        state.bookings[found.idx] = rej.booking;
        persist();
        render();
      }
    }
  }

  /* ── 신규 예약 폼 (§5.2 / IA-01) ── */
  function nextBookingId() {
    var max = 0;
    state.bookings.forEach(function (b) {
      var m = /^bkg-(\d+)$/.exec(b.id);
      if (m) { var n = parseInt(m[1], 10); if (n > max) max = n; }
    });
    return "bkg-" + String(max + 1).padStart(2, "0");
  }

  function toIso(v) {
    if (typeof v !== "string" || v.trim() === "") return v; // 빈 값은 그대로 넘겨 createBooking 이 거부
    var d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toISOString();
  }

  function showFormError(msg) {
    var errEl = $('[data-testid="form-error"]');
    if (errEl) errEl.textContent = msg;
  }

  function friendlyError(e, rawName) {
    if (e instanceof RangeError) return "시작 시각은 종료 시각보다 앞서야 합니다.";
    if (e instanceof TypeError) {
      if (!rawName || rawName.trim() === "") return "신청자명을 입력하세요.";
      return "시작·종료 시각을 올바르게 입력하세요.";
    }
    return "예약을 생성할 수 없습니다: " + e.message;
  }

  function onFormSubmit(ev) {
    ev.preventDefault();
    hideConflict();
    showFormError("");

    var form = ev.currentTarget;
    var resourceId = $('[data-field="resourceId"]', form).value;
    var rawName = $('[data-field="requesterName"]', form).value;
    var startAt = $('[data-field="startAt"]', form).value;
    var endAt = $('[data-field="endAt"]', form).value;

    var input = {
      id: nextBookingId(),
      resourceId: resourceId,
      requesterName: rawName,
      startAt: toIso(startAt),
      endAt: toIso(endAt),
    };

    var created;
    try {
      created = API.createBooking(input, state.bookings, injectedNow());
    } catch (e) {
      showFormError(friendlyError(e, rawName)); // 목록 미추가(IA-01)
      return;
    }

    state.bookings.push(created);
    persist();
    $('[data-field="requesterName"]', form).value = "";
    render();
  }

  /* 필터 활성 표시 + 재렌더 (IA-05) */
  function onFilterChange(ev) {
    var sel = ev.currentTarget;
    if (sel.value !== "all") sel.classList.add("is-active");
    else sel.classList.remove("is-active");
    render();
  }

  function init() {
    storageOk = detectStorage();
    state = API.loadBookingState(window.localStorage);

    resourceNameById = {};
    state.resources.forEach(function (r) { resourceNameById[r.id] = r.name; });

    if (storageOk) {
      persist(); // 최초 로드 시 seed 를 저장해 다음 로드부터 동일 상태 재사용(§8.3)
    } else {
      var note = $('[data-testid="storage-note"]');
      if (note) note.hidden = false;
    }

    var list = $('[data-testid="booking-list"]');
    if (list) list.addEventListener("click", onListClick);

    var form = $('[data-testid="booking-form"]');
    if (form) form.addEventListener("submit", onFormSubmit);

    var resFilter = $('[data-field="filter-resource"]');
    var statusFilter = $('[data-field="filter-status"]');
    if (resFilter) resFilter.addEventListener("change", onFilterChange);
    if (statusFilter) statusFilter.addEventListener("change", onFilterChange);

    var close = $('[data-testid="conflict-close"]');
    if (close) close.addEventListener("click", hideConflict);

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
