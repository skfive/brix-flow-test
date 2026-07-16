// tests/e2e/counter/increment-decrement-reset.test.js
// BF-864 · /demo/counter 증감·초기화·키보드 접근 E2E 회귀 가드 (테스터 소유, focused scope)
//
// 보호 대상 (BF-864 수용 기준):
//   AC1. 초기값 0 → +1 클릭 → -1 클릭 → 초기화 클릭 → 각 단계 실제 브라우저 렌더값 일치.
//   AC2. -1 을 0에서 눌러도 음수로 내려가지 않는다(0-플로어 클램프, 실 클릭 기준).
//   AC3. 키보드 접근 — ArrowUp(+1)/ArrowDown(-1)/R(초기화) 전역 단축키가 포커스 위치와
//        무관하게 동작한다(버튼에 포커스가 없어도 동작).
//   AC4. focused scope — 본 파일은 counter module 외 다른 SPA 회귀 가드를 포함하지 않는다
//        (module-scope 가드로 강제).
//
// 작성 방침 (clicker-e2e-worker-host.test.js BF-445 패턴 준수):
//   - CI 결정성 — BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 t.skip(). assert.ok(reachable)
//     같은 hookFail 패턴 금지(정상 PR 의 CI fail 유발 방지).
//   - focused scope 정책 — BRIX_TEST_MODULE 가 'counter' 가 아니면 module 전체 skip.
//   - BRIX_PERSONA_HOST env 사용(host.docker.internal / localhost 금지 — e2e-runner 는
//     별도 컨테이너).
//
// 중복 금지 (dev BF-862 산출물과의 범위 분리 — tests/counter-BF862.test.js 이미 검증):
//   - increment/decrement/reset 순수 함수 로직(0-플로어 클램프 포함) — 이미 단위 테스트로 검증.
//   - index.html 마크업 계약(output#counter-value aria-live, 버튼 id, Tab 순서, 초기 콘텐츠 0),
//     네트워크 호출 0건 정적 가드 — 이미 정적 정규식 가드로 검증.
//   → 본 파일은 "실 브라우저 클릭/키보드 상호작용 결과가 화면에 실제로 반영되는지" 만
//     e2e-runner 브라우저 구동으로 검증한다(dev 가 못 짠 실 인터랙션 영역).

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "counter";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // AC1~AC3 — 초기값 0 → 클릭 증감/초기화 → 0-플로어 클램프 → 키보드 접근
  //           (단일 e2e-runner 호출로 묶음 — 한 페이지 컨텍스트에서 누적)
  // ─────────────────────────────────────────────────────────────
  test("BF-864 E2E AC1~AC3: 초기값0→+1/-1 클릭→0-플로어 클램프→초기화→키보드(ArrowUp/ArrowDown/R) 접근", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/src/app/demo/counter/`;
      const scriptText = `
        await page.waitForSelector('#counter-value');

        // 1. 초기값 0 (AC1)
        const initial = await page.evaluate(() => ({
          value: document.getElementById('counter-value').textContent.trim(),
        }));
        if (initial.value !== '0') {
          throw new Error('초기 counter-value 가 "0" 이 아님: ' + initial.value);
        }
        console.log('[step1] 초기값 0 OK (AC1)');

        // 2. +1 클릭 3회 → 3 (AC1)
        for (let i = 0; i < 3; i++) {
          await page.click('#btn-increment');
          await new Promise((r) => setTimeout(r, 50));
        }
        const afterInc = await page.evaluate(() => document.getElementById('counter-value').textContent.trim());
        if (afterInc !== '3') {
          throw new Error('+1 3회 클릭 후 counter-value 가 "3" 이 아님: ' + afterInc);
        }
        console.log('[step2] +1 클릭 3회 → 3 OK (AC1)');

        // 3. -1 클릭 1회 → 2 (AC1)
        await page.click('#btn-decrement');
        await new Promise((r) => setTimeout(r, 50));
        const afterDec1 = await page.evaluate(() => document.getElementById('counter-value').textContent.trim());
        if (afterDec1 !== '2') {
          throw new Error('-1 클릭 후 counter-value 가 "2" 가 아님: ' + afterDec1);
        }
        console.log('[step3] -1 클릭 1회 → 2 OK (AC1)');

        // 4. -1 클릭 2회 더 → 0, 그 이후 -1 을 더 눌러도 음수로 내려가지 않음 (AC2 0-플로어)
        await page.click('#btn-decrement');
        await new Promise((r) => setTimeout(r, 50));
        await page.click('#btn-decrement');
        await new Promise((r) => setTimeout(r, 50));
        const atZero = await page.evaluate(() => document.getElementById('counter-value').textContent.trim());
        if (atZero !== '0') {
          throw new Error('-1 클릭 누적 후 counter-value 가 "0" 이 아님: ' + atZero);
        }
        await page.click('#btn-decrement');
        await new Promise((r) => setTimeout(r, 50));
        await page.click('#btn-decrement');
        await new Promise((r) => setTimeout(r, 50));
        const clamped = await page.evaluate(() => document.getElementById('counter-value').textContent.trim());
        if (clamped !== '0') {
          throw new Error('0 에서 -1 을 더 눌렀는데 음수로 내려감(0-플로어 클램프 위반): ' + clamped);
        }
        console.log('[step4] 0 에서 -1 클릭 반복 → 0 유지(클램프) OK (AC2)');

        // 5. +1 클릭 5회 → 5, 초기화 클릭 → 0 (AC1)
        for (let i = 0; i < 5; i++) {
          await page.click('#btn-increment');
          await new Promise((r) => setTimeout(r, 50));
        }
        const beforeReset = await page.evaluate(() => document.getElementById('counter-value').textContent.trim());
        if (beforeReset !== '5') {
          throw new Error('+1 클릭 5회 후 counter-value 가 "5" 가 아님: ' + beforeReset);
        }
        await page.click('#btn-reset');
        await new Promise((r) => setTimeout(r, 50));
        const afterReset = await page.evaluate(() => document.getElementById('counter-value').textContent.trim());
        if (afterReset !== '0') {
          throw new Error('초기화 클릭 후 counter-value 가 "0" 이 아님: ' + afterReset);
        }
        console.log('[step5] +1 클릭 5회 → 5 → 초기화 클릭 → 0 OK (AC1)');

        // 6. 키보드 접근 — 버튼 등에 포커스가 없는 상태(제목 클릭으로 비-포커스 요소 선택)에서도
        //    ArrowUp/ArrowDown/R 전역 단축키가 동작해야 함 (AC3)
        await page.click('#counter-title');
        await new Promise((r) => setTimeout(r, 50));
        const focusBeforeKbd = await page.evaluate(() => document.activeElement && document.activeElement.id);
        if (focusBeforeKbd === 'btn-increment' || focusBeforeKbd === 'btn-decrement' || focusBeforeKbd === 'btn-reset') {
          throw new Error('키보드 접근 검증 사전조건 실패 — 여전히 버튼에 포커스가 있음: ' + focusBeforeKbd);
        }

        await page.keyboard.press('ArrowUp');
        await new Promise((r) => setTimeout(r, 50));
        await page.keyboard.press('ArrowUp');
        await new Promise((r) => setTimeout(r, 50));
        const afterArrowUp = await page.evaluate(() => document.getElementById('counter-value').textContent.trim());
        if (afterArrowUp !== '2') {
          throw new Error('ArrowUp 2회 후 counter-value 가 "2" 가 아님(포커스=' + focusBeforeKbd + '): ' + afterArrowUp);
        }
        console.log('[step6] ArrowUp 2회(비-버튼 포커스) → 2 OK (AC3)');

        await page.keyboard.press('ArrowDown');
        await new Promise((r) => setTimeout(r, 50));
        const afterArrowDown = await page.evaluate(() => document.getElementById('counter-value').textContent.trim());
        if (afterArrowDown !== '1') {
          throw new Error('ArrowDown 1회 후 counter-value 가 "1" 이 아님: ' + afterArrowDown);
        }
        console.log('[step7] ArrowDown 1회 → 1 OK (AC3)');

        await page.keyboard.press('r');
        await new Promise((r) => setTimeout(r, 50));
        const afterKbdReset = await page.evaluate(() => document.getElementById('counter-value').textContent.trim());
        if (afterKbdReset !== '0') {
          throw new Error('R 키 후 counter-value 가 "0" 이 아님: ' + afterKbdReset);
        }
        console.log('[step8] R 키 → 0 OK (AC3)');

        // 7. 키보드로도 0-플로어 클램프가 유지된다 (AC2 + AC3 결합 회귀)
        await page.keyboard.press('ArrowDown');
        await new Promise((r) => setTimeout(r, 50));
        const kbdClamped = await page.evaluate(() => document.getElementById('counter-value').textContent.trim());
        if (kbdClamped !== '0') {
          throw new Error('0 에서 ArrowDown 을 눌렀는데 음수로 내려감: ' + kbdClamped);
        }
        console.log('[step9] 0 에서 ArrowDown → 0 유지(클램프) OK (AC2+AC3)');

        console.log('[done] BF-864 E2E AC1~AC3 PASS');
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
            "카운터 초기값0→+1/-1 클릭→0-플로어 클램프→초기화→키보드(ArrowUp/ArrowDown/R) 접근 (BF-864 AC1~AC3)",
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
        `E2E AC1~AC3 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 콘솔/페이지 에러 0건 — 상호작용 전 구간 회귀 가드 (file:// → worker host 보강)
  // ─────────────────────────────────────────────────────────────
  test("BF-864 E2E: 클릭·키보드 전체 상호작용 구간 console.error / unhandledrejection / pageerror 0건", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/src/app/demo/counter/`;
      const scriptText = `
        await page.waitForSelector('#counter-value');

        // 부팅 직후 error hook 설치
        await page.evaluate(() => {
          window.__counterErrors = [];
          window.addEventListener('error', (e) => {
            window.__counterErrors.push('error: ' + (e.message || String(e)));
          });
          window.addEventListener('unhandledrejection', (e) => {
            window.__counterErrors.push(
              'unhandledrejection: ' + String(e.reason && e.reason.message ? e.reason.message : e.reason),
            );
          });
          const origErr = console.error.bind(console);
          console.error = function () {
            try {
              window.__counterErrors.push(
                'console.error: ' + Array.from(arguments).map(String).join(' '),
              );
            } catch (_e) {
              // 무한 재귀 방지
            }
            return origErr.apply(console, arguments);
          };
        });

        // 클릭 + 키보드 혼합 상호작용
        for (let i = 0; i < 4; i++) {
          await page.click('#btn-increment');
          await new Promise((r) => setTimeout(r, 30));
        }
        for (let i = 0; i < 2; i++) {
          await page.click('#btn-decrement');
          await new Promise((r) => setTimeout(r, 30));
        }
        await page.click('#btn-reset');
        await new Promise((r) => setTimeout(r, 30));
        await page.keyboard.press('ArrowUp');
        await new Promise((r) => setTimeout(r, 30));
        await page.keyboard.press('ArrowDown');
        await new Promise((r) => setTimeout(r, 30));
        await page.keyboard.press('ArrowDown'); // 0 에서 클램프 경로
        await new Promise((r) => setTimeout(r, 30));
        await page.keyboard.press('R');
        await new Promise((r) => setTimeout(r, 30));

        const errs = await page.evaluate(() => window.__counterErrors || []);
        if (errs.length > 0) {
          throw new Error(
            'console/page error 발생 (' + errs.length + '건): ' + errs.slice(0, 5).join(' | '),
          );
        }
        console.log('[done] BF-864 console/page error 0건 PASS');
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
            "카운터 클릭·키보드 상호작용 구간 console.error/pageerror/unhandledrejection 0건 (BF-864)",
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
        `console/page error 가드 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (clicker-e2e-worker-host.test.js BF-445 패턴과 동일)
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
 * 0.0.0.0 바인딩 임시 정적 서버(repo root 기준). 임의 포트로 동시 실행 충돌 회피.
 * counter 모듈은 src/app/demo/counter/ 아래 위치하므로 url 은 그 경로를 그대로 사용한다.
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
