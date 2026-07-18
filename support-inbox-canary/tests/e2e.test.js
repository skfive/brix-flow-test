/* support-inbox-canary/tests/e2e.test.js — 회귀 가드: 진입 렌더·상태전이·담당자배정·이력·저장복원·손상복구
 * BF-1011 · 머지된 BF-1007 구현(inbox.js/storage.js/fixtures.js/index.html) 기준 tester 산출물
 * 범위: UI 마크업 contract(HTML id/class·CORS 안전) + 실 브라우저 인터랙션(e2e-runner).
 *       도메인 순수 함수(전이 가드·담당자 규칙·검증)는 tests/domain.test.js·storage.test.js 가 이미 커버 — 재작성 금지.
 * vanilla-static — node --test 로 실행. e2e-runner 미도달(CI) 시 해당 시나리오만 skip(결정적 gating).
 */
"use strict";

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = "support-inbox-canary";
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

test("HTML — 3-pane 구조 및 핵심 id 존재 (진입 렌더 contract, AC1)", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
  ["id=\"sib-summary\"", "id=\"sib-list\"", "id=\"sib-detail\"", "id=\"sib-live\"", "id=\"sib-history\""].forEach(
    (needle) => assert.ok(html.includes(needle), `누락: ${needle}`)
  );
  assert.ok(html.includes("role=\"listbox\""), "listbox role 누락");
  assert.ok(html.includes("role=\"status\""), "live region status role 누락");
});

