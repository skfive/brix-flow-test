/* incident-command/command.js — Incident Command Center 순수 함수 + DOM 렌더링
 * BF-824 · 기획 docs/plan/incident-command-BF-821.md §9(순수 함수)·§10(DOM 계약)·§13(상태)
 *         · 시안 docs/design/incident-command-BF-821.md §6~§7
 * UMD 패턴 (기획 §9.6) — 브라우저: globalThis.IncidentCommand / Node: module.exports
 * file:// CORS 안전 — 네트워크 호출·브라우저 저장소·ESM 구문 0건 (기획 §16)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api; // Node 단위 테스트 — 순수 함수만 사용
  }
  if (root) {
    root.IncidentCommand = api; // 브라우저 전역
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", api.init);
      } else {
        api.init();
      }
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* ─────────────── 상수 (기획 §4 enum — 재해석 금지) ─────────────── */

  var SEVERITY_VALUES = ["P1", "P2", "P3", "P4"];
  var STATUS_VALUES = ["detected", "investigating", "mitigating", "monitoring", "resolved"];
  var EVENT_TYPE_VALUES = ["detected", "update", "escalated", "resolved"];
  var ID_PATTERN = /^INC-\d+$/;
  var ISO_KST_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/;

  var TEXT = {
    empty: "표시할 장애가 없습니다.",
    error: "장애 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요.",
    filterEmpty: "해당 심각도의 장애가 없습니다.",
    noSelection: "왼쪽 목록에서 장애를 선택하세요.",
    noChecklist: "해당 장애에 등록된 복구 체크리스트가 없습니다."
  };

  /* ─────────────── 순수 함수 (기획 §9) ─────────────── */

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function isKstIso(value) {
    return typeof value === "string" && ISO_KST_PATTERN.test(value);
  }

  /**
   * §9.1 — Incident 레코드 1건이 §5 스키마를 만족하는지 검사. throw 하지 않는다.
   * @returns {{valid: boolean, errors: string[]}}
   */
  function validateIncidentRecord(record) {
    var errors = [];

    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return { valid: false, errors: ["record 가 객체가 아닙니다."] };
    }

    if (!isNonEmptyString(record.id) || !ID_PATTERN.test(record.id)) {
      errors.push("id 는 INC-숫자 형식의 문자열이어야 합니다.");
    }
    if (!isNonEmptyString(record.title)) {
      errors.push("title 은 1자 이상의 문자열이어야 합니다.");
    }
    if (SEVERITY_VALUES.indexOf(record.severity) === -1) {
      errors.push("severity 는 P1~P4 중 하나여야 합니다.");
    }
    if (STATUS_VALUES.indexOf(record.status) === -1) {
      errors.push("status 는 detected~resolved 5종 중 하나여야 합니다.");
    }

    var owner = record.owner;
    if (!owner || typeof owner !== "object" || Array.isArray(owner) ||
        !isNonEmptyString(owner.name) || !isNonEmptyString(owner.team)) {
      errors.push("owner 는 {name, team} 모두 1자 이상이어야 합니다.");
    }

    if (!isKstIso(record.detectedAt)) {
      errors.push("detectedAt 은 +09:00 오프셋 ISO 8601 문자열이어야 합니다.");
    }
    if (!isKstIso(record.updatedAt)) {
      errors.push("updatedAt 은 +09:00 오프셋 ISO 8601 문자열이어야 합니다.");
    }
    if (isKstIso(record.detectedAt) && isKstIso(record.updatedAt) && record.updatedAt < record.detectedAt) {
      errors.push("updatedAt 은 detectedAt 이상이어야 합니다.");
    }

    errors = errors.concat(validateTimeline(record));
    errors = errors.concat(validateChecklist(record));

    return { valid: errors.length === 0, errors: errors };
  }

  function validateTimeline(record) {
    var errors = [];
    var timeline = record.timeline;

    if (!Array.isArray(timeline) || timeline.length < 1) {
      return ["timeline 은 1건 이상의 배열이어야 합니다."];
    }

    var previousTimestamp = "";
    var resolvedCount = 0;

    for (var i = 0; i < timeline.length; i += 1) {
      var event = timeline[i];
      if (!event || typeof event !== "object" || Array.isArray(event)) {
        errors.push("timeline[" + i + "] 이 객체가 아닙니다.");
        continue;
      }
      if (!isKstIso(event.timestamp)) {
        errors.push("timeline[" + i + "].timestamp 형식이 올바르지 않습니다.");
      } else {
        // §5.3 규칙 4 — 비내림차순(사전순 비교, new Date() 파싱 없음)
        if (previousTimestamp && event.timestamp < previousTimestamp) {
          errors.push("timeline[" + i + "].timestamp 가 직전 이벤트보다 앞섭니다.");
        }
        previousTimestamp = event.timestamp;
      }
      if (!isNonEmptyString(event.actor)) {
        errors.push("timeline[" + i + "].actor 는 1자 이상이어야 합니다.");
      }
      if (EVENT_TYPE_VALUES.indexOf(event.eventType) === -1) {
        errors.push("timeline[" + i + "].eventType 이 enum 이 아닙니다.");
      }
      if (!isNonEmptyString(event.note)) {
        errors.push("timeline[" + i + "].note 는 1자 이상이어야 합니다.");
      }
      if (event.eventType === "resolved") {
        resolvedCount += 1;
        if (i !== timeline.length - 1) {
          errors.push("resolved 이벤트는 timeline 의 마지막 원소여야 합니다.");
        }
      }
    }

    // §5.3 규칙 1 — 첫 이벤트는 항상 detected
    if (!timeline[0] || timeline[0].eventType !== "detected") {
      errors.push("timeline[0].eventType 은 detected 여야 합니다.");
    }
    // §5.3 규칙 3 — resolved 이벤트는 0개 또는 1개
    if (resolvedCount > 1) {
      errors.push("resolved 이벤트는 최대 1건이어야 합니다.");
    }
    // §5.3 규칙 2 — status==='resolved' ⟺ 마지막 이벤트가 resolved (양방향)
    var lastIsResolved = timeline[timeline.length - 1] &&
      timeline[timeline.length - 1].eventType === "resolved";
    if ((record.status === "resolved") !== Boolean(lastIsResolved)) {
      errors.push("status='resolved' 와 마지막 이벤트 'resolved' 는 서로 동치여야 합니다.");
    }

    return errors;
  }

  function validateChecklist(record) {
    var errors = [];
    var checklist = record.checklist;

    if (!Array.isArray(checklist)) {
      return ["checklist 는 배열이어야 합니다(빈 배열 허용)."];
    }

    var seenIds = {};
    for (var i = 0; i < checklist.length; i += 1) {
      var item = checklist[i];
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        errors.push("checklist[" + i + "] 가 객체가 아닙니다.");
        continue;
      }
      if (!isNonEmptyString(item.id)) {
        errors.push("checklist[" + i + "].id 는 1자 이상이어야 합니다.");
      } else if (seenIds[item.id]) {
        errors.push("checklist id 가 중복되었습니다: " + item.id);
      } else {
        seenIds[item.id] = true;
      }
      if (!isNonEmptyString(item.text)) {
        errors.push("checklist[" + i + "].text 는 1자 이상이어야 합니다.");
      }
      if (typeof item.done !== "boolean") {
        errors.push("checklist[" + i + "].done 은 boolean 이어야 합니다.");
        continue;
      }
      // §5.4 — done=true ⟺ completedAt non-null ISO
      if (item.done && !isKstIso(item.completedAt)) {
        errors.push("checklist[" + i + "].completedAt 은 done=true 일 때 ISO 문자열이어야 합니다.");
      }
      if (!item.done && item.completedAt !== null) {
        errors.push("checklist[" + i + "].completedAt 은 done=false 일 때 null 이어야 합니다.");
      }
    }

    return errors;
  }

  /**
   * §9.2 — fixture 원본 배열을 검증해 화면 데이터/에러를 결정론적으로 산출.
   * @returns {{ok: true, incidents: object[]} | {ok: false, error: string}}
   */
  function loadIncidents(rawItems) {
    if (!Array.isArray(rawItems)) {
      return { ok: false, error: "장애 데이터가 배열이 아닙니다." };
    }
    for (var i = 0; i < rawItems.length; i += 1) {
      var result = validateIncidentRecord(rawItems[i]);
      if (!result.valid) {
        var id = rawItems[i] && rawItems[i].id ? String(rawItems[i].id) : "index " + i;
        return { ok: false, error: "장애 레코드가 스키마를 위반했습니다 (" + id + "): " + result.errors.join(", ") };
      }
    }
    return { ok: true, incidents: rawItems };
  }

  /** §9.3 — 심각도 필터 (원본 mutate 없음) */
  function filterIncidentsBySeverity(incidents, severityFilter) {
    if (!Array.isArray(incidents)) {
      return [];
    }
    if (severityFilter === "all") {
      return incidents.slice();
    }
    return incidents.filter(function (incident) {
      return incident && incident.severity === severityFilter;
    });
  }

  /** §9.4 / §7.1 — 진행률 계산 (percent 는 반올림 정수) */
  function calculateChecklistProgress(checklist) {
    if (!Array.isArray(checklist)) {
      return { total: 0, done: 0, percent: 0 };
    }
    var total = checklist.length;
    var done = checklist.filter(function (item) {
      return Boolean(item) && item.done === true;
    }).length;
    var percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total: total, done: done, percent: percent };
  }

  /**
   * §9.5 — itemId 항목의 done 토글 + completedAt 일관성 유지. 새 배열 반환.
   * @throws {TypeError} itemId 가 checklist 에 없으면
   */
  function toggleChecklistItem(checklist, itemId, nowIso) {
    if (!Array.isArray(checklist)) {
      throw new TypeError("checklist 는 배열이어야 합니다.");
    }
    var found = checklist.some(function (item) {
      return Boolean(item) && item.id === itemId;
    });
    if (!found) {
      throw new TypeError("체크리스트에 존재하지 않는 itemId 입니다: " + String(itemId));
    }
    return checklist.map(function (item) {
      if (item.id !== itemId) {
        return { id: item.id, text: item.text, done: item.done, completedAt: item.completedAt };
      }
      var nextDone = !item.done;
      return {
        id: item.id,
        text: item.text,
        done: nextDone,
        completedAt: nextDone ? nowIso : null
      };
    });
  }

  /* ─────────────── 표시 포맷 (시안 §3.3 — 문자열 슬라이스만, new Date() 파싱 금지) ─────────────── */

  function formatFullDateTime(iso) {
    return iso.slice(0, 10) + " " + iso.slice(11, 16); // 2026-07-14 02:45
  }

  function formatShortDateTime(iso) {
    return iso.slice(5, 10) + " " + iso.slice(11, 16); // 07-14 02:45
  }

  function formatTime(iso) {
    return iso.slice(11, 16); // 02:45
  }

  /* ─────────────── DOM 렌더링 (기획 §10 DOM 계약) ─────────────── */

  var state = {
    incidents: [],
    severityFilter: "all",
    selectedIncidentId: null,
    checklistState: {} // { [incidentId]: ChecklistItem[] } — 세션 in-memory (§1.2)
  };

  var dom = {};
  var labels = { severity: {}, status: {}, eventType: {} };

  function nowKstIso() {
    // 토글 시각 주입용 — 순수 함수는 시계에 의존하지 않고, 호출부(DOM 핸들러)만 시계를 읽는다 (§9.5)
    var shifted = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return shifted.toISOString().slice(0, 19) + "+09:00";
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined && text !== null) {
      node.textContent = text;
    }
    return node;
  }

  function announce(message) {
    if (dom.live) {
      dom.live.textContent = message;
    }
  }

  function visibleIncidents() {
    return filterIncidentsBySeverity(state.incidents, state.severityFilter);
  }

  function checklistOf(incidentId) {
    return state.checklistState[incidentId] || [];
  }

  /* — 목록 — */

  function buildSeverityBadge(severity) {
    var badge = el("span", "ic-badge ic-badge--sev", severity + " · " + labels.severity[severity]);
    badge.setAttribute("data-severity", severity);
    return badge;
  }

  function buildStatusBadge(status) {
    var badge = el("span", "ic-badge ic-badge--status", labels.status[status]);
    badge.setAttribute("data-status", status);
    return badge;
  }

  function buildOwner(owner) {
    var wrapper = el("span", "ic-owner");
    var avatar = el("span", "ic-owner__avatar", owner.name.slice(0, 1));
    avatar.setAttribute("aria-hidden", "true");
    wrapper.appendChild(avatar);
    wrapper.appendChild(el("span", "ic-owner__name", owner.name));
    wrapper.appendChild(el("span", "ic-owner__team", owner.team));
    return wrapper;
  }

  function buildListRow(incident) {
    var row = el("li", "ic-row");
    row.setAttribute("data-id", incident.id);
    row.setAttribute("data-severity", incident.severity);
    row.setAttribute("data-status", incident.status);
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", incident.id === state.selectedIncidentId ? "true" : "false");
    row.setAttribute("tabindex", "0");

    var top = el("div", "ic-row__top");
    top.appendChild(buildSeverityBadge(incident.severity));
    top.appendChild(el("span", "ic-row__title", incident.title));
    top.appendChild(buildStatusBadge(incident.status));

    var meta = el("div", "ic-row__meta");
    meta.appendChild(buildOwner(incident.owner));
    meta.appendChild(el("time", "ic-mono ic-row__at", formatShortDateTime(incident.updatedAt)));

    row.appendChild(top);
    row.appendChild(meta);
    return row;
  }

  function renderList() {
    var incidents = visibleIncidents();

    dom.list.innerHTML = "";
    incidents.forEach(function (incident) {
      dom.list.appendChild(buildListRow(incident));
    });

    var isFilterEmpty = incidents.length === 0;
    dom.list.hidden = isFilterEmpty;
    dom.filterEmpty.hidden = !isFilterEmpty;
    dom.count.textContent = "총 " + incidents.length + "건 표시";

    Array.prototype.forEach.call(dom.chips, function (chip) {
      var pressed = chip.getAttribute("data-severity-filter") === state.severityFilter;
      chip.setAttribute("aria-pressed", pressed ? "true" : "false");
    });
  }

  /* — 상세: 헤더 / 진행률 / 체크리스트 / 타임라인 — */

  function buildDetailHeader(incident) {
    var header = el("header", "ic-detail-head");
    var titleRow = el("div", "ic-detail-head__title-row");
    titleRow.appendChild(el("h2", "ic-detail-head__title", incident.title));
    titleRow.appendChild(el("span", "ic-mono ic-detail-head__id", incident.id));

    var badges = el("div", "ic-detail-head__badges");
    badges.appendChild(buildSeverityBadge(incident.severity));
    badges.appendChild(buildStatusBadge(incident.status));
    badges.appendChild(buildOwner(incident.owner));

    var times = el(
      "p",
      "ic-mono ic-detail-head__times",
      "감지 " + formatFullDateTime(incident.detectedAt) + " · 업데이트 " + formatFullDateTime(incident.updatedAt)
    );

    header.appendChild(titleRow);
    header.appendChild(badges);
    header.appendChild(times);
    return header;
  }

  function buildProgressBar(progress) {
    var track = el("div", "ic-progress");
    track.id = "checklist-progress";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-valuenow", String(progress.percent));
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-label", "복구 체크리스트 진행률");

    var fill = el("div", "ic-progress__fill");
    fill.style.width = progress.percent + "%";
    track.appendChild(fill);
    return track;
  }

  function progressText(progress) {
    // 고정 포맷 (기획 §19) — "N/M 완료 (P%)"
    return progress.done + "/" + progress.total + " 완료 (" + progress.percent + "%)";
  }

  function buildChecklistItem(item) {
    var li = el("li", "ic-check");
    li.setAttribute("data-checklist-id", item.id);

    var input = document.createElement("input");
    input.type = "checkbox";
    input.id = item.id;
    input.className = "ic-check__box";
    input.setAttribute("data-checklist-id", item.id);
    input.checked = item.done;

    var label = el("label", "ic-check__label", item.text);
    label.setAttribute("for", item.id);

    li.appendChild(input);
    li.appendChild(label);

    if (item.done && item.completedAt) {
      li.appendChild(el("time", "ic-mono ic-check__at", formatShortDateTime(item.completedAt)));
    }
    return li;
  }

  function buildChecklistSection(incident) {
    var section = el("section", "ic-panel ic-checklist-panel");
    section.appendChild(el("h2", "ic-panel__title", "복구 체크리스트"));

    var box = el("div", "ic-checklist");
    box.id = "incident-checklist";

    var checklist = checklistOf(incident.id);
    if (checklist.length === 0) {
      // §7.6 — 진행률 바를 DOM 에 만들지 않는다 (0% 오인 방지)
      box.setAttribute("data-checklist-state", "no-checklist");
      box.appendChild(el("p", "ic-note ic-note--dashed", TEXT.noChecklist));
      section.appendChild(box);
      return section;
    }

    box.setAttribute("data-checklist-state", "has-items");
    var progress = calculateChecklistProgress(checklist);
    box.appendChild(buildProgressBar(progress));
    box.appendChild(el("p", "ic-progress__text ic-mono", progressText(progress)));

    var list = el("ul", "ic-check-list");
    checklist.forEach(function (item) {
      list.appendChild(buildChecklistItem(item));
    });
    box.appendChild(list);
    section.appendChild(box);
    return section;
  }

  function buildTimelineSection(incident) {
    var section = el("section", "ic-panel ic-timeline-panel");
    section.appendChild(el("h2", "ic-panel__title", "대응 타임라인"));

    var list = el("ol", "ic-timeline");
    list.id = "incident-timeline";

    incident.timeline.forEach(function (event) {
      var li = el("li", "ic-tl");
      li.setAttribute("data-event-type", event.eventType);
      li.appendChild(el("time", "ic-mono ic-tl__time", formatTime(event.timestamp)));

      var body = el("div", "ic-tl__body");
      var head = el("div", "ic-tl__head");
      head.appendChild(el("span", "ic-tl__type", labels.eventType[event.eventType]));
      head.appendChild(el("span", "ic-tl__actor", event.actor));
      body.appendChild(head);
      body.appendChild(el("p", "ic-tl__note", event.note));

      li.appendChild(body);
      list.appendChild(li);
    });

    section.appendChild(list);
    return section;
  }

  function renderDetail() {
    var incident = null;
    if (state.selectedIncidentId) {
      incident = state.incidents.filter(function (item) {
        return item.id === state.selectedIncidentId;
      })[0] || null;
    }

    dom.detail.innerHTML = "";

    if (!incident) {
      // §7.5 — 미선택 안내 (문구 고정)
      dom.detail.setAttribute("data-selected-id", "none");
      var placeholder = el("div", "ic-note ic-note--dashed ic-detail-empty");
      var arrow = el("span", "ic-detail-empty__arrow", "↑");
      arrow.setAttribute("aria-hidden", "true");
      placeholder.appendChild(arrow);
      placeholder.appendChild(el("p", null, TEXT.noSelection));
      dom.detail.appendChild(placeholder);
      return;
    }

    dom.detail.setAttribute("data-selected-id", incident.id);
    dom.detail.appendChild(buildDetailHeader(incident));
    dom.detail.appendChild(buildChecklistSection(incident)); // 인터랙티브 섹션을 위로 (시안 §5.1)
    dom.detail.appendChild(buildTimelineSection(incident));
  }

  /* — 진행률만 부분 갱신 (시안 §6.6 — 3곳 모두 갱신) — */

  function refreshProgress(incidentId) {
    var progress = calculateChecklistProgress(checklistOf(incidentId));
    var bar = document.getElementById("checklist-progress");
    if (!bar) {
      return;
    }
    var fill = bar.querySelector(".ic-progress__fill");
    if (fill) {
      fill.style.width = progress.percent + "%";
    }
    bar.setAttribute("aria-valuenow", String(progress.percent));

    var text = dom.detail.querySelector(".ic-progress__text");
    if (text) {
      text.textContent = progressText(progress);
    }
  }

  function refreshChecklistItemView(itemId) {
    var checklist = checklistOf(state.selectedIncidentId);
    var item = checklist.filter(function (entry) {
      return entry.id === itemId;
    })[0];
    var li = dom.detail.querySelector('li[data-checklist-id="' + itemId + '"]');
    if (!item || !li) {
      return;
    }
    var existingTime = li.querySelector(".ic-check__at");
    if (existingTime) {
      li.removeChild(existingTime);
    }
    if (item.done && item.completedAt) {
      li.appendChild(el("time", "ic-mono ic-check__at", formatShortDateTime(item.completedAt)));
    }
  }

  /* ─────────────── 이벤트 핸들러 ─────────────── */

  function selectIncident(incidentId) {
    if (state.selectedIncidentId === incidentId) {
      return;
    }
    state.selectedIncidentId = incidentId;
    renderList();
    renderDetail();

    var incident = state.incidents.filter(function (item) {
      return item.id === incidentId;
    })[0];
    if (incident) {
      announce(incident.title + " 선택됨");
    }
  }

  function applySeverityFilter(severityFilter) {
    state.severityFilter = severityFilter;

    var visible = visibleIncidents();
    var stillVisible = visible.some(function (incident) {
      return incident.id === state.selectedIncidentId;
    });

    if (!stillVisible) {
      if (state.selectedIncidentId !== null) {
        // §2.3 / AC-03 — 필터로 선택된 장애가 사라지면 "미선택" 으로 전환
        state.selectedIncidentId = null;
      } else {
        // 미선택 상태에서 필터를 바꾸면 새 목록의 첫 항목을 기본 선택 (§2.3 EC-03)
        state.selectedIncidentId = visible.length > 0 ? visible[0].id : null;
      }
    }

    renderList();
    renderDetail();
    announce("총 " + visible.length + "건 표시");
  }

  function onListClick(event) {
    var row = event.target.closest ? event.target.closest("li[data-id]") : null;
    if (row) {
      selectIncident(row.getAttribute("data-id"));
    }
  }

  function onListKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    var row = event.target.closest ? event.target.closest("li[data-id]") : null;
    if (!row) {
      return;
    }
    event.preventDefault(); // Space 기본 스크롤 방지 (시안 §6.4)
    selectIncident(row.getAttribute("data-id"));
  }

  function onDetailChange(event) {
    // EC-05 — change 만 청취 (click 동시 청취 시 label 클릭에서 이중 토글)
    var input = event.target;
    if (!input || input.type !== "checkbox") {
      return;
    }
    var itemId = input.getAttribute("data-checklist-id");
    var incidentId = state.selectedIncidentId;
    if (!itemId || !incidentId) {
      return;
    }
    state.checklistState[incidentId] = toggleChecklistItem(checklistOf(incidentId), itemId, nowKstIso());
    refreshChecklistItemView(itemId);
    refreshProgress(incidentId);
  }

  function bindEvents() {
    Array.prototype.forEach.call(dom.chips, function (chip) {
      chip.addEventListener("click", function () {
        applySeverityFilter(chip.getAttribute("data-severity-filter"));
      });
    });
    dom.resetBtn.addEventListener("click", function () {
      applySeverityFilter("all");
    });
    dom.list.addEventListener("click", onListClick);
    dom.list.addEventListener("keydown", onListKeydown);
    dom.detail.addEventListener("change", onDetailChange);
  }

  /* ─────────────── 초기화 (기획 §13.1 파이프라인 — 동기 1회) ─────────────── */

  function setViewState(viewState) {
    dom.appRoot.setAttribute("data-view-state", viewState);
    if (viewState !== "error" && dom.errorBanner && dom.errorBanner.parentNode) {
      // §10 — error-banner 는 error 상태일 때만 DOM 에 존재
      dom.errorBanner.parentNode.removeChild(dom.errorBanner);
    }
  }

  function init() {
    var appRoot = document.getElementById("incident-command");
    if (!appRoot) {
      return;
    }

    dom = {
      appRoot: appRoot,
      live: document.getElementById("ic-live"),
      count: document.getElementById("incident-count"),
      chips: appRoot.querySelectorAll("[data-severity-filter]"),
      resetBtn: document.getElementById("reset-severity-filter-btn"),
      list: document.getElementById("incident-list"),
      filterEmpty: document.getElementById("filter-empty"),
      detail: document.getElementById("incident-detail"),
      errorBanner: document.getElementById("error-banner")
    };

    var fixtures = (typeof globalThis !== "undefined" ? globalThis : window).IncidentCommandFixtures;
    if (!fixtures) {
      setViewState("error");
      return;
    }
    labels = {
      severity: fixtures.SEVERITY_LABELS,
      status: fixtures.STATUS_LABELS,
      eventType: fixtures.EVENT_TYPE_LABELS
    };

    var result = loadIncidents(fixtures.INCIDENTS);
    if (!result.ok) {
      setViewState("error"); // §13.4 — 배너는 정적 마크업 그대로 노출
      return;
    }
    if (result.incidents.length === 0) {
      setViewState("empty"); // §13.3
      return;
    }

    state.incidents = result.incidents;
    state.severityFilter = "all";
    state.selectedIncidentId = result.incidents[0].id; // AC-01 — 첫 번째 장애 기본 선택
    state.checklistState = {};
    result.incidents.forEach(function (incident) {
      state.checklistState[incident.id] = incident.checklist.map(function (item) {
        return { id: item.id, text: item.text, done: item.done, completedAt: item.completedAt };
      });
    });

    setViewState("ready"); // §13.2 — 인위적 지연 없이 동기 전환
    bindEvents();
    renderList();
    renderDetail();
    announce("총 " + state.incidents.length + "건 표시");
  }

  return {
    validateIncidentRecord: validateIncidentRecord,
    loadIncidents: loadIncidents,
    filterIncidentsBySeverity: filterIncidentsBySeverity,
    calculateChecklistProgress: calculateChecklistProgress,
    toggleChecklistItem: toggleChecklistItem,
    init: init
  };
});
