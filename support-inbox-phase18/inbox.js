/* support-inbox-phase18/inbox.js — 고객지원 인박스 Phase18 도메인 로직 + DOM 렌더/와이어링
 * BF-1021 · 기획 docs/plan/support-inbox-phase18-BF-1013.md §4(전이·가드)·§5(목록/검색/필터/전환)
 *          · 시안 docs/design/support-inbox-phase18-BF-1019.md §5/§6/§7
 * UMD 패턴 (support-inbox-canary 관례 계승) — 브라우저: globalThis.SupportInboxPhase18 + DOMContentLoaded init / Node: module.exports(순수 함수)
 * file:// CORS 안전 — 외부 CDN·fetch·import/export·네트워크 0건. fixture 는 Date.now()/Math.random() 미사용(fixtures.js).
 * 담당자 배정/재배정·우선순위 변경·영속 저장은 비범위(기획 §10) — 표시·필터 전용.
 */
(function (root, factory) {
  "use strict";
  var isNode = typeof module === "object" && module && module.exports;
  var deps = isNode
    ? { Fixtures: require("./fixtures.js") }
    : { Fixtures: root && root.SupportInboxPhase18Fixtures };
  var api = factory(deps);
  if (isNode) {
    module.exports = api;
  }
  if (root) {
    root.SupportInboxPhase18 = api;
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", api.init);
      } else {
        api.init();
      }
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (deps) {
  "use strict";

  var Fixtures = deps.Fixtures;

  /* ─── 상수 (기획 §3/§4 그대로 — 규칙 재해석 금지) ─── */

  var STATUS_LABEL = { received: "접수", in_progress: "진행", on_hold: "보류", resolved: "해결" };
  var PRIORITY_LABEL = { urgent: "긴급", high: "높음", normal: "보통", low: "낮음" };
  /* 우선순위 랭크 (기획 §3.1): urgent(4) > high(3) > normal(2) > low(1) */
  var PRIORITY_RANK = { urgent: 4, high: 3, normal: 2, low: 1 };
  /* 시안 §6.2 caret 랭크 시각화(채움 개수 차등) */
  var PRIORITY_CARET = { urgent: "▲▲▲", high: "▲▲△", normal: "▲△△", low: "△△△" };

  /* §4 전이표 → 시안 §5.4 버튼 정의. 각 상태에서 노출할 버튼(비활성 포함, DOM 유지 — 오조작 방지 UX).
   * guard: null=무조건 허용 · "G1"/"G3"=담당자 필요 · "G4"=금지(항상 비활성) · "G5"=재오픈 허용
   * 담당자 배정 액션은 비범위(§10) — 전이 컨트롤만 렌더한다. */
  var TRANSITION_BUTTONS = {
    received:    [{ to: "in_progress", label: "진행 시작", guard: "G1" }],
    in_progress: [{ to: "on_hold", label: "보류", guard: null }, { to: "resolved", label: "해결", guard: "G3" }],
    on_hold:     [{ to: "in_progress", label: "재개", guard: null }, { to: "resolved", label: "해결", guard: "G4" }],
    resolved:    [{ to: "in_progress", label: "재오픈", guard: "G5" }]
  };

  /* 필터 그룹 정의 (기획 §5.3 · 시안 §5.2) — status/priority/assignee 3그룹, 카테고리 내 OR·간 AND */
  var FILTER_GROUPS = [
    { category: "status", legend: "상태", options: [
      { value: "received", label: "접수" }, { value: "in_progress", label: "진행" },
      { value: "on_hold", label: "보류" }, { value: "resolved", label: "해결" }
    ] },
    { category: "priority", legend: "우선순위", options: [
      { value: "urgent", label: "긴급" }, { value: "high", label: "높음" },
      { value: "normal", label: "보통" }, { value: "low", label: "낮음" }
    ] },
    { category: "assignee", legend: "담당자", options: [
      { value: "agt-01", label: "박운영" }, { value: "agt-02", label: "정지원" },
      { value: "unassigned", label: "미배정" }
    ] }
  ];

  function statusLabel(status) { return STATUS_LABEL[status] || status; }
  function priorityLabel(priority) { return PRIORITY_LABEL[priority] || priority; }
  function priorityRank(priority) {
    return Object.prototype.hasOwnProperty.call(PRIORITY_RANK, priority) ? PRIORITY_RANK[priority] : 0;
  }

  /* ================================================================
   *  순수 함수: 파이프라인 (기획 §5 — fixture → 필터 → 검색 → 정렬 → 렌더)
   * ================================================================ */

  /**
   * 정렬 (기획 §5.1): ① priority 랭크 내림차순 ② createdAt 오름차순 ③ id 오름차순(완전 결정성).
   * 입력 배열을 변형하지 않고 새 배열을 반환한다.
   * @param {Array<object>} tickets
   * @returns {Array<object>}
   */
  function sortTickets(tickets) {
    return (tickets || []).slice().sort(function (a, b) {
      var rd = priorityRank(b.priority) - priorityRank(a.priority);
      if (rd !== 0) return rd;
      if (a.createdAt < b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
  }

  /**
   * 검색 (기획 §5.2): trim·소문자 후 id/subject/requester.name/requester.email substring OR 매칭.
   * query 가 빈 문자열(trim 후)이면 전체 통과. assignee 는 매칭 대상 아님.
   * @param {Array<object>} tickets
   * @param {string} query
   * @returns {Array<object>}
   */
  function searchTickets(tickets, query) {
    var q = (query == null ? "" : String(query)).trim().toLowerCase();
    if (q === "") return (tickets || []).slice();
    return (tickets || []).filter(function (t) {
      var hay = [t.id, t.subject, t.requester.name, t.requester.email];
      for (var i = 0; i < hay.length; i++) {
        if (String(hay[i]).toLowerCase().indexOf(q) !== -1) return true;
      }
      return false;
    });
  }

  /**
   * 단일 티켓이 필터 조건을 통과하는지 판정 (기획 §5.3): 카테고리 내 OR, 카테고리 간 AND,
   * 카테고리 배열이 비면 그 카테고리는 미필터(전체 통과). assignee 특수값 'unassigned' = assignee===null.
   * @param {object} t
   * @param {{status?:string[], priority?:string[], assignee?:string[]}} filters
   * @returns {boolean}
   */
  function matchesFilters(t, filters) {
    var f = filters || {};
    var statusSel = f.status || [];
    var prioSel = f.priority || [];
    var assigneeSel = f.assignee || [];
    if (statusSel.length && statusSel.indexOf(t.status) === -1) return false;
    if (prioSel.length && prioSel.indexOf(t.priority) === -1) return false;
    if (assigneeSel.length) {
      var key = t.assignee ? t.assignee.id : "unassigned";
      if (assigneeSel.indexOf(key) === -1) return false;
    }
    return true;
  }

  /**
   * 필터 (기획 §5.3) — matchesFilters 를 배열에 적용.
   * @param {Array<object>} tickets
   * @param {object} filters
   * @returns {Array<object>}
   */
  function filterTickets(tickets, filters) {
    return (tickets || []).filter(function (t) { return matchesFilters(t, filters); });
  }

  /**
   * 파이프라인 합성 (기획 §5): 필터 → 검색 → 정렬 순으로 목록을 도출한다.
   * @param {Array<object>} tickets
   * @param {{query?:string, filters?:object}} opts
   * @returns {Array<object>} 화면 렌더용 정렬된 배열
   */
  function buildList(tickets, opts) {
    var o = opts || {};
    var filtered = filterTickets(tickets, o.filters);
    var searched = searchTickets(filtered, o.query);
    return sortTickets(searched);
  }

  /* ================================================================
   *  순수 함수: 상태 전이 · 가드 (기획 §4.2 전이표 + §4.3 가드)
   * ================================================================ */

  /**
   * 현재 상태에서 노출할 전이 버튼 목록(비활성 포함 — 오조작 방지 UX).
   * @param {object} inquiry
   * @returns {Array<{to:string,label:string,enabled:boolean,reason:(string|null)}>}
   */
  function getAllowedTransitions(inquiry) {
    var defs = TRANSITION_BUTTONS[inquiry.status] || [];
    return defs.map(function (def) {
      var enabled = true, reason = null;
      if (def.guard === "G4") {
        enabled = false; reason = "보류 상태에서 해결로 직접 전이 불가 — 진행으로 재개 후 처리하세요(G4)";
      } else if ((def.guard === "G1" || def.guard === "G3") && inquiry.assignee == null) {
        enabled = false; reason = "담당자 미배정 — 배정된 문의만 전이할 수 있습니다(" + def.guard + ")";
      }
      return { to: def.to, label: def.label, enabled: enabled, reason: reason };
    });
  }

  /** 전체 tickets 의 history 를 스캔해 다음 EVT-###### ID 를 결정론적으로 생성한다(기획 §3.2). */
  function nextEventId(tickets) {
    var max = 0;
    (tickets || []).forEach(function (t) {
      (t.history || []).forEach(function (e) {
        var m = /^EVT-(\d+)$/.exec(e.id || "");
        if (m) { var n = parseInt(m[1], 10); if (n > max) max = n; }
      });
    });
    var next = String(max + 1);
    while (next.length < 6) next = "0" + next;
    return "EVT-" + next;
  }

  function cloneInquiry(t) {
    return {
      id: t.id, subject: t.subject,
      requester: { name: t.requester.name, email: t.requester.email },
      status: t.status, priority: t.priority,
      assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name } : null,
      createdAt: t.createdAt, updatedAt: t.updatedAt,
      history: t.history.slice()
    };
  }

  /**
   * 상태 전이를 시도한다. 동일 상태는 no-op(EC-01), 가드 위반은 {ok:false,error}.
   * 성공 시 status/updatedAt 갱신 + STATUS_CHANGED 이력 append. 원본은 변형하지 않는다.
   * @param {object} inquiry
   * @param {string} to 목표 상태
   * @param {{actor:object, at:string, note?:(string|null), eventId:string}} opts
   * @returns {{ok:boolean, inquiry?:object, error?:string, noop?:boolean}}
   */
  function transition(inquiry, to, opts) {
    if (to === inquiry.status) {
      return { ok: true, inquiry: inquiry, noop: true }; // EC-01 no-op, 이력 미기록
    }
    var allowed = getAllowedTransitions(inquiry);
    var match = null;
    for (var i = 0; i < allowed.length; i++) { if (allowed[i].to === to) { match = allowed[i]; break; } }
    if (!match) {
      return { ok: false, error: statusLabel(inquiry.status) + " → " + statusLabel(to) + " 전이는 허용되지 않습니다" };
    }
    if (!match.enabled) {
      return { ok: false, error: match.reason };
    }
    var event = {
      id: opts.eventId, ticketId: inquiry.id, type: "STATUS_CHANGED", at: opts.at,
      actor: { id: opts.actor.id, name: opts.actor.name },
      from: inquiry.status, to: to,
      note: opts.note != null && opts.note !== "" ? opts.note : null
    };
    var next = cloneInquiry(inquiry);
    next.status = to;
    next.updatedAt = opts.at;
    next.history = inquiry.history.concat([event]);
    return { ok: true, inquiry: next };
  }

  /* ─── 순수 함수: 집계 요약 (시안 §4.2 헤더) ─── */

  function summarize(tickets) {
    var s = { total: (tickets || []).length, unassigned: 0, urgent: 0, received: 0, in_progress: 0, on_hold: 0, resolved: 0 };
    (tickets || []).forEach(function (t) {
      if (t.assignee == null) s.unassigned++;
      if (t.priority === "urgent") s.urgent++;
      if (Object.prototype.hasOwnProperty.call(s, t.status)) s[t.status]++;
    });
    return s;
  }

  /* ─── 순수 함수: 시각 포맷 (Date 객체 미사용 — 타임존 결정성) ─── */

  var AT_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?(?:\.\d+)?([+-]\d{2}:\d{2}|Z)?/;
  function formatAt(iso) {
    if (typeof iso !== "string") return "";
    var m = AT_RE.exec(iso);
    if (!m) return iso;
    var offset = m[3] && m[3] !== "Z" ? " (" + m[3] + ")" : (m[3] === "Z" ? " (UTC)" : "");
    return m[1] + " " + m[2] + offset;
  }

  /* 런타임 시각 (브라우저 전용 — fixture 아님, KST 벽시계 +09:00). 세션 상태 전환 이벤트 at 용. */
  function nowIsoKst() {
    var d = new Date();
    return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().replace("Z", "+09:00");
  }

  /* ================================================================
   *  DOM 렌더링 / 와이어링 (브라우저 전용 — Node 단위 테스트에서는 미실행)
   * ================================================================ */

  var state = {
    tickets: [],          // 세션 in-memory 원본(상태 전환으로 갱신)
    selectedId: null,
    query: "",
    filters: { status: [], priority: [], assignee: [] }
  };

  function byId(id) { return document.getElementById(id); }
  function optionIdOf(ticketId) { return "opt-" + ticketId.replace("INQ-", ""); }

  /** 간이 hyperscript — 텍스트는 textContent 로만 삽입(주입 방지) */
  function h(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") e.className = v;
        else if (k === "text") e.textContent = v;
        else if (k === "disabled") { if (v) e.setAttribute("disabled", ""); }
        else e.setAttribute(k, v === true ? "" : String(v));
      });
    }
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }

  function statusBadge(status) {
    return h("span", { "class": "sib-badge sib-badge--" + status }, [
      h("span", { "class": "sib-badge__dot", "aria-hidden": "true" }, []),
      statusLabel(status)
    ]);
  }

  function priorityBadge(priority) {
    return h("span", { "class": "sib-prio sib-prio--" + priority }, [
      h("span", { "class": "sib-prio__caret", "aria-hidden": "true" }, [PRIORITY_CARET[priority] || ""]),
      priorityLabel(priority)
    ]);
  }

  function assigneeChip(assignee) {
    if (!assignee) {
      return h("span", { "class": "sib-assignee sib-assignee--none" }, [
        h("span", { "class": "sib-avatar", "aria-hidden": "true" }, ["—"]), "미배정"
      ]);
    }
    return h("span", { "class": "sib-assignee" }, [
      h("span", { "class": "sib-avatar", "aria-hidden": "true" }, [assignee.name.charAt(0)]),
      assignee.name
    ]);
  }

  function findTicket(id) {
    for (var i = 0; i < state.tickets.length; i++) { if (state.tickets[i].id === id) return state.tickets[i]; }
    return null;
  }

  function announce(msg) {
    var live = byId("sib-live");
    if (live) live.textContent = msg;
  }

  /** 현재 파이프라인 결과(필터+검색+정렬 후 목록) */
  function visibleTickets() {
    return buildList(state.tickets, { query: state.query, filters: state.filters });
  }

  function selectedFilterCount() {
    return state.filters.status.length + state.filters.priority.length + state.filters.assignee.length;
  }

  /* ── 렌더: 헤더 집계 ── */
  function renderSummary() {
    var s = summarize(state.tickets);
    var host = byId("sib-summary");
    if (!host) return;
    host.textContent = "";
    [["총", s.total], ["긴급", s.urgent], ["진행", s.in_progress], ["미배정", s.unassigned]].forEach(function (pair) {
      host.appendChild(h("span", { "class": "sib-stat" }, [pair[0] + " ", h("strong", null, [String(pair[1])])]));
    });
  }

  /* ── 렌더: 필터 칩 그룹 (§5.2) ── */
  function renderFilters() {
    var host = byId("sib-filters");
    if (!host) return;
    host.textContent = "";
    FILTER_GROUPS.forEach(function (group) {
      var chips = group.options.map(function (opt) {
        var on = state.filters[group.category].indexOf(opt.value) !== -1;
        var chip = h("button", {
          "class": "sib-chip" + (on ? " sib-chip--on" : ""),
          type: "button", role: "checkbox", "aria-checked": on ? "true" : "false"
        }, [opt.label]);
        chip.addEventListener("click", function () { toggleFilter(group.category, opt.value); });
        return chip;
      });
      host.appendChild(h("fieldset", { "class": "sib-filter" }, [
        h("legend", { "class": "sib-filter__legend" }, [group.legend]),
        h("div", { "class": "sib-filter__chips" }, chips)
      ]));
    });
  }

  /* ── 렌더: 결과 건수 + 초기화 버튼 상태 ── */
  function renderToolbarFoot() {
    var total = state.tickets.length;
    var shown = visibleTickets().length;
    var count = byId("sib-result-count");
    if (count) {
      count.textContent = "";
      count.appendChild(document.createTextNode(total + "건 중 "));
      count.appendChild(h("strong", null, [String(shown)]));
      count.appendChild(document.createTextNode("건 표시"));
    }
    var reset = byId("sib-reset");
    if (reset) {
      if (selectedFilterCount() === 0) reset.setAttribute("disabled", "");
      else reset.removeAttribute("disabled");
    }
    var clear = byId("sib-search-clear");
    if (clear) clear.style.display = state.query === "" ? "none" : "";
  }

  /* ── 렌더: 목록 (§5.3) ── */
  function renderList() {
    var ul = byId("sib-list");
    if (!ul) return;
    ul.textContent = "";
    var list = visibleTickets();
    if (list.length === 0) {
      ul.removeAttribute("aria-activedescendant");
      ul.appendChild(h("li", { "class": "sib-empty", role: "presentation" }, [
        h("strong", { "class": "sib-empty__title" }, ["조건에 맞는 문의가 없습니다"]),
        h("span", null, ["검색어·필터를 조정하거나 초기화하세요."]),
        selectedFilterCount() > 0
          ? (function () {
              var b = h("button", { "class": "sib-filter__reset", type: "button" }, ["필터 초기화"]);
              b.addEventListener("click", resetFilters);
              return b;
            })()
          : null
      ]));
      return;
    }
    // 선택 티켓이 현재 목록에 없으면 roving tabindex 는 첫 행에 둔다.
    var selectedVisible = list.some(function (t) { return t.id === state.selectedId; });
    ul.setAttribute("aria-activedescendant", (selectedVisible && state.selectedId) ? optionIdOf(state.selectedId) : optionIdOf(list[0].id));
    list.forEach(function (t, idx) {
      var selected = t.id === state.selectedId;
      var rove = selectedVisible ? selected : idx === 0;
      var li = h("li", {
        "class": "sib-list__item", id: optionIdOf(t.id), role: "option",
        "aria-selected": selected ? "true" : "false", tabindex: rove ? "0" : "-1"
      }, [
        h("div", { "class": "sib-list__top" }, [
          h("span", { "class": "sib-list__id" }, [t.id]),
          priorityBadge(t.priority)
        ]),
        h("div", { "class": "sib-list__subject" }, [t.subject]),
        h("div", { "class": "sib-list__meta" }, [
          statusBadge(t.status),
          assigneeChip(t.assignee),
          h("span", { "class": "sib-time" }, [formatAt(t.updatedAt)])
        ])
      ]);
      li.addEventListener("click", function () { selectTicket(t.id, true); });
      li.addEventListener("keydown", onListKeydown);
      ul.appendChild(li);
    });
  }

  function onListKeydown(ev) {
    var ids = visibleTickets().map(function (t) { return t.id; });
    var curId = this.id.replace("opt-", "INQ-");
    var idx = ids.indexOf(curId);
    var nextIdx = idx;
    if (ev.key === "ArrowDown") nextIdx = Math.min(idx + 1, ids.length - 1);
    else if (ev.key === "ArrowUp") nextIdx = Math.max(idx - 1, 0);
    else if (ev.key === "Home") nextIdx = 0;
    else if (ev.key === "End") nextIdx = ids.length - 1;
    else if (ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar") {
      ev.preventDefault(); selectTicket(curId, true); return;
    } else { return; }
    ev.preventDefault();
    if (nextIdx < 0 || nextIdx >= ids.length) return;
    var targetId = ids[nextIdx];
    var cur = byId(optionIdOf(curId)); if (cur) cur.setAttribute("tabindex", "-1");
    var target = byId(optionIdOf(targetId));
    if (target) { target.setAttribute("tabindex", "0"); target.focus(); }
    byId("sib-list").setAttribute("aria-activedescendant", optionIdOf(targetId));
  }

  /* ── 선택 ── */
  function selectTicket(id, moveFocus) {
    state.selectedId = id;
    renderList();
    renderDetail();
    var t = findTicket(id);
    if (t) announce("INQ 상세를 표시했습니다. " + t.id + " " + t.subject + ", 상태 " + statusLabel(t.status) + ".");
    if (moveFocus) {
      var title = byId("sib-detail-title");
      if (title) title.focus();
    }
  }

  /* ── 렌더: 상세 + 상태 전환 + 이력 (§5.4/§5.6) ── */
  function renderDetail() {
    var host = byId("sib-detail");
    if (!host) return;
    host.textContent = "";
    var t = findTicket(state.selectedId);
    if (!t) {
      host.appendChild(emptyPlaceholder("왼쪽에서 문의를 선택하세요", "선택하면 상세·상태 전환·변경 이력이 표시됩니다."));
      return;
    }

    var head = h("div", { "class": "sib-detail__head" }, [
      h("span", { "class": "sib-detail__id" }, [t.id]),
      h("h2", { "class": "sib-detail__title", id: "sib-detail-title", tabindex: "-1" }, [t.subject]),
      h("div", { "class": "sib-detail__row" }, [
        priorityBadge(t.priority),
        statusBadge(t.status),
        detailAssignee(t.assignee)
      ])
    ]);
    host.appendChild(head);

    // 전환 후 대상이 현재 필터/검색 결과를 벗어난 경우 안내(EC-11)
    var inView = visibleTickets().some(function (x) { return x.id === t.id; });
    if (!inView) {
      host.appendChild(h("p", { "class": "sib-out-of-view", role: "note" }, [
        "이 문의는 현재 검색·필터 결과에 없습니다(상태 전환으로 조건을 벗어남)."
      ]));
    }

    // 요청자 카드
    host.appendChild(h("section", { "class": "sib-card", "aria-label": "요청자" }, [
      h("span", { "class": "sib-card__label" }, ["요청자"]),
      h("dl", { "class": "sib-field" }, [
        h("dt", null, ["이름"]), h("dd", null, [t.requester.name]),
        h("dt", null, ["이메일"]), h("dd", { "class": "sib-mono" }, [t.requester.email]),
        h("dt", null, ["접수시각"]), h("dd", null, [formatAt(t.createdAt)]),
        h("dt", null, ["최근 변경"]), h("dd", null, [formatAt(t.updatedAt)])
      ])
    ]));

    host.appendChild(renderTransitionCard(t));
    host.appendChild(renderHistoryCard(t));
  }

  function detailAssignee(assignee) {
    if (!assignee) return assigneeChip(null);
    return h("span", { "class": "sib-assignee" }, [
      h("span", { "class": "sib-avatar", "aria-hidden": "true" }, [assignee.name.charAt(0)]),
      assignee.name + " ",
      h("span", { "class": "sib-mono", style: "color:var(--sib-color-text-muted)" }, ["(" + assignee.id + ")"])
    ]);
  }

  /* ── 렌더: 상태 전이 카드 (§5.4) — 배정 컨트롤 없음(§6.3) ── */
  function renderTransitionCard(t) {
    var transitions = getAllowedTransitions(t);
    var actions = h("div", { "class": "sib-actions" }, transitions.map(function (tr, i) {
      var btn = h("button", {
        "class": "sib-btn sib-btn--transition" + (i === 0 && tr.enabled ? " sib-btn--primary" : ""),
        type: "button", disabled: !tr.enabled,
        title: tr.reason || (statusLabel(t.status) + " → " + statusLabel(tr.to))
      }, [tr.label + " (→ " + statusLabel(tr.to) + ")"]);
      if (tr.enabled) {
        btn.addEventListener("click", function () { doTransition(t.id, tr.to); });
      }
      return btn;
    }));

    var children = [
      h("span", { "class": "sib-card__label" }, ["상태 전환"]),
      h("p", { style: "margin:0;font-size:12px;color:var(--sib-color-text-muted)" }, [
        "현재 ", h("strong", null, [statusLabel(t.status)]), " — 허용된 전이만 활성화됩니다."
      ]),
      actions
    ];
    var disabledReason = null;
    transitions.forEach(function (tr) { if (!tr.enabled && tr.reason) disabledReason = tr.reason; });
    if (disabledReason) {
      children.push(h("p", { "class": "sib-guard-note", role: "note" }, [
        h("span", { "aria-hidden": "true" }, ["ⓘ"]), " " + disabledReason
      ]));
    }
    children.push(h("label", { "class": "sib-note-label" }, [
      h("span", { style: "font-size:12px;color:var(--sib-color-text-muted);font-weight:600" }, ["메모 (선택 — 보류/재오픈 사유 등)"]),
      h("textarea", { "class": "sib-note-input", id: "sib-note", "aria-label": "전환 메모(선택)" }, [])
    ]));
    return h("section", { "class": "sib-card", "aria-label": "상태 전환" }, children);
  }

  /* ── 렌더: 이력 타임라인 (§5.6) — 오래된 순, 재정렬 금지 ── */
  function renderHistoryCard(t) {
    var children = [h("span", { "class": "sib-card__label" }, ["변경 이력"])];
    if (t.history.length === 0) {
      children.push(emptyPlaceholder("아직 변경 이력이 없습니다", "상태를 변경하면 여기에 기록됩니다."));
      return h("section", { "class": "sib-card", "aria-label": "변경 이력" }, children);
    }
    var ol = h("ol", { "class": "sib-timeline" }, t.history.map(function (e) {
      var nodeClass = e.type === "STATUS_CHANGED"
        ? "sib-timeline__node--status_" + e.to
        : "sib-timeline__node--assignee";
      var typeLabel = e.type === "STATUS_CHANGED" ? "STATUS CHANGED" : "ASSIGNEE CHANGED";
      var fromTxt = e.type === "STATUS_CHANGED" ? statusLabel(e.from) : (e.from || "미배정");
      var toTxt = e.type === "STATUS_CHANGED" ? statusLabel(e.to) : (e.to || "미배정");
      var kids = [
        h("span", { "class": "sib-timeline__node " + nodeClass, "aria-hidden": "true" }, []),
        h("div", { "class": "sib-timeline__type" }, [typeLabel]),
        h("div", { "class": "sib-timeline__change" }, [fromTxt + " ", h("span", { "class": "sib-timeline__arrow" }, ["→"]), " " + toTxt]),
        h("div", { "class": "sib-timeline__meta" }, [e.actor.name + " · " + formatAt(e.at)])
      ];
      if (e.note) kids.push(h("div", { "class": "sib-timeline__note" }, [e.note]));
      return h("li", { "class": "sib-timeline__item" }, kids);
    }));
    children.push(ol);
    return h("section", { "class": "sib-card", "aria-label": "변경 이력" }, children);
  }

  function emptyPlaceholder(title, sub) {
    return h("div", { "class": "sib-empty" }, [
      h("strong", { "class": "sib-empty__title" }, [title]),
      h("span", null, [sub])
    ]);
  }

  /* ── 상태 조작 (검색/필터/전환) → 재렌더 ── */

  function setQuery(q) {
    state.query = q;
    renderList();
    renderToolbarFoot();
    renderDetail(); // EC-11 안내 갱신
  }

  function toggleFilter(category, value) {
    var arr = state.filters[category];
    var i = arr.indexOf(value);
    if (i === -1) arr.push(value); else arr.splice(i, 1);
    renderFilters();
    renderList();
    renderToolbarFoot();
    renderDetail();
  }

  function resetFilters() {
    state.filters = { status: [], priority: [], assignee: [] };
    renderFilters();
    renderList();
    renderToolbarFoot();
    renderDetail();
  }

  function currentActor(t) {
    return t.assignee ? { id: t.assignee.id, name: t.assignee.name } : (state.tickets.length && Fixtures && Fixtures.AGENTS ? Fixtures.AGENTS[0] : { id: "agt-01", name: "박운영" });
  }

  function replaceTicket(next) {
    state.tickets = state.tickets.map(function (t) { return t.id === next.id ? next : t; });
  }

  function doTransition(id, to) {
    var t = findTicket(id);
    if (!t) return;
    var noteEl = byId("sib-note");
    var res = transition(t, to, {
      actor: currentActor(t), at: nowIsoKst(),
      note: noteEl ? noteEl.value : null, eventId: nextEventId(state.tickets)
    });
    if (!res.ok) { announce("전환 거부: " + res.error); return; }
    if (res.noop) return;
    replaceTicket(res.inquiry);
    renderSummary();
    renderList();
    renderToolbarFoot();
    renderDetail();
    announce(t.id + " 상태를 " + statusLabel(to) + "(으)로 변경했습니다.");
  }

  /* ── 초기화 ── */
  function init() {
    if (typeof document === "undefined") return;
    state.tickets = Fixtures ? Fixtures.getFixtureTickets() : [];
    state.query = "";
    state.filters = { status: [], priority: [], assignee: [] };
    var first = visibleTickets();
    state.selectedId = first.length ? first[0].id : null;

    // 검색 입력 와이어링
    var search = byId("sib-search");
    if (search) {
      search.value = "";
      search.addEventListener("input", function () { setQuery(search.value); });
      search.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") { search.value = ""; setQuery(""); }
      });
    }
    var clear = byId("sib-search-clear");
    if (clear) {
      clear.addEventListener("click", function () {
        if (search) search.value = "";
        setQuery("");
        if (search) search.focus();
      });
    }
    var reset = byId("sib-reset");
    if (reset) reset.addEventListener("click", resetFilters);

    renderSummary();
    renderFilters();
    renderList();
    renderToolbarFoot();
    renderDetail();
  }

  return {
    // 상수/라벨
    STATUS_LABEL: STATUS_LABEL,
    PRIORITY_LABEL: PRIORITY_LABEL,
    PRIORITY_RANK: PRIORITY_RANK,
    FILTER_GROUPS: FILTER_GROUPS,
    statusLabel: statusLabel,
    priorityLabel: priorityLabel,
    priorityRank: priorityRank,
    // 순수 파이프라인
    sortTickets: sortTickets,
    searchTickets: searchTickets,
    matchesFilters: matchesFilters,
    filterTickets: filterTickets,
    buildList: buildList,
    // 전이/가드/집계
    getAllowedTransitions: getAllowedTransitions,
    transition: transition,
    nextEventId: nextEventId,
    summarize: summarize,
    formatAt: formatAt,
    // 브라우저 진입점
    init: init
  };
});
