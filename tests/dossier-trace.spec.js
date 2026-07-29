// tests/dossier-trace.spec.js
// 실행 계약 상태 대시보드(BF-1248) — focused 회귀 가드 (BF-1251)
// 범위: 필터(전체/진행/완료), 상세 패널 선택, loading/empty/ready/error 상태 전환, 실패 후 복원.
//
// dev(BF-1248)가 demo/dossier-trace/tests/dossier.test.js 에서 이미 검증한 순수 로직
// (filterItems/deriveDisplayState/progressSummary/statusMeta/cardVariantClass/fixture 결정론성 등)은
// 여기서 재작성하지 않는다. 이 파일은 tester 고유 영역만 다룬다:
//   1) UI 마크업/토큰 contract (계약 §3.1/§3.2/§3.4) — 실제 DOM/CSS 파일에 selector가 존재하는지
//   2) 결정론적 fixture 보존 가드 (계약 §4) — 외부 fetch 미사용
//   3) 실 브라우저 인터랙션 (e2e-runner) — 필터 클릭/카드 선택/오류 재현/복원 흐름
//
// 실행: node --test tests/dossier-trace.spec.js

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// BRIX_TEST_MODULE 은 top-level module 단위('demo')로 주입되므로 그에 맞춘다.
const _BRIX_MY_MODULE = 'demo';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const HTML_PATH = path.join('demo', 'dossier-trace', 'index.html');
const CSS_PATH = path.join('demo', 'dossier-trace', 'styles.css');
const APP_JS_PATH = path.join('demo', 'dossier-trace', 'app.js');
const FIXTURES_PATH = path.join('demo', 'dossier-trace', 'fixtures.js');

const html = fs.readFileSync(HTML_PATH, 'utf-8');
const css = fs.readFileSync(CSS_PATH, 'utf-8');
const appJs = fs.readFileSync(APP_JS_PATH, 'utf-8');
const fixturesJs = fs.readFileSync(FIXTURES_PATH, 'utf-8');

// ── UI 마크업 contract (계약 §3.1/§3.2) — silent break 방지 ─────────────────

test('계약 §3.1 — DOM id가 index.html에 그대로 존재한다', { skip: _brixOutOfScope }, () => {
  for (const id of [
    'dossier-trace-root',
    'dossier-filter-all',
    'dossier-filter-progress',
    'dossier-filter-done',
    'dossier-list',
    'dossier-detail-panel',
  ]) {
    assert.ok(html.includes(`id="${id}"`), `id 누락: ${id}`);
  }
});

test('계약 §3.2 — CSS class가 index.html/app.js에 그대로 존재한다', { skip: _brixOutOfScope }, () => {
  assert.ok(html.includes('class="dossier'), 'dossier 루트 class 누락');
  assert.ok(html.includes('dossier__filters'), 'dossier__filters class 누락');
  assert.ok(html.includes('dossier__detail'), 'dossier__detail class 누락');
  for (const cls of ['dossier__card--requirement', 'dossier__card--role', 'dossier__card--test']) {
    assert.ok(appJs.includes(cls), `card 변형 class 누락: ${cls}`);
  }
  assert.ok(appJs.includes('dossier__status-badge'), 'dossier__status-badge class 누락');
});

test('계약 §3.4 — 디자인 토큰이 styles.css에 exact 값으로 정의되어 있다', { skip: _brixOutOfScope }, () => {
  const tokens = {
    '--color-bg-surface': '#0f172a',
    '--color-text-primary': '#e2e8f0',
    '--color-status-ready': '#22c55e',
    '--color-status-progress': '#f59e0b',
    '--color-status-error': '#ef4444',
    '--space-card-gap': '16px',
  };
  for (const [name, value] of Object.entries(tokens)) {
    assert.ok(css.includes(`${name}: ${value}`), `토큰 값 불일치/누락: ${name}`);
  }
});

