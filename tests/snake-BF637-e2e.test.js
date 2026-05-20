// BF-637 · E2E 회귀 가드 — snake 아이템 먹기·점수·길이·재배치 DOM 검증
//
// dev(BF-635) 가 이미 검증한 항목 — 재작성 금지:
//   tickWithItems() TypeError 방지, 점수/길이 증가 단위 로직,
//   새 음식 좌표 유효성, 좌표 정수화, 음식 좌표 불일치 시 미먹음
//
// tester 고유 영역:
//   1. 정적 가드 — BF-635 cpuHead null 가드 코드 존재 (logic.js + index.html IIFE)
//   2. E2E AC1 — 실 브라우저에서 음식 먹은 후 #hud-player-score / #hud-snake-length DOM 증가
//   3. E2E AC2 — 음식 재배치 확인 (ms-count 총합 ≥ 2, gameover-overlay hidden)
//   4. E2E AC3 — CI 재현성 (동일 시나리오 2회차 통과)
//
// 실행: node --test tests/snake-BF637-e2e.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/snake-BF637-e2e.test.js

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
  describe("BF-637 (module scope skip)", () => {
    test("BRIX_TEST_MODULE 불일치 — 전체 skip", (t) =>
      t.skip(`BRIX_TEST_MODULE=${TEST_MODULE} ≠ snake — BF-637 가드 스킵`));
  });
} else {

  // ═══════════════════════════════════════════════════════════
  // §0. 정적 가드 — BF-635 cpuHead null 가드 코드 존재 확인
  //
  // dev(BF-635) 의 핵심 수정이 코드베이스에 남아 있는지 fact 박제.
  // 향후 같은 버그가 리그레시션 되면 즉시 감지.
  // ═══════════════════════════════════════════════════════════
  describe("BF-637 §0 정적 가드 — BF-635 cpuHead null 가드 존재", () => {

    test("§0-1 logic.js — cpuHead null 가드 라인 존재", () => {
      const src = readSnakeFile("logic.js");
      assert.ok(
        src.includes("s.cpu.length > 0 ? s.cpu[0] : null"),
        "logic.js 에 'cpuHead = s.cpu.length > 0 ? s.cpu[0] : null' 패턴이 없습니다 — BF-635 null 가드 회귀"
      );
    });

    test("§0-2 logic.js — canMoveCpu 플래그 존재", () => {
      const src = readSnakeFile("logic.js");
      assert.ok(
        src.includes("canMoveCpu = moveCpu && cpuHead !== null"),
        "logic.js 에 'canMoveCpu = moveCpu && cpuHead !== null' 패턴이 없습니다 — BF-635 null 가드 회귀"
      );
    });

    test("§0-3 index.html IIFE — cpuHead null 가드 라인 존재", () => {
      const html = readSnakeFile("index.html");
      assert.ok(
        html.includes("s.cpu.length > 0 ? s.cpu[0] : null"),
        "index.html 인라인 IIFE 에 cpuHead null 가드 패턴이 없습니다 — BF-635 인라인 패치 회귀"
      );
    });

    test("§0-4 index.html IIFE — canMoveCpu && !playerAteFood 조합 존재 (AC1 핵심)", () => {
      const html = readSnakeFile("index.html");
      // BF-635 수정: cpuAteFood 판단에 canMoveCpu 가드 적용
      assert.ok(
        html.includes("canMoveCpu && !playerAteFood"),
        "index.html IIFE 에 'canMoveCpu && !playerAteFood' 조건이 없습니다 — BF-635 cpuAteFood 가드 회귀"
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // E2E 헬퍼 함수들
  // ─────────────────────────────────────────────────────────────

  /** e2e-runner 도달 가능 여부 확인 (2초 타임아웃) */
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

  /** persona host 결정 (localhost 금지) */
  function personaHost() {
    return (
      process.env.BRIX_PERSONA_HOST ??
      process.env.BRIX_WORKER_HOSTNAME ??
      "worker"
    );
  }

  /** 정적 파일 HTTP 서버 구동 (0.0.0.0, random port) */
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
  // 공통 E2E 시나리오 scriptText 생성
  //
  // Math.random 오버라이드 전략:
  //   - initGame() → resizeCanvas() → createInitialState() → spawnFoodCell() 순으로 실행
  //   - spawnFoodCell() 의 첫 번째 Math.random() 호출: 음식 좌표 결정
  //     → canvas.width/height 로 grid 크기 계산 → halfCol+1, halfRow 위치(뱀 머리 바로 앞)
  //   - 두 번째 Math.random() 호출: pickMultiplier() → 0 반환 → multiplier=1 (score+10)
  //   - 이후 호출: origRandom 복원 (PixiJS 등 정상 동작)
  //
  // 음식 위치: (halfCol+1, halfRow) — 뱀 초기 머리 (halfCol, halfRow) 에서 RIGHT 1칸
  // 첫 틱 후: 뱀 머리 → (halfCol+1, halfRow) → 음식 충돌 → score+10, length+1
  // ─────────────────────────────────────────────────────────────

  function buildScriptText(runLabel) {
    return `
      // 콘솔 에러 수집 (listener 를 가장 먼저 등록)
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // ── STEP 0: localStorage 비우고 재로드 ─────────────────────────────────────
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForSelector('#settings-trigger', { timeout: 8000 });
      console.log('[step0] 페이지 로드 OK');

      // ── STEP 1: 설정 모달 자동 오픈 대기 ─────────────────────────────────────
      await page.waitForFunction(
        () => !document.getElementById('settings-modal').hasAttribute('hidden'),
        { timeout: 8000 }
      );
      console.log('[step1] 설정 모달 열림 (entry) OK');

      // ── STEP 2: Math.random 오버라이드 주입 ───────────────────────────────────
      // 목적: 음식을 뱀 머리 바로 오른쪽 (halfCol+1, halfRow) 에 배치
      // 타이밍: 설정 모달 열린 후 (PixiJS 미초기화 상태), Enter 전
      //         initGame() → resizeCanvas() 이후에 Math.random 호출되므로
      //         canvas.width 는 override 함수 내부에서 안전하게 읽음
      await page.evaluate(() => {
        let callCount = 0;
        const origRandom = Math.random.bind(Math);
        Math.random = function brixE2eRandom() {
          callCount++;
          if (callCount === 1) {
            // 첫 번째 호출 = spawnFoodCell 의 empty cell 선택
            // initGame() 에서 resizeCanvas() 이미 완료 → canvas.width 유효
            const canvas = document.querySelector('canvas');
            if (!canvas || canvas.width < 40) return origRandom();
            const CELL = 20;
            const cols = Math.floor(canvas.width / CELL);
            const rows = Math.floor(canvas.height / CELL);
            if (cols < 4 || rows < 4) return origRandom();
            const halfCol = Math.floor(cols / 2);
            const halfRow = Math.floor(rows / 2);
            // 뱀 (initialLength=3): (halfCol, halfRow), (halfCol-1, halfRow), (halfCol-2, halfRow)
            // 목표 음식: (halfCol+1, halfRow) — 뱀 머리 바로 오른쪽 (초기 방향 RIGHT)
            // empty[] 인덱스 = 목표 이전 빈 셀 수
            //   y < halfRow 행: halfRow * cols 개 (모두 빈)
            //   y = halfRow 행, x = 0..halfCol: (halfCol+1) 개 - 3개 점유 = halfCol-2 개
            const emptyBefore = halfRow * cols + (halfCol - 2);
            const totalEmpty  = rows * cols - 3;
            const fraction = emptyBefore / totalEmpty;
            console.log('[BF-637] Math.random override: fraction=' + fraction.toFixed(4)
              + ' cols=' + cols + ' rows=' + rows + ' target=(' + (halfCol+1) + ',' + halfRow + ')');
            return fraction;
          }
          if (callCount === 2) {
            // 두 번째 호출 = pickMultiplier → 0 반환 → multiplier=1 → score+10
            return 0;
          }
          // 이후 호출 (PixiJS 초기화 등): 원본 복원
          return origRandom();
        };
        window.__brixE2eOverride = 'BF-637';
      });
      console.log('[step2] Math.random override 주입 완료');

      // ── STEP 3: cpuCount=0 선택 (솔로 모드 — CPU 없이 재현성 보장) ───────────
      const cpuZeroClicked = await page.evaluate(() => {
        const btn = document.querySelector('[data-key="cpuCount"] [data-value="0"]');
        if (!btn) return false;
        btn.click();
        return true;
      });
      console.log('[step3] cpuCount=0 선택:', cpuZeroClicked);
      if (!cpuZeroClicked) {
        throw new Error(
          'AC 전제조건 실패: 설정 모달에서 [data-key="cpuCount"][data-value="0"] 버튼 없음 — HTML 회귀'
        );
      }

      // ── STEP 4: Enter → 게임 시작 ─────────────────────────────────────────────
      // saveSettingsModal() → initGame() → resizeCanvas() → createInitialState()
      //   → spawnFoodCell() → Math.random() CALL 1 → 음식이 (halfCol+1, halfRow) 에 배치
      //   → pickMultiplier() → Math.random() CALL 2 → multiplier=1
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        () => document.getElementById('settings-modal').hasAttribute('hidden'),
        { timeout: 6000 }
      );
      console.log('[step4] 설정 저장 → 게임 시작 OK');

      // ── STEP 5: 첫 틱 대기 ────────────────────────────────────────────────────
      // 게임 틱 간격 TICK_MS=120ms. startLoop() → RAF 루프 누산 후 첫 틱 ≈ 120~140ms.
      // 600ms 대기 → 4+ 틱 분량, 첫 틱 확실히 완료 + render() DOM 업데이트 확인.
      await new Promise(r => setTimeout(r, 600));

      // ── STEP 6: AC1 — 점수 증가 DOM 검증 (hud-player-score ≥ 10) ─────────────
      const scoreText = await page.evaluate(
        () => document.getElementById('hud-player-score').textContent.trim()
      );
      const score = parseInt(scoreText, 10);
      console.log('[step5] hud-player-score =', scoreText, '(parsed:', score, ')');
      if (isNaN(score) || score < 10) {
        throw new Error(
          'AC1 회귀 [${runLabel}]: hud-player-score="' + scoreText + '" — 10 이상이어야 합니다. '
          + '원인: 음식이 뱀 머리 앞에 배치됐지만 첫 틱에 먹히지 않음. '
          + 'tickWithItems cpuHead null 가드 or pendingGrowth 처리 회귀 가능성. '
          + 'multiplier=1 이므로 score += 10 → 10 이상이어야 함.'
        );
      }

      // ── STEP 7: AC1 — 길이 증가 DOM 검증 (hud-snake-length ≥ 4) ─────────────
      const lengthText = await page.evaluate(
        () => document.getElementById('hud-snake-length').textContent.trim()
      );
      const length = parseInt(lengthText, 10);
      console.log('[step6] hud-snake-length =', lengthText, '(parsed:', length, ')');
      if (isNaN(length) || length < 4) {
        throw new Error(
          'AC1 회귀 [${runLabel}]: hud-snake-length="' + lengthText + '" — 4 이상이어야 합니다. '
          + '초기 길이 3 → 음식 먹은 후 4. updateHUDStatus() → state.snake.length 반영 회귀 가능성.'
        );
      }

      // ── STEP 8: AC2 — 음식 재배치 DOM 확인 (ms-count 총합 ≥ 2) ─────────────
      // 게임 시작 시 초기 음식 스폰: ms-count-1 = 1 (multiplier=1 확정).
      // 음식 먹은 후 재배치: 추가 스폰 → 총합 = 2.
      // updateMultiplierStatsUI() 가 render() 루프에서 호출되므로 DOM 에 즉시 반영.
      const totalSpawned = await page.evaluate(() => {
        return [1, 2, 4, 8].reduce((sum, m) => {
          const el = document.getElementById('ms-count-' + m);
          return sum + parseInt(el ? el.textContent.trim() : '0', 10);
        }, 0);
      });
      console.log('[step7] 총 음식 스폰 카운트 (ms-count 합계) =', totalSpawned);
      if (totalSpawned < 2) {
        throw new Error(
          'AC2 회귀 [${runLabel}]: ms-count 총합=' + totalSpawned + ' — ≥2 이어야 합니다. '
          + '초기 스폰(1) + 재배치(1) = 2. '
          + 'spawnFoodWithMultiplier 또는 multiplierStats.spawned 카운트 회귀 가능성.'
        );
      }

      // ── STEP 9: AC2 — 게임 계속 진행 중 확인 (재배치 후 game-over 아님) ──────
      const gameoverHidden = await page.evaluate(
        () => document.getElementById('gameover-overlay').hasAttribute('hidden')
      );
      console.log('[step8] gameover-overlay hidden =', gameoverHidden);
      if (!gameoverHidden) {
        throw new Error(
          'AC2 회귀 [${runLabel}]: 음식 먹은 직후 gameover-overlay 가 표시됨. '
          + '재배치 실패 또는 음식 먹기 직후 뱀 충돌 처리 이상 가능성.'
        );
      }

      // ── STEP 10: 콘솔 에러 없음 확인 (WebGL/PixiJS 환경 에러 제외) ──────────
      const criticalErrors = consoleErrors.filter(e =>
        !e.includes('WebGL') && !e.includes('pixi') && !e.includes('PIXI') &&
        !e.includes('SnakeRenderer') && !e.includes('BF-631')
      );
      console.log('[step9] 수집된 콘솔 에러:', JSON.stringify(consoleErrors));
      if (criticalErrors.length > 0) {
        throw new Error(
          '콘솔 에러 ' + criticalErrors.length + '건 [${runLabel}]:\\n' +
          criticalErrors.slice(0, 3).join('\\n')
        );
      }

      console.log('[OK][${runLabel}] AC1: score=' + score + ' length=' + length
        + ' | AC2: totalSpawned=' + totalSpawned + ' gameRunning=' + gameoverHidden);
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // E2E skip 분기
  // ─────────────────────────────────────────────────────────────
  if (E2E_SKIP) {
    test("[E2E] BF-637 BRIX_E2E_SKIP=1 — 전체 E2E skip (CI 결정성)", (t) =>
      t.skip("BRIX_E2E_SKIP=1"));
  } else {

    // ═══════════════════════════════════════════════════════════
    // §1. E2E AC1+AC2 — 아이템 먹기 → DOM 점수/길이 증가 + 재배치 확인 (1회차)
    //
    // 검증 흐름:
    //   1. localStorage.clear() → reload → 설정 모달 대기
    //   2. Math.random 오버라이드: 음식 = (halfCol+1, halfRow) 배치, multiplier=1
    //   3. cpuCount=0 선택 → Enter → 게임 시작
    //   4. 600ms 대기 (첫 틱 완료 + render DOM 반영)
    //   5. #hud-player-score ≥ 10 확인 (multiplier=1 → score += 10)
    //   6. #hud-snake-length ≥ 4 확인 (초기 3 → +1)
    //   7. ms-count 총합 ≥ 2 확인 (초기 스폰 + 재배치)
    //   8. gameover-overlay hidden 확인 (게임 계속 진행)
    //
    // dev(BF-635) 고유 수정 영역:
    //   cpuCount=0(솔로) 모드에서 tickWithItems 가 TypeError 없이
    //   음식 먹기 → 점수/길이 증가를 정상 처리하는지 브라우저 DOM 레벨 검증.
    // ═══════════════════════════════════════════════════════════

    test("BF-637 E2E §1 (AC1+AC2): 음식 먹기 → DOM 점수/길이/재배치 검증 (1회차)", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server   = await startStaticServer(REPO_ROOT);
      const port     = server.address().port;
      const selfHost = personaHost();

      try {
        const url        = `http://${selfHost}:${port}/snake/`;
        const scriptText = buildScriptText("1회차");

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type":     "application/json",
            "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-637",
          },
          body: JSON.stringify({
            url,
            label:     "AC1+AC2 음식 먹기→DOM 점수/길이 증가+재배치 확인 (1회차) [BF-637]",
            scriptText,
            timeoutMs: 45000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `E2E §1 AC1+AC2 (1회차) 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    // ═══════════════════════════════════════════════════════════
    // §2. E2E AC3 — CI 재현성 검증 (2회차)
    //
    // 동일 시나리오를 독립적으로 재실행 — 1회차와 동일한 결과가 나오면
    // 테스트가 결정적(deterministic)임을 증명.
    //
    // Math.random override 가 Math.random 전역을 덮어쓰므로
    // 페이지 reload 로 원본 복원 후 다시 주입 → 격리 보장.
    // ═══════════════════════════════════════════════════════════

    test("BF-637 E2E §2 (AC3): CI 재현성 — 동일 시나리오 2회차 통과", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server   = await startStaticServer(REPO_ROOT);
      const port     = server.address().port;
      const selfHost = personaHost();

      try {
        const url        = `http://${selfHost}:${port}/snake/`;
        const scriptText = buildScriptText("2회차");

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type":     "application/json",
            "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-637",
          },
          body: JSON.stringify({
            url,
            label:     "AC3 CI 재현성 — 동일 시나리오 2회차 [BF-637]",
            scriptText,
            timeoutMs: 45000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `E2E §2 AC3 (2회차) 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });

  } // end else (E2E_SKIP)

} // end else (MODULE_SKIP)
