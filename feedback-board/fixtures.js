// 결정론적 fixture 데이터 (docs/plan/feedback-board-BF-1167.md §6.2)
// 난수/현재시각 사용 금지 — 실행마다 동일 값 반환.

/**
 * @typedef {'critical'|'high'|'medium'|'low'} Severity
 * @typedef {'in_app'|'web_form'|'email'|'social'} Channel
 * @typedef {'pending_review'|'planned'|'done'} Status
 */

/** 최초 로드용 정적 피드백 배열(8건). id 오름차순 고정. */
export const FEEDBACK_FIXTURE = [
  {
    id: 'FB-6001',
    title: '로그인 화면 다크모드 대비 부족',
    description: '다크모드에서 로그인 폼의 라벨과 배경 대비가 낮아 가독성이 떨어집니다.',
    severity: 'medium',
    channel: 'in_app',
    status: 'pending_review',
    createdAt: '2026-07-10T09:00:00+09:00',
    updatedAt: '2026-07-10T09:00:00+09:00',
    completedAt: null,
    history: [],
  },
  {
    id: 'FB-6002',
    title: '[긴급] 결제 완료 후 주문내역 미표시',
    description: '결제가 완료되었는데도 주문내역 화면에 항목이 나타나지 않는다는 문의가 반복 접수됩니다.',
    severity: 'critical',
    channel: 'web_form',
    status: 'pending_review',
    createdAt: '2026-07-11T10:00:00+09:00',
    updatedAt: '2026-07-11T10:00:00+09:00',
    completedAt: null,
    history: [],
  },
  {
    id: 'FB-6003',
    title: '알림 설정 화면 접근성 개선 요청',
    description: '알림 설정 토글이 키보드 포커스로 접근되지 않아 스크린 리더 사용자가 조작하기 어렵습니다.',
    severity: 'high',
    channel: 'email',
    status: 'planned',
    createdAt: '2026-07-12T11:00:00+09:00',
    updatedAt: '2026-07-13T10:00:00+09:00',
    completedAt: null,
    history: [
      { id: 'EVT-800001', feedbackId: 'FB-6003', type: 'STATUS_CHANGED', at: '2026-07-13T10:00:00+09:00', from: 'pending_review', to: 'planned', note: null },
    ],
  },
  {
    id: 'FB-6004',
    title: '검색 자동완성 속도 개선 희망',
    description: '검색어 입력 시 자동완성 목록이 노출되기까지 지연이 있어 개선을 희망합니다.',
    severity: 'low',
    channel: 'social',
    status: 'planned',
    createdAt: '2026-07-13T12:00:00+09:00',
    updatedAt: '2026-07-14T10:00:00+09:00',
    completedAt: null,
    history: [
      { id: 'EVT-800002', feedbackId: 'FB-6004', type: 'STATUS_CHANGED', at: '2026-07-14T10:00:00+09:00', from: 'pending_review', to: 'planned', note: null },
    ],
  },
  {
    id: 'FB-6005',
    title: 'Payment receipt email not received',
    description: '결제 영수증 이메일이 도착하지 않는다는 해외 고객 문의입니다. 스팸함에도 없다고 합니다.',
    severity: 'high',
    channel: 'email',
    status: 'pending_review',
    createdAt: '2026-07-14T13:00:00+09:00',
    updatedAt: '2026-07-14T13:00:00+09:00',
    completedAt: null,
    history: [],
  },
  {
    id: 'FB-6006',
    title: '다국어 지원(영어) 요청',
    description: '영어권 사용자를 위해 주요 화면의 영어 번역 지원을 요청합니다.',
    severity: 'low',
    channel: 'web_form',
    status: 'done',
    createdAt: '2026-07-05T09:00:00+09:00',
    updatedAt: '2026-07-15T09:00:00+09:00',
    completedAt: '2026-07-15T09:00:00+09:00',
    history: [
      { id: 'EVT-800003', feedbackId: 'FB-6006', type: 'STATUS_CHANGED', at: '2026-07-09T09:00:00+09:00', from: 'pending_review', to: 'planned', note: null },
      { id: 'EVT-800004', feedbackId: 'FB-6006', type: 'STATUS_CHANGED', at: '2026-07-15T09:00:00+09:00', from: 'planned', to: 'done', note: null },
    ],
  },
  {
    id: 'FB-6007',
    title: '앱 푸시 알림 중복 발송',
    description: '동일한 푸시 알림이 두 번씩 발송된다는 문의가 여러 건 접수되었습니다.',
    severity: 'critical',
    channel: 'in_app',
    status: 'done',
    createdAt: '2026-07-06T09:00:00+09:00',
    updatedAt: '2026-07-16T09:00:00+09:00',
    completedAt: '2026-07-16T09:00:00+09:00',
    history: [
      { id: 'EVT-800005', feedbackId: 'FB-6007', type: 'STATUS_CHANGED', at: '2026-07-10T09:00:00+09:00', from: 'pending_review', to: 'planned', note: null },
      { id: 'EVT-800006', feedbackId: 'FB-6007', type: 'STATUS_CHANGED', at: '2026-07-16T09:00:00+09:00', from: 'planned', to: 'done', note: null },
    ],
  },
  {
    id: 'FB-6008',
    title: '프로필 사진 업로드 실패',
    description: '프로필 사진 업로드 시 특정 이미지 형식에서 실패한다는 피드백입니다.',
    severity: 'medium',
    channel: 'web_form',
    status: 'planned',
    createdAt: '2026-07-16T14:00:00+09:00',
    updatedAt: '2026-07-17T10:00:00+09:00',
    completedAt: null,
    history: [
      { id: 'EVT-800007', feedbackId: 'FB-6008', type: 'STATUS_CHANGED', at: '2026-07-17T10:00:00+09:00', from: 'pending_review', to: 'planned', note: null },
    ],
  },
];

/** fixture 의 깊은 복제본을 반환(원본 불변 보장). */
export function loadFixture() {
  return FEEDBACK_FIXTURE.map((fb) => ({ ...fb, history: fb.history.map((h) => ({ ...h })) }));
}
