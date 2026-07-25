// BF-1172 — 고객 피드백 우선순위 보드 E2E 회귀 가드 (feedback-board/, BF-1170 리뷰 통과 코드 기준).
// 순수 로직(sortFeedback/matchesFilters/computeKpis/canTransition/applyTransition 등)은
// feedback-board/logic.test.js 에서 dev(BF-1170)가 이미 검증했으므로,
// 여기서는 실제 브라우저 DOM 인터랙션 — 등록, 필터+KPI 재계산, 상태 전환 체인,
// 저장 실패 → 재시도 복구, 키보드 전용 조작, aria-live 알림 — 만 확인한다.
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

// board.js 가 <script type="module"> 로 로드되므로 정확한 MIME 타입이 필수(모듈 스크립트는 strict 체크).
const MIME_BY_EXT = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
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
      const type = MIME_BY_EXT[path.extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type }).end(buf);
    });
  });
  return new Promise((resolve) => {
    // 0.0.0.0 바인딩 필수 — e2e-runner 컨테이너가 hostname 으로 도달.
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

async function assertE2eOk(res) {
  const body = await res.json();
  if (!body.ok || !body.passed) {
    throw new Error(
      `e2e-runner 시나리오 실패 — ok:${body.ok} passed:${body.passed} stdout:${body.stdout || ''}`
    );
  }
}

test(
  'BF-1172 E2E — 등록→필터/KPI 재계산→상태 전환(검토대기→계획됨→완료, 항목 재시도 복구)',
  { skip: _brixOutOfScope },
  async (t) => {
    if (process.env.BRIX_E2E_SKIP === '1') {
      t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
      return;
    }

    const { server, port } = await startStaticServer('.');
    t.after(() => server.close());

    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/feedback-board/`;

    try {
      const probe = await fetch('http://e2e-runner:3030/health', {
        signal: AbortSignal.timeout(2000),
      });
      if (!probe.ok) {
        t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
        return;
      }
    } catch (err) {
      t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
      return;
    }

    const runId = process.env.BRIX_RUN_ID;
    const jiraKey = process.env.BRIX_JIRA_KEY;
    if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');

    const scriptText = `
      // 0) 최초 로드 — fixture 8건, KPI 총계 8
      await page.waitForSelector('.feedback-list .feedback-item');
      const kpiTotalBefore = (await page.locator('#kpi-summary .kpi-card').first().locator('.kpi-card__value').textContent() || '').trim();
      if (kpiTotalBefore !== '8') throw new Error('초기 KPI 총계가 8이 아님: ' + kpiTotalBefore);

      // 1) 등록 (§5.2) — 신규 피드백은 검토 대기로 고정 등록되고 KPI 총계가 갱신된다.
      await page.locator('#f-title').fill('신규 피드백 자동화 테스트');
      await page.locator('#f-desc').fill('E2E 자동화 등록 테스트 설명입니다.');
      await page.locator('#f-sev').selectOption('high');
      await page.locator('#f-ch').selectOption('web_form');
      await page.locator('#register-submit').click();
      await page.waitForSelector('#register-success:not([hidden])');
      const registerSuccessText = await page.locator('#register-success').textContent();
      if (!registerSuccessText || !registerSuccessText.includes('피드백이 등록되었습니다')) {
        throw new Error('등록 성공 문구 불일치: ' + registerSuccessText);
      }
      await page.waitForSelector('.feedback-item[data-id="FB-6009"]');
      const newItemBadge = await page.locator('.feedback-item[data-id="FB-6009"] .badge--status-pending_review').count();
      if (newItemBadge !== 1) throw new Error('신규 등록 항목이 검토 대기 상태가 아님');
      const kpiTotalAfterRegister = (await page.locator('#kpi-summary .kpi-card').first().locator('.kpi-card__value').textContent() || '').trim();
      if (kpiTotalAfterRegister !== '9') throw new Error('등록 후 KPI 총계가 9가 아님: ' + kpiTotalAfterRegister);

      // 2) 필터링 (§5.3) — 카테고리 내 OR/카테고리 간 AND, KPI 는 필터와 무관하게 항상 전체 기준 유지.
      await page.locator('.filter-group[data-cat="severity"] input[value="critical"]').click();
      await page.waitForFunction(() => (document.querySelector('#result-count')||{}).textContent && document.querySelector('#result-count').textContent.includes('2건'));
      const criticalCount = await page.locator('.feedback-item').count();
      if (criticalCount !== 2) throw new Error('심각도(치명적) 필터 결과 개수 불일치: ' + criticalCount);
      const kpiDuringFilter = (await page.locator('#kpi-summary .kpi-card').first().locator('.kpi-card__value').textContent() || '').trim();
      if (kpiDuringFilter !== '9') throw new Error('필터 적용 중 KPI 총계가 변경됨(전체 기준이어야 함): ' + kpiDuringFilter);

      await page.locator('.filter-group[data-cat="severity"] input[value="critical"]').click();
      await page.locator('.filter-group[data-cat="status"] input[value="pending_review"]').click();
      await page.locator('.filter-group[data-cat="severity"] input[value="critical"]').click();
      const combinedCount = await page.locator('.feedback-item').count();
      if (combinedCount !== 1) throw new Error('상태+심각도 AND 필터 결과 개수 불일치: ' + combinedCount);
      const combinedId = await page.locator('.feedback-item').first().getAttribute('data-id');
      if (combinedId !== 'FB-6002') throw new Error('상태+심각도 AND 필터 결과 항목 불일치: ' + combinedId);

      await page.locator('#filter-reset').click();
      await page.waitForFunction(() => document.querySelectorAll('.feedback-item').length === 9);

      // 3) 상태 전환 체인 (§4.1) — 검토 대기 → 계획됨 → 처리 완료, 두 번째 전환은 실패 후 항목 재시도로 복구.
      const toPlannedBtn = page.locator('.feedback-item[data-id="FB-6001"] button[data-action="transition"]');
      const toPlannedText = await toPlannedBtn.textContent();
      if (!toPlannedText || !toPlannedText.includes('계획됨으로')) throw new Error('전환 버튼 라벨 불일치: ' + toPlannedText);
      await toPlannedBtn.click();
      await page.waitForSelector('.feedback-item[data-id="FB-6001"] .badge--status-planned');

      await page.evaluate(() => window.__feedbackBoard.setSaveAdapter(() => Promise.reject(new Error('save failed'))));
      await page.locator('.feedback-item[data-id="FB-6001"] button[data-action="transition"]').click();
      await page.waitForSelector('.feedback-item[data-id="FB-6001"] .feedback-item__error');
      const itemErrorText = await page.locator('.feedback-item[data-id="FB-6001"] .feedback-item__error').textContent();
      if (!itemErrorText || !itemErrorText.includes('저장에 실패했습니다')) throw new Error('항목 전환 실패 안내 문구 불일치: ' + itemErrorText);
      const stillPlanned = await page.locator('.feedback-item[data-id="FB-6001"] .badge--status-planned').count();
      if (stillPlanned !== 1) throw new Error('전환 실패 후에도 상태가 변경됨(불변 위반)');
      const liveSaveOnFail = await page.locator('#live-save').textContent();
      if (!liveSaveOnFail || !liveSaveOnFail.includes('저장에 실패했습니다')) throw new Error('aria-live(live-save) 실패 알림 불일치: ' + liveSaveOnFail);

      await page.evaluate(() => window.__feedbackBoard.resetSaveAdapter());
      await page.locator('.feedback-item[data-id="FB-6001"] button[data-action="retry-transition"]').click();
      await page.waitForSelector('.feedback-item[data-id="FB-6001"] .badge--status-done');
      const doneMeta = await page.locator('.feedback-item[data-id="FB-6001"]').textContent();
      if (!doneMeta || !doneMeta.includes('전환 완료 — 다음 단계 없음')) throw new Error('완료 후 다음 단계 없음 안내 누락');
      const liveSaveOnSuccess = await page.locator('#live-save').textContent();
      if (!liveSaveOnSuccess || !liveSaveOnSuccess.includes('상태가 변경되었습니다')) throw new Error('aria-live(live-save) 성공 알림 불일치: ' + liveSaveOnSuccess);

      // 4) 전환 완료로 KPI(처리 완료 건수) 도 재계산되어야 한다 (기존 done 2건 + 이번 1건 = 3건).
      const leadCard = page.locator('#kpi-summary .kpi-card').nth(3);
      const leadCaption = await leadCard.locator('.caption').textContent();
      if (!leadCaption || !leadCaption.includes('처리 완료 3건 기준')) throw new Error('리드타임 카드의 완료 건수 갱신 불일치: ' + leadCaption);
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
        label: '피드백 등록→필터/KPI 재계산→상태전환 체인+항목 재시도 복구',
        scriptText,
        timeoutMs: 60000,
      }),
    });

    await assertE2eOk(res);
  }
);

