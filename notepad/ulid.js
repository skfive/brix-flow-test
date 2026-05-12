// BF-402 · 의존성 없는 ULID 생성기
// 26자 문자열 = 10자 시간(ms) + 16자 랜덤, Crockford base32.
// 시간 prefix 가 사전순 정렬과 시간순 정렬을 일치시킴 → 목록 최신순 정렬에 활용 가능.
// 외부 패키지 (`ulid` npm) 도입 없이 vanilla 로 충분 (단일 사용자 로컬 SPA).

export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIME_LEN = 10;
const RAND_LEN = 16;

function encodeTime(time, len) {
  let value = Math.floor(time);
  let out = "";
  for (let i = len - 1; i >= 0; i--) {
    const mod = value % 32;
    out = CROCKFORD_ALPHABET[mod] + out;
    value = Math.floor(value / 32);
  }
  return out;
}

function encodeRandom(len, rng) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CROCKFORD_ALPHABET[Math.floor(rng() * 32)];
  }
  return out;
}

/**
 * ULID 생성.
 * @param {number} [now] - epoch ms (기본 Date.now())
 * @param {() => number} [rng] - 0 이상 1 미만 난수 함수 (기본 Math.random)
 * @returns {string} 26자 ULID
 */
export function ulid(now = Date.now(), rng = Math.random) {
  return encodeTime(now, TIME_LEN) + encodeRandom(RAND_LEN, rng);
}
