/* tests/e2e/team-reservation-canary/render-conflict-transition.test.js
 * BF-1010 tester 회귀 가드 — team-reservation-canary
 * SSOT: docs/plan/team-reservation-canary/reservation-approval-spec-BF-1002.md
 *       docs/design/reservation-timeline-BF-1004.md (§5 컴포넌트·§6 3중 신호)
 * dev(BF-1006) 가 이미 검증한 순수 함수/localStorage adapter/file:// 안전 가드는 재작성하지 않는다.
 * (tests/team-reservation-canary-BF1006.test.js 참고 — 여기서는 tester 고유 영역만)
 *
 * tester 고유 검증 범위:
 *  1) 정적 가드 — HTML id/class·CSS 상태 신호 토큰이 silent break 되지 않게 fact 박제
 *  2) 실 브라우저 E2E — 진입 렌더 + 상태 신호(색상/텍스트/아이콘), 시간 겹침 차단, 승인/반려 상태 전이 + 새로고침 영속성
 *
 * 실행: node --test tests/e2e/team-reservation-canary/render-conflict-transition.test.js
 * e2e-runner 시나리오는 worker 환경에서 실제 호출된다 (BRIX_E2E_SKIP=1 로 건너뛰지 않음).
 * CI(GitHub Actions) 에는 e2e-runner 컨테이너가 없으므로 도달 불가 시 skip 처리된다 (fail 아님).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "..", "..", "team-reservation-canary");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "style.css"), "utf8");

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const MY_MODULE = "team-reservation-canary";
const SCOPE_SKIP =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== MY_MODULE;

// ══════════════════════════════════════════════════════════
// 1) 정적 가드 — UI 마크업 contract (silent break 방지)
// ══════════════════════════════════════════════════════════
test("정적 가드 — 핵심 selector(id/class) 존재", (t) => {
  if (SCOPE_SKIP) return t.skip(`focused scope skip — ${MY_MODULE}`);

  const ids = [
    "tr-cards",
    "tr-cards-empty",
    "tr-list-count",
    "tr-timeline",
    "tr-timeline-date",
    "tr-resource-select",
    "tr-date-prev",
    "tr-date-next",
    "tr-new-reservation",
    "tr-storage-notice",
  ];
  for (const id of ids) {
    assert.ok(HTML.includes(`id="${id}"`), `index.html 에 id="${id}" 없음 — E2E selector 가 이 id 에 의존`);
  }
});

test("정적 가드 — 상태 신호 CSS 토큰·selector 존재(§6 3중 신호)", (t) => {
  if (SCOPE_SKIP) return t.skip(`focused scope skip — ${MY_MODULE}`);

  for (const token of ["--tr-status-pending", "--tr-status-approved", "--tr-status-rejected"]) {
    assert.ok(CSS.includes(token), `style.css 에 ${token} 색상 토큰 없음`);
  }
  // 칩 상태별 색상 selector (텍스트/아이콘 외 색상 신호)
  for (const status of ["pending", "approved", "rejected"]) {
    assert.ok(CSS.includes(`.tr-chip[data-status="${status}"]`), `.tr-chip[data-status="${status}"] selector 없음`);
  }
  // 타임라인 블록 — approved(solid) / pending(사선 hachure) 3중 신호(색맹 안전)
  assert.ok(CSS.includes('.tr-block[data-status="approved"]'), 'approved 블록 selector 없음');
  assert.ok(CSS.includes('.tr-block[data-status="pending"]'), 'pending 블록 selector 없음');
  assert.ok(CSS.includes("repeating-linear-gradient"), "pending 블록의 사선(hachure) 패턴 정의 없음 — 색맹 안전 신호 회귀");
});

test("정적 가드 — 충돌 배너·반려 사유 마크업 훅 존재", (t) => {
  if (SCOPE_SKIP) return t.skip(`focused scope skip — ${MY_MODULE}`);

  assert.ok(CSS.includes('data-kind="conflict"') || CSS.includes(".tr-alert"), "충돌 배너(.tr-alert) 스타일 훅 없음");
  assert.ok(CSS.includes(".tr-reason"), "반려 사유(.tr-reason) 스타일 훅 없음");
});

// ══════════════════════════════════════════════════════════
// 2) 실 브라우저 E2E — e2e-runner
// ══════════════════════════════════════════════════════════
const RUNNER_URL = "http://e2e-runner:3030";
const BASE_URL = `http://${process.env.BRIX_PERSONA_HOST || "worker"}:8080/team-reservation-canary/`;

async function checkE2eReachable() {
  if (process.env.BRIX_E2E_SKIP === "1") {
    return { ok: false, reason: "BRIX_E2E_SKIP=1 — CI 결정성 가드" };
  }
  try {
    const res = await fetch(`${RUNNER_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { ok: false, reason: `e2e-runner unhealthy (${res.status})` };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `e2e-runner 도달 불가 (${err.message}) — CI 환경 정상` };
  }
}

async function runE2E(t, { label, scriptText, timeoutMs }) {
  if (SCOPE_SKIP) {
    t.skip(`focused scope skip — ${MY_MODULE}`);
    return;
  }
  const reach = await checkE2eReachable();
  if (!reach.ok) {
    t.skip(reach.reason);
    return;
  }
  const res = await fetch(`${RUNNER_URL}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
      "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-1010",
    },
    body: JSON.stringify({ url: BASE_URL, label, scriptText, timeoutMs }),
  });
  const body = await res.json();
  assert.ok(body && body.ok, `e2e-runner 호출 실패: ${JSON.stringify(body)}`);
  assert.strictEqual(body.passed, true, `E2E 시나리오 실패 (${label}): ${body.stdout}`);
}

// ── 진입 렌더 + 상태 신호(색상/텍스트/아이콘) — seed 그대로(§3.2) ──
test("BF-1010 E2E — 진입 렌더 + seed 목록/타임라인 + 상태 신호(색상·텍스트·아이콘)", async (t) => {
  await runE2E(t, {
    label: "진입 렌더 · 상태 신호(3중 신호) 회귀 가드",
    timeoutMs: 30000,
    scriptText: `
      await page.waitForSelector('#tr-cards .tr-card');

      const cardCount = await page.locator('#tr-cards .tr-card').count();
      if (cardCount !== 3) throw new Error('seed 진입 렌더 카드 개수 불일치(기대 3): ' + cardCount);

      const listCountText = (await page.locator('#tr-list-count').innerText()).trim();
      if (listCountText !== '3건') throw new Error('목록 카운트 표시 불일치: ' + listCountText);

      const statuses = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#tr-cards .tr-card')).map((c) => c.dataset.status).sort()
      );
      const expectedStatuses = JSON.stringify(['approved', 'pending', 'rejected']);
      if (JSON.stringify(statuses) !== expectedStatuses) throw new Error('상태 분포 불일치: ' + statuses.join(','));

      const chipInfo = await page.evaluate(() => {
        const map = {};
        document.querySelectorAll('#tr-cards .tr-chip').forEach((chip) => {
          map[chip.dataset.status] = {
            text: chip.textContent.trim(),
            bg: getComputedStyle(chip).backgroundColor,
          };
        });
        return map;
      });

      if (!chipInfo.approved || !chipInfo.approved.text.includes('승인') || !chipInfo.approved.text.includes('✓'))
        throw new Error('approved 칩 텍스트/아이콘 불일치: ' + JSON.stringify(chipInfo.approved));
      if (!chipInfo.pending || !chipInfo.pending.text.includes('대기') || !chipInfo.pending.text.includes('⏳'))
        throw new Error('pending 칩 텍스트/아이콘 불일치: ' + JSON.stringify(chipInfo.pending));
      if (!chipInfo.rejected || !chipInfo.rejected.text.includes('반려') || !chipInfo.rejected.text.includes('✕'))
        throw new Error('rejected 칩 텍스트/아이콘 불일치: ' + JSON.stringify(chipInfo.rejected));

      const bgColors = new Set([chipInfo.approved.bg, chipInfo.pending.bg, chipInfo.rejected.bg]);
      if (bgColors.size !== 3) throw new Error('상태별 색상 신호가 구분되지 않음: ' + JSON.stringify(Array.from(bgColors)));

      const timelineRows = await page.locator('.tr-tl-reslabel').count();
      if (timelineRows !== 3) throw new Error('타임라인 자원 행 개수 불일치(기대 3): ' + timelineRows);

      const blockPatterns = await page.evaluate(() => {
        const out = {};
        document.querySelectorAll('.tr-block').forEach((b) => {
          out[b.dataset.status] = getComputedStyle(b).backgroundImage;
        });
        return out;
      });
      if (!blockPatterns.pending || blockPatterns.pending === 'none')
        throw new Error('pending 타임라인 블록에 사선(hachure) 패턴 미적용: ' + blockPatterns.pending);
      if (!blockPatterns.approved || blockPatterns.approved !== 'none')
        throw new Error('approved 타임라인 블록은 solid 여야 함(backgroundImage 없어야 함): ' + blockPatterns.approved);
    `,
  });
});

// ── 시간 겹침 차단 + 승인/반려 상태 전이 + 새로고침 영속성 ──
test("BF-1010 E2E — 시간 겹침 승인 차단 + 승인/반려 상태 전이 + 새로고침 영속성", async (t) => {
  await runE2E(t, {
    label: "시간 겹침 승인 차단 · 상태 전이 · 영속성 회귀 가드",
    timeoutMs: 60000,
    scriptText: `
      await page.waitForSelector('#tr-cards .tr-card');

      // res-01 · rsv-01(approved 01:00-02:00) 과 겹치는 신규 pending 을 실 브라우저 localStorage 에 시딩 후 새로고침
      await page.evaluate(() => {
        const state = {
          schemaVersion: 1,
          resources: [
            { id: 'res-01', name: '1층 대회의실', capacity: 12 },
            { id: 'res-02', name: '2층 소회의실 A', capacity: 4 },
            { id: 'res-03', name: '2층 소회의실 B', capacity: 4 },
          ],
          reservations: [
            { id: 'rsv-01', resourceId: 'res-01', requesterName: '김도영', startAt: '2026-07-20T01:00:00.000Z', endAt: '2026-07-20T02:00:00.000Z', status: 'approved', createdAt: '2026-07-17T00:00:00.000Z', decidedAt: '2026-07-17T01:00:00.000Z', reason: null },
            { id: 'rsv-02', resourceId: 'res-01', requesterName: '이서준', startAt: '2026-07-20T02:00:00.000Z', endAt: '2026-07-20T03:00:00.000Z', status: 'pending', createdAt: '2026-07-17T00:10:00.000Z', decidedAt: null, reason: null },
            { id: 'rsv-e2e-conflict', resourceId: 'res-01', requesterName: 'E2E테스터', startAt: '2026-07-20T01:15:00.000Z', endAt: '2026-07-20T01:45:00.000Z', status: 'pending', createdAt: '2026-07-17T00:30:00.000Z', decidedAt: null, reason: null },
          ],
        };
        localStorage.setItem('team-reservation-canary:v1', JSON.stringify(state));
      });
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('#tr-cards .tr-card');

      // 1) 겹침 승인 차단 — approved(rsv-01) 과 시간 겹침 → CONFLICT, pending 유지
      const conflictCard = page.locator('.tr-card[data-reservation-id="rsv-e2e-conflict"]');
      await conflictCard.locator('button:has-text("승인")').click();
      await page.waitForTimeout(200);
      const alertCount = await conflictCard.locator('.tr-alert[data-kind="conflict"]').count();
      if (alertCount !== 1) throw new Error('겹침 승인 시 충돌 배너가 표시되지 않음');
      const statusAfterConflict = await conflictCard.getAttribute('data-status');
      if (statusAfterConflict !== 'pending') throw new Error('겹침 승인 후에도 pending 이 유지돼야 하는데: ' + statusAfterConflict);

      // 2) 겹치지 않는 승인 — rsv-02(02:00-03:00) 는 rsv-01 과 경계만 닿음 → 정상 승인 전이
      const okCard = page.locator('.tr-card[data-reservation-id="rsv-02"]');
      await okCard.locator('button:has-text("승인")').click();
      await page.waitForTimeout(200);
      const okStatus = await page.locator('.tr-card[data-reservation-id="rsv-02"]').getAttribute('data-status');
      if (okStatus !== 'approved') throw new Error('정상 승인 처리가 반영되지 않음: ' + okStatus);
      const okChipText = await page.locator('.tr-card[data-reservation-id="rsv-02"] .tr-chip').innerText();
      if (!okChipText.includes('승인') || !okChipText.includes('✓')) throw new Error('승인 칩 신호 불일치: ' + okChipText);

      // 3) 새로고침 후 영속성 — localStorage round-trip 이 실 브라우저에서 유지되는지
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('#tr-cards .tr-card');
      const persistedStatus = await page.locator('.tr-card[data-reservation-id="rsv-02"]').getAttribute('data-status');
      if (persistedStatus !== 'approved') throw new Error('새로고침 후 승인 상태가 유지되지 않음: ' + persistedStatus);

      // 4) 반려 흐름 — window.prompt 응답을 모킹해 사유 기록 검증
      await page.evaluate(() => { window.prompt = () => 'E2E 반려 사유'; });
      const rejectCard = page.locator('.tr-card[data-reservation-id="rsv-e2e-conflict"]');
      await rejectCard.locator('button:has-text("반려")').click();
      await page.waitForTimeout(200);
      const rejectedStatus = await page.locator('.tr-card[data-reservation-id="rsv-e2e-conflict"]').getAttribute('data-status');
      if (rejectedStatus !== 'rejected') throw new Error('반려 처리가 반영되지 않음: ' + rejectedStatus);
      const reasonText = await page.locator('.tr-card[data-reservation-id="rsv-e2e-conflict"] .tr-reason').innerText();
      if (!reasonText.includes('E2E 반려 사유')) throw new Error('반려 사유가 카드에 기록되지 않음: ' + reasonText);
      const rejectChipText = await page.locator('.tr-card[data-reservation-id="rsv-e2e-conflict"] .tr-chip').innerText();
      if (!rejectChipText.includes('반려') || !rejectChipText.includes('✕')) throw new Error('반려 칩 신호 불일치: ' + rejectChipText);
    `,
  });
});
