import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  startGame,
  pauseGame,
  resumeGame,
  restartGame,
  tick,
  moveCatcher,
  collectStar,
  BOARD_COLUMNS,
  CATCHER_INITIAL_COLUMN,
  GAME_DURATION_SECONDS,
  STAR_SPAWN_INTERVAL_MS,
} from '../src/game.js';

// §6.1 게임 시작
test('createInitialState()는 idle 상태와 초기값을 반환한다', () => {
  const state = createInitialState();
  assert.equal(state.status, 'idle');
  assert.equal(state.score, 0);
  assert.equal(state.combo, 0);
  assert.equal(state.missed, 0);
  assert.equal(state.timeRemaining, GAME_DURATION_SECONDS);
  assert.equal(state.catcherColumn, CATCHER_INITIAL_COLUMN);
  assert.deepEqual(state.stars, []);
});

test('startGame(idle)은 running으로 전이한다', () => {
  const state = startGame(createInitialState());
  assert.equal(state.status, 'running');
});

test('startGame(idle이 아님)은 no-op이다', () => {
  const running = startGame(createInitialState());
  const result = startGame(running);
  assert.equal(result, running);
});

// §6.4 일시정지 → 재개
test('pauseGame(running)은 paused로 전이한다', () => {
  const running = startGame(createInitialState());
  const paused = pauseGame(running);
  assert.equal(paused.status, 'paused');
});

test('pauseGame(running이 아님)은 no-op이다', () => {
  const idle = createInitialState();
  assert.equal(pauseGame(idle), idle);
});

test('resumeGame(paused)은 running으로 복귀하며 진행 상태를 보존한다', () => {
  let state = startGame(createInitialState());
  state = tick(state, 900); // 별 1개 생성 + 타이머 진행
  const paused = pauseGame(state);
  const resumed = resumeGame(paused);
  assert.equal(resumed.status, 'running');
  assert.equal(resumed.timeRemaining, paused.timeRemaining);
  assert.deepEqual(resumed.stars, paused.stars);
  assert.equal(resumed.score, paused.score);
  assert.equal(resumed.combo, paused.combo);
  assert.equal(resumed.missed, paused.missed);
});

test('resumeGame(paused가 아님)은 no-op이다', () => {
  const idle = createInitialState();
  assert.equal(resumeGame(idle), idle);
});

// §6.2 별 수집 성공
test('collectStar는 catch zone 안의 동일 열 별을 수집하고 점수/콤보를 올린다', () => {
  let state = startGame(createInitialState());
  state = { ...state, catcherColumn: 2, stars: [{ id: 1, column: 2, y: 90 }] };
  const result = collectStar(state);
  assert.equal(result.stars.length, 0);
  assert.equal(result.score, 10);
  assert.equal(result.combo, 1);
});

test('collectStar 연속 수집 시 콤보 보너스가 가산된다', () => {
  let state = startGame(createInitialState());
  state = { ...state, catcherColumn: 0, combo: 1, score: 10, stars: [{ id: 2, column: 0, y: 88 }] };
  const result = collectStar(state);
  assert.equal(result.score, 10 + 12); // 10 + (10 + combo(1)*2)
  assert.equal(result.combo, 2);
});

test('collectStar는 일치하는 별이 없으면 no-op이다', () => {
  let state = startGame(createInitialState());
  state = { ...state, catcherColumn: 3, stars: [{ id: 3, column: 1, y: 90 }] };
  const result = collectStar(state);
  assert.equal(result, state);
});

test('collectStar(running이 아님)은 no-op이다', () => {
  const idle = createInitialState();
  assert.equal(collectStar(idle), idle);
});

// §6.3 별 놓침
test('tick은 y가 100 이상이 된 별을 missed 처리하고 combo를 초기화한다', () => {
  let state = startGame(createInitialState());
  state = { ...state, combo: 3, stars: [{ id: 4, column: 5, y: 99 }] };
  const result = tick(state, 1000); // y: 99 + 20 = 119 >= 100
  assert.equal(result.missed, 1);
  assert.equal(result.combo, 0);
  assert.equal(result.stars.some((s) => s.id === 4), false);
});

// §6.5 타이머 종료
test('tick은 timeRemaining이 0 이하가 되면 ended로 자동 전이한다', () => {
  let state = startGame(createInitialState());
  state = { ...state, timeRemaining: 0.5 };
  const result = tick(state, 1000);
  assert.equal(result.status, 'ended');
  assert.equal(result.timeRemaining, 0);
});

test('ended 상태에서 moveCatcher/collectStar는 no-op이다', () => {
  let state = startGame(createInitialState());
  state = tick({ ...state, timeRemaining: 0.1 }, 1000);
  assert.equal(state.status, 'ended');
  assert.equal(moveCatcher(state, 'left'), state);
  assert.equal(collectStar(state), state);
});

// §6.6 다시 시작
test('restartGame은 어떤 상태에서도 idle로 완전히 초기화한다', () => {
  let running = startGame(createInitialState());
  running = { ...running, score: 50, combo: 4, missed: 2, timeRemaining: 12, catcherColumn: 6, stars: [{ id: 9, column: 1, y: 50 }] };
  const restarted = restartGame(running);
  assert.deepEqual(restarted, createInitialState());
});

test('idle 상태에서 restartGame을 호출해도 예외 없이 초기값을 반환한다', () => {
  const idle = createInitialState();
  assert.deepEqual(restartGame(idle), createInitialState());
});

// §6.7 edge case
test('moveCatcher는 경계를 벗어나지 않도록 clamp한다', () => {
  let state = startGame(createInitialState());
  const atLeftEdge = { ...state, catcherColumn: 0 };
  assert.equal(moveCatcher(atLeftEdge, 'left').catcherColumn, 0);
  const atRightEdge = { ...state, catcherColumn: BOARD_COLUMNS - 1 };
  assert.equal(moveCatcher(atRightEdge, 'right').catcherColumn, BOARD_COLUMNS - 1);
});

test('moveCatcher(running이 아님)은 no-op이다', () => {
  const idle = createInitialState();
  assert.equal(moveCatcher(idle, 'left'), idle);
});

test('paused 상태에서 moveCatcher/collectStar 호출은 입력을 무시한다', () => {
  const paused = pauseGame(startGame(createInitialState()));
  assert.equal(moveCatcher(paused, 'right'), paused);
  assert.equal(collectStar(paused), paused);
});

test('tick은 STAR_SPAWN_INTERVAL_MS 경과 시 별을 생성한다', () => {
  const state = startGame(createInitialState());
  const result = tick(state, STAR_SPAWN_INTERVAL_MS);
  assert.equal(result.stars.length, 1);
  assert.equal(result.stars[0].y, 0);
});

test('tick(running이 아님)은 no-op이다', () => {
  const idle = createInitialState();
  assert.equal(tick(idle, 1000), idle);
});
