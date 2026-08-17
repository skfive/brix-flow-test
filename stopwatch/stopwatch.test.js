'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatElapsed, addLap, getControlsState } = require('./stopwatch.js');

function baseState() {
  return { status: 'running', accumulatedMs: 0, startedAt: 0, laps: [] };
}

test('formatElapsed: 0ms는 00:00.00', () => {
  assert.equal(formatElapsed(0), '00:00.00');
});

test('formatElapsed: 1/100초 단위를 정확히 반영한다', () => {
  assert.equal(formatElapsed(1234), '00:01.23');
});

test('formatElapsed: 초 경계(1000ms)는 00:01.00', () => {
  assert.equal(formatElapsed(1000), '00:01.00');
});

test('formatElapsed: 초 경계 직전(999ms)은 00:00.99', () => {
  assert.equal(formatElapsed(999), '00:00.99');
});

test('formatElapsed: 분 경계(60000ms)는 01:00.00', () => {
  assert.equal(formatElapsed(60000), '01:00.00');
});

test('formatElapsed: 분 경계 직전(59990ms)은 00:59.99', () => {
  assert.equal(formatElapsed(59990), '00:59.99');
});

test('formatElapsed: 음수/NaN 입력은 00:00.00으로 방어한다', () => {
  assert.equal(formatElapsed(-5), '00:00.00');
  assert.equal(formatElapsed(NaN), '00:00.00');
});

test('addLap: 첫 랩의 구간은 누적 경과시간과 같다', () => {
  const next = addLap(baseState(), 1500);
  assert.equal(next.laps.length, 1);
  assert.equal(next.laps[0].lapMs, 1500);
  assert.equal(next.laps[0].totalMs, 1500);
});

test('addLap: 두번째 랩은 이전 누적과의 구간만 계산한다', () => {
  let state = addLap(baseState(), 1000);
  state = addLap(state, 2500);
  assert.equal(state.laps[1].lapMs, 1500);
  assert.equal(state.laps[1].totalMs, 2500);
});

test('addLap: 원본 state와 laps를 변경하지 않고 새 state를 반환한다', () => {
  const state = baseState();
  const snapshot = JSON.parse(JSON.stringify(state));
  addLap(state, 1000);
  assert.deepEqual(state, snapshot);
});

test('addLap: 랩이 2개 이상이면 최단/최장 랩을 표시한다', () => {
  let state = addLap(baseState(), 1000); // lap1 구간 1000
  state = addLap(state, 1500); // lap2 구간 500 (최단)
  state = addLap(state, 4000); // lap3 구간 2500 (최장)
  assert.equal(state.laps[0].isFastest, false);
  assert.equal(state.laps[0].isSlowest, false);
  assert.equal(state.laps[1].isFastest, true);
  assert.equal(state.laps[2].isSlowest, true);
});

test('addLap: 랩이 1개뿐이면 최단/최장을 표시하지 않는다', () => {
  const state = addLap(baseState(), 1000);
  assert.equal(state.laps[0].isFastest, false);
  assert.equal(state.laps[0].isSlowest, false);
});

test('getControlsState: idle 상태에서는 시작 버튼만 활성이고 랩은 비활성이다', () => {
  const controls = getControlsState('idle');
  assert.equal(controls.startDisabled, false);
  assert.equal(controls.startLabel, '시작');
  assert.equal(controls.pauseDisabled, true);
  assert.equal(controls.resetDisabled, true);
  assert.equal(controls.lapDisabled, true);
});

test('getControlsState: running 상태에서는 일시정지/랩 버튼만 활성이다', () => {
  const controls = getControlsState('running');
  assert.equal(controls.startDisabled, true);
  assert.equal(controls.pauseDisabled, false);
  assert.equal(controls.resetDisabled, true);
  assert.equal(controls.lapDisabled, false);
});

test('getControlsState: paused 상태에서는 재개/리셋 버튼만 활성이고 랩은 비활성이다(리셋 후 재활성화 계약)', () => {
  const controls = getControlsState('paused');
  assert.equal(controls.startDisabled, false);
  assert.equal(controls.startLabel, '재개');
  assert.equal(controls.pauseDisabled, true);
  assert.equal(controls.resetDisabled, false);
  assert.equal(controls.lapDisabled, true);
});
