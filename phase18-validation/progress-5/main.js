/* BF-906 · 진행률 체크리스트 검증 페이지(progress-5) 엔트리
 * 디자인 SSOT: docs/design/progress-5-BF-905.md §5(컴포넌트)/§6(dev 가이드)
 *
 * 의존: fixtures.js(globalThis.Progress5Fixtures) + progress.js(globalThis.Progress5Logic)
 * file:// CORS 안전(§6.1-2): IIFE — import/export·fetch·외부 CDN 0건.
 * command.js import 금지(§5). 다크 단일·테마 토글 미포함(§8.3).
 */
(function () {
  "use strict";

  /* ── 의존 모듈 ── */
  var Fixtures = globalThis.Progress5Fixtures;
  var Logic = globalThis.Progress5Logic;
  if (!Fixtures || !Logic) {
    console.error("[progress-5] fixtures.js / progress.js 가 main.js 보다 먼저 로드돼야 합니다.");
    return;
  }

  var TEXT_NO_CHECKLIST = "등록된 체크리스트 항목이 없습니다."; // §5.5

  /* ── DOM ── */
  var containerEl = document.getElementById("progress-5-checklist");
  if (!containerEl) {
    console.error("[progress-5] #progress-5-checklist 컨테이너를 찾을 수 없습니다.");
    return;
  }

  /* ── 상태 (세션 in-memory) ── */
  var state = {
    checklist: Fixtures.getChecklist() // ChecklistItem[]
  };

  /* ── helpers ── */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* 완료 시각 주입용 KST(+09:00) ISO — 순수 로직은 시계에 의존하지 않고 호출부(핸들러)만 시계를 읽는다(§6.3) */
  function nowKstIso() {
    var now = new Date();
    var kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    var pad = function (n) {
      return n < 10 ? "0" + n : String(n);
    };
    return (
      kst.getUTCFullYear() +
      "-" + pad(kst.getUTCMonth() + 1) +
      "-" + pad(kst.getUTCDate()) +
      "T" + pad(kst.getUTCHours()) +
      ":" + pad(kst.getUTCMinutes()) +
      ":" + pad(kst.getUTCSeconds()) +
      "+09:00"
    );
  }

  /* ── build (원본 command.js 마크업·ARIA 복제 · §5.2~§5.4) ── */
  function buildProgressBar(progress) {
    var track = el("div", "ic-progress");
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-valuenow", String(progress.percent));
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-label", "복구 체크리스트 진행률");

    var fill = el("div", "ic-progress__fill");
    fill.style.width = progress.percent + "%";
    track.appendChild(fill);
    return track;
  }

  function progressText(progress) {
    /* 고정 포맷(§5.3) — "N/M 완료 (P%)" */
    return progress.done + "/" + progress.total + " 완료 (" + progress.percent + "%)";
  }

  function buildChecklistItem(item) {
    var li = el("li", "ic-check");
    li.setAttribute("data-checklist-id", item.id);

    var input = document.createElement("input");
    input.type = "checkbox";
    input.id = item.id;
    input.className = "ic-check__box";
    input.setAttribute("data-checklist-id", item.id);
    input.checked = item.done;

    var label = el("label", "ic-check__label", item.text);
    label.setAttribute("for", item.id);

    li.appendChild(input);
    li.appendChild(label);

    if (item.done && item.completedAt) {
      li.appendChild(el("time", "ic-mono ic-check__at", Logic.formatShortDateTime(item.completedAt)));
    }
    return li;
  }

  /* ── 초기 렌더 ── */
  function render() {
    containerEl.innerHTML = "";

    if (state.checklist.length === 0) {
      /* §5.5 — 진행률 바를 DOM 에 만들지 않는다(0% 오인 방지) */
      containerEl.setAttribute("data-checklist-state", "no-checklist");
      containerEl.appendChild(el("p", "ic-note ic-note--dashed", TEXT_NO_CHECKLIST));
      return;
    }

    containerEl.setAttribute("data-checklist-state", "has-items");
    var progress = Logic.calculateProgress(state.checklist);
    containerEl.appendChild(buildProgressBar(progress));
    containerEl.appendChild(el("p", "ic-progress__text ic-mono", progressText(progress)));

    var list = el("ul", "ic-check-list");
    state.checklist.forEach(function (item) {
      list.appendChild(buildChecklistItem(item));
    });
    containerEl.appendChild(list);
  }

  /* ── 토글 갱신 (§6.3 — 한 함수 안에서 진행률 바·텍스트·완료시각을 동일 사이클에 갱신) ── */
  function handleToggle(itemId) {
    /* ① 새 배열 계산 */
    state.checklist = Logic.toggleItem(state.checklist, itemId, nowKstIso());
    /* ② 진행률 재계산 */
    var progress = Logic.calculateProgress(state.checklist);

    /* ③ 진행률 바 fill + aria-valuenow + 텍스트 갱신 */
    var bar = containerEl.querySelector(".ic-progress");
    if (bar) {
      bar.setAttribute("aria-valuenow", String(progress.percent));
      var fill = bar.querySelector(".ic-progress__fill");
      if (fill) fill.style.width = progress.percent + "%";
    }
    var textEl = containerEl.querySelector(".ic-progress__text");
    if (textEl) textEl.textContent = progressText(progress);

    /* ③ 해당 항목의 완료시각(<time>) DOM 갱신 (취소선·muted 는 CSS :checked 가 처리) */
    var toggled = null;
    for (var i = 0; i < state.checklist.length; i += 1) {
      if (state.checklist[i].id === itemId) {
        toggled = state.checklist[i];
        break;
      }
    }
    var li = containerEl.querySelector('.ic-check[data-checklist-id="' + itemId + '"]');
    if (li && toggled) {
      var existingTime = li.querySelector(".ic-check__at");
      if (existingTime) li.removeChild(existingTime);
      if (toggled.done && toggled.completedAt) {
        li.appendChild(el("time", "ic-mono ic-check__at", Logic.formatShortDateTime(toggled.completedAt)));
      }
    }
  }

  /* ── 이벤트 위임 (change) ── */
  containerEl.addEventListener("change", function (e) {
    var target = e.target;
    if (!target || !target.classList || !target.classList.contains("ic-check__box")) return;
    var itemId = target.getAttribute("data-checklist-id");
    if (itemId) handleToggle(itemId);
  });

  /* ── 부팅 ── */
  render();
})();
