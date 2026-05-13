// BF-502 · 타이머 SPA E2E 회귀 가드 — BF-500 산출물 focused scope
//
// 검증 대상: timer/index.html + timer/app.js (현행 진입점) + timer/styles.css
//
// BF-502 고유 가드 (기존 테스트 중복 최소화):
//   SC-1. 다크 default — localStorage 초기화 후 data-theme="dark" + 테마 아이콘 ☀ 확인
//          (BF-496 AC1: display/btn 상태 검증 — data-theme 속성 미검증)
//   SC-2. 카운트다운 진행 중 display 감소 확인 (8→7→6 순서로 감소)
//          (BF-496 AC2: 1초→ended 直行; BF-484 AC1: pause/resume 후 감소 — 시작 후 진행 중 검증 없음)
//   SC-3. 일시정지 / 재개 / 리셋 full flow — 상태머신 btn 텍스트 + 리셋 후 input 값 복원
//          (BF-484 AC1: pause→resume 감소, BF-490 AC2: dismissBanner 후 복원 — reset 경로 미통합)
//   SC-4. 종료 시 시각적 알림 — ended-banner__text 내용 + .is-ended + btn-reset "새 타이머" + 닫기 후 idle
//          (BF-496 AC2 step7: .is-ended 클래스 검증; BF-478 AC2: banner close — 배너 텍스트 내용 미검증)
//   SC-5. localStorage 영속 — onInputChange 경로 (시작 없이 입력만으로 저장 + 새로고침 후 btn-primary enabled)
//          (BF-490 AC3: startOrResume 경로; BF-496 AC2: JSON 내용 — input-only persistConfig 경로 미검증)
//
// 중복 제외 근거 (이 파일에서 생략):
//   - 진입 렌더 초기 상태 (display 0:00, btn disabled, banner hidden) : timer-BF496-e2e.test.js
//   - 1초 카운트다운 + bf-timer-last-config JSON {m:0,s:1}             : timer-BF496-e2e.test.js
//   - hint 가시성 (idle+empty visible, 값 입력 후 hidden)               : timer-BF490-e2e.test.js
//   - dismissBanner 후 input 복원                                       : timer-BF490-e2e.test.js
//   - pause→resume display 감소 (BF-461 회귀)                           : timer-BF484-e2e.test.js
//   - Space/Esc 단축키                                                  : timer-e2e-bf478.test.js
//   - T 키 테마 토글                                                     : timer-BF484-e2e.test.js
//   - app.js/main.js IIFE + no-import + no-fetch 정적                   : timer-BF500.test.js / timer-BF488.test.js
//   - FOUC IIFE stylesheet 앞 배치                                      : timer-BF500.test.js
//   - CSS 글로우 토큰 --color-timer-ended-glow / .display.is-ended      : timer-BF500.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "timer";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// ─────────────────────────────────────────────────────────────
// e2e-runner probe (한 번만 실행, 결과 캐시)
// ─────────────────────────────────────────────────────────────
let _e2eRunnerReachable = null;
async function e2eRunnerReachable(t) {
  if (process.env.BRIX_E2E_SKIP === "1") {
    t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
    return false;
  }
  if (_e2eRunnerReachable === null) {
    try {
      const probe = await fetch("http://e2e-runner:3030/health", {
        signal: AbortSignal.timeout(2000),
      });
      _e2eRunnerReachable = probe.ok;
    } catch {
      _e2eRunnerReachable = false;
    }
  }
  if (!_e2eRunnerReachable) {
    t.skip("e2e-runner 도달 불가 — CI 환경 정상");
    return false;
  }
  return true;
}

