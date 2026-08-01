// BF-1452: 피드백 카드 브라우저 E2E 회귀 가드
// frozen 계약: docs/plans/operator-feedback-BF-1446.md (state 모델·selector·token)
// 단위 레벨 상태 머신 로직은 operator-feedback.test.js 에서 이미 검증됨 — 여기서는
// 실 브라우저 키보드 인터랙션 + aria-live 갱신 + 성공/경고/실패 + 중복 제출 차단만 다룬다.

import test from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'e2e';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

// mount()를 다시 호출해 submitHandler 결과(success/warning/failure)와 타이밍을
// 테스트에서 원격 제어하는 harness 페이지. 실제 operator-feedback.js 는 그대로 import.
const HARNESS_HTML = `<!doctype html>
<html lang="ko">
<body>
  <div id="feedback-card-root" class="feedback-card" data-state="idle">
    <div class="feedback-card__actions">
      <button id="feedback-confirm-btn" type="button" aria-label="피드백 확인">확인</button>
      <button id="feedback-submit-btn" type="button" aria-label="피드백 제출" disabled>제출</button>
    </div>
    <div id="feedback-status-live" class="feedback-card__status" data-state="idle" aria-live="polite" aria-busy="false">
      <p class="feedback-card__message">대기 중입니다. 확인 버튼을 눌러 시작하세요.</p>
    </div>
  </div>
  <script type="module">
    import { mount } from './operator-feedback.js';
    window.__brixOutcomeQueue = [];
    window.__brixPendingResolvers = [];
    window.__brixSubmitCalls = 0;
    const root = document.getElementById('feedback-card-root');
    window.__brixController = mount(root, {
      submitHandler: () => {
        window.__brixSubmitCalls += 1;
        return new Promise((resolve) => {
          const outcome = window.__brixOutcomeQueue.shift() || 'success';
          window.__brixPendingResolvers.push(() => resolve({ outcome }));
        });
      },
    });
    window.__brixFlushSubmit = () => {
      const resolvers = window.__brixPendingResolvers.splice(0);
      resolvers.forEach((fn) => fn());
    };
  </script>
</body>
</html>
`;

// serveRoot 아래 정적 파일 + /harness.html 가상 경로만 노출하는 self-contained 서버.
function startServer(serveRoot) {
  const root = path.resolve(serveRoot);
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/harness.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(HARNESS_HTML);
      return;
    }
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
      const contentType = target.endsWith('.js')
        ? 'text/javascript; charset=utf-8'
        : target.endsWith('.html')
          ? 'text/html; charset=utf-8'
          : 'application/octet-stream';
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
      return;
    }
  } catch (err) {
    e2eAvailable = false;
    skipReason = `e2e-runner 도달 불가 (${err.message}) — skip`;
    return;
  }
  const started = await startServer(path.join(__dirname));
  server = started.server;
  port = started.port;
});

test.after(() => {
  if (server) server.close();
});

async function runE2E({ label, url, scriptText, timeoutMs = 30000 }) {
  const runId = process.env.BRIX_RUN_ID;
  const jiraKey = process.env.BRIX_JIRA_KEY;
  if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');
  const res = await fetch('http://e2e-runner:3030/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Brix-Run-Id': runId,
      'X-Brix-Jira-Key': jiraKey,
    },
    body: JSON.stringify({ url, label, scriptText, timeoutMs }),
  });
  const json = await res.json();
  if (!json.ok || !json.passed) {
    throw new Error(`e2e-runner 시나리오 실패 [${label}]: ${json.stdout || JSON.stringify(json)}`);
  }
  return json;
}

test(
  'BF-1452 — 키보드만으로 확인→제출→성공 흐름 완주',
  { skip: _brixOutOfScope },
  async (t) => {
    if (!e2eAvailable) {
      t.skip(skipReason);
      return;
    }
    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/operator-feedback.html`;
    const scriptText = `
      await page.locator('#feedback-confirm-btn').focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('#feedback-card-root[data-state="confirming"]');
      await page.locator('#feedback-submit-btn').focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('#feedback-card-root[data-state="success"]', { timeout: 5000 });
      const confirmDisabled = await page.evaluate(() => document.getElementById('feedback-confirm-btn').disabled);
      if (confirmDisabled) throw new Error('success 상태에서 확인 버튼이 비활성화됨 — 재시작 불가');
      const message = await page.evaluate(() => document.querySelector('.feedback-card__message').textContent);
      if (!message.includes('성공')) throw new Error('성공 메시지 누락: ' + message);
    `;
    await runE2E({
      label: '피드백 카드 — 키보드만 확인→제출→성공 흐름',
      url,
      scriptText,
    });
  }
);

test(
  'BF-1452 — aria-live 상태 안내가 각 상태 전이에서 갱신된다',
  { skip: _brixOutOfScope },
  async (t) => {
    if (!e2eAvailable) {
      t.skip(skipReason);
      return;
    }
    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/harness.html`;
    const scriptText = `
      const readState = () => page.evaluate(() => ({
        state: document.getElementById('feedback-status-live').dataset.state,
        message: document.querySelector('.feedback-card__message').textContent,
        busy: document.getElementById('feedback-status-live').getAttribute('aria-busy'),
      }));
      const idle = await readState();
      await page.locator('#feedback-confirm-btn').focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('#feedback-status-live[data-state="confirming"]');
      const confirming = await readState();
      await page.locator('#feedback-submit-btn').focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('#feedback-status-live[data-state="submitting"]');
      const submitting = await readState();
      await page.evaluate(() => window.__brixFlushSubmit());
      await page.waitForSelector('#feedback-status-live[data-state="success"]');
      const success = await readState();

      const snapshots = { idle, confirming, submitting, success };
      for (const [name, snap] of Object.entries(snapshots)) {
        if (!snap.message || !snap.message.trim()) throw new Error(name + ' 상태에서 aria-live 메시지가 비어있음');
      }
      const uniqueMessages = new Set(Object.values(snapshots).map((s) => s.message));
      if (uniqueMessages.size !== 4) throw new Error('상태별 aria-live 메시지가 모두 달라야 함: ' + JSON.stringify(snapshots));
      if (submitting.busy !== 'true') throw new Error('submitting 상태에서 aria-busy=true 아님: ' + submitting.busy);
      if (success.busy !== 'false') throw new Error('success 상태에서 aria-busy=false 복귀 안 됨: ' + success.busy);
    `;
    await runE2E({
      label: '피드백 카드 — aria-live 상태별 메시지·aria-busy 갱신',
      url,
      scriptText,
    });
  }
);

