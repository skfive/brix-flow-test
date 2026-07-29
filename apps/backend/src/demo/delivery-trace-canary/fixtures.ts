// 결정론적 추적 evidence fixture — 랜덤·시각 의존 없음(테스트 재현성 보장).
// 6개 상태(loading, ready, filtered, missing-evidence, detail-open, error)를 재현한다.
// frozen contract §3 (docs/plans/delivery-trace-canary-BF-1240.md).

import type { BoardState, TraceData } from './board.ts';
import { TEXT } from './board.ts';

/** ready: 5단계 전 evidence 완결(누락 없음). complete/pending 혼합. */
export const readyTrace: TraceData = {
  rows: [
    {
      id: 'REQ-1',
      requirement: '5단계 추적 연결을 상태 보드로 표시',
      stages: [
        { stage: 'requirement', status: 'complete', evidence: 'PM 분해 · Work Packet develop 승인됨' },
        { stage: 'design', status: 'complete', evidence: 'docs/design/delivery-trace-canary-BF-1240.md · mockup 시안' },
        { stage: 'implementation', status: 'complete', evidence: 'board.ts ready 상태 렌더 구현' },
        { stage: 'review', status: 'complete', evidence: 'reviewer LGTM · selector/token 계약 준수 확인' },
        { stage: 'test', status: 'complete', evidence: 'board 테스트 ready 검증 통과' },
      ],
    },
    {
      id: 'REQ-2',
      requirement: '상태 필터로 단계 강조/흐림 전환',
      stages: [
        { stage: 'requirement', status: 'complete', evidence: 'REQ-2 필터 요구 확정' },
        { stage: 'design', status: 'complete', evidence: 'mockup 필터 UI' },
        { stage: 'implementation', status: 'complete', evidence: 'trace-stage-filter + filtered 상태 구현' },
        { stage: 'review', status: 'pending', evidence: '필터 접근성 재검토 진행 중' },
        { stage: 'test', status: 'pending', evidence: 'filtered 상태 테스트 작성 중' },
      ],
    },
  ],
};

/** missing-evidence: 최소 1개 단계 evidence 누락(status 'missing', evidence null). */
export const missingEvidenceTrace: TraceData = {
  rows: [
    {
      id: 'REQ-3',
      requirement: '누락 evidence 단계에 경고·보완 대상 표시',
      stages: [
        { stage: 'requirement', status: 'complete', evidence: 'REQ-3 경고 요구 확정' },
        { stage: 'design', status: 'complete', evidence: 'mockup 경고 영역 정의' },
        { stage: 'implementation', status: 'complete', evidence: 'trace-evidence-warning 구현' },
        { stage: 'review', status: 'missing', evidence: null },
        { stage: 'test', status: 'missing', evidence: null },
      ],
    },
    {
      id: 'REQ-4',
      requirement: '단계 선택 시 상세 패널 evidence 표시',
      stages: [
        { stage: 'requirement', status: 'complete', evidence: 'REQ-4 상세 요구 확정' },
        { stage: 'design', status: 'complete', evidence: 'mockup 상세 패널' },
        { stage: 'implementation', status: 'pending', evidence: '상세 패널 포커스 처리 진행 중' },
        { stage: 'review', status: 'missing', evidence: null },
        { stage: 'test', status: 'missing', evidence: null },
      ],
    },
  ],
};

/**
 * 6개 상태를 각각 재현하는 결정론적 BoardState 셋.
 * filtered/detail-open 은 ready 데이터 위의 view 상태로 표현한다.
 */
export const stateFixtures: Readonly<Record<
  'loading' | 'ready' | 'filtered' | 'missing-evidence' | 'detail-open' | 'error',
  BoardState
>> = {
  loading: { phase: 'loading', filter: 'all', selectedCellId: null, data: null, error: null },
  ready: { phase: 'ready', filter: 'all', selectedCellId: null, data: readyTrace, error: null },
  filtered: { phase: 'ready', filter: 'complete', selectedCellId: null, data: readyTrace, error: null },
  'missing-evidence': {
    phase: 'ready',
    filter: 'all',
    selectedCellId: null,
    data: missingEvidenceTrace,
    error: null,
  },
  'detail-open': {
    phase: 'ready',
    filter: 'all',
    selectedCellId: 'REQ-1:design',
    data: readyTrace,
    error: null,
  },
  error: { phase: 'error', filter: 'all', selectedCellId: null, data: null, error: TEXT.error },
};

export type LoaderKind = 'ready' | 'missing' | 'error';

/**
 * 결정론적 데이터 로더 factory. 'error' 는 계약 오류 메시지로 reject.
 * 시각/랜덤 의존 없이 즉시 resolve/reject 한다.
 */
export function createDeterministicLoader(kind: LoaderKind): () => Promise<TraceData> {
  return () => {
    if (kind === 'error') {
      return Promise.reject(new Error(TEXT.error));
    }
    return Promise.resolve(kind === 'missing' ? missingEvidenceTrace : readyTrace);
  };
}
