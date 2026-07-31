// tester 회귀 가드 — Provider 실행 준비 상태 카드(BF-1367 frozen UI 계약)의
// 상태 판정(ready/blocked/unset/error)과 상태별 화면 텍스트가 silent 하게
// 깨지지 않도록 보호한다.
//
// dev 가 이미 검증한 영역(재작성 금지):
//   provider-readiness/tests/readiness-state.test.js 가 resolveReadiness()
//   순수 판정 함수(5개 상태 분기·statusText/statusClass/제어 flag)를 이미 커버.
//
// 이 파일이 새로 추가하는 영역:
//   1) initReadinessCard() 가 resolveReadiness() 결과를 실제 DOM(mode/provider/
//      status/settingsLink/retry)에 정확히 옮겨 쓰는지 — dev 테스트는 순수 함수
//      반환값만 확인하고 DOM 반영은 검증하지 않았다.
//   2) index.html/styles.css 의 frozen id·status class·design token 이
//      존재하는지에 대한 정적 fact.
//   3) 실 브라우저에서만 확인 가능한 인터랙션(초기 렌더, retry 클릭 후 재조회) —
//      e2e-runner 로 검증.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { initReadinessCard } from '../src/readiness-card.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = path.resolve(__dirname, '..');

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'readiness';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// ---------------------------------------------------------------------------
// 1) 정적 계약 fact — index.html / styles.css 의 frozen id·class·token 존재
// ---------------------------------------------------------------------------

test('frozen 계약(§5.2) — index.html 에 6개 DOM id 가 존재', { skip: _brixOutOfScope }, () => {
  const html = fs.readFileSync(path.join(MODULE_ROOT, 'index.html'), 'utf-8');
  for (const id of [
    'readiness-card',
    'readiness-mode',
    'readiness-provider',
    'readiness-status',
    'readiness-settings-link',
    'readiness-retry',
  ]) {
    assert.ok(html.includes(`id="${id}"`), `#${id} 가 index.html 에 없음 — DOM 계약 회귀`);
  }
});

test('frozen 계약(§5.3/§5.5) — styles.css 에 상태 modifier class 3종 + 색상 token 존재', { skip: _brixOutOfScope }, () => {
  const css = fs.readFileSync(path.join(MODULE_ROOT, 'styles.css'), 'utf-8');
  for (const cls of [
    '.readiness-card__status--ready',
    '.readiness-card__status--blocked',
    '.readiness-card__status--unset',
  ]) {
    assert.ok(css.includes(cls), `${cls} 가 styles.css 에 없음 — 상태 표현 회귀`);
  }
  assert.ok(css.includes('--color-status-ready: #16a34a'), 'ready token 값 회귀');
  assert.ok(css.includes('--color-status-blocked: #dc2626'), 'blocked token 값 회귀');
  assert.ok(css.includes('--color-status-unset: #6b7280'), 'unset token 값 회귀');
});

// ---------------------------------------------------------------------------
// 2) DOM 통합 가드 — initReadinessCard() 가 상태별 텍스트/class/control 을
//    실제 DOM에 정확히 반영하는지 (fake DOM — jsdom 미설치 환경 대응)
// ---------------------------------------------------------------------------

class FakeClassList {
  constructor(el) {
    this.el = el;
  }
  add(...names) {
    names.forEach((n) => this.el._classes.add(n));
  }
  remove(...names) {
    names.forEach((n) => this.el._classes.delete(n));
  }
  toggle(name, force) {
    if (force === undefined) {
      this.el._classes.has(name) ? this.el._classes.delete(name) : this.el._classes.add(name);
    } else if (force) {
      this.el._classes.add(name);
    } else {
      this.el._classes.delete(name);
    }
  }
  contains(name) {
    return this.el._classes.has(name);
  }
}

function makeEl() {
  const el = { textContent: '', hidden: false, disabled: false, _classes: new Set(), _listeners: {} };
  el.classList = new FakeClassList(el);
  el.addEventListener = (type, fn) => {
    el._listeners[type] = fn;
  };
  return el;
}

