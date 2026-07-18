/* support-inbox-phase18/fixtures.js — 고객지원 인박스 Phase18 결정적(deterministic) fixture
 * BF-1021 · 기획 docs/plan/support-inbox-phase18-BF-1013.md §3(스키마)·§6(fixture 8건) — 그대로 채택(재해석 금지)
 * UMD 패턴 (support-inbox-canary/fixtures.js 관례 계승) — 브라우저: globalThis.SupportInboxPhase18Fixtures / Node: module.exports
 * 순수 데이터 상수 모듈 — DOM·네트워크·Date.now()/Math.random() 0건 (기획 §6.1 결정성 요구)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SupportInboxPhase18Fixtures = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* 운영자 풀 (고정, 기획 §3.3) — 신규 계정 추가 비범위(§10) */
  var AGT_01 = { id: "agt-01", name: "박운영" };
  var AGT_02 = { id: "agt-02", name: "정지원" };

  /* ─── fixture 8건 (기획 §6.2) — INQ-4001~4008
   * status 4종 + priority 4종 + 미배정 2건 + 재오픈 1건 전부 커버(§6.3)
   * history: append-only · 오래된 순 · 각 티켓 status 는 마지막 STATUS_CHANGED 의 to 와 일치
   * EVT-###### 는 700001 부터 순차 · 모든 시각은 ISO8601 +09:00 고정(난수/현재시각 미사용, §6.1)
   * createdAt 은 INQ-4001(2026-07-10T09:00) ~ INQ-4008(2026-07-17T17:40) 순차 증가(§6.2)
   */
  var FIXTURE_TICKETS = [
    /* INQ-4001 · received · low · 미배정 · 이력 없음(최초 접수, 빈 history 케이스) */
    {
      id: "INQ-4001",
      subject: "로그인 후 대시보드 빈 화면 표시",
      requester: { name: "김민수", email: "minsu.kim@example.com" },
      status: "received",
      priority: "low",
      assignee: null,
      createdAt: "2026-07-10T09:00:00+09:00",
      updatedAt: "2026-07-10T09:00:00+09:00",
      history: []
    },
    /* INQ-4002 · received · urgent · 배정됨 · ASSIGNEE_CHANGED 1건(status 는 received 유지) */
    {
      id: "INQ-4002",
      subject: "[긴급] 결제 승인 실패로 반복 청구 발생",
      requester: { name: "이서연", email: "seoyeon.lee@example.com" },
      status: "received",
      priority: "urgent",
      assignee: { id: AGT_01.id, name: AGT_01.name },
      createdAt: "2026-07-11T09:20:00+09:00",
      updatedAt: "2026-07-11T09:25:00+09:00",
      history: [
        {
          id: "EVT-700001", ticketId: "INQ-4002", type: "ASSIGNEE_CHANGED",
          at: "2026-07-11T09:25:00+09:00", actor: { id: AGT_01.id, name: AGT_01.name },
          from: null, to: "박운영", note: null
        }
      ]
    },
    /* INQ-4003 · in_progress · high · 배정 → 진행 전이 */
    {
      id: "INQ-4003",
      subject: "비밀번호 재설정 메일 미수신",
      requester: { name: "최도윤", email: "doyoon.choi@example.com" },
      status: "in_progress",
      priority: "high",
      assignee: { id: AGT_02.id, name: AGT_02.name },
      createdAt: "2026-07-12T10:05:00+09:00",
      updatedAt: "2026-07-12T10:12:00+09:00",
      history: [
        {
          id: "EVT-700002", ticketId: "INQ-4003", type: "ASSIGNEE_CHANGED",
          at: "2026-07-12T10:08:00+09:00", actor: { id: AGT_02.id, name: AGT_02.name },
          from: null, to: "정지원", note: null
        },
        {
          id: "EVT-700003", ticketId: "INQ-4003", type: "STATUS_CHANGED",
          at: "2026-07-12T10:12:00+09:00", actor: { id: AGT_02.id, name: AGT_02.name },
          from: "received", to: "in_progress", note: null
        }
      ]
    },
    /* INQ-4004 · in_progress · normal · 배정 → 진행 전이 */
    {
      id: "INQ-4004",
      subject: "API 연동 문서 오류 문의",
      requester: { name: "한지호", email: "jiho.han@example.com" },
      status: "in_progress",
      priority: "normal",
      assignee: { id: AGT_01.id, name: AGT_01.name },
      createdAt: "2026-07-13T09:30:00+09:00",
      updatedAt: "2026-07-13T09:40:00+09:00",
      history: [
        {
          id: "EVT-700004", ticketId: "INQ-4004", type: "ASSIGNEE_CHANGED",
          at: "2026-07-13T09:35:00+09:00", actor: { id: AGT_01.id, name: AGT_01.name },
          from: null, to: "박운영", note: null
        },
        {
          id: "EVT-700005", ticketId: "INQ-4004", type: "STATUS_CHANGED",
          at: "2026-07-13T09:40:00+09:00", actor: { id: AGT_01.id, name: AGT_01.name },
          from: "received", to: "in_progress", note: null
        }
      ]
    },
    /* INQ-4005 · on_hold · high · 배정 → 진행 → 보류(note) · 영문 subject(검색 대소문자 무관 검증) */
    {
      id: "INQ-4005",
      subject: "Payment gateway timeout error on checkout",
      requester: { name: "오하은", email: "haeun.oh@example.com" },
      status: "on_hold",
      priority: "high",
      assignee: { id: AGT_02.id, name: AGT_02.name },
      createdAt: "2026-07-14T11:00:00+09:00",
      updatedAt: "2026-07-14T14:00:00+09:00",
      history: [
        {
          id: "EVT-700006", ticketId: "INQ-4005", type: "ASSIGNEE_CHANGED",
          at: "2026-07-14T11:05:00+09:00", actor: { id: AGT_02.id, name: AGT_02.name },
          from: null, to: "정지원", note: null
        },
        {
          id: "EVT-700007", ticketId: "INQ-4005", type: "STATUS_CHANGED",
          at: "2026-07-14T11:20:00+09:00", actor: { id: AGT_02.id, name: AGT_02.name },
          from: "received", to: "in_progress", note: null
        },
        {
          id: "EVT-700008", ticketId: "INQ-4005", type: "STATUS_CHANGED",
          at: "2026-07-14T14:00:00+09:00", actor: { id: AGT_02.id, name: AGT_02.name },
          from: "in_progress", to: "on_hold", note: "고객 회신 대기"
        }
      ]
    },
    /* INQ-4006 · resolved · low · 배정 → 진행 → 해결 */
    {
      id: "INQ-4006",
      subject: "환불 처리 지연 문의",
      requester: { name: "서준영", email: "junyoung.seo@example.com" },
      status: "resolved",
      priority: "low",
      assignee: { id: AGT_01.id, name: AGT_01.name },
      createdAt: "2026-07-15T10:00:00+09:00",
      updatedAt: "2026-07-15T15:30:00+09:00",
      history: [
        {
          id: "EVT-700009", ticketId: "INQ-4006", type: "ASSIGNEE_CHANGED",
          at: "2026-07-15T10:05:00+09:00", actor: { id: AGT_01.id, name: AGT_01.name },
          from: null, to: "박운영", note: null
        },
        {
          id: "EVT-700010", ticketId: "INQ-4006", type: "STATUS_CHANGED",
          at: "2026-07-15T10:15:00+09:00", actor: { id: AGT_01.id, name: AGT_01.name },
          from: "received", to: "in_progress", note: null
        },
        {
          id: "EVT-700011", ticketId: "INQ-4006", type: "STATUS_CHANGED",
          at: "2026-07-15T15:30:00+09:00", actor: { id: AGT_01.id, name: AGT_01.name },
          from: "in_progress", to: "resolved", note: null
        }
      ]
    },
    /* INQ-4007 · in_progress(재오픈) · urgent · 배정 → 진행 → 해결 → 재오픈(note) — EC-09 재오픈 케이스 */
    {
      id: "INQ-4007",
      subject: "계정 잠금 반복 해제 요청",
      requester: { name: "배지훈", email: "jihoon.bae@example.com" },
      status: "in_progress",
      priority: "urgent",
      assignee: { id: AGT_02.id, name: AGT_02.name },
      createdAt: "2026-07-16T08:00:00+09:00",
      updatedAt: "2026-07-17T14:20:00+09:00",
      history: [
        {
          id: "EVT-700012", ticketId: "INQ-4007", type: "ASSIGNEE_CHANGED",
          at: "2026-07-16T08:05:00+09:00", actor: { id: AGT_02.id, name: AGT_02.name },
          from: null, to: "정지원", note: null
        },
        {
          id: "EVT-700013", ticketId: "INQ-4007", type: "STATUS_CHANGED",
          at: "2026-07-16T08:10:00+09:00", actor: { id: AGT_02.id, name: AGT_02.name },
          from: "received", to: "in_progress", note: null
        },
        {
          id: "EVT-700014", ticketId: "INQ-4007", type: "STATUS_CHANGED",
          at: "2026-07-16T12:00:00+09:00", actor: { id: AGT_02.id, name: AGT_02.name },
          from: "in_progress", to: "resolved", note: null
        },
        {
          id: "EVT-700015", ticketId: "INQ-4007", type: "STATUS_CHANGED",
          at: "2026-07-17T14:20:00+09:00", actor: { id: AGT_02.id, name: AGT_02.name },
          from: "resolved", to: "in_progress", note: "고객이 동일 문제 재발 신고 — 재오픈"
        }
      ]
    },
    /* INQ-4008 · received · normal · 미배정 · 이력 없음(최초 접수) */
    {
      id: "INQ-4008",
      subject: "청구서 PDF 다운로드 버튼 미작동",
      requester: { name: "정유나", email: "yuna.jeong@example.com" },
      status: "received",
      priority: "normal",
      assignee: null,
      createdAt: "2026-07-17T17:40:00+09:00",
      updatedAt: "2026-07-17T17:40:00+09:00",
      history: []
    }
  ];

  /**
   * fixture 를 매번 새 객체로 깊은 복제해 반환한다.
   * 상수 배열을 직접 노출하면 런타임 변경(상태 전환)이 원본을 오염시키므로(참조 공유) 방지.
   * @returns {Array<object>} Inquiry 배열 깊은 복제본
   */
  function getFixtureTickets() {
    return FIXTURE_TICKETS.map(function (t) {
      return {
        id: t.id,
        subject: t.subject,
        requester: { name: t.requester.name, email: t.requester.email },
        status: t.status,
        priority: t.priority,
        assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name } : null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        history: t.history.map(function (e) {
          return {
            id: e.id, ticketId: e.ticketId, type: e.type, at: e.at,
            actor: { id: e.actor.id, name: e.actor.name },
            from: e.from, to: e.to, note: e.note
          };
        })
      };
    });
  }

  return {
    AGENTS: [{ id: AGT_01.id, name: AGT_01.name }, { id: AGT_02.id, name: AGT_02.name }],
    getFixtureTickets: getFixtureTickets
  };
});
