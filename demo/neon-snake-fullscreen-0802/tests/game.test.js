// 네온 스네이크 순수 게임 규칙 단위 테스트 (node --test, DOM/localStorage 비의존)
// 검증 기준: docs/plans/neon-snake-fullscreen-0802-BF-1489.md §9
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  startGame,
  setDirection,
  step,
  pauseGame,
  resumeGame,
  restartGame,
  spawnFood,
  GRID_COLS,
  GRID_ROWS,
  INITIAL_SNAKE_LENGTH,
  INITIAL_STEP_MS,
  MIN_STEP_MS,
  SCORE_PER_FOOD,
  SPEED_UP_EVERY_N_FOODS,
} from '../src/game.js';

// rng stub: 미리 정한 값들을 순서대로 반환 (먹이 위치 결정론화)
function stubRng(values) {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

// 특정 빈 칸이 선택되도록 rng를 역산: idx = floor(rng * emptiesLen)
function rngForIndex(idx, emptiesLen) {
  return stubRng([idx / emptiesLen]);
}

function snakeOccupies(snake, cell) {
  return snake.some((s) => s.x === cell.x && s.y === cell.y);
}

// 1. createInitialState §5 초기값
test('createInitialState는 ready 상태·길이 3·food null 초기값을 반환한다', () => {
  const s = createInitialState();
  assert.equal(s.status, 'ready');
  assert.equal(s.snake.length, INITIAL_SNAKE_LENGTH);
  assert.equal(s.food, null);
  assert.equal(s.score, 0);
  assert.equal(s.highScore, 0);
  assert.equal(s.foodsEaten, 0);
  assert.equal(s.speedLevel, 0);
  assert.equal(s.stepMs, INITIAL_STEP_MS);
  assert.equal(s.direction, 'right');
  assert.equal(s.nextDirection, 'right');
  // 중앙 수평 3칸, 머리가 배열 첫 요소이며 direction right 방향 앞쪽
  const head = s.snake[0];
  assert.equal(head.x, Math.floor(GRID_COLS / 2));
  assert.equal(head.y, Math.floor(GRID_ROWS / 2));
  assert.equal(s.snake[1].x, head.x - 1);
  assert.equal(s.snake[2].x, head.x - 2);
});

test('createInitialState는 highScore 옵션을 반영하고 입력을 변경하지 않는다', () => {
  const s = createInitialState({ highScore: 200 });
  assert.equal(s.highScore, 200);
});

// 2. startGame ready→running + 첫 먹이 배치(겹치지 않음)
test('startGame은 ready→running 전이 후 뱀과 겹치지 않는 첫 먹이를 배치한다', () => {
  const s0 = createInitialState();
  const s1 = startGame(s0, stubRng([0.123]));
  assert.equal(s1.status, 'running');
  assert.notEqual(s1.food, null);
  assert.ok(!snakeOccupies(s1.snake, s1.food));
  // 불변성: 원본 유지
  assert.equal(s0.status, 'ready');
  assert.equal(s0.food, null);
});

test('startGame은 ready가 아니면 no-op이다', () => {
  const running = startGame(createInitialState(), stubRng([0.1]));
  const again = startGame(running, stubRng([0.9]));
  assert.deepEqual(again, running);
});

// 3. setDirection 역방향 무시 + 한 tick 이중 입력 180° 반전 방지
test('setDirection은 커밋된 방향의 반대 입력을 무시한다', () => {
  const running = startGame(createInitialState(), stubRng([0.1]));
  // direction=right → left는 반대이므로 무시
  const s = setDirection(running, 'left');
  assert.equal(s.nextDirection, 'right');
});

test('setDirection은 유효 방향을 nextDirection에 기록한다', () => {
  const running = startGame(createInitialState(), stubRng([0.1]));
  const s = setDirection(running, 'up');
  assert.equal(s.nextDirection, 'up');
});

test('한 tick 내 이중 입력으로 180° 반전이 발생하지 않는다', () => {
  const running = startGame(createInitialState(), stubRng([0.1]));
  // up으로 전환 후, 같은 tick에 left 입력 → left는 커밋된 right의 반대라 무시
  const s1 = setDirection(running, 'up');
  const s2 = setDirection(s1, 'left');
  assert.equal(s2.nextDirection, 'up');
});

test('setDirection은 running이 아니면 no-op이다', () => {
  const ready = createInitialState();
  assert.deepEqual(setDirection(ready, 'up'), ready);
});

// 4. step 먹이 섭취: 점수 +10·성장·새 먹이(겹치지 않음)
test('step은 먹이 섭취 시 점수 +10·1칸 성장·뱀과 겹치지 않는 새 먹이를 만든다', () => {
  let s = startGame(createInitialState(), stubRng([0.1]));
  const head = s.snake[0];
  // 머리 바로 오른쪽에 먹이 배치 (다음 tick에 섭취)
  s = { ...s, food: { x: head.x + 1, y: head.y } };
  const lenBefore = s.snake.length;
  const s2 = step(s, stubRng([0.5]));
  assert.equal(s2.score, SCORE_PER_FOOD);
  assert.equal(s2.snake.length, lenBefore + 1);
  assert.equal(s2.foodsEaten, 1);
  assert.notEqual(s2.food, null);
  assert.ok(!snakeOccupies(s2.snake, s2.food));
});

test('step은 먹지 않는 tick에 길이를 유지하며 이동한다', () => {
  let s = startGame(createInitialState(), stubRng([0.1]));
  // 먹이를 멀리 두어 이번 tick에는 먹지 않음
  s = { ...s, food: { x: 0, y: 0 } };
  const lenBefore = s.snake.length;
  const headBefore = s.snake[0];
  const s2 = step(s);
  assert.equal(s2.snake.length, lenBefore);
  assert.equal(s2.snake[0].x, headBefore.x + 1);
  assert.equal(s2.score, 0);
});

// 5. step 먹이 3개 섭취 시 speedLevel 증가·stepMs 감소·MIN_STEP_MS 하한
test('step은 먹이 3개마다 speedLevel을 올리고 stepMs를 줄인다', () => {
  let s = startGame(createInitialState(), stubRng([0.1]));
  // 먹이를 항상 머리 앞(오른쪽)에 두어 연속 섭취
  for (let i = 0; i < 3; i += 1) {
    const head = s.snake[0];
    s = { ...s, food: { x: head.x + 1, y: head.y } };
    s = step(s, stubRng([0.5]));
  }
  assert.equal(s.foodsEaten, 3);
  assert.equal(s.speedLevel, 1);
  assert.equal(s.stepMs, INITIAL_STEP_MS - 8); // 140 - 1*8 = 132
});

test('stepMs는 MIN_STEP_MS 아래로 내려가지 않는다', () => {
  // speedLevel을 강제로 크게 만든 뒤 섭취 시 하한 확인
  let s = startGame(createInitialState(), stubRng([0.1]));
  s = { ...s, foodsEaten: SPEED_UP_EVERY_N_FOODS - 1, speedLevel: 20, stepMs: MIN_STEP_MS };
  const head = s.snake[0];
  s = { ...s, food: { x: head.x + 1, y: head.y } };
  s = step(s, stubRng([0.5]));
  assert.equal(s.speedLevel, 21);
  assert.equal(s.stepMs, MIN_STEP_MS);
});

// 6. step 벽 충돌 → gameover + highScore 갱신
test('step은 벽 충돌 시 gameover로 전이하고 highScore를 갱신한다', () => {
  let s = startGame(createInitialState(), stubRng([0.1]));
  // 머리를 오른쪽 벽 가장자리로 이동시키기 위해 상태 조작
  s = { ...s, snake: [{ x: GRID_COLS - 1, y: 5 }, { x: GRID_COLS - 2, y: 5 }, { x: GRID_COLS - 3, y: 5 }], score: 50, highScore: 30, food: { x: 0, y: 0 } };
  const s2 = step(s);
  assert.equal(s2.status, 'gameover');
  assert.equal(s2.highScore, 50); // score(50) > highScore(30)
});

test('gameover 후 step/setDirection은 no-op이다', () => {
  const over = { ...createInitialState(), status: 'gameover' };
  assert.deepEqual(step(over), over);
  assert.deepEqual(setDirection(over, 'up'), over);
});

// 7. step 자기 충돌 → gameover (꼬리 제외 규칙)
test('step은 자기 몸 충돌 시 gameover로 전이한다', () => {
  // ㄷ자 형태 뱀을 만들어 머리가 몸통과 충돌하도록 구성
  let s = startGame(createInitialState(), stubRng([0.1]));
  // 머리 (5,5) down 방향으로 이동 시 (5,6)이 몸통이면 충돌
  s = {
    ...s,
    direction: 'down',
    nextDirection: 'down',
    snake: [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
    ],
    food: { x: 0, y: 0 },
  };
  const s2 = step(s);
  assert.equal(s2.status, 'gameover');
});

test('꼬리 자리로의 이동은 충돌이 아니다(꼬리 제외 규칙)', () => {
  // 머리가 이동하는 칸이 현재 꼬리 위치면, 그 tick에 꼬리가 비므로 충돌 아님
  let s = startGame(createInitialState(), stubRng([0.1]));
  s = {
    ...s,
    direction: 'up',
    nextDirection: 'up',
    snake: [
      { x: 5, y: 5 }, // head
      { x: 6, y: 5 },
      { x: 6, y: 4 },
      { x: 5, y: 4 }, // tail — 머리가 up으로 이 자리로 이동
    ],
    food: { x: 0, y: 0 },
  };
  const s2 = step(s);
  assert.equal(s2.status, 'running');
  assert.equal(s2.snake[0].x, 5);
  assert.equal(s2.snake[0].y, 4);
});

// 8. pauseGame/resumeGame 왕복 후 진행 상태 보존
test('pauseGame/resumeGame 왕복 후 뱀·점수·food가 보존된다', () => {
  let s = startGame(createInitialState(), stubRng([0.1]));
  s = { ...s, score: 40, speedLevel: 2 };
  const paused = pauseGame(s);
  assert.equal(paused.status, 'paused');
  const resumed = resumeGame(paused);
  assert.equal(resumed.status, 'running');
  assert.deepEqual(resumed.snake, s.snake);
  assert.equal(resumed.score, s.score);
  assert.equal(resumed.speedLevel, s.speedLevel);
  assert.deepEqual(resumed.food, s.food);
});

test('pauseGame/resumeGame은 대상 상태가 아니면 no-op이다', () => {
  const ready = createInitialState();
  assert.deepEqual(pauseGame(ready), ready);
  assert.deepEqual(resumeGame(ready), ready);
});

// 9. restartGame highScore 보존·나머지 초기화
test('restartGame은 highScore를 보존하고 나머지를 초기화한다', () => {
  let s = startGame(createInitialState({ highScore: 120 }), stubRng([0.1]));
  s = { ...s, score: 80, speedLevel: 3, foodsEaten: 9, status: 'gameover', highScore: 120 };
  const r = restartGame(s);
  assert.equal(r.status, 'ready');
  assert.equal(r.highScore, 120);
  assert.equal(r.score, 0);
  assert.equal(r.speedLevel, 0);
  assert.equal(r.foodsEaten, 0);
  assert.equal(r.food, null);
  assert.equal(r.snake.length, INITIAL_SNAKE_LENGTH);
  assert.equal(r.stepMs, INITIAL_STEP_MS);
});

// 10. edge: 비-running no-op, 만석 gameover, 동일 방향 무해, spawnFood 겹침 없음
test('spawnFood는 뱀이 점유하지 않은 칸만 반환하고, 만석이면 null을 반환한다', () => {
  const snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
  // 2x2 격자에서 빈 칸은 (0,1),(1,1) 중 인덱스 1 → (1,1)
  const food = spawnFood(snake.slice(0, 2), rngForIndex(1, 2), 2, 2);
  assert.ok(!snakeOccupies(snake.slice(0, 2), food));

  // 완전 만석: 2x2를 4칸으로 채우면 null
  const full = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
  assert.equal(spawnFood(full, stubRng([0.5]), 2, 2), null);
});

test('격자 만석 상태에서 먹이를 먹으면 gameover로 종료한다(예외 없음)', () => {
  // 2x2 격자: 뱀이 3칸, 남은 1칸이 먹이. 먹으면 4칸 만석 → 새 먹이 null → gameover
  let s = createInitialState({ cols: 2, rows: 2 });
  s = {
    ...s,
    status: 'running',
    cols: 2,
    rows: 2,
    direction: 'down',
    nextDirection: 'down',
    snake: [
      { x: 0, y: 0 }, // head
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ],
    food: { x: 0, y: 1 }, // 머리가 down으로 이동해 섭취
  };
  const s2 = step(s, stubRng([0]));
  assert.equal(s2.status, 'gameover');
  assert.equal(s2.food, null);
});

test('동일 방향으로 setDirection 호출은 상태를 바꾸지 않는다', () => {
  const running = startGame(createInitialState(), stubRng([0.1]));
  const s = setDirection(running, 'right'); // 이미 right
  assert.equal(s.nextDirection, 'right');
});

test('ready 상태에서 step은 no-op이다', () => {
  const ready = createInitialState();
  assert.deepEqual(step(ready), ready);
});

// ===========================================================================
// BF-1503 · 2인 로컬 멀티플레이 규칙 테스트 (planner frozen 실행 설계 §3~§7)
// 기존 단일 플레이 테스트는 유지하고 아래 계약 테스트를 additive로 추가한다.
// ===========================================================================
import {
  createMultiplayerState,
  startMultiplayer,
  setPlayerDirection,
  stepMultiplayer,
  pauseMultiplayer,
  resumeMultiplayer,
  restartMultiplayer,
  computeBoardMetrics,
  bindingForKey,
  MP_STATE_TEXT,
} from '../src/game.js';

// 결정론 tick 검증용 running state 헬퍼 (food 기본 null → 먹이 간섭 없음)
function mpRunning(overrides = {}) {
  const base = createMultiplayerState({ cols: 12, rows: 12 });
  return { ...base, state: 'running', food: null, ...overrides };
}
const mpSnake = (body, dir, score = 0) => ({ body, dir, nextDir: dir, score });

test('createMultiplayerState는 ready·점수 0·food null·두 뱀 초기값을 반환한다', () => {
  const s = createMultiplayerState({ cols: 12, rows: 12 });
  assert.equal(s.state, 'ready');
  assert.equal(s.food, null);
  assert.equal(s.p1.score, 0);
  assert.equal(s.p2.score, 0);
  assert.equal(s.p1.dir, 'right');
  assert.equal(s.p2.dir, 'left');
  assert.equal(s.p1.body.length, 3);
  assert.equal(s.p2.body.length, 3);
  // 두 뱀은 서로 겹치지 않는다
  const p1 = new Set(s.p1.body.map((c) => `${c.x},${c.y}`));
  assert.ok(s.p2.body.every((c) => !p1.has(`${c.x},${c.y}`)));
});

test('startMultiplayer는 ready→running 전이 후 먹이를 배치한다', () => {
  const s = startMultiplayer(createMultiplayerState({ cols: 12, rows: 12 }), () => 0);
  assert.equal(s.state, 'running');
  assert.notEqual(s.food, null);
});

test('startMultiplayer는 ready가 아니면 no-op이다', () => {
  const running = mpRunning();
  assert.deepEqual(startMultiplayer(running, () => 0), running);
});

test('setPlayerDirection은 커밋된 방향의 반대 입력을 무시한다(§4 E-1)', () => {
  const s = mpRunning({ p1: mpSnake([{ x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }], 'right') });
  assert.equal(setPlayerDirection(s, 'p1', 'left').p1.nextDir, 'right');
  assert.equal(setPlayerDirection(s, 'p1', 'up').p1.nextDir, 'up');
});

test('setPlayerDirection은 한 tick 다중 입력 중 마지막 유효 입력만 반영한다(§4 E-2)', () => {
  let s = mpRunning({ p1: mpSnake([{ x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }], 'right') });
  s = setPlayerDirection(s, 'p1', 'up');
  s = setPlayerDirection(s, 'p1', 'down'); // right의 반대 아님 → 채택
  assert.equal(s.p1.nextDir, 'down');
});

test('setPlayerDirection은 1P/2P를 독립적으로 조작하고 running이 아니면 no-op이다', () => {
  let s = mpRunning();
  s = setPlayerDirection(s, 'p1', 'up');
  s = setPlayerDirection(s, 'p2', 'up');
  assert.equal(s.p1.nextDir, 'up');
  assert.equal(s.p2.nextDir, 'up');
  const ready = createMultiplayerState({ cols: 12, rows: 12 });
  assert.deepEqual(setPlayerDirection(ready, 'p1', 'up'), ready);
});

test('stepMultiplayer는 벽 충돌한 뱀을 사망 처리하고 상대 승리로 전이한다(§5 E-3)', () => {
  const s = mpRunning({
    p1: mpSnake([{ x: 11, y: 5 }, { x: 10, y: 5 }, { x: 9, y: 5 }], 'right'), // next x=12 → 벽
    p2: mpSnake([{ x: 1, y: 1 }, { x: 0, y: 1 }], 'down'),
  });
  assert.equal(stepMultiplayer(s, () => 0).state, 'p2-win');
});

test('stepMultiplayer는 자기 몸 충돌을 사망 처리한다(§5 E-3)', () => {
  const s = mpRunning({
    // 왼쪽으로 진행하던 뱀이 down으로 꺾여 몸통 (2,3)에 충돌
    p1: mpSnake([{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }], 'down'),
    p2: mpSnake([{ x: 8, y: 8 }, { x: 9, y: 8 }], 'left'),
  });
  assert.equal(stepMultiplayer(s, () => 0).state, 'p2-win');
});

test('stepMultiplayer는 상대 몸 충돌을 사망 처리한다(§5 E-3)', () => {
  const s = mpRunning({
    p1: mpSnake([{ x: 2, y: 5 }, { x: 1, y: 5 }], 'right'), // next (3,5) = p2 몸통
    p2: mpSnake([{ x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }], 'up'),
  });
  assert.equal(stepMultiplayer(s, () => 0).state, 'p2-win');
});

test('stepMultiplayer head-to-head는 양측 사망·동점이면 무승부다(§5 E-4/US-5)', () => {
  const s = mpRunning({
    p1: mpSnake([{ x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }], 'right'), // next (5,5)
    p2: mpSnake([{ x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }], 'left'), // next (5,5)
  });
  assert.equal(stepMultiplayer(s, () => 0).state, 'draw');
});

test('stepMultiplayer 양측 동시 사망은 점수 비교로 승자를 정한다(§5.6)', () => {
  const s = mpRunning({
    p1: mpSnake([{ x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }], 'right', 2),
    p2: mpSnake([{ x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }], 'left', 1),
  });
  assert.equal(stepMultiplayer(s, () => 0).state, 'p1-win');
});

test('stepMultiplayer는 먹이 획득 뱀만 성장·득점하고 먹이를 유효 빈 칸으로 재배치한다(§6/US-3)', () => {
  const s = mpRunning({
    p1: mpSnake([{ x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }], 'right'),
    p2: mpSnake([{ x: 8, y: 8 }, { x: 9, y: 8 }], 'up'),
    food: { x: 5, y: 5 },
  });
  const r = stepMultiplayer(s, () => 0);
  assert.equal(r.state, 'running');
  assert.equal(r.p1.score, 1);
  assert.equal(r.p1.body.length, 4); // 성장(꼬리 유지)
  assert.equal(r.p2.score, 0);
  assert.equal(r.p2.body.length, 2); // 2P 변화 없음
  assert.notEqual(r.food, null);
  // 재배치된 먹이는 어느 뱀과도 겹치지 않는다
  const occupied = new Set([...r.p1.body, ...r.p2.body].map((c) => `${c.x},${c.y}`));
  assert.ok(!occupied.has(`${r.food.x},${r.food.y}`));
});

test('stepMultiplayer는 running이 아니면 tick을 진행하지 않는다(§7 paused 보존)', () => {
  const paused = { ...mpRunning(), state: 'paused' };
  assert.deepEqual(stepMultiplayer(paused, () => 0), paused);
});

test('stepMultiplayer는 결정론적이다(같은 입력·상태 → 같은 결과)', () => {
  const build = () => mpRunning({
    p1: mpSnake([{ x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }], 'right'),
    p2: mpSnake([{ x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }], 'left'),
    food: { x: 5, y: 9 },
  });
  assert.deepEqual(stepMultiplayer(build(), () => 0.5), stepMultiplayer(build(), () => 0.5));
});

test('pause/resume는 뱀·점수·먹이를 보존하고 대상 상태가 아니면 no-op이다(§7/US-6)', () => {
  const running = mpRunning({ food: { x: 5, y: 5 } });
  const paused = pauseMultiplayer(running);
  assert.equal(paused.state, 'paused');
  assert.deepEqual(paused.p1, running.p1);
  assert.deepEqual(paused.food, running.food);
  const resumed = resumeMultiplayer(paused);
  assert.equal(resumed.state, 'running');
  assert.deepEqual(resumeMultiplayer(running), running); // running에서 resume no-op
  assert.deepEqual(pauseMultiplayer(paused), paused); // paused에서 pause no-op
});

test('restartMultiplayer는 어느 상태에서든 ready 초기값으로 복귀한다(§3.8/§7/US-7)', () => {
  const over = { ...mpRunning({ p1: mpSnake([{ x: 1, y: 1 }], 'right', 5) }), state: 'p1-win' };
  const r = restartMultiplayer(over);
  assert.equal(r.state, 'ready');
  assert.equal(r.p1.score, 0);
  assert.equal(r.p2.score, 0);
  assert.equal(r.food, null);
  assert.equal(r.p1.body.length, 3);
});

test('MP_STATE_TEXT는 frozen §3.4 상태 텍스트와 정확히 일치한다', () => {
  assert.deepEqual(MP_STATE_TEXT, {
    ready: '스페이스로 시작',
    running: '게임 진행 중',
    paused: '일시정지 — 스페이스로 재개',
    'p1-win': '1P 승리',
    'p2-win': '2P 승리',
    draw: '무승부',
  });
});

test('bindingForKey는 1P WASD / 2P 방향키를 매핑한다(§4)', () => {
  assert.deepEqual(bindingForKey('w'), { player: 'p1', dir: 'up' });
  assert.deepEqual(bindingForKey('W'), { player: 'p1', dir: 'up' });
  assert.deepEqual(bindingForKey('d'), { player: 'p1', dir: 'right' });
  assert.deepEqual(bindingForKey('ArrowUp'), { player: 'p2', dir: 'up' });
  assert.deepEqual(bindingForKey('ArrowRight'), { player: 'p2', dir: 'right' });
  assert.equal(bindingForKey('z'), null);
  assert.equal(bindingForKey(undefined), null);
});

test('computeBoardMetrics는 grid 좌표계를 바꾸지 않아 resize가 플레이 상태를 깨지 않는다(§3.7 E-8)', () => {
  const state = mpRunning({ food: { x: 5, y: 5 } });
  const small = computeBoardMetrics(320, 480, state.cols, state.rows);
  const large = computeBoardMetrics(1920, 1080, state.cols, state.rows);
  // 셀/보드 치수는 재계산되지만
  assert.ok(large.cellPx > small.cellPx);
  assert.ok(small.boardWidth <= 320 && small.boardHeight <= 480);
  assert.ok(large.boardWidth <= 1920 && large.boardHeight <= 1080);
  // 논리 grid(cols/rows)는 불변 → 뱀 좌표/점수/먹이가 그대로 유효하다
  const after = mpRunning({ food: { x: 5, y: 5 } });
  assert.deepEqual(after.p1, state.p1);
  assert.deepEqual(after.food, state.food);
});
