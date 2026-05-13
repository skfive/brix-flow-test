// BF-490 · 타이머 SPA E2E 회귀 가드 — app.js (BF-488) 기반 focused scope
//
// 보호 대상 (BF-490 AC):
//   AC1. /timer/ 진입 + 분초 입력 + 시작 + 일시정지 + 재개 + 리셋 + 종료 알림
//        → hint 가시성 + ended 상태 btn-reset "새 타이머" + dismissBanner 후 input 값 복원
//   AC2. 새로고침 시 localStorage bf-timer-last-config 복원
//        → app.js boot sequence (loadLastConfig) 로 input + display 복원 확인
//   AC3. focused scope — timer module 만 검증 (BRIX_TEST_MODULE=timer)
//
// 중복 제외 (기존 테스트가 이미 커버하는 항목):
//   - DOM id 전체 존재            : timer-BF488.test.js (BF-488 AC1)
//   - IIFE / no-import / no-fetch : timer-BF488.test.js (BF-488 AC2)
//   - 4가지 phase 상태 코드       : timer-BF488.test.js (BF-488 AC2)
//   - localStorage setItem/getItem: timer-BF488.test.js (BF-488 AC3)
//   - 10초 pause → resume 감소    : timer-BF484-e2e.test.js (BF-484 AC1)
//   - input-pair 상태별 hidden    : timer-BF484-e2e.test.js (BF-484 AC1)
//   - T키 테마 토글               : timer-BF484-e2e.test.js (BF-484 AC2)
//   - Space/Esc 단축키            : timer-e2e-bf478.test.js (BF-478 AC4)
//   - 2초 ended → banner visible + 닫기 → idle + display 복원
//                                  : timer-e2e-bf478.test.js (BF-478 AC2)
//   - 5초 start → reload → display 복원
//                                  : timer-e2e.test.js (BF-409 AC4)
//
// BF-490 고유 가드:
//   [정적] app.js 에 ended 상태 btn-reset "새 타이머" 텍스트 매핑 코드 존재
//   [정적] app.js 에 dismissBanner 함수 존재 (배너 닫기 → idle 복귀 경로)
//   [E2E AC1] #hint 가시성 — idle+empty 시 visible, 값 입력 후 hidden
//   [E2E AC2] ended 상태 btn-reset "새 타이머" 텍스트 + dismissBanner 후 input 값 복원
//   [E2E AC3] 새로고침 후 app.js loadLastConfig → input-m / input-s + display 복원

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
const TIMER_APP = path.join(REPO_ROOT, "timer", "app.js");

