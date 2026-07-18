// BF-1071 — 온보딩 체크리스트 E2E 회귀 가드 (실 브라우저 검증)
// dev(BF-1069)가 이미 단위 테스트한 순수 판정 로직(computeReadiness 등,
// demo/customer-onboarding-canary/tests/checklist.test.js)은 재검증하지 않는다.
// 여기서는 (1) 실제 렌더/fixture 로드/인증가드, (2) 결정적 fixture 기준
// readiness·다음 액션 표시, (3) 클릭 인터랙션에 따른 실제 재렌더(관련 모듈 회귀)를
// 브라우저 레벨에서 검증한다.
import test from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'customer-onboarding-canary';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// module script 의 strict MIME 검사를 통과하려면 확장자별 Content-Type 이 필요하다.
const MIME_BY_EXT = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
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
      const contentType = MIME_BY_EXT[path.extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType }).end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

async function e2eReachable() {
  if (process.env.BRIX_E2E_SKIP === '1') return { ok: false, reason: 'BRIX_E2E_SKIP=1 — CI 결정성 가드' };
  try {
    const probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) return { ok: false, reason: `e2e-runner unhealthy (${probe.status})` };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `e2e-runner 도달 불가 (${err.message})` };
  }
}

async function runE2e(t, { label, url, scriptText, timeoutMs = 30000 }) {
  const reach = await e2eReachable();
  if (!reach.ok) {
    t.skip(reach.reason);
    return;
  }
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
    body: JSON.stringify({ url, label, scriptText, timeoutMs }),
  });
  const body = await res.json();
  if (!body.ok || !body.passed) {
    throw new Error(`e2e-runner 실패: ${JSON.stringify(body)}`);
  }
}

test('BF-1071 — 온보딩 체크리스트: 렌더·fixture 로드·인증가드', { skip: _brixOutOfScope }, async (t) => {
  const { server, port } = await startStaticServer('.');
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/demo/customer-onboarding-canary/`;

  await runE2e(t, {
    label: '온보딩 체크리스트 — 렌더·fixture 로드·인증가드',
    url,
    scriptText: `
      await page.waitForSelector('#checklist .checklist-item');
      const itemCount = await page.locator('#checklist .checklist-item').count();
      if (itemCount !== 6) throw new Error('checklist 항목 수 mismatch: ' + itemCount);
      const heading = (await page.locator('.onboarding-summary h1').innerText()).trim();
      if (heading !== '그린테크 주식회사') throw new Error('기본 고객(cust-001) 렌더 mismatch: ' + heading);

      await page.goto('${url}?customer=does-not-exist');
      await page.waitForSelector('[role="alert"]');
      const alertText = (await page.locator('[role="alert"] h2').innerText()).trim();
      if (alertText !== '고객 정보를 찾을 수 없음') throw new Error('인증가드 문구 mismatch: ' + alertText);
    `,
  });
});

test('BF-1071 — 온보딩 체크리스트: 결정적 fixture 4종 readiness·다음 액션 일치', { skip: _brixOutOfScope }, async (t) => {
  const { server, port } = await startStaticServer('.');
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/demo/customer-onboarding-canary/`;

  await runE2e(t, {
    label: '온보딩 체크리스트 — 결정적 fixture readiness/다음 액션',
    url,
    scriptText: `
      const cases = [
        { customerId: 'cust-001', readiness: '준비 상태: 진행 중', nextAction: '결제 수단 등록을(를) 완료해주세요' },
        { customerId: 'cust-002', readiness: '준비 상태: 차단됨', nextAction: '카드 인증 실패 — 고객센터 확인 필요' },
        { customerId: 'cust-003', readiness: '준비 상태: 준비 완료', nextAction: '온보딩이 완료되었습니다' },
        { customerId: 'cust-004', readiness: '준비 상태: 시작 전', nextAction: '이메일 인증을(를) 완료해주세요' },
      ];
      for (const c of cases) {
        await page.goto('${url}?customer=' + c.customerId);
        await page.waitForSelector('.onboarding-readiness');
        const readinessText = (await page.locator('.onboarding-readiness').innerText()).trim();
        if (readinessText !== c.readiness) {
          throw new Error(c.customerId + ' readiness mismatch: ' + readinessText + ' (expected ' + c.readiness + ')');
        }
        const nextActionText = (await page.locator('#next-action-message').innerText()).trim();
        if (nextActionText !== c.nextAction) {
          throw new Error(c.customerId + ' next-action mismatch: ' + nextActionText + ' (expected ' + c.nextAction + ')');
        }
      }
    `,
  });
});

test('BF-1071 — 온보딩 체크리스트: 완료 처리 클릭 → 실제 재렌더 회귀(관련 모듈)', { skip: _brixOutOfScope }, async (t) => {
  const { server, port } = await startStaticServer('.');
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/demo/customer-onboarding-canary/?customer=cust-001`;

  await runE2e(t, {
    label: '온보딩 체크리스트 — 완료 처리 클릭 재렌더 회귀',
    url,
    scriptText: `
      await page.waitForSelector('.checklist-item[data-item-id="payment_method"] .item-complete-btn');
      await page.click('.checklist-item[data-item-id="payment_method"] .item-complete-btn');
      await page.waitForFunction(() => {
        const el = document.querySelector('.checklist-item[data-item-id="payment_method"] .item-status');
        return el && el.dataset.status === 'complete';
      });
      const progress = (await page.locator('.onboarding-progress').innerText()).trim();
      if (!progress.includes('3/4')) throw new Error('완료 처리 후 진행률 mismatch: ' + progress);
      const nextMsg = (await page.locator('#next-action-message').innerText()).trim();
      if (!nextMsg.includes('첫 프로젝트 생성')) throw new Error('완료 처리 후 다음 액션 mismatch: ' + nextMsg);
    `,
  });
});