function makeFakeCard() {
  const els = {
    'readiness-mode': makeEl(),
    'readiness-provider': makeEl(),
    'readiness-status': makeEl(),
    'readiness-settings-link': makeEl(),
    'readiness-retry': makeEl(),
  };
  const doc = {
    querySelector(sel) {
      return els[sel.replace('#', '')] || null;
    },
  };
  return { els, doc };
}

test('DOM 통합 — ready 상태: 준비됨 텍스트 + ready class + control 모두 숨김', { skip: _brixOutOfScope }, async () => {
  const { els, doc } = makeFakeCard();
  const loader = async () => ({ phase: 'loaded', providerSelected: true, policyAllowed: true, mode: 'auto', provider: 'openai' });
  const { run } = initReadinessCard({ document: doc, loader });
  await run();

  assert.equal(els['readiness-status'].textContent, '준비됨');
  assert.ok(els['readiness-status'].classList.contains('readiness-card__status--ready'));
  assert.equal(els['readiness-mode'].textContent, 'auto');
  assert.equal(els['readiness-provider'].textContent, 'openai');
  assert.equal(els['readiness-settings-link'].hidden, true);
  assert.equal(els['readiness-retry'].hidden, true);
});

test('DOM 통합 — blocked 상태: 차단 텍스트 + blocked class + 설정 링크 노출', { skip: _brixOutOfScope }, async () => {
  const { els, doc } = makeFakeCard();
  const loader = async () => ({ phase: 'loaded', providerSelected: true, policyAllowed: false, mode: 'auto', provider: 'openai' });
  const { run } = initReadinessCard({ document: doc, loader });
  await run();

  assert.equal(els['readiness-status'].textContent, '차단됨 — 설정 필요');
  assert.ok(els['readiness-status'].classList.contains('readiness-card__status--blocked'));
  assert.equal(els['readiness-settings-link'].hidden, false);
  assert.equal(els['readiness-retry'].hidden, true);
});

test('DOM 통합 — unset 상태: 미설정 텍스트 + unset class + mode/provider 도 미설정 표시', { skip: _brixOutOfScope }, async () => {
  const { els, doc } = makeFakeCard();
  const loader = async () => ({ phase: 'loaded', providerSelected: false });
  const { run } = initReadinessCard({ document: doc, loader });
  await run();

  assert.equal(els['readiness-status'].textContent, '설정되지 않음');
  assert.ok(els['readiness-status'].classList.contains('readiness-card__status--unset'));
  assert.equal(els['readiness-mode'].textContent, '설정되지 않음');
  assert.equal(els['readiness-provider'].textContent, '설정되지 않음');
  assert.equal(els['readiness-settings-link'].hidden, false);
  assert.equal(els['readiness-retry'].hidden, true);
});

test('DOM 통합 — error 상태: 오류 텍스트 + status class 없음 + retry 노출·재활성화', { skip: _brixOutOfScope }, async () => {
  const { els, doc } = makeFakeCard();
  const loader = async () => {
    throw new Error('조회 실패');
  };
  const { run } = initReadinessCard({ document: doc, loader });
  await run();

  assert.equal(els['readiness-status'].textContent, '상태를 불러오지 못했습니다');
  assert.equal(els['readiness-status'].classList.contains('readiness-card__status--ready'), false);
  assert.equal(els['readiness-status'].classList.contains('readiness-card__status--blocked'), false);
  assert.equal(els['readiness-status'].classList.contains('readiness-card__status--unset'), false);
  assert.equal(els['readiness-retry'].hidden, false);
  assert.equal(els['readiness-retry'].disabled, false, '조회 종료 후 readiness-retry 는 재활성화되어야 함');
});

// ---------------------------------------------------------------------------
// 3) 실 브라우저 E2E — 정적 가드로 확인 불가능한 실제 렌더링/클릭 인터랙션
// ---------------------------------------------------------------------------

