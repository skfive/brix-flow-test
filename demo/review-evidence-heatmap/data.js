// 리뷰 증거 히트맵 — 결정론적 예시 데이터 (BF-1190)
// 외부 API 없음. Math.random() 미사용 — 렌더/스냅샷 안정성 보장.
// 분포: critical ×3, high ×5, medium ×7, low ×5 = 20 (명세 §7).

/** @typedef {'critical'|'high'|'medium'|'low'} Risk */
/** @typedef {'verified'|'pending'|'failed'|'stale'} Verify */

export const FILES = Object.freeze([
  // ---- critical ×3 (failed 2 / pending 1) ----
  {
    id: 'f01', path: 'src/auth/session.js', risk: 'critical', verify: 'failed',
    changedLines: 142, findings: 3, lastVerified: '2026-07-24 14:20',
    issues: [
      { severity: 'critical', title: '세션 고정 취약점', lineStart: 45, lineEnd: 58, note: '로그인 성공 후 세션 ID 재발급 누락. 세션 고정 공격 가능.' },
      { severity: 'high', title: '만료 검증 부재', lineStart: 72, lineEnd: 80, note: '만료 토큰이 유효로 처리되는 경로 존재.' },
      { severity: 'medium', title: '로깅 과다', lineStart: 110, lineEnd: 110, note: '세션 토큰 일부가 평문 로그에 기록됨.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'fail', note: '2건 실패' },
      { step: '보안 스캔', status: 'fail', note: '심각 1건' },
      { step: 'E2E', status: 'skip', note: '건너뜀' },
    ],
  },
  {
    id: 'f02', path: 'src/auth/token.js', risk: 'critical', verify: 'pending',
    changedLines: 98, findings: 2, lastVerified: '2026-07-24 13:05',
    issues: [
      { severity: 'critical', title: '서명 검증 우회', lineStart: 30, lineEnd: 44, note: 'alg=none 토큰이 검증을 통과함.' },
      { severity: 'high', title: '키 회전 미지원', lineStart: 60, lineEnd: 71, note: '단일 정적 키에 의존.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'pass', note: '통과' },
      { step: '보안 스캔', status: 'skip', note: '대기 중' },
    ],
  },
  {
    id: 'f03', path: 'src/payment/charge.js', risk: 'critical', verify: 'failed',
    changedLines: 176, findings: 4, lastVerified: '2026-07-24 15:41',
    issues: [
      { severity: 'critical', title: '중복 결제 가능', lineStart: 88, lineEnd: 104, note: '멱등키 검증 누락으로 재시도 시 이중 청구.' },
      { severity: 'high', title: '금액 정밀도 손실', lineStart: 120, lineEnd: 126, note: '부동소수 연산으로 반올림 오차.' },
      { severity: 'medium', title: '예외 삼킴', lineStart: 140, lineEnd: 148, note: '결제 실패 예외가 로깅 없이 무시됨.' },
      { severity: 'medium', title: '타임아웃 미설정', lineStart: 160, lineEnd: 164, note: '외부 PG 호출에 타임아웃 없음.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'fail', note: '3건 실패' },
      { step: '통합 테스트', status: 'fail', note: '결제 재시도 시나리오 실패' },
      { step: '보안 스캔', status: 'pass', note: '통과' },
    ],
  },

  // ---- high ×5 (verified 1 / pending 1 / failed 1 / stale 2) ----
  {
    id: 'f04', path: 'src/api/orders.js', risk: 'high', verify: 'stale',
    changedLines: 64, findings: 2, lastVerified: '2026-07-20 09:12',
    issues: [
      { severity: 'high', title: '권한 검사 누락', lineStart: 22, lineEnd: 34, note: '타 사용자 주문 조회가 가능한 IDOR.' },
      { severity: 'medium', title: 'N+1 쿼리', lineStart: 50, lineEnd: 58, note: '주문 항목마다 개별 쿼리 발생.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'pass', note: '통과(오래됨)' },
      { step: '보안 스캔', status: 'skip', note: '재검증 필요' },
    ],
  },
  {
    id: 'f05', path: 'src/api/users.js', risk: 'high', verify: 'verified',
    changedLines: 41, findings: 1, lastVerified: '2026-07-25 08:03',
    issues: [
      { severity: 'high', title: '이메일 노출', lineStart: 18, lineEnd: 24, note: '목록 응답에 비공개 이메일 포함.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'pass', note: '통과' },
      { step: '보안 스캔', status: 'pass', note: '통과' },
      { step: 'E2E', status: 'pass', note: '통과' },
    ],
  },
  {
    id: 'f06', path: 'src/db/migrate.js', risk: 'high', verify: 'pending',
    changedLines: 87, findings: 2, lastVerified: '2026-07-24 11:47',
    issues: [
      { severity: 'high', title: '비가역 마이그레이션', lineStart: 12, lineEnd: 30, note: '롤백 스크립트 부재로 되돌릴 수 없음.' },
      { severity: 'low', title: '인덱스 미생성', lineStart: 40, lineEnd: 42, note: '대용량 컬럼에 인덱스 누락.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'skip', note: '대기 중' },
    ],
  },
  {
    id: 'f07', path: 'src/api/webhook.js', risk: 'high', verify: 'failed',
    changedLines: 73, findings: 2, lastVerified: '2026-07-24 16:22',
    issues: [
      { severity: 'high', title: '서명 미검증', lineStart: 15, lineEnd: 27, note: '웹훅 서명 헤더를 검증하지 않음.' },
      { severity: 'medium', title: '재전송 방어 부재', lineStart: 35, lineEnd: 44, note: '이벤트 중복 처리 방지 없음.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'fail', note: '1건 실패' },
      { step: '보안 스캔', status: 'fail', note: '높음 1건' },
    ],
  },
  {
    id: 'f08', path: 'src/api/search.js', risk: 'high', verify: 'stale',
    changedLines: 52, findings: 1, lastVerified: '2026-07-19 17:30',
    issues: [
      { severity: 'high', title: '정규식 DoS', lineStart: 28, lineEnd: 33, note: '사용자 입력이 백트래킹 취약 정규식에 사용됨.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'pass', note: '통과(오래됨)' },
      { step: 'E2E', status: 'skip', note: '재검증 필요' },
    ],
  },

  // ---- medium ×7 (verified 3 / pending 1 / failed 1 / stale 2) ----
  {
    id: 'f09', path: 'src/ui/table.js', risk: 'medium', verify: 'verified',
    changedLines: 33, findings: 1, lastVerified: '2026-07-25 07:40',
    issues: [
      { severity: 'medium', title: '가상 스크롤 미적용', lineStart: 60, lineEnd: 74, note: '대량 행 렌더 시 성능 저하.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'pass', note: '통과' },
    ],
  },
  {
    id: 'f10', path: 'src/ui/form.js', risk: 'medium', verify: 'verified',
    changedLines: 28, findings: 0, lastVerified: '2026-07-25 07:41',
    issues: [],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'pass', note: '통과' },
      { step: 'E2E', status: 'pass', note: '통과' },
    ],
  },
  {
    id: 'f11', path: 'src/utils/format.js', risk: 'medium', verify: 'stale',
    changedLines: 19, findings: 1, lastVerified: '2026-07-18 10:15',
    issues: [
      { severity: 'medium', title: '로캘 하드코딩', lineStart: 8, lineEnd: 14, note: '통화 포맷이 단일 로캘에 고정됨.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과(오래됨)' },
      { step: '단위 테스트', status: 'skip', note: '재검증 필요' },
    ],
  },
  {
    id: 'f12', path: 'src/ui/modal.js', risk: 'medium', verify: 'verified',
    changedLines: 46, findings: 1, lastVerified: '2026-07-25 06:58',
    issues: [
      { severity: 'medium', title: '포커스 트랩 미흡', lineStart: 30, lineEnd: 41, note: '모달 열림 시 배경 요소로 탭 이동 가능.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '접근성 검사', status: 'pass', note: '통과' },
    ],
  },
  {
    id: 'f13', path: 'src/utils/date.js', risk: 'medium', verify: 'pending',
    changedLines: 24, findings: 1, lastVerified: '2026-07-24 12:33',
    issues: [
      { severity: 'medium', title: '타임존 처리 오류', lineStart: 16, lineEnd: 22, note: 'UTC 변환에서 DST 경계 오차.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'skip', note: '대기 중' },
    ],
  },
  {
    id: 'f14', path: 'src/api/cache.js', risk: 'medium', verify: 'failed',
    changedLines: 57, findings: 2, lastVerified: '2026-07-24 15:10',
    issues: [
      { severity: 'medium', title: '캐시 무효화 누락', lineStart: 40, lineEnd: 52, note: '갱신 후 stale 캐시가 서빙됨.' },
      { severity: 'low', title: 'TTL 하드코딩', lineStart: 12, lineEnd: 12, note: '설정으로 분리 필요.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'fail', note: '1건 실패' },
    ],
  },
  {
    id: 'f15', path: 'src/ui/chart.js', risk: 'medium', verify: 'stale',
    changedLines: 61, findings: 1, lastVerified: '2026-07-17 14:05',
    issues: [
      { severity: 'medium', title: '색상 대비 부족', lineStart: 70, lineEnd: 78, note: '범례 텍스트 대비가 WCAG AA 미달.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과(오래됨)' },
      { step: '접근성 검사', status: 'skip', note: '재검증 필요' },
    ],
  },

  // ---- low ×5 (verified 3 / pending 1 / stale 1) ----
  {
    id: 'f16', path: 'src/config/env.js', risk: 'low', verify: 'verified',
    changedLines: 12, findings: 0, lastVerified: '2026-07-25 08:20',
    issues: [],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'pass', note: '통과' },
    ],
  },
  {
    id: 'f17', path: 'README.md', risk: 'low', verify: 'verified',
    changedLines: 34, findings: 0, lastVerified: '2026-07-25 08:21',
    issues: [],
    verifyLog: [
      { step: '문서 링크 검사', status: 'pass', note: '통과' },
    ],
  },
  {
    id: 'f18', path: 'src/utils/log.js', risk: 'low', verify: 'pending',
    changedLines: 9, findings: 0, lastVerified: '2026-07-24 10:02',
    issues: [],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'skip', note: '대기 중' },
    ],
  },
  {
    id: 'f19', path: 'src/config/routes.js', risk: 'low', verify: 'verified',
    changedLines: 15, findings: 0, lastVerified: '2026-07-25 07:12',
    issues: [],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과' },
      { step: '단위 테스트', status: 'pass', note: '통과' },
    ],
  },
  {
    id: 'f20', path: 'src/styles/theme.css', risk: 'low', verify: 'stale',
    changedLines: 21, findings: 1, lastVerified: '2026-07-16 13:44',
    issues: [
      { severity: 'low', title: '미사용 토큰', lineStart: 30, lineEnd: 36, note: '참조되지 않는 CSS 변수 존재.' },
    ],
    verifyLog: [
      { step: '정적 분석 (lint)', status: 'pass', note: '통과(오래됨)' },
    ],
  },
]);

/** 위험도 메타 (아이콘·라벨) — 색상 외 상태 표현용. */
export const RISK_META = Object.freeze({
  critical: { icon: '▲', label: '심각' },
  high: { icon: '◆', label: '높음' },
  medium: { icon: '●', label: '보통' },
  low: { icon: '▁', label: '낮음' },
});

/** 검증 상태 메타 (아이콘·라벨). */
export const VERIFY_META = Object.freeze({
  verified: { icon: '✓', label: '검증완료', short: '완료' },
  pending: { icon: '◷', label: '검증대기', short: '대기' },
  failed: { icon: '✕', label: '검증실패', short: '실패' },
  stale: { icon: '⚠', label: '재검증', short: '재검증' },
});

/** verifyLog 단계 상태 아이콘. */
export const LOG_STATUS_META = Object.freeze({
  pass: { icon: '✓', label: '통과' },
  fail: { icon: '✕', label: '실패' },
  skip: { icon: '–', label: '건너뜀' },
});

export const RISK_ORDER = Object.freeze(['critical', 'high', 'medium', 'low']);
export const VERIFY_ORDER = Object.freeze(['verified', 'pending', 'failed', 'stale']);
