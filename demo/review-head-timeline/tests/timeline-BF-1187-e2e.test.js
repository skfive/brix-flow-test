// BF-1187 — 리뷰 head 전환 타임라인 E2E 회귀 가드
// 대상: BF-1185 로 머지된 demo/review-head-timeline SPA (index.html + timeline.js)
// 실행: node --test demo/review-head-timeline/tests/*.test.js
//
// timeline.js 의 로직 단위 테스트(judgeState/formatRelative/buildTransitionSteps 등)는
// tests/timeline-BF-1185.test.js 가 이미 커버 — 여기서는 재작성하지 않는다.
// 이 파일은 tester 고유 영역만 다룬다:
//  1) UI 마크업 contract — E2E 스크립트가 참조하는 id/class/breakpoint 가 실존하는지 정적 가드
//  2) 실 브라우저 E2E — 페이지 렌더, head 전환 재현의 결정론성, 키보드 조작, 반응형 레이아웃
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// ── brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip ──
const _BRIX_MY_MODULE = 'review-head-timeline';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// ── 1) 정적 UI 마크업 contract ────────────────────────────────────────
// 아래 id/class 는 이 파일의 E2E scriptText 가 selector 로 참조한다.
// dev 산출물이 이 fact 를 silent 하게 깨면(id 변경/삭제) 이 가드가 먼저 잡는다.
test('UI 마크업 contract — E2E 가 참조하는 id/class/breakpoint 존재', { skip: _brixOutOfScope }, () => {
  const htmlPath = path.resolve('demo/review-head-timeline/index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const requiredTokens = [
    'id="timeline"',
    'id="spine"',
    'id="head-badge"',
    'id="goto-head"',
    'id="track"',
    'id="track-cap"',
    'id="card-prev"',
    'id="card-curr"',
    'id="live"',
    'id="compare-heading"',
    'rht-timeline__node',
    'rht-badge--review',
    'rht-badge--new',
    'rht-badge--same',
    '@media (max-width:639px)',
  ];
  for (const token of requiredTokens) {
    assert.ok(html.includes(token), `HTML 마크업 contract 누락: ${token}`);
  }
});

// ── 정적 서버 helper (e2e-runner-ci-guard skill 의 canonical helper) ────
// timeline.js 를 <script type="module"> 로 import 하므로 올바른 Content-Type 이
// 없으면 브라우저가 strict MIME 검사에서 모듈 로드를 거부한다 — 확장자별 매핑 추가.
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
      const contentType = MIME_TYPES[path.extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType }).end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

// ── 2) 실 브라우저 E2E (compose 네트워크의 e2e-runner 컨테이너) ─────────
let server;
let port;
let e2eAvailable = true;
let skipReason = null;
const host = process.env.BRIX_PERSONA_HOST || 'worker';

test.before(async () => {
  if (_brixOutOfScope) return;
  ({ server, port } = await startStaticServer('demo/review-head-timeline'));

  if (process.env.BRIX_E2E_SKIP === '1') {
    e2eAvailable = false;
    skipReason = 'BRIX_E2E_SKIP=1 — CI 결정성 가드';
    return;
  }
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

async function runE2E(t, label, scriptText, timeoutMs = 30000) {
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }
  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing (BRIX_RUN_ID/BRIX_JIRA_KEY)');

  const url = `http://${host}:${port}/`;
  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({ url, label, scriptText, timeoutMs }),
  });
  assert.equal(res.ok, true, `e2e-runner HTTP 실패: ${res.status}`);
  const json = await res.json();
  assert.equal(json.passed, true, `E2E 실패[${label}] — stdout: ${json.stdout}`);
}

// AC1 — 페이지 진입/타임라인 렌더
test('페이지 진입 — 타임라인 4세대 렌더 + head 배지/전환단계', { skip: _brixOutOfScope }, async (t) => {
  const scriptText = `
    await page.waitForSelector('#timeline .rht-timeline__node');
    const nodeCount = await page.locator('#timeline .rht-timeline__node').count();
    if (nodeCount !== 4) throw new Error('timeline node count mismatch: ' + nodeCount);

    const headNode = page.locator('#timeline .rht-timeline__node[data-gen="3"]');
    const headClasses = await headNode.getAttribute('class');
    if (!headClasses.includes('is-head') || !headClasses.includes('is-active')) {
      throw new Error('head node missing is-head/is-active: ' + headClasses);
    }

    const badgeText = (await page.locator('#head-badge').innerText()).trim();
    if (!badgeText.includes('검토 필요')) throw new Error('head badge mismatch: ' + badgeText);

    const compareHeading = (await page.locator('#compare-heading').innerText()).trim();
    if (compareHeading !== '세대 비교 — G2 → G3') throw new Error('compare heading mismatch: ' + compareHeading);

    const stepCount = await page.locator('#track .rht-step').count();
    if (stepCount !== 4) throw new Error('transition step count mismatch: ' + stepCount);

    const lastStepStatus = await page.locator('#track .rht-step').nth(3).getAttribute('data-status');
    if (lastStepStatus !== 'blocked') throw new Error('applied step status mismatch: ' + lastStepStatus);
  `;
  await runE2E(t, '페이지 진입 — 타임라인 렌더/head 배지/전환단계', scriptText);
});

