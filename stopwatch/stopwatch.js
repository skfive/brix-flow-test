// BF-417 · 스톱워치 순수 로직 유틸
// - DOM 의존성 없음 → node:test 단위 테스트 가능
// - 명세: docs/design/stopwatch-BF-415.md
//   §5.1 (display 변환 공식), §6.4 (랩 추가 흐름), §7.7 (포맷 helper)

/**
 * 명세 §1.3 / §4.3: v1 은 99:59.99 까지 (5_999_999ms). 초과 시 max-cap.
 */
export const MAX_ELAPSED_MS = 5_999_999;

/**
 * 명세 §4.5: 랩 리스트 최대 200 개. 초과 시 가장 오래된 랩 drop.
 * (디자인은 dim 표시까지 언급했으나 v1 은 단순 FIFO cap 으로 cap 도달 자체를 회피.)
 */
export const MAX_LAPS = 200;

/**
 * 정수를 2자리 zero-pad 문자열로.
 */
export function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * [0, MAX_ELAPSED_MS] 으로 강제 clamp. 음수/NaN/문자열은 0.
 */
export function clampElapsed(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > MAX_ELAPSED_MS) return MAX_ELAPSED_MS;
  return Math.trunc(n);
}

/**
 * MAX_ELAPSED_MS 도달 여부 (== max-cap 자동 정지 트리거).
 */
export function isMaxCap(ms) {
  return Number.isFinite(ms) && ms >= MAX_ELAPSED_MS;
}

/**
 * 명세 §7.7 — elapsed ms → { mm, ss, xx } zero-pad 문자열 객체.
 *  mm = Math.floor(clamped / 60000)
 *  ss = Math.floor((clamped % 60000) / 1000)
 *  xx = Math.floor((clamped % 1000) / 10)  ← 1/100 초
 */
export function formatStopwatchMs(ms) {
  const clamped = clampElapsed(ms);
  const mm = Math.floor(clamped / 60000);
  const ss = Math.floor((clamped % 60000) / 1000);
  const xx = Math.floor((clamped % 1000) / 10);
  return { mm: pad2(mm), ss: pad2(ss), xx: pad2(xx) };
}

/**
 * "mm:ss.xx" 단일 문자열.
 */
export function formatStopwatchMsStr(ms) {
  const { mm, ss, xx } = formatStopwatchMs(ms);
  return `${mm}:${ss}.${xx}`;
}

/**
 * 명세 §6.4 — 새 랩을 push 하여 새 배열 반환 (불변).
 *  - index: 기존 랩의 마지막 index + 1 (FIFO cap 으로 잘려도 끊임없이 증가)
 *  - cumulativeMs: 전달된 elapsedMs (clamp 적용)
 *  - deltaMs: cumulativeMs - 직전 랩의 cumulativeMs (없으면 cumulativeMs 자체)
 *  - MAX_LAPS 초과 시 가장 오래된 항목 drop (FIFO).
 */
export function addLap(laps, elapsedMs) {
  if (!Array.isArray(laps)) {
    throw new Error("laps 는 배열이어야 합니다.");
  }
  const cumulativeMs = clampElapsed(elapsedMs);
  const lastIndex = laps.length > 0 ? laps[laps.length - 1].index : 0;
  const lastCumulative =
    laps.length > 0 ? laps[laps.length - 1].cumulativeMs : 0;
  const newLap = {
    index: lastIndex + 1,
    cumulativeMs,
    deltaMs: cumulativeMs - lastCumulative,
  };
  const next = [...laps, newLap];
  if (next.length > MAX_LAPS) {
    return next.slice(next.length - MAX_LAPS);
  }
  return next;
}

/**
 * 명세 §5.3 — 최단/최장 랩의 index 반환.
 *  - 랩 0 / 1 개: null (비교 대상 없음)
 *  - delta tie 로 fastest === slowest 가 되는 경우 (예: 동일 delta 2 개): null
 *  - tie 시 일반: 명세상 "가장 최근(높은 index) 랩 우선" — 본 구현은 마지막 match 채택.
 */
export function findFastestSlowest(laps) {
  if (!Array.isArray(laps) || laps.length < 2) return null;
  let fastestIndex = laps[0].index;
  let slowestIndex = laps[0].index;
  let fastestDelta = laps[0].deltaMs;
  let slowestDelta = laps[0].deltaMs;
  for (let i = 1; i < laps.length; i++) {
    const { index, deltaMs } = laps[i];
    // "가장 최근 우선" 정책 — <= / >= 로 동률 시 더 큰 index 채택
    if (deltaMs <= fastestDelta) {
      fastestDelta = deltaMs;
      fastestIndex = index;
    }
    if (deltaMs >= slowestDelta) {
      slowestDelta = deltaMs;
      slowestIndex = index;
    }
  }
  // 동률로 같은 index 에 fastest·slowest 가 겹치면 의미 없음 → null
  if (fastestIndex === slowestIndex) return null;
  return { fastestIndex, slowestIndex };
}
