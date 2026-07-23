// BF-1087 릴리스 노트 요약 보드 — 인메모리 저장소 (기획 §10)
// 완전 신규 additive 리소스. 기존 라우트/데이터와 분리되며 프로세스 재시작 시 비워진다(롤백 안전).

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   changes: string[],
 *   importance: string,
 *   userImpact: string,
 *   createdAt: string,
 * }} SummaryCard
 */

/**
 * 생성 순서(오래된 순)를 유지하는 인메모리 저장소를 만든다.
 * @returns {{ add: (card: SummaryCard) => SummaryCard, list: () => SummaryCard[], size: () => number }}
 */
export function createInMemoryStore() {
  /** @type {SummaryCard[]} */
  const cards = [];

  return {
    add(card) {
      cards.push(card);
      return card;
    },
    list() {
      return cards.slice();
    },
    size() {
      return cards.length;
    },
  };
}
