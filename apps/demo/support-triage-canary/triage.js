// 고객 문의 분류 SPA — 순수 로직 모듈 (BF-1150)
// DOM 의존 없음. index.html 과 테스트가 함께 import 한다. vanilla-static 규약(ESM, 외부 의존성 0).

import { INQUIRIES } from '../fixtures/support-triage-canary/inquiries.js';

// ---- 축(axis) 메타데이터 ---------------------------------------------------

/** 우선순위: 서열 축(긴급 > 일반). glyph + 카드 좌측 accent 로 이중 인코딩. */
export const PRIORITY_META = Object.freeze({
  urgent: { key: 'urgent', label: '긴급', glyph: '🔥' },
  normal: { key: 'normal', label: '일반', glyph: '' },
});

/** 담당 영역: 범주형 축(색 서열 없음). outline 태그로 표시. */
export const AREA_META = Object.freeze({
  billing: { key: 'billing', label: '결제', glyph: '💳' },
  account: { key: 'account', label: '계정', glyph: '👤' },
  delivery: { key: 'delivery', label: '배송', glyph: '📦' },
  technical: { key: 'technical', label: '기술', glyph: '🛠' },
});

/** 처리 상태: 신규/처리중/완료. dot + soft 배지. */
export const STATUS_META = Object.freeze({
  new: { key: 'new', label: '신규' },
  progress: { key: 'progress', label: '처리중' },
  done: { key: 'done', label: '완료' },
});

export const PRIORITY_KEYS = Object.freeze(Object.keys(PRIORITY_META));
export const AREA_KEYS = Object.freeze(Object.keys(AREA_META));
export const STATUS_KEYS = Object.freeze(Object.keys(STATUS_META));

/** 필터 기본 상태: 두 축 모두 'all'(해제). */
export const DEFAULT_FILTER = Object.freeze({ priority: 'all', area: 'all' });

/** 알 수 없는 필터 키 사용 시 던지는 오류. */
export class UnknownFilterError extends Error {
  constructor(axis, value) {
    super(`알 수 없는 ${axis} 필터 값: ${String(value)}`);
    this.name = 'UnknownFilterError';
    this.axis = axis;
    this.value = value;
  }
}

// ---- fixture 로드 (fetch 성공 시뮬레이션) ----------------------------------

/**
 * 정적 fixture 를 복제해 Promise 로 반환한다(네트워크 없이 fetch 성공을 모사).
 * 반환 배열/항목은 원본과 분리되어 호출측 변경이 fixture 를 오염시키지 않는다.
 * @returns {Promise<Array<object>>}
 */
export function loadInquiries() {
  return Promise.resolve(INQUIRIES.map((inquiry) => ({ ...inquiry })));
}

// ---- 인증 가드 ------------------------------------------------------------

/**
 * demo 진입 가드(로컬 전용). window.__TRIAGE_AUTH__ 가 명시적으로 false 일 때만 차단.
 * 기존 demo·공용 토큰을 건드리지 않는 순수 판정 함수.
 * @param {{__TRIAGE_AUTH__?: unknown}} [win]
 * @returns {boolean}
 */
export function ensureAuthorized(win = {}) {
  return win.__TRIAGE_AUTH__ !== false;
}

// ---- 필터링 로직 ----------------------------------------------------------

/** 필터 상태를 검증하고 'all' 기본값으로 정규화한다. */
export function normalizeFilter(state = {}) {
  const priority = state.priority ?? 'all';
  const area = state.area ?? 'all';
  if (priority !== 'all' && !PRIORITY_KEYS.includes(priority)) {
    throw new UnknownFilterError('priority', priority);
  }
  if (area !== 'all' && !AREA_KEYS.includes(area)) {
    throw new UnknownFilterError('area', area);
  }
  return { priority, area };
}

/** 단일 문의가 필터 상태에 매칭되는지 판정(두 축 AND 결합). */
export function matchesFilter(inquiry, state) {
  const { priority, area } = normalizeFilter(state);
  if (priority !== 'all' && inquiry.priority !== priority) return false;
  if (area !== 'all' && inquiry.area !== area) return false;
  return true;
}

/**
 * 문의 목록을 필터링하고 최신순(createdAt 내림차순)으로 정렬해 반환한다.
 * 원본 배열/항목을 변경하지 않는다.
 * @param {Array<object>} inquiries
 * @param {{priority?: string, area?: string}} state
 * @returns {Array<object>}
 */
export function filterInquiries(inquiries, state) {
  const normalized = normalizeFilter(state);
  return inquiries
    .filter((inquiry) => matchesFilter(inquiry, normalized))
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

/**
 * 한 축에 대해 각 옵션별 매칭 건수를 계산한다(반대 축 필터는 반영).
 * 필터 칩의 count 배지에 사용.
 * @param {Array<object>} inquiries
 * @param {'priority'|'area'} axis
 * @param {{priority?: string, area?: string}} state
 * @returns {{all: number} & Record<string, number>}
 */
export function countByAxis(inquiries, axis, state) {
  const otherAxis = axis === 'priority' ? 'area' : 'priority';
  const keys = axis === 'priority' ? PRIORITY_KEYS : AREA_KEYS;
  const scoped = inquiries.filter((inquiry) =>
    state[otherAxis] === 'all' || state[otherAxis] === undefined
      ? true
      : inquiry[otherAxis] === state[otherAxis],
  );
  const counts = { all: scoped.length };
  for (const key of keys) {
    counts[key] = scoped.filter((inquiry) => inquiry[axis] === key).length;
  }
  return counts;
}

/** 처리 상태별 집계(결과 요약/범례용). */
export function summarizeStatus(inquiries) {
  const summary = { new: 0, progress: 0, done: 0, total: inquiries.length };
  for (const inquiry of inquiries) {
    if (Object.prototype.hasOwnProperty.call(summary, inquiry.status)) {
      summary[inquiry.status] += 1;
    }
  }
  return summary;
}
