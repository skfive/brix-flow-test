// BF-1089 릴리스 요약 보드 — E2E 회귀 가드 (머지된 BF-1087 구현 대상)
// 대상 AC:
//  AC-1 유효 입력 → 카드 생성 + 중요도/영향도 배지·칩 구분 표시
//  AC-2 오류 입력 → 빈 입력 안내 / 중요도 미선택(=잘못된 중요도) 안내 + 생성 차단
//  AC-3 focused scope 에서는 release-notes module 만 대상, 다른 SPA 는 제외
// 실행: node --test tests/e2e/release-notes/BF1089-board.test.js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// ─────────────── brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip ───────────────
const _BRIX_MY_MODULE = 'release-notes';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// 확장자 → MIME. `<script type="module">` 는 strict MIME 검사를 하므로 반드시 정확한 타입 필요.
const MIME_TYPES = {
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

let server;
let port;
let boardUrl;
let e2eAvailable = true;
let skipReason = null;

before(async () => {
  if (_brixOutOfScope) return; // focused scope 밖 module — 서버/health 체크 불필요
  if (process.env.BRIX_E2E_SKIP === '1') {
    e2eAvailable = false;
    skipReason = 'BRIX_E2E_SKIP=1 — CI 결정성 가드';
    return;
  }
  const started = await startStaticServer('src/features/release-notes');
  server = started.server;
  port = started.port;
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  boardUrl = `http://${host}:${port}/`;

  try {
    const probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) {
      e2eAvailable = false;
      skipReason = `e2e-runner unhealthy (${probe.status}) — skip`;
    }
  } catch (err) {
    e2eAvailable = false;
    skipReason = `e2e-runner 도달 불가 (${err.message}) — skip`;
  }
});

after(() => {
  if (server) server.close();
});

