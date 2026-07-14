// tests/incident-command/BF826-e2e.test.js — /incident-command/ E2E 브라우저 회귀 가드
//
// BF-824 dev 산출물 (incident-command/ 모듈) 이 main 에 들어간 후 실 브라우저
// 렌더 · fixture 로딩 · checklist 토글 · 반응형 · empty/error 상태가 silent break
// 되지 않도록, e2e-runner 컨테이너로 worker host URL 에 접근해 검증한다.
//
// 보호 대상 (BF-826 수용 기준):
//   AC1. 머지된 main 기준 /incident-command/ 진입 → fixture 렌더 → checklist 토글
//        시나리오가 모두 통과한다.
//   AC2. 모바일 뷰포트에서 반응형 레이아웃 가드가 통과하고 콘솔 에러가 0건이다.
//
// 작성 방침 (BF-811/BF-805 e2e-worker-host 패턴 준수):
//   - CI 결정성: BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 t.skip().
//     assert.ok(reachable, ...) 같은 hookFail 패턴 금지.
//   - focused scope 정책: BRIX_TEST_MODULE 이 'incident-command' 가 아니면 module skip.
//   - BRIX_PERSONA_HOST env 우선. compose 서비스 hostname 만 허용
//     (host.docker.internal / localhost 금지 — e2e-runner 는 다른 컨테이너).
//   - dev 의 tests/incident-command-BF824.test.js 가 validateIncidentRecord/loadIncidents/
//     filterIncidentsBySeverity/calculateChecklistProgress/toggleChecklistItem 순수 함수 +
//     fixture 스키마 + 정적 소스 가드(fetch/XHR/module 금지) + DOM 마크업 계약(정규식)을
//     이미 커버 → 본 파일은 재작성하지 않는다.
//     본 파일은 **실 브라우저에서만 검증 가능한 항목** — 실 클릭으로 트리거되는 change
//     이벤트 기반 checklist 토글/복귀, 실 severity 필터 클릭에 따른 재렌더,
//     실 viewport 리사이즈에 따른 CSS 그리드 반응형 전환, 그리고 command.js 가
//     실 데이터 파이프라인을 거쳐 도달하는 앱 레벨 empty/error data-view-state 의
//     실 DOM 반영 — 만 담당한다.
//   - fixture(INCIDENTS) 의 값은 dev 산출물의 고정 데이터를 그대로 사용 —
//     재해석 없이 "실 DOM 에 반영되는지" 만 확인한다.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "incident-command";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // E2E AC1~AC2 — 렌더 → fixture 로딩 → checklist 토글(실 클릭) → 필터 →
  //   반응형(mobile/desktop) → console error 0건 (e2e-runner 호출 1회로 통합)
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-826 E2E AC1~AC2: 렌더→fixture 로딩→checklist 토글→필터→반응형→console error 0건",
    async (t) => {
      if (process.env.BRIX_E2E_SKIP === "1") {
        t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
        return;
      }
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/incident-command/`;

        const scriptText = `
          // ── STEP 0: error hook 설치 후 재로드 (부팅 구간 포함) ──
          await page.waitForSelector('#incident-command');
          await page.evaluate(() => {
            window.__icErrors = [];
            window.addEventListener('error', (e) => {
              window.__icErrors.push('error: ' + (e.message || String(e)));
            });
            window.addEventListener('unhandledrejection', (e) => {
              window.__icErrors.push(
                'unhandledrejection: ' + String(e.reason && e.reason.message ? e.reason.message : e.reason),
              );
            });
            const origErr = console.error.bind(console);
            console.error = function () {
              try {
                window.__icErrors.push('console.error: ' + Array.from(arguments).map(String).join(' '));
              } catch (_e) { /* 무한 재귀 방지 */ }
              return origErr.apply(console, arguments);
            };
          });
          await page.reload();
          await page.waitForSelector('#incident-command[data-view-state="ready"]');

          // ── STEP 1: 렌더 · fixture 로딩 — 목록 6건 + 첫 장애(INC-3001) 기본 선택 (AC-01) ──
          const s1 = await page.evaluate(() => ({
            rowIds: Array.from(document.querySelectorAll('#incident-list > li[data-id]')).map((li) => li.getAttribute('data-id')),
            countText: document.getElementById('incident-count').textContent,
            selectedId: document.getElementById('incident-detail').getAttribute('data-selected-id'),
            titleText: document.querySelector('.ic-detail-head__title')?.textContent,
            ownerName: document.querySelector('.ic-owner__name')?.textContent,
          }));
          if (s1.rowIds.length !== 6) throw new Error('#incident-list 행 개수 !== 6: ' + JSON.stringify(s1.rowIds));
          if (s1.rowIds[0] !== 'INC-3001') throw new Error('첫 행이 INC-3001 이 아님: ' + s1.rowIds[0]);
          if (s1.countText !== '총 6건 표시') throw new Error('#incident-count 문구 불일치: ' + s1.countText);
          if (s1.selectedId !== 'INC-3001') throw new Error('기본 선택 장애 !== INC-3001: ' + s1.selectedId);
          if (s1.titleText !== '결제 게이트웨이 타임아웃 급증') throw new Error('상세 제목 fixture 불일치: ' + s1.titleText);
          if (s1.ownerName !== '김온콜') throw new Error('상세 owner fixture 불일치: ' + s1.ownerName);
          console.log('[step1] 목록 6건 렌더 + INC-3001 fixture 데이터 실 DOM 반영 OK');

          // ── STEP 2: checklist 실 클릭 토글 — INC-3001 (4건 중 2건 완료) → 3건 완료 → 원복 (EC-05) ──
          const before = await page.evaluate(() => ({
            progressText: document.querySelector('.ic-progress__text').textContent,
            ariaNow: document.getElementById('checklist-progress').getAttribute('aria-valuenow'),
            checked: document.getElementById('chk-3001-3').checked,
          }));
          if (before.progressText !== '2/4 완료 (50%)') throw new Error('초기 진행률 텍스트 불일치: ' + before.progressText);
          if (before.ariaNow !== '50') throw new Error('초기 aria-valuenow !== 50: ' + before.ariaNow);
          if (before.checked) throw new Error('chk-3001-3 이 초기부터 checked 상태');

          await page.click('#chk-3001-3');
          await new Promise((r) => setTimeout(r, 120));
          const afterCheck = await page.evaluate(() => {
            const li = document.querySelector('li[data-checklist-id="chk-3001-3"]');
            const time = li.querySelector('.ic-check__at');
            return {
              checked: document.getElementById('chk-3001-3').checked,
              progressText: document.querySelector('.ic-progress__text').textContent,
              ariaNow: document.getElementById('checklist-progress').getAttribute('aria-valuenow'),
              timeText: time ? time.textContent : null,
            };
          });
          if (!afterCheck.checked) throw new Error('실 클릭 후 chk-3001-3 이 checked 되지 않음');
          if (afterCheck.progressText !== '3/4 완료 (75%)') throw new Error('토글 후 진행률 텍스트 불일치: ' + afterCheck.progressText);
          if (afterCheck.ariaNow !== '75') throw new Error('토글 후 aria-valuenow !== 75: ' + afterCheck.ariaNow);
          if (!afterCheck.timeText || !/^\\d{2}-\\d{2} \\d{2}:\\d{2}$/.test(afterCheck.timeText)) throw new Error('완료 시각 표시 형식 불일치: ' + afterCheck.timeText);
          console.log('[step2a] 실 클릭 토글 → checked + 진행률 2/4(50%)→3/4(75%) + 완료 시각 렌더 OK');

          await page.click('#chk-3001-3');
          await new Promise((r) => setTimeout(r, 120));
          const afterRevert = await page.evaluate(() => {
            const li = document.querySelector('li[data-checklist-id="chk-3001-3"]');
            return {
              checked: document.getElementById('chk-3001-3').checked,
              progressText: document.querySelector('.ic-progress__text').textContent,
              ariaNow: document.getElementById('checklist-progress').getAttribute('aria-valuenow'),
              timeGone: !li.querySelector('.ic-check__at'),
            };
          });
          if (afterRevert.checked) throw new Error('재클릭 후 chk-3001-3 이 여전히 checked');
          if (afterRevert.progressText !== '2/4 완료 (50%)') throw new Error('재클릭 후 진행률 원복 실패: ' + afterRevert.progressText);
          if (afterRevert.ariaNow !== '50') throw new Error('재클릭 후 aria-valuenow 원복 실패: ' + afterRevert.ariaNow);
          if (!afterRevert.timeGone) throw new Error('재클릭 후 완료 시각 표시가 제거되지 않음');
          console.log('[step2b] 재클릭(EC-05) → unchecked + 진행률 3/4(75%)→2/4(50%) 원복 OK');

          // ── STEP 3: 실 클릭으로 체크리스트 없는 장애(INC-3004) 선택 → empty 안내 실 DOM (§7.6) ──
          await page.click('li[data-id="INC-3004"]');
          await new Promise((r) => setTimeout(r, 120));
          const s3 = await page.evaluate(() => {
            const box = document.getElementById('incident-checklist');
            return {
              selectedId: document.getElementById('incident-detail').getAttribute('data-selected-id'),
              state: box.getAttribute('data-checklist-state'),
              noteText: box.querySelector('.ic-note')?.textContent,
              hasProgressBar: !!document.getElementById('checklist-progress'),
            };
          });
          if (s3.selectedId !== 'INC-3004') throw new Error('INC-3004 실 클릭 선택 실패: ' + s3.selectedId);
          if (s3.state !== 'no-checklist') throw new Error('data-checklist-state !== no-checklist: ' + s3.state);
          if (s3.noteText !== '해당 장애에 등록된 복구 체크리스트가 없습니다.') throw new Error('체크리스트 없음 안내 문구 불일치: ' + s3.noteText);
          if (s3.hasProgressBar) throw new Error('체크리스트 0건인데 진행률 바가 렌더됨 (0% 오인 방지 위반)');
          console.log('[step3] INC-3004 실 클릭 선택 → 체크리스트 없음 고정 문구 렌더 + 진행률 바 미생성 OK');

          // ── STEP 4: 실 클릭으로 심각도 필터(P4) → 목록 1건 + 필터 유지된 선택 (AC-03/EC-03) ──
          await page.click('[data-severity-filter="P4"]');
          await new Promise((r) => setTimeout(r, 120));
          const s4 = await page.evaluate(() => ({
            rowIds: Array.from(document.querySelectorAll('#incident-list > li[data-id]')).map((li) => li.getAttribute('data-id')),
            countText: document.getElementById('incident-count').textContent,
            selectedId: document.getElementById('incident-detail').getAttribute('data-selected-id'),
            p4Pressed: document.querySelector('[data-severity-filter="P4"]').getAttribute('aria-pressed'),
            allPressed: document.querySelector('[data-severity-filter="all"]').getAttribute('aria-pressed'),
          }));
          if (JSON.stringify(s4.rowIds) !== JSON.stringify(['INC-3004'])) throw new Error('P4 필터 결과 불일치: ' + JSON.stringify(s4.rowIds));
          if (s4.countText !== '총 1건 표시') throw new Error('필터 후 #incident-count 불일치: ' + s4.countText);
          if (s4.selectedId !== 'INC-3004') throw new Error('필터 후에도 선택 유지되어야 함(여전히 보임): ' + s4.selectedId);
          if (s4.p4Pressed !== 'true') throw new Error('P4 칩 aria-pressed !== true: ' + s4.p4Pressed);
          if (s4.allPressed !== 'false') throw new Error('전체 칩 aria-pressed !== false: ' + s4.allPressed);
          console.log('[step4] 실 클릭 P4 필터 → 1건 표시 + 선택 유지 + aria-pressed 갱신 OK');

          await page.click('[data-severity-filter="all"]');
          await new Promise((r) => setTimeout(r, 120));
          const s4b = await page.evaluate(() => document.querySelectorAll('#incident-list > li[data-id]').length);
          if (s4b !== 6) throw new Error('전체 칩 클릭 후 목록이 6건으로 복원되지 않음: ' + s4b);
          console.log('[step4b] 실 클릭 전체 필터 복원 → 6건 OK');

          // ── STEP 5: 반응형 — 모바일 뷰포트(375×667) → 단일 컬럼 + non-sticky 목록 패널 ──
          await page.setViewportSize({ width: 375, height: 667 });
          await new Promise((r) => setTimeout(r, 150));
          const mobile = await page.evaluate(() => {
            const grid = document.querySelector('.ic-grid');
            const listPane = document.querySelector('.ic-list-pane');
            return {
              columns: getComputedStyle(grid).gridTemplateColumns.trim().split(/\\s+/).length,
              listPanePosition: getComputedStyle(listPane).position,
            };
          });
          if (mobile.columns !== 1) throw new Error('모바일(375px) 그리드가 단일 컬럼이 아님: ' + mobile.columns);
          if (mobile.listPanePosition === 'sticky') throw new Error('모바일(375px) 에서 목록 패널이 sticky 로 렌더됨 (768px 미만 회귀)');
          console.log('[step5] 모바일 375px → 단일 컬럼 그리드 + non-sticky 목록 패널 OK');

          // ── STEP 6: 반응형 — 데스크톱 뷰포트(1280×900) → 2컬럼 + sticky 목록 패널 ──
          await page.setViewportSize({ width: 1280, height: 900 });
          await new Promise((r) => setTimeout(r, 150));
          const desktop = await page.evaluate(() => {
            const grid = document.querySelector('.ic-grid');
            const listPane = document.querySelector('.ic-list-pane');
            return {
              columns: getComputedStyle(grid).gridTemplateColumns.trim().split(/\\s+/).length,
              listPanePosition: getComputedStyle(listPane).position,
            };
          });
          if (desktop.columns !== 2) throw new Error('데스크톱(1280px) 그리드가 2컬럼이 아님: ' + desktop.columns);
          if (desktop.listPanePosition !== 'sticky') throw new Error('데스크톱(1280px) 에서 목록 패널이 sticky 가 아님: ' + desktop.listPanePosition);
          console.log('[step6] 데스크톱 1280px → 2컬럼 그리드 + sticky 목록 패널 OK');

          // ── STEP 7: 전체 시나리오 console.error / unhandledrejection / pageerror 0건 (AC2) ──
          const errs = await page.evaluate(() => window.__icErrors || []);
          if (errs.length > 0) {
            throw new Error('console/page error 발생 (' + errs.length + '건): ' + errs.slice(0, 5).join(' | '));
          }
          console.log('[step7] 렌더~반응형 전체 시나리오 console.error / unhandledrejection / pageerror 0건 OK');

          console.log('[done] BF-826 E2E AC1~AC2 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-826",
          },
          body: JSON.stringify({
            url,
            label:
              "인시던트 커맨드 센터 렌더→fixture 로딩→checklist 토글→필터→반응형→console error 0건 (BF-826 AC1~AC2)",
            scriptText,
            timeoutMs: 90000,
          }),
        });
        const json = await res.json();
        assert.ok(
          json.ok,
          `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
        );
        assert.ok(
          json.passed,
          `E2E AC1~AC2 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-3000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ─────────────────────────────────────────────────────────────
  // E2E — 앱 레벨 empty/error data-view-state 실 DOM 검증
  //
  //   dev fixture(INCIDENTS 6건, 전량 유효)로는 command.js 의 loadIncidents 가
  //   ok:false 이거나 incidents.length===0 인 경로에 실제로 도달할 수 없다
  //   (필터 결과 0건인 "filter-empty" 와는 다른, init() 의 최상위 empty/error
  //   분기). dev 의 BF824 테스트는 loadIncidents() 단위 반환값과 정적 마크업
  //   정규식만 검증했을 뿐, "실 브라우저에서 command.js 가 실제로 그 분기를
  //   타면 화면이 진짜로 그렇게 보이는지"는 검증하지 않았다.
  //   아래는 실 index.html + 실 style.css + 실 command.js(코드 무변경, 파일도
  //   그대로 fetch)를 그대로 로드하되, fixtures.js 스크립트 태그만 인메모리로
  //   대체한 2개의 합성 페이지로 그 경로를 실제로 태워 검증한다.
  //   incident-command/ 디렉토리의 파일은 전혀 수정하지 않는다(파일 소유권 준수).
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-826 E2E: 앱 레벨 empty/error data-view-state 실 DOM 검증",
    async (t) => {
      if (process.env.BRIX_E2E_SKIP === "1") {
        t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
        return;
      }
      if (!(await e2eRunnerReachable(t))) return;

      const indexHtmlPath = path.join(REPO_ROOT, "incident-command", "index.html");
      const rawHtml = fs.readFileSync(indexHtmlPath, "utf8");
      const ANCHOR = '<script src="./fixtures.js"></script>';
      assert.ok(
        rawHtml.includes(ANCHOR),
        "incident-command/index.html 에서 fixtures.js 스크립트 태그 앵커를 찾을 수 없음 — 구조 변경 시 본 가드도 함께 갱신 필요",
      );

      const emptyFixturesInline = `<script>window.IncidentCommandFixtures = ${JSON.stringify({
        INCIDENTS: [],
        SEVERITY_LABELS: {},
        STATUS_LABELS: {},
        EVENT_TYPE_LABELS: {},
      })};</script>`;
      const emptyHtml = rawHtml.replace(ANCHOR, emptyFixturesInline);
      // fixtures.js 자체를 아예 로드하지 않음 → window.IncidentCommandFixtures 가 undefined
      // → init() 의 "fixtures 없음" 분기(§13.4) 로 실제 도달.
      const errorHtml = rawHtml.replace(ANCHOR, "");

      const overrides = new Map([
        ["/incident-command/__bf826_empty__.html", emptyHtml],
        ["/incident-command/__bf826_error__.html", errorHtml],
      ]);

      const server = await startStaticServerWithOverrides(REPO_ROOT, overrides);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        // ── empty: INCIDENTS:[] → loadIncidents ok:true, incidents.length===0 ──
        const emptyRes = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-826",
          },
          body: JSON.stringify({
            url: `http://${selfHost}:${port}/incident-command/__bf826_empty__.html`,
            label: "인시던트 커맨드 센터 앱 레벨 empty 상태 실 DOM 검증 (BF-826)",
            scriptText: `
              await page.waitForSelector('#incident-command[data-view-state="empty"]');
              const info = await page.evaluate(() => {
                const emptyBox = document.querySelector('.ic-empty');
                const readyGrid = document.querySelector('.ic-ready-only');
                const skeleton = document.querySelector('.ic-skeleton');
                return {
                  viewState: document.getElementById('incident-command').getAttribute('data-view-state'),
                  emptyDisplay: getComputedStyle(emptyBox).display,
                  emptyText: emptyBox.textContent.trim(),
                  readyDisplay: getComputedStyle(readyGrid).display,
                  skeletonDisplay: getComputedStyle(skeleton).display,
                };
              });
              if (info.viewState !== 'empty') throw new Error('data-view-state !== empty: ' + info.viewState);
              if (info.emptyDisplay !== 'block') throw new Error('.ic-empty display !== block: ' + info.emptyDisplay);
              if (!info.emptyText.includes('표시할 장애가 없습니다.')) throw new Error('empty 고정 문구 불일치: ' + info.emptyText);
              if (info.readyDisplay !== 'none') throw new Error('empty 상태인데 .ic-ready-only 가 보임: ' + info.readyDisplay);
              if (info.skeletonDisplay !== 'none') throw new Error('empty 상태인데 .ic-skeleton 이 보임: ' + info.skeletonDisplay);
              console.log('[done] BF-826 empty 상태 실 DOM 검증 PASS');
            `,
            timeoutMs: 30000,
          }),
        });
        const emptyJson = await emptyRes.json();
        assert.ok(emptyJson.ok, `e2e-runner 응답 ok=false(empty): ${JSON.stringify(emptyJson).slice(0, 500)}`);
        assert.ok(
          emptyJson.passed,
          `empty 상태 시나리오 실패 — stdout 끝:\n${String(emptyJson.stdout ?? "").slice(-3000)}`,
        );

        // ── error: fixtures.js 미로드 → window.IncidentCommandFixtures undefined ──
        const errorRes = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-826",
          },
          body: JSON.stringify({
            url: `http://${selfHost}:${port}/incident-command/__bf826_error__.html`,
            label: "인시던트 커맨드 센터 앱 레벨 error 상태 실 DOM 검증 (BF-826)",
            scriptText: `
              await page.waitForSelector('#incident-command[data-view-state="error"]');
              const info = await page.evaluate(() => {
                const errorBox = document.querySelector('.ic-error');
                const readyGrid = document.querySelector('.ic-ready-only');
                const skeleton = document.querySelector('.ic-skeleton');
                return {
                  viewState: document.getElementById('incident-command').getAttribute('data-view-state'),
                  errorInDom: !!errorBox,
                  errorDisplay: errorBox ? getComputedStyle(errorBox).display : null,
                  errorText: errorBox ? errorBox.textContent.trim() : null,
                  errorRole: errorBox ? errorBox.getAttribute('role') : null,
                  readyDisplay: getComputedStyle(readyGrid).display,
                  skeletonDisplay: getComputedStyle(skeleton).display,
                };
              });
              if (info.viewState !== 'error') throw new Error('data-view-state !== error: ' + info.viewState);
              if (!info.errorInDom) throw new Error('#error-banner 가 DOM 에 없음');
              if (info.errorDisplay !== 'flex') throw new Error('.ic-error display !== flex: ' + info.errorDisplay);
              if (!info.errorText.includes('장애 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요.')) throw new Error('error 고정 문구 불일치: ' + info.errorText);
              if (info.errorRole !== 'alert') throw new Error('error 배너 role !== alert: ' + info.errorRole);
              if (info.readyDisplay !== 'none') throw new Error('error 상태인데 .ic-ready-only 가 보임: ' + info.readyDisplay);
              if (info.skeletonDisplay !== 'none') throw new Error('error 상태인데 .ic-skeleton 이 보임: ' + info.skeletonDisplay);
              console.log('[done] BF-826 error 상태 실 DOM 검증 PASS');
            `,
            timeoutMs: 30000,
          }),
        });
        const errorJson = await errorRes.json();
        assert.ok(errorJson.ok, `e2e-runner 응답 ok=false(error): ${JSON.stringify(errorJson).slice(0, 500)}`);
        assert.ok(
          errorJson.passed,
          `error 상태 시나리오 실패 — stdout 끝:\n${String(errorJson.stdout ?? "").slice(-3000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 헬퍼 (BF-811/BF-805 e2e-worker-host 패턴과 동일)
// ─────────────────────────────────────────────────────────────

/**
 * e2e-runner 도달성 확인. 못 닿으면 t.skip() 호출 후 false 반환.
 * CI 환경에는 컨테이너 없음 — fail 처리하면 PR 자동 머지 트리거 안 됨.
 */
async function e2eRunnerReachable(t) {
  try {
    const probe = await fetch("http://e2e-runner:3030/health", {
      signal: AbortSignal.timeout(2000),
    });
    if (!probe.ok) {
      t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
      return false;
    }
    return true;
  } catch (err) {
    t.skip(`e2e-runner 도달 불가 (${err.message}) — CI 환경 정상`);
    return false;
  }
}

/**
 * 페르소나 컨테이너 service hostname.
 * host.docker.internal / localhost 는 절대 사용 X (e2e-runner 는 다른 컨테이너).
 */
function personaHost() {
  return (
    process.env.BRIX_PERSONA_HOST ??
    process.env.BRIX_WORKER_HOSTNAME ??
    "worker"
  );
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

/**
 * 0.0.0.0 바인딩 임시 정적 서버. port 0 으로 임의 포트 — 동시 실행 충돌 없음.
 */
function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const resolved = path.resolve(path.join(rootDir, urlPath));
      if (!resolved.startsWith(path.resolve(rootDir))) {
        res.statusCode = 403;
        res.end("forbidden");
        return;
      }
      fs.readFile(resolved, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        const ext = path.extname(resolved);
        res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
        res.end(data);
      });
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "0.0.0.0", () => resolve(server));
  });
}

/**
 * startStaticServer 와 동일하되, 특정 urlPath 는 인메모리 HTML(overrides)로
 * 응답한다. incident-command/ 디렉토리에 파일을 추가하지 않고도 empty/error
 * 상태를 실제로 촉발하는 합성 페이지를 서빙하기 위한 용도.
 * overrides 에 없는 경로는 그대로 rootDir 기준 실 파일을 서빙(style.css/command.js 등).
 */
function startStaticServerWithOverrides(rootDir, overrides) {
  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (overrides.has(urlPath)) {
        res.setHeader("Content-Type", MIME[".html"]);
        res.end(overrides.get(urlPath));
        return;
      }
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const resolved = path.resolve(path.join(rootDir, urlPath));
      if (!resolved.startsWith(path.resolve(rootDir))) {
        res.statusCode = 403;
        res.end("forbidden");
        return;
      }
      fs.readFile(resolved, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        const ext = path.extname(resolved);
        res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
        res.end(data);
      });
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "0.0.0.0", () => resolve(server));
  });
}
