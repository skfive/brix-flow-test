/**
 * tests/e2e/sync-status/status-center.e2e.test.js — 상태 센터 브라우저 E2E 회귀 가드 (BF-1166)
 *
 * dev(BF-1164) 는 순수 함수만 단위 검증했고 실제 DOM/타이머/키보드 인터랙션은 검증하지 않았다.
 * 본 파일은 e2e-runner(compose 네트워크 :3030) 로 실제 브라우저에서 3개의 독립 시나리오를 검증한다:
 *
 *   1. 상태 전이(idle→syncing→up_to_date) + 필터 흐름
 *   2. 중복 실행 방지(AC-05) — syncing 중 재클릭이 cursor 를 이중 소비하지 않음
 *   3. 오류 재시도(conflict/failed) + 접근성(키보드 포커스/Enter, aria-live polite/assertive)
 *
 * SYNC_DELAY_MS 는 status.js 에 600ms 로 고정되어 있어(난수 없음) 700ms 대기는 결정론적이다.
 * fixtures.js 의 repo-alpha(['clean','stale','clean','conflict']), repo-beta(['error','error','clean'])
 * outcome 큐도 고정 값이라 재실행해도 항상 같은 결과가 나온다.
 *
 * 실행: node --test tests/e2e/sync-status/status-center.e2e.test.js
 * (worker 환경에서는 BRIX_E2E_SKIP 을 명령줄에 절대 설정하지 않는다 — .claude/skills/e2e-runner-ci-guard 참고)
 */
import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..');

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'sync-status';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

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

async function checkE2eHealth() {
  try {
    const probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
    return probe.ok;
  } catch {
    return false;
  }
}

async function runE2e({ url, label, scriptText, timeoutMs = 30000 }) {
  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) {
    throw new Error('worker-injected run identity missing (BRIX_RUN_ID/BRIX_JIRA_KEY) — placeholder 로 대체 금지');
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

test('BF-1166 E2E-1 — 상태 전이(idle→syncing→up_to_date) + 필터 흐름', { skip: _brixOutOfScope }, async (t) => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return;
  }
  if (!(await checkE2eHealth())) {
    t.skip('e2e-runner 도달 불가 (CI 환경 정상)');
    return;
  }

  const { server, port } = await startStaticServer(ROOT);
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/src/routes/sync-status/`;

  const scriptText = `
    await page.waitForSelector('li[data-repo-id="repo-alpha"]');
    const initState = await page.locator('li[data-repo-id="repo-alpha"]').getAttribute('data-state');
    if (initState !== 'idle') throw new Error('초기 상태가 idle 이 아님: ' + initState);

    await page.locator('button[data-repo-id="repo-alpha"]').click();
    const syncingState = await page.locator('li[data-repo-id="repo-alpha"]').getAttribute('data-state');
    if (syncingState !== 'syncing') throw new Error('클릭 직후 syncing 전이 실패: ' + syncingState);
    const busy = await page.locator('button[data-repo-id="repo-alpha"]').getAttribute('aria-busy');
    if (busy !== 'true') throw new Error('진행 중 버튼에 aria-busy="true" 미설정: ' + busy);

    await new Promise((r) => setTimeout(r, 700));
    const finalState = await page.locator('li[data-repo-id="repo-alpha"]').getAttribute('data-state');
    if (finalState !== 'up_to_date') throw new Error('최종 상태가 up_to_date 가 아님: ' + finalState);

    await page.getByRole('button', { name: '최신', exact: true }).click();
    const visibleIds = await page.locator('#repo-list li').evaluateAll((els) => els.map((e) => e.dataset.repoId));
    if (!(visibleIds.length === 1 && visibleIds[0] === 'repo-alpha')) {
      throw new Error('최신 필터 결과 불일치: ' + JSON.stringify(visibleIds));
    }
    const pressed = await page.getByRole('button', { name: '최신', exact: true }).getAttribute('aria-pressed');
    if (pressed !== 'true') throw new Error('선택된 필터 버튼의 aria-pressed 가 true 가 아님: ' + pressed);

    await page.getByRole('button', { name: '충돌', exact: true }).click();
    const isEmptyHidden = await page.locator('#empty-state').isHidden();
    if (isEmptyHidden) throw new Error('필터 무결과(no-match) 시 empty-state 가 표시되지 않음');
  `;

  const result = await runE2e({
    url,
    label: '상태 전이 idle→syncing→up_to_date + 필터 흐름',
    scriptText,
    timeoutMs: 30000,
  });
  assert.ok(result.ok, 'e2e-runner 호출 실패: ' + JSON.stringify(result));
  assert.ok(result.passed, 'E2E 시나리오 실패: ' + result.stdout);
});

test('BF-1166 E2E-2 — 중복 실행 방지(AC-05): syncing 중 재클릭이 cursor 를 이중 소비하지 않음', { skip: _brixOutOfScope }, async (t) => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return;
  }
  if (!(await checkE2eHealth())) {
    t.skip('e2e-runner 도달 불가 (CI 환경 정상)');
    return;
  }

  const { server, port } = await startStaticServer(ROOT);
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/src/routes/sync-status/`;

  // repo-alpha outcomes = ['clean','stale','clean','conflict'].
  // 중복 실행이 막히면 cursor 는 1회만 소비되어 최종 상태가 'up_to_date'(clean) 다.
  // 가드가 깨지면(재진입 허용) 두 번째 타이머가 cursor=1('stale')을 마저 소비해
  // 첫 결과를 덮어쓰며 최종 상태가 'behind' 로 관측된다 — 결정론적 회귀 신호.
  const scriptText = `
    await page.waitForSelector('li[data-repo-id="repo-alpha"]');
    await page.locator('button[data-repo-id="repo-alpha"]').click();
    const disabledAfterFirst = await page.locator('button[data-repo-id="repo-alpha"]').isDisabled();
    if (!disabledAfterFirst) throw new Error('첫 클릭 후 동기화 버튼이 비활성화되지 않음');

    await page.evaluate(() => {
      const btn = document.querySelector('button[data-repo-id="repo-alpha"]');
      if (btn) btn.click();
    });

    await new Promise((r) => setTimeout(r, 700));
    const finalState = await page.locator('li[data-repo-id="repo-alpha"]').getAttribute('data-state');
    if (finalState !== 'up_to_date') {
      throw new Error('중복 실행 방지 실패 — 최종 상태: ' + finalState + ' (기대: up_to_date, 회귀 시 behind)');
    }
  `;

  const result = await runE2e({
    url,
    label: '중복 실행 방지 — syncing 중 재클릭 무시',
    scriptText,
    timeoutMs: 30000,
  });
  assert.ok(result.ok, 'e2e-runner 호출 실패: ' + JSON.stringify(result));
  assert.ok(result.passed, 'E2E 시나리오 실패: ' + result.stdout);
});

