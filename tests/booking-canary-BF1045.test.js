// 회의실 예약 충돌 검사 순수 로직 단위 테스트 (명세 BF-1042 §10)
// 실행: node --test tests/booking-canary-*.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateBookingInput } from '../src/features/booking-canary/validation.ts';
import { hasOverlap, findConflicts } from '../src/features/booking-canary/conflict.ts';
import { findAlternativeSlots } from '../src/features/booking-canary/alternatives.ts';
import { ROOMS, BOOKINGS } from '../src/features/booking-canary/fixtures.ts';

const VALID_INPUT = {
  roomId: 'room-01',
  requesterName: '김도윤',
  startAt: '2026-07-27T01:00:00.000Z',
  endAt: '2026-07-27T02:00:00.000Z',
};

describe('validateBookingInput (§5.2 TC-VL-01~07)', () => {
  it('TC-VL-01: 모든 필드 유효하면 valid:true', () => {
    assert.deepStrictEqual(validateBookingInput(VALID_INPUT, ROOMS), {
      valid: true,
    });
  });

  it('TC-VL-02: roomId 누락 → MISSING_FIELD(field:roomId)', () => {
    const { roomId, ...rest } = VALID_INPUT;
    assert.deepStrictEqual(validateBookingInput(rest, ROOMS), {
      valid: false,
      code: 'MISSING_FIELD',
      field: 'roomId',
    });
  });

  it('TC-VL-03: requesterName 공백 문자열 → MISSING_FIELD(field:requesterName)', () => {
    assert.deepStrictEqual(
      validateBookingInput({ ...VALID_INPUT, requesterName: '   ' }, ROOMS),
      { valid: false, code: 'MISSING_FIELD', field: 'requesterName' },
    );
  });

  it('TC-VL-04: startAt === endAt → TIME_INVERSION', () => {
    assert.deepStrictEqual(
      validateBookingInput(
        {
          ...VALID_INPUT,
          startAt: '2026-07-27T09:00:00.000Z',
          endAt: '2026-07-27T09:00:00.000Z',
        },
        ROOMS,
      ),
      { valid: false, code: 'TIME_INVERSION' },
    );
  });

  it('TC-VL-05: startAt > endAt → TIME_INVERSION', () => {
    assert.deepStrictEqual(
      validateBookingInput(
        {
          ...VALID_INPUT,
          startAt: '2026-07-27T09:00:00.000Z',
          endAt: '2026-07-27T08:00:00.000Z',
        },
        ROOMS,
      ),
      { valid: false, code: 'TIME_INVERSION' },
    );
  });

  it('TC-VL-06: 파싱 불가 startAt → INVALID_TIME_FORMAT', () => {
    assert.deepStrictEqual(
      validateBookingInput({ ...VALID_INPUT, startAt: 'not-a-date' }, ROOMS),
      { valid: false, code: 'INVALID_TIME_FORMAT' },
    );
  });

  it('TC-VL-07: fixture 에 없는 roomId → UNKNOWN_ROOM', () => {
    assert.deepStrictEqual(
      validateBookingInput({ ...VALID_INPUT, roomId: 'room-99' }, ROOMS),
      { valid: false, code: 'UNKNOWN_ROOM' },
    );
  });

  it('검증 순서: 필수값 누락이 시간 포맷보다 우선(fail-fast)', () => {
    // requesterName 누락 + startAt 도 잘못됐지만 MISSING_FIELD 가 먼저
    const r = validateBookingInput(
      { roomId: 'room-01', requesterName: '', startAt: 'nope', endAt: 'nope' },
      ROOMS,
    );
    assert.deepStrictEqual(r, {
      valid: false,
      code: 'MISSING_FIELD',
      field: 'requesterName',
    });
  });

  it('input 이 객체가 아니면 TypeError', () => {
    assert.throws(() => validateBookingInput(null, ROOMS), TypeError);
  });
});

