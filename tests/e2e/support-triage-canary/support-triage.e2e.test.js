// 고객 문의 분류 SPA — E2E 회귀 가드 (BF-1152)
// 대상: BF-1150(PR #302, merge_sha c83bfa5913e164fd9569e37afa122ac9cef85712) 로
// merge 된 /demo/support-triage-canary 라우트(demo/support-triage-canary/index.html).
// dev 가 이미 단위 테스트(apps/demo/support-triage-canary/tests/support-triage.test.js,
// demo/support-triage-canary/tests/support-triage.test.js)로 순수 로직(loadInquiries/
// filterInquiries/countByAxis/summarizeStatus 등)을 검증했으므로 여기서는 재검증하지 않는다.
// tester 고유 영역만 다룬다:
//   1) HTML 마크업 contract(정적 가드) — id/class 존재
//   2) 실 브라우저 E2E(e2e-runner) — 라우트 진입·fixture 로드·필터·처리 상태 표시(AC1)
//   3) 공용 토큰 정합성 + 모듈 격리성(AC2) — 인접 demo 페이지 회귀 방지 근거
//
// 실행: node --test tests/e2e/support-triage-canary/*.test.js
// 정적 서버(node:http, self-contained, serve_root='.') + e2e-runner(:3030) 실제 브라우저 검증.

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'support-triage-canary';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// ---- 정적 서버 (canonical self-contained helper) --------------------------
// serveRoot 아래의 정적 파일만 노출. listen(0) 으로 포트 자동 할당(병렬 충돌 방지).
// support-triage-canary 는 <script type="module"> 로 자기 로직을 import 하므로(vanilla-static
// ESM 규약) .js 응답에 정확한 Content-Type 이 없으면 브라우저가 strict MIME 검사로 module
// script 로딩을 거부한다. 확장자별 최소 MIME 매핑을 둔다.
const MIME_BY_EXT = {
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
      const contentType = MIME_BY_EXT[path.extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType }).end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

async function callE2E({ url, label, scriptText, timeoutMs = 30000 }) {
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

// ---- e2e-runner 도달성 (CI 결정성 가드) ------------------------------------
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
      skipReason = `e2e-runner unhealthy (${probe.status})`;
    }
  } catch (err) {
    e2eAvailable = false;
    skipReason = `e2e-runner 도달 불가 (${err.message}) — CI 환경 정상`;
  }
});

// ---- 정적 가드: HTML 마크업 contract ---------------------------------------
// dev 산출물의 fact 존재 검증(위치/순서 무관). demo/support-triage-canary/index.html 은
// dev(BF-1150) 전용 write scope 파일이라 이 task 는 read-only 로만 사용한다.
const INDEX_HTML_PATH = path.resolve('demo/support-triage-canary/index.html');

test(
  '정적 가드 — index.html 이 필터/리스트/상태 마크업 contract 를 유지한다',
  { skip: _brixOutOfScope },
  () => {
    const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
    for (const id of ['priority-chips', 'area-chips', 'result-count', 'inquiry-list', 'empty-state']) {
      assert.ok(html.includes(`id="${id}"`), `#${id} 마크업이 존재해야 한다`);
    }
    // 칩/카드/배지는 클라이언트 JS 가 런타임에 className 을 부여한다(정적 마크업에는
    // 컨테이너만 존재) — 소스에 해당 클래스명 리터럴이 존재하는지로 fact 를 고정한다.
    for (const cls of ['chip', 'inquiry-card', 'priority-badge', 'area-tag', 'status-badge']) {
      assert.ok(html.includes(cls), `.${cls} 클래스명이 소스에 존재해야 한다`);
    }
  },
);

test(
  '정적 가드 — 공용 토큰 HEX 값이 회귀 없이 유지된다',
  { skip: _brixOutOfScope },
  () => {
    const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
    const expectedTokens = {
      '--color-primary': '#2563EB',
      '--color-warning': '#D97706',
      '--color-success': '#16A34A',
      '--color-pending': '#9CA3AF',
    };
    for (const [name, hex] of Object.entries(expectedTokens)) {
      assert.ok(
        html.includes(`${name}: ${hex}`),
        `${name} 토큰이 ${hex} 값을 유지해야 한다(공용 토큰 회귀 가드)`,
      );
    }
  },
);

test(
  '정적 가드 — module import 가 자기 모듈만 참조한다(인접 demo 격리)',
  { skip: _brixOutOfScope },
  () => {
    const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
    const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);
    assert.ok(scriptMatch, 'type="module" 스크립트가 존재해야 한다');
    const scriptBody = scriptMatch[1];
    const importLines = scriptBody.match(/from\s+['"][^'"]+['"]/g) || [];
    assert.equal(importLines.length, 1, '외부 import 는 정확히 1개(자기 로직 모듈)여야 한다');
    assert.ok(
      importLines[0].includes('../../apps/demo/support-triage-canary/triage.js'),
      '자기 모듈 외 공용/외부 파일을 참조하지 않아야 한다(인접 demo 회귀 없음)',
    );
  },
);

// ---- E2E 시나리오 1/2: 실제 브라우저 (e2e-runner) --------------------------

