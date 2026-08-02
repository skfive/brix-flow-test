// 일시정지 입력 큐 버그 — 재현 및 회귀 가드 단위 테스트 (BF-1521)
// 실행 설계: docs/plans/snake-pause-input-BF-1519.md §4~§6
// 순수 함수 단위 테스트(node --test, DOM/타이머 비의존).
// 불변식: 일시정지(paused) 중 방향 입력은 nextDirection 슬롯을 갱신하지 않으며,
// 재개(resume) 첫 tick은 정지 직전 방향을 그대로 유지한다.
// §2.1 가드 완화 변형(setDirection의 running 가드 제거/완화)에서 T1~T3은 실패하고,
// 가드가 유지된 구현에서 통과하는 fail→fix→pass 회귀 가드다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  startGame,
  setDirection,
  step,
  pauseGame,
  resumeGame,
} from '../src/game.js';

// 먹이 위치를 결정론화하는 rng stub (game.test.js와 동일 관례)
function stubRng(values) {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

// direction을 'up'으로 확정하고, 먹이를 원점(0,0)으로 멀리 둔 running 상태를 만든다.
// 뱀 머리는 중앙 부근이라 원점 먹이와 겹치지 않고, up 이동 시 벽·자기 충돌도 없다.
function runningFacingUp() {
  let s = startGame(createInitialState(), stubRng([0.1]));
  s = { ...s, food: { x: 0, y: 0 } }; // 섭취 간섭 제거
  s = setDirection(s, 'up'); // right→up (반대 아님, 허용)
  s = step(s); // nextDirection('up')을 direction으로 확정
  assert.equal(s.status, 'running');
  assert.equal(s.direction, 'up');
  return s;
}

// T1 — 재현: 일시정지 중 방향 입력은 nextDirection을 바꾸지 않는다 (AC-1)
test('일시정지 중 setDirection은 nextDirection을 갱신하지 않고 완전 no-op이다', () => {
  const running = startGame(createInitialState(), stubRng([0.1]));
  assert.equal(running.nextDirection, 'right');
  const paused = pauseGame(running);
  assert.equal(paused.status, 'paused');

  // 정지 직전 방향(right)과 다른 방향들을 시도해도 무시되어야 한다.
  const afterUp = setDirection(paused, 'up');
  assert.equal(afterUp.nextDirection, 'right');
  assert.deepEqual(afterUp, paused);

  const afterDown = setDirection(paused, 'down');
  assert.equal(afterDown.nextDirection, 'right');
  assert.deepEqual(afterDown, paused);
});

// T2 — 재개 후 첫 tick은 정지 직전 방향(up)으로 이동한다 (AC-2)
test('재개 후 첫 tick은 일시정지 중 입력을 무시하고 정지 직전 방향으로 이동한다', () => {
  const facingUp = runningFacingUp();
  const paused = pauseGame(facingUp);

  // 일시정지 중 left 입력 시도 → 무시되어야 함(큐 적재 금지)
  const stillPaused = setDirection(paused, 'left');
  assert.deepEqual(stillPaused, paused);

  const resumed = resumeGame(stillPaused);
  assert.equal(resumed.status, 'running');
  const headBefore = resumed.snake[0];
  const moved = step(resumed);

  // up으로 1칸 이동(y-1), x 불변. left로 꺾이지 않는다.
  assert.equal(moved.status, 'running');
  assert.equal(moved.snake[0].x, headBefore.x);
  assert.equal(moved.snake[0].y, headBefore.y - 1);
});

// T3 — 역방향 자살 방지: 일시정지 중 정반대 입력이 재개 시 180° 반전을 유발하지 않는다 (AC-3)
test('일시정지 중 정반대 입력은 재개 후 180° 반전·자기충돌을 유발하지 않는다', () => {
  const facingUp = runningFacingUp();
  const paused = pauseGame(facingUp);

  // 정지 직전 방향(up)의 정반대(down) 입력 → 무시되어야 함.
  // 만약 큐에 적재되면 재개 첫 tick에 목(neck)으로 반전해 자기충돌(gameover)이 난다.
  const stillPaused = setDirection(paused, 'down');
  assert.deepEqual(stillPaused, paused);

  const resumed = resumeGame(stillPaused);
  const headBefore = resumed.snake[0];
  const moved = step(resumed);

  assert.equal(moved.status, 'running'); // gameover가 아니어야 한다
  assert.equal(moved.snake[0].x, headBefore.x);
  assert.equal(moved.snake[0].y, headBefore.y - 1); // 여전히 up
});

// E-3 — 일시정지 중 동일 방향 입력도 no-op이며 nextDirection 불변
test('일시정지 중 정지 직전과 같은 방향 입력도 no-op이다', () => {
  const running = startGame(createInitialState(), stubRng([0.1])); // nextDirection 'right'
  const paused = pauseGame(running);
  const result = setDirection(paused, 'right');
  assert.deepEqual(result, paused);
  assert.equal(result.nextDirection, 'right');
});

// E-4 — 일시정지 중 유효하지 않은 방향 문자열 입력도 상태를 바꾸지 않는다
test('일시정지 중 유효하지 않은 방향 입력은 상태를 바꾸지 않는다', () => {
  const paused = pauseGame(startGame(createInitialState(), stubRng([0.1])));
  assert.deepEqual(setDirection(paused, 'diagonal'), paused);
  assert.deepEqual(setDirection(paused, ''), paused);
});

// §6.1 인접 흐름 불변 가드 — tick 루프
test('[회귀] 일시정지 상태에서 step은 no-op이다(tick 루프 불변)', () => {
  const paused = pauseGame(runningFacingUp());
  assert.deepEqual(step(paused), paused);
});

// §6.1 인접 흐름 불변 가드 — resumeGame은 방향/입력 버퍼를 변경하지 않는다
test('[회귀] resumeGame은 direction·nextDirection을 보존한다', () => {
  const paused = pauseGame(runningFacingUp());
  const resumed = resumeGame(paused);
  assert.equal(resumed.status, 'running');
  assert.equal(resumed.direction, paused.direction);
  assert.equal(resumed.nextDirection, paused.nextDirection);
});

// §6.1 인접 흐름 불변 가드 — 재개 후 충돌 판정이 그대로 동작한다
test('[회귀] 재개 후 step의 벽 충돌 판정이 유지된다', () => {
  let s = pauseGame(runningFacingUp());
  s = resumeGame(s);
  // 머리를 상단 벽 가장자리(y=0)로 옮겨 up 이동 시 벽 충돌하도록 구성
  s = {
    ...s,
    snake: [
      { x: 5, y: 0 },
      { x: 5, y: 1 },
      { x: 5, y: 2 },
    ],
    food: { x: 0, y: 5 },
  };
  const moved = step(s);
  assert.equal(moved.status, 'gameover');
});
