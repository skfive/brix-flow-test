// BF-1229 · delivery-status 전달 상태 배지 UI 구현 (frozen ui-contract@v1)
// vanilla-static(ESM) + node 네이티브 타입 스트리핑. jsdom 미사용 — 요소/ fetch 주입으로 격리.
// selector/상태 텍스트/token 은 frozen blueprint 를 그대로 따르며 재정의하지 않는다.

export type DeliveryStatusState = 'loading' | 'success' | 'error' | 'forbidden';

export interface DeliveryStatusData {
  readonly status: string;
  readonly label: string;
  readonly updatedAt: string;
}

export type DeliveryStatusResult =
  | { readonly kind: 'success'; readonly data: DeliveryStatusData }
  | { readonly kind: 'error' }
  | { readonly kind: 'forbidden' };

export interface BadgeElement {
  textContent: string | null;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
}

export interface BadgeControl extends BadgeElement {
  disabled: boolean;
  addEventListener(type: string, handler: () => void): void;
}

export interface DeliveryStatusElements {
  root: BadgeElement;
  label: BadgeElement;
  timestamp: BadgeElement;
  refresh: BadgeControl;
}

export interface DeliveryStatusBadgeOptions {
  elements: DeliveryStatusElements;
  fetchStatus: () => Promise<DeliveryStatusResult>;
}

export interface DeliveryStatusBadge {
  refresh(): Promise<void>;
  getState(): DeliveryStatusState;
}

export interface MountedDeliveryStatusBadge extends DeliveryStatusBadge {
  ready: Promise<void>;
  pending: Promise<void>;
}

// ── frozen 상태 텍스트 (blueprint 그대로) ────────────────────────────
export const LOADING_TEXT = '전달 상태 확인 중…';
export const ERROR_TEXT = '전달 상태를 불러오지 못했습니다';
export const FORBIDDEN_TEXT = '전달 상태 접근 권한이 없습니다';
export const REFRESH_ARIA_LABEL = '전달 상태 새로고침';

/**
 * 전달 상태 배지 생성. 생성 즉시 loading UI 로 초기화(AC-1)하고,
 * root 에 aria-live=polite, refresh 에 aria-label 을 배선한다(AC-6).
 * 실제 조회는 refresh() 호출로 시작한다.
 */
export function createDeliveryStatusBadge(
  options: DeliveryStatusBadgeOptions,
): DeliveryStatusBadge {
  const { elements, fetchStatus } = options;
  const { root, label, timestamp, refresh } = elements;

  let state: DeliveryStatusState = 'loading';
  let lastData: DeliveryStatusData | null = null;
  // 진행 중 요청 토큰 — 뒤늦게 resolve 되는 이전 요청이 최신 상태를 덮지 않도록 한다(취소 시맨틱).
  let requestToken = 0;

  // 접근성 배선 (색상 외 상태명 텍스트 + aria-live 알림)
  root.setAttribute('aria-live', 'polite');
  refresh.setAttribute('aria-label', REFRESH_ARIA_LABEL);

  function enterLoading(): void {
    state = 'loading';
    label.textContent = LOADING_TEXT;
    refresh.disabled = true;
  }

  function applySuccess(data: DeliveryStatusData): void {
    lastData = data;
    state = 'success';
    label.textContent = data.label;
    timestamp.textContent = data.updatedAt;
    refresh.disabled = false;
  }

  function applyError(): void {
    state = 'error';
    label.textContent = ERROR_TEXT;
    // 이전 상태 복원: 마지막 성공 갱신 시각을 유지한다.
    if (lastData) timestamp.textContent = lastData.updatedAt;
    refresh.disabled = false;
  }

  function applyForbidden(): void {
    state = 'forbidden';
    label.textContent = FORBIDDEN_TEXT;
    refresh.disabled = false;
  }

  // 초기 렌더: loading + control 비활성 (AC-1)
  enterLoading();

  async function refreshFn(): Promise<void> {
    const token = ++requestToken;
    enterLoading();
    let result: DeliveryStatusResult;
    try {
      result = await fetchStatus();
    } catch {
      result = { kind: 'error' };
    }
    // 최신 요청이 아니면 결과 폐기 (진행 중 새 요청이 우선)
    if (token !== requestToken) return;
    if (result.kind === 'success') applySuccess(result.data);
    else if (result.kind === 'forbidden') applyForbidden();
    else applyError();
  }

  return {
    refresh: refreshFn,
    getState: () => state,
  };
}

