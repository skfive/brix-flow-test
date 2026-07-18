// 회의실 예약 충돌 검사(/demo/booking-canary) 브라우저 E2E · 접근성 회귀 가드 (BF-1047)
// 실행: node --test tests/e2e/booking-canary/*.test.js
//
// 범위:
//   1) 정적 마크업 계약 가드 (HTML id/testid/aria 존재 — fs 기반, 서버 불필요)
//   2) CORS 안전 가드 (self-contained 데모가 fetch()/외부 import 를 쓰지 않는지 — 디자인 주석 "외부 의존성 0" 보호)
//   3) 실 브라우저 E2E 4개 시나리오 (e2e-runner) — 정상 예약 / 충돌+대체후보 재조회 / 키보드 전용 조작+접근성 포커스 / 모바일 폭 가독성
//
// dev 가 이미 커버한 순수 로직(검증/겹침판정/대체후보 알고리즘 정확성)은 tests/booking-canary-BF1045.test.js 에서
// 단위 테스트로 검증되어 있으므로 여기서는 재검증하지 않는다. 본 파일은 병합된 HTML/브라우저 계약만 다룬다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'booking-canary';
const _FOCUSED_SKIP =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = path.join(__dirname, '../../../src/routes/demo/booking-canary/index.html');
// tester 가 기동하는 정적 서버는 src/routes/demo/booking-canary 디렉터리를 webroot 로 서빙한다(아래 서버 기동 안내 참고).
const PAGE_URL_PATH = '/';

// ---------------------------------------------------------------------------
// 1) 정적 마크업 계약 가드
// ---------------------------------------------------------------------------

test('정적 계약 — 폼/결과 영역 핵심 id·testid·aria 마크업 존재', (t) => {
  if (_FOCUSED_SKIP) return t.skip(`focused scope — ${process.env.BRIX_TEST_MODULE} 외 skip`);

  const html = fs.readFileSync(HTML_PATH, 'utf-8');

  const mustInclude = [
    // 폼 계약
    'data-testid="booking-check-form"',
    'id="f-room"',
    'id="f-name"',
    'id="f-start"',
    'id="f-end"',
    'data-testid="check-btn"',
    // 오류 배너 계약 (검증 실패 시 tester 시나리오가 의존하는 지점)
    'id="form-error"',
    'data-testid="form-error-text"',
    'role="alert"',
    'aria-live="assertive"',
    'tabindex="-1"',
    // 결과 렌더 루트
    'id="result-root"',
  ];
  for (const needle of mustInclude) {
    assert.ok(html.includes(needle), `HTML 마크업에서 누락됨: ${needle}`);
  }
});

test('정적 계약 — 결과 패널 data-testid 계약(JS 렌더 문자열에 고정)', (t) => {
  if (_FOCUSED_SKIP) return t.skip(`focused scope — ${process.env.BRIX_TEST_MODULE} 외 skip`);

  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const mustInclude = [
    'data-testid="result-panel"',
    'data-testid="conflict-item"',
    'data-testid="conflict-list"',
    'data-testid="alternative-item"',
    'data-testid="alternative-list"',
  ];
  for (const needle of mustInclude) {
    assert.ok(html.includes(needle), `결과 렌더 템플릿에서 누락됨: ${needle}`);
  }
});

// ---------------------------------------------------------------------------
// 2) CORS 안전 가드 — self-contained 데모(디자인 주석 "외부 의존성 0")가
//    실제로 fetch()/외부 import 를 쓰지 않는지 회귀 보호
// ---------------------------------------------------------------------------

