// BF-888 · a11y-counter 순수 카운터 로직 유틸 (vanilla-static, file:// 안전)
// - 디자인 SSOT: docs/design/a11y-counter-BF-885.md (§5.1~§5.3 연산 계약, §7 dev 가이드)
// - 원본 계약 승계: src/app/demo/counter/counter.js (BF-862) 의 0-플로어 시맨틱을
//   손실 없이 복제(명세 §0/§1.1 — 신규 값 0건). ESM import 대신 전역(Counter)으로
//   노출해 file:// 에서 <script src> 로 안전 로드(tech-stack vanilla-static).
//   · increment: value + 1 (상한 없음)
//   · decrement: Math.max(0, value - 1) (0 미만 금지 — 무음 클램프, 기획 §5.1)
//   · reset:     0 (상태 무관 항상 0, 무해한 조작)
// - DOM/네트워크/스토리지 미의존 — 브라우저 메모리만 사용(명세 AC3).
(function (global) {
  "use strict";

  /** 초기값 — 페이지 로드 시 표시되는 카운터 값 (§5.1) */
  var INITIAL_VALUE = 0;

  /**
   * +1 연산. 상한 없음.
   * @param {number} value 현재 값
   * @returns {number} value + 1
   */
  function increment(value) {
    return value + 1;
  }

  /**
   * -1 연산. 0 미만으로 내려가지 않도록 클램프(기획 §5.1 · 무음 클램프).
   * @param {number} value 현재 값
   * @returns {number} Math.max(0, value - 1)
   */
  function decrement(value) {
    return Math.max(0, value - 1);
  }

  /**
   * 초기화 연산 — 상태 무관 항상 0 반환(무해한 조작, 확인 모달 없음).
   * @returns {number} 0
   */
  function reset() {
    return INITIAL_VALUE;
  }

  global.Counter = {
    INITIAL_VALUE: INITIAL_VALUE,
    increment: increment,
    decrement: decrement,
    reset: reset,
  };
})(typeof window !== "undefined" ? window : globalThis);
