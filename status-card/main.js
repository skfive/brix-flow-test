// BF-882 · status-card SPA 엔트리 (fixture → DOM 1회 렌더, file:// 안전)
// - 디자인: docs/design/status-card-BF-879.md (§4 레이아웃, §5 컴포넌트, §6 dev 가이드)
// - 의존: ./status.js (전역 StatusCard — fixture·파생 순수 로직)
// - 완전 정적: 네트워크 호출·주기 갱신·타이머·localStorage 없음. 로드 시 1회만 렌더.
// - DOM 바인딩 패턴은 원본 src/app/demo/status/main.js (BF-856) 답습(디자인 §6.1-2).
(function () {
  "use strict";

  var SC = window.StatusCard;

  function $(id) {
    return document.getElementById(id);
  }

  // ─── 테마 초기화 (auto — prefers-color-scheme 만, 토글/저장 없음, 디자인 §2.3/§5.4) ───
  function initTheme() {
    var mql =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    var prefersDark = mql ? mql.matches : false;
    document.documentElement.setAttribute(
      "data-theme",
      prefersDark ? "dark" : "light",
    );
  }

  // ─── 배지 variant 클래스 (미정의 status 는 unknown 폴백, 디자인 §5.1) ───
  function badgeVariantClass(status) {
    return SC.isKnownStatus(status)
      ? "status-badge--" + status
      : "status-badge--unknown";
  }

  // ─── 상태 배지 요소 생성 (디자인 §5.1) ───
  function createBadge(serviceName, status) {
    var badge = document.createElement("span");
    badge.className = "status-badge " + badgeVariantClass(status);
    badge.setAttribute("role", "img");
    // 접근성 이름: "{서비스명} 상태: {라벨}" (디자인 §5.1)
    badge.setAttribute("aria-label", SC.badgeAriaLabel(serviceName, status));

    var icon = document.createElement("span");
    icon.className = "status-badge__icon";
    icon.setAttribute("aria-hidden", "true"); // 장식 아이콘
    icon.textContent = SC.statusIcon(status);

    var label = document.createElement("span");
    label.className = "status-badge__label";
    label.textContent = SC.statusLabel(status);

    badge.append(icon, label);
    return badge;
  }

  // ─── 서비스 카드 요소 생성 (디자인 §5.2) ───
  function createCard(service) {
    var li = document.createElement("li");
    li.className = "status-card";
    li.id = "status-card-" + service.id;

    var head = document.createElement("div");
    head.className = "status-card__head";

    var name = document.createElement("span");
    name.className = "status-card__name";
    name.textContent = service.name;

    // DOM 순서: 서비스명 → 배지 (읽기 순서 = 시각 순서, 디자인 §5.2)
    head.append(name, createBadge(service.name, service.status));

    var desc = document.createElement("p");
    desc.className = "status-card__desc";
    desc.textContent = service.description;

    li.append(head, desc);
    return li;
  }

  // ─── 요약 배너 렌더 (디자인 §5.3/§4.4) ───
  function renderSummary(container, services) {
    var summary = SC.summarize(services);
    container.className = "summary-banner summary-banner--" + summary.status;

    var icon = document.createElement("span");
    icon.className = "summary-banner__icon";
    icon.setAttribute("aria-hidden", "true"); // 장식
    icon.textContent = SC.statusIcon(summary.status);

    var body = document.createElement("div");
    body.className = "summary-banner__body";

    var title = document.createElement("span");
    title.className = "summary-banner__title";
    title.textContent = summary.text;

    var sub = document.createElement("span");
    sub.className = "summary-banner__sub";
    sub.textContent = SC.summarySubline(services);

    body.append(title, sub);
    container.replaceChildren(icon, body);
  }

  // ─── 서비스 카드 목록 렌더 (디자인 §4.1) ───
  function renderList(listEl, services) {
    var cards = services.map(createCard);
    listEl.replaceChildren.apply(listEl, cards);
  }

  // ─── 부팅 (로드 시 1회 렌더 — polling 없음, 디자인 §6.2) ───
  function boot() {
    initTheme();
    renderSummary($("summary-banner"), SC.SERVICES);
    renderList($("status-list"), SC.SERVICES);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
