// BF-478 · 타이머 SPA E2E 회귀 가드 (Playwright) — 2차 확장
//
// 보호 대상 (BF-478 수용 기준):
//   AC1. /timer/ 재개 시나리오: 일시정지 → 재개 → 카운트다운 재진행 (BF-461 회귀 방지)
//   AC2. 종료 알림 시나리오: 2초 타이머 → 종료 → #ended-banner 표시 →
//        #btn-banner-close 클릭 → idle 복귀 + 마지막 설정값 display
//   AC3. 테마 토글 E2E: #theme-toggle 클릭 → data-theme 변경 → bf-theme localStorage 기록
//   AC4. 키보드 단축키 E2E: Space(시작/일시정지) · Esc(리셋)
//   AC5. file:// / CDN 호환 정적 가드
//        — timer/index.html 외부 CDN <script> 0건
//        — timer/main.js + timer/storage.js fetch() 외부 URL 0건
//
// 기존 timer-e2e.test.js (BF-409) 와의 분리 (중복 없음):
//   BF-409: 5초 설정 → 시작 → 1초 → 일시정지 → 리셋 → 새로고침 복원
//   BF-478: resume 이후 감소 확인 · 종료 배너 · 테마 토글 · 키보드 단축키
//
// BF-461 재발 방지:
//   일시정지 → 재개 후 display 값이 계속 감소해야 함. freeze / drift 방지.
//   (재개 후 tickStart 가 갱신되지 않으면 음수 elapsed → 남은 시간이 증가하는 버그)

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
const TIMER_HTML = path.join(REPO_ROOT, "timer", "index.html");
const TIMER_MAIN = path.join(REPO_ROOT, "timer", "main.js");
const TIMER_STORAGE = path.join(REPO_ROOT, "timer", "storage.js");

// ─────────────────────────────────────────────────────────────
// 유틸 — e2e-runner 도달 여부 probe (한 번만 실행, 결과 캐시)
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

