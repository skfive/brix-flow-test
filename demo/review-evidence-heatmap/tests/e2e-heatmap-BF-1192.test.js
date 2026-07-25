// 리뷰 증거 히트맵 E2E 회귀 가드 (BF-1192)
// 대상 dev 산출물: BF-1190 (PR #323, merge f223483b05e51a69ae3ebb13e1f4c48fd6d9daf3)
// 권위 명령: node --test demo/review-evidence-heatmap/tests/*.test.js
// worker 환경에서는 e2e-runner 호출 의무 — 이 파일을 돌릴 때 BRIX_E2E_SKIP=1 을 명령줄에 set 하지 말 것.
import test from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// 이 Run 의 primary_module 은 'e2e' (RUN_CONTEXT_STARTER) 이므로 파일명 prefix 도 'e2e' 로 맞춘다.
const _BRIX_MY_MODULE = 'e2e';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// 확장자 → MIME 매핑. app.js 가 <script type="module"> 로 로드되므로
// 정확한 Content-Type 을 안 주면 브라우저가 strict MIME 체크로 로드를 거부한다.
const MIME_BY_EXT = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// serveRoot 아래 정적 파일만 노출. path traversal 차단. listen(0) 으로 포트 자동 할당.
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
    // 0.0.0.0 바인딩 필수 — e2e-runner 컨테이너가 hostname 으로 도달.
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

let e2eAvailable = true;
let skipReason = null;
let server = null;
let port = null;

test.before(async () => {
  if (_brixOutOfScope) return;
  if (process.env.BRIX_E2E_SKIP === '1') {
    e2eAvailable = false;
    skipReason = 'BRIX_E2E_SKIP=1 — CI 결정성 가드';
    return;
  }
  try {
    const probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) {
      e2eAvailable = false;
      skipReason = `e2e-runner unhealthy (${probe.status})`;
      return;
    }
  } catch (err) {
    e2eAvailable = false;
    skipReason = `e2e-runner 도달 불가 (${err.message})`;
    return;
  }
  const started = await startStaticServer(ROOT);
  server = started.server;
  port = started.port;
});

test.after(() => {
  if (server) server.close();
});

function runE2E(label, scriptText) {
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;
  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity(BRIX_RUN_ID/BRIX_JIRA_KEY) missing');
  return fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({ url, label, scriptText, timeoutMs: 30000 }),
  }).then(async (res) => {
    const body = await res.json();
    if (!body.passed) {
      throw new Error(`e2e-runner scenario failed: ${body.stdout ?? JSON.stringify(body)}`);
    }
    return body;
  });
}

// ---- AC1 (전반부): 페이지 렌더 — 히트맵 셀 20개 + 요약 통계 ----
test('E2E — 히트맵 초기 렌더: 셀 20개 + 요약 통계 표시', { skip: _brixOutOfScope }, async (t) => {
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }
  await runE2E(
    '리뷰 증거 히트맵 — 초기 렌더 셀 20개 + 통계',
    `
      await page.waitForSelector('.reh-cell');
      const cellCount = await page.locator('.reh-cell').count();
      if (cellCount !== 20) throw new Error('cell count mismatch: ' + cellCount);
      const total = (await page.locator('#reh-stat-total').textContent()).trim();
      if (total !== '20') throw new Error('stat-total mismatch: ' + total);
      const countText = (await page.locator('#reh-count').textContent()).trim();
      if (countText !== '표시 중 20 / 20 파일') throw new Error('count label mismatch: ' + countText);
    `,
  );
});

// ---- AC1 (후반부): 필터 동작 + 상세 패널 노출 ----
test('E2E — 위험도 필터 클릭 시 개수 갱신, 셀 클릭 시 상세 패널 노출', { skip: _brixOutOfScope }, async (t) => {
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }
  await runE2E(
    '리뷰 증거 히트맵 — 필터 적용 + 상세 패널 노출',
    `
      await page.waitForSelector('.reh-cell');
      await page.locator('button[data-filter-risk="critical"]').click();
      await page.waitForTimeout(150);
      const filteredCount = await page.locator('.reh-cell').count();
      if (filteredCount !== 3) throw new Error('filtered cell count mismatch: ' + filteredCount);
      const countText = (await page.locator('#reh-count').textContent()).trim();
      if (countText !== '표시 중 3 / 20 파일') throw new Error('count label mismatch: ' + countText);
      await page.locator('.reh-cell').first().click();
      await page.waitForTimeout(150);
      const detailOpen = await page.locator('#reh-detail').getAttribute('data-open');
      if (detailOpen !== 'true') throw new Error('detail panel did not open: ' + detailOpen);
      const titleCount = await page.locator('.reh-detail__title').count();
      if (titleCount !== 1) throw new Error('detail title missing');
    `,
  );
});

// ---- AC2: 키보드 접근성 — Enter 로 선택, Escape 로 닫힘 + 포커스 관리 ----
test('E2E — 키보드 Enter 로 셀 선택 시 상세 패널 포커스 이동, Escape 로 닫힘 시 포커스 복귀', { skip: _brixOutOfScope }, async (t) => {
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }
  await runE2E(
    '리뷰 증거 히트맵 — 키보드 Enter 선택 + Escape 닫힘 포커스 복귀',
    `
      await page.waitForSelector('.reh-cell');
      await page.locator('.reh-cell').first().focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(150);
      const openedAfterEnter = await page.evaluate(() => document.querySelector('#reh-detail').dataset.open);
      if (openedAfterEnter !== 'true') throw new Error('Enter 키로 상세 패널이 열리지 않음: ' + openedAfterEnter);
      const focusedId = await page.evaluate(() => document.activeElement && document.activeElement.id);
      if (focusedId !== 'reh-detail') throw new Error('상세 패널로 포커스 이동 실패: ' + focusedId);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      const openedAfterEscape = await page.evaluate(() => document.querySelector('#reh-detail').dataset.open);
      if (openedAfterEscape !== 'false') throw new Error('Escape 로 상세 패널이 닫히지 않음: ' + openedAfterEscape);
      const focusedAfterEscape = await page.evaluate(() => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.id);
      if (!focusedAfterEscape) throw new Error('Escape 후 포커스가 셀로 복귀하지 않음');
    `,
  );
});
