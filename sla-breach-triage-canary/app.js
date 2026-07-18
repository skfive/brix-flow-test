// SLA 위반 대응 큐 — 브라우저 렌더링/상태 배선 (BF-1057)
// 순수 로직은 queue.js 에 위임. 여기서는 in-memory state + DOM 렌더 + 이벤트만 담당(기획 §6).
// 외부 네트워크/영속화 없음. 새로고침 시 fixture 초기값으로 리셋(의도된 동작).

import {
  sortQueue,
  assignRequest,
  resolveRequest,
  unassignRequest,
} from "./queue.js";
import { cloneFixtures } from "./fixtures.js";

const SEVERITY_LABEL = { critical: "긴급", high: "높음", medium: "보통", low: "낮음" };
const STATUS_LABEL = { pending: "대기", assigned: "담당지정", resolved: "해결" };

// ── in-memory 상태 ────────────────────────────────────────────────
let state = cloneFixtures();
// 카드별 draft 입력값/에러(재렌더 사이 유지). key = requestId.
const drafts = new Map(); // id -> { assignee?, note? }
const errors = new Map(); // id -> string

function getDraft(id) {
  return drafts.get(id) || {};
}

// ── 유틸: 안전한 텍스트 노드 생성(XSS 방지, textContent 사용) ─────
function el(tag, opts = {}, children = []) {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.text != null) node.textContent = opts.text;
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) {
      if (v != null) node.setAttribute(k, String(v));
    }
  }
  for (const c of children) if (c) node.appendChild(c);
  return node;
}

