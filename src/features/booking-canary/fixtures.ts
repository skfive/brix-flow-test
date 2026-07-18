// 결정론적 Fixture 시드 데이터 (명세 BF-1042 §4)
// 아래 리터럴은 명세 §4.1/§4.2 표를 그대로 옮긴 것으로 임의 변경하지 않는다.
import type { Booking, Room } from './types';

export const ROOMS: readonly Room[] = [
  { id: 'room-01', name: '3층 대회의실', capacity: 12 },
  { id: 'room-02', name: '4층 소회의실 A', capacity: 4 },
  { id: 'room-03', name: '4층 소회의실 B', capacity: 4 },
];

export const BOOKINGS: readonly Booking[] = [
  {
    id: 'bkg-01',
    roomId: 'room-01',
    requesterName: '김도윤',
    startAt: '2026-07-27T01:00:00.000Z',
    endAt: '2026-07-27T02:00:00.000Z',
  },
  {
    id: 'bkg-02',
    roomId: 'room-01',
    requesterName: '이서준',
    startAt: '2026-07-27T02:00:00.000Z',
    endAt: '2026-07-27T03:00:00.000Z',
  },
  {
    id: 'bkg-03',
    roomId: 'room-02',
    requesterName: '박지호',
    startAt: '2026-07-27T04:00:00.000Z',
    endAt: '2026-07-27T05:00:00.000Z',
  },
  {
    id: 'bkg-04',
    roomId: 'room-03',
    requesterName: '최하은',
    startAt: '2026-07-27T04:00:00.000Z',
    endAt: '2026-07-27T05:00:00.000Z',
  },
  {
    id: 'bkg-05',
    roomId: 'room-01',
    requesterName: '정민서',
    startAt: '2026-07-28T00:00:00.000Z',
    endAt: '2026-07-28T01:00:00.000Z',
  },
];
