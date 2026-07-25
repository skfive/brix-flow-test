// BF-1172 — 고객 피드백 우선순위 보드 브라우저 E2E 회귀 가드
// 정적 mockup(feedback-board/)을 self-contained 서버로 띄우고 e2e-runner 컨테이너로
// 실제 브라우저 인터랙션(등록/필터/KPI/상태전환/오류복구/키보드 탐색/aria-live)을 검증한다.
// 참고: docs/plan/feedback-board-BF-1167.md, docs/design/feedback-board-BF-1167.md

import test from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'feedback-board';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// 확장자별 Content-Type — 브라우저의 strict MIME 검사(<script type="module">)를 통과하려면 필수.
const MIME_BY_EXT = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
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
      const contentType = MIME_BY_EXT[path.extname(target)] || 'application/octet-stream';
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
  const started = await startStaticServer('.');
  server = started.server;
  port = started.port;

  if (process.env.BRIX_E2E_SKIP === '1') {
    e2eAvailable = false;
    skipReason = 'BRIX_E2E_SKIP=1 — CI 결정성 가드';
    return;
  }
  try {
    const probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
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

async function callE2E({ label, scriptText, timeoutMs }) {
  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing (BRIX_RUN_ID/BRIX_JIRA_KEY)');
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const url = `http://${host}:${port}/feedback-board/`;
  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({ url, label, scriptText, timeoutMs: timeoutMs || 60000 }),
  });
  const json = await res.json();
  return json;
}

/* ============================================================
 * 시나리오 1 (AC1) — 등록 → 필터/KPI 갱신 → 상태 전환 → 저장 실패 재시도 복구
 * fixture 8건(pending_review 3 / planned 3 / done 2) 기준 결정론적 값으로 검증.
 * ============================================================ */
