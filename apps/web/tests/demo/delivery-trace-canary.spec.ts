// delivery-trace-canary 상태 보드 — tester 회귀 가드 (BF-1238)
// 대상: dev PR #339 (BF-1235, merged) — DeliveryTraceBoard.js / index.js / index.html / styles.css
// dev 가 이미 검증한 순수 렌더 로직(apps/web/src/demo/delivery-trace-canary/DeliveryTraceBoard.test.js)은
// 재작성하지 않는다. 본 가드는 tester 고유 영역만 다룬다:
//   1) 정적 마크업(index.html) frozen domId/role 존재 — silent break 가드
//   2) CSS 동결 토큰(styles.css) 존재 — silent break 가드
//   3) 실 브라우저 E2E — dev 가 단위 테스트로 못 짠 index.js 의 클릭/키보드 인터랙션
//      (DeliveryTraceBoard.test.js 는 순수 함수만 검증, mountBoard 의 DOM 이벤트 배선은 미검증)
//
// node --test apps/web/tests/demo/delivery-trace-canary.spec.ts

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// apps/web/tests/demo -> apps/web/tests -> apps/web -> apps -> repo root
const REPO_ROOT = path.resolve(__dirname, '../../../../');
const INDEX_HTML_PATH = path.join(REPO_ROOT, 'demo/delivery-trace-canary/index.html');
const STYLES_CSS_PATH = path.join(
  REPO_ROOT,
  'apps/web/src/demo/delivery-trace-canary/styles.css',
);

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'delivery-trace-canary';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// ---------------------------------------------------------------------------
// 1) 정적 마크업 contract — index.html frozen domId/role (silent break 가드)
// ---------------------------------------------------------------------------

test('AC 렌더 — index.html 에 frozen domId 존재', { skip: _brixOutOfScope }, () => {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
  for (const id of [
    'id="delivery-trace-board-root"',
    'id="delivery-trace-board"',
    'id="trace-stage-filter"',
    'id="trace-detail-panel"',
    'id="evidence-warning-banner"',
  ]) {
    assert.ok(html.includes(id), `${id} 존재해야 함`);
  }
});

test(
  'AC 누락 evidence 경고 — index.html 초기 마크업에 role=alert 배너 존재',
  { skip: _brixOutOfScope },
  () => {
    const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
    assert.match(html, /id="evidence-warning-banner"[^>]*role="alert"/);
    assert.ok(html.includes('누락 evidence'));
  },
);

test('index.html 이 동결 자산 경로(index.js/styles.css)를 참조', { skip: _brixOutOfScope }, () => {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
  assert.ok(
    html.includes('/apps/web/src/demo/delivery-trace-canary/styles.css'),
    'styles.css 참조 유지',
  );
  assert.ok(
    html.includes('/apps/web/src/demo/delivery-trace-canary/index.js'),
    'index.js 참조 유지',
  );
});

// ---------------------------------------------------------------------------
// 2) CSS 동결 토큰 — styles.css (silent break 가드)
// ---------------------------------------------------------------------------

test('CSS 동결 토큰·클래스 존재 (styles.css)', { skip: _brixOutOfScope }, () => {
  const css = fs.readFileSync(STYLES_CSS_PATH, 'utf-8');
  for (const token of [
    '--color-trace-complete',
    '--color-trace-missing',
    '--color-trace-pending',
    '.delivery-trace__stage--complete',
    '.delivery-trace__stage--missing',
    '#evidence-warning-banner',
  ]) {
    assert.ok(css.includes(token), `${token} 정의 유지`);
  }
});

// ---------------------------------------------------------------------------
// 3) 실 브라우저 E2E — index.js 클릭/키보드 인터랙션 (dev 단위 테스트 사각지대)
// ---------------------------------------------------------------------------

// 확장자 → MIME. module script(index.js)가 strict MIME 체크로 거부되지 않도록 필수.
const MIME_BY_EXT = {
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
      const contentType = MIME_BY_EXT[path.extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType }).end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

async function callE2ERunner({ url, label, scriptText, timeoutMs = 30000 }) {
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
  return body;
}

