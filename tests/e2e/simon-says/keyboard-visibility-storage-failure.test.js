// tests/e2e/simon-says/keyboard-visibility-storage-failure.test.js
// BF-951 · /phase18-games/simon-says 실 브라우저 E2E 회귀 가드 (테스터 소유)
//
// 관련: docs/design/simon-says-maintenance-BF-948.md(§5.2~5.6, 접근성·visibility·최고기록) ·
//       phase18-games/simon-says/{index.html,styles.css,logic.js,main.js,storage.js}(구현, BF-949).
// "reviewer pass 후 확정된 코드" 기준으로 다음 3개 시나리오를 실 브라우저(e2e-runner)로 구동한다:
//   1) 키보드 전용 조작 — 시작 → 입력 → 재시작 (마우스 click 0건)
//   2) 탭 visibility 일시정지 → 재개 (watch/input 양쪽, inputIndex 보존)
//   3) localStorage 접근 실패 모킹 → 게임 유지(무중단) + 콘솔 에러 0건
//
// ── 중복 금지 (dev/기존 tester 가 이미 커버 — 재작성 X) ──────────────────
//   tests/simon-says-BF937.test.js:
//     - 마크업 계약(패드 data-pad/data-key/aria-label, id="btn-start"/"btn-restart" 존재,
//       status/round-badge 골격), file:// 안전 가드, logic.js 순수 함수 전수.
//   tests/simon-says-BF949.test.js:
//     - storage.js(SimonStore) 단위 테스트 — 접근 실패/손상값 폴백(AC-C1~C5, Node 레벨 mock).
//     - .best-score chip 마크업/CSS, main.js 배선 존재(정적 regex — visibilitychange 훅·
//       status--paused·라운드 능동 공지·SimonStore 연동 "존재" 확인, 런타임 동작은 미검증).
//     - 파일 단위 localStorage 정책 가드.
//   tests/e2e/simon-says/round-progress-gameover-keyboard.test.js (BF-939):
//     - 시작(마우스)→정답(키보드 1건, 포커스 이동 검증)→라운드 진행→정답(마우스)→오답(마우스)→
//       게임 종료 마크업/문구. AC3-E2E(키보드=마우스 동등) 이미 커버.
//   → 본 파일은 위 항목을 정적으로도 실 브라우저로도 다시 검증하지 않는다. 여기서는
//     "키보드만으로 시작/재시작까지 전체 루프가 도는가", "탭이 숨겨진 동안 실제 타이머가
//     멈추고 재개 시 inputIndex 가 보존되는가", "localStorage 가 실제로 throw 할 때도
//     게임이 죽지 않는가"만 관찰한다(코드 로직 자체는 손대지 않음 — 관찰 전용).
//
// ── 본 파일이 보호하는 대상 (BF-951 AC) ───────────────────────────────────
//   AC1-E2E : 키보드만으로 시작 → 정답 입력 → (오답으로 종료 후) 재시작 → 재진행까지 된다.
//   AC2-E2E : watch/input 도중 탭이 숨겨지면 일시정지되고(타이머 정지), 복귀 시 멈춘 지점부터
//             재개된다 — 특히 input 단계에서는 inputIndex 가 보존되어 억울한 오답이 없다.
//   AC3-E2E : localStorage 접근이 실제로 throw 해도(getItem/setItem) 게임 진행·게임오버·재시작이
//             정상 동작하고 콘솔/페이지 에러가 발생하지 않는다.
//
// 결정론 확보 기법 (상태 전이 공식 재검증 아님 — 순수 E2E 타이밍 제어용, BF-939 와 동일):
//   page.addInitScript 으로 Math.random 을 고정값(0.05)으로 오버라이드한다.
//   main.js 의 `var rand = Math.random;` 이 스크립트 로드 시점 값을 캡처하므로
//   문서 스크립트가 실행되기 전(addInitScript, 이후 reload)에 걸어야 한다.
//   randomPad(rand) = PADS[floor(rand()*4)] 이므로 0.05 고정 시 확장 패드는 항상 green(idx0).
//
// 실행: node --test tests/e2e/simon-says/keyboard-visibility-storage-failure.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/e2e/simon-says/keyboard-visibility-storage-failure.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 simon-says 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "simon-says";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const MODULE_DIR = path.join(REPO_ROOT, "phase18-games", "simon-says");

