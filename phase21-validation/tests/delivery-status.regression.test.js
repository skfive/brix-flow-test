// 전달 상태 배지 회귀 가드 (BF-1375)
// frozen ui-contract@v1 / api-contract@v1 (docs/plans/delivery-status-BF-1370.md §3~6)
// dev 의 unit test(delivery-status.unit.test.js)는 순수 로직(resolveResponse/formatUpdatedAt 등)만
// 검증한다 — 여기서는 tester 고유 영역인 HTML/CSS 마크업 contract 와 실 브라우저 DOM 렌더링·
// 인터랙션(loading/ready/error/forbidden 상태 전이, ISO 8601 갱신 시각 렌더링)을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = path.resolve(__dirname, '..');

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'delivery-status';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// --- 1. UI 마크업 contract (정적 가드, §3.2~3.4) ----------------------------

const html = fs.readFileSync(path.join(MODULE_ROOT, 'index.html'), 'utf-8');

test('AC — index.html: frozen DOM id 3종이 존재한다 (§3.2)', { skip: _brixOutOfScope }, () => {
  assert.ok(html.includes('id="delivery-status-root"'));
  assert.ok(html.includes('id="delivery-status-badge"'));
  assert.ok(html.includes('id="delivery-status-timestamp"'));
});

test('AC — index.html: root 는 aria-live=polite + data-role 새로고침 control 을 갖는다 (§3.2)', { skip: _brixOutOfScope }, () => {
  assert.ok(html.includes('aria-live="polite"'));
  assert.ok(html.includes('data-role="delivery-status-refresh"'));
});

test('AC — index.html: 배지/타임스탬프 frozen class 3종이 존재한다 (§3.2)', { skip: _brixOutOfScope }, () => {
  assert.ok(html.includes('class="delivery-status"'));
  assert.ok(html.includes('delivery-status__badge'));
  assert.ok(html.includes('delivery-status__timestamp'));
});

test('AC — index.html: 4개 상태(loading/ready/error/forbidden)의 data-status 선택자가 CSS 에 정의되어 있다 (§3.3)', { skip: _brixOutOfScope }, () => {
  assert.ok(html.includes('[data-status="loading"]'));
  assert.ok(html.includes('[data-status="ready"]'));
  assert.ok(html.includes('[data-status="error"]'));
  assert.ok(html.includes('[data-status="forbidden"]'));
});

test('AC — index.html: frozen 색상/간격 디자인 토큰 4종이 정의되어 있다 (§3.4)', { skip: _brixOutOfScope }, () => {
  assert.ok(html.includes('--color-status-success: #16a34a'));
  assert.ok(html.includes('--color-status-pending: #f59e0b'));
  assert.ok(html.includes('--color-status-error: #dc2626'));
  assert.ok(html.includes('--space-badge-gap'));
});

test('AC — index.html: 컴포넌트 스크립트가 src/delivery-status.js 를 로드한다', { skip: _brixOutOfScope }, () => {
  assert.ok(html.includes('src="./src/delivery-status.js"'));
});

test('AC — src/delivery-status.js: 브라우저 DOM 컨트롤러(createController)를 export 한다', { skip: _brixOutOfScope }, () => {
  const js = fs.readFileSync(path.join(MODULE_ROOT, 'src/delivery-status.js'), 'utf-8');
  assert.ok(js.includes('export function createController'));
});

// --- 2. 실 브라우저 E2E — DOM 렌더링 + 상태 전이 (tester 고유 영역) --------
//
// dev 의 unit test 는 브라우저/DOM 렌더링을 검증하지 않는다(해당 파일 상단 명시 주석 참고).
// createController 의 render()/load()/버튼 재활성화는 실 브라우저에서만 검증 가능하다.

// 확장자별 Content-Type. `<script type="module">` 은 strict MIME 검사를 통과해야
// 브라우저가 로드하므로 반드시 지정해야 한다 (미지정 시 module script 로드 실패).
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
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
      const contentType = CONTENT_TYPES[path.extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType }).end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

