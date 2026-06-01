/**
 * Immutable 카운터 유틸 (BF-758)
 *
 * - increment / decrement / reset 모두 원본을 변경하지 않고 새 동결 상태를 반환한다.
 * - count 는 0 미만으로 내려가지 않는다 (음수 진입 차단).
 * - 모든 수치 입력은 "유한한 0 이상 정수" 로 검증한다 (미검증 입력 금지).
 * - any 미사용 — 외부 입력은 unknown 으로 받아 narrow 한다.
 */

export interface CounterState {
  readonly count: number;
}

/**
 * 수치 입력을 "유한한 0 이상 정수" 로 검증한다.
 * - 숫자가 아니거나 NaN/Infinity 이면 TypeError
 * - 정수가 아니면 TypeError
 * - 음수이면 RangeError
 */
function assertNonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} 은(는) 유한한 숫자여야 합니다: ${String(value)}`);
  }
  if (!Number.isInteger(value)) {
    throw new TypeError(`${label} 은(는) 정수여야 합니다: ${value}`);
  }
  if (value < 0) {
    throw new RangeError(`${label} 은(는) 0 이상이어야 합니다: ${value}`);
  }
  return value;
}

/** 0 이상으로 클램프한 count 를 가진 동결 상태를 생성한다. */
function freezeState(count: number): CounterState {
  return Object.freeze({ count: Math.max(0, count) });
}

/** 초기 count(기본 0) 로 카운터 상태를 생성한다. */
export function createCounter(initial: number = 0): CounterState {
  const safeInitial = assertNonNegativeInteger(initial, '초기값');
  return freezeState(safeInitial);
}

/** by(기본 1) 만큼 증가한 새 상태를 반환한다. */
export function increment(state: CounterState, by: number = 1): CounterState {
  const amount = assertNonNegativeInteger(by, '증가량');
  return freezeState(state.count + amount);
}

/** by(기본 1) 만큼 감소한 새 상태를 반환한다. 0 미만으로는 내려가지 않는다. */
export function decrement(state: CounterState, by: number = 1): CounterState {
  const amount = assertNonNegativeInteger(by, '감소량');
  return freezeState(state.count - amount);
}

/** count 를 0 으로 되돌린 새 상태를 반환한다. */
export function reset(_state: CounterState): CounterState {
  return freezeState(0);
}
