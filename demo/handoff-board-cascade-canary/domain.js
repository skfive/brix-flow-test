// 업무 인수인계 보드 — 순수 도메인 로직 (BF-1158).
// 상태별 컬럼(대기/진행/완료)으로 업무 항목을 관리한다.
// DOM/네트워크에 의존하지 않는 순수 함수만 두어 결정론적으로 테스트한다.

/** 보드 상태 컬럼 정의 (표시 순서 고정). */
export const STATUSES = Object.freeze([
  Object.freeze({ id: 'waiting', label: '대기' }),
  Object.freeze({ id: 'in_progress', label: '진행' }),
  Object.freeze({ id: 'done', label: '완료' }),
]);

/** 상태 id 목록. */
export const STATUS_IDS = Object.freeze(STATUSES.map((s) => s.id));

/** 신규 항목의 기본 상태. */
export const DEFAULT_STATUS = 'waiting';

/** 상태 id → 라벨 매핑. */
export const STATUS_LABELS = Object.freeze(
  Object.fromEntries(STATUSES.map((s) => [s.id, s.label])),
);

/**
 * 원시 입력을 검증·정규화해 불변 항목으로 만든다.
 * @param {{id?: unknown, title?: unknown, status?: unknown, assignee?: unknown, note?: unknown}} raw
 * @returns {Readonly<{id: string, title: string, status: string, assignee: string, note: string}>}
 */
function normalizeItem(raw) {
  const title = String(raw.title ?? '').trim();
  if (!title) {
    throw new Error('업무 제목은 비어 있을 수 없습니다.');
  }
  const status = raw.status ?? DEFAULT_STATUS;
  if (!STATUS_IDS.includes(status)) {
    throw new Error(`알 수 없는 상태: ${String(status)}`);
  }
  const id = String(raw.id ?? '').trim();
  if (!id) {
    throw new Error('항목 id는 비어 있을 수 없습니다.');
  }
  return Object.freeze({
    id,
    title,
    status,
    assignee: String(raw.assignee ?? '').trim(),
    note: String(raw.note ?? '').trim(),
  });
}

/**
 * 초기 항목 배열로 보드를 만든다(입력 불변).
 * @param {Array<object>} [items]
 * @returns {{items: ReadonlyArray<object>}}
 */
export function createBoard(items = []) {
  if (!Array.isArray(items)) {
    throw new Error('items 는 배열이어야 합니다.');
  }
  return Object.freeze({ items: Object.freeze(items.map(normalizeItem)) });
}

/**
 * 보드에 업무 항목을 추가한다(불변 — 새 보드 반환).
 * id 미지정 시 결정론적으로 `item-<n>` 을 부여한다.
 * @param {{items: ReadonlyArray<object>}} board
 * @param {{title: string, status?: string, assignee?: string, note?: string, id?: string}} input
 * @returns {{items: ReadonlyArray<object>}}
 */
export function addItem(board, input) {
  const item = normalizeItem({
    id: input.id ?? `item-${board.items.length + 1}`,
    title: input.title,
    status: input.status ?? DEFAULT_STATUS,
    assignee: input.assignee,
    note: input.note,
  });
  return Object.freeze({ items: Object.freeze([...board.items, item]) });
}

/**
 * 상태별로 항목을 그룹핑한다(등장 순서 보존).
 * @param {{items: ReadonlyArray<object>}} board
 * @returns {Record<string, Array<object>>}
 */
export function groupByStatus(board) {
  const groups = Object.fromEntries(STATUS_IDS.map((id) => [id, []]));
  for (const item of board.items) {
    groups[item.status].push(item);
  }
  return groups;
}

/**
 * 상태별로 구분 조회한다. 'all' 은 전체 항목을 반환한다.
 * @param {{items: ReadonlyArray<object>}} board
 * @param {string} [status]
 * @returns {Array<object>}
 */
export function filterByStatus(board, status = 'all') {
  if (status === 'all') {
    return [...board.items];
  }
  if (!STATUS_IDS.includes(status)) {
    throw new Error(`알 수 없는 필터: ${String(status)}`);
  }
  return board.items.filter((item) => item.status === status);
}

/**
 * 상태별 항목 수와 전체 수를 집계한다.
 * @param {{items: ReadonlyArray<object>}} board
 * @returns {Record<string, number>}
 */
export function countsByStatus(board) {
  const groups = groupByStatus(board);
  const counts = { all: board.items.length };
  for (const id of STATUS_IDS) {
    counts[id] = groups[id].length;
  }
  return counts;
}