test('BF-1166 E2E-3 — 오류(충돌) 재시도 + 접근성(키보드 포커스/Enter, aria-live polite/assertive)', { skip: _brixOutOfScope }, async (t) => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return;
  }
  if (!(await checkE2eHealth())) {
    t.skip('e2e-runner 도달 불가 (CI 환경 정상)');
    return;
  }

  const { server, port } = await startStaticServer(ROOT);
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/src/routes/sync-status/`;

  // repo-delta outcomes = ['conflict','clean','stale'] → 최초 확인은 conflict, 1회 재시도로 up_to_date 복구.
  const scriptText = `
    await page.waitForSelector('li[data-repo-id="repo-delta"]');
    await page.locator('button[data-repo-id="repo-delta"]').click();
    await new Promise((r) => setTimeout(r, 700));

    let state = await page.locator('li[data-repo-id="repo-delta"]').getAttribute('data-state');
    if (state !== 'conflict') throw new Error('1차 확인 결과가 conflict 가 아님: ' + state);

    const errorPanel = page.locator('li[data-repo-id="repo-delta"] .repo-row__error');
    if (!(await errorPanel.isVisible())) throw new Error('오류 패널(role=alert)이 표시되지 않음');
    const cause = await errorPanel.locator('.repo-row__error-cause').innerText();
    if (!cause.includes('로컬 변경과 원격 변경이 충돌합니다')) throw new Error('오류 원인 문구 불일치: ' + cause);

    const assertiveText = await page.locator('#live-assertive').innerText();
    if (!assertiveText.includes('동기화에 실패했습니다')) throw new Error('assertive 실패 안내 문구 누락: ' + assertiveText);

    // 접근성: 마우스 클릭 없이 키보드만으로 재시도 버튼에 포커스 이동 후 Enter 로 활성화.
    await page.locator('button[data-repo-id="repo-delta"]').focus();
    const focusedId = await page.evaluate(() => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.repoId);
    if (focusedId !== 'repo-delta') throw new Error('키보드 포커스가 재시도 버튼에 도달하지 못함: ' + focusedId);
    await page.keyboard.press('Enter');

    await new Promise((r) => setTimeout(r, 700));
    state = await page.locator('li[data-repo-id="repo-delta"]').getAttribute('data-state');
    if (state !== 'up_to_date') throw new Error('키보드 재시도(outcome=clean) 결과가 up_to_date 가 아님: ' + state);

    const politeText = await page.locator('#live-polite').innerText();
    if (!politeText.includes('동기화가 완료되었습니다')) throw new Error('polite 완료 안내 문구 누락: ' + politeText);
  `;

  const result = await runE2e({
    url,
    label: '오류(충돌) 재시도 + 접근성(키보드 포커스/Enter, aria-live)',
    scriptText,
    timeoutMs: 30000,
  });
  assert.ok(result.ok, 'e2e-runner 호출 실패: ' + JSON.stringify(result));
  assert.ok(result.passed, 'E2E 시나리오 실패: ' + result.stdout);
});

// ── BF-1166 발견 결함 회귀 가드 (owner=developer, BF-1164) ──────────────────
//
// 근본 원인(4단계 분석 완료):
// 1) 현상: repo-beta(['error','error','clean'])로 "확인 → 재시도 → 재시도"를 연속 실행하면
//    2번째 재시도 이후 저장소가 '동기화중'에서 영원히 멈춘다. 콘솔에 `[pageerror]
//    Cannot read properties of undefined (reading 'length')` 2회 발생.
// 2) 가설: (a) locator 문제 (b) KPI 지표 누적 로직 결함 (c) 딜레이 타이밍 문제.
// 3) 검증: status.js 의 recordCheckCost/recordRetryOutcome 를 대조한 결과, 각 함수가
//    `metrics` 의 자기 관심 필드만 담은 **새 객체**를 반환해 나머지 필드를 매번 지운다
//    (예: recordCheckCost 는 { checkDurationsMs } 만 반환 → retryAttempts/retrySuccesses 소실,
//    recordRetryOutcome 은 { retryAttempts, retrySuccesses } 만 반환 → checkDurationsMs 소실).
// 4) 확정: 재시도(recordRetryOutcome 호출)가 한 번이라도 발생하면 이후 model.metrics 에
//    checkDurationsMs 가 없어져 averageCheckCost() 의 `arr.length` 가 undefined 를 읽어 throw.
//    이 예외가 runSync() 안의 동기 render() 호출에서 발생하면 그 뒤에 있는
//    `win.setTimeout(...)` 이 아예 실행되지 못해 해당 저장소가 '동기화중'에 영구 고착된다.
//    → owner=developer, file=src/features/sync-status/status.js
//      (recordCheckCost/recordRetryOutcome 가 매번 metrics 전체를 병합해 반환하도록 수정 필요)
test('BF-1166 E2E-4 (회귀 가드/알려진 결함) — 연속 재시도 2회 시 KPI 지표 손상으로 동기화중 고착', { skip: _brixOutOfScope }, async (t) => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return;
  }
  if (!(await checkE2eHealth())) {
    t.skip('e2e-runner 도달 불가 (CI 환경 정상)');
    return;
  }

  const { server, port } = await startStaticServer(ROOT);
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/src/routes/sync-status/`;

  // repo-beta outcomes = ['error','error','clean'] → failed, failed, (기대) up_to_date.
  // 알려진 결함으로 인해 2번째 재시도 후 최종 상태가 'up_to_date' 가 아니라 'syncing' 에
  // 고착되는 것이 현재(BF-1164 merge 시점) 관측되는 결과다. 결함이 수정되면 이 assertion 이
  // 통과하도록 그대로 둔다 — 수정 완료를 감지하는 회귀 가드 역할.
  const scriptText = `
    await page.waitForSelector('li[data-repo-id="repo-beta"]');
    await page.locator('button[data-repo-id="repo-beta"]').click();
    await new Promise((r) => setTimeout(r, 700));
    let state = await page.locator('li[data-repo-id="repo-beta"]').getAttribute('data-state');
    if (state !== 'failed') throw new Error('1차 확인 결과가 failed 가 아님: ' + state);

    await page.locator('button[data-repo-id="repo-beta"]').focus();
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 700));
    state = await page.locator('li[data-repo-id="repo-beta"]').getAttribute('data-state');
    if (state !== 'failed') throw new Error('2차 재시도(outcome=error) 결과가 failed 가 아님: ' + state);

    await page.locator('button[data-repo-id="repo-beta"]').focus();
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 700));
    state = await page.locator('li[data-repo-id="repo-beta"]').getAttribute('data-state');
    if (state !== 'up_to_date') {
      throw new Error(
        'BF-1164 알려진 결함 재현: 3차 재시도(outcome=clean) 결과가 up_to_date 가 아니라 \\'' + state + '\\' 로 고착됨 — ' +
        'status.js recordCheckCost/recordRetryOutcome 가 metrics 필드를 서로 지우는 버그 (owner=developer)'
      );
    }
  `;

  const result = await runE2e({
    url,
    label: '연속 재시도 2회 — KPI 지표 손상 회귀 가드(알려진 결함 BF-1164)',
    scriptText,
    timeoutMs: 30000,
  });
  assert.ok(result.ok, 'e2e-runner 호출 실패: ' + JSON.stringify(result));
  assert.ok(
    result.passed,
    'BF-1164 알려진 결함 재현(owner=developer, file=src/features/sync-status/status.js, ' +
    'recordCheckCost/recordRetryOutcome 가 metrics 의 서로 다른 필드를 지움) — 수정 전까지 fail 이 정상: ' +
    result.stdout
  );
});
