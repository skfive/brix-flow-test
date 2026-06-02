/**
 * slugify 유틸 (BF-771)
 *
 * 임의의 문자열을 URL-friendly 슬러그로 변환한다. 변환 규칙은 다음 순서로 적용된다.
 *   1. 소문자화
 *   2. 영숫자·공백·하이픈 외 문자 제거 (유니코드 등 비 ASCII 포함)
 *   3. 공백(연속 포함)을 단일 하이픈으로 치환
 *   4. 연속 하이픈을 단일 하이픈으로 축약
 *   5. 양끝 하이픈 제거
 *
 * 입력을 변경하지 않고 항상 새 문자열을 반환한다.
 */

/** 슬러그에 허용되는 문자(소문자 영숫자, 공백, 하이픈) 외를 매칭하는 패턴. */
const DISALLOWED_CHARS = /[^a-z0-9\s-]/g;

/** 하나 이상의 공백 문자를 매칭하는 패턴. */
const WHITESPACE = /\s+/g;

/** 둘 이상의 연속 하이픈을 매칭하는 패턴. */
const REPEATED_HYPHENS = /-+/g;

/** 문자열 양끝의 하이픈을 매칭하는 패턴. */
const EDGE_HYPHENS = /^-+|-+$/g;

/**
 * 문자열을 URL-friendly 슬러그로 변환한다.
 *
 * @param text 변환할 원본 문자열.
 * @returns 소문자 영숫자와 하이픈으로만 구성된 슬러그. 변환 결과가 없으면 빈 문자열.
 * @throws {TypeError} text 가 문자열이 아니면 던진다.
 */
export function slugify(text: string): string {
  if (typeof text !== 'string') {
    throw new TypeError(`text 은(는) 문자열이어야 합니다: ${String(text)}`);
  }

  return text
    .toLowerCase()
    .replace(DISALLOWED_CHARS, '')
    .replace(WHITESPACE, '-')
    .replace(REPEATED_HYPHENS, '-')
    .replace(EDGE_HYPHENS, '');
}
