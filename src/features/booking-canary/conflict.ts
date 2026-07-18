// 충돌 판정 규칙 (명세 BF-1042 §6)
import type { Booking, BookingRequestInput, ConflictResult } from './types';

/**
 * 두 시간 구간의 겹침 여부(§6.1 반열린 구간 공식).
 * 겹침(A, B) := aStart < bEnd && bStart < aEnd
 * 경계가 맞닿는 경우(aEnd === bStart 등)는 겹침이 아니다.
 */
export function hasOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const aStartMs = Date.parse(aStart);
  const aEndMs = Date.parse(aEnd);
  const bStartMs = Date.parse(bStart);
  const bEndMs = Date.parse(bEnd);
  return aStartMs < bEndMs && bStartMs < aEndMs;
}

/**
 * §5 검증을 통과한 요청에 대해서만 호출한다는 전제(§6.2).
 * 동일 roomId 의 기존 Booking 중 시간이 겹치는 것을 fixture 배열 순서 그대로 모두 반환한다.
 */
export function findConflicts(
  request: BookingRequestInput,
  allBookings: readonly Booking[],
): ConflictResult {
  const conflicts = allBookings.filter(
    (booking) =>
      booking.roomId === request.roomId &&
      hasOverlap(
        request.startAt,
        request.endAt,
        booking.startAt,
        booking.endAt,
      ),
  );
  return { hasConflict: conflicts.length > 0, conflicts };
}
