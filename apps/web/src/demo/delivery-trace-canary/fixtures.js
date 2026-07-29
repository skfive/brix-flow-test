// delivery-trace-canary 결정론적 fixture (BF-1235)
// planner §5 동결 스키마를 구현한다. 순서·값 고정, 랜덤/시간 의존 금지.
//
// 개념 스키마 (동결):
//   TraceStage = 'requirement' | 'design' | 'implementation' | 'review' | 'test'
//   StageCell  = { stage, status: 'complete'|'pending'|'missing', evidenceLabel, evidenceHref }
//   TraceRow   = { id, requirement, stages: StageCell[] (길이 5, 순서 고정) }
//   TraceFixture = { rows: TraceRow[] }  // 빈 배열이면 state=empty

/** 단계 순서 (§5: requirement→design→implementation→review→test, 고정) */
export const TRACE_STAGES = ['requirement', 'design', 'implementation', 'review', 'test'];

/** @param {string} stage @param {'complete'|'pending'|'missing'} status @param {string} label @param {string|null} href */
function cell(stage, status, label, href) {
  return { stage, status, evidenceLabel: label, evidenceHref: href };
}

/**
 * 기본 fixture — 5개 요구사항 행. 일부 셀은 evidence 누락으로 경고 규칙(§6)을 발동한다.
 * @type {{ rows: Array<{id: string, requirement: string, stages: Array<{stage: string, status: string, evidenceLabel: string, evidenceHref: string|null}>}> }}
 */
export const defaultFixture = {
  rows: [
    {
      id: 'R1',
      requirement: '5단계 추적 카드 렌더',
      stages: [
        cell('requirement', 'complete', 'BF-1233 요구사항 추적표', '#R1-requirement'),
        cell('design', 'complete', 'BF-1234 카드 레이아웃', '#R1-design'),
        cell('implementation', 'complete', 'BF-1235 카드 목록', '#R1-implementation'),
        cell('review', 'complete', 'selector·토큰 준수 확인', '#R1-review'),
        cell('test', 'complete', 'delivery-trace-canary.spec.ts', '#R1-test'),
      ],
    },
    {
      id: 'R2',
      requirement: '단계 선택·상세 패널',
      stages: [
        cell('requirement', 'complete', 'BF-1233 상세 시나리오 S2', '#R2-requirement'),
        cell('design', 'complete', 'BF-1234 상세 패널 UI', '#R2-design'),
        cell('implementation', 'complete', 'trace-detail-panel 렌더', '#R2-implementation'),
        cell('review', 'pending', 'aria-current·키보드 경로 검토 중', '#R2-review'),
        cell('test', 'pending', '선택 시 상세 노출 검증 예정', '#R2-test'),
      ],
    },
    {
      id: 'R3',
      requirement: '누락 evidence 경고',
      stages: [
        cell('requirement', 'complete', 'BF-1233 경고 규칙', '#R3-requirement'),
        cell('design', 'complete', 'BF-1234 경고 배너 UI', '#R3-design'),
        cell('implementation', 'complete', 'evidence-warning-banner', '#R3-implementation'),
        cell('review', 'pending', '경고 규칙 준수 검토 중', '#R3-review'),
        cell('test', 'missing', '누락 시 배너 노출 검증', null),
      ],
    },
    {
      id: 'R4',
      requirement: '상태 필터',
      stages: [
        cell('requirement', 'complete', 'BF-1233 필터 요구', '#R4-requirement'),
        cell('design', 'complete', 'BF-1234 필터 컨트롤 UI', '#R4-design'),
        cell('implementation', 'pending', 'trace-stage-filter 구현 중', '#R4-implementation'),
        cell('review', 'missing', '키보드 탐색 검토', null),
        cell('test', 'missing', '필터 동작 검증', null),
      ],
    },
    {
      id: 'R5',
      requirement: '결정론적 fixture',
      stages: [
        cell('requirement', 'complete', 'BF-1233 결정론 요구', '#R5-requirement'),
        cell('design', 'complete', '스키마 시안', '#R5-design'),
        cell('implementation', 'complete', 'fixtures.js 스키마 준수', '#R5-implementation'),
        cell('review', 'complete', '스키마 준수 확인', '#R5-review'),
        cell('test', 'pending', 'fixture 기반 스냅샷 예정', '#R5-test'),
      ],
    },
  ],
};

/** 빈 상태(EC1/AC7) 검증용 fixture */
export const emptyFixture = { rows: [] };

/** 전 단계 evidence 존재(EC2/AC 경고 미노출) 검증용 fixture */
export const completeFixture = {
  rows: [
    {
      id: 'C1',
      requirement: '전 단계 완료 행',
      stages: TRACE_STAGES.map((stage) =>
        cell(stage, 'complete', `${stage} evidence`, `#C1-${stage}`),
      ),
    },
  ],
};
