// 결정론적 fixture 데이터 (s1 §8) — 실행마다 동일한 위험 판정 결과 보장.
// referenceNow 는 고정 상수이며 Date.now()/new Date() 로 대체 금지(s1 가정 4).

/** 기한 초과 판정 기준 시각 (고정 상수, s1 §8.1). */
export const REFERENCE_NOW = '2026-07-18T09:00:00+09:00';

/**
 * 인수인계 항목 fixture 8건 (s1 §8.2).
 * 목록 표시 순서는 이 배열 정의 순서를 그대로 따른다(s1 §3.3).
 * @type {ReadonlyArray<{id:string,taskName:string,assignee:string|null,dueAt:string|null,status:string|null,followUpAction:string|null}>}
 */
export const HANDOFF_FIXTURE = Object.freeze([
  {
    id: 'HO-2001',
    taskName: '야간 순찰 로그 인계',
    assignee: '김민준',
    dueAt: '2026-07-18T08:00:00+09:00',
    status: 'in_progress',
    followUpAction: '다음 근무자가 3층 비상구 점검 이어서 진행',
  },
  {
    id: 'HO-2002',
    taskName: '재고 실사 결과 전달',
    assignee: '',
    dueAt: '2026-07-19T10:00:00+09:00',
    status: 'pending',
    followUpAction: '창고 B 구역 재검수 필요',
  },
  {
    id: 'HO-2003',
    taskName: '설비 점검 인계',
    assignee: '이서연',
    dueAt: null,
    status: 'pending',
    followUpAction: '압력 게이지 재확인',
  },
  {
    id: 'HO-2004',
    taskName: '고객 클레임 후속',
    assignee: '박도현',
    dueAt: '2026-07-17T18:00:00+09:00',
    status: '',
    followUpAction: '환불 승인 대기중 확인 필요',
  },
  {
    id: 'HO-2005',
    taskName: '정상 케이스 A',
    assignee: '최유진',
    dueAt: '2026-07-20T09:00:00+09:00',
    status: 'in_progress',
    followUpAction: '특이사항 없음, 정상 인계',
  },
  {
    id: 'HO-2006',
    taskName: '정상 케이스 B(완료·과거 기한)',
    assignee: '정하늘',
    dueAt: '2026-07-10T09:00:00+09:00',
    status: 'done',
    followUpAction: '인계 완료, 추가 조치 없음',
  },
  {
    id: 'HO-2007',
    taskName: '후속 액션 누락 케이스',
    assignee: '한지호',
    dueAt: '2026-07-21T09:00:00+09:00',
    status: 'pending',
    followUpAction: '',
  },
  {
    id: 'HO-2008',
    taskName: '복합 위험 케이스',
    assignee: '',
    dueAt: '2026-07-16T09:00:00+09:00',
    status: 'pending',
    followUpAction: '',
  },
]);
