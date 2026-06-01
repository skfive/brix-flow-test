/**
 * Immutable counter 유틸 (BF-760)
 *
 * 모든 연산은 기존 상태를 변경하지 않고 새 {@link Counter} 를 반환한다.
 * decrement 는 0 미만으로 내려가지 않도록 클램프하여 음수를 방지한다.
 */

/** 카운터 상태. value 는 항상 0 이상의 정수. */
export interface Counter {
  readonly value: number;
}

const MIN_VALUE = 0;
const DEFAULT_STEP = 1;

/** 0 이상의 유한한 정수인지 검증한다. 아니면 명시적 에러를 던진다. */
function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} 은(는) 유한한 숫자여야 합니다: ${value}`);
  }
  if (!Number.isInteger(value)) {
    throw new RangeError(`${label} 은(는) 정수여야 합니다: ${value}`);
  }
  if (value < MIN_VALUE) {
    throw new RangeError(`${label} 은(는) 0 이상이어야 합니다: ${value}`);
  }
}

/** 1 이상의 유한한 정수(step)인지 검증한다. 아니면 명시적 에러를 던진다. */
function assertPositiveStep(step: number): void {
  if (!Number.isFinite(step)) {
    throw new TypeError(`step 은(는) 유한한 숫자여야 합니다: ${step}`);
  }
  if (!Number.isInteger(step)) {
    throw new RangeError(`step 은(는) 정수여야 합니다: ${step}`);
  }
  if (step < DEFAULT_STEP) {
    throw new RangeError(`step 은(는) 1 이상이어야 합니다: ${step}`);
  }
}

/**
 * 새 카운터를 생성한다.
 * @param initialValue 초기값(0 이상의 정수). 기본값 0.
 */
export function createCounter(initialValue: number = MIN_VALUE): Counter {
  assertNonNegativeInteger(initialValue, 'initialValue');
  return { value: initialValue };
}

/**
 * 카운터를 step 만큼 증가시킨 새 카운터를 반환한다.
 * @param counter 원본 카운터(변경되지 않음).
 * @param step 증가량(1 이상의 정수). 기본값 1.
 */
export function increment(counter: Counter, step: number = DEFAULT_STEP): Counter {
  assertPositiveStep(step);
  return { ...counter, value: counter.value + step };
}

/**
 * 카운터를 step 만큼 감소시킨 새 카운터를 반환한다.
 * 결과가 0 미만이면 0 으로 클램프하여 음수를 방지한다.
 * @param counter 원본 카운터(변경되지 않음).
 * @param step 감소량(1 이상의 정수). 기본값 1.
 */
export function decrement(counter: Counter, step: number = DEFAULT_STEP): Counter {
  assertPositiveStep(step);
  const next = Math.max(MIN_VALUE, counter.value - step);
  return { ...counter, value: next };
}

/** 값 0 인 새 카운터를 반환한다. */
export function reset(): Counter {
  return { value: MIN_VALUE };
}
