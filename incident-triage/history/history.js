/* incident-triage/history/history.js — Incident Handoff Timeline pure 함수 + DOM 렌더링
 * BF-809 · 기획 docs/plan/incident-triage-history-BF-806.md §2.3/§6 · 시안 docs/design/incident-triage-history-BF-806.md §5/§7.2
 * UMD 패턴 (기획 §6.3, 기존 incident-triage/triage.js 관례 계승)
 *   - 브라우저: globalThis.IncidentHistory + DOMContentLoaded 시 init()
 *   - Node   : module.exports (순수 함수 단위 테스트, DOM 초기화 안 함)
 * file:// CORS 안전 — 외부 CDN·네트워크 호출·ESM 모듈 구문·브라우저 저장소 접근 0건 (기획 §11)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    // Node (단위 테스트) — 순수 함수만 사용, DOM 초기화 안 함
    module.exports = api;
  }
  if (root) {
    root.IncidentHistory = api;
    // 브라우저에서만 DOM 와이어링
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

  /* ─── 상수 (기획 §2.1 / §2.2 표 그대로 — 규칙 재해석 금지) ─── */

  var ROLE_ORDER = ["planner", "designer", "developer", "reviewer", "tester"];

  var ROLE_LABEL = {
    planner: "기획",
    designer: "디자인",
    developer: "개발",
    reviewer: "리뷰",
    tester: "테스트"
  };

  var STATUS_LABEL = {
    not_started: "대기",
    in_progress: "진행중",
    blocked: "차단",
    done: "완료"
  };

  /* Jira 이슈 키 → 정적 앵커 URL (시안 §5.4 · mockup 과 동일 base) — fetch 아님, 단순 href 조립 */
  var JIRA_BASE_URL = "https://jira.example.com/browse/";

  var EMPTY_TEXT = "-";

  /* ─── 순수 함수 #1: 종합 상태 파생 (기획 §2.3 우선순위 표) ─── */

  /**
   * 5개 Stage 배열로부터 인시던트 종합 상태를 결정론적으로 파생한다.
   * @param {Array<{role: string, status: string}>} stages - 정확히 5개, §2.1 role 순서 고정
   * @returns {'not_started'|'in_progress'|'blocked'|'done'}
   * @throws {TypeError} 배열 아님/길이≠5/role 순서 불일치/status enum 위반
   */
  function deriveIncidentStatus(stages) {
    if (!Array.isArray(stages) || stages.length !== ROLE_ORDER.length) {
      throw new TypeError("deriveIncidentStatus: stages 는 길이 " + ROLE_ORDER.length + " 인 배열이어야 합니다");
    }

    var statuses = stages.map(function (stage, i) {
      if (!stage || stage.role !== ROLE_ORDER[i]) {
        throw new TypeError(
          "deriveIncidentStatus: role 순서 위반 — index " + i + " 는 '" + ROLE_ORDER[i] + "' 여야 합니다"
        );
      }
      if (!Object.prototype.hasOwnProperty.call(STATUS_LABEL, stage.status)) {
        throw new TypeError("deriveIncidentStatus: 알 수 없는 status '" + stage.status + "' (role=" + stage.role + ")");
      }
      return stage.status;
    });

    // 기획 §2.3 — 첫 번째로 매칭되는 규칙 적용 (순서 중요)
    if (statuses.indexOf("blocked") !== -1) return "blocked";
    if (statuses.every(function (s) { return s === "done"; })) return "done";
    if (statuses.every(function (s) { return s === "not_started"; })) return "not_started";
    return "in_progress";
  }

  /* ─── 순수 함수 #2: 완료 시각 포맷 (기획 §6.2 · EC-09) ─── */

  /* 초(:ss)·오프셋은 선택적 — Date 객체 미사용(테스트 환경 타임존 비결정성 방지) */
  var ISO_PREFIX = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/;

  /**
   * ISO 8601 완료 시각을 "YYYY-MM-DD HH:mm" 표시 문자열로 변환한다.
   * @param {string|null} isoString
   * @returns {string} null 이면 '-', 아니면 "YYYY-MM-DD HH:mm"
   * @throws {TypeError} null 이 아닌데 ISO 패턴에 맞지 않으면 throw
   */
  function formatCompletedAt(isoString) {
    if (isoString === null) return EMPTY_TEXT;

    var matched = typeof isoString === "string" ? ISO_PREFIX.exec(isoString) : null;
    if (!matched) {
      throw new TypeError("formatCompletedAt: ISO 8601 형식이 아닙니다 — " + String(isoString));
    }
    return matched[1] + " " + matched[2];
  }

  /* ─── DOM 렌더링 헬퍼 (시안 §5 마크업 계약) ─── */

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  /** '-' placeholder — href 없는 빈 <a> 를 절대 생성하지 않는다 (AC-04) */
  function emptyValue() {
    var span = el("span", "ith-empty-value");
    span.setAttribute("aria-label", "없음");
    span.textContent = EMPTY_TEXT;
    return span;
  }

  /** 상태 배지 (시안 §5.2) — 색 + 한글 라벨 항상 병기 */
  function statusBadge(status, size) {
    var badge = el("span", "ith-badge ith-badge--" + size);
    badge.setAttribute("data-status", status);
    badge.textContent = STATUS_LABEL[status];
    return badge;
  }

  /** 새 탭 링크 (시안 §5.4) — 정적 앵커일 뿐, 네트워크 조회 없음 */
  function externalLink(className, href, text, ariaLabel) {
    var link = el("a", "ith-link " + className);
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", ariaLabel);
    link.textContent = text;
    return link;
  }

  /** Stage 필드 래퍼: 라벨(모바일 노출) + 값 */
  function field(modifier, label, valueNode) {
    var wrap = el("span", "ith-field ith-field--" + modifier);
    var labelNode = el("span", "ith-field__label");
    labelNode.textContent = label;
    wrap.appendChild(labelNode);
    wrap.appendChild(valueNode);
    return wrap;
  }

  function textValue(text) {
    var span = el("span", "ith-field__value");
    span.textContent = text;
    return span;
  }

  /** 데스크톱 열 헤더 행 (시안 §4.4 — 각 열의 의미를 1회 제공) */
  function timelineHead() {
    var head = el("li", "ith-timeline__head");
    head.setAttribute("aria-hidden", "true");
    ["역할", "상태", "담당자", "완료 시각", "Jira", "PR"].forEach(function (title) {
      var span = document.createElement("span");
      span.textContent = title;
      head.appendChild(span);
    });
    return head;
  }

  /** TimelineRow — Stage 행 (시안 §5.3, 자식 6개 고정) */
  function renderStage(stage) {
    var row = el("li", "ith-stage");
    row.setAttribute("data-status", stage.status);
    row.setAttribute("data-role", stage.role);

    // ① 역할 라벨
    var role = el("span", "ith-stage__role");
    role.textContent = ROLE_LABEL[stage.role];
    row.appendChild(role);

    // ② 상태 배지
    row.appendChild(statusBadge(stage.status, "stage"));

    // ③ 담당자
    row.appendChild(
      field("assignee", "담당자", stage.assigneeName === null ? emptyValue() : textValue(stage.assigneeName))
    );

    // ④ 완료 시각 (null → '-' 는 formatCompletedAt 계약)
    row.appendChild(
      field("time", "완료 시각", stage.completedAt === null ? emptyValue() : textValue(formatCompletedAt(stage.completedAt)))
    );

    // ⑤ Jira 링크
    row.appendChild(
      field(
        "jira",
        "Jira",
        stage.jiraIssueKey === null
          ? emptyValue()
          : externalLink(
              "ith-link--jira",
              JIRA_BASE_URL + stage.jiraIssueKey,
              stage.jiraIssueKey,
              stage.jiraIssueKey + " Jira 이슈 (새 탭에서 열림)"
            )
      )
    );

    // ⑥ PR 링크
    row.appendChild(
      field(
        "pr",
        "PR",
        stage.prUrl === null
          ? emptyValue()
          : externalLink(
              "ith-link--pr",
              stage.prUrl,
              "PR 보기 ↗",
              (stage.jiraIssueKey || ROLE_LABEL[stage.role]) + " GitHub PR (새 탭에서 열림)"
            )
      )
    );

    return row;
  }

  /** IncidentCard (시안 §5.1) — 종합 상태는 deriveIncidentStatus 파생값만 신뢰 */
  function renderCard(incident) {
    var overall = deriveIncidentStatus(incident.stages);

    var card = el("li", "ith-card");
    card.setAttribute("data-overall", overall);

    var head = el("div", "ith-card__head");
    var headText = document.createElement("div");

    var title = el("h2", "ith-card__title");
    title.textContent = incident.title;
    headText.appendChild(title);

    var meta = el("p", "ith-card__meta");
    meta.textContent = incident.id + " · " + incident.epicKey;
    headText.appendChild(meta);

    head.appendChild(headText);
    head.appendChild(statusBadge(overall, "overall"));
    card.appendChild(head);

    var timeline = el("ol", "ith-timeline");
    timeline.appendChild(timelineHead());
    incident.stages.forEach(function (stage) {
      timeline.appendChild(renderStage(stage));
    });
    card.appendChild(timeline);

    return card;
  }

  /* ─── init: 1회성 렌더 (상태 변경 없는 읽기 전용 화면 — 이벤트 리스너 불필요) ─── */

  function init() {
    var list = document.getElementById("history-list");
    if (!list) return;

    var incidents = (getFixtures() || {}).INCIDENT_HISTORY || [];

    list.textContent = "";

    // EmptyState (시안 §5.5 / AC-07)
    // <p> 는 <ul> 의 직계 자식이 될 수 없으므로(HTML5 invalid) 목록의 형제로 삽입하고 빈 <ul> 은 숨긴다.
    if (incidents.length === 0) {
      list.hidden = true;
      var empty = el("p", "ith-empty");
      empty.textContent = "표시할 인시던트 이력이 없습니다.";
      list.parentNode.insertBefore(empty, list.nextSibling);
      return;
    }

    // fixture 배열 순서 그대로 렌더 (재정렬 없음, AC-01)
    incidents.forEach(function (incident) {
      list.appendChild(renderCard(incident));
    });
  }

  /** fixtures.js 가 노출한 전역 참조 (브라우저 classic script 로드 순서: fixtures.js → history.js) */
  function getFixtures() {
    return typeof globalThis !== "undefined" ? globalThis.IncidentHistoryFixtures : undefined;
  }

  return {
    deriveIncidentStatus: deriveIncidentStatus,
    formatCompletedAt: formatCompletedAt,
    init: init
  };
});
