// BF-1791 · 격리 실증 미니 페이지 — 상태 머신 focused 단위 테스트 (node --test)
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STATES,
  STATE_LABEL,
  createMiniFeature,
} from '../src/feature.js';

// 지연 resolve/reject 가능한 promise helper — submitting 중간 상태 관찰용
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('상태 상수와 라벨: 4개 상태 모두 색상 외 화면 텍스트를 가진다', () => {
  assert.deepEqual(
    Object.values(STATES).sort(),
    ['error', 'idle', 'submitting', 'success'],
  );
  for (const state of Object.values(STATES)) {
    const label = STATE_LABEL[state];
    assert.equal(typeof label, 'string');
    assert.ok(label.trim().length > 0, `${state} 상태 텍스트가 비어있음`);
  }
  // 상태별 텍스트는 서로 구분되어야 한다 (색상만으로 구분 금지)
  const labels = Object.values(STATES).map((s) => STATE_LABEL[s]);
  assert.equal(new Set(labels).size, labels.length);
});

test('초기 상태는 idle: submit 사용 가능, 진행 표시 없음', () => {
  const feature = createMiniFeature();
  const s = feature.snapshot();
  assert.equal(s.state, STATES.IDLE);
  assert.equal(s.statusText, STATE_LABEL[STATES.IDLE]);
  assert.equal(s.submitDisabled, false);
  assert.equal(s.progressVisible, false);
});

test('submit 성공 흐름: idle → submitting → success', async () => {
  const seen = [];
  const feature = createMiniFeature({
    submitAction: async () => {},
    onChange: (snap) => seen.push(snap.state),
  });

  const result = await feature.submit();

  assert.equal(result.state, STATES.SUCCESS);
  assert.equal(result.statusText, STATE_LABEL[STATES.SUCCESS]);
  assert.equal(result.submitDisabled, false);
  assert.equal(result.progressVisible, false);
  // 중간에 submitting 을 반드시 거친다
  assert.deepEqual(seen, [STATES.SUBMITTING, STATES.SUCCESS]);
});

test('submitting 중: 진행 표시 노출 + submit 비활성(중복 제출 방지)', async () => {
  const d = deferred();
  const feature = createMiniFeature({ submitAction: () => d.promise });

  const pending = feature.submit();
  const mid = feature.snapshot();
  assert.equal(mid.state, STATES.SUBMITTING);
  assert.equal(mid.statusText, STATE_LABEL[STATES.SUBMITTING]);
  assert.equal(mid.submitDisabled, true);
  assert.equal(mid.progressVisible, true);

  // 진행 중 중복 submit 은 상태를 바꾸지 않는다
  await feature.submit();
  assert.equal(feature.snapshot().state, STATES.SUBMITTING);

  d.resolve();
  await pending;
  assert.equal(feature.snapshot().state, STATES.SUCCESS);
});

test('submit 실패 흐름: idle → submitting → error', async () => {
  const feature = createMiniFeature({
    submitAction: async () => {
      throw new Error('boom');
    },
  });

  const result = await feature.submit();
  assert.equal(result.state, STATES.ERROR);
  assert.equal(result.statusText, STATE_LABEL[STATES.ERROR]);
  // 실패 상태에서도 submit 자체는 재시도 위해 재활성
  assert.equal(result.submitDisabled, false);
  assert.equal(result.progressVisible, false);
});

test('reset 후조건: success 이후 초기화 → idle 복원 + control 재활성화', async () => {
  const feature = createMiniFeature({ submitAction: async () => {} });
  await feature.submit();
  assert.equal(feature.snapshot().state, STATES.SUCCESS);

  const s = feature.reset();
  assert.equal(s.state, STATES.IDLE);
  assert.equal(s.statusText, STATE_LABEL[STATES.IDLE]);
  assert.equal(s.submitDisabled, false);
  assert.equal(s.progressVisible, false);
});

test('reset 후조건: error 이후 실패 복구 → idle 복원 + control 재활성화', async () => {
  const feature = createMiniFeature({
    submitAction: async () => {
      throw new Error('boom');
    },
  });
  await feature.submit();
  assert.equal(feature.snapshot().state, STATES.ERROR);

  const s = feature.reset();
  assert.equal(s.state, STATES.IDLE);
  assert.equal(s.submitDisabled, false);
  assert.equal(s.progressVisible, false);
});

test('reset(취소) 후조건: submitting 중 취소 → idle 복원 + 진행 표시 제거', () => {
  const d = deferred();
  const feature = createMiniFeature({ submitAction: () => d.promise });

  feature.submit();
  assert.equal(feature.snapshot().state, STATES.SUBMITTING);

  const s = feature.reset();
  assert.equal(s.state, STATES.IDLE);
  assert.equal(s.progressVisible, false);
  assert.equal(s.submitDisabled, false);
});

test('onChange 는 각 상태 전이마다 최신 snapshot 을 통지한다', async () => {
  const texts = [];
  const feature = createMiniFeature({
    submitAction: async () => {},
    onChange: (snap) => texts.push(snap.statusText),
  });
  await feature.submit();
  feature.reset();
  assert.deepEqual(texts, [
    STATE_LABEL[STATES.SUBMITTING],
    STATE_LABEL[STATES.SUCCESS],
    STATE_LABEL[STATES.IDLE],
  ]);
});
