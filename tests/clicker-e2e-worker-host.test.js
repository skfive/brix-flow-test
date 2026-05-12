// BF-445 · 클릭 카운터 SPA 실 브라우저 E2E 회귀 가드 (worker host)
//
// 본 파일은 BF-443 의 dev 산출물 (clicker/ 모듈) 이 main 에 들어간 후
// silent break 되지 않도록, e2e-runner 컨테이너로 worker host URL 에 접근해
// AC1 의 전체 사용자 시나리오 (클릭 5회 → 점수 5/best 5 → 리셋 → 전체 초기화
// 확인 모달 → 새로고침 복원) 와 AC6 의 console error 0건 회귀 가드를 직접
// 구동한다.
//
// 보호 대상 (BF-445 수용 기준):
//   AC1. 클릭 버튼 5회 클릭 → score-value "5" + best-score-value "5" +
//        localStorage clicker:score=5 + clicker:best=5.
//   AC2. ⟲ Reset 클릭 → score 0 (best 5 유지) + clicker:score 제거 (또는 "0") +
//        clicker:best=5 유지 + btn-reset 가 다시 disabled 로 전환.
//   AC3. ⌫ 전체 초기화 → 모달 노출 (modal-backdrop hidden=false · confirm focus) →
//        confirm 클릭 → score 0 + best 0 + 두 키 모두 제거 + 모달 닫힘.
//   AC4. 새로고침 후 score / best 가 localStorage 에서 그대로 복원
//        (AC1 종료 시점의 5/5 도 마찬가지로 복원되는지 사전 검증).
//   AC5. 키보드 Space (클릭) / R (리셋) / T (테마) 단축키 — main.js 의 document
//        .keydown listener fact 를 브라우저 인터랙션으로 확인.
//   AC6. 페이지 부팅 ~ 전체 시나리오 구간에서 console.error /
//        unhandledrejection / pageerror 0건 — file:// CORS 회귀 가드를 worker
//        host 환경에서도 보강.
//
// 작성 방침 (BF-440 / BF-434 패턴 준수):
//   - CI 결정성 (결함 14 / 19 회귀 방지) — BRIX_E2E_SKIP=1 또는 e2e-runner
//     도달 불가 시 t.skip(). assert.ok(reachable, ...) 같은 hookFail 패턴 금지.
//   - focused scope 정책: BRIX_TEST_MODULE 가 'clicker' 가 아니면 module 전체
//     skip — 자기 외 module (notepad / timer / stopwatch / kanban / pomodoro /
//     weather) 회귀 가드는 건드리지 않음.
//   - BRIX_PERSONA_HOST env 우선. compose 서비스 hostname 만 허용
//     (host.docker.internal / localhost 금지 — e2e-runner 는 다른 컨테이너).
//   - dev 의 clicker-storage / clicker-ui 테스트는 단위·정적 정규식 가드.
//     본 파일은 실 브라우저에서만 검증 가능한 인터랙션 + 인 페이지 console.error
//     / pageerror / unhandledrejection 0건 가드. dev 가 이미 검증한
//     storage API / DOM 마크업 fact / CSS 토큰 / file:// 안전 grep 은 재작성 X.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "clicker";
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
  // E2E AC1~AC5 — 통합 시나리오: 클릭 5회 → 점수 5/best 5 → Reset → 전체
  //               초기화 확인 모달 → 새로고침 복원 → 키보드 단축키
  //               (단일 e2e-runner 호출로 묶음 — 한 페이지 컨텍스트에서 누적)
  // ─────────────────────────────────────────────────────────────
  test("BF-445 E2E AC1~AC5: 클릭 5회→best 갱신→Reset→전체 초기화→새로고침 복원→키보드 단축키", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/clicker/`;
      // page.evaluate 내부 코드는 e2e-runner 의 puppeteer page 객체로 실행됨.
      // 따라서 함수 내부에서는 await page.* / new Promise / console.log 사용 가능.
      const scriptText = `
        // 0. clean — clicker: prefix + bf-theme 제거 후 reload (격리)
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('clicker:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        await page.reload();
        await page.waitForSelector('#btn-click');

        // 1. 초기 — score 0 (is-zero) / best 0 / reset·clear-all 모두 disabled
        const initial = await page.evaluate(() => ({
          score: document.getElementById('score-value').textContent,
          scoreHasIsZero: document.getElementById('score-value').classList.contains('is-zero'),
          best: document.getElementById('best-score-value').textContent,
          resetDisabled: document.getElementById('btn-reset').disabled,
          clearAllDisabled: document.getElementById('btn-clear-all').disabled,
          modalHidden: document.getElementById('modal-backdrop').hidden,
        }));
        if (initial.score !== '0') {
          throw new Error('초기 score-value 가 "0" 이 아님: ' + initial.score);
        }
        if (!initial.scoreHasIsZero) {
          throw new Error('초기 score-value 에 is-zero 클래스 누락');
        }
        if (initial.best !== '0') {
          throw new Error('초기 best-score-value 가 "0" 이 아님: ' + initial.best);
        }
        if (initial.resetDisabled !== true) {
          throw new Error('초기 btn-reset disabled 가 true 가 아님: ' + initial.resetDisabled);
        }
        if (initial.clearAllDisabled !== true) {
          throw new Error('초기 btn-clear-all disabled 가 true 가 아님: ' + initial.clearAllDisabled);
        }
        if (initial.modalHidden !== true) {
          throw new Error('초기 modal-backdrop 가 default 노출됨 (hidden=true 여야 함)');
        }
        console.log('[step1] 초기 0/0 + reset/clear disabled + modal hidden OK');

        // 2. 클릭 5회 — score 5 + best 5 (best 가 score 보다 작았으므로 동반 갱신)
        for (let i = 0; i < 5; i++) {
          await page.click('#btn-click');
          // press 시각 효과 150ms · 점수 pulse 220ms — 안전 마진 60ms
          await new Promise((r) => setTimeout(r, 60));
        }
        const afterClicks = await page.evaluate(() => ({
          score: document.getElementById('score-value').textContent,
          scoreHasIsZero: document.getElementById('score-value').classList.contains('is-zero'),
          best: document.getElementById('best-score-value').textContent,
          resetDisabled: document.getElementById('btn-reset').disabled,
          clearAllDisabled: document.getElementById('btn-clear-all').disabled,
          storedScore: localStorage.getItem('clicker:score'),
          storedBest: localStorage.getItem('clicker:best'),
        }));
        if (afterClicks.score !== '5') {
          throw new Error('클릭 5회 후 score-value 가 "5" 가 아님: ' + afterClicks.score);
        }
        if (afterClicks.scoreHasIsZero) {
          throw new Error('score=5 인데 is-zero 클래스가 남아있음');
        }
        if (afterClicks.best !== '5') {
          throw new Error('클릭 5회 후 best-score-value 가 "5" 가 아님: ' + afterClicks.best);
        }
        if (afterClicks.resetDisabled !== false) {
          throw new Error('score=5 인데 btn-reset 가 여전히 disabled');
        }
        if (afterClicks.clearAllDisabled !== false) {
          throw new Error('score/best=5 인데 btn-clear-all 가 여전히 disabled');
        }
        if (afterClicks.storedScore !== '5') {
          throw new Error('localStorage clicker:score !== "5": ' + afterClicks.storedScore);
        }
        if (afterClicks.storedBest !== '5') {
          throw new Error('localStorage clicker:best !== "5": ' + afterClicks.storedBest);
        }
        console.log('[step2] 클릭 5회 → score=5 + best=5 + localStorage 저장 OK');

        // 3. 새로고침 → score / best 모두 복원 (AC4)
        await page.reload();
        await page.waitForSelector('#btn-click');
        const afterReload1 = await page.evaluate(() => ({
          score: document.getElementById('score-value').textContent,
          best: document.getElementById('best-score-value').textContent,
          resetDisabled: document.getElementById('btn-reset').disabled,
          clearAllDisabled: document.getElementById('btn-clear-all').disabled,
        }));
        if (afterReload1.score !== '5') {
          throw new Error('새로고침 후 score 복원 실패: ' + afterReload1.score);
        }
        if (afterReload1.best !== '5') {
          throw new Error('새로고침 후 best 복원 실패: ' + afterReload1.best);
        }
        if (afterReload1.resetDisabled !== false) {
          throw new Error('새로고침 후 score=5 인데 btn-reset 가 disabled');
        }
        if (afterReload1.clearAllDisabled !== false) {
          throw new Error('새로고침 후 score/best=5 인데 btn-clear-all 가 disabled');
        }
        console.log('[step3] 새로고침 → score=5 + best=5 복원 OK (AC4)');

        // 4. ⟲ Reset → score 0 (best 5 유지) + btn-reset 다시 disabled (AC2)
        await page.click('#btn-reset');
        await new Promise((r) => setTimeout(r, 60));
        const afterReset = await page.evaluate(() => ({
          score: document.getElementById('score-value').textContent,
          scoreHasIsZero: document.getElementById('score-value').classList.contains('is-zero'),
          best: document.getElementById('best-score-value').textContent,
          resetDisabled: document.getElementById('btn-reset').disabled,
          clearAllDisabled: document.getElementById('btn-clear-all').disabled,
          storedScore: localStorage.getItem('clicker:score'),
          storedBest: localStorage.getItem('clicker:best'),
        }));
        if (afterReset.score !== '0') {
          throw new Error('Reset 후 score-value 가 "0" 이 아님: ' + afterReset.score);
        }
        if (!afterReset.scoreHasIsZero) {
          throw new Error('Reset 후 score-value 에 is-zero 클래스 누락');
        }
        if (afterReset.best !== '5') {
          throw new Error('Reset 후 best 가 5 유지되지 않음 (AC2 위반): ' + afterReset.best);
        }
        if (afterReset.resetDisabled !== true) {
          throw new Error('Reset 후 btn-reset 가 다시 disabled 가 아님');
        }
        if (afterReset.clearAllDisabled !== false) {
          throw new Error('best=5 인데 btn-clear-all 가 disabled (best 가 살아있으므로 활성)');
        }
        if (afterReset.storedScore !== '0') {
          throw new Error('Reset 후 localStorage clicker:score 가 "0" 이 아님: ' + afterReset.storedScore);
        }
        if (afterReset.storedBest !== '5') {
          throw new Error('Reset 후 localStorage clicker:best 가 5 유지되지 않음: ' + afterReset.storedBest);
        }
        console.log('[step4] Reset → score=0, best=5 유지 + reset disabled OK (AC2)');

        // 5. ⌫ 전체 초기화 → 모달 노출 (AC3 - 1) — backdrop hidden=false + confirm focus
        await page.click('#btn-clear-all');
        // requestAnimationFrame(focus) → 안전 마진 80ms
        await new Promise((r) => setTimeout(r, 80));
        const modalOpen = await page.evaluate(() => ({
          backdropHidden: document.getElementById('modal-backdrop').hidden,
          dialogRole: document.getElementById('modal-backdrop').getAttribute('role'),
          ariaModal: document.getElementById('modal-backdrop').getAttribute('aria-modal'),
          confirmFocused: document.activeElement?.id === 'modal-confirm',
          bodyText: document.getElementById('modal-body').textContent,
        }));
        if (modalOpen.backdropHidden !== false) {
          throw new Error('⌫ 클릭 후 modal-backdrop 가 노출되지 않음 (hidden=' + modalOpen.backdropHidden + ')');
        }
        if (modalOpen.dialogRole !== 'dialog') {
          throw new Error('modal-backdrop role !== "dialog": ' + modalOpen.dialogRole);
        }
        if (modalOpen.ariaModal !== 'true') {
          throw new Error('modal-backdrop aria-modal !== "true": ' + modalOpen.ariaModal);
        }
        if (!modalOpen.confirmFocused) {
          throw new Error('modal-confirm 가 focus 되지 않음 (rAF focus 실패)');
        }
        if (!modalOpen.bodyText || modalOpen.bodyText.trim().length === 0) {
          throw new Error('modal-body 텍스트가 비어있음');
        }
        console.log('[step5] ⌫ 클릭 → 확인 모달 노출 + confirm focus OK (AC3-1)');

        // 6. confirm 클릭 → score 0 + best 0 + 모달 닫힘 + localStorage 두 키 제거 (AC3 - 2)
        await page.click('#modal-confirm');
        await new Promise((r) => setTimeout(r, 80));
        const afterConfirm = await page.evaluate(() => ({
          score: document.getElementById('score-value').textContent,
          best: document.getElementById('best-score-value').textContent,
          backdropHidden: document.getElementById('modal-backdrop').hidden,
          resetDisabled: document.getElementById('btn-reset').disabled,
          clearAllDisabled: document.getElementById('btn-clear-all').disabled,
          // clearAll() 은 두 키를 removeItem — 즉 localStorage 에 두 키 자체가 없어야 함
          scoreKeyExists: localStorage.getItem('clicker:score') !== null,
          bestKeyExists: localStorage.getItem('clicker:best') !== null,
        }));
        if (afterConfirm.score !== '0') {
          throw new Error('confirm 후 score 가 "0" 이 아님: ' + afterConfirm.score);
        }
        if (afterConfirm.best !== '0') {
          throw new Error('confirm 후 best 가 "0" 이 아님 (AC3 위반): ' + afterConfirm.best);
        }
        if (afterConfirm.backdropHidden !== true) {
          throw new Error('confirm 후 modal-backdrop 가 닫히지 않음');
        }
        if (afterConfirm.resetDisabled !== true) {
          throw new Error('confirm 후 btn-reset 가 disabled 가 아님 (score=0)');
        }
        if (afterConfirm.clearAllDisabled !== true) {
          throw new Error('confirm 후 btn-clear-all 가 disabled 가 아님 (score/best=0)');
        }
        if (afterConfirm.scoreKeyExists) {
          throw new Error('confirm 후 localStorage clicker:score 키가 잔존 (clearAll removeItem 실패)');
        }
        if (afterConfirm.bestKeyExists) {
          throw new Error('confirm 후 localStorage clicker:best 키가 잔존 (clearAll removeItem 실패)');
        }
        console.log('[step6] confirm → score=0/best=0 + 모달 닫힘 + 키 제거 OK (AC3-2)');

        // 7. 새로고침 → 두 키 모두 default 0 으로 복원 (AC4 - 0/0 사이드)
        await page.reload();
        await page.waitForSelector('#btn-click');
        const afterReload2 = await page.evaluate(() => ({
          score: document.getElementById('score-value').textContent,
          best: document.getElementById('best-score-value').textContent,
          resetDisabled: document.getElementById('btn-reset').disabled,
          clearAllDisabled: document.getElementById('btn-clear-all').disabled,
        }));
        if (afterReload2.score !== '0') {
          throw new Error('초기화 후 새로고침 score !== "0": ' + afterReload2.score);
        }
        if (afterReload2.best !== '0') {
          throw new Error('초기화 후 새로고침 best !== "0": ' + afterReload2.best);
        }
        if (afterReload2.resetDisabled !== true) {
          throw new Error('초기화 후 새로고침 btn-reset disabled 가 아님');
        }
        if (afterReload2.clearAllDisabled !== true) {
          throw new Error('초기화 후 새로고침 btn-clear-all disabled 가 아님');
        }
        console.log('[step7] 새로고침 → 0/0 복원 OK (AC4)');

        // 8. 키보드 Space — 새로고침 직후 activeElement 는 body 이므로 별도 focus 이동
        //    불필요. (page.click('body') 는 body 의 중심 좌표를 클릭하는데, click 버튼이
        //    그 자리에 있어 score 가 의도치 않게 +1 누락되는 결함이 있음 — BF-445 회귀 사례.)
        for (let i = 0; i < 3; i++) {
          await page.keyboard.press(' ');
          await new Promise((r) => setTimeout(r, 60));
        }
        const afterKbdSpace = await page.evaluate(() => ({
          score: document.getElementById('score-value').textContent,
          best: document.getElementById('best-score-value').textContent,
        }));
        if (afterKbdSpace.score !== '3') {
          throw new Error('Space 단축키 3 회 후 score !== "3": ' + afterKbdSpace.score);
        }
        if (afterKbdSpace.best !== '3') {
          throw new Error('Space 단축키 3 회 후 best !== "3": ' + afterKbdSpace.best);
        }
        console.log('[step8] Space 단축키 3 회 → score=3, best=3 OK (AC5 Space)');

        // 9. 키보드 R — Reset 단축키 (AC5)
        await page.keyboard.press('r');
        await new Promise((r) => setTimeout(r, 60));
        const afterKbdR = await page.evaluate(() => ({
          score: document.getElementById('score-value').textContent,
          best: document.getElementById('best-score-value').textContent,
        }));
        if (afterKbdR.score !== '0') {
          throw new Error('R 단축키 후 score !== "0": ' + afterKbdR.score);
        }
        if (afterKbdR.best !== '3') {
          throw new Error('R 단축키 후 best 가 3 유지되지 않음: ' + afterKbdR.best);
        }
        console.log('[step9] R 단축키 → score=0, best=3 유지 OK (AC5 R)');

        // 10. 키보드 T — 테마 토글 (다크 → 라이트). bf-theme 박제 + data-theme 변경
        const beforeT = await page.evaluate(() => ({
          theme: document.documentElement.getAttribute('data-theme'),
          storedTheme: localStorage.getItem('bf-theme'),
        }));
        if (beforeT.theme !== 'dark') {
          throw new Error('초기 data-theme !== "dark": ' + beforeT.theme);
        }
        await page.keyboard.press('t');
        await new Promise((r) => setTimeout(r, 60));
        const afterT = await page.evaluate(() => ({
          theme: document.documentElement.getAttribute('data-theme'),
          storedTheme: localStorage.getItem('bf-theme'),
          themeBtnText: document.getElementById('theme-toggle').textContent.trim(),
        }));
        if (afterT.theme !== 'light') {
          throw new Error('T 단축키 후 data-theme !== "light": ' + afterT.theme);
        }
        if (afterT.storedTheme !== 'light') {
          throw new Error('T 단축키 후 localStorage bf-theme !== "light": ' + afterT.storedTheme);
        }
        // 다시 T → 다크 복귀
        await page.keyboard.press('T');
        await new Promise((r) => setTimeout(r, 60));
        const afterT2 = await page.evaluate(() => ({
          theme: document.documentElement.getAttribute('data-theme'),
          storedTheme: localStorage.getItem('bf-theme'),
        }));
        if (afterT2.theme !== 'dark') {
          throw new Error('T 단축키 두 번째 후 data-theme !== "dark": ' + afterT2.theme);
        }
        if (afterT2.storedTheme !== 'dark') {
          throw new Error('T 단축키 두 번째 후 localStorage bf-theme !== "dark": ' + afterT2.storedTheme);
        }
        console.log('[step10] T 단축키 → 다크↔라이트 토글 + bf-theme 박제 OK (AC5 T)');

        // 11. 모달 Esc 닫기 — clear-all 열고 Esc 로 cancel (state 변경 없이)
        // 먼저 클릭 1 회로 clear-all 활성화 (score/best 가 0/3 이라 clear-all 은 이미 활성 — best=3)
        // 현재 score=0, best=3. clearAllBtn 은 best=3 이라 활성.
        await page.click('#btn-clear-all');
        await new Promise((r) => setTimeout(r, 80));
        const modalOpen2 = await page.evaluate(() => ({
          backdropHidden: document.getElementById('modal-backdrop').hidden,
        }));
        if (modalOpen2.backdropHidden !== false) {
          throw new Error('두 번째 ⌫ 클릭 후 모달 노출 실패');
        }
        await page.keyboard.press('Escape');
        await new Promise((r) => setTimeout(r, 80));
        const modalAfterEsc = await page.evaluate(() => ({
          backdropHidden: document.getElementById('modal-backdrop').hidden,
          score: document.getElementById('score-value').textContent,
          best: document.getElementById('best-score-value').textContent,
        }));
        if (modalAfterEsc.backdropHidden !== true) {
          throw new Error('Esc 후 모달 닫히지 않음');
        }
        if (modalAfterEsc.score !== '0' || modalAfterEsc.best !== '3') {
          throw new Error('Esc cancel 후 state 가 변경됨 (보존 실패): score=' + modalAfterEsc.score + ', best=' + modalAfterEsc.best);
        }
        console.log('[step11] 모달 Esc cancel → 모달 닫힘 + state 보존 (best=3) OK');

        // 12. cleanup — focused scope 의 다른 시나리오 격리
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('clicker:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        console.log('[done] BF-445 E2E AC1~AC5 PASS');
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
            "클리커 클릭 5회→best 갱신→Reset→전체 초기화 모달→새로고침 복원→키보드 단축키 (BF-445 AC1~AC5)",
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
        `E2E AC1~AC5 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // E2E AC6 — 페이지 부팅~조작 console.error / unhandledrejection / page error 0건
  //           (file:// CORS 회귀 가드를 worker host 환경에서 보강)
  // ─────────────────────────────────────────────────────────────
  test("BF-445 E2E AC6: 페이지 부팅~전체 시나리오 console.error / unhandledrejection / pageerror 0건", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/clicker/`;
      // page.on('console') / page.on('pageerror') 의 외부 노출이 보장되지 않으므로
      // window.onerror / unhandledrejection 을 페이지 안에서 직접 hook 해 누적 후
      // 회수한다. console.error 도 wrap 으로 잡는다.
      const scriptText = `
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('clicker:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        await page.reload();
        await page.waitForSelector('#btn-click');

        // 1. 부팅 직후 error hook 설치 — 같은 페이지 context 안에서 이후 시나리오 누적
        await page.evaluate(() => {
          window.__clickerErrors = [];
          window.addEventListener('error', (e) => {
            window.__clickerErrors.push('error: ' + (e.message || String(e)));
          });
          window.addEventListener('unhandledrejection', (e) => {
            window.__clickerErrors.push(
              'unhandledrejection: ' + String(e.reason && e.reason.message ? e.reason.message : e.reason),
            );
          });
          const origErr = console.error.bind(console);
          console.error = function () {
            try {
              window.__clickerErrors.push(
                'console.error: ' + Array.from(arguments).map(String).join(' '),
              );
            } catch (_e) {
              // 무한 재귀 방지
            }
            return origErr.apply(console, arguments);
          };
        });

        // 2. 빈도 높은 흐름 — 클릭 10 회 + Reset + clear-all 모달 confirm +
        //    테마 토글 + 키보드 단축키
        for (let i = 0; i < 10; i++) {
          await page.click('#btn-click');
          await new Promise((r) => setTimeout(r, 30));
        }
        // Reset
        await page.click('#btn-reset');
        await new Promise((r) => setTimeout(r, 60));
        // 다시 5 회 클릭
        for (let i = 0; i < 5; i++) {
          await page.click('#btn-click');
          await new Promise((r) => setTimeout(r, 30));
        }
        // 전체 초기화 모달 — confirm
        await page.click('#btn-clear-all');
        await new Promise((r) => setTimeout(r, 80));
        await page.click('#modal-confirm');
        await new Promise((r) => setTimeout(r, 60));
        // 테마 토글 (다크 → 라이트 → 다크)
        await page.click('#theme-toggle');
        await new Promise((r) => setTimeout(r, 50));
        await page.click('#theme-toggle');
        await new Promise((r) => setTimeout(r, 50));
        // 키보드 Space 1 회 + R 1 회 + T 1 회 (AC6 — error 누적이 목적이라
        // score 값 자체는 검증 X. body click 은 click 버튼 hit 가능 → 생략.)
        await page.keyboard.press(' ');
        await new Promise((r) => setTimeout(r, 50));
        await page.keyboard.press('r');
        await new Promise((r) => setTimeout(r, 50));
        await page.keyboard.press('t');
        await new Promise((r) => setTimeout(r, 50));
        // 모달 Esc cancel 분기 — 점수 1 회 클릭으로 best 활성 → clear-all 모달 열고 Esc
        await page.keyboard.press('t'); // 다크 복귀
        await new Promise((r) => setTimeout(r, 50));
        await page.click('#btn-click');
        await new Promise((r) => setTimeout(r, 50));
        await page.click('#btn-clear-all');
        await new Promise((r) => setTimeout(r, 80));
        await page.keyboard.press('Escape');
        await new Promise((r) => setTimeout(r, 60));
        // 모달 cancel 버튼 click 분기 — 다시 열어서 cancel
        await page.click('#btn-clear-all');
        await new Promise((r) => setTimeout(r, 80));
        await page.click('#modal-cancel');
        await new Promise((r) => setTimeout(r, 60));
        // 모달 backdrop click 분기
        await page.click('#btn-clear-all');
        await new Promise((r) => setTimeout(r, 80));
        const box = await page.evaluate(() => {
          const bd = document.getElementById('modal-backdrop');
          const r = bd.getBoundingClientRect();
          return { x: r.left + 4, y: r.top + 4 };
        });
        await page.mouse.click(box.x, box.y);
        await new Promise((r) => setTimeout(r, 60));

        // 3. error 회수 — 0 건이어야 함
        const errs = await page.evaluate(() => window.__clickerErrors || []);
        if (errs.length > 0) {
          throw new Error(
            'console/page error 발생 (' + errs.length + '건): ' + errs.slice(0, 5).join(' | '),
          );
        }
        console.log('[ok] 전체 시나리오 console.error / unhandledrejection / pageerror 0건');

        // 4. cleanup
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('clicker:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        console.log('[done] BF-445 E2E AC6 PASS');
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
            "클리커 console.error / pageerror / unhandledrejection 0건 회귀 (BF-445 AC6)",
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
        `E2E AC6 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (BF-440 / BF-434 e2e-worker-host 패턴과 동일)
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
