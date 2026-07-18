/* tests/booking-approval-phase18/e2e-BF1020.test.js — BF-1020 팀 예약·승인 서비스 E2E 회귀 가드
 * 범위(tester 고유 영역 — dev 단위 테스트(tests/booking-approval-phase18-BF1016.test.js)와 중복 금지):
 *   1. UI 마크업 contract — HTML data-testid/data-field/id 존재 (silent break 가드)
 *   2. CORS 안전 — <script type="module">/fetch()/외부 import 미사용 (file:// 호환, §7.6 UMD)
 *   3. 실 브라우저 E2E(e2e-runner) — 진입 렌더, 승인 충돌 판정, 승인/반려 상태 전이 (decideBooking
 *      순수 로직 자체는 dev 가 이미 단위 테스트로 검증했으므로, 여기서는 "브라우저 조작 → DOM 반영"만 검증)
 * 실행: node --test tests/booking-approval-phase18/e2e-BF1020.test.js
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "..", "booking-approval-phase18");

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = "booking-approval-phase18";
const _BRIX_SKIP_SCOPE =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

if (_BRIX_SKIP_SCOPE) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
  const APP_JS = readFileSync(join(MODULE_DIR, "app.js"), "utf8");
  const BOOKING_JS = readFileSync(join(MODULE_DIR, "booking.js"), "utf8");

  // ───────────────────────────── UI 마크업 contract (silent break 가드)
  test("[BF-1020] UI contract — 필터/폼/배너/목록 핵심 selector 존재", () => {
    const required = [
      'data-testid="filter-bar"',
      'data-field="filter-resource"',
      'data-field="filter-status"',
      'data-testid="booking-form"',
      'data-field="resourceId"',
      'data-field="requesterName"',
      'data-field="startAt"',
      'data-field="endAt"',
      'data-testid="submit-booking"',
      'data-testid="form-error"',
      'data-testid="conflict-banner"',
      'data-testid="conflict-detail"',
      'data-testid="conflict-close"',
      'data-testid="booking-list"',
      'data-testid="storage-note"',
    ];
    for (const marker of required) {
      assert.ok(HTML.includes(marker), `index.html 에 ${marker} 없음 — UI contract 깨짐`);
    }
  });

  test("[BF-1020] UI contract — 예약 카드 렌더 산출물(app.js)의 testid/action 존재", () => {
    const required = [
      '"booking-item"',
      '"approve-btn"',
      '"reject-btn"',
      '"reject-reason"',
      '"data-action"',
      '"approve"',
      '"reject"',
      '"data-status"',
    ];
    for (const marker of required) {
      assert.ok(APP_JS.includes(marker), `app.js 에 ${marker} 없음 — 카드 렌더 contract 깨짐`);
    }
  });

  // ───────────────────────────── CORS 안전 (file:// 호환, vanilla-static)
  test("[BF-1020] CORS 안전 — <script type=module>/외부 CDN 미사용", () => {
    assert.ok(!/type\s*=\s*["']module["']/.test(HTML), "index.html 이 type=module 사용 — file:// CORS 깨짐");
    assert.ok(!/<script[^>]+src\s*=\s*["']https?:\/\//.test(HTML), "index.html 이 외부 CDN script 사용");
    assert.ok(!/<link[^>]+href\s*=\s*["']https?:\/\//.test(HTML), "index.html 이 외부 CDN stylesheet 사용");
  });

  test("[BF-1020] CORS 안전 — app.js/booking.js 가 fetch()/import 미사용", () => {
    for (const [name, src] of [["app.js", APP_JS], ["booking.js", BOOKING_JS]]) {
      assert.ok(!/\bfetch\s*\(/.test(src), `${name} 이 fetch() 사용 — file:// 호환 깨짐`);
      assert.ok(!/\bimport\s+.*\bfrom\b/.test(src), `${name} 이 ESM import 사용 — UMD 계약 깨짐`);
    }
  });

  // ───────────────────────────── 실 브라우저 E2E (e2e-runner)
  const E2E_URL = `http://${process.env.BRIX_PERSONA_HOST || "worker"}:${process.env.BRIX_E2E_PORT || 8080}/booking-approval-phase18/`;

  let e2eAvailable = true;
  let skipReason = null;

  test("[BF-1020] e2e-runner 헬스체크", async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      e2eAvailable = false;
      skipReason = "BRIX_E2E_SKIP=1 — CI 결정성 가드";
      t.skip(skipReason);
      return;
    }
    try {
      const probe = await fetch("http://e2e-runner:3030/health", {
        signal: AbortSignal.timeout(2000),
      });
      if (!probe.ok) {
        e2eAvailable = false;
        skipReason = `e2e-runner unhealthy (${probe.status})`;
        t.skip(skipReason);
      }
    } catch (err) {
      e2eAvailable = false;
      skipReason = `e2e-runner 도달 불가 (${err.message}) — CI 환경 정상`;
      t.skip(skipReason);
    }
  });

  test("[BF-1020] E2E — 진입 렌더 · 승인 충돌 판정 · 승인/반려 상태 전이 (canonical)", async (t) => {
    if (!e2eAvailable) {
      t.skip(skipReason);
      return;
    }

    // 브라우저 안(page 컨텍스트)에서 실행될 스크립트 — bare document/window 접근 금지, page.* 로만 조작.
    const scriptText = `
      // 1) 진입 렌더 — seed 5건
      await page.waitForSelector('[data-testid="booking-item"]');
      const initialCount = await page.locator('[data-testid="booking-item"]').count();
      if (initialCount !== 5) throw new Error('초기 렌더 5건 기대, 실제 ' + initialCount);

      const seedApproved = page.locator('[data-booking-id="bkg-01"]');
      const seedBadge = await seedApproved.locator('.bk-badge').innerText();
      if (!seedBadge.includes('승인')) throw new Error('bkg-01 승인 배지 미노출: ' + seedBadge);

      // 2) 승인된 예약과 겹치는 신규 예약 생성(room-01, 02:15~02:45 — bkg-01 02:00~03:00 과 부분 겹침)
      await page.selectOption('#f-resource', 'room-01');
      await page.fill('#f-requester', 'E2E충돌테스트');
      await page.fill('#f-start', '2026-07-25T02:15');
      await page.fill('#f-end', '2026-07-25T02:45');
      await page.click('[data-testid="submit-booking"]');

      await page.waitForFunction(() => document.querySelectorAll('[data-testid="booking-item"]').length === 6);
      const newCard = page.locator('[data-booking-id="bkg-06"]');
      if ((await newCard.count()) !== 1) throw new Error('신규 예약(bkg-06) 카드 미생성');
      const newStatusBefore = await newCard.getAttribute('data-status');
      if (newStatusBefore !== 'requested') throw new Error('신규 예약 초기 상태가 requested 아님: ' + newStatusBefore);

      // 3) 승인 시도 → 충돌 배너 노출, 상태는 requested 유지(승인 거부)
      await newCard.locator('[data-testid="approve-btn"]').click();
      const bannerHidden = await page.locator('[data-testid="conflict-banner"]').isHidden();
      if (bannerHidden) throw new Error('충돌 배너가 노출되지 않음');
      const detailText = await page.locator('[data-testid="conflict-detail"]').innerText();
      if (!detailText.includes('오세훈')) throw new Error('충돌 상세에 대상 예약자 미표시: ' + detailText);
      const newStatusAfterConflict = await newCard.getAttribute('data-status');
      if (newStatusAfterConflict !== 'requested') throw new Error('충돌 시 상태가 변경됨: ' + newStatusAfterConflict);

      // 4) 반려 — window.prompt 다이얼로그 자동 수락 후 상태 전이 + 사유 반영 확인
      page.once('dialog', (dialog) => dialog.accept('E2E 자동 반려 사유'));
      await newCard.locator('[data-testid="reject-btn"]').click();
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-booking-id="bkg-06"]');
        return !!el && el.getAttribute('data-status') === 'rejected';
      });
      const reasonText = await newCard.locator('[data-testid="reject-reason"]').innerText();
      if (!reasonText.includes('E2E 자동 반려 사유')) throw new Error('반려 사유 미반영: ' + reasonText);
      if ((await newCard.locator('[data-testid="approve-btn"]').count()) !== 0) {
        throw new Error('반려 후에도 승인 버튼이 남아있음');
      }

      // 5) 충돌 없는 승인 성공 경로 — bkg-04(room-02, requested, 충돌 없음)
      const card04 = page.locator('[data-booking-id="bkg-04"]');
      await card04.locator('[data-testid="approve-btn"]').click();
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-booking-id="bkg-04"]');
        return !!el && el.getAttribute('data-status') === 'approved';
      });
      if ((await card04.locator('[data-testid="approve-btn"]').count()) !== 0) {
        throw new Error('승인 성공 후에도 승인 버튼이 남아있음');
      }

      // 6) 상태 필터 — rejected 만 선택 시 bkg-03(seed) + bkg-06(방금 반려) = 2건만 표시
      await page.selectOption('#filter-status', 'rejected');
      await page.waitForFunction(() => document.querySelectorAll('[data-testid="booking-item"]').length === 2);
      const rejectedCount = await page.locator('[data-testid="booking-item"]').count();
      if (rejectedCount !== 2) throw new Error('반려 필터 결과 2건 기대, 실제 ' + rejectedCount);
    `;

    const res = await fetch("http://e2e-runner:3030/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
        "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-1020",
      },
      body: JSON.stringify({
        url: E2E_URL,
        label: "팀 예약·승인 — 렌더/충돌판정/승인·반려 전이",
        scriptText,
        timeoutMs: 30000,
      }),
    });

    assert.ok(res.ok, `e2e-runner HTTP 오류: ${res.status}`);
    const body = await res.json();
    assert.ok(body.ok, `e2e-runner 호출 실패: ${JSON.stringify(body)}`);
    assert.ok(body.passed, `E2E 시나리오 실패 — stdout: ${body.stdout}`);
  });
}
