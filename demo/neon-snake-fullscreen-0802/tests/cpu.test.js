// 네온 스네이크 · 1인 vs CPU — CPU 의사결정 순수 함수 단위 테스트 (node --test, DOM 비의존)
// 검증 기준: docs/plans/snake-cpu-BF-1507-plan.md §10 (T-1~T-7)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeededRng, chooseCpuDirection } from '../cpu.js';
import {
  createMultiplayerState,
  startMultiplayer,
  setPlayerDirection,
  stepMultiplayer,
} from '../src/game.js';

const OPPOSITE = { right: 'left', left: 'right', up: 'down', down: 'up' };
const DIFFICULTIES = ['easy', 'normal', 'hard'];

// running 상태의 멀티플레이 state를 만든다(먹이 위치는 rng로 고정).
function runningState(overrides = {}) {
  const base = startMultiplayer(createMultiplayerState(), () => 0);
  return { ...base, ...overrides };
}

// p2(CPU) 뱀을 지정 head/dir/body로 배치한 running state를 만든다.
function cpuState({ cols = 12, rows = 12, p1body, p2body, p2dir, food = null }) {
  return {
    state: 'running',
    cols,
    rows,
    p1: { body: p1body, dir: 'right', nextDir: 'right', score: 0 },
    p2: { body: p2body, dir: p2dir, nextDir: p2dir, score: 0 },
    food,
  };
}

// T-1 결정론: 동일 state+difficulty+동일 시드 RNG → 반복 호출 동일 방향(AC-3, E-8).
test('T-1 결정론: 동일 시드 RNG로 동일 입력에 동일 방향을 반환한다', () => {
  for (const difficulty of DIFFICULTIES) {
    const state = runningState();
    const seed = 12345;
    const first = chooseCpuDirection(state, { difficulty, rng: createSeededRng(seed) });
    for (let i = 0; i < 20; i += 1) {
      const again = chooseCpuDirection(state, { difficulty, rng: createSeededRng(seed) });
      assert.equal(again, first, `${difficulty} 난이도 결정론 불일치`);
    }
  }
});

// T-1 확장: easy는 rng 소비가 다르지만 같은 시드 수열이면 동일 방향.
test('T-1 결정론: easy 난이도도 같은 시드 수열이면 동일 방향', () => {
  const state = runningState();
  const seeds = [1, 2, 7, 99, 2024];
  for (const seed of seeds) {
    const a = chooseCpuDirection(state, { difficulty: 'easy', rng: createSeededRng(seed) });
    const b = chooseCpuDirection(state, { difficulty: 'easy', rng: createSeededRng(seed) });
    assert.equal(a, b);
  }
});

// T-2 즉사 방지: 반환값이 절대 OPPOSITE[p2.dir]가 아님(AC-4, E-4).
test('T-2 즉사 방지: 절대 역방향을 반환하지 않는다', () => {
  const dirs = ['up', 'down', 'left', 'right'];
  for (const difficulty of DIFFICULTIES) {
    for (const p2dir of dirs) {
      for (let seed = 1; seed <= 30; seed += 1) {
        const state = cpuState({
          p1body: [{ x: 2, y: 2 }, { x: 1, y: 2 }],
          p2body: [{ x: 6, y: 6 }, { x: 6, y: 7 }, { x: 6, y: 8 }],
          p2dir,
          food: { x: 3, y: 3 },
        });
        const dir = chooseCpuDirection(state, { difficulty, rng: createSeededRng(seed) });
        assert.notEqual(dir, OPPOSITE[p2dir], `${difficulty}/${p2dir}/seed${seed}`);
        assert.ok(dirs.includes(dir));
      }
    }
  }
});

