/* incident-triage/triage.js — Incident Severity Triage 판정 로직 + DOM 인터랙션
 * BF-803 · 기획 docs/plan/incident-triage-BF-800.md §2.2/§4/§6 · 시안 docs/design/incident-triage-BF-800.md §5/§8
 * UMD 패턴 (기획 §6.5, number-guess/game.js 관례) — 브라우저: globalThis.IncidentTriage
 *                                                    Node: module.exports (순수 함수 단위 테스트)
 * file:// CORS 안전 — 외부 CDN·fetch·import/export·localStorage 0건
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    // Node (단위 테스트) — 순수 함수만 사용, DOM 초기화 안 함
    module.exports = api;
  }
  if (root) {
    root.IncidentTriage = api;
    // 브라우저에서만 DOM 와이어링
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", api.init);
      } else {
        api.init();
      }
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* ─── 상수 (기획 §2.2 표 그대로 — 규칙 재해석 금지) ─── */

  var SLA = {
    P1: "15분 이내",
    P2: "1시간 이내",
    P3: "4시간 이내",
    P4: "1영업일(24시간) 이내",
  };

  var NEXT_ACTION = {
    P1: "온콜 담당자에게 즉시 에스컬레이션하고 인시던트 채널을 개설하세요.",
    P2: "1시간 이내 담당 팀에 배정하고 관리자에게 통보하세요.",
    P3: "담당 팀 큐에 등록하고 4시간 이내 첫 응답을 남기세요.",
    P4: "정기 백로그에 등록하고 다음 영업일 내 검토하세요.",
  };

  /** severity 한글명 (AC-09 색 비의존 — 배지에 코드와 항상 병기) */
  var SEVERITY_NAME = { P1: "치명", P2: "높음", P3: "보통", P4: "낮음" };

  /** impact/urgency enum 한글 라벨 (기획 §4.3 요약 포맷용) */
  var LEVEL_LABEL = { high: "높음", medium: "보통", low: "낮음" };

  /**
   * 기획 §2.2 전체 조합표 (9/9) — impact × urgency → severity 중첩 lookup table.
   * 조건식으로 규칙을 재유도하지 않는다 (기획 §2.2 각주 · §6.2).
   */
  var MATRIX = {
    high: { high: "P1", medium: "P2", low: "P3" },
    medium: { high: "P2", medium: "P3", low: "P4" },
    low: { high: "P3", medium: "P4", low: "P4" },
  };

  var COPY_RESET_MS = 2000; // 기획 §4.3 고정 타이밍
  var COPY_LABEL = "요약 복사";
  var COPIED_LABEL = "✓ 복사됨";
  var COPY_ERROR_MSG = "복사에 실패했습니다. 아래 텍스트를 직접 선택해 복사하세요.";

  function isLevel(value) {
    return value === "high" || value === "medium" || value === "low";
  }

  /* ─── 순수 함수 #1: severity 판정 (기획 §6) ─── */
  /**
   * Impact × Urgency → Severity/SLA/NextAction 결정론적 판정 순수 함수.
   *
   * @param {'high'|'medium'|'low'} impact
   * @param {'high'|'medium'|'low'} urgency
   * @returns {{ severity: 'P1'|'P2'|'P3'|'P4', sla: string, nextAction: string }}
   * @throws {TypeError} enum 이 아닌 값이 오면 즉시 throw (기획 §6.1 · EC-10)
   */
  function resolveSeverity(impact, urgency) {
    if (!isLevel(impact)) {
      throw new TypeError(
        "impact 는 'high' | 'medium' | 'low' 여야 합니다: " + String(impact)
      );
    }
    if (!isLevel(urgency)) {
      throw new TypeError(
        "urgency 는 'high' | 'medium' | 'low' 여야 합니다: " + String(urgency)
      );
    }

    var severity = MATRIX[impact][urgency];
    // 매 호출마다 새 객체 반환 — 호출자가 변형해도 lookup table 이 오염되지 않는다
    return {
      severity: severity,
      sla: SLA[severity],
      nextAction: NEXT_ACTION[severity],
    };
  }

  /* ─── 순수 함수 #2: 요약 텍스트 (기획 §4.3 고정 포맷) ─── */
  /**
   * 클립보드에 복사할 요약 문자열을 만든다.
   * 포맷: [Incident Triage] 영향도: {impact} / 긴급도: {urgency} → {severity} (SLA: {sla}) — {nextAction}
   *
   * @param {'high'|'medium'|'low'} impact
   * @param {'high'|'medium'|'low'} urgency
   * @returns {string}
   * @throws {TypeError} enum 이 아닌 값이 오면 throw (resolveSeverity 와 동일 계약)
   */
  function buildSummary(impact, urgency) {
    var r = resolveSeverity(impact, urgency);
    return (
      "[Incident Triage] 영향도: " +
      LEVEL_LABEL[impact] +
      " / 긴급도: " +
      LEVEL_LABEL[urgency] +
      " → " +
      r.severity +
      " (SLA: " +
      r.sla +
      ") — " +
      r.nextAction
    );
  }

  /* ─── DOM 인터랙션 (브라우저 전용) ─── */

  /**
   * 클립보드 복사 — Clipboard API 우선, 실패 시 execCommand fallback (기획 §4.3 · EC-05/EC-06).
   * 두 경로 모두 실패해도 예외를 throw 하지 않는다 (앱 크래시 금지).
   *
   * @param {string} text
   * @param {(ok: boolean) => void} done
   */
  function copyText(text, done) {
    function fallback() {
      var ok = false;
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        // 화면 밖으로 밀어 스크롤 점프 방지
        ta.style.position = "fixed";
        ta.style.top = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch (err) {
        ok = false;
      }
      done(ok);
    }

    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      try {
        navigator.clipboard.writeText(text).then(
          function () {
            done(true);
          },
          fallback // Promise reject (file:// 등 미허용 컨텍스트) → fallback
        );
        return;
      } catch (err) {
        // writeText 가 동기 throw 하는 구형 환경
      }
    }
    fallback();
  }

  /** DOM 와이어링 — index.html 로드 후 1회 호출 */
  function init() {
    var form = document.getElementById("triage-form");
    var result = document.getElementById("result");
    var copyBtn = document.getElementById("copy-btn");
    var resetBtn = document.getElementById("reset-btn");
    if (!form || !result || !copyBtn || !resetBtn) {
      return; // 테스트/부분 로드 환경 방어
    }

    var badgeCode = document.getElementById("badge-code");
    var badgeName = document.getElementById("badge-name");
    var slaValue = document.getElementById("sla-value");
    var nextAction = document.getElementById("next-action");
    var copyError = document.getElementById("copy-error");

    /** @type {{impact: string|null, urgency: string|null}} */
    var state = { impact: null, urgency: null };
    var copyTimer = null;

    function selectedValue(name) {
      var checked = form.querySelector('input[name="' + name + '"]:checked');
      return checked ? checked.value : null;
    }

    function clearCopyFeedback() {
      if (copyTimer !== null) {
        clearTimeout(copyTimer);
        copyTimer = null;
      }
      copyBtn.classList.remove("is-copied");
      copyBtn.textContent = COPY_LABEL;
      copyError.textContent = "";
    }

    /** 상태 → 화면. data-state / data-severity 속성만 갱신 (시안 §5.1 · §8.5) */
    function render() {
      var ready = state.impact !== null && state.urgency !== null;

      if (!ready) {
        // idle(둘 다 미선택) / partial(하나만 선택) — 결과 숨김, 복사 비활성 (AC-02 · AC-03)
        result.dataset.state =
          state.impact === null && state.urgency === null ? "idle" : "partial";
        delete result.dataset.severity;
        copyBtn.disabled = true;
        clearCopyFeedback();
        return;
      }

      var r = resolveSeverity(state.impact, state.urgency); // 두 값이 모두 채워진 뒤에만 호출 (기획 §6.3)
      badgeCode.textContent = r.severity;
      badgeName.textContent = SEVERITY_NAME[r.severity];
      slaValue.textContent = r.sla;
      nextAction.textContent = r.nextAction;

      result.dataset.state = "resolved";
      result.dataset.severity = r.severity; // 색 전환은 CSS 가 담당 (시안 §5.2)
      copyBtn.disabled = false;
      clearCopyFeedback(); // 재판정 시 이전 "복사됨" 잔상 제거 (EC-04)
    }

    // 라디오 선택 — change 만 사용 (키보드 방향키 선택도 포착, 시안 §6.1)
    form.addEventListener("change", function (event) {
      var name = event.target && event.target.name;
      if (name !== "impact" && name !== "urgency") {
        return;
      }
      state[name] = selectedValue(name);
      render();
    });

    // 요약 복사 (AC-06 · EC-08 타이머 재시작)
    copyBtn.addEventListener("click", function () {
      if (state.impact === null || state.urgency === null) {
        return; // disabled 우회 방어 (EC-07 계열 no-op)
      }
      var summary = buildSummary(state.impact, state.urgency);

      copyText(summary, function (ok) {
        if (copyTimer !== null) {
          clearTimeout(copyTimer);
          copyTimer = null;
        }
        if (!ok) {
          copyError.textContent = COPY_ERROR_MSG; // EC-06 — throw 없이 안내만
          return;
        }
        copyError.textContent = "";
        copyBtn.textContent = COPIED_LABEL;
        copyBtn.classList.add("is-copied");
        copyTimer = setTimeout(function () {
          copyBtn.classList.remove("is-copied");
          copyBtn.textContent = COPY_LABEL;
          copyTimer = null;
        }, COPY_RESET_MS);
      });
    });

    // 초기화 (AC-07 · EC-07 idle 에서 눌러도 안전한 no-op)
    resetBtn.addEventListener("click", function () {
      form.reset();
      state.impact = null;
      state.urgency = null;
      render();
      var first = document.getElementById("impact-high");
      if (first) {
        first.focus(); // 영향도 첫 라디오로 포커스 이동 (기획 §4.2 · 시안 §7.4)
      }
    });

    // 새로고침 시 브라우저가 라디오 선택을 복원할 수 있으므로 실제 DOM 을 읽어 초기 상태 결정
    state.impact = selectedValue("impact");
    state.urgency = selectedValue("urgency");
    render();
  }

  return {
    resolveSeverity: resolveSeverity,
    buildSummary: buildSummary,
    init: init,
  };
});
