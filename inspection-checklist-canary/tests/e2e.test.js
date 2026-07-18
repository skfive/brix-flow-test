/* inspection-checklist-canary/tests/e2e.test.js
 * BF-1029 tester E2E 회귀 가드 — 머지된 inspection-checklist-canary module(BF-1027)
 * 대상: 실 브라우저 렌더·상태 전이·차단 사유·변경 이력·손상 저장 복구·보존 영역
 * dev 단위 테스트(tests/inspection-checklist-canary-BF1027.test.js)가 이미 검증한
 * storage.js 도메인 로직(가드 코드·seed 구조·라운드트립)은 여기서 재검증하지 않는다.
 * 실행: node --test inspection-checklist-canary/tests/e2e.test.js
 * 사전조건: python3 -m http.server 8080 --bind 0.0.0.0 --directory . (repo root)
 * 로딩: 루트 package.json 이 "type":"module" → ESM 테스트 (dev BF1027 테스트 관례 계승)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..", "..");

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip (각 test 내부에서 확인).
const _BRIX_MY_MODULE = "inspection-checklist-canary";
const SCOPE_SKIP =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const RUN_ID = process.env.BRIX_RUN_ID ?? "unknown";
const JIRA_KEY = process.env.BRIX_JIRA_KEY ?? "BF-1029";
const HOST = process.env.BRIX_PERSONA_HOST || "worker";
const BASE_URL = `http://${HOST}:${process.env.BRIX_STATIC_PORT || 8080}/inspection-checklist-canary/`;
const STORAGE_KEY = "inspection-checklist-canary:v1";

// ───────────────── e2e-runner 도달성 (module-scope, hook 내 assert 금지 패턴) ─────────────────
let e2eAvailable = true;
let skipReason = null;

test.before(async () => {
  if (SCOPE_SKIP) return; // scope skip 이면 도달성 확인 자체 불필요
  if (process.env.BRIX_E2E_SKIP === "1") {
    e2eAvailable = false;
    skipReason = "BRIX_E2E_SKIP=1";
    return;
  }
  try {
    const probe = await fetch("http://e2e-runner:3030/health", { signal: AbortSignal.timeout(2000) });
    if (!probe.ok) {
      e2eAvailable = false;
      skipReason = `e2e-runner unhealthy (${probe.status})`;
    }
  } catch (err) {
    e2eAvailable = false;
    skipReason = `e2e-runner 도달 불가 (${err.message}) — CI 환경 정상`;
  }
});

async function runE2E({ label, scriptText, timeoutMs }) {
  const res = await fetch("http://e2e-runner:3030/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Brix-Run-Id": RUN_ID,
      "X-Brix-Jira-Key": JIRA_KEY,
    },
    body: JSON.stringify({ url: BASE_URL, label, scriptText, timeoutMs: timeoutMs ?? 30000 }),
  });
  return res.json();
}

// ───────────────── AC1: 렌더 · 상태 전이 · 차단 사유 · 변경 이력 ─────────────────
test("BF-1029 AC1 — 렌더/전이/차단사유/이력 회귀 가드", async (t) => {
  if (SCOPE_SKIP) {
    t.skip(`focused scope skip — ${_BRIX_MY_MODULE}`);
    return;
  }
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }
  const result = await runE2E({
    label: "[BF-1029 | inspection-checklist-canary] 렌더·진행시작·차단(사유)·이력·G1가드",
    timeoutMs: 45000,
    scriptText: `
      await page.waitForSelector('#icc-board [data-role="card"]');

      // 렌더: 집계 칩(총 7) + 카드 7건
      const statsText = await page.locator('#icc-stats').innerText();
      if (!statsText.includes('7')) throw new Error('총 건수 집계 미노출: ' + statsText);
      const cardCount = await page.locator('[data-role="card"]').count();
      if (cardCount !== 7) throw new Error('카드 수 불일치: ' + cardCount);

      // 카드 선택 → 상세 패널 노출
      await page.locator('[data-role="card"][data-id="IC-2002"]').click();
      const detailAfterSelect = await page.locator('#icc-detail').innerText();
      if (!detailAfterSelect.includes('IC-2002')) throw new Error('상세 패널에 선택 카드 미표시');

      // G1 가드: 미배정 카드(IC-2001)의 "진행 시작" 버튼은 disabled
      await page.locator('[data-role="card"][data-id="IC-2001"]').click();
      const g1Btn = page.locator('[data-role="card"][data-id="IC-2001"] [data-role="transition"][data-to="in_progress"]');
      const g1Disabled = await g1Btn.getAttribute('aria-disabled');
      if (g1Disabled !== 'true') throw new Error('G1: 미배정 착수 버튼이 disabled 아님');

      // 전이: todo(배정됨, IC-2002) → in_progress
      await page.locator('[data-role="card"][data-id="IC-2002"]').click();
      await page.locator('[data-role="card"][data-id="IC-2002"] [data-role="transition"][data-to="in_progress"]').click();
      await page.waitForSelector('.icc-column--progress [data-role="card"][data-id="IC-2002"]');

      // 전이: in_progress → blocked, window.prompt 로 사유 입력 (G2)
      page.once('dialog', async (dialog) => { await dialog.accept('출입 통제 — BF-1029 회귀 가드'); });
      await page.locator('[data-role="card"][data-id="IC-2002"]').click();
      await page.locator('[data-role="card"][data-id="IC-2002"] [data-role="transition"][data-to="blocked"]').click();
      await page.waitForSelector('.icc-column--blocked [data-role="card"][data-id="IC-2002"]');

      // 차단 사유가 카드에 노출
      const blockedCardText = await page.locator('.icc-column--blocked [data-role="card"][data-id="IC-2002"]').innerText();
      if (!blockedCardText.includes('출입 통제 — BF-1029 회귀 가드')) throw new Error('차단 사유 카드 미노출: ' + blockedCardText);

      // 상세 패널의 변경 이력에 두 전이 모두 반영
      await page.locator('[data-role="card"][data-id="IC-2002"]').click();
      const historyText = await page.locator('#icc-detail').innerText();
      if (!historyText.includes('상태 변경')) throw new Error('이력에 상태 변경 이벤트 없음: ' + historyText);
      if (!historyText.includes('차단 설정')) throw new Error('이력에 차단 설정 이벤트 없음: ' + historyText);
      if (!historyText.includes('차단 사유')) throw new Error('상세 패널 차단 사유 필드 미표시');
    `,
  });

  assert.ok(result.ok, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
  assert.ok(result.passed, `시나리오 실패 — stdout: ${result.stdout}`);
});

// ───────────────── AC2: 손상 저장 데이터 → 경고 후 seed 복구 ─────────────────
test("BF-1029 AC2 — 손상 저장 데이터 경고 배너 + seed 복구 회귀 가드", async (t) => {
  if (SCOPE_SKIP) {
    t.skip(`focused scope skip — ${_BRIX_MY_MODULE}`);
    return;
  }
  if (!e2eAvailable) {
    t.skip(skipReason);
    return;
  }
  const result = await runE2E({
    label: "[BF-1029 | inspection-checklist-canary] 손상 localStorage → 경고 배너 + seed 복구",
    timeoutMs: 30000,
    scriptText: `
      await page.waitForSelector('#icc-board [data-role="card"]');

      // 저장 데이터 손상 주입 후 재진입
      await page.evaluate((key) => localStorage.setItem(key, '{not json'), '${STORAGE_KEY}');
      await page.reload();
      await page.waitForSelector('#icc-board [data-role="card"]');

      // 경고 배너 노출
      const noticeVisible = await page.locator('#icc-notice').isVisible();
      if (!noticeVisible) throw new Error('손상 복구 경고 배너 미노출');
      const noticeText = await page.locator('#icc-notice').innerText();
      if (!noticeText.includes('손상')) throw new Error('배너 문구 불일치: ' + noticeText);

      // seed 복구: 카드 7건 + localStorage 에 정식 기록(자가 치유)
      const cardCount = await page.locator('[data-role="card"]').count();
      if (cardCount !== 7) throw new Error('복구 후 카드 수 불일치: ' + cardCount);
      const stored = await page.evaluate((key) => localStorage.getItem(key), '${STORAGE_KEY}');
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed.items) || parsed.items.length !== 7) throw new Error('복구 후 저장값 불일치: ' + stored);

      // 배너 닫기 인터랙션
      await page.locator('#icc-notice-close').click();
      const noticeVisibleAfterClose = await page.locator('#icc-notice').isVisible();
      if (noticeVisibleAfterClose) throw new Error('닫기 클릭 후에도 배너가 계속 노출됨');
    `,
  });

  assert.ok(result.ok, `e2e-runner 호출 실패: ${JSON.stringify(result)}`);
  assert.ok(result.passed, `시나리오 실패 — stdout: ${result.stdout}`);
});

// ───────────────── AC3: 보존 영역 — 기존 module·root scripts 미변경 ─────────────────
test("BF-1029 AC3 — 루트 package.json 기존 스크립트 보존", (t) => {
  if (SCOPE_SKIP) {
    t.skip(`focused scope skip — ${_BRIX_MY_MODULE}`);
    return;
  }
  const pkg = JSON.parse(readFileSync(join(ROOT_DIR, "package.json"), "utf8"));
  assert.equal(pkg.scripts.test, "node --test tests/snake-BF608.test.js");
  assert.equal(pkg.scripts["test:snake"], "node --test tests/snake-BF608.test.js");
  assert.equal(pkg.scripts["test:notepad"], "node --test tests/notepad-*.test.js");
  assert.equal(pkg.scripts["test:timer"], "node --test tests/timer-*.test.js");
  assert.equal(pkg.scripts["test:clock"], "node --test tests/clock-BF842.test.js");
});

test("BF-1029 AC3 — 기존 sibling module 핵심 파일 보존", (t) => {
  if (SCOPE_SKIP) {
    t.skip(`focused scope skip — ${_BRIX_MY_MODULE}`);
    return;
  }
  assert.ok(existsSync(join(ROOT_DIR, "support-inbox-phase18", "inbox.js")), "support-inbox-phase18/inbox.js 보존");
  assert.ok(existsSync(join(ROOT_DIR, "team-reservation-canary", "app.js")), "team-reservation-canary/app.js 보존");
  assert.ok(
    existsSync(join(ROOT_DIR, "tests", "inspection-checklist-canary-BF1027.test.js")),
    "dev 단위 테스트 파일 보존"
  );
});