test(
  'BF-1172 E2E — 키보드 전용 등록(Tab 이동, 마우스 미사용) + 등록 저장 실패 재시도 + aria-live 알림',
  { skip: _brixOutOfScope },
  async (t) => {
    if (process.env.BRIX_E2E_SKIP === '1') {
      t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
      return;
    }

    const { server, port } = await startStaticServer('.');
    t.after(() => server.close());

    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/feedback-board/`;

    try {
      const probe = await fetch('http://e2e-runner:3030/health', {
        signal: AbortSignal.timeout(2000),
      });
      if (!probe.ok) {
        t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
        return;
      }
    } catch (err) {
      t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
      return;
    }

    const runId = process.env.BRIX_RUN_ID;
    const jiraKey = process.env.BRIX_JIRA_KEY;
    if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');

    const scriptText = `
      await page.waitForSelector('.feedback-list .feedback-item');

      // 0) 저장 실패를 먼저 주입 — 키보드로만 등록을 시도하면 실패 배너/aria-live 로 안내되어야 한다.
      await page.evaluate(() => window.__feedbackBoard.setSaveAdapter(() => Promise.reject(new Error('network down'))));

      // 1) 마우스 클릭 없이 Tab/ArrowDown/Enter 만으로 등록 폼을 채우고 제출한다 (DOM 순서: 제목→설명→심각도→채널→제출).
      await page.locator('#f-title').focus();
      await page.keyboard.type('키보드 전용 등록 테스트');
      await page.keyboard.press('Tab');
      await page.keyboard.type('키보드만으로 등록한 설명입니다.');
      await page.keyboard.press('Tab');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Tab');
      await page.keyboard.press('ArrowDown');
      const focusedBeforeSubmit = await page.evaluate(() => document.activeElement && document.activeElement.id);
      if (focusedBeforeSubmit !== 'f-ch') throw new Error('Tab 이동 후 포커스가 채널 select 가 아님: ' + focusedBeforeSubmit);
      const severityChosen = await page.locator('#f-sev').inputValue();
      const channelChosen = await page.locator('#f-ch').inputValue();
      if (severityChosen !== 'critical') throw new Error('ArrowDown 으로 선택된 심각도 값 불일치: ' + severityChosen);
      if (channelChosen !== 'in_app') throw new Error('ArrowDown 으로 선택된 채널 값 불일치: ' + channelChosen);
      // 제출 버튼은 포커스+Enter 로만 활성화한다(마우스 click 미사용). register-error 배너의
      // 화면 표시 여부(§5.6 hidden 계약)는 별도 시나리오(BF-1172 CSS hidden 계약 가드)에서 확인한다.
      await page.locator('#register-submit').focus();
      await page.keyboard.press('Enter');

      // 2) 저장 실패 배너 + aria-live(assertive) 안내 확인.
      await page.waitForSelector('#register-error:not([hidden])');
      const liveSaveOnFail = await page.locator('#live-save').textContent();
      if (!liveSaveOnFail || !liveSaveOnFail.includes('저장에 실패했습니다. 다시 시도해 주세요')) {
        throw new Error('등록 실패 aria-live 안내 불일치: ' + liveSaveOnFail);
      }

      // 3) 저장 어댑터 복구 후 '다시 시도' 버튼도 키보드(포커스+Enter)만으로 동작해야 한다.
      await page.evaluate(() => window.__feedbackBoard.resetSaveAdapter());
      await page.locator('#register-retry').focus();
      await page.keyboard.press('Enter');

      await page.waitForSelector('#register-success:not([hidden])');
      const liveSaveOnSuccess = await page.locator('#live-save').textContent();
      if (!liveSaveOnSuccess || !liveSaveOnSuccess.includes('피드백이 등록되었습니다')) {
        throw new Error('등록 성공 aria-live 안내 불일치: ' + liveSaveOnSuccess);
      }
      await page.waitForSelector('.feedback-item[data-id="FB-6009"]');
      const registeredTitle = await page.locator('.feedback-item[data-id="FB-6009"] h3').textContent();
      if (!registeredTitle || !registeredTitle.includes('키보드 전용 등록 테스트')) {
        throw new Error('키보드로 등록한 항목의 제목 불일치: ' + registeredTitle);
      }
      const kpiTotalAfter = (await page.locator('#kpi-summary .kpi-card').first().locator('.kpi-card__value').textContent() || '').trim();
      if (kpiTotalAfter !== '9') throw new Error('재시도 성공 후 KPI 총계가 9가 아님: ' + kpiTotalAfter);
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
        label: '키보드 전용 등록(Tab/ArrowDown/Enter)+저장 실패 재시도+aria-live 알림',
        scriptText,
        timeoutMs: 45000,
      }),
    });

    await assertE2eOk(res);
  }
);