test(
  'E2E — /demo/support-triage-canary 라우트 진입·fixture 로드·필터·처리 상태 표시',
  { skip: _brixOutOfScope },
  async (t) => {
    if (!e2eAvailable) {
      t.skip(skipReason);
      return;
    }

    const { server, port } = await startStaticServer('.');
    t.after(() => server.close());
    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/demo/support-triage-canary/`;

    const scriptText = `
      await page.waitForSelector('#inquiry-list li', { timeout: 10000 });
      const initialCount = await page.locator('#inquiry-list li').count();
      if (initialCount !== 8) throw new Error('fixture 초기 로드 개수 불일치: ' + initialCount);

      const resultText = await page.locator('#result-count').innerText();
      if (!resultText.includes('8')) throw new Error('결과 카운트 표시 불일치: ' + resultText);

      await page.locator('#priority-chips .chip[data-key="urgent"]').click();
      await new Promise((r) => setTimeout(r, 150));
      const urgentCount = await page.locator('#inquiry-list li').count();
      const nonUrgent = await page.locator('#inquiry-list li:not(.inquiry-card--urgent)').count();
      if (nonUrgent !== 0) throw new Error('우선순위 필터 후 non-urgent 카드 잔존: ' + nonUrgent);
      if (urgentCount === 0 || urgentCount === 8) throw new Error('우선순위 필터가 목록을 좁히지 못함: ' + urgentCount);

      await page.locator('#area-chips .chip[data-key="billing"]').click();
      await new Promise((r) => setTimeout(r, 150));
      const combinedCount = await page.locator('#inquiry-list li').count();
      if (combinedCount !== 1) throw new Error('urgent+billing AND 필터 결과 개수 불일치: ' + combinedCount);
      const cardText = await page.locator('#inquiry-list li').first().innerText();
      if (!cardText.includes('INQ-2048')) throw new Error('urgent+billing 필터 결과 티켓 불일치: ' + cardText);

      const newBadgeCount = await page.locator('#inquiry-list li .status-badge--new').count();
      if (newBadgeCount !== 1) throw new Error('처리 상태(신규) 배지 미표시');

      await page.locator('#priority-chips .chip[data-key="all"]').click();
      await page.locator('#area-chips .chip[data-key="all"]').click();
      await new Promise((r) => setTimeout(r, 150));
      const resetCount = await page.locator('#inquiry-list li').count();
      if (resetCount !== 8) throw new Error('필터 초기화 후 전체 복원 실패: ' + resetCount);
    `;

    const result = await callE2E({
      url,
      label: '[E2E] support-triage-canary 라우트·fixture·필터·상태표시',
      scriptText,
      timeoutMs: 30000,
    });

    assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
    assert.equal(result.passed, true, `E2E 시나리오 실패(stdout 참고): ${result.stdout || ''}`);
    assert.ok(result.screenshotPath, 'screenshot artifact 경로가 있어야 한다');
    assert.ok(result.tracePath, 'trace artifact 경로가 있어야 한다');
  },
);

test(
  'E2E — 공용 토큰이 렌더된 DOM 에 그대로 반영되고 인접 demo 회귀 위험이 없다',
  { skip: _brixOutOfScope },
  async (t) => {
    if (!e2eAvailable) {
      t.skip(skipReason);
      return;
    }

    const { server, port } = await startStaticServer('.');
    t.after(() => server.close());
    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/demo/support-triage-canary/`;

    const scriptText = `
      await page.waitForSelector('#inquiry-list li', { timeout: 10000 });

      const tokens = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        return {
          primary: cs.getPropertyValue('--color-primary').trim().toUpperCase(),
          warning: cs.getPropertyValue('--color-warning').trim().toUpperCase(),
          success: cs.getPropertyValue('--color-success').trim().toUpperCase(),
          pending: cs.getPropertyValue('--color-pending').trim().toUpperCase(),
        };
      });
      const expected = { primary: '#2563EB', warning: '#D97706', success: '#16A34A', pending: '#9CA3AF' };
      for (const key of Object.keys(expected)) {
        if (tokens[key] !== expected[key]) {
          throw new Error('공용 토큰 회귀: --color-' + key + ' = ' + tokens[key] + ' (기대값 ' + expected[key] + ')');
        }
      }

      const urgentBorderColor = await page.evaluate(() => {
        const el = document.querySelector('.inquiry-card--urgent');
        return el ? getComputedStyle(el).borderLeftColor : null;
      });
      if (!urgentBorderColor) throw new Error('urgent 카드 미발견 — accent 토큰 렌더 검증 불가');

      const scriptContent = await page.evaluate(() => {
        const s = document.querySelector('script[type="module"]');
        return s ? s.textContent : '';
      });
      const importMatches = scriptContent.match(/from\\s+['"]([^'"]+)['"]/g) || [];
      if (importMatches.length !== 1) {
        throw new Error('module script import 개수 불일치(격리성 위반 가능): ' + importMatches.length);
      }
      if (!importMatches[0].includes('../../apps/demo/support-triage-canary/triage.js')) {
        throw new Error('예상 외 import 경로 — 공용/인접 파일 의존 가능성: ' + importMatches[0]);
      }
    `;

    const result = await callE2E({
      url,
      label: '[E2E] support-triage-canary 공용토큰·격리성(인접 demo 회귀 가드)',
      scriptText,
      timeoutMs: 30000,
    });

    assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
    assert.equal(result.passed, true, `E2E 시나리오 실패(stdout 참고): ${result.stdout || ''}`);
    assert.ok(result.screenshotPath, 'screenshot artifact 경로가 있어야 한다');
    assert.ok(result.tracePath, 'trace artifact 경로가 있어야 한다');
  },
);
