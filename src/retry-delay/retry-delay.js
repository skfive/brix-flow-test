// src/retry-delay/retry-delay.js
//
// bounded exponential backoff — 재시도 지연 계산 순수 함수 (ESM, build step 없음).
// 계약: docs/plans/retry-delay-BF-1399.md (BF-1399 / freeze: BF-1406).
//
// 값 = min(baseDelayMs * 2^attempt, maxDelayMs)
//
// [복잡도 근거]
//   - 시간 O(1): 반복문/재귀 없이 `2 ** attempt` 단일 지수 연산 + 곱/min 만 사용한다.
//     attempt 가 아무리 커도(예: 1000) `2 ** attempt` 는 즉시 Infinity 로 평가되고,
//     Math.min(Infinity, maxDelayMs) === maxDelayMs 이므로 오버플로가 무해하며 루프가 없다.
//   - 공간 O(1): 입력 크기에 비례하는 보조 자료구조가 없다.
//   - 무의존/결정론: DOM·타이머·네트워크·파일시스템·전역 가변 상태·Date·난수를 쓰지 않는다.
//     동일 입력 → 항상 동일 출력이며 인자를 재할당·변형하지 않는다(원시 number, side-effect 없음).

/**
 * 유한 정수 검증 헬퍼 (계약 §4 규칙).
 * - number 가 아니거나 NaN / 비유한(Infinity 등) → TypeError
 * - 유한하나 정수가 아니거나 min 미만(도메인 범위 위반) → RangeError
 * @param {number} value 검증 대상
 * @param {number} min   허용 최솟값(포함)
 * @param {string} name  위반 시 메시지에 포함할 파라미터명
 */
function assertFiniteIntegerFrom(value, min, name) {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (!Number.isInteger(value)) {
    throw new RangeError(`${name} must be an integer`);
  }
  if (value < min) {
    throw new RangeError(`${name} must be an integer >= ${min}`);
  }
}

/**
 * 이번 재시도까지 대기할 밀리초를 bounded exponential backoff 로 계산한다.
 * 결정론적 순수 함수 — 실제 대기/jitter/스케줄링/로깅은 범위 밖.
 *
 * @param {number} attempt     재시도 회차(0 이상 정수). 0이면 최초 회차.
 * @param {number} baseDelayMs 기본 지연(양의 정수 밀리초, >= 1).
 * @param {number} maxDelayMs  상한 지연(정수 밀리초, >= baseDelayMs).
 * @returns {number} min(baseDelayMs * 2^attempt, maxDelayMs) — 항상 [baseDelayMs, maxDelayMs] 범위의 정수.
 * @throws {TypeError}  인자가 number 가 아니거나 NaN·비유한일 때.
 * @throws {RangeError} 정수가 아니거나 도메인 범위(attempt>=0, baseDelayMs>=1, maxDelayMs>=baseDelayMs)를 벗어날 때.
 */
export function computeRetryDelay(attempt, baseDelayMs, maxDelayMs) {
  assertFiniteIntegerFrom(attempt, 0, 'attempt');
  assertFiniteIntegerFrom(baseDelayMs, 1, 'baseDelayMs');
  assertFiniteIntegerFrom(maxDelayMs, 1, 'maxDelayMs');
  if (maxDelayMs < baseDelayMs) {
    throw new RangeError('maxDelayMs must be >= baseDelayMs');
  }

  const raw = baseDelayMs * 2 ** attempt; // 정수 * 정수 → 정수(초대형이면 Infinity, 무해)
  return Math.min(raw, maxDelayMs); // clamp — 두 피연산자 모두 정수이므로 결과도 정수
}
