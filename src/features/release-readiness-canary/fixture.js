// 릴리스 준비도 정적 fixture (BF-1146)
// 순수 데이터만 — 네트워크/시간/랜덤 의존 없음. 상태 파생 로직은 readiness.js 참고.
//
// item.status: 'done' | 'pending' | 'failed'
// item.blocking: true 이면 done 이 아닐 때 릴리스를 차단하는 필수 항목

/** @typedef {'done' | 'pending' | 'failed'} ReadinessStatus */

/**
 * @typedef {Object} ReadinessItem
 * @property {string} id
 * @property {string} label
 * @property {ReadinessStatus} status
 * @property {boolean} blocking
 */

/**
 * @typedef {Object} ReadinessArea
 * @property {string} id
 * @property {string} name
 * @property {ReadinessItem[]} items
 */

/** @type {ReadinessArea[]} */
export const RELEASE_READINESS_FIXTURE = [
  {
    id: 'quality',
    name: '코드 품질',
    items: [
      { id: 'lint', label: 'Lint 통과', status: 'done', blocking: true },
      { id: 'typecheck', label: '타입 체크 통과', status: 'done', blocking: true },
      { id: 'coverage', label: '커버리지 80% 이상', status: 'pending', blocking: false },
    ],
  },
  {
    id: 'testing',
    name: '테스트',
    items: [
      { id: 'unit', label: '단위 테스트 통과', status: 'done', blocking: true },
      { id: 'e2e', label: 'E2E 스모크 통과', status: 'failed', blocking: true },
      { id: 'regression', label: '회귀 테스트 통과', status: 'pending', blocking: false },
    ],
  },
  {
    id: 'docs',
    name: '문서화',
    items: [
      { id: 'changelog', label: 'CHANGELOG 갱신', status: 'done', blocking: false },
      { id: 'runbook', label: '운영 런북 작성', status: 'pending', blocking: false },
    ],
  },
  {
    id: 'ops',
    name: '배포/인프라',
    items: [
      { id: 'migration', label: 'DB 마이그레이션 검증', status: 'done', blocking: true },
      { id: 'rollback', label: '롤백 절차 확인', status: 'done', blocking: true },
      { id: 'monitoring', label: '모니터링 대시보드 준비', status: 'pending', blocking: false },
    ],
  },
];
