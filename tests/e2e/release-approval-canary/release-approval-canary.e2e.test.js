// 릴리스 변경 승인 큐 — E2E 회귀 가드 (BF-1065)
// 검증 대상: release-approval-canary/{index.html,app.js,fixtures.js,state.js} (BF-1063, PR #268, merge 98f53f5)
// 실행: node --test tests/e2e/release-approval-canary/release-approval-canary.e2e.test.js
//
// 범위(tester 고유 영역만 — dev state.test.js 가 이미 검증한 정렬/전이 순수 로직은 재작성하지 않는다):
//   AC1 — /release-approval-canary 진입 시 렌더 + fixture 로딩(카드 5건, 헤더 타이틀) 가드
//   AC2 — 승인 액션 실 브라우저 클릭 → 상태 배지 전이 + localStorage 이력 기록 가드
//   AC3 — 보류 액션 실 브라우저 클릭 → 상태 배지 전이 + localStorage 이력 기록 가드
//   AC4 — CI 결정성: e2e-runner 도달 불가 시 assertion failure 아닌 skip (module-scope 가드 포함)
//
// 정적 검증(마크업 id/class 존재)이 아니라 실제 클릭/localStorage 쓰기 인터랙션이므로 e2e-runner 사용.

import test from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'release-approval-canary';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// 확장자 → MIME. app.js 가 <script type="module"> 로 로드되므로 정확한 Content-Type 필수
// (브라우저가 빈/오탐 MIME 은 module script 로딩을 거부한다 — strict MIME 체크).
const MIME_BY_EXT = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// serveRoot 아래의 정적 파일만 노출하는 self-contained 서버. listen(0) 으로 포트 자동 할당.
// route_mapping: root-relative-static (REPO_CONVENTION_CAPSULE) → repo root 를 serve root 로 사용.
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

// e2e-runner 도달성 사전 확인 — 못 닿으면 skip(CI 정상 케이스), assertion failure 아님.
async function checkE2eAvailable(t) {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return false;
  }
  try {
    const probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) {
      t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
      return false;
    }
  } catch (err) {
    t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
    return false;
  }
  return true;
}

async function callE2eRunner({ url, label, scriptText, timeoutMs }) {
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
    body: JSON.stringify({ url, label, scriptText, timeoutMs: timeoutMs ?? 30000 }),
  });
  const body = await res.json();
  return body;
}

test(
  'AC1 — /release-approval-canary 진입 시 렌더·fixture 로딩 가드',
  { skip: _brixOutOfScope },
  async (t) => {
    if (!(await checkE2eAvailable(t))) return;

    const { server, port } = await startStaticServer('.');
    t.after(() => server.close());
    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/release-approval-canary/`;

    const result = await callE2eRunner({
      url,
      label: '승인 큐 진입 — 렌더 + fixture 5건 로딩',
      scriptText: `
        await page.waitForSelector('.candidate-card', { timeout: 5000 });
        const title = await page.locator('.queue-header h1').innerText();
        if (title !== '릴리스 변경 승인 큐') throw new Error('헤더 타이틀 불일치: ' + title);
        const count = await page.locator('.candidate-card').count();
        if (count !== 5) throw new Error('fixture 후보 카드 수 불일치(기대 5): ' + count);
        const tabCount = await page.locator('.filter-tab[data-filter="all"] .count').innerText();
        if (tabCount !== '5') throw new Error('전체 필터 카운트 불일치(기대 5): ' + tabCount);
      `,
    });
    assert_ok(result, '렌더/fixture 로딩');
  },
);

test(
  'AC2 — 승인 액션 클릭 → 상태 배지 전이 + 이력 기록 가드',
  { skip: _brixOutOfScope },
  async (t) => {
    if (!(await checkE2eAvailable(t))) return;

    const { server, port } = await startStaticServer('.');
    t.after(() => server.close());
    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/release-approval-canary/`;

    const result = await callE2eRunner({
      url,
      label: '승인 액션 — 배지 전이 + localStorage 이력 기록',
      scriptText: `
        await page.waitForSelector('.candidate-card', { timeout: 5000 });
        const first = page.locator('.candidate-card').first();
        const candidateId = await first.getAttribute('data-card-id');
        await first.click();
        await page.getByRole('button', { name: '승인', exact: true }).click();
        await page.waitForSelector('.detail-panel .status-badge--approved', { timeout: 5000 });
        const state = await page.evaluate((cid) => {
          const raw = localStorage.getItem('bf:release-approval-canary:v1');
          if (!raw) return null;
          const data = JSON.parse(raw);
          const target = data.candidates.find((c) => c.id === cid);
          if (!target) return null;
          return {
            status: target.status,
            historyLen: target.decisionHistory.length,
            lastAction: target.decisionHistory[target.decisionHistory.length - 1]?.action,
          };
        }, candidateId);
        if (!state) throw new Error('localStorage 상태 조회 실패');
        if (state.status !== 'approved') throw new Error('승인 후 상태 불일치: ' + state.status);
        if (state.historyLen !== 1) throw new Error('이력 건수 불일치(기대 1): ' + state.historyLen);
        if (state.lastAction !== 'approve') throw new Error('이력 action 불일치(기대 approve): ' + state.lastAction);
        const note = await page.locator('.terminal-note').innerText();
        if (!note.includes('추가 결정을 내릴 수 없습니다')) throw new Error('종결 안내 문구 누락: ' + note);
      `,
    });
    assert_ok(result, '승인 액션');
  },
);

