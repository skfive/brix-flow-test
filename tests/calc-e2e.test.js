// BF-412 · 계산기 SPA E2E 회귀 가드 (focused scope · calc module)
//
// 보호 대상:
//   1. /calc/ 경로의 SPA 가 로드되고 핵심 DOM id 가 존재한다
//      (selector contract — #expr / #result / #keypad / data-key 셀 / #btn-theme)
//   2. AC1: 빈 상태 → "2+3" 입력 → "=" 클릭 → 결과 영역 "5" 표시 → localStorage 'calc:last' = "5"
//   3. AC2: 새로고침 → 결과 영역 "5" 복원
//   4. AC3: C 클릭 → 수식·결과 초기화 / ← 클릭 → 마지막 1글자 제거
//   5. AC4: source 자체에 eval/Function 호출 흔적 없음

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const _BRIX_MY_MODULE = "calc";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CALC_HTML = path.join(REPO_ROOT, "calc", "index.html");
const CALC_MAIN = path.join(REPO_ROOT, "calc", "main.js");
const CALC_STORAGE = path.join(REPO_ROOT, "calc", "storage.js");
const CALC_PARSER = path.join(REPO_ROOT, "calc", "calc.js");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  test("BF-412 정적 AC1: calc/index.html 에 SPA 핵심 DOM id 가 존재", () => {
    const html = fs.readFileSync(CALC_HTML, "utf-8");
    const requiredIds = ["expr", "result", "keypad", "btn-theme"];
    for (const id of requiredIds) {
      assert.ok(
        html.includes(`id="${id}"`),
        `calc/index.html 에 id="${id}" 가 없음 — SPA selector contract 깨짐`,
      );
    }
    const requiredKeys = [
      "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
      ".", "+", "-", "*", "/", "=", "C", "backspace",
    ];
    for (const k of requiredKeys) {
      assert.ok(
        html.includes(`data-key="${k}"`),
        `calc/index.html 에 data-key="${k}" 가 없음 — 키패드 셀 누락`,
      );
    }
  });

  test("BF-412 정적 AC2: localStorage key prefix 'calc:' / 'calc:last' 계약 유지", () => {
    const storageJs = fs.readFileSync(CALC_STORAGE, "utf-8");
    assert.ok(
      storageJs.includes('CALC_PREFIX = "calc:"') ||
        storageJs.includes("CALC_PREFIX = 'calc:'"),
      "storage.js 의 CALC_PREFIX 가 'calc:' 가 아님",
    );
    assert.ok(
      storageJs.includes('CALC_LAST_KEY = CALC_PREFIX + "last"') ||
        storageJs.includes("CALC_LAST_KEY = CALC_PREFIX + 'last'"),
      "storage.js 의 CALC_LAST_KEY 합성식이 변경됨",
    );
  });

  test("BF-412 정적 AC3: main.js 가 store.saveLast/loadLast 를 호출", () => {
    const mainJs = fs.readFileSync(CALC_MAIN, "utf-8");
    assert.ok(
      mainJs.includes("store.saveLast"),
      "main.js 가 saveLast 호출을 잃음",
    );
    assert.ok(
      mainJs.includes("store.loadLast"),
      "main.js 가 loadLast 호출을 잃음",
    );
  });

  test("BF-412 정적 AC4: eval / Function 호출 흔적이 calc/ 안에 없음", () => {
    const files = [CALC_PARSER, CALC_MAIN, CALC_STORAGE];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf-8");
      assert.ok(
        !/\beval\s*\(/.test(src),
        `${path.basename(f)} 에 eval( 호출 흔적이 있음 — AC4 위반`,
      );
      assert.ok(
        !/\bnew\s+Function\s*\(/.test(src),
        `${path.basename(f)} 에 new Function( 호출 흔적이 있음 — AC4 위반`,
      );
    }
  });

  // E2E 시나리오 — focused module 가 calc 일 때만 e2e-runner 호출
  // 전체 npm test (module 미설정) 에서는 호출하지 않음 — 다른 module e2e 와의
  // 병렬 race / e2e-runner 동시 호출 불안정을 회피.
  test("BF-412 E2E AC5: '2+3' → '=' → '5' 표시 + calc:last + 복원 + C/← (focused 모드만)", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    // focused + module=calc 인 경우에만 실제 e2e-runner 호출. 그 외에는 skip.
    if (
      process.env.BRIX_TEST_SCOPE !== "focused" ||
      process.env.BRIX_TEST_MODULE !== "calc"
    ) {
      t.skip(
        "focused+calc 외 — 정적 가드만 실행 (full scope 에서 e2e-runner 동시 호출 회피)",
      );
      return;
    }
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

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost =
      process.env.BRIX_PERSONA_HOST ??
      process.env.BRIX_WORKER_HOSTNAME ??
      "worker";

    try {
      const url = `http://${selfHost}:${port}/calc/`;
      const scriptText = `
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#keypad');
        console.log('[step] clean start OK');

        const dispInit = await page.evaluate(() => document.getElementById('result').textContent.trim());
        if (dispInit !== '0') throw new Error('초기 결과 영역이 0 이 아님: ' + dispInit);
        console.log('[step] 초기 0 OK');

        await page.click('[data-key="2"]');
        await page.click('[data-key="+"]');
        await page.click('[data-key="3"]');
        await page.click('[data-key="="]');
        const dispAfterEq = await page.evaluate(() =>
          document.getElementById('result').textContent.trim()
        );
        if (dispAfterEq !== '5') throw new Error('= 후 결과가 5 가 아님: ' + dispAfterEq);
        console.log('[step] 2+3= → 5 OK');

        const lastRaw = await page.evaluate(() => localStorage.getItem('calc:last'));
        if (lastRaw !== '5') throw new Error("calc:last 가 '5' 가 아님: " + JSON.stringify(lastRaw));
        console.log('[step] calc:last="5" OK');

        await page.reload();
        await page.waitForSelector('#keypad');
        const dispAfterReload = await page.evaluate(() =>
          document.getElementById('result').textContent.trim()
        );
        if (dispAfterReload !== '5') {
          throw new Error('새로고침 후 결과가 5 가 아님: ' + dispAfterReload);
        }
        console.log('[step] 새로고침 후 5 복원 OK');

        await page.click('[data-key="7"]');
        await page.click('[data-key="C"]');
        const afterC = await page.evaluate(() => ({
          expr: document.getElementById('expr').textContent.trim(),
          result: document.getElementById('result').textContent.trim(),
        }));
        if (afterC.expr !== '' || afterC.result !== '0') {
          throw new Error('C 후 상태가 빈 상태가 아님: ' + JSON.stringify(afterC));
        }
        console.log('[step] C → 초기화 OK');

        await page.click('[data-key="1"]');
        await page.click('[data-key="2"]');
        await page.click('[data-key="3"]');
        await page.click('[data-key="backspace"]');
        const afterBs = await page.evaluate(() => ({
          expr: document.getElementById('expr').textContent.trim(),
          result: document.getElementById('result').textContent.trim(),
        }));
        if (afterBs.expr !== '12' || afterBs.result !== '12') {
          throw new Error('← 후 상태가 12 가 아님: ' + JSON.stringify(afterBs));
        }
        console.log('[step] 123 → ← → 12 OK');

        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-412 시나리오 전체 PASS');
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
          label: "계산기 2+3 → = → 5 → 새로고침 복원 → C/← 동작 (BF-412)",
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
        `E2E 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-1200)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

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
