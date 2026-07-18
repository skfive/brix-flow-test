// 릴리스 변경 승인 큐 — 결정적 fixture (BF-1063)
// 기획 명세 §4 스키마를 따른다. 모든 submittedAt 은 리터럴 문자열로 고정하며
// (빌드/런타임 시각 아님), 최초 상태는 전원 pending_review, decisionHistory 는 빈 배열이다.
// Date.now() / Math.random() / new Date() 미사용 — 동일 입력에 항상 동일 출력.
//
// 커버리지 목적으로 아래 edge case 를 포함한다(기획 §4.1 / §6):
//  - riskScore 동률: rc-2026-0001, rc-2026-0002 (둘 다 92)
//  - riskScore 동률 + submittedAt 동률: rc-2026-0003, rc-2026-0005 (둘 다 63, 같은 제출 시각)
//    → id tie-breaker(§5 4번 키)로 결정적 순서 보장
//  - riskFactors 빈 배열: rc-2026-0003

/**
 * @typedef {"approve" | "hold" | "reopen"} DecisionAction
 * @typedef {"pending_review" | "held" | "approved"} CandidateStatus
 *
 * @typedef {Object} DecisionHistoryEntry
 * @property {string} candidateId
 * @property {"pending_review" | "held"} from
 * @property {CandidateStatus} to
 * @property {DecisionAction} action
 * @property {string} actor
 * @property {string} at          결정 시퀀스 기반 결정적 ISO 8601 값 (Date.now() 미사용)
 * @property {string=} note
 *
 * @typedef {Object} ReleaseCandidate
 * @property {string} id
 * @property {string} name
 * @property {string} version
 * @property {"production" | "staging"} targetEnvironment
 * @property {number} riskScore
 * @property {string[]} riskFactors
 * @property {string} requestedBy
 * @property {string} submittedAt
 * @property {CandidateStatus} status
 * @property {DecisionHistoryEntry[]} decisionHistory
 *
 * @typedef {Object} ReleaseApprovalFixtureFile
 * @property {1} fixtureVersion
 * @property {ReleaseCandidate[]} candidates
 */

/** @type {ReleaseApprovalFixtureFile} */
export const releaseApprovalFixture = {
  fixtureVersion: 1,
  candidates: [
    {
      id: 'rc-2026-0001',
      name: 'payments-gateway',
      version: '2026.7.1',
      targetEnvironment: 'production',
      riskScore: 92,
      riskFactors: ['미검증 마이그레이션', '롤백 스크립트 없음'],
      requestedBy: 'ops-hana',
      submittedAt: '2026-07-15T09:20:00+09:00',
      status: 'pending_review',
      decisionHistory: [],
    },
    {
      id: 'rc-2026-0002',
      name: 'auth-session-store',
      version: '2026.7.0',
      targetEnvironment: 'production',
      riskScore: 92,
      riskFactors: ['세션 스키마 변경'],
      requestedBy: 'ops-jin',
      submittedAt: '2026-07-14T17:05:00+09:00',
      status: 'pending_review',
      decisionHistory: [],
    },
    {
      id: 'rc-2026-0003',
      name: 'docs-portal-theme',
      version: '2026.6.9',
      targetEnvironment: 'staging',
      riskScore: 63,
      riskFactors: [],
      requestedBy: 'ops-mina',
      submittedAt: '2026-07-16T11:40:00+09:00',
      status: 'pending_review',
      decisionHistory: [],
    },
    {
      id: 'rc-2026-0004',
      name: 'search-index-rebuild',
      version: '2026.6.5',
      targetEnvironment: 'staging',
      riskScore: 41,
      riskFactors: ['인덱스 재생성 장시간'],
      requestedBy: 'ops-mina',
      submittedAt: '2026-07-12T08:10:00+09:00',
      status: 'pending_review',
      decisionHistory: [],
    },
    {
      id: 'rc-2026-0005',
      name: 'notification-batch',
      version: '2026.7.2',
      targetEnvironment: 'staging',
      riskScore: 63,
      riskFactors: ['대량 발송'],
      requestedBy: 'ops-hana',
      submittedAt: '2026-07-16T11:40:00+09:00',
      status: 'pending_review',
      decisionHistory: [],
    },
  ],
};

export default releaseApprovalFixture;
