/**
 * 전달 상태 배지 UI (BF-1254, Phase 21).
 *
 * planner frozen 계약(docs/plans/phase21-delivery-status-BF-1252.md §3·§4·§5·§6·§7)을 구현한다.
 * - 상태 모델: idle → loading → success | error (§3)
 * - DOM selector / token은 frozen 계약을 그대로 사용하며 재정의하지 않는다.
 *
 * 상태 전이는 DOM 비의존 순수 함수로 분리해 단위 테스트로 검증하고,
 * DOM 바인딩(createDeliveryStatusBadge)은 그 순수 로직을 화면에 반영하는 얇은 계층이다.
 */

import type {
  DeliveryState,
  DeliveryStatusResponseBody,
} from '../api/phase21-validation/delivery-status.ts';

export type { DeliveryState };

/** 상태별 화면 텍스트(상태명). 색상만으로 구분하지 않기 위한 접근성 텍스트(§6-3). */
export const STATE_LABELS: Readonly<Record<DeliveryState, string>> = {
  idle: '대기 중',
  loading: '조회 중',
  success: '전달 완료',
  error: '전달 상태 오류',
};

/** frozen design token(§5)을 CSS 변수로 참조. token 값 정의는 designer 소유. */
export const ACCENT_SUCCESS = 'var(--color-status-success)';
export const ACCENT_ERROR = 'var(--color-status-error)';

/** 배지의 렌더링 가능한 뷰 상태(순수 값). */
export interface BadgeView {
  state: DeliveryState;
  /** delivery-badge__label 텍스트(상태명 / 성공 시 API label / 실패 시 오류 메시지). */
  label: string;
  /** delivery-badge__timestamp 텍스트(갱신 시각, 없으면 빈 문자열). */
  timestamp: string;
  /** delivery-status-refresh control 사용 가능 여부. */
  refreshEnabled: boolean;
  /** 강조 색상 CSS 변수 참조('' = 강조 없음). */
  accent: '' | typeof ACCENT_SUCCESS | typeof ACCENT_ERROR;
}

