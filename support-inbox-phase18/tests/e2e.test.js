/* support-inbox-phase18/tests/e2e.test.js — 회귀 가드: 진입 렌더·검색·필터·상태 전환(가드 포함)
 * BF-1023 · 머지된 BF-1021 구현(inbox.js/fixtures.js/index.html/style.css) 기준 tester 산출물
 * 범위: UI 마크업 contract(HTML id/class·CORS 안전) + 실 브라우저 인터랙션(e2e-runner).
 *       도메인 순수 함수(정렬·검색·필터·전이 가드·fixture 무결성)는
 *       tests/pipeline.test.js·tests/domain.test.js 가 이미 커버 — 재작성 금지.
 * vanilla-static — node --test 로 실행. e2e-runner 미도달(CI) 시 해당 시나리오만 skip(결정적 gating).
 */
"use strict";

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = "support-inbox-phase18";
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

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const BASE_URL = `http://${process.env.BRIX_PERSONA_HOST || "worker"}:8080`;

/* ════════════════════════════════════════════════════════════════
 * 정적 가드 — UI 마크업 contract / CORS 안전 (tester 고유 영역)
 * ════════════════════════════════════════════════════════════════ */

test("HTML — 2-region 레이아웃 및 핵심 id 존재 (진입 렌더 contract)", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
  [
    'id="sib-summary"', 'id="sib-search"', 'id="sib-search-clear"', 'id="sib-filters"',
    'id="sib-result-count"', 'id="sib-reset"', 'id="sib-list"', 'id="sib-detail"', 'id="sib-live"'
  ].forEach((needle) => assert.ok(html.includes(needle), `누락: ${needle}`));
  assert.ok(html.includes('role="listbox"'), "listbox role 누락");
  assert.ok(html.includes('role="status"'), "live region status role 누락");
  assert.ok(html.includes('role="search"'), "검색바 search role 누락");
});

