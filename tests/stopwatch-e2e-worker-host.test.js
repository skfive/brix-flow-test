// BF-419 · 스톱워치 SPA 실 브라우저 E2E 회귀 가드 (worker host)
//
// 본 파일은 BF-417 의 dev 산출물 (stopwatch/ 모듈) 이 main 에 들어간 후
// silent break 되지 않도록, e2e-runner 컨테이너로 worker host URL 에 접근해
// 마우스/키보드 시나리오 두 갈래를 직접 구동한다.
//
// 보호 대상 (BF-419 수용 기준):
//   AC1. /stopwatch 페이지 → 시작 → 1초 대기 → 랩 클릭 → 정지 → 새로고침 → 리셋
//        결과 — mm:ss.xx 포맷, 랩 1건 추가, 새로고침 후 랩 복원, 리셋 후 빈 상태
//   AC2. 키보드 단축키 Space / L / Esc → 시작·정지 / 랩 / 리셋 동작
//   AC3. worker host URL (BRIX_PERSONA_HOST) 로 접근 → 결과 artifact 가 e2e-runner
//        callId 디렉토리에 저장 (screenshot / trace)
//
// 작성 방침:
//   - 기존 stopwatch-e2e.test.js (dev 작성, 정적 가드) 는 보존. 본 파일은 e2e-runner
//     실행 가드 only.
//   - CI 결정성 (결함 14/19 회귀 방지) — BRIX_E2E_SKIP=1 또는 도달 불가 시 t.skip().
//     assert 금지.
//   - focused scope 정책: BRIX_TEST_MODULE 가 stopwatch 가 아니면 module 전체 skip.
//   - BRIX_PERSONA_HOST env 우선. compose 서비스 hostname 만 허용
//     (host.docker.internal / localhost 금지 — e2e-runner 는 다른 컨테이너).
//   - 시나리오 두 개를 같은 e2e-runner 호출 한 번으로 묶지 않고 분리한다:
//     운영자 UI 의 라벨로 마우스 흐름과 키보드 흐름을 한 눈에 구분 가능하고,
//     한쪽 실패가 다른 쪽 artifact 를 가리지 않게 한다.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "stopwatch";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // E2E AC1 — 마우스 시나리오 (시작 → 랩 → 정지 → 새로고침 복원 → 리셋)
  // ─────────────────────────────────────────────────────────────
  test("BF-419 E2E AC1: 시작→1초→랩→정지→새로고침 복원→리셋 (mm:ss.xx · 랩 1건 · 빈 상태)", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/stopwatch/`;
      // mm:ss.xx 포맷 = #disp-m / #disp-s / #disp-x 각 2자리 zero-pad
      // (stopwatch/stopwatch.js formatStopwatchMs 의 fact)
      const scriptText = `
        // 0. clean start — 잔존 localStorage 제거 후 reload
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#btn-start');

        // 초기 mm:ss.xx 포맷 확인 — 모두 2자리 zero-pad, 초기값 "00:00.00"
        const initDisp = await page.evaluate(() => ({
          m: document.getElementById('disp-m').textContent,
          s: document.getElementById('disp-s').textContent,
          x: document.getElementById('disp-x').textContent,
          lapCardHidden: document.getElementById('lap-card').hidden,
        }));
        const mmFmt = /^[0-9]{2}$/;
        if (!mmFmt.test(initDisp.m) || !mmFmt.test(initDisp.s) || !mmFmt.test(initDisp.x)) {
          throw new Error('초기 display 가 2자리 zero-pad 가 아님: ' + JSON.stringify(initDisp));
        }
        if (initDisp.m !== '00' || initDisp.s !== '00' || initDisp.x !== '00') {
          throw new Error('초기 display 가 00:00.00 이 아님: ' + JSON.stringify(initDisp));
        }
        if (initDisp.lapCardHidden !== true) {
          throw new Error('초기 lap-card 가 hidden 이 아님 (laps.length===0 일 때 hidden 이어야 함)');
        }
        console.log('[step1] 초기 00:00.00 · lap-card hidden OK');

        // 1. 시작 → 1초 대기 → display 가 증가했는지 (mm:ss.xx 포맷 유지)
        await page.click('#btn-start');
        await new Promise((r) => setTimeout(r, 1100));
        const runDisp = await page.evaluate(() => ({
          m: document.getElementById('disp-m').textContent,
          s: document.getElementById('disp-s').textContent,
          x: document.getElementById('disp-x').textContent,
        }));
        if (!mmFmt.test(runDisp.m) || !mmFmt.test(runDisp.s) || !mmFmt.test(runDisp.x)) {
          throw new Error('실행 중 display 포맷 깨짐: ' + JSON.stringify(runDisp));
        }
        // 1.1초 후 분=00, 초>=01 (보더 케이스 회피용 1100ms 대기). 1초보다 살짝 모자란 시점도
        // 잡힐 수 있어 ss=00 인 케이스 허용하되 xx 가 증가했는지로 보강 검증.
        const totalMs =
          parseInt(runDisp.m, 10) * 60000 +
          parseInt(runDisp.s, 10) * 1000 +
          parseInt(runDisp.x, 10) * 10;
        if (totalMs < 500) {
          throw new Error('1초 대기 후 elapsed 가 500ms 미만 — tick 미동작 의심: ' + JSON.stringify(runDisp));
        }
        console.log('[step2] 시작 + 1초 → display 진행 OK (' + JSON.stringify(runDisp) + ')');

        // 2. 랩 클릭 → laps.length === 1, lap-count === "1", lap-card 노출, li 1 개
        await page.click('#btn-lap');
        const afterLap = await page.evaluate(() => ({
          count: document.getElementById('lap-count').textContent,
          hidden: document.getElementById('lap-card').hidden,
          liCount: document.querySelectorAll('#lap-list li').length,
        }));
        if (afterLap.hidden !== false) {
          throw new Error('랩 추가 후 lap-card.hidden 가 false 가 아님');
        }
        if (afterLap.count !== '1') {
          throw new Error('랩 추가 후 lap-count 가 "1" 이 아님: ' + afterLap.count);
        }
        if (afterLap.liCount !== 1) {
          throw new Error('랩 추가 후 #lap-list li 개수가 1 이 아님: ' + afterLap.liCount);
        }
        console.log('[step3] 랩 클릭 → 1건 추가 + 카드 노출 OK');

        // 3. 정지 → btn-stop disabled, btn-start enabled, btn-lap disabled
        //    localStorage stopwatch:elapsed 에 정지 시점 elapsed 저장
        await page.click('#btn-stop');
        const afterStop = await page.evaluate(() => ({
          startDisabled: document.getElementById('btn-start').disabled,
          stopDisabled: document.getElementById('btn-stop').disabled,
          lapDisabled: document.getElementById('btn-lap').disabled,
          resetDisabled: document.getElementById('btn-reset').disabled,
          elapsed: localStorage.getItem('stopwatch:elapsed'),
          laps: localStorage.getItem('stopwatch:laps'),
          dispS: document.getElementById('disp-s').textContent,
        }));
        if (afterStop.startDisabled) throw new Error('정지 후 btn-start 가 enabled 여야 함 (재개 가능)');
        if (!afterStop.stopDisabled) throw new Error('정지 후 btn-stop 은 disabled 여야 함');
        if (!afterStop.lapDisabled) throw new Error('정지 후 btn-lap 은 disabled 여야 함');
        if (afterStop.resetDisabled) throw new Error('정지 후 btn-reset 은 enabled 여야 함');
        if (!afterStop.elapsed) {
          throw new Error('정지 후 localStorage stopwatch:elapsed 누락 — saveElapsed 호출 안 됨');
        }
        const elapsedParsed = JSON.parse(afterStop.elapsed);
        if (!Number.isFinite(elapsedParsed) || elapsedParsed <= 0) {
          throw new Error('stopwatch:elapsed 값이 양수가 아님: ' + afterStop.elapsed);
        }
        if (!afterStop.laps) {
          throw new Error('랩 추가 후 localStorage stopwatch:laps 누락 — saveLaps 호출 안 됨');
        }
        const lapsParsed = JSON.parse(afterStop.laps);
        if (!Array.isArray(lapsParsed) || lapsParsed.length !== 1) {
          throw new Error('stopwatch:laps 가 1건 배열이 아님: ' + afterStop.laps);
        }
        console.log('[step4] 정지 → 버튼 상태 + localStorage 영속 OK (elapsed=' + elapsedParsed + ')');

        // 4. 새로고침 → display 가 정지 시점 elapsed 로 복원, 랩 1건 복원
        await page.reload();
        await page.waitForSelector('#btn-start');
        const afterReload = await page.evaluate(() => ({
          m: document.getElementById('disp-m').textContent,
          s: document.getElementById('disp-s').textContent,
          x: document.getElementById('disp-x').textContent,
          lapCount: document.getElementById('lap-count').textContent,
          lapCardHidden: document.getElementById('lap-card').hidden,
          liCount: document.querySelectorAll('#lap-list li').length,
          resetDisabled: document.getElementById('btn-reset').disabled,
        }));
        if (!mmFmt.test(afterReload.m) || !mmFmt.test(afterReload.s) || !mmFmt.test(afterReload.x)) {
          throw new Error('새로고침 후 display 포맷 깨짐: ' + JSON.stringify(afterReload));
        }
        // 새로고침 후 display 의 elapsed (display 값으로 역산) 가 정지 시점과 정확히 일치
        const reloadMs =
          parseInt(afterReload.m, 10) * 60000 +
          parseInt(afterReload.s, 10) * 1000 +
          parseInt(afterReload.x, 10) * 10;
        // display 는 10ms 단위 절삭 표시 → elapsed 의 10ms floor 와 비교
        const expectedDispMs = Math.floor(elapsedParsed / 10) * 10;
        if (reloadMs !== expectedDispMs) {
          throw new Error(
            '새로고침 후 display ms (' + reloadMs +
            ') 가 저장된 elapsed (' + expectedDispMs + ') 와 불일치'
          );
        }
        if (afterReload.lapCardHidden !== false) {
          throw new Error('새로고침 후 lap-card 가 다시 hidden — 복원 실패');
        }
        if (afterReload.lapCount !== '1' || afterReload.liCount !== 1) {
          throw new Error('새로고침 후 랩 1건 복원 실패: ' + JSON.stringify(afterReload));
        }
        if (afterReload.resetDisabled) {
          throw new Error('새로고침 후 btn-reset 은 enabled 여야 함 (stopped 상태 복원)');
        }
        console.log('[step5] 새로고침 → display + 랩 1건 복원 OK');

        // 5. 리셋 → 빈 상태 (display 00:00.00, lap-card hidden, localStorage 비움)
        await page.click('#btn-reset');
        const afterReset = await page.evaluate(() => ({
          m: document.getElementById('disp-m').textContent,
          s: document.getElementById('disp-s').textContent,
          x: document.getElementById('disp-x').textContent,
          lapCardHidden: document.getElementById('lap-card').hidden,
          liCount: document.querySelectorAll('#lap-list li').length,
          elapsed: localStorage.getItem('stopwatch:elapsed'),
          laps: localStorage.getItem('stopwatch:laps'),
          startDisabled: document.getElementById('btn-start').disabled,
          resetDisabled: document.getElementById('btn-reset').disabled,
        }));
        if (afterReset.m !== '00' || afterReset.s !== '00' || afterReset.x !== '00') {
          throw new Error('리셋 후 display 가 00:00.00 이 아님: ' + JSON.stringify(afterReset));
        }
        if (afterReset.lapCardHidden !== true) {
          throw new Error('리셋 후 lap-card 가 hidden 이 아님');
        }
        if (afterReset.liCount !== 0) {
          throw new Error('리셋 후 #lap-list li 가 비어있지 않음: ' + afterReset.liCount);
        }
        if (afterReset.elapsed != null) {
          throw new Error('리셋 후 stopwatch:elapsed 가 제거되지 않음: ' + afterReset.elapsed);
        }
        if (afterReset.laps != null) {
          throw new Error('리셋 후 stopwatch:laps 가 제거되지 않음: ' + afterReset.laps);
        }
        if (afterReset.startDisabled) throw new Error('리셋 후 btn-start 가 enabled 여야 함');
        if (!afterReset.resetDisabled) throw new Error('리셋 후 btn-reset 은 disabled 여야 함 (idle+0)');
        console.log('[step6] 리셋 → 빈 상태 OK');

        // 6. cleanup
        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-419 AC1 시나리오 전체 PASS');
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
            "스톱워치 시작→1초→랩→정지→새로고침 복원→리셋 (BF-419 AC1)",
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
        `E2E AC1 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-1500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // E2E AC2 — 키보드 단축키 시나리오 (Space / L / Esc)
  // ─────────────────────────────────────────────────────────────
  test("BF-419 E2E AC2: 키보드 단축키 Space(시작/정지) · L(랩) · Esc(리셋)", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/stopwatch/`;
      const scriptText = `
        // 0. clean start
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#btn-start');

        // 단축키 listener 는 document.keydown 이고 input 요소 focus 시만 양보.
        // stopwatch 페이지엔 input 없으므로 body 어디서 보내도 OK. 명시적으로 body 클릭.
        await page.click('body');

        // 1. Space → 시작 (idle → running)
        await page.keyboard.press('Space');
        await new Promise((r) => setTimeout(r, 1100));
        const afterSpaceStart = await page.evaluate(() => ({
          startDisabled: document.getElementById('btn-start').disabled,
          stopDisabled: document.getElementById('btn-stop').disabled,
          lapDisabled: document.getElementById('btn-lap').disabled,
          s: document.getElementById('disp-s').textContent,
          x: document.getElementById('disp-x').textContent,
        }));
        if (!afterSpaceStart.startDisabled) throw new Error('Space 시작 후 btn-start 가 disabled 여야 함 (running)');
        if (afterSpaceStart.stopDisabled) throw new Error('Space 시작 후 btn-stop 은 enabled 여야 함');
        if (afterSpaceStart.lapDisabled) throw new Error('Space 시작 후 btn-lap 은 enabled 여야 함');
        const ms1 =
          parseInt(afterSpaceStart.s, 10) * 1000 +
          parseInt(afterSpaceStart.x, 10) * 10;
        if (ms1 < 500) {
          throw new Error('Space 시작 + 1초 후 display 가 500ms 미만 — 시작 안 됨: ' + JSON.stringify(afterSpaceStart));
        }
        console.log('[step1] Space → 시작 + 1초 진행 OK');

        // 2. L → 랩 추가 (running 중)
        await page.keyboard.press('l');
        const afterL = await page.evaluate(() => ({
          count: document.getElementById('lap-count').textContent,
          hidden: document.getElementById('lap-card').hidden,
          liCount: document.querySelectorAll('#lap-list li').length,
          // 여전히 running
          startDisabled: document.getElementById('btn-start').disabled,
          stopDisabled: document.getElementById('btn-stop').disabled,
        }));
        if (afterL.hidden !== false) throw new Error('L 후 lap-card hidden 이 false 가 아님');
        if (afterL.count !== '1') throw new Error('L 후 lap-count !== "1": ' + afterL.count);
        if (afterL.liCount !== 1) throw new Error('L 후 li 개수가 1 이 아님: ' + afterL.liCount);
        if (!afterL.startDisabled) throw new Error('L 누른 후에도 여전히 running 이어야 함');
        if (afterL.stopDisabled) throw new Error('L 누른 후에도 btn-stop 은 enabled 여야 함');
        console.log('[step2] L → 랩 1건 추가 + 여전히 running OK');

        // 3. Space → 정지 (running → stopped) — display 값 유지
        const dispBeforeStop = await page.evaluate(() => ({
          m: document.getElementById('disp-m').textContent,
          s: document.getElementById('disp-s').textContent,
          x: document.getElementById('disp-x').textContent,
        }));
        await page.keyboard.press('Space');
        // 정지 직후 display 변동 여부 확인 — 300ms 대기 후 display 가 그대로
        await new Promise((r) => setTimeout(r, 300));
        const afterSpaceStop = await page.evaluate(() => ({
          m: document.getElementById('disp-m').textContent,
          s: document.getElementById('disp-s').textContent,
          x: document.getElementById('disp-x').textContent,
          startDisabled: document.getElementById('btn-start').disabled,
          stopDisabled: document.getElementById('btn-stop').disabled,
          lapDisabled: document.getElementById('btn-lap').disabled,
          elapsed: localStorage.getItem('stopwatch:elapsed'),
        }));
        if (afterSpaceStop.startDisabled) throw new Error('Space 정지 후 btn-start 는 enabled 여야 함');
        if (!afterSpaceStop.stopDisabled) throw new Error('Space 정지 후 btn-stop 은 disabled 여야 함');
        if (!afterSpaceStop.lapDisabled) throw new Error('Space 정지 후 btn-lap 은 disabled 여야 함');
        // 정지 후 300ms 가 지나도 display 의 분/초 단위는 동일 (xx 만 정지 직전 마지막 tick 의 값으로 frozen)
        if (afterSpaceStop.m !== dispBeforeStop.m || afterSpaceStop.s !== dispBeforeStop.s) {
          // 분/초 단위가 바뀌었다면 tick 이 계속 돌고 있다는 뜻
          throw new Error(
            'Space 정지 후에도 display 분/초가 변함 — tick 미정지: before=' +
              JSON.stringify(dispBeforeStop) + ' after=' + JSON.stringify(afterSpaceStop)
          );
        }
        if (!afterSpaceStop.elapsed) throw new Error('Space 정지 후 stopwatch:elapsed 누락');
        console.log('[step3] Space → 정지 + tick 중단 + elapsed 영속 OK');

        // 4. Esc → 리셋 (stopped → idle, 빈 상태)
        await page.keyboard.press('Escape');
        const afterEsc = await page.evaluate(() => ({
          m: document.getElementById('disp-m').textContent,
          s: document.getElementById('disp-s').textContent,
          x: document.getElementById('disp-x').textContent,
          lapCardHidden: document.getElementById('lap-card').hidden,
          liCount: document.querySelectorAll('#lap-list li').length,
          elapsed: localStorage.getItem('stopwatch:elapsed'),
          laps: localStorage.getItem('stopwatch:laps'),
          startDisabled: document.getElementById('btn-start').disabled,
          resetDisabled: document.getElementById('btn-reset').disabled,
        }));
        if (afterEsc.m !== '00' || afterEsc.s !== '00' || afterEsc.x !== '00') {
          throw new Error('Esc 리셋 후 display 가 00:00.00 이 아님: ' + JSON.stringify(afterEsc));
        }
        if (afterEsc.lapCardHidden !== true) throw new Error('Esc 리셋 후 lap-card 가 hidden 이 아님');
        if (afterEsc.liCount !== 0) throw new Error('Esc 리셋 후 #lap-list li 가 비어있지 않음');
        if (afterEsc.elapsed != null) throw new Error('Esc 리셋 후 stopwatch:elapsed 잔존');
        if (afterEsc.laps != null) throw new Error('Esc 리셋 후 stopwatch:laps 잔존');
        if (afterEsc.startDisabled) throw new Error('Esc 리셋 후 btn-start 가 enabled 여야 함');
        if (!afterEsc.resetDisabled) throw new Error('Esc 리셋 후 btn-reset 은 disabled 여야 함');
        console.log('[step4] Esc → 리셋 빈 상태 OK');

        // cleanup
        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-419 AC2 키보드 단축키 시나리오 전체 PASS');
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
          label: "스톱워치 단축키 Space·L·Esc (BF-419 AC2)",
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
        `E2E AC2 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-1500)}`,
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
