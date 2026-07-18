// BF-1041 반품 승인 워크벤치 — E2E 회귀 가드 (실 브라우저, e2e-runner)
// 실행: node --test return-approvals-canary/tests/return-approvals-canary-BF1041-e2e.test.js
//
// dev(BF-1039) 가 이미 검증한 순수 로직(logic.js)·fixture 정합성은 재검증하지 않는다
// (../tests/return-approvals-canary-BF1039.test.js 참고). 이 파일은 tester 고유 영역만 다룬다:
//   1) UI 마크업 contract — E2E 셀렉터가 의존하는 id/class 토큰이 silent break 되지 않게 fact 박제
//   2) 실 브라우저 E2E — 페이지 렌더/fixture 목록 표시, 승인·보류 액션 상태 전이(app.js 의 DOM 배선)
//
// AC:
//   - Given /return-approvals-canary, When E2E 실행 시, Then 페이지 렌더·fixture 목록 표시가 검증된다
//   - Given 승인/보류 액션, When E2E 실행 시, Then 상태 전이가 가드로 확인된다
//   - Given focused 범위, When 테스트 실행 시, Then return-approvals-canary module 만 대상으로 한다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = path.join(__dirname, '..');

// ── brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip ──
const MY_MODULE = 'return-approvals-canary';
const inScope = !(
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== MY_MODULE
);
const scopeSkip = inScope ? false : `focused scope skip — 대상 module=${process.env.BRIX_TEST_MODULE}`;

// ─────────────────────────────────────────────────────────
// 1) UI 마크업 contract — 정적 가드 (E2E 셀렉터가 의존하는 토큰)
// ─────────────────────────────────────────────────────────

test(
  '마크업 contract — index.html 핵심 id (목록/필터/토스트/승인 다이얼로그)',
  { skip: scopeSkip },
  () => {
    const html = fs.readFileSync(path.join(MODULE_DIR, 'index.html'), 'utf-8');
    for (const id of [
      'id="rw-filters"',
      'id="rw-tbody"',
      'id="rw-empty"',
      'id="rw-load-error"',
      'id="rw-detail"',
      'id="rw-toast-region"',
      'id="rw-approve-backdrop"',
      'id="rw-approve-confirm"',
      'id="rw-approve-cancel"',
    ]) {
      assert.ok(html.includes(id), `index.html 에 ${id} 존재해야 함 — E2E 셀렉터 의존`);
    }
    assert.ok(html.includes("script type=\"module\" src=\"./app.js\""), 'app.js 모듈 스크립트 로드 유지되어야 함');
  }
);

test(
  '마크업 contract — app.js 가 렌더링 시 생성하는 E2E 셀렉터 토큰 (class/dataset)',
  { skip: scopeSkip },
  () => {
    const appJs = fs.readFileSync(path.join(MODULE_DIR, 'app.js'), 'utf-8');
    for (const token of [
      "class: 'rw-row'",
      "class: 'rw-filter'",
      "class: \`badge badge--${status}\`",
      "dataset: { filter: f.key }",
      "dataset: { id: r.id }",
      "id: 'rw-hold-reason'",
      "class: 'hold-form'",
      "class: 'rw-actions'",
      "class: 'btn btn--primary'",
      "class: 'btn btn--secondary'",
    ]) {
      assert.ok(appJs.includes(token), `app.js 에 "${token}" 존재해야 함 — 목록/액션 DOM 배선 회귀 가드`);
    }
  }
);

// ─────────────────────────────────────────────────────────
// 2) 실 브라우저 E2E — e2e-runner
// ─────────────────────────────────────────────────────────

const E2E_HEALTH_URL = 'http://e2e-runner:3030/health';
const E2E_RUN_URL = 'http://e2e-runner:3030/run';
const PAGE_URL = `http://${process.env.BRIX_PERSONA_HOST || 'worker'}:8080/`;

let e2eAvailable = true;
let e2eSkipReason = null;

test.before(async () => {
  if (scopeSkip) return; // module-scope 자체가 skip 이면 health probe 불필요
  if (process.env.BRIX_E2E_SKIP === '1') {
    e2eAvailable = false;
    e2eSkipReason = 'BRIX_E2E_SKIP=1 — CI 결정성 가드';
    return;
  }
  try {
    const probe = await fetch(E2E_HEALTH_URL, { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) {
      e2eAvailable = false;
      e2eSkipReason = `e2e-runner unhealthy (${probe.status}) — skip`;
    }
  } catch (err) {
    e2eAvailable = false;
    e2eSkipReason = `e2e-runner 도달 불가 (${err.message}) — skip (CI 환경 정상)`;
  }
});

async function runE2E(label, scriptText, timeoutMs) {
  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity(BRIX_RUN_ID/BRIX_JIRA_KEY) missing');
  const res = await fetch(E2E_RUN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({ url: PAGE_URL, label, scriptText, timeoutMs }),
  });
  const body = await res.json();
  return body;
}