test('계약 §4 — 외부 API/network/fetch 미사용(결정론적 로컬 fixture 보존)', { skip: _brixOutOfScope }, () => {
  assert.ok(!/fetch\s*\(/.test(appJs), 'app.js에 fetch() 호출이 있으면 안 됨');
  assert.ok(!/fetch\s*\(/.test(fixturesJs), 'fixtures.js에 fetch() 호출이 있으면 안 됨');
});

// ── 실 브라우저 E2E (필터·상세 패널·상태 전환·복원) ──────────────────────────

// 확장자 → MIME. app.js 가 <script type="module"> 로 로드되므로 .js 는 반드시
// text/javascript 로 응답해야 한다 (MIME 미설정 시 브라우저가 strict module MIME
// 검사에서 로드를 거부한다).
const MIME_BY_EXT = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
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

test(
  'AC-1/3/4/6 — 필터·상세 패널 선택·오류 상태 전환과 실패 후 복원 (e2e-runner)',
  { skip: _brixOutOfScope },
  async (t) => {
    if (process.env.BRIX_E2E_SKIP === '1') {
      t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
      return;
    }

    try {
      const probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
      if (!probe.ok) {
        t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
        return;
      }
    } catch (err) {
      t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
      return;
    }

    const { server, port } = await startStaticServer(path.join('demo', 'dossier-trace'));
    t.after(() => server.close());

    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/`;

    const runId = process.env.BRIX_RUN_ID;
    const jiraKey = process.env.BRIX_JIRA_KEY;
    if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');

    const scriptText = `
      const consoleErrors = [];
      page.on('pageerror', (e) => consoleErrors.push(String(e)));
      let step = 'init';
      try {
        // 초기 ready 상태: fixture 9건 렌더 (AC-1)
        step = 'wait-initial-cards';
        await page.waitForSelector('#dossier-list .dossier__card', { timeout: 8000 });
        step = 'count-initial-cards';
        const initialCount = await page.locator('#dossier-list .dossier__card').count();
        if (initialCount !== 9) throw new Error('초기 카드 수 불일치: ' + initialCount);

        // AC-3: 진행 필터
        step = 'click-filter-progress';
        await page.click('#dossier-filter-progress');
        step = 'wait-filter-progress';
        await page.waitForFunction(() => document.querySelectorAll('#dossier-list .dossier__card').length === 3, { timeout: 8000 });
        step = 'check-filter-progress-selected';
        const progressSelected = await page.getAttribute('#dossier-filter-progress', 'aria-selected');
        if (progressSelected !== 'true') throw new Error('progress 필터 aria-selected 미반영: ' + progressSelected);

        // AC-3: 완료 필터
        step = 'click-filter-done';
        await page.click('#dossier-filter-done');
        step = 'wait-filter-done';
        await page.waitForFunction(() => document.querySelectorAll('#dossier-list .dossier__card').length === 3, { timeout: 8000 });

        // 전체 필터로 복귀
        step = 'click-filter-all';
        await page.click('#dossier-filter-all');
        step = 'wait-filter-all';
        await page.waitForFunction(() => document.querySelectorAll('#dossier-list .dossier__card').length === 9, { timeout: 8000 });

        // AC-4: 상세 패널 선택 (첫 카드: "상태 대시보드 렌더링")
        step = 'click-first-card';
        await page.locator('#dossier-list .dossier__card').first().click();
        step = 'wait-detail-panel-open';
        await page.waitForSelector('#dossier-detail-panel:not([hidden])', { timeout: 8000 });
        step = 'check-detail-title';
        const detailTitle = await page.textContent('.dossier__detail-title');
        if (!detailTitle || !detailTitle.includes('상태 대시보드 렌더링')) {
          throw new Error('상세 패널 제목 불일치: ' + detailTitle);
        }

        // 상세 패널 닫기
        step = 'click-detail-close';
        await page.click('.dossier__detail-close');
        step = 'wait-detail-panel-closed';
        await page.waitForSelector('#dossier-detail-panel', { state: 'hidden', timeout: 8000 });

        // AC-6: 오류 재현 → error 상태 + 카드/진행 표시 초기화
        step = 'check-fail-toggle';
        await page.check('#dossier-fail-toggle');
        step = 'click-run-for-error';
        await page.click('#dossier-run');
        step = 'wait-error-state';
        await page.waitForSelector('#dossier-status[data-state="error"]', { timeout: 8000 });
        step = 'check-error-card-count';
        const errorCardCount = await page.locator('#dossier-list .dossier__card').count();
        if (errorCardCount !== 0) throw new Error('error 상태에서 카드가 남아있음: ' + errorCardCount);
        step = 'check-error-progress-text';
        const progressAtError = (await page.textContent('#dossier-progress')).trim();
        if (progressAtError !== '완료 0 · 진행 0 · 대기 0') {
          throw new Error('error 후 진행 표시가 초기화되지 않음: ' + progressAtError);
        }

        // AC-6: 실패 후 복원 — 토글 해제 + 재실행 시 초기값으로 복귀(후조건 불변식)
        step = 'uncheck-fail-toggle';
        await page.uncheck('#dossier-fail-toggle');
        step = 'click-run-for-restore';
        await page.click('#dossier-run');
        step = 'wait-ready-state-restored';
        await page.waitForSelector('#dossier-status[data-state="ready"]', { timeout: 8000 });
        step = 'check-restored-count';
        const restoredCount = await page.locator('#dossier-list .dossier__card').count();
        if (restoredCount !== 9) throw new Error('복원 후 카드 수 불일치: ' + restoredCount);
        step = 'check-restored-filter-all';
        const restoredAllSelected = await page.getAttribute('#dossier-filter-all', 'aria-selected');
        if (restoredAllSelected !== 'true') throw new Error('복원 후 전체 필터 선택 상태 불일치');

        step = 'check-console-errors';
        if (consoleErrors.length) throw new Error('브라우저 콘솔 에러: ' + consoleErrors.join(', '));
      } catch (e) {
        throw new Error('[step=' + step + '] ' + (e && e.message ? e.message : String(e)));
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
        label: '필터·상세 패널·오류 복원 시나리오',
        scriptText,
        timeoutMs: 30000,
      }),
    });

    const body = await res.json();
    assert.equal(res.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(body)}`);
    assert.equal(body.passed, true, `e2e 시나리오 실패: ${body.stdout || JSON.stringify(body)}`);
  }
);
