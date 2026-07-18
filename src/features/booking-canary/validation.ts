// 입력 검증 규칙 (명세 BF-1042 §5)
// fail-fast: 첫 실패에서 즉시 반환. 검증 실패는 예외를 던지지 않고 ValidationResult 로 반환한다.
import type {
  BookingRequestInput,
  Room,
  ValidationResult,
} from './types';

// 필수 필드 검사 순서(§5.1 1단계). 이 순서대로 첫 누락 필드를 보고한다.
const REQUIRED_FIELDS: ReadonlyArray<keyof BookingRequestInput> = [
  'roomId',
  'requesterName',
  'startAt',
  'endAt',
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 예약 요청 입력을 §5 규칙(필수값 → 시간 포맷 → 시간 역전 → 회의실 참조)에 따라 검증한다.
 * @throws {TypeError} input 이 객체가 아니거나 rooms 가 배열이 아닌 프로그래밍 오류인 경우에만
 */
export function validateBookingInput(
  input: Partial<BookingRequestInput>,
  rooms: readonly Room[],
): ValidationResult {
  if (input === null || typeof input !== 'object') {
    throw new TypeError('validateBookingInput: input must be an object');
  }
  if (!Array.isArray(rooms)) {
    throw new TypeError('validateBookingInput: rooms must be an array');
  }

  // 1) 필수값 존재 (requesterName 은 trim 후 빈 문자열도 누락으로 취급)
  for (const field of REQUIRED_FIELDS) {
    if (!isNonEmptyString(input[field])) {
      return { valid: false, code: 'MISSING_FIELD', field };
    }
  }

  // 위 루프를 통과했으므로 4개 필드는 모두 비어있지 않은 문자열이다.
  const startAt = input.startAt as string;
  const endAt = input.endAt as string;
  const roomId = input.roomId as string;

  // 2) 시간 포맷 (Date.parse 로 파싱 불가하면 NaN)
  const startMs = Date.parse(startAt);
  const endMs = Date.parse(endAt);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return { valid: false, code: 'INVALID_TIME_FORMAT' };
  }

  // 3) 시간 역전 (0 또는 음의 구간 포함)
  if (startMs >= endMs) {
    return { valid: false, code: 'TIME_INVERSION' };
  }

  // 4) 회의실 참조 무결성
  const roomExists = rooms.some((room) => room.id === roomId);
  if (!roomExists) {
    // 명세 §5.2 TC-VL-07 계약에 맞춰 field 를 포함하지 않는다.
    // (UI 의 roomId 필드 강조는 code→field 매핑으로 파생, 명세 §6.4/설계 §5.3.1)
    return { valid: false, code: 'UNKNOWN_ROOM' };
  }

  return { valid: true };
}
