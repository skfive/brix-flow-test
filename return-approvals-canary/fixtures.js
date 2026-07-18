// BF-1039 반품 승인 워크벤치 — 정적 fixture (외부 API·신규 schema 없음)
// 스키마 근거: docs/planning/return-approvals-canary-BF-1037.md §3 (ReturnRequest)
// 데이터 규모: 총 12건 (대기 5 / 승인 4 / 보류 3), 모든 reason enum + pending 커버.

/**
 * @typedef {"DEFECTIVE"|"CHANGE_OF_MIND"|"WRONG_ITEM"|"DAMAGED_IN_TRANSIT"|"OTHER"} ReturnReason
 * @typedef {"pending"|"approved"|"held"} ReturnStatus
 * @typedef {Object} ReturnRequest
 * @property {string} id
 * @property {string} orderId
 * @property {string} customerName
 * @property {string} productName
 * @property {string} sku
 * @property {number} quantity
 * @property {ReturnReason} reason
 * @property {string|null} reasonDetail
 * @property {string} requestedAt
 * @property {ReturnStatus} status
 * @property {string|null} holdReason
 * @property {string|null} approvedAt
 * @property {string|null} approvedBy
 * @property {number} refundAmount
 * @property {string|null} notes
 */

/** reason enum → 한글 라벨 (design §7-8) */
export const REASON_LABELS = Object.freeze({
  DEFECTIVE: '불량',
  CHANGE_OF_MIND: '단순 변심',
  WRONG_ITEM: '오배송',
  DAMAGED_IN_TRANSIT: '배송 중 파손',
  OTHER: '기타',
});

/** status → 한글 라벨 (design §2 상태 뱃지) */
export const STATUS_LABELS = Object.freeze({
  pending: '대기',
  approved: '승인',
  held: '보류',
});