describe('hasOverlap (§10.3 TC-OV-01~05)', () => {
  const base = ['2026-07-27T01:00:00.000Z', '2026-07-27T02:00:00.000Z'];
  it('TC-OV-01: 경계 맞닿음 01:00~02:00 vs 02:00~03:00 → false', () => {
    assert.equal(
      hasOverlap(...base, '2026-07-27T02:00:00.000Z', '2026-07-27T03:00:00.000Z'),
      false,
    );
  });
  it('TC-OV-02: 부분 겹침 → true', () => {
    assert.equal(
      hasOverlap(...base, '2026-07-27T01:30:00.000Z', '2026-07-27T02:30:00.000Z'),
      true,
    );
  });
  it('TC-OV-03: 완전 포함 01:00~03:00 vs 01:30~02:00 → true', () => {
    assert.equal(
      hasOverlap(
        '2026-07-27T01:00:00.000Z',
        '2026-07-27T03:00:00.000Z',
        '2026-07-27T01:30:00.000Z',
        '2026-07-27T02:00:00.000Z',
      ),
      true,
    );
  });
  it('TC-OV-04: 완전 동일 → true', () => {
    assert.equal(hasOverlap(...base, ...base), true);
  });
  it('TC-OV-05: 완전 분리 → false', () => {
    assert.equal(
      hasOverlap(...base, '2026-07-27T05:00:00.000Z', '2026-07-27T06:00:00.000Z'),
      false,
    );
  });
});

describe('findConflicts (§10.3 TC-FC-01~04, §4.2 fixture)', () => {
  it('TC-FC-01: room-01 01:30~02:30 → bkg-01, bkg-02 겹침', () => {
    const r = findConflicts(
      {
        roomId: 'room-01',
        requesterName: '테스터',
        startAt: '2026-07-27T01:30:00.000Z',
        endAt: '2026-07-27T02:30:00.000Z',
      },
      BOOKINGS,
    );
    assert.equal(r.hasConflict, true);
    assert.deepStrictEqual(
      r.conflicts.map((b) => b.id),
      ['bkg-01', 'bkg-02'],
    );
  });

  it('TC-FC-02: room-01 02:00~03:00(=bkg-02 동일 구간) → bkg-02 만', () => {
    const r = findConflicts(
      {
        roomId: 'room-01',
        requesterName: '테스터',
        startAt: '2026-07-27T02:00:00.000Z',
        endAt: '2026-07-27T03:00:00.000Z',
      },
      BOOKINGS,
    );
    assert.equal(r.hasConflict, true);
    assert.deepStrictEqual(
      r.conflicts.map((b) => b.id),
      ['bkg-02'],
    );
  });

  it('TC-FC-03: room-02 04:00~05:00 → bkg-03 만(room-03 bkg-04 제외)', () => {
    const r = findConflicts(
      {
        roomId: 'room-02',
        requesterName: '테스터',
        startAt: '2026-07-27T04:00:00.000Z',
        endAt: '2026-07-27T05:00:00.000Z',
      },
      BOOKINGS,
    );
    assert.deepStrictEqual(
      r.conflicts.map((b) => b.id),
      ['bkg-03'],
    );
  });

  it('TC-FC-04: room-01 07-29 무관 시간대 → 충돌 없음', () => {
    const r = findConflicts(
      {
        roomId: 'room-01',
        requesterName: '테스터',
        startAt: '2026-07-29T00:00:00.000Z',
        endAt: '2026-07-29T01:00:00.000Z',
      },
      BOOKINGS,
    );
    assert.deepStrictEqual(r, { hasConflict: false, conflicts: [] });
  });
});

