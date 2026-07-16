// tests/demo-status/render-a11y.test.js
// BF-858 · /demo/status 렌더·접근성 회귀 가드 (테스터 소유, worker host)
//
// 대상: 머지된 BF-856 구현 (src/app/demo/status/{index.html,main.js,status.js,styles.css}).
//
// 보호 대상 (BF-858 수용 기준):
//   AC1. 머지된 /demo/status 를 E2E 로 실제 구동 — 페이지 렌더(요약 배너 +
//        서비스 카드 목록)와 배지 요소 존재를 검증한다.
//   AC2. 배지 요소의 접근성 검사 — role="img" + aria-label(접근성 이름)이
//        "{서비스명} 상태: {라벨}" 형식으로 실제 DOM 에 고정돼 있음을 검증한다
//        (장식 아이콘은 aria-hidden 으로 접근성 트리에서 제외됨도 함께 고정).
//
// 범위 판단 (중복 금지 원칙 적용 — dev(BF-856) tests/status-badge-BF856.test.js 와 분담):
//   - statusLabel/statusIcon/badgeAriaLabel/summarize 등 순수 파생 로직과
//     fixture 스키마, 색상 리터럴·네트워크 진입점 정적 가드는 dev 가 이미
//     20건으로 검증 완료 → 여기서는 재검증하지 않고, badgeAriaLabel/SERVICES
//     를 "오라클(기대값 계산)" 로만 재사용한다.
//   - main.js 가 DOM 에 실제로 그 값을 바인딩하는지(=silent break 시 dev 단위
//     테스트는 그대로 통과하지만 화면은 깨지는 회귀 시나리오)는 dev 테스트가
//     전혀 다루지 않음 → 이 파일의 핵심 검증 대상.
//   - index.html 마크업 id 계약은 main.js 가 getElementById 로 의존하는 최소
//     집합만 고정한다(디자인 토큰/컨벤션 재검증은 reviewer-design 영역이므로
//     하지 않음).
//
// 작성 방침 (동일 레포 선례 tests/pomodoro-e2e-worker-host.test.js, BF-434 /
// tests/e2e/clock/render-tick-format.test.js, BF-844 패턴 준수):
//   - CI 결정성 — BRIX_E2E_SKIP=1 또는 e2e-runner 도달 불가 시 t.skip().
//     assert.ok(reachable, ...) 같은 hookFail 패턴 금지.
//   - focused scope 정책 — BRIX_TEST_MODULE 이 'status' 가 아니면 module
//     전체 skip.
//   - BRIX_PERSONA_HOST env 우선. host.docker.internal / localhost 금지
//     (e2e-runner 는 다른 컨테이너).
//   - /demo/status 는 type="module" 로 status.js 를 import 하는 실제 ESM
//     구조(clock 과 동일 선례) — file:// UMD/IIFE 안전성 가드는 대상 밖.
//     http-server 기반 실행이 전제이므로 CORS 안전은 "네트워크 호출 0건"
//     (dev 가 이미 가드)으로 충분하다.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