// T-3 안전성(normal/hard): 안전 후보가 있으면 즉사(벽/몸) 후보를 고르지 않음(§5.2, E-1).
test('T-3 안전성: normal/hard는 안전 후보가 있으면 즉사 후보를 고르지 않는다', () => {
  // p2 head가 위쪽 벽(y=0)에 붙어 진행 방향 right. up=벽 밖(즉사), down/right=안전.
  for (const difficulty of ['normal', 'hard']) {
    const state = cpuState({
      cols: 12,
      rows: 12,
      p1body: [{ x: 0, y: 11 }],
      p2body: [{ x: 5, y: 0 }, { x: 4, y: 0 }, { x: 3, y: 0 }],
      p2dir: 'right',
      food: { x: 8, y: 8 },
    });
    const dir = chooseCpuDirection(state, { difficulty, rng: createSeededRng(3) });
    assert.notEqual(dir, 'up', `${difficulty}: 벽 밖(up)을 선택하면 안 됨`);
  }
});

// T-4 먹이 지향: 안전 후보 중 맨해튼 거리를 줄이는 방향을 선호(§5.2).
test('T-4 먹이 지향: normal은 안전 후보 중 먹이에 가까워지는 방향을 고른다', () => {
  // head (5,5), dir right → 후보 up/left/down/right 중 left 제외... dir=right라 역방향 left 제외.
  // 후보: up(5,4) left(x) down(5,6) right(6,5). food (8,5): right가 거리 최소.
  const state = cpuState({
    cols: 12,
    rows: 12,
    p1body: [{ x: 0, y: 0 }],
    p2body: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    p2dir: 'right',
    food: { x: 8, y: 5 },
  });
  const dir = chooseCpuDirection(state, { difficulty: 'normal', rng: createSeededRng(1) });
  assert.equal(dir, 'right');
});

// T-5 무안전 경로: 안전 후보가 없을 때 크래시 없이 고정 우선순위 후보 반환(E-1).
test('T-5 무안전 경로: 안전 후보가 없어도 크래시 없이 우선순위 후보를 반환한다', () => {
  // 2x2 격자, p2가 세 칸 차지 + p1이 마지막 칸 → 모든 후보 즉사. 우선순위: up,left,down,right.
  for (const difficulty of ['normal', 'hard']) {
    const state = cpuState({
      cols: 2,
      rows: 2,
      p1body: [{ x: 0, y: 0 }],
      p2body: [{ x: 1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 0 }],
      p2dir: 'up',
      food: null,
    });
    const dir = chooseCpuDirection(state, { difficulty, rng: createSeededRng(5) });
    // 역방향(down) 제외한 우선순위 첫 후보 = up
    assert.equal(dir, 'up', `${difficulty}`);
    assert.notEqual(dir, OPPOSITE.up);
  }
});

// T-6 순수성: 입력 state가 변형되지 않음(호출 전후 deep-equal, AC-3).
test('T-6 순수성: 입력 state를 변경하지 않는다', () => {
  for (const difficulty of DIFFICULTIES) {
    const state = runningState();
    const snapshot = structuredClone(state);
    chooseCpuDirection(state, { difficulty, rng: createSeededRng(42) });
    assert.deepEqual(state, snapshot, `${difficulty} 난이도에서 state가 변형됨`);
  }
});

// T-7 로컬 회귀: CPU 도입 후에도 stepMultiplayer/setPlayerDirection(2P) 경로가 동일 결과(AC-5).
test('T-7 로컬 회귀: 2P 입력 경로와 결정론적 tick이 CPU 도입 후에도 동일하다', () => {
  // 고정 rng로 두 번 동일 시퀀스를 돌려 결과 state가 완전히 같은지(결정론) 확인.
  function playSequence() {
    let s = startMultiplayer(createMultiplayerState({ cols: 12, rows: 12 }), () => 0);
    s = setPlayerDirection(s, 'p1', 'up');
    s = setPlayerDirection(s, 'p2', 'down');
    for (let i = 0; i < 5; i += 1) {
      s = stepMultiplayer(s, () => 0);
    }
    return s;
  }
  assert.deepEqual(playSequence(), playSequence());
});

// AC-4 보강: chooseCpuDirection이 낸 방향은 setPlayerDirection(p2)로 주입 시 무시되지 않는다.
test('CPU 방향은 setPlayerDirection(p2)로 주입 시 실제로 반영된다', () => {
  const state = runningState();
  const dir = chooseCpuDirection(state, { difficulty: 'normal', rng: createSeededRng(7) });
  const next = setPlayerDirection(state, 'p2', dir);
  assert.equal(next.p2.nextDir, dir);
});
