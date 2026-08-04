// judge.js — 숫자 맞히기 판정 순수함수 (docs/plans/number-guess-plan-BF-1594.md §4, frozen)
//
// 이 파일은 브라우저에서 file:// 로 열릴 때 plain <script> 로 로드된다. file:// 에서는
// ES module(import/export) fetch 가 CORS 로 차단되므로 export 를 쓰지 않고, 판정 함수를
// globalThis 에 노출한다. 그러면 브라우저(window.judge)와 node --test(globalThis.judge)
// 양쪽에서 동일한 단일 순수함수를 공유할 수 있다 — 로직 중복 없음.
(function (root) {
  'use strict';

  // @param {number} guess  - 정규화된 정수 추측 (검증은 호출부 game.js 책임)
  // @param {number} answer - 비밀 정답 정수
  // @returns {'too-high' | 'too-low' | 'win'}
  function judge(guess, answer) {
    if (guess > answer) return 'too-high';
    if (guess < answer) return 'too-low';
    return 'win';
  }

  root.judge = judge;
})(typeof globalThis !== 'undefined' ? globalThis : this);
