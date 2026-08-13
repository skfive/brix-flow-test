import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer, grade, QUESTIONS } from '../quiz.js';

test('normalizeAnswer trims leading/trailing whitespace', () => {
  assert.equal(normalizeAnswer(' Seoul '), 'seoul');
});

test('normalizeAnswer lowercases the input', () => {
  assert.equal(normalizeAnswer('SEOUL'), 'seoul');
});

test('normalizeAnswer preserves internal spacing (no dedup)', () => {
  assert.notEqual(normalizeAnswer('new york'), normalizeAnswer('newyork'));
  assert.equal(normalizeAnswer('new york'), 'new york');
});

test('normalizeAnswer reduces whitespace-only input to empty string', () => {
  assert.equal(normalizeAnswer('   '), '');
});

test('normalizeAnswer combines trim and lowercase together', () => {
  assert.equal(normalizeAnswer('  New York  '), 'new york');
});

test('grade counts all-correct answers as 100% accuracy', () => {
  const answers = Array.from({ length: 10 }, () => ({ userInput: 'Seoul', correctAnswer: 'Seoul' }));
  assert.deepEqual(grade(answers), { correctCount: 10, totalCount: 10, accuracy: 100 });
});

test('grade counts all-incorrect answers as 0% accuracy', () => {
  const answers = Array.from({ length: 10 }, () => ({ userInput: 'wrong', correctAnswer: 'Seoul' }));
  assert.deepEqual(grade(answers), { correctCount: 0, totalCount: 10, accuracy: 0 });
});

test('grade rounds partial accuracy to the nearest integer (7/10 -> 70)', () => {
  const answers = [
    ...Array.from({ length: 7 }, () => ({ userInput: 'Seoul', correctAnswer: 'Seoul' })),
    ...Array.from({ length: 3 }, () => ({ userInput: 'wrong', correctAnswer: 'Seoul' })),
  ];
  assert.deepEqual(grade(answers), { correctCount: 7, totalCount: 10, accuracy: 70 });
});

test('grade rounds non-exact fractions correctly (2/3 -> 67)', () => {
  const answers = [
    { userInput: 'Seoul', correctAnswer: 'Seoul' },
    { userInput: 'Seoul', correctAnswer: 'Seoul' },
    { userInput: 'wrong', correctAnswer: 'Seoul' },
  ];
  assert.deepEqual(grade(answers), { correctCount: 2, totalCount: 3, accuracy: 67 });
});

test('grade treats answers as correct when case and surrounding whitespace differ', () => {
  const answers = [{ userInput: '  SEOUL  ', correctAnswer: 'Seoul' }];
  assert.deepEqual(grade(answers), { correctCount: 1, totalCount: 1, accuracy: 100 });
});

test('QUESTIONS exposes exactly 10 built-in questions with question/answer fields', () => {
  assert.equal(QUESTIONS.length, 10);
  for (const q of QUESTIONS) {
    assert.equal(typeof q.question, 'string');
    assert.equal(typeof q.answer, 'string');
    assert.ok(q.question.length > 0);
    assert.ok(q.answer.length > 0);
  }
});
