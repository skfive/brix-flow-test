// 네온 스네이크 · 최고 기록 순수 함수 단위 테스트 (node --test, DOM/localStorage 비의존)
// 검증 기준: docs/plans/snake-highscore-BF-1513.md §8 (TS-PERSIST, TS-NEWRECORD)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HIGH_SCORE_NAMESPACE,
  storageKeyFor,
  loadBest,
  saveBest,
  isNewRecord,
  formatBestText,
  formatCurrentText,
} from '../highscore.js';

// 결정론적 페이크 저장소 — 초기값을 주입해 시드를 고정한다.
function fakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

// 접근 시 항상 예외를 던지는 저장소(프라이빗 모드/접근 거부 재현).
function throwingStorage() {
  return {
    getItem() {
      throw new Error('access denied');
    },
    setItem() {
      throw new Error('access denied');
    },
  };
}

// ---- storageKeyFor: 모드별 키 격리 ----
test('storageKeyFor: 네임스페이스에 모드 suffix 를 결합한다', () => {
  assert.equal(storageKeyFor('local'), `${HIGH_SCORE_NAMESPACE}:local`);
  assert.equal(storageKeyFor('cpu'), `${HIGH_SCORE_NAMESPACE}:cpu`);
  assert.notEqual(storageKeyFor('local'), storageKeyFor('cpu'));
});

test('storageKeyFor: 레거시 단일 키(suffix 없음)와 충돌하지 않는다', () => {
  assert.notEqual(storageKeyFor('local'), HIGH_SCORE_NAMESPACE);
  assert.ok(storageKeyFor('local').startsWith(`${HIGH_SCORE_NAMESPACE}:`));
});

// ---- TS-PERSIST: loadBest ----
test('loadBest: 저장값 없으면 0', () => {
  assert.equal(loadBest(fakeStorage(), 'local'), 0);
});

test('loadBest: 유효한 비음수 정수 문자열을 그대로 반환', () => {
  const storage = fakeStorage({ [storageKeyFor('cpu')]: '120' });
  assert.equal(loadBest(storage, 'cpu'), 120);
});

test('loadBest: 손상값(음수/NaN/비수치/null)은 모두 0', () => {
  assert.equal(loadBest(fakeStorage({ [storageKeyFor('local')]: '-5' }), 'local'), 0);
  assert.equal(loadBest(fakeStorage({ [storageKeyFor('local')]: 'abc' }), 'local'), 0);
  assert.equal(loadBest(fakeStorage({ [storageKeyFor('local')]: '' }), 'local'), 0);
  assert.equal(loadBest(fakeStorage({ [storageKeyFor('local')]: 'NaN' }), 'local'), 0);
});

test('loadBest: 접근 예외를 삼키고 0 을 반환', () => {
  assert.equal(loadBest(throwingStorage(), 'local'), 0);
});

test('loadBest: 한 모드의 기록은 다른 모드 조회에 영향을 주지 않는다', () => {
  const storage = fakeStorage({ [storageKeyFor('local')]: '80' });
  assert.equal(loadBest(storage, 'local'), 80);
  assert.equal(loadBest(storage, 'cpu'), 0);
});

// ---- TS-PERSIST: saveBest ----
test('saveBest: 기존 최고보다 큰 유효 점수는 저장하고 그 값을 반환', () => {
  const storage = fakeStorage();
  assert.equal(saveBest(storage, 'local', 50), 50);
  assert.equal(storage.getItem(storageKeyFor('local')), '50');
  assert.equal(loadBest(storage, 'local'), 50);
});

test('saveBest: 기존 최고 이하 점수는 저장하지 않고 기존 최고를 반환(no-downgrade)', () => {
  const storage = fakeStorage({ [storageKeyFor('local')]: '100' });
  assert.equal(saveBest(storage, 'local', 40), 100);
  assert.equal(saveBest(storage, 'local', 100), 100); // 동점도 no-downgrade
  assert.equal(storage.getItem(storageKeyFor('local')), '100');
});

test('saveBest: 유효하지 않은 점수(음수/실수/NaN)는 저장하지 않는다', () => {
  const storage = fakeStorage({ [storageKeyFor('cpu')]: '30' });
  assert.equal(saveBest(storage, 'cpu', -10), 30);
  assert.equal(saveBest(storage, 'cpu', 12.5), 30);
  assert.equal(saveBest(storage, 'cpu', Number.NaN), 30);
  assert.equal(storage.getItem(storageKeyFor('cpu')), '30');
});

test('saveBest: 접근 예외를 삼키고 no-op(기존 최고 0 반환)', () => {
  assert.equal(saveBest(throwingStorage(), 'local', 999), 0);
});

test('saveBest: 모드 격리 — local 저장이 cpu 기록에 영향을 주지 않는다', () => {
  const storage = fakeStorage();
  saveBest(storage, 'local', 70);
  assert.equal(loadBest(storage, 'local'), 70);
  assert.equal(loadBest(storage, 'cpu'), 0);
});

// ---- TS-NEWRECORD: isNewRecord ----
test('isNewRecord: 저장된 최고보다 엄격히 크면 true', () => {
  const storage = fakeStorage({ [storageKeyFor('local')]: '90' });
  assert.equal(isNewRecord(storage, 'local', 91), true);
});

test('isNewRecord: 동점은 신기록이 아니다(false)', () => {
  const storage = fakeStorage({ [storageKeyFor('local')]: '90' });
  assert.equal(isNewRecord(storage, 'local', 90), false);
});

test('isNewRecord: 최고 미만은 false', () => {
  const storage = fakeStorage({ [storageKeyFor('local')]: '90' });
  assert.equal(isNewRecord(storage, 'local', 10), false);
});

test('isNewRecord: 손상 기준값(0) 대비 — 양수는 신기록, 0 은 아니다', () => {
  const storage = fakeStorage({ [storageKeyFor('cpu')]: 'corrupt' });
  assert.equal(isNewRecord(storage, 'cpu', 1), true);
  assert.equal(isNewRecord(storage, 'cpu', 0), false);
});

test('isNewRecord: 유효하지 않은 점수는 신기록이 아니다', () => {
  const storage = fakeStorage();
  assert.equal(isNewRecord(storage, 'local', -1), false);
  assert.equal(isNewRecord(storage, 'local', 3.14), false);
  assert.equal(isNewRecord(storage, 'local', Number.NaN), false);
});

// ---- 상태 텍스트 포매터 ----
test('formatBestText / formatCurrentText: frozen 상태 텍스트를 생성', () => {
  assert.equal(formatBestText(0), '최고 기록 0');
  assert.equal(formatBestText(120), '최고 기록 120');
  assert.equal(formatCurrentText(0), '이번 점수 0');
  assert.equal(formatCurrentText(45), '이번 점수 45');
});

// ---- 왕복 시나리오 (결정론) ----
test('저장→조회→신기록 왕복: 시드 고정 시 결정론적으로 동작', () => {
  const storage = fakeStorage();
  assert.equal(loadBest(storage, 'cpu'), 0); // empty-record
  assert.equal(isNewRecord(storage, 'cpu', 30), true);
  assert.equal(saveBest(storage, 'cpu', 30), 30);
  assert.equal(loadBest(storage, 'cpu'), 30);
  assert.equal(isNewRecord(storage, 'cpu', 30), false); // 갱신 후 동점
  assert.equal(saveBest(storage, 'cpu', 25), 30); // no-downgrade
  assert.equal(loadBest(storage, 'cpu'), 30);
});
