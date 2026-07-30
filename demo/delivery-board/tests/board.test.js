// 전달 상태 보드 회귀 가드 — BF-1277
// 검증 대상: demo/delivery-board/src/board.js (dev: BF-1274, PR #353, merge_sha: 8b17921)
//
// 보호 범위 (frozen ui-contract@v1):
// - 상태 전이: idle → loading → ready (성공) / idle → loading → error (실패)
// - 실패 후조건: board-refresh 를 다시 사용 가능하게 재활성화 (핵심 회귀 대상)
// - reset() 초기화: idle 복귀 + 진행 표시 초기화 + control 재활성화
// - UI 마크업 contract: state 전이가 의존하는 필수 DOM id 존재

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initBoard, ROLE_MODEL } from '../src/board.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'board';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// board.js 는 documentRef 주입을 지원하도록 설계되어 있어(테스트 친화),
// 실 브라우저 DOM 없이도 상태 전이 로직을 그대로 실행 검증할 수 있다.
function createFakeDocument() {
  function makeElement(tag) {
    const el = {
      tagName: tag,
      className: '',
      textContent: '',
      dataset: {},
      hidden: false,
      disabled: false,
      children: [],
      attributes: {},
      append(...nodes) {
        el.children.push(...nodes);
      },
      replaceChildren(...nodes) {
        el.children = [...nodes];
      },
      setAttribute(name, value) {
        el.attributes[name] = value;
      },
      getAttribute(name) {
        return el.attributes[name] ?? null;
      },
      addEventListener() {
        // refresh() 는 테스트에서 직접 호출하므로 리스너 등록은 수행만 하고 무시한다.
      },
      querySelector(selector) {
        if (selector === '[data-role="status-message"]') {
          return el._messageEl ?? null;
        }
        return null;
      },
    };
    return el;
  }

  const root = makeElement('section');
  const revisionEl = makeElement('p');
  const roleListEl = makeElement('ul');
  const refreshEl = makeElement('button');
  const messageEl = makeElement('p');
  messageEl.hidden = true;
  root._messageEl = messageEl;

  const elementsById = {
    'board-root': root,
    'board-revision': revisionEl,
    'board-role-list': roleListEl,
    'board-refresh': refreshEl,
  };

  const documentRef = {
    getElementById(id) {
      return elementsById[id] ?? null;
    },
    createElement(tag) {
      return makeElement(tag);
    },
  };

  return { documentRef, root, revisionEl, roleListEl, refreshEl, messageEl };
}

test('AC — refresh 성공 시 idle → loading → ready 상태 전이', async () => {
  const { documentRef, root, revisionEl, roleListEl, refreshEl, messageEl } =
    createFakeDocument();
  const board = initBoard(documentRef, {
    loader: () => Promise.resolve({ revision: 'rev-test', roles: ROLE_MODEL }),
  });

  assert.equal(root.dataset.state, 'idle', '초기 상태는 idle 이어야 한다');

  const pending = board.refresh();
  assert.equal(root.dataset.state, 'loading', 'refresh 호출 직후 loading 으로 전이해야 한다');
  assert.equal(refreshEl.disabled, true, 'loading 중에는 board-refresh 가 비활성화되어야 한다');

  await pending;

  assert.equal(root.dataset.state, 'ready', '로더 성공 시 ready 로 전이해야 한다');
  assert.equal(refreshEl.disabled, false, 'ready 전이 후 board-refresh 가 다시 활성화되어야 한다');
  assert.equal(revisionEl.textContent, '리비전: rev-test');
  assert.equal(roleListEl.children.length, ROLE_MODEL.length);
  assert.equal(messageEl.hidden, true);
});

test('AC — refresh 실패 시 error 전이 + board-refresh 재활성화 회귀 가드', async () => {
  const { documentRef, root, refreshEl, messageEl, roleListEl } = createFakeDocument();
  let shouldFail = true;
  const board = initBoard(documentRef, {
    loader: () =>
      shouldFail
        ? Promise.reject(new Error('network fail'))
        : Promise.resolve({ revision: 'rev-retry', roles: ROLE_MODEL }),
  });

  const pending = board.refresh();
  assert.equal(root.dataset.state, 'loading');
  assert.equal(refreshEl.disabled, true);

  await pending;

  assert.equal(root.dataset.state, 'error', '로더 실패 시 error 로 전이해야 한다');
  // 핵심 회귀 가드: 실패 후에도 board-refresh 가 다시 사용 가능해야 한다
  assert.equal(
    refreshEl.disabled,
    false,
    '실패 후 board-refresh 가 재활성화되지 않으면 사용자가 재시도할 수 없다 (회귀)',
  );
  assert.equal(messageEl.hidden, false);
  assert.equal(messageEl.textContent, '상태를 불러오지 못했습니다. 다시 시도해 주세요.');
  assert.equal(roleListEl.children.length, 0, '실패 후 진행 표시는 초기화되어야 한다');

  // 재활성화가 플래그뿐 아니라 실제로 재시도 가능함을 증명한다.
  shouldFail = false;
  await board.refresh();
  assert.equal(root.dataset.state, 'ready', '재활성화된 board-refresh 로 재시도하면 ready 로 전이해야 한다');
  assert.equal(refreshEl.disabled, false);
});

