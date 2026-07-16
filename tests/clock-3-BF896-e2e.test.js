// BF-896 · 세계시계 clock-3 E2E 브라우저 회귀 가드 (focused scope · module: clock-3)
//
// BF-894 dev 산출물 (phase18-validation/clock-3/) 이 main 에 머지된 후 실 브라우저에서
// silent break 되지 않도록, e2e-runner 컨테이너로 worker host URL 에 접근해
// 렌더 → 세 지역 실시간 표시 → 외부 요청 0건(런타임 관찰)을 검증한다.
//
// 보호 대상 (BF-896 수용 기준):
//   AC1. /phase18-validation/clock-3/ 렌더 시 서울/뉴욕/런던 3개 지역 카드가 모두
//        나타나고, 각 카드의 시각(h/m/s)이 setInterval tick 으로 실제로 갱신된다
//        (정적 마크업 placeholder 가 아니라 살아있는 갱신인지 실 브라우저에서 확인).
//   AC2. 페이지 로드~수 초 동안 실 브라우저 네트워크 레벨에서 관찰한 리소스 요청이
//        모두 same-origin(정적 서버) 이며, fetch/XHR 요청이 0건이다.
//
// 작성 방침 (BF-805/BF-788 e2e-worker-host 패턴 준수):
//   - CI 결정성: BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 t.skip().
//     assert.ok(reachable, ...) 같은 hookFail 패턴 금지.
//   - focused scope 정책: BRIX_TEST_MODULE 이 'clock-3' 이 아니면 module skip.
//   - BRIX_PERSONA_HOST env 우선. compose 서비스 hostname 만 허용
//     (host.docker.internal / localhost 금지 — e2e-runner 는 다른 컨테이너).
//   - dev 의 tests/clock-3-BF894.test.js 가 이미 커버한 항목은 재작성하지 않는다:
//     · import/export·type=module·fetch/XHR/외부 URL 미사용 정적 grep 가드
//     · 마크업 id/aria-label/CSS 클래스 존재 가드
//     · REGIONS 순서·Intl 투영 결과의 결정론적 순수 로직 (vm 샌드박스)
//     본 파일은 **실 브라우저에서만 검증 가능한 항목** — 실제 setInterval 갱신 동작과
//     실 네트워크 레벨 관찰(Performance API 기반 리소스 요청 origin/initiatorType) 만
//     담당한다. 정적 grep 은 소스 코드 텍스트만 보고 런타임 동작은 보증하지 않는다.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "clock-3";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // E2E — 렌더 → 세 지역 카드 확인 → 실시간 tick 갱신 확인 → 네트워크 요청 0건 확인
  //   (AC1~AC2 통합, e2e-runner 호출 1회로 비용 최소화)
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-896 E2E AC1~AC2: 렌더→세 지역 시각 표시→실시간 tick 갱신→외부 요청 0건",
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
        const url = `http://${selfHost}:${port}/phase18-validation/clock-3/`;

        const scriptText = `
          // ── STEP 1: 렌더 — 3개 지역 카드가 모두 나타난다 ──
          await page.waitForSelector('.region-grid');
          const s1 = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.region-clock'));
            return {
              count: cards.length,
              labels: cards.map((c) => c.getAttribute('aria-label')),
              displayIds: ['seoul', 'newyork', 'london'].map((id) => ({
                id,
                exists: !!document.getElementById('clock-' + id + '-display'),
                h: document.getElementById('clock-' + id + '-h')?.textContent,
                m: document.getElementById('clock-' + id + '-m')?.textContent,
                s: document.getElementById('clock-' + id + '-s')?.textContent,
                date: document.getElementById('clock-' + id + '-date')?.textContent,
              })),
            };
          });
          if (s1.count !== 3) throw new Error('지역 카드가 3개가 아님: ' + s1.count);
          for (const label of ['서울', '뉴욕', '런던']) {
            if (!s1.labels.includes(label)) throw new Error('지역 카드 aria-label 누락: ' + label + ' (실제: ' + JSON.stringify(s1.labels) + ')');
          }
          for (const d of s1.displayIds) {
            if (!d.exists) throw new Error(d.id + ' clock-display 요소 없음');
            if (!/^\\d{2}$/.test(d.h || '')) throw new Error(d.id + ' 시(h) 표시가 2자리 숫자 아님: ' + d.h);
            if (!/^\\d{2}$/.test(d.m || '')) throw new Error(d.id + ' 분(m) 표시가 2자리 숫자 아님: ' + d.m);
            if (!/^\\d{2}$/.test(d.s || '')) throw new Error(d.id + ' 초(s) 표시가 2자리 숫자 아님: ' + d.s);
            if (!d.date || d.date.trim().length === 0) throw new Error(d.id + ' 날짜 표시가 비어있음');
          }
          console.log('[step1] 3개 지역 카드 렌더 + h/m/s/date 표시 OK: ' + JSON.stringify(s1.displayIds));

          // ── STEP 2: 실시간 tick — 1.5초 대기 후 표시값이 실제로 갱신된다 ──
          const snapshot1 = s1.displayIds.map((d) => d.id + ':' + d.h + ':' + d.m + ':' + d.s);
          await new Promise((r) => setTimeout(r, 1500));
          const s2 = await page.evaluate(() => {
            return ['seoul', 'newyork', 'london'].map((id) => ({
              id,
              h: document.getElementById('clock-' + id + '-h')?.textContent,
              m: document.getElementById('clock-' + id + '-m')?.textContent,
              s: document.getElementById('clock-' + id + '-s')?.textContent,
            }));
          });
          const snapshot2 = s2.map((d) => d.id + ':' + d.h + ':' + d.m + ':' + d.s);
          let changedCount = 0;
          for (let i = 0; i < snapshot1.length; i++) {
            if (snapshot1[i] !== snapshot2[i]) changedCount++;
          }
          if (changedCount !== 3) throw new Error('1.5초 대기 후 tick 이 갱신되지 않은 지역 존재 — before=' + JSON.stringify(snapshot1) + ' after=' + JSON.stringify(snapshot2));
          console.log('[step2] 1.5초 경과 후 3개 지역 모두 실시간 tick 갱신 확인 OK: ' + JSON.stringify(snapshot2));

          // ── STEP 3: 네트워크 요청 0건(런타임 관찰) — same-origin 만, fetch/XHR 0건 ──
          const netCheck = await page.evaluate(() => {
            const origin = window.location.origin;
            const resources = performance.getEntriesByType('resource');
            const crossOrigin = resources
              .filter((r) => !r.name.startsWith(origin))
              .map((r) => r.name);
            const networkInitiators = resources.filter(
              (r) => r.initiatorType === 'fetch' || r.initiatorType === 'xmlhttprequest',
            ).map((r) => r.name);
            return {
              origin,
              totalResources: resources.length,
              resourceNames: resources.map((r) => r.name),
              crossOrigin,
              networkInitiators,
            };
          });
          if (netCheck.crossOrigin.length !== 0) throw new Error('cross-origin 리소스 요청 발견: ' + JSON.stringify(netCheck.crossOrigin));
          if (netCheck.networkInitiators.length !== 0) throw new Error('fetch/XHR 요청 발견: ' + JSON.stringify(netCheck.networkInitiators));
          console.log('[step3] 네트워크 요청 전부 same-origin, fetch/XHR 0건 OK (관찰된 리소스 ' + netCheck.totalResources + '건: ' + JSON.stringify(netCheck.resourceNames) + ')');

          console.log('[done] BF-896 E2E AC1~AC2 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-896",
          },
          body: JSON.stringify({
            url,
            label:
              "세계시계 clock-3 렌더→세 지역 실시간 tick 갱신→외부 요청 0건 (BF-896 AC1~AC2)",
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
          `E2E AC1~AC2 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-3000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 헬퍼 (BF-805/BF-788 e2e-worker-host 패턴과 동일)
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
