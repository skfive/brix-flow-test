/*
 * status-card 새로고침 상태 전이 및 렌더링 로직 — 브라우저 런타임 (BF-1261)
 *
 * 이 파일은 apps/status-card/src/refresh.ts 의 타입 계약과 동일한 상태 머신을
 * 빌드 도구 없는 vanilla-static 서빙 환경에서 브라우저가 그대로 실행할 수 있도록
 * 타입 구문을 제거한 plain JavaScript 런타임이다. (refresh.ts = 타입 계약 원본,
 * refresh.js = 실제 브라우저 실행 아티팩트 — 두 파일의 로직은 항상 동일하게 유지한다.)
 *
 * ProcessFlow §3 상태 머신:
 *   idle --refresh--> loading --success--> success
 *                          \--fail-----> error --retry--> loading
 *   초기화/실패 뒤 상태·진행 표시를 복원하고 주 실행 control 을 재활성화한다.
 *
 * frozen ui-contract@v1 의 selector·상태 텍스트·class 를 그대로 사용하며 재정의하지 않는다.
 * import/export·type=module·fetch·외부 URL 없이 classic <script> 로 로드된다.
 */
(function () {
  "use strict";

  /** 상태별 고정 화면 텍스트(frozen UiScreenContract §5, 각 상태 고유). */
  var STATUS_TEXT = {
    idle: "최근 상태를 확인하려면 새로고침하세요.",
    loading: "상태를 불러오는 중…",
    success: "상태를 방금 갱신했습니다.",
    error: "상태를 불러오지 못했습니다. 다시 시도해 주세요.",
  };

  /** loading 상태 버튼 modifier class(frozen). */
  var LOADING_BUTTON_CLASS = "status-card__refresh--loading";
  /** error 상태 텍스트 modifier class(frozen). */
  var ERROR_TEXT_CLASS = "status-card__status-text--error";

  /** 초기(idle) 상태 스냅샷. */
  var IDLE_STATE = {
    status: "idle",
    statusText: STATUS_TEXT.idle,
    lastUpdated: null,
    retryAvailable: false,
  };

  /** 갱신 시각을 HH:MM:SS 로 표기한다. */
  function formatUpdatedAt(date) {
    var hh = String(date.getHours()).padStart(2, "0");
    var mm = String(date.getMinutes()).padStart(2, "0");
    var ss = String(date.getSeconds()).padStart(2, "0");
    return hh + ":" + mm + ":" + ss + " 기준";
  }

  /**
   * 새로고침 컨트롤러를 생성해 이벤트를 바인딩하고 초기 상태를 렌더한다.
   * @param {object} elements frozen DOM ID 로 조회한 요소 집합
   * @param {object} [options] refreshFn(갱신 작업)·now(시각 provider) 주입 (외부 의존 없음)
   */
  function createStatusCardRefresh(elements, options) {
    options = options || {};
    var refreshFn =
      options.refreshFn ||
      function () {
        return Promise.resolve();
      };
    var now =
      options.now ||
      function () {
        return new Date();
      };

    var state = IDLE_STATE;

    function render() {
      var refreshButton = elements.refreshButton;
      var statusText = elements.statusText;
      var lastUpdated = elements.lastUpdated;
      var retryAction = elements.retryAction;

      // 상태 텍스트 — 색상 외 텍스트로 상태를 노출(aria-live 영역이 낭독).
      statusText.textContent = state.statusText;
      statusText.classList.toggle(ERROR_TEXT_CLASS, state.status === "error");
      statusText.dataset.state = state.status;

      // 주 실행 버튼 — loading 중 비활성(disabled + aria-busy) 로 중복 클릭 차단,
      // 그 외 상태에서는 재활성화(초기화·성공·실패 뒤 복원).
      var isLoading = state.status === "loading";
      refreshButton.classList.toggle(LOADING_BUTTON_CLASS, isLoading);
      refreshButton.disabled = isLoading;
      refreshButton.setAttribute("aria-busy", String(isLoading));

      // 마지막 갱신 시각 — 값이 있을 때만 노출.
      lastUpdated.textContent = state.lastUpdated || "";
      lastUpdated.hidden = state.lastUpdated === null;

      // 재시도 액션 — error(retryAvailable) 일 때만 노출.
      retryAction.hidden = !state.retryAvailable;
    }

    function setState(next) {
      state = next;
      render();
    }

    function run() {
      // 이미 loading 이면 중복 실행을 차단한다(중복 클릭 방어).
      if (state.status === "loading") return Promise.resolve();

      // 갱신 시각은 성공 시에만 새로 찍고, 그 전까지는 직전 값을 보존한다.
      var previousUpdated = state.lastUpdated;
      setState({
        status: "loading",
        statusText: STATUS_TEXT.loading,
        lastUpdated: previousUpdated,
        retryAvailable: false,
      });

      return Promise.resolve()
        .then(function () {
          return refreshFn();
        })
        .then(function () {
          setState({
            status: "success",
            statusText: STATUS_TEXT.success,
            lastUpdated: formatUpdatedAt(now()),
            retryAvailable: false,
          });
        })
        .catch(function () {
          // 실패 — 진행 표시(loading)를 걷어내고 재시도 액션을 노출, control 재활성화.
          setState({
            status: "error",
            statusText: STATUS_TEXT.error,
            lastUpdated: previousUpdated,
            retryAvailable: true,
          });
        });
    }

    var onRefreshClick = function () {
      void run();
    };
    var onRetryClick = function () {
      void run();
    };

    elements.refreshButton.addEventListener("click", onRefreshClick);
    elements.retryAction.addEventListener("click", onRetryClick);

    render();

    return {
      getState: function () {
        return state;
      },
      refresh: run,
      reset: function () {
        setState(IDLE_STATE);
      },
      destroy: function () {
        elements.refreshButton.removeEventListener("click", onRefreshClick);
        elements.retryAction.removeEventListener("click", onRetryClick);
      },
    };
  }

  /**
   * 문서에서 frozen DOM ID 로 요소를 조회해 컨트롤러를 자동 초기화한다.
   * 요소가 모두 존재할 때만 바인딩한다(부분 마크업에서 안전).
   */
  function bootstrap() {
    var refreshButton = document.getElementById("status-card-refresh-button");
    var statusText = document.getElementById("status-card-status-text");
    var lastUpdated = document.getElementById("status-card-last-updated");
    var retryAction = document.getElementById("status-card-retry-action");

    if (
      refreshButton instanceof HTMLButtonElement &&
      statusText instanceof HTMLElement &&
      lastUpdated instanceof HTMLElement &&
      retryAction instanceof HTMLButtonElement
    ) {
      createStatusCardRefresh({
        refreshButton: refreshButton,
        statusText: statusText,
        lastUpdated: lastUpdated,
        retryAction: retryAction,
      });
    }
  }

  // 디버깅·재사용을 위해 전역으로 팩토리를 노출(선택적).
  if (typeof window !== "undefined") {
    window.StatusCardRefresh = {
      STATUS_TEXT: STATUS_TEXT,
      createStatusCardRefresh: createStatusCardRefresh,
    };
  }

  // 브라우저 환경에서만 자동 초기화한다.
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootstrap);
    } else {
      bootstrap();
    }
  }
})();
