/* support-inbox-canary/inbox.js — 고객지원 인박스 도메인 로직(전이·가드·배정·이력) + DOM 렌더/와이어링
 * BF-1007 · 기획 docs/planning/support-inbox-canary-BF-1000.md §4/§5/§6 · 시안 docs/design/support-inbox-canary-BF-1000.md §5/§6/§7
 * UMD 패턴 (incident-triage 관례 계승) — 브라우저: globalThis.SupportInbox + DOMContentLoaded init / Node: module.exports(순수 함수)
 * file:// CORS 안전 — 외부 CDN·fetch·import/export·네트워크 0건. seed 는 Date.now()/Math.random() 미사용(fixtures.js).
 */
(function (root, factory) {
  "use strict";
  var isNode = typeof module === "object" && module && module.exports;
  var deps = isNode
    ? { Fixtures: require("./fixtures.js"), Storage: require("./storage.js") }
    : { Fixtures: root && root.SupportInboxFixtures, Storage: root && root.SupportInboxStorage };
  var api = factory(deps);
  if (isNode) {
    module.exports = api;
  }
  if (root) {
    root.SupportInbox = api;
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
  var Storage = deps.Storage;

  /* ─── 상수 (기획 §4 그대로 — 규칙 재해석 금지) ─── */

  var STATUS_LABEL = { received: "접수", in_progress: "진행", on_hold: "보류", resolved: "해결" };

  /* §4.2 전이표 → §5.4 시안 버튼 정의. 각 상태에서 노출할 버튼(비활성 포함, DOM 유지).
   * guard: null=무조건 허용 · "G1"/"G3"=담당자 필요 · "G4"=금지(항상 비활성) · "G5"=재오픈 허용 */
  var TRANSITION_BUTTONS = {
    received:    [{ to: "in_progress", label: "진행 시작", guard: "G1" }],
    in_progress: [{ to: "on_hold", label: "보류", guard: null }, { to: "resolved", label: "해결", guard: "G3" }],
    on_hold:     [{ to: "in_progress", label: "재개", guard: null }, { to: "resolved", label: "해결", guard: "G4" }],
    resolved:    [{ to: "in_progress", label: "재오픈", guard: "G5" }]
  };

  function statusLabel(status) { return STATUS_LABEL[status] || status; }

  /* ─── 순수 함수: 허용 전이 계산 (기획 §4.3 가드 · 시안 §5.4) ─── */

  /**
   * 현재 상태에서 노출할 전이 버튼 목록을 반환한다(비활성 버튼도 포함 — 오조작 방지 UX).
   * @param {object} inquiry
   * @returns {Array<{to:string,label:string,enabled:boolean,reason:(string|null)}>}
   */
  function getAllowedTransitions(inquiry) {
    var defs = TRANSITION_BUTTONS[inquiry.status] || [];
    return defs.map(function (def) {
      var enabled = true, reason = null;
      if (def.guard === "G4") {
        enabled = false; reason = "G4: 보류→해결 직접 전이 금지 — 진행으로 재개 후 처리하세요";
      } else if ((def.guard === "G1" || def.guard === "G3") && inquiry.assignee == null) {
        enabled = false; reason = "담당자 미배정 — 먼저 담당자를 배정하세요(" + def.guard + ")";
      }
      return { to: def.to, label: def.label, enabled: enabled, reason: reason };
    });
  }

  /* ─── 순수 함수: 이벤트 ID 생성 (기획 §6.1 EVT-######) ─── */

  /** 전체 tickets 의 history 를 스캔해 다음 EVT-###### ID 를 결정론적으로 생성한다. */
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

  function assigneeName(assignee) { return assignee ? assignee.name : null; }

  /* ─── 순수 함수: 상태 전이 (기획 §4.2 전이표 + §4.3 가드) ─── */

  /**
   * 상태 전이를 시도한다. 가드 위반은 {ok:false,error}, 동일 상태는 no-op(EC-01).
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

  /* ─── 순수 함수: 담당자 해제/재배정 가부 (기획 §5 · EC-10/EC-11) ─── */

  function canReleaseAssignee(inquiry) {
    return inquiry.status === "received"; // EC-10 — received 에서만 해제 가능
  }
  function canReassign(inquiry) {
    return inquiry.status !== "resolved"; // EC-11 — resolved 는 재오픈 후에만
  }

  /**
   * 담당자 배정/재배정/해제를 시도한다.
   * @param {object} inquiry
   * @param {{id:string,name:string}|null} newAssignee null=해제
   * @param {{actor:object, at:string, note?:(string|null), eventId:string}} opts
   * @returns {{ok:boolean, inquiry?:object, error?:string, noop?:boolean}}
   */
  function changeAssignee(inquiry, newAssignee, opts) {
    var curId = inquiry.assignee ? inquiry.assignee.id : null;
    var newId = newAssignee ? newAssignee.id : null;
    if (curId === newId) {
      return { ok: true, inquiry: inquiry, noop: true }; // 동일 담당자 → no-op
    }
    if (newAssignee === null) {
      if (!canReleaseAssignee(inquiry)) {
        return { ok: false, error: statusLabel(inquiry.status) + " 상태는 담당자를 해제할 수 없습니다(접수 상태에서만 가능)" };
      }
    } else {
      if (!canReassign(inquiry)) {
        return { ok: false, error: "해결된 문의는 재배정할 수 없습니다 — 재오픈 후 가능(EC-11)" };
      }
    }
    var event = {
      id: opts.eventId, ticketId: inquiry.id, type: "ASSIGNEE_CHANGED", at: opts.at,
      actor: { id: opts.actor.id, name: opts.actor.name },
      from: assigneeName(inquiry.assignee), to: assigneeName(newAssignee),
      note: opts.note != null && opts.note !== "" ? opts.note : null
    };
    var next = cloneInquiry(inquiry);
    next.assignee = newAssignee ? { id: newAssignee.id, name: newAssignee.name } : null;
    next.updatedAt = opts.at;
    next.history = inquiry.history.concat([event]);
    return { ok: true, inquiry: next };
  }

  /* ─── 순수 함수: 집계 요약 (시안 §4.2 헤더) ─── */

  function summarize(tickets) {
    var summary = { total: tickets.length, unassigned: 0, in_progress: 0, on_hold: 0, resolved: 0, received: 0 };
    tickets.forEach(function (t) {
      if (t.assignee == null) summary.unassigned++;
      if (Object.prototype.hasOwnProperty.call(summary, t.status)) summary[t.status]++;
    });
    return summary;
  }

  /* ─── 순수 함수: 시각 포맷 (incident-triage/history.js 관례 — Date 객체 미사용, 타임존 결정성) ─── */

  var AT_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?(?:\.\d+)?([+-]\d{2}:\d{2}|Z)?/;
  function formatAt(iso) {
    if (typeof iso !== "string") return "";
    var m = AT_RE.exec(iso);
    if (!m) return iso;
    var offset = m[3] && m[3] !== "Z" ? " (" + m[3] + ")" : (m[3] === "Z" ? " (UTC)" : "");
    return m[1] + " " + m[2] + offset;
  }

  function cloneInquiry(t) {
    return {
      id: t.id, subject: t.subject,
      requester: { name: t.requester.name, email: t.requester.email },
      status: t.status,
      assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name } : null,
      createdAt: t.createdAt, updatedAt: t.updatedAt,
      history: t.history.slice()
    };
  }

  /* ─── 런타임 시각 (브라우저 전용 — seed 아님, KST 벽시계 +09:00) ─── */
  function nowIsoKst() {
    var d = new Date();
    return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().replace("Z", "+09:00");
  }

  /* ================================================================
   *  DOM 렌더링 / 와이어링 (브라우저 전용 — Node 단위 테스트에서는 미실행)
   * ================================================================ */

  var state = { tickets: [], selectedId: null, store: null, agents: [] };

  function optionIdOf(ticketId) { return "opt-" + ticketId.replace("INQ-", ""); }
  function byId(id) { return document.getElementById(id); }

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

  function badge(status) {
    return h("span", { "class": "sib-badge sib-badge--" + status }, [
      h("span", { "class": "sib-badge__dot", "aria-hidden": "true" }),
      statusLabel(status)
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

  /* ── 렌더: 헤더 집계 ── */
  function renderSummary() {
    var s = summarize(state.tickets);
    var host = byId("sib-summary");
    if (!host) return;
    host.textContent = "";
    [["총", s.total], ["미배정", s.unassigned], ["진행", s.in_progress], ["보류", s.on_hold]].forEach(function (pair) {
      host.appendChild(h("span", { "class": "sib-stat" }, [pair[0] + " ", h("strong", null, [String(pair[1])])]));
    });
  }

  /* ── 렌더: 목록 ── */
  function renderList() {
    var ul = byId("sib-list");
    if (!ul) return;
    ul.textContent = "";
    ul.setAttribute("aria-activedescendant", state.selectedId ? optionIdOf(state.selectedId) : "");
    state.tickets.forEach(function (t) {
      var selected = t.id === state.selectedId;
      var li = h("li", {
        "class": "sib-list__item", id: optionIdOf(t.id), role: "option",
        "aria-selected": selected ? "true" : "false", tabindex: selected ? "0" : "-1"
      }, [
        h("div", { "class": "sib-list__top" }, [
          h("span", { "class": "sib-list__id" }, [t.id]),
          badge(t.status)
        ]),
        h("div", { "class": "sib-list__subject" }, [t.subject]),
        h("div", { "class": "sib-list__meta" }, [
          h("span", null, [t.requester.name]),
          assigneeChip(t.assignee)
        ])
      ]);
      li.addEventListener("click", function () { selectTicket(t.id, true); });
      li.addEventListener("keydown", onListKeydown);
      ul.appendChild(li);
    });
  }

  function onListKeydown(ev) {
    var ids = state.tickets.map(function (t) { return t.id; });
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
    var targetId = ids[nextIdx];
    // roving tabindex
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
    renderHistory();
    var t = findTicket(id);
    if (t) announce("INQ 상세를 표시했습니다. " + t.id + " " + t.subject + ", 상태 " + statusLabel(t.status) + ".");
    if (moveFocus) {
      var title = byId("sib-detail-title");
      if (title) title.focus();
    }
  }

  /* ── 렌더: 상세 ── */
  function renderDetail() {
    var host = byId("sib-detail");
    if (!host) return;
    host.textContent = "";
    var t = findTicket(state.selectedId);
    if (!t) {
      host.appendChild(emptyPlaceholder("왼쪽에서 문의를 선택하세요", "선택하면 상세와 변경 이력이 표시됩니다."));
      return;
    }

    // head
    var head = h("div", { "class": "sib-detail__head" }, [
      h("span", { "class": "sib-detail__id" }, [t.id]),
      h("h2", { "class": "sib-detail__title", id: "sib-detail-title", tabindex: "-1" }, [t.subject]),
      h("div", { "class": "sib-detail__row" }, [
        badge(t.status),
        detailAssignee(t.assignee)
      ])
    ]);

    // 문의 정보 카드
    var info = h("section", { "class": "sib-card", "aria-label": "문의 정보" }, [
      h("span", { "class": "sib-card__label" }, ["문의 정보"]),
      h("dl", { "class": "sib-field" }, [
        h("dt", null, ["요청자"]), h("dd", null, [t.requester.name]),
        h("dt", null, ["이메일"]), h("dd", { "class": "sib-mono" }, [t.requester.email]),
        h("dt", null, ["접수 시각"]), h("dd", null, [formatAt(t.createdAt)]),
        h("dt", null, ["최근 변경"]), h("dd", null, [formatAt(t.updatedAt)])
      ])
    ]);

    host.appendChild(head);
    host.appendChild(info);
    host.appendChild(renderTransitionCard(t));
    host.appendChild(renderAssigneeCard(t));
  }

  function detailAssignee(assignee) {
    if (!assignee) return assigneeChip(null);
    return h("span", { "class": "sib-assignee" }, [
      h("span", { "class": "sib-avatar", "aria-hidden": "true" }, [assignee.name.charAt(0)]),
      assignee.name + " ",
      h("span", { "class": "sib-mono", style: "color:var(--sib-color-text-muted)" }, ["(" + assignee.id + ")"])
    ]);
  }

  /* ── 렌더: 상태 전이 카드 (§5.4) ── */
  function renderTransitionCard(t) {
    var transitions = getAllowedTransitions(t);
    var actions = h("div", { "class": "sib-actions" }, transitions.map(function (tr, i) {
      var btn = h("button", {
        "class": "sib-btn" + (i === 0 && tr.enabled ? " sib-btn--primary" : ""),
        type: "button", disabled: !tr.enabled,
        title: tr.reason || (statusLabel(t.status) + " → " + statusLabel(tr.to))
      }, [tr.label + " (→ " + statusLabel(tr.to) + ")"]);
      if (tr.enabled) {
        btn.addEventListener("click", function () { doTransition(t.id, tr.to); });
      }
      return btn;
    }));

    var children = [
      h("span", { "class": "sib-card__label" }, ["상태 전이"]),
      h("p", { style: "margin:0;font-size:12px;color:var(--sib-color-text-muted)" }, [
        "현재 ", h("strong", null, [statusLabel(t.status)]), " — 허용된 전이만 활성화됩니다."
      ]),
      actions
    ];
    // 가드 사유 안내(비활성 전이가 있으면)
    var disabledReason = null;
    transitions.forEach(function (tr) { if (!tr.enabled && tr.reason) disabledReason = tr.reason; });
    if (disabledReason) {
      children.push(h("div", { "class": "sib-guard-note" }, [h("span", { "aria-hidden": "true" }, ["ⓘ"]), " " + disabledReason]));
    }
    // note 입력(선택 — 보류/해결/재오픈 시)
    children.push(h("label", { style: "display:grid;gap:4px" }, [
      h("span", { style: "font-size:12px;color:var(--sib-color-text-muted)" }, ["메모 (선택 — 보류/재오픈 사유 등)"]),
      h("textarea", { "class": "sib-note-input", id: "sib-note", "aria-label": "전이 메모(선택)" }, [])
    ]));
    return h("section", { "class": "sib-card", "aria-label": "상태 전이" }, children);
  }

  /* ── 렌더: 담당자 카드 (§5.5) ── */
  function renderAssigneeCard(t) {
    var select = h("select", { "class": "sib-select", "aria-label": "담당자 선택", id: "sib-assignee-select", disabled: !canReassign(t) });
    state.agents.forEach(function (a) {
      var opt = h("option", { value: a.id }, [a.name + " (" + a.id + ")"]);
      if (t.assignee && t.assignee.id === a.id) opt.setAttribute("selected", "");
      select.appendChild(opt);
    });
    if (canReassign(t)) {
      select.addEventListener("change", function () {
        var agent = findAgent(select.value);
        if (agent) doAssignee(t.id, agent);
      });
    }

    var releaseBtn = h("button", {
      "class": "sib-btn", type: "button", id: "sib-release-btn",
      disabled: !canReleaseAssignee(t) || t.assignee == null,
      title: canReleaseAssignee(t) ? "담당자 해제" : (statusLabel(t.status) + " 상태는 담당자를 해제할 수 없습니다(§5)")
    }, ["담당자 해제"]);
    if (canReleaseAssignee(t) && t.assignee != null) {
      releaseBtn.addEventListener("click", function () { doAssignee(t.id, null); });
    }

    var children = [
      h("span", { "class": "sib-card__label" }, ["담당자 배정"]),
      h("div", { "class": "sib-detail__row" }, [
        h("label", null, [
          h("span", { style: "font-size:12px;color:var(--sib-color-text-muted)" }, ["담당자 "]),
          select
        ]),
        releaseBtn
      ])
    ];
    if (!canReleaseAssignee(t)) {
      children.push(h("div", { "class": "sib-guard-note" }, [
        h("span", { "aria-hidden": "true" }, ["ⓘ"]),
        " 진행/보류/해결 상태는 담당자 해제 불가 — 접수 상태에서만 해제할 수 있습니다."
      ]));
    }
    return h("section", { "class": "sib-card", "aria-label": "담당자 배정" }, children);
  }

  function findAgent(id) {
    for (var i = 0; i < state.agents.length; i++) { if (state.agents[i].id === id) return state.agents[i]; }
    return null;
  }

  /* ── 렌더: 이력 타임라인 (§5.6) ── */
  function renderHistory() {
    var host = byId("sib-history");
    if (!host) return;
    host.textContent = "";
    var t = findTicket(state.selectedId);
    if (!t) {
      host.appendChild(emptyPlaceholder("왼쪽에서 문의를 선택하세요", "선택하면 변경 이력이 표시됩니다."));
      return;
    }
    if (t.history.length === 0) {
      host.appendChild(emptyPlaceholder("아직 변경 이력이 없습니다", "상태·담당자를 변경하면 여기에 기록됩니다."));
      return;
    }
    var ol = h("ol", { "class": "sib-timeline" }, t.history.map(function (e) {
      var nodeClass = e.type === "STATUS_CHANGED"
        ? "sib-timeline__node--status_" + e.to
        : "sib-timeline__node--assignee";
      var typeLabel = e.type === "STATUS_CHANGED" ? "Status Changed" : "Assignee Changed";
      var fromTxt = e.type === "STATUS_CHANGED" ? statusLabel(e.from) : (e.from || "미배정");
      var toTxt = e.type === "STATUS_CHANGED" ? statusLabel(e.to) : (e.to || "미배정");
      var kids = [
        h("span", { "class": "sib-timeline__node " + nodeClass, "aria-hidden": "true" }),
        h("div", { "class": "sib-timeline__type" }, [typeLabel]),
        h("div", { "class": "sib-timeline__change" }, [fromTxt + " ", h("span", { "class": "sib-timeline__arrow" }, ["→"]), " " + toTxt]),
        h("div", { "class": "sib-timeline__meta" }, [e.actor.name + " · " + formatAt(e.at)])
      ];
      if (e.note) kids.push(h("div", { "class": "sib-timeline__note" }, [e.note]));
      return h("li", { "class": "sib-timeline__item" }, kids);
    }));
    host.appendChild(ol);
  }

  function emptyPlaceholder(title, sub) {
    return h("div", { "class": "sib-empty" }, [h("strong", null, [title]), h("span", null, [sub])]);
  }

  /* ── 액션 실행 (전이/배정 → 저장 → 재렌더) ── */
  function currentActor(t) {
    return t.assignee ? { id: t.assignee.id, name: t.assignee.name } : (state.agents[0] || { id: "agt-01", name: "박운영" });
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
    if (!res.ok) { announce("전이 거부: " + res.error); return; }
    if (res.noop) return;
    replaceTicket(res.inquiry);
    persist();
    renderSummary(); renderList(); renderDetail(); renderHistory();
    announce(t.id + " 상태를 " + statusLabel(to) + "(으)로 변경했습니다.");
  }

  function doAssignee(id, agent) {
    var t = findTicket(id);
    if (!t) return;
    var res = changeAssignee(t, agent, {
      actor: agent || currentActor(t), at: nowIsoKst(),
      note: null, eventId: nextEventId(state.tickets)
    });
    if (!res.ok) { announce("배정 거부: " + res.error); return; }
    if (res.noop) return;
    replaceTicket(res.inquiry);
    persist();
    renderSummary(); renderList(); renderDetail(); renderHistory();
    announce(t.id + " 담당자를 " + (agent ? agent.name : "미배정") + "(으)로 변경했습니다.");
  }

  function persist() {
    if (state.store) state.store.save(state.tickets, nowIsoKst());
  }

  /* ── 초기화 (기획 §9.3) ── */
  function init() {
    if (typeof document === "undefined") return;
    state.agents = (Fixtures && Fixtures.AGENTS) ? Fixtures.AGENTS.slice() : [];
    state.store = Storage ? Storage.createStore() : null;
    var loaded = state.store ? state.store.load() : { tickets: Fixtures.getSeedTickets(), source: "seed", recovered: false };
    state.tickets = loaded.tickets;
    state.selectedId = state.tickets.length ? state.tickets[0].id : null;

    renderSummary();
    renderList();
    renderDetail();
    renderHistory();

    if (loaded.recovered) {
      announce("저장 데이터가 손상되어 기본 데이터로 안전하게 복구했습니다.");
    }
  }

  return {
    // 순수 함수 (Node 단위 테스트)
    STATUS_LABEL: STATUS_LABEL,
    statusLabel: statusLabel,
    getAllowedTransitions: getAllowedTransitions,
    transition: transition,
    canReleaseAssignee: canReleaseAssignee,
    canReassign: canReassign,
    changeAssignee: changeAssignee,
    nextEventId: nextEventId,
    summarize: summarize,
    formatAt: formatAt,
    // 브라우저 진입점
    init: init
  };
});