interface MountWithElements {
  elements: DeliveryStatusElements;
  fetchStatus: () => Promise<DeliveryStatusResult>;
}

interface BadgeDocumentLike {
  getElementById(id: string): unknown;
}

interface MountWithDocument {
  document: BadgeDocumentLike;
  fetchStatus: () => Promise<DeliveryStatusResult>;
}

export type MountOptions = MountWithElements | MountWithDocument;

function resolveElements(options: MountOptions): DeliveryStatusElements {
  if ('elements' in options) return options.elements;
  const doc = options.document;
  const root = doc.getElementById('delivery-status-badge') as
    | (BadgeElement & { querySelector(selector: string): BadgeElement | null })
    | null;
  const refresh = doc.getElementById('delivery-status-refresh') as BadgeControl | null;
  if (!root || !refresh) {
    throw new Error('delivery-status: 필수 배지 요소(root/refresh)를 찾을 수 없습니다');
  }
  const label = root.querySelector('.delivery-status__label');
  const timestamp = root.querySelector('.delivery-status__timestamp');
  if (!label || !timestamp) {
    throw new Error('delivery-status: 라벨/갱신 시각 요소를 찾을 수 없습니다');
  }
  return { root, label, timestamp, refresh };
}

/**
 * 배지를 마운트한다. contract selector 로 요소를 조회(또는 주입)하고,
 * 새로고침 control 클릭에 refresh 를 배선(AC-5)한 뒤 초기 조회를 시작한다.
 * ready: 초기 조회 완료 프라미스, pending: 가장 최근 조회 프라미스.
 */
export function mountDeliveryStatusBadge(
  options: MountOptions,
): MountedDeliveryStatusBadge {
  const elements = resolveElements(options);
  const badge = createDeliveryStatusBadge({
    elements,
    fetchStatus: options.fetchStatus,
  });

  let pending: Promise<void> = Promise.resolve();
  const runRefresh = (): Promise<void> => {
    pending = badge.refresh();
    return pending;
  };

  // 새로고침 control: 클릭으로 재조회 (native button 은 Enter/Space 로 click 발화 → AC-5/AC-6)
  elements.refresh.addEventListener('click', () => {
    void runRefresh();
  });

  const ready = runRefresh();

  return {
    refresh: badge.refresh,
    getState: badge.getState,
    ready,
    get pending() {
      return pending;
    },
  };
}

export interface RequestDeliveryStatusOptions {
  fetchImpl?: (
    input: string,
    init?: unknown,
  ) => Promise<{ status: number; ok: boolean; json: () => Promise<unknown> }>;
  url?: string;
}

const DEFAULT_URL = '/api/phase21-validation/delivery-status';

function isDeliveryStatusData(value: unknown): value is DeliveryStatusData {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.status === 'string' &&
    typeof record.label === 'string' &&
    typeof record.updatedAt === 'string'
  );
}

/**
 * delivery-status API 를 호출해 HTTP 상태를 배지 result 로 매핑한다.
 * 200→success, 403→forbidden, 그 외/네트워크 오류→error.
 */
export async function requestDeliveryStatus(
  options: RequestDeliveryStatusOptions = {},
): Promise<DeliveryStatusResult> {
  const fetchImpl =
    options.fetchImpl ??
    (typeof globalThis.fetch === 'function'
      ? (globalThis.fetch.bind(globalThis) as RequestDeliveryStatusOptions['fetchImpl'])
      : undefined);
  if (!fetchImpl) return { kind: 'error' };

  try {
    const response = await fetchImpl(options.url ?? DEFAULT_URL);
    if (response.status === 403) return { kind: 'forbidden' };
    if (response.status === 200 && response.ok) {
      const body = await response.json();
      if (isDeliveryStatusData(body)) return { kind: 'success', data: body };
      return { kind: 'error' };
    }
    return { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}
