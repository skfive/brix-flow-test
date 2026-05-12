// BF-429 · 칸반 보드 SPA 실 브라우저 E2E 회귀 가드 (worker host)
//
// 본 파일은 BF-427 의 dev 산출물 (kanban/ 모듈) 이 main 에 들어간 후
// silent break 되지 않도록, e2e-runner 컨테이너로 worker host URL 에 접근해
// 카드 lifecycle + DnD + 테마 + 새로고침 복원 시나리오를 직접 구동한다.
//
// 보호 대상 (BF-429 수용 기준):
//   AC1. /kanban → 카드 "우유 사기" 입력 → 추가 → To Do
//        → To Do→In Progress 드래그 → 새로고침 → 복원 확인
//        → 편집 진입 "우유 + 빵 사기" → 저장 → Done 드래그
//        → × 삭제 → 빈 상태 안내 ("카드가 없습니다…") 노출
//   AC2. 테마 다크 default → 라이트 토글 → 새로고침 후에도 라이트 유지
//        + localStorage `bf-theme=light` 박제
//   AC3. focused scope · BRIX_TEST_MODULE !== 'kanban' 일 땐 module 전체 skip
//        (notepad/timer/palette/stopwatch 등 다른 SPA 회귀 가드와 분리)
//
// 작성 방침:
//   - CI 결정성 (결함 14/19 회귀 방지) — BRIX_E2E_SKIP=1 또는 도달 불가 시 t.skip().
//     assert.ok(reachable, …) 같은 hookFail 유발 패턴 금지.
//   - HTML5 native DnD 는 playwright mouse drag 로는 dragstart/drop 이벤트가
//     발화되지 않는 케이스가 있어 page.evaluate 안에서 DragEvent 를 직접
//     dispatch 한다 (drag.js 의 dragstart→drop 경로를 그대로 통과).
//   - 카드 편집은 dblclick (kanban/main.js renderCard 의 listener) 으로 진입.
//   - BRIX_PERSONA_HOST env 우선. compose 서비스 hostname 만 허용
//     (host.docker.internal / localhost 금지 — e2e-runner 는 다른 컨테이너).

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "kanban";
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
  // E2E AC1 — 카드 lifecycle (추가 → 드래그 → 새로고침 복원 → 편집 → 드래그 → 삭제 → 빈 상태)
  // ─────────────────────────────────────────────────────────────
  test("BF-429 E2E AC1: 카드 lifecycle (추가→드래그→복원→편집→드래그→삭제→빈 상태)", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/kanban/`;
      const scriptText = `
        // 0. clean start — kanban: prefix + bf-theme 까지 깔끔히 초기화
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('kanban:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        await page.reload();
        await page.waitForSelector('#btn-add-global');

        // 초기 — 3컬럼 모두 비어있고 column-empty 안내가 노출되어야 함 (kanban/main.js renderColumn).
        const initial = await page.evaluate(() => {
          const cols = ['todo', 'in-progress', 'done'].map((id) => {
            const sec = document.querySelector(\`.column[data-column-id="\${id}"]\`);
            return {
              id,
              found: !!sec,
              empty: sec ? !!sec.querySelector('.column-empty') : null,
              count: sec ? sec.querySelector('.count-badge')?.textContent : null,
              cardCount: sec ? sec.querySelectorAll('.card').length : null,
            };
          });
          return cols;
        });
        for (const col of initial) {
          if (!col.found) throw new Error('컬럼 미렌더: ' + col.id);
          if (!col.empty) throw new Error('초기 ' + col.id + ' 컬럼에 column-empty 안내 누락');
          if (col.count !== '0') throw new Error('초기 ' + col.id + ' count-badge 가 "0" 이 아님: ' + col.count);
          if (col.cardCount !== 0) throw new Error('초기 ' + col.id + ' 카드 개수가 0 이 아님: ' + col.cardCount);
        }
        console.log('[step1] 초기 빈 보드 + 3컬럼 column-empty 안내 OK');

        // 1. 글로벌 + 카드 버튼 클릭 → TO DO 컬럼에 인라인 form 열림
        await page.click('#btn-add-global');
        await page.waitForSelector('.column[data-column-id="todo"] .column-add-form__input', { timeout: 3000 });
        // form 은 TO DO 컬럼에만 열려야 함 (단일 활성)
        const formCount = await page.evaluate(
          () => document.querySelectorAll('.column-add-form').length
        );
        if (formCount !== 1) throw new Error('인라인 add form 이 1개가 아님: ' + formCount);
        const formCol = await page.evaluate(() => {
          const f = document.querySelector('.column-add-form');
          return f ? f.closest('.column')?.getAttribute('data-column-id') : null;
        });
        if (formCol !== 'todo') throw new Error('add form 이 TO DO 컬럼이 아닌 ' + formCol + ' 에 열림');
        console.log('[step2] + 카드 → TO DO 인라인 form 1개 활성 OK');

        // 2. "우유 사기" 입력 → 추가 → TO DO 에 카드 1건
        await page.type('.column[data-column-id="todo"] .column-add-form__input', '우유 사기');
        // 추가 버튼 — column-add-form__actions 안의 첫 .btn--primary
        await page.click('.column[data-column-id="todo"] .column-add-form__actions .btn--primary');
        await page.waitForFunction(
          () => document.querySelectorAll('.column[data-column-id="todo"] .card').length === 1,
          { timeout: 3000 }
        );
        const afterAdd = await page.evaluate(() => {
          const card = document.querySelector('.column[data-column-id="todo"] .card');
          return {
            cardId: card?.getAttribute('data-card-id'),
            title: card?.querySelector('.card__title')?.textContent,
            todoCount: document.querySelector('.column[data-column-id="todo"] .count-badge')?.textContent,
            todoEmpty: !!document.querySelector('.column[data-column-id="todo"] .column-empty'),
            // localStorage 영속 확인
            storedRaw: (() => {
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('kanban:') && k !== 'kanban:__order__') {
                  return { key: k, val: localStorage.getItem(k) };
                }
              }
              return null;
            })(),
            order: localStorage.getItem('kanban:__order__'),
          };
        });
        if (!afterAdd.cardId) throw new Error('추가 후 카드 data-card-id 누락');
        if (afterAdd.title !== '우유 사기') throw new Error('카드 제목 mismatch: ' + afterAdd.title);
        if (afterAdd.todoCount !== '1') throw new Error('추가 후 TO DO count-badge !== "1": ' + afterAdd.todoCount);
        if (afterAdd.todoEmpty) throw new Error('추가 후에도 TO DO column-empty 가 남아있음');
        if (!afterAdd.storedRaw) throw new Error('localStorage 에 kanban:<ulid> entry 누락');
        const storedCard = JSON.parse(afterAdd.storedRaw.val);
        if (storedCard.title !== '우유 사기' || storedCard.id !== afterAdd.cardId) {
          throw new Error('localStorage 카드 본문 mismatch: ' + afterAdd.storedRaw.val);
        }
        if (!afterAdd.order) throw new Error('localStorage kanban:__order__ 누락');
        const parsedOrder = JSON.parse(afterAdd.order);
        if (!parsedOrder.todo || parsedOrder.todo[0] !== afterAdd.cardId) {
          throw new Error('order.todo 에 신규 카드 id 가 prepend 되지 않음: ' + afterAdd.order);
        }
        const CARD_ID = afterAdd.cardId;
        console.log('[step3] 카드 "우유 사기" 추가 → TO DO 1건 + localStorage 영속 OK (id=' + CARD_ID + ')');

        // 3. TO DO → IN PROGRESS 드래그 (HTML5 DragEvent dispatch — drag.js 경로 그대로)
        //    playwright page.evaluate 는 단일 인자만 받음 → 객체로 묶어서 전달
        const dragOk = await page.evaluate(({ cardId, toColumn }) => {
          const card = document.querySelector(\`.card[data-card-id="\${cardId}"]\`);
          const col = document.querySelector(\`.column[data-column-id="\${toColumn}"]\`);
          if (!card || !col) return { ok: false, reason: 'source/target 미발견' };
          const dt = new DataTransfer();
          card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
          col.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
          col.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
          // clientY 를 컬럼 하단 바깥으로 — computeDropIndex 가 cards.length 반환 (빈 컬럼이면 0)
          col.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: 99999 }));
          card.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
          return { ok: true };
        }, { cardId: CARD_ID, toColumn: 'in-progress' });
        if (!dragOk.ok) throw new Error('드래그 dispatch 실패: ' + JSON.stringify(dragOk));
        await page.waitForFunction(
          () => document.querySelectorAll('.column[data-column-id="in-progress"] .card').length === 1,
          { timeout: 3000 }
        );
        const afterDrag = await page.evaluate(() => ({
          todoCount: document.querySelector('.column[data-column-id="todo"] .count-badge')?.textContent,
          inprogCount: document.querySelector('.column[data-column-id="in-progress"] .count-badge')?.textContent,
          inprogCard: document.querySelector('.column[data-column-id="in-progress"] .card')?.getAttribute('data-card-id'),
          inprogTitle: document.querySelector('.column[data-column-id="in-progress"] .card__title')?.textContent,
          todoEmpty: !!document.querySelector('.column[data-column-id="todo"] .column-empty'),
          order: JSON.parse(localStorage.getItem('kanban:__order__') || 'null'),
        }));
        if (afterDrag.todoCount !== '0') throw new Error('드래그 후 TO DO count !== "0": ' + afterDrag.todoCount);
        if (afterDrag.inprogCount !== '1') throw new Error('드래그 후 IN PROGRESS count !== "1": ' + afterDrag.inprogCount);
        if (afterDrag.inprogCard !== CARD_ID) throw new Error('IN PROGRESS 카드 id mismatch: ' + afterDrag.inprogCard);
        if (afterDrag.inprogTitle !== '우유 사기') throw new Error('드래그 후 카드 제목 변형');
        if (!afterDrag.todoEmpty) throw new Error('드래그 후 TO DO 가 다시 column-empty 가 아님');
        if (!afterDrag.order || !afterDrag.order['in-progress'] || afterDrag.order['in-progress'][0] !== CARD_ID) {
          throw new Error('order["in-progress"] 에 카드 id 가 박제되지 않음: ' + JSON.stringify(afterDrag.order));
        }
        if (afterDrag.order.todo && afterDrag.order.todo.includes(CARD_ID)) {
          throw new Error('드래그 후 order.todo 에 잔존 id 가 남아있음');
        }
        console.log('[step4] TO DO→IN PROGRESS 드래그 → 컬럼 이동 + order 영속 OK');

        // 4. 새로고침 → IN PROGRESS 에 카드 1건 복원
        await page.reload();
        await page.waitForSelector('#btn-add-global');
        const afterReload = await page.evaluate(() => ({
          inprogCard: document.querySelector('.column[data-column-id="in-progress"] .card')?.getAttribute('data-card-id'),
          inprogTitle: document.querySelector('.column[data-column-id="in-progress"] .card__title')?.textContent,
          inprogCount: document.querySelector('.column[data-column-id="in-progress"] .count-badge')?.textContent,
          todoEmpty: !!document.querySelector('.column[data-column-id="todo"] .column-empty'),
          doneEmpty: !!document.querySelector('.column[data-column-id="done"] .column-empty'),
        }));
        if (afterReload.inprogCard !== CARD_ID) {
          throw new Error('새로고침 후 IN PROGRESS 카드 id mismatch: ' + afterReload.inprogCard + ' (expected ' + CARD_ID + ')');
        }
        if (afterReload.inprogTitle !== '우유 사기') {
          throw new Error('새로고침 후 카드 제목 복원 실패: ' + afterReload.inprogTitle);
        }
        if (afterReload.inprogCount !== '1') throw new Error('새로고침 후 IN PROGRESS count !== "1"');
        if (!afterReload.todoEmpty || !afterReload.doneEmpty) {
          throw new Error('새로고침 후 빈 컬럼 안내 누락');
        }
        console.log('[step5] 새로고침 → IN PROGRESS 카드 1건 + 빈 컬럼 안내 복원 OK');

        // 5. 카드 dblclick → 인라인 편집 진입 → 텍스트 교체 → Enter 로 저장
        const cardSel = '.column[data-column-id="in-progress"] .card[data-card-id="' + CARD_ID + '"]';
        // dblclick 으로 editingCardId 진입 → textarea.card__edit 활성
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) throw new Error('편집 대상 카드 미발견');
          el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
        }, cardSel);
        await page.waitForSelector(cardSel + ' .card__edit', { timeout: 3000 });
        // textarea 값을 전체 교체 (기존 값 지우고 새 값 입력) — main.js 의 commitEditCard 가 trim 후 저장
        await page.evaluate((sel) => {
          const ta = document.querySelector(sel);
          ta.value = '';
        }, cardSel + ' .card__edit');
        await page.type(cardSel + ' .card__edit', '우유 + 빵 사기');
        // Enter 로 commit (Shift+Enter 가 아니라 plain Enter — commitEditCard 호출)
        await page.focus(cardSel + ' .card__edit');
        await page.keyboard.press('Enter');
        await page.waitForFunction(
          ({ sel, cid }) => {
            const c = document.querySelector(sel + ' .card[data-card-id="' + cid + '"]');
            return c && !c.querySelector('.card__edit') && c.querySelector('.card__title');
          },
          { sel: '.column[data-column-id="in-progress"]', cid: CARD_ID },
          { timeout: 3000 },
        );
        const afterEdit = await page.evaluate((cid) => {
          const card = document.querySelector('.card[data-card-id="' + cid + '"]');
          return {
            title: card?.querySelector('.card__title')?.textContent,
            stored: (() => {
              const raw = localStorage.getItem('kanban:' + cid);
              return raw ? JSON.parse(raw) : null;
            })(),
          };
        }, CARD_ID);
        if (afterEdit.title !== '우유 + 빵 사기') {
          throw new Error('편집 후 카드 제목 mismatch: ' + afterEdit.title);
        }
        if (!afterEdit.stored || afterEdit.stored.title !== '우유 + 빵 사기') {
          throw new Error('편집 후 localStorage 본문 영속 실패: ' + JSON.stringify(afterEdit.stored));
        }
        console.log('[step6] dblclick 편집 → "우유 + 빵 사기" 저장 + localStorage 영속 OK');

        // 6. IN PROGRESS → DONE 드래그
        const drag2 = await page.evaluate(({ cardId, toColumn }) => {
          const card = document.querySelector(\`.card[data-card-id="\${cardId}"]\`);
          const col = document.querySelector(\`.column[data-column-id="\${toColumn}"]\`);
          if (!card || !col) return { ok: false, reason: 'source/target 미발견' };
          const dt = new DataTransfer();
          card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
          col.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
          col.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
          col.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: 99999 }));
          card.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
          return { ok: true };
        }, { cardId: CARD_ID, toColumn: 'done' });
        if (!drag2.ok) throw new Error('IN PROGRESS→DONE 드래그 dispatch 실패');
        await page.waitForFunction(
          () => document.querySelectorAll('.column[data-column-id="done"] .card').length === 1,
          { timeout: 3000 }
        );
        const afterDrag2 = await page.evaluate(() => ({
          doneCount: document.querySelector('.column[data-column-id="done"] .count-badge')?.textContent,
          inprogCount: document.querySelector('.column[data-column-id="in-progress"] .count-badge')?.textContent,
          inprogEmpty: !!document.querySelector('.column[data-column-id="in-progress"] .column-empty'),
          doneTitle: document.querySelector('.column[data-column-id="done"] .card__title')?.textContent,
        }));
        if (afterDrag2.doneCount !== '1') throw new Error('DONE 드래그 후 count !== "1"');
        if (afterDrag2.inprogCount !== '0') throw new Error('DONE 드래그 후 IN PROGRESS count !== "0"');
        if (!afterDrag2.inprogEmpty) throw new Error('DONE 드래그 후 IN PROGRESS column-empty 누락');
        if (afterDrag2.doneTitle !== '우유 + 빵 사기') throw new Error('DONE 카드 제목 mismatch');
        console.log('[step7] IN PROGRESS→DONE 드래그 OK');

        // 7. × 삭제 버튼 클릭 → 카드 제거, 모든 컬럼 빈 상태 + column-empty 안내
        await page.click('.column[data-column-id="done"] .card .card__delete');
        await page.waitForFunction(
          () => document.querySelectorAll('.card').length === 0,
          { timeout: 3000 }
        );
        const afterDelete = await page.evaluate((cid) => {
          const cols = ['todo', 'in-progress', 'done'].map((id) => {
            const sec = document.querySelector(\`.column[data-column-id="\${id}"]\`);
            return {
              id,
              empty: sec ? !!sec.querySelector('.column-empty') : null,
              emptyText: sec ? sec.querySelector('.column-empty')?.textContent : null,
              count: sec ? sec.querySelector('.count-badge')?.textContent : null,
              cardCount: sec ? sec.querySelectorAll('.card').length : null,
            };
          });
          return {
            cols,
            storedCard: localStorage.getItem('kanban:' + cid),
            order: JSON.parse(localStorage.getItem('kanban:__order__') || 'null'),
          };
        }, CARD_ID);
        for (const col of afterDelete.cols) {
          if (!col.empty) throw new Error('삭제 후 ' + col.id + ' column-empty 누락');
          if (!col.emptyText || !col.emptyText.includes('카드가 없습니다')) {
            throw new Error('삭제 후 ' + col.id + ' 빈 상태 안내 문구 mismatch: ' + col.emptyText);
          }
          if (col.count !== '0') throw new Error('삭제 후 ' + col.id + ' count !== "0"');
          if (col.cardCount !== 0) throw new Error('삭제 후 ' + col.id + ' 카드가 남아있음');
        }
        if (afterDelete.storedCard != null) {
          throw new Error('삭제 후 localStorage kanban:' + CARD_ID + ' 잔존: ' + afterDelete.storedCard);
        }
        // order 안에도 cardId 가 없어야 함
        if (afterDelete.order) {
          for (const col of ['todo', 'in-progress', 'done']) {
            if ((afterDelete.order[col] || []).includes(CARD_ID)) {
              throw new Error('삭제 후 order["' + col + '"] 에 잔존 카드 id');
            }
          }
        }
        console.log('[step8] × 삭제 → 빈 상태 안내 + localStorage 정리 OK');

        // 8. cleanup
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('kanban:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        console.log('[done] BF-429 AC1 카드 lifecycle 전체 PASS');
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
            "칸반 카드 lifecycle 추가→드래그→복원→편집→드래그→삭제→빈 상태 (BF-429 AC1)",
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
        `E2E AC1 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2000)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // E2E AC2 — 테마 토글 (다크 default → 라이트 토글 → 새로고침 후 라이트 유지)
  // ─────────────────────────────────────────────────────────────
  test("BF-429 E2E AC2: 테마 다크→라이트 토글 + 새로고침 후 라이트 유지 (bf-theme=light 박제)", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/kanban/`;
      const scriptText = `
        // 0. clean start — bf-theme 제거 후 reload. emulate dark (OS prefers-color-scheme 영향 배제)
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.evaluate(() => localStorage.removeItem('bf-theme'));
        await page.reload();
        await page.waitForSelector('#btn-theme');

        // 초기 — saved 없음 + OS prefers dark → applyTheme('dark')
        const initial = await page.evaluate(() => ({
          dataTheme: document.documentElement.getAttribute('data-theme'),
          btnText: document.getElementById('btn-theme')?.textContent,
          btnAria: document.getElementById('btn-theme')?.getAttribute('aria-label'),
          stored: localStorage.getItem('bf-theme'),
        }));
        if (initial.dataTheme !== 'dark') {
          throw new Error('초기 data-theme 가 dark 가 아님: ' + initial.dataTheme);
        }
        if (initial.btnText !== '☀') {
          throw new Error('다크 테마일 때 버튼 텍스트가 ☀ 가 아님: ' + JSON.stringify(initial));
        }
        if (initial.btnAria !== '라이트 테마로 전환') {
          throw new Error('다크 테마 aria-label mismatch: ' + initial.btnAria);
        }
        // initTheme 은 saved 없을 때 localStorage 에 쓰지 않음 — null 이 정상
        if (initial.stored !== null) {
          throw new Error('초기 (toggle 전) bf-theme 가 미리 박제됨: ' + initial.stored);
        }
        console.log('[step1] 초기 다크 default (OS dark) + bf-theme null OK');

        // 1. 테마 토글 → 라이트
        await page.click('#btn-theme');
        const afterToggle = await page.evaluate(() => ({
          dataTheme: document.documentElement.getAttribute('data-theme'),
          btnText: document.getElementById('btn-theme')?.textContent,
          btnAria: document.getElementById('btn-theme')?.getAttribute('aria-label'),
          stored: localStorage.getItem('bf-theme'),
        }));
        if (afterToggle.dataTheme !== 'light') {
          throw new Error('토글 후 data-theme 가 light 가 아님: ' + afterToggle.dataTheme);
        }
        if (afterToggle.btnText !== '🌙') {
          throw new Error('라이트 테마 버튼 텍스트가 🌙 가 아님: ' + afterToggle.btnText);
        }
        if (afterToggle.btnAria !== '다크 테마로 전환') {
          throw new Error('라이트 테마 aria-label mismatch: ' + afterToggle.btnAria);
        }
        if (afterToggle.stored !== 'light') {
          throw new Error('토글 후 localStorage bf-theme !== "light": ' + afterToggle.stored);
        }
        console.log('[step2] 토글 → 라이트 적용 + bf-theme=light 박제 OK');

        // 2. 새로고침 → bf-theme=light 가 있으므로 다시 라이트 유지
        //    (OS 는 여전히 dark 로 emulate — saved 가 우선이어야 함)
        await page.reload();
        await page.waitForSelector('#btn-theme');
        const afterReload = await page.evaluate(() => ({
          dataTheme: document.documentElement.getAttribute('data-theme'),
          btnText: document.getElementById('btn-theme')?.textContent,
          btnAria: document.getElementById('btn-theme')?.getAttribute('aria-label'),
          stored: localStorage.getItem('bf-theme'),
        }));
        if (afterReload.dataTheme !== 'light') {
          throw new Error('새로고침 후 data-theme 가 light 가 아님 (OS dark 가 saved 를 덮어씀): ' + afterReload.dataTheme);
        }
        if (afterReload.btnText !== '🌙') {
          throw new Error('새로고침 후 라이트 버튼 텍스트 mismatch: ' + afterReload.btnText);
        }
        if (afterReload.btnAria !== '다크 테마로 전환') {
          throw new Error('새로고침 후 라이트 aria-label mismatch: ' + afterReload.btnAria);
        }
        if (afterReload.stored !== 'light') {
          throw new Error('새로고침 후 bf-theme 가 light 가 아님: ' + afterReload.stored);
        }
        console.log('[step3] 새로고침 → 라이트 유지 + bf-theme=light 그대로 OK');

        // 3. 다시 토글 → 다크 → bf-theme=dark 박제
        await page.click('#btn-theme');
        const afterBack = await page.evaluate(() => ({
          dataTheme: document.documentElement.getAttribute('data-theme'),
          stored: localStorage.getItem('bf-theme'),
        }));
        if (afterBack.dataTheme !== 'dark') throw new Error('재토글 후 다크 적용 실패: ' + afterBack.dataTheme);
        if (afterBack.stored !== 'dark') throw new Error('재토글 후 bf-theme !== "dark": ' + afterBack.stored);
        console.log('[step4] 재토글 → 다크 + bf-theme=dark 박제 OK');

        // cleanup
        await page.evaluate(() => localStorage.removeItem('bf-theme'));
        console.log('[done] BF-429 AC2 테마 토글 시나리오 전체 PASS');
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
          label: "칸반 테마 다크↔라이트 토글 + 새로고침 유지 (BF-429 AC2)",
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
