// BF-1180 · 리뷰 head 전환 타임라인 — 순수 판정/타임라인 로직 (데이터 계층)
// 저장소 규약: vanilla-static / ESM. 외부 의존성 0건.
// UI(demo/review-head-timeline/index.html)와 focused 테스트가 공용으로 import 한다.
// 명세: docs/design/review-head-timeline-BF-1178.md

/**
 * 세대 상태 메타 — 명세 §1 상태 규칙 / §2 상태 토큰 / §5.1 배지와 1:1.
 * label/icon 은 배지·비교 카드·aria-live 에서 색맹 접근성용 3중 표기에 쓰인다.
 * phrase 는 §1 표의 "상태 문구(고정)" — 배지/비교/상세/aria-live 에서 동일 문안 재사용.
 */
export const STATE_META = Object.freeze({
  same: Object.freeze({ label: '동일 세대', icon: '✓', tone: 'same', phrase: '직전 세대와 동일 — 재검토 불필요' }),
  new: Object.freeze({ label: '새 세대', icon: '↑', tone: 'new', phrase: '새 head로 전환됨 — 새 세대 시작' }),
  review: Object.freeze({ label: '검토 필요', icon: '⚠', tone: 'review', phrase: 'head 전환 + 미해결 존재 — 사람 확인 필요' }),
});

const SHA_RE = /^[0-9a-f]{4,40}$/i;

/** SHA 문자열(주변 공백 허용)이 hex 4~40자인지 검사한다. */
export function isValidSha(sha) {
  if (typeof sha !== 'string') return false;
  return SHA_RE.test(sha.trim());
}

/** SHA 를 7자로 축약한다. 7자 초과면 앞 7자, 이하면 원본(trim) 유지. */
export function shortSha(sha) {
  if (typeof sha !== 'string') return '';
  const clean = sha.trim();
  return clean.length > 7 ? clean.slice(0, 7) : clean;
}

/**
 * 이전/현재 head SHA 와 미해결 신호로 리뷰 세대 상태를 결정론적으로 판정한다.
 * 명세 §1 판정 규칙:
 *   - prev === curr                     → 'same'  (동일 SHA면 미해결 있어도 재검토 불필요)
 *   - SHA 변경 + 미해결/충돌/stale 존재  → 'review'
 *   - SHA 변경 + 신호 없음               → 'new'
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

/** §1 표의 고정 상태 문구를 반환한다(배지/비교/상세/aria-live 공용). */
export function statusPhrase(state) {
  const meta = STATE_META[state];
  if (!meta) throw new RangeError(`statusPhrase: 알 수 없는 상태 "${state}"`);
  return meta.phrase;
}

/**
 * ISO 시각을 nowMs 기준 한국어 상대시간으로 표현한다(결정론적: now 를 주입받음).
 * 외부 시계에 의존하지 않아 동일 입력 → 동일 출력.
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

/**
 * 세대 목록(예시 SHA 입력)을 받아 각 세대의 상태·축약 SHA·상대 시각·head 여부를
 * 결정론적으로 계산한 뷰모델 배열을 만든다. 직전 세대와 비교해 state 를 판정한다.
 * @param {Array<{sha:string, timestamp:string, unresolvedThreads?:number,
 *   hasConflict?:boolean, isStale?:boolean, author?:string, filesChanged?:number,
 *   additions?:number, deletions?:number}>} generations 시간 오름차순(G0…Gn)
 * @param {number} nowMs 상대 시각 기준 시각
 * @returns {Array<object>} 각 원소: { gen, sha, shortSha, timestamp, relative, state,
 *   isHead, isFirst, unresolvedThreads, hasConflict, isStale, author, filesChanged, additions, deletions }
 */
