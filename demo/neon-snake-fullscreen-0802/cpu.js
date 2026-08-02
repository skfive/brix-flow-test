// 네온 스네이크 · 1인 vs CPU — CPU 의사결정 순수 함수 모듈 (BF-1509)
// 실행 설계: docs/plans/snake-cpu-BF-1507-plan.md §5
//
// 본 모듈은 DOM/window/시간/전역 난수에 의존하지 않고 입력 state를 변경하지 않는다.
// 기존 src/game.js의 DIRECTION_VECTORS·multiplayer state 형태를 참조만 하며
// 게임 규칙(stepMultiplayer 등)을 분기·수정하지 않는다(INV-1, INV-2).

import { DIRECTION_VECTORS } from './src/game.js';

// 역방향 쌍 (game.js의 private OPPOSITE와 동일 값을 참조용으로 재선언).
// CPU는 이 방향을 절대 반환하지 않는다(즉사 방지, AC-4/E-4).
const OPPOSITE = {
  right: 'left',
  left: 'right',
  up: 'down',
  down: 'up',
};

// §5.2 동점 처리용 고정 우선순위. 후보 정렬 기준이자 결정론의 근간이다.
const PRIORITY = ['up', 'left', 'down', 'right'];

/**
 * §5.1 createSeededRng — 시드 고정 결정론 RNG(mulberry32). 동일 seed → 동일 수열.
 * 반환 함수는 [0, 1) 실수를 낸다. DOM/시간/전역 난수에 의존하지 않는다.
 */
