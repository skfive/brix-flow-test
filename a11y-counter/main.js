// BF-888 · a11y-counter SPA 엔트리 (렌더·클릭·키보드 컨트롤러)
// - 디자인 SSOT: docs/design/a11y-counter-BF-885.md (§6 접근성 토큰, §7 dev 가이드)
// - 원본 컨트롤러 계약 승계: src/app/demo/counter/main.js (BF-862). import 대신 전역
//   Counter(counter.js) 를 참조해 file:// 에서 <script src> 로 안전 로드(vanilla-static).
// - 브라우저 메모리(state.value)만 사용 — 네트워크·스토리지·타이머 0건(명세 AC3).
(function () {
  "use strict";

  var C = window.Counter;

  // ─────────── DOM 캐싱 ───────────
  var $ = function (id) {
    return document.getElementById(id);
  };
  var valueEl = $("counter-value");
  var btnIncrement = $("btn-increment");
  var btnDecrement = $("btn-decrement");
  var btnReset = $("btn-reset");

  // ─────────── 상태 (§5.1 — 단일 정수 값, 0-플로어) ───────────
  var state = {
    /** 현재 카운터 값 (0 이상) */
    value: C.INITIAL_VALUE,
  };

  // ─────────── 렌더 (§6.5 즉시 반영 — 레이아웃 이동 없이 값만 갱신) ───────────
  // <output aria-live="polite"> 이므로 textContent 갱신만으로 스크린리더 announce 됨.
  function render() {
    valueEl.textContent = String(state.value);
  }

  // ─────────── 액션 (§5.2/§5.3 연산 계약) ───────────
  function doIncrement() {
    state.value = C.increment(state.value);
    render();
  }
  function doDecrement() {
    state.value = C.decrement(state.value); // 0 미만 클램프
    render();
  }
  function doReset() {
    state.value = C.reset();
    render();
  }

  // ─────────── 이벤트: 버튼 클릭 (마우스 + Enter/Space 네이티브 활성화) ───────────
  btnIncrement.addEventListener("click", doIncrement);
  btnDecrement.addEventListener("click", doDecrement);
  btnReset.addEventListener("click", doReset);

  // ─────────── 전역 키보드 단축키 (§6.6 — 포커스 위치 무관) ───────────
  // ArrowUp=+1, ArrowDown=-1, R/r=초기화. 화살표 키는 기본 스크롤 방지를 위해
  // preventDefault. 입력 요소 포커스 시에는 개입하지 않는다(안전).
  document.addEventListener("keydown", function (e) {
    var target = e.target;
    var tag = target && target.tagName;
    var isEditable =
      tag === "INPUT" || tag === "TEXTAREA" || (target && target.isContentEditable);
    if (isEditable) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      doIncrement();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      doDecrement();
      return;
    }
    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      doReset();
      return;
    }
  });

  // ─────────── 부팅 (초기 로드 — 값 0 즉시 렌더) ───────────
  render();
})();
