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
const moduleRoot = resolve(here, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

// serveRoot 아래의 정적 파일만 노출하는 self-contained 서버. listen(0) 으로 포트 자동 할당.
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
    fs.readFile(target, (err, buf) => {
      if (err) {
        res.writeHead(404).end('not found');
        return;
      }
      const contentType = MIME_TYPES[path.extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType }).end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

async function checkE2eRunner() {
  try {
    const probe = await fetch('http://e2e-runner:3030/health', {
      signal: AbortSignal.timeout(2000),
    });
    return probe.ok ? null : `e2e-runner unhealthy (${probe.status})`;
  } catch (err) {
    return `e2e-runner 도달 불가 (${err.message})`;
  }
}

async function runE2e(t, { url, label, scriptText, timeoutMs = 30000 }) {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return;
  }
  const unhealthy = await checkE2eRunner();
  if (unhealthy) {
    t.skip(`${unhealthy} — skip`);
    return;
  }

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

  const body = await res.json();
  if (!body.ok || !body.passed) {
    throw new Error(`e2e-runner 시나리오 실패 [${label}]: ${JSON.stringify(body)}`);
  }
}

let server;
let port;

test.before(async () => {
  const started = await startStaticServer(moduleRoot);
  server = started.server;
  port = started.port;
});

test.after(() => {
  server.close();
});

// AC1 — normal/warning/failed 3상태 렌더 + 한글 라벨 (실 브라우저)
test('BF-1445 — normal/warning/failed 3상태 배지·한글 라벨 렌더 (실 브라우저)', { skip: _brixOutOfScope }, async (t) => {
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const scriptText = `
    const cases = [
      { status: 'normal', label: '정상', cls: 'delivery-status__badge--normal' },
      { status: 'warning', label: '경고', cls: 'delivery-status__badge--warning' },
      { status: 'failed', label: '실패', cls: 'delivery-status__badge--failed' },
    ];
    for (const c of cases) {
      await page.route('**/delivery-status.json', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: c.status, updatedAt: '2026-08-01T09:00:00Z' }),
        });
      });
      await page.goto('${url}');
      await page.waitForFunction(
        (label) => document.getElementById('delivery-status-label')?.textContent === label,
        c.label,
        { timeout: 5000 }
      );
      const hasClass = await page.evaluate(
        (cls) => document.getElementById('delivery-status-badge').classList.contains(cls),
        c.cls
      );
      if (!hasClass) throw new Error('badge class mismatch for ' + c.status);
      const labelText = await page.evaluate(() => document.getElementById('delivery-status-label').textContent);
      if (labelText !== c.label) throw new Error('label mismatch: ' + labelText + ' expected ' + c.label);
      await page.unroute('**/delivery-status.json');
    }
  `;

  await runE2e(t, {
    url,
    label: '전달 상태 배지 — normal/warning/failed 3상태 렌더',
    scriptText,
  });
});

// AC2 — 키보드 접근성(Tab/Enter/Space) + 320px 좁은 화면 overflow 없음
test('BF-1445 — 키보드 포커스·Enter/Space 새로고침·320px overflow 없음 (실 브라우저)', { skip: _brixOutOfScope }, async (t) => {
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const scriptText = `
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('${url}');
    await page.waitForFunction(
      () => document.getElementById('delivery-status-label')?.textContent === '정상',
      null,
      { timeout: 5000 }
    );

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    if (overflow) throw new Error('320px viewport: 가로 overflow 발생');

    await page.keyboard.press('Tab');
    const focusedId = await page.evaluate(() => document.activeElement && document.activeElement.id);
    if (focusedId !== 'delivery-status-refresh') throw new Error('Tab 포커스 불일치: ' + focusedId);

    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => document.getElementById('delivery-status-label')?.textContent === '정상',
      null,
      { timeout: 5000 }
    );

    await page.keyboard.press('Space');
    await page.waitForFunction(
      () => document.getElementById('delivery-status-label')?.textContent === '정상',
      null,
      { timeout: 5000 }
    );
  `;

  await runE2e(t, {
    url,
    label: '전달 상태 배지 — 320px 키보드 Tab/Enter/Space 새로고침',
    scriptText,
  });
});

// AC3 — 새로고침(reload) 후 상태/갱신 시각 복원 + refresh 버튼 재활성화
test('BF-1445 — 새로고침 후 상태·갱신시각 복원과 refresh 버튼 재활성화 (실 브라우저)', { skip: _brixOutOfScope }, async (t) => {
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const scriptText = `
    await page.goto('${url}');
    await page.waitForFunction(
      () => document.getElementById('delivery-status-label')?.textContent === '정상',
      null,
      { timeout: 5000 }
    );
    const before = await page.evaluate(() => document.getElementById('delivery-status-updated').textContent);
    if (!before) throw new Error('reload 전 갱신 시각이 비어있음');

    await page.reload();
    await page.waitForFunction(
      () => document.getElementById('delivery-status-label')?.textContent === '정상',
      null,
      { timeout: 5000 }
    );
    const after = await page.evaluate(() => document.getElementById('delivery-status-updated').textContent);
    if (!after) throw new Error('reload 후 갱신 시각 복원 실패');

    for (let i = 0; i < 3; i++) {
      await page.click('#delivery-status-refresh');
      await page.waitForFunction(
        () => document.getElementById('delivery-status-label')?.textContent === '정상',
        null,
        { timeout: 5000 }
      );
      const disabled = await page.evaluate(
        () => document.getElementById('delivery-status-refresh').disabled
      );
      if (disabled) throw new Error('refresh 버튼이 클릭 #' + i + ' 후 재활성화되지 않음');
    }
  `;

  await runE2e(t, {
    url,
    label: '전달 상태 배지 — 새로고침 복원·refresh 버튼 재활성화',
    scriptText,
  });
});
