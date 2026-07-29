/**
 * 전달 상태 배지 UI 공개 타입 계약 (BF-1254, Phase 21).
 *
 * planner frozen 계약(docs/plans/phase21-delivery-status-BF-1252.md §3·§4)의
 * 상태 모델과 selector에 대응하는 공개 API 타입 선언이다.
 * 이 선언은 delivery-status-badge.ts 구현의 public surface를 미러링한다.
 */

import type {
  DeliveryState,
  DeliveryStatusResponseBody,
} from '../api/phase21-validation/delivery-status';

export type { DeliveryState };

/** 상태별 화면 텍스트(상태명, 접근성 이름). */
export declare const STATE_LABELS: Readonly<Record<DeliveryState, string>>;

/** frozen design token(§5) CSS 변수 참조. */
export declare const ACCENT_SUCCESS: 'var(--color-status-success)';
export declare const ACCENT_ERROR: 'var(--color-status-error)';

/** 배지의 렌더링 가능한 뷰 상태(순수 값). */
export interface BadgeView {
  state: DeliveryState;
  label: string;
  timestamp: string;
  refreshEnabled: boolean;
  accent: '' | 'var(--color-status-success)' | 'var(--color-status-error)';
}

/** error.code → 사용자 메시지(상태명) 분기. */
export declare function mapErrorMessage(code: string): string;

/** ISO 8601 갱신 시각 → 표시 문자열. 누락/비 ISO는 빈 문자열. */
export declare function formatUpdatedAt(iso: string | undefined | null): string;

/** 최초 렌더 / 초기화·취소·실패 복귀 시의 idle 뷰. */
export declare function initialView(): BadgeView;

/** refresh 실행 → loading 뷰(refresh 비활성, timestamp 보존). */
export declare function toLoading(prev: BadgeView): BadgeView;

/** API 응답(성공/오류)을 뷰로 변환한다. */
export declare function applyResponse(body: DeliveryStatusResponseBody): BadgeView;

/** 네트워크 실패 시 error 뷰(control 재활성). */
export declare function applyNetworkError(): BadgeView;

/** 상태 재조회 fetch 인터페이스. */
export interface DeliveryStatusFetch {
  (): Promise<DeliveryStatusResponseBody>;
}

/** 배지 컨트롤러. */
export interface DeliveryStatusBadgeController {
  refresh: () => Promise<void>;
  reset: () => void;
  getView: () => BadgeView;
}

/** frozen DOM selector(§4)에 배지를 마운트하고 상태 전이를 반영한다. */
export declare function createDeliveryStatusBadge(
  root: HTMLElement,
  fetchStatus: DeliveryStatusFetch,
): DeliveryStatusBadgeController;