test('CORS 안전 — 인라인 스크립트가 fetch()/외부 import 를 쓰지 않음 (self-contained 계약)', (t) => {
  if (_FOCUSED_SKIP) return t.skip(`focused scope — ${process.env.BRIX_TEST_MODULE} 외 skip`);

  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, '인라인 <script> 블록을 찾을 수 없음');
  const scriptBody = scriptMatch[1];

  assert.ok(!/\bfetch\s*\(/.test(scriptBody), '인라인 스크립트가 fetch() 를 사용함 — self-contained 계약 위반 위험');
  assert.ok(!/\bimport\s+[^(]/.test(scriptBody), '인라인 스크립트가 import 문을 사용함 — self-contained 계약 위반 위험');
  assert.ok(!/\bimport\s*\(/.test(scriptBody), '인라인 스크립트가 동적 import() 를 사용함 — self-contained 계약 위반 위험');
});

// ---------------------------------------------------------------------------
// 3) 실 브라우저 E2E — e2e-runner
// ---------------------------------------------------------------------------

const E2E_RUNNER_BASE = 'http://e2e-runner:3030';
const STATIC_PORT = 8080;
const PAGE_BASE = `http://${process.env.BRIX_PERSONA_HOST || 'worker'}:${STATIC_PORT}${PAGE_URL_PATH}`;

let e2eAvailable = true;
let skipReason = null;
let staticServer = null;

test.before(async () => {
  if (_FOCUSED_SKIP) return;
  if (process.env.BRIX_E2E_SKIP === '1') {
    e2eAvailable = false;
    skipReason = 'BRIX_E2E_SKIP=1 — CI 결정성 가드';
    return;
  }
  try {
    const probe = await fetch(`${E2E_RUNNER_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) {
      e2eAvailable = false;
      skipReason = `e2e-runner unhealthy (${probe.status})`;
      return;
    }
  } catch (err) {
    e2eAvailable = false;
    skipReason = `e2e-runner 도달 불가 (${err.message}) — CI 환경 정상`;
    return;
  }

  // self-contained 데모(index.html, 외부 의존성 0)를 서빙하는 최소 정적 서버.
  // e2e-runner 컨테이너가 BRIX_PERSONA_HOST 로 이 워커 컨테이너에 접근하므로 0.0.0.0 바인딩 필수.
  const html = fs.readFileSync(HTML_PATH);
  await new Promise((resolve, reject) => {
    staticServer = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });
    staticServer.on('error', reject);
    staticServer.listen(STATIC_PORT, '0.0.0.0', resolve);
  });
});

test.after(async () => {
  if (staticServer) {
    await new Promise((resolve) => staticServer.close(resolve));
  }
});

async function runE2E(label, scriptText, timeoutMs = 30000) {
  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity(BRIX_RUN_ID/BRIX_JIRA_KEY) missing');

  const res = await fetch(`${E2E_RUNNER_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({ url: PAGE_BASE, label, scriptText, timeoutMs }),
  });
  const json = await res.json();
  if (!res.ok || json.passed !== true) {
    throw new Error(
      `[${label}] e2e-runner 실패 — ok:${json.ok} passed:${json.passed}\nstdout:\n${json.stdout || '(없음)'}`,
    );
  }
  return json;
}

test('E2E-1 정상 예약 — 충돌 없는 시간대는 IA-02 available 배너만 렌더', async (t) => {
  if (_FOCUSED_SKIP) return t.skip(`focused scope — ${process.env.BRIX_TEST_MODULE} 외 skip`);
  if (!e2eAvailable) return t.skip(skipReason);

  await runE2E(
    '예약 충돌 검사 — 정상 예약(충돌 없음) → available 배너',
    `
    await page.selectOption('#f-room', 'room-01');
    await page.fill('#f-name', '테스터A');
    await page.fill('#f-start', '2026-07-27T10:00');
    await page.fill('#f-end', '2026-07-27T11:00');
    await page.click('[data-testid="check-btn"]');
    await page.waitForSelector('[data-testid="result-panel"]');

    const resultType = await page.evaluate(() => document.querySelector('[data-testid="result-panel"]')?.dataset.result);
    if (resultType !== 'available') throw new Error('expected available, got ' + resultType);

    const bannerTitle = await page.evaluate(() => document.querySelector('.banner.available .title')?.textContent);
    if (bannerTitle !== '예약 가능합니다') throw new Error('unexpected banner title: ' + bannerTitle);

    const altListRendered = await page.evaluate(() => !!document.querySelector('[data-testid="alternative-list"]'));
    if (altListRendered) throw new Error('IA-02 위반: available 결과에 대체 후보 목록이 렌더됨');
    `,
  );
});

test('E2E-2 충돌 감지 + 대체 후보 표시 + 재조회 — 입력 변경 재제출 시 결과가 최신값으로 교체', async (t) => {
  if (_FOCUSED_SKIP) return t.skip(`focused scope — ${process.env.BRIX_TEST_MODULE} 외 skip`);
  if (!e2eAvailable) return t.skip(skipReason);

  await runE2E(
    '예약 충돌 검사 — 충돌+대체후보 표시 후 재조회 시 최신 결과로 교체',
    `
    // 1차 제출 — room-01 01:30~02:30 (fixture bkg-01,bkg-02 와 겹침)
    await page.selectOption('#f-room', 'room-01');
    await page.fill('#f-name', '테스터B');
    await page.fill('#f-start', '2026-07-27T01:30');
    await page.fill('#f-end', '2026-07-27T02:30');
    await page.click('[data-testid="check-btn"]');
    await page.waitForSelector('[data-testid="result-panel"]');

    let resultType = await page.evaluate(() => document.querySelector('[data-testid="result-panel"]')?.dataset.result);
    if (resultType !== 'conflict') throw new Error('1차 요청은 conflict 기대, got ' + resultType);

    let conflictCount = await page.evaluate(() => document.querySelectorAll('[data-testid="conflict-item"]').length);
    if (conflictCount !== 2) throw new Error('1차 conflict 개수 2(bkg-01,bkg-02) 기대, got ' + conflictCount);

    let altCount = await page.evaluate(() => document.querySelectorAll('[data-testid="alternative-item"]').length);
    if (altCount !== 3) throw new Error('1차 대체 후보 3개 기대, got ' + altCount);

    const firstAltRoom = await page.evaluate(() => document.querySelector('[data-testid="alternative-item"] .room')?.textContent);
    if (firstAltRoom !== '3층 대회의실') throw new Error('Track A(같은 회의실 순연) 우선순위 위반: ' + firstAltRoom);

    // 2차 제출(재조회) — 시간 변경 → bkg-02 만 겹치는 다른 케이스로 갱신
    await page.fill('#f-start', '2026-07-27T02:00');
    await page.fill('#f-end', '2026-07-27T03:00');
    await page.click('[data-testid="check-btn"]');
    await page.waitForSelector('[data-testid="result-panel"]');

    resultType = await page.evaluate(() => document.querySelector('[data-testid="result-panel"]')?.dataset.result);
    if (resultType !== 'conflict') throw new Error('2차 요청도 conflict 기대, got ' + resultType);

    conflictCount = await page.evaluate(() => document.querySelectorAll('[data-testid="conflict-item"]').length);
    if (conflictCount !== 1) throw new Error('재조회 후 conflict 개수 1(bkg-02만) 기대, got ' + conflictCount + ' — 이전 결과가 남아있을 가능성(stale DOM)');

    altCount = await page.evaluate(() => document.querySelectorAll('[data-testid="alternative-item"]').length);
    if (altCount !== 3) throw new Error('재조회 후 대체 후보 3개 기대, got ' + altCount);

    const altTimes = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="alternative-item"] .t')).map((el) => el.textContent));
    if (!altTimes.some((t) => t.includes('02:00'))) throw new Error('재조회 후 대체 후보 시간이 갱신되지 않음(stale): ' + JSON.stringify(altTimes));
    if (altTimes.some((t) => t.includes('01:30'))) throw new Error('재조회 후에도 이전(1차) 대체 후보 시간이 남아있음(stale DOM): ' + JSON.stringify(altTimes));
    `,
  );
});

test('E2E-3 키보드 전용 조작 + 접근성 포커스 관리 — 마우스 없이 폼 완성/제출, 오류 시 오류 배너로 포커스 이동', async (t) => {
  if (_FOCUSED_SKIP) return t.skip(`focused scope — ${process.env.BRIX_TEST_MODULE} 외 skip`);
  if (!e2eAvailable) return t.skip(skipReason);

  await runE2E(
    '예약 충돌 검사 — 키보드 전용 조작 + 검증 실패 시 포커스 이동',
    `
    // datetime-local 은 Chromium 에서 내부 세그먼트(월/일/년/시/분)를 Tab 으로 순회한 뒤에야
    // 다음 폼 컨트롤로 빠져나간다. 세그먼트 개수는 브라우저 구현에 의존하므로 bounded loop 로 탐색한다.
    async function tabUntilTestId(testid, maxPresses) {
      let diag = null;
      for (let i = 0; i < maxPresses; i += 1) {
        await page.keyboard.press('Tab');
        diag = await page.evaluate(() => {
          const el = document.activeElement;
          return el ? { id: el.id, tag: el.tagName, testid: el.getAttribute('data-testid') } : null;
        });
        if (diag && diag.testid === testid) return diag;
      }
      throw new Error('Tab(' + maxPresses + '회 이내)으로 [data-testid=' + testid + '] 도달 실패, 마지막 포커스: ' + JSON.stringify(diag));
    }

    // Tab 으로 첫 필드(회의실 select) 진입
    await page.keyboard.press('Tab');
    let active = await page.evaluate(() => document.activeElement && document.activeElement.id);
    if (active !== 'f-room') throw new Error('첫 Tab 포커스가 회의실 select 가 아님: ' + active);

    // 방향키만으로 옵션 선택(마우스 클릭 없음)
    await page.keyboard.press('ArrowDown');
    const roomValue = await page.evaluate(() => document.getElementById('f-room').value);
    if (!roomValue) throw new Error('키보드(ArrowDown)로 회의실 옵션이 선택되지 않음');

    await page.keyboard.press('Tab');
    active = await page.evaluate(() => document.activeElement && document.activeElement.id);
    if (active !== 'f-name') throw new Error('두번째 Tab 포커스가 신청자명 input 이 아님: ' + active);
    await page.keyboard.type('키보드테스터');

    await page.fill('#f-start', '2026-07-27T10:00');
    await page.fill('#f-end', '2026-07-27T11:00');

    // Tab 으로 제출 버튼까지 이동 후 Enter 로 제출(클릭 없음)
    await page.focus('#f-end');
    await tabUntilTestId('check-btn', 8);
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-testid="result-panel"]');

    const resultType = await page.evaluate(() => document.querySelector('[data-testid="result-panel"]')?.dataset.result);
    if (resultType !== 'available') throw new Error('키보드 전용 제출 결과가 available 아님: ' + resultType);

    // 접근성 회귀: 검증 실패 시 오류 배너(role=alert)로 포커스 이동해야 함
    await page.focus('#f-name');
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.focus('#f-end');
    await tabUntilTestId('check-btn', 8);
    await page.keyboard.press('Enter');

    active = await page.evaluate(() => document.activeElement && document.activeElement.id);
    if (active !== 'form-error') throw new Error('검증 실패 시 포커스가 오류 배너(#form-error)로 이동하지 않음(키보드 전용 접근성 위반): ' + active);

    const alertRole = await page.evaluate(() => document.getElementById('form-error')?.getAttribute('role'));
    if (alertRole !== 'alert') throw new Error('오류 배너 role=alert 아님: ' + alertRole);

    const errText = await page.evaluate(() => document.querySelector('[data-testid="form-error-text"]')?.textContent);
    if (!errText || !errText.includes('신청자명')) throw new Error('오류 메시지에 누락 필드(신청자명) 안내가 없음: ' + errText);
    `,
  );
});

test('E2E-4 모바일 폭 가독성 — 375px 뷰포트에서 레이아웃 재배치·가로 스크롤 없음·결과 표시', async (t) => {
  if (_FOCUSED_SKIP) return t.skip(`focused scope — ${process.env.BRIX_TEST_MODULE} 외 skip`);
  if (!e2eAvailable) return t.skip(skipReason);

  await runE2E(
    '예약 충돌 검사 — 모바일 폭(375px) 레이아웃/결과 표시',
    `
    await page.setViewportSize({ width: 375, height: 700 });

    await page.selectOption('#f-room', 'room-01');
    await page.fill('#f-name', '모바일테스터');
    await page.fill('#f-start', '2026-07-27T10:00');
    await page.fill('#f-end', '2026-07-27T11:00');
    await page.click('[data-testid="check-btn"]');
    await page.waitForSelector('[data-testid="result-panel"]');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (overflow) throw new Error('모바일 폭(375px)에서 가로 스크롤 발생(레이아웃 오버플로우)');

    const timeRowDirection = await page.evaluate(() => getComputedStyle(document.querySelector('.time-row')).flexDirection);
    if (timeRowDirection !== 'column') throw new Error('모바일 폭에서 .time-row 가 column 배치로 전환되지 않음: ' + timeRowDirection);

    const widths = await page.evaluate(() => ({
      btn: document.querySelector('.btn-check').getBoundingClientRect().width,
      app: document.querySelector('.app').getBoundingClientRect().width,
    }));
    if (widths.btn < widths.app * 0.9) throw new Error('모바일 폭에서 제출 버튼이 전체 너비로 확장되지 않음: btn=' + widths.btn + ' app=' + widths.app);

    const resultVisible = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="result-panel"]');
      return !!el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).display !== 'none';
    });
    if (!resultVisible) throw new Error('모바일 폭에서 결과 패널이 표시되지 않음');
    `,
  );
});
