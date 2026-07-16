// BF-870 · 핫픽스 검증 대시보드(BF-866/867/868) 병합 결과 E2E 검증 (focused scope)
//
// 배경:
//   - BF-866 (planner): docs/hotfix-validation/plan/hotfix-validation-BF-866.md
//   - BF-867 (designer): docs/hotfix-validation/design/hotfix-validation-BF-867.html (단일 self-contained 시안)
//   - BF-868 (developer): docs/hotfix-validation/impl/hotfix-checklist.js + .test.js (18개 단위 테스트, 로직 커버)
//
// tester 고유 영역만 가드 (dev 단위 테스트와 중복 금지):
//   1. 산출물 존재 — plan/design/impl 3개 파일이 실제로 main 에 존재
//   2. UI 마크업 contract — 시안 HTML 의 section 앵커 id / 카드·배지·표 구조 (silent break 방지)
//   3. CORS 안전 (file:// 호환) — <script> 태그·fetch() 미사용 (designer 명세: 외부 의존성 0건, 순수 시각 시안)
//   4. 실 브라우저 렌더 — e2e-runner 로 실제 로드 후 타이틀/섹션/카드/배지 개수/CSS 적용 확인
//      (dev 의 hotfix-checklist.js 는 DOM 과 무관한 순수 로직이므로 브라우저 검증 대상은 시안 HTML 뿐)
//
// buildChecklist/summarizeChecklist/nextStage 의 로직 정확성은 BF-868 의
// docs/hotfix-validation/impl/hotfix-checklist.test.js (18 tests, pass) 가 이미 검증 — 재작성하지 않는다.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "hotfix-validation";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const BASE_DIR = path.join(REPO_ROOT, "docs", "hotfix-validation");
const PLAN_MD = path.join(BASE_DIR, "plan", "hotfix-validation-BF-866.md");
const DESIGN_HTML = path.join(
  BASE_DIR,
  "design",
  "hotfix-validation-BF-867.html",
);
const IMPL_JS = path.join(BASE_DIR, "impl", "hotfix-checklist.js");
const IMPL_TEST_JS = path.join(BASE_DIR, "impl", "hotfix-checklist.test.js");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // 정적 가드 1 — 산출물 존재 (plan/design/impl 3건)
  // ─────────────────────────────────────────────────────────────
  test("BF-870 AC1: plan/design/impl 산출물이 main 에 모두 존재", () => {
    for (const [label, p] of [
      ["plan (BF-866)", PLAN_MD],
      ["design (BF-867)", DESIGN_HTML],
      ["impl (BF-868) js", IMPL_JS],
      ["impl (BF-868) test", IMPL_TEST_JS],
    ]) {
      assert.ok(fs.existsSync(p), `${label} 산출물이 없음: ${p}`);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 정적 가드 2 — UI 마크업 contract (위치 무관, includes 만 사용)
  // ─────────────────────────────────────────────────────────────
  test("BF-870 AC2: 시안 HTML 에 section 앵커 id 4개가 존재", () => {
    const html = fs.readFileSync(DESIGN_HTML, "utf-8");
    for (const id of ["s-pipeline", "s-cat", "s-edge", "s-spec"]) {
      assert.ok(
        html.includes(`id="${id}"`),
        `design HTML 에 id="${id}" 없음 — section 앵커 silent break`,
      );
    }
  });

  test("BF-870 AC2: 파이프라인/카드/배지/체크리스트 핵심 class 가 존재", () => {
    const html = fs.readFileSync(DESIGN_HTML, "utf-8");
    for (const cls of [
      'class="pipeline"',
      'class="stage done"',
      'class="stage current"',
      'class="cards"',
      'class="card"',
      'class="badge pass"',
      'class="badge pending"',
      'class="badge na"',
      'class="checklist"',
    ]) {
      assert.ok(
        html.includes(cls),
        `design HTML 에 ${cls} 없음 — 컴포넌트 마크업 contract 깨짐`,
      );
    }
  });

  test("BF-870 AC2: 상태 배지 4종 CSS 토큰(pass/pending/fail/na)이 정의됨", () => {
    const html = fs.readFileSync(DESIGN_HTML, "utf-8");
    for (const token of [
      "--status-pass-fg",
      "--status-pending-fg",
      "--status-fail-fg",
      "--status-na-fg",
    ]) {
      assert.ok(
        html.includes(token),
        `design HTML 에 CSS 토큰 ${token} 정의가 없음`,
      );
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 정적 가드 3 — CORS 안전 (file:// 호환, vanilla-static 규약)
  // ─────────────────────────────────────────────────────────────
  test("BF-870 AC3: 시안 HTML 은 <script> 태그·fetch() 를 사용하지 않는다 (file:// 호환)", () => {
    const html = fs.readFileSync(DESIGN_HTML, "utf-8");
    assert.ok(
      !/<script[\s>]/i.test(html),
      "design HTML 에 <script> 태그가 있음 — 시안 산출물은 순수 시각 문서여야 함(designer 명세: 외부 의존성 0건)",
    );
    assert.ok(
      !html.includes("fetch("),
      "design HTML 에 fetch() 호출이 있음 — file:// 오픈 시 CORS 오류 위험",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // E2E 가드 — e2e-runner 로 실제 브라우저 렌더 확인
  // ─────────────────────────────────────────────────────────────
  test("BF-870 E2E AC4: 시안 HTML 실제 렌더 — 타이틀/섹션/카드/배지/표/CSS 적용", async (t) => {
    // CI 결정성 — 명시 skip
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    // CI 결정성 — e2e-runner 도달 불가면 skip (assert 금지)
    try {
      const probe = await fetch("http://e2e-runner:3030/health", {
        signal: AbortSignal.timeout(2000),
      });
      if (!probe.ok) {
        t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
        return;
      }
    } catch (err) {
      t.skip(`e2e-runner 도달 불가 (${err.message}) — CI 환경 정상`);
      return;
    }

    // 정적 서버 inline 기동 (0.0.0.0 — e2e-runner 컨테이너에서 접근 가능)
    const server = await startStaticServer(path.join(BASE_DIR, "design"));
    const port = server.address().port;
    const selfHost = process.env.BRIX_WORKER_HOSTNAME ?? "worker";

    try {
      const url = `http://${selfHost}:${port}/hotfix-validation-BF-867.html`;
      const scriptText = `
        await page.waitForSelector('.pipeline');
        const result = await page.evaluate(() => {
          const title = document.title;
          const hasPipeline = !!document.querySelector('.pipeline');
          const cards = document.querySelectorAll('.card').length;
          const badges = document.querySelectorAll('.badge').length;
          const stages = document.querySelectorAll('.stage').length;
          const hasSPipeline = !!document.getElementById('s-pipeline');
          const hasSCat = !!document.getElementById('s-cat');
          const hasSEdge = !!document.getElementById('s-edge');
          const hasSSpec = !!document.getElementById('s-spec');
          const edgeRows = document.querySelectorAll('table tbody tr').length;
          const bg = getComputedStyle(document.body).backgroundColor;
          return { title, hasPipeline, cards, badges, stages, hasSPipeline, hasSCat, hasSEdge, hasSSpec, edgeRows, bg };
        });
        console.log('[render-result] ' + JSON.stringify(result));

        if (result.title !== 'PR #283 핫픽스 검증 대시보드 시안 — BF-867') {
          throw new Error('title mismatch: ' + result.title);
        }
        if (!result.hasPipeline) throw new Error('no .pipeline element');
        if (result.cards !== 4) throw new Error('cards !== 4: got ' + result.cards);
        if (result.stages !== 4) throw new Error('stages !== 4: got ' + result.stages);
        if (result.badges < 8) throw new Error('badges < 8: got ' + result.badges);
        if (!result.hasSPipeline || !result.hasSCat || !result.hasSEdge || !result.hasSSpec) {
          throw new Error('missing section anchor id');
        }
        if (result.edgeRows !== 5) throw new Error('edge case rows !== 5: got ' + result.edgeRows);
        if (!result.bg || result.bg === 'rgba(0, 0, 0, 0)') {
          throw new Error('CSS not applied — body background transparent: ' + result.bg);
        }
        console.log('[done] BF-870 렌더 검증 PASS');
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
          label: "BF-870 핫픽스 검증 대시보드 시안 렌더 + 마크업 contract 확인",
          scriptText,
          timeoutMs: 30000,
        }),
      });
      const json = await res.json();
      assert.ok(
        json.ok,
        `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
      );
      assert.ok(
        json.passed,
        `E2E 렌더 검증 실패 — stdout 끝: ${String(json.stdout ?? json.errorMessage ?? "").slice(-800)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// inline static server (0.0.0.0 바인딩 — e2e-runner 컨테이너에서 접근 가능)
// 임의 포트 (0) 로 listen 해서 다른 테스트와 충돌 방지.
// ─────────────────────────────────────────────────────────────
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
      if (urlPath.endsWith("/")) urlPath += "hotfix-validation-BF-867.html";
      // path traversal 방지 — rootDir 밖으로 못 나가게
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
