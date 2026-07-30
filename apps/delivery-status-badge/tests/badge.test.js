// BF-1308 — 전달 상태 배지 회귀 가드
// 대상: apps/delivery-status-badge/src/badge.js (BF-1305, PR #359, merge_sha bf1f0193d)
// 목적: 배지 상태 전이(idle/loading/delivered/failed) 순서와 실패 후 복원(재조회 성공 시
//       delivered 로 회복, reset 시 idle 로 회복) 동작이 향후 silent break 되지 않도록 고정한다.
// dev 산출물에 별도 단위 테스트가 없어(exact_changed_files: index.html, badge.js) 공개 API
// (createBadgeController/STATE_LABELS) 를 blackbox 로 사용해 관찰 가능한 후조건만 검증한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createBadgeController, STATE_LABELS } from '../src/badge.js';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'badge';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// <script type="module"> 로드는 정확한 MIME type 없이는 브라우저가 거부한다.
const _BRIX_MIME_BY_EXT = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

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
      const contentType = _BRIX_MIME_BY_EXT[path.extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType }).end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

// 실제 DOM 없이 badge.js 가 사용하는 최소 표면(textContent/setAttribute/disabled)만 흉내낸다.
function createFakeRefs() {
  const root = {
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
  };
  const status = {
    textContent: '',
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
  };
  const refresh = { disabled: false };
  return { root, status, refresh };
}

test('초기 상태 — idle (대기 중), refresh 활성화', () => {
  const refs = createFakeRefs();
  const controller = createBadgeController(refs);

  assert.equal(controller.getState(), 'idle');
  assert.equal(refs.status.textContent, STATE_LABELS.idle);
  assert.equal(refs.root.attrs['data-state'], 'idle');
  assert.equal(refs.refresh.disabled, false);
});

test('상태 전이 1 — idle → loading → delivered (조회 성공)', async () => {
  const refs = createFakeRefs();
  const controller = createBadgeController(refs, {
    fetchStatus: () => Promise.resolve('delivered'),
  });

  const pending = controller.refresh();

  // 조회 시작 직후: loading 으로 즉시 전이 + refresh 비활성화
  assert.equal(controller.getState(), 'loading');
  assert.equal(refs.status.textContent, STATE_LABELS.loading);
  assert.equal(refs.root.attrs['data-state'], 'loading');
  assert.equal(refs.status.attrs['aria-busy'], 'true');
  assert.equal(refs.refresh.disabled, true);

  await pending;

  assert.equal(controller.getState(), 'delivered');
  assert.equal(refs.status.textContent, STATE_LABELS.delivered);
  assert.equal(refs.root.attrs['data-state'], 'delivered');
  assert.equal(refs.status.attrs['aria-busy'], 'false');
  assert.equal(refs.refresh.disabled, false);
});

test('상태 전이 2 — idle → loading → failed (조회 실패)', async () => {
  const refs = createFakeRefs();
  const controller = createBadgeController(refs, {
    fetchStatus: () => Promise.reject(new Error('network error')),
  });

  const pending = controller.refresh();
  assert.equal(controller.getState(), 'loading');

  await pending;

  assert.equal(controller.getState(), 'failed');
  assert.equal(refs.status.textContent, STATE_LABELS.failed);
  assert.equal(refs.root.attrs['data-state'], 'failed');
  assert.equal(refs.status.attrs['aria-busy'], 'false');
  // 실패 후에도 재조회할 수 있도록 control 은 재활성화되어야 한다.
  assert.equal(refs.refresh.disabled, false);
});

test('실패 후 복원 — failed 상태에서 재조회 성공 시 delivered 로 회복', async () => {
  const refs = createFakeRefs();
  let shouldFail = true;
  const controller = createBadgeController(refs, {
    fetchStatus: () => (shouldFail ? Promise.reject(new Error('boom')) : Promise.resolve('delivered')),
  });

  await controller.refresh();
  assert.equal(controller.getState(), 'failed');

  shouldFail = false;
  await controller.refresh();

  assert.equal(controller.getState(), 'delivered');
  assert.equal(refs.status.textContent, STATE_LABELS.delivered);
  assert.equal(refs.root.attrs['data-state'], 'delivered');
  assert.equal(refs.refresh.disabled, false);
});