export function createSeededRng(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** §5.2-1 후보 방향 = 4방향 중 OPPOSITE[dir] 제외. 고정 우선순위 순서로 반환. */
function candidateDirs(dir) {
  const banned = OPPOSITE[dir];
  return PRIORITY.filter((d) => d !== banned);
}

/**
 * §5.2-2~3 후보 1개 평가 — 다음 head와 1-step 안전 판정, 먹이 맨해튼 거리.
 * safe = (a) 격자 안 (b) 자기 몸(꼬리 제외) 비충돌 (c) 상대(1P) 몸 비충돌.
 */
function evalCandidate(state, dir) {
  const head = state.p2.body[0];
  const vec = DIRECTION_VECTORS[dir];
  const next = { x: head.x + vec.x, y: head.y + vec.y };
  const inGrid = next.x >= 0 && next.x < state.cols && next.y >= 0 && next.y < state.rows;
  // 꼬리는 이번 tick에 비워지므로 자기 충돌 비교에서 제외(stepMultiplayer와 동일 규칙).
  const selfBody = state.p2.body.slice(0, state.p2.body.length - 1);
  const hitSelf = selfBody.some((c) => c.x === next.x && c.y === next.y);
  const hitOpp = state.p1.body.some((c) => c.x === next.x && c.y === next.y);
  const safe = inGrid && !hitSelf && !hitOpp;
  const dist = state.food ? manhattan(next, state.food) : null;
  return { dir, next, safe, dist };
}

/**
 * 후보 집합에서 먹이 지향 greedy 선택 — 맨해튼 거리 최소 후보.
 * 후보는 이미 고정 우선순위 순서이므로 최소 거리 동점은 우선순위 첫 후보로 결정론적으로 깨진다.
 * food가 null이면 우선순위 첫 후보를 반환한다.
 */
function greedyPick(cands) {
  let best = cands[0];
  for (const c of cands) {
    if (c.dist == null) {
      break; // 먹이 없음 → 우선순위 첫 후보 유지
    }
    if (c.dist < best.dist) {
      best = c;
    }
  }
  return best;
}

/**
 * §5.3 easy — 확률 rng()<0.5면 후보 전체에서 무작위(안전 무시), 아니면 먹이 지향 greedy.
 * 자주 실수해 사람이 이기기 쉽다. 반환값은 항상 후보(비역방향) 집합에서 나온다.
 */
function chooseEasy(cands, rng) {
  if (rng() < 0.5) {
    const idx = Math.floor(rng() * cands.length);
    return cands[idx].dir;
  }
  return greedyPick(cands).dir;
}

/**
 * §5.3 normal — safe 후보 중 먹이 지향 greedy. safe가 없으면 고정 우선순위 첫 후보로 fallback(E-1).
 */
function chooseNormal(cands, rng) {
  const safe = cands.filter((c) => c.safe);
  if (safe.length === 0) {
    return cands[0].dir;
  }
  return greedyPick(safe).dir;
}

/**
 * 경계 있는 flood-fill — start에서 양 뱀 몸을 벽으로 두고 도달 가능한 빈 칸 수를 센다.
 * hard의 갇힘 방지 점수로 쓰인다(§5.3). 순수 계산이며 state를 변경하지 않는다.
 */
function reachableSpace(state, start) {
  if (start.x < 0 || start.x >= state.cols || start.y < 0 || start.y >= state.rows) {
    return 0;
  }
  const blocked = new Set();
  for (const c of state.p1.body) {
    blocked.add(`${c.x},${c.y}`);
  }
  for (const c of state.p2.body) {
    blocked.add(`${c.x},${c.y}`);
  }
  const startKey = `${start.x},${start.y}`;
  const visited = new Set([startKey]);
  const stack = [start];
  let count = 0;
  while (stack.length > 0) {
    const cell = stack.pop();
    count += 1;
    for (const d of PRIORITY) {
      const v = DIRECTION_VECTORS[d];
      const nx = cell.x + v.x;
      const ny = cell.y + v.y;
      const key = `${nx},${ny}`;
      if (nx < 0 || nx >= state.cols || ny < 0 || ny >= state.rows) {
        continue;
      }
      if (blocked.has(key) || visited.has(key)) {
        continue;
      }
      visited.add(key);
      stack.push({ x: nx, y: ny });
    }
  }
  return count;
}

/**
 * §5.3 hard — safe 후보 중 먹이 지향 + 갇힘 방지(flood-fill 도달 빈칸이 큰 쪽 선호).
 * 갇힘 방지: 여유 공간(뱀 길이+1 이상) 후보를 우선하고, 그 안에서 먹이 거리 최소를 고른다.
 * 동점(거리·공간 완전 동일)은 고정 우선순위로 깨고, 그래도 남는 탐험 분기에서만 rng를 쓴다.
 */
function chooseHard(state, cands, rng) {
  const safe = cands.filter((c) => c.safe);
  if (safe.length === 0) {
    return cands[0].dir;
  }
  const scored = safe.map((c) => ({ ...c, space: reachableSpace(state, c.next) }));
  const minSpace = state.p2.body.length + 1;
  let viable = scored.filter((c) => c.space >= minSpace);
  if (viable.length === 0) {
    viable = scored;
  }
  const distOf = (c) => (c.dist == null ? 0 : c.dist);
  let best = viable[0];
  for (const c of viable) {
    // 우선: 먹이 거리 최소, 다음: 도달 공간 최대. 우선순위 순서라 동점은 첫 후보 유지.
    if (distOf(c) < distOf(best) || (distOf(c) === distOf(best) && c.space > best.space)) {
      best = c;
    }
  }
  const tied = viable.filter((c) => distOf(c) === distOf(best) && c.space === best.space);
  if (tied.length > 1) {
    return tied[Math.floor(rng() * tied.length)].dir;
  }
  return best.dir;
}

/**
 * §5.1 chooseCpuDirection — CPU(2P) 한 tick 방향 결정. 순수·결정론.
 *   state   : createMultiplayerState 형태 { state, cols, rows, p1, p2, food } (p2 = CPU)
 *   options : { difficulty: 'easy'|'normal'|'hard', rng: () => number }
 *   반환    : 'up'|'down'|'left'|'right'. 절대 OPPOSITE[state.p2.dir]를 반환하지 않는다(AC-4).
 * 동일 (state, difficulty, rng)면 항상 동일 방향을 반환하며 입력 state를 변경하지 않는다(AC-3).
 */
export function chooseCpuDirection(state, options = {}) {
  const difficulty = options.difficulty || 'normal';
  const rng = typeof options.rng === 'function' ? options.rng : Math.random;
  const cands = candidateDirs(state.p2.dir).map((d) => evalCandidate(state, d));
  if (difficulty === 'easy') {
    return chooseEasy(cands, rng);
  }
  if (difficulty === 'hard') {
    return chooseHard(state, cands, rng);
  }
  return chooseNormal(cands, rng);
}
