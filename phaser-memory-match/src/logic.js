/**
 * Memory Match 순수 게임 로직 (BF-1723 / 계약 BF-1715 §7)
 *
 * invariant: 이 모듈은 렌더링과 분리된 순수 함수만 제공한다.
 *  - Phaser/DOM 을 import 하지 않는다.
 *  - Math.random() 을 직접 호출하지 않는다. 무작위 셔플은 주입된 rng 로만 도입한다.
 *  - 모든 함수는 입력 상태를 변형하지 않고 새 값을 반환한다.
 *
 * @typedef {{ id:number, value:number, faceUp:boolean, matched:boolean }} Card
 * @typedef {{
 *   status:'start'|'playing'|'paused'|'cleared',
 *   cards:Card[],
 *   moves:number,
 *   elapsedMs:number,
 *   flippedIndices:number[],
 *   pairCount:number,
 *   seed:number
 * }} GameState
 */

const DEFAULT_PAIR_COUNT = 8;

/**
 * 결정적 PRNG (mulberry32). seed(정수)로 재현 가능한 () => number(0..1) 생성.
 * @param {number} seed
 * @returns {() => number}
 */
export function createSeededRng(seed) {
  // 유효하지 않은 seed 는 0 으로 방어 (계약 §9-6).
  let a = Number.isFinite(seed) ? Math.floor(seed) >>> 0 : 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * pairCount 쌍(기본 8)의 카드 덱 생성. 길이 = pairCount*2, 각 value 는 2개씩.
 * 유효하지 않은 pairCount 는 기본값으로 방어한다 (계약 §9-6).
 * @param {number} [pairCount]
 * @returns {Card[]}
 */
export function buildDeck(pairCount = DEFAULT_PAIR_COUNT) {
  const count =
    Number.isInteger(pairCount) && pairCount > 0 ? pairCount : DEFAULT_PAIR_COUNT;
  const deck = [];
  for (let value = 0; value < count; value += 1) {
    deck.push({ id: value * 2, value, faceUp: false, matched: false });
    deck.push({ id: value * 2 + 1, value, faceUp: false, matched: false });
  }
  return deck;
}

/**
 * Fisher-Yates 셔플. 주입된 rng 만 사용 → 같은 rng 면 항상 같은 결과.
 * 원본 배열/카드를 변형하지 않고 새 배열을 반환한다.
 * @param {Card[]} deck
 * @param {() => number} rng
 * @returns {Card[]}
 */
export function shuffle(deck, rng) {
  const result = deck.map((card) => ({ ...card }));
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

/**
 * 초기 GameState 생성. seed 주입으로 배치가 결정적.
 * @param {{ pairCount?:number, seed:number }} opts
 * @returns {GameState}
 */
export function createInitialState(opts) {
  const pairCount =
    opts && Number.isInteger(opts.pairCount) && opts.pairCount > 0
      ? opts.pairCount
      : DEFAULT_PAIR_COUNT;
  const seed = opts && Number.isFinite(opts.seed) ? Math.floor(opts.seed) : 0;
  const cards = shuffle(buildDeck(pairCount), createSeededRng(seed));
  return {
    status: 'start',
    cards,
    moves: 0,
    elapsedMs: 0,
    flippedIndices: [],
    pairCount,
    seed,
  };
}

/**
 * 카드 뒤집기. 이미 matched/현재 턴에 뒤집힌 카드, 2장 초과, paused/cleared 는 무시.
 * 첫 flip 시 status 를 'playing' 으로 전이한다.
 * @param {GameState} state
 * @param {number} cardIndex
 * @returns {GameState}
 */
export function flipCard(state, cardIndex) {
  if (state.status === 'paused' || state.status === 'cleared') {
    return state;
  }
  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= state.cards.length) {
    return state;
  }
  if (state.flippedIndices.length >= 2) {
    return state;
  }
  const card = state.cards[cardIndex];
  if (card.matched || card.faceUp) {
    return state;
  }
  const cards = state.cards.map((c, i) =>
    i === cardIndex ? { ...c, faceUp: true } : { ...c }
  );
  return {
    ...state,
    status: 'playing',
    cards,
    flippedIndices: [...state.flippedIndices, cardIndex],
  };
}

/**
 * 현재 턴(뒤집힌 2장) 판정. 일치 시 matched 고정, 불일치 시 뒷면 복귀. moves 증가.
 * 뒤집힌 카드가 2장이 아니면 무시한다.
 * @param {GameState} state
 * @returns {GameState}
 */
export function resolveTurn(state) {
  if (state.flippedIndices.length !== 2) {
    return state;
  }
  const [a, b] = state.flippedIndices;
  const isMatch = state.cards[a].value === state.cards[b].value;
  const cards = state.cards.map((c, i) => {
    if (i === a || i === b) {
      return isMatch
        ? { ...c, faceUp: true, matched: true }
        : { ...c, faceUp: false };
    }
    return { ...c };
  });
  const next = {
    ...state,
    cards,
    moves: state.moves + 1,
    flippedIndices: [],
  };
  next.status = cards.every((c) => c.matched) ? 'cleared' : 'playing';
  return next;
}

/**
 * 모든 쌍이 matched 인지 여부.
 * @param {GameState} state
 * @returns {boolean}
 */
export function isCleared(state) {
  return state.cards.length > 0 && state.cards.every((c) => c.matched);
}

/**
 * 초기값 리셋: status='start', moves=0, elapsedMs=0, 카드 재배치.
 * seed 미지정 시 기존 seed 를 재사용해 결정성을 유지한다.
 * @param {GameState} state
 * @param {{ seed?:number }} [opts]
 * @returns {GameState}
 */
export function resetGame(state, opts) {
  const seed =
    opts && Number.isFinite(opts.seed) ? Math.floor(opts.seed) : state.seed;
  return createInitialState({ pairCount: state.pairCount, seed });
}

/**
 * 경과 초 → "mm:ss" 문자열. 음수/실수는 방어적으로 처리한다.
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatTime(totalSeconds) {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}
