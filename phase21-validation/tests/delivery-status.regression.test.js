// BF-1321 — 전달 상태 배지 회귀 가드 (tester 고유 영역: 실 브라우저 인터랙션)
//
// dev 의 tests/delivery-status.test.js 는 순수 함수(normalizeStatus/statusText/
// badgeClassName/formatUpdatedAt/fetchDeliveryStatus)와 index.html/styles.css의
// 정적 selector/token만 검증한다. 실제 브라우저에서 createController가 배지를
// 어떻게 그리는지(success/error 화면 텍스트 + ISO 8601 갱신 시각 렌더링), 그리고
// 새로고침 control이 성공/실패 이후 재활성화되는지는 검증하지 않는다.
// 이 파일은 그 인터랙션만 e2e-runner로 회귀 가드한다 (dev 테스트와 중복 없음).

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const serveRoot = resolve(here, '..'); // phase21-validation/

// 확장자별 Content-Type. module script(<script type="module">)는 strict MIME 검사를
// 통과해야 브라우저가 로드하므로 반드시 지정해야 한다.
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// serveRoot 아래의 정적 파일만 노출하는 self-contained 서버. listen(0)으로 포트 자동 할당.
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
      const contentType = CONTENT_TYPES[path.extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType }).end(buf);
    });
  });
  return new Promise((resolvePromise) => {
    server.listen(0, '0.0.0.0', () => resolvePromise({ server, port: server.address().port }));
  });
}

let e2eAvailable = true;
let skipReason = null;
let server;
let port;

test.before(async () => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    e2eAvailable = false;
    skipReason = 'BRIX_E2E_SKIP=1 — CI 결정성 가드';
    return;
  }
  try {
    const probe = await fetch('http://e2e-runner:3030/health', {
      signal: AbortSignal.timeout(2000),
    });
    if (!probe.ok) {
      e2eAvailable = false;
      skipReason = `e2e-runner unhealthy (${probe.status})`;
      return;
    }
  } catch (err) {
    e2eAvailable = false;
    skipReason = `e2e-runner 도달 불가 (${err.message}) — CI 환경 정상`;
    return;
  }
  const started = await startStaticServer(serveRoot);
  server = started.server;
  port = started.port;
});

test.after(() => {
  if (server) server.close();
});

async function runE2e({ label, scriptText }) {
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;
  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity(BRIX_RUN_ID/BRIX_JIRA_KEY) missing');

  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({ url, label, scriptText, timeoutMs: 30000 }),
  });
  const body = await res.json();
  return body;
}

// --- AC-3 — success 화면 텍스트 + ISO 8601 갱신 시각 + 새로고침 재활성화 -----
test('BF-1321 새로고침 → success 배지 텍스트/class + ISO 8601 갱신 시각 + control 재활성화', async (t) => {
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }
  const scriptText = `
    const refresh = page.locator('#delivery-status-refresh');
    const badge = page.locator('#delivery-status-badge');
    const updatedAt = page.locator('#delivery-status-updated-at');

    await refresh.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const el = document.getElementById('delivery-status-refresh');
      return !!el && !el.disabled;
    }, null, { timeout: 10000 });

    await page.route('**/api/delivery-status.json', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', updatedAt: '2026-07-30T09:00:00Z' }),
    }));

    await refresh.click();

    await page.waitForFunction(() => {
      const b = document.getElementById('delivery-status-badge');
      return !!b && b.textContent === '정상';
    }, null, { timeout: 10000 });

    const badgeText = await badge.textContent();
    if (badgeText !== '정상') throw new Error('배지 화면 텍스트 불일치: ' + badgeText);

    const badgeClass = await badge.getAttribute('class');
    if (!badgeClass.includes('delivery-status__badge--success')) {
      throw new Error('success modifier class 누락: ' + badgeClass);
    }

    const updatedText = await updatedAt.textContent();
    if (!/2026-07-30T09:00:00(\\.000)?Z/.test(updatedText)) {
      throw new Error('ISO 8601 갱신 시각 렌더링 누락: ' + updatedText);
    }

    const disabledAfter = await refresh.getAttribute('disabled');
    if (disabledAfter !== null) {
      throw new Error('success 이후 새로고침 control이 재활성화되지 않음');
    }
  `;
  const result = await runE2e({
    label: 'BF-1321 전달상태 새로고침 success 렌더 + ISO갱신시각 + control 재활성화',
    scriptText,
  });
  assert(result.ok && result.passed, `e2e 시나리오(success) 실패: ${JSON.stringify(result)}`);
});

// --- AC-4 — error 화면 텍스트/class + 새로고침 재활성화 ----------------------
test('BF-1321 새로고침 → error 배지 텍스트/class + control 재활성화', async (t) => {
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }
  const scriptText = `
    const refresh = page.locator('#delivery-status-refresh');
    const badge = page.locator('#delivery-status-badge');

    await refresh.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const el = document.getElementById('delivery-status-refresh');
      return !!el && !el.disabled;
    }, null, { timeout: 10000 });

    await page.route('**/api/delivery-status.json', (route) => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'boom' }),
    }));

    await refresh.click();

    await page.waitForFunction(() => {
      const b = document.getElementById('delivery-status-badge');
      return !!b && b.textContent === '오류';
    }, null, { timeout: 10000 });

    const badgeText = await badge.textContent();
    if (badgeText !== '오류') throw new Error('배지 화면 텍스트 불일치: ' + badgeText);

    const badgeClass = await badge.getAttribute('class');
    if (!badgeClass.includes('delivery-status__badge--error')) {
      throw new Error('error modifier class 누락: ' + badgeClass);
    }

    const disabledAfter = await refresh.getAttribute('disabled');
    if (disabledAfter !== null) {
      throw new Error('error 이후 새로고침 control이 재활성화되지 않음');
    }
  `;
  const result = await runE2e({
    label: 'BF-1321 전달상태 새로고침 error 렌더 + control 재활성화',
    scriptText,
  });
  assert(result.ok && result.passed, `e2e 시나리오(error) 실패: ${JSON.stringify(result)}`);
});
