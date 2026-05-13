// BF-496 · 타이머 SPA E2E 회귀 가드 — s4 머지 후 main 기준 (app.js)
//
// 보호 대상 (BF-496 수용 기준):
//   AC1. 진입 렌더 초기 상태 — 브라우저 로드 후 display 0:00 · btn disabled ·
//        input-pair visible · hint visible · ended-banner hidden
//   AC2. 1초 카운트다운 → 종료 알림 배너 표시 + bf-timer-last-config JSON
//        {minutes:0, seconds:1} 저장 검증 (마지막 설정 영속 계약)
//   (AC 테마 토글: timer-e2e-bf478.test.js BF-478 AC3 이미 커버 — 중복 제외)
//
// 중복 제외 근거 (기존 테스트가 이미 검증):
//   - 테마 토글 (#theme-toggle dark↔light + bf-theme localStorage):
//     timer-e2e-bf478.test.js BF-478 AC3 (dark→light→dark + 새로고침 복원)
//   - 일시정지 → 재개 → display 감소 (BF-461 재발):
//     timer-BF484-e2e.test.js BF-484 AC1
//   - hint 가시성 (idle+empty=visible, 값 입력 후 hidden):
//     timer-BF490-e2e.test.js BF-490 AC1
//   - ended 상태 btn-reset "새 타이머" + dismissBanner → input 복원:
//     timer-BF490-e2e.test.js BF-490 AC2
//   - 새로고침 후 loadLastConfig 복원 (bf-timer-last-config):
//     timer-BF490-e2e.test.js BF-490 AC3
//   - Space/Esc 키보드 단축키:
//     timer-e2e-bf478.test.js BF-478 AC4
//   - running/paused 상태 input-pair hidden:
//     timer-BF484-e2e.test.js BF-484 AC3
//   - CSS flash 토큰/애니메이션 · FOUC IIFE · localStorage key 계약:
//     timer-BF494.test.js
//
// BF-496 고유 가드:
//   [정적] app.js 진입점 계약 — index.html <script src="app.js"> 존재 (s4 머지 산출물)
//   [정적] HTML 초기 비활성화/숨김 계약 — #btn-primary disabled, #btn-reset disabled,
//          #ended-banner hidden (HTML 속성 기준, JS 실행 전)
//   [E2E AC1] 진입 렌더 초기 상태 — 브라우저 로드 후 실제 DOM 상태 검증
//   [E2E AC2] 1초 카운트다운 → ended 배너 + bf-timer-last-config {m:0,s:1} JSON 저장

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
const REPO_ROOT  = path.resolve(__dirname, "..");
const TIMER_HTML = path.join(REPO_ROOT, "timer", "index.html");

