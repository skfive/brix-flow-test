import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  OVERRIDES_KEY,
  SCHEMA_VERSION,
  parseEnvelope,
  readOverrides,
  writeOverrides,
  validateFollowUp,
  applyOverride,
  createMemoryStorage,
} from '../overrides-storage.js';

const knownIds = ['HO-2001', 'HO-2007'];

// V1
test('parseEnvelope — null 이면 빈 맵(보완 없음 초기 상태)', () => {
  assert.deepEqual(parseEnvelope(null), {});
});

// V2 / R1
test('parseEnvelope — JSON 파싱 실패 시 전체 폴백(빈 맵)', () => {
  assert.deepEqual(parseEnvelope('{ not json'), {});
});

// V3 / R1
test('parseEnvelope — schemaVersion 불일치/구조 위반 시 전체 폴백', () => {
  assert.deepEqual(parseEnvelope(JSON.stringify({ schemaVersion: 2, overrides: {} })), {});
  assert.deepEqual(parseEnvelope(JSON.stringify({ schemaVersion: 1, overrides: [] })), {});
  assert.deepEqual(parseEnvelope(JSON.stringify([1, 2, 3])), {});
});

test('parseEnvelope — 정상 envelope 파싱', () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    overrides: { 'HO-2007': { followUpAction: '재검수 필요', savedAt: '2026-07-18T10:00:00+09:00' } },
  });
  assert.deepEqual(parseEnvelope(raw, knownIds), {
    'HO-2007': { followUpAction: '재검수 필요', savedAt: '2026-07-18T10:00:00+09:00' },
  });
});

// V4 / R2
test('parseEnvelope — 스키마 위반 엔트리만 드롭(나머지 유지)', () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    overrides: {
      'HO-2001': { followUpAction: '유효', savedAt: '2026-07-18T10:00:00+09:00' },
      'HO-2007': { followUpAction: 123, savedAt: 'x' }, // followUpAction 타입 위반
    },
  });
  assert.deepEqual(parseEnvelope(raw, knownIds), {
    'HO-2001': { followUpAction: '유효', savedAt: '2026-07-18T10:00:00+09:00' },
  });
});

test('parseEnvelope — 200자 초과 엔트리 드롭', () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    overrides: { 'HO-2001': { followUpAction: 'a'.repeat(201), savedAt: 'x' } },
  });
  assert.deepEqual(parseEnvelope(raw, knownIds), {});
});

// V5
test('parseEnvelope — fixture 에 없는 orphan id 무시', () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    overrides: { 'HO-9999': { followUpAction: '유령', savedAt: 'x' } },
  });
  assert.deepEqual(parseEnvelope(raw, knownIds), {});
});

test('readOverrides — getItem 예외도 방어(빈 맵)', () => {
  const throwingStorage = {
    getItem() {
      throw new Error('SecurityError');
    },
  };
  assert.deepEqual(readOverrides(throwingStorage), {});
});

test('writeOverrides / readOverrides 왕복', () => {
  const storage = createMemoryStorage();
  const map = { 'HO-2007': { followUpAction: '보완', savedAt: '2026-07-18T10:00:00+09:00' } };
  assert.equal(writeOverrides(storage, map), true);
  assert.equal(storage.getItem(OVERRIDES_KEY), JSON.stringify({ schemaVersion: SCHEMA_VERSION, overrides: map }));
  assert.deepEqual(readOverrides(storage, knownIds), map);
});

// R3
test('writeOverrides — setItem 예외 시 false(in-memory 폴백 신호)', () => {
  const throwingStorage = {
    setItem() {
      throw new Error('QuotaExceeded');
    },
  };
  assert.equal(writeOverrides(throwingStorage, {}), false);
});

// §7.2 입력 검증
test('validateFollowUp — 1~200자 정상', () => {
  assert.deepEqual(validateFollowUp('  재검수 필요  '), { ok: true, value: '재검수 필요', isRemoval: false });
});

test('validateFollowUp — 공백/빈 값은 삭제 신호(오류 아님, EC-08)', () => {
  assert.deepEqual(validateFollowUp('   '), { ok: true, value: '', isRemoval: true });
  assert.deepEqual(validateFollowUp(''), { ok: true, value: '', isRemoval: true });
});

test('validateFollowUp — 200자 초과 거부(EC-05)', () => {
  const res = validateFollowUp('a'.repeat(201));
  assert.equal(res.ok, false);
  assert.match(res.error, /200자 이하/);
  assert.equal(res.length, 201);
});

// applyOverride
test('applyOverride — 값 저장(불변)', () => {
  const base = {};
  const next = applyOverride(base, 'HO-2007', '보완', '2026-07-18T10:00:00+09:00');
  assert.deepEqual(next, { 'HO-2007': { followUpAction: '보완', savedAt: '2026-07-18T10:00:00+09:00' } });
  assert.deepEqual(base, {}); // 원본 불변
});

test('applyOverride — 빈 값이면 해당 id 제거(EC-08)', () => {
  const base = { 'HO-2007': { followUpAction: '기존', savedAt: 'x' } };
  const next = applyOverride(base, 'HO-2007', '', '2026-07-18T10:00:00+09:00');
  assert.deepEqual(next, {});
});
