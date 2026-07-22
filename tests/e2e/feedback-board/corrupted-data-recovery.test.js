// BF-1077 — 피드백 보드 E2E 회귀 가드: 손상된 localStorage 데이터 → 빈 상태 복구 (AC-7).
// dev 가 이미 loadState/parseContainer 단위 로직을 검증했으므로(demo/feedback-board/tests/feedback-board.test.js),
// 여기서는 실제 브라우저에서 손상 데이터 주입 → 새로고침 → 복구 배너/empty-state/백업 키가
// 실제로 렌더링·생성되는지를 확인한다.
import test from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'feedback-board';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

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
      res.writeHead(200).end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

test(
  'BF-1077 E2E — 손상된 데이터 → 빈 상태 복구 (recovery 배너 + 백업 키)',
  { skip: _brixOutOfScope },
  async (t) => {
    if (process.env.BRIX_E2E_SKIP === '1') {
      t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
      return;
    }

    const { server, port } = await startStaticServer(path.join('demo', 'feedback-board'));
    t.after(() => server.close());

    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/`;

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
    if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');

    const scriptText = `
      // 최초 로드 — 정상 상태 확인 (recovery 배너 숨김, empty-state 노출)
      await page.waitForSelector('#fb-empty:not([hidden])');
      const recoveryHiddenInitially = await page.locator('#fb-recovery').isHidden();
      if (!recoveryHiddenInitially) throw new Error('최초 로드인데 recovery 배너가 노출됨');

      // 손상 데이터 주입 (loadState 가 재로드 시 파싱 실패를 감지하도록)
      await page.evaluate(() => {
        localStorage.setItem('feedback-board:v1', '{이것은 유효하지 않은 JSON');
      });

      await page.reload();

      // 복구 배너 노출 확인 (AC-7)
      await page.waitForSelector('#fb-recovery:not([hidden])');
      const bannerText = await page.locator('#fb-recovery').textContent();
      if (!bannerText || !bannerText.includes('복구할 수 없어 초기화')) {
        throw new Error('복구 배너 문구 불일치: ' + bannerText);
      }

      // 빈 상태 유지 확인 (재초기화 — 데이터 0건)
      const emptyStateHidden = await page.locator('#fb-empty').isHidden();
      if (emptyStateHidden) throw new Error('손상 복구 후 empty-state 가 노출되지 않음');

      const kpiTotal = await page.locator('#kpi-total').textContent();
      if (kpiTotal !== '0') throw new Error('손상 복구 후 KPI 전체 건수가 0이 아님: ' + kpiTotal);

      // 손상 원본 백업 key 존재 확인 (§6.2)
      const hasBackupKey = await page.evaluate(() => {
        return Object.keys(localStorage).some((k) => k.indexOf('feedback-board:v1:corrupted:') === 0);
      });
      if (!hasBackupKey) throw new Error('손상 원본 백업 key 가 생성되지 않음');

      // 배너 닫기 인터랙션 (aria-label="알림 닫기")
      await page.locator('#fb-recovery-close').click();
      await page.waitForSelector('#fb-recovery[hidden]');
    `;

    const res = await fetch('http://e2e-runner:3030/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Brix-Run-Id': runId,
        'X-Brix-Jira-Key': jiraKey,
      },
      body: JSON.stringify({
        url,
        label: '피드백 보드 손상 데이터 → 빈 상태 복구',
        scriptText,
        timeoutMs: 30000,
      }),
    });

    const body = await res.json();
    if (!body.ok || !body.passed) {
      throw new Error(
        `e2e-runner 시나리오 실패 — ok:${body.ok} passed:${body.passed} stdout:${body.stdout || ''}`
      );
    }
  }
);
