// tests/e2e/memory-match/keyboard-navigation-restart-focus.test.js
// BF-958 · /phase18-games/memory-match 방향키·Enter/Space·재시작 실 브라우저 E2E 회귀 가드
// (테스터 소유, focused scope · module: memory-match)
//
// 관련: docs/design/memory-match-BF-955.md (§4.2 포커스 공간 모델·§5.3 재시작·§6.1 dev 가이드) ·
//       phase18-games/memory-match/{index.html,styles.css,logic.js,main.js} (구현, BF-956 PR #215).
// 본 파일은 머지된 최종 코드 기준으로 e2e-runner 실 브라우저 호출을 통해
// "방향키로 카드 사이 포커스 이동(경계 클램프 포함)", "Enter/Space 로 카드 뒤집기 +
// 포커스 유지", "재시작 시 카드/시도횟수/완료상태 초기화 + 포커스 stealing 방지"를
// 직접 구동해 검증한다.
//
// ── 중복 금지 (dev(BF-956) 가 이미 커버 — 재작성 X, tests/memory-match-BF956.test.js) ──
//   - logic.js nextIndex 순수 함수 4방향 이동 + 4개 모서리 클램프 (node:vm 샌드박스,
//     K-01~K-07) — 좌표 계산 공식 자체의 정확성은 이미 전수 검증됨.
//   - createInitialState 재시작 로직 — 카드 전체 hidden·moves 0·matchedPairs 0·
//     idle·finishedAt null (R-01, R-02) — 순수 함수 결과 자체는 이미 검증됨.
//   - main.js 배선 "존재" 가드 — keydown 리스너·4방향 키·preventDefault·nextIndex
//     호출·.focus() 호출·tabIndex 토글·activeIndex=0 리셋 코드가 "쓰여 있는지"만
//     정규식으로 확인(코드 텍스트 검사, 실제 브라우저 동작 아님).
//   - CSS 포커스 링 토큰(outline-offset:2px)·방향키 안내 hint 마크업 존재.
//   → 본 파일은 이 순수 함수/코드 존재 검증을 다시 하지 않는다. "실 브라우저에서
//     방향키를 누르면 실제로 DOM 포커스가 이동하는가", "Enter/Space 를 누르면 실제로
//     카드가 뒤집히고 포커스는 그대로인가", "재시작 버튼을 누르면 실제 DOM/포커스가
//     초기화되는가"만 관찰한다 — dev 테스트는 이 실 인터랙션 결과를 전혀 다루지 않는다.
//
// ── 본 파일이 보호하는 대상 (BF-958 수용 기준) ─────────────────────────────
//   AC-KEY1-E2E : 방향키(Up/Down/Left/Right) 로 카드 사이 포커스가 실제로 이동하고
//                 roving tabindex(활성 카드만 tabindex=0) 가 함께 이동한다.
//   AC-KEY2-E2E : 그리드 모서리에서 바깥 방향 키는 포커스를 이동시키지 않는다
//                 (경계 클램프 — 래핑 없음).
//   AC-FLIP-E2E : Enter/Space 로 포커스된 카드를 뒤집을 수 있고(네이티브 button
//                 동작), 뒤집기·판정(일치/불일치) 도중에도 포커스가 해당 카드에서
//                 벗어나지 않는다(포커스 유지).
//   AC-RESTART-E2E : 진행 중(일부 매치·불일치 이력 존재) 상태에서 재시작하면
//                 카드 전체 hidden·이동 횟수 0회·타이머 00:00·완료 배너 hidden 으로
//                 되돌아가고, roving tabindex 도 첫 카드로 리셋되며, 재시작을 누른
//                 버튼(#restart-btn)에서 포커스가 보드로 강탈되지 않는다(focus
//                 stealing 방지, design §5.3). 재시작 후에도 방향키 이동이 새
//                 카드 DOM 에 대해 정상 동작한다(회귀: buildBoard 재생성 후 배선 유지).
//
// 결정론 확보 기법 (순수 로직 재검증 아님 — 좌표 확보용, BF-921 과 동일 기법):
//   main.js 는 카드 상태(hidden 포함)와 무관하게 각 버튼에 data-pair 속성을 항상
//   기록한다. 셔플 자체(dev 검증 영역)를 재검증하지 않고, 이 속성을 "블랙박스
//   좌표"로 읽어 같은 짝/다른 짝 카드를 선택한다 — RNG 가로채기/시드 주입 없음.
//   포커스 대상 카드는 page.locator(...).focus() 로 직접 지정한다(실제 사용자가
//   Tab 으로 그 카드까지 이동했다고 가정하는 것과 동일한 최종 포커스 상태 — 방향키
//   자체의 이동 정확성은 별도 STEP 에서 인접 카드 이동으로 직접 검증한다).
//
// 실행: node --test tests/e2e/memory-match/keyboard-navigation-restart-focus.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/e2e/memory-match/keyboard-navigation-restart-focus.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "memory-match";
const TEST_MODULE = process.env.BRIX_TEST_MODULE;
const MODULE_SKIP =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  TEST_MODULE != null &&
  TEST_MODULE !== _BRIX_MY_MODULE;
