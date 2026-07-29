// BF-1229 · delivery-status 배지 공개 타입 계약 (frozen ui-contract@v1)
// 이 선언은 badge.ts 구현의 공개 표면을 계약으로 고정한다.
// selector/token/상태 텍스트는 frozen blueprint 를 그대로 따르며 재정의하지 않는다.

/** 배지 상태 모델 (frozen states) */
export type DeliveryStatusState = 'loading' | 'success' | 'error' | 'forbidden';

/** 성공 응답 페이로드 — updatedAt 은 ISO 8601 고정 */
export interface DeliveryStatusData {
  readonly status: string;
  readonly label: string;
  readonly updatedAt: string;
}

/** fetch 결과를 상태로 매핑한 판별 유니온 */
export type DeliveryStatusResult =
  | { readonly kind: 'success'; readonly data: DeliveryStatusData }
  | { readonly kind: 'error' }
  | { readonly kind: 'forbidden' };

/** 텍스트/속성만 조작하는 최소 요소 계약 (DOM Element 호환) */
export interface BadgeElement {
  textContent: string | null;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
}

/** 새로고침 control 요소 계약 (DOM HTMLButtonElement 호환) */
export interface BadgeControl extends BadgeElement {
  disabled: boolean;
  addEventListener(type: string, handler: () => void): void;
}

/**
 * frozen selector 로 조회한 배지 요소 집합.
 * root=#delivery-status-badge, refresh=#delivery-status-refresh,
 * label=.delivery-status__label, timestamp=.delivery-status__timestamp
 */
export interface DeliveryStatusElements {
  root: BadgeElement;
  label: BadgeElement;
  timestamp: BadgeElement;
  refresh: BadgeControl;
}

/** 배지 생성 옵션 (요소·fetch 주입) */
export interface DeliveryStatusBadgeOptions {
  elements: DeliveryStatusElements;
  fetchStatus: () => Promise<DeliveryStatusResult>;
}

/** 생성된 배지 인스턴스 */
export interface DeliveryStatusBadge {
  refresh(): Promise<void>;
  getState(): DeliveryStatusState;
}

/** mount 헬퍼: contract selector 로 요소를 조회하기 위한 document 계약 */
export interface BadgeDocument {
  getElementById(id: string): (BadgeElement & Partial<BadgeControl> & {
    querySelector?(selector: string): BadgeElement | null;
  }) | null;
}

/** mount 옵션: 직접 elements 를 넘기거나 document 로 selector 조회 */
export type MountOptions =
  | { elements: DeliveryStatusElements; fetchStatus: () => Promise<DeliveryStatusResult> }
  | { document: BadgeDocument; fetchStatus: () => Promise<DeliveryStatusResult> };

/** mount 결과: 초기 로드(ready)/최근 갱신(pending) 프라미스 포함 */
export interface MountedDeliveryStatusBadge extends DeliveryStatusBadge {
  ready: Promise<void>;
  pending: Promise<void>;
}

/** HTTP 요청 매핑 옵션 */
export interface RequestDeliveryStatusOptions {
  fetchImpl?: (input: string, init?: unknown) => Promise<{
    status: number;
    ok: boolean;
    json: () => Promise<unknown>;
  }>;
  url?: string;
}

export function createDeliveryStatusBadge(
  options: DeliveryStatusBadgeOptions,
): DeliveryStatusBadge;

export function mountDeliveryStatusBadge(
  options: MountOptions,
): MountedDeliveryStatusBadge;

export function requestDeliveryStatus(
  options?: RequestDeliveryStatusOptions,
): Promise<DeliveryStatusResult>;