test("HTML — type=module 미사용 + 로드 순서 fixtures→storage→inbox (file:// CORS 안전)", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
  assert.ok(!/type=["']module["']/.test(html), "type=\"module\" 스크립트 발견 — file:// CORS 위반");
  const order = ["fixtures.js", "storage.js", "inbox.js"].map((f) => html.indexOf(f));
  assert.ok(order.every((i) => i !== -1), "필수 스크립트 태그 누락");
  assert.ok(order[0] < order[1] && order[1] < order[2], "스크립트 로드 순서가 의존 순서(fixtures→storage→inbox)와 다름");
});

test("JS — fetch() 미사용 (CORS 안전 가드)", () => {
  ["fixtures.js", "storage.js", "inbox.js"].forEach((f) => {
    const src = fs.readFileSync(path.join(ROOT, f), "utf-8");
    assert.ok(!/\bfetch\s*\(/.test(src), `${f} 에 fetch() 사용 발견 — file:// CORS 위반`);
  });
});

test("CSS — 상태 배지 색상 토큰·클래스 정의 (silent break 가드)", () => {
  const css = fs.readFileSync(path.join(ROOT, "style.css"), "utf-8");
  [
    "--sib-color-received", "--sib-color-progress", "--sib-color-hold", "--sib-color-resolved",
    ".sib-badge--received", ".sib-badge--in_progress", ".sib-badge--on_hold", ".sib-badge--resolved"
  ].forEach((needle) => assert.ok(css.includes(needle), `누락: ${needle}`));
});

/* ════════════════════════════════════════════════════════════════
 * 실 브라우저 E2E — e2e-runner (SPA 인터랙션: 클릭·select·localStorage·새로고침)
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

test("E2E — 진입 렌더 + seed 6건 로드 (AC1)", async (t) => {
  if (!e2eAvailable) { t.skip(skipReason); return; }
  const res = await runE2E(
    "[BF-1011] 진입 렌더 + seed 6건 로드",
    `
      await page.waitForSelector('#sib-list');
      const itemCount = await page.locator('#sib-list .sib-list__item').count();
      if (itemCount !== 6) throw new Error('seed ticket count mismatch: ' + itemCount);
      const summaryText = await page.evaluate(() => document.getElementById('sib-summary').textContent);
      if (!summaryText.includes('6')) throw new Error('summary total(6) missing: ' + summaryText);
      const detailTitle = await page.locator('#sib-detail-title').innerText();
      if (!detailTitle) throw new Error('진입 시 상세 pane 미렌더(첫 티켓 자동 선택 기대)');
    `
  );
  assert.ok(res.ok, `e2e-runner 호출 실패: ${JSON.stringify(res)}`);
  assert.ok(res.passed, `시나리오 실패 — ${res.stdout}`);
});

test("E2E — 상태 전이 시 이력 기록 + localStorage 저장 + 재진입 복원 (AC2)", async (t) => {
  if (!e2eAvailable) { t.skip(skipReason); return; }
  const res = await runE2E(
    "[BF-1011] 상태전이→이력기록→저장→새로고침 복원",
    `
      await page.waitForSelector('#sib-list');
      await page.locator('#opt-3002').click();
      await page.getByRole('button', { name: /진행 시작/ }).click();
      await new Promise((r) => setTimeout(r, 200));

      const badgeText = await page.locator('#sib-detail .sib-badge').first().innerText();
      if (!badgeText.includes('진행')) throw new Error('상태 배지가 진행으로 갱신되지 않음: ' + badgeText);

      // .sib-timeline__type 는 CSS text-transform:uppercase 로 렌더되므로 대소문자 무시 비교
      const lastType = await page.locator('.sib-timeline__item .sib-timeline__type').last().innerText();
      if (lastType.toLowerCase() !== 'status changed') throw new Error('이력에 상태 전이가 기록되지 않음: ' + lastType);

      const stored = await page.evaluate(() => {
        const raw = localStorage.getItem('support-inbox-canary:state');
        return raw ? JSON.parse(raw) : null;
      });
      if (!stored) throw new Error('localStorage 에 저장되지 않음');
      const persisted = stored.tickets.find((x) => x.id === 'INQ-3002');
      if (!persisted || persisted.status !== 'in_progress') {
        throw new Error('localStorage 상태 불일치: ' + JSON.stringify(persisted));
      }

      await page.reload();
      await page.waitForSelector('#sib-list');
      await page.locator('#opt-3002').click();
      await new Promise((r) => setTimeout(r, 200));
      const badgeAfterReload = await page.locator('#sib-detail .sib-badge').first().innerText();
      if (!badgeAfterReload.includes('진행')) throw new Error('새로고침 후 상태가 복원되지 않음: ' + badgeAfterReload);
    `,
    45000
  );
  assert.ok(res.ok, `e2e-runner 호출 실패: ${JSON.stringify(res)}`);
  assert.ok(res.passed, `시나리오 실패 — ${res.stdout}`);
});

test("E2E — 담당자 배정 시 이력 기록 + 가드 해제(G1) 반영 (AC2)", async (t) => {
  if (!e2eAvailable) { t.skip(skipReason); return; }
  const res = await runE2E(
    "[BF-1011] 담당자 배정→이력기록→진행시작 가드 해제",
    `
      await page.waitForSelector('#sib-list');
      await page.locator('#opt-3001').click();
      await new Promise((r) => setTimeout(r, 200));

      const startBtnBefore = page.getByRole('button', { name: /진행 시작/ });
      if (!(await startBtnBefore.isDisabled())) throw new Error('미배정 상태에서 진행 시작이 활성화되어 있음(G1 위반)');

      await page.locator('#sib-assignee-select').selectOption('agt-02');
      await new Promise((r) => setTimeout(r, 200));

      const historyCount = await page.locator('.sib-timeline__item').count();
      if (historyCount !== 1) throw new Error('배정 이력이 기록되지 않음: count=' + historyCount);
      const changeText = await page.locator('.sib-timeline__change').first().innerText();
      if (!changeText.includes('정지원')) throw new Error('배정 이력 담당자명 불일치: ' + changeText);

      const startBtnAfter = page.getByRole('button', { name: /진행 시작/ });
      if (await startBtnAfter.isDisabled()) throw new Error('배정 후에도 진행 시작이 비활성 상태(G1 해제 안 됨)');
    `
  );
  assert.ok(res.ok, `e2e-runner 호출 실패: ${JSON.stringify(res)}`);
  assert.ok(res.passed, `시나리오 실패 — ${res.stdout}`);
});

test("E2E — 손상된 저장 데이터 재진입 시 seed 로 안전 복구 (AC3)", async (t) => {
  if (!e2eAvailable) { t.skip(skipReason); return; }
  const res = await runE2E(
    "[BF-1011] localStorage 손상 → 재진입 시 seed 복구",
    `
      await page.waitForSelector('#sib-list');
      await page.evaluate(() => localStorage.setItem('support-inbox-canary:state', '{not-json'));
      await page.reload();
      await page.waitForSelector('#sib-list');
      await new Promise((r) => setTimeout(r, 200));

      const liveText = await page.locator('#sib-live').innerText();
      if (!liveText.includes('손상')) throw new Error('손상 복구 안내 미표시: ' + liveText);

      const itemCount = await page.locator('#sib-list .sib-list__item').count();
      if (itemCount !== 6) throw new Error('seed 6건으로 복구되지 않음: count=' + itemCount);

      const stored = await page.evaluate(() => localStorage.getItem('support-inbox-canary:state'));
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed.tickets) || parsed.tickets.length !== 6) {
        throw new Error('복구 후 재기록된 저장값이 유효하지 않음');
      }
    `,
    45000
  );
  assert.ok(res.ok, `e2e-runner 호출 실패: ${JSON.stringify(res)}`);
  assert.ok(res.passed, `시나리오 실패 — ${res.stdout}`);
});
