// 회의실 예약 충돌 검사 모듈 타입 정의 (명세 BF-1042 §8.1)
// 모든 시각 값은 ISO 8601 문자열(UTC)로 표현한다.

export interface Room {
  id: string; // 패턴: room-\d{2}
  name: string;
  capacity: number; // 양의 정수
}

export interface Booking {
  id: string; // 패턴: bkg-\d{2}
  roomId: string; // Room.id 참조
  requesterName: string; // 1자 이상(trim 후)
  startAt: string; // ISO 8601
  endAt: string; // ISO 8601, startAt 이후
}

export interface BookingRequestInput {
  roomId: string;
  requesterName: string;
  startAt: string;
  endAt: string;
}

export type ValidationFailureCode =
  | 'MISSING_FIELD'
  | 'INVALID_TIME_FORMAT'
  | 'TIME_INVERSION'
  | 'UNKNOWN_ROOM';

export type ValidationResult =
  | { valid: true }
  | { valid: false; code: ValidationFailureCode; field?: string };

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Booking[]; // 겹치는 모든 기존 Booking, fixture 배열 순서 유지
}

export type AlternativeStrategy = 'same-room-push' | 'same-time-other-room';

export interface AlternativeCandidate {
  roomId: string;
  startAt: string;
  endAt: string;
  strategy: AlternativeStrategy;
}