// AC2 — 예시 SHA 입력 시나리오(head 전환 재현) → 상태 배지/비교 카드 결정론적 일치
test('head 전환 재현 — 상태 배지/비교 카드 결정론', { skip: _brixOutOfScope }, async (t) => {
  const scriptText = `
    await page.waitForSelector('#timeline .rht-timeline__node');

    async function selectGen(gen) {
      await page.locator('#timeline .rht-timeline__node[data-gen="' + gen + '"]').click();
      await page.waitForTimeout(250);
      const heading = (await page.locator('#compare-heading').innerText()).trim();
      const state = await page.locator('#card-curr').getAttribute('data-state');
      const reason = (await page.locator('#card-curr .reason').innerText()).trim();
      return { heading, state, reason };
    }

    const first = await selectGen(1);
    if (first.state !== 'new') throw new Error('G1 state mismatch: ' + first.state);
    if (first.heading !== '세대 비교 — G0 → G1') throw new Error('G1 heading mismatch: ' + first.heading);
    if (!first.reason.includes('새 head로 전환됨')) throw new Error('G1 reason phrase mismatch: ' + first.reason);

    // 다른 세대로 이동했다가 같은 세대로 복귀 — 재현 시 동일 출력이어야 결정론적.
    await selectGen(2);
    const second = await selectGen(1);
    if (JSON.stringify(second) !== JSON.stringify(first)) {
      throw new Error('non-deterministic re-render: ' + JSON.stringify(second) + ' vs ' + JSON.stringify(first));
    }

    const review = await selectGen(3);
    if (review.state !== 'review') throw new Error('G3 state mismatch: ' + review.state);
    if (!review.reason.includes('미해결 스레드')) throw new Error('G3 reason mismatch: ' + review.reason);
  `;
  await runE2E(t, 'head 전환 재현 — 상태 배지/비교 카드 결정론', scriptText);
});

// 관련 범위 — 키보드 조작 (roving tabindex, Home/End, Escape)
test('키보드 조작 — Home/ArrowRight/End 이동 + Escape 상세 닫기', { skip: _brixOutOfScope }, async (t) => {
  const scriptText = `
    await page.waitForSelector('#timeline .rht-timeline__node');
    const activeGen = async () => page.locator('#timeline .rht-timeline__node.is-active').getAttribute('data-gen');

    await page.locator('#timeline .rht-timeline__node.is-active').focus();

    await page.keyboard.press('Home');
    await page.waitForTimeout(150);
    let gen = await activeGen();
    if (gen !== '0') throw new Error('Home 이 G0 를 선택하지 않음: ' + gen);

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    gen = await activeGen();
    if (gen !== '1') throw new Error('ArrowRight 가 G1 로 이동하지 않음: ' + gen);

    await page.keyboard.press('End');
    await page.waitForTimeout(150);
    gen = await activeGen();
    if (gen !== '3') throw new Error('End 가 G3 를 선택하지 않음: ' + gen);

    let expanded = await page.locator('#card-curr').getAttribute('aria-expanded');
    if (expanded !== 'true') throw new Error('새 세대 선택 후 상세가 기본 열림 상태가 아님: ' + expanded);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    expanded = await page.locator('#card-curr').getAttribute('aria-expanded');
    if (expanded !== 'false') throw new Error('Escape 가 상세를 닫지 않음: ' + expanded);

    const detailHidden = await page.locator('#card-curr [data-detail]').getAttribute('hidden');
    if (detailHidden === null) throw new Error('Escape 이후에도 상세 패널이 보임');
  `;
  await runE2E(t, '키보드 조작 — Home/ArrowRight/End/Escape', scriptText);
});

// 관련 범위 — 반응형 (639px 이하 세로 레이아웃)
test('반응형 — 모바일 뷰포트에서 타임라인 세로 레이아웃 전환', { skip: _brixOutOfScope }, async (t) => {
  const scriptText = `
    await page.setViewportSize({ width: 375, height: 800 });
    await page.reload();
    await page.waitForSelector('#timeline .rht-timeline__node');

    const flexDirection = await page.locator('#timeline').evaluate((el) => getComputedStyle(el).flexDirection);
    if (flexDirection !== 'column') throw new Error('모바일 너비에서 flex-direction 이 column 이 아님: ' + flexDirection);

    const spineDisplay = await page.locator('#spine').evaluate((el) => getComputedStyle(el).display);
    if (spineDisplay !== 'none') throw new Error('모바일 너비에서 spine 이 숨겨지지 않음: ' + spineDisplay);
  `;
  await runE2E(t, '반응형 — 모바일 세로 레이아웃', scriptText);
});