export function buildTimeline(generations, nowMs) {
  if (!Array.isArray(generations) || generations.length === 0) {
    throw new TypeError('buildTimeline: 비어있지 않은 세대 배열이 필요합니다.');
  }
  return generations.map((g, i) => {
    if (!isValidSha(g.sha)) {
      throw new TypeError(`buildTimeline: 세대 G${i} 의 sha 가 유효하지 않습니다.`);
    }
    // G0 은 직전이 없으므로 자기 자신과 비교 → 'same'(전환 없음 기준선).
    const prevSha = i === 0 ? g.sha : generations[i - 1].sha;
    const state = judgeGeneration({
      prevHeadSha: prevSha,
      currHeadSha: g.sha,
      unresolvedThreads: g.unresolvedThreads ?? 0,
      hasConflict: g.hasConflict === true,
      isStale: g.isStale === true,
    });
    return Object.freeze({
      gen: i,
      sha: g.sha,
      shortSha: shortSha(g.sha),
      timestamp: g.timestamp,
      relative: relativeTime(g.timestamp, nowMs),
      state,
      isHead: i === generations.length - 1,
      isFirst: i === 0,
      unresolvedThreads: Number(g.unresolvedThreads ?? 0),
      hasConflict: g.hasConflict === true,
      isStale: g.isStale === true,
      author: g.author ?? '—',
      filesChanged: g.filesChanged,
      additions: g.additions,
      deletions: g.deletions,
    });
  });
}

/**
 * 타임라인 노드 뷰모델 배열에서 세대 간 연결 구간(세그먼트) 정보를 만든다.
 * §5.3 TimelineSegment: SHA 가 바뀐 구간은 도착 세대 상태 강조색으로 채운다.
 * @param {Array<object>} nodes buildTimeline 결과
 * @returns {Array<{fromGen:number, toGen:number, changed:boolean, changeState:('new'|'review'|null)}>}
 */
export function computeSegments(nodes) {
  if (!Array.isArray(nodes) || nodes.length < 2) return [];
  const segs = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const to = nodes[i + 1];
    const changed = nodes[i].sha.trim().toLowerCase() !== to.sha.trim().toLowerCase();
    segs.push(Object.freeze({
      fromGen: i,
      toGen: i + 1,
      changed,
      // 도착 세대가 same(변경 없음)이면 null. new/review 만 강조.
      changeState: changed && (to.state === 'new' || to.state === 'review') ? to.state : null,
    }));
  }
  return segs;
}

/**
 * roving tabindex 키보드 네비게이션: 현재 선택 인덱스와 키에서 다음 인덱스를 계산한다.
 * §6.4 키보드 표: ←/↑ 이전, →/↓ 다음, Home 처음(G0), End 최신 head. 범위는 [0, total-1] 로 clamp.
 * 처리하지 않는 키는 현재 인덱스를 그대로 반환(no-op).
 * @param {number} current
 * @param {string} key KeyboardEvent.key
 * @param {number} total 세대 개수
 * @returns {number}
 */
export function moveSelection(current, key, total) {
  if (!Number.isInteger(total) || total <= 0) return 0;
  const clamp = (n) => Math.max(0, Math.min(total - 1, n));
  const cur = clamp(Number.isInteger(current) ? current : 0);
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return clamp(cur + 1);
    case 'ArrowLeft':
    case 'ArrowUp':
      return clamp(cur - 1);
    case 'Home':
      return 0;
    case 'End':
      return total - 1;
    default:
      return cur;
  }
}

/**
 * 결정론적 예시 세대 데이터(외부 API 금지 — 로컬 고정). mockup G0→G3 과 일치.
 * 기준 시각 REFERENCE_NOW 로 상대 시각을 계산하면 브라우저·테스트 모두 동일 결과.
 */
export const REFERENCE_NOW = '2026-07-25T12:00:00Z';

export const SAMPLE_GENERATIONS = Object.freeze([
  Object.freeze({
    sha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
    timestamp: '2026-07-22T12:00:00Z', author: 'dev-1',
    unresolvedThreads: 0, filesChanged: 0, additions: 0, deletions: 0,
  }),
  Object.freeze({
    sha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
    timestamp: '2026-07-23T12:00:00Z', author: 'dev-1',
    unresolvedThreads: 0, filesChanged: 0, additions: 0, deletions: 0,
  }),
  Object.freeze({
    sha: '9f8e7d6c5b4a39281706f5e4d3c2b1a098765432',
    timestamp: '2026-07-24T12:00:00Z', author: 'dev-1',
    unresolvedThreads: 0, filesChanged: 5, additions: 148, deletions: 96,
  }),
  Object.freeze({
    sha: '4c5d6e7f8a9b0c1d2e3f405162738495a6b7c8d9',
    timestamp: '2026-07-25T11:50:00Z', author: 'dev-1',
    unresolvedThreads: 4, filesChanged: 7, additions: 312, deletions: 201,
  }),
]);
