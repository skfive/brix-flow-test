import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scorePassword,
  checkRules,
  scoreToState,
  isCommonPassword,
} from '../strength.js';

test('scorePassword("") === 0', () => {
  assert.equal(scorePassword(''), 0);
});

test('scorePassword("password") <= 1 (흔한 비밀번호 강등 적용)', () => {
  assert.ok(scorePassword('password') <= 1);
  assert.equal(scorePassword('password'), 0);
});

test('scorePassword("Tr0ub4dor&3") >= 3', () => {
  assert.ok(scorePassword('Tr0ub4dor&3') >= 3);
});

test('checkRules는 5개 규칙 키 모두 boolean을 반환한다', () => {
  const rules = checkRules('Abc123!@');
  assert.equal(typeof rules.length, 'boolean');
  assert.equal(typeof rules.uppercase, 'boolean');
  assert.equal(typeof rules.lowercase, 'boolean');
  assert.equal(typeof rules.number, 'boolean');
  assert.equal(typeof rules.special, 'boolean');
});

test('checkRules는 각 규칙을 정확히 판정한다', () => {
  assert.deepEqual(checkRules('abcdefgh'), {
    length: true,
    uppercase: false,
    lowercase: true,
    number: false,
    special: false,
  });
  assert.deepEqual(checkRules('ABCDEFGH'), {
    length: true,
    uppercase: true,
    lowercase: false,
    number: false,
    special: false,
  });
  assert.deepEqual(checkRules('1234567'), {
    length: false,
    uppercase: false,
    lowercase: false,
    number: true,
    special: false,
  });
  assert.deepEqual(checkRules('!@#$%^&*'), {
    length: true,
    uppercase: false,
    lowercase: false,
    number: false,
    special: true,
  });
});

test('isCommonPassword는 목록과 정확히 일치(대소문자 무시)할 때만 true', () => {
  assert.equal(isCommonPassword('password'), true);
  assert.equal(isCommonPassword('PASSWORD'), true);
  assert.equal(isCommonPassword('Password1'), false);
  assert.equal(isCommonPassword('qwerty'), true);
  assert.equal(isCommonPassword('not-common'), false);
});

test('흔한 비밀번호 강등: 문자 구성상 더 높은 점수가 나올 조합도 0으로 강제된다', () => {
  // '123456789'는 length+number 충족(metCount=2) -> 강등 없으면 score=1, 강등 시 0
  assert.equal(scorePassword('123456789'), 0);
  // 'PASSWORD'는 length+uppercase 충족(metCount=2) -> 강등 없으면 score=1, 강등 시 0
  assert.equal(scorePassword('PASSWORD'), 0);
});

test('흔한 비밀번호의 부분/변형 일치는 강등하지 않는다 (정확 일치만)', () => {
  // 'Password1'은 length/upper/lower/number 충족(metCount=4) -> score=3, 강등 없음
  assert.equal(scorePassword('Password1'), 3);
  assert.equal(isCommonPassword('Password1'), false);
});

test('매우 긴 비밀번호: length 규칙은 true이며 추가 가산점/상한은 없다 (score 최대 4)', () => {
  const longPw = 'Ab1!' + 'x'.repeat(96); // 100자, 5개 규칙 모두 충족
  assert.equal(checkRules(longPw).length, true);
  assert.equal(scorePassword(longPw), 4);
});

test('scoreToState는 빈 문자열을 항상 "empty"로 매핑한다', () => {
  assert.equal(scoreToState('', scorePassword('')), 'empty');
});

test('scoreToState는 비어있지 않은 비밀번호의 점수 0~4를 frozen state 이름으로 매핑한다', () => {
  assert.equal(scoreToState('a', 0), 'very-weak');
  assert.equal(scoreToState('a', 1), 'weak');
  assert.equal(scoreToState('a', 2), 'medium');
  assert.equal(scoreToState('a', 3), 'strong');
  assert.equal(scoreToState('a', 4), 'very-strong');
});