test(
  'BF-1452 — 성공·경고·실패 상태 및 중복 제출 차단이 실제 브라우저로 검증된다',
  { skip: _brixOutOfScope },
  async (t) => {
    if (!e2eAvailable) {
      t.skip(skipReason);
      return;
    }
    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/harness.html`;
    const scriptText = `
      // 1) 경고(warning) 경로
      await page.evaluate(() => { window.__brixOutcomeQueue.push('warning'); });
      await page.locator('#feedback-confirm-btn').focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('#feedback-status-live[data-state="confirming"]');
      await page.locator('#feedback-submit-btn').focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('#feedback-status-live[data-state="submitting"]');
      await page.evaluate(() => window.__brixFlushSubmit());
      await page.waitForSelector('#feedback-card-root[data-state="warning"]');
      const warningMsg = await page.evaluate(() => document.querySelector('.feedback-card__message').textContent);
      if (!warningMsg.includes('경고')) throw new Error('경고 상태 메시지 누락: ' + warningMsg);

      // 2) reset 후 실패(failure) 경로
      await page.evaluate(() => { window.__brixOutcomeQueue.push('failure'); });
      await page.locator('#feedback-confirm-btn').focus();
      await page.keyboard.press('Enter'); // warning(터미널) -> reset -> idle
      await page.waitForSelector('#feedback-card-root[data-state="idle"]');
      await page.keyboard.press('Enter'); // idle -> confirming
      await page.waitForSelector('#feedback-status-live[data-state="confirming"]');
      await page.locator('#feedback-submit-btn').focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('#feedback-status-live[data-state="submitting"]');
      await page.evaluate(() => window.__brixFlushSubmit());
      await page.waitForSelector('#feedback-card-root[data-state="failure"]');
      const failureMsg = await page.evaluate(() => document.querySelector('.feedback-card__message').textContent);
      if (!failureMsg.includes('실패')) throw new Error('실패 상태 메시지 누락: ' + failureMsg);

      // 3) reset 후 성공(success) 경로 + 제출 중 중복 실행 차단
      // 이전 경고/실패 라운드의 호출 수를 제외하고 이번 라운드만 정확히 계측한다.
      await page.evaluate(() => { window.__brixSubmitCalls = 0; window.__brixOutcomeQueue.push('success'); });
      await page.locator('#feedback-confirm-btn').focus();
      await page.keyboard.press('Enter'); // failure(터미널) -> reset -> idle
      await page.waitForSelector('#feedback-card-root[data-state="idle"]');
      await page.keyboard.press('Enter'); // idle -> confirming
      await page.waitForSelector('#feedback-status-live[data-state="confirming"]');
      await page.locator('#feedback-submit-btn').focus();
      await page.keyboard.press('Enter'); // confirming -> submitting (첫 제출)
      await page.waitForSelector('#feedback-status-live[data-state="submitting"]');
      const submitDisabledDuringSubmit = await page.evaluate(() => document.getElementById('feedback-submit-btn').disabled);
      if (!submitDisabledDuringSubmit) throw new Error('submitting 중 제출 버튼이 비활성화되지 않음 — 중복 실행 위험');
      await page.keyboard.press('Enter'); // 제출 중 중복 시도 (비활성 버튼 — 무시되어야 함)
      await page.keyboard.press('Enter'); // 한번 더 시도
      await page.evaluate(() => window.__brixFlushSubmit());
      await page.waitForSelector('#feedback-card-root[data-state="success"]');
      const submitCalls = await page.evaluate(() => window.__brixSubmitCalls);
      if (submitCalls !== 1) throw new Error('중복 실행 차단 실패 — submitHandler 호출 횟수: ' + submitCalls);
    `;
    await runE2E({
      label: '피드백 카드 — 성공/경고/실패 상태 및 중복 제출 차단',
      url,
      scriptText,
      timeoutMs: 40000,
    });
  }
);
