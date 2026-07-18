/* tests/e2e/snake-canary/render-play-gameover-restart.test.js
 * BF-998 tester 회귀 가드 — snake-canary (/demo/snake-canary)
 * SSOT: docs/planning/snake-canary-BF-989.md §3(규칙)·§5(상태)·§6(입력) · docs/design/snake-canary-BF-989.md §5
 * dev(BF-995) 가 demo/snake-canary/logic.test.js 에서 이미 검증한 순수 로직(틱 전이·충돌 판정·먹이 스폰·
 * 방향 유효성 등)은 재작성하지 않는다. 여기서는 tester 고유 영역만 다룬다:
 *  1) 정적 가드 — HTML id/class·CSS 토큰이 silent break 되지 않게 fact 박제
 *  2) 실 브라우저 E2E — 진입 렌더, 시작→(자동)이동→먹이 섭취 점수 증가→벽 충돌 게임오버→재시작,
 *     키보드/D-pad 입력에 따른 실제 이동 경로(canvas 렌더) 검증
 *
 * 실행: node --test tests/e2e/snake-canary/render-play-gameover-restart.test.js
 * e2e-runner 시나리오는 worker 환경에서 실제 호출된다 (BRIX_E2E_SKIP=1 로 건너뛰지 않음).
 * CI(GitHub Actions) 에는 e2e-runner 컨테이너가 없으므로 도달 불가 시 skip 처리된다 (fail 아님).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "..", "..", "demo", "snake-canary");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const MY_MODULE = "snake-canary";
const SCOPE_SKIP =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== MY_MODULE;

// ══════════════════════════════════════════════════════════
// 1) 정적 가드 — UI 마크업 contract (silent break 방지)
// ══════════════════════════════════════════════════════════
test("정적 가드 — 핵심 selector(id) 존재", (t) => {
  if (SCOPE_SKIP) return t.skip(`focused scope skip — ${MY_MODULE}`);

  const ids = [
    "score",
    "game-status",
    "board",
    "btn-start",
    "btn-restart",
    "btn-restart-overlay",
    "dpad-up",
    "dpad-down",
    "dpad-left",
    "dpad-right",
  ];
  for (const id of ids) {
    assert.ok(HTML.includes(`id="${id}"`), `index.html 에 id="${id}" 없음 — E2E selector 가 이 id 에 의존`);
  }
  assert.ok(HTML.includes('data-role="overlay"'), 'index.html 에 [data-role="overlay"] 없음');
  assert.ok(HTML.includes('data-role="overlay-result"'), 'index.html 에 [data-role="overlay-result"] 없음');
});

test("정적 가드 — 게임 렌더·상태 CSS 토큰/훅 존재", (t) => {
  if (SCOPE_SKIP) return t.skip(`focused scope skip — ${MY_MODULE}`);

  for (const token of ["--sc-board-bg", "--sc-grid-line", "--sc-snake-head", "--sc-snake-body", "--sc-food"]) {
    assert.ok(CSS.includes(token), `styles.css 에 ${token} 토큰 없음 — 렌더 색상 회귀`);
  }
  assert.ok(CSS.includes(".sc-overlay[hidden]"), ".sc-overlay[hidden] 규칙 없음 — 게임오버 오버레이 노출 회귀");
  assert.ok(CSS.includes(".sc-btn[hidden]"), ".sc-btn[hidden] 규칙 없음 — 시작/재시작 버튼 노출 전환 회귀");
  assert.ok(CSS.includes(".sc-dpad__btn.is-pressed"), ".sc-dpad__btn.is-pressed 규칙 없음 — D-pad 눌림 피드백 회귀");
});

test("정적 가드 — CORS 안전(file:// 호환) — module script/fetch 미사용", (t) => {
  if (SCOPE_SKIP) return t.skip(`focused scope skip — ${MY_MODULE}`);

  assert.ok(!HTML.includes('type="module"'), 'index.html 에 <script type="module"> 사용 — file:// CORS 깨짐');
  const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");
  const LOGIC_JS = readFileSync(join(MODULE_DIR, "logic.js"), "utf8");
  assert.ok(!MAIN_JS.includes("fetch(") && !LOGIC_JS.includes("fetch("), "fetch() 사용 — file:// CORS/네트워크 의존 회귀");
});

// ══════════════════════════════════════════════════════════
// 2) 실 브라우저 E2E — e2e-runner
// ══════════════════════════════════════════════════════════
const RUNNER_URL = "http://e2e-runner:3030";
const BASE_URL = `http://${process.env.BRIX_PERSONA_HOST || "worker"}:${process.env.BRIX_STATIC_PORT || "8080"}/demo/snake-canary/`;

async function checkE2eReachable() {
  if (process.env.BRIX_E2E_SKIP === "1") {
    return { ok: false, reason: "BRIX_E2E_SKIP=1 — CI 결정성 가드" };
  }
  try {
    const res = await fetch(`${RUNNER_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { ok: false, reason: `e2e-runner unhealthy (${res.status})` };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `e2e-runner 도달 불가 (${err.message}) — CI 환경 정상` };
  }
}

async function runE2E(t, { label, scriptText, timeoutMs }) {
  if (SCOPE_SKIP) {
    t.skip(`focused scope skip — ${MY_MODULE}`);
    return;
  }
  const reach = await checkE2eReachable();
  if (!reach.ok) {
    t.skip(reach.reason);
    return;
  }
  const res = await fetch(`${RUNNER_URL}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
      "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-998",
    },
    body: JSON.stringify({ url: BASE_URL, label, scriptText, timeoutMs }),
  });
  const body = await res.json();
  assert.ok(body && body.ok, `e2e-runner 호출 실패: ${JSON.stringify(body)}`);
  assert.strictEqual(body.passed, true, `E2E 시나리오 실패 (${label}): ${body.stdout}`);
}

// ── 진입 렌더 + 초기 상태 (기획 §5.1) ──
test("BF-998 E2E — 진입 렌더 + 초기 상태(idle·score 0·버튼 노출)", async (t) => {
  await runE2E(t, {
    label: "진입 렌더 · 초기 상태 회귀 가드",
    timeoutMs: 20000,
    scriptText: `
      await page.waitForSelector('#board');

      const title = await page.locator('.sc-title').innerText();
      if (!title.includes('스네이크 캐너리')) throw new Error('타이틀 불일치: ' + title);

      const scoreText = (await page.locator('#score').innerText()).trim();
      if (scoreText !== '0') throw new Error('초기 점수 불일치(기대 0): ' + scoreText);

      const statusText = (await page.locator('#game-status').innerText()).trim();
      if (statusText !== '대기 중') throw new Error('초기 상태 텍스트 불일치: ' + statusText);

      const startHidden = await page.locator('#btn-start').isHidden();
      if (startHidden) throw new Error('idle 상태에서 #btn-start 가 숨겨져 있음');
      const restartHidden = await page.locator('#btn-restart').isHidden();
      if (!restartHidden) throw new Error('idle 상태에서 #btn-restart 가 노출됨');

      const overlayHidden = await page.locator('[data-role="overlay"]').isHidden();
      if (!overlayHidden) throw new Error('idle 상태에서 게임오버 오버레이가 노출됨');

      const box = await page.locator('#board').boundingBox();
      const wh = await page.evaluate(() => {
        const c = document.getElementById('board');
        return [c.width, c.height];
      });
      if (wh[0] !== 400 || wh[1] !== 400) throw new Error('canvas 논리 크기 불일치(기대 400x400): ' + JSON.stringify(wh));
      if (!box) throw new Error('canvas 가 화면에 렌더되지 않음(boundingBox 없음)');
    `,
  });
});

// ── 시작 → 이동 → 먹이 섭취(점수 증가) → 벽 충돌 게임오버 → 재시작 (기획 §3·§5) ──
// Math.random 을 고정값으로 override 해 먹이를 머리 진행 방향(오른쪽) 5칸 앞(15,10)에 결정적으로 스폰시킨다.
// 초기 방향이 'right' 이므로 별도 입력 없이도 자동 진행 틱만으로 이동→섭취→벽 충돌까지 결정적으로 재현된다.
test("BF-998 E2E — 시작→이동→먹이 섭취(점수+10)→벽 충돌 게임오버→재시작", async (t) => {
  await runE2E(t, {
    label: "시작·이동·점수 증가·게임오버·재시작 흐름 회귀 가드",
    timeoutMs: 30000,
    scriptText: `
      await page.waitForSelector('#btn-start');
      // freeCells 397개 중 (15,10) 인덱스(212)를 가리키는 고정 난수 — 결정적 먹이 스폰
      await page.evaluate(() => { Math.random = () => 0.535264483627204; });

      await page.locator('#btn-start').click();
      await page.waitForFunction(
        () => document.getElementById('game-status').textContent.trim() === '진행 중',
        { timeout: 5000 }
      );

      // 먹이 섭취(약 5틱 = 750ms) — 점수 10 도달 대기
      await page.waitForFunction(
        () => document.getElementById('score').textContent.trim() === '10',
        { timeout: 8000 }
      );

      // 섭취 후 방향 유지(오른쪽)로 계속 진행 → 벽 충돌 게임오버 (약 5틱 더 = 750ms)
      await page.waitForFunction(
        () => document.getElementById('game-status').textContent.includes('게임 오버'),
        { timeout: 8000 }
      );

      const statusText = (await page.locator('#game-status').innerText()).trim();
      if (!statusText.includes('벽 충돌')) throw new Error('게임오버 사유가 벽 충돌이 아님: ' + statusText);
      if (!statusText.includes('점수 10')) throw new Error('게임오버 시점 점수가 10 이 아님: ' + statusText);

      const overlayResult = (await page.locator('[data-role="overlay-result"]').innerText()).trim();
      if (!overlayResult.includes('점수 10') || !overlayResult.includes('벽 충돌'))
        throw new Error('오버레이 결과 텍스트 불일치: ' + overlayResult);

      const overlayHidden = await page.locator('[data-role="overlay"]').isHidden();
      if (overlayHidden) throw new Error('게임오버 오버레이가 노출되지 않음');

      const startHidden = await page.locator('#btn-start').isHidden();
      if (!startHidden) throw new Error('게임오버 상태에서 #btn-start 가 노출됨');
      const restartHidden = await page.locator('#btn-restart').isHidden();
      if (restartHidden) throw new Error('게임오버 상태에서 #btn-restart 가 숨겨져 있음');

      // 재시작 — 오버레이 버튼
      await page.locator('#btn-restart-overlay').click();
      await page.waitForFunction(
        () => document.getElementById('game-status').textContent.trim() === '진행 중',
        { timeout: 5000 }
      );
      const scoreAfterRestart = (await page.locator('#score').innerText()).trim();
      if (scoreAfterRestart !== '0') throw new Error('재시작 후 점수가 0으로 초기화되지 않음: ' + scoreAfterRestart);
      const overlayHiddenAfterRestart = await page.locator('[data-role="overlay"]').isHidden();
      if (!overlayHiddenAfterRestart) throw new Error('재시작 후에도 게임오버 오버레이가 노출됨');
    `,
  });
});

// ── 키보드/D-pad 입력에 따른 실제 이동 경로 검증 (기획 §6.1·§6.2·§6.3) ──
// 방향 입력이 무시되는 회귀(예: pendingDirection 갱신 실패)는 canvas 렌더 결과로만 관측 가능하다
// (main.js 의 game state 는 외부에 노출되지 않음 — dev 단위 테스트로 커버 불가한 tester 고유 영역).
test("BF-998 E2E — 키보드(↓)·D-pad(→) 입력이 실제 이동 경로에 반영됨", async (t) => {
  await runE2E(t, {
    label: "키보드·D-pad 방향 입력 → 이동 경로 반영 회귀 가드",
    timeoutMs: 20000,
    scriptText: `
      await page.waitForSelector('#btn-start');
      await page.locator('#btn-start').click();
      await page.waitForFunction(
        () => document.getElementById('game-status').textContent.trim() === '진행 중',
        { timeout: 5000 }
      );

      // 초기 방향은 오른쪽(§3.1) — 아래쪽 입력 없이는 y 좌표가 절대 10을 넘지 않는다.
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(700); // 약 4~5틱 — 벽(9~10틱)과 충분히 거리 확보

      // D-pad 오른쪽 입력(pointerdown 경로 — 키보드와 별개 코드 경로)으로 전환
      await page.locator('#dpad-right').click();
      await page.waitForTimeout(700); // 약 4~5틱 더 — x 방향으로도 이동

      const stillPlaying = (await page.locator('#game-status').innerText()).trim();
      if (stillPlaying !== '진행 중') throw new Error('입력 검증 도중 예기치 않게 게임이 종료됨: ' + stillPlaying);

      // (x>=11, y>=11) 사분면에 뱀 색(녹색 계열, G 채널이 R·B 보다 뚜렷이 큼)이 하나라도 있으면
      // 아래→오른쪽 입력이 모두 실제 이동에 반영된 것 — 입력이 무시됐다면 뱀은 y=10 행(우측 직진)에만 존재한다.
      const movedIntoQuadrant = await page.evaluate(() => {
        const canvas = document.getElementById('board');
        const ctx = canvas.getContext('2d');
        for (let y = 11; y <= 19; y++) {
          for (let x = 11; x <= 19; x++) {
            const px = x * 20 + 10;
            const py = y * 20 + 10;
            const d = ctx.getImageData(px, py, 1, 1).data;
            if (d[1] > d[0] + 20 && d[1] > d[2] + 20) return true;
          }
        }
        return false;
      });
      if (!movedIntoQuadrant) throw new Error('ArrowDown + D-pad 오른쪽 입력 후 뱀이 (x>=11,y>=11) 사분면으로 이동하지 않음 — 방향 입력 미반영 회귀');
    `,
  });
});
