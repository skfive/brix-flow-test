// BF-1077 — 피드백 보드 E2E 회귀 가드: 등록 → 상태 전이 → 필터 → 새로고침 복구 → JSON 내보내기.
// e2e-runner(compose 네트워크, :3030) 로 실제 브라우저 인터랙션을 검증한다.
// 단위 로직(validateInput/createFeedback/applyTransition/filterItems 등)은
// demo/feedback-board/tests/feedback-board.test.js 에서 dev 가 이미 검증했으므로
// 여기서는 실제 DOM 인터랙션·persist·refresh·다운로드만 확인한다.
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
  'BF-1077 E2E — 등록→상태전이→필터→새로고침 복구→JSON 내보내기',
  { skip: _brixOutOfScope },
  async (t) => {
    // 1. CI 결정성 가드 — 페르소나 실행 시엔 절대 set 하지 않음(코드 안 가드만 유지)
    if (process.env.BRIX_E2E_SKIP === '1') {
      t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
      return;
    }

    const { server, port } = await startStaticServer(path.join('demo', 'feedback-board'));
    t.after(() => server.close());

    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/`;

    // 2. e2e-runner 도달성 사전 확인 — 못 닿으면 skip (fail 아님)
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
      const title = '로그인 버튼 클릭 안됨';
      const content = '모바일 사파리에서 로그인 버튼이 반응하지 않습니다.';

      // 1) 등록 (AC-1)
      await page.locator('#fb-title').fill(title);
      await page.locator('#fb-category').selectOption('bug');
      await page.locator('#fb-content').fill(content);
      await page.locator('#fb-form button[type="submit"]').click();

      await page.waitForSelector('.fb-card');
      const cardCountAfterCreate = await page.locator('.fb-card').count();
      if (cardCountAfterCreate !== 1) throw new Error('등록 후 카드 개수 불일치: ' + cardCountAfterCreate);

      const cardTitleText = await page.locator('.fb-card .fb-card__title').first().textContent();
      if (!cardTitleText || !cardTitleText.includes(title)) throw new Error('등록된 카드 제목 불일치: ' + cardTitleText);

      const badgeAfterCreate = await page.locator('.fb-card .badge').first().textContent();
      if (!badgeAfterCreate || !badgeAfterCreate.includes('접수')) throw new Error('신규 등록 상태가 접수(open) 아님: ' + badgeAfterCreate);

      // 2) 상태 전이 open → planned (AC-3)
      await page.locator('.fb-card [data-action="transition"][data-target="planned"]').click();
      await page.waitForFunction(() => {
        const badge = document.querySelector('.fb-card .badge');
        return badge && badge.textContent.includes('계획됨');
      });

      // 3) 필터 (AC-5) — 완료 필터엔 없어야 하고, 계획됨 필터엔 있어야 함
      await page.locator('#fb-status-filter [data-value="done"]').click();
      await page.waitForSelector('#fb-empty:not([hidden])');
      const doneFilterCardCount = await page.locator('.fb-card').count();
      if (doneFilterCardCount !== 0) throw new Error('완료 필터인데 카드가 노출됨: ' + doneFilterCardCount);

      await page.locator('#fb-status-filter [data-value="planned"]').click();
      await page.waitForSelector('.fb-card');
      const plannedFilterCardCount = await page.locator('.fb-card').count();
      if (plannedFilterCardCount !== 1) throw new Error('계획됨 필터에서 카드 미노출: ' + plannedFilterCardCount);

      await page.locator('#fb-status-filter [data-value="all"]').click();

      // 4) 새로고침 복구 (AC-6) — localStorage persist 확인
      await page.reload();
      await page.waitForSelector('.fb-card');
      const cardCountAfterReload = await page.locator('.fb-card').count();
      if (cardCountAfterReload !== 1) throw new Error('새로고침 후 데이터 유실: ' + cardCountAfterReload);
      const badgeAfterReload = await page.locator('.fb-card .badge').first().textContent();
      if (!badgeAfterReload || !badgeAfterReload.includes('계획됨')) throw new Error('새로고침 후 상태 유실: ' + badgeAfterReload);

      // 5) JSON 내보내기 (AC-8) — 다운로드 이벤트 + 파일명 규칙
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#fb-export').click(),
      ]);
      const suggested = download.suggestedFilename();
      if (!/^feedback-board-export-\\d{8}-\\d{6}\\.json$/.test(suggested)) {
        throw new Error('내보내기 파일명 형식 불일치: ' + suggested);
      }
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
        label: '피드백 등록→상태전이→필터→새로고침 복구→JSON 내보내기',
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
