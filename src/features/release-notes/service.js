// BF-1087 릴리스 노트 요약 보드 — 서비스(라우트 계약, 기획 §5)
// 4개 라우트를 프레임워크 독립적인 순수 서비스로 구현한다:
//   create()   → POST /release-notes            (201 | 400)
//   validate() → POST /release-notes/validate   (검증 전용·무부작용, 항상 200)
//   list()     → GET  /release-notes            (importance × userImpact AND 필터)
//   kpi()      → GET  /release-notes/kpi         (전체 기준 재계산)

import { validateSummaryInput } from './validation.js';
import { createInMemoryStore } from './store.js';
import { computeKpi } from './kpi.js';

/**
 * @typedef {import('./store.js').SummaryCard} SummaryCard
 * @typedef {{ status: number, body: unknown }} ServiceResponse
 */

/**
 * 기본 ID 생성기.
 * secure context(HTTPS·localhost)에서는 `crypto.randomUUID()`를 사용하고,
 * 그렇지 않은 호스트(순수 http 등)에서는 `crypto.randomUUID`가 노출되지 않으므로
 * 타임스탬프 + 난수 기반 fallback으로 카드 생성이 깨지지 않게 한다(BF-1087 AC-1 회귀).
 * @returns {string}
 */
function defaultGenerateId() {
  const cryptoRef = typeof crypto !== 'undefined' ? crypto : undefined;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  const randomChunk = () => {
    if (cryptoRef && typeof cryptoRef.getRandomValues === 'function') {
      const bytes = cryptoRef.getRandomValues(new Uint8Array(8));
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    return (
      Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0') +
      Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0')
    );
  };
  return `rn-${Date.now().toString(16)}-${randomChunk()}`;
}

/**
 * 릴리스 노트 요약 보드 서비스를 생성한다.
 * clock/id 는 테스트 결정성을 위해 주입 가능(기본값은 실제 시스템 시계·UUID).
 * @param {{
 *   store?: ReturnType<typeof createInMemoryStore>,
 *   now?: () => Date,
 *   generateId?: () => string,
 * }} [options]
 */
export function createReleaseNotesService(options = {}) {
  const store = options.store ?? createInMemoryStore();
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? defaultGenerateId;

  /**
   * POST /release-notes — 검증 통과 시에만 저장하고 201로 카드 전체를 반환한다.
   * 실패 시 카드를 만들지 않고 실패 필드 전체를 담은 400을 반환한다(기획 §4·§5.1, AC-2).
   * @param {unknown} input
   * @returns {ServiceResponse}
   */
  function create(input) {
    const { valid, errors } = validateSummaryInput(input);
    if (!valid) {
      return { status: 400, body: { errors } };
    }
    const record = /** @type {Record<string, unknown>} */ (input);
    /** @type {SummaryCard} */
    const card = {
      id: generateId(),
      title: String(record.title).trim(),
      changes: /** @type {string[]} */ (record.changes).map((item) => item.trim()),
      importance: String(record.importance),
      userImpact: String(record.userImpact),
      createdAt: now().toISOString(),
    };
    store.add(card);
    return { status: 201, body: card };
  }

  /**
   * POST /release-notes/validate — 검증 전용. 결과와 무관하게 항상 200이며
   * 저장/ID 발급/KPI 반영 등 어떤 부작용도 없다(기획 §5.2·§9, AC-3).
   * @param {unknown} input
   * @returns {ServiceResponse}
   */
  function validate(input) {
    const { valid, errors } = validateSummaryInput(input);
    return {
      status: 200,
      body: valid ? { valid: true } : { valid: false, errors },
    };
  }

  /**
   * GET /release-notes — 중요도 × 사용자 영향도 AND 필터(기획 §5.3, AC-5).
   * 각 필터 생략/`all` 이면 미적용. 생성 순서(오래된 순) 유지. 0건이면 빈 배열.
   * @param {{ importance?: string, userImpact?: string }} [filter]
   * @returns {ServiceResponse}
   */
  function list(filter = {}) {
    const importance = filter.importance ?? 'all';
    const userImpact = filter.userImpact ?? 'all';
    const cards = store.list().filter((card) => {
      const importanceMatch = importance === 'all' || card.importance === importance;
      const userImpactMatch = userImpact === 'all' || card.userImpact === userImpact;
      return importanceMatch && userImpactMatch;
    });
    return { status: 200, body: cards };
  }

  /**
   * GET /release-notes/kpi — 전체 데이터 기준 KPI 재계산(필터 미적용, 기획 §5.4·§6).
   * @returns {ServiceResponse}
   */
  function kpi() {
    return { status: 200, body: computeKpi(store.list(), now()) };
  }

  return { create, validate, list, kpi, store };
}
