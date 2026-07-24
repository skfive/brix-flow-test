// BF-1125 tester 회귀 가드 — 서비스 요청 분류 보드(BF-1123, PR #290) 실 브라우저 E2E.
// 대상: demo/service-request-triage/index.html (유형×영향도 select → 우선순위 배지/컬럼 즉시 반영).
// 범위: 유형(Type)·영향도(Impact) select 상호작용 → classifyServiceRequestPriority() 파생 렌더 경로.
// dev(BF-1123)가 이미 검증한 순수 함수 20 조합·엔트리 정적 구조는 재작성하지 않는다
// (src/demo/service-request-triage/classify.test.js). 여기서는 실 브라우저 클릭/select 상호작용만 검증한다.
// 실행: node --test tests/service-request-triage/triage-priority-e2e-BF1125.test.js
import test from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'service-request-triage';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// serveRoot(repo root) 아래 정적 파일만 노출. listen(0)으로 포트 자동 할당(병렬 tester 충돌 방지).
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
      const ct = ext === '.js' ? 'text/javascript' : ext === '.html' ? 'text/html' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': ct }).end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

async function callE2E({ url, label, scriptText, timeoutMs }) {
  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity(BRIX_RUN_ID/BRIX_JIRA_KEY) missing');
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

async function probeE2ERunner() {
  if (process.env.BRIX_E2E_SKIP === '1') return { ok: false, reason: 'BRIX_E2E_SKIP=1 — CI 결정성 가드' };
  try {
    const probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) return { ok: false, reason: `e2e-runner unhealthy (${probe.status})` };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `e2e-runner 도달 불가 (${err.message})` };
  }
}

// AC1 — Given 머지된 SPA, When 미분류 카드에 유형·영향도 select, Then 우선순위 배지 표시 + P1 컬럼으로 이동.
test(
  'BF-1125 — 미분류 요청 카드에 유형(security)·영향도(high) 선택 → P1 배지 + P1 컬럼 이동',
  { skip: _brixOutOfScope },
  async (t) => {
    const probe = await probeE2ERunner();
    if (!probe.ok) {
      t.skip(probe.reason);
      return;
    }
    const { server, port } = await startStaticServer(repoRoot);
    t.after(() => server.close());

    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/demo/service-request-triage/`;

    const scriptText = `
      await page.waitForFunction(() => document.body.dataset.triageReady === 'true', null, { timeout: 10000 });
      const typeSelect = page.locator('[data-card-root="r7"] select[data-axis="type"]');
      await typeSelect.waitFor({ state: 'visible' });
      await typeSelect.selectOption('security');
      const impactSelect = page.locator('[data-card-root="r7"] select[data-axis="impact"]');
      await impactSelect.waitFor({ state: 'visible' });
      await impactSelect.selectOption('high');
      await page.waitForFunction(() => {
        const card = document.querySelector('[data-card-root="r7"]');
        const badge = card && card.querySelector('.priority-badge');
        return !!(badge && badge.textContent.includes('P1'));
      }, null, { timeout: 5000 });
      const badgeText = await page.locator('[data-card-root="r7"] .priority-badge').innerText();
      if (!badgeText.includes('P1')) throw new Error('expected P1 badge after security/high selection, got: ' + badgeText);
      const columnClass = await page.evaluate((id) => {
        const card = document.querySelector('[data-card-root="' + id + '"]');
        return card && card.closest('.column') ? card.closest('.column').className : null;
      }, 'r7');
      if (!columnClass || !columnClass.includes('column--p1')) {
        throw new Error('card r7 did not move into P1 column, got className: ' + columnClass);
      }
    `;

    const result = await callE2E({
      url,
      label: '미분류 카드 유형·영향도 선택 → P1 배지·컬럼 이동',
      scriptText,
      timeoutMs: 30000,
    });

    if (result.ok === false && /reachable|connect|ECONNREFUSED/i.test(String(result.reason || ''))) {
      t.skip(`e2e-runner 도달 불가 — ${result.reason}`);
      return;
    }
    assert_e2e_passed(result);
  }
);

// AC2 — Given 회귀 가드, When 이미 분류된 카드의 영향도를 변경, Then 우선순위가 즉시 재계산되어 컬럼 이동.
test(
  'BF-1125 — 분류된 요청 카드(bug/medium=P3) 영향도를 low 로 변경 → P4 재계산 + 컬럼 이동',
  { skip: _brixOutOfScope },
  async (t) => {
    const probe = await probeE2ERunner();
    if (!probe.ok) {
      t.skip(probe.reason);
      return;
    }
    const { server, port } = await startStaticServer(repoRoot);
    t.after(() => server.close());

    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/demo/service-request-triage/`;

    const scriptText = `
      await page.waitForFunction(() => document.body.dataset.triageReady === 'true', null, { timeout: 10000 });
      const beforeBadge = await page.locator('[data-card-root="r5"] .priority-badge').innerText();
      if (!beforeBadge.includes('P3')) throw new Error('precondition failed — expected initial P3 for r5(bug/medium), got: ' + beforeBadge);
      const impactSelect = page.locator('[data-card-root="r5"] select[data-axis="impact"]');
      await impactSelect.selectOption('low');
      await page.waitForFunction(() => {
        const card = document.querySelector('[data-card-root="r5"]');
        const badge = card && card.querySelector('.priority-badge');
        return !!(badge && badge.textContent.includes('P4'));
      }, null, { timeout: 5000 });
      const afterBadge = await page.locator('[data-card-root="r5"] .priority-badge').innerText();
      if (!afterBadge.includes('P4')) throw new Error('expected P4 badge after impact change to low, got: ' + afterBadge);
      const columnClass = await page.evaluate((id) => {
        const card = document.querySelector('[data-card-root="' + id + '"]');
        return card && card.closest('.column') ? card.closest('.column').className : null;
      }, 'r5');
      if (!columnClass || !columnClass.includes('column--p4')) {
        throw new Error('card r5 did not move into P4 column after recalculation, got: ' + columnClass);
      }
    `;

    const result = await callE2E({
      url,
      label: '분류된 카드 영향도 변경(medium→low) → 우선순위 재계산·컬럼 이동',
      scriptText,
      timeoutMs: 30000,
    });

    if (result.ok === false && /reachable|connect|ECONNREFUSED/i.test(String(result.reason || ''))) {
      t.skip(`e2e-runner 도달 불가 — ${result.reason}`);
      return;
    }
    assert_e2e_passed(result);
  }
);

function assert_e2e_passed(result) {
  if (!result.ok || !result.passed) {
    throw new Error(
      `e2e-runner 시나리오 실패 — ok=${result.ok} passed=${result.passed} stdout=${String(result.stdout || '').slice(0, 2000)}`
    );
  }
}
