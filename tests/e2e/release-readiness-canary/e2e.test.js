// BF-1148 — 릴리스 준비도 SPA (/demo/release-readiness-canary) E2E 회귀 가드
//
// dev(BF-1146) 가 이미 검증한 영역(단위 로직: isComplete/isBlocking/completionRate/
// deriveAreaSummary/deriveReadiness, 렌더 함수 문자열 출력 escapeHtml/renderSummary/
// renderBlockingList/renderReadinessView)은 demo/release-readiness-canary/tests/*.test.js
// 에서 16개 케이스로 커버됨 — 여기서는 재검증하지 않는다.
//
// 이 파일의 책임: 실제 브라우저가 index.html 을 로드했을 때 fixture → deriveReadiness →
// DOM 렌더까지 이어지는 통합 경로가 깨지지 않았음을 검증한다 (dev 단위 테스트는 index.html
// 을 전혀 다루지 않으므로 이 경로는 미검증 상태였음).
//
// 기대값은 src/features/release-readiness-canary/{fixture,readiness}.js 의 실제 파생
// 로직을 오라클로 사용해 계산한다 (하드코딩 금지 — fixture 변경에 자동 추종).

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { RELEASE_READINESS_FIXTURE } from '../../../src/features/release-readiness-canary/fixture.js';
import { deriveReadiness } from '../../../src/features/release-readiness-canary/readiness.js';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'release-readiness-canary';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// canonical self-contained static server (e2e-runner-ci-guard skill 참고).
// serveRoot 를 repo root 로 두고, 실제 요청 경로(/demo/release-readiness-canary/)만
// 브라우저가 조회 — 이 프로세스는 restricted path 를 소스에 리터럴로 담지 않는다.
//
// Content-Type 필수: 이 module 은 ES module script(<script type="module">)를 사용하므로
// 브라우저의 strict MIME 검사를 통과하려면 .js 응답에 text/javascript 가 필요하다
// (skill 의 canonical helper 는 이 확장을 안 다뤄 이 module 에서는 빈 MIME 로 로드 실패함 —
// tester 가드 자체 보강).
const _BRIX_MIME_TYPES = {
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
      const ext = path.extname(target);
      const contentType = _BRIX_MIME_TYPES[ext] || 'application/octet-stream';
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
    body: JSON.stringify({ url, label, scriptText, timeoutMs }),
  });
  return res.json();
}

// fixture 기반 기대값 — 실제 파생 로직(src/features/release-readiness-canary/readiness.js)
// 을 오라클로 사용. 이 값 자체의 정확성은 dev 단위 테스트 책임 — 여기서는 E2E 렌더 결과와의
// 일치 여부만 확인한다.
const EXPECTED = deriveReadiness(RELEASE_READINESS_FIXTURE);

let server;
let port;
let e2eAvailable = true;
let skipReason = null;

test.before(async () => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    e2eAvailable = false;
    skipReason = 'BRIX_E2E_SKIP=1 — CI 결정성 가드';
    return;
  }
  try {
    const probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) {
      e2eAvailable = false;
      skipReason = `e2e-runner unhealthy (${probe.status}) — CI 환경 정상`;
      return;
    }
  } catch (err) {
    e2eAvailable = false;
    skipReason = `e2e-runner 도달 불가 (${err.message}) — CI 환경 정상`;
    return;
  }
  const started = await startStaticServer('.');
  server = started.server;
  port = started.port;
});

test.after(() => {
  if (server) server.close();
});

