// BF-894 · 세계시계 clock-3 — DOM 바인딩 + 단일 tick 루프 (vanilla-static, file:// 안전)
// - 계약: docs/planning/clock-3-BF-891.md (§6 단일 Date 원천 → 3개 지역 투영)
// - 디자인: docs/design/clock-3-BF-891.md (§6.4 요소별 갱신, §6.3 마크업 골격)
//
// 순수 로직은 regions.js(전역 Clock3)에 위임. 여기서는 DOM 갱신·테마·타이머만 담당.
// import/export·<script type="module"> 미사용(file:// CORS 안전).
(function (global) {
  "use strict";

  var Clock3 = global.Clock3;
  var THEME_KEY = "bf-theme";

  function $(id) {
    return document.getElementById(id);
  }

  // ─────────── 테마 (라이트 default) ───────────
  var btnTheme = $("btn-theme");

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (btnTheme) {
      btnTheme.textContent = theme === "dark" ? "☀️" : "🌙";
      btnTheme.setAttribute(
        "aria-label",
        theme === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환",
      );
    }
  }

  function toggleTheme() {
    var next = getTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (_e) {
      // localStorage 사용 불가 — 영속성만 포기, 전환 UX 는 유지
    }
  }

  // ─────────── 시각 렌더 ───────────
  // REGIONS 기준 포매터 3개를 로드 시 1회 생성해 재사용(planner §6.3).
  var regions = Clock3.createRegionFormatters();

  // 지역별 갱신 대상 DOM 노드를 1회 조회해 캐시.
  var nodes = regions.map(function (region) {
    return {
      region: region,
      dateEl: $("clock-" + region.id + "-date"),
      hEl: $("clock-" + region.id + "-h"),
      mEl: $("clock-" + region.id + "-m"),
      sEl: $("clock-" + region.id + "-s"),
    };
  });

  function setText(el, value) {
    // 불필요한 DOM 쓰기 방지(초 단위 갱신 시 흔들림/리플로우 최소화).
    if (el && el.textContent !== value) {
      el.textContent = value;
    }
  }

  function tick() {
    // 매 tick 마다 new Date() 를 정확히 1회 호출 → 3개 지역에 동일 인스턴스 투영(§6.2).
    var now = new Date();
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var v = Clock3.formatWith(node.region.formatter, now);
      setText(node.dateEl, v.date);
      setText(node.hEl, v.hh);
      setText(node.mEl, v.mm);
      setText(node.sEl, v.ss);
    }
  }

  // ─────────── 초기화 ───────────
  applyTheme(getTheme());
  if (btnTheme) {
    btnTheme.addEventListener("click", toggleTheme);
  }

  tick(); // placeholder 마크업을 즉시 실제 값으로 교체
  var timerId = setInterval(tick, 1000); // 1초 주기 단일 타이머(§6.1)

  // 탭 종료/이탈 시 타이머 정리(누수 방지).
  window.addEventListener("beforeunload", function () {
    clearInterval(timerId);
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
