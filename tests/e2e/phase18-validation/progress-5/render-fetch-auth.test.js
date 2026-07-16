// tests/e2e/phase18-validation/progress-5/render-fetch-auth.test.js
// BF-908 · /phase18-validation/progress-5 실 브라우저 E2E 회귀 가드 (테스터 소유, focused scope)
//
// 관련: docs/design/progress-5-BF-905.md(디자인, BF-905) · phase18-validation/progress-5/
//       {index.html,styles.css,fixtures.js,progress.js,main.js}(구현, BF-906).
// 본 파일은 리뷰 통과 후 main 에 머지된 최종 코드 기준으로 e2e-runner 실 브라우저
// 호출을 통해 "진입 렌더 · 데이터 fetch(초기 상태 계산) 성공 · 인증 가드(네트워크 요청
// 0건) · 체크박스 토글 실 인터랙션" 회귀를 검증한다.
//
// ── 중복 금지 (dev(BF-906) 가 tests/progress-5-BF906.test.js 에서 이미 커버 — 재작성 X) ──
//   - vanilla-static file:// 안전 가드(import/export·type=module·fetch/XHR/외부 URL 부재)
//   - 마크업/CSS 계약(#progress-5-checklist, .ic-topbar/.ic-panel/.ic-progress* 등 클래스,
//     --ic-progress-fill/--ic-progress-track 토큰, noscript 폴백, 스크립트 로드 순서)
//   - fixtures.js / progress.js 순수 로직(calculateProgress/toggleItem/formatShortDateTime)을
//     node:vm 샌드박스로 검증
//   → 본 파일은 이 항목들을 정적으로 다시 검증하지 않는다.
//
// ── 본 파일이 보호하는 대상 (BF-908 수용 기준) ────────────────────────────────
//   AC1(렌더+fetch): `/phase18-validation/progress-5/` 진입 시 실제 브라우저가 main.js
//                     를 실행해 fixtures.getChecklist() 데이터를 읽어(= 데이터 fetch 성공)
//                     체크리스트 5건 + 초기 진행률 40%(role=progressbar aria-valuenow=40 ·
//                     fill 40% · "2/5 완료 (40%)")를 정상 렌더한다(정적 마크업이 아니라
//                     "실행된 main.js 가 그려낸" DOM).
//   AC2(인증 가드): 페이지 진입부터 상호작용 전 구간까지 실 네트워크 레벨(Performance API)
//                   에서 cross-origin 요청 및 fetch/XHR 요청이 0건 — 이 페이지는 인증이
//                   필요 없고(로그인/토큰 없이 접근 가능) 그 사실이 런타임에서 확인된다.
//   (부가) 체크박스 실 클릭 인터랙션 — main.js 의 change 이벤트 위임이 실제로 진행률
//          바(fill/aria-valuenow)·텍스트·완료시각(<time>) 을 동일 사이클로 갱신하고,
//          재클릭 시 원상 복귀한다. dev 테스트는 toggleItem 을 vm 샌드박스 순수 함수로만
//          검증했고 실 DOM 클릭 인터랙션은 다루지 않음 — 실 브라우저에서만 검증 가능한
//          항목이라 본 파일의 핵심 대상이다.
//   (부가) 상호작용 전 구간 console.error 0건.
//
// CI 결정성: BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 skip (fail 아님).
// focused scope: BRIX_TEST_MODULE 이 'phase18-validation' 이 아니면 module 전체 skip.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 phase18-validation 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "phase18-validation";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // 실 브라우저 E2E — 렌더(데이터 fetch)→체크박스 토글(on/off)→인증 가드(네트워크 0건)
  //   (AC1+AC2 통합, e2e-runner 호출 1회로 비용 최소화)
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-908 E2E: /phase18-validation/progress-5/ 진입 렌더(초기 40%)→체크박스 토글(40%→60%→40%)→인증 가드(네트워크 0건)",
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
        const url = `http://${selfHost}:${port}/phase18-validation/progress-5/`;

        const scriptText = `
          // 에러 훅 설치 — 상호작용 전 구간 console.error 0건 확인용
          await page.evaluate(() => {
            window.__p5E2eErrors = [];
            const origError = console.error.bind(console);
            console.error = (...args) => { window.__p5E2eErrors.push(String(args[0])); origError(...args); };
          });

          // ── STEP 1: 렌더(데이터 fetch) — fixtures 5건 로드 + 초기 진행률 40% ──
          await page.waitForSelector('#progress-5-checklist[data-checklist-state="has-items"]');
          const s1 = await page.evaluate(() => {
            const container = document.getElementById('progress-5-checklist');
            const bar = container.querySelector('.ic-progress');
            const fill = container.querySelector('.ic-progress__fill');
            const text = container.querySelector('.ic-progress__text');
            const items = Array.from(container.querySelectorAll('li.ic-check'));
            return {
              itemCount: items.length,
              ariaValueNow: bar ? bar.getAttribute('aria-valuenow') : null,
              role: bar ? bar.getAttribute('role') : null,
              fillWidth: fill ? fill.style.width : null,
              text: text ? text.textContent : null,
              chk1Checked: document.getElementById('chk-p5-1').checked,
              chk3Checked: document.getElementById('chk-p5-3').checked,
              chk1HasTime: !!container.querySelector('.ic-check[data-checklist-id="chk-p5-1"] .ic-check__at'),
              chk3HasTime: !!container.querySelector('.ic-check[data-checklist-id="chk-p5-3"] .ic-check__at'),
            };
          });
          if (s1.itemCount !== 5) throw new Error('체크리스트 항목이 5건이 아님(데이터 fetch 실패 가능성): ' + s1.itemCount);
          if (s1.role !== 'progressbar') throw new Error('진행률 바 role=progressbar 아님: ' + s1.role);
          if (s1.ariaValueNow !== '40') throw new Error('초기 aria-valuenow 가 40 아님: ' + s1.ariaValueNow);
          if (s1.fillWidth !== '40%') throw new Error('초기 fill width 가 40% 아님: ' + s1.fillWidth);
          if (s1.text !== '2/5 완료 (40%)') throw new Error('초기 진행률 텍스트 불일치: ' + s1.text);
          if (s1.chk1Checked !== true) throw new Error('chk-p5-1(done=true) 체크박스가 checked 아님');
          if (s1.chk3Checked !== false) throw new Error('chk-p5-3(done=false) 체크박스가 unchecked 아님');
          if (s1.chk1HasTime !== true) throw new Error('chk-p5-1(done=true) 항목에 완료시각(<time>) 없음');
          if (s1.chk3HasTime !== false) throw new Error('chk-p5-3(done=false) 항목에 완료시각(<time>) 이 존재함');
          console.log('[step1] 진입 렌더(데이터 fetch 성공·5건·초기 40%) OK: ' + JSON.stringify(s1));

          // ── STEP 2: 체크박스 실 클릭(chk-p5-3 on) — 진행률 40%→60% 동일 사이클 갱신 ──
          await page.click('#chk-p5-3');
          await new Promise((r) => setTimeout(r, 200));
          const s2 = await page.evaluate(() => {
            const container = document.getElementById('progress-5-checklist');
            const bar = container.querySelector('.ic-progress');
            const fill = container.querySelector('.ic-progress__fill');
            const text = container.querySelector('.ic-progress__text');
            const timeEl = container.querySelector('.ic-check[data-checklist-id="chk-p5-3"] .ic-check__at');
            return {
              ariaValueNow: bar.getAttribute('aria-valuenow'),
              fillWidth: fill.style.width,
              text: text.textContent,
              chk3Checked: document.getElementById('chk-p5-3').checked,
              timeText: timeEl ? timeEl.textContent : null,
            };
          });
          if (s2.ariaValueNow !== '60') throw new Error('토글 on 후 aria-valuenow 가 60 아님: ' + s2.ariaValueNow);
          if (s2.fillWidth !== '60%') throw new Error('토글 on 후 fill width 가 60% 아님: ' + s2.fillWidth);
          if (s2.text !== '3/5 완료 (60%)') throw new Error('토글 on 후 진행률 텍스트 불일치: ' + s2.text);
          if (s2.chk3Checked !== true) throw new Error('클릭 후 chk-p5-3 이 checked 로 반영되지 않음');
          if (!s2.timeText || !/^\\d{2}-\\d{2} \\d{2}:\\d{2}$/.test(s2.timeText)) throw new Error('토글 on 후 완료시각(<time>) 포맷 불일치: ' + s2.timeText);
          console.log('[step2] 체크박스 토글 on(40%→60%) 진행률 바/텍스트/완료시각 동일 사이클 갱신 OK: ' + JSON.stringify(s2));

          // ── STEP 3: 같은 체크박스 재클릭(off) — 원상 복귀(60%→40%) ──
          await page.click('#chk-p5-3');
          await new Promise((r) => setTimeout(r, 200));
          const s3 = await page.evaluate(() => {
            const container = document.getElementById('progress-5-checklist');
            const bar = container.querySelector('.ic-progress');
            const fill = container.querySelector('.ic-progress__fill');
            const text = container.querySelector('.ic-progress__text');
            const hasTime = !!container.querySelector('.ic-check[data-checklist-id="chk-p5-3"] .ic-check__at');
            return {
              ariaValueNow: bar.getAttribute('aria-valuenow'),
              fillWidth: fill.style.width,
              text: text.textContent,
              chk3Checked: document.getElementById('chk-p5-3').checked,
              hasTime,
            };
          });
          if (s3.ariaValueNow !== '40') throw new Error('토글 off 후 aria-valuenow 가 40 으로 복귀하지 않음: ' + s3.ariaValueNow);
          if (s3.fillWidth !== '40%') throw new Error('토글 off 후 fill width 가 40% 로 복귀하지 않음: ' + s3.fillWidth);
          if (s3.text !== '2/5 완료 (40%)') throw new Error('토글 off 후 진행률 텍스트가 복귀하지 않음: ' + s3.text);
          if (s3.chk3Checked !== false) throw new Error('재클릭 후 chk-p5-3 이 unchecked 로 반영되지 않음');
          if (s3.hasTime !== false) throw new Error('토글 off 후 완료시각(<time>) 이 제거되지 않음');
          console.log('[step3] 체크박스 토글 off(60%→40%) 원상 복귀 OK: ' + JSON.stringify(s3));

          // ── STEP 4: 인증 가드 — 네트워크 요청 0건(런타임 관찰, AC2) ──
          const net = await page.evaluate(() => {
            const origin = window.location.origin;
            const resources = performance.getEntriesByType('resource');
            const crossOrigin = resources.filter((r) => !r.name.startsWith(origin)).map((r) => r.name);
            const networkInitiators = resources
              .filter((r) => r.initiatorType === 'fetch' || r.initiatorType === 'xmlhttprequest')
              .map((r) => r.name);
            return { crossOrigin, networkInitiators, total: resources.length, names: resources.map((r) => r.name), errors: window.__p5E2eErrors };
          });
          if (net.crossOrigin.length !== 0) throw new Error('cross-origin 리소스 요청 발견(인증 가드 위반 가능성): ' + JSON.stringify(net.crossOrigin));
          if (net.networkInitiators.length !== 0) throw new Error('fetch/XHR 요청 발견(인증 불필요 페이지에 네트워크 호출 존재): ' + JSON.stringify(net.networkInitiators));
          if (net.errors.length !== 0) throw new Error('상호작용 중 console.error 발생: ' + JSON.stringify(net.errors));
          console.log('[step4] 인증 가드 통과 — 네트워크 요청 전부 same-origin, fetch/XHR 0건, console.error 0건 OK (리소스 ' + net.total + '건: ' + JSON.stringify(net.names) + ')');

          console.log('[done] BF-908 E2E AC1+AC2 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-908",
          },
          body: JSON.stringify({
            url,
            label:
              "progress-5 진입 렌더(초기 40%)→체크박스 토글(40%↔60%)→인증 가드(네트워크 0건) (BF-908 AC1+AC2)",
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
          `E2E AC1+AC2 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-3000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 헬퍼 (BF-902/BF-896/BF-890 e2e-worker-host 패턴과 동일)
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