function formatDateTime(iso) {
  // ISO 문자열을 "YYYY-MM-DD HH:mm" 로 표기(로케일 무관, 결정적). 실패 시 원문.
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || "");
  if (!m) return iso || "";
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`;
}

function nowIso() {
  // 호출부 주입용 현재 시각. 테스트에서는 queue.js 함수에 고정값을 넘겨 검증.
  return new Date().toISOString();
}

// ── 배지 ──────────────────────────────────────────────────────────
function severityBadge(severity) {
  return el("span", {
    class: `sla-badge sla-badge-severity sev-${severity}`,
    text: SEVERITY_LABEL[severity],
    attrs: { "aria-label": `위험도: ${SEVERITY_LABEL[severity]}` },
  });
}

function statusBadge(status) {
  return el("span", {
    class: `sla-badge sla-badge-status st-${status}`,
    text: STATUS_LABEL[status],
    attrs: { "aria-label": `상태: ${STATUS_LABEL[status]}` },
  });
}

// ── 카드 상단 공통 ─────────────────────────────────────────────────
function cardTop(req) {
  return el("div", { class: "sla-card__top" }, [
    severityBadge(req.severity),
    el("h3", { class: "sla-card__title", text: req.title }),
    statusBadge(req.status),
  ]);
}

function cardMeta(req) {
  const parts = [req.customer, `위반 ${formatDateTime(req.breachedAt)}`];
  if (req.status === "assigned" && req.assignee) parts.push(`담당: ${req.assignee}`);
  return el("p", { class: "sla-card__meta", text: parts.join(" · ") });
}

function cardOverdue(req) {
  const p = el("p", { class: "sla-card__overdue" });
  p.appendChild(document.createTextNode("SLA 초과: "));
  p.appendChild(el("b", { text: String(req.slaMinutesOverdue) }));
  p.appendChild(document.createTextNode("분"));
  return p;
}

function inlineError(id, message) {
  // 값이 있을 때만 내용을 채운다. 비어 있으면 CSS `:empty` 로 숨김(명세 §5.5).
  const children = message
    ? [
        el("span", { text: "⚠", attrs: { "aria-hidden": "true" } }),
        document.createTextNode(" " + message),
      ]
    : [];
  return el("p", {
    class: "sla-inline-error",
    attrs: { id: `err-${id}`, role: "alert", "aria-live": "polite" },
  }, children);
}

// ── 상태별 액션 영역 ───────────────────────────────────────────────
function pendingActions(req) {
  const err = errors.get(req.id) || "";
  const draft = getDraft(req.id);
  const inputId = `assignee-${req.id}`;
  const errId = `err-${req.id}`;

  const input = el("input", {
    class: "sla-input",
    attrs: {
      id: inputId,
      type: "text",
      placeholder: "담당자 이름 입력",
      value: draft.assignee || "",
      "aria-describedby": errId,
      "aria-invalid": err ? "true" : null,
    },
  });
  input.value = draft.assignee || "";
  input.addEventListener("input", (e) => {
    drafts.set(req.id, { ...getDraft(req.id), assignee: e.target.value });
  });

  const field = el("div", { class: "sla-field" }, [
    el("label", { text: "담당자", attrs: { for: inputId } }),
    input,
  ]);

  const btn = el("button", {
    class: "sla-btn sla-btn--primary",
    text: "담당 지정",
    attrs: { type: "button" },
  });
  btn.addEventListener("click", () => {
    const value = getDraft(req.id).assignee || "";
    const res = assignRequest(state, req.id, value, nowIso());
    handleResult(req.id, res);
  });

  return el("div", { class: "sla-card__actions" }, [
    el("div", { class: "sla-row" }, [field, btn]),
    inlineError(req.id, err),
  ]);
}

function assignedActions(req) {
  const err = errors.get(req.id) || "";
  const draft = getDraft(req.id);
  const noteId = `note-${req.id}`;
  const errId = `err-${req.id}`;

  const textarea = el("textarea", {
    class: "sla-textarea",
    attrs: {
      id: noteId,
      placeholder: "해결 내용을 입력하세요",
      "aria-describedby": errId,
      "aria-invalid": err ? "true" : null,
    },
  });
  textarea.value = draft.note || "";
  textarea.addEventListener("input", (e) => {
    drafts.set(req.id, { ...getDraft(req.id), note: e.target.value });
  });

  const field = el("div", { class: "sla-field" }, [
    el("label", { text: "해결 메모", attrs: { for: noteId } }),
    textarea,
  ]);

  const resolveBtn = el("button", {
    class: "sla-btn sla-btn--primary",
    text: "해결 처리",
    attrs: { type: "button" },
  });
  resolveBtn.addEventListener("click", () => {
    const value = getDraft(req.id).note || "";
    const res = resolveRequest(state, req.id, value, nowIso());
    handleResult(req.id, res);
  });

  const unassignBtn = el("button", {
    class: "sla-btn sla-btn--secondary",
    text: "담당 해제",
    attrs: { type: "button" },
  });
  unassignBtn.addEventListener("click", () => {
    const res = unassignRequest(state, req.id);
    handleResult(req.id, res);
  });

  return el("div", { class: "sla-card__actions" }, [
    field,
    el("div", { class: "sla-row" }, [resolveBtn, unassignBtn]),
    inlineError(req.id, err),
  ]);
}

// resolved: 읽기전용, 액션 버튼 미노출(AC-5)
function resolvedReadonly(req) {
  const dl = el("dl", { class: "sla-readonly" });
  const rows = [
    ["담당자", req.assignee],
    ["해결 메모", req.resolutionNote],
    ["해결 시각", formatDateTime(req.resolvedAt)],
  ];
  for (const [term, desc] of rows) {
    dl.appendChild(el("dt", { text: term }));
    dl.appendChild(el("dd", { text: desc }));
  }
  return dl;
}

// ── 카드 ──────────────────────────────────────────────────────────
function renderCard(req) {
  const isResolved = req.status === "resolved";
  const card = el("article", {
    class: isResolved ? "sla-card sla-card--resolved" : "sla-card",
  }, [cardTop(req), cardMeta(req), cardOverdue(req)]);

  if (req.status === "pending") card.appendChild(pendingActions(req));
  else if (req.status === "assigned") card.appendChild(assignedActions(req));
  else card.appendChild(resolvedReadonly(req));

  return card;
}

// ── 액션 결과 처리 ─────────────────────────────────────────────────
function handleResult(id, res) {
  if (res.ok) {
    // in-memory state 에서 해당 항목 교체(불변 갱신)
    state = state.map((r) => (r.id === id ? res.data : r));
    errors.delete(id);
    drafts.delete(id); // 전이 완료 후 draft 초기화
  } else {
    errors.set(id, res.error);
  }
  render();
}

// ── 전체 렌더 ──────────────────────────────────────────────────────
export function render() {
  const root = document.getElementById("sla-root");
  if (!root) return;
  root.textContent = "";

  const { pendingQueue, resolvedQueue } = sortQueue(state);
  const validTotal = pendingQueue.length + resolvedQueue.length;

  // 헤더 + 요약
  const header = el("header", { class: "sla-header" }, [
    el("h1", { text: "SLA 위반 대응 큐" }),
  ]);
  const summary = el("p", { class: "sla-summary" });
  const addSummary = (label, count) => {
    const span = el("span", {}, [document.createTextNode(label + " ")]);
    span.appendChild(el("strong", { text: String(count) }));
    span.appendChild(document.createTextNode("건"));
    summary.appendChild(span);
  };
  addSummary("대응 대기", pendingQueue.length);
  addSummary("해결 완료", resolvedQueue.length);
  addSummary("전체 유효", validTotal);
  header.appendChild(summary);
  root.appendChild(header);

  // ① 대응 대기열
  const queueSection = el("section", {
    class: "sla-section",
    attrs: { "aria-labelledby": "queue-heading" },
  }, [
    el("h2", { text: `대응 대기열 (${pendingQueue.length})`, attrs: { id: "queue-heading" } }),
  ]);
  if (pendingQueue.length === 0) {
    queueSection.appendChild(el("div", {
      class: "sla-empty",
      text: "대응 대기 중인 요청이 없습니다.",
      attrs: { role: "status" },
    }));
  } else {
    for (const req of pendingQueue) queueSection.appendChild(renderCard(req));
  }
  root.appendChild(queueSection);

  // ② 해결됨
  const resolvedSection = el("section", {
    class: "sla-section",
    attrs: { "aria-labelledby": "resolved-heading" },
  }, [
    el("h2", { text: `해결됨 (${resolvedQueue.length})`, attrs: { id: "resolved-heading" } }),
  ]);
  if (resolvedQueue.length === 0) {
    resolvedSection.appendChild(el("div", {
      class: "sla-empty",
      text: "해결된 요청이 없습니다.",
      attrs: { role: "status" },
    }));
  } else {
    for (const req of resolvedQueue) resolvedSection.appendChild(renderCard(req));
  }
  root.appendChild(resolvedSection);
}

// ── 초기 구동 ──────────────────────────────────────────────────────
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
}
