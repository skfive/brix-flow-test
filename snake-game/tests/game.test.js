import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';

// 고정 시퀀스를 순서대로 반환하는 결정적 fake rng.
// 준비한 값을 모두 소비하면 남은 호출은 에러를 던져 예상 밖의 rng 소비를 즉시 드러낸다.
function fakeRng(values) {
  let index = 0;
  return () => {
    if (index >= values.length) {
      throw new Error(`fakeRng exhausted after ${values.length} calls`);
    }
    const value = values[index];
    index += 1;
    return value;
  };
}

test('정상 이동: tick() 호출 시 머리가 현재 방향으로 한 칸 이동한다', () => {
  const game = createGame({ rng: fakeRng([0]), columns: 10, rows: 10 });
  const before = game.getState();
  const head = before.snake[0];

  game.setDirection('right');
  game.tick();

  const after = game.getState();
  assert.deepEqual(after.snake[0], { x: head.x + 1, y: head.y });
  assert.equal(after.status, 'playing');
});

test('방향 반전 차단: 진행 방향의 정반대 입력은 무시된다', () => {
  const game = createGame({ rng: fakeRng([0]), columns: 10, rows: 10 });

  game.setDirection('right');
  game.setDirection('left'); // right 의 정반대 → 무시되어야 함
  game.tick();

  const state = game.getState();
  assert.equal(state.direction, 'right');
});

test('벽 충돌: 보드 경계를 벗어나는 이동 시 status 가 game-over 가 된다', () => {
  const game = createGame({ rng: fakeRng([0]), columns: 5, rows: 5 });

  game.setDirection('right');
  game.tick(); // x: 2 -> 3
  game.tick(); // x: 3 -> 4
  game.tick(); // x: 4 -> 5 (경계 밖)

  const state = game.getState();
  assert.equal(state.status, 'game-over');
});

test('먹이 섭취: 머리가 먹이 좌표에 도달하면 score 증가·길이 성장·새 먹이가 rng 다음 값으로 결정된다', () => {
  // columns=10,rows=10 기준 초기 뱀은 (5,5),(4,5),(3,5), 초기 먹이는 freeCells[53]=(6,5) (rng=0.55).
  // (6,5) 섭취 후 남은 96칸 중 freeCells[53]=(7,5) (rng=0.56).
  const game = createGame({ rng: fakeRng([0.55, 0.56]), columns: 10, rows: 10 });

  const initial = game.getState();
  assert.deepEqual(initial.food, { x: 6, y: 5 });

  game.setDirection('right');
  game.tick(); // head (5,5) -> (6,5), 먹이와 일치

  const state = game.getState();
  assert.equal(state.score, 1);
  assert.equal(state.snake.length, 4);
  assert.deepEqual(state.snake[0], { x: 6, y: 5 });
  assert.deepEqual(state.food, { x: 7, y: 5 });
});

test('자기 충돌: 뱀이 자기 몸통과 겹치는 이동 시 status 가 game-over 가 된다', () => {
  // 두 번 먹이를 먹어 길이 5로 키운 뒤 좁게 방향을 꺾어 자기 몸통과 충돌시킨다.
  // rng 시퀀스: 초기 먹이(6,5)=0.55, 1차 섭취 후 새 먹이(7,5)=0.56, 2차 섭취 후 새 먹이는
  // 이후 경로(7,5→7,6→6,6→6,5)와 무관한 (0,0) 이 되도록 0 을 사용한다.
  const game = createGame({ rng: fakeRng([0.55, 0.56, 0]), columns: 10, rows: 10 });

  game.setDirection('right');
  game.tick(); // (5,5) -> (6,5) 먹이 섭취, 길이 4
  game.tick(); // (6,5) -> (7,5) 먹이 섭취, 길이 5

  assert.equal(game.getState().score, 2);
  assert.equal(game.getState().snake.length, 5);

  game.setDirection('down');
  game.tick(); // (7,5) -> (7,6)
  game.setDirection('left');
  game.tick(); // (7,6) -> (6,6)
  game.setDirection('up');
  game.tick(); // (6,6) -> (6,5), 몸통과 충돌

  const state = game.getState();
  assert.equal(state.status, 'game-over');
});

test('재시작: game-over 상태에서 reset() 호출 시 status 가 idle 이 되고 점수·길이·먹이가 초기값으로 복원된다', () => {
  const game = createGame({ rng: fakeRng([0, 0]), columns: 5, rows: 5 });

  game.setDirection('right');
  game.tick(); // x: 2 -> 3
  game.tick(); // x: 3 -> 4
  game.tick(); // x: 4 -> 5 (경계 밖) -> game-over
  assert.equal(game.getState().status, 'game-over');

  game.reset();

  const state = game.getState();
  assert.equal(state.status, 'idle');
  assert.equal(state.score, 0);
  assert.deepEqual(state.snake, [
    { x: 2, y: 2 },
    { x: 1, y: 2 },
    { x: 0, y: 2 },
  ]);
  assert.equal(state.direction, 'right');
  assert.deepEqual(state.food, { x: 0, y: 0 });
});
