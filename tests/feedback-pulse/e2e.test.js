// feedback-pulse 서비스 E2E 회귀 가드 (BF-1083)
// dev(BF-1081) 는 router 를 함수 호출(handle())로만 검증했다.
// 여기서는 실제 node:http 서버(server.js, createFeedbackPulseServer)를 기동해
// 실 네트워크 요청(fetch)으로 접수→집계→에러/빈 상태 흐름과,
// "재시작 시 인메모리 초기화" + "긴급 피드백 집계" 를 HTTP 계층에서 고정한다.
// (dev 가 이미 단위 테스트한 storage API 동작·ulid 형식·정렬/필터 로직·단위 함수 결과는 재검증하지 않는다.)
import test from 'node:test';
import assert from 'node:assert/strict';

import { createFeedbackPulseServer } from '../../src/routes/feedback-pulse/server.js';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'feedback-pulse';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

/** 실 HTTP 서버를 임의 포트로 기동한다. */
function startServer() {
  const { server, service } = createFeedbackPulseServer();
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, service, port: server.address().port }));
  });
}

const urgentInput = (urgency) => ({ sentiment: 'negative', urgency, opinion: `긴급 이슈 (${urgency})` });

// ── AC1: 실 HTTP 서버 — 빈 상태 → 접수 → 집계 → 에러 흐름 ──────────────
test('AC1 — 실 HTTP 서버: 빈 상태 → 접수 → 집계 → 에러 흐름', { skip: _brixOutOfScope }, async (t) => {
  const { server, port } = await startServer();
  t.after(() => server.close());
  const base = `http://127.0.0.1:${port}`;

  // 빈 상태 (재시작 직후 전제)
  const emptyList = await fetch(`${base}/feedback-pulse`);
  assert.equal(emptyList.status, 200);
  assert.deepEqual(await emptyList.json(), []);

  const emptyKpi = await fetch(`${base}/feedback-pulse/kpi`);
  assert.equal(emptyKpi.status, 200);
  const emptyKpiBody = await emptyKpi.json();
  assert.equal(emptyKpiBody.total, 0);
  assert.equal(emptyKpiBody.negativeRatio, '0.0%');
  assert.equal(emptyKpiBody.pulseRate, 0);

  // 정상 접수 → 201
  const okRes = await fetch(`${base}/feedback-pulse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sentiment: 'negative', urgency: 'high', opinion: '배송이 너무 느립니다.' }),
  });
  assert.equal(okRes.status, 201);
  const okBody = await okRes.json();
  assert.match(okBody.id, /[0-9a-f-]{36}/);

  // 에러 접수(잘못된 enum) → 400, 미반영
  const badRes = await fetch(`${base}/feedback-pulse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sentiment: 'bad', urgency: 'low', opinion: 'x' }),
  });
  assert.equal(badRes.status, 400);
  const badBody = await badRes.json();
  assert.equal(badBody.error.field, 'sentiment');

  // 집계 반영 — 에러 건은 제외, 정상 접수 1건만 카운트
  const kpiAfter = await fetch(`${base}/feedback-pulse/kpi`);
  const kpiAfterBody = await kpiAfter.json();
  assert.equal(kpiAfterBody.total, 1);
  assert.equal(kpiAfterBody.urgentCount, 1);
});

// ── AC2: 실 HTTP 서버 — 재시작 초기화 + 긴급 피드백 집계 (related-module 회귀) ──
test('AC2 — 실 HTTP 서버: 재시작 시 인메모리 초기화 + 긴급 피드백 집계', { skip: _brixOutOfScope }, async (t) => {
  const first = await startServer();
  t.after(() => first.server.close());
  const baseA = `http://127.0.0.1:${first.port}`;

  await fetch(`${baseA}/feedback-pulse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(urgentInput('high')),
  });
  await fetch(`${baseA}/feedback-pulse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(urgentInput('critical')),
  });
  await fetch(`${baseA}/feedback-pulse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sentiment: 'positive', urgency: 'low', opinion: '만족합니다' }),
  });

  // 긴급(high+critical) 피드백 집계 — 실 HTTP 계층에서 고정 (dev 는 router 함수 호출로만 검증)
  const kpiA = await (await fetch(`${baseA}/feedback-pulse/kpi`)).json();
  assert.equal(kpiA.total, 3);
  assert.equal(kpiA.urgentCount, 2);

  // "재시작" 시뮬레이션: 기존 서버 종료 후 새 서버 인스턴스(=새 인메모리 store) 기동
  await new Promise((resolve) => first.server.close(resolve));
  const second = await startServer();
  t.after(() => second.server.close());
  const baseB = `http://127.0.0.1:${second.port}`;

  const listB = await fetch(`${baseB}/feedback-pulse`);
  assert.equal(listB.status, 200);
  assert.deepEqual(await listB.json(), []);

  const kpiB = await (await fetch(`${baseB}/feedback-pulse/kpi`)).json();
  assert.equal(kpiB.total, 0);
  assert.equal(kpiB.urgentCount, 0);
});

