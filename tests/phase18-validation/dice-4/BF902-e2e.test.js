// BF-902 · /phase18-validation/dice-4 E2E 브라우저 회귀 가드 (focused scope · module: dice)
//
// BF-900 dev 산출물 (phase18-validation/dice-4/) 이 main 에 머지된 후 실 브라우저에서
// silent break 되지 않도록, e2e-runner 컨테이너로 worker host URL 에 접근해
// 렌더 → 굴리기(통계 갱신) → 개수 변경(리셋) → 외부 요청 0건(런타임 관찰)을 검증한다.
//
// 보호 대상 (BF-902 수용 기준):
//   AC1. 머지된 dice-4 코드 렌더 시 페이지가 정상 표시되고(주사위 2개 초기 상태 ·
//        통계 카드 is-empty), 굴리기 클릭 시 실제로 통계(합계/평균/최대)가 갱신되며,
//        데이터 fetch 는 없고(vanilla-static) 인증 가드도 필요 없음(런타임 네트워크
//        레벨에서 fetch/XHR/cross-origin 요청 0건으로 확인).
//   AC2. focused scope(module=dice) 에서만 실행 — 다른 SPA 회귀는 skip.
//
// 작성 방침 (BF-896/BF-805/BF-788 e2e-worker-host 패턴 준수):
//   - CI 결정성: BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 t.skip().
//     assert.ok(reachable, ...) 같은 hookFail 패턴 금지.
//   - focused scope 정책: BRIX_TEST_MODULE 이 'dice' 가 아니면 module skip.
//   - BRIX_PERSONA_HOST env 우선. compose 서비스 hostname 만 허용
//     (host.docker.internal / localhost 금지 — e2e-runner 는 다른 컨테이너).
//   - dev 의 tests/dice-4-BF900.test.js 가 이미 커버한 항목은 재작성하지 않는다:
//     · import/export·type=module·fetch/XHR/외부 URL 미사용 정적 grep 가드
//     · 마크업 id/문구/CSS 클래스 존재 가드, 제외 컴포넌트(history/modal) 부재 가드
//     · rollOne/computeStats 순수 로직 (vm 샌드박스)
//     본 파일은 **실 브라우저에서만 검증 가능한 항목** — 실제 클릭 인터랙션에 따른
//     상태 갱신(통계 표시·is-empty 토글·개수 변경 리셋)과 실 네트워크 레벨 관찰
//     (Performance API 기반 리소스 요청 origin/initiatorType) 만 담당한다.
//     정적 grep 은 소스 코드 텍스트만 보고 런타임 동작은 보증하지 않는다.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "dice";
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
  // E2E — 렌더 → 굴리기(통계 갱신) → 개수 변경(리셋) → 네트워크 요청 0건
  //   (AC1 통합, e2e-runner 호출 1회로 비용 최소화)
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-902 E2E AC1: 렌더(초기 2개·is-empty)→굴리기 통계 갱신→개수 변경 리셋→외부 요청 0건",
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
        const url = `http://${selfHost}:${port}/phase18-validation/dice-4/`;

        const scriptText = `
          // ── STEP 1: 렌더 — 초기 주사위 2개 + 통계 is-empty(--) + default count=2 선택 ──
          await page.waitForSelector('.dice-box');
          const s1 = await page.evaluate(() => {
            const box = document.getElementById('dice-box');
            const stats = document.getElementById('stat-sum').closest('.stats-card');
            return {
              diceCount: box.children.length,
              isEmpty: stats.classList.contains('is-empty'),
              sum: document.getElementById('stat-sum').textContent,
              avg: document.getElementById('stat-avg').textContent,
              max: document.getElementById('stat-max').textContent,
              checked2: document.querySelector('[data-count="2"]').getAttribute('aria-checked'),
            };
          });
          if (s1.diceCount !== 2) throw new Error('초기 주사위 타일 개수가 2 아님: ' + s1.diceCount);
          if (!s1.isEmpty) throw new Error('초기 stats-card 가 is-empty 아님');
          if (s1.sum !== '--' || s1.avg !== '--' || s1.max !== '--') throw new Error('초기 통계 표시가 -- 아님: ' + JSON.stringify(s1));
          if (s1.checked2 !== 'true') throw new Error('default count=2 버튼이 aria-checked=true 아님');
          console.log('[step1] 초기 렌더(주사위 2개·is-empty·default count=2) OK: ' + JSON.stringify(s1));

          // ── STEP 2: 굴리기 클릭 — 통계가 실제로 갱신된다 ──
          await page.click('#btn-roll');
          await new Promise((r) => setTimeout(r, 800));
          const s2 = await page.evaluate(() => {
            const stats = document.getElementById('stat-sum').closest('.stats-card');
            return {
              isEmpty: stats.classList.contains('is-empty'),
              sum: document.getElementById('stat-sum').textContent,
              avg: document.getElementById('stat-avg').textContent,
              max: document.getElementById('stat-max').textContent,
              diceCount: document.getElementById('dice-box').children.length,
            };
          });
          if (s2.isEmpty) throw new Error('굴리기 후에도 is-empty 그대로 (통계 갱신 안 됨)');
          if (s2.sum === '--' || s2.avg === '--' || s2.max === '--') throw new Error('굴리기 후에도 통계가 여전히 --: ' + JSON.stringify(s2));
          if (s2.diceCount !== 2) throw new Error('굴리기 후 주사위 타일 개수 불일치(2 유지돼야 함): ' + s2.diceCount);
          console.log('[step2] 굴리기 후 통계 갱신(sum/avg/max) OK: ' + JSON.stringify(s2));

          // ── STEP 3: 주사위 개수 변경(2→4) — 통계가 is-empty(--) 로 리셋되고 타일 개수도 갱신 ──
          await page.click('[data-count="4"]');
          await new Promise((r) => setTimeout(r, 200));
          const s3 = await page.evaluate(() => {
            const stats = document.getElementById('stat-sum').closest('.stats-card');
            return {
              isEmpty: stats.classList.contains('is-empty'),
              sum: document.getElementById('stat-sum').textContent,
              diceCount: document.getElementById('dice-box').children.length,
              checked4: document.querySelector('[data-count="4"]').getAttribute('aria-checked'),
              checked2: document.querySelector('[data-count="2"]').getAttribute('aria-checked'),
            };
          });
          if (!s3.isEmpty) throw new Error('개수 변경 후 stats-card 가 is-empty 로 리셋되지 않음');
          if (s3.sum !== '--') throw new Error('개수 변경 후 stat-sum 이 -- 로 리셋되지 않음: ' + s3.sum);
          if (s3.diceCount !== 4) throw new Error('개수 변경(4) 후 주사위 타일 개수가 4 아님: ' + s3.diceCount);
          if (s3.checked4 !== 'true' || s3.checked2 !== 'false') throw new Error('개수 변경 후 aria-checked 상태 갱신 안 됨: ' + JSON.stringify(s3));
          console.log('[step3] 개수 변경(2→4) 후 통계 리셋 + 타일 개수 갱신 OK: ' + JSON.stringify(s3));

          // ── STEP 4: 네트워크 요청 0건(런타임 관찰) — same-origin 만, fetch/XHR 0건(인증 가드 불필요 · AC2) ──
          const net = await page.evaluate(() => {
            const origin = window.location.origin;
            const resources = performance.getEntriesByType('resource');
            const crossOrigin = resources.filter((r) => !r.name.startsWith(origin)).map((r) => r.name);
            const networkInitiators = resources
              .filter((r) => r.initiatorType === 'fetch' || r.initiatorType === 'xmlhttprequest')
              .map((r) => r.name);
            return { crossOrigin, networkInitiators, total: resources.length, names: resources.map((r) => r.name) };
          });
          if (net.crossOrigin.length !== 0) throw new Error('cross-origin 리소스 요청 발견: ' + JSON.stringify(net.crossOrigin));
          if (net.networkInitiators.length !== 0) throw new Error('fetch/XHR 요청 발견: ' + JSON.stringify(net.networkInitiators));
          console.log('[step4] 네트워크 요청 전부 same-origin, fetch/XHR 0건 OK (관찰된 리소스 ' + net.total + '건: ' + JSON.stringify(net.names) + ')');

          console.log('[done] BF-902 E2E AC1 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-902",
          },
          body: JSON.stringify({
            url,
            label:
              "dice-4 렌더(초기 2개·is-empty)→굴리기 통계 갱신→개수 변경 리셋→외부 요청 0건 (BF-902 AC1)",
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
          `E2E AC1 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-3000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 헬퍼 (BF-896/BF-805/BF-788 e2e-worker-host 패턴과 동일)
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
