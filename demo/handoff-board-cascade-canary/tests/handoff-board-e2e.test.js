// BF-1160 — /demo/handoff-board-cascade-canary E2E 회귀 가드.
// dev(BF-1158)가 이미 검증한 단위 로직(board-data.test.js, domain.test.js: storage/정렬/필터
// 순수 함수 결과)은 재검증하지 않는다. 여기서는 실제 브라우저에서만 드러나는 계약만 검증한다:
//   1) 페이지 진입 렌더 + 인증 가드 통과 (hb-error 없이 보드가 그려지는지)
//   2) 업무 항목 추가 → 카드가 실제로 DOM 에 반영되는지
//   3) 추가된 항목의 상태 필터 조회 → 해당 컬럼에만 노출되고 다른 컬럼은 숨겨지는지
// AC3(focused scope 가드)는 브라우저 콜 없이 module-scope skip 플래그로 검증한다.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'handoff-board';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// 확장자 → MIME 타입. `<script type="module">` 는 브라우저가 strict MIME 검사를 하므로
// Content-Type 없이 서빙하면 "Failed to load module script" 로 항상 실패한다 (tester 가드 자체 이슈).
const _BRIX_MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// serveRoot 아래의 정적 파일만 노출하는 self-contained 서버. listen(0) 으로 포트 자동 할당.
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
      const mime = _BRIX_MIME_TYPES[path.extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime }).end(buf);
    });
  });
  return new Promise((resolve) => {
    // 0.0.0.0 바인딩 필수 — e2e-runner 컨테이너가 hostname 으로 도달.
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

// 여러 시나리오가 동시에 서버를 기동하지 않도록 promise 를 memoize 한다.
let _serverPromise;
function getServer() {
  if (!_serverPromise) _serverPromise = startStaticServer('.');
  return _serverPromise;
}

after(async () => {
  if (!_serverPromise) return;
  const { server } = await _serverPromise;
  server.close();
});

/**
 * e2e-runner 에 시나리오 하나를 실행 요청한다.
 * CI 결정성 가드: BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 skip (fail 아님).
 */
async function runScenario(t, { label, scriptText, path: pagePath }) {
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

  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing (BRIX_RUN_ID/BRIX_JIRA_KEY)');

  const { port } = await getServer();
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}${pagePath}`;

  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({ url, label, scriptText, timeoutMs: 30000 }),
  });
  const json = await res.json();
  assert.equal(json.ok, true, `e2e-runner 요청 실패 — ${label}: ${json.stdout || JSON.stringify(json)}`);
  assert.equal(json.passed, true, `E2E 시나리오 실패 — ${label}\n${json.stdout || ''}`);
}

// --- 시나리오 1 (AC1): 페이지 진입 렌더 + 인증 가드 통과 ---------------------
test('BF-1160 handoff-board — 진입 렌더 + 인증 가드 통과', { skip: _brixOutOfScope }, async (t) => {
  await runScenario(t, {
    label: 'handoff-board 진입 렌더 + 인증 가드 통과',
    path: '/demo/handoff-board-cascade-canary/',
    scriptText: `
      await page.waitForSelector('.hb-board', { timeout: 5000 });
      const state = await page.evaluate(() => {
        const app = document.getElementById('app');
        return {
          ariaBusy: app ? app.getAttribute('aria-busy') : null,
          hasError: !!document.querySelector('.hb-error'),
          title: document.querySelector('.hb-title') ? document.querySelector('.hb-title').textContent : null,
          columnCount: document.querySelectorAll('.hb-column').length,
        };
      });
      if (state.ariaBusy !== 'false') throw new Error('aria-busy 가 false 로 정리되지 않음: ' + state.ariaBusy);
      if (state.hasError) throw new Error('.hb-error 렌더됨 — 인증 가드 실패');
      if (state.title !== '업무 인수인계 보드') throw new Error('타이틀 불일치: ' + state.title);
      if (state.columnCount < 1) throw new Error('보드 컬럼이 렌더되지 않음');
    `,
  });
});

// --- 시나리오 2 (AC2 전반부): 업무 항목 추가 → 카드 렌더 확인 -----------------
test('BF-1160 handoff-board — 업무 항목 추가 후 카드 렌더', { skip: _brixOutOfScope }, async (t) => {
  await runScenario(t, {
    label: 'handoff-board 업무 항목 추가 → 카드 렌더 확인',
    path: '/demo/handoff-board-cascade-canary/',
    scriptText: `
      await page.waitForSelector('.hb-form', { timeout: 5000 });
      const marker = 'BF1160-E2E-ADD-' + Math.random().toString(36).slice(2, 8);
      await page.getByLabel('업무 제목').fill(marker);
      await page.getByLabel('담당자').fill('정테스트');
      await page.getByRole('button', { name: '추가' }).click();
      await page.waitForTimeout(200);
      const found = await page.evaluate((m) => {
        return Array.from(document.querySelectorAll('.hb-card-title')).some((el) => el.textContent === m);
      }, marker);
      if (!found) throw new Error('추가한 카드가 렌더되지 않음: ' + marker);
    `,
  });
});

// --- 시나리오 3 (AC2 후반부): 상태별 조회 — 필터 탭 클릭 시 상태 반영 확인 ----
test('BF-1160 handoff-board — 상태 필터 조회 시 해당 컬럼만 노출', { skip: _brixOutOfScope }, async (t) => {
  await runScenario(t, {
    label: 'handoff-board 업무 추가 → 상태별 필터 조회',
    path: '/demo/handoff-board-cascade-canary/',
    scriptText: `
      await page.waitForSelector('.hb-form', { timeout: 5000 });
      const statusValue = await page.evaluate(() => {
        const select = document.querySelector('select[name="status"]');
        const opts = Array.from(select.options).map((o) => o.value);
        return opts[opts.length - 1];
      });
      const marker = 'BF1160-E2E-FILTER-' + Math.random().toString(36).slice(2, 8);
      await page.getByLabel('업무 제목').fill(marker);
      await page.locator('select[name="status"]').selectOption(statusValue);
      await page.getByRole('button', { name: '추가' }).click();
      await page.waitForTimeout(200);
      await page.click('.hb-tab[data-filter="' + statusValue + '"]');
      await page.waitForTimeout(150);
      const result = await page.evaluate(({ status, m }) => {
        const column = document.querySelector('.hb-column[data-status="' + status + '"]');
        const others = Array.from(document.querySelectorAll('.hb-column')).filter(
          (c) => c.getAttribute('data-status') !== status,
        );
        const cardInColumn = column
          ? Array.from(column.querySelectorAll('.hb-card-title')).some((el) => el.textContent === m)
          : false;
        const othersHidden = others.every((c) => c.hidden === true);
        return { cardInColumn, othersHidden };
      }, { status: statusValue, m: marker });
      if (!result.cardInColumn) throw new Error('필터 후 카드가 해당 상태 컬럼에 없음: ' + marker);
      if (!result.othersHidden) throw new Error('다른 상태 컬럼이 숨겨지지 않음 — 상태 필터 회귀');
    `,
  });
});
