// tests/e2e/simon-says/round-progress-gameover-keyboard.test.js
// BF-939 · /phase18-games/simon-says 실 브라우저 E2E 회귀 가드 (테스터 소유)
//
// 관련: docs/design/simon-says-BF-936.md(디자인) ·
//       phase18-games/simon-says/{index.html,styles.css,logic.js,main.js}(구현, BF-937).
// 본 파일은 머지된 최종 코드 기준으로 e2e-runner 실 브라우저 호출을 통해
// "시작 → 정답 시퀀스 입력 → 다음 라운드 진행", "오답 입력 → 게임 종료 노출",
// "키보드 조작이 마우스와 동일하게 동작"하는 회귀를 직접 구동해 검증한다.
//
// ── 중복 금지 (dev 가 이미 커버 — 재작성 X) ──────────────────────────────
//   tests/simon-says-BF937.test.js:
//     - vanilla-static file:// 안전 가드(import/export·type=module·fetch/외부 URL·
//       localStorage 0건)
//     - 마크업 계약(title/h1 "Simon Says", 4색 패드 data-pad/data-key/aria-label,
//       status/round-badge/controls/hint 골격, btn-start/btn-restart id,
//       logic.js/main.js 비-module script)
//     - CSS 토큰 존재(--pad-*-lit/dim, .pad.is-lit, prefers-reduced-motion)
//     - logic.js 순수 함수 전수(createInitialState·randomPad·startGame·beginInput·
//       handleInput — AC1 라운드 증가/시퀀스 확장, AC2 오답 종료/재시작, 불변성)
//   → 본 파일은 이 항목들을 정적으로 다시 검증하지 않는다. 상태 전이 공식 자체의
//     정확성은 이미 node:test 로 전수 검증됨 — 여기서는 "실 브라우저에서 그 로직이
//     실제 클릭/키보드 입력에 반응해 DOM 을 갱신하는가"만 관찰한다.
//
// ── 본 파일이 보호하는 대상 (작업 AC) ─────────────────────────────────────
//   AC1-E2E : 시작한 게임에서 정답 시퀀스를 입력하면 다음 라운드로 진행한다
//             (round-badge 1 → 2, 상태 텍스트 갱신).
//   AC2-E2E : 진행 중인 게임에서 오답을 입력하면 게임 종료 화면이 노출된다
//             (상태 텍스트 "틀렸습니다", 패드 비활성화, "다시하기" 버튼 활성화).
//   AC3-E2E : 키보드 숫자키(1~4)로 패드를 활성화하면 마우스 클릭과 동일하게
//             동작한다(라운드 진행 + 포커스 이동).
//
// 결정론 확보 기법 (상태 전이 공식 재검증 아님 — 순수 E2E 타이밍 제어용):
//   page.addInitScript 으로 Math.random 을 고정값(0.05)으로 오버라이드한다.
//   main.js 의 `var rand = Math.random;` 이 스크립트 로드 시점 값을 캡처하므로
//   문서 스크립트가 실행되기 전(addInitScript, 이후 reload)에 걸어야 한다.
//   logic.js 의 randomPad(rand) = PADS[floor(rand()*4)] 이므로 0.05 고정 시
//   매 확장 패드가 항상 "green"(idx 0) 이 되어, 라운드가 몇 개든 시퀀스가
//   전부 green 으로 채워지는 결정론적 게임이 된다. randomPad/handleInput 공식
//   자체는 손대지 않으므로 실제 상태 전이는 dev 코드 그대로 관찰된다.
//
// 실행: node --test tests/e2e/simon-says/round-progress-gameover-keyboard.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/e2e/simon-says/round-progress-gameover-keyboard.test.js

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
  // §0. 정적 가드 — 본 E2E 스크립트가 직접 의존하는 selector (dev 미검증분만)
  //     dev(BF-937) 테스트는 class="round-badge__value" 존재만 확인했고
  //     data-role="round" 속성 자체는 미확인. class="simon-app" 도 미확인.
  //     본 스크립트가 각각 page.evaluate 로 직접 읽으므로 여기서 고정한다.
  // ═══════════════════════════════════════════════════════════
  test('§0-1 index.html — data-role="round" 존재 (라운드 숫자를 직접 읽음)', () => {
    const html = readModuleFile("index.html");
    assert.ok(html.includes('data-role="round"'), 'index.html 에 data-role="round" 가 없습니다');
  });

  test('§0-2 index.html — class="simon-app" 존재 (오답 시 is-fail 클래스 대상)', () => {
    const html = readModuleFile("index.html");
    assert.ok(/class=["']simon-app["']/.test(html), 'index.html 에 class="simon-app" 가 없습니다');
  });

  // ─────────────────────────────────────────────────────────────
  // 실 브라우저 E2E — 시작 → 정답(키보드) → 라운드 진행 → 정답(마우스) →
  //                   오답(마우스) → 게임 종료
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-939 E2E: /phase18-games/simon-says/ 시작→정답 시퀀스(키보드)→다음 라운드→정답(마우스)→오답(마우스)→게임 종료",
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

          // ── STEP 0: 결정론 훅 — Math.random 고정(항상 idx0="green") ──
          await page.addInitScript(() => {
            Math.random = () => 0.05;
          });
          await page.reload();
          await page.waitForSelector('#btn-start', { timeout: 8000 });

          // ── STEP 1 (초기 렌더): round 0, 대기 상태 ──
          const initial = await page.evaluate(() => ({
            round: document.querySelector('[data-role="round"]').textContent,
            status: document.querySelector('.status').textContent,
          }));
          if (initial.round !== '0') {
            throw new Error('초기 라운드가 0 이 아님 — round=' + initial.round);
          }
          console.log('[step1] 초기 렌더 OK — round=0, status="' + initial.status + '"');

          // ── STEP 2: "시작" 클릭 → round 1, 재생 상태 진입 ──
          await page.click('#btn-start');
          const afterStart = await page.evaluate(() => ({
            round: document.querySelector('[data-role="round"]').textContent,
            statusClass: document.querySelector('.status').className,
          }));
          if (afterStart.round !== '1') {
            throw new Error('시작 클릭 후 라운드가 1 이 아님 — round=' + afterStart.round);
          }
          if (afterStart.statusClass.indexOf('status--watch') === -1) {
            throw new Error('시작 클릭 후 재생(watch) 상태 클래스가 없음 — class="' + afterStart.statusClass + '"');
          }
          console.log('[step2] 시작 OK — round=1, watch 상태 진입');

          // ── STEP 3: 재생 완료 대기 → 입력 대기(input) 진입 (라운드1: 시퀀스 [green]) ──
          await page.waitForFunction(
            () => document.querySelector('.status').textContent.includes('당신 차례'),
            { timeout: 5000 },
          );
          console.log('[step3] 입력 대기 진입 OK (round1)');

          // ── STEP 4 (AC1-E2E + AC3-E2E): 키보드 숫자키 '1'(green) 로 정답 입력 ──
          // round1 시퀀스 길이 1 → 이 입력 하나로 라운드 완주 → round 2 로 즉시 갱신.
          await page.keyboard.press('1');
          const afterKeyInput = await page.evaluate(() => ({
            round: document.querySelector('[data-role="round"]').textContent,
            statusText: document.querySelector('.status').textContent,
            activePad: document.activeElement ? document.activeElement.getAttribute('data-pad') : null,
          }));
          if (afterKeyInput.round !== '2') {
            throw new Error('AC1-E2E 회귀: 키보드 정답 입력 후 라운드가 2 로 진행하지 않음 — round=' + afterKeyInput.round);
          }
          if (!afterKeyInput.statusText.includes('좋아요')) {
            throw new Error('AC1-E2E 회귀: 라운드 완주 성공 문구가 노출되지 않음 — status="' + afterKeyInput.statusText + '"');
          }
          if (afterKeyInput.activePad !== 'green') {
            throw new Error('AC3-E2E 회귀: 키보드 입력 후 해당 패드로 포커스가 이동하지 않음 — activePad=' + afterKeyInput.activePad);
          }
          console.log('[step4] AC1-E2E + AC3-E2E OK — 키보드 정답 입력으로 round 1->2 진행 + 포커스 이동(green)');

          // ── STEP 5: round2 재생 완료 대기 → 입력 대기 재진입 (시퀀스 [green, green]) ──
          await page.waitForFunction(
            () => document.querySelector('.status').textContent.includes('당신 차례'),
            { timeout: 8000 },
          );
          const round2Ready = await page.evaluate(() => document.querySelector('[data-role="round"]').textContent);
          if (round2Ready !== '2') {
            throw new Error('round2 재생 완료 후 라운드 표시가 2 가 아님 — round=' + round2Ready);
          }
          console.log('[step5] round2 입력 대기 진입 OK');

          // ── STEP 6 (AC3-E2E): 마우스 클릭으로 1번째 정답(green) 입력 — 시퀀스 미완주(라운드 유지) ──
          await page.click('[data-pad="green"]');
          const afterMouseInput = await page.evaluate(() => ({
            round: document.querySelector('[data-role="round"]').textContent,
            statusText: document.querySelector('.status').textContent,
          }));
          if (afterMouseInput.round !== '2') {
            throw new Error('AC3-E2E 회귀: 마우스 정답 입력(미완주) 후 라운드가 바뀜 — round=' + afterMouseInput.round);
          }
          if (!afterMouseInput.statusText.includes('당신 차례')) {
            throw new Error('AC3-E2E 회귀: 마우스 정답 입력(미완주) 후 입력 대기 상태 문구가 유지되지 않음 — status="' + afterMouseInput.statusText + '"');
          }
          console.log('[step6] AC3-E2E OK — 마우스 클릭이 키보드와 동일하게 정답 입력 처리(라운드 유지, inputIndex 전진)');

          // ── STEP 7 (AC2-E2E): 2번째 입력에서 오답(red, 기대값은 green) → 게임 종료 ──
          await page.click('[data-pad="red"]');
          const gameover = await page.evaluate(() => ({
            statusText: document.querySelector('.status').textContent,
            statusClass: document.querySelector('.status').className,
            appClass: document.querySelector('.simon-app').className,
            greenAriaDisabled: document.querySelector('[data-pad="green"]').getAttribute('aria-disabled'),
            btnStartDisabled: document.getElementById('btn-start').disabled,
            btnRestartDisabled: document.getElementById('btn-restart').disabled,
          }));
          if (!gameover.statusText.includes('틀렸습니다')) {
            throw new Error('AC2-E2E 회귀: 오답 입력 후 게임 종료 문구가 노출되지 않음 — status="' + gameover.statusText + '"');
          }
          if (gameover.statusClass.indexOf('status--fail') === -1) {
            throw new Error('AC2-E2E 회귀: 오답 입력 후 실패(fail) 상태 클래스가 없음 — class="' + gameover.statusClass + '"');
          }
          if (gameover.appClass.indexOf('is-fail') === -1) {
            throw new Error('AC2-E2E 회귀: 오답 입력 후 is-fail 클래스가 적용되지 않음 — class="' + gameover.appClass + '"');
          }
          if (gameover.greenAriaDisabled !== 'true') {
            throw new Error('AC2-E2E 회귀: 게임 종료 후 패드가 비활성화되지 않음 — aria-disabled=' + gameover.greenAriaDisabled);
          }
          if (gameover.btnRestartDisabled) {
            throw new Error('AC2-E2E 회귀: 게임 종료 후 "다시하기" 버튼이 비활성 상태 — 재시작 불가');
          }
          if (gameover.btnStartDisabled) {
            throw new Error('AC2-E2E 회귀: 게임 종료 후 "시작" 버튼이 비활성 상태');
          }
          console.log('[step7] AC2-E2E OK — 오답 입력 시 게임 종료 화면 노출(문구/스타일/패드 비활성) + 재시작 가능');

          // ── STEP 8: 콘솔/페이지 에러 0건 ──
          if (consoleErrors.length > 0) {
            throw new Error('콘솔/페이지 에러 ' + consoleErrors.length + '건 발생:\\n' + consoleErrors.slice(0, 5).join('\\n'));
          }

          console.log('[OK] BF-939: 시작->정답(키보드,round1->2)->정답(마우스,round2 유지)->오답(마우스)->게임 종료 전체 통과');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-939",
          },
          body: JSON.stringify({
            url,
            label: "Simon Says 시작→정답(키보드)→라운드 진행→정답(마우스)→오답→게임 종료 [BF-939]",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `BF-939 E2E 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (기존 e2e 가드와 동일 패턴 — tests/breakout/BF-933-e2e.test.js /
// tests/e2e/pong/render-play-touch.test.js 참고)
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
