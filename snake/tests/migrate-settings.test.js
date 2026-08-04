// BF-1626 · snake 설정 스키마 v2 마이그레이션 단위 테스트 (node --test)
// planning-contract@v1: docs/plans/snake-settings-v2-BF-1624.md §3~§4, §7
//
// migrateSettings(raw) 를 대상으로 v1→v2 마이그레이션을 검증한다.
//   - v1 전체 값 보존 + 신규 필드 기본값 주입 + schemaVersion 상향
//   - schemaVersion 누락 케이스
//   - 미래 버전(3+) 강등 금지 (원본 schemaVersion 보존)
//   - 멱등성 (deep equal)
//   - 손상 입력(null/문자열/배열) 처리
//   - 기존 7개 필드 계약 불변 (범위 외 폴백/clamp)
//   - v2 신규 필드 검증 (허용값/타입 폴백)
//
// 참고: frozen planning-contract@v1 §2-2 는 controlScheme 기본값을 'arrows' 로
//   지정한다(기존 방향키 조작을 그대로 보존하는 behavior-preserving 기본값).
//   'both' 는 저장값으로 유효하며(허용값 배열), 저장된 경우 그대로 보존된다.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  migrateSettings,
  validateAndMergeSettings,
  SNAKE_SETTINGS_SCHEMA_VERSION,
  SNAKE_SETTINGS_DEFAULTS,
} from '../logic.js';

// ── 스키마 상수 ──────────────────────────────────────────────
test('스키마 버전은 2 이다', () => {
  assert.equal(SNAKE_SETTINGS_SCHEMA_VERSION, 2);
});

test('DEFAULTS 에 신규 필드가 additive 로 존재한다', () => {
  assert.equal(SNAKE_SETTINGS_DEFAULTS.soundEnabled, true);
  assert.equal(SNAKE_SETTINGS_DEFAULTS.controlScheme, 'arrows');
  assert.equal(SNAKE_SETTINGS_DEFAULTS.schemaVersion, 2);
  // 기존 7개 필드 기본값 불변
  assert.equal(SNAKE_SETTINGS_DEFAULTS.difficulty, 'normal');
  assert.equal(SNAKE_SETTINGS_DEFAULTS.cpuCount, 1);
  assert.equal(SNAKE_SETTINGS_DEFAULTS.itemsEnabled, false);
  assert.equal(SNAKE_SETTINGS_DEFAULTS.itemSpawnRate, 0.5);
  assert.equal(SNAKE_SETTINGS_DEFAULTS.multiplierEnabled, true);
  assert.equal(SNAKE_SETTINGS_DEFAULTS.timeLimitSec, null);
  assert.equal(SNAKE_SETTINGS_DEFAULTS.initialLength, 3);
});

test('migrateSettings 는 분리 export 된 함수이다', () => {
  assert.equal(typeof migrateSettings, 'function');
});

// ── AC-1 v1 데이터 마이그레이션 ──────────────────────────────
test('AC-1: schemaVersion 없는 v1 데이터 → 값 보존 + 신규 기본값 + version 2', () => {
  const out = migrateSettings({ difficulty: 'easy', cpuCount: 3 });
  assert.equal(out.difficulty, 'easy');
  assert.equal(out.cpuCount, 3);
  // 나머지 5개 기존 필드는 기본값
  assert.equal(out.itemsEnabled, false);
  assert.equal(out.itemSpawnRate, 0.5);
  assert.equal(out.multiplierEnabled, true);
  assert.equal(out.timeLimitSec, null);
  assert.equal(out.initialLength, 3);
  // 신규 필드 기본값
  assert.equal(out.soundEnabled, true);
  assert.equal(out.controlScheme, 'arrows');
  // 버전 상향
  assert.equal(out.schemaVersion, 2);
});

test('schemaVersion:1 명시 데이터도 v2 로 정규화된다', () => {
  const out = migrateSettings({ schemaVersion: 1, difficulty: 'easy' });
  assert.equal(out.schemaVersion, 2);
  assert.equal(out.difficulty, 'easy');
  assert.equal(out.controlScheme, 'arrows');
});

// ── AC-2 멱등성 ─────────────────────────────────────────────
test('AC-2: 마이그레이션 결과를 재마이그레이션해도 동일하다 (멱등)', () => {
  const once  = migrateSettings({ difficulty: 'easy', cpuCount: 3 });
  const twice = migrateSettings(once);
  assert.deepEqual(twice, once);
});

test('AC-2: 미래 버전 결과도 멱등하다', () => {
  const once  = migrateSettings({ schemaVersion: 5, controlScheme: 'both' });
  const twice = migrateSettings(once);
  assert.deepEqual(twice, once);
});

// ── AC-3 v2 신규 필드 검증 ──────────────────────────────────
test('AC-3: v2 신규 필드 유효값 채택', () => {
  const out = migrateSettings({ schemaVersion: 2, controlScheme: 'wasd', soundEnabled: false });
  assert.equal(out.controlScheme, 'wasd');
  assert.equal(out.soundEnabled, false);
  assert.equal(out.schemaVersion, 2);
});

