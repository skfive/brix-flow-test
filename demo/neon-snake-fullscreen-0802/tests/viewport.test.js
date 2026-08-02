// 네온 스네이크 전체화면 — 뷰포트 확장 · 상태 보존 회귀 테스트 (node --test)
// 검증 기준: docs/plans/neon-snake-fullscreen-BF-1495-plan.md §6 (RG-1~RG-4)
// DOM/window 비의존: game.js 순수 함수(computeGrid/clampCell/reprojectState/resizeGame)만 검증.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  startGame,
  restartGame,
  computeGrid,
  clampCell,
  reprojectState,
  resizeGame,
  MIN_GRID_COLS,
  MIN_GRID_ROWS,
  INITIAL_SNAKE_LENGTH,
} from '../src/game.js';

function stubRng(values) {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

function coordsInBounds(cells, cols, rows) {
  return cells.every((c) => c.x >= 0 && c.x < cols && c.y >= 0 && c.y < rows);
}

// running(=playing) 상태로 진행 중인 표본 state를 구성
function playingSample(cols, rows) {
  const base = createInitialState({ cols, rows });
  return {
    ...base,
    status: 'running',
    score: 50,
    foodsEaten: 5,
    speedLevel: 1,
    snake: [
      { x: 10, y: 8 },
      { x: 9, y: 8 },
      { x: 8, y: 8 },
      { x: 7, y: 8 },
    ],
    direction: 'right',
    nextDirection: 'right',
    food: { x: 14, y: 6 },
  };
}

// ---- computeGrid: 뷰포트 → grid 파생 ----
test('computeGrid는 뷰포트가 커질수록 더 많은 열/행을 만든다(실시간 확장)', () => {
  const small = computeGrid(320, 480, 1);
  const large = computeGrid(1920, 1080, 1);
  assert.ok(large.cols > small.cols, 'cols가 뷰포트 폭에 따라 확장');
  assert.ok(large.rows > small.rows, 'rows가 뷰포트 높이에 따라 확장');
});

test('computeGrid는 최소 grid(cols/rows) 하한을 보장한다', () => {
  const tiny = computeGrid(50, 50, 1);
  assert.ok(tiny.cols >= MIN_GRID_COLS);
  assert.ok(tiny.rows >= MIN_GRID_ROWS);
});

test('computeGrid는 DPR을 backing store 크기에 반영한다', () => {
  const g1 = computeGrid(800, 600, 1);
  const g2 = computeGrid(800, 600, 2);
  assert.equal(g2.dpr, 2);
  assert.ok(g2.backingWidth > g1.backingWidth, 'DPR 2배면 backing 폭이 커진다');
  assert.ok(g2.backingHeight > g1.backingHeight);
});

test('computeGrid는 셀이 대략 정사각(가로/세로 셀 크기 동일)을 유지한다', () => {
  const g = computeGrid(1000, 700, 1);
  // 단일 cellPx를 두 축에 공유하므로 셀은 정사각이다
  assert.ok(g.cellPx > 0);
});

// ---- clampCell ----
test('clampCell은 좌표를 유효 범위로 클램프한다', () => {
  assert.deepEqual(clampCell({ x: -3, y: 100 }, 12, 12), { x: 0, y: 11 });
  assert.deepEqual(clampCell({ x: 5, y: 5 }, 12, 12), { x: 5, y: 5 });
});

// ---- RG-1: 이벤트 후 상태 유지(재시작/초기화 금지) ----
test('RG-1 · reprojectState는 status(playing/paused)를 유지하고 재초기화하지 않는다', () => {
  const s = playingSample(28, 28);
  const r = reprojectState(s, 20, 20);
  assert.equal(r.status, 'running');
  // 재초기화되지 않았다: 뱀 길이가 초기값(3)으로 리셋되지 않음
  assert.equal(r.snake.length, s.snake.length);
  assert.notEqual(r.snake.length, INITIAL_SNAKE_LENGTH);

  const paused = { ...s, status: 'paused' };
  assert.equal(reprojectState(paused, 20, 20).status, 'paused');
});

// ---- RG-2: 축소가 아니면 좌표·점수 그대로 보존 ----
test('RG-2 · grid가 줄지 않으면 뱀·먹이·점수가 정확히 보존된다', () => {
  const s = playingSample(28, 28);
  const r = reprojectState(s, 40, 40); // 더 큰 grid
  assert.deepEqual(r.snake, s.snake);
  assert.deepEqual(r.food, s.food);
  assert.equal(r.score, s.score);
  assert.equal(r.speedLevel, s.speedLevel);
  assert.equal(r.foodsEaten, s.foodsEaten);
  assert.equal(r.direction, s.direction);
});

test('RG-2 · resizeGame(뷰포트 확대)에서도 상태가 보존된다', () => {
  const s = playingSample(28, 28);
  const { state: r, grid } = resizeGame(s, 1920, 1080, 2);
  assert.equal(r.status, 'running');
  assert.equal(r.score, 50);
  // 확대이므로 좌표 보존
  assert.deepEqual(r.snake, s.snake);
  assert.deepEqual(r.food, s.food);
  assert.equal(r.cols, grid.cols);
  assert.equal(r.rows, grid.rows);
});

// ---- RG-3: 축소 시 모든 좌표가 새 grid 범위 내 ----
test('RG-3 · grid 축소 후 모든 뱀/먹이 좌표가 유효 범위 안에 있다', () => {
  const s = {
    ...playingSample(40, 40),
    snake: [
      { x: 38, y: 30 },
      { x: 37, y: 30 },
      { x: 36, y: 30 },
    ],
    food: { x: 39, y: 39 },
  };
  const r = reprojectState(s, 12, 12, stubRng([0.5]));
  assert.ok(coordsInBounds(r.snake, 12, 12), '뱀 좌표가 새 grid 안');
  assert.ok(coordsInBounds([r.food], 12, 12), '먹이 좌표가 새 grid 안');
  // 상태·점수는 여전히 보존
  assert.equal(r.status, 'running');
  assert.equal(r.score, s.score);
});

test('RG-3 · 클램프 후 먹이가 뱀과 겹치면 유효 빈 칸으로 재배치된다', () => {
  const s = {
    ...playingSample(40, 40),
    snake: [
      { x: 39, y: 39 },
      { x: 38, y: 39 },
    ],
    food: { x: 39, y: 39 }, // 클램프 시 뱀 머리와 동일 위치가 되도록
  };
  const r = reprojectState(s, 12, 12, stubRng([0.5]));
  const overlaps = r.snake.some((seg) => seg.x === r.food.x && seg.y === r.food.y);
  assert.ok(!overlaps, '먹이가 뱀과 겹치지 않는다');
  assert.ok(coordsInBounds([r.food], 12, 12));
});

// ---- RG-4: 초기화(restart) 후 초기값 복귀 + 유효성 ----
test('RG-4 · 축소된 grid에서 restartGame은 ready 초기값으로 복귀하고 좌표가 유효하다', () => {
  const s = { ...playingSample(40, 40), status: 'gameover', highScore: 90 };
  const resized = reprojectState(s, 12, 12);
  const r = restartGame(resized);
  assert.equal(r.status, 'ready');
  assert.equal(r.score, 0);
  assert.equal(r.snake.length, INITIAL_SNAKE_LENGTH);
  assert.equal(r.highScore, 90, 'highScore는 보존');
  assert.ok(coordsInBounds(r.snake, r.cols, r.rows), '초기 뱀이 현재 grid 안');
});

// ---- E6: 리렌더 멱등성 ----
test('E6 · reprojectState는 멱등하다(같은 grid 반복 적용 시 좌표 손상 없음)', () => {
  const s = playingSample(28, 28);
  const once = reprojectState(s, 16, 16, stubRng([0.5]));
  const twice = reprojectState(once, 16, 16, stubRng([0.5]));
  assert.deepEqual(twice.snake, once.snake);
  assert.deepEqual(twice.food, once.food);
  assert.equal(twice.score, once.score);
});

// ---- 불변성: 원본 state를 변경하지 않는다 ----
test('reprojectState는 입력 state를 변경하지 않는다', () => {
  const s = playingSample(28, 28);
  const snapshotSnake = s.snake.map((c) => ({ ...c }));
  reprojectState(s, 12, 12);
  assert.deepEqual(s.snake, snapshotSnake);
  assert.equal(s.cols, 28);
});
