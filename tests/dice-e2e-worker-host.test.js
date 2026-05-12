// BF-450 · 주사위 SPA 실 브라우저 E2E 회귀 가드 (worker host)
//
// 본 파일은 BF-448 의 dev 산출물 (dice/ 모듈) 이 main 에 들어간 후 silent
// break 되지 않도록, e2e-runner 컨테이너로 worker host URL 에 접근해 작업 AC
// 의 전체 사용자 시나리오 (1~5 가변 굴림 → 통계 → 10건 cap 히스토리 → 행
// 클릭 재표시 → 전체 삭제 확인 모달 → 키보드 단축키 → 새로고침 복원) 와
// console error 0건 회귀 가드를 직접 구동한다.
//
// 보호 대상 (BF-450 수용 기준):
//   AC1. 1~5 개 가변 주사위 굴림 + 단일 굴림 통계 (sum / avg / max) 표시.
//   AC2. 굴림 결과는 최근 10건 history-list 에 compact row 로 누적 (cap 10).
//        11번째 push 시 가장 오래된 1건 잘림.
//   AC3. 히스토리 row 클릭 → dice-box / 통계 재표시 + active 강조 + diceCount
//        동기화 (옛 굴림의 개수에 맞춤).
//   AC4. ⌫ 전체 삭제 → 확인 모달 (modal-backdrop hidden=false + role=dialog +
//        confirm focus) → confirm 클릭 시 history-list 빈 상태 + 모달 닫힘 +
//        localStorage dice:history 제거.
//   AC5. 키보드 단축키: Space (굴리기) / 1~5 (개수 변경) / T (테마 토글) +
//        모달 열림 시 Esc cancel · Enter confirm.
//   AC6. 새로고침 후 history + diceCount + 가장 최근 굴림이 dice-box 와
//        통계에 그대로 복원.
//   AC7. 페이지 부팅 ~ 전체 시나리오 구간에서 console.error /
//        unhandledrejection / pageerror 0건 (file:// CORS 회귀 가드 보강).
//
// 작성 방침 (BF-440 / BF-445 패턴 준수):
//   - CI 결정성: BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 t.skip().
//     assert.ok(reachable, ...) 같은 hookFail 패턴 금지.
//   - focused scope 정책: BRIX_TEST_MODULE 가 'dice' 가 아니면 module 전체
//     skip — 자기 외 module (notepad / timer / stopwatch / kanban / pomodoro /
//     weather / clicker) 회귀 가드는 건드리지 않음.
//   - BRIX_PERSONA_HOST env 우선. compose 서비스 hostname 만 허용
//     (host.docker.internal / localhost 금지 — e2e-runner 는 다른 컨테이너).
//   - dev 의 dice-storage.test.js 가 storage 단위 contract 를 모두 검증.
//     본 파일은 **실 브라우저에서만 검증 가능한** 인터랙션 + pageerror 0건
//     가드. storage API / DOM 마크업 fact / CSS 토큰 / file:// 안전 grep 은
//     dev 가 책임지므로 재작성 X (A-tester 중복 차단).

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "dice";
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
  // E2E AC1~AC6 — 통합 시나리오: 1~5 가변 굴림 → 통계 → 10건 cap →
  //               행 클릭 재표시 → 전체 삭제 모달 → 키보드 단축 → 새로고침 복원
  //               (단일 e2e-runner 호출로 묶음 — 한 페이지 컨텍스트에서 누적)
  // ─────────────────────────────────────────────────────────────
  test("BF-450 E2E AC1~AC6: 1~5 가변 굴림→통계→cap 10→재표시→삭제 모달→키보드→새로고침 복원", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/dice/`;
      // page.evaluate 내부 코드는 e2e-runner 의 puppeteer page 객체로 실행됨.
      // 따라서 함수 내부에서는 await page.* / new Promise / console.log 사용 가능.
      // dice 굴림은 Math.random 의존 → 결과 값 정확 검증 X.
      // 대신 "rolls 가 1~6 정수 N 개" / "stat-sum 이 rolls 합과 일치" / "history.length
      // 가 누적과 일치" 같은 invariant 만 검증.
      const scriptText = `
        // 0. clean — dice: prefix + bf-theme 제거 후 reload (격리)
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('dice:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        await page.reload();
        await page.waitForSelector('#btn-roll');

        // 1. 초기 — dice-box 가 2개 placeholder (default diceCount=2) + 통계 '--' +
        //    clear-history disabled + history-empty 노출 + modal-backdrop hidden
        const initial = await page.evaluate(() => ({
          diceCells: document.querySelectorAll('#dice-box .dice').length,
          checkedCount: document.querySelector('.dice-count__btn[aria-checked="true"]')?.getAttribute('data-count'),
          statSum: document.getElementById('stat-sum').textContent,
          statAvg: document.getElementById('stat-avg').textContent,
          statMax: document.getElementById('stat-max').textContent,
          clearHistoryDisabled: document.getElementById('btn-clear-history').disabled,
          historyEmpty: !!document.getElementById('history-empty'),
          modalHidden: document.getElementById('modal-backdrop').hidden,
          theme: document.documentElement.getAttribute('data-theme'),
        }));
        if (initial.diceCells !== 2) {
          throw new Error('초기 dice-box 의 .dice 셀이 2개가 아님 (default diceCount=2): ' + initial.diceCells);
        }
        if (initial.checkedCount !== '2') {
          throw new Error('초기 aria-checked=true 의 data-count 가 "2" 가 아님: ' + initial.checkedCount);
        }
        if (initial.statSum !== '--' || initial.statAvg !== '--' || initial.statMax !== '--') {
          throw new Error('초기 통계가 -- 가 아님: sum=' + initial.statSum + ', avg=' + initial.statAvg + ', max=' + initial.statMax);
        }
        if (initial.clearHistoryDisabled !== true) {
          throw new Error('초기 btn-clear-history 가 disabled 가 아님');
        }
        if (!initial.historyEmpty) {
          throw new Error('초기 history-empty placeholder 누락');
        }
        if (initial.modalHidden !== true) {
          throw new Error('초기 modal-backdrop hidden 이 true 가 아님');
        }
        if (initial.theme !== 'dark') {
          throw new Error('초기 data-theme 이 "dark" 가 아님: ' + initial.theme);
        }
        console.log('[step1] 초기 — diceCount=2 / 통계 -- / clear disabled / 모달 hidden / 다크 OK');

        // 2. AC1 — 굴리기 1회 (default 2개). rolls 가 [1..6] 정수 2개여야 하고
        //    stat-sum 이 rolls 합과 일치 + history.length=1 + activeEntryId 강조.
        await page.click('#btn-roll');
        // 굴림 애니메이션 360ms + 안전 마진 100ms
        await new Promise((r) => setTimeout(r, 480));
        const afterRoll1 = await page.evaluate(() => {
          const cells = Array.from(document.querySelectorAll('#dice-box .dice'));
          const rollsLen = cells.length;
          const sum = parseInt(document.getElementById('stat-sum').textContent, 10);
          const avg = parseFloat(document.getElementById('stat-avg').textContent);
          const max = parseInt(document.getElementById('stat-max').textContent, 10);
          const hist = JSON.parse(localStorage.getItem('dice:history') || '[]');
          const histRows = document.querySelectorAll('#history-list .history-row').length;
          const activeRows = document.querySelectorAll('#history-list .history-row.is-active').length;
          return { rollsLen, sum, avg, max, histLen: hist.length, histHeadRollsLen: hist[0]?.rolls.length, histHeadRolls: hist[0]?.rolls, histRows, activeRows, clearDisabled: document.getElementById('btn-clear-history').disabled };
        });
        if (afterRoll1.rollsLen !== 2) {
          throw new Error('굴림 1회 후 dice 셀이 2개가 아님: ' + afterRoll1.rollsLen);
        }
        if (afterRoll1.histLen !== 1 || afterRoll1.histHeadRollsLen !== 2) {
          throw new Error('history 가 [2개 굴림] 1건이 아님: histLen=' + afterRoll1.histLen + ', headLen=' + afterRoll1.histHeadRollsLen);
        }
        // rolls 의 각 면이 1~6
        if (!afterRoll1.histHeadRolls.every((n) => Number.isInteger(n) && n >= 1 && n <= 6)) {
          throw new Error('굴림 결과가 1~6 정수가 아님: ' + JSON.stringify(afterRoll1.histHeadRolls));
        }
        // 통계: sum / avg / max 가 rolls 와 정합
        const expSum = afterRoll1.histHeadRolls.reduce((a, b) => a + b, 0);
        const expMax = Math.max.apply(null, afterRoll1.histHeadRolls);
        if (afterRoll1.sum !== expSum) {
          throw new Error('stat-sum 정합 위반: 실제=' + afterRoll1.sum + ', 기대=' + expSum);
        }
        if (afterRoll1.max !== expMax) {
          throw new Error('stat-max 정합 위반: 실제=' + afterRoll1.max + ', 기대=' + expMax);
        }
        if (Math.abs(afterRoll1.avg - expSum / 2) > 0.05) {
          throw new Error('stat-avg 정합 위반 (소수 1자리 ±0.05): 실제=' + afterRoll1.avg + ', 기대=' + (expSum / 2));
        }
        if (afterRoll1.histRows !== 1) {
          throw new Error('history-list .history-row 가 1건이 아님: ' + afterRoll1.histRows);
        }
        if (afterRoll1.activeRows !== 1) {
          throw new Error('굴림 직후 active row (is-active) 가 1건이 아님: ' + afterRoll1.activeRows);
        }
        if (afterRoll1.clearDisabled !== false) {
          throw new Error('굴림 1회 후 btn-clear-history 가 여전히 disabled');
        }
        console.log('[step2] 굴리기 1회 (2개) — sum/avg/max 정합 + history 1건 + active 강조 OK (AC1)');

        // 3. AC1 — 개수 5개로 변경 후 굴림. dice-box 가 5 셀로 변하고 stat-sum 정합.
        await page.click('.dice-count__btn[data-count="5"]');
        // 개수 변경 시 state.rolls=null → 통계 '--' 로 복귀
        await new Promise((r) => setTimeout(r, 60));
        const afterCount5 = await page.evaluate(() => ({
          diceCells: document.querySelectorAll('#dice-box .dice').length,
          statSum: document.getElementById('stat-sum').textContent,
          activeRows: document.querySelectorAll('#history-list .history-row.is-active').length,
        }));
        if (afterCount5.diceCells !== 5) {
          throw new Error('개수 5 변경 후 dice-box 셀이 5개가 아님: ' + afterCount5.diceCells);
        }
        if (afterCount5.statSum !== '--') {
          throw new Error('개수 변경 시 통계가 -- 로 복귀하지 않음: ' + afterCount5.statSum);
        }
        if (afterCount5.activeRows !== 0) {
          throw new Error('개수 변경 시 activeEntryId 해제 안 됨 (active row 가 남음)');
        }

        await page.click('#btn-roll');
        await new Promise((r) => setTimeout(r, 480));
        const afterRoll5 = await page.evaluate(() => {
          const hist = JSON.parse(localStorage.getItem('dice:history') || '[]');
          return {
            rollsLen: document.querySelectorAll('#dice-box .dice').length,
            sum: parseInt(document.getElementById('stat-sum').textContent, 10),
            histLen: hist.length,
            headLen: hist[0]?.rolls.length,
            headRolls: hist[0]?.rolls,
          };
        });
        if (afterRoll5.rollsLen !== 5 || afterRoll5.headLen !== 5) {
          throw new Error('5개 굴림 후 dice/head 길이가 5 가 아님: dice=' + afterRoll5.rollsLen + ', head=' + afterRoll5.headLen);
        }
        if (!afterRoll5.headRolls.every((n) => Number.isInteger(n) && n >= 1 && n <= 6)) {
          throw new Error('5개 굴림 결과가 1~6 정수가 아님: ' + JSON.stringify(afterRoll5.headRolls));
        }
        const exp5Sum = afterRoll5.headRolls.reduce((a, b) => a + b, 0);
        if (afterRoll5.sum !== exp5Sum) {
          throw new Error('5개 굴림 stat-sum 정합 위반: 실제=' + afterRoll5.sum + ', 기대=' + exp5Sum);
        }
        console.log('[step3] 개수 5 변경 → 5개 굴림 → sum 정합 OK (AC1 가변)');

        // 4. AC2 — 누적 12번 push (이미 2건 있으므로 10 회 더) → cap 10 + 가장 오래된 잘림
        const beforeIds = await page.evaluate(() => {
          const hist = JSON.parse(localStorage.getItem('dice:history') || '[]');
          return hist.map((e) => e.id);
        });
        for (let i = 0; i < 10; i++) {
          await page.click('#btn-roll');
          await new Promise((r) => setTimeout(r, 380));
        }
        const afterCap = await page.evaluate(() => {
          const hist = JSON.parse(localStorage.getItem('dice:history') || '[]');
          return {
            histLen: hist.length,
            ids: hist.map((e) => e.id),
            histRowCount: document.querySelectorAll('#history-list .history-row').length,
          };
        });
        if (afterCap.histLen !== 10) {
          throw new Error('누적 12 push 후 history.length 가 10 이 아님 (cap 위반): ' + afterCap.histLen);
        }
        if (afterCap.histRowCount !== 10) {
          throw new Error('history-list .history-row 가 10건이 아님: ' + afterCap.histRowCount);
        }
        // 가장 오래된 entry (beforeIds[0]) 가 잘려서 사라졌어야 함
        if (afterCap.ids.includes(beforeIds[0])) {
          throw new Error('cap 10 적용 시 가장 오래된 id(' + beforeIds[0] + ') 가 잘리지 않음: ' + afterCap.ids.join(','));
        }
        // 최신이 head (id 가 가장 큰 값)
        if (afterCap.ids[0] < afterCap.ids[afterCap.ids.length - 1]) {
          throw new Error('history 정렬이 최신순(내림차순)이 아님: ' + afterCap.ids.join(','));
        }
        console.log('[step4] 12 push → cap 10 + 오래된 1건 잘림 OK (AC2)');

        // 5. AC3 — 히스토리 row 클릭 재표시: 가장 오래된 row (마지막 row = 1개 굴림 흔적이
        //    살아있는지 확인). 5개 굴림 중 1건을 클릭하면 dice-box 가 그 굴림으로 재표시 +
        //    diceCount 가 그 굴림의 길이로 동기화.
        const rowMeta = await page.evaluate(() => {
          // 가장 마지막 row 의 id 와 rolls.length 추출
          const hist = JSON.parse(localStorage.getItem('dice:history') || '[]');
          const target = hist[hist.length - 1];
          return { id: target.id, rollsLen: target.rolls.length, rolls: target.rolls };
        });
        await page.click('#history-list .history-row:last-child');
        await new Promise((r) => setTimeout(r, 80));
        const afterReshow = await page.evaluate(() => {
          const cells = Array.from(document.querySelectorAll('#dice-box .dice'));
          const checkedBtn = document.querySelector('.dice-count__btn[aria-checked="true"]');
          const activeRow = document.querySelector('#history-list .history-row.is-active');
          return {
            cellCount: cells.length,
            checkedCount: checkedBtn?.getAttribute('data-count'),
            activeRowId: activeRow?.getAttribute('data-entry-id'),
            sum: parseInt(document.getElementById('stat-sum').textContent, 10),
          };
        });
        if (afterReshow.cellCount !== rowMeta.rollsLen) {
          throw new Error('재표시 후 dice 셀이 ' + rowMeta.rollsLen + '개가 아님: ' + afterReshow.cellCount);
        }
        if (afterReshow.checkedCount !== String(rowMeta.rollsLen)) {
          throw new Error('재표시 후 aria-checked 가 ' + rowMeta.rollsLen + '으로 동기화 안 됨: ' + afterReshow.checkedCount);
        }
        if (afterReshow.activeRowId !== String(rowMeta.id)) {
          throw new Error('재표시 row 의 is-active 가 id=' + rowMeta.id + ' 와 다름: ' + afterReshow.activeRowId);
        }
        const expReshowSum = rowMeta.rolls.reduce((a, b) => a + b, 0);
        if (afterReshow.sum !== expReshowSum) {
          throw new Error('재표시 후 stat-sum 정합 위반: 실제=' + afterReshow.sum + ', 기대=' + expReshowSum);
        }
        console.log('[step5] 히스토리 row 클릭 → dice 재표시 + diceCount 동기화 + active 강조 OK (AC3)');

        // 6. AC4 — ⌫ 전체 삭제 모달 → confirm → history 비고 modal 닫힘 + localStorage 제거
        await page.click('#btn-clear-history');
        // requestAnimationFrame(focus) 안전 마진
        await new Promise((r) => setTimeout(r, 100));
        const modalOpen = await page.evaluate(() => ({
          backdropHidden: document.getElementById('modal-backdrop').hidden,
          dialogRole: document.getElementById('modal-backdrop').getAttribute('role'),
          ariaModal: document.getElementById('modal-backdrop').getAttribute('aria-modal'),
          confirmFocused: document.activeElement?.id === 'modal-confirm',
          bodyText: document.getElementById('modal-body').textContent,
        }));
        if (modalOpen.backdropHidden !== false) {
          throw new Error('⌫ 클릭 후 modal-backdrop 노출 실패 (hidden=' + modalOpen.backdropHidden + ')');
        }
        if (modalOpen.dialogRole !== 'dialog' || modalOpen.ariaModal !== 'true') {
          throw new Error('모달 a11y 속성 누락: role=' + modalOpen.dialogRole + ', aria-modal=' + modalOpen.ariaModal);
        }
        if (!modalOpen.confirmFocused) {
          throw new Error('modal-confirm 가 focus 되지 않음 (rAF focus 실패)');
        }
        if (!/10건/.test(modalOpen.bodyText)) {
          throw new Error('모달 body 에 "10건" 안내 누락: ' + modalOpen.bodyText);
        }

        await page.click('#modal-confirm');
        await new Promise((r) => setTimeout(r, 100));
        const afterConfirm = await page.evaluate(() => ({
          backdropHidden: document.getElementById('modal-backdrop').hidden,
          histRowCount: document.querySelectorAll('#history-list .history-row').length,
          historyEmpty: !!document.getElementById('history-empty'),
          clearDisabled: document.getElementById('btn-clear-history').disabled,
          historyKey: localStorage.getItem('dice:history'),
          statSum: document.getElementById('stat-sum').textContent,
        }));
        if (afterConfirm.backdropHidden !== true) {
          throw new Error('confirm 후 모달 닫히지 않음');
        }
        if (afterConfirm.histRowCount !== 0) {
          throw new Error('confirm 후 history-row 가 잔존: ' + afterConfirm.histRowCount);
        }
        if (!afterConfirm.historyEmpty) {
          throw new Error('confirm 후 history-empty placeholder 누락');
        }
        if (afterConfirm.clearDisabled !== true) {
          throw new Error('confirm 후 btn-clear-history 가 disabled 가 아님');
        }
        // storage.clearHistory 는 dice:history 키를 removeItem (storage.js 의 contract)
        if (afterConfirm.historyKey !== null) {
          throw new Error('confirm 후 localStorage dice:history 키 잔존: ' + afterConfirm.historyKey);
        }
        if (afterConfirm.statSum !== '--') {
          throw new Error('confirm 후 통계가 -- 로 초기화 안 됨: ' + afterConfirm.statSum);
        }
        console.log('[step6] ⌫ 모달 → confirm → history 빈 상태 + 모달 닫힘 + localStorage 제거 OK (AC4)');

        // 7. AC5 — Space (굴리기 단축) + 1~5 (개수 단축) + T (테마 단축).
        //    Space 1회 → 굴림 (현재 diceCount 는 step5 에서 동기화된 값) → history 1건 추가.
        const beforeKbdLen = await page.evaluate(() => JSON.parse(localStorage.getItem('dice:history') || '[]').length);
        if (beforeKbdLen !== 0) {
          throw new Error('Space 단축 전 history 가 0 이 아님: ' + beforeKbdLen);
        }
        // body click 은 main.js 가 BUTTON 타겟이면 default click 발동 → 중복 방지하므로
        // 안전. 다만 click 버튼 자체에 click 이벤트 안 가도록 빈 영역 keydown 으로 처리.
        // page.keyboard.press(' ') 는 활성 element 에 keydown 발화.
        await page.keyboard.press(' ');
        await new Promise((r) => setTimeout(r, 480));
        const afterSpace = await page.evaluate(() => {
          const hist = JSON.parse(localStorage.getItem('dice:history') || '[]');
          return { histLen: hist.length, headLen: hist[0]?.rolls.length };
        });
        if (afterSpace.histLen !== 1) {
          throw new Error('Space 단축 후 history.length !== 1: ' + afterSpace.histLen);
        }
        // 개수 1 단축
        await page.keyboard.press('1');
        await new Promise((r) => setTimeout(r, 60));
        const after1 = await page.evaluate(() => ({
          checkedCount: document.querySelector('.dice-count__btn[aria-checked="true"]')?.getAttribute('data-count'),
          diceCells: document.querySelectorAll('#dice-box .dice').length,
        }));
        if (after1.checkedCount !== '1' || after1.diceCells !== 1) {
          throw new Error('1 단축 후 개수 1 동기화 실패: checked=' + after1.checkedCount + ', cells=' + after1.diceCells);
        }
        // 개수 5 단축
        await page.keyboard.press('5');
        await new Promise((r) => setTimeout(r, 60));
        const after5 = await page.evaluate(() => ({
          checkedCount: document.querySelector('.dice-count__btn[aria-checked="true"]')?.getAttribute('data-count'),
          diceCells: document.querySelectorAll('#dice-box .dice').length,
        }));
        if (after5.checkedCount !== '5' || after5.diceCells !== 5) {
          throw new Error('5 단축 후 개수 5 동기화 실패: checked=' + after5.checkedCount + ', cells=' + after5.diceCells);
        }
        // T 테마 토글 — 다크 → 라이트
        await page.keyboard.press('t');
        await new Promise((r) => setTimeout(r, 60));
        const afterT = await page.evaluate(() => ({
          theme: document.documentElement.getAttribute('data-theme'),
          storedTheme: localStorage.getItem('bf-theme'),
        }));
        if (afterT.theme !== 'light' || afterT.storedTheme !== 'light') {
          throw new Error('T 단축 후 라이트 토글 실패: theme=' + afterT.theme + ', stored=' + afterT.storedTheme);
        }
        // 다시 T → 다크 복귀
        await page.keyboard.press('t');
        await new Promise((r) => setTimeout(r, 60));
        const afterT2 = await page.evaluate(() => ({
          theme: document.documentElement.getAttribute('data-theme'),
          storedTheme: localStorage.getItem('bf-theme'),
        }));
        if (afterT2.theme !== 'dark' || afterT2.storedTheme !== 'dark') {
          throw new Error('T 단축 2회 후 다크 복귀 실패: theme=' + afterT2.theme);
        }
        console.log('[step7] Space → 굴림 + 1/5 → 개수 단축 + T → 테마 토글 OK (AC5)');

        // 8. AC5 — 모달 Esc cancel (state 변경 X) — 현재 history 1 건 있음 → clear 활성
        await page.click('#btn-clear-history');
        await new Promise((r) => setTimeout(r, 100));
        const modalOpen2 = await page.evaluate(() => document.getElementById('modal-backdrop').hidden);
        if (modalOpen2 !== false) {
          throw new Error('두 번째 ⌫ 클릭 후 모달 노출 실패');
        }
        await page.keyboard.press('Escape');
        await new Promise((r) => setTimeout(r, 80));
        const afterEsc = await page.evaluate(() => ({
          backdropHidden: document.getElementById('modal-backdrop').hidden,
          histLen: JSON.parse(localStorage.getItem('dice:history') || '[]').length,
        }));
        if (afterEsc.backdropHidden !== true) {
          throw new Error('Esc 후 모달 닫히지 않음');
        }
        if (afterEsc.histLen !== 1) {
          throw new Error('Esc cancel 후 history 가 변경됨: ' + afterEsc.histLen);
        }
        console.log('[step8] 모달 Esc cancel → 모달 닫힘 + state 보존 OK (AC5 모달)');

        // 9. AC6 — 새로고침 → history + diceCount + head 굴림 dice-box 복원
        const beforeReload = await page.evaluate(() => {
          const hist = JSON.parse(localStorage.getItem('dice:history') || '[]');
          return {
            count: parseInt(localStorage.getItem('dice:count') || '2', 10),
            histLen: hist.length,
            headRolls: hist[0]?.rolls,
            headSum: hist[0]?.sum,
          };
        });
        await page.reload();
        await page.waitForSelector('#btn-roll');
        await new Promise((r) => setTimeout(r, 80));
        const afterReload = await page.evaluate(() => {
          const cells = Array.from(document.querySelectorAll('#dice-box .dice')).map((el) => el.textContent);
          return {
            cellCount: cells.length,
            cells,
            checkedCount: document.querySelector('.dice-count__btn[aria-checked="true"]')?.getAttribute('data-count'),
            statSum: parseInt(document.getElementById('stat-sum').textContent, 10),
            histRowCount: document.querySelectorAll('#history-list .history-row').length,
            activeRows: document.querySelectorAll('#history-list .history-row.is-active').length,
            theme: document.documentElement.getAttribute('data-theme'),
          };
        });
        // 새로고침 후 dice-box 가 head 의 rolls 길이로 복원
        if (afterReload.cellCount !== beforeReload.headRolls.length) {
          throw new Error('새로고침 후 dice 셀 복원 실패: ' + afterReload.cellCount + ' vs ' + beforeReload.headRolls.length);
        }
        if (afterReload.checkedCount !== String(beforeReload.headRolls.length)) {
          throw new Error('새로고침 후 diceCount 복원 실패: ' + afterReload.checkedCount + ' vs ' + beforeReload.headRolls.length);
        }
        if (afterReload.statSum !== beforeReload.headSum) {
          throw new Error('새로고침 후 stat-sum 복원 실패: ' + afterReload.statSum + ' vs ' + beforeReload.headSum);
        }
        if (afterReload.histRowCount !== beforeReload.histLen) {
          throw new Error('새로고침 후 history row 개수 복원 실패: ' + afterReload.histRowCount + ' vs ' + beforeReload.histLen);
        }
        if (afterReload.activeRows !== 1) {
          throw new Error('새로고침 후 head 굴림이 active row 로 강조되지 않음: ' + afterReload.activeRows);
        }
        // bf-theme 새로고침 복원
        if (afterReload.theme !== 'dark') {
          throw new Error('새로고침 후 theme 복원 실패: ' + afterReload.theme);
        }
        console.log('[step9] 새로고침 → history/diceCount/head 굴림/통계/테마 모두 복원 OK (AC6)');

        // 10. cleanup — focused scope 의 다른 시나리오 격리
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('dice:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        console.log('[done] BF-450 E2E AC1~AC6 PASS');
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
            "주사위 1~5 가변 굴림→통계→cap 10→재표시→삭제 모달→키보드→새로고침 복원 (BF-450 AC1~AC6)",
          scriptText,
          timeoutMs: 120000,
        }),
      });
      const json = await res.json();
      assert.ok(
        json.ok,
        `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
      );
      assert.ok(
        json.passed,
        `E2E AC1~AC6 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // E2E AC7 — 페이지 부팅~조작 console.error / unhandledrejection / page error 0건
  //           (file:// CORS 회귀 가드를 worker host 환경에서 보강)
  // ─────────────────────────────────────────────────────────────
  test("BF-450 E2E AC7: 페이지 부팅~전체 시나리오 console.error / unhandledrejection / pageerror 0건", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/dice/`;
      const scriptText = `
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('dice:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        await page.reload();
        await page.waitForSelector('#btn-roll');

        // 1. 부팅 직후 error hook 설치
        await page.evaluate(() => {
          window.__diceErrors = [];
          window.addEventListener('error', (e) => {
            window.__diceErrors.push('error: ' + (e.message || String(e)));
          });
          window.addEventListener('unhandledrejection', (e) => {
            window.__diceErrors.push(
              'unhandledrejection: ' + String(e.reason && e.reason.message ? e.reason.message : e.reason),
            );
          });
          const origErr = console.error.bind(console);
          console.error = function () {
            try {
              window.__diceErrors.push(
                'console.error: ' + Array.from(arguments).map(String).join(' '),
              );
            } catch (_e) {
              // 무한 재귀 방지
            }
            return origErr.apply(console, arguments);
          };
        });

        // 2. 빈도 높은 흐름 — 개수 변경 + 굴림 + 재표시 + 삭제 모달 confirm + 테마 토글 + 키보드
        // 개수 1 / 3 / 5 변경 각각 굴림
        for (const n of ['1', '3', '5']) {
          await page.click('.dice-count__btn[data-count="' + n + '"]');
          await new Promise((r) => setTimeout(r, 40));
          await page.click('#btn-roll');
          await new Promise((r) => setTimeout(r, 420));
        }
        // 행 클릭 재표시 (가장 오래된 row)
        await page.click('#history-list .history-row:last-child');
        await new Promise((r) => setTimeout(r, 60));
        // 추가 굴림 11 회 → cap 10 진입
        for (let i = 0; i < 11; i++) {
          await page.click('#btn-roll');
          await new Promise((r) => setTimeout(r, 380));
        }
        // 삭제 모달 — backdrop click cancel 분기
        await page.click('#btn-clear-history');
        await new Promise((r) => setTimeout(r, 100));
        const box = await page.evaluate(() => {
          const bd = document.getElementById('modal-backdrop');
          const r = bd.getBoundingClientRect();
          return { x: r.left + 4, y: r.top + 4 };
        });
        await page.mouse.click(box.x, box.y);
        await new Promise((r) => setTimeout(r, 80));
        // 다시 열고 cancel 버튼 click
        await page.click('#btn-clear-history');
        await new Promise((r) => setTimeout(r, 100));
        await page.click('#modal-cancel');
        await new Promise((r) => setTimeout(r, 80));
        // 다시 열고 Enter confirm
        await page.click('#btn-clear-history');
        await new Promise((r) => setTimeout(r, 100));
        await page.keyboard.press('Enter');
        await new Promise((r) => setTimeout(r, 80));
        // 테마 토글
        await page.click('#theme-toggle');
        await new Promise((r) => setTimeout(r, 40));
        await page.click('#theme-toggle');
        await new Promise((r) => setTimeout(r, 40));
        // 키보드 Space / 1~5 / T
        await page.keyboard.press(' ');
        await new Promise((r) => setTimeout(r, 420));
        await page.keyboard.press('2');
        await new Promise((r) => setTimeout(r, 40));
        await page.keyboard.press('t');
        await new Promise((r) => setTimeout(r, 40));
        await page.keyboard.press('t');
        await new Promise((r) => setTimeout(r, 40));

        // 3. error 회수 — 0 건
        const errs = await page.evaluate(() => window.__diceErrors || []);
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
            if (k && (k.startsWith('dice:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        console.log('[done] BF-450 E2E AC7 PASS');
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
            "주사위 console.error / pageerror / unhandledrejection 0건 회귀 (BF-450 AC7)",
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
        `E2E AC7 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (BF-440 / BF-445 e2e-worker-host 패턴과 동일)
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
