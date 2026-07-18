// BF-1053 — /demo/handoff-gap-canary 인수인계 점검 E2E 회귀 가드.
//
// dev(overrides-storage.test.js/domain.test.js/kpi.test.js)가 이미 검증한 순수 로직
// (판정 규칙·필터·저장 왕복·ulid 등)은 재검증하지 않는다. 이 파일은 tester 고유 영역만 본다:
//   1) 정적 마크업/CSS 계약 — 핵심 selector·물리 경로가 silent break 되지 않는지
//   2) 실 브라우저 E2E — 등록/수정/필터/위험 재계산/모바일·키보드 흐름 (e2e-runner)
//
// 결정론: fixture(REFERENCE_NOW 고정)와 각 e2e-runner 호출의 격리된 BrowserContext 덕분에
// 반복 실행해도 항상 같은 초기 상태에서 시작한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'demo';
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
  const DEMO_DIR = path.join(REPO_ROOT, 'demo', 'handoff-gap-canary');
  const STATIC_PORT = 8080;
  const BASE_URL = `http://${process.env.BRIX_PERSONA_HOST || 'worker'}:${STATIC_PORT}`;
  const PAGE_URL = `${BASE_URL}/demo/handoff-gap-canary/`;

  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
  };

  // ---------------------------------------------------------------------
  // 1. 정적 마크업/CSS 계약 가드 (fs 기반, 브라우저·서버 불필요)
  // ---------------------------------------------------------------------

  test('물리 경로 — demo/handoff-gap-canary/index.html 실제 존재 (요청 route 진입 가드)', () => {
    assert.ok(
      existsSync(path.join(DEMO_DIR, 'index.html')),
      '/demo/handoff-gap-canary 진입점 index.html 누락',
    );
  });

  test('마크업 계약 — #app 마운트 지점 + ESM 부트스트랩 스크립트 존재', () => {
    const html = readFileSync(path.join(DEMO_DIR, 'index.html'), 'utf-8');
    assert.ok(html.includes('id="app"'), '#app 마운트 지점 누락 — main.js 가 붙일 대상 없음');
    assert.ok(
      html.includes('<script type="module" src="./main.js">'),
      'ESM 부트스트랩 스크립트 태그 누락',
    );
  });

  test('CSS 계약 — 요약/필터/목록/상세/보완폼 핵심 selector 존재', () => {
    const css = readFileSync(path.join(DEMO_DIR, 'styles.css'), 'utf-8');
    for (const selector of [
      '.hgc-app',
      '.hgc-summary__card',
      '.hgc-filter-tab',
      '.hgc-filter-tab[aria-selected="true"]',
      '.hgc-list-item',
      '.hgc-badge[data-risk="critical"]',
      '.hgc-detail__name',
      '.hgc-back',
      '.hgc-followup__textarea',
      '.hgc-gap-notice',
    ]) {
      assert.ok(css.includes(selector), `CSS selector 누락(silent break 위험): ${selector}`);
    }
  });

  test('CSS 계약 — 모바일 목록/상세 전환은 data-view 속성 기반(§ 모바일 흐름 전제)', () => {
    const css = readFileSync(path.join(DEMO_DIR, 'styles.css'), 'utf-8');
    assert.ok(css.includes('[data-view="list"]'), 'data-view=list 규칙 누락');
    assert.ok(css.includes('[data-view="detail"]'), 'data-view=detail 규칙 누락');
  });

  // ---------------------------------------------------------------------
  // 2. 실 브라우저 E2E — e2e-runner 호출 (CI 결정성 가드 포함)
  // ---------------------------------------------------------------------

  let staticServer = null;
  let e2eAvailable = true;
  let skipReason = null;

  function startStaticServer() {
    const server = http.createServer((req, res) => {
      try {
        const decoded = decodeURIComponent((req.url || '/').split('?')[0]);
        let filePath = path.join(REPO_ROOT, decoded);
        if (!filePath.startsWith(REPO_ROOT)) {
          res.writeHead(403);
          res.end('forbidden');
          return;
        }
        if (existsSync(filePath) && statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }
        if (!existsSync(filePath)) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
        const type = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        createReadStream(filePath).pipe(res);
      } catch (err) {
        res.writeHead(500);
        res.end(String(err && err.message ? err.message : err));
      }
    });
    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(STATIC_PORT, '0.0.0.0', () => resolve(server));
    });
  }

  test.before(async () => {
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
        skipReason = `e2e-runner unhealthy (${probe.status})`;
        return;
      }
    } catch (err) {
      e2eAvailable = false;
      skipReason = `e2e-runner 도달 불가 (${err.message}) — skip`;
      return;
    }

    try {
      staticServer = await startStaticServer();
    } catch (err) {
      e2eAvailable = false;
      skipReason = `정적 서버(${STATIC_PORT}) 기동 실패 — ${err.message}`;
    }
  });

  test.after(async () => {
    if (staticServer) {
      await new Promise((resolve) => staticServer.close(resolve));
    }
  });

  function runE2e(label, scriptText, timeoutMs) {
    const runId = process.env.BRIX_RUN_ID;
    const jiraKey = process.env.BRIX_JIRA_KEY;
    if (!runId || !jiraKey) {
      throw new Error('worker-injected run identity missing (BRIX_RUN_ID/BRIX_JIRA_KEY)');
    }
    return fetch('http://e2e-runner:3030/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Brix-Run-Id': runId,
        'X-Brix-Jira-Key': jiraKey,
      },
      body: JSON.stringify({ url: PAGE_URL, label, scriptText, timeoutMs }),
    }).then((r) => r.json());
  }

  test('E2E — 후속 액션 등록/수정 + 위험 재계산 + 필터 탭 키보드 순회', async (t) => {
    if (!e2eAvailable) {
      t.skip(skipReason);
      return;
    }

    const script = [
      'const row2007 = page.locator(".hgc-list-item[data-id=HO-2007]");',
      'const idText = await row2007.innerText();',
      'if (!idText.includes("HO-2007")) throw new Error("HO-2007 목록 항목 없음: " + idText);',
      'await row2007.click();',
      'await page.waitForSelector(".hgc-followup__textarea");',
      'const beforeBadge = await page.locator(".hgc-detail .hgc-badge").innerText();',
      'if (!beforeBadge.includes("데이터 누락")) throw new Error("HO-2007 초기 등급이 데이터 누락 아님: " + beforeBadge);',
      'await page.locator(".hgc-followup__textarea").fill("창고 재고 태그 부착 완료, 익일 재검수");',
      'await page.locator(".hgc-followup__save").click();',
      'await page.waitForTimeout(150);',
      'const afterBadge = await page.locator(".hgc-detail .hgc-badge").innerText();',
      'if (!afterBadge.includes("정상")) throw new Error("등록 후 위험 재계산 실패, 배지: " + afterBadge);',
      'const stored = await page.evaluate(() => localStorage.getItem("handoff-gap-canary:overrides"));',
      'if (!stored || !stored.includes("HO-2007")) throw new Error("localStorage 영속 실패: " + stored);',
      // 데스크톱(2-pane)에서는 .hgc-back 이 display:none 고정(모바일 전용, 767px 이하에서만 노출) —
      // 목록 패널이 상세와 동시에 보이므로 back 없이 바로 다음 항목을 선택한다.

      'const row2005 = page.locator(".hgc-list-item[data-id=HO-2005]");',
      'await row2005.click();',
      'await page.waitForSelector(".hgc-followup__textarea");',
      'await page.locator(".hgc-followup__textarea").fill("a".repeat(201));',
      'await page.locator(".hgc-followup__save").click();',
      'const errText = await page.locator(".hgc-followup__error").innerText();',
      'if (!/200자 이하/.test(errText)) throw new Error("200자 초과 검증 오류 미표시: " + errText);',
      'await page.locator(".hgc-followup__textarea").fill("점검 완료, 야간 순찰조 인수인계 확인함");',
      'await page.locator(".hgc-followup__save").click();',
      'await page.waitForTimeout(150);',
      'const origin2 = await page.locator(".hgc-followup__origin").innerText();',
      'if (!origin2.includes("로컬 보완됨")) throw new Error("수정 저장 후 origin 배지 미갱신: " + origin2);',

      'const summaryBefore = await page.locator(".hgc-summary").innerText();',
      'await page.locator(".hgc-filter-tab[data-filter=critical]").click();',
      'const criticalRows = await page.locator(".hgc-list .hgc-list-item").count();',
      'if (criticalRows !== 2) throw new Error("critical 필터 결과 건수 불일치: " + criticalRows);',
      'const summaryAfter = await page.locator(".hgc-summary").innerText();',
      'if (summaryBefore !== summaryAfter) throw new Error("필터 전환이 위험 요약을 변경함(EC-03 위반)");',

      'await page.keyboard.press("ArrowRight");',
      'const wrapped = await page.locator(".hgc-filter-tab[aria-selected=true]").getAttribute("data-filter");',
      'if (wrapped !== "all") throw new Error("critical 탭에서 ArrowRight wrap 실패: " + wrapped);',
      'const allRows = await page.locator(".hgc-list .hgc-list-item").count();',
      'if (allRows !== 8) throw new Error("wrap 후 전체 필터 목록 미갱신: " + allRows);',
    ].join('\n');

    const result = await runE2e(
      '[BF-1053] 후속 액션 등록/수정 + 위험 재계산 + 필터 키보드',
      script,
      60000,
    );
    assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
    assert.equal(result.passed, true, `시나리오 실패: ${result.stdout}`);
  });

  test('E2E — 모바일 뷰포트 키보드 선택 → 상세 포커스 이동 → 목록 복귀', async (t) => {
    if (!e2eAvailable) {
      t.skip(skipReason);
      return;
    }

    const script = [
      'await page.setViewportSize({ width: 375, height: 700 });',
      'await page.reload();',
      'await page.waitForSelector(".hgc-list-item");',
      'const first = page.locator(".hgc-list-item").first();',
      'await first.focus();',
      'await page.keyboard.press("Enter");',
      'await page.waitForTimeout(150);',
      'const view = await page.evaluate(() => document.querySelector(".hgc-app").getAttribute("data-view"));',
      'if (view !== "detail") throw new Error("키보드 Enter 로 상세 진입 실패, data-view=" + view);',
      'const focusedIsName = await page.evaluate(() => document.activeElement != null && document.activeElement.classList.contains("hgc-detail__name"));',
      'if (!focusedIsName) throw new Error("모바일/키보드 선택 시 상세 헤딩으로 포커스 이동 안 됨");',
      'await page.locator(".hgc-back").click();',
      'await page.waitForTimeout(150);',
      'const view2 = await page.evaluate(() => document.querySelector(".hgc-app").getAttribute("data-view"));',
      'if (view2 !== "list") throw new Error("목록 복귀 실패, data-view=" + view2);',
      'const focusedIsRow = await page.evaluate(() => document.activeElement != null && document.activeElement.classList.contains("hgc-list-item"));',
      'if (!focusedIsRow) throw new Error("목록 복귀 시 이전 선택 항목으로 포커스 복귀 안 됨");',
    ].join('\n');

    const result = await runE2e(
      '[BF-1053] 모바일 뷰포트 키보드 선택 + 상세 포커스 + 목록 복귀',
      script,
      30000,
    );
    assert.equal(result.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
    assert.equal(result.passed, true, `시나리오 실패: ${result.stdout}`);
  });
}
