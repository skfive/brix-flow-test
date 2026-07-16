// BF-862 · /demo/counter SPA 엔트리 (렌더·클릭·키보드 컨트롤러)
// - 기획 SSOT: docs/plan/counter-BF-859.md (§2 연산, §4 상태 흐름, §6 접근성)
// - 디자인: docs/design/counter-BF-859.md (§6 포커스/키보드, §7 dev 가이드)
// - 의존: ./counter.js (순수 로직) — 모듈 간 상호 import 없이 자기완결(기획 §0 가정 3)
// - 외부 네트워크·신규 패키지 0건 (기획 AC-06)

import { INITIAL_VALUE, increment, decrement, reset } from "./counter.js";

// ─────────── DOM 캐싱 ───────────
const $ = (id) => document.getElementById(id);
const valueEl = $("counter-value");
const btnIncrement = $("btn-increment");
const btnDecrement = $("btn-decrement");
const btnReset = $("btn-reset");

// ─────────── 상태 (기획 §4.1 — 단일 정수 값) ───────────
const state = {
  /** 현재 카운터 값 (0 이상, 기획 §2.2 0-플로어) */
  value: INITIAL_VALUE,
};

// ─────────── 렌더 (기획 §6.2 즉시 반영 — 레이아웃 이동 없이 값만 갱신) ───────────
function render() {
  valueEl.textContent = String(state.value);
}

// ─────────── 액션 (기획 §2 연산 계약 · §4.2 상태 전이) ───────────
function doIncrement() {
  state.value = increment(state.value);
  render();
}
function doDecrement() {
  state.value = decrement(state.value); // 0 미만 클램프
  render();
}
function doReset() {
  state.value = reset();
  render();
}

// ─────────── 이벤트: 버튼 클릭 (마우스 + Enter/Space 네이티브 활성화) ───────────
btnIncrement.addEventListener("click", doIncrement);
btnDecrement.addEventListener("click", doDecrement);
btnReset.addEventListener("click", doReset);

// ─────────── 전역 키보드 단축키 (기획 §6.1 — 포커스 위치 무관) ───────────
// ArrowUp=+1, ArrowDown=-1, R/r=초기화. 브라우저 기본 스크롤 방지를 위해
// 화살표 키는 preventDefault (기획 EC-07). 입력 요소 포커스 시에는 개입하지 않는다.
document.addEventListener("keydown", (e) => {
  const target = e.target;
  const tag = target?.tagName;
  const isEditable =
    tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
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

// ─────────── 부팅 (기획 §4.2 초기 로드 — 값 0 즉시 렌더) ───────────
render();
