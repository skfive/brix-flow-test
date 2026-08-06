// Beat Tap — 순수 게임 로직 (BF-1757)
// 설계 계약: docs/plans/BF-1739/implementation-plan.md §2·§4·§5·§6·§7
//
// 불변식(§2):
// - 이 모듈은 DOM·타이머·Math.random·전역 상태에 접근하지 않는다.
// - 모든 입력은 인자로 받고 결과는 반환값(불변 갱신)으로 준다.
// - 무작위 요소는 rng: () => number(0~1)로 주입한다.
// - 시간은 now/hitTime(ms)을 인자로 주입한다.

/**
 * 판정·점수 기본 설정(§5·§6). config 인자로 주입해 조정·테스트 가능.
 * @typedef {{
 *   PERFECT_WINDOW: number, GOOD_WINDOW: number, fallDuration: number,
 *   scorePerfect: number, scoreGood: number, laneCount: number
 * }} Config
 */
export const DEFAULT_CONFIG = Object.freeze({
  PERFECT_WINDOW: 50,
  GOOD_WINDOW: 120,
  fallDuration: 1600,
  scorePerfect: 300,
  scoreGood: 100,
  laneCount: 4,
});

// 레인 인덱스 → 키 라벨 매핑(§4): 0=D, 1=F, 2=J, 3=K
export const LANE_KEYS = Object.freeze(['D', 'F', 'J', 'K']);

/**
 * 초기 상태(§2.1). status='start', 점수·콤보·판정 카운트 0.
 * @returns {object}
 */
export function createInitialState() {
  return {
    status: 'start',
    notes: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    judged: 0,
    hits: 0,
    counts: { perfect: 0, good: 0, miss: 0 },
  };
}

/**
 * 노트 패턴 생성(§4). 주입된 rng로 결정론적으로 재현 가능한 시간축 배열을 만든다.
 * @param {() => number} rng 0~1 난수 주입
 * @param {{count?: number, interval?: number, startAt?: number, laneCount?: number}} [options]
 * @returns {Array<{id:number, lane:number, time:number, status:string}>} time 오름차순 정렬된 패턴
 */
export function generatePattern(rng, options = {}) {
  const { count = 16, interval = 700, startAt = 1600, laneCount = 4 } = options;
  const notes = [];
  for (let i = 0; i < count; i += 1) {
    // rng()는 [0,1) 이지만 방어적으로 상한 clamp
    const lane = Math.min(laneCount - 1, Math.floor(rng() * laneCount));
    notes.push({ id: i + 1, lane, time: startAt + i * interval, status: 'pending' });
  }
  return notes;
}

/**
 * 판정(§5): 목표 시각 note.time과 입력 시각 hitTime의 절대 시간차 기반.
 * @param {{time:number}} note
 * @param {number} hitTime
 * @param {Config} [config]
 * @returns {'perfect'|'good'|'miss'}
 */
export function judge(note, hitTime, config = DEFAULT_CONFIG) {
  const d = Math.abs(hitTime - note.time);
  if (d <= config.PERFECT_WINDOW) return 'perfect';
  if (d <= config.GOOD_WINDOW) return 'good';
  return 'miss';
}

/**
 * 판정 결과를 상태 집계(점수·콤보·정확도 근거)에 불변 반영(§6).
 * 노트 배열은 변경하지 않는다(노트 상태는 resolveHit/advance가 관리).
 * @param {object} state
 * @param {'perfect'|'good'|'miss'} result
 * @param {Config} [config]
 * @returns {object} 새 상태
 */
export function applyJudgment(state, result, config = DEFAULT_CONFIG) {
  const gained =
    result === 'perfect' ? config.scorePerfect : result === 'good' ? config.scoreGood : 0;
  const counts = { ...state.counts, [result]: state.counts[result] + 1 };
  const combo = result === 'miss' ? 0 : state.combo + 1;
  const maxCombo = Math.max(state.maxCombo, combo);
  const judged = counts.perfect + counts.good + counts.miss;
  const hits = counts.perfect + counts.good;
  return { ...state, score: state.score + gained, combo, maxCombo, counts, judged, hits };
}

/**
 * 정확도(§6): hits / judged. judged===0이면 100(0 나눗셈 방지). 백분율(number).
 * @param {object} state
 * @returns {number} 0~100
 */
export function accuracy(state) {
  if (state.judged === 0) return 100;
  return (state.hits / state.judged) * 100;
}

/**
 * 플레이어 입력을 해당 레인의 가장 가까운 pending 노트에 적용(순수).
 * GOOD_WINDOW를 벗어난 입력(근처 노트 없음)은 무시해 콤보를 깨지 않는다.
 * @param {object} state
 * @param {number} lane 0~3
 * @param {number} hitTime
 * @param {Config} [config]
 * @returns {{state:object, result:('perfect'|'good'|'miss'|null), noteId:(number|null)}}
 */
export function resolveHit(state, lane, hitTime, config = DEFAULT_CONFIG) {
  let target = null;
  let targetIndex = -1;
  let best = Infinity;
  for (let i = 0; i < state.notes.length; i += 1) {
    const n = state.notes[i];
    if (n.status !== 'pending' || n.lane !== lane) continue;
    const d = Math.abs(hitTime - n.time);
    if (d < best) {
      best = d;
      target = n;
      targetIndex = i;
    }
  }
  if (!target || best > config.GOOD_WINDOW) {
    return { state, result: null, noteId: null };
  }
  const result = judge(target, hitTime, config);
  const notes = state.notes.slice();
  notes[targetIndex] = { ...target, status: result };
  const next = applyJudgment({ ...state, notes }, result, config);
  return { state: next, result, noteId: target.id };
}

/**
 * 경과 시간 기준으로 판정선을 GOOD_WINDOW 넘게 지나친 pending 노트를 자동 miss 처리하고,
 * 모든 노트가 판정되면 gameover로 종료 판정(§5·§7).
 * @param {object} state
 * @param {number} now 게임 시작 기준 경과(ms)
 * @param {Config} [config]
 * @returns {object} 새 상태
 */
export function advance(state, now, config = DEFAULT_CONFIG) {
  let next = { ...state, notes: state.notes.slice() };
  for (let i = 0; i < next.notes.length; i += 1) {
    const n = next.notes[i];
    if (n.status === 'pending' && now - n.time > config.GOOD_WINDOW) {
      next.notes[i] = { ...n, status: 'miss' };
      next = applyJudgment({ ...next, notes: next.notes }, 'miss', config);
    }
  }
  const finished =
    next.status === 'playing' &&
    next.notes.length > 0 &&
    next.notes.every((n) => n.status !== 'pending');
  if (finished) {
    next = { ...next, status: 'gameover' };
  }
  return next;
}

/**
 * 상태 전이(§7). restart/finish 후에는 진행 표시를 초기값으로 되돌린다.
 * @param {object} state
 * @param {'start'|'pause'|'resume'|'finish'|'restart'} action
 * @returns {object} 새 상태
 */
export function transition(state, action) {
  switch (action) {
    case 'start':
      return state.status === 'start' ? { ...state, status: 'playing' } : state;
    case 'pause':
      return state.status === 'playing' ? { ...state, status: 'paused' } : state;
    case 'resume':
      return state.status === 'paused' ? { ...state, status: 'playing' } : state;
    case 'finish':
      return state.status === 'playing' ? { ...state, status: 'gameover' } : state;
    case 'restart':
      // gameover(종료) 또는 paused(취소) → 초기값으로 완전 복귀
      return state.status === 'gameover' || state.status === 'paused'
        ? createInitialState()
        : state;
    default:
      return state;
  }
}