test('AC — reset() 은 idle 로 복귀하고 board-refresh 를 재활성화한다', async () => {
  const { documentRef, root, refreshEl, roleListEl, revisionEl } = createFakeDocument();
  const board = initBoard(documentRef, {
    loader: () => Promise.resolve({ revision: 'rev-x', roles: ROLE_MODEL }),
  });

  await board.refresh();
  assert.equal(root.dataset.state, 'ready');

  board.reset();

  assert.equal(root.dataset.state, 'idle');
  assert.equal(refreshEl.disabled, false);
  assert.equal(roleListEl.children.length, 0);
  assert.equal(revisionEl.textContent, '리비전: —');
});

test('UI 마크업 contract — 상태 전이가 의존하는 필수 DOM id 존재', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');
  assert.ok(html.includes('id="board-root"'), '#board-root 없음');
  assert.ok(html.includes('id="board-revision"'), '#board-revision 없음');
  assert.ok(html.includes('id="board-role-list"'), '#board-role-list 없음');
  assert.ok(html.includes('id="board-refresh"'), '#board-refresh 없음');
});

// ---------------------------------------------------------------------------
// 실 브라우저 E2E — 정적 가드로 검증 어려운 클릭 인터랙션 + 실제 DOM 렌더링 확인.
// serve root 밖 접근을 차단하는 self-contained 정적 서버를 같은 process 에서 기동한다.
// ---------------------------------------------------------------------------

// 확장자 → MIME 타입. type="module" 스크립트는 브라우저의 strict MIME 검사를 통과해야
// 로드되므로 Content-Type 을 명시하지 않으면 module script 로딩 자체가 차단된다.
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
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
      const contentType = MIME_TYPES[path.extname(target)] ?? 'application/octet-stream';
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

test(
  'E2E — 초기 idle 상태에서 board-refresh 클릭 시 ready 전이 및 역할 목록 렌더링',
  { skip: _brixOutOfScope },
  async (t) => {
    if (process.env.BRIX_E2E_SKIP === '1') {
      t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
      return;
    }
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

    const { server, port } = await startStaticServer(path.join(__dirname, '..'));
    t.after(() => server.close());
    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/`;

    const result = await callE2eRunner({
      url,
      label: '전달 상태 보드 — idle 초기상태 + 클릭 후 ready 전이',
      scriptText: `
        const initialState = await page.evaluate(() => document.querySelector('#board-root').dataset.state);
        const initialCount = await page.evaluate(() => document.querySelectorAll('#board-role-list li').length);
        if (initialState !== 'idle') throw new Error('초기 상태가 idle 아님: ' + initialState);
        if (initialCount !== 0) throw new Error('초기 role 목록이 비어있지 않음: ' + initialCount);

        await page.getByRole('button', { name: '전달 상태 새로고침' }).click();
        await page.waitForSelector('#board-role-list li');

        const state = await page.evaluate(() => document.querySelector('#board-root').dataset.state);
        const count = await page.evaluate(() => document.querySelectorAll('#board-role-list li').length);
        const revision = await page.evaluate(() => document.querySelector('#board-revision').textContent);
        if (state !== 'ready') throw new Error('클릭 후 상태가 ready 아님: ' + state);
        if (count !== 5) throw new Error('역할 목록 개수 불일치: ' + count);
        if (!revision.includes('rev-1')) throw new Error('리비전 텍스트 불일치: ' + revision);
      `,
    });

    assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
    assert.equal(result.passed, true, `idle→ready 시나리오 실패: ${result.stdout}`);
  },
);

test(
  'E2E — board-refresh 클릭 후 재조회 완료 시 control 재활성화 회귀 가드',
  { skip: _brixOutOfScope },
  async (t) => {
    if (process.env.BRIX_E2E_SKIP === '1') {
      t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
      return;
    }
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

    const { server, port } = await startStaticServer(path.join(__dirname, '..'));
    t.after(() => server.close());
    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/`;

    const result = await callE2eRunner({
      url,
      label: '전달 상태 보드 — 연속 클릭 재활성화',
      scriptText: `
        const before = await page.evaluate(() => document.querySelector('#board-refresh').disabled);
        if (before) throw new Error('초기 board-refresh 가 이미 비활성화 상태');

        // 1차 클릭 — ready 전이까지 완료
        await page.getByRole('button', { name: '전달 상태 새로고침' }).click();
        await page.waitForFunction(() => document.querySelector('#board-root').dataset.state === 'ready');
        const afterFirst = await page.evaluate(() => document.querySelector('#board-refresh').disabled);
        if (afterFirst) throw new Error('1차 재조회 완료 후 board-refresh 가 비활성화 상태로 남음');

        // 2차 클릭 — 재활성화된 control 이 실제로 다시 동작하는지 확인 (핵심 회귀)
        await page.getByRole('button', { name: '전달 상태 새로고침' }).click();
        await page.waitForFunction(() => document.querySelector('#board-root').dataset.state === 'ready');
        const afterSecond = await page.evaluate(() => document.querySelector('#board-refresh').disabled);
        const count = await page.evaluate(() => document.querySelectorAll('#board-role-list li').length);
        if (afterSecond) throw new Error('2차 재조회 완료 후 board-refresh 가 재활성화되지 않음 (회귀)');
        if (count !== 5) throw new Error('재조회 후 역할 목록 개수 불일치: ' + count);
      `,
    });

    assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
    assert.equal(result.passed, true, `연속 클릭 재활성화 시나리오 실패: ${result.stdout}`);
  },
);