function readModuleFile(name) {
  return fs.readFileSync(path.join(MODULE_DIR, name), "utf-8");
}

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ═══════════════════════════════════════════════════════════
  // §0. 정적 가드 — 본 E2E 스크립트가 직접 의존하는 selector/전제 (dev 미검증분만)
  //     BF937/BF949 는 id="btn-start"/"btn-restart" 존재만 확인했고, 그 요소가
  //     실제 <button> 태그(키보드 Enter/Space 네이티브 활성화 전제)인지는 미확인.
  // ═══════════════════════════════════════════════════════════
  test(
    "§0-1 index.html — btn-start/btn-restart 는 실제 <button> 요소 (키보드 Enter/Space 네이티브 활성화 전제)",
    () => {
      const html = readModuleFile("index.html");
      assert.match(
        html,
        /<button[^>]*id="btn-start"/,
        "btn-start 가 <button> 요소가 아님 — 키보드 Enter/Space 활성화 보장 안 됨",
      );
      assert.match(
        html,
        /<button[^>]*id="btn-restart"/,
        "btn-restart 가 <button> 요소가 아님 — 키보드 Enter/Space 활성화 보장 안 됨",
      );
    },
  );

  // ─────────────────────────────────────────────────────────────
  // 시나리오 1 (AC1-E2E): 키보드 전용 — 시작 → 정답 입력 → 오답(종료) → 재시작 → 재진행
  //   전체 과정에서 page.click() 를 단 한 번도 사용하지 않는다(마우스 0건).
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-951 E2E-1: /phase18-games/simon-says/ 키보드 전용 — 시작(Enter)→정답(숫자키)→오답(숫자키,종료)→재시작(Enter)→재진행",
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
        const url = `http://${selfHost}:${port}/phase18-games/simon-says/`;
        const scriptText = `
          const consoleErrors = [];
          page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });
          page.on('pageerror', (err) => {
            consoleErrors.push('pageerror: ' + (err && err.message ? err.message : String(err)));
          });

          await page.addInitScript(() => {
            Math.random = () => 0.05;
          });
          await page.reload();
          await page.waitForSelector('#btn-start', { timeout: 8000 });

          // ── STEP 1: 초기 렌더 round=0 ──
          const initialRound = await page.evaluate(
            () => document.querySelector('[data-role="round"]').textContent,
          );
          if (initialRound !== '0') {
            throw new Error('초기 라운드가 0 이 아님 — round=' + initialRound);
          }

          // ── STEP 2 (AC1-E2E): 키보드로 시작 — focus + Enter (click 미사용) ──
          await page.focus('#btn-start');
          await page.keyboard.press('Enter');
          const afterStart = await page.evaluate(() => ({
            round: document.querySelector('[data-role="round"]').textContent,
            statusClass: document.querySelector('.status').className,
          }));
          if (afterStart.round !== '1') {
            throw new Error('키보드 시작(Enter) 후 라운드가 1 이 아님 — round=' + afterStart.round);
          }
          if (afterStart.statusClass.indexOf('status--watch') === -1) {
            throw new Error('키보드 시작 후 watch 상태 클래스가 없음 — class="' + afterStart.statusClass + '"');
          }
          console.log('[step2] AC1-E2E OK — 키보드 Enter 로 시작, round=1 watch 진입');

          // ── STEP 3: round1 입력 대기 진입 ──
          await page.waitForFunction(
            () => document.querySelector('.status').textContent.includes('당신 차례'),
            { timeout: 5000 },
          );

          // ── STEP 4 (AC1-E2E): 키보드 숫자키로 정답(green=1) 입력 → round1 완주 ──
          await page.keyboard.press('1');
          const afterCorrect = await page.evaluate(() => ({
            round: document.querySelector('[data-role="round"]').textContent,
            statusText: document.querySelector('.status').textContent,
          }));
          if (afterCorrect.round !== '2') {
            throw new Error('키보드 정답 입력 후 라운드가 2 로 진행하지 않음 — round=' + afterCorrect.round);
          }
          console.log('[step4] AC1-E2E OK — 키보드 정답 입력으로 round 1->2 진행');

          // ── STEP 5: round2 입력 대기 재진입 ──
          await page.waitForFunction(
            () => document.querySelector('.status').textContent.includes('당신 차례'),
            { timeout: 8000 },
          );

          // ── STEP 6 (AC1-E2E): 키보드로 오답(red=2, 기대값 green) → 게임 종료 ──
          await page.keyboard.press('2');
          const gameover = await page.evaluate(() => ({
            statusText: document.querySelector('.status').textContent,
            statusClass: document.querySelector('.status').className,
            btnRestartDisabled: document.getElementById('btn-restart').disabled,
            btnStartDisabled: document.getElementById('btn-start').disabled,
          }));
          if (!gameover.statusText.includes('틀렸습니다')) {
            throw new Error('키보드 오답 입력 후 게임 종료 문구가 노출되지 않음 — status="' + gameover.statusText + '"');
          }
          if (gameover.statusClass.indexOf('status--fail') === -1) {
            throw new Error('키보드 오답 입력 후 fail 상태 클래스가 없음 — class="' + gameover.statusClass + '"');
          }
          if (gameover.btnRestartDisabled) {
            throw new Error('게임 종료 후 다시하기 버튼이 비활성 상태 — 키보드 재시작 불가');
          }
          console.log('[step6] AC1-E2E OK — 키보드 오답 입력으로 게임 종료(재시작 가능 상태)');

          // ── STEP 7 (AC1-E2E): 키보드로 재시작 — focus + Enter (click 미사용) ──
          await page.focus('#btn-restart');
          await page.keyboard.press('Enter');
          const afterRestart = await page.evaluate(() => ({
            round: document.querySelector('[data-role="round"]').textContent,
            statusClass: document.querySelector('.status').className,
            appClass: document.querySelector('.simon-app').className,
          }));
          if (afterRestart.round !== '1') {
            throw new Error('키보드 재시작(Enter) 후 라운드가 1 로 리셋되지 않음 — round=' + afterRestart.round);
          }
          if (afterRestart.statusClass.indexOf('status--watch') === -1) {
            throw new Error('키보드 재시작 후 watch 상태로 재진입하지 않음 — class="' + afterRestart.statusClass + '"');
          }
          if (afterRestart.appClass.indexOf('is-fail') !== -1) {
            throw new Error('키보드 재시작 후에도 is-fail 클래스가 남아있음 — class="' + afterRestart.appClass + '"');
          }
          console.log('[step7] AC1-E2E OK — 키보드 Enter 로 재시작, round=1 watch 재진입 + is-fail 해제');

          // ── STEP 8 (AC1-E2E): 재시작 후 실제 재진행 — 키보드 정답 입력으로 다시 라운드 진행 ──
          await page.waitForFunction(
            () => document.querySelector('.status').textContent.includes('당신 차례'),
            { timeout: 5000 },
          );
          await page.keyboard.press('1');
          const afterRestartPlay = await page.evaluate(
            () => document.querySelector('[data-role="round"]').textContent,
          );
          if (afterRestartPlay !== '2') {
            throw new Error('재시작 후 키보드 정답 입력이 라운드를 진행시키지 않음 — round=' + afterRestartPlay);
          }
          console.log('[step8] AC1-E2E OK — 재시작 후 키보드 입력으로 라운드 재진행(1->2) 확인');

          // ── STEP 9: 콘솔/페이지 에러 0건 ──
          if (consoleErrors.length > 0) {
            throw new Error('콘솔/페이지 에러 ' + consoleErrors.length + '건 발생: ' + consoleErrors.slice(0, 5).join(' | '));
          }

          console.log('[OK] BF-951 E2E-1: 키보드 전용(시작->정답->오답->재시작->재진행) 전체 통과, click 0건');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-951",
          },
          body: JSON.stringify({
            url,
            label: "Simon Says 키보드 전용 — 시작/정답/오답/재시작 [BF-951]",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `BF-951 E2E-1(키보드 전용) 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ─────────────────────────────────────────────────────────────
  // 시나리오 2 (AC2-E2E): 탭 visibility — watch/input 도중 숨김 → 일시정지 → 복귀 → 재개
  //   document.hidden/visibilityState 를 직접 오버라이드 + visibilitychange 디스패치로
  //   실제 탭 전환을 시뮬레이션한다(§5.3 코드가 리스닝하는 신호와 동일).
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-951 E2E-2: /phase18-games/simon-says/ 탭 숨김 중 watch/input 일시정지 → 복귀 시 재개(inputIndex 보존)",
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
        const url = `http://${selfHost}:${port}/phase18-games/simon-says/`;
        const scriptText = `
          const consoleErrors = [];
          page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });
          page.on('pageerror', (err) => {
            consoleErrors.push('pageerror: ' + (err && err.message ? err.message : String(err)));
          });

          async function hideTab() {
            await page.evaluate(() => {
              Object.defineProperty(document, 'hidden', { value: true, configurable: true });
              Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
              document.dispatchEvent(new Event('visibilitychange'));
            });
          }
          async function showTab() {
            await page.evaluate(() => {
              Object.defineProperty(document, 'hidden', { value: false, configurable: true });
              Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
              document.dispatchEvent(new Event('visibilitychange'));
            });
          }

          await page.addInitScript(() => {
            Math.random = () => 0.05;
          });
          await page.reload();
          await page.waitForSelector('#btn-start', { timeout: 8000 });

          // ── round1 완주 → round2(시퀀스 [green, green]) 진입 준비 ──
          await page.click('#btn-start');
          await page.waitForFunction(
            () => document.querySelector('.status').textContent.includes('당신 차례'),
            { timeout: 5000 },
          );
          await page.click('[data-pad="green"]'); // round1 완주 → round2 watch 예약(700ms 후 playSequence)

          // ── STEP A (AC2-E2E watch): round2 watch 시작 직후 즉시 탭 숨김 ──
          await page.waitForFunction(
            () => document.querySelector('.status').className.indexOf('status--watch') !== -1,
            { timeout: 3000 },
          );
          await hideTab();
          const pausedDuringWatch = await page.evaluate(() => ({
            statusClass: document.querySelector('.status').className,
            statusText: document.querySelector('.status').textContent,
          }));
          if (pausedDuringWatch.statusClass.indexOf('status--paused') === -1) {
            throw new Error('AC2-E2E 회귀: watch 중 탭 숨김 후 paused 상태 클래스가 없음 — class="' + pausedDuringWatch.statusClass + '"');
          }
          if (!pausedDuringWatch.statusText.includes('일시정지')) {
            throw new Error('AC2-E2E 회귀: watch 중 탭 숨김 후 일시정지 안내 문구가 없음 — status="' + pausedDuringWatch.statusText + '"');
          }
          console.log('[stepA] AC2-E2E OK — watch 중 탭 숨김 → paused 진입');

          // ── STEP B: 숨김 상태로 시퀀스 총 재생시간(약 1760ms)보다 오래 대기 → 타이머 정지 확인 ──
          await new Promise((r) => setTimeout(r, 2200));
          const stillPaused = await page.evaluate(() => ({
            statusClass: document.querySelector('.status').className,
            round: document.querySelector('[data-role="round"]').textContent,
          }));
          if (stillPaused.statusClass.indexOf('status--paused') === -1) {
            throw new Error('AC2-E2E 회귀: 숨김 유지 중인데 타이머가 계속 진행되어 paused 상태를 벗어남 — class="' + stillPaused.statusClass + '"(잔여 지연 미보존 의심)');
          }
          if (stillPaused.round !== '2') {
            throw new Error('AC2-E2E 회귀: 숨김 중 라운드 표시가 바뀜 — round=' + stillPaused.round);
          }
          console.log('[stepB] AC2-E2E OK — 숨김 유지 2.2s 경과해도 계속 paused(타이머 정지 확인)');

          // ── STEP C: 탭 복귀 → watch 문구 즉시 복원 + 재개(멈춘 지점부터) ──
          await showTab();
          const resumedWatch = await page.evaluate(() => ({
            statusClass: document.querySelector('.status').className,
            statusText: document.querySelector('.status').textContent,
          }));
          if (resumedWatch.statusClass.indexOf('status--watch') === -1) {
            throw new Error('AC2-E2E 회귀: 복귀 직후 watch 상태로 복원되지 않음 — class="' + resumedWatch.statusClass + '"');
          }
          if (!resumedWatch.statusText.includes('라운드 2')) {
            throw new Error('AC2-E2E 회귀: 복귀 직후 상태 문구에 라운드 정보가 없음 — status="' + resumedWatch.statusText + '"');
          }
          await page.waitForFunction(
            () => document.querySelector('.status').textContent.includes('당신 차례'),
            { timeout: 6000 },
          );
          const round2Ready = await page.evaluate(() => document.querySelector('[data-role="round"]').textContent);
          if (round2Ready !== '2') {
            throw new Error('AC2-E2E 회귀: 복귀 후 재개된 재생이 입력 대기로 이어지지 않음 — round=' + round2Ready);
          }
          console.log('[stepC] AC2-E2E OK — 탭 복귀 후 멈춘 지점부터 재개되어 입력 대기까지 정상 도달');

          // ── STEP D (AC2-E2E input, inputIndex 보존): 1번째 정답 입력 후 즉시 숨김 ──
          await page.click('[data-pad="green"]'); // sequence[0] 정답 → inputIndex=1, round2 유지(미완주)
          const afterFirstInput = await page.evaluate(() => document.querySelector('[data-role="round"]').textContent);
          if (afterFirstInput !== '2') {
            throw new Error('AC2-E2E 사전조건 실패: 1번째 정답 입력 후 라운드가 바뀜(미완주여야 함) — round=' + afterFirstInput);
          }
          await hideTab();
          const pausedDuringInput = await page.evaluate(() => ({
            statusClass: document.querySelector('.status').className,
            greenAriaDisabled: document.querySelector('[data-pad="green"]').getAttribute('aria-disabled'),
          }));
          if (pausedDuringInput.statusClass.indexOf('status--paused') === -1) {
            throw new Error('AC2-E2E 회귀: input 중 탭 숨김 후 paused 상태 클래스가 없음 — class="' + pausedDuringInput.statusClass + '"');
          }
          if (pausedDuringInput.greenAriaDisabled !== 'true') {
            throw new Error('AC2-E2E 회귀: input 중 탭 숨김 후 패드가 비활성화되지 않음(무시 입력 방지 실패) — aria-disabled=' + pausedDuringInput.greenAriaDisabled);
          }
          console.log('[stepD] AC2-E2E OK — input 중(1번째 정답 후) 탭 숨김 → paused + 패드 비활성');

          // ── STEP E (AC2-E2E, 핵심): 복귀 → 패드 재활성 + inputIndex 보존 확인 ──
          await showTab();
          const resumedInput = await page.evaluate(() => ({
            statusClass: document.querySelector('.status').className,
            statusText: document.querySelector('.status').textContent,
            greenAriaDisabled: document.querySelector('[data-pad="green"]').getAttribute('aria-disabled'),
          }));
          if (resumedInput.statusClass.indexOf('status--fail') !== -1) {
            throw new Error('AC2-E2E 회귀: 복귀 후 억울한 오답(게임 종료) 발생 — class="' + resumedInput.statusClass + '"');
          }
          if (!resumedInput.statusText.includes('당신 차례')) {
            throw new Error('AC2-E2E 회귀: 복귀 후 입력 대기 문구로 복원되지 않음 — status="' + resumedInput.statusText + '"');
          }
          if (resumedInput.greenAriaDisabled === 'true') {
            throw new Error('AC2-E2E 회귀: 복귀 후 패드가 재활성화되지 않음 — aria-disabled=' + resumedInput.greenAriaDisabled);
          }
          // 2번째(마지막) 정답 1회만 입력 — inputIndex 가 1로 보존되어 있어야 이 1회로 라운드 완주(round 2->3).
          // 만약 회귀로 inputIndex 가 0 으로 리셋됐다면 이 1회 입력으로는 미완주(round 는 2 에 머무름).
          await page.click('[data-pad="green"]');
          const afterResumeSecondInput = await page.evaluate(() => ({
            round: document.querySelector('[data-role="round"]').textContent,
            statusClass: document.querySelector('.status').className,
          }));
          if (afterResumeSecondInput.round !== '3') {
            throw new Error('AC2-E2E 회귀: inputIndex 미보존 의심 — 복귀 후 정답 1회로 라운드가 완주되지 않음(round=' + afterResumeSecondInput.round + ', 기대값 3)');
          }
          if (afterResumeSecondInput.statusClass.indexOf('status--success') === -1) {
            throw new Error('AC2-E2E 회귀: 라운드 완주 성공 상태 클래스가 없음 — class="' + afterResumeSecondInput.statusClass + '"');
          }
          console.log('[stepE] AC2-E2E OK — 복귀 후 inputIndex 보존 확인(정답 1회로 round 2->3 완주, 억울한 오답 없음)');

          // ── STEP F: 콘솔/페이지 에러 0건 ──
          if (consoleErrors.length > 0) {
            throw new Error('콘솔/페이지 에러 ' + consoleErrors.length + '건 발생: ' + consoleErrors.slice(0, 5).join(' | '));
          }

          console.log('[OK] BF-951 E2E-2: watch/input 양쪽 visibility 일시정지·재개(inputIndex 보존 포함) 전체 통과');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-951",
          },
          body: JSON.stringify({
            url,
            label: "Simon Says 탭 visibility 일시정지/재개(watch+input, inputIndex 보존) [BF-951]",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `BF-951 E2E-2(visibility) 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );

  // ─────────────────────────────────────────────────────────────
  // 시나리오 3 (AC3-E2E): localStorage 접근 실패 모킹 → 게임 유지(무중단)
  //   window.localStorage 를 getItem/setItem/removeItem 이 모두 throw 하는 객체로 교체해
  //   실제 브라우저 DOM 통합 경로(main.js → storage.js → 실제 localStorage)에서
  //   dev 단위 테스트(AC-C5, Node mock)와 동일한 방어가 실제로 동작하는지 관찰한다.
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-951 E2E-3: /phase18-games/simon-says/ localStorage 접근 실패(getItem/setItem throw)에도 게임 진행·종료·재시작 정상",
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
        const url = `http://${selfHost}:${port}/phase18-games/simon-says/`;
        const scriptText = `
          const consoleErrors = [];
          page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });
          page.on('pageerror', (err) => {
            consoleErrors.push('pageerror: ' + (err && err.message ? err.message : String(err)));
          });

          // ── STEP 0: localStorage 를 접근 실패 모킹(private mode/quota 유사) + 결정론 고정 ──
          await page.addInitScript(() => {
            Math.random = () => 0.05;
            Object.defineProperty(window, 'localStorage', {
              configurable: true,
              value: {
                getItem() { throw new Error('mock: storage blocked (private mode)'); },
                setItem() { throw new Error('mock: quota exceeded'); },
                removeItem() { throw new Error('mock: storage blocked'); },
              },
            });
          });
          await page.reload();
          await page.waitForSelector('#btn-start', { timeout: 8000 });

          // ── STEP 1 (AC3-E2E): 초기 렌더도 예외 없이 '기록 없음' 폴백 ──
          const initialBest = await page.evaluate(() => ({
            text: document.querySelector('[data-role="best-round"]').textContent,
            isEmpty: document.querySelector('[data-role="best-score"]').className.indexOf('is-empty') !== -1,
          }));
          if (!initialBest.text.includes('기록 없음')) {
            throw new Error('AC3-E2E 회귀: storage 접근 실패 시 초기 chip 이 "기록 없음" 폴백이 아님 — text="' + initialBest.text + '"');
          }
          if (!initialBest.isEmpty) {
            throw new Error('AC3-E2E 회귀: storage 접근 실패 시 chip 에 is-empty 클래스가 없음');
          }
          console.log('[step1] AC3-E2E OK — storage 접근 실패해도 초기 렌더가 "기록 없음" 폴백으로 정상 표시');

          // ── STEP 2: 게임 정상 진행 — round1 완주 → round2 진입 ──
          await page.click('#btn-start');
          await page.waitForFunction(
            () => document.querySelector('.status').textContent.includes('당신 차례'),
            { timeout: 5000 },
          );
          await page.click('[data-pad="green"]');
          await page.waitForFunction(
            () => document.querySelector('.status').textContent.includes('당신 차례'),
            { timeout: 8000 },
          );
          const round2 = await page.evaluate(() => document.querySelector('[data-role="round"]').textContent);
          if (round2 !== '2') {
            throw new Error('AC3-E2E 사전조건 실패: storage 실패 모킹 중 라운드 진행이 막힘 — round=' + round2);
          }
          console.log('[step2] AC3-E2E OK — storage 접근 실패 중에도 라운드 진행(1->2) 정상');

          // ── STEP 3 (AC3-E2E 핵심): 오답 입력 → 게임오버 시점에 최고기록 저장 시도(setItem throw) ──
          await page.click('[data-pad="red"]'); // 기대값 green — 오답
          const gameover = await page.evaluate(() => ({
            statusText: document.querySelector('.status').textContent,
            statusClass: document.querySelector('.status').className,
            bestText: document.querySelector('[data-role="best-round"]').textContent,
            btnRestartDisabled: document.getElementById('btn-restart').disabled,
          }));
          if (!gameover.statusText.includes('틀렸습니다')) {
            throw new Error('AC3-E2E 회귀: storage 실패 중 오답 입력 후 게임 종료 문구가 노출되지 않음(게임이 죽었을 가능성) — status="' + gameover.statusText + '"');
          }
          if (gameover.statusClass.indexOf('status--fail') === -1) {
            throw new Error('AC3-E2E 회귀: storage 실패 중 게임 종료 상태 클래스가 없음 — class="' + gameover.statusClass + '"');
          }
          if (gameover.statusText.includes('새 최고 기록')) {
            throw new Error('AC3-E2E 회귀: 저장이 실제로 실패했는데 "새 최고 기록" 문구가 노출됨 — status="' + gameover.statusText + '"');
          }
          if (!gameover.bestText.includes('기록 없음')) {
            throw new Error('AC3-E2E 회귀: 저장 실패 후에도 chip 이 "기록 없음" 폴백을 유지하지 않음 — text="' + gameover.bestText + '"');
          }
          if (gameover.btnRestartDisabled) {
            throw new Error('AC3-E2E 회귀: storage 실패 중 게임오버 후 재시작 버튼이 비활성 — 게임 진행 불가');
          }
          console.log('[step3] AC3-E2E OK — setItem throw 중에도 게임오버 정상 처리(무중단), 저장 실패는 조용히 폴백');

          // ── STEP 4 (AC3-E2E): 게임 유지 확인 — 저장 실패 이후에도 재시작이 실제로 다시 동작 ──
          await page.click('#btn-restart');
          await page.waitForFunction(
            () => document.querySelector('.status').textContent.includes('당신 차례'),
            { timeout: 5000 },
          );
          const restarted = await page.evaluate(() => document.querySelector('[data-role="round"]').textContent);
          if (restarted !== '1') {
            throw new Error('AC3-E2E 회귀: storage 실패 이후 재시작이 라운드를 1 로 리셋하지 않음 — round=' + restarted);
          }
          console.log('[step4] AC3-E2E OK — storage 실패 이후에도 재시작 후 재진행 정상(게임 완전 유지)');

          // ── STEP 5: 콘솔/페이지 에러 0건 (storage throw 가 상위로 새지 않았는지 최종 확인) ──
          if (consoleErrors.length > 0) {
            throw new Error('콘솔/페이지 에러 ' + consoleErrors.length + '건 발생(storage throw 가 상위로 누출됨): ' + consoleErrors.slice(0, 5).join(' | '));
          }

          console.log('[OK] BF-951 E2E-3: localStorage 접근 실패(getItem/setItem throw) 중에도 게임 무중단 전체 통과');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-951",
          },
          body: JSON.stringify({
            url,
            label: "Simon Says localStorage 접근 실패 모킹 — 게임 유지(무중단) [BF-951]",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `BF-951 E2E-3(storage 실패) 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (기존 e2e 가드와 동일 패턴 — tests/e2e/simon-says/round-progress-gameover-keyboard.test.js /
// tests/breakout/BF-933-e2e.test.js / tests/e2e/pong/render-play-touch.test.js 참고)
// ─────────────────────────────────────────────────────────────

/**
 * e2e-runner 도달성 확인. 못 닿으면 test.skip() 호출 후 false 반환.
 * (CI 환경에는 컨테이너 없음 — fail 처리하면 PR 자동 머지 트리거 안 됨.)
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
    process.env.BRIX_PERSONA_HOST ?? process.env.BRIX_WORKER_HOSTNAME ?? "worker"
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
