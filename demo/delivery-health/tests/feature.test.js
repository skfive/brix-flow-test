// BF-1413 — 전달 상태 요약 패널 회귀 가드 (BF-1410 구현 검증)
// 계약: docs/plans/delivery-health-BF-1398.md §6
// dev(BF-1410) 는 별도 단위 테스트를 남기지 않아, 여기서 상태 전이/버튼 재활성화/
// 마크업 contract 를 tester 관점(회귀 가드)에서 커버한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPanel, PANEL_TEXT } from '../src/feature.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = path.resolve(__dirname, '..');

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// (RUN_CONTEXT_STARTER.primary_module = 'e2e' — 이 task 의 BRIX_TEST_MODULE 값)
const _BRIX_MY_MODULE = 'e2e';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// ---------------------------------------------------------------------------
// 정적 마크업 / 디자인 토큰 contract 가드 — 핵심 selector·토큰이 silent break 안 되게 fact 박제
// ---------------------------------------------------------------------------

test('AC — index.html 핵심 마크업 contract (id/초기 data-state)', { skip: _brixOutOfScope }, () => {
  const html = fs.readFileSync(path.join(MODULE_ROOT, 'index.html'), 'utf-8');
  assert.ok(html.includes('id="delivery-health-root"'), '#delivery-health-root 존재');
  assert.ok(html.includes('data-state="loading"'), '초기 data-state=loading');
  assert.ok(html.includes('id="status-refresh"'), '#status-refresh 존재');
  assert.ok(html.includes('id="status-summary-list"'), '#status-summary-list 존재');
  assert.ok(html.includes('id="delivery-health-status"'), '#delivery-health-status 존재');
  assert.ok(html.includes('src="./src/feature.js"'), 'feature.js module script 연결');
});

test('AC — 상태 배지 CSS 클래스 / 디자인 토큰 contract', { skip: _brixOutOfScope }, () => {
  const html = fs.readFileSync(path.join(MODULE_ROOT, 'index.html'), 'utf-8');
  assert.ok(html.includes('--color-status-progress'), 'progress 토큰 존재');
  assert.ok(html.includes('--color-status-waiting'), 'waiting 토큰 존재');
  assert.ok(html.includes('--color-status-action'), 'action 토큰 존재');
  assert.ok(html.includes('.status-badge--progress'), 'progress 배지 클래스 존재');
  assert.ok(html.includes('.status-badge--waiting'), 'waiting 배지 클래스 존재');
  assert.ok(html.includes('.status-badge--action'), 'action 배지 클래스 존재');
  assert.ok(html.includes('.empty-state'), 'empty-state 클래스 존재');
});

// ---------------------------------------------------------------------------
// fake DOM — 최소 요소만 구현해 createPanel 의 상태 전이 회귀 가드
// (createPanel 은 options 로 root/list/statusEl/refreshButton/fetch/document 전부 주입 가능)
// ---------------------------------------------------------------------------

function makeFakeDocument() {
  return {
    createElement(tag) {
      return {
        tagName: tag,
        className: '',
        textContent: '',
        _attrs: {},
        setAttribute(name, value) {
          this._attrs[name] = value;
        },
        _children: [],
        append(...nodes) {
          this._children.push(...nodes);
        },
      };
    },
  };
}

function makeFakePanelDom() {
  const root = { dataset: {} };
  const list = {
    _children: [],
    replaceChildren(...nodes) {
      this._children = nodes;
    },
  };
  const statusEl = { textContent: '' };
  const refreshBtn = {
    disabled: false,
    addEventListener() {},
    removeEventListener() {},
  };
  return { root, list, statusEl, refreshBtn };
}

function buildPanel(fetchImpl) {
  const doc = makeFakeDocument();
  const { root, list, statusEl, refreshBtn } = makeFakePanelDom();
  const panel = createPanel({
    document: doc,
    root,
    list,
    statusEl,
    refreshButton: refreshBtn,
    fetch: fetchImpl,
    fixtureUrl: 'fixture://test',
  });
  return { panel, root, list, statusEl, refreshBtn };
}

test('AC — refresh() 호출 직후 loading 상태 진입 + 버튼 비활성화', { skip: _brixOutOfScope }, async () => {
  const { panel, root, statusEl, refreshBtn } = buildPanel(async () => ({
    ok: true,
    json: async () => ({ items: [] }),
  }));
  const pending = panel.refresh();
  assert.equal(root.dataset.state, 'loading');
  assert.equal(statusEl.textContent, PANEL_TEXT.loading);
  assert.equal(refreshBtn.disabled, true);
  await pending;
});

test('AC — ready 상태: fixture 항목 렌더 + 버튼 재활성화', { skip: _brixOutOfScope }, async () => {
  const items = [
    { id: 'd-1', title: '결제 모듈 배포', status: 'progress', nextAction: '스테이징 스모크 확인' },
    { id: 'd-2', title: '정산 리포트 전달', status: 'waiting', nextAction: '데이터 팀 응답 대기' },
  ];
  const { panel, root, list, refreshBtn } = buildPanel(async () => ({
    ok: true,
    json: async () => ({ items }),
  }));
  await panel.refresh();
  assert.equal(root.dataset.state, 'ready');
  assert.equal(list._children.length, 2);
  assert.equal(refreshBtn.disabled, false);
});