// 확장자 → MIME 매핑. module script(.js)에 Content-Type 이 없으면 브라우저가
// strict MIME 체크로 로드를 거부한다 (Failed to load module script).
const MIME_BY_EXT = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

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

async function callE2eRunner({ url, label, scriptText, timeoutMs = 30000 }) {
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
    body: JSON.stringify({ url, label, scriptText, timeoutMs }),
  });
  return res.json();
}

test('E2E — ready 상태 실 브라우저 렌더링 (텍스트/class/control)', { skip: _brixOutOfScope }, async (t) => {
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

  const { server, port } = await startStaticServer(MODULE_ROOT);
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const scriptText = `
    await page.addInitScript(() => {
      window.__READINESS_DATA__ = { phase: 'loaded', providerSelected: true, policyAllowed: true, mode: 'auto', provider: 'openai' };
    });
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#readiness-status')?.textContent === '준비됨', { timeout: 5000 });
    const statusClass = await page.evaluate(() => document.querySelector('#readiness-status').className);
    if (!statusClass.includes('readiness-card__status--ready')) throw new Error('ready class missing: ' + statusClass);
    const modeText = await page.locator('#readiness-mode').innerText();
    if (modeText !== 'auto') throw new Error('mode text mismatch: ' + modeText);
    const providerText = await page.locator('#readiness-provider').innerText();
    if (providerText !== 'openai') throw new Error('provider text mismatch: ' + providerText);
    const settingsHidden = await page.locator('#readiness-settings-link').isHidden();
    const retryHidden = await page.locator('#readiness-retry').isHidden();
    if (!settingsHidden) throw new Error('settings link should stay hidden for ready state');
    if (!retryHidden) throw new Error('retry should stay hidden for ready state');
  `;

  const result = await callE2eRunner({
    url,
    label: 'BF-1369 ready 상태 렌더링 — 텍스트/class/control 노출',
    scriptText,
  });
  assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
  assert.equal(result.passed, true, `ready 시나리오 fail: ${result.stdout}`);
});

test('E2E — error 상태 retry 클릭 → 재조회 후 텍스트 유지 + control 재활성화', { skip: _brixOutOfScope }, async (t) => {
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

  const { server, port } = await startStaticServer(MODULE_ROOT);
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/`;

  const scriptText = `
    await page.addInitScript(() => {
      window.__readinessCallCount = 0;
      window.__READINESS_DATA__ = () => { window.__readinessCallCount++; throw new Error('boom'); };
    });
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#readiness-status')?.textContent === '상태를 불러오지 못했습니다', { timeout: 5000 });
    const retryHiddenBefore = await page.locator('#readiness-retry').isHidden();
    if (retryHiddenBefore) throw new Error('retry should be visible on error state');
    const countBefore = await page.evaluate(() => window.__readinessCallCount);
    await page.getByRole('button', { name: '상태 다시 확인' }).click();
    await page.waitForFunction((prev) => window.__readinessCallCount > prev, countBefore, { timeout: 5000 });
    const countAfter = await page.evaluate(() => window.__readinessCallCount);
    if (countAfter <= countBefore) throw new Error('retry click did not trigger a re-query: ' + countBefore + ' -> ' + countAfter);
    const finalText = await page.locator('#readiness-status').innerText();
    if (finalText !== '상태를 불러오지 못했습니다') throw new Error('expected error text to persist after retry, got: ' + finalText);
    const retryDisabled = await page.evaluate(() => document.querySelector('#readiness-retry').disabled);
    if (retryDisabled) throw new Error('retry should be re-enabled after a failed retry');
  `;

  const result = await callE2eRunner({
    url,
    label: 'BF-1369 error 상태 retry 클릭 — 재조회 후 재활성화',
    scriptText,
  });
  assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
  assert.equal(result.passed, true, `error/retry 시나리오 fail: ${result.stdout}`);
});
