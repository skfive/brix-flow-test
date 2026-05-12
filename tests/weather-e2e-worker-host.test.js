// BF-440 · 날씨 카드 SPA 실 브라우저 E2E 회귀 가드 (worker host)
//
// 본 파일은 BF-438 의 dev 산출물 (weather/ 모듈) 이 main 에 들어간 후
// silent break 되지 않도록, e2e-runner 컨테이너로 worker host URL 에 접근해
// AC1 의 전체 사용자 시나리오 (도시 추가 → 새로고침 복원 → 인라인 메모 편집 →
// 가나다 정렬 → 삭제 모달 → 빈 상태) 와 AC3 의 console error 0건 회귀 가드를
// 직접 구동한다.
//
// 보호 대상 (BF-440 수용 기준):
//   AC1. 도시 추가 (form submit) → 카드 1건 + weather:<ulid> 저장 → 새로고침
//        후 카드 + 정렬 + 테마 복원 → 메모 클릭 → textarea → Enter commit →
//        updatedAt 갱신 (sortLabel 동기) → 가나다 정렬 토글 → 라벨 변경 +
//        카드 순서 변경 → × 클릭 → 모달 노출 → confirm → 카드 제거 → 빈 상태.
//   AC3. 페이지 부팅 ~ 조작 구간에서 console.error / unhandledrejection / page
//        error 0건 — file:// CORS 회귀 가드를 worker host 환경에서도 보강.
//
// 작성 방침 (BF-419 / BF-434 패턴 준수):
//   - CI 결정성 (결함 14/19 회귀 방지) — BRIX_E2E_SKIP=1 또는 e2e-runner 도달
//     불가 시 t.skip(). assert.ok(reachable, ...) 같은 hookFail 패턴 금지.
//   - focused scope 정책: BRIX_TEST_MODULE 가 weather 가 아니면 module 전체 skip.
//   - BRIX_PERSONA_HOST env 우선. compose 서비스 hostname 만 허용
//     (host.docker.internal / localhost 금지 — e2e-runner 는 다른 컨테이너).
//   - 두 시나리오 (AC1 통합 흐름 + AC3 console error) 를 분리 — 운영자 UI 의
//     라벨로 한 눈에 구분 + 한쪽 실패가 다른 쪽 artifact 를 가리지 않게.
//   - dev 의 weather-storage / weather-integration / weather-ui 테스트는 단위·
//     정적 정규식 가드. 본 파일은 실 브라우저에서만 검증 가능한 인터랙션 +
//     인 페이지 console.error / pageerror / unhandledrejection 0건 가드.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "weather";
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
  // E2E AC1 — 통합 시나리오: 도시 추가 → 새로고침 복원 → 메모 편집 →
  //           가나다 정렬 → 삭제 모달 → 빈 상태 (단일 e2e-runner 호출)
  // ─────────────────────────────────────────────────────────────
  test("BF-440 E2E AC1: 도시 추가→새로고침 복원→메모 편집→가나다 정렬→삭제 모달→빈 상태", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/weather/`;
      // page.evaluate 내부 코드는 e2e-runner 의 puppeteer page 객체로 실행됨.
      // 따라서 함수 내부에서는 await page.* / new Promise / console.log 사용 가능.
      const scriptText = `
        // 0. clean — weather: prefix + bf-theme 제거 후 reload
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('weather:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        await page.reload();
        await page.waitForSelector('#add-form');

        // 1. 초기 — 빈 상태 (empty-state 노출 · grid 숨김 · count "0개 도시")
        const initial = await page.evaluate(() => ({
          emptyHidden: document.getElementById('empty-state').hidden,
          gridHidden: document.getElementById('grid').hidden,
          countText: document.getElementById('count-label').textContent,
          sortLabel: document.getElementById('sort-toggle-label').textContent.trim(),
          cardCount: document.querySelectorAll('.card').length,
        }));
        if (initial.emptyHidden !== false) {
          throw new Error('초기 empty-state 가 hidden=false 가 아님: ' + initial.emptyHidden);
        }
        if (initial.gridHidden !== true) {
          throw new Error('초기 grid 가 hidden=true 가 아님 (cards 0건일 때 grid 숨겨야 함)');
        }
        if (initial.countText !== '0개 도시') {
          throw new Error('초기 count-label 가 "0개 도시" 가 아님: ' + initial.countText);
        }
        if (initial.sortLabel !== '최신순') {
          throw new Error('초기 sort-toggle-label 가 "최신순" 이 아님: ' + initial.sortLabel);
        }
        if (initial.cardCount !== 0) {
          throw new Error('초기 카드가 0건이 아님: ' + initial.cardCount);
        }
        console.log('[step1] 초기 빈 상태 OK (empty-state 노출, 카드 0건)');

        // 2. 도시 추가 — Tokyo (이모지 ☁️, 메모 없음)
        await page.click('#add-city');
        await page.keyboard.type('Tokyo');
        // emoji 는 두 번째 option (cloudy) 선택
        await page.selectOption('#add-emoji', '☁️');
        await page.click('#add-submit');
        // commitAddForm 동기. render 도 동기. 안전 마진 80ms.
        await new Promise((r) => setTimeout(r, 80));
        const afterAdd1 = await page.evaluate(() => ({
          cardCount: document.querySelectorAll('.card').length,
          countText: document.getElementById('count-label').textContent,
          emptyHidden: document.getElementById('empty-state').hidden,
          gridHidden: document.getElementById('grid').hidden,
          firstCity: document.querySelector('.card .card__city')?.textContent,
          // weather: prefix entry 가 1건 (sort 키 제외)
          weatherCardKeys: Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
            .filter((k) => k && k.startsWith('weather:') && k !== 'weather:__sort__'),
        }));
        if (afterAdd1.cardCount !== 1) {
          throw new Error('Tokyo 추가 후 카드 1건이 아님: ' + afterAdd1.cardCount);
        }
        if (afterAdd1.countText !== '1개 도시') {
          throw new Error('Tokyo 추가 후 count-label !== "1개 도시": ' + afterAdd1.countText);
        }
        if (afterAdd1.emptyHidden !== true) {
          throw new Error('Tokyo 추가 후 empty-state 가 숨겨지지 않음');
        }
        if (afterAdd1.gridHidden !== false) {
          throw new Error('Tokyo 추가 후 grid 가 노출되지 않음');
        }
        if (afterAdd1.firstCity !== 'Tokyo') {
          throw new Error('첫 카드 city 가 Tokyo 가 아님: ' + afterAdd1.firstCity);
        }
        if (afterAdd1.weatherCardKeys.length !== 1) {
          throw new Error('localStorage weather:<id> entry 1건이 아님: ' + JSON.stringify(afterAdd1.weatherCardKeys));
        }
        // weather:<ulid> 형식 — 26자 Crockford base32
        const ulidPart = afterAdd1.weatherCardKeys[0].slice('weather:'.length);
        if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(ulidPart)) {
          throw new Error('localStorage key 의 ulid 부분 포맷 mismatch: ' + ulidPart);
        }
        console.log('[step2] Tokyo 추가 → 카드 1건 + weather:<ulid> 저장 OK (ulid=' + ulidPart + ')');

        // 3. 두 번째 도시 추가 — Seoul (이모지 ☀️, 메모 "맑음")
        await page.click('#add-city');
        await page.keyboard.type('Seoul');
        await page.selectOption('#add-emoji', '☀️');
        await page.click('#add-memo');
        await page.keyboard.type('맑음');
        await page.click('#add-submit');
        await new Promise((r) => setTimeout(r, 80));
        const afterAdd2 = await page.evaluate(() => ({
          cardCount: document.querySelectorAll('.card').length,
          firstCity: document.querySelector('.card .card__city')?.textContent,
          // 최신순 (default) 에서 가장 최근 추가가 맨 위
        }));
        if (afterAdd2.cardCount !== 2) {
          throw new Error('Seoul 추가 후 카드 2건이 아님: ' + afterAdd2.cardCount);
        }
        if (afterAdd2.firstCity !== 'Seoul') {
          throw new Error('최신순 default 에서 Seoul 이 첫 카드가 아님: ' + afterAdd2.firstCity);
        }
        console.log('[step3] Seoul 추가 → 카드 2건 + Seoul 이 최신순 첫 카드 OK');

        // 4. 새로고침 → 카드 2건 + 메모 + 정렬 모두 복원
        await page.reload();
        await page.waitForSelector('#add-form');
        const afterReload = await page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('.card'));
          return {
            cardCount: cards.length,
            cities: cards.map((c) => c.querySelector('.card__city')?.textContent),
            memos: cards.map((c) => c.querySelector('.card__memo')?.textContent),
            countText: document.getElementById('count-label').textContent,
            emptyHidden: document.getElementById('empty-state').hidden,
            sortLabel: document.getElementById('sort-toggle-label').textContent.trim(),
          };
        });
        if (afterReload.cardCount !== 2) {
          throw new Error('새로고침 후 카드 2건이 아님 (복원 실패): ' + afterReload.cardCount);
        }
        if (!afterReload.cities.includes('Tokyo') || !afterReload.cities.includes('Seoul')) {
          throw new Error('새로고침 후 두 도시 모두 복원 실패: ' + JSON.stringify(afterReload.cities));
        }
        if (afterReload.memos[0] !== '맑음' && afterReload.memos[1] !== '맑음') {
          throw new Error('Seoul 메모 "맑음" 복원 실패: ' + JSON.stringify(afterReload.memos));
        }
        if (afterReload.sortLabel !== '최신순') {
          throw new Error('새로고침 후 sort-toggle-label 복원 mismatch: ' + afterReload.sortLabel);
        }
        if (afterReload.emptyHidden !== true) {
          throw new Error('새로고침 후 empty-state 가 노출됨 (카드 2건인데)');
        }
        console.log('[step4] 새로고침 → 카드 2건 + 메모 + 정렬 모두 복원 OK');

        // 5. Tokyo 카드의 메모 클릭 → textarea → "흐림" 입력 → Enter commit
        //    → updatedAt 갱신 → Tokyo 가 최신순에서 맨 위로 이동
        const beforeEdit = await page.evaluate(() => {
          const tokyoCard = Array.from(document.querySelectorAll('.card')).find(
            (c) => c.querySelector('.card__city')?.textContent === 'Tokyo'
          );
          if (!tokyoCard) return { found: false };
          // tokyo 의 ulid (data-card-id) 와 메모 element 의 텍스트 (현재는 placeholder)
          return {
            found: true,
            tokyoId: tokyoCard.dataset.cardId,
            memoText: tokyoCard.querySelector('.card__memo')?.textContent,
            memoIsEmpty: tokyoCard.querySelector('.card__memo')?.classList.contains('card__memo--empty'),
          };
        });
        if (!beforeEdit.found) {
          throw new Error('Tokyo 카드를 찾지 못함 (renderCard 실패)');
        }
        if (!beforeEdit.memoIsEmpty) {
          throw new Error('Tokyo 메모가 empty placeholder 가 아님: ' + beforeEdit.memoText);
        }
        // 메모 클릭 → textarea 등장
        await page.click('.card[data-card-id="' + beforeEdit.tokyoId + '"] .card__memo');
        await new Promise((r) => setTimeout(r, 80));
        const editingState = await page.evaluate((id) => {
          const card = document.querySelector('.card[data-card-id="' + id + '"]');
          const ta = card?.querySelector('textarea.card__memo-edit');
          return {
            hasTextarea: !!ta,
            taFocused: document.activeElement === ta,
            taValue: ta?.value,
          };
        }, beforeEdit.tokyoId);
        if (!editingState.hasTextarea) {
          throw new Error('Tokyo 메모 클릭 후 textarea 가 등장하지 않음');
        }
        if (!editingState.taFocused) {
          throw new Error('textarea 가 focus 되지 않음 (setTimeout(focus, 0) 실패)');
        }
        // 텍스트 입력 + Enter (Shift 없이 commit)
        await page.keyboard.type('흐림');
        await page.keyboard.press('Enter');
        await new Promise((r) => setTimeout(r, 80));
        const afterEdit = await page.evaluate((id) => {
          const cards = Array.from(document.querySelectorAll('.card'));
          const tokyo = cards.find((c) => c.dataset.cardId === id);
          return {
            firstCardId: cards[0]?.dataset.cardId,
            tokyoMemo: tokyo?.querySelector('.card__memo')?.textContent,
            tokyoMemoEmpty: tokyo?.querySelector('.card__memo')?.classList.contains('card__memo--empty'),
            stored: JSON.parse(localStorage.getItem('weather:' + id) || 'null'),
            // textarea 가 닫혔는지 (commitMemoEdit 후 render 로 일반 p 로 돌아옴)
            stillEditing: !!tokyo?.querySelector('textarea.card__memo-edit'),
          };
        }, beforeEdit.tokyoId);
        if (afterEdit.stillEditing) {
          throw new Error('Enter 후에도 textarea 가 닫히지 않음 (commitMemoEdit 실패)');
        }
        if (afterEdit.tokyoMemo !== '흐림') {
          throw new Error('Tokyo 메모가 "흐림" 으로 갱신되지 않음: ' + afterEdit.tokyoMemo);
        }
        if (afterEdit.tokyoMemoEmpty) {
          throw new Error('Tokyo 메모에 card__memo--empty 가 여전히 붙어있음');
        }
        if (!afterEdit.stored || afterEdit.stored.memo !== '흐림') {
          throw new Error('localStorage Tokyo 카드의 memo 갱신 실패: ' + JSON.stringify(afterEdit.stored));
        }
        if (!Number.isFinite(afterEdit.stored.updatedAt)) {
          throw new Error('localStorage Tokyo 카드 updatedAt 누락');
        }
        // 최신순 정렬에서 Tokyo (편집된) 가 첫 카드로 올라옴
        if (afterEdit.firstCardId !== beforeEdit.tokyoId) {
          throw new Error('메모 편집 후 Tokyo 가 최신순 첫 카드로 이동 안 함 (updatedAt 갱신 실패): firstId=' + afterEdit.firstCardId);
        }
        console.log('[step5] Tokyo 메모 편집 (Enter commit) → updatedAt 갱신 + 최신순 첫 카드 이동 OK');

        // 6. 가나다 정렬 토글 → label "도시명 가나다" + 카드 순서 변경
        //    (Seoul vs Tokyo — localeCompare 로 영문 Tokyo 가 먼저)
        await page.click('#sort-toggle');
        await new Promise((r) => setTimeout(r, 80));
        const afterSortToggle = await page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('.card'));
          return {
            sortLabel: document.getElementById('sort-toggle-label').textContent.trim(),
            cities: cards.map((c) => c.querySelector('.card__city')?.textContent),
            storedSort: localStorage.getItem('weather:__sort__'),
          };
        });
        if (afterSortToggle.sortLabel !== '도시명 가나다') {
          throw new Error('sort 토글 후 라벨 mismatch: ' + afterSortToggle.sortLabel);
        }
        if (afterSortToggle.storedSort !== 'city-asc') {
          throw new Error('sort 토글 후 localStorage weather:__sort__ != "city-asc": ' + afterSortToggle.storedSort);
        }
        // localeCompare 기준 — Seoul (영문) < Tokyo (영문). 둘 다 영문이라 ASCII 순.
        // S < T → Seoul 이 먼저.
        if (afterSortToggle.cities[0] !== 'Seoul' || afterSortToggle.cities[1] !== 'Tokyo') {
          throw new Error('city-asc 정렬 결과 mismatch (Seoul → Tokyo 기대): ' + JSON.stringify(afterSortToggle.cities));
        }
        console.log('[step6] 가나다 정렬 토글 → 라벨 "도시명 가나다" + Seoul→Tokyo 순서 OK');

        // 7. Seoul 카드의 × 클릭 → 삭제 모달 노출 (backdrop hidden=false · confirm focus)
        const seoulId = await page.evaluate(() =>
          Array.from(document.querySelectorAll('.card')).find(
            (c) => c.querySelector('.card__city')?.textContent === 'Seoul'
          )?.dataset.cardId
        );
        if (!seoulId) throw new Error('Seoul 카드 id 를 찾지 못함');
        await page.click('.card[data-card-id="' + seoulId + '"] .card__delete');
        await new Promise((r) => setTimeout(r, 80));
        const modalOpen = await page.evaluate(() => ({
          backdropHidden: document.getElementById('modal-backdrop').hidden,
          bodyText: document.getElementById('modal-body').textContent,
          confirmFocused: document.activeElement?.id === 'modal-confirm',
        }));
        if (modalOpen.backdropHidden !== false) {
          throw new Error('× 클릭 후 modal-backdrop 가 노출되지 않음');
        }
        if (!modalOpen.bodyText.includes('Seoul')) {
          throw new Error('modal-body 텍스트에 Seoul 이 포함되지 않음: ' + modalOpen.bodyText);
        }
        if (!modalOpen.confirmFocused) {
          throw new Error('modal-confirm 가 focus 되지 않음 (setTimeout(focus, 0) 실패)');
        }
        console.log('[step7] × 클릭 → 삭제 모달 노출 + Seoul 이름 표시 + confirm focus OK');

        // 8. 모달 confirm → Seoul 카드 제거 → 카드 1건 (Tokyo)
        await page.click('#modal-confirm');
        await new Promise((r) => setTimeout(r, 80));
        const afterConfirm = await page.evaluate(() => ({
          cardCount: document.querySelectorAll('.card').length,
          firstCity: document.querySelector('.card .card__city')?.textContent,
          countText: document.getElementById('count-label').textContent,
          backdropHidden: document.getElementById('modal-backdrop').hidden,
          seoulInStorage: Object.keys(localStorage).some(
            (k) => k.startsWith('weather:') && k !== 'weather:__sort__' && JSON.parse(localStorage.getItem(k))?.city === 'Seoul'
          ),
        }));
        if (afterConfirm.cardCount !== 1) {
          throw new Error('Seoul 삭제 후 카드 1건이 아님: ' + afterConfirm.cardCount);
        }
        if (afterConfirm.firstCity !== 'Tokyo') {
          throw new Error('Seoul 삭제 후 남은 첫 카드가 Tokyo 가 아님: ' + afterConfirm.firstCity);
        }
        if (afterConfirm.countText !== '1개 도시') {
          throw new Error('Seoul 삭제 후 count-label !== "1개 도시": ' + afterConfirm.countText);
        }
        if (afterConfirm.backdropHidden !== true) {
          throw new Error('confirm 후 modal-backdrop 가 닫히지 않음');
        }
        if (afterConfirm.seoulInStorage) {
          throw new Error('Seoul 카드가 localStorage 에 잔존 (removeCard 실패)');
        }
        console.log('[step8] confirm → Seoul 제거 + Tokyo 1건 남음 + 모달 닫힘 OK');

        // 9. Tokyo 카드 × → confirm → 카드 0건 → 빈 상태 (empty-state 노출 + grid 숨김)
        const tokyoId = beforeEdit.tokyoId;
        await page.click('.card[data-card-id="' + tokyoId + '"] .card__delete');
        await new Promise((r) => setTimeout(r, 80));
        await page.click('#modal-confirm');
        await new Promise((r) => setTimeout(r, 80));
        const afterAllDelete = await page.evaluate(() => ({
          cardCount: document.querySelectorAll('.card').length,
          emptyHidden: document.getElementById('empty-state').hidden,
          gridHidden: document.getElementById('grid').hidden,
          countText: document.getElementById('count-label').textContent,
          storedSort: localStorage.getItem('weather:__sort__'),
          weatherCardKeys: Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
            .filter((k) => k && k.startsWith('weather:') && k !== 'weather:__sort__'),
        }));
        if (afterAllDelete.cardCount !== 0) {
          throw new Error('모든 카드 삭제 후 카드 0건이 아님: ' + afterAllDelete.cardCount);
        }
        if (afterAllDelete.emptyHidden !== false) {
          throw new Error('빈 상태 진입 후 empty-state 가 노출되지 않음');
        }
        if (afterAllDelete.gridHidden !== true) {
          throw new Error('빈 상태 진입 후 grid 가 숨겨지지 않음');
        }
        if (afterAllDelete.countText !== '0개 도시') {
          throw new Error('빈 상태 count-label !== "0개 도시": ' + afterAllDelete.countText);
        }
        if (afterAllDelete.weatherCardKeys.length !== 0) {
          throw new Error('빈 상태 진입 후 localStorage weather:<id> 잔존: ' + JSON.stringify(afterAllDelete.weatherCardKeys));
        }
        // 정렬 모드는 city-asc 그대로 유지 (clearAll 호출이 아닌 개별 removeCard)
        if (afterAllDelete.storedSort !== 'city-asc') {
          throw new Error('빈 상태 진입 후 weather:__sort__ 가 city-asc 가 아님: ' + afterAllDelete.storedSort);
        }
        console.log('[step9] 마지막 카드 삭제 → 빈 상태 + 정렬 모드 (city-asc) 유지 OK');

        // 10. cleanup — focused scope 의 다른 시나리오 격리
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('weather:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        console.log('[done] BF-440 E2E AC1 PASS');
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
            "날씨 도시 추가→새로고침 복원→메모 편집→가나다 정렬→삭제 모달→빈 상태 (BF-440 AC1)",
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
        `E2E AC1 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // E2E AC3 — 페이지 부팅~조작 console.error / unhandledrejection / page error 0건
  //           (file:// CORS 회귀 가드를 worker host 환경에서 보강)
  // ─────────────────────────────────────────────────────────────
  test("BF-440 E2E AC3: 페이지 부팅~전체 시나리오 console.error / unhandledrejection / pageerror 0건", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/weather/`;
      // page.on('console') / page.on('pageerror') 의 외부 노출이 보장되지 않으므로
      // window.onerror / unhandledrejection 을 페이지 안에서 직접 hook 해 누적 후
      // 회수한다. console.error 도 wrap 으로 잡는다 (main.js 의 script 순서 오류 메시지 포함).
      const scriptText = `
        await page.evaluate(() => {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('weather:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        await page.reload();
        await page.waitForSelector('#add-form');

        // 1. 부팅 직후 error hook 설치 — 같은 페이지 context 안에서 이후 모든 시나리오 누적
        await page.evaluate(() => {
          window.__weatherErrors = [];
          window.addEventListener('error', (e) => {
            window.__weatherErrors.push('error: ' + (e.message || String(e)));
          });
          window.addEventListener('unhandledrejection', (e) => {
            window.__weatherErrors.push(
              'unhandledrejection: ' + String(e.reason && e.reason.message ? e.reason.message : e.reason),
            );
          });
          const origErr = console.error.bind(console);
          console.error = function () {
            try {
              window.__weatherErrors.push(
                'console.error: ' + Array.from(arguments).map(String).join(' '),
              );
            } catch (_e) {
              // 무한 재귀 방지
            }
            return origErr.apply(console, arguments);
          };
        });

        // 2. 가장 빈도 높은 흐름 — 도시 2 건 추가 + 메모 편집 + 정렬 토글 +
        //    삭제 모달 confirm + 빈 상태 + 테마 토글
        await page.click('#add-city');
        await page.keyboard.type('Busan');
        await page.selectOption('#add-emoji', '🌧️');
        await page.click('#add-submit');
        await new Promise((r) => setTimeout(r, 80));

        await page.click('#add-city');
        await page.keyboard.type('Osaka');
        await page.selectOption('#add-emoji', '☁️');
        await page.click('#add-memo');
        await page.keyboard.type('흐림');
        await page.click('#add-submit');
        await new Promise((r) => setTimeout(r, 80));

        // 메모 편집 (첫 카드 = Osaka) — 클릭 → 텍스트 추가 → Enter
        const firstCardId = await page.evaluate(() =>
          document.querySelector('.card')?.dataset.cardId
        );
        await page.click('.card[data-card-id="' + firstCardId + '"] .card__memo');
        await new Promise((r) => setTimeout(r, 80));
        await page.keyboard.type(' + 메모 추가');
        await page.keyboard.press('Enter');
        await new Promise((r) => setTimeout(r, 80));

        // 메모 편집 → Esc cancel 분기 (Busan 카드)
        const busanCardId = await page.evaluate(() =>
          Array.from(document.querySelectorAll('.card')).find(
            (c) => c.querySelector('.card__city')?.textContent === 'Busan'
          )?.dataset.cardId
        );
        if (busanCardId) {
          await page.click('.card[data-card-id="' + busanCardId + '"] .card__memo');
          await new Promise((r) => setTimeout(r, 80));
          await page.keyboard.type('취소될 메모');
          await page.keyboard.press('Escape');
          await new Promise((r) => setTimeout(r, 80));
        }

        // 정렬 토글 두 번 (city-asc → updated-desc)
        await page.click('#sort-toggle');
        await new Promise((r) => setTimeout(r, 50));
        await page.click('#sort-toggle');
        await new Promise((r) => setTimeout(r, 50));

        // 테마 토글 (다크 → 라이트 → 다크)
        await page.click('#theme-toggle');
        await new Promise((r) => setTimeout(r, 50));
        await page.click('#theme-toggle');
        await new Promise((r) => setTimeout(r, 50));

        // T 키 토글
        await page.click('body');
        await page.keyboard.press('t');
        await new Promise((r) => setTimeout(r, 50));
        await page.keyboard.press('T');
        await new Promise((r) => setTimeout(r, 50));

        // 카드 1건 삭제 (× → confirm)
        const targetId = await page.evaluate(() =>
          document.querySelector('.card')?.dataset.cardId
        );
        if (targetId) {
          await page.click('.card[data-card-id="' + targetId + '"] .card__delete');
          await new Promise((r) => setTimeout(r, 80));
          await page.click('#modal-confirm');
          await new Promise((r) => setTimeout(r, 80));
        }

        // 모달 backdrop click cancel 분기
        const lastId = await page.evaluate(() =>
          document.querySelector('.card')?.dataset.cardId
        );
        if (lastId) {
          await page.click('.card[data-card-id="' + lastId + '"] .card__delete');
          await new Promise((r) => setTimeout(r, 80));
          // backdrop 의 빈 영역 클릭 — modal 본문 바깥. backdrop 사각형의 좌상단 모서리.
          const box = await page.evaluate(() => {
            const bd = document.getElementById('modal-backdrop');
            const r = bd.getBoundingClientRect();
            return { x: r.left + 4, y: r.top + 4 };
          });
          await page.mouse.click(box.x, box.y);
          await new Promise((r) => setTimeout(r, 80));
          // 모달 cancel 버튼 click 분기 — 다시 열어서 cancel
          await page.click('.card[data-card-id="' + lastId + '"] .card__delete');
          await new Promise((r) => setTimeout(r, 80));
          await page.click('#modal-cancel');
          await new Promise((r) => setTimeout(r, 80));
          // 마지막으로 Esc 로 모달 닫기 (이번엔 다시 열고 Esc)
          await page.click('.card[data-card-id="' + lastId + '"] .card__delete');
          await new Promise((r) => setTimeout(r, 80));
          await page.keyboard.press('Escape');
          await new Promise((r) => setTimeout(r, 80));
        }

        // 3. error 회수 — 0 건이어야 함
        const errs = await page.evaluate(() => window.__weatherErrors || []);
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
            if (k && (k.startsWith('weather:') || k === 'bf-theme')) toRemove.push(k);
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
        });
        console.log('[done] BF-440 E2E AC3 PASS');
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
            "날씨 console.error / pageerror / unhandledrejection 0건 회귀 (BF-440 AC3)",
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
        `E2E AC3 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (BF-419 / BF-434 e2e-worker-host 패턴과 동일)
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