test(
  'E2E — /return-approvals-canary 렌더 + fixture 12건 목록 표시',
  { skip: scopeSkip },
  async (t) => {
    if (!e2eAvailable) {
      t.skip(e2eSkipReason);
      return;
    }
    const result = await runE2E(
      '반품 승인 워크벤치 — 렌더/fixture 목록 표시',
      `
        await page.waitForSelector('#rw-tbody tr.rw-row', { timeout: 10000 });
        const rowCount = await page.locator('#rw-tbody tr.rw-row').count();
        if (rowCount !== 12) throw new Error('fixture row count mismatch: ' + rowCount);

        const filterCount = await page.locator('#rw-filters .rw-filter').count();
        if (filterCount !== 4) throw new Error('filter tab count mismatch: ' + filterCount);

        const allCountText = await page.locator('#rw-filters .rw-filter[data-filter="all"] .count').innerText();
        if (allCountText !== '12') throw new Error('all filter count mismatch: ' + allCountText);

        const emptyHidden = await page.locator('#rw-empty').isHidden();
        if (!emptyHidden) throw new Error('rows exist — empty-state 는 hidden 이어야 함');

        const title = await page.locator('.rw-title').innerText();
        if (!title.includes('반품 승인 워크벤치')) throw new Error('title mismatch: ' + title);
      `,
      30000
    );
    assert.ok(result.ok, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
    assert.ok(result.passed, `렌더/목록 표시 시나리오 fail: ${result.stdout}`);
  }
);

test(
  'E2E — 승인/보류 액션 상태 전이 (pending → approved / pending → held)',
  { skip: scopeSkip },
  async (t) => {
    if (!e2eAvailable) {
      t.skip(e2eSkipReason);
      return;
    }
    const result = await runE2E(
      '반품 승인 워크벤치 — 승인/보류 상태 전이',
      `
        // 승인 전이: RTN-1001 (pending) -> approved
        await page.locator('tr.rw-row[data-id="RTN-1001"]').click();
        await page.locator('#rw-detail .rw-actions .btn--primary').click();
        await page.waitForSelector('#rw-approve-backdrop:not([hidden])', { timeout: 5000 });
        await page.locator('#rw-approve-confirm').click();
        await page.waitForTimeout(300);

        const approvedBadge = await page.locator('#rw-detail .badge').innerText();
        if (!approvedBadge.includes('승인')) throw new Error('approve transition failed, badge=' + approvedBadge);

        const overlayAfterApprove = await page.evaluate(
          () => localStorage.getItem('brix:return-approvals-canary:overlay:v1')
        );
        if (!overlayAfterApprove || !overlayAfterApprove.includes('"RTN-1001"') || !overlayAfterApprove.includes('"approved"')) {
          throw new Error('approve overlay not persisted: ' + overlayAfterApprove);
        }

        // 보류 전이: RTN-1002 (pending) -> held
        await page.locator('tr.rw-row[data-id="RTN-1002"]').click();
        await page.locator('#rw-detail .rw-actions .btn--secondary').click();
        await page.waitForSelector('#rw-hold-reason', { timeout: 5000 });
        await page.locator('#rw-hold-reason').fill('BF-1041 e2e 회귀 가드 사유');
        await page.locator('.hold-form .btn--primary').click();
        await page.waitForTimeout(300);

        const heldBadge = await page.locator('#rw-detail .badge').innerText();
        if (!heldBadge.includes('보류')) throw new Error('hold transition failed, badge=' + heldBadge);

        const overlayAfterHold = await page.evaluate(
          () => localStorage.getItem('brix:return-approvals-canary:overlay:v1')
        );
        if (!overlayAfterHold || !overlayAfterHold.includes('"RTN-1002"') || !overlayAfterHold.includes('"held"')) {
          throw new Error('hold overlay not persisted: ' + overlayAfterHold);
        }
      `,
      45000
    );
    assert.ok(result.ok, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
    assert.ok(result.passed, `승인/보류 상태 전이 시나리오 fail: ${result.stdout}`);
  }
);
