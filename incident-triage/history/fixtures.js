/* incident-triage/history/fixtures.js — Incident Handoff Timeline 정적 fixture
 * BF-809 · 기획 docs/plan/incident-triage-history-BF-806.md §4.4 (그대로 채택 — 재해석 금지)
 * UMD 패턴 (기획 §6.3) — 브라우저: globalThis.IncidentHistoryFixtures / Node: module.exports
 * 순수 데이터 상수 모듈 — DOM 접근·렌더링·네트워크 호출 0건
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.IncidentHistoryFixtures = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* 기획 §4.4 — 배열 순서가 곧 화면 표시 순서 (런타임 재정렬 없음) */
  var INCIDENT_HISTORY = [
    {
      id: "INC-1001",
      title: "결제 승인 API 5xx 급증",
      epicKey: "BF-900",
      stages: [
        { role: "planner",   status: "done", assigneeName: "박기획",   completedAt: "2026-07-08T09:10:00+09:00", jiraIssueKey: "BF-901", prUrl: "https://github.com/brix-flow/repo/pull/201" },
        { role: "designer",  status: "done", assigneeName: "이디자인", completedAt: "2026-07-08T15:40:00+09:00", jiraIssueKey: "BF-902", prUrl: "https://github.com/brix-flow/repo/pull/202" },
        { role: "developer", status: "done", assigneeName: "김개발",   completedAt: "2026-07-09T11:05:00+09:00", jiraIssueKey: "BF-903", prUrl: "https://github.com/brix-flow/repo/pull/203" },
        /* reviewer 의 PR 은 developer 와 동일 URL — 기획 §4.3 / EC-04 */
        { role: "reviewer",  status: "done", assigneeName: "최리뷰",   completedAt: "2026-07-09T13:20:00+09:00", jiraIssueKey: "BF-903", prUrl: "https://github.com/brix-flow/repo/pull/203" },
        { role: "tester",    status: "done", assigneeName: "정테스트", completedAt: "2026-07-10T10:00:00+09:00", jiraIssueKey: "BF-905", prUrl: "https://github.com/brix-flow/repo/pull/205" }
      ]
    },
    {
      id: "INC-1002",
      title: "정적 자산 CDN 응답 지연",
      epicKey: "BF-920",
      stages: [
        { role: "planner",   status: "done",        assigneeName: "박기획",   completedAt: "2026-07-11T09:00:00+09:00", jiraIssueKey: "BF-921", prUrl: "https://github.com/brix-flow/repo/pull/221" },
        { role: "designer",  status: "done",        assigneeName: "이디자인", completedAt: "2026-07-11T14:30:00+09:00", jiraIssueKey: "BF-922", prUrl: "https://github.com/brix-flow/repo/pull/222" },
        { role: "developer", status: "in_progress", assigneeName: "김개발",   completedAt: null, jiraIssueKey: "BF-923", prUrl: null },
        { role: "reviewer",  status: "not_started", assigneeName: null,       completedAt: null, jiraIssueKey: null,     prUrl: null },
        { role: "tester",    status: "not_started", assigneeName: null,       completedAt: null, jiraIssueKey: null,     prUrl: null }
      ]
    },
    {
      id: "INC-1003",
      title: "인증 토큰 만료 오탐",
      epicKey: "BF-930",
      stages: [
        { role: "planner",   status: "done",        assigneeName: "박기획",   completedAt: "2026-07-12T09:00:00+09:00", jiraIssueKey: "BF-931", prUrl: "https://github.com/brix-flow/repo/pull/231" },
        { role: "designer",  status: "done",        assigneeName: "이디자인", completedAt: "2026-07-12T13:10:00+09:00", jiraIssueKey: "BF-932", prUrl: "https://github.com/brix-flow/repo/pull/232" },
        { role: "developer", status: "blocked",     assigneeName: "김개발",   completedAt: null, jiraIssueKey: "BF-933", prUrl: "https://github.com/brix-flow/repo/pull/233" },
        { role: "reviewer",  status: "not_started", assigneeName: null,       completedAt: null, jiraIssueKey: null,     prUrl: null },
        { role: "tester",    status: "not_started", assigneeName: null,       completedAt: null, jiraIssueKey: null,     prUrl: null }
      ]
    }
  ];

  return { INCIDENT_HISTORY: INCIDENT_HISTORY };
});
