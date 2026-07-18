// booking-canary 모듈 public API 배럴 (명세 BF-1042 §8)
export type {
  Room,
  Booking,
  BookingRequestInput,
  ValidationFailureCode,
  ValidationResult,
  ConflictResult,
  AlternativeStrategy,
  AlternativeCandidate,
} from './types.ts';
export { ROOMS, BOOKINGS } from './fixtures.ts';
export { validateBookingInput } from './validation.ts';
export { hasOverlap, findConflicts } from './conflict.ts';
export {
  findAlternativeSlots,
  type FindAlternativeSlotsOptions,
} from './alternatives.ts';
