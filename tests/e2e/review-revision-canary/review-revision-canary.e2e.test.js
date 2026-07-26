// BF-1197: 자동수렴 최종 DOM 회귀 가드 (E2E) — /demo/review-revision-canary
// reviewer pass 후 머지된 최종 코드 기준으로 실제 브라우저 렌더 결과를 검증한다.
// - AC1: 최종 DOM 에 data-review-cycle="pending" 표식이 없다
// - AC2: 상태 변경 영역에 aria-live 속성이 존재한다
// - AC3: 상태 패널 3개 영역(검증 단계 / 최신 revision / 검토 결과)이 정상 렌더된다
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'review-revision-canary';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..', '..', '..');

// serveRoot 아래의 정적 파일만 노출하는 self-contained 서버. listen(0) 으로 포트 자동 할당.
// route_mapping: root-relative-static — repoRoot 를 그대로 서빙해 /demo/*, /src/* 절대경로를 만족시킨다.
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
      const ext = path.extname(target);
      const type =
        ext === '.js' ? 'text/javascript'
        : ext === '.css' ? 'text/css'
        : ext === '.json' ? 'application/json'
        : ext === '.html' ? 'text/html'
        : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type }).end(buf);
    });
  });
  return new Promise((resolve) => {
    // 0.0.0.0 바인딩 필수 — e2e-runner 컨테이너가 hostname 으로 도달.
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

let server;
let port;
let e2eAvailable = true;
let skipReason = null;

test.before(async () => {
  const started = await startStaticServer(repoRoot);
  server = started.server;
  port = started.port;

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
    }
  } catch (err) {
    e2eAvailable = false;
    skipReason = `e2e-runner 도달 불가 (${err.message}) — CI 환경 정상`;
  }
});

test.after(() => {
  if (server) server.close();
});

const host = process.env.BRIX_PERSONA_HOST || 'worker';
const runId = process.env.BRIX_RUN_ID;
const jiraKey = process.env.BRIX_JIRA_KEY;

async function callE2E(label, scriptText) {
  if (!runId || !jiraKey) {
    throw new Error('worker-injected run identity 없음 (BRIX_RUN_ID/BRIX_JIRA_KEY)');
  }
  const url = `http://${host}:${port}/demo/review-revision-canary/`;
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

test(
  `[${_BRIX_MY_MODULE}] AC1 — 최종 DOM 에 data-review-cycle="pending" 표식이 없다`,
  { skip: _brixOutOfScope },
  async (t) => {
    if (!e2eAvailable) {
      t.skip(skipReason);
      return;
    }
    const body = await callE2E(
      'AC1 — data-review-cycle pending 표식 부재',
      `
        await page.waitForSelector('.status-region', { timeout: 10000 });
        const found = await page.evaluate(() => !!document.querySelector('[data-review-cycle]'));
        const html = await page.evaluate(() => document.documentElement.outerHTML);
        if (found || html.includes('data-review-cycle')) {
          throw new Error('data-review-cycle 표식이 최종 DOM 에 잔존함');
        }
      `.trim(),
    );
    assert.equal(body.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(body)}`);
    assert.equal(body.passed, true, `AC1 시나리오 실패: ${body.stdout}`);
  },
);

test(
  `[${_BRIX_MY_MODULE}] AC2 — 상태 변경 영역에 aria-live 속성이 존재한다`,
  { skip: _brixOutOfScope },
  async (t) => {
    if (!e2eAvailable) {
      t.skip(skipReason);
      return;
    }
    const body = await callE2E(
      'AC2 — status-region aria-live 존재',
      `
        await page.waitForSelector('.status-region', { timeout: 10000 });
        const ariaLive = await page.evaluate(
          () => document.querySelector('.status-region')?.getAttribute('aria-live'),
        );
        if (ariaLive !== 'polite') {
          throw new Error('status-region aria-live="polite" 부재: ' + ariaLive);
        }
      `.trim(),
    );
    assert.equal(body.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(body)}`);
    assert.equal(body.passed, true, `AC2 시나리오 실패: ${body.stdout}`);
  },
);

test(
  `[${_BRIX_MY_MODULE}] AC3 — 상태 패널 3개 영역(검증 단계/최신 revision/검토 결과)이 정상 렌더된다`,
  { skip: _brixOutOfScope },
  async (t) => {
    if (!e2eAvailable) {
      t.skip(skipReason);
      return;
    }
    const body = await callE2E(
      'AC3 — 상태 패널 3영역(단계/revision/검토결과) 렌더',
      `
        await page.waitForSelector('.stage-list', { timeout: 10000 });
        await page.waitForSelector('.revision-meta', { timeout: 10000 });
        await page.waitForSelector('.review-result', { timeout: 10000 });
        const texts = await page.evaluate(() => ({
          stage: document.querySelector('.stage-list')?.textContent.trim(),
          revision: document.querySelector('.revision-meta')?.textContent.trim(),
          review: document.querySelector('.review-result')?.textContent.trim(),
        }));
        if (!texts.stage || !texts.revision || !texts.review) {
          throw new Error('상태 패널 3영역 중 일부가 비어있음: ' + JSON.stringify(texts));
        }
      `.trim(),
    );
    assert.equal(body.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(body)}`);
    assert.equal(body.passed, true, `AC3 시나리오 실패: ${body.stdout}`);
  },
);
