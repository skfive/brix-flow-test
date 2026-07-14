// BF-805 · incident-triage E2E 브라우저 회귀 가드
//
// BF-803 dev 산출물 (incident-triage/ 모듈) 이 main 에 들어간 후
// 실 브라우저 인터랙션이 silent break 되지 않도록, e2e-runner 컨테이너로
// worker host URL 에 접근해 렌더 → 선택 변경 → 결과 갱신 → 요약 복사 →
// 초기화 → 키보드 접근성을 검증한다.
//
// 보호 대상 (BF-805 수용 기준):
//   AC1. /incident-triage/ 렌더 및 대표 impact×urgency 조합
//        (P1/P2/P3/P4 각 1개 이상) 의 severity/SLA/다음 행동 결과가 실 DOM 에 반영된다.
//   AC2. 초기화 버튼 클릭(키보드) → 라디오 선택 해제 + #result data-state=idle +
//        #copy-btn 재비활성화 + #impact-high 로 포커스 이동 (기획 §4.2 · 시안 §7.4).
//   AC3. 요약 복사 버튼 클릭(키보드) → 클립보드 성공/실패 두 분기 중 하나가
//        실제로 UI 에 반영된다 (성공: "✓ 복사됨" + is-copied, 실패: copy-error 문구).
//   AC4. 키보드만으로 라디오 선택(Space)·그룹 내 이동(화살표)·버튼 활성화(Enter)가
//        가능하고, 각 변경마다 change 이벤트로 결과가 재계산된다.
//
// 작성 방침 (BF-788/BF-466 e2e-worker-host 패턴 준수):
//   - CI 결정성: BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 t.skip().
//     assert.ok(reachable, ...) 같은 hookFail 패턴 금지.
//   - focused scope 정책: BRIX_TEST_MODULE 이 'incident-triage' 가 아니면 module skip.
//   - BRIX_PERSONA_HOST env 우선. compose 서비스 hostname 만 허용
//     (host.docker.internal / localhost 금지 — e2e-runner 는 다른 컨테이너).
//   - dev 의 tests/incident-triage-BF803.test.js 가 resolveSeverity/buildSummary
//     9/9 조합 전수 + HTML/CSS 정적 가드를 이미 커버 → 본 파일은 재작성하지 않는다.
//     본 파일은 **실 브라우저에서만 검증 가능한 인터랙션** (키보드 선택·복사·초기화·
//     실제 change 이벤트 기반 재렌더) 만 담당한다.
//   - 조합의 severity/SLA/다음 행동 문자열은 dev 산출물(triage.js)의 고정값을 그대로
//     사용 — 로직 재해석 없이 "실 DOM 에 반영되는지" 만 확인한다.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "incident-triage";
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
  // E2E — 렌더 → 키보드 선택 → 결과 갱신 → 요약 복사 → 초기화 → 마우스 재확인
  //   (AC1~AC4 통합, e2e-runner 호출 1회로 비용 최소화)
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-805 E2E AC1~AC4: 렌더→키보드 선택→결과 갱신→요약 복사→초기화→마우스 재확인",
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
        const url = `http://${selfHost}:${port}/incident-triage/`;

        const scriptText = `
          // ── STEP 1: 초기 idle 렌더 ──
          await page.waitForSelector('#triage-form');
          const s1 = await page.evaluate(() => ({
            state: document.getElementById('result').getAttribute('data-state'),
            copyDisabled: document.getElementById('copy-btn').disabled,
          }));
          if (s1.state !== 'idle') throw new Error('초기 #result data-state !== idle: ' + s1.state);
          if (!s1.copyDisabled) throw new Error('초기 #copy-btn 이 disabled 아님');
          console.log('[step1] 초기 idle 렌더 OK');

          // ── STEP 2: 키보드로 impact=high 선택 (Tab 대신 focus 로 도달 후 Space) → partial ──
          await page.focus('#impact-high');
          await page.keyboard.press(' ');
          await new Promise((r) => setTimeout(r, 150));
          const s2 = await page.evaluate(() => ({
            checked: document.getElementById('impact-high').checked,
            state: document.getElementById('result').getAttribute('data-state'),
            copyDisabled: document.getElementById('copy-btn').disabled,
          }));
          if (!s2.checked) throw new Error('Space 키로 impact-high 가 checked 되지 않음');
          if (s2.state !== 'partial') throw new Error('impact 만 선택 시 data-state !== partial: ' + s2.state);
          if (!s2.copyDisabled) throw new Error('partial 상태에서 #copy-btn 이 활성화됨');
          console.log('[step2] 키보드 Space → impact=high 선택, data-state=partial OK');

          // ── STEP 3: 키보드로 urgency=high 선택 → resolved P1 ──
          await page.focus('#urgency-high');
          await page.keyboard.press(' ');
          await new Promise((r) => setTimeout(r, 150));
          const s3 = await page.evaluate(() => ({
            state: document.getElementById('result').getAttribute('data-state'),
            severity: document.getElementById('result').getAttribute('data-severity'),
            badgeCode: document.getElementById('badge-code').textContent,
            sla: document.getElementById('sla-value').textContent,
            nextAction: document.getElementById('next-action').textContent,
            copyDisabled: document.getElementById('copy-btn').disabled,
          }));
          if (s3.state !== 'resolved') throw new Error('high+high 선택 후 data-state !== resolved: ' + s3.state);
          if (s3.severity !== 'P1') throw new Error('high+high → data-severity !== P1: ' + s3.severity);
          if (s3.badgeCode !== 'P1') throw new Error('high+high → #badge-code !== P1: ' + s3.badgeCode);
          if (s3.sla !== '15분 이내') throw new Error('P1 SLA 불일치: ' + s3.sla);
          if (!s3.nextAction.includes('온콜 담당자')) throw new Error('P1 다음 행동 불일치: ' + s3.nextAction);
          if (s3.copyDisabled) throw new Error('resolved 상태에서 #copy-btn 이 여전히 disabled');
          console.log('[step3] 키보드 Space → urgency=high 선택, P1 결과 렌더 OK');

          // ── STEP 4: 화살표 키로 urgency 그룹 내 이동 (high → medium) → 결과 갱신 (high+medium=P2) ──
          await page.keyboard.press('ArrowDown');
          await new Promise((r) => setTimeout(r, 150));
          const s4 = await page.evaluate(() => ({
            urgencyMediumChecked: document.getElementById('urgency-medium').checked,
            urgencyHighChecked: document.getElementById('urgency-high').checked,
            severity: document.getElementById('result').getAttribute('data-severity'),
            sla: document.getElementById('sla-value').textContent,
          }));
          if (!s4.urgencyMediumChecked || s4.urgencyHighChecked)
            throw new Error('ArrowDown 후 urgency=medium 으로 전환되지 않음 (medium checked=' + s4.urgencyMediumChecked + ', high checked=' + s4.urgencyHighChecked + ')');
          if (s4.severity !== 'P2') throw new Error('high+medium → data-severity !== P2 (선택 변경 시 결과 갱신 실패): ' + s4.severity);
          if (s4.sla !== '1시간 이내') throw new Error('P2 SLA 불일치: ' + s4.sla);
          console.log('[step4] 화살표 키 그룹 내 이동 → urgency=medium, P2 로 결과 갱신 OK');

          // ── STEP 5: 키보드로 impact=low 선택 → low+medium=P4 로 결과 갱신 ──
          await page.focus('#impact-low');
          await page.keyboard.press(' ');
          await new Promise((r) => setTimeout(r, 150));
          const s5 = await page.evaluate(() => ({
            severity: document.getElementById('result').getAttribute('data-severity'),
            sla: document.getElementById('sla-value').textContent,
            nextAction: document.getElementById('next-action').textContent,
          }));
          if (s5.severity !== 'P4') throw new Error('low+medium → data-severity !== P4: ' + s5.severity);
          if (s5.sla !== '1영업일(24시간) 이내') throw new Error('P4 SLA 불일치: ' + s5.sla);
          if (!s5.nextAction.includes('정기 백로그')) throw new Error('P4 다음 행동 불일치: ' + s5.nextAction);
          console.log('[step5] 키보드 Space → impact=low 선택, P4 로 결과 갱신 OK');

          // ── STEP 6: 요약 복사 — 포커스 이동 후 Enter 키로 버튼 활성화 (키보드 접근성) ──
          await page.focus('#copy-btn');
          await page.keyboard.press('Enter');
          await new Promise((r) => setTimeout(r, 300));
          const s6 = await page.evaluate(() => ({
            btnText: document.getElementById('copy-btn').textContent,
            isCopied: document.getElementById('copy-btn').classList.contains('is-copied'),
            copyError: document.getElementById('copy-error').textContent,
          }));
          const copiedOk = s6.btnText.includes('복사됨') && s6.isCopied;
          const failedOk = s6.copyError && s6.copyError.length > 0;
          if (!copiedOk && !failedOk)
            throw new Error('Enter 키로 복사 버튼 활성화 후 성공/실패 어느 분기도 반영되지 않음: btnText=' + s6.btnText + ', isCopied=' + s6.isCopied + ', copyError=' + s6.copyError);
          console.log('[step6] Enter 키로 #copy-btn 활성화 → ' + (copiedOk ? '복사 성공 분기(✓ 복사됨 + is-copied)' : '복사 실패 분기(copy-error 문구)') + ' OK');

          if (copiedOk) {
            // 성공 분기일 때만 2000ms 타이머 만료 후 라벨 원복 확인
            await new Promise((r) => setTimeout(r, 2200));
            const s6b = await page.evaluate(() => ({
              btnText: document.getElementById('copy-btn').textContent,
              isCopied: document.getElementById('copy-btn').classList.contains('is-copied'),
            }));
            if (s6b.btnText !== '요약 복사' || s6b.isCopied)
              throw new Error('2200ms 후 복사 버튼 라벨/클래스 원복 실패: btnText=' + s6b.btnText + ', isCopied=' + s6b.isCopied);
            console.log('[step6b] 2200ms 후 복사 버튼 라벨 원복 OK');
          }

          // ── STEP 7: 초기화 — 포커스 이동 후 Enter 키로 활성화 (키보드 접근성) ──
          await page.focus('#reset-btn');
          await page.keyboard.press('Enter');
          await new Promise((r) => setTimeout(r, 150));
          const s7 = await page.evaluate(() => ({
            impactLowChecked: document.getElementById('impact-low').checked,
            urgencyMediumChecked: document.getElementById('urgency-medium').checked,
            state: document.getElementById('result').getAttribute('data-state'),
            severity: document.getElementById('result').getAttribute('data-severity'),
            copyDisabled: document.getElementById('copy-btn').disabled,
            activeId: document.activeElement ? document.activeElement.id : null,
          }));
          if (s7.impactLowChecked) throw new Error('초기화 후 impact-low 가 여전히 checked');
          if (s7.urgencyMediumChecked) throw new Error('초기화 후 urgency-medium 이 여전히 checked');
          if (s7.state !== 'idle') throw new Error('초기화 후 data-state !== idle: ' + s7.state);
          if (s7.severity) throw new Error('초기화 후 data-severity 잔존: ' + s7.severity);
          if (!s7.copyDisabled) throw new Error('초기화 후 #copy-btn 이 여전히 활성화');
          if (s7.activeId !== 'impact-high') throw new Error('초기화 후 포커스가 #impact-high 로 이동하지 않음 (실제: ' + s7.activeId + ')');
          console.log('[step7] Enter 키로 #reset-btn 활성화 → 라디오 해제 + idle + copy-btn 재비활성화 + impact-high 포커스 OK');
          // 참고: badge-code/sla-value/next-action 텍스트는 reset 시 지우지 않는다 —
          // dev 산출물이 "data-state/data-severity 속성만 갱신, 결과 영역은 CSS 로 숨김"
          // 방식(커밋 메시지 · style.css :112-113 [data-state=idle/partial] .it-result-body{display:none})을
          // 채택했으므로 이는 의도된 동작이며 회귀 가드 대상이 아니다.

          // ── STEP 8: 마우스 클릭 재확인 (high+low=P3) — 키보드 경로와 별도로 클릭 경로도 정상 동작 ──
          await page.click('#impact-high');
          await page.click('#urgency-low');
          await new Promise((r) => setTimeout(r, 150));
          const s8 = await page.evaluate(() => ({
            severity: document.getElementById('result').getAttribute('data-severity'),
            sla: document.getElementById('sla-value').textContent,
          }));
          if (s8.severity !== 'P3') throw new Error('마우스 클릭 high+low → data-severity !== P3: ' + s8.severity);
          if (s8.sla !== '4시간 이내') throw new Error('P3 SLA 불일치: ' + s8.sla);
          console.log('[step8] 마우스 클릭 high+low → P3 결과 렌더 OK');

          console.log('[done] BF-805 E2E AC1~AC4 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-805",
          },
          body: JSON.stringify({
            url,
            label:
              "인시던트 트리아지 렌더→키보드 선택→결과 갱신→요약 복사→초기화→마우스 재확인 (BF-805 AC1~AC4)",
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
          `E2E AC1~AC4 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-3000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 헬퍼 (BF-788/BF-466 e2e-worker-host 패턴과 동일)
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
