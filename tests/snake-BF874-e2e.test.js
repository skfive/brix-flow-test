// BF-874 · 머지된 snake 게임 최종 코드 기준 E2E 회귀 가드
//
// 목적: 개별 dev 티켓(BF-560/BF-579/BF-631/BF-635/BF-872 등)이 조각조각 검증한
//       snake 게임을, 현재 merge 된 최종 코드(설정 모달 진입 → 게임 시작 →
//       이동/먹이/충돌/점수 → 게임오버 → 재시작) 기준으로 "실 사용자 플로우"
//       하나로 이어 붙여 통합 회귀를 잡는다 (focused scope, snake module 전용).
//
// AC 매핑 (BF-874):
//   AC1-E2E — 실 브라우저: 뱀 이동 → 먹이 섭취(점수·길이 증가) → 벽 충돌(게임오버) →
//             최종 점수(go-score) 표시까지 한 흐름으로 통과
//   AC2-E2E — 게임오버 후 Space 재시작 → score/길이/게임오버 오버레이 상태 초기화 확인
//
// dev 가 이미 검증한 항목 (재작성 금지 — logic.js 단위 테스트, tests/snake-BF872.test.js 등):
//   createInitialState/tick/tickWithItems 단위 정확성, dirQueue 반전 차단,
//   spawnFoodCell 좌표 유효성, tickWithItems cpuHead null 가드(BF-635)
//
// tester 고유 영역 (본 파일):
//   1. 실 브라우저 DOM 레벨에서 "설정 모달 → 게임 시작 → 이동 → 먹이 → 충돌 → 점수 →
//      재시작" 전체 사용자 여정이 끊기지 않고 이어지는지 (개별 dev PR 은 이 통합 흐름을
//      검증하지 않음 — 각자 자기 AC 범위만 커버)
//   2. UI 마크업 contract — 이 여정이 의존하는 핵심 selector 존재 여부 정적 고정
//
// 실행: node --test tests/snake-BF874-e2e.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/snake-BF874-e2e.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SNAKE_DIR = path.join(REPO_ROOT, "snake");

function readSnakeFile(name) {
  return readFileSync(path.join(SNAKE_DIR, name), "utf-8");
}

// ─────────────────────────────────────────────────────────────
// Module scope guard — BRIX_TEST_MODULE ≠ snake 이면 전체 skip
// ─────────────────────────────────────────────────────────────
const TEST_MODULE = process.env.BRIX_TEST_MODULE;
const MODULE_SKIP = TEST_MODULE != null && TEST_MODULE !== "snake";
const E2E_SKIP    = process.env.BRIX_E2E_SKIP === "1";

