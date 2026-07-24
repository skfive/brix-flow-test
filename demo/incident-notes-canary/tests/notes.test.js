import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STATUS_META,
  STATUS_ORDER,
  OVERALL_META,
  EMPTY_MESSAGE,
  ERROR_MESSAGE,
  TEXT_REQUIRED_MESSAGE,
  isValidStatus,
  sortNotesAsc,
  deriveOverall,
  validateNoteText,
  createNote,
} from '../notes.js';
import { incident, currentUser, initialNotes } from '../fixtures.js';

// --- STATUS_META / STATUS_ORDER ---
test('STATUS_META 는 4개 상태를 색+한글라벨+glyph 3중 인코딩으로 정의', () => {
  assert.deepEqual(Object.keys(STATUS_META).sort(), ['in-progress', 'on-hold', 'open', 'resolved']);
  for (const key of Object.keys(STATUS_META)) {
    const meta = STATUS_META[key];
    assert.equal(typeof meta.label, 'string');
    assert.ok(meta.label.length > 0, `${key} 한글 라벨 존재`);
    assert.equal(typeof meta.glyph, 'string');
    assert.ok(meta.glyph.length > 0, `${key} glyph 존재`);
    assert.equal(typeof meta.suffix, 'string');
  }
  assert.equal(STATUS_META['open'].filled, false, '접수는 빈 원(테두리만)');
  assert.equal(STATUS_META['resolved'].filled, true);
});

test('STATUS_ORDER 는 접수→대응중→보류→완료 순서', () => {
  assert.deepEqual([...STATUS_ORDER], ['open', 'in-progress', 'on-hold', 'resolved']);
});

test('OVERALL_META 는 3개 종합 상태 라벨을 정의', () => {
  assert.deepEqual(Object.keys(OVERALL_META).sort(), ['in-progress', 'on-hold', 'resolved']);
  assert.equal(OVERALL_META['in-progress'].label, '대응 진행 중');
  assert.equal(OVERALL_META['on-hold'].label, '대응 보류');
  assert.equal(OVERALL_META['resolved'].label, '해결됨');
});

