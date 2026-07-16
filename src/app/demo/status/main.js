// BF-856 · /demo/status SPA 엔트리 (fixture → DOM 1회 렌더)
// - 기획 SSOT: docs/planning/status-badge-BF-854.md (§4 렌더, §5 접근성, §6 제외 범위)
// - 디자인: docs/design/status-badge-BF-855.md (§5 컴포넌트, §6 dev 가이드)
// - 의존: ./status.js (순수 fixture·파생 로직)
// - 완전 정적: 네트워크 호출·주기 갱신·타이머·localStorage 없음 (기획 §6). 로드 시 1회만 렌더.

import {
  SERVICES,
  statusLabel,
  statusIcon,
  isKnownStatus,
  badgeAriaLabel,
  summarize,
  summarySubline,
} from "./status.js";

const $ = (id) => document.getElementById(id);

// ─────────── 테마 초기화 (auto — prefers-color-scheme 만, 토글/저장 없음) ───────────
// 디자인 §5.4: topbar 우측 컨트롤은 범위 밖(테마 토글 버튼 없음).
// 다만 dark 토큰이 사장되지 않도록 OS 선호만 반영한다(정적·읽기 전용).
function initTheme() {
  const prefersDark =
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  document.documentElement.setAttribute(
    "data-theme",
    prefersDark ? "dark" : "light",
  );
}

// ─────────── 배지 variant 클래스 (미정의 status 는 unknown 폴백, 기획 §9.3) ───────────
function badgeVariantClass(status) {
  return isKnownStatus(status)
    ? `status-badge--${status}`
    : "status-badge--unknown";
}

// ─────────── 상태 배지 요소 생성 (디자인 §5.1) ───────────
/**
 * @param {string} serviceName
 * @param {string} status
 * @returns {HTMLSpanElement}
 */
function createBadge(serviceName, status) {
  const badge = document.createElement("span");
  badge.className = `status-badge ${badgeVariantClass(status)}`;
  badge.setAttribute("role", "img");
  // 접근성 이름: "{서비스명} 상태: {라벨}" (기획 §5.1, AC-2)
  badge.setAttribute("aria-label", badgeAriaLabel(serviceName, status));

  const icon = document.createElement("span");
  icon.className = "status-badge__icon";
  icon.setAttribute("aria-hidden", "true"); // 장식 아이콘 (기획 §4.2)
  icon.textContent = statusIcon(status);

  const label = document.createElement("span");
  label.className = "status-badge__label";
  label.textContent = statusLabel(status);

  badge.append(icon, label);
  return badge;
}

// ─────────── 서비스 카드 요소 생성 (디자인 §4.3/§5.2) ───────────
/**
 * @param {{id:string,name:string,status:string,description:string}} service
 * @returns {HTMLLIElement}
 */
function createCard(service) {
  const li = document.createElement("li");
  li.className = "status-card";
  li.id = `status-card-${service.id}`;

  const head = document.createElement("div");
  head.className = "status-card__head";

  const name = document.createElement("span");
  name.className = "status-card__name";
  name.textContent = service.name;

  // DOM 순서: 서비스명 → 배지 (읽기 순서 = 시각 순서, 기획 §5.2)
  head.append(name, createBadge(service.name, service.status));

  const desc = document.createElement("p");
  desc.className = "status-card__desc";
  desc.textContent = service.description;

  li.append(head, desc);
  return li;
}

// ─────────── 요약 배너 렌더 (기획 §3.3, 디자인 §5.3/§4.4) ───────────
function renderSummary(container, services) {
  const summary = summarize(services);
  container.className = `summary-banner summary-banner--${summary.status}`;

  const icon = document.createElement("span");
  icon.className = "summary-banner__icon";
  icon.setAttribute("aria-hidden", "true"); // 장식 (기획 §5.3)
  icon.textContent = statusIcon(summary.status);

  const body = document.createElement("div");
  body.className = "summary-banner__body";

  const title = document.createElement("span");
  title.className = "summary-banner__title";
  title.textContent = summary.text;

  const sub = document.createElement("span");
  sub.className = "summary-banner__sub";
  sub.textContent = summarySubline(services);

  body.append(title, sub);
  container.replaceChildren(icon, body);
}

// ─────────── 서비스 카드 목록 렌더 (기획 §4.1) ───────────
function renderList(listEl, services) {
  const cards = services.map(createCard);
  listEl.replaceChildren(...cards);
}

// ─────────── 부팅 (로드 시 1회 렌더 — polling 없음, 기획 §6.2) ───────────
initTheme();
renderSummary($("summary-banner"), SERVICES);
renderList($("status-list"), SERVICES);