/** error.code → 사용자 메시지(상태명) 분기(§9). */
export function mapErrorMessage(code: string): string {
  switch (code) {
    case 'delivery_status_forbidden':
      return '전달 상태 조회 권한이 없습니다.';
    case 'delivery_status_unavailable':
      return '전달 상태를 조회할 수 없습니다.';
    default:
      return '전달 상태를 조회할 수 없습니다.';
  }
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

/**
 * ISO 8601 갱신 시각을 표시 문자열로 변환한다.
 * 누락/비 ISO 8601 값은 방어적으로 빈 문자열을 반환한다(§9).
 */
export function formatUpdatedAt(iso: string | undefined | null): string {
  if (!iso) {
    return '';
  }
  const parsed = new Date(iso);
  const time = parsed.getTime();
  if (Number.isNaN(time)) {
    return '';
  }
  const y = parsed.getUTCFullYear();
  const mo = pad2(parsed.getUTCMonth() + 1);
  const d = pad2(parsed.getUTCDate());
  const h = pad2(parsed.getUTCHours());
  const mi = pad2(parsed.getUTCMinutes());
  return `${y}-${mo}-${d} ${h}:${mi} UTC`;
}

/** 최초 렌더 / 초기화·취소·실패 복귀 시의 idle 뷰(§3). */
export function initialView(): BadgeView {
  return {
    state: 'idle',
    label: STATE_LABELS.idle,
    timestamp: '',
    refreshEnabled: true,
    accent: '',
  };
}

/**
 * refresh 실행 → 응답 대기(loading). refresh를 비활성화해 중복 요청을 막고(§9 연속 클릭),
 * 마지막 갱신 시각은 보존한다.
 */
export function toLoading(prev: BadgeView): BadgeView {
  return {
    state: 'loading',
    label: STATE_LABELS.loading,
    timestamp: prev.timestamp,
    refreshEnabled: false,
    accent: '',
  };
}

/** API 응답(성공/오류)을 뷰로 변환한다. 실패 뒤에도 control을 다시 활성화한다(§3·AC-6). */
export function applyResponse(body: DeliveryStatusResponseBody): BadgeView {
  if (body.status === 'success') {
    return {
      state: 'success',
      label: body.label || STATE_LABELS.success,
      timestamp: formatUpdatedAt(body.updatedAt),
      refreshEnabled: true,
      accent: ACCENT_SUCCESS,
    };
  }
  return {
    state: 'error',
    label: mapErrorMessage(body.error.code),
    timestamp: '',
    refreshEnabled: true,
    accent: ACCENT_ERROR,
  };
}

/** 네트워크 타임아웃/중단 등 응답 자체를 받지 못한 경우(§9, AC-6). */
export function applyNetworkError(): BadgeView {
  return {
    state: 'error',
    label: '전달 상태를 조회할 수 없습니다.',
    timestamp: '',
    refreshEnabled: true,
    accent: ACCENT_ERROR,
  };
}

// ---------------------------------------------------------------------------
// DOM 바인딩(얇은 계층) — 위 순수 뷰를 frozen selector에 반영한다.
// ---------------------------------------------------------------------------

export interface DeliveryStatusFetch {
  (): Promise<DeliveryStatusResponseBody>;
}

export interface DeliveryStatusBadgeController {
  /** 상태를 재조회한다(refresh). */
  refresh: () => Promise<void>;
  /** 현재 뷰를 초기값(idle)으로 되돌린다. */
  reset: () => void;
  /** 현재 뷰 스냅샷. */
  getView: () => BadgeView;
}

/**
 * frozen DOM selector(§4)에 배지를 마운트하고 상태 전이를 화면에 반영한다.
 * root 요소 하위에 delivery-status-badge 골격을 구성한다.
 */
export function createDeliveryStatusBadge(
  root: HTMLElement,
  fetchStatus: DeliveryStatusFetch,
): DeliveryStatusBadgeController {
  const doc = root.ownerDocument;

  const badge = doc.createElement('div');
  badge.id = 'delivery-status-badge';
  badge.className = 'delivery-badge';
  badge.setAttribute('aria-live', 'polite'); // §6-1

  const label = doc.createElement('span');
  label.className = 'delivery-badge__label';

  const timestamp = doc.createElement('time');
  timestamp.id = 'delivery-status-updated-at';
  timestamp.className = 'delivery-badge__timestamp';

  const refresh = doc.createElement('button');
  refresh.id = 'delivery-status-refresh';
  refresh.className = 'delivery-badge__refresh';
  refresh.type = 'button';
  refresh.setAttribute('aria-label', '전달 상태 새로고침'); // §6-2

  badge.append(label, timestamp, refresh);
  root.append(badge);

  let view = initialView();

  const render = (): void => {
    label.textContent = view.label;
    timestamp.textContent = view.timestamp;
    if (view.timestamp) {
      timestamp.setAttribute('datetime', view.timestamp);
    } else {
      timestamp.removeAttribute('datetime');
    }
    refresh.disabled = !view.refreshEnabled;
    badge.dataset.state = view.state;
    badge.style.setProperty('--badge-accent', view.accent);
  };

  const setView = (next: BadgeView): void => {
    view = next;
    render();
  };

  const refreshAction = async (): Promise<void> => {
    if (!view.refreshEnabled) {
      return; // loading 중 중복 요청 방지(§9)
    }
    setView(toLoading(view));
    try {
      const body = await fetchStatus();
      setView(applyResponse(body));
    } catch {
      setView(applyNetworkError()); // 실패 후에도 control 재활성(AC-6)
    }
  };

  refresh.addEventListener('click', () => {
    void refreshAction();
  });

  render();

  return {
    refresh: refreshAction,
    reset: () => setView(initialView()),
    getView: () => view,
  };
}
