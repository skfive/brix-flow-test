/**
 * 환경변수 검증 유틸 (BF-781)
 *
 * process.env 값을 안전하게 읽고 검증/파싱하는 헬퍼 모음.
 * 누락이나 파싱 실패는 silent 하게 넘기지 않고 명시적 에러를 던져
 * 설정 오류를 부팅 시점에 빠르게 드러낸다.
 *
 * - 빈 문자열/공백만 있는 값은 "미설정" 으로 간주한다.
 * - 모든 값은 앞뒤 공백을 trim 한 뒤 평가한다.
 */

/** name 이 비어있지 않은 문자열인지 검증한다. 아니면 TypeError 를 던진다. */
function assertValidName(name: string): void {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new TypeError(`환경변수 이름은 비어있지 않은 문자열이어야 합니다: ${String(name)}`);
  }
}

/**
 * process.env[name] 을 읽어 trim 한다.
 * 미설정이거나 공백뿐이면 undefined 를 반환한다.
 */
function readRaw(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * 필수 환경변수를 읽는다.
 * @param name 환경변수 이름.
 * @returns trim 된 값.
 * @throws {Error} 값이 미설정이거나 공백뿐일 때.
 */
export function requireEnv(name: string): string {
  assertValidName(name);
  const value = readRaw(name);
  if (value === undefined) {
    throw new Error(`필수 환경변수 ${name} 가(이) 설정되지 않았습니다`);
  }
  return value;
}

/**
 * 선택 환경변수를 읽는다.
 * @param name 환경변수 이름.
 * @param defaultValue 미설정 시 반환할 기본값. 생략 시 undefined.
 * @returns trim 된 값, 없으면 기본값(또는 undefined).
 */
export function optionalEnv(name: string, defaultValue?: string): string | undefined {
  assertValidName(name);
  const value = readRaw(name);
  return value ?? defaultValue;
}

/**
 * 환경변수를 정수로 파싱한다. (10진수, 정수만 허용)
 * @param name 환경변수 이름.
 * @param defaultValue 미설정 시 반환할 기본값. 생략 시 미설정은 에러.
 * @returns 파싱된 정수.
 * @throws {Error} 값이 미설정(기본값 없음)이거나 정수가 아닐 때.
 */
export function parseIntEnv(name: string, defaultValue?: number): number {
  assertValidName(name);
  const raw = readRaw(name);
  if (raw === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`필수 환경변수 ${name} 가(이) 설정되지 않았습니다`);
    }
    return defaultValue;
  }
  // parseInt 는 '12px' 를 12 로 받아들이는 등 느슨하므로 정규식으로 엄격 검증.
  if (!/^[+-]?\d+$/.test(raw)) {
    throw new Error(`환경변수 ${name} 는(은) 정수여야 합니다: ${raw}`);
  }
  return Number.parseInt(raw, 10);
}

const TRUE_VALUES = new Set(['true', '1']);
const FALSE_VALUES = new Set(['false', '0']);

/**
 * 환경변수를 boolean 으로 파싱한다.
 * 허용 값(대소문자 무관): true/false/1/0.
 * @param name 환경변수 이름.
 * @param defaultValue 미설정 시 반환할 기본값. 생략 시 미설정은 에러.
 * @returns 파싱된 boolean.
 * @throws {Error} 값이 미설정(기본값 없음)이거나 인식할 수 없는 값일 때.
 */
export function parseBoolEnv(name: string, defaultValue?: boolean): boolean {
  assertValidName(name);
  const raw = readRaw(name);
  if (raw === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`필수 환경변수 ${name} 가(이) 설정되지 않았습니다`);
    }
    return defaultValue;
  }
  const normalized = raw.toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }
  if (FALSE_VALUES.has(normalized)) {
    return false;
  }
  throw new Error(`환경변수 ${name} 는(은) boolean(true/false/1/0)이어야 합니다: ${raw}`);
}