test(
  'AC3 — 보류 액션 클릭 → 상태 배지 전이 + 이력 기록 가드',
  { skip: _brixOutOfScope },
  async (t) => {
    if (!(await checkE2eAvailable(t))) return;

    const { server, port } = await startStaticServer('.');
    t.after(() => server.close());
    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/release-approval-canary/`;

    const result = await callE2eRunner({
      url,
      label: '보류 액션 — 배지 전이 + localStorage 이력 기록',
      scriptText: `
        await page.waitForSelector('.candidate-card', { timeout: 5000 });
        const first = page.locator('.candidate-card').first();
        const candidateId = await first.getAttribute('data-card-id');
        await first.click();
        await page.getByRole('button', { name: '보류', exact: true }).click();
        await page.waitForSelector('.detail-panel .status-badge--held', { timeout: 5000 });
        const state = await page.evaluate((cid) => {
          const raw = localStorage.getItem('bf:release-approval-canary:v1');
          if (!raw) return null;
          const data = JSON.parse(raw);
          const target = data.candidates.find((c) => c.id === cid);
          if (!target) return null;
          return {
            status: target.status,
            historyLen: target.decisionHistory.length,
            lastAction: target.decisionHistory[target.decisionHistory.length - 1]?.action,
          };
        }, candidateId);
        if (!state) throw new Error('localStorage 상태 조회 실패');
        if (state.status !== 'held') throw new Error('보류 후 상태 불일치: ' + state.status);
        if (state.historyLen !== 1) throw new Error('이력 건수 불일치(기대 1): ' + state.historyLen);
        if (state.lastAction !== 'hold') throw new Error('이력 action 불일치(기대 hold): ' + state.lastAction);
        // 보류 상태에서는 재검토 요청 버튼이 활성화되어야 한다(전이표 T4).
        const reopenDisabled = await page.locator('[data-action="reopen"]').isDisabled();
        if (reopenDisabled) throw new Error('보류 상태에서 재검토 요청 버튼이 비활성화됨');
      `,
    });
    assert_ok(result, '보류 액션');
  },
);

/** e2e-runner 응답을 검증하고 실패 시 stdout 을 포함해 throw. */
function assert_ok(result, label) {
  if (!result || result.ok !== true || result.passed !== true) {
    const stdout = result?.stdout ? `\nstdout:\n${result.stdout}` : '';
    throw new Error(`[${label}] e2e-runner 실패: ${JSON.stringify({ ok: result?.ok, passed: result?.passed })}${stdout}`);
  }
}
