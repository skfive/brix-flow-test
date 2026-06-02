/**
 * 슬러그 변환 유틸 (BF-773)
 *
 * 임의의 문자열을 URL 친화적인 슬러그로 변환한다. 다음 규칙을 순서대로 적용한다:
 *   1. 소문자화
 *   2. 영숫자(a-z, 0-9)·하이픈·공백류 외 문자 제거
 *   3. 공백류(스페이스·탭·개행 등)를 하이픈으로 치환
 *   4. 연속 하이픈을 하나로 축약
 *   5. 양끝 하이픈 제거
 *
 * 비ASCII 문자(한글·악센트·이모지 등)는 영숫자가 아니므로 제거된다.
 */

/** 영숫자·하이픈·공백류 외의 문자를 찾는 패턴. 하이픈은 범위 오해를 피하려고 맨 끝에 둔다. */
const NON_SLUG_CHAR = /[^a-z0-9\s-]/g;

/** 하나 이상의 공백류 문자를 찾는 패턴. */
const WHITESPACE = /\s+/g;

/** 두 개 이상 연속된 하이픈을 찾는 패턴. */
const REPEATED_HYPHEN = /-+/g;

/** 문자열 양끝의 하이픈을 찾는 패턴. */
const EDGE_HYPHEN = /^-+|-+$/g;

/**
 * 문자열을 URL 친화적인 슬러그로 변환한다.
 *
 * @param text 변환할 원본 문자열.
 * @returns 소문자 영숫자와 하이픈으로만 이뤄진 슬러그. 유효 문자가 없으면 빈 문자열.
 * @throws {TypeError} text 가 문자열이 아니면 던진다.
 *
 * @example
 * slugify('  Hello, World!  '); // 'hello-world'
 */
export function slugify(text: string): string {
  if (typeof text !== 'string') {
    throw new TypeError(`text 은(는) 문자열이어야 합니다: ${typeof text}`);
  }

  return text
    .toLowerCase()
    .replace(NON_SLUG_CHAR, '')
    .replace(WHITESPACE, '-')
    .replace(REPEATED_HYPHEN, '-')
    .replace(EDGE_HYPHEN, '');
}
