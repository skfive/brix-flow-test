/* team-reservation-canary/app.js
 * 팀 회의실 예약·승인 — DOM 바인딩·렌더·인터랙션
 * SSOT: docs/design/reservation-timeline-BF-1004.md (§5 컴포넌트·§6 3중 신호·§7 dev 가이드)
 * 순수 로직/adapter 는 globalThis.TeamReservation (reservation.js) 사용
 * file:// CORS 안전 — ES module / fetch / 외부 CDN 0건. IIFE 전역 함수.
 * 주의: "현재 시각"(decidedAt/createdAt)은 app(호출자) 계층에서만 주입한다 — 순수 함수는 시각 소스 없음(§1.3).
 */
(function () {
  "use strict";

  var TR = globalThis.TeamReservation;
  if (!TR || typeof document === "undefined") return; // 로직 로드 실패 / 비브라우저 방어

  // ── DOM 참조 ────────────────────────────────────────────
  var el = {
    dateLabel: document.getElementById("tr-date-label"),
    datePrev: document.getElementById("tr-date-prev"),
    dateNext: document.getElementById("tr-date-next"),
    resourceSelect: document.getElementById("tr-resource-select"),
    newBtn: document.getElementById("tr-new-reservation"),
    cards: document.getElementById("tr-cards"),
    cardsEmpty: document.getElementById("tr-cards-empty"),
    listCount: document.getElementById("tr-list-count"),
    timeline: document.getElementById("tr-timeline"),
    timelineDate: document.getElementById("tr-timeline-date"),
    storageNotice: document.getElementById("tr-storage-notice"),
  };
  if (!el.cards || !el.timeline) return;

  // ── 상태 신호 매핑 (§6.1) ───────────────────────────────
  var STATUS_META = {
    pending: { label: "대기", icon: "⏳" },
    approved: { label: "승인", icon: "✓" },
    rejected: { label: "반려", icon: "✕" },
  };

  // ── storage 접근 (없으면 임시 세션) ─────────────────────
  var storage = null;
  try {
    storage = globalThis.localStorage || null;
  } catch (e) {
    storage = null;
  }

  var state = TR.loadReservationState(storage);
  // 최초 로드 시 seed 를 즉시 저장(§7.3). 저장 불가 환경이면 안내 노출.
  persist();

  // 선택 상태
  var selectedDate = defaultDate(state.reservations); // "YYYY-MM-DD"
  var selectedResource = "all";

  // ── 유틸 ────────────────────────────────────────────────
  function dayOf(iso) {
    return String(iso).slice(0, 10); // ISO 의 날짜부(UTC)
  }
  function hourFloat(iso) {
    var d = new Date(iso); // 결정적 파싱 (locale 무관, UTC 게터 사용)
    return d.getUTCHours() + d.getUTCMinutes() / 60;
  }
  function fmtTime(iso) {
    var d = new Date(iso);
    var hh = String(d.getUTCHours()).padStart(2, "0");
    var mm = String(d.getUTCMinutes()).padStart(2, "0");
    return hh + ":" + mm;
  }
  function fmtRange(rsv) {
    return fmtTime(rsv.startAt) + "–" + fmtTime(rsv.endAt); // en-dash
  }
  function resourceById(id) {
    for (var i = 0; i < state.resources.length; i++) {
      if (state.resources[i].id === id) return state.resources[i];
    }
    return null;
  }
  function defaultDate(reservations) {
    // seed 중 가장 이른 날짜를 기본값으로
    var days = reservations.map(function (r) { return dayOf(r.startAt); }).sort();
    return days.length ? days[0] : "2026-07-20";
  }
  function shiftDate(dateStr, deltaDays) {
    var d = new Date(dateStr + "T00:00:00.000Z");
    d.setUTCDate(d.getUTCDate() + deltaDays);
    return d.toISOString().slice(0, 10);
  }
  function nowIso() {
    // app(호출자) 계층에서만 현재 시각 주입 — 순수 함수엔 전달만 함
    return new Date().toISOString();
  }
  function persist() {
    // saveReservationState 는 setItem throw 를 내부 흡수(§7.3). storage 없으면 임시 세션.
    TR.saveReservationState(storage, state);
  }
  function showStorageNotice() {
    if (el.storageNotice && !storage) el.storageNotice.hidden = false;
  }

  function createEl(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
      }
    }
    if (text != null) node.textContent = text;
    return node;
  }

  // ── 상태 칩 (§5.1) ──────────────────────────────────────
  function statusChip(status) {
    var meta = STATUS_META[status] || STATUS_META.pending;
    var chip = createEl("span", { class: "tr-chip", "data-status": status, role: "status" });
    var ic = createEl("span", { class: "ic", "aria-hidden": "true" }, meta.icon);
    chip.appendChild(ic);
    chip.appendChild(document.createTextNode(" " + meta.label));
    return chip;
  }

  // ── 예약 카드 (§5.2 / §7.3) ────────────────────────────
  function renderCard(rsv) {
    var resource = resourceById(rsv.resourceId);
    var card = createEl("article", {
      class: "tr-card",
      "data-status": rsv.status,
      "data-reservation-id": rsv.id,
      "data-resource-id": rsv.resourceId,
    });

    var head = createEl("div", { class: "tr-card-head" });
    var headLeft = createEl("div");
    headLeft.appendChild(createEl("h3", null, resource ? resource.name : rsv.resourceId));
    var timeWrap = createEl("span", { class: "tr-time" });
    timeWrap.appendChild(createEl("span", { "aria-hidden": "true" }, "🕐")); // 🕐
    timeWrap.appendChild(createEl("time", null, fmtRange(rsv)));
    headLeft.appendChild(timeWrap);
    head.appendChild(headLeft);
    head.appendChild(statusChip(rsv.status));
    card.appendChild(head);

    card.appendChild(createEl("p", { class: "tr-meta" }, "신청자 · " + rsv.requesterName));

    // 반려 사유 (§5.2)
    if (rsv.status === "rejected" && rsv.reason) {
      var reason = createEl("div", { class: "tr-reason" });
      reason.appendChild(createEl("b", null, "반려 사유 ·"));
      reason.appendChild(document.createTextNode(" " + rsv.reason));
      card.appendChild(reason);
    }

    // 결정 액션 — pending 에서만 (§5.4)
    if (rsv.status === "pending") {
      var actions = createEl("div", { class: "tr-actions" });
      var approveBtn = createEl("button", { class: "tr-btn tr-btn--approve", type: "button" });
      approveBtn.appendChild(createEl("span", { class: "ic", "aria-hidden": "true" }, "✓"));
      approveBtn.appendChild(document.createTextNode(" 승인"));
      approveBtn.addEventListener("click", function () { onApprove(rsv.id, card); });

      var rejectBtn = createEl("button", { class: "tr-btn tr-btn--reject", type: "button" });
      rejectBtn.appendChild(createEl("span", { class: "ic", "aria-hidden": "true" }, "✕"));
      rejectBtn.appendChild(document.createTextNode(" 반려"));
      rejectBtn.addEventListener("click", function () { onReject(rsv.id); });

      actions.appendChild(approveBtn);
      actions.appendChild(rejectBtn);
      card.appendChild(actions);
    }
    return card;
  }

  // ── 충돌 배너 (§5.5) ────────────────────────────────────
  function showConflictAlert(cardEl, conflicts) {
    var existing = cardEl.querySelector('.tr-alert[data-kind="conflict"]');
    if (existing) existing.parentNode.removeChild(existing);

    var alert = createEl("div", { class: "tr-alert", "data-kind": "conflict", role: "alert" });
    alert.appendChild(createEl("span", { class: "ic", "aria-hidden": "true" }, "⚠"));
    var body = createEl("span", null, "이미 승인된 예약과 시간이 겹쳐 승인할 수 없습니다.");
    alert.appendChild(body);
    if (conflicts && conflicts.length) {
      var detail = createEl("span", { class: "detail" });
      var parts = conflicts.map(function (c) { return fmtRange(c) + " 승인 건(" + c.requesterName + ")"; });
      detail.textContent = "충돌: " + parts.join(", ");
      body.appendChild(detail);
    }
    var actions = cardEl.querySelector(".tr-actions");
    if (actions) cardEl.insertBefore(alert, actions);
    else cardEl.appendChild(alert);
  }

  // ── 액션 핸들러 ─────────────────────────────────────────
  function findReservation(id) {
    for (var i = 0; i < state.reservations.length; i++) {
      if (state.reservations[i].id === id) return state.reservations[i];
    }
    return null;
  }

  function onApprove(id, cardEl) {
    var rsv = findReservation(id);
    if (!rsv) return;
    var res = TR.decideReservation(rsv, "approve", state.reservations, nowIso());
    if (!res.ok && res.code === "CONFLICT") {
      var conflicts = TR.findApprovedConflicts(rsv, state.reservations);
      showConflictAlert(cardEl, conflicts); // pending 유지 (AC-04)
      return;
    }
    if (res.ok) {
      replaceReservation(res.reservation);
      persist();
      render();
    }
  }

  function onReject(id) {
    var rsv = findReservation(id);
    if (!rsv) return;
    var reason = "";
    if (typeof globalThis.prompt === "function") {
      var input = globalThis.prompt("반려 사유를 입력하세요 (선택):", "");
      if (input === null) return; // 취소
      reason = input;
    }
    var res = TR.decideReservation(rsv, "reject", state.reservations, nowIso(), reason);
    if (res.ok) {
      replaceReservation(res.reservation);
      persist();
      render();
    }
  }

  function replaceReservation(updated) {
    for (var i = 0; i < state.reservations.length; i++) {
      if (state.reservations[i].id === updated.id) {
        state.reservations[i] = updated;
        return;
      }
    }
  }

  // ── 필터 ────────────────────────────────────────────────
  function visibleReservations() {
    return state.reservations.filter(function (r) {
      if (dayOf(r.startAt) !== selectedDate) return false;
      if (selectedResource !== "all" && r.resourceId !== selectedResource) return false;
      return true;
    });
  }

  // ── 타임라인 (§5.6 / §7.5) ─────────────────────────────
  function computeAxis(dayReservations) {
    // 데이터 기반 동적 시각 축 (§7.5 권장). 없으면 09~18 기본.
    if (!dayReservations.length) return { start: 9, end: 18 };
    var minH = Infinity, maxH = -Infinity;
    dayReservations.forEach(function (r) {
      minH = Math.min(minH, Math.floor(hourFloat(r.startAt)));
      maxH = Math.max(maxH, Math.ceil(hourFloat(r.endAt)));
    });
    if (maxH - minH < 3) maxH = minH + 3; // 최소 폭 보장
    return { start: minH, end: maxH };
  }

  function renderTimeline() {
    var tl = el.timeline;
    tl.textContent = "";
    // 타임라인은 rejected 제외 (종료 상태 미표시, §6.3)
    var dayRsvs = state.reservations.filter(function (r) {
      return dayOf(r.startAt) === selectedDate && r.status !== "rejected" &&
        (selectedResource === "all" || r.resourceId === selectedResource);
    });
    var axis = computeAxis(dayRsvs);
    var cols = axis.end - axis.start;
    tl.style.gridTemplateColumns = "140px repeat(" + cols + ", minmax(72px, 1fr))";

    // 헤더 행: 코너 + 시각 축
    tl.appendChild(createEl("div", { class: "tr-tl-cell tr-tl-corner tr-tl-axis", role: "columnheader" }, "자원 / 시각"));
    for (var h = axis.start; h < axis.end; h++) {
      tl.appendChild(createEl("div", { class: "tr-tl-cell tr-tl-axis", role: "columnheader" }, String(h).padStart(2, "0")));
    }

    // 표시할 자원 행 (필터 반영)
    var rows = state.resources.filter(function (rs) {
      return selectedResource === "all" || rs.id === selectedResource;
    });

    rows.forEach(function (resource) {
      tl.appendChild(createEl("div", { class: "tr-tl-cell tr-tl-reslabel", role: "rowheader" }, resource.name));
      var track = createEl("div", { class: "tr-tl-cell tr-tl-track", role: "row" });
      track.style.gridColumn = "2 / span " + cols;

      var blocks = dayRsvs.filter(function (r) { return r.resourceId === resource.id; });
      blocks.forEach(function (rsv) {
        var overlapsOther = blocks.some(function (o) {
          return o.id !== rsv.id && TR.hasTimeOverlap(rsv.startAt, rsv.endAt, o.startAt, o.endAt);
        });
        track.appendChild(renderBlock(rsv, axis, cols, overlapsOther));
      });
      tl.appendChild(track);
    });
  }

  function renderBlock(rsv, axis, cols, overlapsOther) {
    var startH = hourFloat(rsv.startAt);
    var endH = hourFloat(rsv.endAt);
    var start = (startH - axis.start) / cols;
    var span = (endH - startH) / cols;
    var meta = STATUS_META[rsv.status] || STATUS_META.pending;

    var laneClass = "";
    if (overlapsOther) laneClass = rsv.status === "approved" ? " tr-block--main" : " tr-block--sub";

    var block = createEl("div", {
      class: "tr-block" + laneClass,
      "data-status": rsv.status,
      style: "--start:" + start.toFixed(4) + "; --span:" + span.toFixed(4) + ";",
      title: fmtRange(rsv) + " " + meta.label + " · " + rsv.requesterName,
      "aria-label": fmtRange(rsv) + " " + meta.label + " " + rsv.requesterName,
    });
    var label = createEl("span", { class: "bk-label" });
    label.appendChild(createEl("span", { "aria-hidden": "true" }, meta.icon));
    label.appendChild(document.createTextNode(" " + meta.label));
    block.appendChild(label);
    block.appendChild(createEl("span", { class: "bk-name" }, rsv.requesterName));
    return block;
  }

  // ── 목록 렌더 ───────────────────────────────────────────
  function renderCards() {
    var list = visibleReservations();
    el.cards.textContent = "";
    list.forEach(function (rsv) { el.cards.appendChild(renderCard(rsv)); });
    if (el.listCount) el.listCount.textContent = list.length + "건";
    if (el.cardsEmpty) el.cardsEmpty.hidden = list.length !== 0;
  }

  // ── 필터바 렌더 ─────────────────────────────────────────
  function renderResourceOptions() {
    var sel = el.resourceSelect;
    if (!sel) return;
    // "전체" 옵션 유지 + 자원별 옵션
    sel.textContent = "";
    sel.appendChild(createEl("option", { value: "all" }, "전체"));
    state.resources.forEach(function (rs) {
      sel.appendChild(createEl("option", { value: rs.id }, rs.name));
    });
    sel.value = selectedResource;
  }

  function renderDate() {
    if (el.dateLabel) el.dateLabel.textContent = selectedDate;
    if (el.timelineDate) el.timelineDate.textContent = selectedDate;
  }

  // ── 전체 렌더 ───────────────────────────────────────────
  function render() {
    renderDate();
    renderCards();
    renderTimeline();
  }

  // ── 이벤트 와이어링 ─────────────────────────────────────
  if (el.datePrev) el.datePrev.addEventListener("click", function () { selectedDate = shiftDate(selectedDate, -1); render(); });
  if (el.dateNext) el.dateNext.addEventListener("click", function () { selectedDate = shiftDate(selectedDate, 1); render(); });
  if (el.resourceSelect) el.resourceSelect.addEventListener("change", function (e) { selectedResource = e.target.value; render(); });
  if (el.newBtn) el.newBtn.addEventListener("click", function () {
    // 신규 예약 생성 폼 상세는 본 task 비범위(§10.2) — 진입점만 제공
    if (typeof globalThis.alert === "function") {
      globalThis.alert("신규 예약 생성은 별도 스토리에서 제공됩니다.");
    }
  });

  // ── 초기 렌더 ───────────────────────────────────────────
  if (!storage) showStorageNotice();
  renderResourceOptions();
  render();

  // 테스트/디버그 훅 (읽기 전용)
  globalThis.__TR_APP__ = {
    getState: function () { return state; },
    getSelection: function () { return { date: selectedDate, resource: selectedResource }; },
  };
})();
