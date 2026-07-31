// tester 회귀 가드 (BF-1420) — 관리형 세션 상태 카드 렌더링 + 필터 상호작용.
//
// dev(BF-1417) 의 tests/feature-unit.test.js 가 이미 순수 로직
// (filterPersonas/summarize/statusModifierClass/reduce/derive/SAMPLE_PERSONAS 등)을
// 단위 검증했으므로 여기서는 중복하지 않는다. 이 파일은 tester 고유 영역만 다룬다:
//   1) index.html 마크업 계약(ui-contract@v1, frozen) — DOM id/class/data-role/
//      디자인 토큰이 silent break 되지 않도록 존재를 박제(정적 가드).
//   2) 실 브라우저 인터랙션 — 필터 선택 시 실제 렌더 결과, 반응형 grid 열 전환처럼
//      node 단위 테스트로는 검증 불가능한 부분(e2e-runner).
//
// CI 결정성: e2e-runner 호출은 BRIX_E2E_SKIP=1 또는 e2e-runner 미도달 시 skip(fail 아님).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = fs.readFileSync(path.join(MODULE_ROOT, 'index.html'), 'utf-8');

// ── 1) 정적 마크업 계약 가드 (ui-contract@v1, frozen — 위치 무관 존재 검증) ──────

test('ui-contract — 루트/필터/카드목록/요약 DOM id 존재', () => {
  assert.ok(INDEX_HTML.includes('id="session-canary-root"'));
  assert.ok(INDEX_HTML.includes('id="status-filter"'));
  assert.ok(INDEX_HTML.includes('id="persona-card-list"'));
  assert.ok(INDEX_HTML.includes('id="status-summary"'));
});

test('ui-contract — 루트/필터 영역 CSS class 존재', () => {
  assert.ok(INDEX_HTML.includes('class="session-canary'));
  assert.ok(INDEX_HTML.includes('session-canary__filter'));
});

test('ui-contract — 상태 필터 select 옵션 4종(all/active/idle/error) 존재', () => {
  assert.ok(INDEX_HTML.includes('value="all"'));
  assert.ok(INDEX_HTML.includes('value="active"'));
  assert.ok(INDEX_HTML.includes('value="idle"'));
  assert.ok(INDEX_HTML.includes('value="error"'));
});

test('ui-contract — retry/restore control data-role 존재 + 초기 hidden (AC-4/AC-5)', () => {
  const restoreTag = INDEX_HTML.match(/<button[^>]*data-role="restore"[^>]*>/);
  const retryTag = INDEX_HTML.match(/<button[^>]*data-role="retry"[^>]*>/);
  assert.ok(restoreTag, 'restore control 존재');
  assert.ok(retryTag, 'retry control 존재');
  assert.ok(restoreTag[0].includes('hidden'), 'restore control 은 초기 hidden 이어야 함');
  assert.ok(retryTag[0].includes('hidden'), 'retry control 은 초기 hidden 이어야 함');
});

test('ui-contract — status-text 영역 role=status aria-live=polite (AC-1/AC-6)', () => {
  assert.ok(INDEX_HTML.includes('data-role="status-text"'));
  assert.ok(INDEX_HTML.includes('role="status"'));
  assert.ok(INDEX_HTML.includes('aria-live="polite"'));
});

test('ui-contract — status-filter aria-label="상태 필터" (AC-6 접근성)', () => {
  assert.ok(INDEX_HTML.includes('aria-label="상태 필터"'));
});

test('ui-contract — 디자인 토큰 값 (재정의 금지)', () => {
  assert.ok(INDEX_HTML.includes('--color-status-active: #16a34a'));
  assert.ok(INDEX_HTML.includes('--color-status-idle: #64748b'));
  assert.ok(INDEX_HTML.includes('--color-status-error: #dc2626'));
  assert.ok(INDEX_HTML.includes('--space-card-gap: 16px'));
  assert.ok(INDEX_HTML.includes('--radius-card: 8px'));
});

test('ui-contract — 카드 상태 변형 class 존재 (persona-card--active/idle/error)', () => {
  assert.ok(INDEX_HTML.includes('.persona-card--active'));
  assert.ok(INDEX_HTML.includes('.persona-card--idle'));
  assert.ok(INDEX_HTML.includes('.persona-card--error'));
  assert.ok(INDEX_HTML.includes('.persona-card__status'));
});

test('ui-contract — 반응형 breakpoint 규칙 존재 (AC-7: 320px 세로 스택 / 640px 2열)', () => {
  assert.ok(INDEX_HTML.includes('grid-template-columns: 1fr;'));
  assert.ok(INDEX_HTML.includes('@media (min-width: 640px)'));
  assert.ok(INDEX_HTML.includes('grid-template-columns: 1fr 1fr;'));
});

test('ui-contract — feature.js 모듈 결선 존재', () => {
  assert.ok(INDEX_HTML.includes('src="./src/feature.js"'));
});

// ── 2) 실 브라우저 E2E — 정적 가드로 검증 불가능한 인터랙션/렌더 (e2e-runner) ──────
// self-contained 정적 서버(OS 할당 포트) → e2e-runner 컨테이너 호출.

