// BF-788 · number-guess E2E 동작 검증 + 회귀 가드
//
// 본 파일은 BF-786 의 dev 산출물 (number-guess/ 모듈) 이 main 에 들어간 후
// silent break 되지 않도록, e2e-runner 컨테이너로 worker host URL 에 접근해
// 전체 사용자 시나리오 (초기 상태 → Enter 키 입력 → 힌트 → 이진탐색 정답 →
// 재시작 클릭 → 두 번째 게임 Enter → 재시작 버튼 Enter 키) 를 검증한다.
//
// 보호 대상 (BF-788 수용 기준):
//   AC1. 입력 → 힌트: 숫자 입력 후 Enter 키 → attempt-count 증가 +
//        "더 큰/작은 숫자" 또는 "정답" 메시지 + data-state 전환
//   AC2. 정답: 이진탐색으로 맞히면 data-state=won + input/submit disabled +
//        #restart-btn 포커스 + "🎉 정답입니다!" 메시지
//   AC3. 재시작 클릭: 클릭 후 attempt-count=0 + data-state=idle + input 활성
//   AC4. Enter 키 재시작: 정답 후 포커스된 #restart-btn 에서 Enter → 동일 초기화
//
// 작성 방침 (BF-445 / BF-440 패턴 준수):
//   - CI 결정성 가드 — BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 t.skip().
//     assert.ok(reachable, ...) 같은 hookFail 패턴 금지.
//   - focused scope 정책: BRIX_TEST_MODULE 이 'number-guess' 가 아니면 module skip.
//   - BRIX_PERSONA_HOST env 우선, compose hostname 만 허용 (localhost 금지).
//   - dev 의 evaluateGuess / validateGuess 단위 테스트 (number-guess/tests/) 는
//     순수 함수 로직 커버 완료 → 본 파일은 **브라우저 인터랙션 + HTML contract** 만.
//   - 정적 가드: fs.readFileSync + includes 로 마크업/CORS/UMD 계약 박제.
//     위치·라인 번호 의존 금지 (다른 Epic 변경에 의한 false-fail 방지).

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "number-guess";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const HTML_FILE = path.join(REPO_ROOT, "number-guess", "index.html");
const JS_FILE = path.join(REPO_ROOT, "number-guess", "game.js");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // 정적 가드 1 — HTML 마크업 계약 (id / class / data-attr 존재)
  // silent break 방지: selector 가 바뀌면 E2E 전체 fail 전에 이 가드가 먼저 잡아줌.
  // ─────────────────────────────────────────────────────────────
  test("BF-788 정적: HTML 핵심 selector 존재 — #game / #guess-input / #submit-btn / #restart-btn / #message / #attempt-count", () => {
    const html = fs.readFileSync(HTML_FILE, "utf-8");
    assert.ok(html.includes('id="game"'), "#game 누락");
    assert.ok(html.includes('id="guess-input"'), "#guess-input 누락");
    assert.ok(html.includes('id="submit-btn"'), "#submit-btn 누락");
    assert.ok(html.includes('id="restart-btn"'), "#restart-btn 누락");
    assert.ok(html.includes('id="message"'), "#message 누락");
    assert.ok(html.includes('id="attempt-count"'), "#attempt-count 누락");
    assert.ok(html.includes("data-state"), "data-state 속성 누락");
  });

  // ─────────────────────────────────────────────────────────────
  // 정적 가드 2 — CORS 안전: <script type="module"> 미사용 (file:// 호환)
  // ─────────────────────────────────────────────────────────────
  test('BF-788 정적: CORS 안전 — index.html 에 <script type="module"> 없음', () => {
    const html = fs.readFileSync(HTML_FILE, "utf-8");
    assert.ok(
      !html.includes('type="module"'),
      '<script type="module"> 발견 — file:// CORS 오류 유발',
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 정적 가드 3 — CORS 안전: game.js 에 fetch() 미사용
  // ─────────────────────────────────────────────────────────────
  test("BF-788 정적: CORS 안전 — game.js 에 fetch() 없음", () => {
    const js = fs.readFileSync(JS_FILE, "utf-8");
    assert.ok(!js.includes("fetch("), "fetch() 발견 — file:// CORS 오류 유발");
  });

  // ─────────────────────────────────────────────────────────────
  // 정적 가드 4 — UMD 패턴: ESM import/export 없음 + module.exports 존재
  // ─────────────────────────────────────────────────────────────
  test("BF-788 정적: UMD 패턴 — ESM 구문 없음, module.exports 존재", () => {
    const js = fs.readFileSync(JS_FILE, "utf-8");
    // ESM import 구문 (import ... from, import(...)) 검사
    assert.ok(
      !js.includes("import ") && !js.includes("import("),
      "ESM import 발견 — Node 단위 테스트 / file:// 오류 유발",
    );
    // ESM export 구문만 검사 (코드 레벨: export default / export { / export function 등)
    // 주석에 "import/export 0건" 같은 설명 문구는 false positive 이므로 구체 패턴으로 확인.
    const esmExportPatterns = [
      "export default ",
      "export {",
      "export function ",
      "export const ",
      "export class ",
      "export let ",
      "export var ",
    ];
    const foundEsmExport = esmExportPatterns.find((p) => js.includes(p));
    assert.ok(
      !foundEsmExport,
      `ESM export 구문 발견 (${foundEsmExport}) — file:// 오류 유발`,
    );
    assert.ok(
      js.includes("module.exports"),
      "module.exports 없음 — UMD 계약 위반",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // E2E — 전체 게임 시나리오 (AC1~AC4 통합)
  //   1. 초기 상태 확인
  //   2. Enter 키 입력 → 힌트 메시지 + attempt-count 증가
  //   3. 이진탐색 정답 → data-state=won + input/submit disabled + restart 포커스
  //   4. 재시작 클릭 → 초기화
  //   5. 두 번째 게임 Enter 키 추측
  //   6. 두 번째 게임 이진탐색 정답
  //   7. 재시작 버튼 Enter 키 → 초기화
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-788 E2E AC1~AC4: 입력→힌트→정답→재시작→Enter 키 전체 시나리오",
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
        const url = `http://${selfHost}:${port}/number-guess/index.html`;

        const scriptText = `
          // 이진탐색 헬퍼 — lo~hi 범위에서 정답 찾기 (submit 버튼 클릭)
          async function binarySearch(lo, hi) {
            while (lo <= hi) {
              const mid = Math.floor((lo + hi) / 2);
              await page.fill('#guess-input', String(mid));
              await page.click('#submit-btn');
              await new Promise((r) => setTimeout(r, 200));
              const msg = await page.evaluate(
                () => document.getElementById('message').textContent,
              );
              if (msg.includes('더 큰 숫자')) lo = mid + 1;
              else if (msg.includes('더 작은 숫자')) hi = mid - 1;
              else return true; // 정답
            }
            return false;
          }

          // ── STEP 1: 초기 상태 확인 ──
          await page.waitForSelector('#guess-input');
          const s1 = await page.evaluate(() => ({
            state: document.getElementById('game').getAttribute('data-state'),
            count: document.getElementById('attempt-count').textContent,
            inputDisabled: document.getElementById('guess-input').disabled,
            submitDisabled: document.getElementById('submit-btn').disabled,
          }));
          if (s1.state !== 'idle')
            throw new Error('초기 data-state !== idle: ' + s1.state);
          if (s1.count !== '0')
            throw new Error('초기 attempt-count !== 0: ' + s1.count);
          if (s1.inputDisabled)
            throw new Error('초기 #guess-input 이 disabled');
          if (s1.submitDisabled)
            throw new Error('초기 #submit-btn 이 disabled');
          console.log('[step1] 초기 상태 OK — data-state=idle, count=0, input/submit enabled');

          // ── STEP 2: Enter 키 입력 → 힌트 + attempt-count 증가 ──
          await page.fill('#guess-input', '50');
          await page.keyboard.press('Enter');
          await new Promise((r) => setTimeout(r, 200));
          const s2 = await page.evaluate(() => ({
            msg: document.getElementById('message').textContent,
            state: document.getElementById('game').getAttribute('data-state'),
            count: document.getElementById('attempt-count').textContent,
          }));
          if (s2.count !== '1')
            throw new Error('Enter 키 후 attempt-count !== 1: ' + s2.count);
          if (!['playing', 'won'].includes(s2.state))
            throw new Error('Enter 키 후 data-state 미전환: ' + s2.state);
          const hasHint2 =
            s2.msg.includes('더 큰 숫자') ||
            s2.msg.includes('더 작은 숫자') ||
            s2.msg.includes('정답');
          if (!hasHint2)
            throw new Error('Enter 키 후 힌트/정답 메시지 없음: ' + s2.msg);
          console.log(
            '[step2] Enter 키 → count=1, state=' +
              s2.state +
              ', msg OK: ' +
              s2.msg.slice(0, 20),
          );

          // ── STEP 3: 이진탐색으로 정답 찾기 → won 상태 확인 ──
          if (s2.state !== 'won') {
            let lo1 = 1, hi1 = 100;
            if (s2.msg.includes('더 큰 숫자')) lo1 = 51;
            else if (s2.msg.includes('더 작은 숫자')) hi1 = 49;
            const found1 = await binarySearch(lo1, hi1);
            if (!found1) throw new Error('1차 이진탐색 — 정답 못 찾음');
          }
          const s3 = await page.evaluate(() => ({
            msg: document.getElementById('message').textContent,
            state: document.getElementById('game').getAttribute('data-state'),
            inputDisabled: document.getElementById('guess-input').disabled,
            submitDisabled: document.getElementById('submit-btn').disabled,
            restartFocused:
              document.activeElement != null &&
              document.activeElement.id === 'restart-btn',
          }));
          if (!s3.msg.includes('정답'))
            throw new Error('정답 메시지 없음: ' + s3.msg);
          if (s3.state !== 'won')
            throw new Error('data-state=won 아님: ' + s3.state);
          if (!s3.inputDisabled)
            throw new Error('정답 후 #guess-input 미비활성화');
          if (!s3.submitDisabled)
            throw new Error('정답 후 #submit-btn 미비활성화');
          if (!s3.restartFocused)
            throw new Error('정답 후 #restart-btn 미포커스 (game.js restartEl.focus() 미동작)');
          console.log('[step3] 이진탐색 정답 → won + input/submit disabled + restart focused OK');

          // ── STEP 4: 재시작 버튼 클릭 → 초기화 ──
          await page.click('#restart-btn');
          await new Promise((r) => setTimeout(r, 200));
          const s4 = await page.evaluate(() => ({
            state: document.getElementById('game').getAttribute('data-state'),
            count: document.getElementById('attempt-count').textContent,
            inputDisabled: document.getElementById('guess-input').disabled,
            submitDisabled: document.getElementById('submit-btn').disabled,
          }));
          if (s4.state !== 'idle')
            throw new Error('클릭 재시작 후 data-state=idle 아님: ' + s4.state);
          if (s4.count !== '0')
            throw new Error('클릭 재시작 후 attempt-count=0 아님: ' + s4.count);
          if (s4.inputDisabled)
            throw new Error('클릭 재시작 후 #guess-input 이 disabled');
          if (s4.submitDisabled)
            throw new Error('클릭 재시작 후 #submit-btn 이 disabled');
          console.log('[step4] 재시작 클릭 → data-state=idle, count=0, input/submit enabled OK');

          // ── STEP 5: 두 번째 게임 Enter 키 추측 ──
          await page.fill('#guess-input', '50');
          await page.keyboard.press('Enter');
          await new Promise((r) => setTimeout(r, 200));
          const s5 = await page.evaluate(() => ({
            msg: document.getElementById('message').textContent,
            state: document.getElementById('game').getAttribute('data-state'),
            count: document.getElementById('attempt-count').textContent,
          }));
          if (s5.count !== '1')
            throw new Error('두 번째 게임 Enter 후 attempt-count !== 1: ' + s5.count);
          if (!['playing', 'won'].includes(s5.state))
            throw new Error('두 번째 게임 Enter 후 data-state 미전환: ' + s5.state);
          console.log(
            '[step5] 두 번째 게임 Enter 키 → count=1, state=' + s5.state + ' OK',
          );

          // ── STEP 6: 두 번째 게임 이진탐색 → won 상태 ──
          if (s5.state !== 'won') {
            let lo2 = 1, hi2 = 100;
            if (s5.msg.includes('더 큰 숫자')) lo2 = 51;
            else if (s5.msg.includes('더 작은 숫자')) hi2 = 49;
            const found2 = await binarySearch(lo2, hi2);
            if (!found2) throw new Error('2차 이진탐색 — 정답 못 찾음');
          }
          const s6 = await page.evaluate(() => ({
            state: document.getElementById('game').getAttribute('data-state'),
            restartFocused:
              document.activeElement != null &&
              document.activeElement.id === 'restart-btn',
          }));
          if (s6.state !== 'won')
            throw new Error('2차 정답 후 data-state=won 아님: ' + s6.state);
          if (!s6.restartFocused)
            throw new Error('2차 정답 후 #restart-btn 미포커스');
          console.log('[step6] 두 번째 게임 이진탐색 정답 → won + restart focused OK');

          // ── STEP 7: 재시작 버튼 Enter 키 → 초기화 ──
          // 정답 후 restartEl.focus() 호출로 이미 포커스 되어있음.
          await page.keyboard.press('Enter');
          await new Promise((r) => setTimeout(r, 200));
          const s7 = await page.evaluate(() => ({
            state: document.getElementById('game').getAttribute('data-state'),
            count: document.getElementById('attempt-count').textContent,
            inputDisabled: document.getElementById('guess-input').disabled,
          }));
          if (s7.state !== 'idle')
            throw new Error('Enter 재시작 후 data-state=idle 아님: ' + s7.state);
          if (s7.count !== '0')
            throw new Error('Enter 재시작 후 attempt-count=0 아님: ' + s7.count);
          if (s7.inputDisabled)
            throw new Error('Enter 재시작 후 #guess-input 이 disabled');
          console.log('[step7] 재시작 버튼 Enter 키 → data-state=idle, count=0, input enabled OK');
          console.log('[done] BF-788 E2E AC1~AC4 PASS');
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
              "숫자맞추기 입력→힌트→이진탐색정답→재시작→Enter 전체 시나리오 (BF-788 AC1~AC4)",
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
          `E2E AC1~AC4 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-3000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 헬퍼 (BF-445 / BF-440 e2e-worker-host 패턴과 동일)
// ─────────────────────────────────────────────────────────────

/**
 * e2e-runner 도달성 확인. 못 닿으면 t.skip() 호출 후 false 반환.
 * CI 환경에는 컨테이너 없음 — fail 처리하면 PR 자동 머지 트리거 안 됨.
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
 * 페르소나 컨테이너 service hostname.
 * host.docker.internal / localhost 는 절대 사용 X (e2e-runner 는 다른 컨테이너).
 */
function personaHost() {
  return (
    process.env.BRIX_PERSONA_HOST ??
    process.env.BRIX_WORKER_HOSTNAME ??
    "worker"
  );
}

/**
 * 0.0.0.0 바인딩 임시 정적 서버. port 0 으로 임의 포트 — 동시 실행 충돌 없음.
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
      let urlPath = decodeURIComponent(
        new URL(req.url, "http://x").pathname,
      );
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