// AC1 — Given 머지된 릴리스 준비도 SPA, When E2E 실행, Then 페이지 진입·렌더·완료율 표시가 보장된다.
test('AC1 — 페이지 진입 및 완료율 표시', { skip: _brixOutOfScope }, async (t) => {
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/demo/release-readiness-canary/`;
  const expectRate = `${EXPECTED.completionRate}%`;
  const expectCounts = `${EXPECTED.doneItems}/${EXPECTED.totalItems} 항목 완료`;
  const result = await callE2eRunner({
    url,
    label: '릴리스 준비도 — 페이지 진입 및 완료율 표시',
    scriptText: `
      const title = await page.title();
      const text = await page.evaluate(() => document.body.innerText);
      if (!text.includes(${JSON.stringify(expectRate)})) {
        throw new Error('completion rate text missing. expected substring: ' + ${JSON.stringify(expectRate)} + ' | body: ' + text.slice(0, 300));
      }
      if (!text.includes(${JSON.stringify(expectCounts)})) {
        throw new Error('done/total counts text missing. expected substring: ' + ${JSON.stringify(expectCounts)} + ' | body: ' + text.slice(0, 300));
      }
    `,
  });
  assert.equal(result.ok, true, `e2e-runner call 실패: ${JSON.stringify(result)}`);
  assert.equal(result.passed, true, `AC1 시나리오 실패\nstdout: ${result.stdout}`);
});

// AC2 — Given 차단 항목 계산, When fixture 기반 테스트, Then 집계 결과가 기대값과 일치한다.
test('AC2 — 차단 항목 집계가 fixture 기대값과 일치', { skip: _brixOutOfScope }, async (t) => {
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/demo/release-readiness-canary/`;
  const expectBlockingText =
    EXPECTED.blockingItems.length === 0
      ? '차단 항목이 없습니다'
      : `차단 항목 ${EXPECTED.blockingItems.length}건`;
  const firstBlockingLabel = EXPECTED.blockingItems[0]?.label ?? '';
  const result = await callE2eRunner({
    url,
    label: '릴리스 준비도 — 차단 항목 집계 fixture 일치',
    scriptText: `
      const text = await page.evaluate(() => document.body.innerText);
      if (!text.includes(${JSON.stringify(expectBlockingText)})) {
        throw new Error('blocking summary text mismatch. expected substring: ' + ${JSON.stringify(expectBlockingText)} + ' | body: ' + text.slice(0, 300));
      }
      ${
        firstBlockingLabel
          ? `if (!text.includes(${JSON.stringify(firstBlockingLabel)})) {
        throw new Error('blocking item label missing from render: ' + ${JSON.stringify(firstBlockingLabel)});
      }`
          : ''
      }
    `,
  });
  assert.equal(result.ok, true, `e2e-runner call 실패: ${JSON.stringify(result)}`);
  assert.equal(result.passed, true, `AC2 시나리오 실패\nstdout: ${result.stdout}`);
});

// AC3 — Given related module 범위, When 회귀 테스트 실행, Then 완료율·차단 항목 렌더와
// 관련된 영역별 체크리스트 렌더에 회귀가 없음이 확인된다 (focused primary_module 범위 내).
test('AC3 — 영역별 체크리스트 렌더 회귀 없음', { skip: _brixOutOfScope }, async (t) => {
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/demo/release-readiness-canary/`;
  const areaNames = EXPECTED.areas.map((a) => a.name);
  const result = await callE2eRunner({
    url,
    label: '릴리스 준비도 — 영역별 체크리스트 렌더 회귀',
    scriptText: `
      const areaCount = await page.evaluate(() => document.querySelectorAll('.area').length);
      if (areaCount !== ${EXPECTED.areas.length}) {
        throw new Error('area count mismatch: expected ${EXPECTED.areas.length}, got ' + areaCount);
      }
      const text = await page.evaluate(() => document.body.innerText);
      const names = ${JSON.stringify(areaNames)};
      for (const name of names) {
        if (!text.includes(name)) throw new Error('area name missing from render: ' + name);
      }
    `,
  });
  assert.equal(result.ok, true, `e2e-runner call 실패: ${JSON.stringify(result)}`);
  assert.equal(result.passed, true, `AC3 시나리오 실패\nstdout: ${result.stdout}`);
});
