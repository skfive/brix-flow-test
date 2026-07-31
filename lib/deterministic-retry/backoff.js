// 결정론적 exponential backoff 계산 함수 (BF-1387)
// 계약: docs/plans/implementation-plan.md §3 (planning-contract@v1) — 유일 권위.
// 출력 규칙: Math.min(maxDelayMs, baseDelayMs * 2 ** attempt)
// 순수 함수 — 랜덤/타이머/네트워크/전역 상태/입력 변형 없음 (O(1)).

/**
 * 필드가 유한 정수(number)인지 검증한다. 위반 시 TypeError.
 * NaN·Infinity·소수·비-number 는 모두 Number.isInteger 로 걸러진다.
 * @param {string} name 필드명 (에러 메시지용)
 * @param {unknown} value 검사 대상 값
 * @returns {number} 검증된 정수 값
 */
function assertFiniteInteger(name, value) {
  if (typeof value !== 'number') {
    throw new TypeError(`${name} must be a number, received ${typeof value}`);
  }
  // Number.isInteger 는 NaN·Infinity·-Infinity·소수를 모두 false 로 처리한다.
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be a finite integer, received ${value}`);
  }
  return value;
}

/**
 * 결정론적 exponential backoff 지연(ms)을 계산한다.
 *
 * @param {{ baseDelayMs: number, attempt: number, maxDelayMs: number }} input
 *   baseDelayMs: 0 이상 정수 / attempt: 0 이상 정수 / maxDelayMs: baseDelayMs 이상 정수
 * @returns {number} 계산된 지연(ms). 항상 0 <= result <= maxDelayMs 인 안전 정수.
 * @throws {TypeError} 필드가 number 아님·NaN·Infinity·소수인 경우
 * @throws {RangeError} baseDelayMs/attempt 가 음수이거나 maxDelayMs < baseDelayMs 인 경우
 */
export function computeBackoffDelay(input) {
  if (input === null || typeof input !== 'object') {
    throw new TypeError(`input must be an object, received ${input === null ? 'null' : typeof input}`);
  }

  // 1) 타입/정수/유한성 검사 (모든 필드 먼저) — 위반 시 TypeError.
  const baseDelayMs = assertFiniteInteger('baseDelayMs', input.baseDelayMs);
  const attempt = assertFiniteInteger('attempt', input.attempt);
  const maxDelayMs = assertFiniteInteger('maxDelayMs', input.maxDelayMs);

  // 2) 범위(부호·대소 관계) 검사 — 위반 시 RangeError.
  if (baseDelayMs < 0) {
    throw new RangeError(`baseDelayMs must be >= 0, received ${baseDelayMs}`);
  }
  if (attempt < 0) {
    throw new RangeError(`attempt must be >= 0, received ${attempt}`);
  }
  if (maxDelayMs < baseDelayMs) {
    throw new RangeError(`maxDelayMs (${maxDelayMs}) must be >= baseDelayMs (${baseDelayMs})`);
  }

  // 3) 출력 계산.
  // base 가 0 이면 모든 attempt 에서 0 (huge attempt 로 2**attempt 가 Infinity 여도
  // 0 * Infinity === NaN 회귀를 방지하기 위해 명시적으로 단락한다).
  if (baseDelayMs === 0) {
    return 0;
  }

  // baseDelayMs > 0 이므로 2 ** attempt 가 Infinity 여도 곱은 Infinity 이며,
  // Math.min(maxDelayMs, Infinity) === maxDelayMs 로 안전하게 포화한다.
  const exponential = baseDelayMs * 2 ** attempt;
  return Math.min(maxDelayMs, exponential);
}
