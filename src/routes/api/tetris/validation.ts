/**
 * 요청 검증 유틸 — BF-836 (AC2)
 * planner 계약: docs/planning/tetris-BF-833.md §6
 *
 * unknown 입력을 좁혀(narrow) 필드별로 검증한다. any 를 쓰지 않는다.
 */

/** 공통 에러 코드(§6.1). */
export type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR';

/** 표준 에러 바디(§6.1). */
export interface ApiErrorBody {
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly field?: string;
  };
}

/** 핸들러 반환 형태(프레임워크 비의존). */
export interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
}

/** 검증 실패를 나타내는 에러(핸들러가 400 으로 변환). */
export class ValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/** 표준 에러 응답을 만든다. */
export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  field?: string,
): ApiResponse {
  const body: ApiErrorBody = {
    error: field === undefined ? { code, message } : { code, message, field },
  };
  return { status, body };
}

/** 값이 일반 객체(레코드)인지 좁힌다. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 닉네임 허용 패턴(§6.2): 한글/영문/숫자/공백/`_`/`-` 1~20자. */
export const PLAYER_NAME_PATTERN = /^[\p{L}\p{N} _-]{1,20}$/u;

/**
 * playerName 을 검증하고 trim 된 값을 반환한다.
 * @throws {ValidationError}
 */
export function parsePlayerName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ValidationError('playerName', 'playerName 은 문자열이어야 합니다');
  }
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 20) {
    throw new ValidationError('playerName', 'playerName 은 1~20자여야 합니다');
  }
  if (!PLAYER_NAME_PATTERN.test(trimmed)) {
    throw new ValidationError(
      'playerName',
      'playerName 은 한글/영문/숫자·공백·_·- 만 사용할 수 있습니다',
    );
  }
  return trimmed;
}

/**
 * 필드가 정수인지 검증한다. min/max 범위도 확인한다.
 * @throws {ValidationError}
 */
export function parseInteger(
  field: string,
  value: unknown,
  opts: { min?: number; max?: number } = {},
): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ValidationError(field, `${field} 은 정수여야 합니다`);
  }
  if (opts.min !== undefined && value < opts.min) {
    throw new ValidationError(field, `${field} 은 ${opts.min} 이상이어야 합니다`);
  }
  if (opts.max !== undefined && value > opts.max) {
    throw new ValidationError(field, `${field} 은 ${opts.max} 이하여야 합니다`);
  }
  return value;
}

/**
 * 선택 정수 쿼리 파라미터를 파싱한다. 문자열/숫자/undefined 를 받아
 * 정수로 변환하며, 범위를 벗어나거나 정수가 아니면 ValidationError.
 * @throws {ValidationError}
 */
export function parseIntegerQuery(
  field: string,
  value: unknown,
  fallback: number,
  opts: { min?: number; max?: number } = {},
): number {
  if (value === undefined || value === null || value === '') return fallback;
  let num: number;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    num = Number(value.trim());
  } else {
    throw new ValidationError(field, `${field} 은 정수여야 합니다`);
  }
  return parseInteger(field, num, opts);
}
