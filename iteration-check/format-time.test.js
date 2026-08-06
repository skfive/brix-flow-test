import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatTime } from './format-time.js';

// 결정론적 테스트를 위해 시/분/초로 Date 를 구성한다 (로컬 시간 기준).
function at(hours, minutes, seconds) {
  return new Date(2026, 0, 1, hours, minutes, seconds);
}

test('24시간제: HH:mm:ss 로 두 자리 zero-pad', () => {
  assert.equal(formatTime(at(9, 5, 3), true), '09:05:03');
});

test('24시간제: 자정은 00:00:00', () => {
  assert.equal(formatTime(at(0, 0, 0), true), '00:00:00');
});

test('24시간제: 하루 끝 23:59:59', () => {
  assert.equal(formatTime(at(23, 59, 59), true), '23:59:59');
});

test('12시간제: 오전 시각은 AM 접미사', () => {
  assert.equal(formatTime(at(9, 5, 3), false), '09:05:03 AM');
});

test('12시간제: 자정은 12:00:00 AM (0 → 12 치환)', () => {
  assert.equal(formatTime(at(0, 0, 0), false), '12:00:00 AM');
});

test('12시간제: 정오는 12:00:00 PM', () => {
  assert.equal(formatTime(at(12, 0, 0), false), '12:00:00 PM');
});

test('12시간제: 오후 1시는 01:00:00 PM', () => {
  assert.equal(formatTime(at(13, 0, 0), false), '01:00:00 PM');
});

test('12시간제: 오후 11시 59분 59초는 11:59:59 PM', () => {
  assert.equal(formatTime(at(23, 59, 59), false), '11:59:59 PM');
});

test('순수 함수: 동일 입력에 동일 출력이며 인자 Date 를 변형하지 않는다', () => {
  const d = at(10, 20, 30);
  const first = formatTime(d, false);
  const second = formatTime(d, false);
  assert.equal(first, second);
  // 입력 Date 가 부수효과로 바뀌지 않았는지 확인
  assert.equal(d.getHours(), 10);
  assert.equal(d.getMinutes(), 20);
  assert.equal(d.getSeconds(), 30);
});