const STATIC_MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function startStaticServer(serveRoot) {
  const root = path.resolve(serveRoot);
  const server = http.createServer((req, res) => {
    // path traversal 차단: 요청을 root 아래로 resolve 하고 prefix 밖이면 403.
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
      // <script type="module"> 는 strict MIME 검사를 요구 — 확장자 기반 Content-Type 필수.
      const contentType = STATIC_MIME_TYPES[path.extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType }).end(buf);
    });
  });
  return new Promise((resolve) => {
    // 0.0.0.0 바인딩 필수 — e2e-runner 컨테이너가 hostname 으로 도달.
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

async function pingE2eRunner() {
  try {
    const probe = await fetch('http://e2e-runner:3030/health', {
      signal: AbortSignal.timeout(2000),
    });
    return probe.ok;
  } catch {
    return false;
  }
}

let e2eAvailable = true;
let e2eSkipReason = null;

test.before(async () => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    e2eAvailable = false;
    e2eSkipReason = 'BRIX_E2E_SKIP=1 — CI 결정성 가드';
    return;
  }
  const reachable = await pingE2eRunner();
  if (!reachable) {
    e2eAvailable = false;
    e2eSkipReason = 'e2e-runner 도달 불가 (CI 환경 정상)';
  }
});

async function callE2eRunner({ url, label, scriptText, timeoutMs }) {
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
  return { res, body };
}

test('E2E — 상태 필터 선택 → idle 카드만 렌더 + 요약 텍스트 갱신 (AC-2/AC-3)', async (t) => {
  if (!e2eAvailable) {
    t.skip(e2eSkipReason);
    return;
  }
  const { server, port } = await startStaticServer(MODULE_ROOT);
  t.after(() => server.close());

  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const { res, body } = await callE2eRunner({
    url,
    label: '상태 필터 선택 → idle 카드만 렌더',
    scriptText: `
      await page.waitForSelector('#persona-card-list article', { timeout: 10000 });
      const total = await page.locator('#persona-card-list article').count();
      if (total !== 5) throw new Error('초기 카드 수 불일치: ' + total);

      const filterDisabled = await page.locator('#status-filter').isDisabled();
      if (filterDisabled) throw new Error('로드 완료 후에도 status-filter 가 비활성 상태');

      await page.selectOption('#status-filter', 'idle');
      await page.waitForFunction(() => document.querySelectorAll('#persona-card-list article').length === 2);

      const idleCards = page.locator('#persona-card-list article');
      const idleCount = await idleCards.count();
      if (idleCount !== 2) throw new Error('idle 필터 카드 수 불일치: ' + idleCount);

      const firstClass = await idleCards.first().getAttribute('class');
      if (!firstClass || !firstClass.includes('persona-card--idle')) {
        throw new Error('idle 카드에 persona-card--idle class 없음: ' + firstClass);
      }

      const summary = await page.locator('#status-summary').textContent();
      if (!summary.includes('활성 2') || !summary.includes('유휴 2') || !summary.includes('오류 1')) {
        throw new Error('status-summary 텍스트 불일치: ' + summary);
      }
    `,
    timeoutMs: 30000,
  });

  assert.equal(res.ok, true, `e2e-runner 요청 실패: ${JSON.stringify(body)}`);
  assert.equal(body.passed, true, `e2e 시나리오 fail: ${body.stdout || ''}`);
  assert.ok(body.screenshotPath, 'screenshot artifact 없음');
  assert.ok(body.tracePath, 'trace artifact 없음');
});

test('E2E — 반응형 grid 열 전환: 320px 1열 → 640px+ 2열 (AC-7)', async (t) => {
  if (!e2eAvailable) {
    t.skip(e2eSkipReason);
    return;
  }
  const { server, port } = await startStaticServer(MODULE_ROOT);
  t.after(() => server.close());

  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const { res, body } = await callE2eRunner({
    url,
    label: '320px→640px 반응형 grid 열 전환',
    scriptText: `
      await page.setViewportSize({ width: 320, height: 800 });
      await page.waitForSelector('#persona-card-list article', { timeout: 10000 });
      const narrowCols = await page.evaluate(() =>
        getComputedStyle(document.getElementById('persona-card-list')).gridTemplateColumns
      );
      const narrowColCount = narrowCols.trim().split(/\\s+/).length;
      if (narrowColCount !== 1) throw new Error('320px 에서 1열 아님: ' + narrowCols);

      await page.setViewportSize({ width: 700, height: 800 });
      await page.waitForTimeout(150);
      const wideCols = await page.evaluate(() =>
        getComputedStyle(document.getElementById('persona-card-list')).gridTemplateColumns
      );
      const wideColCount = wideCols.trim().split(/\\s+/).length;
      if (wideColCount !== 2) throw new Error('640px+ 에서 2열 아님: ' + wideCols);
    `,
    timeoutMs: 30000,
  });

  assert.equal(res.ok, true, `e2e-runner 요청 실패: ${JSON.stringify(body)}`);
  assert.equal(body.passed, true, `e2e 시나리오 fail: ${body.stdout || ''}`);
  assert.ok(body.screenshotPath, 'screenshot artifact 없음');
  assert.ok(body.tracePath, 'trace artifact 없음');
});
