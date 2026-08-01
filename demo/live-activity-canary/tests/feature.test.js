import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readFile } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';

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

const STATIC_CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// serveRoot 아래 파일만 노출하는 self-contained 정적 서버. listen(0) 으로 포트 자동 할당.
function startStaticServer(serveRoot) {
  const root = path.resolve(serveRoot);
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const resolved = path.resolve(root, `.${urlPath}`);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const target = urlPath.endsWith('/') ? path.join(resolved, 'index.html') : resolved;
    readFile(target, (err, buf) => {
      if (err) {
        res.writeHead(404).end('not found');
        return;
      }
      const contentType = STATIC_CONTENT_TYPES[path.extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType }).end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

async function checkE2eReachable(t) {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return false;
  }
  try {
    const probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) {
      t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
      return false;
    }
  } catch (err) {
    t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
    return false;
  }
  return true;
}

test('E2E — 시작 클릭 시 실제 DOM에 활동이 렌더링되고 첫 시도는 실패 상태로 전이된다', async (t) => {
  if (!(await checkE2eReachable(t))) return;

  const { server, port } = await startStaticServer(path.join(__dirname, '..'));
  t.after(() => server.close());

  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');

  const scriptText = `
    await page.getByRole('button', { name: '활동 스트림 시작' }).click();
    await page.waitForFunction(() => document.getElementById('activity-status')?.textContent === '실패 — 다시 시도', null, { timeout: 5000 });
    const statusText = await page.evaluate(() => document.getElementById('activity-status').textContent);
    const errorClass = await page.evaluate(() => document.getElementById('activity-status').classList.contains('activity-status--error'));
    const retryDisabled = await page.evaluate(() => document.getElementById('activity-retry').disabled);
    const activityCount = await page.evaluate(() => document.getElementById('activity-list').children.length);
    const progressNow = await page.evaluate(() => document.getElementById('token-progress').getAttribute('aria-valuenow'));
    if (statusText !== '실패 — 다시 시도') throw new Error('status text mismatch: ' + statusText);
    if (!errorClass) throw new Error('activity-status--error class missing');
    if (retryDisabled) throw new Error('retry button should be enabled after error');
    if (activityCount !== 2) throw new Error('expected 2 rendered activities before failure, got ' + activityCount);
    if (progressNow !== '50') throw new Error('expected progress 50 before failure, got ' + progressNow);
  `;

  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({
      url,
      label: '활동 스트림 시작 → 첫 시도 실패 상태 전이',
      scriptText,
      timeoutMs: 20000,
    }),
  });
  const body = await res.json();
  assert.ok(body.ok && body.passed, `e2e-runner scenario failed: ${JSON.stringify(body)}`);
});

test('E2E — 다시 시도 클릭 후 재시도 스트림이 완료 상태와 100% 진행률로 전이된다', async (t) => {
  if (!(await checkE2eReachable(t))) return;

  const { server, port } = await startStaticServer(path.join(__dirname, '..'));
  t.after(() => server.close());

  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');

  const scriptText = `
    await page.getByRole('button', { name: '활동 스트림 시작' }).click();
    await page.waitForFunction(() => document.getElementById('activity-status')?.textContent === '실패 — 다시 시도', null, { timeout: 5000 });
    await page.getByRole('button', { name: '활동 스트림 다시 시도' }).click();
    await page.waitForFunction(() => document.getElementById('activity-status')?.textContent === '완료', null, { timeout: 6000 });
    const statusText = await page.evaluate(() => document.getElementById('activity-status').textContent);
    const errorClass = await page.evaluate(() => document.getElementById('activity-status').classList.contains('activity-status--error'));
    const progressNow = await page.evaluate(() => document.getElementById('token-progress').getAttribute('aria-valuenow'));
    const barWidth = await page.evaluate(() => document.querySelector('.token-progress__bar').style.width);
    const activityCount = await page.evaluate(() => document.getElementById('activity-list').children.length);
    const retryDisabled = await page.evaluate(() => document.getElementById('activity-retry').disabled);
    const startDisabled = await page.evaluate(() => document.getElementById('activity-start').disabled);
    if (statusText !== '완료') throw new Error('status text mismatch: ' + statusText);
    if (errorClass) throw new Error('activity-status--error class should be removed after recovery');
    if (progressNow !== '100') throw new Error('expected progress 100, got ' + progressNow);
    if (barWidth !== '100%') throw new Error('expected bar width 100%, got ' + barWidth);
    if (activityCount !== 4) throw new Error('expected 4 rendered activities after full stream, got ' + activityCount);
    if (!retryDisabled) throw new Error('retry button should be disabled after success');
    if (startDisabled) throw new Error('start button should be enabled again after completion');
  `;

  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({
      url,
      label: '다시 시도 클릭 → 재시도 완료 상태 전이',
      scriptText,
      timeoutMs: 25000,
    }),
  });
  const body = await res.json();
  assert.ok(body.ok && body.passed, `e2e-runner scenario failed: ${JSON.stringify(body)}`);
});
