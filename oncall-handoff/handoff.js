/* 온콜 인수인계 현황 — 파생 로직 + 렌더 (BF-1140)
 * UMD 패턴: 브라우저 globalThis.OncallHandoff / Node module.exports
 * vanilla-static: fetch/import/export/setInterval/외부 URL 0건 — file:// 직접 실행 호환.
 *
 * 설계: 파생 로직(computePosture/sortBySeverity/countUnacknowledged/resolveNextOwner/
 *   selectFixtureName/formatTime)은 DOM 무의존 순수 함수로 분리되어 렌더와 독립 검증 가능(AC-2).
 *   렌더 함수는 파생 결과를 받아 §5 클래스명으로 DOM 을 구성하고, JS 는 data-view-state/
 *   data-posture 속성만 세팅(상태 시각 전환은 CSS 담당).
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api; // Node 단위 테스트 — 순수 함수만 사용
  }
  if (root) {
    root.OncallHandoff = api; // 브라우저 전역
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { api.init(); });
      } else {
        api.init();
      }
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var POSTURE_META = {
    healthy: { mod: "ok", glyph: "✓", label: "정상", aria: "정상" },
    degraded: { mod: "degr", glyph: "▲", label: "저하", aria: "저하" },
    outage: { mod: "out", glyph: "●", label: "장애", aria: "장애" },
    empty: { mod: "empty", glyph: "—", label: "인계 데이터 없음", aria: "인계 데이터 없음" }
  };

  var SEVERITY_META = {
    1: { code: "SEV1", label: "치명" },
    2: { code: "SEV2", label: "높음" },
    3: { code: "SEV3", label: "보통" }
  };

  // ===================== 파생 로직 (순수 함수, DOM 무의존) =====================

  function isActiveSchedule(schedule) {
    return !!(schedule && schedule.outgoing && schedule.incoming);
  }

  // posture 파생(§6 표): 담당자 미배정 → empty / 활성 SEV1|SEV2 → outage /
  //   SEV3 만 → degraded / 활성 0건이나 인계 존재 → healthy
  function computePosture(data) {
    if (!data || !isActiveSchedule(data.schedule)) return "empty";
    var incidents = Array.isArray(data.incidents) ? data.incidents : [];
    var hasCritical = incidents.some(function (i) {
      return i && (i.severity === 1 || i.severity === 2);
    });
    if (hasCritical) return "outage";
    var hasSev3 = incidents.some(function (i) { return i && i.severity === 3; });
    if (hasSev3) return "degraded";
    return "healthy";
  }

  // severity 내림차순(SEV1 최상단). 동일 severity 는 원본 순서 유지(안정 정렬).
  function sortBySeverity(incidents) {
    var list = Array.isArray(incidents) ? incidents.slice() : [];
    return list
      .map(function (item, index) { return { item: item, index: index }; })
      .sort(function (a, b) {
        var d = (a.item.severity || 0) - (b.item.severity || 0);
        return d !== 0 ? d : a.index - b.index;
      })
      .map(function (w) { return w.item; });
  }

  // 미확인 인계(다음 담당자 ack === false) 건수
  function countUnacknowledged(incidents) {
    return (Array.isArray(incidents) ? incidents : []).filter(function (i) {
      return i && i.nextOwner && i.nextOwner.ack === false;
    }).length;
  }

  // 다음 담당자 계산: 인시던트 지정 담당자 우선, 없으면 다음 당직(incoming) 상속
  function resolveNextOwner(incident, schedule) {
    if (incident && incident.nextOwner) return incident.nextOwner;
    if (schedule && schedule.incoming) {
      return { name: schedule.incoming.name, handle: schedule.incoming.handle, ack: false };
    }
    return null;
  }

  // 표시할 fixture 선택: 유효한 state 파라미터 우선, 기본값 outage
  function selectFixtureName(requested, available) {
    var names = Array.isArray(available) ? available : [];
    if (requested && names.indexOf(requested) !== -1) return requested;
    if (names.indexOf("outage") !== -1) return "outage";
    return names.length ? names[0] : null;
  }

  // ISO(YYYY-MM-DDTHH:MM) → HH:MM
  function formatTime(iso) {
    var m = /T(\d{2}:\d{2})/.exec(iso || "");
    return m ? m[1] : "";
  }

  function postureMeta(posture) { return POSTURE_META[posture] || POSTURE_META.empty; }
  function severityMeta(sev) { return SEVERITY_META[sev] || SEVERITY_META[3]; }

  function subLabel(posture, data) {
    var incidents = data && Array.isArray(data.incidents) ? data.incidents : [];
    if (posture === "outage") {
      return "활성 인시던트 " + incidents.length + "건 · 미확인 인계 " + countUnacknowledged(incidents) + "건";
    }
    if (posture === "degraded") {
      return "모니터링 인시던트 " + incidents.length + "건 · 즉시 조치 불필요";
    }
    if (posture === "healthy") {
      return "인계할 활성 장애 없음 · 주의 노트 " + ((data && data.notes) || []).length + "건";
    }
    return "현재 교대 스케줄에 등록된 온콜 담당자가 없습니다";
  }

  // ===================== DOM 렌더 (브라우저 전용) =====================

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    }
    if (children != null) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function renderWatch(role, person, incoming) {
    var w = el("div", { "class": "oh-watch" + (incoming ? " oh-watch--incoming" : "") });
    w.appendChild(el("span", { "class": "oh-watch__role" }, role));
    w.appendChild(el("span", { "class": "oh-watch__name" }, person.name));
    w.appendChild(el("span", { "class": "oh-watch__handle" }, person.handle));
    return w;
  }

  function renderTrack(schedule) {
    var track = el("div", { "class": "oh-relay__track" });
    track.appendChild(renderWatch("나가는 당직", schedule.outgoing, false));
    var baton = el("div", { "class": "oh-baton", "aria-hidden": "true" });
    baton.appendChild(el("span", { "class": "oh-baton__label" }, "인계"));
    baton.appendChild(el("span", { "class": "oh-baton__line" }));
    track.appendChild(baton);
    track.appendChild(renderWatch("다음 당직", schedule.incoming, true));
    return track;
  }

  function renderPostureBanner(meta, sub) {
    var banner = el("div", {
      "class": "oh-posture oh-posture--" + meta.mod,
      "role": "status",
      "aria-label": "전체 근무 상태: " + meta.aria
    });
    banner.appendChild(el("span", { "class": "oh-posture__glyph", "aria-hidden": "true" }, meta.glyph));
    banner.appendChild(el("span", { "class": "oh-posture__label" }, meta.label));
    if (sub) banner.appendChild(el("span", { "class": "oh-posture__sub" }, sub));
    return banner;
  }

  function renderRelay(data, posture) {
    var meta = postureMeta(posture);
    var relay = el("div", { "class": "oh-relay" });
    relay.style.setProperty("--oh-posture", "var(--oh-" + meta.mod + "-fg)");
    if (posture !== "empty" && isActiveSchedule(data.schedule)) {
      relay.appendChild(renderTrack(data.schedule));
    }
    relay.appendChild(renderPostureBanner(meta, subLabel(posture, data)));
    return relay;
  }

  function renderSevBadge(sev) {
    var meta = severityMeta(sev);
    var badge = el("span", {
      "class": "oh-sev oh-sev--" + sev,
      "role": "img",
      "aria-label": "심각도 SEV" + sev + " " + meta.label
    });
    badge.appendChild(el("span", { "class": "oh-sev__code", "aria-hidden": "true" }, meta.code));
    badge.appendChild(el("span", {}, meta.label));
    return badge;
  }

  function renderChips(services) {
    var wrap = el("div", { "class": "oh-chips" });
    (services || []).forEach(function (s) {
      var cls = "oh-chip";
      if (s.status === "degraded") cls += " oh-chip--degr";
      else if (s.status === "ok") cls += " oh-chip--ok";
      var suffix = s.status === "degraded" ? "(저하)" : s.status === "ok" ? "(정상)" : "";
      var chip = el("span", { "class": cls });
      chip.appendChild(el("span", { "class": "oh-chip__dot", "aria-hidden": "true" }));
      chip.appendChild(document.createTextNode(s.name + suffix));
      wrap.appendChild(chip);
    });
    return wrap;
  }

  function renderActionLog(lastAction) {
    var span = el("span", { "class": "oh-action-log" });
    span.appendChild(el("time", { "datetime": lastAction.at }, formatTime(lastAction.at)));
    span.appendChild(el("span", {}, lastAction.text));
    return span;
  }

  function renderOwner(owner) {
    var span = el("span", { "class": "oh-owner" });
    span.appendChild(el("span", {}, owner.name));
    span.appendChild(el("span", { "class": "oh-owner__handle" }, owner.handle));
    var ackCls = "oh-owner__ack " + (owner.ack ? "oh-owner__ack--done" : "oh-owner__ack--pending");
    span.appendChild(el("span", { "class": ackCls }, owner.ack ? "인계 확인됨" : "인계 확인 대기"));
    return span;
  }

  function renderButton(action) {
    var cls = "oh-btn";
    if (action.variant === "primary") cls += " oh-btn--primary";
    else if (action.variant === "danger") cls += " oh-btn--danger";
    var btn = el("button", { "type": "button", "class": cls });
    if (action.glyph) {
      btn.appendChild(el("span", { "class": "oh-btn__glyph", "aria-hidden": "true" }, action.glyph));
    }
    btn.appendChild(document.createTextNode(action.label));
    return btn;
  }

  function renderField(key, valueNode) {
    var f = el("div", { "class": "oh-field" });
    f.appendChild(el("dt", { "class": "oh-field__k" }, key));
    var dd = el("dd", { "class": "oh-field__v" });
    dd.appendChild(valueNode);
    f.appendChild(dd);
    return f;
  }

  function renderCard(incident, schedule) {
    var li = el("li", {
      "class": "oh-card oh-card--sev" + incident.severity,
      "id": "handoff-" + incident.id
    });
    var head = el("div", { "class": "oh-card__head" });
    head.appendChild(el("h3", { "class": "oh-card__title" }, incident.title));
    head.appendChild(renderSevBadge(incident.severity));
    li.appendChild(head);

    var dl = el("dl", { "class": "oh-fields" });
    dl.appendChild(renderField("영향 서비스", renderChips(incident.services)));
    dl.appendChild(renderField("마지막 조치", renderActionLog(incident.lastAction)));
    dl.appendChild(renderField("다음 담당자", renderOwner(resolveNextOwner(incident, schedule))));
    li.appendChild(dl);

    if (incident.actions && incident.actions.length) {
      var actions = el("div", { "class": "oh-actions" });
      incident.actions.forEach(function (a) { actions.appendChild(renderButton(a)); });
      li.appendChild(actions);
    }
    return li;
  }

  function renderList(data) {
    var ul = el("ul", { "class": "oh-list" });
    sortBySeverity(data.incidents).forEach(function (inc) {
      ul.appendChild(renderCard(inc, data.schedule));
    });
    return ul;
  }

  function renderClear(data) {
    var wrap = el("div", { "class": "oh-list" });
    var box = el("div", { "class": "oh-clear" });
    var title = el("h3", { "class": "oh-clear__title" });
    title.appendChild(el("span", { "class": "oh-clear__glyph", "aria-hidden": "true" }, "✓"));
    title.appendChild(document.createTextNode("인계할 활성 장애가 없습니다"));
    box.appendChild(title);
    box.appendChild(el("p", { "class": "oh-clear__lead" }, "다음 당직이 참고할 주의 노트만 전달합니다."));
    if (data.notes && data.notes.length) {
      var notes = el("ul", { "class": "oh-notes" });
      data.notes.forEach(function (n) { notes.appendChild(el("li", {}, n)); });
      box.appendChild(notes);
    }
    if (data.clearActions && data.clearActions.length) {
      var actions = el("div", { "class": "oh-actions" });
      data.clearActions.forEach(function (a) { actions.appendChild(renderButton(a)); });
      box.appendChild(actions);
    }
    wrap.appendChild(box);
    return wrap;
  }

  function renderEmpty() {
    var wrap = el("div", { "class": "oh-empty" });
    wrap.appendChild(el("span", { "class": "oh-empty__mark", "aria-hidden": "true" }, "—"));
    wrap.appendChild(el("p", { "class": "oh-empty__title" }, "표시할 인수인계가 없습니다"));
    wrap.appendChild(el("p", { "class": "oh-empty__sub" }, "교대 스케줄에 온콜 담당자가 배정되면 이 화면에 인계 현황이 나타납니다."));
    var actions = el("div", { "class": "oh-actions oh-actions--center" });
    actions.appendChild(renderButton({ label: "온콜 스케줄 열기", variant: "primary", glyph: "＋" }));
    wrap.appendChild(actions);
    return wrap;
  }

  function renderError(mount) {
    clear(mount);
    var frame = el("section", { "class": "oh-frame", "aria-label": "온콜 인수인계 — 로드 실패" });
    var err = el("div", { "class": "oh-error", "role": "alert" });
    err.appendChild(el("span", { "class": "oh-error__glyph", "aria-hidden": "true" }, "⚠"));
    err.appendChild(el("span", {}, "인수인계 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요."));
    frame.appendChild(err);
    mount.appendChild(frame);
  }

  function renderView(main, mount, data) {
    clear(mount);
    var posture = computePosture(data);
    main.setAttribute("data-posture", posture);
    var frame = el("section", { "class": "oh-frame", "aria-label": "온콜 인수인계 스냅샷" });
    frame.appendChild(renderRelay(data, posture));
    if (posture === "empty") {
      frame.appendChild(renderEmpty());
      mount.appendChild(frame);
      setState(main, "empty");
      return;
    }
    if (posture === "healthy") {
      frame.appendChild(renderClear(data));
    } else {
      frame.appendChild(renderList(data));
    }
    mount.appendChild(frame);
    setState(main, "ready");
  }

  function setState(main, state) {
    main.setAttribute("data-view-state", state);
  }

  function readRequestedState() {
    try {
      if (typeof location !== "undefined" && location.search) {
        var m = /[?&]state=([^&]+)/.exec(location.search);
        if (m) return decodeURIComponent(m[1]);
      }
    } catch (e) { /* file:// 등에서 location 접근 실패 시 기본값 */ }
    return null;
  }

  function currentFixtures() {
    var g = typeof globalThis !== "undefined" ? globalThis
      : typeof window !== "undefined" ? window : null;
    return g && g.OncallFixtures ? g.OncallFixtures : null;
  }

  function init() {
    if (typeof document === "undefined") return;
    var main = document.getElementById("oncall-handoff");
    if (!main) return;
    var mount = main.querySelector(".oh-mount");
    if (!mount) return;

    var store = currentFixtures();
    if (!store || !store.FIXTURES) {
      setState(main, "error");
      renderError(mount);
      return;
    }

    var requested = readRequestedState();
    if (requested === "loading") { setState(main, "loading"); return; }
    if (requested === "error") { setState(main, "error"); renderError(mount); return; }

    var name = selectFixtureName(requested, Object.keys(store.FIXTURES));
    var data = name ? store.FIXTURES[name] : null;
    if (!data) { setState(main, "error"); renderError(mount); return; }

    try {
      renderView(main, mount, data);
    } catch (e) {
      setState(main, "error");
      renderError(mount);
    }
  }

  return {
    // 파생 로직(순수)
    computePosture: computePosture,
    sortBySeverity: sortBySeverity,
    countUnacknowledged: countUnacknowledged,
    resolveNextOwner: resolveNextOwner,
    selectFixtureName: selectFixtureName,
    formatTime: formatTime,
    subLabel: subLabel,
    postureMeta: postureMeta,
    severityMeta: severityMeta,
    // 부트
    init: init
  };
});
