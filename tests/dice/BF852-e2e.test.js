// BF-852 · /demo/dice(리포지토리 경로 dice/) 실 브라우저 E2E 회귀 가드
//
// 관련 명세: docs/spec/dice-roll-BF-848.md (AC-1 1~6 유효 숫자 · AC-2 굴리기 버튼 ·
//           AC-3 키보드 동작). 본 파일은 BF-848 이 재정의한 4개 핵심 상호작용 중
//           작업 AC 가 명시한 3개(렌더 · 굴리기 클릭 → 1~6 유효 숫자 · 키보드 동작)를
//           머지된 최종 코드(dice/index.html·main.js·storage.js) 기준으로 e2e-runner
//           실 브라우저 호출을 통해 검증한다.
//
// ── 중복 금지 (기존 dice 가드가 이미 커버 — 재작성 X) ──────────────────────
//   - tests/dice-storage.test.js       : storage API / cap 10 / round-trip 단위 계약
//   - tests/dice-ui.test.js            : HTML 마크업 · CSS 토큰 · file:// 안전 정적 fact
//   - tests/dice-demo-BF850.test.js    : rollOne 1~6 산식 · isRolling 재진입 차단 ·
//                                        reduced-motion 등 dev 정적 회귀 가드
//   - tests/dice-e2e-worker-host.test.js (BF-450) : cap 10 · 히스토리 재표시 ·
//     삭제 확인 모달 · 새로고침 복원 · 테마 토글 · console error 0건 실 브라우저 검증
//     (본 파일이 다루는 렌더/굴리기/키보드 흐름과 겹치지 않도록, 본 파일은 그 항목을
//     다시 검증하지 않는다 — 개수 선택·히스토리 cap·모달·새로고침은 out of scope)
//
// ── 본 파일이 보호하는 대상 (작업 AC) ─────────────────────────────────────
//   AC-render : 진입 시 dice-box 가 default 개수만큼 렌더 + 굴리기 버튼 활성.
//   AC-roll   : #btn-roll 클릭 시 1~5개 각각에서 표시되는 모든 주사위 면이 1~6
//               정수이고, 통계(합/평균/최대)가 그 값들과 항상 정합한다. 여러 번
//               반복 굴려도(≥9회) 매번 유효 범위를 벗어나지 않는다.
//   AC-kbd    : 숫자 키(1/3/5) → 개수 변경, Space 키 → 굴리기가 마우스 클릭과
//               동일하게 유효한 결과를 만든다.
//   (부가) 시나리오 구간 console.error / pageerror / unhandledrejection 0건 —
//          BF-450 AC7 의 전체 시나리오 재검증이 아니라, 본 시나리오 자체의
//          안전성 확인 목적(추가 e2e-runner 호출 없이 동일 호출에 포함).
//
// CI 결정성: BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 skip (fail 아님).
// focused scope: BRIX_TEST_MODULE 이 'dice' 가 아니면 module 전체 skip.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 dice 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "dice";
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
  // 실 브라우저 E2E — 렌더 → 굴리기 클릭(1/3/5개 × 반복) → 키보드(숫자·Space)
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-852 E2E: 렌더 + 굴리기 클릭 1~6 유효 숫자(반복) + 키보드(숫자/Space) 동작",
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
        const url = `http://${selfHost}:${port}/dice/`;
        // scriptText 내부는 e2e-runner 의 puppeteer page 컨텍스트에서 실행됨.
        // 굴림은 Math.random 의존 → 정확한 값이 아니라 "1~6 정수" invariant 와
        // 통계(sum/avg/max) 정합만 검증한다. 문자열 연결은 `+` 사용(템플릿
        // 리터럴 중첩 시 바깥 JS 가 즉시 보간하는 것을 방지하기 위함).
        const scriptText = `
          // 0. 격리 — dice: prefix + bf-theme 제거 후 새로고침
          await page.evaluate(() => {
            const toRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && (k.startsWith('dice:') || k === 'bf-theme')) toRemove.push(k);
            }
            toRemove.forEach((k) => localStorage.removeItem(k));
          });
          await page.reload();
          await page.waitForSelector('#btn-roll');

          // 1. 에러 훅 설치 (본 시나리오 구간 한정)
          await page.evaluate(() => {
            window.__diceE2eErrors = [];
            window.addEventListener('error', (e) => {
              window.__diceE2eErrors.push('error: ' + (e.message || String(e)));
            });
            window.addEventListener('unhandledrejection', (e) => {
              window.__diceE2eErrors.push(
                'unhandledrejection: ' + String(e.reason && e.reason.message ? e.reason.message : e.reason),
              );
            });
            const origErr = console.error.bind(console);
            console.error = function () {
              try {
                window.__diceE2eErrors.push(
                  'console.error: ' + Array.from(arguments).map(String).join(' '),
                );
              } catch (_e) {
                // 무한 재귀 방지
              }
              return origErr.apply(console, arguments);
            };
          });

          // 2. AC-render — 진입 시 default 개수(2)만큼 dice-box 렌더 + 굴리기 버튼 활성
          const initial = await page.evaluate(() => {
            const cells = Array.from(document.querySelectorAll('#dice-box .dice'));
            return {
              cellCount: cells.length,
              allPlaceholderOne: cells.every((c) => c.getAttribute('aria-label') === '주사위 1'),
              checkedCount: document.querySelector('.dice-count__btn[aria-checked="true"]')?.getAttribute('data-count'),
              rollDisabled: document.getElementById('btn-roll').disabled,
            };
          });
          if (initial.cellCount !== 2) {
            throw new Error('AC-render: 초기 dice-box 셀이 2개가 아님 (default diceCount): ' + initial.cellCount);
          }
          if (!initial.allPlaceholderOne) {
            throw new Error('AC-render: 초기 placeholder 가 전부 "주사위 1" 이 아님');
          }
          if (initial.checkedCount !== '2') {
            throw new Error('AC-render: 초기 aria-checked=true 의 data-count 가 "2" 가 아님: ' + initial.checkedCount);
          }
          if (initial.rollDisabled !== false) {
            throw new Error('AC-render: 초기 #btn-roll 이 disabled 상태');
          }
          console.log('[step1] AC-render OK — 초기 2개 렌더 + 굴리기 버튼 활성');

          // 헬퍼: 현재 dice-box 를 읽어 1~6 invariant + 통계 정합을 검사
          const readAndValidate = async (expectedCount, label) => {
            const r = await page.evaluate(() => {
              const cells = Array.from(document.querySelectorAll('#dice-box .dice'));
              const faces = cells.map((c) => {
                const m = (c.getAttribute('aria-label') || '').match(/주사위\\s*(\\d+)/);
                return m ? Number(m[1]) : NaN;
              });
              return {
                cellCount: cells.length,
                faces,
                sum: parseInt(document.getElementById('stat-sum').textContent, 10),
                avg: parseFloat(document.getElementById('stat-avg').textContent),
                max: parseInt(document.getElementById('stat-max').textContent, 10),
                rollDisabled: document.getElementById('btn-roll').disabled,
              };
            });
            if (r.cellCount !== expectedCount) {
              throw new Error(label + ': dice 셀 개수가 ' + expectedCount + ' 가 아님: ' + r.cellCount);
            }
            if (!r.faces.every((n) => Number.isInteger(n) && n >= 1 && n <= 6)) {
              throw new Error(label + ': 1~6 범위를 벗어난 면 발견: ' + JSON.stringify(r.faces));
            }
            const expSum = r.faces.reduce((a, b) => a + b, 0);
            const expMax = Math.max.apply(null, r.faces);
            if (r.sum !== expSum) {
              throw new Error(label + ': stat-sum 정합 위반 실제=' + r.sum + ' 기대=' + expSum);
            }
            if (r.max !== expMax) {
              throw new Error(label + ': stat-max 정합 위반 실제=' + r.max + ' 기대=' + expMax);
            }
            if (Math.abs(r.avg - expSum / expectedCount) > 0.05) {
              throw new Error(label + ': stat-avg 정합 위반 실제=' + r.avg + ' 기대=' + (expSum / expectedCount));
            }
            if (r.rollDisabled !== false) {
              throw new Error(label + ': 굴림 완료 후 #btn-roll 이 재활성화되지 않음');
            }
            return r;
          };

          // 3. AC-kbd(개수) + AC-roll(클릭) — 숫자 키 1/3/5 로 개수 변경 후 마우스 클릭 굴림
          for (const n of ['1', '3', '5']) {
            await page.keyboard.press(n);
            await new Promise((r) => setTimeout(r, 60));
            const checked = await page.evaluate(() =>
              document.querySelector('.dice-count__btn[aria-checked="true"]')?.getAttribute('data-count'),
            );
            if (checked !== n) {
              throw new Error('AC-kbd: 숫자 키 "' + n + '" 로 개수 변경 안 됨 (checked=' + checked + ')');
            }
            await page.click('#btn-roll');
            await new Promise((r) => setTimeout(r, 480));
            await readAndValidate(Number(n), 'AC-roll(count=' + n + ', click)');
          }
          console.log('[step2] AC-kbd(숫자 1/3/5) + AC-roll(클릭) OK — 매 개수 1~6 유효 + 통계 정합');

          // 4. AC-roll 반복 — 개수 5 유지한 채 6회 추가 클릭. 매번 1~6 유효해야 함
          //    (RNG 의존 로직이 우연히 한 번만 맞고 반복 시 깨지는 회귀 방지)
          for (let i = 0; i < 6; i++) {
            await page.click('#btn-roll');
            await new Promise((r) => setTimeout(r, 460));
            await readAndValidate(5, 'AC-roll(반복 ' + (i + 1) + '/6)');
          }
          console.log('[step3] AC-roll 반복 6회 OK — 매번 1~6 유효 범위 + 통계 정합 유지');

          // 5. AC-kbd(Space) — 버튼 포커스를 벗어난 상태에서 Space 키로 굴림
          //    (포커스가 BUTTON 이면 네이티브 click 과 중복 방지 분기를 타므로,
          //    순수 키보드 경로를 검증하려면 focus 를 명시적으로 해제해야 함)
          await page.evaluate(() => {
            if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
          });
          await page.keyboard.press(' ');
          await new Promise((r) => setTimeout(r, 480));
          await readAndValidate(5, 'AC-kbd(Space 굴리기)');
          console.log('[step4] AC-kbd(Space) OK — 버튼 미포커스 상태에서 Space 굴림 정상 동작');

          // 6. 숫자 키 + Space 조합 — 개수 3 으로 변경 후 Space 로 굴림
          await page.keyboard.press('3');
          await new Promise((r) => setTimeout(r, 60));
          await page.evaluate(() => {
            if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
          });
          await page.keyboard.press(' ');
          await new Promise((r) => setTimeout(r, 480));
          await readAndValidate(3, 'AC-kbd(숫자 3 + Space 조합)');
          console.log('[step5] AC-kbd(숫자+Space 조합) OK');

          // 7. 부가 — 본 시나리오 구간 console.error / pageerror / unhandledrejection 0건
          const errs = await page.evaluate(() => window.__diceE2eErrors || []);
          if (errs.length > 0) {
            throw new Error('시나리오 구간 error 발생 (' + errs.length + '건): ' + errs.slice(0, 5).join(' | '));
          }
          console.log('[step6] 시나리오 구간 console/page error 0건 OK');

          // 8. cleanup
          await page.evaluate(() => {
            const toRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && (k.startsWith('dice:') || k === 'bf-theme')) toRemove.push(k);
            }
            toRemove.forEach((k) => localStorage.removeItem(k));
          });
          console.log('[done] BF-852 E2E PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-852",
          },
          body: JSON.stringify({
            url,
            label: "주사위 렌더 + 굴리기 클릭 1~6 유효 숫자(반복) + 키보드 동작 (BF-852)",
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
// 헬퍼들 (기존 dice-e2e-worker-host.test.js / tests/baseball 패턴과 동일 —
// 파일별 자기완결(self-contained) 컨벤션을 따름)
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
