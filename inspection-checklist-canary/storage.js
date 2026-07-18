/* inspection-checklist-canary/storage.js
 * 현장 점검 체크리스트 — 도메인 순수 로직 + versioned localStorage adapter
 * SSOT(도메인 규칙): docs/plan/inspection-checklist-canary-BF-1024.md (§2~§8)
 * 표시 계층 가이드: docs/design/inspection-checklist-canary-BF-1024.md
 * UMD 패턴 — 브라우저: globalThis.InspectionChecklist / Node 단위 테스트: module.exports
 * file:// CORS 안전 — 외부 CDN / fetch / ES import|export 0건. 순수 함수엔 Date.now/Math.random 없음.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api; // Node 단위 테스트
  }
  if (root) {
    root.InspectionChecklist = api; // 브라우저 전역
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ── 저장소 상수 (planner §7.1) ───────────────────────────
  var STORAGE_KEY = "inspection-checklist-canary:v1";
  var SCHEMA_VERSION = 1;

  // ── 상태 enum · 라벨 (planner §3.1) ─────────────────────
  var STATUSES = ["todo", "in_progress", "blocked", "done"];
  var STATUS_LABELS = {
    todo: "예정",
    in_progress: "진행중",
    blocked: "차단됨",
    done: "완료",
  };

  // ── 담당자 후보 2명 고정 (planner §8.1) ─────────────────
  var ASSIGNEES = [
    { id: "insp-01", name: "김현장" },
    { id: "insp-02", name: "이점검" },
  ];

  // ── 허용 전이표 (planner §3.2). 미정의 전이는 목록에서 제외 → 버튼 미렌더 ──
  var TRANSITIONS = {
    todo: ["in_progress", "blocked"],
    in_progress: ["done", "blocked", "todo"],
    blocked: ["todo", "in_progress"],
    done: ["in_progress"],
  };

  // ── 결정적 seed 7건 (planner §8.2). 고정 리터럴만 — Date.now/random 금지 ──
  // createdAt: IC-2001=09:00 부터 1시간 간격. updatedAt = 마지막 history at (없으면 createdAt).
  var K = { id: "insp-01", name: "김현장" };
  var L = { id: "insp-02", name: "이점검" };
  var BLOCK_2005 = "밸브실 잠김 — 관리사무소 열쇠 대기 중";
  var BLOCK_2007 = "자재 반입 지연 — 후속 확인 필요";

  var SEED_ITEMS = [
    {
      id: "IC-2001",
      title: "1층 비상구 표지등 점검",
      location: "1F 로비",
      assignee: null,
      status: "todo",
      blockReason: null,
      history: [], // seed 이후 무변경 — 빈 history 정상 케이스 (EC-L)
      createdAt: "2026-07-01T09:00:00.000Z",
      updatedAt: "2026-07-01T09:00:00.000Z",
    },
    {
      id: "IC-2002",
      title: "3층 소화기 압력 게이지 확인",
      location: "3F 동관",
      assignee: { id: "insp-01", name: "김현장" },
      status: "todo",
      blockReason: null,
      history: [
        { type: "ASSIGNEE_CHANGED", at: "2026-07-01T10:10:00.000Z", actor: "김현장", from: null, to: "김현장", reason: null },
      ],
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T10:10:00.000Z",
    },
    {
      id: "IC-2003",
      title: "지하 1층 배전반 점검",
      location: "B1 기계실",
      assignee: { id: "insp-01", name: "김현장" },
      status: "in_progress",
      blockReason: null,
      history: [
        { type: "ASSIGNEE_CHANGED", at: "2026-07-01T11:10:00.000Z", actor: "김현장", from: null, to: "김현장", reason: null },
        { type: "STATUS_CHANGED", at: "2026-07-01T11:20:00.000Z", actor: "김현장", from: "todo", to: "in_progress", reason: null },
      ],
      createdAt: "2026-07-01T11:00:00.000Z",
      updatedAt: "2026-07-01T11:20:00.000Z",
    },
    {
      id: "IC-2004",
      title: "옥상 저수조 수위 확인",
      location: "RF 옥상",
      assignee: { id: "insp-02", name: "이점검" },
      status: "in_progress",
      blockReason: null,
      history: [
        { type: "ASSIGNEE_CHANGED", at: "2026-07-01T12:10:00.000Z", actor: "이점검", from: null, to: "이점검", reason: null },
        { type: "STATUS_CHANGED", at: "2026-07-01T12:20:00.000Z", actor: "이점검", from: "todo", to: "in_progress", reason: null },
      ],
      createdAt: "2026-07-01T12:00:00.000Z",
      updatedAt: "2026-07-01T12:20:00.000Z",
    },
    {
      id: "IC-2005",
      title: "2층 스프링클러 밸브 점검",
      location: "2F 서관",
      assignee: { id: "insp-02", name: "이점검" },
      status: "blocked",
      blockReason: BLOCK_2005,
      history: [
        { type: "ASSIGNEE_CHANGED", at: "2026-07-01T13:10:00.000Z", actor: "이점검", from: null, to: "이점검", reason: null },
        { type: "STATUS_CHANGED", at: "2026-07-01T13:20:00.000Z", actor: "이점검", from: "todo", to: "in_progress", reason: null },
        { type: "STATUS_CHANGED", at: "2026-07-01T13:40:00.000Z", actor: "이점검", from: "in_progress", to: "blocked", reason: null },
        { type: "BLOCK_SET", at: "2026-07-01T13:40:00.000Z", actor: "이점검", from: null, to: null, reason: BLOCK_2005 },
      ],
      createdAt: "2026-07-01T13:00:00.000Z",
      updatedAt: "2026-07-01T13:40:00.000Z",
    },
    {
      id: "IC-2006",
      title: "주차장 CCTV 사각지대 점검",
      location: "B2 주차장",
      assignee: { id: "insp-01", name: "김현장" },
      status: "done",
      blockReason: null,
      history: [
        { type: "ASSIGNEE_CHANGED", at: "2026-07-01T14:10:00.000Z", actor: "김현장", from: null, to: "김현장", reason: null },
        { type: "STATUS_CHANGED", at: "2026-07-01T14:20:00.000Z", actor: "김현장", from: "todo", to: "in_progress", reason: null },
        { type: "STATUS_CHANGED", at: "2026-07-01T14:30:00.000Z", actor: "김현장", from: "in_progress", to: "done", reason: null },
      ],
      createdAt: "2026-07-01T14:00:00.000Z",
      updatedAt: "2026-07-01T14:30:00.000Z",
    },
    {
      id: "IC-2007",
      title: "옥외 소화전 동파 방지 점검",
      location: "옥외 주차장",
      assignee: { id: "insp-02", name: "이점검" },
      status: "in_progress",
      blockReason: null, // 차단 해제 후 재개 → 현재 사유 없음
      history: [
        { type: "ASSIGNEE_CHANGED", at: "2026-07-01T15:10:00.000Z", actor: "이점검", from: null, to: "이점검", reason: null },
        { type: "STATUS_CHANGED", at: "2026-07-01T15:20:00.000Z", actor: "이점검", from: "todo", to: "in_progress", reason: null },
        { type: "STATUS_CHANGED", at: "2026-07-01T15:30:00.000Z", actor: "이점검", from: "in_progress", to: "blocked", reason: null },
        { type: "BLOCK_SET", at: "2026-07-01T15:30:00.000Z", actor: "이점검", from: null, to: null, reason: BLOCK_2007 },
        { type: "STATUS_CHANGED", at: "2026-07-01T15:40:00.000Z", actor: "이점검", from: "blocked", to: "in_progress", reason: null },
        { type: "BLOCK_CLEARED", at: "2026-07-01T15:40:00.000Z", actor: "이점검", from: null, to: null, reason: BLOCK_2007 },
      ],
      createdAt: "2026-07-01T15:00:00.000Z",
      updatedAt: "2026-07-01T15:40:00.000Z",
    },
  ];

  // 매 접근 새 복사본 반환 (참조 공유 방지 — 결정적·불변). 함수 없는 순수 데이터라 JSON round-trip 안전.
  function freshSeed() {
    return JSON.parse(JSON.stringify(SEED_ITEMS));
  }

  // ── 항목 얕은 clone (불변 갱신용) ────────────────────────
  function cloneItem(item) {
    return {
      id: item.id,
      title: item.title,
      location: item.location,
      assignee: item.assignee ? { id: item.assignee.id, name: item.assignee.name } : null,
      status: item.status,
      blockReason: item.blockReason,
      history: item.history.slice(),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  // ── 전이 가드 판정 (planner §3.2) ───────────────────────
  // 반환: { ok, code, reason, requiresReason }
  //  - ok=false, code="UNDEFINED": 미정의 전이(버튼 미렌더 대상)
  //  - ok=false, code="G1": 담당자 미배정으로 착수 불가
  //  - ok=true,  code="G2", requiresReason=true: 차단 사유 입력 필요
  function checkGuard(item, to) {
    var from = item.status;
    var defined = TRANSITIONS[from] && TRANSITIONS[from].indexOf(to) !== -1;
    if (!defined) {
      return { ok: false, code: "UNDEFINED", reason: null, requiresReason: false };
    }
    if (from === "todo" && to === "in_progress" && !item.assignee) {
      return { ok: false, code: "G1", reason: "담당자 배정 후 진행 가능", requiresReason: false };
    }
    if (to === "blocked") {
      return { ok: true, code: "G2", reason: null, requiresReason: true };
    }
    return { ok: true, code: null, reason: null, requiresReason: false };
  }

  // 특정 상태에서 렌더 대상(정의된) 전이 목록
  function allowedTransitions(status) {
    return (TRANSITIONS[status] || []).slice();
  }

  // ── 상태 전이 적용 (불변 — 새 item 반환) ─────────────────
  // ctx: { actor, at, reason }. reason 은 to==="blocked" 일 때만 필수(G2).
  // 반환: { ok:true, item } | { ok:false, code }
  function applyTransition(item, to, ctx) {
    ctx = ctx || {};
    var guard = checkGuard(item, to);
    if (!guard.ok) {
      return { ok: false, code: guard.code };
    }
    var at = ctx.at || item.updatedAt;
    var actor = ctx.actor || "system";
    var from = item.status;
    var next = cloneItem(item);
    var history = next.history;

    // 차단 전이는 사유 필수 검증을 STATUS_CHANGED append 이전에 수행 (사유 없으면 전이 자체 거부)
    if (to === "blocked") {
      var reason = ctx.reason;
      if (typeof reason !== "string" || reason.trim() === "") {
        return { ok: false, code: "G2" };
      }
    }

    next.status = to;
    history.push({ type: "STATUS_CHANGED", at: at, actor: actor, from: from, to: to, reason: null });

    if (to === "blocked") {
      next.blockReason = ctx.reason;
      history.push({ type: "BLOCK_SET", at: at, actor: actor, from: null, to: null, reason: ctx.reason });
    } else if (from === "blocked") {
      // 차단 해제(§5 G3) — 사유 자동 null, 직전 사유는 감사 추적용으로 history 보존
      var prevReason = item.blockReason;
      next.blockReason = null;
      history.push({ type: "BLOCK_CLEARED", at: at, actor: actor, from: null, to: null, reason: prevReason });
    }

    next.updatedAt = at;
    return { ok: true, item: next };
  }

  // ── 담당자 배정/재배정/해제 (planner §4) ─────────────────
  // assignee: { id, name } | null. ctx: { actor, at }
  // 반환: { ok:true, item } | { ok:false, code }
  //  - DONE_LOCKED: done 상태는 배정 잠금(재오픈 먼저)
  //  - REQUIRE_ASSIGNEE: in_progress/blocked 는 담당자 해제 불가 (EC-A)
  function assign(item, assignee, ctx) {
    ctx = ctx || {};
    if (item.status === "done") {
      return { ok: false, code: "DONE_LOCKED" };
    }
    if ((item.status === "in_progress" || item.status === "blocked") && !assignee) {
      return { ok: false, code: "REQUIRE_ASSIGNEE" };
    }
    var fromName = item.assignee ? item.assignee.name : null;
    var toName = assignee ? assignee.name : null;
    if (fromName === toName) {
      return { ok: true, item: cloneItem(item) }; // 변화 없음 — 이력 생략
    }
    var at = ctx.at || item.updatedAt;
    var actor = ctx.actor || "system";
    var next = cloneItem(item);
    next.assignee = assignee ? { id: assignee.id, name: assignee.name } : null;
    next.history.push({ type: "ASSIGNEE_CHANGED", at: at, actor: actor, from: fromName, to: toName, reason: null });
    next.updatedAt = at;
    return { ok: true, item: next };
  }

  // ── 집계 (planner §9.2 · design §5.1) ───────────────────
  function computeStats(items) {
    var total = items.length;
    var unassigned = 0;
    var blocked = 0;
    for (var i = 0; i < items.length; i++) {
      if (!items[i].assignee) unassigned++;
      if (items[i].status === "blocked") blocked++;
    }
    return { total: total, unassigned: unassigned, blocked: blocked };
  }

  // status 별 그룹핑 (원본 순서 유지)
  function groupByStatus(items) {
    var groups = { todo: [], in_progress: [], blocked: [], done: [] };
    for (var i = 0; i < items.length; i++) {
      var s = items[i].status;
      if (groups[s]) groups[s].push(items[i]);
    }
    return groups;
  }

  // ── 손상 판정 (planner §7.3 D4~D7) ───────────────────────
  function isValidItem(it) {
    if (!it || typeof it !== "object") return false;
    if (typeof it.id !== "string" || typeof it.title !== "string" || typeof it.location !== "string") return false;
    if (typeof it.createdAt !== "string" || typeof it.updatedAt !== "string") return false;
    if (!("assignee" in it)) return false; // D4 필수 필드
    if (it.assignee !== null) {
      if (typeof it.assignee !== "object" || typeof it.assignee.id !== "string" || typeof it.assignee.name !== "string") return false;
    }
    if (STATUSES.indexOf(it.status) === -1) return false; // D5 enum 위반
    if (!("blockReason" in it)) return false; // D4 필수 필드
    // D6 blockReason-상태 결합 규칙
    if (it.status === "blocked") {
      if (!it.blockReason) return false; // blocked 인데 falsy
    } else if (it.blockReason !== null) {
      return false; // blocked 아닌데 non-null
    }
    if (!Array.isArray(it.history)) return false; // D7
    return true;
  }

  // ── load: read → parse → 검증. 실패 시 seed 폴백 (planner §7.2·§7.3) ──
  // 반환: { items, source:"stored"|"seed", corrupted, reason }
  //  - corrupted=true 는 D2~D7(실제 손상)에서만 → app 계층이 사용자 경고 노출
  //  - D1(최초 방문)은 정상 seed 채움 → corrupted=false
  function load(storageLike) {
    var raw = null;
    if (storageLike && typeof storageLike.getItem === "function") {
      try {
        raw = storageLike.getItem(STORAGE_KEY);
      } catch (e) {
        raw = null;
      }
    }
    if (raw === null || raw === undefined) {
      return { items: freshSeed(), source: "seed", corrupted: false, reason: "D1" }; // 최초 방문 — 정상
    }
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return recover("D2", "JSON 파싱 실패");
    }
    if (!parsed || typeof parsed !== "object" || parsed.schemaVersion !== SCHEMA_VERSION) {
      return recover("D3", "schemaVersion 불일치 또는 누락");
    }
    if (!Array.isArray(parsed.items)) {
      return recover("D4", "items 가 배열이 아님");
    }
    for (var i = 0; i < parsed.items.length; i++) {
      if (!isValidItem(parsed.items[i])) {
        return recover("D4-D7", "항목 구조/불변식 위반 (index " + i + ")");
      }
    }
    return { items: parsed.items, source: "stored", corrupted: false, reason: null };
  }

  function recover(code, detail) {
    return { items: freshSeed(), source: "seed", corrupted: true, reason: code + ": " + detail };
  }

  // ── save: envelope 동기 write (planner §7.2). storage 없으면 조용히 무시 ──
  function save(storageLike, items, at) {
    if (!storageLike || typeof storageLike.setItem !== "function") {
      return false;
    }
    var envelope = {
      schemaVersion: SCHEMA_VERSION,
      items: items,
      updatedAt: at || latestUpdatedAt(items),
    };
    try {
      storageLike.setItem(STORAGE_KEY, JSON.stringify(envelope));
      return true;
    } catch (e) {
      // 프라이빗 모드 / 쿼터 초과 등 → 흡수, 크래시 금지
      return false;
    }
  }

  function latestUpdatedAt(items) {
    var max = "";
    for (var i = 0; i < items.length; i++) {
      if (items[i].updatedAt > max) max = items[i].updatedAt;
    }
    return max || "1970-01-01T00:00:00.000Z";
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    STATUSES: STATUSES,
    STATUS_LABELS: STATUS_LABELS,
    ASSIGNEES: ASSIGNEES,
    TRANSITIONS: TRANSITIONS,
    get SEED() {
      return freshSeed();
    },
    checkGuard: checkGuard,
    allowedTransitions: allowedTransitions,
    applyTransition: applyTransition,
    assign: assign,
    computeStats: computeStats,
    groupByStatus: groupByStatus,
    isValidItem: isValidItem,
    load: load,
    save: save,
  };
});
