/**
 * GET /api/phase21-validation/delivery-status
 *
 * Phase 21 전달 상태 read-only API endpoint (BF-1254).
 * planner frozen 계약(docs/plans/phase21-delivery-status-BF-1252.md §2)을 구현한다.
 *
 * - read-only, 결정적(deterministic) 응답. 요청 파라미터에 의존하지 않고 DB 변경을 유발하지 않는다.
 * - 보존 영역(인증/Jira/GitHub webhook/credential/배포)을 변경하지 않는다.
 *   인가 결과는 기존 인가 계층이 판정한 값(`authorized`)을 그대로 전달만 한다.
 */

export type DeliveryState = 'idle' | 'loading' | 'success' | 'error';

/** UI의 delivery-status-updated-at에 표시될 갱신 시각. ISO 8601 문자열. */
export interface DeliveryStatusSuccessBody {
  status: 'success';
  state: 'success';
  updatedAt: string;
  label: string;
}

export interface DeliveryStatusErrorBody {
  status: 'error';
  state: 'error';
  updatedAt?: string;
  error: {
    code: 'delivery_status_unavailable' | 'delivery_status_forbidden';
    message: string;
  };
}

export type DeliveryStatusResponseBody =
  | DeliveryStatusSuccessBody
  | DeliveryStatusErrorBody;

export interface DeliveryStatusHttpResult {
  statusCode: number;
  body: DeliveryStatusResponseBody;
}

/** 조회 소스가 반환하는 결정적 레코드. */
export interface DeliveryStatusRecord {
  updatedAt: string;
  label: string;
}

export interface DeliveryStatusRequest {
  /** 기존 인가 계층의 판정 결과. false면 403을 그대로 전달. 기본 true. */
  authorized?: boolean;
  /** 조회 소스. 실패 시 throw하여 delivery_status_unavailable로 매핑된다. */
  source?: () => DeliveryStatusRecord;
}

/** 결정적 기본 갱신 시각(계약 §2.1 예시와 동일). DB 변경 없는 read-only 상수. */
export const DEFAULT_UPDATED_AT = '2026-07-29T12:34:56Z';
export const DEFAULT_SUCCESS_LABEL = '전달 완료';

const DEFAULT_SOURCE = (): DeliveryStatusRecord => ({
  updatedAt: DEFAULT_UPDATED_AT,
  label: DEFAULT_SUCCESS_LABEL,
});

/**
 * 전달 상태를 조회한다. read-only·결정적.
 * @returns HTTP status code와 계약(§2) 준수 응답 body.
 */
export function getDeliveryStatus(
  request: DeliveryStatusRequest = {},
): DeliveryStatusHttpResult {
  const { authorized = true, source = DEFAULT_SOURCE } = request;

  // 권한 거부(403) — 인가 계층 결과를 그대로 전달만 한다(보존 영역 미변경).
  if (!authorized) {
    return {
      statusCode: 403,
      body: {
        status: 'error',
        state: 'error',
        error: {
          code: 'delivery_status_forbidden',
          message: '전달 상태 조회 권한이 없습니다.',
        },
      },
    };
  }

  try {
    const record = source();
    return {
      statusCode: 200,
      body: {
        status: 'success',
        state: 'success',
        updatedAt: record.updatedAt,
        label: record.label,
      },
    };
  } catch {
    // 내부 조회 실패(5xx) — 안정된 오류 코드 반환.
    return {
      statusCode: 500,
      body: {
        status: 'error',
        state: 'error',
        updatedAt: DEFAULT_UPDATED_AT,
        error: {
          code: 'delivery_status_unavailable',
          message: '전달 상태를 조회할 수 없습니다.',
        },
      },
    };
  }
}
