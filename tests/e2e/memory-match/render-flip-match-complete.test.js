// tests/e2e/memory-match/render-flip-match-complete.test.js
// BF-921 · /phase18-games/memory-match 실 브라우저 E2E 회귀 가드 (테스터 소유)
//
// 보호 대상 (BF-921 수용 기준):
//   AC1-E2E — 페이지 렌더: 진입 시 타이틀·h1·16장 카드 보드(모두 hidden)·
//             HUD(이동 0회 · 타이머 00:00)·완료 배너(hidden) 가 표시된다.
//   AC2-E2E — 카드 뒤집기·일치판정: 1장 클릭 시 revealed 로 전환하고, 서로 다른
//             pair 2장을 클릭하면 이동 횟수가 즉시 반영되고 800ms 뒤 hidden 으로
//             복귀하며(불일치), 같은 pair 2장을 클릭하면 즉시 matched 로 고정된다.
//   AC3-E2E — 완료 표시: 8쌍을 모두 맞추면 완료 배너가 노출되고 이동 횟수·경과
//             시간이 내부 상태와 일치하게 표시되며, 완료 후 타이머가 더 이상
//             진행하지 않고(freeze) 다시하기 버튼으로 포커스가 이동한다.
//   AC4-E2E — 재시작: 다시하기 클릭 시 보드가 재생성되고 HUD/배너가 초기 상태로
//             되돌아간다.
//
// dev(BF-919) 가 이미 검증한 항목 (재작성 금지 — tests/memory-match-BF919.test.js):
//   shuffle/createDeck/createInitialState/flipCard/evaluateCheck 등 logic.js
//   순수 함수 정확성(node:vm 샌드박스, TC-01~TC-11), index.html 마크업 id
//   (board/move-count/timer/restart-btn/win-banner/win-restart-btn/announce),
//   styles.css 그리드·토큰·포커스 링, file:// CORS 안전 가드.
//   → 이 파일은 그 로직을 "블랙박스" 로만 사용하고 재검증하지 않는다.
//
// tester 고유 영역 (본 파일):
//   1. main.js 의 DOM 바인딩(카드 생성·클릭 핸들러·타이머 tick·승리 배너·재시작)은
//      dev 테스트가 전혀 다루지 않는다(순수 함수만 node:vm 으로 검증) — 실 브라우저
//      에서 "렌더 → 카드 클릭(불일치/일치) → 8쌍 완료 → 재시작" 전체 사용자 흐름이
//      실제로 이어지는지 검증한다.
//   2. id="win-moves"/"win-time" 존재 — dev 테스트는 win-banner/win-restart-btn
//      만 정규식으로 확인했고 이 두 id 는 미확인. 본 E2E 스크립트가
//      getElementById 로 직접 의존하므로 별도 정적 가드로 고정한다(§0).
//
// 결정론 확보 기법 (물리/난수 재검증 아님 — 순수 E2E 좌표 확보용):
//   main.js 는 렌더 시 카드 상태(hidden 포함)와 무관하게 각 카드 버튼에
//   data-pair 속성을 항상 기록한다(main.js syncCard). 셔플 자체(dev 검증 영역)를
//   재검증하지 않고, 이 data-pair 속성을 "블랙박스 좌표"로 읽어 같은 짝/다른 짝
//   카드를 골라 클릭한다 — RNG 를 가로채거나 시드를 주입하지 않는다.
//
// 실행: node --test tests/e2e/memory-match/render-flip-match-complete.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/e2e/memory-match/render-flip-match-complete.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const MODULE_DIR = path.join(REPO_ROOT, "phase18-games", "memory-match");

