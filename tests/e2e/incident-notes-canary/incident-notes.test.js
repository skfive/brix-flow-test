// BF-1156 — 장애 메모 협업 SPA(/demo/incident-notes-canary) E2E 회귀 가드.
// dev 산출물(demo/incident-notes-canary/**)은 read-only 참조만 한다.
// fixtures.js / notes.js 값을 하드코딩하지 않고 동적 import 해 실제 로직을 oracle 로 사용한다
// (dev 유닛 테스트가 이미 검증한 storage/정렬/검증 로직 내부 재검증은 하지 않음 — 여기선 브라우저 렌더/인터랙션만 검증).

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'incident-notes';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const APP_DIR = path.join(REPO_ROOT, 'demo/incident-notes-canary');

// dev 산출물을 ground truth 로 동적 import — fixture/로직 값을 하드코딩하지 않는다.
const { incident, currentUser, initialNotes } = await import(
  pathToFileURL(path.join(APP_DIR, 'fixtures.js')).href
);
const { deriveOverall, OVERALL_META, STATUS_META, STATUS_ORDER } = await import(
  pathToFileURL(path.join(APP_DIR, 'notes.js')).href
);

// module script 는 정확한 MIME 타입이 없으면 브라우저가 로드를 거부한다 (strict MIME 체크).
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
    // 0.0.0.0 바인딩 필수 — e2e-runner 컨테이너가 hostname 으로 도달.
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

let server;
let port;
let e2eAvailable = true;
let skipReason = null;

test.before(async () => {
  if (_brixOutOfScope) return; // 다른 module 시나리오 — 서버 기동 불필요

  if (process.env.BRIX_E2E_SKIP === '1') {
    e2eAvailable = false;
    skipReason = 'BRIX_E2E_SKIP=1 — CI 결정성 가드';
    return;
  }

  const started = await startStaticServer(REPO_ROOT); // route_mapping: root-relative-static, serve_root: "."
  server = started.server;
  port = started.port;

  try {
    const probe = await fetch('http://e2e-runner:3030/health', {
      signal: AbortSignal.timeout(2000),
    });
    if (!probe.ok) {
      e2eAvailable = false;
      skipReason = `e2e-runner unhealthy (${probe.status}) — skip`;
    }
  } catch (err) {
    e2eAvailable = false;
    skipReason = `e2e-runner 도달 불가 (${err.message}) — skip`;
  }
});

test.after(() => {
  if (server) server.close();
});

function pageUrl() {
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  return `http://${host}:${port}/demo/incident-notes-canary/`;
}

async function callE2E({ label, scriptText, timeoutMs = 30000 }) {
  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) {
    throw new Error('worker-injected run identity missing (BRIX_RUN_ID/BRIX_JIRA_KEY)');
  }
  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({ url: pageUrl(), label, scriptText, timeoutMs }),
  });
  return res.json();
}

const WAIT_READY_SCRIPT = `
  await page.waitForFunction(() => {
    const el = document.getElementById('incident-notes');
    return el && el.dataset.viewState !== 'loading';
  }, { timeout: 5000 });
`;

// ---------------------------------------------------------------------------
// 시나리오 1 — 진입 렌더 + fixture 로드 (AC1)
// ---------------------------------------------------------------------------
test('BF-1156 — 진입 렌더 + fixture 로드', { skip: _brixOutOfScope }, async (t) => {
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }

  const expectedViewState = initialNotes.length === 0 ? 'empty' : 'ready';
  const expectedOverall = deriveOverall(initialNotes);
  const expectedTitle = `장애 메모 · ${incident.title}`;
  const expectHidden = expectedOverall ? 'false' : 'true';
  const overallLabel = expectedOverall ? OVERALL_META[expectedOverall]?.label ?? '' : '';

  const script = `
    ${WAIT_READY_SCRIPT}

    const viewState = await page.evaluate(() => document.getElementById('incident-notes').dataset.viewState);
    if (viewState !== ${JSON.stringify(expectedViewState)}) {
      throw new Error('view-state mismatch: ' + viewState + ' expected ${expectedViewState}');
    }

    const title = await page.locator('#in-title').textContent();
    if (title !== ${JSON.stringify(expectedTitle)}) {
      throw new Error('title mismatch: ' + title);
    }

    const count = await page.locator('#in-timeline .in-note').count();
    if (count !== ${initialNotes.length}) {
      throw new Error('timeline count mismatch: ' + count + ' expected ${initialNotes.length}');
    }

    const overallHidden = await page.locator('#in-overall').isHidden();
    if (String(overallHidden) !== ${JSON.stringify(expectHidden)}) {
      throw new Error('overall hidden mismatch: ' + overallHidden);
    }

    ${expectedOverall
      ? `const overallText = await page.locator('#in-overall').textContent();
    if (!overallText.includes(${JSON.stringify(overallLabel)})) {
      throw new Error('overall label mismatch: ' + overallText);
    }`
      : ''}
  `;

  const result = await callE2E({
    label: 'BF-1156 진입 렌더 + fixture 로드',
    scriptText: script,
  });
  assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
  assert.equal(result.passed, true, `시나리오 실패: ${result.stdout}`);
});