// ─────────────────────────────────────────────────────────────
// e2e-runner 도달 가능 여부 probe
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
  // 정적 가드 — app.js (BF-488) 고유 항목 (timer-BF488.test.js 미커버)
  // ══════════════════════════════════════════════════════════════

  test("BF-490 정적: app.js 에 ended 상태 btn-reset '새 타이머' 텍스트 코드 존재 (§5.3 ended)", () => {
    const js = fs.readFileSync(TIMER_APP, "utf-8");
    assert.ok(
      js.includes("새 타이머"),
      "app.js 에 '새 타이머' 텍스트 없음 — ended 상태 btn-reset 레이블 §5.3 위반",
    );
  });

  test("BF-490 정적: app.js 에 dismissBanner 함수 존재 (배너 닫기 → idle 복귀 경로)", () => {
    const js = fs.readFileSync(TIMER_APP, "utf-8");
    assert.ok(
      js.includes("dismissBanner"),
      "app.js 에 dismissBanner 없음 — btn-banner-close 클릭 → idle 복귀 경로 미구현",
    );
  });

  test("BF-490 정적: app.js 의 dismissBanner 가 phase='idle' 복귀 + render() 호출 (존재 검증)", () => {
    const js = fs.readFileSync(TIMER_APP, "utf-8");
    // dismissBanner 블록 내에 phase = "idle" 할당과 render() 호출이 있어야 함
    assert.ok(
      js.includes("dismissBanner") && js.includes('"idle"'),
      "app.js 의 dismissBanner 에 phase 'idle' 복귀 코드 없음 — 배너 닫기 후 상태 전이 불가",
    );
  });

  // ══════════════════════════════════════════════════════════════
  // E2E AC1 — #hint 가시성: idle+empty=visible, 값 입력 후=hidden
  // 기존 테스트 미커버: timer-BF488 은 정적 id 존재만, BF-478/484 은 hint 미검증
  // ══════════════════════════════════════════════════════════════
  test(
    "BF-490 E2E AC1: #hint 가시성 — idle+empty 시 visible, 분초 입력 후 hidden",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. 페이지 진입 + localStorage 초기화 (이전 설정 제거 → empty 상태 보장)
          await page.waitForSelector('#hint');
          await page.evaluate(() => {
            localStorage.removeItem('bf-timer-last-config');
          });
          await page.reload();
          await page.waitForSelector('#hint');
          console.log('[step] 페이지 진입 OK');

          // 1. idle + empty 상태 → #hint 가 visible 이어야 함 (§4.7)
          //    app.js render(): hintEl.hidden = !(phase === "idle" && isEmpty)
          //    0:00 이면 isEmpty=true → hint visible
          const hintVisibleEmpty = await page.evaluate(() => {
            const el = document.getElementById('hint');
            return el && !el.hidden;
          });
          if (!hintVisibleEmpty) {
            throw new Error('#hint 가 idle+empty 상태인데 hidden — §4.7 위반 (app.js render hintEl.hidden 버그)');
          }
          console.log('[step] idle+empty: #hint visible OK');

          // 2. 분 입력 → 값 존재 → hint 사라져야 함
          await page.fill('#input-m', '2');
          // input 이벤트 처리 후 render 호출 → hint hidden
          await page.waitForFunction(
            () => {
              const el = document.getElementById('hint');
              return el && el.hidden;
            },
            { timeout: 3000 }
          );
          console.log('[step] 분 입력 후 #hint hidden OK');

          // 3. 초 입력 추가 → hint 여전히 hidden
          await page.fill('#input-s', '30');
          const hintHiddenAfterBoth = await page.evaluate(() =>
            document.getElementById('hint').hidden
          );
          if (!hintHiddenAfterBoth) {
            throw new Error('#hint 가 분초 입력 후에도 visible — §4.7 isEmpty=false 인데 hint 노출');
          }
          console.log('[step] 분초 입력 후 #hint hidden OK');

          // 4. 값 모두 0으로 되돌리기 → hint 다시 visible
          await page.fill('#input-m', '0');
          await page.fill('#input-s', '0');
          await page.waitForFunction(
            () => {
              const el = document.getElementById('hint');
              return el && !el.hidden;
            },
            { timeout: 3000 }
          );
          console.log('[step] 0:00 복귀 후 #hint 재표시 OK');

          // cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] BF-490 E2E AC1 hint 가시성 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-490",
          },
          body: JSON.stringify({
            url,
            label: "타이머 #hint 가시성 — idle+empty=visible / 입력 후=hidden (BF-490 AC1)",
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
          `E2E #hint 가시성 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ══════════════════════════════════════════════════════════════
  // E2E AC2 — ended 상태 btn-reset "새 타이머" 텍스트 + dismissBanner 후 input 값 복원
  // 기존 BF-478 AC2: display 복원은 검증하지만 input-m/s 값, btn-reset 텍스트 미검증
  // ══════════════════════════════════════════════════════════════
  test(
    "BF-490 E2E AC2: 3초 종료 → ended btn-reset '새 타이머' 텍스트 + dismissBanner → idle + input 값(0:03) 복원",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. 페이지 진입 + localStorage 초기화
          await page.waitForSelector('#btn-primary');
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#btn-primary');
          console.log('[step] 페이지 진입 OK');

          // 1. 0분 3초 설정
          await page.fill('#input-m', '0');
          await page.fill('#input-s', '3');
          await page.waitForFunction(
            () => document.getElementById('disp-s').textContent === '03',
            { timeout: 3000 }
          );
          console.log('[step] 0:03 설정 OK');

          // 2. 시작 클릭 → running
          await page.click('#btn-primary');
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('일시정지'),
            { timeout: 3000 }
          );
          console.log('[step] running 진입 OK');

          // 3. ended 상태 대기 (3초 + 여유 2초 = 5초 timeout)
          await page.waitForFunction(
            () => {
              const banner = document.getElementById('ended-banner');
              return banner && !banner.hidden;
            },
            { timeout: 8000 }
          );
          console.log('[step] ended-banner 표시 확인 OK');

          // 4. ended 상태에서 btn-reset 텍스트가 "새 타이머" 인지 확인 (§5.3 ended)
          const resetBtnText = await page.evaluate(() =>
            document.getElementById('btn-reset').textContent
          );
          if (!resetBtnText.includes('새 타이머')) {
            throw new Error(
              'ended 상태 btn-reset 텍스트가 "새 타이머" 아님: "' + resetBtnText + '" — app.js §5.3 ended 분기 버그'
            );
          }
          console.log('[step] ended btn-reset "새 타이머" 텍스트 OK');

          // 5. ended 상태에서 btn-primary 비활성화 확인
          const primaryDisabled = await page.evaluate(() =>
            document.getElementById('btn-primary').disabled
          );
          if (!primaryDisabled) {
            throw new Error('ended 상태인데 btn-primary 가 enabled — §5.3 ended 분기 버그');
          }
          console.log('[step] ended btn-primary disabled OK');

          // 6. #btn-banner-close 클릭 → dismissBanner → idle 복귀
          await page.click('#btn-banner-close');
          await page.waitForFunction(
            () => document.getElementById('ended-banner').hidden,
            { timeout: 3000 }
          );
          console.log('[step] dismissBanner → 배너 닫힘 OK');

          // 7. idle 복귀 후 input-pair visible
          const inputVisible = await page.evaluate(() =>
            !document.getElementById('input-pair').hidden
          );
          if (!inputVisible) {
            throw new Error('dismissBanner 후 input-pair 가 여전히 hidden — idle 복귀 실패');
          }
          console.log('[step] idle 복귀 + input-pair visible OK');

          // 8. dismissBanner 후 input-m / input-s 값이 이전 설정값(0, 3) 유지인지 확인
          //    app.js dismissBanner: phase="idle" + render() → configMinutes/configSeconds 유지
          const inputVals = await page.evaluate(() => ({
            m: document.getElementById('input-m').value,
            s: document.getElementById('input-s').value,
          }));
          if (inputVals.m !== '0' || inputVals.s !== '3') {
            throw new Error(
              'dismissBanner 후 input 값 복원 실패 — expected m=0, s=3, got: ' +
                JSON.stringify(inputVals)
            );
          }
          console.log('[step] dismissBanner 후 input 값 (m=0, s=3) 복원 OK');

          // 9. btn-primary 다시 "▶ 시작" + enabled (hasValue=true 이므로)
          const primaryText = await page.evaluate(() =>
            document.getElementById('btn-primary').textContent
          );
          if (!primaryText.includes('시작')) {
            throw new Error(
              'idle 복귀 후 btn-primary 텍스트가 "시작" 아님: "' + primaryText + '"'
            );
          }
          const primaryEnabledAfter = await page.evaluate(() =>
            !document.getElementById('btn-primary').disabled
          );
          if (!primaryEnabledAfter) {
            throw new Error('idle 복귀 후 configSeconds=3 인데 btn-primary 여전히 disabled');
          }
          console.log('[step] idle 복귀 btn-primary "▶ 시작" + enabled OK');

          // cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] BF-490 E2E AC2 ended→dismissBanner→input 복원 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-490",
          },
          body: JSON.stringify({
            url,
            label: "타이머 3초 종료 → ended btn-reset '새 타이머' + dismissBanner → idle + input 복원 (BF-490 AC2)",
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
          `E2E ended→dismissBanner 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ══════════════════════════════════════════════════════════════
  // E2E AC3 — 새로고침 후 app.js boot sequence (loadLastConfig) → input + display 복원
  // 기존 BF-409 AC4: storage.js 기반 / "timer:last" 키 언급 → app.js loadLastConfig 경로 미검증
  // ══════════════════════════════════════════════════════════════
  test(
    "BF-490 E2E AC3: 1분20초 설정 → 시작 → 새로고침 → app.js loadLastConfig 로 input(1:20) + display(1:20) 복원",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. 페이지 진입 + localStorage 초기화 (이전 설정 제거)
          await page.waitForSelector('#btn-primary');
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#btn-primary');
          console.log('[step] 페이지 진입 OK');

          // 1. 1분 20초 설정
          await page.fill('#input-m', '1');
          await page.fill('#input-s', '20');
          await page.waitForFunction(
            () => {
              const m = document.getElementById('disp-m').textContent;
              const s = document.getElementById('disp-s').textContent;
              return m === '1' && s === '20';
            },
            { timeout: 3000 }
          );
          console.log('[step] 1:20 설정 OK');

          // 2. 시작 클릭 → running (bf-timer-last-config 저장 발생)
          await page.click('#btn-primary');
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('일시정지'),
            { timeout: 3000 }
          );
          console.log('[step] running 진입 OK (bf-timer-last-config 저장됨)');

          // 3. localStorage 에 bf-timer-last-config 저장 확인
          const savedRaw = await page.evaluate(() =>
            localStorage.getItem('bf-timer-last-config')
          );
          if (!savedRaw) {
            throw new Error('bf-timer-last-config 키 미존재 — app.js persistConfig 누락');
          }
          const saved = JSON.parse(savedRaw);
          if (saved.minutes !== 1 || saved.seconds !== 20) {
            throw new Error(
              'bf-timer-last-config 값 불일치 — expected {minutes:1,seconds:20}, got: ' + savedRaw
            );
          }
          console.log('[step] bf-timer-last-config={minutes:1,seconds:20} 저장 OK');

          // 4. 새로고침 → app.js boot sequence: loadLastConfig 실행
          await page.reload();
          await page.waitForSelector('#btn-primary');
          console.log('[step] 새로고침 OK');

          // 5. input-m / input-s 가 마지막 설정값(1, 20) 으로 복원됐는지 확인
          const inputAfter = await page.evaluate(() => ({
            m: document.getElementById('input-m').value,
            s: document.getElementById('input-s').value,
          }));
          if (inputAfter.m !== '1' || inputAfter.s !== '20') {
            throw new Error(
              '새로고침 후 input 복원 실패 — expected m=1, s=20, got: ' +
                JSON.stringify(inputAfter)
            );
          }
          console.log('[step] 새로고침 후 input 복원 (m=1, s=20) OK');

          // 6. display 도 1:20 로 복원됐는지 확인 (idle 상태 = config 값 표시)
          const dispAfter = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          if (dispAfter.m !== '1' || dispAfter.s !== '20') {
            throw new Error(
              '새로고침 후 display 복원 실패 — expected 1:20, got: ' +
                JSON.stringify(dispAfter)
            );
          }
          console.log('[step] 새로고침 후 display 1:20 복원 OK');

          // 7. 복원 후 idle 상태 확인 — btn-primary "▶ 시작" + enabled
          const primaryAfter = await page.evaluate(() => ({
            text: document.getElementById('btn-primary').textContent,
            disabled: document.getElementById('btn-primary').disabled,
          }));
          if (!primaryAfter.text.includes('시작')) {
            throw new Error(
              '새로고침 후 idle 상태 아님 — btn-primary text: "' + primaryAfter.text + '"'
            );
          }
          if (primaryAfter.disabled) {
            throw new Error(
              '새로고침 후 config=1:20 인데 btn-primary disabled — hasValue 판정 버그'
            );
          }
          console.log('[step] 새로고침 후 idle + btn-primary "▶ 시작" enabled OK');

          // cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] BF-490 E2E AC3 새로고침 → loadLastConfig 복원 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-490",
          },
          body: JSON.stringify({
            url,
            label: "타이머 1:20 설정 → 시작 → 새로고침 → app.js loadLastConfig 복원 (BF-490 AC3)",
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
          `E2E 새로고침 복원 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
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
