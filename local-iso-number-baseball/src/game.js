// 숫자 야구(number baseball) 순수 게임 로직 — DOM 비의존 ESM 모듈.
// 렌더링과 분리된 순수 함수로 구성해 tests/game.test.js에서 결정적으로 단위 테스트한다.

/** 한 게임의 최대 시도 횟수. */
export const MAX_ATTEMPTS = 9;

/** 정답/추측을 이루는 자릿수. */
export const DIGITS_COUNT = 3;

/**
 * 서로 다른 세 자리 숫자(1–9) 배열을 생성한다.
 * 앞자리 0으로 인한 자릿수 모호성을 피하려 0을 제외한다.
 * @param {() => number} rng [0, 1) 범위 float 반환 (기본값 Math.random) — 주입해 테스트에서 결정적으로 만든다.
 * @returns {number[]} 예: [3, 7, 1]
 */
export function generateSecret(rng = Math.random) {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const secret = [];
  for (let i = 0; i < DIGITS_COUNT; i += 1) {
    const index = Math.floor(rng() * pool.length);
    secret.push(pool[index]);
    pool.splice(index, 1);
  }
  return secret;
}

/**
 * 추측을 정답과 비교해 스트라이크/볼/아웃을 채점한다. 순수 함수.
 * - strike: 숫자와 위치가 모두 일치
 * - ball: 숫자는 정답에 있으나 위치가 다름
 * - out: strike·ball 모두 0
 * @param {number[]} secret
 * @param {number[]} guess
 * @returns {{ strikes: number, balls: number, out: boolean }}
 */
export function scoreGuess(secret, guess) {
  let strikes = 0;
  let balls = 0;
  for (let i = 0; i < guess.length; i += 1) {
    if (guess[i] === secret[i]) {
      strikes += 1;
    } else if (secret.includes(guess[i])) {
      balls += 1;
    }
  }
  return { strikes, balls, out: strikes === 0 && balls === 0 };
}

/**
 * 입력 문자열이 유효한 추측(서로 다른 세 자리, 1–9)인지 검증한다.
 * @param {string} input
 * @returns {{ valid: boolean, digits?: number[], error?: string }}
 */
export function validateGuess(input) {
  const trimmed = String(input ?? '').trim();
  if (trimmed.length === 0) {
    return { valid: false, error: '세 자리 숫자를 입력하세요.' };
  }
  if (!/^\d{3}$/.test(trimmed)) {
    return { valid: false, error: '1~9 사이 세 자리 숫자를 입력하세요.' };
  }
  const digits = trimmed.split('').map(Number);
  if (digits.some((digit) => digit === 0)) {
    return { valid: false, error: '0은 사용할 수 없습니다. 1~9 숫자만 입력하세요.' };
  }
  if (new Set(digits).size !== DIGITS_COUNT) {
    return { valid: false, error: '세 자리는 서로 다른 숫자여야 합니다.' };
  }
  return { valid: true, digits };
}

/**
 * 정답 생성·채점·시도 관리를 조합한 게임 상태 팩토리.
 * DOM에 의존하지 않으므로 UI 핸들러(index.html)와 테스트가 동일하게 사용한다.
 * @param {{ rng?: () => number, maxAttempts?: number }} [options]
 */
export function createGame({ rng = Math.random, maxAttempts = MAX_ATTEMPTS } = {}) {
  let secret = generateSecret(rng);
  let attemptsUsed = 0;
  /** @type {'playing' | 'win' | 'lose'} */
  let state = 'playing';

  /**
   * 추측을 제출한다. 유효하지 않으면 시도를 소모하지 않고 error를 돌려준다.
   * @param {string} input
   */
  function submit(input) {
    if (state !== 'playing') {
      return { state, attemptsUsed, error: '게임이 종료되었습니다. 재시작하세요.' };
    }
    const validation = validateGuess(input);
    if (!validation.valid) {
      return { state, attemptsUsed, error: validation.error };
    }
    const { strikes, balls, out } = scoreGuess(secret, validation.digits);
    attemptsUsed += 1;
    if (strikes === DIGITS_COUNT) {
      state = 'win';
    } else if (attemptsUsed >= maxAttempts) {
      state = 'lose';
    }
    return { state, strikes, balls, out, attemptsUsed };
  }

  /** 정답을 새로 뽑고 상태·시도를 초기값으로 되돌린다. */
  function restart() {
    secret = generateSecret(rng);
    attemptsUsed = 0;
    state = 'playing';
  }

  return {
    submit,
    restart,
    getState: () => state,
    getAttemptsUsed: () => attemptsUsed,
    getSecret: () => [...secret],
    maxAttempts,
  };
}
