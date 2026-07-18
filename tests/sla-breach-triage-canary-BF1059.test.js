// SLA 위반 대응 큐 — E2E 회귀 가드 (BF-1059)
// 대상 module: sla-breach-triage-canary (dev PR #265, BF-1057, merge_sha ec4ee6f)
// dev 가 queue.test.js 에서 이미 검증한 순수 로직(정렬 comparator, 상태 전이 함수, 무결성 검증)은
// 여기서 재검증하지 않는다. 이 파일은 tester 고유 영역만 다룬다:
//   1) UI 마크업 계약(root id / section heading id / 빈 상태 클래스) — silent break 가드
//   2) 실 브라우저 e2e — 렌더·fixture 로드·우선순위 정렬 + 담당 지정→해결 전이(AC 수용 기준)
// 실행: node --test tests/sla-breach-triage-canary-BF1059.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// brix-flow-test-scope-guard — focused/related scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'sla-breach-triage-canary';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const MODULE_DIR = new URL('../sla-breach-triage-canary/', import.meta.url);

// ── 1) UI 마크업 계약 — dev 가 정적 로직 테스트에서 다루지 않는 DOM 훅 존재 검증 ──
test('마크업 계약 — 렌더 root id(#sla-root) 존재', { skip: _brixOutOfScope }, () => {
  const html = fs.readFileSync(new URL('index.html', MODULE_DIR), 'utf-8');
  assert.ok(html.includes('id="sla-root"'), '#sla-root 가 있어야 app.js 가 렌더 대상을 찾을 수 있다');
  assert.ok(html.includes('<script type="module" src="./app.js">'), 'app.js 모듈 스크립트 로드 지점이 있어야 한다');
});

test('마크업 계약 — app.js 가 섹션 heading id·빈 상태 클래스를 생성한다', { skip: _brixOutOfScope }, () => {
  const appJs = fs.readFileSync(new URL('app.js', MODULE_DIR), 'utf-8');
  assert.ok(appJs.includes('"queue-heading"'), '대응 대기열 섹션 heading id(queue-heading) 생성 코드가 있어야 한다');
  assert.ok(appJs.includes('"resolved-heading"'), '해결됨 섹션 heading id(resolved-heading) 생성 코드가 있어야 한다');
  assert.ok(appJs.includes('sla-empty'), 'AC-7 빈 대기열 상태 클래스(sla-empty)가 있어야 한다');
  assert.ok(appJs.includes('sla-card__actions'), '담당지정/해결 액션 영역 클래스가 있어야 한다');
  assert.ok(appJs.includes('sla-readonly'), 'AC-5 해결됨 읽기전용 영역 클래스가 있어야 한다');
});

// ── 정적 서버(self-contained) — e2e-runner 컨테이너가 이 worker 컨테이너로 도달 ──
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
      // strict MIME 체크(module script) 대응 — 확장자별 Content-Type 지정.
      const ext = path.extname(target).toLowerCase();
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime }).end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

// ── 2) 실 브라우저 e2e — 렌더/fixture/정렬 + 담당 지정→해결 전이 ──
test('e2e — 렌더·fixture 로드·우선순위 정렬 + 담당 지정→해결 전이', { skip: _brixOutOfScope }, async (t) => {
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

  const { server, port } = await startStaticServer('.'); // repo convention capsule: serve_root '.'
  t.after(() => server.close());

  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/sla-breach-triage-canary/`;

  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');

  const scriptText = `
    // AC(렌더/fixture/정렬): 대응 대기열 섹션의 카드 순서가 severity 랭크 기준으로 정렬돼야 한다.
    const pendingOrder = await page.evaluate(() => {
      const section = document.querySelector('section[aria-labelledby="queue-heading"]');
      if (!section) return null;
      return Array.from(section.querySelectorAll('.sla-card')).map((c) => {
        const idEl = c.querySelector('[id^="assignee-"], [id^="note-"]');
        return idEl ? idEl.id.replace(/^(assignee|note)-/, '') : null;
      });
    });
    if (!pendingOrder) throw new Error('queue-heading 섹션을 찾을 수 없음');
    const expectedOrder = ['SLA-1001', 'SLA-1002', 'SLA-1003'];
    if (JSON.stringify(pendingOrder) !== JSON.stringify(expectedOrder)) {
      throw new Error('우선순위 정렬 불일치: ' + JSON.stringify(pendingOrder));
    }

    const summaryParts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.sla-summary > span')).map((s) => s.textContent.trim())
    );
    if (!summaryParts[0].includes('3') || !summaryParts[1].includes('1') || !summaryParts[2].includes('4')) {
      throw new Error('요약 카운트 불일치: ' + JSON.stringify(summaryParts));
    }

    // AC(상태 전이): SLA-1001 담당 지정 → 해결까지 전이가 누락 없이 이어져야 한다.
    const pendingCard = page.locator('.sla-card:has(#assignee-SLA-1001)');
    if ((await pendingCard.count()) !== 1) throw new Error('SLA-1001 담당 지정 전 카드가 없음');
    await pendingCard.locator('.sla-input').fill('이테스트');
    await pendingCard.locator('.sla-btn--primary').click();

    const assignedCard = page.locator('.sla-card:has(#note-SLA-1001)');
    if ((await assignedCard.count()) !== 1) throw new Error('SLA-1001 이 담당지정 상태로 전이되지 않음');
    const assignedStatus = await assignedCard.locator('.sla-badge-status').textContent();
    if (!assignedStatus.includes('담당지정')) throw new Error('담당지정 배지 불일치: ' + assignedStatus);

    await assignedCard.locator('.sla-textarea').fill('테스트 해결 완료');
    await assignedCard.locator('.sla-btn--primary').click();

    const resolvedSectionText = await page.evaluate(() => {
      const section = document.querySelector('section[aria-labelledby="resolved-heading"]');
      return section ? section.textContent : null;
    });
    if (!resolvedSectionText || !resolvedSectionText.includes('이테스트') || !resolvedSectionText.includes('테스트 해결 완료')) {
      throw new Error('SLA-1001 이 해결됨 섹션에 반영되지 않음: ' + resolvedSectionText);
    }
    const staleAssignedInputs = await page.locator('#note-SLA-1001').count();
    if (staleAssignedInputs !== 0) throw new Error('해결 후에도 담당지정 액션 입력이 남아있음(읽기전용 미적용)');
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
      label: 'SLA 위반 대응 큐 — 렌더/정렬 + 담당지정→해결 전이',
      scriptText,
      timeoutMs: 30000,
    }),
  });

  const body = await res.json();
  assert.equal(res.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(body)}`);
  assert.equal(body.passed, true, `e2e 시나리오 실패: ${JSON.stringify(body)}`);
});
