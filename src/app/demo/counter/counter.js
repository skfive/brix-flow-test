// BF-862 · /demo/counter 순수 카운터 로직 유틸
// - 기획 SSOT: docs/plan/counter-BF-859.md (§2 연산 계약, §7.3 vanilla 재구현)
// - 계약: src/counter.ts(BF-760) 의 0-플로어 시맨틱을 동일하게 채택(기획 §0 가정 3·4)
//   · increment: value + 1 (상한 없음, 기획 §9 EC-06)
//   · decrement: Math.max(0, value - 1) (0 미만 금지 — 무음 클램프, 기획 §2.2)
//   · reset:     0
// - DOM/네트워크 미의존 — file:// 브라우저에서 <script type=module> 로 직접 로드 가능
//   (신규 빌드 도구 도입 없음, 기획 §0 가정 3)

/** 초기값 — 페이지 로드 시 표시되는 카운터 값 (기획 AC-01) */
export const INITIAL_VALUE = 0;

/**
 * +1 연산. 상한 없음(기획 §9 EC-06).
 * @param {number} value 현재 값
 * @returns {number} value + 1
 */
export function increment(value) {
  return value + 1;
}

/**
 * -1 연산. 0 미만으로 내려가지 않도록 클램프(기획 §2.2, §0 가정 4).
 * @param {number} value 현재 값
 * @returns {number} Math.max(0, value - 1)
 */
export function decrement(value) {
  return Math.max(0, value - 1);
}

/**
 * 초기화 연산 — 상태 무관 항상 0 반환(기획 AC-04, 무해한 조작).
 * @returns {number} 0
 */
export function reset() {
  return INITIAL_VALUE;
}