test('AC — empty 상태: 빈 목록 안내 + 버튼 재활성화', { skip: _brixOutOfScope }, async () => {
  const { panel, root, list, statusEl, refreshBtn } = buildPanel(async () => ({
    ok: true,
    json: async () => ({ items: [] }),
  }));
  await panel.refresh();
  assert.equal(root.dataset.state, 'empty');
  assert.equal(list._children.length, 1);
  assert.equal(list._children[0].className, 'empty-state');
  assert.equal(list._children[0].textContent, PANEL_TEXT.empty);
  assert.equal(refreshBtn.disabled, false);
});

test('AC — error 상태(네트워크 실패): 재시도 안내 + 버튼 재활성화', { skip: _brixOutOfScope }, async () => {
  const { panel, root, statusEl, refreshBtn } = buildPanel(async () => {
    throw new Error('network fail');
  });
  await panel.refresh();
  assert.equal(root.dataset.state, 'error');
  assert.equal(statusEl.textContent, `${PANEL_TEXT.error} ${PANEL_TEXT.errorRetryHint}`);
  assert.equal(refreshBtn.disabled, false);
});

test('AC — error 상태(HTTP 오류 응답): 재시도 안내 + 버튼 재활성화', { skip: _brixOutOfScope }, async () => {
  const { panel, root, refreshBtn } = buildPanel(async () => ({ ok: false, status: 500 }));
  await panel.refresh();
  assert.equal(root.dataset.state, 'error');
  assert.equal(refreshBtn.disabled, false);
});

// ---------------------------------------------------------------------------
// 실 브라우저 E2E (e2e-runner) — 정적 가드로 검증 어려운 실제 클릭/렌더 인터랙션
// ---------------------------------------------------------------------------

// 확장자 → MIME 타입. module script(.js) 가 빈 Content-Type 으로 브라우저에서
// strict MIME 체크에 걸려 로드 거부되는 것을 방지하기 위해 명시적으로 지정한다.
const STATIC_MIME_TYPES = {
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
      const contentType = STATIC_MIME_TYPES[path.extname(target)] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType }).end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
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

async function probeE2eRunner(t) {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return false;
  }
  try {
    const probe = await fetch('http://e2e-runner:3030/health', {
      signal: AbortSignal.timeout(2000),
    });
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

test('E2E — 전달 상태 요약 패널 초기 로드: ready 배지/텍스트 렌더', { skip: _brixOutOfScope }, async (t) => {
  const available = await probeE2eRunner(t);
  if (!available) return;

  const { server, port } = await startStaticServer(MODULE_ROOT);
  t.after(() => server.close());

  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const scriptText = `
    await page.waitForSelector('#status-summary-list .status-summary-item');
    const state = await page.evaluate(() => document.getElementById('delivery-health-root').dataset.state);
    if (state !== 'ready') throw new Error('unexpected root state: ' + state);
    const count = await page.locator('#status-summary-list .status-summary-item').count();
    if (count !== 3) throw new Error('item count mismatch: ' + count);
    const firstBadge = await page.locator('.status-summary-item').first().locator('.status-badge').innerText();
    if (firstBadge !== '진행') throw new Error('badge label mismatch: ' + firstBadge);
    const btnDisabled = await page.locator('#status-refresh').isDisabled();
    if (btnDisabled) throw new Error('refresh button should be enabled after ready render');
  `;

  const result = await callE2eRunner({
    url,
    label: '전달 상태 요약 패널 — 초기 로드 ready 렌더',
    scriptText,
  });

  t.diagnostic(`screenshot=${result.screenshotPath} trace=${result.tracePath}`);
  assert.equal(result.ok, true, `e2e-runner call 실패: ${result.stdout ?? ''}`);
  assert.equal(result.passed, true, `시나리오 assertion 실패: ${result.stdout ?? ''}`);
});

test('E2E — status-refresh 클릭 재조회: loading 재진입 후 재활성화', { skip: _brixOutOfScope }, async (t) => {
  const available = await probeE2eRunner(t);
  if (!available) return;

  const { server, port } = await startStaticServer(MODULE_ROOT);
  t.after(() => server.close());

  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const scriptText = `
    await page.waitForSelector('#status-summary-list .status-summary-item');
    await page.locator('#status-refresh').click();
    await page.waitForFunction(
      () => document.getElementById('delivery-health-root').dataset.state === 'ready',
      null,
      { timeout: 5000 }
    );
    const disabledAfter = await page.locator('#status-refresh').isDisabled();
    if (disabledAfter) throw new Error('refresh button not re-enabled after refresh completes');
    const count = await page.locator('#status-summary-list .status-summary-item').count();
    if (count !== 3) throw new Error('item count mismatch after refresh: ' + count);
  `;

  const result = await callE2eRunner({
    url,
    label: 'status-refresh 클릭 — 재조회 후 버튼 재활성화',
    scriptText,
  });

  t.diagnostic(`screenshot=${result.screenshotPath} trace=${result.tracePath}`);
  assert.equal(result.ok, true, `e2e-runner call 실패: ${result.stdout ?? ''}`);
  assert.equal(result.passed, true, `시나리오 assertion 실패: ${result.stdout ?? ''}`);
});
