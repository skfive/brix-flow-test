// BF-734 · 헬스체크 코어 — 의존 서비스 체크 실행 및 결과 집계
//
// 각 체크는 다음 형태의 객체:
//   { name: string, check: () => boolean | Promise<boolean> | { ok: boolean, detail?: string } }
//
// 반환:
//   { healthy: boolean, checks: { [name]: { status: "ok" | "error", reason?: string } } }
//
// 의존 체크를 주입 가능하게 두어 DB·캐시 등 실제 의존 없이도
// 정상/비정상 시나리오를 테스트할 수 있다.

/**
 * 주어진 의존 체크 목록을 실행하고 결과를 집계한다.
 * 하나라도 실패하면 healthy=false.
 * @param {Array<{name: string, check: Function}>} checks
 * @returns {Promise<{healthy: boolean, checks: Record<string, {status: string, reason?: string}>}>}
 */
export async function runHealthChecks(checks = []) {
  const results = {};
  let healthy = true;

  for (const { name, check } of checks) {
    try {
      const outcome = await check();
      const ok = typeof outcome === "boolean" ? outcome : Boolean(outcome && outcome.ok);
      if (ok) {
        results[name] = { status: "ok" };
      } else {
        healthy = false;
        const reason = (outcome && outcome.detail) || "check failed";
        results[name] = { status: "error", reason };
      }
    } catch (err) {
      healthy = false;
      results[name] = { status: "error", reason: (err && err.message) || String(err) };
    }
  }

  return { healthy, checks: results };
}
