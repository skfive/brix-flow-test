// src/game.js — Color Guess 순수 게임 로직 (렌더링 분리, ESM)
// implementation-plan.md §6 frozen 시그니처를 그대로 구현한다.
// DOM에 접근하지 않으며 모든 무작위성은 주입된 rng()에서만 나온다.

/** 시작 목숨 수 (frozen 계약 §4). */
export const START_LIVES = 3;

/** 기본 색상 견본 개수. */
export const DEFAULT_OPTION_COUNT = 4;

/**
 * rng를 소비해 하나의 #rrggbb 색상 문자열을 만든다. 순수 함수.
 * @param {() => number} rng [0,1) 난수 생성기
 * @returns {string} 예: '#3b82f6'
 */
export function randomColor(rng) {
  if (typeof rng !== 'function') {
    throw new TypeError('rng must be a function returning a number in [0, 1)');
  }
  const channel = () => Math.floor(rng() * 256);
  return (
    '#' +
    [channel(), channel(), channel()]
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * 라운드 정답과 선택지를 생성한다. 순수 함수 — rng 주입으로 결정적.
 * @param {() => number} rng [0,1) 난수 생성기 (주입 가능)
 * @param {number} [optionCount] 견본 개수
 * @returns {{ target: string, options: string[], correctIndex: number }}
 */
export function generateRound(rng, optionCount = DEFAULT_OPTION_COUNT) {
  if (typeof rng !== 'function') {
    throw new TypeError('rng must be a function returning a number in [0, 1)');
  }
  const count =
    Number.isInteger(optionCount) && optionCount > 0
      ? optionCount
      : DEFAULT_OPTION_COUNT;

  const options = [];
  // 중복 색상을 피해 견본을 채운다. 결정론을 유지하려면 시도 상한을 둔다.
  const maxAttempts = count * 20;
  for (let attempt = 0; options.length < count && attempt < maxAttempts; attempt++) {
    const color = randomColor(rng);
    if (!options.includes(color)) {
      options.push(color);
    }
  }
  // 시도 상한 내에 유일 색상을 못 채우면(극히 드문 rng) 중복이라도 채운다.
  while (options.length < count) {
    options.push(randomColor(rng));
  }

  const correctIndex = Math.floor(rng() * options.length);
  return { target: options[correctIndex], options, correctIndex };
}

/**
 * 선택이 정답인지 채점한다. 순수 함수 (부수효과 없음).
 * @param {{ correctIndex: number }} round
 * @param {number} selectedIndex
 * @returns {boolean}
 */
export function scoreGuess(round, selectedIndex) {
  return round.correctIndex === selectedIndex;
}

/**
 * 목숨을 관리한다. 순수 함수 — 새 목숨 수와 gameover 여부를 반환.
 * @param {number} lives 현재 목숨
 * @param {boolean} wasCorrect 직전 선택 정답 여부
 * @returns {{ lives: number, gameOver: boolean }}
 */
export function applyLife(lives, wasCorrect) {
  const next = wasCorrect ? lives : lives - 1;
  return { lives: next, gameOver: next <= 0 };
}

/**
 * 새 게임의 초기 상태를 만든다. 순수 함수 — 매 호출 새 객체.
 * @returns {{ status: 'playing', score: number, lives: number }}
 */
export function createInitialState() {
  return { status: 'playing', score: 0, lives: START_LIVES };
}