const SCENARIO_1_SCRIPT = `
await page.waitForSelector('.feedback-item', { timeout: 10000 });

// 초기 KPI 확인 (fixture 8건: 검토대기3/계획됨3/처리완료2)
const initial = await page.locator('#kpi-summary').innerText();
if (!initial.includes('전체 피드백')) throw new Error('KPI 전체 피드백 라벨 없음: ' + initial);
if (!initial.includes('검토 대기 3') || !initial.includes('계획됨 3') || !initial.includes('처리 완료 2')) {
  throw new Error('초기 KPI byStatus 불일치: ' + initial);
}

// 1) 피드백 등록 성공 → KPI 갱신
await page.locator('#f-title').fill('E2E 신규 접수 버그');
await page.locator('#f-desc').fill('회귀 가드용 등록 테스트입니다.');
await page.locator('#f-sev').selectOption('high');
await page.locator('#f-ch').selectOption('in_app');
await page.locator('#register-submit').click();
await page.waitForFunction(() => {
  const el = document.getElementById('register-success');
  return el && !el.hidden;
}, null, { timeout: 5000 });
const afterReg1 = await page.locator('#kpi-summary').innerText();
if (!afterReg1.includes('검토 대기 4')) throw new Error('등록 후 검토 대기 KPI 미갱신: ' + afterReg1);
if (!afterReg1.includes('높음 3')) throw new Error('등록 후 심각도(높음) KPI 미갱신: ' + afterReg1);

// 2) 등록 저장 실패 → 재시도 복구
await page.evaluate(() => window.__feedbackBoard.setSaveAdapter(() => Promise.reject(new Error('injected-fail'))));
await page.locator('#f-title').fill('E2E 재시도 등록 버그');
await page.locator('#f-desc').fill('저장 실패 후 재시도 복구 검증용입니다.');
await page.locator('#f-sev').selectOption('critical');
await page.locator('#f-ch').selectOption('email');
await page.locator('#register-submit').click();
await page.waitForFunction(() => {
  const el = document.getElementById('register-error');
  return el && !el.hidden;
}, null, { timeout: 5000 });
const liveSaveFail = await page.locator('#live-save').innerText();
if (!liveSaveFail.includes('저장에 실패했습니다')) throw new Error('등록 실패 aria-live 누락: ' + liveSaveFail);
await page.evaluate(() => window.__feedbackBoard.resetSaveAdapter());
await page.locator('#register-retry').click();
await page.waitForFunction(() => {
  const el = document.getElementById('register-success');
  return el && !el.hidden;
}, null, { timeout: 5000 });
const afterReg2 = await page.locator('#kpi-summary').innerText();
if (!afterReg2.includes('검토 대기 5')) throw new Error('재시도 등록 후 KPI 미갱신: ' + afterReg2);
if (!afterReg2.includes('치명적 3')) throw new Error('재시도 등록 후 심각도(치명적) KPI 미갱신: ' + afterReg2);

// 3) 상태 필터링 — 계획됨만 (registrations 는 모두 검토대기라 계획됨 3건 그대로)
await page.locator('.filter-group[data-cat="status"] input[value="planned"]').check();
await page.waitForFunction(() => {
  const el = document.getElementById('result-count');
  return el && el.textContent.includes('3건 표시');
}, null, { timeout: 5000 });
const plannedCount = await page.locator('.feedback-list .feedback-item').count();
if (plannedCount !== 3) throw new Error('계획됨 필터 결과 건수 불일치: ' + plannedCount);
await page.locator('#filter-reset').click();
await page.waitForFunction(() => {
  const el = document.getElementById('result-count');
  return el && el.textContent.includes('10건 표시');
}, null, { timeout: 5000 });

// 4) 상태 전환 성공 (FB-6001 검토 대기 → 계획됨)
await page.locator('.feedback-item[data-id="FB-6001"] button[data-action="transition"]').click();
await page.waitForFunction(() => {
  return !!document.querySelector('.feedback-item[data-id="FB-6001"] .badge--status-planned');
}, null, { timeout: 5000 });
const afterTransition1 = await page.locator('#kpi-summary').innerText();
if (!afterTransition1.includes('검토 대기 4') || !afterTransition1.includes('계획됨 4')) {
  throw new Error('전환 후 KPI 미갱신: ' + afterTransition1);
}
const liveSaveTransition = await page.locator('#live-save').innerText();
if (!liveSaveTransition.includes('상태가 변경되었습니다')) throw new Error('전환 성공 aria-live 누락: ' + liveSaveTransition);

// 5) 상태 전환 실패 → 재시도 복구 (FB-6003 계획됨 → 처리 완료)
await page.evaluate(() => window.__feedbackBoard.setSaveAdapter(() => Promise.reject(new Error('injected-fail'))));
await page.locator('.feedback-item[data-id="FB-6003"] button[data-action="transition"]').click();
await page.waitForFunction(() => {
  return !!document.querySelector('.feedback-item[data-id="FB-6003"] button[data-action="retry-transition"]');
}, null, { timeout: 5000 });
const liveSaveTransitionFail = await page.locator('#live-save').innerText();
if (!liveSaveTransitionFail.includes('저장에 실패했습니다')) throw new Error('전환 실패 aria-live 누락: ' + liveSaveTransitionFail);
await page.evaluate(() => window.__feedbackBoard.resetSaveAdapter());
await page.locator('.feedback-item[data-id="FB-6003"] button[data-action="retry-transition"]').click();
await page.waitForFunction(() => {
  return !!document.querySelector('.feedback-item[data-id="FB-6003"] .badge--status-done');
}, null, { timeout: 5000 });
const afterTransition2 = await page.locator('#kpi-summary').innerText();
if (!afterTransition2.includes('처리 완료 3건 기준')) throw new Error('전환 재시도 후 doneCount 미갱신: ' + afterTransition2);
`;

test(`BF-1172 [${_BRIX_MY_MODULE}] 시나리오1 — 등록/필터/KPI/상태전환/저장실패 재시도 (E2E)`, { skip: _brixOutOfScope }, async (t) => {
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }
  const result = await callE2E({
    label: '피드백 등록→필터·KPI 갱신→상태전환→저장실패 재시도',
    scriptText: SCENARIO_1_SCRIPT,
    timeoutMs: 90000,
  });
  t.diagnostic(JSON.stringify(result));
  assertE2EPassed(result);
});

/* ============================================================
 * 시나리오 2 (AC2) — 키보드 전용 탐색 + aria-live 알림 (마우스 미사용)
 * ============================================================ */
