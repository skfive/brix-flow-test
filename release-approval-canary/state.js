// 릴리스 변경 승인 큐 — 순수 상태 로직 (BF-1063)
// 기획 명세 §5(정렬)·§3.2(전이표 T1~T5)·§7(데이터 모델)을 구현한다.
// DOM/localStorage 에 의존하지 않는 순수 함수만 노출하여 결정론적 단위 테스트가 가능하다.
// Date.now()/Math.random()/인자 없는 new Date() 미사용 — 동일 입력 → 동일 출력.

/**
 * @typedef {import('./fixtures.js').ReleaseCandidate} ReleaseCandidate
 * @typedef {import('./fixtures.js').ReleaseApprovalFixtureFile} ReleaseApprovalFixtureFile
 * @typedef {import('./fixtures.js').DecisionAction} DecisionAction
 * @typedef {import('./fixtures.js').CandidateStatus} CandidateStatus
 * @typedef {import('./fixtures.js').DecisionHistoryEntry} DecisionHistoryEntry
 * @typedef {"all" | "pending_review" | "held" | "approved"} QueueFilter
 */

// 결정적 논리 클록의 기준 시각. 실제 시각이 아니라 결정 시퀀스 번호를 ISO 문자열로
// 표현하기 위한 고정 base 다(기획 §3.3: at 은 결정 시퀀스 기반 결정적 값).
const DECISION_CLOCK_BASE_MS = Date.parse('2026-01-01T00:00:00.000Z');

// 3.2 전이표: (action → { fromStatus: toStatus }). 표에 없는 조합은 불법(no-op).
const LEGAL_TRANSITIONS = {
  approve: { pending_review: 'approved', held: 'approved' }, // T1 / T3
  hold: { pending_review: 'held' }, // T2
  reopen: { held: 'pending_review' }, // T4
};

// 정렬 2번 키: status 우선순위(held 우선 → pending_review). approved 는 큐 말미.
const STATUS_RANK = { held: 0, pending_review: 1, approved: 2 };

/**
 * riskScore → 위험 밴드 (디자인 §2.3 / §6.3 구간).
 * @param {number} riskScore
 * @returns {"high" | "mid" | "low"}
 */
export function riskBand(riskScore) {
  if (riskScore >= 90) return 'high';
  if (riskScore >= 60) return 'mid';
  return 'low';
}

/**
 * fixture → 로컬 초기 상태로 hydrate (깊은 복사, fixture 원본 불변).
 * @param {ReleaseApprovalFixtureFile} fixture
 * @returns {ReleaseCandidate[]}
 */
export function loadInitialState(fixture) {
  return fixture.candidates.map((candidate) => ({
    ...candidate,
    riskFactors: [...candidate.riskFactors],
    decisionHistory: candidate.decisionHistory.map((entry) => ({ ...entry })),
  }));
}

/**
 * 정렬 비교자 (기획 §5): riskScore desc → status(held 우선) → submittedAt asc → id asc.
 * @param {ReleaseCandidate} a
 * @param {ReleaseCandidate} b
 * @returns {number}
 */
function compareCandidates(a, b) {
  if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore; // 1: 위험도 내림차순
  const rankA = STATUS_RANK[a.status];
  const rankB = STATUS_RANK[b.status];
  if (rankA !== rankB) return rankA - rankB; // 2: held 우선
  if (a.submittedAt !== b.submittedAt) return a.submittedAt < b.submittedAt ? -1 : 1; // 3: 제출 시각 오름차순
  if (a.id !== b.id) return a.id < b.id ? -1 : 1; // 4: id 오름차순(완전 결정성)
  return 0;
}

/**
 * 정렬된 큐 조회 (기획 §5). 원본 배열 불변.
 * - "all"(기본): approved 종결 후보 제외(디자인 §4.3 / 기획 §5).
 * - "pending_review" / "held" / "approved": 해당 상태만.
 * @param {ReleaseCandidate[]} candidates
 * @param {QueueFilter} [filter="all"]
 * @returns {ReleaseCandidate[]}
 */
export function selectQueue(candidates, filter = 'all') {
  const sorted = [...candidates].sort(compareCandidates);
  if (filter === 'all') return sorted.filter((c) => c.status !== 'approved');
  return sorted.filter((c) => c.status === filter);
}

/**
 * 상태별 개수 (필터 탭 배지용). "all" 은 approved 제외 결정 대기 후보 수.
 * @param {ReleaseCandidate[]} candidates
 * @returns {Record<QueueFilter, number>}
 */
export function countByStatus(candidates) {
  const counts = { all: 0, pending_review: 0, held: 0, approved: 0 };
  for (const c of candidates) {
    counts[c.status] += 1;
    if (c.status !== 'approved') counts.all += 1;
  }
  return counts;
}

/**
 * 다음 결정의 결정적 시퀀스 번호 = 전체 후보의 누적 이력 건수 + 1.
 * @param {ReleaseCandidate[]} candidates
 * @returns {number}
 */
function nextDecisionSequence(candidates) {
  return candidates.reduce((total, c) => total + c.decisionHistory.length, 0) + 1;
}

/**
 * 결정 시퀀스 번호 → 결정적 ISO 8601 문자열 (논리 클록, 1분 간격).
 * @param {number} sequence
 * @returns {string}
 */
function decisionClock(sequence) {
  return new Date(DECISION_CLOCK_BASE_MS + sequence * 60_000).toISOString();
}

/**
 * 상태 전이 (기획 §3.2 전이표 준수). 불법 전이·종결(approved) 후보는 no-op:
 * 원본과 동일한 새 배열을 반환하고 이력을 추가하지 않는다(T5).
 * 순수 함수 — 입력 배열/원소를 변형하지 않고 불변 업데이트한 새 배열을 반환한다.
 * @param {ReleaseCandidate[]} candidates
 * @param {string} candidateId
 * @param {DecisionAction} action
 * @param {string} actor
 * @param {string} [note]
 * @returns {ReleaseCandidate[]}
 */
export function decide(candidates, candidateId, action, actor, note) {
  const target = candidates.find((c) => c.id === candidateId);
  if (!target) return candidates.map((c) => ({ ...c }));

  const nextStatus = LEGAL_TRANSITIONS[action]?.[target.status];
  if (!nextStatus) {
    // 불법 전이 또는 approved(T5) — no-op, 이력 미기록.
    return candidates.map((c) => ({ ...c }));
  }

  const entry = {
    candidateId,
    from: target.status,
    to: nextStatus,
    action,
    actor,
    at: decisionClock(nextDecisionSequence(candidates)),
    ...(note ? { note } : {}),
  };

  return candidates.map((c) => {
    if (c.id !== candidateId) return { ...c };
    return {
      ...c,
      status: nextStatus,
      // append-only — 기존 이력 유지한 채 새 레코드 추가(덮어쓰기 금지, 기획 §3.3/§6).
      decisionHistory: [...c.decisionHistory, entry],
    };
  });
}
