// 워크플로 펄스 — E2E 회귀 가드 (BF-1211)
// 대상: demo/workflow-pulse/index.html (병합된 BF-1209 최종 코드).
// 정적 단위 로직(전이 테이블/시드/버튼 규칙)은 demo/workflow-pulse/tests/workflow.test.js 가 이미 검증하므로
// 여기서는 실 브라우저 렌더링 · 버튼 클릭에 의한 상태 전이 · 새로고침 초기화 · reduced-motion 만 검증한다.
import test from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'workflow-pulse';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// 확장자 → MIME 매핑. `type="module"` 스크립트는 strict MIME 체크로 인해
// Content-Type 이 비어 있으면(기본 fs 서빙) 브라우저가 로드를 거부한다.
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// serveRoot 아래의 정적 파일만 노출하는 self-contained 서버. listen(0) 으로 포트 자동 할당.
// serve root = repo root("."): index.html 의 `type="module"` import('../../src/demo/workflow-pulse/workflow.js')
// 가 URL 기준으로 정상 해석되려면 정적 서버 root 가 repo root 여야 한다 (route_mapping: root-relative-static).
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
let e2eAvailable = true;
let skipReason = null;

test.before(async () => {
  const { server: s, port: p } = await startStaticServer('.');
  server = s;
  port = p;

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

test.after(() => {
  if (server) server.close();
});

async function runE2E(t, { label, scriptText, timeoutMs = 30000 }) {
  if (_brixOutOfScope) {
    t.skip('focused scope — workflow-pulse 외 module');
    return;
  }
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }
  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity(BRIX_RUN_ID/BRIX_JIRA_KEY) missing');

  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/demo/workflow-pulse/`;

  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({ url, label, scriptText, timeoutMs }),
  });

  const body = await res.json();
  assertPassed(body, label);
}

function assertPassed(body, label) {
  if (!body || body.ok !== true || body.passed !== true) {
    const detail = body && body.stdout ? String(body.stdout).slice(-2000) : JSON.stringify(body);
    throw new Error(`e2e-runner 실패 [${label}]: ${detail}`);
  }
}

// ── 시나리오 1 — 렌더링 + 초기 데이터 로드 ─────────────────────────────
test('[BF-1211] 워크플로 펄스 — 렌더링 + 초기 데이터 로드', { skip: _brixOutOfScope }, async (t) => {
  const scriptText = `
    const stepCount = await page.locator('#wp-rail .wp-step').count();
    if (stepCount !== 6) throw new Error('rail step count mismatch: ' + stepCount);
    const colCount = await page.locator('#wp-board .wp-col').count();
    if (colCount !== 6) throw new Error('board column count mismatch: ' + colCount);

    const expected = { requested: 2, planning: 1, in_development: 2, in_review: 1, testing: 1, done: 1 };
    for (const [state, expectedCount] of Object.entries(expected)) {
      const boardText = await page.locator('#wp-board .wp-col.st-' + state + ' .wp-count').innerText();
      const boardActual = Number(boardText.trim());
      if (boardActual !== expectedCount) throw new Error('board count mismatch for ' + state + ': expected ' + expectedCount + ' got ' + boardActual);

      const railText = await page.locator('#wp-rail .wp-step.st-' + state + ' .wp-step__count').innerText();
      const railActual = Number(railText.trim());
      if (railActual !== expectedCount) throw new Error('rail count mismatch for ' + state + ': expected ' + expectedCount + ' got ' + railActual);
    }

    const title = await page.locator('h1').innerText();
    if (!title.includes('워크플로 펄스')) throw new Error('title mismatch: ' + title);
  `;
  await runE2E(t, {
    label: '워크플로 펄스 — 렌더링 + 초기 데이터 로드(레일/보드 6단계, 시드 카운트)',
    scriptText,
  });
});

// ── 시나리오 2 — 상태 전이 버튼 흐름 + 새로고침 초기화 ─────────────────
test('[BF-1211] 워크플로 펄스 — 상태 전이 버튼 흐름 + 새로고침 초기화', { skip: _brixOutOfScope }, async (t) => {
  const scriptText = `
    const countOf = async (state) => {
      const text = await page.locator('#wp-board .wp-col.st-' + state + ' .wp-count').innerText();
      return Number(text.trim());
    };

    const before = {
      requested: await countOf('requested'),
      planning: await countOf('planning'),
      in_review: await countOf('in_review'),
      in_development: await countOf('in_development'),
    };

    // ADVANCE: requested -> planning (첫 requested 카드 '기획 시작' 클릭)
    await page.locator('#wp-board .wp-col.st-requested .wp-card').first()
      .getByRole('button', { name: '기획 시작' }).click();
    await page.waitForTimeout(150);

    const afterAdvance = { requested: await countOf('requested'), planning: await countOf('planning') };
    if (afterAdvance.requested !== before.requested - 1) throw new Error('ADVANCE 후 requested count 불일치: ' + afterAdvance.requested);
    if (afterAdvance.planning !== before.planning + 1) throw new Error('ADVANCE 후 planning count 불일치: ' + afterAdvance.planning);

    // REJECT: in_review -> in_development (첫 in_review 카드 '반려' 클릭)
    await page.locator('#wp-board .wp-col.st-in_review .wp-card').first()
      .getByRole('button', { name: '반려' }).click();
    await page.waitForTimeout(150);

    const afterReject = { in_review: await countOf('in_review'), in_development: await countOf('in_development') };
    if (afterReject.in_review !== before.in_review - 1) throw new Error('REJECT 후 in_review count 불일치: ' + afterReject.in_review);
    if (afterReject.in_development !== before.in_development + 1) throw new Error('REJECT 후 in_development count 불일치: ' + afterReject.in_development);

    // 새로고침 → 인메모리 시드로 초기화 (영속 저장소 없음)
    await page.reload();
    await page.waitForSelector('#wp-board .wp-col');

    const seed = { requested: 2, planning: 1, in_development: 2, in_review: 1, testing: 1, done: 1 };
    for (const [state, expectedCount] of Object.entries(seed)) {
      const actual = await countOf(state);
      if (actual !== expectedCount) throw new Error('새로고침 후 ' + state + ' count 시드 불일치: expected ' + expectedCount + ' got ' + actual);
    }
  `;
  await runE2E(t, {
    label: '워크플로 펄스 — 상태 전이(ADVANCE/REJECT) 버튼 흐름 + 새로고침 초기화',
    scriptText,
    timeoutMs: 40000,
  });
});

// ── 시나리오 3 — reduced-motion 대체 동작 ──────────────────────────────
test('[BF-1211] 워크플로 펄스 — reduced-motion 대체 동작', { skip: _brixOutOfScope }, async (t) => {
  const scriptText = `
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await page.waitForSelector('#wp-board .wp-col');

    const activeSelector = '#wp-board .wp-col.st-planning .wp-count--active';
    const hasActive = await page.locator(activeSelector).count();
    if (hasActive !== 1) throw new Error('reduced-motion 시나리오: planning 활성 count 요소를 찾을 수 없음 (count=' + hasActive + ')');

    const animationName = await page.locator(activeSelector).evaluate((el) => getComputedStyle(el).animationName);
    if (animationName !== 'none') throw new Error('reduced-motion 미적용 — pulse 애니메이션 유지됨: ' + animationName);

    const afterContent = await page.locator(activeSelector).evaluate((el) => getComputedStyle(el, '::after').content);
    if (!afterContent || !afterContent.includes('진행중')) throw new Error('reduced-motion 대체 텍스트(::after "진행중") 누락: ' + afterContent);

    const cardTransition = await page.locator('#wp-board .wp-col.st-planning .wp-card').first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    if (!/^0s/.test(cardTransition)) throw new Error('reduced-motion 시 카드 hover transition 미해제: ' + cardTransition);
  `;
  await runE2E(t, {
    label: '워크플로 펄스 — reduced-motion 시 pulse 애니메이션 대체(텍스트 표시)',
    scriptText,
  });
});