const SCENARIO_2_SCRIPT = `
await page.waitForSelector('.feedback-item', { timeout: 10000 });

// 1) 키보드만으로 피드백 등록 (Tab 순서 회귀 가드 포함 — 숨겨진 오류 배너/재시도 버튼 스킵 확인)
await page.locator('#f-title').focus();
await page.keyboard.type('키보드 등록 테스트');
await page.keyboard.press('Tab');
let active = await page.evaluate(() => document.activeElement && document.activeElement.id);
if (active !== 'f-desc') throw new Error('Tab 순서 불일치(설명 필드 아님): ' + active);
await page.keyboard.type('키보드만으로 등록하는 회귀 테스트입니다.');
await page.keyboard.press('Tab');
active = await page.evaluate(() => document.activeElement && document.activeElement.id);
if (active !== 'f-sev') throw new Error('Tab 순서 불일치(심각도 select 아님): ' + active);
await page.keyboard.press('ArrowDown');
const sevValue = await page.locator('#f-sev').inputValue();
if (!['critical', 'high', 'medium', 'low'].includes(sevValue)) throw new Error('심각도 키보드 선택 실패: ' + sevValue);
await page.keyboard.press('Tab');
active = await page.evaluate(() => document.activeElement && document.activeElement.id);
if (active !== 'f-ch') throw new Error('Tab 순서 불일치(채널 select 아님): ' + active);
await page.keyboard.press('ArrowDown');
const chValue = await page.locator('#f-ch').inputValue();
if (!['in_app', 'web_form', 'email', 'social'].includes(chValue)) throw new Error('채널 키보드 선택 실패: ' + chValue);
await page.keyboard.press('Tab');
active = await page.evaluate(() => document.activeElement && document.activeElement.id);
if (active !== 'register-submit') throw new Error('Tab 순서 불일치(숨김 오류배너 스킵 실패, 실제 focus: ' + active + ')');
await page.keyboard.press('Enter');
await page.waitForFunction(() => {
  const el = document.getElementById('register-success');
  return el && !el.hidden;
}, null, { timeout: 5000 });
const liveSaveReg = await page.locator('#live-save').innerText();
if (!liveSaveReg.includes('피드백이 등록되었습니다')) throw new Error('등록 성공 aria-live 누락: ' + liveSaveReg);
const kpiAfterReg = await page.locator('#kpi-summary').innerText();
if (!kpiAfterReg.includes('검토 대기 4')) throw new Error('키보드 등록 후 KPI 미갱신: ' + kpiAfterReg);

// 2) 키보드만으로 필터 체크박스 조작 (Space 토글) + aria-live 결과 알림
await page.locator('.filter-group[data-cat="status"] input[value="planned"]').focus();
await page.keyboard.press('Space');
await page.waitForFunction(() => {
  const el = document.getElementById('result-count');
  return el && el.textContent.includes('3건 표시');
}, null, { timeout: 5000 });
const liveResult = await page.locator('#live-result').innerText();
if (!liveResult.includes('3건 표시')) throw new Error('필터 결과 aria-live 누락: ' + liveResult);
await page.locator('#filter-reset').focus();
await page.keyboard.press('Enter');
await page.waitForFunction(() => {
  const el = document.getElementById('result-count');
  return el && el.textContent.includes('9건 표시');
}, null, { timeout: 5000 });

// 3) 키보드만으로 상태 전환 (Enter) + aria-live 알림
await page.locator('.feedback-item[data-id="FB-6001"] button[data-action="transition"]').focus();
await page.keyboard.press('Enter');
await page.waitForFunction(() => {
  return !!document.querySelector('.feedback-item[data-id="FB-6001"] .badge--status-planned');
}, null, { timeout: 5000 });
const liveSaveTransition = await page.locator('#live-save').innerText();
if (!liveSaveTransition.includes('상태가 변경되었습니다')) throw new Error('키보드 전환 aria-live 누락: ' + liveSaveTransition);
`;

test(`BF-1172 [${_BRIX_MY_MODULE}] 시나리오2 — 키보드 전용 탐색 + aria-live 알림 (E2E)`, { skip: _brixOutOfScope }, async (t) => {
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }
  const result = await callE2E({
    label: '키보드 전용 탐색 + aria-live 상태 알림',
    scriptText: SCENARIO_2_SCRIPT,
    timeoutMs: 90000,
  });
  t.diagnostic(JSON.stringify(result));
  assertE2EPassed(result);
});

function assertE2EPassed(result) {
  if (!result || result.ok !== true || result.passed !== true) {
    throw new Error(`e2e-runner 시나리오 실패: ${JSON.stringify(result)}`);
  }
}
