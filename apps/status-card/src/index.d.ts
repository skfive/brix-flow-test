/**
 * status-card 새로고침 공개 타입 계약 (BF-1261)
 *
 * frozen ui-contract@v1 (BF-1259) 의 상태 모델(DataModel §6)을 그대로 선언한다.
 * selector·상태 모델·디자인 토큰은 재정의하지 않는다(additive only).
 */

/** 상태 카드가 가질 수 있는 4개 상태 (idle|loading|success|error). */
export type StatusCardStatus = 'idle' | 'loading' | 'success' | 'error';

/** DataModel §6 — StatusCardState. */
export interface StatusCardState {
  /** 현재 상태. idle/loading/success/error 4개 값만 허용. */
  readonly status: StatusCardStatus;
  /** 화면에 노출되는 상태 텍스트(색상 외 텍스트로 상태를 노출). */
  readonly statusText: string;
  /** 마지막 갱신 시각 표기 문자열. 갱신 전에는 null. */
  readonly lastUpdated: string | null;
  /** 재시도 가능 여부. status=error 일 때만 true. */
  readonly retryAvailable: boolean;
}

/** 컨트롤러가 제어하는 DOM 요소 집합(frozen DOM ID 기준). */
export interface StatusCardElements {
  /** #status-card-refresh-button — 주 실행 control. */
  readonly refreshButton: HTMLButtonElement;
  /** #status-card-status-text — 상태 텍스트 영역(aria-live="polite"). */
  readonly statusText: HTMLElement;
  /** #status-card-last-updated — 마지막 갱신 시각 표시. */
  readonly lastUpdated: HTMLElement;
  /** #status-card-retry-action — error 상태 재시도 control. */
  readonly retryAction: HTMLButtonElement;
}

/** 새로고침 동작 주입 옵션(외부 네트워크·DB 의존 없음). */
export interface StatusCardRefreshOptions {
  /** 실제 갱신 작업. resolve=성공, reject=실패. 기본값은 즉시 성공. */
  readonly refreshFn?: () => Promise<void>;
  /** 갱신 시각 provider(테스트 주입용). 기본 () => new Date(). */
  readonly now?: () => Date;
}

/** 새로고침 컨트롤러 public 인터페이스. */
export interface StatusCardRefreshController {
  /** 현재 상태 스냅샷을 반환한다. */
  getState(): StatusCardState;
  /** idle/error → loading 전이 후 성공/실패에 따라 상태를 갱신한다. */
  refresh(): Promise<void>;
  /** 상태·진행 표시를 초기값(idle)으로 되돌리고 control 을 재활성화한다. */
  reset(): void;
  /** 등록한 이벤트 핸들러를 해제한다. */
  destroy(): void;
}

/** 상태별 고정 화면 텍스트(frozen, 각 상태 고유). */
export declare const STATUS_TEXT: Readonly<Record<StatusCardStatus, string>>;

/** 컨트롤러 팩토리. */
export declare function createStatusCardRefresh(
  elements: StatusCardElements,
  options?: StatusCardRefreshOptions,
): StatusCardRefreshController;
