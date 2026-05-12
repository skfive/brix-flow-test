// BF-404 · 메모장 SPA E2E 회귀 가드 (focused scope)
//
// 보호 대상 (BF-402 가 main 에 들어간 후 silent break 방지):
//   1. /notepad/ 경로의 SPA 가 로드되고 핵심 DOM id 가 존재한다
//      (selector contract — #btn-new / #btn-save / #note-list 등)
//   2. 메모 작성 → 저장 → 새로고침 → 목록 표시 → 클릭 미리보기 → 삭제 →
//      목록에서 사라짐 시나리오가 단대단으로 통과한다 (localStorage 영속성 포함)
//   3. 시나리오 종료 시 localStorage 의 'notepad:' 잔여 키 없음 (cleanup 계약)
//
// 작성 방침:
//   - 정적 가드는 위치/순서 의존 X — `includes` 만 사용
//   - E2E 가드는 e2e-runner 컨테이너 호출 (compose 네트워크). CI 환경엔 없으므로
//     도달 불가 / BRIX_E2E_SKIP=1 이면 skip (fail 아님 — 결함 14/19 회귀 방지)
//   - focused scope 정책: BRIX_TEST_MODULE 가 notepad 가 아니면 module 전체 skip

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "notepad";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const NOTEPAD_HTML = path.join(REPO_ROOT, "notepad", "index.html");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // 정적 가드 — selector contract 보호 (DOM id 가 사라지면 E2E 도 깨짐)
  // ─────────────────────────────────────────────────────────────
  test("BF-404 정적 AC1: notepad/index.html 에 SPA 핵심 DOM id 가 존재", () => {
    const html = fs.readFileSync(NOTEPAD_HTML, "utf-8");
    // 시나리오에서 selector 로 참조하는 id 들 — 하나라도 빠지면 시나리오 깨짐
    const requiredIds = [
      "btn-new", // 새 메모 진입
      "btn-save", // 저장
      "btn-delete", // 삭제 진입
      "btn-confirm-delete", // 삭제 확인 (모달)
      "note-list", // 메모 목록 컨테이너
      "list-empty", // 비어있음 안내
      "editor-title", // 제목 입력
      "editor-body", // 본문 입력
      "editor-pane", // 편집 패널 (작성 모드 진입 시 표시)
      "delete-modal", // 삭제 확인 모달
    ];
    for (const id of requiredIds) {
      assert.ok(
        html.includes(`id="${id}"`),
        `index.html 에 id="${id}" 가 없음 — SPA selector contract 깨짐`,
      );
    }
  });

  test("BF-404 정적 AC2: 목록 항목 class 'list__item' 와 비어있음 'list__empty' 사용", () => {
    // main.js 가 동적으로 li.className = 'list__item' 으로 렌더하고,
    // 빈 상태일 때 #list-empty 를 노출한다 (storage.list().length === 0).
    // 시나리오는 '.list__item' / '#list-empty:not([hidden])' 로 검증.
    const mainJs = fs.readFileSync(
      path.join(REPO_ROOT, "notepad", "main.js"),
      "utf-8",
    );
    assert.ok(
      mainJs.includes("list__item"),
      "main.js 에 'list__item' class 가 보이지 않음 — 목록 selector 깨짐",
    );
    assert.ok(
      mainJs.includes("listEmptyEl"),
      "main.js 에 listEmptyEl 참조가 없음 — 빈 상태 토글 깨짐",
    );
  });

  test("BF-404 정적 AC3: localStorage key prefix 'notepad:' 계약 유지", () => {
    // cleanup 가드가 prefix 로 잔여 키를 검사하므로, 코드가 다른 prefix 로
    // 옮겨가면 시나리오 의미가 사라진다 — fact 잠금.
    const storageJs = fs.readFileSync(
      path.join(REPO_ROOT, "notepad", "storage.js"),
      "utf-8",
    );
    assert.ok(
      storageJs.includes('NOTE_PREFIX = "notepad:"') ||
        storageJs.includes("NOTE_PREFIX = 'notepad:'"),
      "storage.js 의 NOTE_PREFIX 가 'notepad:' 가 아님 — cleanup 검증 무력화",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // E2E 가드 — 단일 시나리오로 작성→저장→reload→미리보기→삭제→cleanup
  // ─────────────────────────────────────────────────────────────
  test("BF-404 E2E AC4: 메모 작성 → 저장 → reload → 미리보기 → 삭제 → cleanup 시나리오", async (t) => {
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
    // 페르소나는 compose 의 worker 컨테이너 안 — e2e-runner 가 같은 docker
    // 네트워크의 hostname (worker) 으로 접근해야 함. host.docker.internal 은
    // 호스트 OS 를 가리키므로 페르소나 컨테이너의 inline 서버에 닿지 못한다.
    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = process.env.BRIX_WORKER_HOSTNAME ?? "worker";

    try {
      const url = `http://${selfHost}:${port}/notepad/`;
      const scriptText = `
        // 0. clean start — localStorage 초기화 후 reload
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#btn-new');
        console.log('[step] clean start OK');

        // 1. 새 메모 작성
        await page.click('#btn-new');
        await page.waitForSelector('#editor-pane:not([hidden])');
        await page.fill('#editor-title', 'E2E 회귀 메모');
        await page.fill('#editor-body', '본문 내용 — BF-404');
        console.log('[step] 새 메모 입력 OK');

        // 2. 저장 → list 항목 1개
        await page.click('#btn-save');
        await page.waitForFunction(
          () => document.querySelectorAll('#note-list .list__item').length === 1,
          { timeout: 5000 }
        );
        console.log('[step] 저장 후 목록 1개 OK');

        // 3. 새로고침 → 목록 표시 (localStorage 영속성)
        await page.reload();
        await page.waitForSelector('#note-list .list__item');
        const afterReload = await page.evaluate(
          () => document.querySelectorAll('#note-list .list__item').length
        );
        if (afterReload !== 1) {
          throw new Error('reload 후 list count ≠ 1: got ' + afterReload);
        }
        console.log('[step] reload 후 영속성 OK');

        // 4. 항목 클릭 → 미리보기 (editor 에 title/body 복원)
        await page.click('#note-list .list__item');
        await page.waitForSelector('#editor-pane:not([hidden])');
        const previewTitle = await page.inputValue('#editor-title');
        const previewBody = await page.inputValue('#editor-body');
        if (previewTitle !== 'E2E 회귀 메모') {
          throw new Error('미리보기 title 불일치: ' + JSON.stringify(previewTitle));
        }
        if (previewBody !== '본문 내용 — BF-404') {
          throw new Error('미리보기 body 불일치: ' + JSON.stringify(previewBody));
        }
        console.log('[step] 클릭 미리보기 OK');

        // 5. 삭제 → 모달 → 확인
        await page.click('#btn-delete');
        await page.waitForSelector('#delete-modal:not([hidden])');
        await page.click('#btn-confirm-delete');
        console.log('[step] 삭제 모달 확인 OK');

        // 6. 목록에서 사라짐 — list-empty 표시 + item 0개
        await page.waitForSelector('#list-empty:not([hidden])', { timeout: 5000 });
        const finalCount = await page.evaluate(
          () => document.querySelectorAll('#note-list .list__item').length
        );
        if (finalCount !== 0) {
          throw new Error('delete 후 list count ≠ 0: got ' + finalCount);
        }
        console.log('[step] 삭제 후 목록 비움 OK');

        // 7. localStorage 'notepad:' 잔여 키 없음 (cleanup 계약)
        const remaining = await page.evaluate(() => {
          const out = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('notepad:')) out.push(k);
          }
          return out;
        });
        if (remaining.length !== 0) {
          throw new Error('cleanup 잔여 키: ' + JSON.stringify(remaining));
        }
        console.log('[step] localStorage cleanup OK');

        // 8. 마지막 안전 cleanup
        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-404 시나리오 전체 PASS');
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
            "메모 작성 → 저장 → reload → 미리보기 → 삭제 → cleanup (BF-404)",
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
        `E2E 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-800)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// inline static server (0.0.0.0 바인딩 — host.docker.internal 으로 접근 가능)
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
      if (urlPath.endsWith("/")) urlPath += "index.html";
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