test('controlScheme 3개 허용값 모두 채택된다', () => {
  for (const scheme of ['arrows', 'wasd', 'both']) {
    assert.equal(migrateSettings({ controlScheme: scheme }).controlScheme, scheme);
  }
});

// ── AC-4 신규 필드 잘못된 값 폴백 ───────────────────────────
test('AC-4: controlScheme 허용 외/soundEnabled 비boolean → 기본값 폴백', () => {
  const out = migrateSettings({ schemaVersion: 2, controlScheme: 'joystick', soundEnabled: 'yes' });
  assert.equal(out.controlScheme, 'arrows'); // 기본값 폴백
  assert.equal(out.soundEnabled, true);      // 비boolean → 기본값
});

test('EC-3: controlScheme 대소문자 "ARROWS" → 기본값 폴백', () => {
  assert.equal(migrateSettings({ controlScheme: 'ARROWS' }).controlScheme, 'arrows');
});

test('EC-4: soundEnabled:null → 기본값 true', () => {
  assert.equal(migrateSettings({ soundEnabled: null }).soundEnabled, true);
});

// ── AC-5 미래 버전 강등 금지 ────────────────────────────────
test('AC-5: schemaVersion:5 → 알려진 필드 보존 + 원본 버전 보존(강등 금지)', () => {
  const out = migrateSettings({ schemaVersion: 5, controlScheme: 'both', difficulty: 'easy' });
  assert.equal(out.controlScheme, 'both');
  assert.equal(out.difficulty, 'easy');
  assert.equal(out.schemaVersion, 5);   // 2 로 강등하지 않음
});

test('EC-7: schemaVersion Infinity → 미래 버전으로 원본 보존', () => {
  assert.equal(migrateSettings({ schemaVersion: Infinity }).schemaVersion, Infinity);
});

test('EC-7: schemaVersion NaN → 미래 분기 미진입 → v2 정규화', () => {
  assert.equal(migrateSettings({ schemaVersion: NaN }).schemaVersion, 2);
});

test('EC-2: schemaVersion 문자열 "2" → 미래 분기 미진입 → v2 정규화', () => {
  const out = migrateSettings({ schemaVersion: '2', controlScheme: 'wasd' });
  assert.equal(out.schemaVersion, 2);
  assert.equal(out.controlScheme, 'wasd');
});

// ── AC-6 기존 7개 필드 계약 불변 (회귀 없음) ────────────────
test('AC-6: cpuCount 범위 밖 → 기본값 폴백', () => {
  assert.equal(migrateSettings({ cpuCount: 9 }).cpuCount, 1);
});

test('AC-6: itemSpawnRate 범위 밖 → clamp', () => {
  assert.equal(migrateSettings({ itemSpawnRate: 5 }).itemSpawnRate, 1.0);
  assert.equal(migrateSettings({ itemSpawnRate: -1 }).itemSpawnRate, 0.0);
});

test('AC-6: timeLimitSec 범위 밖 → clamp, null 유지', () => {
  assert.equal(migrateSettings({ timeLimitSec: 30 }).timeLimitSec, 60);
  assert.equal(migrateSettings({ timeLimitSec: 9999 }).timeLimitSec, 600);
  assert.equal(migrateSettings({ timeLimitSec: null }).timeLimitSec, null);
});

test('AC-6: initialLength 허용 외 → 기본값 폴백', () => {
  assert.equal(migrateSettings({ initialLength: 4 }).initialLength, 3);
  assert.equal(migrateSettings({ initialLength: 5 }).initialLength, 5);
});

test('AC-6: 모르는 필드는 무시된다', () => {
  const out = migrateSettings({ difficulty: 'easy', bogusField: 123 });
  assert.equal(out.bogusField, undefined);
});

// ── 손상 입력 (null/문자열/배열/undefined) ──────────────────
test('EC-1: null/undefined/문자열/배열 → v2 전체 기본값, 예외 미전파', () => {
  for (const bad of [null, undefined, 'corrupt', 42, [], [1, 2, 3], true]) {
    const out = migrateSettings(bad);
    assert.equal(out.schemaVersion, 2);
    assert.equal(out.difficulty, 'normal');
    assert.equal(out.controlScheme, 'arrows');
    assert.equal(out.soundEnabled, true);
  }
});

// ── validateAndMergeSettings 는 v2 를 반환한다 ──────────────
test('AC-3: validateAndMergeSettings 는 v2 (9필드 + version 2) 를 반환한다', () => {
  const out = validateAndMergeSettings({ difficulty: 'easy' });
  assert.equal(out.schemaVersion, 2);
  assert.equal(out.controlScheme, 'arrows');
  assert.equal(out.soundEnabled, true);
  assert.equal(out.difficulty, 'easy');
});

test('validateAndMergeSettings 와 migrateSettings 는 동일 결과', () => {
  const raw = { schemaVersion: 5, controlScheme: 'wasd', cpuCount: 2 };
  assert.deepEqual(validateAndMergeSettings(raw), migrateSettings(raw));
});