test('고정 문구는 명세와 정확히 일치', () => {
  assert.equal(EMPTY_MESSAGE, '아직 기록된 장애 메모가 없습니다.');
  assert.equal(ERROR_MESSAGE, '장애 메모를 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
  assert.equal(TEXT_REQUIRED_MESSAGE, '메모 내용을 입력하세요');
});

// --- isValidStatus ---
test('isValidStatus 는 4개 상태만 허용', () => {
  assert.ok(isValidStatus('open'));
  assert.ok(isValidStatus('in-progress'));
  assert.ok(isValidStatus('on-hold'));
  assert.ok(isValidStatus('resolved'));
  assert.equal(isValidStatus('bogus'), false);
  assert.equal(isValidStatus(undefined), false);
});

// --- sortNotesAsc ---
test('sortNotesAsc 는 시간 오름차순 정렬 + 원본 불변', () => {
  const input = [
    { id: 'c', at: '2026-07-24T09:24:00+09:00' },
    { id: 'a', at: '2026-07-24T09:08:00+09:00' },
    { id: 'b', at: '2026-07-24T09:15:00+09:00' },
  ];
  const frozenCopy = JSON.parse(JSON.stringify(input));
  const sorted = sortNotesAsc(input);
  assert.deepEqual(sorted.map((n) => n.id), ['a', 'b', 'c']);
  assert.deepEqual(input, frozenCopy, '원본 배열 순서 불변');
});

test('sortNotesAsc 는 동일 시각을 안정 정렬(원래 순서 유지)', () => {
  const input = [
    { id: 'x', at: '2026-07-24T09:00:00+09:00' },
    { id: 'y', at: '2026-07-24T09:00:00+09:00' },
  ];
  assert.deepEqual(sortNotesAsc(input).map((n) => n.id), ['x', 'y']);
});

// --- deriveOverall (§6.3) ---
test('deriveOverall: 메모 0건 → null (empty)', () => {
  assert.equal(deriveOverall([]), null);
});

test('deriveOverall: 최신 활성 메모가 대응중/접수 → in-progress', () => {
  const notes = [
    { at: '2026-07-24T09:00:00+09:00', status: 'open' },
    { at: '2026-07-24T09:10:00+09:00', status: 'in-progress' },
  ];
  assert.equal(deriveOverall(notes), 'in-progress');
});

test('deriveOverall: 최신 활성 메모가 접수(open) 단독 → in-progress', () => {
  const notes = [{ at: '2026-07-24T09:00:00+09:00', status: 'open' }];
  assert.equal(deriveOverall(notes), 'in-progress');
});

test('deriveOverall: 최신 활성 메모가 보류 → on-hold (뒤에 완료 메모 있어도 활성 기준)', () => {
  const notes = [
    { at: '2026-07-24T09:00:00+09:00', status: 'in-progress' },
    { at: '2026-07-24T09:10:00+09:00', status: 'on-hold' },
    { at: '2026-07-24T09:20:00+09:00', status: 'resolved' },
  ];
  assert.equal(deriveOverall(notes), 'on-hold');
});

test('deriveOverall: 모든 메모 완료 → resolved', () => {
  const notes = [
    { at: '2026-07-24T09:00:00+09:00', status: 'resolved' },
    { at: '2026-07-24T09:10:00+09:00', status: 'resolved' },
  ];
  assert.equal(deriveOverall(notes), 'resolved');
});

test('deriveOverall: 활성 메모가 보류 이후 대응중으로 갱신되면 in-progress', () => {
  const notes = [
    { at: '2026-07-24T09:00:00+09:00', status: 'on-hold' },
    { at: '2026-07-24T09:10:00+09:00', status: 'in-progress' },
  ];
  assert.equal(deriveOverall(notes), 'in-progress');
});

// --- validateNoteText (§5.3) ---
test('validateNoteText: 공백/빈 문자열은 에러 메시지', () => {
  assert.equal(validateNoteText(''), TEXT_REQUIRED_MESSAGE);
  assert.equal(validateNoteText('   '), TEXT_REQUIRED_MESSAGE);
  assert.equal(validateNoteText('\n\t '), TEXT_REQUIRED_MESSAGE);
  assert.equal(validateNoteText(undefined), TEXT_REQUIRED_MESSAGE);
});

test('validateNoteText: 내용이 있으면 null', () => {
  assert.equal(validateNoteText('롤백 완료'), null);
  assert.equal(validateNoteText('  여백 포함 내용  '), null);
});

// --- createNote ---
test('createNote 는 주입된 id/at 로 메모 생성 + text trim', () => {
  const note = createNote({
    id: 'note-99',
    author: { name: '나', handle: 'me' },
    status: 'in-progress',
    text: '  대응 시작합니다  ',
    at: '2026-07-24T10:00:00+09:00',
  });
  assert.deepEqual(note, {
    id: 'note-99',
    author: { name: '나', handle: 'me' },
    at: '2026-07-24T10:00:00+09:00',
    status: 'in-progress',
    text: '대응 시작합니다',
  });
});

test('createNote 결과를 append 하면 deriveOverall 이 갱신됨 (local state 흐름)', () => {
  const base = [{ id: 'note-1', at: '2026-07-24T09:00:00+09:00', status: 'resolved', author: { name: 'A', handle: 'a' }, text: '완료' }];
  assert.equal(deriveOverall(base), 'resolved');
  const added = createNote({
    id: 'note-2',
    author: { name: '나', handle: 'me' },
    status: 'in-progress',
    text: '재발생 감지',
    at: '2026-07-24T09:30:00+09:00',
  });
  const next = [...base, added];
  assert.equal(deriveOverall(next), 'in-progress', 'append 후 종합 상태 재파생');
});

// --- fixtures ---
test('fixtures: incident 는 title/affectedService/startedAt 보유', () => {
  assert.equal(typeof incident.title, 'string');
  assert.ok(incident.title.length > 0);
  assert.equal(typeof incident.affectedService, 'string');
  assert.ok(!Number.isNaN(Date.parse(incident.startedAt)));
});

test('fixtures: currentUser 는 name/handle 보유', () => {
  assert.equal(typeof currentUser.name, 'string');
  assert.equal(typeof currentUser.handle, 'string');
});

test('fixtures: initialNotes 는 4개 상태를 모두 포함 (AC-3 색 구분 확인)', () => {
  const statuses = new Set(initialNotes.map((n) => n.status));
  assert.deepEqual([...statuses].sort(), ['in-progress', 'on-hold', 'open', 'resolved']);
  for (const note of initialNotes) {
    assert.ok(isValidStatus(note.status), `${note.id} 상태 유효`);
    assert.ok(note.author && note.author.name && note.author.handle, `${note.id} 작성자`);
    assert.ok(!Number.isNaN(Date.parse(note.at)), `${note.id} 시각 파싱`);
    assert.ok(note.text.length > 0, `${note.id} 본문`);
  }
});

test('fixtures: initialNotes 는 고유 id 를 가짐', () => {
  const ids = initialNotes.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
});