test('실패 후 복원 — reset()/cancel() 호출 시 idle 로 회복하고 control 재활성화', async () => {
  const refs = createFakeRefs();
  const controller = createBadgeController(refs, {
    fetchStatus: () => Promise.reject(new Error('boom')),
  });

  await controller.refresh();
  assert.equal(controller.getState(), 'failed');

  const resetState = controller.reset();

  assert.equal(resetState, 'idle');
  assert.equal(controller.getState(), 'idle');
  assert.equal(refs.status.textContent, STATE_LABELS.idle);
  assert.equal(refs.root.attrs['data-state'], 'idle');
  assert.equal(refs.refresh.disabled, false);
});

test('상태 전이 3 — 진행 중(loading) 재조회 요청은 무시된다 (중복 실행 방지)', async () => {
  const refs = createFakeRefs();
  let calls = 0;
  const controller = createBadgeController(refs, {
    fetchStatus: () => {
      calls += 1;
      return Promise.resolve('delivered');
    },
  });

  const first = controller.refresh();
  const second = controller.refresh(); // loading 중 재호출 — fetchStatus 재실행되면 안 됨

  await Promise.all([first, second]);

  assert.equal(calls, 1);
  assert.equal(controller.getState(), 'delivered');
});

test('상태 전이 4 — 취소(cancel)된 진행 중 요청의 응답은 최종 상태에 반영되지 않는다', async () => {
  const refs = createFakeRefs();
  let resolveFetch;
  const controller = createBadgeController(refs, {
    fetchStatus: () => new Promise((resolve) => { resolveFetch = resolve; }),
  });

  const pending = controller.refresh();
  assert.equal(controller.getState(), 'loading');

  // badge.js 는 fetchStatus() 호출을 마이크로태스크 1틱 뒤로 미룬다(Promise.resolve().then(...)).
  // resolveFetch 가 실제로 대입될 때까지 한 틱 양보한 뒤 취소한다.
  await Promise.resolve();

  controller.cancel(); // 진행 중 요청 무효화 + idle 로 복원
  assert.equal(controller.getState(), 'idle');

  resolveFetch('delivered'); // stale 응답 — 이미 취소되었으므로 상태에 영향 없어야 한다
  await pending;

  assert.equal(controller.getState(), 'idle');
  assert.equal(refs.status.textContent, STATE_LABELS.idle);
  assert.equal(refs.refresh.disabled, false);
});

// 실 브라우저 인터랙션 — 정적 mockup(index.html)을 서빙해 새로고침 버튼 클릭 후
// idle → delivered 전이(실제 DOM/이벤트 경로)를 검증한다. dev 유닛 테스트가 커버 못하는
// 브라우저 이벤트 바인딩(mountFromDocument, click 리스너) 회귀 가드.
test('E2E — 새로고침 버튼 클릭 시 idle → delivered 로 전이한다', { skip: _brixOutOfScope }, async (t) => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return;
  }

  let probe;
  try {
    probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
  } catch (err) {
    t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
    return;
  }
  if (!probe.ok) {
    t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
    return;
  }

  const { server, port } = await startStaticServer('apps/delivery-status-badge');
  t.after(() => server.close());

  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');

  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({
      url,
      label: '전달 상태 배지 — 새로고침 클릭 idle→delivered 전이',
      scriptText: `
        const before = await page.locator('#delivery-badge-status').innerText();
        if (before !== '대기 중') throw new Error('초기 라벨 불일치: ' + before);
        const beforeState = await page.evaluate(() => document.getElementById('delivery-badge-root').getAttribute('data-state'));
        if (beforeState !== 'idle') throw new Error('초기 data-state 불일치: ' + beforeState);

        await page.getByRole('button', { name: '상태 새로고침' }).click();

        await page.waitForFunction(
          () => document.getElementById('delivery-badge-root')?.getAttribute('data-state') === 'delivered',
          null,
          { timeout: 5000 }
        );

        const label = await page.locator('#delivery-badge-status').innerText();
        if (label !== '전달 완료') throw new Error('전이 후 라벨 불일치: ' + label);

        const disabled = await page.evaluate(() => document.getElementById('delivery-badge-refresh').disabled);
        if (disabled) throw new Error('delivered 전이 후 refresh 버튼이 비활성 상태로 남아있음');
      `,
      timeoutMs: 30000,
    }),
  });

  const body = await res.json();
  assert.equal(res.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(body)}`);
  assert.equal(body.passed, true, `E2E 시나리오 실패: ${body.stdout || JSON.stringify(body)}`);
});
