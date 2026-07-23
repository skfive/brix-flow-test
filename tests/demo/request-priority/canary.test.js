// BF-1107 — request-priority 데모 E2E 회귀 가드 (focused)
// 대상: demo/request-priority-skill-canary/index.html + src/demo/request-priority/classify.js (BF-1105, merged)
// 목적: 페이지 렌더 + 영향도×긴급도 조합별 P1~P4 매핑 + "다음 조치" 표시가 향후 silent break 되지 않도록 고정.
// 단위 로직(classifyRequestPriority 매트릭스/에러/메타)은 dev 가 이미
// demo/request-priority-skill-canary/tests/classify.test.js 에서 검증 — 여기서는 재작성하지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'request-priority';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const ENTRY_PATH = 'demo/request-priority-skill-canary/index.html';

// 확장자 → MIME. index.html 이 <script type="module"> 로 classify.js 를 import 하므로
// Content-Type 이 없으면 브라우저가 strict MIME 체크로 module script 로드를 거부한다.
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
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

let server;
let port;

test.before(async () => {
  if (_brixOutOfScope) return;
  // repo_convention_capsule.serve_root: "." — index.html 이 "../../src/..." 상대 import 를 쓰므로
  // repo root 를 serve root 로 삼아야 module import 가 정상 resolve 된다.
  ({ server, port } = await startStaticServer('.'));
});

test.after(() => {
  if (server) server.close();
});

// ── 정적 마크업 계약 (E2E 없이도 즉시 실패하는 fact 가드) ──
test('AC — index.html 핵심 selector/속성 존재 (마크업 계약)', { skip: _brixOutOfScope }, () => {
  const html = fs.readFileSync(ENTRY_PATH, 'utf-8');
  assert.ok(html.includes('data-axis="impact"'), 'impact axis-group 누락');
  assert.ok(html.includes('data-axis="urgency"'), 'urgency axis-group 누락');
  assert.ok(html.includes('id="result"'), '#result 컨테이너 누락');
  assert.ok(html.includes('aria-live="polite"'), 'aria-live 누락');
  assert.ok(html.includes('id="matrix-body"'), '#matrix-body 누락');
});

// ── AC1: 페이지 렌더 + 핵심 우선순위 매핑 케이스 ──
test('AC1 — 페이지 렌더 + critical×immediate → P1 매핑 (e2e)', { skip: _brixOutOfScope }, async (t) => {
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

  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');

  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/demo/request-priority-skill-canary/`;

  const scriptText = `
    const title = await page.evaluate(() => document.title);
    if (!title.includes('요청 우선순위 분류')) throw new Error('title mismatch: ' + title);

    const cellCount = await page.evaluate(() => document.querySelectorAll('#matrix-body td').length);
    if (cellCount !== 16) throw new Error('matrix cell count mismatch (expected 16x4x4): ' + cellCount);

    await page.click('.axis-group[data-axis="impact"] .axis-option[data-code="critical"]');
    await page.click('.axis-group[data-axis="urgency"] .axis-option[data-code="immediate"]');
    await new Promise((r) => setTimeout(r, 200));

    const badgeText = await page.evaluate(() => document.querySelector('.priority-badge')?.textContent || '');
    const nextActionBody = await page.evaluate(() => document.querySelector('.next-action__body')?.textContent || '');
    const nextActionTime = await page.evaluate(() => document.querySelector('.next-action__time')?.textContent || '');

    if (!badgeText.includes('P1')) throw new Error('badge mismatch (critical+immediate expected P1): ' + badgeText);
    if (!nextActionBody.includes('즉시 담당자 배정')) throw new Error('nextAction mismatch: ' + nextActionBody);
    if (!nextActionTime.includes('15분 이내')) throw new Error('targetTime mismatch: ' + nextActionTime);
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
      label: 'request-priority 렌더 + critical×immediate→P1 매핑',
      scriptText,
      timeoutMs: 30000,
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, `e2e-runner HTTP 실패: ${JSON.stringify(body)}`);
  assert.equal(body.passed, true, `e2e-runner 시나리오 실패: ${body.stdout || JSON.stringify(body)}`);
});

// ── AC2: 대표 입력 조합 — s1 매트릭스대로 P1~P4 + 다음 조치 고정 ──
test('AC2 — 대표 조합별 P1~P4 매핑 + 다음 조치 회귀 고정 (e2e)', { skip: _brixOutOfScope }, async (t) => {
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

  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');

  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/demo/request-priority-skill-canary/`;

  // 기획 §3 매트릭스(src/demo/request-priority/classify.js) — call1 과 겹치지 않는 대표 조합으로
  // P1~P4 각 등급 1개씩 고정.
  const scriptText = `
    const combos = [
      { impact: 'high', urgency: 'immediate', expected: 'P1', action: '즉시 담당자 배정', time: '15분 이내' },
      { impact: 'critical', urgency: 'medium', expected: 'P2', action: '당일 내 담당자 배정', time: '4시간 이내' },
      { impact: 'medium', urgency: 'high', expected: 'P3', action: '익영업일 이내 착수', time: '1영업일 이내' },
      { impact: 'low', urgency: 'high', expected: 'P4', action: '백로그에 등록', time: '스프린트 계획 반영' },
    ];
    for (const c of combos) {
      await page.click('.axis-group[data-axis="impact"] .axis-option[data-code="' + c.impact + '"]');
      await page.click('.axis-group[data-axis="urgency"] .axis-option[data-code="' + c.urgency + '"]');
      await new Promise((r) => setTimeout(r, 150));

      const badgeText = await page.evaluate(() => document.querySelector('.priority-badge')?.textContent || '');
      const nextActionBody = await page.evaluate(() => document.querySelector('.next-action__body')?.textContent || '');
      const nextActionTime = await page.evaluate(() => document.querySelector('.next-action__time')?.textContent || '');

      if (!badgeText.includes(c.expected)) {
        throw new Error('combo ' + c.impact + '/' + c.urgency + ' expected ' + c.expected + ' got: ' + badgeText);
      }
      if (!nextActionBody.includes(c.action)) {
        throw new Error('combo ' + c.impact + '/' + c.urgency + ' nextAction mismatch: ' + nextActionBody);
      }
      if (!nextActionTime.includes(c.time)) {
        throw new Error('combo ' + c.impact + '/' + c.urgency + ' targetTime mismatch: ' + nextActionTime);
      }
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
      label: 'request-priority 대표 조합 4건 — s1 매트릭스 고정',
      scriptText,
      timeoutMs: 45000,
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, `e2e-runner HTTP 실패: ${JSON.stringify(body)}`);
  assert.equal(body.passed, true, `e2e-runner 시나리오 실패: ${body.stdout || JSON.stringify(body)}`);
});