/** e2e-runner /run 호출 공통 헬퍼. */
async function runE2e(label, scriptText, timeoutMs = 30000) {
  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing (BRIX_RUN_ID/BRIX_JIRA_KEY)');
  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({ url: boardUrl, label, scriptText, timeoutMs }),
  });
  const body = await res.json();
  assert.equal(body.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(body)}`);
  assert.equal(body.passed, true, `시나리오 실패 [${label}]: ${body.stdout ?? ''}`);
  return body;
}

// ───────────────────── AC-1: 유효 입력 → 카드 생성 + 중요도/영향도 구분 ─────────────────────
test('AC-1 유효 입력 → 카드 생성 및 중요도(배지)/영향도(칩) 구분 표시', { skip: _brixOutOfScope }, async () => {
  if (!e2eAvailable) return void console.log(`[skip] ${skipReason}`);

  const scriptText = `
    await page.locator('#rn-title').fill('2026.07 릴리스 노트');
    await page.getByLabel('변경 항목 1').fill('결제 버그 수정');
    await page.locator('#rn-importance').selectOption('critical');
    await page.locator('#rn-impact').selectOption('breaking');
    await page.getByRole('button', { name: '요약 카드 생성' }).click();
    await page.waitForSelector('.summary-card', { timeout: 5000 });
    const listHtml = await page.evaluate(() => document.querySelector('[data-list]').innerHTML);
    if (!listHtml.includes('summary-card--critical')) throw new Error('중요도 좌측 보더 클래스 누락: ' + listHtml.slice(0, 300));
    if (!listHtml.includes('imp-badge--critical')) throw new Error('중요도 배지 클래스 누락');
    if (!listHtml.includes('impact-chip--breaking')) throw new Error('영향도 칩 클래스 누락');
    const kpiHtml = await page.evaluate(() => document.querySelector('[data-kpi]').innerHTML);
    if (!kpiHtml.includes('kpi-tile__value">1<')) throw new Error('KPI 총 카드 건수가 1로 갱신되지 않음: ' + kpiHtml.slice(0, 200));
  `;
  await runE2e('[BF-1089] 유효 입력 카드 생성 + 배지/칩 구분', scriptText);
});

// ───────────────────── AC-2a: 빈 입력 사전 검증 → 필드별 오류 안내 ─────────────────────
test('AC-2 빈 입력 사전 검증 → 필드별 오류 안내, 카드 미생성', { skip: _brixOutOfScope }, async () => {
  if (!e2eAvailable) return void console.log(`[skip] ${skipReason}`);

  const scriptText = `
    await page.getByRole('button', { name: '사전 검증' }).click();
    await page.waitForSelector('.validate-result--fail', { timeout: 5000 });
    const resultHtml = await page.evaluate(() => document.querySelector('[data-validate-result]').innerHTML);
    if (!resultHtml.includes('릴리스 제목을 입력하세요.')) throw new Error('제목 오류 안내 누락: ' + resultHtml.slice(0, 300));
    if (!resultHtml.includes('1번째 항목을 확인하세요.')) throw new Error('변경 항목 오류 안내 누락: ' + resultHtml.slice(0, 300));
    if (!resultHtml.includes('중요도를 선택하세요.')) throw new Error('중요도 오류 안내 누락: ' + resultHtml.slice(0, 300));
    if (!resultHtml.includes('사용자 영향도를 선택하세요.')) throw new Error('사용자 영향도 오류 안내 누락: ' + resultHtml.slice(0, 300));
    const titleFieldErr = await page.locator('[data-field="title"] .summary-form__error').innerText();
    if (!titleFieldErr.includes('릴리스 제목을 입력하세요.')) throw new Error('title 필드별 인라인 오류 미표시: ' + titleFieldErr);
    const listHtml = await page.evaluate(() => document.querySelector('[data-list]').innerHTML);
    if (!listHtml.includes('empty-state--no-data')) throw new Error('빈 입력 사전 검증인데 카드가 생성됨(부작용 발생)');
  `;
  await runE2e('[BF-1089] 빈 입력 사전검증 오류 안내', scriptText);
});

// ───────────────────── AC-2b: 중요도 미선택 상태 제출 → 생성 차단 + 오류 안내 ─────────────────────
test('AC-2 중요도 미선택 상태로 제출 → 카드 생성 차단 및 오류 안내', { skip: _brixOutOfScope }, async () => {
  if (!e2eAvailable) return void console.log(`[skip] ${skipReason}`);

  const scriptText = `
    await page.locator('#rn-title').fill('2026.08 릴리스 노트');
    await page.getByLabel('변경 항목 1').fill('알림 오류 수정');
    await page.locator('#rn-impact').selectOption('minor');
    await page.getByRole('button', { name: '요약 카드 생성' }).click();
    await page.waitForSelector('.validate-result--fail', { timeout: 5000 });
    const resultHtml = await page.evaluate(() => document.querySelector('[data-validate-result]').innerHTML);
    if (!resultHtml.includes('중요도를 선택하세요.')) throw new Error('중요도 미선택 오류 안내 누락: ' + resultHtml.slice(0, 300));
    const listHtml = await page.evaluate(() => document.querySelector('[data-list]').innerHTML);
    if (!listHtml.includes('empty-state--no-data')) throw new Error('중요도 미선택인데 카드가 생성됨(검증 우회 회귀)');
  `;
  await runE2e('[BF-1089] 중요도 미선택 제출 차단', scriptText);
});

// ───────────────────── AC-3: focused scope 가드 로직 자체 검증 (정적) ─────────────────────
test('AC-3 scope guard — focused+다른 module 이면 skip, release-notes 면 실행', () => {
  const computeSkip = (scope, module) => scope === 'focused' && !!module && module !== _BRIX_MY_MODULE;
  assert.equal(computeSkip('focused', 'notepad'), true);
  assert.equal(computeSkip('focused', 'timer'), true);
  assert.equal(computeSkip('focused', 'release-notes'), false);
  assert.equal(computeSkip('all', 'notepad'), false);
  assert.equal(computeSkip('focused', undefined), false);
});
