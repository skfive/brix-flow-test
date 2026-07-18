// 위험 판정 순수 함수 (s1 §4·§5). 부작용/캐시 없이 매 시점 fixture 원본 + 오버라이드
// 병합값으로 새로 도출한다. referenceNow 는 항상 인자로 주입(Date.now 판정 금지, s1 가정 4).

import { REFERENCE_NOW } from './fixtures.js';

/** status enum → 한글 라벨 (s1 §3.2, 3종 고정). */
export const STATUS_LABELS = Object.freeze({
  pending: '대기',
  in_progress: '진행중',
  done: '완료',
});

/** 유효한 status 값 목록. */
export const VALID_STATUSES = Object.freeze(['pending', 'in_progress', 'done']);

/** 위험 등급 → 한글 라벨 (s1 §5.3). */
export const RISK_LABELS = Object.freeze({
  normal: '정상',
  data_gap: '데이터 누락',
  deadline_exceeded: '기한 초과',
  critical: '복합 위험',
});

/** 필수 값 4개 필드 → 한글 라벨 (누락 안내 D8 용). */
export const REQUIRED_FIELD_LABELS = Object.freeze({
  assignee: '담당자',
  dueAt: '기한',
  status: '상태',
  followUpAction: '후속 액션',
});

/**
 * null/undefined/빈 문자열/공백만으로 구성된 문자열이면 true.
 * @param {unknown} value
 * @returns {boolean}
 */
function isBlank(value) {
  return value == null || (typeof value === 'string' && value.trim() === '');
}

/**
 * dueAt 이 ISO8601 로 파싱 가능한지(유효한지) 여부. (s1 §4.1 V-dueAt)
 * @param {unknown} dueAt
 * @returns {boolean}
 */
export function isDueAtValid(dueAt) {
  if (isBlank(dueAt)) return false;
  return !Number.isNaN(Date.parse(/** @type {string} */ (dueAt)));
}

/**
 * status 값이 3종 유효 enum 에 속하는지. (s1 §4.1 V-status)
 * @param {unknown} status
 * @returns {boolean}
 */
export function isStatusValid(status) {
  return typeof status === 'string' && VALID_STATUSES.includes(status);
}

/**
 * 필수 값 4개 필드(담당자/기한/상태/후속 액션) 중 누락된 필드 키 배열. (s1 §4.1)
 * @param {{assignee?:unknown,dueAt?:unknown,status?:unknown,followUpAction?:unknown}} item
 * @returns {Array<'assignee'|'dueAt'|'status'|'followUpAction'>}
 */
export function getMissingFields(item) {
  /** @type {Array<'assignee'|'dueAt'|'status'|'followUpAction'>} */
  const missing = [];
  if (isBlank(item.assignee)) missing.push('assignee');
  if (!isDueAtValid(item.dueAt)) missing.push('dueAt');
  if (!isStatusValid(item.status)) missing.push('status');
  if (isBlank(item.followUpAction)) missing.push('followUpAction');
  return missing;
}

/**
 * 항목에 필수값 누락이 하나라도 있으면 true. (s1 §4.2)
 * @param {object} item
 * @returns {boolean}
 */
export function hasDataGap(item) {
  return getMissingFields(item).length > 0;
}

/**
 * 기한 초과 여부. (s1 §5.2) — dueAt 유효 & referenceNow 이전 & status 가 'done' 아님.
 * dueAt 누락/파싱불가면 판정 불가 → false 고정(방어적).
 * @param {{dueAt?:unknown,status?:unknown}} item
 * @param {string} [referenceNow]
 * @returns {boolean}
 */
export function hasDeadlineExceeded(item, referenceNow = REFERENCE_NOW) {
  if (!isDueAtValid(item.dueAt)) return false;
  const due = Date.parse(/** @type {string} */ (item.dueAt));
  const ref = Date.parse(referenceNow);
  if (!(due < ref)) return false;
  // status 가 'done' 이면 제외. 누락/비유효 status 는 "완료 아님"으로 간주해 성립.
  return item.status !== 'done';
}

/**
 * 위험 등급 산출 — 우선순위 규칙(s1 §5.3). 순수 파생, 캐시 없음.
 * @param {object} item
 * @param {string} [referenceNow]
 * @returns {'normal'|'data_gap'|'deadline_exceeded'|'critical'}
 */
export function riskLevelOf(item, referenceNow = REFERENCE_NOW) {
  const gap = hasDataGap(item);
  const overdue = hasDeadlineExceeded(item, referenceNow);
  if (gap && overdue) return 'critical';
  if (gap) return 'data_gap';
  if (overdue) return 'deadline_exceeded';
  return 'normal';
}

/**
 * fixture 원본 항목에 오버라이드(후속 액션)를 병합한다. (s1 §7.4)
 * assignee/dueAt/status 는 절대 변경하지 않는다(가정 3).
 * @param {object} item fixture 원본
 * @param {{[id:string]:{followUpAction:string,savedAt:string}}} overrides
 * @returns {object} 병합된 항목(+ 파생/메타 필드)
 */
export function mergeAndCompute(item, overrides = {}, referenceNow = REFERENCE_NOW) {
  const override = overrides[item.id];
  const isOverridden = Boolean(override);
  const merged = isOverridden
    ? { ...item, followUpAction: override.followUpAction }
    : { ...item };
  const missingFields = getMissingFields(merged);
  return {
    ...merged,
    isOverridden,
    savedAt: isOverridden ? override.savedAt : null,
    missingFields,
    hasDataGap: missingFields.length > 0,
    hasDeadlineExceeded: hasDeadlineExceeded(merged, referenceNow),
    riskLevel: riskLevelOf(merged, referenceNow),
  };
}

/**
 * fixture 전체 + 오버라이드로 파생값을 재계산한다(전체 재계산, s1 §7.4).
 * @param {ReadonlyArray<object>} fixture
 * @param {{[id:string]:{followUpAction:string,savedAt:string}}} overrides
 * @param {string} [referenceNow]
 * @returns {Array<object>}
 */
export function computeItems(fixture, overrides = {}, referenceNow = REFERENCE_NOW) {
  return fixture.map((item) => mergeAndCompute(item, overrides, referenceNow));
}

/**
 * 위험 등급별 집계 + 총계. 필터 무관 전체 기준(s1 §5.4).
 * @param {ReadonlyArray<{riskLevel:string}>} computedItems
 * @returns {{normal:number,data_gap:number,deadline_exceeded:number,critical:number,total:number}}
 */
export function summarize(computedItems) {
  const counts = { normal: 0, data_gap: 0, deadline_exceeded: 0, critical: 0 };
  for (const item of computedItems) {
    if (item.riskLevel in counts) counts[item.riskLevel] += 1;
  }
  return { ...counts, total: computedItems.length };
}

/**
 * 위험 유형 필터 적용(단일 선택). 순서는 원본 유지(s1 §6.1). 원본 배열 불변.
 * @param {ReadonlyArray<{riskLevel:string}>} computedItems
 * @param {'all'|'normal'|'data_gap'|'deadline_exceeded'|'critical'} filterValue
 * @returns {Array<object>}
 */
export function filterItems(computedItems, filterValue) {
  if (filterValue === 'all') return computedItems.slice();
  return computedItems.filter((item) => item.riskLevel === filterValue);
}
