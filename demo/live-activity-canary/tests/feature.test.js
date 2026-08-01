import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  STATUS,
  STATUS_TEXT,
  createInitialState,
  startStreaming,
  receiveActivity,
  completeStreaming,
  failStreaming,
  retry,
  isRetryActive,
  getStatusText,
  clampProgress,
} from '../src/feature.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('AC1 — 초기 idle 상태 텍스트/진행률', () => {
  const state = createInitialState();
  assert.equal(state.status, STATUS.IDLE);
  assert.equal(state.progress, 0);
  assert.equal(getStatusText(state), '대기 중');
  assert.equal(isRetryActive(state), false);
});

test('AC2 — streaming 진행 시 상태 텍스트와 activity/progress 누적', () => {
  let state = startStreaming();
  assert.equal(state.status, STATUS.STREAMING);
  assert.equal(getStatusText(state), '실행 중 — tool 활동 수신');

  state = receiveActivity(state, { tool: 'Read', detail: 'read' }, 25);
  assert.equal(state.activities.length, 1);
  assert.equal(state.progress, 25);

  state = receiveActivity(state, { tool: 'Grep', detail: 'grep' }, 50);
  assert.equal(state.activities.length, 2);
  assert.equal(state.progress, 50);
});

test('AC3 — 정상 완료 시 완료 텍스트와 100% 진행률', () => {
  let state = startStreaming();
  state = receiveActivity(state, { tool: 'Read', detail: 'read' }, 50);
  state = completeStreaming(state);

  assert.equal(state.status, STATUS.COMPLETE);
  assert.equal(getStatusText(state), '완료');
  assert.equal(state.progress, 100);
});

test('AC4 — 실패 시 실패 텍스트와 retry 활성화', () => {
  let state = startStreaming();
  state = receiveActivity(state, { tool: 'Read', detail: 'read' }, 25);
  state = failStreaming(state);

  assert.equal(state.status, STATUS.ERROR);
  assert.equal(getStatusText(state), '실패 — 다시 시도');
  assert.equal(isRetryActive(state), true);
});

test('AC5 — retry 이후 idle 초기값으로 리셋', () => {
  let state = startStreaming();
  state = receiveActivity(state, { tool: 'Read', detail: 'read' }, 25);
  state = failStreaming(state);

  state = retry(state);
  assert.equal(state.status, STATUS.IDLE);
  assert.equal(state.progress, 0);
  assert.equal(state.activities.length, 0);
  assert.equal(isRetryActive(state), false);

  state = startStreaming();
  assert.equal(state.status, STATUS.STREAMING);
});

test('AC6 — 4개 상태 모두 색상이 아닌 텍스트로 구분되고 STATUS_TEXT가 계약과 일치', () => {
  assert.equal(STATUS_TEXT[STATUS.IDLE], '대기 중');
  assert.equal(STATUS_TEXT[STATUS.STREAMING], '실행 중 — tool 활동 수신');
  assert.equal(STATUS_TEXT[STATUS.COMPLETE], '완료');
  assert.equal(STATUS_TEXT[STATUS.ERROR], '실패 — 다시 시도');
});

test('streaming/complete/idle 상태가 아니면 receiveActivity는 상태를 변경하지 않는다', () => {
  const idleState = createInitialState();
  assert.equal(receiveActivity(idleState, { tool: 'Read', detail: 'read' }, 10), idleState);

  const completeState = completeStreaming(receiveActivity(startStreaming(), { tool: 'Read', detail: 'r' }, 10));
  assert.equal(receiveActivity(completeState, { tool: 'Read', detail: 'read' }, 10), completeState);
});

test('clampProgress는 0-100 범위로 값을 제한한다', () => {
  assert.equal(clampProgress(-10), 0);
  assert.equal(clampProgress(150), 100);
  assert.equal(clampProgress(42.6), 43);
});

test('index.html — frozen DOM ID/class/토큰 계약이 그대로 존재한다', () => {
  assert.match(indexHtml, /id="activity-stream-root"/);
  assert.match(indexHtml, /id="activity-list"/);
  assert.match(indexHtml, /id="token-progress"/);
  assert.match(indexHtml, /id="activity-status"/);
  assert.match(indexHtml, /id="activity-retry"/);

  assert.match(indexHtml, /class="activity-stream"/);
  assert.match(indexHtml, /token-progress__bar/);
  assert.match(indexHtml, /activity-status--error/);

  assert.match(indexHtml, /--color-activity-accent:\s*#2563eb/);
  assert.match(indexHtml, /--color-activity-error:\s*#dc2626/);
  assert.match(indexHtml, /--space-activity-gap:\s*12px/);

  assert.match(indexHtml, /aria-live="polite"/);
  assert.match(indexHtml, /role="progressbar"/);
  assert.match(indexHtml, /aria-valuenow="0"/);
  assert.match(indexHtml, /aria-label="[^"]+"[^>]*id="activity-retry"|id="activity-retry"[^>]*aria-label="[^"]+"/);

  assert.match(indexHtml, /<script type="module" src="\.\/src\/feature\.js">/);
});
