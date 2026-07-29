// BF-1229 · GET /api/phase21-validation/delivery-status read-only API (frozen delivery-status endpoint)
// 프레임워크 비의존 순수 핸들러: 파싱된 요청 + 주입 loader 를 받아 { status, body } 를 반환한다.
// 기존 인증·webhook 경로는 건드리지 않으며, 권한 판정은 상위 계층이 authorized 로 전달한다.

export interface DeliveryStatusPayload {
  readonly status: string;
  readonly label: string;
  readonly updatedAt: string;
}

export interface DeliveryStatusErrorBody {
  readonly error: string;
  readonly message: string;
}

export interface DeliveryStatusRequest {
  /** HTTP method — read-only 이므로 GET 만 허용 */
  readonly method: string;
  /** 상위 인증 계층이 판정한 접근 권한 */
  readonly authorized?: boolean;
}

export interface DeliveryStatusRouteDeps {
  /** 전달 상태 스냅샷 로더 (미주입 시 기본 스냅샷) */
  loadDeliveryStatus?: () => DeliveryStatusPayload;
  /** 기본 loader 의 갱신 시각 산출 (테스트 결정성용) */
  now?: () => Date;
}

export interface DeliveryStatusRouteResult {
  readonly status: number;
  readonly body: DeliveryStatusPayload | DeliveryStatusErrorBody;
}

// frozen 오류/텍스트 계약
const FORBIDDEN_MESSAGE = '전달 상태 접근 권한이 없습니다';
const UNAVAILABLE_MESSAGE = '전달 상태를 불러오지 못했습니다';

// ISO 8601 (date-time) 검증 — 형식 + 파싱 가능 여부 이중 확인
const ISO_8601 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function isIso8601(value: string): boolean {
  return ISO_8601.test(value) && !Number.isNaN(Date.parse(value));
}

function isValidPayload(value: unknown): value is DeliveryStatusPayload {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.status === 'string' &&
    record.status.length > 0 &&
    typeof record.label === 'string' &&
    record.label.length > 0 &&
    typeof record.updatedAt === 'string' &&
    isIso8601(record.updatedAt)
  );
}

/** 데이터 소스 미주입 시 기본 전달 상태 스냅샷 (read-only) */
function defaultLoadDeliveryStatus(now: () => Date): DeliveryStatusPayload {
  return {
    status: 'delivered',
    label: '전달 완료',
    updatedAt: now().toISOString(),
  };
}

/**
 * GET /api/phase21-validation/delivery-status 핸들러.
 * - GET 아님 → 405 method_not_allowed (안정된 오류 코드)
 * - 권한 없음 → 403 forbidden
 * - loader 실패/비 ISO8601 → 503 delivery_status_unavailable
 * - 정상 → 200 { status, label, updatedAt(ISO 8601) }
 */
export function handleDeliveryStatusRequest(
  request: DeliveryStatusRequest,
  deps: DeliveryStatusRouteDeps = {},
): DeliveryStatusRouteResult {
  if (request.method !== 'GET') {
    return {
      status: 405,
      body: {
        error: 'method_not_allowed',
        message: 'GET 메서드만 허용됩니다',
      },
    };
  }

  if (request.authorized === false) {
    return {
      status: 403,
      body: { error: 'forbidden', message: FORBIDDEN_MESSAGE },
    };
  }

  const now = deps.now ?? (() => new Date());
  const loader = deps.loadDeliveryStatus ?? (() => defaultLoadDeliveryStatus(now));

  let payload: DeliveryStatusPayload;
  try {
    payload = loader();
  } catch {
    return {
      status: 503,
      body: { error: 'delivery_status_unavailable', message: UNAVAILABLE_MESSAGE },
    };
  }

  if (!isValidPayload(payload)) {
    return {
      status: 503,
      body: { error: 'delivery_status_unavailable', message: UNAVAILABLE_MESSAGE },
    };
  }

  return {
    status: 200,
    body: {
      status: payload.status,
      label: payload.label,
      updatedAt: payload.updatedAt,
    },
  };
}
