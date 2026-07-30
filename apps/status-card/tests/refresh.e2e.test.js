// BF-1264 — status-card 새로고침 UX E2E 회귀 가드.
// TS-1(docs/plans/status-card-refresh-BF-1259.md §8)과 RWP-TEST 수용 기준을
// 실제 브라우저(e2e-runner)로 검증한다:
//   - 로딩 중 중복 클릭 방지(aria-busy + disabled)
//   - 성공 시 마지막 갱신 시각·성공 상태 노출
//   - 실패 시 원인 요약(에러 텍스트)·재시도 액션 노출
//   - 실패 후 재시도 → 복원(주 실행 control 재활성화, 성공 상태 복귀)
//
// dev(BF-1261)의 기본 부트스트랩 배선은 refreshFn 이 항상 성공하므로 실제 클릭만으로는
// error 분기를 만들 수 없다. dev 가 재사용/테스트 목적으로 노출한
// window.StatusCardRefresh.createStatusCardRefresh(공개 팩토리, index.d.ts 의
// StatusCardRefreshOptions.refreshFn 계약)를 사용해 실패 시나리오를 브라우저 안에서
// 구성한다 — 정적 mockup 의 내부 로직을 재작성하지 않고, 공개된 확장 지점만 사용한다.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'status-card';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// serveRoot 아래 정적 파일만 노출하는 self-contained 서버. listen(0) 으로 포트 자동 할당.
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

let server;
let baseUrl;
let e2eAvailable = true;
let skipReason = null;

before(async () => {
  const started = await startStaticServer('apps/status-card');
  server = started.server;
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  baseUrl = `http://${host}:${started.port}/`;

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

after(() => {
  server?.close();
});

async function runE2E({ label, scriptText, timeoutMs = 30000 }) {
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
    body: JSON.stringify({ url: baseUrl, label, scriptText, timeoutMs }),
  });
  return res.json();
}

test(
  'BF-1264 새로고침 성공 흐름 — loading 중복 클릭 차단 + 성공 상태/갱신 시각',
  { skip: _brixOutOfScope },
  async (t) => {
    if (!e2eAvailable) {
      t.skip(skipReason);
      return;
    }
    const scriptText = `
      const before = await page.evaluate(() => ({
        text: document.getElementById('status-card-status-text').textContent.trim(),
        disabled: document.getElementById('status-card-refresh-button').disabled,
      }));
      if (before.text !== '최근 상태를 확인하려면 새로고침하세요.') throw new Error('idle text mismatch: ' + before.text);
      if (before.disabled) throw new Error('idle button should be enabled');

      const loading = await page.evaluate(() => {
        const btn = document.getElementById('status-card-refresh-button');
        btn.click();
        const snap = {
          text: document.getElementById('status-card-status-text').textContent.trim(),
          ariaBusy: btn.getAttribute('aria-busy'),
          disabled: btn.disabled,
          loadingClass: btn.classList.contains('status-card__refresh--loading'),
        };
        // 로딩 중 중복 클릭 — disabled 인 버튼에 대한 네이티브 click() 은 활성화 동작을 일으키지 않아야 함.
        btn.click();
        const afterDup = {
          text: document.getElementById('status-card-status-text').textContent.trim(),
          disabled: btn.disabled,
        };
        return { snap, afterDup };
      });
      if (loading.snap.text !== '상태를 불러오는 중…') throw new Error('loading text mismatch: ' + loading.snap.text);
      if (loading.snap.ariaBusy !== 'true') throw new Error('aria-busy not true during loading');
      if (!loading.snap.disabled) throw new Error('button should be disabled during loading');
      if (!loading.snap.loadingClass) throw new Error('loading class missing');
      if (loading.afterDup.text !== loading.snap.text) throw new Error('duplicate click changed status text: ' + loading.afterDup.text);
      if (!loading.afterDup.disabled) throw new Error('duplicate click re-enabled button unexpectedly');

      await new Promise((r) => setTimeout(r, 300));

      const after = await page.evaluate(() => {
        const btn = document.getElementById('status-card-refresh-button');
        return {
          text: document.getElementById('status-card-status-text').textContent.trim(),
          lastUpdatedHidden: document.getElementById('status-card-last-updated').hidden,
          lastUpdatedText: document.getElementById('status-card-last-updated').textContent.trim(),
          disabled: btn.disabled,
          ariaBusy: btn.getAttribute('aria-busy'),
          loadingClass: btn.classList.contains('status-card__refresh--loading'),
        };
      });
      if (after.text !== '상태를 방금 갱신했습니다.') throw new Error('success text mismatch: ' + after.text);
      if (after.lastUpdatedHidden) throw new Error('last-updated should be visible after success');
      if (!/^\\d{2}:\\d{2}:\\d{2} 기준$/.test(after.lastUpdatedText)) throw new Error('last-updated format mismatch: ' + after.lastUpdatedText);
      if (after.disabled) throw new Error('button should be re-enabled after success');
      if (after.ariaBusy !== 'false') throw new Error('aria-busy should be false after success');
      if (after.loadingClass) throw new Error('loading class should be removed after success');
    `;
    const result = await runE2E({
      label: '새로고침 성공 — loading 중복클릭 차단 + 성공상태/갱신시각',
      scriptText,
    });
    assert.equal(result.ok, true, `e2e-runner call 실패: ${JSON.stringify(result)}`);
    assert.equal(result.passed, true, `시나리오 실패: ${result.stdout}`);
  },
);