// ── 브라우저 e2e-runner: 접수→집계→에러/빈 상태 흐름 ─────────────────────
test('E2E(browser) — 접수→집계→에러/빈 상태 흐름', { skip: _brixOutOfScope }, async (t) => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return;
  }
  let probe;
  try {
    probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
  } catch (err) {
    t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
    return;
  }
  if (!probe.ok) {
    t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
    return;
  }

  const { server, port } = await startServer();
  t.after(() => server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const base = `http://${host}:${port}`;
  const kpiUrl = `${base}/feedback-pulse/kpi`;

  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');

  const scriptText = `
    const base = ${JSON.stringify(base)};
    const initialText = await page.evaluate(() => document.body.innerText);
    const initial = JSON.parse(initialText);
    if (initial.total !== 0) throw new Error('empty state 아님: ' + initialText);

    const okRes = await fetch(base + '/feedback-pulse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sentiment: 'negative', urgency: 'high', opinion: '배송이 너무 느립니다.' }),
    });
    if (okRes.status !== 201) throw new Error('정상 접수 실패: ' + okRes.status);

    const badRes = await fetch(base + '/feedback-pulse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sentiment: 'bad', urgency: 'low', opinion: 'x' }),
    });
    if (badRes.status !== 400) throw new Error('에러 접수가 400 아님: ' + badRes.status);

    const kpiRes = await fetch(base + '/feedback-pulse/kpi');
    const kpiBody = await kpiRes.json();
    if (kpiBody.total !== 1) throw new Error('집계 미반영: total=' + kpiBody.total);

    await page.goto(base + '/feedback-pulse/kpi');
  `;

  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({
      url: kpiUrl,
      label: '피드백펄스 접수→집계→에러/빈 상태 흐름',
      scriptText,
      timeoutMs: 30000,
    }),
  });
  const body = await res.json();
  assert.equal(body.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(body)}`);
  assert.equal(body.passed, true, `E2E 시나리오 실패 — stdout: ${body.stdout}`);
});

// ── 브라우저 e2e-runner: 재시작 초기화 + 긴급 피드백 집계 ────────────────
test('E2E(browser) — 재시작 초기화 + 긴급 피드백 집계', { skip: _brixOutOfScope }, async (t) => {
  if (process.env.BRIX_E2E_SKIP === '1') {
    t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
    return;
  }
  let probe;
  try {
    probe = await fetch('http://e2e-runner:3030/health', { signal: AbortSignal.timeout(2000) });
  } catch (err) {
    t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
    return;
  }
  if (!probe.ok) {
    t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
    return;
  }

  const first = await startServer();
  t.after(() => first.server.close());
  const second = await startServer();
  t.after(() => second.server.close());
  const host = process.env.BRIX_PERSONA_HOST || 'worker';
  const baseA = `http://${host}:${first.port}`;
  const baseB = `http://${host}:${second.port}`; // "재시작" 후의 새 인스턴스로 취급 (인메모리 store 격리)

  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');

  const scriptText = `
    const baseA = ${JSON.stringify(baseA)};
    const baseB = ${JSON.stringify(baseB)};

    await fetch(baseA + '/feedback-pulse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sentiment: 'negative', urgency: 'high', opinion: '긴급 이슈 (high)' }),
    });
    await fetch(baseA + '/feedback-pulse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sentiment: 'negative', urgency: 'critical', opinion: '긴급 이슈 (critical)' }),
    });
    await fetch(baseA + '/feedback-pulse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sentiment: 'positive', urgency: 'low', opinion: '만족합니다' }),
    });

    const kpiA = await (await fetch(baseA + '/feedback-pulse/kpi')).json();
    if (kpiA.urgentCount !== 2) throw new Error('긴급 집계 불일치: urgentCount=' + kpiA.urgentCount);

    const listB = await (await fetch(baseB + '/feedback-pulse')).json();
    if (listB.length !== 0) throw new Error('재시작 초기화 실패: list.length=' + listB.length);
    const kpiB = await (await fetch(baseB + '/feedback-pulse/kpi')).json();
    if (kpiB.total !== 0) throw new Error('재시작 초기화 실패: total=' + kpiB.total);

    await page.goto(baseB + '/feedback-pulse/kpi');
  `;

  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({
      url: `${baseA}/feedback-pulse`,
      label: '피드백펄스 재시작 초기화·긴급 집계',
      scriptText,
      timeoutMs: 30000,
    }),
  });
  const body = await res.json();
  assert.equal(body.ok, true, `e2e-runner 호출 실패: ${JSON.stringify(body)}`);
  assert.equal(body.passed, true, `E2E 시나리오 실패 — stdout: ${body.stdout}`);
});
