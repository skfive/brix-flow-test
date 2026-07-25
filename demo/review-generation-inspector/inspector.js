// BF-1175 · 리뷰 세대 전환 인스펙터 — 순수 판정/표현 로직 (데이터 계층)
// 저장소 규약: vanilla-static / ESM. 외부 의존성 0건.
// UI(index.html)와 focused 테스트가 공용으로 import 한다.

/**
 * 세대 상태 메타 — 명세 §2 상태 토큰 / §5.1 배지와 1:1.
 * 색은 SPA :root 의 --rgi-* 토큰명으로 참조한다.
 */
export const STATE_META = Object.freeze({
  same: Object.freeze({ label: '동일 세대', icon: '✓', tone: 'same' }),
  new: Object.freeze({ label: '새 세대', icon: '↑', tone: 'new' }),
  review: Object.freeze({ label: '검토 필요', icon: '⚠', tone: 'review' }),
});

const SHA_RE = /^[0-9a-f]{4,40}$/i;

/** SHA 문자열(주변 공백 허용)이 hex 4~40자인지 검사한다. */
export function isValidSha(sha) {
  if (typeof sha !== 'string') return false;
  return SHA_RE.test(sha.trim());
}

/** SHA 를 7자로 축약한다. 7자 미만이면 원본(trim) 유지. */
export function shortSha(sha) {
  if (typeof sha !== 'string') return '';
  const clean = sha.trim();
  return clean.length > 7 ? clean.slice(0, 7) : clean;
}

/**
 * 이전/현재 head SHA 와 미해결 신호로 리뷰 세대 상태를 결정론적으로 판정한다.
 * 명세 §1 판정 규칙:
 *   - prev === curr                          → 'same'
 *   - SHA 변경 + 미해결/충돌/stale 존재       → 'review'
 *   - SHA 변경 + 신호 없음                    → 'new'
 * @param {{prevHeadSha:string, currHeadSha:string,
 *          unresolvedThreads?:number, hasConflict?:boolean, isStale?:boolean}} input
 * @returns {'same'|'new'|'review'}
 */
export function judgeGeneration(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('judgeGeneration: input 객체가 필요합니다.');
  }
  const { prevHeadSha, currHeadSha } = input;
  if (!isValidSha(prevHeadSha) || !isValidSha(currHeadSha)) {
    throw new TypeError('judgeGeneration: prevHeadSha·currHeadSha 는 유효한 SHA 여야 합니다.');
  }

  if (prevHeadSha.trim().toLowerCase() === currHeadSha.trim().toLowerCase()) {
    return 'same';
  }

  const unresolved = Number(input.unresolvedThreads ?? 0);
  const needsReview = unresolved > 0 || input.hasConflict === true || input.isStale === true;
  return needsReview ? 'review' : 'new';
}

/**
 * 상태별 판정 근거 문구(한국어). aria-live·상세 패널·비교 카드에서 사용.
 * @param {'same'|'new'|'review'} state
 * @param {object} input judgeGeneration 과 동일한 입력
 * @returns {string}
 */
export function describeState(state, input = {}) {
  const curr = shortSha(input.currHeadSha ?? '');
  switch (state) {
    case 'same':
      return 'SHA 가 이전과 동일하여 리뷰 세대가 유지됩니다. 추가 조치가 필요하지 않습니다.';
    case 'new':
      return `head 가 ${curr} 로 갱신되어 새 리뷰 세대가 시작되었습니다. 미해결 항목이 없습니다.`;
    case 'review': {
      const n = Number(input.unresolvedThreads ?? 0);
      const parts = [];
      if (n > 0) parts.push(`미해결 스레드 ${n}건`);
      if (input.hasConflict === true) parts.push('충돌');
      if (input.isStale === true) parts.push('stale 브랜치');
      const cause = parts.length > 0 ? parts.join(' · ') : '미해결 항목';
      return `head 가 ${curr} 로 변경되었고 ${cause} 이(가) 남아 있어 재검토가 필요합니다.`;
    }
    default:
      throw new RangeError(`describeState: 알 수 없는 상태 "${state}"`);
  }
}

/**
 * ISO 시각을 nowMs 기준 한국어 상대시간으로 표현한다(결정론적: now 를 주입받음).
 * @param {string} iso
 * @param {number} nowMs
 * @returns {string}
 */
export function relativeTime(iso, nowMs) {
  const t = Date.parse(iso);
  if (Number.isNaN(t) || !Number.isFinite(nowMs)) return '';
  const diffSec = Math.max(0, Math.round((nowMs - t) / 1000));
  if (diffSec < 60) return '방금';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  return `${day}일 전`;
}