test("HTML — type=module 미사용 + 로드 순서 fixtures→inbox (file:// CORS 안전)", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
  assert.ok(!/type=["']module["']/.test(html), 'type="module" 스크립트 발견 — file:// CORS 위반');
  const order = ["fixtures.js", "inbox.js"].map((f) => html.indexOf(`src="./${f}"`));
  assert.ok(order.every((i) => i !== -1), "필수 스크립트 태그 누락");
  assert.ok(order[0] < order[1], "스크립트 로드 순서가 의존 순서(fixtures→inbox)와 다름");
});

test("JS — fetch()/import·export 미사용 (CORS 안전 가드)", () => {
  ["fixtures.js", "inbox.js"].forEach((f) => {
    const src = fs.readFileSync(path.join(ROOT, f), "utf-8");
    assert.ok(!/\bfetch\s*\(/.test(src), `${f} 에 fetch() 사용 발견 — file:// CORS 위반`);
    assert.ok(!/^\s*import\s/m.test(src), `${f} 에 import 사용 발견 — file:// CORS 위반`);
  });
});

test("CSS — 상태 배지·우선순위·필터 칩 색상 토큰/클래스 정의 (silent break 가드)", () => {
  const css = fs.readFileSync(path.join(ROOT, "style.css"), "utf-8");
  [
    "--sib-color-received", "--sib-color-progress", "--sib-color-hold", "--sib-color-resolved",
    ".sib-badge--received", ".sib-badge--in_progress", ".sib-badge--on_hold", ".sib-badge--resolved",
    ".sib-prio--urgent", ".sib-prio--high", ".sib-prio--normal", ".sib-prio--low",
    ".sib-chip--on"
  ].forEach((needle) => assert.ok(css.includes(needle), `누락: ${needle}`));
});

/* ════════════════════════════════════════════════════════════════
 * 실 브라우저 E2E — e2e-runner (SPA 인터랙션: 클릭·입력·키보드)
 * ════════════════════════════════════════════════════════════════ */

let e2eAvailable = true;
let skipReason = null;

test.before(async () => {
  if (process.env.BRIX_E2E_SKIP === "1") {
    e2eAvailable = false;
    skipReason = "BRIX_E2E_SKIP=1 — CI 결정성 가드";
    return;
  }
  try {
    const probe = await fetch("http://e2e-runner:3030/health", { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) {
      e2eAvailable = false;
      skipReason = `e2e-runner unhealthy (${probe.status}) — skip`;
    }
  } catch (err) {
    e2eAvailable = false;
    skipReason = `e2e-runner 도달 불가 (${err.message}) — skip (CI 환경 정상)`;
  }
});

function runE2E(label, scriptText, timeoutMs) {
  return fetch("http://e2e-runner:3030/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
      "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "",
    },
    body: JSON.stringify({ url: `${BASE_URL}/`, label, scriptText, timeoutMs: timeoutMs || 30000 }),
  }).then((r) => r.json());
}

test("E2E — 진입 렌더 + 검색 + 필터 (AC1)", async (t) => {
  if (!e2eAvailable) { t.skip(skipReason); return; }
  const res = await runE2E(
    "[BF-1023] 진입 렌더 + 검색 + 필터",
    `
      await page.waitForSelector('#sib-list');
      const itemCount = await page.locator('#sib-list .sib-list__item').count();
      if (itemCount !== 8) throw new Error('fixture 8건 렌더 안됨: ' + itemCount);
      const summaryText = await page.evaluate(() => document.getElementById('sib-summary').textContent);
      if (!summaryText.includes('8')) throw new Error('summary total(8) 누락: ' + summaryText);
      const detailTitle = await page.locator('#sib-detail-title').innerText();
      if (!detailTitle) throw new Error('진입 시 상세 pane 미렌더(첫 티켓 자동 선택 기대)');

      // 검색: '환불' → INQ-4006 1건
      await page.locator('#sib-search').fill('환불');
      await new Promise((r) => setTimeout(r, 200));
      const searchCount = await page.locator('#sib-list .sib-list__item').count();
      if (searchCount !== 1) throw new Error('검색 결과 1건 기대: ' + searchCount);
      const resultCountText = await page.locator('#sib-result-count').innerText();
      if (!resultCountText.includes('1')) throw new Error('결과 건수 텍스트 갱신 안됨: ' + resultCountText);

      // 검색 초기화(clear 버튼) → 8건 복원
      await page.locator('#sib-search-clear').click();
      await new Promise((r) => setTimeout(r, 200));
      const afterClearCount = await page.locator('#sib-list .sib-list__item').count();
      if (afterClearCount !== 8) throw new Error('검색 초기화 후 8건 복원 안됨: ' + afterClearCount);

      // 필터: 상태 '해결' 칩 클릭 → INQ-4006 1건
      const resolvedChip = page.locator('#sib-filters .sib-chip', { hasText: '해결' });
      await resolvedChip.click();
      await new Promise((r) => setTimeout(r, 200));
      const filterCount = await page.locator('#sib-list .sib-list__item').count();
      if (filterCount !== 1) throw new Error('상태 필터(해결) 결과 1건 기대: ' + filterCount);
      const chipChecked = await resolvedChip.getAttribute('aria-checked');
      if (chipChecked !== 'true') throw new Error('필터 칩 aria-checked=true 갱신 안됨');

      // 필터 초기화 → 8건 복원
      await page.locator('#sib-reset').click();
      await new Promise((r) => setTimeout(r, 200));
      const afterResetCount = await page.locator('#sib-list .sib-list__item').count();
      if (afterResetCount !== 8) throw new Error('필터 초기화 후 8건 복원 안됨: ' + afterResetCount);
    `,
    45000
  );
  assert.ok(res.ok, `e2e-runner 호출 실패: ${JSON.stringify(res)}`);
  assert.ok(res.passed, `시나리오 실패 — ${res.stdout}`);
});

test("E2E — 상태 전환 가드(G1/G4) + 정상 전환 시 이력 기록 (AC1)", async (t) => {
  if (!e2eAvailable) { t.skip(skipReason); return; }
  const res = await runE2E(
    "[BF-1023] 상태 전환 가드 + 정상 전환→이력기록",
    `
      await page.waitForSelector('#sib-list');

      // INQ-4001: 미배정 received → '진행 시작' 비활성(G1)
      await page.locator('#opt-4001').click();
      await new Promise((r) => setTimeout(r, 200));
      const startBtn = page.getByRole('button', { name: /진행 시작/ });
      if (!(await startBtn.isDisabled())) throw new Error('미배정 상태에서 진행 시작이 활성화됨(G1 위반)');

      // INQ-4005: on_hold → '해결' 비활성(G4, 배정 여부 무관)
      await page.locator('#opt-4005').click();
      await new Promise((r) => setTimeout(r, 200));
      const resolveBtnHold = page.getByRole('button', { name: /해결/ });
      if (!(await resolveBtnHold.isDisabled())) throw new Error('보류 상태에서 해결 버튼이 활성화됨(G4 위반)');

      // INQ-4003: in_progress + 배정됨 → '해결' 클릭 → 전환 성공 + 이력 기록 + 안내
      await page.locator('#opt-4003').click();
      await new Promise((r) => setTimeout(r, 200));
      await page.getByRole('button', { name: /해결/ }).click();
      await new Promise((r) => setTimeout(r, 200));

      const badgeText = await page.locator('#sib-detail .sib-badge').first().innerText();
      if (!badgeText.includes('해결')) throw new Error('상태 배지가 해결로 갱신되지 않음: ' + badgeText);

      const lastType = await page.locator('.sib-timeline__item .sib-timeline__type').last().innerText();
      if (lastType.toLowerCase() !== 'status changed') throw new Error('이력에 상태 전이가 기록되지 않음: ' + lastType);

      const liveText = await page.locator('#sib-live').innerText();
      if (!liveText.includes('해결')) throw new Error('상태 전환 안내(live region) 미표시: ' + liveText);
    `,
    45000
  );
  assert.ok(res.ok, `e2e-runner 호출 실패: ${JSON.stringify(res)}`);
  assert.ok(res.passed, `시나리오 실패 — ${res.stdout}`);
});
