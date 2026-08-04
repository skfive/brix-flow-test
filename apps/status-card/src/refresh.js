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
    // legacy(구버전 infra) — 조회는 성공했으나 uptimeSec/version 이 없는 응답.
    // success 와 구별되는 고유 상태 텍스트로 '구버전 응답'임을 화면·접근성 이름에 노출한다(frozen §5.4).
    legacy: "상태를 갱신했습니다. 구버전 응답이라 가동 시간·버전 정보가 없습니다.",
    error: "상태를 불러오지 못했습니다. 다시 시도해 주세요.",
  };

  /** loading 상태 버튼 modifier class(frozen). */
  var LOADING_BUTTON_CLASS = "status-card__refresh--loading";
  /** error 상태 텍스트 modifier class(frozen). */
  var ERROR_TEXT_CLASS = "status-card__status-text--error";

  /**
   * 확장 필드(uptimeSec/version) 부재 시 노출할 대체 텍스트(BF-1633).
   * 구버전 infra(legacy) 응답에서도 undefined/NaN 대신 상태명을 화면 텍스트로 노출한다.
   */
  var UPTIME_FALLBACK = "가동 시간 정보 없음";
  var VERSION_FALLBACK = "버전 정보 없음";

  /**
   * uptimeSec(0 이상 정수, 초)를 사람이 읽는 문자열로 포맷하는 순수 함수(BF-1633 §5.5).
   * 일/시간/분/초 단위로 환산하고, 값이 0인 상위 단위는 생략하되 최소 "초" 단위는 항상 표기한다.
   * 결정적·부작용 없음 — 시계(Date)·전역 상태·DOM 에 접근하지 않는다. 같은 입력 → 같은 출력.
   * @param {number} uptimeSec 0 이상 정수(초)
   * @returns {string} 예: 0 → "0초", 137 → "2분 17초", 3720 → "1시간 2분 0초"
   */
  function formatUptime(uptimeSec) {
    // 계약(§3)상 입력은 0 이상 정수지만, undefined/NaN 을 절대 노출하지 않도록 방어적으로 정규화한다.
    var total = Math.floor(uptimeSec);
    if (!Number.isFinite(total) || total < 0) total = 0;

    var days = Math.floor(total / 86400);
    var hours = Math.floor((total % 86400) / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    var seconds = total % 60;

    var parts = [];
    if (days > 0) parts.push(days + "일");
    if (days > 0 || hours > 0) parts.push(hours + "시간");
    if (days > 0 || hours > 0 || minutes > 0) parts.push(minutes + "분");
    parts.push(seconds + "초");
    return parts.join(" ");
  }

  /**
   * health 응답 payload 에서 uptime/version 표시 문자열을 도출하는 순수 함수(BF-1633 §5.6).
   * 두 필드가 계약(uptimeSec=정수≥0, version=비어있지 않은 문자열)을 만족하면 값을 렌더하고,
   * 하나라도 없거나 계약을 위반하면 구버전(legacy)으로 보고 대체 텍스트를 노출한다(카드 미파손).
   * @param {*} payload refreshFn 이 resolve 한 값(구버전에서는 필드 부재 또는 undefined)
   * @returns {{uptimeText: string, versionText: string, legacy: boolean}}
   */
  function deriveFieldDisplay(payload) {
    var data = payload && typeof payload === "object" ? payload : {};
    var hasUptime = Number.isInteger(data.uptimeSec) && data.uptimeSec >= 0;
    var hasVersion = typeof data.version === "string" && data.version.length > 0;
    return {
      uptimeText: hasUptime ? formatUptime(data.uptimeSec) : UPTIME_FALLBACK,
      versionText: hasVersion ? data.version : VERSION_FALLBACK,
      legacy: !hasUptime || !hasVersion,
    };
  }

  /** 초기(idle) 상태 스냅샷. */
  var IDLE_STATE = {
    status: "idle",
    statusText: STATUS_TEXT.idle,
    lastUpdated: null,
    retryAvailable: false,
    uptimeText: UPTIME_FALLBACK,
    versionText: VERSION_FALLBACK,
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

      // 확장 필드(uptime/version) 표시 영역 — 존재할 때만 렌더(구 마크업에서 안전).
      // 값이 없으면 대체 텍스트로 상태명을 노출해 undefined/NaN 을 화면에 드러내지 않는다.
      if (elements.uptime) elements.uptime.textContent = state.uptimeText;
      if (elements.version) elements.version.textContent = state.versionText;
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
      // uptime/version 표시도 로딩 중에는 직전 값을 유지해 깜빡임을 막는다.
      var previousUptime = state.uptimeText;
      var previousVersion = state.versionText;
      setState({
        status: "loading",
        statusText: STATUS_TEXT.loading,
        lastUpdated: previousUpdated,
        retryAvailable: false,
        uptimeText: previousUptime,
        versionText: previousVersion,
      });

      return Promise.resolve()
        .then(function () {
          return refreshFn();
        })
        .then(function (payload) {
          // 조회 성공 응답에서 uptimeSec/version 을 소비한다. 두 필드가 계약을 만족하면 success,
          // 하나라도 없으면(구버전 infra) deriveFieldDisplay 의 legacy 플래그를 소비해 별도 legacy
          // 상태로 전이한다(frozen §5.4 — 카드를 깨뜨리지 않고 status 만 표시, uptime/version 은 대체 텍스트).
          var fields = deriveFieldDisplay(payload);
          var resolvedStatus = fields.legacy ? "legacy" : "success";
          setState({
            status: resolvedStatus,
            statusText: STATUS_TEXT[resolvedStatus],
            lastUpdated: formatUpdatedAt(now()),
            retryAvailable: false,
            uptimeText: fields.uptimeText,
            versionText: fields.versionText,
          });
        })
        .catch(function () {
          // 실패 — 진행 표시(loading)를 걷어내고 재시도 액션을 노출, control 재활성화.
          // uptime/version 은 초기 대체 텍스트로 되돌려 오래된 값을 남기지 않는다.
          setState({
            status: "error",
            statusText: STATUS_TEXT.error,
            lastUpdated: previousUpdated,
            retryAvailable: true,
            uptimeText: UPTIME_FALLBACK,
            versionText: VERSION_FALLBACK,
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
    // 확장 필드 표시 영역(BF-1633) — 부재해도 안전하도록 선택적으로 조회한다.
    var uptime = document.getElementById("status-card-uptime");
    var version = document.getElementById("status-card-version");

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
        uptime: uptime instanceof HTMLElement ? uptime : null,
        version: version instanceof HTMLElement ? version : null,
      });
    }
  }

  // 디버깅·재사용·단위 테스트를 위해 순수 API 를 전역으로 노출한다.
  // 브라우저에서는 globalThis === window 라 기존 window.StatusCardRefresh 접근이 그대로 동작하고,
  // node --test(ESM side-effect import)에서는 globalThis 로 순수 함수를 검증한다.
  var StatusCardRefreshApi = {
    STATUS_TEXT: STATUS_TEXT,
    formatUptime: formatUptime,
    deriveFieldDisplay: deriveFieldDisplay,
    createStatusCardRefresh: createStatusCardRefresh,
  };
  if (typeof globalThis !== "undefined") {
    globalThis.StatusCardRefresh = StatusCardRefreshApi;
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
