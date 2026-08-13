import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weeklyRate, validateHabitName, getWeekDates } from './habits.js';

const WEEK_DATES = [
  '2026-08-10',
  '2026-08-11',
  '2026-08-12',
  '2026-08-13',
  '2026-08-14',
  '2026-08-15',
  '2026-08-16',
];

// --- weeklyRate ---

test('W1: checks가 빈 객체면 0을 반환한다', () => {
  const habit = { checks: {} };
  assert.strictEqual(weeklyRate(habit, WEEK_DATES), 0);
});

test('W2: weekDates 7일 모두 true면 1을 반환한다', () => {
  const habit = {
    checks: Object.fromEntries(WEEK_DATES.map((date) => [date, true])),
  };
  assert.strictEqual(weeklyRate(habit, WEEK_DATES), 1);
});

test('W3: weekDates 중 3일만 true면 3/7을 반환한다', () => {
  const habit = {
    checks: {
      [WEEK_DATES[0]]: true,
      [WEEK_DATES[1]]: true,
      [WEEK_DATES[2]]: true,
    },
  };
  assert.strictEqual(weeklyRate(habit, WEEK_DATES), 3 / 7);
});

test('W4: weekDates 범위 밖 날짜만 true면 0을 반환한다 (교집합만 카운트)', () => {
  const habit = { checks: { '2026-08-17': true, '2026-08-24': true } };
  assert.strictEqual(weeklyRate(habit, WEEK_DATES), 0);
});

test('W5: weekDates.length가 6이면 Error를 throw한다', () => {
  const habit = { checks: {} };
  assert.throws(
    () => weeklyRate(habit, WEEK_DATES.slice(0, 6)),
    /weekDates must contain exactly 7 dates/
  );
});

test('W6: weekDates.length가 8이면 Error를 throw한다', () => {
  const habit = { checks: {} };
  assert.throws(
    () => weeklyRate(habit, [...WEEK_DATES, '2026-08-17']),
    /weekDates must contain exactly 7 dates/
  );
});

test('W7: weekDates 중 1일만 true면 1/7을 반환한다', () => {
  const habit = { checks: { [WEEK_DATES[0]]: true } };
  assert.strictEqual(weeklyRate(habit, WEEK_DATES), 1 / 7);
});

test('checks가 없는 habit은 0을 반환한다', () => {
  const habit = {};
  assert.strictEqual(weeklyRate(habit, WEEK_DATES), 0);
});

// --- validateHabitName ---

test('N1: 빈 문자열이면 valid:false, 빈 이름 오류를 반환한다', () => {
  const result = validateHabitName('', []);
  assert.deepStrictEqual(result, { valid: false, error: '습관 이름을 입력하세요' });
});

test('N2: 공백만 있으면 valid:false, 빈 이름 오류를 반환한다', () => {
  const result = validateHabitName('   ', []);
  assert.deepStrictEqual(result, { valid: false, error: '습관 이름을 입력하세요' });
});

test('N3: 유효한 이름이면 valid:true, error:null을 반환한다', () => {
  const result = validateHabitName('운동', []);
  assert.deepStrictEqual(result, { valid: true, error: null });
});

test('N4: existingNames에 중복된 이름이 있으면 valid:false, 중복 오류를 반환한다', () => {
  const result = validateHabitName('운동', ['운동']);
  assert.deepStrictEqual(result, { valid: false, error: '이미 등록된 습관입니다' });
});

test('N5: 정확히 20자면 valid:true를 반환한다 (경계값: 통과)', () => {
  const name20 = 'a'.repeat(20);
  const result = validateHabitName(name20, []);
  assert.deepStrictEqual(result, { valid: true, error: null });
});

test('N6: 정확히 21자면 valid:false, 길이 오류를 반환한다 (경계값: 실패)', () => {
  const name21 = 'a'.repeat(21);
  const result = validateHabitName(name21, []);
  assert.deepStrictEqual(result, {
    valid: false,
    error: '습관 이름은 20자 이내로 입력하세요',
  });
});

test('N7: 앞뒤 공백이 있으면 trim 후 유효 판정한다', () => {
  const result = validateHabitName('  운동  ', []);
  assert.deepStrictEqual(result, { valid: true, error: null });
});

test('N8: 다른 이름과만 비교하며 일치하지 않으면 valid:true를 반환한다', () => {
  const result = validateHabitName('운동', ['요가', '독서']);
  assert.deepStrictEqual(result, { valid: true, error: null });
});

// --- getWeekDates (developer 재량 구현 — 월요일 시작 7일 검증) ---

test('getWeekDates: 참조일이 수요일이면 같은 주 월요일부터 7일을 반환한다', () => {
  const wednesday = new Date(2026, 7, 12); // 2026-08-12 (수)
  assert.deepStrictEqual(getWeekDates(wednesday), WEEK_DATES);
});

test('getWeekDates: 참조일이 일요일이면 그 주의 월요일부터 7일을 반환한다', () => {
  const sunday = new Date(2026, 7, 16); // 2026-08-16 (일)
  assert.deepStrictEqual(getWeekDates(sunday), WEEK_DATES);
});