test(
  'BF-1264 새로고침 실패 흐름 — 원인 요약/재시도 노출 + 재시도 후 복원',
  { skip: _brixOutOfScope },
  async (t) => {
    if (!e2eAvailable) {
      t.skip(skipReason);
      return;
    }
    const scriptText = `
      // dev 부트스트랩 기본 배선은 refreshFn 이 항상 성공하므로, 공개 팩토리로
      // 실패 가능한 컨트롤러를 재구성한다. 기존 버튼/재시도 노드는 clone 하여 교체함으로써
      // bootstrap 컨트롤러의 click 리스너(내부 참조 비공개라 destroy() 불가)를 제거한다.
      const setup = await page.evaluate(() => {
        if (!window.StatusCardRefresh || typeof window.StatusCardRefresh.createStatusCardRefresh !== 'function') {
          return { ok: false, reason: 'StatusCardRefresh factory not exposed on window' };
        }
        const oldButton = document.getElementById('status-card-refresh-button');
        const oldRetry = document.getElementById('status-card-retry-action');
        const newButton = oldButton.cloneNode(true);
        const newRetry = oldRetry.cloneNode(true);
        oldButton.replaceWith(newButton);
        oldRetry.replaceWith(newRetry);

        const statusText = document.getElementById('status-card-status-text');
        const lastUpdated = document.getElementById('status-card-last-updated');

        let shouldFail = true;
        window.__brixSetShouldFail = (v) => { shouldFail = v; };
        window.StatusCardRefresh.createStatusCardRefresh(
          { refreshButton: newButton, statusText, lastUpdated, retryAction: newRetry },
          { refreshFn: () => (shouldFail ? Promise.reject(new Error('brix-test-forced-failure')) : Promise.resolve()) },
        );
        return { ok: true };
      });
      if (!setup.ok) throw new Error('setup failed: ' + setup.reason);

      await page.evaluate(() => document.getElementById('status-card-refresh-button').click());
      await new Promise((r) => setTimeout(r, 300));

      const errorState = await page.evaluate(() => {
        const btn = document.getElementById('status-card-refresh-button');
        const statusText = document.getElementById('status-card-status-text');
        const retryAction = document.getElementById('status-card-retry-action');
        return {
          text: statusText.textContent.trim(),
          errorClass: statusText.classList.contains('status-card__status-text--error'),
          retryHidden: retryAction.hidden,
          disabled: btn.disabled,
          ariaBusy: btn.getAttribute('aria-busy'),
        };
      });
      if (errorState.text !== '상태를 불러오지 못했습니다. 다시 시도해 주세요.') throw new Error('error text mismatch: ' + errorState.text);
      if (!errorState.errorClass) throw new Error('error text class missing');
      if (errorState.retryHidden) throw new Error('retry action should be visible after failure');
      if (errorState.disabled) throw new Error('refresh button should be re-enabled (restored) after failure');
      if (errorState.ariaBusy !== 'false') throw new Error('aria-busy should be false after failure (restored)');

      await page.evaluate(() => { window.__brixSetShouldFail(false); });

      const retryLoading = await page.evaluate(() => {
        const retryAction = document.getElementById('status-card-retry-action');
        retryAction.click();
        const btn = document.getElementById('status-card-refresh-button');
        const statusText = document.getElementById('status-card-status-text');
        return {
          text: statusText.textContent.trim(),
          ariaBusy: btn.getAttribute('aria-busy'),
          disabled: btn.disabled,
          retryHiddenDuringLoading: retryAction.hidden,
        };
      });
      if (retryLoading.text !== '상태를 불러오는 중…') throw new Error('retry did not re-enter loading: ' + retryLoading.text);
      if (retryLoading.ariaBusy !== 'true') throw new Error('aria-busy not true during retry loading');
      if (!retryLoading.disabled) throw new Error('button should be disabled during retry loading');
      if (!retryLoading.retryHiddenDuringLoading) throw new Error('retry action should hide during loading');

      await new Promise((r) => setTimeout(r, 300));

      const recovered = await page.evaluate(() => {
        const btn = document.getElementById('status-card-refresh-button');
        const statusText = document.getElementById('status-card-status-text');
        const lastUpdated = document.getElementById('status-card-last-updated');
        const retryAction = document.getElementById('status-card-retry-action');
        return {
          text: statusText.textContent.trim(),
          errorClass: statusText.classList.contains('status-card__status-text--error'),
          lastUpdatedHidden: lastUpdated.hidden,
          lastUpdatedText: lastUpdated.textContent.trim(),
          retryHidden: retryAction.hidden,
          disabled: btn.disabled,
        };
      });
      if (recovered.text !== '상태를 방금 갱신했습니다.') throw new Error('recovered success text mismatch: ' + recovered.text);
      if (recovered.errorClass) throw new Error('error class should be removed after recovery');
      if (recovered.lastUpdatedHidden) throw new Error('last-updated should show after recovery');
      if (!/^\\d{2}:\\d{2}:\\d{2} 기준$/.test(recovered.lastUpdatedText)) throw new Error('recovered last-updated format mismatch: ' + recovered.lastUpdatedText);
      if (!recovered.retryHidden) throw new Error('retry action should hide after success');
      if (recovered.disabled) throw new Error('button should be enabled after recovery');
    `;
    const result = await runE2E({
      label: '새로고침 실패 — 원인요약/재시도 노출 → 재시도 후 성공 복원',
      scriptText,
    });
    assert.equal(result.ok, true, `e2e-runner call 실패: ${JSON.stringify(result)}`);
    assert.equal(result.passed, true, `시나리오 실패: ${result.stdout}`);
  },
);
