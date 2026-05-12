// BF-434 · 뽀모도로 SPA 실 브라우저 E2E 회귀 가드 (worker host)
//
// 본 파일은 BF-432 의 dev 산출물 (pomodoro/ 모듈) 이 main 에 들어간 후
// silent break 되지 않도록, e2e-runner 컨테이너로 worker host URL 에 접근해
// FOCUS 진행 / 일시정지 / 새로고침 복원 / 4 사이클 LONG_BREAK 자동 진입 /
// 테마 / 키보드 / CORS 에러 0건 시나리오를 직접 구동한다.
//
// 보호 대상 (BF-434 수용 기준):
//   AC0 (정적). file:// 직접 열기 안전성 — ES module import/export, 외부 fetch,
//        CDN URL, <script type="module"> 0건. script 로드 순서
//        (storage.js → timer.js → main.js) 와 상대경로 ("./") 가드.
//   AC1. FOCUS 25:00 시작 → debug:speed 로 빠른 진행 (24:50 부근 도달) →
//        일시정지 → 새로고침 → paused 상태로 remainingMs 복원.
//   AC2. Reset 으로 현재 모드 초기값 (FOCUS=25:00) 복귀 + Skip 으로 다음 모드
//        (SHORT_BREAK) 자동 진입 (5:00).
//   AC3. 4 사이클 (FOCUS×4) 완료 후 LONG_BREAK 자동 진입 — Skip 7회로 transition
//        체인을 빠르게 끝까지 돌려 state.mode === "LONG_BREAK" 검증.
//   AC4. 다크 default → T 키 토글 → light → 새로고침 후에도 light 유지
//        + localStorage bf-theme=light 박제.
//   AC5. 키보드 단축키 Space (시작/정지) / R (리셋) / S (Skip) / T (테마)
//        — main.js 의 document.keydown listener fact.
//   AC6. 페이지 진입~조작 전 구간 console.error / page error 0건 (CORS / JS
//        error 회귀 가드). file:// 안전성을 http://worker 호스팅 환경에서도
//        보강 검증.
//
// 작성 방침 (BF-419 / BF-429 패턴 준수):
//   - CI 결정성 (결함 14 / 19 회귀 방지) — BRIX_E2E_SKIP=1 또는 e2e-runner
//     도달 불가 시 t.skip(). assert.ok(reachable, ...) 같은 hookFail 패턴 금지.
//   - focused scope 정책: BRIX_TEST_MODULE 가 'pomodoro' 가 아니면 module
//     전체 skip — 자기 외 module (kanban/notepad/timer/stopwatch) 와 분리.
//   - 시나리오는 AC 별 test 로 분리 — 라벨로 운영자 UI 에서 구분 + 한쪽 실패가
//     다른 쪽 artifact 를 가리지 않게.
//   - BRIX_PERSONA_HOST env 우선. host.docker.internal / localhost 금지
//     (e2e-runner 는 다른 컨테이너).
//   - debug:speed 활용 — pomodoro/main.js 가 boot 시점에 store.loadDebugSpeed()
//     한 번만 읽어 module 변수에 박제하므로, setItem 후 reload 필수.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "pomodoro";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const POMODORO_DIR = path.join(REPO_ROOT, "pomodoro");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // AC0 (정적) — file:// 직접 열기 안전성 (ES module 키워드 / fetch / CDN 0건)
  // ─────────────────────────────────────────────────────────────
  test("BF-434 AC0 (정적): file:// CORS 안전 — ES module import/export·fetch·CDN·type=module 0건", () => {
    const indexHtml = fs.readFileSync(
      path.join(POMODORO_DIR, "index.html"),
      "utf-8",
    );
    const mainJs = fs.readFileSync(path.join(POMODORO_DIR, "main.js"), "utf-8");
    const timerJs = fs.readFileSync(
      path.join(POMODORO_DIR, "timer.js"),
      "utf-8",
    );
    const storageJs = fs.readFileSync(
      path.join(POMODORO_DIR, "storage.js"),
      "utf-8",
    );

    // 1. <script type="module"> 0건 — file:// 에서 module script 는 CORS 차단
    assert.equal(
      /\btype\s*=\s*["']module["']/i.test(indexHtml),
      false,
      "index.html 에 <script type=\"module\"> 가 있으면 file:// 진입 시 CORS 차단",
    );

    // 2. script 로드 순서 — storage.js → timer.js → main.js (main.js 는 글로벌 의존)
    const idxStorage = indexHtml.indexOf("storage.js");
    const idxTimer = indexHtml.indexOf("timer.js");
    const idxMain = indexHtml.indexOf("main.js");
    assert.ok(
      idxStorage > 0 && idxTimer > idxStorage && idxMain > idxTimer,
      `script 로드 순서가 storage→timer→main 이 아님: storage=${idxStorage} timer=${idxTimer} main=${idxMain}`,
    );

    // 3. 외부 host script src 0건 — 상대경로 ("./") 만 허용
    const scriptSrcMatches = [...indexHtml.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)];
    for (const m of scriptSrcMatches) {
      const src = m[1];
      assert.ok(
        src.startsWith("./") || src.startsWith("/") === false,
        `index.html script src 가 상대경로가 아님: ${src}`,
      );
      assert.equal(
        /^https?:\/\//i.test(src),
        false,
        `index.html 에 외부 host script 가 있음: ${src}`,
      );
    }

    // 4. ES module import/export 키워드 0건 — main/timer/storage 모두
    //    (UMD 패턴 + IIFE 만 허용; export/import 가 있으면 file:// 에서 SyntaxError)
    const importRe = /^\s*import\s+[\s\S]*?from\s+["']/m;
    const exportRe = /^\s*export\s+(?:default\s+|const\s|let\s|var\s|function\s|class\s|\{)/m;
    for (const [name, src] of [
      ["main.js", mainJs],
      ["timer.js", timerJs],
      ["storage.js", storageJs],
    ]) {
      assert.equal(
        importRe.test(src),
        false,
        `${name} 에 ES module import 구문이 있음 (file:// 진입 시 SyntaxError)`,
      );
      assert.equal(
        exportRe.test(src),
        false,
        `${name} 에 ES module export 구문이 있음 (file:// 진입 시 SyntaxError)`,
      );
    }

    // 5. 외부 fetch self-load / CDN URL 0건 — file:// 에서 CORS 차단됨
    for (const [name, src] of [
      ["main.js", mainJs],
      ["timer.js", timerJs],
      ["storage.js", storageJs],
      ["index.html", indexHtml],
    ]) {
      assert.equal(
        /\bfetch\s*\(/.test(src),
        false,
        `${name} 에 fetch() 호출이 있음 — file:// 에서 CORS 차단`,
      );
      assert.equal(
        /(?:cdn\.|jsdelivr|unpkg|googleapis|cdnjs)/i.test(src),
        false,
        `${name} 에 CDN URL 이 있음 — file:// 에서 CORS 차단`,
      );
    }

    // 6. main.js / timer.js / storage.js 가 IIFE 또는 UMD 로 시작 (외부 의존 0)
    assert.ok(
      /^\s*\/\*[\s\S]*?\*\/\s*\(function\s*\(/.test(mainJs) ||
        /^\s*\(function\s*\(/.test(mainJs),
      "main.js 가 IIFE 패턴으로 시작하지 않음 (file:// 안전성 의존)",
    );
    assert.ok(
      /\(function\s*\(\s*root\s*,\s*factory\s*\)/.test(timerJs),
      "timer.js 가 UMD 패턴이 아님",
    );
    assert.ok(
      /\(function\s*\(\s*root\s*,\s*factory\s*\)/.test(storageJs),
      "storage.js 가 UMD 패턴이 아님",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // AC1 — FOCUS 25:00 시작 → 빠른 진행 → 일시정지 → 새로고침 → paused 복원
  // ─────────────────────────────────────────────────────────────
  test("BF-434 AC1: FOCUS 25:00 시작 → 빠른 진행 → 일시정지 → 새로고침 후 paused 복원", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/pomodoro/`;
      const scriptText = `
        // 0. clean — pomodoro: prefix + bf-theme 제거 후 debug:speed=30 박제 → reload
        //    main.js boot 가 loadDebugSpeed() 를 한 번만 읽으므로 reload 필수.
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('pomodoro:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
          // debug:speed=30 → 1초 = 30초 진행. 즉 100ms 후 약 3초 차감 → 24:57 근처.
          localStorage.setItem('pomodoro:debug:speed', '30');
        });
        await page.reload();
        await page.waitForSelector('#btn-primary');

        // 1. 초기 — FOCUS 25:00 / phase=idle / cycle=1 / 모드 배지 FOCUS
        const initial = await page.evaluate(() => ({
          dispM: document.getElementById('disp-m').textContent,
          dispS: document.getElementById('disp-s').textContent,
          mode: document.getElementById('pomodoro-card').getAttribute('data-mode'),
          modeLabel: document.getElementById('mode-label').textContent,
          btnText: document.getElementById('btn-primary').textContent.trim(),
          cycleN: document.getElementById('cycle-n')?.textContent,
          paused: document.getElementById('countdown').classList.contains('is-paused'),
        }));
        if (initial.dispM !== '25' || initial.dispS !== '00') {
          throw new Error('초기 disp 가 25:00 이 아님: ' + JSON.stringify(initial));
        }
        if (initial.mode !== 'FOCUS') throw new Error('초기 data-mode !== FOCUS: ' + initial.mode);
        if (initial.modeLabel !== 'FOCUS') throw new Error('초기 mode-label !== FOCUS');
        if (!/Start/i.test(initial.btnText)) throw new Error('초기 btn 텍스트 mismatch: ' + initial.btnText);
        if (initial.cycleN !== '1') throw new Error('초기 cycle-n !== "1": ' + initial.cycleN);
        if (initial.paused) throw new Error('초기 countdown.is-paused 가 활성됨');
        console.log('[step1] 초기 FOCUS 25:00 / idle / cycle 1 OK');

        // 2. 시작 클릭 → phase=running, btn 텍스트 "Pause"
        await page.click('#btn-primary');
        const afterStart = await page.evaluate(() => ({
          btnText: document.getElementById('btn-primary').textContent.trim(),
          paused: document.getElementById('countdown').classList.contains('is-paused'),
        }));
        if (!/Pause/i.test(afterStart.btnText)) {
          throw new Error('시작 후 btn 텍스트가 Pause 가 아님: ' + afterStart.btnText);
        }
        if (afterStart.paused) {
          throw new Error('시작 후 countdown.is-paused 가 활성됨 (running 인데 paused class)');
        }
        console.log('[step2] 시작 → btn=Pause + is-paused 해제 OK');

        // 3. 빠른 진행 — 약 400ms 대기 (debug:speed=30 → 약 12초 차감 → 24:48 근처)
        //    24:50 부근 이면 24~25 사이 분에서 50 ± 일정 범위.
        await new Promise((r) => setTimeout(r, 400));
        const afterTick = await page.evaluate(() => ({
          dispM: document.getElementById('disp-m').textContent,
          dispS: document.getElementById('disp-s').textContent,
        }));
        const elapsedSecs =
          25 * 60 -
          (parseInt(afterTick.dispM, 10) * 60 + parseInt(afterTick.dispS, 10));
        // debug:speed=30 + 400ms → 약 12초 차감 (스케줄링 지터로 5~25 허용)
        if (!Number.isFinite(elapsedSecs) || elapsedSecs < 5 || elapsedSecs > 60) {
          throw new Error(
            '빠른 진행 후 차감된 시간 (' + elapsedSecs + 's) 가 5~60s 범위 밖: ' + JSON.stringify(afterTick),
          );
        }
        // disp 포맷 — 2자리 zero-pad
        if (!/^[0-9]{2}$/.test(afterTick.dispM) || !/^[0-9]{2}$/.test(afterTick.dispS)) {
          throw new Error('진행 중 disp 포맷 깨짐: ' + JSON.stringify(afterTick));
        }
        console.log('[step3] 빠른 진행 → ' + elapsedSecs + 's 차감 (disp=' +
          afterTick.dispM + ':' + afterTick.dispS + ') OK');

        // 4. 일시정지 — btn-primary 다시 클릭 → phase=paused, btn 텍스트 "Resume",
        //    countdown.is-paused 활성
        await page.click('#btn-primary');
        const beforeReload = await page.evaluate(() => ({
          btnText: document.getElementById('btn-primary').textContent.trim(),
          paused: document.getElementById('countdown').classList.contains('is-paused'),
          dispM: document.getElementById('disp-m').textContent,
          dispS: document.getElementById('disp-s').textContent,
          stored: localStorage.getItem('pomodoro:state'),
        }));
        if (!/Resume/i.test(beforeReload.btnText)) {
          throw new Error('일시정지 후 btn 텍스트가 Resume 가 아님: ' + beforeReload.btnText);
        }
        if (!beforeReload.paused) {
          throw new Error('일시정지 후 countdown.is-paused 가 활성되지 않음');
        }
        if (!beforeReload.stored) {
          throw new Error('일시정지 후 localStorage pomodoro:state 누락 — persist 호출 안 됨');
        }
        const storedState = JSON.parse(beforeReload.stored);
        if (storedState.phase !== 'paused') {
          throw new Error('localStorage state.phase 가 paused 가 아님: ' + storedState.phase);
        }
        if (storedState.mode !== 'FOCUS') throw new Error('paused 후 state.mode !== FOCUS');
        if (storedState.currentCycle !== 1) {
          throw new Error('paused 후 state.currentCycle !== 1: ' + storedState.currentCycle);
        }
        if (!Number.isFinite(storedState.remainingMs) || storedState.remainingMs <= 0) {
          throw new Error('paused 후 state.remainingMs 가 양수가 아님: ' + storedState.remainingMs);
        }
        if (storedState.remainingMs >= 25 * 60 * 1000) {
          throw new Error(
            'paused 후 state.remainingMs 가 25:00 (초기값) 그대로 — 시간 차감 안 됨: ' +
              storedState.remainingMs,
          );
        }
        console.log('[step4] 일시정지 → btn=Resume + is-paused + state 영속 OK (remainingMs=' +
          storedState.remainingMs + ')');

        // 5. 새로고침 → loadState() 로 복원, phase=paused 유지, remainingMs 그대로,
        //    disp 가 저장 시점 값과 일치
        await page.reload();
        await page.waitForSelector('#btn-primary');
        const afterReload = await page.evaluate(() => ({
          dispM: document.getElementById('disp-m').textContent,
          dispS: document.getElementById('disp-s').textContent,
          mode: document.getElementById('pomodoro-card').getAttribute('data-mode'),
          modeLabel: document.getElementById('mode-label').textContent,
          btnText: document.getElementById('btn-primary').textContent.trim(),
          cycleN: document.getElementById('cycle-n')?.textContent,
          paused: document.getElementById('countdown').classList.contains('is-paused'),
          stored: JSON.parse(localStorage.getItem('pomodoro:state') || 'null'),
        }));
        if (afterReload.mode !== 'FOCUS') {
          throw new Error('새로고침 후 data-mode !== FOCUS: ' + afterReload.mode);
        }
        if (afterReload.modeLabel !== 'FOCUS') {
          throw new Error('새로고침 후 mode-label !== FOCUS');
        }
        if (!/Resume/i.test(afterReload.btnText)) {
          throw new Error('새로고침 후 btn 텍스트가 Resume 가 아님 (paused 복원 실패): ' + afterReload.btnText);
        }
        if (!afterReload.paused) {
          throw new Error('새로고침 후 countdown.is-paused 가 활성되지 않음 (paused 복원 실패)');
        }
        if (afterReload.cycleN !== '1') {
          throw new Error('새로고침 후 cycle-n !== "1": ' + afterReload.cycleN);
        }
        // disp 가 25:00 이 아니어야 함 (감소된 상태 그대로 복원)
        if (afterReload.dispM === '25' && afterReload.dispS === '00') {
          throw new Error(
            '새로고침 후 disp 가 25:00 (초기값) — remainingMs 복원 실패',
          );
        }
        if (afterReload.stored.phase !== 'paused') {
          throw new Error('새로고침 후 state.phase 가 paused 가 아님: ' + afterReload.stored.phase);
        }
        // 복원 후 remainingMs 는 reload 전 값과 동일해야 함 (tick 이 다시 안 도는 paused 상태)
        if (afterReload.stored.remainingMs !== storedState.remainingMs) {
          throw new Error(
            '새로고침 후 remainingMs 가 reload 전과 다름: before=' + storedState.remainingMs +
              ' after=' + afterReload.stored.remainingMs,
          );
        }
        console.log('[step5] 새로고침 → paused 상태 + remainingMs + disp 복원 OK');

        // cleanup
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('pomodoro:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        console.log('[done] BF-434 AC1 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "",
        },
        body: JSON.stringify({
          url,
          label:
            "뽀모도로 FOCUS 시작→빠른 진행→일시정지→새로고침 복원 (BF-434 AC1)",
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
        `E2E AC1 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2000)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // AC2 — Reset (현재 모드 초기값 복귀) + Skip (다음 모드 자동 진입)
  // ─────────────────────────────────────────────────────────────
  test("BF-434 AC2: Reset → FOCUS 25:00 복귀 + Skip → SHORT_BREAK 5:00 자동 진입", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/pomodoro/`;
      const scriptText = `
        // 0. clean + debug:speed=30 → reload
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('pomodoro:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
          localStorage.setItem('pomodoro:debug:speed', '30');
        });
        await page.reload();
        await page.waitForSelector('#btn-primary');

        // 1. 시작 → 400ms 진행 → 일정 시간 차감 확인
        await page.click('#btn-primary');
        await new Promise((r) => setTimeout(r, 400));
        const midProgress = await page.evaluate(() => ({
          dispM: document.getElementById('disp-m').textContent,
          dispS: document.getElementById('disp-s').textContent,
        }));
        const midSecs = parseInt(midProgress.dispM, 10) * 60 + parseInt(midProgress.dispS, 10);
        if (midSecs >= 25 * 60) {
          throw new Error('시작 + 400ms 후 시간이 차감 안 됨: ' + JSON.stringify(midProgress));
        }
        console.log('[step1] 시작 + 진행 OK (disp=' + midProgress.dispM + ':' + midProgress.dispS + ')');

        // 2. Reset (btn-reset 클릭) → 25:00 복귀, phase=idle, cycle 유지 (=1)
        await page.click('#btn-reset');
        // reset 은 동기 — 다음 frame 에 반영. 안전하게 50ms 대기.
        await new Promise((r) => setTimeout(r, 80));
        const afterReset = await page.evaluate(() => ({
          dispM: document.getElementById('disp-m').textContent,
          dispS: document.getElementById('disp-s').textContent,
          mode: document.getElementById('pomodoro-card').getAttribute('data-mode'),
          btnText: document.getElementById('btn-primary').textContent.trim(),
          cycleN: document.getElementById('cycle-n')?.textContent,
          paused: document.getElementById('countdown').classList.contains('is-paused'),
          stored: JSON.parse(localStorage.getItem('pomodoro:state') || 'null'),
        }));
        if (afterReset.dispM !== '25' || afterReset.dispS !== '00') {
          throw new Error('Reset 후 disp 가 25:00 이 아님: ' + JSON.stringify(afterReset));
        }
        if (afterReset.mode !== 'FOCUS') throw new Error('Reset 후 data-mode !== FOCUS');
        if (!/Start/i.test(afterReset.btnText)) {
          throw new Error('Reset 후 btn 텍스트가 Start 가 아님 (idle 복귀 실패): ' + afterReset.btnText);
        }
        if (afterReset.cycleN !== '1') {
          throw new Error('Reset 후 cycle 이 유지되지 않음: ' + afterReset.cycleN);
        }
        if (afterReset.paused) {
          throw new Error('Reset 후 countdown.is-paused 가 활성됨 (idle 인데 paused class)');
        }
        if (!afterReset.stored || afterReset.stored.phase !== 'idle') {
          throw new Error('Reset 후 state.phase !== idle: ' + JSON.stringify(afterReset.stored));
        }
        if (afterReset.stored.remainingMs !== 25 * 60 * 1000) {
          throw new Error(
            'Reset 후 state.remainingMs !== 25분: ' + afterReset.stored.remainingMs,
          );
        }
        console.log('[step2] Reset → FOCUS 25:00 / idle / cycle 1 유지 OK');

        // 3. Skip (btn-skip 클릭) → transitionToNext (220ms setTimeout) →
        //    SHORT_BREAK 자동 진입, phase=running, 5:00
        await page.click('#btn-skip');
        // transitionToNext: 220ms setTimeout + requestAnimationFrame. 안전 마진 400ms.
        await new Promise((r) => setTimeout(r, 400));
        const afterSkip = await page.evaluate(() => ({
          dispM: document.getElementById('disp-m').textContent,
          dispS: document.getElementById('disp-s').textContent,
          mode: document.getElementById('pomodoro-card').getAttribute('data-mode'),
          modeLabel: document.getElementById('mode-label').textContent,
          btnText: document.getElementById('btn-primary').textContent.trim(),
          cycleN: document.getElementById('cycle-n')?.textContent,
          stored: JSON.parse(localStorage.getItem('pomodoro:state') || 'null'),
        }));
        if (afterSkip.mode !== 'SHORT_BREAK') {
          throw new Error('Skip 후 data-mode !== SHORT_BREAK: ' + afterSkip.mode);
        }
        if (afterSkip.modeLabel !== 'SHORT BREAK') {
          throw new Error('Skip 후 mode-label !== "SHORT BREAK": ' + afterSkip.modeLabel);
        }
        // SHORT_BREAK 5:00 으로 시작 — 자동 running (transitionToNext 의 phase="running")
        // tick 으로 약간 차감 가능 → 분=04 or 05 허용
        const skipSecs =
          parseInt(afterSkip.dispM, 10) * 60 + parseInt(afterSkip.dispS, 10);
        if (skipSecs <= 0 || skipSecs > 5 * 60) {
          throw new Error('Skip 후 disp 가 SHORT_BREAK 범위 (0~5:00) 밖: ' + JSON.stringify(afterSkip));
        }
        if (skipSecs < 4 * 60) {
          // debug:speed=30 + 400ms 대기 → 약 12초 차감. 4분 이하면 의심.
          throw new Error('Skip 후 disp 가 SHORT_BREAK 5:00 근처가 아님: ' + JSON.stringify(afterSkip));
        }
        if (!/Pause/i.test(afterSkip.btnText)) {
          throw new Error('Skip 후 자동 running 이 아님 (btn !== Pause): ' + afterSkip.btnText);
        }
        if (afterSkip.cycleN !== '1') {
          // FOCUS cycle 1 → SHORT_BREAK 는 cycle 유지 (nextPhase 규칙)
          throw new Error('Skip (FOCUS→SHORT_BREAK) 후 cycle 이 유지되지 않음: ' + afterSkip.cycleN);
        }
        if (!afterSkip.stored || afterSkip.stored.mode !== 'SHORT_BREAK') {
          throw new Error('Skip 후 localStorage state.mode !== SHORT_BREAK: ' + JSON.stringify(afterSkip.stored));
        }
        console.log('[step3] Skip → SHORT_BREAK 자동 진입 + 5:00 부근 + running OK');

        // cleanup
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('pomodoro:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        console.log('[done] BF-434 AC2 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "",
        },
        body: JSON.stringify({
          url,
          label: "뽀모도로 Reset → 25:00 + Skip → SHORT_BREAK 자동 (BF-434 AC2)",
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
        `E2E AC2 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2000)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // AC3 — 4 사이클 (FOCUS×4) 완료 → LONG_BREAK 자동 진입
  // ─────────────────────────────────────────────────────────────
  test("BF-434 AC3: 4 사이클 완료 → LONG_BREAK 자동 진입 (Skip 7회 transition chain)", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/pomodoro/`;
      // transition chain (Timer.nextPhase fact):
      //   1: FOCUS#1 → SHORT_BREAK#1
      //   2: SHORT_BREAK#1 → FOCUS#2
      //   3: FOCUS#2 → SHORT_BREAK#2
      //   4: SHORT_BREAK#2 → FOCUS#3
      //   5: FOCUS#3 → SHORT_BREAK#3
      //   6: SHORT_BREAK#3 → FOCUS#4
      //   7: FOCUS#4 → LONG_BREAK#4    ← 7번째 skip 에서 LONG_BREAK 진입
      const scriptText = `
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('pomodoro:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        await page.reload();
        await page.waitForSelector('#btn-primary');

        // 초기 — FOCUS, cycle 1
        const initial = await page.evaluate(() => ({
          mode: document.getElementById('pomodoro-card').getAttribute('data-mode'),
          cycleN: document.getElementById('cycle-n')?.textContent,
        }));
        if (initial.mode !== 'FOCUS' || initial.cycleN !== '1') {
          throw new Error('초기 mode/cycle mismatch: ' + JSON.stringify(initial));
        }
        console.log('[init] FOCUS / cycle 1 OK');

        // Skip 7회 — 매 skip 은 transitionToNext 의 220ms + 1 frame 대기 필요.
        // 매번 충분히 (400ms) 대기. 시작 안 하고 바로 skip 해도 transition 동작
        // (skip 함수는 phase 무관 — remainingMs=0 → transitionToNext).
        const expected = [
          { step: 1, mode: 'SHORT_BREAK', cycle: '1' },
          { step: 2, mode: 'FOCUS',       cycle: '2' },
          { step: 3, mode: 'SHORT_BREAK', cycle: '2' },
          { step: 4, mode: 'FOCUS',       cycle: '3' },
          { step: 5, mode: 'SHORT_BREAK', cycle: '3' },
          { step: 6, mode: 'FOCUS',       cycle: '4' },
          { step: 7, mode: 'LONG_BREAK',  cycle: null }, // LONG_BREAK 는 cycle 표시 "사이클 완료"
        ];
        for (const e of expected) {
          await page.click('#btn-skip');
          await new Promise((r) => setTimeout(r, 400));
          const cur = await page.evaluate(() => ({
            mode: document.getElementById('pomodoro-card').getAttribute('data-mode'),
            modeLabel: document.getElementById('mode-label').textContent,
            cycleN: document.getElementById('cycle-n')?.textContent,
            cycleCounterText: document.getElementById('cycle-counter')?.textContent,
            stored: JSON.parse(localStorage.getItem('pomodoro:state') || 'null'),
          }));
          if (cur.mode !== e.mode) {
            throw new Error(
              'Skip #' + e.step + ' 후 mode mismatch: expected=' + e.mode + ' actual=' + cur.mode +
                ' (label=' + cur.modeLabel + ', cycleN=' + cur.cycleN + ')',
            );
          }
          if (e.cycle !== null && cur.cycleN !== e.cycle) {
            throw new Error(
              'Skip #' + e.step + ' 후 cycleN mismatch: expected=' + e.cycle + ' actual=' + cur.cycleN,
            );
          }
          if (!cur.stored || cur.stored.mode !== e.mode) {
            throw new Error('Skip #' + e.step + ' 후 localStorage mode mismatch: ' + JSON.stringify(cur.stored));
          }
          console.log('[skip ' + e.step + '] mode=' + cur.mode + ' cycleN=' + cur.cycleN + ' OK');
        }

        // 최종 — LONG_BREAK, 15:00 부근, mode-label "LONG BREAK"
        const finalState = await page.evaluate(() => ({
          mode: document.getElementById('pomodoro-card').getAttribute('data-mode'),
          modeLabel: document.getElementById('mode-label').textContent,
          dispM: document.getElementById('disp-m').textContent,
          dispS: document.getElementById('disp-s').textContent,
          cycleCounterText: document.getElementById('cycle-counter')?.textContent,
          // dot 4개 모두 .dot--done
          dotsDone: Array.from(document.querySelectorAll('.dot')).filter(
            (d) => d.classList.contains('dot--done')
          ).length,
        }));
        if (finalState.mode !== 'LONG_BREAK') {
          throw new Error('최종 LONG_BREAK 도달 실패: ' + JSON.stringify(finalState));
        }
        if (finalState.modeLabel !== 'LONG BREAK') {
          throw new Error('LONG_BREAK mode-label mismatch: ' + finalState.modeLabel);
        }
        const finalSecs =
          parseInt(finalState.dispM, 10) * 60 + parseInt(finalState.dispS, 10);
        // LONG_BREAK 15:00 = 900s 부근 (자동 running → 약간 차감 가능)
        if (finalSecs <= 0 || finalSecs > 15 * 60) {
          throw new Error('LONG_BREAK disp 범위 밖: ' + JSON.stringify(finalState));
        }
        if (finalSecs < 14 * 60) {
          throw new Error('LONG_BREAK 도달 후 disp 가 15:00 근처가 아님: ' + JSON.stringify(finalState));
        }
        if (!finalState.cycleCounterText || !finalState.cycleCounterText.includes('사이클 완료')) {
          throw new Error('LONG_BREAK cycle-counter 가 "사이클 완료" 를 포함하지 않음: ' + finalState.cycleCounterText);
        }
        if (finalState.dotsDone !== 4) {
          throw new Error('LONG_BREAK dot--done 개수 !== 4: ' + finalState.dotsDone);
        }
        console.log('[final] LONG_BREAK 15:00 + 사이클 완료 + dot 4/4 OK');

        // cleanup
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('pomodoro:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        console.log('[done] BF-434 AC3 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "",
        },
        body: JSON.stringify({
          url,
          label: "뽀모도로 4 사이클 완료 → LONG_BREAK 자동 진입 (BF-434 AC3)",
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
        `E2E AC3 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2000)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // AC4 — 다크/라이트 테마 토글 + 새로고침 후 유지
  // ─────────────────────────────────────────────────────────────
  test("BF-434 AC4: 다크 default → 라이트 토글 → 새로고침 후 라이트 유지 (bf-theme 박제)", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/pomodoro/`;
      const scriptText = `
        // 0. clean — bf-theme 제거 → reload. pomodoro 는 명세 §6.6 다크 default
        //    (저장값 없으면 다크 강제).
        await page.evaluate(() => {
          localStorage.removeItem('bf-theme');
          // pomodoro state 도 함께 정리 (테마 토글 시나리오 격리)
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('pomodoro:')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        await page.reload();
        await page.waitForSelector('#theme-toggle');

        // 1. 초기 — 다크 default (저장값 없음 → dark), btn 텍스트 "☀"
        const initial = await page.evaluate(() => ({
          dataTheme: document.documentElement.getAttribute('data-theme'),
          btnText: document.getElementById('theme-toggle')?.textContent,
          btnAria: document.getElementById('theme-toggle')?.getAttribute('aria-label'),
          stored: localStorage.getItem('bf-theme'),
        }));
        if (initial.dataTheme !== 'dark') {
          throw new Error('초기 data-theme 가 dark 가 아님 (다크 default 실패): ' + initial.dataTheme);
        }
        if (initial.btnText !== '☀') {
          throw new Error('다크일 때 btn 텍스트 mismatch: ' + initial.btnText);
        }
        if (initial.btnAria !== '라이트 테마로 전환') {
          throw new Error('다크 aria-label mismatch: ' + initial.btnAria);
        }
        if (initial.stored !== null) {
          throw new Error('초기 (토글 전) bf-theme 가 미리 박제됨: ' + initial.stored);
        }
        console.log('[step1] 초기 다크 default + bf-theme null OK');

        // 2. 테마 토글 클릭 → 라이트
        await page.click('#theme-toggle');
        const afterToggle = await page.evaluate(() => ({
          dataTheme: document.documentElement.getAttribute('data-theme'),
          btnText: document.getElementById('theme-toggle')?.textContent,
          btnAria: document.getElementById('theme-toggle')?.getAttribute('aria-label'),
          stored: localStorage.getItem('bf-theme'),
        }));
        if (afterToggle.dataTheme !== 'light') {
          throw new Error('토글 후 data-theme !== light: ' + afterToggle.dataTheme);
        }
        if (afterToggle.btnText !== '🌙') {
          throw new Error('라이트 btn 텍스트 mismatch: ' + afterToggle.btnText);
        }
        if (afterToggle.btnAria !== '다크 테마로 전환') {
          throw new Error('라이트 aria-label mismatch: ' + afterToggle.btnAria);
        }
        if (afterToggle.stored !== 'light') {
          throw new Error('토글 후 bf-theme !== "light": ' + afterToggle.stored);
        }
        console.log('[step2] 토글 → 라이트 + bf-theme=light 박제 OK');

        // 3. 새로고침 → bf-theme=light 가 있으므로 라이트 유지
        //    (인라인 head script 가 saved 우선 적용 — flicker 방지)
        await page.reload();
        await page.waitForSelector('#theme-toggle');
        const afterReload = await page.evaluate(() => ({
          dataTheme: document.documentElement.getAttribute('data-theme'),
          btnText: document.getElementById('theme-toggle')?.textContent,
          btnAria: document.getElementById('theme-toggle')?.getAttribute('aria-label'),
          stored: localStorage.getItem('bf-theme'),
        }));
        if (afterReload.dataTheme !== 'light') {
          throw new Error('새로고침 후 data-theme !== light (테마 유지 실패): ' + afterReload.dataTheme);
        }
        if (afterReload.btnText !== '🌙') {
          throw new Error('새로고침 후 btn 텍스트 mismatch: ' + afterReload.btnText);
        }
        if (afterReload.stored !== 'light') {
          throw new Error('새로고침 후 bf-theme !== "light": ' + afterReload.stored);
        }
        console.log('[step3] 새로고침 → 라이트 유지 + bf-theme=light 그대로 OK');

        // 4. 재토글 → 다크 + bf-theme=dark
        await page.click('#theme-toggle');
        const afterBack = await page.evaluate(() => ({
          dataTheme: document.documentElement.getAttribute('data-theme'),
          stored: localStorage.getItem('bf-theme'),
        }));
        if (afterBack.dataTheme !== 'dark') {
          throw new Error('재토글 후 다크 적용 실패: ' + afterBack.dataTheme);
        }
        if (afterBack.stored !== 'dark') {
          throw new Error('재토글 후 bf-theme !== "dark": ' + afterBack.stored);
        }
        console.log('[step4] 재토글 → 다크 + bf-theme=dark 박제 OK');

        // cleanup
        await page.evaluate(() => localStorage.removeItem('bf-theme'));
        console.log('[done] BF-434 AC4 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "",
        },
        body: JSON.stringify({
          url,
          label: "뽀모도로 테마 다크↔라이트 + 새로고침 유지 (BF-434 AC4)",
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
        `E2E AC4 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2000)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // AC5 — 키보드 단축키 Space (시작/정지) / R (리셋) / S (Skip) / T (테마)
  // ─────────────────────────────────────────────────────────────
  test("BF-434 AC5: 키보드 단축키 Space (시작/정지) · R (리셋) · S (Skip) · T (테마)", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/pomodoro/`;
      const scriptText = `
        // 0. clean + debug:speed=30 → reload
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('pomodoro:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
          localStorage.setItem('pomodoro:debug:speed', '30');
        });
        await page.reload();
        await page.waitForSelector('#btn-primary');

        // body 포커스 (단축키 listener 는 document.keydown — 어디든 OK 지만 명시적)
        await page.click('body');

        // 1. Space → 시작 (idle → running, btn=Pause)
        await page.keyboard.press('Space');
        await new Promise((r) => setTimeout(r, 250));
        const afterSpaceStart = await page.evaluate(() => ({
          btnText: document.getElementById('btn-primary').textContent.trim(),
          paused: document.getElementById('countdown').classList.contains('is-paused'),
          dispM: document.getElementById('disp-m').textContent,
          dispS: document.getElementById('disp-s').textContent,
        }));
        if (!/Pause/i.test(afterSpaceStart.btnText)) {
          throw new Error('Space 시작 후 btn !== Pause: ' + afterSpaceStart.btnText);
        }
        if (afterSpaceStart.paused) {
          throw new Error('Space 시작 후 is-paused 가 활성됨');
        }
        const startSecs =
          parseInt(afterSpaceStart.dispM, 10) * 60 +
          parseInt(afterSpaceStart.dispS, 10);
        if (startSecs >= 25 * 60) {
          throw new Error('Space 시작 + 250ms 후 시간 차감 안 됨 (debug speed 안 먹음): ' +
            JSON.stringify(afterSpaceStart));
        }
        console.log('[step1] Space → 시작 + tick 진행 OK');

        // 2. Space → 일시정지 (running → paused, btn=Resume, is-paused)
        await page.keyboard.press('Space');
        const afterSpacePause = await page.evaluate(() => ({
          btnText: document.getElementById('btn-primary').textContent.trim(),
          paused: document.getElementById('countdown').classList.contains('is-paused'),
        }));
        if (!/Resume/i.test(afterSpacePause.btnText)) {
          throw new Error('Space 일시정지 후 btn !== Resume: ' + afterSpacePause.btnText);
        }
        if (!afterSpacePause.paused) {
          throw new Error('Space 일시정지 후 is-paused 가 활성되지 않음');
        }
        console.log('[step2] Space → 일시정지 OK');

        // 3. R → 리셋 (paused → idle, FOCUS 25:00 복귀, btn=Start)
        await page.keyboard.press('r');
        await new Promise((r) => setTimeout(r, 80));
        const afterR = await page.evaluate(() => ({
          btnText: document.getElementById('btn-primary').textContent.trim(),
          dispM: document.getElementById('disp-m').textContent,
          dispS: document.getElementById('disp-s').textContent,
          paused: document.getElementById('countdown').classList.contains('is-paused'),
          mode: document.getElementById('pomodoro-card').getAttribute('data-mode'),
        }));
        if (!/Start/i.test(afterR.btnText)) {
          throw new Error('R 리셋 후 btn !== Start: ' + afterR.btnText);
        }
        if (afterR.dispM !== '25' || afterR.dispS !== '00') {
          throw new Error('R 리셋 후 disp !== 25:00: ' + JSON.stringify(afterR));
        }
        if (afterR.paused) throw new Error('R 리셋 후 is-paused 가 활성됨');
        if (afterR.mode !== 'FOCUS') throw new Error('R 리셋 후 mode !== FOCUS');
        console.log('[step3] R → 리셋 25:00 / idle OK');

        // 4. S → Skip (FOCUS → SHORT_BREAK 자동 진입, transition 220ms)
        await page.keyboard.press('s');
        await new Promise((r) => setTimeout(r, 400));
        const afterS = await page.evaluate(() => ({
          mode: document.getElementById('pomodoro-card').getAttribute('data-mode'),
          modeLabel: document.getElementById('mode-label').textContent,
          btnText: document.getElementById('btn-primary').textContent.trim(),
        }));
        if (afterS.mode !== 'SHORT_BREAK') {
          throw new Error('S Skip 후 mode !== SHORT_BREAK: ' + afterS.mode);
        }
        if (afterS.modeLabel !== 'SHORT BREAK') {
          throw new Error('S Skip 후 mode-label !== "SHORT BREAK": ' + afterS.modeLabel);
        }
        // Skip 후 자동 running
        if (!/Pause/i.test(afterS.btnText)) {
          throw new Error('S Skip 후 자동 running 이 아님 (btn !== Pause): ' + afterS.btnText);
        }
        console.log('[step4] S → SHORT_BREAK 자동 진입 + running OK');

        // 5. T → 테마 토글 (dark → light)
        const beforeT = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        await page.keyboard.press('t');
        await new Promise((r) => setTimeout(r, 80));
        const afterT = await page.evaluate(() => ({
          dataTheme: document.documentElement.getAttribute('data-theme'),
          stored: localStorage.getItem('bf-theme'),
        }));
        const expectedNext = beforeT === 'dark' ? 'light' : 'dark';
        if (afterT.dataTheme !== expectedNext) {
          throw new Error('T 후 data-theme 가 ' + expectedNext + ' 이 아님: ' + afterT.dataTheme);
        }
        if (afterT.stored !== expectedNext) {
          throw new Error('T 후 bf-theme 가 ' + expectedNext + ' 이 아님: ' + afterT.stored);
        }
        console.log('[step5] T → 테마 ' + beforeT + ' → ' + afterT.dataTheme + ' + 박제 OK');

        // cleanup
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('pomodoro:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        console.log('[done] BF-434 AC5 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "",
        },
        body: JSON.stringify({
          url,
          label: "뽀모도로 키보드 단축키 Space·R·S·T (BF-434 AC5)",
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
        `E2E AC5 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2000)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // AC6 — 페이지 진입~조작 console.error / page error 0건 (CORS 회귀 가드)
  // ─────────────────────────────────────────────────────────────
  test("BF-434 AC6: 페이지 부팅~조작 구간 console.error / unhandledrejection / page error 0건", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/pomodoro/`;
      // page.on('console') / page.on('pageerror') 에 대한 e2e-runner 의 외부 노출이
      // 보장되지 않으므로, window.onerror / unhandledrejection 을 페이지 안에서
      // 직접 hook 해 누적 후 회수한다. main.js 의 console.error 호출 (script 순서
      // 오류) 도 함께 잡기 위해 console.error 도 wrap.
      const scriptText = `
        // 0. clean → reload 후 가장 먼저 hook 설치
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('pomodoro:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        await page.reload();
        await page.waitForSelector('#btn-primary');

        // 1. error hook 설치 — pomodoro 페이지 reload 후 한 번만. 이후 시나리오는
        //    같은 페이지 context 안에서 진행.
        await page.evaluate(() => {
          window.__pomodoroErrors = [];
          window.addEventListener('error', (e) => {
            window.__pomodoroErrors.push('error: ' + (e.message || String(e)));
          });
          window.addEventListener('unhandledrejection', (e) => {
            window.__pomodoroErrors.push(
              'unhandledrejection: ' + String(e.reason && e.reason.message ? e.reason.message : e.reason),
            );
          });
          // console.error wrap — main.js 의 script 순서 오류 메시지도 잡힘
          const origErr = console.error.bind(console);
          console.error = function () {
            try {
              window.__pomodoroErrors.push(
                'console.error: ' + Array.from(arguments).map(String).join(' '),
              );
            } catch (_e) {
              // 무한 재귀 방지
            }
            return origErr.apply(console, arguments);
          };
        });

        // 2. 기본 시나리오 — 시작 → 일시정지 → 리셋 → Skip → 테마 토글 (가장 빈도 높은 흐름)
        await page.click('#btn-primary');
        await new Promise((r) => setTimeout(r, 200));
        await page.click('#btn-primary'); // pause
        await new Promise((r) => setTimeout(r, 100));
        await page.click('#btn-reset');
        await new Promise((r) => setTimeout(r, 100));
        await page.click('#btn-skip');
        await new Promise((r) => setTimeout(r, 400));
        await page.click('#theme-toggle');
        await new Promise((r) => setTimeout(r, 100));
        await page.click('#theme-toggle');

        // 3. 키보드 단축키 — Space / R / S / T
        await page.click('body');
        await page.keyboard.press('Space');
        await new Promise((r) => setTimeout(r, 150));
        await page.keyboard.press('Space');
        await page.keyboard.press('r');
        await page.keyboard.press('s');
        await new Promise((r) => setTimeout(r, 400));
        await page.keyboard.press('t');
        await new Promise((r) => setTimeout(r, 100));
        await page.keyboard.press('t');

        // 4. error 회수 — 0 건이어야 함
        const errs = await page.evaluate(() => window.__pomodoroErrors || []);
        if (errs.length > 0) {
          throw new Error(
            'console/page error 발생 (' + errs.length + '건): ' + errs.slice(0, 5).join(' | '),
          );
        }
        console.log('[step] 전체 시나리오 후 console/page error 0건 OK');

        // cleanup
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('pomodoro:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        console.log('[done] BF-434 AC6 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "",
        },
        body: JSON.stringify({
          url,
          label: "뽀모도로 console/page error 0건 회귀 (BF-434 AC6)",
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
        `E2E AC6 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2000)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들
// ─────────────────────────────────────────────────────────────

/**
 * e2e-runner 도달성 확인. 못 닿으면 test.skip() 호출 후 false 반환.
 * (CI 환경에는 컨테이너 없음 — fail 처리하면 PR 자동 머지가 트리거 안 됨.)
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
 * 페르소나 컨테이너의 service hostname. e2e-runner 가 정적 서버로 도달할 때 사용.
 * host.docker.internal / localhost 는 절대 사용 X (다른 컨테이너).
 */
function personaHost() {
  return (
    process.env.BRIX_PERSONA_HOST ??
    process.env.BRIX_WORKER_HOSTNAME ??
    "worker"
  );
}

/**
 * 0.0.0.0 바인딩 임시 정적 서버. 임의 포트로 동시 실행 충돌 회피.
 */
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
        res.setHeader(
          "Content-Type",
          MIME[ext] || "application/octet-stream",
        );
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
