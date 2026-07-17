/* support-inbox-canary/fixtures.js — 고객지원 인박스 결정적(deterministic) seed
 * BF-1007 · 기획 docs/planning/support-inbox-canary-BF-1000.md §7 (그대로 채택 — 재해석 금지)
 * UMD 패턴 (number-guess/game.js·incident-triage 관례) — 브라우저: globalThis.SupportInboxFixtures / Node: module.exports
 * 순수 데이터 상수 모듈 — DOM 접근·렌더링·네트워크·Date.now()/Math.random() 0건 (기획 §7.1)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SupportInboxFixtures = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* 저장 envelope 버전 (기획 §8.1) — 구조 바뀌면 SCHEMA_VERSION, seed 내용 바뀌면 SEED_VERSION 증가 */
  var SCHEMA_VERSION = 1;
  var SEED_VERSION = 1;

  /* 운영자 풀 (고정, 기획 §7.2·§5) — 신규 계정 추가는 seed 갱신으로만 (범위 밖 §12) */
  var AGT_01 = { id: "agt-01", name: "박운영" };
  var AGT_02 = { id: "agt-02", name: "정지원" };

  /* ─── seed 6건 (기획 §7.2) — 4개 상태 + 재오픈(EC-07) 전부 커버
   * 배열 순서 = 화면 표시 순서 (런타임 재정렬 없음, 기획 §3.1)
   * history: append-only · 오래된 순 (기획 §6.3)
   * 각 Inquiry 의 status 는 history 마지막 STATUS_CHANGED 의 to 와 일치 (기획 §6.3 / §8.2 V6)
   * 모든 시각은 ISO8601 +09:00 고정 (실행마다 동일 — 난수/현재시각 미사용)
   */
  var SEED_TICKETS = [
    /* INQ-3001 · received · 미배정 · 이력 없음(최초 접수) */
    {
      id: "INQ-3001",
      subject: "로그인 후 대시보드 빈 화면 표시",
      requester: { name: "김민수", email: "minsu.kim@example.com" },
      status: "received",
      assignee: null,
      createdAt: "2026-07-10T09:00:00+09:00",
      updatedAt: "2026-07-10T09:00:00+09:00",
      history: []
    },
    /* INQ-3002 · received · 배정됨 · ASSIGNEE_CHANGED 1건 (status 는 received 유지) */
    {
      id: "INQ-3002",
      subject: "결제 영수증 재발급 요청",
      requester: { name: "이서연", email: "seoyeon.lee@example.com" },
      status: "received",
      assignee: { id: AGT_01.id, name: AGT_01.name },
      createdAt: "2026-07-11T11:00:00+09:00",
      updatedAt: "2026-07-11T11:05:00+09:00",
      history: [
        {
          id: "EVT-000001", ticketId: "INQ-3002", type: "ASSIGNEE_CHANGED",
          at: "2026-07-11T11:05:00+09:00", actor: { id: AGT_01.id, name: AGT_01.name },
          from: null, to: "박운영", note: null
        }
      ]
    },
    /* INQ-3003 · in_progress · 배정 → 진행 전이 */
    {
      id: "INQ-3003",
      subject: "비밀번호 재설정 메일 미수신",
      requester: { name: "최도윤", email: "doyoon.choi@example.com" },
      status: "in_progress",
      assignee: { id: AGT_02.id, name: AGT_02.name },
      createdAt: "2026-07-12T10:30:00+09:00",
      updatedAt: "2026-07-12T10:36:00+09:00",
      history: [
        {
          id: "EVT-000002", ticketId: "INQ-3003", type: "ASSIGNEE_CHANGED",
          at: "2026-07-12T10:35:00+09:00", actor: { id: AGT_02.id, name: AGT_02.name },
          from: null, to: "정지원", note: null
        },
        {
          id: "EVT-000003", ticketId: "INQ-3003", type: "STATUS_CHANGED",
          at: "2026-07-12T10:36:00+09:00", actor: { id: AGT_02.id, name: AGT_02.name },
          from: "received", to: "in_progress", note: null
        }
      ]
    },
    /* INQ-3004 · on_hold · 배정 → 진행 → 보류(note) */
    {
      id: "INQ-3004",
      subject: "API 연동 문서 오류 문의",
      requester: { name: "한지호", email: "jiho.han@example.com" },
      status: "on_hold",
      assignee: { id: AGT_01.id, name: AGT_01.name },
      createdAt: "2026-07-13T13:00:00+09:00",
      updatedAt: "2026-07-13T14:00:00+09:00",
      history: [
        {
          id: "EVT-000004", ticketId: "INQ-3004", type: "ASSIGNEE_CHANGED",
          at: "2026-07-13T13:05:00+09:00", actor: { id: AGT_01.id, name: AGT_01.name },
          from: null, to: "박운영", note: null
        },
        {
          id: "EVT-000005", ticketId: "INQ-3004", type: "STATUS_CHANGED",
          at: "2026-07-13T13:10:00+09:00", actor: { id: AGT_01.id, name: AGT_01.name },
          from: "received", to: "in_progress", note: null
        },
        {
          id: "EVT-000006", ticketId: "INQ-3004", type: "STATUS_CHANGED",
          at: "2026-07-13T14:00:00+09:00", actor: { id: AGT_01.id, name: AGT_01.name },
          from: "in_progress", to: "on_hold", note: "고객 회신 대기"
        }
      ]
    },
    /* INQ-3005 · resolved · 배정 → 진행 → 해결 */
    {
      id: "INQ-3005",
      subject: "환불 처리 지연 문의",
      requester: { name: "오하은", email: "haeun.oh@example.com" },
      status: "resolved",
      assignee: { id: AGT_02.id, name: AGT_02.name },
      createdAt: "2026-07-14T10:00:00+09:00",
      updatedAt: "2026-07-14T15:30:00+09:00",
      history: [
        {
          id: "EVT-000007", ticketId: "INQ-3005", type: "ASSIGNEE_CHANGED",
          at: "2026-07-14T10:05:00+09:00", actor: { id: AGT_02.id, name: AGT_02.name },
          from: null, to: "정지원", note: null
        },
        {
          id: "EVT-000008", ticketId: "INQ-3005", type: "STATUS_CHANGED",
          at: "2026-07-14T10:10:00+09:00", actor: { id: AGT_02.id, name: AGT_02.name },
          from: "received", to: "in_progress", note: null
        },
        {
          id: "EVT-000009", ticketId: "INQ-3005", type: "STATUS_CHANGED",
          at: "2026-07-14T15:30:00+09:00", actor: { id: AGT_02.id, name: AGT_02.name },
          from: "in_progress", to: "resolved", note: null
        }
      ]
    },
    /* INQ-3006 · in_progress(재오픈) · 배정 → 진행 → 해결 → 재오픈(note) — EC-07 */
    {
      id: "INQ-3006",
      subject: "계정 잠금 해제 요청",
      requester: { name: "서준영", email: "junyoung.seo@example.com" },
      status: "in_progress",
      assignee: { id: AGT_01.id, name: AGT_01.name },
      createdAt: "2026-07-15T08:00:00+09:00",
      updatedAt: "2026-07-15T16:20:00+09:00",
      history: [
        {
          id: "EVT-000010", ticketId: "INQ-3006", type: "ASSIGNEE_CHANGED",
          at: "2026-07-15T08:05:00+09:00", actor: { id: AGT_01.id, name: AGT_01.name },
          from: null, to: "박운영", note: null
        },
        {
          id: "EVT-000011", ticketId: "INQ-3006", type: "STATUS_CHANGED",
          at: "2026-07-15T08:10:00+09:00", actor: { id: AGT_01.id, name: AGT_01.name },
          from: "received", to: "in_progress", note: null
        },
        {
          id: "EVT-000012", ticketId: "INQ-3006", type: "STATUS_CHANGED",
          at: "2026-07-15T12:00:00+09:00", actor: { id: AGT_01.id, name: AGT_01.name },
          from: "in_progress", to: "resolved", note: null
        },
        {
          id: "EVT-000013", ticketId: "INQ-3006", type: "STATUS_CHANGED",
          at: "2026-07-15T16:20:00+09:00", actor: { id: AGT_01.id, name: AGT_01.name },
          from: "resolved", to: "in_progress", note: "고객이 동일 문제 재발 신고 — 재오픈"
        }
      ]
    }
  ];

  /**
   * seed 를 매번 새 객체로 깊은 복제해 반환한다.
   * 상수 배열을 직접 노출하면 런타임 변경이 seed 원본을 오염시키므로(참조 공유) 방지.
   * @returns {Array<object>} Inquiry 배열 깊은 복제본
   */
  function getSeedTickets() {
    return SEED_TICKETS.map(function (t) {
      return {
        id: t.id,
        subject: t.subject,
        requester: { name: t.requester.name, email: t.requester.email },
        status: t.status,
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
    SCHEMA_VERSION: SCHEMA_VERSION,
    SEED_VERSION: SEED_VERSION,
    AGENTS: [{ id: AGT_01.id, name: AGT_01.name }, { id: AGT_02.id, name: AGT_02.name }],
    getSeedTickets: getSeedTickets
  };
});
