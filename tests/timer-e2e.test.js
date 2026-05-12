// BF-409 · 타이머 SPA E2E 회귀 가드 (focused scope · timer module)
//
// 보호 대상 (BF-407 가 main 에 들어간 후 silent break 방지):
//   1. /timer/ 경로의 SPA 가 로드되고 핵심 DOM id 가 존재한다
//      (selector contract — #disp-m / #disp-s / #btn-primary / #btn-reset / #input-m / #input-s)
//   2. 5초 설정 → 시작 → 1초 대기 → 0:04 표시 → 일시정지 (값 유지) → 리셋 →
//      idle 복귀 (마지막 설정값 표시) → 새로고침 → localStorage 'timer:last' 로부터 복원
//      시나리오가 단대단으로 통과한다.
//   3. localStorage key 'timer:last' 가 {minutes,seconds} JSON 으로 영속.
//
// 작성 방침:
//   - 정적 가드는 위치/순서 의존 X — `includes` 만 사용
//   - E2E 가드는 e2e-runner 컨테이너 호출 (compose 네트워크). CI 환경엔 없으므로
//     도달 불가 / BRIX_E2E_SKIP=1 이면 skip (fail 아님 — 결함 14/19 회귀 방지)
//   - focused scope 정책: BRIX_TEST_MODULE 가 timer 가 아니면 module 전체 skip
//   - BRIX_PERSONA_HOST env 우선 사용 — e2e-runner 가 페르소나 컨테이너의 정적 서버에
//     도달할 수 있는 hostname (compose 네트워크의 service name). localhost / host.docker.internal 금지.
//
// 메모 — description 본문 vs AC 표기 mismatch:
//   description 본문은 "5초 설정 → 1초 대기 → 0:04" 흐름을 명시하지만,
//   AC1 의 "리셋 → 0:00", AC3 의 "마지막 설정값 5:00 복원" 표기는 BF-407 의 reset 동작
//   (idle 복귀 = configM/S 표시) 과 정합하지 않는다. BF-407 의 통합 테스트도
//   reset 후 마지막 설정값 복귀를 fact 로 검증. 본 가드는 description 본문 timing
//   (5초 설정 → 1초 후 0:04) 을 시나리오 단계로 채택하고, 리셋/복원 표시값은 BF-407
//   code fact (0:05) 를 검증한다 — silent break 방지가 최우선.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "timer";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const TIMER_HTML = path.join(REPO_ROOT, "timer", "index.html");
const TIMER_MAIN = path.join(REPO_ROOT, "timer", "main.js");
const TIMER_STORAGE = path.join(REPO_ROOT, "timer", "storage.js");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // 정적 가드 — selector contract & localStorage key 계약 보호
  // ─────────────────────────────────────────────────────────────
  test("BF-409 정적 AC1: timer/index.html 에 SPA 핵심 DOM id 가 존재", () => {
    const html = fs.readFileSync(TIMER_HTML, "utf-8");
    const requiredIds = [
      "disp-m", // display 분
      "disp-s", // display 초
      "display", // 큰 디스플레이 컨테이너 (상태 클래스 토글)
      "input-m", // 분 입력
      "input-s", // 초 입력
      "btn-primary", // 시작/일시정지/재개
      "btn-reset", // 리셋
      "ended-banner", // 종료 배너 (시간 다 됨)
      "btn-banner-close", // 배너 닫기
    ];
    for (const id of requiredIds) {
      assert.ok(
        html.includes(`id="${id}"`),
        `timer/index.html 에 id="${id}" 가 없음 — SPA selector contract 깨짐`,
      );
    }
  });

  test("BF-409 정적 AC2: localStorage key prefix 'timer:' / 'timer:last' 계약 유지", () => {
    // 새로고침 복원 시나리오가 'timer:last' 키 자체를 가정.
    // 코드가 다른 key 로 옮겨가면 E2E 시나리오의 직접 검증부가 의미를 잃는다 — fact 잠금.
    const storageJs = fs.readFileSync(TIMER_STORAGE, "utf-8");
    assert.ok(
      storageJs.includes('TIMER_PREFIX = "timer:"') ||
        storageJs.includes("TIMER_PREFIX = 'timer:'"),
      "storage.js 의 TIMER_PREFIX 가 'timer:' 가 아님",
    );
    assert.ok(
      storageJs.includes('TIMER_LAST_KEY = TIMER_PREFIX + "last"') ||
        storageJs.includes("TIMER_LAST_KEY = TIMER_PREFIX + 'last'"),
      "storage.js 의 TIMER_LAST_KEY 합성식이 변경됨",
    );
  });

  test("BF-409 정적 AC3: main.js 가 store.saveLast/loadLast 를 호출 (복원 흐름 보호)", () => {
    const mainJs = fs.readFileSync(TIMER_MAIN, "utf-8");
    assert.ok(
      mainJs.includes("store.saveLast"),
      "main.js 가 saveLast 호출을 잃음 — '시작 시 마지막 설정값 저장' 흐름 깨짐",
    );
    assert.ok(
      mainJs.includes("store.loadLast"),
      "main.js 가 loadLast 호출을 잃음 — '새로고침 후 복원' 흐름 깨짐",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // E2E 가드 — 5초 → 시작 → 1초 대기 → 0:04 → 일시정지 → 리셋 → 새로고침 → 복원
  // BRIX_PERSONA_HOST 를 e2e-runner 의 url hostname 으로 사용 (AC1 매핑).
  // ─────────────────────────────────────────────────────────────
  test("BF-409 E2E AC4: 5초 설정 → 시작 → 1초 → 0:04 → 일시정지 → 리셋 → 새로고침 → 복원 시나리오", async (t) => {
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

    // 정적 서버 inline 기동 (0.0.0.0 — e2e-runner 컨테이너에서 service hostname 으로 접근)
    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    // BRIX_PERSONA_HOST 가 e2e-runner → 페르소나 컨테이너 통신의 정식 hostname.
    // 운영자 가이드 기본값은 'worker'. host.docker.internal/localhost 사용 금지.
    const selfHost =
      process.env.BRIX_PERSONA_HOST ??
      process.env.BRIX_WORKER_HOSTNAME ??
      "worker";

    try {
      const url = `http://${selfHost}:${port}/timer/`;
      const scriptText = `
        // 0. clean start — localStorage 초기화 후 reload
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#btn-primary');
        console.log('[step] clean start OK');

        // 1. 5초 입력 (분=0, 초=5) — input 이벤트가 idle display 동기
        await page.fill('#input-m', '0');
        await page.fill('#input-s', '5');
        // 입력 후 display 0:05 동기 확인 (페르소나 코드의 onInputChange → applyInputsToConfig → render)
        await page.waitForFunction(
          () => {
            const m = document.getElementById('disp-m').textContent;
            const s = document.getElementById('disp-s').textContent;
            return m === '0' && s === '05';
          },
          { timeout: 3000 }
        );
        console.log('[step] 5초 입력 + display 0:05 동기 OK');

        // 2. 시작 클릭 → 1초 대기 → display 0:04
        await page.click('#btn-primary');
        // msToMmSs 는 Math.ceil — 1초 정확히 지나면 ceil(4000ms/1000) = 4초 → 0:04 표시.
        // 1100ms 대기로 ceil 안정화 (1000ms 직전 보더 케이스 회피).
        await new Promise((r) => setTimeout(r, 1100));
        const dispAfter1s = await page.evaluate(() => ({
          m: document.getElementById('disp-m').textContent,
          s: document.getElementById('disp-s').textContent,
        }));
        if (dispAfter1s.m !== '0' || dispAfter1s.s !== '04') {
          throw new Error('1초 대기 후 display 가 0:04 가 아님: ' + JSON.stringify(dispAfter1s));
        }
        console.log('[step] 시작 + 1초 → 0:04 OK');

        // 3. 일시정지 → display 0:04 유지 (시간 멈춤)
        await page.click('#btn-primary');
        // 일시정지 직후의 display 캡처
        const dispRightAfterPause = await page.evaluate(() => ({
          m: document.getElementById('disp-m').textContent,
          s: document.getElementById('disp-s').textContent,
        }));
        if (dispRightAfterPause.m !== '0' || dispRightAfterPause.s !== '04') {
          throw new Error('일시정지 직후 display 가 0:04 가 아님: ' + JSON.stringify(dispRightAfterPause));
        }
        // 추가 600ms 대기 — 일시정지 중엔 tick 이 멈춰야 함 (값 그대로)
        await new Promise((r) => setTimeout(r, 600));
        const dispAfterHold = await page.evaluate(() => ({
          m: document.getElementById('disp-m').textContent,
          s: document.getElementById('disp-s').textContent,
        }));
        if (dispAfterHold.m !== '0' || dispAfterHold.s !== '04') {
          throw new Error('일시정지 추가 대기 후 display 가 변함: ' + JSON.stringify(dispAfterHold));
        }
        console.log('[step] 일시정지 + 추가 대기 → 0:04 유지 OK');

        // 4. 리셋 → idle 복귀, display 는 마지막 설정값 (0:05) — BF-407 reset() fact
        await page.click('#btn-reset');
        const dispAfterReset = await page.evaluate(() => ({
          m: document.getElementById('disp-m').textContent,
          s: document.getElementById('disp-s').textContent,
        }));
        // 리셋은 idle 로 가서 configMinutes/configSeconds 표시 — 5초 설정이므로 0:05
        if (dispAfterReset.m !== '0' || dispAfterReset.s !== '05') {
          throw new Error(
            '리셋 후 display 가 마지막 설정값 0:05 가 아님: ' + JSON.stringify(dispAfterReset)
          );
        }
        console.log('[step] 리셋 → 0:05 (마지막 설정값 복귀) OK');

        // 5. localStorage timer:last 가 {minutes:0, seconds:5} 로 저장돼 있어야 함 (시작 시 persistLast)
        const lastRaw = await page.evaluate(() => localStorage.getItem('timer:last'));
        if (!lastRaw) {
          throw new Error('timer:last 키 미존재 — startOrResume 의 persistLast 누락');
        }
        const parsed = JSON.parse(lastRaw);
        if (parsed.minutes !== 0 || parsed.seconds !== 5) {
          throw new Error('timer:last JSON 불일치: ' + lastRaw);
        }
        console.log('[step] localStorage timer:last={"minutes":0,"seconds":5} 확인 OK');

        // 6. 새로고침 → localStorage 로부터 마지막 설정값 복원 (display 0:05)
        await page.reload();
        await page.waitForSelector('#btn-primary');
        const dispAfterReload = await page.evaluate(() => ({
          m: document.getElementById('disp-m').textContent,
          s: document.getElementById('disp-s').textContent,
        }));
        if (dispAfterReload.m !== '0' || dispAfterReload.s !== '05') {
          throw new Error(
            '새로고침 후 display 가 0:05 (timer:last 복원) 이 아님: ' +
              JSON.stringify(dispAfterReload)
          );
        }
        // input 도 동기 복원 — main.js 의 부팅 분기
        const inputs = await page.evaluate(() => ({
          m: document.getElementById('input-m').value,
          s: document.getElementById('input-s').value,
        }));
        if (inputs.m !== '0' || inputs.s !== '5') {
          throw new Error('새로고침 후 input 동기 실패: ' + JSON.stringify(inputs));
        }
        console.log('[step] 새로고침 → display & input 0:05 복원 OK');

        // 7. cleanup — 후속 시나리오 영향 없게 localStorage 비움
        await page.evaluate(() => localStorage.clear());
        console.log('[done] BF-409 시나리오 전체 PASS');
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
            "타이머 5초 → 시작 → 1초 → 0:04 → 일시정지 → 리셋 → 새로고침 복원 (BF-409)",
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

// ─────────────────────────────────────────────────────────────
// inline static server (0.0.0.0 바인딩 — e2e-runner 컨테이너에서 페르소나 hostname 으로 접근 가능)
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