// ---------------------------------------------------------------------------
// 시나리오 2 — 메모 작성 + 상태 전환 → local state 갱신 (AC2)
// ---------------------------------------------------------------------------
test('BF-1156 — 메모 작성 + 상태 전환 local state 갱신', { skip: _brixOutOfScope }, async (t) => {
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }

  const noteText = '점검 결과를 확인하고 재기동을 진행했습니다.';
  const chosenStatus = STATUS_ORDER.find((s) => s !== 'in-progress') || STATUS_ORDER[0];
  const statusLabel = STATUS_META[chosenStatus]?.label ?? '';
  const beforeCount = initialNotes.length;

  const script = `
    ${WAIT_READY_SCRIPT}

    const beforeCount = await page.locator('#in-timeline .in-note').count();
    if (beforeCount !== ${beforeCount}) {
      throw new Error('unexpected initial count: ' + beforeCount);
    }

    await page.locator('#in-text').fill(${JSON.stringify(noteText)});
    await page.locator('#in-status-select').selectOption(${JSON.stringify(chosenStatus)});
    await page.locator('#in-submit').click();

    await page.waitForFunction((expected) => {
      const list = document.getElementById('in-timeline');
      return list && list.querySelectorAll('.in-note').length === expected;
    }, ${beforeCount + 1}, { timeout: 5000 });

    const afterCount = await page.locator('#in-timeline .in-note').count();
    if (afterCount !== ${beforeCount + 1}) {
      throw new Error('note not added: ' + afterCount);
    }

    const lastNote = page.locator('#in-timeline .in-note').last();
    const lastText = await lastNote.locator('.in-note__text').textContent();
    if (lastText !== ${JSON.stringify(noteText)}) {
      throw new Error('note text mismatch: ' + lastText);
    }

    const lastAuthor = await lastNote.locator('.in-note__author').textContent();
    if (!lastAuthor.includes(${JSON.stringify(currentUser.name)})) {
      throw new Error('author mismatch: ' + lastAuthor);
    }

    const badgeLabel = await lastNote.locator('.in-status').getAttribute('aria-label');
    if (!badgeLabel || !badgeLabel.includes(${JSON.stringify(statusLabel)})) {
      throw new Error('status badge mismatch: ' + badgeLabel);
    }

    const textValue = await page.locator('#in-text').inputValue();
    if (textValue !== '') {
      throw new Error('composer text not reset: ' + textValue);
    }
    const selectValue = await page.locator('#in-status-select').inputValue();
    if (selectValue !== 'in-progress') {
      throw new Error('composer status not reset: ' + selectValue);
    }
    const activeId = await page.evaluate(() => document.activeElement && document.activeElement.id);
    if (activeId !== 'in-text') {
      throw new Error('focus not returned to textarea: ' + activeId);
    }
  `;

  const result = await callE2E({
    label: 'BF-1156 메모 작성 + 상태 전환 local state 갱신',
    scriptText: script,
  });
  assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
  assert.equal(result.passed, true, `시나리오 실패: ${result.stdout}`);
});

// ---------------------------------------------------------------------------
// 시나리오 3 — 유효성 검증: 빈 입력 제출 시 local state 불변 (AC2 회귀 보호)
// ---------------------------------------------------------------------------
test('BF-1156 — 빈 입력 제출 시 local state 불변', { skip: _brixOutOfScope }, async (t) => {
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }

  const beforeCount = initialNotes.length;

  const script = `
    ${WAIT_READY_SCRIPT}

    const beforeCount = await page.locator('#in-timeline .in-note').count();
    const beforeViewState = await page.evaluate(() => document.getElementById('incident-notes').dataset.viewState);

    await page.locator('#in-text').fill('');
    await page.locator('#in-submit').click();

    await page.waitForFunction(() => {
      const err = document.getElementById('in-text-error');
      return err && err.textContent && err.textContent.trim().length > 0;
    }, { timeout: 5000 });

    const afterCount = await page.locator('#in-timeline .in-note').count();
    if (afterCount !== beforeCount) {
      throw new Error('invalid submit mutated timeline: ' + afterCount + ' expected ' + beforeCount);
    }
    if (afterCount !== ${beforeCount}) {
      throw new Error('unexpected count vs fixture: ' + afterCount);
    }

    const afterViewState = await page.evaluate(() => document.getElementById('incident-notes').dataset.viewState);
    if (afterViewState !== beforeViewState) {
      throw new Error('view-state changed on invalid submit: ' + afterViewState);
    }

    const ariaInvalid = await page.locator('#in-text').getAttribute('aria-invalid');
    if (ariaInvalid !== 'true') {
      throw new Error('aria-invalid not set: ' + ariaInvalid);
    }
  `;

  const result = await callE2E({
    label: 'BF-1156 빈 입력 제출 시 local state 불변',
    scriptText: script,
  });
  assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
  assert.equal(result.passed, true, `시나리오 실패: ${result.stdout}`);
});
