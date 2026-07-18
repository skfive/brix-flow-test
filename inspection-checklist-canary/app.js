/* inspection-checklist-canary/app.js
 * 현장 점검 체크리스트 — DOM 바인딩·렌더·인터랙션
 * 도메인 로직/adapter 는 globalThis.InspectionChecklist (storage.js) 사용
 * SSOT(도메인): docs/plan/inspection-checklist-canary-BF-1024.md · 표시: docs/design/...-BF-1024.md
 * file:// CORS 안전 — ES import/export·fetch·외부 CDN 0건. IIFE 전역 함수.
 * "현재 시각"(history at/updatedAt)은 app(호출자) 계층에서만 주입 — 순수 모듈엔 시각 소스 없음.
 */
(function () {
  "use strict";

  var IC = globalThis.InspectionChecklist;
  if (!IC || typeof document === "undefined") return; // 로직 로드 실패 / 비브라우저 방어

  // ── DOM 참조 ────────────────────────────────────────────
  var el = {
    stats: document.getElementById("icc-stats"),
    board: document.getElementById("icc-board"),
    detail: document.getElementById("icc-detail"),
    notice: document.getElementById("icc-notice"),
    noticeText: document.getElementById("icc-notice-text"),
    noticeClose: document.getElementById("icc-notice-close"),
  };
  if (!el.board || !el.detail) return;

  // ── 컬럼 설정 (design §2.2·§4.2) ────────────────────────
  var COLUMNS = [
    { status: "todo", cls: "todo", icon: "○", label: "예정" },
    { status: "in_progress", cls: "progress", icon: "◐", label: "진행중" },
    { status: "blocked", cls: "blocked", icon: "▲", label: "차단됨" },
    { status: "done", cls: "done", icon: "✓", label: "완료" },
  ];
  var STATUS_CLS = { todo: "todo", in_progress: "progress", blocked: "blocked", done: "done" };
  var STATUS_ICON = { todo: "○", in_progress: "◐", blocked: "▲", done: "✓" };
  var LABEL = IC.STATUS_LABELS;

  // ── 전이 버튼 메타 (design §6.4) ────────────────────────
  var BTN = {
    "todo>in_progress": { label: "진행 시작", variant: "primary" },
    "todo>blocked": { label: "차단", variant: "danger-outline" },
    "in_progress>done": { label: "완료", variant: "done" },
    "in_progress>blocked": { label: "차단", variant: "danger-outline" },
    "in_progress>todo": { label: "착수 취소", variant: "ghost" },
    "blocked>todo": { label: "예정으로", variant: "ghost" },
    "blocked>in_progress": { label: "차단 해제(진행중)", variant: "outline" },
    "done>in_progress": { label: "재오픈", variant: "ghost" },
  };

  // ── history 이벤트 라벨 (design §5.5) ───────────────────
  var EVENT_LABEL = {
    STATUS_CHANGED: "상태 변경",
    ASSIGNEE_CHANGED: "담당자 변경",
    BLOCK_SET: "차단 설정",
    BLOCK_CLEARED: "차단 해제",
  };

  // ── storage 접근 (없으면 임시 세션) ─────────────────────
  var storage = null;
  try {
    storage = globalThis.localStorage || null;
  } catch (e) {
    storage = null; // 프라이빗 모드 등 접근 예외
  }

  // ── 앱 상태 ─────────────────────────────────────────────
  var state = { items: [], selectedId: null, focusedId: null };
  var wantFocus = false; // 재렌더 후 focusedId 카드에 실제 포커스 이동할지

  // ── 유틸 ────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtDateTime(iso) {
    // "2026-07-01T13:40:00.000Z" → "2026-07-01 13:40" (UTC, 결정적)
    if (typeof iso !== "string" || iso.length < 16) return esc(iso);
    return esc(iso.slice(0, 16).replace("T", " "));
  }
  function fmtTime(iso) {
    if (typeof iso !== "string" || iso.length < 16) return esc(iso);
    return esc(iso.slice(11, 16));
  }
  function nowIso() {
    return new Date().toISOString(); // app 계층 시각 주입 (순수 모듈 아님)
  }
  function actorOf(item) {
    return item.assignee ? item.assignee.name : "운영자";
  }
  function findItem(id) {
    for (var i = 0; i < state.items.length; i++) if (state.items[i].id === id) return state.items[i];
    return null;
  }
  function indexOfId(id) {
    for (var i = 0; i < state.items.length; i++) if (state.items[i].id === id) return i;
    return -1;
  }

  // ── 변경 커밋: item 교체 → 저장 → 재렌더 ────────────────
  function commit(nextItem) {
    var idx = indexOfId(nextItem.id);
    if (idx === -1) return;
    state.items[idx] = nextItem;
    IC.save(storage, state.items);
    render();
  }

  // ─────────────────────────── 렌더 ───────────────────────────
  function render() {
    renderStats();
    renderBoard();
    renderDetail();
    if (wantFocus && state.focusedId) {
      var node = el.board.querySelector('[data-role="card"][data-id="' + cssEsc(state.focusedId) + '"]');
      if (node) node.focus();
    }
    wantFocus = false;
  }

  function cssEsc(s) {
    return String(s).replace(/["\\]/g, "\\$&");
  }

  function renderStats() {
    var s = IC.computeStats(state.items);
    el.stats.innerHTML =
      '<span class="icc-stat">총 <strong>' + s.total + "</strong></span>" +
      '<span class="icc-stat icc-stat--unassigned">미배정 <strong>' + s.unassigned + "</strong></span>" +
      '<span class="icc-stat icc-stat--blocked">차단 <strong>' + s.blocked + "</strong></span>";
  }

  function renderBoard() {
    var groups = IC.groupByStatus(state.items);
    var html = "";
    for (var c = 0; c < COLUMNS.length; c++) {
      var col = COLUMNS[c];
      var items = groups[col.status];
      html +=
        '<section class="icc-column icc-column--' + col.cls + '" role="group" ' +
        'aria-label="' + esc(col.label) + " 컬럼, " + items.length + '건">' +
        '<div class="icc-column__strip" aria-hidden="true"></div>' +
        '<div class="icc-column__head">' +
        '<span class="icc-column__icon" aria-hidden="true">' + col.icon + "</span>" +
        '<h2 class="icc-column__label">' + esc(col.label) + "</h2>" +
        '<span class="icc-column__count">' + items.length + "</span>" +
        "</div>" +
        '<div class="icc-column__body">' +
        (items.length ? items.map(function (it, row) { return renderCard(it, col.status, row); }).join("")
          : '<div class="icc-empty">항목 없음</div>') +
        "</div></section>";
    }
    el.board.innerHTML = html;
  }

  function renderCard(it, colStatus, row) {
    var selected = it.id === state.selectedId;
    var focusable = it.id === (state.focusedId || firstFocusId(colStatus));
    var badgeCls = STATUS_CLS[it.status];
    var aria =
      esc(it.id) + " " + esc(it.title) + ", 상태 " + esc(LABEL[it.status]) +
      ", 담당자 " + (it.assignee ? esc(it.assignee.name) : "미배정") +
      (it.status === "blocked" && it.blockReason ? ", 차단사유 " + esc(it.blockReason) : "");

    var html =
      '<div class="icc-card' + (selected ? " icc-card--selected" : "") + '" data-role="card" ' +
      'data-id="' + esc(it.id) + '" data-col="' + colStatus + '" data-row="' + row + '" ' +
      'role="button" tabindex="' + (focusable ? "0" : "-1") + '" aria-pressed="' + (selected ? "true" : "false") + '" ' +
      'aria-label="' + aria + '">' +
      '<div class="icc-card__top">' +
      '<span class="icc-card__id">' + esc(it.id) + "</span>" +
      badge(it.status) +
      "</div>" +
      '<h3 class="icc-card__title">' + esc(it.title) + "</h3>" +
      '<span class="icc-card__location">' + esc(it.location) + "</span>" +
      assigneeBadge(it) +
      (it.status === "blocked" && it.blockReason ? blockReason(it.blockReason) : "") +
      renderActions(it) +
      "</div>";
    return html;
  }

  // 컬럼 첫 카드 id (roving tabindex 진입점 계산 보조)
  function firstFocusId(colStatus) {
    var g = IC.groupByStatus(state.items);
    var arr = g[colStatus] || [];
    return arr.length ? arr[0].id : null;
  }

  function badge(status) {
    return '<span class="icc-badge icc-badge--' + STATUS_CLS[status] + '">' +
      '<span aria-hidden="true">' + STATUS_ICON[status] + "</span>" + esc(LABEL[status]) + "</span>";
  }

  function assigneeBadge(it) {
    if (it.assignee) {
      return '<span class="icc-assignee"><span class="icc-avatar" aria-hidden="true">' +
        esc(it.assignee.name.charAt(0)) + "</span>" + esc(it.assignee.name) + "</span>";
    }
    return '<span class="icc-assignee icc-assignee--unassigned">' +
      '<span class="icc-avatar" aria-hidden="true">?</span>미배정</span>';
  }

  function blockReason(reason) {
    return '<div class="icc-blockreason"><span class="icc-blockreason__icon" aria-hidden="true">▲</span>' +
      "<span>" + esc(reason) + "</span></div>";
  }

  function renderActions(it) {
    var targets = IC.allowedTransitions(it.status);
    if (!targets.length) return "";
    var out = '<div class="icc-actions">';
    for (var i = 0; i < targets.length; i++) {
      var to = targets[i];
      var meta = BTN[it.status + ">" + to];
      if (!meta) continue;
      var g = IC.checkGuard(it, to);
      var disabled = !g.ok; // 현실적으로 G1(미배정 착수)만 해당 — 사유 노출 목적으로 DOM 유지
      out += '<span class="icc-action">';
      out +=
        '<button class="icc-btn icc-btn--' + meta.variant + '" type="button" ' +
        'data-role="transition" data-id="' + esc(it.id) + '" data-to="' + to + '"' +
        (disabled ? ' aria-disabled="true" title="' + esc(g.reason || "") + '"' : "") +
        ">" + esc(meta.label) + "</button>";
      if (disabled && g.reason) {
        out += '<span class="icc-btn__reason">' + esc(g.reason) + "</span>";
      }
      out += "</span>";
    }
    out += "</div>";
    return out;
  }

  // ── 상세 패널 ───────────────────────────────────────────
  function renderDetail() {
    var it = state.selectedId ? findItem(state.selectedId) : null;
    if (!it) {
      el.detail.innerHTML = '<div class="icc-detail__empty">카드를 선택하면 상세와 변경 이력이 표시됩니다.</div>';
      return;
    }
    var html =
      '<div><div class="icc-detail__id">' + esc(it.id) + "</div>" +
      '<div class="icc-detail__title">' + esc(it.title) + "</div></div>" +
      field("상태", '<span class="icc-field__value">' + badge(it.status) + "</span>") +
      field("위치", '<span class="icc-field__value">' + esc(it.location) + "</span>") +
      assigneeField(it) +
      (it.status === "blocked" && it.blockReason
        ? field("차단 사유", blockReason(it.blockReason))
        : "") +
      field("생성 / 최종변경",
        '<span class="icc-field__value icc-history__at" style="font-size:12px;color:var(--icc-color-text-muted)">' +
        fmtDateTime(it.createdAt) + " · " + fmtDateTime(it.updatedAt) + "</span>") +
      '<hr class="icc-hr" />' +
      '<div><span class="icc-field__label" style="display:block;margin-bottom:var(--icc-space-3)">변경 이력 (오래된 순)</span>' +
      renderHistory(it.history) + "</div>";
    el.detail.innerHTML = html;
  }

  function field(label, valueHtml) {
    return '<div class="icc-field"><span class="icc-field__label">' + esc(label) + "</span>" + valueHtml + "</div>";
  }

  function assigneeField(it) {
    var locked = it.status === "done"; // §4 배정 잠금
    var noUnassign = it.status === "in_progress" || it.status === "blocked"; // 해제 불가
    var opts = "";
    for (var i = 0; i < IC.ASSIGNEES.length; i++) {
      var a = IC.ASSIGNEES[i];
      var sel = it.assignee && it.assignee.id === a.id ? " selected" : "";
      opts += '<option value="' + esc(a.id) + '"' + sel + ">" + esc(a.name) + "</option>";
    }
    var unSel = !it.assignee ? " selected" : "";
    opts += '<option value=""' + unSel + (noUnassign ? " disabled" : "") + ">미배정" +
      (noUnassign ? " (진행중/차단은 해제 불가)" : "") + "</option>";
    return '<div class="icc-field"><label class="icc-field__label" for="icc-assignee-select">담당자</label>' +
      '<select class="icc-select" id="icc-assignee-select" data-role="assignee-select" data-id="' + esc(it.id) + '"' +
      (locked ? " disabled" : "") + ' aria-label="담당자 배정">' + opts + "</select>" +
      (locked ? '<span class="icc-btn__reason">완료 항목은 배정 잠금 — 재오픈 후 변경</span>' : "") + "</div>";
  }

  function renderHistory(history) {
    if (!history || !history.length) {
      return '<div class="icc-empty">변경 이력 없음</div>';
    }
    var out = '<ol class="icc-history" role="list">';
    for (var i = 0; i < history.length; i++) {
      var ev = history[i];
      out +=
        '<li class="icc-history__event"><div class="icc-history__type">' +
        esc(EVENT_LABEL[ev.type] || ev.type) + "</div>" +
        '<div class="icc-history__meta">' + historyMeta(ev) +
        ' · <span class="icc-history__at">' + fmtTime(ev.at) + "</span> · " + esc(ev.actor) +
        "</div></li>";
    }
    out += "</ol>";
    return out;
  }

  function historyMeta(ev) {
    if (ev.type === "STATUS_CHANGED") {
      return esc(LABEL[ev.from] || ev.from) + " → " + esc(LABEL[ev.to] || ev.to);
    }
    if (ev.type === "ASSIGNEE_CHANGED") {
      return esc(ev.from || "미배정") + " → " + esc(ev.to || "미배정");
    }
    if (ev.type === "BLOCK_SET") {
      return "사유: " + esc(ev.reason);
    }
    if (ev.type === "BLOCK_CLEARED") {
      return "해제 사유: " + esc(ev.reason);
    }
    return "";
  }

  // ─────────────────────────── 인터랙션 ───────────────────────────
  function selectCard(id, focus) {
    state.selectedId = id;
    state.focusedId = id;
    wantFocus = !!focus;
    render();
  }

  function doTransition(id, to) {
    var it = findItem(id);
    if (!it) return;
    var ctx = { actor: actorOf(it), at: nowIso() };
    if (to === "blocked") {
      var reason = typeof globalThis.prompt === "function"
        ? globalThis.prompt("차단 사유를 입력하세요 (필수):", "")
        : "";
      if (reason == null || String(reason).trim() === "") return; // 빈 값 → 전이 취소 (G2)
      ctx.reason = String(reason).trim();
    }
    var r = IC.applyTransition(it, to, ctx);
    if (!r.ok) return; // 가드 위반(disabled 상태) — 무시
    commit(r.item);
  }

  function doAssign(id, assigneeId) {
    var it = findItem(id);
    if (!it) return;
    var assignee = null;
    for (var i = 0; i < IC.ASSIGNEES.length; i++) {
      if (IC.ASSIGNEES[i].id === assigneeId) assignee = IC.ASSIGNEES[i];
    }
    var r = IC.assign(it, assignee, { actor: actorOf(it), at: nowIso() });
    if (!r.ok) { render(); return; } // 거부(해제 불가 등) — 원상 재렌더로 select 되돌림
    commit(r.item);
  }

  // 클릭 위임 (보드)
  el.board.addEventListener("click", function (e) {
    var btn = closest(e.target, '[data-role="transition"]');
    if (btn) {
      e.stopPropagation();
      if (btn.getAttribute("aria-disabled") === "true") return;
      doTransition(btn.getAttribute("data-id"), btn.getAttribute("data-to"));
      return;
    }
    var card = closest(e.target, '[data-role="card"]');
    if (card) selectCard(card.getAttribute("data-id"), false);
  });

  // 키보드 (보드) — roving tabindex + 방향키 (design §7.1)
  el.board.addEventListener("keydown", function (e) {
    var card = closest(e.target, '[data-role="card"]');
    if (!card) return;
    var key = e.key;
    if (key === "Enter" || key === " " || key === "Spacebar") {
      e.preventDefault();
      selectCard(card.getAttribute("data-id"), false);
      return;
    }
    var col = card.getAttribute("data-col");
    var row = parseInt(card.getAttribute("data-row"), 10);
    var target = null;
    var groups = IC.groupByStatus(state.items);
    if (key === "ArrowDown") target = nthInColumn(groups, col, row + 1);
    else if (key === "ArrowUp") target = nthInColumn(groups, col, row - 1);
    else if (key === "Home") target = nthInColumn(groups, col, 0);
    else if (key === "End") target = nthInColumn(groups, col, (groups[col] || []).length - 1);
    else if (key === "ArrowRight") target = adjacentColumn(groups, col, 1, row);
    else if (key === "ArrowLeft") target = adjacentColumn(groups, col, -1, row);
    else return;
    if (target) {
      e.preventDefault();
      state.focusedId = target;
      wantFocus = true;
      render();
    }
  });

  function nthInColumn(groups, colStatus, n) {
    var arr = groups[colStatus] || [];
    if (n < 0 || n >= arr.length) return null;
    return arr[n].id;
  }
  function adjacentColumn(groups, colStatus, dir, row) {
    var order = ["todo", "in_progress", "blocked", "done"];
    var idx = order.indexOf(colStatus);
    for (var i = idx + dir; i >= 0 && i < order.length; i += dir) {
      var arr = groups[order[i]] || [];
      if (arr.length) {
        var r = Math.min(row, arr.length - 1);
        return arr[r].id;
      }
    }
    return null;
  }

  // 상세 패널 — 담당자 select 변경 위임
  el.detail.addEventListener("change", function (e) {
    var sel = closest(e.target, '[data-role="assignee-select"]');
    if (!sel) return;
    doAssign(sel.getAttribute("data-id"), sel.value);
  });

  function closest(node, selector) {
    while (node && node !== el.board && node.nodeType === 1) {
      if (node.matches && node.matches(selector)) return node;
      node = node.parentNode;
    }
    if (node && node.nodeType === 1 && node.matches && node.matches(selector)) return node;
    return null;
  }

  // ── 손상 경고 배너 ──────────────────────────────────────
  function showNotice(reason) {
    if (el.noticeText) el.noticeText.textContent = "저장된 데이터가 손상되어 기본 데이터로 복구했습니다.";
    if (el.notice) el.notice.hidden = false;
    console.warn("[inspection-checklist-canary] 손상 데이터 감지 — seed 로 복구:", reason);
  }
  if (el.noticeClose) el.noticeClose.addEventListener("click", function () { el.notice.hidden = true; });

  // ─────────────────────────── 초기화 ───────────────────────────
  var loaded = IC.load(storage);
  state.items = loaded.items;
  if (loaded.source === "seed") {
    // 최초 방문 또는 손상 복구 — seed 를 정식 기록(자가 치유, §7.2)
    IC.save(storage, state.items);
  }
  if (loaded.corrupted) {
    showNotice(loaded.reason); // D2~D7 실제 손상만 사용자 경고 (AC-3)
  }
  render();

  // 테스트/디버그 훅 (읽기 전용)
  globalThis.__ICC_APP__ = {
    getState: function () { return state; },
    getItems: function () { return state.items; },
  };
})();