import {
  SERVICES,
  badgeAriaLabel,
  statusLabel,
} from "../../src/app/demo/status/status.js";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "status";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const STATUS_DIR = path.join(REPO_ROOT, "src", "app", "demo", "status");
const STATUS_URL_PATH = "/src/app/demo/status/";

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ─────────────────────────────────────────────────────────────
  // AC0 (정적) — main.js 가 getElementById 로 의존하는 마크업 id 계약
  // ─────────────────────────────────────────────────────────────
  test("BF-858 AC0 (정적): index.html 에 main.js 의존 id(#summary-banner, #status-list) 존재", () => {
    const html = fs.readFileSync(path.join(STATUS_DIR, "index.html"), "utf8");
    assert.match(
      html,
      /id="summary-banner"/,
      "#summary-banner 마크업이 사라졌습니다 — main.js renderSummary 대상",
    );
    assert.match(
      html,
      /id="status-list"/,
      "#status-list 마크업이 사라졌습니다 — main.js renderList 대상",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // AC1 — 실 브라우저 렌더: 요약 배너 + 서비스 카드 목록 + 배지 존재
  // ─────────────────────────────────────────────────────────────
  test("BF-858 AC1: /demo/status 실 렌더 — 요약 배너 + 서비스 카드 + 배지 전부 표시", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();
    const expectedCount = SERVICES.length;

    try {
      const url = `http://${selfHost}:${port}${STATUS_URL_PATH}`;
      const scriptText = `
        await page.waitForSelector('#status-list .status-card');

        // 1. 요약 배너 — aria-label 존재 + variant 클래스 부여됨
        const banner = await page.evaluate(() => {
          const el = document.getElementById('summary-banner');
          return el
            ? {
                ariaLabel: el.getAttribute('aria-label'),
                className: el.className,
                text: el.textContent.trim(),
              }
            : null;
        });
        if (!banner) throw new Error('#summary-banner 요소를 찾을 수 없음');
        if (banner.ariaLabel !== '전체 서비스 상태 요약') {
          throw new Error('summary-banner aria-label mismatch: ' + banner.ariaLabel);
        }
        if (!/summary-banner--(operational|degraded|outage)/.test(banner.className)) {
          throw new Error('summary-banner 에 상태 variant 클래스가 없음: ' + banner.className);
        }
        if (!banner.text) throw new Error('summary-banner 본문이 비어 있음(렌더 실패)');
        console.log('[step1] 요약 배너 렌더 OK');

        // 2. 서비스 카드 목록 — 개수 + 배지 존재
        const cards = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('#status-list .status-card')).map((li) => {
            const badge = li.querySelector('.status-badge');
            return {
              id: li.id,
              name: li.querySelector('.status-card__name')?.textContent ?? null,
              desc: li.querySelector('.status-card__desc')?.textContent ?? null,
              hasBadge: !!badge,
            };
          });
        });
        if (cards.length !== ${expectedCount}) {
          throw new Error('서비스 카드 개수 mismatch: expected=${expectedCount} actual=' + cards.length);
        }
        for (const c of cards) {
          if (!c.hasBadge) throw new Error('카드(' + c.id + ')에 .status-badge 가 없음');
          if (!c.name) throw new Error('카드(' + c.id + ')에 서비스명이 비어 있음');
          if (!c.desc) throw new Error('카드(' + c.id + ')에 설명이 비어 있음');
        }
        console.log('[step2] 서비스 카드 ' + cards.length + '개 + 배지 전부 렌더 OK');

        console.log('[done] BF-858 AC1 PASS');
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
          label: "/demo/status 요약 배너 + 서비스 카드 + 배지 렌더 (BF-858 AC1)",
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
        `E2E AC1 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2000)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // AC2 — 배지 접근성 이름(aria-label) 회귀 가드
  // ─────────────────────────────────────────────────────────────
  test("BF-858 AC2: 배지 접근성 이름(role=img + aria-label) 회귀 가드 — 장식 아이콘은 aria-hidden", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    // 오라클 — dev(BF-856) 의 badgeAriaLabel/statusLabel 을 재사용해 기대값만
    // 계산한다(로직 자체는 dev 테스트가 이미 검증했으므로 재검증하지 않음).
    const expectedBadges = SERVICES.map((s) => ({
      cardId: `status-card-${s.id}`,
      ariaLabel: badgeAriaLabel(s.name, s.status),
      label: statusLabel(s.status),
    }));

    try {
      const url = `http://${selfHost}:${port}${STATUS_URL_PATH}`;
      const scriptText = `
        await page.waitForSelector('#status-list .status-card');

        const badges = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('#status-list .status-card')).map((li) => {
            const badge = li.querySelector('.status-badge');
            const icon = badge?.querySelector('.status-badge__icon');
            const labelEl = badge?.querySelector('.status-badge__label');
            return {
              cardId: li.id,
              role: badge?.getAttribute('role') ?? null,
              ariaLabel: badge?.getAttribute('aria-label') ?? null,
              labelText: labelEl?.textContent ?? null,
              iconAriaHidden: icon?.getAttribute('aria-hidden') ?? null,
            };
          });
        });

        const expected = ${JSON.stringify(expectedBadges)};
        if (badges.length !== expected.length) {
          throw new Error('배지 개수 mismatch: expected=' + expected.length + ' actual=' + badges.length);
        }
        for (const exp of expected) {
          const actual = badges.find((b) => b.cardId === exp.cardId);
          if (!actual) throw new Error('카드 ' + exp.cardId + ' 를 찾을 수 없음');
          if (actual.role !== 'img') {
            throw new Error(exp.cardId + ' 배지 role !== "img": ' + actual.role);
          }
          if (actual.ariaLabel !== exp.ariaLabel) {
            throw new Error(
              exp.cardId + ' 배지 aria-label mismatch: expected="' + exp.ariaLabel + '" actual="' + actual.ariaLabel + '"',
            );
          }
          if (!actual.ariaLabel) {
            throw new Error(exp.cardId + ' 배지 접근성 이름(aria-label)이 비어 있음');
          }
          if (actual.labelText !== exp.label) {
            throw new Error(exp.cardId + ' 배지 라벨 텍스트 mismatch: expected="' + exp.label + '" actual="' + actual.labelText + '"');
          }
          if (actual.iconAriaHidden !== 'true') {
            throw new Error(exp.cardId + ' 장식 아이콘이 aria-hidden="true" 가 아님(접근성 트리 노출 위험): ' + actual.iconAriaHidden);
          }
        }
        console.log('[step] 배지 ' + badges.length + '건 접근성 이름(role=img + aria-label) + 장식 아이콘 aria-hidden 전부 OK');
        console.log('[done] BF-858 AC2 PASS');
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
          label: "/demo/status 배지 접근성 이름(aria-label) 회귀 (BF-858 AC2)",
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
        `E2E AC2 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2000)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (동일 레포 선례 tests/pomodoro-e2e-worker-host.test.js 패턴)
// ─────────────────────────────────────────────────────────────

/**
 * e2e-runner 도달성 확인. 못 닿으면 test.skip() 호출 후 false 반환.
 * (CI 환경에는 컨테이너 없음 — fail 처리하면 PR 자동 머지가 트리거 안 됨.)
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
