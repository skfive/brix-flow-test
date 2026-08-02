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
