// 관리형 세션 상태 카드 — 상태 전이 회귀 가드 (BF-1426)
// dev 산출물(BF-1423, PR #388)의 loading→ready·error·재시도 후 복원 전이를 보호한다.
// 계약: docs/plans/managed-session-canary-BF-1421.md §3~4

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSessionCanary, STATE_TEXT } from '../src/feature.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.join(__dirname, '..');

const FIXTURE_ITEMS = [
  { personaId: 'planner-01', personaName: '기획자-베타', status: 'pass' },
  { personaId: 'developer-01', personaName: '개발자-알파', status: 'pass' },
  { personaId: 'reviewer-01', personaName: '리뷰어-감마', status: 'pending' },
  { personaId: 'tester-01', personaName: '테스터-델타', status: 'fail' },
];

// ── 최소 DOM stub — createSessionCanary의 옵션 주입 지점만 구현 ──────
function createElementStub() {
  return {
    className: '',
    textContent: '',
    dataset: {},
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    append() {},
  };
}

function createFakeDom() {
  const messageEl = createElementStub();
  const root = {
    dataset: {},
    querySelector(selector) {
      return selector === '[data-role="status-message"]' ? messageEl : null;
    },
  };
  const listEl = {
    children: [],
    replaceChildren(...nodes) {
      this.children = nodes;
    },
  };
  const refreshBtn = {
    disabled: false,
    _handlers: {},
    addEventListener(evt, fn) {
      this._handlers[evt] = fn;
    },
    removeEventListener(evt) {
      delete this._handlers[evt];
    },
  };
  const doc = {
    createElement: () => createElementStub(),
  };
  return { doc, root, listEl, refreshBtn, messageEl };
}

function fakeResponse(ok, data, status = 200) {
  return { ok, status, json: async () => data };
}

function buildCanary(fetchImpl) {
  const dom = createFakeDom();
  const canary = createSessionCanary({
    document: dom.doc,
    root: dom.root,
    list: dom.listEl,
    refreshButton: dom.refreshBtn,
    messageEl: dom.messageEl,
    fetch: fetchImpl,
    fixtureUrl: 'fake://session-fixture.json',
  });
  return { canary, ...dom };
}

test('상태 전이 — loading에서 fetch 성공 시 ready로 전이한다', async () => {
  const { canary, root, listEl, refreshBtn, messageEl } = buildCanary(
    async () => fakeResponse(true, { items: FIXTURE_ITEMS }),
  );

  const pending = canary.refresh();
  assert.equal(root.dataset.state, 'loading');
  assert.equal(messageEl.textContent, STATE_TEXT.loading);
  assert.equal(refreshBtn.disabled, true);

  await pending;

  assert.equal(root.dataset.state, 'ready');
  assert.equal(messageEl.textContent, '');
  assert.equal(refreshBtn.disabled, false);
  assert.equal(listEl.children.length, FIXTURE_ITEMS.length);
});

test('상태 전이 — fetch 실패 시 error로 전이하고 refresh 버튼을 재활성화한다', async () => {
  const { canary, root, listEl, refreshBtn, messageEl } = buildCanary(
    async () => fakeResponse(false, null, 500),
  );

  await canary.refresh();

  assert.equal(root.dataset.state, 'error');
  assert.equal(messageEl.textContent, STATE_TEXT.error);
  assert.equal(refreshBtn.disabled, false);
  assert.equal(listEl.children.length, 0);
});

test('상태 전이 — error 이후 재시도 성공 시 ready 상태로 복원된다', async () => {
  let shouldFail = true;
  const { canary, root, listEl, refreshBtn } = buildCanary(async () => {
    if (shouldFail) return fakeResponse(false, null, 500);
    return fakeResponse(true, { items: FIXTURE_ITEMS });
  });

  await canary.refresh();
  assert.equal(root.dataset.state, 'error');

  shouldFail = false;
  const retry = canary.refresh();
  assert.equal(root.dataset.state, 'loading');
  assert.equal(refreshBtn.disabled, true);

  await retry;

  assert.equal(root.dataset.state, 'ready');
  assert.equal(refreshBtn.disabled, false);
  assert.equal(listEl.children.length, FIXTURE_ITEMS.length);
});

// ── UI 마크업 contract — DOM 컨트롤러가 의존하는 selector 존재 보장 ──
test('마크업 contract — index.html에 컨트롤러가 참조하는 id가 존재한다', () => {
  const html = fs.readFileSync(path.join(moduleRoot, 'index.html'), 'utf-8');
  assert.ok(html.includes('id="session-status-root"'));
  assert.ok(html.includes('id="persona-card-list"'));
  assert.ok(html.includes('id="session-refresh"'));
  assert.ok(html.includes('data-role="status-message"'));
});

// ── 실 브라우저 E2E — 정적 가드로 검증 어려운 loading→ready 렌더링과
//    재시도 클릭 인터랙션을 e2e-runner로 검증한다 ──────────────────
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

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

let e2eServer = null;
let e2ePort = null;
let e2eAvailable = true;
let e2eSkipReason = null;

before(async () => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    e2eAvailable = false;
    e2eSkipReason = 'BRIX_E2E_SKIP=1 — CI 결정성 가드';
    return;
  }
  try {
    const probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) {
      e2eAvailable = false;
      e2eSkipReason = `e2e-runner unhealthy (${probe.status})`;
      return;
    }
  } catch (err) {
    e2eAvailable = false;
    e2eSkipReason = `e2e-runner 도달 불가 (${err.message})`;
    return;
  }
  const started = await startStaticServer(moduleRoot);
  e2eServer = started.server;
  e2ePort = started.port;
});

after(() => {
  if (e2eServer) e2eServer.close();
});

async function runE2e(t, label, scriptText) {
  if (!e2eAvailable) {
    t.skip(e2eSkipReason);
    return;
  }
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${e2ePort}/`;
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
  const body = await res.json();
  assert.equal(body.passed, true, `e2e-runner 실패: ${body.stdout || ''}`);
}

test('E2E — 초기 로드 시 loading→ready 전이, 카드 4개 렌더링', async (t) => {
  await runE2e(
    t,
    '관리형 세션 상태 카드 — 초기 로드 ready 전이',
    `await page.waitForSelector('#session-status-root[data-state="ready"]', { timeout: 10000 });
const cardCount = await page.locator('#persona-card-list > li').count();
if (cardCount !== 4) throw new Error('expected 4 cards, got ' + cardCount);`,
  );
});

test('E2E — 재시도 버튼 클릭 후 ready 상태로 복원', async (t) => {
  await runE2e(
    t,
    '관리형 세션 상태 카드 — 재시도 후 ready 복원',
    `await page.waitForSelector('#session-status-root[data-state="ready"]', { timeout: 10000 });
await page.click('#session-refresh');
await page.waitForSelector('#session-status-root[data-state="ready"]', { timeout: 10000 });
const disabled = await page.evaluate(() => document.getElementById('session-refresh').disabled);
if (disabled) throw new Error('refresh button still disabled after retry');
const cardCount = await page.locator('#persona-card-list > li').count();
if (cardCount !== 4) throw new Error('expected 4 cards after retry, got ' + cardCount);`,
  );
});
