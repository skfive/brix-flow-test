// 별빛 수집가 — 순수 게임 규칙 함수 모음 (DOM 비의존, node --test 로 검증 가능)
// docs/plans/star-catcher-BF-1483.md §4~§6 게임 규칙 설계를 그대로 구현한다.

export const GAME_DURATION_SECONDS = 30;
export const BOARD_COLUMNS = 7;
export const CATCHER_INITIAL_COLUMN = 3;
export const CATCH_ZONE_MIN_PERCENT = 85;
export const STAR_FALL_SPEED_PERCENT_PER_SEC = 20;
export const STAR_SPAWN_INTERVAL_MS = 900;
export const SCORE_PER_CATCH = 10;
export const COMBO_SCORE_BONUS_PER_COMBO = 2;
const MISS_THRESHOLD_PERCENT = 100;

export function createInitialState() {
  return {
    status: 'idle',
    score: 0,
    combo: 0,
    missed: 0,
    timeRemaining: GAME_DURATION_SECONDS,
    catcherColumn: CATCHER_INITIAL_COLUMN,
    stars: [],
    spawnTimerMs: STAR_SPAWN_INTERVAL_MS,
    nextStarId: 1,
  };
}

export function startGame(state) {
  if (state.status !== 'idle') return state;
  return { ...state, status: 'running' };
}

export function pauseGame(state) {
  if (state.status !== 'running') return state;
  return { ...state, status: 'paused' };
}

export function resumeGame(state) {
  if (state.status !== 'paused') return state;
  return { ...state, status: 'running' };
}

export function restartGame(_state) {
  return createInitialState();
}

export function tick(state, deltaMs) {
  if (state.status !== 'running') return state;

  const dtSec = deltaMs / 1000;
  let combo = state.combo;
  let missed = state.missed;

  const movedStars = state.stars.map((star) => ({
    ...star,
    y: star.y + STAR_FALL_SPEED_PERCENT_PER_SEC * dtSec,
  }));

  const survivingStars = [];
  for (const star of movedStars) {
    if (star.y >= MISS_THRESHOLD_PERCENT) {
      missed += 1;
      combo = 0;
    } else {
      survivingStars.push(star);
    }
  }

  let spawnTimerMs = state.spawnTimerMs - deltaMs;
  let nextStarId = state.nextStarId;
  const spawnedStars = [];
  while (spawnTimerMs <= 0) {
    spawnedStars.push({
      id: nextStarId,
      column: Math.floor(Math.random() * BOARD_COLUMNS),
      y: 0,
    });
    nextStarId += 1;
    spawnTimerMs += STAR_SPAWN_INTERVAL_MS;
  }

  const timeRemaining = Math.max(0, state.timeRemaining - dtSec);
  const status = timeRemaining <= 0 ? 'ended' : 'running';

  return {
    ...state,
    status,
    combo,
    missed,
    timeRemaining,
    stars: [...survivingStars, ...spawnedStars],
    spawnTimerMs,
    nextStarId,
  };
}

export function moveCatcher(state, direction) {
  if (state.status !== 'running') return state;
  const delta = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
  const catcherColumn = Math.min(
    BOARD_COLUMNS - 1,
    Math.max(0, state.catcherColumn + delta)
  );
  if (catcherColumn === state.catcherColumn) return state;
  return { ...state, catcherColumn };
}

export function collectStar(state) {
  if (state.status !== 'running') return state;

  let target = null;
  for (const star of state.stars) {
    if (star.column !== state.catcherColumn) continue;
    if (star.y < CATCH_ZONE_MIN_PERCENT) continue;
    if (!target || star.y > target.y) target = star;
  }
  if (!target) return state;

  return {
    ...state,
    score: state.score + SCORE_PER_CATCH + state.combo * COMBO_SCORE_BONUS_PER_COMBO,
    combo: state.combo + 1,
    stars: state.stars.filter((star) => star.id !== target.id),
  };
}
