// BF-407 · 타이머 순수 로직 유틸
// - DOM 의존성 없음 → node:test 단위 테스트 가능
// - 명세: docs/design/timer-BF-405.md §4.4 (입력 범위), §4.3 (display 형식), §6.3 (tick)

/**
 * 표시 형식: "M:SS" (분은 자연수, 초는 항상 2자리 zero-pad).
 * 명세 §4.3: tabular-nums + font-mono 로 가로폭 안정 — 분 zero-pad 불요.
 */
export function formatMmSs(minutes, seconds) {
  const m = Number.isFinite(minutes) ? Math.max(0, Math.trunc(minutes)) : 0;
  const s = Number.isFinite(seconds) ? Math.max(0, Math.trunc(seconds)) : 0;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * 분 입력 정규화 (§4.4): [0, 99] clamp, 유효하지 않은 값은 0.
 */
export function clampMinutes(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 99) return 99;
  return Math.trunc(n);
}

/**
 * 초 입력 정규화 (§4.4): [0, 59] clamp, 유효하지 않은 값은 0.
 * 명세는 60 이상도 단순 clamp (분으로 carrying 안 함 — UX 명확성).
 */
export function clampSeconds(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 59) return 59;
  return Math.trunc(n);
}

/**
 * 분/초 → 총 밀리초.
 */
export function toTotalMs(minutes, seconds) {
  return clampMinutes(minutes) * 60_000 + clampSeconds(seconds) * 1000;
}

/**
 * 남은 밀리초 → 분/초 표시값.
 *  - ceil 표시: 1ms 라도 남아 있으면 "1초" 로 노출 (마지막 1초가 사라지는 인상 방지)
 *  - 음수·NaN 은 0:00 으로 안전 처리
 */
export function msToMmSs(remainingMs) {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return { minutes: 0, seconds: 0 };
  }
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { minutes, seconds };
}
