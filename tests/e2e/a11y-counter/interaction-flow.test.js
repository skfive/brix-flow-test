// tests/e2e/a11y-counter/interaction-flow.test.js
// BF-890 · /a11y-counter/ 실 브라우저 E2E 회귀 가드 (테스터 소유, focused scope)
//
// 관련: docs/planning/a11y-counter-BF-886.md(기획) · docs/design/a11y-counter-BF-885.md
//       (디자인, BF-887) · a11y-counter/{index.html,styles.css,counter.js,main.js}(구현, BF-888).
// 본 파일은 리뷰 통과 후 main 에 머지된 최종 코드 기준으로 e2e-runner 실 브라우저
// 호출을 통해 "페이지 렌더 · 키보드 증감 · 포인터 증감 · 리셋" 회귀를 검증한다.
//
// ── 중복 금지 (dev 가 이미 커버 — 재작성 X) ────────────────────────────────
//   tests/a11y-counter-BF888.test.js:
//     - vanilla-static file:// 안전 가드(import/export·type=module·fetch/스토리지 부재)
//     - 마크업 계약(#counter-value/#btn-* id, aria-live=polite, button type=button,
//       title/h1 문구, <kbd> 힌트, 상대경로 참조)
//     - CSS 접근성 토큰(:focus-visible outline/box-shadow, min-height:48px,
//       prefers-reduced-motion/prefers-color-scheme, accent/focus-ring 값)
//     - counter.js 순수 로직(INITIAL_VALUE/increment/decrement 0-floor/reset, 순수성)
//   → 본 파일은 이 항목들을 정적으로 다시 검증하지 않는다.
//
// ── 본 파일이 보호하는 대상 (작업 AC) ───────────────────────────────────────
//   AC-render  : `/a11y-counter/` 진입 시 실제 브라우저가 페이지를 렌더하고
//                #counter-value 가 초기값 "0" 을 표시한다(정적 마크업이 아니라
//                "실행된 main.js 가 그려낸" DOM).
//   AC-pointer : #btn-increment/#btn-decrement 클릭이 실제로 값을 증감시키고,
//                0 에서 -1 클릭을 반복해도 0 미만으로 내려가지 않는다(0-floor).
//   AC-keyboard: ArrowUp/ArrowDown 키 입력(포커스 위치 무관, document 레벨)이
//                실제로 값을 증감시키고, 0 에서 ArrowDown 을 반복해도 0-floor 를
//                유지한다.
//   AC-reset   : 초기화 버튼 클릭과 R 키 입력 각각이 값을 상태 무관 0 으로
//                되돌린다.
//   (부가) 시나리오 구간 console.error / pageerror / unhandledrejection 0건.
//
// CI 결정성: BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 skip (fail 아님).
// focused scope: BRIX_TEST_MODULE 이 'a11y-counter' 가 아니면 module 전체 skip.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 a11y-counter 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "a11y-counter";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // 실 브라우저 E2E — 렌더 → 포인터 증감 → 키보드 증감 → 리셋(버튼+R키)
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-890 E2E: /a11y-counter/ 진입 렌더 + 포인터/키보드 증감(0-floor) + 리셋(버튼·R키)",
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
        const url = `http://${selfHost}:${port}/a11y-counter/`;
        const scriptText = `
          // 헬퍼: 에러 훅 설치
          const installErrorHooks = async () => {
            await page.evaluate(() => {
              window.__a11yE2eErrors = [];
              window.addEventListener('error', (e) => {
                window.__a11yE2eErrors.push('error: ' + (e.message || String(e)));
              });
              window.addEventListener('unhandledrejection', (e) => {
                window.__a11yE2eErrors.push(
                  'unhandledrejection: ' + String(e.reason && e.reason.message ? e.reason.message : e.reason),
                );
              });
              const origErr = console.error.bind(console);
              console.error = function () {
                try {
                  window.__a11yE2eErrors.push(
                    'console.error: ' + Array.from(arguments).map(String).join(' '),
                  );
                } catch (_e) {
                  // 무한 재귀 방지
                }
                return origErr.apply(console, arguments);
              };
            });
          };
          const assertNoErrors = async (label) => {
            const errs = await page.evaluate(() => window.__a11yE2eErrors || []);
            if (errs.length > 0) {
              throw new Error(label + ': 시나리오 구간 error 발생 (' + errs.length + '건): ' + errs.slice(0, 5).join(' | '));
            }
          };
          const readValue = () => page.evaluate(() => document.getElementById('counter-value').textContent);

          await page.waitForSelector('#counter-value');
          await installErrorHooks();

          // 1. AC-render — 진입 즉시 실 브라우저 DOM 에 초기값 0 표시
          const initial = await readValue();
          if (initial !== '0') {
            throw new Error('AC-render: 초기 렌더 값이 0 이 아님: ' + initial);
          }

          // 2. AC-pointer — 클릭으로 증가 3회 → 3, 감소 1회 → 2
          await page.click('#btn-increment');
          await page.click('#btn-increment');
          await page.click('#btn-increment');
          let v = await readValue();
          if (v !== '3') throw new Error('AC-pointer: +1 클릭 3회 후 값이 3 이 아님: ' + v);
          await page.click('#btn-decrement');
          v = await readValue();
          if (v !== '2') throw new Error('AC-pointer: -1 클릭 1회 후 값이 2 가 아님: ' + v);

          // 3. AC-pointer(0-floor) — -1 클릭을 값 이상 반복해도 0 미만으로 안 내려감
          await page.click('#btn-decrement');
          await page.click('#btn-decrement');
          await page.click('#btn-decrement'); // 이미 0인 상태에서 한 번 더
          v = await readValue();
          if (v !== '0') throw new Error('AC-pointer: 0-floor 클램프 실패 — 0 미만으로 내려감: ' + v);

          // 4. AC-keyboard — ArrowUp 2회 → 2, ArrowDown 1회 → 1 (포커스 위치 무관)
          await page.keyboard.press('ArrowUp');
          await page.keyboard.press('ArrowUp');
          v = await readValue();
          if (v !== '2') throw new Error('AC-keyboard: ArrowUp 2회 후 값이 2 가 아님: ' + v);
          await page.keyboard.press('ArrowDown');
          v = await readValue();
          if (v !== '1') throw new Error('AC-keyboard: ArrowDown 1회 후 값이 1 이 아님: ' + v);

          // 5. AC-keyboard(0-floor) — ArrowDown 을 반복해도 0 미만 금지
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('ArrowDown');
          v = await readValue();
          if (v !== '0') throw new Error('AC-keyboard: ArrowDown 0-floor 클램프 실패: ' + v);

          // 6. AC-reset(버튼) — 몇 번 증가 후 초기화 버튼 클릭 → 0
          await page.click('#btn-increment');
          await page.click('#btn-increment');
          await page.click('#btn-increment');
          v = await readValue();
          if (v !== '3') throw new Error('AC-reset 준비: +1 클릭 3회 후 값이 3 이 아님: ' + v);
          await page.click('#btn-reset');
          v = await readValue();
          if (v !== '0') throw new Error('AC-reset(버튼): 초기화 버튼 클릭 후 값이 0 이 아님: ' + v);

          // 7. AC-reset(R키) — 몇 번 증가 후 R 키로 초기화(상태 무관 항상 0)
          await page.keyboard.press('ArrowUp');
          await page.keyboard.press('ArrowUp');
          v = await readValue();
          if (v !== '2') throw new Error('AC-reset(R) 준비: ArrowUp 2회 후 값이 2 가 아님: ' + v);
          await page.keyboard.press('r');
          v = await readValue();
          if (v !== '0') throw new Error('AC-reset(R): R 키 입력 후 값이 0 이 아님: ' + v);

          await assertNoErrors('전체 시나리오');
          console.log('[done] BF-890 E2E PASS — 렌더/포인터/키보드/리셋 전 시나리오 통과');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-890",
          },
          body: JSON.stringify({
            url,
            label:
              "접근성 카운터 진입 렌더 + 포인터/키보드 증감(0-floor) + 리셋(버튼·R키) (BF-890)",
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
          `E2E 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (tests/status-card/BF884-e2e.test.js 패턴과 동일 — 파일별 자기완결 컨벤션)
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
