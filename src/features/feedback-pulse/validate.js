// 피드백 접수 입력 검증 (기획 §3.1 / §7, 디자인 §5.1)
// 프레임워크 비의존 순수 함수 — 저장소 규약(vanilla-static / ESM)에 맞춰 구현.

export const SENTIMENTS = ['positive', 'neutral', 'negative'];
export const URGENCIES = ['low', 'medium', 'high', 'critical'];
export const OPINION_MAX = 1000;

/**
 * 접수 입력을 검증한다.
 * @param {unknown} input 요청 본문(파싱된 객체)
 * @returns {{ ok: true, value: { sentiment: string, urgency: string, opinion: string } }
 *          | { ok: false, error: { field: string, message: string } }}
 */
export function validateSubmission(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: { field: 'body', message: '요청 본문이 올바른 JSON 객체가 아닙니다.' } };
  }

  const { sentiment, urgency, opinion } = /** @type {Record<string, unknown>} */ (input);

  if (!SENTIMENTS.includes(sentiment)) {
    return { ok: false, error: { field: 'sentiment', message: '감정을 선택하세요. (positive | neutral | negative)' } };
  }
  if (!URGENCIES.includes(urgency)) {
    return { ok: false, error: { field: 'urgency', message: '긴급도를 선택하세요. (low | medium | high | critical)' } };
  }
  if (typeof opinion !== 'string' || opinion.trim().length === 0) {
    return { ok: false, error: { field: 'opinion', message: '의견을 입력하세요.' } };
  }
  const trimmed = opinion.trim();
  if (trimmed.length > OPINION_MAX) {
    return { ok: false, error: { field: 'opinion', message: `의견은 ${OPINION_MAX}자 이하여야 합니다.` } };
  }

  return { ok: true, value: { sentiment, urgency, opinion: trimmed } };
}
