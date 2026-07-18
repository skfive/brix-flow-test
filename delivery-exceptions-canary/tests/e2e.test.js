/* delivery-exceptions-canary/tests/e2e.test.js — 실 브라우저 E2E 회귀 가드 (e2e-runner)
 * BF-1035 · 정적 가드(render.test.js 등)로 검증 어려운 SPA 인터랙션 커버:
 *   페이지 렌더 → fixture 데이터 표시 → 상태 필터 클릭 → 예외 선택(상세 렌더)
 *   → 해결 메모 입력/저장 → localStorage 실제 persist → reload 후 메모 유지
 * vanilla-static — node --test 로 실행. e2e-runner 도달 불가(CI 등)면 skip(fail 아님, CI 결정성 가드).
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = "delivery-exceptions-canary";
if (
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE
) {
  const _test = require("node:test");
  _test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
  module.exports = {};
  return;
}

const REPO_ROOT = path.join(__dirname, "..", "..");
const STATIC_URL_PATH = "/delivery-exceptions-canary/";
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
};

/* file:// 대신 실 HTTP 로 서빙 — python3 미가용 환경 대응, Node 내장 http 만 사용(외부 의존 0).
 * 고정 포트(예: 8080) 재사용 시 다른 worktree 가 띄워둔 낡은 서버를 오탐할 위험이 있어
 * 매번 이 프로세스 전용 ephemeral 포트(listen(0, ...))로 직접 기동해 항상 본 worktree 파일을 서빙한다. */
function startOwnStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const filePath = path.join(REPO_ROOT, urlPath);
      if (!filePath.startsWith(REPO_ROOT)) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        res.writeHead(200, { "Content-Type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.on("error", () => resolve(null));
    server.listen(0, "0.0.0.0", () => resolve(server));
  });
}

let ownedServer = null;
let staticPort = null;

test.before(async () => {
  if (process.env.BRIX_E2E_SKIP === "1") return;
  ownedServer = await startOwnStaticServer();
  if (ownedServer) {
    staticPort = ownedServer.address().port;
  }
});

test.after(async () => {
  if (ownedServer) {
    await new Promise((resolve) => ownedServer.close(resolve));
  }
});

test("BF-1035 E2E — 렌더/fixture/필터/선택/메모 저장/새로고침 후 유지 (실 브라우저)", async (t) => {
  // 1. 명시적 CI 가드
  if (process.env.BRIX_E2E_SKIP === "1") {
    t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
    return;
  }
  // 2. 정적 서버 기동 여부 — 실패는 skip(fail 아님)
  if (!ownedServer || !staticPort) {
    t.skip("본 worktree 정적 서버 기동 실패 — skip");
    return;
  }
  // 3. e2e-runner 도달성 사전 확인 — 못 닿으면 skip(fail 아님)
  let probe;
  try {
    probe = await fetch("http://e2e-runner:3030/health", { signal: AbortSignal.timeout(2000) });
  } catch (err) {
    t.skip(`e2e-runner 도달 불가 (${err.message}) — skip`);
    return;
  }
  if (!probe.ok) {
    t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
    return;
  }

  const host = process.env.BRIX_PERSONA_HOST || "worker";
  const url = `http://${host}:${staticPort}${STATIC_URL_PATH}`;
  const scriptText = `
    await page.waitForSelector('.dxc-list-item');

    const summary = (await page.locator('#dxc-summary').textContent() || '').trim();
    if (summary !== '총 7 · 미해결 5 · 해결 2') throw new Error('summary mismatch: ' + summary);

    const allCount = await page.locator('.dxc-list-item').count();
    if (allCount !== 7) throw new Error('초기 목록 건수 불일치: ' + allCount);

    await page.locator('.dxc-filter-tab[data-value="resolved"]').click();
    await page.waitForTimeout(150);
    const resolvedCount = await page.locator('.dxc-list-item').count();
    if (resolvedCount !== 2) throw new Error('resolved 필터 건수 불일치: ' + resolvedCount);

    await page.locator('.dxc-filter-tab[data-value="all"]').click();
    await page.waitForTimeout(150);

    await page.locator('.dxc-list-item[data-id="EXC-5001"]').click();
    await page.waitForTimeout(150);
    const detailName = (await page.locator('.dxc-detail__name').textContent() || '').trim();
    if (!detailName.includes('김도윤')) throw new Error('상세 패널 렌더 불일치: ' + detailName);

    const memoText = 'e2e 회귀 가드 메모 ' + Date.now();
    await page.locator('.dxc-memo__textarea').fill(memoText);
    const saveBtn = page.locator('.dxc-memo__save');
    const disabled = await saveBtn.isDisabled();
    if (disabled) throw new Error('저장 버튼이 비활성 상태 — 변경 감지 실패');
    await saveBtn.click();
    await page.waitForTimeout(150);
    const savedLine = (await page.locator('.dxc-memo__saved-at').textContent() || '').trim();
    if (!savedLine.includes('저장됨')) throw new Error('메모 저장 후 저장 시각 미반영: ' + savedLine);

    const stored = await page.evaluate(() => window.localStorage.getItem('delivery-exceptions-canary:notes'));
    if (!stored || stored.indexOf('EXC-5001') === -1 || stored.indexOf(memoText) === -1) {
      throw new Error('localStorage persist 실패: ' + stored);
    }

    await page.reload();
    await page.waitForSelector('.dxc-list-item');
    await page.locator('.dxc-list-item[data-id="EXC-5001"]').click();
    await page.waitForTimeout(150);
    const savedLineAfterReload = (await page.locator('.dxc-memo__saved-at').textContent() || '').trim();
    if (!savedLineAfterReload.includes('저장됨')) {
      throw new Error('새로고침 후 메모 미유지: ' + savedLineAfterReload);
    }
    const textareaAfterReload = await page.locator('.dxc-memo__textarea').inputValue();
    if (textareaAfterReload !== memoText) {
      throw new Error('새로고침 후 메모 본문 불일치: ' + textareaAfterReload);
    }
  `;

  // 4. 본 e2e-runner 호출 — 헤더에 BRIX_RUN_ID / BRIX_JIRA_KEY 전달
  const res = await fetch("http://e2e-runner:3030/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
      "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "",
    },
    body: JSON.stringify({
      url,
      label: "배송 예외 처리 — 렌더/필터/선택/메모 저장/새로고침 유지",
      scriptText,
      timeoutMs: 60000,
    }),
  });
  const body = await res.json();
  assert.ok(res.ok, "e2e-runner 응답 실패: " + JSON.stringify(body));
  assert.equal(body.passed, true, "E2E 시나리오 실패: " + (body.stdout || JSON.stringify(body)));
});
