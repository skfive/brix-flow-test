// 장애 메모 협업 SPA — 순수 도메인 로직 (BF-1154)
// DOM/브라우저 비의존. main.js(렌더)와 tests 가 공유한다.
// vanilla-static 규약: fetch/XHR/타이머/외부 URL 없음.

/** 메모 상태 4-state 메타 (§2.2). suffix 는 CSS 클래스/토큰 접미사. */
export const STATUS_META = Object.freeze({
  'open': { key: 'open', suffix: 'open', label: '접수', glyph: '○', filled: false },
  'in-progress': { key: 'in-progress', suffix: 'inprogress', label: '대응중', glyph: '◐', filled: true },
  'on-hold': { key: 'on-hold', suffix: 'onhold', label: '보류', glyph: '⏸', filled: true },
  'resolved': { key: 'resolved', suffix: 'resolved', label: '완료', glyph: '✓', filled: true },
});

/** composer select 노출 순서 (§5.3). */
export const STATUS_ORDER = Object.freeze(['open', 'in-progress', 'on-hold', 'resolved']);

/** 전체 장애 종합 상태 배지 메타 (§2.3). */
export const OVERALL_META = Object.freeze({
  'in-progress': { key: 'in-progress', suffix: 'inprogress', label: '대응 진행 중', glyph: '◐' },
  'on-hold': { key: 'on-hold', suffix: 'onhold', label: '대응 보류', glyph: '⏸' },
  'resolved': { key: 'resolved', suffix: 'resolved', label: '해결됨', glyph: '✓' },
});

export const EMPTY_MESSAGE = '아직 기록된 장애 메모가 없습니다.';
export const ERROR_MESSAGE = '장애 메모를 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
export const TEXT_REQUIRED_MESSAGE = '메모 내용을 입력하세요';

/** 유효한 상태 키인지. */
export function isValidStatus(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_META, status);
}

/**
 * 시간 오름차순 정렬 (§5.2 — 오래된 것 위, 최신 아래). 원본 불변, 새 배열 반환.
 * `at` 은 ISO 문자열. 안정 정렬을 위해 동일 시각은 원래 순서 유지.
 */
export function sortNotesAsc(notes) {
  return notes
    .map((note, index) => ({ note, index }))
    .sort((a, b) => {
      const ta = Date.parse(a.note.at);
      const tb = Date.parse(b.note.at);
      if (ta !== tb) return ta - tb;
      return a.index - b.index;
    })
    .map((entry) => entry.note);
}

/**
 * overall 파생 (§6.3, 순수 함수).
 * - 메모 0건 → null (empty view-state, 배지 미표시)
 * - 모든 메모 완료 → 'resolved'
 * - 최신 활성(미완료) 메모 = 보류 → 'on-hold'
 * - 그 외 (최신 활성 ∈ {접수, 대응중}) → 'in-progress'
 */
export function deriveOverall(notes) {
  if (!notes.length) return null;
  const active = sortNotesAsc(notes).filter((note) => note.status !== 'resolved');
  if (active.length === 0) return 'resolved';
  const latestActive = active[active.length - 1];
  return latestActive.status === 'on-hold' ? 'on-hold' : 'in-progress';
}

/**
 * composer 본문 검증 (§5.3). 공백만이면 에러 메시지, 통과 시 null.
 */
export function validateNoteText(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return TEXT_REQUIRED_MESSAGE;
  }
  return null;
}

/**
 * 새 메모 객체 생성 (local state append용, 순수 함수).
 * now/id 는 호출부 주입(테스트 결정성). text 는 trim.
 */
export function createNote({ id, author, status, text, at }) {
  return {
    id,
    author: { name: author.name, handle: author.handle },
    at,
    status,
    text: text.trim(),
  };
}
