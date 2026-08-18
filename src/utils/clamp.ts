/**
 * 숫자 클램프(clamp) 유틸 (BF-777)
 *
 * 값 n 을 [min, max] 범위로 제한한다.
 * n < min 이면 min, n > max 이면 max, 그 사이면 n 을 그대로 반환한다.
 */

/** 유한한 숫자인지 검증한다. 아니면 명시적 에러를 던진다. */
function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} 은(는) 유한한 숫자여야 합니다: ${value}`);
  }
}

/**
 * 값 n 을 [min, max] 범위로 제한한 결과를 반환한다.
 * @param n 제한할 값(유한한 숫자).
 * @param min 하한(유한한 숫자).
 * @param max 상한(유한한 숫자). min 이상이어야 한다.
 * @returns n < min 이면 min, n > max 이면 max, 그 외에는 n.
 */
export function clamp(n: number, min: number, max: number): number {
  assertFinite(n, 'n');
  assertFinite(min, 'min');
  assertFinite(max, 'max');
  if (min > max) {
    throw new RangeError(`min 은(는) max 이하여야 합니다: min=${min}, max=${max}`);
  }
  if (n < min) {
    return min;
  }
  if (n > max) {
    return max;
  }
  return n;
}
