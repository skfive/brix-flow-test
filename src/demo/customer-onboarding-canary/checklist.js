// 고객 온보딩 체크리스트 — 순수 파생 로직 (BF-1069)
// 기획 명세 BF-1067 §3(상태 판정 규칙)·§5(함수 시그니처)를 그대로 구현한다.
// 외부 API·Date.now() 등 비결정 의존 없이 입력만으로 결과가 결정된다.

export const READINESS = Object.freeze({
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  READY: 'ready',
});

export const ITEM_STATUS = Object.freeze({
  COMPLETE: 'complete',
  INCOMPLETE: 'incomplete',
  BLOCKED: 'blocked',
});

// catalog(전역 고정) + 고객 진행 데이터를 itemId 기준으로 병합해 화면 표시용 항목 배열을 만든다.
// catalog에는 있으나 고객 데이터에 없는 항목은 방어적으로 incomplete로 처리한다.
export function buildItems(catalog, customer) {
  const statusById = new Map(
    (customer.checklist ?? []).map((entry) => [entry.itemId, entry]),
  );
  return catalog.map((cat) => {
    const entry = statusById.get(cat.itemId) ?? { status: ITEM_STATUS.INCOMPLETE };
    const item = {
      itemId: cat.itemId,
      label: cat.label,
      required: cat.required,
      priority: cat.priority,
      status: entry.status,
    };
    if (entry.completedAt !== undefined) item.completedAt = entry.completedAt;
    if (entry.blockedReason !== undefined) item.blockedReason = entry.blockedReason;
    return item;
  });
}

// §3.2 종합 준비 상태. 판정 우선순위: blocked > not_started(완료 0개) > in_progress > ready.
// required=true 항목만 판정에 사용한다.
export function computeReadiness(items) {
  const required = items.filter((i) => i.required);
  if (required.length === 0) return READINESS.NOT_STARTED;
  if (required.some((i) => i.status === ITEM_STATUS.BLOCKED)) return READINESS.BLOCKED;
  const completed = required.filter((i) => i.status === ITEM_STATUS.COMPLETE).length;
  if (completed === 0) return READINESS.NOT_STARTED;
  if (completed === required.length) return READINESS.READY;
  return READINESS.IN_PROGRESS;
}

// §3.3 진행률. 필수/선택을 분리해 각각 완료 수와 전체 수를 센다.
export function computeProgress(items) {
  const required = items.filter((i) => i.required);
  const optional = items.filter((i) => !i.required);
  const completed = (list) => list.filter((i) => i.status === ITEM_STATUS.COMPLETE).length;
  return {
    requiredCompleted: completed(required),
    requiredTotal: required.length,
    optionalCompleted: completed(optional),
    optionalTotal: optional.length,
  };
}

// priority 오름차순(낮을수록 우선)으로 정렬한 첫 항목을 반환한다. 원본은 변형하지 않는다.
function firstByPriority(items) {
  return [...items].sort((a, b) => a.priority - b.priority)[0];
}

// §3.4 다음 액션 판정.
export function computeNextAction(items, readiness) {
  const required = items.filter((i) => i.required);

  if (readiness === READINESS.READY) {
    return { type: 'completed', message: '온보딩이 완료되었습니다' };
  }

  if (readiness === READINESS.BLOCKED) {
    const target = firstByPriority(required.filter((i) => i.status === ITEM_STATUS.BLOCKED));
    if (target) {
      return { type: 'resolve_block', itemId: target.itemId, message: target.blockedReason };
    }
  }

  // not_started 또는 in_progress: 미완료(비차단) 필수 항목 중 우선순위 최상위 안내.
  const nextIncomplete = firstByPriority(
    required.filter((i) => i.status === ITEM_STATUS.INCOMPLETE),
  );
  if (nextIncomplete) {
    return {
      type: 'complete_item',
      itemId: nextIncomplete.itemId,
      message: `${nextIncomplete.label}을(를) 완료해주세요`,
    };
  }

  // §3.4-4 방어적 fallback (requiredItems 비어있음 등).
  return { type: 'not_ready', message: '체크리스트 준비 중입니다' };
}

// §5 getCustomerChecklistView: 고객 없으면 null(화면은 "고객 정보를 찾을 수 없음").
export function getCustomerChecklistView(customerId, catalog, customers) {
  const customer = customers.find((c) => c.customerId === customerId);
  if (!customer) return null;
  const items = buildItems(catalog, customer);
  const readinessStatus = computeReadiness(items);
  return {
    customerId: customer.customerId,
    displayName: customer.displayName,
    items,
    readinessStatus,
    progress: computeProgress(items),
    nextAction: computeNextAction(items, readinessStatus),
  };
}

// 데모 상호작용: 미완료(비차단) 항목을 로컬 상태로만 완료 처리한 새 customer를 반환(불변).
// completedAt은 호출자가 주입해 결정성을 유지한다. blocked 항목은 완료 처리 불가.
export function applyLocalCompletion(customer, itemId, completedAt) {
  return {
    ...customer,
    checklist: (customer.checklist ?? []).map((entry) => {
      if (entry.itemId !== itemId) return entry;
      if (entry.status === ITEM_STATUS.BLOCKED) return entry; // 차단 항목은 변경 금지
      return { itemId: entry.itemId, status: ITEM_STATUS.COMPLETE, completedAt };
    }),
  };
}

// 데모 인증/세션 가드: 쿼리에서 선택된 고객을 확정한다(외부 인증 없음, 데모 선택 기반).
// 선택 고객이 fixture에 없으면 null → 화면은 "고객 정보를 찾을 수 없음"으로 가드된다.
export function resolveDemoCustomerId(selectedId, customers, fallbackId = 'cust-001') {
  const wanted = selectedId ?? fallbackId;
  return customers.some((c) => c.customerId === wanted) ? wanted : null;
}
