// BF-811 · Incident Handoff Timeline (/incident-triage/history/) E2E 브라우저 회귀 가드
//
// BF-809 dev 산출물 (incident-triage/history/ 모듈) 이 main 에 들어간 후
// 실 브라우저 렌더가 silent break 되지 않도록, e2e-runner 컨테이너로
// worker host URL 에 접근해 히스토리 페이지 렌더 → 5단계 타임라인 노드 →
// 각 노드의 Jira 키·PR 링크 실 DOM 반영을 검증한다.
//
// 보호 대상 (BF-811 수용 기준):
//   AC1. history 페이지를 로드하면 5단계 타임라인 노드(planner→designer→developer→
//        reviewer→tester 순서 고정)와 각 노드의 Jira 키·PR 링크가 실 DOM 에 렌더된다.
//   AC2. 기존 incident-triage 테스트가 모두 통과한다 (회귀 없음) — 본 파일은
//        신규 전용 파일로만 추가하고 기존 테스트 파일은 일절 수정하지 않는다.
//
// 작성 방침 (BF-805/BF-788 e2e-worker-host 패턴 준수):
//   - CI 결정성: BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 t.skip().
//     assert.ok(reachable, ...) 같은 hookFail 패턴 금지.
//   - focused scope 정책: BRIX_TEST_MODULE 이 'incident-triage-history' 가 아니면 module skip.
//   - BRIX_PERSONA_HOST env 우선. compose 서비스 hostname 만 허용
//     (host.docker.internal / localhost 금지 — e2e-runner 는 다른 컨테이너).
//   - dev 의 tests/incident-triage-history-BF809.test.js 가 deriveIncidentStatus/
//     formatCompletedAt 순수 함수 + fixture 스키마 + 정적 소스 가드(fetch/XHR/module 금지,
//     backlink, style.css 토큰)를 이미 커버 → 본 파일은 재작성하지 않는다.
//     본 파일은 **실 브라우저에서 렌더된 DOM** (타임라인 노드 개수/순서, 링크의
//     실제 href/rel/target/textContent, null 필드의 앵커 미생성) 만 담당한다.
//   - fixture(INCIDENT_HISTORY) 의 값은 dev 산출물의 고정 데이터를 그대로
//     사용 — 재해석 없이 "실 DOM 에 반영되는지" 만 확인한다.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "incident-triage-history";
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
  // E2E — 렌더 → 5단계 타임라인 노드 → Jira 키·PR 링크 실 DOM 검증
  //   (AC1~AC2 통합, e2e-runner 호출 1회로 비용 최소화)
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-811 E2E AC1: history 렌더→5단계 타임라인 노드→Jira 키·PR 링크 실 DOM 반영",
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
        const url = `http://${selfHost}:${port}/incident-triage/history/`;

        const scriptText = `
          // ── STEP 1: 카드 3개(fixture INCIDENT_HISTORY 3건) 렌더 ──
          await page.waitForSelector('#history-list > li.ith-card');
          const cardCount = await page.evaluate(() =>
            document.querySelectorAll('#history-list > li.ith-card').length
          );
          if (cardCount !== 3) throw new Error('카드 개수 불일치 (fixture 3건 기대): ' + cardCount);
          console.log('[step1] #history-list 에 카드 3개 렌더 OK');

          // ── STEP 2: INC-1001 카드 — 5단계 타임라인 노드가 role 순서대로 렌더 (AC1) ──
          const stageRoles = await page.evaluate(() => {
            const card = document.querySelectorAll('#history-list > li.ith-card')[0];
            return Array.from(card.querySelectorAll('.ith-timeline > li.ith-stage')).map(
              (li) => li.getAttribute('data-role')
            );
          });
          const expectedRoles = ['planner', 'designer', 'developer', 'reviewer', 'tester'];
          if (JSON.stringify(stageRoles) !== JSON.stringify(expectedRoles)) {
            throw new Error('타임라인 노드 role 순서 불일치: ' + JSON.stringify(stageRoles));
          }
          console.log('[step2] INC-1001 카드에 5단계 타임라인 노드가 planner→designer→developer→reviewer→tester 순으로 렌더 OK');

          // ── STEP 3: 5단계 전부의 Jira 키·PR 링크 실 DOM 속성/텍스트 검증 (AC1) ──
          const linkInfo = await page.evaluate(() => {
            const card = document.querySelectorAll('#history-list > li.ith-card')[0];
            const stages = Array.from(card.querySelectorAll('.ith-timeline > li.ith-stage'));
            return stages.map((li) => {
              const jiraLink = li.querySelector('.ith-field--jira a.ith-link--jira');
              const prLink = li.querySelector('.ith-field--pr a.ith-link--pr');
              return {
                role: li.getAttribute('data-role'),
                jiraHref: jiraLink ? jiraLink.href : null,
                jiraText: jiraLink ? jiraLink.textContent : null,
                jiraTarget: jiraLink ? jiraLink.target : null,
                jiraRel: jiraLink ? jiraLink.rel : null,
                prHref: prLink ? prLink.href : null,
                prText: prLink ? prLink.textContent : null,
              };
            });
          });
          const expectedJira = ['BF-901', 'BF-902', 'BF-903', 'BF-903', 'BF-905'];
          const expectedPr = [
            'https://github.com/brix-flow/repo/pull/201',
            'https://github.com/brix-flow/repo/pull/202',
            'https://github.com/brix-flow/repo/pull/203',
            'https://github.com/brix-flow/repo/pull/203',
            'https://github.com/brix-flow/repo/pull/205',
          ];
          linkInfo.forEach((info, i) => {
            if (info.jiraHref !== 'https://jira.example.com/browse/' + expectedJira[i]) {
              throw new Error(info.role + ' Jira href 불일치: ' + info.jiraHref);
            }
            if (info.jiraText !== expectedJira[i]) {
              throw new Error(info.role + ' Jira 키 텍스트 불일치: ' + info.jiraText);
            }
            if (info.jiraTarget !== '_blank') {
              throw new Error(info.role + ' Jira 링크 target !== _blank: ' + info.jiraTarget);
            }
            if (info.jiraRel !== 'noopener noreferrer') {
              throw new Error(info.role + ' Jira 링크 rel 불일치: ' + info.jiraRel);
            }
            if (info.prHref !== expectedPr[i]) {
              throw new Error(info.role + ' PR href 불일치: ' + info.prHref);
            }
            if (info.prText !== 'PR 보기 ↗') {
              throw new Error(info.role + ' PR 링크 텍스트 불일치: ' + info.prText);
            }
          });
          console.log('[step3] INC-1001 5단계 전부 Jira 키·PR 링크가 실 DOM 에 정확한 href/rel/target/텍스트로 렌더 OK');

          // ── STEP 4: INC-1002(진행중) not_started 단계 — 링크 대신 '-' placeholder 렌더 (AC-04 회귀 가드) ──
          const partialInfo = await page.evaluate(() => {
            const card = document.querySelectorAll('#history-list > li.ith-card')[1];
            const reviewerStage = card.querySelector('.ith-timeline > li.ith-stage[data-role="reviewer"]');
            const jiraField = reviewerStage.querySelector('.ith-field--jira');
            const prField = reviewerStage.querySelector('.ith-field--pr');
            return {
              jiraHasAnchor: !!jiraField.querySelector('a'),
              jiraEmptyText: jiraField.querySelector('.ith-empty-value')
                ? jiraField.querySelector('.ith-empty-value').textContent
                : null,
              prHasAnchor: !!prField.querySelector('a'),
              prEmptyText: prField.querySelector('.ith-empty-value')
                ? prField.querySelector('.ith-empty-value').textContent
                : null,
            };
          });
          if (partialInfo.jiraHasAnchor) {
            throw new Error('INC-1002 reviewer 단계(not_started)에 Jira 앵커가 렌더됨 — href 없는 링크 금지 위반');
          }
          if (partialInfo.jiraEmptyText !== '-') {
            throw new Error('INC-1002 reviewer Jira placeholder 텍스트 불일치: ' + partialInfo.jiraEmptyText);
          }
          if (partialInfo.prHasAnchor) {
            throw new Error('INC-1002 reviewer 단계(not_started)에 PR 앵커가 렌더됨 — href 없는 링크 금지 위반');
          }
          if (partialInfo.prEmptyText !== '-') {
            throw new Error('INC-1002 reviewer PR placeholder 텍스트 불일치: ' + partialInfo.prEmptyText);
          }
          console.log('[step4] INC-1002 not_started 단계는 href 없는 앵커 대신 \\'-\\' placeholder 로 렌더 OK');

          console.log('[done] BF-811 E2E AC1 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-811",
          },
          body: JSON.stringify({
            url,
            label:
              "인시던트 인계 타임라인 렌더→5단계 노드→Jira 키·PR 링크 실 DOM 검증 (BF-811 AC1)",
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
          `E2E AC1 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-3000)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 헬퍼 (BF-805/BF-788 e2e-worker-host 패턴과 동일)
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
