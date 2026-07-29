// 실행 계약 상태 대시보드 — 결정론적 로컬 fixture (BF-1248)
// 외부 API/network/fetch 금지. 동일 입력 → 동일 렌더를 보장한다.
// 각 항목은 카드 종류(requirement/role/test)와 상태(done/progress/pending)를 갖는다.

/** @typedef {'requirement'|'role'|'test'} DossierKind */
/** @typedef {'done'|'progress'|'pending'} DossierStatus */

/**
 * 결정론적 항목 목록. 값은 고정이며 랜덤/타임스탬프에 의존하지 않는다.
 * @type {ReadonlyArray<{id:string,kind:DossierKind,title:string,status:DossierStatus,summary:string,detail:string}>}
 */
export const DOSSIER_ITEMS = Object.freeze([
  {
    id: 'req-01',
    kind: 'requirement',
    title: '상태 대시보드 렌더링',
    status: 'done',
    summary: '요구사항·역할·테스트 카드를 하나의 화면에 노출',
    detail: '진입 시 결정론적 fixture로 카드가 렌더되고 전체/진행/완료 필터가 동작한다.',
  },
  {
    id: 'req-02',
    kind: 'requirement',
    title: '상태 텍스트 병기',
    status: 'progress',
    summary: '색상만이 아니라 화면 텍스트로 상태 구분',
    detail: 'loading/empty/ready/error 상태를 아이콘과 텍스트(완료/진행/대기)로 병기한다.',
  },
  {
    id: 'req-03',
    kind: 'requirement',
    title: '360px 반응형 스택',
    status: 'pending',
    summary: '360px 이상에서 리스트/상세 세로 스택 재배치',
    detail: '리스트와 상세 패널이 세로 스택으로 재배치되며 content overflow가 없다.',
  },
  {
    id: 'role-01',
    kind: 'role',
    title: 'planner',
    status: 'done',
    summary: '실행 설계·UI 계약 동결',
    detail: 'planning-contract@v1과 ui-contract@v1을 확정하고 designer/developer에 전달한다.',
  },
  {
    id: 'role-02',
    kind: 'role',
    title: 'developer',
    status: 'progress',
    summary: '동결 계약대로 대시보드 구현',
    detail: 'selector와 token을 변경하지 않고 additive로 구현한다.',
  },
  {
    id: 'role-03',
    kind: 'role',
    title: 'tester',
    status: 'pending',
    summary: 'E2E/browser 검증 authority',
    detail: '브라우저 스모크와 접근성·반응형 검증을 담당한다.',
  },
  {
    id: 'test-01',
    kind: 'test',
    title: 'focused unit test',
    status: 'done',
    summary: 'node --test 로컬 검증',
    detail: 'fixture 결정론성과 상태 전환 로직을 단위 테스트로 검증한다.',
  },
  {
    id: 'test-02',
    kind: 'test',
    title: '정적(file://) 실행',
    status: 'progress',
    summary: '외부 의존성 없이 정적 렌더',
    detail: '상대 경로 module 로 file:// 및 정적 서버에서 동일하게 동작한다.',
  },
  {
    id: 'test-03',
    kind: 'test',
    title: '키보드 탐색 검증',
    status: 'pending',
    summary: 'Tab/화살표 탐색·aria-selected',
    detail: '필터/카드 간 화살표 이동과 선택 상태 반영을 검증한다.',
  },
]);

/**
 * fixture 로드를 시뮬레이션한다. 결정론적 deep copy 를 반환한다.
 * @param {{fail?: boolean}} [opts] fail=true 이면 로드 실패를 던진다(AC-6 오류 재현).
 * @returns {Array<{id:string,kind:DossierKind,title:string,status:DossierStatus,summary:string,detail:string}>}
 */
export function loadDossier(opts = {}) {
  if (opts.fail) {
    throw new Error('dossier fixture 로드 실패(재현)');
  }
  return DOSSIER_ITEMS.map((item) => ({ ...item }));
}
