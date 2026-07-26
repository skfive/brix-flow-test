// 워크플로 펄스 — 상태 전이 순수 로직 모듈 (BF-1209)
// 기획 명세 docs/planning/workflow-pulse-BF-1207.md §2/§5/§6 을 재해석 없이 상수로 구현한다.
// 부수효과 없음: 네트워크/영속화(localStorage 등)/DOM 접근 없음. 결정론적 상수만 사용.

/**
 * @typedef {"requested"|"planning"|"in_development"|"in_review"|"testing"|"done"} WorkflowState
 * @typedef {"ADVANCE"|"REJECT"} WorkflowAction
 * @typedef {{ id: string, title: string, assignee: string, state: WorkflowState, history: WorkflowState[] }} WorkflowItem
 */

// §2.1 상태 enum (6단계 고정, 순서 = 파이프라인 좌→우)
export const WORKFLOW_STATES = /** @type {WorkflowState[]} */ ([
  'requested',
  'planning',
  'in_development',
  'in_review',
  'testing',
  'done',
]);

// §2.2 상태별 표시 메타 (라벨/아이콘/활성 여부/버튼 규칙 §6.1).
// active: §2.3 "진행 중"(pulse 대상) 후보 상태. 실제 pulse 는 항목이 1개 이상일 때만 적용(렌더 소관).
export const STATE_META = Object.freeze({
  requested:      { label: '요청',   icon: '⬚', active: false, buttons: [{ action: 'ADVANCE', label: '기획 시작' }] },
  planning:       { label: '기획',   icon: '✎', active: true,  buttons: [{ action: 'ADVANCE', label: '구현 시작' }] },
  in_development: { label: '구현',   icon: '⌨', active: true,  buttons: [{ action: 'ADVANCE', label: '리뷰 요청' }] },
  in_review:      { label: '리뷰',   icon: '⌕', active: true,  buttons: [{ action: 'ADVANCE', label: '승인(다음 단계로)' }, { action: 'REJECT', label: '반려' }] },
  testing:        { label: '테스트', icon: '✔', active: true,  buttons: [{ action: 'ADVANCE', label: '테스트 완료' }] },
  done:           { label: '완료',   icon: '●', active: false, buttons: [] },
});

// §2.3 전이 테이블 (authoritative). key = `${state}:${action}` → 다음 상태.
// 표에 없는 (state, action) 조합은 no-op (임의 스킵/역행 금지).
const TRANSITIONS = Object.freeze({
  'requested:ADVANCE': 'planning',
  'planning:ADVANCE': 'in_development',
  'in_development:ADVANCE': 'in_review',
  'in_review:ADVANCE': 'testing',
  'in_review:REJECT': 'in_development',
  'testing:ADVANCE': 'done',
  // done: 전이 없음 (터미널 상태)
});

// §5 시드 상수 (결정론적). Date.now()/Math.random() 사용 금지.
const SEED_ITEMS = Object.freeze([
  { id: 'wf-1', title: '로그인 실패 알림 문구 개선 요청', assignee: '박기획', state: 'requested' },
  { id: 'wf-2', title: '다크모드 색상 대비 조정', assignee: '박기획', state: 'requested' },
  { id: 'wf-3', title: '알림 배지 카운트 API 연동 기획', assignee: '김디자', state: 'planning' },
  { id: 'wf-4', title: '검색 필터 UI 개편', assignee: '이개발', state: 'in_development' },
  { id: 'wf-5', title: '결제 실패 재시도 로직 구현', assignee: '이개발', state: 'in_development' },
  { id: 'wf-6', title: '프로필 이미지 업로드 개선', assignee: '최리뷰', state: 'in_review' },
  { id: 'wf-7', title: '대시보드 위젯 정렬 저장 기능', assignee: '정테스터', state: 'testing' },
  { id: 'wf-8', title: '알림 이메일 발송 템플릿 정리', assignee: '정테스터', state: 'done' },
]);

/**
 * §5 시드 데이터를 그대로 옮긴 초기 배열을 반환한다(매 호출 동일 결과, 독립 복사본).
 * 각 항목 history 는 [초기 state] 하나로 시작한다.
 * @returns {WorkflowItem[]}
 */
export function createInitialWorkflowItems() {
  return SEED_ITEMS.map((seed) => ({
    id: seed.id,
    title: seed.title,
    assignee: seed.assignee,
    state: /** @type {WorkflowState} */ (seed.state),
    history: [/** @type {WorkflowState} */ (seed.state)],
  }));
}

/**
 * 순수 함수 — 부수효과 없음. §2.3 표에 있는 (state, action) 이면 다음 상태로 전이한 새 item 을 반환,
 * 없으면(터미널/미정의 조합/알 수 없는 상태) item 을 변경 없이 그대로 반환한다(no-op).
 * @param {WorkflowItem} item
 * @param {WorkflowAction} action
 * @returns {WorkflowItem}
 */
export function transitionWorkflowItem(item, action) {
  const next = TRANSITIONS[`${item.state}:${action}`];
  if (next === undefined) {
    return item; // 정의되지 않은 전이 → 변경 없이 반환 (폴백 추정 금지)
  }
  return {
    ...item,
    state: next,
    history: [...item.history, next],
  };
}

/**
 * id 로 지정한 항목에만 전이를 적용한 새 배열을 반환한다. 대상이 없으면 전체 변경 없음(no-op).
 * 다른 항목은 영향받지 않는다(§3 시나리오2).
 * @param {WorkflowItem[]} items
 * @param {string} id
 * @param {WorkflowAction} action
 * @returns {WorkflowItem[]}
 */
export function applyAction(items, id, action) {
  return items.map((item) => (item.id === id ? transitionWorkflowItem(item, action) : item));
}

/**
 * 상태별 항목 개수를 반환한다(파이프라인 레일/컬럼 카운트용). 모든 상태 키를 0 으로 초기화 후 집계.
 * @param {WorkflowItem[]} items
 * @returns {Record<WorkflowState, number>}
 */
export function countByState(items) {
  const counts = /** @type {Record<WorkflowState, number>} */ ({});
  for (const state of WORKFLOW_STATES) counts[state] = 0;
  for (const item of items) {
    if (counts[item.state] !== undefined) counts[item.state] += 1;
  }
  return counts;
}
