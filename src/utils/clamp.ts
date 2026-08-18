/**
 * 숫자 클램프 유틸 (BF-776)
 *
 * 값 n 을 [min, max] 범위 안으로 제한하는 순수 함수.
 */

/**
 * 숫자 n 을 [min, max] 범위로 클램프한다.
 *
 * - n 이 min 보다 작으면 min 을 반환한다.
 * - n 이 max 보다 크면 max 를 반환한다.
 * - min <= n <= max 이면 n 을 그대로 반환한다 (min === max 엣지 포함).
 *
 * @param n 클램프할 값.
 * @param min 하한.
 * @param max 상한.
 * @returns [min, max] 범위로 제한된 값.
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
