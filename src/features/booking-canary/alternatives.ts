// 대체 시간 후보 산출 규칙 (명세 BF-1042 §7)
import { findConflicts, hasOverlap } from './conflict.ts';
import type {
  AlternativeCandidate,
  Booking,
  BookingRequestInput,
  Room,
} from './types';

export interface FindAlternativeSlotsOptions {
  maxCandidates?: number; // 기본 3
  maxPushIterations?: number; // 기본 3 (Track A 재시도 상한, §7.1)
}

const DEFAULT_MAX_CANDIDATES = 3;
const DEFAULT_MAX_PUSH_ITERATIONS = 3;

/** 특정 회의실의 Booking 중 [startMs, endMs) 구간과 겹치는 것들 */
function overlappingIn(
  bookings: readonly Booking[],
  roomId: string,
  startAt: string,
  endAt: string,
): Booking[] {
  return bookings.filter(
    (booking) =>
      booking.roomId === roomId &&
      hasOverlap(startAt, endAt, booking.startAt, booking.endAt),
  );
}

/** 겹치는 Booking 들 중 endAt 이 가장 늦은 시각(ms) */
function latestEndMs(bookings: readonly Booking[]): number {
  return bookings.reduce(
    (max, booking) => Math.max(max, Date.parse(booking.endAt)),
    Number.NEGATIVE_INFINITY,
  );
}

/**
 * Track A — 같은 회의실 순연(same-room-push, §7.1).
 * 겹친 예약들의 최대 endAt 부터 요청 길이를 유지하며 밀어, 겹침 없는 구간을 찾으면 후보 1개를 반환한다.
 * maxPushIterations 회 안에 못 찾으면 null(에러 아님).
 */
function findTrackA(
  request: BookingRequestInput,
  allBookings: readonly Booking[],
  conflicts: readonly Booking[],
  maxPushIterations: number,
): AlternativeCandidate | null {
  const durationMs = Date.parse(request.endAt) - Date.parse(request.startAt);
  let candidateStartMs = latestEndMs(conflicts);

  for (let iteration = 0; iteration < maxPushIterations; iteration += 1) {
    const candidateStart = new Date(candidateStartMs).toISOString();
    const candidateEnd = new Date(candidateStartMs + durationMs).toISOString();
    const stillOverlapping = overlappingIn(
      allBookings,
      request.roomId,
      candidateStart,
      candidateEnd,
    );
    if (stillOverlapping.length === 0) {
      return {
        roomId: request.roomId,
        startAt: candidateStart,
        endAt: candidateEnd,
        strategy: 'same-room-push',
      };
    }
    // 다시 겹치면 그 예약들의 최대 endAt 으로 재차 순연(§7.1-3)
    candidateStartMs = latestEndMs(stillOverlapping);
  }

  return null;
}

/**
 * Track B — 같은 시간대 다른 회의실(same-time-other-room, §7.2).
 * 요청 구간을 유지한 채 회의실 id 오름차순으로, 요청 회의실을 제외하고 겹침 없는 회의실을 채택한다.
 */
function findTrackB(
  request: BookingRequestInput,
  allBookings: readonly Booking[],
  allRooms: readonly Room[],
  limit: number,
): AlternativeCandidate[] {
  if (limit <= 0) {
    return [];
  }
  const sortedRooms = [...allRooms].sort((a, b) => a.id.localeCompare(b.id));
  const candidates: AlternativeCandidate[] = [];

  for (const room of sortedRooms) {
    if (candidates.length >= limit) {
      break;
    }
    if (room.id === request.roomId) {
      continue;
    }
    const overlapping = overlappingIn(
      allBookings,
      room.id,
      request.startAt,
      request.endAt,
    );
    if (overlapping.length === 0) {
      candidates.push({
        roomId: room.id,
        startAt: request.startAt,
        endAt: request.endAt,
        strategy: 'same-time-other-room',
      });
    }
  }

  return candidates;
}

/**
 * §7 규칙 그대로 구현. 충돌이 없는 요청에도 호출 가능(빈 배열 반환, §7.3).
 * 최종 후보 = [Track A(있으면 1개)] ++ [Track B...] → maxCandidates 로 절단.
 */
export function findAlternativeSlots(
  request: BookingRequestInput,
  allBookings: readonly Booking[],
  allRooms: readonly Room[],
  options?: FindAlternativeSlotsOptions,
): AlternativeCandidate[] {
  const maxCandidates = options?.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const maxPushIterations =
    options?.maxPushIterations ?? DEFAULT_MAX_PUSH_ITERATIONS;

  if (maxCandidates <= 0) {
    return [];
  }

  const { hasConflict, conflicts } = findConflicts(request, allBookings);
  if (!hasConflict) {
    return [];
  }

  const trackA = findTrackA(request, allBookings, conflicts, maxPushIterations);
  const trackACount = trackA ? 1 : 0;
  const trackB = findTrackB(
    request,
    allBookings,
    allRooms,
    maxCandidates - trackACount,
  );

  const combined: AlternativeCandidate[] = [
    ...(trackA ? [trackA] : []),
    ...trackB,
  ];
  return combined.slice(0, maxCandidates);
}