/** BRIX_PERSONA_HOST 우선 hostname (compose 서비스명). host.docker.internal/localhost 금지. */
function personaHost() {
  return process.env.BRIX_PERSONA_HOST ?? process.env.BRIX_WORKER_HOSTNAME ?? "worker";
}

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ══════════════════════════════════════════════════════════════
  // 정적 가드 — file:// / CDN 호환 계약 (AC5)
  // ══════════════════════════════════════════════════════════════

  test("BF-478 정적 AC5: timer/index.html 에 외부 CDN <script src> 0건 (file:// 호환)", () => {
    const html = fs.readFileSync(TIMER_HTML, "utf-8");
    // 외부 CDN 패턴: https:// 또는 // 로 시작하는 src/href
    const externalScriptRe = /<script[^>]+src\s*=\s*["'](https?:)?\/\//i;
    assert.ok(
      !externalScriptRe.test(html),
      "timer/index.html 에 외부 CDN <script src> 발견 — file:// / CORS 호환 깨짐",
    );
    const externalLinkRe = /<link[^>]+href\s*=\s*["'](https?:)?\/\//i;
    assert.ok(
      !externalLinkRe.test(html),
      "timer/index.html 에 외부 CDN <link href> 발견 — file:// / CORS 호환 깨짐",
    );
  });

  test("BF-478 정적 AC5: timer/main.js + timer/storage.js 외부 fetch() URL 0건 (CDN/API 의존 없음)", () => {
    const mainJs = fs.readFileSync(TIMER_MAIN, "utf-8");
    const storageJs = fs.readFileSync(TIMER_STORAGE, "utf-8");
    // fetch("https://...") 또는 fetch('https://...') 패턴
    const externalFetchRe = /fetch\s*\(\s*["'](https?:)?\/\//i;
    assert.ok(
      !externalFetchRe.test(mainJs),
      "timer/main.js 에 외부 fetch() 호출 발견 — 네트워크 의존 없어야 함",
    );
    assert.ok(
      !externalFetchRe.test(storageJs),
      "timer/storage.js 에 외부 fetch() 호출 발견 — 네트워크 의존 없어야 함",
    );
  });

  test("BF-478 정적 AC5: timer/index.html 외부 import/module URL 0건", () => {
    const html = fs.readFileSync(TIMER_HTML, "utf-8");
    // <script type="module"> 내 inline import from "https://..." 패턴
    const externalModuleRe = /import\s+.*from\s+["'](https?:)?\/\//i;
    assert.ok(
      !externalModuleRe.test(html),
      "timer/index.html 인라인 script 에 외부 ES module import 발견",
    );
    const mainJs = fs.readFileSync(TIMER_MAIN, "utf-8");
    assert.ok(
      !externalModuleRe.test(mainJs),
      "timer/main.js 에 외부 ES module import (https://...) 발견 — file:// 호환 깨짐",
    );
  });

  // ══════════════════════════════════════════════════════════════
  // E2E 가드 — 재개 시나리오 (BF-461 재발 방지) [AC1]
  // ══════════════════════════════════════════════════════════════

  test(
    "BF-478 E2E AC1 [BF-461 재발 방지]: 일시정지 → 재개 → display 감소 계속 (freeze/drift 방지)",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. clean start
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#btn-primary');

          // 1. 10초 설정 → 시작
          await page.fill('#input-m', '0');
          await page.fill('#input-s', '10');
          // display 0:10 동기 대기
          await page.waitForFunction(
            () => {
              const m = document.getElementById('disp-m').textContent;
              const s = document.getElementById('disp-s').textContent;
              return m === '0' && s === '10';
            },
            { timeout: 3000 }
          );
          await page.click('#btn-primary');
          console.log('[step] 10초 시작 OK');

          // 2. 1.5초 대기 → 일시정지
          await new Promise((r) => setTimeout(r, 1500));
          await page.click('#btn-primary');  // 일시정지
          const dispAtPause = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          // 1.5초 경과 후 일시정지: ceil 표시이므로 0:08 또는 0:09 (타이밍 편차 고려)
          const pauseSec = parseInt(dispAtPause.s, 10);
          if (dispAtPause.m !== '0' || pauseSec < 8 || pauseSec > 9) {
            throw new Error('일시정지 시점 display 이상: ' + JSON.stringify(dispAtPause));
          }
          console.log('[step] 일시정지 OK — display=' + JSON.stringify(dispAtPause));

          // 3. 600ms 추가 대기 — 일시정지 중엔 값 고정이어야 함 (BF-461: 재개 전 drift)
          await new Promise((r) => setTimeout(r, 600));
          const dispWhilePaused = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          if (
            dispWhilePaused.m !== dispAtPause.m ||
            dispWhilePaused.s !== dispAtPause.s
          ) {
            throw new Error(
              '일시정지 중 display 변화 — freeze 실패: ' +
                'before=' + JSON.stringify(dispAtPause) +
                ' after=' + JSON.stringify(dispWhilePaused)
            );
          }
          console.log('[step] 일시정지 중 freeze OK');

          // 4. 재개 → 1.2초 대기 → display 감소 확인 (BF-461 핵심: tickStart 갱신 여부)
          await page.click('#btn-primary');  // 재개
          console.log('[step] 재개 클릭');
          await new Promise((r) => setTimeout(r, 1200));
          const dispAfterResume = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          const resumedSec = parseInt(dispAfterResume.s, 10);
          // 재개 후 1.2초 경과: pauseSec - 1 또는 pauseSec - 2 이어야 함
          // 즉 resumedSec < pauseSec (감소 확인)
          if (resumedSec >= pauseSec) {
            throw new Error(
              '[BF-461] 재개 후 display 미감소 — tickStart drift 의심: ' +
                'pause=' + JSON.stringify(dispAtPause) +
                ' resumed=' + JSON.stringify(dispAfterResume)
            );
          }
          console.log('[step] 재개 후 감소 확인 OK — resumed=' + JSON.stringify(dispAfterResume));

          // 5. cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] BF-461 재발 방지 시나리오 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-478",
          },
          body: JSON.stringify({
            url,
            label: "타이머 일시정지 → 재개 → 감소 확인 [BF-461 재발 방지] (BF-478)",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(
          json.ok,
          `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
        );
        assert.ok(
          json.passed,
          `E2E 재개 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ══════════════════════════════════════════════════════════════
  // E2E 가드 — 종료 알림 + 배너 닫기 [AC2]
  // ══════════════════════════════════════════════════════════════

  test(
    "BF-478 E2E AC2: 2초 타이머 → 종료 → #ended-banner 표시 → 닫기 → idle 복귀",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. clean start
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#btn-primary');

          // 1. 2초 설정 → 시작
          await page.fill('#input-m', '0');
          await page.fill('#input-s', '2');
          await page.waitForFunction(
            () => {
              const m = document.getElementById('disp-m').textContent;
              const s = document.getElementById('disp-s').textContent;
              return m === '0' && s === '02';
            },
            { timeout: 3000 }
          );
          await page.click('#btn-primary');
          console.log('[step] 2초 시작 OK');

          // 2. 3초 대기 → 종료 확인
          // #ended-banner 가 visible(hidden=false) 될 때까지 최대 5초 대기
          await page.waitForFunction(
            () => {
              const banner = document.getElementById('ended-banner');
              return banner && !banner.hidden;
            },
            { timeout: 5000 }
          );
          console.log('[step] #ended-banner 표시 확인 OK');

          // 3. display 0:00 확인 (종료 시 0:00 렌더)
          const dispAtEnd = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          if (dispAtEnd.m !== '0' || dispAtEnd.s !== '00') {
            throw new Error('종료 시 display 0:00 아님: ' + JSON.stringify(dispAtEnd));
          }
          console.log('[step] 종료 시 0:00 display 확인 OK');

          // 4. input-pair hidden=true (종료 상태에서 입력 숨김)
          const inputHidden = await page.evaluate(() =>
            document.getElementById('input-pair').hidden
          );
          if (!inputHidden) {
            throw new Error('종료 상태에서 input-pair 가 보임 — 숨김 처리 안됨');
          }
          console.log('[step] 종료 상태 input-pair 숨김 OK');

          // 5. #btn-banner-close 클릭 → idle 복귀
          await page.click('#btn-banner-close');
          console.log('[step] 배너 닫기 클릭');

          // 6. banner 가 다시 hidden 이어야 함
          await page.waitForFunction(
            () => document.getElementById('ended-banner').hidden,
            { timeout: 3000 }
          );
          console.log('[step] 배너 닫힘 확인 OK');

          // 7. idle 복귀 — input-pair 다시 visible
          const inputVisible = await page.evaluate(() =>
            !document.getElementById('input-pair').hidden
          );
          if (!inputVisible) {
            throw new Error('배너 닫기 후 input-pair 가 여전히 숨겨짐 — idle 복귀 실패');
          }
          console.log('[step] idle 복귀 + input-pair 노출 OK');

          // 8. idle 복귀 후 display = 마지막 설정값 (0:02) — reset() 과 같은 동작
          const dispAfterClose = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          if (dispAfterClose.m !== '0' || dispAfterClose.s !== '02') {
            throw new Error(
              '배너 닫기 후 display 가 마지막 설정값(0:02) 아님: ' +
                JSON.stringify(dispAfterClose)
            );
          }
          console.log('[step] 배너 닫기 후 display=0:02 (마지막 설정값) OK');

          // cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] 종료 알림 + 배너 닫기 시나리오 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-478",
          },
          body: JSON.stringify({
            url,
            label: "타이머 종료 알림 → #ended-banner 표시 → 닫기 → idle 복귀 (BF-478)",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(
          json.ok,
          `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
        );
        assert.ok(
          json.passed,
          `E2E 종료 알림 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ══════════════════════════════════════════════════════════════
  // E2E 가드 — 테마 토글 [AC3]
  // ══════════════════════════════════════════════════════════════

  test(
    "BF-478 E2E AC3: #theme-toggle 클릭 → data-theme 전환 → bf-theme localStorage 기록",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. clean start (localStorage.bf-theme 초기화 → dark default)
          await page.evaluate(() => localStorage.removeItem('bf-theme'));
          await page.reload();
          await page.waitForSelector('#theme-toggle');

          // 1. 초기 상태: dark default (index.html data-theme="dark")
          const initTheme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
          );
          if (initTheme !== 'dark') {
            throw new Error('초기 data-theme 이 dark 가 아님: ' + initTheme);
          }
          const initIcon = await page.evaluate(() =>
            document.getElementById('theme-toggle').textContent.trim()
          );
          if (initIcon !== '☀') {
            throw new Error('dark 모드 아이콘이 ☀ 가 아님: ' + initIcon);
          }
          console.log('[step] 초기 dark 테마 확인 OK (icon=☀)');

          // 2. 1회 클릭 → light 전환
          await page.click('#theme-toggle');
          const afterFirstTheme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
          );
          if (afterFirstTheme !== 'light') {
            throw new Error('1회 클릭 후 data-theme 이 light 가 아님: ' + afterFirstTheme);
          }
          const afterFirstIcon = await page.evaluate(() =>
            document.getElementById('theme-toggle').textContent.trim()
          );
          if (afterFirstIcon !== '🌙') {
            throw new Error('light 모드 아이콘이 🌙 가 아님: ' + afterFirstIcon);
          }
          const afterFirstStorage = await page.evaluate(() =>
            localStorage.getItem('bf-theme')
          );
          if (afterFirstStorage !== 'light') {
            throw new Error('bf-theme localStorage 가 light 가 아님: ' + afterFirstStorage);
          }
          console.log('[step] light 전환 OK (icon=🌙, localStorage=light)');

          // 3. 2회 클릭 → dark 복귀
          await page.click('#theme-toggle');
          const afterSecondTheme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
          );
          if (afterSecondTheme !== 'dark') {
            throw new Error('2회 클릭 후 data-theme 이 dark 가 아님: ' + afterSecondTheme);
          }
          const afterSecondStorage = await page.evaluate(() =>
            localStorage.getItem('bf-theme')
          );
          if (afterSecondStorage !== 'dark') {
            throw new Error('bf-theme localStorage 가 dark 가 아님: ' + afterSecondStorage);
          }
          console.log('[step] dark 복귀 OK (icon=☀, localStorage=dark)');

          // 4. 새로고침 후 light 저장 상태면 light 로 복원 (head IIFE 확인)
          await page.evaluate(() => localStorage.setItem('bf-theme', 'light'));
          await page.reload();
          await page.waitForSelector('#theme-toggle');
          const afterReloadTheme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
          );
          if (afterReloadTheme !== 'light') {
            throw new Error(
              'bf-theme=light 저장 후 새로고침 → light 복원 실패: ' + afterReloadTheme
            );
          }
          console.log('[step] 새로고침 후 light 복원 (head IIFE) OK');

          // cleanup
          await page.evaluate(() => localStorage.removeItem('bf-theme'));
          console.log('[done] 테마 토글 시나리오 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-478",
          },
          body: JSON.stringify({
            url,
            label: "타이머 테마 토글 dark↔light + localStorage 영속 (BF-478)",
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
          `E2E 테마 토글 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ══════════════════════════════════════════════════════════════
  // E2E 가드 — 키보드 단축키 Space / Esc [AC4]
  // ══════════════════════════════════════════════════════════════

  test(
    "BF-478 E2E AC4: Space(시작/일시정지) · Esc(리셋) 키보드 단축키",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. clean start
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#btn-primary');

          // 1. 5초 설정 (클릭으로 입력 — Space 를 누르기 전 input 포커스 해제)
          await page.fill('#input-m', '0');
          await page.fill('#input-s', '5');
          // display 0:05 동기 대기
          await page.waitForFunction(
            () => {
              const m = document.getElementById('disp-m').textContent;
              const s = document.getElementById('disp-s').textContent;
              return m === '0' && s === '05';
            },
            { timeout: 3000 }
          );
          // input 포커스 해제 (body 클릭) — Space 키 이벤트가 input 에서 양보되지 않도록
          await page.click('body');
          console.log('[step] 5초 설정 + body focus OK');

          // 2. Space 키 → 시작
          await page.keyboard.press('Space');
          // running 상태: btn-primary 텍스트가 "⏸ 일시정지" 여야 함
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('일시정지'),
            { timeout: 3000 }
          );
          console.log('[step] Space → 시작 확인 OK');

          // 3. 1초 대기
          await new Promise((r) => setTimeout(r, 1100));

          // 4. Space 키 → 일시정지
          await page.keyboard.press('Space');
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('재개'),
            { timeout: 3000 }
          );
          const dispPaused = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          // 1초 경과 후 일시정지: 0:04 예상 (ceil 표시)
          if (dispPaused.m !== '0' || dispPaused.s !== '04') {
            throw new Error('Space 일시정지 후 display 이상: ' + JSON.stringify(dispPaused));
          }
          console.log('[step] Space → 일시정지 + display 0:04 OK');

          // 5. Esc 키 → 리셋
          await page.keyboard.press('Escape');
          // idle 복귀: btn-primary 가 "▶ 시작" 이어야 함
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('시작'),
            { timeout: 3000 }
          );
          // idle 복귀 후 display = 마지막 설정값 (0:05)
          const dispAfterEsc = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          if (dispAfterEsc.m !== '0' || dispAfterEsc.s !== '05') {
            throw new Error('Esc 리셋 후 display 가 0:05 아님: ' + JSON.stringify(dispAfterEsc));
          }
          console.log('[step] Esc → 리셋 → display 0:05 OK');

          // 6. input-pair 다시 visible (idle 상태)
          const inputVisible = await page.evaluate(() =>
            !document.getElementById('input-pair').hidden
          );
          if (!inputVisible) {
            throw new Error('Esc 리셋 후 input-pair 가 숨겨짐 — idle 복귀 실패');
          }
          console.log('[step] Esc 후 idle 복귀 + input-pair 노출 OK');

          // cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] 키보드 단축키 시나리오 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-478",
          },
          body: JSON.stringify({
            url,
            label: "타이머 키보드 단축키 Space(시작/일시정지) Esc(리셋) (BF-478)",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(
          json.ok,
          `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
        );
        assert.ok(
          json.passed,
          `E2E 키보드 단축키 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// inline static server (0.0.0.0 바인딩 — e2e-runner 컨테이너에서 페르소나 hostname 으로 접근 가능)
// 임의 포트 (0) 로 listen 해서 다른 테스트와 충돌 방지.
// ─────────────────────────────────────────────────────────────
function startStaticServer(rootDir) {
  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
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
