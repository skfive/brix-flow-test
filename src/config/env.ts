/**
 * 환경변수 검증 유틸 (BF-779)
 *
 * 환경변수를 안전하게 읽고 파싱하는 4개 함수를 제공한다:
 *   - requireEnv    : 필수 변수. 없으면 변수명을 포함한 에러를 던진다.
 *   - optionalEnv   : 선택 변수. 없으면 fallback(또는 undefined)을 반환한다.
 *   - parseIntEnv   : 정수 변수. 없거나 파싱 실패 시 fallback 을 반환한다.
 *   - parseBoolEnv  : 불리언 변수. 'true'/'1' 만 true, 그 외는 false.
 *
 * 모든 함수는 env 소스를 마지막 인자로 주입받으며 기본값은 `process.env` 다.
 * 주입 가능하게 하여 테스트에서 `process.env` 를 오염시키지 않고 검증한다.
 */

/** 환경변수 소스 타입. `process.env` 호환 (값이 없을 수 있음). */
export type EnvSource = Readonly<Record<string, string | undefined>>;

/** 정수만으로 이뤄진 문자열(부호 허용)을 찾는 패턴. */
const INTEGER = /^[+-]?\d+$/;

/** 참으로 해석할 값(정규화 후 비교). */
const TRUTHY = new Set(['true', '1']);

/**
 * name 이 문자열인지 런타임에서 방어한다.
 *
 * @throws {TypeError} name 이 문자열이 아니면 던진다.
 */
function assertName(name: string): void {
  if (typeof name !== 'string') {
    throw new TypeError(`name 은(는) 문자열이어야 합니다: ${typeof name}`);
  }
}

/**
 * env 에서 값을 읽되, 누락(undefined)·공백뿐인 값은 없는 것으로 본다.
 *
 * @returns 트림한 값. 누락이거나 트림 후 빈 문자열이면 undefined.
 */
function readTrimmed(name: string, env: EnvSource): string | undefined {
  const raw = env[name];
  if (raw === undefined) {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * 필수 환경변수를 읽는다.
 *
 * @param name 환경변수 이름.
 * @param env  환경변수 소스. 기본 `process.env`.
 * @returns 트림하지 않은 원본 값.
 * @throws {TypeError} name 이 문자열이 아니면 던진다.
 * @throws {Error} 변수가 없거나 공백뿐이면 변수명을 포함해 던진다.
 *
 * @example
 * requireEnv('DATABASE_URL'); // 없으면 throw
 */
export function requireEnv(name: string, env: EnvSource = process.env): string {
  assertName(name);
  if (readTrimmed(name, env) === undefined) {
    throw new Error(`필수 환경변수 "${name}" 가(이) 설정되지 않았습니다.`);
  }
  // 존재가 확인됐으므로 원본 값을 그대로 반환한다(주변 공백 보존).
  return env[name] as string;
}

/**
 * 선택 환경변수를 읽는다. 없으면 fallback 을 반환한다.
 *
 * @param name     환경변수 이름.
 * @param fallback 값이 없을 때 반환할 기본값. 생략하면 undefined.
 * @param env      환경변수 소스. 기본 `process.env`.
 * @returns 원본 값 또는 fallback.
 * @throws {TypeError} name 이 문자열이 아니면 던진다.
 */
export function optionalEnv(
  name: string,
  fallback?: string,
  env: EnvSource = process.env,
): string | undefined {
  assertName(name);
  return readTrimmed(name, env) === undefined ? fallback : (env[name] as string);
}

/**
 * 정수 환경변수를 읽는다. 없거나 정수로 파싱할 수 없으면 fallback 을 반환한다.
 *
 * '12abc' 나 '3.14' 처럼 정수 형태가 아닌 값은 파싱 실패로 간주한다.
 *
 * @param name     환경변수 이름.
 * @param fallback 누락·파싱 실패 시 반환할 기본값.
 * @param env      환경변수 소스. 기본 `process.env`.
 * @returns 파싱한 정수 또는 fallback.
 * @throws {TypeError} name 이 문자열이 아니면 던진다.
 */
export function parseIntEnv(
  name: string,
  fallback: number,
  env: EnvSource = process.env,
): number {
  assertName(name);
  const value = readTrimmed(name, env);
  if (value === undefined || !INTEGER.test(value)) {
    return fallback;
  }
  return Number.parseInt(value, 10);
}

/**
 * 불리언 환경변수를 읽는다. 'true'/'1'(대소문자·공백 무시)만 true.
 *
 * @param name     환경변수 이름.
 * @param fallback 값이 없을 때 반환할 기본값. 생략하면 false.
 * @param env      환경변수 소스. 기본 `process.env`.
 * @returns 'true'/'1' 이면 true, 그 외 값은 false, 누락이면 fallback.
 * @throws {TypeError} name 이 문자열이 아니면 던진다.
 */
export function parseBoolEnv(
  name: string,
  fallback = false,
  env: EnvSource = process.env,
): boolean {
  assertName(name);
  const value = readTrimmed(name, env);
  if (value === undefined) {
    return fallback;
  }
  return TRUTHY.has(value.toLowerCase());
}