async function e2eHealthy() {
  if (process.env.BRIX_E2E_SKIP === '1') return false;
  try {
    const probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
    return probe.ok;
  } catch {
    return false;
  }
}

async function callE2E({ url, label, scriptText }) {
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
    body: JSON.stringify({ url, label, scriptText, timeoutMs: 30000 }),
  });
  return res.json();
}

test('AC — E2E: ready 상태 렌더링 + ISO 8601 갱신 시각 표시 (loading→ready)', { skip: _brixOutOfScope }, async (t) => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return;
  }
  if (!(await e2eHealthy())) {
    t.skip('e2e-runner 도달 불가 — skip');
    return;
  }
  const { server, port } = await startStaticServer(MODULE_ROOT);
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const scriptText = `
    await page.waitForSelector('#delivery-status-badge[data-status="ready"]', { timeout: 5000 });
    const badgeText = await page.locator('#delivery-status-badge').textContent();
    if (badgeText !== '전달 완료') throw new Error('badge text mismatch: ' + badgeText);
    const hidden = await page.locator('#delivery-status-timestamp').getAttribute('hidden');
    if (hidden !== null) throw new Error('timestamp should be visible for ready state');
    const datetime = await page.locator('#delivery-status-timestamp').getAttribute('datetime');
    if (datetime !== '2026-07-31T09:15:00.000Z') throw new Error('datetime mismatch: ' + datetime);
    const display = await page.locator('#delivery-status-timestamp').textContent();
    if (display !== '2026-07-31 09:15 UTC') throw new Error('display text mismatch: ' + display);
  `;

  const result = await callE2E({
    url,
    label: '전달 상태 배지 — ready 렌더링 + ISO 8601 갱신 시각',
    scriptText,
  });
  assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
  assert.equal(result.passed, true, `시나리오 실패: ${result.stdout || JSON.stringify(result)}`);
});

test('AC — E2E: 새로고침 클릭 → error/forbidden 상태 전이 + 버튼 재활성화', { skip: _brixOutOfScope }, async (t) => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return;
  }
  if (!(await e2eHealthy())) {
    t.skip('e2e-runner 도달 불가 — skip');
    return;
  }
  const { server, port } = await startStaticServer(MODULE_ROOT);
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const scriptText = `
    let callCount = 0;
    await page.route('**/data/delivery-status.json', (route) => {
      callCount += 1;
      if (callCount === 1) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
      }
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'forbidden', updatedAt: null }),
      });
    });

    await page.getByRole('button', { name: '전달 상태 새로고침' }).click();
    await page.waitForSelector('#delivery-status-badge[data-status="error"]', { timeout: 5000 });
    let badgeText = await page.locator('#delivery-status-badge').textContent();
    if (badgeText !== '오류') throw new Error('error badge text mismatch: ' + badgeText);
    let hidden = await page.locator('#delivery-status-timestamp').getAttribute('hidden');
    if (hidden === null) throw new Error('timestamp should be hidden for error state');
    let disabled = await page.locator('[data-role="delivery-status-refresh"]').isDisabled();
    if (disabled) throw new Error('refresh button should re-enable after error load finishes');

    await page.getByRole('button', { name: '전달 상태 새로고침' }).click();
    await page.waitForSelector('#delivery-status-badge[data-status="forbidden"]', { timeout: 5000 });
    badgeText = await page.locator('#delivery-status-badge').textContent();
    if (badgeText !== '권한 없음') throw new Error('forbidden badge text mismatch: ' + badgeText);
    hidden = await page.locator('#delivery-status-timestamp').getAttribute('hidden');
    if (hidden === null) throw new Error('timestamp should be hidden for forbidden state');
    disabled = await page.locator('[data-role="delivery-status-refresh"]').isDisabled();
    if (disabled) throw new Error('refresh button should re-enable after forbidden load finishes');
  `;

  const result = await callE2E({
    url,
    label: '새로고침 클릭 — error/forbidden 상태 전이 + 버튼 재활성화',
    scriptText,
  });
  assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
  assert.equal(result.passed, true, `시나리오 실패: ${result.stdout || JSON.stringify(result)}`);
});
