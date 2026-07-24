// 장애 메모 협업 SPA — 정적 fixture (BF-1154)
// 플레이스홀더 데이터(실데이터 아님). vanilla-static: 정적 import 만, fetch 없음.

/** 대상 장애 1건. */
export const incident = Object.freeze({
  title: '결제 API 5xx 급증',
  affectedService: 'payments-api',
  startedAt: '2026-07-24T09:02:00+09:00',
});

/** composer 작성자(현재 사용자). */
export const currentUser = Object.freeze({ name: '나', handle: 'me' });

/**
 * 초기 메모 목록. 4개 상태(접수/대응중/보류/완료)를 모두 포함해
 * 상태별 컬러 구분을 한 화면에서 확인(AC-3).
 */
export const initialNotes = Object.freeze([
  {
    id: 'note-1',
    author: { name: '김SRE', handle: 'kim.sre' },
    at: '2026-07-24T09:08:00+09:00',
    status: 'open',
    text: '결제 API 5xx 비율이 2%→18%로 급증. 알림 수신 후 대시보드 확인 중.',
  },
  {
    id: 'note-2',
    author: { name: '이백엔드', handle: 'lee.be' },
    at: '2026-07-24T09:15:00+09:00',
    status: 'in-progress',
    text: '최근 배포(v2026.7.24-1) 롤백 진행. DB 커넥션 풀 고갈 의심.',
  },
  {
    id: 'note-3',
    author: { name: '박인프라', handle: 'park.infra' },
    at: '2026-07-24T09:24:00+09:00',
    status: 'on-hold',
    text: '롤백 반영 대기 중. 배포 파이프라인 큐 적체로 약 5분 지연 예상, 잠시 보류.',
  },
  {
    id: 'note-4',
    author: { name: '이백엔드', handle: 'lee.be' },
    at: '2026-07-24T09:41:00+09:00',
    status: 'resolved',
    text: '롤백 완료 후 5xx 비율 0.3%로 정상화. 모니터링 30분 지속 후 관찰 종료.',
  },
]);
