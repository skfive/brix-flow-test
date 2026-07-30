/**
 * status-card 새로고침 상태 전이 및 렌더링 로직 (BF-1261)
 *
 * ProcessFlow §3 의 상태 머신을 구현한다:
 *   idle --refresh--> loading --success--> success
 *                          \--fail-----> error --retry--> loading
 *   초기화/실패 뒤 상태·진행 표시를 복원하고 주 실행 control 을 재활성화한다.
 *
 * frozen ui-contract@v1 의 selector·상태 텍스트·class 를 그대로 사용하며 재정의하지 않는다.
 */
import type {
  StatusCardElements,
  StatusCardRefreshController,
  StatusCardRefreshOptions,
  StatusCardState,
  StatusCardStatus,
} from './index';

/** 상태별 고정 화면 텍스트(frozen UiScreenContract §5, 각 상태 고유). */
export const STATUS_TEXT: Readonly<Record<StatusCardStatus, string>> = {
  idle: '최근 상태를 확인하려면 새로고침하세요.',
  loading: '상태를 불러오는 중…',
  success: '상태를 방금 갱신했습니다.',
  error: '상태를 불러오지 못했습니다. 다시 시도해 주세요.',
};

/** loading 상태 버튼 modifier class(frozen). */
const LOADING_BUTTON_CLASS = 'status-card__refresh--loading';
/** error 상태 텍스트 modifier class(frozen). */
const ERROR_TEXT_CLASS = 'status-card__status-text--error';

/** 초기(idle) 상태 스냅샷. */
const IDLE_STATE: StatusCardState = {
  status: 'idle',
  statusText: STATUS_TEXT.idle,
  lastUpdated: null,
  retryAvailable: false,
};

/** 갱신 시각을 HH:MM:SS 로 표기한다. */
function formatUpdatedAt(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} 기준`;
}

/**
 * 새로고침 컨트롤러를 생성해 이벤트를 바인딩하고 초기 상태를 렌더한다.
 * @param elements frozen DOM ID 로 조회한 요소 집합
 * @param options refreshFn(갱신 작업)·now(시각 provider) 주입 (외부 의존 없음)
 */
export function createStatusCardRefresh(
  elements: StatusCardElements,
  options: StatusCardRefreshOptions = {},
): StatusCardRefreshController {
  const refreshFn = options.refreshFn ?? ((): Promise<void> => Promise.resolve());
  const now = options.now ?? ((): Date => new Date());

  let state: StatusCardState = IDLE_STATE;

  function render(): void {
    const { refreshButton, statusText, lastUpdated, retryAction } = elements;

    // 상태 텍스트 — 색상 외 텍스트로 상태를 노출(aria-live 영역이 낭독).
    statusText.textContent = state.statusText;
    statusText.classList.toggle(ERROR_TEXT_CLASS, state.status === 'error');
    statusText.dataset.state = state.status;

    // 주 실행 버튼 — loading 중 비활성(disabled + aria-busy) 로 중복 클릭 차단,
    // 그 외 상태에서는 재활성화(초기화·성공·실패 뒤 복원).
    const isLoading = state.status === 'loading';
    refreshButton.classList.toggle(LOADING_BUTTON_CLASS, isLoading);
    refreshButton.disabled = isLoading;
    refreshButton.setAttribute('aria-busy', String(isLoading));

    // 마지막 갱신 시각 — 값이 있을 때만 노출.
    lastUpdated.textContent = state.lastUpdated ?? '';
    lastUpdated.hidden = state.lastUpdated === null;

    // 재시도 액션 — error(retryAvailable) 일 때만 노출.
    retryAction.hidden = !state.retryAvailable;
  }

  function setState(next: StatusCardState): void {
    state = next;
    render();
  }

  async function run(): Promise<void> {
    // 이미 loading 이면 중복 실행을 차단한다(중복 클릭 방어).
    if (state.status === 'loading') return;

    // 갱신 시각은 성공 시에만 새로 찍고, 그 전까지는 직전 값을 보존한다.
    const previousUpdated = state.lastUpdated;
    setState({
      status: 'loading',
      statusText: STATUS_TEXT.loading,
      lastUpdated: previousUpdated,
      retryAvailable: false,
    });

    try {
      await refreshFn();
      setState({
        status: 'success',
        statusText: STATUS_TEXT.success,
        lastUpdated: formatUpdatedAt(now()),
        retryAvailable: false,
      });
    } catch {
      // 실패 — 진행 표시(loading)를 걷어내고 재시도 액션을 노출, control 재활성화.
      setState({
        status: 'error',
        statusText: STATUS_TEXT.error,
        lastUpdated: previousUpdated,
        retryAvailable: true,
      });
    }
  }

  const onRefreshClick = (): void => {
    void run();
  };
  const onRetryClick = (): void => {
    void run();
  };

  elements.refreshButton.addEventListener('click', onRefreshClick);
  elements.retryAction.addEventListener('click', onRetryClick);

  render();

  return {
    getState: (): StatusCardState => state,
    refresh: run,
    reset: (): void => setState(IDLE_STATE),
    destroy: (): void => {
      elements.refreshButton.removeEventListener('click', onRefreshClick);
      elements.retryAction.removeEventListener('click', onRetryClick);
    },
  };
}

/**
 * 문서에서 frozen DOM ID 로 요소를 조회해 컨트롤러를 자동 초기화한다.
 * 요소가 모두 존재할 때만 바인딩한다(부분 마크업에서 안전).
 */
function bootstrap(): void {
  const refreshButton = document.getElementById('status-card-refresh-button');
  const statusText = document.getElementById('status-card-status-text');
  const lastUpdated = document.getElementById('status-card-last-updated');
  const retryAction = document.getElementById('status-card-retry-action');

  if (
    refreshButton instanceof HTMLButtonElement &&
    statusText instanceof HTMLElement &&
    lastUpdated instanceof HTMLElement &&
    retryAction instanceof HTMLButtonElement
  ) {
    createStatusCardRefresh({ refreshButton, statusText, lastUpdated, retryAction });
  }
}

// 브라우저 환경에서만 자동 초기화한다(node 단위 테스트에서는 실행되지 않음).
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}
