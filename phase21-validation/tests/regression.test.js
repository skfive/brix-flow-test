import test from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'delivery-status';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const here = dirname(fileURLToPath(import.meta.url));
const serveRoot = resolve(here, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

// serveRoot 아래의 정적 파일만 노출하는 self-contained 서버. listen(0) 으로 포트 자동 할당.
function startStaticServer(root) {
  const resolvedRoot = path.resolve(root);
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const resolved = path.resolve(resolvedRoot, `.${urlPath}`);
    if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const target = urlPath.endsWith('/') ? path.join(resolved, 'index.html') : resolved;
    fs.readFile(target, (err, buf) => {
      if (err) {
        res.writeHead(404).end('not found');
        return;
      }
      const contentType = MIME_TYPES[path.extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType }).end(buf);
    });
  });
  return new Promise((res) => {
    server.listen(0, '0.0.0.0', () => res({ server, port: server.address().port }));
  });
}

async function callE2eRunner({ url, label, scriptText, timeoutMs = 30000 }) {
  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');
  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({ url, label, scriptText, timeoutMs }),
  });
  return res.json();
}

// --- 실 브라우저 E2E: delivered/error 렌더 + refresh 재활성화 (tester 고유 영역) ---

test('BF-1432 전달 상태 배지 — delivered 상태 렌더 (e2e-runner)', { skip: _brixOutOfScope }, async (t) => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return;
  }
  try {
    const probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) {
      t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
      return;
    }
  } catch (err) {
    t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
    return;
  }

  const { server, port } = await startStaticServer(serveRoot);
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const scriptText = `
    const badge = page.locator('#delivery-status-badge');
    await badge.waitFor({ state: 'attached' });
    await page.waitForFunction(() => {
      const el = document.getElementById('delivery-status-badge');
      return el && el.textContent === '전달 완료';
    }, null, { timeout: 10000 });
    const rootClass = await page.evaluate(() => document.getElementById('delivery-status-root').className);
    if (!rootClass.includes('delivery-status--delivered')) throw new Error('root modifier class 누락: ' + rootClass);
    const timestampHidden = await page.evaluate(() => document.getElementById('delivery-status-timestamp').hidden);
    if (timestampHidden) throw new Error('delivered 상태에서 timestamp 가 hidden 이면 안 됨');
    const refreshDisabled = await page.evaluate(() => document.getElementById('delivery-status-refresh').disabled);
    if (refreshDisabled) throw new Error('delivered 상태에서 refresh 는 활성화되어 있어야 함');
  `;

  const result = await callE2eRunner({
    url,
    label: '전달 상태 배지 — delivered 렌더',
    scriptText,
  });
  assertPassed(result);
});

test('BF-1432 전달 상태 배지 — error 렌더 + refresh 재활성화 (e2e-runner)', { skip: _brixOutOfScope }, async (t) => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return;
  }
  try {
    const probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) {
      t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
      return;
    }
  } catch (err) {
    t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
    return;
  }

  const { server, port } = await startStaticServer(serveRoot);
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const scriptText = `
    // delivery-status.json 요청을 서버 오류로 가로채 error 경로를 강제로 재현.
    await page.route('**/delivery-status.json', (route) => route.fulfill({ status: 500, body: 'error' }));
    await page.goto(${JSON.stringify(url)});
    await page.waitForFunction(() => {
      const el = document.getElementById('delivery-status-badge');
      return el && el.textContent === '전달 상태를 불러오지 못했습니다';
    }, null, { timeout: 10000 });
    const rootClass = await page.evaluate(() => document.getElementById('delivery-status-root').className);
    if (!rootClass.includes('delivery-status--error')) throw new Error('error 상태 root modifier class 누락: ' + rootClass);
    const timestampHiddenAfterError = await page.evaluate(() => document.getElementById('delivery-status-timestamp').hidden);
    if (!timestampHiddenAfterError) throw new Error('error 상태에서 timestamp 는 hidden 이어야 함');
    const refreshDisabledAfterError = await page.evaluate(() => document.getElementById('delivery-status-refresh').disabled);
    if (refreshDisabledAfterError) throw new Error('error 렌더 직후 refresh 는 즉시 재활성화되어 있어야 함');

    // refresh 클릭 → loading 표시 후 재활성화까지 재확인 (재시도 흐름).
    await page.locator('#delivery-status-refresh').click();
    const disabledDuringLoad = await page.evaluate(() => document.getElementById('delivery-status-refresh').disabled);
    if (!disabledDuringLoad) throw new Error('재시도 진행 중에는 refresh 가 비활성화되어야 함');
    await page.waitForFunction(() => {
      const btn = document.getElementById('delivery-status-refresh');
      return btn && btn.disabled === false;
    }, null, { timeout: 10000 });
    const refreshDisabledAfterRetry = await page.evaluate(() => document.getElementById('delivery-status-refresh').disabled);
    if (refreshDisabledAfterRetry) throw new Error('재시도 완료 후 refresh 는 다시 활성화되어야 함');
  `;

  const result = await callE2eRunner({
    url,
    label: '전달 상태 배지 — error 렌더 + refresh 재활성화',
    scriptText,
  });
  assertPassed(result);
});

function assertPassed(result) {
  if (!result || result.ok !== true || result.passed !== true) {
    throw new Error(`e2e-runner 시나리오 실패: ${JSON.stringify(result)}`);
  }
}