describe('findAlternativeSlots (§10.3 TC-AS-01~04)', () => {
  const conflictRequest = {
    roomId: 'room-01',
    requesterName: '테스터',
    startAt: '2026-07-27T01:30:00.000Z',
    endAt: '2026-07-27T02:30:00.000Z',
  };

  it('TC-AS-01: §7.4 예시 — Track A + Track B 순서 고정', () => {
    const r = findAlternativeSlots(conflictRequest, BOOKINGS, ROOMS);
    assert.deepStrictEqual(r, [
      {
        roomId: 'room-01',
        startAt: '2026-07-27T03:00:00.000Z',
        endAt: '2026-07-27T04:00:00.000Z',
        strategy: 'same-room-push',
      },
      {
        roomId: 'room-02',
        startAt: '2026-07-27T01:30:00.000Z',
        endAt: '2026-07-27T02:30:00.000Z',
        strategy: 'same-time-other-room',
      },
      {
        roomId: 'room-03',
        startAt: '2026-07-27T01:30:00.000Z',
        endAt: '2026-07-27T02:30:00.000Z',
        strategy: 'same-time-other-room',
      },
    ]);
  });

  it('TC-AS-02: 충돌 없는 요청 → 빈 배열', () => {
    const r = findAlternativeSlots(
      {
        roomId: 'room-01',
        requesterName: '테스터',
        startAt: '2026-07-29T00:00:00.000Z',
        endAt: '2026-07-29T01:00:00.000Z',
      },
      BOOKINGS,
      ROOMS,
    );
    assert.deepStrictEqual(r, []);
  });

  it('TC-AS-03: maxCandidates:1 → Track A 후보 1개만', () => {
    const r = findAlternativeSlots(conflictRequest, BOOKINGS, ROOMS, {
      maxCandidates: 1,
    });
    assert.deepStrictEqual(r, [
      {
        roomId: 'room-01',
        startAt: '2026-07-27T03:00:00.000Z',
        endAt: '2026-07-27T04:00:00.000Z',
        strategy: 'same-room-push',
      },
    ]);
  });

  it('TC-AS-04a: 다른 회의실 모두 사용 중 → Track A 후보만', () => {
    const rooms = [
      { id: 'room-01', name: 'A', capacity: 4 },
      { id: 'room-02', name: 'B', capacity: 4 },
    ];
    const bookings = [
      {
        id: 'bkg-a',
        roomId: 'room-01',
        requesterName: 'x',
        startAt: '2026-08-01T09:00:00.000Z',
        endAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'bkg-b',
        roomId: 'room-02',
        requesterName: 'y',
        startAt: '2026-08-01T09:00:00.000Z',
        endAt: '2026-08-01T10:00:00.000Z',
      },
    ];
    const r = findAlternativeSlots(
      {
        roomId: 'room-01',
        requesterName: 'z',
        startAt: '2026-08-01T09:00:00.000Z',
        endAt: '2026-08-01T10:00:00.000Z',
      },
      bookings,
      rooms,
    );
    assert.deepStrictEqual(r, [
      {
        roomId: 'room-01',
        startAt: '2026-08-01T10:00:00.000Z',
        endAt: '2026-08-01T11:00:00.000Z',
        strategy: 'same-room-push',
      },
    ]);
  });

  it('TC-AS-04b: Track A 순연 실패 + Track B 없음 → 빈 배열', () => {
    const rooms = [
      { id: 'room-01', name: 'A', capacity: 4 },
      { id: 'room-02', name: 'B', capacity: 4 },
    ];
    // room-01 을 09시부터 4시간 연속 점유(순연 3회로도 회피 불가), room-02 도 요청 시간 점유
    const bookings = [
      { id: 'b1', roomId: 'room-01', requesterName: 'x', startAt: '2026-08-02T09:00:00.000Z', endAt: '2026-08-02T10:00:00.000Z' },
      { id: 'b2', roomId: 'room-01', requesterName: 'x', startAt: '2026-08-02T10:00:00.000Z', endAt: '2026-08-02T11:00:00.000Z' },
      { id: 'b3', roomId: 'room-01', requesterName: 'x', startAt: '2026-08-02T11:00:00.000Z', endAt: '2026-08-02T12:00:00.000Z' },
      { id: 'b4', roomId: 'room-01', requesterName: 'x', startAt: '2026-08-02T12:00:00.000Z', endAt: '2026-08-02T13:00:00.000Z' },
      { id: 'b5', roomId: 'room-02', requesterName: 'y', startAt: '2026-08-02T09:00:00.000Z', endAt: '2026-08-02T10:00:00.000Z' },
    ];
    const r = findAlternativeSlots(
      {
        roomId: 'room-01',
        requesterName: 'z',
        startAt: '2026-08-02T09:00:00.000Z',
        endAt: '2026-08-02T10:00:00.000Z',
      },
      bookings,
      rooms,
      { maxPushIterations: 3 },
    );
    assert.deepStrictEqual(r, []);
  });

  it('EC-11: 충돌 없는 입력을 직접 호출해도 예외 없이 빈 배열', () => {
    assert.doesNotThrow(() =>
      findAlternativeSlots(
        {
          roomId: 'room-03',
          requesterName: 'z',
          startAt: '2030-01-01T00:00:00.000Z',
          endAt: '2030-01-01T01:00:00.000Z',
        },
        BOOKINGS,
        ROOMS,
      ),
    );
  });
});

describe('불변성(입력 배열 미변경, §8)', () => {
  it('findConflicts / findAlternativeSlots 는 BOOKINGS 를 변경하지 않는다', () => {
    const before = JSON.stringify(BOOKINGS);
    findConflicts(
      { roomId: 'room-01', requesterName: 't', startAt: '2026-07-27T01:30:00.000Z', endAt: '2026-07-27T02:30:00.000Z' },
      BOOKINGS,
    );
    findAlternativeSlots(
      { roomId: 'room-01', requesterName: 't', startAt: '2026-07-27T01:30:00.000Z', endAt: '2026-07-27T02:30:00.000Z' },
      BOOKINGS,
      ROOMS,
    );
    assert.equal(JSON.stringify(BOOKINGS), before);
  });
});