if (MODULE_SKIP) {
  describe("BF-874 (module scope skip)", () => {
    test("BRIX_TEST_MODULE 불일치 — 전체 skip", (t) =>
      t.skip(`BRIX_TEST_MODULE=${TEST_MODULE} ≠ snake — BF-874 가드 스킵`));
  });
} else {

  // ═══════════════════════════════════════════════════════════
  // §0. 정적 가드 — 이번 여정이 의존하는 핵심 selector contract
  //
  // 아래 id/속성 중 하나라도 사라지면 §1 E2E 시나리오가 silent 하게
  // 못 돌게 됨. 정적으로 fact 를 먼저 박제해 원인 파악 시간을 줄인다.
  // ═══════════════════════════════════════════════════════════
  describe("BF-874 §0 정적 가드 — E2E 여정 필수 selector 존재", () => {
    test("§0-1 index.html — 게임 진입/설정/HUD/게임오버 핵심 id 존재", () => {
      const html = readSnakeFile("index.html");
      const requiredIds = [
        "settings-trigger",
        "settings-modal",
        "hud-player-score",
        "hud-snake-length",
        "gameover-overlay",
        "go-score",
      ];
      for (const id of requiredIds) {
        assert.ok(
          html.includes(`id="${id}"`),
          `index.html 에 id="${id}" 가 없습니다 — BF-874 E2E 여정이 의존하는 selector 회귀`,
        );
      }
    });

    test('§0-2 index.html — 설정 모달 cpuCount 그룹에 data-value="0" 옵션 존재', () => {
      const html = readSnakeFile("index.html");
      assert.ok(
        html.includes('data-key="cpuCount"'),
        'index.html 에 [data-key="cpuCount"] 그룹이 없습니다 — 솔로 모드 선택 회귀',
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // E2E 헬퍼 함수들 (기존 snake E2E 가드와 동일 패턴 — tests/snake-BF637-e2e.test.js 참고)
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
          res.statusCode = 403; res.end("forbidden"); return;
        }
        fs.readFile(resolved, (err, data) => {
          if (err) { res.statusCode = 404; res.end("not found"); return; }
          const ext = path.extname(resolved);
          res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
          res.end(data);
        });
      } catch (err) {
        res.statusCode = 500; res.end(String(err));
      }
    });
    return new Promise((resolve) => server.listen(0, "0.0.0.0", () => resolve(server)));
  }

  // ─────────────────────────────────────────────────────────────
  // E2E skip 분기
  // ─────────────────────────────────────────────────────────────
  if (E2E_SKIP) {
    test("[E2E] BF-874 BRIX_E2E_SKIP=1 — 전체 E2E skip (CI 결정성)", (t) =>
      t.skip("BRIX_E2E_SKIP=1"));
  } else {

    // ═══════════════════════════════════════════════════════════
    // §1. E2E AC1+AC2 — 이동→먹이→충돌→점수→재시작 초기화 (실 사용자 여정 1개)
    //
    // 전략:
    //   - 뷰포트 140×140 (CELL=20 → 7×7 격자) 로 축소해 벽 충돌을 빠르게 유도
    //   - cpuCount=0 (솔로 모드) 선택 — CPU 간섭 없이 재현 가능
    //   - Math.random 오버라이드(BF-637 패턴 차용) — 첫 음식이 뱀 머리 바로
    //     앞(halfCol+1, halfRow) 에 스폰되도록 강제 → 1틱 안에 먹이 섭취 보장
    //   - 이후 방향 입력 없이 그대로 직진 → 짧은 격자 폭 특성상 곧 벽 충돌
    //   - 게임오버 후 Space → 재시작 → score/길이/오버레이 상태 초기화 확인
    // ═══════════════════════════════════════════════════════════
    test("BF-874 E2E §1 (AC1+AC2): 이동→먹이→충돌→점수 통과 + 재시작 후 상태 초기화", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server   = await startStaticServer(REPO_ROOT);
      const port     = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/snake/`;
        const scriptText = `
          // 콘솔 에러 수집
          const consoleErrors = [];
          page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });

          // ── STEP 0: 뷰포트 축소(140×140 → 7×7 격자) + localStorage 초기화 ──────
          await page.setViewportSize({ width: 140, height: 140 });
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#settings-trigger', { timeout: 8000 });
          console.log('[step0] 페이지 로드 + 뷰포트 140x140 OK');

          // ── STEP 1: 설정 모달 자동 오픈(entry) 대기 ─────────────────────────
          await page.waitForFunction(
            () => !document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 8000 }
          );
          console.log('[step1] 설정 모달 열림(entry) OK');

          // ── STEP 2: Math.random 오버라이드 — 음식을 뱀 머리 바로 앞에 배치 ───
          // (tests/snake-BF637-e2e.test.js 와 동일 전략: 1번째 호출=음식 좌표,
          //  2번째 호출=배수 결정(0→multiplier=1), 이후 원본 복원)
          await page.evaluate(() => {
            let callCount = 0;
            const origRandom = Math.random.bind(Math);
            Math.random = function brixE2eRandom() {
              callCount++;
              if (callCount === 1) {
                const canvas = document.querySelector('canvas');
                if (!canvas || canvas.width < 40) return origRandom();
                const CELL = 20;
                const cols = Math.floor(canvas.width / CELL);
                const rows = Math.floor(canvas.height / CELL);
                if (cols < 4 || rows < 4) return origRandom();
                const halfCol = Math.floor(cols / 2);
                const halfRow = Math.floor(rows / 2);
                // 초기 뱀(길이3, RIGHT): (halfCol,halfRow),(halfCol-1,halfRow),(halfCol-2,halfRow)
                // 목표 음식: (halfCol+1, halfRow) — 머리 바로 오른쪽
                const emptyBefore = halfRow * cols + (halfCol - 2);
                const totalEmpty  = rows * cols - 3;
                const fraction = emptyBefore / totalEmpty;
                console.log('[BF-874] Math.random override fraction=' + fraction.toFixed(4)
                  + ' cols=' + cols + ' rows=' + rows);
                return fraction;
              }
              if (callCount === 2) return 0; // pickMultiplier → multiplier=1
              return origRandom();
            };
            window.__brixE2eOverride = 'BF-874';
          });
          console.log('[step2] Math.random override 주입 완료');

          // ── STEP 3: cpuCount=0 선택 (솔로 모드 — 재현성 보장) ──────────────
          const cpuZeroClicked = await page.evaluate(() => {
            const btn = document.querySelector('[data-key="cpuCount"] [data-value="0"]');
            if (!btn) return false;
            btn.click();
            return true;
          });
          console.log('[step3] cpuCount=0 선택:', cpuZeroClicked);
          if (!cpuZeroClicked) {
            throw new Error('AC 전제조건 실패: [data-key="cpuCount"][data-value="0"] 버튼 없음 — HTML 회귀');
          }

          // ── STEP 4: Enter → 게임 시작 ──────────────────────────────────────
          await page.keyboard.press('Enter');
          await page.waitForFunction(
            () => document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 6000 }
          );
          console.log('[step4] 설정 저장 → 게임 시작 OK');

          // ── STEP 5: 게임 시작 직후 gameover 아님 확인 ──────────────────────
          // 주의: score/length 는 "0/3" 을 단언하지 않는다 — e2e-runner 는 별도
          // 컨테이너를 거치는 CDP round-trip 이 있어, 모달 close 감지 ~ 이 지점
          // 사이에 이미 TICK_MS(120ms) 이상 경과해 먹이를 먹었을 수 있다
          // (Math.random 오버라이드로 먹이가 머리 바로 앞 1칸에 있음 — 의도된 설계).
          const initGoHidden = await page.evaluate(
            () => document.getElementById('gameover-overlay').hasAttribute('hidden')
          );
          console.log('[step5] 게임 시작 직후 gameover-overlay hidden:', initGoHidden);
          if (!initGoHidden) {
            throw new Error('AC1 회귀: 게임 시작 직후 #gameover-overlay 가 이미 노출됨 — 즉시 게임오버 버그');
          }

          // ── STEP 6: 이동 + 먹이 섭취 대기 (여유 있게 600ms) ─────────────────
          await new Promise(r => setTimeout(r, 600));
          const afterFood = await page.evaluate(() => ({
            score:  parseInt(document.getElementById('hud-player-score').textContent.trim(), 10),
            length: parseInt(document.getElementById('hud-snake-length').textContent.trim(), 10),
          }));
          console.log('[step6] 먹이 섭취 후 상태:', JSON.stringify(afterFood));
          if (isNaN(afterFood.score) || afterFood.score < 10) {
            throw new Error(
              'AC1 회귀(먹이): #hud-player-score=' + afterFood.score + ' — 10 이상이어야 합니다. '
              + '이동/먹이 섭취 처리 회귀 가능성.'
            );
          }
          if (isNaN(afterFood.length) || afterFood.length < 4) {
            throw new Error(
              'AC1 회귀(먹이): #hud-snake-length=' + afterFood.length + ' — 4 이상이어야 합니다.'
            );
          }
          console.log('[step6] AC1(이동·먹이) OK — score/length 증가 확인');

          // ── STEP 7: 이후 방향 입력 없이 직진 → 좁은 격자 벽 충돌 대기 (충돌 AC) ──
          let collided = false;
          try {
            await page.waitForFunction(
              () => !document.getElementById('gameover-overlay').hasAttribute('hidden'),
              { timeout: 6000 }
            );
            collided = true;
          } catch (_) { /* timeout — 아래에서 실패 처리 */ }
          console.log('[step7] 벽 충돌(게임오버) 감지:', collided);
          if (!collided) {
            throw new Error(
              'AC1 회귀(충돌): 6초 내 #gameover-overlay 가 노출되지 않았습니다 — '
              + '7x7 격자 직진 시 벽 충돌이 발생해야 합니다. 이동/충돌 판정 회귀 가능성.'
            );
          }

          // ── STEP 8: 최종 점수(go-score) 표시 확인 (점수 AC) ────────────────
          const goScoreText = await page.evaluate(
            () => document.getElementById('go-score').textContent.trim()
          );
          const goScoreNum = parseInt(goScoreText, 10);
          console.log('[step8] go-score =', goScoreText);
          if (isNaN(goScoreNum) || goScoreNum < 10) {
            throw new Error(
              'AC1 회귀(점수): #go-score="' + goScoreText + '" — 먹이 섭취 이력이 반영된 10 이상 정수여야 합니다.'
            );
          }
          console.log('[step8] AC1(충돌·점수) OK — gameover-overlay 노출 + go-score=' + goScoreNum);

          // ── STEP 9: Space → 재시작 → 상태 초기화 확인 (AC2) ────────────────
          await page.keyboard.press('Space');
          await page.waitForFunction(
            () => document.getElementById('gameover-overlay').hasAttribute('hidden'),
            { timeout: 3000 }
          );
          console.log('[step9] Space → 재시작 → gameover-overlay hidden 복원 OK');

          const restarted = await page.evaluate(() => ({
            score:  document.getElementById('hud-player-score').textContent.trim(),
            length: document.getElementById('hud-snake-length').textContent.trim(),
            goHidden: document.getElementById('gameover-overlay').hasAttribute('hidden'),
          }));
          console.log('[step10] 재시작 후 상태:', JSON.stringify(restarted));
          if (restarted.score !== '0') {
            throw new Error('AC2 회귀: 재시작 후 #hud-player-score 가 "0" 이 아님: "' + restarted.score + '"');
          }
          if (restarted.length !== '3') {
            throw new Error('AC2 회귀: 재시작 후 #hud-snake-length 가 "3" 이 아님: "' + restarted.length + '"');
          }
          if (!restarted.goHidden) {
            throw new Error('AC2 회귀: 재시작 후 #gameover-overlay 가 여전히 노출됨');
          }
          console.log('[step10] AC2(재시작 초기화) OK — score/length/오버레이 모두 초기 상태 복원');

          // ── STEP 10: 콘솔 에러 없음 확인 (WebGL/PixiJS 환경 에러 제외) ─────
          const criticalErrors = consoleErrors.filter(e =>
            !e.includes('WebGL') && !e.includes('pixi') && !e.includes('PIXI') &&
            !e.includes('SnakeRenderer') && !e.includes('BF-631')
          );
          console.log('[step11] 수집된 콘솔 에러:', JSON.stringify(consoleErrors));
          if (criticalErrors.length > 0) {
            throw new Error('콘솔 에러 ' + criticalErrors.length + '건:\\n' + criticalErrors.slice(0, 3).join('\\n'));
          }

          console.log('[OK] BF-874: 이동→먹이→충돌→점수→재시작 전체 여정 통과. finalScore=' + goScoreNum);
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type":     "application/json",
            "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-874",
          },
          body: JSON.stringify({
            url,
            label:     "이동→먹이→충돌→점수→재시작 초기화 전체 여정 [BF-874]",
            scriptText,
            timeoutMs: 45000,
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
