'use strict';

/* BF-1142 — 온콜 인수인계 SPA (BF-1140) 회귀 가드
 * oncall-handoff/package.json 이 "type": "commonjs" 를 선언하므로
 * 이 디렉토리 아래 .test.js 는 CommonJS 로 해석된다 — require() 사용.
 *
 * 범위:
 *  1. 파생 로직(computePosture/sortBySeverity/countUnacknowledged/resolveNextOwner/
 *     selectFixtureName/formatTime) — FIXTURES 데이터를 입력으로 검증 (dev 는 이 module 에
 *     단위 테스트를 작성하지 않았음 — exact_changed_files 에 tests/ 없음).
 *  2. 정적 마크업 contract — file:// CORS 안전 가드, mount 지점 존재.
 *  3. 실 브라우저 E2E — 4개 상태(healthy/degraded/outage/empty) 렌더.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const handoff = require('../handoff.js');
const { FIXTURES } = require('../fixtures.js');

// brix-flow-test-scope-guard — focused scope 일 때 다른 module 시나리오 skip.
const _BRIX_MY_MODULE = 'oncall-handoff';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// ===================== 파생 로직 — fixture 입력별 검증 =====================

test('computePosture — 4개 fixture 입력별 posture 파생', { skip: _brixOutOfScope }, () => {
  assert.equal(handoff.computePosture(FIXTURES.outage), 'outage');
  assert.equal(handoff.computePosture(FIXTURES.degraded), 'degraded');
  assert.equal(handoff.computePosture(FIXTURES.healthy), 'healthy');
  assert.equal(handoff.computePosture(FIXTURES.empty), 'empty');
});

test('sortBySeverity — outage fixture 인시던트가 SEV1 우선 오름차순 정렬', { skip: _brixOutOfScope }, () => {
  const sorted = handoff.sortBySeverity(FIXTURES.outage.incidents);
  assert.deepEqual(sorted.map((i) => i.id), ['pay-timeout', 'cdn-cache']);

  // 동일 fixture 데이터를 뒤집어 넣어도 severity 오름차순으로 복원되어야 한다(단순 pass-through 아님).
  const reversed = handoff.sortBySeverity(FIXTURES.outage.incidents.slice().reverse());
  assert.deepEqual(reversed.map((i) => i.id), ['pay-timeout', 'cdn-cache']);
});

test('countUnacknowledged — fixture 별 미확인 인계(ack:false) 건수', { skip: _brixOutOfScope }, () => {
  assert.equal(handoff.countUnacknowledged(FIXTURES.outage.incidents), 1); // pay-timeout 만 ack:false
  assert.equal(handoff.countUnacknowledged(FIXTURES.degraded.incidents), 0); // search-index ack:true
});

test('resolveNextOwner — 인시던트 지정 담당자 우선, 없으면 incoming 당직 상속', { skip: _brixOutOfScope }, () => {
  const [payTimeout] = FIXTURES.outage.incidents;
  assert.deepEqual(
    handoff.resolveNextOwner(payTimeout, FIXTURES.outage.schedule),
    payTimeout.nextOwner
  );

  const noOwnerIncident = Object.assign({}, payTimeout, { nextOwner: undefined });
  assert.deepEqual(handoff.resolveNextOwner(noOwnerIncident, FIXTURES.outage.schedule), {
    name: FIXTURES.outage.schedule.incoming.name,
    handle: FIXTURES.outage.schedule.incoming.handle,
    ack: false,
  });

  assert.equal(handoff.resolveNextOwner(noOwnerIncident, null), null);
});

test('selectFixtureName — 유효한 state 우선, 무효/미지정 시 outage 기본값', { skip: _brixOutOfScope }, () => {
  const names = Object.keys(FIXTURES);
  assert.equal(handoff.selectFixtureName('degraded', names), 'degraded');
  assert.equal(handoff.selectFixtureName('no-such-state', names), 'outage');
  assert.equal(handoff.selectFixtureName(null, names), 'outage');
});

test('formatTime — fixture lastAction.at ISO 문자열 → HH:MM, 빈/미지정 입력은 빈 문자열', { skip: _brixOutOfScope }, () => {
  const { lastAction } = FIXTURES.outage.incidents[0];
  assert.equal(handoff.formatTime(lastAction.at), '08:12');
  assert.equal(handoff.formatTime(''), '');
  assert.equal(handoff.formatTime(undefined), '');
});

// ===================== 정적 마크업 contract 가드 =====================

test('index.html/js — CORS 안전(file:// 호환): type=module / fetch / import / export 미사용', { skip: _brixOutOfScope }, () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
  assert.ok(!/<script[^>]*type\s*=\s*["']module["']/i.test(html), 'index.html 에 <script type="module"> 존재');

  ['fixtures.js', 'handoff.js'].forEach((f) => {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf-8');
    assert.ok(!/\bfetch\s*\(/.test(src), `${f} 에 fetch() 호출 존재`);
    assert.ok(!/^\s*import\s/m.test(src), `${f} 에 import 구문 존재`);
    assert.ok(!/^\s*export\s/m.test(src), `${f} 에 export 구문 존재`);
  });
});

test('index.html — 4개 상태 렌더에 필요한 mount 지점/속성 존재', { skip: _brixOutOfScope }, () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
  assert.ok(html.includes('id="oncall-handoff"'), '#oncall-handoff mount root 없음');
  assert.ok(html.includes('class="oh-mount"'), '.oh-mount 없음');
  assert.ok(html.includes('data-view-state="loading"'), '초기 data-view-state=loading 없음');
});

// ===================== E2E — 실 브라우저 상태 렌더 (e2e-runner) =====================

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
    body: JSON.stringify({ url, label, scriptText, timeoutMs: timeoutMs || 30000 }),
  });
  return res.json();
}

let e2eAvailable = true;
let e2eSkipReason = null;

test.before(async () => {
  if (_brixOutOfScope) return;
  if (process.env.BRIX_E2E_SKIP === '1') {
    e2eAvailable = false;
    e2eSkipReason = 'BRIX_E2E_SKIP=1 — CI 결정성 가드';
    return;
  }
  try {
    const probe = await fetch('http://e2e-runner:3030/health', {
      signal: AbortSignal.timeout(2000),
    });
    if (!probe.ok) {
      e2eAvailable = false;
      e2eSkipReason = `e2e-runner unhealthy (${probe.status})`;
    }
  } catch (err) {
    e2eAvailable = false;
    e2eSkipReason = `e2e-runner 도달 불가 (${err.message}) — CI 환경 정상`;
  }
});

test('온콜 인수인계 — 정상/저하/장애 상태 렌더 및 SEV1 우선 정렬 e2e', { skip: _brixOutOfScope }, async (t) => {
  if (!e2eAvailable) {
    t.skip(e2eSkipReason);
    return;
  }
  const { server, port } = await startStaticServer(path.join(__dirname, '..'));
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const base = `http://${host}:${port}/`;

  const scriptText = `
    async function checkPosture(state, expectedPosture) {
      await page.goto(${JSON.stringify(base)} + '?state=' + state);
      await page.waitForSelector('#oncall-handoff[data-view-state="ready"]');
      const posture = await page.getAttribute('#oncall-handoff', 'data-posture');
      if (posture !== expectedPosture) throw new Error('posture mismatch for ' + state + ': ' + posture);
    }
    await checkPosture('healthy', 'healthy');
    const healthyClear = await page.locator('.oh-clear').count();
    if (healthyClear !== 1) throw new Error('healthy 상태에 .oh-clear 없음: ' + healthyClear);

    await checkPosture('degraded', 'degraded');
    const degradedCards = await page.locator('.oh-card').count();
    if (degradedCards !== 1) throw new Error('degraded 카드 수 불일치: ' + degradedCards);

    await checkPosture('outage', 'outage');
    const outageCards = await page.locator('.oh-card').count();
    if (outageCards !== 2) throw new Error('outage 카드 수 불일치: ' + outageCards);
    const firstCardId = await page.locator('.oh-card').first().getAttribute('id');
    if (firstCardId !== 'handoff-pay-timeout') throw new Error('SEV1 카드가 최상단이 아님: ' + firstCardId);
  `;

  const result = await callE2E({
    url: base,
    label: '온콜 인수인계 — 정상/저하/장애 상태 렌더 및 SEV1 우선 정렬',
    scriptText,
  });
  assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
  assert.equal(result.passed, true, `시나리오 실패: ${result.stdout || ''}`);
});

test('온콜 인수인계 — 빈 상태(담당자 미배정) 렌더 e2e', { skip: _brixOutOfScope }, async (t) => {
  if (!e2eAvailable) {
    t.skip(e2eSkipReason);
    return;
  }
  const { server, port } = await startStaticServer(path.join(__dirname, '..'));
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/?state=empty`;

  const scriptText = `
    await page.goto(${JSON.stringify(url)});
    await page.waitForSelector('#oncall-handoff[data-view-state="empty"]');
    const posture = await page.getAttribute('#oncall-handoff', 'data-posture');
    if (posture !== 'empty') throw new Error('empty posture mismatch: ' + posture);
    const title = await page.locator('.oh-empty__title').innerText();
    if (!title.includes('표시할 인수인계가 없습니다')) throw new Error('empty 안내 문구 없음: ' + title);
    const btnCount = await page.locator('.oh-empty button').count();
    if (btnCount !== 1) throw new Error('empty 상태 액션 버튼 없음: ' + btnCount);
  `;

  const result = await callE2E({
    url,
    label: '온콜 인수인계 — 빈 상태 안내 문구/액션 렌더',
    scriptText,
  });
  assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
  assert.equal(result.passed, true, `시나리오 실패: ${result.stdout || ''}`);
});
