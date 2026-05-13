// BF-484 · 타이머 SPA E2E 회귀 가드 — BF-482 script.js 구현 기준
//
// 보호 대상:
//   AC1. 일시정지 → 재개 → display 감소 계속 (BF-461 재발 방지 가드)
//        — timer-e2e-bf478.test.js 의 AC1 이 인프라 오류로 실패 중 → 신규 작동 가드
//   AC2. T키 키보드 테마 토글 (§6.2 keyboard T)
//        — timer-e2e-bf478.test.js 의 AC3 은 버튼 클릭만 커버, T키 경로 미검증
//   AC3. running/paused 상태에서 input-pair hidden (E2E 정량 확인)
//        — timer-BF482.test.js 는 정적 코드 확인만, 실 브라우저 E2E 없음
//
// 중복 제외 (기존 테스트가 커버):
//   - DOM id/class 존재: timer-BF482.test.js
//   - vanilla-static (no CDN/import/fetch): timer-BF482.test.js + timer-e2e-bf478.test.js
//   - localStorage bf-timer-last-config 키 계약: timer-BF482.test.js
//   - 5초 start → 1s → 0:04 → pause → reset → reload 복원: timer-e2e.test.js (BF-409)
//   - 2초 ended → banner close: timer-e2e-bf478.test.js (BF-478 AC2)
//   - Space/Esc 키보드: timer-e2e-bf478.test.js (BF-478 AC4)
//   - 테마 버튼 클릭: timer-e2e-bf478.test.js (BF-478 AC3)
//
// BF-461 재발 조건: pause 후 resume 시 tickStart 가 갱신되지 않으면
//   elapsed = now - (old tickStart) → 음수 or 과대 elapsed → remainingMs 음수/증가

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
// 유틸 — e2e-runner 도달 가능 여부 probe
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