const E2E_SKIP = process.env.BRIX_E2E_SKIP === "1";

if (MODULE_SKIP) {
  describe("BF-958 (module scope skip)", () => {
    test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) =>
      t.skip(`BRIX_TEST_MODULE=${TEST_MODULE} ≠ memory-match — BF-958 가드 스킵`));
  });
} else {
  // ─────────────────────────────────────────────────────────────
  // E2E 헬퍼 (기존 e2e 가드와 동일 패턴 — tests/e2e/memory-match/render-flip-match-complete.test.js 참고)
  // ─────────────────────────────────────────────────────────────
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

  function personaHost() {
    return (
      process.env.BRIX_PERSONA_HOST ?? process.env.BRIX_WORKER_HOSTNAME ?? "worker"
    );
  }

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
    return new Promise((resolve) => server.listen(0, "0.0.0.0", () => resolve(server)));
  }

  if (E2E_SKIP) {
    test("[E2E] BF-958 BRIX_E2E_SKIP=1 — 전체 E2E skip (CI 결정성)", (t) =>
      t.skip("BRIX_E2E_SKIP=1"));
  } else {
    // ═══════════════════════════════════════════════════════════
    // E2E — 방향키 이동(경계 클램프) → Enter/Space 뒤집기(포커스 유지) →
    //       재시작(카드/이동횟수/완료배너 초기화 + 포커스 stealing 방지 + 재배선 확인)
    // ═══════════════════════════════════════════════════════════
    test(
      "BF-958 E2E: 방향키 이동(경계 클램프)→Enter/Space 뒤집기(포커스 유지)→재시작(초기화+포커스 보존+재배선)",
      async (t) => {
        if (!(await e2eRunnerReachable(t))) return;

        const server = await startStaticServer(REPO_ROOT);
        const port = server.address().port;
        const selfHost = personaHost();

        try {
          const url = `http://${selfHost}:${port}/phase18-games/memory-match/`;
          const scriptText = `
            const consoleErrors = [];
            page.on('console', (msg) => {
              if (msg.type() === 'error') consoleErrors.push(msg.text());
            });
            page.on('pageerror', (err) => {
              consoleErrors.push('pageerror: ' + (err && err.message ? err.message : String(err)));
            });

            // 현재 DOM 포커스가 #board .card 중 몇 번째 인덱스인지(없으면 -1)
            async function activeCardIndex() {
              return await page.evaluate(() =>
                Array.from(document.querySelectorAll('#board .card')).indexOf(document.activeElement)
              );
            }
            async function cardTabIndex(i) {
              return await page.evaluate(
                (idx) => document.querySelectorAll('#board .card')[idx].getAttribute('tabindex'),
                i
              );
            }
            async function cardState(i) {
              return await page.evaluate(
                (idx) => document.querySelectorAll('#board .card')[idx].dataset.state,
                i
              );
            }

            // ── STEP 1: 진입 → 16장 카드 렌더 대기 ──────────────────────────
            await page.goto('${url}');
            await page.waitForFunction(
              () => document.querySelectorAll('#board .card').length === 16,
              { timeout: 8000 }
            );
            console.log('[step1] 16장 카드 렌더 OK');

            // ── STEP 2 (AC-KEY1): 초기 roving tabindex — 카드0만 tabindex=0 ──
            const initialTab0 = await cardTabIndex(0);
            const initialTab1 = await cardTabIndex(1);
            if (initialTab0 !== '0') {
              throw new Error('AC-KEY1 회귀: 초기 활성 카드(인덱스0) tabindex 가 0 이 아님 — ' + initialTab0);
            }
            if (initialTab1 !== '-1') {
              throw new Error('AC-KEY1 회귀: 초기 비활성 카드(인덱스1) tabindex 가 -1 이 아님 — ' + initialTab1);
            }
            console.log('[step2] 초기 roving tabindex OK — 카드0=0, 카드1=-1');

            // ── STEP 3 (AC-KEY1): 카드0 에 포커스 후 방향키 이동 ─────────────
            await page.locator('#board .card').nth(0).focus();
            let idx = await activeCardIndex();
            if (idx !== 0) throw new Error('STEP3 사전조건 실패: 카드0 포커스 안 됨, idx=' + idx);

            await page.keyboard.press('ArrowRight'); // 0 -> 1
            idx = await activeCardIndex();
            if (idx !== 1) throw new Error('AC-KEY1 회귀: ArrowRight 후 포커스가 인덱스1 로 이동하지 않음 — idx=' + idx);
            if ((await cardTabIndex(0)) !== '-1' || (await cardTabIndex(1)) !== '0') {
              throw new Error('AC-KEY1 회귀: ArrowRight 후 roving tabindex 가 카드1 로 이동하지 않음');
            }
            console.log('[step3] ArrowRight OK — 0->1, tabindex 동반 이동 확인');

            await page.keyboard.press('ArrowDown'); // 1 -> 5 (4열 그리드)
            idx = await activeCardIndex();
            if (idx !== 5) throw new Error('AC-KEY1 회귀: ArrowDown 후 포커스가 인덱스5 로 이동하지 않음 — idx=' + idx);
            console.log('[step3] ArrowDown OK — 1->5');

            await page.keyboard.press('ArrowLeft'); // 5 -> 4
            idx = await activeCardIndex();
            if (idx !== 4) throw new Error('AC-KEY1 회귀: ArrowLeft 후 포커스가 인덱스4 로 이동하지 않음 — idx=' + idx);
            console.log('[step3] ArrowLeft OK — 5->4');

            await page.keyboard.press('ArrowUp'); // 4 -> 0
            idx = await activeCardIndex();
            if (idx !== 0) throw new Error('AC-KEY1 회귀: ArrowUp 후 포커스가 인덱스0 으로 이동하지 않음 — idx=' + idx);
            console.log('[step3] ArrowUp OK — 4->0 (사각형 이동 경로 왕복 확인)');

            // ── STEP 4 (AC-KEY2): 좌상단 모서리(0) — 바깥 방향은 클램프(불변) ──
            await page.keyboard.press('ArrowUp');
            idx = await activeCardIndex();
            if (idx !== 0) throw new Error('AC-KEY2 회귀: 모서리(0)에서 ArrowUp 이 포커스를 이동시킴 — idx=' + idx);
            await page.keyboard.press('ArrowLeft');
            idx = await activeCardIndex();
            if (idx !== 0) throw new Error('AC-KEY2 회귀: 모서리(0)에서 ArrowLeft 가 포커스를 이동시킴 — idx=' + idx);
            console.log('[step4] AC-KEY2 OK — 모서리(0)에서 Up/Left 클램프(포커스 불변) 확인');

            // ── STEP 5: pair 좌표 수집 (data-pair — main.js 가 hidden 상태에도
            //            항상 기록하는 블랙박스 좌표. RNG 가로채기 아님) ──────
            const pairMap = await page.evaluate(() => {
              const cards = Array.from(document.querySelectorAll('#board .card'));
              const map = {};
              cards.forEach((c, i) => {
                const p = c.dataset.pair;
                if (!map[p]) map[p] = [];
                map[p].push(i);
              });
              return map;
            });
            const entries = Object.entries(pairMap);
            if (entries.length !== 8 || entries.some(([, idxs]) => idxs.length !== 2)) {
              throw new Error('사전조건 회귀: data-pair 로 수집한 짝 구조가 8쌍x2 가 아님: ' + JSON.stringify(pairMap));
            }
            const p0 = entries.find(([, idxs]) => idxs.includes(0));
            const p0Id = p0[0];
            const p0Partner = p0[1].find((i) => i !== 0);
            const otherEntries = entries.filter(([id]) => id !== p0Id);
            const mismatchA = otherEntries[0][1][0];
            const mismatchB = otherEntries[1][1][0]; // 서로 다른 pairId — 항상 불일치
            console.log('[step5] pair 좌표 수집 OK — p0Partner=' + p0Partner + ', mismatchA=' + mismatchA + ', mismatchB=' + mismatchB);

            // ── STEP 6 (AC-FLIP, 일치): 카드0 Enter 로 뒤집기, 포커스 유지 확인 ──
            // 현재 포커스는 STEP4 에서 카드0 에 있음 (모서리 클램프 검증 후 그대로).
            await page.keyboard.press('Enter');
            const s0 = await cardState(0);
            if (s0 !== 'revealed') throw new Error('AC-FLIP 회귀: 카드0 에서 Enter 를 눌러도 revealed 로 전환되지 않음 — state=' + s0);
            idx = await activeCardIndex();
            if (idx !== 0) throw new Error('AC-FLIP 회귀: Enter 로 뒤집은 직후 포커스가 카드0 에서 벗어남(포커스 유지 위반) — idx=' + idx);
            console.log('[step6] AC-FLIP(Enter, 일치 준비) OK — 카드0 revealed 전환 + 포커스 유지');

            // p0Partner 로 이동(Tab 으로 도달했다고 가정) 후 Space 로 뒤집기 → 즉시 matched
            await page.locator('#board .card').nth(p0Partner).focus();
            await page.keyboard.press('Space');
            const sPartner = await cardState(p0Partner);
            const s0AfterMatch = await cardState(0);
            if (sPartner !== 'matched' || s0AfterMatch !== 'matched') {
              throw new Error('AC-FLIP 회귀: 같은 짝 Enter+Space 뒤집기 후 즉시 matched 로 고정되지 않음 — 카드0=' + s0AfterMatch + ', partner=' + sPartner);
            }
            idx = await activeCardIndex();
            if (idx !== p0Partner) {
              throw new Error('AC-FLIP 회귀: Space 로 일치 판정된 직후 포커스가 해당 카드에서 벗어남(포커스 유지 위반) — idx=' + idx + ', expected=' + p0Partner);
            }
            const movesAfterMatch = await page.evaluate(() => document.getElementById('move-count').textContent);
            if (movesAfterMatch !== '1회') {
              throw new Error('AC-FLIP 회귀: 키보드로 1쌍 매치 후 이동 횟수가 1회 가 아님 — ' + movesAfterMatch);
            }
            console.log('[step6] AC-FLIP(Space, 일치) OK — 즉시 matched 고정 + 포커스 유지 + 이동 1회 반영');

            // ── STEP 7 (AC-FLIP, 불일치): Enter+Space 로 서로 다른 짝 뒤집기 →
            //            포커스는 마지막 조작 카드에 유지된 채로 800ms 뒤 hidden 복귀 ──
            await page.locator('#board .card').nth(mismatchA).focus();
            await page.keyboard.press('Enter');
            if ((await cardState(mismatchA)) !== 'revealed') {
              throw new Error('AC-FLIP 회귀: mismatchA 에서 Enter 로 뒤집기 실패');
            }
            await page.locator('#board .card').nth(mismatchB).focus();
            await page.keyboard.press('Space');
            const movesAfterMismatchInput = await page.evaluate(() => document.getElementById('move-count').textContent);
            if (movesAfterMismatchInput !== '2회') {
              throw new Error('AC-FLIP 회귀: 두번째(불일치) 키보드 입력 직후 이동 횟수가 2회 로 반영되지 않음 — ' + movesAfterMismatchInput);
            }
            idx = await activeCardIndex();
            if (idx !== mismatchB) {
              throw new Error('AC-FLIP 회귀: 불일치 판정 대기(checking) 중 포커스가 mismatchB 에서 벗어남 — idx=' + idx);
            }
            await page.waitForFunction(
              (args) => {
                const cards = document.querySelectorAll('#board .card');
                return cards[args.a].dataset.state === 'hidden' && cards[args.b].dataset.state === 'hidden';
              },
              { a: mismatchA, b: mismatchB },
              { timeout: 3000 }
            );
            idx = await activeCardIndex();
            if (idx !== mismatchB) {
              throw new Error('AC-FLIP 회귀: 800ms 뒤 hidden 복귀 후에도 포커스가 mismatchB 에 유지되어야 함(포커스 유지 위반) — idx=' + idx);
            }
            console.log('[step7] AC-FLIP(불일치) OK — Enter+Space 로 불일치 입력, 이동 2회 반영, hidden 복귀 전 과정에서 포커스 유지');

            // ── STEP 8 (AC-RESTART): 재시작 버튼 Enter → 카드/이동횟수/배너 초기화 ──
            await page.locator('#restart-btn').focus();
            await page.keyboard.press('Enter');
            await page.waitForFunction(
              () => document.getElementById('move-count').textContent === '0회',
              { timeout: 3000 }
            );
            const afterRestart = await page.evaluate(() => ({
              cardCount: document.querySelectorAll('#board .card').length,
              allHidden: Array.from(document.querySelectorAll('#board .card')).every(
                (c) => c.dataset.state === 'hidden'
              ),
              moveCount: document.getElementById('move-count').textContent,
              timer: document.getElementById('timer').textContent,
              winBannerHidden: document.getElementById('win-banner').hasAttribute('hidden'),
              activeId: document.activeElement ? document.activeElement.id : null,
            }));
            console.log('[step8] 재시작 후 상태:', JSON.stringify(afterRestart));
            if (afterRestart.cardCount !== 16 || !afterRestart.allHidden) {
              throw new Error('AC-RESTART 회귀: 재시작 후 16장 전부 hidden 으로 재생성되지 않음: ' + JSON.stringify(afterRestart));
            }
            if (afterRestart.moveCount !== '0회') {
              throw new Error('AC-RESTART 회귀: 재시작 후 이동 횟수가 0회 로 초기화되지 않음 — ' + afterRestart.moveCount);
            }
            if (afterRestart.timer !== '00:00') {
              throw new Error('AC-RESTART 회귀: 재시작 후 타이머가 00:00 으로 초기화되지 않음 — ' + afterRestart.timer);
            }
            if (!afterRestart.winBannerHidden) {
              throw new Error('AC-RESTART 회귀: 재시작 후 완료 배너가 hidden 상태가 아님');
            }
            if (afterRestart.activeId !== 'restart-btn') {
              throw new Error('AC-RESTART 회귀: 재시작 버튼을 누른 직후 포커스가 보드로 강탈됨(focus stealing) — activeElement=' + afterRestart.activeId);
            }
            console.log('[step8] AC-RESTART OK — 카드/이동횟수/타이머/완료배너 초기화 + 재시작 버튼에 포커스 유지(stealing 방지)');

            // ── STEP 9 (AC-KEY1, 재배선 회귀): 재시작 후 roving tabindex 리셋 + 방향키 재동작 ──
            if ((await cardTabIndex(0)) !== '0') {
              throw new Error('AC-RESTART 회귀: 재시작 후 카드0 의 roving tabindex 가 0 으로 리셋되지 않음');
            }
            if ((await cardTabIndex(1)) !== '-1') {
              throw new Error('AC-RESTART 회귀: 재시작 후 카드1 의 roving tabindex 가 -1 이 아님(활성 인덱스 리셋 실패)');
            }
            await page.locator('#board .card').nth(0).focus();
            await page.keyboard.press('ArrowRight');
            idx = await activeCardIndex();
            if (idx !== 1) {
              throw new Error('AC-KEY1 회귀: 재시작으로 재생성된 보드에서 ArrowRight 가 동작하지 않음(재배선 실패) — idx=' + idx);
            }
            console.log('[step9] AC-KEY1(재배선) OK — 재시작 후 roving tabindex 리셋 + 새 보드에서 방향키 정상 동작');

            // ── STEP 10: 콘솔/페이지 에러 0건 ──────────────────────────────
            if (consoleErrors.length > 0) {
              throw new Error('콘솔/페이지 에러 ' + consoleErrors.length + '건 발생:\\n' + consoleErrors.slice(0, 5).join('\\n'));
            }

            console.log('[OK] BF-958: 방향키 이동(클램프)->Enter/Space 뒤집기(포커스 유지)->재시작(초기화+포커스 보존+재배선) 전체 통과');
          `;

          const res = await fetch("http://e2e-runner:3030/run", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
              "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-958",
            },
            body: JSON.stringify({
              url,
              label: "메모리 매치 방향키 이동(클램프)→Enter/Space 뒤집기(포커스 유지)→재시작(초기화) [BF-958]",
              scriptText,
              timeoutMs: 60000,
            }),
          });
          const json = await res.json();
          assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
          assert.ok(
            json.passed,
            `BF-958 E2E 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2500)}`,
          );
        } finally {
          await new Promise((resolve) => server.close(resolve));
        }
      },
    );
  } // end else (E2E_SKIP)
} // end else (MODULE_SKIP)