// ─────────────────────────────────────────────────────────────
// 유틸 — e2e-runner 도달 가능 여부 probe (한 번만 실행, 결과 캐시)
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
  // 정적 가드 — s4 머지 산출물 계약 (app.js 진입점, 초기 disabled/hidden)
  // ══════════════════════════════════════════════════════════════

  test("BF-496 정적: index.html 의 진입 스크립트가 app.js 임 (s4 머지 산출물 계약)", () => {
    const html = fs.readFileSync(TIMER_HTML, "utf-8");
    assert.ok(
      html.includes('src="app.js"'),
      'index.html 에 <script src="app.js"> 없음 — s4 머지 후 app.js 진입점 계약 위반 (script.js/main.js 로 회귀 금지)',
    );
  });

  test("BF-496 정적: index.html 에서 #btn-primary 가 disabled 속성으로 초기 비활성화 (idle+empty 상태)", () => {
    const html = fs.readFileSync(TIMER_HTML, "utf-8");
    // btn-primary 버튼 블록 추출 (id=btn-primary 포함, 다음 </button> 까지)
    const btnPrimaryIdx = html.indexOf('id="btn-primary"');
    assert.ok(btnPrimaryIdx !== -1, 'index.html 에 id="btn-primary" 없음');
    // 버튼 여는 태그 탐색: id 이전 가장 가까운 <button
    const tagStart = html.lastIndexOf("<button", btnPrimaryIdx);
    const tagEnd   = html.indexOf(">", btnPrimaryIdx);
    const btnTag   = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      /\bdisabled\b/.test(btnTag),
      "#btn-primary 오프닝 태그에 disabled 없음 — HTML 로드 시 idle+empty 상태에서 btn-primary 가 enabled (app.js 실행 전 FOUC 방지 실패)",
    );
  });

  test("BF-496 정적: index.html 에서 #btn-reset 이 disabled 속성으로 초기 비활성화 (idle+empty 상태)", () => {
    const html = fs.readFileSync(TIMER_HTML, "utf-8");
    const btnResetIdx = html.indexOf('id="btn-reset"');
    assert.ok(btnResetIdx !== -1, 'index.html 에 id="btn-reset" 없음');
    const tagStart = html.lastIndexOf("<button", btnResetIdx);
    const tagEnd   = html.indexOf(">", btnResetIdx);
    const btnTag   = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      /\bdisabled\b/.test(btnTag),
      "#btn-reset 오프닝 태그에 disabled 없음 — HTML 로드 시 idle+empty 상태에서 btn-reset 이 enabled (0:00 인데 리셋 활성화 위반)",
    );
  });

  test("BF-496 정적: index.html 에서 #ended-banner 가 hidden 속성으로 초기 숨겨짐 (idle 상태)", () => {
    const html = fs.readFileSync(TIMER_HTML, "utf-8");
    const bannerIdx = html.indexOf('id="ended-banner"');
    assert.ok(bannerIdx !== -1, 'index.html 에 id="ended-banner" 없음');
    // ended-banner 여는 div 태그 탐색
    const tagStart = html.lastIndexOf("<div", bannerIdx);
    const tagEnd   = html.indexOf(">", bannerIdx);
    const divTag   = html.slice(tagStart, tagEnd + 1);
    assert.ok(
      /\bhidden\b/.test(divTag),
      "#ended-banner 오프닝 태그에 hidden 없음 — 페이지 진입 시 종료 배너가 보여야 하지 않음 (idle 상태 초기 hidden 계약 위반)",
    );
  });

  // ══════════════════════════════════════════════════════════════
  // E2E AC1 — 진입 렌더 초기 상태 검증 (BF-496 고유)
  //   기존 BF-490 AC1 은 hint 가시성만, 초기 display/btn 상태 미검증
  // ══════════════════════════════════════════════════════════════
  test(
    "BF-496 E2E AC1: 진입 렌더 초기 상태 — display 0:00 · btn-primary/reset disabled · input-pair visible · hint visible · ended-banner hidden",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. localStorage 초기화 → 이전 설정 없는 idle+empty 상태 보장
          await page.waitForSelector('#btn-primary');
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#btn-primary');
          console.log('[step] 페이지 진입 OK (localStorage 초기화 완료)');

          // 1. display 초기값 — disp-m="0", disp-s="00" (idle+empty)
          const disp = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          if (disp.m !== '0') {
            throw new Error('초기 disp-m 이 "0" 이 아님: "' + disp.m + '" — app.js render() idle 상태 display 버그');
          }
          if (disp.s !== '00') {
            throw new Error('초기 disp-s 이 "00" 이 아님: "' + disp.s + '" — app.js render() padStart(2,"0") 버그');
          }
          console.log('[step] display 초기값 0:00 OK');

          // 2. #btn-primary 비활성화 — idle+empty 상태에서 hasValue=false → disabled
          const primaryDisabled = await page.evaluate(() =>
            document.getElementById('btn-primary').disabled
          );
          if (!primaryDisabled) {
            throw new Error('초기 상태(0:00)에서 btn-primary 가 enabled — app.js render() idle hasValue 판정 버그');
          }
          console.log('[step] btn-primary disabled OK');

          // 3. #btn-reset 비활성화 — idle+empty 상태에서 hasValue=false → disabled
          const resetDisabled = await page.evaluate(() =>
            document.getElementById('btn-reset').disabled
          );
          if (!resetDisabled) {
            throw new Error('초기 상태(0:00)에서 btn-reset 이 enabled — app.js render() idle hasValue 판정 버그');
          }
          console.log('[step] btn-reset disabled OK');

          // 4. #input-pair 가 visible — idle 상태에서 inputPairEl.hidden = false
          const inputPairVisible = await page.evaluate(() =>
            !document.getElementById('input-pair').hidden
          );
          if (!inputPairVisible) {
            throw new Error('초기 idle 상태에서 input-pair 가 hidden — app.js render() inputPairEl.hidden 버그');
          }
          console.log('[step] input-pair visible OK');

          // 5. #hint 가 visible — idle+empty(isEmpty=true) 에서 hintEl.hidden = false
          const hintVisible = await page.evaluate(() =>
            !document.getElementById('hint').hidden
          );
          if (!hintVisible) {
            throw new Error('초기 idle+empty 상태에서 hint 가 hidden — app.js render() hintEl.hidden isEmpty 판정 버그');
          }
          console.log('[step] #hint visible OK');

          // 6. #ended-banner 가 hidden — idle 상태에서 bannerEl.hidden = true
          const bannerHidden = await page.evaluate(() =>
            document.getElementById('ended-banner').hidden
          );
          if (!bannerHidden) {
            throw new Error('초기 idle 상태에서 ended-banner 가 visible — app.js render() bannerEl.hidden 버그');
          }
          console.log('[step] ended-banner hidden OK');

          // cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] BF-496 E2E AC1 진입 렌더 초기 상태 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-496",
          },
          body: JSON.stringify({
            url,
            label: "타이머 진입 렌더 초기 상태 — display 0:00 · btn disabled · input-pair visible · hint visible · banner hidden (BF-496 AC1)",
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
          `E2E 진입 렌더 초기 상태 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ══════════════════════════════════════════════════════════════
  // E2E AC2 — 1초 카운트다운 → 종료 알림 + bf-timer-last-config JSON 저장 검증
  //   기존 BF-478 AC2: 2초 ended → banner close (localStorage 내용 미검증)
  //   기존 BF-490 AC2: 3초 ended → btn text + dismiss → input 복원 (localStorage JSON 미검증)
  //   BF-496 고유: 1초 + ended 직후 bf-timer-last-config JSON {minutes:0, seconds:1} 내용 명시 검증
  // ══════════════════════════════════════════════════════════════
  test(
    "BF-496 E2E AC2: 1초 카운트다운 → ended 배너 표시 + bf-timer-last-config {minutes:0,seconds:1} JSON 저장 검증",
    async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/timer/`;
        const scriptText = `
          // 0. localStorage 초기화 → 이전 설정 제거
          await page.waitForSelector('#btn-primary');
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#btn-primary');
          console.log('[step] 페이지 진입 OK (localStorage 초기화 완료)');

          // 1. 0분 1초 설정 → display 0:01 동기 대기
          await page.fill('#input-m', '0');
          await page.fill('#input-s', '1');
          await page.waitForFunction(
            () => {
              const m = document.getElementById('disp-m').textContent;
              const s = document.getElementById('disp-s').textContent;
              return m === '0' && s === '01';
            },
            { timeout: 3000 }
          );
          console.log('[step] 0:01 설정 OK — display 동기 확인');

          // 2. 시작 클릭 → running 진입 (이 시점에 persistConfig → bf-timer-last-config 저장)
          await page.click('#btn-primary');
          await page.waitForFunction(
            () => document.getElementById('btn-primary').textContent.includes('일시정지'),
            { timeout: 3000 }
          );
          console.log('[step] running 진입 OK');

          // 3. 시작 직후 bf-timer-last-config 저장 확인
          //    app.js startOrResume() → persistConfig() → saveLastConfig(0, 1)
          const savedRawOnStart = await page.evaluate(() =>
            localStorage.getItem('bf-timer-last-config')
          );
          if (!savedRawOnStart) {
            throw new Error(
              'running 진입 후 bf-timer-last-config 키 미존재 — app.js startOrResume() persistConfig() 누락'
            );
          }
          const savedOnStart = JSON.parse(savedRawOnStart);
          if (savedOnStart.minutes !== 0 || savedOnStart.seconds !== 1) {
            throw new Error(
              'bf-timer-last-config 값 불일치 — expected {minutes:0,seconds:1}, got: ' + savedRawOnStart
            );
          }
          console.log('[step] bf-timer-last-config={minutes:0,seconds:1} 저장 OK');

          // 4. ended 상태 대기 (1초 카운트다운 완료 → ended-banner 표시)
          //    timeout: 1초 + 여유 3초 = 4000ms
          await page.waitForFunction(
            () => {
              const banner = document.getElementById('ended-banner');
              return banner && !banner.hidden;
            },
            { timeout: 5000 }
          );
          console.log('[step] ended-banner 표시 확인 OK (1초 카운트다운 종료)');

          // 5. ended 상태에서 bf-timer-last-config 여전히 존재 (ended 시 clearLastConfig 미호출)
          //    app.js tick(): remainingMs≤0 → phase="ended" → render() (config 유지)
          const savedRawOnEnded = await page.evaluate(() =>
            localStorage.getItem('bf-timer-last-config')
          );
          if (!savedRawOnEnded) {
            throw new Error(
              'ended 상태에서 bf-timer-last-config 키 삭제됨 — app.js tick()/render() 가 ended 시 config 삭제 버그'
            );
          }
          const savedOnEnded = JSON.parse(savedRawOnEnded);
          if (savedOnEnded.minutes !== 0 || savedOnEnded.seconds !== 1) {
            throw new Error(
              'ended 상태 bf-timer-last-config 값 변형 — expected {minutes:0,seconds:1}, got: ' + savedRawOnEnded
            );
          }
          console.log('[step] ended 상태 bf-timer-last-config={minutes:0,seconds:1} 유지 OK');

          // 6. display 가 0:00 (ended 상태 dispM=0, dispS=0)
          const dispEnded = await page.evaluate(() => ({
            m: document.getElementById('disp-m').textContent,
            s: document.getElementById('disp-s').textContent,
          }));
          if (dispEnded.m !== '0' || dispEnded.s !== '00') {
            throw new Error(
              'ended 상태 display 가 0:00 이 아님: ' + JSON.stringify(dispEnded) + ' — app.js render() ended dispM/dispS 버그'
            );
          }
          console.log('[step] ended display 0:00 OK');

          // 7. ended 상태에서 .display.is-ended 클래스 적용 확인 (CSS flash 애니메이션 계약)
          const displayIsEnded = await page.evaluate(() =>
            document.getElementById('display').classList.contains('is-ended')
          );
          if (!displayIsEnded) {
            throw new Error(
              'ended 상태에서 .display.is-ended 클래스 없음 — app.js render() displayEl.classList.toggle("is-ended") 버그'
            );
          }
          console.log('[step] .display.is-ended 클래스 적용 OK');

          // cleanup
          await page.evaluate(() => localStorage.clear());
          console.log('[done] BF-496 E2E AC2 1초 카운트다운 → ended + localStorage PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-496",
          },
          body: JSON.stringify({
            url,
            label: "타이머 1초 카운트다운 → ended 배너 + bf-timer-last-config {minutes:0,seconds:1} JSON 저장 (BF-496 AC2)",
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
          `E2E 1초 카운트다운 종료 알림 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-1200)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// inline 정적 서버 (0.0.0.0 바인딩 — e2e-runner 컨테이너에서 접근 가능)
// 임의 포트(0) — 다른 테스트 서버와 충돌 없음
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