/** BRIX_PERSONA_HOST 우선 hostname. host.docker.internal/localhost 사용 금지. */
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
  // E2E AC1 — 일시정지 → 재개 → display 감소 + input-pair 상태별 hidden
  // BF-461 재발 방지: tickStart 갱신 여부 실 브라우저 검증
  // ══════════════════════════════════════════════════════════════
  test(
    "BF-484 E2E AC1 [BF-461 재발 방지]: 일시정지 → 재개 → display 감소 + input-pair 상태별 hidden",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        // page.reload() 없이 진행 — BF-478 AC1 "page closed" 회피
        // localStorage.clear() 를 beforehand 없이 → 10초 설정 자체로 충분
        const scriptText = `
          // 0. 페이지 진입 — btn-primary 대기
          await page.waitForSelector('#btn-primary');
          await page.evaluate(() => localStorage.clear());
          console.log('[step] 페이지 진입 OK');

          // 1. 10초 설정 (분=0, 초=10)
          await page.fill('#input-m', '0');
          await page.fill('#input-s', '10');
          await page.waitForFunction(
            () => {
              const s = document.getElementById('disp-s').textContent;
              return s === '10';
            },
            { timeout: 3000 }
          );
          console.log('[step] 10초 설정 OK');

          // 1-a. idle 상태 → input-pair visible 확인 (AC3 일부)
          const inputVisibleIdle = await page.evaluate(() =>
            !document.getElementById('input-pair').hidden
          );
          if (!inputVisibleIdle) {
            throw new Error('idle 상태인데 input-pair 가 hidden — render 버그');
          }
          console.log('[step] idle: input-pair visible OK');

          // 2. 시작 클릭 → running 상태 진입
          await page.click('#btn-primary');
          // running 상태: btn-primary 가 "⏸ 일시정지", input-pair hidden
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('일시정지'),
            { timeout: 3000 }
          );

          // 2-a. running 상태 → input-pair hidden 확인 (AC3)
          const inputHiddenRunning = await page.evaluate(() =>
            document.getElementById('input-pair').hidden
          );
          if (!inputHiddenRunning) {
            throw new Error('running 상태인데 input-pair 가 visible — §4.4 idle-only 위반');
          }
          console.log('[step] running: input-pair hidden OK');

          // 3. 1.5초 대기 후 일시정지
          await new Promise((r) => setTimeout(r, 1500));
          await page.click('#btn-primary');  // 일시정지
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('재개'),
            { timeout: 3000 }
          );

          // 3-a. paused 상태에서 display 값 캡처
          const dispAtPause = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          // 1.5초 경과 후 ceil: 8 또는 9 (타이밍 편차 허용)
          const pauseSec = parseInt(dispAtPause.s, 10);
          if (dispAtPause.m !== '0' || pauseSec < 7 || pauseSec > 10) {
            throw new Error('일시정지 시점 display 이상: ' + JSON.stringify(dispAtPause));
          }
          console.log('[step] 일시정지 OK — display=' + JSON.stringify(dispAtPause));

          // 3-b. paused 상태 → input-pair hidden 확인 (AC3)
          const inputHiddenPaused = await page.evaluate(() =>
            document.getElementById('input-pair').hidden
          );
          if (!inputHiddenPaused) {
            throw new Error('paused 상태인데 input-pair 가 visible — §4.4 idle-only 위반');
          }
          console.log('[step] paused: input-pair hidden OK');

          // 4. 600ms 추가 대기 — 일시정지 중엔 display 고정이어야 함
          await new Promise((r) => setTimeout(r, 600));
          const dispFrozen = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          if (
            dispFrozen.m !== dispAtPause.m ||
            dispFrozen.s !== dispAtPause.s
          ) {
            throw new Error(
              '일시정지 중 display 변화 (freeze 실패): before=' +
                JSON.stringify(dispAtPause) +
                ' after=' + JSON.stringify(dispFrozen)
            );
          }
          console.log('[step] 일시정지 freeze OK');

          // 5. 재개 → 1.2초 대기 → display 감소 확인 (BF-461 핵심)
          await page.click('#btn-primary');  // 재개
          console.log('[step] 재개 클릭');
          await new Promise((r) => setTimeout(r, 1200));
          const dispAfterResume = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          const resumedSec = parseInt(dispAfterResume.s, 10);
          // 재개 후 1.2초 경과: pauseSec 보다 작아야 함 (감소 확인 — BF-461 핵심)
          if (resumedSec >= pauseSec) {
            throw new Error(
              '[BF-461] 재개 후 display 미감소 — tickStart drift 의심: ' +
                'pause=' + JSON.stringify(dispAtPause) +
                ' resumed=' + JSON.stringify(dispAfterResume)
            );
          }
          console.log('[step] 재개 후 감소 확인 OK — resumed=' + JSON.stringify(dispAfterResume));

          // 6. 리셋 → idle 복귀, input-pair visible 복원 (AC3)
          await page.click('#btn-reset');
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('시작'),
            { timeout: 3000 }
          );
          const inputVisibleAfterReset = await page.evaluate(() =>
            !document.getElementById('input-pair').hidden
          );
          if (!inputVisibleAfterReset) {
            throw new Error('리셋 후 idle 복귀인데 input-pair 여전히 hidden');
          }
          console.log('[step] 리셋 → idle + input-pair visible 복원 OK');

          // cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] BF-484 AC1 전체 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-484",
          },
          body: JSON.stringify({
            url,
            label:
              "타이머 일시정지 → 재개 → display 감소 + input-pair 상태별 hidden (BF-484 AC1 / BF-461 재발 방지)",
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
          `E2E 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ══════════════════════════════════════════════════════════════
  // E2E AC2 — T키 테마 토글 (§6.2 keyboard T)
  // BF-478 AC3 은 #theme-toggle 버튼 클릭만 커버 — T키 경로 미검증
  // ══════════════════════════════════════════════════════════════
  test(
    "BF-484 E2E AC2: T키 키보드 테마 토글 (§6.2 — BF-478 버튼 클릭 이외 경로)",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. 페이지 진입 + localStorage 초기화
          await page.waitForSelector('#theme-toggle');
          await page.evaluate(() => localStorage.clear());

          // 1. 초기 테마 확인 (dark default)
          const initTheme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
          );
          if (initTheme !== 'dark') {
            throw new Error('dark default 아님: initTheme=' + initTheme);
          }
          console.log('[step] dark default 확인 OK — initTheme=' + initTheme);

          // 2. body 클릭으로 input 포커스 해제 (T키 양보 방지)
          await page.click('body');

          // 3. T키 → dark → light 전환
          await page.keyboard.press('t');
          const afterTTheme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
          );
          if (afterTTheme !== 'light') {
            throw new Error('T키 후 data-theme 이 light 아님: ' + afterTTheme);
          }
          // localStorage bf-theme 갱신 확인
          const savedTheme1 = await page.evaluate(() =>
            localStorage.getItem('bf-theme')
          );
          if (savedTheme1 !== 'light') {
            throw new Error('T키 후 bf-theme localStorage 가 light 아님: ' + savedTheme1);
          }
          console.log('[step] T키 → light 전환 + localStorage 갱신 OK');

          // 4. T키 재입력 → light → dark 복귀
          await page.keyboard.press('t');
          const afterT2Theme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
          );
          if (afterT2Theme !== 'dark') {
            throw new Error('T키 재입력 후 data-theme 이 dark 아님: ' + afterT2Theme);
          }
          const savedTheme2 = await page.evaluate(() =>
            localStorage.getItem('bf-theme')
          );
          if (savedTheme2 !== 'dark') {
            throw new Error('T키 재입력 후 bf-theme localStorage 가 dark 아님: ' + savedTheme2);
          }
          console.log('[step] T키 재입력 → dark 복귀 + localStorage 갱신 OK');

          // 5. input focus 중 T키 → 테마 변경 없어야 함 (§6.2 input 양보)
          await page.fill('#input-s', '5');
          // #input-s 가 focused 인 상태에서 T키
          await page.keyboard.press('t');
          const themeAfterInputT = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
          );
          if (themeAfterInputT !== 'dark') {
            throw new Error(
              'input focus 중 T키가 테마 변경함 — §6.2 input 양보 미구현: theme=' +
                themeAfterInputT
            );
          }
          console.log('[step] input focus 중 T키 양보 OK (테마 미변경)');

          // cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] BF-484 AC2 T키 테마 토글 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-484",
          },
          body: JSON.stringify({
            url,
            label:
              "타이머 T키 테마 토글 — dark→light→dark + input focus 양보 (BF-484 AC2)",
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
          `E2E T키 테마 토글 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// inline 정적 서버 (0.0.0.0 바인딩 — e2e-runner 컨테이너에서 접근 가능)
// 임의 포트(0) — 다른 테스트와 충돌 없음
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
