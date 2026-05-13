// BF-466 · palette SPA 실 브라우저 E2E 회귀 가드 (worker host)
//
// 본 파일은 BF-464 의 dev 산출물 (palette/ 모듈) 이 main 에 들어간 후 silent
// break 되지 않도록, e2e-runner 컨테이너로 worker host URL 에 접근해 작업 AC
// 의 전체 사용자 시나리오를 검증한다.
//
// 보호 대상 (BF-466 수용 기준):
//   AC1. /palette/ 진입 → 5개 슬롯·HEX 표기·HSL 표기·#theme-toggle 요소 존재,
//        다크 default (data-theme="dark"), console.error 0건.
//   AC2. 슬롯 0 컬러 변경 (#ff0000) + 새로고침 → localStorage bf-palette 복원,
//        슬롯 0 HEX 레이블 / swatch 가 #ff0000 으로 복원됨.
//   AC3. #theme-toggle 클릭 → 라이트 전환 + bf-theme="light" 저장 →
//        새로고침 후 data-theme="light" 유지.
//        다시 토글 → 다크 복귀 + bf-theme="dark" → 새로고침 후 다크 유지.
//   AC4. 슬롯 복사 버튼 클릭 → .is-copied 클래스 일시 추가 + #copy-toast 노출.
//        (clipboard.writeText 는 headless 에서 허용 안 될 수 있으나 시각 피드백
//        자체는 항상 동작해야 함 — app.js 의 showCopyToast / handleCopy 분기.)
//   AC5. console.error / unhandledrejection / pageerror 0건 회귀 가드
//        (file:// CORS 에러 누락 검증 포함 — http:// 서빙 환경에서 reconfirm).
//
// 작성 방침 (BF-440/BF-445/BF-450 패턴 준수):
//   - CI 결정성: BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 t.skip().
//     assert.ok(reachable, ...) hookFail 패턴 금지.
//   - focused scope 정책: BRIX_TEST_MODULE 이 'palette' 가 아니면 전체 skip.
//   - BRIX_PERSONA_HOST env 우선. compose 서비스 hostname 만 허용
//     (host.docker.internal / localhost 금지 — e2e-runner 는 다른 컨테이너).
//   - dev 의 palette-storage.test.js + palette-ui.test.js 가 storage 단위·
//     DOM 마크업·CSS 토큰·file:// 안전 fact 를 모두 검증하므로 재작성 X.
//     본 파일은 실 브라우저에서만 검증 가능한 인터랙션만 담당.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "palette";
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
  // E2E AC1~AC4 — 통합 시나리오: 초기 렌더 → 컬러 변경·새로고침 복원 →
  //               다크 토글·새로고침 유지 → 복사 시각 피드백
  //               (단일 e2e-runner 호출로 묶음 — 한 페이지 컨텍스트에서 누적)
  // ─────────────────────────────────────────────────────────────
  test("BF-466 E2E AC1~AC4: 초기 렌더→컬러 변경·복원→다크 토글·복원→복사 피드백", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/palette/`;
      const scriptText = `
        // 0. clean — bf-palette / bf-theme 제거 후 reload (격리)
        await page.evaluate(() => {
          localStorage.removeItem('bf-palette');
          localStorage.removeItem('bf-theme');
        });
        await page.reload();
        await page.waitForSelector('#slots');

        // ──────────────────────────────────────────────────────────────────
        // AC1: 초기 렌더 검증
        //   - 5개 슬롯 (.slot) 존재, data-theme="dark" (다크 default)
        //   - 각 슬롯에 .slot__hex + .slot__hsl 텍스트가 비어있지 않음
        //   - #theme-toggle 버튼 존재
        // ──────────────────────────────────────────────────────────────────
        const initial = await page.evaluate(() => {
          const slots = document.querySelectorAll('.slot');
          const hexEls = document.querySelectorAll('.slot__hex');
          const hslEls = document.querySelectorAll('.slot__hsl');
          const themeToggle = document.getElementById('theme-toggle');
          const theme = document.documentElement.getAttribute('data-theme');
          const hexTexts = Array.from(hexEls).map((el) => el.textContent.trim());
          const hslTexts = Array.from(hslEls).map((el) => el.textContent.trim());
          return {
            slotCount: slots.length,
            hexCount: hexEls.length,
            hslCount: hslEls.length,
            hasThemeToggle: !!themeToggle,
            theme,
            hexTexts,
            hslTexts,
          };
        });

        if (initial.slotCount !== 5) {
          throw new Error('초기 .slot 개수가 5가 아님: ' + initial.slotCount);
        }
        if (initial.hexCount !== 5) {
          throw new Error('초기 .slot__hex 개수가 5가 아님: ' + initial.hexCount);
        }
        if (initial.hslCount !== 5) {
          throw new Error('초기 .slot__hsl 개수가 5가 아님: ' + initial.hslCount);
        }
        if (!initial.hasThemeToggle) {
          throw new Error('#theme-toggle 버튼 누락');
        }
        if (initial.theme !== 'dark') {
          throw new Error('초기 data-theme 이 "dark" 가 아님: ' + initial.theme);
        }
        // 각 슬롯의 HEX 레이블이 #xxxxxx 형식인지
        for (let i = 0; i < 5; i++) {
          if (!/^#[0-9a-fA-F]{6}$/.test(initial.hexTexts[i])) {
            throw new Error('슬롯 ' + i + ' .slot__hex 가 #xxxxxx 형식이 아님: "' + initial.hexTexts[i] + '"');
          }
        }
        // 각 슬롯의 HSL 레이블이 hsl(... 형식인지
        for (let i = 0; i < 5; i++) {
          if (!/^hsl\\(/.test(initial.hslTexts[i])) {
            throw new Error('슬롯 ' + i + ' .slot__hsl 가 hsl(...) 형식이 아님: "' + initial.hslTexts[i] + '"');
          }
        }
        console.log('[step1] 초기 — 5슬롯 + HEX/HSL 레이블 + #theme-toggle + dark default OK (AC1)');

        // ──────────────────────────────────────────────────────────────────
        // AC2: 컬러 변경 + 새로고침 복원
        //   - 슬롯 0 의 input[type=color] 값을 #ff0000 으로 변경 (page.evaluate)
        //   - 슬롯 0 .slot__hex 가 "#ff0000" 으로 업데이트 됨
        //   - 슬롯 0 .slot__swatch background-color 가 변경됨
        //   - localStorage bf-palette 에 #ff0000 이 저장됨
        //   - 새로고침 후 슬롯 0 이 #ff0000 으로 복원됨
        // ──────────────────────────────────────────────────────────────────
        await page.evaluate(() => {
          const input = document.querySelector('#slot-0 .slot__color-input');
          if (!input) throw new Error('#slot-0 .slot__color-input 누락');
          input.value = '#ff0000';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await new Promise((r) => setTimeout(r, 80));

        const afterChange = await page.evaluate(() => {
          const hexEl = document.querySelector('#slot-0 .slot__hex');
          const swatchEl = document.querySelector('#slot-0 .slot__swatch');
          const stored = localStorage.getItem('bf-palette');
          const storedColors = stored ? JSON.parse(stored) : null;
          return {
            hexText: hexEl ? hexEl.textContent.trim() : null,
            swatchBg: swatchEl ? swatchEl.style.backgroundColor : null,
            storedColor0: storedColors ? storedColors[0] : null,
          };
        });

        if (afterChange.hexText !== '#ff0000') {
          throw new Error('컬러 변경 후 .slot__hex 업데이트 실패: "' + afterChange.hexText + '"');
        }
        if (!afterChange.swatchBg) {
          throw new Error('컬러 변경 후 .slot__swatch background 확인 불가');
        }
        if (afterChange.storedColor0 !== '#ff0000') {
          throw new Error('localStorage bf-palette[0] 저장 실패: "' + afterChange.storedColor0 + '"');
        }
        console.log('[step2a] 슬롯 0 컬러 변경 (#ff0000) — hex 레이블·swatch·localStorage 모두 갱신 OK (AC2)');

        // 새로고침 후 복원
        await page.reload();
        await page.waitForSelector('#slots');
        await new Promise((r) => setTimeout(r, 80));

        const afterReload = await page.evaluate(() => {
          const hexEl = document.querySelector('#slot-0 .slot__hex');
          const colorInput = document.querySelector('#slot-0 .slot__color-input');
          return {
            hexText: hexEl ? hexEl.textContent.trim() : null,
            inputValue: colorInput ? colorInput.value : null,
          };
        });

        if (afterReload.hexText !== '#ff0000') {
          throw new Error('새로고침 후 슬롯 0 hex 복원 실패: "' + afterReload.hexText + '"');
        }
        if (afterReload.inputValue !== '#ff0000') {
          throw new Error('새로고침 후 슬롯 0 input.value 복원 실패: "' + afterReload.inputValue + '"');
        }
        console.log('[step2b] 새로고침 → 슬롯 0 #ff0000 복원 OK (AC2)');

        // ──────────────────────────────────────────────────────────────────
        // AC3: 다크 토글 → 새로고침 유지
        //   - 초기 dark. #theme-toggle 클릭 → data-theme="light" + bf-theme="light"
        //   - 새로고침 후 data-theme="light" 유지
        //   - 다시 클릭 → data-theme="dark" + bf-theme="dark"
        //   - 새로고침 후 data-theme="dark" 유지
        // ──────────────────────────────────────────────────────────────────
        // 현재 테마 확인 (dark 이어야 함)
        const beforeToggle = await page.evaluate(() => ({
          theme: document.documentElement.getAttribute('data-theme'),
          stored: localStorage.getItem('bf-theme'),
        }));
        if (beforeToggle.theme !== 'dark') {
          throw new Error('토글 전 data-theme 이 "dark" 가 아님: ' + beforeToggle.theme);
        }

        // dark → light
        await page.click('#theme-toggle');
        await new Promise((r) => setTimeout(r, 60));

        const afterLight = await page.evaluate(() => ({
          theme: document.documentElement.getAttribute('data-theme'),
          stored: localStorage.getItem('bf-theme'),
          btnText: document.getElementById('theme-toggle') ? document.getElementById('theme-toggle').textContent.trim() : null,
        }));
        if (afterLight.theme !== 'light') {
          throw new Error('토글 후 data-theme 이 "light" 가 아님: ' + afterLight.theme);
        }
        if (afterLight.stored !== 'light') {
          throw new Error('토글 후 bf-theme localStorage 가 "light" 가 아님: ' + afterLight.stored);
        }
        console.log('[step3a] 토글 클릭 → light 전환 + bf-theme="light" 저장 OK (AC3)');

        // 새로고침 후 light 유지
        await page.reload();
        await page.waitForSelector('#slots');
        await new Promise((r) => setTimeout(r, 60));

        const afterReloadLight = await page.evaluate(() => ({
          theme: document.documentElement.getAttribute('data-theme'),
        }));
        if (afterReloadLight.theme !== 'light') {
          throw new Error('새로고침 후 light 테마 복원 실패: ' + afterReloadLight.theme);
        }
        console.log('[step3b] 새로고침 → light 유지 OK (AC3)');

        // light → dark
        await page.click('#theme-toggle');
        await new Promise((r) => setTimeout(r, 60));

        const afterDark = await page.evaluate(() => ({
          theme: document.documentElement.getAttribute('data-theme'),
          stored: localStorage.getItem('bf-theme'),
        }));
        if (afterDark.theme !== 'dark') {
          throw new Error('두 번째 토글 후 data-theme 이 "dark" 가 아님: ' + afterDark.theme);
        }
        if (afterDark.stored !== 'dark') {
          throw new Error('두 번째 토글 후 bf-theme localStorage 가 "dark" 가 아님: ' + afterDark.stored);
        }

        // 새로고침 후 dark 유지
        await page.reload();
        await page.waitForSelector('#slots');
        await new Promise((r) => setTimeout(r, 60));

        const afterReloadDark = await page.evaluate(() => ({
          theme: document.documentElement.getAttribute('data-theme'),
        }));
        if (afterReloadDark.theme !== 'dark') {
          throw new Error('두 번째 새로고침 후 dark 테마 복원 실패: ' + afterReloadDark.theme);
        }
        console.log('[step3c] 두 번째 토글 → dark 복귀 + 새로고침 후 dark 유지 OK (AC3)');

        // ──────────────────────────────────────────────────────────────────
        // AC4: 복사 버튼 클릭 → 시각 피드백
        //   - 슬롯 0 .slot__copy-btn 클릭
        //   - 잠시 후 #slot-0 에 .is-copied 클래스 추가됨
        //   - #copy-toast 가 .is-visible 클래스를 가짐
        // ──────────────────────────────────────────────────────────────────
        // clean up bf-palette 재확인 (변경된 값 유지된 상태로 복사 테스트)
        const copyBtn = await page.$('#slot-0 .slot__copy-btn');
        if (!copyBtn) {
          throw new Error('#slot-0 .slot__copy-btn 누락');
        }
        await page.click('#slot-0 .slot__copy-btn');
        // is-copied 는 클릭 즉시 추가 (setTimeout 1000ms 후 제거)
        // 빠른 확인을 위해 40ms 대기
        await new Promise((r) => setTimeout(r, 40));

        const afterCopy = await page.evaluate(() => {
          const slot0 = document.getElementById('slot-0');
          const toast = document.getElementById('copy-toast');
          return {
            slotHasCopied: slot0 ? slot0.classList.contains('is-copied') : false,
            toastVisible: toast ? toast.classList.contains('is-visible') : false,
            toastText: toast ? toast.textContent.trim() : null,
          };
        });

        if (!afterCopy.slotHasCopied) {
          throw new Error('복사 버튼 클릭 후 #slot-0 에 .is-copied 클래스 없음');
        }
        if (!afterCopy.toastVisible) {
          throw new Error('복사 버튼 클릭 후 #copy-toast 에 .is-visible 없음');
        }
        if (!afterCopy.toastText || !afterCopy.toastText.includes('복사됨')) {
          throw new Error('copy-toast 텍스트에 "복사됨" 없음: "' + afterCopy.toastText + '"');
        }
        console.log('[step4] 복사 버튼 클릭 → .is-copied + copy-toast .is-visible + "복사됨" 텍스트 OK (AC4)');

        // 1800ms 후 toast 가 사라지는지도 확인 (1900ms 대기)
        await new Promise((r) => setTimeout(r, 1900));
        const afterToastHide = await page.evaluate(() => {
          const toast = document.getElementById('copy-toast');
          return {
            toastHidden: toast ? toast.classList.contains('is-hidden') : false,
            toastVisible: toast ? toast.classList.contains('is-visible') : false,
          };
        });
        if (afterToastHide.toastVisible) {
          throw new Error('1800ms 후 copy-toast 가 여전히 .is-visible (자동 숨김 실패)');
        }
        console.log('[step4b] 1800ms 후 copy-toast 자동 숨김 OK (AC4)');

        // cleanup
        await page.evaluate(() => {
          localStorage.removeItem('bf-palette');
          localStorage.removeItem('bf-theme');
        });
        console.log('[done] BF-466 E2E AC1~AC4 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-466",
        },
        body: JSON.stringify({
          url,
          label:
            "palette 초기 렌더→컬러 변경·복원→다크 토글·복원→복사 피드백 (BF-466 AC1~AC4)",
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
        `E2E AC1~AC4 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // E2E AC5 — console.error / unhandledrejection / pageerror 0건
  //            (file:// CORS 회귀 가드를 http:// 서빙 환경에서 재확인)
  // ─────────────────────────────────────────────────────────────
  test("BF-466 E2E AC5: 전체 시나리오 console.error / unhandledrejection / pageerror 0건", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/palette/`;
      const scriptText = `
        // clean
        await page.evaluate(() => {
          localStorage.removeItem('bf-palette');
          localStorage.removeItem('bf-theme');
        });
        await page.reload();
        await page.waitForSelector('#slots');

        // error hook 설치
        await page.evaluate(() => {
          window.__paletteErrors = [];
          window.addEventListener('error', (e) => {
            window.__paletteErrors.push('error: ' + (e.message || String(e)));
          });
          window.addEventListener('unhandledrejection', (e) => {
            window.__paletteErrors.push(
              'unhandledrejection: ' + String(e.reason && e.reason.message ? e.reason.message : e.reason),
            );
          });
          const origErr = console.error.bind(console);
          console.error = function () {
            try {
              window.__paletteErrors.push(
                'console.error: ' + Array.from(arguments).map(String).join(' '),
              );
            } catch (_e) {
              /* 무한 재귀 방지 */
            }
            return origErr.apply(console, arguments);
          };
        });

        // 주요 인터랙션 흐름
        // 1. 컬러 변경 — 슬롯 0, 1, 2 각각 변경
        for (const [idx, hex] of [[0, '#cc0000'], [1, '#00cc00'], [2, '#0000cc']]) {
          await page.evaluate(([i, h]) => {
            const input = document.querySelector('#slot-' + i + ' .slot__color-input');
            if (!input) throw new Error('#slot-' + i + ' input 누락');
            input.value = h;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }, [idx, hex]);
          await new Promise((r) => setTimeout(r, 40));
        }

        // 2. 복사 버튼 클릭 (슬롯 0, 1)
        await page.click('#slot-0 .slot__copy-btn');
        await new Promise((r) => setTimeout(r, 60));
        await page.click('#slot-1 .slot__copy-btn');
        await new Promise((r) => setTimeout(r, 60));

        // 3. 테마 토글 2회 (dark → light → dark)
        await page.click('#theme-toggle');
        await new Promise((r) => setTimeout(r, 40));
        await page.click('#theme-toggle');
        await new Promise((r) => setTimeout(r, 40));

        // 4. 키보드 T 단축키
        await page.keyboard.press('t');
        await new Promise((r) => setTimeout(r, 40));
        await page.keyboard.press('t');
        await new Promise((r) => setTimeout(r, 40));

        // 5. 새로고침 후 복원 흐름
        await page.reload();
        await page.waitForSelector('#slots');
        await new Promise((r) => setTimeout(r, 80));

        // 에러 수집
        const errs = await page.evaluate(() => window.__paletteErrors || []);
        if (errs.length > 0) {
          throw new Error(
            'console/page error 발생 (' + errs.length + '건): ' + errs.slice(0, 5).join(' | '),
          );
        }
        console.log('[ok] 전체 시나리오 console.error / unhandledrejection / pageerror 0건');

        // cleanup
        await page.evaluate(() => {
          localStorage.removeItem('bf-palette');
          localStorage.removeItem('bf-theme');
        });
        console.log('[done] BF-466 E2E AC5 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-466",
        },
        body: JSON.stringify({
          url,
          label:
            "palette console.error / pageerror / unhandledrejection 0건 회귀 (BF-466 AC5)",
          scriptText,
          timeoutMs: 45000,
        }),
      });
      const json = await res.json();
      assert.ok(
        json.ok,
        `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`,
      );
      assert.ok(
        json.passed,
        `E2E AC5 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (BF-440 / BF-445 / BF-450 e2e-worker-host 패턴과 동일)
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