test(
  'AC 렌더+상태전환 — 단계 카드 클릭 시 aria-current/상세패널/필터비활성 반영',
  { skip: _brixOutOfScope },
  async (t) => {
    if (process.env.BRIX_E2E_SKIP === '1') {
      t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
      return;
    }
    try {
      const probe = await fetch('http://e2e-runner:3030/health', {
        signal: AbortSignal.timeout(2000),
      });
      if (!probe.ok) {
        t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
        return;
      }
    } catch (err) {
      t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
      return;
    }

    const { server, port } = await startStaticServer(REPO_ROOT);
    t.after(() => server.close());
    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/demo/delivery-trace-canary/index.html`;

    const scriptText = `
      const section = page.locator('#delivery-trace-board');
      await section.waitFor({ state: 'visible' });
      const initialState = await section.getAttribute('data-state');
      if (initialState !== 'evidence-missing') throw new Error('initial state mismatch: ' + initialState);

      const card = page.locator('[data-cell-id="R2:review"]');
      await card.click();
      await page.locator('#trace-detail-panel[data-empty="false"]').waitFor({ state: 'visible', timeout: 5000 });
      const ariaCurrent = await card.getAttribute('aria-current');
      if (ariaCurrent !== 'step') throw new Error('aria-current not set after click: ' + ariaCurrent);
      const stateAfter = await section.getAttribute('data-state');
      if (stateAfter !== 'stage-selected') throw new Error('state after select mismatch: ' + stateAfter);
      const filterDisabled = await page.locator('#trace-stage-filter').getAttribute('disabled');
      if (filterDisabled === null) throw new Error('filter should be disabled while stage selected');

      await page.locator('#trace-detail-close').click();
      await page.locator('#trace-detail-panel[data-empty="true"]').waitFor({ state: 'visible', timeout: 5000 });
      const stateReset = await section.getAttribute('data-state');
      if (stateReset !== 'evidence-missing') throw new Error('state after close mismatch: ' + stateReset);
      const filterReenabled = await page.locator('#trace-stage-filter').getAttribute('disabled');
      if (filterReenabled !== null) throw new Error('filter should be re-enabled after close');
    `;

    const result = await callE2ERunner({
      url,
      label: '[BF-1238] 단계 카드 클릭 → 상태전환/상세패널/필터비활성',
      scriptText,
      timeoutMs: 30000,
    });

    assert.equal(result.ok, true, `e2e-runner 호출 실패: ${result.reason || result.stdout}`);
    assert.equal(result.passed, true, `시나리오 실패: ${result.stdout}`);
  },
);

test(
  'AC 키보드 접근성+누락 evidence 경고 — 방향키 이동/Enter 선택/Escape 복귀',
  { skip: _brixOutOfScope },
  async (t) => {
    if (process.env.BRIX_E2E_SKIP === '1') {
      t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
      return;
    }
    try {
      const probe = await fetch('http://e2e-runner:3030/health', {
        signal: AbortSignal.timeout(2000),
      });
      if (!probe.ok) {
        t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
        return;
      }
    } catch (err) {
      t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
      return;
    }

    const { server, port } = await startStaticServer(REPO_ROOT);
    t.after(() => server.close());
    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/demo/delivery-trace-canary/index.html`;

    const scriptText = `
      const banner = page.locator('#evidence-warning-banner');
      await banner.waitFor({ state: 'visible' });
      const role = await banner.getAttribute('role');
      if (role !== 'alert') throw new Error('banner role mismatch: ' + role);
      const bannerText = await banner.textContent();
      if (!bannerText || !bannerText.includes('누락 evidence')) throw new Error('banner text mismatch: ' + bannerText);

      const firstCard = page.locator('[data-cell-id="R1:requirement"]');
      await firstCard.focus();
      await page.keyboard.press('ArrowRight');
      const focusedAfterArrow = await page.evaluate(() => document.activeElement && document.activeElement.dataset.cellId);
      if (focusedAfterArrow !== 'R1:design') throw new Error('ArrowRight did not move focus to next card: ' + focusedAfterArrow);

      await page.keyboard.press('Enter');
      await page.locator('#trace-detail-panel[data-empty="false"]').waitFor({ state: 'visible', timeout: 5000 });
      const activeId = await page.evaluate(() => document.activeElement && document.activeElement.id);
      if (activeId !== 'trace-detail-panel') throw new Error('focus not moved to detail panel: ' + activeId);
      const heading = await page.locator('.delivery-trace__detail-heading').textContent();
      if (!heading || !heading.includes('R1') || !heading.includes('설계')) throw new Error('detail heading mismatch: ' + heading);

      await page.keyboard.press('Escape');
      await page.locator('#trace-detail-panel[data-empty="true"]').waitFor({ state: 'visible', timeout: 5000 });
      const activeAfterEscape = await page.evaluate(() => document.activeElement && document.activeElement.id);
      if (activeAfterEscape !== 'trace-stage-filter') throw new Error('focus not returned to filter after Escape: ' + activeAfterEscape);
    `;

    const result = await callE2ERunner({
      url,
      label: '[BF-1238] 키보드 탐색(ArrowRight/Enter/Escape)+누락evidence경고',
      scriptText,
      timeoutMs: 30000,
    });

    assert.equal(result.ok, true, `e2e-runner 호출 실패: ${result.reason || result.stdout}`);
    assert.equal(result.passed, true, `시나리오 실패: ${result.stdout}`);
  },
);