/** @type {ReadonlyArray<ReturnRequest>} */
export const RETURN_REQUESTS = Object.freeze([
  {
    id: 'RTN-1001', orderId: 'ORD-88231', customerName: '김서연',
    productName: '무선 이어버드 Pro', sku: 'EAR-PRO-BLK', quantity: 1,
    reason: 'DEFECTIVE', reasonDetail: '왼쪽 유닛 소리 끊김',
    requestedAt: '2026-07-17T14:22:00+09:00', status: 'pending',
    holdReason: null, approvedAt: null, approvedBy: null,
    refundAmount: 189000, notes: '사진 첨부 확인 완료',
  },
  {
    id: 'RTN-1002', orderId: 'ORD-88190', customerName: '박준호',
    productName: '스탠딩 데스크', sku: 'DSK-STD-120', quantity: 1,
    reason: 'DAMAGED_IN_TRANSIT', reasonDetail: '상판 모서리 파손',
    requestedAt: '2026-07-17T11:03:00+09:00', status: 'pending',
    holdReason: null, approvedAt: null, approvedBy: null,
    refundAmount: 245000, notes: null,
  },
  {
    id: 'RTN-1003', orderId: 'ORD-88044', customerName: '이지민',
    productName: '기계식 키보드', sku: 'KBD-MEC-87', quantity: 1,
    reason: 'CHANGE_OF_MIND', reasonDetail: null,
    requestedAt: '2026-07-16T18:47:00+09:00', status: 'approved',
    holdReason: null, approvedAt: '2026-07-16T19:02:00+09:00', approvedBy: 'operator-02',
    refundAmount: 118000, notes: null,
  },
  {
    id: 'RTN-1004', orderId: 'ORD-87998', customerName: '최민수',
    productName: '블루투스 스피커', sku: 'SPK-BT-MINI', quantity: 1,
    reason: 'WRONG_ITEM', reasonDetail: '주문과 다른 색상 배송',
    requestedAt: '2026-07-16T09:15:00+09:00', status: 'held',
    holdReason: '오배송 확인 중 — 물류 회신 대기', approvedAt: null, approvedBy: null,
    refundAmount: 64000, notes: '물류팀 문의 티켓 #4412',
  },
  {
    id: 'RTN-1005', orderId: 'ORD-87950', customerName: '정하늘',
    productName: '휴대용 모니터 15"', sku: 'MON-POR-15', quantity: 1,
    reason: 'OTHER', reasonDetail: '구매처 변경 요청',
    requestedAt: '2026-07-15T16:40:00+09:00', status: 'pending',
    holdReason: null, approvedAt: null, approvedBy: null,
    refundAmount: 210000, notes: null,
  },
  {
    id: 'RTN-1006', orderId: 'ORD-87901', customerName: '한소희',
    productName: 'USB-C 허브 8포트', sku: 'HUB-USBC-8', quantity: 2,
    reason: 'DEFECTIVE', reasonDetail: 'HDMI 포트 인식 불가',
    requestedAt: '2026-07-15T10:11:00+09:00', status: 'approved',
    holdReason: null, approvedAt: '2026-07-15T10:55:00+09:00', approvedBy: 'operator-01',
    refundAmount: 38000, notes: null,
  },
  {
    id: 'RTN-1007', orderId: 'ORD-87888', customerName: '오태양',
    productName: '게이밍 마우스', sku: 'MOU-GAM-RGB', quantity: 1,
    reason: 'CHANGE_OF_MIND', reasonDetail: '사이즈가 손에 맞지 않음',
    requestedAt: '2026-07-14T20:05:00+09:00', status: 'pending',
    holdReason: null, approvedAt: null, approvedBy: null,
    refundAmount: 52000, notes: null,
  },
  {
    id: 'RTN-1008', orderId: 'ORD-87820', customerName: '서지우',
    productName: '노이즈 캔슬링 헤드폰', sku: 'HDP-NC-OVR', quantity: 1,
    reason: 'WRONG_ITEM', reasonDetail: '다른 모델 수령',
    requestedAt: '2026-07-14T13:28:00+09:00', status: 'held',
    holdReason: '시리얼 번호 불일치 — 정품 확인 필요', approvedAt: null, approvedBy: null,
    refundAmount: 279000, notes: null,
  },
  {
    id: 'RTN-1009', orderId: 'ORD-87777', customerName: '문가온',
    productName: '스마트 워치 밴드', sku: 'BND-SW-LTH', quantity: 3,
    reason: 'OTHER', reasonDetail: null,
    requestedAt: '2026-07-13T09:00:00+09:00', status: 'approved',
    holdReason: null, approvedAt: '2026-07-13T09:34:00+09:00', approvedBy: 'operator-03',
    refundAmount: 27000, notes: '수량 3개 일괄 승인',
  },
  {
    id: 'RTN-1010', orderId: 'ORD-87701', customerName: '배수아',
    productName: '4K 웹캠', sku: 'CAM-4K-WEB', quantity: 1,
    reason: 'DAMAGED_IN_TRANSIT', reasonDetail: '렌즈 커버 깨짐',
    requestedAt: '2026-07-12T17:52:00+09:00', status: 'pending',
    holdReason: null, approvedAt: null, approvedBy: null,
    refundAmount: 96000, notes: '개봉 영상 제출됨',
  },
  {
    id: 'RTN-1011', orderId: 'ORD-87650', customerName: '류시원',
    productName: '전동 스탠드 램프', sku: 'LMP-ELE-STD', quantity: 1,
    reason: 'DEFECTIVE', reasonDetail: '밝기 조절 불가',
    requestedAt: '2026-07-12T08:19:00+09:00', status: 'held',
    holdReason: '재현 테스트 대기 — 기술팀 검수', approvedAt: null, approvedBy: null,
    refundAmount: 73000, notes: null,
  },
  {
    id: 'RTN-1012', orderId: 'ORD-87604', customerName: '강도현',
    productName: '무선 충전 패드', sku: 'CHG-WL-PAD', quantity: 2,
    reason: 'CHANGE_OF_MIND', reasonDetail: null,
    requestedAt: '2026-07-11T15:33:00+09:00', status: 'approved',
    holdReason: null, approvedAt: '2026-07-11T16:10:00+09:00', approvedBy: 'operator-02',
    refundAmount: 44000, notes: null,
  },
]);