// BF-1172 회귀 발견 — style.css 의 `.state-error{...display:flex...}` 규칙이 `:not([hidden])` 가드 없이
// 적용되어, author stylesheet(display:flex) 가 UA stylesheet(`[hidden]{display:none}`) 를 origin
// 우선순위로 이겨 #register-error 배너가 hidden 속성과 무관하게 항상 화면에 노출/포커스 가능해진다.
// (§5.6 SaveErrorBanner 계약 — 저장 실패 시에만 노출) dev 재작업 필요 — 이 가드는 CSS 수정 전까지 실패해야 정상.
test(
  'BF-1172 E2E — 저장 실패 배너(#register-error)는 최초 로드 시 hidden 이며 화면에 보이지 않아야 한다',
  { skip: _brixOutOfScope },
  async (t) => {
    if (process.env.BRIX_E2E_SKIP === '1') {
      t.skip('BRIX_E2E_SKIP=1 — CI 결정성 가드');
      return;
    }

    const { server, port } = await startStaticServer('.');
    t.after(() => server.close());

    const host = process.env.BRIX_PERSONA_HOST || 'worker';
    const url = `http://${host}:${port}/feedback-board/`;

    try {
      const probe = await fetch('http://e2e-runner:3030/health', {
        signal: AbortSignal.timeout(2000),
      });
      if (!probe.ok) {
        t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
        return;
      }
    } catch (err) {
      t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
      return;
    }

    const runId = process.env.BRIX_RUN_ID;
    const jiraKey = process.env.BRIX_JIRA_KEY;
    if (!runId || !jiraKey) throw new Error('worker-injected run identity missing');

    const scriptText = `
      await page.waitForSelector('.feedback-list .feedback-item');
      const hiddenAtLoad = await page.locator('#register-error').isHidden();
      if (!hiddenAtLoad) {
        throw new Error('페이지 최초 로드인데 저장 실패 배너(#register-error)가 화면에 보임 — style.css .state-error 규칙이 hidden 속성을 무시함(§5.6 계약 위반)');
      }
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
        label: 'CSS hidden 계약 가드 — register-error 배너 최초 로드 시 비노출',
        scriptText,
        timeoutMs: 20000,
      }),
    });

    await assertE2eOk(res);
  }
);