/** BRIX_PERSONA_HOST 우선 hostname. host.docker.internal / localhost 사용 금지. */
function personaHost() {
  return (
    process.env.BRIX_PERSONA_HOST ??
    process.env.BRIX_WORKER_HOSTNAME ??
    "worker"
  );
}

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ══════════════════════════════════════════════════════════════
  // SC-1: 다크 default — localStorage 없는 초기 로드에서 data-theme="dark" 확인
  // BF-496 AC1 은 display/btn 상태를 검증하지만 data-theme 속성 자체는 미검증.
  // ══════════════════════════════════════════════════════════════
  test(
    "BF-502 SC-1: 다크 default — localStorage 초기화 후 data-theme='dark' + 테마 토글 아이콘 ☀ 확인",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;
      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. localStorage 초기화 → 저장된 테마 없는 fresh 상태
          await page.waitForSelector('#btn-primary');
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#btn-primary');
          console.log('[step] localStorage 초기화 + 재로드 OK');

          // 1. <html data-theme="dark"> 확인 — FOUC IIFE + 기본값 "dark"
          const dataTheme = await page.evaluate(
            () => document.documentElement.getAttribute('data-theme')
          );
          if (dataTheme !== 'dark') {
            throw new Error(
              '초기 로드 시 data-theme 가 "dark" 가 아님: "' + dataTheme + '"' +
              ' — FOUC IIFE dark default 계약 위반 (bf-theme 없을 때 fallback "dark")'
            );
          }
          console.log('[step] data-theme="dark" OK');

          // 2. 테마 토글 버튼 아이콘 = ☀ (다크 모드일 때 sun 아이콘)
          //    app.js applyTheme("dark") → btnTheme.textContent = "☀"
          const themeIcon = await page.evaluate(
            () => document.getElementById('theme-toggle').textContent.trim()
          );
          if (themeIcon !== '☀') {
            throw new Error(
              '다크 모드에서 theme-toggle 아이콘이 "☀" 이 아님: "' + themeIcon + '"' +
              ' — applyTheme("dark") 아이콘 매핑 버그'
            );
          }
          console.log('[step] theme-toggle 아이콘 ☀ OK');

          // cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] BF-502 SC-1 다크 default PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-502",
          },
          body: JSON.stringify({
            url,
            label: "BF-502 SC-1: 다크 default — localStorage 초기화 후 data-theme='dark' + 테마 아이콘 ☀",
            scriptText,
            timeoutMs: 30000,
          }),
        });
        const json = await res.json();
        assert.ok(
          json.ok,
          `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
        );
        assert.ok(
          json.passed,
          `SC-1 다크 default 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ══════════════════════════════════════════════════════════════
  // SC-2: 분/초 입력 → 시작 → 카운트다운 진행 중 display 감소 확인
  // 기존 테스트는 "ended 상태"만 검증; 진행 중 display 감소는 미검증.
  // ══════════════════════════════════════════════════════════════
  test(
    "BF-502 SC-2: 0m 8s 설정 → 시작 → 카운트다운 진행 중 display 8→7→6 감소 확인",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;
      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. 초기화
          await page.waitForSelector('#btn-primary');
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#btn-primary');

          // 1. 0m 8s 설정 → idle display 0:08 확인
          await page.fill('#input-m', '0');
          await page.fill('#input-s', '8');
          await page.waitForFunction(
            () => document.getElementById('disp-s').textContent === '08',
            { timeout: 3000 }
          );
          console.log('[step] 0:08 설정 OK — idle display 0:08');

          // 2. 시작 클릭 → running 진입 (btn: 일시정지)
          await page.click('#btn-primary');
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('일시정지'),
            { timeout: 3000 }
          );
          console.log('[step] running 진입 OK — btn: 일시정지');

          // 3. 카운트다운 1초 진행 → disp-s <= 7 (8→7 이하로 감소)
          //    tick() rAF → remainingMs 감소 → display 갱신
          await page.waitForFunction(
            () => {
              const s = parseInt(document.getElementById('disp-s').textContent, 10);
              const m = document.getElementById('disp-m').textContent;
              return m === '0' && s <= 7 && s >= 1;
            },
            { timeout: 5000 }
          );
          const dispAfter1s = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          console.log('[step] 1초 진행 후 display: 0:' + dispAfter1s.s + ' — 카운트다운 진행 OK');

          // 4. 추가 1초 진행 → disp-s <= 6 (지속적 감소 확인)
          await page.waitForFunction(
            () => {
              const s = parseInt(document.getElementById('disp-s').textContent, 10);
              const m = document.getElementById('disp-m').textContent;
              return m === '0' && s <= 6 && s >= 1;
            },
            { timeout: 5000 }
          );
          const dispAfter2s = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          console.log('[step] 2초 진행 후 display: 0:' + dispAfter2s.s + ' — 지속 감소 OK');

          // 5. 일시정지로 종료 방지
          await page.click('#btn-primary');
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('재개'),
            { timeout: 3000 }
          );
          console.log('[step] 일시정지 OK (ended 방지)');

          // cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] BF-502 SC-2 카운트다운 진행 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-502",
          },
          body: JSON.stringify({
            url,
            label: "BF-502 SC-2: 0m 8s → 시작 → 카운트다운 진행 중 display 8→7→6 감소",
            scriptText,
            timeoutMs: 45000,
          }),
        });
        const json = await res.json();
        assert.ok(
          json.ok,
          `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
        );
        assert.ok(
          json.passed,
          `SC-2 카운트다운 진행 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ══════════════════════════════════════════════════════════════
  // SC-3: 일시정지 / 재개 / 리셋 full flow
  // 상태머신 btn 텍스트 + input-pair 가시성 + 리셋 후 input 값 복원 통합 검증.
  // BF-484 AC1 은 pause→resume 감소만; BF-490 AC2 는 dismissBanner 경로 — reset 경로 미통합.
  // ══════════════════════════════════════════════════════════════
  test(
    "BF-502 SC-3: 0m 10s → 시작 → 일시정지 → 재개 → 리셋 후 idle + input 값 복원 확인",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;
      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. 초기화
          await page.waitForSelector('#btn-primary');
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#btn-primary');

          // 1. 0m 10s 설정
          await page.fill('#input-m', '0');
          await page.fill('#input-s', '10');
          await page.waitForFunction(
            () => document.getElementById('disp-s').textContent === '10',
            { timeout: 3000 }
          );
          console.log('[step] 0:10 설정 OK');

          // 2. 시작 → running (btn: 일시정지, input-pair: hidden)
          await page.click('#btn-primary');
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('일시정지'),
            { timeout: 3000 }
          );
          const inputPairRunning = await page.evaluate(
            () => document.getElementById('input-pair').hidden
          );
          if (!inputPairRunning) {
            throw new Error('running 상태에서 input-pair 가 visible — render() inputPairEl.hidden 버그');
          }
          console.log('[step] running 진입 OK — btn:일시정지, input-pair:hidden');

          // 3. 일시정지 클릭 → paused (btn: 재개, input-pair: hidden)
          await page.click('#btn-primary');
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('재개'),
            { timeout: 3000 }
          );
          const inputPairPaused = await page.evaluate(
            () => document.getElementById('input-pair').hidden
          );
          if (!inputPairPaused) {
            throw new Error('paused 상태에서 input-pair 가 visible — render() inputPairEl.hidden 버그');
          }
          console.log('[step] 일시정지 OK — btn:재개, input-pair:hidden');

          // 4. 재개 클릭 → running 복귀 (btn: 일시정지)
          await page.click('#btn-primary');
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('일시정지'),
            { timeout: 3000 }
          );
          console.log('[step] 재개 OK — running 복귀, btn:일시정지');

          // 5. 리셋 클릭 → idle 복귀 (input-pair: visible)
          await page.click('#btn-reset');
          await page.waitForFunction(
            () => !document.getElementById('input-pair').hidden,
            { timeout: 3000 }
          );
          console.log('[step] 리셋 OK — idle 복귀, input-pair:visible');

          // 6. 리셋 후 btn-primary 텍스트 "시작" 포함 확인
          const btnPrimaryText = await page.evaluate(
            () => document.getElementById('btn-primary').textContent.trim()
          );
          if (!btnPrimaryText.includes('시작')) {
            throw new Error(
              '리셋 후 btn-primary 텍스트에 "시작" 없음: "' + btnPrimaryText + '"' +
              ' — render() idle phase 매핑 버그'
            );
          }
          console.log('[step] 리셋 후 btn-primary "▶ 시작" OK');

          // 7. 리셋 후 input-m = "0", input-s = "10" 복원 확인
          //    reset() → inputMEl.value = String(configMinutes=0), inputSEl.value = String(configSeconds=10)
          const inputM = await page.evaluate(
            () => document.getElementById('input-m').value
          );
          const inputS = await page.evaluate(
            () => document.getElementById('input-s').value
          );
          if (inputM !== '0') {
            throw new Error(
              '리셋 후 input-m 복원 실패: "' + inputM + '" (expected "0")' +
              ' — reset() configMinutes 복원 버그'
            );
          }
          if (inputS !== '10') {
            throw new Error(
              '리셋 후 input-s 복원 실패: "' + inputS + '" (expected "10")' +
              ' — reset() configSeconds 복원 버그'
            );
          }
          console.log('[step] 리셋 후 input 복원 0:10 OK');

          // 8. btn-primary enabled 확인 (configSeconds=10 > 0 → hasValue=true)
          const btnEnabled = await page.evaluate(
            () => !document.getElementById('btn-primary').disabled
          );
          if (!btnEnabled) {
            throw new Error(
              '리셋 후 btn-primary disabled — render() idle hasValue 판정 버그 (seconds=10 > 0 인데 disabled)'
            );
          }
          console.log('[step] 리셋 후 btn-primary enabled OK');

          // cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] BF-502 SC-3 일시정지/재개/리셋 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-502",
          },
          body: JSON.stringify({
            url,
            label: "BF-502 SC-3: 0m 10s → 시작 → 일시정지 → 재개 → 리셋 후 idle + input 복원",
            scriptText,
            timeoutMs: 45000,
          }),
        });
        const json = await res.json();
        assert.ok(
          json.ok,
          `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
        );
        assert.ok(
          json.passed,
          `SC-3 일시정지/재개/리셋 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ══════════════════════════════════════════════════════════════
  // SC-4: 종료 시 시각적 알림 — 배너 텍스트 내용 + .is-ended + btn-reset "새 타이머" + 닫기 후 idle
  // BF-496 AC2: .is-ended 클래스 검증 O, BF-478 AC2: banner close O — 배너 텍스트 내용 미검증.
  // ══════════════════════════════════════════════════════════════
  test(
    "BF-502 SC-4: 1초 종료 → ended-banner 텍스트 '시간이 다 됐어요!' + .is-ended + btn-reset '새 타이머' + 닫기 후 idle",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;
      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. 초기화
          await page.waitForSelector('#btn-primary');
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#btn-primary');

          // 1. 0m 1s 설정 → 시작
          await page.fill('#input-m', '0');
          await page.fill('#input-s', '1');
          await page.waitForFunction(
            () => document.getElementById('disp-s').textContent === '01',
            { timeout: 3000 }
          );
          await page.click('#btn-primary');
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('일시정지'),
            { timeout: 3000 }
          );
          console.log('[step] 1초 타이머 시작 OK');

          // 2. ended 상태 대기 — ended-banner visible
          await page.waitForFunction(
            () => {
              const banner = document.getElementById('ended-banner');
              return banner && !banner.hidden;
            },
            { timeout: 6000 }
          );
          console.log('[step] ended-banner 표시 확인 OK');

          // 3. .ended-banner__text 내용 = "시간이 다 됐어요!" (BF-502 신규 — 기존 미검증)
          const bannerText = await page.evaluate(
            () => {
              const el = document.querySelector('.ended-banner__text');
              return el ? el.textContent.trim() : null;
            }
          );
          if (!bannerText) {
            throw new Error(
              '.ended-banner__text 요소 없음 — BF-497 §4.6 HTML 구조 누락'
            );
          }
          if (bannerText !== '시간이 다 됐어요!') {
            throw new Error(
              '.ended-banner__text 내용 불일치 — expected "시간이 다 됐어요!", got: "' + bannerText + '"'
            );
          }
          console.log('[step] .ended-banner__text "시간이 다 됐어요!" OK');

          // 4. #display 에 .is-ended 클래스 확인 (CSS 글로우 text-shadow 트리거)
          const hasIsEnded = await page.evaluate(
            () => document.getElementById('display').classList.contains('is-ended')
          );
          if (!hasIsEnded) {
            throw new Error(
              'ended 상태에서 #display 에 .is-ended 클래스 없음 — render() classList.toggle("is-ended") 버그'
            );
          }
          console.log('[step] #display .is-ended 클래스 OK');

          // 5. btn-reset 텍스트 "새 타이머" 포함 (ended phase 전용 텍스트)
          const btnResetText = await page.evaluate(
            () => document.getElementById('btn-reset').textContent.trim()
          );
          if (!btnResetText.includes('새 타이머')) {
            throw new Error(
              'ended 상태 btn-reset 텍스트에 "새 타이머" 없음: "' + btnResetText + '"' +
              ' — render() ended phase 텍스트 매핑 버그'
            );
          }
          console.log('[step] btn-reset "새 타이머" OK');

          // 6. 배너 닫기 버튼 클릭 → ended-banner hidden
          await page.click('#btn-banner-close');
          await page.waitForFunction(
            () => {
              const banner = document.getElementById('ended-banner');
              return banner && banner.hidden;
            },
            { timeout: 3000 }
          );
          console.log('[step] #btn-banner-close 클릭 → ended-banner hidden OK');

          // 7. dismissBanner → idle 복귀: input-pair visible 확인
          const inputPairVisible = await page.evaluate(
            () => !document.getElementById('input-pair').hidden
          );
          if (!inputPairVisible) {
            throw new Error(
              '배너 닫기 후 input-pair hidden — dismissBanner() idle 복귀 버그'
            );
          }
          console.log('[step] 배너 닫기 후 idle 복귀 + input-pair visible OK');

          // cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] BF-502 SC-4 종료 알림 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-502",
          },
          body: JSON.stringify({
            url,
            label: "BF-502 SC-4: 1초 종료 → ended-banner 텍스트 + .is-ended + 새 타이머 + 닫기 후 idle",
            scriptText,
            timeoutMs: 45000,
          }),
        });
        const json = await res.json();
        assert.ok(
          json.ok,
          `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
        );
        assert.ok(
          json.passed,
          `SC-4 종료 알림 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ══════════════════════════════════════════════════════════════
  // SC-5: localStorage 영속 — onInputChange 경로 (시작 없이 입력만으로 저장)
  // BF-490 AC3: startOrResume 경로; BF-496 AC2: JSON 내용 —
  //   "입력 변경만으로 저장" 경로 + "새로고침 후 btn-primary enabled" 미검증.
  // ══════════════════════════════════════════════════════════════
  test(
    "BF-502 SC-5: 입력 변경(onInputChange) 경로 저장 → 새로고침 후 input 3:30 복원 + display 동기 + btn-primary enabled",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;
      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. 초기화
          await page.waitForSelector('#btn-primary');
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#btn-primary');

          // 1. 3m 30s 입력 (시작하지 않음)
          //    page.fill → input 이벤트 → onInputChange → persistConfig → saveLastConfig(3,30)
          await page.fill('#input-m', '3');
          await page.fill('#input-s', '30');
          // blur 이벤트도 보장 (onInputChange 는 input + blur 양쪽 등록)
          await page.evaluate(() => document.getElementById('input-s').blur());
          console.log('[step] 3m 30s 입력 OK (시작 없이)');

          // 2. bf-timer-last-config 저장 확인 (startOrResume 경로 아님 — onInputChange 경로)
          await page.waitForFunction(
            () => localStorage.getItem('bf-timer-last-config') !== null,
            { timeout: 3000 }
          );
          const savedRaw = await page.evaluate(
            () => localStorage.getItem('bf-timer-last-config')
          );
          const saved = JSON.parse(savedRaw);
          if (saved.minutes !== 3 || saved.seconds !== 30) {
            throw new Error(
              'onInputChange 경로 bf-timer-last-config 불일치 —' +
              ' expected {minutes:3,seconds:30}, got: ' + savedRaw
            );
          }
          console.log('[step] onInputChange → bf-timer-last-config={minutes:3,seconds:30} 저장 OK (시작 없이)');

          // 3. 새로고침 → loadLastConfig 복원
          await page.reload();
          await page.waitForSelector('#btn-primary');
          console.log('[step] 새로고침 후 loadLastConfig 복원 대기');

          // 4. input-m = "3", input-s = "30" 복원 확인
          const inputM = await page.evaluate(
            () => document.getElementById('input-m').value
          );
          const inputS = await page.evaluate(
            () => document.getElementById('input-s').value
          );
          if (inputM !== '3') {
            throw new Error(
              '새로고침 후 input-m 복원 실패: "' + inputM + '" (expected "3")' +
              ' — loadLastConfig boot sequence 버그'
            );
          }
          if (inputS !== '30') {
            throw new Error(
              '새로고침 후 input-s 복원 실패: "' + inputS + '" (expected "30")' +
              ' — loadLastConfig boot sequence 버그'
            );
          }
          console.log('[step] 새로고침 후 input 복원 3:30 OK');

          // 5. display 도 3:30 반영 확인 (render() idle → dispM=configMinutes, dispS=configSeconds)
          const dispM = await page.evaluate(
            () => document.getElementById('disp-m').textContent
          );
          const dispS = await page.evaluate(
            () => document.getElementById('disp-s').textContent
          );
          if (dispM !== '3') {
            throw new Error(
              '새로고침 후 disp-m 불일치: "' + dispM + '" (expected "3")' +
              ' — render() idle configMinutes 미반영'
            );
          }
          if (dispS !== '30') {
            throw new Error(
              '새로고침 후 disp-s 불일치: "' + dispS + '" (expected "30")' +
              ' — render() idle configSeconds padStart 버그'
            );
          }
          console.log('[step] 새로고침 후 display 3:30 OK');

          // 6. btn-primary enabled 확인 (minutes=3 > 0 → hasValue=true → disabled=false)
          //    BF-490 AC3 은 이 항목 미검증
          const btnEnabled = await page.evaluate(
            () => !document.getElementById('btn-primary').disabled
          );
          if (!btnEnabled) {
            throw new Error(
              '새로고침 후 btn-primary disabled — render() idle hasValue 판정 버그' +
              ' (minutes=3 > 0 인데 disabled)'
            );
          }
          console.log('[step] 새로고침 후 btn-primary enabled OK');

          // cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] BF-502 SC-5 localStorage 영속 (onInputChange 경로) PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-502",
          },
          body: JSON.stringify({
            url,
            label: "BF-502 SC-5: onInputChange 저장 → 새로고침 후 3:30 복원 + btn-primary enabled",
            scriptText,
            timeoutMs: 45000,
          }),
        });
        const json = await res.json();
        assert.ok(
          json.ok,
          `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
        );
        assert.ok(
          json.passed,
          `SC-5 localStorage 영속 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 정적 서버 — 0.0.0.0 바인딩 (e2e-runner 컨테이너에서 접근 가능)
// 포트 0 — 다른 테스트 서버와 충돌 없음
// ─────────────────────────────────────────────────────────────
function startStaticServer(rootDir) {
  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".png":  "image/png",
    ".svg":  "image/svg+xml",
    ".json": "application/json",
  };
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