function readModuleFile(name) {
  return readFileSync(path.join(MODULE_DIR, name), "utf-8");
}

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
  describe("BF-921 (module scope skip)", () => {
    test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) =>
      t.skip(`BRIX_TEST_MODULE=${TEST_MODULE} ≠ memory-match — BF-921 가드 스킵`));
  });
} else {
  // ═══════════════════════════════════════════════════════════
  // §0. 정적 가드 — 본 E2E 스크립트가 직접 의존하는 selector (dev 미검증분만)
  // ═══════════════════════════════════════════════════════════
  describe("BF-921 §0 정적 가드 — E2E 스크립트 의존 selector", () => {
    test('§0-1 index.html — id="win-moves"/"win-time" 존재 (dev 테스트는 win-banner/win-restart-btn 만 확인, 본 E2E 의 getElementById 직접 의존 대상)', () => {
      const html = readModuleFile("index.html");
      assert.ok(
        /id=["']win-moves["']/.test(html),
        'index.html 에 id="win-moves" 가 없습니다 — BF-921 E2E 스크립트가 getElementById("win-moves") 로 의존합니다',
      );
      assert.ok(
        /id=["']win-time["']/.test(html),
        'index.html 에 id="win-time" 가 없습니다 — BF-921 E2E 스크립트가 getElementById("win-time") 로 의존합니다',
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // E2E 헬퍼 (기존 e2e 가드와 동일 패턴 — tests/e2e/pong/render-play-touch.test.js 참고)
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
      process.env.BRIX_PERSONA_HOST ??
      process.env.BRIX_WORKER_HOSTNAME ??
      "worker"
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

  // ─────────────────────────────────────────────────────────────
  // E2E skip 분기
  // ─────────────────────────────────────────────────────────────
  if (E2E_SKIP) {
    test("[E2E] BF-921 BRIX_E2E_SKIP=1 — 전체 E2E skip (CI 결정성)", (t) =>
      t.skip("BRIX_E2E_SKIP=1"));
  } else {
    // ═══════════════════════════════════════════════════════════
    // §1. E2E — 렌더 → 카드 뒤집기(불일치/일치) → 8쌍 완료(이동·타이머 표시) → 재시작
    // ═══════════════════════════════════════════════════════════
    test("BF-921 E2E §1: 렌더→카드 뒤집기(불일치→일치)→8쌍 완료(이동횟수·타이머)→재시작 전체 여정", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/phase18-games/memory-match/`;
        const scriptText = `
          const consoleErrors = [];
          page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });

          // ── STEP 1: 진입 → 16장 카드 렌더 대기 ──────────────────────────
          await page.goto('${url}');
          await page.waitForFunction(
            () => document.querySelectorAll('#board .card').length === 16,
            { timeout: 8000 }
          );
          console.log('[step1] 16장 카드 렌더 OK');

          // ── STEP 2 (AC1-E2E): 최초 렌더 — 타이틀·HUD·완료 배너(hidden) ───
          const initial = await page.evaluate(() => ({
            title: document.title,
            h1: document.querySelector('h1') ? document.querySelector('h1').textContent : '',
            moveCount: document.getElementById('move-count').textContent,
            timer: document.getElementById('timer').textContent,
            winBannerHidden: document.getElementById('win-banner').hasAttribute('hidden'),
            allHidden: Array.from(document.querySelectorAll('#board .card')).every(
              (c) => c.dataset.state === 'hidden'
            ),
          }));
          console.log('[step2] 초기 렌더 상태:', JSON.stringify(initial));
          if (!initial.title.includes('메모리 매치') || !initial.h1.includes('메모리 매치')) {
            throw new Error('AC1 회귀: 타이틀/h1 에 "메모리 매치" 가 없음: title="' + initial.title + '" h1="' + initial.h1 + '"');
          }
          if (initial.moveCount !== '0회' || initial.timer !== '00:00') {
            throw new Error('AC1 회귀: 초기 HUD 가 0회/00:00 이 아님 — moveCount=' + initial.moveCount + ' timer=' + initial.timer);
          }
          if (!initial.winBannerHidden) {
            throw new Error('AC1 회귀: 완료 배너가 초기부터 노출됨');
          }
          if (!initial.allHidden) {
            throw new Error('AC1 회귀: 초기 카드가 전부 hidden 상태가 아님');
          }
          console.log('[step2] AC1(렌더) OK — 타이틀/HUD(0회·00:00)/완료 배너(hidden)/카드 전부 hidden 확인');

          // ── STEP 3: pair 좌표 수집 (data-pair 속성 — main.js 가 hidden 상태에도
          //            항상 기록하는 블랙박스 좌표. RNG 가로채기 아님) ──────────
          const pairMap = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('#board .card'));
            const map = {};
            cards.forEach((c, idx) => {
              const p = c.dataset.pair;
              if (!map[p]) map[p] = [];
              map[p].push(idx);
            });
            return map;
          });
          const pairIds = Object.keys(pairMap);
          if (pairIds.length !== 8 || pairIds.some((p) => pairMap[p].length !== 2)) {
            throw new Error('AC2 회귀: data-pair 로 수집한 짝 구조가 8쌍x2 가 아님: ' + JSON.stringify(pairMap));
          }
          console.log('[step3] pair 좌표 수집 OK — 8쌍 확인');

          // ── STEP 4 (AC2-E2E): 1장 클릭 → revealed 전환 ─────────────────
          const firstIdx = pairMap[pairIds[0]][0];
          await page.locator('#board .card').nth(firstIdx).click();
          await page.waitForFunction(
            (i) => document.querySelectorAll('#board .card')[i].dataset.state === 'revealed',
            firstIdx,
            { timeout: 3000 }
          );
          console.log('[step4] AC2(1장 클릭) OK — revealed 전환 확인');

          // ── STEP 5 (AC2-E2E): 서로 다른 pair 2장 클릭 → 이동 반영→hidden 복귀(불일치) ──
          // firstIdx(pair[0])는 이미 revealed 상태 — 다른 pair 카드를 2번째로 클릭.
          const mismatchIdx = pairMap[pairIds[1]][0];
          await page.locator('#board .card').nth(mismatchIdx).click();
          await page.waitForFunction(
            () => document.getElementById('move-count').textContent === '1회',
            { timeout: 3000 }
          );
          console.log('[step5] 불일치 2번째 클릭 직후 이동 횟수 1회 반영 OK');
          await page.waitForFunction(
            (args) => {
              const cards = document.querySelectorAll('#board .card');
              return cards[args.a].dataset.state === 'hidden' && cards[args.b].dataset.state === 'hidden';
            },
            { a: firstIdx, b: mismatchIdx },
            { timeout: 3000 }
          );
          console.log('[step5] AC2(불일치) OK — 800ms 뒤 두 카드 hidden 복귀 확인');

          // ── STEP 6 (AC2-E2E): 같은 pair 2장 클릭 → 즉시 matched 고정 ────
          const [mA, mB] = pairMap[pairIds[2]];
          await page.locator('#board .card').nth(mA).click();
          await page.locator('#board .card').nth(mB).click();
          await page.waitForFunction(
            (args) => {
              const cards = document.querySelectorAll('#board .card');
              return cards[args.a].dataset.state === 'matched' && cards[args.b].dataset.state === 'matched';
            },
            { a: mA, b: mB },
            { timeout: 3000 }
          );
          console.log('[step6] AC2(일치) OK — 같은 pair 클릭 시 즉시 matched 고정 확인');

          // ── STEP 7 (AC3-E2E): 나머지 pair 모두 매치하여 8쌍 완료 ────────
          // 이미 처리한 pairIds[0]/[1](재도전 필요, hidden 복귀됨)/[2](완료) 를 제외한
          // 나머지 pair 를 순서대로 매치 → 마지막에 pairIds[0]/[1] 을 정식으로 매치.
          const remainingOrder = pairIds.slice(3).concat([pairIds[0], pairIds[1]]);
          for (const pid of remainingOrder) {
            const [a, b] = pairMap[pid];
            await page.locator('#board .card').nth(a).click();
            await page.locator('#board .card').nth(b).click();
            await page.waitForFunction(
              (args) => {
                const cards = document.querySelectorAll('#board .card');
                return cards[args.a].dataset.state === 'matched' && cards[args.b].dataset.state === 'matched';
              },
              { a, b },
              { timeout: 3000 }
            );
          }
          console.log('[step7] 나머지 pair 전부 매치 완료 (8쌍 전체 matched)');

          // ── STEP 8 (AC3-E2E): 완료 배너 — 이동 횟수·경과 시간 표시 ───────
          await page.waitForFunction(
            () => !document.getElementById('win-banner').hasAttribute('hidden'),
            { timeout: 5000 }
          );
          const winState = await page.evaluate(() => ({
            winMoves: document.getElementById('win-moves').textContent,
            winTime: document.getElementById('win-time').textContent,
            hudMoves: document.getElementById('move-count').textContent,
            activeId: document.activeElement ? document.activeElement.id : null,
          }));
          console.log('[step8] 완료 배너 상태:', JSON.stringify(winState));
          // 총 이동 횟수 = 불일치 1회 + 매치 8회 = 9
          if (winState.winMoves !== '9') {
            throw new Error('AC3 회귀: 완료 배너 이동 횟수 불일치 — 기대 9, 실제 ' + winState.winMoves);
          }
          if (winState.hudMoves !== '9회') {
            throw new Error('AC3 회귀: HUD 이동 횟수(' + winState.hudMoves + ') 가 9회 가 아님');
          }
          if (!/^\\d{2}:\\d{2}$/.test(winState.winTime)) {
            throw new Error('AC3 회귀: 완료 배너 경과 시간 형식이 mm:ss 가 아님: "' + winState.winTime + '"');
          }
          if (winState.activeId !== 'win-restart-btn') {
            throw new Error('AC3 회귀: 완료 시 포커스가 다시하기 버튼으로 이동하지 않음 — activeElement=' + winState.activeId);
          }
          console.log('[step8] AC3(완료 표시) OK — 이동 9회(배너·HUD 일치)·경과시간 mm:ss·포커스 이동 확인');

          // ── STEP 9 (AC3-E2E): 완료 후 타이머 정지(freeze) ────────────────
          await new Promise((r) => setTimeout(r, 400));
          const timerAfterWait = await page.evaluate(() => document.getElementById('timer').textContent);
          if (timerAfterWait !== winState.winTime) {
            throw new Error('AC3 회귀: 완료 후에도 타이머가 계속 진행됨 — 완료 시 ' + winState.winTime + ' → 400ms 후 ' + timerAfterWait);
          }
          console.log('[step9] AC3(타이머 정지) OK — 완료 후 타이머가 더 이상 진행하지 않음');

          // ── STEP 10 (AC4-E2E): 재시작 — 보드 재생성·HUD/배너 초기화 ──────
          await page.click('#win-restart-btn');
          await page.waitForFunction(
            () => document.getElementById('win-banner').hasAttribute('hidden'),
            { timeout: 3000 }
          );
          const afterRestart = await page.evaluate(() => ({
            cardCount: document.querySelectorAll('#board .card').length,
            allHidden: Array.from(document.querySelectorAll('#board .card')).every(
              (c) => c.dataset.state === 'hidden'
            ),
            moveCount: document.getElementById('move-count').textContent,
            timer: document.getElementById('timer').textContent,
          }));
          console.log('[step10] 재시작 후 상태:', JSON.stringify(afterRestart));
          if (afterRestart.cardCount !== 16 || !afterRestart.allHidden) {
            throw new Error('AC4 회귀: 재시작 후 16장 전부 hidden 으로 재생성되지 않음: ' + JSON.stringify(afterRestart));
          }
          if (afterRestart.moveCount !== '0회' || afterRestart.timer !== '00:00') {
            throw new Error('AC4 회귀: 재시작 후 HUD 가 0회/00:00 으로 초기화되지 않음: ' + JSON.stringify(afterRestart));
          }
          console.log('[step10] AC4(재시작) OK — 보드 재생성·HUD 초기화 확인');

          // ── STEP 11: 콘솔 에러 없음 확인 ────────────────────────────────
          console.log('[step11] 수집된 콘솔 에러:', JSON.stringify(consoleErrors));
          if (consoleErrors.length > 0) {
            throw new Error('콘솔 에러 ' + consoleErrors.length + '건 발생:\\n' + consoleErrors.slice(0, 3).join('\\n'));
          }

          console.log('[OK] BF-921: 렌더->카드뒤집기(불일치/일치)->8쌍 완료(이동·타이머)->재시작 전체 여정 통과');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-921",
          },
          body: JSON.stringify({
            url,
            label: "렌더→카드 뒤집기(불일치/일치)→8쌍 완료(이동·타이머)→재시작 전체 여정 [BF-921]",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `E2E §1 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });
  } // end else (E2E_SKIP)
} // end else (MODULE_SKIP)
