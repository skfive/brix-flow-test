// BF-884 · /phase18-validation/status-card-1(리포지토리 경로 status-card/) 실 브라우저 E2E 회귀 가드
//
// 관련: docs/planning/status-card-BF-879.md(기획, BF-880) · docs/design/status-card-BF-879.md
//       (디자인, BF-881) · status-card/{index.html,styles.css,status.js,main.js}(구현, BF-882).
// 본 파일은 머지된 최종 코드 기준으로 e2e-runner 실 브라우저 호출을 통해
// "진입 렌더 · fixture 표시 · 라이트/다크 디자인 일관성" 회귀를 검증한다.
//
// ── 중복 금지 (dev 가 이미 커버 — 재작성 X) ──────────────────────────────
//   tests/status-card-BF882.test.js:
//     - vanilla-static file:// 안전 가드(import/export·type=module·fetch/타이머 부재)
//     - 마크업 계약(#summary-banner/#status-list id, title/h1 문구, noscript, 상대경로 참조)
//     - CSS 토큰 존재(--color-success/warning/danger, dark 블록, 배지 var(--…) 참조)
//     - status.js 순수 파생 로직(fixture 4필드·3상태·라벨/아이콘·worst=outage·summarize·subline)
//   → 본 파일은 이 항목들을 정적으로 다시 검증하지 않는다.
//
// ── 본 파일이 보호하는 대상 (작업 AC) ─────────────────────────────────────
//   AC-render : `/status-card/` 진입 시 summary-banner·status-list 가 실제 DOM 으로
//               렌더되고(정적 마크업 존재가 아니라 "브라우저가 실제로 그려낸" DOM),
//               자바스크립트 실행이 fixture 를 status-list 에 반영한다.
//   AC-fixture: 서비스 4개가 fixture 순서·id 그대로 카드로 표시되고, 배지
//               role=img + aria-label(§5.1), summary-banner 문구(worst=outage
//               요약 텍스트 + "장애 1 · 저하 1 · 정상 2" 서브라인)가 실 브라우저에서
//               계산된 값과 일치한다.
//   AC-theme  : initTheme() 이 OS prefers-color-scheme 를 실제로 반영해 data-theme 를
//               light/dark 전환하고, 전환 후에도 fixture 렌더(4카드 + 배너)가 그대로
//               유지된다(디자인 일관성 — dev 정적 가드가 다루지 않는 브라우저 전용 계약).
//   (부가) 시나리오 구간 console.error / pageerror / unhandledrejection 0건.
//
// CI 결정성: BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 skip (fail 아님).
// focused scope: BRIX_TEST_MODULE 이 'status-card' 가 아니면 module 전체 skip.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 status-card 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "status-card";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // 실 브라우저 E2E — 렌더 → fixture 표시 검증 → 라이트/다크 테마 일관성
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-884 E2E: /status-card/ 진입 렌더 + fixture 표시(4카드·요약배너) + 라이트/다크 디자인 일관성",
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
        const url = `http://${selfHost}:${port}/status-card/`;
        const scriptText = `
          // 헬퍼: 에러 훅 설치 (매 네비게이션 직후 재설치 — reload 하면 이전 훅은
          // document 와 함께 사라지므로 훅은 항상 "설치 시점 이후" 구간만 커버)
          const installErrorHooks = async () => {
            await page.evaluate(() => {
              window.__scE2eErrors = [];
              window.addEventListener('error', (e) => {
                window.__scE2eErrors.push('error: ' + (e.message || String(e)));
              });
              window.addEventListener('unhandledrejection', (e) => {
                window.__scE2eErrors.push(
                  'unhandledrejection: ' + String(e.reason && e.reason.message ? e.reason.message : e.reason),
                );
              });
              const origErr = console.error.bind(console);
              console.error = function () {
                try {
                  window.__scE2eErrors.push(
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
            const errs = await page.evaluate(() => window.__scE2eErrors || []);
            if (errs.length > 0) {
              throw new Error(label + ': 시나리오 구간 error 발생 (' + errs.length + '건): ' + errs.slice(0, 5).join(' | '));
            }
          };

          // 0. 라이트 모드 명시 강제(OS 실제 설정에 영향받지 않도록) 후 재로드
          await page.emulateMedia({ colorScheme: 'light' });
          await page.reload({ waitUntil: 'load' });
          await page.waitForSelector('#status-list .status-card');
          await installErrorHooks();

          // 헬퍼: 현재 DOM 을 읽어 요약배너 + 카드 4개 + 배지 계약을 검사
          const readAndValidate = async (label) => {
            const r = await page.evaluate(() => {
              const banner = document.getElementById('summary-banner');
              const cards = Array.from(document.querySelectorAll('#status-list > li.status-card'));
              return {
                dataTheme: document.documentElement.getAttribute('data-theme'),
                bannerClass: banner ? banner.className : null,
                bannerTitle: banner ? banner.querySelector('.summary-banner__title')?.textContent : null,
                bannerSub: banner ? banner.querySelector('.summary-banner__sub')?.textContent : null,
                cardIds: cards.map((c) => c.id),
                cardNames: cards.map((c) => c.querySelector('.status-card__name')?.textContent),
                badgeRoles: cards.map((c) => c.querySelector('.status-badge')?.getAttribute('role')),
                badgeAriaLabels: cards.map((c) => c.querySelector('.status-badge')?.getAttribute('aria-label')),
                iconAriaHidden: cards.map((c) => c.querySelector('.status-badge__icon')?.getAttribute('aria-hidden')),
              };
            });

            if (r.bannerClass !== 'summary-banner summary-banner--outage') {
              throw new Error(label + ': summary-banner class 불일치: ' + r.bannerClass);
            }
            if (r.bannerTitle !== '일부 서비스에 장애가 발생했습니다.') {
              throw new Error(label + ': summary-banner 제목 문구 불일치: ' + r.bannerTitle);
            }
            if (r.bannerSub !== '전체 서비스 4개 중 장애 1 · 저하 1 · 정상 2') {
              throw new Error(label + ': summary-banner 서브라인 불일치: ' + r.bannerSub);
            }
            const expIds = ['status-card-web', 'status-card-api', 'status-card-database', 'status-card-auth'];
            if (JSON.stringify(r.cardIds) !== JSON.stringify(expIds)) {
              throw new Error(label + ': 카드 id 순서/구성 불일치: ' + JSON.stringify(r.cardIds));
            }
            const expNames = ['웹 서버', 'API 게이트웨이', '데이터베이스', '인증 서비스'];
            if (JSON.stringify(r.cardNames) !== JSON.stringify(expNames)) {
              throw new Error(label + ': 카드 서비스명 불일치: ' + JSON.stringify(r.cardNames));
            }
            if (!r.badgeRoles.every((role) => role === 'img')) {
              throw new Error(label + ': 배지 role=img 아닌 항목 존재: ' + JSON.stringify(r.badgeRoles));
            }
            const expAria = [
              '웹 서버 상태: 정상',
              'API 게이트웨이 상태: 정상',
              '데이터베이스 상태: 저하',
              '인증 서비스 상태: 장애',
            ];
            if (JSON.stringify(r.badgeAriaLabels) !== JSON.stringify(expAria)) {
              throw new Error(label + ': 배지 aria-label 불일치: ' + JSON.stringify(r.badgeAriaLabels));
            }
            if (!r.iconAriaHidden.every((v) => v === 'true')) {
              throw new Error(label + ': 장식 아이콘 aria-hidden=true 아닌 항목 존재: ' + JSON.stringify(r.iconAriaHidden));
            }
            return r;
          };

          // 2. AC-render + AC-fixture — 라이트 모드 진입 렌더 + fixture 4카드 정합
          const light = await readAndValidate('AC-render/AC-fixture(light)');
          if (light.dataTheme !== 'light') {
            throw new Error('AC-theme: 라이트 모드 진입 시 data-theme 가 light 가 아님: ' + light.dataTheme);
          }
          const badgeBgLight1 = await page.evaluate(() => {
            const badge = document.querySelector('#status-card-auth .status-badge');
            return badge ? getComputedStyle(badge).backgroundColor : null;
          });
          await assertNoErrors('[step1] light');
          console.log('[step1] AC-render + AC-fixture OK — light 모드 4카드 + 요약배너 정합');

          // 3. AC-theme — 다크 모드로 전환 후 재진입해도 data-theme 반영 + fixture 렌더 유지
          await page.emulateMedia({ colorScheme: 'dark' });
          await page.reload({ waitUntil: 'load' });
          await page.waitForSelector('#status-list .status-card');
          await installErrorHooks();
          const dark = await readAndValidate('AC-theme(dark 재검증 fixture 유지)');
          if (dark.dataTheme !== 'dark') {
            throw new Error('AC-theme: 다크 모드 진입 시 data-theme 가 dark 로 전환되지 않음: ' + dark.dataTheme);
          }
          const badgeBgDark = await page.evaluate(() => {
            const badge = document.querySelector('#status-card-auth .status-badge');
            return badge ? getComputedStyle(badge).backgroundColor : null;
          });
          await assertNoErrors('[step2] dark');
          console.log('[step2] AC-theme OK — dark 모드 전환 + 4카드/요약배너 렌더 유지');

          // 4. 디자인 일관성 — 라이트/다크 전환 시 배지 배경색이 실제로 달라진다
          //    (data-theme 속성만 바뀌고 CSS 가 미적용되는 회귀 방지)
          if (!badgeBgLight1 || !badgeBgDark || badgeBgLight1 === badgeBgDark) {
            throw new Error('디자인 일관성: outage 배지 배경색이 light/dark 간 동일함(테마 CSS 미적용 의심): light=' + badgeBgLight1 + ' dark=' + badgeBgDark);
          }
          console.log('[step3] 디자인 일관성 OK — light/dark 배지 배경색 실제 전환 확인');

          console.log('[done] BF-884 E2E PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-884",
          },
          body: JSON.stringify({
            url,
            label:
              "서비스 상태 카드 진입 렌더 + fixture 4카드 표시 + 라이트/다크 디자인 일관성 (BF-884)",
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
// 헬퍼들 (tests/dice/BF852-e2e.test.js 패턴과 동일 — 파일별 자기완결 컨벤션)
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
